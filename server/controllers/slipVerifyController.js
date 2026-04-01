// server/controllers/slipVerifyController.js
// EasySlip API integration — ตรวจสอบสลิปโอนเงินธนาคารไทย
// API Key: ตั้งใน .env → EASYSLIP_API_KEY

const db      = require('../config/db')
const multer  = require('multer')

const EASYSLIP_API_KEY = process.env.EASYSLIP_API_KEY || '45ca0332-de25-4d4e-b3db-e0027777045d'
const EASYSLIP_URL     = 'https://developer.easyslip.com/api/v1/verify'

// ============================================================
// Multer: memoryStorage — ไม่บันทึกไฟล์ลงดิสก์ (เพียงแค่ verify)
// ============================================================
const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|gif|bmp|webp|pdf)$/i.test(file.originalname)
    cb(ok ? null : new Error('รองรับเฉพาะไฟล์รูปและ PDF'), ok)
  },
})
exports.uploadMiddleware = memUpload.single('file')

// ============================================================
// POST /verify — รับสลิป → ส่งไป EasySlip → คืนผล + บันทึก DB
// ============================================================
exports.verifySlip = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'ไม่พบไฟล์สลิปที่ส่งมา' })
    }

    // ★ สร้าง FormData สำหรับส่งไป EasySlip (ใช้ native FormData + Blob ของ Node 22)
    const formData = new FormData()
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype })
    formData.append('file', blob, req.file.originalname)

    // ★ เรียก EasySlip API
    let easyData
    try {
      const easyRes = await fetch(EASYSLIP_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${EASYSLIP_API_KEY}` },
        body: formData,
        signal: AbortSignal.timeout(15000), // timeout 15s
      })
      easyData = await easyRes.json()
    } catch (fetchErr) {
      console.error('[slip_verify] EasySlip fetch error:', fetchErr.message)
      return res.status(502).json({ success: false, message: 'ไม่สามารถเชื่อมต่อ EasySlip API ได้: ' + fetchErr.message })
    }

    // ★ สำเร็จ: status 200
    if (easyData.status === 200 && easyData.data) {
      const d = easyData.data
      const { loan_request_id, case_id, slip_type } = req.body
      const userId = req.user?.id

      // บันทึกลง DB (ไม่ block response ถ้า insert ผิดพลาด)
      db.query(
        `INSERT INTO slip_verifications
          (trans_ref, loan_request_id, case_id, slip_type, amount,
           sender_name, sender_bank, sender_account,
           receiver_name, receiver_bank, receiver_account,
           transaction_date, uploaded_by, raw_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           loan_request_id = COALESCE(VALUES(loan_request_id), loan_request_id),
           case_id         = COALESCE(VALUES(case_id), case_id),
           slip_type       = VALUES(slip_type),
           uploaded_by     = VALUES(uploaded_by),
           updated_at      = NOW()`,
        [
          d.transRef || null,
          loan_request_id   ? parseInt(loan_request_id)   : null,
          case_id           ? parseInt(case_id)           : null,
          slip_type         || 'general',
          d.amount?.amount  ?? 0,
          d.sender?.account?.name?.th   || d.sender?.account?.name?.en   || null,
          d.sender?.bank?.short         || null,
          d.sender?.account?.bank?.account || null,
          d.receiver?.account?.name?.th || d.receiver?.account?.name?.en || null,
          d.receiver?.bank?.short       || null,
          d.receiver?.account?.bank?.account || null,
          d.date            ? new Date(d.date) : null,
          userId            || null,
          JSON.stringify(d),
        ],
        (err) => { if (err) console.error('[slip_verify] DB insert error:', err.message) }
      )

      return res.json({
        success: true,
        data: {
          transRef:        d.transRef,
          date:            d.date,
          amount:          d.amount?.amount,
          currency:        d.amount?.local?.currency || 'THB',
          senderName:      d.sender?.account?.name?.th   || d.sender?.account?.name?.en,
          senderBank:      d.sender?.bank?.short,
          senderAccount:   d.sender?.account?.bank?.account,
          receiverName:    d.receiver?.account?.name?.th || d.receiver?.account?.name?.en,
          receiverBank:    d.receiver?.bank?.short,
          receiverAccount: d.receiver?.account?.bank?.account,
        },
      })
    }

    // ★ ล้มเหลว: สลิปซ้ำ / ไม่มี QR / อื่นๆ
    const isDuplicate = easyData.message === 'duplicate_slip' || easyData.status === 409
    return res.json({
      success:     false,
      isDuplicate: !!isDuplicate,
      message:     isDuplicate
        ? 'สลิปนี้เคยถูกใช้ในระบบแล้ว'
        : (easyData.message || 'ตรวจสอบสลิปไม่ผ่าน — กรุณาส่งสลิปที่มี QR code ชัดเจน'),
    })

  } catch (err) {
    console.error('[slip_verify] unexpected error:', err)
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + err.message })
  }
}

// ============================================================
// GET /logs — ดึงประวัติสลิปที่ตรวจแล้ว (สำหรับฝ่ายบัญชีและอื่นๆ)
// ============================================================
exports.getSlipLogs = (req, res) => {
  const {
    loan_request_id, case_id, slip_type,
    page = 1, limit = 50,
  } = req.query

  const perPage = Math.min(parseInt(limit) || 50, 200)
  const offset  = (Math.max(parseInt(page) || 1, 1) - 1) * perPage
  const wheres  = ['1=1']
  const params  = []

  if (loan_request_id) { wheres.push('sv.loan_request_id = ?'); params.push(parseInt(loan_request_id)) }
  if (case_id)         { wheres.push('sv.case_id = ?');         params.push(parseInt(case_id))         }
  if (slip_type)       { wheres.push('sv.slip_type = ?');        params.push(slip_type)                 }

  const where = wheres.join(' AND ')

  db.query(
    `SELECT COUNT(*) AS total FROM slip_verifications sv WHERE ${where}`,
    params,
    (err, cntRows) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      const total = cntRows[0]?.total || 0

      db.query(
        `SELECT
           sv.id, sv.trans_ref, sv.slip_type, sv.amount, sv.currency,
           sv.sender_name, sv.sender_bank, sv.sender_account,
           sv.receiver_name, sv.receiver_bank, sv.receiver_account,
           sv.transaction_date, sv.created_at,
           au.full_name AS uploaded_by_name,
           lr.debtor_code, lr.contact_name AS debtor_name,
           c.case_code, c.id AS case_id_val
         FROM slip_verifications sv
         LEFT JOIN admin_users   au ON au.id = sv.uploaded_by
         LEFT JOIN loan_requests lr ON lr.id = sv.loan_request_id
         LEFT JOIN cases         c  ON c.id  = sv.case_id
         WHERE ${where}
         ORDER BY sv.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, perPage, offset],
        (err2, rows) => {
          if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
          res.json({ success: true, logs: rows, total, page: parseInt(page), limit: perPage })
        }
      )
    }
  )
}

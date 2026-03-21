/**
 * emailController.js — ส่งอีเมลสรุปเคส/สัญญาให้ลูกค้า
 *
 * ต้องการ: npm install nodemailer
 * และตั้ง .env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your@gmail.com
 *   SMTP_PASS=your_app_password
 *   SMTP_FROM="LoanDD System <your@gmail.com>"
 */
const db = require('../config/db')

// ── Safe require nodemailer ──────────────────────────────────────────────────
let nodemailer = null
try {
  nodemailer = require('nodemailer')
} catch {
  console.warn('[emailController] nodemailer ยังไม่ได้ install — รัน: npm install nodemailer')
}

// ── Create transporter ───────────────────────────────────────────────────────
function createTransporter() {
  if (!nodemailer) return null
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[emailController] SMTP_HOST / SMTP_USER / SMTP_PASS ยังไม่ตั้งค่าใน .env')
    return null
  }
  return nodemailer.createTransporter({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false }
  })
}

// ── HTML Email template ──────────────────────────────────────────────────────
function buildEmailHtml(caseData) {
  const fmt = (n) => n ? Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'
  const fmtDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('th-TH', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  const contractType = caseData.approval_type === 'selling_pledge' ? 'สัญญาขายฝาก' : 'สัญญาจำนอง'
  const statusMap = {
    pending: 'รอดำเนินการ', sent: 'ส่งสัญญาแล้ว', done: 'เสร็จสิ้น'
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: "Sarabun", Tahoma, sans-serif; font-size: 15px; color: #1a1a2e; background: #f4f6f8; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 12px; padding: 32px 36px; max-width: 620px; margin: 0 auto; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e, #2563eb); color: #fff; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 4px; font-size: 20px; }
    .header p { margin: 0; font-size: 13px; opacity: 0.8; }
    .badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #15803d; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    td:first-child { font-weight: bold; color: #555; width: 44%; }
    .section-title { font-weight: bold; font-size: 14px; color: #2563eb; background: #eff6ff; padding: 8px 12px; border-radius: 6px; margin: 20px 0 8px; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
  </style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>🏠 LoanDD — แจ้งสรุปสัญญา</h1>
    <p>เคส: ${caseData.case_code || '-'} | ${contractType}</p>
  </div>

  <p>เรียน คุณ <strong>${caseData.contact_name || '-'}</strong>,</p>
  <p>ทีมงาน LoanDD ขอแจ้งสรุปรายละเอียดสัญญาของท่านดังต่อไปนี้</p>

  <div class="section-title">📋 ข้อมูลสัญญา</div>
  <table>
    <tr><td>เลขที่เคส</td><td>${caseData.case_code || '-'}</td></tr>
    <tr><td>ประเภทสัญญา</td><td><span class="badge badge-blue">${contractType}</span></td></tr>
    <tr><td>สถานะ</td><td><span class="badge badge-green">${statusMap[caseData.issuing_status] || '-'}</span></td></tr>
    <tr><td>วงเงินอนุมัติ</td><td><strong>${fmt(caseData.approved_credit)} บาท</strong></td></tr>
    <tr><td>ดอกเบี้ยต่อเดือน</td><td>${caseData.interest_per_month || '-'}%</td></tr>
    <tr><td>ดอกเบี้ยต่อปี</td><td>${caseData.interest_per_year || '-'}%</td></tr>
    <tr><td>ค่าดำเนินการ</td><td>${fmt(caseData.operation_fee)} บาท</td></tr>
    ${caseData.advance_interest ? `<tr><td>ดอกเบี้ยล่วงหน้า</td><td>${fmt(caseData.advance_interest)} บาท</td></tr>` : ''}
  </table>

  <div class="section-title">🏡 ทรัพย์หลักประกัน</div>
  <table>
    <tr><td>ประเภททรัพย์</td><td>${caseData.property_type || '-'}</td></tr>
    <tr><td>เลขโฉนด</td><td>${caseData.deed_number || '-'}</td></tr>
    <tr><td>ที่ตั้ง</td><td>ต.${caseData.subdistrict || '...'} อ.${caseData.district || '...'} จ.${caseData.province || '...'}</td></tr>
    <tr><td>พื้นที่</td><td>${caseData.land_area ? caseData.land_area + ' ตร.วา' : '-'}</td></tr>
  </table>

  ${caseData.officer_name || caseData.land_office ? `
  <div class="section-title">📍 นัดหมายกรมที่ดิน</div>
  <table>
    ${caseData.officer_name ? `<tr><td>เจ้าหน้าที่</td><td>${caseData.officer_name}</td></tr>` : ''}
    ${caseData.land_office ? `<tr><td>สำนักงานที่ดิน</td><td>${caseData.land_office}</td></tr>` : ''}
    ${caseData.visit_date ? `<tr><td>วันที่นัด</td><td>${fmtDate(caseData.visit_date)}</td></tr>` : ''}
  </table>` : ''}

  <p style="margin-top: 20px; background: #f0fdf4; border-radius: 8px; padding: 12px 16px; font-size: 13px;">
    หากมีข้อสงสัยหรือต้องการข้อมูลเพิ่มเติม กรุณาติดต่อเจ้าหน้าที่ผู้รับผิดชอบ
    หรือโทร <strong>${caseData.agent_phone || '-'}</strong>
  </p>

  <div class="footer">
    ส่งอัตโนมัติจากระบบ LoanDD Admin | เคส ${caseData.case_code || '-'} | ${new Date().toLocaleDateString('th-TH')}
  </div>
</div>
</body>
</html>`
}

// ── POST /api/admin/issuing/send-email ───────────────────────────────────────
exports.sendCaseEmail = (req, res) => {
  const { case_id, to_email } = req.body

  if (!to_email) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมลผู้รับ' })
  }

  // ตรวจว่า nodemailer + SMTP พร้อมหรือไม่
  const transporter = createTransporter()
  if (!transporter) {
    return res.status(503).json({
      success: false,
      message: 'ระบบ Email ยังไม่ได้ตั้งค่า — กรุณา install nodemailer และตั้ง SMTP_HOST, SMTP_USER, SMTP_PASS ใน .env',
      hint: 'npm install nodemailer'
    })
  }

  // ดึงข้อมูลเคสจาก DB
  const query = `
    SELECT c.*, c.case_code,
      lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.property_type, lr.province, lr.district, lr.subdistrict,
      lr.deed_number, lr.land_area,
      a.full_name AS agent_name, a.phone AS agent_phone, a.agent_code,
      at2.approval_type, at2.approved_credit, at2.interest_per_year, at2.interest_per_month,
      at2.operation_fee, at2.land_tax_estimate, at2.advance_interest,
      it.issuing_status, it.tracking_no AS email, it.commission_amount,
      lt.officer_name, lt.land_office, lt.visit_date
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = c.loan_request_id
    LEFT JOIN issuing_transactions it ON it.case_id = c.id
    LEFT JOIN legal_transactions lt ON lt.case_id = c.id
    WHERE c.id = ?
  `

  db.query(query, [case_id], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
    }

    const caseData = results[0]
    const contractType = caseData.approval_type === 'selling_pledge' ? 'สัญญาขายฝาก' : 'สัญญาจำนอง'

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to_email,
      subject: `[LoanDD] สรุปสัญญาเคส ${caseData.case_code} — ${contractType}`,
      html: buildEmailHtml(caseData)
    }

    try {
      const info = await transporter.sendMail(mailOptions)
      console.log('[emailController] sent:', info.messageId, '→', to_email)
      res.json({
        success: true,
        message: `ส่งอีเมลไปยัง ${to_email} สำเร็จ`,
        messageId: info.messageId
      })
    } catch (sendErr) {
      console.error('[emailController] send error:', sendErr.message)
      res.status(500).json({
        success: false,
        message: 'ส่งอีเมลไม่สำเร็จ: ' + sendErr.message
      })
    }
  })
}

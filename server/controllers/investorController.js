const db = require('../config/db')
const bcrypt = require('bcrypt')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// ========== Multer config สำหรับ OCR (memory storage ไม่บันทึกไฟล์) ==========
const ocrStorage = multer.memoryStorage()
const ocrUpload = multer({
  storage: ocrStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('รองรับเฉพาะไฟล์ JPG, PNG'))
  }
}).single('image')

// ========== Multer config สำหรับอัพโหลดสลิป ==========
const slipDir = path.join(__dirname, '..', 'uploads', 'slips')
if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true })

const slipStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, slipDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `slip_${req.params.id}_${Date.now()}${ext}`)
  }
})

const uploadSlipMulter = multer({
  storage: slipStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('รองรับเฉพาะไฟล์ JPG, PNG, PDF'))
  }
}).single('slip')

// ========== Multer config สำหรับอัพโหลดหลักฐานตัวตน (บัตรประชาชน ฯลฯ) ==========
const idCardDir = path.join(__dirname, '..', 'uploads', 'investor_docs')
if (!fs.existsSync(idCardDir)) fs.mkdirSync(idCardDir, { recursive: true })

const idCardStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, idCardDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `idcard_${req.params.id}_${Date.now()}${ext}`)
  }
})

const uploadIdCardMulter = multer({
  storage: idCardStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('รองรับเฉพาะไฟล์ JPG, PNG, PDF'))
  }
}).single('id_card')

// ========== Multer config สำหรับอัพโหลดสมุดบัญชี + สัญญานายทุน ==========
const investorDocDir = path.join(__dirname, '..', 'uploads', 'investor_docs')
// ใช้ dir เดียวกับ idCardDir (สร้างแล้ว)

const investorDocStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, investorDocDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const prefix = file.fieldname === 'passbook_image' ? 'passbook' : 'contract'
    cb(null, `${prefix}_${req.params.id}_${Date.now()}${ext}`)
  }
})

const uploadDocMulter = multer({
  storage: investorDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('รองรับเฉพาะไฟล์ JPG, PNG, PDF'))
  }
}).fields([
  { name: 'passbook_image', maxCount: 1 },
  { name: 'investor_contract', maxCount: 1 },
  { name: 'house_registration_image', maxCount: 1 }
])

// ========== สร้างรหัสนายทุนอัตโนมัติ (CAP0001, CAP0002, ...) ==========
function generateInvestorCode(callback) {
  db.query(
    `SELECT investor_code FROM investors WHERE investor_code IS NOT NULL ORDER BY investor_code DESC LIMIT 1`,
    (err, results) => {
      if (err || results.length === 0) return callback('CAP0001')
      const last = results[0].investor_code // e.g. CAP0002
      const num = parseInt(last.replace('CAP', ''), 10) + 1
      callback('CAP' + String(num).padStart(4, '0'))
    }
  )
}

// ========== GET: รายชื่อนายทุนทั้งหมด ==========
exports.getInvestors = (req, res) => {
  const sql = `
    SELECT id, investor_code, full_name, phone, line_id, email,
      date_of_birth, nationality, marital_status, spouse_name, spouse_national_id,
      national_id, national_id_expiry, address,
      bank_name, bank_account_no, bank_account_name,
      id_card_image, passbook_image, investor_contract, house_registration_image, updated_at
    FROM investors
    ORDER BY created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getInvestors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายละเอียดนายทุน 1 คน ==========
exports.getInvestorById = (req, res) => {
  const { id } = req.params
  db.query(
    `SELECT id, investor_code, username, full_name, phone, line_id, email,
      date_of_birth, nationality, marital_status, spouse_name, spouse_national_id,
      national_id, national_id_expiry, address,
      bank_name, bank_account_no, bank_account_name,
      id_card_image, passbook_image, investor_contract, house_registration_image, updated_at
     FROM investors WHERE id = ?`,
    [id],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ success: false, message: 'Investor not found' })
      }
      res.json({ success: true, data: results[0] })
    }
  )
}

// ========== GET: รหัสนายทุนถัดไป ==========
exports.getNextCode = (req, res) => {
  generateInvestorCode((code) => {
    res.json({ success: true, code })
  })
}

// ========== POST: เพิ่มนายทุนใหม่ ==========
exports.createInvestor = (req, res) => {
  const data = req.body

  generateInvestorCode((code) => {
    const username = data.username || code.toLowerCase()
    const passwordHash = data.password
      ? bcrypt.hashSync(data.password, 10)
      : bcrypt.hashSync(code + '2025', 10)

    const fields = {
      username,
      investor_code: code,
      full_name: data.full_name || null,
      date_of_birth: data.date_of_birth || null,
      nationality: data.nationality || 'ไทย',
      marital_status: data.marital_status || null,
      spouse_name: data.marital_status === 'สมรส' ? (data.spouse_name || null) : null,
      spouse_national_id: data.marital_status === 'สมรส' ? (data.spouse_national_id || null) : null,
      national_id: data.national_id || null,
      national_id_expiry: data.national_id_expiry || null,
      address: data.address || null,
      phone: data.phone || null,
      line_id: data.line_id || null,
      email: data.email || null,
      bank_name: data.bank_name || null,
      bank_account_no: data.bank_account_no || null,
      bank_account_name: data.bank_account_name || null,
      password_hash: passwordHash
    }

    const keys = Object.keys(fields)
    const placeholders = keys.map(() => '?').join(', ')
    const values = keys.map(k => fields[k])

    db.query(`INSERT INTO investors (${keys.join(', ')}) VALUES (${placeholders})`, values, (err, result) => {
      if (err) {
        console.error('createInvestor error:', err)
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ success: false, message: 'ข้อมูลซ้ำ (username หรือ email)' })
        }
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'Created', id: result.insertId, investor_code: code })
    })
  })
}

// ========== PUT: แก้ไขนายทุน ==========
exports.updateInvestor = (req, res) => {
  const { id } = req.params
  const data = req.body

  const fields = {
    full_name: data.full_name || null,
    date_of_birth: data.date_of_birth || null,
    nationality: data.nationality || 'ไทย',
    marital_status: data.marital_status || null,
    spouse_name: data.marital_status === 'สมรส' ? (data.spouse_name || null) : null,
    spouse_national_id: data.marital_status === 'สมรส' ? (data.spouse_national_id || null) : null,
    national_id: data.national_id || null,
    national_id_expiry: data.national_id_expiry || null,
    address: data.address || null,
    phone: data.phone || null,
    line_id: data.line_id || null,
    email: data.email || null,
    bank_name: data.bank_name || null,
    bank_account_no: data.bank_account_no || null,
    bank_account_name: data.bank_account_name || null,
  }

  const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(fields), id]

  db.query(`UPDATE investors SET ${setClauses} WHERE id = ?`, values, (err, result) => {
    if (err) {
      console.error('updateInvestor error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Investor not found' })
    }
    res.json({ success: true, message: 'Updated' })
  })
}

// ========== DELETE: ลบนายทุน ==========
exports.deleteInvestor = (req, res) => {
  const { id } = req.params
  db.query(`DELETE FROM investors WHERE id = ?`, [id], (err, result) => {
    if (err) {
      console.error('deleteInvestor error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Investor not found' })
    }
    res.json({ success: true, message: 'ลบนายทุนสำเร็จ' })
  })
}

// ========== POST: อัพโหลดสลิป ==========
exports.uploadSlip = (req, res) => {
  uploadSlipMulter(req, res, (err) => {
    if (err) {
      console.error('uploadSlip error:', err)
      return res.status(400).json({ success: false, message: err.message || 'อัพโหลดไม่สำเร็จ' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์' })
    }
    const filePath = `/uploads/slips/${req.file.filename}`
    res.json({ success: true, message: 'อัพโหลดสลิปสำเร็จ', file_path: filePath, filename: req.file.filename })
  })
}

// ========== GET: ดูรายการสลิปของนายทุน ==========
exports.getSlips = (req, res) => {
  const { id } = req.params
  const dir = path.join(__dirname, '..', 'uploads', 'slips')

  if (!fs.existsSync(dir)) return res.json({ success: true, slips: [] })

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(`slip_${id}_`))
    .map(f => ({
      filename: f,
      path: `/uploads/slips/${f}`,
      ext: path.extname(f).toLowerCase(),
      uploadedAt: fs.statSync(path.join(dir, f)).mtime
    }))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))

  res.json({ success: true, slips: files })
}

// ========== DELETE: ลบสลิป ==========
exports.deleteSlip = (req, res) => {
  const { filename } = req.params
  const filePath = path.join(__dirname, '..', 'uploads', 'slips', filename)

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'ไม่พบไฟล์' })
  }

  fs.unlinkSync(filePath)
  res.json({ success: true, message: 'ลบสลิปสำเร็จ' })
}
// ========== GET: Portfolio นายทุน (เคสที่ลงทุน + ประวัติมัดจำ) ==========
exports.getInvestorPortfolio = (req, res) => {
  const { id } = req.params

  // ดึงข้อมูลนายทุน
  db.query(
    `SELECT id, investor_code, full_name, phone, line_id, email, bank_name, bank_account_no, bank_account_name, id_card_image
     FROM investors WHERE id = ?`,
    [id],
    (err, investorRows) => {
      if (err || investorRows.length === 0) {
        return res.status(404).json({ success: false, message: 'ไม่พบนายทุน' })
      }
      const investor = investorRows[0]

      // ดึงเคสที่นายทุนคนนี้ลงทุน + เอกสารจาก issuing_transactions และ legal_transactions
      const casesSql = `
        SELECT
          auc.id AS auction_id,
          auc.case_id,
          auc.selling_pledge_amount,
          auc.interest_rate,
          auc.contract_years,
          auc.property_value,
          auc.auction_status,
          auc.sale_type,
          auc.is_cancelled,
          auc.bank_name,
          auc.bank_account_no,
          auc.bank_account_name,
          auc.transfer_slip,
          auc.house_reg_book_legal,
          auc.spouse_consent_doc,
          auc.spouse_name_change_doc,
          auc.recorded_at,
          auc.created_at AS auction_created_at,
          c.case_code,
          c.status AS case_status,
          lr.contact_name AS debtor_name,
          lr.property_type,
          lr.province,
          lr.district,
          lr.land_area,
          it.doc_selling_pledge AS issuing_doc_selling_pledge,
          it.doc_mortgage AS issuing_doc_mortgage,
          lt.doc_selling_pledge AS legal_doc_selling_pledge,
          lt.doc_extension AS legal_doc_extension,
          lt.doc_redemption AS legal_doc_redemption,
          lt.attachment AS legal_attachment
        FROM auction_transactions auc
        LEFT JOIN cases c ON c.id = auc.case_id
        LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
        LEFT JOIN issuing_transactions it ON it.case_id = auc.case_id
        LEFT JOIN legal_transactions lt ON lt.case_id = auc.case_id
        WHERE auc.investor_id = ? AND auc.is_cancelled = 0
        ORDER BY auc.created_at DESC
      `

      db.query(casesSql, [id], (err2, cases) => {
        if (err2) {
          console.error('getInvestorPortfolio cases error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }

        // ดึงประวัติมัดจำ
        const bidSql = `
          SELECT
            iah.id, iah.case_id, iah.auction_date, iah.winning_price, iah.note,
            c.case_code,
            lr.province, lr.district
          FROM investor_auction_history iah
          LEFT JOIN cases c ON c.id = iah.case_id
          LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
          WHERE iah.investor_id = ?
          ORDER BY iah.auction_date DESC
        `

        db.query(bidSql, [id], (err3, bids) => {
          if (err3) {
            console.error('getInvestorPortfolio bids error:', err3)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }

          // คำนวณสรุปยอด
          const totalInvested = cases.reduce((sum, c) => sum + (parseFloat(c.selling_pledge_amount) || 0), 0)
          const activeCount = cases.filter(c => c.case_status !== 'completed' && c.case_status !== 'cancelled').length
          const completedCount = cases.filter(c => c.case_status === 'completed').length

          res.json({
            success: true,
            investor,
            cases,
            bids,
            summary: { totalInvested, activeCount, completedCount, totalCases: cases.length }
          })
        })
      })
    }
  )
}

// ========== POST: อัพโหลดหลักฐานตัวตน (บัตรประชาชน / เอกสาร) ==========
exports.uploadIdCard = (req, res) => {
  const { id } = req.params
  uploadIdCardMulter(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'อัพโหลดไม่สำเร็จ' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์' })
    }
    const filePath = `/uploads/investor_docs/${req.file.filename}`
    // บันทึก path ลง DB
    db.query('UPDATE investors SET id_card_image = ?, updated_at = NOW() WHERE id = ?', [filePath, id], (err2) => {
      if (err2) {
        console.error('uploadIdCard DB error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'อัพโหลดหลักฐานสำเร็จ', file_path: filePath })
    })
  })
}

// ========== POST: อัพโหลดสมุดบัญชี / สัญญานายทุน ==========
// รับ field: passbook_image | investor_contract
exports.uploadDoc = (req, res) => {
  const { id } = req.params
  uploadDocMulter(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'อัพโหลดไม่สำเร็จ' })
    }

    const files = req.files || {}
    const setClauses = []
    const params = []
    const result = {}

    const allowedFields = ['passbook_image', 'investor_contract', 'house_registration_image']
    for (const field of allowedFields) {
      if (files[field] && files[field].length > 0) {
        const fp = `/uploads/investor_docs/${files[field][0].filename}`
        setClauses.push(`${field} = ?`)
        params.push(fp)
        result[field] = fp
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์' })
    }

    params.push(id)
    db.query(
      `UPDATE investors SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params,
      (err2) => {
        if (err2) {
          console.error('uploadDoc DB error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'อัพโหลดเอกสารสำเร็จ', ...result })
      }
    )
  })
}

// ========== DELETE: ลบไฟล์เอกสาร (passbook / contract / house_reg / id_card) ==========
exports.deleteDoc = (req, res) => {
  const { id } = req.params
  const { field } = req.body
  const allowed = ['passbook_image', 'investor_contract', 'house_registration_image', 'id_card_image']
  if (!allowed.includes(field)) {
    return res.status(400).json({ success: false, message: 'field ไม่ถูกต้อง' })
  }
  db.query(`UPDATE investors SET ${field} = NULL, updated_at = NOW() WHERE id = ?`, [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    res.json({ success: true, message: 'ลบไฟล์เรียบร้อย', field })
  })
}

// ========== POST: OCR อ่านบัตรประชาชน (ไม่บันทึกไฟล์) ==========
exports.ocrIdCard = (req, res) => {
  ocrUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'อัพโหลดไม่สำเร็จ' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพ' })
    }

    try {
      const { createWorker } = require('tesseract.js')
      const worker = await createWorker(['tha', 'eng'], 1, { logger: () => {} })
      const { data: { text } } = await worker.recognize(req.file.buffer)
      await worker.terminate()

      // ── แยกเลขบัตรประชาชน 13 หลัก ──
      const digitsOnly = text.replace(/[^\d]/g, '')
      const idRaw = digitsOnly.match(/\d{13}/)
      let national_id = null
      if (idRaw) {
        const d = idRaw[0]
        national_id = `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`
      }

      // ── แยกวันหมดอายุ ──
      const thaiMonths = {
        'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04',
        'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08',
        'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12',
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      }
      let national_id_expiry = null
      // หาบริเวณหลัง "หมดอายุ" หรือ "Expiry"
      const expiryMatch = text.match(/(?:หมดอายุ|Expiry\s*Date?)[:\s]*([^\n]{5,40})/i)
      if (expiryMatch) {
        const seg = expiryMatch[1]
        // รูปแบบ: DD ม.ค. 2570 หรือ DD Jan 2027
        const m1 = seg.match(/(\d{1,2})\s+([\u0E00-\u0E7F.]+|[A-Za-z]+\.?)\s+(\d{4})/)
        if (m1) {
          const [, d, mon, y] = m1
          const monthNum = thaiMonths[mon.trim()] || thaiMonths[mon.trim().replace(/\.$/, '') + '.']
          if (monthNum) {
            const year = parseInt(y) > 2500 ? parseInt(y) - 543 : parseInt(y)
            national_id_expiry = `${year}-${monthNum}-${String(d).padStart(2, '0')}`
          }
        }
        // รูปแบบ: DD/MM/YYYY หรือ DD-MM-YYYY
        if (!national_id_expiry) {
          const m2 = seg.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/)
          if (m2) {
            const [, d, m, y] = m2
            const year = parseInt(y) > 2500 ? parseInt(y) - 543 : (parseInt(y) < 100 ? parseInt(y) + 2000 : parseInt(y))
            national_id_expiry = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          }
        }
      }

      // ── แยกชื่อ (นาย / นาง / นางสาว) ──
      let full_name = null
      const nameMatch = text.match(/(?:นาย|นาง(?:สาว)?)\s+[\u0E00-\u0E7F]+\s+[\u0E00-\u0E7F]+/)
      if (nameMatch) {
        full_name = nameMatch[0].trim().replace(/\s+/g, ' ')
      }

      res.json({
        success: true,
        national_id,
        national_id_expiry,
        full_name,
        raw_text: text.slice(0, 800)
      })
    } catch (e) {
      console.error('OCR error:', e)
      res.status(500).json({ success: false, message: 'OCR ล้มเหลว: ' + e.message })
    }
  })
}

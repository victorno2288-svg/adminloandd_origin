const multer = require('multer')
const path = require('path')
const fs = require('fs')

// โฟลเดอร์หลักเก็บเอกสารออกสัญญา
const baseIssuingDir = path.join(__dirname, '..', 'uploads', 'issuing')
if (!fs.existsSync(baseIssuingDir)) fs.mkdirSync(baseIssuingDir, { recursive: true })

// แยกโฟลเดอร์ตามประเภทเอกสาร
const folderMap = {
  doc_selling_pledge: 'doc-selling-pledge',
  doc_mortgage:       'doc-mortgage',
  commission_slip:    'commission-slip',
  broker_contract:    'broker-contract',
  broker_id:          'broker-id',
  doc_sp_broker:      'doc-sp-broker',
  doc_sp_appendix:    'doc-sp-appendix',
  doc_sp_notice:      'doc-sp-notice',
  doc_mg_addendum:    'doc-mg-addendum',
  doc_mg_appendix:    'doc-mg-appendix',
  doc_mg_broker:      'doc-mg-broker',
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = folderMap[file.fieldname] || 'general'
    const dir = path.join(baseIssuingDir, subfolder)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`
    cb(null, name)
  }
})

const ALLOWED_MIMETYPES = [
  // รูปภาพ
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ, PDF, Word (.docx) หรือ Excel (.xlsx)'), false)
  }
}

const uploadIssuing = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

module.exports = uploadIssuing

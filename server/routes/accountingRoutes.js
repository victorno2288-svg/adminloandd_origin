const express = require('express')
const router = express.Router()
const upload = require('../config/upload')
const accountingController = require('../controllers/accountingController')

// ฝ่ายบัญชี routes
router.get('/stats', accountingController.getAccountingStats)
router.get('/debtors', accountingController.getAccountingDebtors)
router.get('/investors', accountingController.getAccountingInvestors)
router.get('/agents', accountingController.getAccountingAgents)

// บัญชีลูกหนี้ รายละเอียด (ฟอร์มเพิ่ม/แก้ไข)
router.get('/debtor-list', accountingController.getDebtorList)
router.get('/debtor-detail/:caseId', accountingController.getDebtorDetail)
router.put('/debtor-detail/:caseId', accountingController.saveDebtorDetail)
router.put('/debtor-appraisal/:caseId', accountingController.updateAppraisalStatus)
router.put('/debtor-master-status/:caseId', accountingController.updateMasterStatus)

// บัญชีนายทุน รายละเอียด (ฟอร์มเพิ่ม/แก้ไข)
router.get('/investor-list', accountingController.getInvestorList)
router.get('/investor-detail/:investorId', accountingController.getInvestorDetail)
router.put('/investor-detail/:investorId', accountingController.saveInvestorDetail)

// บัญชีนายหน้า รายละเอียด (ฟอร์มเพิ่ม/แก้ไข)
router.get('/agent-list', accountingController.getAgentList)
router.get('/agent-detail/:agentId', accountingController.getAgentDetail)
router.put('/agent-detail/:agentId', accountingController.saveAgentDetail)

// อัพโหลดไฟล์บัญชี (สลิป, บัตร ปชช., สลิปค่าคอม)
const accountingUpload = upload.fields([
  { name: 'slip_image', maxCount: 1 },
  { name: 'id_card_image', maxCount: 1 },
  { name: 'commission_slip', maxCount: 1 },
])

router.post('/upload', accountingUpload, (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ success: false, message: 'ไม่มีไฟล์' })
    }

    // หา field แรกที่มีไฟล์
    const fieldName = Object.keys(req.files)[0]
    const file = req.files[fieldName][0]

    // สร้าง path สำหรับเข้าถึงผ่าน browser (ตรงกับ static path ใน express)
    const filePath = `/uploads/${file.destination.split('uploads')[1].replace(/\\/g, '/')}/${file.filename}`.replace('//', '/')

    res.json({
      success: true,
      filePath,
      originalName: file.originalname,
      size: file.size
    })
  } catch (err) {
    console.error('accounting upload error:', err)
    res.status(500).json({ success: false, message: 'Upload failed' })
  }
})

// ===== เอกสาร & สมุดบัญชี (Document Viewer) =====
router.get('/cases-docs', accountingController.getCaseDocsList)
router.get('/case-docs/:loanRequestId', accountingController.getCaseDocs)
router.put('/case-bank-info/:loanRequestId', accountingController.saveBankInfo)

// อัพโหลดสมุดบัญชี
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const bankBookStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/bank_books')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, 'bankbook_' + Date.now() + ext)
  }
})
const uploadBankBook = multer({ storage: bankBookStorage, limits: { fileSize: 20 * 1024 * 1024 } })
router.post('/case-bank-book/:loanRequestId', uploadBankBook.single('bank_book_file'), accountingController.uploadBankBook)

// Tab นายทุน / นายหน้า
router.get('/investors-docs', accountingController.getInvestorsDocs)
router.get('/agents-docs', accountingController.getAgentsDocs)

// ★ พอร์ตโฟลิโอนายทุนรายบุคคล
router.get('/investor-portfolio/:investorId', accountingController.getInvestorPortfolio)

// ★ แดชบอร์ดวันครบกำหนดสัญญา
router.get('/contract-expiry', accountingController.getContractExpiry)

// ★ อัพเดทวันสัญญา + ยอดเงินนายทุนต่อเคส
router.put('/case-contract-info/:caseId', accountingController.updateCaseContractInfo)

// ★ Quick-pay ค่าคอมนายหน้า (บันทึกสถานะจ่าย + อัพโหลดสลิป)
const commSlipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/commission_slips')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, 'comm_' + Date.now() + ext)
  }
})
const uploadCommSlip = multer({ storage: commSlipStorage, limits: { fileSize: 20 * 1024 * 1024 } })
router.put('/agent-payment/:agentId', uploadCommSlip.single('commission_slip'), accountingController.updateAgentPayment)

module.exports = router
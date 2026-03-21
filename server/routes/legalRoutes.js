const express = require('express')
const router = express.Router()
const upload = require('../config/uploadLegal')
const legalController = require('../controllers/legalController')

// ฝ่ายนิติกรรม
router.get('/stats', legalController.getStats)
router.get('/cases', legalController.getLegalCases)
router.get('/cases/:caseId', legalController.getLegalDetail)

// อัพโหลดเอกสารนิติกรรม
const legalUpload = upload.fields([
  { name: 'attachment', maxCount: 1 },
  { name: 'doc_selling_pledge', maxCount: 1 },
  { name: 'deed_selling_pledge', maxCount: 1 },
  { name: 'doc_extension', maxCount: 1 },
  { name: 'deed_extension', maxCount: 1 },
  { name: 'doc_redemption', maxCount: 1 },
  { name: 'deed_redemption', maxCount: 1 },
  { name: 'commission_slip', maxCount: 1 },          // ★ สลิปค่าคอมมิชชั่น
  { name: 'house_reg_prop_legal',   maxCount: 1 },   // ★ ทะเบียนบ้านทรัพย์
  { name: 'borrower_id_card_legal', maxCount: 1 },   // ★ บัตรประชาชนเจ้าของทรัพย์
  { name: 'broker_id',              maxCount: 1 },   // ★ บัตรประชาชนนายหน้า
])
router.put('/cases/:caseId', legalUpload, legalController.updateLegal)

// ลบเอกสาร
router.post('/delete-document', legalController.deleteDocument)

// ★ อัพโหลด/ลบไฟล์ต่อ item ใน SOP Checklist
const checklistUpload = upload.single('checklist_file')
router.post('/cases/:caseId/checklist-upload', checklistUpload, legalController.uploadChecklistFile)
router.post('/cases/:caseId/checklist-delete-file', legalController.deleteChecklistFile)

module.exports = router
const express = require('express')
const router = express.Router()
const upload = require('../config/upload')
const auctionController = require('../controllers/auctionController')

// Multer: เอกสารนิติกรรมเฉพาะฝ่ายประมูล (เก็บใน auction_transactions)
const auctionDocsUpload = upload.fields([
  { name: 'house_reg_book_legal',    maxCount: 5 },
  { name: 'spouse_consent_doc',      maxCount: 5 },
  { name: 'spouse_name_change_doc',  maxCount: 5 },
])
// Multer: Checklist เอกสาร (เก็บใน loan_requests)
const auctionChecklistUpload = upload.fields([
  { name: 'borrower_id_card',   maxCount: 5 },
  { name: 'house_reg_book',     maxCount: 5 },
  { name: 'name_change_doc',    maxCount: 5 },
  { name: 'divorce_doc',        maxCount: 5 },
  { name: 'spouse_id_card',     maxCount: 5 },
  { name: 'spouse_reg_copy',    maxCount: 5 },
  { name: 'marriage_cert',      maxCount: 5 },
  { name: 'single_cert',        maxCount: 5 },
  { name: 'death_cert',         maxCount: 5 },
  { name: 'will_court_doc',     maxCount: 5 },
  { name: 'testator_house_reg', maxCount: 5 },
])

router.get('/stats', auctionController.getStats)
router.get('/cases', auctionController.getAuctionCases)
router.get('/cases/:caseId', auctionController.getAuctionDetail)
router.put('/cases/:caseId', auctionController.updateAuction)

// เอกสารนิติกรรม (auction_transactions)
router.post('/cases/:caseId/docs', auctionDocsUpload, auctionController.uploadAuctionDoc)
router.post('/cases/:caseId/docs/remove', auctionController.removeAuctionDoc)
// Checklist เอกสาร (loan_requests)
router.get('/cases/:caseId/checklist-docs', auctionController.getAuctionChecklistDocs)
router.post('/cases/:caseId/checklist-docs', auctionChecklistUpload, auctionController.uploadAuctionChecklistDoc)
router.post('/cases/:caseId/checklist-docs/remove', auctionController.removeAuctionChecklistDoc)

// สลิปโอนเงิน (หลังนัดโอนที่กรมที่ดิน)
router.post('/cases/:caseId/transfer-slip', auctionController.uploadTransferSlip)

// ประวัติการเสนอราคา
router.get('/cases/:caseId/bids', auctionController.getAuctionBids)
router.post('/cases/:caseId/bids', auctionController.createAuctionBid)
router.delete('/bids/:bidId', auctionController.deleteAuctionBid)

module.exports = router

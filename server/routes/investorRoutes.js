const express = require('express')
const router = express.Router()
const investorController = require('../controllers/investorController')

// จัดการนายทุน
router.get('/', investorController.getInvestors)
router.get('/next-code', investorController.getNextCode)
router.post('/ocr-id-card', investorController.ocrIdCard)
router.get('/:id', investorController.getInvestorById)
router.post('/', investorController.createInvestor)
router.put('/:id', investorController.updateInvestor)
router.delete('/:id', investorController.deleteInvestor)

// สลิป
router.get('/:id/slips', investorController.getSlips)
router.post('/:id/slips', investorController.uploadSlip)
router.delete('/slips/:filename', investorController.deleteSlip)

// Portfolio นายทุน
router.get('/:id/portfolio', investorController.getInvestorPortfolio)

// หลักฐานตัวตน (บัตรประชาชน / เอกสาร)
router.post('/:id/id-card', investorController.uploadIdCard)

// สมุดบัญชี + สัญญานายทุน
router.post('/:id/doc-upload', investorController.uploadDoc)
router.delete('/:id/doc', investorController.deleteDoc)

// อัพโหลดสลิปมัดจำเข้า auction_bid (ระบุ bid_id)
router.post('/bids/:bidId/deposit-slip', investorController.uploadBidSlip)

module.exports = router
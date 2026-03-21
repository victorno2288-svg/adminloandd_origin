const express = require('express')
const router = express.Router()
const advanceController = require('../controllers/advanceController')

// พี่เกตดูคิวและตอบราคา
router.get('/requests', advanceController.getPriceRequests)
router.put('/requests/:id/reply', advanceController.replyPriceRequest)

module.exports = router

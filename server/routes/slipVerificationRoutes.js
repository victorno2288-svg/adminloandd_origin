// server/routes/slipVerificationRoutes.js — EasySlip verification routes
const express  = require('express')
const router   = express.Router()
const ctrl     = require('../controllers/slipVerifyController')

// POST /api/admin/slip/verify
// รับสลิปรูปภาพ → ส่งไป EasySlip → คืน data (ทุก dept ใช้ได้)
router.post('/verify', ctrl.uploadMiddleware, ctrl.verifySlip)

// GET /api/admin/slip/logs?loan_request_id=&case_id=&slip_type=&page=&limit=
// ดึงประวัติสลิปที่ตรวจแล้ว (ฝ่ายบัญชีดูทั้งหมด, dept อื่นดูของตัวเอง)
router.get('/logs', ctrl.getSlipLogs)

module.exports = router

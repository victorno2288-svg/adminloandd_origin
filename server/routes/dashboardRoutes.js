const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/admin/dashboard
router.get('/', dashboardController.getDashboard);

// GET /api/admin/dashboard/daily-report
router.get('/daily-report', dashboardController.getDailyReport);

// GET /api/admin/dashboard/chat-sla?range=today|week|month
router.get('/chat-sla', dashboardController.getChatSlaReport);

// GET /api/admin/dashboard/ceo
router.get('/ceo', dashboardController.getCeoDashboard);

module.exports = router;
// server/routes/contractExpiryRoutes.js
const express  = require('express');
const router   = express.Router();
const { checkContractExpiry, getExpiringContracts } = require('../controllers/contractExpiryController');
const verifyToken = require('../middleware/auth');

// GET  /api/contract-expiry/list?days=90  — รายการสัญญาใกล้หมด
router.get('/list', verifyToken, getExpiringContracts);

// POST /api/contract-expiry/check         — trigger ตรวจและส่ง notification (admin only)
router.post('/check', verifyToken, checkContractExpiry);

module.exports = router;

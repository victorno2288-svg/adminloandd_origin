const express = require('express');
const router  = express.Router();
const ocrCtrl = require('../controllers/ocrController');

// POST /api/admin/ocr/extract
// Body: multipart/form-data { file: <image>, doc_type: 'id_card'|'land_deed'|'salary_slip'|'general' }
router.post('/extract', ocrCtrl.ocrUpload.single('file'), ocrCtrl.extractText);

// POST /api/admin/ocr/search
// OCR เอกสาร → สกัดข้อมูล → ค้นหาใน DB (ลูกหนี้, นายหน้า, เคส)
router.post('/search', ocrCtrl.ocrUpload.single('file'), ocrCtrl.searchByOCR);

module.exports = router;

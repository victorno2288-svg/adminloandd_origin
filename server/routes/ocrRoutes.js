const express = require('express');
const router  = express.Router();
const ocrCtrl = require('../controllers/ocrController');

// POST /api/admin/ocr/extract
// Body: multipart/form-data { file: <image>, doc_type: 'id_card'|'land_deed'|'salary_slip'|'general' }
// เอกสารทั่วไป — auto-preprocess สำหรับ land_deed, id_card, house_registration
router.post('/extract', ocrCtrl.ocrUpload.single('file'), ocrCtrl.extractText);

// POST /api/admin/ocr/search
// OCR เอกสาร → สกัดข้อมูล → ค้นหาใน DB (ลูกหนี้, นายหน้า, เคส)
router.post('/search', ocrCtrl.ocrUpload.single('file'), ocrCtrl.searchByOCR);

// POST /api/admin/ocr/extract-deed
// 2-stage โฉนดที่ดิน:
//   stage=1  → เร็ว → อ่านแค่ อำเภอ+จังหวัด จากมุมขวาบน (~1-2s)
//   stage=2  → เต็ม → รายละเอียดทั้งหมด + เนื้อที่จาก back page last line (~3-5s)
//   skip_preprocess=1 → ข้ามขั้นตอน Sharp preprocessing
router.post('/extract-deed', ocrCtrl.ocrUpload.single('file'), ocrCtrl.extractDeed);

module.exports = router;

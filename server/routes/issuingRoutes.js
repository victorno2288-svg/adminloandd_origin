const express = require('express');
const router = express.Router();
const upload = require('../config/uploadIssuing');
const issuingController = require('../controllers/issuingController');
const emailController = require('../controllers/emailController');
const issuingDocController = require('../controllers/issuingDocController');

router.get('/stats', issuingController.getStats);
router.get('/cases', issuingController.getIssuingCases);
router.get('/cases/:caseId', issuingController.getIssuingDetail);

// อัพโหลดเอกสารออกสัญญา
const issuingUpload = upload.fields([
  { name: 'doc_selling_pledge', maxCount: 1 },
  { name: 'doc_mortgage',       maxCount: 1 },
  { name: 'commission_slip',    maxCount: 1 },
  { name: 'broker_contract',    maxCount: 1 },
  { name: 'broker_id',          maxCount: 1 },
  { name: 'doc_sp_broker',      maxCount: 1 },
  { name: 'doc_sp_appendix',    maxCount: 1 },
  { name: 'doc_sp_notice',      maxCount: 1 },
  { name: 'doc_mg_addendum',    maxCount: 1 },
  { name: 'doc_mg_appendix',    maxCount: 1 },
  { name: 'doc_mg_broker',      maxCount: 1 },
]);
router.put('/cases/:caseId', issuingUpload, issuingController.updateIssuing);

router.put('/cases/:caseId/status', issuingController.updateIssuingStatus);

// ลบเอกสาร
router.post('/delete-document', issuingController.deleteDocument);

// ★ ส่ง Email สรุปสัญญา
router.post('/send-email', emailController.sendCaseEmail);

// ★ Document Generation (สร้างเอกสารอัตโนมัติ)
router.get('/doc/template-info', issuingDocController.getTemplateInfo);
router.get('/doc/case-data/:caseId', issuingDocController.getCaseDataForDoc);
router.post('/doc/generate', issuingDocController.generateDocument);
router.get('/doc/list/:caseId', issuingDocController.listGeneratedDocs);

module.exports = router;

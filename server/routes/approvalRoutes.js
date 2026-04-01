const express = require('express')
const router = express.Router()
const approvalController = require('../controllers/approvalController')

router.get('/stats', approvalController.getStats)
router.get('/dashboard', approvalController.getApprovalDashboard)
router.get('/cases', approvalController.getApprovalCases)
router.get('/cases/:caseId', approvalController.getApprovalDetail)
router.put('/cases/:caseId', approvalController.updateApproval)
router.post('/cases/:caseId/upload-credit-table', approvalController.uploadCreditTableMiddleware, approvalController.uploadCreditTable)
router.delete('/cases/:caseId/credit-table', approvalController.deleteCreditTable)
router.post('/cases/:caseId/upload-credit-table2', approvalController.uploadCreditTable2Middleware, approvalController.uploadCreditTable2)
router.delete('/cases/:caseId/credit-table2', approvalController.deleteCreditTable2)

// ★ ตารางผ่อนชำระ — อนุมัติ / ทำเอง
router.patch('/cases/:caseId/approve-schedule', approvalController.approvePaymentSchedule)
router.post('/cases/:caseId/upload-approval-schedule', approvalController.uploadApprovalScheduleMiddleware, approvalController.uploadApprovalSchedule)
router.delete('/cases/:caseId/approval-schedule', approvalController.deleteApprovalSchedule)

// ★ Offer Manager Approval Gating
router.post('/cases/:caseId/submit-offer', approvalController.submitOfferForManagerApproval)
router.post('/cases/:caseId/manager-decision', approvalController.managerApproveOffer)
router.post('/cases/:caseId/mark-sent-to-customer', approvalController.markOfferSentToCustomer)

module.exports = router
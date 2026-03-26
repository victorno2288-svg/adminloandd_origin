const express = require('express')
const router = express.Router()
const upload = require('../config/upload')
const salesController = require('../controllers/salesController')
const advanceController = require('../controllers/advanceController')
const followupController = require('../controllers/followupController')
const appointmentController = require('../controllers/appointmentController')

// ฟิลด์ไฟล์ที่รับจาก SalesFormPage
const debtorUpload = upload.fields([
  { name: 'id_card_image', maxCount: 5 },
  { name: 'deed_image', maxCount: 5 },
  { name: 'property_image', maxCount: 10 },
  { name: 'building_permit', maxCount: 5 },
  { name: 'property_video', maxCount: 5 },
  { name: 'slip_image', maxCount: 1 },
])

// ฟิลด์ไฟล์สำหรับนายหน้า (บัตร ปชช. นายหน้า + ไฟล์ลูกหนี้ทั้งหมด)
const agentUpload = upload.fields([
  { name: 'id_card_image', maxCount: 1 },             // บัตร ปชช. นายหน้า
  { name: 'agent_contract_file', maxCount: 1 },       // สัญญาแต่งตั้งนายหน้า
  { name: 'house_registration_image', maxCount: 1 },  // ทะเบียนบ้านนายหน้า
  { name: 'debtor_id_card', maxCount: 5 },             // บัตร ปชช. ลูกหนี้
  { name: 'deed_image', maxCount: 5 },                 // รูปโฉนด
  { name: 'property_image', maxCount: 10 },            // รูปทรัพย์
  { name: 'building_permit', maxCount: 5 },            // ใบอนุญาต
  { name: 'property_video', maxCount: 5 },             // วีดีโอ
  { name: 'payment_slip', maxCount: 1 },               // สลิปค่านายหน้า
])

// ฟิลด์ไฟล์สำหรับเคส (สลิป + เล่มประเมิน + สัญญานายหน้า)
const caseUpload = upload.fields([
  { name: 'slip_image', maxCount: 1 },
  { name: 'appraisal_book_image', maxCount: 1 },
  { name: 'broker_contract_file', maxCount: 1 },
  { name: 'broker_id_file', maxCount: 1 },
  { name: 'commission_slip', maxCount: 1 },
  { name: 'transaction_slip', maxCount: 1 },
  { name: 'advance_slip', maxCount: 1 },
])

// ฟิลด์สำหรับตารางผ่อนชำระ
const scheduleUpload = upload.fields([
  { name: 'payment_schedule_file', maxCount: 1 },
])

// สถิติ
router.get('/stats', salesController.getSalesStats)
router.get('/kpi', salesController.getKpiStats)
router.get('/case-journey', salesController.getCaseJourney)

// Auto-matching (ค้นหาคู่ลูกหนี้-นายหน้า)
router.get('/find-match', salesController.findMatch)

// ID ลูกหนี้
router.get('/debtors', salesController.getDebtors)
router.post('/debtors', debtorUpload, salesController.createDebtor)
router.get('/debtors/:id', salesController.getDebtorById)
router.put('/debtors/:id', debtorUpload, salesController.updateDebtor)
router.delete('/debtors/:id', salesController.deleteDebtor)

// ลบรูปทีละรูปจาก loan_requests (JSON array)
router.post('/remove-image', salesController.removeDebtorImage)

// อัพเดทสถานะชำระ ใน loan_requests (ก่อนมีเคส)
router.patch('/debtors/:id/payment-status', salesController.updateDebtorPaymentStatus)
router.patch('/debtors/:id/appraisal-slip', caseUpload, salesController.uploadDebtorAppraisalSlip)
router.patch('/debtors/:id/advance-slip', caseUpload, salesController.uploadDebtorAdvanceSlip)
router.delete('/debtors/:id/advance-slip', salesController.deleteDebtorAdvanceSlip)
router.patch('/debtors/:id/payment-schedule', scheduleUpload, salesController.uploadPaymentScheduleFile)
router.delete('/debtors/:id/payment-schedule', salesController.deletePaymentScheduleFile)

// บันทึก property-type document checklist (auto-save)
router.patch('/debtors/:id/prop-checklist', salesController.savePropChecklist)

// อัพเดทประเภทสินเชื่อ inline (loan_type_detail)
router.patch('/debtors/:id/loan-type', salesController.updateLoanType)

// Asset Screening: อัพเดทผลคัดทรัพย์
router.patch('/debtors/:id/screening', salesController.updateScreening)

// Broker Contract (ส่งสัญญา / บันทึกเซ็น) via loan_request_id
router.post('/debtors/:id/broker-contract/send', salesController.brokerContractSend)
router.post('/debtors/:id/broker-contract/sign', salesController.brokerContractSign)

// อัพโหลดรูปลูกหนี้เพิ่ม (ใช้จาก CaseEditPage)
router.post('/debtors/:id/upload-images', debtorUpload, salesController.uploadDebtorImages)

// AI Auto-Create Case — ตรวจ prerequisites แล้วสร้างเคสอัตโนมัติด้วย Claude
router.post('/debtors/:id/auto-create-case', salesController.autoCreateCase)

// ID เคส
router.get('/cases', salesController.getCases)
router.post('/cases', caseUpload, salesController.createCase)
router.get('/cases/:id', salesController.getCaseById)
router.put('/cases/:id', caseUpload, salesController.updateCaseStatus)
router.delete('/cases/:id', salesController.deleteCase)

// เอกสาร Checklist (ฝ่ายขายอัพโหลด — ทั้ง personal docs + property type docs)
const checklistUpload = upload.fields([
  // ★ Personal / marital docs
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
  // ★ Property type checklist docs (house / single_house / townhouse)
  { name: 'deed_copy',          maxCount: 5 },
  { name: 'building_permit',    maxCount: 5 },
  { name: 'house_reg_prop',     maxCount: 5 },
  { name: 'sale_contract',      maxCount: 5 },
  { name: 'debt_free_cert',     maxCount: 5 },
  { name: 'blueprint',          maxCount: 5 },
  { name: 'property_photos',    maxCount: 20 },
  { name: 'land_tax_receipt',   maxCount: 5 },
  { name: 'maps_url',           maxCount: 5 },
  // ★ Condo docs
  { name: 'condo_title_deed',   maxCount: 5 },
  { name: 'condo_location_map', maxCount: 5 },
  { name: 'common_fee_receipt', maxCount: 5 },
  { name: 'floor_plan',         maxCount: 5 },
  // ★ Land docs
  { name: 'location_sketch_map', maxCount: 5 },
  { name: 'land_use_cert',       maxCount: 5 },
  // ★ Shophouse docs
  { name: 'rental_contract',    maxCount: 5 },
  { name: 'business_reg',       maxCount: 5 },
  // ★ วีดีโอทรัพย์ (ทุกประเภท)
  { name: 'property_video',     maxCount: 5 },
])
router.get('/debtors/:lrId/checklist-docs', salesController.getChecklistDocs)
router.post('/debtors/:lrId/checklist-docs', checklistUpload, salesController.uploadChecklistDoc)
router.post('/debtors/:lrId/checklist-docs/remove', salesController.removeChecklistDoc)
router.get('/debtors/:lrId/checklist-ticks', salesController.getChecklistTicks)
router.patch('/debtors/:lrId/checklist-ticks', salesController.saveChecklistTick)

// Transfer Case: โอนเคสระหว่างเซลล์
router.get('/sales-users', salesController.getSalesUsers)
router.post('/cases/:caseId/transfer', salesController.transferCase)
router.get('/cases/:caseId/transfer-log', salesController.getCaseTransferLog)

// Advance Price Request: ขอราคาเบื้องต้นจากบริษัทประเมิน
router.post('/cases/:case_id/advance-request', advanceController.createPriceRequest)
router.get('/cases/:case_id/advance-requests', advanceController.getCasePriceRequests)

// Follow-up Tracking: บันทึกการติดตามลูกค้า
router.post('/cases/:case_id/followups', followupController.createFollowup)
router.get('/cases/:case_id/followups', followupController.getFollowups)
// Follow-up Dashboard: เคสที่ครบกำหนดตาม
router.get('/weekly-report', salesController.getWeeklyReport)
router.get('/followups/due', followupController.getDueFollowups)
// Super Admin: ภาพรวม follow-up ทั้งหมด
router.get('/followups/admin-overview', followupController.getSuperAdminFollowups)

// Appointments: นัดหมาย (นัดประเมิน, กรมที่ดิน, อื่นๆ)
router.post('/cases/:case_id/appointments', appointmentController.createAppointment)
router.get('/cases/:case_id/appointments', appointmentController.getAppointments)
router.put('/appointments/:appt_id', appointmentController.updateAppointment)
router.delete('/appointments/:appt_id', appointmentController.deleteAppointment)
// Upcoming appointments for dashboard
router.get('/appointments/upcoming', appointmentController.getUpcomingAppointments)
// ★ Calendar — รวมนัดหมายทุกประเภท
router.get('/calendar/events', appointmentController.getCalendarEvents)
// ★ สร้างนัดหมายแบบ standalone (จากปฏิทิน ไม่ต้องมี case)
router.post('/appointments/standalone', appointmentController.createStandaloneAppointment)

// ID นายหน้า
router.get('/agents', salesController.getAgents)
router.post('/agents', agentUpload, salesController.createAgent)
router.get('/agents/:id', salesController.getAgentById)
router.put('/agents/:id', agentUpload, salesController.updateAgent)
router.post('/agents/:id/link-debtor', salesController.linkDebtorToAgent)
router.delete('/agents/:id', salesController.deleteAgent)

module.exports = router

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// ===== Conversations =====
router.get('/conversations', chatController.getConversations);

// ── ★ Static sub-paths ต้องอยู่ก่อน /conversations/:id เสมอ ──────────────────
// (Express จับ /conversations/followup-due ก่อน /:id ถ้า static route อยู่ก่อน)
router.get('/conversations/followup-due', chatController.getFollowupDue)
router.get('/conversations/followup-upcoming', chatController.getFollowupUpcoming)

router.get('/conversations/:id', chatController.getConversationDetail);
router.post('/conversations/:id/reply', chatController.sendReply);
router.post('/conversations/:id/upload', chatController.chatUpload.single('file'), chatController.sendFileReply);
router.put('/conversations/:id/note', chatController.updateNote);
router.put('/conversations/:id/info', chatController.updateCustomerInfo);
router.put('/conversations/:id/assign', chatController.assignConversation);
router.get('/conversations/:id/linked-user', chatController.getLinkedUser);
router.post('/conversations/:id/create-loan-request', chatController.manualCreateLoanRequest);
router.post('/conversations/:id/sync-loan-request', chatController.syncLoanRequest);

// ===== Sync (ดึงข้อมูลจาก API) =====
router.post('/sync/facebook', chatController.syncFacebook);
router.post('/sync/line', chatController.syncLine);

// ===== Platform config =====
router.get('/platforms', chatController.getPlatforms);
router.post('/platforms', chatController.createPlatform);
router.delete('/platforms/:id', chatController.deletePlatform);

// ===== Tags (แท็กสถานะ) =====
router.get('/tags', chatController.getTags);
router.post('/tags', chatController.createTag);
router.put('/tags/:id', chatController.updateTag);
router.delete('/tags/:id', chatController.deleteTag);
router.put('/conversations/:id/tag', chatController.setConversationTag);

// ===== Proxy (ดึงรูปภาพ/วิดีโอจาก LINE) =====
router.get('/proxy/line-content/:messageId', chatController.proxyLineContent);

// ===== Stats =====
router.get('/stats', chatController.getStats);

// ===== Archive (ล้างข้อมูลเก่า) =====
router.get('/archive/preview', chatController.previewArchive);
router.post('/archive/execute', chatController.executeArchive);

// ===== Transfer แชทให้เซลล์คนอื่น =====
router.get('/sales-list', chatController.getSalesListForTransfer);
router.post('/conversations/:id/transfer', chatController.transferConversation);

// ===== Follow-up Log =====
router.get('/conversations/:id/followups', chatController.getFollowups);
router.post('/conversations/:id/followup', chatController.addFollowup);

// ===== Dead / Close Lead =====
router.post('/conversations/:id/dead', chatController.markDead);
router.post('/conversations/:id/alive', chatController.markAlive);

// ===== Quick update LR fields from chat (marital_status, pipeline_stage) =====
router.put('/conversations/:id/lr-quick-update', chatController.updateLoanRequestFromChat);

// ===== Admin list for assign =====
router.get('/admin-list', chatController.getAdminListForAssign);

// ===== Quick Replies (ข้อความตอบกลับด่วน) =====
router.get('/quick-replies', chatController.getQuickReplies);
router.post('/quick-replies/seed-sop', chatController.seedSOPTemplates); // ★ ติดตั้ง SOP Templates
router.post('/quick-replies', chatController.createQuickReply);
router.put('/quick-replies/:id', chatController.updateQuickReply);
router.delete('/quick-replies/:id', chatController.deleteQuickReply);

// ── Customer Deduplication ──────────────────────────────────────────────────
router.get('/customers/search', chatController.searchCustomersForDedup)
router.post('/conversations/link-profiles', chatController.linkConversationProfiles)
router.get('/conversations/:id/linked-convs', chatController.getLinkedConversations)
router.post('/conversations/:id/unlink-profile', chatController.unlinkConversationProfile)

// ── ★ Round-Robin Management ────────────────────────────────────────────────
router.get('/rr-status', chatController.getRRStatus)
router.put('/rr-toggle/:userId', chatController.toggleRRActive)

// ── ★ Broker Contract Tracking ─────────────────────────────────────────────
router.post('/conversations/:id/broker-contract/send', chatController.brokerContractSend)
router.post('/conversations/:id/broker-contract/sign', chatController.brokerContractSign)

// ── ★ Property Extra Fields + LTV ──────────────────────────────────────────
router.put('/conversations/:id/lr-extended', chatController.updateLRExtended)

// ── ★ Ghost Chat / Lead Quality ────────────────────────────────────────────
router.put('/conversations/:id/lead-quality', chatController.setLeadQuality)
router.get('/analytics/lead-quality', chatController.getLeadQualityAnalytics)

// ── ★ Ad Source ─────────────────────────────────────────────────────────────
router.put('/conversations/:id/ad-source', chatController.updateAdSource)

// ── ★ Sentiment ──────────────────────────────────────────────────────────────
router.put('/conversations/:id/sentiment', chatController.setSentiment)

// ── ★ Chat Dashboard ─────────────────────────────────────────────────────────
router.get('/dashboard/chat-stats', chatController.getChatDashboard)

// ── ★ SLA Breach Alerts ───────────────────────────────────────────────────────
router.get('/sla-alerts', chatController.getSlaAlerts)

// ── ★ Follow-up Reminder ───────────────────────────────────────────────────────
router.put('/conversations/:id/followup-schedule', chatController.setFollowupSchedule)
router.delete('/conversations/:id/followup-schedule', chatController.clearFollowupSchedule)
// NOTE: followup-due and followup-upcoming are declared above (before /:id) to avoid route conflict

// ── ★ Blacklist ────────────────────────────────────────────────────────────────
router.get('/blacklist', chatController.getBlacklist)
router.post('/blacklist', chatController.addBlacklist)
router.delete('/blacklist/:phone', chatController.removeBlacklist)
router.get('/blacklist/check/:phone', chatController.checkBlacklist)

// ── ★ Analytics ─────────────────────────────────────────────────────────────
router.get('/analytics/quality-monitor', chatController.getQualityMonitor)

// ── ★ AI/Manual reply mode toggle ────────────────────────────────────────────
router.patch('/conversations/:id/reply-mode', chatController.setReplyMode)

// ── ★ AI Flow ─────────────────────────────────────────────────────────────────
router.patch('/conversations/:id/active-flow', chatController.setActiveFlow)
router.get  ('/flows/list-active',             chatController.listActiveFlows)

// ── ★ DocSlots upload ─────────────────────────────────────────────────────────
router.post('/conversations/:id/upload-doc', chatController.docSlotUpload.single('doc_file'), chatController.uploadDocToLoanRequest)

module.exports = router;

// ===== Webhook routes (ต้อง mount แยก ไม่ผ่าน authMiddleware) =====
// ใน index.js ต้องเพิ่ม (เฉพาะตอนมี domain จริง หรือใช้ ngrok):
//   const chatWebhookController = require('./controllers/chatWebhookController');
//   app.get('/api/chat/webhook/facebook', chatWebhookController.verifyFacebookWebhook);
//   app.post('/api/chat/webhook/facebook', chatWebhookController.handleFacebookWebhook);
//   app.get('/api/chat/webhook/line', chatWebhookController.verifyLineWebhook);
//   app.post('/api/chat/webhook/line', chatWebhookController.handleLineWebhook);

// server/routes/chatFlowRoutes.js
const express = require('express')
const router  = express.Router()
const ctrl    = require('../controllers/chatFlowController')

// ── Flows ──────────────────────────────────────────────
router.get   ('/flows',                       ctrl.listFlows)
router.post  ('/flows',                       ctrl.createFlow)
router.put   ('/flows/:id',                   ctrl.updateFlow)
router.delete('/flows/:id',                   ctrl.deleteFlow)

// ── Flow full (bot runtime) ────────────────────────────
router.get   ('/flows/:id/full',              ctrl.getFlowFull)

// ── Seed ตัวอย่าง Flow (super_admin) ──────────────────
router.post  ('/seed',                        ctrl.seedExampleFlows)

// ── Questions ──────────────────────────────────────────
router.get   ('/flows/:flowId/questions',     ctrl.listQuestions)
router.post  ('/flows/:flowId/questions',     ctrl.createQuestion)
router.put   ('/flows/:flowId/reorder',       ctrl.reorderQuestions)
router.put   ('/questions/:id',               ctrl.updateQuestion)
router.delete('/questions/:id',               ctrl.deleteQuestion)

module.exports = router

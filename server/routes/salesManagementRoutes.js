const express = require('express')
const router = express.Router()
const upload = require('../config/upload')
const c = require('../controllers/salesManagementController')

// จัดการฝ่ายขาย (admin_users department=sales)
router.get('/sales-users', c.getSalesUsers)
router.post('/sales-users', c.createSalesUser)
router.put('/sales-users/:id', c.updateSalesUser)
router.delete('/sales-users/:id', c.deleteSalesUser)

// จัดการทีมฝ่ายขาย
router.get('/teams', c.getTeams)
router.get('/teams/:id', c.getTeamDetail)
router.post('/teams', c.createTeam)
router.put('/teams/:id', c.updateTeam)
router.delete('/teams/:id', c.deleteTeam)

// จัดการนายหน้า — รับ multipart/form-data (มีไฟล์แนบ)
const agentUpload = upload.fields([
  { name: 'agent_id_card_image', maxCount: 1 },
  { name: 'agent_contract_file', maxCount: 1 },
])
router.get('/agents', c.getAgents)
router.post('/agents', agentUpload, c.createAgent)
router.put('/agents/:id', agentUpload, c.updateAgent)
router.delete('/agents/:id', c.deleteAgent)

module.exports = router

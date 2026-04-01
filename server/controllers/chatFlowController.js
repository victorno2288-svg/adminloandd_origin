// server/controllers/chatFlowController.js
// ★ Question Flow Builder — super admin กำหนดบทสนทนาบอทเองได้
// Routes: GET/POST/PUT/DELETE /api/admin/chat-flow/...

const db = require('../config/db')

// ─── helper ───────────────────────────────────────────────
function q(sql, params) {
  return new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
  )
}

// ============================================================
// FLOWS CRUD
// ============================================================

// GET /api/admin/chat-flow/flows — รายการ flows ทั้งหมด + จำนวน questions
exports.listFlows = async (req, res) => {
  try {
    const rows = await q(
      `SELECT f.*,
              COUNT(fq.id) AS question_count
         FROM chat_flows f
         LEFT JOIN chat_flow_questions fq ON fq.flow_id = f.id
        GROUP BY f.id
        ORDER BY f.sort_order ASC, f.created_at ASC`,
      []
    )
    res.json({ success: true, flows: rows })
  } catch (e) {
    console.error('[chatFlow] listFlows:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// POST /api/admin/chat-flow/flows — สร้าง flow ใหม่
exports.createFlow = async (req, res) => {
  try {
    const { flow_name, channel = 'both', description = '', trigger_keywords = '' } = req.body
    if (!flow_name?.trim()) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ flow' })

    const maxSort = await q('SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM chat_flows', [])
    const { ai_system_prompt = '' } = req.body
    const result = await q(
      'INSERT INTO chat_flows (flow_name, channel, description, trigger_keywords, ai_system_prompt, sort_order) VALUES (?,?,?,?,?,?)',
      [flow_name.trim(), channel, description, trigger_keywords || null, ai_system_prompt || null, maxSort[0].next]
    )
    const [row] = await q('SELECT * FROM chat_flows WHERE id=?', [result.insertId])
    res.json({ success: true, flow: { ...row, question_count: 0 } })
  } catch (e) {
    console.error('[chatFlow] createFlow:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// PUT /api/admin/chat-flow/flows/:id — แก้ไข flow
exports.updateFlow = async (req, res) => {
  try {
    const { id } = req.params
    const { flow_name, channel, description, is_active, trigger_keywords, ai_system_prompt } = req.body
    const fields = [], vals = []
    if (flow_name !== undefined)        { fields.push('flow_name=?');         vals.push(flow_name.trim()) }
    if (channel !== undefined)          { fields.push('channel=?');            vals.push(channel) }
    if (description !== undefined)      { fields.push('description=?');        vals.push(description) }
    if (is_active !== undefined)        { fields.push('is_active=?');          vals.push(is_active ? 1 : 0) }
    if (trigger_keywords !== undefined) { fields.push('trigger_keywords=?');   vals.push(trigger_keywords || null) }
    if (ai_system_prompt !== undefined) { fields.push('ai_system_prompt=?');   vals.push(ai_system_prompt || null) }
    if (!fields.length) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะแก้ไข' })
    vals.push(id)
    await q(`UPDATE chat_flows SET ${fields.join(',')} WHERE id=?`, vals)
    const [row] = await q(
      `SELECT f.*, COUNT(fq.id) AS question_count
         FROM chat_flows f LEFT JOIN chat_flow_questions fq ON fq.flow_id=f.id
        WHERE f.id=? GROUP BY f.id`, [id])
    res.json({ success: true, flow: row })
  } catch (e) {
    console.error('[chatFlow] updateFlow:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// DELETE /api/admin/chat-flow/flows/:id — ลบ flow + questions ทั้งหมด
exports.deleteFlow = async (req, res) => {
  try {
    const { id } = req.params
    // null out FK references in conversations before deleting
    await q('UPDATE chat_conversations SET active_flow_id = NULL WHERE active_flow_id = ?', [id])
    await q('DELETE FROM chat_flow_questions WHERE flow_id=?', [id])
    await q('DELETE FROM chat_flows WHERE id=?', [id])
    res.json({ success: true })
  } catch (e) {
    console.error('[chatFlow] deleteFlow:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// ============================================================
// QUESTIONS CRUD
// ============================================================

// GET /api/admin/chat-flow/flows/:flowId/questions
exports.listQuestions = async (req, res) => {
  try {
    const rows = await q(
      'SELECT * FROM chat_flow_questions WHERE flow_id=? ORDER BY sort_order ASC, step_number ASC',
      [req.params.flowId]
    )
    // parse choices JSON
    const parsed = rows.map(r => ({
      ...r,
      choices: r.choices ? JSON.parse(r.choices) : [],
    }))
    res.json({ success: true, questions: parsed })
  } catch (e) {
    console.error('[chatFlow] listQuestions:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// POST /api/admin/chat-flow/flows/:flowId/questions — เพิ่มคำถามใหม่
exports.createQuestion = async (req, res) => {
  try {
    const flowId = parseInt(req.params.flowId)
    const {
      question_text, question_type = 'text', choices = [],
      field_key = '', is_required = 1,
      skip_if_field = '', proactive_info = '', wait_seconds = 0,
    } = req.body

    if (!question_text?.trim()) return res.status(400).json({ success: false, message: 'กรุณากรอกข้อความคำถาม' })

    // step_number = max+1
    const maxStep = await q('SELECT COALESCE(MAX(step_number),0)+1 AS next FROM chat_flow_questions WHERE flow_id=?', [flowId])
    const step = maxStep[0].next
    const sortMax = await q('SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM chat_flow_questions WHERE flow_id=?', [flowId])

    const result = await q(
      `INSERT INTO chat_flow_questions
         (flow_id, step_number, question_text, question_type, choices,
          field_key, is_required, skip_if_field, proactive_info, wait_seconds, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        flowId, step, question_text.trim(), question_type,
        choices.length ? JSON.stringify(choices) : null,
        field_key || null, is_required ? 1 : 0,
        skip_if_field || null, proactive_info || null,
        wait_seconds || 0, sortMax[0].next,
      ]
    )

    const [row] = await q('SELECT * FROM chat_flow_questions WHERE id=?', [result.insertId])
    res.json({ success: true, question: { ...row, choices: row.choices ? JSON.parse(row.choices) : [] } })
  } catch (e) {
    console.error('[chatFlow] createQuestion:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// PUT /api/admin/chat-flow/questions/:id — แก้ไขคำถาม
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params
    const {
      question_text, question_type, choices,
      field_key, is_required, skip_if_field, proactive_info, wait_seconds,
    } = req.body

    const fields = [], vals = []
    if (question_text !== undefined) { fields.push('question_text=?'); vals.push(question_text.trim()) }
    if (question_type !== undefined) { fields.push('question_type=?'); vals.push(question_type) }
    if (choices !== undefined)       { fields.push('choices=?');       vals.push(choices?.length ? JSON.stringify(choices) : null) }
    if (field_key !== undefined)     { fields.push('field_key=?');     vals.push(field_key || null) }
    if (is_required !== undefined)   { fields.push('is_required=?');   vals.push(is_required ? 1 : 0) }
    if (skip_if_field !== undefined) { fields.push('skip_if_field=?'); vals.push(skip_if_field || null) }
    if (proactive_info !== undefined){ fields.push('proactive_info=?');vals.push(proactive_info || null) }
    if (wait_seconds !== undefined)  { fields.push('wait_seconds=?');  vals.push(parseInt(wait_seconds) || 0) }

    if (!fields.length) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะแก้ไข' })
    vals.push(id)
    await q(`UPDATE chat_flow_questions SET ${fields.join(',')} WHERE id=?`, vals)

    const [row] = await q('SELECT * FROM chat_flow_questions WHERE id=?', [id])
    res.json({ success: true, question: { ...row, choices: row.choices ? JSON.parse(row.choices) : [] } })
  } catch (e) {
    console.error('[chatFlow] updateQuestion:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// DELETE /api/admin/chat-flow/questions/:id
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params
    const [q0] = await q('SELECT flow_id FROM chat_flow_questions WHERE id=?', [id])
    if (!q0) return res.status(404).json({ success: false, message: 'ไม่พบคำถาม' })
    await q('DELETE FROM chat_flow_questions WHERE id=?', [id])
    // renumber step_number ให้ต่อเนื่อง
    const all = await q('SELECT id FROM chat_flow_questions WHERE flow_id=? ORDER BY sort_order ASC', [q0.flow_id])
    for (let i = 0; i < all.length; i++) {
      await q('UPDATE chat_flow_questions SET step_number=? WHERE id=?', [i + 1, all[i].id])
    }
    res.json({ success: true })
  } catch (e) {
    console.error('[chatFlow] deleteQuestion:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// PUT /api/admin/chat-flow/flows/:flowId/reorder — เรียงลำดับใหม่
exports.reorderQuestions = async (req, res) => {
  try {
    const { order } = req.body // [{ id, sort_order }]
    if (!Array.isArray(order)) return res.status(400).json({ success: false, message: 'order ต้องเป็น array' })
    for (let i = 0; i < order.length; i++) {
      await q('UPDATE chat_flow_questions SET sort_order=?, step_number=? WHERE id=?', [i, i + 1, order[i].id])
    }
    res.json({ success: true })
  } catch (e) {
    console.error('[chatFlow] reorderQuestions:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// POST /api/admin/chat-flow/seed — สร้าง Flow ตัวอย่างจากการประชุม (ถ้ายังไม่มี)
exports.seedExampleFlows = async (req, res) => {
  try {
    const { FLOW_LOAN, QUESTIONS_LOAN, FLOW_INQUIRY, QUESTIONS_INQUIRY } = require('../seeds/chatFlowSeed')

    const results = []

    for (const [flowMeta, questions] of [[FLOW_LOAN, QUESTIONS_LOAN], [FLOW_INQUIRY, QUESTIONS_INQUIRY]]) {
      const existing = await q('SELECT id FROM chat_flows WHERE flow_name=? LIMIT 1', [flowMeta.flow_name])
      if (existing.length > 0) {
        results.push({ flow: flowMeta.flow_name, status: 'skip', id: existing[0].id })
        continue
      }
      const ins = await q('INSERT INTO chat_flows SET ?', [flowMeta])
      const flowId = ins.insertId
      for (const qd of questions) {
        await q('INSERT INTO chat_flow_questions SET ?', [{ ...qd, flow_id: flowId }])
      }
      results.push({ flow: flowMeta.flow_name, status: 'created', id: flowId, questions: questions.length })
    }

    res.json({ success: true, results })
  } catch (e) {
    console.error('[chatFlow] seedExampleFlows:', e.message)
    res.status(500).json({ success: false, message: e.message })
  }
}

// GET /api/admin/chat-flow/flows/:id/full — flow + questions ทั้งหมด (สำหรับ bot runtime)
exports.getFlowFull = async (req, res) => {
  try {
    const [flow] = await q('SELECT * FROM chat_flows WHERE id=? AND is_active=1', [req.params.id])
    if (!flow) return res.status(404).json({ success: false, message: 'ไม่พบ flow' })
    const questions = await q(
      'SELECT * FROM chat_flow_questions WHERE flow_id=? ORDER BY sort_order ASC',
      [flow.id]
    )
    res.json({
      success: true,
      flow: {
        ...flow,
        questions: questions.map(q0 => ({ ...q0, choices: q0.choices ? JSON.parse(q0.choices) : [] })),
      },
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

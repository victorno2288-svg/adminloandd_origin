// ============================================================
// slipVerificationRoutes.js
// POST /api/admin/slip/check-ref  — เช็คว่า ref ซ้ำไหม
// POST /api/admin/slip/record-ref — บันทึก ref หลัง save สำเร็จ
// ============================================================

const express = require('express')
const router = express.Router()
const db = require('../config/db')

// ─── POST /check-ref ─────────────────────────────────────────
// body: { ref: string }
// returns: { duplicate: bool, usedAt: datetime|null, caseId: int|null }
router.post('/check-ref', (req, res) => {
  const { ref } = req.body
  if (!ref) return res.json({ duplicate: false })

  db.query(
    'SELECT id, case_id, field_name, created_at FROM slip_verifications WHERE slip_ref = ? LIMIT 1',
    [ref],
    (err, rows) => {
      if (err || !rows || rows.length === 0) {
        return res.json({ duplicate: false })
      }
      const row = rows[0]
      return res.json({
        duplicate: true,
        usedAt: row.created_at,
        caseId: row.case_id,
        fieldName: row.field_name,
      })
    }
  )
})

// ─── POST /record-ref ────────────────────────────────────────
// body: { ref, amount, case_id, field_name }
// บันทึกหลัง save สลิปสำเร็จ
router.post('/record-ref', (req, res) => {
  const { ref, amount, case_id, field_name } = req.body
  if (!ref) return res.json({ ok: true })

  // upsert — ถ้ามีแล้วก็ skip (IGNORE)
  db.query(
    `INSERT IGNORE INTO slip_verifications (slip_ref, amount, case_id, field_name, recorded_by)
     VALUES (?, ?, ?, ?, ?)`,
    [ref, amount || null, case_id || null, field_name || null, req.user?.username || null],
    (err) => {
      if (err) console.error('[slip] record-ref error:', err.message)
      return res.json({ ok: true })
    }
  )
})

module.exports = router

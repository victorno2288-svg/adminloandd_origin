const db = require('../config/db')

// ========== บันทึกการติดตาม ==========
exports.createFollowup = (req, res) => {
  const { case_id } = req.params
  const { followup_type, note, next_followup_at } = req.body
  const io = req.app.get('io')

  // ดึง sales จาก token (ถ้ามี) หรือจาก assigned_sales_id
  db.query(
    `SELECT c.case_code, c.assigned_sales_id, c.loan_request_id,
            lr.contact_name AS customer_name, au.full_name AS sales_name
     FROM cases c
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     LEFT JOIN admin_users au ON au.id = c.assigned_sales_id
     WHERE c.id = ?`,
    [case_id],
    (err, rows) => {
      if (err || !rows.length) return res.json({ success: false, error: 'ไม่พบเคส' })
      const c = rows[0]

      db.query(
        `INSERT INTO case_followups (case_id, sales_id, sales_name, followup_type, note, next_followup_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          case_id,
          c.assigned_sales_id,
          c.sales_name,
          followup_type || 'note',
          note || null,
          next_followup_at || null,
        ],
        (errIns, result) => {
          if (errIns) return res.json({ success: false, error: errIns.message })

          // อัพเดท last_follow_up_at + follow_up_count + next_follow_up_at ใน cases
          const nextAt = next_followup_at || null
          db.query(
            `UPDATE cases
             SET last_follow_up_at  = NOW(),
                 follow_up_count    = COALESCE(follow_up_count, 0) + 1,
                 next_follow_up_at  = ?
             WHERE id = ?`,
            [nextAt, case_id],
            () => {} // ignore error ถ้าคอลัมน์ยังไม่มี
          )

          res.json({ success: true, id: result.insertId })
        }
      )
    }
  )
}

// ========== ดูประวัติการติดตาม ==========
exports.getFollowups = (req, res) => {
  const { case_id } = req.params
  db.query(
    `SELECT id, followup_type, note, sales_name, next_followup_at, created_at
     FROM case_followups
     WHERE case_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
    [case_id],
    (err, rows) => {
      if (err) return res.json({ success: false, error: err.message })
      res.json({ success: true, data: rows })
    }
  )
}

// ========== Super Admin: ภาพรวม follow-up ทุกเคส ==========
// GET /sales/followups/admin-overview?sales_id=&status=all|overdue|today|upcoming|unscheduled
exports.getSuperAdminFollowups = (req, res) => {
  const salesId = req.query.sales_id || null
  const statusFilter = req.query.status || 'all'

  const salesWhere = salesId ? 'AND c.assigned_sales_id = ?' : ''
  const salesParams = salesId ? [salesId] : []

  let dateWhere = ''
  if (statusFilter === 'overdue')     dateWhere = 'AND c.next_follow_up_at < NOW() AND c.next_follow_up_at IS NOT NULL'
  else if (statusFilter === 'today')  dateWhere = 'AND DATE(c.next_follow_up_at) = CURDATE()'
  else if (statusFilter === 'upcoming') dateWhere = 'AND c.next_follow_up_at > NOW() AND c.next_follow_up_at <= DATE_ADD(NOW(), INTERVAL 3 DAY)'
  else if (statusFilter === 'unscheduled') dateWhere = 'AND c.next_follow_up_at IS NULL'

  const baseWhere = `c.status NOT IN ('cancelled','completed','rejected','appraisal_not_passed')`

  let done = 0
  let summaryResult = {}, listResult = [], salesResult = []
  let firstError = null
  const finish = (err) => {
    if (err && !firstError) firstError = err
    if (++done < 3) return
    if (firstError) {
      // ถ้า error เกี่ยวกับ column ไม่มี → แจ้งให้รัน migration
      const msg = firstError.message || ''
      const needsMigration = msg.includes('next_follow_up_at') || msg.includes('Unknown column')
      return res.json({
        success: false,
        needsMigration,
        error: needsMigration
          ? 'คอลัมน์ next_follow_up_at ยังไม่มีในตาราง cases — กรุณารัน FEATURE_FOLLOWUP_APPOINT_SCREEN.sql ใน phpMyAdmin ก่อน'
          : msg
      })
    }
    res.json({ success: true, summary: summaryResult, cases: listResult, sales_list: salesResult })
  }

  // 1. Summary counts
  db.query(`
    SELECT
      COUNT(*) AS total_active,
      SUM(CASE WHEN next_follow_up_at < NOW() AND next_follow_up_at IS NOT NULL THEN 1 ELSE 0 END) AS overdue,
      SUM(CASE WHEN DATE(next_follow_up_at) = CURDATE() THEN 1 ELSE 0 END) AS due_today,
      SUM(CASE WHEN next_follow_up_at > NOW() AND next_follow_up_at <= DATE_ADD(NOW(), INTERVAL 3 DAY) THEN 1 ELSE 0 END) AS upcoming_3d,
      SUM(CASE WHEN next_follow_up_at IS NULL THEN 1 ELSE 0 END) AS unscheduled
    FROM cases c WHERE ${baseWhere} ${salesWhere}
  `, salesParams, (err, rows) => { summaryResult = err ? {} : (rows[0] || {}); finish(err) })

  // 2. Case list
  db.query(`
    SELECT
      c.id AS case_id, c.case_code, c.status, c.follow_up_count,
      c.next_follow_up_at, c.last_follow_up_at, c.created_at AS case_created_at,
      au.full_name AS sales_name, au.nickname AS sales_nickname,
      lr.contact_name, lr.contact_phone, lr.property_type, lr.province, lr.desired_amount,
      (SELECT note FROM case_followups cf WHERE cf.case_id = c.id ORDER BY cf.created_at DESC LIMIT 1) AS last_note,
      (SELECT followup_type FROM case_followups cf WHERE cf.case_id = c.id ORDER BY cf.created_at DESC LIMIT 1) AS last_type
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN admin_users au ON au.id = c.assigned_sales_id
    WHERE ${baseWhere} ${salesWhere} ${dateWhere}
    ORDER BY
      CASE WHEN c.next_follow_up_at IS NULL THEN 2
           WHEN c.next_follow_up_at < NOW() THEN 0
           ELSE 1 END ASC,
      c.next_follow_up_at ASC
    LIMIT 200
  `, salesId ? [salesId] : [], (err, rows) => { listResult = err ? [] : rows; finish(err) })

  // 3. Sales dropdown list
  db.query(`
    SELECT DISTINCT au.id, au.full_name, au.nickname
    FROM cases c
    JOIN admin_users au ON au.id = c.assigned_sales_id
    WHERE ${baseWhere} AND au.department = 'sales'
    ORDER BY au.full_name
  `, [], (err, rows) => { salesResult = err ? [] : rows; finish(err) })
}

// ========== เคสที่ครบกำหนดตาม (overdue follow-up dashboard) ==========
// GET /sales/followups/due   ?days=0  (default: เกินกำหนดทั้งหมด)
exports.getDueFollowups = (req, res) => {
  const days = parseInt(req.query.days) || 0   // 0 = เกินกำหนดแล้ว, >0 = ที่กำลังจะถึงใน N วัน

  let dateCondition
  let params = []
  if (days === 0) {
    // เฉพาะที่เลยกำหนดแล้ว (next_follow_up_at < NOW)
    dateCondition = 'c.next_follow_up_at < NOW()'
  } else {
    // เกินกำหนดหรือจะถึงใน N วัน
    dateCondition = 'c.next_follow_up_at <= DATE_ADD(NOW(), INTERVAL ? DAY)'
    params = [days]
  }

  db.query(
    `SELECT c.id AS case_id, c.case_code, c.next_follow_up_at,
            c.last_follow_up_at, c.follow_up_count,
            c.assigned_sales_id,
            au.full_name AS sales_name,
            lr.contact_name AS customer_name, lr.contact_phone
     FROM cases c
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     LEFT JOIN admin_users au  ON au.id  = c.assigned_sales_id
     WHERE c.next_follow_up_at IS NOT NULL
       AND ${dateCondition}
       AND c.status NOT IN ('cancelled', 'completed', 'closed')
     ORDER BY c.next_follow_up_at ASC
     LIMIT 100`,
    params,
    (err, rows) => {
      if (err) return res.json({ success: false, error: err.message })
      res.json({ success: true, data: rows })
    }
  )
}

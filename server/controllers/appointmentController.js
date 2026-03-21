const db = require('../config/db')

// ========== สร้างนัดหมายแบบ Standalone (จากปฏิทิน ไม่ต้องมี case) ==========
exports.createStandaloneAppointment = (req, res) => {
  const {
    appt_type,
    appt_date,
    appt_time,
    customer_name,
    location,
    notes,
    assigned_to_id,
    assigned_to_name,
    loan_request_id,
  } = req.body || {}

  const user = req.user || {}

  if (!appt_type || !appt_date) {
    return res.json({ success: false, error: 'กรุณาระบุประเภทและวันนัดหมาย' })
  }

  // ถ้ามี loan_request_id → หา case_id ที่เกี่ยวข้อง
  const findCase = (cb) => {
    if (!loan_request_id) return cb(null, null)
    db.query('SELECT id FROM cases WHERE loan_request_id = ? LIMIT 1', [loan_request_id], (err, rows) => {
      cb(null, rows && rows.length ? rows[0].id : null)
    })
  }

  findCase((err, caseId) => {
    const sql = `
      INSERT INTO appointments
        (case_id, loan_request_id, appt_type, appt_date, appt_time,
         location, notes, assigned_to_id, assigned_to_name,
         created_by_id, created_by_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `
    db.query(sql, [
      caseId || null,
      loan_request_id || null,
      appt_type,
      appt_date,
      appt_time || null,
      location || null,
      notes || (customer_name ? `ลูกค้า: ${customer_name}` : null),
      assigned_to_id || null,
      assigned_to_name || null,
      user.id || null,
      user.full_name || user.username || null,
    ], (err2, result) => {
      if (err2) return res.json({ success: false, error: err2.message })

      // Emit socket
      const io = req.app.get('io')
      if (io) {
        io.to('admin_room').emit('appointment_created', {
          id: result.insertId, appt_type, appt_date, customer_name, assigned_to_name
        })
      }
      res.json({ success: true, id: result.insertId })
    })
  })
}

// ========== สร้างนัดหมายใหม่ (จาก case) ==========
exports.createAppointment = (req, res) => {
  const { case_id } = req.params
  const {
    loan_request_id,
    appt_type,   // valuation | transaction | call | other
    appt_date,
    appt_time,
    location,
    notes,
    assigned_to_id,
    assigned_to_name,
    created_by_id,
    created_by_name,
  } = req.body

  if (!appt_type || !appt_date) {
    return res.json({ success: false, error: 'กรุณาระบุประเภทและวันนัดหมาย' })
  }

  const sql = `
    INSERT INTO appointments
      (case_id, loan_request_id, appt_type, appt_date, appt_time,
       location, notes, assigned_to_id, assigned_to_name,
       created_by_id, created_by_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
  `
  db.query(
    sql,
    [
      case_id || null,
      loan_request_id || null,
      appt_type,
      appt_date,
      appt_time || null,
      location || null,
      notes || null,
      assigned_to_id || null,
      assigned_to_name || null,
      created_by_id || null,
      created_by_name || null,
    ],
    (err, result) => {
      if (err) return res.json({ success: false, error: err.message })

      // Emit socket เพื่อแจ้งฝ่ายขายทุกคน
      const io = req.app.get('io')
      if (io) {
        io.emit('appointment_created', {
          id: result.insertId,
          case_id,
          appt_type,
          appt_date,
          assigned_to_name,
        })
      }

      res.json({ success: true, id: result.insertId })
    }
  )
}

// ========== ดึงนัดหมายของเคส ==========
exports.getAppointments = (req, res) => {
  const { case_id } = req.params
  db.query(
    `SELECT id, appt_type, appt_date, appt_time, location, notes,
            assigned_to_id, assigned_to_name,
            created_by_name, status, completed_at, created_at, updated_at
     FROM appointments
     WHERE case_id = ?
     ORDER BY appt_date ASC, appt_time ASC`,
    [case_id],
    (err, rows) => {
      if (err) return res.json({ success: false, error: err.message })
      res.json({ success: true, data: rows })
    }
  )
}

// ========== อัพเดทนัดหมาย (เปลี่ยนสถานะ / แก้วันเวลา) ==========
exports.updateAppointment = (req, res) => {
  const { appt_id } = req.params
  const {
    appt_type,
    appt_date,
    appt_time,
    location,
    notes,
    assigned_to_id,
    assigned_to_name,
    status,   // scheduled | completed | cancelled | rescheduled
  } = req.body

  // Build dynamic SET clause
  const fields = []
  const values = []

  if (appt_type     !== undefined) { fields.push('appt_type = ?');          values.push(appt_type) }
  if (appt_date     !== undefined) { fields.push('appt_date = ?');          values.push(appt_date) }
  if (appt_time     !== undefined) { fields.push('appt_time = ?');          values.push(appt_time) }
  if (location      !== undefined) { fields.push('location = ?');           values.push(location) }
  if (notes         !== undefined) { fields.push('notes = ?');              values.push(notes) }
  if (assigned_to_id   !== undefined) { fields.push('assigned_to_id = ?');  values.push(assigned_to_id) }
  if (assigned_to_name !== undefined) { fields.push('assigned_to_name = ?'); values.push(assigned_to_name) }
  if (status        !== undefined) {
    fields.push('status = ?')
    values.push(status)
    if (status === 'completed') {
      fields.push('completed_at = NOW()')
    }
  }

  if (fields.length === 0) {
    return res.json({ success: false, error: 'ไม่มีข้อมูลที่จะอัพเดท' })
  }

  values.push(appt_id)

  db.query(
    `UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`,
    values,
    (err) => {
      if (err) return res.json({ success: false, error: err.message })
      res.json({ success: true })
    }
  )
}

// ========== ลบนัดหมาย ==========
exports.deleteAppointment = (req, res) => {
  const { appt_id } = req.params
  db.query('DELETE FROM appointments WHERE id = ?', [appt_id], (err) => {
    if (err) return res.json({ success: false, error: err.message })
    res.json({ success: true })
  })
}

// ========== Calendar Events — รวมนัดหมายทุกประเภทสำหรับหน้าปฏิทิน ==========
exports.getCalendarEvents = (req, res) => {
  const year  = parseInt(req.query.year)  || new Date().getFullYear()
  const month = parseInt(req.query.month) || new Date().getMonth() + 1

  const firstDay   = `${year}-${String(month).padStart(2,'0')}-01`
  const lastDayNum = new Date(year, month, 0).getDate()
  const lastDayStr = `${year}-${String(month).padStart(2,'0')}-${String(lastDayNum).padStart(2,'0')}`

  const events = []
  // ★ 6 queries: appointments / chat-followup / case-followup / appraisal / transaction / land-transfer
  let pending = 6

  // helper: แปลง MySQL TIME/DATETIME → "HH:MM"
  function fmtTime(t) {
    if (!t) return null
    const s = String(t)
    if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5)
    return null
  }

  function done(err) {
    if (err) console.error('[CalendarEvents] query error:', err.message)
    pending--
    if (pending === 0) {
      const valid = events.filter(e => e.date)
      valid.sort((a, b) => {
        const da = (a.date || '') + ' ' + (a.time || '00:00')
        const db2 = (b.date || '') + ' ' + (b.time || '00:00')
        return da.localeCompare(db2)
      })
      res.json({ success: true, events: valid })
    }
  }

  // ── 1) appointments table (นัดประเมิน / นัดนิติกรรม / นัดกรมที่ดิน / นัดโทร ฯลฯ)
  db.query(
    `SELECT a.id, a.appt_type,
            DATE_FORMAT(a.appt_date, '%Y-%m-%d') AS date,
            DATE_FORMAT(a.appt_time, '%H:%i')    AS time,
            a.location, a.notes, a.assigned_to_name, a.status,
            c.case_code, lr.contact_name AS customer_name, lr.id AS loan_request_id
     FROM appointments a
     LEFT JOIN cases c ON c.id = a.case_id
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     WHERE a.appt_date BETWEEN ? AND ?
       AND a.status != 'cancelled'
     ORDER BY a.appt_date, a.appt_time`,
    [firstDay, lastDayStr],
    (err, rows) => {
      if (!err && rows) {
        const typeLabel = {
          valuation: 'นัดประเมิน', transaction: 'นัดนิติกรรม',
          call: 'นัดโทรติดตาม', land_appointment: 'นัดกรมที่ดิน', other: 'นัดทั่วไป'
        }
        const typeColor = {
          valuation: '#f59e0b', transaction: '#10b981',
          call: '#3b82f6', land_appointment: '#8b5cf6', other: '#6b7280'
        }
        rows.forEach(r => {
          events.push({
            id: `appt_${r.id}`, source: 'appointment', type: r.appt_type,
            label: typeLabel[r.appt_type] || 'นัดหมาย',
            color: typeColor[r.appt_type] || '#6b7280',
            date: r.date || null, time: r.time || null,
            customer_name: r.customer_name || '-', case_code: r.case_code || null,
            loan_request_id: r.loan_request_id || null,
            location: r.location || null, notes: r.notes || null,
            assigned_to_name: r.assigned_to_name || null, status: r.status,
          })
        })
      }
      done(err)
    }
  )

  // ── 2) chat follow-up (next_follow_up_at ใน chat_conversations)
  //    ★ ใช้ query แบบ safe ไม่อ้าง is_dead / assigned_to โดยตรงเพื่อป้องกัน column-not-exist error
  db.query(
    `SELECT c.id AS conv_id,
            COALESCE(c.customer_name, c.customer_phone, 'ไม่ระบุ') AS customer_name,
            c.platform,
            DATE_FORMAT(c.next_follow_up_at, '%Y-%m-%d') AS date,
            DATE_FORMAT(c.next_follow_up_at, '%H:%i')    AS followup_time,
            c.followup_note,
            c.loan_request_id
     FROM chat_conversations c
     WHERE c.next_follow_up_at IS NOT NULL
       AND DATE(c.next_follow_up_at) BETWEEN ? AND ?`,
    [firstDay, lastDayStr],
    (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          events.push({
            id: `followup_${r.conv_id}`, source: 'followup', type: 'followup',
            label: 'นัดติดตามแชท', color: '#ec4899',
            date: r.date || null,
            time: r.followup_time && r.followup_time !== '00:00' ? r.followup_time : null,
            customer_name: r.customer_name,
            platform: r.platform || null,
            notes: r.followup_note || null,
            conv_id: r.conv_id,
            loan_request_id: r.loan_request_id || null,
          })
        })
      }
      done(err)
    }
  )

  // ── 3) case follow-up (next_followup_at ใน case_followups — การติดตาม case ของเซลล์)
  db.query(
    `SELECT cf.id, cf.case_id, cf.sales_name, cf.followup_type, cf.note,
            DATE_FORMAT(cf.next_followup_at, '%Y-%m-%d') AS date,
            DATE_FORMAT(cf.next_followup_at, '%H:%i')    AS followup_time,
            c.case_code, lr.contact_name AS customer_name, lr.id AS loan_request_id
     FROM case_followups cf
     LEFT JOIN cases c ON c.id = cf.case_id
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     WHERE cf.next_followup_at IS NOT NULL
       AND DATE(cf.next_followup_at) BETWEEN ? AND ?
     ORDER BY cf.next_followup_at`,
    [firstDay, lastDayStr],
    (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          events.push({
            id: `case_fu_${r.id}`, source: 'case_followup', type: 'followup',
            label: 'ติดตาม Case', color: '#f97316',
            date: r.date || null,
            time: r.followup_time && r.followup_time !== '00:00' ? r.followup_time : null,
            customer_name: r.customer_name || '-',
            case_code: r.case_code || null,
            case_id: r.case_id,
            loan_request_id: r.loan_request_id || null,
            notes: r.note || null,
            assigned_to_name: r.sales_name || null,
          })
        })
      }
      done(err)
    }
  )

  // ── 4) appraisal_date จาก loan_requests (วันนัดประเมินราคาทรัพย์)
  db.query(
    `SELECT lr.id, lr.contact_name AS customer_name,
            DATE_FORMAT(lr.appraisal_date, '%Y-%m-%d') AS date,
            c.case_code, c.id AS case_id, lr.appraisal_type
     FROM loan_requests lr
     LEFT JOIN cases c ON c.loan_request_id = lr.id
     WHERE lr.appraisal_date IS NOT NULL
       AND lr.appraisal_date BETWEEN ? AND ?
     ORDER BY lr.appraisal_date`,
    [firstDay, lastDayStr],
    (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          events.push({
            id: `appraisal_${r.id}`, source: 'appraisal_date', type: 'appraisal_date',
            label: 'วันประเมินราคา', color: '#f59e0b',
            date: r.date || null, time: null,
            customer_name: r.customer_name || '-',
            case_code: r.case_code || null, case_id: r.case_id || null,
            loan_request_id: r.id, appraisal_type: r.appraisal_type || null,
          })
        })
      }
      done(err)
    }
  )

  // ── 5) transaction_date จาก cases (นัดนิติกรรม / วันโอนสิทธิ์ที่กรมที่ดิน — ฝ่ายนิติ)
  db.query(
    `SELECT c.id AS case_id, c.case_code,
            DATE_FORMAT(c.transaction_date, '%Y-%m-%d') AS date,
            c.transaction_time AS time,
            c.transaction_land_office AS location,
            lr.contact_name AS customer_name, lr.id AS loan_request_id
     FROM cases c
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     WHERE c.transaction_date IS NOT NULL
       AND c.transaction_date BETWEEN ? AND ?
     ORDER BY c.transaction_date`,
    [firstDay, lastDayStr],
    (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          events.push({
            id: `txn_${r.case_id}`, source: 'transaction', type: 'transaction',
            label: 'นัดนิติกรรม / โอนสิทธิ์', color: '#10b981',
            date: r.date || null, time: fmtTime(r.time),
            customer_name: r.customer_name || '-',
            case_code: r.case_code || null, case_id: r.case_id,
            loan_request_id: r.loan_request_id || null,
            location: r.location || null,
          })
        })
      }
      done(err)
    }
  )

  // ── 6) land_transfer_date จาก cases (นัดโอนกรรมสิทธิ์ที่กรมที่ดิน — ฝ่ายประมูล)
  db.query(
    `SELECT c.id AS case_id, c.case_code,
            DATE_FORMAT(c.land_transfer_date, '%Y-%m-%d') AS date,
            c.land_transfer_time AS time,
            c.land_transfer_location AS location,
            c.land_transfer_note AS notes,
            lr.contact_name AS customer_name, lr.id AS loan_request_id
     FROM cases c
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     WHERE c.land_transfer_date IS NOT NULL
       AND c.land_transfer_date BETWEEN ? AND ?
     ORDER BY c.land_transfer_date`,
    [firstDay, lastDayStr],
    (err, rows) => {
      if (!err && rows) {
        rows.forEach(r => {
          events.push({
            id: `land_${r.case_id}`, source: 'land_transfer', type: 'land_appointment',
            label: 'นัดโอนกรรมสิทธิ์', color: '#8b5cf6',
            date: r.date || null, time: fmtTime(r.time),
            customer_name: r.customer_name || '-',
            case_code: r.case_code || null, case_id: r.case_id,
            loan_request_id: r.loan_request_id || null,
            location: r.location || null, notes: r.notes || null,
          })
        })
      }
      done(err)
    }
  )
}

// ========== นัดหมายวันนี้ + ที่กำลังจะมาถึง (ใช้ใน Dashboard) ==========
exports.getUpcomingAppointments = (req, res) => {
  const days = parseInt(req.query.days) || 7
  db.query(
    `SELECT a.id, a.case_id, a.appt_type, a.appt_date, a.appt_time,
            a.location, a.assigned_to_name, a.status,
            c.case_code,
            lr.contact_name AS customer_name
     FROM appointments a
     LEFT JOIN cases c ON c.id = a.case_id
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     WHERE a.status = 'scheduled'
       AND a.appt_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY a.appt_date ASC, a.appt_time ASC
     LIMIT 50`,
    [days],
    (err, rows) => {
      if (err) return res.json({ success: false, error: err.message })
      res.json({ success: true, data: rows })
    }
  )
}

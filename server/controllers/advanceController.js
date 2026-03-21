const db = require('../config/db')

// ========== เซลล์ส่งขอราคาเบื้องต้นจาก Advance ==========
exports.createPriceRequest = (req, res) => {
  const { case_id } = req.params
  const { note } = req.body
  const io = req.app.get('io')

  // ดึงข้อมูลเคส + ลูกหนี้
  db.query(
    `SELECT c.id, c.case_code, c.loan_request_id, c.assigned_sales_id,
            lr.customer_name, lr.customer_phone, lr.property_type,
            lr.deed_type, lr.deed_number, lr.desired_amount,
            lr.estimated_value, lr.location_hint,
            au.full_name AS sales_name
     FROM cases c
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     LEFT JOIN admin_users au ON au.id = c.assigned_sales_id
     WHERE c.id = ?`,
    [case_id],
    (err, rows) => {
      if (err || !rows.length) return res.json({ success: false, error: 'ไม่พบเคส' })
      const c = rows[0]

      // ดึง deed_images จาก loan_request
      db.query(
        `SELECT deed_image FROM loan_requests WHERE id = ? LIMIT 1`,
        [c.loan_request_id],
        (errImg, imgRows) => {
          const deed_images = imgRows?.[0]?.deed_image || null

          db.query(
            `INSERT INTO advance_price_requests
             (case_id, loan_request_id, case_code, customer_name, customer_phone,
              property_type, deed_type, deed_number, desired_amount, estimated_value,
              location_hint, deed_images, requested_by, requested_by_name, note, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending')`,
            [
              c.id, c.loan_request_id, c.case_code, c.customer_name, c.customer_phone,
              c.property_type, c.deed_type, c.deed_number, c.desired_amount, c.estimated_value,
              c.location_hint, deed_images, c.assigned_sales_id, c.sales_name, note || null,
            ],
            (errIns) => {
              if (errIns) return res.json({ success: false, error: errIns.message })

              // อัพเดท pipeline stage → sent_appraisal
              db.query(
                `UPDATE cases SET pipeline_stage = 'sent_appraisal' WHERE id = ? AND (pipeline_stage = 'chat' OR pipeline_stage = 'waiting_deed' OR pipeline_stage IS NULL)`,
                [case_id]
              )

              // notify ห้อง advance_room ว่ามีงานใหม่
              if (io) {
                io.to('advance_room').emit('new_price_request', {
                  case_code: c.case_code,
                  customer_name: c.customer_name,
                  sales_name: c.sales_name,
                  message: `📋 ${c.case_code} — ${c.customer_name} ส่งขอราคาเบื้องต้น`,
                })
              }

              res.json({ success: true })
            }
          )
        }
      )
    }
  )
}

// ========== พี่เกตดู queue รายการรอราคา ==========
exports.getPriceRequests = (req, res) => {
  const { status } = req.query // pending | replied | all
  const filter = status && status !== 'all' ? `WHERE apr.status = ?` : ''
  const params = status && status !== 'all' ? [status] : []

  db.query(
    `SELECT apr.*,
            au.full_name AS sales_full_name
     FROM advance_price_requests apr
     LEFT JOIN admin_users au ON au.id = apr.requested_by
     ${filter}
     ORDER BY apr.created_at DESC
     LIMIT 200`,
    params,
    (err, rows) => {
      if (err) return res.json({ success: false, error: err.message })
      res.json({ success: true, data: rows })
    }
  )
}

// ========== พี่เกตตอบราคา → notify เซลล์ + พี่เล็ก ==========
exports.replyPriceRequest = (req, res) => {
  const { id } = req.params
  const { preliminary_price, appraiser_note } = req.body
  const io = req.app.get('io')

  if (!preliminary_price) return res.json({ success: false, error: 'กรุณากรอกราคา' })

  db.query(
    `SELECT apr.*, au.full_name AS sales_full_name
     FROM advance_price_requests apr
     LEFT JOIN admin_users au ON au.id = apr.requested_by
     WHERE apr.id = ?`,
    [id],
    (err, rows) => {
      if (err || !rows.length) return res.json({ success: false, error: 'ไม่พบรายการ' })
      const req_row = rows[0]

      db.query(
        `UPDATE advance_price_requests
         SET preliminary_price = ?, appraiser_note = ?, status = 'replied', replied_at = NOW()
         WHERE id = ?`,
        [preliminary_price, appraiser_note || null, id],
        (errUpd) => {
          if (errUpd) return res.json({ success: false, error: errUpd.message })

          // อัพเดท pipeline stage → waiting_approval
          db.query(
            `UPDATE cases SET pipeline_stage = 'waiting_approval' WHERE id = ? AND pipeline_stage = 'sent_appraisal'`,
            [req_row.case_id]
          )

          const price_fmt = Number(preliminary_price).toLocaleString('th-TH')
          const msg = `💰 ${req_row.case_code} — ราคาเบื้องต้น ${price_fmt} บาท (${req_row.customer_name})`

          if (io) {
            // notify เซลล์ที่ส่งมา
            if (req_row.requested_by) {
              io.to('user_' + req_row.requested_by).emit('advance_price_replied', {
                request_id: id,
                case_id: req_row.case_id,
                case_code: req_row.case_code,
                customer_name: req_row.customer_name,
                preliminary_price,
                appraiser_note: appraiser_note || '',
                message: msg,
              })
            }
            // notify ทุกคนใน credit_room (ฝ่ายวิเคราะห์สินเชื่อ / พี่เล็ก)
            io.to('credit_room').emit('advance_price_replied', {
              request_id: id,
              case_id: req_row.case_id,
              case_code: req_row.case_code,
              customer_name: req_row.customer_name,
              sales_name: req_row.requested_by_name,
              preliminary_price,
              appraiser_note: appraiser_note || '',
              message: msg,
            })
            // notify admin ด้วย
            io.to('admin_room').emit('advance_price_replied', {
              case_code: req_row.case_code,
              customer_name: req_row.customer_name,
              preliminary_price,
              message: msg,
            })
          }

          res.json({ success: true })
        }
      )
    }
  )
}

// ========== ดูประวัติ requests ของเคส (เซลล์ดู) ==========
exports.getCasePriceRequests = (req, res) => {
  const { case_id } = req.params
  db.query(
    `SELECT id, status, preliminary_price, appraiser_note, note,
            requested_by_name, created_at, replied_at
     FROM advance_price_requests
     WHERE case_id = ?
     ORDER BY created_at DESC`,
    [case_id],
    (err, rows) => {
      if (err) return res.json({ success: false, error: err.message })
      res.json({ success: true, data: rows })
    }
  )
}

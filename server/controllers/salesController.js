const db = require('../config/db')
const fs = require('fs')
const path = require('path')
const { notifyStatusChange } = require('./notificationController')

// ========== Helper: รวม path ไฟล์จาก multer เป็น JSON string ==========
function getFilePaths(files, fieldname, subfolder) {
  if (!files || !files[fieldname]) return null
  const paths = files[fieldname].map(f => `uploads/${subfolder}/${f.filename}`)
  return JSON.stringify(paths)
}

// ========== Helper: Round-Robin กระจายเคสให้ฝ่ายขาย ==========
// วนรอบ: เคส1→คนที่1, เคส2→คนที่2, เคส3→คนที่3, เคส4→คนที่1 ...
// ข้ามฝ่ายขายที่ถูกลบ (ถูก DELETE จาก DB แล้ว) + status ไม่ active
function getNextSalesRoundRobin(callback) {
  // 1) ดึงฝ่ายขายที่ active ทั้งหมด เรียงตาม id ASC (ลำดับคงที่)
  db.query(
    "SELECT id, username, full_name, nickname FROM admin_users WHERE department = 'sales' AND status = 'active' ORDER BY id ASC",
    (err, salesUsers) => {
      if (err) return callback(err, null)
      if (salesUsers.length === 0) return callback(null, null) // ไม่มีเซลล์

      // 2) ดึง assigned_sales_id ของเคสล่าสุดที่ถูก assign (ไม่นับ NULL)
      db.query(
        "SELECT assigned_sales_id FROM cases WHERE assigned_sales_id IS NOT NULL ORDER BY id DESC LIMIT 1",
        (err2, lastCaseRows) => {
          if (err2) return callback(err2, null)

          var lastAssignedId = (lastCaseRows.length > 0) ? lastCaseRows[0].assigned_sales_id : null

          // 3) หาตำแหน่งของคนล่าสุดในลิสต์ แล้ววนไปคนถัดไป
          var lastIndex = -1
          if (lastAssignedId) {
            for (var i = 0; i < salesUsers.length; i++) {
              if (salesUsers[i].id === lastAssignedId) {
                lastIndex = i
                break
              }
            }
          }

          // ถ้าคนล่าสุดไม่อยู่ในลิสต์แล้ว (ถูกลบ/inactive) → เริ่มจากคนแรก
          // ถ้าคนล่าสุดอยู่ → ไปคนถัดไป (วนกลับถ้าสุด)
          var nextIndex = (lastIndex + 1) % salesUsers.length
          callback(null, salesUsers[nextIndex])
        }
      )
    }
  )
}

// ========== Helper: สร้างรหัส sequential ==========
// ลูกหนี้ = LDD0001, นายหน้า = AGT0001, เคส = CS0001
function generateSequentialCode(table, column, prefix, digits, callback) {
  const sql = `SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`
  db.query(sql, [prefix + '%'], (err, rows) => {
    if (err) return callback(err, null)
    let nextNum = 1
    if (rows.length > 0 && rows[0][column]) {
      const current = rows[0][column].replace(prefix, '')
      const num = parseInt(current, 10)
      if (!isNaN(num)) nextNum = num + 1
    }
    const code = prefix + String(nextNum).padStart(digits, '0')
    callback(null, code)
  })
}

// ========== เพิ่มลูกหนี้ (จากฟอร์มเซลล์กรอก — รองรับ FormData) ==========
exports.createDebtor = (req, res) => {
  console.log('createDebtor req.body:', req.body)
  console.log('createDebtor req.files:', req.files)

  const body = req.body || {}
  const {
    source, lead_source, dead_reason, reject_category, reject_alternative,
    contact_name, contact_phone, contact_email, contact_line, contact_facebook,
    preferred_contact, property_type, loan_type, loan_type_detail,
    property_address, province, district, subdistrict,
    house_no, village_name, additional_details,
    location_url, deed_number, deed_type, preliminary_terms,
    land_area, building_area, road_access, road_width, seizure_status, utility_access, flood_risk,
    estimated_value, interest_rate, desired_amount, loan_amount, loan_duration,
    occupation, monthly_income, loan_purpose, contract_years, net_desired_amount, advance_months,
    has_obligation, obligation_count,
    customer_gender, customer_age, existing_debt,
    admin_note, agent_id,
    bedrooms, bathrooms, floors, project_name, building_year, rental_rooms, rental_price_per_month
  } = body

  // ไม่บังคับกรอกช่องใดๆ — ลูกค้าอาจให้ข้อมูลไม่ครบ
  // สร้าง debtor_code แบบ sequential (LDD0001, LDD0002...)
  generateSequentialCode('loan_requests', 'debtor_code', 'LDD', 4, (err, debtor_code) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error: ' + err.message })

    // รวม path รูปทั้งหมด
    const allImagePaths = []
    const files = req.files || {}
    if (files['id_card_image']) {
      files['id_card_image'].forEach(f => allImagePaths.push(`uploads/id-cards/${f.filename}`))
    }
    if (files['property_image']) {
      files['property_image'].forEach(f => allImagePaths.push(`uploads/properties/${f.filename}`))
    }
    if (files['building_permit']) {
      files['building_permit'].forEach(f => allImagePaths.push(`uploads/permits/${f.filename}`))
    }
    if (files['property_video']) {
      files['property_video'].forEach(f => allImagePaths.push(`uploads/videos/${f.filename}`))
    }
    const imagesJson = allImagePaths.length > 0 ? JSON.stringify(allImagePaths) : null

    // deed_images แยกต่างหาก
    const deedPaths = []
    if (files['deed_image']) {
      files['deed_image'].forEach(f => deedPaths.push(`uploads/deeds/${f.filename}`))
    }
    const deedImagesJson = deedPaths.length > 0 ? JSON.stringify(deedPaths) : null

    // ดึงข้อมูลเจ้าหน้าที่ผู้สร้างจาก session/JWT
    const createdById   = (req.user && req.user.id)        ? req.user.id        : null
    const createdByName = (req.user && req.user.full_name)  ? req.user.full_name
                        : (req.user && req.user.username)   ? req.user.username  : null

    const sql = `
      INSERT INTO loan_requests
        (debtor_code, source, lead_source, dead_reason, reject_category, reject_alternative,
         contact_name, contact_phone, contact_email, contact_line, contact_facebook,
         preferred_contact, property_type, loan_type, loan_type_detail,
         property_address, province, district, subdistrict,
         house_no, village_name, additional_details,
         location_url, deed_number, deed_type, preliminary_terms,
         land_area, building_area, road_access, road_width, seizure_status, utility_access, flood_risk,
         estimated_value, interest_rate, desired_amount, loan_amount, loan_duration,
         occupation, monthly_income, loan_purpose, contract_years, net_desired_amount, advance_months,
         has_obligation, obligation_count,
         customer_gender, customer_age, existing_debt,
         images, deed_images,
         admin_note, agent_id,
         bedrooms, bathrooms, floors, project_name, building_year, rental_rooms, rental_price_per_month,
         created_by_id, created_by_name,
         status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `
    const params = [
      debtor_code,
      source || null,
      lead_source || null,
      dead_reason || null,
      reject_category || null,
      reject_alternative || null,
      contact_name || null,
      contact_phone || null,
      contact_email || null,
      contact_line || null,
      contact_facebook || null,
      preferred_contact || 'phone',
      property_type || null,
      loan_type || loan_type_detail || null,
      loan_type_detail || null,
      property_address || '',
      province || '',
      district || null,
      subdistrict || null,
      house_no || null,
      village_name || null,
      additional_details || null,
      location_url || null,
      deed_number || null,
      deed_type || null,
      preliminary_terms || null,
      land_area || null,
      building_area || null,
      road_access || null,
      road_width || null,
      seizure_status || null,
      utility_access || null,
      flood_risk || null,
      estimated_value || null,
      interest_rate || null,
      desired_amount || null,
      loan_amount || 0,
      loan_duration || 12,
      occupation || null,
      monthly_income || null,
      loan_purpose || null,
      contract_years || null,
      net_desired_amount || null,
      advance_months || null,
      has_obligation || 'no',
      obligation_count || null,
      customer_gender || null,
      customer_age || null,
      existing_debt || null,
      imagesJson,
      deedImagesJson,
      admin_note || null,
      agent_id || null,
      bedrooms || null,
      bathrooms || null,
      floors || null,
      project_name || null,
      building_year || null,
      rental_rooms || null,
      rental_price_per_month || null,
      createdById,
      createdByName
    ]

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('createDebtor SQL error:', err)
        return res.status(500).json({ success: false, message: 'Server Error: ' + err.message })
      }

      // ===== แจ้งเตือนตาม checkbox ที่ฝ่ายขายติ๊ก =====
      try {
        const io = req.app.get('io')
        const userId = req.user ? req.user.id : null
        if (req.body.notify_appraisal === '1') {
          notifyStatusChange(result.insertId, null, null, 'new_from_admin', io, userId, contact_name)
        }
        if (req.body.notify_approval === '1') {
          notifyStatusChange(result.insertId, null, null, 'new_from_admin_to_approval', io, userId, contact_name)
        }
        if (req.body.notify_legal === '1') {
          notifyStatusChange(result.insertId, null, null, 'new_from_admin_to_legal', io, userId, contact_name)
        }
        // แจ้งเตือนเมื่อบันทึกเหตุผลปฏิเสธ
        if (reject_category) {
          notifyStatusChange(result.insertId, null, null, 'debtor_rejected', io, userId, contact_name)
        }
      } catch (notifErr) {
        console.error('createDebtor notify error:', notifErr.message)
      }

      res.json({ success: true, message: 'บันทึกข้อมูลลูกค้าสำเร็จ', id: result.insertId, debtor_code })
    })
  })
}

// ========== ID ลูกหนี้ (ใช้ subquery ดึงเคสล่าสุด — ไม่ซ้ำแถว) ==========
exports.getDebtors = (req, res) => {
  const sql = `
    SELECT
      lr.id, lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line, lr.contact_facebook,
      lr.property_type, lr.loan_type, lr.loan_type_detail, lr.province, lr.loan_amount,
      lr.status, lr.source, lr.lead_source, lr.reject_category, lr.reject_alternative, lr.dead_reason,
      lr.created_at, lr.agent_id AS lr_agent_id,
      lr.created_by_id, lr.created_by_name,
      lr.images, lr.appraisal_images, lr.deed_images,
      lr.payment_status AS lr_payment_status,
      latest_case.case_id, latest_case.case_code, latest_case.case_status,
      COALESCE(latest_case.payment_status, lr.payment_status) AS payment_status,
      latest_case.approved_amount,
      COALESCE(latest_case.agent_id, lr.agent_id) AS agent_id,
      COALESCE(latest_case.agent_code, direct_agent.agent_code) AS agent_code,
      COALESCE(latest_case.agent_name, direct_agent.full_name) AS agent_name,
      latest_case.case_recorded_by,
      latest_case.case_creator
    FROM loan_requests lr
    LEFT JOIN (
      SELECT c.loan_request_id,
        c.id AS case_id, c.case_code, c.status AS case_status,
        c.pipeline_stage,
        c.payment_status, c.approved_amount, c.agent_id,
        c.recorded_by AS case_recorded_by,
        COALESCE(c.recorded_by, au.full_name, au.username) AS case_creator,
        a.agent_code, a.full_name AS agent_name
      FROM cases c
      LEFT JOIN agents a ON a.id = c.agent_id
      LEFT JOIN admin_users au ON au.id = c.assigned_sales_id
      WHERE c.id = (
        SELECT c2.id FROM cases c2
        WHERE c2.loan_request_id = c.loan_request_id
        ORDER BY c2.created_at DESC LIMIT 1
      )
    ) latest_case ON latest_case.loan_request_id = lr.id
    LEFT JOIN agents direct_agent ON direct_agent.id = lr.agent_id
    ORDER BY lr.created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getDebtors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, debtors: results })
  })
}

// ========== ID เคส (LEFT JOIN loan_requests + agents + admin_users) ==========
exports.getCases = (req, res) => {
  const sql = `
    SELECT
      c.id, c.case_code, c.status, c.payment_status,
      c.next_follow_up_at, c.last_follow_up_at, c.follow_up_count,
      lr.appraisal_fee, c.approved_amount, c.note,
      lr.slip_image, lr.appraisal_book_image,
      c.created_at, c.updated_at,
      c.recorded_by,
      lr.id AS loan_request_id, lr.debtor_code,
      lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      lr.property_type, lr.loan_type, lr.loan_type_detail, lr.province,
      lr.loan_amount, lr.images AS debtor_images, lr.appraisal_images AS debtor_appraisal_images, lr.deed_images AS debtor_deed_images,
      lr.ineligible_property, lr.screening_status, lr.ineligible_reason,
      a.id AS agent_id, a.agent_code, a.full_name AS agent_name,
      a.phone AS agent_phone, a.commission_rate,
      au.id AS sales_id, au.full_name AS sales_name,
      au.nickname AS sales_nickname
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN admin_users au ON au.id = c.assigned_sales_id
    ORDER BY c.created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getCases error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, cases: results })
  })
}

// ========== ID นายหน้า (LEFT JOIN cases + debtors) ==========
exports.getAgents = (req, res) => {
  const sql = `
    SELECT a.*,
      COUNT(c.id) AS total_cases,
      SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) AS completed_cases,
      COALESCE(SUM(c.approved_amount), 0) AS total_amount
    FROM agents a
    LEFT JOIN cases c ON c.agent_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAgents error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, agents: results })
  })
}

// ========== ดึงข้อมูลนายหน้าตาม ID (พร้อมข้อมูลลูกหนี้ที่เชื่อมกัน) ==========
exports.getAgentById = (req, res) => {
  const { id } = req.params
  const sql = `
    SELECT a.*,
      COUNT(c.id) AS total_cases,
      COALESCE(SUM(c.approved_amount), 0) AS total_amount
    FROM agents a
    LEFT JOIN cases c ON c.agent_id = a.id
    WHERE a.id = ?
    GROUP BY a.id
  `
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนายหน้า' })

    var agent = results[0]

    // ดึงลูกหนี้ที่เชื่อมกัน: ผ่านเคส + ผ่าน loan_requests.agent_id (ยังไม่มีเคส)
    db.query(
      `SELECT lr.id, lr.debtor_code, lr.contact_name, lr.contact_phone, lr.property_type, lr.province,
              c.case_code, c.status AS case_status, c.payment_status
       FROM cases c
       INNER JOIN loan_requests lr ON lr.id = c.loan_request_id
       WHERE c.agent_id = ?
       ORDER BY c.created_at DESC`,
      [id],
      (err2, caseDebtors) => {
        if (err2) caseDebtors = []

        // ดึงลูกหนี้ที่มี agent_id ตรง แต่ยังไม่มีเคส
        db.query(
          `SELECT lr.id, lr.debtor_code, lr.contact_name, lr.contact_phone, lr.property_type, lr.province,
                  NULL AS case_code, NULL AS case_status, NULL AS payment_status
           FROM loan_requests lr
           WHERE lr.agent_id = ? AND lr.id NOT IN (
             SELECT COALESCE(c2.loan_request_id, 0) FROM cases c2 WHERE c2.agent_id = ?
           )
           ORDER BY lr.created_at DESC`,
          [id, id],
          (err3, directDebtors) => {
            if (err3) directDebtors = []
            var allDebtors = (caseDebtors || []).concat(directDebtors || [])
            res.json({ success: true, agent: agent, linked_debtors: allDebtors })
          }
        )
      }
    )
  })
}

// ========== สร้างเคส — รองรับลูกหนี้อย่างเดียว / นายหน้าอย่างเดียว / หรือทั้งคู่ ==========
// ฝ่ายบัญชีสร้างเคสได้ทันที — ไม่ต้องชำระเงินก่อน (payment_status เริ่มเป็น 'unpaid')
exports.createCase = (req, res) => {
  const {
    loan_request_id, agent_id, assigned_sales_id, note,
    appraisal_type, appraisal_date, appraisal_fee, payment_date,
    payment_status,
    transaction_date, transaction_time, transaction_land_office,
    transaction_note
  } = req.body
  const recorded_by = req.user ? (req.user.full_name || req.user.username || 'ระบบ') : 'ระบบ'
  const transaction_recorded_by = req.user ? (req.user.full_name || req.user.username || 'ระบบ') : 'ระบบ'

  // ต้องมีอย่างน้อย ลูกหนี้ หรือ นายหน้า
  if (!loan_request_id && !agent_id) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกลูกหนี้ หรือ นายหน้า อย่างน้อย 1 รายการ' })
  }

  // ฝ่ายบัญชีสามารถสร้างเคสได้โดยไม่ต้องชำระเงินก่อน — payment_status จะเป็น 'unpaid' จนกว่าจะชำระ
  const files = req.files || {}
  const hasSlip = files['slip_image'] && files['slip_image'].length > 0
  const isPaid = payment_status === 'paid'

  // ดึง user_id จาก loan_requests (ถ้ามี)
  var getUserId = function(callback) {
    if (!loan_request_id) return callback(null)
    db.query('SELECT user_id FROM loan_requests WHERE id = ?', [loan_request_id], (err0, lrRows) => {
      if (err0) return callback(null)
      callback(lrRows.length > 0 ? lrRows[0].user_id : null)
    })
  }

  getUserId(function(user_id) {
    // ===== Round-Robin: ถ้าไม่ได้เลือกเซลล์เอง → ระบบกระจายอัตโนมัติ =====
    var doCreateCase = function(finalSalesId, autoAssignedName) {
      generateSequentialCode('cases', 'case_code', 'CS', 4, (err, case_code) => {
        if (err) return res.status(500).json({ success: false, message: 'Server Error' })

        // เช็คว่ารหัสซ้ำไหม
        db.query('SELECT id FROM cases WHERE case_code = ?', [case_code], (err1, existing) => {
          if (err1) return res.status(500).json({ success: false, message: 'Server Error' })
          if (existing.length > 0) {
            var num = parseInt(case_code.replace('CS', ''), 10) + 1
            case_code = 'CS' + String(num).padStart(4, '0')
          }

          // อัพโหลดรูปสลิป / เล่มประเมิน (ถ้ามี)
          let slipPath = null
          let bookPath = null
          if (hasSlip) {
            slipPath = `uploads/slips/${files['slip_image'][0].filename}`
          }
          if (files['appraisal_book_image'] && files['appraisal_book_image'].length > 0) {
            bookPath = `uploads/appraisal-books/${files['appraisal_book_image'][0].filename}`
          }

          const sql = `
            INSERT INTO cases (case_code, loan_request_id, user_id, agent_id, assigned_sales_id, note,
              appraisal_type, appraisal_date, appraisal_fee, payment_date, payment_status,
              recorded_by, recorded_at, slip_image, appraisal_book_image,
              transaction_date, transaction_time, transaction_land_office,
              transaction_note, transaction_recorded_by, transaction_recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          const params = [
            case_code,
            loan_request_id || null,
            (req.user ? req.user.id : null),
            agent_id || null,
            finalSalesId || null,
            note || null,
            appraisal_type || 'outside',
            appraisal_date || null,
            appraisal_fee || 2900,
            payment_date || null,
            isPaid ? 'paid' : (hasSlip ? 'paid' : 'unpaid'),
            recorded_by,
            new Date(),
            slipPath, bookPath,
            transaction_date || null,
            transaction_time || null,
            transaction_land_office || null,
            transaction_note || null,
            transaction_recorded_by,
            new Date()
          ]

          db.query(sql, params, (err2, result) => {
            if (err2) return res.status(500).json({ success: false, message: 'Server Error: ' + err2.message })

            // อัพเดทสถานะ + agent_id ใน loan_requests (ถ้ามีลูกหนี้)
            if (loan_request_id) {
              db.query('UPDATE loan_requests SET status = ? WHERE id = ?', ['reviewing', loan_request_id])
              if (agent_id) {
                db.query(
                  'UPDATE loan_requests SET agent_id = ? WHERE id = ? AND (agent_id IS NULL OR agent_id = 0)',
                  [agent_id, loan_request_id],
                  () => {}
                )
              }

              // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) เมื่อสร้างเคสใหม่ =====
              const io = req.app.get('io')
              const userId = req.user ? req.user.id : null
              notifyStatusChange(parseInt(loan_request_id), result.insertId, null, 'reviewing', io, userId)
            }

            var responseMsg = 'สร้างเคสสำเร็จ'
            if (autoAssignedName) {
              responseMsg += ' (กระจายให้: ' + autoAssignedName + ')'
            }
            res.json({ success: true, message: responseMsg, case_code, id: result.insertId, assigned_sales_id: finalSalesId })
          })
        })
      })
    }

    // ===== เริ่มสร้างเคส: ถ้าเลือกเซลล์เอง → ใช้เลย, ถ้าไม่ → Round-Robin =====
    if (assigned_sales_id) {
      // ผู้ใช้เลือกเซลล์เอง
      doCreateCase(assigned_sales_id, null)
    } else {
      // ระบบกระจายอัตโนมัติแบบ Round-Robin
      getNextSalesRoundRobin(function(err, nextSales) {
        if (err || !nextSales) {
          console.log('Round-Robin: ไม่พบเซลล์ที่ active → สร้างเคสไม่มีเซลล์')
          doCreateCase(null, null)
        } else {
          console.log('🎯 Round-Robin assign: ' + (nextSales.full_name || nextSales.username) + ' (id=' + nextSales.id + ')')
          doCreateCase(nextSales.id, nextSales.full_name || nextSales.nickname || nextSales.username)
        }
      })
    }
  })
}

// ========== เพิ่มนายหน้า (สร้าง agent + ลูกหนี้พร้อมกัน / หรือเลือกลูกหนี้เดิม) ==========
exports.createAgent = (req, res) => {
  const {
    full_name, nickname, phone, email, line_id, facebook, national_id, commission_rate,
    date_of_birth, national_id_expiry, address,
    area, contract_date,
    debtor_mode, debtor_id,
    contact_name, contact_phone, property_type,
    has_obligation, obligation_count,
    province, district, subdistrict,
    house_no, village_name, additional_details,
    location_url, deed_number, deed_type, land_area,
    loan_type_detail,
    desired_amount, interest_rate, occupation, monthly_income,
    loan_purpose, contract_years, net_desired_amount
  } = req.body

  // ไม่บังคับกรอก — รับข้อมูลเท่าที่มี

  // 1) สร้าง agent_code — ใช้ AGT prefix (ไม่ซ้ำกับลูกหนี้ LDD)
  generateSequentialCode('agents', 'agent_code', 'AGT', 4, (err, agent_code) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error: ' + err.message })

    const files = req.files || {}

    // บัตรประชาชนนายหน้า
    let idCardPath = null
    if (files['id_card_image'] && files['id_card_image'].length > 0) {
      idCardPath = `uploads/id-cards/${files['id_card_image'][0].filename}`
    }

    // สัญญาแต่งตั้งนายหน้า
    let contractFilePath = null
    if (files['agent_contract_file'] && files['agent_contract_file'].length > 0) {
      contractFilePath = `uploads/contracts/broker/${files['agent_contract_file'][0].filename}`
    }

    // สำเนาทะเบียนบ้านนายหน้า
    let houseRegPath = null
    if (files['house_registration_image'] && files['house_registration_image'].length > 0) {
      houseRegPath = `uploads/id-cards/${files['house_registration_image'][0].filename}`
    }

    // สลิปค่านายหน้า
    let paymentSlipPath = null
    if (files['payment_slip'] && files['payment_slip'].length > 0) {
      paymentSlipPath = `uploads/contracts/broker/${files['payment_slip'][0].filename}`
    }

    // INSERT นายหน้า (รวมฟิลด์ใหม่)
    const agentSql = `
      INSERT INTO agents (agent_code, full_name, nickname, phone, email, line_id, facebook, national_id, commission_rate,
                          date_of_birth, national_id_expiry, address,
                          area, contract_file, contract_date, id_card_image, house_registration_image, payment_slip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    db.query(agentSql, [
      agent_code, full_name || null, nickname || null, phone || null,
      email || null, line_id || null, facebook || null, national_id || null,
      commission_rate || 0,
      date_of_birth || null, national_id_expiry || null, address || null,
      area || null, contractFilePath, contract_date || null,
      idCardPath, houseRegPath, paymentSlipPath
    ], (err2, agentResult) => {
      if (err2) return res.status(500).json({ success: false, message: 'Server Error: ' + err2.message })

      const agentId = agentResult.insertId

      // 2) ถ้าเลือกลูกหนี้เดิม → อัพเดท agent_id ใน loan_requests แล้วส่ง response
      if (debtor_mode === 'existing' && debtor_id) {
        db.query('UPDATE loan_requests SET agent_id = ? WHERE id = ? AND (agent_id IS NULL OR agent_id = 0)', [agentId, debtor_id], function() {
          // ไม่สนใจ error — ถ้า update ไม่ได้ก็ไม่เป็นไร
        })
        return res.json({
          success: true,
          message: 'ลงทะเบียนนายหน้าสำเร็จ (เชื่อมลูกหนี้เดิม)',
          id: agentId, agent_code, debtor_id: debtor_id
        })
      }

      // 3) ถ้ากรอกลูกหนี้ใหม่ → สร้าง loan_request ด้วย
      if (!contact_name || !contact_phone) {
        // ไม่ได้กรอกข้อมูลลูกหนี้ → สร้างแค่นายหน้า
        return res.json({
          success: true, message: 'เพิ่มนายหน้าสำเร็จ',
          id: agentId, agent_code
        })
      }

      generateSequentialCode('loan_requests', 'debtor_code', 'LDD', 4, (err3, debtor_code) => {
        if (err3) {
          return res.json({
            success: true,
            message: 'เพิ่มนายหน้าสำเร็จ แต่สร้างลูกหนี้ไม่ได้: ' + err3.message,
            id: agentId, agent_code
          })
        }

        // รวม path ไฟล์ลูกหนี้
        const allImagePaths = []
        if (files['debtor_id_card']) {
          files['debtor_id_card'].forEach(f => allImagePaths.push(`uploads/id-cards/${f.filename}`))
        }
        if (files['property_image']) {
          files['property_image'].forEach(f => allImagePaths.push(`uploads/properties/${f.filename}`))
        }
        if (files['building_permit']) {
          files['building_permit'].forEach(f => allImagePaths.push(`uploads/permits/${f.filename}`))
        }
        if (files['property_video']) {
          files['property_video'].forEach(f => allImagePaths.push(`uploads/videos/${f.filename}`))
        }
        const imagesJson = allImagePaths.length > 0 ? JSON.stringify(allImagePaths) : null

        const deedPaths = []
        if (files['deed_image']) {
          files['deed_image'].forEach(f => deedPaths.push(`uploads/deeds/${f.filename}`))
        }
        const deedImagesJson = deedPaths.length > 0 ? JSON.stringify(deedPaths) : null

        const debtorSql = `
          INSERT INTO loan_requests
            (debtor_code, source, contact_name, contact_phone,
             property_type, has_obligation, obligation_count,
             province, district, subdistrict,
             house_no, village_name, additional_details,
             location_url, deed_number, deed_type, land_area,
             loan_type_detail,
             desired_amount, interest_rate, occupation, monthly_income,
             loan_purpose, contract_years, net_desired_amount,
             images, deed_images, agent_id, status)
          VALUES (?, 'agent', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `
        const debtorParams = [
          debtor_code, contact_name, contact_phone,
          property_type || null,
          has_obligation || 'no', obligation_count || null,
          province || '', district || null, subdistrict || null,
          house_no || null, village_name || null, additional_details || null,
          location_url || null, deed_number || null, deed_type || null, land_area || null,
          loan_type_detail || null,
          desired_amount || null, interest_rate || null, occupation || null, monthly_income || null,
          loan_purpose || null, contract_years || null, net_desired_amount || null,
          imagesJson, deedImagesJson,
          agentId
        ]

        db.query(debtorSql, debtorParams, (err4, debtorResult) => {
          if (err4) {
            return res.json({
              success: true,
              message: 'เพิ่มนายหน้าสำเร็จ แต่สร้างลูกหนี้ผิดพลาด: ' + err4.message,
              id: agentId, agent_code
            })
          }

          res.json({
            success: true,
            message: 'ลงทะเบียนนายหน้า + ลูกหนี้สำเร็จ',
            id: agentId, agent_code,
            debtor_id: debtorResult.insertId, debtor_code
          })
        })
      })
    })
  })
}

// ========== แก้ไขนายหน้า (รองรับ FormData + อัพโหลดบัตรประชาชน) ==========
exports.updateAgent = (req, res) => {
  const { id } = req.params
  const {
    full_name, nickname, phone, email, line_id, facebook, national_id, commission_rate, status,
    date_of_birth, national_id_expiry, address,
    area, contract_date,
    remove_id_card, remove_house_registration
  } = req.body

  const fields = [
    'full_name=?', 'nickname=?', 'phone=?', 'email=?', 'line_id=?', 'facebook=?',
    'national_id=?', 'commission_rate=?', 'status=?',
    'date_of_birth=?', 'national_id_expiry=?', 'address=?',
    'area=?', 'contract_date=?'
  ]
  const values = [
    full_name || null, nickname || null, phone || null, email || null,
    line_id || null, facebook || null, national_id || null, commission_rate || 0, status || 'active',
    date_of_birth || null, national_id_expiry || null, address || null,
    area || null, contract_date || null
  ]

  // อัพโหลดไฟล์ใหม่ (ถ้ามี)
  const files = req.files || {}
  if (files['id_card_image'] && files['id_card_image'].length > 0) {
    fields.push('id_card_image=?')
    values.push(`uploads/id-cards/${files['id_card_image'][0].filename}`)
  }
  if (files['agent_contract_file'] && files['agent_contract_file'].length > 0) {
    fields.push('contract_file=?')
    values.push(`uploads/contracts/broker/${files['agent_contract_file'][0].filename}`)
  }
  if (files['house_registration_image'] && files['house_registration_image'].length > 0) {
    fields.push('house_registration_image=?')
    values.push(`uploads/id-cards/${files['house_registration_image'][0].filename}`)
  }
  if (files['payment_slip'] && files['payment_slip'].length > 0) {
    fields.push('payment_slip=?')
    values.push(`uploads/contracts/broker/${files['payment_slip'][0].filename}`)
  }

  // ลบรูปบัตรประชาชนเดิม (ถ้าสั่ง และไม่มีรูปใหม่มาแทน)
  if (remove_id_card === '1' && !(files['id_card_image'] && files['id_card_image'].length > 0)) {
    fields.push('id_card_image=NULL')
  }
  // ลบรูปสำเนาทะเบียนบ้านเดิม (ถ้าสั่ง และไม่มีรูปใหม่มาแทน)
  if (remove_house_registration === '1' && !(files['house_registration_image'] && files['house_registration_image'].length > 0)) {
    fields.push('house_registration_image=NULL')
  }

  values.push(id)
  const sql = `UPDATE agents SET ${fields.join(', ')} WHERE id=?`
  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    res.json({ success: true, message: 'อัพเดทนายหน้าสำเร็จ' })
  })
}

// ========== เชื่อมลูกหนี้ที่มีอยู่กับนายหน้า (edit mode) ==========
exports.linkDebtorToAgent = (req, res) => {
  const { id } = req.params
  const { debtor_id } = req.body

  if (!debtor_id) return res.status(400).json({ success: false, message: 'กรุณาระบุ debtor_id' })

  // ตรวจว่านายหน้ามีอยู่จริง
  db.query('SELECT id FROM agents WHERE id = ?', [id], (err, agents) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (agents.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบนายหน้า' })

    // อัพเดท agent_id ใน loan_requests (ไม่ทับถ้า debtor มีนายหน้าอยู่แล้ว → ใช้ force แทน)
    db.query(
      'UPDATE loan_requests SET agent_id = ? WHERE id = ?',
      [id, debtor_id],
      (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกหนี้' })
        res.json({ success: true, message: 'เชื่อมลูกหนี้สำเร็จ' })
      }
    )
  })
}

// ========== ลบนายหน้า (พร้อมลบรูปบัตรประชาชน) ==========
exports.deleteAgent = (req, res) => {
  const { id } = req.params

  // ตรวจสอบว่ามีเคสที่ผูกอยู่ไหม
  db.query('SELECT id FROM cases WHERE agent_id = ?', [id], (err, cases) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (cases.length > 0) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถลบได้ เนื่องจากมีเคสที่ผูกกับนายหน้านี้อยู่' })
    }

    // ดึง path รูปก่อนลบ
    db.query('SELECT id_card_image FROM agents WHERE id = ?', [id], (err1, rows) => {
      if (err1) return res.status(500).json({ success: false, message: 'Server Error' })
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนายหน้า' })

      const { id_card_image } = rows[0]

      db.query('DELETE FROM agents WHERE id = ?', [id], (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลนายหน้า' })

        // ลบไฟล์บัตรประชาชน
        if (id_card_image) {
          const fullPath = path.join(__dirname, '..', id_card_image)
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
        }

        res.json({ success: true, message: 'ลบนายหน้าและไฟล์ที่เกี่ยวข้องสำเร็จ' })
      })
    })
  })
}

// ========== ดึงข้อมูลเคสตาม ID (พร้อมข้อมูลคู่กัน: ลูกหนี้ + นายหน้า) ==========
exports.getCaseById = (req, res) => {
  const { id } = req.params
  const sql = `
    SELECT
      c.id, c.case_code, c.loan_request_id, c.user_id,
      c.agent_id, c.assigned_sales_id,
      c.status, c.payment_status,
      lr.appraisal_fee, c.approved_amount, c.note,
      lr.appraisal_type, lr.appraisal_date, COALESCE(c.payment_date, lr.payment_date) AS payment_date,
      lr.slip_image, lr.appraisal_book_image,
      c.slip_image AS case_slip_image,
      c.broker_contract_signed, c.broker_contract_date, c.broker_contract_file, c.broker_id_file,
      c.recorded_by, c.recorded_at,
      c.transaction_date, c.transaction_time, c.transaction_land_office,
      c.transaction_note, c.transaction_recorded_by, c.transaction_recorded_at,
      c.created_at, c.updated_at,

      lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_email, lr.contact_line, lr.contact_facebook,
      lr.property_type, lr.loan_type, lr.loan_type_detail,
      lr.property_address, lr.province, lr.district, lr.subdistrict,
      lr.house_no, lr.village_name, lr.additional_details,
      lr.location_url, lr.deed_number,
      lr.land_area, lr.building_area,
      lr.estimated_value, lr.loan_amount, lr.loan_duration,
      lr.interest_rate, lr.desired_amount, lr.occupation,
      lr.monthly_income, lr.loan_purpose, lr.marital_status, lr.contract_years, lr.net_desired_amount, lr.advance_months,
      lr.road_width, lr.utility_access, lr.flood_risk,
      lr.has_obligation, lr.obligation_count,
      lr.images, lr.appraisal_images, lr.deed_images,
      lr.preferred_contact, lr.source,
      lr.admin_note AS debtor_note,
      lr.status AS debtor_status,

      lr.appraisal_result, lr.appraisal_note, lr.appraisal_recorded_by, lr.appraisal_recorded_at,
      lr.outside_result, lr.outside_reason, lr.outside_recorded_at,
      lr.inside_result, lr.inside_reason, lr.inside_recorded_at,
      lr.check_price_value, lr.check_price_detail, lr.check_price_recorded_at,

      a.agent_code, a.full_name AS agent_name,
      a.phone AS agent_phone,
      a.nickname AS agent_nickname,
      a.email AS agent_email,
      a.line_id AS agent_line_id,
      a.commission_rate,

      au.full_name AS sales_name,
      au.nickname AS sales_nickname,

      at2.id AS approval_id, at2.approval_type, at2.approved_credit,
      at2.interest_per_year, at2.interest_per_month, at2.operation_fee,
      at2.land_tax_estimate, at2.advance_interest, at2.approval_status,
      at2.credit_table_file, at2.approval_date AS approval_approval_date,
      lr.payment_schedule_file,

      auc.house_reg_book AS auc_house_reg_book, auc.house_reg_book_legal,
      auc.name_change_doc, auc.divorce_doc AS auc_divorce_doc,
      auc.spouse_consent_doc, auc.spouse_id_card AS auc_spouse_id_card, auc.spouse_reg_copy AS auc_spouse_reg_copy,
      auc.marriage_cert AS auc_marriage_cert, auc.spouse_name_change_doc,

      lr.borrower_id_card,
      lr.house_reg_book AS debtor_house_reg_book,
      lr.marriage_cert AS debtor_marriage_cert,
      lr.spouse_id_card AS debtor_spouse_id_card,
      lr.spouse_reg_copy AS debtor_spouse_reg_copy,
      lr.divorce_doc AS debtor_divorce_doc,
      lr.single_cert, lr.death_cert, lr.will_court_doc, lr.testator_house_reg,
      lr.deed_copy, lr.building_permit, lr.house_reg_prop,
      lr.sale_contract, lr.debt_free_cert, lr.blueprint,
      lr.property_photos, lr.land_tax_receipt, lr.maps_url,
      lr.condo_title_deed, lr.condo_location_map, lr.common_fee_receipt,
      lr.floor_plan, lr.location_sketch_map, lr.land_use_cert,
      lr.rental_contract, lr.business_reg,

      c.broker_contract_file AS issuing_broker_contract,
      c.broker_id_file       AS issuing_broker_id,
      c.transaction_slip, c.advance_slip,

      it.doc_selling_pledge  AS issuing_doc_selling_pledge,
      it.doc_mortgage        AS issuing_doc_mortgage,
      it.doc_sp_broker       AS issuing_doc_sp_broker,
      it.doc_sp_appendix     AS issuing_doc_sp_appendix,
      it.doc_sp_notice       AS issuing_doc_sp_notice,
      it.doc_mg_addendum     AS issuing_doc_mg_addendum,
      it.doc_mg_appendix     AS issuing_doc_mg_appendix,
      it.doc_mg_broker       AS issuing_doc_mg_broker
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN admin_users au ON au.id = c.assigned_sales_id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = c.loan_request_id
    LEFT JOIN auction_transactions auc ON auc.case_id = c.id
    LEFT JOIN issuing_transactions it ON it.case_id = c.id
    WHERE c.id = ?
  `
  const isAucTableError = (e) => e && (
    e.code === 'ER_NO_SUCH_TABLE' || e.code === 'ER_BAD_FIELD_ERROR' || e.errno === 1932
  )
  db.query(sql, [id], (err, results) => {
    if (isAucTableError(err)) {
      // Fallback: auction_transactions หาย → NULL AS แทน auc.* ทั้งหมด
      const sqlFallback = sql
        .replace('auc.house_reg_book AS auc_house_reg_book, auc.house_reg_book_legal,', 'NULL AS auc_house_reg_book, NULL AS house_reg_book_legal,')
        .replace('auc.name_change_doc, auc.divorce_doc AS auc_divorce_doc,', 'NULL AS name_change_doc, NULL AS auc_divorce_doc,')
        .replace('auc.spouse_consent_doc, auc.spouse_id_card AS auc_spouse_id_card, auc.spouse_reg_copy AS auc_spouse_reg_copy,', 'NULL AS spouse_consent_doc, NULL AS auc_spouse_id_card, NULL AS auc_spouse_reg_copy,')
        .replace('auc.marriage_cert AS auc_marriage_cert, auc.spouse_name_change_doc,', 'NULL AS auc_marriage_cert, NULL AS spouse_name_change_doc,')
        .replace('LEFT JOIN auction_transactions auc ON auc.case_id = c.id', '')
      return db.query(sqlFallback, [id], (err2, results2) => {
        if (err2) {
          console.error('getCaseById fallback error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        if (results2.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
        res.json({ success: true, caseData: results2[0] })
      })
    }
    if (err) {
      console.error('getCaseById error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
    const row = results[0]
    console.log(`[getCaseById] id=${id} rows=${results.length} issuing_doc_sp=${row.issuing_doc_selling_pledge} issuing_doc_mg=${row.issuing_doc_mortgage}`)
    res.json({ success: true, caseData: row })
  })
}

// ========== อัพเดทสถานะชำระ ใน loan_requests (ก่อนมีเคส — inline จาก DebtorsTab) ==========
// ========== อัพโหลดสลิปค่าประเมิน (ก่อนมีเคส — บันทึกใน loan_requests.slip_image) ==========
exports.uploadDebtorAppraisalSlip = (req, res) => {
  const { id } = req.params
  const files = req.files || {}
  if (!files['slip_image'] || files['slip_image'].length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่พบไฟล์สลิป' })
  }
  const slipPath = `uploads/slips/${files['slip_image'][0].filename}`
  db.query('UPDATE loan_requests SET slip_image = ? WHERE id = ?', [slipPath, id], (err) => {
    if (err) {
      console.error('uploadDebtorAppraisalSlip error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, slip_image: slipPath })
  })
}

// ========== อัพโหลดสลิปค่าหักล่วงหน้า (บันทึกลง loan_requests.advance_slip) ==========
exports.uploadDebtorAdvanceSlip = (req, res) => {
  const { id } = req.params
  const files = req.files || {}
  if (!files['advance_slip'] || files['advance_slip'].length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่พบไฟล์สลิป' })
  }
  const slipPath = `uploads/slips/${files['advance_slip'][0].filename}`
  db.query('UPDATE loan_requests SET advance_slip = ? WHERE id = ?', [slipPath, id], (err) => {
    if (err) {
      console.error('uploadDebtorAdvanceSlip error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, advance_slip: slipPath })
  })
}

// ========== ลบสลิปค่าหักล่วงหน้า (loan_requests.advance_slip) ==========
exports.deleteDebtorAdvanceSlip = (req, res) => {
  const { id } = req.params
  db.query('UPDATE loan_requests SET advance_slip = NULL WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('deleteDebtorAdvanceSlip error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true })
  })
}

// ========== อัพโหลดตารางผ่อนชำระ (ฝ่ายขาย) ==========
exports.uploadPaymentScheduleFile = (req, res) => {
  const { id } = req.params
  const files = req.files || {}
  if (!files['payment_schedule_file'] || files['payment_schedule_file'].length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ตารางผ่อนชำระ' })
  }
  const filePath = `uploads/payment-schedules/${files['payment_schedule_file'][0].filename}`
  db.query('UPDATE loan_requests SET payment_schedule_file = ? WHERE id = ?', [filePath, id], (err) => {
    if (err) {
      console.error('uploadPaymentScheduleFile error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, payment_schedule_file: filePath })
  })
}

// ========== ลบตารางผ่อนชำระ (ฝ่ายขาย) ==========
exports.deletePaymentScheduleFile = (req, res) => {
  const { id } = req.params
  db.query('UPDATE loan_requests SET payment_schedule_file = NULL WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('deletePaymentScheduleFile error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true })
  })
}

// ========== อัพเดทสถานะชำระ ใน loan_requests (ก่อนมีเคส — inline จาก DebtorsTab) ==========
exports.updateDebtorPaymentStatus = (req, res) => {
  const { id } = req.params
  const { payment_status } = req.body
  if (!['paid', 'unpaid'].includes(payment_status)) {
    return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' })
  }
  db.query('UPDATE loan_requests SET payment_status = ? WHERE id = ?', [payment_status, id], (err) => {
    if (err) {
      console.error('updateDebtorPaymentStatus error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true })
  })
}

// ========== อัพเดท Asset Screening ใน loan_requests ==========
exports.updateScreening = (req, res) => {
  const { id } = req.params
  const { ineligible_property, ineligible_reason, screening_status } = req.body
  const userId = req.user?.id || null
  db.query(
    `UPDATE loan_requests
     SET ineligible_property = ?,
         ineligible_reason   = ?,
         screening_status    = ?,
         screened_by_id      = ?,
         screened_at         = NOW()
     WHERE id = ?`,
    [
      ineligible_property ? 1 : 0,
      ineligible_reason || null,
      screening_status || null,
      userId,
      id
    ],
    (err) => {
      if (err) {
        console.error('updateScreening error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true })
    }
  )
}

// ========== อัพเดทประเภทสินเชื่อ (inline จาก CaseEditPage) ==========
exports.updateLoanType = (req, res) => {
  const { id } = req.params
  const { loan_type_detail } = req.body
  db.query('UPDATE loan_requests SET loan_type_detail = ? WHERE id = ?', [loan_type_detail || null, id], (err) => {
    if (err) {
      console.error('updateLoanType error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true })
  })
}

// ========== อัพเดทเคส (รองรับทุกฟิลด์ + อัพโหลดสลิป/เล่มประเมิน) ==========
exports.updateCaseStatus = (req, res) => {
  const { id } = req.params
  const body = req.body || {}
  const {
    status, pipeline_stage, payment_status, approved_amount, appraisal_fee,
    agent_id, loan_request_id, assigned_sales_id, note,
    appraisal_type, appraisal_result, appraisal_date, payment_date,
    transaction_date, transaction_time, transaction_land_office,
    transaction_note,
    broker_contract_signed, broker_contract_date,
    investor_marital_status, commission_paid, commission_amount,
    contact_email   // ★ อีเมลลูกหนี้ — เก็บที่ loan_requests
  } = body
  const recorder = req.user ? (req.user.full_name || req.user.username || 'ระบบ') : 'ระบบ'

  const fields = []
  const values = []

  if (status) { fields.push('status=?'); values.push(status) }
  if (pipeline_stage !== undefined) { fields.push('pipeline_stage=?'); values.push(pipeline_stage || 'chat') }
  if (payment_status) { fields.push('payment_status=?'); values.push(payment_status) }
  if (approved_amount !== undefined) { fields.push('approved_amount=?'); values.push(approved_amount || null) }
  if (appraisal_fee !== undefined) { fields.push('appraisal_fee=?'); values.push(appraisal_fee || 2900) }
  if (agent_id !== undefined) { fields.push('agent_id=?'); values.push(agent_id || null) }
  if (loan_request_id !== undefined) { fields.push('loan_request_id=?'); values.push(loan_request_id || null) }
  if (assigned_sales_id !== undefined) { fields.push('assigned_sales_id=?'); values.push(assigned_sales_id || null) }
  if (note !== undefined) { fields.push('note=?'); values.push(note || null) }

  if (appraisal_type !== undefined) { fields.push('appraisal_type=?'); values.push(appraisal_type || 'outside') }
  if (appraisal_result !== undefined) { fields.push('appraisal_result=?'); values.push(appraisal_result || null) }
  if (appraisal_date !== undefined) { fields.push('appraisal_date=?'); values.push(appraisal_date || null) }
  if (payment_date !== undefined) { fields.push('payment_date=?'); values.push(payment_date || null) }
  fields.push('recorded_by=?'); values.push(recorder)
  fields.push('recorded_at=?'); values.push(new Date())

  // ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
  if (transaction_date !== undefined) { fields.push('transaction_date=?'); values.push(transaction_date || null) }
  if (transaction_time !== undefined) { fields.push('transaction_time=?'); values.push(transaction_time || null) }
  if (transaction_land_office !== undefined) { fields.push('transaction_land_office=?'); values.push(transaction_land_office || null) }
  if (transaction_note !== undefined) { fields.push('transaction_note=?'); values.push(transaction_note || null) }
  if (transaction_date !== undefined || transaction_time !== undefined || transaction_land_office !== undefined || transaction_note !== undefined) {
    fields.push('transaction_recorded_by=?'); values.push(recorder)
    fields.push('transaction_recorded_at=?'); values.push(new Date())
  }

  const files = req.files || {}
  if (files['slip_image'] && files['slip_image'].length > 0) {
    const slipPath = `uploads/slips/${files['slip_image'][0].filename}`
    fields.push('slip_image=?')
    values.push(slipPath)
  }
  if (files['appraisal_book_image'] && files['appraisal_book_image'].length > 0) {
    const bookPath = `uploads/appraisal-books/${files['appraisal_book_image'][0].filename}`
    fields.push('appraisal_book_image=?')
    values.push(bookPath)
  }
  if (files['broker_contract_file'] && files['broker_contract_file'].length > 0) {
    // multer บันทึกไฟล์ไว้ใน uploads/contracts/broker/ แล้ว (ตาม upload.js)
    const contractPath = `uploads/contracts/broker/${files['broker_contract_file'][0].filename}`
    fields.push('broker_contract_file=?')
    values.push(contractPath)
  }
  if (files['broker_id_file'] && files['broker_id_file'].length > 0) {
    const idPath = `uploads/contracts/broker/${files['broker_id_file'][0].filename}`
    fields.push('broker_id_file=?')
    values.push(idPath)
  }
  if (broker_contract_signed !== undefined) { fields.push('broker_contract_signed=?'); values.push(broker_contract_signed == 1 ? 1 : 0) }
  if (broker_contract_date !== undefined) { fields.push('broker_contract_date=?'); values.push(broker_contract_date || null) }

  // ★ สลิปค่าคอมมิชชั่น
  if (files['commission_slip'] && files['commission_slip'].length > 0) {
    const commSlipPath = `uploads/slips/${files['commission_slip'][0].filename}`
    fields.push('commission_slip=?')
    values.push(commSlipPath)
  }

  // ★ สลิปโอนเงินค่าปากถุง (ฝ่ายขาย + นิติ + บัญชี มองเห็น)
  if (files['transaction_slip'] && files['transaction_slip'].length > 0) {
    const txSlipPath = `uploads/slips/${files['transaction_slip'][0].filename}`
    fields.push('transaction_slip=?')
    values.push(txSlipPath)
  } else if (body.transaction_slip_clear === '1') {
    fields.push('transaction_slip=?')
    values.push(null)
  }

  // ★ สลิปค่าหักล่วงหน้า
  if (files['advance_slip'] && files['advance_slip'].length > 0) {
    const advSlipPath = `uploads/slips/${files['advance_slip'][0].filename}`
    fields.push('advance_slip=?')
    values.push(advSlipPath)
  } else if (body.advance_slip_clear === '1') {
    fields.push('advance_slip=?')
    values.push(null)
  }

  // ★ ฟิลด์ใหม่: สถานะบุคคลนักลงทุน + ค่าคอมมิชชั่น
  if (investor_marital_status !== undefined) { fields.push('investor_marital_status=?'); values.push(investor_marital_status || null) }
  if (commission_paid !== undefined) { fields.push('commission_paid=?'); values.push(commission_paid == 1 ? 1 : 0) }
  if (commission_amount !== undefined) { fields.push('commission_amount=?'); values.push(commission_amount || null) }

  if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

  values.push(id)
  const sql = `UPDATE cases SET ${fields.join(', ')} WHERE id=?`
  db.query(sql, values, (err) => {
    if (err) {
      console.error('updateCaseStatus error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    // ===== sync contact_email → loan_requests =====
    if (contact_email !== undefined) {
      db.query('SELECT loan_request_id FROM cases WHERE id = ?', [id], (errLr, lrRows) => {
        if (!errLr && lrRows.length > 0 && lrRows[0].loan_request_id) {
          db.query('UPDATE loan_requests SET contact_email = ? WHERE id = ?',
            [contact_email || null, lrRows[0].loan_request_id], () => {})
        }
      })
    }

    // ===== AUTO-NOTIFY LEGAL เมื่อฝ่ายขายกำหนดวันโอน =====
    if (transaction_date) {
      const io = req.app.get('io')
      const userId = req.user ? req.user.id : null
      // ดึงข้อมูลเคสเพื่อสร้างข้อความแจ้งเตือน
      db.query(
        `SELECT c.loan_request_id, c.case_code, c.transaction_date, c.transaction_time, c.transaction_land_office
         FROM cases c WHERE c.id = ?`,
        [id],
        (errN, caseRows) => {
          if (errN || !caseRows || !caseRows.length) return
          const cRow = caseRows[0]
          if (!cRow.loan_request_id) return
          const dateStr = cRow.transaction_date
            ? new Date(cRow.transaction_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
            : ''
          const extra = [dateStr, cRow.transaction_time, cRow.transaction_land_office].filter(Boolean).join(' · ')
          notifyStatusChange(cRow.loan_request_id, parseInt(id), null, 'transaction_scheduled_to_legal', io, userId, extra)
          console.log(`[Auto-Notify Legal] เคส ${cRow.case_code} นัดวันโอน: ${extra}`)
        }
      )
    }

    // ===== sync loan_requests.status ให้ตรงกับ cases.status =====
    if (status) {
      const statusMap = {
        'pending_approve': 'reviewing',
        'incomplete': 'reviewing',
        'credit_approved': 'approved',
        'pending_auction': 'approved',
        'legal_scheduled': 'approved',
        'legal_completed': 'approved',
        'preparing_docs': 'matched',
        'completed': 'matched',
        'cancelled': 'cancelled'
      }
      const lrStatus = statusMap[status]
      if (lrStatus) {
        db.query('SELECT loan_request_id FROM cases WHERE id = ?', [id], (err2, rows) => {
          if (!err2 && rows.length > 0 && rows[0].loan_request_id) {
            db.query('UPDATE loan_requests SET status = ? WHERE id = ?', [lrStatus, rows[0].loan_request_id], () => {})

            // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) =====
            const io = req.app.get('io')
            const userId = req.user ? req.user.id : null
            notifyStatusChange(rows[0].loan_request_id, parseInt(id), null, status, io, userId)
          }
        })
      }

      // ===== Auto-Commission: คำนวณค่า commission อัตโนมัติเมื่อปิดเคส =====
      if (status === 'completed' || status === 'auction_completed') {
        db.query(
          `SELECT c.id, c.agent_id, c.approved_amount, c.case_code,
                  a.commission_rate, a.full_name AS agent_name
           FROM cases c
           LEFT JOIN agents a ON a.id = c.agent_id
           WHERE c.id = ?`,
          [id],
          (errC, caseRows) => {
            if (errC || !caseRows || !caseRows.length) return
            const c = caseRows[0]
            if (!c.agent_id || !c.commission_rate || !c.approved_amount) return
            // คำนวณ commission
            const commAmt = Math.round(Number(c.approved_amount) * (Number(c.commission_rate) / 100))
            if (commAmt <= 0) return
            const recordedBy = req.user ? (req.user.full_name || req.user.username || null) : null
            // ตรวจว่ามี record สำหรับ agent นี้ + case นี้แล้วหรือยัง
            db.query(
              `SELECT id, payment_status FROM agent_accounting WHERE agent_id = ? AND (case_id = ? OR case_id IS NULL) LIMIT 1`,
              [c.agent_id, parseInt(id)],
              (errE, existing) => {
                if (errE) return
                if (existing && existing.length > 0 && existing[0].payment_status !== 'paid') {
                  // อัพเดท record เดิม (ยังไม่จ่าย)
                  db.query(
                    `UPDATE agent_accounting
                     SET commission_amount = ?, case_id = ?, payment_status = 'pending',
                         recorded_by = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [commAmt, parseInt(id), recordedBy, existing[0].id],
                    () => console.log(`[AutoCommission] updated agent ${c.agent_id} case ${id} = ฿${commAmt}`)
                  )
                } else if (!existing || existing.length === 0) {
                  // สร้าง record ใหม่
                  db.query(
                    `INSERT INTO agent_accounting
                       (agent_id, case_id, commission_amount, payment_status, recorded_by, created_at)
                     VALUES (?, ?, ?, 'pending', ?, NOW())`,
                    [c.agent_id, parseInt(id), commAmt, recordedBy],
                    () => console.log(`[AutoCommission] created agent ${c.agent_id} case ${id} = ฿${commAmt}`)
                  )
                }
              }
            )
          }
        )
      }
      // ===== /Auto-Commission =====
    }

    res.json({ success: true, message: 'อัพเดทเคสสำเร็จ' })
  })
}

// ========== ดึงข้อมูลลูกหนี้ตาม ID (พร้อมนายหน้าทุกคนที่เชื่อมผ่านเคส) ==========
exports.getDebtorById = (req, res) => {
  const { id } = req.params

  // ดึงข้อมูลลูกหนี้
  db.query('SELECT * FROM loan_requests WHERE id = ?', [id], (err, lrRows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (lrRows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })

    var debtor = lrRows[0]

    // ดึงเคสทั้งหมดของลูกหนี้คนนี้ (1 ลูกหนี้มีได้หลายเคส, แต่ละเคสอาจมีนายหน้าต่างกัน)
    const caseQueryFull = `SELECT c.id AS case_id, c.case_code, c.status AS case_status,
              c.pipeline_stage,
              c.payment_status, c.approved_amount, c.agent_id,
              c.slip_image AS case_slip_image,
              c.broker_contract_signed, c.broker_contract_date, c.broker_contract_file, c.broker_id_file,
              lr.appraisal_book_image, lr.appraisal_result, lr.appraisal_type,
              lr.check_price_value, lr.outside_result, lr.inside_result,
              a.agent_code, a.full_name AS agent_name, a.phone AS agent_phone,
              a.nickname AS agent_nickname, a.commission_rate,
              at2.credit_table_file, at2.approved_credit,
              at2.approval_status, at2.interest_per_year, at2.operation_fee,
              CAST(COALESCE(at2.payment_schedule_approved, 0) AS SIGNED) AS payment_schedule_approved,
              at2.payment_schedule_approved_at,
              at2.approval_schedule_file,
              c.broker_contract_file AS issuing_broker_contract,
              c.broker_id_file       AS issuing_broker_id,
              it.doc_selling_pledge  AS issuing_doc_selling_pledge,
              it.doc_mortgage        AS issuing_doc_mortgage,
              it.doc_sp_broker       AS issuing_doc_sp_broker,
              it.doc_sp_appendix     AS issuing_doc_sp_appendix,
              it.doc_sp_notice       AS issuing_doc_sp_notice,
              it.doc_mg_addendum     AS issuing_doc_mg_addendum,
              it.doc_mg_appendix     AS issuing_doc_mg_appendix,
              it.doc_mg_broker       AS issuing_doc_mg_broker
       FROM cases c
       LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
       LEFT JOIN agents a ON a.id = c.agent_id
       LEFT JOIN approval_transactions at2 ON at2.id = (SELECT id FROM approval_transactions WHERE loan_request_id = c.loan_request_id ORDER BY id DESC LIMIT 1)
       LEFT JOIN issuing_transactions it ON it.case_id = c.id
       WHERE c.loan_request_id = ?
       ORDER BY c.created_at DESC`
    const caseQueryNoSchedule = `SELECT c.id AS case_id, c.case_code, c.status AS case_status,
              c.pipeline_stage,
              c.payment_status, c.approved_amount, c.agent_id,
              c.slip_image AS case_slip_image,
              c.broker_contract_signed, c.broker_contract_date, c.broker_contract_file, c.broker_id_file,
              lr.appraisal_book_image, lr.appraisal_result, lr.appraisal_type,
              lr.check_price_value, lr.outside_result, lr.inside_result,
              a.agent_code, a.full_name AS agent_name, a.phone AS agent_phone,
              a.nickname AS agent_nickname, a.commission_rate,
              at2.credit_table_file, at2.approved_credit,
              at2.approval_status, at2.interest_per_year, at2.operation_fee,
              CAST(0 AS SIGNED) AS payment_schedule_approved,
              NULL AS payment_schedule_approved_at,
              NULL AS approval_schedule_file,
              c.broker_contract_file AS issuing_broker_contract,
              c.broker_id_file       AS issuing_broker_id,
              it.doc_selling_pledge  AS issuing_doc_selling_pledge,
              it.doc_mortgage        AS issuing_doc_mortgage,
              it.doc_sp_broker       AS issuing_doc_sp_broker,
              it.doc_sp_appendix     AS issuing_doc_sp_appendix,
              it.doc_sp_notice       AS issuing_doc_sp_notice,
              it.doc_mg_addendum     AS issuing_doc_mg_addendum,
              it.doc_mg_appendix     AS issuing_doc_mg_appendix,
              it.doc_mg_broker       AS issuing_doc_mg_broker
       FROM cases c
       LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
       LEFT JOIN agents a ON a.id = c.agent_id
       LEFT JOIN approval_transactions at2 ON at2.id = (SELECT id FROM approval_transactions WHERE loan_request_id = c.loan_request_id ORDER BY id DESC LIMIT 1)
       LEFT JOIN issuing_transactions it ON it.case_id = c.id
       WHERE c.loan_request_id = ?
       ORDER BY c.created_at DESC`
    db.query(caseQueryFull, [id], (err2, caseRows) => {
      if (err2) {
        console.error(`[salesController.getDebtorById] full case query failed (id=${id}):`, err2.message)
        // fallback: ไม่มี payment_schedule_approved / approval_schedule_file columns
        db.query(caseQueryNoSchedule, [id], (err3, caseRows2) => {
          if (err3) {
            console.error(`[salesController.getDebtorById] fallback case query failed:`, err3.message)
            caseRows = []
          } else {
            caseRows = caseRows2 || []
          }
          processCaseRows(caseRows)
        })
        return
      }
      processCaseRows(caseRows || [])
    })

    function processCaseRows(caseRows) {
        console.log(`[salesDebug] id=${id} caseRows.length=${caseRows?.length} latestCase.payment_schedule_approved=${caseRows?.[0]?.payment_schedule_approved} (type=${typeof caseRows?.[0]?.payment_schedule_approved})`)

        // ย้อนกลับได้: ใส่ case_id, agent ของเคสล่าสุดไว้ใน debtor ด้วย (backward compatible)
        var latestCase = (caseRows && caseRows.length > 0) ? caseRows[0] : {}
        debtor.case_id = latestCase.case_id || null
        debtor.case_code = latestCase.case_code || null
        debtor.case_status = latestCase.case_status || null
        debtor.payment_status = latestCase.payment_status || null
        debtor.credit_table_file = latestCase.credit_table_file || null
        debtor.approved_credit = latestCase.approved_credit || null
        debtor.approval_status = latestCase.approval_status || null
        debtor.interest_per_year = latestCase.interest_per_year || null
        debtor.operation_fee = latestCase.operation_fee || null
        debtor.payment_schedule_approved = Number(latestCase.payment_schedule_approved ?? 0)
        debtor.payment_schedule_approved_at = latestCase.payment_schedule_approved_at || null
        debtor.approval_schedule_file = latestCase.approval_schedule_file || null
        debtor.case_slip_image = latestCase.case_slip_image || null
        debtor.broker_contract_signed = latestCase.broker_contract_signed || 0
        debtor.broker_contract_date = latestCase.broker_contract_date || null
        debtor.broker_contract_file = latestCase.broker_contract_file || null
        debtor.broker_id_file = latestCase.broker_id_file || null
        debtor.issuing_broker_contract = latestCase.issuing_broker_contract || null
        debtor.issuing_broker_id = latestCase.issuing_broker_id || null
        debtor.issuing_doc_selling_pledge = latestCase.issuing_doc_selling_pledge || null
        debtor.issuing_doc_mortgage = latestCase.issuing_doc_mortgage || null
        debtor.issuing_doc_sp_broker = latestCase.issuing_doc_sp_broker || null
        debtor.issuing_doc_sp_appendix = latestCase.issuing_doc_sp_appendix || null
        debtor.issuing_doc_sp_notice = latestCase.issuing_doc_sp_notice || null
        debtor.issuing_doc_mg_addendum = latestCase.issuing_doc_mg_addendum || null
        debtor.issuing_doc_mg_appendix = latestCase.issuing_doc_mg_appendix || null
        debtor.issuing_doc_mg_broker = latestCase.issuing_doc_mg_broker || null

        // agent_id: ใช้จากเคสล่าสุดก่อน, fallback เป็น loan_requests.agent_id (กรณียังไม่มีเคส)
        var caseAgentId = latestCase.agent_id || null
        debtor.agent_id = caseAgentId || debtor.agent_id || null
        debtor.agent_code = latestCase.agent_code || null
        debtor.agent_name = latestCase.agent_name || null
        debtor.agent_phone = latestCase.agent_phone || null
        debtor.agent_nickname = latestCase.agent_nickname || null
        debtor.commission_rate = latestCase.commission_rate || null

        // ===== ฟังก์ชันส่ง response สุดท้าย =====
        const sendResponse = () => {
          // ถ้าไม่มีเคส แต่มี agent_id ใน loan_requests → ดึงข้อมูลนายหน้า
          if (!caseAgentId && debtor.agent_id) {
            db.query('SELECT id, agent_code, full_name, phone, nickname, commission_rate FROM agents WHERE id = ?', [debtor.agent_id], function(errA, agentRows) {
              if (!errA && agentRows && agentRows.length > 0) {
                var ag = agentRows[0]
                debtor.agent_code = ag.agent_code
                debtor.agent_name = ag.full_name
                debtor.agent_phone = ag.phone
                debtor.agent_nickname = ag.nickname
                debtor.commission_rate = ag.commission_rate
              }
              return res.json({ success: true, debtor: debtor, linked_cases: caseRows || [] })
            })
            return
          }
          res.json({ success: true, debtor: debtor, linked_cases: caseRows || [] })
        }

        // ===== ถ้ายังไม่มี credit_table_file หรือ payment_schedule_approved จาก case → ดึงจาก approval_transactions ตรงๆ =====
        // กรณีไม่มี case (caseRows=[]) จะเข้าที่นี่เสมอ
        if (!debtor.credit_table_file || !debtor.approved_credit || debtor.payment_schedule_approved === 0) {
          db.query(
            `SELECT credit_table_file, approved_credit, approval_status, interest_per_year, operation_fee,
                    CAST(COALESCE(payment_schedule_approved, 0) AS SIGNED) AS payment_schedule_approved,
                    payment_schedule_approved_at, approval_schedule_file
             FROM approval_transactions WHERE loan_request_id = ? ORDER BY id DESC LIMIT 1`,
            [id],
            (errAt, atRows) => {
              if (!errAt && atRows && atRows.length > 0) {
                if (!debtor.credit_table_file) debtor.credit_table_file = atRows[0].credit_table_file || null
                if (!debtor.approved_credit) debtor.approved_credit = atRows[0].approved_credit || null
                if (!debtor.approval_status) debtor.approval_status = atRows[0].approval_status || null
                if (!debtor.interest_per_year) debtor.interest_per_year = atRows[0].interest_per_year || null
                if (!debtor.operation_fee) debtor.operation_fee = atRows[0].operation_fee || null
                // ★ ดึง payment schedule approval ตรงจาก approval_transactions เสมอ
                debtor.payment_schedule_approved = Number(atRows[0].payment_schedule_approved ?? 0)
                debtor.payment_schedule_approved_at = atRows[0].payment_schedule_approved_at || null
                debtor.approval_schedule_file = atRows[0].approval_schedule_file || null
              }
              sendResponse()
            }
          )
        } else {
          sendResponse()
        }
    } // end processCaseRows
  })
}

// ========== แก้ไขลูกหนี้ (รองรับ FormData + อัพโหลดไฟล์ใหม่) ==========
exports.updateDebtor = (req, res) => {
  const { id } = req.params
  const body = req.body || {}
  const {
    source, lead_source, dead_reason, reject_category, reject_alternative,
    contact_name, contact_phone, contact_email, contact_line, contact_facebook,
    preferred_contact, property_type, loan_type, loan_type_detail,
    property_address, province, district, subdistrict,
    house_no, village_name, additional_details,
    land_area, building_area, road_access, road_width, seizure_status, utility_access, flood_risk, estimated_value,
    interest_rate, desired_amount, loan_amount, loan_duration, admin_note,
    occupation, monthly_income, loan_purpose, marital_status, contract_years, net_desired_amount, advance_months,
    has_obligation, obligation_count,
    customer_gender, customer_age, existing_debt,
    location_url, deed_number, deed_type, preliminary_terms, agent_id,
    appraisal_date, appraisal_fee, appraisal_type,
    payment_date,
    bedrooms, bathrooms, floors, project_name, building_year, rental_rooms, rental_price_per_month
  } = body

  // ไม่บังคับกรอกช่องใดๆ

  db.query('SELECT images, deed_images FROM loan_requests WHERE id = ?', [id], (err0, rows) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })

    let existingImages = []
    let existingDeedImages = []
    try { existingImages = JSON.parse(rows[0].images) || [] } catch { existingImages = [] }
    try { existingDeedImages = JSON.parse(rows[0].deed_images) || [] } catch { existingDeedImages = [] }

    const files = req.files || {}
    const newImagePaths = [...existingImages]
    if (files['id_card_image']) {
      files['id_card_image'].forEach(f => newImagePaths.push(`uploads/id-cards/${f.filename}`))
    }
    if (files['property_image']) {
      files['property_image'].forEach(f => newImagePaths.push(`uploads/properties/${f.filename}`))
    }
    if (files['building_permit']) {
      files['building_permit'].forEach(f => newImagePaths.push(`uploads/permits/${f.filename}`))
    }
    if (files['property_video']) {
      files['property_video'].forEach(f => newImagePaths.push(`uploads/videos/${f.filename}`))
    }
    const imagesJson = newImagePaths.length > 0 ? JSON.stringify(newImagePaths) : null

    const newDeedPaths = [...existingDeedImages]
    if (files['deed_image']) {
      files['deed_image'].forEach(f => newDeedPaths.push(`uploads/deeds/${f.filename}`))
    }
    const deedImagesJson = newDeedPaths.length > 0 ? JSON.stringify(newDeedPaths) : null

    const sql = `
      UPDATE loan_requests SET
        source=?, lead_source=?, dead_reason=?, reject_category=?, reject_alternative=?,
        contact_name=?, contact_phone=?, contact_email=?, contact_line=?, contact_facebook=?,
        preferred_contact=?, property_type=?, loan_type=?, loan_type_detail=?,
        property_address=?, province=?, district=?, subdistrict=?,
        house_no=?, village_name=?, additional_details=?,
        land_area=?, building_area=?, road_access=?, road_width=?, seizure_status=?, utility_access=?, flood_risk=?, estimated_value=?,
        interest_rate=?, desired_amount=?,
        loan_amount=?, loan_duration=?, admin_note=?,
        occupation=?, monthly_income=?, loan_purpose=?, marital_status=?, contract_years=?, net_desired_amount=?, advance_months=?,
        has_obligation=?, obligation_count=?,
        customer_gender=?, customer_age=?, existing_debt=?,
        location_url=?, deed_number=?, deed_type=?, preliminary_terms=?,
        images=?, deed_images=?,
        agent_id=?,
        appraisal_date=?, appraisal_fee=?, appraisal_type=?,
        payment_date=?,
        prop_checklist_json=?,
        bedrooms=?, bathrooms=?, floors=?, project_name=?, building_year=?, rental_rooms=?, rental_price_per_month=?
      WHERE id=?
    `
    const params = [
      source || null, lead_source || null, dead_reason || null,
      reject_category || null, reject_alternative || null,
      contact_name || null, contact_phone || null,
      contact_email || null, contact_line || null, contact_facebook || null, preferred_contact || 'phone',
      property_type || null, loan_type || null, loan_type_detail || null,
      property_address || '', province || '',
      district || null, subdistrict || null,
      house_no || null, village_name || null, additional_details || null,
      land_area || null, building_area || null,
      road_access || null, road_width || null, seizure_status || null, utility_access || null, flood_risk || null,
      estimated_value || null,
      interest_rate || null, desired_amount || null,
      loan_amount || 0, loan_duration || 12, admin_note || null,
      occupation || null, monthly_income || null, loan_purpose || null,
      marital_status || null, contract_years || null, net_desired_amount || null, advance_months || null,
      has_obligation || 'no', obligation_count || null,
      customer_gender || null, customer_age || null, existing_debt || null,
      location_url || null, deed_number || null, deed_type || null, preliminary_terms || null,
      imagesJson, deedImagesJson,
      agent_id || null,
      appraisal_date || null,
      appraisal_fee || null,
      appraisal_type || 'outside',
      payment_date || null,
      body.prop_checklist_json || null,
      bedrooms || null,
      bathrooms || null,
      floors || null,
      project_name || null,
      building_year || null,
      rental_rooms || null,
      rental_price_per_month || null,
      id
    ]

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('updateDebtor error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })

      // ===== แจ้งเตือนตาม checkbox ที่ฝ่ายขายติ๊ก (ใช้ได้ทั้ง create และ edit) =====
      try {
        const io = req.app.get('io')
        const userId = req.user ? req.user.id : null
        const contactName = req.body.contact_name || ''
        if (req.body.notify_appraisal === '1') {
          notifyStatusChange(parseInt(id), null, null, 'new_from_admin', io, userId, contactName)
        }
        if (req.body.notify_approval === '1') {
          notifyStatusChange(parseInt(id), null, null, 'new_from_admin_to_approval', io, userId, contactName)
        }
        if (req.body.notify_legal === '1') {
          notifyStatusChange(parseInt(id), null, null, 'new_from_admin_to_legal', io, userId, contactName)
        }
        // แจ้งเตือนเมื่อบันทึกเหตุผลปฏิเสธใหม่
        if (req.body.notify_rejected === '1' && req.body.reject_category) {
          notifyStatusChange(parseInt(id), null, null, 'debtor_rejected', io, userId, contactName)
        }
      } catch (notifErr) {
        console.error('updateDebtor notify error:', notifErr.message)
      }

      res.json({ success: true, message: 'อัพเดทข้อมูลลูกหนี้สำเร็จ' })
    })
  })
}

// ========== บันทึก prop_checklist_json (auto-save จากหน้า SalesFormPage) ==========
exports.savePropChecklist = (req, res) => {
  const { id } = req.params
  const { prop_checklist_json } = req.body
  if (!id) return res.status(400).json({ success: false, message: 'Missing id' })
  db.query(
    'UPDATE loan_requests SET prop_checklist_json = ? WHERE id = ?',
    [prop_checklist_json || null, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      res.json({ success: true })
    }
  )
}

// ========== ลบรูปทีละรูปจาก JSON array (loan_requests) ==========
exports.removeDebtorImage = (req, res) => {
  const { debtor_id, field, image_path } = req.body

  if (!['images', 'deed_images'].includes(field)) {
    return res.status(400).json({ success: false, message: 'Field not allowed' })
  }
  if (!debtor_id || !image_path) {
    return res.status(400).json({ success: false, message: 'Missing debtor_id or image_path' })
  }

  db.query(`SELECT ${field} FROM loan_requests WHERE id = ?`, [debtor_id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกหนี้' })

    let arr = []
    try { arr = JSON.parse(rows[0][field]) || [] } catch { arr = [] }

    const newArr = arr.filter(p => p !== image_path)
    const newJson = newArr.length > 0 ? JSON.stringify(newArr) : null

    db.query(`UPDATE loan_requests SET ${field} = ? WHERE id = ?`, [newJson, debtor_id], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: 'Server Error' })

      const fullPath = path.join(__dirname, '..', image_path)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        console.log('Deleted file:', fullPath)
      }

      res.json({ success: true, message: 'ลบรูปสำเร็จ' })
    })
  })
}

// ========== อัพโหลดรูปลูกหนี้เพิ่ม (ใช้จาก CaseEditPage) ==========
exports.uploadDebtorImages = (req, res) => {
  const { id } = req.params
  const files = req.files || {}

  if (Object.keys(files).length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่มีไฟล์ที่อัพโหลด' })
  }

  db.query('SELECT images, deed_images FROM loan_requests WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบลูกหนี้' })

    let existingImages = []
    let existingDeedImages = []
    try { existingImages = JSON.parse(rows[0].images) || [] } catch { existingImages = [] }
    try { existingDeedImages = JSON.parse(rows[0].deed_images) || [] } catch { existingDeedImages = [] }

    const newImagePaths = [...existingImages]
    if (files['id_card_image']) {
      files['id_card_image'].forEach(f => newImagePaths.push(`uploads/id-cards/${f.filename}`))
    }
    if (files['property_image']) {
      files['property_image'].forEach(f => newImagePaths.push(`uploads/properties/${f.filename}`))
    }
    if (files['building_permit']) {
      files['building_permit'].forEach(f => newImagePaths.push(`uploads/permits/${f.filename}`))
    }
    if (files['property_video']) {
      files['property_video'].forEach(f => newImagePaths.push(`uploads/videos/${f.filename}`))
    }
    const imagesJson = newImagePaths.length > 0 ? JSON.stringify(newImagePaths) : null

    const newDeedPaths = [...existingDeedImages]
    if (files['deed_image']) {
      files['deed_image'].forEach(f => newDeedPaths.push(`uploads/deeds/${f.filename}`))
    }
    const deedImagesJson = newDeedPaths.length > 0 ? JSON.stringify(newDeedPaths) : null

    db.query('UPDATE loan_requests SET images = ?, deed_images = ? WHERE id = ?',
      [imagesJson, deedImagesJson, id], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
        res.json({ success: true, images: imagesJson, deed_images: deedImagesJson })
      }
    )
  })
}

// ========== Helper: ลบไฟล์จาก JSON path array ==========
function deleteFiles(jsonStr) {
  if (!jsonStr) return
  try {
    const paths = JSON.parse(jsonStr)
    if (!Array.isArray(paths)) return
    paths.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', filePath)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        console.log('Deleted file:', fullPath)
      }
    })
  } catch (e) {
    console.error('deleteFiles error:', e.message)
  }
}

// ========== ลบลูกหนี้ (cascade: ลบเคสที่ผูกอยู่ทั้งหมดก่อน แล้วค่อยลบลูกหนี้) ==========
exports.deleteDebtor = (req, res) => {
  const { id } = req.params

  // ดึง loan_request เพื่อเอา images + deed_images
  db.query('SELECT images, deed_images FROM loan_requests WHERE id = ?', [id], (err0, rows) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })

    const { images, deed_images } = rows[0]

    // ดึง case id ทั้งหมดที่ผูกกับลูกหนี้นี้
    db.query('SELECT id FROM cases WHERE loan_request_id = ?', [id], (err1, caseRows) => {
      if (err1) return res.status(500).json({ success: false, message: 'Server Error' })

      const caseIds = caseRows.map(c => c.id)

      const doDeleteDebtor = () => {
        db.query('DELETE FROM loan_requests WHERE id = ?', [id], (err2, result) => {
          if (err2) return res.status(500).json({ success: false, message: 'Server Error: ' + err2.message })
          if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })
          deleteFiles(images)
          deleteFiles(deed_images)
          res.json({ success: true, message: 'ลบลูกหนี้และข้อมูลที่เกี่ยวข้องสำเร็จ' })
        })
      }

      if (caseIds.length === 0) {
        // ไม่มีเคส → ลบลูกหนี้ได้เลย
        return doDeleteDebtor()
      }

      // ลบ case_cancellations ของเคสทั้งหมดก่อน (FK ไม่มี CASCADE)
      db.query('DELETE FROM case_cancellations WHERE case_id IN (?)', [caseIds], (errCC) => {
        if (errCC) console.error('deleteDebtor: case_cancellations cleanup error:', errCC.message)

        // ลบ cases ทั้งหมด (FK อื่นๆ ส่วนใหญ่มี ON DELETE CASCADE แล้ว)
        db.query('DELETE FROM cases WHERE loan_request_id = ?', [id], (err3) => {
          if (err3) return res.status(500).json({ success: false, message: 'ลบเคสที่ผูกอยู่ไม่สำเร็จ: ' + err3.message })
          doDeleteDebtor()
        })
      })
    })
  })
}

// ========== ลบเคส (พร้อมลบรูปสลิป + เล่มประเมิน) ==========
exports.deleteCase = (req, res) => {
  const { id } = req.params

  db.query('SELECT slip_image, appraisal_book_image, loan_request_id FROM cases WHERE id = ?', [id], (err0, rows) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })

    const { slip_image, appraisal_book_image, loan_request_id } = rows[0]

    // ลบ FK ที่ไม่มี ON DELETE CASCADE ก่อน เพื่อป้องกัน FK constraint error
    db.query('DELETE FROM case_cancellations WHERE case_id = ?', [id], (errPre) => {
      if (errPre) console.error('deleteCase: case_cancellations cleanup error:', errPre.message)

      db.query('DELETE FROM cases WHERE id = ?', [id], (err1, result) => {
        if (err1) return res.status(500).json({ success: false, message: 'Server Error: ' + err1.message })
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })

        if (slip_image) {
          const fullPath = path.join(__dirname, '..', slip_image)
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
        }
        if (appraisal_book_image) {
          const fullPath = path.join(__dirname, '..', appraisal_book_image)
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
        }

        if (loan_request_id) {
          db.query('UPDATE loan_requests SET status = ? WHERE id = ?', ['pending', loan_request_id])
        }

        res.json({ success: true, message: 'ลบเคสและไฟล์ที่เกี่ยวข้องสำเร็จ' })
      })
    })
  })
}

// ========== สถิติฝ่ายขาย ==========
exports.getSalesStats = (req, res) => {
  const sql = `
    SELECT
      SUM(CASE WHEN status = 'pending_approve' THEN 1 ELSE 0 END) AS pending_approve,
      SUM(CASE WHEN status = 'incomplete' THEN 1 ELSE 0 END) AS incomplete,
      SUM(CASE WHEN status = 'pending_auction' THEN 1 ELSE 0 END) AS pending_auction,
      SUM(CASE WHEN status = 'preparing_docs' THEN 1 ELSE 0 END) AS preparing_docs,
      SUM(CASE WHEN status = 'legal_completed' THEN 1 ELSE 0 END) AS legal_completed,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(approved_amount), 0) AS total_approved,
      (SELECT COUNT(*) FROM loan_requests) AS total_debtors,
      (SELECT COUNT(*) FROM agents) AS total_agents
    FROM cases
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getSalesStats error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== Auto-matching: ค้นหาคู่ลูกหนี้-นายหน้าจากเบอร์โทร/ชื่อ ==========
exports.findMatch = (req, res) => {
  const { type, phone, name } = req.query

  if (!phone && !name) {
    return res.json({ success: true, matches: [] })
  }

  var sql, params

  if (type === 'agent') {
    // ค้นหานายหน้าที่ match กับลูกหนี้
    sql = `SELECT id, agent_code, full_name, phone, nickname, commission_rate
           FROM agents WHERE 1=1`
    params = []
    if (phone) { sql += ' AND phone = ?'; params.push(phone) }
    if (name) { sql += ' AND (full_name LIKE ? OR nickname LIKE ?)'; params.push('%' + name + '%', '%' + name + '%') }
    sql += ' LIMIT 10'
  } else {
    // ค้นหาลูกหนี้ที่ match กับนายหน้า
    sql = `SELECT id, debtor_code, contact_name, contact_phone, property_type, province
           FROM loan_requests WHERE 1=1`
    params = []
    if (phone) { sql += ' AND contact_phone = ?'; params.push(phone) }
    if (name) { sql += ' AND contact_name LIKE ?'; params.push('%' + name + '%') }
    sql += ' LIMIT 10'
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    res.json({ success: true, matches: rows || [] })
  })
}
// ========== เอกสาร Checklist (ฝ่ายขายอัพโหลดไปที่ auction_transactions) ==========
const CHECKLIST_DOC_FIELDS = [
  // Marital status checklist fields
  'house_reg_book','name_change_doc','divorce_doc',
  'spouse_id_card','spouse_reg_copy','marriage_cert',
  'borrower_id_card','single_cert','death_cert','will_court_doc','testator_house_reg',
  // Property type checklist fields (house/townhouse/single_house)
  'deed_copy','building_permit','house_reg_prop','sale_contract','debt_free_cert',
  'blueprint','property_photos','land_tax_receipt','maps_url',
  // Condo
  'condo_title_deed','condo_location_map','common_fee_receipt','floor_plan',
  // Land
  'location_sketch_map','land_use_cert',
  // Shophouse
  'rental_contract','business_reg',
  // วีดีโอทรัพย์ (ทุกประเภท)
  'property_video',
]

exports.getChecklistDocs = (req, res) => {
  const { lrId } = req.params
  // Use SELECT * to avoid failing when some columns don't exist yet
  db.query(`SELECT * FROM loan_requests WHERE id = ?`, [lrId], (err, rows) => {
    if (err) return res.status(500).json({ success: false })
    if (!rows || rows.length === 0) return res.json({ success: true, docs: {} })
    const docs = {}
    CHECKLIST_DOC_FIELDS.forEach(f => {
      const val = rows[0][f]
      if (val === undefined) { docs[f] = []; return } // column doesn't exist yet
      try { docs[f] = JSON.parse(val || '[]') || [] } catch { docs[f] = [] }
    })
    res.json({ success: true, docs })
  })
}

exports.uploadChecklistDoc = (req, res) => {
  const { lrId } = req.params
  const files = req.files || {}
  const uploadedField = Object.keys(files).find(k => CHECKLIST_DOC_FIELDS.includes(k))
  if (!uploadedField) return res.status(400).json({ success: false, message: 'ไม่พบฟิลด์ที่ถูกต้อง' })
  // คำนวณ path จาก destination จริงที่ multer บันทึก (ไม่ hardcode folder)
  const nodePath = require('path')
  const serverDir = nodePath.join(__dirname, '..')
  const newPaths = files[uploadedField].map(f => {
    const absPath = nodePath.join(f.destination, f.filename)
    return nodePath.relative(serverDir, absPath).replace(/\\/g, '/')
  })
  db.query(`SELECT \`${uploadedField}\` FROM loan_requests WHERE id = ?`, [lrId], (err, rows) => {
    if (err) return res.status(500).json({ success: false })
    let existing = []
    try { existing = JSON.parse(rows[0]?.[uploadedField] || '[]') || [] } catch {}
    const merged = [...existing, ...newPaths]
    db.query(`UPDATE loan_requests SET \`${uploadedField}\` = ? WHERE id = ?`,
      [JSON.stringify(merged), lrId], (err2) => {
        if (err2) return res.status(500).json({ success: false })
        res.json({ success: true, field: uploadedField, paths: merged })
      })
  })
}

exports.removeChecklistDoc = (req, res) => {
  const { lrId } = req.params
  // support both 'file_path' (old) and 'filePath' (new frontend)
  const { field } = req.body
  const file_path = req.body.file_path || req.body.filePath
  if (!CHECKLIST_DOC_FIELDS.includes(field)) return res.status(400).json({ success: false })
  db.query(`SELECT \`${field}\` FROM loan_requests WHERE id = ?`, [lrId], (err, rows) => {
    if (err) return res.status(500).json({ success: false })
    let existing = []
    try { existing = JSON.parse(rows[0]?.[field] || '[]') || [] } catch {}
    const filtered = existing.filter(p => p !== file_path)
    db.query(`UPDATE loan_requests SET \`${field}\` = ? WHERE id = ?`,
      [JSON.stringify(filtered), lrId], (err2) => {
        if (err2) return res.status(500).json({ success: false })
        res.json({ success: true, field, paths: filtered })
      })
  })
}

// ========== Checklist Ticks (ติ๊กเอกสารโดยไม่ต้องอัพโหลด) ==========
exports.getChecklistTicks = (req, res) => {
  const { lrId } = req.params
  // SELECT * ป้องกัน error กรณี column ยังไม่ถูก migrate ใน DB บางเวอร์ชัน
  db.query('SELECT * FROM loan_requests WHERE id = ?', [lrId], (err, rows) => {
    if (err) return res.status(500).json({ success: false })
    if (!rows || rows.length === 0) return res.json({ success: true, ticks: {} })
    const row = rows[0]
    // โหลด checklist_ticks_json (marital ticks จากทุกฝ่าย)
    let ticks = {}
    try { ticks = JSON.parse(row.checklist_ticks_json || '{}') || {} } catch {}
    // Merge prop_checklist_json (tick ทรัพย์จากฝ่ายขาย) ถ้ามี column — key true = ติ๊กแล้ว
    if (row.prop_checklist_json !== undefined) {
      let propTicks = {}
      try { propTicks = JSON.parse(row.prop_checklist_json || '{}') || {} } catch {}
      Object.entries(propTicks).forEach(([k, v]) => { if (v) ticks[k] = true })
    }
    res.json({ success: true, ticks })
  })
}

exports.saveChecklistTick = (req, res) => {
  const { lrId } = req.params
  const { field, checked } = req.body
  if (!field) return res.status(400).json({ success: false, message: 'Missing field' })
  db.query('SELECT checklist_ticks_json FROM loan_requests WHERE id = ?', [lrId], (err, rows) => {
    if (err) return res.status(500).json({ success: false })
    let ticks = {}
    try { ticks = JSON.parse(rows[0]?.checklist_ticks_json || '{}') || {} } catch {}
    if (checked) ticks[field] = true
    else delete ticks[field]
    db.query('UPDATE loan_requests SET checklist_ticks_json = ? WHERE id = ?',
      [JSON.stringify(ticks), lrId], (err2) => {
        if (err2) return res.status(500).json({ success: false })
        res.json({ success: true, ticks })
      })
  })
}

// ========== Transfer Case: โอนเคส/ลูกหนี้ไปให้เซลล์คนอื่น ==========

// ดึงรายชื่อเซลล์ที่ active ทั้งหมด (สำหรับ dropdown Transfer Case)
exports.getSalesUsers = (req, res) => {
  db.query(
    "SELECT id, username, full_name, nickname, phone FROM admin_users WHERE department = 'sales' AND status = 'active' ORDER BY full_name ASC",
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true, sales_users: rows })
    }
  )
}

// โอนเคส (cases.assigned_sales_id + chat_conversations.assigned_to) + บันทึกลง case_transfer_log + socket notification
exports.transferCase = (req, res) => {
  const { caseId } = req.params
  const { to_sales_id, reason } = req.body
  const transferred_by = req.user ? req.user.id : null
  const io = req.app.get('io') // Socket.io instance

  if (!to_sales_id) return res.status(400).json({ success: false, message: 'กรุณาเลือกเซลล์ที่ต้องการโอน' })

  // ดึงข้อมูลเคสปัจจุบัน
  db.query(
    `SELECT c.id, c.assigned_sales_id, c.loan_request_id, c.case_code,
            lr.contact_name AS customer_name,
            u.full_name AS from_sales_name, u.id AS from_sales_id
     FROM cases c
     LEFT JOIN admin_users u ON u.id = c.assigned_sales_id
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     WHERE c.id = ?`,
    [caseId],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบเคส' })

      const currentCase = rows[0]

      // ห้ามโอนให้ตัวเอง
      if (parseInt(to_sales_id) === currentCase.from_sales_id) {
        return res.status(400).json({ success: false, message: 'ไม่สามารถโอนให้ตัวเองได้' })
      }

      // ดึงข้อมูลเซลล์ใหม่
      db.query(
        "SELECT id, full_name FROM admin_users WHERE id = ? AND department = 'sales' AND status = 'active'",
        [to_sales_id],
        (err2, toRows) => {
          if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
          if (toRows.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบเซลล์ที่ต้องการโอน' })

          const toSales = toRows[0]

          // 1) อัพเดท cases.assigned_sales_id
          db.query('UPDATE cases SET assigned_sales_id = ? WHERE id = ?', [to_sales_id, caseId], (err3) => {
            if (err3) return res.status(500).json({ success: false, message: 'Server Error' })

            // 2) อัพเดท chat_conversations.assigned_to (ทุก conv ที่ผูกกับ loan_request นี้)
            if (currentCase.loan_request_id) {
              db.query(
                'UPDATE chat_conversations SET assigned_to = ? WHERE loan_request_id = ?',
                [to_sales_id, currentCase.loan_request_id],
                (err4) => {
                  if (err4) console.error('transfer chat_conversations error:', err4.message)
                }
              )
            }

            // 3) บันทึกประวัติการโอน
            db.query(
              `INSERT INTO case_transfer_log
                (case_id, lr_id, from_sales_id, from_sales_name, to_sales_id, to_sales_name, transferred_by, reason, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                caseId,
                currentCase.loan_request_id || null,
                currentCase.from_sales_id || null,
                currentCase.from_sales_name || null,
                toSales.id,
                toSales.full_name,
                transferred_by,
                reason || null
              ],
              (err5) => {
                if (err5) console.error('case_transfer_log insert error:', err5.message)
              }
            )

            // 4) Socket notification → แจ้งเซลล์ที่รับเคส
            if (io) {
              const caseLabel = currentCase.case_code || `เคส #${caseId}`
              const customerLabel = currentCase.customer_name || 'ลูกค้า'
              const fromLabel = currentCase.from_sales_name || 'เซลล์'

              // แจ้งเซลล์ที่รับ
              io.to('user_' + to_sales_id).emit('case_transferred_to_you', {
                case_id:       parseInt(caseId),
                case_code:     currentCase.case_code,
                customer_name: customerLabel,
                from_sales:    fromLabel,
                reason:        reason || null,
                message:       `📋 ${caseLabel} (${customerLabel}) ถูกโอนมาให้คุณจาก ${fromLabel}`
              })

              // แจ้ง admin_room ว่ามีการโอนเคส
              io.to('admin_room').emit('case_transferred', {
                case_id:       parseInt(caseId),
                case_code:     currentCase.case_code,
                customer_name: customerLabel,
                from_sales_id: currentCase.from_sales_id,
                from_sales:    fromLabel,
                to_sales_id:   toSales.id,
                to_sales:      toSales.full_name,
                message:       `📋 ${caseLabel} โอนจาก ${fromLabel} → ${toSales.full_name}`
              })
            }

            res.json({
              success: true,
              message: `โอนเคสให้ ${toSales.full_name} สำเร็จ`,
              to_sales_id:   toSales.id,
              to_sales_name: toSales.full_name
            })
          })
        }
      )
    }
  )
}

// ดึงประวัติการโอนเคส
exports.getCaseTransferLog = (req, res) => {
  const { caseId } = req.params
  db.query(
    `SELECT tl.*, u.full_name AS transferred_by_name
     FROM case_transfer_log tl
     LEFT JOIN admin_users u ON u.id = tl.transferred_by
     WHERE tl.case_id = ?
     ORDER BY tl.created_at DESC`,
    [caseId],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true, logs: rows })
    }
  )
}

// ========== KPI Dashboard: สถิติรายวัน/รายสัปดาห์/รายเซลล์ ==========
exports.getKpiStats = (req, res) => {
  const queries = []

  // 1. วันนี้: leads ใหม่ แยกตาม lead_source
  queries.push(new Promise((resolve) => {
    db.query(`
      SELECT lead_source, COUNT(*) AS cnt
      FROM loan_requests
      WHERE DATE(created_at) = CURDATE()
      GROUP BY lead_source
    `, (err, rows) => resolve({ key: 'today_by_source', data: err ? [] : rows }))
  }))

  // 2. 7 วันที่ผ่านมา: leads รายวัน
  queries.push(new Promise((resolve) => {
    db.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS cnt
      FROM loan_requests
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `, (err, rows) => resolve({ key: 'weekly_daily', data: err ? [] : rows }))
  }))

  // 3. 7 วันที่ผ่านมา: leads แยก lead_source
  queries.push(new Promise((resolve) => {
    db.query(`
      SELECT lead_source, COUNT(*) AS cnt
      FROM loan_requests
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY lead_source
      ORDER BY cnt DESC
    `, (err, rows) => resolve({ key: 'weekly_by_source', data: err ? [] : rows }))
  }))

  // 4. รายเซลล์: จำนวนเคสทั้งหมด + ผ่านประเมิน + ปิดดีล (จาก cases)
  queries.push(new Promise((resolve) => {
    db.query(`
      SELECT
        u.id AS sales_id,
        u.full_name AS sales_name,
        u.nickname,
        COUNT(c.id) AS total_cases,
        SUM(CASE WHEN c.status IN ('appraisal_passed','pending_approve','credit_approved','pending_auction','preparing_docs','legal_scheduled','legal_completed','completed') THEN 1 ELSE 0 END) AS passed_appraisal,
        SUM(CASE WHEN c.status IN ('legal_completed','completed') THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN c.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        COALESCE(SUM(c.approved_amount), 0) AS total_approved
      FROM admin_users u
      LEFT JOIN cases c ON c.assigned_sales_id = u.id
      WHERE u.department = 'sales' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY total_cases DESC
    `, (err, rows) => resolve({ key: 'per_sales', data: err ? [] : rows }))
  }))

  // 5. รายเซลล์: leads ใหม่ 7 วัน (จาก loan_requests ยังไม่มี case)
  queries.push(new Promise((resolve) => {
    db.query(`
      SELECT
        lr.lead_source,
        COUNT(*) AS total_leads,
        SUM(CASE WHEN lr.status = 'cancelled' THEN 1 ELSE 0 END) AS dead_leads
      FROM loan_requests lr
      WHERE lr.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY lr.lead_source
    `, (err, rows) => resolve({ key: 'lead_funnel', data: err ? [] : rows }))
  }))

  // 6. dead_reason summary (ทั้งหมด) + reject_category summary
  queries.push(new Promise((resolve) => {
    db.query(`
      SELECT dead_reason, COUNT(*) AS cnt
      FROM loan_requests
      WHERE dead_reason IS NOT NULL AND dead_reason != ''
      GROUP BY dead_reason
      ORDER BY cnt DESC
    `, (err, rows) => resolve({ key: 'dead_reasons', data: err ? [] : rows }))
  }))

  queries.push(new Promise((resolve) => {
    db.query(`
      SELECT reject_category, reject_alternative, COUNT(*) AS cnt
      FROM loan_requests
      WHERE reject_category IS NOT NULL AND reject_category != ''
      GROUP BY reject_category, reject_alternative
      ORDER BY cnt DESC
    `, (err, rows) => resolve({ key: 'reject_stats', data: err ? [] : rows }))
  }))

  // 7. สรุปภาพรวม 30 วัน
  queries.push(new Promise((resolve) => {
    db.query(`
      SELECT
        COUNT(*) AS total_30d,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today_total,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS week_total,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS dead_30d,
        SUM(CASE WHEN lead_source = 'line' THEN 1 ELSE 0 END) AS from_line,
        SUM(CASE WHEN lead_source = 'facebook' THEN 1 ELSE 0 END) AS from_facebook
      FROM loan_requests
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, (err, rows) => resolve({ key: 'summary_30d', data: err ? [] : (rows[0] || {}) }))
  }))

  Promise.all(queries).then(results => {
    const out = {}
    results.forEach(r => { out[r.key] = r.data })
    res.json({ success: true, kpi: out })
  }).catch(e => {
    res.status(500).json({ success: false, message: e.message })
  })
}

// ========== Weekly Report — รายงานประจำสัปดาห์ แยกตามเซลล์ ==========
exports.getWeeklyReport = (req, res) => {
  // week_start = YYYY-MM-DD (จันทร์ต้นสัปดาห์), default = จันทร์นี้
  const { week_start } = req.query
  let startDate, endDate
  if (week_start) {
    startDate = week_start
    const d = new Date(week_start)
    d.setDate(d.getDate() + 6)
    endDate = d.toISOString().slice(0, 10)
  } else {
    const today = new Date()
    const dow = today.getDay() // 0=Sun
    const diffToMon = dow === 0 ? -6 : 1 - dow
    const mon = new Date(today); mon.setDate(today.getDate() + diffToMon)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    startDate = mon.toISOString().slice(0, 10)
    endDate   = sun.toISOString().slice(0, 10)
  }

  const queries = []

  // 1. ลูกค้าใหม่ที่ติดต่อเข้า (loan_requests สร้างในสัปดาห์) แยกตามเซลล์
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        u.id AS sales_id, u.full_name AS sales_name, u.nickname,
        COUNT(lr.id)                                                            AS new_contacts,
        SUM(CASE WHEN lr.status = 'cancelled' THEN 1 ELSE 0 END)               AS rejected,
        SUM(CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END)                      AS converted_to_case,
        GROUP_CONCAT(
          CONCAT(lr.id,'|',COALESCE(lr.contact_name,''),'|',COALESCE(lr.contact_phone,''),'|',lr.status,'|',DATE(lr.created_at))
          ORDER BY lr.created_at DESC SEPARATOR ';;'
        ) AS contacts_detail
      FROM admin_users u
      LEFT JOIN cases c   ON c.assigned_sales_id = u.id
                         AND DATE(c.created_at) BETWEEN ? AND ?
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      WHERE u.department = 'sales' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY new_contacts DESC
    `, [startDate, endDate], (err, rows) => resolve({ key: 'contacts', data: err ? [] : rows }))
  }))

  // 2. Follow-up ที่ทำในสัปดาห์นี้ แยกตามเซลล์ (case_followups)
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        u.id AS sales_id, u.full_name AS sales_name, u.nickname,
        COUNT(cf.id) AS followup_count,
        COUNT(DISTINCT cf.case_id) AS followup_cases,
        GROUP_CONCAT(
          CONCAT(cf.case_id,'|',COALESCE(c.case_code,''),'|',COALESCE(lr.contact_name,''),'|',cf.follow_up_count,'|',DATE(cf.created_at),'|',COALESCE(cf.note,''))
          ORDER BY cf.created_at DESC SEPARATOR ';;'
        ) AS followup_detail
      FROM admin_users u
      LEFT JOIN cases c          ON c.assigned_sales_id = u.id
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      LEFT JOIN case_followups cf ON cf.case_id = c.id
                                 AND DATE(cf.created_at) BETWEEN ? AND ?
      WHERE u.department = 'sales' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY followup_count DESC
    `, [startDate, endDate], (err, rows) => resolve({ key: 'followups', data: err ? [] : rows }))
  }))

  // 3. เคสที่ปิดในสัปดาห์นี้ (completed / legal_completed / auction_completed)
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        u.id AS sales_id, u.full_name AS sales_name, u.nickname,
        COUNT(c.id) AS closed_cases,
        COALESCE(SUM(c.approved_amount), 0) AS total_amount,
        GROUP_CONCAT(
          CONCAT(c.id,'|',COALESCE(c.case_code,''),'|',COALESCE(lr.contact_name,''),'|',COALESCE(c.approved_amount,0),'|',DATE(c.updated_at))
          ORDER BY c.updated_at DESC SEPARATOR ';;'
        ) AS closed_detail
      FROM admin_users u
      LEFT JOIN cases c ON c.assigned_sales_id = u.id
                       AND c.status IN ('completed','legal_completed','auction_completed')
                       AND DATE(c.updated_at) BETWEEN ? AND ?
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      WHERE u.department = 'sales' AND u.status = 'active'
      GROUP BY u.id
      ORDER BY closed_cases DESC
    `, [startDate, endDate], (err, rows) => resolve({ key: 'closed', data: err ? [] : rows }))
  }))

  // 4. เคส active (ยังไม่ปิด) ที่อยู่ในมือแต่ละเซลล์ ณ ปัจจุบัน
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        u.id AS sales_id,
        COUNT(c.id) AS active_cases,
        SUM(CASE WHEN c.next_follow_up_at < NOW() THEN 1 ELSE 0 END) AS overdue_followups
      FROM admin_users u
      LEFT JOIN cases c ON c.assigned_sales_id = u.id
                       AND c.status NOT IN ('completed','cancelled','auction_completed','legal_completed')
      WHERE u.department = 'sales' AND u.status = 'active'
      GROUP BY u.id
    `, [], (err, rows) => resolve({ key: 'active', data: err ? [] : rows }))
  }))

  Promise.all(queries).then(results => {
    const out = {}
    results.forEach(r => { out[r.key] = r.data })
    res.json({ success: true, week_start: startDate, week_end: endDate, ...out })
  }).catch(e => res.status(500).json({ success: false, message: e.message }))
}

// ============================================================
// AI Auto-Create Case — ใช้ Anthropic Claude API
// POST /api/admin/sales/debtors/:id/auto-create-case
// ============================================================
exports.autoCreateCase = (req, res) => {
  const { id } = req.params
  const https = require('https')
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''

  // 1. ดึงข้อมูลลูกหนี้ + เช็ค prerequisites
  db.query(
    `SELECT lr.*,
       (SELECT COUNT(*) FROM cases WHERE loan_request_id = lr.id) as case_count
     FROM loan_requests lr WHERE lr.id = ?`,
    [id],
    (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ success: false, message: 'ไม่พบลูกหนี้' })
      const lr = rows[0]

      // ตรวจ prerequisites
      const missing = []
      if (!lr.loan_type_detail || !['mortgage','selling_pledge'].includes(lr.loan_type_detail))
        missing.push('ประเภทสินเชื่อ (จำนอง/ขายฝาก)')
      if (!lr.appraisal_book_image) missing.push('เล่มประเมิน')
      if (!lr.credit_table_file)    missing.push('ตารางวงเงิน')
      if (lr.case_count > 0)        return res.status(400).json({ success: false, message: 'ลูกหนี้นี้มีเคสแล้ว' })

      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `ยังไม่พร้อมสร้างเคส — ขาดข้อมูล: ${missing.join(', ')}`
        })
      }

      // 2. ถ้าไม่มี Anthropic Key → ใช้ note อัตโนมัติแบบ template
      const loanTypeLabel = lr.loan_type_detail === 'mortgage' ? 'จำนอง' : 'ขายฝาก'
      const propertyLabel = { land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์' }[lr.property_type] || lr.property_type || 'ทรัพย์'

      const buildAndCreate = (aiNote) => {
        generateSequentialCode('cases', 'case_code', 'CS', 4, (errCode, case_code) => {
          if (errCode) return res.status(500).json({ success: false, message: 'สร้างรหัสเคสไม่ได้' })

          const sql = `
            INSERT INTO cases (case_code, loan_request_id, user_id, agent_id, assigned_sales_id,
              note, appraisal_type, appraisal_book_image, payment_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', NOW())
          `
          const params = [
            case_code,
            lr.id,
            lr.user_id || null,
            lr.agent_id || null,
            lr.assigned_sales_id || null,
            aiNote,
            lr.appraisal_type || 'outside',
            lr.appraisal_book_image || null
          ]

          db.query(sql, params, (errIns, result) => {
            if (errIns) return res.status(500).json({ success: false, message: 'สร้างเคสไม่สำเร็จ: ' + errIns.message })

            // อัพเดท status ลูกหนี้ → reviewing
            db.query('UPDATE loan_requests SET status = ? WHERE id = ?', ['reviewing', id])

            const io = req.app.get('io')
            try { notifyStatusChange(parseInt(id), result.insertId, null, 'reviewing', io, null) } catch {}

            res.json({
              success: true,
              message: `สร้างเคส ${case_code} สำเร็จด้วย AI`,
              case_code,
              case_id: result.insertId,
              ai_note: aiNote
            })
          })
        })
      }

      // 3. เรียก Claude API สร้าง note อัจฉริยะ
      if (!ANTHROPIC_KEY) {
        const fallback = `[สร้างอัตโนมัติ] ลูกหนี้: ${lr.contact_name || '-'} | ประเภท: ${loanTypeLabel} | ทรัพย์: ${propertyLabel} จ.${lr.province || '-'} | วงเงินขอ: ${lr.loan_amount ? Number(lr.loan_amount).toLocaleString('th-TH') + ' บาท' : '-'}`
        return buildAndCreate(fallback)
      }

      const prompt = `คุณเป็นผู้ช่วยสร้างเคสสินเชื่อ สร้างบันทึกสรุปเคสสั้นๆ 1-2 ประโยคภาษาไทย จากข้อมูลต่อไปนี้:
- ชื่อลูกหนี้: ${lr.contact_name || 'ไม่ระบุ'}
- ประเภทสินเชื่อ: ${loanTypeLabel}
- ประเภททรัพย์: ${propertyLabel}
- จังหวัด: ${lr.province || 'ไม่ระบุ'}
- วงเงินที่ขอ: ${lr.loan_amount ? Number(lr.loan_amount).toLocaleString('th-TH') + ' บาท' : 'ไม่ระบุ'}
- ผลประเมิน: ${lr.appraisal_result === 'passed' ? 'ผ่านการประเมิน' : lr.appraisal_result === 'not_passed' ? 'ไม่ผ่านการประเมิน' : 'รอผล'}
- หมายเหตุเพิ่มเติม: ${lr.note || '-'}

ตอบเป็น JSON: {"note": "ข้อความบันทึกเคส"}`

      const body = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body)
        }
      }

      const apiReq = https.request(options, (apiRes) => {
        let data = ''
        apiRes.on('data', chunk => { data += chunk })
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            const text = parsed?.content?.[0]?.text || ''
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            const aiNote = jsonMatch ? (JSON.parse(jsonMatch[0]).note || text) : text
            buildAndCreate(aiNote || `[AI] เคส${loanTypeLabel}ทรัพย์${propertyLabel} ${lr.province || ''} วงเงิน ${lr.loan_amount ? Number(lr.loan_amount).toLocaleString('th-TH') : '-'} บาท`)
          } catch {
            buildAndCreate(`[AI] ${loanTypeLabel} | ${propertyLabel} ${lr.province || ''} | ${lr.contact_name || ''}`)
          }
        })
      })
      apiReq.on('error', () => {
        const fallback = `[สร้างอัตโนมัติ] ${loanTypeLabel} | ${propertyLabel} | ${lr.contact_name || '-'} | จ.${lr.province || '-'}`
        buildAndCreate(fallback)
      })
      apiReq.write(body)
      apiReq.end()
    }
  )
}

// ===== Broker Contract (ส่งสัญญา / บันทึกเซ็น) via loan_request_id =====
exports.brokerContractSend = (req, res) => {
  const lrId = req.params.id
  const { email } = req.body
  if (!email) return res.status(400).json({ success: false, message: 'กรุณาระบุ Email' })
  db.query(
    'UPDATE loan_requests SET broker_contract_sent_at = NOW(), broker_contract_email = ? WHERE id = ?',
    [email, lrId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      res.json({ success: true, message: 'บันทึกการส่งสัญญาแล้ว', sent_at: new Date() })
    }
  )
}

exports.brokerContractSign = (req, res) => {
  const lrId = req.params.id
  db.query(
    'UPDATE loan_requests SET broker_contract_signed_at = NOW() WHERE id = ?',
    [lrId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      res.json({ success: true, message: 'บันทึกการเซ็นสัญญาแล้ว', signed_at: new Date() })
    }
  )
}

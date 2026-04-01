const db = require('../config/db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { notifyStatusChange } = require('./notificationController')

// ========== Helper: ไม่จำเป็นต้องมี case — ทำงานกับ loan_request_id โดยตรง ==========

// ===== multer setup สำหรับ credit table upload =====
// โฟลเดอร์: uploads/credit_tables/  (ต้องตรงกับ path ที่เก็บใน DB)
const creditTableStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/credit_tables')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, 'credit_' + Date.now() + ext)
  }
})
const uploadCreditTable = multer({ storage: creditTableStorage, limits: { fileSize: 25 * 1024 * 1024 } })

// ========== สถิติฝ่ายอนุมัติวงเงิน (นับจาก loan_requests) ==========
exports.getStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM loan_requests lr LEFT JOIN approval_transactions at2 ON at2.loan_request_id = lr.id WHERE at2.id IS NULL OR at2.approval_status = 'pending') AS pending_count,
      (SELECT COUNT(*) FROM approval_transactions WHERE approval_status = 'approved') AS approved_count,
      (SELECT COUNT(*) FROM approval_transactions WHERE approval_status = 'cancelled') AS cancelled_count,
      (SELECT COUNT(*) FROM loan_requests) AS total_count
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getStats error:', err)
      return res.json({ success: true, stats: { pending_count: 0, approved_count: 0, cancelled_count: 0, total_count: 0 } })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== รายการลูกหนี้สำหรับฝ่ายอนุมัติวงเงิน (FROM loan_requests เป็นหลัก) ==========
exports.getApprovalCases = (req, res) => {
  const { status, date } = req.query

  let sql = `
    SELECT
      lr.id AS loan_request_id,
      lr.debtor_code, lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      lr.province, lr.district, lr.property_address, lr.location_url,
      lr.images, lr.appraisal_images,
      c.id AS case_id, c.case_code, c.status AS case_status,
      lr.appraisal_result, lr.appraisal_type, lr.approved_amount,
      lr.appraisal_date, lr.appraisal_fee, lr.payment_status,
      lr.slip_image, lr.appraisal_book_image,
      lr.updated_at,
      a.full_name AS agent_name, a.phone AS agent_phone, a.agent_code,
      at2.id AS approval_id, at2.approval_type, at2.approved_credit,
      at2.interest_per_year, at2.interest_per_month, at2.operation_fee,
      at2.land_tax_estimate, at2.advance_interest, at2.is_cancelled,
      at2.approval_status, at2.recorded_by, at2.recorded_at,
      at2.credit_table_file,
      at2.created_at AS approval_created_at, at2.updated_at AS approval_updated_at
    FROM loan_requests lr
    LEFT JOIN cases c ON c.loan_request_id = lr.id
    LEFT JOIN agents a ON a.id = lr.agent_id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = lr.id
    WHERE 1=1
  `

  const params = []
  if (status) {
    if (status === 'pending') {
      sql += ' AND (at2.approval_status = ? OR at2.id IS NULL)'
      params.push(status)
    } else {
      sql += ' AND at2.approval_status = ?'
      params.push(status)
    }
  }
  if (date) {
    sql += ' AND (DATE(at2.updated_at) = ? OR DATE(lr.created_at) = ?)'
    params.push(date, date)
  }

  sql += ' ORDER BY lr.id DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getApprovalCases error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== ดึงข้อมูลเดี่ยว (สำหรับหน้าแก้ไขฝ่ายอนุมัติ) — query จาก loan_requests เป็นหลัก ==========
exports.getApprovalDetail = (req, res) => {
  const { caseId: loanRequestId } = req.params

  // ตรวจสอบว่ามี approval_transaction สำหรับ loan_request_id นี้หรือยัง
  db.query('SELECT id FROM approval_transactions WHERE loan_request_id = ?', [loanRequestId], (err0, existing) => {
    if (err0) {
      console.error('getApprovalDetail check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    if (!existing || existing.length === 0) {
      // ยังไม่มี → สร้าง approval_transaction ใหม่ด้วย loan_request_id (ไม่จำเป็นต้องมี case)
      db.query(
        'INSERT INTO approval_transactions (loan_request_id, approval_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [loanRequestId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('getApprovalDetail insert error:', errInsert)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          fetchApprovalDetail(loanRequestId, res)
        }
      )
    } else {
      fetchApprovalDetail(loanRequestId, res)
    }
  })
}

// ดึงข้อมูลจาก loan_requests เป็นหลัก (ไม่จำเป็นต้องมี case)
// ใช้ correlated subquery สำหรับ approval_transactions และ cases เพื่อดึง row ล่าสุดเสมอ
// (ป้องกันปัญหา multiple rows ทำให้ results[0] ได้ค่าผิด)
function buildApprovalDetailSql(includeCtf2, includeScheduleApproval = true) {
  return `
    SELECT
      lr.id AS loan_request_id,
      lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.property_type, lr.loan_type_detail, lr.province, lr.district, lr.subdistrict,
      lr.house_no, lr.village_name, lr.additional_details,
      lr.property_address, lr.location_url,
      lr.deed_number, lr.deed_type, lr.land_area, lr.building_area, lr.has_obligation, lr.obligation_count,
      lr.interest_rate, lr.desired_amount, lr.occupation,
      lr.monthly_income, lr.loan_purpose, lr.contract_years, lr.net_desired_amount, lr.preliminary_terms,
      lr.images, lr.appraisal_images, lr.deed_images,
      lr.appraisal_type, lr.appraisal_result, lr.appraisal_date, lr.appraisal_fee,
      lr.slip_image, lr.appraisal_book_image, lr.appraisal_note,
      lr.appraisal_recorded_by, lr.appraisal_recorded_at,
      a.full_name AS agent_name, a.phone AS agent_phone, a.agent_code,
      c.id AS case_id, c.case_code, c.status AS case_status,
      at2.id AS approval_id, at2.approval_type,
      at2.approved_credit, at2.interest_per_year, at2.interest_per_month,
      at2.operation_fee, at2.land_tax_estimate, at2.advance_interest,
      at2.is_cancelled, at2.approval_status, at2.recorded_by, at2.recorded_at,
      at2.approval_date, at2.credit_table_file,
      ${includeCtf2 ? 'at2.credit_table_file2,' : 'NULL AS credit_table_file2,'}
      ${includeScheduleApproval ? 'CAST(COALESCE(at2.payment_schedule_approved, 0) AS SIGNED) AS payment_schedule_approved, at2.payment_schedule_approved_at, at2.approval_schedule_file,' : 'CAST(0 AS SIGNED) AS payment_schedule_approved, NULL AS payment_schedule_approved_at, NULL AS approval_schedule_file,'}
      at2.created_at AS approval_created_at, at2.updated_at AS approval_updated_at,
      at2.offer_manager_status, at2.offer_sent_at, at2.manager_approved_at,
      at2.manager_note, at2.customer_sent_at,
      lr.outside_result, lr.outside_reason, lr.outside_recorded_at,
      lr.inside_result, lr.inside_reason, lr.inside_recorded_at,
      lr.check_price_value, lr.check_price_detail, lr.check_price_recorded_at,
      lr.ineligible_property, lr.ineligible_reason, lr.screening_status, lr.screened_at,
      -- Checklist docs (marital)
      lr.marital_status,
      lr.borrower_id_card, lr.house_reg_book, lr.name_change_doc, lr.divorce_doc,
      lr.spouse_id_card, lr.spouse_reg_copy, lr.marriage_cert,
      lr.single_cert, lr.death_cert, lr.will_court_doc, lr.testator_house_reg,
      -- Checklist docs (property)
      lr.deed_copy, lr.building_permit, lr.house_reg_prop, lr.sale_contract, lr.debt_free_cert,
      lr.blueprint, lr.property_photos, lr.land_tax_receipt, lr.maps_url,
      lr.condo_title_deed, lr.condo_location_map, lr.common_fee_receipt, lr.floor_plan,
      lr.location_sketch_map, lr.land_use_cert, lr.rental_contract, lr.business_reg,
      lr.payment_schedule_file,
      -- รายละเอียดสิ่งปลูกสร้าง (SOP 2.1.5 — ฝ่ายประเมิน+อนุมัติต้องเห็น)
      lr.building_year, lr.floors, lr.bedrooms, lr.bathrooms,
      lr.project_name, lr.rental_rooms, lr.rental_price_per_month
    FROM loan_requests lr
    LEFT JOIN cases c ON c.id = (SELECT id FROM cases WHERE loan_request_id = lr.id ORDER BY id DESC LIMIT 1)
    LEFT JOIN agents a ON a.id = lr.agent_id
    LEFT JOIN approval_transactions at2 ON at2.id = (SELECT id FROM approval_transactions WHERE loan_request_id = lr.id ORDER BY id DESC LIMIT 1)
    WHERE lr.id = ?
  `
}

function fetchApprovalDetail(loanRequestId, res) {
  // ลอง query พร้อม column ใหม่ทั้งหมดก่อน; ถ้า column ยังไม่มี (migration ยังไม่รัน) ให้ fallback ทีละชั้น
  db.query(buildApprovalDetailSql(true, true), [loanRequestId], (err, results) => {
    if (err) {
      console.error(`[fetchApprovalDetail] full query failed (loanRequestId=${loanRequestId}):`, err.message)
      // ลอง fallback ไม่มี schedule approval fields
      db.query(buildApprovalDetailSql(true, false), [loanRequestId], (err1, results1) => {
        if (err1) {
          console.error(`[fetchApprovalDetail] ctf2 fallback failed:`, err1.message)
          // fallback สุดท้าย ไม่มีทั้ง credit_table_file2 และ schedule approval
          db.query(buildApprovalDetailSql(false, false), [loanRequestId], (err2, results2) => {
            if (err2) {
              console.error('fetchApprovalDetail error:', err2)
              return res.status(500).json({ success: false, message: 'Server Error' })
            }
            if (results2.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })
            res.json({ success: true, caseData: results2[0] })
          })
          return
        }
        if (results1.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })
        res.json({ success: true, caseData: results1[0] })
      })
      return
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลลูกหนี้' })
    res.json({ success: true, caseData: results[0] })
  })
}

// ========== อัพเดทข้อมูลอนุมัติวงเงิน (ทำงานกับ loan_request_id โดยตรง ไม่ต้องมีเคส) ==========
exports.updateApproval = (req, res) => {
  const { caseId: loanRequestId } = req.params
  const body = req.body || {}
  const {
    approval_type, approved_credit, interest_per_year, interest_per_month,
    operation_fee, land_tax_estimate, advance_interest, is_cancelled,
    approval_status, recorded_at, approval_date,
    check_price_value, check_price_detail
  } = body
  const recorder = req.user ? (req.user.full_name || req.user.username || 'ระบบ') : 'ระบบ'

  const buildAndExecuteUpdate = () => {
    const fields = []
    const values = []

    if (approval_type !== undefined) { fields.push('approval_type=?'); values.push(approval_type || null) }
    if (approved_credit !== undefined) { fields.push('approved_credit=?'); values.push(approved_credit || null) }
    if (interest_per_year !== undefined) { fields.push('interest_per_year=?'); values.push(interest_per_year || null) }
    if (interest_per_month !== undefined) { fields.push('interest_per_month=?'); values.push(interest_per_month || null) }
    if (operation_fee !== undefined) { fields.push('operation_fee=?'); values.push(operation_fee || null) }
    if (land_tax_estimate !== undefined) { fields.push('land_tax_estimate=?'); values.push(land_tax_estimate || null) }
    if (advance_interest !== undefined) { fields.push('advance_interest=?'); values.push(advance_interest || null) }
    if (is_cancelled !== undefined) { fields.push('is_cancelled=?'); values.push(is_cancelled ? 1 : 0) }
    if (approval_status !== undefined) { fields.push('approval_status=?'); values.push(approval_status || 'pending') }
    fields.push('recorded_by=?'); values.push(recorder)
    fields.push('recorded_at=?'); values.push(new Date())
    if (approval_date !== undefined) { fields.push('approval_date=?'); values.push(approval_date || null) }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

    fields.push('updated_at=NOW()')
    values.push(loanRequestId)
    const sql = `UPDATE approval_transactions SET ${fields.join(', ')} WHERE loan_request_id=?`
    db.query(sql, values, (err) => {
      if (err) {
        console.error('updateApproval error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      // ===== sync check_price fields → loan_requests (fire-and-forget) =====
      if (check_price_value !== undefined || check_price_detail !== undefined) {
        const cpFields = []
        const cpValues = []
        if (check_price_value !== undefined) { cpFields.push('check_price_value=?'); cpValues.push(check_price_value || null) }
        if (check_price_detail !== undefined) { cpFields.push('check_price_detail=?'); cpValues.push(check_price_detail || null) }
        cpFields.push('check_price_recorded_at=NOW()')
        cpValues.push(loanRequestId)
        db.query(
          `UPDATE loan_requests SET ${cpFields.join(', ')} WHERE id=?`,
          cpValues,
          (cpErr) => { if (cpErr) console.error('sync check_price error:', cpErr) }
        )
      }

      // ===== auto-sync cases.status ตาม workflow (ถ้ามี case) =====
      let newCaseStatus = null
      if (is_cancelled == 1 || is_cancelled === true) {
        newCaseStatus = 'cancelled'
      } else if (approval_status === 'approved') {
        newCaseStatus = 'credit_approved'
      } else if (approval_status === 'pending') {
        newCaseStatus = 'pending_approve'
      }

      // ===== manual notify flags จากหน้า ApprovalEditPage =====
      const doManualNotify = () => {
        try {
          const io = req.app.get('io')
          const userId = req.user ? req.user.id : null
          if (req.body.notify_sales_save === '1') {
            notifyStatusChange(parseInt(loanRequestId), null, null, 'approval_result_to_sales', io, userId)
          }
          if (req.body.notify_appraisal_save === '1') {
            notifyStatusChange(parseInt(loanRequestId), null, null, 'approval_result_to_appraisal', io, userId)
          }
          if (req.body.notify_legal_save === '1') {
            notifyStatusChange(parseInt(loanRequestId), null, null, 'approval_to_legal', io, userId)
          }
        } catch (e) { console.error('manual notify error:', e.message) }
      }

      if (newCaseStatus) {
        db.query('UPDATE cases SET status = ? WHERE loan_request_id = ?', [newCaseStatus, loanRequestId], (err2) => {
          if (err2) console.error('sync cases.status error:', err2)

          // ===== ส่งแจ้งเตือน auto (ลูกค้า + ภายใน) =====
          const io = req.app.get('io')
          const userId = req.user ? req.user.id : null
          db.query('SELECT id FROM cases WHERE loan_request_id = ?', [loanRequestId], (err3, caseRows) => {
            const cId = (caseRows && caseRows.length > 0) ? caseRows[0].id : null
            const extraInfo = approved_credit ? (approved_credit + ' บาท') : ''
            notifyStatusChange(parseInt(loanRequestId), cId, null, newCaseStatus, io, userId, extraInfo)
          })

          doManualNotify()
          res.json({ success: true, message: 'อัพเดทข้อมูลอนุมัติวงเงินสำเร็จ' })
        })
      } else {
        doManualNotify()
        res.json({ success: true, message: 'อัพเดทข้อมูลอนุมัติวงเงินสำเร็จ' })
      }
    })
  }

  // ตรวจสอบว่ามี approval_transaction สำหรับ loan_request_id นี้หรือยัง
  db.query('SELECT id FROM approval_transactions WHERE loan_request_id = ?', [loanRequestId], (err0, existing) => {
    if (err0) {
      console.error('updateApproval check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (!existing || existing.length === 0) {
      // สร้างใหม่ — ไม่ต้องมี case_id
      db.query(
        'INSERT INTO approval_transactions (loan_request_id, approval_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [loanRequestId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('updateApproval insert error:', errInsert)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          buildAndExecuteUpdate()
        }
      )
    } else {
      buildAndExecuteUpdate()
    }
  })
}

// ========== ลบไฟล์ตารางวงเงิน (ใช้ loan_request_id โดยตรง) ==========
exports.deleteCreditTable = (req, res) => {
  const { caseId: loanRequestId } = req.params
  db.query(
    'UPDATE approval_transactions SET credit_table_file = NULL, updated_at = NOW() WHERE loan_request_id = ?',
    [loanRequestId],
    (err) => {
      if (err) {
        console.error('deleteCreditTable error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'ลบไฟล์ตารางวงเงินสำเร็จ' })
    }
  )
}

// ========== อัพโหลดตารางวงเงิน (ใช้ loan_request_id โดยตรง ไม่ต้องมีเคส) ==========
exports.uploadCreditTableMiddleware = uploadCreditTable.single('credit_table_file')

exports.uploadCreditTable = (req, res) => {
  const { caseId: loanRequestId } = req.params
  if (!req.file) return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ที่อัพโหลด' })

  const filePath = '/uploads/credit_tables/' + req.file.filename

  // ตรวจสอบว่ามี approval_transaction สำหรับ loan_request_id นี้หรือยัง
  db.query('SELECT id FROM approval_transactions WHERE loan_request_id = ?', [loanRequestId], (err0, existing) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })

    const notifyCreditTable = () => {
      try {
        const io = req.app.get('io')
        const userId = req.user ? req.user.id : null
        const { notifyStatusChange } = require('./notificationController')
        // แจ้งฝ่ายขาย (default = แจ้ง เว้นแต่ notify_sales = '0')
        if (req.body.notify_sales !== '0') {
          notifyStatusChange(parseInt(loanRequestId), null, null, 'credit_table_to_sales', io, userId)
        }
        // แจ้งฝ่ายประเมิน (default = แจ้ง เว้นแต่ notify_appraisal = '0')
        if (req.body.notify_appraisal !== '0') {
          notifyStatusChange(parseInt(loanRequestId), null, null, 'credit_table_to_appraisal', io, userId)
        }
      } catch (e) {
        console.error('credit_table notify error:', e.message)
      }
    }

    if (!existing || existing.length === 0) {
      // สร้างใหม่พร้อม credit_table_file — ไม่ต้องมี case_id
      db.query(
        'INSERT INTO approval_transactions (loan_request_id, credit_table_file, approval_status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [loanRequestId, filePath, 'pending'],
        (errInsert) => {
          if (errInsert) return res.status(500).json({ success: false, message: 'Server Error' })
          notifyCreditTable()
          res.json({ success: true, file_path: filePath, message: 'อัพโหลดตารางวงเงินสำเร็จ' })
        }
      )
    } else {
      db.query(
        'UPDATE approval_transactions SET credit_table_file = ?, updated_at = NOW() WHERE loan_request_id = ?',
        [filePath, loanRequestId],
        (err) => {
          if (err) {
            console.error('uploadCreditTable error:', err)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          notifyCreditTable()
          res.json({ success: true, file_path: filePath, message: 'อัพโหลดตารางวงเงินสำเร็จ' })
        }
      )
    }
  })
}

// ========== อัพโหลดตารางวงเงิน 2 (ขายฝาก) ==========
// โฟลเดอร์: uploads/approval/credit-tables/
const creditTable2Storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/approval/credit-tables')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `ct2_${Date.now()}${ext}`)
  },
})
const uploadCreditTable2 = multer({ storage: creditTable2Storage, limits: { fileSize: 25 * 1024 * 1024 } })

exports.uploadCreditTable2Middleware = uploadCreditTable2.single('credit_table_file2')

exports.uploadCreditTable2 = (req, res) => {
  const { caseId: loanRequestId } = req.params
  if (!req.file) return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ที่อัพโหลด' })

  const filePath = '/uploads/credit_tables/' + req.file.filename

  db.query('SELECT id FROM approval_transactions WHERE loan_request_id = ?', [loanRequestId], (err0, existing) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })

    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO approval_transactions (loan_request_id, credit_table_file2, approval_status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [loanRequestId, filePath, 'pending'],
        (errInsert) => {
          if (errInsert) return res.status(500).json({ success: false, message: 'Server Error' })
          res.json({ success: true, file_path: filePath, message: 'อัพโหลดตารางขายฝากสำเร็จ' })
        }
      )
    } else {
      db.query(
        'UPDATE approval_transactions SET credit_table_file2 = ?, updated_at = NOW() WHERE loan_request_id = ?',
        [filePath, loanRequestId],
        (err) => {
          if (err) {
            console.error('uploadCreditTable2 error:', err)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          res.json({ success: true, file_path: filePath, message: 'อัพโหลดตารางขายฝากสำเร็จ' })
        }
      )
    }
  })
}

exports.deleteCreditTable2 = (req, res) => {
  const { caseId: loanRequestId } = req.params
  db.query(
    'UPDATE approval_transactions SET credit_table_file2 = NULL, updated_at = NOW() WHERE loan_request_id = ?',
    [loanRequestId],
    (err) => {
      if (err) {
        console.error('deleteCreditTable2 error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'ลบไฟล์ตารางขายฝากสำเร็จ' })
    }
  )
}
// ============================================================
// ★ อนุมัติ / ยกเลิกอนุมัติ ตารางผ่อนชำระของฝ่ายขาย
// ============================================================
// status: 0=รอตรวจสอบ, 1=อนุมัติ, 2=ไม่อนุมัติ
exports.approvePaymentSchedule = (req, res) => {
  const { caseId: loanRequestId } = req.params
  const { status } = req.body

  console.log(`[approvePaymentSchedule] loanRequestId=${loanRequestId} status=${status}`)

  const statusVal = parseInt(status)
  if (isNaN(statusVal)) return res.status(400).json({ success: false, message: 'status required (0/1/2)' })
  const approvedAt = statusVal === 1 ? 'NOW()' : 'NULL'

  const doNotify = () => {
    if (statusVal !== 1) return
    try {
      const io = res.app ? res.app.get('io') : null
      if (io) {
        const userId = req.user ? req.user.id : null
        notifyStatusChange(parseInt(loanRequestId), null, null, 'schedule_approved_to_sales', io, userId)
      }
    } catch (e) { console.error('approveSchedule notify error:', e.message) }
  }

  db.query('SELECT id FROM approval_transactions WHERE loan_request_id = ?', [loanRequestId], (err0, existing) => {
    if (err0) {
      console.error('[approvePaymentSchedule] select error:', err0.message)
      return res.status(500).json({ success: false, message: 'Server Error: ' + err0.message })
    }

    if (existing && existing.length > 0) {
      const sql = `UPDATE approval_transactions SET payment_schedule_approved = ?, payment_schedule_approved_at = ${approvedAt}, updated_at = NOW() WHERE loan_request_id = ?`
      db.query(sql, [statusVal, loanRequestId], (err) => {
        if (err) {
          console.error('[approvePaymentSchedule] update error:', err.message)
          return res.status(500).json({ success: false, message: 'Server Error: ' + err.message })
        }
        doNotify()
        res.json({ success: true, status: statusVal })
      })
    } else {
      db.query(
        `INSERT INTO approval_transactions (loan_request_id, payment_schedule_approved, payment_schedule_approved_at, approval_status, created_at, updated_at) VALUES (?, ?, ${approvedAt}, 'pending', NOW(), NOW())`,
        [loanRequestId, statusVal],
        (err) => {
          if (err) {
            console.error('[approvePaymentSchedule] insert error:', err.message)
            return res.status(500).json({ success: false, message: 'Server Error: ' + err.message })
          }
          doNotify()
          res.json({ success: true, status: statusVal })
        }
      )
    }
  })
}

// ============================================================
// ★ อัพโหลดตารางผ่อนชำระที่ฝ่ายอนุมัติทำเอง
// ============================================================
const approvalScheduleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/credit_tables')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `apv_schedule_${Date.now()}${ext}`)
  }
})
const uploadApprovalSchedule = multer({ storage: approvalScheduleStorage, limits: { fileSize: 25 * 1024 * 1024 } })
exports.uploadApprovalScheduleMiddleware = uploadApprovalSchedule.single('approval_schedule_file')

exports.uploadApprovalSchedule = (req, res) => {
  const { caseId: loanRequestId } = req.params
  if (!req.file) return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ที่อัพโหลด' })

  const filePath = '/uploads/credit_tables/' + req.file.filename

  db.query('SELECT id FROM approval_transactions WHERE loan_request_id = ?', [loanRequestId], (err0, existing) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })

    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO approval_transactions (loan_request_id, approval_schedule_file, approval_status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [loanRequestId, filePath, 'pending'],
        (err) => {
          if (err) return res.status(500).json({ success: false, message: 'Server Error' })
          res.json({ success: true, file_path: filePath })
        }
      )
    } else {
      db.query(
        'UPDATE approval_transactions SET approval_schedule_file = ?, updated_at = NOW() WHERE loan_request_id = ?',
        [filePath, loanRequestId],
        (err) => {
          if (err) return res.status(500).json({ success: false, message: 'Server Error' })
          res.json({ success: true, file_path: filePath })
        }
      )
    }
  })
}

exports.deleteApprovalSchedule = (req, res) => {
  const { caseId: loanRequestId } = req.params
  db.query(
    'UPDATE approval_transactions SET approval_schedule_file = NULL, updated_at = NOW() WHERE loan_request_id = ?',
    [loanRequestId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true })
    }
  )
}

// ============================================================
// ★ Offer Manager Approval Gating
// ============================================================

// ส่งข้อเสนอให้ผู้จัดการอนุมัติ
exports.submitOfferForManagerApproval = (req, res) => {
  const { caseId: loanRequestId } = req.params
  const userId = req.user ? req.user.id : null

  db.query(
    `UPDATE approval_transactions
     SET offer_manager_status = 'pending_manager', offer_sent_at = NOW(), updated_at = NOW()
     WHERE loan_request_id = ?`,
    [loanRequestId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })

      const io = req.app.get('io')
      if (io) {
        io.to('admin_room').emit('offer_pending_manager', {
          loan_request_id: loanRequestId,
          message: `📋 ข้อเสนอรอผู้จัดการอนุมัติ (LR #${loanRequestId})`
        })
      }
      res.json({ success: true, message: 'ส่งข้อเสนอให้ผู้จัดการแล้ว' })
    }
  )
}

// ผู้จัดการอนุมัติ / ปฏิเสธ
exports.managerApproveOffer = (req, res) => {
  const { caseId: loanRequestId } = req.params
  const { action, manager_note } = req.body  // action: 'approve' | 'reject'
  const userId = req.user ? req.user.id : null

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'action ไม่ถูกต้อง' })
  }

  const newStatus = action === 'approve' ? 'manager_approved' : 'manager_rejected'
  db.query(
    `UPDATE approval_transactions
     SET offer_manager_status = ?,
         manager_approved_by = ?,
         manager_approved_at = NOW(),
         manager_note = ?,
         updated_at = NOW()
     WHERE loan_request_id = ?`,
    [newStatus, userId, manager_note || null, loanRequestId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })

      const io = req.app.get('io')
      if (io) {
        const emoji = action === 'approve' ? '✅' : '❌'
        io.to('admin_room').emit('offer_manager_decision', {
          loan_request_id: loanRequestId,
          status: newStatus,
          manager_note,
          message: `${emoji} ผู้จัดการ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}ข้อเสนอ (LR #${loanRequestId})`
        })
      }
      res.json({ success: true, status: newStatus, message: action === 'approve' ? 'อนุมัติข้อเสนอแล้ว' : 'ปฏิเสธข้อเสนอแล้ว' })
    }
  )
}

// บันทึกว่าส่งข้อเสนอให้ลูกค้าแล้ว
exports.markOfferSentToCustomer = (req, res) => {
  const { caseId: loanRequestId } = req.params
  db.query(
    `UPDATE approval_transactions
     SET customer_sent_at = NOW(), updated_at = NOW()
     WHERE loan_request_id = ? AND offer_manager_status = 'manager_approved'`,
    [loanRequestId],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      if (result.affectedRows === 0) {
        return res.status(400).json({ success: false, message: 'ต้องให้ผู้จัดการอนุมัติก่อนส่งลูกค้า' })
      }
      res.json({ success: true, message: 'บันทึกการส่งข้อเสนอให้ลูกค้าแล้ว' })
    }
  )
}

// ============================================================
// GET /api/admin/approval/dashboard
// แดชบอร์ดฝ่ายอนุมัติ — สรุปรายสัปดาห์/เดือน/ปี
// ?period=week|month|year
// ============================================================
exports.getApprovalDashboard = (req, res) => {
  const period = req.query.period || 'week'

  let dateExpr, groupExpr, labelExpr
  if (period === 'year') {
    dateExpr = `DATE(at2.created_at) >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`
    groupExpr = `DATE_FORMAT(at2.created_at, '%Y-%m')`
    labelExpr = groupExpr
  } else if (period === 'month') {
    dateExpr = `DATE(at2.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    groupExpr = `DATE(at2.created_at)`
    labelExpr = groupExpr
  } else {
    dateExpr = `DATE(at2.created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`
    groupExpr = `DATE(at2.created_at)`
    labelExpr = groupExpr
  }

  const queries = []

  // 1. Trend
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT ${labelExpr} AS label, COUNT(*) AS cnt
      FROM approval_transactions at2
      WHERE ${dateExpr}
      GROUP BY ${groupExpr} ORDER BY label ASC
    `, (err, rows) => resolve({ key: 'approval_trend', data: err ? [] : rows }))
  }))

  // 2. Summary
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN at2.approval_status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN at2.approval_status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN at2.approval_status = 'cancelled' OR at2.is_cancelled = 1 THEN 1 ELSE 0 END) AS cancelled,
        COALESCE(SUM(at2.approved_credit), 0) AS total_approved_credit,
        COALESCE(AVG(at2.approved_credit), 0) AS avg_approved_credit,
        COALESCE(SUM(at2.operation_fee), 0) AS total_operation_fee,
        COALESCE(SUM(at2.advance_interest), 0) AS total_advance_interest
      FROM approval_transactions at2
      WHERE ${dateExpr}
    `, (err, rows) => resolve({ key: 'summary', data: err ? {} : (rows[0] || {}) }))
  }))

  // 3. Status distribution
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT COALESCE(at2.approval_status, 'unknown') AS status, COUNT(*) AS cnt
      FROM approval_transactions at2
      WHERE ${dateExpr}
      GROUP BY at2.approval_status ORDER BY cnt DESC
    `, (err, rows) => resolve({ key: 'status_dist', data: err ? [] : rows }))
  }))

  // 4. วงเงินอนุมัติ trend
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT ${labelExpr} AS label,
        COALESCE(SUM(at2.approved_credit), 0) AS total_credit,
        COUNT(*) AS cnt
      FROM approval_transactions at2
      WHERE at2.approval_status = 'approved' AND ${dateExpr}
      GROUP BY ${groupExpr} ORDER BY label ASC
    `, (err, rows) => resolve({ key: 'credit_trend', data: err ? [] : rows }))
  }))

  // 5. แยกตามประเภททรัพย์
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT COALESCE(lr.property_type, 'other') AS property_type, COUNT(*) AS cnt,
        COALESCE(SUM(at2.approved_credit), 0) AS total_credit
      FROM approval_transactions at2
      LEFT JOIN loan_requests lr ON lr.id = at2.loan_request_id
      WHERE at2.approval_status = 'approved' AND ${dateExpr}
      GROUP BY lr.property_type ORDER BY cnt DESC
    `, (err, rows) => resolve({ key: 'by_property', data: err ? [] : rows }))
  }))

  // 6. Recent approved
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT at2.id, c.case_code, lr.contact_name, at2.approved_credit,
        at2.interest_per_year, at2.approval_status, at2.updated_at
      FROM approval_transactions at2
      LEFT JOIN loan_requests lr ON lr.id = at2.loan_request_id
      LEFT JOIN cases c ON c.loan_request_id = lr.id
      WHERE at2.approval_status = 'approved' AND ${dateExpr}
      ORDER BY at2.updated_at DESC LIMIT 20
    `, (err, rows) => resolve({ key: 'recent_approved', data: err ? [] : rows }))
  }))

  Promise.all(queries).then(results => {
    const out = {}
    results.forEach(r => { out[r.key] = r.data })
    res.json({ success: true, period, dashboard: out })
  }).catch(e => res.status(500).json({ success: false, message: e.message }))
}

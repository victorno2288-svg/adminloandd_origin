const db = require('../config/db')
const path = require('path')
const fs = require('fs')
const { notifyStatusChange } = require('./notificationController')

// mapping fieldname → subfolder (ต้องตรงกับ uploadLegal.js)
const folderMap = {
  attachment: 'attachment',
  doc_selling_pledge: 'doc-selling-pledge',
  deed_selling_pledge: 'deed-selling-pledge',
  doc_extension: 'doc-extension',
  deed_extension: 'deed-extension',
  doc_redemption: 'doc-redemption',
  deed_redemption: 'deed-redemption',
  transaction_slip:   'transaction-slip',   // ★ สลิปค่าปากถุง (บันทึกลง cases)
  advance_slip:       'advance-slip',        // ★ สลิปค่าหักล่วงหน้า (บันทึกลง cases)
  tax_receipt:        'tax-receipt',         // ★ ใบเสร็จค่าธรรมเนียม/ภาษี
  agent_bank_book:    'agent-bank-book',     // ★ สมุดบัญชีนายหน้า
  debtor_bank_book:   'debtor-bank-book',    // ★ สมุดบัญชีลูกหนี้
  investor_bank_book: 'investor-bank-book',  // ★ สมุดบัญชีนายทุน
}

// ========== สถิติฝ่ายนิติกรรม ==========
exports.getStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM cases c LEFT JOIN legal_transactions lt ON lt.case_id = c.id WHERE lt.id IS NULL OR lt.legal_status = 'pending') AS pending_count,
      (SELECT COUNT(*) FROM legal_transactions WHERE legal_status = 'completed') AS completed_count,
      (SELECT COUNT(*) FROM legal_transactions WHERE legal_status = 'cancelled') AS cancelled_count,
      (SELECT COUNT(*) FROM cases) AS total_count
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getStats error:', err)
      return res.json({ success: true, stats: { pending_count: 0, completed_count: 0, cancelled_count: 0, total_count: 0 } })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== รายการเคสสำหรับฝ่ายนิติกรรม ==========
exports.getLegalCases = (req, res) => {
  const { status, date } = req.query

  let sql = `
    SELECT
      c.id AS case_id, c.case_code, c.status AS case_status,
      lr.appraisal_result, lr.appraisal_type, c.approved_amount,
      lr.debtor_code, lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      lr.province, lr.district, lr.property_address, lr.location_url,
      lt.id AS legal_id, lt.visit_date, lt.land_office, lt.time_slot, lt.team,
      lt.legal_status, lt.attachment, lt.doc_selling_pledge, lt.deed_selling_pledge,
      lt.doc_extension, lt.deed_extension, lt.doc_redemption, lt.deed_redemption,
      lt.tax_receipt, lt.borrower_id_card_legal,
      c.transaction_slip, c.advance_slip,
      lt.note, lt.created_at AS legal_created_at, lt.updated_at AS legal_updated_at
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN legal_transactions lt ON lt.case_id = c.id
    WHERE 1=1
  `

  const params = []
  if (status) {
    if (status === 'pending') {
      sql += ' AND (lt.legal_status = ? OR lt.id IS NULL)'
      params.push(status)
    } else {
      sql += ' AND lt.legal_status = ?'
      params.push(status)
    }
  }
  if (date) {
    sql += ' AND (DATE(lt.updated_at) = ? OR DATE(c.created_at) = ?)'
    params.push(date, date)
  }

  sql += ' ORDER BY c.id DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getLegalCases error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== ดึงข้อมูลเคสเดี่ยว (สำหรับหน้าแก้ไขฝ่ายนิติกรรม) ==========
exports.getLegalDetail = (req, res) => {
  const { caseId } = req.params

  // ตรวจสอบว่ามี legal_transaction สำหรับ case นี้หรือไม่
  db.query('SELECT id FROM legal_transactions WHERE case_id = ?', [caseId], (err0, existingLegal) => {
    if (err0) {
      console.error('getLegalDetail check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    // ถ้าไม่มี legal_transaction → สร้างใหม่
    if (!existingLegal || existingLegal.length === 0) {
      db.query(
        'INSERT INTO legal_transactions (case_id, legal_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('getLegalDetail insert error:', errInsert)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          // หลังจากสร้างแล้ว → ดึงข้อมูล
          fetchLegalDetail(caseId, res)
        }
      )
    } else {
      // มี legal_transaction แล้ว → ดึงข้อมูลทันที
      fetchLegalDetail(caseId, res)
    }
  })
}

function fetchLegalDetail(caseId, res) {
  const sql = `
    SELECT
      c.id, c.case_code, c.status, c.loan_request_id, c.created_at, c.updated_at,
      c.contract_start_date, c.contract_end_date, c.investor_amount, c.contract_redemption_amount,
      lr.appraisal_type, lr.appraisal_result, lr.appraisal_date, lr.appraisal_fee,
      c.transaction_date, c.transaction_time, c.transaction_land_office,
      c.transaction_note, c.transaction_recorded_by, c.transaction_recorded_at,
      lr.outside_result, lr.outside_reason, lr.outside_recorded_at,
      lr.inside_result, lr.inside_reason, lr.inside_recorded_at,
      lr.check_price_value, lr.check_price_detail, lr.check_price_recorded_at,
      lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.contact_email, lr.contact_facebook, lr.customer_gender, lr.existing_debt,
      lr.property_type, lr.loan_type_detail, lr.province, lr.district, lr.subdistrict,
      lr.house_no, lr.village_name, lr.additional_details,
      lr.property_address, lr.location_url,
      lr.deed_number, lr.deed_type, lr.land_area, lr.building_area, lr.has_obligation, lr.obligation_count,
      lr.images, lr.appraisal_images, lr.deed_images, lr.appraisal_book_image,
      -- ★ Financial fields for contract generation
      lr.interest_rate, lr.desired_amount, lr.contract_years, lr.advance_months, lr.net_desired_amount, lr.preliminary_terms,
      lt.id AS legal_id, lt.officer_name, lt.visit_date, lt.land_office, lt.time_slot, lt.team,
      lt.legal_status, lt.attachment, lt.doc_selling_pledge, lt.deed_selling_pledge,
      lt.doc_extension, lt.deed_extension, lt.doc_redemption, lt.deed_redemption,
      lt.commission_slip, lt.tax_receipt, lt.broker_contract, lt.broker_id,
      lt.house_reg_prop_legal, lt.borrower_id_card_legal,
      lt.note, lt.created_at AS legal_created_at, lt.updated_at AS legal_updated_at,
      lt.net_payout, lt.payment_method, lt.actual_transfer_fee, lt.actual_stamp_duty,
      lt.agent_bank_name, lt.agent_bank_account_no, lt.agent_bank_account_name,
      lt.agent_payment_slip, lt.agent_bank_book,
      -- ★ บัญชีลูกหนี้
      lr.bank_name AS debtor_bank_name, lr.bank_account_number AS debtor_bank_account_no,
      NULL AS debtor_bank_account_name, lr.bank_book_file AS debtor_bank_book,
      -- ★ บัญชีนายทุน per-case (จาก auction_transactions)
      auc.bank_name AS investor_bank_name, auc.bank_account_no AS investor_bank_account_no,
      auc.bank_account_name AS investor_bank_account_name, auc.bank_book_file AS investor_bank_book,
      -- ★ บัญชีนายทุน profile (จาก investors)
      inv.bank_name AS investor_bank_name_profile,
      inv.bank_account_number AS investor_bank_account_no_profile,
      inv.bank_account_name AS investor_bank_account_name_profile,
      lt.doc_checklist_json,
      c.broker_contract_file AS issuing_broker_contract,
      c.broker_id_file AS issuing_broker_id,
      at2.approval_type AS legal_approval_type, at2.approved_credit, at2.approval_date,
      a.full_name AS agent_name, a.phone AS agent_phone, a.agent_code,
      a.national_id AS agent_national_id,
      a.national_id_expiry AS agent_national_id_expiry,
      a.date_of_birth AS agent_date_of_birth,
      a.address AS agent_address,
      a.email AS agent_email,
      a.commission_rate AS agent_commission_rate,
      a.id_card_image AS agent_id_card_image,
      a.house_registration_image AS agent_house_registration_image,
      a.contract_file AS agent_contract_file_profile,
      a.bank_name AS agent_bank_name_profile,
      a.bank_account_number AS agent_bank_account_no_profile,
      a.bank_account_name AS agent_bank_account_name_profile,
      a.payment_slip AS agent_payment_slip_profile,
      -- ★ Investor info (จาก auction_transactions)
      auc.investor_name, auc.investor_code, auc.investor_phone,
      auc.property_value AS auction_property_value,
      auc.house_reg_book_legal, auc.spouse_consent_doc, auc.spouse_name_change_doc,
      -- ★ Investor profile (จาก investors)
      inv.full_name AS investor_full_name,
      inv.national_id AS investor_national_id,
      inv.national_id_expiry AS investor_national_id_expiry,
      inv.date_of_birth AS investor_date_of_birth,
      inv.nationality AS investor_nationality,
      inv.marital_status AS investor_profile_marital_status,
      inv.spouse_name AS investor_spouse_name,
      inv.spouse_national_id AS investor_spouse_national_id,
      inv.address AS investor_address,
      inv.phone AS investor_phone_profile,
      inv.id_card_image AS investor_id_card_image,
      -- Checklist docs (marital)
      lr.marital_status,
      c.investor_marital_status,
      lr.borrower_id_card, lr.house_reg_book, lr.name_change_doc, lr.divorce_doc,
      lr.spouse_id_card, lr.spouse_reg_copy, lr.marriage_cert,
      lr.single_cert, lr.death_cert, lr.will_court_doc, lr.testator_house_reg,
      -- Checklist docs (property)
      lr.deed_copy, lr.building_permit, lr.house_reg_prop, lr.sale_contract, lr.debt_free_cert,
      lr.blueprint, lr.property_photos, lr.land_tax_receipt, lr.maps_url,
      lr.condo_title_deed, lr.condo_location_map, lr.common_fee_receipt, lr.floor_plan,
      lr.location_sketch_map, lr.land_use_cert, lr.rental_contract, lr.business_reg,
      c.transaction_slip, c.advance_slip
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN legal_transactions lt ON lt.case_id = c.id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN auction_transactions auc ON auc.case_id = c.id
    LEFT JOIN investors inv ON inv.id = auc.investor_id
    WHERE c.id = ?
  `
  const isTableError = (e) => e && (
    e.code === 'ER_NO_SUCH_TABLE' || e.code === 'ER_BAD_FIELD_ERROR' || e.errno === 1932
  )
  db.query(sql, [caseId], (err, results) => {
    if (isTableError(err)) {
      // Fallback: ตัด auction_transactions + investors ออก
      const sqlSafe = sql
        .replace('LEFT JOIN auction_transactions auc ON auc.case_id = c.id', '')
        .replace('LEFT JOIN investors inv ON inv.id = auc.investor_id', '')
        .replace(/auc\.\w+(\s+AS\s+\w+)?/g, 'NULL$1')
        .replace(/inv\.\w+(\s+AS\s+\w+)?/g, 'NULL$1')
      return db.query(sqlSafe, [caseId], (err2, results2) => {
        if (err2) {
          console.error('fetchLegalDetail fallback error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        if (results2.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
        res.json({ success: true, caseData: results2[0] })
      })
    }
    if (err) {
      console.error('fetchLegalDetail error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
    res.json({ success: true, caseData: results[0] })
  })
}

// ========== อัพเดทเคส (ฝ่ายนิติกรรม — รองรับ FormData + อัพโหลดเอกสาร) ==========
exports.updateLegal = (req, res) => {
  const { caseId } = req.params
  const body = req.body || {}
  const {
    officer_name, visit_date, land_office, time_slot, team, legal_status, note,
    net_payout, payment_method, actual_transfer_fee, actual_stamp_duty,  // ★ Financial Protocol
    agent_bank_name, agent_bank_account_no, agent_bank_account_name,     // ★ บัญชีนายหน้า
    debtor_bank_name, debtor_bank_account_no, debtor_bank_account_name,  // ★ บัญชีลูกหนี้
    investor_bank_name, investor_bank_account_no, investor_bank_account_name, // ★ บัญชีนายทุน
    investor_marital_status,                                              // ★ สถานะภาพนายทุน (SOP 2.3.3)
    doc_checklist_json,                                                   // ★ SOP Document Checklist tick state
    contract_start_date, contract_end_date,                               // ★ วันทำสัญญา + วันหมดอายุ
    contract_years, interest_rate,                                        // ★ ระยะสัญญา + ดอกเบี้ย (แก้ไขได้โดยนิติกรรม)
    contract_redemption_amount                                            // ★ ยอดสินไถ่ (ขายฝาก)
  } = body
  // notify_types อาจมาเป็น JSON string (จาก FormData) หรือ array (จาก JSON body)
  let notify_types = []
  if (body.notify_types) {
    try { notify_types = Array.isArray(body.notify_types) ? body.notify_types : JSON.parse(body.notify_types) } catch { notify_types = [] }
  }

  const buildAndExecuteUpdate = () => {
    doUpdate()
  }

  const doUpdate = () => {
    const fields = []
    const values = []

    if (officer_name !== undefined) { fields.push('officer_name=?'); values.push(officer_name || null) }
    if (visit_date !== undefined) { fields.push('visit_date=?'); values.push(visit_date || null) }
    if (land_office !== undefined) { fields.push('land_office=?'); values.push(land_office || null) }
    if (time_slot !== undefined) { fields.push('time_slot=?'); values.push(time_slot || null) }
    if (team !== undefined) { fields.push('team=?'); values.push(team || null) }
    if (legal_status !== undefined) { fields.push('legal_status=?'); values.push(legal_status || 'pending') }
    if (note !== undefined) { fields.push('note=?'); values.push(note || null) }
    // ★ Financial Protocol
    if (net_payout !== undefined) { fields.push('net_payout=?'); values.push(net_payout || null) }
    if (payment_method !== undefined) { fields.push('payment_method=?'); values.push(payment_method || null) }
    if (actual_transfer_fee !== undefined) { fields.push('actual_transfer_fee=?'); values.push(actual_transfer_fee || null) }
    if (actual_stamp_duty !== undefined) { fields.push('actual_stamp_duty=?'); values.push(actual_stamp_duty || null) }
    // ★ บัญชีนายหน้า
    if (agent_bank_name !== undefined) { fields.push('agent_bank_name=?'); values.push(agent_bank_name || null) }
    if (agent_bank_account_no !== undefined) { fields.push('agent_bank_account_no=?'); values.push(agent_bank_account_no || null) }
    if (agent_bank_account_name !== undefined) { fields.push('agent_bank_account_name=?'); values.push(agent_bank_account_name || null) }
    // ★ SOP Document Checklist
    if (doc_checklist_json !== undefined) { fields.push('doc_checklist_json=?'); values.push(doc_checklist_json || null) }

    // จัดการไฟล์อัพโหลด
    const files = req.files || {}
    const docFields = [
      'attachment', 'doc_selling_pledge', 'deed_selling_pledge',
      'doc_extension', 'deed_extension', 'doc_redemption', 'deed_redemption',
      'tax_receipt',           // ★ ใบเสร็จค่าธรรมเนียม/ภาษี
      'borrower_id_card_legal', // ★ บัตรประชาชนเจ้าของทรัพย์ (อัพโหลดโดยฝ่ายนิติ)
    ]

    docFields.forEach(docField => {
      if (files[docField] && files[docField].length > 0) {
        const subfolder = folderMap[docField] || 'general'
        const docPath = `uploads/legal/${subfolder}/${files[docField][0].filename}`
        fields.push(`${docField}=?`)
        values.push(docPath)
      }
    })

    // ★ transaction_slip บันทึกลง cases table แทน
    if (files['transaction_slip'] && files['transaction_slip'].length > 0) {
      const slipPath = `uploads/legal/transaction-slip/${files['transaction_slip'][0].filename}`
      db.query('UPDATE cases SET transaction_slip=? WHERE id=?', [slipPath, caseId], (errSlip) => {
        if (errSlip) console.error('[legalController] update transaction_slip error:', errSlip)
      })
    }
    // ★ advance_slip บันทึกลง cases table
    if (files['advance_slip'] && files['advance_slip'].length > 0) {
      const advPath = `uploads/legal/advance-slip/${files['advance_slip'][0].filename}`
      db.query('UPDATE cases SET advance_slip=? WHERE id=?', [advPath, caseId], (errAdv) => {
        if (errAdv) console.error('[legalController] update advance_slip error:', errAdv)
      })
    }

    // ★ agent_bank_book — สมุดบัญชีนายหน้า (OCR ทาง client, เก็บไฟล์ใน legal_transactions)
    if (files['agent_bank_book'] && files['agent_bank_book'].length > 0) {
      const bookPath = `uploads/legal/agent-bank-book/${files['agent_bank_book'][0].filename}`
      fields.push('agent_bank_book=?')
      values.push(bookPath)
      // sync กลับ agents table (bank_book_file)
      db.query('SELECT lr.agent_id FROM cases c JOIN loan_requests lr ON lr.id=c.loan_request_id WHERE c.id=?', [caseId], (errBk, bkRows) => {
        if (!errBk && bkRows.length && bkRows[0].agent_id) {
          db.query('UPDATE agents SET bank_book_file=? WHERE id=?', [bookPath, bkRows[0].agent_id], () => {})
        }
      })
    }

    // ★ agent_payment_slip — เก็บใน legal_transactions + sync กลับ agents table
    if (files['agent_payment_slip'] && files['agent_payment_slip'].length > 0) {
      const slipPath = `uploads/legal/agent-payment-slip/${files['agent_payment_slip'][0].filename}`
      fields.push('agent_payment_slip=?')
      values.push(slipPath)
      // sync กลับ agents table
      db.query('SELECT lr.agent_id FROM cases c JOIN loan_requests lr ON lr.id=c.loan_request_id WHERE c.id=?', [caseId], (errA, agentRows) => {
        if (!errA && agentRows.length && agentRows[0].agent_id) {
          db.query('UPDATE agents SET payment_slip=? WHERE id=?', [slipPath, agentRows[0].agent_id], (errSync) => {
            if (errSync) console.error('[legal] sync agent payment_slip error:', errSync)
          })
        }
      })
    }

    // ★ sync agent bank fields กลับ agents table (เมื่อฝ่ายนิติกรอก)
    if (agent_bank_name !== undefined || agent_bank_account_no !== undefined || agent_bank_account_name !== undefined) {
      const syncFields = []
      const syncVals = []
      if (agent_bank_name !== undefined) { syncFields.push('bank_name=?'); syncVals.push(agent_bank_name || null) }
      if (agent_bank_account_no !== undefined) { syncFields.push('bank_account_number=?'); syncVals.push(agent_bank_account_no || null) }
      if (agent_bank_account_name !== undefined) { syncFields.push('bank_account_name=?'); syncVals.push(agent_bank_account_name || null) }
      if (syncFields.length > 0) {
        db.query('SELECT lr.agent_id FROM cases c JOIN loan_requests lr ON lr.id=c.loan_request_id WHERE c.id=?', [caseId], (errA2, rows2) => {
          if (!errA2 && rows2.length && rows2[0].agent_id) {
            syncVals.push(rows2[0].agent_id)
            db.query(`UPDATE agents SET ${syncFields.join(', ')} WHERE id=?`, syncVals, (errSync2) => {
              if (errSync2) console.error('[legal] sync agent bank error:', errSync2)
            })
          }
        })
      }
    }

    // ★ บัญชีลูกหนี้ — เก็บใน loan_requests
    if (debtor_bank_name !== undefined || debtor_bank_account_no !== undefined || debtor_bank_account_name !== undefined) {
      db.query('SELECT loan_request_id FROM cases WHERE id=?', [caseId], (errDlr, dlrRows) => {
        if (!errDlr && dlrRows.length && dlrRows[0].loan_request_id) {
          const dFields = []; const dVals = []
          if (debtor_bank_name !== undefined) { dFields.push('bank_name=?'); dVals.push(debtor_bank_name || null) }
          if (debtor_bank_account_no !== undefined) { dFields.push('bank_account_number=?'); dVals.push(debtor_bank_account_no || null) }
          if (debtor_bank_account_name !== undefined) { dFields.push('bank_account_name=?'); dVals.push(debtor_bank_account_name || null) }
          if (dFields.length) {
            dVals.push(dlrRows[0].loan_request_id)
            db.query(`UPDATE loan_requests SET ${dFields.join(', ')} WHERE id=?`, dVals, (errD) => {
              if (errD) console.error('[legal] update debtor bank error:', errD)
            })
          }
        }
      })
    }

    // ★ สมุดบัญชีลูกหนี้ — อัพโหลดและเก็บใน loan_requests.bank_book_file
    if (files['debtor_bank_book'] && files['debtor_bank_book'].length > 0) {
      const bookPath = `uploads/legal/debtor-bank-book/${files['debtor_bank_book'][0].filename}`
      db.query('SELECT loan_request_id FROM cases WHERE id=?', [caseId], (errDlr2, dlrRows2) => {
        if (!errDlr2 && dlrRows2.length && dlrRows2[0].loan_request_id) {
          db.query('UPDATE loan_requests SET bank_book_file=? WHERE id=?', [bookPath, dlrRows2[0].loan_request_id], (errDB) => {
            if (errDB) console.error('[legal] update debtor bank_book_file error:', errDB)
          })
        }
      })
    }

    // ★ บัญชีนายทุน — เก็บใน auction_transactions
    if (investor_bank_name !== undefined || investor_bank_account_no !== undefined || investor_bank_account_name !== undefined) {
      const iFields = []; const iVals = []
      if (investor_bank_name !== undefined) { iFields.push('bank_name=?'); iVals.push(investor_bank_name || null) }
      if (investor_bank_account_no !== undefined) { iFields.push('bank_account_no=?'); iVals.push(investor_bank_account_no || null) }
      if (investor_bank_account_name !== undefined) { iFields.push('bank_account_name=?'); iVals.push(investor_bank_account_name || null) }
      if (iFields.length) {
        iVals.push(caseId)
        db.query(`UPDATE auction_transactions SET ${iFields.join(', ')} WHERE case_id=? AND is_cancelled=0`, iVals, (errI) => {
          if (errI) console.error('[legal] update investor bank error:', errI)
        })
      }
    }

    // ★ สมุดบัญชีนายทุน — อัพโหลดและเก็บใน auction_transactions.bank_book_file
    if (files['investor_bank_book'] && files['investor_bank_book'].length > 0) {
      const bookPath = `uploads/legal/investor-bank-book/${files['investor_bank_book'][0].filename}`
      db.query('UPDATE auction_transactions SET bank_book_file=? WHERE case_id=? AND is_cancelled=0', [bookPath, caseId], (errIB) => {
        if (errIB) console.error('[legal] update investor bank_book_file error:', errIB)
      })
    }

    // ★ investor_marital_status เก็บใน cases table
    if (investor_marital_status !== undefined) {
      db.query('UPDATE cases SET investor_marital_status=? WHERE id=?', [investor_marital_status || null, caseId], (errIms) => {
        if (errIms) console.error('update investor_marital_status error:', errIms)
      })
    }

    // ★ contract dates + redemption_amount เก็บใน cases table
    if (contract_start_date !== undefined || contract_end_date !== undefined || contract_redemption_amount !== undefined) {
      const cFields = []
      const cVals = []
      if (contract_start_date !== undefined) { cFields.push('contract_start_date=?'); cVals.push(contract_start_date || null) }
      if (contract_end_date !== undefined) { cFields.push('contract_end_date=?'); cVals.push(contract_end_date || null) }
      if (contract_redemption_amount !== undefined) { cFields.push('contract_redemption_amount=?'); cVals.push(contract_redemption_amount || null) }
      if (cFields.length > 0) {
        cVals.push(caseId)
        db.query(`UPDATE cases SET ${cFields.join(', ')} WHERE id=?`, cVals, (errC) => {
          if (errC) console.error('update contract dates error:', errC)
        })
      }
    }

    // ★ contract_years + interest_rate เก็บใน loan_requests (ฝ่ายนิติกรรมปรับได้)
    if (contract_years !== undefined || interest_rate !== undefined) {
      // หา loan_request_id จาก case
      db.query('SELECT loan_request_id FROM cases WHERE id=?', [caseId], (errLr, lrRows) => {
        if (errLr || !lrRows.length || !lrRows[0].loan_request_id) return
        const lrId = lrRows[0].loan_request_id
        const lrFields = []
        const lrVals = []
        if (contract_years !== undefined) { lrFields.push('contract_years=?'); lrVals.push(contract_years || null) }
        if (interest_rate !== undefined) { lrFields.push('interest_rate=?'); lrVals.push(interest_rate || null) }
        if (lrFields.length > 0) {
          lrVals.push(lrId)
          db.query(`UPDATE loan_requests SET ${lrFields.join(', ')} WHERE id=?`, lrVals, (errLrUpd) => {
            if (errLrUpd) console.error('update loan_requests contract fields error:', errLrUpd)
          })
        }
      })
    }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

    values.push(caseId)
    const sql = `UPDATE legal_transactions SET ${fields.join(', ')} WHERE case_id=?`
    db.query(sql, values, (err) => {
      if (err) {
        console.error('updateLegal error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      // ===== auto-sync cases.status ตาม legal_status =====
      let newCaseStatus = null
      if (legal_status === 'completed') {
        newCaseStatus = 'legal_completed'
      } else if (visit_date) {
        newCaseStatus = 'legal_scheduled'
      }

      if (newCaseStatus) {
        db.query('UPDATE cases SET status = ? WHERE id = ?', [newCaseStatus, caseId], (err2) => {
          if (err2) console.error('sync cases.status error:', err2)

          // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) =====
          db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err3, rows) => {
            if (!err3 && rows.length > 0 && rows[0].loan_request_id) {
              const io = req.app.get('io')
              const userId = req.user ? req.user.id : null
              const extraInfo = visit_date ? ('วันที่ ' + visit_date) : ''
              notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, newCaseStatus, io, userId, extraInfo)
              // ส่ง manual notifications เพิ่มเติม
              if (notify_types && Array.isArray(notify_types) && notify_types.length > 0) {
                const io2 = req.app.get('io')
                const userId2 = req.user ? req.user.id : null
                notify_types.forEach(type => {
                  try { notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, type, io2, userId2) } catch (e) { console.error('notify error:', e.message) }
                })
              }
            }
          })

          res.json({ success: true, message: 'อัพเดทข้อมูลนิติกรรมสำเร็จ' })
        })
      } else {
        // ส่ง manual notifications ถ้าไม่มี newCaseStatus
        if (notify_types && Array.isArray(notify_types) && notify_types.length > 0) {
          db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (errNt, ntRows) => {
            if (!errNt && ntRows.length > 0 && ntRows[0].loan_request_id) {
              const io = req.app.get('io')
              const userId = req.user ? req.user.id : null
              notify_types.forEach(type => {
                try { notifyStatusChange(ntRows[0].loan_request_id, parseInt(caseId), null, type, io, userId) } catch (e) { console.error('notify error:', e.message) }
              })
            }
          })
        }
        res.json({ success: true, message: 'อัพเดทข้อมูลนิติกรรมสำเร็จ' })
      }
    })
  }

  // ตรวจสอบว่ามี legal_transaction หรือยัง ถ้ายังไม่มีให้สร้างก่อน
  db.query('SELECT id FROM legal_transactions WHERE case_id = ?', [caseId], (err0, existing) => {
    if (err0) {
      console.error('updateLegal check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO legal_transactions (case_id, legal_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('updateLegal insert error:', errInsert)
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

// ========== ลบเอกสารเฉพาะ (ฝ่ายนิติกรรม) — ลบไฟล์จริงจาก disk ด้วย ==========
exports.deleteDocument = (req, res) => {
  const { case_id, column } = req.body

  // อนุญาตแค่คอลัมน์ที่กำหนด
  const allowed = [
    'attachment', 'doc_selling_pledge', 'deed_selling_pledge',
    'doc_extension', 'deed_extension', 'doc_redemption', 'deed_redemption',
    'tax_receipt',         // ★ ใบเสร็จค่าธรรมเนียม/ภาษี
    'transaction_slip',    // ★ สลิปค่าปากถุง (บันทึกลง cases)
    'advance_slip',        // ★ สลิปค่าหักล่วงหน้า (บันทึกลง cases)
  ]

  if (!allowed.includes(column)) {
    return res.status(400).json({ success: false, message: 'Not allowed' })
  }

  // transaction_slip / advance_slip อยู่ใน cases table
  if (column === 'transaction_slip' || column === 'advance_slip') {
    db.query(`SELECT ${column} FROM cases WHERE id = ?`, [case_id], (errSel, rows) => {
      if (errSel) return res.status(500).json({ success: false, message: 'Server Error' })
      const oldPath = rows && rows[0] ? rows[0][column] : null
      db.query(`UPDATE cases SET ${column} = NULL WHERE id = ?`, [case_id], (errUpd) => {
        if (errUpd) return res.status(500).json({ success: false, message: 'Server Error' })
        if (oldPath) {
          const fullPath = path.join(__dirname, '..', oldPath)
          fs.unlink(fullPath, (e) => { if (e) console.error('ลบไฟล์จาก disk ไม่สำเร็จ:', e.message) })
        }
        res.json({ success: true, message: 'ลบเอกสารสำเร็จ' })
      })
    })
    return
  }

  // ดึง path เดิมจาก DB ก่อน เพื่อลบไฟล์จริง
  db.query(
    `SELECT ${column} FROM legal_transactions WHERE case_id = ?`,
    [case_id],
    (errSelect, rows) => {
      if (errSelect) {
        console.error('deleteDocument select error:', errSelect)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      const oldFilePath = rows && rows[0] ? rows[0][column] : null

      // SET column = NULL ใน DB
      db.query(
        `UPDATE legal_transactions SET ${column} = NULL WHERE case_id = ?`,
        [case_id],
        (err) => {
          if (err) {
            console.error('deleteDocument error:', err)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }

          // ลบไฟล์จริงจาก disk
          if (oldFilePath) {
            const fullPath = path.join(__dirname, '..', oldFilePath)
            fs.unlink(fullPath, (unlinkErr) => {
              if (unlinkErr) console.error('ลบไฟล์จาก disk ไม่สำเร็จ:', unlinkErr.message)
              else console.log('ลบไฟล์สำเร็จ:', fullPath)
            })
          }

          res.json({ success: true, message: 'ลบเอกสารสำเร็จ' })
        }
      )
    }
  )
}

// ========== อัพโหลดไฟล์ต่อ item ใน SOP Checklist ==========
exports.uploadChecklistFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'ไม่มีไฟล์' })
  }
  const filePath = `uploads/legal/checklist/${req.file.filename}`
  res.json({ success: true, filePath })
}

// ========== ลบไฟล์ checklist item จาก disk ==========
exports.deleteChecklistFile = (req, res) => {
  const { filePath } = req.body
  if (!filePath || !filePath.startsWith('uploads/legal/checklist/')) {
    return res.status(400).json({ success: false, message: 'Invalid file path' })
  }
  const abs = path.join(__dirname, '..', filePath)
  fs.unlink(abs, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('deleteChecklistFile error:', err)
      return res.status(500).json({ success: false, message: 'ลบไฟล์ไม่สำเร็จ' })
    }
    res.json({ success: true })
  })
}
// ========== legal_documents — ดึงรายการไฟล์ทั้งหมดของเคส ==========
exports.getLegalDocuments = (req, res) => {
  const { caseId } = req.params
  db.query(
    'SELECT * FROM legal_documents WHERE case_id = ? ORDER BY created_at DESC',
    [caseId],
    (err, rows) => {
      if (err) { console.error('getLegalDocuments error:', err); return res.status(500).json({ success: false, message: 'Server Error' }) }
      res.json({ success: true, documents: rows })
    }
  )
}

// ========== legal_documents — อัพโหลด PDF ใหม่ ==========
exports.uploadLegalDocument = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'ไม่มีไฟล์' })
  const { caseId } = req.params
  const { note } = req.body
  const filePath = `uploads/legal/legal-docs/${req.file.filename}`
  const fileName = req.file.originalname
  const fileSize = req.file.size

  // ดึง loan_request_id จาก cases เพื่อเก็บไว้ด้วย
  db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (errC, rows) => {
    const loanRequestId = rows && rows[0] ? rows[0].loan_request_id : null
    db.query(
      'INSERT INTO legal_documents (case_id, loan_request_id, file_path, file_name, file_size, note, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [caseId, loanRequestId, filePath, fileName, fileSize, note || null],
      (err, result) => {
        if (err) { console.error('uploadLegalDocument error:', err); return res.status(500).json({ success: false, message: 'Server Error' }) }
        res.json({ success: true, document: { id: result.insertId, file_path: filePath, file_name: fileName, file_size: fileSize, note: note || null, created_at: new Date() } })
      }
    )
  })
}

// ========== legal_documents — ลบไฟล์ ==========
exports.deleteLegalDocument = (req, res) => {
  const { docId } = req.params
  db.query('SELECT file_path FROM legal_documents WHERE id = ?', [docId], (errSel, rows) => {
    if (errSel) return res.status(500).json({ success: false, message: 'Server Error' })
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบไฟล์' })
    const filePath = rows[0].file_path
    db.query('DELETE FROM legal_documents WHERE id = ?', [docId], (errDel) => {
      if (errDel) return res.status(500).json({ success: false, message: 'Server Error' })
      // ลบไฟล์จาก disk
      const abs = path.join(__dirname, '..', filePath)
      fs.unlink(abs, (e) => { if (e) console.error('ลบไฟล์ disk ไม่สำเร็จ:', e.message) })
      res.json({ success: true })
    })
  })
}

// ========== รวมเอกสารทั้งหมดของเคสเป็น PDF เดียว ==========
exports.mergeCaseDocs = async (req, res) => {
  const { caseId } = req.params
  try {
    const { PDFDocument, rgb, StandardFonts } = require('pdf-lib')

    // ดึงข้อมูลเคส + เส้นทางไฟล์ทั้งหมด
    const sql = `
      SELECT
        c.case_code, lr.contact_name AS debtor_name, lr.debtor_code,
        lt.attachment, lt.doc_selling_pledge, lt.deed_selling_pledge,
        lt.doc_extension, lt.deed_extension, lt.doc_redemption, lt.deed_redemption,
        lt.tax_receipt, lt.borrower_id_card_legal,
        c.transaction_slip, c.advance_slip
      FROM cases c
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      LEFT JOIN legal_transactions lt ON lt.case_id = c.id
      WHERE c.id = ?
    `
    db.query(sql, [caseId], async (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบเคส' })

      const row = rows[0]
      const docFields = [
        { label: 'สลิปโอนเงินค่าปากถุง',    src: row.transaction_slip },
        { label: 'สลิปค่าหักล่วงหน้า',       src: row.advance_slip },
        { label: 'ใบเสร็จค่าธรรมเนียม/ภาษี', src: row.tax_receipt },
        { label: 'บัตรประชาชนเจ้าของทรัพย์',  src: row.borrower_id_card_legal },
        { label: 'เอกสารแนบท้าย',            src: row.attachment },
        { label: 'เอกสารขายฝาก/จำนอง',       src: row.doc_selling_pledge },
        { label: 'โฉนดขายฝาก/จำนอง',         src: row.deed_selling_pledge },
        { label: 'เอกสารขยาย',              src: row.doc_extension },
        { label: 'โฉนดขยาย',                src: row.deed_extension },
        { label: 'เอกสารไถ่ถอน',            src: row.doc_redemption },
        { label: 'โฉนดไถ่ถอน',              src: row.deed_redemption },
      ].filter(d => d.src)

      if (docFields.length === 0) {
        return res.status(404).json({ success: false, message: 'ไม่มีเอกสารในเคสนี้' })
      }

      const mergedPdf = await PDFDocument.create()
      const font = await mergedPdf.embedFont(StandardFonts.Helvetica)

      for (const doc of docFields) {
        const filePath = path.join(__dirname, '..', doc.src)
        if (!fs.existsSync(filePath)) continue

        const fileBytes = fs.readFileSync(filePath)
        const ext = path.extname(filePath).toLowerCase()

        try {
          if (ext === '.pdf') {
            // merge PDF pages
            const srcPdf = await PDFDocument.load(fileBytes)
            const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices())
            pages.forEach(p => mergedPdf.addPage(p))
          } else if (['.jpg', '.jpeg'].includes(ext)) {
            const img = await mergedPdf.embedJpg(fileBytes)
            const page = mergedPdf.addPage([img.width, img.height])
            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
          } else if (ext === '.png') {
            const img = await mergedPdf.embedPng(fileBytes)
            const page = mergedPdf.addPage([img.width, img.height])
            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
          }
        } catch (embedErr) {
          console.error(`ข้ามไฟล์ ${doc.label}:`, embedErr.message)
        }
      }

      const pdfBytes = await mergedPdf.save()
      const filename = `docs_${row.case_code || caseId}.pdf`
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.end(Buffer.from(pdfBytes))
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

const db = require('../config/db')
const { notifyStatusChange } = require('./notificationController')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Multer สำหรับอัพโหลดสลิปโอนเงิน
const transferSlipDir = path.join(__dirname, '..', 'uploads', 'transfer_slips')
if (!fs.existsSync(transferSlipDir)) fs.mkdirSync(transferSlipDir, { recursive: true })
const transferSlipMulter = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, transferSlipDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `transfer_${req.params.caseId}_${Date.now()}${ext}`)
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('รองรับเฉพาะ JPG, PNG, PDF, WEBP'))
  }
}).single('transfer_slip')

exports.uploadTransferSlip = (req, res) => {
  const { caseId } = req.params
  transferSlipMulter(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'อัพโหลดไม่สำเร็จ' })
    if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์' })
    const filePath = `/uploads/transfer_slips/${req.file.filename}`
    db.query('UPDATE auction_transactions SET transfer_slip = ?, updated_at = NOW() WHERE case_id = ?', [filePath, caseId], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true, message: 'อัพโหลดสลิปสำเร็จ', file_path: filePath })
    })
  })
}

// ========== สถิติฝ่ายประมูลทรัพย์ ==========
exports.getStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM cases c LEFT JOIN auction_transactions auc ON auc.case_id = c.id WHERE auc.id IS NULL OR auc.auction_status = 'pending') AS pending_count,
      (SELECT COUNT(*) FROM auction_transactions WHERE auction_status = 'auctioned') AS auctioned_count,
      (SELECT COUNT(*) FROM auction_transactions WHERE auction_status = 'cancelled') AS cancelled_count,
      (SELECT COUNT(*) FROM cases) AS total_count
  `
  db.query(sql, (err, results) => {
    if (err) {
      // ถ้า auction_transactions ไม่มี → ใช้ query แบบไม่มี auction table
      if (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146 || err.errno === 1932) {
        const fallbackSql = `SELECT (SELECT COUNT(*) FROM cases) AS total_count`
        return db.query(fallbackSql, (err2, rows2) => {
          const total = (!err2 && rows2 && rows2[0]) ? rows2[0].total_count : 0
          return res.json({ success: true, stats: { pending_count: total, auctioned_count: 0, cancelled_count: 0, total_count: total } })
        })
      }
      console.error('getStats error:', err)
      return res.json({ success: true, stats: { pending_count: 0, auctioned_count: 0, cancelled_count: 0, total_count: 0 } })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== รายการเคสสำหรับฝ่ายประมูลทรัพย์ ==========
exports.getAuctionCases = (req, res) => {
  const { status, date } = req.query

  let sql = `
    SELECT
      c.id AS case_id, c.case_code, c.status AS case_status,
      lr.appraisal_result, lr.appraisal_type, lr.appraisal_book_image,
      lr.debtor_code, lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      lr.province, lr.district, lr.property_address, lr.location_url,
      lr.images, lr.appraisal_images, lr.deed_images,
      a.full_name AS agent_name, a.phone AS agent_phone, a.agent_code,
      auc.id AS auction_id, auc.investor_id, auc.investor_name, auc.investor_code,
      auc.investor_phone, auc.auction_status,
      auc.created_at AS auction_created_at, auc.updated_at AS auction_updated_at,
      lr.marital_status,
      lr.borrower_id_card, lr.house_reg_book, lr.name_change_doc, lr.divorce_doc,
      lr.spouse_id_card, lr.spouse_reg_copy, lr.marriage_cert,
      lr.single_cert, lr.death_cert, lr.will_court_doc, lr.testator_house_reg,
      lr.deed_copy, lr.building_permit, lr.house_reg_prop, lr.sale_contract, lr.debt_free_cert,
      lr.blueprint, lr.property_photos, lr.land_tax_receipt,
      lr.condo_title_deed, lr.condo_location_map, lr.common_fee_receipt, lr.floor_plan,
      lr.location_sketch_map, lr.land_use_cert, lr.rental_contract, lr.business_reg,
      lr.property_type
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN auction_transactions auc ON auc.case_id = c.id
    WHERE 1=1
  `

  const params = []
  if (status) {
    if (status === 'pending') {
      sql += ' AND (auc.auction_status = ? OR auc.id IS NULL)'
      params.push(status)
    } else {
      sql += ' AND auc.auction_status = ?'
      params.push(status)
    }
  }
  if (date) {
    sql += ' AND (DATE(auc.updated_at) = ? OR DATE(c.created_at) = ?)'
    params.push(date, date)
  }

  sql += ' ORDER BY c.id DESC'

  const isAucTableError = (e) => e && (
    e.code === 'ER_BAD_FIELD_ERROR' || e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1932
  )
  db.query(sql, params, (err, results) => {
    if (isAucTableError(err)) {
      // Fallback สุดท้าย: ตัด auction_transactions ออกทั้งหมด — แสดง cases โดยไม่มีข้อมูลนายทุน
      const sqlMinimal = `
        SELECT
          c.id AS case_id, c.case_code, c.status AS case_status,
          lr.appraisal_result, lr.appraisal_type, lr.appraisal_book_image,
          lr.debtor_code, lr.contact_name AS debtor_name,
          lr.contact_phone AS debtor_phone,
          lr.province, lr.district, lr.property_address, lr.location_url,
          lr.images, lr.appraisal_images, lr.deed_images,
          a.full_name AS agent_name, a.phone AS agent_phone, a.agent_code,
          NULL AS auction_id, NULL AS investor_id, NULL AS investor_name, NULL AS investor_code,
          NULL AS investor_phone, NULL AS auction_status,
          NULL AS auction_created_at, NULL AS auction_updated_at,
          lr.marital_status,
          lr.borrower_id_card, lr.house_reg_book, lr.name_change_doc, lr.divorce_doc,
          lr.spouse_id_card, lr.spouse_reg_copy, lr.marriage_cert,
          lr.single_cert, lr.death_cert, lr.will_court_doc, lr.testator_house_reg,
          lr.deed_copy, lr.building_permit, lr.house_reg_prop, lr.sale_contract,
          lr.debt_free_cert, lr.blueprint, lr.property_photos, lr.land_tax_receipt,
          lr.condo_title_deed, lr.condo_location_map, lr.common_fee_receipt, lr.floor_plan,
          lr.location_sketch_map, lr.land_use_cert, lr.rental_contract, lr.business_reg,
          lr.property_type
        FROM cases c
        LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
        LEFT JOIN agents a ON a.id = c.agent_id
        WHERE 1=1
        ORDER BY c.id DESC`
      return db.query(sqlMinimal, [], (err2, results2) => {
        if (err2) {
          console.error('getAuctionCases minimal fallback error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, data: results2 })
      })
    }
    if (err) {
      console.error('getAuctionCases error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== ดึงข้อมูลเคสเดี่ยว (หน้าแก้ไข) ==========
exports.getAuctionDetail = (req, res) => {
  const { caseId } = req.params
  const isAucTableError = (e) => e && (
    e.code === 'ER_BAD_FIELD_ERROR' || e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1932
  )

  db.query('SELECT id FROM auction_transactions WHERE case_id = ?', [caseId], (err0, existing) => {
    if (err0 && isAucTableError(err0)) {
      // auction_transactions engine error → ข้าม INSERT แล้ว fetch ตรง (จะได้ NULL ทุก auc.*)
      return fetchAuctionDetail(caseId, res)
    }
    if (err0) {
      console.error('getAuctionDetail check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO auction_transactions (case_id, auction_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert && isAucTableError(errInsert)) {
            return fetchAuctionDetail(caseId, res)
          }
          if (errInsert) {
            console.error('getAuctionDetail insert error:', errInsert)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          fetchAuctionDetail(caseId, res)
        }
      )
    } else {
      fetchAuctionDetail(caseId, res)
    }
  })
}

function fetchAuctionDetail(caseId, res) {
  const sql = `
    SELECT
      c.*,
      lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
      lr.property_type, lr.province, lr.district, lr.subdistrict,
      lr.property_address, lr.location_url,
      lr.deed_number, lr.land_area, lr.has_obligation, lr.obligation_count,
      lr.images, lr.appraisal_images, lr.deed_images,
      lr.loan_type_detail, lr.check_price_value, lr.appraisal_book_image, lr.appraisal_result,
      a.full_name AS agent_name, a.phone AS agent_phone, a.agent_code,
      auc.id AS auction_id,
      auc.investor_id, auc.investor_name, auc.investor_code, auc.investor_phone,
      auc.investor_type, auc.property_value,
      auc.selling_pledge_amount, auc.interest_rate,
      auc.auction_land_area, auc.contract_years,
      auc.is_cancelled, auc.auction_status,
      auc.sale_type,
      auc.bank_name, auc.bank_account_no, auc.bank_account_name, auc.transfer_slip,
      auc.recorded_by, auc.recorded_at,
      auc.created_at AS auction_created_at, auc.updated_at AS auction_updated_at,
      auc.house_reg_book_legal,
      auc.spouse_consent_doc, auc.spouse_name_change_doc,
      lr.borrower_id_card, lr.house_reg_book, lr.name_change_doc, lr.divorce_doc,
      lr.spouse_id_card, lr.spouse_reg_copy, lr.marriage_cert,
      lr.single_cert, lr.death_cert, lr.will_court_doc, lr.testator_house_reg,
      lr.marital_status,
      -- Property type checklist docs
      lr.deed_copy, lr.building_permit, lr.house_reg_prop, lr.sale_contract, lr.debt_free_cert,
      lr.blueprint, lr.property_photos, lr.land_tax_receipt, lr.maps_url,
      lr.condo_title_deed, lr.condo_location_map, lr.common_fee_receipt, lr.floor_plan,
      lr.location_sketch_map, lr.land_use_cert, lr.rental_contract, lr.business_reg,
      -- Legal transaction fields (shared with Legal dept)
      lt.officer_name AS lt_officer_name,
      lt.visit_date AS lt_visit_date,
      lt.land_office AS lt_land_office,
      lt.time_slot AS lt_time_slot,
      lt.legal_status AS lt_legal_status
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN auction_transactions auc ON auc.case_id = c.id
    LEFT JOIN legal_transactions lt ON lt.case_id = c.id
    WHERE c.id = ?
  `
  const isAucTableError = (e) => e && (
    e.code === 'ER_BAD_FIELD_ERROR' || e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1932
  )
  db.query(sql, [caseId], (err, results) => {
    if (isAucTableError(err)) {
      // Fallback สุดท้าย: ตัด auction_transactions ออก → auc.* ทั้งหมดเป็น NULL
      const sqlMinimal = `
        SELECT
          c.*,
          lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
          lr.property_type, lr.province, lr.district, lr.subdistrict,
          lr.property_address, lr.location_url,
          lr.deed_number, lr.land_area, lr.has_obligation, lr.obligation_count,
          lr.images, lr.appraisal_images, lr.deed_images,
          lr.loan_type_detail, lr.check_price_value, lr.appraisal_book_image, lr.appraisal_result,
          lr.borrower_id_card, lr.house_reg_book, lr.name_change_doc, lr.divorce_doc,
          lr.spouse_id_card, lr.spouse_reg_copy, lr.marriage_cert,
          lr.single_cert, lr.death_cert, lr.will_court_doc, lr.testator_house_reg,
          lr.marital_status,
          lr.deed_copy, lr.building_permit, lr.house_reg_prop, lr.sale_contract, lr.debt_free_cert,
          lr.blueprint, lr.property_photos, lr.land_tax_receipt, lr.maps_url,
          lr.condo_title_deed, lr.condo_location_map, lr.common_fee_receipt, lr.floor_plan,
          lr.location_sketch_map, lr.land_use_cert, lr.rental_contract, lr.business_reg,
          a.full_name AS agent_name, a.phone AS agent_phone, a.agent_code,
          lt.officer_name AS lt_officer_name, lt.visit_date AS lt_visit_date,
          lt.land_office AS lt_land_office, lt.time_slot AS lt_time_slot, lt.legal_status AS lt_legal_status,
          NULL AS auction_id, NULL AS investor_id, NULL AS investor_name, NULL AS investor_code,
          NULL AS investor_phone, NULL AS investor_type, NULL AS property_value,
          NULL AS selling_pledge_amount, NULL AS interest_rate,
          NULL AS auction_land_area, NULL AS contract_years,
          NULL AS is_cancelled, NULL AS auction_status, NULL AS sale_type,
          NULL AS bank_name, NULL AS bank_account_no, NULL AS bank_account_name, NULL AS transfer_slip,
          NULL AS recorded_by, NULL AS recorded_at,
          NULL AS auction_created_at, NULL AS auction_updated_at,
          NULL AS house_reg_book_legal, NULL AS spouse_consent_doc, NULL AS spouse_name_change_doc
        FROM cases c
        LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
        LEFT JOIN agents a ON a.id = c.agent_id
        LEFT JOIN legal_transactions lt ON lt.case_id = c.id
        WHERE c.id = ?
      `
      return db.query(sqlMinimal, [caseId], (err2, results2) => {
        if (err2) {
          console.error('fetchAuctionDetail minimal fallback error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        if (!results2.length) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
        res.json({ success: true, caseData: results2[0] })
      })
    }
    if (err) {
      console.error('fetchAuctionDetail error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเคส' })
    res.json({ success: true, caseData: results[0] })
  })
}

// ========== อัพเดทเคส (ฝ่ายประมูลทรัพย์) ==========
exports.updateAuction = (req, res) => {
  const { caseId } = req.params
  const body = req.body || {}
  const {
    investor_id, investor_name, investor_code, investor_phone, investor_type,
    property_value, selling_pledge_amount, interest_rate,
    auction_land_area, contract_years,
    is_cancelled, auction_status, sale_type, recorded_by, recorded_at,
    officer_name, visit_date, land_office, time_slot, legal_status
  } = body

  const buildAndExecuteUpdate = () => {
    const recorder = req.user ? (req.user.full_name || req.user.username || 'ระบบ') : 'ระบบ'
    const fields = []
    const values = []

    if (investor_id !== undefined) { fields.push('investor_id=?'); values.push(investor_id || null) }
    if (investor_name !== undefined) { fields.push('investor_name=?'); values.push(investor_name || null) }
    if (investor_code !== undefined) { fields.push('investor_code=?'); values.push(investor_code || null) }
    if (investor_phone !== undefined) { fields.push('investor_phone=?'); values.push(investor_phone || null) }
    if (investor_type !== undefined) { fields.push('investor_type=?'); values.push(investor_type || null) }
    if (property_value !== undefined) { fields.push('property_value=?'); values.push(property_value || null) }
    if (selling_pledge_amount !== undefined) { fields.push('selling_pledge_amount=?'); values.push(selling_pledge_amount || null) }
    if (interest_rate !== undefined) { fields.push('interest_rate=?'); values.push(interest_rate || null) }
    if (auction_land_area !== undefined) { fields.push('auction_land_area=?'); values.push(auction_land_area || null) }
    if (contract_years !== undefined) { fields.push('contract_years=?'); values.push(contract_years || null) }
    if (is_cancelled !== undefined) { fields.push('is_cancelled=?'); values.push(is_cancelled ? 1 : 0) }
    if (auction_status !== undefined) { fields.push('auction_status=?'); values.push(auction_status || 'pending') }
    if (sale_type !== undefined) { fields.push('sale_type=?'); values.push(sale_type || 'auction') }
    fields.push('recorded_by=?'); values.push(recorder)
    fields.push('recorded_at=?'); values.push(new Date())

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

    values.push(caseId)
    const sql = `UPDATE auction_transactions SET ${fields.join(', ')} WHERE case_id=?`
    db.query(sql, values, (err) => {
      if (err) {
        console.error('updateAuction error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      // ===== อัพเดท/สร้าง legal_transactions สำหรับ fields ที่แชร์กับฝ่ายนิติ (fire-and-forget) =====
      if (officer_name !== undefined || visit_date !== undefined || land_office !== undefined || time_slot !== undefined || legal_status !== undefined) {
        const ltFields = []
        const ltValues = []
        if (officer_name !== undefined) { ltFields.push('officer_name=?'); ltValues.push(officer_name || null) }
        if (visit_date !== undefined) { ltFields.push('visit_date=?'); ltValues.push(visit_date || null) }
        if (land_office !== undefined) { ltFields.push('land_office=?'); ltValues.push(land_office || null) }
        if (time_slot !== undefined) { ltFields.push('time_slot=?'); ltValues.push(time_slot || null) }
        if (legal_status !== undefined) { ltFields.push('legal_status=?'); ltValues.push(legal_status || 'pending') }
        // Upsert: ถ้ายังไม่มี legal_transaction ให้สร้างก่อน แล้วค่อย UPDATE
        db.query('SELECT id FROM legal_transactions WHERE case_id = ?', [caseId], (errChk, ltRows) => {
          if (errChk) { console.error('legal_transactions check error:', errChk); return }
          if (!ltRows || ltRows.length === 0) {
            db.query('INSERT INTO legal_transactions (case_id, legal_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [caseId, 'pending'], (errIns) => {
              if (errIns) { console.error('legal_transactions insert error:', errIns); return }
              ltFields.push('updated_at=NOW()')
              db.query(`UPDATE legal_transactions SET ${ltFields.join(', ')} WHERE case_id=?`, [...ltValues, caseId], (errUpd) => {
                if (errUpd) console.error('update legal_transactions error:', errUpd)
              })
            })
          } else {
            ltFields.push('updated_at=NOW()')
            db.query(`UPDATE legal_transactions SET ${ltFields.join(', ')} WHERE case_id=?`, [...ltValues, caseId], (errUpd) => {
              if (errUpd) console.error('update legal_transactions error:', errUpd)
            })
          }
        })
      }

      // ===== auto-sync cases.status ตาม workflow =====
      let newCaseStatus = null
      if (is_cancelled == 1 || is_cancelled === true) {
        newCaseStatus = 'cancelled'
      } else if (auction_status === 'auctioned') {
        newCaseStatus = 'auction_completed'
      } else if (auction_status === 'pending') {
        newCaseStatus = 'pending_auction'
      }

      // ===== auto-create History การประมูลนายทุน + History การถอนเงิน =====
      if (auction_status === 'auctioned' && investor_id) {
        // ดึง bid_amount ล่าสุดของนายทุนคนนี้จาก auction_bids เพื่อใช้เป็นราคาที่ชนะ
        db.query(
          'SELECT bid_amount FROM auction_bids WHERE case_id = ? AND investor_id = ? ORDER BY bid_date DESC, created_at DESC LIMIT 1',
          [caseId, investor_id],
          (errBid, bidRows) => {
            const winningPrice = (bidRows && bidRows.length > 0 && bidRows[0].bid_amount) ? bidRows[0].bid_amount : null

            // 1) สร้าง investor_auction_history (ถ้ายังไม่มีสำหรับ investor+case นี้)
            db.query(
              'SELECT id FROM investor_auction_history WHERE investor_id = ? AND case_id = ?',
              [investor_id, caseId],
              (errChk1, existingHistory) => {
                if (!errChk1 && (!existingHistory || existingHistory.length === 0)) {
                  db.query(
                    'INSERT INTO investor_auction_history (investor_id, case_id, auction_date, winning_price, note) VALUES (?, ?, NOW(), ?, ?)',
                    [investor_id, caseId, winningPrice, 'สร้างอัตโนมัติจากฝ่ายประมูล'],
                    (errIns1) => {
                      if (errIns1) console.error('auto-create investor_auction_history error:', errIns1)
                    }
                  )
                }
              }
            )

            // 2) สร้าง investor_withdrawals status='pending' (ถ้ายังไม่มีสำหรับ investor+case นี้)
            db.query(
              'SELECT id FROM investor_withdrawals WHERE investor_id = ? AND case_id = ?',
              [investor_id, caseId],
              (errChk2, existingWithdrawal) => {
                if (!errChk2 && (!existingWithdrawal || existingWithdrawal.length === 0)) {
                  db.query(
                    'INSERT INTO investor_withdrawals (investor_id, case_id, amount, withdrawal_date, status, note) VALUES (?, ?, ?, NULL, ?, ?)',
                    [investor_id, caseId, winningPrice || 0, 'pending', 'สร้างอัตโนมัติจากฝ่ายประมูล — รอดำเนินการ'],
                    (errIns2) => {
                      if (errIns2) console.error('auto-create investor_withdrawals error:', errIns2)
                    }
                  )
                }
              }
            )
          }
        )
      }

      // ===== manual notify flags จากหน้า AuctionEditPage =====
      const doAuctionManualNotify = (lrId) => {
        try {
          const io = req.app.get('io')
          const userId = req.user ? req.user.id : null
          if (req.body.notify_sales_save === '1') {
            notifyStatusChange(parseInt(lrId), parseInt(caseId), null, 'auction_result_to_sales', io, userId)
          }
          if (req.body.notify_legal_save === '1') {
            notifyStatusChange(parseInt(lrId), parseInt(caseId), null, 'auction_to_legal', io, userId)
          }
          if (req.body.notify_accounting_save === '1') {
            notifyStatusChange(parseInt(lrId), parseInt(caseId), null, 'auction_to_accounting', io, userId)
          }
        } catch (e) { console.error('auction manual notify error:', e.message) }
      }

      if (newCaseStatus) {
        db.query('UPDATE cases SET status = ? WHERE id = ?', [newCaseStatus, caseId], (err2) => {
          if (err2) console.error('sync cases.status error:', err2)

          // sync loan_requests.status ให้ตรงกับ cases.status
          const statusMap = { 'cancelled': 'cancelled', 'auction_completed': 'matched', 'preparing_docs': 'matched', 'pending_auction': 'approved' }
          const lrStatus = statusMap[newCaseStatus]
          if (lrStatus) {
            db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err3, rows) => {
              if (!err3 && rows.length > 0 && rows[0].loan_request_id) {
                db.query('UPDATE loan_requests SET status = ? WHERE id = ?', [lrStatus, rows[0].loan_request_id], () => {})

                // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) =====
                const io = req.app.get('io')
                const userId = req.user ? req.user.id : null
                const extraInfo = investor_name ? ('นายทุน: ' + investor_name) : ''
                notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, newCaseStatus, io, userId, extraInfo)
                doAuctionManualNotify(rows[0].loan_request_id)
              }
            })
          } else {
            // ===== ส่งแจ้งเตือนกรณีไม่ต้อง sync loan_requests =====
            db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err3, rows) => {
              if (!err3 && rows.length > 0 && rows[0].loan_request_id) {
                const io = req.app.get('io')
                const userId = req.user ? req.user.id : null
                notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, newCaseStatus, io, userId)
                doAuctionManualNotify(rows[0].loan_request_id)
              }
            })
          }

          res.json({ success: true, message: 'อัพเดทข้อมูลประมูลทรัพย์สำเร็จ' })
        })
      } else {
        // ดึง loan_request_id สำหรับ manual notify
        db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err2, rows) => {
          if (!err2 && rows.length > 0) doAuctionManualNotify(rows[0].loan_request_id)
        })
        res.json({ success: true, message: 'อัพเดทข้อมูลประมูลทรัพย์สำเร็จ' })
      }
    })
  }

  // ตรวจสอบว่ามี auction_transaction หรือยัง ถ้ายังไม่มีให้สร้างก่อน
  db.query('SELECT id FROM auction_transactions WHERE case_id = ?', [caseId], (err0, existing) => {
    if (err0) {
      console.error('updateAuction check error:', err0)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO auction_transactions (case_id, auction_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert) {
            console.error('updateAuction insert error:', errInsert)
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

// ========== อัพโหลดเอกสารประมูล (ทีละ field) ==========
// เอกสารนิติกรรมเฉพาะฝ่ายประมูล (เก็บใน auction_transactions)
const AUCTION_DOC_FIELDS = [
  'house_reg_book_legal', 'spouse_consent_doc', 'spouse_name_change_doc'
]
// เอกสาร Checklist (เก็บใน loan_requests — เข้าถึงได้ก่อนสร้างเคส)
const AUCTION_CHECKLIST_DOC_FIELDS = [
  'borrower_id_card', 'house_reg_book', 'name_change_doc', 'divorce_doc',
  'spouse_id_card', 'spouse_reg_copy', 'marriage_cert',
  'single_cert', 'death_cert', 'will_court_doc', 'testator_house_reg'
]

exports.uploadAuctionDoc = (req, res) => {
  const { caseId } = req.params
  const files = req.files || {}

  // หา field ที่ถูก upload มา
  const uploadedField = Object.keys(files).find(k => AUCTION_DOC_FIELDS.includes(k))
  if (!uploadedField) return res.status(400).json({ success: false, message: 'ไม่พบฟิลด์ที่ถูกต้อง' })

  const newPaths = files[uploadedField].map(f => `uploads/auction-docs/${f.filename}`)

  // ตรวจว่ามี auction_transactions หรือยัง ถ้ายังไม่มีให้สร้างก่อน (กรณีฝ่ายขายอัพโหลดก่อนฝ่ายประมูล)
  const doUpload = () => {
    db.query(`SELECT \`${uploadedField}\` FROM auction_transactions WHERE case_id = ?`, [caseId], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })

      let existing = []
      try { existing = JSON.parse(rows[0]?.[uploadedField] || '[]') || [] } catch {}

      const merged = [...existing, ...newPaths]
      db.query(`UPDATE auction_transactions SET \`${uploadedField}\` = ? WHERE case_id = ?`, [JSON.stringify(merged), caseId], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
        res.json({ success: true, field: uploadedField, paths: merged })
      })
    })
  }

  db.query('SELECT id FROM auction_transactions WHERE case_id = ?', [caseId], (err0, existing) => {
    if (err0) return res.status(500).json({ success: false, message: 'Server Error' })
    if (!existing || existing.length === 0) {
      db.query(
        'INSERT INTO auction_transactions (case_id, auction_status, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
        [caseId, 'pending'],
        (errInsert) => {
          if (errInsert) return res.status(500).json({ success: false, message: 'Server Error' })
          doUpload()
        }
      )
    } else {
      doUpload()
    }
  })
}

// ========== ลบเอกสารทีละรูป ==========
exports.removeAuctionDoc = (req, res) => {
  const { caseId } = req.params
  const { field, file_path } = req.body

  if (!AUCTION_DOC_FIELDS.includes(field)) return res.status(400).json({ success: false, message: 'Invalid field' })

  db.query(`SELECT \`${field}\` FROM auction_transactions WHERE case_id = ?`, [caseId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })

    let existing = []
    try { existing = JSON.parse(rows[0]?.[field] || '[]') || [] } catch {}
    const filtered = existing.filter(p => p !== file_path)

    db.query(`UPDATE auction_transactions SET \`${field}\` = ? WHERE case_id = ?`, [JSON.stringify(filtered), caseId], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true, field, paths: filtered })
    })
  })
}

// ========== Checklist เอกสาร (เก็บใน loan_requests) — ฝ่ายประมูลอ่าน/แก้ได้ ==========
// helper: หา lr_id จาก case_id
function getLrId(caseId, cb) {
  db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err, rows) => {
    if (err || !rows?.length) return cb(null)
    cb(rows[0].loan_request_id)
  })
}

exports.getAuctionChecklistDocs = (req, res) => {
  const { caseId } = req.params
  getLrId(caseId, (lrId) => {
    if (!lrId) return res.json({ success: true, docs: {} })
    const fields = AUCTION_CHECKLIST_DOC_FIELDS.map(f => `\`${f}\``).join(', ')
    db.query(`SELECT ${fields} FROM loan_requests WHERE id = ?`, [lrId], (err, rows) => {
      if (err) return res.status(500).json({ success: false })
      if (!rows?.length) return res.json({ success: true, docs: {} })
      const docs = {}
      AUCTION_CHECKLIST_DOC_FIELDS.forEach(f => {
        try { docs[f] = JSON.parse(rows[0][f] || '[]') || [] } catch { docs[f] = [] }
      })
      res.json({ success: true, docs })
    })
  })
}

exports.uploadAuctionChecklistDoc = (req, res) => {
  const { caseId } = req.params
  const files = req.files || {}
  const uploadedField = Object.keys(files).find(k => AUCTION_CHECKLIST_DOC_FIELDS.includes(k))
  if (!uploadedField) return res.status(400).json({ success: false, message: 'ไม่พบฟิลด์ที่ถูกต้อง' })
  const newPaths = files[uploadedField].map(f => `uploads/auction-docs/${f.filename}`)
  getLrId(caseId, (lrId) => {
    if (!lrId) return res.status(404).json({ success: false, message: 'ไม่พบลูกหนี้' })
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
  })
}

exports.removeAuctionChecklistDoc = (req, res) => {
  const { caseId } = req.params
  const { field, file_path } = req.body
  if (!AUCTION_CHECKLIST_DOC_FIELDS.includes(field)) return res.status(400).json({ success: false })
  getLrId(caseId, (lrId) => {
    if (!lrId) return res.status(404).json({ success: false, message: 'ไม่พบลูกหนี้' })
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
  })
}

// ========== ดึงประวัติการเสนอราคา ==========
exports.getAuctionBids = (req, res) => {
  const { caseId } = req.params
  db.query('SELECT * FROM auction_bids WHERE case_id = ? ORDER BY bid_date DESC, created_at DESC', [caseId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    res.json({ success: true, bids: results })
  })
}

// ========== เพิ่มการเสนอราคา ==========
exports.createAuctionBid = (req, res) => {
  const { caseId } = req.params
  const { bid_amount, investor_id, investor_name, investor_code, investor_phone, bid_date, note } = req.body
  const recorded_by = req.user ? (req.user.full_name || req.user.username || 'ระบบ') : 'ระบบ'
  db.query(
    `INSERT INTO auction_bids
      (case_id, bid_amount, investor_id, investor_name, investor_code, investor_phone, bid_date, note, recorded_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [caseId, bid_amount || null, investor_id || null, investor_name || null,
     investor_code || null, investor_phone || null, bid_date || null, note || null, recorded_by],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true, bid_id: result.insertId })
    }
  )
}

// ========== ลบการเสนอราคา ==========
exports.deleteAuctionBid = (req, res) => {
  const { bidId } = req.params
  db.query('DELETE FROM auction_bids WHERE id = ?', [bidId], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Server Error' })
    res.json({ success: true })
  })
}
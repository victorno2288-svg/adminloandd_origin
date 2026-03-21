const db = require('../config/db')

// ========== สถิติฝ่ายบัญชีรวม (ใช้ทุก tab) ==========
exports.getAccountingStats = (req, res) => {
  const sql = `
    SELECT
      -- สถิติฝ่ายบัญชีลูกหนี้ (จากตาราง debtor_accounting)
      (SELECT COUNT(*) FROM debtor_accounting WHERE appraisal_status = 'paid') AS appraisal,
      (SELECT COUNT(*) FROM debtor_accounting WHERE bag_fee_status = 'paid') AS bag_fee,
      (SELECT COUNT(*) FROM debtor_accounting WHERE contract_sale_status = 'paid') AS contract_sale,
      (SELECT COUNT(*) FROM debtor_accounting WHERE redemption_status = 'paid') AS redemption,
      (SELECT COUNT(*) FROM debtor_accounting WHERE additional_service_amount > 0) AS additional_service,
      (SELECT COUNT(*) FROM debtor_accounting WHERE property_forfeited_status = 'paid') AS property_forfeited,
      (SELECT COUNT(*) FROM cases WHERE status = 'cancelled') AS cancelled,
      (SELECT COALESCE(SUM(appraisal_amount), 0) FROM debtor_accounting) AS total_appraisal_fee,
      (SELECT COUNT(*) FROM cases) AS total_cases,

      -- สถิติฝ่ายบัญชีนายทุน (จาก investors + investor_accounting)
      (SELECT COALESCE(SUM(ia.auction_deposit), 0) FROM investor_accounting ia) AS auction_deposit_total,
      (SELECT COUNT(*) FROM investor_accounting ia WHERE ia.auction_deposit > 0) AS auction_deposit,
      (SELECT COUNT(*) FROM investor_accounting ia WHERE ia.post_auction_status = 'won_auction') AS withdrawal_request,

      -- สถิติฝ่ายบัญชีนายหน้า
      (SELECT COUNT(*) FROM agents WHERE commission_rate > 0) AS agent_commission,
      (SELECT COUNT(*) FROM agent_accounting WHERE payment_status = 'pending') AS commission_withdrawal
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAccountingStats error:', err)
      // ถ้า table ยังไม่มี ส่ง default กลับ
      return res.json({
        success: true,
        stats: {
          appraisal: 0, bag_fee: 0, contract_sale: 0, redemption: 0,
          additional_service: 0, property_forfeited: 0, cancelled: 0,
          total_appraisal_fee: 0, total_cases: 0,
          auction_deposit: 0, withdrawal_request: 0,
          agent_commission: 0, commission_withdrawal: 0,
        }
      })
    }
    res.json({ success: true, stats: results[0] })
  })
}

// ========== TAB 1: ฝ่ายบัญชีลูกหนี้ (LEFT JOIN debtor_accounting) ==========
exports.getAccountingDebtors = (req, res) => {
  const { date } = req.query

  let sql = `
    SELECT
      c.id AS case_id, c.case_code, c.status, c.payment_status,
      c.appraisal_fee, c.approved_amount,
      c.payment_date, c.updated_at,
      lr.id AS debtor_id, lr.debtor_code,
      lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      da.appraisal_amount, da.appraisal_status, da.appraisal_slip,
      da.bag_fee_amount, da.bag_fee_status, da.bag_fee_slip,
      da.contract_sale_amount, da.contract_sale_status, da.contract_sale_slip,
      da.redemption_amount, da.redemption_status, da.redemption_slip,
      da.additional_service_amount,
      da.property_forfeited_amount, da.property_forfeited_status, da.property_forfeited_slip,
      da.id_card_image
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN debtor_accounting da ON da.case_id = c.id
  `

  const params = []
  if (date) {
    sql += ' WHERE DATE(c.payment_date) = ?'
    params.push(date)
  }

  sql += ' ORDER BY c.updated_at DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getAccountingDebtors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: ดึงรายละเอียดบัญชีลูกหนี้ 1 เคส ==========
exports.getDebtorDetail = (req, res) => {
  const { caseId } = req.params

  // ดึงข้อมูล case + loan_request + issuing_transactions (รวมสลิปค่าดำเนินการจากกรมที่ดิน)
  const caseSql = `
    SELECT c.id AS case_id, c.case_code, c.status,
      lr.debtor_code, lr.contact_name AS debtor_name, lr.contact_phone AS debtor_phone,
      lr.province, lr.district, lr.subdistrict, lr.property_address, lr.location_url,
      lr.slip_image AS appraisal_slip_image,
      lr.appraisal_fee,
      it.commission_slip AS issuing_commission_slip
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN issuing_transactions it ON it.case_id = c.id
    WHERE c.id = ?
  `

  db.query(caseSql, [caseId], (err, caseResults) => {
    if (err || caseResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found' })
    }

    // ดึงข้อมูล debtor_accounting
    db.query('SELECT * FROM debtor_accounting WHERE case_id = ?', [caseId], (err2, accResults) => {
      res.json({
        success: true,
        caseInfo: caseResults[0],
        accounting: accResults.length > 0 ? accResults[0] : null
      })
    })
  })
}

// ========== PUT: บันทึก/อัปเดทบัญชีลูกหนี้ ==========
exports.saveDebtorDetail = (req, res) => {
  const { caseId } = req.params
  const data = req.body

  // ตรวจว่ามี record อยู่แล้วไหม
  db.query('SELECT id FROM debtor_accounting WHERE case_id = ?', [caseId], (err, existing) => {
    if (err) {
      console.error('saveDebtorDetail check error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    const fields = {
      case_id: caseId,
      debtor_status: data.debtor_status || null,
      property_location: data.property_location || null,
      contact_person: data.contact_person || null,
      id_card_image: data.id_card_image || null,
      appraisal_amount: data.appraisal_amount || 0,
      appraisal_payment_date: data.appraisal_payment_date || null,
      appraisal_slip: data.appraisal_slip || null,
      appraisal_status: data.appraisal_status || 'unpaid',
      bag_fee_amount: data.bag_fee_amount || 0,
      bag_fee_payment_date: data.bag_fee_payment_date || null,
      bag_fee_slip: data.bag_fee_slip || null,
      bag_fee_status: data.bag_fee_status || 'unpaid',
      contract_sale_amount: data.contract_sale_amount || 0,
      contract_sale_payment_date: data.contract_sale_payment_date || null,
      contract_sale_slip: data.contract_sale_slip || null,
      contract_sale_status: data.contract_sale_status || 'unpaid',
      redemption_amount: data.redemption_amount || 0,
      redemption_payment_date: data.redemption_payment_date || null,
      redemption_slip: data.redemption_slip || null,
      redemption_status: data.redemption_status || 'unpaid',
      additional_service_amount: data.additional_service_amount || 0,
      additional_service_payment_date: data.additional_service_payment_date || null,
      additional_service_note: data.additional_service_note || null,
      property_forfeited_amount: data.property_forfeited_amount || 0,
      property_forfeited_payment_date: data.property_forfeited_payment_date || null,
      property_forfeited_slip: data.property_forfeited_slip || null,
      property_forfeited_status: data.property_forfeited_status || 'unpaid',
      property_forfeited_note: data.property_forfeited_note || null,
      recorded_by: req.user ? (req.user.full_name || req.user.username || 'ระบบ') : 'ระบบ'
    }

    if (existing.length > 0) {
      // UPDATE
      const setClauses = Object.keys(fields).filter(k => k !== 'case_id').map(k => `${k} = ?`)
      const values = Object.keys(fields).filter(k => k !== 'case_id').map(k => fields[k])
      values.push(caseId)

      db.query(`UPDATE debtor_accounting SET ${setClauses.join(', ')} WHERE case_id = ?`, values, (err2) => {
        if (err2) {
          console.error('saveDebtorDetail update error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Updated' })
      })
    } else {
      // INSERT
      const keys = Object.keys(fields)
      const placeholders = keys.map(() => '?').join(', ')
      const values = keys.map(k => fields[k])

      db.query(`INSERT INTO debtor_accounting (${keys.join(', ')}) VALUES (${placeholders})`, values, (err2) => {
        if (err2) {
          console.error('saveDebtorDetail insert error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Created' })
      })
    }
  })
}

// ========== GET: รายชื่อลูกหนี้สำหรับ dropdown (แสดงทุก ID) ==========
exports.getDebtorList = (req, res) => {
  const sql = `
    SELECT
      c.id AS case_id,
      c.case_code,
      lr.debtor_code,
      lr.contact_name AS debtor_name,
      c.payment_status,
      da.appraisal_status
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN debtor_accounting da ON da.case_id = c.id
    ORDER BY c.updated_at DESC
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('getDebtorList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== PUT: อัปเดทสถานะค่าประเมินจากตาราง ==========
exports.updateAppraisalStatus = (req, res) => {
  const { caseId } = req.params
  const { appraisal_status } = req.body

  if (!['paid', 'unpaid'].includes(appraisal_status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' })
  }

  // ตรวจว่ามี record อยู่แล้วไหม — ถ้ายังไม่มี ให้ INSERT ก่อน
  db.query('SELECT id FROM debtor_accounting WHERE case_id = ?', [caseId], (err, existing) => {
    if (err) {
      console.error('updateAppraisalStatus check error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    if (existing.length > 0) {
      db.query('UPDATE debtor_accounting SET appraisal_status = ? WHERE case_id = ?', [appraisal_status, caseId], (err2) => {
        if (err2) {
          console.error('updateAppraisalStatus update error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Updated' })
      })
    } else {
      db.query('INSERT INTO debtor_accounting (case_id, appraisal_status) VALUES (?, ?)', [caseId, appraisal_status], (err2) => {
        if (err2) {
          console.error('updateAppraisalStatus insert error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Created & Updated' })
      })
    }
  })
}

// ========== PUT: อัปเดทสถานะชำระทั้งหมด (master status) ==========
exports.updateMasterStatus = (req, res) => {
  const { caseId } = req.params
  const { status } = req.body

  if (!['paid', 'unpaid'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' })
  }

  const paymentDate = status === 'paid' ? new Date() : null
  console.log(`[masterStatus] caseId=${caseId} status=${status} paymentDate=${paymentDate}`)

  db.query('SELECT status AS current_status FROM cases WHERE id = ?', [caseId], (errCheck, rows) => {
    if (errCheck || rows.length === 0) {
      console.error('masterStatus check error:', errCheck)
    }
    const currentCaseStatus = rows && rows[0] ? rows[0].current_status : null
    const shouldAdvance = status === 'paid' && currentCaseStatus === 'awaiting_appraisal_fee'

    const updateSql = shouldAdvance
      ? 'UPDATE cases SET payment_status = ?, payment_date = ?, status = ? WHERE id = ?'
      : 'UPDATE cases SET payment_status = ?, payment_date = ? WHERE id = ?'
    const updateParams = shouldAdvance
      ? [status, paymentDate, 'appraisal_scheduled', caseId]
      : [status, paymentDate, caseId]

  db.query(updateSql, updateParams, (err, result) => {
    if (err) {
      console.error('updateMasterStatus cases error:', err.message)
      return res.status(500).json({ success: false, message: 'cases update failed: ' + err.message })
    }
    console.log(`[masterStatus] cases updated: affectedRows=${result.affectedRows}`)

    db.query('SELECT id FROM debtor_accounting WHERE case_id = ?', [caseId], (err2, existing) => {
      if (err2) {
        console.error('updateMasterStatus check error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      const allFields = {
        appraisal_status: status,
        bag_fee_status: status,
        contract_sale_status: status,
        redemption_status: status,
        property_forfeited_status: status
      }

      if (existing.length > 0) {
        const setClauses = Object.keys(allFields).map(k => `${k} = ?`).join(', ')
        const values = [...Object.values(allFields), caseId]
        db.query(`UPDATE debtor_accounting SET ${setClauses} WHERE case_id = ?`, values, (err3) => {
          if (err3) {
            console.error('updateMasterStatus update error:', err3)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          res.json({ success: true, message: 'All statuses updated' })
        })
      } else {
        db.query(
          `INSERT INTO debtor_accounting (case_id, appraisal_status, bag_fee_status, contract_sale_status, redemption_status, property_forfeited_status) VALUES (?, ?, ?, ?, ?, ?)`,
          [caseId, status, status, status, status, status],
          (err3) => {
            if (err3) {
              console.error('updateMasterStatus insert error:', err3)
              return res.status(500).json({ success: false, message: 'Server Error' })
            }
            res.json({ success: true, message: 'Created & all statuses set' })
          }
        )
      }
    })
  })
  })
}

// ========== TAB 2: ฝ่ายบัญชีนายทุน ==========
exports.getAccountingInvestors = (req, res) => {
  const { date } = req.query

  let sql = `
    SELECT
      u.id AS investor_id,
      u.investor_code AS investor_code,
      u.full_name AS investor_name,
      u.phone,
      u.updated_at,
      ia.auction_deposit,
      ia.status AS acc_status,
      COALESCE(ia.auction_deposit, 0) AS total_deposit,
      (SELECT COUNT(*) FROM investments inv WHERE inv.investor_id = u.id) AS total_investments,
      (SELECT COUNT(*) FROM investments inv WHERE inv.investor_id = u.id AND inv.status = 'accepted') AS won_auctions
    FROM investors u
    LEFT JOIN investor_accounting ia ON ia.user_id = u.id
    WHERE 1=1
  `

  const params = []
  if (date) {
    sql += ' AND DATE(u.updated_at) = ?'
    params.push(date)
  }

  sql += ' ORDER BY u.updated_at DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getAccountingInvestors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายชื่อนายทุนสำหรับ dropdown ==========
exports.getInvestorList = (req, res) => {
  const sql = `
    SELECT u.id AS investor_id, u.investor_code AS investor_code, u.full_name AS investor_name
    FROM investors u
    ORDER BY u.updated_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getInvestorList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายละเอียดบัญชีนายทุน 1 คน ==========
exports.getInvestorDetail = (req, res) => {
  const { investorId } = req.params

  const sql = `
    SELECT u.id AS investor_id, u.investor_code AS investor_code,
      u.full_name AS investor_name, u.phone, u.line_id AS line_name, u.email,
      u.updated_at,
      ia.hid, ia.auction_deposit, ia.auction_date, ia.status,
      ia.post_auction_status, ia.recorded_by
    FROM investors u
    LEFT JOIN investor_accounting ia ON ia.user_id = u.id
    WHERE u.id = ?
  `

  db.query(sql, [investorId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: 'Investor not found' })
    }
    res.json({ success: true, data: results[0] })
  })
}

// ========== PUT: บันทึก/อัปเดทบัญชีนายทุน ==========
exports.saveInvestorDetail = (req, res) => {
  const { investorId } = req.params
  const data = req.body

  const userFields = {
    full_name: data.investor_name || data.full_name || null,
    phone: data.phone || null,
    line_id: data.line_name || null,
    email: data.email || null,
  }
  const userSet = Object.keys(userFields).map(k => `${k} = ?`).join(', ')
  const userValues = [...Object.values(userFields), investorId]

  db.query(`UPDATE investors SET ${userSet} WHERE id = ?`, userValues, (err) => {
    if (err) {
      console.error('saveInvestorDetail investors error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    const accFields = {
      hid: data.hid || null,
      auction_deposit: data.auction_deposit || 0,
      auction_date: data.auction_date || null,
      status: data.status || 'pending_auction',
      post_auction_status: data.post_auction_status || null,
      recorded_by: req.user ? (req.user.full_name || req.user.username || 'ระบบ') : 'ระบบ'
    }

    db.query('SELECT id FROM investor_accounting WHERE user_id = ?', [investorId], (err2, existing) => {
      if (err2) {
        console.error('saveInvestorDetail check error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      if (existing.length > 0) {
        const accSet = Object.keys(accFields).map(k => `${k} = ?`).join(', ')
        const accValues = [...Object.values(accFields), investorId]
        db.query(`UPDATE investor_accounting SET ${accSet} WHERE user_id = ?`, accValues, (err3) => {
          if (err3) {
            console.error('saveInvestorDetail update error:', err3)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          res.json({ success: true, message: 'Updated' })
        })
      } else {
        const keys = ['user_id', ...Object.keys(accFields)]
        const placeholders = keys.map(() => '?').join(', ')
        const values = [investorId, ...Object.values(accFields)]
        db.query(`INSERT INTO investor_accounting (${keys.join(', ')}) VALUES (${placeholders})`, values, (err3) => {
          if (err3) {
            console.error('saveInvestorDetail insert error:', err3)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          res.json({ success: true, message: 'Created' })
        })
      }
    })
  })
}

// ========== TAB 3: ฝ่ายบัญชีนายหน้า ==========
exports.getAccountingAgents = (req, res) => {
  const { date } = req.query

  let sql = `
    SELECT
      a.id AS agent_id, a.agent_code, a.full_name AS agent_name,
      a.phone, a.commission_rate, a.status, a.updated_at,
      aa.commission_amount, aa.commission_slip, aa.payment_status AS acc_payment_status,
      aa.payment_date,
      c.case_code,
      lr.debtor_code, lr.contact_name AS debtor_name,
      COUNT(c.id) OVER (PARTITION BY a.id) AS total_cases,
      COALESCE(SUM(c.approved_amount) OVER (PARTITION BY a.id), 0) AS total_approved
    FROM agents a
    LEFT JOIN agent_accounting aa ON aa.agent_id = a.id
    LEFT JOIN cases c ON c.agent_id = a.id
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
  `

  const params = []
  if (date) {
    sql += ' WHERE DATE(a.updated_at) = ?'
    params.push(date)
  }

  sql += ' GROUP BY a.id ORDER BY a.created_at DESC'

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('getAccountingAgents error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายชื่อนายหน้าสำหรับ dropdown ==========
exports.getAgentList = (req, res) => {
  const sql = `
    SELECT id AS agent_id, agent_code, full_name AS agent_name
    FROM agents
    ORDER BY created_at DESC
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getAgentList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// ========== GET: รายละเอียดบัญชีนายหน้า 1 คน ==========
exports.getAgentDetail = (req, res) => {
  const { agentId } = req.params

  const sql = `
    SELECT a.id AS agent_id, a.agent_code, a.full_name AS agent_name,
      a.nickname, a.phone, a.email, a.line_id AS line_name,
      a.commission_rate, a.updated_at,
      aa.id AS acc_id, aa.case_id, aa.team, aa.commission_amount,
      aa.payment_date, aa.commission_slip, aa.payment_status, aa.recorded_by
    FROM agents a
    LEFT JOIN agent_accounting aa ON aa.agent_id = a.id
    WHERE a.id = ?
  `

  db.query(sql, [agentId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found' })
    }
    const agent = results[0]
    if (agent.case_id) {
      db.query(
        `SELECT lr.debtor_code, lr.contact_name AS debtor_name
         FROM cases c LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
         WHERE c.id = ?`,
        [agent.case_id],
        (err2, debtorResults) => {
          const debtor = debtorResults && debtorResults.length > 0 ? debtorResults[0] : {}
          res.json({ success: true, data: { ...agent, ...debtor } })
        }
      )
    } else {
      res.json({ success: true, data: agent })
    }
  })
}

// ========== PUT: บันทึก/อัปเดทบัญชีนายหน้า ==========
exports.saveAgentDetail = (req, res) => {
  const { agentId } = req.params
  const data = req.body

  const accFields = {
    case_id: data.case_id || null,
    team: data.team || null,
    commission_amount: data.commission_amount || 0,
    payment_date: data.payment_date || null,
    commission_slip: data.commission_slip || null,
    payment_status: data.payment_status || 'unpaid',
    recorded_by: req.user ? (req.user.full_name || req.user.username || 'ระบบ') : 'ระบบ'
  }

  db.query('SELECT id FROM agent_accounting WHERE agent_id = ?', [agentId], (err, existing) => {
    if (err) {
      console.error('saveAgentDetail check error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }

    if (existing.length > 0) {
      const setClauses = Object.keys(accFields).map(k => `${k} = ?`).join(', ')
      const values = [...Object.values(accFields), agentId]
      db.query(`UPDATE agent_accounting SET ${setClauses} WHERE agent_id = ?`, values, (err2) => {
        if (err2) {
          console.error('saveAgentDetail update error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Updated' })
      })
    } else {
      const keys = ['agent_id', ...Object.keys(accFields)]
      const placeholders = keys.map(() => '?').join(', ')
      const values = [agentId, ...Object.values(accFields)]
      db.query(`INSERT INTO agent_accounting (${keys.join(', ')}) VALUES (${placeholders})`, values, (err2) => {
        if (err2) {
          console.error('saveAgentDetail insert error:', err2)
          return res.status(500).json({ success: false, message: 'Server Error' })
        }
        res.json({ success: true, message: 'Created' })
      })
    }
  })
}
// ========== เอกสาร & สมุดบัญชี (Document Viewer Tab) ==========

// GET /cases-docs — รายการ loan_requests ทั้งหมดสำหรับ document viewer
exports.getCaseDocsList = (req, res) => {
  const { q } = req.query
  let sql = `
    SELECT
      lr.id AS loan_request_id, lr.debtor_code, lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone, lr.bank_account_number, lr.bank_name, lr.bank_book_file,
      lr.updated_at,
      c.id AS case_id, c.case_code, c.status AS case_status,
      a.full_name AS agent_name,
      (
        (CASE WHEN lr.slip_image IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN lr.appraisal_book_image IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN lr.bank_book_file IS NOT NULL THEN 1 ELSE 0 END) +
        COALESCE((SELECT COUNT(*) FROM debtor_accounting da
          WHERE da.case_id = c.id
            AND (da.appraisal_slip IS NOT NULL OR da.bag_fee_slip IS NOT NULL
              OR da.contract_sale_slip IS NOT NULL OR da.redemption_slip IS NOT NULL
              OR da.property_forfeited_slip IS NOT NULL OR da.id_card_image IS NOT NULL)
        ), 0) +
        COALESCE((SELECT COUNT(*) FROM agent_accounting aa2
          WHERE aa2.agent_id = lr.agent_id AND aa2.commission_slip IS NOT NULL
        ), 0) +
        COALESCE((SELECT COUNT(*) FROM issuing_transactions it2
          WHERE it2.case_id = c.id AND it2.commission_slip IS NOT NULL
        ), 0)
      ) AS doc_count
    FROM loan_requests lr
    LEFT JOIN cases c ON c.loan_request_id = lr.id
    LEFT JOIN agents a ON a.id = lr.agent_id
    WHERE 1=1
  `
  const params = []
  if (q) {
    sql += ' AND (lr.contact_name LIKE ? OR lr.contact_phone LIKE ? OR lr.debtor_code LIKE ? OR c.case_code LIKE ? OR a.full_name LIKE ?)'
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }
  sql += ' ORDER BY lr.updated_at DESC LIMIT 200'
  db.query(sql, params, (err, results) => {
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE')) {
      // Fallback level 1: ตัด bank fields และ subquery ที่อาจ fail
      const sqlBasic = `
        SELECT
          lr.id AS loan_request_id, lr.debtor_code, lr.contact_name AS debtor_name,
          lr.contact_phone AS debtor_phone,
          NULL AS bank_account_number, NULL AS bank_name, NULL AS bank_book_file,
          lr.updated_at,
          c.id AS case_id, c.case_code, c.status AS case_status,
          a.full_name AS agent_name,
          0 AS doc_count
        FROM loan_requests lr
        LEFT JOIN cases c ON c.loan_request_id = lr.id
        LEFT JOIN agents a ON a.id = lr.agent_id
        WHERE 1=1
        ${params.length ? "AND (lr.contact_name LIKE ? OR lr.contact_phone LIKE ? OR lr.debtor_code LIKE ? OR c.case_code LIKE ? OR a.full_name LIKE ?)" : ""}
        ORDER BY lr.updated_at DESC LIMIT 200
      `
      return db.query(sqlBasic, params, (err2, results2) => {
        if (err2) { console.error('getCaseDocsList fallback error:', err2); return res.status(500).json({ success: false, message: 'Server Error' }) }
        res.json({ success: true, data: results2 || [] })
      })
    }
    if (err) {
      console.error('getCaseDocsList error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results })
  })
}

// GET /case-docs/:loanRequestId — เอกสารทั้งหมดของ loan_request นั้น (ทุกฝ่าย)
exports.getCaseDocs = (req, res) => {
  const { loanRequestId } = req.params

  const coreFields = `
      lr.id AS loan_request_id, lr.debtor_code,
      lr.contact_name AS debtor_name, lr.contact_phone AS debtor_phone,
      lr.loan_type_detail,
      lr.images, lr.appraisal_images, lr.deed_images,
      lr.slip_image, lr.appraisal_book_image,
      lr.province, lr.district, lr.subdistrict, lr.house_no, lr.village_name, lr.location_url,
      lr.deed_number, lr.deed_type, lr.land_area, lr.building_area,
      lr.estimated_value, lr.appraisal_result, lr.loan_amount, lr.approved_amount,
      lr.property_photos, lr.deed_copy, lr.building_permit, lr.land_tax_receipt,
      lr.borrower_id_card AS checklist_id_card, lr.house_reg_book AS checklist_house_reg,`
  const joins = `
    FROM loan_requests lr
    LEFT JOIN cases c ON c.loan_request_id = lr.id
    LEFT JOIN agents a ON a.id = lr.agent_id
    LEFT JOIN agent_accounting aa ON aa.agent_id = a.id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = lr.id
    LEFT JOIN debtor_accounting da ON da.case_id = c.id
    LEFT JOIN legal_transactions lt ON lt.case_id = c.id
    LEFT JOIN issuing_transactions it ON it.case_id = c.id
    LEFT JOIN auction_transactions auc ON auc.case_id = c.id
    LEFT JOIN investor_withdrawals iw ON iw.case_id = c.id AND iw.slip_path IS NOT NULL
    WHERE lr.id = ? GROUP BY lr.id LIMIT 1`
  const otherFields = `
      c.id AS case_id, c.case_code, c.status AS case_status,
      c.slip_image AS case_slip_image,
      c.investor_amount, c.contract_start_date, c.contract_end_date,
      DATEDIFF(c.contract_end_date, CURDATE()) AS days_remaining,
      a.id AS agent_db_id, a.full_name AS agent_name,
      a.phone AS agent_phone, a.id_card_image AS agent_id_card,
      aa.commission_amount AS agent_commission_amount,
      aa.payment_status AS agent_commission_status,
      aa.commission_slip AS agent_commission_slip,
      at2.credit_table_file,
      da.id_card_image AS acc_debtor_id_card,
      da.appraisal_slip, da.bag_fee_slip, da.contract_sale_slip,
      da.redemption_slip, da.property_forfeited_slip,
      it.commission_slip AS issuing_commission_slip,
      lt.commission_slip AS legal_commission_slip,
      lt.attachment AS legal_attachment,
      lt.doc_selling_pledge, lt.deed_selling_pledge,
      lt.doc_extension, lt.deed_extension,
      lt.doc_redemption, lt.deed_redemption,
      auc.spouse_consent_doc, auc.spouse_id_card, auc.spouse_reg_copy,
      auc.marriage_cert, auc.spouse_name_change_doc,
      auc.bank_name AS auc_bank_name, auc.bank_account_no AS auc_bank_account_no,
      auc.bank_account_name AS auc_bank_account_name, auc.transfer_slip,
      GROUP_CONCAT(DISTINCT iw.slip_path ORDER BY iw.id SEPARATOR '|') AS investor_slips,
      (SELECT CONCAT(COALESCE(i.investor_code,''), '|', COALESCE(i.full_name,''), '|', COALESCE(i.phone,''))
        FROM investors i
        JOIN investor_withdrawals iw3 ON iw3.investor_id = i.id
        WHERE iw3.case_id = c.id LIMIT 1) AS investor_info`

  // otherFields ที่ปลอดภัย — แทน auc.* columns ใหม่ด้วย NULL
  const otherFieldsSafe = `
      c.id AS case_id, c.case_code, c.status AS case_status,
      c.slip_image AS case_slip_image,
      NULL AS investor_amount, NULL AS contract_start_date, NULL AS contract_end_date,
      NULL AS days_remaining,
      a.id AS agent_db_id, a.full_name AS agent_name,
      a.phone AS agent_phone, a.id_card_image AS agent_id_card,
      NULL AS agent_commission_amount,
      NULL AS agent_commission_status,
      NULL AS agent_commission_slip,
      NULL AS credit_table_file,
      NULL AS acc_debtor_id_card,
      NULL AS appraisal_slip, NULL AS bag_fee_slip, NULL AS contract_sale_slip,
      NULL AS redemption_slip, NULL AS property_forfeited_slip,
      NULL AS issuing_commission_slip,
      NULL AS legal_commission_slip,
      NULL AS legal_attachment,
      NULL AS doc_selling_pledge, NULL AS deed_selling_pledge,
      NULL AS doc_extension, NULL AS deed_extension,
      NULL AS doc_redemption, NULL AS deed_redemption,
      NULL AS spouse_consent_doc, NULL AS spouse_id_card, NULL AS spouse_reg_copy,
      NULL AS marriage_cert, NULL AS spouse_name_change_doc,
      NULL AS auc_bank_name, NULL AS auc_bank_account_no,
      NULL AS auc_bank_account_name, NULL AS transfer_slip,
      NULL AS investor_slips, NULL AS investor_info`
  const joinsSafe = `
    FROM loan_requests lr
    LEFT JOIN cases c ON c.loan_request_id = lr.id
    LEFT JOIN agents a ON a.id = lr.agent_id
    WHERE lr.id = ? GROUP BY lr.id LIMIT 1`

  const sqlFull = `SELECT ${coreFields} lr.bank_account_number, lr.bank_name, lr.bank_book_file, ${otherFields} ${joins}`
  const sqlBasic = `SELECT ${coreFields} NULL AS bank_account_number, NULL AS bank_name, NULL AS bank_book_file, ${otherFieldsSafe} ${joins}`
  const sqlMinimal = `SELECT ${coreFields} NULL AS bank_account_number, NULL AS bank_name, NULL AS bank_book_file, ${otherFieldsSafe} ${joinsSafe}`

  db.query(sqlFull, [loanRequestId], (err, results) => {
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE')) {
      // Fallback 1: ตัด lr.bank_* → NULL
      return db.query(sqlBasic, [loanRequestId], (err2, results2) => {
        if (err2 && (err2.code === 'ER_BAD_FIELD_ERROR' || err2.code === 'ER_NO_SUCH_TABLE')) {
          // Fallback 2: ตัด auc.* และ joined table columns ทั้งหมด → NULL
          return db.query(sqlMinimal, [loanRequestId], (err3, results3) => {
            if (err3) { console.error('getCaseDocs minimal fallback error:', err3); return res.status(500).json({ success: false, message: 'Server Error' }) }
            if (!results3 || results3.length === 0) return res.status(404).json({ success: false, message: 'Not found' })
            res.json({ success: true, data: results3[0] })
          })
        }
        if (err2) { console.error('getCaseDocs fallback error:', err2); return res.status(500).json({ success: false, message: 'Server Error' }) }
        if (!results2 || results2.length === 0) return res.status(404).json({ success: false, message: 'Not found' })
        res.json({ success: true, data: results2[0] })
      })
    }
    if (err) { console.error('getCaseDocs error:', err); return res.status(500).json({ success: false, message: 'Server Error' }) }
    if (!results || results.length === 0) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: results[0] })
  })
}

// PUT /case-bank-info/:loanRequestId — บันทึกเลขบัญชี + ชื่อธนาคาร
exports.saveBankInfo = (req, res) => {
  const { loanRequestId } = req.params
  const { bank_account_number, bank_name } = req.body
  db.query(
    'UPDATE loan_requests SET bank_account_number=?, bank_name=?, updated_at=NOW() WHERE id=?',
    [bank_account_number || null, bank_name || null, loanRequestId],
    (err) => {
      if (err) {
        console.error('saveBankInfo error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'บันทึกข้อมูลบัญชีสำเร็จ' })
    }
  )
}

// POST /case-bank-book/:loanRequestId — อัพโหลดสมุดบัญชี
// (multer handled in router, ไฟล์อยู่ใน req.file)
exports.uploadBankBook = (req, res) => {
  const { loanRequestId } = req.params
  if (!req.file) return res.status(400).json({ success: false, message: 'ไม่มีไฟล์' })
  const filePath = `/uploads/${req.file.destination.split('uploads')[1].replace(/\\/g, '/')}/${req.file.filename}`.replace('//', '/')
  db.query(
    'UPDATE loan_requests SET bank_book_file=?, updated_at=NOW() WHERE id=?',
    [filePath, loanRequestId],
    (err) => {
      if (err) {
        console.error('uploadBankBook error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, file_path: filePath, message: 'อัพโหลดสมุดบัญชีสำเร็จ' })
    }
  )
}

// ========== GET investor portfolio (all cases linked to this investor) ==========
exports.getInvestorPortfolio = (req, res) => {
  const { investorId } = req.params
  const sql = `
    SELECT
      i.id AS investor_id, i.investor_code, i.full_name AS investor_name, i.phone AS investor_phone,
      c.id AS case_id, c.case_code, c.status AS case_status,
      c.investor_amount, c.contract_start_date, c.contract_end_date,
      lr.debtor_code, lr.contact_name AS debtor_name, lr.contact_phone AS debtor_phone,
      lr.loan_type_detail,
      at2.approved_credit,
      DATEDIFF(c.contract_end_date, CURDATE()) AS days_remaining
    FROM investors i
    LEFT JOIN investor_withdrawals iw ON iw.investor_id = i.id
    LEFT JOIN cases c ON c.id = iw.case_id
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN approval_transactions at2 ON at2.loan_request_id = c.loan_request_id
    WHERE i.id = ?
    GROUP BY c.id
    ORDER BY c.id DESC
  `
  db.query(sql, [investorId], (err, rows) => {
    if (err) {
      console.error('getInvestorPortfolio error:', err)
      // fallback — just investor info
      return db.query(
        'SELECT id AS investor_id, investor_code, full_name AS investor_name, phone AS investor_phone FROM investors WHERE id = ?',
        [investorId],
        (e2, r2) => res.json({ success: true, investor: r2?.[0] || {}, cases: [] })
      )
    }
    const investor = rows.length
      ? { investor_id: rows[0].investor_id, investor_code: rows[0].investor_code, investor_name: rows[0].investor_name, investor_phone: rows[0].investor_phone }
      : {}
    const cases = rows.filter(r => r.case_id)
    res.json({ success: true, investor, cases })
  })
}

// ========== GET contract expiry dashboard ==========
exports.getContractExpiry = (req, res) => {
  const sql = `
    SELECT
      c.id AS case_id, c.loan_request_id, c.case_code, c.status AS case_status,
      c.contract_start_date, c.contract_end_date,
      c.investor_amount,
      lr.debtor_code, lr.contact_name AS debtor_name, lr.loan_type_detail,
      (SELECT CONCAT(COALESCE(i.investor_code,''),'|',COALESCE(i.full_name,''))
        FROM investors i
        JOIN investor_withdrawals iw2 ON iw2.investor_id = i.id
        WHERE iw2.case_id = c.id LIMIT 1) AS investor_info,
      DATEDIFF(c.contract_end_date, CURDATE()) AS days_remaining
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    WHERE c.contract_end_date IS NOT NULL
      AND c.status NOT IN ('cancelled', 'completed')
    ORDER BY c.contract_end_date ASC
    LIMIT 500
  `
  db.query(sql, (err, results) => {
    if (err) {
      console.error('getContractExpiry error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results || [] })
  })
}

// ========== PUT case contract dates + investor_amount ==========
exports.updateCaseContractInfo = (req, res) => {
  const { caseId } = req.params
  const { investor_amount, contract_start_date, contract_end_date } = req.body

  const fields = {}
  if (investor_amount !== undefined && investor_amount !== '')
    fields.investor_amount = investor_amount ? parseFloat(investor_amount) : null
  if (contract_start_date !== undefined)
    fields.contract_start_date = contract_start_date || null
  if (contract_end_date !== undefined)
    fields.contract_end_date = contract_end_date || null

  if (Object.keys(fields).length === 0)
    return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })

  const set = Object.keys(fields).map(k => `${k} = ?`).join(', ')
  db.query(`UPDATE cases SET ${set} WHERE id = ?`, [...Object.values(fields), caseId], (err) => {
    if (err) {
      console.error('updateCaseContractInfo error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, message: 'บันทึกสำเร็จ' })
  })
}

// GET /investors-docs — รายการนายทุนพร้อมสลิปถอนเงิน (สำหรับ tab นายทุน)
exports.getInvestorsDocs = (req, res) => {
  const { q } = req.query
  let sql = `
    SELECT
      i.id AS investor_id, i.investor_code, i.full_name AS investor_name, i.phone AS investor_phone,
      COUNT(DISTINCT iw.id) AS slip_count,
      GROUP_CONCAT(DISTINCT iw.slip_path ORDER BY iw.id SEPARATOR '|') AS investor_slips,
      GROUP_CONCAT(DISTINCT CONCAT(
        COALESCE(c.case_code,''), '||',
        COALESCE(lr.contact_name,''), '||',
        COALESCE(lr.debtor_code,''), '||',
        COALESCE(lr.id,'')
      ) ORDER BY c.id SEPARATOR ';;') AS cases_info
    FROM investors i
    LEFT JOIN investor_withdrawals iw ON iw.investor_id = i.id
    LEFT JOIN cases c ON c.id = iw.case_id
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    WHERE 1=1
  `
  const params = []
  if (q) {
    sql += ' AND (i.full_name LIKE ? OR i.investor_code LIKE ? OR i.phone LIKE ?)'
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  sql += ' GROUP BY i.id ORDER BY i.investor_code DESC LIMIT 200'
  db.query(sql, params, (err, results) => {
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE')) {
      // Fallback: ตัด join กับตารางที่อาจยังไม่มี
      let sqlFb = `
        SELECT
          i.id AS investor_id, i.investor_code, i.full_name AS investor_name, i.phone AS investor_phone,
          0 AS slip_count, NULL AS investor_slips, NULL AS cases_info
        FROM investors i WHERE 1=1
      `
      if (q) { sqlFb += ' AND (i.full_name LIKE ? OR i.investor_code LIKE ? OR i.phone LIKE ?)' }
      sqlFb += ' ORDER BY i.investor_code DESC LIMIT 200'
      return db.query(sqlFb, params, (err2, r2) => {
        if (err2) { console.error('getInvestorsDocs fallback error:', err2); return res.status(500).json({ success: false, message: 'Server Error' }) }
        res.json({ success: true, data: r2 || [] })
      })
    }
    if (err) {
      console.error('getInvestorsDocs error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results || [] })
  })
}

// ========== PUT: อัพเดทสถานะจ่ายค่าคอม + สลิป (quick-pay จากหน้าบัญชี) ==========
exports.updateAgentPayment = (req, res) => {
  const { agentId } = req.params
  const { payment_status } = req.body

  const fields = {}
  if (payment_status) fields.payment_status = payment_status
  if (req.file) {
    const filePath = `/uploads/commission_slips/${req.file.filename}`
    fields.commission_slip = filePath
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะอัพเดท' })
  }

  db.query('SELECT id FROM agent_accounting WHERE agent_id = ?', [agentId], (err, rows) => {
    if (err) {
      console.error('updateAgentPayment check error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลบัญชีนายหน้า — กรุณาบันทึกค่าคอมมิชชั่นจากฝ่ายออกสัญญาก่อน'
      })
    }

    const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ')
    const values = [...Object.values(fields), agentId]

    db.query(`UPDATE agent_accounting SET ${setClauses} WHERE agent_id = ?`, values, (err2) => {
      if (err2) {
        console.error('updateAgentPayment update error:', err2)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'อัพเดทสำเร็จ' })
    })
  })
}

// GET /agents-docs — รายการนายหน้าพร้อมเคส (สำหรับ tab นายหน้า)
exports.getAgentsDocs = (req, res) => {
  const { q } = req.query
  let sql = `
    SELECT
      a.id AS agent_id, a.agent_code, a.full_name AS agent_name, a.phone AS agent_phone,
      a.id_card_image AS agent_id_card,
      COUNT(DISTINCT c.id) AS case_count,
      GROUP_CONCAT(DISTINCT CONCAT(
        COALESCE(c.id,''), '||',
        COALESCE(c.case_code,''), '||',
        COALESCE(lr.contact_name,''), '||',
        COALESCE(lr.debtor_code,''), '||',
        COALESCE(lr.id,'')
      ) ORDER BY c.id SEPARATOR ';;') AS cases_info,
      aa.commission_amount AS commission_amount,
      aa.commission_slip AS agent_commission_slip,
      aa.payment_status AS commission_status
    FROM agents a
    LEFT JOIN cases c ON c.agent_id = a.id
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agent_accounting aa ON aa.agent_id = a.id
    WHERE 1=1
  `
  const params = []
  if (q) {
    sql += ' AND (a.full_name LIKE ? OR a.agent_code LIKE ? OR a.phone LIKE ?)'
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  sql += ' GROUP BY a.id ORDER BY a.created_at DESC LIMIT 200'
  db.query(sql, params, (err, results) => {
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE')) {
      // Fallback: ตัด join กับตารางที่อาจยังไม่มี
      let sqlFb = `
        SELECT
          a.id AS agent_id, a.agent_code, a.full_name AS agent_name, a.phone AS agent_phone,
          a.id_card_image AS agent_id_card,
          0 AS case_count, NULL AS cases_info, NULL AS commission_amount, NULL AS agent_commission_slip, NULL AS commission_status
        FROM agents a WHERE 1=1
      `
      if (q) { sqlFb += ' AND (a.full_name LIKE ? OR a.agent_code LIKE ? OR a.phone LIKE ?)' }
      sqlFb += ' ORDER BY a.created_at DESC LIMIT 200'
      return db.query(sqlFb, params, (err2, r2) => {
        if (err2) { console.error('getAgentsDocs fallback error:', err2); return res.status(500).json({ success: false, message: 'Server Error' }) }
        res.json({ success: true, data: r2 || [] })
      })
    }
    if (err) {
      console.error('getAgentsDocs error:', err)
      return res.status(500).json({ success: false, message: 'Server Error' })
    }
    res.json({ success: true, data: results || [] })
  })
}

const db = require('../config/db')
const path = require('path')
const fs = require('fs')
const { notifyStatusChange } = require('./notificationController')

// mapping fieldname → subfolder (ต้องตรงกับ uploadIssuing.js)
const folderMap = {
  doc_selling_pledge: 'doc-selling-pledge',
  doc_mortgage:       'doc-mortgage',
  commission_slip:    'commission-slip',   // ★ สลิปค่าดำเนินการจากลูกค้า
  broker_contract:    'broker-contract',   // ★ สัญญาแต่งตั้งนายหน้า
  broker_id:          'broker-id',         // ★ บัตรประชาชนนายหน้า
  doc_sp_broker:      'doc-sp-broker',     // ★ สัญญาแต่งตั้งนายหน้า ขายฝาก
  doc_sp_appendix:    'doc-sp-appendix',   // ★ เอกสารแนบท้ายสัญญา ขายฝาก
  doc_sp_notice:      'doc-sp-notice',     // ★ หนังสือแจ้งเตือน ขายฝาก
  doc_mg_addendum:    'doc-mg-addendum',   // ★ สัญญาต่อท้ายสัญญาจำนอง
  doc_mg_appendix:    'doc-mg-appendix',   // ★ เอกสารแนบท้ายสัญญา จำนอง
  doc_mg_broker:      'doc-mg-broker',     // ★ สัญญาแต่งตั้งนายหน้า จำนอง
}

// Auto-create issuing transaction if it doesn't exist
const autoCreateIssuing = (caseId, callback) => {
  const checkQuery = 'SELECT id FROM issuing_transactions WHERE case_id = ?';
  db.query(checkQuery, [caseId], (err, results) => {
    if (err) return callback(err);

    if (results.length === 0) {
      const insertQuery = 'INSERT INTO issuing_transactions (case_id) VALUES (?)';
      db.query(insertQuery, [caseId], (err, insertResults) => {
        if (err) return callback(err);
        return callback(null, insertResults.insertId);
      });
    } else {
      return callback(null, results[0].id);
    }
  });
};

// GET: Stats for issuing dashboard
exports.getStats = (req, res) => {
  const queries = [
    'SELECT COUNT(*) as count FROM issuing_transactions WHERE contract_appointment = 1',
    'SELECT COUNT(*) as count FROM issuing_transactions WHERE contract_selling_pledge = 1 OR contract_mortgage = 1',
    'SELECT COUNT(*) as count FROM issuing_transactions WHERE reminder_selling_pledge = 1',
    'SELECT COUNT(*) as count FROM issuing_transactions WHERE reminder_mortgage = 1',
    'SELECT COUNT(*) as count FROM issuing_transactions WHERE issuing_status IS NULL OR issuing_status = "pending"',
    'SELECT COUNT(*) as count FROM issuing_transactions WHERE issuing_status = "sent"'
  ];

  let stats = {
    contract_appointment_count: 0,
    contract_count: 0,
    reminder_selling_count: 0,
    reminder_mortgage_count: 0,
    pending_count: 0,
    sent_count: 0
  };

  let completedQueries = 0;
  const total = 6;

  db.query(queries[0], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    stats.contract_appointment_count = results[0].count;
    completedQueries++;
    if (completedQueries === total) res.json({ success: true, stats });
  });

  db.query(queries[1], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    stats.contract_count = results[0].count;
    completedQueries++;
    if (completedQueries === total) res.json({ success: true, stats });
  });

  db.query(queries[2], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    stats.reminder_selling_count = results[0].count;
    completedQueries++;
    if (completedQueries === total) res.json({ success: true, stats });
  });

  db.query(queries[3], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    stats.reminder_mortgage_count = results[0].count;
    completedQueries++;
    if (completedQueries === total) res.json({ success: true, stats });
  });

  db.query(queries[4], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    stats.pending_count = results[0].count;
    completedQueries++;
    if (completedQueries === total) res.json({ success: true, stats });
  });

  db.query(queries[5], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    stats.sent_count = results[0].count;
    completedQueries++;
    if (completedQueries === total) res.json({ success: true, stats });
  });
};

// GET: List all issuing cases
exports.getIssuingCases = (req, res) => {
  const { status, startDate, endDate } = req.query;

  let query = `
    SELECT
      c.id AS case_id,
      c.case_code,
      c.status AS case_status,
      lr.debtor_code,
      lr.contact_name AS debtor_name,
      lr.contact_phone AS debtor_phone,
      a.full_name AS agent_name,
      it.issuing_status,
      it.tracking_no,
      it.tracking_no AS email,
      it.updated_at AS issuing_updated_at,
      lt.officer_name,
      lt.land_office,
      lt.visit_date,
      lt.legal_status,
      lt.attachment,
      lt.doc_selling_pledge,
      lt.deed_selling_pledge,
      lt.doc_extension,
      lt.deed_extension,
      lt.doc_redemption,
      lt.deed_redemption
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN agents a ON a.id = c.agent_id
    LEFT JOIN issuing_transactions it ON it.case_id = c.id
    LEFT JOIN legal_transactions lt ON lt.case_id = c.id
    WHERE 1=1
  `;

  const params = [];

  // Filter by issuing status
  if (status === 'pending') {
    query += ' AND (it.issuing_status IS NULL OR it.issuing_status = "pending")';
  } else if (status && status !== 'all') {
    query += ' AND it.issuing_status = ?';
    params.push(status);
  }

  // Filter by date range
  if (startDate) {
    query += ' AND DATE(it.updated_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND DATE(it.updated_at) <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY it.updated_at DESC';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: results });
  });
};

// GET: Detail of a single issuing case
exports.getIssuingDetail = (req, res) => {
  const caseId = req.params.caseId;

  autoCreateIssuing(caseId, (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    const detailQuery = `
      SELECT
        c.*,
        lr.debtor_code, lr.contact_name, lr.contact_phone, lr.contact_line,
        lr.contact_email,
        lr.property_type, lr.loan_type, lr.loan_type_detail, lr.province, lr.district, lr.subdistrict,
        lr.property_address, lr.location_url,
        lr.deed_number, lr.land_area, lr.has_obligation, lr.obligation_count,
        lr.images, lr.appraisal_images, lr.deed_images, lr.appraisal_book_image,
        a.full_name AS agent_name, a.phone AS agent_phone, a.agent_code, a.commission_rate AS agent_commission_rate,
        at2.id AS approval_id, at2.approval_type,
        at2.approved_credit, at2.interest_per_year, at2.interest_per_month,
        at2.operation_fee, at2.land_tax_estimate, at2.advance_interest,
        at2.is_cancelled, at2.approval_status,
        it.id AS issuing_id,
        it.contract_appointment, it.contract_selling_pledge, it.contract_mortgage,
        it.reminder_selling_pledge, it.reminder_mortgage,
        it.tracking_no, it.issuing_status, it.note AS issuing_note,
        it.doc_selling_pledge AS issuing_doc_selling_pledge,
        it.doc_mortgage AS issuing_doc_mortgage,
        it.doc_sp_broker AS issuing_doc_sp_broker,
        it.doc_sp_appendix AS issuing_doc_sp_appendix,
        it.doc_sp_notice AS issuing_doc_sp_notice,
        it.doc_mg_addendum AS issuing_doc_mg_addendum,
        it.doc_mg_appendix AS issuing_doc_mg_appendix,
        it.doc_mg_broker AS issuing_doc_mg_broker,
        c.broker_contract_file AS issuing_broker_contract,
        c.broker_id_file AS issuing_broker_id,
        it.created_at AS issuing_created_at, it.updated_at AS issuing_updated_at,
        -- ★ SOP 5 Closing Checklist
        it.closing_check_schedule, it.closing_check_personal,
        it.closing_check_legal, it.closing_check_docs,
        -- ★ สลิปค่าดำเนินการ
        it.commission_slip AS issuing_commission_slip,
        -- Checklist docs (marital)
        lr.marital_status,
        lr.borrower_id_card, lr.house_reg_book, lr.name_change_doc, lr.divorce_doc,
        lr.spouse_id_card, lr.spouse_reg_copy, lr.marriage_cert,
        lr.single_cert, lr.death_cert, lr.will_court_doc, lr.testator_house_reg,
        -- Checklist docs (property)
        lr.deed_copy, lr.building_permit, lr.house_reg_prop, lr.sale_contract, lr.debt_free_cert,
        lr.blueprint, lr.property_photos, lr.land_tax_receipt, lr.maps_url,
        lr.condo_title_deed, lr.condo_location_map, lr.common_fee_receipt, lr.floor_plan,
        lr.location_sketch_map, lr.land_use_cert, lr.rental_contract, lr.business_reg
      FROM cases c
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      LEFT JOIN agents a ON a.id = c.agent_id
      LEFT JOIN approval_transactions at2 ON at2.loan_request_id = c.loan_request_id
      LEFT JOIN issuing_transactions it ON it.case_id = c.id
      WHERE c.id = ?
    `;

    db.query(detailQuery, [caseId], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      res.json({ success: true, caseData: results[0] });
    });
  });
};

// PUT: Update issuing transaction (รองรับ FormData + อัพโหลดเอกสาร)
exports.updateIssuing = (req, res) => {
  const caseId = req.params.caseId;
  const body = req.body || {};
  const {
    contract_appointment,
    contract_selling_pledge,
    contract_mortgage,
    reminder_selling_pledge,
    reminder_mortgage,
    email,        // ชื่อใหม่จาก frontend (เก็บใน tracking_no column)
    tracking_no,  // รองรับ backward compat
    issuing_status,
    note,
    commission_amount,  // ★ ค่าคอมมิชชั่นนายหน้า
    // ★ SOP 5 Closing Checklist
    closing_check_schedule,
    closing_check_personal,
    closing_check_legal,
    closing_check_docs
  } = body;

  // อีเมลสำหรับส่งสัญญา: อัพเดทได้เฉพาะ sales / super_admin เท่านั้น
  const callerDept = req.user?.department || ''
  const canEditEmail = callerDept === 'sales' || callerDept === 'super_admin'
  const emailValue = canEditEmail
    ? (email !== undefined ? email : tracking_no)
    : undefined   // issuing team → ไม่อัพเดท email column

  autoCreateIssuing(caseId, (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    const fields = [
      'contract_appointment = ?',
      'contract_selling_pledge = ?',
      'contract_mortgage = ?',
      'reminder_selling_pledge = ?',
      'reminder_mortgage = ?',
      // tracking_no (email) → เพิ่มเฉพาะ sales/super_admin เท่านั้น (ใส่ด้านล่างแบบ conditional)
      'issuing_status = ?',
      'note = ?',
      'commission_amount = ?',  // ★ ค่าคอมมิชชั่น
      // ★ SOP 5 Closing Checklist
      'closing_check_schedule = ?',
      'closing_check_personal = ?',
      'closing_check_legal = ?',
      'closing_check_docs = ?'
    ];
    if (emailValue !== undefined) fields.splice(5, 0, 'tracking_no = ?')

    const params = [
      contract_appointment || 0,
      contract_selling_pledge || 0,
      contract_mortgage || 0,
      reminder_selling_pledge || 0,
      reminder_mortgage || 0,
      ...(emailValue !== undefined ? [emailValue || null] : []),
      issuing_status || 'pending',
      note || null,
      commission_amount ? parseFloat(commission_amount) : null,
      // ★ SOP 5 Closing Checklist
      closing_check_schedule ? 1 : 0,
      closing_check_personal ? 1 : 0,
      closing_check_legal    ? 1 : 0,
      closing_check_docs     ? 1 : 0,
    ];

    // จัดการไฟล์อัพโหลด
    const files = req.files || {};
    console.log(`[updateIssuing] caseId=${caseId} files received:`, Object.keys(files))
    // issuing_transactions fields
    const docFields = ['doc_selling_pledge', 'doc_mortgage', 'commission_slip', 'doc_sp_broker', 'doc_sp_appendix', 'doc_sp_notice', 'doc_mg_addendum', 'doc_mg_appendix', 'doc_mg_broker'];
    docFields.forEach(docField => {
      if (files[docField] && files[docField].length > 0) {
        const subfolder = folderMap[docField] || 'general'
        const docPath = `uploads/issuing/${subfolder}/${files[docField][0].filename}`
        console.log(`[updateIssuing] saving ${docField} → ${docPath}`)
        fields.push(`${docField} = ?`)
        params.push(docPath)
      }
    });

    // broker docs → เขียนลง cases table (ใช้ร่วมกับฝ่ายขาย)
    const brokerCaseFields = []
    const brokerCaseParams = []
    if (files['broker_contract'] && files['broker_contract'].length > 0) {
      const p = `uploads/issuing/broker-contract/${files['broker_contract'][0].filename}`
      brokerCaseFields.push('broker_contract_file = ?')
      brokerCaseParams.push(p)
    }
    if (files['broker_id'] && files['broker_id'].length > 0) {
      const p = `uploads/issuing/broker-id/${files['broker_id'][0].filename}`
      brokerCaseFields.push('broker_id_file = ?')
      brokerCaseParams.push(p)
    }

    params.push(caseId);
    const updateQuery = `UPDATE issuing_transactions SET ${fields.join(', ')} WHERE case_id = ?`;

    db.query(updateQuery, params, (err) => {
      if (err) {
        console.error('updateIssuing error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }

      // ★ Auto-sync commission_amount → agent_accounting (fire-and-forget)
      if (commission_amount && parseFloat(commission_amount) > 0) {
        db.query('SELECT agent_id FROM cases WHERE id = ?', [caseId], (errA, rowsA) => {
          if (!errA && rowsA.length > 0 && rowsA[0].agent_id) {
            const agentId = rowsA[0].agent_id
            db.query('SELECT id FROM agent_accounting WHERE agent_id = ?', [agentId], (errB, rowsB) => {
              if (errB) return
              if (rowsB.length > 0) {
                db.query(
                  'UPDATE agent_accounting SET commission_amount = ?, case_id = ? WHERE agent_id = ?',
                  [parseFloat(commission_amount), caseId, agentId],
                  (errC) => { if (errC) console.error('auto-sync commission error:', errC) }
                )
              } else {
                db.query(
                  'INSERT INTO agent_accounting (agent_id, case_id, commission_amount, payment_status) VALUES (?, ?, ?, ?)',
                  [agentId, caseId, parseFloat(commission_amount), 'unpaid'],
                  (errC) => { if (errC) console.error('auto-create agent_accounting error:', errC) }
                )
              }
            })
          }
        })
      }

      // อัปเดต broker docs ใน cases table (fire-and-forget)
      if (brokerCaseFields.length > 0) {
        db.query(
          `UPDATE cases SET ${brokerCaseFields.join(', ')} WHERE id = ?`,
          [...brokerCaseParams, caseId],
          (errBroker) => { if (errBroker) console.error('broker cases update error:', errBroker) }
        )
      }

      // ===== manual notify flags จากหน้า IssuingEditPage =====
      const doIssuingManualNotify = (lrId) => {
        try {
          const io = req.app.get('io')
          const userId = req.user ? req.user.id : null
          if (req.body.notify_legal_save === '1') {
            notifyStatusChange(parseInt(lrId), parseInt(caseId), null, 'issuing_to_legal', io, userId)
          }
          if (req.body.notify_accounting_save === '1') {
            notifyStatusChange(parseInt(lrId), parseInt(caseId), null, 'issuing_to_accounting', io, userId)
          }
          if (req.body.notify_sales_save === '1') {
            notifyStatusChange(parseInt(lrId), parseInt(caseId), null, 'issuing_to_sales', io, userId)
          }
        } catch (e) { console.error('issuing manual notify error:', e.message) }
      }

      // auto-sync cases.status ตาม issuing_status
      if (issuing_status === 'sent') {
        db.query('UPDATE cases SET status = ? WHERE id = ?', ['preparing_docs', caseId], (err2) => {
          if (err2) console.error('sync cases.status error:', err2)

          // ===== ส่งแจ้งเตือน (ลูกค้า + ภายใน) =====
          db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err3, rows) => {
            if (!err3 && rows.length > 0 && rows[0].loan_request_id) {
              const io = req.app.get('io')
              const userId = req.user ? req.user.id : null
              notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, 'issuing_sent', io, userId)
              notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, 'preparing_docs', io, userId)
              doIssuingManualNotify(rows[0].loan_request_id)
            }
          })

          res.json({ success: true, message: 'อัพเดทข้อมูลออกสัญญาสำเร็จ' })
        })
      } else {
        // ดึง loan_request_id สำหรับ manual notify
        db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err2, rows) => {
          if (!err2 && rows.length > 0) doIssuingManualNotify(rows[0].loan_request_id)
        })
        res.json({ success: true, message: 'อัพเดทข้อมูลออกสัญญาสำเร็จ' })
      }
    });
  });
};

// POST: ลบเอกสารออกสัญญาเฉพาะคอลัมน์
exports.deleteDocument = (req, res) => {
  const { case_id, column } = req.body;

  const allowed = ['doc_selling_pledge', 'doc_mortgage', 'commission_slip', 'broker_contract', 'broker_id', 'doc_sp_broker', 'doc_sp_appendix', 'doc_sp_notice', 'doc_mg_addendum', 'doc_mg_appendix', 'doc_mg_broker'];
  if (!allowed.includes(column)) {
    return res.status(400).json({ success: false, message: 'Not allowed' });
  }

  // broker docs อยู่ใน cases table; อื่นๆ อยู่ใน issuing_transactions
  const brokerColMap = { broker_contract: 'broker_contract_file', broker_id: 'broker_id_file' }
  const isBroker = column in brokerColMap
  const dbTable = isBroker ? 'cases' : 'issuing_transactions'
  const dbCol   = isBroker ? brokerColMap[column] : column
  const whereCol = isBroker ? 'id' : 'case_id'

  // ดึง path เดิมจาก DB ก่อน เพื่อลบไฟล์จริง
  db.query(
    `SELECT ${dbCol} AS filePath FROM ${dbTable} WHERE ${whereCol} = ?`,
    [case_id],
    (errSelect, rows) => {
      if (errSelect) {
        console.error('deleteDocument select error:', errSelect);
        return res.status(500).json({ success: false, message: 'Server Error' });
      }

      const oldFilePath = rows && rows[0] ? rows[0].filePath : null;

      // SET column = NULL ใน DB
      db.query(
        `UPDATE ${dbTable} SET ${dbCol} = NULL WHERE ${whereCol} = ?`,
        [case_id],
        (err) => {
          if (err) {
            console.error('deleteDocument error:', err);
            return res.status(500).json({ success: false, message: 'Server Error' });
          }

          // ลบไฟล์จริงจาก disk
          if (oldFilePath) {
            const fullPath = path.join(__dirname, '..', oldFilePath);
            fs.unlink(fullPath, (unlinkErr) => {
              if (unlinkErr) console.error('ลบไฟล์จาก disk ไม่สำเร็จ:', unlinkErr.message);
            });
          }

          res.json({ success: true, message: 'ลบเอกสารสำเร็จ' });
        }
      );
    }
  );
};

// PUT: Quick update issuing status only
exports.updateIssuingStatus = (req, res) => {
  const caseId = req.params.caseId;
  const { issuing_status } = req.body;

  autoCreateIssuing(caseId, (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    const updateQuery = 'UPDATE issuing_transactions SET issuing_status = ? WHERE case_id = ?';

    db.query(updateQuery, [issuing_status || 'pending', caseId], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      // If status is 'sent', also update case status
      if (issuing_status === 'sent') {
        const caseUpdateQuery = 'UPDATE cases SET status = ? WHERE id = ?';
        db.query(caseUpdateQuery, ['preparing_docs', caseId], (err) => {
          if (err) return res.status(500).json({ success: false, message: err.message });

          // ===== ส่งแจ้งเตือน =====
          db.query('SELECT loan_request_id FROM cases WHERE id = ?', [caseId], (err3, rows) => {
            if (!err3 && rows.length > 0 && rows[0].loan_request_id) {
              const io = req.app.get('io')
              const userId = req.user ? req.user.id : null
              notifyStatusChange(rows[0].loan_request_id, parseInt(caseId), null, 'issuing_sent', io, userId)
            }
          })

          res.json({ success: true, message: 'Status updated and case prepared for docs' });
        });
      } else {
        res.json({ success: true, message: 'Status updated' });
      }
    });
  });
};
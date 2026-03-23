const db = require('../config/db');

// ============================================================
// GET /api/admin/dashboard/daily-report
// รายงานประจำวันสำหรับ Super Admin
// ============================================================
exports.getDailyReport = (req, res) => {
  const queries = {}

  // 1. เคสใหม่วันนี้ vs เมื่อวาน
  queries.todayCases = `SELECT COUNT(*) as cnt FROM cases WHERE DATE(created_at) = CURDATE()`
  queries.yesterdayCases = `SELECT COUNT(*) as cnt FROM cases WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`

  // 2. เคสที่สถานะเปลี่ยนเป็น credit_approved วันนี้ vs เมื่อวาน
  queries.todayApproved = `SELECT COUNT(*) as cnt FROM cases WHERE status = 'credit_approved' AND DATE(updated_at) = CURDATE()`
  queries.yesterdayApproved = `SELECT COUNT(*) as cnt FROM cases WHERE status = 'credit_approved' AND DATE(updated_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`

  // 3. เคสปิดดีล (completed) วันนี้ vs เมื่อวาน
  queries.todayCompleted = `SELECT COUNT(*) as cnt FROM cases WHERE status = 'completed' AND DATE(updated_at) = CURDATE()`
  queries.yesterdayCompleted = `SELECT COUNT(*) as cnt FROM cases WHERE status = 'completed' AND DATE(updated_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`

  // 4. เคสยกเลิกวันนี้ vs เมื่อวาน
  queries.todayCancelled = `SELECT COUNT(*) as cnt FROM cases WHERE status = 'cancelled' AND DATE(updated_at) = CURDATE()`
  queries.yesterdayCancelled = `SELECT COUNT(*) as cnt FROM cases WHERE status = 'cancelled' AND DATE(updated_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`

  // 5. ยอดวงเงินรวมของเคสที่อนุมัติวันนี้
  queries.todayApprovedAmount = `
    SELECT COALESCE(SUM(lr.loan_amount), 0) as total
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    WHERE c.status IN ('credit_approved','auction_completed','completed','pending_auction')
      AND DATE(c.updated_at) = CURDATE()
  `

  // 6. งานค้างในแต่ละฝ่าย (pipeline) — ใช้ logic เดียวกับแต่ละ dept controller เพื่อให้ตัวเลขตรงกัน
  queries.pipeline = `
    SELECT
      -- ฝ่ายขาย: loan_requests ที่ยังไม่มีเคส หรือเคสที่ยังอยู่ขั้นต้น (ตรงกับ SalesPage)
      (SELECT COUNT(*) FROM loan_requests lr
        LEFT JOIN cases c ON c.loan_request_id = lr.id
        WHERE c.id IS NULL
          OR c.status NOT IN ('completed','cancelled','rejected','appraisal_not_passed','auction_completed')
      ) AS sales_queue,

      -- ฝ่ายอนุมัติ: นับจาก loan_requests (ตรงกับ approvalController.getStats) เพราะ case ยังไม่ถูกสร้างก่อนผ่านการอนุมัติ
      (SELECT COUNT(*) FROM loan_requests lr
        LEFT JOIN approval_transactions at2 ON at2.loan_request_id = lr.id
        WHERE at2.id IS NULL OR at2.approval_status = 'pending'
      ) AS approval_queue,

      -- ฝ่ายประเมิน: loan_requests ที่ถูก assign appraisal_type แล้วแต่ยังไม่มีผลประเมิน
      (SELECT COUNT(*) FROM loan_requests
        WHERE appraisal_type IS NOT NULL
          AND (appraisal_result IS NULL OR appraisal_result = '')
      ) AS appraisal_queue,

      -- ฝ่ายออกสัญญา: issuing_transactions ที่ยัง pending (ตรงกับ issuingController getStats)
      (SELECT COUNT(*) FROM issuing_transactions
        WHERE issuing_status IS NULL OR issuing_status = 'pending'
      ) AS issuing_queue,

      -- ฝ่ายนิติกรรม: legal_transactions ที่ยัง pending (ตรงกับ legalController getStats)
      (SELECT COUNT(*) FROM cases c
        LEFT JOIN legal_transactions lt ON lt.case_id = c.id
        WHERE (lt.id IS NULL OR lt.legal_status = 'pending')
          AND c.status NOT IN ('completed','cancelled','rejected')
      ) AS legal_queue,

      -- ฝ่ายประมูล: auction_transactions ที่ยัง pending (ตรงกับ auctionController getStats)
      (SELECT COUNT(*) FROM cases c
        LEFT JOIN auction_transactions auc ON auc.case_id = c.id
        WHERE (auc.id IS NULL OR auc.auction_status = 'pending')
          AND c.status NOT IN ('completed','cancelled','rejected')
      ) AS auction_queue,

      -- เคส active ทั้งหมด
      (SELECT COUNT(*) FROM cases
        WHERE status NOT IN ('completed','cancelled','rejected','appraisal_not_passed')
      ) AS total_active
  `

  // 7. เทรนด์รายวัน 7 วัน (เคสใหม่ + อนุมัติ)
  queries.weekTrend = `
    SELECT
      DATE(created_at) as day,
      COUNT(*) as new_cases,
      SUM(CASE WHEN status IN ('credit_approved','completed','auction_completed') THEN 1 ELSE 0 END) as approved
    FROM cases
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `

  // 8. ประมูลสำเร็จวันนี้ + ยอดลงทุน
  queries.todayAuction = `
    SELECT COUNT(*) as cnt, COALESCE(SUM(selling_pledge_amount), 0) as total_invested
    FROM auction_transactions
    WHERE DATE(created_at) = CURDATE() AND is_cancelled = 0
  `

  // 9. Lead ใหม่จาก Sales วันนี้ (loan_requests)
  queries.todayLeads = `SELECT COUNT(*) as cnt FROM loan_requests WHERE DATE(created_at) = CURDATE()`
  queries.yesterdayLeads = `SELECT COUNT(*) as cnt FROM loan_requests WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`

  // 11. อนุมัติวันนี้ (approval_transactions approved)
  queries.todayApprovalDone = `SELECT COUNT(*) as cnt FROM approval_transactions WHERE approval_status = 'approved' AND DATE(updated_at) = CURDATE()`

  // 12. ออกสัญญาเสร็จวันนี้ (issuing_transactions sent) — enum: pending/sent/cancelled เท่านั้น ไม่มี 'completed'
  queries.todayIssuingDone = `SELECT COUNT(*) as cnt FROM issuing_transactions WHERE issuing_status = 'sent' AND DATE(updated_at) = CURDATE()`

  // 13. นิติกรรมเสร็จวันนี้ (legal_transactions completed)
  queries.todayLegalDone = `SELECT COUNT(*) as cnt FROM legal_transactions WHERE legal_status = 'completed' AND DATE(updated_at) = CURDATE()`

  // 10. รายได้โดยประมาณ — วงเงินรวม × ดอกเบี้ยเฉลี่ย (จาก auction_transactions)
  queries.revenueEstimate = `
    SELECT
      COALESCE(SUM(at2.selling_pledge_amount), 0) as total_invested,
      COALESCE(AVG(at2.interest_rate), 0) as avg_rate,
      COALESCE(AVG(at2.contract_years), 0) as avg_years
    FROM auction_transactions at2
    WHERE at2.is_cancelled = 0 AND at2.auction_status = 'auctioned'
  `

  const keys = Object.keys(queries)
  const results = {}
  let completed = 0

  keys.forEach(key => {
    db.query(queries[key], (err, rows) => {
      completed++
      results[key] = err ? [] : rows
      if (completed === keys.length) {
        sendDailyReport(res, results)
      }
    })
  })
}

function sendDailyReport(res, r) {
  const get = (key, field = 'cnt') => Number((r[key] && r[key][0] && r[key][0][field]) || 0)
  const pct = (today, yesterday) => {
    if (yesterday === 0) return today > 0 ? 100 : 0
    return Math.round(((today - yesterday) / yesterday) * 100)
  }

  const todayCases = get('todayCases')
  const yesterdayCases = get('yesterdayCases')
  const todayApproved = get('todayApproved')
  const yesterdayApproved = get('yesterdayApproved')
  const todayCompleted = get('todayCompleted')
  const yesterdayCompleted = get('yesterdayCompleted')
  const todayCancelled = get('todayCancelled')
  const yesterdayCancelled = get('yesterdayCancelled')
  const todayLeads = get('todayLeads')
  const yesterdayLeads = get('yesterdayLeads')

  const pipeline = (r.pipeline && r.pipeline[0]) || {}
  const auction = (r.todayAuction && r.todayAuction[0]) || {}
  const revenue = (r.revenueEstimate && r.revenueEstimate[0]) || {}

  // สร้าง 7 วัน trend
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last7.push(d.toISOString().slice(0, 10))
  }
  const trendMap = {}
  ;(r.weekTrend || []).forEach(row => {
    if (row.day) trendMap[row.day.toISOString ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10)] = row
  })
  const weekTrend = last7.map(day => ({
    day,
    new_cases: Number((trendMap[day] && trendMap[day].new_cases) || 0),
    approved: Number((trendMap[day] && trendMap[day].approved) || 0),
  }))

  // ยอดรายได้โดยประมาณ: วงเงินรวม × อัตราดอกเบี้ยต่อปี
  const totalInvested = Number(revenue.total_invested || 0)
  const avgRate = Number(revenue.avg_rate || 0)
  const estimatedAnnualIncome = Math.round(totalInvested * (avgRate / 100))
  const estimatedMonthlyIncome = Math.round(estimatedAnnualIncome / 12)

  res.json({
    success: true,
    today: {
      new_cases: todayCases,
      new_cases_pct: pct(todayCases, yesterdayCases),
      approved: todayApproved,
      approved_pct: pct(todayApproved, yesterdayApproved),
      completed: todayCompleted,
      completed_pct: pct(todayCompleted, yesterdayCompleted),
      cancelled: todayCancelled,
      cancelled_pct: pct(todayCancelled, yesterdayCancelled),
      leads: todayLeads,
      leads_pct: pct(todayLeads, yesterdayLeads),
      approved_amount: Number((r.todayApprovedAmount && r.todayApprovedAmount[0] && r.todayApprovedAmount[0].total) || 0),
      auction_cnt: Number(auction.cnt || 0),
      auction_invested: Number(auction.total_invested || 0),
      approval_done: get('todayApprovalDone'),
      issuing_done: get('todayIssuingDone'),
      legal_done: get('todayLegalDone'),
    },
    pipeline: {
      sales: Number(pipeline.sales_queue || 0),
      approval: Number(pipeline.approval_queue || 0),
      appraisal: Number(pipeline.appraisal_queue || 0),
      issuing: Number(pipeline.issuing_queue || 0),
      legal: Number(pipeline.legal_queue || 0),
      auction: Number(pipeline.auction_queue || 0),
      total_active: Number(pipeline.total_active || 0),
    },
    revenue: {
      total_invested: totalInvested,
      avg_rate: avgRate,
      estimated_annual: estimatedAnnualIncome,
      estimated_monthly: estimatedMonthlyIncome,
    },
    week_trend: weekTrend,
  })
}

// GET /api/admin/dashboard
exports.getDashboard = (req, res) => {
  const queries = {};

  // 1. Stat Cards — แต่ละ status นับใน bucket เดียว ไม่ซ้อนกัน
  queries.totalCases = `SELECT COUNT(*) as total FROM cases`;
  // รอดำเนินการ: ขั้นต้นฝ่ายขาย ยังไม่เข้ากระบวนการ
  queries.pendingCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('new','contacting','incomplete','pending')`;
  // กำลังตรวจสอบ: อยู่กับฝ่ายอนุมัติ (ยังไม่ผ่าน credit)
  queries.reviewingCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('reviewing','pending_approve')`;
  // กำลังประเมิน: อยู่กับฝ่ายประเมิน
  queries.appraisingCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('awaiting_appraisal_fee','appraisal_scheduled','appraisal_in_progress','appraisal_passed')`;
  // อนุมัติแล้ว: ผ่าน credit — อยู่ระหว่างออกสัญญา/นิติกรรม/รอประมูล
  queries.approvedCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('credit_approved','preparing_docs','legal_scheduled','legal_completed','pending_auction')`;
  // ปฏิเสธ: ไม่ผ่านทั้งประเมินและ credit
  queries.rejectedCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('appraisal_not_passed','rejected')`;
  // จับคู่/เสร็จสิ้น: มีนายทุนแล้ว / ปิดดีล
  queries.matchedCases = `SELECT COUNT(*) as total FROM cases WHERE status IN ('matched','auction_completed','completed')`;
  queries.cancelledCases = `SELECT COUNT(*) as total FROM cases WHERE status = 'cancelled'`;

  // 2. Property Type — จำนวนตามประเภททรัพย์ (สำหรับ Donut Chart)
  queries.propertyTypes = `
    SELECT lr.property_type, COUNT(*) as count
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
    GROUP BY lr.property_type
  `;

  // 3. สรุปยอดเงิน (จาก cases JOIN loan_requests)
  queries.totalLoanAmount = `
    SELECT COALESCE(SUM(lr.loan_amount), 0) as total
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
  `;
  queries.totalEstimatedValue = `
    SELECT COALESCE(SUM(lr.estimated_value), 0) as total
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
  `;

  // 4. เคสล่าสุด 10 รายการ (จาก cases + loan_requests)
  queries.recentCases = `
    SELECT c.id, lr.debtor_code, lr.property_type, lr.loan_amount, lr.estimated_value,
           c.status, lr.province, lr.district, lr.contact_name, c.created_at,
           lr.images
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
    ORDER BY c.created_at DESC
    LIMIT 10
  `;

  // 5. นับเคสรายวัน 7 วันล่าสุด (สำหรับ Bar Chart) — จาก cases
  queries.casesPerDay = `
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM cases
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  // 6. Top Investors (จากตาราง auction_transactions)
  queries.topInvestors = `
    SELECT investor_name, investor_code,
           COUNT(*) as total_deals,
           COALESCE(SUM(selling_pledge_amount), 0) as total_invested
    FROM auction_transactions
    WHERE investor_name IS NOT NULL AND investor_name != ''
    GROUP BY investor_name, investor_code
    ORDER BY total_invested DESC
    LIMIT 5
  `;

  // 8. Loan Type breakdown — จาก cases JOIN loan_requests
  queries.loanTypeBreakdown = `
    SELECT lr.loan_type, COUNT(*) as count
    FROM cases c
    LEFT JOIN loan_requests lr ON c.loan_request_id = lr.id
    GROUP BY lr.loan_type
  `;

  // 9. Cases per month (6 เดือนล่าสุด) — จาก cases
  queries.casesPerMonth = `
    SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
    FROM cases
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `;

  // 10. Auction stats (จากตาราง auction_transactions)
  queries.auctionStats = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN auction_status = 'pending' THEN 1 ELSE 0 END) as auctioning,
      SUM(CASE WHEN auction_status = 'auctioned' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN auction_status = 'cancelled' OR is_cancelled = 1 THEN 1 ELSE 0 END) as no_bids
    FROM auction_transactions
  `;

  // 11. ★ เคสค้าง — เคสที่ไม่ได้อัพเดทสถานะนาน >7 วัน (ไม่รวมที่จบแล้ว)
  queries.staleCases = `
    SELECT COUNT(*) as total
    FROM cases
    WHERE status NOT IN ('completed','cancelled','matched','auction_completed')
      AND DATEDIFF(NOW(), updated_at) > 7
  `;

  // 12. ★ คิวประเมิน — เคสที่อยู่ในขั้นตอนประเมินจริงๆ (ไม่รวม new/contacting ที่ยังอยู่กับฝ่ายขาย)
  queries.appraisalQueue = `
    SELECT COUNT(*) as total
    FROM cases
    WHERE status IN ('awaiting_appraisal_fee','appraisal_scheduled','appraisal_in_progress')
  `;

  // 13. ★ แชทรอตอบ — conv ที่มีข้อความล่าสุดจากลูกหนี้ แต่ยังไม่มีการตอบ
  queries.chatWaiting = `
    SELECT COUNT(*) as total
    FROM chat_conversations cc
    WHERE cc.status != 'closed'
      AND (cc.first_response_seconds IS NULL OR cc.last_message_from = 'customer')
      AND cc.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `;

  // Execute all queries in parallel
  const keys = Object.keys(queries);
  const results = {};
  let completed = 0;
  let hasError = false;

  keys.forEach(key => {
    db.query(queries[key], (err, rows) => {
      completed++;

      if (err) {
        console.log(`Dashboard query error (${key}):`, err.message);
        // ไม่ error ทั้งหมด ให้ค่า default แทน
        results[key] = key.includes('total') || key.includes('pending') || key.includes('reviewing') ||
                       key.includes('appraising') || key.includes('approved') || key.includes('rejected') ||
                       key.includes('matched') || key.includes('cancelled') || key.includes('stale') ||
                       key.includes('Queue') || key.includes('Waiting')
          ? [{ total: 0 }]
          : [];
      } else {
        results[key] = rows;
      }

      // ทุก query เสร็จแล้ว → ส่ง response
      if (completed === keys.length) {
        sendDashboardResponse(res, results);
      }
    });
  });
};

function sendDashboardResponse(res, r) {
  // Stat cards
  const stats = {
    totalCases: r.totalCases[0]?.total || 0,
    pendingCases: r.pendingCases[0]?.total || 0,
    reviewingCases: r.reviewingCases[0]?.total || 0,
    appraisingCases: r.appraisingCases[0]?.total || 0,
    approvedCases: r.approvedCases[0]?.total || 0,
    rejectedCases: r.rejectedCases[0]?.total || 0,
    matchedCases: r.matchedCases[0]?.total || 0,
    cancelledCases: r.cancelledCases[0]?.total || 0,
    totalLoanAmount: r.totalLoanAmount[0]?.total || 0,
    totalEstimatedValue: r.totalEstimatedValue[0]?.total || 0,
    // ★ Alert stats
    staleCases: r.staleCases[0]?.total || 0,
    appraisalQueue: r.appraisalQueue[0]?.total || 0,
    chatWaiting: r.chatWaiting[0]?.total || 0,
  };

  // Auction stats
  const auctionStats = {
    auctioning: r.auctionStats[0]?.auctioning || 0,
    completed: r.auctionStats[0]?.completed || 0,
    noBids: r.auctionStats[0]?.no_bids || 0,
    total: r.auctionStats[0]?.total || 0,
  };

  // Property type for donut chart
  const propertyTypes = (r.propertyTypes || []).map(row => ({
    type: row.property_type || 'unknown',
    count: row.count
  }));

  // Cases per day for bar chart
  const casesPerDay = (r.casesPerDay || []).map(row => ({
    date: row.date,
    count: row.count
  }));

  // Cases per month
  const casesPerMonth = (r.casesPerMonth || []).map(row => ({
    month: row.month,
    count: row.count
  }));

  // Recent cases
  const recentCases = (r.recentCases || []).map(row => ({
    id: row.id,
    debtor_code: row.debtor_code,
    property_type: row.property_type,
    loan_amount: row.loan_amount,
    estimated_value: row.estimated_value,
    status: row.status,
    province: row.province,
    district: row.district,
    contact_name: row.contact_name,
    created_at: row.created_at,
    image: row.images ? (typeof row.images === 'string' ? row.images.split(',')[0] : null) : null
  }));

  // Top investors
  const topInvestors = (r.topInvestors || []).map((row, idx) => ({
    id: idx + 1,
    name: row.investor_name,
    code: row.investor_code,
    totalDeals: row.total_deals,
    totalInvested: row.total_invested
  }));

  // Loan type breakdown
  const loanTypeBreakdown = (r.loanTypeBreakdown || []).map(row => ({
    type: row.loan_type,
    count: row.count
  }));

  res.json({
    success: true,
    stats,
    auctionStats,
    propertyTypes,
    casesPerDay,
    casesPerMonth,
    recentCases,
    topInvestors,
    loanTypeBreakdown
  });
}

// ============================================================
// GET /api/admin/dashboard/chat-sla
// รายงาน SLA แชท รายเซลล์ — response time, >5min, lead quality
// Query: ?range=today|week|month (default: week)
// ============================================================
exports.getChatSlaReport = (req, res) => {
  const range = req.query.range || 'week'
  let dateFilter
  if (range === 'today') {
    dateFilter = `DATE(c.created_at) = CURDATE()`
  } else if (range === 'month') {
    dateFilter = `c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  } else {
    dateFilter = `c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  }

  const queries = []

  // 1. SLA รายเซลล์ (grouped by first_response_by → ชื่อ admin)
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        c.first_response_by,
        au.full_name,
        au.nickname,
        COUNT(*) AS total_convs,
        SUM(CASE WHEN c.first_response_seconds IS NOT NULL THEN 1 ELSE 0 END) AS responded,
        SUM(CASE WHEN c.first_response_seconds IS NULL THEN 1 ELSE 0 END) AS no_response,
        ROUND(AVG(CASE WHEN c.first_response_seconds IS NOT NULL THEN c.first_response_seconds END)) AS avg_seconds,
        SUM(CASE WHEN c.first_response_seconds <= 120 THEN 1 ELSE 0 END) AS fast_count,
        SUM(CASE WHEN c.first_response_seconds > 120 AND c.first_response_seconds <= 300 THEN 1 ELSE 0 END) AS ok_count,
        SUM(CASE WHEN c.first_response_seconds > 300 THEN 1 ELSE 0 END) AS slow_count,
        SUM(CASE WHEN c.lead_quality IN ('hot','qualified') THEN 1 ELSE 0 END) AS quality_leads,
        SUM(CASE WHEN c.lead_quality = 'ghost' THEN 1 ELSE 0 END) AS ghost_leads
      FROM chat_conversations c
      LEFT JOIN admin_users au ON au.username = c.first_response_by
      WHERE ${dateFilter}
        AND c.first_response_by IS NOT NULL
      GROUP BY c.first_response_by, au.full_name, au.nickname
      ORDER BY avg_seconds ASC
    `, (err, rows) => resolve({ key: 'per_admin', data: err ? [] : rows }))
  }))

  // 2. Overall SLA summary
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        COUNT(*) AS total_convs,
        SUM(CASE WHEN first_response_seconds IS NOT NULL THEN 1 ELSE 0 END) AS responded,
        SUM(CASE WHEN first_response_seconds IS NULL THEN 1 ELSE 0 END) AS no_response,
        ROUND(AVG(CASE WHEN first_response_seconds IS NOT NULL THEN first_response_seconds END)) AS avg_seconds,
        SUM(CASE WHEN first_response_seconds <= 120 THEN 1 ELSE 0 END) AS fast_count,
        SUM(CASE WHEN first_response_seconds > 120 AND first_response_seconds <= 300 THEN 1 ELSE 0 END) AS ok_count,
        SUM(CASE WHEN first_response_seconds > 300 THEN 1 ELSE 0 END) AS slow_count,
        SUM(CASE WHEN lead_quality = 'ghost' THEN 1 ELSE 0 END) AS ghost_count,
        SUM(CASE WHEN lead_quality IN ('hot','qualified') THEN 1 ELSE 0 END) AS quality_count
      FROM chat_conversations c
      WHERE ${dateFilter}
    `, (err, rows) => resolve({ key: 'summary', data: err ? (rows || [{}]) : rows }))
  }))

  // 3. Daily trend: avg response time 7 วัน
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS total,
        ROUND(AVG(CASE WHEN first_response_seconds IS NOT NULL THEN first_response_seconds END)) AS avg_seconds,
        SUM(CASE WHEN first_response_seconds > 300 THEN 1 ELSE 0 END) AS slow_count
      FROM chat_conversations
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `, (err, rows) => resolve({ key: 'daily_trend', data: err ? [] : rows }))
  }))

  // 4. ช่วงเวลา: histogram ช่วง response time (กี่คนตอบใน 0-1min, 1-2min, 2-5min, >5min)
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        SUM(CASE WHEN first_response_seconds <= 60 THEN 1 ELSE 0 END) AS under_1min,
        SUM(CASE WHEN first_response_seconds > 60 AND first_response_seconds <= 120 THEN 1 ELSE 0 END) AS s1_2min,
        SUM(CASE WHEN first_response_seconds > 120 AND first_response_seconds <= 300 THEN 1 ELSE 0 END) AS s2_5min,
        SUM(CASE WHEN first_response_seconds > 300 THEN 1 ELSE 0 END) AS over_5min,
        SUM(CASE WHEN first_response_seconds IS NULL THEN 1 ELSE 0 END) AS no_response
      FROM chat_conversations c
      WHERE ${dateFilter}
    `, (err, rows) => resolve({ key: 'histogram', data: err ? [{}] : rows }))
  }))

  Promise.all(queries).then(results => {
    const out = {}
    results.forEach(r => { out[r.key] = r.data })
    res.json({ success: true, range, sla: out })
  }).catch(e => {
    res.status(500).json({ success: false, message: e.message })
  })
}

// ============================================================
// GET /api/admin/dashboard/ceo
// CEO / Executive Dashboard — KPI รายเดือน + commission + top-sales
// ============================================================
exports.getCeoDashboard = (req, res) => {
  const queries = []

  // ── 1. KPI รายเดือน 12 เดือนย้อนหลัง (เคสใหม่, อนุมัติ, ปิดดีล, วงเงินรวม)
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        DATE_FORMAT(c.created_at, '%Y-%m') AS month,
        COUNT(*)                                                                  AS new_cases,
        SUM(CASE WHEN c.status IN ('credit_approved','auction_completed','completed','pending_auction','preparing_docs','legal_scheduled','legal_completed') THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN c.status IN ('completed','auction_completed') THEN 1 ELSE 0 END) AS completed,
        COALESCE(SUM(lr.loan_amount), 0)                                          AS total_loan_amount
      FROM cases c
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(c.created_at, '%Y-%m')
      ORDER BY month ASC
    `, (err, rows) => resolve({ key: 'monthly_kpi', data: err ? [] : rows }))
  }))

  // ── 2. Commission นายหน้า — รวมทั้งหมด + แยก paid/unpaid
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        COUNT(DISTINCT aa.agent_id)                                       AS total_agents,
        COALESCE(SUM(aa.commission_amount), 0)                            AS total_commission,
        COALESCE(SUM(CASE WHEN aa.payment_status = 'paid' THEN aa.commission_amount ELSE 0 END), 0)   AS paid_commission,
        COALESCE(SUM(CASE WHEN aa.payment_status != 'paid' OR aa.payment_status IS NULL THEN aa.commission_amount ELSE 0 END), 0) AS unpaid_commission,
        COUNT(CASE WHEN aa.payment_status = 'paid' THEN 1 END)            AS paid_count,
        COUNT(CASE WHEN aa.payment_status != 'paid' OR aa.payment_status IS NULL THEN 1 END) AS unpaid_count
      FROM agent_accounting aa
    `, (err, rows) => resolve({ key: 'commission_summary', data: err ? [{}] : rows }))
  }))

  // ── 3. Commission รายเดือน 12 เดือนย้อนหลัง
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        DATE_FORMAT(aa.payment_date, '%Y-%m')  AS month,
        COALESCE(SUM(aa.commission_amount), 0) AS total,
        COALESCE(SUM(CASE WHEN aa.payment_status = 'paid' THEN aa.commission_amount ELSE 0 END), 0) AS paid,
        COUNT(*)                               AS count
      FROM agent_accounting aa
      WHERE aa.payment_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        AND aa.payment_date IS NOT NULL
      GROUP BY DATE_FORMAT(aa.payment_date, '%Y-%m')
      ORDER BY month ASC
    `, (err, rows) => resolve({ key: 'commission_monthly', data: err ? [] : rows }))
  }))

  // ── 4. Top Sales เดือนนี้ (ranked by completed + approved cases)
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        au.full_name   AS sales_name,
        au.nickname,
        COUNT(c.id)    AS total_cases,
        SUM(CASE WHEN c.status IN ('completed','auction_completed') THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN c.status IN ('credit_approved','auction_completed','completed','pending_auction','preparing_docs','legal_scheduled','legal_completed') THEN 1 ELSE 0 END) AS approved,
        COALESCE(SUM(lr.loan_amount), 0) AS total_loan_amount
      FROM cases c
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      LEFT JOIN admin_users au   ON au.id  = c.assigned_sales_id
      WHERE c.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND au.id IS NOT NULL
      GROUP BY au.id, au.full_name, au.nickname
      ORDER BY closed DESC, approved DESC
      LIMIT 10
    `, (err, rows) => resolve({ key: 'top_sales', data: err ? [] : rows }))
  }))

  // ── 5. Lead source summary เดือนนี้
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        COALESCE(lr.lead_source, 'other') AS source,
        COUNT(*) AS count
      FROM loan_requests lr
      WHERE lr.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
      GROUP BY lr.lead_source
      ORDER BY count DESC
    `, (err, rows) => resolve({ key: 'lead_sources', data: err ? [] : rows }))
  }))

  // ── 6. ยอดรวมทุกเวลา
  queries.push(new Promise(resolve => {
    db.query(`
      SELECT
        COUNT(*)  AS total_cases,
        SUM(CASE WHEN c.status IN ('completed','auction_completed') THEN 1 ELSE 0 END) AS total_completed,
        SUM(CASE WHEN c.status = 'cancelled' THEN 1 ELSE 0 END) AS total_cancelled,
        SUM(CASE WHEN c.status NOT IN ('completed','auction_completed','cancelled') THEN 1 ELSE 0 END) AS total_active,
        COALESCE(SUM(CASE WHEN c.status IN ('completed','auction_completed') THEN lr.loan_amount ELSE 0 END), 0) AS lifetime_loan_amount
      FROM cases c
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    `, (err, rows) => resolve({ key: 'lifetime', data: err ? [{}] : rows }))
  }))

  Promise.all(queries).then(results => {
    const out = {}
    results.forEach(r => { out[r.key] = r.data })
    res.json({ success: true, ...out })
  }).catch(e => {
    res.status(500).json({ success: false, message: e.message })
  })
}
// ============================================================
// GET /api/admin/dashboard/my-stats
// แดชบอร์ดส่วนตัว — เฉพาะเคสที่ account ตัวเองสร้าง
// ============================================================
exports.getMyDashboard = (req, res) => {
  const userId = req.user ? req.user.id : null
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' })

  const dept = req.user ? req.user.department : null
  // super_admin / manager เห็นทุกเคส (ไม่กรอง user_id)
  const isAdmin = (dept === 'super_admin' || dept === 'manager')

  // สร้าง WHERE clause ตาม role
  const userWhere = isAdmin ? '1=1' : '(c.user_id = ? OR lr.user_id = ?)'
  const userParams = isAdmin ? [] : [userId, userId]
  const userSingle = isAdmin ? '1=1' : 'lr.user_id = ?'
  const userParamsSingle = isAdmin ? [] : [userId]

  const promises = []

  // 1. Status breakdown
  promises.push(new Promise(resolve => {
    db.query(`
      SELECT
        COUNT(*) AS total_cases,
        COALESCE(SUM(lr.loan_amount), 0) AS total_loan_amount,
        COALESCE(SUM(lr.approved_amount), 0) AS total_approved_amount,
        SUM(CASE WHEN c.status IN ('appraisal_scheduled','awaiting_appraisal_fee') THEN 1 ELSE 0 END) AS waiting_appraisal,
        SUM(CASE WHEN c.status = 'appraisal_passed' THEN 1 ELSE 0 END) AS appraisal_passed,
        SUM(CASE WHEN c.status = 'appraisal_not_passed' THEN 1 ELSE 0 END) AS appraisal_not_passed,
        SUM(CASE WHEN c.status IN ('credit_approved','pending_approve') THEN 1 ELSE 0 END) AS waiting_auction,
        SUM(CASE WHEN c.status IN ('preparing_docs','legal_scheduled') THEN 1 ELSE 0 END) AS waiting_legal,
        SUM(CASE WHEN c.status = 'legal_completed' THEN 1 ELSE 0 END) AS waiting_issuing,
        SUM(CASE WHEN c.status IN ('auction_completed','completed') THEN 1 ELSE 0 END) AS completed_cases,
        SUM(CASE WHEN c.status NOT IN ('cancelled','appraisal_not_passed','completed','auction_completed') THEN 1 ELSE 0 END) AS active_cases
      FROM cases c
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      WHERE ${userWhere}
    `, userParams, (err, rows) => resolve({ key: 'summary', data: err ? {} : (rows[0] || {}) }))
  }))

  // 2. สัญญาครบกำหนดใน 60 วัน (ทุกฝ่ายเห็น — สำคัญ)
  promises.push(new Promise(resolve => {
    db.query(`
      SELECT c.id AS case_id, c.case_code, c.contract_end_date, c.status,
        lr.contact_name AS debtor_name, lr.contact_phone AS debtor_phone,
        DATEDIFF(c.contract_end_date, CURDATE()) AS days_remaining,
        lr.loan_amount, lr.approved_amount
      FROM cases c
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      WHERE ${userWhere}
        AND c.contract_end_date IS NOT NULL
        AND c.contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)
        AND c.status NOT IN ('cancelled','completed','auction_completed')
      ORDER BY c.contract_end_date ASC
      LIMIT 15
    `, userParams, (err, rows) => resolve({ key: 'expiring', data: err ? [] : rows }))
  }))

  // 3. แชทที่ค้าง
  promises.push(new Promise(resolve => {
    const chatWhere = isAdmin ? '1=1' : 'lr.user_id = ?'
    const chatParams = isAdmin ? [] : [userId]
    db.query(`
      SELECT COUNT(DISTINCT cm.loan_request_id) AS pending_count
      FROM chat_messages cm
      JOIN loan_requests lr ON lr.id = cm.loan_request_id
      WHERE ${chatWhere}
        AND cm.is_read = 0
        AND cm.sender != 'admin'
    `, chatParams, (err, rows) => resolve({ key: 'pending_chats', data: err ? 0 : (rows[0]?.pending_count || 0) }))
  }))

  // 4. ราคาประเมิน
  promises.push(new Promise(resolve => {
    db.query(`
      SELECT lr.id AS lr_id, lr.debtor_code, lr.contact_name AS debtor_name,
        lr.estimated_value, lr.loan_amount, lr.appraisal_result,
        lr.province, lr.district,
        c.id AS case_id, c.case_code, c.status,
        c.updated_at
      FROM loan_requests lr
      LEFT JOIN cases c ON c.loan_request_id = lr.id
      WHERE ${userSingle}
        AND lr.estimated_value IS NOT NULL AND lr.estimated_value > 0
      ORDER BY lr.updated_at DESC
      LIMIT 10
    `, userParamsSingle, (err, rows) => resolve({ key: 'appraisals', data: err ? [] : rows }))
  }))

  // 5. เคสล่าสุด
  promises.push(new Promise(resolve => {
    db.query(`
      SELECT c.id AS case_id, c.case_code, c.status, c.updated_at,
        c.contract_start_date, c.contract_end_date,
        lr.contact_name AS debtor_name, lr.contact_phone,
        lr.loan_amount, lr.approved_amount, lr.appraisal_result,
        lr.province, lr.district
      FROM cases c
      LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
      WHERE ${userWhere}
      ORDER BY c.updated_at DESC
      LIMIT 20
    `, userParams, (err, rows) => resolve({ key: 'recent_cases', data: err ? [] : rows }))
  }))

  Promise.all(promises).then(results => {
    const out = {}
    results.forEach(r => { out[r.key] = r.data })
    res.json({ success: true, ...out })
  }).catch(e => {
    res.status(500).json({ success: false, message: e.message })
  })
}

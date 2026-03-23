// server/controllers/contractExpiryController.js
// ระบบแจ้งเตือนสัญญาใกล้หมดอายุ — ทำงานทุกวัน 08:00 น.
// แจ้งเตือน 90 / 60 / 30 วันก่อนสัญญาหมด → ฝ่ายขาย + ฝ่ายนิติกรรม

const db = require('../config/db');

const THRESHOLDS = [90, 60, 30]; // วันที่จะแจ้งเตือน (ก่อนหมดอายุ)

const CONTRACT_TYPE_LABEL = {
  selling_pledge: 'ขายฝาก',
  mortgage:       'จำนอง',
};

// ฟังก์ชัน helper: INSERT notification แบบ Promise
function insertNotification(data) {
  return new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO notifications
         (type, case_id, loan_request_id, from_department, target_department,
          title, message, link_url, created_at)
       VALUES ('internal', ?, ?, 'system', ?, ?, ?, ?, NOW())`,
      [data.case_id, data.loan_request_id, data.target_department,
       data.title, data.message, data.link_url],
      (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      }
    );
  });
}

// ฟังก์ชัน helper: INSERT log ป้องกันส่งซ้ำ
function logNotification(case_id, days_before) {
  return new Promise((resolve, reject) => {
    db.query(
      `INSERT IGNORE INTO contract_expiry_logs (case_id, days_before) VALUES (?, ?)`,
      [case_id, days_before],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// ฟังก์ชันหลัก: ตรวจสอบและส่งแจ้งเตือน
async function checkContractExpiry(req, res) {
  const io = req?.app?.get('io') || null;

  try {
    const summary = { checked: 0, notified: 0, skipped: 0 };

    for (const days of THRESHOLDS) {
      // หา cases ที่ contract_end_date ห่างจากวันนี้พอดี N วัน
      // และยังไม่ถูก log ไว้ (ยังไม่เคยส่งแจ้งเตือน threshold นี้)
      const rows = await new Promise((resolve, reject) => {
        db.query(
          `SELECT
             c.id            AS case_id,
             c.case_code,
             c.loan_request_id,
             c.contract_end_date,
             c.assigned_sales_id,
             lr.loan_type_detail,
             lr.contract_years,
             lr.interest_rate,
             lr.approved_amount AS lr_approved,
             c.approved_amount  AS c_approved,
             CONCAT(u.first_name, ' ', u.last_name) AS debtor_name,
             DATEDIFF(c.contract_end_date, CURDATE()) AS days_left
           FROM cases c
           LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
           LEFT JOIN users u          ON u.id  = c.user_id
           LEFT JOIN contract_expiry_logs cel
             ON cel.case_id = c.id AND cel.days_before = ?
           WHERE
             c.contract_end_date IS NOT NULL
             AND DATEDIFF(c.contract_end_date, CURDATE()) = ?
             AND cel.id IS NULL
             AND c.status NOT IN ('cancelled','completed')`,
          [days, days],
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });

      summary.checked += rows.length;

      for (const row of rows) {
        const contractType = CONTRACT_TYPE_LABEL[row.loan_type_detail] || row.loan_type_detail || 'สัญญา';
        const approvedAmt  = row.c_approved || row.lr_approved;
        const amtText      = approvedAmt
          ? ` (วงเงิน ${Number(approvedAmt).toLocaleString('th-TH')} บาท)`
          : '';
        const endDateTH    = new Date(row.contract_end_date).toLocaleDateString('th-TH', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        const debtorText   = row.debtor_name?.trim() ? ` — ${row.debtor_name.trim()}` : '';

        // สร้างข้อความตาม threshold
        const urgencyIcon  = days <= 30 ? '🔴' : days <= 60 ? '🟠' : '🟡';
        const title   = `${urgencyIcon} สัญญาหมดอายุใน ${days} วัน — เคส ${row.case_code}`;
        const message = `${contractType}${debtorText}${amtText} จะหมดอายุวันที่ ${endDateTH} `
                      + `(เหลืออีก ${days} วัน) กรุณาติดต่อลูกหนี้เพื่อต่อสัญญาหรือดำเนินการที่เกี่ยวข้อง`;
        const linkUrl = `/legal/${row.case_id}`;

        // ส่งแจ้งเตือนไปฝ่ายขาย + ฝ่ายนิติกรรม
        for (const dept of ['sales', 'legal']) {
          const notifId = await insertNotification({
            case_id:           row.case_id,
            loan_request_id:   row.loan_request_id,
            target_department: dept,
            title,
            message,
            link_url: linkUrl,
          });

          // Emit real-time ผ่าน socket.io ถ้ามี
          if (io) {
            io.to('admin_room').emit('new_notification', {
              id:                notifId,
              type:              'internal',
              case_id:           row.case_id,
              target_department: dept,
              title,
              message,
              link_url:          linkUrl,
              is_read:           false,
              created_at:        new Date().toISOString(),
            });
          }
        }

        // บันทึก log ป้องกันส่งซ้ำ
        await logNotification(row.case_id, days);
        summary.notified++;

        console.log(`[ContractExpiry] แจ้งเตือน ${row.case_code} — ${days} วันก่อนหมด (${endDateTH})`);
      }
    }

    console.log(`[ContractExpiry] ✅ ตรวจ ${summary.checked} เคส แจ้งเตือน ${summary.notified} เคส`);

    if (res) return res.json({ success: true, ...summary });
    return summary;

  } catch (err) {
    console.error('[ContractExpiry] ❌ Error:', err.message);
    if (res) return res.status(500).json({ success: false, error: err.message });
    throw err;
  }
}

// ดึงรายการสัญญาที่ใกล้หมดทั้งหมด (สำหรับแสดงหน้า dashboard)
function getExpiringContracts(req, res) {
  const days = parseInt(req.query.days) || 90; // ดูล่วงหน้า N วัน
  db.query(
    `SELECT
       c.id            AS case_id,
       c.case_code,
       c.contract_start_date,
       c.contract_end_date,
       lr.loan_type_detail,
       lr.contract_years,
       lr.interest_rate,
       c.approved_amount,
       CONCAT(u.first_name, ' ', u.last_name) AS debtor_name,
       DATEDIFF(c.contract_end_date, CURDATE()) AS days_left
     FROM cases c
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     LEFT JOIN users u          ON u.id  = c.user_id
     WHERE
       c.contract_end_date IS NOT NULL
       AND DATEDIFF(c.contract_end_date, CURDATE()) BETWEEN 0 AND ?
       AND c.status NOT IN ('cancelled','completed')
     ORDER BY c.contract_end_date ASC`,
    [days],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, contracts: rows, total: rows.length });
    }
  );
}

module.exports = { checkContractExpiry, getExpiringContracts };

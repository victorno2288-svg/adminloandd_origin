// server/controllers/notificationController.js
// ระบบแจ้งเตือนภายใน (ระหว่างฝ่าย) — ทุกฝ่ายเห็นทุกขั้นตอน

const db = require('../config/db');

// ============================
// ข้อความแจ้งเตือนภายในตามสถานะ
// target = 'all' → ทุกฝ่ายเห็นหมด
// ============================
const INTERNAL_NOTIFICATIONS = {
  new_from_chat: {
    target: 'all',
    title: '🟢 ลูกหนี้ใหม่จากแชท',
    getMessage: (code, extra) => `ลูกหนี้ใหม่ ${code} ถูกสร้างอัตโนมัติจากแชท ${extra || ''}`
  },
  new_from_admin: {
    target: 'appraisal',
    title: '🆕 ลูกค้าใหม่รอประเมินราคา',
    getMessage: (code, extra) => `ลูกค้าใหม่ ${code} ถูกสร้างแล้ว${extra ? ' — ' + extra : ''} รอการตรวจสอบราคาประเมินเบื้องต้น`
  },
  new_from_admin_to_approval: {
    target: 'approval',
    title: '🆕 ลูกค้าใหม่รอพิจารณาวงเงิน',
    getMessage: (code, extra) => `ลูกค้าใหม่ ${code} ถูกสร้างแล้ว${extra ? ' — ' + extra : ''} รอการพิจารณาวงเงินเบื้องต้น`
  },
  appraisal_price_to_sales: {
    target: 'sales',
    title: '💰 ราคาประเมินเบื้องต้นพร้อมแล้ว',
    getMessage: (code, extra) => `ฝ่ายประเมินส่งราคาเบื้องต้นของ ${code} กลับมาแล้ว${extra ? ' — ' + extra : ''}`
  },
  appraisal_price_to_approval: {
    target: 'approval',
    title: '💰 ราคาประเมินพร้อมออกตารางวงเงิน',
    getMessage: (code, extra) => `ฝ่ายประเมินส่งราคาเบื้องต้นของ ${code} แล้ว${extra ? ' — ' + extra : ''} กรุณาออกตารางวงเงิน`
  },
  credit_table_to_sales: {
    target: 'sales',
    title: '📋 ตารางวงเงินพร้อมแล้ว',
    getMessage: (code, extra) => `ฝ่ายอนุมัติสินเชื่ออัพโหลดตารางวงเงินของ ${code} เรียบร้อยแล้ว${extra ? ' — ' + extra : ''}`
  },
  schedule_approved_to_sales: {
    target: 'sales',
    title: '✅ ตารางผ่อนชำระได้รับการอนุมัติ',
    getMessage: (code) => `ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ ${code} แล้ว — ดูได้ที่ ID ลูกหนี้`
  },
  credit_table_to_appraisal: {
    target: 'appraisal',
    title: '📋 ตารางวงเงินพร้อมแล้ว — แจ้งฝ่ายประเมิน',
    getMessage: (code, extra) => `ฝ่ายอนุมัติสินเชื่ออัพโหลดตารางวงเงินของ ${code} เรียบร้อยแล้ว${extra ? ' — ' + extra : ''}`
  },
  reviewing: {
    target: 'all',
    title: 'เคสใหม่ — รอประเมิน',
    getMessage: (code) => `เคสใหม่ ${code} ถูกสร้างแล้ว กรุณาดำเนินการประเมิน`
  },
  awaiting_appraisal_fee: {
    target: 'all',
    title: 'รอชำระค่าประเมิน',
    getMessage: (code) => `เคส ${code} รอลูกค้าชำระค่าประเมิน`
  },
  appraisal_scheduled: {
    target: 'all',
    title: 'อยู่ระหว่างประเมิน',
    getMessage: (code) => `เคส ${code} อยู่ระหว่างการประเมินทรัพย์สิน`
  },
  appraisal_passed: {
    target: 'all',
    title: 'ประเมินผ่าน — รอพิจารณาอนุมัติ',
    getMessage: (code) => `เคส ${code} ผ่านการประเมินแล้ว รอพิจารณาอนุมัติวงเงิน`
  },
  appraisal_not_passed: {
    target: 'all',
    title: 'ประเมินไม่ผ่าน',
    getMessage: (code) => `เคส ${code} ไม่ผ่านการประเมิน กรุณาแจ้งลูกค้า`
  },
  pending_approve: {
    target: 'all',
    title: 'รอพิจารณาอนุมัติ',
    getMessage: (code) => `เคส ${code} อยู่ระหว่างพิจารณาอนุมัติวงเงิน`
  },
  credit_approved: {
    target: 'all',
    title: 'อนุมัติวงเงินแล้ว',
    getMessage: (code, extra) => `เคส ${code} อนุมัติวงเงิน ${extra || ''} แล้ว`
  },
  pending_auction: {
    target: 'all',
    title: 'พร้อมประมูล',
    getMessage: (code) => `เคส ${code} พร้อมเข้าสู่ขั้นตอนประมูลแล้ว`
  },
  auction_completed: {
    target: 'all',
    title: 'ประมูลสำเร็จ — รอนิติกรรม',
    getMessage: (code, extra) => `เคส ${code} ประมูลสำเร็จ ${extra || ''} กรุณาดำเนินการนิติกรรม`
  },
  preparing_docs: {
    target: 'all',
    title: 'เตรียมเอกสาร',
    getMessage: (code) => `เคส ${code} อยู่ระหว่างเตรียมเอกสารนิติกรรม`
  },
  legal_scheduled: {
    target: 'all',
    title: 'นัดทำธุรกรรมแล้ว',
    getMessage: (code, extra) => `เคส ${code} นัดทำธุรกรรม ${extra || ''}`
  },
  legal_completed: {
    target: 'all',
    title: 'นิติกรรมเสร็จสิ้น',
    getMessage: (code) => `เคส ${code} ทำธุรกรรมเรียบร้อยแล้ว`
  },
  issuing_sent: {
    target: 'all',
    title: 'ออกสัญญาเรียบร้อย',
    getMessage: (code) => `เคส ${code} ออกสัญญาเรียบร้อยแล้ว`
  },
  completed: {
    target: 'all',
    title: 'เคสเสร็จสมบูรณ์',
    getMessage: (code) => `เคส ${code} ดำเนินการเสร็จสมบูรณ์แล้ว`
  },
  cancelled: {
    target: 'all',
    title: 'ยกเลิกเคส',
    getMessage: (code) => `เคส ${code} ถูกยกเลิก`
  },
  incomplete: {
    target: 'all',
    title: 'เอกสารไม่ครบ',
    getMessage: (code) => `เคส ${code} เอกสารไม่ครบถ้วน กรุณาติดตามเอกสารเพิ่มเติม`
  },
  credit_rejected: {
    target: 'all',
    title: 'ไม่อนุมัติวงเงิน',
    getMessage: (code) => `เคส ${code} ไม่ผ่านการอนุมัติวงเงิน`
  },
  debtor_rejected: {
    target: 'all',
    title: 'ลูกหนี้ไม่ผ่านเกณฑ์',
    getMessage: (code) => `ลูกหนี้ ${code} ถูกบันทึกเหตุผลไม่ผ่านเกณฑ์`
  },
  auction_failed: {
    target: 'all',
    title: 'ประมูลไม่สำเร็จ',
    getMessage: (code) => `เคส ${code} ประมูลไม่สำเร็จ`
  },

  // ===== ฝ่ายประมูล → แจ้งฝ่ายอื่น =====
  auction_scheduled_to_sales: {
    target: 'sales',
    title: '📅 นัดวันประมูลแล้ว — แจ้งฝ่ายขาย',
    getMessage: (code, extra) => `ฝ่ายประมูลนัดวันประมูลเคส ${code} แล้ว${extra ? ' — ' + extra : ''}`
  },
  auction_completed_to_legal: {
    target: 'legal',
    title: '🏆 ประมูลสำเร็จ — แจ้งฝ่ายสัญญา',
    getMessage: (code, extra) => `เคส ${code} ประมูล/ซื้อขายสำเร็จแล้ว${extra ? ' — ' + extra : ''} กรุณาเตรียมนิติกรรม`
  },
  auction_completed_to_accounting: {
    target: 'accounting',
    title: '🏆 ประมูลสำเร็จ — แจ้งฝ่ายบัญชี',
    getMessage: (code, extra) => `เคส ${code} ประมูล/ซื้อขายสำเร็จแล้ว${extra ? ' — ' + extra : ''} กรุณาเตรียมรับเงิน`
  },

  // ===== ฝ่ายขาย → แจ้งฝ่ายนิติกรรม (เมื่อกำหนดวันโอน) =====
  transaction_scheduled_to_legal: {
    target: 'legal',
    title: '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม',
    getMessage: (code, extra) => `ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส ${code} แล้ว${extra ? ' — ' + extra : ''}`
  },

  // ===== ฝ่ายสัญญา/นิติกรรม → แจ้งฝ่ายอื่น =====
  legal_scheduled_to_sales: {
    target: 'sales',
    title: '📅 นัดวันนิติกรรมแล้ว — แจ้งฝ่ายขาย',
    getMessage: (code, extra) => `ฝ่ายสัญญานัดวันนิติกรรมเคส ${code} แล้ว${extra ? ' — ' + extra : ''}`
  },
  legal_completed_to_sales: {
    target: 'sales',
    title: '✅ นิติกรรมเสร็จสิ้น — แจ้งฝ่ายขาย',
    getMessage: (code, extra) => `เคส ${code} ทำนิติกรรมเสร็จสิ้นแล้ว${extra ? ' — ' + extra : ''}`
  },
  legal_completed_to_accounting: {
    target: 'accounting',
    title: '✅ นิติกรรมเสร็จสิ้น — แจ้งฝ่ายบัญชี',
    getMessage: (code, extra) => `เคส ${code} ทำนิติกรรมเสร็จสิ้นแล้ว${extra ? ' — ' + extra : ''} กรุณาเตรียมจ่ายค่านายหน้า`
  },

  // ===== ฝ่ายบัญชี → แจ้งฝ่ายอื่น =====
  commission_paid_to_sales: {
    target: 'sales',
    title: '💸 จ่ายค่านายหน้าแล้ว — แจ้งฝ่ายขาย',
    getMessage: (code, extra) => `ฝ่ายบัญชีจ่ายค่านายหน้าเคส ${code} แล้ว${extra ? ' — ' + extra : ''}`
  },
  payment_received_to_sales: {
    target: 'sales',
    title: '💰 ลูกค้าชำระเงินแล้ว — แจ้งฝ่ายขาย',
    getMessage: (code, extra) => `ฝ่ายบัญชียืนยันรับเงินจากลูกค้าเคส ${code} แล้ว${extra ? ' — ' + extra : ''}`
  },
  payment_complete_to_legal: {
    target: 'legal',
    title: '💰 รับเงินครบ — แจ้งฝ่ายสัญญา',
    getMessage: (code, extra) => `ฝ่ายบัญชียืนยันรับเงินครบเคส ${code} แล้ว${extra ? ' — ' + extra : ''} กรุณาปิดเคส`
  }
};

// ============================
// ส่งแจ้งเตือนภายใน (ทุกฝ่ายเห็นทุกขั้นตอน)
// ============================
function sendInternalNotification(loanRequestId, caseId, newStatus, io, createdBy, extraInfo) {
  var config = INTERNAL_NOTIFICATIONS[newStatus];
  if (!config) {
    console.log('[Notification] ไม่มี config สำหรับสถานะ:', newStatus);
    return;
  }

  // ดึง debtor_code + contact_name เพื่อใช้ในข้อความ
  db.query(
    'SELECT debtor_code, contact_name FROM loan_requests WHERE id = ?',
    [loanRequestId],
    function(err, rows) {
      var debtorCode = (rows && rows.length > 0) ? rows[0].debtor_code : 'N/A';
      var contactName = (rows && rows.length > 0 && rows[0].contact_name) ? rows[0].contact_name : '';
      var codeWithName = contactName ? (debtorCode + ' (' + contactName + ')') : debtorCode;
      var message = config.getMessage(codeWithName, extraInfo);
      // map status → หน้าที่ถูกต้องของแต่ละฝ่าย
      var STATUS_PAGE = {
        new_from_chat:               '/sales/edit/',
        new_from_admin:              '/sales/edit/',
        new_from_admin_to_approval:  '/sales/edit/',
        appraisal_price_to_sales:    '/sales/edit/',
        appraisal_price_to_approval: '/approval/edit/',
        credit_table_to_sales:       '/sales/edit/',
        credit_table_to_appraisal:   '/appraisal/edit/',
        reviewing:             '/sales/case/edit/',
        incomplete:            '/sales/case/edit/',
        completed:             '/sales/case/edit/',
        cancelled:             '/cancellation',
        awaiting_appraisal_fee: '/appraisal/edit/',
        appraisal_scheduled:   '/appraisal/edit/',
        appraisal_passed:      '/appraisal/edit/',
        appraisal_not_passed:  '/appraisal/edit/',
        pending_approve:       '/approval/edit/',
        credit_approved:       '/approval/edit/',
        credit_rejected:       '/approval/edit/',
        pending_auction:       '/auction/edit/',
        auction_completed:     '/auction/edit/',
        auction_failed:        '/auction/edit/',
        preparing_docs:        '/issuing/edit/',
        issuing_sent:          '/issuing/edit/',
        legal_scheduled:       '/legal/edit/',
        legal_completed:       '/legal/edit/',
        // ฝ่ายประมูล → ฝ่ายอื่น
        auction_scheduled_to_sales:      '/sales/case/edit/',
        auction_completed_to_legal:      '/legal/edit/',
        auction_completed_to_accounting: '/accounting/edit/',
        // ฝ่ายสัญญา → ฝ่ายอื่น
        legal_scheduled_to_sales:        '/sales/case/edit/',
        legal_completed_to_sales:        '/sales/case/edit/',
        legal_completed_to_accounting:   '/accounting/edit/',
        // ฝ่ายขาย → ฝ่ายนิติกรรม
        transaction_scheduled_to_legal: '/legal/edit/',
        // ฝ่ายบัญชี → ฝ่ายอื่น
        commission_paid_to_sales:        '/sales/case/edit/',
        payment_received_to_sales:       '/sales/case/edit/',
        payment_complete_to_legal:       '/legal/edit/',
      };
      var basePage = STATUS_PAGE[newStatus] || '/sales/case/edit/';
      var linkUrl;
      if (['new_from_chat','new_from_admin','new_from_admin_to_approval',
           'appraisal_price_to_sales','appraisal_price_to_approval',
           'credit_table_to_sales','credit_table_to_appraisal'].includes(newStatus)) {
        linkUrl = basePage.endsWith('/') ? basePage + loanRequestId : basePage;
      } else if (caseId) {
        linkUrl = basePage.endsWith('/') ? basePage + caseId : basePage;
      } else {
        linkUrl = '/sales/edit/' + loanRequestId;
      }

      // บันทึกลง notifications table — target_department ตาม config
      db.query(
        'INSERT INTO notifications (type, loan_request_id, case_id, target_department, ' +
        'title, message, status_to, link_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['internal', loanRequestId, caseId, config.target, config.title, message, newStatus, linkUrl, createdBy || null],
        function(insertErr, result) {
          if (insertErr) {
            console.log('[Notification] Internal insert error:', insertErr.message);
            return;
          }

          // Emit socket event → admin_room (ทุกคนเห็น)
          if (io) {
            var notifData = {
              id: result.insertId,
              type: 'internal',
              loan_request_id: loanRequestId,
              case_id: caseId,
              target_department: config.target,
              title: config.title,
              message: message,
              status_to: newStatus,
              link_url: linkUrl,
              is_read: 0,
              debtor_name: contactName || null,
              debtor_code: debtorCode || null,
              created_at: new Date().toISOString()
            };

            io.to('admin_room').emit('new_notification', notifData);
            console.log('[Notification] 🔔 แจ้งเตือน [' + config.target + ']: ' + message);
          }
        }
      );
    }
  );
}

// ============================
// ส่งแจ้งเตือน (ภายในอย่างเดียว — ไม่ส่ง LINE/Facebook)
// ============================
function notifyStatusChange(loanRequestId, caseId, oldStatus, newStatus, io, createdBy, extraInfo) {
  sendInternalNotification(loanRequestId, caseId, newStatus, io, createdBy, extraInfo);
}

// ============================
// API: ดึงรายการแจ้งเตือน — per-user is_read via notification_reads
// ============================
exports.getNotifications = function(req, res) {
  var page = parseInt(req.query.page) || 1;
  var limit = parseInt(req.query.limit) || 20;
  var offset = (page - 1) * limit;
  var userId = req.user ? req.user.id : null;

  db.query(
    "SELECT n.*, lr.contact_name AS debtor_name, lr.debtor_code, " +
    "  CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_read, " +
    "  nr.read_at " +
    "FROM notifications n " +
    "LEFT JOIN loan_requests lr ON lr.id = n.loan_request_id " +
    "LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ? " +
    "WHERE n.type = 'internal' ORDER BY n.created_at DESC LIMIT ? OFFSET ?",
    [userId, limit, offset],
    function(err, rows) {
      if (err) return res.status(500).json({ error: err.message });

      db.query(
        "SELECT COUNT(*) as total FROM notifications WHERE type = 'internal'",
        [],
        function(err2, countRows) {
          var total = countRows && countRows[0] ? countRows[0].total : 0;
          res.json({
            notifications: rows,
            pagination: { page: page, limit: limit, total: total, totalPages: Math.ceil(total / limit) }
          });
        }
      );
    }
  );
};

// ============================
// API: นับ unread — per-user (นับเฉพาะที่ยังไม่ได้อ่านของ user นั้น)
// ============================
exports.getUnreadCount = function(req, res) {
  var userId = req.user ? req.user.id : null;
  db.query(
    "SELECT COUNT(*) as count FROM notifications n " +
    "LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ? " +
    "WHERE n.type = 'internal' AND nr.user_id IS NULL",
    [userId],
    function(err, rows) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ unread_count: rows[0].count });
    }
  );
};

// ============================
// API: อ่านแล้ว (mark as read) — per-user
// ============================
exports.markAsRead = function(req, res) {
  var id = req.params.id;
  var userId = req.user ? req.user.id : null;
  db.query(
    'INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)',
    [id, userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
};

// ============================
// API: อ่านทั้งหมด — per-user (insert ทุก notification ที่ยังไม่ได้อ่านของ user นั้น)
// ============================
exports.markAllAsRead = function(req, res) {
  var userId = req.user ? req.user.id : null;
  db.query(
    "INSERT IGNORE INTO notification_reads (notification_id, user_id) " +
    "SELECT n.id, ? FROM notifications n " +
    "LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ? " +
    "WHERE n.type = 'internal' AND nr.user_id IS NULL",
    [userId, userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
};

// Export helper functions สำหรับเรียกจาก controller อื่น
exports.sendInternalNotification = sendInternalNotification;
exports.notifyStatusChange = notifyStatusChange;
exports.INTERNAL_NOTIFICATIONS = INTERNAL_NOTIFICATIONS;

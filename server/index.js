// server/index.js
require('dotenv').config(); // ⬅️ โหลด .env ก่อนทุกอย่าง (ต้องอยู่บรรทัดแรกสุด)
const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const app = express();
const port = 3000;
const path = require('path')
const db = require('./config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'LoanDD_Secret_Key_2026';

// สร้าง HTTP server + Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// เก็บ io ไว้ใช้ใน controller
app.set('io', io);

// ========== Socket.io Authentication ==========
// ตรวจ JWT token ก่อนอนุญาตให้ connect
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('ไม่มี token'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded; // { id, username, department, full_name, ... }
    next();
  } catch (err) {
    return next(new Error('Token ไม่ถูกต้อง'));
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  const user = socket.user;
  const displayName = user.full_name || user.username || user.nickname || 'unknown';
  console.log(`📱 ${displayName} (${user.department}) connected: ${socket.id}`);

  // แอดมินเข้า room กลาง (สำหรับอัพเดท conversation list)
  socket.join('admin_room');

  // เข้า room ตาม user เพื่อให้ส่ง notification เฉพาะคน
  socket.join('user_' + user.id);

  // เข้า room เฉพาะ conversation ที่กำลังดูอยู่
  socket.on('join_conversation', (conversationId) => {
    // ตรวจสิทธิ์: super_admin/admin เข้าได้ทุก conversation
    // เซลล์ต้องเป็น conversation ที่ assign ให้ตัวเอง หรือยังไม่ assign
    if (user.department !== 'super_admin' && user.department !== 'admin') {
      db.query(
        'SELECT assigned_to FROM chat_conversations WHERE id = ?',
        [conversationId],
        (err, rows) => {
          if (err || rows.length === 0) return;
          const assignedTo = rows[0].assigned_to;
          // ถ้า assign ให้คนอื่นแล้ว → ไม่ให้เข้า
          if (assignedTo && assignedTo !== user.id) {
            socket.emit('error_message', 'คุณไม่มีสิทธิ์ดู conversation นี้');
            return;
          }
          // ผ่าน → join room
          joinConvRoom(socket, conversationId);
        }
      );
    } else {
      // super_admin / admin → เข้าได้เลย
      joinConvRoom(socket, conversationId);
    }
  });

  // ออกจาก room conversation
  socket.on('leave_conversation', (conversationId) => {
    socket.leave('conv_' + conversationId);
  });

  socket.on('disconnect', () => {
    console.log(`📱 ${displayName} disconnected: ${socket.id}`);
  });
});

function joinConvRoom(socket, conversationId) {
  // ออกจาก room conversation เก่าก่อน
  socket.rooms.forEach(room => {
    if (room.startsWith('conv_')) socket.leave(room);
  });
  socket.join('conv_' + conversationId);
  console.log(`📱 ${socket.user.full_name || socket.user.username || 'unknown'} joined conv_${conversationId}`);
}

// Import Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const salesRoutes = require('./routes/salesRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const provinceRoutes = require('./routes/provinceRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const investorRoutes = require('./routes/investorRoutes');
const appraisalRoutes = require('./routes/appraisalRoutes');
const legalRoutes = require('./routes/legalRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const issuingRoutes = require('./routes/issuingRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const investorHistoryRoutes = require('./routes/investorHistoryRoutes');
const cancellationRoutes = require('./routes/cancellationRoutes');
const accountUserRoutes = require('./routes/accountUserRoutes');
const salesManagementRoutes = require('./routes/salesManagementRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aiSummaryRoutes = require('./routes/aiSummaryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatWebhookController = require('./controllers/chatWebhookController');
const advanceRoutes = require('./routes/advanceRoutes');
const ocrRoutes     = require('./routes/ocrRoutes')
const sharedChecklistRoutes    = require('./routes/sharedChecklistRoutes');
const contractExpiryRoutes     = require('./routes/contractExpiryRoutes');

// Middleware
const authMiddleware = require('./middleware/auth');
const { requireDept, superAdminOnly } = require('./middleware/roleMiddleware');

app.set('trust proxy', 1); // รับ X-Forwarded-Proto จาก nginx/reverse proxy (ทำให้ req.protocol = 'https')
app.use(cors());
app.use(express.json());

// ========== Public Routes (ไม่ต้อง login) ==========
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/provinces', provinceRoutes);
app.use('/api/investment-properties', investmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.get('/api/chat/webhook/facebook', chatWebhookController.verifyFacebookWebhook);
app.post('/api/chat/webhook/facebook', chatWebhookController.handleFacebookWebhook);
app.get('/api/chat/webhook/line', chatWebhookController.verifyLineWebhook);
app.post('/api/chat/webhook/line', chatWebhookController.handleLineWebhook);

app.use('/api/admin/dashboard', authMiddleware, dashboardRoutes);
// ========== Admin Routes (ต้อง login + เช็คสิทธิ์ department) ==========
app.use('/api/admin', adminRoutes);
app.use('/api/admin/chat', authMiddleware, chatRoutes);
app.use('/api/admin/ai-summary', authMiddleware, aiSummaryRoutes);
app.use('/api/admin/notifications', authMiddleware, notificationRoutes);
app.use('/api/admin/ocr', authMiddleware, ocrRoutes);

// ── Shared checklist-docs + checklist-ticks (ทุกฝ่ายเข้าถึงได้) ──────────────
app.use('/api/admin/debtors', authMiddleware, sharedChecklistRoutes);

// ฝ่ายขาย
app.use('/api/admin/sales', authMiddleware, requireDept('sales'), salesRoutes);

// นายหน้า (agents) — อยู่ฝ่ายขาย
app.use('/api/admin/sales-management', authMiddleware, requireDept('sales'), salesManagementRoutes);

// ฝ่ายบัญชี
app.use('/api/admin/accounting', authMiddleware, requireDept('accounting'), accountingRoutes);

// ฝ่ายประเมิน
app.use('/api/admin/appraisal', authMiddleware, requireDept('appraisal'), appraisalRoutes);
// Advance price check (บริษัทประเมิน Advance / พี่เกต) — เข้าได้ทั้ง sales + advance department
app.use('/api/admin/advance', authMiddleware, advanceRoutes);

// ฝ่ายอนุมัติวงเงิน
app.use('/api/admin/approval', authMiddleware, requireDept('approval'), approvalRoutes);

// ฝ่ายนิติกรรม (รวมออกสัญญาแล้ว)
app.use('/api/admin/legal', authMiddleware, requireDept('legal'), legalRoutes);
app.use('/api/admin/issuing', authMiddleware, requireDept('legal'), issuingRoutes);

// ฝ่ายประมูลทรัพย์ (อยู่ใต้ approval แล้ว)
app.use('/api/admin/auction', authMiddleware, requireDept('approval'), auctionRoutes);

// นายทุน
app.use('/api/admin/investors', authMiddleware, requireDept('investors', 'approval'), investorRoutes);
app.use('/api/admin/investor-history', authMiddleware, requireDept('investor-history', 'approval', 'auction'), investorHistoryRoutes);

// ยกเลิกเคส
app.use('/api/admin/cancellation', authMiddleware, requireDept('cancellation', 'legal'), cancellationRoutes);

// จัดการแอคเคาท์ — super_admin เท่านั้น
app.use('/api/admin/account-user', authMiddleware, superAdminOnly, accountUserRoutes);
app.use('/api/admin/contract-expiry', authMiddleware, contractExpiryRoutes);


// ========== Auto-migrate: เพิ่ม column ที่อาจยังไม่มีใน DB ==========
;(function autoMigrate() {
  // ★ สร้าง auction_transactions — schema จาก backup SQL (loandd_db (1).sql)
  // ใช้ InnoDB engine (รองรับทั้ง MySQL 8 บน Linux และ MariaDB บน Windows)
  const createAucAria = `CREATE TABLE IF NOT EXISTS auction_transactions (
    id int(11) NOT NULL AUTO_INCREMENT,
    case_id int(11) NOT NULL,
    investor_id int(11) DEFAULT NULL,
    investor_name varchar(200) DEFAULT NULL,
    investor_code varchar(50) DEFAULT NULL,
    investor_phone varchar(50) DEFAULT NULL,
    investor_type enum('corporate','individual') DEFAULT NULL,
    property_value decimal(15,2) DEFAULT NULL,
    selling_pledge_amount decimal(15,2) DEFAULT NULL,
    interest_rate decimal(10,2) DEFAULT NULL,
    auction_land_area varchar(100) DEFAULT NULL,
    contract_years int(11) DEFAULT NULL,
    house_reg_book text DEFAULT NULL,
    house_reg_book_legal text DEFAULT NULL,
    name_change_doc text DEFAULT NULL,
    divorce_doc text DEFAULT NULL,
    spouse_consent_doc text DEFAULT NULL,
    spouse_id_card text DEFAULT NULL,
    spouse_reg_copy text DEFAULT NULL,
    marriage_cert text DEFAULT NULL,
    spouse_name_change_doc text DEFAULT NULL,
    borrower_id_card text DEFAULT NULL,
    single_cert text DEFAULT NULL,
    death_cert text DEFAULT NULL,
    will_court_doc text DEFAULT NULL,
    testator_house_reg text DEFAULT NULL,
    is_cancelled tinyint(1) DEFAULT 0,
    auction_status enum('pending','auctioned','cancelled') DEFAULT 'pending',
    recorded_by varchar(100) DEFAULT NULL,
    recorded_at datetime DEFAULT NULL,
    created_at timestamp NOT NULL DEFAULT current_timestamp(),
    updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    sale_type varchar(50) DEFAULT NULL,
    bank_name varchar(200) DEFAULT NULL,
    bank_account_no varchar(100) DEFAULT NULL,
    bank_account_name varchar(200) DEFAULT NULL,
    transfer_slip varchar(500) DEFAULT NULL,
    land_transfer_date date DEFAULT NULL,
    land_transfer_time varchar(20) DEFAULT NULL,
    land_transfer_location varchar(500) DEFAULT NULL,
    land_transfer_note text DEFAULT NULL,
    bank_book_file varchar(500) DEFAULT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`;

  const fs = require('fs');
  const path = require('path');
  const dataDir = 'C:\\xampp\\mysql\\data\\loandd_db';

  // ★ ขั้น 1: ทดสอบว่า table ยังใช้งานได้ปกติไหม
  db.query('SELECT COUNT(*) AS cnt FROM auction_transactions', (testErr) => {
    if (!testErr) {
      // ✅ Table ดีอยู่แล้ว — ไม่ต้องทำอะไร แค่ ensure bank_book_file column
      console.log('[migrate] ✅ auction_transactions — ใช้งานได้ปกติ (skip recreate)');
      db.query("SHOW COLUMNS FROM auction_transactions LIKE 'bank_book_file'", (colErr, cols) => {
        if (!colErr && (!cols || cols.length === 0)) {
          db.query("ALTER TABLE auction_transactions ADD COLUMN bank_book_file varchar(500) DEFAULT NULL", () => {
            console.log('[migrate] ✅ auction_transactions: เพิ่ม bank_book_file column');
          });
        }
      });
      return;
    }

    // ❌ Table ใช้งานไม่ได้ — ต้องสร้างใหม่
    console.log('[migrate] 🔧 auction_transactions ไม่พร้อม (' + testErr.message + ') — กำลัง recreate...');

    // ลบไฟล์ค้างจากดิสก์ก่อน
    for (const f of ['auction_transactions.ibd','auction_transactions.frm','auction_transactions.MAI','auction_transactions.MAD']) {
      try { const fp = path.join(dataDir, f); if (fs.existsSync(fp)) { fs.unlinkSync(fp); console.log('[migrate] 🗑️  ลบไฟล์ค้าง:', fp); } } catch(e) {}
    }

    db.query('DROP TABLE IF EXISTS auction_transactions', () => {
      db.query(createAucAria, (err) => {
        if (err) {
          console.error('[migrate] ❌ auction_transactions:', err.message);
          // retry อีกรอบ
          for (const f of ['auction_transactions.frm','auction_transactions.ibd']) {
            try { const fp = path.join(dataDir, f); if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch(e) {}
          }
          db.query('DROP TABLE IF EXISTS auction_transactions', () => {
            db.query(createAucAria, (err2) => {
              if (err2) {
                console.error('[migrate] ❌ auction_transactions retry failed:', err2.message);
                console.error('[migrate] 🔧 ต้องแก้ด้วยมือ: ปิด MySQL → ลบไฟล์ auction_transactions.* ใน C:\\xampp\\mysql\\data\\loandd_db\\ → เปิด MySQL → restart server');
              } else {
                console.log('[migrate] ✅ auction_transactions table created (retry)');
                restoreAuctionData();
              }
            });
          });
          return;
        }
        console.log('[migrate] ✅ auction_transactions table created');
        restoreAuctionData();
      });
    });
  });

  // ★ auction_bids — เพิ่มคอลัมน์ที่อาจยังไม่มี
  const bidCols = [
    { col: 'deposit_slip',   sql: "ALTER TABLE auction_bids ADD COLUMN deposit_slip VARCHAR(500) NULL DEFAULT NULL" },
    { col: 'deposit_amount', sql: "ALTER TABLE auction_bids ADD COLUMN deposit_amount DECIMAL(15,2) NULL DEFAULT NULL" },
    { col: 'refund_status',  sql: "ALTER TABLE auction_bids ADD COLUMN refund_status VARCHAR(50) NULL DEFAULT 'pending'" },
  ]
  bidCols.forEach(({ col, sql }) => {
    db.query(`SHOW COLUMNS FROM auction_bids LIKE '${col}'`, (err, cols) => {
      if (!err && (!cols || cols.length === 0)) {
        db.query(sql, (err2) => {
          if (!err2) console.log(`[migrate] ✅ auction_bids: เพิ่ม ${col} column`)
          else console.warn(`[migrate] ⚠️ auction_bids ${col}:`, err2.message)
        })
      }
    })
  })

  function restoreAuctionData() {
    db.query('SELECT COUNT(*) AS cnt FROM auction_transactions', (e2, rows) => {
      if (e2 || !rows || rows[0].cnt > 0) return;
      console.log('[migrate] ⏳ auction_transactions ว่าง — กำลัง restore 8 rows จาก backup...');
      // ★ ข้อมูลจาก loandd_db (1).sql backup — columns ครบทุก field
      const insertSql = `INSERT INTO auction_transactions (id, case_id, investor_id, investor_name, investor_code, investor_phone, investor_type, property_value, selling_pledge_amount, interest_rate, auction_land_area, contract_years, house_reg_book, house_reg_book_legal, name_change_doc, divorce_doc, spouse_consent_doc, spouse_id_card, spouse_reg_copy, marriage_cert, spouse_name_change_doc, borrower_id_card, single_cert, death_cert, will_court_doc, testator_house_reg, is_cancelled, auction_status, recorded_by, recorded_at, created_at, updated_at, sale_type, bank_name, bank_account_no, bank_account_name, transfer_slip, land_transfer_date, land_transfer_time, land_transfer_location, land_transfer_note) VALUES
(1, 1, 3, 'พี่เป้', 'CAP0001', '000000000', 'individual', 50000.00, 50000.00, 40.00, '123456', 2004, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'cancelled', 'ทาย', '2026-02-18 02:32:00', '2026-02-19 06:30:12', '2026-02-21 03:58:54', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 2, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', 'corporate', 7777.00, 8888.00, 6666.00, '5555', 2998, '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'f', '2026-02-23 09:50:00', '2026-02-23 02:48:29', '2026-02-26 08:30:44', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 4, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', NULL, 6666666.00, 66566.00, 0.50, '777777', 9999, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'g', NULL, '2026-02-25 04:08:19', '2026-02-25 04:08:55', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', NULL, NULL, '2026-02-25 04:38:06', '2026-02-25 05:01:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', NULL, NULL, '2026-02-25 10:09:43', '2026-02-25 10:09:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'pending', NULL, NULL, '2026-02-27 02:55:21', '2026-02-27 02:55:21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 8, 3, 'พี่เป้', 'CAP0001', '000000000', 'corporate', 400000000000.00, 4000.00, 40.00, '50000', 3, '["uploads/auction-docs/1772181091809-359.jpg"]', '["uploads/auction-docs/1772181095651-665.jpg"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'ระบบ', '2026-03-16 14:28:30', '2026-02-27 08:31:21', '2026-03-16 07:28:30', 'direct', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 9, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', 'individual', 600000.00, 50.00, 60.00, '69', 3, '["uploads/auction-docs/1772183271018-102.jpg"]', '["uploads/auction-docs/1772183273539-654.jpg"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'f', '2026-02-27 16:09:00', '2026-02-27 09:01:12', '2026-02-27 09:09:06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`;
      db.query(insertSql, (e3) => {
        if (e3) console.warn('[migrate] ⚠️  INSERT auction_transactions:', e3.message);
        else console.log('[migrate] ✅ auction_transactions: restored 8 rows จาก backup');
      });
    });
  }

})()

server.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);

    // ========== Background Jobs ==========
    const chatController = require('./controllers/chatController');

    // SLA Monitor: แจ้งเตือนผ่าน socket ทุก 1 นาที
    // เมื่อมีลูกค้ารอตอบนานเกิน 5 นาที
    if (typeof chatController.startSlaMonitor === 'function') {
      chatController.startSlaMonitor(io);
    }

    // Ghost Chat Auto-detect: ตั้ง lead_quality='ghost' ทุก 1 ชม.
    // สำหรับแชทที่ลูกค้าไม่ตอบกลับมาเกิน 72 ชม.
    const GHOST_INTERVAL_MS = 60 * 60 * 1000; // ทุก 1 ชั่วโมง
    const runGhostDetect = () => {
      const db = require('./config/db');
      db.query(
        `UPDATE chat_conversations
         SET lead_quality = 'ghost', ghost_detected_at = NOW()
         WHERE lead_quality = 'unknown'
           AND status = 'unread'
           AND (is_dead = 0 OR is_dead IS NULL)
           AND last_message_at < DATE_SUB(NOW(), INTERVAL 72 HOUR)`,
        (err, result) => {
          if (err) return console.error('[Ghost Detect] DB error:', err.message);
          if (result.affectedRows > 0) {
            console.log(`[Ghost Detect] 👻 ตั้ง ghost flag ให้ ${result.affectedRows} การสนทนา`);
          }
        }
      );
    };
    setTimeout(runGhostDetect, 10000); // รอ 10 วิ แล้วรันครั้งแรก
    setInterval(runGhostDetect, GHOST_INTERVAL_MS);
    console.log('[Ghost Detect] ✅ เริ่มตรวจ ghost chats ทุก 1 ชั่วโมง (threshold 72 ชม.)');

    // Follow-up Reminder: แจ้งเตือนเมื่อถึงวันนัด + แจ้งหัวหน้าเมื่อเลย X วัน
    if (typeof chatController.startFollowupReminder === 'function') {
      chatController.startFollowupReminder(io);
    }

    // ========== Contract Expiry Cron ==========
    // ตรวจสัญญาใกล้หมดอายุทุกวัน 08:00 น.
    // แจ้งเตือน 90 / 60 / 30 วันก่อนหมด → ฝ่ายขาย + ฝ่ายนิติกรรม
    try {
      const cron = require('node-cron');
      const { checkContractExpiry } = require('./controllers/contractExpiryController');

      cron.schedule('0 8 * * *', async () => {
        console.log('[ContractExpiry] 🕗 เริ่มตรวจสัญญาใกล้หมดอายุ...');
        try {
          const result = await checkContractExpiry(null, null);
          console.log(`[ContractExpiry] ✅ ตรวจ ${result.checked} เคส แจ้งเตือนใหม่ ${result.notified} เคส`);
        } catch (e) {
          console.error('[ContractExpiry] ❌', e.message);
        }
      }, { timezone: 'Asia/Bangkok' });

      console.log('[ContractExpiry] ✅ Cron ตั้งค่าแล้ว (ทุกวัน 08:00 น. Asia/Bangkok)');
    } catch (e) {
      console.error('[ContractExpiry] ⚠️ ไม่สามารถตั้ง cron ได้:', e.message);
    }
});
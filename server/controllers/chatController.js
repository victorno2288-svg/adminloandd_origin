const db = require('../config/db');
const https = require('https');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// Multer config — สำหรับอัปโหลดไฟล์ในแชท
// ============================================
const chatUploadDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '_' + Math.random().toString(36).substring(7) + ext;
    cb(null, name);
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    // อนุญาตรูป, วิดีโอ, PDF, เอกสาร
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|pdf|doc|docx|xls|xlsx|csv|txt|zip|rar/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('ไม่รองรับไฟล์ประเภท .' + ext));
    }
  }
});

exports.chatUpload = chatUpload;

// ============================================
// Helper: ดึง platform credentials จาก DB
// ============================================
function getPlatformConfig(platform, callback) {
  db.query(
    'SELECT * FROM chat_platforms WHERE platform_name = ? AND is_active = 1 LIMIT 1',
    [platform],
    (err, rows) => {
      if (err || rows.length === 0) return callback(err || new Error('ยังไม่ได้ตั้งค่า ' + platform));
      callback(null, rows[0]);
    }
  );
}

// ============================================
// Helper: HTTP request (ใช้แทน axios)
// ============================================
function httpRequest(url, method, headers, body, callback) {
  const parsed = new URL(url);
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: method,
    headers: headers || {}
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        callback(null, JSON.parse(data), res.statusCode);
      } catch (e) {
        callback(null, data, res.statusCode);
      }
    });
  });

  req.on('error', (err) => callback(err));

  if (body) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    req.write(bodyStr);
  }
  req.end();
}

// ============================================
// Helper: Parse ชื่อ/เบอร์/อีเมล จากข้อความ
// ============================================
function extractCustomerInfo(text) {
  if (!text) return {};
  const info = {};

  // เบอร์โทรไทย
  const phoneMatch = text.match(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (phoneMatch) info.phone = phoneMatch[0].replace(/[-.\s]/g, '');

  // อีเมล
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) info.email = emailMatch[0];

  return info;
}

// ============================================
// 1. GET /conversations — ดูรายการ conversation
// ============================================
// สิทธิ์การมองเห็น:
//   - super_admin / admin → เห็นทุก conversation
//   - ฝ่ายขาย (sales) → เห็นเฉพาะแชทของเคสที่ตัวเองรับผิดชอบ (assigned_sales_id)
//     หรือ conversation ที่ assign ตรงให้ตัวเอง (assigned_to)
//   - ฝ่ายอื่น → เห็นเฉพาะที่ assign ตรง
exports.getConversations = (req, res) => {
  const { status, platform, search, page, tag_id, show_dead } = req.query;
  const limit = 30;
  const offset = ((parseInt(page) || 1) - 1) * limit;
  const user = req.user; // { id, username, department } จาก authMiddleware

  let where = '1=1';
  let extraJoin = '';
  const params = [];

  // === ฟิลเตอร์ตามสิทธิ์ ===
  if (user.department !== 'super_admin' && user.department !== 'admin') {
    if (user.department === 'sales') {
      // เซลล์: เห็นแชทของเคสที่ assigned_sales_id = ตัวเอง
      //         หรือ conversation ที่ assigned_to = ตัวเอง
      extraJoin = 'LEFT JOIN cases cs ON cs.loan_request_id = c.loan_request_id ';
      where += ' AND (cs.assigned_sales_id = ? OR c.assigned_to = ?)';
      params.push(user.id, user.id);
    } else {
      // ฝ่ายอื่น → เห็นเฉพาะที่ assign ตรง
      where += ' AND c.assigned_to = ?';
      params.push(user.id);
    }
  }

  if (status && status !== 'all') {
    where += ' AND c.status = ?';
    params.push(status);
  }
  if (platform && platform !== 'all') {
    where += ' AND c.platform = ?';
    params.push(platform);
  }
  if (search) {
    where += ' AND (c.customer_name LIKE ? OR c.customer_phone LIKE ? OR c.last_message_text LIKE ?)';
    params.push('%' + search + '%', '%' + search + '%', '%' + search + '%');
  }
  if (tag_id && tag_id !== 'all') {
    if (tag_id === 'none') {
      where += ' AND c.tag_id IS NULL';
    } else {
      where += ' AND c.tag_id = ?';
      params.push(parseInt(tag_id));
    }
  }

  // Dead leads filter
  if (show_dead === '1') {
    where += ' AND c.is_dead = 1';
  } else {
    where += ' AND (c.is_dead = 0 OR c.is_dead IS NULL)';
  }

  // นับจำนวนทั้งหมด
  db.query(
    'SELECT COUNT(DISTINCT c.id) as total FROM chat_conversations c ' + extraJoin + 'WHERE ' + where,
    params,
    (err, countRows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      var total = countRows[0].total;

      // ดึงข้อมูล (JOIN chat_tags + admin_users + last_replied_by สำหรับ super_admin)
      db.query(
        'SELECT DISTINCT c.*, au.username as assigned_username, au.full_name as assigned_full_name, au.nickname as assigned_nickname, ' +
        'ct.name as tag_name, ct.bg_color as tag_bg_color, ct.text_color as tag_text_color, ' +
        'sales_au.full_name as sales_full_name, sales_au.nickname as sales_nickname, ' +
        'lr_au.full_name as last_replied_full_name, lr_au.nickname as last_replied_nickname ' +
        'FROM chat_conversations c ' +
        extraJoin +
        'LEFT JOIN admin_users au ON c.assigned_to = au.id ' +
        'LEFT JOIN chat_tags ct ON c.tag_id = ct.id ' +
        'LEFT JOIN cases cs2 ON cs2.loan_request_id = c.loan_request_id ' +
        'LEFT JOIN admin_users sales_au ON sales_au.id = cs2.assigned_sales_id ' +
        'LEFT JOIN admin_users lr_au ON lr_au.id = c.last_replied_by_id ' +
        'WHERE ' + where + ' ' +
        'ORDER BY c.last_message_at DESC ' +
        'LIMIT ? OFFSET ?',
        params.concat([limit, offset]),
        (err2, rows) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });

          // นับ unread (filter ตามสิทธิ์เหมือนกัน — ไม่นับ dead leads)
          let unreadSql = "SELECT COUNT(DISTINCT c.id) as unread FROM chat_conversations c " + extraJoin + "WHERE c.status = 'unread' AND (c.is_dead = 0 OR c.is_dead IS NULL)";
          const unreadParams = [];
          if (user.department !== 'super_admin' && user.department !== 'admin') {
            if (user.department === 'sales') {
              unreadSql += ' AND (cs.assigned_sales_id = ? OR c.assigned_to = ?)';
              unreadParams.push(user.id, user.id);
            } else {
              unreadSql += ' AND c.assigned_to = ?';
              unreadParams.push(user.id);
            }
          }
          db.query(
            unreadSql,
            unreadParams,
            (err3, unreadRows) => {
              res.json({
                success: true,
                conversations: rows,
                total: total,
                unread: unreadRows ? unreadRows[0].unread : 0,
                page: parseInt(page) || 1,
                totalPages: Math.ceil(total / limit)
              });
            }
          );
        }
      );
    }
  );
};

// ============================================
// 2. GET /conversations/:id — ดูข้อความใน conversation
// ============================================
// super_admin จะเห็นชื่อแอดมินที่ตอบแต่ละข้อความ + เซลล์ที่รับผิดชอบเคส
exports.getConversationDetail = (req, res) => {
  var id = req.params.id;
  var page = req.query.page;
  var limit = 50;
  var offset = ((parseInt(page) || 1) - 1) * limit;
  var user = req.user;

  // ดึง conversation info (JOIN chat_tags + loan_requests + cases + assigned sales)
  db.query(
    'SELECT c.*, au.username as assigned_username, ' +
    'ct.name as tag_name, ct.bg_color as tag_bg_color, ct.text_color as tag_text_color, ' +
    'lr.debtor_code, lr.contact_name, lr.status as loan_request_status, ' +
    'lr.marital_status, lr.property_type, lr.province, lr.desired_amount, ' +
    /* NOTE: columns ต่อไปนี้ถูก comment ออกเพราะรอ migration:
       - lr.pipeline_stage, lr.check_price_*, lr.appraisal_* → FIX_LOAN_REQUESTS_MISSING_COLS.sql
       - lr.broker_contract_*, lr.estimated_value, lr.google_maps_url,
         lr.bathrooms, lr.floors, lr.rental_rooms, lr.rental_price_per_month,
         lr.building_permit_url, lr.building_year → FEATURE_BATCH_6.sql
       รัน migration ทั้ง 2 ไฟล์แล้วค่อย uncomment */
    'cs.id as case_id, cs.case_code, cs.assigned_sales_id, ' +
    'sales_au.full_name as sales_full_name, sales_au.nickname as sales_nickname, sales_au.username as sales_username ' +
    'FROM chat_conversations c ' +
    'LEFT JOIN admin_users au ON c.assigned_to = au.id ' +
    'LEFT JOIN chat_tags ct ON c.tag_id = ct.id ' +
    'LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id ' +
    'LEFT JOIN cases cs ON cs.loan_request_id = c.loan_request_id ' +
    'LEFT JOIN admin_users sales_au ON sales_au.id = cs.assigned_sales_id ' +
    'WHERE c.id = ?',
    [id],
    (err, convRows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (convRows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

      var conversation = convRows[0];

      // อัพเดทสถานะเป็น read
      if (conversation.status === 'unread') {
        db.query('UPDATE chat_conversations SET status = ? WHERE id = ?', ['read', id], function() {});
      }

      // ดึงข้อความ — sender_name เก็บชื่อแอดมินอยู่แล้ว (จาก saveAdminMessage)
      // ข้อมูลนี้จะแสดงให้ super_admin เห็นว่าใครตอบข้อความไหน
      db.query(
        'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
        [id, limit, offset],
        (err2, msgRows) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });

          // นับข้อความทั้งหมด
          db.query(
            'SELECT COUNT(*) as total FROM chat_messages WHERE conversation_id = ?',
            [id],
            (err3, countRows) => {
              res.json({
                success: true,
                conversation: conversation,
                messages: msgRows,
                totalMessages: countRows ? countRows[0].total : 0
              });
            }
          );
        }
      );
    }
  );
};

// ============================================
// 3. POST /conversations/:id/reply — ตอบข้อความ
// ============================================
exports.sendReply = (req, res) => {
  var id = req.params.id;
  var message = req.body.message;
  var adminUser = req.user;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'กรุณาพิมพ์ข้อความ' });
  }

  // ดึง conversation info
  db.query('SELECT * FROM chat_conversations WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    var conv = rows[0];

    // เรียก API ส่งข้อความตามแพลตฟอร์ม
    if (conv.platform === 'facebook') {
      sendFacebookReply(conv, message, adminUser, (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: 'ส่งข้อความ Facebook ไม่สำเร็จ: ' + err2.message });
        saveAdminMessage(id, message, adminUser, res, req);
      });
    } else if (conv.platform === 'line') {
      sendLineReply(conv, message, adminUser, (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: 'ส่งข้อความ LINE ไม่สำเร็จ: ' + err2.message });
        saveAdminMessage(id, message, adminUser, res, req);
      });
    } else {
      return res.status(400).json({ success: false, message: 'Unknown platform' });
    }
  });
};

// ส่งข้อความผ่าน Facebook
function sendFacebookReply(conv, message, adminUser, callback) {
  getPlatformConfig('facebook', (err, config) => {
    if (err) return callback(err);

    var recipientId = conv.customer_platform_id;
    var url = 'https://graph.facebook.com/v19.0/me/messages?access_token=' + config.access_token;

    httpRequest(url, 'POST', { 'Content-Type': 'application/json' }, {
      recipient: { id: recipientId },
      message: { text: message }
    }, (err2, body, statusCode) => {
      if (err2) return callback(err2);
      if (statusCode !== 200) return callback(new Error((body.error && body.error.message) || 'Facebook API error'));
      callback(null, body);
    });
  });
}

// ส่งข้อความผ่าน LINE (push message)
function sendLineReply(conv, message, adminUser, callback) {
  getPlatformConfig('line', (err, config) => {
    if (err) return callback(err);

    var userId = conv.customer_platform_id;
    var url = 'https://api.line.me/v2/bot/message/push';

    httpRequest(url, 'POST', {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.access_token
    }, {
      to: userId,
      messages: [{ type: 'text', text: message }]
    }, (err2, body, statusCode) => {
      if (err2) return callback(err2);
      if (statusCode !== 200) return callback(new Error(body.message || 'LINE API error'));
      callback(null, body);
    });
  });
}

// บันทึกข้อความของ admin ลง DB + emit socket real-time
function saveAdminMessage(conversationId, message, adminUser, res, req) {
  const senderName = (adminUser && (adminUser.full_name || adminUser.username)) || 'Admin';
  db.query(
    "INSERT INTO chat_messages (conversation_id, sender_type, sender_name, message_text, message_type, created_at) " +
    "VALUES (?, 'admin', ?, ?, 'text', NOW())",
    [conversationId, senderName, message],
    (err, insertResult) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      var insertedId = insertResult.insertId;

      // ★ SLA: บันทึก first_response_at ถ้ายังไม่เคยตอบ
      db.query(
        `UPDATE chat_conversations
         SET status = 'replied',
             last_message_text = ?,
             last_message_at = NOW(),
             last_replied_by_id = ?,
             last_replied_by_name = ?,
             first_response_at = CASE WHEN first_response_at IS NULL THEN NOW() ELSE first_response_at END,
             first_response_by = CASE WHEN first_response_at IS NULL THEN ? ELSE first_response_by END,
             first_response_seconds = CASE WHEN first_response_at IS NULL THEN TIMESTAMPDIFF(SECOND, created_at, NOW()) ELSE first_response_seconds END
         WHERE id = ?`,
        [message, (adminUser && adminUser.id) || null, senderName, (adminUser && adminUser.id) || null, conversationId],
        (err2) => {
          // 🔥 Emit real-time socket — broadcast ให้แอดมินทุกคนที่เปิดดู conversation นี้
          if (req) {
            var io = req.app.get('io');
            if (io) {
              var messageData = {
                conversation_id: conversationId,
                message: {
                  id: insertedId,
                  conversation_id: conversationId,
                  sender_type: 'admin',
                  sender_name: senderName,
                  message_text: message,
                  message_type: 'text',
                  attachment_url: null,
                  created_at: new Date().toISOString()
                }
              };
              io.to('conv_' + conversationId).emit('new_message', messageData);
              io.to('admin_room').emit('conversation_updated', {
                conversation_id: conversationId,
                last_message: message,
                sender_type: 'admin',
                last_replied_by_name: senderName,
                last_replied_by_id: (adminUser && adminUser.id) || null
              });
            }
          }
          res.json({ success: true, message: 'ส่งข้อความสำเร็จ', message_id: insertedId });
        }
      );
    }
  );
}

// ============================================
// 4. PUT /conversations/:id/note — เพิ่ม/แก้ไข note
// ============================================
exports.updateNote = (req, res) => {
  var id = req.params.id;
  var notes = req.body.notes;

  db.query(
    'UPDATE chat_conversations SET notes = ? WHERE id = ?',
    [notes, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'บันทึก note สำเร็จ' });
    }
  );
};

// ============================================
// 5. PUT /conversations/:id/info — แก้ไขข้อมูลลูกค้า
// ============================================
exports.updateCustomerInfo = (req, res) => {
  var id = req.params.id;
  var customer_name    = req.body.customer_name    || null;
  var customer_phone   = req.body.customer_phone   || null;
  var customer_email   = req.body.customer_email   || null;
  var contact_facebook = req.body.contact_facebook || null;
  var contact_line     = req.body.contact_line     || null;
  var province         = req.body.province         || null;

  db.query(
    `UPDATE chat_conversations
     SET customer_name = ?, customer_phone = ?, customer_email = ?,
         contact_facebook = ?, contact_line = ?, province = ?
     WHERE id = ?`,
    [customer_name, customer_phone, customer_email, contact_facebook, contact_line, province, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      // ถ้ามีชื่อ + เบอร์ครบ → ตรวจสอบว่า loan_request ยังอยู่ไหม
      if (customer_name && customer_phone) {
        db.query('SELECT loan_request_id FROM chat_conversations WHERE id = ?', [id], (err2, rows) => {
          if (err2 || rows.length === 0) return;
          var lrId = rows[0].loan_request_id;

          if (!lrId) {
            // ยังไม่เคยมี loan_request → สร้างใหม่
            var io = req.app.get('io');
            var chatWebhook = require('./chatWebhookController');
            if (chatWebhook.autoCreateLoanRequest) chatWebhook.autoCreateLoanRequest(id, io);
          } else {
            // มี loan_request_id → เช็คว่ายังอยู่ในฐานข้อมูลจริงไหม
            db.query('SELECT id FROM loan_requests WHERE id = ?', [lrId], (err3, lrRows) => {
              if (err3) return;
              if (lrRows && lrRows.length > 0) {
                // ยังอยู่ → อัพเดทข้อมูลใน loan_request (เขียนทับ)
                db.query(
                  `UPDATE loan_requests
                   SET contact_name = ?, contact_phone = ?, contact_email = ?,
                       contact_facebook = ?, contact_line = ?, province = ?
                   WHERE id = ?`,
                  [customer_name, customer_phone, customer_email, contact_facebook, contact_line, province, lrId],
                  () => {}
                );
              } else {
                // ถูกลบไปแล้ว → ตัด link เดิม แล้วสร้างลูกหนี้ใหม่
                db.query('UPDATE chat_conversations SET loan_request_id = NULL WHERE id = ?', [id], () => {
                  var io = req.app.get('io');
                  var chatWebhook = require('./chatWebhookController');
                  if (chatWebhook.autoCreateLoanRequest) chatWebhook.autoCreateLoanRequest(id, io);
                });
              }
            });
          }
        });
      }

      res.json({ success: true, message: 'อัพเดทข้อมูลลูกค้าสำเร็จ' });
    }
  );
};

// ============================================
// 6. PUT /conversations/:id/assign — มอบหมายเคส
// ============================================
exports.assignConversation = (req, res) => {
  var id = req.params.id;
  var assigned_to = req.body.assigned_to;

  db.query(
    'UPDATE chat_conversations SET assigned_to = ? WHERE id = ?',
    [assigned_to || null, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'มอบหมายเคสสำเร็จ' });
    }
  );
};

// ============================================
// 7. POST /sync/facebook — ดึงข้อมูลแชทจาก Facebook Graph API
// ============================================
exports.syncFacebook = (req, res) => {
  getPlatformConfig('facebook', (err, config) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    var pageId = config.platform_id;
    var token = config.access_token;

    // ดึง conversations จาก Facebook Page (Conversations API)
    var url = 'https://graph.facebook.com/v19.0/' + pageId +
      '/conversations?fields=id,participants,updated_time,snippet,message_count,' +
      'messages.limit(20){id,from,to,message,created_time,attachments{mime_type,name,size,image_data}}&' +
      'access_token=' + token + '&limit=25';

    httpRequest(url, 'GET', {}, null, (err2, body) => {
      if (err2) return res.status(500).json({ success: false, message: err2.message });
      if (body.error) return res.status(500).json({ success: false, message: 'Facebook API Error: ' + body.error.message });

      var conversations = (body.data) || [];
      var processed = 0;
      var synced = 0;

      if (conversations.length === 0) {
        return res.json({ success: true, message: 'ไม่มี conversation ใหม่จาก Facebook', synced: 0 });
      }

      conversations.forEach(function(fbConv) {
        // หา customer (ไม่ใช่ page)
        var participants = (fbConv.participants && fbConv.participants.data) || [];
        var customer = participants.find(function(p) { return p.id !== pageId; }) || {};
        var messages = (fbConv.messages && fbConv.messages.data) || [];
        var lastMsg = messages[0]; // messages เรียงจากใหม่สุด

        // Parse ข้อมูลลูกค้าจากข้อความทั้งหมด
        var allText = messages.map(function(m) { return m.message || ''; }).join(' ');
        var extracted = extractCustomerInfo(allText);

        // ดึง avatar ของลูกค้า (ถ้ามี PSID)
        var avatarUrl = customer.id ? ('https://graph.facebook.com/v19.0/' + customer.id + '/picture?type=normal&access_token=' + token) : null;

        // Upsert conversation
        db.query(
          "INSERT INTO chat_conversations (platform, platform_conversation_id, customer_name, customer_phone, customer_email, customer_avatar, customer_platform_id, status, last_message_text, last_message_at, created_at) " +
          "VALUES ('facebook', ?, ?, ?, ?, ?, ?, 'unread', ?, ?, NOW()) " +
          "ON DUPLICATE KEY UPDATE " +
          "customer_name = COALESCE(VALUES(customer_name), customer_name), " +
          "customer_phone = COALESCE(VALUES(customer_phone), customer_phone), " +
          "customer_email = COALESCE(VALUES(customer_email), customer_email), " +
          "customer_avatar = COALESCE(VALUES(customer_avatar), customer_avatar), " +
          "last_message_text = VALUES(last_message_text), " +
          "last_message_at = VALUES(last_message_at)",
          [
            fbConv.id,
            customer.name || null,
            extracted.phone || null,
            extracted.email || null,
            avatarUrl,
            customer.id || null,
            (lastMsg && lastMsg.message) || null,
            (lastMsg && lastMsg.created_time) || null
          ],
          (err3, result) => {
            if (err3) {
              console.log('Sync FB conversation error:', err3.message);
              processed++;
              if (processed === conversations.length) {
                return res.json({ success: true, message: 'Sync สำเร็จ ' + synced + '/' + processed + ' conversations', synced: synced });
              }
              return;
            }

            synced++;

            // ดึง conversation id สำหรับ insert messages
            var convId = result.insertId;
            if (!convId || convId === 0) {
              // ON DUPLICATE KEY UPDATE → ต้อง query หา id
              db.query(
                "SELECT id FROM chat_conversations WHERE platform = 'facebook' AND platform_conversation_id = ?",
                [fbConv.id],
                (err4, idRows) => {
                  if (!err4 && idRows.length > 0) {
                    syncMessages(idRows[0].id, messages, pageId);
                  }
                  processed++;
                  if (processed === conversations.length) {
                    res.json({ success: true, message: 'Sync Facebook สำเร็จ ' + synced + ' conversations, ' + messages.length + ' ข้อความ', synced: synced });
                  }
                }
              );
            } else {
              syncMessages(convId, messages, pageId);
              processed++;
              if (processed === conversations.length) {
                res.json({ success: true, message: 'Sync Facebook สำเร็จ ' + synced + ' conversations', synced: synced });
              }
            }
          }
        );
      });
    });
  });
};

// ============================================
// 8. POST /sync/line — LINE ไม่มี API ดึง history
// ============================================
exports.syncLine = (req, res) => {
  res.json({
    success: true,
    message: 'LINE ไม่มี API ดึงประวัติแชทย้อนหลัง — ข้อมูลจะเข้ามาผ่าน Webhook อัตโนมัติเมื่อลูกค้าส่งข้อความใหม่ (ต้องใช้ ngrok หรือ domain จริง)'
  });
};

// ============================================
// 9. GET /platforms — ดู platform configs
// ============================================
exports.getPlatforms = (req, res) => {
  db.query('SELECT id, platform_name, platform_id, page_name, is_active, created_at FROM chat_platforms', (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, platforms: rows });
  });
};

// ============================================
// 10. POST /platforms — เพิ่ม/แก้ platform config
// ============================================
exports.createPlatform = (req, res) => {
  var platform_name = req.body.platform_name;
  var platform_id = req.body.platform_id;
  var access_token = req.body.access_token;
  var channel_secret = req.body.channel_secret;
  var page_name = req.body.page_name;

  if (!platform_name || !platform_id || !access_token) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ (platform, ID, token)' });
  }

  db.query(
    "INSERT INTO chat_platforms (platform_name, platform_id, access_token, channel_secret, page_name) " +
    "VALUES (?, ?, ?, ?, ?) " +
    "ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), channel_secret = VALUES(channel_secret), page_name = VALUES(page_name)",
    [platform_name, platform_id, access_token, channel_secret || null, page_name || null],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'บันทึก platform สำเร็จ' });
    }
  );
};

// ============================================
// 11. DELETE /platforms/:id — ลบ platform
// ============================================
exports.deletePlatform = (req, res) => {
  var id = req.params.id;
  db.query('DELETE FROM chat_platforms WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: 'ลบ platform สำเร็จ' });
  });
};

// ============================================
// 12. GET /stats — สถิติแชท
// ============================================
exports.getStats = (req, res) => {
  db.query(
    "SELECT " +
    "COUNT(*) as total, " +
    "SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread, " +
    "SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as reading, " +
    "SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied, " +
    "SUM(CASE WHEN platform = 'facebook' THEN 1 ELSE 0 END) as facebook, " +
    "SUM(CASE WHEN platform = 'line' THEN 1 ELSE 0 END) as line_count " +
    "FROM chat_conversations",
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, stats: rows[0] });
    }
  );
};

// ============================================
// Helper: Sync messages จาก Facebook ลง DB
// ============================================
function syncMessages(conversationId, messages, pageId) {
  if (!messages || messages.length === 0) return;

  messages.forEach(function(msg) {
    var senderType = (msg.from && msg.from.id === pageId) ? 'admin' : 'customer';
    var senderName = (msg.from && msg.from.name) || '';
    var messageText = msg.message || '';
    var createdAt = msg.created_time || new Date().toISOString();

    // ตรวจสอบ attachment
    var messageType = 'text';
    var attachmentUrl = null;
    if (msg.attachments && msg.attachments.data && msg.attachments.data.length > 0) {
      var att = msg.attachments.data[0];
      if (att.mime_type && att.mime_type.startsWith('image/')) {
        messageType = 'image';
        attachmentUrl = (att.image_data && att.image_data.url) || null;
      } else {
        messageType = 'file';
        attachmentUrl = att.file_url || null;
      }
    }

    db.query(
      "INSERT IGNORE INTO chat_messages (conversation_id, platform_message_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [conversationId, msg.id, senderType, senderName, messageText, messageType, attachmentUrl, createdAt],
      (err) => {
        if (err) console.log('Sync message error:', err.message);
      }
    );
  });
}

// ============================================
// PROXY — ดึงรูปภาพ/วิดีโอจาก LINE (ต้องใช้ Bearer token)
// ============================================
exports.proxyLineContent = (req, res) => {
  const messageId = req.params.messageId;

  if (!messageId) {
    return res.status(400).json({ success: false, message: 'Missing messageId' });
  }

  getPlatformConfig('line', (err, config) => {
    if (err) return res.status(500).json({ success: false, message: 'LINE not configured' });

    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const options = {
      headers: { 'Authorization': `Bearer ${config.access_token}` }
    };

    https.get(url, options, (lineRes) => {
      if (lineRes.statusCode !== 200) {
        return res.status(lineRes.statusCode).json({ success: false, message: 'LINE content not found' });
      }

      // ส่ง content-type ตามที่ LINE ส่งกลับมา (image/jpeg, video/mp4 ฯลฯ)
      const contentType = lineRes.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 1 วัน

      // pipe ข้อมูลจาก LINE ไป client
      lineRes.pipe(res);
    }).on('error', (err2) => {
      console.log('LINE proxy error:', err2.message);
      res.status(500).json({ success: false, message: 'Proxy error' });
    });
  });
};

// ============================================
// TAGS — ระบบแท็กสถานะ
// ============================================

// GET /tags — ดึงแท็กทั้งหมด
exports.getTags = (req, res) => {
  db.query('SELECT * FROM chat_tags ORDER BY sort_order ASC, id ASC', (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, tags: rows });
  });
};

// POST /tags — สร้างแท็กใหม่
exports.createTag = (req, res) => {
  const { name, bg_color, text_color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อแท็ก' });
  }

  // หา sort_order สูงสุด
  db.query('SELECT MAX(sort_order) as max_sort FROM chat_tags', (err, rows) => {
    const nextSort = (rows && rows[0] && rows[0].max_sort || 0) + 1;
    db.query(
      'INSERT INTO chat_tags (name, bg_color, text_color, sort_order, created_by) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), bg_color || '#e5e7eb', text_color || '#333333', nextSort, req.user?.id || null],
      (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: err2.message });
        res.json({
          success: true,
          message: 'สร้างแท็กสำเร็จ',
          tag: { id: result.insertId, name: name.trim(), bg_color: bg_color || '#e5e7eb', text_color: text_color || '#333333', sort_order: nextSort }
        });
      }
    );
  });
};

// PUT /tags/:id — แก้ไขแท็ก
exports.updateTag = (req, res) => {
  const { name, bg_color, text_color } = req.body;
  const tagId = req.params.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อแท็ก' });
  }

  db.query(
    'UPDATE chat_tags SET name = ?, bg_color = ?, text_color = ? WHERE id = ?',
    [name.trim(), bg_color || '#e5e7eb', text_color || '#333333', tagId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'อัพเดทแท็กสำเร็จ' });
    }
  );
};

// DELETE /tags/:id — ลบแท็ก
exports.deleteTag = (req, res) => {
  const tagId = req.params.id;

  // ลบแท็กออกจาก conversations ที่ใช้อยู่
  db.query('UPDATE chat_conversations SET tag_id = NULL WHERE tag_id = ?', [tagId], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    db.query('DELETE FROM chat_tags WHERE id = ?', [tagId], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: err2.message });
      res.json({ success: true, message: 'ลบแท็กสำเร็จ' });
    });
  });
};

// PUT /conversations/:id/tag — ตั้งแท็กให้ conversation
exports.setConversationTag = (req, res) => {
  const id = req.params.id;
  const tag_id = req.body.tag_id; // null = ลบแท็ก

  db.query(
    'UPDATE chat_conversations SET tag_id = ? WHERE id = ?',
    [tag_id || null, id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: tag_id ? 'ตั้งแท็กสำเร็จ' : 'ลบแท็กสำเร็จ' });
    }
  );
};

// ============================================
// ARCHIVE — ดูตัวอย่างข้อมูลที่จะ archive
// ============================================
exports.previewArchive = (req, res) => {
  const months = parseInt(req.query.months) || 3;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

  db.query(
    `SELECT COUNT(*) as message_count,
            MIN(created_at) as oldest_message,
            MAX(created_at) as newest_in_range,
            COUNT(DISTINCT conversation_id) as conversation_count
     FROM chat_messages WHERE created_at < ?`,
    [cutoffStr],
    (err, rows) => {
      if (err) return res.json({ success: false, message: err.message });

      const info = rows[0];
      // ดูขนาดตาราง
      db.query(
        `SELECT
           (SELECT COUNT(*) FROM chat_messages) as total_messages,
           (SELECT COUNT(*) FROM chat_messages_archive) as archived_messages`,
        (err2, rows2) => {
          const totals = !err2 && rows2[0] ? rows2[0] : { total_messages: 0, archived_messages: 0 };
          res.json({
            success: true,
            preview: {
              months: months,
              cutoff_date: cutoffStr,
              messages_to_archive: info.message_count,
              conversations_affected: info.conversation_count,
              oldest_message: info.oldest_message,
              newest_in_range: info.newest_in_range,
              total_messages_current: totals.total_messages,
              total_messages_archived: totals.archived_messages
            }
          });
        }
      );
    }
  );
};

// ============================================
// ARCHIVE — ย้ายข้อมูลเก่าไปตาราง archive
// ============================================
exports.executeArchive = (req, res) => {
  const months = parseInt(req.body.months) || 3;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffStr = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

  // Step 1: Copy ข้อมูลเก่าไป archive
  db.query(
    `INSERT INTO chat_messages_archive (original_id, conversation_id, platform_message_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at)
     SELECT id, conversation_id, platform_message_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at
     FROM chat_messages WHERE created_at < ?`,
    [cutoffStr],
    (err, result) => {
      if (err) return res.json({ success: false, message: 'Archive copy error: ' + err.message });

      const copiedCount = result.affectedRows;

      // Step 2: ลบข้อมูลเก่าจากตาราง chat_messages
      db.query(
        `DELETE FROM chat_messages WHERE created_at < ?`,
        [cutoffStr],
        (err2, result2) => {
          if (err2) return res.json({ success: false, message: 'Archive delete error: ' + err2.message });

          const deletedCount = result2.affectedRows;
          res.json({
            success: true,
            message: `Archive สำเร็จ — ย้าย ${copiedCount} ข้อความ, ลบ ${deletedCount} ข้อความ (เก่ากว่า ${months} เดือน)`,
            archived: copiedCount,
            deleted: deletedCount
          });
        }
      );
    }
  );
};

// ============================================
// LINKED USER — ค้นหา user จาก property_db ที่เชื่อมกับลูกค้าแชท
// GET /conversations/:id/linked-user
// ============================================
exports.getLinkedUser = (req, res) => {
  var id = req.params.id;

  // ดึง phone/email ของลูกค้าจาก conversation
  db.query('SELECT customer_phone, customer_email, customer_name FROM chat_conversations WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    var conv = rows[0];
    var phone = conv.customer_phone;
    var email = conv.customer_email;
    var name = conv.customer_name;

    // ถ้าไม่มีเบอร์และอีเมล → ไม่สามารถค้นหาได้
    if (!phone && !email) {
      return res.json({ success: true, linked_user: null, message: 'ไม่มีเบอร์/อีเมลเพื่อค้นหา' });
    }

    // ค้นหาจาก property_db.users (cross-database query)
    var where = [];
    var params = [];
    if (phone) {
      where.push('u.phone = ?');
      params.push(phone);
    }
    if (email) {
      where.push('u.email = ?');
      params.push(email);
    }

    var userSql = 'SELECT u.id, u.display_name, u.email, u.phone, u.role, u.avatar_url, u.company_name, u.line_id, u.created_at ' +
      'FROM property_db.users u WHERE (' + where.join(' OR ') + ') LIMIT 1';

    db.query(userSql, params, (err2, userRows) => {
      if (err2) {
        // ถ้า query cross-database ไม่ได้ (permission) → ส่ง null
        console.log('Cross-DB query error:', err2.message);
        return res.json({ success: true, linked_user: null, message: 'ไม่สามารถเชื่อมต่อ property_db: ' + err2.message });
      }

      if (userRows.length === 0) {
        return res.json({ success: true, linked_user: null, message: 'ไม่พบ user ที่ตรงกัน' });
      }

      var user = userRows[0];

      // ดึงทรัพย์ที่ user ลงประกาศ
      db.query(
        'SELECT ip.id, ip.property_type, ip.listing_type, ip.price, ip.province, ip.district, ip.status, ip.created_at ' +
        'FROM property_db.investment_properties ip WHERE ip.user_id = ? ORDER BY ip.created_at DESC LIMIT 10',
        [user.id],
        (err3, properties) => {
          if (err3) {
            console.log('Cross-DB properties query error:', err3.message);
            properties = [];
          }

          // ดึงทรัพย์ที่ user เป็นเจ้าของ (ถ้ามี)
          db.query(
            'SELECT p.id, p.title, p.property_type, p.listing_type, p.price_requested, p.province, p.is_active, p.created_at ' +
            'FROM property_db.properties p WHERE p.owner_id = ? ORDER BY p.created_at DESC LIMIT 10',
            [user.id],
            (err4, ownedProperties) => {
              if (err4) {
                console.log('Cross-DB owned properties query error:', err4.message);
                ownedProperties = [];
              }

              res.json({
                success: true,
                linked_user: {
                  ...user,
                  investment_properties: properties || [],
                  owned_properties: ownedProperties || []
                }
              });
            }
          );
        }
      );
    });
  });
};

// ============================================
// FILE UPLOAD — ส่งไฟล์ (รูป/PDF/เอกสาร) ในแชท
// ============================================
exports.sendFileReply = (req, res) => {
  var id = req.params.id;
  var adminUser = req.user;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'ไม่พบไฟล์' });
  }

  var file = req.file;
  var attachmentUrl = '/uploads/chat/' + file.filename;
  var ext = path.extname(file.originalname).toLowerCase();
  var messageType = 'file';
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(ext)) messageType = 'image';
  else if (/\.(mp4|mov)$/.test(ext)) messageType = 'video';
  else if (/\.pdf$/.test(ext)) messageType = 'file';

  var messageText = messageType === 'image' ? '[รูปภาพ]' : messageType === 'video' ? '[วิดีโอ]' : '[ไฟล์] ' + file.originalname;

  // ดึง conversation info
  db.query('SELECT * FROM chat_conversations WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    var conv = rows[0];

    // ส่งไฟล์ไปยังแพลตฟอร์ม (ถ้าเป็นรูป)
    // หมายเหตุ: FB/LINE รองรับส่งรูป แต่ไฟล์ PDF ส่งตรงไม่ได้ ส่งเป็นข้อความแจ้ง
    var platformSendDone = (sendErr) => {
      // บันทึกลง DB ไม่ว่าจะส่งไปแพลตฟอร์มสำเร็จหรือไม่
      db.query(
        "INSERT INTO chat_messages (conversation_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at) " +
        "VALUES (?, 'admin', ?, ?, ?, ?, NOW())",
        [id, (adminUser && (adminUser.full_name || adminUser.username)) || 'Admin', messageText, messageType, attachmentUrl],
        (err2, insertResult) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });
          var insertedId = insertResult.insertId;
          const fileSenderName = (adminUser && (adminUser.full_name || adminUser.username)) || 'Admin';

          // ★ SLA: บันทึก first_response_at ถ้ายังไม่เคยตอบ (file reply)
          db.query(
            `UPDATE chat_conversations
             SET status = 'replied', last_message_text = ?, last_message_at = NOW(),
                 last_replied_by_id = ?, last_replied_by_name = ?,
                 first_response_at = CASE WHEN first_response_at IS NULL THEN NOW() ELSE first_response_at END,
                 first_response_by = CASE WHEN first_response_at IS NULL THEN ? ELSE first_response_by END,
                 first_response_seconds = CASE WHEN first_response_at IS NULL THEN TIMESTAMPDIFF(SECOND, created_at, NOW()) ELSE first_response_seconds END
             WHERE id = ?`,
            [messageText, (adminUser && adminUser.id) || null, fileSenderName, (adminUser && adminUser.id) || null, id],
            () => {
              // 🔥 Emit real-time socket event — แจ้ง admin ทุกคนที่เปิดดู conversation นี้
              var io = req.app.get('io');
              // insertedId มาจาก DB จริง ป้องกัน duplicate
              if (io) {
                var messageData = {
                  conversation_id: id,
                  message: {
                    id: insertedId,
                    conversation_id: id,
                    sender_type: 'admin',
                    sender_name: fileSenderName,
                    message_text: messageText,
                    message_type: messageType,
                    attachment_url: attachmentUrl,
                    created_at: new Date().toISOString()
                  }
                };
                // ส่งไปห้อง conversation (แอดมินที่เปิดดูอยู่)
                io.to('conv_' + id).emit('new_message', messageData);
                // อัพเดท conversation list ของทุกแอดมิน
                io.to('admin_room').emit('conversation_updated', {
                  conversation_id: id,
                  customer_name: conv.customer_name || '',
                  platform: conv.platform || '',
                  customer_avatar: conv.customer_avatar || '',
                  last_message: messageText,
                  sender_type: 'admin'
                });
              }

              res.json({
                success: true,
                message: 'ส่งไฟล์สำเร็จ',
                attachment_url: attachmentUrl,
                message_type: messageType,
                message_id: insertedId  // ส่ง real DB id กลับให้ frontend อัปเดต id จริง
              });
            }
          );
        }
      );
    };

    // ส่งไฟล์ไปยังแพลตฟอร์มตามประเภท
    // PUBLIC_URL ต้องตั้งใน .env เช่น https://api.yourdomain.com (ต้องเป็น HTTPS สาธารณะ)
    // LINE และ Facebook จะดาวน์โหลดรูปจาก URL นี้ ถ้าไม่ตั้งจะใช้ req.hostname แทน
    var baseUrl = process.env.PUBLIC_URL
      ? process.env.PUBLIC_URL.replace(/\/$/, '')
      : (req.get('x-forwarded-proto') || req.protocol) + '://' + (req.get('x-forwarded-host') || req.get('host'));
    var fileUrl = baseUrl + attachmentUrl;

    if (conv.platform === 'facebook') {
      // Facebook รองรับส่งได้ทั้ง image, video, file (PDF/doc)
      getPlatformConfig('facebook', (err3, config) => {
        if (err3) return platformSendDone(err3);
        var fbType = messageType === 'image' ? 'image' : messageType === 'video' ? 'video' : 'file';
        var url = 'https://graph.facebook.com/v19.0/me/messages?access_token=' + config.access_token;
        httpRequest(url, 'POST', { 'Content-Type': 'application/json' }, {
          recipient: { id: conv.customer_platform_id },
          message: { attachment: { type: fbType, payload: { url: fileUrl, is_reusable: true } } }
        }, (sendErr, body, statusCode) => {
          if (sendErr || (statusCode && statusCode !== 200)) {
            console.log('FB send file error:', sendErr?.message || JSON.stringify(body));
          }
          platformSendDone(null); // บันทึกลง DB ไม่ว่าจะส่งสำเร็จหรือไม่
        });
      });
    } else if (conv.platform === 'line') {
      getPlatformConfig('line', (err3, config) => {
        if (err3) return platformSendDone(err3);

        var lineMessages;
        if (messageType === 'image') {
          // LINE รองรับส่งรูปภาพโดยตรง
          lineMessages = [{ type: 'image', originalContentUrl: fileUrl, previewImageUrl: fileUrl }];
        } else if (messageType === 'video') {
          // LINE รองรับส่งวิดีโอโดยตรง
          lineMessages = [{ type: 'video', originalContentUrl: fileUrl, previewImageUrl: fileUrl }];
        } else {
          // LINE ไม่รองรับส่งไฟล์ PDF/doc โดยตรง → ส่งเป็น Flex Message การ์ดไฟล์ดาวน์โหลด
          var fileName = file.originalname || path.basename(attachmentUrl);
          var ext = path.extname(fileName).replace('.', '').toUpperCase() || 'FILE';
          // ไอคอน emoji ตาม type
          var fileEmoji = ext === 'PDF' ? '📄' : (ext === 'DOCX' || ext === 'DOC') ? '📝' : (ext === 'XLSX' || ext === 'XLS') ? '📊' : '📎';
          lineMessages = [{
            type: 'flex',
            altText: '📎 ไฟล์แนบ: ' + fileName,
            contents: {
              type: 'bubble',
              size: 'kilo',
              body: {
                type: 'box',
                layout: 'horizontal',
                paddingAll: '16px',
                spacing: 'md',
                action: { type: 'uri', uri: fileUrl },
                contents: [
                  {
                    type: 'text',
                    text: fileEmoji,
                    flex: 0,
                    size: 'xxl',
                    gravity: 'center'
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    flex: 1,
                    justifyContent: 'center',
                    contents: [
                      {
                        type: 'text',
                        text: fileName,
                        weight: 'bold',
                        size: 'sm',
                        wrap: true,
                        maxLines: 2,
                        color: '#1e293b'
                      },
                      {
                        type: 'text',
                        text: ext + ' · แตะเพื่อดาวน์โหลด',
                        size: 'xs',
                        color: '#64748b',
                        margin: 'xs'
                      }
                    ]
                  },
                  {
                    type: 'text',
                    text: '⬇',
                    flex: 0,
                    size: 'lg',
                    gravity: 'center',
                    color: '#3b82f6'
                  }
                ]
              },
              styles: {
                body: { backgroundColor: '#f8fafc' }
              }
            }
          }];
        }

        httpRequest('https://api.line.me/v2/bot/message/push', 'POST', {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.access_token
        }, {
          to: conv.customer_platform_id,
          messages: lineMessages
        }, () => platformSendDone(null));
      });
    } else {
      platformSendDone(null);
    }
  });
};

// ============================================
// Helper: สร้างรหัส sequential (reuse logic จาก salesController)
// ============================================
function generateSequentialCode(table, column, prefix, digits, callback) {
  const sql = `SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`;
  db.query(sql, [prefix + '%'], (err, rows) => {
    if (err) return callback(err, null);
    let nextNum = 1;
    if (rows.length > 0 && rows[0][column]) {
      const current = rows[0][column].replace(prefix, '');
      const num = parseInt(current, 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const code = prefix + String(nextNum).padStart(digits, '0');
    callback(null, code);
  });
}

// ============================================
// POST /conversations/:id/create-loan-request
// ปุ่มสร้าง loan_request ด้วยมือ (กรณี auto-create ยังไม่ทริกเกอร์)
// ============================================
exports.manualCreateLoanRequest = (req, res) => {
  const convId = req.params.id;

  // 1) ดึงข้อมูล conversation
  db.query('SELECT * FROM chat_conversations WHERE id = ?', [convId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const conv = rows[0];

    // ถ้าสร้างแล้ว → return ข้อมูลเดิม
    if (conv.loan_request_id) {
      return db.query('SELECT id, debtor_code FROM loan_requests WHERE id = ?', [conv.loan_request_id], (err2, lrRows) => {
        if (err2) return res.status(500).json({ success: false, message: err2.message });
        return res.json({
          success: true,
          message: 'ลูกหนี้เคยสร้างแล้ว',
          loan_request_id: conv.loan_request_id,
          debtor_code: lrRows.length > 0 ? lrRows[0].debtor_code : null,
          already_exists: true
        });
      });
    }

    // ต้องมีอย่างน้อยชื่อ
    if (!conv.customer_name) {
      return res.status(400).json({ success: false, message: 'ไม่มีชื่อลูกค้า — กรุณาแก้ไขข้อมูลลูกค้าก่อน' });
    }

    // ตรวจ duplicate เบอร์
    const checkDup = conv.customer_phone
      ? new Promise((resolve) => {
          db.query('SELECT id, debtor_code FROM loan_requests WHERE contact_phone = ? LIMIT 1', [conv.customer_phone], (errDup, dupRows) => {
            if (!errDup && dupRows && dupRows.length > 0) {
              // มีอยู่แล้ว → เชื่อม
              const existingId = dupRows[0].id;
              db.query('UPDATE chat_conversations SET loan_request_id = ? WHERE id = ?', [existingId, convId], () => {});
              return resolve({ exists: true, id: existingId, debtor_code: dupRows[0].debtor_code });
            }
            resolve(null);
          });
        })
      : Promise.resolve(null);

    checkDup.then((existing) => {
      if (existing) {
        return res.json({
          success: true,
          message: `เชื่อมกับลูกหนี้ ${existing.debtor_code} ที่มีอยู่แล้ว (เบอร์เดียวกัน)`,
          loan_request_id: existing.id,
          debtor_code: existing.debtor_code,
          already_exists: true
        });
      }

      // สร้างใหม่
      generateSequentialCode('loan_requests', 'debtor_code', 'LDD', 4, (errCode, debtor_code) => {
        if (errCode) return res.status(500).json({ success: false, message: 'สร้างรหัสไม่สำเร็จ' });

        const source = conv.platform === 'line' ? 'LINE แชท' : conv.platform === 'facebook' ? 'Facebook แชท' : 'แชท';
        const preferred_contact = conv.platform || 'phone';
        let province = conv.location_hint || null;
        if (province === 'กทม' || province === 'กรุงเทพ') province = 'กรุงเทพมหานคร';
        if (province === 'โคราช') province = 'นครราชสีมา';
        if (province === 'อยุธยา') province = 'พระนครศรีอยุธยา';

        const notes = ['สร้างด้วยมือจากหน้าแชท — ' + source];
        if (conv.customer_email) notes.push('อีเมล: ' + conv.customer_email);

        const sql = `
          INSERT INTO loan_requests
            (debtor_code, source, contact_name, contact_phone,
             preferred_contact, property_type, loan_type_detail,
             deed_type, estimated_value, province,
             has_obligation, admin_note, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;
        const params = [
          debtor_code, source,
          conv.customer_name,
          conv.customer_phone || null,
          preferred_contact,
          conv.property_type || null,
          conv.loan_type_detail || null,
          conv.deed_type || null,
          conv.estimated_value || null,
          province,
          conv.has_obligation || null,
          notes.join(' | ')
        ];

        db.query(sql, params, (errInsert, result) => {
          if (errInsert) return res.status(500).json({ success: false, message: errInsert.message });

          const loanRequestId = result.insertId;
          db.query('UPDATE chat_conversations SET loan_request_id = ? WHERE id = ?', [loanRequestId, convId], () => {});

          // แจ้ง socket
          const io = req.app.get('io');
          if (io) {
            io.to('admin_room').emit('loan_request_created', {
              conversation_id: parseInt(convId),
              loan_request_id: loanRequestId,
              debtor_code: debtor_code,
              customer_name: conv.customer_name,
              source: source,
              message: `ลูกหนี้ใหม่ ${debtor_code} สร้างจากหน้าแชท`
            });
          }

          res.json({
            success: true,
            message: `สร้างลูกหนี้ ${debtor_code} สำเร็จ`,
            loan_request_id: loanRequestId,
            debtor_code: debtor_code
          });
        });
      });
    });
  });
};

// ============================================
// POST /conversations/:id/sync-loan-request
// อัพเดทข้อมูล loan_request ด้วยข้อมูลล่าสุดจาก conversation
// (ปุ่มกดด้วยมือ — force update ทุกฟิลด์ที่ยังว่าง)
// ============================================
exports.syncLoanRequest = (req, res) => {
  const convId = req.params.id;

  db.query('SELECT * FROM chat_conversations WHERE id = ?', [convId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const conv = rows[0];
    if (!conv.loan_request_id) {
      return res.status(400).json({ success: false, message: 'ยังไม่ได้สร้างลูกหนี้ — กดสร้างก่อน' });
    }

    // Build update SET ด้วย COALESCE — อัพเดทเฉพาะฟิลด์ที่ยังว่าง
    const updates = [];
    const params = [];

    if (conv.customer_name) {
      updates.push('contact_name = COALESCE(contact_name, ?)');
      params.push(conv.customer_name);
    }
    if (conv.customer_phone) {
      updates.push('contact_phone = COALESCE(contact_phone, ?)');
      params.push(conv.customer_phone);
    }
    if (conv.property_type) {
      updates.push('property_type = COALESCE(property_type, ?)');
      params.push(conv.property_type);
    }
    if (conv.deed_type) {
      updates.push('deed_type = COALESCE(deed_type, ?)');
      params.push(conv.deed_type);
    }
    if (conv.loan_type_detail) {
      updates.push('loan_type_detail = COALESCE(loan_type_detail, ?)');
      params.push(conv.loan_type_detail);
    }
    if (conv.estimated_value) {
      updates.push('estimated_value = COALESCE(estimated_value, ?)');
      params.push(conv.estimated_value);
    }
    if (conv.has_obligation) {
      updates.push('has_obligation = COALESCE(has_obligation, ?)');
      params.push(conv.has_obligation);
    }
    if (conv.location_hint) {
      let province = conv.location_hint;
      if (province === 'กทม' || province === 'กรุงเทพ') province = 'กรุงเทพมหานคร';
      if (province === 'โคราช') province = 'นครราชสีมา';
      if (province === 'อยุธยา') province = 'พระนครศรีอยุธยา';
      updates.push('province = COALESCE(province, ?)');
      params.push(province);
    }
    if (conv.platform) {
      updates.push('preferred_contact = COALESCE(preferred_contact, ?)');
      params.push(conv.platform);
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'ไม่มีข้อมูลใหม่ให้อัพเดท', updated_fields: 0 });
    }

    params.push(conv.loan_request_id);
    db.query(`UPDATE loan_requests SET ${updates.join(', ')} WHERE id = ?`, params, (errUpdate) => {
      if (errUpdate) return res.status(500).json({ success: false, message: errUpdate.message });

      res.json({
        success: true,
        message: `อัพเดทข้อมูลลูกหนี้สำเร็จ (${updates.length} รายการ)`,
        updated_fields: updates.length
      });
    });
  });
};
// ============================================
// GET /sales-list — รายชื่อเซลล์ทั้งหมดสำหรับ dropdown โอนแชท
// ============================================
exports.getSalesListForTransfer = (req, res) => {
  db.query(
    "SELECT id, username, full_name, nickname FROM admin_users WHERE department = 'sales' AND status = 'active' ORDER BY full_name ASC",
    (err, rows) => {
      if (err) return res.status(500).json({ success: false })
      res.json({ success: true, sales_users: rows })
    }
  )
}

// ============================================
// POST /conversations/:id/transfer — โอนแชทให้เซลล์คนอื่น
// อัพเดท chat_conversations.assigned_to + cases.assigned_sales_id
// หลังโอน conversation หายออกจาก list ของ sender ทันที
// ============================================
exports.transferConversation = (req, res) => {
  const convId = req.params.id
  const { to_sales_id, reason } = req.body
  const from_user = req.user

  if (!to_sales_id) return res.status(400).json({ success: false, message: 'กรุณาเลือกเซลล์ที่ต้องการโอน' })

  const io = req.app.get('io')

  // ดึงข้อมูล conversation + case ปัจจุบัน
  db.query(
    `SELECT c.id, c.assigned_to, c.loan_request_id, c.customer_name,
            cs.id AS case_id, cs.case_code, cs.assigned_sales_id,
            lr.contact_name
     FROM chat_conversations c
     LEFT JOIN cases cs ON cs.loan_request_id = c.loan_request_id
     LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
     WHERE c.id = ?`,
    [convId],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบ conversation' })

      const conv = rows[0]

      // ดึงชื่อเซลล์ปลายทาง
      db.query(
        'SELECT id, full_name, username, nickname FROM admin_users WHERE id = ? AND status = \'active\'',
        [to_sales_id],
        (err2, toRows) => {
          if (err2 || !toRows.length) return res.status(404).json({ success: false, message: 'ไม่พบเซลล์ที่ต้องการโอน' })

          const toSales = toRows[0]
          const toName = toSales.full_name || toSales.username

          // 1) อัพเดท chat_conversations.assigned_to
          db.query(
            'UPDATE chat_conversations SET assigned_to = ? WHERE id = ?',
            [to_sales_id, convId],
            (err3) => {
              if (err3) return res.status(500).json({ success: false, message: err3.message })

              // 2) อัพเดท cases.assigned_sales_id ถ้ามี case
              if (conv.case_id) {
                db.query(
                  'UPDATE cases SET assigned_sales_id = ? WHERE id = ?',
                  [to_sales_id, conv.case_id],
                  (err4) => { if (err4) console.error('transfer cases error:', err4.message) }
                )
                // บันทึก case_transfer_log
                db.query(
                  `INSERT INTO case_transfer_log
                   (case_id, from_sales_id, from_sales_name, to_sales_id, to_sales_name, transferred_by, reason)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [conv.case_id, from_user.id, from_user.full_name || from_user.username,
                   to_sales_id, toName, from_user.id, reason || null],
                  (err5) => { if (err5) console.error('transfer log error:', err5.message) }
                )
              }

              // 3) Socket: แจ้งเซลล์คนใหม่ + admin_room (super_admin เห็น real-time)
              const customerName = conv.customer_name || conv.contact_name || 'ลูกค้า'
              const transferPayload = {
                conv_id: convId,
                case_id: conv.case_id,
                case_code: conv.case_code,
                customer_name: customerName,
                from_name: from_user.full_name || from_user.username,
                from_id: from_user.id,
                to_name: toName,
                to_id: to_sales_id,
                reason: reason || ''
              }
              io.to('user_' + to_sales_id).emit('chat_transferred_to_you', transferPayload)
              // แจ้ง super_admin / admin ให้ refresh list
              io.to('admin_room').emit('chat_transfer_done', transferPayload)

              res.json({
                success: true,
                message: `โอนแชทให้ ${toName} เรียบร้อยแล้ว`
              })
            }
          )
        }
      )
    }
  )
}

// ============================================
// Follow-up Log — บันทึกการติดตามลูกค้า
// ============================================
exports.addFollowup = (req, res) => {
  const { id } = req.params // conversation_id
  const user = req.user || {}
  const { followup_type = 'note', note = '' } = req.body || {}

  if (!['chat', 'call', 'note', 'line_msg', 'facebook_msg'].includes(followup_type)) {
    return res.status(400).json({ success: false, message: 'followup_type ไม่ถูกต้อง' })
  }

  // คำนวณ response_time_min — นาทีจาก last_message ของลูกค้าถึงตอนนี้
  db.query(
    `SELECT last_message_at FROM chat_conversations WHERE id = ?`,
    [id],
    (err, rows) => {
      if (err || rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบ conversation' })
      const lastMsgAt = rows[0].last_message_at
      let responseTimeMins = null
      if (lastMsgAt) {
        responseTimeMins = Math.round((Date.now() - new Date(lastMsgAt).getTime()) / 60000)
      }

      db.query(
        `INSERT INTO chat_followups (conversation_id, agent_id, agent_name, followup_type, note, response_time_min, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [id, user.id || null, user.full_name || user.username || null, followup_type, note || null, responseTimeMins],
        (err2) => {
          if (err2) {
            console.error('addFollowup error:', err2)
            return res.status(500).json({ success: false, message: 'Server Error' })
          }
          // อัพเดท follow_up_count + last_follow_up_at
          db.query(
            `UPDATE chat_conversations SET follow_up_count = follow_up_count + 1, last_follow_up_at = NOW() WHERE id = ?`,
            [id],
            () => {}
          )
          res.json({ success: true, message: 'บันทึกการติดตามเรียบร้อย' })
        }
      )
    }
  )
}

exports.getFollowups = (req, res) => {
  const { id } = req.params
  db.query(
    `SELECT id, agent_name, followup_type, note, response_time_min, created_at
     FROM chat_followups WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 50`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true, data: rows })
    }
  )
}

// ============================================
// Dead / Close Lead — ปิดเคสพร้อมเหตุผล
// ============================================
exports.markDead = (req, res) => {
  const { id } = req.params
  const { dead_reason = '' } = req.body || {}

  db.query(
    `UPDATE chat_conversations SET is_dead = 1, dead_reason = ?, dead_at = NOW(), status = 'read' WHERE id = ?`,
    [dead_reason || null, id],
    (err) => {
      if (err) {
        console.error('markDead error:', err)
        return res.status(500).json({ success: false, message: 'Server Error' })
      }
      res.json({ success: true, message: 'ปิดเคสเรียบร้อย' })
    }
  )
}

exports.markAlive = (req, res) => {
  const { id } = req.params
  db.query(
    `UPDATE chat_conversations SET is_dead = 0, dead_reason = NULL, dead_at = NULL WHERE id = ?`,
    [id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Server Error' })
      res.json({ success: true, message: 'เปิดเคสใหม่เรียบร้อย' })
    }
  )
}

// ============================================
// GET /admin-list — รายชื่อแอดมินทั้งหมดสำหรับ assign conversation
// ============================================
exports.getAdminListForAssign = (req, res) => {
  db.query(
    `SELECT id, username, full_name, nickname, department
     FROM admin_users
     WHERE status = 'active'
     ORDER BY department ASC, full_name ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      res.json({ success: true, admins: rows })
    }
  )
}

// ============================================
// QUICK REPLIES — ข้อความตอบกลับด่วน (templates)
// ============================================

// GET /quick-replies — ดึง quick reply ทั้งหมด
exports.getQuickReplies = (req, res) => {
  const user = req.user
  // ดึงทั้ง global + ของตัวเอง
  db.query(
    `SELECT * FROM chat_quick_replies
     WHERE is_global = 1 OR created_by = ?
     ORDER BY is_global DESC, sort_order ASC, id ASC`,
    [user.id || 0],
    (err, rows) => {
      if (err) {
        // ถ้าตารางยังไม่มี → ส่งค่าว่างแทน
        if (err.code === 'ER_NO_SUCH_TABLE') return res.json({ success: true, quick_replies: [] })
        return res.status(500).json({ success: false, message: err.message })
      }
      res.json({ success: true, quick_replies: rows })
    }
  )
}

// POST /quick-replies — สร้าง quick reply ใหม่
exports.createQuickReply = (req, res) => {
  const user = req.user
  const { title, content, is_global } = req.body
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'กรุณากรอก title และ content' })
  }
  // super_admin / admin สร้าง global ได้
  const canGlobal = user.department === 'super_admin' || user.department === 'admin'
  const globalFlag = (is_global && canGlobal) ? 1 : 0

  db.query(
    `SELECT MAX(sort_order) as mx FROM chat_quick_replies`,
    (err, rows) => {
      const nextSort = (rows && rows[0] && rows[0].mx) ? rows[0].mx + 1 : 1
      db.query(
        `INSERT INTO chat_quick_replies (title, content, is_global, created_by, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [title.trim(), content.trim(), globalFlag, user.id || null, nextSort],
        (err2, result) => {
          if (err2) {
            if (err2.code === 'ER_NO_SUCH_TABLE') {
              return res.status(503).json({ success: false, message: 'ต้องรัน migration ก่อน: CREATE TABLE chat_quick_replies' })
            }
            return res.status(500).json({ success: false, message: err2.message })
          }
          res.json({ success: true, message: 'สร้างสำเร็จ', id: result.insertId })
        }
      )
    }
  )
}

// PUT /quick-replies/:id — แก้ไข quick reply
exports.updateQuickReply = (req, res) => {
  const user = req.user
  const { title, content, is_global } = req.body
  const qrId = req.params.id
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'กรุณากรอก title และ content' })
  }
  const canGlobal = user.department === 'super_admin' || user.department === 'admin'
  const globalFlag = (is_global && canGlobal) ? 1 : 0

  // ตรวจสิทธิ์: owner หรือ admin เท่านั้น
  db.query(
    `SELECT created_by, is_global FROM chat_quick_replies WHERE id = ?`,
    [qrId],
    (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ success: false, message: 'ไม่พบ' })
      const qr = rows[0]
      const isOwner = qr.created_by === user.id
      const isAdminUser = canGlobal
      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แก้ไข' })
      }
      db.query(
        `UPDATE chat_quick_replies SET title = ?, content = ?, is_global = ? WHERE id = ?`,
        [title.trim(), content.trim(), globalFlag, qrId],
        (err2) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message })
          res.json({ success: true, message: 'อัพเดทสำเร็จ' })
        }
      )
    }
  )
}

// DELETE /quick-replies/:id — ลบ quick reply
exports.deleteQuickReply = (req, res) => {
  const user = req.user
  const qrId = req.params.id
  const canAdmin = user.department === 'super_admin' || user.department === 'admin'

  db.query(
    `SELECT created_by FROM chat_quick_replies WHERE id = ?`,
    [qrId],
    (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ success: false, message: 'ไม่พบ' })
      if (rows[0].created_by !== user.id && !canAdmin) {
        return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ลบ' })
      }
      db.query(`DELETE FROM chat_quick_replies WHERE id = ?`, [qrId], (err2) => {
        if (err2) return res.status(500).json({ success: false, message: err2.message })
        res.json({ success: true, message: 'ลบสำเร็จ' })
      })
    }
  )
}

// POST /quick-replies/seed-sop — ติดตั้ง SOP Reject Templates (global, ไม่ซ้ำ)
exports.seedSOPTemplates = (req, res) => {
  const user = req.user
  const canAdmin = user.department === 'super_admin' || user.department === 'admin'
  if (!canAdmin) return res.status(403).json({ success: false, message: 'เฉพาะ Admin เท่านั้น' })

  const SOP_TEMPLATES = [
    {
      title: 'SOP — ทรัพย์ไม่ผ่านเกณฑ์ (ประเมินต่ำ)',
      content: `สวัสดีครับ/ค่ะ ขอบคุณที่ให้ความสนใจบริการของเราครับ/ค่ะ\n\nหลังจากที่ทีมของเราได้ตรวจสอบข้อมูลทรัพย์สินของท่านแล้ว พบว่าทรัพย์สินมีมูลค่าประเมินที่ไม่ผ่านเกณฑ์ขั้นต่ำของเรา (ต่ำกว่าวงเงินขั้นต่ำที่รับ) จึงไม่สามารถอนุมัติสินเชื่อได้ในขณะนี้ครับ/ค่ะ\n\nหากมีทรัพย์สินอื่นหรือต้องการสอบถามเพิ่มเติม ยินดีให้บริการเสมอครับ/ค่ะ`
    },
    {
      title: 'SOP — ทรัพย์ติดภาระ / อายัด',
      content: `สวัสดีครับ/ค่ะ ขอบคุณที่ให้ความสนใจบริการของเราครับ/ค่ะ\n\nจากการตรวจสอบสถานะทางกฎหมายของทรัพย์สิน พบว่ามีภาระผูกพัน/อายัดที่ยังไม่ได้รับการแก้ไข ทำให้ไม่สามารถดำเนินการจดทะเบียนได้ในขณะนี้ครับ/ค่ะ\n\nหากท่านสามารถปลดภาระดังกล่าวได้แล้ว สามารถติดต่อกลับมาได้เลยครับ/ค่ะ ยินดีให้บริการเสมอ`
    },
    {
      title: 'SOP — เอกสารไม่ครบ / รอเพิ่มเติม',
      content: `สวัสดีครับ/ค่ะ ขอบคุณสำหรับข้อมูลที่ส่งมาครับ/ค่ะ\n\nทางเราตรวจสอบแล้วพบว่าเอกสารยังไม่ครบถ้วนสำหรับการดำเนินการ กรุณาจัดเตรียมเอกสารเพิ่มเติมดังนี้ครับ/ค่ะ:\n• สำเนาบัตรประชาชนและทะเบียนบ้าน (ทั้งผู้กู้และคู่สมรส)\n• สำเนาโฉนดที่ดิน / น.ส.4 (ครบทุกหน้า)\n• ภาพถ่ายทรัพย์สินปัจจุบัน (ด้านหน้า ด้านข้าง ภายใน)\n\nเมื่อเตรียมเอกสารครบแล้ว สามารถส่งมาได้เลยครับ/ค่ะ`
    },
    {
      title: 'SOP — ทรัพย์อยู่นอกพื้นที่รับ',
      content: `สวัสดีครับ/ค่ะ ขอบคุณที่สนใจบริการของเราครับ/ค่ะ\n\nขออภัยด้วยครับ/ค่ะ ทรัพย์สินของท่านตั้งอยู่นอกพื้นที่ที่เราให้บริการในขณะนี้ ทำให้ไม่สามารถดำเนินการได้ครับ/ค่ะ\n\nพื้นที่ที่เราให้บริการ: กรุงเทพฯ และปริมณฑล, ภาคกลาง, ภาคตะวันออก\n\nหากในอนาคตขยายพื้นที่บริการ จะแจ้งให้ทราบครับ/ค่ะ ขอบคุณที่ให้ความสนใจ`
    },
  ]

  // ดึง max sort_order ก่อน
  db.query(`SELECT MAX(sort_order) as mx FROM chat_quick_replies`, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message })

    let nextSort = (rows && rows[0] && rows[0].mx) ? rows[0].mx + 1 : 1
    let inserted = 0
    let skipped = 0
    let remaining = SOP_TEMPLATES.length

    SOP_TEMPLATES.forEach(t => {
      // ตรวจว่ามี title นี้อยู่แล้วหรือยัง (ป้องกันซ้ำ)
      db.query(`SELECT id FROM chat_quick_replies WHERE title = ? AND is_global = 1`, [t.title], (errChk, existing) => {
        if (errChk || (existing && existing.length > 0)) {
          skipped++
          remaining--
          if (remaining === 0) {
            res.json({ success: true, inserted, skipped, message: `ติดตั้งสำเร็จ: เพิ่ม ${inserted} รายการ, ข้าม ${skipped} รายการ (มีอยู่แล้ว)` })
          }
          return
        }
        db.query(
          `INSERT INTO chat_quick_replies (title, content, is_global, created_by, sort_order) VALUES (?, ?, 1, ?, ?)`,
          [t.title, t.content, user.id || null, nextSort++],
          (errIns) => {
            if (!errIns) inserted++
            remaining--
            if (remaining === 0) {
              res.json({ success: true, inserted, skipped, message: `ติดตั้งสำเร็จ: เพิ่ม ${inserted} รายการ, ข้าม ${skipped} รายการ (มีอยู่แล้ว)` })
            }
          }
        )
      })
    })
  })
}

// ── Quick update loan_request fields from chat panel ──────────────────────
exports.updateLoanRequestFromChat = (req, res) => {
  const convId = req.params.id
  const { marital_status, pipeline_stage, property_type } = req.body

  // หา loan_request_id จาก conversation
  db.query('SELECT loan_request_id FROM chat_conversations WHERE id = ?', [convId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message })
    if (!rows.length || !rows[0].loan_request_id) {
      return res.status(404).json({ success: false, message: 'ไม่พบ loan request สำหรับแชทนี้' })
    }
    const lrId = rows[0].loan_request_id
    const fields = []
    const vals = []
    if (marital_status !== undefined) { fields.push('marital_status=?'); vals.push(marital_status || null) }
    if (pipeline_stage !== undefined) { fields.push('pipeline_stage=?'); vals.push(pipeline_stage || null) }
    if (property_type !== undefined) { fields.push('property_type=?'); vals.push(property_type || null) }
    if (!fields.length) return res.json({ success: true, message: 'ไม่มีข้อมูลอัพเดท' })
    vals.push(lrId)
    db.query(`UPDATE loan_requests SET ${fields.join(',')} WHERE id = ?`, vals, (err2) => {
      if (err2) return res.status(500).json({ success: false, message: err2.message })

      // ★ ถ้าอัพเดท pipeline_stage ไปยัง stage สำคัญ → ส่ง notification อัตโนมัติ
      const NOTIFY_STAGES = ['awaiting_appraisal_fee', 'appraisal_scheduled', 'waiting_book', 'appraisal_passed']
      if (pipeline_stage && NOTIFY_STAGES.includes(pipeline_stage)) {
        try {
          const { notifyStatusChange } = require('./notificationController')
          const io = req.app.get('io')
          // ดึง case_id จาก loan_request เพื่อแนบ link ที่ถูกต้อง
          db.query('SELECT id as lr_id, (SELECT id FROM cases WHERE loan_request_id = ? LIMIT 1) as case_id FROM loan_requests WHERE id = ?', [lrId, lrId], (e3, lr3) => {
            const caseId = (lr3 && lr3[0] && lr3[0].case_id) || null
            notifyStatusChange(lrId, caseId, null, pipeline_stage, io, req.user ? req.user.id : null)
          })
        } catch(notifErr) {
          console.log('[updateLoanRequestFromChat] notify error:', notifErr.message)
        }
      }

      res.json({ success: true, message: 'อัพเดทสำเร็จ' })
    })
  })
}

// ============================================================
// ★ CUSTOMER DEDUPLICATION ENDPOINTS
// ============================================================

// ค้นหาลูกค้าที่อาจซ้ำกัน (ค้นจาก phone / name)
exports.searchCustomersForDedup = (req, res) => {
  const { q = '', exclude_conv } = req.query
  if (!q || q.length < 2) return res.json({ success: true, results: [] })
  const like = `%${q}%`
  const params = [like, like, like]
  let excludeClause = ''
  if (exclude_conv) {
    excludeClause = ' AND c.id != ?'
    params.push(parseInt(exclude_conv))
  }
  db.query(
    `SELECT c.id, c.customer_name, c.customer_phone, c.platform,
            c.profile_id, c.last_message_text,
            DATE_FORMAT(c.last_message_at, '%d/%m/%Y %H:%i') as last_msg_date,
            cp.display_name as profile_name
     FROM chat_conversations c
     LEFT JOIN customer_profiles cp ON cp.id = c.profile_id
     WHERE (c.customer_name LIKE ? OR c.customer_phone LIKE ? OR c.last_message_text LIKE ?)
       ${excludeClause}
     ORDER BY c.last_message_at DESC
     LIMIT 20`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      res.json({ success: true, results: rows })
    }
  )
}

// เชื่อม 2 conversations → profile เดียวกัน
exports.linkConversationProfiles = (req, res) => {
  const { conv_id_1, conv_id_2 } = req.body
  if (!conv_id_1 || !conv_id_2) return res.status(400).json({ success: false, message: 'ต้องระบุ conv_id_1 และ conv_id_2' })

  // ดูว่า conv ไหนมี profile_id อยู่แล้ว
  db.query(
    'SELECT id, customer_name, customer_phone, profile_id FROM chat_conversations WHERE id IN (?, ?)',
    [conv_id_1, conv_id_2],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      if (rows.length < 2) return res.status(404).json({ success: false, message: 'ไม่พบ conversation' })

      const row1 = rows.find(r => r.id == conv_id_1)
      const row2 = rows.find(r => r.id == conv_id_2)
      let profileId = row1.profile_id || row2.profile_id

      const doLink = (pid) => {
        db.query(
          'UPDATE chat_conversations SET profile_id = ? WHERE id IN (?, ?)',
          [pid, conv_id_1, conv_id_2],
          (e2) => {
            if (e2) return res.status(500).json({ success: false, message: e2.message })
            res.json({ success: true, profile_id: pid, message: 'เชื่อมโยงลูกค้าสำเร็จ' })
          }
        )
      }

      if (profileId) {
        doLink(profileId)
      } else {
        // สร้าง profile ใหม่
        const name = row1.customer_name || row2.customer_name || ''
        const phone = row1.customer_phone || row2.customer_phone || null
        db.query(
          'INSERT INTO customer_profiles (display_name, phone) VALUES (?, ?)',
          [name, phone],
          (e2, result) => {
            if (e2) return res.status(500).json({ success: false, message: e2.message })
            doLink(result.insertId)
          }
        )
      }
    }
  )
}

// ดู conversations อื่นๆ ที่เป็นลูกค้าเดียวกัน (same profile_id)
exports.getLinkedConversations = (req, res) => {
  const convId = req.params.id
  db.query('SELECT profile_id FROM chat_conversations WHERE id = ?', [convId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message })
    const profileId = rows[0] && rows[0].profile_id
    if (!profileId) return res.json({ success: true, linked: [] })

    db.query(
      `SELECT c.id, c.customer_name, c.platform, c.last_message_text,
              DATE_FORMAT(c.last_message_at, '%d/%m/%Y %H:%i') as last_msg_date,
              c.status, c.is_dead
       FROM chat_conversations c
       WHERE c.profile_id = ? AND c.id != ?
       ORDER BY c.last_message_at DESC LIMIT 10`,
      [profileId, convId],
      (e2, linked) => {
        if (e2) return res.status(500).json({ success: false, message: e2.message })
        res.json({ success: true, profile_id: profileId, linked })
      }
    )
  })
}

// ยกเลิกการเชื่อม profile ของ conversation นี้
exports.unlinkConversationProfile = (req, res) => {
  const convId = req.params.id
  db.query('UPDATE chat_conversations SET profile_id = NULL WHERE id = ?', [convId], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message })
    res.json({ success: true, message: 'ยกเลิกการเชื่อมโยงแล้ว' })
  })
}

// ============================================================
// ★ FEATURE 1: Round-Robin Management
// ============================================================

// GET /chat/rr-status — แสดงรายชื่อเซลล์ + สถานะ rr_active
exports.getRRStatus = (req, res) => {
  db.query(
    "SELECT id, username, full_name, nickname, rr_active FROM admin_users WHERE department = 'sales' AND status = 'active' ORDER BY id ASC",
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, sales: rows });
    }
  );
};

// PUT /chat/rr-toggle/:userId — toggle rr_active สำหรับ sales คนนั้น
exports.toggleRRActive = (req, res) => {
  const { userId } = req.params;
  const { rr_active } = req.body; // 0 หรือ 1
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });
  }
  db.query(
    'UPDATE admin_users SET rr_active = ? WHERE id = ?',
    [rr_active ? 1 : 0, userId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: rr_active ? 'เปิด Round-Robin แล้ว' : 'ปิด Round-Robin แล้ว' });
    }
  );
};

// ============================================================
// ★ FEATURE 3: Broker Contract Tracking
// ============================================================

// POST /conversations/:id/broker-contract/send
exports.brokerContractSend = (req, res) => {
  const convId = req.params.id;
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'กรุณาระบุ Email' });

  db.query(
    'SELECT loan_request_id FROM chat_conversations WHERE id = ?',
    [convId],
    (err, rows) => {
      if (err || rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบ conversation' });
      const lrId = rows[0].loan_request_id;
      if (!lrId) return res.status(400).json({ success: false, message: 'ยังไม่มี loan request กรุณาสร้างเคสก่อน' });

      db.query(
        'UPDATE loan_requests SET broker_contract_sent_at = NOW(), broker_contract_email = ? WHERE id = ?',
        [email, lrId],
        (err2) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });
          res.json({ success: true, message: 'บันทึกการส่งสัญญาแล้ว', sent_at: new Date() });
        }
      );
    }
  );
};

// POST /conversations/:id/broker-contract/sign
exports.brokerContractSign = (req, res) => {
  const convId = req.params.id;
  db.query(
    'SELECT loan_request_id FROM chat_conversations WHERE id = ?',
    [convId],
    (err, rows) => {
      if (err || rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบ conversation' });
      const lrId = rows[0].loan_request_id;
      if (!lrId) return res.status(400).json({ success: false, message: 'ยังไม่มี loan request' });

      db.query(
        'UPDATE loan_requests SET broker_contract_signed_at = NOW() WHERE id = ?',
        [lrId],
        (err2) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });
          res.json({ success: true, message: 'บันทึกการเซ็นสัญญาแล้ว', signed_at: new Date() });
        }
      );
    }
  );
};

// ============================================================
// ★ FEATURE 4 + 2: Property Extra Fields + LTV (updateLRExtended)
// ============================================================

// PUT /conversations/:id/lr-extended — update extra property fields + estimated_value
exports.updateLRExtended = (req, res) => {
  const convId = req.params.id;
  const {
    google_maps_url, bathrooms, floors, rental_rooms, rental_price_per_month,
    building_permit_url, building_year, estimated_value,
    // LTV quick-set from chat panel (also stored on conv for pre-LR)
    estimated_value_chat
  } = req.body;

  // Update chat_conversations.estimated_value_chat if provided
  if (estimated_value_chat !== undefined) {
    db.query('UPDATE chat_conversations SET estimated_value_chat = ? WHERE id = ?', [estimated_value_chat || null, convId], () => {});
  }

  // Update loan_requests if linked
  db.query('SELECT loan_request_id FROM chat_conversations WHERE id = ?', [convId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    const lrId = rows[0]?.loan_request_id;
    if (!lrId) return res.json({ success: true, message: 'บันทึก estimated_value_chat แล้ว (ยังไม่มี LR)' });

    const fields = [];
    const params = [];
    const addField = (col, val) => { if (val !== undefined) { fields.push(`${col} = ?`); params.push(val === '' ? null : val); } };
    addField('google_maps_url', google_maps_url);
    addField('bathrooms', bathrooms);
    addField('floors', floors);
    addField('rental_rooms', rental_rooms);
    addField('rental_price_per_month', rental_price_per_month);
    addField('building_permit_url', building_permit_url);
    addField('building_year', building_year);
    addField('estimated_value', estimated_value);

    if (fields.length === 0) return res.json({ success: true, message: 'ไม่มีข้อมูลที่ต้องอัพเดท' });
    params.push(lrId);
    db.query(`UPDATE loan_requests SET ${fields.join(', ')} WHERE id = ?`, params, (err2) => {
      if (err2) return res.status(500).json({ success: false, message: err2.message });
      res.json({ success: true, message: 'บันทึกข้อมูลทรัพย์แล้ว' });
    });
  });
};

// ============================================================
// ★ FEATURE 5: Ghost Chat / Lead Quality
// ============================================================

// PUT /conversations/:id/lead-quality — ตั้ง lead_quality manually
exports.setLeadQuality = (req, res) => {
  const convId = req.params.id;
  const { lead_quality } = req.body;
  const valid = ['unknown', 'ghost', 'unqualified', 'qualified', 'hot'];
  if (!valid.includes(lead_quality)) return res.status(400).json({ success: false, message: 'lead_quality ไม่ถูกต้อง' });

  const ghostAt = lead_quality === 'ghost' ? ', ghost_detected_at = NOW()' : '';
  db.query(
    `UPDATE chat_conversations SET lead_quality = ?${ghostAt} WHERE id = ?`,
    [lead_quality, convId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'อัพเดท lead quality แล้ว' });
    }
  );
};

// GET /chat/analytics/lead-quality — สรุปสถิติ lead quality + ghost
exports.getLeadQualityAnalytics = (req, res) => {
  // Auto-detect ghosts: customer ไม่ตอบมา 72 ชม. + ยังไม่ dead
  db.query(
    `UPDATE chat_conversations SET lead_quality = 'ghost', ghost_detected_at = NOW()
     WHERE lead_quality = 'unknown'
       AND is_dead = 0
       AND last_message_at < DATE_SUB(NOW(), INTERVAL 72 HOUR)
       AND status != 'unread'`,
    () => {}
  );

  // สรุปจำนวนแต่ละ quality
  db.query(
    `SELECT lead_quality, COUNT(*) as count FROM chat_conversations GROUP BY lead_quality`,
    (err, qualityRows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      // Ghost ที่เพิ่งเข้ามา (7 วัน)
      db.query(
        `SELECT COUNT(*) as recent_ghost FROM chat_conversations
         WHERE lead_quality = 'ghost' AND ghost_detected_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        (err2, ghostRows) => {
          // สรุปตาม utm_campaign
          db.query(
            `SELECT utm_campaign, utm_source, COUNT(*) as total,
                    SUM(CASE WHEN lead_quality = 'qualified' OR lead_quality = 'hot' THEN 1 ELSE 0 END) as qualified,
                    SUM(CASE WHEN lead_quality = 'ghost' THEN 1 ELSE 0 END) as ghost
             FROM chat_conversations
             WHERE utm_campaign IS NOT NULL
             GROUP BY utm_campaign, utm_source
             ORDER BY total DESC LIMIT 20`,
            (err3, campaignRows) => {
              res.json({
                success: true,
                quality_summary: qualityRows,
                recent_ghost_7d: ghostRows ? ghostRows[0]?.recent_ghost : 0,
                campaign_stats: campaignRows || []
              });
            }
          );
        }
      );
    }
  );
};

// ============================================================
// ★ FEATURE 6: Ad Source update (manual override)
// ============================================================

// PUT /conversations/:id/ad-source
exports.updateAdSource = (req, res) => {
  const convId = req.params.id;
  const { utm_source, utm_medium, utm_campaign, utm_ad_set, utm_ad } = req.body;
  db.query(
    `UPDATE chat_conversations SET
       utm_source = COALESCE(?, utm_source),
       utm_medium = COALESCE(?, utm_medium),
       utm_campaign = COALESCE(?, utm_campaign),
       utm_ad_set = COALESCE(?, utm_ad_set),
       utm_ad = COALESCE(?, utm_ad)
     WHERE id = ?`,
    [utm_source || null, utm_medium || null, utm_campaign || null, utm_ad_set || null, utm_ad || null, convId],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: 'บันทึก ad source แล้ว' });
    }
  );
};

// =====================================================
// ★ FEATURE: Sentiment Analysis
// =====================================================

// PUT /conversations/:id/sentiment
exports.setSentiment = (req, res) => {
  const { sentiment } = req.body; // 'positive' | 'neutral' | 'negative' | null
  const allowed = ['positive', 'neutral', 'negative', null];
  if (!allowed.includes(sentiment)) return res.status(400).json({ success: false, message: 'sentiment ไม่ถูกต้อง' });
  db.query(
    'UPDATE chat_conversations SET sentiment = ? WHERE id = ?',
    [sentiment, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true });
    }
  );
};

// =====================================================
// ★ FEATURE: Chat Dashboard
// =====================================================

// GET /dashboard/chat-stats?days=7
exports.getChatDashboard = (req, res) => {
  const days = parseInt(req.query.days) || 7;

  const queries = {
    // ยอดแชทรายวัน
    daily: `
      SELECT DATE(created_at) as date, COUNT(*) as total,
        SUM(CASE WHEN platform = 'facebook' THEN 1 ELSE 0 END) as facebook,
        SUM(CASE WHEN platform = 'line' THEN 1 ELSE 0 END) as line
      FROM chat_conversations
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND (is_dead = 0 OR is_dead IS NULL)
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,

    // สรุปรวม
    summary: `
      SELECT
        COUNT(*) as total_chats,
        SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
        SUM(CASE WHEN lead_quality = 'hot' THEN 1 ELSE 0 END) as hot_leads,
        SUM(CASE WHEN lead_quality = 'ghost' THEN 1 ELSE 0 END) as ghost_leads,
        SUM(CASE WHEN lead_quality = 'qualified' THEN 1 ELSE 0 END) as qualified,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_sentiment,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_sentiment,
        AVG(CASE WHEN first_response_seconds IS NOT NULL THEN first_response_seconds END) as avg_first_response_sec,
        MIN(CASE WHEN first_response_seconds IS NOT NULL THEN first_response_seconds END) as min_first_response_sec,
        MAX(CASE WHEN first_response_seconds IS NOT NULL THEN first_response_seconds END) as max_first_response_sec
      FROM chat_conversations
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND (is_dead = 0 OR is_dead IS NULL)`,

    // แยกตาม agent
    byAgent: `
      SELECT
        au.id, au.full_name, au.nickname, au.username,
        COUNT(c.id) as total_assigned,
        SUM(CASE WHEN c.status = 'unread' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN c.status = 'replied' THEN 1 ELSE 0 END) as replied,
        AVG(CASE WHEN c.first_response_seconds IS NOT NULL THEN c.first_response_seconds END) as avg_response_sec
      FROM admin_users au
      LEFT JOIN chat_conversations c ON c.assigned_to = au.id
        AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND (c.is_dead = 0 OR c.is_dead IS NULL)
      WHERE au.department = 'sales' AND au.status = 'active'
      GROUP BY au.id
      ORDER BY total_assigned DESC`,

    // แยกตาม platform
    byPlatform: `
      SELECT platform,
        COUNT(*) as total,
        AVG(CASE WHEN first_response_seconds IS NOT NULL THEN first_response_seconds END) as avg_response_sec
      FROM chat_conversations
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND (is_dead = 0 OR is_dead IS NULL)
      GROUP BY platform`,

    // SLA breakdown (กี่คนตอบภายใน 5/15/30/60 นาที)
    sla: `
      SELECT
        SUM(CASE WHEN first_response_seconds <= 300 THEN 1 ELSE 0 END) as within_5min,
        SUM(CASE WHEN first_response_seconds <= 900 THEN 1 ELSE 0 END) as within_15min,
        SUM(CASE WHEN first_response_seconds <= 1800 THEN 1 ELSE 0 END) as within_30min,
        SUM(CASE WHEN first_response_seconds <= 3600 THEN 1 ELSE 0 END) as within_1hr,
        SUM(CASE WHEN first_response_seconds > 3600 THEN 1 ELSE 0 END) as over_1hr,
        COUNT(CASE WHEN first_response_seconds IS NOT NULL THEN 1 END) as total_responded,
        COUNT(CASE WHEN first_response_seconds IS NULL AND status != 'unread' THEN 1 END) as no_response_data
      FROM chat_conversations
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND (is_dead = 0 OR is_dead IS NULL)`,

    // Lead quality breakdown
    leadQuality: `
      SELECT lead_quality, COUNT(*) as count
      FROM chat_conversations
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND (is_dead = 0 OR is_dead IS NULL)
      GROUP BY lead_quality`
  };

  const results = {};
  let pending = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, sql]) => {
    db.query(sql, [days], (err, rows) => {
      if (err) results[key] = [];
      else results[key] = rows;
      pending--;
      if (pending === 0) res.json({ success: true, days, ...results });
    });
  });
};

// ============================================================
// SLA BREACH ALERT
// ============================================================

/**
 * GET /api/admin/chat/sla-alerts
 * คืนรายชื่อ conversations ที่ลูกค้ารอนานเกิน SLA threshold โดยยังไม่มีคนตอบ
 * Default threshold: 5 นาที (300 วินาที)
 */
exports.getSlaAlerts = (req, res) => {
  const thresholdMin = parseInt(req.query.threshold_min) || 5;
  const sql = `
    SELECT
      c.id,
      c.customer_name,
      c.customer_phone,
      c.platform,
      c.customer_avatar,
      c.assigned_to,
      c.last_message_at,
      TIMESTAMPDIFF(MINUTE, c.last_message_at, NOW()) AS waiting_minutes,
      c.loan_request_id,
      c.debtor_code,
      au.full_name AS assigned_to_name
    FROM chat_conversations c
    LEFT JOIN admin_users au ON au.id = c.assigned_to
    WHERE c.status = 'unread'
      AND (c.is_dead = 0 OR c.is_dead IS NULL)
      AND c.last_message_at IS NOT NULL
      AND TIMESTAMPDIFF(MINUTE, c.last_message_at, NOW()) >= ?
    ORDER BY c.last_message_at ASC
  `;
  db.query(sql, [thresholdMin], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, alerts: rows, threshold_min: thresholdMin, count: rows.length });
  });
};

/**
 * ฟังก์ชันสำหรับ index.js ใช้ broadcast SLA alerts ทุก 1 นาที
 * export เพื่อให้ index.js เรียก startSlaMonitor(io)
 */
exports.startSlaMonitor = (io) => {
  const THRESHOLD_MIN = 5;
  const CHECK_INTERVAL_MS = 60 * 1000; // ทุก 1 นาที

  const checkAndBroadcast = () => {
    const sql = `
      SELECT
        c.id,
        c.customer_name,
        c.customer_phone,
        c.platform,
        c.customer_avatar,
        c.assigned_to,
        c.last_message_at,
        TIMESTAMPDIFF(MINUTE, c.last_message_at, NOW()) AS waiting_minutes,
        au.full_name AS assigned_to_name
      FROM chat_conversations c
      LEFT JOIN admin_users au ON au.id = c.assigned_to
      WHERE c.status = 'unread'
        AND (c.is_dead = 0 OR c.is_dead IS NULL)
        AND c.last_message_at IS NOT NULL
        AND TIMESTAMPDIFF(MINUTE, c.last_message_at, NOW()) >= ?
      ORDER BY c.last_message_at ASC
    `;
    db.query(sql, [THRESHOLD_MIN], (err, rows) => {
      if (err) return console.error('[SLA Monitor] DB error:', err.message);
      if (rows.length > 0) {
        io.emit('sla_breach', {
          count: rows.length,
          threshold_min: THRESHOLD_MIN,
          alerts: rows
        });
        console.log(`[SLA Monitor] ⚠️ ${rows.length} การสนทนารอเกิน ${THRESHOLD_MIN} นาที`);
      }
    });
  };

  // รันทันทีตอนเริ่ม แล้วค่อย repeat ทุก 1 นาที
  setTimeout(checkAndBroadcast, 5000); // รอ 5 วิ ให้ DB พร้อมก่อน
  setInterval(checkAndBroadcast, CHECK_INTERVAL_MS);
  console.log(`[SLA Monitor] ✅ เริ่มตรวจ SLA ทุก ${CHECK_INTERVAL_MS / 1000} วินาที (threshold ${THRESHOLD_MIN} นาที)`);
};

// ============================================
// FOLLOW-UP REMINDER — ตั้งวันนัดติดตาม
// ============================================

// PUT /conversations/:id/followup-schedule — ตั้ง next_follow_up_at + note
exports.setFollowupSchedule = (req, res) => {
  const { id } = req.params
  const { next_follow_up_at, note } = req.body || {}
  if (!next_follow_up_at) return res.status(400).json({ success: false, message: 'ต้องระบุวันนัด' })

  // ลอง SET ทั้ง 3 คอลัมน์ก่อน — ถ้าคอลัมน์ไม่มี (Unknown column) ให้ fallback อัพเดทเฉพาะที่มี
  db.query(
    `UPDATE chat_conversations
     SET next_follow_up_at = ?, followup_note = ?, followup_reminded_at = NULL
     WHERE id = ?`,
    [next_follow_up_at, note || null, id],
    (err) => {
      if (err && err.message && err.message.includes('Unknown column')) {
        // Migration ยังไม่รัน — ลอง ALTER แล้ว retry
        const addCols = `ALTER TABLE chat_conversations
          ADD COLUMN IF NOT EXISTS next_follow_up_at    DATETIME NULL DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS followup_note        TEXT NULL DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS followup_reminded_at DATETIME NULL DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS is_blacklisted       TINYINT(1) NOT NULL DEFAULT 0`
        db.query(addCols, () => {
          db.query(
            `UPDATE chat_conversations SET next_follow_up_at = ?, followup_note = ?, followup_reminded_at = NULL WHERE id = ?`,
            [next_follow_up_at, note || null, id],
            (err2) => {
              if (err2) return res.status(500).json({ success: false, message: err2.message })
              res.json({ success: true, message: 'ตั้งวันนัด follow-up เรียบร้อย (auto-migrated)' })
            }
          )
        })
        return
      }
      if (err) return res.status(500).json({ success: false, message: err.message })
      res.json({ success: true, message: 'ตั้งวันนัด follow-up เรียบร้อย' })
    }
  )
}

// DELETE /conversations/:id/followup-schedule — ล้างวันนัด
exports.clearFollowupSchedule = (req, res) => {
  const { id } = req.params
  db.query(
    `UPDATE chat_conversations SET next_follow_up_at = NULL, followup_note = NULL, followup_reminded_at = NULL WHERE id = ?`,
    [id],
    (err) => {
      if (err && err.message && err.message.includes('Unknown column')) {
        return res.json({ success: true }) // column ยังไม่มีก็ไม่มีข้อมูลต้องล้าง
      }
      if (err) return res.status(500).json({ success: false, message: err.message })
      res.json({ success: true })
    }
  )
}

// GET /conversations/followup-due — รายการ follow-up ที่ถึงกำหนดหรือ overdue (สำหรับ header badge)
exports.getFollowupDue = (req, res) => {
  const user = req.user || {}
  const OVERDUE_DAYS = parseInt(req.query.overdue_days) || 2

  // ถ้าเป็น manager/admin → เห็นทุก overdue; ถ้าเป็น sales → เห็นเฉพาะของตัวเอง
  const isManager = ['admin', 'manager', 'superadmin'].includes(user.department)
  const assignWhere = isManager ? '' : 'AND (c.assigned_to = ? OR c.assigned_to IS NULL)'
  const assignParams = isManager ? [] : [user.id]

  db.query(
    `SELECT c.id, c.customer_name, c.customer_phone, c.platform, c.customer_avatar,
            c.next_follow_up_at, c.followup_note,
            c.assigned_to, au.full_name AS assigned_to_name,
            TIMESTAMPDIFF(MINUTE, c.next_follow_up_at, NOW()) AS overdue_minutes
     FROM chat_conversations c
     LEFT JOIN admin_users au ON au.id = c.assigned_to
     WHERE c.next_follow_up_at IS NOT NULL
       AND c.next_follow_up_at <= NOW()
       AND (c.is_dead = 0 OR c.is_dead IS NULL)
       ${assignWhere}
     ORDER BY c.next_follow_up_at ASC
     LIMIT 100`,
    assignParams,
    (err, rows) => {
      if (err) {
        // column ยังไม่มี → return empty (migration ยังไม่รัน)
        if (err.message && err.message.includes('Unknown column')) {
          return res.json({ success: true, due: [], critical: [], normal: [], total: 0 })
        }
        return res.status(500).json({ success: false, message: err.message })
      }

      // แบ่งเป็น due_today กับ overdue
      const now = Date.now()
      const overdueMs = OVERDUE_DAYS * 24 * 60 * 60 * 1000
      const critical = rows.filter(r => new Date(r.next_follow_up_at).getTime() < now - overdueMs)
      const normal   = rows.filter(r => new Date(r.next_follow_up_at).getTime() >= now - overdueMs)

      res.json({ success: true, due: rows, critical, normal, total: rows.length })
    }
  )
}

// GET /conversations/followup-upcoming — นัดวันนี้ + พรุ่งนี้ (เตือนล่วงหน้า)
exports.getFollowupUpcoming = (req, res) => {
  const user = req.user || {}
  const days = parseInt(req.query.days) || 1
  const isManager = ['admin', 'manager', 'superadmin'].includes(user.department)
  const assignWhere = isManager ? '' : 'AND c.assigned_to = ?'
  const assignParams = isManager ? [days] : [days, user.id]

  db.query(
    `SELECT c.id, c.customer_name, c.customer_phone, c.platform, c.customer_avatar,
            c.next_follow_up_at, c.followup_note, c.assigned_to,
            au.full_name AS assigned_to_name
     FROM chat_conversations c
     LEFT JOIN admin_users au ON au.id = c.assigned_to
     WHERE c.next_follow_up_at IS NOT NULL
       AND c.next_follow_up_at > NOW()
       AND c.next_follow_up_at <= DATE_ADD(NOW(), INTERVAL ? DAY)
       AND (c.is_dead = 0 OR c.is_dead IS NULL)
       ${assignWhere}
     ORDER BY c.next_follow_up_at ASC
     LIMIT 50`,
    assignParams,
    (err, rows) => {
      if (err) {
        if (err.message && err.message.includes('Unknown column')) {
          return res.json({ success: true, data: [] })
        }
        return res.status(500).json({ success: false, message: err.message })
      }
      res.json({ success: true, data: rows })
    }
  )
}

// ============================================
// FOLLOW-UP REMINDER — Background Job
// ============================================
exports.startFollowupReminder = (io) => {
  const CHECK_INTERVAL_MS = 5 * 60 * 1000 // ตรวจทุก 5 นาที
  const OVERDUE_ALERT_DAYS = 2             // เกิน 2 วัน → แจ้งหัวหน้า

  const check = () => {
    // 1. follow-up ที่ถึงกำหนดแล้ว (ยังไม่ได้ส่ง reminder ใน 30 นาทีที่ผ่านมา)
    db.query(
      `SELECT c.id, c.customer_name, c.customer_phone, c.platform,
              c.next_follow_up_at, c.followup_note,
              c.assigned_to, au.full_name AS assigned_to_name
       FROM chat_conversations c
       LEFT JOIN admin_users au ON au.id = c.assigned_to
       WHERE c.next_follow_up_at IS NOT NULL
         AND c.next_follow_up_at <= NOW()
         AND (c.followup_reminded_at IS NULL OR c.followup_reminded_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE))
         AND (c.is_dead = 0 OR c.is_dead IS NULL)
       LIMIT 50`,
      [],
      (err, rows) => {
        if (err) return console.error('[FollowupReminder] DB error:', err.message)
        if (!rows.length) return

        const ids = rows.map(r => r.id)
        // อัพเดท followup_reminded_at ป้องกัน spam
        db.query(
          `UPDATE chat_conversations SET followup_reminded_at = NOW() WHERE id IN (?)`,
          [ids],
          () => {}
        )

        // แยก normal vs overdue (เกิน OVERDUE_ALERT_DAYS วัน)
        const overdueMs = OVERDUE_ALERT_DAYS * 24 * 60 * 60 * 1000
        const now = Date.now()
        const critical = rows.filter(r => now - new Date(r.next_follow_up_at).getTime() > overdueMs)
        const normal   = rows.filter(r => now - new Date(r.next_follow_up_at).getTime() <= overdueMs)

        if (normal.length > 0) {
          // emit เฉพาะเจ้าของ conversation (ถ้า assigned_to set ไว้)
          normal.forEach(r => {
            io.emit('followup_reminder', {
              type: 'due',
              conversation: r,
              message: `⏰ ถึงเวลา follow-up ลูกค้า "${r.customer_name || r.customer_phone}" แล้ว!`
            })
          })
          console.log(`[FollowupReminder] ⏰ ${normal.length} follow-up ถึงกำหนด`)
        }

        if (critical.length > 0) {
          // emit แยกสำหรับหัวหน้า
          io.emit('followup_overdue', {
            type: 'overdue',
            items: critical,
            message: `🚨 มี ${critical.length} follow-up เลยกำหนดเกิน ${OVERDUE_ALERT_DAYS} วัน!`
          })
          console.log(`[FollowupReminder] 🚨 ${critical.length} overdue เกิน ${OVERDUE_ALERT_DAYS} วัน`)
        }
      }
    )
  }

  setTimeout(check, 8000)
  setInterval(check, CHECK_INTERVAL_MS)
  console.log(`[FollowupReminder] ✅ เริ่มตรวจ follow-up ทุก ${CHECK_INTERVAL_MS / 60000} นาที`)
}

// ============================================
// BLACKLIST — ระบบ blacklist ลูกค้า
// ============================================

// GET /blacklist — รายการ blacklist ทั้งหมด
exports.getBlacklist = (req, res) => {
  const search = req.query.search || ''
  const where = search ? 'WHERE phone LIKE ? OR reason LIKE ?' : 'WHERE is_active = 1'
  const params = search ? [`%${search}%`, `%${search}%`] : []
  db.query(
    `SELECT id, phone, reason, added_by_name, created_at, is_active
     FROM customer_blacklists ${where}
     ORDER BY created_at DESC LIMIT 200`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      res.json({ success: true, data: rows })
    }
  )
}

// POST /blacklist — เพิ่มเข้า blacklist
exports.addBlacklist = (req, res) => {
  const { phone, reason } = req.body || {}
  const user = req.user || {}
  if (!phone) return res.status(400).json({ success: false, message: 'ต้องระบุเบอร์โทร' })

  const cleanPhone = phone.replace(/\D/g, '').trim()
  db.query(
    `INSERT INTO customer_blacklists (phone, reason, added_by, added_by_name)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       reason = VALUES(reason), is_active = 1,
       added_by = VALUES(added_by), added_by_name = VALUES(added_by_name)`,
    [cleanPhone, reason || null, user.id || null, user.full_name || user.username || null],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      // อัพเดท flag ใน chat_conversations ที่มีเบอร์นี้
      db.query(
        `UPDATE chat_conversations SET is_blacklisted = 1 WHERE customer_phone = ?`,
        [cleanPhone], () => {}
      )
      res.json({ success: true, message: `เพิ่ม ${cleanPhone} เข้า blacklist แล้ว` })
    }
  )
}

// DELETE /blacklist/:phone — ยกเลิก blacklist
exports.removeBlacklist = (req, res) => {
  const { phone } = req.params
  const cleanPhone = phone.replace(/\D/g, '').trim()
  db.query(
    `UPDATE customer_blacklists SET is_active = 0 WHERE phone = ?`,
    [cleanPhone],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      db.query(
        `UPDATE chat_conversations SET is_blacklisted = 0 WHERE customer_phone = ?`,
        [cleanPhone], () => {}
      )
      res.json({ success: true, message: `ยกเลิก blacklist ${cleanPhone} แล้ว` })
    }
  )
}

// GET /blacklist/check/:phone — ตรวจว่าเบอร์นี้อยู่ใน blacklist ไหม
exports.checkBlacklist = (req, res) => {
  const cleanPhone = (req.params.phone || '').replace(/\D/g, '').trim()
  db.query(
    `SELECT id, phone, reason, added_by_name, created_at
     FROM customer_blacklists WHERE phone = ? AND is_active = 1`,
    [cleanPhone],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message })
      res.json({ success: true, blacklisted: rows.length > 0, data: rows[0] || null })
    }
  )
}

// ============================================================
// GET /chat/analytics/quality-monitor
// แสดงเวลาตอบแชทของแต่ละเซลล์ + แชทที่รอนานเกินไป
// ============================================================
exports.getQualityMonitor = (req, res) => {
  const user = req.user;
  const isManager = ['manager', 'admin', 'ceo', 'super_admin'].includes(user?.role);

  // 1) แชทที่ลูกค้ารอนาน > 30 นาที ยังไม่มีใครตอบ
  const slowChatsSQL = `
    SELECT
      c.id, c.customer_name, c.customer_phone, c.platform,
      c.status, c.lead_quality,
      TIMESTAMPDIFF(MINUTE,
        (SELECT MAX(cm.created_at) FROM chat_messages cm WHERE cm.conversation_id = c.id AND cm.sender_type = 'customer'),
        NOW()
      ) AS waiting_min,
      au.full_name AS assigned_name,
      lr.debtor_code
    FROM chat_conversations c
    LEFT JOIN admin_users au ON au.id = c.assigned_to
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    WHERE c.is_dead = 0
      AND c.status != 'closed'
      AND EXISTS (
        SELECT 1 FROM chat_messages cm
        WHERE cm.conversation_id = c.id AND cm.sender_type = 'customer'
      )
      AND (
        SELECT MAX(cm2.created_at) FROM chat_messages cm2
        WHERE cm2.conversation_id = c.id AND cm2.sender_type IN ('admin','bot')
      ) < (
        SELECT MAX(cm3.created_at) FROM chat_messages cm3
        WHERE cm3.conversation_id = c.id AND cm3.sender_type = 'customer'
      )
      AND TIMESTAMPDIFF(MINUTE,
        (SELECT MAX(cm4.created_at) FROM chat_messages cm4 WHERE cm4.conversation_id = c.id AND cm4.sender_type = 'customer'),
        NOW()
      ) >= 30
    ORDER BY waiting_min DESC
    LIMIT 50
  `;

  // 2) สถิติรายเซลล์: avg first_response_seconds, จำนวนแชท
  const salesStatsSQL = `
    SELECT
      au.id AS sales_id,
      au.full_name AS sales_name,
      COUNT(c.id) AS total_chats,
      ROUND(AVG(CASE WHEN c.first_response_seconds IS NOT NULL THEN c.first_response_seconds END)) AS avg_response_sec,
      MIN(c.first_response_seconds) AS min_response_sec,
      MAX(c.first_response_seconds) AS max_response_sec,
      SUM(CASE WHEN c.first_response_seconds > 1800 THEN 1 ELSE 0 END) AS slow_count,
      SUM(CASE WHEN c.first_response_seconds IS NULL AND c.status != 'closed' THEN 1 ELSE 0 END) AS no_response_count
    FROM admin_users au
    LEFT JOIN chat_conversations c ON c.assigned_to = au.id AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    WHERE au.department = 'sales' AND au.status = 'active'
    ${!isManager ? 'AND au.id = ?' : ''}
    GROUP BY au.id, au.full_name
    ORDER BY avg_response_sec ASC
  `;

  // 3) แชทที่ไม่มีการตอบสนองเลย (no_response) > 1 ชม. ในวันนี้
  const noResponseSQL = `
    SELECT
      c.id, c.customer_name, c.platform, c.created_at,
      TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) AS age_min,
      au.full_name AS assigned_name,
      lr.debtor_code
    FROM chat_conversations c
    LEFT JOIN admin_users au ON au.id = c.assigned_to
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    WHERE c.first_response_at IS NULL
      AND c.is_dead = 0
      AND c.status != 'closed'
      AND c.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      AND TIMESTAMPDIFF(MINUTE, c.created_at, NOW()) >= 60
    ORDER BY c.created_at ASC
    LIMIT 30
  `;

  const salesParams = !isManager ? [user.id] : [];

  db.query(slowChatsSQL, [], (err1, slowChats) => {
    if (err1) return res.status(500).json({ success: false, message: err1.message });

    db.query(salesStatsSQL, salesParams, (err2, salesStats) => {
      if (err2) return res.status(500).json({ success: false, message: err2.message });

      db.query(noResponseSQL, [], (err3, noResponse) => {
        if (err3) return res.status(500).json({ success: false, message: err3.message });

        res.json({
          success: true,
          slow_chats: slowChats,
          sales_stats: salesStats,
          no_response: noResponse
        });
      });
    });
  });
};

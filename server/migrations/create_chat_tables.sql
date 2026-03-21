-- =========================================================
--  LoanDD Migration: Chat System Base Tables
--  วิธีรัน: phpMyAdmin → เลือก DB loandd → แท็บ SQL → วาง → Execute
--  ปลอดภัย: ใช้ IF NOT EXISTS ทุกที่ รันซ้ำได้
-- =========================================================

-- ─────────────────────────────────────────────
-- 1) chat_platforms — ตั้งค่า Line OA / Facebook Page
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_platforms (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  platform_name   ENUM('line','facebook') NOT NULL DEFAULT 'line',
  platform_id     VARCHAR(200) NOT NULL COMMENT 'LINE Channel ID / Facebook Page ID',
  access_token    TEXT NOT NULL COMMENT 'LINE Channel Access Token / FB Page Token',
  channel_secret  VARCHAR(200) NULL COMMENT 'LINE Channel Secret (สำหรับ verify webhook)',
  page_name       VARCHAR(200) NULL COMMENT 'ชื่อ Page / OA',
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_platform (platform_name, platform_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 2) chat_conversations — Conversation inbox (1 row = 1 ลูกค้า)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversations (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  platform                ENUM('line','facebook') NOT NULL DEFAULT 'line',
  customer_platform_id    VARCHAR(200) NOT NULL COMMENT 'LINE userId / Facebook PSID',
  customer_name           VARCHAR(200) NULL,
  customer_phone          VARCHAR(20) NULL,
  customer_email          VARCHAR(200) NULL,
  customer_avatar         VARCHAR(500) NULL,
  occupation              VARCHAR(255) NULL,
  monthly_income          DECIMAL(15,2) NULL,
  desired_amount          DECIMAL(15,2) NULL,
  has_obligation          ENUM('yes','no') NULL,
  obligation_amount       DECIMAL(15,2) NULL,
  contract_years          INT NULL,

  -- ข้อมูลทรัพย์ (Auto-capture จาก keyword)
  property_type           VARCHAR(100) NULL,
  property_project        VARCHAR(200) NULL,
  deed_type               VARCHAR(50) NULL COMMENT 'chanote, ns4k, ns3, ns3k, spk',
  deed_number             VARCHAR(100) NULL,
  estimated_value         DECIMAL(15,2) NULL,
  location_hint           TEXT NULL,
  bedrooms                TINYINT NULL,
  loan_type_detail        VARCHAR(50) NULL COMMENT 'selling_pledge, mortgage',
  is_refinance            TINYINT(1) DEFAULT 0,
  intent_type             VARCHAR(50) NULL,

  -- SOP screening
  ineligible_property     TINYINT(1) DEFAULT 0,
  ineligible_reason       VARCHAR(500) NULL,

  -- สถานะแชท
  status                  ENUM('unread','read','replied') NOT NULL DEFAULT 'unread',
  last_message_text       TEXT NULL,
  last_message_at         DATETIME NULL,
  last_replied_by_id      INT NULL,
  last_replied_by_name    VARCHAR(100) NULL,

  -- Dead / Close lead
  is_dead                 TINYINT(1) NOT NULL DEFAULT 0,
  dead_reason             VARCHAR(300) NULL COMMENT 'เหตุผลที่ไม่ผ่าน / Dead Lead',
  dead_at                 DATETIME NULL,

  -- ลิงก์กับระบบ
  loan_request_id         INT NULL,
  assigned_to             INT NULL COMMENT 'admin_users.id (เซลล์ที่รับผิดชอบ)',

  -- นายหน้า (agent)
  agent_name              VARCHAR(200) NULL,
  agent_phone             VARCHAR(20) NULL,

  -- OCR โฉนด
  ocr_deed_data           TEXT NULL COMMENT 'JSON ข้อมูลที่ OCR สแกนได้จากโฉนด',

  -- Platform config
  page_id                 VARCHAR(200) NULL COMMENT 'Facebook Page ID / LINE Bot ID',

  -- Follow-up tracking
  follow_up_count         INT NOT NULL DEFAULT 0,
  last_follow_up_at       DATETIME NULL,

  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_platform_customer (platform, customer_platform_id),
  INDEX idx_chat_conv_status (status),
  INDEX idx_chat_conv_assigned_to (assigned_to),
  INDEX idx_chat_conv_loan_request_id (loan_request_id),
  INDEX idx_chat_conv_last_message_at (last_message_at),
  INDEX idx_chat_conv_is_dead (is_dead),
  INDEX idx_chat_conv_agent_phone (agent_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 3) chat_messages — ข้อความทุกรายการ
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id   INT NOT NULL,
  sender_type       ENUM('customer','admin','bot','system') NOT NULL DEFAULT 'customer',
  sender_id         VARCHAR(200) NULL COMMENT 'admin_users.id หรือ platform user id',
  sender_name       VARCHAR(200) NULL,
  message_type      ENUM('text','image','video','audio','file','sticker','location','sop_warning','system') NOT NULL DEFAULT 'text',
  content           TEXT NULL,
  file_url          VARCHAR(500) NULL COMMENT 'path หรือ URL ของไฟล์',
  file_name         VARCHAR(300) NULL,
  file_size         INT NULL,
  platform_msg_id   VARCHAR(200) NULL COMMENT 'LINE messageId / Facebook message_id',
  read_at           DATETIME NULL,
  timestamp         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_msg_conv_id (conversation_id),
  INDEX idx_chat_msg_timestamp (timestamp),
  INDEX idx_chat_msg_platform_msg_id (platform_msg_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 4) chat_tags — ป้ายกำกับ (custom tags)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_tags (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  bg_color    VARCHAR(20) NOT NULL DEFAULT '#fef3c7',
  text_color  VARCHAR(20) NOT NULL DEFAULT '#92400e',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 5) chat_conversation_tags — M:N ระหว่าง conversation กับ tags
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversation_tags (
  conversation_id  INT NOT NULL,
  tag_id           INT NOT NULL,
  PRIMARY KEY (conversation_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 6) chat_followups — บันทึกการติดตาม (ตามครั้งที่ 1, 2, โทร ฯลฯ)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_followups (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id  INT NOT NULL,
  agent_id         INT NULL COMMENT 'admin_users.id',
  agent_name       VARCHAR(100) NULL,
  followup_type    ENUM('chat','call','note','line_msg','facebook_msg') NOT NULL DEFAULT 'note',
  note             TEXT NULL,
  response_time_min INT NULL COMMENT 'นาทีที่ตอบกลับหลังจากลูกค้าทัก',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cf_conv_id (conversation_id),
  INDEX idx_cf_agent_id (agent_id),
  INDEX idx_cf_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 7) Seed default tags ที่ใช้บ่อย
-- ─────────────────────────────────────────────
INSERT IGNORE INTO chat_tags (name, bg_color, text_color) VALUES
  ('ทรัพย์เข้าเกณฑ์',   '#dcfce7', '#166534'),
  ('รอโฉนด',             '#fef3c7', '#92400e'),
  ('ส่งประเมินแล้ว',     '#dbeafe', '#1e40af'),
  ('รอตัดสินใจ',         '#f3e8ff', '#6b21a8'),
  ('ดอกเบี้ยสูงไป',      '#fee2e2', '#991b1b'),
  ('ติดภาระสูง',         '#ffedd5', '#9a3412'),
  ('ทรัพย์ไม่ผ่านเกณฑ์', '#fee2e2', '#991b1b'),
  ('ลูกค้าหาย',          '#f1f5f9', '#475569'),
  ('VIP',                '#fef9c3', '#854d0e');

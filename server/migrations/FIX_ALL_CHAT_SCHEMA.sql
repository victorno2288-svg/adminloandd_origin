-- =========================================================
--  🚨 FIX_ALL_CHAT_SCHEMA.sql
--  แก้ปัญหาระบบแชทไม่โหลด + ข้อมูลไม่เก็บ + ขาด columns
--
--  ปัญหาที่แก้:
--   1. chat_messages — column เก่าไม่ตรงกับ code ปัจจุบัน
--   2. chat_conversations — ขาด tag_id, profile_id, platform_conversation_id, is_agent
--   3. chat_tags — ขาด sort_order, created_by
--   4. ขาดตาราง customer_profiles และ chat_quick_replies
--
--  วิธีรัน: phpMyAdmin → เลือก DB loandd → แท็บ SQL → วาง → Execute
--  ปลอดภัย: ใช้ IF NOT EXISTS ทุกที่ รันซ้ำได้ ข้อมูลไม่หาย
-- =========================================================

-- ===========================================================
-- PART 1: แก้ chat_messages (เพิ่ม column ชื่อใหม่ให้ code ใช้ได้)
-- ===========================================================

-- 1.1 เพิ่ม column ที่ code ปัจจุบันต้องการ (ถ้ายังไม่มี)
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS message_text       TEXT         NULL    COMMENT 'เนื้อหาข้อความ (ใหม่ แทน content)',
  ADD COLUMN IF NOT EXISTS attachment_url     VARCHAR(500) NULL    COMMENT 'URL ไฟล์แนบ (ใหม่ แทน file_url)',
  ADD COLUMN IF NOT EXISTS platform_message_id VARCHAR(200) NULL   COMMENT 'messageId จาก platform (ใหม่ แทน platform_msg_id)',
  ADD COLUMN IF NOT EXISTS created_at         DATETIME     NULL    DEFAULT CURRENT_TIMESTAMP COMMENT 'วันเวลา (ใหม่ แทน timestamp)';

-- 1.2 คัดลอกข้อมูลเก่า → column ใหม่ (ถ้ามี column เก่าอยู่)
--   ใช้ Stored Procedure ตรวจก่อน เพื่อไม่ error ถ้าไม่มี column เก่า
DROP PROCEDURE IF EXISTS _migrate_chat_messages;
DELIMITER $$
CREATE PROCEDURE _migrate_chat_messages()
BEGIN
  -- copy content → message_text (ถ้า column 'content' ยังอยู่)
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'content'
  ) THEN
    UPDATE chat_messages SET message_text = content
    WHERE message_text IS NULL AND content IS NOT NULL;
  END IF;

  -- copy file_url → attachment_url
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'file_url'
  ) THEN
    UPDATE chat_messages SET attachment_url = file_url
    WHERE attachment_url IS NULL AND file_url IS NOT NULL;
  END IF;

  -- copy platform_msg_id → platform_message_id
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'platform_msg_id'
  ) THEN
    UPDATE chat_messages SET platform_message_id = platform_msg_id
    WHERE platform_message_id IS NULL AND platform_msg_id IS NOT NULL;
  END IF;

  -- copy timestamp → created_at
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'timestamp'
  ) THEN
    UPDATE chat_messages SET created_at = `timestamp`
    WHERE created_at IS NULL AND `timestamp` IS NOT NULL;
  END IF;
END$$
DELIMITER ;
CALL _migrate_chat_messages();
DROP PROCEDURE IF EXISTS _migrate_chat_messages;

-- 1.3 เพิ่ม index ช่วย query เร็ว
ALTER TABLE chat_messages
  ADD INDEX IF NOT EXISTS idx_msg_platform_message_id (platform_message_id),
  ADD INDEX IF NOT EXISTS idx_msg_created_at          (created_at);

-- ===========================================================
-- PART 2: แก้ chat_conversations (เพิ่ม column ที่ขาดหาย)
-- ===========================================================

ALTER TABLE chat_conversations
  -- 2.1 platform_conversation_id (ใช้ใน findOrCreateConversation)
  ADD COLUMN IF NOT EXISTS platform_conversation_id VARCHAR(200) NULL COMMENT 'LINE userId / FB PSID ที่ใช้ค้นหา' AFTER platform,

  -- 2.2 tag_id (FK → chat_tags) — ทำให้ getConversationDetail JOIN ได้
  ADD COLUMN IF NOT EXISTS tag_id     INT NULL COMMENT 'FK → chat_tags.id (single tag per conv)' AFTER updated_at,

  -- 2.3 profile_id (FK → customer_profiles) — สำหรับ Deduplication
  ADD COLUMN IF NOT EXISTS profile_id INT NULL COMMENT 'FK → customer_profiles.id' AFTER customer_phone,

  -- 2.4 is_agent + agent fields (เผื่อยังไม่ได้รัน add_agent_chat_fields.sql)
  ADD COLUMN IF NOT EXISTS is_agent   TINYINT(1)   NOT NULL DEFAULT 0   COMMENT 'เป็นนายหน้า' AFTER obligation_amount,
  ADD COLUMN IF NOT EXISTS agent_name VARCHAR(255) NULL AFTER is_agent,
  ADD COLUMN IF NOT EXISTS agent_phone VARCHAR(20) NULL AFTER agent_name,

  -- 2.5 SOP screening fields (เผื่อยังไม่ได้รัน add_sop_screening_fields.sql)
  ADD COLUMN IF NOT EXISTS ineligible_property TINYINT(1) DEFAULT 0 AFTER contract_years,
  ADD COLUMN IF NOT EXISTS ineligible_reason   VARCHAR(500) NULL AFTER ineligible_property,
  ADD COLUMN IF NOT EXISTS intent_type         VARCHAR(50) NULL AFTER ineligible_reason,
  ADD COLUMN IF NOT EXISTS is_refinance        TINYINT(1) DEFAULT 0 AFTER intent_type,

  -- 2.6 follow_up_count (เผื่อยังไม่ได้รัน fix_chat_tables.sql)
  ADD COLUMN IF NOT EXISTS follow_up_count    INT NOT NULL DEFAULT 0 AFTER last_replied_by_name,
  ADD COLUMN IF NOT EXISTS last_follow_up_at  DATETIME NULL AFTER follow_up_count,

  -- 2.7 dead lead fields (เผื่อยังไม่ได้รัน fix_chat_tables.sql)
  ADD COLUMN IF NOT EXISTS is_dead      TINYINT(1) NOT NULL DEFAULT 0 AFTER loan_request_id,
  ADD COLUMN IF NOT EXISTS dead_reason  VARCHAR(300) NULL AFTER is_dead,
  ADD COLUMN IF NOT EXISTS dead_at      DATETIME NULL AFTER dead_reason,

  -- 2.8 page_id (ใช้ใน webhook)
  ADD COLUMN IF NOT EXISTS page_id VARCHAR(200) NULL COMMENT 'Facebook Page ID / LINE Bot ID' AFTER agent_phone,

  -- 2.9 ocr_deed_data
  ADD COLUMN IF NOT EXISTS ocr_deed_data TEXT NULL COMMENT 'JSON ข้อมูล OCR โฉนด' AFTER page_id;

-- 2.10 เพิ่ม index
ALTER TABLE chat_conversations
  ADD INDEX IF NOT EXISTS idx_tag_id     (tag_id),
  ADD INDEX IF NOT EXISTS idx_profile_id (profile_id),
  ADD INDEX IF NOT EXISTS idx_is_dead    (is_dead),
  ADD INDEX IF NOT EXISTS idx_agent_phone (agent_phone),
  ADD INDEX IF NOT EXISTS idx_plat_conv_id (platform_conversation_id);

-- ===========================================================
-- PART 3: แก้ chat_tags (เพิ่ม sort_order + created_by)
-- ===========================================================

ALTER TABLE chat_tags
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER text_color,
  ADD COLUMN IF NOT EXISTS created_by INT NULL COMMENT 'admin_users.id' AFTER sort_order,
  ADD INDEX IF NOT EXISTS idx_sort_order (sort_order);

-- อัพเดต sort_order ของ default tags
UPDATE chat_tags SET sort_order = 1  WHERE name = 'ทรัพย์เข้าเกณฑ์'    AND sort_order = 0;
UPDATE chat_tags SET sort_order = 2  WHERE name = 'รอโฉนด'             AND sort_order = 0;
UPDATE chat_tags SET sort_order = 3  WHERE name = 'ส่งประเมินแล้ว'     AND sort_order = 0;
UPDATE chat_tags SET sort_order = 4  WHERE name = 'รอตัดสินใจ'         AND sort_order = 0;
UPDATE chat_tags SET sort_order = 5  WHERE name = 'ดอกเบี้ยสูงไป'      AND sort_order = 0;
UPDATE chat_tags SET sort_order = 6  WHERE name = 'ติดภาระสูง'         AND sort_order = 0;
UPDATE chat_tags SET sort_order = 7  WHERE name = 'ทรัพย์ไม่ผ่านเกณฑ์' AND sort_order = 0;
UPDATE chat_tags SET sort_order = 8  WHERE name = 'ลูกค้าหาย'          AND sort_order = 0;
UPDATE chat_tags SET sort_order = 9  WHERE name = 'VIP'                AND sort_order = 0;

-- เพิ่ม tags ใหม่สำหรับ auto-tagging
INSERT IGNORE INTO chat_tags (name, bg_color, text_color, sort_order) VALUES
  ('ส่งโฉนดแล้ว',      '#dbeafe', '#1e40af', 10),
  ('ทรัพย์ไม่รับ',     '#fee2e2', '#991b1b', 11),
  ('รีไฟแนนซ์',        '#fce7f3', '#9d174d', 12),
  ('ขายฝาก',           '#ecfdf5', '#065f46', 13),
  ('จำนอง',            '#eff6ff', '#1e40af', 14);

-- ===========================================================
-- PART 4: สร้างตาราง customer_profiles (Deduplication)
-- ===========================================================

CREATE TABLE IF NOT EXISTS customer_profiles (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(200) NULL COMMENT 'ชื่อแสดง',
  phone        VARCHAR(20)  NULL COMMENT 'เบอร์โทรที่ยืนยันแล้ว',
  note         TEXT         NULL COMMENT 'หมายเหตุ (admin กรอก)',
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================================================
-- PART 5: สร้างตาราง chat_quick_replies (Quick Reply Templates)
-- ===========================================================

CREATE TABLE IF NOT EXISTS chat_quick_replies (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200)  NOT NULL            COMMENT 'ชื่อ template',
  content     TEXT          NOT NULL            COMMENT 'เนื้อหาข้อความ',
  is_global   TINYINT(1)    NOT NULL DEFAULT 0  COMMENT '1 = ทุกคนใช้ได้',
  created_by  INT           NULL                COMMENT 'admin_users.id',
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qr_global     (is_global),
  INDEX idx_qr_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- เพิ่ม quick replies เริ่มต้น
INSERT IGNORE INTO chat_quick_replies (title, content, is_global, sort_order) VALUES
('ทักทาย',        'สวัสดีครับ/ค่ะ ยินดีให้บริการ มีอะไรให้ช่วยเหลือได้บ้างครับ/ค่ะ 😊', 1, 1),
('ขอโทษที่รอ',    'ขออภัยที่ทำให้รอนานนะครับ/ค่ะ ขอตรวจสอบข้อมูลสักครู่นะครับ/ค่ะ', 1, 2),
('ขอเบอร์ติดต่อ', 'กรุณาแจ้งเบอร์โทรศัพท์เพื่อให้ทีมงานติดต่อกลับได้นะครับ/ค่ะ', 1, 3),
('ขอรูปโฉนด',     'กรุณาส่งรูปโฉนดที่ดิน (ด้านหน้า) มาให้ทีมงานประเมินเบื้องต้นด้วยนะครับ/ค่ะ', 1, 4),
('แจ้งเงื่อนไข',  'ทรัพย์ที่รับ: บ้านเดี่ยว คอนโด อาคารพาณิชย์ ที่ดิน (โฉนด/น.ส.4ก) วงเงินเริ่มต้น 500,000 บาท ขึ้นไปครับ/ค่ะ', 1, 5),
('ปิดการสนทนา',   'ขอบคุณที่ให้ความสนใจครับ/ค่ะ หากมีข้อสงสัยสามารถติดต่อกลับมาได้เสมอนะครับ/ค่ะ 🙏', 1, 6);

-- ===========================================================
-- PART 6: สร้างตาราง chat_followups (ถ้ายังไม่มี)
-- ===========================================================

CREATE TABLE IF NOT EXISTS chat_followups (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id  INT NOT NULL,
  agent_id         INT NULL COMMENT 'admin_users.id',
  agent_name       VARCHAR(100) NULL,
  followup_type    ENUM('chat','call','note','line_msg','facebook_msg') NOT NULL DEFAULT 'note',
  note             TEXT NULL,
  response_time_min INT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cf_conv_id   (conversation_id),
  INDEX idx_cf_agent_id  (agent_id),
  INDEX idx_cf_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================
-- ✅ เสร็จแล้ว! ตรวจสอบด้วยคำสั่งนี้:
-- ===========================================================
-- SHOW COLUMNS FROM chat_conversations;
-- SHOW COLUMNS FROM chat_messages;
-- SHOW COLUMNS FROM chat_tags;
-- SELECT * FROM chat_quick_replies;
-- SELECT * FROM chat_tags;

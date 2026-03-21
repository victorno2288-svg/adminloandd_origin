-- =========================================================
--  MASTER_MIGRATION_ALL.sql
--  รวม migrations ทั้งหมดของระบบ LOANDD
--  ปลอดภัย: IF NOT EXISTS ทุกที่ รันซ้ำได้ไม่เสียข้อมูล
--
--  วิธีรัน: phpMyAdmin → เลือก DB loandd_db → แท็บ SQL → วาง → Go
--  ประมาณเวลา: < 30 วินาที
-- =========================================================

-- ===========================================================
-- PART 1: chat_messages — แก้ column ชื่อเก่า → ชื่อใหม่
-- ===========================================================

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS message_text        TEXT         NULL    COMMENT 'เนื้อหาข้อความ',
  ADD COLUMN IF NOT EXISTS attachment_url      VARCHAR(500) NULL    COMMENT 'URL ไฟล์แนบ',
  ADD COLUMN IF NOT EXISTS platform_message_id VARCHAR(200) NULL    COMMENT 'messageId จาก platform',
  ADD COLUMN IF NOT EXISTS created_at          DATETIME     NULL    DEFAULT CURRENT_TIMESTAMP COMMENT 'วันเวลา';

ALTER TABLE chat_messages
  ADD INDEX IF NOT EXISTS idx_msg_platform_message_id (platform_message_id),
  ADD INDEX IF NOT EXISTS idx_msg_created_at          (created_at);

-- copy ข้อมูลเก่า → ใหม่ (ถ้ามี column เก่า)
DROP PROCEDURE IF EXISTS _master_migrate_chat_messages;
DELIMITER $$
CREATE PROCEDURE _master_migrate_chat_messages()
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'content') THEN
    UPDATE chat_messages SET message_text = content WHERE message_text IS NULL AND content IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'file_url') THEN
    UPDATE chat_messages SET attachment_url = file_url WHERE attachment_url IS NULL AND file_url IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'platform_msg_id') THEN
    UPDATE chat_messages SET platform_message_id = platform_msg_id WHERE platform_message_id IS NULL AND platform_msg_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'timestamp') THEN
    UPDATE chat_messages SET created_at = `timestamp` WHERE created_at IS NULL AND `timestamp` IS NOT NULL;
  END IF;
END$$
DELIMITER ;
CALL _master_migrate_chat_messages();
DROP PROCEDURE IF EXISTS _master_migrate_chat_messages;

-- ===========================================================
-- PART 2: chat_conversations — เพิ่มคอลัมน์ที่ขาดหายทั้งหมด
-- ===========================================================

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS loan_request_id         INT          DEFAULT NULL  COMMENT 'FK → loan_requests.id',
  ADD COLUMN IF NOT EXISTS platform_conversation_id VARCHAR(200) NULL          COMMENT 'LINE userId / FB PSID',
  ADD COLUMN IF NOT EXISTS tag_id                  INT          NULL           COMMENT 'FK → chat_tags.id',
  ADD COLUMN IF NOT EXISTS profile_id              INT          NULL           COMMENT 'FK → customer_profiles.id',
  ADD COLUMN IF NOT EXISTS is_agent                TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_name              VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS agent_phone             VARCHAR(20)  NULL,
  ADD COLUMN IF NOT EXISTS page_id                 VARCHAR(200) NULL           COMMENT 'FB Page ID / LINE Bot ID',
  ADD COLUMN IF NOT EXISTS ocr_deed_data           TEXT         NULL           COMMENT 'JSON OCR โฉนด',
  ADD COLUMN IF NOT EXISTS ineligible_property     TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ineligible_reason       VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS intent_type             VARCHAR(50)  NULL,
  ADD COLUMN IF NOT EXISTS is_refinance            TINYINT(1)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follow_up_count         INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_follow_up_at       DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS is_dead                 TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dead_reason             VARCHAR(300) NULL,
  ADD COLUMN IF NOT EXISTS dead_at                 DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS lead_quality            ENUM('unknown','ghost','unqualified','qualified','hot') NOT NULL DEFAULT 'unknown' COMMENT 'คุณภาพ lead',
  ADD COLUMN IF NOT EXISTS ghost_detected_at       DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS utm_source              VARCHAR(100) NULL           COMMENT 'แหล่งที่มา: facebook, line, google',
  ADD COLUMN IF NOT EXISTS utm_medium              VARCHAR(100) NULL           COMMENT 'ช่องทาง: cpc, messenger, organic',
  ADD COLUMN IF NOT EXISTS utm_campaign            VARCHAR(200) NULL           COMMENT 'ชื่อแคมเปญ',
  ADD COLUMN IF NOT EXISTS utm_ad_set              VARCHAR(200) NULL           COMMENT 'Ad Set name',
  ADD COLUMN IF NOT EXISTS utm_ad                  VARCHAR(200) NULL           COMMENT 'Ad name',
  ADD COLUMN IF NOT EXISTS fb_ad_id                VARCHAR(100) NULL           COMMENT 'Facebook Ad ID',
  ADD COLUMN IF NOT EXISTS line_ref                VARCHAR(200) NULL           COMMENT 'LINE ref parameter',
  ADD COLUMN IF NOT EXISTS estimated_value_chat    DECIMAL(15,2) NULL          COMMENT 'ราคาประเมินเบื้องต้นจากแชท',
  ADD COLUMN IF NOT EXISTS first_response_at       DATETIME     NULL           COMMENT 'เวลาที่ admin ตอบครั้งแรก',
  ADD COLUMN IF NOT EXISTS first_response_by       INT          NULL           COMMENT 'admin_users.id ที่ตอบครั้งแรก',
  ADD COLUMN IF NOT EXISTS first_response_seconds  INT          NULL           COMMENT 'วินาทีจาก created_at ถึง first_response_at',
  ADD COLUMN IF NOT EXISTS sentiment               ENUM('positive','neutral','negative') DEFAULT NULL COMMENT 'ความรู้สึกลูกค้า',
  ADD COLUMN IF NOT EXISTS resolved_at             DATETIME     NULL           COMMENT 'เวลาที่ปิดเคส',
  ADD COLUMN IF NOT EXISTS occupation              VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS monthly_income          DECIMAL(15,2) NULL,
  ADD COLUMN IF NOT EXISTS desired_amount          DECIMAL(15,2) NULL,
  ADD COLUMN IF NOT EXISTS obligation_amount       DECIMAL(15,2) NULL,
  ADD COLUMN IF NOT EXISTS contract_years          INT          NULL;

ALTER TABLE chat_conversations
  ADD INDEX IF NOT EXISTS idx_loan_request_id      (loan_request_id),
  ADD INDEX IF NOT EXISTS idx_tag_id               (tag_id),
  ADD INDEX IF NOT EXISTS idx_profile_id           (profile_id),
  ADD INDEX IF NOT EXISTS idx_is_dead              (is_dead),
  ADD INDEX IF NOT EXISTS idx_agent_phone          (agent_phone),
  ADD INDEX IF NOT EXISTS idx_plat_conv_id         (platform_conversation_id),
  ADD INDEX IF NOT EXISTS idx_lead_quality         (lead_quality),
  ADD INDEX IF NOT EXISTS idx_utm_campaign         (utm_campaign(100)),
  ADD INDEX IF NOT EXISTS idx_utm_source           (utm_source),
  ADD INDEX IF NOT EXISTS idx_conv_first_response  (first_response_at),
  ADD INDEX IF NOT EXISTS idx_conv_sentiment       (sentiment),
  ADD INDEX IF NOT EXISTS idx_conv_created_at      (created_at);

-- ===========================================================
-- PART 3: chat_tags — เพิ่ม sort_order + created_by
-- ===========================================================

ALTER TABLE chat_tags
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER text_color,
  ADD COLUMN IF NOT EXISTS created_by INT NULL COMMENT 'admin_users.id' AFTER sort_order,
  ADD INDEX IF NOT EXISTS idx_sort_order (sort_order);

UPDATE chat_tags SET sort_order = 1  WHERE name = 'ทรัพย์เข้าเกณฑ์'    AND sort_order = 0;
UPDATE chat_tags SET sort_order = 2  WHERE name = 'รอโฉนด'              AND sort_order = 0;
UPDATE chat_tags SET sort_order = 3  WHERE name = 'ส่งประเมินแล้ว'      AND sort_order = 0;
UPDATE chat_tags SET sort_order = 4  WHERE name = 'รอตัดสินใจ'          AND sort_order = 0;
UPDATE chat_tags SET sort_order = 5  WHERE name = 'ดอกเบี้ยสูงไป'       AND sort_order = 0;
UPDATE chat_tags SET sort_order = 6  WHERE name = 'ติดภาระสูง'          AND sort_order = 0;
UPDATE chat_tags SET sort_order = 7  WHERE name = 'ทรัพย์ไม่ผ่านเกณฑ์'  AND sort_order = 0;
UPDATE chat_tags SET sort_order = 8  WHERE name = 'ลูกค้าหาย'           AND sort_order = 0;
UPDATE chat_tags SET sort_order = 9  WHERE name = 'VIP'                 AND sort_order = 0;

INSERT IGNORE INTO chat_tags (name, bg_color, text_color, sort_order) VALUES
  ('ส่งโฉนดแล้ว',  '#dbeafe', '#1e40af', 10),
  ('ทรัพย์ไม่รับ', '#fee2e2', '#991b1b', 11),
  ('รีไฟแนนซ์',    '#fce7f3', '#9d174d', 12),
  ('ขายฝาก',       '#ecfdf5', '#065f46', 13),
  ('จำนอง',        '#eff6ff', '#1e40af', 14);

-- ===========================================================
-- PART 4: loan_requests — เพิ่มคอลัมน์ที่ขาด
-- ===========================================================

ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS pipeline_stage          VARCHAR(50)   NULL DEFAULT NULL COMMENT 'chat → waiting_deed → sent_appraisal → waiting_approval → approved → rejected',
  ADD COLUMN IF NOT EXISTS contact_email           VARCHAR(255)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_line            VARCHAR(255)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_facebook        VARCHAR(255)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS occupation              VARCHAR(255)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_income          DECIMAL(15,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS desired_amount          DECIMAL(15,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS obligation_amount       DECIMAL(15,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contract_years          INT           NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marital_status          ENUM('single','married_reg','married_unreg','divorced','inherited') NULL DEFAULT NULL COMMENT 'สถานะสมรส',
  ADD COLUMN IF NOT EXISTS bank_account_number     VARCHAR(50)   NULL,
  ADD COLUMN IF NOT EXISTS bank_name               VARCHAR(100)  NULL,
  ADD COLUMN IF NOT EXISTS bank_book_file          VARCHAR(500)  NULL,
  ADD COLUMN IF NOT EXISTS estimated_value         DECIMAL(15,2) NULL DEFAULT NULL COMMENT 'ราคาประเมินทรัพย์',
  ADD COLUMN IF NOT EXISTS google_maps_url         VARCHAR(500)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bathrooms               TINYINT       NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS floors                  TINYINT       NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rental_rooms            INT           NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rental_price_per_month  DECIMAL(10,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS building_permit_url     VARCHAR(500)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS building_year           YEAR          NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS broker_contract_sent_at    DATETIME  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS broker_contract_signed_at  DATETIME  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS broker_contract_email      VARCHAR(200) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS broker_contract_file       VARCHAR(500) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_images        TEXT          NULL DEFAULT NULL COMMENT 'JSON array',
  ADD COLUMN IF NOT EXISTS appraisal_type          ENUM('outside','inside','check_price') DEFAULT 'outside',
  ADD COLUMN IF NOT EXISTS appraisal_result        ENUM('passed','not_passed') DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_date          DATE          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_fee           DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slip_image              TEXT          DEFAULT NULL COMMENT 'ใบจ่ายค่าประเมิน',
  ADD COLUMN IF NOT EXISTS appraisal_book_image    TEXT          DEFAULT NULL COMMENT 'สมุดประเมิน',
  ADD COLUMN IF NOT EXISTS appraisal_note          TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_recorded_by   VARCHAR(100)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_recorded_at   DATETIME      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS outside_result          VARCHAR(50)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS outside_reason          TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS outside_recorded_at     DATETIME      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS inside_result           VARCHAR(50)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS inside_reason           TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS inside_recorded_at      DATETIME      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_price_value       DECIMAL(15,2) DEFAULT NULL COMMENT 'ราคาประเมินเบื้องต้น',
  ADD COLUMN IF NOT EXISTS check_price_detail      TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_price_recorded_at DATETIME      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prop_checklist_json     TEXT          NULL DEFAULT NULL COMMENT 'JSON checklist เอกสาร',
  ADD COLUMN IF NOT EXISTS ineligible_property     TINYINT(1)    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ineligible_reason       VARCHAR(255)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS screening_status        VARCHAR(30)   NULL DEFAULT NULL COMMENT 'pending | eligible | ineligible',
  ADD COLUMN IF NOT EXISTS screened_by_id          INT           NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS screened_by_name        VARCHAR(200)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS screened_at             DATETIME      NULL DEFAULT NULL;

-- ===========================================================
-- PART 5: cases — เพิ่มคอลัมน์ที่ขาด
-- ===========================================================

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS pipeline_stage        VARCHAR(50)  DEFAULT 'chat' COMMENT 'chat → waiting_deed → sent_appraisal → waiting_approval → approved → rejected',
  ADD COLUMN IF NOT EXISTS last_follow_up_at     DATETIME     NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS follow_up_count       INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_follow_up_at     DATETIME     NULL DEFAULT NULL COMMENT 'กำหนดตามครั้งถัดไป',
  ADD COLUMN IF NOT EXISTS broker_contract_signed TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS broker_contract_date  DATE         NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS broker_contract_file  TEXT         NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS land_transfer_date    DATE         NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS land_transfer_note    VARCHAR(500) NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_next_followup ON cases (next_follow_up_at);

-- ===========================================================
-- PART 6: legal_transactions — commission_slip
-- ===========================================================

ALTER TABLE legal_transactions
  ADD COLUMN IF NOT EXISTS commission_slip VARCHAR(500) NULL DEFAULT NULL COMMENT 'สลิปค่าคอมมิชชั่น';

-- ===========================================================
-- PART 7: auction_transactions — bank columns
-- ===========================================================

ALTER TABLE auction_transactions
  ADD COLUMN IF NOT EXISTS bank_name         VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_no   VARCHAR(50)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transfer_slip     TEXT         NULL DEFAULT NULL;

-- ===========================================================
-- PART 8: approval_transactions — credit_table_file
-- ===========================================================

ALTER TABLE approval_transactions
  ADD COLUMN IF NOT EXISTS credit_table_file VARCHAR(500) NULL COMMENT 'ไฟล์ตารางวงเงิน';

-- ===========================================================
-- PART 9: issuing_transactions — doc columns
-- ===========================================================

ALTER TABLE issuing_transactions
  ADD COLUMN IF NOT EXISTS doc_selling_pledge VARCHAR(500) DEFAULT NULL COMMENT 'สัญญาธุรกรรมขายฝาก',
  ADD COLUMN IF NOT EXISTS doc_mortgage       VARCHAR(500) DEFAULT NULL COMMENT 'สัญญาธุรกรรมจำนอง';

-- ===========================================================
-- PART 10: admin_users — round-robin flag
-- ===========================================================

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS rr_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=เข้าร่วม round-robin, 0=ออก';

-- ===========================================================
-- PART 11: agents — facebook + national_id
-- ===========================================================

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS facebook    VARCHAR(255) NULL DEFAULT NULL AFTER line_id,
  ADD COLUMN IF NOT EXISTS national_id VARCHAR(50)  NULL DEFAULT NULL AFTER facebook;

-- ===========================================================
-- PART 12: สร้างตาราง customer_profiles (Deduplication)
-- ===========================================================

CREATE TABLE IF NOT EXISTS customer_profiles (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(200) NULL COMMENT 'ชื่อแสดง',
  phone        VARCHAR(20)  NULL COMMENT 'เบอร์โทรที่ยืนยันแล้ว',
  note         TEXT         NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================================================
-- PART 13: สร้างตาราง chat_quick_replies
-- ===========================================================

CREATE TABLE IF NOT EXISTS chat_quick_replies (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  content    TEXT         NOT NULL,
  is_global  TINYINT(1)   NOT NULL DEFAULT 0,
  created_by INT          NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qr_global     (is_global),
  INDEX idx_qr_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO chat_quick_replies (title, content, is_global, sort_order) VALUES
('ทักทาย',        'สวัสดีครับ/ค่ะ ยินดีให้บริการ มีอะไรให้ช่วยเหลือได้บ้างครับ/ค่ะ 😊', 1, 1),
('ขอโทษที่รอ',    'ขออภัยที่ทำให้รอนานนะครับ/ค่ะ ขอตรวจสอบข้อมูลสักครู่นะครับ/ค่ะ', 1, 2),
('ขอเบอร์ติดต่อ', 'กรุณาแจ้งเบอร์โทรศัพท์เพื่อให้ทีมงานติดต่อกลับได้นะครับ/ค่ะ', 1, 3),
('ขอรูปโฉนด',     'กรุณาส่งรูปโฉนดที่ดิน (ด้านหน้า) มาให้ทีมงานประเมินเบื้องต้นด้วยนะครับ/ค่ะ', 1, 4),
('แจ้งเงื่อนไข',  'ทรัพย์ที่รับ: บ้านเดี่ยว คอนโด อาคารพาณิชย์ ที่ดิน (โฉนด/น.ส.4ก) วงเงินเริ่มต้น 500,000 บาท ขึ้นไปครับ/ค่ะ', 1, 5),
('ปิดการสนทนา',   'ขอบคุณที่ให้ความสนใจครับ/ค่ะ หากมีข้อสงสัยสามารถติดต่อกลับมาได้เสมอนะครับ/ค่ะ 🙏', 1, 6);

-- ===========================================================
-- PART 14: สร้างตาราง chat_followups
-- ===========================================================

DROP TABLE IF EXISTS chat_conversation_tags;

CREATE TABLE IF NOT EXISTS chat_followups (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  agent_id        INT NULL,
  agent_name      VARCHAR(100) NULL,
  followup_type   ENUM('chat','call','note','line_msg','facebook_msg') NOT NULL DEFAULT 'note',
  note            TEXT NULL,
  response_time_min INT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cf_conv_id   (conversation_id),
  INDEX idx_cf_agent_id  (agent_id),
  INDEX idx_cf_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================
-- PART 15: สร้างตาราง case_followups
-- ===========================================================

CREATE TABLE IF NOT EXISTS case_followups (
  id               INT NOT NULL AUTO_INCREMENT,
  case_id          INT NOT NULL,
  sales_id         INT NULL,
  sales_name       VARCHAR(200) NULL,
  followup_type    VARCHAR(50) NOT NULL DEFAULT 'chat' COMMENT 'chat | call | line | note | visit',
  note             TEXT NULL,
  next_followup_at DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cf_case    (case_id),
  KEY idx_cf_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE case_followups
  ADD COLUMN IF NOT EXISTS next_followup_at DATETIME NULL DEFAULT NULL;

-- ===========================================================
-- PART 16: สร้างตาราง appointments
-- ===========================================================

CREATE TABLE IF NOT EXISTS appointments (
  id               INT NOT NULL AUTO_INCREMENT,
  case_id          INT NULL,
  loan_request_id  INT NULL,
  appt_type        VARCHAR(50) NOT NULL DEFAULT 'valuation' COMMENT 'valuation | transaction | call | other',
  appt_date        DATE NULL,
  appt_time        TIME NULL,
  location         VARCHAR(500) NULL,
  notes            TEXT NULL,
  assigned_to_id   INT NULL,
  assigned_to_name VARCHAR(200) NULL,
  created_by_id    INT NULL,
  created_by_name  VARCHAR(200) NULL,
  status           VARCHAR(30) NOT NULL DEFAULT 'scheduled' COMMENT 'scheduled | completed | cancelled | rescheduled',
  completed_at     DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_appt_case   (case_id),
  KEY idx_appt_date   (appt_date),
  KEY idx_appt_status (status),
  KEY idx_appt_lr     (loan_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================================================
-- PART 17: สร้างตาราง advance_price_requests
-- ===========================================================

CREATE TABLE IF NOT EXISTS advance_price_requests (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  case_id           INT NOT NULL,
  loan_request_id   INT NULL,
  case_code         VARCHAR(50) NULL,
  customer_name     VARCHAR(200) NULL,
  customer_phone    VARCHAR(20) NULL,
  property_type     VARCHAR(100) NULL,
  deed_type         VARCHAR(50) NULL,
  deed_number       VARCHAR(100) NULL,
  desired_amount    DECIMAL(15,2) NULL,
  estimated_value   DECIMAL(15,2) NULL,
  location_hint     TEXT NULL,
  deed_images       TEXT NULL COMMENT 'JSON array',
  requested_by      INT NULL,
  requested_by_name VARCHAR(100) NULL,
  note              TEXT NULL,
  status            ENUM('pending','replied') NOT NULL DEFAULT 'pending',
  preliminary_price DECIMAL(15,2) NULL,
  appraiser_note    TEXT NULL,
  replied_at        DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_apr_case_id      (case_id),
  INDEX idx_apr_status       (status),
  INDEX idx_apr_requested_by (requested_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================
-- PART 18: สร้างตาราง case_transfer_log
-- ===========================================================

CREATE TABLE IF NOT EXISTS case_transfer_log (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  case_id       INT NOT NULL,
  from_sales_id INT NULL,
  from_sales_name VARCHAR(100) NULL,
  to_sales_id   INT NULL,
  to_sales_name VARCHAR(100) NULL,
  reason        TEXT NULL,
  transferred_by INT NULL,
  transferred_by_name VARCHAR(100) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ctl_case_id (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================
-- PART 19: สร้างตาราง notifications (ถ้าไม่มี)
-- ===========================================================

CREATE TABLE IF NOT EXISTS notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  admin_id        INT NOT NULL COMMENT 'ผู้รับ notification',
  type            VARCHAR(50) NOT NULL DEFAULT 'info',
  title           VARCHAR(200) NULL,
  message         TEXT NULL,
  loan_request_id INT DEFAULT NULL,
  case_id         INT DEFAULT NULL,
  conversation_id INT DEFAULT NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_admin       (admin_id),
  INDEX idx_notif_is_read     (is_read),
  INDEX idx_notif_loan_request (loan_request_id),
  INDEX idx_notif_created     (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notification_reads (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  notification_id INT NOT NULL,
  admin_id        INT NOT NULL,
  read_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_notif_admin (notification_id, admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===========================================================
-- PART 20: Follow-up Reminder — เพิ่มคอลัมน์ใน chat_conversations
-- ===========================================================

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS next_follow_up_at   DATETIME NULL DEFAULT NULL COMMENT 'วันนัด follow-up ครั้งถัดไป',
  ADD COLUMN IF NOT EXISTS followup_note       TEXT     NULL DEFAULT NULL COMMENT 'โน้ต follow-up ล่าสุด',
  ADD COLUMN IF NOT EXISTS followup_reminded_at DATETIME NULL DEFAULT NULL COMMENT 'เวลาที่ส่ง reminder ล่าสุด';

ALTER TABLE chat_conversations
  ADD INDEX IF NOT EXISTS idx_next_followup (next_follow_up_at);

-- ===========================================================
-- PART 21: Customer Blacklist
-- ===========================================================

CREATE TABLE IF NOT EXISTS customer_blacklists (
  id            INT NOT NULL AUTO_INCREMENT,
  phone         VARCHAR(20) NOT NULL COMMENT 'เบอร์โทรที่ blacklist',
  reason        TEXT NULL COMMENT 'เหตุผลที่ blacklist',
  added_by      INT NULL COMMENT 'admin_users.id ที่เพิ่ม',
  added_by_name VARCHAR(100) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bl_phone (phone),
  KEY idx_bl_phone (phone),
  KEY idx_bl_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT 'รายการเบอร์โทรที่ถูก blacklist';

-- เพิ่ม flag ใน chat_conversations
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS is_blacklisted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=เบอร์นี้ถูก blacklist';

-- ===========================================================
-- PART 22: cases — land_transfer_time + land_transfer_location
-- ===========================================================

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS land_transfer_time VARCHAR(10) NULL DEFAULT NULL
    COMMENT 'เวลานัดโอน เช่น 09:30'
    AFTER land_transfer_date;

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS land_transfer_location VARCHAR(300) NULL DEFAULT NULL
    COMMENT 'สถานที่โอน เช่น สำนักงานที่ดินจังหวัดนนทบุรี'
    AFTER land_transfer_time;

-- ===========================================================
-- PART 23: chat_conversations — last_message_from
-- ===========================================================

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS last_message_from ENUM('customer','admin','bot','system') NULL DEFAULT NULL
    COMMENT 'ใครเป็นคนส่งข้อความล่าสุด (สำหรับ SLA filter)';

-- ===========================================================
-- ✅ เสร็จแล้ว! ตรวจสอบด้วยคำสั่งนี้:
-- ===========================================================
-- SHOW COLUMNS FROM chat_conversations;
-- SHOW COLUMNS FROM loan_requests;
-- SHOW COLUMNS FROM cases;
-- SHOW TABLES LIKE '%follow%';
-- SHOW TABLES LIKE '%appointment%';
-- SELECT * FROM chat_quick_replies;
-- SELECT * FROM chat_tags ORDER BY sort_order;

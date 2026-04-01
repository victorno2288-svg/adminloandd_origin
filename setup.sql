-- ============================================================
-- setup.sql — รัน 1 ครั้งใน phpMyAdmin เพื่อสร้าง/อัพเดท DB
-- รองรับ MySQL 8 / MariaDB บน Hostinger
-- ทุก statement ใช้ IF NOT EXISTS / IF EXISTS (รัน ซ้ำปลอดภัย)
-- ============================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ============================================================
-- 1. CREATE TABLES (ถ้ายังไม่มี)
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_flows (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  flow_name   VARCHAR(200) NOT NULL,
  channel     ENUM('line','facebook','both') NOT NULL DEFAULT 'both',
  description TEXT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_flow_questions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  flow_id        INT NOT NULL,
  step_number    INT NOT NULL DEFAULT 1,
  question_text  TEXT NOT NULL,
  question_type  ENUM('text','choice','image','number','date','info') NOT NULL DEFAULT 'text',
  choices        TEXT NULL COMMENT 'JSON array of choice strings',
  field_key      VARCHAR(100) NULL COMMENT 'ชื่อ field ที่จะเก็บคำตอบ',
  is_required    TINYINT(1) NOT NULL DEFAULT 1,
  skip_if_field  VARCHAR(100) NULL COMMENT 'ข้ามคำถามนี้ถ้า field นี้มีค่าอยู่แล้ว',
  proactive_info TEXT NULL COMMENT 'ข้อมูลที่บอทจะบอกลูกค้าก่อนถาม',
  wait_seconds   INT NOT NULL DEFAULT 0 COMMENT 'หน่วงเวลาก่อนส่งคำถาม (วินาที)',
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_flow (flow_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS slip_verifications (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  trans_ref        VARCHAR(100)  NULL COMMENT 'EasySlip transRef',
  loan_request_id  INT           NULL,
  case_id          INT           NULL,
  slip_type        VARCHAR(50)   NOT NULL DEFAULT 'general' COMMENT 'appraisal_fee|bag_fee|advance|deposit|commission|general',
  amount           DECIMAL(15,2) NULL DEFAULT 0,
  currency         VARCHAR(10)   NULL DEFAULT 'THB',
  sender_name      VARCHAR(200)  NULL,
  sender_bank      VARCHAR(50)   NULL,
  sender_account   VARCHAR(100)  NULL,
  receiver_name    VARCHAR(200)  NULL,
  receiver_bank    VARCHAR(50)   NULL,
  receiver_account VARCHAR(100)  NULL,
  transaction_date DATETIME      NULL,
  uploaded_by      INT           NULL,
  raw_response     LONGTEXT      NULL COMMENT 'full EasySlip JSON response',
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_trans_ref (trans_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auction_transactions (
  id                    INT(11) NOT NULL AUTO_INCREMENT,
  case_id               INT(11) NOT NULL,
  investor_id           INT(11) DEFAULT NULL,
  investor_name         VARCHAR(200) DEFAULT NULL,
  investor_code         VARCHAR(50)  DEFAULT NULL,
  investor_phone        VARCHAR(50)  DEFAULT NULL,
  investor_type         ENUM('corporate','individual') DEFAULT NULL,
  property_value        DECIMAL(15,2) DEFAULT NULL,
  selling_pledge_amount DECIMAL(15,2) DEFAULT NULL,
  interest_rate         DECIMAL(10,2) DEFAULT NULL,
  auction_land_area     VARCHAR(100)  DEFAULT NULL,
  contract_years        INT(11)       DEFAULT NULL,
  house_reg_book        TEXT          DEFAULT NULL,
  house_reg_book_legal  TEXT          DEFAULT NULL,
  name_change_doc       TEXT          DEFAULT NULL,
  divorce_doc           TEXT          DEFAULT NULL,
  spouse_consent_doc    TEXT          DEFAULT NULL,
  spouse_id_card        TEXT          DEFAULT NULL,
  spouse_reg_copy       TEXT          DEFAULT NULL,
  marriage_cert         TEXT          DEFAULT NULL,
  spouse_name_change_doc TEXT         DEFAULT NULL,
  borrower_id_card      TEXT          DEFAULT NULL,
  single_cert           TEXT          DEFAULT NULL,
  death_cert            TEXT          DEFAULT NULL,
  will_court_doc        TEXT          DEFAULT NULL,
  testator_house_reg    TEXT          DEFAULT NULL,
  is_cancelled          TINYINT(1)    DEFAULT 0,
  auction_status        ENUM('pending','auctioned','cancelled') DEFAULT 'pending',
  recorded_by           VARCHAR(100)  DEFAULT NULL,
  recorded_at           DATETIME      DEFAULT NULL,
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  sale_type             VARCHAR(50)   DEFAULT NULL,
  bank_name             VARCHAR(200)  DEFAULT NULL,
  bank_account_no       VARCHAR(100)  DEFAULT NULL,
  bank_account_name     VARCHAR(200)  DEFAULT NULL,
  transfer_slip         VARCHAR(500)  DEFAULT NULL,
  land_transfer_date    DATE          DEFAULT NULL,
  land_transfer_time    VARCHAR(20)   DEFAULT NULL,
  land_transfer_location VARCHAR(500) DEFAULT NULL,
  land_transfer_note    TEXT          DEFAULT NULL,
  bank_book_file        VARCHAR(500)  DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS auction_bids (
  id             INT NOT NULL AUTO_INCREMENT,
  case_id        INT NULL,
  bid_amount     DECIMAL(15,2) NULL DEFAULT NULL,
  investor_id    INT NULL,
  investor_name  VARCHAR(200)  NULL DEFAULT NULL,
  investor_code  VARCHAR(100)  NULL DEFAULT NULL,
  investor_phone VARCHAR(50)   NULL DEFAULT NULL,
  bid_date       DATE          NULL DEFAULT NULL,
  note           TEXT          NULL,
  recorded_by    VARCHAR(200)  NULL DEFAULT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_case_id (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investor_withdrawals (
  id              INT NOT NULL AUTO_INCREMENT,
  investor_id     INT NULL,
  case_id         INT NULL,
  amount          DECIMAL(15,2) NULL DEFAULT NULL,
  withdrawal_date DATE          NULL DEFAULT NULL,
  status          VARCHAR(50)   NULL DEFAULT 'pending',
  slip_path       VARCHAR(500)  NULL DEFAULT NULL,
  note            TEXT          NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_investor_id (investor_id),
  KEY idx_case_id (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_accounting (
  id               INT NOT NULL AUTO_INCREMENT,
  agent_id         INT NULL,
  commission_slip  VARCHAR(500)  NULL DEFAULT NULL,
  commission_rate  DECIMAL(5,2)  NULL DEFAULT NULL,
  payment_status   VARCHAR(50)   NULL DEFAULT 'pending',
  note             TEXT          NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_agent_id (agent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS investor_auction_history (
  id           INT NOT NULL AUTO_INCREMENT,
  investor_id  INT NULL,
  case_id      INT NULL,
  auction_date DATETIME      NULL DEFAULT NULL,
  winning_price DECIMAL(15,2) NULL DEFAULT NULL,
  note         TEXT          NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inv_case (investor_id, case_id),
  KEY idx_investor_id (investor_id),
  KEY idx_case_id (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id               INT          NOT NULL AUTO_INCREMENT,
  case_id          INT          NULL,
  loan_request_id  INT          NULL,
  appt_type        VARCHAR(50)  NOT NULL DEFAULT 'valuation' COMMENT 'valuation|transaction|call|other',
  appt_date        DATE         NULL,
  appt_time        TIME         NULL,
  location         VARCHAR(500) NULL,
  notes            TEXT         NULL,
  assigned_to_id   INT          NULL,
  assigned_to_name VARCHAR(200) NULL,
  created_by_id    INT          NULL,
  created_by_name  VARCHAR(200) NULL,
  status           VARCHAR(30)  NOT NULL DEFAULT 'scheduled' COMMENT 'scheduled|completed|cancelled|rescheduled',
  completed_at     DATETIME     NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_appt_case   (case_id),
  KEY idx_appt_date   (appt_date),
  KEY idx_appt_status (status),
  KEY idx_appt_lr     (loan_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS case_followups (
  id               INT          NOT NULL AUTO_INCREMENT,
  case_id          INT          NOT NULL,
  sales_id         INT          NULL,
  sales_name       VARCHAR(200) NULL,
  followup_type    VARCHAR(50)  NOT NULL DEFAULT 'chat',
  note             TEXT         NULL,
  next_followup_at DATETIME     NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cf_case    (case_id),
  KEY idx_cf_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_followups (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id   INT NOT NULL,
  agent_id          INT NULL COMMENT 'admin_users.id',
  agent_name        VARCHAR(100) NULL,
  followup_type     ENUM('chat','call','note','line_msg','facebook_msg') NOT NULL DEFAULT 'note',
  note              TEXT NULL,
  response_time_min INT NULL COMMENT 'นาทีที่ตอบกลับหลังจากลูกค้าทัก',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cf_conv_id   (conversation_id),
  INDEX idx_cf_agent_id  (agent_id),
  INDEX idx_cf_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_blacklists (
  id            INT NOT NULL AUTO_INCREMENT,
  phone         VARCHAR(20)  NOT NULL COMMENT 'เบอร์โทรที่ blacklist',
  reason        TEXT         NULL COMMENT 'เหตุผล',
  added_by      INT          NULL COMMENT 'admin_users.id',
  added_by_name VARCHAR(100) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bl_phone (phone),
  KEY idx_bl_phone  (phone),
  KEY idx_bl_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. ALTER TABLE — เพิ่ม columns ที่อาจยังไม่มี
--    (IF NOT EXISTS รองรับ MySQL 8.0.3+ / MariaDB 10.0.2+)
-- ============================================================

-- chat_flows
ALTER TABLE chat_flows ADD COLUMN IF NOT EXISTS trigger_keywords  TEXT NULL COMMENT 'คำสั่ง/คีย์เวิร์ดที่ทริกเกอร์ Flow นี้ คั่นด้วย comma';
ALTER TABLE chat_flows ADD COLUMN IF NOT EXISTS ai_system_prompt  TEXT NULL COMMENT 'System prompt สำหรับ Gemini AI ตอบอิสระ (ถ้าว่างใช้ default)';

-- chat_conversations — AI flow + reply mode
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS active_flow_id INT NULL DEFAULT NULL COMMENT 'FK → chat_flows.id — flow ที่ใช้กับแชทนี้';
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS reply_mode ENUM('manual','ai') NOT NULL DEFAULT 'manual' COMMENT 'manual=ตอบเอง, ai=AI ตอบอัตโนมัติ';
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS customer_line_name VARCHAR(255) NULL DEFAULT NULL COMMENT 'ชื่อ LINE/FB ต้นฉบับ (ไม่ถูก admin เขียนทับ)';

-- auction_transactions
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS sale_type             VARCHAR(50)   NULL DEFAULT NULL COMMENT 'ประเภทการขาย auction/direct';
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS bank_name             VARCHAR(200)  NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS bank_account_no       VARCHAR(100)  NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS bank_account_name     VARCHAR(200)  NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS transfer_slip         VARCHAR(500)  NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS recorded_by           VARCHAR(200)  NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS recorded_at           DATETIME      NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS house_reg_book_legal  TEXT          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS spouse_consent_doc    TEXT          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS spouse_name_change_doc TEXT         NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS spouse_id_card        TEXT          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS spouse_reg_copy       TEXT          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS marriage_cert         TEXT          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS house_reg_book        TEXT          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS name_change_doc       TEXT          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS divorce_doc           TEXT          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS investor_type         VARCHAR(100)  NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS selling_pledge_amount DECIMAL(15,2) NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS interest_rate         DECIMAL(5,2)  NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS auction_land_area     VARCHAR(200)  NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS contract_years        INT           NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS is_cancelled          TINYINT(1)    NOT NULL DEFAULT 0;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS land_transfer_date    DATE          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS land_transfer_time    VARCHAR(20)   NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS land_transfer_location VARCHAR(500) NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS land_transfer_note    TEXT          NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS property_value        DECIMAL(15,2) NULL DEFAULT NULL;
ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS bank_book_file        VARCHAR(500)  NULL DEFAULT NULL;

-- auction_bids
ALTER TABLE auction_bids ADD COLUMN IF NOT EXISTS deposit_slip   VARCHAR(500)  NULL DEFAULT NULL COMMENT 'สลิปมัดจำ';
ALTER TABLE auction_bids ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(15,2) NULL DEFAULT NULL COMMENT 'จำนวนเงินมัดจำ';
ALTER TABLE auction_bids ADD COLUMN IF NOT EXISTS refund_status  VARCHAR(50)   NULL DEFAULT 'pending' COMMENT 'pending|winner|refunded';

-- cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS land_transfer_date      DATE         NULL DEFAULT NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS land_transfer_time      VARCHAR(20)  NULL DEFAULT NULL COMMENT 'เวลานัดโอนที่ดิน เช่น 09:00';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS land_transfer_location  VARCHAR(300) NULL DEFAULT NULL COMMENT 'สถานที่ / สำนักงานที่ดิน';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS land_transfer_note      TEXT         NULL DEFAULT NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS broker_contract_signed  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'เซ็นสัญญาแต่งตั้งนายหน้าแล้ว = 1';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS broker_contract_date    DATE         NULL DEFAULT NULL COMMENT 'วันที่เซ็นสัญญาแต่งตั้งนายหน้า';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS broker_contract_file    TEXT         NULL DEFAULT NULL COMMENT 'path ไฟล์สัญญาแต่งตั้งนายหน้า';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS follow_up_count         INT          NOT NULL DEFAULT 0 COMMENT 'จำนวนครั้งที่ตามลูกค้าแล้ว';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS last_follow_up_at       DATETIME     NULL DEFAULT NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS next_follow_up_at       DATETIME     NULL DEFAULT NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS transaction_slip        TEXT         NULL DEFAULT NULL COMMENT 'สลิปโอนเงินค่าปากถุง';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS advance_slip            VARCHAR(500) NULL DEFAULT NULL COMMENT 'สลิปค่าหักล่วงหน้า';

-- loan_requests — screening fields
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS ineligible_property TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1=ทรัพย์ไม่ผ่านเกณฑ์ SOP';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS ineligible_reason   VARCHAR(255)  NULL DEFAULT NULL COMMENT 'เหตุผลที่ไม่ผ่านเกณฑ์';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS screening_status    VARCHAR(30)   NULL DEFAULT NULL COMMENT 'pending|eligible|ineligible';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS screened_by_id      INT           NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS screened_by_name    VARCHAR(200)  NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS screened_at         DATETIME      NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS prop_checklist_json TEXT          NULL DEFAULT NULL COMMENT 'JSON checklist เอกสารตามประเภทอสังหา';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS marital_status      VARCHAR(50)   NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS checklist_ticks_json TEXT         NULL DEFAULT NULL COMMENT 'JSON tick state { field: true }';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS maps_url            TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS road_access         VARCHAR(10)   NULL DEFAULT NULL COMMENT 'yes=มีทางเข้าออก, no=ที่ดินตาบอด';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS seizure_status      VARCHAR(20)   NULL DEFAULT NULL COMMENT 'none|mortgaged|seized';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS road_width          VARCHAR(20)   NULL DEFAULT NULL COMMENT 'lt4/4to6/gt6';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS utility_access      VARCHAR(20)   NULL DEFAULT NULL COMMENT 'yes/partial/no';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS flood_risk          VARCHAR(20)   NULL DEFAULT NULL COMMENT 'never/rarely/often';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS estimated_value     DECIMAL(15,2) NULL DEFAULT NULL COMMENT 'ราคาประเมินทรัพย์';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS property_video      TEXT          NULL DEFAULT NULL COMMENT 'JSON array ของ path วีดีโอทรัพย์';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS reject_category     VARCHAR(100)  NULL COMMENT 'หมวดหมู่เหตุผลที่ไม่ผ่าน';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS reject_alternative  VARCHAR(100)  NULL COMMENT 'ทางเลือกที่แนะนำหลังไม่ผ่าน';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS advance_slip        VARCHAR(500)  NULL DEFAULT NULL COMMENT 'สลิปค่าหักล่วงหน้า (ก่อนมีเคส)';
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS single_cert         TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS death_cert          TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS will_court_doc      TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS testator_house_reg  TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS deed_copy           TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS building_permit     TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS house_reg_prop      TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS sale_contract       TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS debt_free_cert      TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS blueprint           TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS property_photos     TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS land_tax_receipt    TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS condo_title_deed    TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS condo_location_map  TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS common_fee_receipt  TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS floor_plan          TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS location_sketch_map TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS land_use_cert       TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS rental_contract     TEXT          NULL DEFAULT NULL;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS business_reg        TEXT          NULL DEFAULT NULL;

-- loan_requests — index
ALTER TABLE loan_requests ADD INDEX IF NOT EXISTS idx_reject_category (reject_category);

-- ============================================================
-- 3. MODIFY COLUMN — แปลง checklist fields TINYINT(1) → TEXT
--    (migration เก่าสร้าง TINYINT ทำให้ JSON path ถูก truncate เป็น 0)
-- ============================================================
ALTER TABLE loan_requests MODIFY COLUMN borrower_id_card  TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN house_reg_book    TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN name_change_doc   TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN divorce_doc       TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN spouse_id_card    TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN spouse_reg_copy   TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN marriage_cert     TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN single_cert       TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN death_cert        TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN will_court_doc    TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN testator_house_reg TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN deed_copy         TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN building_permit   TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN house_reg_prop    TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN sale_contract     TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN debt_free_cert    TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN blueprint         TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN property_photos   TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN land_tax_receipt  TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN condo_title_deed  TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN condo_location_map TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN common_fee_receipt TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN floor_plan        TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN location_sketch_map TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN land_use_cert     TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN rental_contract   TEXT NULL DEFAULT NULL;
ALTER TABLE loan_requests MODIFY COLUMN business_reg      TEXT NULL DEFAULT NULL;

-- chat_conversations
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS customer_line_name VARCHAR(255) NULL DEFAULT NULL COMMENT 'ชื่อ LINE/FB ต้นฉบับ (ไม่ถูก admin เขียนทับ) ใช้กรอกฟอร์มลูกหนี้';
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS reply_mode         ENUM('manual','ai') NOT NULL DEFAULT 'manual' COMMENT 'manual=ตอบเอง, ai=AI ตอบอัตโนมัติ';
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS next_follow_up_at  DATETIME   NULL DEFAULT NULL COMMENT 'วันนัด follow-up ครั้งถัดไป';
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS followup_note       TEXT       NULL DEFAULT NULL COMMENT 'โน้ต follow-up ล่าสุด';
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS followup_reminded_at DATETIME  NULL DEFAULT NULL COMMENT 'เวลาที่ส่ง reminder ล่าสุด';
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS is_blacklisted      TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=เบอร์ถูก blacklist';
ALTER TABLE chat_conversations ADD INDEX IF NOT EXISTS idx_next_followup (next_follow_up_at);

-- case_followups
ALTER TABLE case_followups ADD COLUMN IF NOT EXISTS next_followup_at DATETIME NULL DEFAULT NULL COMMENT 'กำหนดตามครั้งถัดไปจากการ log นี้';

-- issuing_transactions
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS closing_check_schedule TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'SOP 5.1 ยืนยันวัน-เวลา-สำนักงานที่ดิน';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS closing_check_personal TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'SOP 5.2 ยืนยันสถานะบุคคลลูกค้า';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS closing_check_legal    TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'SOP 5.3 ยืนยันสถานะทางกฎหมายทรัพย์';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS closing_check_docs     TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'SOP 5.4 ยืนยันเอกสารครบถ้วน';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS commission_slip        VARCHAR(500) NULL COMMENT 'สลิปค่าดำเนินการที่เก็บจากลูกค้า ณ กรมที่ดิน';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_sp_broker         TEXT NULL DEFAULT NULL COMMENT 'สัญญาแต่งตั้งนายหน้า ขายฝาก';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_sp_appendix       TEXT NULL DEFAULT NULL COMMENT 'เอกสารแนบท้ายสัญญาแต่งตั้ง ขายฝาก';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_sp_notice         TEXT NULL DEFAULT NULL COMMENT 'หนังสือแจ้งเตือน ขายฝาก';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_mg_addendum       TEXT NULL DEFAULT NULL COMMENT 'สัญญาต่อท้ายสัญญาจำนอง';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_mg_appendix       TEXT NULL DEFAULT NULL COMMENT 'เอกสารแนบท้ายสัญญาแต่งตั้ง จำนอง';
ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_mg_broker         TEXT NULL DEFAULT NULL COMMENT 'สัญญาแต่งตั้งนายหน้า จำนอง';

-- legal_transactions
ALTER TABLE legal_transactions ADD COLUMN IF NOT EXISTS doc_checklist_json TEXT NULL DEFAULT NULL COMMENT 'JSON SOP checklist tick state สำหรับฝ่ายนิติกรรม';

SET foreign_key_checks = 1;

-- ============================================================
-- เสร็จแล้ว! รันไฟล์นี้ครั้งเดียวใน phpMyAdmin → Import
-- ============================================================

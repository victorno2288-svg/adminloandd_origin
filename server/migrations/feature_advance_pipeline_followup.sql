-- =========================================================
--  LoanDD Migration: Advance Price Request + Pipeline Stage + Follow-up
--  วิธีรัน: phpMyAdmin → เลือก DB loandd → แท็บ SQL → วาง → Execute
--  ปลอดภัย: ใช้ IF NOT EXISTS ทุกที่ รันซ้ำได้
-- =========================================================

-- ─────────────────────────────────────────────
-- 1) cases table: pipeline_stage + follow-up columns
-- ─────────────────────────────────────────────

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'chat'
    COMMENT 'chat → waiting_deed → sent_appraisal → waiting_approval → approved → rejected'
    AFTER status;

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS last_follow_up_at DATETIME NULL DEFAULT NULL
    AFTER pipeline_stage;

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS follow_up_count INT NOT NULL DEFAULT 0
    AFTER last_follow_up_at;

-- ─────────────────────────────────────────────
-- 2) advance_price_requests table (ใหม่)
--    เซลล์ส่งขอราคาเบื้องต้น → พี่เกต (Advance) ตอบกลับ
-- ─────────────────────────────────────────────

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
  deed_images       TEXT NULL COMMENT 'JSON array of filenames',
  requested_by      INT NULL COMMENT 'admin_users.id (เซลล์)',
  requested_by_name VARCHAR(100) NULL,
  note              TEXT NULL COMMENT 'หมายเหตุจากเซลล์',
  status            ENUM('pending','replied') NOT NULL DEFAULT 'pending',
  preliminary_price DECIMAL(15,2) NULL COMMENT 'ราคาที่พี่เกตตอบกลับ',
  appraiser_note    TEXT NULL,
  replied_at        DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_apr_case_id  (case_id),
  INDEX idx_apr_status   (status),
  INDEX idx_apr_requested_by (requested_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 3) case_followups table (ใหม่)
--    บันทึกการติดตามลูกค้า: แชท / โทร / โน้ต
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_followups (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  case_id       INT NOT NULL,
  sales_id      INT NULL COMMENT 'admin_users.id',
  sales_name    VARCHAR(100) NULL,
  followup_type ENUM('chat','call','note') NOT NULL DEFAULT 'note',
  note          TEXT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_followup_case_id (case_id),
  INDEX idx_followup_sales_id (sales_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 4) case_transfer_log table (ใหม่)
--    log การโอนเคสระหว่างเซลล์
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_transfer_log (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  case_id          INT NOT NULL,
  lr_id            INT NULL COMMENT 'loan_requests.id',
  from_sales_id    INT NULL,
  from_sales_name  VARCHAR(100) NULL,
  to_sales_id      INT NULL,
  to_sales_name    VARCHAR(100) NULL,
  transferred_by   INT NULL COMMENT 'admin_users.id ที่กดโอน',
  reason           VARCHAR(255) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transfer_case_id (case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- 5) cases table: เวลา + สถานที่โอนที่ดิน (กรมที่ดิน)
-- ─────────────────────────────────────────────

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS land_transfer_time VARCHAR(10) NULL DEFAULT NULL
    COMMENT 'เวลานัดโอน เช่น 09:30'
    AFTER land_transfer_date;

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS land_transfer_location VARCHAR(300) NULL DEFAULT NULL
    COMMENT 'สถานที่โอน เช่น สำนักงานที่ดินจังหวัดนนทบุรี'
    AFTER land_transfer_time;

-- ─────────────────────────────────────────────
-- 6) chat_conversations: property_project, bedrooms
--    (จาก session ก่อนหน้า — รันซ้ำปลอดภัย)
-- ─────────────────────────────────────────────

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS property_project VARCHAR(200) NULL DEFAULT NULL
    COMMENT 'ชื่อโครงการ / หมู่บ้าน'
    AFTER property_type;

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS bedrooms TINYINT NULL DEFAULT NULL
    COMMENT 'จำนวนห้องนอน'
    AFTER property_project;

-- ─────────────────────────────────────────────
-- 7) chat_conversations: last_replied_by (ติดแท็กว่าใครตอบล่าสุด)
-- ─────────────────────────────────────────────

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS last_replied_by_id INT NULL DEFAULT NULL
    COMMENT 'admin_users.id ของคนที่ตอบล่าสุด'
    AFTER last_message_at;

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS last_replied_by_name VARCHAR(100) NULL DEFAULT NULL
    COMMENT 'ชื่อของ admin ที่ตอบล่าสุด'
    AFTER last_replied_by_id;

-- ─────────────────────────────────────────────
-- 8) approval_transactions: credit_table_file2 (ตารางขายฝาก)
-- ─────────────────────────────────────────────

ALTER TABLE approval_transactions
  ADD COLUMN IF NOT EXISTS credit_table_file2 VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'ไฟล์ตารางวงเงินขายฝาก'
    AFTER credit_table_file;

-- ─────────────────────────────────────────────
-- 9) auction_transactions: sale_type (ประมูล / ขายสด)
-- ─────────────────────────────────────────────

ALTER TABLE auction_transactions
  ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) NULL DEFAULT 'auction'
    COMMENT 'auction = ประมูลทรัพย์, direct = ขายสด'
    AFTER auction_status;

-- ─────────────────────────────────────────────
-- 10) investors: id_card_image (หลักฐานตัวตนนายทุน)
-- ─────────────────────────────────────────────

ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS id_card_image VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'ไฟล์บัตรประชาชนหรือหลักฐานตัวตน'
    AFTER sort_order;

-- ─────────────────────────────────────────────
-- 11) auction_transactions: bank + transfer_slip (บันทึกการโอนเงินนายทุนรายเคส)
-- ─────────────────────────────────────────────

ALTER TABLE auction_transactions
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NULL DEFAULT NULL
    COMMENT 'ธนาคารที่โอนให้นายทุน (เฉพาะเคสนี้)' AFTER sale_type,
  ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50) NULL DEFAULT NULL
    COMMENT 'เลขบัญชีที่โอนให้นายทุน' AFTER bank_name,
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200) NULL DEFAULT NULL
    COMMENT 'ชื่อบัญชีที่โอนให้นายทุน' AFTER bank_account_no,
  ADD COLUMN IF NOT EXISTS transfer_slip VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'สลิปโอนเงินหลังนัดโอนที่กรมที่ดิน' AFTER bank_account_name;

-- ─────────────────────────────────────────────
-- ✅ เสร็จ — รันซ้ำได้ไม่เกิด error
-- ─────────────────────────────────────────────

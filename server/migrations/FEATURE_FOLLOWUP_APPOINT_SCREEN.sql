-- =========================================================
--  FEATURE_FOLLOWUP_APPOINT_SCREEN.sql
--  Features:
--    1) Follow-up columns on cases
--    2) Appointments table
--    3) Property-type document checklist tracking
--  วิธีรัน: phpMyAdmin → loandd_db → SQL tab → วาง → Go
--  ปลอดภัย: IF NOT EXISTS ทุกที่ รันซ้ำได้
-- =========================================================

-- ─────────────────────────────────────────────
-- 1) Follow-up: เพิ่มคอลัมน์ใน cases
-- ─────────────────────────────────────────────
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS follow_up_count     INT          NOT NULL DEFAULT 0
    COMMENT 'จำนวนครั้งที่ตามลูกค้าแล้ว',
  ADD COLUMN IF NOT EXISTS last_follow_up_at   DATETIME     NULL DEFAULT NULL
    COMMENT 'ครั้งล่าสุดที่ตาม',
  ADD COLUMN IF NOT EXISTS next_follow_up_at   DATETIME     NULL DEFAULT NULL
    COMMENT 'กำหนดตามครั้งถัดไป (ใช้ใน overdue dashboard)';

CREATE INDEX IF NOT EXISTS idx_cases_next_followup ON cases (next_follow_up_at);

-- case_followups table (ถ้าไม่มีสร้างใหม่, ถ้ามีแล้วไม่กระทบ)
CREATE TABLE IF NOT EXISTS case_followups (
  id             INT          NOT NULL AUTO_INCREMENT,
  case_id        INT          NOT NULL,
  sales_id       INT          NULL,
  sales_name     VARCHAR(200) NULL,
  followup_type  VARCHAR(50)  NOT NULL DEFAULT 'chat'
    COMMENT 'chat | call | line | note | visit',
  note           TEXT         NULL,
  next_followup_at DATETIME   NULL      COMMENT 'กำหนดตามครั้งถัดไปจากการ log นี้',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cf_case (case_id),
  KEY idx_cf_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- เพิ่มคอลัมน์ next_followup_at ถ้ายังไม่มีใน case_followups
ALTER TABLE case_followups
  ADD COLUMN IF NOT EXISTS next_followup_at DATETIME NULL DEFAULT NULL
    COMMENT 'กำหนดตามครั้งถัดไปจากการ log นี้';

-- ─────────────────────────────────────────────
-- 2) Appointments table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               INT          NOT NULL AUTO_INCREMENT,
  case_id          INT          NULL      COMMENT 'อ้างอิง cases.id',
  loan_request_id  INT          NULL      COMMENT 'อ้างอิง loan_requests.id',
  appt_type        VARCHAR(50)  NOT NULL  DEFAULT 'valuation'
    COMMENT 'valuation=นัดประเมิน | transaction=นัดกรมที่ดิน | call=โทรหา | other=อื่นๆ',
  appt_date        DATE         NULL,
  appt_time        TIME         NULL,
  location         VARCHAR(500) NULL      COMMENT 'สถานที่/ลิงก์ Google Maps',
  notes            TEXT         NULL,
  assigned_to_id   INT          NULL      COMMENT 'admin_users.id ที่รับผิดชอบ',
  assigned_to_name VARCHAR(200) NULL,
  created_by_id    INT          NULL,
  created_by_name  VARCHAR(200) NULL,
  status           VARCHAR(30)  NOT NULL  DEFAULT 'scheduled'
    COMMENT 'scheduled | completed | cancelled | rescheduled',
  completed_at     DATETIME     NULL,
  created_at       DATETIME     NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_appt_case    (case_id),
  KEY idx_appt_date    (appt_date),
  KEY idx_appt_status  (status),
  KEY idx_appt_lr      (loan_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────
-- 3) Property-type document checklist: เพิ่ม checklist_type บน loan_requests
-- ─────────────────────────────────────────────
-- เก็บ JSON ของรายการ checkbox ว่าได้รับเอกสารอะไรมาแล้ว
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS prop_checklist_json TEXT NULL DEFAULT NULL
    COMMENT 'JSON: {"debt_free_cert": true, "building_permit": false, ...} สำหรับเอกสารตามประเภทอสังหา';

-- ─────────────────────────────────────────────
-- 4) Asset Screening: เพิ่มฟิลด์ใน loan_requests (ถ้ายังไม่มี)
-- ─────────────────────────────────────────────
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS ineligible_property  TINYINT(1)   NOT NULL DEFAULT 0
    COMMENT '1=ทรัพย์ไม่ผ่านเกณฑ์ SOP',
  ADD COLUMN IF NOT EXISTS ineligible_reason    VARCHAR(255) NULL DEFAULT NULL
    COMMENT 'เหตุผลที่ไม่ผ่านเกณฑ์',
  ADD COLUMN IF NOT EXISTS screening_status     VARCHAR(30)  NULL DEFAULT NULL
    COMMENT 'pending | eligible | ineligible',
  ADD COLUMN IF NOT EXISTS screened_by_id       INT          NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS screened_by_name     VARCHAR(200) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS screened_at          DATETIME     NULL DEFAULT NULL;

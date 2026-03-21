-- =========================================================
--  FIX_LOAN_REQUESTS_MISSING_COLS.sql
--  เพิ่ม column ที่ขาดหายใน loan_requests
--  ซึ่งทำให้ GET /conversations/:id → 500 Error
--
--  Root cause: chatController.js query ดึง lr.pipeline_stage,
--  lr.appraisal_result, lr.check_price_value ฯลฯ
--  แต่ columns เหล่านี้ยังไม่มีใน loan_requests
--
--  วิธีรัน: phpMyAdmin → เลือก DB loandd_db → แท็บ SQL → วาง → Go
--  ปลอดภัย: ใช้ IF NOT EXISTS ทุกที่ รันซ้ำได้ ข้อมูลไม่หาย
-- =========================================================

ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) NULL DEFAULT NULL
    COMMENT 'chat → waiting_deed → sent_appraisal → waiting_approval → approved → rejected',
  ADD COLUMN IF NOT EXISTS appraisal_type ENUM('outside','inside','check_price') DEFAULT 'outside',
  ADD COLUMN IF NOT EXISTS appraisal_result ENUM('passed','not_passed') DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_fee DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slip_image TEXT DEFAULT NULL
    COMMENT 'ไฟล์ใบจ่ายค่าประเมิน',
  ADD COLUMN IF NOT EXISTS appraisal_book_image TEXT DEFAULT NULL
    COMMENT 'ไฟล์สมุดประเมิน',
  ADD COLUMN IF NOT EXISTS appraisal_note TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_recorded_by VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_recorded_at DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_price_value DECIMAL(15,2) DEFAULT NULL
    COMMENT 'ราคาประเมินเบื้องต้น (check price)',
  ADD COLUMN IF NOT EXISTS check_price_detail TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS check_price_recorded_at DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_images TEXT DEFAULT NULL
    COMMENT 'JSON array of appraisal image filenames';

-- =========================================================
-- ตรวจสอบว่าเพิ่มแล้ว:
-- SHOW COLUMNS FROM loan_requests LIKE 'pipeline_stage';
-- SHOW COLUMNS FROM loan_requests LIKE 'appraisal_%';
-- SHOW COLUMNS FROM loan_requests LIKE 'check_price_%';
-- =========================================================

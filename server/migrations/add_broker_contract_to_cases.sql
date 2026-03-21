-- =========================================================
--  LoanDD Migration: สัญญาแต่งตั้งนายหน้า + สลิปค่าประเมิน
--  วิธีรัน: phpMyAdmin → เลือก DB loandd → แท็บ SQL → วาง → Execute
--  ปลอดภัย: ใช้ IF NOT EXISTS ทุกที่ รันซ้ำได้
-- =========================================================

-- 1) cases: เซ็นสัญญาแต่งตั้งนายหน้าแล้วหรือยัง
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS broker_contract_signed TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'เซ็นสัญญาแต่งตั้งนายหน้าแล้ว = 1'
    AFTER payment_status;

-- 2) cases: วันที่เซ็นสัญญา
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS broker_contract_date DATE NULL DEFAULT NULL
    COMMENT 'วันที่เซ็นสัญญาแต่งตั้งนายหน้า'
    AFTER broker_contract_signed;

-- 3) cases: ไฟล์สัญญา (path)
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS broker_contract_file TEXT NULL DEFAULT NULL
    COMMENT 'path ไฟล์สัญญาแต่งตั้งนายหน้าที่สแกนแล้ว'
    AFTER broker_contract_date;

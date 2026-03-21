-- =========================================================
--  LoanDD Migration: Agent Extended Fields
--  เพิ่มข้อมูลธนาคาร, พื้นที่รับผิดชอบ, บัตรปชช., สัญญาแต่งตั้ง
--  วิธีรัน: phpmyadmin → เลือก DB loandd → แท็บ SQL → วาง + Execute
-- =========================================================

-- ข้อมูลธนาคาร (สำหรับโอนค่าคอม)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NULL DEFAULT NULL AFTER national_id,
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) NULL DEFAULT NULL AFTER bank_name,
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255) NULL DEFAULT NULL AFTER bank_account_number;

-- พื้นที่รับผิดชอบ
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS area VARCHAR(500) NULL DEFAULT NULL AFTER bank_account_name;

-- ไฟล์แนบ
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS id_card_image VARCHAR(500) NULL DEFAULT NULL AFTER area,
  ADD COLUMN IF NOT EXISTS contract_file VARCHAR(500) NULL DEFAULT NULL AFTER id_card_image,
  ADD COLUMN IF NOT EXISTS contract_date DATE NULL DEFAULT NULL AFTER contract_file;

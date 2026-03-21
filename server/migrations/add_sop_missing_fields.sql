-- =====================================================================
-- Migration: add_sop_missing_fields.sql
-- เพิ่มคอลัมน์ที่ขาดตาม SOP ฝ่ายขาย + SOP นิติกรรม
-- =====================================================================

-- 1. loan_requests: เพิ่มบริษัทประเมิน + ชื่อผู้ประเมิน (SOP ฝ่ายประเมิน Phase 3)
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS appraisal_company VARCHAR(255) DEFAULT NULL COMMENT 'บริษัทประเมิน',
  ADD COLUMN IF NOT EXISTS appraiser_name VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อผู้ประเมิน';

-- 2. legal_transactions: เพิ่ม Financial Protocol (SOP นิติกรรม Phase 4)
ALTER TABLE legal_transactions
  ADD COLUMN IF NOT EXISTS net_payout DECIMAL(15,2) DEFAULT NULL COMMENT 'ยอดโอนสุทธิให้ลูกหนี้ (บาท)',
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL COMMENT 'วิธีชำระ: transfer | cash | cheque',
  ADD COLUMN IF NOT EXISTS actual_transfer_fee DECIMAL(15,2) DEFAULT NULL COMMENT 'ค่าโอน/จดจำนองจริง ณ กรมที่ดิน (บาท)',
  ADD COLUMN IF NOT EXISTS actual_stamp_duty DECIMAL(15,2) DEFAULT NULL COMMENT 'อากรแสตมป์จริง (บาท)';

-- 3. legal_transactions: เพิ่มบัญชีธนาคารนายหน้า (สำหรับโอนค่าคอมมิชชั่น)
ALTER TABLE legal_transactions
  ADD COLUMN IF NOT EXISTS agent_bank_name VARCHAR(100) DEFAULT NULL COMMENT 'ธนาคารนายหน้า',
  ADD COLUMN IF NOT EXISTS agent_bank_account_no VARCHAR(50) DEFAULT NULL COMMENT 'เลขบัญชีนายหน้า',
  ADD COLUMN IF NOT EXISTS agent_bank_account_name VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อบัญชีนายหน้า';

-- 4. cases: เพิ่ม broker_id_file (บัตรประชาชนนายหน้า)
-- ทั้งฝ่ายขายและฝ่ายออกสัญญาอัพโหลดมาที่ cases table เดียวกัน
-- broker_contract_file มีอยู่แล้วจาก FEATURE_BATCH_6
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS broker_id_file VARCHAR(500) DEFAULT NULL COMMENT 'รูปบัตรประชาชนนายหน้า (path)';

-- 5. investors: เพิ่ม passbook_image + investor_contract
ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS passbook_image VARCHAR(500) DEFAULT NULL COMMENT 'รูปสมุดบัญชี (path)',
  ADD COLUMN IF NOT EXISTS investor_contract VARCHAR(500) DEFAULT NULL COMMENT 'สัญญานายทุน (path)';

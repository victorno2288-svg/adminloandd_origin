-- =====================================================================
-- Migration: เพิ่มช่องธนาคารลูกหนี้ + สลิปค่านายหน้าในนิติกรรม
-- =====================================================================

-- 1. ชื่อบัญชีธนาคารลูกหนี้ (loan_requests ขาด bank_account_name)
ALTER TABLE `loan_requests`
  ADD COLUMN IF NOT EXISTS `bank_account_name` varchar(255) DEFAULT NULL
    COMMENT 'ชื่อบัญชีธนาคารลูกหนี้' AFTER `bank_account_number`;

-- 2. สลิปค่านายหน้า ใน legal_transactions (อัพโหลดโดยฝ่ายนิติ)
ALTER TABLE `legal_transactions`
  ADD COLUMN IF NOT EXISTS `agent_payment_slip` varchar(500) DEFAULT NULL
    COMMENT 'สลิปค่านายหน้า (อัพโหลดโดยฝ่ายนิติกรรม)' AFTER `agent_bank_account_name`;

-- 3. หน้าสมุดบัญชีนายหน้า ใน legal_transactions (ยืนยันโดยฝ่ายนิติ)
ALTER TABLE `legal_transactions`
  ADD COLUMN IF NOT EXISTS `agent_bank_book` varchar(500) DEFAULT NULL
    COMMENT 'หน้าสมุดบัญชีนายหน้า (อัพโหลด+OCR โดยฝ่ายนิติกรรม)' AFTER `agent_payment_slip`;

-- 4. หน้าสมุดบัญชีนายหน้าใน agents table (sync กลับจากฝ่ายนิติ)
ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `bank_book_file` varchar(500) DEFAULT NULL
    COMMENT 'หน้าสมุดบัญชีนายหน้า (sync จากฝ่ายนิติกรรม)' AFTER `payment_slip`;

-- 5. หน้าสมุดบัญชีนายทุน ใน auction_transactions (อัพโหลดโดยฝ่ายนิติ)
ALTER TABLE `auction_transactions`
  ADD COLUMN IF NOT EXISTS `bank_book_file` varchar(500) DEFAULT NULL
    COMMENT 'หน้าสมุดบัญชีนายทุน (อัพโหลดโดยฝ่ายนิติกรรม)' AFTER `bank_account_name`;

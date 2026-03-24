-- ============================================================
-- สลิปเงินมัดจำนายทุน 1% และสลิปค่านายหน้า
-- รันใน MySQL
-- ============================================================

-- 1. เพิ่ม deposit_slip ในตาราง investors
ALTER TABLE `investors`
  ADD COLUMN IF NOT EXISTS `deposit_slip` varchar(500) DEFAULT NULL
    COMMENT 'สลิปเงินมัดจำ 1% จากนายทุน (path ไฟล์)' AFTER `investor_contract`;

-- 2. เพิ่ม payment_slip ในตาราง agents
ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `payment_slip` varchar(500) DEFAULT NULL
    COMMENT 'สลิปการรับเงินค่านายหน้า (path ไฟล์)' AFTER `contract_file`;

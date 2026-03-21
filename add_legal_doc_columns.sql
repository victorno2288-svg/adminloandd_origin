-- ============================================================
-- เพิ่ม columns เอกสารนิติกรรมใหม่:
--   tax_receipt     = ใบเสร็จรับเงินค่าธรรมเนียม/ภาษี (จากที่ดิน)
--   broker_contract = สัญญานายหน้า
--   broker_id       = บัตรประชาชนนายหน้า
--
-- รันใน phpMyAdmin หรือ MySQL CLI:
--   mysql -u root loandd_db < add_legal_doc_columns.sql
-- ============================================================

ALTER TABLE legal_transactions
  ADD COLUMN IF NOT EXISTS `tax_receipt`      VARCHAR(255) NULL COMMENT 'ใบเสร็จค่าธรรมเนียม/ภาษีจากที่ดิน' AFTER commission_slip,
  ADD COLUMN IF NOT EXISTS `broker_contract`  VARCHAR(255) NULL COMMENT 'สัญญานายหน้า' AFTER tax_receipt,
  ADD COLUMN IF NOT EXISTS `broker_id`        VARCHAR(255) NULL COMMENT 'บัตรประชาชนนายหน้า' AFTER broker_contract;

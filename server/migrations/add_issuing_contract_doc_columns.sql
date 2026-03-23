-- ============================================================
-- Migration: add_issuing_contract_doc_columns.sql
-- เพิ่มคอลัมน์เอกสารสัญญาฝ่ายออกสัญญา ใน issuing_transactions
-- (doc_sp_* = ขายฝาก, doc_mg_* = จำนอง)
-- ============================================================

ALTER TABLE issuing_transactions
  ADD COLUMN IF NOT EXISTS doc_sp_broker    VARCHAR(500) NULL DEFAULT NULL COMMENT 'สัญญาแต่งตั้งนายหน้า (ขายฝาก)',
  ADD COLUMN IF NOT EXISTS doc_sp_appendix  VARCHAR(500) NULL DEFAULT NULL COMMENT 'เอกสารแนบท้ายสัญญา (ขายฝาก)',
  ADD COLUMN IF NOT EXISTS doc_sp_notice    VARCHAR(500) NULL DEFAULT NULL COMMENT 'หนังสือแจ้งเตือน (ขายฝาก)',
  ADD COLUMN IF NOT EXISTS doc_mg_addendum  VARCHAR(500) NULL DEFAULT NULL COMMENT 'สัญญาต่อท้ายสัญญาจำนอง',
  ADD COLUMN IF NOT EXISTS doc_mg_appendix  VARCHAR(500) NULL DEFAULT NULL COMMENT 'เอกสารแนบท้ายสัญญา (จำนอง)',
  ADD COLUMN IF NOT EXISTS doc_mg_broker    VARCHAR(500) NULL DEFAULT NULL COMMENT 'สัญญาแต่งตั้งนายหน้า (จำนอง)';

SELECT 'issuing_transactions contract doc columns added!' AS result;

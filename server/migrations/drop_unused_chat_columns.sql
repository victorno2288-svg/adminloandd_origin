-- =========================================================
--  Migration: ลบ column ที่ไม่ใช้แล้วในหน้าแชท
--  วันที่: 2026-03-18
--  วิธีรัน: phpMyAdmin → เลือก DB loandd → แท็บ SQL → วาง → Execute
--
--  หมายเหตุ:
--  - ลบเฉพาะ column ใน chat_conversations ที่ไม่ได้แสดงในหน้าแชทอีกต่อไป
--  - column ใน loan_requests (occupation, monthly_income ฯลฯ)
--    ยังคงไว้เพราะ SalesFormPage ยังใช้อยู่
--  - column ที่ใช้สำหรับ auto-capture webhook และสร้าง loan request
--    (deed_type, property_type, estimated_value ฯลฯ) ยังคงไว้
-- =========================================================

-- ─── chat_conversations: ลบ column ที่เอาออกจาก UI แล้ว ────────

-- อาชีพ (ย้ายไปอยู่ใน loan_requests แล้ว)
ALTER TABLE chat_conversations
  DROP COLUMN IF EXISTS occupation;

-- วงเงินที่ต้องการ (ลูกค้าพิมพ์มา — ไม่ได้ใช้แล้ว)
ALTER TABLE chat_conversations
  DROP COLUMN IF EXISTS desired_amount;

-- จำนวนภาระหนี้ (ไม่ได้แสดงและไม่มีการบันทึกในหน้าแชท)
ALTER TABLE chat_conversations
  DROP COLUMN IF EXISTS obligation_amount;

-- จำนวนปีสัญญา (ไม่ได้ใช้ในหน้าแชท)
ALTER TABLE chat_conversations
  DROP COLUMN IF EXISTS contract_years;

-- =========================================================
-- ✅ คงไว้ใน chat_conversations:
--   - occupation ลบแล้ว (มีใน loan_requests แทน)
--   - has_obligation คงไว้ (webhook ยังใช้สำหรับ SOP screening)
--   - deed_type, property_type, estimated_value, location_hint,
--     loan_type_detail, intent_type, is_refinance คงไว้
--     (ใช้สำหรับ auto-capture keyword → สร้าง loan request)
--   - monthly_income คงไว้ (webhook ยังอาจใช้)
-- =========================================================

-- =========================================================
--  Migration: เพิ่ม contact fields ใน chat_conversations
--  วันที่: 2026-03-18
--  วิธีรัน: phpMyAdmin → เลือก DB loandd → แท็บ SQL → วาง → Execute
-- =========================================================

-- เพิ่ม Facebook name
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS contact_facebook VARCHAR(300) NULL AFTER customer_email;

-- เพิ่ม LINE ID
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS contact_line VARCHAR(200) NULL AFTER contact_facebook;

-- เพิ่ม province (จังหวัด) — แยกออกจาก location_hint
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS province VARCHAR(100) NULL AFTER contact_line;

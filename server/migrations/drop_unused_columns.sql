-- =====================================================================
-- drop_unused_columns.sql
-- ลบคอลัมน์ที่ไม่ได้ใช้งานและซ้ำซ้อน
--
-- ปลอดภัย: ใช้ IF EXISTS ทุกที่ รันซ้ำได้ไม่ error
-- วิธีรัน: phpMyAdmin → DB loandd_db → SQL → วาง → Go
-- =====================================================================

-- 1. pipeline_stage ใน loan_requests
--    ซ้ำกับ cases.pipeline_stage ซึ่งเป็นตัวที่ใช้จริงทั้งระบบ
ALTER TABLE loan_requests
  DROP COLUMN IF EXISTS pipeline_stage;

-- 2. sentiment ใน chat_conversations
--    มี column แต่ไม่มี code ใช้งานสักที่
ALTER TABLE chat_conversations
  DROP COLUMN IF EXISTS sentiment;

-- 3. google_maps_url ใน loan_requests
--    เปลี่ยนชื่อเป็น location_url แล้ว column นี้ค้างไว้เฉยๆ
ALTER TABLE loan_requests
  DROP COLUMN IF EXISTS google_maps_url;

-- =====================================================================
-- ตรวจสอบหลังรัน:
-- SHOW COLUMNS FROM loan_requests LIKE 'pipeline_stage';    -- ต้องไม่มี
-- SHOW COLUMNS FROM chat_conversations LIKE 'sentiment';    -- ต้องไม่มี
-- SHOW COLUMNS FROM loan_requests LIKE 'google_maps_url';   -- ต้องไม่มี
-- =====================================================================

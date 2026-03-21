-- ============================================================
-- add_screening_extra_fields.sql
-- เพิ่มคอลัมน์ที่ขาดใน loan_requests สำหรับ Screening SOP
-- road_access, seizure_status, road_width, utility_access, flood_risk, estimated_value
-- รัน: phpMyAdmin → เลือก DB loandd_db → แท็บ SQL → วาง → Go
-- ปลอดภัย: ใช้ IF NOT EXISTS รันซ้ำได้ ข้อมูลไม่หาย
-- ============================================================

ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS road_access     VARCHAR(10)   NULL DEFAULT NULL
    COMMENT 'yes=มีทางเข้าออก, no=ที่ดินตาบอด',
  ADD COLUMN IF NOT EXISTS seizure_status  VARCHAR(20)   NULL DEFAULT NULL
    COMMENT 'none=ปลอดภาระ, mortgaged=ติดจำนอง, seized=ถูกอายัด',
  ADD COLUMN IF NOT EXISTS road_width      VARCHAR(20)   NULL DEFAULT NULL
    COMMENT 'lt4=น้อยกว่า4ม, 4to6=4-6ม, gt6=มากกว่า6ม',
  ADD COLUMN IF NOT EXISTS utility_access  VARCHAR(20)   NULL DEFAULT NULL
    COMMENT 'yes=ครบ, partial=บางส่วน, no=ไม่มี',
  ADD COLUMN IF NOT EXISTS flood_risk      VARCHAR(20)   NULL DEFAULT NULL
    COMMENT 'never=ไม่เคย, rarely=นานๆครั้ง, often=บ่อย',
  ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(15,2) NULL DEFAULT NULL
    COMMENT 'ราคาประเมินทรัพย์';

-- ตรวจสอบ:
-- SHOW COLUMNS FROM loan_requests LIKE 'road_%';
-- SHOW COLUMNS FROM loan_requests LIKE 'utility_%';
-- SHOW COLUMNS FROM loan_requests LIKE 'flood_%';
-- SHOW COLUMNS FROM loan_requests LIKE 'estimated_value';

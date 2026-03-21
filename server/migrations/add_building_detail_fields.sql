-- =========================================================
--  add_building_detail_fields.sql
--  เพิ่มฟิลด์รายละเอียดสิ่งปลูกสร้าง (SOP 2.1.5)
--  ใน loan_requests table
--
--  วิธีรัน: phpMyAdmin → เลือก DB loandd_db → แท็บ SQL → วาง → Go
--  ปลอดภัย: ใช้ IF NOT EXISTS ทุกที่ รันซ้ำได้ ข้อมูลไม่หาย
-- =========================================================

ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS building_year           YEAR          NULL DEFAULT NULL COMMENT 'ปีที่ก่อสร้าง (พ.ศ.)',
  ADD COLUMN IF NOT EXISTS floors                  TINYINT       NULL DEFAULT NULL COMMENT 'จำนวนชั้น',
  ADD COLUMN IF NOT EXISTS bedrooms                TINYINT       NULL DEFAULT NULL COMMENT 'จำนวนห้องนอน',
  ADD COLUMN IF NOT EXISTS bathrooms               TINYINT       NULL DEFAULT NULL COMMENT 'จำนวนห้องน้ำ',
  ADD COLUMN IF NOT EXISTS project_name            VARCHAR(255)  NULL DEFAULT NULL COMMENT 'ชื่อโครงการ/หมู่บ้าน',
  ADD COLUMN IF NOT EXISTS rental_rooms            INT           NULL DEFAULT NULL COMMENT 'จำนวนห้องเช่าทั้งหมด (หอพัก/อพาร์ตเมนต์)',
  ADD COLUMN IF NOT EXISTS rental_price_per_month  DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'รายได้ค่าเช่า/เดือน (บาท)';

-- ตรวจสอบผลลัพธ์
-- SHOW COLUMNS FROM loan_requests WHERE Field IN ('building_year','floors','bedrooms','bathrooms','project_name','rental_rooms','rental_price_per_month');

-- =========================================================
--  add_property_detail_and_commission_fields.sql
--  เพิ่มฟิลด์รายละเอียดทรัพย์ (ห้องนอน, ชื่อโครงการ ฯลฯ)
--  และฟิลด์ค่าคอมมิชชั่น + สถานะบุคคลนักลงทุน
--
--  วิธีรัน: phpMyAdmin → DB loandd_db → SQL → วาง → Go
--  ปลอดภัย: ใช้ IF NOT EXISTS ทุกที่ รันซ้ำได้ ข้อมูลไม่หาย
-- =========================================================

-- ===== loan_requests: เพิ่มฟิลด์รายละเอียดทรัพย์ที่ยังขาด =====
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS bedrooms         TINYINT      NULL DEFAULT NULL COMMENT 'จำนวนห้องนอน',
  ADD COLUMN IF NOT EXISTS project_name     VARCHAR(255) NULL DEFAULT NULL COMMENT 'ชื่อโครงการ/หมู่บ้าน';

-- ===== cases: เพิ่มฟิลด์สถานะบุคคลนักลงทุน + ค่าคอมมิชชั่น + สลิป =====
-- ใช้ VARCHAR(50) แทน ENUM เพื่อรองรับ: single, married, divorced, widowed, poa, company
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS investor_marital_status  VARCHAR(50)   NULL DEFAULT NULL COMMENT 'สถานะบุคคลนักลงทุน: single/married/divorced/widowed/poa/company',
  ADD COLUMN IF NOT EXISTS commission_paid          TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'ลูกหนี้โอนค่าคอมให้บริษัทแล้ว (0=ยัง, 1=แล้ว)',
  ADD COLUMN IF NOT EXISTS commission_amount        DECIMAL(12,2) NULL DEFAULT NULL COMMENT 'จำนวนเงินค่าคอมมิชชั่น (บาท)',
  ADD COLUMN IF NOT EXISTS commission_slip          VARCHAR(500)  NULL DEFAULT NULL COMMENT 'ไฟล์สลิปค่าคอมมิชชั่นที่ลูกหนี้โอนให้บริษัท';

-- ===== ตรวจสอบ =====
-- SHOW COLUMNS FROM loan_requests LIKE 'bedrooms';
-- SHOW COLUMNS FROM loan_requests LIKE 'project_name';
-- SHOW COLUMNS FROM cases LIKE 'investor_marital_status';
-- SHOW COLUMNS FROM cases LIKE 'commission_%';

-- =========================================================
--  fix_building_year_type.sql
--  แก้ building_year จาก YEAR → SMALLINT UNSIGNED
--  เหตุผล: MySQL YEAR type รับแค่ ค.ศ. 1901-2155
--          แต่ปี พ.ศ. ที่ผู้ใช้กรอก (เช่น 2558) > 2155
--          ทำให้ MySQL บันทึกเป็น 0000 (ค่าหาย)
--          SMALLINT UNSIGNED รับ 0-65535 ครอบคลุมทุกปี พ.ศ.
--
--  วิธีรัน: phpMyAdmin → DB loandd_db → SQL → วาง → Go
--  ปลอดภัย: MODIFY COLUMN ไม่ลบข้อมูล เพียงเปลี่ยน type
-- =========================================================

ALTER TABLE loan_requests
  MODIFY COLUMN building_year SMALLINT UNSIGNED NULL DEFAULT NULL
  COMMENT 'ปีที่ก่อสร้าง (พ.ศ.) — เปลี่ยนจาก YEAR เพื่อรองรับ พ.ศ. 2500+';

-- ตรวจสอบ
-- SHOW COLUMNS FROM loan_requests LIKE 'building_year';

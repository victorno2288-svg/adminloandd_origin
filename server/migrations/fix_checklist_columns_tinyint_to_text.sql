-- ============================================================
-- fix_checklist_columns_tinyint_to_text.sql
-- ★ CRITICAL FIX: แปลง checklist doc fields จาก TINYINT(1) → TEXT
--
-- ปัญหา: migration เก่า (fix_remaining_tables_missing_columns.sql)
--   สร้างคอลัมน์พวก borrower_id_card, property_photos, deed_copy ฯลฯ
--   เป็น TINYINT(1) สำหรับ checkbox (0/1)
--   แต่ระบบใหม่ใช้คอลัมน์เดิมเก็บ JSON array ของ file paths
--   → MySQL truncate JSON string → 0 ทุกครั้ง → ไฟล์หายหลัง upload
--
-- วิธีรัน: phpMyAdmin → เลือก DB loandd_db → แท็บ SQL → วาง → Go
-- ปลอดภัย: MODIFY COLUMN รันซ้ำได้ (ถ้าเป็น TEXT อยู่แล้วก็ไม่มีผล)
-- ============================================================

-- เอกสารสถานะสมรส
ALTER TABLE loan_requests
  MODIFY COLUMN borrower_id_card  TEXT NULL DEFAULT NULL,
  MODIFY COLUMN house_reg_book    TEXT NULL DEFAULT NULL,
  MODIFY COLUMN name_change_doc   TEXT NULL DEFAULT NULL,
  MODIFY COLUMN divorce_doc       TEXT NULL DEFAULT NULL,
  MODIFY COLUMN spouse_id_card    TEXT NULL DEFAULT NULL,
  MODIFY COLUMN spouse_reg_copy   TEXT NULL DEFAULT NULL,
  MODIFY COLUMN marriage_cert     TEXT NULL DEFAULT NULL,
  MODIFY COLUMN single_cert       TEXT NULL DEFAULT NULL,
  MODIFY COLUMN death_cert        TEXT NULL DEFAULT NULL,
  MODIFY COLUMN will_court_doc    TEXT NULL DEFAULT NULL,
  MODIFY COLUMN testator_house_reg TEXT NULL DEFAULT NULL;

-- เอกสารทรัพย์ (บ้าน/ทาวน์เฮ้าส์/บ้านเดี่ยว)
ALTER TABLE loan_requests
  MODIFY COLUMN deed_copy         TEXT NULL DEFAULT NULL,
  MODIFY COLUMN building_permit   TEXT NULL DEFAULT NULL,
  MODIFY COLUMN house_reg_prop    TEXT NULL DEFAULT NULL,
  MODIFY COLUMN sale_contract     TEXT NULL DEFAULT NULL,
  MODIFY COLUMN debt_free_cert    TEXT NULL DEFAULT NULL,
  MODIFY COLUMN blueprint         TEXT NULL DEFAULT NULL,
  MODIFY COLUMN property_photos   TEXT NULL DEFAULT NULL,
  MODIFY COLUMN land_tax_receipt  TEXT NULL DEFAULT NULL;

-- เอกสารคอนโด
ALTER TABLE loan_requests
  MODIFY COLUMN condo_title_deed  TEXT NULL DEFAULT NULL,
  MODIFY COLUMN condo_location_map TEXT NULL DEFAULT NULL,
  MODIFY COLUMN common_fee_receipt TEXT NULL DEFAULT NULL,
  MODIFY COLUMN floor_plan        TEXT NULL DEFAULT NULL;

-- เอกสารที่ดิน/อาคารพาณิชย์
ALTER TABLE loan_requests
  MODIFY COLUMN location_sketch_map TEXT NULL DEFAULT NULL,
  MODIFY COLUMN land_use_cert     TEXT NULL DEFAULT NULL,
  MODIFY COLUMN rental_contract   TEXT NULL DEFAULT NULL,
  MODIFY COLUMN business_reg      TEXT NULL DEFAULT NULL;

-- ตรวจสอบ:
-- SHOW COLUMNS FROM loan_requests WHERE Field IN
--   ('property_photos','deed_copy','building_permit','borrower_id_card');
-- ต้องเห็น Type = text ทุกตัว

-- ============================================================
-- เพิ่ม columns สำหรับเก็บไฟล์ Property Checklist Docs
-- รันใน phpMyAdmin หรือ MySQL CLI:
--   mysql -u root loandd_db < add_property_checklist_columns.sql
-- ============================================================

ALTER TABLE loan_requests
  -- House / Single House / Townhouse / Shophouse / Land shared
  ADD COLUMN IF NOT EXISTS `deed_copy`           JSON NULL COMMENT 'โฉนดที่ดิน',
  ADD COLUMN IF NOT EXISTS `building_permit`     JSON NULL COMMENT 'ใบอนุญาตก่อสร้าง',
  ADD COLUMN IF NOT EXISTS `house_reg_prop`      JSON NULL COMMENT 'ทะเบียนบ้านของทรัพย์',
  ADD COLUMN IF NOT EXISTS `sale_contract`       JSON NULL COMMENT 'สัญญาซื้อขาย',
  ADD COLUMN IF NOT EXISTS `debt_free_cert`      JSON NULL COMMENT 'ใบปลอดภาระ',
  ADD COLUMN IF NOT EXISTS `blueprint`           JSON NULL COMMENT 'แบบแปลนบ้าน',
  ADD COLUMN IF NOT EXISTS `property_photos`     JSON NULL COMMENT 'รูปถ่ายทรัพย์',
  ADD COLUMN IF NOT EXISTS `land_tax_receipt`    JSON NULL COMMENT 'หลักฐานชำระภาษีที่ดิน',
  ADD COLUMN IF NOT EXISTS `maps_url`            JSON NULL COMMENT 'แผนที่/Google Maps',
  -- Condo
  ADD COLUMN IF NOT EXISTS `condo_title_deed`    JSON NULL COMMENT 'หนังสือกรรมสิทธิ์ห้องชุด',
  ADD COLUMN IF NOT EXISTS `condo_location_map`  JSON NULL COMMENT 'แผนที่ตั้งโครงการ',
  ADD COLUMN IF NOT EXISTS `common_fee_receipt`  JSON NULL COMMENT 'ใบเสร็จค่าส่วนกลาง',
  ADD COLUMN IF NOT EXISTS `floor_plan`          JSON NULL COMMENT 'แปลนห้อง',
  -- Land specific
  ADD COLUMN IF NOT EXISTS `location_sketch_map` JSON NULL COMMENT 'แผนที่สังเขปทำเล',
  ADD COLUMN IF NOT EXISTS `land_use_cert`       JSON NULL COMMENT 'หนังสือรับรองการใช้ประโยชน์',
  -- Shophouse specific
  ADD COLUMN IF NOT EXISTS `rental_contract`     JSON NULL COMMENT 'สัญญาเช่า',
  ADD COLUMN IF NOT EXISTS `business_reg`        JSON NULL COMMENT 'ทะเบียนพาณิชย์';

SELECT 'Done! Property checklist columns added to loan_requests.' AS result;

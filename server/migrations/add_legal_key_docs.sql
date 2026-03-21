-- เพิ่มคอลัมน์เอกสารหลัก 3 รายการที่ฝ่ายนิติกรรมอัพโหลดเอง
ALTER TABLE legal_transactions
  ADD COLUMN IF NOT EXISTS house_reg_prop_legal  VARCHAR(500) NULL DEFAULT NULL COMMENT 'ทะเบียนบ้านทรัพย์ (อัพโหลดโดยฝ่ายนิติ)',
  ADD COLUMN IF NOT EXISTS borrower_id_card_legal VARCHAR(500) NULL DEFAULT NULL COMMENT 'บัตรประชาชนเจ้าของทรัพย์ (อัพโหลดโดยฝ่ายนิติ)';
-- หมายเหตุ: broker_id มีอยู่แล้ว สำหรับบัตรประชาชนนายหน้า

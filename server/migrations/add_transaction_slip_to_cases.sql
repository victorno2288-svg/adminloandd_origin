-- เพิ่ม column สลิปโอนเงินค่าปากถุง ใน cases table
-- เห็นได้โดย: ฝ่ายขาย (อัพโหลด) + ฝ่ายนิติ + ฝ่ายบัญชี
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS transaction_slip TEXT DEFAULT NULL COMMENT 'สลิปโอนเงินค่าปากถุง (ฝ่ายขาย + นิติ + บัญชี)';

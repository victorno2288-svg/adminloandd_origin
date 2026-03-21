-- เพิ่ม fields สำหรับอนุมัติตารางผ่อนชำระ และตารางที่ฝ่ายอนุมัติทำเอง
ALTER TABLE approval_transactions
  ADD COLUMN IF NOT EXISTS payment_schedule_approved TINYINT(1) DEFAULT 0 COMMENT 'ฝ่ายอนุมัติ approve ตารางที่ฝ่ายขายอัพโหลด',
  ADD COLUMN IF NOT EXISTS payment_schedule_approved_at DATETIME DEFAULT NULL COMMENT 'วันเวลาที่อนุมัติ',
  ADD COLUMN IF NOT EXISTS approval_schedule_file TEXT DEFAULT NULL COMMENT 'ตารางที่ฝ่ายอนุมัติทำเอง (แทนของฝ่ายขาย)';

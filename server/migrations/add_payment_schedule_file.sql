-- เพิ่ม payment_schedule_file ใน loan_requests สำหรับฝ่ายขายอัพโหลดตารางผ่อนชำระ
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS payment_schedule_file VARCHAR(500) DEFAULT NULL;

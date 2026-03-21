-- เพิ่ม payment_date ใน loan_requests เพื่อให้ฝ่ายขายบันทึกได้ก่อนสร้างเคส
-- (หลังสร้างเคสแล้วจะใช้ cases.payment_date เป็นหลัก โดย COALESCE ดึงจากทั้งสองที่)

ALTER TABLE loan_requests
  ADD COLUMN payment_date DATE DEFAULT NULL AFTER payment_status;

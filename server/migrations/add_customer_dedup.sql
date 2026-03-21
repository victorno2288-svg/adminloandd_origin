-- Customer Deduplication: เชื่อมลูกค้าที่ทักมาหลาย platform เป็นคนเดียวกัน
-- Run: node run_migration.js add_customer_dedup

-- ตาราง customer_profiles: profile กลางของลูกค้า (ไม่ขึ้นกับ platform)
CREATE TABLE IF NOT EXISTS customer_profiles (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(200) NULL COMMENT 'ชื่อแสดง (อาจดึงจาก conversation)',
  phone        VARCHAR(20)  NULL COMMENT 'เบอร์โทรที่ยืนยันแล้ว',
  note         TEXT         NULL COMMENT 'หมายเหตุ (admin กรอก)',
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- เพิ่ม profile_id ใน chat_conversations
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS profile_id INT NULL COMMENT 'FK → customer_profiles.id' AFTER customer_phone,
  ADD INDEX IF NOT EXISTS idx_profile_id (profile_id);

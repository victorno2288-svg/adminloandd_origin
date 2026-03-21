-- =========================================================
--  LoanDD Migration: Fix Tag System — เพิ่ม columns ที่ขาดหายไป
--  ปัญหา: create_chat_tables.sql ขาด tag_id ใน chat_conversations
--          และ chat_tags ขาด sort_order + created_by
--  วิธีรัน: phpMyAdmin → เลือก DB loandd → SQL → Execute
--  ปลอดภัย: ใช้ IF NOT EXISTS ทุกที่ รันซ้ำได้
-- =========================================================

-- 1. เพิ่ม tag_id ใน chat_conversations (single tag per conversation)
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS tag_id INT NULL COMMENT 'FK → chat_tags.id' AFTER updated_at,
  ADD INDEX IF NOT EXISTS idx_tag_id (tag_id);

-- 2. เพิ่ม sort_order + created_by ใน chat_tags
ALTER TABLE chat_tags
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER text_color,
  ADD COLUMN IF NOT EXISTS created_by INT NULL COMMENT 'admin_users.id' AFTER sort_order,
  ADD INDEX IF NOT EXISTS idx_sort_order (sort_order);

-- 3. อัพเดต sort_order ของ tags ที่ seed ไว้แล้ว (ให้มี order ชัดเจน)
UPDATE chat_tags SET sort_order = 1 WHERE name = 'ทรัพย์เข้าเกณฑ์'    AND sort_order = 0;
UPDATE chat_tags SET sort_order = 2 WHERE name = 'รอโฉนด'             AND sort_order = 0;
UPDATE chat_tags SET sort_order = 3 WHERE name = 'ส่งประเมินแล้ว'     AND sort_order = 0;
UPDATE chat_tags SET sort_order = 4 WHERE name = 'รอตัดสินใจ'         AND sort_order = 0;
UPDATE chat_tags SET sort_order = 5 WHERE name = 'ดอกเบี้ยสูงไป'      AND sort_order = 0;
UPDATE chat_tags SET sort_order = 6 WHERE name = 'ติดภาระสูง'         AND sort_order = 0;
UPDATE chat_tags SET sort_order = 7 WHERE name = 'ทรัพย์ไม่ผ่านเกณฑ์' AND sort_order = 0;
UPDATE chat_tags SET sort_order = 8 WHERE name = 'ลูกค้าหาย'          AND sort_order = 0;
UPDATE chat_tags SET sort_order = 9 WHERE name = 'VIP'                AND sort_order = 0;

-- 4. เพิ่ม tags ใหม่ที่จำเป็นสำหรับ auto-tagging
INSERT IGNORE INTO chat_tags (name, bg_color, text_color, sort_order) VALUES
  ('ส่งโฉนดแล้ว',      '#dbeafe', '#1e40af', 10),
  ('ทรัพย์ไม่รับ',     '#fee2e2', '#991b1b', 11),
  ('รีไฟแนนซ์',        '#fce7f3', '#9d174d', 12),
  ('ขายฝาก',           '#ecfdf5', '#065f46', 13),
  ('จำนอง',            '#eff6ff', '#1e40af', 14);

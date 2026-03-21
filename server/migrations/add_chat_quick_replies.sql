-- =========================================================
--  Migration: สร้างตาราง chat_quick_replies
--  ข้อความตอบกลับด่วน (Quick Reply Templates)
--  วิธีรัน: phpMyAdmin → เลือก DB loandd → แท็บ SQL → วาง → Execute
-- =========================================================

CREATE TABLE IF NOT EXISTS chat_quick_replies (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200)  NOT NULL            COMMENT 'ชื่อ template (สำหรับ dropdown)',
  content     TEXT          NOT NULL            COMMENT 'เนื้อหาข้อความ',
  is_global   TINYINT(1)    NOT NULL DEFAULT 0  COMMENT '1 = ทุกคนใช้ได้, 0 = เฉพาะตัวเอง',
  created_by  INT           NULL                COMMENT 'admin_users.id',
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qr_global     (is_global),
  INDEX idx_qr_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตัวอย่าง Quick Replies เริ่มต้น (global)
INSERT IGNORE INTO chat_quick_replies (title, content, is_global, sort_order) VALUES
('ทักทาย', 'สวัสดีครับ/ค่ะ ยินดีให้บริการ มีอะไรให้ช่วยเหลือได้บ้างครับ/ค่ะ 😊', 1, 1),
('ขอโทษที่รอ', 'ขออภัยที่ทำให้รอนานนะครับ/ค่ะ ขอตรวจสอบข้อมูลสักครู่นะครับ/ค่ะ', 1, 2),
('ขอเบอร์ติดต่อ', 'กรุณาแจ้งเบอร์โทรศัพท์เพื่อให้ทีมงานติดต่อกลับได้นะครับ/ค่ะ', 1, 3),
('ขอรูปโฉนด', 'กรุณาส่งรูปโฉนดที่ดิน (ด้านหน้า) มาให้ทีมงานประเมินเบื้องต้นด้วยนะครับ/ค่ะ', 1, 4),
('แจ้งเงื่อนไข', 'ทรัพย์ที่รับ: บ้านเดี่ยว คอนโด อาคารพาณิชย์ ที่ดิน (โฉนด/น.ส.4ก) วงเงินเริ่มต้น 500,000 บาท ขึ้นไปครับ/ค่ะ', 1, 5),
('ปิดการสนทนา', 'ขอบคุณที่ให้ความสนใจครับ/ค่ะ หากมีข้อสงสัยสามารถติดต่อกลับมาได้เสมอนะครับ/ค่ะ 🙏', 1, 6);

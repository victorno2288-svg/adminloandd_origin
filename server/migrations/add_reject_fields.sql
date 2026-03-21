-- Migration: เพิ่มฟิลด์ Reject & Feedback ใน loan_requests
-- วันที่: 2026-03-10

ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS `reject_category` VARCHAR(100) NULL COMMENT 'หมวดหมู่เหตุผลที่ไม่ผ่าน',
  ADD COLUMN IF NOT EXISTS `reject_alternative` VARCHAR(100) NULL COMMENT 'ทางเลือกที่แนะนำหลังไม่ผ่าน';

-- Index สำหรับ query สถิติ
ALTER TABLE loan_requests
  ADD INDEX IF NOT EXISTS `idx_reject_category` (`reject_category`);

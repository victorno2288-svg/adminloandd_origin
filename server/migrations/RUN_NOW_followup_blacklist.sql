-- ============================================================
-- 🚀 RUN THIS IN phpMyAdmin → loandd_db
-- Follow-up Reminder + Blacklist Migration
-- ============================================================

-- 1) เพิ่มคอลัมน์ใน chat_conversations (safe — IF NOT EXISTS)
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS next_follow_up_at    DATETIME NULL DEFAULT NULL
    COMMENT 'วันนัด follow-up ครั้งถัดไป',
  ADD COLUMN IF NOT EXISTS followup_note        TEXT     NULL DEFAULT NULL
    COMMENT 'โน้ต follow-up ล่าสุด',
  ADD COLUMN IF NOT EXISTS followup_reminded_at DATETIME NULL DEFAULT NULL
    COMMENT 'เวลาที่ส่ง reminder ล่าสุดแล้ว (ป้องกัน spam)',
  ADD COLUMN IF NOT EXISTS is_blacklisted       TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = เบอร์นี้ถูก blacklist';

ALTER TABLE chat_conversations
  ADD INDEX IF NOT EXISTS idx_next_followup (next_follow_up_at);

-- 2) สร้างตาราง customer_blacklists (ถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS customer_blacklists (
  id            INT NOT NULL AUTO_INCREMENT,
  phone         VARCHAR(20) NOT NULL COMMENT 'เบอร์โทรที่ blacklist',
  reason        TEXT NULL             COMMENT 'เหตุผลที่ blacklist',
  added_by      INT NULL              COMMENT 'admin_users.id ที่เพิ่ม',
  added_by_name VARCHAR(100) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bl_phone (phone),
  KEY idx_bl_phone  (phone),
  KEY idx_bl_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT 'รายการเบอร์โทรที่ถูก blacklist';

-- ✅ ตรวจสอบผล
SHOW COLUMNS FROM chat_conversations LIKE '%follow%';
SHOW COLUMNS FROM chat_conversations LIKE '%blacklist%';
SHOW TABLES LIKE 'customer_blacklists';

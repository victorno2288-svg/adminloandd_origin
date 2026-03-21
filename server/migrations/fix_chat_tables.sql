-- =========================================================
--  LoanDD Migration: Fix Chat Tables
--  วิธีรัน: phpMyAdmin → เลือก DB loandd → แท็บ SQL → วาง → Execute
--  ปลอดภัย: ใช้ IF EXISTS / IF NOT EXISTS ทุกที่
-- =========================================================

-- ─────────────────────────────────────────────────────────
-- STEP 1: ลบตารางใหม่ที่สร้างไปโดยไม่ตั้งใจ
-- ─────────────────────────────────────────────────────────
DROP TABLE IF EXISTS chat_conversation_tags;
DROP TABLE IF EXISTS chat_followups;

-- ─────────────────────────────────────────────────────────
-- STEP 2: เพิ่มคอลัมน์ใหม่เข้า chat_conversations (ที่มีอยู่แล้ว)
--   ใช้ ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--   → ปลอดภัย: ถ้ามีอยู่แล้วก็ไม่ทำซ้ำ, ข้อมูลเดิมไม่หาย
-- ─────────────────────────────────────────────────────────
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS is_dead          TINYINT(1)   NOT NULL DEFAULT 0   COMMENT 'Dead Lead flag',
  ADD COLUMN IF NOT EXISTS dead_reason      VARCHAR(300) NULL                 COMMENT 'เหตุผลที่ Dead',
  ADD COLUMN IF NOT EXISTS dead_at          DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS follow_up_count  INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_follow_up_at DATETIME    NULL,
  ADD INDEX IF NOT EXISTS idx_chat_conv_is_dead (is_dead);

-- ─────────────────────────────────────────────────────────
-- STEP 3: สร้างตาราง chat_followups ใหม่ (version ที่ถูกต้อง)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_followups (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id  INT NOT NULL,
  agent_id         INT NULL COMMENT 'admin_users.id',
  agent_name       VARCHAR(100) NULL,
  followup_type    ENUM('chat','call','note','line_msg','facebook_msg') NOT NULL DEFAULT 'note',
  note             TEXT NULL,
  response_time_min INT NULL COMMENT 'นาทีที่ตอบกลับหลังจากลูกค้าทัก',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cf_conv_id (conversation_id),
  INDEX idx_cf_agent_id (agent_id),
  INDEX idx_cf_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

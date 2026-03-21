-- ============================================================
-- Fix: เพิ่มคอลัมน์ที่ขาดใน chat_conversations
-- Error แก้:
--   Unknown column 'c.is_dead'          → SLA Monitor / getConversations
--   Unknown column 'c.next_follow_up_at' → FollowupReminder
--   Unknown column 'lead_quality'        → Ghost Detect
--   Unknown column 'c.last_message_from' → Dashboard chatWaiting
-- ============================================================

-- 1) Dead Leads
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS is_dead      TINYINT(1)   NOT NULL DEFAULT 0   AFTER status,
  ADD COLUMN IF NOT EXISTS dead_reason  VARCHAR(255)  NULL DEFAULT NULL    AFTER is_dead,
  ADD COLUMN IF NOT EXISTS dead_at      DATETIME      NULL DEFAULT NULL    AFTER dead_reason;

-- 2) Lead Quality / Ghost Detection
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS lead_quality       VARCHAR(20)  NULL DEFAULT 'unknown'  AFTER dead_at,
  ADD COLUMN IF NOT EXISTS ghost_detected_at  DATETIME     NULL DEFAULT NULL       AFTER lead_quality;

-- 3) First Response SLA
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS first_response_at      DATETIME     NULL DEFAULT NULL  AFTER ghost_detected_at,
  ADD COLUMN IF NOT EXISTS first_response_by      VARCHAR(100) NULL DEFAULT NULL  AFTER first_response_at,
  ADD COLUMN IF NOT EXISTS first_response_seconds INT          NULL DEFAULT NULL  AFTER first_response_by;

-- 4) Last Replied By (admin)
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS last_replied_by_id    INT          NULL DEFAULT NULL  AFTER first_response_seconds,
  ADD COLUMN IF NOT EXISTS last_replied_by_name  VARCHAR(100) NULL DEFAULT NULL  AFTER last_replied_by_id;

-- 5) Last Message From (สำหรับ chatWaiting dashboard)
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS last_message_from  VARCHAR(20) NULL DEFAULT NULL  AFTER last_message_at;

-- 6) Follow-up Tracking
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS follow_up_count       INT      NOT NULL DEFAULT 0  AFTER last_message_from,
  ADD COLUMN IF NOT EXISTS last_follow_up_at     DATETIME NULL DEFAULT NULL   AFTER follow_up_count,
  ADD COLUMN IF NOT EXISTS next_follow_up_at     DATETIME NULL DEFAULT NULL   AFTER last_follow_up_at,
  ADD COLUMN IF NOT EXISTS followup_note         TEXT     NULL DEFAULT NULL   AFTER next_follow_up_at,
  ADD COLUMN IF NOT EXISTS followup_reminded_at  DATETIME NULL DEFAULT NULL   AFTER followup_note;

-- 7) Customer Extra Info
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS customer_email   VARCHAR(255)    NULL DEFAULT NULL  AFTER customer_phone,
  ADD COLUMN IF NOT EXISTS occupation       VARCHAR(100)    NULL DEFAULT NULL  AFTER customer_email,
  ADD COLUMN IF NOT EXISTS monthly_income   DECIMAL(15,2)   NULL DEFAULT NULL  AFTER occupation,
  ADD COLUMN IF NOT EXISTS desired_amount   DECIMAL(15,2)   NULL DEFAULT NULL  AFTER monthly_income;

-- 8) Tag & Linked Profile
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS tag_id             INT  NULL DEFAULT NULL  AFTER desired_amount,
  ADD COLUMN IF NOT EXISTS linked_profile_id  INT  NULL DEFAULT NULL  AFTER tag_id;

-- 9) Blacklist
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS is_blacklisted  TINYINT(1) NOT NULL DEFAULT 0  AFTER linked_profile_id;

-- 10) Indexes
ALTER TABLE chat_conversations
  ADD INDEX IF NOT EXISTS idx_is_dead       (is_dead),
  ADD INDEX IF NOT EXISTS idx_lead_quality  (lead_quality),
  ADD INDEX IF NOT EXISTS idx_next_followup (next_follow_up_at),
  ADD INDEX IF NOT EXISTS idx_tag_id        (tag_id);

SELECT 'chat_conversations migration done!' AS result;

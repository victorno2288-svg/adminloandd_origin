-- =====================================================
-- FEATURE: SLA Tracking + Sentiment
-- รัน: phpMyAdmin → loandd_db → SQL
-- =====================================================

-- 1. SLA: บันทึกเวลาตอบแรกของ admin
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS first_response_at DATETIME NULL COMMENT 'เวลาที่ admin ตอบครั้งแรก',
  ADD COLUMN IF NOT EXISTS first_response_by INT NULL COMMENT 'admin_users.id ที่ตอบครั้งแรก',
  ADD COLUMN IF NOT EXISTS first_response_seconds INT NULL COMMENT 'กี่วินาทีจาก created_at ถึง first_response_at';

-- 2. Sentiment: วิเคราะห์อารมณ์ลูกค้า
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS sentiment ENUM('positive','neutral','negative') DEFAULT NULL COMMENT 'ความรู้สึกลูกค้า';

-- 3. Index สำหรับ dashboard queries
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS resolved_at DATETIME NULL COMMENT 'เวลาที่ปิดเคส';

CREATE INDEX IF NOT EXISTS idx_conv_first_response ON chat_conversations(first_response_at);
CREATE INDEX IF NOT EXISTS idx_conv_sentiment ON chat_conversations(sentiment);
CREATE INDEX IF NOT EXISTS idx_conv_created ON chat_conversations(created_at);

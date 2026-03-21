-- =====================================================================
-- drop_duplicate_columns.sql
-- ลบคอลัมน์เก่าที่ซ้ำซ้อนหลังจาก MASTER_MIGRATION ย้ายข้อมูลแล้ว
--
-- ⚠️ รันก่อน: ตรวจสอบว่า MASTER_MIGRATION_ALL.sql รันสำเร็จแล้ว
--    และข้อมูลในคอลัมน์ใหม่ครบถ้วนแล้ว
--
-- วิธีรัน: phpMyAdmin → DB loandd_db → SQL → วาง → Go
-- =====================================================================

-- =====================================================================
-- 1. chat_messages — ลบคอลัมน์เก่าที่ถูก migrate ไปยังชื่อใหม่แล้ว
--    content         → message_text       (ย้ายแล้วใน MASTER_MIGRATION)
--    file_url        → attachment_url     (ย้ายแล้วใน MASTER_MIGRATION)
--    platform_msg_id → platform_message_id (ย้ายแล้วใน MASTER_MIGRATION)
--    timestamp       → created_at        (ย้ายแล้วใน MASTER_MIGRATION)
-- =====================================================================

DROP PROCEDURE IF EXISTS _drop_chat_messages_old_cols;
DELIMITER $$
CREATE PROCEDURE _drop_chat_messages_old_cols()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'content'
  ) THEN
    ALTER TABLE chat_messages DROP COLUMN `content`;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'file_url'
  ) THEN
    ALTER TABLE chat_messages DROP COLUMN `file_url`;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'platform_msg_id'
  ) THEN
    ALTER TABLE chat_messages DROP COLUMN `platform_msg_id`;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'timestamp'
  ) THEN
    ALTER TABLE chat_messages DROP COLUMN `timestamp`;
  END IF;
END$$
DELIMITER ;
CALL _drop_chat_messages_old_cols();
DROP PROCEDURE IF EXISTS _drop_chat_messages_old_cols;

-- =====================================================================
-- หมายเหตุ: ถ้าต้องการลบคอลัมน์อื่นเพิ่มเติม สามารถเพิ่มได้ที่นี่
-- ตัวอย่าง pattern:
--   ALTER TABLE <table> DROP COLUMN IF EXISTS <column>;
-- =====================================================================

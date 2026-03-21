-- =========================================================
--  FEATURE_BATCH_6.sql
--  Features: Round-Robin, LTV, Broker Contract, Property Fields,
--            Ghost Chat, Ad Source Tracking
--  วิธีรัน: phpMyAdmin → loandd_db → SQL tab → วาง → Go
--  ปลอดภัย: IF NOT EXISTS ทุกที่ รันซ้ำได้
-- =========================================================

-- ─────────────────────────────────────────────
-- 1) Round-Robin: rr_active flag บน admin_users
-- ─────────────────────────────────────────────
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS rr_active TINYINT(1) NOT NULL DEFAULT 1
    COMMENT '1=เข้าร่วม round-robin auto-assign, 0=ออกจากวงจร';

-- ─────────────────────────────────────────────
-- 2) Broker Contract Tracking บน loan_requests
-- ─────────────────────────────────────────────
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS broker_contract_sent_at DATETIME NULL DEFAULT NULL
    COMMENT 'เวลาที่ส่งสัญญานายหน้าให้ลูกค้า',
  ADD COLUMN IF NOT EXISTS broker_contract_signed_at DATETIME NULL DEFAULT NULL
    COMMENT 'เวลาที่ลูกค้าเซ็นสัญญากลับมา',
  ADD COLUMN IF NOT EXISTS broker_contract_email VARCHAR(200) NULL DEFAULT NULL
    COMMENT 'Email ที่ส่งสัญญาไป',
  ADD COLUMN IF NOT EXISTS broker_contract_file VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'ไฟล์สัญญาที่เซ็นแล้ว';

-- ─────────────────────────────────────────────
-- 3) Property Extra Fields บน loan_requests
-- ─────────────────────────────────────────────
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS google_maps_url VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'Google Maps URL ของทรัพย์',
  ADD COLUMN IF NOT EXISTS bathrooms TINYINT NULL DEFAULT NULL
    COMMENT 'จำนวนห้องน้ำ',
  ADD COLUMN IF NOT EXISTS floors TINYINT NULL DEFAULT NULL
    COMMENT 'จำนวนชั้น',
  ADD COLUMN IF NOT EXISTS rental_rooms INT NULL DEFAULT NULL
    COMMENT 'หอพัก: จำนวนห้องให้เช่า',
  ADD COLUMN IF NOT EXISTS rental_price_per_month DECIMAL(10,2) NULL DEFAULT NULL
    COMMENT 'หอพัก: ราคาเช่าต่อห้องต่อเดือน',
  ADD COLUMN IF NOT EXISTS building_permit_url VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'URL/ไฟล์ใบอนุญาตสิ่งปลูกสร้าง',
  ADD COLUMN IF NOT EXISTS building_year YEAR NULL DEFAULT NULL
    COMMENT 'ปีที่สร้าง (ค.ศ.)',
  ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(15,2) NULL DEFAULT NULL
    COMMENT 'ราคาประเมินทรัพย์ (สำหรับคำนวณ LTV)';

-- ─────────────────────────────────────────────
-- 4) Ghost Chat / Lead Quality บน chat_conversations
-- ─────────────────────────────────────────────
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS lead_quality ENUM('unknown','ghost','unqualified','qualified','hot') NOT NULL DEFAULT 'unknown'
    COMMENT 'คุณภาพ lead: ghost=ทักมาแล้วหาย, unqualified=ไม่ผ่านเกณฑ์, qualified=เข้าเกณฑ์, hot=สนใจมาก',
  ADD COLUMN IF NOT EXISTS ghost_detected_at DATETIME NULL DEFAULT NULL
    COMMENT 'เวลาที่ตรวจพบว่าเป็น ghost chat';

-- ─────────────────────────────────────────────
-- 5) Ad Source / Campaign Tracking บน chat_conversations
-- ─────────────────────────────────────────────
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100) NULL DEFAULT NULL
    COMMENT 'แหล่งที่มา: facebook, line, google',
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100) NULL DEFAULT NULL
    COMMENT 'ช่องทาง: cpc, messenger, organic',
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(200) NULL DEFAULT NULL
    COMMENT 'ชื่อแคมเปญ',
  ADD COLUMN IF NOT EXISTS utm_ad_set VARCHAR(200) NULL DEFAULT NULL
    COMMENT 'Ad Set name',
  ADD COLUMN IF NOT EXISTS utm_ad VARCHAR(200) NULL DEFAULT NULL
    COMMENT 'Ad name หรือ ad_id',
  ADD COLUMN IF NOT EXISTS fb_ad_id VARCHAR(100) NULL DEFAULT NULL
    COMMENT 'Facebook Ad ID (จาก referral event)',
  ADD COLUMN IF NOT EXISTS line_ref VARCHAR(200) NULL DEFAULT NULL
    COMMENT 'LINE ref parameter (จาก CTA/LIFF)';

-- ─────────────────────────────────────────────
-- 6) Index สำหรับ query performance
-- ─────────────────────────────────────────────
ALTER TABLE chat_conversations
  ADD INDEX IF NOT EXISTS idx_lead_quality (lead_quality),
  ADD INDEX IF NOT EXISTS idx_utm_campaign (utm_campaign(100)),
  ADD INDEX IF NOT EXISTS idx_utm_source (utm_source);

-- ─────────────────────────────────────────────
-- 7) estimated_value ใน chat_conversations ด้วย
--    (ใช้ใน LTV Calculator ถ้าแชทยังไม่มี loan_request)
-- ─────────────────────────────────────────────
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS estimated_value_chat DECIMAL(15,2) NULL DEFAULT NULL
    COMMENT 'ราคาประเมินเบื้องต้นที่ sales กรอกตอนแชท (ก่อนสร้างเคส)';

-- ─────────────────────────────────────────────
-- ✅ เสร็จ
-- ─────────────────────────────────────────────

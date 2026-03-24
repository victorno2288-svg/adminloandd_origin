-- ============================================================
-- loandd_migration_all.sql
-- ✅ ปลอดภัย: import ซ้ำได้ ไม่มี DROP TABLE ไม่มีลบข้อมูล
-- ✅ IF NOT EXISTS ทุกที่ — อันไหนมีแล้วข้ามอัตโนมัติ
-- วิธีใช้: phpMyAdmin → เลือก loandd_db → Import → เลือกไฟล์นี้ → Go
-- Server: MariaDB 10.4+ (XAMPP)
-- อัพเดตล่าสุด: 2026-03-24
-- ============================================================

SET NAMES utf8mb4;
SET SQL_MODE = '';

-- ══════════════════════════════════════════════════════════════
-- ส่วนที่ 1: auction_transactions
-- สร้างถ้ายังไม่มี + เพิ่ม column ที่เพิ่มทีหลัง
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `auction_transactions` (
  `id`                      int(11)       NOT NULL AUTO_INCREMENT,
  `case_id`                 int(11)       NOT NULL,
  `investor_id`             int(11)       DEFAULT NULL,
  `investor_name`           varchar(200)  DEFAULT NULL,
  `investor_code`           varchar(50)   DEFAULT NULL,
  `investor_phone`          varchar(50)   DEFAULT NULL,
  `investor_type`           enum('corporate','individual') DEFAULT NULL,
  `property_value`          decimal(15,2) DEFAULT NULL,
  `selling_pledge_amount`   decimal(15,2) DEFAULT NULL,
  `interest_rate`           decimal(10,2) DEFAULT NULL,
  `auction_land_area`       varchar(100)  DEFAULT NULL,
  `contract_years`          int(11)       DEFAULT NULL,
  `house_reg_book`          text          DEFAULT NULL,
  `house_reg_book_legal`    text          DEFAULT NULL,
  `name_change_doc`         text          DEFAULT NULL,
  `divorce_doc`             text          DEFAULT NULL,
  `spouse_consent_doc`      text          DEFAULT NULL,
  `spouse_id_card`          text          DEFAULT NULL,
  `spouse_reg_copy`         text          DEFAULT NULL,
  `marriage_cert`           text          DEFAULT NULL,
  `spouse_name_change_doc`  text          DEFAULT NULL,
  `borrower_id_card`        text          DEFAULT NULL,
  `single_cert`             text          DEFAULT NULL,
  `death_cert`              text          DEFAULT NULL,
  `will_court_doc`          text          DEFAULT NULL,
  `testator_house_reg`      text          DEFAULT NULL,
  `is_cancelled`            tinyint(1)    DEFAULT 0,
  `auction_status`          enum('pending','auctioned','cancelled') DEFAULT 'pending',
  `recorded_by`             varchar(100)  DEFAULT NULL,
  `recorded_at`             datetime      DEFAULT NULL,
  `created_at`              timestamp     NOT NULL DEFAULT current_timestamp(),
  `updated_at`              timestamp     NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sale_type`               varchar(50)   DEFAULT NULL,
  `bank_name`               varchar(200)  DEFAULT NULL,
  `bank_account_no`         varchar(100)  DEFAULT NULL,
  `bank_account_name`       varchar(200)  DEFAULT NULL,
  `transfer_slip`           varchar(500)  DEFAULT NULL,
  `land_transfer_date`      date          DEFAULT NULL,
  `land_transfer_time`      varchar(20)   DEFAULT NULL,
  `land_transfer_location`  varchar(500)  DEFAULT NULL,
  `land_transfer_note`      text          DEFAULT NULL,
  `bank_book_file`          varchar(500)  DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=Aria DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- เพิ่ม column ที่เพิ่มทีหลัง (ถ้า table เก่าที่ยังไม่มี)
ALTER TABLE `auction_transactions`
  ADD COLUMN IF NOT EXISTS `sale_type`              varchar(50)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bank_name`              varchar(200)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bank_account_no`        varchar(100)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bank_account_name`      varchar(200)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `transfer_slip`          varchar(500)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `land_transfer_date`     date          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `land_transfer_time`     varchar(20)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `land_transfer_location` varchar(500)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `land_transfer_note`     text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bank_book_file`         varchar(500)  DEFAULT NULL;

-- กู้ข้อมูล backup 8 rows (INSERT IGNORE = ข้ามถ้า id ซ้ำ)
INSERT IGNORE INTO `auction_transactions`
  (`id`,`case_id`,`investor_id`,`investor_name`,`investor_code`,`investor_phone`,
   `investor_type`,`property_value`,`selling_pledge_amount`,`interest_rate`,
   `auction_land_area`,`contract_years`,
   `house_reg_book`,`house_reg_book_legal`,
   `is_cancelled`,`auction_status`,`recorded_by`,`recorded_at`,
   `created_at`,`updated_at`,`sale_type`,
   `bank_name`,`bank_account_no`,`bank_account_name`,
   `transfer_slip`,`land_transfer_date`,`land_transfer_time`,
   `land_transfer_location`,`land_transfer_note`,`bank_book_file`)
VALUES
(1,1,3,'พี่เป้','CAP0001','000000000','individual',50000.00,50000.00,40.00,'123456',2004,NULL,NULL,1,'cancelled','ทาย','2026-02-18 02:32:00','2026-02-18 23:30:12','2026-02-20 20:58:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(2,2,4,'มะเมียมะมะมะเมีย','CAP0002','1245677874','corporate',7777.00,8888.00,6666.00,'5555',2998,NULL,NULL,0,'auctioned','f',NULL,'2026-02-22 19:48:29','2026-02-26 01:30:44',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(3,4,4,'มะเมียมะมะมะเมีย','CAP0002','1245677874',NULL,6666666.00,66566.00,0.50,'777777',9999,NULL,NULL,0,'auctioned','g',NULL,'2026-02-24 21:08:19','2026-02-24 21:08:55',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(4,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'auctioned',NULL,NULL,'2026-02-24 21:38:06','2026-02-24 22:01:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(5,6,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'auctioned',NULL,NULL,'2026-02-25 03:09:43','2026-02-25 03:09:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(6,7,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,'pending',NULL,NULL,'2026-02-26 19:55:21','2026-02-26 19:55:21',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(7,8,3,'พี่เป้','CAP0001','000000000','corporate',400000000000.00,4000.00,40.00,'50000',3,'["uploads/auction-docs/1772181091809-359.jpg"]','["uploads/auction-docs/1772181095651-665.jpg"]',0,'auctioned','ระบบ','2026-03-16 14:28:30','2026-02-27 01:31:21','2026-03-16 00:28:30','direct',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(8,9,4,'มะเมียมะมะมะเมีย','CAP0002','1245677874','individual',600000.00,50.00,60.00,'69',3,'["uploads/auction-docs/1772183271018-102.jpg"]','["uploads/auction-docs/1772183273539-654.jpg"]',0,'auctioned','f','2026-02-27 16:09:00','2026-02-27 02:01:12','2026-02-27 02:09:06',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- ══════════════════════════════════════════════════════════════
-- ส่วนที่ 2: loan_requests — เพิ่ม column เอกสาร checklist
-- (เพิ่มครั้งแรกหลัง launch ฟีเจอร์ checklist)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE `loan_requests`
  -- เอกสารสถานะสมรส
  ADD COLUMN IF NOT EXISTS `marital_status`       enum('single','married_reg','married_unreg','divorced','inherited') DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `borrower_id_card`     TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `house_reg_book`       TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `name_change_doc`      TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `divorce_doc`          TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `spouse_id_card`       TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `spouse_reg_copy`      TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `marriage_cert`        TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `single_cert`          TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `death_cert`           TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `will_court_doc`       TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `testator_house_reg`   TEXT NULL DEFAULT NULL,
  -- เอกสารทรัพย์สิน
  ADD COLUMN IF NOT EXISTS `deed_copy`            TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `building_permit`      TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `house_reg_prop`       TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `sale_contract`        TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `debt_free_cert`       TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `blueprint`            TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `property_photos`      TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `land_tax_receipt`     TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `maps_url`             TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `condo_title_deed`     TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `condo_location_map`   TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `common_fee_receipt`   TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `floor_plan`           TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `location_sketch_map`  TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `land_use_cert`        TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rental_contract`      TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `business_reg`         TEXT NULL DEFAULT NULL,
  -- เพิ่มเติม
  ADD COLUMN IF NOT EXISTS `property_video`       TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `prop_checklist_json`  TEXT NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `checklist_ticks_json` TEXT NULL DEFAULT NULL,
  -- บัญชีธนาคารลูกหนี้ (ฝ่ายนิติกรรมกรอก)
  ADD COLUMN IF NOT EXISTS `bank_name`            varchar(100)  DEFAULT NULL COMMENT 'ชื่อธนาคาร',
  ADD COLUMN IF NOT EXISTS `bank_account_number`  varchar(50)   DEFAULT NULL COMMENT 'เลขบัญชีธนาคาร',
  ADD COLUMN IF NOT EXISTS `bank_account_name`    varchar(255)  DEFAULT NULL COMMENT 'ชื่อบัญชีธนาคารลูกหนี้',
  ADD COLUMN IF NOT EXISTS `bank_book_file`       varchar(500)  DEFAULT NULL COMMENT 'ไฟล์สมุดบัญชี';

-- แก้ type → TEXT (migration เก่าอาจสร้างเป็น TINYINT)
-- MODIFY COLUMN รันซ้ำได้ปลอดภัย — ถ้าเป็น TEXT อยู่แล้วก็ OK
ALTER TABLE `loan_requests`
  MODIFY COLUMN `borrower_id_card`    TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `house_reg_book`      TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `name_change_doc`     TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `divorce_doc`         TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `spouse_id_card`      TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `spouse_reg_copy`     TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `marriage_cert`       TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `single_cert`         TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `death_cert`          TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `will_court_doc`      TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `testator_house_reg`  TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `deed_copy`           TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `building_permit`     TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `house_reg_prop`      TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `sale_contract`       TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `debt_free_cert`      TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `blueprint`           TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `property_photos`     TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `land_tax_receipt`    TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `maps_url`            TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `condo_title_deed`    TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `condo_location_map`  TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `common_fee_receipt`  TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `floor_plan`          TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `location_sketch_map` TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `land_use_cert`       TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `rental_contract`     TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `business_reg`        TEXT NULL DEFAULT NULL,
  MODIFY COLUMN `property_video`      TEXT NULL DEFAULT NULL;

-- ══════════════════════════════════════════════════════════════
-- ส่วนที่ 3: legal_transactions — doc_checklist_json
-- ══════════════════════════════════════════════════════════════

ALTER TABLE `legal_transactions`
  ADD COLUMN IF NOT EXISTS `doc_checklist_json`     TEXT NULL DEFAULT NULL COMMENT 'JSON — SOP checklist tick state สำหรับฝ่ายนิติกรรม',
  ADD COLUMN IF NOT EXISTS `house_reg_prop_legal`   varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `borrower_id_card_legal` varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `closing_check_schedule` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `closing_check_personal` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `closing_check_legal`    tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `closing_check_docs`     tinyint(1) DEFAULT 0,
  -- บัญชีนายหน้า
  ADD COLUMN IF NOT EXISTS `agent_bank_name`         varchar(100) DEFAULT NULL COMMENT 'ธนาคารนายหน้า',
  ADD COLUMN IF NOT EXISTS `agent_bank_account_no`   varchar(50)  DEFAULT NULL COMMENT 'เลขบัญชีนายหน้า',
  ADD COLUMN IF NOT EXISTS `agent_bank_account_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อบัญชีนายหน้า',
  ADD COLUMN IF NOT EXISTS `agent_payment_slip`      varchar(500) DEFAULT NULL COMMENT 'สลิปค่านายหน้า',
  ADD COLUMN IF NOT EXISTS `agent_bank_book`         varchar(500) DEFAULT NULL COMMENT 'หน้าสมุดบัญชีนายหน้า',
  -- Financial Protocol
  ADD COLUMN IF NOT EXISTS `net_payout`              decimal(15,2) DEFAULT NULL COMMENT 'ยอดโอนสุทธิ',
  ADD COLUMN IF NOT EXISTS `payment_method`          varchar(50)  DEFAULT NULL COMMENT 'transfer|cash|cheque',
  ADD COLUMN IF NOT EXISTS `actual_transfer_fee`     decimal(15,2) DEFAULT NULL COMMENT 'ค่าโอนจริง',
  ADD COLUMN IF NOT EXISTS `actual_stamp_duty`       decimal(15,2) DEFAULT NULL COMMENT 'อากรแสตมป์จริง';

-- ══════════════════════════════════════════════════════════════
-- ส่วนที่ 4: approval_transactions — columns เพิ่มทีหลัง
-- ══════════════════════════════════════════════════════════════

ALTER TABLE `approval_transactions`
  ADD COLUMN IF NOT EXISTS `credit_table_file2`          TEXT         DEFAULT NULL COMMENT 'ตารางวงเงินไฟล์ที่ 2',
  ADD COLUMN IF NOT EXISTS `payment_schedule_approved`   tinyint(1)   DEFAULT 0   COMMENT 'ฝ่ายอนุมัติ approve ตารางที่ฝ่ายขายอัพโหลด',
  ADD COLUMN IF NOT EXISTS `payment_schedule_approved_at` datetime    DEFAULT NULL COMMENT 'วันเวลาที่อนุมัติ',
  ADD COLUMN IF NOT EXISTS `approval_schedule_file`      TEXT         DEFAULT NULL COMMENT 'ตารางที่ฝ่ายอนุมัติทำเอง';

-- ══════════════════════════════════════════════════════════════
-- ส่วนที่ 5: cases — columns เพิ่มทีหลัง
-- ══════════════════════════════════════════════════════════════

ALTER TABLE `cases`
  ADD COLUMN IF NOT EXISTS `investor_marital_status`      varchar(50)   DEFAULT NULL COMMENT 'สถานะบุคคลนักลงทุน',
  ADD COLUMN IF NOT EXISTS `contract_start_date`          date          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `contract_end_date`            date          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `contract_redemption_amount`   decimal(15,2) DEFAULT NULL COMMENT 'ยอดสินไถ่',
  ADD COLUMN IF NOT EXISTS `transaction_slip`             text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `advance_slip`                 varchar(500)  DEFAULT NULL COMMENT 'สลิปค่าหักล่วงหน้า',
  ADD COLUMN IF NOT EXISTS `commission_paid`              tinyint(1)    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `commission_amount`            decimal(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `commission_slip`              varchar(500)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `broker_id_file`               varchar(500)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `investor_amount`              decimal(15,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `broker_contract_signed`       tinyint(1)    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `broker_contract_date`         date          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `broker_contract_file`         text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `land_transfer_time`           varchar(10)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `land_transfer_location`       varchar(300)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `next_follow_up_at`            datetime      DEFAULT NULL;

-- ══════════════════════════════════════════════════════════════
-- ส่วนที่ 6: agents — columns เพิ่มทีหลัง
-- ══════════════════════════════════════════════════════════════

ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `date_of_birth`            date          DEFAULT NULL COMMENT 'วันเกิดนายหน้า',
  ADD COLUMN IF NOT EXISTS `national_id_expiry`       date          DEFAULT NULL COMMENT 'วันหมดอายุบัตร',
  ADD COLUMN IF NOT EXISTS `address`                  text          DEFAULT NULL COMMENT 'ที่อยู่ตามทะเบียนบ้าน',
  ADD COLUMN IF NOT EXISTS `house_registration_image` varchar(500)  DEFAULT NULL COMMENT 'สำเนาทะเบียนบ้าน',
  ADD COLUMN IF NOT EXISTS `bank_book_file`           varchar(500)  DEFAULT NULL COMMENT 'หน้าสมุดบัญชีนายหน้า';

-- ══════════════════════════════════════════════════════════════
-- ส่วนที่ 7: investors — columns เพิ่มทีหลัง
-- ══════════════════════════════════════════════════════════════

ALTER TABLE `investors`
  ADD COLUMN IF NOT EXISTS `national_id`              varchar(20)   DEFAULT NULL COMMENT 'เลขบัตรประชาชนนายทุน',
  ADD COLUMN IF NOT EXISTS `national_id_expiry`       date          DEFAULT NULL COMMENT 'วันหมดอายุบัตรประชาชน',
  ADD COLUMN IF NOT EXISTS `address`                  text          DEFAULT NULL COMMENT 'ที่อยู่ตามทะเบียนบ้าน',
  ADD COLUMN IF NOT EXISTS `house_registration_image` varchar(500)  DEFAULT NULL COMMENT 'รูปสำเนาทะเบียนบ้าน',
  ADD COLUMN IF NOT EXISTS `date_of_birth`            date          DEFAULT NULL COMMENT 'วันเกิด',
  ADD COLUMN IF NOT EXISTS `nationality`              varchar(50)   DEFAULT 'ไทย' COMMENT 'สัญชาติ',
  ADD COLUMN IF NOT EXISTS `marital_status`           varchar(20)   DEFAULT NULL COMMENT 'โสด/สมรส/หย่า/หม้าย',
  ADD COLUMN IF NOT EXISTS `spouse_name`              varchar(255)  DEFAULT NULL COMMENT 'ชื่อ-สกุลคู่สมรส',
  ADD COLUMN IF NOT EXISTS `spouse_national_id`       varchar(20)   DEFAULT NULL COMMENT 'เลขบัตรประชาชนคู่สมรส';

-- ══════════════════════════════════════════════════════════════
-- เสร็จสิ้น — ตรวจสอบด้วย:
-- SHOW TABLES;
-- SELECT COUNT(*) FROM auction_transactions;
-- DESCRIBE loan_requests;
-- ══════════════════════════════════════════════════════════════

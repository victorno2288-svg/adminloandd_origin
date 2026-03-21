-- ============================================================
-- Fix: เพิ่มคอลัมน์ที่ขาดใน loan_requests, issuing_transactions, investors
-- Error แก้:
--   Unknown column 'lr.reject_category'     → getDebtors / salesController
--   Unknown column 'lr.reject_alternative'  → salesController
--   Unknown column 'lr.lead_source'         → salesController
--   Unknown column 'lr.dead_reason'         → salesController
--   Unknown column 'lr.loan_type_detail'    → salesController
--   Unknown column 'lr.deed_number'         → salesController
--   Unknown column 'lr.road_access'         → salesController
--   Unknown column 'lr.seizure_status'      → salesController
--   Unknown column 'lr.payment_status'      → salesController / caseController
--   Unknown column 'lr.debtor_code'         → salesController
--   Unknown column 'it2.commission_slip'    → accountingController / issuingController
--   Unknown column 'id_card_image'          → investorController
-- ============================================================

-- ============================================================
-- SECTION 1: loan_requests
-- ============================================================

-- 1A) รหัสลูกหนี้ & แหล่งที่มา
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS debtor_code       VARCHAR(20)  NULL DEFAULT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS source            VARCHAR(100) NULL DEFAULT NULL AFTER debtor_code,
  ADD COLUMN IF NOT EXISTS lead_source       VARCHAR(100) NULL DEFAULT NULL AFTER source;

-- 1B) สถานะ & การชำระเงิน
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS payment_status    VARCHAR(20)  NULL DEFAULT 'unpaid' AFTER status;

-- 1C) การปฏิเสธ & ลีดเสีย
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS dead_reason       VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reject_category   VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reject_alternative TEXT         NULL DEFAULT NULL;

-- 1D) ข้อมูลลูกค้า (ต่อเนื่อง)
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS preferred_contact VARCHAR(50)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_gender   VARCHAR(10)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_age      INT          NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS existing_debt     DECIMAL(15,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS occupation        VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_income    DECIMAL(15,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS loan_purpose      VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS marital_status    VARCHAR(50)  NULL DEFAULT NULL;

-- 1E) ประเภทสินเชื่อ
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS loan_type         VARCHAR(50)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS loan_type_detail  VARCHAR(100) NULL DEFAULT NULL;

-- 1F) ข้อมูลทรัพย์
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS property_type     VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deed_type         VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deed_number       VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS land_area         VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS building_area     VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS road_access       VARCHAR(50)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seizure_status    VARCHAR(50)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_value   DECIMAL(15,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preliminary_terms TEXT         NULL DEFAULT NULL;

-- 1G) ที่ตั้งทรัพย์
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS province          VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS district          VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sub_district      VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS house_no          VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS village_name      VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS additional_details TEXT        NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location_url      TEXT         NULL DEFAULT NULL;

-- 1H) วงเงินสินเชื่อ
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS loan_amount       DECIMAL(15,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS desired_amount    DECIMAL(15,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS net_desired_amount DECIMAL(15,2) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS loan_duration     INT          NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contract_years    INT          NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS advance_months    INT          NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interest_rate     DECIMAL(5,2) NULL DEFAULT NULL;

-- 1J) เกณฑ์คัดทรัพย์เพิ่มเติม (CRM Screening)
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS road_width       VARCHAR(20)  NULL DEFAULT NULL COMMENT 'lt4/4to6/gt6',
  ADD COLUMN IF NOT EXISTS utility_access   VARCHAR(20)  NULL DEFAULT NULL COMMENT 'yes/partial/no',
  ADD COLUMN IF NOT EXISTS flood_risk       VARCHAR(20)  NULL DEFAULT NULL COMMENT 'never/rarely/often';

-- 1I) ผู้ติดต่อ
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS contact_name      VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_phone     VARCHAR(50)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_line      VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_facebook  VARCHAR(255) NULL DEFAULT NULL;

-- 1J) รูปภาพ
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS images            TEXT         NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deed_images       TEXT         NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_images  TEXT         NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS appraisal_book_image TEXT      NULL DEFAULT NULL;

-- 1K) เอกสาร Checklist (สถานะสมรส)
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS borrower_id_card  TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS house_reg_book    TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS name_change_doc   TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS divorce_doc       TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spouse_id_card    TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spouse_reg_copy   TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marriage_cert     TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS single_cert       TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS death_cert        TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS will_court_doc    TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS testator_house_reg TINYINT(1) NOT NULL DEFAULT 0;

-- 1L) เอกสาร Checklist (ทรัพย์)
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS deed_copy         TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS building_permit   TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS house_reg_prop    TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_contract     TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debt_free_cert    TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blueprint         TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS property_photos   TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS land_tax_receipt  TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maps_url          TEXT         NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS condo_title_deed  TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condo_location_map TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS common_fee_receipt TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS floor_plan        TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS location_sketch_map TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS land_use_cert     TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rental_contract   TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_reg      TINYINT(1)  NOT NULL DEFAULT 0;

-- 1M) Indexes
ALTER TABLE loan_requests
  ADD INDEX IF NOT EXISTS idx_debtor_code    (debtor_code),
  ADD INDEX IF NOT EXISTS idx_payment_status (payment_status),
  ADD INDEX IF NOT EXISTS idx_reject_cat     (reject_category),
  ADD INDEX IF NOT EXISTS idx_lead_source    (lead_source);

-- ============================================================
-- SECTION 2: issuing_transactions
-- ============================================================

-- 2A) สลิปค่าดำเนินการ
ALTER TABLE issuing_transactions
  ADD COLUMN IF NOT EXISTS commission_slip   VARCHAR(500) NULL DEFAULT NULL;

-- 2B) SOP 5 Closing Checklist
ALTER TABLE issuing_transactions
  ADD COLUMN IF NOT EXISTS closing_check_schedule  TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_check_personal  TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_check_legal     TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_check_docs      TINYINT(1) NOT NULL DEFAULT 0;

-- 2C) เอกสารสัญญา
ALTER TABLE issuing_transactions
  ADD COLUMN IF NOT EXISTS doc_selling_pledge  VARCHAR(500) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS doc_mortgage        VARCHAR(500) NULL DEFAULT NULL;

-- 2D) หมายเหตุ & tracking
ALTER TABLE issuing_transactions
  ADD COLUMN IF NOT EXISTS note              TEXT         NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tracking_no       VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS issuing_status    VARCHAR(20)  NULL DEFAULT 'pending';

-- 2E) เช็คลิสต์เอกสาร
ALTER TABLE issuing_transactions
  ADD COLUMN IF NOT EXISTS contract_appointment    TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_selling_pledge TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_mortgage       TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_selling_pledge TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_mortgage       TINYINT(1) NOT NULL DEFAULT 0;

-- ============================================================
-- SECTION 3: investors
-- ============================================================

-- 3A) รูปบัตรประชาชน
ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS id_card_image     VARCHAR(500) NULL DEFAULT NULL;

-- 3B) ข้อมูลพื้นฐาน (ป้องกัน error ถ้ายังไม่มี)
ALTER TABLE investors
  ADD COLUMN IF NOT EXISTS username          VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS investor_code     VARCHAR(20)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS full_name         VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phone             VARCHAR(50)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS line_id           VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email             VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_name         VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_no   VARCHAR(50)  NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255) NULL DEFAULT NULL;

-- ============================================================
-- SECTION 4: approval_transactions — เพิ่ม offer manager approval gating
-- ============================================================
ALTER TABLE approval_transactions
  ADD COLUMN IF NOT EXISTS offer_manager_status VARCHAR(30)  NULL DEFAULT 'draft'
    COMMENT 'draft | pending_manager | manager_approved | manager_rejected',
  ADD COLUMN IF NOT EXISTS offer_sent_at        DATETIME     NULL DEFAULT NULL
    COMMENT 'เวลาที่ส่งข้อเสนอให้ผู้จัดการอนุมัติ',
  ADD COLUMN IF NOT EXISTS manager_approved_by  INT          NULL DEFAULT NULL
    COMMENT 'user_id ของผู้จัดการที่อนุมัติ',
  ADD COLUMN IF NOT EXISTS manager_approved_at  DATETIME     NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS manager_note         TEXT         NULL DEFAULT NULL
    COMMENT 'หมายเหตุจากผู้จัดการ',
  ADD COLUMN IF NOT EXISTS customer_sent_at     DATETIME     NULL DEFAULT NULL
    COMMENT 'เวลาที่ส่งข้อเสนอให้ลูกค้าแล้ว';

-- ============================================================
-- VERIFY
-- ============================================================
SELECT 'loan_requests migration done!'      AS result
UNION ALL
SELECT 'issuing_transactions migration done!'
UNION ALL
SELECT 'investors migration done!'
UNION ALL
SELECT 'approval_transactions offer_manager_status migration done!';

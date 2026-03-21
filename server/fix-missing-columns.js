/**
 * fix-missing-columns.js
 * รัน: node fix-missing-columns.js
 * เพิ่ม column + table ที่หายและทำให้ server 500
 */
const db = require('./config/db')

const migrations = [
  // ── loan_requests: screening fields ──────────────────────────────
  {
    name: 'loan_requests: ineligible_property',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS ineligible_property TINYINT(1) NOT NULL DEFAULT 0
            COMMENT '1=ทรัพย์ไม่ผ่านเกณฑ์ SOP'`
  },
  {
    name: 'loan_requests: ineligible_reason',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS ineligible_reason VARCHAR(255) NULL DEFAULT NULL
            COMMENT 'เหตุผลที่ไม่ผ่านเกณฑ์'`
  },
  {
    name: 'loan_requests: screening_status',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS screening_status VARCHAR(30) NULL DEFAULT NULL
            COMMENT 'pending | eligible | ineligible'`
  },
  {
    name: 'loan_requests: screened_by_id',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS screened_by_id INT NULL DEFAULT NULL`
  },
  {
    name: 'loan_requests: screened_by_name',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS screened_by_name VARCHAR(200) NULL DEFAULT NULL`
  },
  {
    name: 'loan_requests: screened_at',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS screened_at DATETIME NULL DEFAULT NULL`
  },
  {
    name: 'loan_requests: prop_checklist_json',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS prop_checklist_json TEXT NULL DEFAULT NULL
            COMMENT 'JSON checklist เอกสารตามประเภทอสังหา'`
  },

  // ── cases: broker contract fields ────────────────────────────────
  {
    name: 'cases: broker_contract_signed',
    sql: `ALTER TABLE cases
          ADD COLUMN IF NOT EXISTS broker_contract_signed TINYINT(1) NOT NULL DEFAULT 0
            COMMENT 'เซ็นสัญญาแต่งตั้งนายหน้าแล้ว = 1'`
  },
  {
    name: 'cases: broker_contract_date',
    sql: `ALTER TABLE cases
          ADD COLUMN IF NOT EXISTS broker_contract_date DATE NULL DEFAULT NULL
            COMMENT 'วันที่เซ็นสัญญาแต่งตั้งนายหน้า'`
  },
  {
    name: 'cases: broker_contract_file',
    sql: `ALTER TABLE cases
          ADD COLUMN IF NOT EXISTS broker_contract_file TEXT NULL DEFAULT NULL
            COMMENT 'path ไฟล์สัญญาแต่งตั้งนายหน้า'`
  },

  // ── cases: land transfer fields ───────────────────────────────────
  {
    name: 'cases: land_transfer_time',
    sql: `ALTER TABLE cases
          ADD COLUMN IF NOT EXISTS land_transfer_time VARCHAR(10) NULL DEFAULT NULL
            COMMENT 'เวลานัดโอนที่ดิน เช่น 09:00'`
  },
  {
    name: 'cases: land_transfer_location',
    sql: `ALTER TABLE cases
          ADD COLUMN IF NOT EXISTS land_transfer_location VARCHAR(300) NULL DEFAULT NULL
            COMMENT 'สถานที่ / สำนักงานที่ดิน'`
  },

  // ── cases: follow-up fields ───────────────────────────────────────
  {
    name: 'cases: follow_up_count',
    sql: `ALTER TABLE cases
          ADD COLUMN IF NOT EXISTS follow_up_count INT NOT NULL DEFAULT 0
            COMMENT 'จำนวนครั้งที่ตามลูกค้าแล้ว'`
  },
  {
    name: 'cases: last_follow_up_at',
    sql: `ALTER TABLE cases
          ADD COLUMN IF NOT EXISTS last_follow_up_at DATETIME NULL DEFAULT NULL`
  },
  {
    name: 'cases: next_follow_up_at',
    sql: `ALTER TABLE cases
          ADD COLUMN IF NOT EXISTS next_follow_up_at DATETIME NULL DEFAULT NULL`
  },

  // ── CREATE TABLE: appointments ────────────────────────────────────
  {
    name: 'CREATE TABLE appointments',
    sql: `CREATE TABLE IF NOT EXISTS appointments (
      id               INT          NOT NULL AUTO_INCREMENT,
      case_id          INT          NULL,
      loan_request_id  INT          NULL,
      appt_type        VARCHAR(50)  NOT NULL DEFAULT 'valuation'
        COMMENT 'valuation | transaction | call | other',
      appt_date        DATE         NULL,
      appt_time        TIME         NULL,
      location         VARCHAR(500) NULL,
      notes            TEXT         NULL,
      assigned_to_id   INT          NULL,
      assigned_to_name VARCHAR(200) NULL,
      created_by_id    INT          NULL,
      created_by_name  VARCHAR(200) NULL,
      status           VARCHAR(30)  NOT NULL DEFAULT 'scheduled'
        COMMENT 'scheduled | completed | cancelled | rescheduled',
      completed_at     DATETIME     NULL,
      created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_appt_case   (case_id),
      KEY idx_appt_date   (appt_date),
      KEY idx_appt_status (status),
      KEY idx_appt_lr     (loan_request_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },

  // ── CREATE TABLE: case_followups (ถ้ายังไม่มี) ──────────────────
  {
    name: 'CREATE TABLE case_followups',
    sql: `CREATE TABLE IF NOT EXISTS case_followups (
      id               INT          NOT NULL AUTO_INCREMENT,
      case_id          INT          NOT NULL,
      sales_id         INT          NULL,
      sales_name       VARCHAR(200) NULL,
      followup_type    VARCHAR(50)  NOT NULL DEFAULT 'chat',
      note             TEXT         NULL,
      next_followup_at DATETIME     NULL,
      created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_cf_case    (case_id),
      KEY idx_cf_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  },

  // ── case_followups: next_followup_at (ถ้ามีตารางแล้วแต่ไม่มี col) ──
  {
    name: 'case_followups: next_followup_at',
    sql: `ALTER TABLE case_followups
          ADD COLUMN IF NOT EXISTS next_followup_at DATETIME NULL DEFAULT NULL
            COMMENT 'กำหนดตามครั้งถัดไปจากการ log นี้'`
  },

  // ══════════════════════════════════════════════════════════════════
  // ★ CRITICAL FIX: แปลง checklist doc fields จาก TINYINT(1) → TEXT
  //   migration เก่า (fix_remaining_tables_missing_columns.sql) สร้าง TINYINT(1)
  //   ทำให้ uploadChecklistDoc เซฟ JSON path array ไม่ได้ → ค่าถูก truncate เป็น 0
  //   MODIFY COLUMN ไม่ต้องการ IF NOT EXISTS (รันซ้ำปลอดภัย ถ้า TEXT อยู่แล้วก็ OK)
  // ══════════════════════════════════════════════════════════════════
  { name: 'loan_requests: borrower_id_card → TEXT',     sql: `ALTER TABLE loan_requests MODIFY COLUMN borrower_id_card TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: house_reg_book → TEXT',       sql: `ALTER TABLE loan_requests MODIFY COLUMN house_reg_book TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: name_change_doc → TEXT',      sql: `ALTER TABLE loan_requests MODIFY COLUMN name_change_doc TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: divorce_doc → TEXT',          sql: `ALTER TABLE loan_requests MODIFY COLUMN divorce_doc TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: spouse_id_card → TEXT',       sql: `ALTER TABLE loan_requests MODIFY COLUMN spouse_id_card TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: spouse_reg_copy → TEXT',      sql: `ALTER TABLE loan_requests MODIFY COLUMN spouse_reg_copy TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: marriage_cert → TEXT',        sql: `ALTER TABLE loan_requests MODIFY COLUMN marriage_cert TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: single_cert → TEXT',          sql: `ALTER TABLE loan_requests MODIFY COLUMN single_cert TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: death_cert → TEXT',           sql: `ALTER TABLE loan_requests MODIFY COLUMN death_cert TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: will_court_doc → TEXT',       sql: `ALTER TABLE loan_requests MODIFY COLUMN will_court_doc TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: testator_house_reg → TEXT',   sql: `ALTER TABLE loan_requests MODIFY COLUMN testator_house_reg TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: deed_copy → TEXT',            sql: `ALTER TABLE loan_requests MODIFY COLUMN deed_copy TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: building_permit → TEXT',      sql: `ALTER TABLE loan_requests MODIFY COLUMN building_permit TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: house_reg_prop → TEXT',       sql: `ALTER TABLE loan_requests MODIFY COLUMN house_reg_prop TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: sale_contract → TEXT',        sql: `ALTER TABLE loan_requests MODIFY COLUMN sale_contract TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: debt_free_cert → TEXT',       sql: `ALTER TABLE loan_requests MODIFY COLUMN debt_free_cert TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: blueprint → TEXT',            sql: `ALTER TABLE loan_requests MODIFY COLUMN blueprint TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: property_photos → TEXT',      sql: `ALTER TABLE loan_requests MODIFY COLUMN property_photos TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: land_tax_receipt → TEXT',     sql: `ALTER TABLE loan_requests MODIFY COLUMN land_tax_receipt TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: condo_title_deed → TEXT',     sql: `ALTER TABLE loan_requests MODIFY COLUMN condo_title_deed TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: condo_location_map → TEXT',   sql: `ALTER TABLE loan_requests MODIFY COLUMN condo_location_map TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: common_fee_receipt → TEXT',   sql: `ALTER TABLE loan_requests MODIFY COLUMN common_fee_receipt TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: floor_plan → TEXT',           sql: `ALTER TABLE loan_requests MODIFY COLUMN floor_plan TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: location_sketch_map → TEXT',  sql: `ALTER TABLE loan_requests MODIFY COLUMN location_sketch_map TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: land_use_cert → TEXT',        sql: `ALTER TABLE loan_requests MODIFY COLUMN land_use_cert TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: rental_contract → TEXT',      sql: `ALTER TABLE loan_requests MODIFY COLUMN rental_contract TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: business_reg → TEXT',         sql: `ALTER TABLE loan_requests MODIFY COLUMN business_reg TEXT NULL DEFAULT NULL` },

  // ── loan_requests: screening extra fields (road_width, utility_access, flood_risk) ──
  {
    name: 'loan_requests: road_access',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS road_access VARCHAR(10) NULL DEFAULT NULL
            COMMENT 'yes=มีทางเข้าออก, no=ที่ดินตาบอด'`
  },
  {
    name: 'loan_requests: seizure_status',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS seizure_status VARCHAR(20) NULL DEFAULT NULL
            COMMENT 'none=ปลอดภาระ, mortgaged=ติดจำนอง, seized=ถูกอายัด'`
  },
  {
    name: 'loan_requests: road_width',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS road_width VARCHAR(20) NULL DEFAULT NULL
            COMMENT 'lt4 / 4to6 / gt6'`
  },
  {
    name: 'loan_requests: utility_access',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS utility_access VARCHAR(20) NULL DEFAULT NULL
            COMMENT 'yes / partial / no'`
  },
  {
    name: 'loan_requests: flood_risk',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS flood_risk VARCHAR(20) NULL DEFAULT NULL
            COMMENT 'never / rarely / often'`
  },
  {
    name: 'loan_requests: estimated_value',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(15,2) NULL DEFAULT NULL
            COMMENT 'ราคาประเมินทรัพย์'`
  },
  {
    name: 'loan_requests: property_video',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS property_video TEXT NULL DEFAULT NULL
            COMMENT 'JSON array ของ path วีดีโอทรัพย์ (เซฟผ่าน checklist upload)'`
  },
  // ── legal_transactions: SOP Document Checklist ────────────────────
  {
    name: 'legal_transactions: doc_checklist_json',
    sql: `ALTER TABLE legal_transactions
          ADD COLUMN IF NOT EXISTS doc_checklist_json TEXT NULL DEFAULT NULL
            COMMENT 'JSON — SOP checklist tick state สำหรับฝ่ายนิติกรรม { itemId: { checked, note } }'`
  },
]

async function run() {
  console.log('🚀 เริ่มรัน fix-missing-columns...\n')
  let ok = 0, fail = 0

  for (const m of migrations) {
    await new Promise(resolve => {
      db.query(m.sql, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME' && err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_BAD_FIELD_ERROR') {
          console.error(`  ❌ ${m.name}: ${err.message}`)
          fail++
        } else {
          console.log(`  ✅ ${m.name}`)
          ok++
        }
        resolve()
      })
    })
  }

  console.log(`\n✅ สำเร็จ ${ok}/${migrations.length}  ❌ ล้มเหลว ${fail}`)
  db.end()
  process.exit(fail > 0 ? 1 : 0)
}

run()

/**
 * migrate-now.js — รัน migration ทันที (ไม่ต้องเปิด phpMyAdmin)
 * Usage: node migrate-now.js
 */
const db = require('./config/db')

const migrations = [
  // ============================================================
  // auction_transactions — columns ที่เพิ่มใหม่
  // ============================================================
  { name: 'auction_transactions: sale_type',           sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS sale_type VARCHAR(50) NULL DEFAULT NULL COMMENT 'ประเภทการขาย auction/direct'` },
  { name: 'auction_transactions: bank_name',           sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200) NULL DEFAULT NULL` },
  { name: 'auction_transactions: bank_account_no',     sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(100) NULL DEFAULT NULL` },
  { name: 'auction_transactions: bank_account_name',   sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200) NULL DEFAULT NULL` },
  { name: 'auction_transactions: transfer_slip',       sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS transfer_slip VARCHAR(500) NULL DEFAULT NULL` },
  { name: 'auction_transactions: recorded_by',         sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(200) NULL DEFAULT NULL` },
  { name: 'auction_transactions: recorded_at',         sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS recorded_at DATETIME NULL DEFAULT NULL` },
  { name: 'auction_transactions: house_reg_book_legal',sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS house_reg_book_legal TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: spouse_consent_doc',  sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS spouse_consent_doc TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: spouse_name_change_doc', sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS spouse_name_change_doc TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: spouse_id_card',      sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS spouse_id_card TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: spouse_reg_copy',     sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS spouse_reg_copy TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: marriage_cert',       sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS marriage_cert TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: house_reg_book',      sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS house_reg_book TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: name_change_doc',     sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS name_change_doc TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: divorce_doc',         sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS divorce_doc TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: investor_type',       sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS investor_type VARCHAR(100) NULL DEFAULT NULL` },
  { name: 'auction_transactions: selling_pledge_amount', sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS selling_pledge_amount DECIMAL(15,2) NULL DEFAULT NULL` },
  { name: 'auction_transactions: interest_rate',       sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) NULL DEFAULT NULL` },
  { name: 'auction_transactions: auction_land_area',   sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS auction_land_area VARCHAR(200) NULL DEFAULT NULL` },
  { name: 'auction_transactions: contract_years',      sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS contract_years INT NULL DEFAULT NULL` },
  { name: 'auction_transactions: is_cancelled',        sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS is_cancelled TINYINT(1) NOT NULL DEFAULT 0` },
  { name: 'auction_transactions: land_transfer_date',  sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS land_transfer_date DATE NULL DEFAULT NULL` },
  { name: 'auction_transactions: land_transfer_time',  sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS land_transfer_time VARCHAR(20) NULL DEFAULT NULL` },
  { name: 'auction_transactions: land_transfer_location', sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS land_transfer_location VARCHAR(500) NULL DEFAULT NULL` },
  { name: 'auction_transactions: land_transfer_note',  sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS land_transfer_note TEXT NULL DEFAULT NULL` },
  { name: 'auction_transactions: property_value',      sql: `ALTER TABLE auction_transactions ADD COLUMN IF NOT EXISTS property_value DECIMAL(15,2) NULL DEFAULT NULL` },
  // ============================================================
  // cases — land_transfer fields (ใช้ใน updateAuction)
  // ============================================================
  { name: 'cases: land_transfer_date',     sql: `ALTER TABLE cases ADD COLUMN IF NOT EXISTS land_transfer_date DATE NULL DEFAULT NULL` },
  { name: 'cases: land_transfer_time',     sql: `ALTER TABLE cases ADD COLUMN IF NOT EXISTS land_transfer_time VARCHAR(20) NULL DEFAULT NULL` },
  { name: 'cases: land_transfer_location', sql: `ALTER TABLE cases ADD COLUMN IF NOT EXISTS land_transfer_location VARCHAR(500) NULL DEFAULT NULL` },
  { name: 'cases: land_transfer_note',     sql: `ALTER TABLE cases ADD COLUMN IF NOT EXISTS land_transfer_note TEXT NULL DEFAULT NULL` },
  // ============================================================
  // loan_requests — property type checklist doc columns
  // ============================================================
  { name: 'loan_requests: marital_status',        sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50) NULL DEFAULT NULL` },
  { name: 'loan_requests: checklist_ticks_json',  sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS checklist_ticks_json TEXT NULL DEFAULT NULL COMMENT 'JSON tick state { field: true } for checklist docs (manual tick without upload)'` },
  { name: 'loan_requests: single_cert',           sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS single_cert TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: death_cert',            sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS death_cert TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: will_court_doc',        sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS will_court_doc TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: testator_house_reg',    sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS testator_house_reg TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: deed_copy',             sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS deed_copy TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: building_permit',       sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS building_permit TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: house_reg_prop',        sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS house_reg_prop TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: sale_contract',         sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS sale_contract TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: debt_free_cert',        sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS debt_free_cert TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: blueprint',             sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS blueprint TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: property_photos',       sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS property_photos TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: land_tax_receipt',      sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS land_tax_receipt TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: maps_url',              sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS maps_url TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: condo_title_deed',      sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS condo_title_deed TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: condo_location_map',    sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS condo_location_map TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: common_fee_receipt',    sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS common_fee_receipt TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: floor_plan',            sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS floor_plan TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: location_sketch_map',   sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS location_sketch_map TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: land_use_cert',         sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS land_use_cert TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: rental_contract',       sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS rental_contract TEXT NULL DEFAULT NULL` },
  { name: 'loan_requests: business_reg',          sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS business_reg TEXT NULL DEFAULT NULL` },
  // ============================================================
  // investor_withdrawals — ใช้ใน accounting getCaseDocs
  // ============================================================
  { name: 'CREATE TABLE IF NOT EXISTS investor_withdrawals', sql: `CREATE TABLE IF NOT EXISTS investor_withdrawals (
      id INT NOT NULL AUTO_INCREMENT,
      investor_id INT NULL,
      case_id INT NULL,
      amount DECIMAL(15,2) NULL DEFAULT NULL,
      withdrawal_date DATE NULL DEFAULT NULL,
      status VARCHAR(50) NULL DEFAULT 'pending',
      slip_path VARCHAR(500) NULL DEFAULT NULL,
      note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_investor_id (investor_id),
      KEY idx_case_id (case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
  // ============================================================
  // agent_accounting — ใช้ใน accounting getCaseDocs / getAgentsDocs
  // ============================================================
  { name: 'CREATE TABLE IF NOT EXISTS agent_accounting', sql: `CREATE TABLE IF NOT EXISTS agent_accounting (
      id INT NOT NULL AUTO_INCREMENT,
      agent_id INT NULL,
      commission_slip VARCHAR(500) NULL DEFAULT NULL,
      commission_rate DECIMAL(5,2) NULL DEFAULT NULL,
      payment_status VARCHAR(50) NULL DEFAULT 'pending',
      note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_agent_id (agent_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
  // ============================================================
  // investor_auction_history — ใช้ใน updateAuction
  // ============================================================
  { name: 'CREATE TABLE IF NOT EXISTS investor_auction_history', sql: `CREATE TABLE IF NOT EXISTS investor_auction_history (
      id INT NOT NULL AUTO_INCREMENT,
      investor_id INT NULL,
      case_id INT NULL,
      auction_date DATETIME NULL DEFAULT NULL,
      winning_price DECIMAL(15,2) NULL DEFAULT NULL,
      note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_inv_case (investor_id, case_id),
      KEY idx_investor_id (investor_id),
      KEY idx_case_id (case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
  // ============================================================
  // auction_bids — ใช้ใน getAuctionBids / createAuctionBid
  // ============================================================
  { name: 'CREATE TABLE IF NOT EXISTS auction_bids', sql: `CREATE TABLE IF NOT EXISTS auction_bids (
      id INT NOT NULL AUTO_INCREMENT,
      case_id INT NULL,
      bid_amount DECIMAL(15,2) NULL DEFAULT NULL,
      investor_id INT NULL,
      investor_name VARCHAR(200) NULL DEFAULT NULL,
      investor_code VARCHAR(100) NULL DEFAULT NULL,
      investor_phone VARCHAR(50) NULL DEFAULT NULL,
      bid_date DATE NULL DEFAULT NULL,
      note TEXT NULL,
      recorded_by VARCHAR(200) NULL DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_case_id (case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
  {
    name: 'chat_conversations: next_follow_up_at',
    sql: `ALTER TABLE chat_conversations
          ADD COLUMN IF NOT EXISTS next_follow_up_at    DATETIME NULL DEFAULT NULL
            COMMENT 'วันนัด follow-up ครั้งถัดไป'`
  },
  {
    name: 'chat_conversations: followup_note',
    sql: `ALTER TABLE chat_conversations
          ADD COLUMN IF NOT EXISTS followup_note        TEXT NULL DEFAULT NULL
            COMMENT 'โน้ต follow-up ล่าสุด'`
  },
  {
    name: 'chat_conversations: followup_reminded_at',
    sql: `ALTER TABLE chat_conversations
          ADD COLUMN IF NOT EXISTS followup_reminded_at DATETIME NULL DEFAULT NULL
            COMMENT 'เวลาที่ส่ง reminder ล่าสุด (ป้องกัน spam)'`
  },
  {
    name: 'chat_conversations: is_blacklisted',
    sql: `ALTER TABLE chat_conversations
          ADD COLUMN IF NOT EXISTS is_blacklisted       TINYINT(1) NOT NULL DEFAULT 0
            COMMENT '1 = เบอร์นี้ถูก blacklist'`
  },
  {
    name: 'chat_conversations: index on next_follow_up_at',
    sql: `ALTER TABLE chat_conversations
          ADD INDEX IF NOT EXISTS idx_next_followup (next_follow_up_at)`
  },
  // ★ Closing Checklist (SOP ข้อ 5) — ก่อนนัดกรมที่ดิน
  {
    name: 'issuing_transactions: closing_check_schedule',
    sql: `ALTER TABLE issuing_transactions
          ADD COLUMN IF NOT EXISTS closing_check_schedule  TINYINT(1) NOT NULL DEFAULT 0
            COMMENT 'SOP 5.1 ยืนยันวัน-เวลา-สำนักงานที่ดิน'`
  },
  {
    name: 'issuing_transactions: closing_check_personal',
    sql: `ALTER TABLE issuing_transactions
          ADD COLUMN IF NOT EXISTS closing_check_personal  TINYINT(1) NOT NULL DEFAULT 0
            COMMENT 'SOP 5.2 ยืนยันสถานะบุคคลลูกค้า (โสด/สมรส/หย่า)'`
  },
  {
    name: 'issuing_transactions: closing_check_legal',
    sql: `ALTER TABLE issuing_transactions
          ADD COLUMN IF NOT EXISTS closing_check_legal     TINYINT(1) NOT NULL DEFAULT 0
            COMMENT 'SOP 5.3 ยืนยันสถานะทางกฎหมายทรัพย์ (ไม่ติดอายัด)'`
  },
  {
    name: 'issuing_transactions: closing_check_docs',
    sql: `ALTER TABLE issuing_transactions
          ADD COLUMN IF NOT EXISTS closing_check_docs      TINYINT(1) NOT NULL DEFAULT 0
            COMMENT 'SOP 5.4 ยืนยันเอกสารครบถ้วน'`
  },
  // ★ Reject & Feedback fields
  {
    name: 'loan_requests: reject_category',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS reject_category    VARCHAR(100) NULL COMMENT 'หมวดหมู่เหตุผลที่ไม่ผ่าน'`
  },
  {
    name: 'loan_requests: reject_alternative',
    sql: `ALTER TABLE loan_requests
          ADD COLUMN IF NOT EXISTS reject_alternative VARCHAR(100) NULL COMMENT 'ทางเลือกที่แนะนำหลังไม่ผ่าน'`
  },
  {
    name: 'loan_requests: index on reject_category',
    sql: `ALTER TABLE loan_requests
          ADD INDEX IF NOT EXISTS idx_reject_category (reject_category)`
  },
  {
    name: 'issuing_transactions: commission_slip',
    sql: `ALTER TABLE issuing_transactions
          ADD COLUMN IF NOT EXISTS commission_slip VARCHAR(500) NULL
            COMMENT 'สลิปค่าดำเนินการที่เก็บจากลูกค้า ณ กรมที่ดิน'`
  },
  {
    name: 'CREATE TABLE customer_blacklists',
    sql: `CREATE TABLE IF NOT EXISTS customer_blacklists (
      id            INT NOT NULL AUTO_INCREMENT,
      phone         VARCHAR(20)  NOT NULL COMMENT 'เบอร์โทรที่ blacklist',
      reason        TEXT         NULL     COMMENT 'เหตุผล',
      added_by      INT          NULL     COMMENT 'admin_users.id',
      added_by_name VARCHAR(100) NULL,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_active     TINYINT(1)   NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      UNIQUE KEY uq_bl_phone (phone),
      KEY idx_bl_phone  (phone),
      KEY idx_bl_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  },
  // ============================================================
  // chat_followups — บันทึกการติดตาม (ตาม SOP ฝ่ายขาย)
  // ============================================================
  // ============================================================
  // cases — สลิปโอนเงินค่าปากถุง
  // ============================================================
  {
    name: 'cases: transaction_slip',
    sql: `ALTER TABLE cases ADD COLUMN IF NOT EXISTS transaction_slip TEXT NULL DEFAULT NULL COMMENT 'สลิปโอนเงินค่าปากถุง (ฝ่ายขาย + นิติ + บัญชี)'`
  },
  {
    name: 'cases: advance_slip',
    sql: `ALTER TABLE cases ADD COLUMN IF NOT EXISTS advance_slip VARCHAR(500) NULL DEFAULT NULL COMMENT 'สลิปค่าหักล่วงหน้า'`
  },
  {
    name: 'loan_requests: advance_slip',
    sql: `ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS advance_slip VARCHAR(500) NULL DEFAULT NULL COMMENT 'สลิปค่าหักล่วงหน้า (ก่อนมีเคส)'`
  },
  {
    name: 'CREATE TABLE IF NOT EXISTS chat_followups',
    sql: `CREATE TABLE IF NOT EXISTS chat_followups (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  },
  // ============================================================
  // issuing_transactions — เอกสารสัญญาแต่ละประเภท (ขายฝาก + จำนอง)
  // ============================================================
  { name: 'issuing_transactions: doc_sp_broker', sql: `ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_sp_broker TEXT NULL DEFAULT NULL COMMENT 'สัญญาแต่งตั้งนายหน้า ขายฝาก'` },
  { name: 'issuing_transactions: doc_sp_appendix', sql: `ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_sp_appendix TEXT NULL DEFAULT NULL COMMENT 'เอกสารแนบท้ายสัญญาแต่งตั้ง ขายฝาก'` },
  { name: 'issuing_transactions: doc_sp_notice', sql: `ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_sp_notice TEXT NULL DEFAULT NULL COMMENT 'หนังสือแจ้งเตือน ขายฝาก'` },
  { name: 'issuing_transactions: doc_mg_addendum', sql: `ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_mg_addendum TEXT NULL DEFAULT NULL COMMENT 'สัญญาต่อท้ายสัญญาจำนอง'` },
  { name: 'issuing_transactions: doc_mg_appendix', sql: `ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_mg_appendix TEXT NULL DEFAULT NULL COMMENT 'เอกสารแนบท้ายสัญญาแต่งตั้ง จำนอง'` },
  { name: 'issuing_transactions: doc_mg_broker', sql: `ALTER TABLE issuing_transactions ADD COLUMN IF NOT EXISTS doc_mg_broker TEXT NULL DEFAULT NULL COMMENT 'สัญญาแต่งตั้งนายหน้า จำนอง'` }
]

async function run() {
  console.log('🚀 เริ่มรัน migration...\n')
  let ok = 0, fail = 0

  for (const m of migrations) {
    await new Promise(resolve => {
      db.query(m.sql, (err) => {
        if (err) {
          console.error(`  ❌ ${m.name}`)
          console.error(`     ${err.message}\n`)
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

  // ตรวจสอบผล
  db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'chat_conversations'
       AND COLUMN_NAME IN ('next_follow_up_at','followup_note','followup_reminded_at','is_blacklisted')
     ORDER BY COLUMN_NAME`,
    (err, rows) => {
      if (!err) {
        console.log('\n📋 คอลัมน์ที่มีอยู่แล้ว:', rows.map(r => r.COLUMN_NAME).join(', '))
      }
      db.end()
      process.exit(fail > 0 ? 1 : 0)
    }
  )
}

run()

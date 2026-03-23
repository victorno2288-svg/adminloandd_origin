-- ============================================================
-- Contract Expiry Tracking — ตารางบันทึกการแจ้งเตือนที่ส่งแล้ว
-- (ป้องกันส่งซ้ำ เช่น ส่ง 90 วันไปแล้ว จะไม่ส่งอีก)
-- ============================================================
-- หมายเหตุ: ไม่ต้องเพิ่มคอลัมน์ใหม่ใน cases เพราะมีครบแล้ว:
--   cases.contract_start_date  — วันทำสัญญา (ฝ่ายนิติกรรมกรอก)
--   cases.contract_end_date    — วันหมดอายุ (คำนวณอัตโนมัติ)
--   loan_requests.contract_years  — ระยะสัญญา (1/2/3 ปี)
--   loan_requests.interest_rate   — อัตราดอกเบี้ย
--   loan_requests.loan_type_detail — ประเภทสัญญา (ขายฝาก/จำนอง)
--   cases.approved_amount       — วงเงินที่อนุมัติ
-- ============================================================

CREATE TABLE IF NOT EXISTS `contract_expiry_logs` (
  `id`           int(11)      NOT NULL AUTO_INCREMENT,
  `case_id`      int(11)      NOT NULL COMMENT 'FK → cases.id',
  `days_before`  int(11)      NOT NULL COMMENT 'เกณฑ์ที่แจ้งเตือน: 90 / 60 / 30',
  `notified_at`  datetime     NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่แจ้งเตือน',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_case_days` (`case_id`, `days_before`) COMMENT 'ป้องกันส่งซ้ำ',
  KEY `idx_case_id` (`case_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='บันทึก contract expiry notifications ที่ส่งไปแล้ว';

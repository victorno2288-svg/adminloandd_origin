-- =====================================================
-- ตาราง legal_documents — PDF รวมเอกสารทั้งหมดของเคสนิติกรรม
-- วิธีใช้: copy SQL นี้ไปวางใน phpMyAdmin → SQL tab → Execute
-- =====================================================

CREATE TABLE IF NOT EXISTS `legal_documents` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `case_id`         INT           NOT NULL COMMENT 'FK → cases.id',
  `loan_request_id` INT           DEFAULT NULL COMMENT 'FK → loan_requests.id (เก็บไว้อ้างอิง)',
  `file_path`       VARCHAR(500)  NOT NULL COMMENT 'path ไฟล์ relative จาก server root',
  `file_name`       VARCHAR(255)  NOT NULL COMMENT 'ชื่อไฟล์ต้นฉบับ',
  `file_size`       INT           DEFAULT NULL COMMENT 'ขนาดไฟล์ (bytes)',
  `note`            VARCHAR(500)  DEFAULT NULL COMMENT 'หมายเหตุ (ไม่บังคับ)',
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_case_id` (`case_id`),
  KEY `idx_loan_request_id` (`loan_request_id`),

  CONSTRAINT `fk_legaldoc_case`
    FOREIGN KEY (`case_id`)
    REFERENCES `cases` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='PDF รวมเอกสารทั้งหมดสำหรับเคสนิติกรรม';

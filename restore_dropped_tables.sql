-- ============================================
-- Restore: สร้างตารางที่ลบไปกลับคืน พร้อมข้อมูล
-- Database: loandd_db (MariaDB)
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- 1) dead_lead_reasons
-- --------------------------------------------------------
CREATE TABLE `dead_lead_reasons` (
  `id` int(11) NOT NULL,
  `reason_code` varchar(50) NOT NULL,
  `reason_name` varchar(200) NOT NULL COMMENT 'ชื่อเหตุผล',
  `reason_category` enum('customer','sales','property','market','other') DEFAULT 'other',
  `description` text DEFAULT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Master เหตุผลที่เคส Dead - AI classify';

INSERT INTO `dead_lead_reasons` (`id`, `reason_code`, `reason_name`, `reason_category`, `description`, `sort_order`, `is_active`, `created_at`) VALUES
(1, 'WANT_MORE_MONEY', 'ต้องการวงเงินเกินกว่าที่อนุมัติ', 'customer', NULL, 1, 1, '2026-03-11 08:26:23'),
(2, 'DISAPPEARED_EARLY', 'เพิ่งคุยแล้วหายไป', 'customer', NULL, 2, 1, '2026-03-11 08:26:23'),
(3, 'DISAPPEARED_LATE', 'คุยนานแล้วหายไป', 'customer', NULL, 3, 1, '2026-03-11 08:26:23'),
(4, 'ALMOST_DONE_DISAPPEARED', 'คุยเกือบจบแล้วหายไป', 'customer', NULL, 4, 1, '2026-03-11 08:26:23'),
(5, 'HIGH_INTEREST', 'ดอกเบี้ยสูงเกินไปลูกค้าไม่ยอม', 'customer', NULL, 5, 1, '2026-03-11 08:26:23'),
(6, 'PROPERTY_NOT_QUALIFY', 'ทรัพย์ไม่ผ่านเกณฑ์ (ที่นา/ที่สวน/ซอยลึก)', 'property', NULL, 6, 1, '2026-03-11 08:26:23'),
(7, 'PROPERTY_LOW_VALUE', 'ราคาประเมินต่ำเกินไป', 'property', NULL, 7, 1, '2026-03-11 08:26:23'),
(8, 'ENCUMBRANCE_TOO_HIGH', 'ภาระผูกพันสูงเกิน (ติดจำนองเยอะ)', 'property', NULL, 8, 1, '2026-03-11 08:26:23'),
(9, 'DOCS_INCOMPLETE', 'เอกสารไม่ครบ/ลูกค้าไม่ส่ง', 'customer', NULL, 9, 1, '2026-03-11 08:26:23'),
(10, 'FOUND_COMPETITOR', 'ไปใช้บริการคู่แข่ง', 'market', NULL, 10, 1, '2026-03-11 08:26:23'),
(11, 'SALES_REJECTED', 'เซลล์ปฏิเสธโดยไม่ควร (AI ตรวจพบ)', 'sales', NULL, 11, 1, '2026-03-11 08:26:23'),
(12, 'SALES_SLOW_RESPONSE', 'เซลล์ตอบช้าเกินไปลูกค้าหนีไป', 'sales', NULL, 12, 1, '2026-03-11 08:26:23'),
(13, 'ECONOMY_ISSUE', 'ปัญหาเศรษฐกิจ/สถานการณ์ตลาด', 'market', NULL, 13, 1, '2026-03-11 08:26:23'),
(14, 'FAKE_INQUIRY', 'แชทผี/สอบถามเล่นๆ', 'other', NULL, 14, 1, '2026-03-11 08:26:23'),
(15, 'SPY_COMPETITOR', 'คู่แข่งมาสปาย', 'other', NULL, 15, 1, '2026-03-11 08:26:23'),
(16, 'OTHER', 'อื่นๆ', 'other', NULL, 99, 1, '2026-03-11 08:26:23');

ALTER TABLE `dead_lead_reasons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_reason_code` (`reason_code`);

ALTER TABLE `dead_lead_reasons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

-- --------------------------------------------------------
-- 2) document_checklist_templates
-- --------------------------------------------------------
CREATE TABLE `document_checklist_templates` (
  `id` int(11) NOT NULL,
  `option_code` char(1) NOT NULL COMMENT 'A=โสด, B=แต่งงาน+จดทะเบียน, C=แต่งงาน+ไม่จด, D=หย่า, E=รับมรดก',
  `option_name` varchar(100) NOT NULL COMMENT 'ชื่อ option',
  `applies_to` enum('debtor','investor','both') DEFAULT 'debtor' COMMENT 'ใช้กับฝั่งไหน',
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Master ชุดเอกสารตาม option (A-E)';

INSERT INTO `document_checklist_templates` (`id`, `option_code`, `option_name`, `applies_to`, `description`, `is_active`, `created_at`) VALUES
(1, 'A', 'โสด (Single)', 'both', 'เอกสารสำหรับผู้ที่ยังไม่แต่งงาน', 1, '2026-03-11 02:47:13'),
(2, 'B', 'แต่งงาน+จดทะเบียน (Married Registered)', 'both', 'เอกสารสำหรับผู้ที่แต่งงานแล้วจดทะเบียนสมรส', 1, '2026-03-11 02:47:13'),
(3, 'C', 'แต่งงาน+ไม่จดทะเบียน (Married Unregistered)', 'both', 'เอกสารสำหรับผู้ที่แต่งงานแล้วแต่ไม่จดทะเบียน', 1, '2026-03-11 02:47:13'),
(4, 'D', 'หย่าแล้ว (Divorced)', 'both', 'เอกสารสำหรับผู้ที่หย่าแล้ว', 1, '2026-03-11 02:47:13'),
(5, 'E', 'รับมรดก (Inherited)', 'both', 'เอกสารสำหรับผู้ที่ได้รับมรดก มีคำพิพากษาจากศาล', 1, '2026-03-11 02:47:13');

ALTER TABLE `document_checklist_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_option_code` (`option_code`);

ALTER TABLE `document_checklist_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

-- --------------------------------------------------------
-- 3) document_checklist_items (ต้องสร้างหลัง templates เพราะมี FK)
-- --------------------------------------------------------
CREATE TABLE `document_checklist_items` (
  `id` int(11) NOT NULL,
  `template_id` int(11) NOT NULL COMMENT 'FK → document_checklist_templates.id',
  `document_name` varchar(200) NOT NULL COMMENT 'ชื่อเอกสาร',
  `document_code` varchar(50) DEFAULT NULL COMMENT 'รหัสเอกสาร',
  `is_required` tinyint(1) DEFAULT 1 COMMENT 'จำเป็นต้องมี',
  `sort_order` int(11) DEFAULT 0,
  `note` text DEFAULT NULL COMMENT 'คำอธิบายเพิ่มเติม',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รายการเอกสารในแต่ละ option';

INSERT INTO `document_checklist_items` (`id`, `template_id`, `document_name`, `document_code`, `is_required`, `sort_order`, `note`, `created_at`) VALUES
(1, 1, 'สำเนาบัตรประชาชน', 'ID_CARD', 1, 1, NULL, '2026-03-11 02:47:13'),
(2, 1, 'สำเนาทะเบียนบ้าน', 'HOUSE_REG', 1, 2, NULL, '2026-03-11 02:47:13'),
(3, 1, 'หนังสือรับรองโสด', 'SINGLE_CERT', 1, 3, NULL, '2026-03-11 02:47:13'),
(4, 1, 'สำเนาโฉนดที่ดิน (หน้า-หลัง)', 'DEED_COPY', 1, 4, NULL, '2026-03-11 02:47:13'),
(5, 2, 'สำเนาบัตรประชาชน', 'ID_CARD', 1, 1, NULL, '2026-03-11 02:47:13'),
(6, 2, 'สำเนาทะเบียนบ้าน', 'HOUSE_REG', 1, 2, NULL, '2026-03-11 02:47:13'),
(7, 2, 'ทะเบียนสมรส', 'MARRIAGE_CERT', 1, 3, NULL, '2026-03-11 02:47:13'),
(8, 2, 'สำเนาบัตรประชาชนคู่สมรส', 'SPOUSE_ID_CARD', 1, 4, NULL, '2026-03-11 02:47:13'),
(9, 2, 'สำเนาทะเบียนบ้านคู่สมรส', 'SPOUSE_HOUSE_REG', 1, 5, NULL, '2026-03-11 02:47:13'),
(10, 2, 'หนังสือยินยอมคู่สมรส', 'SPOUSE_CONSENT', 1, 6, NULL, '2026-03-11 02:47:13'),
(11, 2, 'สำเนาโฉนดที่ดิน (หน้า-หลัง)', 'DEED_COPY', 1, 7, NULL, '2026-03-11 02:47:13'),
(12, 3, 'สำเนาบัตรประชาชน', 'ID_CARD', 1, 1, NULL, '2026-03-11 02:47:13'),
(13, 3, 'สำเนาทะเบียนบ้าน', 'HOUSE_REG', 1, 2, NULL, '2026-03-11 02:47:13'),
(14, 3, 'หนังสือรับรองโสด', 'SINGLE_CERT', 1, 3, NULL, '2026-03-11 02:47:13'),
(15, 3, 'สำเนาโฉนดที่ดิน (หน้า-หลัง)', 'DEED_COPY', 1, 4, NULL, '2026-03-11 02:47:13'),
(16, 4, 'สำเนาบัตรประชาชน', 'ID_CARD', 1, 1, NULL, '2026-03-11 02:47:13'),
(17, 4, 'สำเนาทะเบียนบ้าน', 'HOUSE_REG', 1, 2, NULL, '2026-03-11 02:47:13'),
(18, 4, 'ใบหย่า', 'DIVORCE_DOC', 1, 3, NULL, '2026-03-11 02:47:13'),
(19, 4, 'ใบเปลี่ยนชื่อ-นามสกุล (ถ้ามี)', 'NAME_CHANGE', 0, 4, NULL, '2026-03-11 02:47:13'),
(20, 4, 'สำเนาโฉนดที่ดิน (หน้า-หลัง)', 'DEED_COPY', 1, 5, NULL, '2026-03-11 02:47:13'),
(21, 5, 'สำเนาบัตรประชาชน', 'ID_CARD', 1, 1, NULL, '2026-03-11 02:47:14'),
(22, 5, 'สำเนาทะเบียนบ้าน', 'HOUSE_REG', 1, 2, NULL, '2026-03-11 02:47:14'),
(23, 5, 'ใบมรณบัตรเจ้ามรดก', 'DEATH_CERT', 1, 3, NULL, '2026-03-11 02:47:14'),
(24, 5, 'พินัยกรรม/คำสั่งศาล', 'WILL_COURT_DOC', 1, 4, NULL, '2026-03-11 02:47:14'),
(25, 5, 'สำเนาทะเบียนบ้านเจ้ามรดก', 'TESTATOR_HOUSE_REG', 1, 5, NULL, '2026-03-11 02:47:14'),
(26, 5, 'สำเนาโฉนดที่ดิน (หน้า-หลัง)', 'DEED_COPY', 1, 6, NULL, '2026-03-11 02:47:14');

ALTER TABLE `document_checklist_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_template` (`template_id`);

ALTER TABLE `document_checklist_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

-- --------------------------------------------------------
-- 4) document_templates
-- --------------------------------------------------------
CREATE TABLE `document_templates` (
  `id` int(11) NOT NULL,
  `template_name` varchar(100) NOT NULL,
  `template_code` varchar(50) DEFAULT NULL,
  `content_html` text NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `document_templates` (`id`, `template_name`, `template_code`, `content_html`, `is_active`, `created_at`) VALUES
(1, 'สัญญาขายฝากมาตรฐาน', 'KF_STD_01', '<h1>สัญญาขายฝาก</h1><p>ทำที่.. วันที่..</p><p>ผู้ขายฝากชื่อ {{owner_name}}...</p>', 1, '2026-02-13 04:19:27');

ALTER TABLE `document_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `template_code` (`template_code`);

ALTER TABLE `document_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

-- --------------------------------------------------------
-- 5) sales_scripts
-- --------------------------------------------------------
CREATE TABLE `sales_scripts` (
  `id` int(11) NOT NULL,
  `script_name` varchar(200) NOT NULL COMMENT 'ชื่อสคริปต์',
  `stage` varchar(50) DEFAULT NULL COMMENT 'ใช้ในขั้นตอนไหน: chat, call, followup',
  `content` text NOT NULL COMMENT 'เนื้อหาสคริปต์',
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='สคริปต์/เช็คลิสสำหรับเซลล์ใช้คุยกับลูกค้า';

INSERT INTO `sales_scripts` (`id`, `script_name`, `stage`, `content`, `sort_order`, `is_active`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'สคริปต์คุยลูกค้าใหม่ (First Contact)', 'chat', 'สคริปต์สำหรับคุยกับลูกค้าที่ทักเข้ามาครั้งแรก', 1, 1, NULL, '2026-03-11 02:47:14', '2026-03-11 02:47:14');

ALTER TABLE `sales_scripts`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `sales_scripts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

-- --------------------------------------------------------
-- 6) sales_script_items
-- --------------------------------------------------------
CREATE TABLE `sales_script_items` (
  `id` int(11) NOT NULL,
  `script_id` int(11) NOT NULL COMMENT 'FK → sales_scripts.id',
  `question` varchar(500) NOT NULL COMMENT 'คำถาม/สิ่งที่ต้องถาม',
  `field_mapping` varchar(100) DEFAULT NULL COMMENT 'map กับ field ไหนใน CRM เช่น contact_name, property_type',
  `is_required` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รายการคำถามในแต่ละสคริปต์';

INSERT INTO `sales_script_items` (`id`, `script_id`, `question`, `field_mapping`, `is_required`, `sort_order`, `created_at`) VALUES
(1, 1, 'คุณพี่ชื่ออะไรคะ', 'contact_name', 1, 1, '2026-03-11 02:47:14'),
(2, 1, 'เบอร์โทรติดต่อ', 'contact_phone', 1, 2, '2026-03-11 02:47:14'),
(3, 1, 'ประเภททรัพย์ (บ้าน/คอนโด/ทาวน์เฮ้าส์/ตึกแถว/ที่ดินเปล่า)', 'property_type', 1, 3, '2026-03-11 02:47:14'),
(4, 1, 'โลเคชั่นอยู่ที่ไหน (จังหวัด/อำเภอ)', 'location_hint', 1, 4, '2026-03-11 02:47:14'),
(5, 1, 'ต้องการใช้เงินเท่าไหร่', 'desired_amount', 1, 5, '2026-03-11 02:47:14'),
(6, 1, 'บ้านพี่ซื้อมาเท่าไหร่ (มูลค่าเบื้องต้น)', 'estimated_value', 1, 6, '2026-03-11 02:47:14'),
(7, 1, 'มีภาระติดจำนองไหม / ติดอยู่ที่ไหน / เท่าไหร่', 'has_obligation', 1, 7, '2026-03-11 02:47:14'),
(8, 1, 'สนใจขายฝากหรือจำนอง (แจ้ง LTV 50%/30%)', 'loan_type_detail', 1, 8, '2026-03-11 02:47:14'),
(9, 1, 'ทำสัญญากี่ปี', 'contract_years', 1, 9, '2026-03-11 02:47:14');

ALTER TABLE `sales_script_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_script` (`script_id`);

ALTER TABLE `sales_script_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

-- --------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 1;

-- เสร็จแล้ว! สร้าง 6 ตารางกลับคืนพร้อมข้อมูลเดิมทั้งหมด

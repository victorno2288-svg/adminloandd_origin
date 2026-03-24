-- =====================================================
-- auction_transactions — สร้าง table + restore 8 rows
-- ใช้รันใน phpMyAdmin หรือ MySQL CLI
-- =====================================================

DROP TABLE IF EXISTS `auction_transactions`;

CREATE TABLE `auction_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `case_id` int(11) NOT NULL,
  `investor_id` int(11) DEFAULT NULL,
  `investor_name` varchar(200) DEFAULT NULL,
  `investor_code` varchar(50) DEFAULT NULL,
  `investor_phone` varchar(50) DEFAULT NULL,
  `investor_type` enum('corporate','individual') DEFAULT NULL,
  `property_value` decimal(15,2) DEFAULT NULL,
  `selling_pledge_amount` decimal(15,2) DEFAULT NULL,
  `interest_rate` decimal(10,2) DEFAULT NULL,
  `auction_land_area` varchar(100) DEFAULT NULL,
  `contract_years` int(11) DEFAULT NULL,
  `house_reg_book` text DEFAULT NULL,
  `house_reg_book_legal` text DEFAULT NULL,
  `name_change_doc` text DEFAULT NULL,
  `divorce_doc` text DEFAULT NULL,
  `spouse_consent_doc` text DEFAULT NULL,
  `spouse_id_card` text DEFAULT NULL,
  `spouse_reg_copy` text DEFAULT NULL,
  `marriage_cert` text DEFAULT NULL,
  `spouse_name_change_doc` text DEFAULT NULL,
  `borrower_id_card` text DEFAULT NULL,
  `single_cert` text DEFAULT NULL,
  `death_cert` text DEFAULT NULL,
  `will_court_doc` text DEFAULT NULL,
  `testator_house_reg` text DEFAULT NULL,
  `is_cancelled` tinyint(1) DEFAULT 0,
  `auction_status` enum('pending','auctioned','cancelled') DEFAULT 'pending',
  `recorded_by` varchar(100) DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sale_type` varchar(50) DEFAULT NULL,
  `bank_name` varchar(200) DEFAULT NULL,
  `bank_account_no` varchar(100) DEFAULT NULL,
  `bank_account_name` varchar(200) DEFAULT NULL,
  `transfer_slip` varchar(500) DEFAULT NULL,
  `land_transfer_date` date DEFAULT NULL,
  `land_transfer_time` varchar(20) DEFAULT NULL,
  `land_transfer_location` varchar(500) DEFAULT NULL,
  `land_transfer_note` text DEFAULT NULL,
  `bank_book_file` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=Aria DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- ข้อมูล 8 rows จาก backup (loandd_db (1).sql)
-- =====================================================

INSERT INTO `auction_transactions` (`id`, `case_id`, `investor_id`, `investor_name`, `investor_code`, `investor_phone`, `investor_type`, `property_value`, `selling_pledge_amount`, `interest_rate`, `auction_land_area`, `contract_years`, `house_reg_book`, `house_reg_book_legal`, `name_change_doc`, `divorce_doc`, `spouse_consent_doc`, `spouse_id_card`, `spouse_reg_copy`, `marriage_cert`, `spouse_name_change_doc`, `borrower_id_card`, `single_cert`, `death_cert`, `will_court_doc`, `testator_house_reg`, `is_cancelled`, `auction_status`, `recorded_by`, `recorded_at`, `created_at`, `updated_at`, `sale_type`, `bank_name`, `bank_account_no`, `bank_account_name`, `transfer_slip`, `land_transfer_date`, `land_transfer_time`, `land_transfer_location`, `land_transfer_note`) VALUES
(1, 1, 3, 'พี่เป้', 'CAP0001', '000000000', 'individual', 50000.00, 50000.00, 40.00, '123456', 2004, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'cancelled', 'ทาย', '2026-02-18 02:32:00', '2026-02-19 06:30:12', '2026-02-21 03:58:54', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 2, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', 'corporate', 7777.00, 8888.00, 6666.00, '5555', 2998, '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'f', '2026-02-23 09:50:00', '2026-02-23 02:48:29', '2026-02-26 08:30:44', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 4, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', NULL, 6666666.00, 66566.00, 0.50, '777777', 9999, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'g', NULL, '2026-02-25 04:08:19', '2026-02-25 04:08:55', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', NULL, NULL, '2026-02-25 04:38:06', '2026-02-25 05:01:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', NULL, NULL, '2026-02-25 10:09:43', '2026-02-25 10:09:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'pending', NULL, NULL, '2026-02-27 02:55:21', '2026-02-27 02:55:21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 8, 3, 'พี่เป้', 'CAP0001', '000000000', 'corporate', 400000000000.00, 4000.00, 40.00, '50000', 3, '["uploads/auction-docs/1772181091809-359.jpg"]', '["uploads/auction-docs/1772181095651-665.jpg"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'ระบบ', '2026-03-16 14:28:30', '2026-02-27 08:31:21', '2026-03-16 07:28:30', 'direct', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 9, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', 'individual', 600000.00, 50.00, 60.00, '69', 3, '["uploads/auction-docs/1772183271018-102.jpg"]', '["uploads/auction-docs/1772183273539-654.jpg"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'f', '2026-02-27 16:09:00', '2026-02-27 09:01:12', '2026-02-27 09:09:06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- =====================================================
-- ตั้ง AUTO_INCREMENT ให้ต่อจาก id สุดท้าย
-- =====================================================
ALTER TABLE `auction_transactions` AUTO_INCREMENT = 9;

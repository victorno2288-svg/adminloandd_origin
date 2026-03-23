-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 23, 2026 at 09:42 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `loandd_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_users`
--

CREATE TABLE `admin_users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `department` enum('super_admin','admin','sales','accounting','legal','appraisal','issuing','approval','auction') DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `status` enum('active','suspended','banned') DEFAULT 'active',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `username`, `password_hash`, `full_name`, `nickname`, `email`, `phone`, `department`, `position`, `avatar_url`, `status`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'ภัคจิรา', '$2b$10$9w8osaagoxsoTPzmEQm83.rnug3meF2iyC0OTS7CEjzxKNgsAjsK6', 'ภัคจิรา อุดมนา', 'แฟรี่', 'lafatano22@gmail.com', '0956504157', 'super_admin', 'เทสเตอร์', NULL, 'active', '2026-03-23 10:17:11', '2026-02-17 04:24:05', '2026-03-23 03:17:11'),
(3, 'ดา', '$2b$10$ahsOrgwr7Plhyki4HDVZZuw/T5a/QfRGVDW5L14IohiiinZ2lELry', 'ดา', 'ก็ดา', 'loandd02@gmail.com', '0956504157', 'sales', 'เทสเตอร์', NULL, 'active', '2026-03-23 09:56:30', '2026-02-19 08:28:41', '2026-03-23 02:56:30'),
(5, 'นุ่น', '$2b$10$2ZMbmErFoZ6rnCU7Ydzi4.cJ3gZimihr88fIhmrlUFKTLxGUHGBqW', 'คคคคค', 'คคคค', 'llll2@gmail.com', '00000000000', 'sales', 'ทาย', NULL, 'active', '2026-02-20 16:44:17', '2026-02-20 09:16:13', '2026-02-20 09:44:17');

-- --------------------------------------------------------

--
-- Table structure for table `advance_price_requests`
--

CREATE TABLE `advance_price_requests` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `loan_request_id` int(11) DEFAULT NULL,
  `case_code` varchar(50) DEFAULT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `property_type` varchar(100) DEFAULT NULL,
  `deed_type` varchar(50) DEFAULT NULL,
  `deed_number` varchar(100) DEFAULT NULL,
  `desired_amount` decimal(15,2) DEFAULT NULL,
  `estimated_value` decimal(15,2) DEFAULT NULL,
  `location_hint` text DEFAULT NULL,
  `deed_images` text DEFAULT NULL COMMENT 'JSON array of filenames',
  `requested_by` int(11) DEFAULT NULL COMMENT 'admin_users.id (เซลล์)',
  `requested_by_name` varchar(100) DEFAULT NULL,
  `note` text DEFAULT NULL COMMENT 'หมายเหตุจากเซลล์',
  `status` enum('pending','replied') NOT NULL DEFAULT 'pending',
  `preliminary_price` decimal(15,2) DEFAULT NULL COMMENT 'ราคาที่พี่เกตตอบกลับ',
  `appraiser_note` text DEFAULT NULL,
  `replied_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `agents`
--

CREATE TABLE `agents` (
  `id` int(11) NOT NULL,
  `agent_code` varchar(20) DEFAULT NULL,
  `full_name` varchar(255) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `line_id` varchar(100) DEFAULT NULL,
  `facebook` varchar(255) DEFAULT NULL,
  `national_id` varchar(50) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `bank_account_number` varchar(50) DEFAULT NULL,
  `bank_account_name` varchar(255) DEFAULT NULL,
  `area` varchar(500) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT 0.00,
  `id_card_image` text DEFAULT NULL,
  `contract_file` varchar(500) DEFAULT NULL,
  `contract_date` date DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `date_of_birth` date DEFAULT NULL COMMENT 'วันเกิดนายหน้า',
  `national_id_expiry` date DEFAULT NULL COMMENT 'วันหมดอายุบัตร',
  `address` text DEFAULT NULL COMMENT 'ที่อยู่ตามทะเบียนบ้าน',
  `house_registration_image` varchar(500) DEFAULT NULL COMMENT 'สำเนาทะเบียนบ้าน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `agents`
--

INSERT INTO `agents` (`id`, `agent_code`, `full_name`, `nickname`, `phone`, `email`, `line_id`, `facebook`, `national_id`, `bank_name`, `bank_account_number`, `bank_account_name`, `area`, `commission_rate`, `id_card_image`, `contract_file`, `contract_date`, `status`, `created_at`, `updated_at`, `date_of_birth`, `national_id_expiry`, `address`, `house_registration_image`) VALUES
(1, 'LDD0001', 'ง่วง', 'ไม่บอก', '00000000', 'loandd02@gmail.com', '@kkk', NULL, NULL, NULL, NULL, NULL, NULL, 90.00, 'uploads/id-cards/1771467780103-403.jpg', NULL, NULL, 'active', '2026-02-18 04:20:15', '2026-02-23 10:27:33', NULL, NULL, NULL, NULL),
(2, 'LDD0002', 'ลอง', 'ระบบ', '0956504157', 'aaaa@hotmail.com', 'fffff', NULL, NULL, NULL, NULL, NULL, NULL, 3.00, 'uploads/id-cards/1771813661205-559.jpeg', NULL, NULL, 'active', '2026-02-23 02:27:41', '2026-03-02 09:09:39', NULL, NULL, NULL, NULL),
(5, 'AGT0001', 'นอนเล่น', 'ธาม', '09998788', 'lo@gmail.com', '@mager', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, NULL, NULL, NULL, 'active', '2026-02-24 08:21:27', '2026-03-20 03:27:34', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `agent_accounting`
--

CREATE TABLE `agent_accounting` (
  `id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `case_id` int(11) DEFAULT NULL,
  `team` varchar(50) DEFAULT NULL,
  `commission_amount` decimal(12,2) DEFAULT 0.00,
  `payment_date` date DEFAULT NULL,
  `commission_slip` varchar(500) DEFAULT NULL,
  `payment_status` enum('paid','unpaid') DEFAULT 'unpaid',
  `recorded_by` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `agent_accounting`
--

INSERT INTO `agent_accounting` (`id`, `agent_id`, `case_id`, `team`, `commission_amount`, `payment_date`, `commission_slip`, `payment_status`, `recorded_by`, `created_at`, `updated_at`) VALUES
(1, 1, 1, NULL, 7000.00, NULL, '/uploads/general/1771404040482-748.jpg', 'paid', 'ทาย', '2026-02-18 08:40:59', '2026-02-18 08:40:59'),
(2, 2, 9, NULL, 18000.00, '2026-02-23', '/uploads/general/1771813974218-632.jpg', 'paid', 'f', '2026-02-23 02:33:16', '2026-03-18 08:01:19');

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `case_id` int(11) DEFAULT NULL,
  `loan_request_id` int(11) DEFAULT NULL,
  `appt_type` varchar(50) NOT NULL DEFAULT 'valuation',
  `appt_date` date DEFAULT NULL,
  `appt_time` time DEFAULT NULL,
  `location` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `assigned_to_id` int(11) DEFAULT NULL,
  `assigned_to_name` varchar(200) DEFAULT NULL,
  `created_by_id` int(11) DEFAULT NULL,
  `created_by_name` varchar(200) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'scheduled',
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `approval_transactions`
--

CREATE TABLE `approval_transactions` (
  `id` int(11) NOT NULL,
  `case_id` int(11) DEFAULT NULL,
  `loan_request_id` int(11) DEFAULT NULL,
  `approval_type` enum('selling_pledge','mortgage') DEFAULT NULL COMMENT 'ประเภท: ขายฝาก/จำนอง',
  `approved_credit` decimal(15,2) DEFAULT NULL COMMENT 'วงเงินอนุมัติ',
  `interest_per_year` decimal(10,2) DEFAULT NULL COMMENT 'ดอกเบี้ยต่อปี',
  `interest_per_month` decimal(10,2) DEFAULT NULL COMMENT 'ดอกเบี้ยต่อเดือน',
  `operation_fee` decimal(15,2) DEFAULT NULL COMMENT 'ค่าดำเนินการ',
  `land_tax_estimate` decimal(15,2) DEFAULT NULL COMMENT 'ค่าประมาณการภาษีจากกรมที่ดิน',
  `advance_interest` decimal(15,2) DEFAULT NULL COMMENT 'ดอกเบี้ยล่วงหน้า',
  `advance_interest_months` int(11) DEFAULT NULL COMMENT 'หักดอกเบี้ยล่วงหน้ากี่เดือน (3/6/9/12)',
  `net_disbursement` decimal(15,2) DEFAULT NULL COMMENT 'ยอดเบิกจ่ายสุทธิหลังหักดอกล่วงหน้า+ค่าดำเนินการ',
  `credit_table_file` varchar(500) DEFAULT NULL,
  `is_cancelled` tinyint(1) DEFAULT 0 COMMENT 'ยกเลิกรายการเคสนี้',
  `approval_status` enum('pending','approved','cancelled') DEFAULT 'pending' COMMENT 'สถานะ: ผ่านประเมิน/อนุมัติวงเงิน/เคสยกเลิก',
  `recorded_by` varchar(100) DEFAULT NULL COMMENT 'ผู้บันทึก',
  `recorded_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่บันทึก',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `approval_date` date DEFAULT NULL,
  `offer_manager_status` varchar(30) DEFAULT 'draft' COMMENT 'draft | pending_manager | manager_approved | manager_rejected',
  `offer_sent_at` datetime DEFAULT NULL COMMENT 'เวลาที่ส่งข้อเสนอให้ผู้จัดการอนุมัติ',
  `manager_approved_by` int(11) DEFAULT NULL COMMENT 'user_id ของผู้จัดการที่อนุมัติ',
  `manager_approved_at` datetime DEFAULT NULL,
  `manager_note` text DEFAULT NULL COMMENT 'หมายเหตุจากผู้จัดการ',
  `customer_sent_at` datetime DEFAULT NULL COMMENT 'เวลาที่ส่งข้อเสนอให้ลูกค้าแล้ว',
  `payment_schedule_approved` tinyint(1) DEFAULT 0,
  `payment_schedule_approved_at` datetime DEFAULT NULL,
  `approval_schedule_file` text DEFAULT NULL,
  `credit_table_file2` text DEFAULT NULL COMMENT 'ตารางวงเงินไฟล์ที่ 2'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `approval_transactions`
--

INSERT INTO `approval_transactions` (`id`, `case_id`, `loan_request_id`, `approval_type`, `approved_credit`, `interest_per_year`, `interest_per_month`, `operation_fee`, `land_tax_estimate`, `advance_interest`, `advance_interest_months`, `net_disbursement`, `credit_table_file`, `is_cancelled`, `approval_status`, `recorded_by`, `recorded_at`, `created_at`, `updated_at`, `approval_date`, `offer_manager_status`, `offer_sent_at`, `manager_approved_by`, `manager_approved_at`, `manager_note`, `customer_sent_at`, `payment_schedule_approved`, `payment_schedule_approved_at`, `approval_schedule_file`, `credit_table_file2`) VALUES
(1, 1, NULL, 'mortgage', 45555.00, 0.50, 45.00, 23333.00, 33333.00, 33333.00, NULL, NULL, NULL, 0, 'cancelled', 'ทาย', '2026-02-18 22:02:00', '2026-02-19 04:11:25', '2026-02-26 08:11:24', NULL, 'draft', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(6, 1, 18, 'mortgage', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/credit_tables/credit_1772186128377.pdf', 1, 'approved', NULL, NULL, '2026-02-27 07:46:24', '2026-03-13 03:55:14', NULL, 'draft', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(7, NULL, 29, 'selling_pledge', 30000.00, 4.50, 0.18, 40000.00, 5000.00, 20000.00, NULL, NULL, '/uploads/credit_tables/credit_1772179351921.jpg', 0, 'approved', 'fairy', '2026-02-27 08:03:00', '2026-02-27 08:02:25', '2026-03-13 03:55:12', '2026-02-26', 'draft', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(8, NULL, 30, 'mortgage', 600000.00, 4.00, 1.40, 30000.00, 29998.00, 2000.00, NULL, NULL, '/uploads/credit_tables/credit_1772787020106.png', 0, 'approved', 'g', '2026-02-27 08:57:00', '2026-02-27 08:56:29', '2026-03-13 03:55:06', '2026-02-26', 'pending_manager', '2026-03-11 15:46:49', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(9, NULL, 33, 'mortgage', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '/uploads/credit_tables/credit_1773986996349.png', 0, 'approved', 'ระบบ', '2026-03-21 08:28:33', '2026-03-02 02:17:42', '2026-03-21 01:28:33', '2026-02-12', 'draft', NULL, NULL, NULL, NULL, NULL, 2, NULL, '/uploads/credit_tables/apv_schedule_1773912896826.png', NULL),
(10, NULL, 34, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'pending', NULL, NULL, '2026-03-02 07:23:12', '2026-03-02 07:23:12', NULL, 'draft', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(11, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'cancelled', NULL, NULL, '2026-03-02 08:47:07', '2026-03-02 08:47:10', NULL, 'draft', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL),
(12, NULL, 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'pending', NULL, NULL, '2026-03-20 02:17:03', '2026-03-20 02:17:03', NULL, 'draft', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `auction_bids`
--

CREATE TABLE `auction_bids` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `bid_amount` decimal(15,2) DEFAULT NULL,
  `investor_id` int(11) DEFAULT NULL,
  `investor_name` varchar(255) DEFAULT NULL,
  `investor_code` varchar(100) DEFAULT NULL,
  `investor_phone` varchar(50) DEFAULT NULL,
  `bid_date` date DEFAULT NULL,
  `note` text DEFAULT NULL,
  `recorded_by` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auction_bids`
--

INSERT INTO `auction_bids` (`id`, `case_id`, `bid_amount`, `investor_id`, `investor_name`, `investor_code`, `investor_phone`, `bid_date`, `note`, `recorded_by`, `created_at`, `updated_at`) VALUES
(2, 8, 9000.00, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', '2026-02-27', NULL, 'fairy', '2026-02-27 15:37:39', '2026-02-27 15:37:39'),
(3, 8, 400000000000.00, 3, 'พี่เป้', 'CAP0001', '000000000', NULL, NULL, 'fairy', '2026-02-27 15:37:52', '2026-02-27 15:37:52'),
(4, 9, 600000.00, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', NULL, NULL, 'f', '2026-02-27 16:08:21', '2026-02-27 16:08:21');

-- --------------------------------------------------------

--
-- Table structure for table `auction_transactions`
--

CREATE TABLE `auction_transactions` (
  `id` int(11) NOT NULL,
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
  `house_reg_book` text DEFAULT NULL COMMENT 'เล่มทะเบียนบ้าน (JSON array)',
  `house_reg_book_legal` text DEFAULT NULL COMMENT 'เล่มทะเบียนบ้านที่ทำนิติกรรม (JSON array)',
  `name_change_doc` text DEFAULT NULL COMMENT 'ใบเปลี่ยนชื่อนามสกุล (JSON array)',
  `divorce_doc` text DEFAULT NULL COMMENT 'ใบหย่า (JSON array)',
  `spouse_consent_doc` text DEFAULT NULL COMMENT 'หนังสือยินยอมคู่สมรส (JSON array)',
  `spouse_id_card` text DEFAULT NULL COMMENT 'บัตรประชาชนคู่สมรส (JSON array)',
  `spouse_reg_copy` text DEFAULT NULL COMMENT 'สำเนาทะเบียนคู่สมรส (JSON array)',
  `marriage_cert` text DEFAULT NULL COMMENT 'ทะเบียนสมรส (JSON array)',
  `spouse_name_change_doc` text DEFAULT NULL COMMENT 'ใบเปลี่ยนชื่อนามสกุลคู่สมรส (JSON array)',
  `borrower_id_card` text DEFAULT NULL COMMENT 'สำเนาบัตรประชาชนผู้กู้',
  `single_cert` text DEFAULT NULL COMMENT 'หนังสือรับรองโสด',
  `death_cert` text DEFAULT NULL COMMENT 'ใบมรณบัตรเจ้ามรดก',
  `will_court_doc` text DEFAULT NULL COMMENT 'พินัยกรรม/คำสั่งศาล',
  `testator_house_reg` text DEFAULT NULL COMMENT 'สำเนาทะเบียนบ้านเจ้ามรดก',
  `is_cancelled` tinyint(1) DEFAULT 0,
  `auction_status` enum('pending','auctioned','cancelled') DEFAULT 'pending',
  `recorded_by` varchar(100) DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sale_type` varchar(50) DEFAULT NULL COMMENT 'ประเภทการขาย auction/direct',
  `bank_name` varchar(200) DEFAULT NULL,
  `bank_account_no` varchar(100) DEFAULT NULL,
  `bank_account_name` varchar(200) DEFAULT NULL,
  `transfer_slip` varchar(500) DEFAULT NULL,
  `land_transfer_date` date DEFAULT NULL,
  `land_transfer_time` varchar(20) DEFAULT NULL,
  `land_transfer_location` varchar(500) DEFAULT NULL,
  `land_transfer_note` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auction_transactions`
--

INSERT INTO `auction_transactions` (`id`, `case_id`, `investor_id`, `investor_name`, `investor_code`, `investor_phone`, `investor_type`, `property_value`, `selling_pledge_amount`, `interest_rate`, `auction_land_area`, `contract_years`, `house_reg_book`, `house_reg_book_legal`, `name_change_doc`, `divorce_doc`, `spouse_consent_doc`, `spouse_id_card`, `spouse_reg_copy`, `marriage_cert`, `spouse_name_change_doc`, `borrower_id_card`, `single_cert`, `death_cert`, `will_court_doc`, `testator_house_reg`, `is_cancelled`, `auction_status`, `recorded_by`, `recorded_at`, `created_at`, `updated_at`, `sale_type`, `bank_name`, `bank_account_no`, `bank_account_name`, `transfer_slip`, `land_transfer_date`, `land_transfer_time`, `land_transfer_location`, `land_transfer_note`) VALUES
(1, 1, 3, 'พี่เป้', 'CAP0001', '000000000', 'individual', 50000.00, 50000.00, 40.00, '123456', 2004, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'cancelled', 'ทาย', '2026-02-18 02:32:00', '2026-02-19 06:30:12', '2026-02-21 03:58:54', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 2, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', 'corporate', 7777.00, 8888.00, 6666.00, '5555', 2998, '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'f', '2026-02-23 09:50:00', '2026-02-23 02:48:29', '2026-02-26 08:30:44', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 4, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', NULL, 6666666.00, 66566.00, 0.50, '777777', 9999, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'g', NULL, '2026-02-25 04:08:19', '2026-02-25 04:08:55', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', NULL, NULL, '2026-02-25 04:38:06', '2026-02-25 05:01:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', NULL, NULL, '2026-02-25 10:09:43', '2026-02-25 10:09:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'pending', NULL, NULL, '2026-02-27 02:55:21', '2026-02-27 02:55:21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 8, 3, 'พี่เป้', 'CAP0001', '000000000', 'corporate', 400000000000.00, 4000.00, 40.00, '50000', 3, '[\"uploads/auction-docs/1772181091809-359.jpg\"]', '[\"uploads/auction-docs/1772181095651-665.jpg\"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'ระบบ', '2026-03-16 14:28:30', '2026-02-27 08:31:21', '2026-03-16 07:28:30', 'direct', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 9, 4, 'มะเมียมะมะมะเมีย', 'CAP0002', '1245677874', 'individual', 600000.00, 50.00, 60.00, '69', 3, '[\"uploads/auction-docs/1772183271018-102.jpg\"]', '[\"uploads/auction-docs/1772183273539-654.jpg\"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'auctioned', 'f', '2026-02-27 16:09:00', '2026-02-27 09:01:12', '2026-02-27 09:09:06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `cases`
--

CREATE TABLE `cases` (
  `id` int(11) NOT NULL,
  `case_code` varchar(20) NOT NULL COMMENT 'รหัสเคส เช่น LDD0001',
  `loan_request_id` int(11) DEFAULT NULL COMMENT 'FK → loan_requests',
  `user_id` int(11) DEFAULT NULL COMMENT 'FK → users (ลูกหนี้)',
  `agent_id` int(11) DEFAULT NULL COMMENT 'FK → agents (นายหน้า ถ้ามี)',
  `assigned_sales_id` int(11) DEFAULT NULL COMMENT 'FK → admin_users (เซลล์ที่ดูแล)',
  `appraisal_company_id` int(11) DEFAULT NULL COMMENT 'FK → appraisal_companies.id บริษัทประเมินที่ดูแลเคสนี้',
  `status` enum('new','contacting','incomplete','awaiting_appraisal_fee','appraisal_scheduled','appraisal_passed','appraisal_not_passed','pending_approve','credit_approved','pending_auction','preparing_docs','legal_scheduled','legal_completed','completed','cancelled') DEFAULT 'new',
  `pipeline_stage` varchar(50) DEFAULT 'chat',
  `sale_method` enum('direct','auction','pending') DEFAULT 'pending' COMMENT 'วิธีขาย: direct=ขายตรง/เทลเซล, auction=ประมูล, pending=ยังไม่กำหนด',
  `exclusive_contract_file` varchar(500) DEFAULT NULL COMMENT 'ไฟล์สัญญาแต่งตั้งนายหน้า exclusive',
  `contract_option` enum('A','B','C') DEFAULT NULL COMMENT 'Option สัญญาแต่งตั้งนายหน้า (A/B/C)',
  `contract_auto_generated` tinyint(1) DEFAULT 0 COMMENT 'สัญญาถูก auto-generate จาก OCR หรือไม่',
  `contract_pdf_file` varchar(500) DEFAULT NULL COMMENT 'ไฟล์สัญญา PDF ที่ auto-generate แล้ว',
  `contract_signed_back_image` varchar(500) DEFAULT NULL COMMENT 'รูปถ่ายสัญญาที่ลูกค้าเซ็นแล้วส่งกลับมา',
  `exclusive_contract_signed` tinyint(1) DEFAULT 0 COMMENT 'ลูกค้าเซ็นสัญญาแต่งตั้งแล้ว',
  `exclusive_contract_signed_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่เซ็นสัญญา',
  `debtor_docs_complete` tinyint(1) DEFAULT 0 COMMENT 'เอกสารลูกหนี้ครบแล้ว (ปุ่มนัดวันถึงจะโผล่)',
  `debtor_docs_complete_at` datetime DEFAULT NULL,
  `investor_docs_complete` tinyint(1) DEFAULT 0 COMMENT 'เอกสารนายทุนครบแล้ว',
  `investor_docs_complete_at` datetime DEFAULT NULL,
  `appointment_unlocked` tinyint(1) DEFAULT 0 COMMENT 'ปุ่มนัดวันเปิดแล้ว (ทั้งสองฝ่ายครบ)',
  `last_follow_up_at` datetime DEFAULT NULL,
  `follow_up_count` int(11) NOT NULL DEFAULT 0,
  `payment_status` enum('unpaid','paid') DEFAULT 'unpaid' COMMENT 'ค่าประเมิน 2900',
  `appraisal_fee` decimal(10,2) DEFAULT 2900.00,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `appraisal_type` enum('outside','inside','check_price') DEFAULT 'outside',
  `appraisal_result` enum('passed','not_passed') DEFAULT NULL,
  `appraisal_date` date DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `slip_image` text DEFAULT NULL,
  `appraisal_book_image` text DEFAULT NULL,
  `recorded_by` varchar(100) DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `transaction_date` date DEFAULT NULL COMMENT 'วันที่ธุรกรรม (ฝ่ายขายกรอก)',
  `transaction_time` varchar(10) DEFAULT NULL COMMENT 'เวลา เช่น 10:00',
  `transaction_land_office` varchar(255) DEFAULT NULL COMMENT 'สำนักงานที่ดิน',
  `transaction_note` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `transaction_recorded_by` varchar(100) DEFAULT NULL COMMENT 'ผู้บันทึก',
  `transaction_recorded_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่บันทึก (auto)',
  `outside_result` varchar(50) DEFAULT NULL,
  `outside_reason` text DEFAULT NULL,
  `outside_recorded_at` datetime DEFAULT NULL,
  `inside_result` varchar(50) DEFAULT NULL,
  `inside_reason` text DEFAULT NULL,
  `inside_recorded_at` datetime DEFAULT NULL,
  `check_price_value` decimal(15,2) DEFAULT NULL,
  `check_price_detail` text DEFAULT NULL,
  `check_price_recorded_at` datetime DEFAULT NULL,
  `land_transfer_date` date DEFAULT NULL,
  `land_transfer_note` varchar(500) DEFAULT NULL,
  `broker_contract_signed` tinyint(1) NOT NULL DEFAULT 0,
  `broker_contract_date` date DEFAULT NULL,
  `broker_contract_file` text DEFAULT NULL,
  `land_transfer_time` varchar(10) DEFAULT NULL,
  `land_transfer_location` varchar(300) DEFAULT NULL,
  `next_follow_up_at` datetime DEFAULT NULL,
  `investor_marital_status` varchar(50) DEFAULT NULL COMMENT 'สถานะบุคคลนักลงทุน: single/married/divorced/widowed/poa/company',
  `commission_paid` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'ลูกหนี้โอนค่าคอมให้บริษัทแล้ว (0=ยัง, 1=แล้ว)',
  `commission_amount` decimal(12,2) DEFAULT NULL COMMENT 'จำนวนเงินค่าคอมมิชชั่น (บาท)',
  `commission_slip` varchar(500) DEFAULT NULL COMMENT 'ไฟล์สลิปค่าคอมมิชชั่นที่ลูกหนี้โอนให้บริษัท',
  `broker_id_file` varchar(500) DEFAULT NULL COMMENT 'รูปบัตรประชาชนนายหน้า (path)',
  `investor_amount` decimal(15,2) DEFAULT NULL,
  `contract_start_date` date DEFAULT NULL,
  `contract_end_date` date DEFAULT NULL,
  `contract_redemption_amount` decimal(15,2) DEFAULT NULL COMMENT 'ยอดสินไถ่ตามสัญญาขายฝาก (วงเงิน + ดอกเบี้ยตลอดสัญญา)',
  `transaction_slip` text DEFAULT NULL,
  `advance_slip` varchar(500) DEFAULT NULL COMMENT 'สลิปค่าหักล่วงหน้า'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cases`
--

INSERT INTO `cases` (`id`, `case_code`, `loan_request_id`, `user_id`, `agent_id`, `assigned_sales_id`, `appraisal_company_id`, `status`, `pipeline_stage`, `sale_method`, `exclusive_contract_file`, `contract_option`, `contract_auto_generated`, `contract_pdf_file`, `contract_signed_back_image`, `exclusive_contract_signed`, `exclusive_contract_signed_at`, `debtor_docs_complete`, `debtor_docs_complete_at`, `investor_docs_complete`, `investor_docs_complete_at`, `appointment_unlocked`, `last_follow_up_at`, `follow_up_count`, `payment_status`, `appraisal_fee`, `approved_amount`, `note`, `appraisal_type`, `appraisal_result`, `appraisal_date`, `payment_date`, `slip_image`, `appraisal_book_image`, `recorded_by`, `recorded_at`, `created_at`, `updated_at`, `transaction_date`, `transaction_time`, `transaction_land_office`, `transaction_note`, `transaction_recorded_by`, `transaction_recorded_at`, `outside_result`, `outside_reason`, `outside_recorded_at`, `inside_result`, `inside_reason`, `inside_recorded_at`, `check_price_value`, `check_price_detail`, `check_price_recorded_at`, `land_transfer_date`, `land_transfer_note`, `broker_contract_signed`, `broker_contract_date`, `broker_contract_file`, `land_transfer_time`, `land_transfer_location`, `next_follow_up_at`, `investor_marital_status`, `commission_paid`, `commission_amount`, `commission_slip`, `broker_id_file`, `investor_amount`, `contract_start_date`, `contract_end_date`, `contract_redemption_amount`, `transaction_slip`, `advance_slip`) VALUES
(1, '0001', 18, NULL, 1, NULL, NULL, 'credit_approved', 'chat', 'pending', NULL, NULL, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 0, NULL, 0, 'paid', 5000.00, 246666.00, NULL, 'outside', 'passed', '2026-02-18', '2026-02-08', 'uploads/slips/1771467833852-305.jpg', 'uploads/appraisal-books/1771388483754-712.jpg', 'ทาย', '2026-02-15 13:21:23', '2026-02-18 04:21:23', '2026-03-13 03:55:14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 'CS0001', 29, NULL, NULL, NULL, NULL, 'preparing_docs', 'chat', 'pending', NULL, NULL, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 0, NULL, 0, 'unpaid', 4500.00, 50000.00, NULL, 'outside', NULL, '2026-02-23', NULL, 'uploads/slips/1773303870262-307.png', NULL, 'ระบบ', '2026-03-20 10:20:04', '2026-02-27 08:29:58', '2026-03-20 07:40:52', '2026-03-23', '10.00 น.', 'มีนบุรี', NULL, 'ระบบ', '2026-03-20 10:20:04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 'CS0002', 30, NULL, 2, NULL, NULL, 'legal_completed', 'chat', 'pending', NULL, NULL, 0, NULL, NULL, 0, NULL, 0, NULL, 0, NULL, 0, NULL, 0, 'paid', 1000.00, NULL, NULL, 'inside', NULL, '2026-02-22', NULL, NULL, NULL, 'ระบบ', '2026-03-20 11:28:03', '2026-02-27 08:59:44', '2026-03-20 04:28:03', '2026-02-23', '09.00', 'โคราช', NULL, 'ระบบ', '2026-03-20 11:28:03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, 'uploads/issuing/broker-contract/1773731310052-734.png', NULL, NULL, NULL, 'married', 0, NULL, NULL, 'uploads/issuing/broker-id/1773731310062-880.png', NULL, NULL, NULL, NULL, 'uploads/slips/1773980859795-251.png', 'uploads/slips/1773980883097-533.png');

-- --------------------------------------------------------

--
-- Table structure for table `case_cancellations`
--

CREATE TABLE `case_cancellations` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL COMMENT 'admin_users.id ผู้ขอยกเลิก',
  `reason` text NOT NULL COMMENT 'เหตุผลที่ขอยกเลิก',
  `previous_status` varchar(50) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT 'สถานะ: รอการอนุมัติ/อนุมัติ/ปฏิเสธ',
  `approved_by` int(11) DEFAULT NULL COMMENT 'admin_users.id ผู้อนุมัติ/ปฏิเสธ',
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `case_cancellations`
--

INSERT INTO `case_cancellations` (`id`, `case_id`, `requested_by`, `reason`, `previous_status`, `status`, `approved_by`, `approved_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'ไม่พร้อม', NULL, 'approved', NULL, '2026-02-20 09:35:26', '2026-02-20 02:34:53', '2026-02-20 02:35:26');

-- --------------------------------------------------------

--
-- Table structure for table `case_followups`
--

CREATE TABLE `case_followups` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `sales_id` int(11) DEFAULT NULL COMMENT 'admin_users.id',
  `sales_name` varchar(100) DEFAULT NULL,
  `followup_type` enum('chat','call','note') NOT NULL DEFAULT 'note',
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `next_followup_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `case_transfer_log`
--

CREATE TABLE `case_transfer_log` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `lr_id` int(11) DEFAULT NULL,
  `from_sales_id` int(11) DEFAULT NULL,
  `from_sales_name` varchar(100) DEFAULT NULL,
  `to_sales_id` int(11) NOT NULL,
  `to_sales_name` varchar(100) DEFAULT NULL,
  `transferred_by` int(11) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_conversations`
--

CREATE TABLE `chat_conversations` (
  `id` int(11) NOT NULL,
  `customer_code` varchar(20) DEFAULT NULL COMMENT 'รหัสลูกค้าอัตโนมัติ เช่น CUS0001',
  `platform` enum('facebook','line','tiktok') NOT NULL COMMENT 'แพลตฟอร์มที่มา',
  `platform_conversation_id` varchar(255) NOT NULL COMMENT 'FB conversation_id หรือ LINE userId',
  `customer_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อลูกค้า',
  `customer_phone` varchar(20) DEFAULT NULL COMMENT 'เบอร์โทร (parse จากแชท)',
  `customer_email` varchar(255) DEFAULT NULL COMMENT 'อีเมล (parse จากแชท)',
  `contact_facebook` varchar(300) DEFAULT NULL,
  `contact_line` varchar(200) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `monthly_income` decimal(15,2) DEFAULT NULL,
  `customer_avatar` varchar(500) DEFAULT NULL COMMENT 'URL รูปโปรไฟล์',
  `customer_platform_id` varchar(255) DEFAULT NULL COMMENT 'FB PSID หรือ LINE userId',
  `status` enum('unread','read','replied') DEFAULT 'unread',
  `is_dead` tinyint(1) NOT NULL DEFAULT 0,
  `dead_reason` varchar(255) DEFAULT NULL,
  `dead_at` datetime DEFAULT NULL,
  `lead_quality` varchar(20) DEFAULT 'unknown',
  `ghost_detected_at` datetime DEFAULT NULL,
  `first_response_at` datetime DEFAULT NULL,
  `first_response_by` varchar(100) DEFAULT NULL,
  `first_response_seconds` int(11) DEFAULT NULL,
  `last_replied_by_id` int(11) DEFAULT NULL,
  `last_replied_by_name` varchar(100) DEFAULT NULL,
  `last_message_text` text DEFAULT NULL COMMENT 'ข้อความล่าสุด (แสดง preview)',
  `last_message_at` timestamp NULL DEFAULT NULL,
  `last_message_from` varchar(20) DEFAULT NULL,
  `follow_up_count` int(11) NOT NULL DEFAULT 0,
  `last_follow_up_at` datetime DEFAULT NULL,
  `next_follow_up_at` datetime DEFAULT NULL,
  `followup_note` text DEFAULT NULL,
  `followup_reminded_at` datetime DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL COMMENT 'FK admin_users.id (พนักงานที่รับเคส)',
  `notes` text DEFAULT NULL COMMENT 'บันทึกภายใน',
  `property_type` varchar(50) DEFAULT NULL COMMENT 'บ้านเดี่ยว | ทาวน์เฮ้าส์ | คอนโด | อาคารพาณิชย์ | ที่ดินเปล่า — parse จากแชท',
  `property_project` varchar(200) DEFAULT NULL,
  `bedrooms` tinyint(4) DEFAULT NULL,
  `deed_type` varchar(20) DEFAULT NULL COMMENT 'chanote=โฉนด✅ | ns4k=น.ส.4ก✅ | ns3=นส.3❌ | ns3k=นส.3ก❌ | spk=สปก❌',
  `loan_type_detail` varchar(20) DEFAULT NULL COMMENT 'mortgage=จำนอง(LTV30-40%) | selling_pledge=ขายฝาก(LTV50-60%)',
  `estimated_value` decimal(15,2) DEFAULT NULL COMMENT 'วงเงินที่ลูกค้าต้องการ — parse จากตัวเลขในแชท',
  `preliminary_price` decimal(15,2) DEFAULT NULL COMMENT 'ราคากะก่อนลงประเมินจริง (จากบริษัทประเมิน)',
  `location_hint` varchar(255) DEFAULT NULL COMMENT 'จังหวัด/ที่ตั้งทรัพย์ — parse จากแชท',
  `has_obligation` varchar(5) DEFAULT NULL COMMENT 'yes | no — parse จากแชท (ติดจำนอง/ไม่ติด)',
  `contract_years` int(11) DEFAULT NULL,
  `ineligible_property` tinyint(1) DEFAULT 0 COMMENT 'ทรัพย์ไม่ผ่านเกณฑ์ SOP (ที่เกษตร/น.ส.3/สปก/ตาบอด)',
  `ineligible_reason` varchar(255) DEFAULT NULL COMMENT 'เหตุผลที่ไม่ผ่านเกณฑ์',
  `intent_type` varchar(50) DEFAULT NULL COMMENT 'intent: loan_inquiry|ask_interest|ask_fee|contract_renewal|ask_appraisal',
  `is_refinance` tinyint(1) DEFAULT 0 COMMENT 'ลูกค้าต้องการรีไฟแนนซ์',
  `is_agent` tinyint(1) NOT NULL DEFAULT 0,
  `agent_name` varchar(255) DEFAULT NULL,
  `agent_phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tag_id` int(11) DEFAULT NULL,
  `linked_profile_id` int(11) DEFAULT NULL,
  `is_blacklisted` tinyint(1) NOT NULL DEFAULT 0,
  `lead_grade` enum('A','B','C','D','F','ghost') DEFAULT NULL COMMENT 'เกรดลูกค้า: A=สนใจมาก, B=สนใจปานกลาง, C=สนใจน้อย, D=ไม่ตรงเกณฑ์, F=ปฏิเสธ, ghost=แชทผี',
  `grade_reason` varchar(255) DEFAULT NULL COMMENT 'เหตุผลที่จัดเกรด',
  `dead_reason_id` int(11) DEFAULT NULL COMMENT 'FK → dead_lead_reasons.id เหตุผลที่ dead',
  `dead_reason_detail` text DEFAULT NULL COMMENT 'รายละเอียดเพิ่มเติม (AI วิเคราะห์)',
  `dead_classified_by` enum('ai','manual') DEFAULT NULL COMMENT 'ใครเป็นคน classify: AI หรือ admin',
  `dead_classified_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่ classify',
  `graded_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่จัดเกรด',
  `graded_by` int(11) DEFAULT NULL COMMENT 'FK → admin_users.id ผู้จัดเกรด',
  `loan_request_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_conversations`
--

INSERT INTO `chat_conversations` (`id`, `customer_code`, `platform`, `platform_conversation_id`, `customer_name`, `customer_phone`, `customer_email`, `contact_facebook`, `contact_line`, `province`, `monthly_income`, `customer_avatar`, `customer_platform_id`, `status`, `is_dead`, `dead_reason`, `dead_at`, `lead_quality`, `ghost_detected_at`, `first_response_at`, `first_response_by`, `first_response_seconds`, `last_replied_by_id`, `last_replied_by_name`, `last_message_text`, `last_message_at`, `last_message_from`, `follow_up_count`, `last_follow_up_at`, `next_follow_up_at`, `followup_note`, `followup_reminded_at`, `assigned_to`, `notes`, `property_type`, `property_project`, `bedrooms`, `deed_type`, `loan_type_detail`, `estimated_value`, `preliminary_price`, `location_hint`, `has_obligation`, `contract_years`, `ineligible_property`, `ineligible_reason`, `intent_type`, `is_refinance`, `is_agent`, `agent_name`, `agent_phone`, `created_at`, `updated_at`, `tag_id`, `linked_profile_id`, `is_blacklisted`, `lead_grade`, `grade_reason`, `dead_reason_id`, `dead_reason_detail`, `dead_classified_by`, `dead_classified_at`, `graded_at`, `graded_by`, `loan_request_id`) VALUES
(15, NULL, 'line', 'U8ad6afc9893d3aaef217ef8718d027e1', 'ภัทร', '0955635331', '', NULL, NULL, NULL, NULL, 'https://sprofile.line-scdn.net/0h6YXMvEaFaXZ1NHaLzEsXSAVkahxWRTBkCwUlR0BgMEFLVCp1WlouQxc0NxVMDConW1YhFElgM0JXdkt4IFpWbSc9NxwoTUhrGgklaTZgRE4cb1IiGSJtdkcxNhYBYG9dPRtZTiRaMEQfX29dMC8hYkZUfihLBEUpHWMFIHAGB_UaNh4jWFMuEEk2N0TA', 'U8ad6afc9893d3aaef217ef8718d027e1', 'read', 0, NULL, NULL, 'unknown', NULL, NULL, NULL, NULL, NULL, NULL, 'uuuu', '2026-03-02 10:22:52', NULL, 0, NULL, NULL, NULL, NULL, 3, NULL, NULL, NULL, NULL, 'chanote', 'mortgage', 700000.00, NULL, 'กรุงเทพ', 'yes', 7, 0, NULL, NULL, 0, 0, NULL, NULL, '2026-02-25 08:04:59', '2026-03-16 10:30:20', 1, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 33);

-- --------------------------------------------------------

--
-- Table structure for table `chat_followups`
--

CREATE TABLE `chat_followups` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `agent_id` int(11) DEFAULT NULL COMMENT 'admin_users.id',
  `agent_name` varchar(100) DEFAULT NULL,
  `followup_type` enum('chat','call','note','line_msg','facebook_msg') NOT NULL DEFAULT 'note',
  `note` text DEFAULT NULL,
  `response_time_min` int(11) DEFAULT NULL COMMENT 'นาทีที่ตอบกลับหลังจากลูกค้าทัก',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL COMMENT 'FK chat_conversations.id',
  `platform_message_id` varchar(255) DEFAULT NULL COMMENT 'message ID จากแพลตฟอร์ม',
  `sender_type` enum('customer','admin') NOT NULL,
  `sender_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อผู้ส่ง',
  `message_text` text DEFAULT NULL,
  `message_type` enum('text','image','sticker','file','location') DEFAULT 'text',
  `attachment_url` varchar(500) DEFAULT NULL COMMENT 'URL ไฟล์แนบ/รูป/สติกเกอร์',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `sender_id` int(11) DEFAULT NULL COMMENT 'admin_users.id ของคนที่ตอบ (NULL ถ้าเป็น customer หรือ system)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `conversation_id`, `platform_message_id`, `sender_type`, `sender_name`, `message_text`, `message_type`, `attachment_url`, `created_at`, `sender_id`) VALUES
(1, 15, NULL, 'admin', 'Admin', 'สวัสดี คูณ Takayuki\nบริษัท โลนด์ ดีดี จำกัด ยินดีให้บริการค่ะ\n\nรบกวนขอข้อมูลดังนี้\n\nชื่อ\nเบอร์โทรติดต่อ\nสนใจขายฝาก หรือ จำนอง\n\nเพื่อความรวดเร็วในการติดต่อค่ะ', 'text', NULL, '2026-03-02 07:56:24', NULL),
(2, 15, '603320247935828076', 'customer', 'E=mc²', 'ทากายูกิ โออิเค\n0955635331\nจำนอง', 'text', NULL, '2026-03-02 07:56:35', NULL),
(3, 15, NULL, 'admin', 'Admin', 'Admin\nขอรายละเอียดเพิ่มเติมค่ะ\n\n1. คุณลูกค้าประกอบอาชีพอะไรอยู่บ้างคะ\n2. รายได้จากทางไหนบ้าง / ต่อเดือนเท่าไหร่\n3. ต้องการเงินไปทำอะไร\n4. มีแพลนทำสัญญากีปีคะ', 'text', NULL, '2026-03-02 07:57:02', NULL),
(4, 15, '603320306656346302', 'customer', 'E=mc²', '1.พนักงานบริษัท ชัยรัชการ(กรุงเทพ) จำกัด\n2.เงินเดือน+คอมมิชั่น 22,000 บาท\n3.ปิดหนี้สินให้คุณแม่\n5.7 ปี', 'text', NULL, '2026-03-02 07:57:10', NULL),
(5, 15, '603320365912948996', 'customer', 'E=mc²', '[รูปภาพ]', 'image', '/uploads/chat/603320365912948996.jpg', '2026-03-02 07:57:46', NULL),
(6, 15, NULL, 'admin', 'Admin', 'สวัสดี คูณ Takayuki\nบริษัท โลนด์ ดีดี จำกัด ยินดีให้บริการค่ะ\n\nรบกวนขอข้อมูลดังนี้\n\nชื่อ\nเบอร์โทรติดต่อ\nสนใจขายฝาก หรือ จำนอง\n\nเพื่อความรวดเร็วในการติดต่อค่ะ\n', 'text', NULL, '2026-03-02 10:07:54', NULL),
(7, 15, '603333492273053834', 'customer', 'E=mc²', 'ทากายูกิ โออิเค\n0955635331\nจำนอง', 'text', NULL, '2026-03-02 10:08:10', NULL),
(8, 15, '603334885351883271', 'customer', 'E=mc²', 'uuuu', 'text', NULL, '2026-03-02 10:22:00', NULL),
(9, 15, '603334902145876509', 'customer', 'E=mc²', 'yyy', 'text', NULL, '2026-03-02 10:22:10', NULL),
(10, 15, '603334917278924835', 'customer', 'E=mc²', 'iii', 'text', NULL, '2026-03-02 10:22:19', NULL),
(11, 15, '603334971855471173', 'customer', 'E=mc²', 'uuuu', 'text', NULL, '2026-03-02 10:22:52', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `chat_platforms`
--

CREATE TABLE `chat_platforms` (
  `id` int(11) NOT NULL,
  `platform_name` enum('facebook','line','tiktok') NOT NULL,
  `platform_id` varchar(255) NOT NULL COMMENT 'FB page_id หรือ LINE channel_id',
  `access_token` varchar(500) NOT NULL COMMENT 'Page Access Token หรือ Channel Access Token',
  `channel_secret` varchar(255) DEFAULT NULL COMMENT 'LINE Channel Secret (สำหรับ verify webhook)',
  `page_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อเพจ/บัญชี',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_platforms`
--

INSERT INTO `chat_platforms` (`id`, `platform_name`, `platform_id`, `access_token`, `channel_secret`, `page_name`, `is_active`, `created_at`, `updated_at`) VALUES
(2, 'line', '2009183139', 'B0snsDGEc6u8Xax4x89RsGsfiITWdqAaCZgqteX6+ax9qcqL425O9Uda0jRrCdzhK+w1j59SNFrYFI+Hinr6dZG8+TWSSQw6PH33gy+OQpzb1VNWGS7gse8m28DCmCKyv+0BmbN+TNMGNLkecMuXKgdB04t89/1O/w1cDnyilFU=', 'a49b67b5dfd276429ceed3b71c1b3850', 'ทดสอบ', 1, '2026-02-20 07:16:13', '2026-02-20 07:16:13');

-- --------------------------------------------------------

--
-- Table structure for table `chat_tags`
--

CREATE TABLE `chat_tags` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `bg_color` varchar(20) DEFAULT '#e5e7eb',
  `text_color` varchar(20) DEFAULT '#333333',
  `sort_order` int(11) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chat_tags`
--

INSERT INTO `chat_tags` (`id`, `name`, `bg_color`, `text_color`, `sort_order`, `created_by`, `created_at`) VALUES
(1, 'รอข้อมูล', '#fef3c7', '#92400e', 1, NULL, '2026-02-20 17:04:54'),
(2, 'ทรัพย์เข้าเกณฑ์', '#dcfce7', '#166534', 2, NULL, '2026-02-20 17:04:54'),
(3, 'ทรัพย์ไม่เข้าเกณฑ์', '#fee2e2', '#991b1b', 3, NULL, '2026-02-20 17:04:54'),
(4, 'ติดภาระสูง', '#f3e8ff', '#6b21a8', 4, NULL, '2026-02-20 17:04:54'),
(5, 'อนุมัติแล้ว', '#dbeafe', '#1e40af', 5, NULL, '2026-02-20 17:04:54'),
(6, 'ปิดเคส', '#f1f5f9', '#475569', 6, NULL, '2026-02-20 17:04:54'),
(7, 'นายหน้า', '#fce7f3', '#9d174d', 7, NULL, '2026-02-20 17:04:54');

-- --------------------------------------------------------

--
-- Table structure for table `contract_expiry_logs`
--

CREATE TABLE `contract_expiry_logs` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL COMMENT 'FK → cases.id',
  `days_before` int(11) NOT NULL COMMENT 'เกณฑ์ที่แจ้งเตือน: 90 / 60 / 30',
  `notified_at` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่แจ้งเตือน'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='บันทึก contract expiry notifications ที่ส่งไปแล้ว';

-- --------------------------------------------------------

--
-- Table structure for table `customer_blacklists`
--

CREATE TABLE `customer_blacklists` (
  `id` int(11) NOT NULL,
  `phone` varchar(20) NOT NULL COMMENT 'เบอร์โทรที่ blacklist',
  `reason` varchar(500) DEFAULT NULL,
  `added_by` int(11) DEFAULT NULL COMMENT 'FK → admin_users.id',
  `added_by_name` varchar(200) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dead_lead_reasons`
--

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

--
-- Dumping data for table `dead_lead_reasons`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `debtor_accounting`
--

CREATE TABLE `debtor_accounting` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `loan_request_id` int(11) DEFAULT NULL,
  `debtor_status` varchar(100) DEFAULT NULL COMMENT 'สถานะลูกหนี้',
  `property_location` varchar(255) DEFAULT NULL COMMENT 'อำเภอ/จังหวัดที่ตั้งทรัพย์',
  `contact_person` varchar(255) DEFAULT NULL COMMENT 'ชื่อ-สกุล(ลูกหนี้/ผู้ติดต่อสำรอง)',
  `id_card_image` varchar(500) DEFAULT NULL COMMENT 'รูปหน้าบัตรเจ้าของทรัพย์',
  `appraisal_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าประเมิน',
  `appraisal_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าประเมิน',
  `appraisal_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปค่าประเมิน',
  `appraisal_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายค่าประเมิน',
  `bag_fee_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าปากถุง',
  `bag_fee_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าปากถุง',
  `bag_fee_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปค่าปากถุง',
  `bag_fee_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายค่าปากถุง',
  `contract_sale_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าขายสัญญา',
  `contract_sale_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าขายสัญญา',
  `contract_sale_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปค่าขายสัญญา',
  `contract_sale_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายค่าขายสัญญา',
  `redemption_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าไถ่ถอน',
  `redemption_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าไถ่ถอน',
  `redemption_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปค่าไถ่ถอน',
  `redemption_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายค่าไถ่ถอน',
  `additional_service_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ค่าบริการเพิ่มเติม',
  `additional_service_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินค่าบริการเพิ่มเติม',
  `additional_service_note` text DEFAULT NULL COMMENT 'หมายเหตุ:ค่าบริการเพิ่มเติม',
  `property_forfeited_amount` decimal(12,2) DEFAULT 0.00 COMMENT 'ทรัพย์หลุด',
  `property_forfeited_payment_date` date DEFAULT NULL COMMENT 'วันที่ชำระเงินทรัพย์หลุด',
  `property_forfeited_slip` varchar(500) DEFAULT NULL COMMENT 'รูปสลิปทรัพย์หลุด',
  `property_forfeited_status` enum('paid','unpaid') DEFAULT 'unpaid' COMMENT 'สถานะจ่ายทรัพย์หลุด',
  `property_forfeited_note` text DEFAULT NULL COMMENT 'หมายเหตุ:ทรัพย์หลุด',
  `recorded_by` varchar(255) DEFAULT NULL COMMENT 'ผู้บันทึก',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `debtor_accounting`
--

INSERT INTO `debtor_accounting` (`id`, `case_id`, `loan_request_id`, `debtor_status`, `property_location`, `contact_person`, `id_card_image`, `appraisal_amount`, `appraisal_payment_date`, `appraisal_slip`, `appraisal_status`, `bag_fee_amount`, `bag_fee_payment_date`, `bag_fee_slip`, `bag_fee_status`, `contract_sale_amount`, `contract_sale_payment_date`, `contract_sale_slip`, `contract_sale_status`, `redemption_amount`, `redemption_payment_date`, `redemption_slip`, `redemption_status`, `additional_service_amount`, `additional_service_payment_date`, `additional_service_note`, `property_forfeited_amount`, `property_forfeited_payment_date`, `property_forfeited_slip`, `property_forfeited_status`, `property_forfeited_note`, `recorded_by`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'ทำงาน', 'กาญจนบุรี', NULL, '/uploads/id-cards/1771398926610-237.jpg', 68.00, '2026-02-01', '/uploads/slips/1771398921099-797.jpg', 'paid', 70.00, '2026-02-01', '/uploads/slips/1771398917989-399.jpg', 'paid', 91.00, '2026-02-01', '/uploads/slips/1771398915140-610.jpg', 'paid', 80.00, '2026-02-01', '/uploads/slips/1771398930565-787.jpg', 'paid', 20.00, '2026-02-01', NULL, 90.00, '2026-02-01', '/uploads/slips/1771398935104-554.jpg', 'paid', NULL, 'ทาย', '2026-02-18 06:57:37', '2026-02-19 03:07:51');

-- --------------------------------------------------------

--
-- Table structure for table `document_checklist_items`
--

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

--
-- Dumping data for table `document_checklist_items`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `document_checklist_templates`
--

CREATE TABLE `document_checklist_templates` (
  `id` int(11) NOT NULL,
  `option_code` char(1) NOT NULL COMMENT 'A=โสด, B=แต่งงาน+จดทะเบียน, C=แต่งงาน+ไม่จด, D=หย่า, E=รับมรดก',
  `option_name` varchar(100) NOT NULL COMMENT 'ชื่อ option',
  `applies_to` enum('debtor','investor','both') DEFAULT 'debtor' COMMENT 'ใช้กับฝั่งไหน',
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Master ชุดเอกสารตาม option (A-E)';

--
-- Dumping data for table `document_checklist_templates`
--

INSERT INTO `document_checklist_templates` (`id`, `option_code`, `option_name`, `applies_to`, `description`, `is_active`, `created_at`) VALUES
(1, 'A', 'โสด (Single)', 'both', 'เอกสารสำหรับผู้ที่ยังไม่แต่งงาน', 1, '2026-03-11 02:47:13'),
(2, 'B', 'แต่งงาน+จดทะเบียน (Married Registered)', 'both', 'เอกสารสำหรับผู้ที่แต่งงานแล้วจดทะเบียนสมรส', 1, '2026-03-11 02:47:13'),
(3, 'C', 'แต่งงาน+ไม่จดทะเบียน (Married Unregistered)', 'both', 'เอกสารสำหรับผู้ที่แต่งงานแล้วแต่ไม่จดทะเบียน', 1, '2026-03-11 02:47:13'),
(4, 'D', 'หย่าแล้ว (Divorced)', 'both', 'เอกสารสำหรับผู้ที่หย่าแล้ว', 1, '2026-03-11 02:47:13'),
(5, 'E', 'รับมรดก (Inherited)', 'both', 'เอกสารสำหรับผู้ที่ได้รับมรดก มีคำพิพากษาจากศาล', 1, '2026-03-11 02:47:13');

-- --------------------------------------------------------

--
-- Table structure for table `document_templates`
--

CREATE TABLE `document_templates` (
  `id` int(11) NOT NULL,
  `template_name` varchar(100) NOT NULL,
  `template_code` varchar(50) DEFAULT NULL,
  `content_html` text NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_templates`
--

INSERT INTO `document_templates` (`id`, `template_name`, `template_code`, `content_html`, `is_active`, `created_at`) VALUES
(1, 'สัญญาขายฝากมาตรฐาน', 'KF_STD_01', '<h1>สัญญาขายฝาก</h1><p>ทำที่.. วันที่..</p><p>ผู้ขายฝากชื่อ {{owner_name}}...</p>', 1, '2026-02-13 04:19:27');

-- --------------------------------------------------------

--
-- Table structure for table `investors`
--

CREATE TABLE `investors` (
  `id` int(11) NOT NULL,
  `investor_code` varchar(20) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `line_id` varchar(100) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `status` varchar(20) DEFAULT 'active',
  `investor_type` enum('regular','vip') DEFAULT 'regular' COMMENT 'ประเภทนายทุน: regular=ปกติ, vip=นายทุนค่ายใหญ่/เงินเยอะ',
  `estimated_budget` decimal(15,2) DEFAULT NULL COMMENT 'งบประมาณโดยประมาณ (บาท)',
  `total_transactions` int(11) DEFAULT 0 COMMENT 'จำนวนธุรกรรมทั้งหมดที่เคยทำ',
  `vip_since` datetime DEFAULT NULL COMMENT 'เป็น VIP ตั้งแต่เมื่อไหร่',
  `investor_level` varchar(50) DEFAULT NULL,
  `sort_order` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id_card_image` varchar(500) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `bank_account_no` varchar(50) DEFAULT NULL,
  `bank_account_name` varchar(255) DEFAULT NULL,
  `passbook_image` varchar(500) DEFAULT NULL COMMENT 'รูปสมุดบัญชี (path)',
  `investor_contract` varchar(500) DEFAULT NULL COMMENT 'สัญญานายทุน (path)',
  `national_id` varchar(20) DEFAULT NULL COMMENT 'เลขบัตรประชาชนนายทุน',
  `national_id_expiry` date DEFAULT NULL COMMENT 'วันหมดอายุบัตรประชาชน',
  `address` text DEFAULT NULL COMMENT 'ที่อยู่ตามทะเบียนบ้าน',
  `house_registration_image` varchar(500) DEFAULT NULL COMMENT 'รูปสำเนาทะเบียนบ้าน',
  `date_of_birth` date DEFAULT NULL COMMENT 'วันเกิด',
  `nationality` varchar(50) DEFAULT 'ไทย' COMMENT 'สัญชาติ',
  `marital_status` varchar(20) DEFAULT NULL COMMENT 'โสด/สมรส/หย่า/หม้าย',
  `spouse_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อ-สกุลคู่สมรส',
  `spouse_national_id` varchar(20) DEFAULT NULL COMMENT 'เลขบัตรประชาชนคู่สมรส'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `investors`
--

INSERT INTO `investors` (`id`, `investor_code`, `username`, `full_name`, `avatar_url`, `password_hash`, `email`, `phone`, `line_id`, `company_name`, `province`, `bio`, `is_verified`, `status`, `investor_type`, `estimated_budget`, `total_transactions`, `vip_since`, `investor_level`, `sort_order`, `created_at`, `updated_at`, `id_card_image`, `bank_name`, `bank_account_no`, `bank_account_name`, `passbook_image`, `investor_contract`, `national_id`, `national_id_expiry`, `address`, `house_registration_image`, `date_of_birth`, `nationality`, `marital_status`, `spouse_name`, `spouse_national_id`) VALUES
(3, 'CAP0001', 'cap0001', 'พี่เป้', NULL, '$2b$10$YOoU/9bRA1G6xbB5phWsi.FJfI1QqkV.AOwzUuz6kgHBFFyYyeWB6', 'loandd02@gmail.com', '000000000', '@rrrr', NULL, NULL, NULL, 0, 'active', 'regular', NULL, 0, NULL, '1', 3, '2026-02-18 09:02:03', '2026-02-21 03:50:07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ไทย', NULL, NULL, NULL),
(4, 'CAP0002', 'cap0002', 'มะเมียมะมะมะเมีย', NULL, '$2b$10$2rfNZVvhg30zMWcGQtc9o.qsnaVksMoYAjy5/xNYsZ7hBS5gLXRma', 'wwww@hotmail.com', '1245677874', 'moon', NULL, NULL, NULL, 0, 'active', 'regular', NULL, 0, NULL, '2', 3, '2026-02-23 02:49:33', '2026-03-23 04:36:10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ไทย', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `investor_accounting`
--

CREATE TABLE `investor_accounting` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `hid` varchar(100) DEFAULT NULL,
  `auction_deposit` decimal(12,2) DEFAULT 0.00,
  `auction_date` date DEFAULT NULL,
  `status` enum('pending_auction','pending_approval','pending_transaction','completed','cancelled') DEFAULT 'pending_auction',
  `post_auction_status` enum('refund_deposit','won_auction') DEFAULT NULL,
  `recorded_by` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `investor_accounting`
--

INSERT INTO `investor_accounting` (`id`, `user_id`, `hid`, `auction_deposit`, `auction_date`, `status`, `post_auction_status`, `recorded_by`, `created_at`, `updated_at`) VALUES
(1, 3, NULL, 0.00, NULL, 'pending_auction', 'refund_deposit', 'ทาย', '2026-02-19 02:55:32', '2026-02-19 02:55:32');

-- --------------------------------------------------------

--
-- Table structure for table `investor_auction_history`
--

CREATE TABLE `investor_auction_history` (
  `id` int(11) NOT NULL,
  `investor_id` int(11) NOT NULL,
  `case_id` varchar(50) DEFAULT NULL COMMENT 'ID เคสที่ประมูลได้ เช่น LDD02003',
  `case_location` varchar(255) DEFAULT NULL COMMENT 'ชื่ออำเภอ/จังหวัดที่ตั้งทรัพย์ หรือพิกัด',
  `auction_date` date DEFAULT NULL COMMENT 'วันที่ประมูลได้',
  `winning_price` decimal(15,2) DEFAULT NULL COMMENT 'ราคาที่ชนะ',
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `transfer_status` enum('pending','transferred') DEFAULT 'pending',
  `transfer_slip` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `investor_auction_history`
--

INSERT INTO `investor_auction_history` (`id`, `investor_id`, `case_id`, `case_location`, `auction_date`, `winning_price`, `note`, `created_at`, `updated_at`, `transfer_status`, `transfer_slip`) VALUES
(9, 4, '9', NULL, '2026-02-26', 600000.00, 'สร้างอัตโนมัติจากฝ่ายประมูล', '2026-02-27 09:09:06', '2026-03-16 07:21:36', 'transferred', '/uploads/auction-transfer-slips/aslip_9_1773645696001.jpg'),
(10, 3, '8', NULL, '2026-03-16', 400000000000.00, 'สร้างอัตโนมัติจากฝ่ายประมูล', '2026-03-16 07:28:30', '2026-03-16 07:28:30', 'pending', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `investor_withdrawals`
--

CREATE TABLE `investor_withdrawals` (
  `id` int(11) NOT NULL,
  `investor_id` int(11) NOT NULL,
  `case_id` int(11) DEFAULT NULL COMMENT 'FK → cases.id',
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงิน',
  `withdrawal_date` date DEFAULT NULL COMMENT 'วันที่ถอนเงิน',
  `status` enum('pending','transferred','cancelled') DEFAULT 'pending' COMMENT 'สถานะ: รอดำเนินการ/โอนแล้ว/ยกเลิก',
  `slip_path` varchar(255) DEFAULT NULL COMMENT 'path สลิปโอนเงิน',
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `investor_withdrawals`
--

INSERT INTO `investor_withdrawals` (`id`, `investor_id`, `case_id`, `amount`, `withdrawal_date`, `status`, `slip_path`, `note`, `created_at`, `updated_at`) VALUES
(8, 4, 9, 600000.00, NULL, 'transferred', '/uploads/withdrawal-slips/wslip_8_1772183387508.jpg', NULL, '2026-02-27 09:09:06', '2026-02-27 09:14:55'),
(9, 3, 8, 400000000000.00, NULL, 'pending', NULL, 'สร้างอัตโนมัติจากฝ่ายประมูล — รอดำเนินการ', '2026-03-16 07:28:30', '2026-03-16 07:28:30');

-- --------------------------------------------------------

--
-- Table structure for table `issuing_transactions`
--

CREATE TABLE `issuing_transactions` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `contract_appointment` tinyint(1) DEFAULT 0,
  `contract_selling_pledge` tinyint(1) DEFAULT 0,
  `contract_mortgage` tinyint(1) DEFAULT 0,
  `reminder_selling_pledge` tinyint(1) DEFAULT 0,
  `reminder_mortgage` tinyint(1) DEFAULT 0,
  `tracking_no` varchar(100) DEFAULT NULL,
  `issuing_status` enum('pending','sent','cancelled') DEFAULT 'pending',
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `doc_selling_pledge` varchar(500) DEFAULT NULL,
  `doc_mortgage` varchar(500) DEFAULT NULL,
  `commission_slip` varchar(500) DEFAULT NULL,
  `closing_check_schedule` tinyint(1) NOT NULL DEFAULT 0,
  `closing_check_personal` tinyint(1) NOT NULL DEFAULT 0,
  `closing_check_legal` tinyint(1) NOT NULL DEFAULT 0,
  `closing_check_docs` tinyint(1) NOT NULL DEFAULT 0,
  `commission_amount` decimal(15,2) DEFAULT NULL,
  `doc_sp_broker` text DEFAULT NULL COMMENT 'สัญญาแต่งตั้งนายหน้า ขายฝาก',
  `doc_sp_appendix` text DEFAULT NULL COMMENT 'เอกสารแนบท้ายสัญญาแต่งตั้ง ขายฝาก',
  `doc_sp_notice` text DEFAULT NULL COMMENT 'หนังสือแจ้งเตือน ขายฝาก',
  `doc_mg_addendum` text DEFAULT NULL COMMENT 'สัญญาต่อท้ายสัญญาจำนอง',
  `doc_mg_appendix` text DEFAULT NULL COMMENT 'เอกสารแนบท้ายสัญญาแต่งตั้ง จำนอง',
  `doc_mg_broker` text DEFAULT NULL COMMENT 'สัญญาแต่งตั้งนายหน้า จำนอง'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issuing_transactions`
--

INSERT INTO `issuing_transactions` (`id`, `case_id`, `contract_appointment`, `contract_selling_pledge`, `contract_mortgage`, `reminder_selling_pledge`, `reminder_mortgage`, `tracking_no`, `issuing_status`, `note`, `created_at`, `updated_at`, `doc_selling_pledge`, `doc_mortgage`, `commission_slip`, `closing_check_schedule`, `closing_check_personal`, `closing_check_legal`, `closing_check_docs`, `commission_amount`, `doc_sp_broker`, `doc_sp_appendix`, `doc_sp_notice`, `doc_mg_addendum`, `doc_mg_appendix`, `doc_mg_broker`) VALUES
(1, 1, 0, 0, 1, 0, 1, 'TH1234567890', 'cancelled', NULL, '2026-02-19 05:01:47', '2026-02-27 07:45:09', NULL, NULL, NULL, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 8, 0, 1, 0, 0, 0, NULL, 'sent', NULL, '2026-02-27 08:49:16', '2026-03-20 01:47:06', 'uploads/issuing/doc-selling-pledge/1773904845437-169.doc', NULL, NULL, 0, 0, 0, 0, NULL, 'uploads/issuing/doc-sp-broker/1773905049974-510.doc', NULL, NULL, NULL, NULL, NULL),
(8, 9, 1, 0, 0, 0, 0, NULL, 'pending', NULL, '2026-02-28 01:57:09', '2026-03-18 08:01:19', NULL, NULL, NULL, 0, 0, 0, 0, 18000.00, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `legal_documents`
--

CREATE TABLE `legal_documents` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL COMMENT 'FK → cases.id',
  `loan_request_id` int(11) DEFAULT NULL COMMENT 'FK → loan_requests.id (เก็บไว้อ้างอิง)',
  `file_path` varchar(500) NOT NULL COMMENT 'path ไฟล์ relative จาก server root',
  `file_name` varchar(255) NOT NULL COMMENT 'ชื่อไฟล์ต้นฉบับ',
  `file_size` int(11) DEFAULT NULL COMMENT 'ขนาดไฟล์ (bytes)',
  `note` varchar(500) DEFAULT NULL COMMENT 'หมายเหตุ (ไม่บังคับ)',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PDF รวมเอกสารทั้งหมดสำหรับเคสนิติกรรม';

--
-- Dumping data for table `legal_documents`
--

INSERT INTO `legal_documents` (`id`, `case_id`, `loan_request_id`, `file_path`, `file_name`, `file_size`, `note`, `created_at`) VALUES
(1, 9, 30, 'uploads/legal/legal-docs/1774229935346-608.pdf', 'LoanDD_EmployeeManual.pdf', 160065, NULL, '2026-03-23 08:38:55');

-- --------------------------------------------------------

--
-- Table structure for table `legal_transactions`
--

CREATE TABLE `legal_transactions` (
  `id` int(11) NOT NULL,
  `case_id` int(11) NOT NULL,
  `officer_name` varchar(100) DEFAULT NULL COMMENT 'เจ้าหน้าที่',
  `visit_date` date DEFAULT NULL COMMENT 'วันที่ไป',
  `land_office` varchar(200) DEFAULT NULL COMMENT 'สำนักงานที่ดิน',
  `time_slot` varchar(50) DEFAULT NULL COMMENT 'ช่วงเวลา',
  `team` varchar(50) DEFAULT NULL COMMENT 'ทีม',
  `legal_status` enum('pending','completed','cancelled') DEFAULT 'pending' COMMENT 'สถานะ: รอทำนิติกรรม/เสร็จสิ้น/ยกเลิก',
  `attachment` text DEFAULT NULL COMMENT 'เอกสารแนบท้าย',
  `doc_selling_pledge` text DEFAULT NULL COMMENT '1.เอกสารขายฝาก/จำนอง',
  `deed_selling_pledge` text DEFAULT NULL COMMENT '2.โฉนดขายฝาก/จำนอง',
  `doc_extension` text DEFAULT NULL COMMENT '3.เอกสารขยาย',
  `deed_extension` text DEFAULT NULL COMMENT '4.โฉนดขยาย',
  `doc_redemption` text DEFAULT NULL COMMENT '5.เอกสารไถ่ถอน',
  `deed_redemption` text DEFAULT NULL COMMENT '6.โฉนดไถ่ถอน',
  `note` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `commission_slip` varchar(500) DEFAULT NULL,
  `tax_receipt` varchar(255) DEFAULT NULL COMMENT 'ใบเสร็จค่าธรรมเนียม/ภาษีจากที่ดิน',
  `broker_contract` varchar(255) DEFAULT NULL COMMENT 'สัญญานายหน้า',
  `broker_id` varchar(255) DEFAULT NULL COMMENT 'บัตรประชาชนนายหน้า',
  `commission_amount` decimal(12,2) DEFAULT NULL COMMENT 'จำนวนค่าคอมมิชชั่น',
  `commission_collected` tinyint(1) DEFAULT 0 COMMENT 'เก็บค่าคอมฯ แล้ว (ต้องเป็น 1 ก่อนปิดเคส)',
  `commission_collected_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่เก็บค่าคอมฯ',
  `commission_slip_verified` tinyint(1) DEFAULT 0 COMMENT 'สลิปค่าคอมฯ ผ่านการตรวจแล้ว (บัญชี verify)',
  `commission_slip_verified_by` int(11) DEFAULT NULL COMMENT 'admin_users.id บัญชีที่ตรวจสลิป',
  `commission_slip_verified_at` datetime DEFAULT NULL COMMENT 'วันเวลาที่ตรวจสลิป',
  `case_closeable` tinyint(1) DEFAULT 0 COMMENT 'ปิดเคสได้หรือยัง (กลับบ้านได้) = สลิป verified + เอกสารครบ',
  `net_payout` decimal(15,2) DEFAULT NULL COMMENT 'ยอดโอนสุทธิให้ลูกหนี้ (บาท)',
  `payment_method` varchar(50) DEFAULT NULL COMMENT 'วิธีชำระ: transfer | cash | cheque',
  `actual_transfer_fee` decimal(15,2) DEFAULT NULL COMMENT 'ค่าโอน/จดจำนองจริง ณ กรมที่ดิน (บาท)',
  `actual_stamp_duty` decimal(15,2) DEFAULT NULL COMMENT 'อากรแสตมป์จริง (บาท)',
  `agent_bank_name` varchar(100) DEFAULT NULL COMMENT 'ธนาคารนายหน้า',
  `agent_bank_account_no` varchar(50) DEFAULT NULL COMMENT 'เลขบัญชีนายหน้า',
  `agent_bank_account_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อบัญชีนายหน้า',
  `doc_checklist_json` text DEFAULT NULL COMMENT 'JSON — SOP checklist tick state สำหรับฝ่ายนิติกรรม',
  `house_reg_prop_legal` varchar(500) DEFAULT NULL,
  `borrower_id_card_legal` varchar(500) DEFAULT NULL,
  `closing_check_schedule` tinyint(1) DEFAULT 0,
  `closing_check_personal` tinyint(1) DEFAULT 0,
  `closing_check_legal` tinyint(1) DEFAULT 0,
  `closing_check_docs` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `legal_transactions`
--

INSERT INTO `legal_transactions` (`id`, `case_id`, `officer_name`, `visit_date`, `land_office`, `time_slot`, `team`, `legal_status`, `attachment`, `doc_selling_pledge`, `deed_selling_pledge`, `doc_extension`, `deed_extension`, `doc_redemption`, `deed_redemption`, `note`, `created_at`, `updated_at`, `commission_slip`, `tax_receipt`, `broker_contract`, `broker_id`, `commission_amount`, `commission_collected`, `commission_collected_at`, `commission_slip_verified`, `commission_slip_verified_by`, `commission_slip_verified_at`, `case_closeable`, `net_payout`, `payment_method`, `actual_transfer_fee`, `actual_stamp_duty`, `agent_bank_name`, `agent_bank_account_no`, `agent_bank_account_name`, `doc_checklist_json`, `house_reg_prop_legal`, `borrower_id_card_legal`, `closing_check_schedule`, `closing_check_personal`, `closing_check_legal`, `closing_check_docs`) VALUES
(1, 1, 'ทาย', '2026-02-15', 'ทาย', '50.33', 'q', 'cancelled', 'uploads/legal/attachment/1771473106000-117.jpeg', 'uploads/legal/doc-selling-pledge/1771473106013-742.pdf', 'uploads/legal/deed-selling-pledge/1771473106015-922.jpg', 'uploads/legal/doc-extension/1771473106025-117.jpg', 'uploads/legal/deed-extension/1771473106029-993.jpg', 'uploads/legal/doc-redemption/1771473106039-241.pdf', 'uploads/legal/deed-redemption/1771473106042-51.jpg', NULL, '2026-02-19 03:37:50', '2026-02-27 07:45:12', NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0),
(7, 8, 'may', '2026-02-27', 'สน.มีนบุรี', '09.00 น.', NULL, 'completed', 'uploads/legal/attachment/1772181425052-528.pdf', 'uploads/legal/doc-selling-pledge/1772181425068-453.pdf', 'uploads/legal/deed-selling-pledge/1772181425082-105.jpg', NULL, NULL, NULL, NULL, NULL, '2026-02-27 08:31:41', '2026-02-27 08:37:05', NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0),
(8, 9, 'f', '2026-02-23', 'โคราช', '09.00', NULL, 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-27 08:59:58', '2026-03-23 01:38:58', NULL, NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `loan_requests`
--

CREATE TABLE `loan_requests` (
  `id` int(11) NOT NULL,
  `debtor_code` varchar(20) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `property_type` varchar(100) DEFAULT NULL,
  `has_obligation` enum('yes','no') DEFAULT 'no',
  `obligation_amount` decimal(15,2) DEFAULT NULL,
  `obligation_count` int(11) DEFAULT NULL,
  `property_address` text NOT NULL,
  `province` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `subdistrict` varchar(100) DEFAULT NULL,
  `house_no` varchar(100) DEFAULT NULL,
  `village_name` varchar(200) DEFAULT NULL,
  `additional_details` text DEFAULT NULL,
  `location_url` varchar(500) DEFAULT NULL,
  `deed_number` varchar(100) DEFAULT NULL,
  `deed_type` varchar(20) DEFAULT NULL COMMENT 'chanote=โฉนด✅ | ns4k=น.ส.4ก✅ | ns3=นส.3❌ | ns3k=นส.3ก❌ | spk=สปก❌ | other=อื่นๆ',
  `preliminary_terms` text DEFAULT NULL COMMENT 'Preliminary Terms จากฝ่ายอนุมัติ / กลุ่มคัดทรัพย์',
  `land_area` varchar(50) DEFAULT NULL,
  `road_access` varchar(10) DEFAULT NULL COMMENT 'ทางเข้าออกถนน: yes=มีทาง, no=ตาบอด',
  `seizure_status` varchar(20) DEFAULT NULL COMMENT 'สถานะอายัด: none=ปลอดภาระ, mortgaged=ติดจำนอง, seized=ถูกอายัด',
  `building_area` varchar(50) DEFAULT NULL,
  `loan_type` varchar(100) DEFAULT NULL,
  `loan_type_detail` varchar(50) DEFAULT NULL,
  `estimated_value` decimal(15,2) DEFAULT NULL,
  `loan_amount` decimal(15,2) NOT NULL,
  `loan_duration` int(11) DEFAULT 12,
  `images` text DEFAULT NULL,
  `deed_images` text DEFAULT NULL,
  `contact_name` varchar(100) NOT NULL,
  `contact_phone` varchar(20) NOT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `contact_line` varchar(50) DEFAULT NULL,
  `contact_facebook` varchar(255) DEFAULT NULL,
  `preferred_contact` enum('phone','line','email') DEFAULT 'phone',
  `status` enum('pending','reviewing','appraising','approved','matched','rejected','cancelled') DEFAULT 'pending',
  `admin_note` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `appraised_value` decimal(15,2) DEFAULT NULL,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `interest_rate` decimal(5,2) DEFAULT NULL,
  `desired_amount` varchar(100) DEFAULT NULL,
  `occupation` varchar(200) DEFAULT NULL,
  `monthly_income` varchar(100) DEFAULT NULL,
  `loan_purpose` text DEFAULT NULL,
  `contract_years` varchar(50) DEFAULT NULL,
  `net_desired_amount` varchar(100) DEFAULT NULL,
  `payment_status` varchar(20) NOT NULL DEFAULT 'unpaid' COMMENT 'สถานะชำระ (ก่อนมีเคส)',
  `payment_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `agent_id` int(11) DEFAULT NULL,
  `appraisal_images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`appraisal_images`)),
  `appraisal_type` enum('outside','inside','check_price') DEFAULT 'outside',
  `appraisal_result` enum('passed','not_passed') DEFAULT NULL,
  `appraisal_date` date DEFAULT NULL,
  `appraisal_fee` decimal(10,2) DEFAULT NULL,
  `slip_image` text DEFAULT NULL,
  `appraisal_book_image` text DEFAULT NULL,
  `appraisal_note` text DEFAULT NULL,
  `appraisal_recorded_by` varchar(100) DEFAULT NULL,
  `appraisal_recorded_at` datetime DEFAULT NULL,
  `outside_result` varchar(50) DEFAULT NULL,
  `outside_reason` text DEFAULT NULL,
  `outside_recorded_at` datetime DEFAULT NULL,
  `inside_result` varchar(50) DEFAULT NULL,
  `inside_reason` text DEFAULT NULL,
  `inside_recorded_at` datetime DEFAULT NULL,
  `check_price_value` decimal(15,2) DEFAULT NULL,
  `check_price_detail` text DEFAULT NULL,
  `check_price_recorded_at` datetime DEFAULT NULL,
  `marital_status` enum('single','married_reg','married_unreg','divorced','inherited') DEFAULT NULL,
  `bank_account_number` varchar(50) DEFAULT NULL COMMENT 'เลขบัญชีธนาคาร',
  `bank_name` varchar(100) DEFAULT NULL COMMENT 'ชื่อธนาคาร',
  `bank_book_file` varchar(500) DEFAULT NULL COMMENT 'ไฟล์สมุดบัญชี',
  `borrower_id_card` text DEFAULT NULL,
  `house_reg_book` text DEFAULT NULL,
  `name_change_doc` text DEFAULT NULL,
  `divorce_doc` text DEFAULT NULL,
  `spouse_id_card` text DEFAULT NULL,
  `spouse_reg_copy` text DEFAULT NULL,
  `marriage_cert` text DEFAULT NULL,
  `single_cert` text DEFAULT NULL,
  `death_cert` text DEFAULT NULL,
  `will_court_doc` text DEFAULT NULL,
  `testator_house_reg` text DEFAULT NULL,
  `lead_source` varchar(50) DEFAULT NULL,
  `dead_reason` varchar(100) DEFAULT NULL,
  `customer_gender` enum('male','female','other') DEFAULT NULL,
  `customer_age` int(11) DEFAULT NULL,
  `existing_debt` decimal(15,2) DEFAULT NULL,
  `reject_category` varchar(100) DEFAULT NULL,
  `reject_alternative` text DEFAULT NULL,
  `sub_district` varchar(100) DEFAULT NULL,
  `deed_copy` text DEFAULT NULL,
  `building_permit` text DEFAULT NULL,
  `house_reg_prop` text DEFAULT NULL,
  `sale_contract` text DEFAULT NULL,
  `debt_free_cert` text DEFAULT NULL,
  `blueprint` text DEFAULT NULL,
  `property_photos` text DEFAULT NULL,
  `land_tax_receipt` text DEFAULT NULL,
  `maps_url` text DEFAULT NULL,
  `condo_title_deed` text DEFAULT NULL,
  `condo_location_map` text DEFAULT NULL,
  `common_fee_receipt` text DEFAULT NULL,
  `floor_plan` text DEFAULT NULL,
  `location_sketch_map` text DEFAULT NULL,
  `land_use_cert` text DEFAULT NULL,
  `rental_contract` text DEFAULT NULL,
  `business_reg` text DEFAULT NULL,
  `advance_months` int(11) DEFAULT NULL,
  `road_width` varchar(20) DEFAULT NULL COMMENT 'lt4/4to6/gt6',
  `utility_access` varchar(20) DEFAULT NULL COMMENT 'yes/partial/no',
  `flood_risk` varchar(20) DEFAULT NULL COMMENT 'never/rarely/often',
  `ineligible_property` tinyint(1) NOT NULL DEFAULT 0,
  `ineligible_reason` varchar(255) DEFAULT NULL,
  `screening_status` varchar(30) DEFAULT NULL,
  `screened_by_id` int(11) DEFAULT NULL,
  `screened_by_name` varchar(200) DEFAULT NULL,
  `screened_at` datetime DEFAULT NULL,
  `prop_checklist_json` text DEFAULT NULL,
  `property_video` text DEFAULT NULL,
  `payment_schedule_file` varchar(500) DEFAULT NULL,
  `bedrooms` tinyint(4) DEFAULT NULL COMMENT 'จำนวนห้องนอน',
  `project_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อโครงการ/หมู่บ้าน',
  `appraisal_company` varchar(255) DEFAULT NULL COMMENT 'บริษัทประเมิน',
  `appraiser_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อผู้ประเมิน',
  `building_year` smallint(5) UNSIGNED DEFAULT NULL,
  `floors` tinyint(4) DEFAULT NULL COMMENT 'จำนวนชั้น',
  `bathrooms` tinyint(4) DEFAULT NULL COMMENT 'จำนวนห้องน้ำ',
  `rental_rooms` int(11) DEFAULT NULL COMMENT 'จำนวนห้องเช่าทั้งหมด (หอพัก/อพาร์ตเมนต์)',
  `rental_price_per_month` decimal(10,2) DEFAULT NULL COMMENT 'รายได้ค่าเช่า/เดือน (บาท)',
  `advance_slip` varchar(500) DEFAULT NULL COMMENT 'สลิปค่าหักล่วงหน้า (ก่อนมีเคส)',
  `checklist_ticks_json` text DEFAULT NULL COMMENT 'JSON tick state { field: true } for checklist docs (manual tick without upload)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `loan_requests`
--

INSERT INTO `loan_requests` (`id`, `debtor_code`, `source`, `user_id`, `property_type`, `has_obligation`, `obligation_amount`, `obligation_count`, `property_address`, `province`, `district`, `subdistrict`, `house_no`, `village_name`, `additional_details`, `location_url`, `deed_number`, `deed_type`, `preliminary_terms`, `land_area`, `road_access`, `seizure_status`, `building_area`, `loan_type`, `loan_type_detail`, `estimated_value`, `loan_amount`, `loan_duration`, `images`, `deed_images`, `contact_name`, `contact_phone`, `contact_email`, `contact_line`, `contact_facebook`, `preferred_contact`, `status`, `admin_note`, `rejection_reason`, `appraised_value`, `approved_amount`, `interest_rate`, `desired_amount`, `occupation`, `monthly_income`, `loan_purpose`, `contract_years`, `net_desired_amount`, `payment_status`, `payment_date`, `created_at`, `updated_at`, `agent_id`, `appraisal_images`, `appraisal_type`, `appraisal_result`, `appraisal_date`, `appraisal_fee`, `slip_image`, `appraisal_book_image`, `appraisal_note`, `appraisal_recorded_by`, `appraisal_recorded_at`, `outside_result`, `outside_reason`, `outside_recorded_at`, `inside_result`, `inside_reason`, `inside_recorded_at`, `check_price_value`, `check_price_detail`, `check_price_recorded_at`, `marital_status`, `bank_account_number`, `bank_name`, `bank_book_file`, `borrower_id_card`, `house_reg_book`, `name_change_doc`, `divorce_doc`, `spouse_id_card`, `spouse_reg_copy`, `marriage_cert`, `single_cert`, `death_cert`, `will_court_doc`, `testator_house_reg`, `lead_source`, `dead_reason`, `customer_gender`, `customer_age`, `existing_debt`, `reject_category`, `reject_alternative`, `sub_district`, `deed_copy`, `building_permit`, `house_reg_prop`, `sale_contract`, `debt_free_cert`, `blueprint`, `property_photos`, `land_tax_receipt`, `maps_url`, `condo_title_deed`, `condo_location_map`, `common_fee_receipt`, `floor_plan`, `location_sketch_map`, `land_use_cert`, `rental_contract`, `business_reg`, `advance_months`, `road_width`, `utility_access`, `flood_risk`, `ineligible_property`, `ineligible_reason`, `screening_status`, `screened_by_id`, `screened_by_name`, `screened_at`, `prop_checklist_json`, `property_video`, `payment_schedule_file`, `bedrooms`, `project_name`, `appraisal_company`, `appraiser_name`, `building_year`, `floors`, `bathrooms`, `rental_rooms`, `rental_price_per_month`, `advance_slip`, `checklist_ticks_json`) VALUES
(18, 'LDD0001', NULL, NULL, 'house', 'no', NULL, 1, '', 'กาญจนบุรี', 'ทาย', 'ทาย', NULL, NULL, NULL, 'https://www.thaiproperty.in.th/', '123456', NULL, NULL, 'ทาย', NULL, NULL, NULL, NULL, 'mortgage', NULL, 0.00, 12, '[\"uploads/id-cards/1771464867071-498.jpg\",\"uploads/properties/1771465322902-442.jpg\",\"uploads/permits/1771465322903-861.jpg\"]', '[\"uploads/deeds/1771465322897-54.jpg\"]', 'ทาย', '0000000000', NULL, NULL, NULL, 'phone', '', NULL, NULL, NULL, 69999.97, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'paid', NULL, '2026-02-18 02:10:47', '2026-03-21 04:03:25', 1, '[\"uploads/appraisal-properties/1772186181381-70.jpg\",\"uploads/appraisal-properties/1772186184598-895.jpg\"]', 'inside', 'passed', '2026-02-26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'passed', NULL, '2026-02-27 16:56:35', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[\"uploads/auction-docs/1774065801310-361.jpg\"]', '0', '0', '0', '0', '0', '0', '0', NULL, '0', '0', '0', '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, '{\"deed_copy\":true}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{\"deed_copy\":true}'),
(29, 'LDD0002', NULL, NULL, 'house', 'no', NULL, NULL, '', 'กรุงเทพมหานคร', 'มีนบุรี', 'มีนบุรี', '23', 'หมู่บ้านโคกน้อย', '5 ห้องนอน', 'https://www.google.com/maps/@13.821732026637724,100.73631626085239,16z', '106512', 'chanote', NULL, '1 ไร่ 1 งาน 1 ตร.ว.', 'yes', NULL, NULL, NULL, 'selling_pledge', 200000.00, 0.00, 12, '[\"uploads/id-cards/1772172795623-599.jpg\",\"uploads/properties/1772172834242-887.jpg\",\"uploads/properties/1772172838301-631.jpg\",\"uploads/properties/1772172844870-219.jpg\",\"uploads/permits/1772180730973-360.pdf\"]', '[\"uploads/deeds/1772172795628-958.jpg\"]', 'นายธีระวุฒิ ทองไพฑูรย์', '0987654390', NULL, NULL, NULL, 'phone', 'reviewing', NULL, NULL, NULL, 29999.98, 50.00, '900000', 'ร้านค้า', '20000', 'เปิดธุรกิจใหม่', '3', '30000', 'paid', NULL, '2026-02-27 06:13:15', '2026-03-23 08:24:27', NULL, '[\"uploads/appraisal-properties/1772174287034-646.jpg\",\"uploads/appraisal-properties/1772174294229-619.jpg\",\"uploads/appraisal-properties/1772174300032-117.jpg\"]', 'outside', 'passed', '2026-02-19', 3000.00, 'uploads/slips/1772176992133-677.jpg', 'uploads/appraisal-books/1772179447844-355.pdf', NULL, 'fairy', NULL, 'passed', NULL, '2026-02-27 15:04:07', NULL, NULL, NULL, 60000.00, NULL, '2026-02-27 15:04:07', 'married_unreg', NULL, NULL, NULL, '[\"uploads/id-cards/1774001417686-655.png\"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[\"uploads/auction-docs/1773976479384-748.jpg\"]', '0', '0', '0', '0', '0', '0', '0', NULL, '0', '0', '0', '0', '0', '0', '0', '0', NULL, '4to6', 'yes', 'never', 0, NULL, NULL, NULL, NULL, NULL, '{\"deed_copy\":true,\"borrower_id_card\":true}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{\"borrower_id_card\":true}'),
(30, 'LDD0003', NULL, NULL, 'townhouse', 'no', NULL, NULL, '', 'นครราชสีมา', 'นคร', 'นคร', '12', 'นคร', NULL, 'https://www.pinterest.com/pin/34902965860068215/', '2477', 'ns4k', NULL, '69', 'yes', 'none', NULL, NULL, 'mortgage', 7000.00, 0.00, 12, '[\"uploads/id-cards/1772182516545-816.jpg\",\"uploads/properties/1772182516550-166.jpg\",\"uploads/permits/1772182516551-879.jpg\"]', '[\"uploads/deeds/1772182516546-697.jpg\"]', 'ภัทร', '097680', 'loandd55@gmail.com', NULL, NULL, 'phone', 'approved', NULL, NULL, NULL, 3000.00, 1.70, '609', 'ขายน้ำ', '5000', 'งานหยาบ', '3', '500', 'paid', NULL, '2026-02-27 08:55:16', '2026-03-23 02:56:36', 2, '[\"uploads/appraisal-properties/1772182694926-11.jpg\",\"uploads/appraisal-properties/1772182698921-540.jpg\",\"uploads/appraisal-properties/1772182702730-874.jpg\"]', 'inside', 'passed', '2026-02-20', 1000.00, 'uploads/slips/1772182576375-656.jpg', 'uploads/appraisal-books/1772182576375-705.pdf', NULL, 'f', NULL, NULL, NULL, NULL, 'passed', NULL, '2026-02-27 16:58:36', 600000.00, NULL, '2026-03-13 10:55:06', 'married_unreg', NULL, NULL, NULL, '[\"uploads/id-cards/1774000085240-749.png\"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'female', NULL, 20000.00, NULL, NULL, NULL, '0', '0', '0', '0', '0', '0', '[\"uploads/auction-docs/1773638161003-703.jpg\"]', '0', NULL, '0', '0', '0', '0', '0', '0', '0', '0', NULL, '4to6', 'yes', 'never', 0, NULL, NULL, NULL, NULL, NULL, '{\"borrower_id_card\":true}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{\"borrower_id_card\":true}'),
(33, 'LDD0004', NULL, NULL, 'apartment', 'no', NULL, NULL, '', 'ระยอง', 'เมืองระยอง', 'ห้วยโป่ง', NULL, 'หมู่ 1', NULL, 'https://www.google.com/maps/@13.821750543803752,100.73635911151486,16z', '115566', 'chanote', NULL, '1 ไร่ 2 งาน 88 ตร.ว.', 'yes', 'none', NULL, NULL, 'mortgage', 700000.00, 0.00, 12, '[\"uploads/id-cards/1773719841119-762.jpg\"]', NULL, 'นางภิรญา แสงศิริมล', '0955635331', NULL, NULL, NULL, 'phone', '', NULL, NULL, NULL, NULL, 1.50, '2000', 'พนักงานบริษัท ชัยรัชการ(กรุงเทพ) จำกัด', NULL, 'กู้ให้แม่', '7', '4000', 'paid', '2026-02-12', '2026-02-28 04:16:00', '2026-03-23 08:04:45', NULL, '[\"uploads/appraisal-properties/1772446290094-263.jpg\",\"uploads/appraisal-properties/1772446305289-701.jpg\",\"uploads/appraisal-properties/1772446305291-572.jpg\",\"uploads/appraisal-properties/1772446305294-90.jpg\",\"uploads/appraisal-properties/1772446321072-194.jpg\",\"uploads/appraisal-properties/1772446321073-578.jpg\"]', 'outside', 'passed', '2026-02-12', 2888.00, 'uploads/slips/1773305706983-213.jpg', 'uploads/appraisal-books/1772446405711-558.jpg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1200000.00, NULL, '2026-03-21 08:28:33', 'married_reg', NULL, NULL, NULL, '[\"uploads/id-cards/1773997527259-840.jpg\"]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'line', NULL, 'male', NULL, NULL, NULL, NULL, NULL, '[\"uploads/auction-docs/1773803024158-625.jpg\"]', '0', '[\"uploads/auction-docs/1773997728562-59.jpg\"]', '0', '0', '0', '[\"uploads/auction-docs/1773295735058-802.jpg\",\"uploads/auction-docs/1773295756010-779.jpg\"]', '[]', NULL, '0', '0', '0', '0', '0', '0', '0', '0', NULL, 'gt6', 'yes', 'never', 0, NULL, 'eligible', 1, NULL, '2026-03-17 16:27:42', '{\"maps_url\":false,\"deed_copy\":true,\"building_permit\":false,\"house_reg_prop\":true,\"sale_contract\":false,\"debt_free_cert\":false,\"property_photos\":true,\"land_tax_receipt\":false,\"blueprint\":false}', NULL, 'uploads/payment-schedules/1773374381071-38.png', NULL, NULL, NULL, NULL, NULL, 8, NULL, 50, 3999.00, NULL, '{\"house_reg_book\":true,\"borrower_id_card\":true}');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `type` enum('internal','customer') NOT NULL DEFAULT 'internal',
  `loan_request_id` int(11) DEFAULT NULL,
  `case_id` int(11) DEFAULT NULL,
  `from_department` varchar(50) DEFAULT NULL,
  `target_department` varchar(50) DEFAULT NULL,
  `target_user_id` int(11) DEFAULT NULL,
  `platform` varchar(20) DEFAULT NULL,
  `customer_platform_id` varchar(255) DEFAULT NULL,
  `conversation_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status_from` varchar(50) DEFAULT NULL,
  `status_to` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `is_sent` tinyint(1) NOT NULL DEFAULT 0,
  `sent_at` datetime DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `type`, `loan_request_id`, `case_id`, `from_department`, `target_department`, `target_user_id`, `platform`, `customer_platform_id`, `conversation_id`, `title`, `message`, `status_from`, `status_to`, `is_read`, `is_sent`, `sent_at`, `read_at`, `link_url`, `created_by`, `created_at`) VALUES
(1, 'internal', 34, NULL, NULL, 'all', NULL, NULL, NULL, NULL, '🆕 สร้างลูกหนี้ใหม่', 'ลูกหนี้ใหม่ LDD0005 (ลอง) ถูกสร้างโดยทีมงาน — ลอง', NULL, 'new_from_admin', 0, 0, NULL, NULL, '/sales/edit/34', 1, '2026-03-02 12:54:57'),
(2, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อยู่ระหว่างประเมิน', 'เคส LDD0004 (ทากายูกิ โออิเค) อยู่ระหว่างการประเมินทรัพย์สิน', NULL, 'appraisal_scheduled', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-02 17:13:25'),
(3, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'ประเมินผ่าน — รอพิจารณาอนุมัติ', 'เคส LDD0004 (ทากายูกิ โออิเค) ผ่านการประเมินแล้ว รอพิจารณาอนุมัติวงเงิน', NULL, 'appraisal_passed', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-02 17:13:25'),
(4, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'ลูกหนี้ไม่ผ่านเกณฑ์', 'ลูกหนี้ LDD0004 (ภัทร) ถูกบันทึกเหตุผลไม่ผ่านเกณฑ์', NULL, 'debtor_rejected', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-12 12:50:05'),
(5, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'รอชำระค่าประเมิน', 'เคส LDD0004 (ภัทร) รอลูกค้าชำระค่าประเมิน', NULL, 'awaiting_appraisal_fee', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-12 13:32:53'),
(6, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'ประเมินผ่าน — รอพิจารณาอนุมัติ', 'เคส LDD0004 (ภัทร) ผ่านการประเมินแล้ว รอพิจารณาอนุมัติวงเงิน', NULL, 'appraisal_passed', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-12 13:32:53'),
(7, 'internal', 33, NULL, NULL, 'appraisal', NULL, NULL, NULL, NULL, '📋 ตารางวงเงินพร้อมแล้ว — แจ้งฝ่ายประเมิน', 'ฝ่ายอนุมัติสินเชื่ออัพโหลดตารางวงเงินของ LDD0004 (ภัทร) เรียบร้อยแล้ว', NULL, 'credit_table_to_appraisal', 0, 0, NULL, NULL, '/appraisal/edit/33', 1, '2026-03-13 08:54:57'),
(8, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '📋 ตารางวงเงินพร้อมแล้ว', 'ฝ่ายอนุมัติสินเชื่ออัพโหลดตารางวงเงินของ LDD0004 (ภัทร) เรียบร้อยแล้ว', NULL, 'credit_table_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-13 08:54:57'),
(9, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '📋 ตารางวงเงินพร้อมแล้ว', 'ฝ่ายอนุมัติสินเชื่ออัพโหลดตารางวงเงินของ LDD0004 (ภัทร) เรียบร้อยแล้ว', NULL, 'credit_table_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-13 09:25:43'),
(10, 'internal', 33, NULL, NULL, 'appraisal', NULL, NULL, NULL, NULL, '📋 ตารางวงเงินพร้อมแล้ว — แจ้งฝ่ายประเมิน', 'ฝ่ายอนุมัติสินเชื่ออัพโหลดตารางวงเงินของ LDD0004 (ภัทร) เรียบร้อยแล้ว', NULL, 'credit_table_to_appraisal', 0, 0, NULL, NULL, '/appraisal/edit/33', 1, '2026-03-13 09:25:43'),
(11, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'รอชำระค่าประเมิน', 'เคส LDD0004 (ภัทร) รอลูกค้าชำระค่าประเมิน', NULL, 'awaiting_appraisal_fee', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-13 09:49:08'),
(12, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'รอชำระค่าประเมิน', 'เคส LDD0004 (ภัทร) รอลูกค้าชำระค่าประเมิน', NULL, 'awaiting_appraisal_fee', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-13 09:56:16'),
(13, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'รอชำระค่าประเมิน', 'เคส LDD0004 (ภัทร) รอลูกค้าชำระค่าประเมิน', NULL, 'awaiting_appraisal_fee', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-13 10:11:14'),
(14, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'ประเมินผ่าน — รอพิจารณาอนุมัติ', 'เคส LDD0004 (ภัทร) ผ่านการประเมินแล้ว รอพิจารณาอนุมัติวงเงิน', NULL, 'appraisal_passed', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-13 10:11:14'),
(15, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (ภัทร) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-13 10:53:25'),
(16, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0003 (นอนเขียน) อนุมัติวงเงิน 600000.00 บาท แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/approval/edit/9', 1, '2026-03-13 10:55:06'),
(17, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0002 (ต่วย) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/approval/edit/8', 1, '2026-03-13 10:55:12'),
(18, 'internal', 18, 1, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0001 (ทาย) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/approval/edit/1', 1, '2026-03-13 10:55:14'),
(19, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (นอนเขียน) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-13 13:59:02'),
(20, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (นอนเขียน) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-13 15:07:32'),
(21, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (ภัทร) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-16 14:11:54'),
(22, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ประมูลสำเร็จ — รอนิติกรรม', 'เคส LDD0002 (ต่วย) ประมูลสำเร็จ นายทุน: พี่เป้ กรุณาดำเนินการนิติกรรม', NULL, 'auction_completed', 0, 0, NULL, NULL, '/auction/edit/8', 1, '2026-03-16 14:28:30'),
(23, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (นอนเขียน) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-17 12:38:43'),
(24, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 25 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-18 13:44:41'),
(25, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-18 13:44:41'),
(26, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 24 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-18 13:44:54'),
(27, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-18 13:44:54'),
(28, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (ต่วย) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 11:03:15'),
(29, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (ต่วย) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 11:03:15'),
(30, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (ต่วย) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 11:04:01'),
(31, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (ต่วย) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 11:04:01'),
(32, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (ต่วย) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 13:49:22'),
(33, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (ต่วย) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 13:49:22'),
(34, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (ต่วย) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 13:58:59'),
(35, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (ต่วย) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 13:58:59'),
(36, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (ต่วย) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 14:11:53'),
(37, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (ต่วย) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 14:11:53'),
(38, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (ต่วย) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 14:20:45'),
(39, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (ต่วย) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 14:20:45'),
(40, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (ต่วย) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 14:24:10'),
(41, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (ต่วย) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 14:24:10'),
(42, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 23 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 14:30:37'),
(43, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 14:30:37'),
(44, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (ต่วย) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-19 14:30:49'),
(45, 'internal', 29, 8, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0002 (ต่วย) แล้ว — 26 กุมภาพันธ์ 2569 · 09.00 · สน.มีนบุรี', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/8', 1, '2026-03-19 14:30:49'),
(46, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 22 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 14:32:37'),
(47, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 14:32:37'),
(48, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 14:36:51'),
(49, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 21 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 14:36:51'),
(50, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 14:56:19'),
(51, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 14:56:49'),
(52, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 14:59:27'),
(53, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:00:13'),
(54, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:00:19'),
(55, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:06:20'),
(56, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:06:22'),
(57, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:06:30'),
(58, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:06:36'),
(59, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:07:09'),
(60, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:07:11'),
(61, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:07:16'),
(62, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:07:17'),
(63, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:10:03'),
(64, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:10:20'),
(65, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:16:36'),
(66, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:17:00'),
(67, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:22:50'),
(68, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:22:51'),
(69, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:23:00'),
(70, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:23:03'),
(71, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:29:13'),
(72, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:29:15'),
(73, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:31:34'),
(74, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:31:36'),
(75, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:34:12'),
(76, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:34:15'),
(77, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:34:31'),
(78, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:34:33'),
(79, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:35:15'),
(80, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:35:17'),
(81, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:37:53'),
(82, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:37:54'),
(83, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:38:35'),
(84, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:38:37'),
(85, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:38:54'),
(86, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:38:56'),
(87, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:39:02'),
(88, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:39:04'),
(89, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:43:55'),
(90, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:44:05'),
(91, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:44:56'),
(92, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:44:59'),
(93, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:59:17'),
(94, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 15:59:20'),
(95, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 16:05:57'),
(96, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 16:05:59'),
(97, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 16:08:57'),
(98, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 16:08:58'),
(99, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '✅ ตารางผ่อนชำระได้รับการอนุมัติ', 'ฝ่ายอนุมัติสินเชื่ออนุมัติตารางผ่อนชำระของ LDD0004 (นางภิรญา แสงศิริมล) แล้ว — ดูได้ที่ ID ลูกหนี้', NULL, 'schedule_approved_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 16:11:13'),
(100, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 16:11:15'),
(101, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-19 16:34:58'),
(102, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:00:01'),
(103, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 21 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:00:22'),
(104, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:00:22'),
(105, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:01:10'),
(106, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 21 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:01:10'),
(107, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 21 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:08:10'),
(108, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:08:10'),
(109, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 21 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:08:24'),
(110, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:08:24'),
(111, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:16:05'),
(112, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 21 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:16:05'),
(113, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 21 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:16:16'),
(114, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:16:16'),
(115, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 22 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:16:41'),
(116, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:16:41'),
(117, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 22 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:16:57'),
(118, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:16:57'),
(119, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 22 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:25:22'),
(120, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:25:22'),
(121, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:25:37'),
(122, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 23 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:25:37'),
(123, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 23 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:29:52'),
(124, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-19 17:29:52'),
(125, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (ต่วย) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-20 08:47:06'),
(126, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (ต่วย) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-20 08:47:06'),
(127, 'internal', 33, NULL, NULL, 'appraisal', NULL, NULL, NULL, NULL, '🆕 ลูกค้าใหม่รอประเมินราคา', 'ลูกค้าใหม่ LDD0004 (นางภิรญา แสงศิริมล) ถูกสร้างแล้ว — นางภิรญา แสงศิริมล รอการตรวจสอบราคาประเมินเบื้องต้น', NULL, 'new_from_admin', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-20 08:47:50'),
(128, 'internal', 29, 8, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) แล้ว — 23 มีนาคม 2569 · 10.00 น. · มีนบุรี', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/8', 1, '2026-03-20 10:20:04'),
(129, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'รอพิจารณาอนุมัติ', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) อยู่ระหว่างพิจารณาอนุมัติวงเงิน', NULL, 'pending_approve', 0, 0, NULL, NULL, '/approval/edit/8', 1, '2026-03-20 10:20:04'),
(130, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-20 10:46:54'),
(131, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-20 10:46:54'),
(132, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 23 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-20 11:27:39'),
(133, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-20 11:27:39'),
(134, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-20 11:28:03'),
(135, 'internal', 30, 9, NULL, 'legal', NULL, NULL, NULL, NULL, '📅 นัดวันโอนแล้ว — แจ้งฝ่ายนิติกรรม', 'ฝ่ายขายกำหนดวันโอนกรรมสิทธิ์เคส LDD0003 (ภัทร) แล้ว — 23 กุมภาพันธ์ 2569 · 09.00 · โคราช', NULL, 'transaction_scheduled_to_legal', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-20 11:28:03'),
(136, 'internal', 33, NULL, NULL, 'sales', NULL, NULL, NULL, NULL, '📋 ตารางวงเงินพร้อมแล้ว', 'ฝ่ายอนุมัติสินเชื่ออัพโหลดตารางวงเงินของ LDD0004 (นางภิรญา แสงศิริมล) เรียบร้อยแล้ว', NULL, 'credit_table_to_sales', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-20 13:09:56'),
(137, 'internal', 33, NULL, NULL, 'appraisal', NULL, NULL, NULL, NULL, '📋 ตารางวงเงินพร้อมแล้ว — แจ้งฝ่ายประเมิน', 'ฝ่ายอนุมัติสินเชื่ออัพโหลดตารางวงเงินของ LDD0004 (นางภิรญา แสงศิริมล) เรียบร้อยแล้ว', NULL, 'credit_table_to_appraisal', 0, 0, NULL, NULL, '/appraisal/edit/33', 1, '2026-03-20 13:09:56'),
(138, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-20 13:43:03'),
(139, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-20 13:43:03'),
(140, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-20 14:40:54'),
(141, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-20 14:40:54'),
(142, 'internal', 33, NULL, NULL, 'all', NULL, NULL, NULL, NULL, 'อนุมัติวงเงินแล้ว', 'เคส LDD0004 (นางภิรญา แสงศิริมล) อนุมัติวงเงิน  แล้ว', NULL, 'credit_approved', 0, 0, NULL, NULL, '/sales/edit/33', 1, '2026-03-21 08:28:33'),
(143, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-21 09:34:33'),
(144, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-21 09:34:33'),
(145, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'ออกสัญญาเรียบร้อย', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) ออกสัญญาเรียบร้อยแล้ว', NULL, 'issuing_sent', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-21 09:35:08'),
(146, 'internal', 29, 8, NULL, 'all', NULL, NULL, NULL, NULL, 'เตรียมเอกสาร', 'เคส LDD0002 (นายธีระวุฒิ ทองไพฑูรย์) อยู่ระหว่างเตรียมเอกสารนิติกรรม', NULL, 'preparing_docs', 0, 0, NULL, NULL, '/issuing/edit/8', 1, '2026-03-21 09:35:08'),
(147, 'internal', 30, 9, NULL, 'all', NULL, NULL, NULL, NULL, 'นิติกรรมเสร็จสิ้น', 'เคส LDD0003 (ภัทร) ทำธุรกรรมเรียบร้อยแล้ว', NULL, 'legal_completed', 0, 0, NULL, NULL, '/legal/edit/9', 1, '2026-03-23 08:38:58');

-- --------------------------------------------------------

--
-- Table structure for table `notification_reads`
--

CREATE TABLE `notification_reads` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `read_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_reads`
--

INSERT INTO `notification_reads` (`notification_id`, `user_id`, `read_at`) VALUES
(1, 1, '2026-03-02 12:55:03'),
(1, 3, '2026-03-02 17:22:35'),
(2, 1, '2026-03-06 10:12:51'),
(2, 3, '2026-03-02 17:22:35'),
(3, 1, '2026-03-06 10:12:53'),
(3, 3, '2026-03-02 17:22:35'),
(4, 1, '2026-03-13 10:55:50'),
(5, 1, '2026-03-13 10:55:50'),
(6, 1, '2026-03-13 10:55:50'),
(7, 1, '2026-03-13 10:55:50'),
(8, 1, '2026-03-13 10:55:50'),
(9, 1, '2026-03-13 10:55:50'),
(10, 1, '2026-03-13 10:55:50'),
(11, 1, '2026-03-13 10:55:50'),
(12, 1, '2026-03-13 10:55:50'),
(13, 1, '2026-03-13 10:55:50'),
(14, 1, '2026-03-13 10:55:50'),
(15, 1, '2026-03-13 10:55:50'),
(16, 1, '2026-03-13 10:55:50'),
(17, 1, '2026-03-13 10:55:50'),
(18, 1, '2026-03-13 10:55:50'),
(19, 1, '2026-03-13 15:27:40'),
(20, 1, '2026-03-13 15:27:40'),
(21, 1, '2026-03-16 14:22:59'),
(22, 1, '2026-03-16 17:45:30'),
(23, 1, '2026-03-20 08:40:08'),
(24, 1, '2026-03-20 08:40:08'),
(25, 1, '2026-03-20 08:40:08'),
(26, 1, '2026-03-20 08:40:08'),
(27, 1, '2026-03-20 08:40:08'),
(28, 1, '2026-03-20 08:40:08'),
(29, 1, '2026-03-20 08:40:08'),
(30, 1, '2026-03-20 08:40:08'),
(31, 1, '2026-03-20 08:40:08'),
(32, 1, '2026-03-20 08:40:08'),
(33, 1, '2026-03-20 08:40:08'),
(34, 1, '2026-03-20 08:40:08'),
(35, 1, '2026-03-20 08:40:08'),
(36, 1, '2026-03-20 08:40:08'),
(37, 1, '2026-03-20 08:40:08'),
(38, 1, '2026-03-20 08:40:08'),
(39, 1, '2026-03-20 08:40:08'),
(40, 1, '2026-03-20 08:40:08'),
(41, 1, '2026-03-20 08:40:08'),
(42, 1, '2026-03-20 08:40:08'),
(43, 1, '2026-03-20 08:40:08'),
(44, 1, '2026-03-20 08:40:08'),
(45, 1, '2026-03-20 08:40:08'),
(46, 1, '2026-03-20 08:40:08'),
(47, 1, '2026-03-20 08:40:08'),
(48, 1, '2026-03-20 08:40:08'),
(49, 1, '2026-03-20 08:40:08'),
(50, 1, '2026-03-20 08:40:08'),
(51, 1, '2026-03-20 08:40:08'),
(52, 1, '2026-03-20 08:40:08'),
(53, 1, '2026-03-20 08:40:08'),
(54, 1, '2026-03-20 08:40:08'),
(55, 1, '2026-03-20 08:40:08'),
(56, 1, '2026-03-20 08:40:08'),
(57, 1, '2026-03-20 08:40:08'),
(58, 1, '2026-03-20 08:40:08'),
(59, 1, '2026-03-20 08:40:08'),
(60, 1, '2026-03-20 08:40:08'),
(61, 1, '2026-03-20 08:40:08'),
(62, 1, '2026-03-20 08:40:08'),
(63, 1, '2026-03-20 08:40:08'),
(64, 1, '2026-03-20 08:40:08'),
(65, 1, '2026-03-20 08:40:08'),
(66, 1, '2026-03-20 08:40:08'),
(67, 1, '2026-03-20 08:40:08'),
(68, 1, '2026-03-20 08:40:08'),
(69, 1, '2026-03-20 08:40:08'),
(70, 1, '2026-03-20 08:40:08'),
(71, 1, '2026-03-20 08:40:08'),
(72, 1, '2026-03-20 08:40:08'),
(73, 1, '2026-03-20 08:40:08'),
(74, 1, '2026-03-20 08:40:08'),
(75, 1, '2026-03-20 08:40:08'),
(76, 1, '2026-03-20 08:40:08'),
(77, 1, '2026-03-20 08:40:08'),
(78, 1, '2026-03-20 08:40:08'),
(79, 1, '2026-03-20 08:40:08'),
(80, 1, '2026-03-20 08:40:08'),
(81, 1, '2026-03-20 08:40:08'),
(82, 1, '2026-03-20 08:40:08'),
(83, 1, '2026-03-20 08:40:08'),
(84, 1, '2026-03-20 08:40:08'),
(85, 1, '2026-03-20 08:40:08'),
(86, 1, '2026-03-20 08:40:08'),
(87, 1, '2026-03-20 08:40:08'),
(88, 1, '2026-03-20 08:40:08'),
(89, 1, '2026-03-20 08:40:08'),
(90, 1, '2026-03-20 08:40:08'),
(91, 1, '2026-03-20 08:40:08'),
(92, 1, '2026-03-20 08:40:08'),
(93, 1, '2026-03-20 08:40:08'),
(94, 1, '2026-03-20 08:40:08'),
(95, 1, '2026-03-20 08:40:08'),
(96, 1, '2026-03-20 08:40:08'),
(97, 1, '2026-03-20 08:40:08'),
(98, 1, '2026-03-20 08:40:08'),
(99, 1, '2026-03-20 08:40:08'),
(100, 1, '2026-03-20 08:40:08'),
(101, 1, '2026-03-20 08:40:08'),
(102, 1, '2026-03-20 08:40:08'),
(103, 1, '2026-03-20 08:40:08'),
(104, 1, '2026-03-20 08:40:08'),
(105, 1, '2026-03-20 08:40:08'),
(106, 1, '2026-03-20 08:40:08'),
(107, 1, '2026-03-20 08:40:08'),
(108, 1, '2026-03-20 08:40:08'),
(109, 1, '2026-03-20 08:40:08'),
(110, 1, '2026-03-20 08:40:08'),
(111, 1, '2026-03-20 08:40:08'),
(112, 1, '2026-03-20 08:40:08'),
(113, 1, '2026-03-20 08:40:08'),
(114, 1, '2026-03-20 08:40:08'),
(115, 1, '2026-03-20 08:40:08'),
(116, 1, '2026-03-20 08:40:08'),
(117, 1, '2026-03-20 08:40:08'),
(118, 1, '2026-03-20 08:40:08'),
(119, 1, '2026-03-20 08:40:08'),
(120, 1, '2026-03-20 08:40:08'),
(121, 1, '2026-03-20 08:40:08'),
(122, 1, '2026-03-20 08:40:08'),
(123, 1, '2026-03-20 08:40:08'),
(124, 1, '2026-03-20 08:40:08'),
(125, 1, '2026-03-20 08:47:30'),
(126, 1, '2026-03-20 08:47:30'),
(127, 1, '2026-03-20 11:06:41'),
(128, 1, '2026-03-20 11:06:41'),
(129, 1, '2026-03-20 11:06:41'),
(130, 1, '2026-03-20 11:06:41'),
(131, 1, '2026-03-20 11:06:41'),
(132, 1, '2026-03-20 11:31:23'),
(133, 1, '2026-03-20 11:31:23'),
(134, 1, '2026-03-20 11:31:23'),
(135, 1, '2026-03-20 11:31:23'),
(136, 1, '2026-03-20 13:36:46'),
(137, 1, '2026-03-20 13:36:46'),
(138, 1, '2026-03-21 09:26:12'),
(139, 1, '2026-03-21 09:26:12'),
(140, 1, '2026-03-21 09:26:12'),
(141, 1, '2026-03-21 09:26:12'),
(142, 1, '2026-03-21 09:26:12'),
(143, 1, '2026-03-23 10:37:08'),
(144, 1, '2026-03-23 10:37:08'),
(145, 1, '2026-03-23 10:37:08'),
(146, 1, '2026-03-23 10:37:08'),
(147, 1, '2026-03-23 10:37:08');

-- --------------------------------------------------------

--
-- Table structure for table `provinces`
--

CREATE TABLE `provinces` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `region` varchar(50) NOT NULL,
  `is_popular` tinyint(1) DEFAULT 0,
  `sort_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `provinces`
--

INSERT INTO `provinces` (`id`, `name`, `slug`, `region`, `is_popular`, `sort_order`, `is_active`, `created_at`) VALUES
(1, 'กรุงเทพฯ', 'bangkok', 'กรุงเทพฯ & ปริมณฑล', 1, 1, 1, '2026-02-16 03:33:06'),
(2, 'นนทบุรี', 'nonthaburi', 'กรุงเทพฯ & ปริมณฑล', 1, 2, 1, '2026-02-16 03:33:06'),
(3, 'ปทุมธานี', 'pathumthani', 'กรุงเทพฯ & ปริมณฑล', 1, 3, 1, '2026-02-16 03:33:06'),
(4, 'สมุทรปราการ', 'samutprakan', 'กรุงเทพฯ & ปริมณฑล', 1, 4, 1, '2026-02-16 03:33:06'),
(5, 'ชลบุรี', 'chonburi', 'ภาคตะวันออก', 1, 5, 1, '2026-02-16 03:33:06'),
(6, 'ระยอง', 'rayong', 'ภาคตะวันออก', 1, 6, 1, '2026-02-16 03:33:06'),
(7, 'เชียงใหม่', 'chiangmai', 'ภาคเหนือ', 1, 7, 1, '2026-02-16 03:33:06'),
(8, 'เชียงราย', 'chiangrai', 'ภาคเหนือ', 1, 8, 1, '2026-02-16 03:33:06'),
(9, 'นครราชสีมา', 'nakhonratchasima', 'ภาคอีสาน', 1, 9, 1, '2026-02-16 03:33:06'),
(10, 'ขอนแก่น', 'khonkaen', 'ภาคอีสาน', 1, 10, 1, '2026-02-16 03:33:06'),
(11, 'อุดรธานี', 'udonthani', 'ภาคอีสาน', 1, 11, 1, '2026-02-16 03:33:06'),
(12, 'ภูเก็ต', 'phuket', 'ภาคใต้', 1, 12, 1, '2026-02-16 03:33:06'),
(13, 'กระบี่', 'krabi', 'ภาคใต้', 1, 13, 1, '2026-02-16 03:33:06'),
(14, 'สุราษฎร์ธานี', 'suratthani', 'ภาคใต้', 1, 14, 1, '2026-02-16 03:33:06'),
(15, 'พังงา', 'phangnga', 'ภาคใต้', 1, 15, 1, '2026-02-16 03:33:06'),
(16, 'สงขลา', 'songkhla', 'ภาคใต้', 1, 16, 1, '2026-02-16 03:33:06'),
(17, 'ประจวบคีรีขันธ์', 'prachuapkhirikhan', 'ภาคตะวันตก', 1, 17, 1, '2026-02-16 03:33:06'),
(18, 'เพชรบุรี', 'phetchaburi', 'ภาคตะวันตก', 1, 18, 1, '2026-02-16 03:33:06'),
(19, 'อื่นๆ', 'others', 'อื่นๆ', 1, 99, 1, '2026-02-16 03:33:06');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `advance_price_requests`
--
ALTER TABLE `advance_price_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_apr_case_id` (`case_id`),
  ADD KEY `idx_apr_status` (`status`),
  ADD KEY `idx_apr_requested_by` (`requested_by`);

--
-- Indexes for table `agents`
--
ALTER TABLE `agents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `agent_code` (`agent_code`);

--
-- Indexes for table `agent_accounting`
--
ALTER TABLE `agent_accounting`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_agent` (`agent_id`),
  ADD KEY `idx_case` (`case_id`);

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_appt_case` (`case_id`),
  ADD KEY `idx_appt_date` (`appt_date`);

--
-- Indexes for table `approval_transactions`
--
ALTER TABLE `approval_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `auction_bids`
--
ALTER TABLE `auction_bids`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `auction_transactions`
--
ALTER TABLE `auction_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `cases`
--
ALTER TABLE `cases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `case_code` (`case_code`);

--
-- Indexes for table `case_cancellations`
--
ALTER TABLE `case_cancellations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`),
  ADD KEY `requested_by` (`requested_by`);

--
-- Indexes for table `case_followups`
--
ALTER TABLE `case_followups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_followup_case_id` (`case_id`),
  ADD KEY `idx_followup_sales_id` (`sales_id`);

--
-- Indexes for table `case_transfer_log`
--
ALTER TABLE `case_transfer_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `chat_conversations`
--
ALTER TABLE `chat_conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_conversation` (`platform`,`platform_conversation_id`),
  ADD UNIQUE KEY `uk_customer_code` (`customer_code`),
  ADD KEY `idx_platform` (`platform`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_assigned` (`assigned_to`),
  ADD KEY `idx_last_message` (`last_message_at`),
  ADD KEY `idx_tag_id` (`tag_id`),
  ADD KEY `idx_chat_conv_loan_request_id` (`loan_request_id`),
  ADD KEY `idx_chat_conv_agent_phone` (`agent_phone`),
  ADD KEY `idx_ineligible` (`ineligible_property`),
  ADD KEY `idx_is_dead` (`is_dead`),
  ADD KEY `idx_lead_quality` (`lead_quality`),
  ADD KEY `idx_next_followup` (`next_follow_up_at`);

--
-- Indexes for table `chat_followups`
--
ALTER TABLE `chat_followups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cf_conv_id` (`conversation_id`),
  ADD KEY `idx_cf_agent_id` (`agent_id`),
  ADD KEY `idx_cf_created_at` (`created_at`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversation` (`conversation_id`),
  ADD KEY `idx_sender` (`sender_type`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_platform_msg` (`platform_message_id`),
  ADD KEY `idx_sender_id` (`sender_id`);

--
-- Indexes for table `chat_platforms`
--
ALTER TABLE `chat_platforms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_platform` (`platform_name`,`platform_id`),
  ADD KEY `idx_platform` (`platform_name`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `chat_tags`
--
ALTER TABLE `chat_tags`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sort` (`sort_order`);

--
-- Indexes for table `contract_expiry_logs`
--
ALTER TABLE `contract_expiry_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_case_days` (`case_id`,`days_before`) COMMENT 'ป้องกันส่งซ้ำ',
  ADD KEY `idx_case_id` (`case_id`);

--
-- Indexes for table `customer_blacklists`
--
ALTER TABLE `customer_blacklists`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_phone` (`phone`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `debtor_accounting`
--
ALTER TABLE `debtor_accounting`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_case` (`case_id`),
  ADD KEY `loan_request_id` (`loan_request_id`),
  ADD KEY `idx_case_id` (`case_id`);

--
-- Indexes for table `investors`
--
ALTER TABLE `investors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_investor_code` (`investor_code`),
  ADD UNIQUE KEY `uk_username` (`username`);

--
-- Indexes for table `investor_accounting`
--
ALTER TABLE `investor_accounting`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user` (`user_id`);

--
-- Indexes for table `investor_auction_history`
--
ALTER TABLE `investor_auction_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_investor` (`investor_id`);

--
-- Indexes for table `investor_withdrawals`
--
ALTER TABLE `investor_withdrawals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_investor` (`investor_id`),
  ADD KEY `idx_case` (`case_id`);

--
-- Indexes for table `issuing_transactions`
--
ALTER TABLE `issuing_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `legal_documents`
--
ALTER TABLE `legal_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_case_id` (`case_id`),
  ADD KEY `idx_loan_request_id` (`loan_request_id`);

--
-- Indexes for table `legal_transactions`
--
ALTER TABLE `legal_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `case_id` (`case_id`);

--
-- Indexes for table `loan_requests`
--
ALTER TABLE `loan_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `debtor_code` (`debtor_code`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_province` (`province`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_road_access` (`road_access`),
  ADD KEY `idx_seizure_status` (`seizure_status`),
  ADD KEY `idx_debtor_code` (`debtor_code`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_reject_cat` (`reject_category`),
  ADD KEY `idx_lead_source` (`lead_source`),
  ADD KEY `idx_reject_category` (`reject_category`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notif_target_dept` (`target_department`),
  ADD KEY `idx_notif_target_user` (`target_user_id`),
  ADD KEY `idx_notif_loan_request` (`loan_request_id`),
  ADD KEY `idx_notif_case` (`case_id`),
  ADD KEY `idx_notif_is_read` (`is_read`),
  ADD KEY `idx_notif_type` (`type`),
  ADD KEY `idx_notif_created_at` (`created_at`);

--
-- Indexes for table `notification_reads`
--
ALTER TABLE `notification_reads`
  ADD UNIQUE KEY `unique_user_notif` (`notification_id`,`user_id`);

--
-- Indexes for table `provinces`
--
ALTER TABLE `provinces`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `advance_price_requests`
--
ALTER TABLE `advance_price_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `agents`
--
ALTER TABLE `agents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `agent_accounting`
--
ALTER TABLE `agent_accounting`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `approval_transactions`
--
ALTER TABLE `approval_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `auction_bids`
--
ALTER TABLE `auction_bids`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `auction_transactions`
--
ALTER TABLE `auction_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `cases`
--
ALTER TABLE `cases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `case_cancellations`
--
ALTER TABLE `case_cancellations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `case_followups`
--
ALTER TABLE `case_followups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `case_transfer_log`
--
ALTER TABLE `case_transfer_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chat_conversations`
--
ALTER TABLE `chat_conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `chat_followups`
--
ALTER TABLE `chat_followups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `chat_platforms`
--
ALTER TABLE `chat_platforms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `chat_tags`
--
ALTER TABLE `chat_tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `contract_expiry_logs`
--
ALTER TABLE `contract_expiry_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_blacklists`
--
ALTER TABLE `customer_blacklists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `debtor_accounting`
--
ALTER TABLE `debtor_accounting`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `investors`
--
ALTER TABLE `investors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `investor_accounting`
--
ALTER TABLE `investor_accounting`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `investor_auction_history`
--
ALTER TABLE `investor_auction_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `investor_withdrawals`
--
ALTER TABLE `investor_withdrawals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `issuing_transactions`
--
ALTER TABLE `issuing_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `legal_documents`
--
ALTER TABLE `legal_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `legal_transactions`
--
ALTER TABLE `legal_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `loan_requests`
--
ALTER TABLE `loan_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=148;

--
-- AUTO_INCREMENT for table `provinces`
--
ALTER TABLE `provinces`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `approval_transactions`
--
ALTER TABLE `approval_transactions`
  ADD CONSTRAINT `approval_transactions_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `auction_bids`
--
ALTER TABLE `auction_bids`
  ADD CONSTRAINT `auction_bids_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `case_cancellations`
--
ALTER TABLE `case_cancellations`
  ADD CONSTRAINT `case_cancellations_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`),
  ADD CONSTRAINT `case_cancellations_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `admin_users` (`id`);

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `debtor_accounting`
--
ALTER TABLE `debtor_accounting`
  ADD CONSTRAINT `debtor_accounting_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `debtor_accounting_ibfk_2` FOREIGN KEY (`loan_request_id`) REFERENCES `loan_requests` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `issuing_transactions`
--
ALTER TABLE `issuing_transactions`
  ADD CONSTRAINT `issuing_transactions_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `legal_documents`
--
ALTER TABLE `legal_documents`
  ADD CONSTRAINT `fk_legaldoc_case` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `legal_transactions`
--
ALTER TABLE `legal_transactions`
  ADD CONSTRAINT `legal_transactions_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- Migration: Add bank account columns and bank book file to loan_requests
-- Run: mysql -u root loandd_db < add_bank_columns.sql

ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) NULL COMMENT 'เลขบัญชีธนาคาร',
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NULL COMMENT 'ชื่อธนาคาร',
  ADD COLUMN IF NOT EXISTS bank_book_file VARCHAR(500) NULL COMMENT 'ไฟล์สมุดบัญชี';

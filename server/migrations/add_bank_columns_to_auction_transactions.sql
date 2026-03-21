-- Migration: add bank columns to auction_transactions
-- Run this in phpMyAdmin or MySQL Workbench

ALTER TABLE auction_transactions
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transfer_slip TEXT NULL DEFAULT NULL;

-- =========================================================
--  LoanDD Migration: Social Media + Land Transfer + Agent
--  วิธีรัน: phpmyadmin → เลือก DB loandd → แท็บ SQL → วาง + Execute
-- =========================================================

-- 1) เพิ่มช่อง LINE ID ให้ลูกหนี้ (loan_requests)
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS contact_line VARCHAR(255) NULL DEFAULT NULL AFTER contact_phone;

-- 2) เพิ่มช่อง Facebook ให้ลูกหนี้ (loan_requests)
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS contact_facebook VARCHAR(255) NULL DEFAULT NULL AFTER contact_line;

-- 3) เพิ่มวันนัดโอนที่ดินหลังประมูล (cases)
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS land_transfer_date DATE NULL DEFAULT NULL;

-- 4) เพิ่มหมายเหตุวันโอนที่ดิน (cases)
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS land_transfer_note VARCHAR(500) NULL DEFAULT NULL AFTER land_transfer_date;

-- 5) เพิ่ม Facebook ให้นายหน้า (agents)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS facebook VARCHAR(255) NULL DEFAULT NULL AFTER line_id;

-- 6) เพิ่มเลขบัตรประชาชนให้นายหน้า (agents)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS national_id VARCHAR(50) NULL DEFAULT NULL AFTER facebook;

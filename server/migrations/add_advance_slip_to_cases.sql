-- Migration: เพิ่ม column สลิปค่าหักล่วงหน้า ใน cases table
-- รันใน phpMyAdmin หรือ MySQL client
-- วันที่: 2026-03-20

ALTER TABLE cases
  ADD COLUMN advance_slip VARCHAR(500) DEFAULT NULL AFTER transaction_slip;

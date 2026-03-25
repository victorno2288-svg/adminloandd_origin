-- Migration: เพิ่มฟิลด์สลิปมัดจำในตาราง auction_bids
-- วันที่: 2026-03-25

ALTER TABLE auction_bids
  ADD COLUMN deposit_slip    VARCHAR(500)  NULL AFTER note,
  ADD COLUMN deposit_amount  DECIMAL(15,2) NULL AFTER deposit_slip,
  ADD COLUMN refund_status   ENUM('pending','refunded','winner') NOT NULL DEFAULT 'pending' AFTER deposit_amount;

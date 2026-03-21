-- เพิ่มคอลัมน์สถานะโอนเงินและสลิปใน investor_auction_history
-- วันที่: 2026-03-16

ALTER TABLE investor_auction_history
  ADD COLUMN transfer_status ENUM('pending', 'transferred') NOT NULL DEFAULT 'pending' AFTER winning_price,
  ADD COLUMN transfer_slip VARCHAR(500) DEFAULT NULL AFTER transfer_status;

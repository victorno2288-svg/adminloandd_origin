-- ★ เพิ่มฟิลด์คัดกรองทรัพย์อัตโนมัติ (Auto Property Screening)
-- road_access: มีทางเข้าออก (yes) หรือตาบอด (no)
-- seizure_status: ปลอดภาระ (none) | ติดจำนอง (mortgaged) | ถูกอายัด (seized)

ALTER TABLE loan_requests
  ADD COLUMN road_access VARCHAR(10) NULL DEFAULT NULL
    COMMENT 'ทางเข้าออกถนน: yes=มีทาง, no=ตาบอด'
    AFTER land_area,
  ADD COLUMN seizure_status VARCHAR(20) NULL DEFAULT NULL
    COMMENT 'สถานะอายัด: none=ปลอดภาระ, mortgaged=ติดจำนอง, seized=ถูกอายัด'
    AFTER road_access;

-- index เพื่อ filter ทรัพย์ที่ผ่าน/ไม่ผ่านเกณฑ์
ALTER TABLE loan_requests
  ADD INDEX idx_road_access (road_access),
  ADD INDEX idx_seizure_status (seizure_status);

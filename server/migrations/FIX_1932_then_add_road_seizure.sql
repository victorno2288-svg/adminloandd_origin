-- ============================================================
-- แก้ Error #1932 "Table doesn't exist in engine"
-- แล้วเพิ่มคอลัมน์ road_access + seizure_status
-- ============================================================

-- ขั้นตอน 1: ปิด strict mode + foreign key check ชั่วคราว
SET SESSION innodb_strict_mode = OFF;
SET SESSION foreign_key_checks = 0;

-- ขั้นตอน 2: Force rebuild InnoDB tablespace (แก้ #1932)
ALTER TABLE loan_requests ENGINE = InnoDB;

-- ขั้นตอน 3: เปิด foreign key check คืน
SET SESSION foreign_key_checks = 1;

-- ขั้นตอน 4: เพิ่มคอลัมน์ (ถ้าไม่มีอยู่แล้ว)
ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS road_access VARCHAR(10) NULL DEFAULT NULL
    COMMENT 'ทางเข้าออกถนน: yes=มีทาง, no=ตาบอด'
    AFTER land_area,
  ADD COLUMN IF NOT EXISTS seizure_status VARCHAR(20) NULL DEFAULT NULL
    COMMENT 'สถานะอายัด: none=ปลอดภาระ, mortgaged=ติดจำนอง, seized=ถูกอายัด'
    AFTER road_access;

-- ขั้นตอน 5: เพิ่ม index
ALTER TABLE loan_requests
  ADD INDEX IF NOT EXISTS idx_road_access (road_access),
  ADD INDEX IF NOT EXISTS idx_seizure_status (seizure_status);

-- ============================================
-- Cleanup: ลบตารางที่ไม่ได้ใช้ในเว็บไซต์แล้ว
-- Database: loandd_db (MariaDB)
-- Date: 2026-03-23
-- ============================================

-- ปิด foreign key checks ชั่วคราว (กันปัญหา dependency)
SET FOREIGN_KEY_CHECKS = 0;

-- 1) document_checklist_items (26 rows) — ไม่มี backend route ใช้
DROP TABLE IF EXISTS `document_checklist_items`;

-- 2) document_checklist_templates (5 rows) — ไม่มี backend route ใช้
DROP TABLE IF EXISTS `document_checklist_templates`;

-- 3) document_templates (0 rows) — ว่างเปล่า ไม่มี backend ใช้
DROP TABLE IF EXISTS `document_templates`;

-- 4) sales_scripts (1 row) — ไม่มี backend route ใช้
DROP TABLE IF EXISTS `sales_scripts`;

-- 5) sales_script_items (9 rows) — ไม่มี backend route ใช้
DROP TABLE IF EXISTS `sales_script_items`;

-- 6) dead_lead_reasons (16 rows) — backend ใช้แค่นับ dead_leads ไม่ได้ใช้ตารางนี้
DROP TABLE IF EXISTS `dead_lead_reasons`;

-- เปิด foreign key checks กลับ
SET FOREIGN_KEY_CHECKS = 1;

-- เสร็จแล้ว! ลบ 6 ตารางที่ไม่ได้ใช้

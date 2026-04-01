# CLAUDE Memory — adminloandd Project

_อัพเดทล่าสุด: 2026-03-27 (session 9 continued)_

---

## โปรเจกต์นี้คืออะไร
ระบบ Admin สำหรับบริษัทสินเชื่อ (Loan) มี:
- **Backend**: Node.js/Express → `/server/`
- **Frontend**: React (Vite) → `/lond-admin/src/`
- **DB**: MySQL (ตาราง `loan_requests`, `chat_conversations`, `chat_messages` ฯลฯ)
- **Chat**: LINE + Facebook webhook รับรูปและข้อความลูกค้า

---

## ✅ งานที่ทำเสร็จแล้ว (ทั้งหมด)

### 1. Gemini OCR 2-Stage สำหรับโฉนด
**ไฟล์**: `server/controllers/ocrController.js`, `server/routes/ocrRoutes.js`
- เพิ่ม `sharp` preprocessing: grayscale → normalize → sharpen → gamma(1.2) → PNG
- **Stage 1** (`/api/ocr/extract-deed?stage=1`): อ่านแค่ อำเภอ+จังหวัด+deed_side จากมุมขวาบน (เร็ว)
- **Stage 2** (`/api/ocr/extract-deed?stage=2`): full deed — เน้น **หน้าหลัง บรรทัดสุดท้าย = เนื้อที่คงเหลือจริง**
- Model: `gemini-2.5-flash` → fallback `gemini-1.5-flash` (free tier)
- มี `system_instruction` สำหรับเอกสารราชการไทย
- Route: `POST /api/ocr/extract-deed`

### 2. Auto-save deed images → loan_request.deed_images
**ไฟล์**: `server/controllers/chatWebhookController.js`
- `downloadAndSaveImageLocally(imageUrl, prefix, callback)`: ดาวน์โหลด Facebook CDN URL → save `/uploads/chat/{prefix}_{timestamp}.jpg` ถาวร
- `applyDeedDataToLoanRequest(conv, deedData, io, platform, imageLocalUrl)`: signature เพิ่ม `imageLocalUrl` param ที่ 5
- เพิ่ม `JSON_ARRAY_APPEND` ใน UPDATE เพื่อ append path เข้า `deed_images` JSON array
- กรณีสร้าง loan_request ใหม่ (`autoCreateLoanRequest`): หลัง INSERT → UPDATE `deed_images` ทันที

### 3. chatController.js — SELECT ครบทุก fields
**ไฟล์**: `server/controllers/chatController.js`
- JOIN query ดึง `deed_images`, `images as lr_images`, `appraisal_images`, `appraisal_book_image`
- ดึงครบทุก marital status docs + checklist docs ทุก field

### 4. ลบ autoMigrate + สร้าง setup.sql
**ไฟล์**: `server/index.js`, `setup.sql` (root)
- ลบ `autoMigrate` IIFE ออกจาก `index.js` (Hostinger รัน migrate ไม่ได้)
- `setup.sql`: รวม SQL ทุก statement — รันใน phpMyAdmin ครั้งเดียว (IF NOT EXISTS ทุก statement)
- ครอบคลุม: CREATE TABLE 11 ตาราง + ALTER TABLE ทุก column + MODIFY checklist fields → TEXT
- มี: `reply_mode ENUM('manual','ai') DEFAULT 'manual'` และ `customer_line_name VARCHAR(255)` แล้ว

### 5. Auto-update รูปโปรไฟล์ LINE/FB + ไม่เขียนทับชื่อ
**ไฟล์**: `server/controllers/chatWebhookController.js`
- `findOrCreateConversation`: avatar อัพเดทเสมอเมื่อรูปเปลี่ยน (`customerAvatar !== conv.customer_avatar`)
- `customer_name`: อัพเดทเฉพาะตอนยังไม่มี (ไม่เขียนทับชื่อที่ admin ตั้งเอง)

### 6. AI/Manual Reply Mode
**ไฟล์**: `chatWebhookController.js`, `chatController.js`, `chatRoutes.js`, `ChatPage.jsx`
- `reply_mode ENUM('manual','ai') DEFAULT 'manual'` ใน `chat_conversations`
- `PATCH /api/admin/chat/conversations/:id/reply-mode`
- `triggerAiReply(conv, text, io)`: เช็ค reply_mode → Gemini 1.5 Flash → save DB (sender_type='ai') → push LINE/FB → emit socket
- ปุ่ม toggle ใน header แถวเดียวกับ "โอนลูกหนี้": สีเขียว "🤖 AI ตอบ" / สีเทา "✏️ ตอบเอง"
- ข้อความ AI: bubble สีเขียว + badge "🤖 AI Assistant"
- Model: `gemini-1.5-flash` (free tier) แยกจาก OCR (`gemini-2.5-flash`)

### 7. customer_line_name — ชื่อต้นฉบับจาก LINE/FB
**ไฟล์**: `server/controllers/chatWebhookController.js`, `setup.sql`
- column `customer_line_name VARCHAR(255)` ใน `chat_conversations`
- `findOrCreateConversation`:
  - `customer_name` → อัพเดทเฉพาะตอนยังไม่มีค่า (admin แก้ไขได้)
  - `customer_line_name` → อัพเดทเสมอเมื่อ LINE/FB ส่งชื่อมา (ชื่อต้นฉบับ ไม่ถูกเขียนทับ)
  - INSERT ใหม่: บันทึก `customer_line_name` พร้อมกัน
- `autoCreateLoanRequest`: ใช้ `merged.customer_line_name || merged.customer_name` สำหรับ `contact_name`

### 8. DocSlotsPopup v3 — อัพโหลดได้โดยตรง
**ไฟล์**: `lond-admin/src/pages/ChatPage.jsx`, `server/controllers/chatController.js`, `server/routes/chatRoutes.js`
- **DocSlotsPopup v3**: ทุก slot มีปุ่ม "อัพโหลด" (interactive, ไม่ใช่ view-only)
  - State ภายใน component: `uploadingSlot`, `localExtra` (map dbField → paths ใหม่), `uploadMsg`
  - Slot ที่มี `dbField` → แสดงปุ่มอัพโหลด + preview ทันทีหลังอัพ (ไม่ต้องรีเฟรช)
  - Slot ว่าง → แสดง dashed placeholder "ยังไม่มีไฟล์ — กดอัพโหลด"
  - Read-only (ไม่มี `dbField`): `property_img`, `permit_img`, `id_img` (derived จาก lrImages)
- **API**: `POST /api/admin/chat/conversations/:id/upload-doc?field=xxx`
  - Multer `docSlotMulter` (req.query.field) → folder map:
    - `deed_images` → `deeds/`
    - `appraisal_images` → `appraisal-properties/`
    - `appraisal_book_image` → `appraisal-books/`
    - ทุกอย่างอื่น → `auction-docs/`
  - JSON_ARRAY_APPEND + COALESCE+NULLIF ป้องกัน edge cases (null, '', 'null')
  - Single path field: `appraisal_book_image` (UPDATE ตรง ไม่ append)
  - Whitelist 25 fields
- **syncLoanRequest** (ปุ่ม "อัพเดท" ในแชท): force overwrite (เปลี่ยนจาก COALESCE → direct `field = ?`) + ใช้ `customer_line_name` ก่อน `customer_name`

### 9. Auto-classify รูปภาพจาก keyword + Gemini OCR ✅
**ไฟล์**: `server/controllers/chatWebhookController.js`
- **KEYWORD_FIELD_MAP**: 25+ regex rules จับ keyword ในข้อความ 5 นาทีล่าสุด → map เข้า column ของ `loan_requests`
  - ตัวอย่าง: "โฉนด" → `deed_images`, "บัตรประชาชน" → `borrower_id_card`, "ทะเบียนบ้าน" → `house_reg_book`, "สลิปค่าประเมิน" → payment_slip flow
- **`classifyAndSaveImage(conv, imagePath, io)`**: query ข้อความ 5 นาที → regex match → `autoSaveImageToField`
- **`autoSaveImageToField(conv, imagePath, field, io)`**: JSON_ARRAY_APPEND เข้า loan_requests + emit `image_auto_saved`
- **`DOC_TYPE_FIELD_MAP`**: OCR fallback — `id_card` → `borrower_id_card`, `house_reg` → `house_reg_book`
- **Flow**: รูปเข้า → Phase 1 keyword (fast, setImmediate) → Phase 2 Gemini OCR (ข้อมูลเพิ่ม)
- `_payment_slip` marker = ส่งให้ `autoCreateCaseFromAppraisalSlip` flow ปกติ
- Build ผ่าน ✓

### 10. แสดงชื่อ LINE/FB ในแชท ✅
**ไฟล์**: `lond-admin/src/pages/ChatPage.jsx`, `server/controllers/chatController.js`
- **frontend**: ทุก spot ที่แสดงชื่อ → ใช้ `customer_line_name || customer_name`
  - Conversation list: ชื่อ + avatar initial
  - Follow-up due list
  - Chat header
  - Info panel: แสดง `customer_line_name` เป็น "ชื่อ LINE/FB" (read-only) + `customer_name` เป็น "ชื่อจริง (admin)"
  - ถ้า `customer_line_name ≠ customer_name` → แสดง "ชื่อจริง: xxx" ใต้ชื่อหลัก
- **backend search**: เพิ่ม `customer_line_name LIKE ?` ใน WHERE clause (getConversations + searchCustomersForDedup)
- **setup.sql**: `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS customer_line_name` — มีอยู่แล้วใน line 372

### 11. DocSlotsPopup — Fix property photo routing ✅
**ไฟล์**: `server/controllers/chatController.js`, `lond-admin/src/pages/ChatPage.jsx`
- เพิ่ม `property_photos: 'properties'`, `building_permit: 'permits'` ใน `DOC_FOLDER_MAP`
- แก้ filter `property_img` จาก `.includes('properties')` → `.includes('uploads/properties/') || ...(!appraisal)` ป้องกัน `appraisal-properties` แทรกเข้า

### 12. AI/Manual reply toggle → Dropdown + loading state ✅
**ไฟล์**: `lond-admin/src/pages/ChatPage.jsx`, `server/controllers/chatController.js`
- เปลี่ยนจาก `<button>` toggle → `<select>` dropdown
- state `savingReplyMode` + `replyModeErr` — disable ระหว่าง save, แสดง error ถ้าล้มเหลว
- guard: ถ้า value ไม่เปลี่ยน หรือ saving อยู่ → skip
- controller: เพิ่ม `ER_BAD_FIELD_ERROR` check → แสดง hint SQL ที่ต้องรัน
- **⚠ ต้องรัน SQL ก่อนใช้**: `ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS reply_mode ENUM('manual','ai') NOT NULL DEFAULT 'manual';`

### 13. AI Flow System — System Prompt จาก Flow Builder ✅
**ไฟล์**: `server/controllers/chatFlowController.js`, `server/controllers/chatController.js`, `server/controllers/chatWebhookController.js`, `ChatFlowBuilderPage.jsx`, `ChatPage.jsx`
- **DB**: `chat_flows.ai_system_prompt TEXT` — system prompt ยาวๆ ที่กำหนดให้ AI ตอบอิสระ
- **DB**: `chat_conversations.active_flow_id INT` — FK → chat_flows.id
- **Flow Builder**: เพิ่ม textarea `ai_system_prompt` ใต้ trigger_keywords (บันทึกพร้อม flow)
- **ChatPage info panel**: dropdown เลือก flow ที่จะใช้กับแชทนี้ + แสดง preview prompt
- **triggerAiReply**: ดึง `active_flow_id` → JOIN `chat_flows.ai_system_prompt` → pass เป็น system instruction ให้ Gemini แทน hardcoded prompt
  - ถ้าไม่มี flow → ใช้ DEFAULT_SYSTEM (prompt เดิม)
  - ถ้ามี flow → ใช้ `flow_prompt` แทนทั้งหมด (AI มีอิสระตอบ)
- **Endpoints ใหม่**:
  - `PATCH /conversations/:id/active-flow` — ผูก flow กับ conversation
  - `GET /flows/list-active` — ดึง flows สำหรับ dropdown
- **⚠ SQL ที่ต้องรัน**:
  ```sql
  ALTER TABLE chat_flows ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT NULL;
  ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS active_flow_id INT NULL;
  ```

---

## โครงสร้าง DB ที่สำคัญ (loan_requests)

```
deed_images          JSON array  → uploads/deeds/
images               JSON array  → mixed: uploads/id-cards/, /properties/, /permits/, /videos/
appraisal_images     JSON array  → uploads/appraisal-properties/ (ซ่อนจาก sales)
appraisal_book_image single path → uploads/appraisal-books/ (ซ่อนจาก sales)

-- Checklist (JSON array — TEXT column ที่ serialize เป็น JSON):
deed_copy, building_permit, house_reg_prop, sale_contract, debt_free_cert
blueprint, property_photos, land_tax_receipt, borrower_id_card, name_change_doc
condo_title_deed, condo_location_map, common_fee_receipt, floor_plan
location_sketch_map, land_use_cert, rental_contract, business_reg

-- Marital Status (JSON array):
house_reg_book, marriage_cert, spouse_id_card, spouse_reg_copy
single_cert, death_cert, divorce_doc, will_court_doc, testator_house_reg
```

## โครงสร้าง DB ที่สำคัญ (chat_conversations)

```
customer_name        VARCHAR  → ชื่อที่ admin แก้ไขได้ (ไม่ถูกเขียนทับจาก LINE/FB)
customer_line_name   VARCHAR  → ชื่อต้นฉบับจาก LINE/FB (อัพเดทเสมอ)
customer_avatar      TEXT     → รูปโปรไฟล์ (อัพเดทเสมอ)
reply_mode           ENUM     → 'manual' | 'ai' DEFAULT 'manual'
loan_request_id      INT      → FK ไป loan_requests
```

---

## 15. AI Auto-Tag ระบบแท็กอัตโนมัติ ✅

**ไฟล์**: `server/controllers/chatWebhookController.js`, `lond-admin/src/pages/ChatPage.jsx`

### แท็กที่ใช้งาน (6 อัน — ลดจาก 7)
| ชื่อ | สี | ความหมาย |
|------|-----|-----------|
| รอข้อมูล | น้ำเงิน #dbeafe | default — ยังไม่มีข้อมูลทรัพย์ |
| เข้าเกณฑ์ | เขียว #dcfce7 | ทรัพย์ที่รับได้ รอประเมิน |
| ไม่เข้าเกณฑ์ | แดง #fee2e2 | ส.ป.ก./ครุฑเขียว/3จว.ใต้ ฯลฯ |
| ติดภาระ | เหลือง #fef9c3 | หนี้เดิมสูง ยังพิจารณาได้ |
| ปิดเคส | เทา #f3f4f6 | จบแล้ว ไม่ต้องตาม |
| นายหน้า | ม่วง #f3e8ff | ตัวแทน/โบรกเกอร์ |

(ลบ: อนุมัติแล้ว — ซ้ำกับ pipeline stage)

### autoTagConversation() — keyword rules
- **ไม่เข้าเกณฑ์** (highest priority): ส.ป.ก, ภ.บ.ท, ครุฑเขียว, น.ส.3, ที่นา/ไร่/สวน, ปัตตานี/ยะลา/นราธิวาส
- **ติดภาระ**: ติดจำนอง, ยอดค้าง, หนี้เยอะ, ภาระหนัก, ค้างชำระ, ติดธนาคาร, ไถ่ถอน
- **นายหน้า**: นายหน้า, ตัวแทน, คอมมิชชั่น, commission, broker, ค่านำ
- **เข้าเกณฑ์**: โฉนด, น.ส.4, บ้านเดี่ยว, ทาวน์เฮ้าส์, คอนโด, อาคารพาณิชย์, ตึกแถว, อพาร์, โรงงาน, โกดัง

### กฎการเขียนทับ
- **ไม่เขียนทับ**: `ปิดเคส`, `ไม่เข้าเกณฑ์` (ถาวร)
- **เขียนทับได้**: NULL, `รอข้อมูล`, แท็กอื่นๆ (ยกเว้น 2 อันข้างบน)
- Admin เปลี่ยนเองได้เสมอ

### Socket event
- Backend emit: `tag_auto_set` → `{ conv_id, tag_id, tag_name }`
- Frontend รับ: อัพ conversations list + convDetail real-time

### SQL ที่ต้องรัน
```sql
UPDATE chat_tags SET name='เข้าเกณฑ์',   bg_color='#dcfce7', text_color='#15803d' WHERE name='ทรัพย์เข้าเกณฑ์';
UPDATE chat_tags SET name='ไม่เข้าเกณฑ์', bg_color='#fee2e2', text_color='#b91c1c' WHERE name='ทรัพย์ไม่เข้าเกณฑ์';
UPDATE chat_tags SET name='ติดภาระ',      bg_color='#fef9c3', text_color='#a16207' WHERE name='ติดภาระสูง';
UPDATE chat_tags SET bg_color='#dbeafe',  text_color='#1d4ed8' WHERE name='รอข้อมูล';
UPDATE chat_tags SET bg_color='#f3f4f6',  text_color='#4b5563' WHERE name='ปิดเคส';
UPDATE chat_tags SET bg_color='#f3e8ff',  text_color='#7e22ce' WHERE name='นายหน้า';
DELETE FROM chat_tags WHERE name='อนุมัติแล้ว';
```

---

## Rules / ข้อตกลงสำคัญ
- **ฝ่ายขาย** (`department === 'sales'`) → ห้ามดู `appraisal_images` และ `appraisal_book_image`
- **หน้าหลังโฉนด บรรทัดสุดท้าย** = เนื้อที่คงเหลือจริง (ไม่ใช่หน้าหน้า ซึ่งอาจเก่า 30 ปี)
- **Facebook image URL** ต้อง download ก่อนเสมอ เพราะ URL หมดอายุ
- **duplicate check**: ตรวจเฉพาะเบอร์โทร (`contact_phone`) — ชื่อซ้ำกันได้
- **Gemini free tier**: OCR ใช้ `gemini-2.5-flash`, AI reply ใช้ `gemini-1.5-flash`
- เซฟลง memory ทุกครั้งที่ทำงานเสร็จ แล้วบอก user ว่าเซฟแล้ว

---

## 14. AI System Prompt สำหรับ LoanDD (Chat Flow Builder) ✅

**วิธีใช้:** กด "สร้าง Flow ใหม่" ใน Chat Flow Builder → วาง prompt นี้ในช่อง "AI System Prompt"

```
คุณคือ "น้องดีดี" ผู้ช่วยฝ่ายขายของบริษัท โลนดีดี (Loan DD)
พูดภาษาไทย น้ำเสียงสุภาพ อบอุ่น เป็นกันเอง เหมือนพี่สาวที่น่าเชื่อถือ
ตอบกระชับ ไม่เกิน 3-4 ประโยคต่อครั้ง ถามทีละข้อ ไม่ถามพร้อมกันหลายข้อ

== ข้อมูลบริษัท ==
- ชื่อ: บริษัท โลนดีดี (Loan DD)
- ที่ตั้ง: เขตมีนบุรี กรุงเทพมหานคร (ไม่มีสาขาต่างจังหวัด)
- บริการ: รับจำนองและรับขายฝากอสังหาริมทรัพย์
- ถูกกฎหมาย: ทำธุรกรรมที่กรมที่ดินทุกรายการ ไม่ใช่นายทุนนอกระบบ

== บริการและวงเงิน ==
- จำนอง: ได้วงเงิน 20-30% ของราคาประเมินเอกชน — ชื่อในโฉนดยังเป็นของลูกค้า
- ขายฝาก: ได้วงเงิน 40-50% ของราคาประเมินเอกชน — ได้วงเงินสูงกว่า แต่โอนชื่อชั่วคราว
- วงเงินขั้นต่ำ: 100,000 บาท
- ระยะเวลาสัญญา: 3-5 ปี (ขั้นต่ำ 12 เดือน)
- ดอกเบี้ย: ตามกฎหมาย ไม่เกิน 15% ต่อปี (1.25% ต่อเดือน)
- ค่าดำเนินการ: ประมาณ 5% ของวงเงิน (หักจากยอดปล่อยกู้)
- ค่าสมัคร: ฟรี / ประเมินวงเงินเบื้องต้นจากรูปโฉนด: ฟรี

== ทรัพย์ที่รับ ==
รับ: โฉนดครุฑแดง (น.ส.4 จ.), บ้านเดี่ยว, ทาวน์เฮ้าส์, คอนโด, อาคารพาณิชย์, ตึกแถว, อพาร์ทเม้นท์, โรงงาน, โกดัง
ไม่รับ: ส.ป.ก. 4-01, ภ.บ.ท. 5, น.ส.3 ก. (ครุฑเขียว), ที่นา ที่ไร่ ที่สวน, ที่ดินติดอายัด, 3 จังหวัดชายแดนใต้ (ปัตตานี ยะลา นราธิวาส)
พิเศษ: รับทรัพย์ที่ยังติดจำนองที่อื่นอยู่ได้ (ไถ่ถอนพร้อมกัน)

== เงื่อนไขพิเศษ ==
- ไม่เช็คเครดิตบูโร ไม่ต้องมีสลิปเงินเดือน
- ทำได้แม้ถูกปฏิเสธจากธนาคาร
- ถ้าโฉนดมีหลายชื่อ — ทุกคนต้องเซ็นที่กรมที่ดินพร้อมกัน
- ส่งเอกสารทางไลน์ได้ ไม่ต้องมาสำนักงาน (ลงนามสัญญาที่สำนักงานที่ดินในเขตทรัพย์ได้)
- เวลาดำเนินการรวม: 15-30 วันทำการ

== ขั้นตอนการเก็บข้อมูลลูกค้า (ถามทีละข้อ) ==
1. ชื่อ-นามสกุล
2. ประเภทและที่ตั้งของทรัพย์ (เช่น ที่ดินเปล่า / บ้าน / คอนโด อยู่จังหวัดอะไร)
3. ประเภทเอกสาร (โฉนดครุฑแดงไหม?)
4. วงเงินที่ต้องการ
5. เบอร์โทรติดต่อ

== กฎสำคัญ (ห้ามทำ) ==
- ห้ามบอกตัวเลขดอกเบี้ยหรือวงเงินชัดเจน → ให้บอกว่า "ขึ้นอยู่กับผลประเมินทรัพย์ค่ะ"
- ห้ามรับปากว่าจะผ่านอนุมัติ
- ห้ามบอกหมายเลขบัญชีใดๆ → ให้บอกว่า "แอดมินจะแจ้งบัญชีโดยตรงค่ะ"
- ห้ามพูดถึงคู่แข่ง
- ถ้าถามนอกเรื่อง → ตอบสั้นๆ แล้วดึงกลับเรื่องสินเชื่อ

== วิธีตอบ FAQ พบบ่อย ==
- "ดอกเบี้ยเท่าไหร่?" → "ดอกเบี้ยตามกฎหมาย ขึ้นอยู่กับประเภทสัญญาและผลประเมินค่ะ ขอทราบรายละเอียดทรัพย์ก่อนนะคะ"
- "ได้เงินเท่าไหร่?" → "ขอทราบชนิดและที่ตั้งทรัพย์ก่อนนะคะ เพื่อให้ทีมประเมินวงเงินเบื้องต้นให้ได้เลยค่ะ"
- "เช็คแบล็คลิสต์ไหม?" → "ไม่เช็คเครดิตบูโรค่ะ ใช้ทรัพย์เป็นหลักประกันอย่างเดียว"
- "ถูกธนาคารปฏิเสธมา" → "ไม่เป็นไรค่ะ โลนดีดีเงื่อนไขยืดหยุ่นกว่าธนาคารมากค่ะ"
- "ส.ป.ก. ได้ไหม?" → "ขอโทษนะคะ ส.ป.ก. ยังไม่รับพิจารณาค่ะ เพราะทำธุรกรรมกับเอกชนไม่ได้"
```

---

## 16. งานที่บอสสั่งจากสคริปประชุม (แก้งาน.docx session 8) 🔴 ยังไม่ได้ทำ

### หลักการหลัก: "งานค้าง" Dashboard
บอสต้องการให้ **ทุกฝ่ายเห็นแค่งานที่ค้างของตัวเองเท่านั้น** — ถ้าไม่มีงานหน้าต้องโล่ง ถ้ามีงานถึงจะ popup ขึ้นมา

### สิ่งที่ต้องเอาออก / ปรับ

#### ❌ ลบออกหรือซ่อนจาก Frontend

| หน้า/ฟีเจอร์ | ไฟล์ | เหตุผล |
|---|---|---|
| หน้าลูกค้าทั้งหมด (Sales) | `SalesPage.jsx` | บอส: "ไม่ต้องมีอันนี้ละ...กลับไปนั่งอ่านเล่นไม่ได้ใช้" มีทั้ง expire/dead ไม่จำเป็น |
| แผนที่ embed ใน App | `SalesFormPage.jsx` (map section) | บอส: "ไม่ต้องมีแผนที่ในแอปอยู่แล้ว มันกด Google Map ธรรมดา" → เปลี่ยนเป็น URL link ไป Google Maps แทน |
| แท็ก "ไม่เข้าเกณฑ์" ใน manual dropdown | `ChatPage.jsx` | ✅ **ทำแล้ว** — ซ่อนจาก Quick Tag Bar + info panel dropdown แล้ว |

#### 🔧 ปรับหน้า Dashboard ทุกฝ่าย → โฟกัสงานค้าง

บอสพูดชัดเจน: "คอนเซ็ปต์ก็คือเหลือเฉพาะงานค้าง — ทำให้จบ ทำให้จบเร็วๆ"

| ฝ่าย | Dashboard ปัจจุบัน | สิ่งที่บอสอยากให้เห็น |
|---|---|---|
| **เซลล์** | `SalesDashboardPage.jsx` | งานค้างแชท (รอข้อมูล+เข้าเกณฑ์+ติดภาระ) + ลูกค้าของตัวเองที่ต้องตาม + ลิงก์ไปหน้าแชท |
| **ประเมิน** | `AppraisalPage.jsx` | เฉพาะเคสที่รอเช็กราคา / รอเล่มประเมิน / รอนัดประเมิน |
| **อนุมัติ** | `ApprovalPage.jsx` | เฉพาะเคสที่รอตารางวงเงิน |
| **นิติกรรม** | `LegalPage.jsx` | เฉพาะสัญญาที่รอออก (พร้อม link URL Google Maps ไปสำนักงานที่ดิน) |
| **บัญชี** | `AccountingPage.jsx` | 2 กลุ่ม: รอรับเงิน / รอโอนเงิน — ดูสลิปแล้วกด confirm |
| **Super Admin** | `DashboardPage.jsx` / `CeoDashboardPage.jsx` | เห็นทุกแดชบอร์ดรวม + สถิติทุกฝ่าย |

### สรุปที่บอสพูดถึงแต่ละฝ่าย

**เซลล์ (Sales):**
- หน้าหลักคือแชท ไม่ใช่ list ลูกค้า
- ทำงานแค่ 2 อย่าง: ตอบแชท + ตามลูกค้าที่ค้าง
- เห็นแค่ลูกค้าของตัวเองใน chat
- ปุ่ม "Dead" กดแล้วลบออกจาก inbox ตลอดกาล

**ประเมิน:**
- เห็นแค่งานที่รออยู่ — ถ้าโล่งแปลว่าไม่มีงาน
- ต้องใส่ราคาประเมินเบื้องต้น + ราคาค่าประเมิน + วันนัด
- ต้องรับ Microsoft Word เล่มประเมิน (ไม่ใช่ PDF เพราะระบบเบลอ)

**นิติกรรม:**
- AI สร้างสัญญาให้แล้ว → นิติกรรมแค่ตรวจ (ซ้าย: โฉนด/บัตรประชาชน, ขวา: สัญญา) แล้วกด submit
- Link Google Maps แทนแผนที่ใน App (กด URL แล้วออกไป Google Maps เอง)

**บัญชี:**
- เห็นแค่: รับเงิน / ต้องโอนเงิน
- ดูสลิปแล้วกด confirm

### งานค้าง = ปุ่มที่ทำแล้ว ✅
- ปุ่ม "📋 งานค้าง" ใน ChatPage ซ้าย → filter เฉพาะ รอข้อมูล + เข้าเกณฑ์ + ติดภาระ ✅

### งานที่ทำเสร็จเพิ่มเติม session 8 ✅
- ลบส่วน "ข้อมูลทรัพย์" ออกจาก `LegalEditPage.jsx` (จังหวัด/อำเภอ/ตำบล, โลเคชั่น embed, เลขโฉนด, เปรียบเทียบรูป, เล่มประเมิน, VDO)
- ลบ section ตารางวงเงิน ออกจาก `LegalEditPage.jsx` (ไม่ต้องการบนหน้านี้)
- เพิ่ม "สถานที่ทำนิติกรรม" card ใน `LegalEditPage.jsx` — ดึงจาก `legalForm.land_office` (ตารางนัดหมาย)
  - Header bar + ปุ่ม Google Maps + ปุ่ม "ดูดาวเทียม" toggle
  - กดแล้วเปิด iframe Google Maps embed ภาพดาวเทียม (collapsible)
  - toggle layer 3 แบบ: ดาวเทียม+ถนน / ดาวเทียม / แผนที่ เหมือน MapPreview
  - state: `showLandOfficeMap`, `landOfficeMapType` ใน LegalEditPage component

### งานที่ยังต้องทำ 🔴
1. ลบ / ซ่อน `SalesPage.jsx` ออกจาก menu
2. เปลี่ยนแผนที่ embed → URL link ใน `SalesFormPage.jsx`
3. ปรับ Dashboard ของแต่ละฝ่ายให้เน้น "งานค้าง" (เรียงตาม priority)
4. เพิ่ม Notification / Alert ระบบ (บอสพูดถึง Telegram bot แจ้งเตือน)

---

## 17. งานที่ทำเพิ่มใน session 9 ✅

### LegalEditPage.jsx (หน้าฝ่ายกฎหมาย `/legal/edit/:id`)
- ลบ card "สรุปอนุมัติ + ผลประเมิน (compact)" ออก (badge จำนอง/ขายฝาก + วงเงินอนุมัติ)
- ลบ card "ตารางวงเงิน (จากฝ่ายอนุมัติ)" ออก
- เพิ่ม "ผลอนุมัติจากฝ่ายอนุมัติสินเชื่อ" (สถานะ, วงเงิน, ดอกเบี้ย, ค่าดำเนินการ) ในคอลัมน์ซ้าย
- ย้าย "PDF รวมเอกสารทั้งหมด" จากคอลัมน์ขวา → คอลัมน์ซ้าย
- เพิ่ม `at2.approval_status` เข้า SELECT ใน `legalController.js`

### IssuingEditPage.jsx (หน้าฝ่ายออกสัญญา `/issuing/edit/:id`)
- ลบ card "ข้อมูลทรัพย์" ทั้งหมดออก (จังหวัด/อำเภอ/ตำบล, โลเคชั่น embed, เลขโฉนด, รูปเปรียบเทียบ, เล่มประเมิน, VDO)
- แทนที่ด้วย "ผลอนุมัติจากฝ่ายอนุมัติสินเชื่อ" + "ตารางวงเงิน (จากฝ่ายอนุมัติ)" — เหมือนหน้าฝ่ายขาย
- เพิ่ม `at2.credit_table_file` เข้า SELECT ใน `issuingController.js`

### 17b. งานที่ทำเพิ่มใน session 9 (ต่อ) ✅

#### AccountingPage.jsx — ลบ section ราคาประเมิน + เพิ่ม preview บัตรนายทุน
- ลบ section "ราคาประเมิน (เบื้องต้น) / ราคาประเมิน (จริง) / วงเงินอนุมัติ / LTV" ออกจากหน้าบัญชี (ข้อมูลไม่โหลด + ไม่จำเป็นสำหรับฝ่ายบัญชี)
- เพิ่ม **preview บัตรประชาชนนายทุน** ใน SectionCard "นายทุน" (thumbnail 56×56 + ลิงก์ "ดูไฟล์") — ใช้ `docs.investor_id_card_image`

#### InvestorPage.jsx — File preview cards สำหรับเอกสาร
- เพิ่ม styled preview cards (thumbnail + "มีไฟล์แล้ว" + ลิงก์ + ปุ่มลบ) สำหรับ 4 fields:
  - `id_card_image` (สีม่วง), `house_registration_image` (สีแดง), `passbook_image` (สีน้ำเงิน), `investor_contract` (สีม่วงเข้ม)

#### Investor ID Card Connection — เชื่อม `investors` table กับทุกหน้า 🔧 (กำลังแก้)
**ปัญหาหลัก**: `investor_id_card_image` ไม่โหลดในหน้านิติกรรม เพราะ:
1. `auction_transactions` อาจไม่มี record สำหรับ case นั้น หรือ `investor_id` FK ไม่ได้เซต
2. ผู้ชนะประมูลอยู่ใน **`auction_bids`** (`refund_status = 'winner'`) ไม่ใช่ `auction_transactions`

**วิธีแก้ที่ใช้**: COALESCE + subquery 4 ชั้น ใน `legalController.js`, `auctionController.js`, `accountingController.js`:
```sql
COALESCE(
  inv.id_card_image,                                    -- ชั้น 1: จาก JOIN ปกติ
  (SELECT ... WHERE investor_code = auc.investor_code), -- ชั้น 2: fallback by code
  (SELECT ... WHERE full_name = auc.investor_name),     -- ชั้น 3: fallback by name
  (SELECT i4.id_card_image FROM investors i4             -- ชั้น 4: จาก auction_bids ผู้ชนะ
   JOIN auction_bids ab ON ab.investor_id = i4.id
   WHERE ab.case_id = c.id AND ab.refund_status = 'winner' LIMIT 1)
) AS investor_id_card_image
```

**เพิ่มเติม**:
- เพิ่ม `AND auc.is_cancelled = 0` ใน JOIN `auction_transactions` ทุก controller
- ทำ JOIN investors ง่ายลง: `inv.id = auc.investor_id OR inv.investor_code = auc.investor_code OR inv.full_name = auc.investor_name`
- แก้ fallback regex ใน legalController ให้รองรับ JOIN condition ใหม่
- เพิ่ม debug log `[LEGAL DEBUG]` ใน legalController (ลบออกได้ตอน production)

**ไฟล์ที่แก้**:
- `server/controllers/legalController.js` — JOIN + COALESCE subquery + fallback regex + debug log
- `server/controllers/auctionController.js` — JOIN + COALESCE subquery
- `server/controllers/accountingController.js` — JOIN + COALESCE subquery + เพิ่ม preview บัตรนายทุน
- `lond-admin/src/pages/AccountingPage.jsx` — ลบ section ราคาประเมิน + เพิ่ม preview บัตรนายทุน
- `lond-admin/src/pages/InvestorPage.jsx` — file preview cards

**⚠ สถานะ**: ฝ่ายบัญชีบัตรนายทุนขึ้นแล้ว ✅ / ฝ่ายนิติกรรมยังรอทดสอบ (เพิ่ม auction_bids fallback แล้ว รอ restart server)

**DB ที่สำคัญ**:
- `auction_bids.refund_status` = `'pending'` | `'winner'` | `'refunded'` — ผู้ชนะประมูลจะเป็น `'winner'`
- `auction_bids.investor_id` = FK ไป `investors.id` (ตรงกว่า `auction_transactions.investor_id`)

---

## Environment
- API Key Gemini: บันทึกใน `.env` แล้ว
- Sharp: ติดตั้งแล้วใน server (Windows: `npm install --os=win32 --cpu=x64 sharp`)
- Build tool: Vite (`lond-admin/`) — `npx vite build`
- Upload paths:
  - `/uploads/chat/` — รูปจากแชท LINE/FB
  - `/uploads/deeds/` — โฉนด
  - `/uploads/id-cards/` — บัตรประชาชน
  - `/uploads/properties/` — รูปทรัพย์
  - `/uploads/permits/` — ใบอนุญาต
  - `/uploads/appraisal-books/` — สมุดประเมิน
  - `/uploads/appraisal-properties/` — รูปทรัพย์ประเมิน
  - `/uploads/auction-docs/` — checklist เอกสารทั้งหมด (deed_copy, marriage_cert ฯลฯ)

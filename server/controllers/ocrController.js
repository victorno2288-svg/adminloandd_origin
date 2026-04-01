// ============================================================
// OCR Controller — อ่านเอกสารไทยด้วย Gemini Vision AI
// v2: + Sharp preprocessing + 2-stage deed OCR
// ============================================================
const multer = require('multer');
const path   = require('path');
const https  = require('https');
const sharp  = require('sharp');

// ─── Multer: รับไฟล์ภาพเข้า memory ───────────────────────────
const storage = multer.memoryStorage();
exports.ocrUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|bmp|tiff|webp|pdf/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (jpg, png, tiff, webp, pdf)'));
  }
});

// ─── Image Preprocessing (Sharp) — ทำให้รูปชัดก่อนส่ง Gemini ─
/**
 * เพิ่มความคมชัด + normalize contrast สำหรับรูปเอกสาร
 * เหมาะสำหรับ: โฉนด, บัตรประชาชน, ทะเบียนบ้าน, สัญญา
 *
 * pipeline:
 *  1. แปลงเป็น grayscale → ลด noise สี
 *  2. normalize() → ปรับ histogram ให้ contrast ดีขึ้น
 *  3. sharpen() → เพิ่มความคมของตัวอักษร
 *  4. gamma(1.2) → เพิ่มความสว่างเล็กน้อยกับรูปมืด
 *  5. ส่งออกเป็น PNG (lossless) → Gemini อ่านได้ดีที่สุด
 */
async function preprocessImage(buffer, options = {}) {
  const { grayscale = true, sharpenSigma = 1.2, normalize = true } = options;
  try {
    let pipeline = sharp(buffer);
    if (grayscale)  pipeline = pipeline.grayscale();
    if (normalize)  pipeline = pipeline.normalize();
    pipeline = pipeline
      .sharpen({ sigma: sharpenSigma, m1: 0.5, m2: 3 })
      .gamma(1.2)
      .toFormat('png');
    const processed = await pipeline.toBuffer();
    return { buffer: processed, mimeType: 'image/png' };
  } catch (err) {
    console.warn('[OCR Preprocess] ⚠️ Sharp failed, ใช้รูปเดิม:', err.message);
    return { buffer, mimeType: null }; // fallback
  }
}

// ─── แปลงเลขไทย → อารบิก ──────────────────────────────────
function thaiToArabic(str) {
  if (!str) return str;
  return String(str).replace(/[๐-๙]/g, d => d.charCodeAt(0) - 3664);
}

// ─── ทำความสะอาด + แปลง ──────────────────────────────────
function cleanNumber(str) {
  if (!str) return null;
  return thaiToArabic(str).replace(/[^\d./]/g, '').trim() || null;
}

// ─── Gemini Vision API ────────────────────────────────────────
// model hierarchy: gemini-2.5-flash → gemini-1.5-flash (fallback)
function geminiVisionOcr(imageBuffer, mimeType, prompt, model = 'gemini-2.5-flash') {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return reject(new Error('ไม่พบ GEMINI_API_KEY ใน .env'));

    const base64 = imageBuffer.toString('base64');

    // ── image enhancement hint ──────────────────────────────────
    // เพิ่ม system instruction ให้ model รู้ว่านี่คือเอกสารราชการไทย
    const systemInstruction = `คุณเชี่ยวชาญการอ่านเอกสารราชการไทย (โฉนดที่ดิน บัตรประชาชน ทะเบียนบ้าน)
ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น ห้ามใส่ markdown code fence`;

    const body = JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json'
      }
    });

    const reqOpt = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(reqOpt, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            // ถ้า 2.5-flash ไม่รองรับ system_instruction → fallback ไป 1.5-flash
            if (model === 'gemini-2.5-flash' && parsed.error.code === 400) {
              console.warn('[OCR Gemini] ⚠️ 2.5-flash error, fallback to 1.5-flash');
              return geminiVisionOcr(imageBuffer, mimeType, prompt, 'gemini-1.5-flash')
                .then(resolve).catch(reject);
            }
            return reject(new Error(`Gemini API error: ${parsed.error.message}`));
          }
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            console.log('[OCR Gemini] ⚠️ ไม่มี text ใน response:', JSON.stringify(parsed).substring(0, 300));
            return reject(new Error('Gemini ไม่คืนข้อความ — ลองส่งรูปที่ชัดกว่านี้'));
          }
          resolve(text);
        } catch (e) {
          reject(new Error(`Gemini response parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Gemini request error: ${e.message}`)));
    req.write(body);
    req.end();
  });
}

// ─── Prompt โฉนด Stage 1: อ่านแค่ตำแหน่ง (เร็ว ถูก) ─────────
// ใช้เมื่อต้องการ อำเภอ+จังหวัด ทันที ก่อน admin ดูรายละเอียด
const DEED_PROMPT_STAGE1 = `คุณคือผู้เชี่ยวชาญอ่านโฉนดที่ดินไทย
อ่านรูปนี้แล้วดูเฉพาะ มุมขวาบน ของโฉนด ซึ่งมักมีตำแหน่งที่ตั้ง

กฎ:
- แปลงเลขไทย (๐-๙) → อารบิก (0-9) ทั้งหมด
- ห้ามใส่คำนำหน้า "จังหวัด" "อำเภอ" "ตำบล" — ใส่ชื่อเปล่าๆ
- ถ้าเห็นหลายจังหวัดให้เลือกที่น่าจะถูกที่สุด

ตอบ JSON เท่านั้น:
{
  "district":  "ชื่ออำเภอ/เขต",
  "province":  "ชื่อจังหวัด",
  "subdistrict": "ชื่อตำบล/แขวง (null ถ้าไม่เห็น)",
  "deed_number": "เลขที่โฉนด ถ้าเห็นชัด (null ถ้าไม่แน่ใจ)",
  "deed_side": "front หรือ back — ดูจากรูปแบบหน้ากระดาษ"
}

ถ้าข้อมูลใดอ่านไม่ออก ให้ใส่ null`;

// ─── Prompt โฉนด Stage 2: อ่านรายละเอียดเต็ม ─────────────────
// ** สำคัญ: ให้เน้นหน้าหลัง (back) สำหรับเนื้อที่คงเหลือจริง **
const DEED_PROMPT = `คุณคือผู้เชี่ยวชาญอ่านโฉนดที่ดินไทย
โปรดอ่านข้อมูลจากโฉนดในรูปภาพนี้อย่างละเอียดทุกตัวอักษร แล้วตอบเป็น JSON เท่านั้น

══ กฎสำคัญ ══
1. แปลงเลขไทย (๐๑๒๓๔๕๖๗๘๙) → อารบิก (0123456789) ทุกตัว
2. ห้ามใส่คำนำหน้า "จังหวัด" "อำเภอ" "ตำบล" "ถนน" — ชื่อเปล่าๆ เท่านั้น
3. deed_type: "โฉนดที่ดิน" | "น.ส.4จ" | "น.ส.4ก" | "น.ส.3ก" | "น.ส.3" | "ส.ป.ก." | "อื่นๆ"
4. owner_name: ชื่อ-นามสกุลภาษาไทยพร้อมคำนำหน้า (นาย/นาง/นางสาว)

══ เนื้อที่ (area) — อ่านให้ถูกต้อง ══
- ถ้าเป็น หน้าหลังโฉนด: ให้ดูที่ "บรรทัดสุดท้าย" ของตารางเนื้อที่
  → บรรทัดสุดท้าย = เนื้อที่คงเหลือจริง ณ ปัจจุบัน (หลังแบ่งแยก/ขาย)
  → ไม่ใช่บรรทัดแรก (ที่อาจเก่า 30 ปี)
- ถ้าเป็น หน้าหน้าโฉนด: อ่านตัวเลข ไร่-งาน-ตารางวา ตามที่เห็น
- deed_side ระบุว่าเห็น "front" หรือ "back" เพื่อ audit

══ ตอบ JSON นี้เท่านั้น ══
{
  "deed_side":   "front หรือ back (ดูจาก layout หน้ากระดาษ)",
  "deed_number": "เลขที่โฉนด (อารบิก)",
  "deed_type":   "ประเภทโฉนด",
  "map_sheet":   "ระวาง (เช่น 5234 III 3208,3008)",
  "land_number": "เลขที่ดิน (อารบิก)",
  "survey_page": "หน้าสำรวจ (อารบิก)",
  "owner_name":  "ชื่อ-นามสกุลเจ้าของที่ดิน",
  "road":        "ชื่อถนน (null ถ้าไม่มี)",
  "subdistrict": "ชื่อตำบล/แขวง",
  "district":    "ชื่ออำเภอ/เขต",
  "province":    "ชื่อจังหวัด",
  "house_no":    "บ้านเลขที่ (null ถ้าไม่มี)",
  "moo":         "หมู่ที่ (ตัวเลขเท่านั้น, null ถ้าไม่มี)",
  "area": {
    "rai":  "จำนวนไร่ (อารบิก)",
    "ngan": "จำนวนงาน (อารบิก)",
    "wa":   "ตารางวา (อารบิก รวมทศนิยม เช่น 58.6)",
    "source_row": "front=แถวหลัก / back_last=บรรทัดสุดท้ายหน้าหลัง"
  },
  "issue_date":  "วันที่ออกโฉนด YYYY-MM-DD (null ถ้าอ่านไม่ได้)",
  "notes":       "ข้อสังเกตพิเศษ เช่น มีรอยแก้ไข/ตราประทับ (null ถ้าไม่มี)"
}

ถ้าข้อมูลใดอ่านไม่ออกหรือไม่มีในโฉนด ให้ใส่ null`;

// ─── Prompt สำหรับบัตรประชาชน ────────────────────────────
const ID_CARD_PROMPT = `คุณคือผู้เชี่ยวชาญอ่านบัตรประชาชนไทย
อ่านข้อมูลจากบัตรในรูปภาพ แล้วตอบเป็น JSON เท่านั้น

{
  "id_number": "เลขบัตรประชาชน 13 หลัก (เฉพาะตัวเลข)",
  "full_name": "ชื่อ-นามสกุลภาษาไทย (รวมคำนำหน้า เช่น นาย/นาง/นางสาว)",
  "full_name_en": "ชื่อ-นามสกุลภาษาอังกฤษ (ถ้ามี)",
  "date_of_birth": "วันเกิด YYYY-MM-DD (แปลงจาก พ.ศ. เป็น ค.ศ.)",
  "issue_date": "วันออกบัตร YYYY-MM-DD",
  "expire_date": "วันหมดอายุ YYYY-MM-DD",
  "address": "ที่อยู่เต็มจากบัตร"
}

ถ้าข้อมูลใดอ่านไม่ออก ใส่ null`;

// ─── Prompt สำหรับสมุดบัญชีธนาคาร ───────────────────────
const PASSBOOK_PROMPT = `คุณคือผู้เชี่ยวชาญอ่านหน้าสมุดบัญชีธนาคารไทย
อ่านข้อมูลจากรูปภาพ แล้วตอบเป็น JSON เท่านั้น

{
  "bank_name": "ชื่อธนาคาร (เช่น กสิกรไทย, กรุงไทย, กรุงเทพ, ไทยพาณิชย์, กรุงศรีอยุธยา, ทหารไทยธนชาต, ออมสิน, ธ.ก.ส., อาคารสงเคราะห์)",
  "account_number": "เลขที่บัญชี (ตัวเลขและขีด เช่น 123-4-56789-0)",
  "account_name": "ชื่อ-นามสกุลเจ้าของบัญชี (ภาษาไทย)"
}

ถ้าข้อมูลใดอ่านไม่ออก ใส่ null`;

// ─── Prompt สำหรับทะเบียนบ้าน ────────────────────────────
const HOUSE_REG_PROMPT = `คุณคือผู้เชี่ยวชาญอ่านทะเบียนบ้านไทย
อ่านข้อมูลจากรูปภาพทะเบียนบ้าน แล้วตอบเป็น JSON เท่านั้น

{
  "head_of_household": "ชื่อ-นามสกุลเจ้าบ้าน (ภาษาไทย)",
  "house_no": "บ้านเลขที่ (เช่น 123/4)",
  "moo": "หมู่ที่ (ตัวเลขเท่านั้น, null ถ้าไม่มี)",
  "road": "ชื่อถนน (null ถ้าไม่มี)",
  "subdistrict": "ตำบล/แขวง (ไม่มีคำนำหน้า)",
  "district": "อำเภอ/เขต (ไม่มีคำนำหน้า)",
  "province": "จังหวัด (ไม่มีคำนำหน้า)",
  "postcode": "รหัสไปรษณีย์ (5 หลัก)"
}

สร้าง full_address จากส่วนที่มี เช่น "123/4 หมู่ 5 ถนนสุขุมวิท ตำบลคลองตัน เขตคลองเตย กรุงเทพมหานคร 10110"
ถ้าข้อมูลใดอ่านไม่ออก ใส่ null`;

// ─── Prompt สำหรับสลิปเงินเดือน ─────────────────────────
const SALARY_PROMPT = `อ่านสลิปเงินเดือนในรูปภาพ แล้วตอบเป็น JSON เท่านั้น

{
  "employee_name": "ชื่อพนักงาน",
  "company": "ชื่อบริษัท/นายจ้าง",
  "pay_period": "ช่วงเวลาที่จ่าย (เช่น มกราคม 2567)",
  "gross_salary": "รายได้รวมก่อนหัก (ตัวเลขเท่านั้น)",
  "net_salary": "เงินสุทธิที่ได้รับ (ตัวเลขเท่านั้น)",
  "monthly_income": "ยอดที่ใช้ได้จริง = net_salary ถ้ามี ไม่งั้นใช้ gross_salary"
}

ตอบ JSON เท่านั้น`;

// ─── Prompt สำหรับรูปแชท LINE / Facebook ──────────────
const CHAT_PROMPT = `คุณคือผู้ช่วยอ่านข้อมูลจากภาพหน้าจอแชท LINE หรือ Facebook Messenger
ดูภาพแล้วระบุข้อมูลของลูกค้า (ผู้ทักมาหรือคู่สนทนา ไม่ใช่ฝ่ายขาย) แล้วตอบเป็น JSON เท่านั้น

{
  "display_name": "ชื่อที่แสดงในแชท (ชื่อ LINE หรือ Facebook) ของลูกค้า",
  "line_id": "LINE ID ถ้าเห็นในโปรไฟล์ (ขึ้นต้นด้วย @ หรือไม่ก็ได้) ถ้าไม่มีใส่ null",
  "facebook_name": "ชื่อ Facebook ของลูกค้า ถ้ารูปจาก Facebook ใส่เหมือน display_name",
  "phone": "เบอร์โทรศัพท์ที่เห็นในแชทหรือโปรไฟล์ ถ้ามี (ตัวเลขเท่านั้น)",
  "platform": "line หรือ facebook — ดูจากรูปแบบ UI ของแอป"
}

หมายเหตุ:
- ถ้าเป็น LINE: display_name คือชื่อที่แสดงในไทม์ไลน์/แชท
- ถ้าเป็น Facebook: display_name คือชื่อ Facebook ของลูกค้า
- ถ้าไม่แน่ใจว่าใครคือลูกค้า ให้ดูว่าใครทักมาก่อน หรือใครอยู่ฝั่งซ้าย
- ถ้าข้อมูลใดหาไม่ได้ ใส่ null`;

// ─── Parse JSON จาก response ────────────────────────────
function parseResponseJson(text) {
  try {
    // ตัด markdown code block ถ้ามี
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // พยายาม extract JSON object ออกจาก text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

// ─── Main OCR Handler ─────────────────────────────────────────
exports.extractText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ที่อัปโหลด' });
    }

    const doc_type = req.body.doc_type || 'general';
    const fileSize = req.file.size;
    console.log(`[OCR Gemini] ═══════════════════════════════════`);
    console.log(`[OCR Gemini] เริ่มอ่าน: ${doc_type}`);
    console.log(`[OCR Gemini] ไฟล์: ${req.file.originalname} (${(fileSize / 1024).toFixed(0)} KB)`);

    // เลือก prompt ตามประเภทเอกสาร
    let prompt;
    switch (doc_type) {
      case 'land_deed':          prompt = DEED_PROMPT;       break;
      case 'id_card':            prompt = ID_CARD_PROMPT;    break;
      case 'salary_slip':        prompt = SALARY_PROMPT;     break;
      case 'chat':               prompt = CHAT_PROMPT;       break;
      case 'house_registration': prompt = HOUSE_REG_PROMPT;  break;
      case 'passbook':           prompt = PASSBOOK_PROMPT;   break;
      default:
        prompt = 'อ่านข้อความทั้งหมดในรูปภาพนี้ แล้วตอบเป็น JSON: {"raw_text": "ข้อความที่อ่านได้"}';
    }

    // ตรวจสอบ mime type จาก magic bytes
    let buf = req.file.buffer;
    let mimeType = 'image/jpeg';
    if (buf[0] === 0xFF && buf[1] === 0xD8)                     mimeType = 'image/jpeg';
    else if (buf[0] === 0x89 && buf[1] === 0x50)                mimeType = 'image/png';
    else if (buf[0] === 0x52 && buf[1] === 0x49)                mimeType = 'image/webp';
    else if (buf[0] === 0x47 && buf[1] === 0x49)                mimeType = 'image/gif';
    else {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
      mimeType = mimeMap[ext] || 'image/jpeg';
    }
    console.log(`[OCR Gemini] MIME: ${mimeType} (base64: ~${(fileSize * 1.37 / 1024).toFixed(0)} KB)`);

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.pdf') {
      return res.status(400).json({ success: false, message: 'กรุณาแปลง PDF เป็นรูปภาพก่อนทำ OCR' });
    }

    // ─── Preprocess สำหรับเอกสารราชการ (โฉนด + บัตรประชาชน + ทะเบียนบ้าน) ───
    const usePreprocess = ['land_deed','id_card','house_registration'].includes(doc_type)
      && req.body.skip_preprocess !== '1';
    if (usePreprocess) {
      console.log('[OCR Gemini] 🔧 preprocessing image (grayscale+normalize+sharpen)...');
      const result = await preprocessImage(buf);
      buf = result.buffer;
      mimeType = result.mimeType || mimeType;
      console.log(`[OCR Gemini] ✅ preprocessed → PNG (${(buf.length / 1024).toFixed(0)} KB)`);
    }

    // เรียก Gemini Vision
    console.log(`[OCR Gemini] กำลังเรียก Gemini 2.5 Flash Vision API...`);
    const rawResponse = await geminiVisionOcr(buf, mimeType, prompt);
    console.log(`[OCR Gemini] ✅ ได้ response (${rawResponse.length} chars):`);
    console.log(`[OCR Gemini] ${rawResponse.substring(0, 500)}`);

    const parsed = parseResponseJson(rawResponse);
    if (!parsed) {
      return res.json({
        success: false,
        message: 'อ่านได้แต่ parse JSON ไม่สำเร็จ',
        raw_text: rawResponse,
      });
    }

    // ─── Normalize ผลลัพธ์โฉนด / ทะเบียนบ้าน ────────────
    let extracted = parsed;
    if (doc_type === 'house_registration') {
      // สร้าง full_address จากส่วนประกอบ
      const parts = []
      if (parsed.house_no) parts.push(parsed.house_no)
      if (parsed.moo)      parts.push(`หมู่ ${thaiToArabic(parsed.moo)}`)
      if (parsed.road)     parts.push(`ถนน${parsed.road}`)
      if (parsed.subdistrict) parts.push(`ตำบล${parsed.subdistrict}`)
      if (parsed.district)    parts.push(`อำเภอ${parsed.district}`)
      if (parsed.province)    parts.push(parsed.province)
      if (parsed.postcode)    parts.push(parsed.postcode)
      extracted = { ...parsed, full_address: parts.join(' ') || null }
    }
    if (doc_type === 'land_deed') {
      // แปลงเลขไทยที่อาจยังหลุดมา
      extracted = {
        ...parsed,
        deed_number:  thaiToArabic(parsed.deed_number),
        land_number:  thaiToArabic(parsed.land_number),
        survey_page:  thaiToArabic(parsed.survey_page),
        moo:          thaiToArabic(parsed.moo),
        house_no:     thaiToArabic(parsed.house_no),
        area: parsed.area ? {
          rai:  thaiToArabic(parsed.area.rai),
          ngan: thaiToArabic(parsed.area.ngan),
          wa:   thaiToArabic(parsed.area.wa),
        } : null,
      };
    }

    // Log ผลลัพธ์แต่ละ field ชัดๆ
    console.log(`[OCR Gemini] ═══ ผลลัพธ์ ${doc_type} ═══`);
    Object.entries(extracted).forEach(([k, v]) => {
      if (v && typeof v === 'object') console.log(`[OCR Gemini]   ${k}: ${JSON.stringify(v)}`);
      else if (v) console.log(`[OCR Gemini]   ${k}: "${v}"`);
    });
    console.log(`[OCR Gemini] ═══════════════════════════════════`);

    res.json({
      success: true,
      doc_type,
      confidence: 95,
      raw_text: rawResponse,
      extracted,
    });

  } catch (err) {
    console.error('[OCR Gemini] ❌ Error:', err.message);
    res.status(500).json({ success: false, message: `OCR ล้มเหลว: ${err.message}` });
  }
};

// ─── OCR Smart Search ─────────────────────────────────────────
exports.searchByOCR = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'ไม่พบไฟล์ที่อัปโหลด' });

    const doc_type = req.body.doc_type || 'general';
    const buf = req.file.buffer;
    let mimeType = 'image/jpeg';
    if (buf[0] === 0xFF && buf[1] === 0xD8) mimeType = 'image/jpeg';
    else if (buf[0] === 0x89 && buf[1] === 0x50) mimeType = 'image/png';
    else if (buf[0] === 0x52 && buf[1] === 0x49) mimeType = 'image/webp';

    let prompt;
    switch (doc_type) {
      case 'land_deed': prompt = DEED_PROMPT; break;
      case 'id_card':   prompt = ID_CARD_PROMPT; break;
      default:          prompt = 'อ่านข้อความในรูปภาพ ตอบเป็น JSON: {"raw_text": "..."}';
    }

    console.log(`[OCR Search] กำลังอ่าน: ${doc_type}`);
    const rawResponse = await geminiVisionOcr(req.file.buffer, mimeType, prompt);
    const extracted = parseResponseJson(rawResponse) || {};

    // แปลงเลขไทย
    if (extracted.deed_number) extracted.deed_number = thaiToArabic(extracted.deed_number);
    if (extracted.moo)         extracted.moo         = thaiToArabic(extracted.moo);
    if (extracted.house_no)    extracted.house_no    = thaiToArabic(extracted.house_no);

    const db = require('../config/db');
    const results = { debtors: [], cases: [], agents: [], keywords: [] };

    // สร้าง keyword list
    const kw = [];
    if (extracted.full_name)   kw.push({ type: 'ชื่อ',     value: extracted.full_name });
    if (extracted.owner_name)  kw.push({ type: 'เจ้าของ',  value: extracted.owner_name });
    if (extracted.id_number)   kw.push({ type: 'เลขบัตร',  value: extracted.id_number });
    if (extracted.deed_number) kw.push({ type: 'เลขโฉนด', value: extracted.deed_number });
    if (extracted.province)    kw.push({ type: 'จังหวัด',  value: extracted.province });
    results.keywords = kw;

    // ค้นหาใน loan_requests
    const lrConditions = [];
    const lrParams = [];
    const searchName = extracted.full_name || extracted.owner_name;
    if (searchName) {
      lrConditions.push('lr.contact_name LIKE ?');
      lrParams.push(`%${searchName.replace(/^(นาย|นาง|นางสาว|น\.ส\.)/, '').trim()}%`);
    }
    if (extracted.deed_number) {
      lrConditions.push('lr.deed_number LIKE ?');
      lrParams.push(`%${extracted.deed_number}%`);
    }
    if (extracted.province) {
      lrConditions.push('lr.province LIKE ?');
      lrParams.push(`%${extracted.province}%`);
    }

    if (lrConditions.length > 0) {
      await new Promise(resolve => {
        db.query(
          `SELECT lr.id, lr.debtor_code, lr.contact_name, lr.contact_phone,
                  lr.property_type, lr.province, lr.deed_number,
                  lr.loan_amount, lr.status, lr.created_at,
                  c.case_code, c.id as case_id
           FROM loan_requests lr
           LEFT JOIN cases c ON c.loan_request_id = lr.id
           WHERE ${lrConditions.join(' OR ')}
           LIMIT 10`,
          lrParams,
          (err, rows) => { if (!err && rows) results.debtors = rows; resolve(); }
        );
      });
    }

    const total = results.debtors.length + results.agents.length + results.cases.length;
    res.json({
      success: true,
      doc_type,
      confidence: 95,
      extracted,
      keywords: results.keywords,
      results: { debtors: results.debtors, agents: results.agents, cases: results.cases, total },
    });

  } catch (err) {
    console.error('[OCR Search] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════
// 2-Stage Deed OCR
// POST /api/admin/ocr/extract-deed
//
// stage=1  → เร็ว ถูก → อ่านแค่ อำเภอ+จังหวัด จากมุมขวาบน
// stage=2  → เต็ม → อ่านรายละเอียดทั้งหมด เน้น back page last line
//
// body: multipart/form-data
//   file          — รูปโฉนด (jpg/png/webp)
//   stage         — "1" หรือ "2" (default: "2")
//   skip_preprocess — "1" ถ้าไม่ต้องการ preprocess (default: ทำ)
// ══════════════════════════════════════════════════════════════
exports.extractDeed = async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'ไม่พบไฟล์รูปโฉนด' });
    }

    const stage      = parseInt(req.body.stage || '2', 10);
    const skipPrep   = req.body.skip_preprocess === '1';
    const fileSize   = req.file.size;

    console.log(`[OCR Deed] ═══ Stage ${stage} ═══════════════════════`);
    console.log(`[OCR Deed] ไฟล์: ${req.file.originalname} (${(fileSize/1024).toFixed(0)} KB)`);
    console.log(`[OCR Deed] preprocess: ${!skipPrep}`);

    // ─── 1. detect mime ──────────────────────────────────────
    let buf = req.file.buffer;
    const magic = buf.slice(0, 4);
    let mimeType = 'image/jpeg';
    if (magic[0] === 0xFF && magic[1] === 0xD8) mimeType = 'image/jpeg';
    else if (magic[0] === 0x89 && magic[1] === 0x50) mimeType = 'image/png';
    else if (magic[0] === 0x52 && magic[1] === 0x49) mimeType = 'image/webp';

    // ─── 2. preprocess (always for deeds unless skipped) ────
    if (!skipPrep) {
      console.log('[OCR Deed] 🔧 Sharp: grayscale → normalize → sharpen → PNG');
      const pp = await preprocessImage(buf, {
        grayscale: true,
        normalize: true,
        sharpenSigma: stage === 1 ? 0.8 : 1.5, // stage2 ชัดกว่า
      });
      buf      = pp.buffer;
      mimeType = pp.mimeType || mimeType;
      console.log(`[OCR Deed] ✅ preprocessed (${(buf.length/1024).toFixed(0)} KB PNG)`);
    }

    // ─── 3. เลือก prompt ────────────────────────────────────
    const prompt = stage === 1 ? DEED_PROMPT_STAGE1 : DEED_PROMPT;

    // ─── 4. เรียก Gemini ────────────────────────────────────
    console.log(`[OCR Deed] 🤖 Gemini 2.5-flash...`);
    const rawResponse = await geminiVisionOcr(buf, mimeType, prompt);
    const parsed      = parseResponseJson(rawResponse);

    if (!parsed) {
      return res.status(422).json({
        success: false,
        stage,
        message: 'อ่านโฉนดไม่สำเร็จ — รูปอาจไม่ชัดหรือไม่ใช่โฉนด',
        raw_text: rawResponse,
      });
    }

    // ─── 5. normalize เลขไทย ────────────────────────────────
    const normalize = (v) => thaiToArabic(v);
    const extracted = {
      ...parsed,
      deed_number:  normalize(parsed.deed_number),
      land_number:  normalize(parsed.land_number),
      survey_page:  normalize(parsed.survey_page),
      moo:          normalize(parsed.moo),
      house_no:     normalize(parsed.house_no),
      area: parsed.area ? {
        rai:        normalize(parsed.area.rai),
        ngan:       normalize(parsed.area.ngan),
        wa:         normalize(parsed.area.wa),
        source_row: parsed.area.source_row || null,
      } : null,
    };

    // ─── 6. log ──────────────────────────────────────────────
    const elapsed = Date.now() - startTime;
    console.log(`[OCR Deed] ═══ ผลลัพธ์ stage${stage} (${elapsed}ms) ═══`);
    if (stage === 1) {
      console.log(`[OCR Deed]  จังหวัด: ${extracted.province} | อำเภอ: ${extracted.district}`);
      console.log(`[OCR Deed]  deed_side: ${extracted.deed_side} | เลขโฉนด: ${extracted.deed_number}`);
    } else {
      Object.entries(extracted).forEach(([k, v]) => {
        if (v && typeof v === 'object') console.log(`[OCR Deed]  ${k}: ${JSON.stringify(v)}`);
        else if (v) console.log(`[OCR Deed]  ${k}: "${v}"`);
      });
    }
    console.log(`[OCR Deed] ═══════════════════════════════════════`);

    // ─── 7. tip: ถ้า stage1 เห็นว่าเป็น back → แนะนำให้ stage2 ─
    const tip = (stage === 1 && extracted.deed_side === 'back')
      ? 'นี่คือหน้าหลังโฉนด — เนื้อที่จะดึงจากบรรทัดสุดท้าย (คงเหลือจริง)'
      : null;

    res.json({
      success: true,
      stage,
      elapsed_ms: elapsed,
      preprocessed: !skipPrep,
      tip,
      extracted,
      raw_text: rawResponse,
    });

  } catch (err) {
    console.error('[OCR Deed] ❌ Error:', err.message);
    res.status(500).json({ success: false, message: `OCR ล้มเหลว: ${err.message}` });
  }
};

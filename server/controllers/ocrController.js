// ============================================================
// OCR Controller — อ่านเอกสารไทยด้วย Gemini Vision AI
// ============================================================
const multer = require('multer');
const path   = require('path');
const https  = require('https');

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

// ─── Gemini Vision API (ใช้ pattern เดียวกับ ocrDocument.js) ─────
function geminiVisionOcr(imageBuffer, mimeType, prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return reject(new Error('ไม่พบ GEMINI_API_KEY ใน .env'));

    const base64 = imageBuffer.toString('base64');

    const body = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    });

    const model = 'gemini-2.5-flash';
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

// ─── Prompt สำหรับโฉนดที่ดิน ─────────────────────────────
const DEED_PROMPT = `คุณคือผู้เชี่ยวชาญอ่านโฉนดที่ดินไทย
โปรดอ่านข้อมูลจากโฉนดในรูปภาพนี้อย่างละเอียด แล้วตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น

กฎสำคัญ:
- แปลงเลขไทย (๐๑๒๓๔๕๖๗๘๙) เป็นเลขอารบิก (0123456789) ทั้งหมด
- ห้ามใส่คำว่า "จังหวัด" "อำเภอ" "ตำบล" "ถนน" นำหน้า ใส่แค่ชื่อเพียวๆ
- deed_type ให้ตอบเป็นหนึ่งใน: "โฉนดที่ดิน", "น.ส.4จ", "น.ส.4ก", "น.ส.3ก", "น.ส.3", "ส.ป.ก." หรือ "อื่นๆ"
- house_no: ใส่ตัวเลขบ้านเลขที่จากในโฉนด (เช่น "123/4") ถ้าไม่มีใส่ null
- owner_name: ชื่อ-นามสกุลภาษาไทยพร้อมคำนำหน้า (นาย/นาง/นางสาว)
- area: อ่านเนื้อที่ให้ครบ — ไร่, งาน, ตารางวา (รวมทศนิยม/เศษส่วน)

ตอบในรูปแบบ JSON นี้เท่านั้น:
{
  "deed_number": "เลขที่โฉนด (ตัวเลขอารบิกเท่านั้น)",
  "deed_type": "ประเภทโฉนด",
  "map_sheet": "ระวาง (เช่น 5234 III 3208,3008)",
  "land_number": "เลขที่ดิน (เลขอารบิก)",
  "survey_page": "หน้าสำรวจ (เลขอารบิก)",
  "owner_name": "ชื่อ-นามสกุลเจ้าของที่ดิน",
  "road": "ชื่อถนน (null ถ้าไม่มี)",
  "subdistrict": "ชื่อตำบล/แขวง (ไม่มีคำนำหน้า)",
  "district": "ชื่ออำเภอ/เขต (ไม่มีคำนำหน้า)",
  "province": "ชื่อจังหวัด (ไม่มีคำนำหน้า)",
  "house_no": "บ้านเลขที่ (null ถ้าไม่มี)",
  "moo": "หมู่ที่ (ตัวเลขเท่านั้น, null ถ้าไม่มี)",
  "area": {
    "rai": "จำนวนไร่ (เลขอารบิก)",
    "ngan": "จำนวนงาน (เลขอารบิก)",
    "wa": "จำนวนตารางวา (เลขอารบิก รวมทศนิยม เช่น 58.6)"
  },
  "issue_date": "วันที่ออกโฉนด YYYY-MM-DD (null ถ้าอ่านไม่ได้)"
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
    const buf = req.file.buffer;
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
    console.log(`[OCR Gemini] MIME: ${mimeType} (base64: ${(fileSize * 1.37 / 1024).toFixed(0)} KB)`);

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.pdf') {
      return res.status(400).json({ success: false, message: 'กรุณาแปลง PDF เป็นรูปภาพก่อนทำ OCR' });
    }

    // เรียก Gemini Vision
    console.log(`[OCR Gemini] กำลังเรียก Gemini 2.5 Flash Vision API...`);
    const rawResponse = await geminiVisionOcr(req.file.buffer, mimeType, prompt);
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

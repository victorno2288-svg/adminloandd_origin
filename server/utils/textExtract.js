'use strict';

/**
 * textExtract.js — Gemini AI Text Extraction สำหรับแชทลูกค้า
 *
 * ดึงข้อมูลลูกค้าจากข้อความแชท (ไม่ใช่รูป) โดยใช้ Gemini
 * รองรับรูปแบบที่ regex ธรรมดาดักจับไม่ได้ เช่น:
 *   - ชื่อ + เบอร์ + ประเภทในบรรทัดเดียวกัน
 *   - Numbered list "1. อาชีพ  2. เงินเดือน 22,000"
 *   - ราคาช่วง "5 - 6.5 ครับ" → estimated_value
 *   - ชื่อบริษัทซับซ้อน "บมจ. บริวิตาเกร(กรุงเทพ) จำกัด"
 *   - หมู่บ้าน + ห้องนอน/ห้องน้ำ
 *   - ครึ่งปี, 1.5 ปี, 18 เดือน → contract_years
 */

const https = require('https');

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || null;
}

// ============================================================
// extractCustomerInfoWithGemini
// messages = Array of { sender_type: 'customer'|'admin', message_text: string }
// callback(err, extracted) — extracted = object ของ field ที่อ่านได้
// ============================================================
function extractCustomerInfoWithGemini(messages, callback) {
  const apiKey = getGeminiKey();
  if (!apiKey) return callback(null, null);

  // กรองเฉพาะข้อความจากลูกค้า (แอดมินตอบกลับไม่นำมา extract)
  // แต่ใส่ label ให้ Gemini รู้บริบท
  const chatLog = messages
    .filter(m => m.message_text && m.message_text.trim())
    .slice(-20) // ดู 20 ข้อความล่าสุด
    .map(m => {
      const role = m.sender_type === 'admin' ? '[เซลล์]' : '[ลูกค้า]';
      return `${role}: ${m.message_text.trim()}`;
    })
    .join('\n');

  if (!chatLog) return callback(null, null);

  const prompt = `คุณเป็นผู้ช่วย AI ของบริษัท LOAN DD ที่เชี่ยวชาญด้านสินเชื่อจำนองและขายฝากอสังหาริมทรัพย์ไทย

ต่อไปนี้คือบทสนทนาในแชทระหว่างเซลล์กับลูกค้า ให้ดึงข้อมูลสำคัญของลูกค้าออกมา

== บทสนทนา ==
${chatLog}

== คำสั่ง ==
ให้ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น
ถ้าข้อมูลใดไม่มีในบทสนทนา ให้ใส่ null
ตัวเลขทุกชนิดต้องเป็น number ล้วน ไม่มีหน่วย

{
  "customer_name": "ชื่อ นามสกุลลูกค้า (ไม่ใช่ชื่อเซลล์) หรือ null",
  "customer_phone": "เบอร์โทร 10 หลัก ไม่มี - หรือ space หรือ null",
  "loan_type_detail": "selling_pledge ถ้าขายฝาก | mortgage ถ้าจำนอง | null",
  "property_type": "บ้านเดี่ยว | ทาวน์เฮ้าส์ | คอนโด | อาคารพาณิชย์ | ที่ดินเปล่า | หมู่บ้าน/หอพัก | null",
  "desired_amount": "วงเงินที่ต้องการ เป็น number หน่วยบาท เช่น 1100000 หรือ null",
  "estimated_value": "ราคาตลาด/ราคาประเมินทรัพย์ เป็น number หน่วยบาท (ถ้าบอกช่วง ให้ใช้ค่ากลาง) เช่น 5500000 หรือ null",
  "occupation": "อาชีพหรือชื่อบริษัทที่ทำงาน เช่น พนักงาน บมจ.บริวิตาเกร จำกัด หรือ null",
  "monthly_income": "รายได้ต่อเดือน เป็น number หน่วยบาท เช่น 22000 หรือ null",
  "contract_years": "ระยะเวลาสัญญาที่ต้องการ เป็น number หน่วยปี (ครึ่งปี = 0.5, 18 เดือน = 1.5) หรือ null",
  "location_hint": "จังหวัดหรือที่ตั้งทรัพย์ เช่น กรุงเทพมหานคร | เชียงใหม่ หรือ null",
  "has_obligation": "yes ถ้ามีภาระหนี้เดิม | no ถ้าไม่มี | null ถ้าไม่รู้",
  "obligation_amount": "ยอดหนี้เดิมที่ค้างอยู่ เป็น number หน่วยบาท หรือ null",
  "deed_type": "chanote ถ้าโฉนด/น.ส.4 | ns4k ถ้าน.ส.4ก | ns3k ถ้าน.ส.3ก | ns3 ถ้าน.ส.3 | spk ถ้าส.ป.ก. | null",
  "property_project": "ชื่อโครงการ/หมู่บ้าน เช่น ชวนชื่น วิจรรณ หรือ null",
  "bedrooms": "จำนวนห้องนอน เป็น number หรือ null",
  "is_agent": true เฉพาะถ้าผู้ส่งบอกชัดว่าตัวเองเป็นนายหน้า ไม่ใช่เจ้าของทรัพย์ มิฉะนั้น false,
  "ineligible_property": true เฉพาะถ้าทรัพย์เป็น ที่สวน/ที่ไร่/ที่นา/ที่เกษตร/ส.ป.ก./น.ส.3/ที่ตาบอด มิฉะนั้น false
}

== ข้อควรระวัง ==
- "5 - 6.5 ครับ" หมายถึงราคาทรัพย์ 5-6.5 ล้าน → estimated_value = 5750000 (ค่ากลาง)
- "ต้องการ 1,100,000" → desired_amount = 1100000
- "ครึ่งปี" → contract_years = 0.5
- "1 ปีครับ", "สองปี" → contract_years = 1 หรือ 2
- "เงินเดือน 22,000" → monthly_income = 22000
- ชื่อลูกค้ามักอยู่บรรทัดแรกของข้อความที่ลูกค้าส่งมา
- ถ้าลูกค้าส่งมาในรูปแบบ numbered list ให้อ่านทุกข้อ
- ห้ามเอาชื่อเซลล์มาใส่ใน customer_name`;

  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
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
          console.log('[TextExtract-Gemini] API error:', parsed.error.message);
          return callback(null, null);
        }

        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) return callback(null, null);

        let result;
        try {
          const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          result = JSON.parse(cleaned);
        } catch (e) {
          console.log('[TextExtract-Gemini] JSON parse error:', e.message);
          return callback(null, null);
        }

        // ทำความสะอาดค่า null / empty
        Object.keys(result).forEach(k => {
          if (result[k] === null || result[k] === '' || result[k] === 'null' || result[k] === undefined) {
            delete result[k];
          }
        });

        // Validate phone (10 digits starting with 0 or +66)
        if (result.customer_phone) {
          const phone = String(result.customer_phone).replace(/[-.\s]/g, '');
          if (/^(\+?66|0)\d{8,9}$/.test(phone)) {
            result.customer_phone = phone.startsWith('+66') ? '0' + phone.slice(3) : phone;
          } else {
            delete result.customer_phone;
          }
        }

        // Validate numbers
        ['desired_amount', 'estimated_value', 'monthly_income', 'obligation_amount', 'contract_years', 'bedrooms'].forEach(k => {
          if (result[k] !== undefined) {
            const num = parseFloat(String(result[k]).replace(/,/g, ''));
            if (isNaN(num) || num <= 0) delete result[k];
            else result[k] = num;
          }
        });

        console.log('[TextExtract-Gemini] Extracted:', JSON.stringify(result));
        callback(null, result);

      } catch (e) {
        console.log('[TextExtract-Gemini] Error:', e.message);
        callback(null, null);
      }
    });
  });

  req.on('error', (e) => {
    console.log('[TextExtract-Gemini] Request error:', e.message);
    callback(null, null);
  });
  req.write(body);
  req.end();
}

module.exports = { extractCustomerInfoWithGemini };

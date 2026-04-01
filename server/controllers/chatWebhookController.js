const db = require('../config/db');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { scanDeedImage, downloadAndScanDeed } = require('../utils/ocrDeed');
const { scanDocumentWithGemini, downloadAndScanDocument, buildDocNote } = require('../utils/ocrDocument');
const { extractCustomerInfoWithGemini } = require('../utils/textExtract');
const { notifyStatusChange } = require('./notificationController');

// ============================================================
// ★ AUTO-CLASSIFY IMAGE → loan_requests field (keyword-based)
// ============================================================

/**
 * KEYWORD_FIELD_MAP — จับคู่ keyword กับ column ใน loan_requests
 * เรียงจาก specific สุด → general สุด (first match wins)
 */
const KEYWORD_FIELD_MAP = [
  // โฉนด / สิทธิ์ที่ดิน — specific ก่อน
  { rx: /สำเนาโฉนด/i,                                       field: 'deed_copy' },
  { rx: /โฉนด|ที่ดิน|น\.ส\.?3|น\.ส\.?4|นส\.?3|นส\.?4|ส\.ค\.?1|เอกสารสิทธิ์|chanote/i, field: 'deed_images' },
  // บัตรประชาชน / ทะเบียนบ้าน ผู้กู้
  { rx: /บัตรประชาชน|บัตร\s*ปชช|บัตรประจำตัว|id\s*card/i,  field: 'borrower_id_card' },
  { rx: /ทะเบียนบ้านทรัพย์|ทะเบียนบ้านที่ดิน/i,             field: 'house_reg_prop' },
  { rx: /ทะเบียนบ้าน|ท\.?ร\.?14/i,                          field: 'house_reg_book' },
  // เอกสารสถานะสมรส
  { rx: /ใบสมรส|ทะเบียนสมรส/i,                              field: 'marriage_cert' },
  { rx: /บัตรประชาชนคู่สมรส|บัตรคู่สมรส|สามีภรรยา/i,        field: 'spouse_id_card' },
  { rx: /ทะเบียนบ้านคู่สมรส/i,                               field: 'spouse_reg_copy' },
  { rx: /ใบหย่า|ทะเบียนหย่า/i,                               field: 'divorce_doc' },
  { rx: /ใบมรณ|มรณบัตร/i,                                   field: 'death_cert' },
  { rx: /ใบรับรองโสด|รับรองโสด/i,                            field: 'single_cert' },
  { rx: /เปลี่ยนชื่อ|เปลี่ยนนามสกุล/i,                      field: 'name_change_doc' },
  // เอกสารทรัพย์
  { rx: /ใบอนุญาตก่อสร้าง|ใบอนุญาต\s*ก่อสร้าง/i,           field: 'building_permit' },
  { rx: /ใบปลอดหนี้/i,                                       field: 'debt_free_cert' },
  { rx: /สัญญาซื้อขาย/i,                                     field: 'sale_contract' },
  { rx: /แบบแปลน|blueprint/i,                                field: 'blueprint' },
  { rx: /สัญญาเช่า/i,                                        field: 'rental_contract' },
  { rx: /ภาษีที่ดิน|ใบเสร็จ\s*ภาษี/i,                       field: 'land_tax_receipt' },
  { rx: /ทะเบียนพาณิชย์/i,                                   field: 'business_reg' },
  { rx: /ค่าส่วนกลาง/i,                                      field: 'common_fee_receipt' },
  { rx: /ผัง\s*ห้อง|floor\s*plan/i,                         field: 'floor_plan' },
  { rx: /สเก็ตแผนที่|แผนที่ตั้ง/i,                           field: 'location_sketch_map' },
  { rx: /ใบรับรองการใช้ที่ดิน/i,                             field: 'land_use_cert' },
  { rx: /โฉนดคอนโด/i,                                        field: 'condo_title_deed' },
  // สลิปค่าประเมิน (ส่งให้ existing payment_slip flow จัดการ)
  { rx: /ค่าประเมิน|ค่าสำรวจ|ค่าตีราคา|สลิปประเมิน/i,       field: '_payment_slip' },
  { rx: /สลิป|โอนเงิน|หลักฐาน\s*โอน/i,                      field: '_payment_slip' },
];

/**
 * OCR doc_type → field (fallback เมื่อไม่มี keyword)
 */
const DOC_TYPE_FIELD_MAP = {
  id_card:   'borrower_id_card',
  house_reg: 'house_reg_book',
};

/**
 * autoSaveImageToField — append image path เข้า loan_requests field
 */
function autoSaveImageToField(conv, imagePath, targetField, io) {
  if (!conv || !conv.loan_request_id || !imagePath || !targetField) return;
  if (targetField.startsWith('_')) return; // special marker — let other flow handle

  const p = imagePath.replace(/\\/g, '/').replace(/^\//, '');

  const isSingle = (targetField === 'appraisal_book_image');
  const sql = isSingle
    ? `UPDATE loan_requests SET ${targetField} = ? WHERE id = ?`
    : `UPDATE loan_requests SET ${targetField} = JSON_ARRAY_APPEND(
         COALESCE(NULLIF(${targetField},'null'), NULLIF(${targetField},''), '[]'), '$', ?
       ) WHERE id = ?`;

  db.query(sql, [p, conv.loan_request_id], (err) => {
    if (err) return console.log(`[AutoSave] ${targetField} error:`, err.message);
    console.log(`[AutoSave] ✅ ${targetField} ← ${p.split('/').pop()}`);
    if (io) {
      io.to('admin_room').emit('image_auto_saved', {
        conversation_id: conv.id,
        loan_request_id: conv.loan_request_id,
        field: targetField,
        path: p,
        message: `📎 บันทึกรูปอัตโนมัติ → ${targetField}`
      });
    }
  });
}

/**
 * classifyAndSaveImage — ดูข้อความล่าสุดใน conversation (5 นาที)
 * หา keyword แล้ว save รูปเข้าช่องที่ถูกต้อง
 */
function classifyAndSaveImage(conv, imagePath, io) {
  if (!conv || !imagePath) return;

  const since = new Date(Date.now() - 5 * 60 * 1000); // 5 min window
  db.query(
    `SELECT message_text FROM chat_messages
     WHERE conversation_id = ? AND message_type = 'text' AND created_at >= ?
     ORDER BY id DESC LIMIT 10`,
    [conv.id, since],
    (err, rows) => {
      if (err || !rows || rows.length === 0) return;

      const txt = rows.map(r => r.message_text || '').join(' ');

      for (const rule of KEYWORD_FIELD_MAP) {
        if (rule.rx.test(txt)) {
          console.log(`[Keyword] matched "${rule.rx}" → ${rule.field} | conv #${conv.id}`);
          autoSaveImageToField(conv, imagePath, rule.field, io);
          return;
        }
      }
      // ไม่มี keyword match → รูปจะอยู่ใน "ยังไม่ได้เซฟ" ตามเดิม
    }
  );
}

// ============================================================
// AUTO-TAG HELPERS
// ============================================================

/**
 * autoSetTag — ตั้ง tag อัตโนมัติให้ conversation (จะ set เฉพาะถ้า tag_id ยังว่างอยู่)
 * @param {number} conversationId
 * @param {string} tagName  — ชื่อ tag ใน chat_tags
 */
function autoSetTag(conversationId, tagName) {
  if (!conversationId || !tagName) return;
  db.query('SELECT id FROM chat_tags WHERE name = ? LIMIT 1', [tagName], (err, rows) => {
    if (err || !rows || rows.length === 0) return;
    const tagId = rows[0].id;
    db.query(
      'UPDATE chat_conversations SET tag_id = ? WHERE id = ? AND tag_id IS NULL',
      [tagId, conversationId],
      (err2) => {
        if (!err2) console.log(`[AUTO-TAG] conv #${conversationId} → "${tagName}" (id=${tagId})`);
      }
    );
  });
}

/**
 * autoSetTagFromExtracted — เลือก tag จากข้อมูล keyword ที่ extract ได้
 * Priority: ineligible_property → loan_type_detail (selling_pledge/refinance/mortgage) → deed_type eligible
 */
function autoSetTagFromExtracted(conversationId, extracted) {
  if (!extracted || Object.keys(extracted).length === 0) return;
  let tagName = null;
  if (extracted.ineligible_property) {
    tagName = 'ทรัพย์ไม่ผ่านเกณฑ์';
  } else if (extracted.loan_type_detail === 'selling_pledge') {
    tagName = 'ขายฝาก';
  } else if (extracted.is_refinance) {
    tagName = 'รีไฟแนนซ์';
  } else if (extracted.loan_type_detail === 'mortgage') {
    tagName = 'จำนอง';
  } else if (extracted.deed_type === 'chanote' || extracted.deed_type === 'ns4k') {
    tagName = 'ทรัพย์เข้าเกณฑ์';
  }
  if (tagName) autoSetTag(conversationId, tagName);
}

// ============================================================
// OCR DEED HELPERS
// ============================================================

/**
 * แปลงข้อความประเภทโฉนดจาก Gemini → code ที่ใช้ในฐานข้อมูล
 * Gemini อาจตอบ: "โฉนดที่ดิน", "น.ส.4จ", "น.ส.3ก", "ส.ป.ก." ฯลฯ
 */
function mapDeedType(textFromGemini) {
  if (!textFromGemini) return null;
  const t = textFromGemini.toLowerCase().replace(/\s/g, '');
  if (t.includes('น.ส.4ก') || t.includes('นส.4ก') || t.includes('ns4k')) return 'ns4k';
  if (t.includes('น.ส.4') || t.includes('นส.4')  || t.includes('ns4')
    || t.includes('โฉนด') || t.includes('chanote'))                       return 'chanote';
  if (t.includes('น.ส.3ก') || t.includes('นส.3ก') || t.includes('ns3k')) return 'ns3k';
  if (t.includes('น.ส.3') || t.includes('นส.3')  || t.includes('ns3'))   return 'ns3';
  if (t.includes('ส.ป.ก') || t.includes('สปก')   || t.includes('spk'))   return 'spk';
  return null; // ไม่รู้จัก → ไม่อัพเดท
}

/**
 * อัพเดทข้อมูลโฉนดลงใน loan_requests + chat_conversations
 * แล้ว emit deed_ocr_result (พร้อม updated_fields) กลับ admin
 * ใช้ COALESCE เพื่อไม่ทับข้อมูลที่มีอยู่แล้ว
 */
/**
 * @param {string|null} imageLocalUrl  — local path ของรูปโฉนด เช่น "uploads/chat/xxx.jpg"
 *                                       (ใส่ null ถ้าไม่มี ฟังก์ชันจะยังทำงานปกติ)
 */
function applyDeedDataToLoanRequest(conv, deedData, io, platform, imageLocalUrl, callback) {
  // รองรับ signature เดิม (5 args: conv, deedData, io, platform, callback)
  if (typeof imageLocalUrl === 'function') { callback = imageLocalUrl; imageLocalUrl = null; }

  const label = platform === 'facebook' ? 'Facebook' : 'LINE';
  // normalize path: ตัด leading slash ให้ตรงกับ format ใน deed_images
  const deedImgPath = imageLocalUrl ? imageLocalUrl.replace(/^\//, '') : null;

  // --- คำนวณ deedTypeCode ก่อน (ใช้ทั้งกรณีมี/ไม่มี loan_request_id) ---
  const deedTypeCode = mapDeedType(deedData.deed_type);

  // --- อัพเดท chat_conversations ---
  const convUpdates = [];
  const convParams  = [];
  if (deedData.province) {
    convUpdates.push('location_hint = COALESCE(location_hint, ?)');
    convParams.push(deedData.province);
  }
  if (deedTypeCode) {
    convUpdates.push('deed_type = COALESCE(deed_type, ?)');
    convParams.push(deedTypeCode);
  }
  if (convUpdates.length > 0) {
    convParams.push(conv.id);
    db.query(`UPDATE chat_conversations SET ${convUpdates.join(', ')} WHERE id = ?`, convParams, () => {});
  }

  // --- อัพเดท loan_requests ถ้ามีอยู่แล้ว ---
  if (!conv.loan_request_id) {
    // ยังไม่มี loan_request → emit โดยไม่มี loan_request_id
    if (io && deedData.admin_note) {
      io.to('admin_room').emit('deed_ocr_result', {
        conversation_id: conv.id,
        loan_request_id: null,
        deed_data: deedData,
        updated_fields: {},
        message: `🔍 OCR สแกนโฉนด (${label}): ${deedData.admin_note}`
      });
    }

    // ✅ ถ้ามีชื่อลูกค้า (LINE/FB display name) → ลองสร้าง loan_request อัตโนมัติ
    // ไม่ต้องรอเบอร์โทร เพราะโฉนดก็เป็น signal ว่าลูกค้าต้องการขอสินเชื่อ
    if (conv.customer_name) {
      const deedExtraData = {};
      if (deedTypeCode)          deedExtraData.deed_type    = deedTypeCode;
      if (deedData.province)     deedExtraData.location_hint = deedData.province;
      if (deedData.deed_number)  deedExtraData.deed_number  = deedData.deed_number;
      if (deedData.amphoe)       deedExtraData.district     = deedData.amphoe;
      if (deedData.tambon)       deedExtraData.subdistrict  = deedData.tambon;
      if (deedData.land_area)    deedExtraData.land_area    = deedData.land_area;
      if (deedImgPath)           deedExtraData.deed_image_url = deedImgPath; // ✅ ส่งรูปไปด้วย
      autoCreateLoanRequest(conv.id, io, false, deedExtraData);
    } else {
      console.log(`[OCR] conversation #${conv.id} ยังไม่มี loan_request — บันทึกเฉพาะ conversation`);
    }

    if (callback) callback();
    return;
  }

  // สร้าง SET clause อัพเดทเฉพาะฟิลด์ที่ OCR อ่านได้
  const lrUpdates = [];
  const lrParams  = [];
  const updatedFields = {}; // track ว่าอัพเดทฟิลด์อะไรบ้าง (ส่งกลับ frontend)

  const trySet = (col, val) => {
    if (!val) return;
    lrUpdates.push(`${col} = COALESCE(${col}, ?)`);
    lrParams.push(val);
    updatedFields[col] = val;
  };

  trySet('province',    deedData.province);
  trySet('district',    deedData.amphoe);       // อำเภอ
  trySet('subdistrict', deedData.tambon);       // ตำบล
  trySet('deed_number', deedData.deed_number);
  trySet('land_area',   deedData.land_area);

  // deed_type (คำนวณแล้วจากด้านบน ใช้ค่า deedTypeCode ที่มีอยู่แล้ว)
  if (deedTypeCode) {
    lrUpdates.push('deed_type = COALESCE(deed_type, ?)');
    lrParams.push(deedTypeCode);
    updatedFields.deed_type = deedTypeCode;
  }

  // ✅ เพิ่มรูปโฉนดเข้า deed_images JSON array (ไม่ทับรูปเก่า)
  if (deedImgPath) {
    lrUpdates.push("deed_images = JSON_ARRAY_APPEND(COALESCE(deed_images, '[]'), '$', ?)");
    lrParams.push(deedImgPath);
    updatedFields.deed_images_added = deedImgPath;
  }

  // เพิ่ม admin_note เป็น append (ไม่ใช้ COALESCE เพราะต้อง concat)
  if (deedData.admin_note) {
    lrUpdates.push("admin_note = CONCAT(COALESCE(admin_note,''), ?)");
    lrParams.push('\n' + deedData.admin_note);
  }

  if (lrUpdates.length === 0) {
    if (callback) callback();
    return;
  }

  lrParams.push(conv.loan_request_id);
  db.query(
    `UPDATE loan_requests SET ${lrUpdates.join(', ')} WHERE id = ?`,
    lrParams,
    (err) => {
      if (err) console.log('[OCR] loan_request update error:', err.message);
      else console.log(`[OCR] อัพเดท loan_request #${conv.loan_request_id} สำเร็จ:`, JSON.stringify(updatedFields));

      // emit กลับ admin พร้อม updated_fields เพื่อ frontend อัพเดท UI ได้ทันที
      if (io && deedData.admin_note) {
        io.to('admin_room').emit('deed_ocr_result', {
          conversation_id: conv.id,
          loan_request_id: conv.loan_request_id,
          deed_data: deedData,
          updated_fields: updatedFields,
          message: `🔍 OCR สแกนโฉนด (${label}): ${deedData.admin_note}`
        });
      }
      // 🏷️ Auto-tag: ลูกค้าส่งโฉนดมาแล้ว (deed image scanned)
      autoSetTag(conv.id, 'ส่งโฉนดแล้ว');
      if (callback) callback();
    }
  );
}

// ============================================================
// autoCreateCaseFromAppraisalSlip — สร้าง Case ID อัตโนมัติจากสลิปค่าประเมิน
// ทริกเกอร์เมื่อ OCR ตรวจพบ payment_slip ที่มียอด ~2,900 บาท
// ============================================================
const APPRAISAL_FEE_AMOUNT = 2900;
const APPRAISAL_FEE_TOLERANCE = 200; // ±200 บาท (กรณีโอนเพิ่ม/ขาด)

function autoCreateCaseFromAppraisalSlip(conv, docData, slipImagePath, io) {
  if (!conv || !conv.loan_request_id) {
    console.log('[AutoCase] ไม่มี loan_request_id — ข้ามการสร้าง case');
    return;
  }

  const amount = parseFloat(docData.transfer_amount) || 0;
  const isAppraisalFee = Math.abs(amount - APPRAISAL_FEE_AMOUNT) <= APPRAISAL_FEE_TOLERANCE;

  if (!isAppraisalFee) {
    console.log(`[AutoCase] ยอดโอน ${amount} ≠ ค่าประเมิน ${APPRAISAL_FEE_AMOUNT} — ข้าม`);
    return;
  }

  // ตรวจว่ามี case อยู่แล้วหรือยัง
  db.query(
    'SELECT id, case_code FROM cases WHERE loan_request_id = ?',
    [conv.loan_request_id],
    (err, existing) => {
      if (err) return console.log('[AutoCase] DB error:', err.message);
      if (existing.length > 0) {
        console.log(`[AutoCase] case มีอยู่แล้ว (${existing[0].case_code}) — ข้าม`);
        // แค่อัพเดท slip_image ถ้ายังไม่มี
        if (slipImagePath) {
          db.query(
            'UPDATE cases SET slip_image = COALESCE(slip_image, ?), payment_status = "paid", payment_date = COALESCE(payment_date, NOW()) WHERE loan_request_id = ?',
            [slipImagePath, conv.loan_request_id],
            () => {}
          );
        }
        if (io) {
          io.to('admin_room').emit('appraisal_slip_received', {
            conversation_id: conv.id,
            loan_request_id: conv.loan_request_id,
            case_code: existing[0].case_code,
            amount,
            message: `💳 รับสลิปค่าประเมิน ฿${amount.toLocaleString()} — เคสมีอยู่แล้ว (${existing[0].case_code})`
          });
        }
        return;
      }

      // สร้าง case ใหม่
      generateSequentialCode('cases', 'case_code', 'CS', 4, (errCode, case_code) => {
        if (errCode) return console.log('[AutoCase] generateCode error:', errCode.message);

        // ดึงข้อมูล loan_request เพื่อเอา agent_id, assigned_sales_id
        db.query(
          'SELECT assigned_sales_id, agent_id FROM loan_requests WHERE id = ?',
          [conv.loan_request_id],
          (errLr, lrRows) => {
            const lr = lrRows && lrRows[0] ? lrRows[0] : {};

            const slipPath = slipImagePath || null;
            const now = new Date();
            const sql = `
              INSERT INTO cases
                (case_code, loan_request_id, assigned_sales_id, agent_id,
                 appraisal_fee, payment_status, payment_date,
                 slip_image, note, recorded_at)
              VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)
            `;
            db.query(
              sql,
              [
                case_code,
                conv.loan_request_id,
                lr.assigned_sales_id || null,
                lr.agent_id || null,
                amount,
                docData.transfer_date || now,
                slipPath,
                `[Auto] สร้างจากสลิปค่าประเมิน ${amount} บาท โอนวันที่ ${docData.transfer_date || '-'} จาก ${docData.sender_name || 'ไม่ทราบชื่อ'} Ref: ${docData.reference_no || '-'}`,
                now
              ],
              (errInsert, result) => {
                if (errInsert) {
                  console.log('[AutoCase] INSERT cases error:', errInsert.message);
                  return;
                }
                console.log(`[AutoCase] ✅ สร้าง Case ${case_code} จากสลิปค่าประเมิน ฿${amount}`);

                // แจ้ง admin ผ่าน socket
                if (io) {
                  io.to('admin_room').emit('appraisal_slip_received', {
                    conversation_id: conv.id,
                    loan_request_id: conv.loan_request_id,
                    case_id: result.insertId,
                    case_code,
                    amount,
                    transfer_date: docData.transfer_date,
                    sender_name: docData.sender_name,
                    message: `🎉 สร้างเคสใหม่ ${case_code} จากสลิปค่าประเมิน ฿${amount.toLocaleString('th-TH')}`
                  });
                }
              }
            );
          }
        );
      });
    }
  );
}

// ============================================================
// applyDocumentDataToLoanRequest — อัพเดทข้อมูลลูกหนี้จากเอกสารทั่วไป
// (บัตรประชาชน, ทะเบียนบ้าน, สลิปเงินเดือน, statement ฯลฯ)
// ============================================================
function applyDocumentDataToLoanRequest(conv, docData, io, label, slipImagePath) {
  if (!conv || !docData || !conv.loan_request_id) {
    // ถ้าเป็นสลิปโอนเงิน ยังต้องพยายามสร้าง case แม้ไม่มี loan_request_id (ถ้ามีในอนาคต)
    if (docData && docData.doc_type === 'payment_slip') {
      autoCreateCaseFromAppraisalSlip(conv, docData, slipImagePath, io);
    }
    return;
  }

  const lrUpdates = [];
  const lrParams  = [];
  const updatedFields = {};

  const trySet = (col, val) => {
    if (!val) return;
    lrUpdates.push(`${col} = COALESCE(${col}, ?)`);
    lrParams.push(val);
    updatedFields[col] = val;
  };

  // ข้อมูลลูกหนี้
  trySet('contact_name',   docData.full_name);
  trySet('occupation',     docData.occupation);
  trySet('monthly_income', docData.monthly_income);
  // ที่อยู่
  trySet('province',       docData.province);
  trySet('district',       docData.amphoe);
  trySet('subdistrict',    docData.tambon);
  // ข้อมูลโฉนด (ถ้า doc_type === 'deed')
  trySet('deed_number',    docData.deed_number);
  trySet('land_area',      docData.land_area);

  const deedTypeCode = mapDeedType(docData.deed_type);
  if (deedTypeCode) {
    lrUpdates.push('deed_type = COALESCE(deed_type, ?)');
    lrParams.push(deedTypeCode);
    updatedFields.deed_type = deedTypeCode;
  }

  // append admin_note
  const note = buildDocNote(docData);
  if (note) {
    lrUpdates.push("admin_note = CONCAT(COALESCE(admin_note,''), ?)");
    lrParams.push('\n' + note);
  }

  if (lrUpdates.length === 0) return;

  lrParams.push(conv.loan_request_id);
  db.query(
    `UPDATE loan_requests SET ${lrUpdates.join(', ')} WHERE id = ?`,
    lrParams,
    (err) => {
      if (err) console.log('[OCR-Doc] loan_request update error:', err.message);
      else console.log(`[OCR-Doc] อัพเดท loan_request #${conv.loan_request_id}:`, JSON.stringify(updatedFields));

      if (io) {
        io.to('admin_room').emit('document_ocr_result', {
          conversation_id:  conv.id,
          loan_request_id:  conv.loan_request_id,
          doc_type:         docData.doc_type,
          doc_data:         docData,
          updated_fields:   updatedFields,
          message:          `🔍 OCR สแกนเอกสาร (${label}): ${note || docData.doc_type}`
        });
      }

      // ★ ถ้าเป็นสลิปโอนเงิน → ตรวจยอดและสร้าง case อัตโนมัติ
      if (docData.doc_type === 'payment_slip') {
        autoCreateCaseFromAppraisalSlip(conv, docData, slipImagePath, io);
      }

      // ★ Auto-save image path เข้า field ตาม doc_type (OCR fallback — ถ้า keyword ไม่ match)
      if (slipImagePath && DOC_TYPE_FIELD_MAP[docData.doc_type]) {
        autoSaveImageToField(conv, slipImagePath, DOC_TYPE_FIELD_MAP[docData.doc_type], io);
      }
    }
  );
}

// ========== Helper: สร้างรหัส sequential (reuse logic จาก salesController) ==========
function generateSequentialCode(table, column, prefix, digits, callback) {
  const sql = `SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`;
  db.query(sql, [prefix + '%'], (err, rows) => {
    if (err) return callback(err, null);
    let nextNum = 1;
    if (rows.length > 0 && rows[0][column]) {
      const current = rows[0][column].replace(prefix, '');
      const num = parseInt(current, 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const code = prefix + String(nextNum).padStart(digits, '0');
    callback(null, code);
  });
}

// ============================================
// Helper: Auto-create loan_request จากข้อมูลแชท
// เมื่อมี customer_name + customer_phone ครบ → สร้างลูกหนี้อัตโนมัติ
// ============================================
// requirePhone: true = ต้องมีเบอร์ถึงจะสร้าง (default), false = มีแค่ชื่อก็สร้างได้ (trigger จากโฉนด)
// extraData: ข้อมูลจาก OCR โฉนดที่จะ merge เข้า conv ก่อน INSERT (deed_number, district, subdistrict, land_area ฯลฯ)
function autoCreateLoanRequest(conversationId, io, requirePhone, extraData) {
  if (requirePhone === undefined) requirePhone = true;
  if (!extraData) extraData = {};

  // 1) ดึงข้อมูล conversation
  db.query('SELECT * FROM chat_conversations WHERE id = ?', [conversationId], (err, rows) => {
    if (err || rows.length === 0) return;
    const conv = rows[0];

    // 2) ตรวจเงื่อนไข
    if (conv.loan_request_id) return; // สร้างแล้ว
    // ★ ถ้าไม่มีชื่อ ใช้ placeholder จาก platform (ชื่อจะอัพเดททีหลังเมื่อ OCR/Profile มา)
    if (!conv.customer_name) {
      const platformLabel = conv.platform === 'line' ? 'LINE' : conv.platform === 'facebook' ? 'Facebook' : 'แชท';
      conv.customer_name = `${platformLabel} #${conv.platform_conversation_id?.slice(-6) || conv.id}`;
    }
    if (requirePhone && !conv.customer_phone) return; // ถ้า requirePhone = true ต้องมีเบอร์ด้วย

    // merge extraData เข้า conv (จาก deed OCR หรือแหล่งอื่น)
    // ค่าจาก conv จะถูก override ด้วย extraData เฉพาะเมื่อ conv มีค่า null/undefined
    const merged = Object.assign({}, conv);
    Object.keys(extraData).forEach(k => {
      if (!merged[k] && extraData[k]) merged[k] = extraData[k];
    });

    // 3) ตรวจ duplicate — เช็คเบอร์โทรซ้ำใน loan_requests (เฉพาะกรณีที่มีเบอร์)
    const dupCheckOrSkip = (next) => {
      if (!merged.customer_phone) return next(null, []); // ไม่มีเบอร์ → ข้ามการตรวจ duplicate
      db.query('SELECT id, debtor_code FROM loan_requests WHERE contact_phone = ? LIMIT 1', [merged.customer_phone], next);
    };

    dupCheckOrSkip((errDup, dupRows) => {
      if (errDup) return console.log('autoCreateLoanRequest duplicate check error:', errDup.message);

      if (dupRows && dupRows.length > 0) {
        // มีลูกหนี้อยู่แล้ว → เชื่อม loan_request_id โดยไม่สร้างใหม่
        const existingLrId = dupRows[0].id;
        const debtorCode = dupRows[0].debtor_code;

        // ค้นหาเซลล์เดิมที่ดูแลลูกค้ารายนี้อยู่ (จาก cases ที่มี loan_request_id ตรงกัน)
        db.query(
          `SELECT c.assigned_sales_id, u.name AS sales_name
           FROM cases c
           LEFT JOIN users u ON u.id = c.assigned_sales_id
           WHERE c.loan_request_id = ? AND c.assigned_sales_id IS NOT NULL
           ORDER BY c.created_at DESC LIMIT 1`,
          [existingLrId],
          (errCase, caseRows) => {
            const originalSalesId = caseRows && caseRows.length > 0 ? caseRows[0].assigned_sales_id : null;
            const originalSalesName = caseRows && caseRows.length > 0 ? caseRows[0].sales_name : null;

            // อัพเดท conversation: เชื่อม loan_request_id + re-assign ไปหาเซลล์เดิม
            const updateFields = originalSalesId
              ? 'loan_request_id = ?, assigned_to = ?'
              : 'loan_request_id = ?';
            const updateParams = originalSalesId
              ? [existingLrId, originalSalesId, conversationId]
              : [existingLrId, conversationId];

            db.query(
              `UPDATE chat_conversations SET ${updateFields} WHERE id = ?`,
              updateParams,
              () => {
                console.log(`🔗 Linked conv #${conversationId} → existing loan_request #${existingLrId} (${debtorCode})${originalSalesId ? ` | Re-assigned to sales #${originalSalesId} (${originalSalesName})` : ''}`);

                if (io) {
                  // แจ้ง admin_room ว่ามีการเชื่อมลูกค้า
                  io.to('admin_room').emit('loan_request_linked', {
                    conversation_id: conversationId,
                    loan_request_id: existingLrId,
                    debtor_code: debtorCode,
                    reassigned_to: originalSalesId,
                    message: `ลูกค้าจากแชทเชื่อมกับลูกหนี้ ${debtorCode} ที่มีอยู่แล้ว${originalSalesName ? ` (โอนให้ ${originalSalesName})` : ''}`
                  });

                  // แจ้งเซลล์เดิมโดยตรง ว่าลูกค้าของตัวเองกลับมาจาก platform ใหม่
                  if (originalSalesId) {
                    // ดึง platform ของ conversation ใหม่นี้
                    db.query('SELECT platform, customer_name FROM chat_conversations WHERE id = ?', [conversationId], (errConv, convRows) => {
                      const newPlatform = convRows && convRows.length > 0 ? convRows[0].platform : 'แชท';
                      const customerName = convRows && convRows.length > 0 ? convRows[0].customer_name : 'ลูกค้า';
                      const platformLabel = newPlatform === 'line' ? 'LINE' : newPlatform === 'facebook' ? 'Facebook' : newPlatform;

                      io.to('user_' + originalSalesId).emit('customer_returned', {
                        conversation_id: conversationId,
                        loan_request_id: existingLrId,
                        debtor_code: debtorCode,
                        customer_name: customerName,
                        platform: newPlatform,
                        message: `🔔 ${customerName} (${debtorCode}) กลับมาติดต่อผ่าน${platformLabel} ใหม่`
                      });
                    });
                  }
                }
              }
            );
          }
        );
        return;
      }

      // 4) สร้าง debtor_code ใหม่
      generateSequentialCode('loan_requests', 'debtor_code', 'LDD', 4, (errCode, debtor_code) => {
        if (errCode) return console.log('autoCreateLoanRequest code gen error:', errCode.message);

        // 5) Map ข้อมูลจาก merged (conv + extraData) → loan_requests
        const source = merged.platform === 'line' ? 'LINE แชท' : merged.platform === 'facebook' ? 'Facebook แชท' : 'แชท';
        const preferred_contact = merged.platform || 'phone';

        // Map province — ใช้ province field ก่อน ถ้าไม่มีค่อยใช้ location_hint
        let province = merged.province || merged.location_hint || null;
        if (province === 'กทม' || province === 'กรุงเทพ') province = 'กรุงเทพมหานคร';
        if (province === 'โคราช') province = 'นครราชสีมา';
        if (province === 'อยุธยา') province = 'พระนครศรีอยุธยา';

        // Build admin_note จากข้อมูลเพิ่มเติม
        const notes = ['สร้างอัตโนมัติจากแชท ' + source];
        if (!merged.customer_phone) notes.push('(ยังไม่มีเบอร์ — trigger จากโฉนด)');
        if (merged.customer_email) notes.push('อีเมล: ' + merged.customer_email);
        if (merged.agent_name) notes.push('นายหน้า: ' + merged.agent_name + (merged.agent_phone ? ' ' + merged.agent_phone : ''));
        const admin_note = notes.join(' | ');

        // ค้นหา agent_id จากเบอร์นายหน้าที่ตรวจจับได้
        const findAgentAndInsert = (resolvedAgentId) => {
          const sql = `
            INSERT INTO loan_requests
              (debtor_code, source, contact_name, contact_phone, contact_email,
               contact_facebook, contact_line,
               preferred_contact, property_type, loan_type_detail,
               deed_type, deed_number, estimated_value, province, district, subdistrict, land_area,
               has_obligation, occupation, monthly_income,
               admin_note, agent_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
          `;
          const params = [
            debtor_code, source,
            merged.customer_line_name || merged.customer_name, merged.customer_phone || null, merged.customer_email || null,
            merged.contact_facebook || null, merged.contact_line || null,
            preferred_contact,
            merged.property_type || null, merged.loan_type_detail || null,
            merged.deed_type || null, merged.deed_number || null,
            merged.estimated_value || null, province,
            merged.district || null, merged.subdistrict || null, merged.land_area || null,
            merged.has_obligation || null, merged.occupation || null, merged.monthly_income || null,
            admin_note, resolvedAgentId || null
          ];

          db.query(sql, params, (errInsert, result) => {
            if (errInsert) {
              console.log('autoCreateLoanRequest INSERT error:', errInsert.message);
              return;
            }

            const loanRequestId = result.insertId;

            // 6) เชื่อม chat_conversations.loan_request_id
            db.query('UPDATE chat_conversations SET loan_request_id = ? WHERE id = ?', [loanRequestId, conversationId], () => {});

            // ✅ 6.1) ถ้ามีรูปโฉนดจาก OCR → บันทึกเข้า deed_images ทันที
            if (extraData.deed_image_url) {
              const deedImgPath = extraData.deed_image_url.replace(/^\//, '');
              db.query(
                "UPDATE loan_requests SET deed_images = JSON_ARRAY_APPEND(COALESCE(deed_images, '[]'), '$', ?) WHERE id = ?",
                [deedImgPath, loanRequestId],
                (errImg) => {
                  if (errImg) console.warn('[autoCreate] deed_images update error:', errImg.message);
                  else console.log(`[autoCreate] ✅ deed_images บันทึก: ${deedImgPath}`);
                }
              );
            }

            const triggerNote = requirePhone ? '' : ' (trigger จากโฉนด)';
            console.log(`✅ Auto-created loan_request #${loanRequestId} (${debtor_code}) จากแชท conv #${conversationId}${triggerNote}` + (resolvedAgentId ? ` นายหน้า #${resolvedAgentId}` : ''));

            // 7) แจ้ง socket + notification ทุกฝ่าย
            if (io) {
              io.to('admin_room').emit('loan_request_created', {
                conversation_id: conversationId,
                loan_request_id: loanRequestId,
                debtor_code: debtor_code,
                customer_name: merged.customer_name,
                source: source,
                message: `ลูกหนี้ใหม่ ${debtor_code} สร้างอัตโนมัติจาก${source}`
              });
            }

            // 8) แจ้งเตือนทุกฝ่ายผ่าน notification system
            notifyStatusChange(loanRequestId, null, null, 'new_from_chat', io, null,
              (resolvedAgentId ? '(ผ่านนายหน้า)' : ''));
          });
        };

        // ถ้ามีเบอร์นายหน้า → ค้นหาในตาราง agents ก่อน
        if (merged.agent_phone) {
          db.query('SELECT id FROM agents WHERE phone = ? LIMIT 1', [merged.agent_phone], (errA, agentRows) => {
            const agentId = (agentRows && agentRows.length > 0) ? agentRows[0].id : null;
            findAgentAndInsert(agentId);
          });
        } else {
          findAgentAndInsert(null);
        }
      });
    });
  });
}

// ============================================
// Helper: อัพเดท loan_request ด้วยข้อมูลใหม่จากแชท
// เมื่อลูกค้าส่งข้อมูลเพิ่มมา (จังหวัด, ประเภททรัพย์, วงเงิน ฯลฯ)
// จะอัพเดทเฉพาะฟิลด์ที่ยังว่างอยู่ใน loan_request (ไม่ overwrite ข้อมูลที่ฝ่ายขายแก้ไขแล้ว)
// ============================================
function updateLoanRequestFromChat(conversationId, extracted, io) {
  if (!extracted || Object.keys(extracted).length === 0) return;

  // ดึง conversation เพื่อหา loan_request_id
  db.query('SELECT loan_request_id, location_hint FROM chat_conversations WHERE id = ?', [conversationId], (err, rows) => {
    if (err || rows.length === 0 || !rows[0].loan_request_id) return;

    const loanRequestId = rows[0].loan_request_id;

    // Map extracted chat data → loan_request fields
    // ใช้ COALESCE pattern: อัพเดทเฉพาะฟิลด์ที่ยังเป็น NULL ใน loan_request
    const updates = [];
    const params = [];

    // ชื่อจริงจากข้อความ → overwrite ชื่อ LINE display name ใน loan_request ด้วย
    if (extracted.customer_name) {
      updates.push('contact_name = ?');
      params.push(extracted.customer_name);
    }
    if (extracted.property_type) {
      updates.push('property_type = COALESCE(property_type, ?)');
      params.push(extracted.property_type);
    }
    if (extracted.deed_type) {
      updates.push('deed_type = COALESCE(deed_type, ?)');
      params.push(extracted.deed_type);
    }
    if (extracted.loan_type_detail) {
      updates.push('loan_type_detail = COALESCE(loan_type_detail, ?)');
      params.push(extracted.loan_type_detail);
    }
    if (extracted.estimated_value) {
      updates.push('estimated_value = COALESCE(estimated_value, ?)');
      params.push(extracted.estimated_value);
    }
    if (extracted.has_obligation) {
      updates.push('has_obligation = COALESCE(has_obligation, ?)');
      params.push(extracted.has_obligation);
    }
    if (extracted.phone) {
      updates.push('contact_phone = COALESCE(contact_phone, ?)');
      params.push(extracted.phone);
    }
    if (extracted.email) {
      updates.push('contact_email = COALESCE(contact_email, ?)');
      params.push(extracted.email);
    }

    // ข้อมูลผู้กู้ ตาม SOP ข้อ 2.1.6
    if (extracted.occupation) {
      updates.push('occupation = COALESCE(occupation, ?)');
      params.push(extracted.occupation);
    }
    if (extracted.monthly_income) {
      updates.push('monthly_income = COALESCE(monthly_income, ?)');
      params.push(extracted.monthly_income);
    }
    if (extracted.desired_amount) {
      updates.push('desired_amount = COALESCE(desired_amount, ?)');
      params.push(extracted.desired_amount);
    }
    if (extracted.obligation_amount) {
      updates.push('obligation_amount = COALESCE(obligation_amount, ?)');
      params.push(extracted.obligation_amount);
    }
    if (extracted.contract_years) {
      updates.push('contract_years = COALESCE(contract_years, ?)');
      params.push(extracted.contract_years);
    }

    // location_hint → province (ใช้ค่าล่าสุดจาก conversation)
    const locationHint = extracted.location_hint || rows[0].location_hint;
    if (locationHint) {
      let province = locationHint;
      if (province === 'กทม' || province === 'กรุงเทพ') province = 'กรุงเทพมหานคร';
      if (province === 'โคราช') province = 'นครราชสีมา';
      if (province === 'อยุธยา') province = 'พระนครศรีอยุธยา';
      updates.push('province = COALESCE(province, ?)');
      params.push(province);
    }

    // property_project + bedrooms → append ไปที่ admin_note (เพราะ loan_requests ไม่มี column นี้)
    const extraNotes = [];
    if (extracted.property_project) extraNotes.push(`โครงการ: ${extracted.property_project}`);
    if (extracted.bedrooms) extraNotes.push(`${extracted.bedrooms} ห้องนอน`);
    if (extraNotes.length > 0) {
      updates.push("admin_note = CONCAT(COALESCE(admin_note,''), ?)");
      params.push('\n[AI] ' + extraNotes.join(' | '));
    }

    if (updates.length === 0) return; // ไม่มีอะไรให้อัพเดท

    params.push(loanRequestId);
    const sql = `UPDATE loan_requests SET ${updates.join(', ')} WHERE id = ?`;

    db.query(sql, params, (errUpdate) => {
      if (errUpdate) {
        console.log('updateLoanRequestFromChat error:', errUpdate.message);
        return;
      }
      console.log(`📝 Updated loan_request #${loanRequestId} จากแชท conv #${conversationId} (${updates.length} fields)`);

      // แจ้ง socket ว่าข้อมูลลูกหนี้อัพเดท
      if (io) {
        io.to('admin_room').emit('loan_request_updated', {
          conversation_id: conversationId,
          loan_request_id: loanRequestId,
          updated_fields: updates.length,
          message: `อัพเดทข้อมูลลูกหนี้จากแชทอัตโนมัติ (${updates.length} รายการ)`
        });
      }
    });
  });
}

// ============================================
// Helper: ดึง platform credentials จาก DB
// ============================================
function getPlatformConfig(platform, callback) {
  db.query(
    'SELECT * FROM chat_platforms WHERE platform_name = ? AND is_active = 1 LIMIT 1',
    [platform],
    (err, rows) => {
      if (err || rows.length === 0) return callback(err || new Error('Platform not configured'));
      callback(null, rows[0]);
    }
  );
}

// ============================================
// Helper: Parse ข้อมูลลูกค้าจากข้อความ
// รวม SOP keyword detection ตาม SOP ฝ่ายขาย LOANDD (ฉบับสมบูรณ์)
// ============================================
function extractCustomerInfo(text) {
  if (!text) return {};
  // ข้ามข้อความ system เช่น [รูปภาพ] [วิดีโอ] [สติกเกอร์]
  if (/^\[.+\]$/.test(text.trim())) return {};
  const info = {};

  // --- เบอร์โทรไทย ---
  const phoneMatch = text.match(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (phoneMatch) info.phone = phoneMatch[0].replace(/[-.\s]/g, '');

  // --- อีเมล ---
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) info.email = emailMatch[0];

  // ============================================================
  // ประเภทอสังหาริมทรัพย์ (SOP หมวด 1: ทรัพย์ที่รับพิจารณา)
  // รับ: บ้านเดี่ยว, ทาวน์เฮ้าส์/ทาวน์โฮม, คอนโด, อาคารพาณิชย์, ที่ดินเปล่า
  // ไม่รับ: ที่สวน/ไร่/นา, ที่ตาบอด, เกษตรกรรม, พื้นที่น้ำ/บ่อ
  // ============================================================
  const lowerText = text.toLowerCase();

  // ทรัพย์ที่ "ไม่รับ" ตาม SOP → flag ineligible_property เพื่อแจ้งเตือนเซลล์
  if (/ที่สวน|สวน(?:ยาง|ปาล์ม|มะพร้าว|ไม้ยืนต้น)|ที่ไร่|ไร่(?:อ้อย|ข้าวโพด|มันสำปะหลัง)|ที่นา|นาข้าว|ที่เกษตร|เกษตรกรรม|ที่ดินเกษตร|พื้นที่การเกษตร|บ่อปลา|บ่อกุ้ง|บ่อน้ำ|ที่ดินในเขตชลประทาน|ที่ตาบอด|ที่ดินตาบอด|ออกถนนไม่ได้|ไม่มีถนนเข้า/.test(text)) {
    info.ineligible_property = true;
    info.ineligible_reason = 'ทรัพย์ไม่ผ่านเกณฑ์ SOP (ที่เกษตร/ตาบอด/บ่อ)';
  }

  if (/บ้านเดี่ยว|บ้านเดียว|house|single\s*house|detached/.test(text)) {
    info.property_type = 'บ้านเดี่ยว';
  } else if (/ทาวน์เฮ้าส์|ทาวน์เฮาส์|ทาวน์โฮม|townhouse|town\s*home|ทาวน์/.test(lowerText)) {
    info.property_type = 'ทาวน์เฮ้าส์';
  } else if (/บ้านแฝด|semi.?detached|twin\s*house/.test(lowerText)) {
    info.property_type = 'บ้านแฝด';
  } else if (/คอนโด|ห้องชุด|condo|condominium/.test(lowerText)) {
    info.property_type = 'คอนโด';
  } else if (/อาคารพาณิชย์|ตึกแถว|shophouse|อาคารสำนักงาน|ออฟฟิศ|อาคารชุด/.test(text)) {
    info.property_type = 'อาคารพาณิชย์';
  } else if (/ที่ดินเปล่า|ที่ดิน(?!เกษตร|ใน)|land(?!\s*farm)/.test(text)) {
    info.property_type = 'ที่ดินเปล่า';
  } else if (/บ้านพัก|วิลล่า|villa|resort/.test(lowerText)) {
    info.property_type = 'บ้านเดี่ยว'; // จัดเป็นบ้านเดี่ยว
  } else if (/หมู่บ้าน|หอพัก|อพาร์ทเม้นท์|อพาร์ตเมนต์|apartment/.test(lowerText)) {
    info.property_type = 'หมู่บ้าน/หอพัก';
  }

  // ============================================================
  // ประเภทเอกสารสิทธิ์ (SOP หมวด 1: เอกสารที่รับ/ไม่รับ)
  // รับ: โฉนด (น.ส.4จ), น.ส.4ก
  // ไม่รับ: น.ส.3, น.ส.3ก, ส.ป.ก., สค.1
  // ============================================================
  if (/น\.ส\.4ก|นส\.?4ก|นส4ก|ns4k|น\.ส\.4 ก/.test(text)) {
    info.deed_type = 'ns4k';
  } else if (/โฉนด|ครุฑแดง|น\.ส\.4จ|นส\.?4จ|นส4จ|นส\.?4(?!ก)|น\.ส\.4(?!ก)|chanote/.test(text)) {
    info.deed_type = 'chanote';
  } else if (/น\.ส\.3ก|นส\.?3ก|นส3ก|ns3k/.test(text)) {
    info.deed_type = 'ns3k';
    if (!info.ineligible_property) {
      info.ineligible_property = true;
      info.ineligible_reason = 'น.ส.3ก ไม่ผ่านเกณฑ์ SOP';
    }
  } else if (/น\.ส\.3(?!ก)|นส\.?3(?!ก)|นส3(?!ก)|ns3(?!k)/.test(text)) {
    info.deed_type = 'ns3';
    if (!info.ineligible_property) {
      info.ineligible_property = true;
      info.ineligible_reason = 'น.ส.3 ไม่ผ่านเกณฑ์ SOP';
    }
  } else if (/สปก|spk|ส\.ป\.ก\.?|ที่ดินสปก/.test(text)) {
    info.deed_type = 'spk';
    if (!info.ineligible_property) {
      info.ineligible_property = true;
      info.ineligible_reason = 'ส.ป.ก. ไม่ผ่านเกณฑ์ SOP';
    }
  } else if (/สค\.?1|ภบท\.?5|ใบจอง|ที่ดินมือเปล่า/.test(text)) {
    info.deed_type = 'other';
    if (!info.ineligible_property) {
      info.ineligible_property = true;
      info.ineligible_reason = 'เอกสารสิทธิ์ไม่ผ่านเกณฑ์ SOP';
    }
  }

  // ============================================================
  // ประเภทสินเชื่อ (SOP หมวด 2: ขายฝาก LTV 50-60%, จำนอง LTV 30-40%)
  // ============================================================
  if (/ขายฝาก|selling[\s-]?pledge|ขายฝากที่ดิน|ขายฝากบ้าน/.test(text)) {
    info.loan_type_detail = 'selling_pledge';
  } else if (/จำนอง|mortgage|จำนองบ้าน|จำนองที่ดิน|จำนองคอนโด/.test(text)) {
    info.loan_type_detail = 'mortgage';
  } else if (/รีไฟแนนซ์|refinance|refin|ไฟแนนซ์|refi/.test(lowerText)) {
    info.loan_type_detail = 'mortgage'; // รีไฟแนนซ์ → จำนอง
    info.is_refinance = true;
  }

  // ตรวจ intent "ต้องการกู้/สอบถาม" → ใช้แยก lead quality
  if (/ต้องการกู้|ต้องการเงิน|ต้องการวงเงิน|ขอสินเชื่อ|สนใจสินเชื่อ|ต้องการสินเชื่อ|อยากกู้|กู้เงิน|ขอกู้/.test(text)) {
    info.intent = 'loan_inquiry';
  } else if (/ดอกเบี้ยเท่าไหร่|ดอกเบี้ยกี่|อัตราดอกเบี้ย|ดอก(?:เบี้ย)?เท่าไร|interest rate/.test(lowerText)) {
    info.intent = 'ask_interest';
  } else if (/ค่าธรรมเนียม|ค่าใช้จ่าย|ค่าโอน|ค่าจดจำนอง|ค่าดำเนินการ|ค่าประเมิน|fee/.test(lowerText)) {
    info.intent = 'ask_fee';
  } else if (/ต่อสัญญา|ต่ออายุสัญญา|ต่ออายุ|ขยายสัญญา|ขยายระยะเวลา/.test(text)) {
    info.intent = 'contract_renewal';
  } else if (/ประเมิน(?:ราคา)?|appraise|appraisal|ราคาประเมิน|ราคาทรัพย์|มูลค่าทรัพย์/.test(lowerText)) {
    info.intent = 'ask_appraisal';
  }

  // ============================================================
  // อาชีพ (SOP ข้อ 2.1.6: ข้อมูลผู้กู้ — อาชีพและรายได้ต่อเดือน)
  // ============================================================
  const OCCUPATIONS = /พนักงานบริษัท|พนักงานเอกชน|พนักงาน|ข้าราชการ|รับราชการ|กรมทาง|ทหาร|ตำรวจ|ครู|อาจารย์|หมอ|แพทย์|พยาบาล|วิศวกร|นักบัญชี|ทนายความ|ทนาย|สถาปนิก|โปรแกรมเมอร์|นักพัฒนา|ค้าขาย|ขายของ|แม่ค้า|พ่อค้า|ธุรกิจส่วนตัว|ฟรีแลนซ์|freelance|เกษตรกร|ชาวนา|ชาวไร่|ชาวสวน|รับจ้าง|รับจ้างทั่วไป|เจ้าของกิจการ|เจ้าของธุรกิจ|ประกอบธุรกิจ|ส่วนตัว|ทำงานบริษัท|พนง\.|ลูกจ้าง|รัฐวิสาหกิจ|ช่างยนต์|ช่างไฟ|ช่างประปา|ช่างซ่อม|ช่างก่อสร้าง|ช่าง|คนขับ|ขับรถ|ไรเดอร์|rider|grab|แกร็บ|วินมอเตอร์ไซค์|นายหน้าอสังหา|นายหน้าอสังหาริมทรัพย์|นักลงทุน|investor|เกษียณ|เกษียณอายุ/gi;
  const occupationMatch = text.match(OCCUPATIONS);
  if (occupationMatch) {
    const occLine = text.split(/[\n\r]+/).find(l => OCCUPATIONS.test(l));
    info.occupation = occLine ? occLine.trim() : occupationMatch[0];
  }

  // ============================================================
  // รายได้ต่อเดือน (SOP ข้อ 2.1.6)
  // รูปแบบ: เงินเดือน 30,000 / รายได้ประมาณ 50000 บาท / เดือนละ 25,000
  // ============================================================
  const incomeMatch = text.match(/(?:เงินเดือน|รายได้|income|เดือนละ|ได้เดือนละ|salary|คอม(?:มิชชั่น)?เดือน|รายรับ|รายได้ต่อเดือน)[+\s]*(?:ประมาณ\s*)?(\d[\d,]*)\s*(?:บาท)?/i);
  if (incomeMatch) {
    info.monthly_income = parseFloat(incomeMatch[1].replace(/,/g, ''));
  } else {
    const incomeMatch2 = text.match(/(\d[\d,]+)\s*(?:บาท)?\s*(?:ต่อเดือน|\/เดือน|per.?month)/i);
    if (incomeMatch2) {
      info.monthly_income = parseFloat(incomeMatch2[1].replace(/,/g, ''));
    }
  }

  // ============================================================
  // วงเงินที่ต้องการ (SOP ข้อ 2.1.6: วัตถุประสงค์)
  // รูปแบบ: ต้องการ 3 ล้าน / ขอวงเงิน 1,500,000 บาท / อยากได้ 5 แสน
  // ============================================================
  const desiredMatch = text.match(/(?:ต้องการ(?:วงเงิน)?|อยากได้|ขอ(?:วงเงิน)?|วงเงิน(?:ที่ต้องการ)?|ต้องการกู้|ขอกู้|กู้)\s*(?:ประมาณ\s*)?(\d[\d,]*(?:\.\d+)?)\s*(?:บาท|ล้าน|แสน)/i);
  if (desiredMatch) {
    let val = parseFloat(desiredMatch[1].replace(/,/g, ''));
    if (/ล้าน/.test(desiredMatch[0])) val *= 1000000;
    else if (/แสน/.test(desiredMatch[0])) val *= 100000;
    info.desired_amount = val;
  }

  // ============================================================
  // ราคาประเมิน / มูลค่าทรัพย์ (SOP: ราคาทรัพย์)
  // รูปแบบ: 1,500,000 บาท / 1.5 ล้าน / ราคาประเมิน 3 ล้าน
  // ============================================================
  if (!info.desired_amount || !(/ต้องการ|อยากได้|ขอ|วงเงิน|กู้/.test(text))) {
    // ดักจับ "ราคาประเมิน X ล้าน" / "ราคาทรัพย์ X บาท" ก่อน
    const appraisalMatch = text.match(/(?:ราคาประเมิน|ราคาทรัพย์|ราคา(?:บ้าน|ที่ดิน|คอนโด)|มูลค่า(?:ทรัพย์|ที่ดิน)?|ประเมินได้)\s*(?:ประมาณ\s*)?(\d+(?:\.\d+)?)\s*(?:ล้าน|แสน|บาท)/i);
    if (appraisalMatch) {
      let apVal = parseFloat(appraisalMatch[1].replace(/,/g, ''));
      if (/ล้าน/.test(appraisalMatch[0])) apVal *= 1000000;
      else if (/แสน/.test(appraisalMatch[0])) apVal *= 100000;
      info.estimated_value = apVal;
    } else {
      const millionMatch = text.match(/(\d+(?:\.\d+)?)\s*ล้าน/);
      const thousandMatch = text.match(/(\d+(?:\.\d+)?)\s*แสน/);
      const rawMatch = text.match(/(\d[\d,]{4,})\s*บาท/);
      if (millionMatch) {
        let val = parseFloat(millionMatch[1]) * 1000000;
        if (thousandMatch) val += parseFloat(thousandMatch[1]) * 100000;
        if (!info.desired_amount) info.estimated_value = val;
      } else if (thousandMatch) {
        if (!info.desired_amount) info.estimated_value = parseFloat(thousandMatch[1]) * 100000;
      } else if (rawMatch) {
        const num = parseFloat(rawMatch[1].replace(/,/g, ''));
        if (num >= 100000 && !info.desired_amount) info.estimated_value = num;
      }
    }
  }

  // ============================================================
  // ตรวจจับนายหน้า/ตัวแทน (SOP: บทบาทนายหน้าในกระบวนการ)
  // Keywords: นายหน้า, ตัวแทน, โบรกเกอร์, ส่งลูกค้า, ฝากถาม ฯลฯ
  // ============================================================
  const AGENT_PATTERN = /(?:ผม|หนู|ดิฉัน|ฉัน|เรา)?(?:เป็น|คือ)?\s*(?:นายหน้า|ตัวแทน|โบรก(?:เกอร์)?|broker|agent|มิดเดิ้ลแมน|middle\s*man|นายหน้าอสังหา|ตัวแทนขาย)|(?:แนะนำ|ส่ง|พา|พามา|แนะนำมา|ส่งมาให้|นำ)(?:ลูกค้า|ลูกหนี้|แขก)|(?:ฝากถาม|ฝากสอบถาม|ถามแทน|ติดต่อแทน|แทนลูกค้า|แทนเจ้าของ|มาแทน|ฝากเคส|ส่งเคส)|(?:ลูกค้าของ|ลูกค้าผม|ลูกค้าหนู|ลูกค้าดิฉัน|เคสนี้|เคสลูกค้า)/gi;

  if (AGENT_PATTERN.test(text)) {
    info.is_agent = true;

    const agentNameMatch = text.match(/(?:ผม|หนู|ดิฉัน|ฉัน|ชื่อ)\s+([ก-๙a-zA-Z]{2,}(?:\s+[ก-๙a-zA-Z]{2,})?)/);
    if (agentNameMatch) info.agent_name = agentNameMatch[1].trim();

    const agentPhoneLine = text.split(/[\n\r]+/).find(l =>
      /(?:เบอร์|โทร|ติดต่อ|ผม|หนู|ดิฉัน|ตัวแทน|นายหน้า)/i.test(l) &&
      /(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(l)
    );
    if (agentPhoneLine) {
      const agentPhoneMatch = agentPhoneLine.match(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
      if (agentPhoneMatch) info.agent_phone = agentPhoneMatch[0].replace(/[-.\s]/g, '');
    }

    const allPhones = [...text.matchAll(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g)]
      .map(m => m[0].replace(/[-.\s]/g, ''));
    if (allPhones.length >= 2 && !info.agent_phone) {
      info.agent_phone = allPhones[0];
      info.phone = allPhones[1];
    }
  }

  // ============================================================
  // ภาระหนี้ / ยอดสินเชื่อคงเหลือ (SOP ข้อ 2.1.6)
  // Keywords: ติดจำนอง, ยอดค้าง, ผ่อนอยู่, ภาระสินเชื่อ ฯลฯ
  // ============================================================
  if (/ติดจำนอง|มีภาระ|ยังค้าง|ค้างอยู่|ผ่อนอยู่|ยอดหนี้|หนี้เดิม|ปิดหนี้|ภาระสินเชื่อ|ยอดค้างชำระ|หนี้คงเหลือ|ยังเหลืออยู่|ค้างจ่าย|ยังผ่อน|กำลังผ่อน|ติดสินเชื่อ|สินเชื่อคงค้าง/.test(text)) {
    info.has_obligation = 'yes';
    const debtMatch = text.match(/(?:หนี้|ภาระ|ค้าง|ผ่อน|ยอด|สินเชื่อ(?:คงเหลือ)?)[^\d]*(\d[\d,]{3,})\s*(?:บาท)?/i);
    if (debtMatch) {
      info.obligation_amount = parseFloat(debtMatch[1].replace(/,/g, ''));
    }
  } else if (/ไม่มีภาระ|ไม่ติด|ปลดภาระ|ชำระหมดแล้ว|หมดภาระ|ไม่มีหนี้|ปลอดภาระ|ไม่มีสินเชื่อ/.test(text)) {
    info.has_obligation = 'no';
  }

  // ============================================================
  // ระยะเวลาสัญญา (SOP ข้อ 2.1.6: ระยะเวลาที่ต้องการ)
  // รูปแบบ: 3 ปี / สัญญา 2 ปี / 6 เดือน
  // ============================================================
  const durationYearMatch = text.match(/(?:สัญญา|ระยะเวลา|ระยะ|กู้)?\s*(\d+)\s*(?:ปี|year)/i);
  if (durationYearMatch) {
    info.contract_years = parseInt(durationYearMatch[1]);
  } else {
    // แปลงเดือน → ปี (6 เดือน = 0.5 ปี, 18 เดือน = 1.5 ปี)
    const durationMonthMatch = text.match(/(\d+)\s*(?:เดือน|month)/i);
    if (durationMonthMatch) {
      info.contract_years = Math.round((parseInt(durationMonthMatch[1]) / 12) * 10) / 10;
    }
  }

  // --- จังหวัด (parse 77 จังหวัด + ปริมณฑล) ---
  const PROVINCES = [
    'กรุงเทพ','กทม','กรุงเทพมหานคร','นนทบุรี','ปทุมธานี','สมุทรปราการ','สมุทรสาคร',
    'นครปฐม','อยุธยา','พระนครศรีอยุธยา','สระบุรี','ชลบุรี','ระยอง','จันทบุรี','ตราด',
    'ฉะเชิงเทรา','ปราจีนบุรี','นครนายก','สระแก้ว','เชียงใหม่','เชียงราย','ลำปาง','ลำพูน',
    'แม่ฮ่องสอน','พะเยา','น่าน','แพร่','อุตรดิตถ์','ตาก','สุโขทัย','กำแพงเพชร','พิษณุโลก',
    'เพชรบูรณ์','พิจิตร','นครสวรรค์','อุทัยธานี','ชัยนาท','สิงห์บุรี','อ่างทอง','ลพบุรี',
    'นครราชสีมา','โคราช','ชัยภูมิ','บุรีรัมย์','สุรินทร์','ศรีสะเกษ','อุบลราชธานี','ยโสธร',
    'อำนาจเจริญ','มุกดาหาร','นครพนม','สกลนคร','กาฬสินธุ์','ขอนแก่น','มหาสารคาม','ร้อยเอ็ด',
    'เลย','หนองบัวลำภู','หนองคาย','อุดรธานี','บึงกาฬ','นราธิวาส','ปัตตานี','ยะลา','สงขลา',
    'สตูล','ตรัง','พัทลุง','นครศรีธรรมราช','กระบี่','ภูเก็ต','พังงา','ระนอง','ชุมพร',
    'สุราษฎร์ธานี','ประจวบคีรีขันธ์','เพชรบุรี','ราชบุรี','สุพรรณบุรี','กาญจนบุรี'
  ];
  for (const prov of PROVINCES) {
    if (text.includes(prov)) {
      info.location_hint = prov;
      break;
    }
  }

  // --- ดึงชื่อลูกค้าจากข้อความ ---
  // ข้อความมักมาในรูปแบบ:
  //   ชื่อ นามสกุล
  //   เบอร์โทร
  //   จำนอง/ขายฝาก
  // หรือ: "ชื่อ นามสกุล 09xxxxxxxx จำนอง"
  // วิธี: ตัดส่วนที่เป็นเบอร์โทร/keyword/อาชีพ ออก แล้วเหลือชื่อ
  const KNOWN_KEYWORDS = /ขายฝาก|จำนอง|mortgage|refinance|selling.?pledge|บ้านเดี่ยว|บ้านเดียว|บ้านแฝด|บ้านพัก|ทาวน์เฮ้าส์|ทาวน์เฮาส์|ทาวน์โฮม|คอนโด|ห้องชุด|อาคารพาณิชย์|ตึกแถว|ที่ดินเปล่า|ที่ดิน|ที่สวน|ที่ไร่|ที่นา|ที่ตาบอด|โฉนด|ครุฑแดง|สปก|น\.ส\.4|น\.ส\.3|ติดจำนอง|มีภาระ|ภาระสินเชื่อ|ไม่มีภาระ|ไม่ติด|สนใจ|ต้องการ|อยากได้|ต้องการกู้|อยากกู้|ขอกู้|กู้เงิน|ดอกเบี้ย|ค่าธรรมเนียม|ราคาประเมิน|ราคาทรัพย์|ต่อสัญญา|รีไฟแนนซ์|ล้าน|แสน|บาท|house|single|condo|townhouse|land|shophouse|villa|หมู่บ้าน|หอพัก|อพาร์ทเม้นท์|ห้องนอน|ห้องน้ำ|ห้องครัว|ชั้น|ตารางเมตร|ตร\.ม|ไร่|งาน|ตารางวา|วา|เนื้อที่|เดือน|year|month/gi;

  // กรองคำทักทาย/คำทั่วไปที่ไม่ใช่ชื่อ
  // ✅ รองรับทศนิยม เช่น 5.7 ปี, 1.5 ปี
  const GREETINGS = /^(สวัสดี|สวัสดีครับ|สวัสดีค่ะ|สวัสดีคะ|หวัดดี|ดีครับ|ดีค่ะ|ดีคะ|hello|hi|hey|ขอบคุณ|ขอบคุณครับ|ขอบคุณค่ะ|ครับ|ค่ะ|คะ|ok|โอเค|ได้ครับ|ได้ค่ะ|ตกลง|ช่วยด้วย|ต้องการ|สนใจ|อยากได้|ได้|ไม่|ใช่|ไม่ใช่|ถูกต้อง|ครึ่งปี.*|.*ปีครับ|.*ปีค่ะ|\d+(?:\.\d+)?\s*ปี.*|\d+\s*เดือน.*|สอบถาม|สอบถามครับ|สอบถามค่ะ|ขอสอบถาม|มีข้อสงสัย|อยากทราบ|ขอทราบ|ต้องการทราบ|รบกวนสอบถาม)$/i;

  // 🚫 คำที่เป็นอาชีพ/รายได้/หนี้ — ห้ามเอาไปเป็นชื่อ
  const OCCUPATION_KEYWORDS = /พนักงานบริษัท|พนักงานเอกชน|พนักงาน|ข้าราชการ|รับราชการ|กรมทาง|ทหาร|ตำรวจ|ครู|อาจารย์|หมอ|แพทย์|พยาบาล|วิศวกร|นักบัญชี|ทนายความ|ทนาย|สถาปนิก|โปรแกรมเมอร์|นักพัฒนา|ค้าขาย|ขายของ|แม่ค้า|พ่อค้า|ธุรกิจส่วนตัว|ฟรีแลนซ์|freelance|เกษตรกร|ชาวนา|ชาวไร่|ชาวสวน|รับจ้าง|รับจ้างทั่วไป|เจ้าของกิจการ|เจ้าของธุรกิจ|ประกอบธุรกิจ|ส่วนตัว|ทำงานบริษัท|พนง\.|ลูกจ้าง|รัฐวิสาหกิจ|ช่างยนต์|ช่างไฟ|ช่างประปา|ช่างซ่อม|ช่างก่อสร้าง|ช่าง|คนขับ|ขับรถ|ไรเดอร์|rider|grab|แกร็บ|วินมอเตอร์ไซค์|นายหน้าอสังหา|นักลงทุน|investor|เกษียณ|เงินเดือน|รายได้|คอมเดือน|คอมมิชชั่น|ปิดหนี้|ผ่อน|หนี้เดิม|ภาระสินเชื่อ|ยอดค้าง|สินเชื่อ/gi;

  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length >= 2) {
    // ลองดูทีละบรรทัด → บรรทัดที่ไม่ใช่เบอร์ ไม่ใช่ keyword ไม่ใช่อาชีพ ไม่ใช่ตัวเลขล้วนๆ = ชื่อ
    for (const line of lines) {
      // ข้ามบรรทัดที่มีคำเกี่ยวกับอาชีพ/รายได้
      if (OCCUPATION_KEYWORDS.test(line)) { OCCUPATION_KEYWORDS.lastIndex = 0; continue; }
      OCCUPATION_KEYWORDS.lastIndex = 0;
      // ข้ามบรรทัดที่เป็น numbered list เช่น "1.", "2.", "5. 7 ปี"
      if (/^\d+[.)]\s/.test(line)) continue;
      // ข้ามบรรทัดที่เป็น duration เช่น "3 ปี", "68 เดือน", "5.7 ปี", "1.5 ปีครับ"
      if (/^\d+(?:\.\d+)?\s*(?:ปี|เดือน|year|month)/i.test(line.trim())) continue;
      // ข้ามบรรทัดที่มีตัวเลขเยอะ (วงเงิน/รายได้/เบอร์โทร)
      const digitCount = (line.match(/\d/g) || []).length;
      if (digitCount >= 6) continue; // บรรทัดที่มีตัวเลข >= 6 ตัว → ไม่ใช่ชื่อ

      const cleaned = line.replace(KNOWN_KEYWORDS, '').replace(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '').replace(/\d+/g, '').trim();
      // ถ้าเหลือข้อความภาษาไทย/อังกฤษ >= 2 ตัวอักษร → น่าจะเป็นชื่อ
      if (cleaned.length >= 2 && /[\u0E00-\u0E7Fa-zA-Z]/.test(cleaned) && !GREETINGS.test(cleaned)) {
        let namePart = line
          .replace(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '')
          .replace(KNOWN_KEYWORDS, '')
          .replace(new RegExp(PROVINCES.join('|'), 'g'), '') // ตัดชื่อจังหวัดออก
          .replace(/\s{2,}/g, ' ')
          .trim();
        // ชื่อจริงต้องขึ้นต้นด้วยตัวอักษร ไม่ใช่ตัวเลข
        if (/^\d/.test(namePart)) { continue; }
        info.customer_name = namePart;
        if (info.customer_name.length >= 2 && !GREETINGS.test(info.customer_name)) break;
        else delete info.customer_name;
      }
    }
  } else if (lines.length === 1) {
    // ข้ามถ้าทั้งบรรทัดเป็นอาชีพ/รายได้
    if (!OCCUPATION_KEYWORDS.test(text)) {
      OCCUPATION_KEYWORDS.lastIndex = 0;
      let remaining = text;
      remaining = remaining.replace(/(\+?66|0)\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '');
      remaining = remaining.replace(KNOWN_KEYWORDS, '');
      remaining = remaining.replace(new RegExp(PROVINCES.join('|'), 'g'), '');
      remaining = remaining.replace(/\d[\d,.]*\s*/g, '');
      remaining = remaining.replace(/\s{2,}/g, ' ').trim();
      if (remaining.length >= 2 && /[\u0E00-\u0E7Fa-zA-Z]/.test(remaining) && !GREETINGS.test(remaining) && !/^\d/.test(remaining)) {
        info.customer_name = remaining;
      }
    }
    OCCUPATION_KEYWORDS.lastIndex = 0;
  }

  return info;
}

// ============================================
// Helper: Auto-assign เซลล์แบบ Round-Robin (วนรอบจริง)
// เคส1→คนที่1, เคส2→คนที่2, เคส3→คนที่3, เคส4→กลับมาคนที่1
// ข้ามเซลล์ที่ถูกลบหรือ inactive
// ============================================
function autoAssignSales(conversationId, io) {
  // 1) ดึงเซลล์ทุกคนที่ active และ rr_active=1 เรียงตาม id ASC (ลำดับคงที่)
  db.query(
    "SELECT id, username, full_name, nickname FROM admin_users WHERE department = 'sales' AND status = 'active' AND (rr_active IS NULL OR rr_active = 1) ORDER BY id ASC",
    (err, salesUsers) => {
      if (err || salesUsers.length === 0) {
        console.log('Auto-assign: ไม่พบเซลล์ที่ active', err ? err.message : '');
        return;
      }

      // 2) ดึง assigned_to ของ conversation ล่าสุดที่ถูก assign (ไม่นับ NULL)
      db.query(
        "SELECT assigned_to FROM chat_conversations WHERE assigned_to IS NOT NULL ORDER BY id DESC LIMIT 1",
        (err2, lastRows) => {
          if (err2) return console.log('Auto-assign query error:', err2.message);

          var lastAssignedId = (lastRows.length > 0) ? lastRows[0].assigned_to : null;

          // 3) หาตำแหน่งของคนล่าสุด แล้ววนไปคนถัดไป
          var lastIndex = -1;
          if (lastAssignedId) {
            for (var i = 0; i < salesUsers.length; i++) {
              if (salesUsers[i].id === lastAssignedId) {
                lastIndex = i;
                break;
              }
            }
          }

          var nextIndex = (lastIndex + 1) % salesUsers.length;
          var salesUser = salesUsers[nextIndex];

          db.query(
            'UPDATE chat_conversations SET assigned_to = ? WHERE id = ?',
            [salesUser.id, conversationId],
            (err3) => {
              if (err3) return console.log('Auto-assign error:', err3.message);

              console.log('🎯 Round-Robin chat assign: conv #' + conversationId + ' → ' + (salesUser.full_name || salesUser.username) + ' (id=' + salesUser.id + ')');

              // แจ้งเตือนเซลล์ที่ถูก assign ผ่าน socket
              if (io) {
                io.to('user_' + salesUser.id).emit('assigned_to_you', {
                  conversation_id: conversationId,
                  message: 'คุณได้รับลูกค้าใหม่'
                });
              }
            }
          );
        }
      );
    }
  );
}

// ============================================
// Helper: ดึง LINE Profile (ชื่อ + รูป)
// ============================================
function getLineProfile(userId, callback) {
  getPlatformConfig('line', (err, config) => {
    if (err || !config) return callback(null); // ถ้าดึง config ไม่ได้ก็ข้ามไป

    const https = require('https');
    const url = `https://api.line.me/v2/bot/profile/${userId}`;
    const options = {
      headers: { 'Authorization': `Bearer ${config.access_token}` }
    };

    https.get(url, options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const profile = JSON.parse(data);
          if (profile.displayName) {
            console.log(`📷 LINE Profile: ${profile.displayName} (${userId.substring(0, 10)}...)`);
            return callback({
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl || null,
              statusMessage: profile.statusMessage || null
            });
          }
        } catch (e) {}
        callback(null);
      });
    }).on('error', () => callback(null));
  });
}

// ============================================
// Helper: ดึง Facebook Profile (ชื่อ + รูป)
// ============================================
function getFacebookProfile(senderId, callback) {
  getPlatformConfig('facebook', (err, config) => {
    if (err || !config) return callback(null);

    const https = require('https');
    const url = `https://graph.facebook.com/v19.0/${senderId}?fields=name,profile_pic&access_token=${config.access_token}`;

    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const profile = JSON.parse(data);
          if (profile.name) {
            console.log(`📷 FB Profile: ${profile.name} (${senderId})`);
            return callback({
              displayName: profile.name,
              pictureUrl: profile.profile_pic || null
            });
          }
        } catch (e) {}
        callback(null);
      });
    }).on('error', () => callback(null));
  });
}

// ============================================
// Helper: ดาวน์โหลดไฟล์จาก LINE แล้วเซฟลง disk
// เพราะ LINE Content API ต้องใช้ Bearer token + มีวันหมดอายุ
// ============================================
function downloadLineContent(messageId, callback) {
  getPlatformConfig('line', (err, config) => {
    if (err || !config) return callback(null);

    const https = require('https');
    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const options = {
      headers: { 'Authorization': `Bearer ${config.access_token}` }
    };

    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        console.log(`LINE content download failed: ${response.statusCode} for message ${messageId}`);
        return callback(null);
      }

      // กำหนดนามสกุลไฟล์จาก content-type
      const contentType = response.headers['content-type'] || '';
      let ext = '.jpg';
      if (contentType.includes('png')) ext = '.png';
      else if (contentType.includes('gif')) ext = '.gif';
      else if (contentType.includes('mp4')) ext = '.mp4';
      else if (contentType.includes('webp')) ext = '.webp';
      else if (contentType.includes('pdf')) ext = '.pdf';
      else if (contentType.includes('audio')) ext = '.m4a';
      else if (contentType.includes('octet-stream')) ext = '.bin';

      // สร้างโฟลเดอร์ถ้ายังไม่มี
      const dir = path.join(__dirname, '..', 'uploads', 'chat');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filename = `${messageId}${ext}`;
      const filepath = path.join(dir, filename);
      const fileStream = fs.createWriteStream(filepath);

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        const publicUrl = `/uploads/chat/${filename}`;
        console.log(`📥 LINE content saved: ${publicUrl}`);
        callback(publicUrl);
      });

      fileStream.on('error', (err2) => {
        console.log('LINE content save error:', err2.message);
        // ลบไฟล์ที่เขียนไม่สมบูรณ์
        try { fs.unlinkSync(filepath); } catch (e) {}
        callback(null);
      });

    }).on('error', (err2) => {
      console.log('LINE content download error:', err2.message);
      callback(null);
    });
  });
}

// ============================================
// Helper: ดาวน์โหลดรูปจาก URL (Facebook CDN, หรืออื่นๆ) แล้วเซฟลง /uploads/chat/
// ใช้เพื่อเก็บรูปถาวรก่อนที่ FB CDN URL จะหมดอายุ
// callback(localPublicUrl) เช่น "/uploads/chat/fb_1234567890.jpg"
// ============================================
function downloadAndSaveImageLocally(imageUrl, prefix, callback) {
  if (!imageUrl) return callback(null);
  const dir = path.join(__dirname, '..', 'public', 'uploads', 'chat');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const ext      = '.jpg'; // FB/Line images are always jpeg
  const filename = `${prefix || 'img'}_${Date.now()}.jpg`;
  const filepath = path.join(dir, filename);
  const fileStream = fs.createWriteStream(filepath);

  const request = imageUrl.startsWith('https') ? require('https') : require('http');
  request.get(imageUrl, (res) => {
    if (res.statusCode !== 200) {
      fileStream.close();
      try { fs.unlinkSync(filepath); } catch (_) {}
      console.warn(`[downloadAndSaveImage] failed ${res.statusCode}: ${imageUrl.substring(0, 80)}`);
      return callback(null);
    }
    res.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      const publicUrl = `/uploads/chat/${filename}`;
      console.log(`📥 Image saved locally: ${publicUrl}`);
      callback(publicUrl);
    });
    fileStream.on('error', (e) => {
      console.warn('[downloadAndSaveImage] write error:', e.message);
      try { fs.unlinkSync(filepath); } catch (_) {}
      callback(null);
    });
  }).on('error', (e) => {
    console.warn('[downloadAndSaveImage] request error:', e.message);
    callback(null);
  });
}

// ============================================
// Helper: หาหรือสร้าง conversation
// รองรับ avatar ด้วย
// ============================================
function findOrCreateConversation(platform, platformConvId, customerName, customerId, customerAvatar, io, callback) {
  db.query(
    'SELECT * FROM chat_conversations WHERE platform = ? AND platform_conversation_id = ?',
    [platform, platformConvId],
    (err, rows) => {
      if (err) return callback(err);

      if (rows.length > 0) {
        const conv = rows[0];
        const updates = [];
        const params = [];
        // ชื่อ: อัพเดทเฉพาะตอนยังไม่มี (ไม่เขียนทับชื่อที่ admin ตั้งเองแล้ว)
        if (customerName && !conv.customer_name) {
          updates.push('customer_name = ?');
          params.push(customerName);
        }
        // ★ customer_line_name: อัพเดทเสมอจาก LINE/FB (ชื่อต้นฉบับ — ไม่ถูก admin เขียนทับ)
        if (customerName && customerName !== conv.customer_line_name) {
          updates.push('customer_line_name = ?');
          params.push(customerName);
        }
        // รูปโปรไฟล์: อัพเดทเสมอเมื่อ LINE/FB ส่งมาใหม่ (รูปเปลี่ยนได้ตลอด)
        if (customerAvatar && customerAvatar !== conv.customer_avatar) {
          updates.push('customer_avatar = ?');
          params.push(customerAvatar);
        }
        if (updates.length > 0) {
          params.push(conv.id);
          db.query(`UPDATE chat_conversations SET ${updates.join(', ')} WHERE id = ?`, params, () => {});
          if (customerName && !conv.customer_name) conv.customer_name = customerName;
          if (customerName && customerName !== conv.customer_line_name) conv.customer_line_name = customerName;
          if (customerAvatar && customerAvatar !== conv.customer_avatar) conv.customer_avatar = customerAvatar;
        }
        return callback(null, conv);
      }

      // สร้างใหม่ — พร้อมชื่อ + avatar + customer_line_name ทันที
      db.query(
        `INSERT INTO chat_conversations (platform, platform_conversation_id, customer_name, customer_line_name, customer_platform_id, customer_avatar, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'unread', NOW())`,
        [platform, platformConvId, customerName, customerName, customerId, customerAvatar],
        (err2, result) => {
          if (err2) return callback(err2);

          const newConvId = result.insertId;

          // 🎯 Auto-assign เซลล์แบบ round-robin
          autoAssignSales(newConvId, io);

          // ★ Auto-create ลูกหนี้ ID ทันทีที่แชทเข้ามาครั้งแรก (ไม่รอเบอร์/โฉนด)
          // หน่วงเล็กน้อยให้ autoAssignSales ทำงานก่อน แล้วค่อยสร้าง loan_request
          setTimeout(() => autoCreateLoanRequest(newConvId, io, false, {}), 500);

          callback(null, { id: newConvId, platform, platform_conversation_id: platformConvId, customer_name: customerName, customer_line_name: customerName, customer_avatar: customerAvatar });
        }
      );
    }
  );
}

// ============================================
// Helper: บันทึกข้อความ
// ============================================
function saveMessage(conversationId, msgData, io, callback) {
  // ตรวจว่ามีข้อความนี้อยู่แล้วไหม (ป้องกัน duplicate)
  if (msgData.platform_message_id) {
    db.query(
      'SELECT id FROM chat_messages WHERE platform_message_id = ?',
      [msgData.platform_message_id],
      (err, existing) => {
        if (!err && existing.length > 0) return callback(null, existing[0]); // ข้ามถ้ามีแล้ว
        insertMessage(conversationId, msgData, io, callback);
      }
    );
  } else {
    insertMessage(conversationId, msgData, io, callback);
  }
}

function insertMessage(conversationId, msgData, io, callback) {
  db.query(
    `INSERT INTO chat_messages (conversation_id, platform_message_id, sender_type, sender_name, message_text, message_type, attachment_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      conversationId,
      msgData.platform_message_id || null,
      msgData.sender_type || 'customer',
      msgData.sender_name || '',
      msgData.message_text || '',
      msgData.message_type || 'text',
      msgData.attachment_url || null
    ],
    (err, result) => {
      if (err) return callback(err);

      // อัพเดท conversation + auto-capture SOP keyword data
      // ข้ามถ้าไม่ใช่ข้อความจริง (รูป วิดีโอ สติกเกอร์ ฯลฯ)
      const isTextMsg = !msgData.message_type || msgData.message_type === 'text';
      const extracted = isTextMsg ? extractCustomerInfo(msgData.message_text) : {};
      let updateSql = `UPDATE chat_conversations SET status = 'unread', last_message_text = ?, last_message_at = NOW()`;
      const updateParams = [msgData.message_text || ''];

      // ข้อมูลพื้นฐาน — ชื่อจากข้อความจะ overwrite ชื่อ LINE display name
      // เพราะลูกค้าบอกชื่อจริงมาเอง ย่อมสำคัญกว่า display name
      if (extracted.customer_name) {
        updateSql += ', customer_name = ?';
        updateParams.push(extracted.customer_name);
      }
      if (extracted.phone) {
        updateSql += ', customer_phone = COALESCE(customer_phone, ?)';
        updateParams.push(extracted.phone);
      }
      if (extracted.email) {
        updateSql += ', customer_email = COALESCE(customer_email, ?)';
        updateParams.push(extracted.email);
      }

      // ข้อมูล SOP — ใช้ COALESCE ป้องกัน overwrite ข้อมูลที่มีอยู่แล้ว
      if (extracted.property_type) {
        updateSql += ', property_type = COALESCE(property_type, ?)';
        updateParams.push(extracted.property_type);
      }
      if (extracted.deed_type) {
        updateSql += ', deed_type = COALESCE(deed_type, ?)';
        updateParams.push(extracted.deed_type);
      }
      if (extracted.loan_type_detail) {
        updateSql += ', loan_type_detail = COALESCE(loan_type_detail, ?)';
        updateParams.push(extracted.loan_type_detail);
      }
      if (extracted.estimated_value) {
        updateSql += ', estimated_value = COALESCE(estimated_value, ?)';
        updateParams.push(extracted.estimated_value);
      }
      if (extracted.location_hint) {
        updateSql += ', location_hint = COALESCE(location_hint, ?)';
        updateParams.push(extracted.location_hint);
      }
      if (extracted.has_obligation) {
        updateSql += ', has_obligation = COALESCE(has_obligation, ?)';
        updateParams.push(extracted.has_obligation);
      }

      // ข้อมูลผู้กู้ ตาม SOP ข้อ 2.1.6
      if (extracted.occupation) {
        updateSql += ', occupation = COALESCE(occupation, ?)';
        updateParams.push(extracted.occupation);
      }
      if (extracted.monthly_income) {
        updateSql += ', monthly_income = COALESCE(monthly_income, ?)';
        updateParams.push(extracted.monthly_income);
      }
      if (extracted.desired_amount) {
        updateSql += ', desired_amount = COALESCE(desired_amount, ?)';
        updateParams.push(extracted.desired_amount);
      }
      if (extracted.obligation_amount) {
        updateSql += ', obligation_amount = COALESCE(obligation_amount, ?)';
        updateParams.push(extracted.obligation_amount);
      }
      if (extracted.contract_years) {
        updateSql += ', contract_years = COALESCE(contract_years, ?)';
        updateParams.push(extracted.contract_years);
      }

      // ข้อมูลนายหน้า (ถ้าผู้ส่งข้อความเป็นนายหน้า)
      if (extracted.is_agent) {
        updateSql += ', is_agent = 1';
        if (extracted.agent_name) {
          updateSql += ', agent_name = COALESCE(agent_name, ?)';
          updateParams.push(extracted.agent_name);
        }
        if (extracted.agent_phone) {
          updateSql += ', agent_phone = COALESCE(agent_phone, ?)';
          updateParams.push(extracted.agent_phone);
        }
      }

      // SOP Screening: ทรัพย์ไม่ผ่านเกณฑ์ → flag เพื่อแจ้งเตือนเซลล์
      if (extracted.ineligible_property) {
        updateSql += ', ineligible_property = 1';
        if (extracted.ineligible_reason) {
          updateSql += ', ineligible_reason = COALESCE(ineligible_reason, ?)';
          updateParams.push(extracted.ineligible_reason);
        }
      }
      // Intent ของลูกค้า (loan_inquiry / ask_interest / ask_fee / contract_renewal / ask_appraisal)
      if (extracted.intent) {
        updateSql += ', intent_type = ?'; // อัพเดทล่าสุดเสมอ (intent เปลี่ยนได้)
        updateParams.push(extracted.intent);
      }
      if (extracted.is_refinance) {
        updateSql += ', is_refinance = 1';
      }

      updateSql += ' WHERE id = ?';
      updateParams.push(conversationId);

      db.query(updateSql, updateParams, () => {
        // 🔥 Emit real-time event ไปหา frontend
        if (io) {
          const messageData = {
            conversation_id: conversationId,
            message: {
              id: result.insertId,
              conversation_id: conversationId,
              sender_type: msgData.sender_type || 'customer',
              sender_name: msgData.sender_name || '',
              message_text: msgData.message_text || '',
              message_type: msgData.message_type || 'text',
              attachment_url: msgData.attachment_url || null
            }
          };

          // ⚠️ แจ้งเตือนเซลล์ทันทีถ้าทรัพย์ไม่ผ่านเกณฑ์ SOP
          if (extracted.ineligible_property) {
            io.to('admin_room').emit('ineligible_property_detected', {
              conversation_id: conversationId,
              reason: extracted.ineligible_reason || 'ทรัพย์ไม่ผ่านเกณฑ์ SOP',
              deed_type: extracted.deed_type || null,
              property_type: extracted.property_type || null,
              message: `⚠️ ${extracted.ineligible_reason || 'ทรัพย์ไม่ผ่านเกณฑ์ SOP'}`
            });
          }

          // ส่งข้อความไปเฉพาะ room ของ conversation นั้น (แอดมินที่เปิดดูอยู่)
          io.to('conv_' + conversationId).emit('new_message', messageData);

          // ดึงชื่อลูกค้า + platform จาก conversation แล้ว emit ให้ครบ
          db.query(
            'SELECT customer_name, platform, customer_avatar FROM chat_conversations WHERE id = ?',
            [conversationId],
            (errConv, convRows) => {
              var convInfo = (convRows && convRows[0]) || {};
              // ส่ง notification ไป room กลาง (อัพเดท conversation list ของทุกแอดมิน)
              io.to('admin_room').emit('conversation_updated', {
                conversation_id: conversationId,
                customer_name: convInfo.customer_name || msgData.sender_name || '',
                platform: convInfo.platform || '',
                customer_avatar: convInfo.customer_avatar || '',
                last_message: msgData.message_text || '',
                sender_type: msgData.sender_type || 'customer'
              });
            }
          );
        }

        // 🚫 Blacklist auto-check — เมื่อได้เบอร์ใหม่จากข้อความ
        if (extracted.phone) {
          const cleanPhone = extracted.phone.replace(/\D/g, '').trim()
          db.query(
            `SELECT id, reason, added_by_name FROM customer_blacklists WHERE phone = ? AND is_active = 1`,
            [cleanPhone],
            (errBl, blRows) => {
              if (!errBl && blRows.length > 0) {
                const blEntry = blRows[0]
                // mark conversation ว่า blacklisted
                db.query(
                  `UPDATE chat_conversations SET is_blacklisted = 1 WHERE id = ?`,
                  [conversationId], () => {}
                )
                // ส่ง system message แจ้งเตือนในแชท
                db.query(
                  `INSERT INTO chat_messages (conversation_id, sender_type, message_text, message_type, created_at)
                   VALUES (?, 'system', ?, 'text', NOW())`,
                  [conversationId, `⚠️ [BLACKLIST] เบอร์ ${cleanPhone} ถูก blacklist ไว้${blEntry.reason ? ': ' + blEntry.reason : ''} (โดย: ${blEntry.added_by_name || 'Admin'})`],
                  () => {}
                )
                // emit alert ไป admin_room
                if (io) {
                  io.to('admin_room').emit('blacklist_detected', {
                    conversation_id: conversationId,
                    phone: cleanPhone,
                    reason: blEntry.reason,
                    added_by_name: blEntry.added_by_name,
                    message: `🚫 เบอร์ ${cleanPhone} อยู่ใน Blacklist!${blEntry.reason ? ' เหตุผล: ' + blEntry.reason : ''}`
                  })
                }
              }
            }
          )
        }

        // 🏷️ Auto-tag จาก keyword ที่ extract ได้จากข้อความ
        autoSetTagFromExtracted(conversationId, extracted);

        // 🎯 Auto-create หรือ Auto-update loan_request
        // เฉพาะข้อความจากลูกค้าเท่านั้น (ไม่ใช่แอดมินตอบกลับ)
        if (msgData.sender_type === 'customer' || !msgData.sender_type) {
          db.query(
            'SELECT loan_request_id, customer_name, customer_phone FROM chat_conversations WHERE id = ?',
            [conversationId],
            (errChk, chkRows) => {
              if (!errChk && chkRows.length > 0) {
                const c = chkRows[0];
                if (!c.loan_request_id && c.customer_name && c.customer_phone) {
                  // ยังไม่มี loan_request → สร้างใหม่
                  autoCreateLoanRequest(conversationId, io);
                } else if (c.loan_request_id) {
                  // มี loan_request_id → ตรวจว่ายังอยู่ในฐานข้อมูลจริงไหม
                  db.query('SELECT id FROM loan_requests WHERE id = ?', [c.loan_request_id], (errLr, lrRows) => {
                    if (!errLr && lrRows && lrRows.length > 0) {
                      // ยังอยู่จริง → อัพเดทข้อมูลเพิ่มเติม (ถ้ามี)
                      if (Object.keys(extracted).length > 0) {
                        updateLoanRequestFromChat(conversationId, extracted, io);
                      }
                    } else {
                      // ถูกลบไปแล้ว! → ตัด link เดิม แล้วสร้างใหม่อัตโนมัติ
                      console.log('[AUTO-RECOVERY] loan_request id=' + c.loan_request_id + ' ถูกลบไปแล้ว → สร้างใหม่ให้ conversation id=' + conversationId);
                      db.query('UPDATE chat_conversations SET loan_request_id = NULL WHERE id = ?', [conversationId], () => {
                        if (c.customer_name && c.customer_phone) {
                          autoCreateLoanRequest(conversationId, io);
                        }
                      });
                    }
                  });
                }
              }
            }
          );

          // 🤖 Gemini AI Text Extraction — async (ไม่บล็อก webhook response)
          // ดึง 15 ข้อความล่าสุดจาก conversation → ส่งให้ Gemini วิเคราะห์
          // ทำงาน setImmediate เพื่อให้ callback กลับก่อน แล้วค่อย extract
          setImmediate(() => {
            db.query(
              'SELECT sender_type, message_text FROM chat_messages WHERE conversation_id = ? AND message_type = \'text\' ORDER BY id DESC LIMIT 15',
              [conversationId],
              (errMsgs, msgRows) => {
                if (errMsgs || !msgRows || msgRows.length < 2) return; // ต้องมีอย่างน้อย 2 ข้อความ
                // เรียงจากเก่าสุด → ใหม่สุด (reverse)
                const messages = msgRows.slice().reverse();
                extractCustomerInfoWithGemini(messages, (errGemini, geminiData) => {
                  if (errGemini || !geminiData) return;

                  // Merge geminiData เข้า chat_conversations (COALESCE — ไม่ overwrite ข้อมูลที่มีอยู่แล้ว)
                  const gUpdates = [];
                  const gParams = [];

                  // ชื่อ: อัพเดทเสมอถ้า Gemini ได้ (ชื่อจริงสำคัญกว่า display name)
                  if (geminiData.customer_name) {
                    gUpdates.push('customer_name = ?');
                    gParams.push(geminiData.customer_name);
                  }
                  // เบอร์: COALESCE (ถ้ายังไม่มี)
                  if (geminiData.customer_phone) {
                    gUpdates.push('customer_phone = COALESCE(customer_phone, ?)');
                    gParams.push(geminiData.customer_phone);
                  }
                  // Fields อื่น ๆ — COALESCE ทั้งหมด
                  const coalesceFields = {
                    loan_type_detail: geminiData.loan_type_detail,
                    property_type:    geminiData.property_type,
                    desired_amount:   geminiData.desired_amount,
                    estimated_value:  geminiData.estimated_value,
                    occupation:       geminiData.occupation,
                    monthly_income:   geminiData.monthly_income,
                    contract_years:   geminiData.contract_years,
                    location_hint:    geminiData.location_hint,
                    has_obligation:   geminiData.has_obligation,
                    obligation_amount:geminiData.obligation_amount,
                    deed_type:        geminiData.deed_type,
                  };
                  Object.entries(coalesceFields).forEach(([col, val]) => {
                    if (val !== undefined && val !== null) {
                      gUpdates.push(`${col} = COALESCE(${col}, ?)`);
                      gParams.push(val);
                    }
                  });

                  // ข้อมูลเพิ่มเติมจาก Gemini (property_project, bedrooms)
                  if (geminiData.property_project) {
                    gUpdates.push('property_project = COALESCE(property_project, ?)');
                    gParams.push(geminiData.property_project);
                  }
                  if (geminiData.bedrooms) {
                    gUpdates.push('bedrooms = COALESCE(bedrooms, ?)');
                    gParams.push(geminiData.bedrooms);
                  }

                  // Flag พิเศษ
                  if (geminiData.is_agent) gUpdates.push('is_agent = 1');
                  if (geminiData.ineligible_property) gUpdates.push('ineligible_property = 1');

                  if (gUpdates.length === 0) return;

                  gParams.push(conversationId);
                  db.query(
                    `UPDATE chat_conversations SET ${gUpdates.join(', ')} WHERE id = ?`,
                    gParams,
                    (errGUpd) => {
                      if (errGUpd) return console.log('[TextExtract-Gemini] Update error:', errGUpd.message);
                      console.log(`🤖 Gemini text extract updated conv #${conversationId}: ${gUpdates.length} fields`);

                      // 🏷️ Auto-tag จากข้อมูล Gemini ด้วย
                      autoSetTagFromExtracted(conversationId, {
                        ineligible_property: geminiData.ineligible_property,
                        loan_type_detail:    geminiData.loan_type_detail,
                        is_refinance:        geminiData.is_refinance,
                        deed_type:           geminiData.deed_type,
                      });

                      // ถ้าตอนนี้มีชื่อ + เบอร์แล้ว → ลองสร้าง loan_request
                      db.query(
                        'SELECT loan_request_id, customer_name, customer_phone FROM chat_conversations WHERE id = ?',
                        [conversationId],
                        (errRe, reRows) => {
                          if (errRe || !reRows || reRows.length === 0) return;
                          const updatedConv = reRows[0];
                          if (!updatedConv.loan_request_id && updatedConv.customer_name && updatedConv.customer_phone) {
                            autoCreateLoanRequest(conversationId, io);
                          } else if (updatedConv.loan_request_id) {
                            // อัพเดท loan_request ด้วย Gemini data
                            updateLoanRequestFromChat(conversationId, {
                              customer_name:    geminiData.customer_name,
                              phone:            geminiData.customer_phone,
                              property_type:    geminiData.property_type,
                              deed_type:        geminiData.deed_type,
                              loan_type_detail: geminiData.loan_type_detail,
                              estimated_value:  geminiData.estimated_value,
                              occupation:       geminiData.occupation,
                              monthly_income:   geminiData.monthly_income,
                              desired_amount:   geminiData.desired_amount,
                              obligation_amount:geminiData.obligation_amount,
                              contract_years:   geminiData.contract_years,
                              location_hint:    geminiData.location_hint,
                              has_obligation:   geminiData.has_obligation,
                            }, io);
                          }

                          // Emit ให้ admin room รู้ว่า Gemini อัพเดทข้อมูล
                          if (io && Object.keys(geminiData).length > 0) {
                            io.to('admin_room').emit('gemini_extract_done', {
                              conversation_id: conversationId,
                              extracted: geminiData,
                              message: `🤖 AI อัพเดทข้อมูลลูกค้าอัตโนมัติ (${gUpdates.length} รายการ)`
                            });
                          }
                        }
                      );
                    }
                  );
                });
              }
            );
          });
        }

        callback(null, { id: result.insertId });
      });
    }
  );
}

// ============================================
// FACEBOOK WEBHOOK
// ============================================

// GET — Facebook webhook verification
exports.verifyFacebookWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // verify token ที่ตั้งไว้ตอน setup webhook
  if (mode === 'subscribe' && token === 'LOANDD_FB_VERIFY_TOKEN') {
    console.log('Facebook webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
};

// POST — Facebook webhook events
exports.handleFacebookWebhook = (req, res) => {
  const body = req.body;
  const io = req.app.get('io');

  // ตอบ 200 ทันที (Facebook ต้องการ response ภายใน 20 วินาที)
  res.sendStatus(200);

  if (body.object !== 'page') return;

  (body.entry || []).forEach(entry => {
    const pageId = entry.id;

    // Messaging events (inbox)
    (entry.messaging || []).forEach(event => {
      if (event.message) {
        handleFacebookMessage(pageId, event, io);
      }
      // Facebook Referral event (ลูกค้ามาจาก Ad)
      if (event.referral) {
        handleFacebookReferral(pageId, event, io);
      }
    });

    // Changes events (comments)
    (entry.changes || []).forEach(change => {
      if (change.field === 'feed' && change.value?.item === 'comment') {
        handleFacebookComment(pageId, change.value, io);
      }
    });
  });
};

function handleFacebookMessage(pageId, event, io) {
  const senderId = event.sender?.id;
  const message = event.message;

  if (!senderId || senderId === pageId) return; // ข้ามข้อความจากเพจเอง
  if (message?.is_echo) return; // ข้ามข้อความ echo

  const msgText  = message?.text || '';
  const msgType  = message?.attachments ? (message.attachments[0]?.type || 'file') : 'text';
  const attachUrl = message?.attachments ? message.attachments[0]?.payload?.url : null;

  // ดึง Facebook Profile ก่อน แล้วค่อยสร้าง conversation
  getFacebookProfile(senderId, (profile) => {
    const displayName = profile?.displayName || null;
    const pictureUrl  = profile?.pictureUrl || null;

    findOrCreateConversation('facebook', senderId, displayName, senderId, pictureUrl, io, (err, conv) => {
      if (err) return console.log('FB webhook - find conv error:', err.message);

      saveMessage(conv.id, {
        platform_message_id: message?.mid || null,
        sender_type: 'customer',
        sender_name: displayName || '',
        message_text: msgText,
        message_type: ['image', 'sticker', 'video', 'file', 'audio'].includes(msgType) ? msgType : 'text',
        attachment_url: attachUrl
      }, io, (err3) => {
        if (err3) console.log('FB webhook - save msg error:', err3.message);
        // 🤖 AI auto-reply — เฉพาะข้อความ text เท่านั้น
        if (!err3 && msgType === 'text' && msgText) {
          setImmediate(() => triggerAiReply(conv, msgText, io));
          setImmediate(() => autoTagConversation(conv, msgText, io));
        }
      });

      // 🔍 รูปภาพจาก Facebook → บันทึก local ก่อน แล้วสแกนด้วย Gemini
      if (msgType === 'image' && attachUrl) {
        console.log('[OCR] Facebook image detected, saving locally + running OCR...');
        // ✅ save ถาวรก่อน (FB CDN URL หมดอายุ)
        downloadAndSaveImageLocally(attachUrl, 'fb', (fbLocalUrl) => {

          // ★ Phase 1: Keyword classify (fast)
          if (fbLocalUrl) {
            setImmediate(() => classifyAndSaveImage(conv, fbLocalUrl, io));
          }

          // ★ Phase 2: Gemini OCR
          downloadAndScanDocument(attachUrl, (err2, docData) => {
            if (err2 || !docData) return;
            if (docData.doc_type === 'deed') {
              downloadAndScanDeed(attachUrl, (err3, deedData) => {
                if (!err3 && deedData) applyDeedDataToLoanRequest(conv, deedData, io, 'facebook', fbLocalUrl);
              });
            } else {
              applyDocumentDataToLoanRequest(conv, docData, io, 'facebook', fbLocalUrl || attachUrl);
            }
          });
        });
      }
    });
  });
}

// ─── Facebook Referral (ลูกค้ามาจาก Click-to-Messenger Ad) ────────────────
function handleFacebookReferral(pageId, event, io) {
  const senderId = event.sender?.id;
  if (!senderId || senderId === pageId) return;

  const ref = event.referral;
  if (!ref) return;

  // Parse UTM จาก ref.ref string (format: utm_source=xxx&utm_campaign=yyy)
  const refStr = ref.ref || '';
  const adId = ref.ad_id || null;
  const utmParams = {};
  if (refStr.includes('=')) {
    refStr.split('&').forEach(part => {
      const [k, v] = part.split('=');
      if (k && v) utmParams[k] = decodeURIComponent(v);
    });
  }

  // หา conversation แล้วบันทึก ad source (เฉพาะตอนที่ยังไม่มีข้อมูล)
  db.query(
    'SELECT id FROM chat_conversations WHERE platform = "facebook" AND platform_conversation_id = ?',
    [senderId],
    (err, rows) => {
      if (err || rows.length === 0) return;
      const convId = rows[0].id;
      db.query(
        `UPDATE chat_conversations SET
           utm_source = COALESCE(utm_source, ?),
           utm_medium = COALESCE(utm_medium, 'messenger'),
           utm_campaign = COALESCE(utm_campaign, ?),
           utm_ad_set = COALESCE(utm_ad_set, ?),
           utm_ad = COALESCE(utm_ad, ?),
           fb_ad_id = COALESCE(fb_ad_id, ?)
         WHERE id = ?`,
        [
          utmParams.utm_source || 'facebook',
          utmParams.utm_campaign || null,
          utmParams.utm_ad_set || null,
          utmParams.utm_ad || adId,
          adId,
          convId
        ],
        (err2) => { if (!err2) console.log(`[AD] Conv #${convId} ← FB Ad ${adId || refStr}`); }
      );
    }
  );
}

function handleFacebookComment(pageId, comment, io) {
  // Comment on page post
  const senderId = comment.from?.id;
  const senderName = comment.from?.name;
  const msgText = comment.message || '';

  if (!senderId || senderId === pageId) return;

  findOrCreateConversation('facebook', `comment_${senderId}`, senderName, senderId, null, io, (err, conv) => {
    if (err) return console.log('FB comment webhook error:', err.message);

    saveMessage(conv.id, {
      platform_message_id: comment.comment_id,
      sender_type: 'customer',
      sender_name: senderName,
      message_text: `[Comment] ${msgText}`,
      message_type: 'text'
    }, io, () => {});
  });
}

// ============================================
// LINE WEBHOOK
// ============================================

// GET — LINE webhook verify (ตอบ 200)
exports.verifyLineWebhook = (req, res) => {
  res.sendStatus(200);
};

// POST — LINE webhook events
exports.handleLineWebhook = (req, res) => {
  // ตอบ 200 ทันที
  res.sendStatus(200);

  const io = req.app.get('io');
  const events = req.body?.events || [];

  events.forEach(event => {
    if (event.type === 'message') {
      handleLineMessage(event, io);
    } else if (event.type === 'follow') {
      handleLineFollow(event, io);
    }
  });
};

function handleLineMessage(event, io) {
  const userId = event.source?.userId;
  if (!userId) return;

  // ── Line CTA / LIFF ref tracking ──────────────────────────────────────
  // LINE URL builder: line://app/liffId?ref=utm_campaign%3Dxxx
  // หรือ postback.data มี ref=xxx
  const lineRef = event.source?.roomId || null; // placeholder — overridden below

  const message = event.message || {};
  let msgText = '';
  let msgType = 'text';
  let attachUrl = null;

  switch (message.type) {
    case 'text':
      msgText = message.text || '';
      // ข้าม echo ของข้อความที่ระบบส่งออกไปเอง (LINE Flex Message alt text หรือข้อความไฟล์)
      // LINE บางโหมดส่ง webhook event ย้อนกลับสำหรับข้อความที่ bot ส่งออกไป
      if (msgText.startsWith('📎 ไฟล์แนบ:') || msgText.startsWith('[ADMIN]') || msgText.startsWith('[ระบบ]')) {
        return;
      }
      break;
    case 'image':
      msgType = 'image';
      msgText = '[รูปภาพ]';
      // จะดาวน์โหลดจาก LINE แล้วเซฟลง disk ทีหลัง (ใน callback)
      attachUrl = null; // ตั้งค่าทีหลังหลังดาวน์โหลดเสร็จ
      break;
    case 'video':
      msgType = 'video';
      msgText = '[วิดีโอ]';
      attachUrl = null;
      break;
    case 'sticker':
      msgType = 'sticker';
      msgText = `[สติกเกอร์]`;
      attachUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${message.stickerId}/iPhone/sticker.png`;
      break;
    case 'location':
      msgType = 'location';
      msgText = `[ตำแหน่ง] ${message.title || ''} ${message.address || ''}`.trim();
      break;
    case 'file':
      msgType = 'file';
      msgText = `[ไฟล์] ${message.fileName || ''}`;
      break;
    default:
      msgText = `[${message.type || 'unknown'}]`;
  }

  // ✅ ดึง LINE Profile ก่อน แล้วค่อยสร้าง conversation (ให้ชื่อ+รูปพร้อมทันที)
  getLineProfile(userId, (profile) => {
    const displayName = profile?.displayName || null;
    const pictureUrl = profile?.pictureUrl || null;

    // ถ้าเป็นรูป/วิดีโอ → ดาวน์โหลดจาก LINE แล้วเซฟลง disk ก่อน
    const needsDownload = (msgType === 'image' || msgType === 'video' || msgType === 'file') && message.id;

    // Parse LINE ref จาก event (ถ้ามี — จาก LINE URL Builder)
    const lineEventRef = event.source?.ref || null;

    const doSave = (finalAttachUrl) => {
      findOrCreateConversation('line', userId, displayName, userId, pictureUrl, io, (err, conv) => {
        if (err) return console.log('LINE webhook - find conv error:', err.message);

        // บันทึก line_ref + utm_source ถ้าเป็นแชทใหม่และมี ref
        if (lineEventRef) {
          const utmParams = {};
          lineEventRef.split('&').forEach(part => {
            const [k, v] = part.split('=');
            if (k && v) utmParams[k] = decodeURIComponent(v);
          });
          db.query(
            `UPDATE chat_conversations SET
               line_ref = COALESCE(line_ref, ?),
               utm_source = COALESCE(utm_source, ?),
               utm_campaign = COALESCE(utm_campaign, ?)
             WHERE id = ?`,
            [lineEventRef, utmParams.utm_source || 'line', utmParams.utm_campaign || null, conv.id],
            () => {}
          );
        }

        saveMessage(conv.id, {
          platform_message_id: message.id || null,
          sender_type: 'customer',
          sender_name: displayName || '',
          message_text: msgText,
          message_type: msgType,
          attachment_url: finalAttachUrl
        }, io, (err3) => {
          if (err3) console.log('LINE webhook - save msg error:', err3.message);
          // 🤖 AI auto-reply — เฉพาะข้อความ text เท่านั้น
          if (!err3 && msgType === 'text' && msgText) {
            setImmediate(() => triggerAiReply(conv, msgText, io));
            setImmediate(() => autoTagConversation(conv, msgText, io));
          }
        });
      });
    };

    if (needsDownload) {
      downloadLineContent(message.id, (localUrl) => {
        doSave(localUrl);

        // 🔍 รูปภาพจาก LINE → keyword classify + Gemini OCR
        if (msgType === 'image' && localUrl) {
          const serverRoot   = path.join(__dirname, '..', 'public');
          const absolutePath = path.join(serverRoot, localUrl);

          // ★ Phase 1: Keyword classify (fast, no AI cost)
          // ดึง conv ใหม่เพื่อให้ได้ loan_request_id ล่าสุด แล้วค่อย classify
          findOrCreateConversation('line', userId, null, userId, null, io, (errC, convFresh) => {
            if (!errC && convFresh) {
              setImmediate(() => classifyAndSaveImage(convFresh, localUrl, io));
            }
          });

          // ★ Phase 2: Gemini OCR (async — ข้อมูลเพิ่มเติม เช่น ชื่อ, เบอร์, รายได้)
          scanDocumentWithGemini(absolutePath, (err, docData) => {
            if (err || !docData) return;

            findOrCreateConversation('line', userId, null, userId, null, io, (err2, conv) => {
              if (err2 || !conv) return;

              if (docData.doc_type === 'deed') {
                // โฉนด → deed-specific flow + save เข้า deed_images
                scanDeedImage(absolutePath, (err3, deedData) => {
                  if (!err3 && deedData) applyDeedDataToLoanRequest(conv, deedData, io, 'line', localUrl);
                });
              } else {
                // เอกสารอื่น — OCR ดึงข้อมูล + fallback image-save ถ้ายังไม่มี keyword
                applyDocumentDataToLoanRequest(conv, docData, io, 'line', localUrl);
              }
            });
          });
        }
      });
    } else {
      doSave(attachUrl);
    }
  });
}

function handleLineFollow(event, io) {
  const userId = event.source?.userId;
  if (!userId) return;

  // ✅ ดึง LINE Profile ก่อน แล้วค่อยสร้าง conversation
  getLineProfile(userId, (profile) => {
    const displayName = profile?.displayName || null;
    const pictureUrl = profile?.pictureUrl || null;

    findOrCreateConversation('line', userId, displayName, userId, pictureUrl, io, (err, conv) => {
      if (err) return console.log('LINE follow error:', err.message);

      saveMessage(conv.id, {
        sender_type: 'customer',
        sender_name: displayName || '',
        message_text: '[ผู้ใช้เริ่มติดตาม]',
        message_type: 'text'
      }, io, () => {});
    });
  });
}

// ============================================================
// 🏷️ AI AUTO-TAG — ติดแท็กอัตโนมัติจาก keyword ในข้อความลูกค้า
// ลำดับความสำคัญ: ไม่เข้าเกณฑ์ > ติดภาระ > นายหน้า > เข้าเกณฑ์
// ไม่เขียนทับ: ปิดเคส, ไม่เข้าเกณฑ์ (ถาวร)
// ============================================================
function autoTagConversation(conv, msgText, io) {
  if (!msgText) return;
  const t = msgText.toLowerCase();

  let tagName = null;

  // ❌ ไม่เข้าเกณฑ์ — ทรัพย์ที่รับไม่ได้ (highest priority)
  if (/ส\.ป\.ก|สปก|ภ\.บ\.ท|ครุฑเขียว|น\.ส\.3[^4]|นส\.?3[^4]|ที่นา|ที่ไร่|ที่สวน|ปัตตานี|ยะลา|นราธิวาส/.test(t)) {
    tagName = 'ไม่เข้าเกณฑ์';
  }
  // 🟡 ติดภาระ — หนี้เดิมสูง ยังพิจารณาได้
  else if (/ติดจำนอง|ยอดค้าง|หนี้เยอะ|ภาระหนัก|ค้างชำระ|ยอดหนี้สูง|ติดธนาคาร|ไถ่ถอน/.test(t)) {
    tagName = 'ติดภาระ';
  }
  // 🤝 นายหน้า — ตัวแทน/โบรกเกอร์
  else if (/นายหน้า|ตัวแทน|คอมมิชชั่น|commission|broker|ค่านำ/.test(t)) {
    tagName = 'นายหน้า';
  }
  // 🟢 เข้าเกณฑ์ — ส่งโฉนดหรือบอกประเภททรัพย์ที่รับได้
  else if (/โฉนด|น\.ส\.4|นส\.?4|บ้านเดี่ยว|ทาวน์เฮ้าส์|ทาวน์โฮม|คอนโด|อาคารพาณิชย์|ตึกแถว|อพาร์|โรงงาน|โกดัง/.test(t)) {
    tagName = 'เข้าเกณฑ์';
  }

  if (!tagName) return;

  // ดึง tag_id ปัจจุบัน + ชื่อ
  db.query(
    `SELECT c.tag_id, ct.name AS tag_name
     FROM chat_conversations c
     LEFT JOIN chat_tags ct ON ct.id = c.tag_id
     WHERE c.id = ?`,
    [conv.id],
    (err, rows) => {
      if (err || !rows[0]) return;
      const currentTagName = rows[0].tag_name;

      // ห้ามเขียนทับ: ปิดเคส, ไม่เข้าเกณฑ์ (ตั้งถาวรแล้ว)
      if (currentTagName === 'ปิดเคส' || currentTagName === 'ไม่เข้าเกณฑ์') return;
      // ถ้าแท็กเดิมเหมือนกันอยู่แล้ว → ไม่ต้องทำอะไร
      if (currentTagName === tagName) return;

      // หา tag id จากชื่อ
      db.query('SELECT id FROM chat_tags WHERE name = ? LIMIT 1', [tagName], (err2, tagRows) => {
        if (err2 || !tagRows[0]) return;
        const newTagId = tagRows[0].id;

        db.query(
          'UPDATE chat_conversations SET tag_id = ? WHERE id = ?',
          [newTagId, conv.id],
          (err3) => {
            if (err3) return;
            console.log(`[AutoTag] conv ${conv.id}: "${currentTagName || 'ไม่มี'}" → "${tagName}"`);
            if (io) io.emit('tag_auto_set', { conv_id: conv.id, tag_id: newTagId, tag_name: tagName });
          }
        );
      });
    }
  );
}

// ============================================================
// 🤖 AI AUTO-REPLY — ตรวจ reply_mode แล้วให้ Gemini 1.5 Flash ตอบ
// ============================================================
function triggerAiReply(conv, customerText, io) {
  if (!customerText || !customerText.trim()) return; // ไม่ตอบข้อความว่าง/รูป

  // ดึง reply_mode + active_flow_id ล่าสุดจาก DB
  db.query(
    `SELECT c.reply_mode, c.customer_name, c.customer_line_name,
            c.active_flow_id, cf.ai_system_prompt as flow_prompt
     FROM chat_conversations c
     LEFT JOIN chat_flows cf ON cf.id = c.active_flow_id
     WHERE c.id = ?`,
    [conv.id],
    (err, rows) => {
      if (err || !rows || rows.length === 0) return;
      if (rows[0].reply_mode !== 'ai') return; // ไม่ใช่ AI mode → ออก

      const customerName = rows[0].customer_line_name || rows[0].customer_name || 'ลูกค้า';
      const flowPrompt   = rows[0].flow_prompt || null; // system prompt จาก flow (อาจเป็น null)
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return console.warn('[AI Reply] ไม่มี GEMINI_API_KEY');

      // ดึง 10 ข้อความล่าสุดเป็น context
      db.query(
        `SELECT sender_type, message_text FROM chat_messages
         WHERE conversation_id = ? AND message_type = 'text'
         ORDER BY id DESC LIMIT 10`,
        [conv.id],
        (err2, msgRows) => {
          if (err2) return;

          const history = (msgRows || []).slice().reverse()
            .filter(m => m.message_text && m.message_text.trim())
            .map(m => {
              const role = m.sender_type === 'customer' ? `[ลูกค้า] ${m.message_text}` :
                           m.sender_type === 'ai'       ? `[AI] ${m.message_text}` :
                                                          `[เซลล์] ${m.message_text}`;
              return role;
            })
            .join('\n');

          // ── System prompt: ใช้จาก flow ถ้ามี, ไม่งั้น fallback default ────
          const DEFAULT_SYSTEM = `คุณเป็นผู้ช่วยฝ่ายขายสินเชื่อจำนองและขายฝากของบริษัท LOAN DD
ตอบภาษาไทย สุภาพ กระชับ เป็นมิตร ไม่เกิน 3-4 ประโยค
ห้ามสัญญาอนุมัติ ห้ามบอกดอกเบี้ยชัดเจนโดยไม่มีข้อมูลทรัพย์
ถ้าลูกค้าถามเรื่องที่ดิน/บ้าน ให้ถามพื้นที่, จังหวัด, มูลค่า
ถ้าลูกค้าต้องการนัด ให้บอกว่าเซลล์จะติดต่อกลับเร็ว ๆ นี้`;

          const systemInstruction = flowPrompt
            ? flowPrompt.trim()
            : DEFAULT_SYSTEM;

          const prompt = `${systemInstruction}

== บทสนทนาล่าสุด ==
${history}

[ลูกค้า] ${customerText}
[AI]:`;

          const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
          });

          const https = require('https');
          const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
          };

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                const aiText = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (!aiText) return console.warn('[AI Reply] Gemini ไม่คืน text');

                // บันทึกข้อความ AI ลง DB
                db.query(
                  `INSERT INTO chat_messages
                   (conversation_id, sender_type, sender_name, message_text, message_type, created_at)
                   VALUES (?, 'ai', 'AI Assistant', ?, 'text', NOW())`,
                  [conv.id, aiText],
                  (err3, insertRes) => {
                    if (err3) return console.error('[AI Reply] DB error:', err3.message);

                    // อัพเดท last_message ของ conversation
                    db.query(
                      `UPDATE chat_conversations SET last_message_text = ?, last_message_at = NOW() WHERE id = ?`,
                      [aiText, conv.id]
                    );

                    // Emit socket ให้ frontend เห็น AI reply ทันที
                    if (io) {
                      io.to('admin_room').emit('new_message', {
                        id: insertRes.insertId,
                        conversation_id: conv.id,
                        sender_type: 'ai',
                        sender_name: 'AI Assistant',
                        message_text: aiText,
                        message_type: 'text',
                        created_at: new Date().toISOString()
                      });
                    }

                    // ส่งข้อความกลับลูกค้าผ่าน LINE หรือ Facebook
                    getPlatformConfig(conv.platform, (errCfg, config) => {
                      if (errCfg || !config) return;
                      const https2 = require('https');

                      if (conv.platform === 'line') {
                        const lineBody = JSON.stringify({
                          to: conv.customer_platform_id,
                          messages: [{ type: 'text', text: aiText }]
                        });
                        const lineOpts = {
                          hostname: 'api.line.me',
                          path: '/v2/bot/message/push',
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${config.access_token}`,
                            'Content-Length': Buffer.byteLength(lineBody)
                          }
                        };
                        const lr = https2.request(lineOpts, r => r.resume());
                        lr.on('error', e => console.error('[AI Reply LINE]', e.message));
                        lr.write(lineBody); lr.end();

                      } else if (conv.platform === 'facebook') {
                        const fbBody = JSON.stringify({
                          recipient: { id: conv.customer_platform_id },
                          message: { text: aiText }
                        });
                        const fbOpts = {
                          hostname: 'graph.facebook.com',
                          path: `/v19.0/me/messages?access_token=${config.access_token}`,
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(fbBody)
                          }
                        };
                        const fr = https2.request(fbOpts, r => r.resume());
                        fr.on('error', e => console.error('[AI Reply FB]', e.message));
                        fr.write(fbBody); fr.end();
                      }

                      console.log(`🤖 [AI Reply] ส่งให้ ${customerName} (conv#${conv.id}): "${aiText.substring(0, 50)}..."`);
                    });
                  }
                );
              } catch (e) {
                console.error('[AI Reply] parse error:', e.message);
              }
            });
          });
          req.on('error', e => console.error('[AI Reply] request error:', e.message));
          req.write(body); req.end();
        }
      );
    }
  );
}

// Export functions เพื่อให้ chatController เรียกใช้ได้
exports.autoCreateLoanRequest = autoCreateLoanRequest;
exports.updateLoanRequestFromChat = updateLoanRequestFromChat;
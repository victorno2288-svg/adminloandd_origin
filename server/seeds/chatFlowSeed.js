/**
 * chatFlowSeed.js
 * รัน: node server/seeds/chatFlowSeed.js
 * หรือเรียกผ่าน POST /api/admin/chat-flow/seed  (super_admin only)
 *
 * สร้าง Flow ตัวอย่าง 2 อัน:
 *  1. "สมัครสินเชื่อ – จำนอง / ขายฝาก"  ← หลัก
 *  2. "สอบถามทั่วไป"                     ← เสริม
 */

const db = require('../config/db')  // ใช้ config/db เหมือนกับ controllers อื่น
const q  = (sql, args) => new Promise((res, rej) => db.query(sql, args, (e, r) => e ? rej(e) : res(r)))

// ─── Flow 1: สมัครสินเชื่อ ─────────────────────────────────────────────────
const FLOW_LOAN = {
  flow_name:        'สมัครสินเชื่อ – จำนอง / ขายฝาก',
  channel:          'both',
  description:      'Flow หลัก — บอทเก็บข้อมูลลูกค้าให้ครบก่อน ทีมงานค่อยโทรกลับ',
  is_active:        1,
  sort_order:       1,
  // คำที่ลูกค้าพิมพ์มาแล้วบอทจะเริ่ม Flow นี้ทันที (case-insensitive, trim)
  trigger_keywords: 'จำนอง,ขายฝาก,สมัครสินเชื่อ,กู้เงิน,ต้องการเงิน,ขอสินเชื่อ,สินเชื่อ,จำนองที่ดิน,จำนองบ้าน,ขายฝากที่ดิน,ขายฝากบ้าน,วงเงิน,ต้องการวงเงิน,สนใจสินเชื่อ,mortgage,loan',
}

const QUESTIONS_LOAN = [
  // ── Step 1: ทักทาย (ไม่ถาม — แค่แนะนำตัวบริษัท) ─────────────────────────
  {
    step_number:    1,
    question_text:  'สวัสดีครับ 🙏\n\nยินดีต้อนรับสู่ LoanDD — บริการสินเชื่อจำนองและขายฝากที่ดิน ดำเนินการโดยทีมผู้เชี่ยวชาญ\n\nอนุมัติเร็ว ได้เงินไว ไม่ยุ่งยาก ✅',
    question_type:  'info',
    choices:        null,
    field_key:      null,
    is_required:    0,
    proactive_info: '📌 รับทำทั่วประเทศ | วงเงินเริ่มต้น 200,000 บาท | ดอกเบี้ยเป็นธรรม | ไม่มีค่าใช้จ่ายแอบแฝง',
    wait_seconds:   1,
    sort_order:     1,
  },

  // ── Step 2: ประเภทบริการ ──────────────────────────────────────────────────
  {
    step_number:    2,
    question_text:  'สนใจบริการด้านไหนครับ?',
    question_type:  'choice',
    choices:        JSON.stringify([
      '💰 จำนอง  (กรรมสิทธิ์ยังเป็นของคุณ)',
      '📋 ขายฝาก (โอนกรรมสิทธิ์ชั่วคราว วงเงินสูงกว่า)',
      '❓ แค่สอบถามข้อมูลก่อน',
    ]),
    field_key:      'loan_type',
    is_required:    1,
    proactive_info: '📖  จำนอง = คุณยังเป็นเจ้าของทรัพย์ เพียงนำโฉนดวางค้ำประกัน\n    ขายฝาก = โอนกรรมสิทธิ์ให้เราชั่วคราว ได้วงเงินสูงขึ้น และสามารถซื้อคืนได้',
    wait_seconds:   0,
    sort_order:     2,
  },

  // ── Step 3: ชื่อ-นามสกุล ─────────────────────────────────────────────────
  {
    step_number:    3,
    question_text:  'ขอทราบชื่อ-นามสกุลครับ 😊',
    question_type:  'text',
    choices:        null,
    field_key:      'customer_name',
    is_required:    1,
    proactive_info: null,
    wait_seconds:   0,
    sort_order:     3,
  },

  // ── Step 4: เบอร์โทร ─────────────────────────────────────────────────────
  {
    step_number:    4,
    question_text:  'เบอร์โทรศัพท์ที่ให้ทีมงานติดต่อกลับครับ?',
    question_type:  'text',
    choices:        null,
    field_key:      'phone',
    is_required:    1,
    proactive_info: '📞 เราจะโทรกลับภายใน 15 นาทีในวันและเวลาทำการ (จ-ศ 8:30-17:30 น.)',
    wait_seconds:   0,
    sort_order:     4,
  },

  // ── Step 5: จังหวัดที่ตั้งทรัพย์ ─────────────────────────────────────────
  {
    step_number:    5,
    question_text:  'ทรัพย์สินที่จะนำมาเป็นหลักประกัน ตั้งอยู่จังหวัดอะไรครับ?',
    question_type:  'text',
    choices:        null,
    field_key:      'asset_province',
    is_required:    1,
    proactive_info: '📍 เรารับทำทั่วประเทศ — พื้นที่กรุงเทพฯ และปริมณฑลอนุมัติเร็วที่สุด',
    wait_seconds:   0,
    sort_order:     5,
  },

  // ── Step 6: ประเภทหลักประกัน ─────────────────────────────────────────────
  {
    step_number:    6,
    question_text:  'ทรัพย์สินที่จะนำมาเป็นหลักประกันเป็นประเภทไหนครับ?',
    question_type:  'choice',
    choices:        JSON.stringify([
      '🌾 ที่ดินเปล่า (โฉนด น.ส.4 / น.ส.3)',
      '🏠 บ้านพร้อมที่ดิน',
      '🏘 ทาวน์เฮ้าส์ / ทาวน์โฮม',
      '🏢 ห้องชุด / คอนโดมิเนียม',
      '🏭 อาคารพาณิชย์ / สำนักงาน',
    ]),
    field_key:      'asset_type',
    is_required:    1,
    proactive_info: null,
    wait_seconds:   0,
    sort_order:     6,
  },

  // ── Step 7: วงเงินที่ต้องการ ──────────────────────────────────────────────
  {
    step_number:    7,
    question_text:  'ต้องการวงเงินประมาณเท่าไหร่ครับ? (ระบุเป็นตัวเลข บาท)',
    question_type:  'number',
    choices:        null,
    field_key:      'loan_amount',
    is_required:    1,
    proactive_info: '💡 วงเงินจริงขึ้นอยู่กับการประเมินทรัพย์ — บอกตัวเลขที่ต้องการมาได้เลย เราจะแจ้งว่าเป็นไปได้แค่ไหนครับ',
    wait_seconds:   0,
    sort_order:     7,
  },

  // ── Step 8: รูปโฉนด ──────────────────────────────────────────────────────
  {
    step_number:    8,
    question_text:  'ช่วยส่งรูปถ่ายโฉนด ทั้งด้านหน้าและด้านหลัง มาให้ครับ 📄\n\n(ถ่ายให้ชัด มองเห็นตัวอักษรได้ครบ)',
    question_type:  'image',
    choices:        null,
    field_key:      'deed_image',
    is_required:    1,
    proactive_info: '📸 ทีมประเมินจะใช้ข้อมูลจากโฉนดเพื่อดูเบื้องต้นก่อนโทรกลับ — ช่วยประหยัดเวลาของคุณได้มากครับ',
    wait_seconds:   0,
    sort_order:     8,
  },

  // ── Step 9: รูปทรัพย์ (ไม่บังคับ) ────────────────────────────────────────
  {
    step_number:    9,
    question_text:  'ถ้าสะดวก ช่วยส่งรูปถ่ายทรัพย์สินจริงๆ สัก 1-3 รูปได้เลยครับ\n\n(ไม่บังคับ กดข้ามได้เลย)',
    question_type:  'image',
    choices:        null,
    field_key:      'property_photo',
    is_required:    0,
    proactive_info: '📷 รูปทรัพย์ช่วยให้ทีมประเมินประเมินได้แม่นยำขึ้น และอาจได้วงเงินสูงขึ้นด้วยครับ',
    wait_seconds:   0,
    sort_order:     9,
  },

  // ── Step 10: สถานะสมรส ───────────────────────────────────────────────────
  {
    step_number:    10,
    question_text:  'ขอทราบสถานะสมรสครับ',
    question_type:  'choice',
    choices:        JSON.stringify([
      '👤 โสด',
      '💑 แต่งงานแล้ว (มีคู่สมรส)',
      '📝 หย่าร้าง / หม้าย',
    ]),
    field_key:      'marital_status',
    is_required:    1,
    proactive_info: '📋 ถ้าแต่งงานแล้ว คู่สมรสต้องเซ็นเอกสารด้วยครับ — ทีมงานจะแจ้งรายละเอียดเอกสารตอนโทรกลับ',
    wait_seconds:   0,
    sort_order:     10,
  },

  // ── Step 11: ขอบคุณ / สรุป ──────────────────────────────────────────────
  {
    step_number:    11,
    question_text:  'ขอบคุณมากครับ 🙏\n\nได้รับข้อมูลของคุณเรียบร้อยแล้ว!\n\nทีมงาน LoanDD จะรีบทบทวนข้อมูลและโทรกลับหาคุณโดยเร็วที่สุดนะครับ 📞',
    question_type:  'info',
    choices:        null,
    field_key:      null,
    is_required:    0,
    proactive_info: '✅ ระหว่างรอ — ถ้ามีคำถามเพิ่มเติมพิมพ์ถามได้เลยครับ ทีมงานจะตอบกลับภายในไม่นาน',
    wait_seconds:   0,
    sort_order:     11,
  },
]

// ─── Flow 2: สอบถามทั่วไป ──────────────────────────────────────────────────
const FLOW_INQUIRY = {
  flow_name:        'สอบถามทั่วไป / FAQ',
  channel:          'both',
  description:      'Flow สำหรับลูกค้าที่ยังไม่ตัดสินใจ — บอทให้ข้อมูลเบื้องต้นก่อน',
  is_active:        1,
  sort_order:       2,
  trigger_keywords: 'สวัสดี,hello,hi,หวัดดี,ดีครับ,ดีค่ะ,สอบถาม,ถามหน่อย,อยากรู้,ขอถาม,มีคำถาม,ติดต่อ,info,ข้อมูล,อยากทราบ,ช่วยด้วย,help',
}

const QUESTIONS_INQUIRY = [
  {
    step_number:    1,
    question_text:  'สวัสดีครับ! มีอะไรให้ช่วยไหมครับ? 😊\n\nพิมพ์ถามมาได้เลย หรือเลือกหัวข้อที่สนใจ',
    question_type:  'choice',
    choices:        JSON.stringify([
      '💰 อัตราดอกเบี้ยเท่าไหร่?',
      '📋 ต้องใช้เอกสารอะไรบ้าง?',
      '⏱ อนุมัติได้เร็วแค่ไหน?',
      '📍 รับพื้นที่ไหนบ้าง?',
      '🤝 อยากคุยกับทีมงาน',
    ]),
    field_key:      'other',
    is_required:    1,
    proactive_info: null,
    wait_seconds:   1,
    sort_order:     1,
  },
  {
    step_number:    2,
    question_text:  'ขอทราบชื่อและเบอร์โทรไว้สำหรับให้ทีมงานติดต่อกลับครับ\n\n(พิมพ์ชื่อ + เบอร์ในข้อความเดียวได้เลย เช่น "สมชาย 081-234-5678")',
    question_type:  'text',
    choices:        null,
    field_key:      'customer_name',
    is_required:    1,
    proactive_info: '📞 ทีมงานจะโทรกลับหาคุณภายใน 15 นาทีในเวลาทำการครับ',
    wait_seconds:   0,
    sort_order:     2,
  },
  {
    step_number:    3,
    question_text:  'ขอบคุณครับ! ทีมงานจะรีบติดต่อกลับโดยเร็ว 🙏',
    question_type:  'info',
    choices:        null,
    field_key:      null,
    is_required:    0,
    proactive_info: '✅ ระหว่างรอ — ดูข้อมูลเพิ่มเติมได้ที่เว็บไซต์ของเรา หรือพิมพ์ถามต่อได้เลยครับ',
    wait_seconds:   0,
    sort_order:     3,
  },
]

// ─── Main seed function ───────────────────────────────────────────────────────
async function seed () {
  try {
    console.log('🌱  เริ่ม seed chat flows...\n')

    // ─── Flow 1 ───
    const [existLoan] = await q(
      'SELECT id FROM chat_flows WHERE flow_name = ? LIMIT 1',
      [FLOW_LOAN.flow_name]
    ).then(r => [r[0] || null]).catch(() => [null])

    let flowId1
    if (existLoan) {
      console.log(`ℹ️  Flow "${FLOW_LOAN.flow_name}" มีอยู่แล้ว (id=${existLoan.id}) — ข้ามการสร้าง`)
      flowId1 = existLoan.id
    } else {
      const r1 = await q('INSERT INTO chat_flows SET ?', [FLOW_LOAN])
      flowId1 = r1.insertId
      console.log(`✅  สร้าง Flow "${FLOW_LOAN.flow_name}" id=${flowId1}`)

      for (const qData of QUESTIONS_LOAN) {
        await q('INSERT INTO chat_flow_questions SET ?', [{ ...qData, flow_id: flowId1 }])
      }
      console.log(`   ↳ เพิ่ม ${QUESTIONS_LOAN.length} คำถาม`)
    }

    // ─── Flow 2 ───
    const [existInq] = await q(
      'SELECT id FROM chat_flows WHERE flow_name = ? LIMIT 1',
      [FLOW_INQUIRY.flow_name]
    ).then(r => [r[0] || null]).catch(() => [null])

    let flowId2
    if (existInq) {
      console.log(`ℹ️  Flow "${FLOW_INQUIRY.flow_name}" มีอยู่แล้ว (id=${existInq.id}) — ข้ามการสร้าง`)
      flowId2 = existInq.id
    } else {
      const r2 = await q('INSERT INTO chat_flows SET ?', [FLOW_INQUIRY])
      flowId2 = r2.insertId
      console.log(`✅  สร้าง Flow "${FLOW_INQUIRY.flow_name}" id=${flowId2}`)

      for (const qData of QUESTIONS_INQUIRY) {
        await q('INSERT INTO chat_flow_questions SET ?', [{ ...qData, flow_id: flowId2 }])
      }
      console.log(`   ↳ เพิ่ม ${QUESTIONS_INQUIRY.length} คำถาม`)
    }

    console.log('\n🎉  Seed เสร็จเรียบร้อย!')
    process.exit(0)
  } catch (err) {
    console.error('❌  Seed ล้มเหลว:', err)
    process.exit(1)
  }
}

// export ด้วยเผื่อเรียกจาก controller
module.exports = { FLOW_LOAN, QUESTIONS_LOAN, FLOW_INQUIRY, QUESTIONS_INQUIRY }

// รันตรงถ้า execute โดยตรง
if (require.main === module) seed()

/**
 * Document Generator for LOAN DD (บริษัท โลนด์ ดีดี จำกัด)
 * Generates Word-compatible .doc files using HTML with Microsoft Office XML namespaces
 * 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510
 * โทร 081-638-6966
 */

const TEMPLATE_TYPES = {
  // ขายฝาก (Selling Pledge)
  SP_CONTRACT: 'sp_contract',
  SP_BROKER: 'sp_broker',
  SP_APPENDIX: 'sp_appendix',
  SP_NOTICE: 'sp_notice',
  // จำนอง (Mortgage)
  MG_LOAN: 'mg_loan',
  MG_ADDENDUM: 'mg_addendum',
  MG_APPENDIX: 'mg_appendix',
  MG_BROKER: 'mg_broker'
};

const COMPANY_INFO = {
  name: 'บริษัท โลนด์ ดีดี จำกัด',
  address: '87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510',
  header_address: '87 ถนนสุวินทวงศ์<br/>แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510',
  phone: '081-638-6966'
};

const HTML_WRAPPER = (content) => `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
  <style>
    @page { size: A4; margin: 2cm 2.5cm; }
    body { font-family: 'TH Sarabun New', 'Sarabun', serif; font-size: 16pt; line-height: 1.5; color: #000; }
    .header { text-align: center; margin-bottom: 20pt; }
    .logo-text { font-size: 24pt; font-weight: bold; color: #1a5e1f; margin-bottom: 10pt; }
    .title { font-size: 18pt; font-weight: bold; text-decoration: underline; text-align: center; margin: 20pt 0; }
    .section { margin: 12pt 0; text-indent: 60pt; text-align: justify; }
    .field { border-bottom: 1pt dotted #000; display: inline-block; min-width: 100pt; padding: 0 4pt; }
    .signature-area { margin-top: 40pt; display: table; width: 100%; }
    .signature-col { display: table-cell; width: 33%; text-align: center; padding: 10pt; vertical-align: top; }
    .signature-line { margin-top: 50pt; border-top: 1pt solid #000; }
    table { border-collapse: collapse; width: 100%; }
    td { padding: 4pt 8pt; border: 1pt solid #000; }
    th { padding: 4pt 8pt; border: 1pt solid #000; background-color: #f5f5f5; font-weight: bold; }
    .bold { font-weight: bold; }
    .footer { margin-top: 40pt; text-align: center; font-size: 12pt; color: #666; }
    ul { list-style-type: disc; margin-left: 30pt; }
    li { margin-bottom: 8pt; }
    .contract-number { text-align: center; margin-bottom: 20pt; }
    .date-line { text-align: center; margin: 20pt 0; }
  </style>
</head>
<body>
${content}
</body>
</html>`;

// Template field definitions
const TEMPLATE_FIELDS = {
  sp_contract: [
    { key: 'doc_number', label: 'เลขที่เอกสาร', type: 'text', required: false },
    { key: 'contract_date', label: 'วันที่ทำสัญญา', type: 'date', required: true },
    { key: 'buyer_name', label: 'ชื่อผู้ซื้อฝาก', type: 'text', required: true },
    { key: 'buyer_id_number', label: 'เลขบัตรประชาชนผู้ซื้อฝาก', type: 'text', required: true },
    { key: 'buyer_address', label: 'ที่อยู่ผู้ซื้อฝาก', type: 'textarea', required: true },
    { key: 'buyer_phone', label: 'เบอร์โทรผู้ซื้อฝาก', type: 'tel', required: false },
    { key: 'seller_name', label: 'ชื่อผู้ขายฝาก', type: 'text', required: true },
    { key: 'seller_id_number', label: 'เลขบัตรประชาชนผู้ขายฝาก', type: 'text', required: true },
    { key: 'seller_address', label: 'ที่อยู่ผู้ขายฝาก', type: 'textarea', required: true },
    { key: 'seller_phone', label: 'เบอร์โทรผู้ขายฝาก', type: 'tel', required: false },
    { key: 'property_code', label: 'รหัสทรัพย์', type: 'text', required: false },
    { key: 'property_type', label: 'ประเภททรัพย์', type: 'select', options: ['ที่ดินเปล่า', 'ที่ดินพร้อมสิ่งปลูกสร้าง', 'ห้องชุด'], required: true },
    { key: 'deed_no', label: 'เลขที่โฉนด', type: 'text', required: true },
    { key: 'land_no', label: 'เลขที่ดิน', type: 'text', required: true },
    { key: 'survey_page', label: 'หน้าแปลน', type: 'text', required: false },
    { key: 'property_address', label: 'ที่ตั้งทรัพย์', type: 'textarea', required: true },
    { key: 'tambon', label: 'ตำบล', type: 'text', required: true },
    { key: 'amphoe', label: 'อำเภอ', type: 'text', required: true },
    { key: 'province', label: 'จังหวัด', type: 'text', required: true },
    { key: 'area_rai', label: 'เนื้อที่ (ไร่)', type: 'number', required: false },
    { key: 'area_ngan', label: 'เนื้อที่ (งาน)', type: 'number', required: false },
    { key: 'area_sqw', label: 'เนื้อที่ (ตร.วา)', type: 'number', required: false },
    { key: 'area_sqm', label: 'เนื้อที่ (ตร.ม.)', type: 'number', required: false },
    { key: 'contract_amount', label: 'จำนวนเงิน (ตัวเลข)', type: 'number', required: true },
    { key: 'contract_amount_text', label: 'จำนวนเงิน (ตัวอักษร)', type: 'text', required: true },
    { key: 'contract_duration', label: 'ระยะเวลา (ปี)', type: 'number', required: true },
    { key: 'redemption_date', label: 'วันกำหนดไถ่ถอน', type: 'date', required: true },
    { key: 'redemption_amount', label: 'ยอดไถ่ถอน (ตัวเลข)', type: 'number', required: true },
    { key: 'redemption_amount_text', label: 'ยอดไถ่ถอน (ตัวอักษร)', type: 'text', required: true },
    { key: 'interest_rate', label: 'อัตราดอกเบี้ย (%)', type: 'number', required: true },
    { key: 'land_office', label: 'สำนักงานที่ดิน', type: 'text', required: true },
    { key: 'witness_name', label: 'ชื่อพยาน', type: 'text', required: false }
  ],
  sp_broker: [
    { key: 'contract_date', label: 'วันที่ทำสัญญา', type: 'date', required: true },
    { key: 'broker_name', label: 'ชื่อนายหน้า', type: 'text', required: true },
    { key: 'seller_name', label: 'ชื่อผู้ขายฝาก', type: 'text', required: true },
    { key: 'seller_id_number', label: 'เลขบัตรประชาชนผู้ขายฝาก', type: 'text', required: true },
    { key: 'seller_address', label: 'ที่อยู่ผู้ขายฝาก', type: 'textarea', required: true },
    { key: 'service_fee', label: 'ค่าบริการ (ตัวเลข)', type: 'number', required: false },
    { key: 'service_fee_text', label: 'ค่าบริการ (ตัวอักษร)', type: 'text', required: false },
    { key: 'witness_name', label: 'ชื่อพยาน', type: 'text', required: false }
  ],
  sp_appendix: [
    { key: 'deed_no', label: 'เลขที่โฉนด', type: 'text', required: true },
    { key: 'land_no', label: 'เลขที่ดิน', type: 'text', required: true },
    { key: 'property_address', label: 'ที่ตั้งทรัพย์', type: 'textarea', required: true },
    { key: 'tambon', label: 'ตำบล', type: 'text', required: true },
    { key: 'amphoe', label: 'อำเภอ', type: 'text', required: true },
    { key: 'province', label: 'จังหวัด', type: 'text', required: true },
    { key: 'area_rai', label: 'เนื้อที่ (ไร่)', type: 'number', required: false },
    { key: 'area_ngan', label: 'เนื้อที่ (งาน)', type: 'number', required: false },
    { key: 'area_sqw', label: 'เนื้อที่ (ตร.วา)', type: 'number', required: false }
  ],
  sp_notice: [
    { key: 'doc_number', label: 'ฉบับที่', type: 'text', required: true },
    { key: 'contract_date', label: 'วันที่', type: 'date', required: true },
    { key: 'seller_name', label: 'ชื่อผู้ขายฝาก', type: 'text', required: true },
    { key: 'seller_id_number', label: 'เลขบัตรประชาชน', type: 'text', required: false },
    { key: 'property_code', label: 'รหัสทรัพย์', type: 'text', required: false },
    { key: 'deed_no', label: 'เลขที่โฉนด', type: 'text', required: true },
    { key: 'land_no', label: 'เลขที่ดิน', type: 'text', required: true },
    { key: 'property_address', label: 'ที่ตั้งทรัพย์', type: 'textarea', required: true },
    { key: 'property_type', label: 'ประเภททรัพย์', type: 'select', options: ['ที่ดิน', 'ห้องชุด'], required: true },
    { key: 'province', label: 'จังหวัด', type: 'text', required: true },
    { key: 'redemption_date', label: 'วันไถ่ถอน', type: 'date', required: true },
    { key: 'redemption_amount', label: 'ยอดไถ่ถอน (ตัวเลข)', type: 'number', required: true },
    { key: 'redemption_amount_text', label: 'ยอดไถ่ถอน (ตัวอักษร)', type: 'text', required: true },
    { key: 'land_office', label: 'สำนักงานที่ดิน', type: 'text', required: false }
  ],
  mg_loan: [
    { key: 'doc_number', label: 'เลขที่เอกสาร', type: 'text', required: false },
    { key: 'contract_date', label: 'วันที่ทำสัญญา', type: 'date', required: true },
    { key: 'buyer_name', label: 'ชื่อผู้ให้กู้', type: 'text', required: true },
    { key: 'buyer_id_number', label: 'เลขบัตรประชาชนผู้ให้กู้', type: 'text', required: true },
    { key: 'buyer_address', label: 'ที่อยู่ผู้ให้กู้', type: 'textarea', required: true },
    { key: 'seller_name', label: 'ชื่อผู้กู้', type: 'text', required: true },
    { key: 'seller_id_number', label: 'เลขบัตรประชาชนผู้กู้', type: 'text', required: true },
    { key: 'seller_address', label: 'ที่อยู่ผู้กู้', type: 'textarea', required: true },
    { key: 'property_code', label: 'รหัสทรัพย์', type: 'text', required: false },
    { key: 'deed_no', label: 'เลขที่โฉนด', type: 'text', required: true },
    { key: 'land_no', label: 'เลขที่ดิน', type: 'text', required: true },
    { key: 'property_address', label: 'ที่ตั้งทรัพย์', type: 'textarea', required: true },
    { key: 'tambon', label: 'ตำบล', type: 'text', required: true },
    { key: 'amphoe', label: 'อำเภอ', type: 'text', required: true },
    { key: 'province', label: 'จังหวัด', type: 'text', required: true },
    { key: 'land_office', label: 'สำนักงานที่ดิน', type: 'text', required: true },
    { key: 'contract_amount', label: 'จำนวนเงิน (ตัวเลข)', type: 'number', required: true },
    { key: 'contract_amount_text', label: 'จำนวนเงิน (ตัวอักษร)', type: 'text', required: true },
    { key: 'interest_rate', label: 'อัตราดอกเบี้ย (%)', type: 'number', required: true },
    { key: 'contract_duration', label: 'ระยะเวลา (ปี)', type: 'number', required: true },
    { key: 'redemption_date', label: 'วันกำหนดไถ่ถอน', type: 'date', required: true },
    { key: 'monthly_payment', label: 'ค่างวดรายเดือน (ตัวเลข)', type: 'number', required: false },
    { key: 'monthly_payment_text', label: 'ค่างวดรายเดือน (ตัวอักษร)', type: 'text', required: false },
    { key: 'witness_name', label: 'ชื่อพยาน', type: 'text', required: false }
  ],
  mg_addendum: [
    { key: 'contract_date', label: 'วันที่ทำสัญญา', type: 'date', required: true },
    { key: 'seller_name', label: 'ชื่อผู้กู้', type: 'text', required: true },
    { key: 'seller_id_number', label: 'เลขบัตรประชาชนผู้กู้', type: 'text', required: true },
    { key: 'property_code', label: 'รหัสทรัพย์', type: 'text', required: false },
    { key: 'witness_name', label: 'ชื่อพยาน', type: 'text', required: false }
  ],
  mg_appendix: [
    { key: 'deed_no', label: 'เลขที่โฉนด', type: 'text', required: true },
    { key: 'land_no', label: 'เลขที่ดิน', type: 'text', required: true },
    { key: 'property_address', label: 'ที่ตั้งทรัพย์', type: 'textarea', required: true },
    { key: 'tambon', label: 'ตำบล', type: 'text', required: true },
    { key: 'amphoe', label: 'อำเภอ', type: 'text', required: true },
    { key: 'province', label: 'จังหวัด', type: 'text', required: true }
  ],
  mg_broker: [
    { key: 'contract_date', label: 'วันที่ทำสัญญา', type: 'date', required: true },
    { key: 'broker_name', label: 'ชื่อนายหน้า', type: 'text', required: true },
    { key: 'seller_name', label: 'ชื่อผู้กู้', type: 'text', required: true },
    { key: 'seller_id_number', label: 'เลขบัตรประชาชนผู้กู้', type: 'text', required: true },
    { key: 'service_fee', label: 'ค่าบริการ (ตัวเลข)', type: 'number', required: false },
    { key: 'service_fee_text', label: 'ค่าบริการ (ตัวอักษร)', type: 'text', required: false },
    { key: 'witness_name', label: 'ชื่อพยาน', type: 'text', required: false }
  ]
};

// Helper functions
const formatNumber = (num) => {
  if (!num) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatField = (value) => {
  return value || '_____________';
};

const createPropertyDetails = (data) => {
  return `
    ประเภท: <span class="field">${data.property_type || '_______________'}</span>
    โฉนด: <span class="field">${data.deed_no || '_______________'}</span>
    เลขที่ดิน: <span class="field">${data.land_no || '_______________'}</span>
    ${data.survey_page ? `หน้าแปลน: <span class="field">${data.survey_page}</span>` : ''}
    ที่ตั้ง: <span class="field">${data.property_address || '_______________'}</span>
    ตำบล: <span class="field">${data.tambon || '_______________'}</span>
    อำเภอ: <span class="field">${data.amphoe || '_______________'}</span>
    จังหวัด: <span class="field">${data.province || '_______________'}</span>
    ${data.area_rai || data.area_ngan || data.area_sqw ? `
      เนื้อที่: <span class="field">${data.area_rai || '___'}</span> ไร่
      <span class="field">${data.area_ngan || '___'}</span> งาน
      <span class="field">${data.area_sqw || '___'}</span> ตร.วา
      <span class="field">${data.area_sqm || '___'}</span> ตร.ม.
    ` : ''}
  `;
};

// Template generators
const generateSpContract = (data, version = 1) => {
  const witnessName = data.witness_name || 'นางสาว อารยา เพิ่มอุตส่าห์';
  const f = (val, blank) => val || blank || '_______________';
  const fNum = (val) => val ? formatNumber(val) : '_______________';

  // ข้อ 3.1 แตกต่างตามเวอร์ชั่น
  const section31 = (version === 6) ? `
    <div class="section" style="text-indent: 90pt;">
      <b>3.1.</b> หากผู้ขายฝากต้องการไถ่ถอนทรัพย์สินที่ขายฝากก่อนครบกำหนดระยะเวลาตามสัญญาฉบับนี้
      ภายในระยะเวลา 6 เดือน ผู้ขายฝากตกลงและยินยอมชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากตามข้อ 3.
      และผู้ซื้อฝากยินยอมคืนสินไถ่ที่ได้ชำระมาตามข้อ 2. เป็นจำนวนเงิน
      <span class="field">${fNum(data.early_refund_amount)}</span> บาท
      (${f(data.early_refund_text)})
    </div>` : (version === 5) ? `
    <div class="section" style="text-indent: 90pt;">
      <b>3.1</b> หากผู้ขายฝากต้องการไถ่ถอนทรัพย์สินที่ขายฝากก่อนครบกำหนดระยะเวลาตามสัญญาฉบับนี้
      <b>ภายในระยะเวลา 6 เดือน</b> ผู้ขายฝากตกลงและยินยอมชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากเป็นจำนวน 2 งวดๆ ละ
      <span class="field">${fNum(data.early_6m_amount)}</span> บาท
      (${f(data.early_6m_text)}) เป็นจำนวนเงิน
      <span class="field">${fNum(data.early_6m_total)}</span> บาท
      (${f(data.early_6m_total_text)})
      <b>กรณีไถ่ถอนภายใน 7-12 เดือน</b> ผู้ขายฝากตกลงและยินยอมชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากตามข้อ 3
    </div>` : `
    <div class="section" style="text-indent: 90pt;">
      <b>3.1</b> หากผู้ขายฝากต้องการไถ่ถอนทรัพย์สินที่ขายฝากก่อนครบกำหนดระยะเวลาตามสัญญาฉบับนี้
      ให้ถือว่าผู้ขายฝากชำระหนี้ไม่ถูกต้องตามสัญญานี้
      ผู้ขายฝากตกลงและยินยอมชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากตามข้อ 3
    </div>`;

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญาขายฝาก</div>

    <div class="contract-number">
      เลขที่เอกสาร: <span class="field">${f(data.doc_number)}</span>
    </div>

    <p style="text-align: right;">ทำที่ ${COMPANY_INFO.name} ${COMPANY_INFO.header_address}</p>
    <p style="text-align: right;">วันที่ <span class="field">${f(data.contract_date)}</span></p>

    <div class="section">
      สัญญาฉบับนี้ทำขึ้น ระหว่าง นาย/นาง/นางสาว/บจก./หจก.
      <span class="field">${f(data.buyer_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.buyer_id_number)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.buyer_address)}</span>
      เบอร์ <span class="field">${f(data.buyer_phone)}</span>
      ซึ่งต่อไปนี้เรียกว่า <span class="bold">"ผู้ซื้อฝาก"</span> ฝ่ายหนึ่งกับ
    </div>

    <div class="section">
      นาย/นาง/นางสาว/บจก./หจก.
      <span class="field">${f(data.seller_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.seller_id_number)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.seller_address)}</span>
      เบอร์ <span class="field">${f(data.seller_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้ขายฝาก"</span>
      รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง
    </div>

    <div class="section">คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญากันตามรายละเอียดดังต่อไปนี้</div>

    <div class="section">
      <span class="bold">ข้อ 1.</span> ผู้ขายฝากตกลงขายฝาก และผู้ซื้อฝากตกลงรับซื้อฝาก
      ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง <span class="field">${f(data.property_type)}</span>
      เลขที่ <span class="field">${f(data.address_no)}</span>
      โฉนดเลขที่ <span class="field">${f(data.deed_no)}</span>
      เลขที่ดิน <span class="field">${f(data.land_no)}</span>
      หน้าสำรวจ <span class="field">${f(data.survey_page)}</span>
      ตำบล <span class="field">${f(data.tambon)}</span>
      อำเภอ <span class="field">${f(data.amphoe)}</span>
      จังหวัด <span class="field">${f(data.province)}</span>
      เนื้อที่รวม <span class="field">${f(data.land_area)}</span>
      โดยผู้ขายฝากรับรองว่า ผู้ขายฝากเป็นเจ้าของผู้มีกรรมสิทธิ์และมีสิทธิโดยชอบด้วยกฎหมายแต่เพียงผู้เดียว
      ในการเข้าทำสัญญานี้และขายฝากทรัพย์สินที่ขายฝากได้ โดยปราศจากการโต้แย้งและการรอนสิทธิใด ๆ ทั้งสิ้น
      รวมถึงไม่ติดค้างชำระค่าภาษีอากร ค่าธรรมเนียมใด ๆ และรวมถึงไม่ติดค้างค่าสาธารณูปโภคใด ๆ
      อันเกี่ยวกับทรัพย์สินที่ขายฝากทั้งสิ้น และผู้ขายฝากไม่ได้อยู่ในระหว่างการพิจารณาคดีหย้าร้าง
      อันมีทรัพย์สินที่ขายฝากเป็นสินสมรส และไม่ได้เป็นหรือจะเป็นบุคคลล้มละลาย
      หรือเป็นผู้มีหนี้สินล้นพ้นตัวตามกฎหมาย และไม่เคยถูกศาลสั่งพิทักษ์ทรัพย์ในคดีล้มละลายมาก่อน
      หรือถูกฟ้องเป็นคดีล้มละลาย โดยผู้ขายฝากขอรับรองว่าการทำสัญญานี้สมบูรณ์ชอบด้วยกฎหมายทุกประการ
      และจะไม่มีการเพิกถอนนิติกรรมในภายหลัง ไม่ว่าจะกรณีใด ๆ
    </div>

    <div class="section">
      <span class="bold">ข้อ 2.</span> ผู้ขายฝากตกลงทำการขายฝากและผู้ซื้อฝากตกลงรับซื้อฝากทรัพย์สินที่ขายฝากตามข้อ 1. ในราคา
      <span class="field">${fNum(data.contract_amount)}</span> บาท
      (${f(data.contract_amount_text, '_________________________________')} บาท)
      โดยผู้ซื้อฝากตกลงจะชำระราคาค่าทรัพย์สินที่ขายฝากและส่งมอบให้แก่ผู้ขายฝาก
      ในวันที่ดำเนินการจดทะเบียนขายฝากตามข้อ 5. แล้วเสร็จ
      ผู้ขายฝากตกลงรับผิดชอบทั้งสิ้นแต่เพียงผู้เดียวในบรรดาค่าอากรแสตมป์ และ/หรือค่าภาษีธุรกิจเฉพาะ
      ภาษีเงินได้หัก ณ ที่จ่าย ภาษีอื่นใด รวมถึงค่าใช้จ่ายใด ๆ อันเกี่ยวกับการจดทะเบียนขายฝากและการไถ่ถอนทรัพย์สินที่ขายฝาก
      รวมถึงแต่ไม่จำกัดเพียง ค่าภาษีที่ดินและสิ่งปลูกสร้าง รวมถึงชำระค่าน้ำ ค่าไฟ ค่าโทรศัพท์ค่าประกันอัคคีภัย
      และอื่นๆ ที่ผู้ขายฝากนำมาใช้กับที่ดินและสิ่งปลูกสร้าง
      ทั้งนี้ ผู้ขายฝากตกลงชำระสินไถ่ให้แก่ผู้ซื้อฝากบางส่วนในวันที่จดทะเบียนขายฝากต่อหน้าเจ้าหน้าที่เป็นเงินจำนวน
      <span class="field">${fNum(data.upfront_payment)}</span> บาท
      (${f(data.upfront_payment_text, '_________________________________')})
    </div>

    <div class="section">
      <span class="bold">ข้อ 3.</span> ผู้ขายฝากสัญญาว่าจะไถ่ถอนคืนทรัพย์สินที่ขายฝากตามสัญญานี้
      ภายในระยะเวลา 1 (หนึ่ง) ปี นับตั้งแต่วันที่จดทะเบียนขายฝากทรัพย์สิน ตามข้อ 5.
      ในราคาสินไถ่เป็นเงินจำนวนทั้งสิ้น <span class="field">${fNum(data.redemption_amount)}</span> บาท
      (${f(data.redemption_amount_text, '_________________________________')})
      หากพ้นกำหนดระยะเวลาดังกล่าวแล้วผู้ขายฝากไม่ทำการไถ่คืน
      ทรัพย์สินที่ขายฝากตามข้อ 1. จะตกเป็นกรรมสิทธิ์โดยเด็ดขาดของผู้ซื้อฝากทันทีและไม่มีสิทธิไถ่คืนอีกต่อไป
      ทั้งนี้ ผู้ขายฝากต้องขนย้ายสิ่งของและบริวารออกจากทรัพย์สินที่ขายฝาก ภายในระยะ 7 (เจ็ด) วัน
      นับแต่วันครบระยะเวลาตามสัญญาขายฝาก หากผู้ขายฝากไม่ดำเนินการขนย้ายสิ่งของและบริวารออกไปภายในกำหนดเวลาดังกล่าว
      ผู้ซื้อฝากมีสิทธิที่จะเรียกร้องค่าเสียหาย ค่าเสียโอกาสใดๆ รวมถึงดอกเบี้ยผิดนัดในอัตราร้อยละ 15 (สิบห้า) ต่อปี
      อันเกิดจากการไม่ย้ายออกของผู้ขายฝากได้ อีกทั้ง ผู้ซื้อฝากมีสิทธิที่จะดำเนินการตามกฎหมายต่อไป
    </div>

    ${section31}

    <div class="section" style="text-indent: 90pt;">
      <b>3.2</b> กรณีที่ผู้ขายฝากต้องการขยายกำหนดระยะเวลาในการไถ่ไปอีก 1 (หนึ่ง) ปี
      สามารถกระทำได้ต่อเมื่อผู้ขายฝากได้ชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากไปแล้วไม่น้อยกว่าอัตราร้อยละ
      <span class="field">${f(data.extension_percentage, '___')}</span>
      (<span class="field">${f(data.extension_percentage_text)}</span>)
      ของมูลค่าสินไถ่ตามสัญญาฉบับนี้ ทั้งนี้การขยายระยะเวลาดังกล่าวนั้น
      ผู้ขายฝากตกลงชำระค่าสินไถ่ล่วงหน้าเป็นเงินจำนวน
      <span class="field">${fNum(data.extension_advance)}</span> บาท
      (${f(data.extension_advance_text, '_________________________________')})
      ให้แก่ผู้ซื้อฝากในอัตราร้อยละ <span class="field">${f(data.extension_rate, '___')}</span>
      ของมูลค่าสินไถ่นับแต่วันที่ผู้ซื้อฝากตกลงขยายระยะเวลา
    </div>

    <div class="section">
      <span class="bold">ข้อ 4.</span> เมื่อสัญญาฉบับนี้สิ้นสุดลงโดยตามกำหนดระยะเวลาที่ระบุไว้ในสัญญา
      และคู่สัญญาทั้งสองฝ่ายไม่ประสงค์ที่จะขยายระยะเวลาตามสัญญา
      หากปรากฏว่าที่ดินและสิ่งปลูกสร้างถูกทำลายหรือทำให้เสื่อมเสียไปอันเกิดจากความผิดของผู้ขายฝากแล้ว
      ผู้ขายฝากจะถูกดำเนินคดีทั้งทางแพ่งและทางอาญา
      และต้องเป็นผู้รับผิดชดใช้ค่าเสียหายอย่างใดๆ อันเกิดแต่การนั้นแต่เพียงผู้เดียว
    </div>

    <div class="section">
      <span class="bold">ข้อ 5.</span> คู่สัญญาทั้งสองฝ่ายตกลงจะไปดำเนินการจดทะเบียนขายฝากทรัพย์สินที่ขายฝาก
      ณ สำนักงานที่ดินซึ่งทรัพย์สินที่ขายฝากตั้งอยู่ในเขตอำนาจ
      ให้แล้วเสร็จภายในวันที่ <span class="field">${f(data.registration_deadline)}</span>
    </div>

    <div class="section">
      <span class="bold">ข้อ 6.</span> ผู้ซื้อฝากยินยอมให้ผู้ขายฝากอาศัยอยู่ในทรัพย์สินที่ขายฝากดังกล่าวได้
      โดยผู้ขายฝากมีหน้าที่และความรับผิดชอบในการดูแลรักษาทรัพย์สินที่ขายฝากไม่ให้เกิดความเสียหาย
      ตลอดระยะเวลาตามสัญญาฉบับนี้
    </div>

    <div class="section">
      <span class="bold">ข้อ 7.</span> ผู้ขายฝากทราบดีว่าผู้ซื้อฝากอาจเปิดเผยข้อมูลใด ๆ ที่ผู้ขายฝากได้ให้ไว้แก่ผู้ซื้อฝาก
      และ/หรือข้อมูลที่เกี่ยวข้องกับผู้ขายฝาก (ซึ่งไม่ใช่ข้อมูลที่ได้รับจากบริษัทข้อมูลเครดิต)
      เท่าที่จำเป็นต่อบริษัทในเครือของผู้ขายฝาก รวมถึงกรรมการ และลูกจ้างของผู้ขายฝาก
      เพื่อวัตถุประสงค์ในการจัดเก็บข้อมูล บริหาร วิเคราะห์ตรวจสอบ ทบทวน และป้องกันความเสี่ยงด้านสินเชื่อ
      ซึ่งเป็นการประมวลผลข้อมูลส่วนบุคคลบนฐานประโยชน์อันชอบธรรม
    </div>

    <div class="section">
      <span class="bold">ข้อ 8.</span> บรรดาหนังสือ จดหมายติดต่อ คำบอกกล่าวใดๆ ที่ผู้ซื้อฝากได้ส่งให้ผู้ขายฝาก
      ตามที่อยู่ที่แจ้งไว้ตามสัญญาฉบับนี้ ไม่ว่าจะโดยส่งเอง หรือส่งทางไปรษณีย์ลงทะเบียน หรือไม่ลงทะเบียน
      ให้ถือว่าได้ส่งให้แก่ผู้ขายฝากแล้วโดยชอบ ทั้งนี้ โดยไม่ต้องคำนึงถึงว่าจะมีผู้รับไว้หรือไม่
      และแม้หากส่งให้ไม่ได้เพราะย้ายที่อยู่ หรือที่อยู่เปลี่ยนแปลงไป หรือถูกรื้อถอนไปโดยมิได้มีการแจ้งการย้าย
      การเปลี่ยนแปลง หรือการรื้อถอนนั้นเป็นลายลักษณ์อักษรให้ผู้ซื้อฝากทราบก็ดี
      หรือส่งให้ไม่ได้เพราะหาที่อยู่ตามที่ระบุไว้นั้นไม่พบก็ดี
      ให้ถือว่าผู้ขายฝากได้รับและทราบหนังสือ จดหมาย หรือคำบอกกล่าวดังกล่าวแล้วโดยชอบ
    </div>

    <div class="section">
      <span class="bold">ข้อ 9.</span> การล่าช้าหรือการไม่ใช้สิทธิใด ๆ ของผู้ซื้อฝากตามข้อกำหนดหรือเงื่อนไขใด ๆ ของสัญญานี้หรือตามกฎหมาย
      ไม่ถือว่าผู้ซื้อฝากสละสิทธิหรือให้ความยินยอมในการดำเนินการใด ๆ ตามที่ผู้ซื้อฝากมีสิทธิแก่ผู้ขายฝากแต่ประการใด
      เว้นแต่ผู้ซื้อฝากจะได้ทำเป็นหนังสืออย่างชัดแจ้ง และการสละสิทธิเช่นว่านั้นให้มีผลเฉพาะสำหรับเหตุการณ์และวัตถุประสงค์นั้นเท่านั้น
    </div>

    <div class="section">
      <span class="bold">ข้อ 10.</span> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดหรือเงื่อนไขใด ๆ ในสัญญาฉบับนี้ไม่สมบูรณ์หรือเป็นโมฆะ
      หรือขัดต่อกฎหมาย หรือไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมาย
      ให้ส่วนอื่น ๆ ของข้อกำหนดและเงื่อนไขของสัญญาฉบับนี้ยังคงมีผลสมบูรณ์ชอบด้วยกฎหมาย
      และใช้บังคับได้ตามกฎหมาย และไม่ถูกกระทบหรือเสื่อมเสียไปเพราะความไม่สมบูรณ์เป็นโมฆะ
      ขัดต่อกฎหมาย ไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมายของข้อความข้อกำหนด หรือเงื่อนไขดังกล่าวนั้น
    </div>

    <div class="section">
      สัญญานี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว
      เพื่อเป็นหลักฐานคู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน ณ วันเดือนปีที่ระบุไว้ข้างต้น
      และต่างยึดถือไว้ฝ่ายละฉบับ
    </div>

    <div style="margin-top: 40pt;">
      <div class="signature-area">
        <div class="signature-col">
          <div>ลงชื่อ......................................ผู้ขายฝาก</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${f(data.seller_name)}</span>)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
        <div class="signature-col">
          <div>ลงชื่อ......................................ผู้ซื้อฝาก</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${f(data.buyer_name)}</span>)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
      </div>
      <div class="signature-area" style="margin-top: 20pt;">
        <div class="signature-col">
          <div>ลงชื่อ......................................พยาน</div>
          <div class="signature-line"></div>
          <div>(................................................................)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
        <div class="signature-col">
          <div>ลงชื่อ......................................พยาน</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${witnessName}</span>)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
      </div>
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateSpBroker = (data, version = 1) => {
  const f = (val, blank) => val || blank || '_______________';
  const fNum = (val) => val ? formatNumber(val) : '_______________';

  // ฝ่ายผู้ให้สัญญา: version 3 = บจก./หจก., version 2 = 2 บุคคล, version 1 = บุคคลเดียว
  const sellerParty = (version === 3) ? `
    <div class="section" style="text-indent: 40pt;">
      บจก./หจก. <span class="field">${f(data.seller_company)}</span>
      ทะเบียนนิติบุคคลเลขที่ <span class="field">${f(data.seller_reg_id)}</span>
      โดย <span class="field">${f(data.seller_name)}</span> กรรมการผู้มีอำนาจ
      ที่อยู่บริษัท <span class="field">${f(data.seller_address)}</span>
      เบอร์ <span class="field">${f(data.seller_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้ให้สัญญา"</span>
      รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง
    </div>` : (version === 2) ? `
    <div class="section" style="text-indent: 40pt;">
      นาย/นาง/นางสาว <span class="field">${f(data.seller_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.seller_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.seller_address)}</span>
      และ นาย/นาง/นางสาว <span class="field">${f(data.seller_name2)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.seller_id2)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.seller_address2)}</span>
      เบอร์ <span class="field">${f(data.seller_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้ให้สัญญา"</span>
      รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง
    </div>` : `
    <div class="section" style="text-indent: 40pt;">
      นาย/นาง/นางสาว <span class="field">${f(data.seller_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.seller_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.seller_address)}</span>
      เบอร์ <span class="field">${f(data.seller_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้ให้สัญญา"</span>
      รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง
    </div>`;

  // บล็อกลายเซ็นผู้ให้สัญญา
  const sigSeller = (version === 3) ? `
    <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 12pt;">บจก./หจก. <span class="field">${f(data.seller_company)}</span></div>
    <div style="margin-top: 8pt;">( <span class="field">${f(data.seller_name)}</span> )</div>` : (version === 2) ? `
    <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 20pt;">( <span class="field">${f(data.seller_name)}</span> )</div>
    <div style="margin-top: 20pt;">ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 20pt;">( <span class="field">${f(data.seller_name2)}</span> )</div>` : `
    <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 20pt;">( <span class="field">${f(data.seller_name)}</span> )</div>`;

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญาแต่งตั้งนายหน้าขายฝาก</div>

    <p style="text-align: right;">ทำที่ ${COMPANY_INFO.name} ${COMPANY_INFO.header_address}</p>
    <p style="text-align: right;">วันที่ <span class="field">${f(data.contract_date, 'วัน เดือน ปี')}</span></p>

    <div class="section" style="text-indent: 40pt;">
      ระหว่าง ${COMPANY_INFO.name}
      ทะเบียนนิติบุคคลเลขที่ <span class="field">${f(data.company_id, '0105566225836')}</span>
      โดย นาย <span class="field">${f(data.company_officer, 'วรวุฒิ กิตดิอุดม')}</span> กรรมการผู้มีอำนาจ
      สำนักงานตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร
      โทรศัพท์ <span class="field">${f(data.company_phone, '081-6386966')}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"นายหน้า"</span> ฝ่ายหนึ่ง กับ
    </div>

    ${sellerParty}

    <div class="section" style="text-indent: 40pt;">
      คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญาแต่งตั้งนายหน้าขายฝาก ดังต่อไปนี้
    </div>

    <div class="section">
      <span class="bold">ข้อ 1.</span> ผู้ให้สัญญาเป็นเจ้าของกรรมสิทธิ์
      ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง
      เลขที่ <span class="field">${f(data.address_no)}</span>
      โฉนดเลขที่ <span class="field">${f(data.deed_no)}</span>
      เลขที่ดิน <span class="field">${f(data.land_no)}</span>
      หน้าสำรวจ <span class="field">${f(data.survey_page)}</span>
      ตำบล <span class="field">${f(data.tambon)}</span>
      อำเภอ <span class="field">${f(data.amphoe)}</span>
      จังหวัด <span class="field">${f(data.province)}</span>
      เนื้อที่รวม <span class="field">${f(data.land_area, 'ไร่/งาน/ตร.วา')}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ทรัพย์สิน"</span>
      ผู้ให้สัญญาประสงค์จะขายฝากทรัพย์สินดังกล่าว ในราคา
      <span class="field">${fNum(data.contract_amount)}</span> บาท
      ( <span class="field">${f(data.contract_amount_text)}</span> )
    </div>

    <div class="section">
      <span class="bold">ข้อ 2.</span> ผู้ให้สัญญาแต่งตั้งให้นายหน้าเป็นผู้ติดต่อ จัดหา ซื้อขาย และจัดการให้ได้ทำสัญญากับนายทุนผู้ซื้อฝาก
      โดยหากผู้ให้สัญญาได้เข้าทำสัญญาขายฝากแล้ว จะดำเนินการลงนามในเอกสารแนบท้ายต่อไป
    </div>

    <div class="section">
      <span class="bold">ข้อ 3.</span> เมื่อนายทุนผู้ซื้อฝากเข้าทำสัญญาขายฝากที่สำนักงานที่ดินและได้รับชำระเงิน
    </div>

    <div class="section" style="text-indent: 40pt;">
      <span class="bold">3.1</span> ผู้ให้สัญญาตกลงชำระค่านายหน้าด้วยวิธีการโอนเงินไปยังบัญชีของนายหน้า ซึ่งมีรายละเอียดดังนี้:<br/>
      &nbsp;&nbsp;&nbsp;• ชื่อธนาคาร: <span class="field">${f(data.bank_name, 'ไทยพาณิชย์')}</span><br/>
      &nbsp;&nbsp;&nbsp;• ชื่อบัญชี: <span class="field">${f(data.account_name, 'บริษัท โลนด์ ดีดี จำกัด')}</span><br/>
      &nbsp;&nbsp;&nbsp;• สาขา: <span class="field">${f(data.branch_name, 'รามคำแหง (สัมมากร)')}</span><br/>
      &nbsp;&nbsp;&nbsp;• หมายเลขบัญชี: <span class="field">${f(data.account_number, '136-2707297')}</span>
    </div>

    <div class="section">
      <span class="bold">ข้อ 4.</span> สัญญาฉบับนี้มีกำหนดเวลา 1 (หนึ่ง) ปี นับแต่วันทำสัญญา
    </div>

    <div class="section">
      <span class="bold">ข้อ 5.</span> ผู้ให้สัญญาตกลงจะทำสัญญาขายฝากโดยจดทะเบียนฝากที่สำนักงานที่ดินภายใน 30 (สามสิบ) วัน นับจากวันทำสัญญา
      ทั้งนี้ ให้ถือว่านายหน้าได้ทำหน้าที่สมบูรณ์ตามสัญญาแล้วเมื่อพ้นกำหนดระยะเวลาดังกล่าว และยินยอมชำระค่านายหน้าตามข้อ 3
    </div>

    <div class="section" style="text-indent: 40pt;">
      <span class="bold">5.1</span> ค่าธรรมเนียมและค่าใช้จ่ายทั้งสิ้นในการจดทะเบียนขายฝาก ค่าไถ่ถอน ค่าภาษีที่ดินและสิ่งปลูกสร้าง
      ผู้ให้สัญญาจะเป็นผู้เสียเองทั้งสิ้น
    </div>

    <div class="section" style="text-indent: 40pt;">
      <span class="bold">5.2</span> ในกรณีแจ้งไถ่ถอน ผู้ให้สัญญาจะแจ้งให้นายหน้าทราบล่วงหน้าไม่ต่ำกว่า 15 (สิบห้า) วัน
      และมีค่าใช้จ่ายในการดำเนินการไถ่ถอนเป็นจำนวนเงิน
      <span class="field">${fNum(data.redemption_fee)}</span> บาท
      ( <span class="field">${f(data.redemption_fee_text)}</span> )
    </div>

    <div class="section" style="text-indent: 40pt;">
      <span class="bold">5.3</span> ในกรณีที่ผู้ให้สัญญาไม่ทราบราคาประเมินทรัพย์สินและต้องการให้นายหน้าเป็นผู้ประเมินราคา
      ผู้ให้สัญญาตกลงชำระค่าประเมินจำนวน
      <span class="field">${fNum(data.appraisal_fee)}</span> บาท
      ( <span class="field">${f(data.appraisal_fee_text)}</span> )
    </div>

    <div class="section">
      <span class="bold">ข้อ 6.</span> ในระหว่างที่สัญญานี้ยังมีผลบังคับใช้ ผู้ให้สัญญาตกลงว่าจะไม่ทำสัญญาแต่งตั้งนายหน้าหรือตัวแทนแต่เพียงผู้เดียวกับบุคคลหรือนิติบุคคลอื่นสำหรับการขายฝากทรัพย์สินดังกล่าว
      นอกจากนี้ ผู้ให้สัญญาตกลงว่าจะไม่ยกเลิกสัญญาฉบับนี้ก่อนครบกำหนดเวลา ในกรณีผิดสัญญา ผู้ให้สัญญาตกลงจะชำระค่านายหน้าตามข้อ 3
    </div>

    <div class="section">
      <span class="bold">ข้อ 7.</span> หากนายหน้าจัดหานายทุนผู้รับซื้อฝากได้แล้ว แต่ผู้ให้สัญญาปฏิเสธไม่ยอมทำสัญญา
      ผู้ให้สัญญาตกลงชำระค่านายหน้าอัตราร้อยละ 1 (หนึ่ง) ของวงเงินขายฝาก
      สำหรับวงเงินต่ำกว่า 1,000,000 บาท คิดอัตราค่านายหน้าขั้นต่ำ
      <span class="field">${fNum(data.min_broker_fee_low)}</span> บาท
      สำหรับวงเงินเกินกว่า 1,000,000 บาท คิดอัตราค่านายหน้าร้อยละ 5 ขั้นต่ำ
      <span class="field">${fNum(data.min_broker_fee_high)}</span> บาท
    </div>

    <div class="section">
      <span class="bold">ข้อ 8.</span> ผู้ให้สัญญาตกลงและยินยอมรับผิดชอบ เมื่อผิดนัดชำระค่าสินไถ่เสียดอกเบี้ยผิดนัดร้อยละ 1 (หนึ่ง) ของวงเงินขายฝาก
    </div>

    <div class="section">
      <span class="bold">ข้อ 9.</span> ผู้ให้สัญญาตกลงและอนุญาตให้นายหน้าเปิดเผยข้อมูลใดๆ เท่าที่จำเป็นต่อวัตถุประสงค์เกี่ยวกับสัญญานี้
    </div>

    <div class="section">
      <span class="bold">ข้อ 10.</span> การล่าช้าหรือการไม่ใช้สิทธิ์ใดๆ ของนายหน้า ไม่ถือว่านายหน้าสละสิทธิ์ดังกล่าว
    </div>

    <div class="section">
      <span class="bold">ข้อ 11.</span> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดใดไม่สมบูรณ์หรือเป็นโมฆะ ให้ส่วนอื่นๆ ยังคงมีผลบังคับใช้
    </div>

    <div class="section">
      <span class="bold">ข้อ 12.</span> เมื่อสัญญาฉบับนี้สิ้นสุดลง หากนายหน้ายังไม่สามารถทำให้ได้เข้าทำสัญญากับนายทุนผู้ซื้อฝากได้
      ผู้ให้สัญญาไม่ต้องเสียค่าใช้จ่าย เว้นแต่เป็นบุคคลหรือผู้ที่ได้รับการซื้อขายจากบุคคลที่นายหน้าเคยติดต่อแนะนำ
    </div>

    <div class="section">
      <span class="bold">ข้อ 13.</span> ในกรณีมีข้อเรียกร้องหรือข้อพิพาทใดๆ คู่สัญญาตกลงให้จัดการโดยศาลยุติธรรม
    </div>

    <div class="section">
      <span class="bold">ข้อ 14.</span> ห้ามคู่สัญญาฝ่ายใดโอนสิทธิ์หรือหน้าที่ตามสัญญานี้ให้แก่บุคคลอื่น
    </div>

    <div class="section">
      สัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว
      เพื่อเป็นหลักฐาน คู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน
    </div>

    <div style="margin-top: 28pt; display: table; width: 100%;">
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        ${sigSeller}
      </div>
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................นายหน้า</div>
        <div style="margin-top: 8pt;">${COMPANY_INFO.name}</div>
        <div style="margin-top: 8pt;">นางสาว <span class="field">${f(data.broker_officer, 'อารยา เพิ่มอุตส่าห์')}</span></div>
        <div style="margin-top: 4pt; font-size: 12pt;">เจ้าหน้าที่นิติกรรม</div>
      </div>
    </div>

    <div style="margin-top: 24pt; display: table; width: 100%;">
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................พยาน</div>
        <div style="margin-top: 20pt;">( <span class="field">${f(data.witness1, 'นางสาว พิสชา วงษา')}</span> )</div>
      </div>
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................พยาน</div>
        <div style="margin-top: 20pt;">( <span class="field">${f(data.witness2)}</span> )</div>
      </div>
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateSpAppendix = (data, version = 1) => {
  const f = (val, blank) => val || blank || '_______________';
  const fNum = (val) => val ? formatNumber(val) : '_______________';

  // ฝ่ายผู้ให้สัญญา: version 1 = 1 บุคคล, version 2/3 = 2 บุคคล
  const clientParty = (version >= 2) ? `
    <div class="section">
      ตามที่ นาย/นาง/นางสาว <span class="field">${f(data.seller_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.seller_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.seller_address)}</span>
      และ นาย/นาง/นางสาว <span class="field">${f(data.seller_name2)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.seller_id2)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.seller_address2)}</span>
      เบอร์ <span class="field">${f(data.seller_phone)}</span>
      <span class="bold">"ผู้ให้สัญญา"</span>
    </div>` : `
    <div class="section">
      ตามที่ นาย/นาง/นางสาว <span class="field">${f(data.seller_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.seller_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.seller_address)}</span>
      เบอร์ <span class="field">${f(data.seller_phone)}</span>
      <span class="bold">"ผู้ให้สัญญา"</span>
    </div>`;

  // บล็อกลายเซ็นผู้ให้สัญญา: version 1 = 1 คน, version 2/3 = 2 คน
  const sigSeller = (version >= 2) ? `
    <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 20pt;">( <span class="field">${f(data.seller_name)}</span> )</div>
    <div style="margin-top: 20pt;">ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 20pt;">( <span class="field">${f(data.seller_name2)}</span> )</div>` : `
    <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 20pt;">( <span class="field">${f(data.seller_name)}</span> )</div>`;

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">เอกสารแนบท้ายสัญญาแต่งตั้งนายหน้าขายฝาก</div>

    <div class="section">
      สัญญาฉบับนี้ทำขึ้น ณ สำนักงาน โลนด์ ดีดี จำกัด ตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร
      เมื่อวันที่ <span class="field">${f(data.appendix_date, 'วัน เดือน ปี')}</span>
    </div>

    ${clientParty}

    <div class="section">
      ได้ตกลงทำสัญญาแต่งตั้งนายหน้าขายฝาก ฉบับลงวันที่ <span class="field">${f(data.main_contract_date)}</span>
      กับ <span class="bold">บริษัท โลนด์ ดีดี จำกัด ("นายหน้า")</span>
      ทะเบียนนิติบุคคลเลขที่ <span class="field">${f(data.company_id, '0105566225836')}</span>
      โดย นาย <span class="field">${f(data.company_officer, 'วรวุฒิ กิตดิอุดม')}</span> กรรมการผู้มีอำนาจ
      สำนักงานตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร
      โทรศัพท์ <span class="field">${f(data.company_phone, '081-6386966')}</span>
    </div>

    <div class="section">
      บัดนี้ ข้าพเจ้าผู้ให้สัญญาได้เข้าทำสัญญากับนายทุนผู้รับซื้อฝาก
      <span class="bold"><span class="field">${f(data.property_type_full, 'ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง')}</span></span>
      เลขที่ <span class="field">${f(data.address_no)}</span>
      โฉนดเลขที่ <span class="field">${f(data.deed_no)}</span>
      เลขที่ดิน <span class="field">${f(data.land_no)}</span>
      หน้าสำรวจ <span class="field">${f(data.survey_page)}</span>
      ตำบล <span class="field">${f(data.tambon)}</span>
      อำเภอ <span class="field">${f(data.amphoe)}</span>
      จังหวัด <span class="field">${f(data.province)}</span>
      เนื้อที่รวม <span class="field">${f(data.land_area, 'ไร่/งาน/ตารางวา/ตารางเมตร')}</span>
      <span class="bold">กำหนดเวลาไถ่คืนภายใน 1 ปี</span>
      และกำหนดสินไถ่ได้ว่าเป็นเงิน <span class="field">${fNum(data.redemption_price)}</span> บาท
      ( <span class="field">${f(data.redemption_price_text)}</span> )
      และมี<span class="bold">ค่าบริการเพิ่มเติม</span>จำนวน <span class="field">${f(data.additional_fee)}</span>
    </div>

    <div class="section">
      โดยได้จดทะเบียนกับกรมที่ดินแล้วเมื่อวันที่ <span class="field">${f(data.registration_date)}</span>
      ดังนั้น ผู้ให้สัญญาจึงได้ลงนามเอกสารแนบท้ายสัญญาแต่งตั้งนายหน้าขายฝากฉบับนี้
      เพื่อให้เป็นไปตามเงื่อนไขของสัญญาแต่งตั้งนายหน้าขายฝากฉบับวันที่ <span class="field">${f(data.original_contract_date)}</span>
    </div>

    <div class="section">
      สัญญาฉบับนี้ถือเป็นส่วนหนึ่งของสัญญาแต่งตั้งนายหน้าขายฝาก คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว
      จึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน และต่างยึดถือไว้ฝ่ายละฉบับ
    </div>

    <div style="margin-top: 28pt; display: table; width: 100%;">
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        ${sigSeller}
      </div>
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................นายหน้า</div>
        <div style="margin-top: 8pt;">${COMPANY_INFO.name}</div>
        <div style="margin-top: 8pt;">( นางสาว อารยา เพิ่มอุตส่าห์ )</div>
        <div style="margin-top: 4pt; font-size: 12pt;">เจ้าหน้าที่นิติกรรม</div>
      </div>
    </div>

    <div style="margin-top: 24pt; display: table; width: 100%;">
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................พยาน</div>
        <div style="margin-top: 20pt;">( <span class="field">${f(data.witness1)}</span> )</div>
      </div>
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................พยาน</div>
        <div style="margin-top: 20pt;">( นางสาว พิสชา วงษา )</div>
      </div>
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateSpNotice = (data, version = 1) => {
  const f = (val, blank) => val || blank || '_______________';
  const fNum = (val) => val ? formatNumber(val) : '_______________';

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">หนังสือแจ้งเตือนเรื่องครบกำหนดไถ่ถอน</div>

    <p style="text-align: right;">
      ฉบับที่ <span class="field">${f(data.notice_number, 'เลขที่')}</span>/2568<br/>
      วันที่ <span class="field">${f(data.notice_date, 'วัน เดือน ปี')}</span>
    </p>

    <div class="section" style="text-indent: 0;">
      เรียน: นาย/นาง/นางสาว/บจก./หจก. <span class="field">${f(data.seller_name)}</span>
    </div>

    <div class="section" style="text-indent: 0;">
      <span class="bold">เรื่อง:</span> แจ้งเตือนครบกำหนดไถ่ถอนทรัพย์สิน
    </div>

    <div class="section" style="text-indent: 0;">
      <span class="bold">อ้างอิง:</span> หนังสือสัญญาขายฝาก ณ สำนักงานที่ดินจังหวัด <span class="field">${f(data.province)}</span>
    </div>

    <div class="section" style="text-indent: 40pt;">
      ตามที่ท่านได้ทำสัญญาขายฝากกับ นาย/นาง/นางสาว/บจก./หจก.
      <span class="field">${f(data.buyer_name, 'บริษัท โลนด์ ดีดี จำกัด')}</span>
      โดยมีรายละเอียดของทรัพย์สินดังนี้:
    </div>

    <div class="section" style="text-indent: 60pt;">
      • ประเภททรัพย์: <span class="field">${f(data.property_type_full, 'ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง')}</span><br/>
      • ที่ตั้ง: เลขที่ <span class="field">${f(data.address_no)}</span><br/>
      • โฉนดเลขที่ <span class="field">${f(data.deed_no)}</span><br/>
      • เลขที่ดิน <span class="field">${f(data.land_no)}</span><br/>
      • หน้าสำรวจ <span class="field">${f(data.survey_page)}</span><br/>
      • ตำบล <span class="field">${f(data.tambon)}</span><br/>
      • อำเภอ <span class="field">${f(data.amphoe)}</span><br/>
      • จังหวัด <span class="field">${f(data.province)}</span><br/>
      • เนื้อที่ <span class="field">${f(data.land_area, 'ไร่/งาน/ตร.วา/ตร.ม.')}</span>
    </div>

    <div class="section">
      กำหนดวันไถ่ถอน <span class="field">${f(data.final_redemption_date, 'วัน เดือน ปี')}</span>
    </div>

    <div class="section">
      ยอดไถ่ถอน <span class="field">${fNum(data.redemption_price)}</span> บาท
      ( <span class="field">${f(data.redemption_price_text)}</span> )
    </div>

    <div class="section">
      <span class="bold">หมายเหตุ:</span>
      นาย/นาง/นางสาว/บจก./หจก. <span class="field">${f(data.seller_name)}</span>
      ได้มอบอำนาจให้ ${COMPANY_INFO.name} ดำเนินการแจ้งเตือนถึงกำหนดเวลาและจำนวนเงินที่ต้องชำระตามกฎหมาย
    </div>

    <div class="section">
      หากท่านมีข้อสงสัยหรือต้องการข้อมูลเพิ่มเติม กรุณาติดต่อกลับมาภายในเวลาทำการ
      วันจันทร์-ศุกร์ เวลา 08.30 – 17.30 น. ที่หมายเลขโทรศัพท์
      <span class="field">${f(data.company_phone, '081-638-6966')}</span>
    </div>

    <div class="section">
      ขอแสดงความนับถือ
    </div>

    <div style="margin-top: 36pt; text-align: center;">
      <div>...............................................</div>
      <div style="margin-top: 8pt;">( นางสาว <span class="field">${f(data.officer_name, 'พิสชา วงษา')}</span> )</div>
      <div style="margin-top: 4pt;">เจ้าหน้าที่ ${COMPANY_INFO.name}</div>
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateMgLoan = (data, version = 1) => {
  const witnessName = data.witness_name || 'นางสาว อารยา เพิ่มอุตส่าห์';
  const f = (val, blank) => val || blank || '_______________';
  const fNum = (val) => val ? formatNumber(val) : '_______________';

  // คู่สัญญาฝั่งผู้ให้กู้: Ver.4 = บจก., Ver.1-3 = บุคคล
  const lenderSection = (version === 4) ? `
    <div class="section">
      สัญญาฉบับนี้ทำขึ้น ระหว่าง บจก./หจก. <span class="field">${f(data.lender_company)}</span>
      ทะเบียนนิติบุคคลเลขที่ <span class="field">${f(data.lender_reg_id)}</span>
      โดย <span class="field">${f(data.lender_first_name)}</span> กรรมการผู้มีอำนาจ
      ที่อยู่บริษัท <span class="field">${f(data.lender_address)}</span>
      เบอร์ <span class="field">${f(data.lender_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้ให้กู้"</span> ฝ่ายหนึ่ง กับ
    </div>` : `
    <div class="section">
      สัญญาฉบับนี้ทำขึ้น ระหว่าง นาย/นาง/นางสาว <span class="field">${f(data.lender_first_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.lender_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.lender_address)}</span>
      เบอร์ <span class="field">${f(data.lender_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้ให้กู้"</span> ฝ่ายหนึ่ง กับ
    </div>`;

  // คู่สัญญาฝั่งผู้กู้: Ver.2 = 2 บุคคล, Ver.3 = บจก., Ver.1/4 = บุคคลเดียว
  const borrowerSection = (version === 2) ? `
    <div class="section">
      นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.borrower_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address)}</span>
    </div>
    <div class="section">
      และ นาย/นาง/นางสาว <span class="field">${f(data.borrower_name2)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.borrower_id2)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address2)}</span>
      เบอร์ <span class="field">${f(data.borrower_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้กู้"</span> อีกฝ่ายหนึ่ง
    </div>` : (version === 3) ? `
    <div class="section">
      บจก./หจก. <span class="field">${f(data.borrower_company)}</span>
      ทะเบียนนิติบุคคลเลขที่ <span class="field">${f(data.borrower_reg_id)}</span>
      โดย <span class="field">${f(data.borrower_name)}</span> กรรมการผู้มีอำนาจ
      ที่อยู่บริษัท <span class="field">${f(data.borrower_address)}</span>
      เบอร์ <span class="field">${f(data.borrower_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้กู้"</span> อีกฝ่ายหนึ่ง
    </div>` : `
    <div class="section">
      นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.borrower_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address)}</span>
      เบอร์ <span class="field">${f(data.borrower_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้กู้"</span> อีกฝ่ายหนึ่ง
    </div>`;

  // ลายเซ็นแตกต่างตามเวอร์ชั่น
  const sigSection = (version === 2) ? `
    <div class="signature-area">
      <div class="signature-col">
        <div>ลงชื่อ......................................ผู้กู้</div>
        <div class="signature-line"></div>
        <div>(<span class="field">${f(data.borrower_name)}</span>)</div>
        <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        <div style="margin-top:16pt;">ลงชื่อ......................................ผู้กู้</div>
        <div class="signature-line"></div>
        <div>(<span class="field">${f(data.borrower_name2)}</span>)</div>
        <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
      </div>
      <div class="signature-col">
        <div>ลงชื่อ......................................ผู้ให้กู้</div>
        <div class="signature-line"></div>
        <div>(<span class="field">${f(data.lender_first_name)}</span>)</div>
        <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
      </div>
    </div>` : (version === 3) ? `
    <div class="signature-area">
      <div class="signature-col">
        <div>ลงชื่อ......................................ผู้กู้</div>
        <div class="signature-line"></div>
        <div>บจก./หจก. <span class="field">${f(data.borrower_company)}</span></div>
        <div>(<span class="field">${f(data.borrower_name)}</span>)</div>
        <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
      </div>
      <div class="signature-col">
        <div>ลงชื่อ......................................ผู้ให้กู้</div>
        <div class="signature-line"></div>
        <div>(<span class="field">${f(data.lender_first_name)}</span>)</div>
        <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
      </div>
    </div>` : (version === 4) ? `
    <div class="signature-area">
      <div class="signature-col">
        <div>ลงชื่อ......................................ผู้กู้</div>
        <div class="signature-line"></div>
        <div>(<span class="field">${f(data.borrower_name)}</span>)</div>
        <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
      </div>
      <div class="signature-col">
        <div>ลงชื่อ......................................ผู้ให้กู้</div>
        <div class="signature-line"></div>
        <div>บจก./หจก. <span class="field">${f(data.lender_company)}</span></div>
        <div>(<span class="field">${f(data.lender_first_name)}</span>)</div>
        <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
      </div>
    </div>` : `
    <div class="signature-area">
      <div class="signature-col">
        <div>ลงชื่อ......................................ผู้กู้</div>
        <div class="signature-line"></div>
        <div>(<span class="field">${f(data.borrower_name)}</span>)</div>
        <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
      </div>
      <div class="signature-col">
        <div>ลงชื่อ......................................ผู้ให้กู้</div>
        <div class="signature-line"></div>
        <div>(<span class="field">${f(data.lender_first_name)}</span>)</div>
        <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
      </div>
    </div>`;

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญากู้ยืมเงิน</div>

    <div class="contract-number">
      สัญญาเลขที่ <span class="field">${f(data.contract_number)}</span>/2568
    </div>

    <p style="text-align: center;">ทำที่ ${COMPANY_INFO.name} ${COMPANY_INFO.header_address}</p>
    <div class="date-line">วันที่ <span class="field">${f(data.contract_date)}</span></div>

    ${lenderSection}
    ${borrowerSection}

    <div class="section">คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญากันมีข้อความดังต่อไปนี้</div>

    <div class="section">
      <span class="bold">ข้อ 1.</span> "ผู้ให้กู้" ตกลงให้กู้และ "ผู้กู้" ได้ตกลงกู้ยืมเงินจาก "ผู้ให้กู้"
      เป็นเงินจำนวน <span class="field">${fNum(data.loan_amount)}</span> บาท
      (<span class="field">${f(data.loan_amount_text)}</span>)
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า "เงินสินเชื่อ"
    </div>

    <div class="section">
      <span class="bold">ข้อ 2.</span> "ผู้กู้" ตกลงให้ "ผู้ให้กู้" ส่งมอบเงินสินเชื่อให้แก่ "ผู้กู้"
      เมื่อได้จดทะเบียนจำนอง ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง
      <span class="field">${f(data.property_type_full)}</span>
      เลขที่ <span class="field">${f(data.address_no)}</span>
      โฉนดเลขที่ <span class="field">${f(data.deed_no)}</span>
      เลขที่ดิน <span class="field">${f(data.land_no)}</span>
      หน้าสำรวจ <span class="field">${f(data.survey_page)}</span>
      ตำบล <span class="field">${f(data.tambon)}</span>
      อำเภอ <span class="field">${f(data.amphoe)}</span>
      จังหวัด <span class="field">${f(data.province)}</span>
      เนื้อที่รวม <span class="field">${f(data.land_area)}</span>
      เรียบร้อยแล้ว เว้นแต่จะได้รับความยินยอมจาก "ผู้ให้กู้" เป็นอย่างอื่น
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>2.1</b> "ผู้กู้" ตกลงและยินยอมให้บรรดาทรัพย์สินที่ "ผู้กู้" ได้มอบไว้เป็นหลักประกันตามที่ระบุข้างต้นนั้น
      ให้ถือเป็นหลักประกันหนี้ และ/หรือภาระใด ๆ ทั้งหมดของ "ผู้กู้" ที่มีต่อ "ผู้ให้กู้"
      ทั้งที่มีอยู่แล้วในขณะนี้ และ/หรือจะมีต่อไปในภายหน้า
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>2.2</b> "ผู้กู้" ตกลงและยินยอมทำประกันภัยทรัพย์สินตามที่ระบุข้างต้นไว้กับบริษัทประกันภัยที่ "ผู้ให้กู้" เห็นชอบ
      ในวงเงินไม่น้อยกว่าราคาประเมินตลาดตามเล่มประเมิน หรือมูลค่าของสิ่งปลูกสร้างไม่รวมที่ดินตามสัญญาฉบับนี้
      โดยให้ "ผู้ให้กู้" เป็นผู้รับประโยชน์ตามกรมธรรม์ และ "ผู้กู้" ตกลงจะทำประกันภัยให้เสร็จสิ้นภายใน 15 วัน
      นับจากวันที่รับมอบเงินสินเชื่อตามสัญญาฉบับนี้ โดย "ผู้กู้" เป็นผู้ชำระเบี้ยประกันภัยและเสียค่าใช้จ่ายเพื่อการประกันภัยเองทั้งสิ้น
      และ "ผู้กู้" จะต่อสัญญาประกันภัยตลอดระยะเวลาที่ "ผู้กู้" เป็นหนี้ "ผู้ให้กู้"
      หาก "ผู้กู้" ไม่ทำประกันภัยหรือไม่ต่ออายุสัญญาประกันภัย "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" เป็นผู้ดำเนินการแทน
      โดยค่าใช้จ่ายเป็นของ "ผู้กู้" เอง
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>2.3</b> "ผู้กู้" จะไม่ทำให้ทรัพย์สินตามที่ระบุข้างต้นมีมูลค่าลดลงหรือเสื่อมราคา
      หรือจะไม่จำนองต่อไปอีก หรือจะไม่ทำให้เกิดบุริมสิทธิหรือภาระติดพันขึ้นบนทรัพย์สินดังกล่าว
      เว้นแต่จะได้รับความยินยอมเป็นลายลักษณ์อักษรจาก "ผู้ให้กู้" ก่อน
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>2.4</b> ในกรณีที่ "ผู้ให้กู้" ได้ใช้สิทธิบังคับจำนองเอาจากทรัพย์สินตามที่ระบุข้างต้น
      ได้เงินสุทธิจากการขายทอดตลาดไม่เพียงพอชำระหนี้ให้แก่ "ผู้ให้กู้"
      "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" บังคับชำระหนี้จากทรัพย์สินอื่นๆ ของ "ผู้กู้" จนกว่าจะได้รับชำระหนี้ครบถ้วน
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>2.5</b> "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" หรือตัวแทนของ "ผู้ให้กู้" หรือผู้ที่ได้รับมอบหมายจาก "ผู้ให้กู้"
      ดำเนินการสำรวจและประเมินราคาทรัพย์สินตามที่ระบุข้างต้น โดยจะมีการแจ้งให้ทราบล่วงหน้า
      และการดำเนินการดังกล่าวจะกระทำในระหว่างพระอาทิตย์ขึ้นถึงพระอาทิตย์ตก เว้นแต่เป็นการดำเนินการที่ต่อเนื่อง
      และหาก "ผู้ให้กู้" พบว่าหลักประกันดังกล่าวมีมูลค่าลดน้อยถอยลงเกินกว่าร้อยละ 10 ของมูลค่าหลักประกัน
      "ผู้ให้กู้" สงวนสิทธิที่จะเรียกให้ "ผู้กู้" จัดหาหลักประกันอื่นมาทดแทน
      โดย "ผู้กู้" ยินยอมชำระค่าธรรมเนียมและค่าใช้จ่ายทั้งปวงในการสำรวจและประเมินราคา
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>2.6</b> "ผู้กู้" ตกลงและยินยอมรับผิดชอบชำระค่าใช้จ่าย ค่าธรรมเนียม ค่าภาษีและค่าอากรแสตมป์
      ที่เกี่ยวข้องในการจดทะเบียนจำนองเป็นประกันรวมถึงการจดทะเบียนไถ่ถอนเองทั้งสิ้น
    </div>

    <div class="section">
      <span class="bold">ข้อ 3.</span> "ผู้กู้" ตกลงชำระดอกเบี้ยในต้นเงินที่กู้ในอัตราร้อยละ
      <span class="field">${f(data.interest_per_year)}</span>
      (<span class="field">${f(data.interest_per_year_text)}</span>) ต่อปี
      ทั้งนี้ "ผู้กู้" ตกลงและยินยอมให้ "ผู้ให้กู้" คิดดอกเบี้ยตามจำนวนวันที่ผ่านไปจริง
      โดยนับตั้งแต่วันที่ "ผู้กู้" ได้รับหรือถือว่าได้รับเงินสินเชื่อจาก "ผู้ให้กู้" จนกว่าจะชำระหนี้ครบถ้วน
    </div>

    <div class="section">
      <span class="bold">ข้อ 4.</span> "ผู้กู้" ตกลงจะชำระคืนต้นเงินสินเชื่อให้แก่ "ผู้ให้กู้"
      เมื่อครบกำหนดระยะเวลา <span class="field">${f(data.loan_term)}</span>
      (<span class="field">${f(data.loan_term_text)}</span>) เดือน
      นับแต่วันที่ "ผู้กู้" ได้รับหรือถือว่าได้รับเงินสินเชื่อจาก "ผู้ให้กู้"
      ทั้งนี้ "ผู้กู้" ตกลงและยินยอมชำระดอกเบี้ยล่วงหน้า โดยหักดอกเบี้ยคิดเป็นระยะเวลา
      <span class="field">${f(data.advance_interest_months)}</span>
      (<span class="field">${f(data.advance_interest_text)}</span>) เดือนของสินเชื่อออกจากต้นเงิน
      ในวันที่ "ผู้กู้" ได้รับหรือถือว่าได้รับเงินสินเชื่อจาก "ผู้ให้กู้"
      ในกรณีที่ "ผู้กู้" ต้องการขอขยายระยะเวลาชำระคืนต้นเงินสินเชื่อ
      "ผู้กู้" ตกลงชำระดอกเบี้ยล่วงหน้าตามระยะเวลาที่ขอขยายในวันที่ครบกำหนดชำระคืนต้นเงิน
      หาก "ผู้กู้" ฝ่าฝืนไม่ชำระดอกเบี้ยล่วงหน้าตามข้อตกลงนี้
      ให้ถือว่า "ผู้กู้" ผิดนัดชำระหนี้และ "ผู้ให้กู้" จะดำเนินคดีตามกฎหมายต่อไป
    </div>

    <div class="section">
      <span class="bold">ข้อ 5.</span> หากเกิดเหตุการณ์ใดเหตุการณ์หนึ่ง ดังจะกล่าวต่อไปนี้
      "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" มีสิทธิที่จะถือว่าเป็นกรณี "ผู้กู้" ผิดนัดชำระหนี้
      และให้ถือว่าหนี้ถึงกำหนดชำระทันที "ผู้กู้" ตกลงและยินยอมให้ "ผู้ให้กู้"
      คิดดอกเบี้ยจากเงินที่ค้างชำระทั้งหมดในอัตราร้อยละ 20 (ยี่สิบ) ต่อปี
      นับแต่วันที่ "ผู้กู้" ตกเป็นผู้ผิดนัดชำระหนี้จนกว่าจะชำระหนี้ครบถ้วน
      พร้อมด้วยค่าเสียหายและค่าใช้จ่ายทั้งหลายอันเนื่องจากการผิดนัดชำระหนี้ของ "ผู้กู้"
      รวมทั้งค่าใช้จ่ายในการเตือน เรียกร้อง ทวงถาม ดำเนินคดี และบังคับชำระหนี้จนเสร็จ ในกรณีดังต่อไปนี้
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>5.1</b> "ผู้กู้" ผิดนัดชำระเงินจำนวนใด ๆ ที่ถึงกำหนดชำระตามสัญญาให้สินเชื่อนี้
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>5.2</b> "ผู้กู้" ผิดนัดหรือผิดสัญญาอื่นใดที่ทำไว้กับ "ผู้ให้กู้"
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>5.3</b> "ผู้กู้" ไม่ปฏิบัติตามสัญญาฉบับนี้ไม่ว่าข้อหนึ่งข้อใด
      ตลอดจนคำรับรองหรือคำยืนยันใด ๆ ที่ "ผู้กู้" ให้ไว้ตามสัญญานี้
      เป็นคำรับรองหรือคำยืนยันที่ไม่เป็นความจริง หรือพิสูจน์ได้ว่าไม่เป็นความจริง
      ไม่ถูกต้อง หรืออาจจะก่อให้เกิดความเข้าใจผิดในสาระสำคัญ
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>5.4</b> "ผู้ให้กู้" ได้พิจารณาแล้วเห็นว่ามีการเปลี่ยนแปลงทางฐานะการเงินหรือรายได้ของ "ผู้กู้"
      ซึ่งเป็นสาระสำคัญอันมีผลกระทบต่อความสามารถในการชำระหนี้ของ "ผู้กู้"
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>5.5</b> "ผู้กู้" เสียชีวิต หรือตกเป็นผู้ไร้ความสามารถ หรือเป็นบุคคลผู้มีหนี้สินล้นพ้นตัว
      หรือถูกพิทักษ์ทรัพย์ หรือถูกอายัดทรัพย์ หรือทำการโอนสิทธิเพื่อประโยชน์ของเจ้าหนี้ของตน
      หรือมีการดำเนินคดีใด ๆ หรือมีการขอให้ออกคำสั่งอย่างใดๆ
      เพื่อการล้มละลาย การปรับปรุงโครงสร้างหนี้ใหม่
    </div>
    <div class="section" style="text-indent: 90pt;">
      <b>5.6</b> เจ้าของหลักประกันที่ให้ไว้เป็นประกันการชำระหนี้ตามสัญญานี้ ขอชำระหนี้ ไถ่ถอนหลักประกัน
      หรือปฏิบัติผิดสัญญาหลักประกันที่เกี่ยวข้อง หรือหลักประกันที่ได้ให้ไว้เป็นประกัน
      ถูกบังคับหลักประกันหรือถูกยึดและหรือ/อายัด ไม่ว่าตามกฎหมายล้มละลาย หรือกฎหมายอื่นใดก็ตาม
    </div>

    <div class="section">
      <span class="bold">ข้อ 6.</span> กรณีที่ "ผู้กู้" ผิดนัดชำระหนี้เงินกู้ หรือดอกเบี้ยจากการผิดนัดชำระหนี้เงินกู้เกินกว่า 30 วัน
      "ผู้ให้กู้" ขอสงวนสิทธิในการดำเนินคดีตามกฎหมาย และฟ้องร้องคดีต่อศาลได้ทันที
    </div>

    <div class="section">
      <span class="bold">ข้อ 7.</span> "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" โอนสิทธิตามสัญญานี้ไม่ว่าทั้งหมด หรือแต่เพียงบางส่วน
      ให้แก่บุคคลหรือนิติบุคคลอื่นใดได้ โดยส่งคำบอกกล่าวเป็นลายลักษณ์อักษรให้ "ผู้กู้" ทราบล่วงหน้า
      เป็นระยะเวลาไม่น้อยกว่า 30 (สามสิบ) วัน
      แต่ "ผู้กู้" ไม่มีสิทธิโอนสิทธิและหน้าที่ตามสัญญาให้สินเชื่อนี้ไม่ว่าทั้งหมดหรือบางส่วน
      ให้แก่บุคคลหรือนิติบุคคลอื่นได้
    </div>

    <div class="section">
      <span class="bold">ข้อ 8.</span> "ผู้กู้" ทราบดีว่า "ผู้ให้กู้" อาจเปิดเผยข้อมูลใด ๆ ที่ "ผู้กู้" ได้ให้ไว้แก่ "ผู้ให้กู้"
      และ/หรือข้อมูลที่เกี่ยวข้องกับ "ผู้กู้" (ซึ่งไม่ใช่ข้อมูลที่ได้รับจากบริษัทข้อมูลเครดิต)
      เท่าที่จำเป็นต่อบริษัทในเครือของ "ผู้ให้กู้" รวมถึงกรรมการ และลูกจ้างของ "ผู้ให้กู้"
      เพื่อวัตถุประสงค์ในการจัดเก็บข้อมูล บริหาร วิเคราะห์ตรวจสอบ ทบทวน และป้องกันความเสี่ยงด้านสินเชื่อ
      ซึ่งเป็นการประมวลผลข้อมูลส่วนบุคคลบนฐานประโยชน์อันชอบธรรม
    </div>

    <div class="section">
      <span class="bold">ข้อ 9.</span> บรรดาหนังสือ จดหมายติดต่อ คำบอกกล่าวใดๆ ที่ "ผู้ให้กู้" ได้ส่งให้ "ผู้กู้"
      ตามที่อยู่ที่แจ้งไว้ตามสัญญาฉบับนี้ ไม่ว่าจะโดยส่งเองหรือส่งทางไปรษณีย์ลงทะเบียน หรือไม่ลงทะเบียน
      ให้ถือว่าได้ส่งให้แก่ "ผู้กู้" แล้วโดยชอบ ทั้งนี้ โดยไม่ต้องคำนึงถึงว่าจะมีผู้รับไว้หรือไม่
      และแม้หากส่งให้ไม่ได้เพราะย้ายที่อยู่ หรือที่อยู่เปลี่ยนแปลงไป หรือถูกรื้อถอนไปโดยมิได้มีการแจ้งการย้าย
      การเปลี่ยนแปลง หรือการรื้อถอนนั้นเป็นลายลักษณ์อักษรให้ "ผู้ให้กู้" ทราบก็ดี
      หรือส่งให้ไม่ได้เพราะหาที่อยู่ตามที่ระบุไว้นั้นไม่พบก็ดี
      ให้ถือว่า "ผู้กู้" ได้รับและทราบหนังสือ จดหมาย หรือคำบอกกล่าวดังกล่าวแล้วโดยชอบ
    </div>

    <div class="section">
      <span class="bold">ข้อ 10.</span> การล่าช้าหรือการไม่ใช้สิทธิใด ๆ ของ "ผู้ให้กู้" ตามข้อกำหนดหรือเงื่อนไขใด ๆ ของสัญญานี้หรือตามกฎหมาย
      ไม่ถือว่า "ผู้ให้กู้" สละสิทธิหรือให้ความยินยอมในการดำเนินการใด ๆ ตามที่ "ผู้ให้กู้" มีสิทธิแก่ "ผู้กู้" แต่ประการใด
      เว้นแต่ "ผู้ให้กู้" จะได้ทำเป็นหนังสืออย่างชัดแจ้ง และการสละสิทธิเช่นว่านั้นให้มีผลเฉพาะสำหรับเหตุการณ์และวัตถุประสงค์นั้นเท่านั้น
    </div>

    <div class="section">
      <span class="bold">ข้อ 11.</span> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดหรือเงื่อนไขใด ๆ ในสัญญาฉบับนี้ไม่สมบูรณ์หรือเป็นโมฆะ
      หรือขัดต่อกฎหมาย หรือไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมาย
      ให้ส่วนอื่น ๆ ของข้อกำหนดและเงื่อนไขของสัญญาฉบับนี้ยังคงมีผลสมบูรณ์ชอบด้วยกฎหมาย
      และใช้บังคับได้ตามกฎหมาย และไม่ถูกกระทบหรือเสื่อมเสียไปเพราะความไม่สมบูรณ์เป็นโมฆะ
      ขัดต่อกฎหมาย ไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมายของข้อความข้อกำหนด หรือเงื่อนไขดังกล่าวนั้น
    </div>

    <div class="section">
      สัญญานี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว
      เพื่อเป็นหลักฐานคู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน ณ วันเดือนปีที่ระบุไว้ข้างต้น
      และต่างยึดถือไว้ฝ่ายละฉบับ
    </div>

    <div style="margin-top: 40pt;">
      ${sigSection}
      <div class="signature-area" style="margin-top: 20pt;">
        <div class="signature-col">
          <div>ลงชื่อ......................................พยาน</div>
          <div class="signature-line"></div>
          <div>(................................................................)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
        <div class="signature-col">
          <div>ลงชื่อ......................................พยาน</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${witnessName}</span>)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
      </div>
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateMgAddendum = (data, version = 1) => {
  const witness2 = data.witness2 || 'นางสาว อารยา เพิ่มอุตส่าห์';

  const borrowerParty = (version === 3)
    ? `บจก./หจก. <span class="field">${f(data.borrower_company)}</span> ทะเบียนนิติบุคคลเลขที่ <span class="field">${f(data.borrower_reg_id)}</span> โดย <span class="field">${f(data.borrower_name)}</span> กรรมการผู้มีอำนาจ ที่อยู่บริษัท <span class="field">${f(data.borrower_address)}</span> เบอร์ <span class="field">${f(data.borrower_phone)}</span> ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้จำนอง"</span> รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง`
    : (version === 2)
    ? `นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span> เลขบัตรประชาชน <span class="field">${f(data.borrower_id)}</span> ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address)}</span>
      และ นาย/นาง/นางสาว <span class="field">${f(data.borrower_name2)}</span> เลขบัตรประชาชน <span class="field">${f(data.borrower_id2)}</span> ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address2)}</span> เบอร์ <span class="field">${f(data.borrower_phone)}</span> ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้จำนอง"</span> รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง`
    : `นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span> เลขบัตรประชาชน <span class="field">${f(data.borrower_id)}</span> ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address)}</span> เบอร์ <span class="field">${f(data.borrower_phone)}</span> ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้จำนอง"</span> รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง`;

  const mortgagorRef = (version === 3)
    ? `บจก./หจก. <span class="field">${f(data.borrower_company)}</span>`
    : `นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span>`;

  const sigMortgagor = (version === 3) ? `
    <div class="signature-col">
      <div>ลงชื่อ......................................ผู้จำนอง</div>
      <div class="signature-line"></div>
      <div>บจก./หจก. <span class="field">${f(data.borrower_company)}</span></div>
      <div>( <span class="field">${f(data.borrower_name)}</span> )</div>
    </div>` : (version === 2) ? `
    <div class="signature-col">
      <div>ลงชื่อ......................................ผู้จำนอง</div>
      <div class="signature-line"></div>
      <div>( <span class="field">${f(data.borrower_name)}</span> )</div>
      <div style="margin-top:20pt;">ลงชื่อ......................................ผู้จำนอง</div>
      <div class="signature-line"></div>
      <div>( <span class="field">${f(data.borrower_name2)}</span> )</div>
    </div>` : `
    <div class="signature-col">
      <div>ลงชื่อ......................................ผู้จำนอง</div>
      <div class="signature-line"></div>
      <div>( <span class="field">${f(data.borrower_name)}</span> )</div>
    </div>`;

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญาต่อท้ายสัญญาจำนอง</div>

    <p style="text-align: right;">ทำที่ ${COMPANY_INFO.name} ${COMPANY_INFO.header_address}</p>
    <p style="text-align: right;">วันที่ <span class="field">${f(data.contract_date)}</span></p>

    <div class="section">สัญญาฉบับนี้ทำขึ้น ระหว่าง นาย/นาง/นางสาว <span class="field">${f(data.lender_first_name)}</span> เลขบัตรประชาชน <span class="field">${f(data.lender_id)}</span> ที่อยู่ตามบัตร <span class="field">${f(data.lender_address)}</span> เบอร์ <span class="field">${f(data.lender_phone)}</span> ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้รับจำนอง"</span> ฝ่ายหนึ่ง กับ</div>

    <div class="section">${borrowerParty}</div>

    <div class="section">คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญากันมีข้อความดังต่อไปนี้</div>

    <div class="section"><span class="bold">ข้อ 1.</span> "ผู้จำนอง" เป็นเจ้าของกรรมสิทธิ์ ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง <span class="field">${f(data.property_type_full)}</span> เลขที่ <span class="field">${f(data.address_no)}</span> โฉนดเลขที่ <span class="field">${f(data.deed_no)}</span> เลขที่ดิน <span class="field">${f(data.land_no)}</span> หน้าสำรวจ <span class="field">${f(data.survey_page)}</span> ตำบล <span class="field">${f(data.tambon)}</span> อำเภอ <span class="field">${f(data.amphoe)}</span> จังหวัด <span class="field">${f(data.province)}</span> เนื้อที่รวม <span class="field">${f(data.land_area)}</span> ไร่/งาน/ตารางวา/ตารางเมตร ได้ตกลงจำนองกรรมสิทธิ์ในทรัพย์สินนี้กับบรรดาสิ่งปลูกสร้างต่าง ๆ ที่มีอยู่แล้วในที่ดินรายนี้ในขณะนี้หรือที่จะได้มีขึ้นต่อไปในภายหน้าในที่ดินรายนี้ทั้งสิ้น แก่ <span class="bold">"ผู้รับจำนอง"</span> เพื่อเป็นประกันหนี้สินของ ${mortgagorRef} ในฐานะลูกหนี้ของ <span class="bold">"ผู้รับจำนอง"</span> ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ลูกหนี้"</span> จำนวนเงินไม่เกิน <span class="field">${fNum(data.loan_amount)}</span> บาท ( <span class="field">${f(data.loan_amount_text)}</span> )</div>

    <div class="section"><span class="bold">ข้อ 2.</span> ลูกหนี้ตกลงจำนองทรัพย์ที่ระบุข้างต้นไว้เป็นประกันหนี้ กับทั้งค่าอุปกรณ์ ดอกเบี้ย ค่าสินไหมทดแทนในการไม่ชำระหนี้ ค่าฤชาธรรมเนียมในการบังคับจำนอง ในหนี้เงินกู้ระหว่าง <span class="bold">"ผู้รับจำนอง"</span> กับลูกหนี้ มีกำหนดระยะเวลาก่อหนี้ <span class="field">${f(data.loan_term_months)}</span> ( <span class="field">${f(data.loan_term_text)}</span> ) เดือน ตามสัญญากู้ยืมเงินเลขที่ <span class="field">${f(data.loan_contract_number)}</span>/2568 ฉบับลงวันที่ <span class="field">${f(data.loan_contract_date)}</span> จำนวน <span class="field">${fNum(data.loan_amount)}</span> บาท ( <span class="field">${f(data.loan_amount_text)}</span> )</div>

    <div class="section" style="text-indent: 2em;">กรณีที่ลูกหนี้ขอขยายระยะเวลาชำระคืนเงินต้นไปอีก <span class="field">${f(data.extension_years)}</span> ( <span class="field">${f(data.extension_years_text)}</span> ) ปี "ผู้รับจำนอง" ตกลงขยายระยะเวลาจำนองทรัพย์ที่ระบุข้างต้นไว้เป็นประกันหนี้นั้นตามระยะเวลาดังกล่าว ทั้งนี้ ในกรณีที่จำนองเพื่อเป็นประกันหนี้ของตนเองในฐานะลูกหนี้ของ "ผู้รับจำนอง" "ผู้จำนอง" ตกลงและยินยอมชำระดอกเบี้ยล่วงหน้า โดยหักดอกเบี้ยคิดเป็นระยะเวลา <span class="field">${f(data.advance_interest_months)}</span> ( <span class="field">${f(data.advance_interest_text)}</span> ) เดือนออกจากเงินต้นที่ค้างชำระ ณ วันที่ "ผู้รับจำนอง" ตกลงขยายระยะเวลาดังกล่าว</div>

    <div class="section"><span class="bold">ข้อ 3.</span> <span class="bold">"ผู้จำนอง"</span> ยอมเสียดอกเบี้ยให้แก่ <span class="bold">"ผู้รับจำนอง"</span> ในอัตราร้อยละ <span class="field">${f(data.interest_rate)}</span> ( <span class="field">${f(data.interest_rate_text)}</span> ) ต่อปี ในจำนวนเงินซึ่งลูกหนี้เป็นหนี้ <span class="bold">"ผู้รับจำนอง"</span> นั้น และถ้า <span class="bold">"ผู้จำนอง"</span> หรือลูกหนี้ปฏิบัติผิดนัด หรือผิดสัญญา หรือผิดเงื่อนไข <span class="bold">"ผู้จำนอง"</span> ยอมเสียดอกเบี้ยในอัตราร้อยละ <span class="field">${f(data.late_interest_rate)}</span> ( <span class="field">${f(data.late_interest_rate_text)}</span> ) ต่อปี ทั้งนี้ ค่าธรรมเนียมและค่าใช้จ่ายทั้งสิ้นในการจำนองและค่าไถ่ถอนจำนอง <span class="bold">"ผู้จำนอง"</span> จะเป็นผู้ชำระเองทั้งสิ้น</div>

    <div class="section"><span class="bold">ข้อ 4.</span> กรณีที่ทรัพย์ที่จำนองนี้บุบสลายหรือต้องภัยอันตรายหรือเสียหายไปซึ่งเป็นเหตุให้ทรัพย์นั้นเสื่อมราคาไม่พอเพียงแก่การประกันหนี้ของ "ผู้จำนอง" "ผู้จำนอง" จะต้องเอาทรัพย์อื่นที่มีราคาพอเพียงมาจำนองเพิ่มให้คุ้มพอกับจำนวนหนี้ที่ "ผู้จำนอง" เป็นหนี้อยู่โดยไม่ชักช้า ถ้า "ผู้จำนอง" บิดพริ้วไม่ยอมปฏิบัติหรือไม่สามารถปฏิบัติตามความที่กล่าวมานี้ "ผู้รับจำนอง" มีสิทธิจะเรียกให้ "ผู้จำนอง" ชำระหนี้และบังคับจำนองได้ตามวิธีการที่กำหนดในกฎหมาย</div>

    <div class="section"><span class="bold">ข้อ 5.</span> ในกรณีที่ "ผู้จำนอง" ตกลงจำนองเพื่อเป็นประกันหนี้ของตนเองในฐานะลูกหนี้ของ "ผู้รับจำนอง" เมื่อถึงเวลาบังคับจำนองโดยการขายทอดตลาด ได้เงินจำนวนสุทธิน้อยกว่าจำนวนเงินที่ค้างชำระกับค่าอุปกรณ์ต่าง ๆ ดังได้กล่าวแล้วนั้น เงินยังขาดจำนวนอยู่เท่าใด "ผู้จำนอง" ยอมรับผิดชอบส่วนที่ขาดให้แก่ "ผู้รับจำนอง" จนครบถ้วน สำหรับกรณีที่ "ผู้จำนอง" ซึ่งจำนองทรัพย์สินเป็นประกันหนี้ของบุคคลอื่น "ผู้จำนอง" ไม่ต้องรับผิดเกินมูลค่าของทรัพย์ที่จำนอง ณ เวลาที่ทำการขายทอดตลาดหรือเอาทรัพย์ที่จำนองหลุด</div>

    <div class="section"><span class="bold">ข้อ 6.</span> "ผู้จำนอง" สัญญาว่าจะรักษาซ่อมแซม ตึก บ้านเรือน อาคาร โรงเรือน และสิ่งปลูกสร้างต่าง ๆ ตามที่มีอยู่บนที่ดินรายนี้แล้ว หรือที่จะได้ปลูกสร้างขึ้นต่อไปในภายหน้า ให้มั่นคงเรียบร้อยปกติดีอยู่เสมอ ตลอดเวลาที่จำนองไว้แก่ "ผู้รับจำนอง" โดย "ผู้จำนอง" เสียค่าบำรุงรักษาและซ่อมแซมเอง</div>

    <div class="section"><span class="bold">ข้อ 7.</span> กรณีทรัพย์สิน จดทะเบียนจำนองดังกล่าว เป็น<span class="bold">ที่ดินพร้อมสิ่งปลูกสร้าง</span> "ผู้จำนอง" ตกลงและยินยอมจะทำประกันภัยทรัพย์ที่จำนองไว้กับบริษัทผู้รับประกันภัยที่ "ผู้รับจำนอง" เห็นชอบ ในวงเงินไม่น้อยกว่าราคาประเมินตลาดโดยให้ "ผู้รับจำนอง" เป็นผู้รับประโยชน์ตามกรมธรรม์ "ผู้จำนอง" เป็นผู้ชำระเบี้ยประกันภัยและเสียค่าใช้จ่ายเพื่อการประกันภัยเองทั้งสิ้น และ "ผู้จำนอง" จะต่อสัญญาประกันภัยตลอดระยะเวลาที่ลูกหนี้เป็นหนี้ "ผู้รับจำนอง" และเมื่อ "ผู้รับจำนอง" เรียกร้องให้ "ผู้จำนอง" สลักหลังกรมธรรม์ประกันภัยโอนสิทธิที่จะรับค่าเสียหายจากบริษัทผู้รับประกันภัย "ผู้จำนอง" ก็ต้องปฏิบัติตามนี้</div>

    <div class="section"><span class="bold">ข้อ 8.</span> ในระหว่างที่ทรัพย์จำนองนี้อยู่ในการจำนองตามสัญญานี้ "ผู้จำนอง" จะให้สิทธิประการใดแก่บุคคลอื่นเหนือทรัพย์ที่จำนอง เช่น สิทธิการเช่า สิทธิอาศัย สิทธิครอบครอง หรือสิทธิในการก่อสร้าง ให้ทางเดิน ให้ยืม สิทธิเหนือพื้นดิน สิทธิเก็บกิน เป็นต้น และภาระจำยอมอื่น ๆ อันอาจเป็นการเสื่อมเสียสิทธิ รอนสิทธิ หรือตัดสิทธิของ "ผู้รับจำนอง" "ผู้จำนอง" ต้องได้รับความยินยอมและอนุญาตเป็นลายลักษณ์อักษรจาก "ผู้รับจำนอง" ก่อน การกระทำใด ๆ ที่ "ผู้จำนอง" ได้กระทำฝ่าฝืนต่อสัญญาข้อนี้ไม่ผูกพัน "ผู้รับจำนอง" และ "ผู้รับจำนอง" มีสิทธิที่จะปฏิเสธการกระทำเช่นนั้นของ "ผู้จำนอง" ได้ ทั้ง "ผู้รับจำนอง" มีสิทธิจะเรียกให้ "ผู้จำนอง" ชำระหนี้และบังคับจำนองได้ตามวิธีการที่กำหนดในกฎหมาย</div>

    <div class="section"><span class="bold">ข้อ 9.</span> ถ้าจะมีปัญหาเกิดขึ้นในเรื่องกรรมสิทธิ์ของ "ผู้จำนอง" ในทรัพย์ที่จำนองเมื่อใด "ผู้รับจำนอง" มีสิทธิจะเรียกให้ "ผู้จำนอง" ชำระหนี้และบังคับจำนองได้ตามวิธีการที่กำหนดในกฎหมาย</div>

    <div class="section"><span class="bold">ข้อ 10.</span> ถ้า "ผู้จำนอง" ประพฤติผิดหรือไม่ปฏิบัติตามสัญญาฉบับนี้ไม่ว่าข้อหนึ่งข้อใดตลอดจนคำรับรองหรือคำยืนยันใด ๆ ที่ "ผู้จำนอง" ให้ไว้ตามสัญญานี้ "ผู้รับจำนอง" มีสิทธิจะเรียกให้ "ผู้จำนอง" ชำระหนี้และบังคับจำนองได้ตามวิธีการที่กำหนดในกฎหมาย</div>

    <div class="section"><span class="bold">ข้อ 11.</span> ในเวลาใด ๆ หลังจากที่หนี้ถึงกำหนดชำระ ถ้าไม่มีการจำนองรายอื่นหรือบุริมสิทธิอื่นอันได้จดทะเบียนไว้เหนือทรัพย์สินอันเดียวกันนี้ และ "ผู้จำนอง" ใช้สิทธิแจ้งเป็นหนังสือมายัง "ผู้รับจำนอง" เพื่อให้ "ผู้รับจำนอง" ดำเนินการขายทอดตลาดทรัพย์สินที่จำนองโดยไม่ต้องฟ้องเป็นคดีต่อศาล "ผู้จำนอง" ตกลงให้ถือว่าหนังสือแจ้งของ "ผู้จำนอง" เป็นหนังสือยินยอมให้ขายทอดตลาด ทั้งนี้ เป็นการขายทอดตลาดตามวิธีการที่กำหนดในกฎหมาย เมื่อ "ผู้รับจำนอง" ขายทอดตลาดทรัพย์สินที่จำนองได้เงินสุทธิจำนวนเท่าใด "ผู้จำนอง" ตกลงให้ "ผู้รับจำนอง" จัดสรรเงินที่ได้รับภายหลังหักค่าใช้จ่ายต่าง ๆ ที่เกิดจากการขายทอดตลาดรวมถึงการโอนทรัพย์สินที่จำนองแล้ว เข้าชำระหนี้ของลูกหนี้ให้เสร็จสิ้นไป</div>

    <div class="section"><span class="bold">ข้อ 12.</span> "ผู้จำนอง" ยินยอมให้ "ผู้รับจำนอง" โอนสิทธิจำนองตามสัญญาจำนองนี้ไม่ว่าทั้งหมด หรือแต่เพียงบางส่วน ให้แก่บุคคลหรือนิติบุคคลอื่นใดได้ โดยแจ้งล่วงหน้าเป็นลายลักษณ์อักษรให้ "ผู้จำนอง" ทราบล่วงหน้าเป็นระยะเวลาไม่น้อยกว่า 30 (สามสิบ) วัน แต่ "ผู้จำนอง" ไม่มีสิทธิโอนสิทธิและหน้าที่ตามสัญญาจำนองนี้ไม่ว่าทั้งหมดหรือบางส่วนให้แก่บุคคลหรือนิติบุคคลอื่นใดได้</div>

    <div class="section"><span class="bold">ข้อ 13.</span> "ผู้จำนอง" ตกลงและอนุญาตให้ "ผู้รับจำนอง" เปิดเผยข้อมูลใด ๆ ที่ได้ให้ไว้แก่ "ผู้รับจำนอง" และ/หรือข้อมูลที่เกี่ยวข้องกับ "ผู้จำนอง" (ซึ่งมิใช่ข้อมูลที่ได้รับจากบริษัทข้อมูลเครดิต) เท่าที่จำเป็นต่อบริษัทในเครือของ "ผู้รับจำนอง" รวมถึงกรรมการ และลูกจ้างของ "ผู้รับจำนอง" เพื่อวัตถุประสงค์ในการจัดเก็บข้อมูล บริหาร วิเคราะห์ตรวจสอบ ทบทวน และป้องกันความเสี่ยงด้านสินเชื่อ</div>

    <div class="section"><span class="bold">ข้อ 14.</span> บรรดาหนังสือ จดหมายติดต่อ คำบอกกล่าวใด ๆ ที่ "ผู้รับจำนอง" ได้ส่งให้ "ผู้จำนอง" ตามที่อยู่ที่แจ้งไว้ตามสัญญาฉบับนี้ ไม่ว่าจะโดยส่งเองหรือส่งทางไปรษณีย์ลงทะเบียนหรือไม่ลงทะเบียน ให้ถือว่าได้ส่งให้แก่ "ผู้จำนอง" แล้วโดยชอบ ทั้งนี้ โดยไม่ต้องคำนึงถึงว่าจะมีผู้รับไว้หรือไม่ และแม้หากส่งให้ไม่ได้เพราะย้ายที่อยู่ หรือที่อยู่เปลี่ยนแปลงไป หรือถูกรื้อถอนไปโดยมิได้มีการแจ้งการย้าย การเปลี่ยนแปลง หรือการรื้อถอนนั้นเป็นลายลักษณ์อักษรให้ "ผู้รับจำนอง" ทราบก็ดี หรือส่งให้ไม่ได้เพราะหาที่อยู่ตามที่ระบุไว้นั้นไม่พบก็ดี ให้ถือว่า "ผู้จำนอง" ได้รับและทราบหนังสือ จดหมาย หรือคำบอกกล่าวดังกล่าวแล้วโดยชอบ ทั้งนี้ หากมีการเปลี่ยนแปลงที่อยู่ "ผู้จำนอง" จะต้องแจ้งการเปลี่ยนแปลงให้ "ผู้รับจำนอง" ทราบเป็นลายลักษณ์อักษรทันที</div>

    <div class="section"><span class="bold">ข้อ 15.</span> การล่าช้าหรือการไม่ใช้สิทธิใด ๆ ของ "ผู้รับจำนอง" ตามข้อกำหนดหรือเงื่อนไขใด ๆ ของสัญญานี้หรือตามกฎหมาย ไม่ถือว่า "ผู้รับจำนอง" สละสิทธิหรือให้ความยินยอมในการดำเนินการใด ๆ ตามที่ "ผู้รับจำนอง" มีสิทธิแก่ "ผู้จำนอง" แต่ประการใด เว้นแต่ "ผู้รับจำนอง" จะได้ทำเป็นหนังสืออย่างชัดแจ้งและการสละสิทธิเช่นว่านั้นให้มีผลเฉพาะสำหรับเหตุการณ์และวัตถุประสงค์นั้นเท่านั้น</div>

    <div class="section"><span class="bold">ข้อ 16.</span> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดหรือเงื่อนไขใด ๆ ในสัญญาฉบับนี้ไม่สมบูรณ์ หรือเป็นโมฆะ หรือขัดต่อกฎหมาย หรือไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมาย ให้ส่วนอื่น ๆ ของข้อกำหนดและเงื่อนไขของสัญญาฉบับนี้ยังคงมีผลสมบูรณ์ชอบด้วยกฎหมาย และใช้บังคับได้ตามกฎหมาย และไม่ถูกกระทบหรือเสื่อมเสียไปเพราะความไม่สมบูรณ์เป็นโมฆะ ขัดต่อกฎหมาย ไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมายของข้อความข้อกำหนด หรือเงื่อนไขดังกล่าวนั้น</div>

    <div class="section">สัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว เพื่อเป็นหลักฐานคู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน ณ วันเดือนปีที่ระบุไว้ข้างต้น และต่างยึดถือไว้ฝ่ายละฉบับ</div>

    <div class="signature-area">
      ${sigMortgagor}
      <div class="signature-col">
        <div>ลงชื่อ......................................ผู้รับจำนอง</div>
        <div class="signature-line"></div>
        <div>( <span class="field">${f(data.lender_first_name)}</span> )</div>
      </div>
    </div>

    <div class="signature-area" style="margin-top: 24pt;">
      <div class="signature-col">
        <div>ลงชื่อ......................................พยาน</div>
        <div class="signature-line"></div>
        <div>( <span class="field">${f(data.witness1)}</span> )</div>
      </div>
      <div class="signature-col">
        <div>ลงชื่อ......................................พยาน</div>
        <div class="signature-line"></div>
        <div>( ${witness2} )</div>
      </div>
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateMgAppendix = (data, version = 1) => {
  const f = (val, blank) => val || blank || '_______________';
  const fNum = (val) => val ? formatNumber(val) : '_______________';

  // ฝ่ายผู้ให้สัญญา: version 3 = บจก./หจก., version 2 = 2 บุคคล, version 1 = บุคคลเดียว
  const clientParty = (version === 3) ? `
    <div class="section">
      ตามที่ บจก./หจก. <span class="field">${f(data.borrower_company)}</span>
      ทะเบียนนิติบุคคลเลขที่ <span class="field">${f(data.borrower_reg_id)}</span>
      โดย <span class="field">${f(data.borrower_name)}</span> กรรมการผู้มีอำนาจ
      ที่อยู่บริษัท <span class="field">${f(data.borrower_address)}</span>
      เบอร์ <span class="field">${f(data.borrower_phone)}</span>
      (<span class="bold">"ผู้ให้สัญญา"</span>)
    </div>` : (version === 2) ? `
    <div class="section">
      ตามที่ นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.borrower_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address)}</span>
      และ นาย/นาง/นางสาว <span class="field">${f(data.borrower_name2)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.borrower_id2)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address2)}</span>
      เบอร์ <span class="field">${f(data.borrower_phone)}</span>
      (<span class="bold">"ผู้ให้สัญญา"</span>)
    </div>` : `
    <div class="section">
      ตามที่ นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.borrower_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address)}</span>
      เบอร์ <span class="field">${f(data.borrower_phone)}</span>
      (<span class="bold">"ผู้ให้สัญญา"</span>)
    </div>`;

  // บล็อกลายเซ็น
  const sigBorrower = (version === 3) ? `
    <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 12pt;">บจก./หจก. <span class="field">${f(data.borrower_company)}</span></div>
    <div style="margin-top: 8pt;">( <span class="field">${f(data.borrower_name)}</span> )</div>` : (version === 2) ? `
    <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 20pt;">( <span class="field">${f(data.borrower_name)}</span> )</div>
    <div style="margin-top: 20pt;">ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 20pt;">( <span class="field">${f(data.borrower_name2)}</span> )</div>` : `
    <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
    <div style="margin-top: 20pt;">( <span class="field">${f(data.borrower_name)}</span> )</div>`;

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">เอกสารแนบท้ายสัญญาแต่งตั้งนายหน้าจำนอง</div>

    <div class="section">
      ณ สำนักงาน โลนด์ ดีดี จำกัด ตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร
      เมื่อวันที่ <span class="field">${f(data.appendix_date, 'วัน เดือน ปี')}</span>
    </div>

    ${clientParty}

    <div class="section">
      ได้ตกลงทำสัญญาแต่งตั้งนายหน้าจำนอง ฉบับลงวันที่ <span class="field">${f(data.main_contract_date)}</span>
      ${COMPANY_INFO.name} (<span class="bold">"นายหน้า"</span>)
      ทะเบียนนิติบุคคลเลขที่ 0105566225836
      โดย นาย วรวุฒิ กิตดิอุดม กรรมการผู้มีอำนาจ
      สำนักงานตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร
      โทรศัพท์ 081-6386966
    </div>

    <div class="section">
      บัดนี้ ข้าพเจ้า "ผู้ให้สัญญา" ได้เข้าทำสัญญากับนายทุนผู้รับจำนอง
      ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง <span class="field">${f(data.property_type_full)}</span>
      เลขที่ <span class="field">${f(data.address_no)}</span>
      โฉนดเลขที่ <span class="field">${f(data.deed_no)}</span>
      เลขที่ดิน <span class="field">${f(data.land_no)}</span>
      หน้าสำรวจ <span class="field">${f(data.survey_page)}</span>
      ตำบล <span class="field">${f(data.tambon)}</span>
      อำเภอ <span class="field">${f(data.amphoe)}</span>
      จังหวัด <span class="field">${f(data.province)}</span>
      เนื้อที่รวม <span class="field">${f(data.land_area, 'ไร่/งาน/ตารางวา/ตารางเมตร')}</span>
      โดยมีค่าบริการเพิ่มเติมจำนวน <span class="field">${f(data.additional_fee)}</span>
      โดยได้จดทะเบียนกับกรมที่ดินแล้วเมื่อวันที่ <span class="field">${f(data.registration_date)}</span>
    </div>

    <div class="section">
      ดังนั้น "ผู้ให้สัญญา" จึงได้ลงนามเอกสารแนบท้ายสัญญาแต่งตั้งนายหน้าจำนองฉบับนี้
      เพื่อให้เป็นไปตามเงื่อนไขของสัญญาแต่งตั้งนายหน้าจำนองฉบับวันที่ <span class="field">${f(data.main_contract_date)}</span>
      สัญญาฉบับนี้ถือเป็นส่วนหนึ่งของสัญญาแต่งตั้งนายหน้าจำนอง
      คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว
      จึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน และต่างยึดถือไว้ฝ่ายละฉบับ
    </div>

    <div style="margin-top: 28pt; display: table; width: 100%;">
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        ${sigBorrower}
      </div>
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................นายหน้า</div>
        <div style="margin-top: 8pt;">${COMPANY_INFO.name}</div>
        <div style="margin-top: 8pt;">( นางสาว อารยา เพิ่มอุตส่าห์ )</div>
        <div style="margin-top: 4pt; font-size: 12pt;">เจ้าหน้าที่นิติกรรม</div>
      </div>
    </div>

    <div style="margin-top: 24pt; display: table; width: 100%;">
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................พยาน</div>
        <div style="margin-top: 20pt;">( <span class="field">${f(data.witness1)}</span> )</div>
      </div>
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................พยาน</div>
        <div style="margin-top: 20pt;">( นางสาว พิสชา วงษา )</div>
      </div>
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateMgBroker = (data, version = 1) => {
  const f = (val, blank) => val || blank || '_______________';
  const fNum = (val) => val ? formatNumber(val) : '_______________';

  // ฝ่ายผู้ให้สัญญา: version 3 = บจก./หจก., version 2 = 2 บุคคล, version 1 = บุคคลเดียว
  const borrowerParty = (version === 3) ? `
    <div class="section">
      บจก./หจก. <span class="field">${f(data.borrower_company)}</span>
      ทะเบียนนิติบุคคลเลขที่ <span class="field">${f(data.borrower_reg_id)}</span>
      โดย <span class="field">${f(data.borrower_name)}</span> กรรมการผู้มีอำนาจ
      ที่อยู่บริษัท <span class="field">${f(data.borrower_address)}</span>
      เบอร์ <span class="field">${f(data.borrower_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้ให้สัญญา"</span>
      รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง
    </div>` : (version === 2) ? `
    <div class="section">
      นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.borrower_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address)}</span>
    </div>
    <div class="section">
      และ นาย/นาง/นางสาว <span class="field">${f(data.borrower_name2)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.borrower_id2)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address2)}</span>
      เบอร์ <span class="field">${f(data.borrower_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้ให้สัญญา"</span>
      รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง
    </div>` : `
    <div class="section">
      นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span>
      เลขบัตรประชาชน <span class="field">${f(data.borrower_id)}</span>
      ที่อยู่ตามบัตร <span class="field">${f(data.borrower_address)}</span>
      เบอร์ <span class="field">${f(data.borrower_phone)}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ผู้ให้สัญญา"</span>
      รหัสทรัพย์ <span class="field">${f(data.property_code)}</span> อีกฝ่ายหนึ่ง
    </div>`;

  // ข้อ 1 — ชื่อผู้เป็นประกัน แตกต่างตาม version
  const borrowerInClause1 = (version === 3)
    ? `บจก./หจก. <span class="field">${f(data.borrower_company)}</span>`
    : (version === 2)
    ? `นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span> และ นาย/นาง/นางสาว <span class="field">${f(data.borrower_name2)}</span>`
    : `นาย/นาง/นางสาว <span class="field">${f(data.borrower_name)}</span>`;

  // ลายเซ็นผู้ให้สัญญา แตกต่างตาม version
  const sigBorrower = (version === 3) ? `
    <div style="text-align: center; width: 45%; display: inline-block; vertical-align: top;">
      <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
      <div style="margin-top: 12pt;">บจก./หจก. <span class="field">${f(data.borrower_company)}</span></div>
      <div style="margin-top: 8pt;">( <span class="field">${f(data.borrower_name)}</span> )</div>
    </div>` : (version === 2) ? `
    <div style="text-align: center; width: 45%; display: inline-block; vertical-align: top;">
      <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
      <div style="margin-top: 20pt;">( <span class="field">${f(data.borrower_name)}</span> )</div>
      <div style="margin-top: 20pt;">ลงชื่อ......................................ผู้ให้สัญญา</div>
      <div style="margin-top: 20pt;">( <span class="field">${f(data.borrower_name2)}</span> )</div>
    </div>` : `
    <div style="text-align: center; width: 45%; display: inline-block; vertical-align: top;">
      <div>ลงชื่อ......................................ผู้ให้สัญญา</div>
      <div style="margin-top: 20pt;">( <span class="field">${f(data.borrower_name)}</span> )</div>
    </div>`;

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญาแต่งตั้งนายหน้าจำนอง</div>

    <p style="text-align: right;">ทำที่ ${COMPANY_INFO.name} ${COMPANY_INFO.header_address}</p>
    <p style="text-align: right;">วันที่ <span class="field">${f(data.contract_date, 'วัน เดือน ปี')}</span></p>

    <div class="section">
      สัญญาฉบับนี้ทำขึ้น ระหว่าง ${COMPANY_INFO.name}
      ทะเบียนนิติบุคคลเลขที่ <span class="field">${f(data.company_id, '0105566225836')}</span>
      โดย นาย <span class="field">${f(data.company_officer, 'วรวุฒิ กิตดิอุดม')}</span> กรรมการผู้มีอำนาจ
      สำนักงานตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร
      โทรศัพท์ <span class="field">${f(data.company_phone, '081-6386966')}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"นายหน้า"</span> ฝ่ายหนึ่ง กับ
    </div>

    ${borrowerParty}

    <div class="section">
      คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญากันมีข้อความดังต่อไปนี้
    </div>

    <div class="section">
      <span class="bold">ข้อ 1.</span> ผู้ให้สัญญาเป็นเจ้าของกรรมสิทธิ์
      <span class="bold"><span class="field">${f(data.property_type_full, 'ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง')}</span></span>
      เลขที่ <span class="field">${f(data.address_no)}</span>
      โฉนดเลขที่ <span class="field">${f(data.deed_no)}</span>
      เลขที่ดิน <span class="field">${f(data.land_no)}</span>
      หน้าสำรวจ <span class="field">${f(data.survey_page)}</span>
      ตำบล <span class="field">${f(data.tambon)}</span>
      อำเภอ <span class="field">${f(data.amphoe)}</span>
      จังหวัด <span class="field">${f(data.province)}</span>
      เนื้อที่รวม <span class="field">${f(data.land_area, 'ไร่/งาน/ตารางวา/ตารางเมตร')}</span>
      ซึ่งต่อไปในสัญญานี้จะเรียกว่า <span class="bold">"ทรัพย์สิน"</span>
      ผู้ให้สัญญาประสงค์จะจำนองทรัพย์สินดังกล่าวกับบรรดาสิ่งปลูกสร้างต่างๆ ที่มีอยู่ในที่ดินรายนี้ขณะนี้หรือที่จะมีขึ้นต่อไปในภายหน้าในที่ดินรายนี้ทั้งสิ้น
      เพื่อเป็นประกันหนี้สินของ ${borrowerInClause1}
      ในราคาประมาณ <span class="field">${f(data.loan_amount)}</span> บาท
      ( <span class="field">${f(data.loan_amount_text)}</span> )
    </div>

    <div class="section">
      <span class="bold">ข้อ 2.</span> "ผู้ให้สัญญา" แต่งตั้งให้ "นายหน้า" เป็นผู้ติดต่อ จัดหา ชี้ช่อง และจัดการให้ได้เข้าทำสัญญากับนายทุนผู้รับจำนอง
      โดยหาก "ผู้ให้สัญญา" ได้เข้าทำสัญญาจำนองกับนายทุนผู้รับจำนองแล้ว จะดำเนินการลงนามในเอกสารแนบท้ายด้วย
    </div>

    <div class="section">
      <span class="bold">ข้อ 3.</span> เมื่อนายทุนผู้รับจำนองเข้าทำสัญญาจำนองโดยจดทะเบียนจำนองกันที่สำนักงานที่ดินและได้รับชำระเงินจากการจำนองเรียบร้อยแล้วภายในกำหนดระยะเวลาตามสัญญานี้
      "ผู้ให้สัญญา" ตกลงชำระค่านายหน้าให้แก่ "นายหน้า" <span class="bold">ทันที</span>
      ในอัตราค่านายหน้าร้อยละ <span class="field">${f(data.broker_rate)}</span>
      ( <span class="field">${f(data.broker_rate_text)}</span> ) ของวงเงินจำนอง
      สำหรับวงเงินต่ำกว่า 1,000,000 บาท (หนึ่งล้านบาทถ้วน) คิดอัตราค่านายหน้าขั้นต่ำ 50,000 บาท (ห้าหมื่นบาทถ้วน)
      ทั้งนี้ "นายหน้า" ขอสงวนสิทธิในการคิดค่าบริการเพิ่มเติมตามที่ปรากฎในเอกสารแนบท้ายภายหลังที่ "ผู้ให้สัญญา" ได้เข้าทำสัญญาจำนองกับนายทุนผู้รับจำนองสำเร็จแล้ว
    </div>

    <div class="section" style="text-indent: 90pt;">
      <span class="bold">3.1.</span> ผู้ให้สัญญาตกลงชำระค่านายหน้าด้วยวิธีการโอนเงินไปยังบัญชีของนายหน้า ซึ่งมีรายละเอียดดังนี้
      ชื่อธนาคาร : <span class="field">${f(data.bank_name, 'ไทยพาณิชย์')}</span><br/>
      ชื่อบัญชี : <span class="field">${f(data.account_name, 'บริษัท โลนด์ ดีดี จำกัด')}</span><br/>
      สาขา : <span class="field">${f(data.branch_name, 'รามคำแหง (สัมมากร)')}</span><br/>
      หมายเลขบัญชี : <span class="field">${f(data.account_number, '136-2707297')}</span>
    </div>

    <div class="section">
      <span class="bold">ข้อ 4.</span> สัญญาฉบับนี้มีกำหนดเวลา 1 (หนึ่ง) ปี นับแต่วันทำสัญญา
    </div>

    <div class="section">
      <span class="bold">ข้อ 5.</span> "ผู้ให้สัญญา" ตกลงเข้าทำสัญญาจำนองโดยจดทะเบียนจำนองกันที่สำนักงานที่ดินภายใน 30 (สามสิบ) วัน นับจากวันทำสัญญา
      ทั้งนี้ ให้ถือว่า "นายหน้า" ได้ทำหน้าที่สมบูรณ์ตามสัญญาแล้วเมื่อพ้นกำหนดระยะเวลาดังกล่าว
      และยินยอมชำระค่านายหน้าให้แก่ "นายหน้า" ตามข้อ 3.
    </div>

    <div class="section" style="text-indent: 90pt;">
      <span class="bold">5.1.</span> ค่าธรรมเนียมและค่าใช้จ่ายทั้งสิ้นในการจดทะเบียนจำนอง ค่าไถ่ถอน ค่าภาษีที่ดินและสิ่งปลูกสร้างรวมไปถึง
      ค่าฤชาธรรมเนียมใดๆ ที่สำนักงานที่ดินเรียกเก็บ "ผู้ให้สัญญา" จะเป็นผู้เสียเองทั้งสิ้น
    </div>

    <div class="section" style="text-indent: 90pt;">
      <span class="bold">5.2.</span> ในกรณีแจ้งไถ่ถอน "ผู้ให้สัญญา" จะแจ้งให้ "นายหน้า" ทราบล่วงหน้าไม่ต่ำกว่า 15 ( สิบห้า ) วัน
      และมีค่าใช้จ่ายในการดำเนินการไถ่ถอนเป็นจำนวนเงิน <span class="field">${f(data.redemption_fee, '5,000')}</span> บาท ( ห้าพันบาทถ้วน )
      กรณีทรัพย์สินที่ตั้งอยู่ต่างจังหวัดจะไม่รวมค่าเดินทางไปและกลับ ซึ่งทาง "ผู้ให้สัญญา" จะเป็นผู้ชำระให้แก่ ${COMPANY_INFO.name}
    </div>

    <div class="section" style="text-indent: 90pt;">
      <span class="bold">5.3.</span> ในกรณีที่ "ผู้ให้สัญญา" ไม่ทราบราคาประเมินทรัพย์สินและต้องการให้ "นายหน้า" เป็นผู้ประเมินราคาทรัพย์สิน
      "ผู้ให้สัญญา" ตกลงชำระค่าประเมินจำนวน <span class="field">${f(data.appraisal_fee)}</span> บาท ( )
      และจะส่งโฉนดที่ดินมาให้ "นายหน้า" เพื่อประเมินราคาทรัพย์สิน
    </div>

    <div class="section">
      <span class="bold">ข้อ 6.</span> ในระหว่างที่สัญญานี้ยังมีผลบังคับใช้ "ผู้ให้สัญญา" ตกลงว่าจะไม่ทำสัญญาแต่งตั้งนายหน้า หรือตัวแทนแต่เพียงผู้เดียวกับบุคคลหรือนิติบุคคลอื่นสำหรับการจำนองทรัพย์สินดังกล่าว
      นอกจากนี้ "ผู้ให้สัญญา" ตกลงว่าจะไม่บอกเลิกสัญญาฉบับนี้ก่อนครบกำหนดเวลา ไม่ว่าด้วยเหตุผลใด
      และจะไม่ดำเนินการจำนอง ขาย ให้เช่า หรือขายฝากทรัพย์สินดังกล่าวแก่บุคคลหรือนิติบุคคลอื่น
      หากมีบุคคลหรือนิติบุคคลอื่นติดต่อมาเพื่อเป็นนายหน้าหรือตัวแทนในการหานายทุนผู้รับจำนอง
      "ผู้ให้สัญญา" ตกลงให้เป็นหน้าที่ของ "นายหน้า" ตามสัญญาฉบับนี้ในการดำเนินการจัดหานายทุน
      และจะชำระค่านายหน้าให้แก่ "นายหน้า" ตามเงื่อนไขที่ระบุไว้ข้อ 3 ของสัญญานี้
    </div>

    <div class="section">
      <span class="bold">ข้อ 7.</span> หาก "นายหน้า" จัดหานายทุนผู้รับจำนองได้แล้ว แต่ "ผู้ให้สัญญา" ปฏิเสธการจดทะเบียนจำนอง
      หรือ "ผู้ให้สัญญา" ได้เข้าทำสัญญาจำนองกับนายทุนแล้ว แต่ไม่สามารถจดทะเบียนจำนองได้จากเหตุปฏิบัติผิดนัด ผิดสัญญา หรือผิดเงื่อนไขข้อหนึ่งข้อใดของ "ผู้ให้สัญญา"
      "ผู้ให้สัญญา" ยินยอมให้ถือว่านายหน้าได้ทำหน้าที่สมบูรณ์ตามสัญญาแล้ว
      และยินยอมชำระค่านายหน้าให้แก่ "นายหน้า" ตามข้อ 3. พร้อมดอกเบี้ยผิดนัดในอัตราร้อยละ 15 (สิบห้า) ต่อปี
      ตลอดจนค่าเสียหาย และค่าใช้จ่ายต่างๆ ในการติดตามทวงถาม หรือดำเนินคดีแก่ "ผู้ให้สัญญา"
    </div>

    <div class="section">
      <span class="bold">ข้อ 8.</span> กรณี "นายหน้า" สามารถจัดหานายทุนให้ผู้จำนองได้แล้ว สัญญานายหน้ามีผลตลอดสัญญาจำนองจนถึงวันไถ่ถอน
      โดยหาก "ผู้ให้สัญญา" และนายทุนผู้รับจำนองได้ตกลงขยายระยะเวลาสัญญาจำนองไปอีกหนึ่งปี
      "ผู้ให้สัญญา" ตกลงจะชำระค่านายหน้าให้แก่ "นายหน้า" ทันทีในอัตราค่านายหน้าร้อยละ 1.5 (หนึ่งจุดห้า) ของวงเงินจำนอง
      สำหรับวงเงินต่ำกว่า 1,000,000 บาท (หนึ่งล้านบาทถ้วน) คิดอัตราค่านายหน้าขั้นต่ำ 10,000 บาท (หนึ่งหมื่นบาทถ้วน)
      แต่ในกรณีที่นายทุนผู้รับจำนองรายเดิมไม่ต่อสัญญาจากความผิดของ "ผู้ให้สัญญา" เช่น ผิดนัดชำระดอกเบี้ยงวดหนึ่งงวดใด
      เป็นเหตุให้ "ผู้ให้สัญญา" ตกเป็นผู้ผิดนัด ทำให้ "นายหน้า" ต้องหานายทุนรายใหม่
      "ผู้ให้สัญญา" ตกลงและยินยอมจ่ายค่าธรรมเนียมในอัตราค่านายหน้าร้อยละ 5 (ห้า) ของวงเงินจำนอง
      โดยคิดอัตราขั้นต่ำ 50,000 บาท (ห้าหมื่นบาทถ้วน) สำหรับทรัพย์สินที่ราคาต่ำกว่า 1,000,000 บาท (หนึ่งล้านบาทถ้วน) ให้แก่ "นายหน้า"
    </div>

    <div class="section">
      <span class="bold">ข้อ 9.</span> "ผู้ให้สัญญา" ตกลงและอนุญาตให้ "นายหน้า" เปิดเผยข้อมูลใดๆ ที่ได้ให้ไว้แก่ "นายหน้า"
      และ/หรือข้อมูลที่เกี่ยวข้องกับ "ผู้ให้สัญญา" (ซึ่งไม่ใช้ข้อมูลที่ได้รับจากบริษัทข้อมูลเครดิต) เท่าที่จำเป็นต่อบริษัทในเครือของ "นายหน้า"
      รวมถึงกรรมการ และลูกจ้างของ "นายหน้า" เพื่อวัตถุประสงค์ในการจัดเก็บข้อมูล บริหาร วิเคราะห์ตรวจสอบ ทบทวน และป้องกันความเสี่ยงด้านสินเชื่อ
    </div>

    <div class="section">
      <span class="bold">ข้อ 10.</span> การล่าช้าหรือการไม่ใช้สิทธิใดๆ ของ "นายหน้า" ตามข้อกำหนดหรือเงื่อนไขใดๆ ของสัญญานี้หรือตามกฎหมาย
      ไม่ถือว่า "นายหน้า" สละสิทธหรือให้ความยินยอมในการดำเนินการใดๆ ตามที่ "นายหน้า" มีสิทธิแก่ "ผู้ให้สัญญา" แต่ประการใด
      เว้นแต่ "นายหน้า" ได้ทำเป็นหนังสืออย่างชัดแจ้งและการสละสิทธิเช่นว่านั้นให้มีผลเฉพาะสำหรับเหตุการณ์และวัตถุประสงค์เท่านั้น
    </div>

    <div class="section">
      <span class="bold">ข้อ 11.</span> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดหรือเงื่อนไขใด ๆ ในสัญญาฉบับนี้ไม่สมบูรณ์ หรือเป็นโมฆะ หรือขัดต่อกฎหมาย หรือไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมาย
      ให้ส่วนอื่นๆ ของข้อกำหนดและเงื่อนไขของสัญญาฉบับนี้ยังคงมีผลสมบูรณ์ชอบด้วยกฎหมาย และใช้บังคับได้ตามกฎหมาย
      และไม่ถูกกระทบหรือเสื่อมเสียไปเพราะความไม่สมบูรณ์ เป็นโมฆะ ขัดต่อกฎหมาย ไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมายของข้อความข้อกำหนด หรือเงื่อนไขดังกล่าวนั้น
    </div>

    <div class="section">
      <span class="bold">ข้อ 12.</span> เมื่อสัญญาฉบับนี้สิ้นสุดลง หาก "นายหน้า" ยังไม่สามารถเป็นผู้ติดต่อ จัดหา ชี้ช่อง และจัดการให้ได้เข้าทำสัญญากับนายทุนผู้รับจำนองในทรัพย์สินได้
      "ผู้ให้สัญญา" ไม่ต้องเสียค่าใช้จ่ายแต่อย่างใด เว้นแต่เป็นบุคคลหรือผู้ที่เกี่ยวข้องกับบุคคล หรือผู้ที่ได้รับการชี้ช่องจากบุคคลที่ "นายหน้า" เคยติดต่อ หรือแนะนำให้รับจำนองทรัพย์สินนี้
      ให้ถือว่า "นายหน้า" ได้ทำหน้าที่สมบูรณ์ตามสัญญาแล้วและยินยอมชำระค่านายหน้าให้แก่ "นายหน้า" ตามข้อ 3.
    </div>

    <div class="section">
      <span class="bold">ข้อ 13.</span> ในกรณีที่มีข้อเรียกร้องหรือข้อพิพาทใดๆ เกิดขึ้นภายใต้หรือเกี่ยวข้องกับข้อสัญญานี้
      คู่สัญญาจะพยายามแก้ไขข้อเรียกร้องหรือข้อพิพาทดังกล่าวโดยการเจรจาก่อนที่จะดำเนินคดีทางกฎหมาย
      หากข้อเรียกร้องหรือข้อพิพาทไม่สามารถตกลงได้โดยการเจรจาภายใน 30 (สามสิบ) วัน หลังจากที่ฝ่ายใดฝ่ายหนึ่งได้ยื่นข้อเสนอเป็นลายลักษณ์อักษรให้กับอีกฝ่ายหนึ่งเพื่อเจรจาเพื่อยุติข้อเรียกร้องหรือข้อพิพาทดังกล่าว
      คู่สัญญามีสิทธินำข้อเรียกร้องหรือข้อพิพาทขึ้นสู่ศาลที่มีเขตอำนาจ
    </div>

    <div class="section">
      สัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว
      เพื่อเป็นหลักฐาน คู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน
    </div>

    <div style="margin-top: 28pt; display: table; width: 100%;">
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        ${sigBorrower}
      </div>
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................นายหน้า</div>
        <div style="margin-top: 8pt;">${COMPANY_INFO.name}</div>
        <div style="margin-top: 8pt;">( นางสาว อารยา เพิ่มอุตส่าห์ )</div>
        <div style="margin-top: 4pt; font-size: 12pt;">เจ้าหน้าที่นิติกรรม</div>
      </div>
    </div>

    <div style="margin-top: 24pt; display: table; width: 100%;">
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................พยาน</div>
        <div style="margin-top: 20pt;">( <span class="field">${f(data.witness1)}</span> )</div>
      </div>
      <div style="display: table-cell; width: 50%; text-align: center; vertical-align: top;">
        <div>ลงชื่อ......................................พยาน</div>
        <div style="margin-top: 20pt;">( นางสาว พิสชา วงษา )</div>
      </div>
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

// Main template generator mapping
const TEMPLATE_GENERATORS = {
  [TEMPLATE_TYPES.SP_CONTRACT]: generateSpContract,
  [TEMPLATE_TYPES.SP_BROKER]: generateSpBroker,
  [TEMPLATE_TYPES.SP_APPENDIX]: generateSpAppendix,
  [TEMPLATE_TYPES.SP_NOTICE]: generateSpNotice,
  [TEMPLATE_TYPES.MG_LOAN]: generateMgLoan,
  [TEMPLATE_TYPES.MG_ADDENDUM]: generateMgAddendum,
  [TEMPLATE_TYPES.MG_APPENDIX]: generateMgAppendix,
  [TEMPLATE_TYPES.MG_BROKER]: generateMgBroker
};

// Public API

/**
 * Generate a document in Word-compatible .doc format
 * @param {string} templateType - Template type from TEMPLATE_TYPES
 * @param {number} version - Document version (for future use)
 * @param {object} data - Data object with field values
 * @returns {object} { html, filename }
 */
function generateDocument(templateType, version = 1, data = {}) {
  if (!TEMPLATE_GENERATORS[templateType]) {
    throw new Error(`Unknown template type: ${templateType}`);
  }

  const generator = TEMPLATE_GENERATORS[templateType];
  const body = generator(data, version);
  const html = HTML_WRAPPER(body);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${templateType}_v${version}_${timestamp}.doc`;

  return { html, filename };
}

/**
 * Get field definitions for a specific template type
 * @param {string} templateType - Template type from TEMPLATE_TYPES
 * @returns {array} Array of field definition objects
 */
function getTemplateFields(templateType) {
  return TEMPLATE_FIELDS[templateType] || [];
}

// Export
module.exports = {
  generateDocument,
  getTemplateFields,
  TEMPLATE_TYPES,
  COMPANY_INFO
};

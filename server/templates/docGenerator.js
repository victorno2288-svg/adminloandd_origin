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
const generateSpContract = (data) => {
  const witnessName = data.witness_name || 'นางสาว อารยา เพิ่มลุดสำห์';

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญาขายฝาก</div>

    <div class="contract-number">
      เลขที่เอกสาร: <span class="field">${data.doc_number || '_______________'}</span>
    </div>

    <p style="text-align: center;">ทำที่ ${COMPANY_INFO.name}</p>
    <p style="text-align: center;">${COMPANY_INFO.address}</p>

    <div class="date-line">
      วันที่ <span class="field">${data.contract_date || '___'}</span>
      เดือน <span class="field">___________</span>
      พ.ศ. <span class="field">___________</span>
    </div>

    <div class="section">
      สัญญาฉบับนี้ทำขึ้นระหว่าง <span class="field">${data.buyer_name || '_______________'}</span>
      เลขบัตรประชาชน <span class="field">${data.buyer_id_number || '_______________'}</span>
      ที่อยู่ <span class="field">${data.buyer_address || '_______________'}</span>
      โทรศัพท์ <span class="field">${data.buyer_phone || '_______________'}</span>
      <span class="bold">ผู้ซื้อฝาก</span>
    </div>

    <div class="section">
      ฝ่ายหนึ่งกับ <span class="field">${data.seller_name || '_______________'}</span>
      เลขบัตรประชาชน <span class="field">${data.seller_id_number || '_______________'}</span>
      ที่อยู่ <span class="field">${data.seller_address || '_______________'}</span>
      โทรศัพท์ <span class="field">${data.seller_phone || '_______________'}</span>
      รหัสทรัพย์ <span class="field">${data.property_code || '_______________'}</span>
      <span class="bold">ผู้ขายฝาก</span> ฝ่ายอื่น
    </div>

    <div class="section">
      <span class="bold">ข้อ 1</span> ผู้ขายฝากตกลงขายฝากให้แก่ผู้ซื้อฝาก ซึ่งเป็นทรัพย์สินดังต่อไปนี้
      ${createPropertyDetails(data)}
    </div>

    <div class="section">
      <span class="bold">ข้อ 2</span> ผู้ซื้อฝากตกลงจ่ายเงินค่าขายฝากจำนวน
      <span class="field">${formatNumber(data.contract_amount) || '_______________'}</span> บาท
      (${data.contract_amount_text || '_________________________________'} บาท)
    </div>

    <div class="section">
      <span class="bold">ข้อ 3</span> สัญญานี้มีระยะเวลา <span class="field">${data.contract_duration || '___'}</span> ปี
      นับตั้งแต่วันทำสัญญา และกำหนดวันไถ่ถอน
      <span class="field">${data.redemption_date || '_______________'}</span>
    </div>

    <div class="section" style="text-indent: 90pt;">
      <span class="bold">ข้อ 3.1</span> ยอดไถ่ถอน <span class="field">${formatNumber(data.redemption_amount) || '_______________'}</span> บาท
      (${data.redemption_amount_text || '_________________________________'} บาท)
    </div>

    <div class="section" style="text-indent: 90pt;">
      <span class="bold">ข้อ 3.2</span> อัตราดอกเบี้ย <span class="field">${data.interest_rate || '___'}</span> % ต่อปี
    </div>

    <div class="section">
      <span class="bold">ข้อ 4</span> สัญญาฉบับนี้สิ้นสุดลงเมื่อผู้ขายฝากชำระเงินเต็มจำนวนตามข้อ 3.1 ให้แก่ผู้ซื้อฝาก
    </div>

    <div class="section">
      <span class="bold">ข้อ 5</span> ผู้ขายฝากจะดำเนินการจดทะเบียนโอนกรรมสิทธิ์ ณ สำนักงานที่ดิน
      <span class="field">${data.land_office || '_______________'}</span> ภายใน 15 วันนับแต่วันทำสัญญา
    </div>

    <div class="section">
      <span class="bold">ข้อ 6</span> บุคคลใดฝ่ายใดฝ่ายหนึ่งผิดสัญญาหรือไม่ปฏิบัติตามเงื่อนไขของสัญญา
      บุคคลนั้นจะต้องชดใช้ค่าเสียหายให้แก่อีกฝ่ายหนึ่ง
    </div>

    <div style="margin-top: 40pt;">
      <div style="text-align: center; margin-bottom: 30pt;">
        <span class="bold">ลงชื่อเป็นสักษรพยาน</span>
      </div>

      <div class="signature-area">
        <div class="signature-col">
          <div>ผู้ขายฝาก</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${data.seller_name || '_______________'}</span>)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
        <div class="signature-col">
          <div>ผู้ซื้อฝาก</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${data.buyer_name || '_______________'}</span>)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
        <div class="signature-col">
          <div>พยาน</div>
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

const generateSpBroker = (data) => {
  const witnessName = data.witness_name || 'นางสาว อารยา เพิ่มลุดสำห์';

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญาแต่งตั้งนายหน้า ขายฝาก</div>

    <p style="text-align: center;">ทำที่ ${COMPANY_INFO.name}</p>
    <p style="text-align: center;">${COMPANY_INFO.address}</p>

    <div class="date-line">
      วันที่ <span class="field">${data.contract_date || '___'}</span>
      เดือน <span class="field">___________</span>
      พ.ศ. <span class="field">___________</span>
    </div>

    <div class="section">
      สัญญาฉบับนี้ทำขึ้นระหว่าง <span class="field">${data.seller_name || '_______________'}</span>
      เลขบัตรประชาชน <span class="field">${data.seller_id_number || '_______________'}</span>
      ที่อยู่ <span class="field">${data.seller_address || '_______________'}</span>
      <span class="bold">ผู้มอบอำนาจ</span>
    </div>

    <div class="section">
      ฝ่ายหนึ่งกับ <span class="field">${data.broker_name || '_______________'}</span>
      <span class="bold">ตัวแทน/นายหน้า</span> ฝ่ายอื่น
    </div>

    <div class="section">
      <span class="bold">ข้อ 1</span> ผู้มอบอำนาจได้มอบอำนาจให้ตัวแทน/นายหน้าเพื่อดำเนินการค้นหาผู้ซื้อฝาก
      และเจรจาต่อรองราคาการขายฝากกับผู้ซื้อฝากตามเงื่อนไขของสัญญา
    </div>

    <div class="section">
      <span class="bold">ข้อ 2</span> ตัวแทน/นายหน้าจะได้รับค่าบริการจากผู้มอบอำนาจ จำนวน
      <span class="field">${formatNumber(data.service_fee) || '_______________'}</span> บาท
      (${data.service_fee_text || '_________________________________'} บาท)
    </div>

    <div class="section">
      <span class="bold">ข้อ 3</span> ตัวแทน/นายหน้ามีหน้าที่รักษาศักดิ์ศรี และชื่อเสียงของผู้มอบอำนาจ
      และต้องปฏิบัติตามกฎหมายและข้อบังคับที่เกี่ยวข้อง
    </div>

    <div style="margin-top: 40pt;">
      <div class="signature-area">
        <div class="signature-col">
          <div>ผู้มอบอำนาจ</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${data.seller_name || '_______________'}</span>)</div>
        </div>
        <div class="signature-col">
          <div>ตัวแทน/นายหน้า</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${data.broker_name || '_______________'}</span>)</div>
        </div>
        <div class="signature-col">
          <div>พยาน</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${witnessName}</span>)</div>
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

const generateSpAppendix = (data) => {
  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">เอกสารแนบท้าย<br/>สัญญาแต่งตั้งนายหน้าขายฝาก</div>

    <div class="section">
      <span class="bold">รายละเอียดทรัพย์สิน</span>
    </div>

    <div class="section">
      ${createPropertyDetails(data)}
    </div>

    <div class="section">
      <span class="bold">ข้อตกลงเพิ่มเติม</span>
    </div>

    <div class="section">
      1. ทรัพย์สินที่กำหนดไว้ข้างต้นไม่ติดด้วยสิทธิหรือข้อจำกัดใดๆ ที่อาจเสียหายต่อการ์มถือครอบครอง
    </div>

    <div class="section">
      2. ผู้ขายฝากจะต้องรักษาทรัพย์สินให้อยู่ในสภาพดี และคงค่าเช่าประจำปีและค่าบำรุงรักษา
    </div>

    <div class="section">
      3. ผู้ขายฝากจะต้องบอกรับความเสี่ยงต่างๆ ทั้งสิ้นของทรัพย์สิน
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateSpNotice = (data) => {
  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">หนังสือแจ้งเตือน<br/>เรื่องครบกำหนดไถ่ถอนทรัพย์สิน</div>

    <div class="contract-number">
      ฉบับที่ <span class="field">${data.doc_number || '___'}</span> /2568
    </div>

    <div class="date-line">
      วันที่ <span class="field">${data.contract_date || '___'}</span>
      เดือน <span class="field">___________</span>
      พ.ศ. 2568
    </div>

    <div class="section" style="text-indent: 0;">
      <span class="bold">เรียน:</span>
      <span class="field">${data.seller_name || '_______________'}</span>
    </div>

    <div class="section" style="text-indent: 0;">
      <span class="bold">เรื่อง:</span> แจ้งเตือนครบกำหนดไถ่ถอนทรัพย์สิน
    </div>

    <div class="section">
      ตามที่ท่านได้ทำสัญญาขายฝากกับ ${COMPANY_INFO.name}
      เมื่อวันที่ <span class="field">_______________</span>
    </div>

    <div class="section">
      <span class="bold">รายละเอียดทรัพย์สิน</span>
    </div>

    <div class="section">
      ประเภท: <span class="field">${data.property_type || '_______________'}</span><br/>
      โฉนด: <span class="field">${data.deed_no || '_______________'}</span><br/>
      เลขที่ดิน: <span class="field">${data.land_no || '_______________'}</span><br/>
      ที่ตั้ง: <span class="field">${data.property_address || '_______________'}</span><br/>
      จังหวัด: <span class="field">${data.province || '_______________'}</span><br/>
      รหัสทรัพย์: <span class="field">${data.property_code || '_______________'}</span>
    </div>

    <div class="section">
      บริษัท โลนด์ ดีดี จำกัด ขอแจ้งให้ทราบว่าทรัพย์สินดังกล่าวข้างต้นได้ครบกำหนดวันไถ่ถอนแล้ว
      กรุณาแจ้งความประสงค์ของท่านด่วน
    </div>

    <div class="section">
      <span class="bold">กำหนดวันไถ่ถอน:</span> <span class="field">${data.redemption_date || '_______________'}</span>
    </div>

    <div class="section">
      <span class="bold">ยอดไถ่ถอน:</span> <span class="field">${formatNumber(data.redemption_amount) || '_______________'}</span> บาท
      (${data.redemption_amount_text || '_________________________________'} บาท)
    </div>

    <div class="section">
      <span class="bold">หมายเหตุ:</span>
      ท่านได้มอบอำนาจให้ บริษัท โลนด์ ดีดี จำกัด ดำเนินการด้านต่างๆ ตามสัญญา
    </div>

    <div style="margin-top: 40pt; text-align: center;">
      <p>ด้วยความเคารพ</p>
      <div class="signature-line" style="width: 300pt; margin: 40pt auto 0;"></div>
      <p>เจ้าหน้าที่ บริษัท โลนด์ ดีดี จำกัด</p>
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateMgLoan = (data) => {
  const witnessName = data.witness_name || 'นางสาว อารยา เพิ่มลุดสำห์';

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญากู้ยืมเงิน จำนอง</div>

    <div class="contract-number">
      เลขที่เอกสาร: <span class="field">${data.doc_number || '_______________'}</span>
    </div>

    <p style="text-align: center;">ทำที่ ${COMPANY_INFO.name}</p>
    <p style="text-align: center;">${COMPANY_INFO.address}</p>

    <div class="date-line">
      วันที่ <span class="field">${data.contract_date || '___'}</span>
      เดือน <span class="field">___________</span>
      พ.ศ. <span class="field">___________</span>
    </div>

    <div class="section">
      สัญญาฉบับนี้ทำขึ้นระหว่าง <span class="field">${data.buyer_name || '_______________'}</span>
      เลขบัตรประชาชน <span class="field">${data.buyer_id_number || '_______________'}</span>
      ที่อยู่ <span class="field">${data.buyer_address || '_______________'}</span>
      <span class="bold">ผู้ให้กู้</span>
    </div>

    <div class="section">
      ฝ่ายหนึ่งกับ <span class="field">${data.seller_name || '_______________'}</span>
      เลขบัตรประชาชน <span class="field">${data.seller_id_number || '_______________'}</span>
      ที่อยู่ <span class="field">${data.seller_address || '_______________'}</span>
      รหัสทรัพย์ <span class="field">${data.property_code || '_______________'}</span>
      <span class="bold">ผู้กู้</span> ฝ่ายอื่น
    </div>

    <div class="section">
      <span class="bold">ข้อ 1</span> ผู้ให้กู้ตกลงให้ผู้กู้ยืมเงิน โดยจำนองทรัพย์สินดังต่อไปนี้
      ${createPropertyDetails(data)}
    </div>

    <div class="section">
      <span class="bold">ข้อ 2</span> จำนวนเงินที่ให้กู้ยืม <span class="field">${formatNumber(data.contract_amount) || '_______________'}</span> บาท
      (${data.contract_amount_text || '_________________________________'} บาท)
    </div>

    <div class="section">
      <span class="bold">ข้อ 3</span> ระยะเวลาการกู้ยืม <span class="field">${data.contract_duration || '___'}</span> ปี
      นับตั้งแต่วันทำสัญญา และกำหนดวันชำระหนี้
      <span class="field">${data.redemption_date || '_______________'}</span>
    </div>

    <div class="section">
      <span class="bold">ข้อ 4</span> อัตราดอกเบี้ย <span class="field">${data.interest_rate || '___'}</span> % ต่อปี
    </div>

    <div class="section">
      <span class="bold">ข้อ 5</span> ค่างวดรายเดือน <span class="field">${formatNumber(data.monthly_payment) || '_______________'}</span> บาท
      (${data.monthly_payment_text || '_________________________________'} บาท)
    </div>

    <div class="section">
      <span class="bold">ข้อ 6</span> ผู้กู้จะต้องโอนกรรมสิทธิ์ทรัพย์สินให้แก่ผู้ให้กู้โดยการจดทะเบียน
      ณ สำนักงานที่ดิน <span class="field">${data.land_office || '_______________'}</span>
      ภายใน 15 วันนับแต่วันทำสัญญา
    </div>

    <div class="section">
      <span class="bold">ข้อ 7</span> ผู้กู้หากปล่อยค่างวดไม่ชำระตามกำหนด ผู้ให้กู้มีสิทธิดำเนินการเรียกทวงหนี้
      หรือจำหน่ายทรัพย์สินที่จำนองไว้เพื่อเอาเงินคืน
    </div>

    <div style="margin-top: 40pt;">
      <div class="signature-area">
        <div class="signature-col">
          <div>ผู้กู้</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${data.seller_name || '_______________'}</span>)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
        <div class="signature-col">
          <div>ผู้ให้กู้</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${data.buyer_name || '_______________'}</span>)</div>
          <div style="font-size: 12pt; margin-top: 10pt;">วันที่_______/______/______</div>
        </div>
        <div class="signature-col">
          <div>พยาน</div>
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

const generateMgAddendum = (data) => {
  const witnessName = data.witness_name || 'นางสาว อารยา เพิ่มลุดสำห์';

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญาต่อท้ายสัญญาจำนอง</div>

    <p style="text-align: center;">ทำที่ ${COMPANY_INFO.name}</p>
    <p style="text-align: center;">${COMPANY_INFO.address}</p>

    <div class="date-line">
      วันที่ <span class="field">${data.contract_date || '___'}</span>
      เดือน <span class="field">___________</span>
      พ.ศ. <span class="field">___________</span>
    </div>

    <div class="section">
      สัญญาต่อท้ายฉบับนี้ทำขึ้นระหว่าง ผู้ให้กู้กับ
      <span class="field">${data.seller_name || '_______________'}</span>
      เลขบัตรประชาชน <span class="field">${data.seller_id_number || '_______________'}</span>
      รหัสทรัพย์ <span class="field">${data.property_code || '_______________'}</span>
      เพื่อเป็นการแก้ไขและปรับปรุงเงื่อนไขในสัญญากู้ยืมเงิน จำนอง
    </div>

    <div class="section">
      <span class="bold">ข้อ 1</span> บุคคลทั้งสองฝ่ายตกลงวางเงื่อนไขเพิ่มเติมดังต่อไปนี้
    </div>

    <div class="section">
      1. ผู้กู้จะต้องรักษาทรัพย์สินที่จำนองไว้ให้อยู่ในสภาพดี
    </div>

    <div class="section">
      2. ผู้กู้จะต้องเสียภาษีและค่าใช้ต่างๆ ของทรัพย์สินให้ทันเวลา
    </div>

    <div class="section">
      3. ผู้กู้จะต้องจัดเก็บเอกสารและใบเสร็จรับเงินไว้เพื่อให้ผู้ให้กู้ตรวจสอบได้
    </div>

    <div style="margin-top: 40pt;">
      <div class="signature-area">
        <div class="signature-col">
          <div>ผู้กู้</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${data.seller_name || '_______________'}</span>)</div>
        </div>
        <div class="signature-col">
          <div>ผู้ให้กู้</div>
          <div class="signature-line"></div>
          <div>(บริษัท โลนด์ ดีดี จำกัด)</div>
        </div>
        <div class="signature-col">
          <div>พยาน</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${witnessName}</span>)</div>
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

const generateMgAppendix = (data) => {
  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">เอกสารแนบท้าย<br/>สัญญาแต่งตั้งนายหน้าจำนอง</div>

    <div class="section">
      <span class="bold">รายละเอียดทรัพย์สินที่จำนอง</span>
    </div>

    <div class="section">
      ${createPropertyDetails(data)}
    </div>

    <div class="section">
      <span class="bold">ข้อตกลงเพิ่มเติม</span>
    </div>

    <div class="section">
      1. ทรัพย์สินดังกล่าวจะต้องไม่มีการโอนให้บุคคลอื่นหรือมีการจำนองเพิ่มเติมอีก
    </div>

    <div class="section">
      2. ผู้กู้จะต้องเสียภาษีอากรและค่าใช้ทั้งหมดของทรัพย์สินตามที่กำหนด
    </div>

    <div class="section">
      3. หากผู้กู้ไม่สามารถชำระหนี้ได้ ผู้ให้กู้มีสิทธิจำหน่ายทรัพย์สินเพื่อเอาเงินคืน
    </div>

    <div class="footer">
      ${COMPANY_INFO.name}<br/>
      ${COMPANY_INFO.address}<br/>
      โทรศัพท์ ${COMPANY_INFO.phone}
    </div>
  `;
};

const generateMgBroker = (data) => {
  const witnessName = data.witness_name || 'นางสาว อารยา เพิ่มลุดสำห์';

  return `
    <div class="header">
      <div class="logo-text">LOAN DD</div>
      <div class="logo-text">บริษัท โลนด์ ดีดี จำกัด</div>
    </div>

    <div class="title">สัญญาแต่งตั้งนายหน้า จำนอง</div>

    <p style="text-align: center;">ทำที่ ${COMPANY_INFO.name}</p>
    <p style="text-align: center;">${COMPANY_INFO.address}</p>

    <div class="date-line">
      วันที่ <span class="field">${data.contract_date || '___'}</span>
      เดือน <span class="field">___________</span>
      พ.ศ. <span class="field">___________</span>
    </div>

    <div class="section">
      สัญญาฉบับนี้ทำขึ้นระหว่าง <span class="field">${data.seller_name || '_______________'}</span>
      เลขบัตรประชาชน <span class="field">${data.seller_id_number || '_______________'}</span>
      <span class="bold">ผู้มอบอำนาจ</span>
    </div>

    <div class="section">
      ฝ่ายหนึ่งกับ <span class="field">${data.broker_name || '_______________'}</span>
      <span class="bold">ตัวแทน/นายหน้า</span> ฝ่ายอื่น
    </div>

    <div class="section">
      <span class="bold">ข้อ 1</span> ผู้มอบอำนาจได้มอบอำนาจให้ตัวแทน/นายหน้าเพื่อดำเนินการค้นหาผู้ให้กู้
      และเจรจาต่อรองเงื่อนไขการกู้ยืมเงินจำนองกับผู้ให้กู้
    </div>

    <div class="section">
      <span class="bold">ข้อ 2</span> ตัวแทน/นายหน้าจะได้รับค่าบริการจากผู้มอบอำนาจ จำนวน
      <span class="field">${formatNumber(data.service_fee) || '_______________'}</span> บาท
      (${data.service_fee_text || '_________________________________'} บาท)
    </div>

    <div class="section">
      <span class="bold">ข้อ 3</span> ตัวแทน/นายหน้าจะต้องปฏิบัติตามกฎหมายและข้อบังคับที่เกี่ยวข้อง
      และรักษาความเป็นส่วนตัวของข้อมูลผู้มอบอำนาจ
    </div>

    <div style="margin-top: 40pt;">
      <div class="signature-area">
        <div class="signature-col">
          <div>ผู้มอบอำนาจ</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${data.seller_name || '_______________'}</span>)</div>
        </div>
        <div class="signature-col">
          <div>ตัวแทน/นายหน้า</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${data.broker_name || '_______________'}</span>)</div>
        </div>
        <div class="signature-col">
          <div>พยาน</div>
          <div class="signature-line"></div>
          <div>(<span class="field">${witnessName}</span>)</div>
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
  const body = generator(data);
  const html = HTML_WRAPPER(body);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${templateType}_${timestamp}.doc`;

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

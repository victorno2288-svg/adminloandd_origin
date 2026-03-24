import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'
import MapPreview from '../components/MapPreview'
import AgentCard from '../components/AgentCard'
import CaseInfoSummary from '../components/CaseInfoSummary'
import ChecklistDocsPanel from '../components/ChecklistDocsPanel'
import LandOfficeInput from '../components/LandOfficeInput'


const token = () => localStorage.getItem('loandd_admin')
const LEGAL_API = '/api/admin/legal'

const appraisalTypeLabel = { outside: 'ประเมินนอก', inside: 'ประเมินใน', check_price: 'เช็คราคา' }
const appraisalResultLabel = { passed: 'ผ่านมาตรฐาน', not_passed: 'ไม่ผ่านมาตรฐาน', '': 'ยังไม่ประเมิน' }
const propertyTypeLabel = {
  house: 'บ้าน', townhouse: 'ทาวน์โฮม', condo: 'คอนโด',
  single_house: 'บ้านเดี่ยว (สร้างเอง)', shophouse: 'ตึกแถว',
  apartment: 'หอพัก / อพาร์ตเมนต์', land: 'ที่ดินเปล่า', other: 'อื่นๆ'
}

const legalStatusOptions = [
  { value: 'pending', label: 'รอทำนิติกรรม' },
  { value: 'completed', label: 'ทำนิติกรรมเสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

const BANKS = [
  'กรุงเทพ (BBL)', 'กสิกรไทย (KBANK)', 'กรุงไทย (KTB)', 'ไทยพาณิชย์ (SCB)',
  'กรุงศรีอยุธยา (BAY)', 'ทีทีบี (TTB)', 'ออมสิน', 'ธ.ก.ส.',
  'ซีไอเอ็มบี (CIMB)', 'ยูโอบี (UOB)', 'แลนด์ แอนด์ เฮาส์ (LH Bank)',
  'ทิสโก้ (TISCO)', 'เกียรตินาคินภัทร (KKP)', 'ซีไอเอ็มบีไทย (CIMBT)',
  'ไอซีบีซี (ไทย) (ICBC)', 'ธนาคารอิสลาม (IBANK)',
]

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateLong(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function toDateInput(d) {
  if (!d) return ''
  const s = String(d)
  // pure date string → ใช้ตรงๆ
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // datetime จาก DB มาเป็น UTC → บวก UTC+7 ก่อน format
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  const local = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const xBtnOverlay = {
  position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
  background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 11,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 2, padding: 0, lineHeight: 1
}

const xBtnInline = {
  background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%',
  width: 18, height: 18, fontSize: 9, cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
  verticalAlign: 'middle', marginLeft: 6
}

function DocUploadField({ label, fieldName, currentFile, fileRef, fileNameState, setFileNameState, onDelete }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input type="file" accept="image/*,.pdf" ref={fileRef}
        onChange={e => setFileNameState(e.target.files[0]?.name || '')} />
      {fileNameState && (
        <small style={{ color: '#04AA6D', fontSize: 11 }}>
          {fileNameState}
          <button type="button" onClick={() => { if (fileRef.current) fileRef.current.value = ''; setFileNameState('') }}
            style={xBtnInline} title="ล้างไฟล์">
            <i className="fas fa-times"></i>
          </button>
        </small>
      )}
      {currentFile && (
        <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
          <button type="button" onClick={() => onDelete(fieldName)} style={xBtnOverlay} title="ลบเอกสาร">
            <i className="fas fa-times"></i>
          </button>
          <a href={`/${currentFile}`} target="_blank" rel="noreferrer">
            {/\.pdf$/i.test(currentFile) ? (
              <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c' }}>
                <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                <span style={{ fontSize: 10, marginTop: 4 }}>PDF</span>
              </div>
            ) : (
              <img src={`/${currentFile}`} alt={label} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }}
                onError={e => { e.target.style.display = 'none' }} />
            )}
          </a>
        </div>
      )}
    </div>
  )
}

// ============================================================
// LegalSopChecklist — SOP Document Checklist (ฝ่ายนิติกรรม)
// SOP Sections: 3.1 ลูกหนี้ | 3.2 ทรัพย์ | 3.3 นายทุน | 4.1 ลงนามภายใน
// ============================================================

const SOP_SECTIONS = {
  // ─── 3.1 เอกสารลูกหนี้ (แยกตามสถานะสมรส) ──────────────────────
  borrower_single: {
    label: 'ลูกหนี้ — โสด', icon: 'fa-user', color: '#1565c0',
    items: [
      { id: 'b_id_card',    label: 'บัตรประชาชนตัวจริง (เจ้าของกรรมสิทธิ์)', required: true },
      { id: 'b_house_reg',  label: 'ทะเบียนบ้านตัวจริง',                       required: true },
      { id: 'b_name_chg',   label: 'ใบเปลี่ยนชื่อ-สกุล (ถ้ามี)',               required: false },
    ]
  },
  borrower_married_reg: {
    label: 'ลูกหนี้ — สมรสจดทะเบียน', icon: 'fa-heart', color: '#6a1b9a',
    items: [
      { id: 'b_id_card',       label: 'บัตรประชาชนตัวจริง (เจ้าของกรรมสิทธิ์)',  required: true },
      { id: 'b_house_reg',     label: 'ทะเบียนบ้านตัวจริง (ผู้กู้)',              required: true },
      { id: 'b_marriage_cert', label: 'ใบสำคัญการสมรส (ตัวจริง)',                required: true },
      { id: 'b_sp_id_card',    label: 'บัตรประชาชนตัวจริง (คู่สมรส)',            required: true },
      { id: 'b_sp_house_reg',  label: 'ทะเบียนบ้าน (คู่สมรส)',                   required: true },
      { id: 'b_sp_consent',    label: 'ใบยินยอมคู่สมรส 2 ฉบับ (ถ้าคู่สมรสไม่มา)', required: false },
      { id: 'b_name_chg',      label: 'ใบเปลี่ยนชื่อ-สกุล (ถ้ามี)',              required: false },
    ]
  },
  borrower_married_unreg: {
    label: 'ลูกหนี้ — สมรสไม่จดทะเบียน', icon: 'fa-user-friends', color: '#e65100',
    items: [
      { id: 'b_id_card',     label: 'บัตรประชาชนตัวจริง',                                              required: true },
      { id: 'b_house_reg',   label: 'ทะเบียนบ้านตัวจริง',                                              required: true },
      { id: 'b_police_rec',  label: 'บันทึกประจำวันจากสถานีตำรวจ (ยืนยันทำธุรกรรมคนเดียว)',           required: true },
      { id: 'b_name_chg',    label: 'ใบเปลี่ยนชื่อ-สกุล (ถ้ามี)',                                     required: false },
    ]
  },
  borrower_divorced: {
    label: 'ลูกหนี้ — หย่า', icon: 'fa-user-slash', color: '#c62828',
    items: [
      { id: 'b_id_card',      label: 'บัตรประชาชนตัวจริง',          required: true },
      { id: 'b_house_reg',    label: 'ทะเบียนบ้านตัวจริง',          required: true },
      { id: 'b_divorce_doc',  label: 'ใบสำคัญการหย่า (ตัวจริง)',    required: true },
      { id: 'b_name_chg',     label: 'ใบเปลี่ยนชื่อ-สกุล (ถ้ามี)', required: false },
    ]
  },
  borrower_inherited: {
    label: 'ลูกหนี้ — ผู้จัดการมรดก', icon: 'fa-scroll', color: '#2e7d32',
    items: [
      { id: 'b_id_card',       label: 'บัตรประชาชนตัวจริง (ผู้จัดการมรดก)',     required: true },
      { id: 'b_house_reg',     label: 'ทะเบียนบ้านตัวจริง (ผู้จัดการมรดก)',     required: true },
      { id: 'b_court_cert',    label: 'หนังสือรับรองคดีถึงที่สุด (จากศาล)',      required: true },
      { id: 'b_death_cert',    label: 'ใบมรณบัตรของผู้ตาย',                     required: true },
    ]
  },

  // ─── 3.2 เอกสารสิทธิ์ทรัพย์ (แยกตามประเภท) ──────────────────────
  prop_project: {
    label: 'ทรัพย์ — โครงการจัดสรร (บ้านโครงการ)', icon: 'fa-home', color: '#0277bd',
    items: [
      { id: 'p_deed',      label: 'โฉนดที่ดิน (ตัวจริง)',               required: true },
      { id: 'p_house_reg', label: 'ทะเบียนบ้านของทรัพย์ที่จะทำนิติกรรม', required: true },
    ]
  },
  prop_selfbuild: {
    label: 'ทรัพย์ — ที่ดินพร้อมสิ่งปลูกสร้าง (บ้านสร้างเอง)', icon: 'fa-tools', color: '#558b2f',
    items: [
      { id: 'p_deed',           label: 'โฉนดที่ดิน (ตัวจริง)',                                           required: true },
      { id: 'p_house_reg',      label: 'ทะเบียนบ้านของทรัพย์สิน',                                       required: true },
      { id: 'p_build_permit',   label: 'ใบขออนุญาตสิ่งปลูกสร้าง (อ.1)',                                  required: true },
      { id: 'p_house_num_perm', label: 'ใบขออนุญาตออกบ้านเลขที่ (ท.ร.14)',                               required: true },
      { id: 'p_seizure_lift',   label: 'ใบถอนอายัด (กรณีทรัพย์ไม่ชำระภาษีครัวเรือน)',                  required: false },
    ]
  },
  prop_condo: {
    label: 'ทรัพย์ — อาคารชุด / คอนโดมิเนียม', icon: 'fa-building', color: '#00838f',
    items: [
      { id: 'p_condo_deed',    label: 'โฉนด / หนังสือกรรมสิทธิ์ห้องชุด (ตัวจริง)',    required: true },
      { id: 'p_house_reg',     label: 'ทะเบียนบ้านของทรัพย์สิน',                       required: true },
      { id: 'p_debt_free',     label: 'ใบปลอดหนี้ (ขอจากนิติบุคคลอาคารชุด)',           required: true },
      { id: 'p_seizure_lift',  label: 'ใบถอนอายัด (กรณีทรัพย์ไม่ชำระภาษีครัวเรือน)', required: false },
    ]
  },
  prop_land: {
    label: 'ทรัพย์ — ที่ดินเปล่า', icon: 'fa-map', color: '#6d4c41',
    items: [
      { id: 'p_deed',          label: 'โฉนดที่ดิน (ตัวจริง)',                              required: true },
      { id: 'p_sale_contract', label: 'สัญญาซื้อขาย (ถ้ามี)',                              required: false },
      { id: 'p_seizure_lift',  label: 'ใบถอนอายัด (กรณีทรัพย์ไม่ชำระภาษีครัวเรือน)',    required: false },
    ]
  },
  prop_hotel: {
    label: 'ทรัพย์ — โรงแรม / อพาร์ทเมนต์ / โกดัง', icon: 'fa-warehouse', color: '#4527a0',
    items: [
      { id: 'p_deed',          label: 'โฉนดที่ดิน (ตัวจริง)',                    required: true },
      { id: 'p_blueprint',     label: 'แบบแปลน / ใบอนุญาตโรงแรม (ถ้ามี)',      required: false },
      { id: 'p_hotel_license', label: 'ใบอนุญาตประกอบกิจการโรงแรม (ถ้ามี)',    required: false },
      { id: 'p_factory_permit',label: 'ใบ รง.4 หรือใบอนุญาตคลังสินค้า (โกดัง)', required: false },
    ]
  },

  // ─── 3.3 เอกสารนายทุน ──────────────────────────────────────────────
  investor_self: {
    label: 'นายทุน — มาด้วยตนเอง', icon: 'fa-user-tie', color: '#1b5e20',
    items: [
      { id: 'i_id_card',       label: 'บัตรประชาชนตัวจริง',                                    required: true },
      { id: 'i_house_reg',     label: 'ทะเบียนบ้านตัวจริง',                                    required: true },
      { id: 'i_marriage_cert', label: 'สำเนาทะเบียนสมรส (ถ้ามี)',                              required: false },
      { id: 'i_sp_house_reg',  label: 'สำเนาทะเบียนบ้านคู่สมรส (ถ้ามี)',                      required: false },
      { id: 'i_sp_id_card',    label: 'สำเนาบัตรประชาชนคู่สมรส (ถ้ามี)',                      required: false },
      { id: 'i_sp_consent',    label: 'หนังสือยินยอมคู่สมรส (ถ้าคู่สมรสไม่มาด้วยตนเอง)',    required: false },
      { id: 'i_divorce_doc',   label: 'สำเนาใบสำคัญหย่า (ถ้ามี)',                             required: false },
      { id: 'i_name_chg',      label: 'สำเนาใบเปลี่ยนชื่อ-สกุล (ถ้ามี)',                     required: false },
    ]
  },
  investor_poa: {
    label: 'นายทุน — มอบอำนาจ (ตัวแทน)', icon: 'fa-file-signature', color: '#bf360c',
    items: [
      { id: 'i_poa',           label: 'ใบมอบอำนาจ (ลงลายมือชื่อผู้มอบ) 2 ฉบับ',           required: true },
      { id: 'i_id_card',       label: 'สำเนาบัตรประชาชน (ผู้มอบอำนาจ)',                     required: true },
      { id: 'i_house_reg',     label: 'สำเนาทะเบียนบ้าน (ผู้มอบอำนาจ)',                    required: true },
      { id: 'i_marriage_cert', label: 'สำเนาทะเบียนสมรส (ถ้ามี)',                           required: false },
      { id: 'i_sp_house_reg',  label: 'สำเนาทะเบียนบ้านคู่สมรส (ถ้ามี)',                   required: false },
      { id: 'i_sp_id_card',    label: 'สำเนาบัตรประชาชนคู่สมรส (ถ้ามี)',                   required: false },
      { id: 'i_sp_consent',    label: 'หนังสือยินยอมคู่สมรส (ถ้าคู่สมรสไม่มาด้วยตนเอง)', required: false },
      { id: 'i_divorce_doc',   label: 'สำเนาใบสำคัญหย่า (ถ้ามี)',                          required: false },
      { id: 'i_name_chg',      label: 'สำเนาใบเปลี่ยนชื่อ-สกุล (ถ้ามี)',                  required: false },
    ]
  },
  investor_company: {
    label: 'นายทุน — นิติบุคคล / บริษัท', icon: 'fa-building', color: '#37474f',
    items: [
      { id: 'i_co_cert',       label: 'หนังสือรับรองบริษัท',                              required: true },
      { id: 'i_co_obj',        label: 'รายละเอียดวัตถุประสงค์บริษัท',                    required: true },
      { id: 'i_co_memo',       label: 'หนังสือบริคณห์สนธิ',                              required: true },
      { id: 'i_co_reg',        label: 'รายการจดทะเบียนจัดตั้งบริษัท',                    required: true },
      { id: 'i_co_shareholders','label': 'สำเนาบัญชีผู้ถือหุ้น',                         required: true },
      { id: 'i_co_minutes1',   label: 'รายงานการประชุมตั้งบริษัท',                        required: true },
      { id: 'i_co_sign_sample', label: 'ตัวอย่างลายมือชื่อกรรมการบริษัท',               required: true },
      { id: 'i_co_minutes2',   label: 'รายงานการประชุม (วาระรับซื้อฝาก/รับจำนอง)',       required: true },
      { id: 'i_id_card',       label: 'บัตรประชาชนกรรมการ (ตัวจริง)',                    required: true },
      { id: 'i_house_reg',     label: 'ทะเบียนบ้านกรรมการ (ตัวจริง)',                    required: true },
    ]
  },

  // ─── 4.1 เอกสารลงนามภายใน (ก่อนพบเจ้าหน้าที่กรมที่ดิน) ────────
  internal_selling_pledge: {
    label: 'สัญญาลงนามภายใน — ขายฝาก', icon: 'fa-pen-fancy', color: '#880e4f',
    items: [
      { id: 'si_sale_pledge_contract',  label: 'สัญญาขายฝาก (ลูกหนี้ลงนาม)',                required: true },
      { id: 'si_broker_contract_sp',    label: 'สัญญาแต่งตั้งนายหน้า — ขายฝาก',            required: true },
      { id: 'si_broker_attachment_sp',  label: 'เอกสารแนบท้ายสัญญานายหน้า — ขายฝาก',       required: true },
    ]
  },
  internal_mortgage: {
    label: 'สัญญาลงนามภายใน — จำนอง', icon: 'fa-pen-fancy', color: '#01579b',
    items: [
      { id: 'si_broker_contract_m',   label: 'สัญญาแต่งตั้งนายหน้า — จำนอง',          required: true },
      { id: 'si_broker_attachment_m', label: 'เอกสารแนบท้ายสัญญานายหน้า — จำนอง',     required: true },
      { id: 'si_loan_contract',       label: 'สัญญากู้ยืมเงิน',                         required: true },
      { id: 'si_mortgage_attachment', label: 'สัญญาต่อท้ายสัญญาจำนอง',                 required: true },
    ]
  },
}

// Map marital_status → borrower section key
const BORROWER_SECTION_MAP = {
  single:          'borrower_single',
  married:         'borrower_married_reg',   // ★ CaseEditPage ใช้ค่า 'married'
  married_reg:     'borrower_married_reg',
  married_unreg:   'borrower_married_unreg',
  divorced:        'borrower_divorced',
  widowed:         'borrower_divorced',      // ★ หม้าย → ใช้ section เดียวกับหย่า (ไม่มีคู่สมรสแล้ว)
  inherited:       'borrower_inherited',
}
// Map property_type → property section key
const PROP_SECTION_MAP = {
  house:        'prop_project',
  single_house: 'prop_project',
  townhouse:    'prop_project',
  'บ้านเดี่ยว': 'prop_project',
  'บ้าน':        'prop_project',
  'ทาวน์โฮม':    'prop_project',
  selfbuild:     'prop_selfbuild',
  condo:        'prop_condo',
  'คอนโด':       'prop_condo',
  land:         'prop_land',
  'ที่ดิน':      'prop_land',
  shophouse:    'prop_project',
  'ตึกแถว':      'prop_project',
  hotel:        'prop_hotel',
  apartment:    'prop_hotel',
  warehouse:    'prop_hotel',
  'โรงแรม':      'prop_hotel',
  'อพาร์ทเมนต์': 'prop_hotel',
  'โกดัง':       'prop_hotel',
}
// Map investor_marital_status → investor section key
const INVESTOR_SECTION_MAP = {
  single:   'investor_self',
  married:  'investor_self',
  divorced: 'investor_self',
  widowed:  'investor_self',
  poa:      'investor_poa',
  company:  'investor_company',
}

function buildSectionsForCase(maritalStatus, propertyType, investorMaritalStatus, loanType) {
  const sections = []
  // Borrower section
  const borrowerKey = BORROWER_SECTION_MAP[maritalStatus]
  if (borrowerKey) sections.push({ key: borrowerKey, ...SOP_SECTIONS[borrowerKey] })
  // Property section
  const propKey = PROP_SECTION_MAP[propertyType] || (propertyType ? 'prop_project' : null)
  if (propKey) sections.push({ key: propKey, ...SOP_SECTIONS[propKey] })
  // Investor section
  const investorKey = INVESTOR_SECTION_MAP[investorMaritalStatus]
  if (investorKey) sections.push({ key: investorKey, ...SOP_SECTIONS[investorKey] })
  // Internal contracts
  const isSelling = loanType === 'selling_pledge' || loanType === 'ขายฝาก'
  const isMortgage = loanType === 'mortgage' || loanType === 'จำนอง'
  if (isSelling) sections.push({ key: 'internal_selling_pledge', ...SOP_SECTIONS.internal_selling_pledge })
  if (isMortgage) sections.push({ key: 'internal_mortgage', ...SOP_SECTIONS.internal_mortgage })
  return sections
}

function LegalSopChecklist({ caseData, checklist, onChange, caseId }) {
  if (!caseData) return null

  const sections = buildSectionsForCase(
    caseData.marital_status,
    caseData.property_type,
    caseData.investor_marital_status,
    caseData.legal_approval_type || caseData.loan_type_detail,
  )

  const allItems = sections.flatMap(s => s.items.map(item => ({ ...item, sectionKey: s.key })))
  const requiredItems = allItems.filter(i => i.required)
  const checkedRequired = requiredItems.filter(i => checklist[i.id]?.checked).length
  const allChecked = allItems.filter(i => checklist[i.id]?.checked).length
  const totalAll = allItems.length
  const progress = requiredItems.length > 0 ? Math.round((checkedRequired / requiredItems.length) * 100) : 0
  const isReady = checkedRequired === requiredItems.length && requiredItems.length > 0

  const toggle = (itemId) => {
    onChange(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], checked: !(prev[itemId]?.checked) }
    }))
  }
  const setNote = (itemId, note) => {
    onChange(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], note }
    }))
  }

  if (sections.length === 0) {
    return (
      <div style={{ padding: '16px', background: '#fffbeb', border: '1px dashed #fbbf24', borderRadius: 8, fontSize: 13, color: '#92400e', textAlign: 'center' }}>
        <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
        ยังไม่สามารถแสดง Checklist ได้ — กรุณาเลือกสถานะสมรสลูกหนี้ และสถานะภาพนายทุนก่อน
      </div>
    )
  }

  return (
    <div>
      {/* ── Progress Header ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18,
        background: isReady ? '#dcfce7' : '#fef9c3',
        border: `2px solid ${isReady ? '#86efac' : '#fde68a'}`,
        borderRadius: 10, padding: '12px 16px',
      }}>
        <div style={{ fontSize: 28 }}>{isReady ? '✅' : '📋'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: isReady ? '#166534' : '#92400e', marginBottom: 4 }}>
            {isReady ? 'เอกสารจำเป็นครบทุกรายการ — พร้อมไปกรมที่ดิน' : `ยังขาดเอกสารจำเป็น (${checkedRequired}/${requiredItems.length} รายการ)`}
          </div>
          <div style={{ fontSize: 12, color: '#555' }}>
            ติ๊กแล้ว {allChecked}/{totalAll} รายการ
            <span style={{ marginLeft: 8, color: '#888' }}>(⭐ = จำเป็น)</span>
          </div>
          <div style={{
            marginTop: 6, height: 6, borderRadius: 4,
            background: '#e5e7eb', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width 0.3s ease',
              background: isReady ? '#22c55e' : '#f59e0b',
              width: `${progress}%`,
            }} />
          </div>
        </div>
        <div style={{
          fontSize: 22, fontWeight: 800, color: isReady ? '#166534' : '#b45309',
          minWidth: 48, textAlign: 'center',
        }}>{progress}%</div>
      </div>

      {/* ── Sections ─────────────────────────────────────────── */}
      {sections.map(section => {
        const sectionChecked = section.items.filter(i => checklist[i.id]?.checked).length
        return (
          <div key={section.key} style={{
            marginBottom: 16, border: `1.5px solid ${section.color}30`,
            borderRadius: 10, overflow: 'hidden',
          }}>
            {/* Section header */}
            <div style={{
              background: `${section.color}12`,
              borderBottom: `1px solid ${section.color}25`,
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                background: section.color, color: '#fff', borderRadius: 6,
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, flexShrink: 0,
              }}>
                <i className={`fas ${section.icon}`} />
              </div>
              <div style={{ flex: 1, fontWeight: 700, fontSize: 13, color: section.color }}>
                {section.label}
              </div>
              <div style={{
                background: sectionChecked === section.items.length ? '#dcfce7' : '#f3f4f6',
                color: sectionChecked === section.items.length ? '#166534' : '#6b7280',
                border: `1px solid ${sectionChecked === section.items.length ? '#86efac' : '#e5e7eb'}`,
                borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
              }}>
                {sectionChecked}/{section.items.length}
              </div>
            </div>

            {/* Items */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff' }}>
              {section.items.map(item => {
                const state = checklist[item.id] || {}
                const isChecked = !!state.checked
                return (
                  <div key={item.id} style={{
                    border: `1px solid ${isChecked ? section.color + '60' : '#e5e7eb'}`,
                    borderRadius: 8, padding: '8px 12px',
                    background: isChecked ? `${section.color}06` : '#fafafa',
                    transition: 'all 0.15s ease',
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.id)}
                        style={{ marginTop: 2, width: 16, height: 16, accentColor: section.color, cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: isChecked ? 700 : 400, color: isChecked ? '#111' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.label}
                          {item.required && (
                            <span style={{ color: '#ef4444', fontSize: 11, flexShrink: 0 }}>⭐</span>
                          )}
                          {isChecked && (
                            <span style={{ color: section.color, fontSize: 11, flexShrink: 0 }}>
                              <i className="fas fa-check-circle" />
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                    {/* Note — shows when checked */}
                    {isChecked && (
                      <div style={{ marginTop: 6, paddingLeft: 26 }}>
                        <input
                          type="text"
                          value={state.note || ''}
                          onChange={e => setNote(item.id, e.target.value)}
                          placeholder="หมายเหตุ (ไม่บังคับ)"
                          style={{
                            width: '100%', padding: '4px 8px', fontSize: 12,
                            border: '1px solid #d1d5db', borderRadius: 6,
                            background: '#fff', color: '#374151',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function LegalEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')

  // ★ แจ้งฝ่ายอื่น
  const [notifySalesScheduled, setNotifySalesScheduled] = useState(false)
  const [notifySalesCompleted, setNotifySalesCompleted] = useState(false)
  const [notifyAccountingCompleted, setNotifyAccountingCompleted] = useState(false)

  // ★ SOP Document Checklist state  { [itemId]: { checked: bool, note: string } }
  const [checklist, setChecklist] = useState({})

  // ===== Legal form state =====
  const [legalForm, setLegalForm] = useState({
    officer_name: '', visit_date: '', land_office: '', time_slot: '',
    legal_status: 'pending', note: '',
    // ★ Contract dates (บันทึกวันทำสัญญาจริง)
    contract_years: '',       // ระยะเวลาสัญญา (ปี) — แก้ไขได้โดยฝ่ายนิติกรรม
    interest_rate: '',        // อัตราดอกเบี้ย % ต่อปี — แก้ไขได้โดยฝ่ายนิติกรรม
    contract_start_date: '',          // วันทำสัญญาที่กรมที่ดิน
    contract_end_date: '',            // วันหมดอายุสัญญา (คำนวณอัตโนมัติจาก contract_years)
    contract_redemption_amount: '',   // ยอดสินไถ่ (ขายฝาก) = วงเงิน × (1 + ดอกเบี้ย × ปี)
    // ★ Financial Protocol (SOP Phase 4)
    net_payout: '',          // ยอดโอนสุทธิให้ลูกหนี้
    payment_method: '',      // วิธีชำระ: cash | transfer | cheque
    actual_transfer_fee: '', // ค่าโอนจริงที่กรมที่ดิน
    actual_stamp_duty: '',   // อากรแสตมป์จริง
    // ★ บัญชีนายหน้า (สำหรับจ่ายค่าคอมมิชชั่น)
    agent_bank_name: '',
    agent_bank_account_no: '',
    agent_bank_account_name: '',
    // ★ บัญชีลูกหนี้ (สำหรับรับเงิน)
    debtor_bank_name: '',
    debtor_bank_account_no: '',
    debtor_bank_account_name: '',
    // ★ บัญชีนายทุน (สำหรับสัญญา)
    investor_bank_name: '',
    investor_bank_account_no: '',
    investor_bank_account_name: '',
    // ★ สถานะภาพนายทุน (SOP ฝ่ายนิติกรรม 2.3.3)
    investor_marital_status: '',
    // ★ Checklist ก่อนนัดกรมที่ดิน
    closing_check_schedule: 0,
    closing_check_personal: 0,
    closing_check_legal: 0,
    closing_check_docs: 0,
  })

  // ===== Document file refs =====
  const attachmentRef = useRef(null)
  const docSellingPledgeRef = useRef(null)
  const deedSellingPledgeRef = useRef(null)
  const docExtensionRef = useRef(null)
  const deedExtensionRef = useRef(null)
  const docRedemptionRef = useRef(null)
  const deedRedemptionRef = useRef(null)
  const transactionSlipRef = useRef(null)       // ★ สลิปค่าปากถุง
  const advanceSlipRef = useRef(null)           // ★ สลิปค่าหักล่วงหน้า
  const taxReceiptRef = useRef(null)            // ★ ใบเสร็จค่าธรรมเนียม/ภาษี
  const borrowerIdCardLegalRef = useRef(null)   // ★ บัตรประชาชนเจ้าของทรัพย์
  const agentPaymentSlipRef = useRef(null)      // ★ สลิปค่านายหน้า (ฝ่ายนิติอัพโหลด)
  const agentBankBookRef = useRef(null)         // ★ หน้าสมุดบัญชีนายหน้า (OCR โดยฝ่ายนิติ)
  const debtorBankBookRef = useRef(null)        // ★ หน้าสมุดบัญชีลูกหนี้ (OCR โดยฝ่ายนิติ)
  const investorBankBookRef = useRef(null)      // ★ หน้าสมุดบัญชีนายทุน (OCR โดยฝ่ายนิติ)

  // ★ Passbook OCR state — นายหน้า
  const [passbookOcrLoading, setPassbookOcrLoading] = useState(false)
  const [passbookOcrMsg, setPassbookOcrMsg] = useState('')
  // ★ Passbook OCR state — ลูกหนี้
  const [debtorPassbookOcrLoading, setDebtorPassbookOcrLoading] = useState(false)
  const [debtorPassbookOcrMsg, setDebtorPassbookOcrMsg] = useState('')
  // ★ Passbook OCR state — นายทุน
  const [investorPassbookOcrLoading, setInvestorPassbookOcrLoading] = useState(false)
  const [investorPassbookOcrMsg, setInvestorPassbookOcrMsg] = useState('')

  // ★ local preview URLs (URL.createObjectURL) สำหรับแสดงรูปก่อน save
  const [localPreviews, setLocalPreviews] = useState({
    agent_bank_book: null,
    agent_payment_slip: null,
    debtor_bank_book: null,
    investor_bank_book: null,
  })
  const setLocalPreview = (field, file) => {
    if (file && file.type && file.type.startsWith('image/')) {
      setLocalPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }))
    } else {
      setLocalPreviews(prev => ({ ...prev, [field]: null }))
    }
  }

  const [fileNames, setFileNames] = useState({
    attachment: '', doc_selling_pledge: '', deed_selling_pledge: '',
    doc_extension: '', deed_extension: '', doc_redemption: '', deed_redemption: '',
    transaction_slip: '', advance_slip: '', tax_receipt: '',
    borrower_id_card_legal: '',
  })
  const setFileName = (field, name) => setFileNames(prev => ({ ...prev, [field]: name }))

  // ★ legal_documents — PDF รวมเอกสาร
  const [legalDocs, setLegalDocs] = useState([])
  const [legalDocUploading, setLegalDocUploading] = useState(false)
  const [legalDocNote, setLegalDocNote] = useState('')
  const legalDocRef = useRef(null)
  const [legalDocFileName, setLegalDocFileName] = useState('')
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 640)
  const [videoFiles, setVideoFiles] = useState([])  // VDO จาก checklist-docs
  useEffect(() => {
    const onResize = () => setIsSmallScreen(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const setL = (k, v) => setLegalForm(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token()}` }
    fetch(`${LEGAL_API}/cases/${id}`, { headers })
      .then(r => r.json())
      .then(legalData => {
        if (legalData.success) {
          const c = legalData.caseData
          setCaseData(c)
          // ★ Load doc checklist from DB
          if (c.doc_checklist_json) {
            try { setChecklist(JSON.parse(c.doc_checklist_json)) } catch { /* ignore */ }
          }
          setLegalForm({
            officer_name: c.officer_name || '',
            visit_date: toDateInput(c.transaction_date || c.visit_date),
            land_office: c.transaction_land_office || c.land_office || '',
            time_slot: c.transaction_time || c.time_slot || '',
            legal_status: c.legal_status || 'pending',
            note: c.note || '',
            // ★ Contract dates
            contract_years: c.contract_years || '',
            interest_rate: c.interest_rate || '',
            contract_start_date: toDateInput(c.contract_start_date),
            contract_end_date: toDateInput(c.contract_end_date),
            contract_redemption_amount: c.contract_redemption_amount || '',
            // ★ Financial Protocol
            net_payout: c.net_payout || '',
            payment_method: c.payment_method || '',
            actual_transfer_fee: c.actual_transfer_fee || '',
            actual_stamp_duty: c.actual_stamp_duty || '',
            // ★ บัญชีนายหน้า (lt มีค่า fallback จาก agent profile)
            agent_bank_name: c.agent_bank_name || c.agent_bank_name_profile || '',
            agent_bank_account_no: c.agent_bank_account_no || c.agent_bank_account_no_profile || '',
            agent_bank_account_name: c.agent_bank_account_name || c.agent_bank_account_name_profile || '',
            debtor_bank_name: c.debtor_bank_name || '',
            debtor_bank_account_no: c.debtor_bank_account_no || '',
            debtor_bank_account_name: c.debtor_bank_account_name || '',
            investor_bank_name: c.investor_bank_name || c.investor_bank_name_profile || '',
            investor_bank_account_no: c.investor_bank_account_no || c.investor_bank_account_no_profile || '',
            investor_bank_account_name: c.investor_bank_account_name || c.investor_bank_account_name_profile || '',
            // ★ สถานะภาพนายทุน
            investor_marital_status: c.investor_marital_status || '',
            // ★ Checklist ก่อนนัดกรมที่ดิน
            closing_check_schedule: c.closing_check_schedule || 0,
            closing_check_personal: c.closing_check_personal || 0,
            closing_check_legal:    c.closing_check_legal    || 0,
            closing_check_docs:     c.closing_check_docs     || 0,
          })
        }
        setLoading(false)
        // ★ โหลด legal_documents
        fetch(`${LEGAL_API}/cases/${id}/documents`, { headers })
          .then(r => r.json()).then(d => { if (d.success) setLegalDocs(d.documents || []) })
          .catch(() => {})
      }).catch(() => setLoading(false))
  }, [id])

  // โหลด VDO ทรัพย์จาก checklist-docs (shared route)
  useEffect(() => {
    if (!caseData?.loan_request_id) return
    fetch(`/api/admin/debtors/${caseData.loan_request_id}/checklist-docs`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success && d.docs?.property_video) setVideoFiles(d.docs.property_video) })
      .catch(() => {})
  }, [caseData?.loan_request_id])

  // ลบเอกสารนิติกรรม
  const deleteDocument = async (column) => {
    if (!confirm('ต้องการลบเอกสารนี้?')) return
    try {
      const res = await fetch(`${LEGAL_API}/delete-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ case_id: id, column })
      })
      const data = await res.json()
      if (data.success) setCaseData(prev => ({ ...prev, [column]: null }))
      else alert(data.message || 'ลบไม่สำเร็จ')
    } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
  }

  // ★ อัพโหลด PDF รวมเอกสาร
  const handleLegalDocUpload = async () => {
    if (!legalDocRef.current?.files[0]) return
    setLegalDocUploading(true)
    try {
      const fd = new FormData()
      fd.append('legal_doc_pdf', legalDocRef.current.files[0])
      if (legalDocNote.trim()) fd.append('note', legalDocNote.trim())
      const res = await fetch(`${LEGAL_API}/cases/${id}/documents`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd
      })
      const data = await res.json()
      if (data.success) {
        setLegalDocs(prev => [data.document, ...prev])
        setLegalDocFileName('')
        setLegalDocNote('')
        if (legalDocRef.current) legalDocRef.current.value = ''
      } else alert(data.message || 'อัพโหลดไม่สำเร็จ')
    } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
    setLegalDocUploading(false)
  }

  // ★ ลบ PDF รวมเอกสาร
  const handleLegalDocDelete = async (docId) => {
    if (!confirm('ต้องการลบไฟล์นี้?')) return
    try {
      const res = await fetch(`${LEGAL_API}/documents/${docId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (data.success) setLegalDocs(prev => prev.filter(d => d.id !== docId))
      else alert(data.message || 'ลบไม่สำเร็จ')
    } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
  }

  // ★ Passbook OCR — อ่านสมุดบัญชีนายหน้า → auto-fill ข้อมูลธนาคาร
  const handlePassbookOcr = async (file) => {
    if (!file) return
    setPassbookOcrLoading(true)
    setPassbookOcrMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', 'passbook')
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success && data.extracted) {
        const ex = data.extracted
        const updates = {}
        if (ex.bank_name)      updates.agent_bank_name = ex.bank_name
        if (ex.account_number) updates.agent_bank_account_no = ex.account_number
        if (ex.account_name)   updates.agent_bank_account_name = ex.account_name
        if (Object.keys(updates).length > 0) {
          setLegalForm(prev => ({ ...prev, ...updates }))
          setPassbookOcrMsg('✅ OCR สำเร็จ — ตรวจสอบข้อมูลธนาคารด้วยนะคะ')
        } else {
          setPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเองได้เลยค่ะ')
        }
      } else {
        setPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเองได้เลยค่ะ')
      }
    } catch {
      setPassbookOcrMsg('⚠️ OCR ล้มเหลว')
    } finally {
      setPassbookOcrLoading(false)
    }
  }

  // ★ Passbook OCR — ลูกหนี้
  const handleDebtorPassbookOcr = async (file) => {
    if (!file) return
    setDebtorPassbookOcrLoading(true)
    setDebtorPassbookOcrMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', 'passbook')
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success && data.extracted) {
        const ex = data.extracted
        const updates = {}
        if (ex.bank_name)      updates.debtor_bank_name = ex.bank_name
        if (ex.account_number) updates.debtor_bank_account_no = ex.account_number
        if (ex.account_name)   updates.debtor_bank_account_name = ex.account_name
        if (Object.keys(updates).length > 0) {
          setLegalForm(prev => ({ ...prev, ...updates }))
          setDebtorPassbookOcrMsg('✅ OCR สำเร็จ — ตรวจสอบข้อมูลธนาคารด้วยนะคะ')
        } else {
          setDebtorPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเองได้เลยค่ะ')
        }
      } else {
        setDebtorPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเองได้เลยค่ะ')
      }
    } catch {
      setDebtorPassbookOcrMsg('⚠️ OCR ล้มเหลว')
    } finally {
      setDebtorPassbookOcrLoading(false)
    }
  }

  // ★ Passbook OCR — นายทุน
  const handleInvestorPassbookOcr = async (file) => {
    if (!file) return
    setInvestorPassbookOcrLoading(true)
    setInvestorPassbookOcrMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', 'passbook')
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success && data.extracted) {
        const ex = data.extracted
        const updates = {}
        if (ex.bank_name)      updates.investor_bank_name = ex.bank_name
        if (ex.account_number) updates.investor_bank_account_no = ex.account_number
        if (ex.account_name)   updates.investor_bank_account_name = ex.account_name
        if (Object.keys(updates).length > 0) {
          setLegalForm(prev => ({ ...prev, ...updates }))
          setInvestorPassbookOcrMsg('✅ OCR สำเร็จ — ตรวจสอบข้อมูลธนาคารด้วยนะคะ')
        } else {
          setInvestorPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเองได้เลยค่ะ')
        }
      } else {
        setInvestorPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเองได้เลยค่ะ')
      }
    } catch {
      setInvestorPassbookOcrMsg('⚠️ OCR ล้มเหลว')
    } finally {
      setInvestorPassbookOcrLoading(false)
    }
  }

  // บันทึกข้อมูลฝ่ายนิติกรรม
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')
    try {
      const fd = new FormData()
      Object.entries(legalForm).forEach(([k, v]) => fd.append(k, v ?? ''))
      // ★ Save SOP checklist
      fd.append('doc_checklist_json', JSON.stringify(checklist))
      const docRefs = {
        attachment: attachmentRef, doc_selling_pledge: docSellingPledgeRef, deed_selling_pledge: deedSellingPledgeRef,
        doc_extension: docExtensionRef, deed_extension: deedExtensionRef,
        doc_redemption: docRedemptionRef, deed_redemption: deedRedemptionRef,
        transaction_slip: transactionSlipRef,
        advance_slip: advanceSlipRef,
        tax_receipt: taxReceiptRef,
        borrower_id_card_legal: borrowerIdCardLegalRef,
        agent_payment_slip: agentPaymentSlipRef,
        agent_bank_book: agentBankBookRef,
        debtor_bank_book: debtorBankBookRef,
        investor_bank_book: investorBankBookRef,
      }
      Object.entries(docRefs).forEach(([k, ref]) => { if (ref.current?.files[0]) fd.append(k, ref.current.files[0]) })
      // เพิ่ม notify_types
      const notifyTypes = []
      if (notifySalesScheduled) notifyTypes.push('legal_scheduled_to_sales')
      if (notifySalesCompleted) notifyTypes.push('legal_completed_to_sales')
      if (notifyAccountingCompleted) notifyTypes.push('legal_completed_to_accounting')
      if (notifyTypes.length > 0) fd.append('notify_types', JSON.stringify(notifyTypes))

      const legalRes = await fetch(`${LEGAL_API}/cases/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token()}` }, body: fd })
      const lData = await legalRes.json()

      if (lData.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setLocalPreviews({ agent_bank_book: null, agent_payment_slip: null, debtor_bank_book: null, investor_bank_book: null })
        setTimeout(() => navigate('/legal'), 1200)
      } else {
        setMsg(lData.message || 'เกิดข้อผิดพลาด')
      }
    } catch { setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
      <p style={{ marginTop: 12 }}>กำลังโหลดข้อมูล...</p>
    </div>
  )

  if (!caseData) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#e74c3c' }}></i>
      <p style={{ marginTop: 12 }}>ไม่พบข้อมูลเคส</p>
      <button className="btn btn-outline" onClick={() => navigate('/legal')} style={{ marginTop: 16 }}>
        <i className="fas fa-arrow-left"></i> กลับ
      </button>
    </div>
  )

  const parseImages = (jsonStr) => { try { return JSON.parse(jsonStr) || [] } catch { return [] } }
  const images = parseImages(caseData.images)
  const deedImages = parseImages(caseData.deed_images)
  const appraisalImages = parseImages(caseData.appraisal_images)
  const salesPropertyPhotos = [
    ...images.filter(img => img.includes('properties')),
    ...parseImages(caseData.property_photos),
  ]

  const ImageGrid = ({ imgList, label }) => {
    if (!imgList || imgList.length === 0) return <span style={{ fontSize: 12, color: '#999' }}>ไม่มีรูป</span>
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {imgList.map((img, i) => {
          const src = img.startsWith('/') ? img : `/${img}`
          const isFilePdf = img.toLowerCase().includes('.pdf')
          return (
            <a key={i} href={src} target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', textDecoration: 'none' }}>
              {isFilePdf ? (
                <div style={{ width: 60, height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #f5c6c6', background: '#fff5f5', gap: 2 }}>
                  <i className="fas fa-file-pdf" style={{ fontSize: 20, color: '#e53935' }}></i>
                  <span style={{ fontSize: 8, color: '#e53935', fontWeight: 600 }}>PDF</span>
                </div>
              ) : (
                <img src={src} alt={`${label}-${i}`}
                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                  onError={e => { e.target.style.display = 'none' }} />
              )}
            </a>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => navigate('/legal')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              <i className="fas fa-gavel" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              แก้ไขเคส (ฝ่ายนิติกรรม) — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
              {caseData.contact_name && <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginLeft: 4 }}>({caseData.contact_name})</span>}
            </h2>
            {(caseData.legal_approval_type || caseData.loan_type_detail) && (
              <span style={{
                fontSize: 13, fontWeight: 700, padding: '4px 14px', borderRadius: 20,
                background: (caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? '#e3f2fd' : '#f3e5f5',
                color: (caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? '#1565c0' : '#6a1b9a',
                border: `1.5px solid ${(caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? '#1565c0' : '#6a1b9a'}40`,
              }}>
                <i className="fas fa-tag" style={{ marginRight: 5 }}></i>
                {(caseData.legal_approval_type || caseData.loan_type_detail) === 'mortgage' ? 'จำนอง' : 'ขายฝาก'}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--gray)' }}>สร้างเมื่อ: {formatDate(caseData.created_at)}</span>
        </div>
      </div>

      {msg && <div className="error-msg" style={{ marginBottom: 16 }}>{msg}</div>}
      {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="edit-page-grid">

          {/* ===== LEFT: read-only ===== */}
          <div>


            {/* ข้อมูลลูกหนี้ */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #2563eb' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1e40af' }}>
                <i className="fas fa-user" style={{ marginRight: 8 }}></i>
                {caseData.case_code}{caseData.contact_name ? ` — ${caseData.contact_name}` : ' — ข้อมูลลูกหนี้'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ชื่อ-สกุล (เจ้าของทรัพย์)</label>
                  <input type="text" value={caseData.contact_name || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>เบอร์โทร</label>
                  <input type="text" value={caseData.contact_phone || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                {caseData.national_id && (
                  <div className="form-group">
                    <label>เลขบัตรประชาชน (เจ้าของทรัพย์)</label>
                    <input type="text" value={caseData.national_id} readOnly style={{ background: '#f5f5f5', fontFamily: 'monospace', letterSpacing: '0.5px' }} />
                  </div>
                )}
                <div className="form-group">
                  <label>สถานะสมรส (เจ้าของทรัพย์)</label>
                  {(() => {
                    const MARITAL_DISPLAY = {
                      single:        { label: 'โสด',               color: '#1565c0', icon: 'fa-user' },
                      married:       { label: 'สมรสจดทะเบียน',     color: '#6a1b9a', icon: 'fa-heart' },
                      married_reg:   { label: 'สมรสจดทะเบียน',     color: '#6a1b9a', icon: 'fa-heart' },
                      married_unreg: { label: 'สมรสไม่จดทะเบียน',  color: '#e65100', icon: 'fa-user-friends' },
                      divorced:      { label: 'หย่า',               color: '#c62828', icon: 'fa-user-slash' },
                      widowed:       { label: 'หม้าย',              color: '#c62828', icon: 'fa-user-slash' },
                      inherited:     { label: 'รับมรดก',            color: '#2e7d32', icon: 'fa-scroll' },
                    }
                    const ms = caseData.marital_status
                    const meta = MARITAL_DISPLAY[ms]
                    if (!meta) return <span style={{ color: '#bbb', fontSize: 13 }}>ยังไม่ระบุ</span>
                    return (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 8,
                        fontWeight: 700, fontSize: 13, background: `${meta.color}12`,
                        border: `1.5px solid ${meta.color}40`, color: meta.color }}>
                        <i className={`fas ${meta.icon}`}></i> {meta.label}
                      </div>
                    )
                  })()}
                </div>
                {caseData.contact_line && (
                  <div className="form-group">
                    <label><i className="fab fa-line" style={{ color: '#06C755', marginRight: 5 }}></i>LINE ID</label>
                    <input type="text" value={caseData.contact_line} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                )}
                {caseData.contact_facebook && (
                  <div className="form-group">
                    <label><i className="fab fa-facebook" style={{ color: '#1877F2', marginRight: 5 }}></i>Facebook</label>
                    <input type="text" value={caseData.contact_facebook} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                )}
                {caseData.contact_email && (
                  <div className="form-group">
                    <label><i className="fas fa-envelope" style={{ color: '#e74c3c', marginRight: 5 }}></i>Email</label>
                    <input type="text" value={caseData.contact_email} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                )}
              </div>
              <AgentCard agentName={caseData.agent_name} agentPhone={caseData.agent_phone} agentCode={caseData.agent_code} />
              {/* ★ ข้อมูลนายหน้า (ครบชุดสำหรับสัญญา) */}
              {caseData.agent_name && (caseData.agent_national_id || caseData.agent_address || caseData.agent_date_of_birth) && (
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-user-tie"></i> ข้อมูลนายหน้า
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#d97706', marginLeft: 4 }}>(สำหรับออกสัญญา)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                    {caseData.agent_national_id && (
                      <div>
                        <span style={{ color: '#888' }}>เลขบัตรประชาชน:</span><br />
                        <strong style={{ fontFamily: 'monospace' }}>{caseData.agent_national_id}</strong>
                        {caseData.agent_national_id_expiry && (
                          <span style={{ color: '#888', marginLeft: 6 }}>
                            (หมดอายุ {new Date(caseData.agent_national_id_expiry).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })})
                          </span>
                        )}
                      </div>
                    )}
                    {caseData.agent_date_of_birth && (
                      <div>
                        <span style={{ color: '#888' }}>วันเกิด:</span><br />
                        <strong>{new Date(caseData.agent_date_of_birth).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                      </div>
                    )}
                    {caseData.agent_address && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ color: '#888' }}>ที่อยู่ตามทะเบียนบ้าน:</span><br />
                        <span style={{ color: '#333' }}>{caseData.agent_address}</span>
                      </div>
                    )}
                    {(caseData.agent_email || caseData.agent_commission_rate) && (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16 }}>
                        {caseData.agent_email && <span style={{ color: '#555' }}><i className="fas fa-envelope" style={{ color: '#b45309', marginRight: 4 }}></i>{caseData.agent_email}</span>}
                        {caseData.agent_commission_rate && <span style={{ color: '#555' }}><i className="fas fa-percent" style={{ color: '#b45309', marginRight: 4 }}></i>ค่าคอมมิชชั่น {caseData.agent_commission_rate}%</span>}
                      </div>
                    )}
                  </div>
                  {(caseData.agent_id_card_image || caseData.agent_house_registration_image) && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #fde68a', display: 'flex', gap: 16 }}>
                      {caseData.agent_id_card_image && (
                        <a href={caseData.agent_id_card_image.startsWith('/') ? caseData.agent_id_card_image : `/${caseData.agent_id_card_image}`}
                          target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#b45309', textDecoration: 'underline' }}>
                          <i className="fas fa-id-card" style={{ marginRight: 4 }}></i>บัตรประชาชนนายหน้า
                        </a>
                      )}
                      {caseData.agent_house_registration_image && (
                        <a href={caseData.agent_house_registration_image.startsWith('/') ? caseData.agent_house_registration_image : `/${caseData.agent_house_registration_image}`}
                          target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#b45309', textDecoration: 'underline' }}>
                          <i className="fas fa-home" style={{ marginRight: 4 }}></i>สำเนาทะเบียนบ้านนายหน้า
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ★ บัญชีธนาคารนายหน้า + สมุดบัญชี + สลิปค่านายหน้า */}
              {caseData.agent_name && <div style={{ marginTop: 16, padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>
                    <i className="fas fa-university" style={{ marginRight: 6 }}></i>บัญชีธนาคารนายหน้า
                  </label>
                  <span style={{ fontSize: 11, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 20, padding: '2px 10px', color: '#92400e', fontWeight: 600, fontFamily: 'monospace' }}>
                    {caseData.agent_code || caseData.agent_name}
                  </span>
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>กรอกเองหรืออัพโหลดสมุดบัญชีให้ OCR อัตโนมัติ</span>
                </div>

                {/* หน้าสมุดบัญชี + OCR */}
                <div style={{ marginBottom: 14, padding: '10px 12px', background: '#fff', border: '1.5px dashed #fcd34d', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-book"></i> หน้าสมุดบัญชี (Book Bank)
                    {passbookOcrLoading && <span style={{ color: '#1565c0', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
                    <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>อัพโหลดแล้ว OCR จะ auto-fill ข้อมูลธนาคาร</span>
                  </div>
                  {(localPreviews.agent_bank_book || caseData.agent_bank_book) && (
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {localPreviews.agent_bank_book ? (
                        /* preview ไฟล์ที่เพิ่งเลือก (ยังไม่ save) */
                        <>
                          <div style={{ position: 'relative' }}>
                            <img src={localPreviews.agent_bank_book} alt="preview"
                              style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #f59e0b', display: 'block' }} />
                            <span style={{ position: 'absolute', top: -6, right: -6, background: '#f59e0b', color: '#fff', fontSize: 9, borderRadius: 10, padding: '1px 5px', fontWeight: 700 }}>ใหม่</span>
                          </div>
                          <a href={localPreviews.agent_bank_book} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                            <i className="fas fa-external-link-alt"></i> เปิด
                          </a>
                          <button type="button" title="ยกเลิกการเลือกไฟล์"
                            onClick={() => {
                              setLocalPreviews(prev => ({ ...prev, agent_bank_book: null }))
                              if (agentBankBookRef.current) agentBankBookRef.current.value = ''
                              const lbl = document.getElementById('agentBookLabel')
                              if (lbl) lbl.textContent = caseData.agent_bank_book ? 'เปลี่ยนสมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี'
                            }}
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', color: '#374151', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <i className="fas fa-times"></i> ยกเลิก
                          </button>
                        </>
                      ) : (() => {
                        const bookUrl = caseData.agent_bank_book.startsWith('/') ? caseData.agent_bank_book : `/${caseData.agent_bank_book}`
                        const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(caseData.agent_bank_book)
                        return (
                          <>
                            <a href={bookUrl} target="_blank" rel="noreferrer">
                              {isImg ? (
                                <img src={bookUrl} alt="สมุดบัญชีนายหน้า"
                                  style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #fcd34d', display: 'block' }}
                                  onError={e => { e.target.style.display='none' }} />
                              ) : (
                                <div style={{ width: 90, height: 60, borderRadius: 6, border: '2px solid #fcd34d', background: '#fff7ed',
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                  <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#e53935' }}></i>
                                  <span style={{ fontSize: 9, color: '#92400e' }}>PDF</span>
                                </div>
                              )}
                            </a>
                            <a href={bookUrl} target="_blank" rel="noreferrer"
                              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                              <i className="fas fa-external-link-alt"></i> เปิด
                            </a>
                          </>
                        )
                      })()}
                      {!localPreviews.agent_bank_book && caseData.agent_bank_book && (
                        <button type="button" title="ลบสมุดบัญชี"
                          onClick={async () => {
                            if (!window.confirm('ยืนยันลบสมุดบัญชีนายหน้า?')) return
                            const r = await fetch(`${LEGAL_API}/delete-document`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                              body: JSON.stringify({ case_id: caseData.id, column: 'agent_bank_book' })
                            })
                            const d = await r.json()
                            if (d.success) setCaseData(prev => ({ ...prev, agent_bank_book: null }))
                            else alert('ลบไม่สำเร็จ: ' + (d.message || ''))
                          }}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-trash-alt"></i> ลบ
                        </button>
                      )}
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#78350f' }}>
                    <i className="fas fa-upload" style={{ color: '#f59e0b' }}></i>
                    <span id="agentBookLabel">{caseData.agent_bank_book ? 'เปลี่ยนสมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี'}</span>
                    <input ref={agentBankBookRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files[0]
                        const lbl = document.getElementById('agentBookLabel')
                        if (lbl) lbl.textContent = f ? `✓ ${f.name}` : (caseData.agent_bank_book ? 'เปลี่ยนสมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี')
                        setLocalPreview('agent_bank_book', f)
                        if (f) handlePassbookOcr(f)
                      }} />
                  </label>
                  {passbookOcrMsg && (
                    <div style={{ marginTop: 6, fontSize: 11, padding: '4px 8px', borderRadius: 6,
                      background: passbookOcrMsg.startsWith('✅') ? '#ecfdf5' : '#fffbeb',
                      color: passbookOcrMsg.startsWith('✅') ? '#065f46' : '#92400e', fontWeight: 600 }}>
                      {passbookOcrMsg}
                    </div>
                  )}
                </div>

                {/* ข้อมูลธนาคาร (กรอกเองหรือ auto จาก OCR) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>ธนาคาร</label>
                    <select value={legalForm.agent_bank_name || ''} onChange={e => setL('agent_bank_name', e.target.value)}
                      style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid #fcd34d', width: '100%', background: '#fff' }}>
                      <option value="">-- เลือกธนาคาร --</option>
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>เลขบัญชี</label>
                    <input type="text" value={legalForm.agent_bank_account_no} onChange={e => setL('agent_bank_account_no', e.target.value)}
                      placeholder="xxx-x-xxxxx-x" style={{ fontSize: 13, fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: '0 0 12px' }}>
                  <label style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>ชื่อบัญชี</label>
                  <input type="text" value={legalForm.agent_bank_account_name} onChange={e => setL('agent_bank_account_name', e.target.value)}
                    placeholder="ชื่อเจ้าของบัญชี" style={{ fontSize: 13 }} />
                </div>

                {/* สลิปค่านายหน้า */}
                <label style={{ fontSize: 12, color: '#92400e', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  <i className="fas fa-receipt" style={{ marginRight: 4 }}></i>สลิปค่านายหน้า
                </label>
                {/* preview + open + delete */}
                {(localPreviews.agent_payment_slip || caseData.agent_payment_slip) && (() => {
                  const previewSrc = localPreviews.agent_payment_slip
                  const savedSrc = caseData.agent_payment_slip
                    ? (caseData.agent_payment_slip.startsWith('/') ? caseData.agent_payment_slip : `/${caseData.agent_payment_slip}`)
                    : null
                  const displaySrc = previewSrc || savedSrc
                  const isPdf = !previewSrc && savedSrc && /\.pdf$/i.test(savedSrc)
                  return (
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* thumbnail */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {isPdf ? (
                          <div style={{ width: 90, height: 60, borderRadius: 6, border: '2px solid #fcd34d', background: '#fff7ed',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#e53935' }}></i>
                            <span style={{ fontSize: 9, color: '#92400e' }}>PDF</span>
                          </div>
                        ) : (
                          <img src={displaySrc} alt="สลิปนายหน้า"
                            style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 6, border: `2px solid ${previewSrc ? '#f59e0b' : '#fcd34d'}`, display: 'block' }}
                            onError={e => { e.target.style.display='none' }} />
                        )}
                        {previewSrc && <span style={{ position: 'absolute', top: -6, right: -6, background: '#f59e0b', color: '#fff', fontSize: 9, borderRadius: 10, padding: '1px 5px', fontWeight: 700 }}>ใหม่</span>}
                      </div>
                      {/* open button */}
                      <a href={displaySrc} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                        <i className="fas fa-external-link-alt"></i> เปิด
                      </a>
                      {/* ยกเลิก — เฉพาะไฟล์ที่เพิ่งเลือก (ยังไม่ save) */}
                      {previewSrc && (
                        <button type="button" title="ยกเลิกการเลือกไฟล์"
                          onClick={() => {
                            setLocalPreviews(prev => ({ ...prev, agent_payment_slip: null }))
                            if (agentPaymentSlipRef.current) agentPaymentSlipRef.current.value = ''
                            const lbl = document.getElementById('agentSlipLabel')
                            if (lbl) lbl.textContent = caseData.agent_payment_slip ? 'เปลี่ยนสลิปค่านายหน้า' : 'อัพโหลดสลิปค่านายหน้า'
                          }}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', color: '#374151', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-times"></i> ยกเลิก
                        </button>
                      )}
                      {/* ลบ — เฉพาะไฟล์ที่ save แล้ว */}
                      {!previewSrc && savedSrc && (
                        <button type="button"
                          onClick={async () => {
                            if (!window.confirm('ยืนยันลบสลิปค่านายหน้า?')) return
                            const r = await fetch(`${LEGAL_API}/delete-document`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                              body: JSON.stringify({ case_id: caseData.id, column: 'agent_payment_slip' })
                            })
                            const d = await r.json()
                            if (d.success) setCaseData(prev => ({ ...prev, agent_payment_slip: null }))
                            else alert('ลบไม่สำเร็จ: ' + (d.message || ''))
                          }}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-trash-alt"></i> ลบ
                        </button>
                      )}
                    </div>
                  )
                })()}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  background: '#fff', border: '1.5px dashed #fbbf24', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, color: '#92400e', fontWeight: 500
                }}>
                  <i className="fas fa-upload" style={{ color: '#f59e0b' }}></i>
                  <span id="agentSlipLabel">{caseData.agent_payment_slip ? 'เปลี่ยนสลิปค่านายหน้า' : 'อัพโหลดสลิปค่านายหน้า'}</span>
                  <input ref={agentPaymentSlipRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files[0]
                      const lbl = document.getElementById('agentSlipLabel')
                      if (lbl) lbl.textContent = f ? `✓ ${f.name}` : (caseData.agent_payment_slip ? 'เปลี่ยนสลิปค่านายหน้า' : 'อัพโหลดสลิปค่านายหน้า')
                      setLocalPreview('agent_payment_slip', f)
                    }} />
                </label>
              </div>}

              {/* ★ บัญชีธนาคารลูกหนี้ + สมุดบัญชี */}
              <div style={{ marginTop: 16, padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', display: 'block', marginBottom: 12 }}>
                  <i className="fas fa-university" style={{ marginRight: 6 }}></i>บัญชีธนาคารลูกหนี้
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>กรอกเองหรืออัพโหลดสมุดบัญชีให้ OCR อัตโนมัติ</span>
                </label>

                {/* หน้าสมุดบัญชีลูกหนี้ + OCR */}
                <div style={{ marginBottom: 14, padding: '10px 12px', background: '#fff', border: '1.5px dashed #93c5fd', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-book"></i> หน้าสมุดบัญชี (Book Bank)
                    {debtorPassbookOcrLoading && <span style={{ color: '#1565c0', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
                    <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>อัพโหลดแล้ว OCR จะ auto-fill ข้อมูลธนาคาร</span>
                  </div>
                  {(localPreviews.debtor_bank_book || caseData.debtor_bank_book) && (
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {localPreviews.debtor_bank_book ? (
                        <>
                          <div style={{ position: 'relative' }}>
                            <img src={localPreviews.debtor_bank_book} alt="preview"
                              style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #3b82f6', display: 'block' }} />
                            <span style={{ position: 'absolute', top: -6, right: -6, background: '#3b82f6', color: '#fff', fontSize: 9, borderRadius: 10, padding: '1px 5px', fontWeight: 700 }}>ใหม่</span>
                          </div>
                          <a href={localPreviews.debtor_bank_book} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                            <i className="fas fa-external-link-alt"></i> เปิด
                          </a>
                          <button type="button" title="ยกเลิกการเลือกไฟล์"
                            onClick={() => {
                              setLocalPreviews(prev => ({ ...prev, debtor_bank_book: null }))
                              if (debtorBankBookRef.current) debtorBankBookRef.current.value = ''
                              const lbl = document.getElementById('debtorBookLabel')
                              if (lbl) lbl.textContent = caseData.debtor_bank_book ? 'เปลี่ยนสมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี'
                            }}
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', color: '#374151', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <i className="fas fa-times"></i> ยกเลิก
                          </button>
                        </>
                      ) : (() => {
                        const bookUrl = caseData.debtor_bank_book.startsWith('/') ? caseData.debtor_bank_book : `/${caseData.debtor_bank_book}`
                        const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(caseData.debtor_bank_book)
                        return (
                          <>
                            <a href={bookUrl} target="_blank" rel="noreferrer">
                              {isImg ? (
                                <img src={bookUrl} alt="สมุดบัญชีลูกหนี้"
                                  style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #93c5fd', display: 'block' }}
                                  onError={e => { e.target.style.display='none' }} />
                              ) : (
                                <div style={{ width: 90, height: 60, borderRadius: 6, border: '2px solid #93c5fd', background: '#eff6ff',
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                  <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#e53935' }}></i>
                                  <span style={{ fontSize: 9, color: '#1e40af' }}>PDF</span>
                                </div>
                              )}
                            </a>
                            <a href={bookUrl} target="_blank" rel="noreferrer"
                              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                              <i className="fas fa-external-link-alt"></i> เปิด
                            </a>
                          </>
                        )
                      })()}
                      {!localPreviews.debtor_bank_book && caseData.debtor_bank_book && (
                        <button type="button" title="ลบสมุดบัญชี"
                          onClick={async () => {
                            if (!window.confirm('ยืนยันลบสมุดบัญชีลูกหนี้?')) return
                            const r = await fetch(`${LEGAL_API}/delete-document`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                              body: JSON.stringify({ case_id: caseData.id, column: 'debtor_bank_book' })
                            })
                            const d = await r.json()
                            if (d.success) setCaseData(prev => ({ ...prev, debtor_bank_book: null }))
                            else alert('ลบไม่สำเร็จ: ' + (d.message || ''))
                          }}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-trash-alt"></i> ลบ
                        </button>
                      )}
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#1e3a8a' }}>
                    <i className="fas fa-upload" style={{ color: '#3b82f6' }}></i>
                    <span id="debtorBookLabel">{caseData.debtor_bank_book ? 'เปลี่ยนสมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี'}</span>
                    <input ref={debtorBankBookRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files[0]
                        const lbl = document.getElementById('debtorBookLabel')
                        if (lbl) lbl.textContent = f ? `✓ ${f.name}` : (caseData.debtor_bank_book ? 'เปลี่ยนสมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี')
                        setLocalPreview('debtor_bank_book', f)
                        if (f) handleDebtorPassbookOcr(f)
                      }} />
                  </label>
                  {debtorPassbookOcrMsg && (
                    <div style={{ marginTop: 6, fontSize: 11, padding: '4px 8px', borderRadius: 6,
                      background: debtorPassbookOcrMsg.startsWith('✅') ? '#ecfdf5' : '#fffbeb',
                      color: debtorPassbookOcrMsg.startsWith('✅') ? '#065f46' : '#92400e', fontWeight: 600 }}>
                      {debtorPassbookOcrMsg}
                    </div>
                  )}
                </div>

                {/* ข้อมูลธนาคารลูกหนี้ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>ธนาคาร</label>
                    <select value={legalForm.debtor_bank_name || ''} onChange={e => setL('debtor_bank_name', e.target.value)}
                      style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid #93c5fd', width: '100%', background: '#fff' }}>
                      <option value="">-- เลือกธนาคาร --</option>
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>เลขบัญชี</label>
                    <input type="text" value={legalForm.debtor_bank_account_no} onChange={e => setL('debtor_bank_account_no', e.target.value)}
                      placeholder="xxx-x-xxxxx-x" style={{ fontSize: 13, fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>ชื่อบัญชี</label>
                  <input type="text" value={legalForm.debtor_bank_account_name} onChange={e => setL('debtor_bank_account_name', e.target.value)}
                    placeholder="ชื่อเจ้าของบัญชี" style={{ fontSize: 13 }} />
                </div>
              </div>

              {images.filter(img => img.includes('id-cards')).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปหน้าบัตรประชาชน</label>
                  <ImageGrid imgList={images.filter(img => img.includes('id-cards'))} label="id" />
                </div>
              )}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>ลักษณะทรัพย์</label>
                <input type="text" value={propertyTypeLabel[caseData.property_type] || caseData.property_type || '-'} readOnly style={{ background: '#f5f5f5' }} />
              </div>

            </div>

            {/* ข้อมูลทรัพย์ */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #16a34a' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#15803d' }}>
                <i className="fas fa-map-marked-alt" style={{ marginRight: 8 }}></i>ข้อมูลทรัพย์
              </h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>ทรัพย์ติดภาระหรือไม่</label>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                  background: caseData.has_obligation === 'yes' ? '#fee2e2' : '#dcfce7',
                  color: caseData.has_obligation === 'yes' ? '#b91c1c' : '#15803d',
                  border: `2px solid ${caseData.has_obligation === 'yes' ? '#fca5a5' : '#86efac'}`,
                }}>
                  <i className={`fas ${caseData.has_obligation === 'yes' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
                  {caseData.has_obligation === 'yes'
                    ? `ติดภาระ${caseData.obligation_count ? ` (${caseData.obligation_count} รายการ)` : ''}`
                    : 'ไม่ติดภาระ'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group"><label>จังหวัด</label><input type="text" value={caseData.province || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>อำเภอ</label><input type="text" value={caseData.district || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ตำบล</label><input type="text" value={caseData.subdistrict || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group"><label>บ้านเลขที่</label><input type="text" value={caseData.house_no || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ชื่อหมู่บ้าน / โครงการ</label><input type="text" value={caseData.village_name || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#e53935', fontSize: 13 }}></i>
                  โลเคชั่น
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>(กรอกโดยฝ่ายขาย)</span>
                  <button type="button"
                    onClick={() => window.open('https://landsmaps.dol.go.th/#', '_blank')}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#0369a1,#0284c7)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-map"></i> ค้นหา landsmaps
                  </button>
                </label>
                <input type="url" value={caseData.location_url || ''} readOnly
                  style={{ background: '#f9fafb', color: caseData.location_url ? '#111827' : '#9ca3af', cursor: 'default' }}
                  placeholder="ฝ่ายขายยังไม่ได้กรอกโลเคชั่น" />
                <MapPreview url={caseData.location_url} label="โลเคชั่นทรัพย์" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group"><label>เลขโฉนด</label><input type="text" value={caseData.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ประเภทโฉนด</label><input type="text" value={{ chanote: 'โฉนดที่ดิน (น.ส.4)', ns4k: 'น.ส.4ก.', ns3: 'นส.3', ns3k: 'นส.3ก.', spk: 'ที่ดิน ส.ป.ก.' }[caseData.deed_type] || caseData.deed_type || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>พื้นที่</label><input type="text" value={caseData.land_area ? `${caseData.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              {/* ===== เปรียบเทียบรูปทรัพย์ ===== */}
              <div style={{ marginTop: 16, padding: 16, background: '#f8faff', borderRadius: 10, border: '1.5px solid #c7d2fe' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#3730a3', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-images"></i> เปรียบเทียบรูปทรัพย์
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280' }}>— ทุกแผนกมองเห็น</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, border: '1px solid #86efac' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>
                      <i className="fas fa-user-tie" style={{ marginRight: 5 }}></i>รูปจากฝ่ายขาย ({salesPropertyPhotos.length} รูป)
                    </div>
                    {salesPropertyPhotos.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
                        {salesPropertyPhotos.map((src, i) => { const f = src.startsWith('/') ? src : `/${src}`; const isPdf = src.toLowerCase().includes('.pdf'); return (
                          <div key={i} style={{ border: '1.5px solid #86efac', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }} onClick={() => window.open(f, '_blank')}>
                            {isPdf ? <div style={{ width: '100%', height: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', gap: 4 }}><i className="fas fa-file-pdf" style={{ fontSize: 24, color: '#e53935' }}></i><span style={{ fontSize: 9, color: '#e53935', fontWeight: 600 }}>PDF</span></div>
                              : <img src={f} alt={`s-${i}`} style={{ width: '100%', height: 90, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />}
                          </div>
                        )})}
                      </div>
                    ) : <span style={{ fontSize: 12, color: '#999' }}>ยังไม่มีรูปจากฝ่ายขาย</span>}
                  </div>
                  <div style={{ background: '#f3e5f5', borderRadius: 8, padding: 12, border: '1px solid #ce93d8' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#7b1fa2', marginBottom: 8 }}>
                      <i className="fas fa-search-location" style={{ marginRight: 5 }}></i>รูปจากฝ่ายประเมิน – เข้าพื้นที่ ({appraisalImages.length} รูป)
                    </div>
                    {appraisalImages.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
                        {appraisalImages.map((src, i) => { const f = src.startsWith('/') ? src : `/${src}`; const isPdf = src.toLowerCase().includes('.pdf'); return (
                          <div key={i} style={{ border: '1.5px solid #ce93d8', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }} onClick={() => window.open(f, '_blank')}>
                            {isPdf ? <div style={{ width: '100%', height: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', gap: 4 }}><i className="fas fa-file-pdf" style={{ fontSize: 24, color: '#e53935' }}></i><span style={{ fontSize: 9, color: '#e53935', fontWeight: 600 }}>PDF</span></div>
                              : <img src={f} alt={`a-${i}`} style={{ width: '100%', height: 90, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />}
                          </div>
                        )})}
                      </div>
                    ) : <span style={{ fontSize: 12, color: '#999' }}>ยังไม่มีรูปจากฝ่ายประเมิน</span>}
                  </div>
                </div>
              </div>

              {caseData.appraisal_book_image && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#e65100' }}>
                    <i className="fas fa-book" style={{ marginRight: 4 }}></i>
                    เล่มประเมิน
                  </label>
                  <div style={{ marginTop: 6 }}>
                    <a href={caseData.appraisal_book_image.startsWith('/') ? caseData.appraisal_book_image : `/${caseData.appraisal_book_image}`}
                      target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#e65100', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      <i className="fas fa-file-alt"></i> เปิดดูเล่มประเมิน
                    </a>
                  </div>
                </div>
              )}

              {(videoFiles.length > 0 || images.filter(img => img.includes('videos')).length > 0) && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', display: 'block', marginBottom: 8 }}>
                    <i className="fas fa-video" style={{ marginRight: 6 }}></i>VDO ทรัพย์สิน
                    <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic', marginLeft: 8 }}>(อัพโหลดโดยฝ่ายประเมิน)</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {videoFiles.map((fp, i) => (
                      <a key={`new-${i}`} href={fp.startsWith('/') ? fp : `/${fp}`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                          background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 8,
                          fontSize: 12, color: '#6d28d9', textDecoration: 'none', fontWeight: 600 }}>
                        <i className="fas fa-video"></i> วิดีโอ {i + 1}
                      </a>
                    ))}
                    {images.filter(img => img.includes('videos')).map((vid, i) => (
                      <a key={`old-${i}`} href={vid.startsWith('/') ? vid : `/${vid}`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                          background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 8,
                          fontSize: 12, color: '#6d28d9', textDecoration: 'none', fontWeight: 600 }}>
                        <i className="fas fa-video"></i> วิดีโอเก่า {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {caseData.preliminary_terms && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>
                    <i className="fas fa-file-alt" style={{ color: '#e67e22', marginRight: 5 }}></i>
                    เงื่อนไขเบื้องต้น (เอกสาร 13) <span style={{ fontSize: 11, fontWeight: 400, color: '#999' }}>จากฝ่ายขาย</span>
                  </label>
                  <textarea readOnly value={caseData.preliminary_terms} rows={3}
                    style={{ background: '#fffbf0', width: '100%', padding: '8px 12px', borderRadius: 8, marginTop: 6,
                      border: '1px solid #f0c040', fontSize: 13, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>

            {/* ★ Checklist เอกสารทรัพย์ */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #16a34a' }}>
              <ChecklistDocsPanel caseData={caseData} lrId={caseData.loan_request_id} token={token()} onDocsUpdated={(field, paths) => setCaseData(prev => ({ ...prev, [field]: JSON.stringify(paths) }))} canUpload={true} />
            </div>

            {/* ★ สรุปอนุมัติ + ผลประเมิน (compact) */}
            <div className="card" style={{ padding: 16, marginBottom: 20, borderTop: '3px solid #27ae60' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                {/* ประเภทสินเชื่อ */}
                {(() => {
                  const lType = caseData.legal_approval_type || caseData.loan_type_detail
                  const lMap = {
                    selling_pledge: { color: '#6a1b9a', bg: '#f3e5f5', border: '#d8b4fe', icon: 'fa-handshake', label: 'ขายฝาก' },
                    mortgage:       { color: '#1565c0', bg: '#e3f2fd', border: '#93c5fd', icon: 'fa-home',       label: 'จำนอง'  },
                  }
                  const lt = lMap[lType]
                  return lt ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: lt.bg, border: `2px solid ${lt.border}`, fontWeight: 700, fontSize: 13, color: lt.color }}>
                      <i className={`fas ${lt.icon}`} style={{ fontSize: 12 }}></i>{lt.label}
                    </div>
                  ) : null
                })()}
                {/* วงเงินอนุมัติ */}
                {caseData.approved_credit && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: '#dcfce7', border: '2px solid #86efac', fontWeight: 800, fontSize: 14, color: '#15803d' }}>
                    <i className="fas fa-check-circle" style={{ fontSize: 12 }}></i>
                    อนุมัติ ฿{Number(caseData.approved_credit).toLocaleString()}
                    {caseData.approval_date && <span style={{ fontSize: 11, fontWeight: 500, color: '#4ade80', marginLeft: 4 }}>({formatDate(caseData.approval_date)})</span>}
                  </div>
                )}
                {/* ผลประเมิน */}
                {(() => {
                  const r = caseData.inside_result || caseData.outside_result
                  if (!r) return null
                  const passed = r === 'passed'
                  return (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, fontWeight: 700, fontSize: 12,
                      background: passed ? '#f0fdf4' : '#fff1f2', border: `2px solid ${passed ? '#86efac' : '#fca5a5'}`, color: passed ? '#16a34a' : '#dc2626' }}>
                      <i className={`fas ${passed ? 'fa-home' : 'fa-times-circle'}`} style={{ fontSize: 11 }}></i>
                      ประเมิน{passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                      {(caseData.check_price_value) && <span style={{ marginLeft: 4, fontSize: 11 }}>• เช็คราคา ฿{Number(caseData.check_price_value).toLocaleString()}</span>}
                    </div>
                  )
                })()}
              </div>
            </div>

          </div>

          {/* ===== RIGHT: editable ===== */}
          <div>

            {/* ---- นิติกรรม ---- */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                    <i className="fas fa-gavel" style={{ marginRight: 8 }}></i>นิติกรรม (นัดที่ดิน)
                  </h3>

                  <div className="form-group">
                    <label>เจ้าหน้าที่</label>
                    <input type="text" value={legalForm.officer_name} onChange={e => setL('officer_name', e.target.value)} placeholder="ชื่อเจ้าหน้าที่" />
                  </div>
                  <div className="form-group">
                    <label>วันที่ไป</label>
                    <input type="date" value={legalForm.visit_date} onChange={e => setL('visit_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>สำนักงานที่ดิน</label>
                    <LandOfficeInput id="legal" value={legalForm.land_office} onChange={e => setL('land_office', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>ช่วงเวลา</label>
                    <input type="text" value={legalForm.time_slot} onChange={e => setL('time_slot', e.target.value)} placeholder="เช่น 09:00 - 12:00" />
                  </div>
                  <div className="form-group">
                    <label>สถานะนิติกรรม</label>
                    <select value={legalForm.legal_status} onChange={e => setL('legal_status', e.target.value)}>
                      {legalStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {/* ★ ข้อมูลสัญญา — กรอกหลังทำนิติกรรมเสร็จ */}
                  <div style={{
                    background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
                    border: '1.5px solid #7dd3fc', borderRadius: 10,
                    padding: '14px 16px', marginBottom: 12
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-file-signature"></i> ข้อมูลสัญญา
                      <span style={{ fontSize: 10, fontWeight: 400, color: '#38bdf8', marginLeft: 4 }}>(กรอกหลังทำนิติกรรม)</span>
                    </div>

                    {/* ระยะเวลาสัญญา + ดอกเบี้ย — กรอกได้ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11 }}>
                          <i className="fas fa-clock" style={{ color: '#0369a1', marginRight: 4 }}></i>
                          ระยะเวลาสัญญา (ปี)
                        </label>
                        <select value={legalForm.contract_years}
                          onChange={e => {
                            const yr = e.target.value
                            setL('contract_years', yr)
                            // recalculate contract_end_date ถ้ามีวันเริ่ม
                            if (legalForm.contract_start_date && yr) {
                              const d = new Date(legalForm.contract_start_date)
                              d.setFullYear(d.getFullYear() + Number(yr))
                              setL('contract_end_date', d.toISOString().split('T')[0])
                            }
                          }}
                          style={{ fontSize: 13 }}>
                          <option value="">-- เลือก --</option>
                          <option value="1">1 ปี</option>
                          <option value="2">2 ปี</option>
                          <option value="3">3 ปี</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11 }}>
                          <i className="fas fa-percentage" style={{ color: '#0369a1', marginRight: 4 }}></i>
                          ดอกเบี้ย (% / ปี)
                        </label>
                        <input type="number" min="0" max="100" step="0.1"
                          value={legalForm.interest_rate}
                          onChange={e => setL('interest_rate', e.target.value)}
                          placeholder="เช่น 15"
                          style={{ fontSize: 13 }}
                        />
                      </div>
                    </div>

                    {/* วันทำสัญญา */}
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 12 }}>
                        <i className="fas fa-calendar-check" style={{ color: '#0369a1', marginRight: 5 }}></i>
                        วันทำสัญญา (วันโอนที่กรมที่ดิน)
                      </label>
                      <input type="date" value={legalForm.contract_start_date}
                        onChange={e => {
                          const start = e.target.value
                          setL('contract_start_date', start)
                          // คำนวณวันหมดอายุอัตโนมัติจาก contract_years (ใช้ค่าที่แก้ไขแล้ว)
                          const yr = legalForm.contract_years || caseData.contract_years
                          if (start && yr) {
                            const d = new Date(start)
                            d.setFullYear(d.getFullYear() + Number(yr))
                            setL('contract_end_date', d.toISOString().split('T')[0])
                          }
                        }}
                        style={{ fontSize: 13 }}
                      />
                    </div>

                    {/* วันหมดอายุสัญญา */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>
                        <i className="fas fa-calendar-times" style={{ color: '#dc2626', marginRight: 5 }}></i>
                        วันหมดอายุสัญญา
                        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>
                          (คำนวณอัตโนมัติ หรือแก้ไขได้)
                        </span>
                      </label>
                      <input type="date" value={legalForm.contract_end_date}
                        onChange={e => setL('contract_end_date', e.target.value)}
                        style={{ fontSize: 13 }}
                      />
                      {/* แสดง countdown ถ้ามีวันหมดอายุ */}
                      {legalForm.contract_end_date && (() => {
                        const days = Math.ceil((new Date(legalForm.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24))
                        const color = days < 0 ? '#dc2626' : days <= 30 ? '#ea580c' : days <= 90 ? '#ca8a04' : '#16a34a'
                        const bg = days < 0 ? '#fef2f2' : days <= 30 ? '#fff7ed' : days <= 90 ? '#fefce8' : '#f0fdf4'
                        const border = days < 0 ? '#fca5a5' : days <= 30 ? '#fed7aa' : days <= 90 ? '#fde047' : '#86efac'
                        return (
                          <div style={{
                            marginTop: 6, padding: '5px 10px', borderRadius: 7,
                            background: bg, border: `1px solid ${border}`,
                            fontSize: 12, fontWeight: 700, color
                          }}>
                            <i className="fas fa-clock" style={{ marginRight: 5 }}></i>
                            {days < 0
                              ? `หมดอายุแล้ว ${Math.abs(days)} วัน`
                              : days === 0 ? 'หมดอายุวันนี้!'
                              : `อีก ${days} วัน`}
                          </div>
                        )
                      })()}
                    </div>

                    {/* ยอดสินไถ่ — เฉพาะสัญญาขายฝาก */}
                    {(caseData.loan_type_detail === 'selling_pledge' || !caseData.loan_type_detail) && (
                      <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                        <label style={{ fontSize: 12 }}>
                          <i className="fas fa-hand-holding-usd" style={{ color: '#b45309', marginRight: 5 }}></i>
                          ยอดสินไถ่
                          <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>(ขายฝาก = วงเงิน + ดอกเบี้ยตลอดสัญญา)</span>
                          {/* ปุ่ม auto-calculate */}
                          {(caseData.approved_amount || legalForm.contract_years) && (legalForm.interest_rate || caseData.interest_rate) && (
                            <button type="button"
                              onClick={() => {
                                const principal = Number(caseData.approved_amount || 0)
                                const rate = Number(legalForm.interest_rate || caseData.interest_rate || 0)
                                const years = Number(legalForm.contract_years || caseData.contract_years || 0)
                                if (principal && rate && years) {
                                  const redemption = principal * (1 + (rate / 100) * years)
                                  setL('contract_redemption_amount', Math.round(redemption).toString())
                                }
                              }}
                              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: 'none',
                                background: '#92400e', color: '#fff', fontWeight: 700, cursor: 'pointer',
                                marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <i className="fas fa-calculator"></i> คำนวณ
                            </button>
                          )}
                        </label>
                        <input type="number" min="0" step="1"
                          value={legalForm.contract_redemption_amount}
                          onChange={e => setL('contract_redemption_amount', e.target.value)}
                          placeholder="บาท"
                          style={{ fontSize: 13 }}
                        />
                        {legalForm.contract_redemption_amount && (
                          <div style={{ fontSize: 12, color: '#92400e', fontWeight: 700, marginTop: 4 }}>
                            <i className="fas fa-coins" style={{ marginRight: 4 }}></i>
                            {Number(legalForm.contract_redemption_amount).toLocaleString('th-TH')} บาท
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ★ ข้อมูลนายทุน (จาก investors profile) */}
                  {caseData.investor_name && (
                    <div style={{ background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fas fa-user-tie"></i> ข้อมูลนายทุน
                        <span style={{ fontSize: 10, fontWeight: 400, color: '#a78bfa', marginLeft: 4 }}>(สำหรับออกสัญญา)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                        <div>
                          <span style={{ color: '#888' }}>ชื่อ-สกุล:</span><br />
                          <strong>{caseData.investor_full_name || caseData.investor_name || '-'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#888' }}>รหัส / โทร:</span><br />
                          <strong>{caseData.investor_code || '-'}</strong> &nbsp;
                          <span style={{ color: '#555' }}>{caseData.investor_phone_profile || caseData.investor_phone || ''}</span>
                        </div>
                        <div>
                          <span style={{ color: '#888' }}>เลขบัตรประชาชน:</span><br />
                          <strong style={{ fontFamily: 'monospace' }}>{caseData.investor_national_id || '-'}</strong>
                          {caseData.investor_national_id_expiry && (
                            <span style={{ color: '#888', marginLeft: 6 }}>
                              (หมดอายุ {new Date(caseData.investor_national_id_expiry).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })})
                            </span>
                          )}
                        </div>
                        <div>
                          <span style={{ color: '#888' }}>วันเกิด / สัญชาติ:</span><br />
                          <strong>{caseData.investor_date_of_birth ? new Date(caseData.investor_date_of_birth).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</strong>
                          {caseData.investor_nationality && <span style={{ color: '#777', marginLeft: 6 }}>({caseData.investor_nationality})</span>}
                        </div>
                        {caseData.investor_address && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: '#888' }}>ที่อยู่ตามทะเบียนบ้าน:</span><br />
                            <span style={{ color: '#333' }}>{caseData.investor_address}</span>
                          </div>
                        )}
                        {caseData.investor_profile_marital_status === 'สมรส' && caseData.investor_spouse_name && (
                          <div style={{ gridColumn: '1 / -1', background: '#ede9fe', borderRadius: 6, padding: '6px 10px' }}>
                            <span style={{ color: '#7c3aed', fontSize: 11, fontWeight: 600 }}>
                              <i className="fas fa-heart" style={{ marginRight: 4 }}></i>คู่สมรส:
                            </span>{' '}
                            <strong>{caseData.investor_spouse_name}</strong>
                            {caseData.investor_spouse_national_id && (
                              <span style={{ color: '#666', marginLeft: 8, fontFamily: 'monospace' }}>
                                บัตร: {caseData.investor_spouse_national_id}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {caseData.investor_id_card_image && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e9d5ff' }}>
                          <a href={caseData.investor_id_card_image.startsWith('/') ? caseData.investor_id_card_image : `/${caseData.investor_id_card_image}`}
                            target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, color: '#7c3aed', textDecoration: 'underline' }}>
                            <i className="fas fa-id-card" style={{ marginRight: 4 }}></i>ดูสำเนาบัตรประชาชนนายทุน
                          </a>
                        </div>
                      )}
                    </div>
                  )}

              {/* ★ บัญชีธนาคารนายทุน + สมุดบัญชี */}
              {caseData.investor_name && <div style={{ marginTop: 12, padding: '16px', background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', margin: 0 }}>
                    <i className="fas fa-university" style={{ marginRight: 6 }}></i>บัญชีธนาคารนายทุน
                  </label>
                  <span style={{ fontSize: 11, background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 20, padding: '2px 10px', color: '#5b21b6', fontWeight: 600, fontFamily: 'monospace' }}>
                    {caseData.investor_code || caseData.investor_name}
                  </span>
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>กรอกเองหรืออัพโหลดสมุดบัญชีให้ OCR อัตโนมัติ</span>
                </div>

                {/* หน้าสมุดบัญชีนายทุน + OCR */}
                <div style={{ marginBottom: 14, padding: '10px 12px', background: '#fff', border: '1.5px dashed #d8b4fe', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-book"></i> หน้าสมุดบัญชี (Book Bank)
                    {investorPassbookOcrLoading && <span style={{ color: '#1565c0', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
                    <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>อัพโหลดแล้ว OCR จะ auto-fill ข้อมูลธนาคาร</span>
                  </div>
                  {(localPreviews.investor_bank_book || caseData.investor_bank_book) && (
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {localPreviews.investor_bank_book ? (
                        <>
                          <div style={{ position: 'relative' }}>
                            <img src={localPreviews.investor_bank_book} alt="preview"
                              style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #a855f7', display: 'block' }} />
                            <span style={{ position: 'absolute', top: -6, right: -6, background: '#a855f7', color: '#fff', fontSize: 9, borderRadius: 10, padding: '1px 5px', fontWeight: 700 }}>ใหม่</span>
                          </div>
                          <a href={localPreviews.investor_bank_book} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#6d28d9', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                            <i className="fas fa-external-link-alt"></i> เปิด
                          </a>
                          <button type="button" title="ยกเลิกการเลือกไฟล์"
                            onClick={() => {
                              setLocalPreviews(prev => ({ ...prev, investor_bank_book: null }))
                              if (investorBankBookRef.current) investorBankBookRef.current.value = ''
                              const lbl = document.getElementById('investorBookLabel')
                              if (lbl) lbl.textContent = caseData.investor_bank_book ? 'เปลี่ยนสมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี'
                            }}
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6', color: '#374151', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <i className="fas fa-times"></i> ยกเลิก
                          </button>
                        </>
                      ) : (() => {
                        const bookUrl = caseData.investor_bank_book.startsWith('/') ? caseData.investor_bank_book : `/${caseData.investor_bank_book}`
                        const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(caseData.investor_bank_book)
                        return (
                          <>
                            <a href={bookUrl} target="_blank" rel="noreferrer">
                              {isImg ? (
                                <img src={bookUrl} alt="สมุดบัญชีนายทุน"
                                  style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #c4b5fd', display: 'block' }}
                                  onError={e => { e.target.style.display='none' }} />
                              ) : (
                                <div style={{ width: 90, height: 60, borderRadius: 6, border: '2px solid #c4b5fd', background: '#f5f3ff',
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                  <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#e53935' }}></i>
                                  <span style={{ fontSize: 9, color: '#6d28d9' }}>PDF</span>
                                </div>
                              )}
                            </a>
                            <a href={bookUrl} target="_blank" rel="noreferrer"
                              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#6d28d9', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                              <i className="fas fa-external-link-alt"></i> เปิด
                            </a>
                          </>
                        )
                      })()}
                      {!localPreviews.investor_bank_book && caseData.investor_bank_book && (
                        <button type="button" title="ลบสมุดบัญชี"
                          onClick={async () => {
                            if (!window.confirm('ยืนยันลบสมุดบัญชีนายทุน?')) return
                            const r = await fetch(`${LEGAL_API}/delete-document`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                              body: JSON.stringify({ case_id: caseData.id, column: 'investor_bank_book' })
                            })
                            const d = await r.json()
                            if (d.success) setCaseData(prev => ({ ...prev, investor_bank_book: null }))
                            else alert('ลบไม่สำเร็จ: ' + (d.message || ''))
                          }}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-trash-alt"></i> ลบ
                        </button>
                      )}
                    </div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#4c1d95' }}>
                    <i className="fas fa-upload" style={{ color: '#a855f7' }}></i>
                    <span id="investorBookLabel">{caseData.investor_bank_book ? 'เปลี่ยนสมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี'}</span>
                    <input ref={investorBankBookRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files[0]
                        const lbl = document.getElementById('investorBookLabel')
                        if (lbl) lbl.textContent = f ? `✓ ${f.name}` : (caseData.investor_bank_book ? 'เปลี่ยนสมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี')
                        setLocalPreview('investor_bank_book', f)
                        if (f) handleInvestorPassbookOcr(f)
                      }} />
                  </label>
                  {investorPassbookOcrMsg && (
                    <div style={{ marginTop: 6, fontSize: 11, padding: '4px 8px', borderRadius: 6,
                      background: investorPassbookOcrMsg.startsWith('✅') ? '#ecfdf5' : '#fffbeb',
                      color: investorPassbookOcrMsg.startsWith('✅') ? '#065f46' : '#92400e', fontWeight: 600 }}>
                      {investorPassbookOcrMsg}
                    </div>
                  )}
                </div>

                {/* ข้อมูลธนาคารนายทุน */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 12, color: '#6d28d9', fontWeight: 600 }}>ธนาคาร</label>
                    <select value={legalForm.investor_bank_name || ''} onChange={e => setL('investor_bank_name', e.target.value)}
                      style={{ fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid #c4b5fd', width: '100%', background: '#fff' }}>
                      <option value="">-- เลือกธนาคาร --</option>
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: 12, color: '#6d28d9', fontWeight: 600 }}>เลขบัญชี</label>
                    <input type="text" value={legalForm.investor_bank_account_no} onChange={e => setL('investor_bank_account_no', e.target.value)}
                      placeholder="xxx-x-xxxxx-x" style={{ fontSize: 13, fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, color: '#6d28d9', fontWeight: 600 }}>ชื่อบัญชี</label>
                  <input type="text" value={legalForm.investor_bank_account_name} onChange={e => setL('investor_bank_account_name', e.target.value)}
                    placeholder="ชื่อเจ้าของบัญชี" style={{ fontSize: 13 }} />
                </div>
              </div>}
            </div>

            {/* ---- เอกสารนิติกรรม ---- */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-file-upload" style={{ marginRight: 8 }}></i>เอกสารนิติกรรม
              </h3>
              <p style={{ margin: '0 0 18px', fontSize: 12, color: '#888' }}>
                อัพโหลดเฉพาะหมวดที่เกี่ยวข้องกับประเภทสัญญา
              </p>

              {/* ★ หมวด: หน้าบัตรประชาชน (อ่านอย่างเดียว — ดึงจากที่อัพโหลดไว้แล้ว) */}
              {(() => {
                const parseF = v => { try { return JSON.parse(v || '[]') || [] } catch { return [] } }
                const idCardImgs = images.filter(img => img.includes('id-cards'))
                const borrowerIdFiles = parseF(caseData.borrower_id_card)
                // รวม borrower ID sources ไม่ซ้ำ
                const borrowerIdSources = [...new Set([...idCardImgs, ...borrowerIdFiles])]
                const investorId = caseData.investor_id_card_image
                const agentId = caseData.agent_id_card_image || caseData.issuing_broker_id

                const IdThumb = ({ src, label, color = '#1e40af' }) => {
                  if (!src) return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 120, height: 80, borderRadius: 8, border: `2px dashed ${color}40`, background: `${color}08`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <i className="fas fa-id-card" style={{ fontSize: 22, color: `${color}50` }}></i>
                        <span style={{ fontSize: 9, color: `${color}60` }}>ยังไม่มีไฟล์</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
                    </div>
                  )
                  const url = src.startsWith('/') ? src : `/${src}`
                  const isPdf = /\.pdf$/i.test(src)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                        {isPdf ? (
                          <div style={{ width: 120, height: 80, borderRadius: 8, border: `2px solid ${color}60`, background: '#fff5f5',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <i className="fas fa-file-pdf" style={{ fontSize: 24, color: '#e53935' }}></i>
                            <span style={{ fontSize: 9, color: '#e53935' }}>PDF</span>
                          </div>
                        ) : (
                          <img src={url} alt={label} onError={e => { e.target.style.display = 'none' }}
                            style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: `2px solid ${color}60`, display: 'block' }} />
                        )}
                      </a>
                      <span style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'center' }}>{label}</span>
                    </div>
                  )
                }

                return (
                  <div style={{ marginBottom: 20, padding: '14px 16px', background: '#f8faff', border: '1.5px solid #c7d2fe', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#3730a3', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-id-card"></i> หน้าบัตรประชาชน
                      <span style={{ fontSize: 10, fontWeight: 400, color: '#6b7280' }}>(อ่านอย่างเดียว)</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
                      {/* ลูกหนี้ — อาจมีหลายรูป */}
                      {borrowerIdSources.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#1e40af' }}>บัตรประชาชนลูกหนี้</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {borrowerIdSources.map((src, i) => {
                              const url = src.startsWith('/') ? src : `/${src}`
                              const isPdf = /\.pdf$/i.test(src)
                              return (
                                <a key={i} href={url} target="_blank" rel="noreferrer">
                                  {isPdf ? (
                                    <div style={{ width: 120, height: 80, borderRadius: 8, border: '2px solid #6b7280', background: '#fff5f5',
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                      <i className="fas fa-file-pdf" style={{ fontSize: 24, color: '#e53935' }}></i>
                                    </div>
                                  ) : (
                                    <img src={url} alt={`id-${i}`} onError={e => { e.target.style.display = 'none' }}
                                      style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #93c5fd', display: 'block' }} />
                                  )}
                                </a>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <IdThumb src={null} label="บัตรประชาชนลูกหนี้" color="#1e40af" />
                      )}
                      {/* นายทุน */}
                      <IdThumb src={investorId} label="บัตรประชาชนนายทุน" color="#6d28d9" />
                      {/* นายหน้า */}
                      {agentId && <IdThumb src={agentId} label="บัตรประชาชนนายหน้า" color="#b45309" />}
                    </div>
                  </div>
                )
              })()}

              {/* ★ หมวด: เอกสารจากฝ่ายขาย (อ่านอย่างเดียว) */}
              {(() => {
                const parseF = v => { try { return JSON.parse(v || '[]') || [] } catch { return [] } }
                const rows = [
                  { label: 'ทะเบียนบ้านลูกหนี้',  files: parseF(caseData.house_reg_book) },
                  { label: 'โฉนดที่ดิน (สำเนา)',     files: parseF(caseData.deed_copy) },
                  { label: 'ทะเบียนบ้านทรัพย์',     files: parseF(caseData.house_reg_prop) },
                  { label: 'สำเนาบัตรประชาชน',      files: parseF(caseData.borrower_id_card) },
                ].filter(r => r.files.length > 0)

                if (rows.length === 0) return null
                return (
                  <div style={{ marginBottom: 20, padding: '14px 16px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-check-circle"></i> เอกสารที่ฝ่ายขายอัพโหลดมา
                      <span style={{ fontSize: 10, fontWeight: 400, color: '#6b7280' }}>(อ่านอย่างเดียว)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                      {rows.map(({ label, files }) => (
                        <div key={label} style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#15803d', marginBottom: 6 }}>{label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {files.map((fp, i) => {
                              const url = fp.startsWith('/') ? fp : `/${fp}`
                              const isPdf = /\.pdf$/i.test(fp)
                              return (
                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11,
                                    color: isPdf ? '#dc2626' : '#2563eb', textDecoration: 'none',
                                    background: isPdf ? '#fef2f2' : '#eff6ff',
                                    border: `1px solid ${isPdf ? '#fca5a5' : '#bfdbfe'}`,
                                    borderRadius: 4, padding: '2px 7px' }}>
                                  <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-image'}`}></i> {i + 1}
                                </a>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

            </div>

            {/* ===== Checklist ก่อนนัดกรมที่ดิน ===== */}
            {(() => {
              const checks = [
                { key: 'closing_check_schedule', label: 'ยืนยันวัน-เวลา-สำนักงานที่ดินกับลูกหนี้แล้ว', icon: 'fa-calendar-check' },
                { key: 'closing_check_personal', label: 'ยืนยันสถานะบุคคลลูกหนี้ (โสด / สมรส / หย่า) ครบถ้วน', icon: 'fa-user-check' },
                { key: 'closing_check_legal',    label: 'ยืนยันสถานะทางกฎหมายทรัพย์ (ไม่ติดอายัด / จำนอง)', icon: 'fa-landmark' },
                { key: 'closing_check_docs',     label: 'เอกสารและสำเนาครบถ้วน พร้อมนำไปกรมที่ดิน', icon: 'fa-folder-check' },
              ]
              const doneCount = checks.filter(c => legalForm[c.key] == 1 || legalForm[c.key] === '1').length
              const allDone = doneCount === checks.length
              return (
                <div className="card" style={{ padding: 24, marginBottom: 20, border: `2px solid ${allDone ? '#16a34a' : '#f59e0b'}`, background: allDone ? '#f0fdf4' : '#fffbeb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: allDone ? '#15803d' : '#b45309' }}>
                      <i className="fas fa-clipboard-list" style={{ marginRight: 8 }}></i>
                      Checklist ก่อนนัดกรมที่ดิน
                    </h3>
                    <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: allDone ? '#16a34a' : '#f59e0b', color: '#fff' }}>
                      {allDone ? <><i className="fas fa-check"></i> ครบทุกข้อ</> : `${doneCount} / ${checks.length}`}
                    </span>
                  </div>
                  {!allDone && (
                    <div style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
                      <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i>
                      กรุณายืนยันทุกข้อก่อนนัดลูกหนี้ไปกรมที่ดิน เพื่อป้องกันปัญหาวันจริง
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {checks.map(({ key, label, icon }) => {
                      const checked = legalForm[key] == 1 || legalForm[key] === '1'
                      return (
                        <label key={key} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                          background: checked ? '#dcfce7' : '#fff',
                          border: `1px solid ${checked ? '#86efac' : '#e5e7eb'}`,
                          transition: 'all 0.15s'
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => setL(key, e.target.checked ? 1 : 0)}
                            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#16a34a' }}
                          />
                          <i className={`fas ${icon}`} style={{ fontSize: 14, color: checked ? '#16a34a' : '#9ca3af', width: 16, textAlign: 'center' }}></i>
                          <span style={{ fontSize: 13, fontWeight: checked ? 600 : 400, color: checked ? '#15803d' : '#374151' }}>
                            {label}
                          </span>
                          {checked && <i className="fas fa-check-circle" style={{ marginLeft: 'auto', color: '#16a34a', fontSize: 15 }}></i>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* ---- ★ สลิปค่าปากถุง + สลิปค่าหักล่วงหน้า ---- */}
            {/* ★ PDF รวมเอกสารทั้งหมด */}
            <div className="card" style={{ padding: isSmallScreen ? '16px 14px' : 24, marginBottom: 20, borderTop: '3px solid #7c3aed', background: 'linear-gradient(135deg, #faf5ff 0%, #fff 60%)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-file-pdf"></i>
                PDF รวมเอกสารทั้งหมด
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#9ca3af' }}>
                อัพโหลดไฟล์ PDF ที่รวมสัญญา บัตรประชาชน และเอกสารทุกชิ้นของเคสนี้ไว้ในฉบับเดียว
              </p>

              {/* Zone อัพโหลด */}
              <div style={{ background: '#f5f3ff', border: '2px dashed #c4b5fd', borderRadius: 14, padding: isSmallScreen ? '14px 12px' : '18px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* ปุ่มเลือกไฟล์ — เต็มแถว */}
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px 16px', width: '100%', boxSizing: 'border-box',
                    background: legalDocFileName ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#fff',
                    border: `2px solid ${legalDocFileName ? '#7c3aed' : '#c4b5fd'}`,
                    borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                    color: legalDocFileName ? '#fff' : '#7c3aed',
                    boxShadow: legalDocFileName ? '0 3px 10px rgba(124,58,237,0.25)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    <i className={`fas ${legalDocFileName ? 'fa-file-pdf' : 'fa-folder-open'}`}></i>
                    {legalDocFileName
                      ? legalDocFileName.slice(0, isSmallScreen ? 22 : 34) + (legalDocFileName.length > (isSmallScreen ? 22 : 34) ? '…' : '')
                      : 'แตะเพื่อเลือกไฟล์ PDF'}
                    <input type="file" accept=".pdf,application/pdf" ref={legalDocRef} style={{ display: 'none' }}
                      onChange={e => setLegalDocFileName(e.target.files[0]?.name || '')} />
                  </label>

                  {/* ช่องหมายเหตุ — เต็มแถว */}
                  <input
                    type="text" placeholder="หมายเหตุ เช่น ชุดเอกสารนิติกรรม (ไม่บังคับ)"
                    value={legalDocNote} onChange={e => setLegalDocNote(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #c4b5fd', fontSize: 14, outline: 'none', background: '#fff', color: '#374151' }}
                  />

                  {/* ปุ่มอัพโหลด + ยกเลิก — แถวเดียวกัน */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={handleLegalDocUpload}
                      disabled={!legalDocFileName || legalDocUploading}
                      style={{
                        flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                        cursor: legalDocFileName ? 'pointer' : 'not-allowed',
                        background: legalDocFileName ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#e5e7eb',
                        color: legalDocFileName ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: legalDocFileName ? '0 3px 10px rgba(22,163,74,0.3)' : 'none',
                        transition: 'all 0.2s', minHeight: 46,
                      }}>
                      {legalDocUploading
                        ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</>
                        : <><i className="fas fa-cloud-upload-alt"></i> อัพโหลด</>}
                    </button>
                    {legalDocFileName && (
                      <button type="button"
                        onClick={() => { setLegalDocFileName(''); setLegalDocNote(''); if (legalDocRef.current) legalDocRef.current.value = '' }}
                        style={{ padding: '11px 16px', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 46 }}>
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* รายการไฟล์ที่อัพโหลดแล้ว */}
              {legalDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#c4b5fd', fontSize: 13 }}>
                  <i className="fas fa-inbox" style={{ fontSize: 30, display: 'block', marginBottom: 6 }}></i>
                  ยังไม่มีไฟล์ที่อัพโหลด
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {legalDocs.map((doc) => (
                    <div key={doc.id} style={{
                      background: '#fff', border: '1.5px solid #e9d5ff', borderRadius: 12,
                      padding: '12px 14px', boxShadow: '0 1px 4px rgba(124,58,237,0.06)',
                    }}>
                      {/* แถวบน: ไอคอน + ชื่อไฟล์ + ปุ่ม */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="fas fa-file-pdf" style={{ color: '#fff', fontSize: 17 }}></i>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.file_name || doc.file_path?.split('/').pop()}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                            {doc.file_size && (
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                                {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>
                              <i className="fas fa-clock" style={{ marginRight: 3 }}></i>
                              {new Date(doc.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        {/* ปุ่มด้านขวา */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <a href={`/${doc.file_path}`} target="_blank" rel="noreferrer"
                            style={{ padding: '7px 14px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 6px rgba(124,58,237,0.3)', minHeight: 36 }}>
                            <i className="fas fa-eye"></i>{!isSmallScreen && ' เปิด'}
                          </a>
                          <button type="button" onClick={() => handleLegalDocDelete(doc.id)}
                            style={{ padding: '7px 12px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 36 }}>
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </div>
                      {/* หมายเหตุ (ถ้ามี) */}
                      {doc.note && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3e8ff' }}>
                          <span style={{ fontSize: 12, color: '#7c3aed', background: '#f3e8ff', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
                            <i className="fas fa-tag" style={{ marginRight: 4, fontSize: 10 }}></i>{doc.note}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {legalDocs.length > 0 && (
                <div style={{ marginTop: 10, textAlign: 'right', fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>
                  <i className="fas fa-layer-group" style={{ marginRight: 5 }}></i>
                  {legalDocs.length} ไฟล์ทั้งหมด
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e65100' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#e65100', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-receipt"></i>
                สลิปการเงิน
                <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>— ฝ่ายขาย · นิติ · บัญชี มองเห็น</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'สลิปโอนเงินค่าปากถุง',   field: 'transaction_slip', ref: transactionSlipRef },
                  { label: 'สลิปค่าหักล่วงหน้า',      field: 'advance_slip',     ref: advanceSlipRef },
                ].map(({ label, field, ref }) => {
                  const existingFile = caseData[field]
                  const newFileName = fileNames[field]
                  const hasExisting = !!existingFile
                  const hasNew = !!newFileName
                  return (
                    <div key={field} style={{ background: '#fffbf7', border: '1.5px solid #ffe0b2', borderRadius: 12, padding: 16 }}>
                      {/* Label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #ff6d00, #e65100)', color: '#fff',
                          borderRadius: 7, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 6,
                          boxShadow: '0 2px 6px rgba(230,81,0,0.3)'
                        }}>
                          <i className="fas fa-receipt" style={{ fontSize: 11 }}></i>
                          {label}
                        </div>
                      </div>

                      {/* ไฟล์ที่มีอยู่ */}
                      {hasExisting && !hasNew && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', background: '#fff8f0',
                          borderRadius: 10, border: '1.5px solid #ffcc80', marginBottom: 10
                        }}>
                          {existingFile.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                            <a href={existingFile.startsWith('/') ? existingFile : `/${existingFile}`} target="_blank" rel="noreferrer">
                              <img
                                src={existingFile.startsWith('/') ? existingFile : `/${existingFile}`}
                                alt={label}
                                style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 6, border: '1.5px solid #ffcc80', cursor: 'pointer' }}
                              />
                            </a>
                          ) : (
                            <div style={{ width: 44, height: 44, background: '#fff3e0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #ffcc80', flexShrink: 0 }}>
                              <i className="fas fa-file-pdf" style={{ color: '#e65100', fontSize: 20 }}></i>
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#e65100', marginBottom: 2 }}>
                              <i className="fas fa-check-circle" style={{ fontSize: 12, marginRight: 4 }}></i>อัพโหลดแล้ว
                            </div>
                            <div style={{ fontSize: 10, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {existingFile.split('/').pop()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                            <a href={existingFile.startsWith('/') ? existingFile : `/${existingFile}`} target="_blank" rel="noreferrer"
                              style={{ padding: '4px 10px', background: '#e65100', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-eye"></i> ดู
                            </a>
                            <button type="button" onClick={() => deleteDocument(field)}
                              style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-trash-alt"></i> ลบ
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ไฟล์ใหม่ที่เลือก */}
                      {hasNew && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', background: '#f0fdf4',
                          borderRadius: 10, border: '1.5px solid #86efac', marginBottom: 10
                        }}>
                          <div style={{ width: 38, height: 38, background: '#dcfce7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="fas fa-file-check" style={{ color: '#16a34a', fontSize: 16 }}></i>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 2 }}>
                              <i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>เลือกไฟล์แล้ว
                            </div>
                            <div style={{ fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {newFileName}
                            </div>
                          </div>
                          <button type="button"
                            onClick={() => { setFileName(field, ''); if (ref.current) ref.current.value = '' }}
                            style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <i className="fas fa-times"></i> ยกเลิก
                          </button>
                        </div>
                      )}

                      {/* ปุ่มอัพโหลด */}
                      <label style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '7px 16px', background: hasNew ? '#f0fdf4' : '#fff8f0',
                        border: `1.5px dashed ${hasNew ? '#86efac' : '#ffb74d'}`,
                        borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        color: hasNew ? '#16a34a' : '#e65100', transition: 'all 0.2s'
                      }}>
                        <i className={`fas ${hasNew ? 'fa-exchange-alt' : 'fa-cloud-upload-alt'}`}></i>
                        {hasNew ? 'เปลี่ยนไฟล์' : hasExisting ? 'อัพโหลดไฟล์ใหม่แทน' : 'เลือกไฟล์สลิป'}
                        <input type="file" accept="image/*,.pdf" ref={ref} style={{ display: 'none' }}
                          onChange={e => setFileName(field, e.target.files[0]?.name || '')} />
                      </label>
                      <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>รูปภาพ / PDF</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ===== ★ กระดิ่งแจ้งฝ่ายต่างๆ ===== */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fas fa-satellite-dish" style={{ marginRight: 5 }}></i>ส่งกระดิ่งแจ้งฝ่าย
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>

                {/* ฝ่ายขาย — นัดวันนิติกรรม (blue) */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer',
                  userSelect: 'none',
                  flex: 1, minWidth: 180,
                  background: notifySalesScheduled ? '#eff6ff' : '#fafafa',
                  border: `2px solid ${notifySalesScheduled ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifySalesScheduled ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input
                    type="checkbox"
                    checked={notifySalesScheduled}
                    onChange={e => setNotifySalesScheduled(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#3b82f6', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifySalesScheduled ? '#1d4ed8' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifySalesScheduled && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายขาย
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>📅 นัดวันนิติกรรม</div>
                  </div>
                </label>

                {/* ฝ่ายขาย — นิติกรรมเสร็จ (green) */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 180,
                  background: notifySalesCompleted ? '#ecfdf5' : '#fafafa',
                  border: `2px solid ${notifySalesCompleted ? '#6ee7b7' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifySalesCompleted ? '0 0 0 3px rgba(110,231,183,0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input type="checkbox" checked={notifySalesCompleted} onChange={e => setNotifySalesCompleted(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#059669', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifySalesCompleted ? '#065f46' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifySalesCompleted && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายขาย
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>✅ นิติกรรมเสร็จ</div>
                  </div>
                </label>

                {/* ฝ่ายบัญชี — นิติกรรมเสร็จ (amber) */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 180,
                  background: notifyAccountingCompleted ? '#fffbeb' : '#fafafa',
                  border: `2px solid ${notifyAccountingCompleted ? '#f59e0b' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifyAccountingCompleted ? '0 0 0 3px rgba(245,158,11,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input type="checkbox" checked={notifyAccountingCompleted} onChange={e => setNotifyAccountingCompleted(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#f59e0b', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifyAccountingCompleted ? '#b45309' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifyAccountingCompleted && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายบัญชี
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>💰 นิติกรรมเสร็จแล้ว</div>
                  </div>
                </label>

              </div>
            </div>

            {/* ข้อมูลจากฝ่ายขาย */}
            <CaseInfoSummary caseId={caseData.id} />

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</>
                  : <><i className="fas fa-save"></i> บันทึกข้อมูลทั้งหมด</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/legal')} style={{ padding: '12px 24px' }}>
                ยกเลิก
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <CancelCaseButton caseId={caseData.id} caseCode={caseData.case_code} caseStatus={caseData.status} onSuccess={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </form>
      <style>{`
        @keyframes bellShake {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(-18deg); }
          40%  { transform: rotate(18deg); }
          60%  { transform: rotate(-12deg); }
          80%  { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  )
}

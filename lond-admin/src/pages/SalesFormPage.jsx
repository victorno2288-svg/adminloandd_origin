import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import '../styles/sales.css'
import CancelCaseButton from '../components/CancelCaseButton'
import MapPreview from '../components/MapPreview'
import { useSlipVerify } from '../components/SlipVerifyBadge'
import SlipVerifyBadge from '../components/SlipVerifyBadge'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales'

// ★ ดึง department จาก JWT token (สำหรับซ่อนราคาประเมินจากเซล)
function getUserDepartment() {
  try {
    const t = localStorage.getItem('loandd_admin')
    if (!t) return null
    const payload = JSON.parse(atob(t.split('.')[1]))
    return payload.department || null
  } catch { return null }
}
const USER_DEPT = getUserDepartment()

// ★ Checklist เอกสารตามสถานะสมรส (ตาม SOP ฝ่ายขาย ข้อ 5.2)
const MARITAL_CHECKLIST = {
  single: {
    label: 'โสด',
    color: '#1565c0',
    option: 'Option A',
    items: [
      'สำเนาบัตรประชาชน (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้าน',
    ],
  },
  married_reg: {
    label: 'สมรสจดทะเบียน',
    color: '#6a1b9a',
    option: 'Option B',
    items: [
      'สำเนาบัตรประชาชนผู้กู้ (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้านผู้กู้',
      'ทะเบียนสมรส',
      'สำเนาบัตรประชาชนคู่สมรส',
      'สำเนาทะเบียนบ้านคู่สมรส',
    ],
  },
  married_unreg: {
    label: 'สมรสไม่จดทะเบียน',
    color: '#e65100',
    option: 'Option C',
    items: [
      'สำเนาบัตรประชาชนผู้กู้ (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้านผู้กู้',
      'หนังสือรับรองโสด (จากอำเภอ) หรือแบบฟอร์มยืนยันสถานะไม่ได้จดทะเบียน',
    ],
  },
  divorced: {
    label: 'หย่า',
    color: '#c62828',
    option: 'Option D',
    items: [
      'สำเนาบัตรประชาชน (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้าน',
      'ทะเบียนหย่า',
      'บันทึกการหย่า (ถ้ามี)',
    ],
  },
  widowed: {
    label: 'หม้าย',
    color: '#7b1fa2',
    option: 'Option E',
    items: [
      'สำเนาบัตรประชาชน (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้าน',
      'ใบมรณบัตรคู่สมรส',
    ],
  },
  inherited: {
    label: 'รับมรดก',
    color: '#2e7d32',
    option: 'Option E',
    items: [
      'สำเนาบัตรประชาชนผู้รับมรดก (รับรองสำเนาถูกต้อง)',
      'สำเนาทะเบียนบ้านผู้รับมรดก',
      'ใบมรณบัตรเจ้ามรดก',
      'พินัยกรรม หรือ คำสั่งศาล (ถ้ามี)',
      'สำเนาทะเบียนบ้านเจ้ามรดก',
    ],
  },
}

// ★ MARITAL_CHECKLIST_DOCS — มี field name สำหรับ upload
const MARITAL_CHECKLIST_DOCS = {
  single: [
    { field: 'borrower_id_card', label: 'สำเนาบัตรประชาชน (รับรองสำเนาถูกต้อง)', required: true },
    { field: 'house_reg_book',   label: 'สำเนาทะเบียนบ้าน',                      required: true },
  ],
  married_reg: [
    { field: 'borrower_id_card', label: 'สำเนาบัตรประชาชนผู้กู้ (รับรองสำเนาถูกต้อง)', required: true },
    { field: 'house_reg_book',   label: 'สำเนาทะเบียนบ้านผู้กู้',                 required: true },
    { field: 'marriage_cert',    label: 'ทะเบียนสมรส',                            required: true },
    { field: 'spouse_id_card',   label: 'สำเนาบัตรประชาชนคู่สมรส',               required: true },
    { field: 'spouse_reg_copy',  label: 'สำเนาทะเบียนบ้านคู่สมรส',               required: true },
  ],
  married_unreg: [
    { field: 'borrower_id_card', label: 'สำเนาบัตรประชาชนผู้กู้ (รับรองสำเนาถูกต้อง)', required: true },
    { field: 'house_reg_book',   label: 'สำเนาทะเบียนบ้านผู้กู้',                 required: true },
    { field: 'single_cert',      label: 'หนังสือรับรองโสด / ยืนยันไม่จดทะเบียน', required: true },
  ],
  divorced: [
    { field: 'borrower_id_card', label: 'สำเนาบัตรประชาชน (รับรองสำเนาถูกต้อง)', required: true },
    { field: 'house_reg_book',   label: 'สำเนาทะเบียนบ้าน',                      required: true },
    { field: 'divorce_doc',      label: 'ทะเบียนหย่า',                            required: true },
  ],
  widowed: [
    { field: 'borrower_id_card', label: 'สำเนาบัตรประชาชน (รับรองสำเนาถูกต้อง)', required: true },
    { field: 'house_reg_book',   label: 'สำเนาทะเบียนบ้าน',                      required: true },
    { field: 'death_cert',       label: 'ใบมรณบัตรคู่สมรส',                      required: true },
  ],
  inherited: [
    { field: 'borrower_id_card',   label: 'สำเนาบัตรประชาชนผู้รับมรดก (รับรองสำเนาถูกต้อง)', required: true },
    { field: 'house_reg_book',     label: 'สำเนาทะเบียนบ้านผู้รับมรดก',           required: true },
    { field: 'death_cert',         label: 'ใบมรณบัตรเจ้ามรดก',                   required: true },
    { field: 'will_court_doc',     label: 'พินัยกรรม หรือ คำสั่งศาล (ถ้ามี)',     required: false },
    { field: 'testator_house_reg', label: 'สำเนาทะเบียนบ้านเจ้ามรดก',            required: true },
  ],
}

// ★ Checklist เอกสารตามประเภทอสังหาริมทรัพย์ (SOP ฝ่ายขาย)
const PROP_TYPE_CHECKLIST = {
  // บ้านเดี่ยว, บ้าน, ทาวน์โฮม
  house: [
    { key: 'deed_copy',           label: 'โฉนดที่ดิน (ต้นฉบับ/สำเนา)', required: true },
    { key: 'building_permit',     label: 'ใบอนุญาตก่อสร้าง / ใบ อ.', required: true },
    { key: 'house_reg_prop',      label: 'ทะเบียนบ้านของทรัพย์', required: true },
    { key: 'sale_contract',       label: 'สัญญาซื้อขาย / สัญญาจอง', required: false },
    { key: 'debt_free_cert',      label: 'ใบปลอดภาระ (ปลอดหนี้จากสถาบันการเงิน)', required: false },
    { key: 'blueprint',           label: 'แบบแปลนบ้าน (blueprint)', required: false },
    { key: 'property_photos',     label: 'รูปถ่ายทรัพย์ (หน้า/หลัง/ด้านข้าง)', required: true },
    { key: 'land_tax_receipt',    label: 'หลักฐานชำระภาษีที่ดิน (ภ.บ.ท.5 / ภ.ด.8)', required: false },
    { key: 'maps_url',            label: 'แผนที่/Google Maps ทำเล', required: false },
  ],
  single_house: [
    { key: 'deed_copy',           label: 'โฉนดที่ดิน (ต้นฉบับ/สำเนา)', required: true },
    { key: 'building_permit',     label: 'ใบอนุญาตก่อสร้าง / ใบ อ.', required: true },
    { key: 'house_reg_prop',      label: 'ทะเบียนบ้านของทรัพย์', required: true },
    { key: 'sale_contract',       label: 'สัญญาซื้อขาย / สัญญาจอง', required: false },
    { key: 'debt_free_cert',      label: 'ใบปลอดภาระ (ปลอดหนี้จากสถาบันการเงิน)', required: false },
    { key: 'blueprint',           label: 'แบบแปลนบ้าน (blueprint)', required: false },
    { key: 'property_photos',     label: 'รูปถ่ายทรัพย์ (หน้า/หลัง/ด้านข้าง)', required: true },
    { key: 'land_tax_receipt',    label: 'หลักฐานชำระภาษีที่ดิน (ภ.บ.ท.5 / ภ.ด.8)', required: false },
    { key: 'maps_url',            label: 'แผนที่/Google Maps ทำเล', required: false },
  ],
  townhouse: [
    { key: 'deed_copy',           label: 'โฉนดที่ดิน (ต้นฉบับ/สำเนา)', required: true },
    { key: 'building_permit',     label: 'ใบอนุญาตก่อสร้าง / ใบ อ.', required: true },
    { key: 'house_reg_prop',      label: 'ทะเบียนบ้านของทรัพย์', required: true },
    { key: 'sale_contract',       label: 'สัญญาซื้อขาย / สัญญาจอง', required: false },
    { key: 'debt_free_cert',      label: 'ใบปลอดภาระ (ปลอดหนี้จากสถาบันการเงิน)', required: false },
    { key: 'property_photos',     label: 'รูปถ่ายทรัพย์ (หน้า/หลัง/ด้านข้าง)', required: true },
    { key: 'land_tax_receipt',    label: 'หลักฐานชำระภาษีที่ดิน (ภ.บ.ท.5 / ภ.ด.8)', required: false },
    { key: 'maps_url',            label: 'แผนที่/Google Maps ทำเล', required: false },
  ],
  condo: [
    { key: 'condo_title_deed',    label: 'หนังสือกรรมสิทธิ์ห้องชุด (อ.ช.2)', required: true },
    { key: 'debt_free_cert',      label: 'ใบปลอดหนี้นิติบุคคลอาคารชุด', required: false },
    { key: 'condo_location_map',  label: 'แผนที่ตั้งโครงการ / แผนผังห้อง', required: false },
    { key: 'sale_contract',       label: 'สัญญาซื้อขาย / สัญญาจอง', required: false },
    { key: 'common_fee_receipt',  label: 'ใบเสร็จค่าส่วนกลาง (3 เดือนล่าสุด)', required: false },
    { key: 'property_photos',     label: 'รูปถ่ายห้อง (ด้านใน/ทางเข้า)', required: true },
    { key: 'floor_plan',          label: 'แปลนห้อง (floor plan)', required: false },
    { key: 'building_permit',     label: 'ใบอนุญาตก่อสร้างอาคาร (ถ้ามี)', required: false },
    { key: 'maps_url',            label: 'แผนที่/Google Maps ทำเล', required: false },
  ],
  land: [
    { key: 'deed_copy',           label: 'โฉนดที่ดิน (ต้นฉบับ/สำเนา)', required: true },
    { key: 'land_tax_receipt',    label: 'หลักฐานชำระภาษีที่ดิน (ภ.บ.ท.5 / ภ.ด.8)', required: false },
    { key: 'location_sketch_map', label: 'แผนที่สังเขปทำเล (sketch map)', required: false },
    { key: 'property_photos',     label: 'รูปถ่ายที่ดิน (4 ด้าน + มุมมองโดยรอบ)', required: true },
    { key: 'sale_contract',       label: 'สัญญาซื้อขาย (ถ้ามี)', required: false },
    { key: 'land_use_cert',       label: 'หนังสือรับรองการใช้ประโยชน์ที่ดิน (ถ้ามี)', required: false },
    { key: 'debt_free_cert',      label: 'ใบปลอดภาระ (ปลอดจำนองจากสถาบันการเงิน)', required: false },
    { key: 'maps_url',            label: 'แผนที่/Google Maps ทำเล', required: false },
  ],
  shophouse: [
    { key: 'deed_copy',           label: 'โฉนดที่ดิน (ต้นฉบับ/สำเนา)', required: true },
    { key: 'building_permit',     label: 'ใบอนุญาตก่อสร้าง / ใบรับรองการก่อสร้าง', required: true },
    { key: 'property_photos',     label: 'รูปถ่ายทรัพย์ (ด้านหน้า/ข้าง/ใน)', required: true },
    { key: 'land_tax_receipt',    label: 'หลักฐานชำระภาษีที่ดิน (ภ.บ.ท.5 / ภ.ด.8)', required: false },
    { key: 'rental_contract',     label: 'สัญญาเช่า (ถ้าปล่อยเช่า)', required: false },
    { key: 'business_reg',        label: 'ทะเบียนพาณิชย์ (ถ้าประกอบการค้า)', required: false },
    { key: 'debt_free_cert',      label: 'ใบปลอดภาระ (ปลอดหนี้จากสถาบันการเงิน)', required: false },
    { key: 'maps_url',            label: 'แผนที่/Google Maps ทำเล', required: false },
  ],
  apartment: [
    { key: 'deed_copy',           label: 'โฉนดที่ดิน (ต้นฉบับ/สำเนา)', required: true },
    { key: 'building_permit',     label: 'ใบอนุญาตก่อสร้าง / ใบ อ.', required: true },
    { key: 'house_reg_prop',      label: 'ทะเบียนบ้านของทรัพย์', required: true },
    { key: 'sale_contract',       label: 'สัญญาซื้อขาย / สัญญาจอง', required: false },
    { key: 'debt_free_cert',      label: 'ใบปลอดภาระ (ปลอดหนี้จากสถาบันการเงิน)', required: false },
    { key: 'property_photos',     label: 'รูปถ่ายทรัพย์ (ภายนอก/ภายใน/ห้องตัวอย่าง)', required: true },
    { key: 'land_tax_receipt',    label: 'หลักฐานชำระภาษีที่ดิน (ภ.บ.ท.5 / ภ.ด.8)', required: false },
    { key: 'rental_contract',     label: 'สัญญาเช่า / รายชื่อผู้เช่า (ถ้ามี)', required: false },
    { key: 'business_reg',        label: 'ใบอนุญาตประกอบกิจการหอพัก (ถ้ามี)', required: false },
    { key: 'maps_url',            label: 'แผนที่/Google Maps ทำเล', required: false },
  ],
}
// แมป property_type → PROP_TYPE_CHECKLIST key
const PROP_CHECKLIST_KEY_MAP = {
  house: 'house', single_house: 'single_house', townhouse: 'townhouse',
  condo: 'condo', land: 'land', shophouse: 'shophouse', apartment: 'apartment',
}

const propertyTypes = [
  { value: 'house',        label: 'บ้าน' },
  { value: 'townhouse',    label: 'ทาวน์โฮม' },
  { value: 'condo',        label: 'คอนโด' },
  { value: 'single_house', label: 'บ้านเดี่ยว (สร้างเอง)' },
  { value: 'shophouse',    label: 'ตึกแถว' },
  { value: 'apartment',    label: 'หอพัก / อพาร์ตเมนต์' },
  { value: 'land',         label: 'ที่ดินเปล่า' },
]

// ประเภทที่ดิน/เกษตร ไม่มีสิ่งปลูกสร้าง → ไม่ต้องแสดงรายละเอียดอาคาร
const LAND_ONLY_TYPES = ['land', 'agri', 'farm', 'rice_field', 'orchard', 'swamp', '']
// ประเภทที่มีห้องพัก/การให้เช่า
const RENTAL_TYPES = ['apartment', 'shophouse']
// ประเภทที่มีชื่อโครงการ
const PROJECT_TYPES = ['house', 'townhouse', 'condo', 'single_house']

const provinces = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
  'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
  'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
  'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
  'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'พะเยา', 'ภูเก็ต',
  'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี',
  'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
]

export default function SalesFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)

  const socketRef = useRef(null)
  const [ocrFlash, setOcrFlash] = useState(null) // แสดง badge เมื่อ OCR อัพเดทฟิลด์

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [autoCreating, setAutoCreating] = useState(false)
  const [autoCreateMsg, setAutoCreateMsg] = useState('')
  const [notifyAppraisal, setNotifyAppraisal] = useState(false) // ★ แจ้งฝ่ายประเมิน
  const [notifyApproval, setNotifyApproval] = useState(false)   // ★ แจ้งฝ่ายอนุมัติสินเชื่อ
  const [notifyLegal, setNotifyLegal] = useState(false)         // ★ แจ้งฝ่ายนิติ
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)

  // ★ เอกสาร Checklist (อัพโหลดเข้า loan_requests)
  const [checklistDocs, setChecklistDocs] = useState({})
  const [uploadingChecklistDoc, setUploadingChecklistDoc] = useState(null)
  const [propPhotosQueue, setPropPhotosQueue] = useState([]) // ★ รูปถ่ายทรัพย์ที่รอ upload
  const [propPhotosDragging, setPropPhotosDragging] = useState(false) // ★ drag-over state

  // ★ Property-type Document Checklist (prop_checklist_json)
  const [propChecklist, setPropChecklist] = useState({}) // { deed_copy: true, building_permit: false, ... }
  const [savingPropChecklist, setSavingPropChecklist] = useState(false)

  // ★ Marital docs tick state (checklist_ticks_json — ติ๊กรับทราบโดยไม่ต้องอัพโหลด)
  const [maritalTicks, setMaritalTicks] = useState({})

  // ★ Transfer Case
  const [salesUsers, setSalesUsers] = useState([])
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferTargetId, setTransferTargetId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [transferLogs, setTransferLogs] = useState([])

  // ★ Advance Price Request
  const [advanceRequests, setAdvanceRequests] = useState([])
  const [sendingAdvance, setSendingAdvance] = useState(false)
  const [advanceNote, setAdvanceNote] = useState('')
  const [showAdvanceForm, setShowAdvanceForm] = useState(false)

  // ★ Follow-up Tracking
  const [followups, setFollowups] = useState([])
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [followupType, setFollowupType] = useState('chat')
  const [followupNote, setFollowupNote] = useState('')
  const [followupNextAt, setFollowupNextAt] = useState('')
  const [savingFollowup, setSavingFollowup] = useState(false)

  // ★ Manual OCR
  const [ocrLoading, setOcrLoading] = useState(false)  // กำลังอ่านเอกสาร
  const [ocrMsg, setOcrMsg]         = useState(null)   // { type: 'success'|'error', text, filled }
  // ★ file previews
  const [idCardLocalPreview, setIdCardLocalPreview] = useState(null)
  const [paymentSchedPreview, setPaymentSchedPreview] = useState(null)

  // ★ GPS อุปกรณ์จริง — ใช้ navigator.geolocation → auto-fill Google Maps URL
  const useDeviceGPS = () => {
    if (!navigator.geolocation) {
      setOcrMsg({ type: 'warn', text: '⚠️ เบราว์เซอร์นี้ไม่รองรับ GPS' })
      setTimeout(() => setOcrMsg(null), 4000)
      return
    }
    setOcrMsg({ type: 'info', text: '📍 กำลังอ่านพิกัด GPS จากอุปกรณ์...' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const mapsUrl = `https://www.google.com/maps/@${lat},${lng},16z`
        set('location_url', mapsUrl)
        setOcrMsg({ type: 'success', text: `✅ GPS อุปกรณ์: ${lat.toFixed(5)}, ${lng.toFixed(5)}` })
        setTimeout(() => setOcrMsg(null), 5000)
      },
      (err) => {
        const msg = err.code === 1 ? 'กรุณาอนุญาต Location ในเบราว์เซอร์'
          : err.code === 2 ? 'ไม่พบสัญญาณ GPS'
          : 'หมดเวลา ลองใหม่อีกครั้ง'
        setOcrMsg({ type: 'warn', text: `⚠️ ${msg}` })
        setTimeout(() => setOcrMsg(null), 5000)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  // ★ Geocoding — แปลงที่อยู่ → พิกัด GPS ด้วย Nominatim (OpenStreetMap, ฟรี)
  const geocodeAddress = async (province, district, subdistrict) => {
    if (!province && !district) return null
    try {
      // สร้าง query จากตำบล/อำเภอ/จังหวัด
      const parts = [
        subdistrict ? `ตำบล${subdistrict}` : '',
        district    ? `อำเภอ${district}` : '',
        province    ? `จังหวัด${province}` : '',
        'Thailand'
      ].filter(Boolean).join(', ')
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(parts)}&format=json&limit=1&accept-language=th`
      const res = await fetch(url, { headers: { 'User-Agent': 'LOANDD-Admin/1.0' } })
      const data = await res.json()
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }
      }
      // ลองอีกครั้งด้วยแค่อำเภอ+จังหวัด ถ้าหาตำบลไม่เจอ
      if (subdistrict) return geocodeAddress(province, district, null)
      return null
    } catch (err) {
      console.log('[Geocode] error:', err.message)
      return null
    }
  }

  // ★ สร้าง Google Maps URL จากพิกัดจริง
  const generateMapsUrl = async () => {
    setOcrMsg({ type: 'info', text: '🔍 กำลังค้นหาพิกัด GPS...' })
    const coords = await geocodeAddress(form.province, form.district, form.subdistrict)
    if (coords) {
      // ใช้พิกัดจริง → Google Maps จะโฟกัสตรงจุด + zoom level 16
      const mapsUrl = `https://www.google.com/maps/@${coords.lat},${coords.lng},16z`
      set('location_url', mapsUrl)
      window.open(mapsUrl, '_blank')
      setOcrMsg({ type: 'success', text: `✅ พบพิกัด: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} — เปิด Google Maps แล้ว` })
      setTimeout(() => setOcrMsg(null), 5000)
      return true
    } else {
      // fallback: เปิด text search
      const parts = [
        form.subdistrict ? `ตำบล${form.subdistrict}` : '',
        form.district    ? `อำเภอ${form.district}`   : '',
        form.province    ? `จังหวัด${form.province}` : '',
      ].filter(Boolean)
      const q = parts.join(' ')
      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(q)}`
      set('location_url', mapsUrl)
      window.open(mapsUrl, '_blank')
      setOcrMsg({ type: 'warn', text: '⚠️ ไม่พบพิกัดจาก Nominatim — เปิด Google Maps แบบ text search แทน' })
      setTimeout(() => setOcrMsg(null), 5000)
      return false
    }
  }

  // ★ Appointments
  const [appointments, setAppointments] = useState([])
  const [showApptForm, setShowApptForm] = useState(false)
  const [newAppt, setNewAppt] = useState({ appt_type: 'valuation', appt_date: '', appt_time: '', location: '', notes: '' })
  const [savingAppt, setSavingAppt] = useState(false)

  // ★ คัดทรัพย์ inline (dropdown)
  const [screeningExpanded,  setScreeningExpanded]  = useState(false)
  const [manualFailChecks,   setManualFailChecks]   = useState({})
  const [savingScreening,    setSavingScreening]    = useState(false)
  const [screeningMsg,       setScreeningMsg]       = useState('')

  // ★ สลิปค่าประเมิน
  const [slipFiles, setSlipFiles] = useState([])
  const slipVerify = useSlipVerify({ apiBase: '/api/admin', token: token() })   // ★ ตรวจ QR + เช็ค duplicate ref
  const slipFile = slipFiles[0] || null  // compat
  const [uploadingSlip, setUploadingSlip] = useState(false)
  const [slipMsg, setSlipMsg] = useState('')

  // ★ สัญญาแต่งตั้งนายหน้า
  const [brokerContractFiles, setBrokerContractFiles] = useState([])
  const brokerContractFile = brokerContractFiles[0] || null  // compat
  const [brokerIdFiles, setBrokerIdFiles] = useState([])
  const brokerIdFile = brokerIdFiles[0] || null
  const [uploadingBrokerContract, setUploadingBrokerContract] = useState(false)
  const [brokerContractMsg, setBrokerContractMsg] = useState('')
  const [brokerEmailInput, setBrokerEmailInput] = useState('')
  const [showBrokerEmailInput, setShowBrokerEmailInput] = useState(false)
  const [sendingBrokerEmail, setSendingBrokerEmail] = useState(false)

  const [existingImages, setExistingImages] = useState([])
  const [existingDeedImages, setExistingDeedImages] = useState([])
  const [caseInfo, setCaseInfo] = useState(null)
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(false) // collapsible ตารางผ่อนชำระ
  const [linkedCases, setLinkedCases] = useState([])
  const [showOtherDeptInfo, setShowOtherDeptInfo] = useState(false)

  const statusOptions = [
    { value: 'new', label: 'เคสใหม่' },
    { value: 'contacting', label: 'กำลังติดต่อ' },
    { value: 'incomplete', label: 'ข้อมูลไม่ครบ' },
    { value: 'awaiting_appraisal_fee', label: 'รอชำระค่าประเมิน' },
    { value: 'appraisal_scheduled', label: 'นัดประเมินแล้ว' },
    { value: 'appraisal_passed', label: 'ผ่านประเมินแล้ว' },
    { value: 'appraisal_not_passed', label: 'ไม่ผ่านประเมิน' },
    { value: 'pending_approve', label: 'รออนุมัติวงเงิน' },
    { value: 'credit_approved', label: 'อนุมัติวงเงินแล้ว' },
    { value: 'pending_auction', label: 'รอประมูล' },
    { value: 'preparing_docs', label: 'เตรียมเอกสาร' },
    { value: 'legal_scheduled', label: 'นัดนิติกรรมแล้ว' },
    { value: 'legal_completed', label: 'ทำนิติกรรมเสร็จสิ้น' },
    { value: 'completed', label: 'เสร็จสมบูรณ์' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ]

  const paymentOptions = [
    { value: 'unpaid', label: 'ยังไม่ชำระ' },
    { value: 'paid', label: 'ชำระแล้ว' },
  ]

  // Pipeline stages — Flow ตามกระบวนการจริง
  const PIPELINE_STAGES = [
    { value: 'chat',             label: 'ทักมา/แชท',         icon: 'fa-comment' },
    { value: 'waiting_deed',     label: 'รอโฉนด',             icon: 'fa-file-alt' },
    { value: 'sent_appraisal',   label: 'ส่งประเมินเบื้องต้น', icon: 'fa-paper-plane' },
    { value: 'waiting_price',    label: 'รอราคา',             icon: 'fa-clock' },
    { value: 'waiting_approval', label: 'รออนุมัติวงเงิน',    icon: 'fa-user-check' },
    { value: 'waiting_book',     label: 'รอเล่มประเมินจริง',  icon: 'fa-book' },
    { value: 'negotiating',      label: 'เจรจาตาราง',         icon: 'fa-handshake' },
    { value: 'broker_contract',  label: 'ตั้งนายหน้า',        icon: 'fa-file-signature' },
    { value: 'auction_direct',   label: 'ประมูล/ขายตรง',      icon: 'fa-gavel' },
    { value: 'prep_docs',        label: 'เตรียมเอกสาร',       icon: 'fa-folder-open' },
    { value: 'land_appointment', label: 'นัดกรมที่ดิน',       icon: 'fa-map-marker-alt' },
    { value: 'completed',        label: 'จบแล้ว',             icon: 'fa-check-circle' },
  ]

  // ★ ประเภทเอกสารสิทธิ์ตาม SOP
  const deedTypes = [
    { value: 'chanote', label: 'โฉนดที่ดิน (น.ส.4)', ok: true },
    { value: 'ns4k', label: 'น.ส.4ก.', ok: true },
    { value: 'ns3', label: 'นส.3', ok: false },
    { value: 'ns3k', label: 'นส.3ก.', ok: false },
    { value: 'spk', label: 'ที่ดิน ส.ป.ก.', ok: false },
    { value: 'other', label: 'อื่นๆ', ok: null },
  ]
  const isDeedBlacklisted = (v) => v && ['ns3', 'ns3k', 'spk'].includes(v)
  const isDeedOk = (v) => v && ['chanote', 'ns4k'].includes(v)

  const [form, setForm] = useState({
    lead_source: '',              // ★ ช่องทางที่ลูกหนี้มา (Group 1)
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    contact_line: '',
    contact_facebook: '',
    customer_gender: '',          // ★ เพศ (Group 3)
    // customer_age ลบออกแล้ว (ฝ่ายขายไม่จำเป็นต้องกรอก)
    existing_debt: '',            // ★ หนี้สะสม (Group 3)
    property_type: '',
    property_type_other: '',
    loan_type_detail: '',          // ไม่ระบุเป็น default
    has_obligation: 'no',
    obligation_count: '',
    province: '',
    district: '',
    subdistrict: '',
    house_no: '',
    village_name: '',
    additional_details: '',
    location_url: '',
    deed_number: '',
    deed_type: '',
    land_area: '',
    road_access: '',        // ★ การเข้าถึงถนน: 'yes' | 'no' (ตาบอด)
    road_width: '',         // ★ ความกว้างถนน: 'lt4' | '4to6' | 'gt6'
    seizure_status: '',     // ★ สถานะการอายัด: 'none' | 'mortgaged' | 'seized'
    utility_access: '',     // ★ ระบบสาธารณูปโภค: 'yes' | 'partial' | 'no'
    flood_risk: '',         // ★ ความเสี่ยงน้ำท่วม: 'never' | 'rarely' | 'often'
    estimated_value: '',
    interest_rate: '',
    desired_amount: '',
    occupation: '',
    monthly_income: '',
    loan_purpose: '',
    marital_status: '',   // ★ สถานะสมรส (สำหรับ checklist เอกสาร)
    contract_years: '',
    net_desired_amount: '',
    advance_months: '',   // ★ ดอกจ่ายล่วงหน้า N เดือน
    preliminary_terms: '',
    agent_id: '',
    appraisal_date: '',    // ★ วันนัดประเมิน (ฝ่ายขายดีลให้)
    appraisal_fee: '',     // ★ ค่าประเมิน (กรอกได้ทั้งฝ่ายขายและฝ่ายประเมิน)
    appraisal_type: 'outside', // ★ ฝ่ายขายเลือกประเภทประเมิน
    payment_date: '',      // ★ วันที่ชำระค่าประเมิน (ฝ่ายขายกรอก — บันทึกลง lr ก่อนมีเคส / cases หลังมีเคส)
    reject_category: '',   // ★ Reject & Feedback (ฝ่ายขายกรอก)
    reject_alternative: '',
    dead_reason: '',
    // ★ รายละเอียดสิ่งปลูกสร้าง
    bedrooms: '',
    bathrooms: '',
    floors: '',
    project_name: '',
    building_year: '',
    rental_rooms: '',
    rental_price_per_month: '',
    id_card_files: null,
    deed_files: null,
    property_files: null,
    permit_files: null,
    video_files: null,
  })

  // ★ LTV คำนวณตาม SOP
  const ltvMin = form.loan_type_detail === 'selling_pledge' ? 50 : 30
  const ltvMax = form.loan_type_detail === 'selling_pledge' ? 60 : 40
  const estimatedNum = parseFloat(String(form.estimated_value).replace(/,/g, '')) || 0
  const ltvLow = estimatedNum > 0 ? Math.round(estimatedNum * ltvMin / 100) : 0
  const ltvHigh = estimatedNum > 0 ? Math.round(estimatedNum * ltvMax / 100) : 0
  const fmt = (n) => n > 0 ? n.toLocaleString('th-TH') : '-'

  // ★ คำนวณการเงิน (Financial Calculator)
  const desiredNum = parseFloat(String(form.desired_amount).replace(/,/g, '')) || 0
  const rateNum = parseFloat(form.interest_rate) || 0
  const yearsNum = parseFloat(form.contract_years) || 0
  const monthsTotal = yearsNum * 12
  const advanceMonthsNum = parseInt(form.advance_months) || 0
  const monthlyInterest = desiredNum > 0 && rateNum > 0 ? Math.round(desiredNum * rateNum / 100) : 0
  const totalInterest = monthlyInterest * monthsTotal
  const advanceInterestPaid = monthlyInterest * advanceMonthsNum  // ดอกที่จ่ายล่วงหน้าไปแล้ว
  // ★ ค่าสินไถ่ = เงินต้น + ดอกรวม - ดอกล่วงหน้าที่จ่ายไปแล้ว
  const redemptionValue = desiredNum > 0 && rateNum > 0 && monthsTotal > 0
    ? Math.round(desiredNum + totalInterest - advanceInterestPaid)
    : 0
  const actualLtvPct = estimatedNum > 0 && desiredNum > 0
    ? Math.round((desiredNum / estimatedNum) * 100 * 10) / 10
    : null
  const ltvPass = actualLtvPct !== null && actualLtvPct <= ltvMax

  // ★ เกณฑ์คัดทรัพย์ — บางเกณฑ์คำนวณอัตโนมัติ บางเกณฑ์ฝ่ายขายติ๊กเอง
  const AGRI_TYPES = ['agri', 'farm', 'rice_field', 'orchard', 'swamp']
  const propTypeVal = form.property_type === 'other' ? form.property_type_other : form.property_type
  const SCREEN_CRITERIA = [
    { key: 'deed',          label: 'ประเภทโฉนด',                     hint: 'รับเฉพาะ โฉนดที่ดิน (น.ส.4จ.) และ น.ส.4ก. เท่านั้น' },
    { key: 'property_type', label: 'ประเภทอสังหาฯ',                  hint: 'ไม่รับที่ดินเกษตร สวน ไร่ หรือนา' },
    { key: 'road',          label: 'ทางเข้าออกถนน',                  hint: 'ต้องมีทางเข้าออกถนนสาธารณะ — ไม่รับที่ดินตาบอด' },
    { key: 'road_width',    label: 'ความกว้างถนน',                   hint: 'ถนนต้องกว้างอย่างน้อย 4 เมตร เพื่อให้รถบรรทุกผ่านได้' },
    { key: 'utility',       label: 'สาธารณูปโภค',                    hint: 'ต้องมีไฟฟ้าและ/หรือประปาเข้าถึงพื้นที่' },
    { key: 'flood',         label: 'ความเสี่ยงน้ำท่วม',              hint: 'ไม่รับพื้นที่ที่ถูกน้ำท่วมซ้ำซากเป็นประจำทุกปี' },
    { key: 'seizure',       label: 'สถานะการอายัด',                  hint: 'ทรัพย์ต้องไม่ถูกอายัดหรืออยู่ในกระบวนการบังคับคดี' },
    { key: 'ltv',           label: 'LTV (สัดส่วนกู้/ประเมิน ≤40%)', hint: `วงเงินกู้ต้องไม่เกิน ${ltvMax}% ของราคาประเมินทรัพย์` },
  ]
  // Auto-detection สำหรับเกณฑ์ที่คำนวณได้จากข้อมูลในฟอร์ม
  const autoFails = {
    deed:          form.deed_type       ? !isDeedOk(form.deed_type)        : null,
    property_type: propTypeVal          ? AGRI_TYPES.includes(propTypeVal) : null,
    ltv:           actualLtvPct !== null ? !ltvPass                        : null,
  }
  // ค่า effective: manual override ก่อน ถ้าไม่มีใช้ auto ถ้าไม่มีทั้งคู่ = false
  const getCheck = (key) => key in manualFailChecks ? manualFailChecks[key] : (autoFails[key] ?? false)
  const failedChecks = SCREEN_CRITERIA.filter(c => getCheck(c.key))
  const screenOverall = failedChecks.length > 0 ? 'fail' : null

  // โหลดรายการนายหน้า
  useEffect(() => {
    fetch(`${API}/agents`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setAgents(d.agents) })
      .catch(() => { })
  }, [])

  // ★ Auto-tick screening checkboxes เมื่อข้อมูลที่คำนวณได้เปลี่ยน
  useEffect(() => {
    setManualFailChecks(prev => {
      const next = { ...prev }
      // โฉนด
      if (form.deed_type) next.deed = !isDeedOk(form.deed_type)
      // ประเภทอสังหาฯ
      const ptv = form.property_type === 'other' ? form.property_type_other : form.property_type
      if (ptv) next.property_type = ['agri','farm','rice_field','orchard','swamp'].includes(ptv)
      // LTV
      const estN = parseFloat(String(form.estimated_value).replace(/,/g,'')) || 0
      const desN = parseFloat(String(form.desired_amount).replace(/,/g,'')) || 0
      const maxL = form.loan_type_detail === 'selling_pledge' ? 60 : 40
      if (estN > 0 && desN > 0) next.ltv = Math.round((desN/estN)*1000)/10 > maxL
      return next
    })
  }, [form.deed_type, form.property_type, form.property_type_other, form.estimated_value, form.desired_amount, form.loan_type_detail])

  // ★ Socket.io — รับ deed_ocr_result แล้วอัพเดทฟิลด์ทรัพย์อัตโนมัติ
  useEffect(() => {
    if (!isEdit || !id) return // เฉพาะ edit mode ที่รู้ loan_request_id

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    const socket = io(backendUrl, {
      auth: { token: token() },
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    // ฟังก์ชัน helper ใช้ร่วมกันทั้ง deed และ document
    const stripProv = (v) => v ? v.replace(/^จังหวัด/, '').replace(/^จ\./, '').trim() : v
    const stripAmph = (v) => v ? v.replace(/^อำเภอ/, '').replace(/^เขต/, '').replace(/^อ\./, '').trim() : v
    const stripTamb = (v) => v ? v.replace(/^ตำบล/, '').replace(/^แขวง/, '').replace(/^ต\./, '').trim() : v

    const applyOcrFields = (fieldMap) => {
      setForm(prev => {
        const updated = { ...prev }
        const filled = []
        Object.entries(fieldMap).forEach(([key, rawVal]) => {
          if (!rawVal || prev[key]) return
          const normalize = key === 'province' ? stripProv : key === 'district' ? stripAmph : key === 'subdistrict' ? stripTamb : null
          const val = normalize ? normalize(rawVal) : rawVal
          if (val) { updated[key] = val; filled.push(key) }
        })
        if (filled.length > 0) {
          setOcrFlash(filled)
          setTimeout(() => setOcrFlash(null), 5000)
        }
        return updated
      })
    }

    // ── โฉนด ──
    socket.on('deed_ocr_result', (data) => {
      if (String(data.loan_request_id) !== String(id)) return
      const uf = data.updated_fields || {}
      const dd = data.deed_data || {}
      applyOcrFields({
        province:    uf.province    || dd.province,
        district:    uf.district    || dd.amphoe,
        subdistrict: uf.subdistrict || dd.tambon,
        deed_number: uf.deed_number || dd.deed_number,
        land_area:   uf.land_area   || dd.land_area,
        deed_type:   uf.deed_type   || null,
      })
    })

    // ── เอกสารทั่วไป (บัตรประชาชน, สลิป, ทะเบียนบ้าน ฯลฯ) ──
    socket.on('document_ocr_result', (data) => {
      if (String(data.loan_request_id) !== String(id)) return
      const uf = data.updated_fields || {}
      const dd = data.doc_data || {}
      applyOcrFields({
        contact_name:  uf.contact_name  || dd.full_name,
        occupation:    uf.occupation    || dd.occupation,
        monthly_income:uf.monthly_income|| dd.monthly_income,
        province:      uf.province      || dd.province,
        district:      uf.district      || dd.amphoe,
        subdistrict:   uf.subdistrict   || dd.tambon,
        deed_number:   uf.deed_number   || dd.deed_number,
        land_area:     uf.land_area     || dd.land_area,
        deed_type:     uf.deed_type     || null,
      })
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [isEdit, id])

  // ★ Manual OCR — อัปโหลดภาพแล้วอ่านข้อมูลกลับมาใส่ฟอร์มอัตโนมัติ
  const handleManualOcr = async (file, docType) => {
    if (!file) return
    setOcrLoading(true)
    setOcrMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', docType)
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Server error ${res.status}: ${errText.substring(0, 200)}`)
      }
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'OCR ล้มเหลว' + (data.raw_text ? ` | raw: ${data.raw_text.substring(0, 100)}` : ''))

      const ex = data.extracted || {}
      console.log('[OCR] extracted:', JSON.stringify(ex).substring(0, 500))
      const filled = []

      // Map ผลลัพธ์เข้า form — เขียนทับค่าเดิมเสมอ (user กด OCR = ต้องการข้อมูลจากเอกสาร)
      setForm(prev => {
        const next = { ...prev }
        // ★ ocrFill: เขียนทับเสมอ ไม่ว่าช่องจะมีค่าอยู่แล้วหรือไม่
        const ocrFill = (key, val) => {
          if (val) { next[key] = String(val); filled.push(key) }
        }

        // ─── Normalize province: ตัด prefix + จับคู่กับ option ───
        const normalizeProvince = (raw) => {
          if (!raw) return null
          const stripped = String(raw)
            .replace(/^จังหวัด/, '').replace(/^จ\./, '').trim()
          if (provinces.includes(stripped)) return stripped
          const lower = stripped.toLowerCase()
          return provinces.find(p => p.toLowerCase() === lower) || stripped
        }

        // ─── Map deed_type text → code ──────────────────────────
        const normalizeDeedType = (raw) => {
          if (!raw) return null
          const t = String(raw).toLowerCase().replace(/\s/g, '')
          if (t.includes('น.ส.4จ') || t.includes('นส.4จ') || t.includes('4จ')) return 'chanote'
          if (t.includes('น.ส.4ก') || t.includes('นส.4ก') || t.includes('4ก')) return 'ns4k'
          if (t.includes('น.ส.4') || t.includes('นส.4') || t.includes('ns4') || t.includes('โฉนด') || t.includes('chanote')) return 'chanote'
          if (t.includes('น.ส.3ก') || t.includes('นส.3ก') || t.includes('3ก')) return 'ns3k'
          if (t.includes('น.ส.3') || t.includes('นส.3') || t.includes('ns3')) return 'ns3'
          if (t.includes('ส.ป.ก') || t.includes('สปก') || t.includes('spk')) return 'spk'
          return null
        }

        if (docType === 'id_card') {
          ocrFill('contact_name', ex.full_name)
          if (ex.id_number) { next.id_number = ex.id_number; filled.push('id_number') }
        }
        if (docType === 'land_deed') {
          ocrFill('deed_number',  ex.deed_number)
          // deed_type → code
          const deedTypeCode = normalizeDeedType(ex.deed_type)
          if (deedTypeCode) { next.deed_type = deedTypeCode; filled.push('deed_type') }
          // province → match select option
          const provVal = normalizeProvince(ex.province)
          if (provVal) { next.province = provVal; filled.push('province') }
          ocrFill('district',     ex.district    ? String(ex.district).replace(/^อำเภอ|^เขต|^อ\./, '').trim() : null)
          ocrFill('subdistrict',  (() => { const v = ex.subdistrict || ex.sub_district; return v ? String(v).replace(/^ตำบล|^แขวง|^ต\./, '').trim() : null })())
          ocrFill('house_no',     ex.house_no)
          // เจ้าของโฉนด → ชื่อผู้ติดต่อ
          ocrFill('contact_name', ex.owner_name)
          // หมู่ที่ + ถนน → ชื่อหมู่บ้าน
          const villageHints = [ex.moo && `หมู่ ${ex.moo}`, ex.road && `ถนน${ex.road}`].filter(Boolean).join(' ')
          if (villageHints) { next.village_name = villageHints; filled.push('village_name') }
          // พื้นที่
          if (ex.area) {
            const areaStr = [ex.area.rai && `${ex.area.rai} ไร่`, ex.area.ngan && `${ex.area.ngan} งาน`, ex.area.wa && `${ex.area.wa} ตร.ว.`].filter(Boolean).join(' ')
            ocrFill('land_area', areaStr)
          }
        }
        if (docType === 'salary_slip') {
          ocrFill('monthly_income', ex.monthly_income ? String(ex.monthly_income) : null)
          ocrFill('occupation',    ex.employee_name ? 'พนักงาน' : null)
        }
        if (docType === 'chat') {
          // ชื่อในแชท → contact_name (ถ้ายังไม่มี) หรือเขียนทับ
          ocrFill('contact_name',     ex.display_name)
          // LINE ID → contact_line
          if (ex.line_id) ocrFill('contact_line', ex.line_id)
          else if (ex.platform === 'line' && ex.display_name) ocrFill('contact_line', ex.display_name)
          // Facebook name → contact_facebook
          if (ex.facebook_name) ocrFill('contact_facebook', ex.facebook_name)
          else if (ex.platform === 'facebook' && ex.display_name) ocrFill('contact_facebook', ex.display_name)
          // เบอร์โทร
          if (ex.phone) ocrFill('contact_phone', ex.phone.replace(/[^\d]/g, ''))
        }
        if (docType === 'general') {
          // ส่ง raw text กลับเฉยๆ
        }
        return next
      })

      const conf = data.confidence ? ` (ความแม่น ${data.confidence}%)` : ''
      setOcrMsg({
        type: filled.length > 0 ? 'success' : 'warn',
        text: filled.length > 0
          ? `✅ OCR เติม ${filled.length} ช่อง${conf}`
          : `⚠️ OCR อ่านได้ แต่ไม่มีข้อมูลใหม่${conf}`,
        filled
      })
      if (filled.length > 0) {
        setOcrFlash(filled)
        setTimeout(() => setOcrFlash(null), 5000)
      }

      // ★ Auto-geocode: ถ้า OCR เติมจังหวัด/อำเภอได้ และยังไม่มี location → หาพิกัด GPS อัตโนมัติ
      if (docType === 'land_deed' && !form.location_url) {
        const prov = ex.province || form.province
        const dist = ex.district || form.district
        const sub  = ex.subdistrict || ex.sub_district || form.subdistrict
        if (prov || dist) {
          // geocode แบบ async (ไม่ block OCR message)
          setTimeout(async () => {
            setOcrMsg(prev => ({ ...prev, text: (prev?.text || '') + ' — กำลังค้นหาพิกัด GPS...' }))
            const coords = await geocodeAddress(prov, dist, sub)
            if (coords) {
              const mapsUrl = `https://www.google.com/maps/@${coords.lat},${coords.lng},16z`
              set('location_url', mapsUrl)
              setOcrMsg({ type: 'success', text: `✅ OCR เติม ${filled.length} ช่อง + พบพิกัด GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` })
            }
          }, 500)
        }
      }
    } catch (err) {
      setOcrMsg({ type: 'error', text: `❌ ${err.message}` })
    } finally {
      setOcrLoading(false)
      setTimeout(() => setOcrMsg(null), 6000)
    }
  }

  // ★ อ่าน agent_id + type จาก URL param (เช่น /sales/new?type=mortgage&agent_id=5)
  useEffect(() => {
    if (!isEdit) {
      const urlAgentId = searchParams.get('agent_id')
      const urlType = searchParams.get('type')
      const updates = {}
      if (urlAgentId) updates.agent_id = urlAgentId
      if (urlType && ['mortgage', 'selling_pledge'].includes(urlType)) updates.loan_type_detail = urlType
      if (Object.keys(updates).length > 0) setForm(prev => ({ ...prev, ...updates }))
    }
  }, [isEdit, searchParams])

  // ★ เมื่อ agent_id เปลี่ยน → หาข้อมูลนายหน้าแสดง
  useEffect(() => {
    if (form.agent_id && agents.length > 0) {
      var found = agents.find(a => String(a.id) === String(form.agent_id))
      setSelectedAgent(found || null)
    } else {
      setSelectedAgent(null)
    }
  }, [form.agent_id, agents])

  // โหลดข้อมูลลูกหนี้ (edit mode)
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    fetch(`${API}/debtors/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.debtor) {
          const debtor = d.debtor
          const knownTypes = propertyTypes.map(t => t.value)
          const isOtherType = debtor.property_type && !knownTypes.includes(debtor.property_type)
          setForm({
            lead_source: debtor.lead_source || '',          // ★
            dead_reason: debtor.dead_reason || '',          // ★
            reject_category: debtor.reject_category || '',  // ★
            reject_alternative: debtor.reject_alternative || '', // ★
            contact_name: debtor.contact_name || '',
            contact_phone: debtor.contact_phone || '',
            contact_email: debtor.contact_email || '',
            contact_line: debtor.contact_line || '',
            contact_facebook: debtor.contact_facebook || '',
            customer_gender: debtor.customer_gender || '',  // ★
            // customer_age ไม่โหลดแล้ว
            existing_debt: debtor.existing_debt || '',      // ★
            property_type: isOtherType ? 'other' : (debtor.property_type || ''),
            property_type_other: isOtherType ? debtor.property_type : '',
            has_obligation: debtor.has_obligation || 'no',
            obligation_count: debtor.obligation_count || '',
            province: debtor.province || '',
            district: debtor.district || '',
            subdistrict: debtor.subdistrict || '',
            house_no: debtor.house_no || '',
            village_name: debtor.village_name || '',
            additional_details: debtor.additional_details || '',
            location_url: debtor.location_url || '',
            deed_number: debtor.deed_number || '',
            deed_type: debtor.deed_type || '',
            land_area: debtor.land_area || '',
            road_access: debtor.road_access || '',
            road_width: debtor.road_width || '',
            seizure_status: debtor.seizure_status || '',
            utility_access: debtor.utility_access || '',
            flood_risk: debtor.flood_risk || '',
            estimated_value: debtor.estimated_value || '',
            interest_rate: debtor.interest_rate || '',
            desired_amount: debtor.desired_amount || '',
            occupation: debtor.occupation || '',
            monthly_income: debtor.monthly_income || '',
            loan_purpose: debtor.loan_purpose || '',
            marital_status: debtor.marital_status || '',   // ★
            contract_years: debtor.contract_years || '',
            net_desired_amount: debtor.net_desired_amount || '',
            advance_months: debtor.advance_months || '',         // ★
            loan_type_detail: debtor.loan_type_detail || '',
            preliminary_terms: debtor.preliminary_terms || '',
            agent_id: debtor.agent_id || '',
            appraisal_date: debtor.appraisal_date ? String(debtor.appraisal_date).slice(0, 10) : '',
            appraisal_fee: debtor.appraisal_fee || '',
            appraisal_type: debtor.appraisal_type || 'outside',
            payment_date: debtor.payment_date ? String(debtor.payment_date).slice(0, 10) : '',
            bedrooms: debtor.bedrooms != null ? String(debtor.bedrooms) : '',
            bathrooms: debtor.bathrooms != null ? String(debtor.bathrooms) : '',
            floors: debtor.floors != null ? String(debtor.floors) : '',
            project_name: debtor.project_name || '',
            building_year: debtor.building_year ? String(debtor.building_year) : '',
            rental_rooms: debtor.rental_rooms != null ? String(debtor.rental_rooms) : '',
            rental_price_per_month: debtor.rental_price_per_month != null ? String(debtor.rental_price_per_month) : '',
            id_card_files: null, deed_files: null, property_files: null, permit_files: null, video_files: null,
          })
          try { setExistingImages(JSON.parse(debtor.images) || []) } catch { setExistingImages([]) }
          try { setExistingDeedImages(JSON.parse(debtor.deed_images) || []) } catch { setExistingDeedImages([]) }
          // โหลดผลคัดทรัพย์เดิม (ถ้าเคยบันทึกไว้แล้ว)
          if (debtor.ineligible_reason) {
            const savedReasons = debtor.ineligible_reason.split(', ')
            const checks = {}
            ;['deed','property_type','road','road_width','utility','flood','seizure','ltv'].forEach((key, i) => {
              const labels = ['ประเภทโฉนด','ประเภทอสังหาฯ','ทางเข้าออกถนน','ความกว้างถนน','สาธารณูปโภค','ความเสี่ยงน้ำท่วม','สถานะการอายัด','LTV (สัดส่วนกู้/ประเมิน ≤40%)']
              if (savedReasons.includes(labels[i])) checks[key] = true
            })
            setManualFailChecks(checks)
          }

          // ★ แสดงข้อมูลนายหน้าที่ผูกอยู่ (จาก API response)
          if (debtor.agent_id && debtor.agent_name) {
            setSelectedAgent({
              id: debtor.agent_id,
              full_name: debtor.agent_name,
              phone: debtor.agent_phone,
              agent_code: debtor.agent_code,
              nickname: debtor.agent_nickname,
              commission_rate: debtor.commission_rate,
            })
          }

          // ★ โหลด prop_checklist_json
          try {
            const pcj = debtor.prop_checklist_json
            setPropChecklist(pcj ? JSON.parse(pcj) : {})
          } catch { setPropChecklist({}) }

          // เก็บ linked_cases
          if (d.linked_cases) setLinkedCases(d.linked_cases)

          // เก็บข้อมูลประเมิน+อนุมัติ (ไม่จำเป็นต้องมีเคส — ข้อมูลอยู่ใน loan_requests)
          setCaseInfo({
            case_id: debtor.case_id || null,
            status: debtor.case_status || 'new',
            payment_status: debtor.payment_status || 'unpaid',
            credit_table_file: debtor.credit_table_file || null,
            appraisal_book_image: debtor.appraisal_book_image || null,
            appraisal_result: debtor.appraisal_result || null,
            appraisal_type: debtor.appraisal_type || null,
            check_price_value: debtor.check_price_value || null,
            check_price_detail: debtor.check_price_detail || null,
            check_price_recorded_at: debtor.check_price_recorded_at || null,
            outside_result: debtor.outside_result || null,
            outside_reason: debtor.outside_reason || null,
            inside_result: debtor.inside_result || null,
            inside_reason: debtor.inside_reason || null,
            appraisal_note: debtor.appraisal_note || null,
            appraisal_date: debtor.appraisal_date || null,
            appraisal_fee: debtor.appraisal_fee || '',
            approved_credit: debtor.approved_credit || null,
            approval_status: debtor.approval_status || null,
            interest_per_year: debtor.interest_per_year || null,
            operation_fee: debtor.operation_fee || null,
            appraisal_images: debtor.appraisal_images || null,
            // ★ ค่าประเมิน + สัญญานายหน้า
            slip_image: debtor.slip_image || null,       // ก่อนมีเคส (loan_requests.slip_image)
            case_slip_image: debtor.case_slip_image || null,  // หลังมีเคส (cases.slip_image)
            broker_contract_signed: debtor.broker_contract_signed || 0,
            broker_contract_date: debtor.broker_contract_date || null,
            broker_contract_file: debtor.broker_contract_file || null,
            // ★ ส่งสัญญาทางอีเมล (loan_requests)
            broker_contract_sent_at: debtor.broker_contract_sent_at || null,
            broker_contract_email: debtor.broker_contract_email || null,
            broker_contract_signed_at: debtor.broker_contract_signed_at || null,
            payment_schedule_file: debtor.payment_schedule_file || null,
            payment_schedule_approved: Number(debtor.payment_schedule_approved ?? 0),
            payment_schedule_approved_at: debtor.payment_schedule_approved_at || null,
            approval_schedule_file: debtor.approval_schedule_file || null,
            // ★ เอกสารจากฝ่ายออกสัญญา (read-only)
            issuing_broker_contract: debtor.issuing_broker_contract || null,
            issuing_broker_id: debtor.issuing_broker_id || null,
            issuing_doc_selling_pledge: debtor.issuing_doc_selling_pledge || null,
            issuing_doc_mortgage: debtor.issuing_doc_mortgage || null,
            issuing_doc_sp_broker: debtor.issuing_doc_sp_broker || null,
            issuing_doc_sp_appendix: debtor.issuing_doc_sp_appendix || null,
            issuing_doc_sp_notice: debtor.issuing_doc_sp_notice || null,
            issuing_doc_mg_addendum: debtor.issuing_doc_mg_addendum || null,
            issuing_doc_mg_appendix: debtor.issuing_doc_mg_appendix || null,
            issuing_doc_mg_broker: debtor.issuing_doc_mg_broker || null,
          })
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [id, isEdit])

  // ★ โหลดรายชื่อเซลล์ทั้งหมด (สำหรับ Transfer Case dropdown)
  useEffect(() => {
    if (!isEdit) return
    fetch(`${API}/sales-users`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setSalesUsers(d.sales_users || []) })
      .catch(() => {})
  }, [isEdit])

  // ★ โหลดประวัติการโอนเคส
  useEffect(() => {
    if (!isEdit || !caseInfo?.case_id) return
    fetch(`${API}/cases/${caseInfo.case_id}/transfer-log`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setTransferLogs(d.logs || []) })
      .catch(() => {})
  }, [isEdit, caseInfo?.case_id])

  // ★ โหลด Advance Price Requests + Follow-ups ของเคสนี้
  useEffect(() => {
    if (!isEdit || !caseInfo?.case_id) return
    const h = { Authorization: `Bearer ${token()}` }
    fetch(`${API}/cases/${caseInfo.case_id}/advance-requests`, { headers: h })
      .then(r => r.json()).then(d => { if (d.success) setAdvanceRequests(d.data || []) }).catch(() => {})
    fetch(`${API}/cases/${caseInfo.case_id}/followups`, { headers: h })
      .then(r => r.json()).then(d => { if (d.success) setFollowups(d.data || []) }).catch(() => {})
    fetch(`${API}/cases/${caseInfo.case_id}/appointments`, { headers: h })
      .then(r => r.json()).then(d => { if (d.success) setAppointments(d.data || []) }).catch(() => {})
  }, [isEdit, caseInfo?.case_id])

  // ★ โหลด checklistDocs + maritalTicks ทั้ง view และ edit mode
  useEffect(() => {
    if (!id) return
    fetch(`${API}/debtors/${id}/checklist-docs`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setChecklistDocs(d.docs || {}) })
      .catch(() => {})
    fetch(`${API}/debtors/${id}/checklist-ticks`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setMaritalTicks(d.ticks || {}) })
      .catch(() => {})
  }, [id])

  // ★ อัพโหลดเอกสาร checklist (auto-tick เมื่ออัพโหลดสำเร็จ)
  const handleChecklistUpload = async (field, files) => {
    if (!isEdit || !id || !files?.length) return
    setUploadingChecklistDoc(field)
    try {
      const fd = new FormData()
      for (const f of Array.from(files)) fd.append(field, f)
      const res = await fetch(`${API}/debtors/${id}/checklist-docs`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd
      })
      const data = await res.json()
      if (data.success) {
        setChecklistDocs(prev => ({ ...prev, [data.field]: data.paths }))
        // ★ Auto-tick property checklist เมื่ออัพโหลดสำเร็จ
        if (!propChecklist[field]) {
          const newPropState = { ...propChecklist, [field]: true }
          setPropChecklist(newPropState)
          fetch(`${API}/debtors/${id}/prop-checklist`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ prop_checklist_json: JSON.stringify(newPropState) })
          }).catch(() => {})
        }
        // ★ Auto-tick marital/borrower ticks เมื่ออัพโหลดสำเร็จ
        if (!maritalTicks[field]) {
          setMaritalTicks(prev => ({ ...prev, [field]: true }))
          fetch(`${API}/debtors/${id}/checklist-ticks`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ field, checked: true })
          }).catch(() => {})
        }
      }
    } catch {}
    setUploadingChecklistDoc(null)
  }

  // ★ ลบเอกสาร checklist
  const handleChecklistRemove = async (field, filePath) => {
    if (!isEdit || !id || !window.confirm('ต้องการลบไฟล์นี้?')) return
    try {
      const res = await fetch(`${API}/debtors/${id}/checklist-docs/remove`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, file_path: filePath })
      })
      const data = await res.json()
      if (data.success) setChecklistDocs(prev => ({ ...prev, [data.field]: data.paths }))
    } catch {}
  }

  // ★ โอนเคสให้เซลล์คนอื่น
  const handleTransferCase = async () => {
    if (!transferTargetId || !caseInfo?.case_id) return
    setTransferring(true)
    try {
      const res = await fetch(`${API}/cases/${caseInfo.case_id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ to_sales_id: transferTargetId, reason: transferReason })
      })
      const data = await res.json()
      if (data.success) {
        alert(`✅ ${data.message}`)
        setShowTransferModal(false)
        setTransferTargetId('')
        setTransferReason('')
        // reload transfer log
        fetch(`${API}/cases/${caseInfo.case_id}/transfer-log`, { headers: { Authorization: `Bearer ${token()}` } })
          .then(r => r.json()).then(d => { if (d.success) setTransferLogs(d.logs || []) })
      } else {
        alert(data.message || 'โอนไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setTransferring(false)
  }

  // ★ ส่งข้อมูลให้ Advance (พี่เกต)
  const handleSendAdvanceRequest = async () => {
    if (!caseInfo?.case_id) return
    setSendingAdvance(true)
    try {
      const res = await fetch(`${API}/cases/${caseInfo.case_id}/advance-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ note: advanceNote }),
      })
      const data = await res.json()
      if (data.success) {
        alert('✅ ส่งข้อมูลให้ Advance เรียบร้อยแล้ว')
        setShowAdvanceForm(false)
        setAdvanceNote('')
        // reload
        fetch(`${API}/cases/${caseInfo.case_id}/advance-requests`, { headers: { Authorization: `Bearer ${token()}` } })
          .then(r => r.json()).then(d => { if (d.success) setAdvanceRequests(d.data || []) })
        // อัพเดท pipeline stage ใน UI
        setCaseInfo(prev => ({ ...prev, pipeline_stage: 'sent_appraisal' }))
      } else {
        alert('เกิดข้อผิดพลาด: ' + data.error)
      }
    } finally {
      setSendingAdvance(false)
    }
  }

  // ★ toggle + auto-save marital doc tick (checklist_ticks_json)
  const toggleMaritalTick = async (field) => {
    if (!id) return
    const newVal = !maritalTicks[field]
    const newTicks = { ...maritalTicks, [field]: newVal }
    if (!newVal) delete newTicks[field]
    setMaritalTicks(newTicks)
    try {
      await fetch(`${API}/debtors/${id}/checklist-ticks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ field, checked: newVal }),
      })
    } catch {}
  }

  // ★ toggle + auto-save prop_checklist_json
  const togglePropChecklist = async (key) => {
    if (!isEdit || !id) return
    const newState = { ...propChecklist, [key]: !propChecklist[key] }
    setPropChecklist(newState)
    setSavingPropChecklist(true)
    try {
      await fetch(`${API}/debtors/${id}/prop-checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ prop_checklist_json: JSON.stringify(newState) })
      })
    } catch {}
    setSavingPropChecklist(false)
  }

  // ★ บันทึกการติดตาม
  const handleSaveFollowup = async () => {
    if (!caseInfo?.case_id) return
    setSavingFollowup(true)
    try {
      const res = await fetch(`${API}/cases/${caseInfo.case_id}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ followup_type: followupType, note: followupNote, next_followup_at: followupNextAt || null }),
      })
      const data = await res.json()
      if (data.success) {
        setShowFollowupForm(false)
        setFollowupNote('')
        setFollowupType('chat')
        setFollowupNextAt('')
        // reload
        fetch(`${API}/cases/${caseInfo.case_id}/followups`, { headers: { Authorization: `Bearer ${token()}` } })
          .then(r => r.json()).then(d => { if (d.success) setFollowups(d.data || []) })
      }
    } finally {
      setSavingFollowup(false)
    }
  }

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const xBtnStyle = {
    background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%',
    width: 18, height: 18, fontSize: 9, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
    verticalAlign: 'middle', marginLeft: 6
  }

  const xBtnOverlay = {
    position: 'absolute', top: 2, right: 2, background: '#e74c3c', color: '#fff',
    border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 10,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, lineHeight: 1, zIndex: 2
  }

  const thumbWrap = {
    position: 'relative', display: 'inline-block', width: 80, height: 80,
    borderRadius: 6, overflow: 'hidden', border: '1px solid #ddd'
  }

  const thumbImg = {
    width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer'
  }

  const UPLOAD_BASE = '/uploads'

  const deleteExistingImage = async (field, imagePath) => {
    if (!window.confirm('ต้องการลบรูปนี้หรือไม่?')) return
    try {
      const res = await fetch(`${API}/remove-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ debtor_id: id, field, image_path: imagePath })
      })
      const data = await res.json()
      if (data.success) {
        if (field === 'images') setExistingImages(prev => prev.filter(p => p !== imagePath))
        else if (field === 'deed_images') setExistingDeedImages(prev => prev.filter(p => p !== imagePath))
      } else {
        alert(data.message || 'ลบไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  const updateCaseField = async (field, value) => {
    try {
      if (field === 'payment_status') {
        let res, data
        if (caseInfo?.case_id) {
          // มีเคสแล้ว → อัพเดท cases table ผ่าน debtor-master-status
          res = await fetch(`/api/admin/accounting/debtor-master-status/${caseInfo.case_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ status: value })
          })
        } else {
          // ยังไม่มีเคส → อัพเดท loan_requests.payment_status ตรงๆ
          res = await fetch(`${API}/debtors/${id}/payment-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ payment_status: value })
          })
        }
        data = await res.json()
        if (data.success) setCaseInfo(prev => ({ ...prev, payment_status: value }))
        else alert(data.message || 'อัพเดทไม่สำเร็จ')
      } else if (field === 'status') {
        const res = await fetch(`${API}/cases/${caseInfo.case_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ status: value })
        })
        const data = await res.json()
        if (data.success) setCaseInfo(prev => ({ ...prev, status: value }))
        else alert(data.message || 'อัพเดทไม่สำเร็จ')
      } else if (field === 'pipeline_stage') {
        const res = await fetch(`${API}/cases/${caseInfo.case_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ pipeline_stage: value })
        })
        const data = await res.json()
        if (data.success) setCaseInfo(prev => ({ ...prev, pipeline_stage: value }))
        else alert(data.message || 'อัพเดทไม่สำเร็จ')
      } else if (field === 'payment_date') {
        if (!caseInfo?.case_id) return // ต้องมีเคสก่อนจึงบันทึกวันชำระได้
        const res = await fetch(`${API}/cases/${caseInfo.case_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ payment_date: value || null })
        })
        const data = await res.json()
        if (data.success) setCaseInfo(prev => ({ ...prev, payment_date: value }))
        else alert(data.message || 'อัพเดทไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  // ★ อัพโหลดสลิปค่าประเมิน (รองรับหลายไฟล์)
  const handleUploadSlip = async () => {
    if (!slipFiles.length) return
    setUploadingSlip(true)
    setSlipMsg('')
    try {
      for (let i = 0; i < slipFiles.length; i++) {
        const fd = new FormData()
        fd.append('slip_image', slipFiles[i])
        let res, data
        if (caseInfo?.case_id) {
          res = await fetch(`${API}/cases/${caseInfo.case_id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token()}` },
            body: fd
          })
          data = await res.json()
          if (data.success) {
            const r2 = await fetch(`${API}/debtors/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
            const d2 = await r2.json()
            if (d2.success) setCaseInfo(prev => ({ ...prev, case_slip_image: d2.debtor?.case_slip_image || null }))
          } else {
            setSlipMsg('❌ ' + (data.message || 'อัพโหลดไม่สำเร็จ'))
            setUploadingSlip(false)
            return
          }
        } else {
          res = await fetch(`${API}/debtors/${id}/appraisal-slip`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token()}` },
            body: fd
          })
          data = await res.json()
          if (data.success) {
            setCaseInfo(prev => ({ ...prev, slip_image: data.slip_image }))
          } else {
            setSlipMsg('❌ ' + (data.message || 'อัพโหลดไม่สำเร็จ'))
            setUploadingSlip(false)
            return
          }
        }
      }
      setSlipMsg(`✅ อัพโหลดสลิปสำเร็จ ${slipFiles.length > 1 ? `(${slipFiles.length} ไฟล์)` : ''}`)
      // ★ บันทึก ref สลิปลงฐานข้อมูล (ป้องกัน duplicate)
      if (slipVerify.verifyResult?.qrData?.ref) {
        fetch('/api/admin/slip/record-ref', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({
            ref:        slipVerify.verifyResult.qrData.ref,
            amount:     slipVerify.verifyResult.qrData.amount,
            case_id:    caseInfo?.case_id || null,
            field_name: 'appraisal_slip',
          }),
        }).catch(() => {})
      }
      setSlipFiles([])
      // ★ Auto-set payment_status = 'paid' เมื่ออัพโหลดสลิปสำเร็จ
      if (caseInfo?.payment_status !== 'paid') {
        try {
          if (caseInfo?.case_id) {
            await fetch(`${API}/cases/${caseInfo.case_id}/debtor-master-status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
              body: JSON.stringify({ status: 'paid' })
            })
          } else {
            await fetch(`${API}/debtors/${id}/payment-status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
              body: JSON.stringify({ payment_status: 'paid' })
            })
          }
          setCaseInfo(prev => ({ ...prev, payment_status: 'paid' }))
        } catch { /* ignore */ }
      }
    } catch {
      setSlipMsg('❌ เกิดข้อผิดพลาด')
    } finally {
      setUploadingSlip(false)
    }
  }


  // ★ บันทึกข้อมูลสัญญาแต่งตั้งนายหน้า
  const handleSaveBrokerContract = async () => {
    if (!caseInfo?.case_id) return
    setUploadingBrokerContract(true)
    setBrokerContractMsg('')
    const fd = new FormData()
    if (brokerContractFile) fd.append('broker_contract_file', brokerContractFile)
    if (brokerIdFile) fd.append('broker_id_file', brokerIdFile)
    fd.append('broker_contract_signed', caseInfo.broker_contract_signed ? '1' : '0')
    if (caseInfo.broker_contract_date) fd.append('broker_contract_date', caseInfo.broker_contract_date)
    try {
      const res = await fetch(`${API}/cases/${caseInfo.case_id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setBrokerContractMsg('✅ บันทึกข้อมูลสัญญาสำเร็จ')
        setBrokerContractFiles([])
        setBrokerIdFiles([])
        // โหลดข้อมูลใหม่
        const r2 = await fetch(`${API}/debtors/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
        const d2 = await r2.json()
        if (d2.success) setCaseInfo(prev => ({
          ...prev,
          broker_contract_signed: d2.debtor?.broker_contract_signed || 0,
          broker_contract_date: d2.debtor?.broker_contract_date || null,
          broker_contract_file: d2.debtor?.broker_contract_file || null,
          broker_id_file: d2.debtor?.broker_id_file || null,
          issuing_broker_contract: d2.debtor?.issuing_broker_contract || null,
          issuing_broker_id: d2.debtor?.issuing_broker_id || null,
          issuing_doc_selling_pledge: d2.debtor?.issuing_doc_selling_pledge || null,
          issuing_doc_mortgage: d2.debtor?.issuing_doc_mortgage || null,
          issuing_doc_sp_broker: d2.debtor?.issuing_doc_sp_broker || null,
          issuing_doc_sp_appendix: d2.debtor?.issuing_doc_sp_appendix || null,
          issuing_doc_sp_notice: d2.debtor?.issuing_doc_sp_notice || null,
          issuing_doc_mg_addendum: d2.debtor?.issuing_doc_mg_addendum || null,
          issuing_doc_mg_appendix: d2.debtor?.issuing_doc_mg_appendix || null,
          issuing_doc_mg_broker: d2.debtor?.issuing_doc_mg_broker || null,
        }))
      } else {
        setBrokerContractMsg('❌ ' + (data.message || 'บันทึกไม่สำเร็จ'))
      }
    } catch {
      setBrokerContractMsg('❌ เกิดข้อผิดพลาด')
    } finally {
      setUploadingBrokerContract(false)
    }
  }

  // ★ บันทึกผลคัดทรัพย์ → PATCH /debtors/:id/screening
  const handleSaveScreening = async (debtorId) => {
    const targetId = debtorId || id
    if (!targetId) return
    const isIneligible = screenOverall === 'fail'
    const screening_status = screenOverall === 'fail' ? 'ineligible' : 'eligible'
    const ineligible_reason = failedChecks.map(c => c.label).join(', ')
    setSavingScreening(true)
    try {
      const res = await fetch(`${API}/debtors/${targetId}/screening`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ineligible_property: isIneligible ? 1 : 0,
          ineligible_reason: isIneligible ? ineligible_reason : null,
          screening_status,
        })
      })
      const data = await res.json()
      if (data.success) {
        // screeningConfirmed removed
        setScreeningMsg(screening_status === 'eligible'
          ? '✅ ทรัพย์ผ่านเกณฑ์ — บันทึกแล้ว'
          : screening_status === 'ineligible'
            ? '⚠️ ทรัพย์ไม่ผ่านเกณฑ์ — บันทึกแล้ว'
            : '📋 บันทึกผลคัดทรัพย์แล้ว')
      }
    } catch (_) {}
    setSavingScreening(false)
  }

  // ★ ทรัพย์ไม่เข้าเกณฑ์ → บันทึก ineligible + ส่งคำขอยกเลิกเคสอัตโนมัติ
  const handleMarkIneligibleAndCancel = async () => {
    if (!id) return
    setSavingScreening(true)
    const ineligible_reason = failedChecks.map(c => c.label).join(', ')
    // 1. บันทึก screening ineligible
    try {
      await fetch(`${API}/debtors/${id}/screening`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ineligible_property: 1, ineligible_reason, screening_status: 'ineligible' }),
      })
    } catch (_) {}
    // 2. ส่งคำขอยกเลิกเคส (ถ้ามีเคส)
    if (caseInfo?.id) {
      try {
        const lsUser = JSON.parse(localStorage.getItem('loandd_admin_user') || '{}')
        await fetch('/api/admin/cancellations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({
            case_id: caseInfo.id,
            requested_by: lsUser.id,
            reason: `ทรัพย์ไม่เข้าเกณฑ์: ${ineligible_reason}`,
          }),
        })
      } catch (_) {}
    }
    setSavingScreening(false)
    navigate('/sales')
  }

  // ★ ส่งสัญญาทางอีเมล (อัพเดท loan_requests.broker_contract_sent_at)
  const sendBrokerContractEmail = async () => {
    if (!brokerEmailInput.trim() || !id) return
    setSendingBrokerEmail(true)
    try {
      const res = await fetch(`${API}/debtors/${id}/broker-contract/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: brokerEmailInput })
      })
      const data = await res.json()
      if (data.success) {
        setShowBrokerEmailInput(false)
        setBrokerEmailInput('')
        // refresh debtor data
        const r2 = await fetch(`${API}/debtors/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
        const d2 = await r2.json()
        if (d2.success && d2.debtor) setForm(prev => ({
          ...prev,
          broker_contract_sent_at: d2.debtor.broker_contract_sent_at || null,
          broker_contract_email: d2.debtor.broker_contract_email || null,
          broker_contract_signed_at: d2.debtor.broker_contract_signed_at || null,
        }))
        setBrokerContractMsg('✅ บันทึกการส่งสัญญาแล้ว')
      } else {
        setBrokerContractMsg('❌ ' + (data.message || 'เกิดข้อผิดพลาด'))
      }
    } catch {
      setBrokerContractMsg('❌ เกิดข้อผิดพลาด')
    } finally {
      setSendingBrokerEmail(false)
    }
  }

  // ★ บันทึกว่าลูกหนี้เซ็นสัญญาแล้ว
  const markBrokerContractSignedByDebtor = async () => {
    if (!id) return
    try {
      const res = await fetch(`${API}/debtors/${id}/broker-contract/sign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (data.success) {
        const r2 = await fetch(`${API}/debtors/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
        const d2 = await r2.json()
        if (d2.success && d2.debtor) setForm(prev => ({
          ...prev,
          broker_contract_signed_at: d2.debtor.broker_contract_signed_at || null,
        }))
        setBrokerContractMsg('✅ บันทึกการเซ็นสัญญาแล้ว')
      }
    } catch { setBrokerContractMsg('❌ เกิดข้อผิดพลาด') }
  }

  const renderExistingThumbs = (paths, field) => {
    if (!paths || paths.length === 0) return null
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
        {paths.map((p, i) => {
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(p)
          const fullUrl = p.startsWith('http') ? p : `${UPLOAD_BASE}/${p.replace(/^\/?uploads\//, '')}`
          return (
            <div key={`${field}-${i}`} style={thumbWrap}>
              {isImage ? (
                <img src={fullUrl} alt="" style={thumbImg} onClick={() => window.open(fullUrl, '_blank')} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', cursor: 'pointer', fontSize: 11, color: '#666', textAlign: 'center', padding: 4 }}
                  onClick={() => window.open(fullUrl, '_blank')}>
                  <div><i className="fas fa-file" style={{ fontSize: 20, color: '#999' }}></i><br />{p.split('/').pop().substring(0, 12)}</div>
                </div>
              )}
              <button type="button" style={xBtnOverlay} onClick={() => deleteExistingImage(field, p)} title="ลบรูปนี้">
                <i className="fas fa-times"></i>
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  const validate = () => {
    const err = {}
    // ไม่บังคับกรอกช่องใดๆ — ลูกหนี้ให้ข้อมูลไม่ครบเป็นเรื่องปกติ
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      if (form.lead_source) formData.append('lead_source', form.lead_source)   // ★
      if (form.dead_reason) formData.append('dead_reason', form.dead_reason)   // ★
      if (form.reject_category) formData.append('reject_category', form.reject_category)  // ★
      if (form.reject_alternative) formData.append('reject_alternative', form.reject_alternative) // ★
      // แจ้งเตือนอัตโนมัติเมื่อบันทึกเหตุผลปฏิเสธใหม่ (สำหรับ edit mode)
      if (isEdit && form.reject_category) formData.append('notify_rejected', '1')
      if (form.customer_gender) formData.append('customer_gender', form.customer_gender) // ★
      // customer_age ลบออกแล้ว
      if (form.existing_debt) formData.append('existing_debt', form.existing_debt)      // ★
      formData.append('contact_name', form.contact_name)
      formData.append('contact_phone', form.contact_phone)
      if (form.contact_email) formData.append('contact_email', form.contact_email)
      if (form.contact_line) formData.append('contact_line', form.contact_line)
      if (form.contact_facebook) formData.append('contact_facebook', form.contact_facebook)
      formData.append('property_type', form.property_type === 'other' ? form.property_type_other : form.property_type)
      formData.append('has_obligation', form.has_obligation)
      if (form.obligation_count) formData.append('obligation_count', form.obligation_count)
      if (form.province) formData.append('province', form.province)
      if (form.district) formData.append('district', form.district)
      if (form.subdistrict) formData.append('subdistrict', form.subdistrict)
      if (form.house_no) formData.append('house_no', form.house_no)
      if (form.village_name) formData.append('village_name', form.village_name)
      if (form.additional_details) formData.append('additional_details', form.additional_details)
      if (form.location_url) formData.append('location_url', form.location_url)
      if (form.deed_number) formData.append('deed_number', form.deed_number)
      if (form.deed_type) formData.append('deed_type', form.deed_type)
      if (form.land_area) formData.append('land_area', form.land_area)
      if (form.road_access) formData.append('road_access', form.road_access)
      if (form.road_width) formData.append('road_width', form.road_width)
      if (form.seizure_status) formData.append('seizure_status', form.seizure_status)
      if (form.utility_access) formData.append('utility_access', form.utility_access)
      if (form.flood_risk) formData.append('flood_risk', form.flood_risk)
      if (form.estimated_value) formData.append('estimated_value', form.estimated_value)
      if (form.interest_rate) formData.append('interest_rate', form.interest_rate)
      if (form.desired_amount) formData.append('desired_amount', form.desired_amount)
      if (form.loan_type_detail) formData.append('loan_type_detail', form.loan_type_detail)
      if (form.occupation) formData.append('occupation', form.occupation)
      if (form.monthly_income) formData.append('monthly_income', form.monthly_income)
      if (form.loan_purpose) formData.append('loan_purpose', form.loan_purpose)
      if (form.marital_status) formData.append('marital_status', form.marital_status)  // ★
      if (form.contract_years) formData.append('contract_years', form.contract_years)
      if (form.advance_months) formData.append('advance_months', form.advance_months)  // ★ ดอกล่วงหน้า
      if (form.net_desired_amount) formData.append('net_desired_amount', form.net_desired_amount)
      if (form.preliminary_terms) formData.append('preliminary_terms', form.preliminary_terms)
      if (form.agent_id) formData.append('agent_id', form.agent_id)
      formData.append('appraisal_date', form.appraisal_date || '')   // ★ ส่งเสมอ ไม่ให้ SQL overwrite เป็น null
      formData.append('appraisal_fee', form.appraisal_fee || '')     // ★ ส่งเสมอ
      formData.append('appraisal_type', form.appraisal_type || 'outside') // ★ ฝ่ายขายเลือกประเภทประเมิน
      formData.append('payment_date', form.payment_date || '')       // ★ บันทึกลง lr.payment_date (column มีอยู่แล้ว)
      if (Object.keys(propChecklist).length > 0) formData.append('prop_checklist_json', JSON.stringify(propChecklist))
      // ★ รายละเอียดสิ่งปลูกสร้าง
      if (form.bedrooms) formData.append('bedrooms', form.bedrooms)
      if (form.bathrooms) formData.append('bathrooms', form.bathrooms)
      if (form.floors) formData.append('floors', form.floors)
      if (form.project_name) formData.append('project_name', form.project_name)
      if (form.building_year) formData.append('building_year', form.building_year)
      if (form.rental_rooms) formData.append('rental_rooms', form.rental_rooms)
      if (form.rental_price_per_month) formData.append('rental_price_per_month', form.rental_price_per_month)
      formData.append('notify_appraisal', notifyAppraisal ? '1' : '0') // ★
      formData.append('notify_approval', notifyApproval ? '1' : '0')   // ★
      formData.append('notify_legal', notifyLegal ? '1' : '0')         // ★

      if (form.id_card_files) { for (const f of form.id_card_files) formData.append('id_card_image', f) }
      if (form.deed_files) { for (const f of form.deed_files) formData.append('deed_image', f) }
      if (form.property_files) { for (const f of form.property_files) formData.append('property_image', f) }
      if (form.permit_files) { for (const f of form.permit_files) formData.append('building_permit', f) }
      if (form.video_files) { for (const f of form.video_files) formData.append('property_video', f) }
      if (slipFiles.length > 0) formData.append('slip_image', slipFiles[0])

      const url = isEdit ? `${API}/debtors/${id}` : `${API}/debtors`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token()}` }, body: formData })
      const data = await res.json()
      if (data.success) {
        // ★ ถ้าเคยเปิด popup คัดทรัพย์ (มีการตรวจสอบ) → บันทึกผลอัตโนมัติหลัง create
        if (!isEdit && data.id && screenOverall !== null) {
          await handleSaveScreening(data.id)
        }
        setSuccess(true)
        setTimeout(() => navigate(-1), 800)
      } else setErrors({ submit: data.message || 'เกิดข้อผิดพลาด' })
    } catch {
      setErrors({ submit: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' })
    }
    setSubmitting(false)
  }

  const existingCount = existingImages.length + existingDeedImages.length

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
        <p style={{ marginTop: 12, color: '#888' }}>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '8px 16px' }}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          <i className="fas fa-user-plus" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
          {isEdit ? 'แก้ไขข้อมูลลูกหนี้' : 'เพิ่มลูกหนี้ใหม่'}
        </h2>
      </div>

      {errors.submit && <div className="error-msg" style={{ marginBottom: 16 }}>{errors.submit}</div>}
      {success && (
        <div className="success-msg" style={{ marginBottom: 16 }}>
          <i className="fas fa-check-circle"></i> {isEdit ? 'อัพเดทข้อมูลสำเร็จ!' : 'บันทึกลูกหนี้สำเร็จ!'} ข้อมูลของ <strong>{form.contact_name}</strong> ถูก{isEdit ? 'อัพเดท' : 'บันทึก'}เรียบร้อยแล้ว กำลังกลับหน้าหลัก...
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ===== ซ้าย: ข้อมูลเจ้าของทรัพย์ ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
                <i className="fas fa-user" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                ข้อมูลเจ้าของทรัพย์
              </h3>

              {/* ===== ประเภทสัญญา — dropdown โดดเด่นที่ต้นฟอร์ม ===== */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 8 }}>
                  ประเภทสัญญา <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { value: 'mortgage', label: 'จำนอง', icon: 'fa-home', color: '#1565c0', bg: '#e3f2fd' },
                    { value: 'selling_pledge', label: 'ขายฝาก', icon: 'fa-file-signature', color: '#6a1b9a', bg: '#f3e5f5' },
                    { value: '', label: 'ไม่ระบุ', icon: 'fa-question-circle', color: '#888', bg: '#f5f5f5' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('loan_type_detail', opt.value)}
                      style={{
                        flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${form.loan_type_detail === opt.value ? opt.color : '#e0e0e0'}`,
                        background: form.loan_type_detail === opt.value ? opt.bg : '#fff',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s',
                        boxShadow: form.loan_type_detail === opt.value ? `0 2px 8px ${opt.color}30` : 'none',
                      }}
                    >
                      <i className={`fas ${opt.icon}`} style={{ fontSize: 20, color: form.loan_type_detail === opt.value ? opt.color : '#bbb' }}></i>
                      <span style={{ fontSize: 13, fontWeight: form.loan_type_detail === opt.value ? 700 : 500, color: form.loan_type_detail === opt.value ? opt.color : '#888' }}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>


              {/* ★ OCR แชท LINE/Facebook → กรอก contact อัตโนมัติ */}
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  <i className="fas fa-magic" style={{ marginRight: 4, color: '#7c3aed' }}></i>
                  สแกนจากแชท:
                </span>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, cursor: ocrLoading ? 'default' : 'pointer',
                  background: ocrLoading ? '#e5e7eb' : 'linear-gradient(135deg,#00C300,#00a000)',
                  color: ocrLoading ? '#888' : '#fff', fontSize: 11, fontWeight: 700,
                  padding: '4px 12px', borderRadius: 20, userSelect: 'none',
                  pointerEvents: ocrLoading ? 'none' : 'auto'
                }}>
                  <i className="fab fa-line"></i> LINE
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) handleManualOcr(e.target.files[0], 'chat'); e.target.value = '' }} />
                </label>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, cursor: ocrLoading ? 'default' : 'pointer',
                  background: ocrLoading ? '#e5e7eb' : 'linear-gradient(135deg,#1877F2,#0f5bbf)',
                  color: ocrLoading ? '#888' : '#fff', fontSize: 11, fontWeight: 700,
                  padding: '4px 12px', borderRadius: 20, userSelect: 'none',
                  pointerEvents: ocrLoading ? 'none' : 'auto'
                }}>
                  <i className="fab fa-facebook"></i> Facebook
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) handleManualOcr(e.target.files[0], 'chat'); e.target.value = '' }} />
                </label>
                {ocrLoading && <span style={{ fontSize: 11, color: '#7c3aed' }}><i className="fas fa-spinner fa-spin"></i> กำลังอ่าน...</span>}
                {ocrMsg && (
                  <span style={{ fontSize: 11, color: ocrMsg.type === 'success' ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
                    {ocrMsg.text}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ชื่อ-สกุล</label>
                  <input type="text" placeholder="เช่น น้าใส อิมตอนทอง" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>เบอร์โทร</label>
                  <input type="tel" placeholder="098-123-1234" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                <div className="form-group">
                  <label><i className="fab fa-line" style={{ color: '#00C300', marginRight: 5 }}></i>LINE ID</label>
                  <input type="text" placeholder="@username หรือ ID ไลน์" value={form.contact_line} onChange={e => set('contact_line', e.target.value)} />
                </div>
                <div className="form-group">
                  <label><i className="fab fa-facebook" style={{ color: '#1877F2', marginRight: 5 }}></i>Facebook</label>
                  <input type="text" placeholder="ชื่อ Facebook หรือ URL โปรไฟล์" value={form.contact_facebook} onChange={e => set('contact_facebook', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 12 }}>
                <div className="form-group">
                  <label><i className="fas fa-envelope" style={{ color: '#e53935', marginRight: 5 }}></i>Email ลูกค้า <span style={{ fontSize: 11, color: '#999' }}>(เอกสารอ้างอิง 17)</span></label>
                  <input type="email" placeholder="example@email.com" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
                </div>
              </div>

              {/* ★ สถานะสมรส — กำหนด Checklist เอกสาร */}
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>
                  <i className="fas fa-ring" style={{ color: '#be185d', marginRight: 6 }}></i>
                  สถานะสมรส <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(ใช้กำหนด Checklist เอกสาร)</span>
                </label>
                <select value={form.marital_status} onChange={e => set('marital_status', e.target.value)}>
                  <option value="">-- เลือกสถานะสมรส --</option>
                  <option value="single">โสด</option>
                  <option value="married_reg">สมรส (จดทะเบียน)</option>
                  <option value="married_unreg">สมรส (ไม่จดทะเบียน)</option>
                  <option value="divorced">หย่า</option>
                  <option value="widowed">หม้าย</option>
                  <option value="inherited">รับมรดก</option>
                </select>
              </div>

              {/* ── เอกสารสถานะสมรส (แสดงทันทีเมื่อเลือกสถานะ) ── */}
              {form.marital_status && (() => {
                const MARITAL_COLOR = { single:'#1565c0', married_reg:'#6a1b9a', married_unreg:'#e65100', divorced:'#c62828', widowed:'#7b1fa2', inherited:'#2e7d32' }
                const MARITAL_LABEL = { single:'โสด', married_reg:'สมรสจดทะเบียน', married_unreg:'สมรสไม่จดทะเบียน', divorced:'หย่า', widowed:'หม้าย', inherited:'รับมรดก' }
                const docs = MARITAL_CHECKLIST_DOCS[form.marital_status] || []
                const color = MARITAL_COLOR[form.marital_status] || '#555'
                // นับ "เสร็จ" = ติ๊กแล้ว หรือ มีไฟล์
                const doneCount = docs.filter(d => !!maritalTicks[d.field] || (checklistDocs[d.field] || []).length > 0).length
                return (
                  <div style={{ marginTop: 6, border: `1.5px solid ${color}40`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', background: `${color}10`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: color, color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                        {MARITAL_LABEL[form.marital_status]}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#111', flex: 1 }}>
                        <i className="fas fa-user-circle" style={{ marginRight: 5, color }}></i>
                        เอกสารส่วนตัว / สถานะสมรส
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700,
                        background: doneCount === docs.length ? '#dcfce7' : '#fef9c3',
                        color: doneCount === docs.length ? '#15803d' : '#92400e',
                        border: `1px solid ${doneCount === docs.length ? '#86efac' : '#fde68a'}`,
                        borderRadius: 12, padding: '2px 10px' }}>
                        {doneCount}/{docs.length}
                      </span>
                    </div>
                    <div style={{ padding: '10px 14px', background: `${color}05`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {docs.map(item => {
                        const files = checklistDocs[item.field] || []
                        const hasFiles = files.length > 0
                        const ticked = !!maritalTicks[item.field]
                        const isDone = hasFiles || ticked
                        const isUploading = uploadingChecklistDoc === item.field
                        return (
                          <div key={item.field} style={{ background: '#fff', border: `1px solid ${isDone ? '#86efac' : '#e5e7eb'}`, borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {/* Checkbox ติ๊ก (เหมือน property checklist) */}
                              <div
                                onClick={() => toggleMaritalTick(item.field)}
                                style={{
                                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                                  background: isDone ? '#16a34a' : '#fff',
                                  border: `2px solid ${isDone ? '#16a34a' : '#d1d5db'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', transition: 'all 0.15s',
                                }}>
                                {isDone && <i className="fas fa-check" style={{ color: '#fff', fontSize: 11 }}></i>}
                              </div>
                              <span
                                onClick={() => toggleMaritalTick(item.field)}
                                style={{
                                  flex: 1, fontSize: 13, cursor: 'pointer',
                                  color: isDone ? '#15803d' : '#374151',
                                  fontWeight: isDone ? 600 : 400,
                                }}>
                                {item.label}
                                {item.required && <span style={{ color: '#ef4444', marginLeft: 4, fontSize: 10 }}>*</span>}
                                {ticked && !hasFiles && (
                                  <span style={{ marginLeft: 6, fontSize: 10, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 6px' }}>
                                    ติ๊กแล้ว
                                  </span>
                                )}
                              </span>
                              {isEdit && (
                                <label style={{ cursor: isUploading ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '2px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                                  background: isUploading ? '#e5e7eb' : '#eff6ff', color: isUploading ? '#9ca3af' : '#2563eb',
                                  border: '1px solid #bfdbfe', whiteSpace: 'nowrap' }}>
                                  {isUploading ? <><i className="fas fa-spinner fa-spin"></i>&nbsp;อัพโหลด...</> : <><i className="fas fa-upload"></i>&nbsp;อัพโหลด<span style={{ fontSize: 10, opacity: 0.8, marginLeft: 3 }}>(หลายไฟล์ได้)</span></>}
                                  <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} disabled={isUploading}
                                    onChange={e => { if (e.target.files?.length) handleChecklistUpload(item.field, Array.from(e.target.files)); e.target.value = '' }} />
                                </label>
                              )}
                            </div>
                            {hasFiles && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 30 }}>
                                {files.map((fp, fi) => (
                                  <div key={fi} style={{ position: 'relative', display: 'inline-flex' }}>
                                    {/\.(jpg|jpeg|png|gif|webp)$/i.test(fp)
                                      ? <img src={`/${fp}`} alt="" onClick={() => window.open(`/${fp}`, '_blank')} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }} />
                                      : <div onClick={() => window.open(`/${fp}`, '_blank')} style={{ width: 52, height: 52, borderRadius: 6, border: '1px solid #ddd', background: '#fff3e0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 9 }}>
                                          <i className="fas fa-file-pdf" style={{ fontSize: 18, color: '#f57c00' }}></i><span>PDF</span>
                                        </div>}
                                    {isEdit && (
                                      <button type="button" onClick={() => handleChecklistRemove(item.field, fp)}
                                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                        <i className="fas fa-times"></i>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <div className="form-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  รูปหน้าบัตรประชาชน
                  {ocrMsg && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: ocrMsg.type === 'error' ? '#dc2626' : ocrMsg.type === 'warn' ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                      {ocrMsg.text}
                    </span>
                  )}
                </label>
                <label style={{
                  display: 'block', cursor: ocrLoading ? 'default' : 'pointer', marginBottom: 6,
                  background: idCardLocalPreview ? '#f5f3ff' : '#faf5ff',
                  border: `2px dashed ${idCardLocalPreview ? '#7c3aed' : '#c4b5fd'}`,
                  borderRadius: 10, padding: 12, transition: 'border-color 0.2s',
                }}>
                  <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
                    disabled={ocrLoading}
                    onChange={e => {
                      if (e.target.files[0]) {
                        const files = Array.from(e.target.files)
                        set('id_card_files', files)
                        const f = e.target.files[0]
                        setIdCardLocalPreview(f.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(f))
                        handleManualOcr(f, 'id_card')
                        e.target.value = ''
                      }
                    }} />
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                      background: '#ede9fe', border: '1px solid #d8b4fe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                    }}>
                      {idCardLocalPreview === 'pdf'
                        ? <i className="fas fa-file-pdf" style={{ fontSize: 26, color: '#7c3aed' }}></i>
                        : idCardLocalPreview
                          ? <img src={idCardLocalPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <i className="fas fa-id-card" style={{ fontSize: 26, color: '#7c3aed' }}></i>
                      }
                      {idCardLocalPreview && !ocrLoading && (
                        <button type="button"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); set('id_card_files', null); setIdCardLocalPreview(null); setOcrMsg(null) }}
                          style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                          title="ลบไฟล์">✕</button>
                      )}
                      {ocrLoading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(124,58,237,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 20 }}></i>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 3 }}>
                        <i className="fas fa-camera" style={{ marginRight: 5 }}></i>
                        {ocrLoading ? 'กำลัง OCR...' : idCardLocalPreview ? 'เปลี่ยนรูปบัตรประชาชน' : 'สแกน / อัพโหลดบัตรประชาชน'}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
                        {ocrLoading
                          ? <span style={{ color: '#6366f1', fontWeight: 600 }}><i className="fas fa-magic" style={{ marginRight: 3 }}></i>AI กำลังอ่านข้อมูลจากบัตร...</span>
                          : idCardLocalPreview
                            ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกไฟล์แล้ว</span> — คลิกเพื่อเปลี่ยน</>
                            : <><i className="fas fa-magic" style={{ marginRight: 3, color: '#6366f1' }}></i>OCR อ่านชื่อ-ที่อยู่อัตโนมัติ | รูป / PDF</>
                        }
                      </div>
                      {form.id_card_files && !ocrLoading && (
                        <div style={{ fontSize: 10, color: '#7c3aed', marginTop: 3 }}>
                          <i className="fas fa-paperclip" style={{ marginRight: 3 }}></i>{form.id_card_files.length} ไฟล์
                        </div>
                      )}
                    </div>
                  </div>
                </label>
                {isEdit && existingImages.filter(p => p.includes('id-cards')).length > 0 && (
                  <div>
                    <small style={{ color: '#888', fontSize: 11 }}><i className="fas fa-image"></i> รูปเดิม ({existingImages.filter(p => p.includes('id-cards')).length} ไฟล์)</small>
                    {renderExistingThumbs(existingImages.filter(p => p.includes('id-cards')), 'images')}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>ลักษณะทรัพย์</label>
                  <select
                    value={form.property_type}
                    onChange={e => set('property_type', e.target.value)}
                    style={{ borderColor: errors.property_type ? '#e74c3c' : undefined }}
                  >
                    <option value="">-- เลือกประเภท --</option>
                    {propertyTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {errors.property_type && <span style={{ color: '#e74c3c', fontSize: 12, display: 'block', marginTop: 4 }}>{errors.property_type}</span>}
                </div>

                <div style={{ marginBottom: 4 }}>
                  <label style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>ทรัพย์ติดภาระหรือไม่</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => set('has_obligation', 'no')} style={{
                      padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: '2px solid',
                      background: form.has_obligation !== 'yes' ? '#dcfce7' : '#f9fafb',
                      color: form.has_obligation !== 'yes' ? '#15803d' : '#9ca3af',
                      borderColor: form.has_obligation !== 'yes' ? '#86efac' : '#e5e7eb',
                    }}>
                      <i className="fas fa-check-circle" style={{ marginRight: 5 }}></i>ไม่ติดภาระ
                    </button>
                    <button type="button" onClick={() => set('has_obligation', 'yes')} style={{
                      padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: '2px solid',
                      background: form.has_obligation === 'yes' ? '#fee2e2' : '#f9fafb',
                      color: form.has_obligation === 'yes' ? '#b91c1c' : '#9ca3af',
                      borderColor: form.has_obligation === 'yes' ? '#fca5a5' : '#e5e7eb',
                    }}>
                      <i className="fas fa-exclamation-circle" style={{ marginRight: 5 }}></i>ติดภาระ
                    </button>
                    {form.has_obligation === 'yes' && (
                      <input type="number" placeholder="จำนวน" value={form.obligation_count} onChange={e => set('obligation_count', e.target.value)}
                        style={{ width: 100, padding: '7px 12px', borderRadius: 8, border: '1.5px solid #fca5a5', fontSize: 14 }} />
                    )}
                  </div>
                </div>
              </div>

              {/* ===== เลือกนายหน้า + แสดงข้อมูล auto ===== */}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>เลือกนายหน้า</label>
                <select value={form.agent_id} onChange={e => set('agent_id', e.target.value)}>
                  <option value="">-- เลือกนายหน้า --</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.agent_code ? `[${a.agent_code}] ` : ''}{a.full_name} {a.nickname ? `(${a.nickname})` : ''} — {a.phone}</option>)}
                </select>
              </div>

              {/* ★ กล่องแสดงข้อมูลนายหน้าที่เลือก */}
              {selectedAgent && (
                <div style={{ background: '#f0f7ff', border: '1.5px solid #bbdefb', borderRadius: 12, padding: 16, marginTop: 4 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #1565C0, #1976d2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 16,
                    }}>
                      {(selectedAgent.full_name || 'A')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#1565C0', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedAgent.full_name}
                        {selectedAgent.nickname ? <span style={{ color: '#666', fontWeight: 400, marginLeft: 6 }}>({selectedAgent.nickname})</span> : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {selectedAgent.agent_code && (
                          <span style={{ padding: '1px 8px', background: '#1565C0', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, marginRight: 6 }}>{selectedAgent.agent_code}</span>
                        )}
                        {selectedAgent.commission_rate && <span>ค่าคอม {selectedAgent.commission_rate}%</span>}
                      </div>
                    </div>
                  </div>

                  {/* ข้อมูลติดต่อ */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13, marginBottom: 12 }}>
                    <div><i className="fas fa-phone" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.phone || '-'}</span></div>
                    <div><i className="fas fa-envelope" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.email || '-'}</span></div>
                    {selectedAgent.line_id && <div><i className="fab fa-line" style={{ color: '#00C300', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.line_id}</span></div>}
                    {selectedAgent.bank_name && <div><i className="fas fa-university" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.bank_name}</span></div>}
                    {selectedAgent.bank_account && <div><i className="fas fa-credit-card" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.bank_account}</span></div>}
                    {selectedAgent.bank_account_name && <div><i className="fas fa-user" style={{ color: '#1565C0', marginRight: 5, fontSize: 11 }}></i><span style={{ color: '#555' }}>{selectedAgent.bank_account_name}</span></div>}
                  </div>

                  {/* สถิติ */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #dbeafe', paddingTop: 10 }}>
                    {[
                      { label: 'เคสทั้งหมด', value: selectedAgent.total_cases || 0, color: '#1565C0', icon: 'fa-folder' },
                      { label: 'เคสสำเร็จ', value: selectedAgent.completed_cases || 0, color: '#27ae60', icon: 'fa-check-circle' },
                      { label: 'ยอดรวม', value: selectedAgent.total_amount > 0 ? `฿${Number(selectedAgent.total_amount).toLocaleString('th-TH')}` : '-', color: '#e67e22', icon: 'fa-baht-sign' },
                    ].map((s, i) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: '#fff', borderRadius: 8, border: '1px solid #e3f2fd' }}>
                        <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 13, display: 'block', marginBottom: 3 }}></i>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* ===== 🎯 Progress: เส้นทางสู่เคส ===== */}
              {isEdit && (() => {
                const hasLoanType = form.loan_type_detail === 'mortgage' || form.loan_type_detail === 'selling_pledge'
                const hasBook = !!caseInfo?.appraisal_book_image
                const hasTable = !!caseInfo?.credit_table_file
                const allDone = hasLoanType && hasBook && hasTable
                const hasCaseAlready = !!caseInfo?.case_id

                const Step = ({ done, label, who, href }) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: done ? '#dcfce7' : '#fee2e2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <i className={`fas fa-${done ? 'check' : 'times'}`} style={{ fontSize: 10, color: done ? '#16a34a' : '#dc2626' }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: done ? 600 : 400, color: done ? '#166534' : '#374151' }}>{label}</span>
                      {!done && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>({who})</span>}
                    </div>
                    {done && href && (
                      <a href={href.startsWith('/') ? href : `/${href}`} target="_blank" rel="noreferrer"
                        style={{ padding: '3px 10px', background: '#1565c0', color: '#fff', borderRadius: 5, fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-eye" style={{ marginRight: 4 }}></i>ดูไฟล์
                      </a>
                    )}
                    {done && !href && <i className="fas fa-check-circle" style={{ color: '#16a34a', fontSize: 12 }}></i>}
                  </div>
                )

                return (
                  <div style={{ marginTop: 20, padding: 16, background: hasCaseAlready ? '#f0fdf4' : (allDone ? '#fffbeb' : '#fafafa'), borderRadius: 10, border: `1.5px solid ${hasCaseAlready ? '#86efac' : (allDone ? '#fde68a' : '#e5e7eb')}` }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: hasCaseAlready ? '#15803d' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`fas fa-${hasCaseAlready ? 'folder-open' : 'road'}`}></i>
                      {hasCaseAlready ? `เคสสร้างแล้ว (${linkedCases[0]?.case_code || 'CS???'})` : 'เส้นทางสู่การสร้างเคส'}
                    </h4>

                    {!hasCaseAlready && (
                      <div style={{ marginBottom: 12 }}>
                        <Step done={hasLoanType} label={`ประเภทสินเชื่อ${hasLoanType ? `: ${form.loan_type_detail === 'mortgage' ? 'จำนอง' : 'ขายฝาก'}` : ''}`} who="ฝ่ายขายกรอก" />
                        <Step done={hasBook} label="อัพโหลดเล่มประเมิน" who="ฝ่ายประเมิน" href={caseInfo?.appraisal_book_image} />
                        <Step done={hasTable} label="ตารางวงเงิน (ขายฝาก/จำนอง)" who="ฝ่ายอนุมัติ" />
                      </div>
                    )}

                    {hasCaseAlready ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/sales/case/edit/${caseInfo.case_id}`)}
                        style={{ width: '100%', padding: '8px 0', background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <i className="fas fa-external-link-alt"></i> เปิดเคส
                      </button>
                    ) : allDone ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* AI Auto-Create */}
                        <button
                          type="button"
                          disabled={autoCreating}
                          onClick={async () => {
                            if (!window.confirm('ให้ AI สร้างเคสอัตโนมัติจากข้อมูลลูกหนี้นี้?')) return
                            setAutoCreating(true); setAutoCreateMsg('')
                            try {
                              const r = await fetch(`${API}/debtors/${id}/auto-create-case`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token()}` }
                              })
                              const d = await r.json()
                              if (d.success) {
                                setAutoCreateMsg(`✅ สร้างเคส ${d.case_code} สำเร็จ`)
                                // อัพเดท caseInfo ให้แสดง case_id ใหม่
                                setCaseInfo(prev => ({ ...prev, case_id: d.case_id }))
                                setTimeout(() => navigate(`/sales/case/edit/${d.case_id}`), 1500)
                              } else {
                                setAutoCreateMsg(`❌ ${d.message}`)
                              }
                            } catch (e) { setAutoCreateMsg(`❌ ${e.message}`) }
                            setAutoCreating(false)
                          }}
                          style={{ width: '100%', padding: '9px 0', background: autoCreating ? '#e5e7eb' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: autoCreating ? '#9ca3af' : '#fff', border: 'none', borderRadius: 8, cursor: autoCreating ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          {autoCreating
                            ? <><i className="fas fa-spinner fa-spin"></i> กำลังสร้าง...</>
                            : <><i className="fas fa-robot"></i> AI สร้างเคสอัตโนมัติ</>}
                        </button>
                        {/* Manual create */}
                        <button
                          type="button"
                          onClick={() => navigate(`/sales/case/new?lr=${id}`)}
                          style={{ width: '100%', padding: '8px 0', background: '#fff', color: '#d97706', border: '1.5px solid #d97706', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-folder-plus"></i> สร้างเคสเอง
                        </button>
                        {autoCreateMsg && (
                          <div style={{ fontSize: 12, textAlign: 'center', color: autoCreateMsg.startsWith('✅') ? '#15803d' : '#dc2626', background: autoCreateMsg.startsWith('✅') ? '#f0fdf4' : '#fee2e2', padding: '6px 10px', borderRadius: 6 }}>
                            {autoCreateMsg}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '4px 0' }}>
                        รอข้อมูลครบก่อนจึงจะสร้างเคสได้
                      </div>
                    )}
                  </div>
                )
              })()}


              {/* ตารางวงเงิน — ฝ่ายขายดูได้เฉพาะไฟล์ที่ฝ่ายอนุมัติสินเชื่ออัพโหลด (section ด้านล่าง) */}

              {/* ===== Follow-up Tracking ===== */}
              {isEdit && caseInfo?.case_id && salesUsers.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {/* ===== Follow-up Tracking ===== */}
                  <div style={{ marginTop: 14, borderTop: '1px solid #e0e0e0', paddingTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6a1b9a' }}>
                        📞 การติดตาม ({followups.length})
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFollowupForm(v => !v)}
                        style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, border: '1px solid #ce93d8', background: '#f3e5f5', color: '#6a1b9a', cursor: 'pointer', fontWeight: 600 }}
                      >
                        + บันทึก
                      </button>
                    </div>
                    {showFollowupForm && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                          {[['chat','💬 แชท'], ['call','📞 โทร'], ['note','📝 โน้ต']].map(([v, label]) => (
                            <button key={v} type="button" onClick={() => setFollowupType(v)}
                              style={{ flex: 1, padding: '5px 4px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: followupType === v ? '#6a1b9a' : '#ede7f6', color: followupType === v ? '#fff' : '#4a148c' }}
                            >{label}</button>
                          ))}
                        </div>
                        <textarea value={followupNote} onChange={e => setFollowupNote(e.target.value)} rows={2} placeholder="บันทึกเพิ่มเติม..." style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #ce93d8', fontSize: 12, boxSizing: 'border-box', resize: 'none', marginBottom: 6 }} />
                        <div style={{ marginBottom: 6 }}>
                          <label style={{ fontSize: 11, color: '#6a1b9a', fontWeight: 600, display: 'block', marginBottom: 3 }}>📅 กำหนดตามครั้งถัดไป</label>
                          <input type="datetime-local" value={followupNextAt} onChange={e => setFollowupNextAt(e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ce93d8', fontSize: 12, boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={handleSaveFollowup} disabled={savingFollowup} style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', background: '#6a1b9a', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{savingFollowup ? '⏳...' : '✅ บันทึก'}</button>
                          <button type="button" onClick={() => setShowFollowupForm(false)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', fontSize: 12, cursor: 'pointer' }}>ยกเลิก</button>
                        </div>
                      </div>
                    )}
                    {followups.slice(0, 4).map((f, i) => (
                      <div key={i} style={{ fontSize: 11, color: '#555', marginBottom: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0 }}>{f.followup_type === 'call' ? '📞' : f.followup_type === 'chat' ? '💬' : '📝'}</span>
                        <span>
                          {f.note || f.followup_type}
                          <span style={{ color: '#aaa', marginLeft: 4 }}>
                            {new Date(f.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== ผลอนุมัติจากฝ่ายอนุมัติสินเชื่อ (read-only, แบบ CaseEditPage) ===== */}
              {isEdit && caseInfo && (caseInfo.approved_credit || caseInfo.approval_status) && (
                <div style={{ marginTop: 14, padding: 20, background: '#f0f9ff', borderRadius: 10, borderTop: '3px solid #1565c0', border: '1px solid #b3d9f7' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#1565c0' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>ผลอนุมัติจากฝ่ายอนุมัติสินเชื่อ
                  </h4>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: '#888' }}>ข้อมูลที่ฝ่ายอนุมัติกรอกไว้ — แก้ไขได้ที่ฝ่ายอนุมัติเท่านั้น</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {caseInfo.approval_status && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>สถานะอนุมัติ</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: caseInfo.approval_status === 'approved' ? '#2e7d32' : caseInfo.approval_status === 'cancelled' ? '#c62828' : '#f57c00' }}>
                          {caseInfo.approval_status === 'approved' ? '✓ อนุมัติแล้ว' : caseInfo.approval_status === 'cancelled' ? '✗ ยกเลิก' : '⏳ รอพิจารณา'}
                        </span>
                      </div>
                    )}
                    {caseInfo.approved_credit && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>วงเงินที่อนุมัติ</div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#1565c0' }}>
                          {Number(caseInfo.approved_credit).toLocaleString('th-TH')} บาท
                        </span>
                      </div>
                    )}
                    {caseInfo.interest_per_year && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>ดอกเบี้ย/ปี</div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{caseInfo.interest_per_year}%</span>
                      </div>
                    )}
                    {caseInfo.operation_fee && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>ค่าดำเนินการ</div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{Number(caseInfo.operation_fee).toLocaleString('th-TH')} บาท</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== ตารางวงเงิน (จากฝ่ายอนุมัติ) — แสดงเสมอถ้ามีไฟล์ ===== */}
              {isEdit && caseInfo?.credit_table_file && (
                <div style={{ marginTop: 14, padding: '14px 16px', background: 'linear-gradient(135deg, #e3f2fd, #f0f9ff)', borderRadius: 10, border: '2px solid #1565c0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <i className="fas fa-table" style={{ color: '#1565c0', fontSize: 16 }}></i>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1565c0' }}>ตารางวงเงิน (จากฝ่ายอนุมัติ)</span>
                    <span style={{ fontSize: 11, background: '#fff', color: '#1565c0', padding: '2px 8px', borderRadius: 10, border: '1px solid #90caf9', fontWeight: 500 }}>
                      <i className="fas fa-share-alt" style={{ marginRight: 4 }}></i>โหลดส่งให้ลูกค้าในแชทได้เลย
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #bbdefb' }}>
                    <i className="fas fa-file-excel" style={{ color: '#1e7e34', fontSize: 20, flexShrink: 0 }}></i>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#555', wordBreak: 'break-all', fontWeight: 500 }}>
                        {caseInfo.credit_table_file.split('/').pop()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <a
                        href={caseInfo.credit_table_file.startsWith('/') ? caseInfo.credit_table_file : `/${caseInfo.credit_table_file}`}
                        target="_blank" rel="noreferrer"
                        style={{ padding: '6px 12px', background: '#e3f2fd', color: '#1565c0', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', border: '1px solid #90caf9' }}
                      >
                        <i className="fas fa-eye" style={{ marginRight: 4 }}></i>เปิดดู
                      </a>
                      <a
                        href={caseInfo.credit_table_file.startsWith('/') ? caseInfo.credit_table_file : `/${caseInfo.credit_table_file}`}
                        download
                        style={{ padding: '6px 12px', background: '#1565c0', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        <i className="fas fa-download" style={{ marginRight: 4 }}></i>โหลดไฟล์
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== เปรียบเทียบรูปทรัพย์: ฝ่ายขาย vs ฝ่ายประเมิน ===== */}
              {isEdit && (() => {
                let appraisalImgs = []
                if (caseInfo?.appraisal_images) {
                  try { appraisalImgs = JSON.parse(caseInfo.appraisal_images) || [] } catch { appraisalImgs = [] }
                }
                // รูปจากฝ่ายขาย: จาก images (path 'properties') + จาก checklistDocs.property_photos
                const salesPropImgs = [
                  ...existingImages.filter(p => p.includes('properties')),
                  ...(checklistDocs.property_photos || []),
                ]
                // แสดงตารางเสมอในโหมดแก้ไข
                const PhotoThumb = ({ src, colorBorder }) => {
                  const fullSrc = src.startsWith('/') ? src : `/${src}`
                  const isPdf = src.toLowerCase().includes('.pdf')
                  return (
                    <div style={{ border: `1.5px solid ${colorBorder}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#fafafa' }}
                      onClick={() => window.open(fullSrc, '_blank')}>
                      {isPdf ? (
                        <div style={{ width: '100%', height: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', gap: 4 }}>
                          <i className="fas fa-file-pdf" style={{ fontSize: 24, color: '#e53935' }}></i>
                          <span style={{ fontSize: 9, color: '#e53935', fontWeight: 600 }}>PDF</span>
                        </div>
                      ) : (
                        <img src={fullSrc} alt="prop"
                          style={{ width: '100%', height: 90, objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      )}
                    </div>
                  )
                }
                return (
                  <div style={{ marginTop: 16, padding: 16, background: '#f8faff', borderRadius: 10, border: '1.5px solid #c7d2fe' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#3730a3', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-images"></i> เปรียบเทียบรูปทรัพย์
                      <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280' }}>— ทุกแผนกมองเห็น</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {/* ฝ่ายขาย */}
                      <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, border: '1px solid #86efac' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>
                          <i className="fas fa-user-tie" style={{ marginRight: 5 }}></i>
                          รูปจากฝ่ายขาย ({salesPropImgs.length} รูป)
                        </div>
                        {salesPropImgs.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
                            {salesPropImgs.map((src, i) => <PhotoThumb key={i} src={src} colorBorder="#86efac" />)}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#999' }}>ยังไม่มีรูปจากฝ่ายขาย</span>
                        )}
                      </div>
                      {/* ฝ่ายประเมิน */}
                      <div style={{ background: '#f3e5f5', borderRadius: 8, padding: 12, border: '1px solid #ce93d8' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#7b1fa2', marginBottom: 8 }}>
                          <i className="fas fa-search-location" style={{ marginRight: 5 }}></i>
                          รูปจากฝ่ายประเมิน – เข้าพื้นที่ ({appraisalImgs.length} รูป)
                        </div>
                        {appraisalImgs.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
                            {appraisalImgs.map((src, i) => <PhotoThumb key={i} src={src} colorBorder="#ce93d8" />)}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#999' }}>ยังไม่มีรูปจากฝ่ายประเมิน</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* ===== ตารางผ่อนชำระ — ใต้เปรียบเทียบรูปทรัพย์ (ไม่จำเป็นหากไม่มีการผ่อนชำระ) ===== */}
              {isEdit && (
                <div style={{ marginTop: 14, borderRadius: 10, border: '2px solid #9c27b0', overflow: 'hidden' }}>
                  <button type="button" onClick={() => setShowPaymentSchedule(p => !p)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: 'linear-gradient(135deg,#f3e5f5,#fdf4ff)', border: 'none', cursor: 'pointer', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-calendar-alt" style={{ color: '#7b1fa2', fontSize: 15 }}></i>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#6a1b9a' }}>ตารางผ่อนชำระ</span>
                      <span style={{ fontSize: 10, background: '#fff', color: '#7b1fa2', padding: '1px 7px', borderRadius: 10, border: '1px solid #ce93d8', fontWeight: 500 }}>ฝ่ายขายสร้างเอง</span>
                      {caseInfo?.payment_schedule_file && (
                        <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2e7d32', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                          <i className="fas fa-paperclip" style={{ marginRight: 3 }}></i>มีไฟล์
                        </span>
                      )}
                      {Number(caseInfo?.payment_schedule_approved ?? 0) === 2 && (
                        <span style={{ fontSize: 10, background: '#ffebee', color: '#b71c1c', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>❌ ไม่ผ่าน</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: '#9c27b0', fontStyle: 'italic' }}>ไม่จำเป็นหากไม่มีการผ่อนชำระ</span>
                      <i className={`fas fa-chevron-${showPaymentSchedule ? 'up' : 'down'}`} style={{ color: '#7b1fa2', fontSize: 12 }}></i>
                    </div>
                  </button>

                  {showPaymentSchedule && (
                    <div style={{ padding: '14px 16px', background: '#fdf4ff' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <button type="button"
                          onClick={() => {
                            const params = new URLSearchParams()
                            if (form.case_code || id) params.set('debtor_code', form.case_code || id)
                            if (form.desired_amount) params.set('loan_amount', form.desired_amount)
                            if (form.contact_name) params.set('customer_name', form.contact_name)
                            params.set('back_id', id)
                            window.open(`/sales/payment-schedule?${params.toString()}`, '_blank')
                          }}
                          style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#7b1fa2,#9c27b0)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-external-link-alt"></i> สร้าง / ดูตาราง
                        </button>
                      </div>

                      {caseInfo?.payment_schedule_file ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #ce93d8', marginBottom: 10 }}>
                          <i className="fas fa-file-image" style={{ color: '#7b1fa2', fontSize: 18, flexShrink: 0 }}></i>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#555', wordBreak: 'break-all' }}>
                            {caseInfo.payment_schedule_file.split('/').pop()}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <a href={caseInfo.payment_schedule_file.startsWith('/') ? caseInfo.payment_schedule_file : `/${caseInfo.payment_schedule_file}`}
                              target="_blank" rel="noreferrer"
                              style={{ padding: '5px 11px', background: '#f3e5f5', color: '#7b1fa2', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', border: '1px solid #ce93d8' }}>
                              <i className="fas fa-eye" style={{ marginRight: 4 }}></i>ดู
                            </a>
                            <a href={caseInfo.payment_schedule_file.startsWith('/') ? caseInfo.payment_schedule_file : `/${caseInfo.payment_schedule_file}`}
                              download style={{ padding: '5px 11px', background: '#7b1fa2', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                              <i className="fas fa-download" style={{ marginRight: 4 }}></i>โหลด
                            </a>
                            <button type="button"
                              onClick={async () => {
                                if (!window.confirm('ลบไฟล์ตารางผ่อนชำระนี้?')) return
                                const res = await fetch(`/api/admin/sales/debtors/${id}/payment-schedule`, {
                                  method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
                                })
                                const d = await res.json()
                                if (d.success) setCaseInfo(prev => ({ ...prev, payment_schedule_file: null }))
                              }}
                              style={{ padding: '5px 9px', background: '#fff', color: '#e74c3c', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #e74c3c', cursor: 'pointer' }}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#ba68c8', fontStyle: 'italic', marginBottom: 8 }}>
                          <i className="fas fa-cloud-upload-alt" style={{ marginRight: 5 }}></i>ยังไม่มีไฟล์ตารางผ่อนชำระ
                        </div>
                      )}

                      {(() => {
                        const st = Number(caseInfo?.payment_schedule_approved ?? 0)
                        if (st === 1) return (
                          <div style={{ marginBottom: 10, padding: '10px 14px', background: '#e8f5e9', borderRadius: 8, border: '1.5px solid #a5d6a7', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fas fa-check-circle" style={{ color: '#2e7d32', fontSize: 16 }}></i>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#1b5e20' }}>✅ อนุมัติ</div>
                              {caseInfo?.payment_schedule_approved_at && (
                                <div style={{ fontSize: 11, color: '#4caf50' }}>เมื่อ {new Date(caseInfo.payment_schedule_approved_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              )}
                            </div>
                            {caseInfo?.approval_schedule_file && (
                              <a href={caseInfo.approval_schedule_file.startsWith('/') ? caseInfo.approval_schedule_file : `/${caseInfo.approval_schedule_file}`} target="_blank" rel="noreferrer"
                                style={{ marginLeft: 'auto', padding: '4px 10px', background: '#1565c0', color: '#fff', borderRadius: 5, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                                <i className="fas fa-table" style={{ marginRight: 4 }}></i>ดูตารางจากฝ่ายอนุมัติ
                              </a>
                            )}
                          </div>
                        )
                        if (st === 2) return (
                          <div style={{ marginBottom: 10, padding: '10px 14px', background: '#ffebee', borderRadius: 8, border: '1.5px solid #ef9a9a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <i className="fas fa-times-circle" style={{ color: '#b71c1c', fontSize: 16 }}></i>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#b71c1c' }}>❌ ไม่ผ่าน — ฝ่ายอนุมัติส่งตารางใหม่มาแล้ว</div>
                            {caseInfo?.approval_schedule_file && (
                              <a href={caseInfo.approval_schedule_file.startsWith('/') ? caseInfo.approval_schedule_file : `/${caseInfo.approval_schedule_file}`} target="_blank" rel="noreferrer"
                                style={{ marginLeft: 'auto', padding: '4px 10px', background: '#c62828', color: '#fff', borderRadius: 5, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                                <i className="fas fa-table" style={{ marginRight: 4 }}></i>ดูตารางใหม่
                              </a>
                            )}
                          </div>
                        )
                        return (
                          <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f3e5f5', borderRadius: 8, border: '1px dashed #ce93d8', color: '#6a1b9a', fontSize: 12 }}>
                            <i className="fas fa-clock" style={{ marginRight: 6 }}></i>รออนุมัติ
                          </div>
                        )
                      })()}

                      <label style={{
                        display: 'block', cursor: 'pointer', marginTop: 4,
                        background: paymentSchedPreview ? '#fdf4ff' : '#f9f0ff',
                        border: `2px dashed ${paymentSchedPreview ? '#a855f7' : '#d8b4fe'}`,
                        borderRadius: 10, padding: 10, transition: 'border-color 0.2s',
                      }}>
                        <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
                          onChange={async (e) => {
                            const files = Array.from(e.target.files)
                            if (!files.length) return
                            const f = files[0]
                            setPaymentSchedPreview(f.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(f))
                            for (const file of files) {
                              const fd = new FormData()
                              fd.append('payment_schedule_file', file)
                              const res = await fetch(`/api/admin/sales/debtors/${id}/payment-schedule`, {
                                method: 'PATCH', headers: { Authorization: `Bearer ${token()}` }, body: fd
                              })
                              const d = await res.json()
                              if (d.success) { setCaseInfo(prev => ({ ...prev, payment_schedule_file: d.payment_schedule_file })) }
                              else { alert(d.message || 'อัพโหลดไม่สำเร็จ'); break }
                            }
                            e.target.value = ''
                          }} />
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{
                            width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                            background: '#f3e8ff', border: '1px solid #d8b4fe',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                          }}>
                            {paymentSchedPreview === 'pdf'
                              ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#9333ea' }}></i>
                              : paymentSchedPreview
                                ? <img src={paymentSchedPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <i className="fas fa-table" style={{ fontSize: 22, color: '#9333ea' }}></i>
                            }
                            {paymentSchedPreview && (
                              <button type="button"
                                onClick={e => { e.preventDefault(); e.stopPropagation(); setPaymentSchedPreview(null) }}
                                style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                                title="ลบ">✕</button>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce' }}>
                              <i className="fas fa-upload" style={{ marginRight: 4 }}></i>
                              {paymentSchedPreview ? 'อัพโหลดสำเร็จ — คลิกเพื่อเปลี่ยน' : 'อัพโหลดตารางผ่อนชำระ'}
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                              {paymentSchedPreview
                                ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ อัพโหลดแล้ว</span>
                                : 'PNG / PDF'
                              }
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* ★ แสดงรายการเคสที่เชื่อมอยู่ (edit mode) */}
              {isEdit && linkedCases.length > 0 && (
                <div style={{ marginTop: 16, padding: 14, background: '#fffbf0', borderRadius: 10, border: '1px solid #ffe0b2' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#e65100' }}>
                    <i className="fas fa-link" style={{ marginRight: 6 }}></i> เคสที่เชื่อมอยู่ ({linkedCases.length})
                  </h4>
                  {linkedCases.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i > 0 ? '1px solid #ffe0b2' : 'none', fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{c.case_code}</span>
                      {c.agent_name && <span style={{ color: '#666' }}>| นายหน้า: {c.agent_name}</span>}
                      <span className={`badge ${c.payment_status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`} style={{ fontSize: 10 }}>
                        {c.payment_status === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ===== ขวา: ข้อมูลทรัพย์ + เอกสาร ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>
                  <i className="fas fa-map-marker-alt" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                  ข้อมูลทรัพย์
                </span>

{ocrFlash && (
                  <span style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 20,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    boxShadow: '0 2px 8px rgba(5,150,105,0.4)',
                    animation: 'ocrFlashIn 0.3s ease'
                  }}>
                    <i className="fas fa-magic"></i>
                    OCR เติมข้อมูลให้แล้ว ({ocrFlash.length} ช่อง)
                  </span>
                )}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>จังหวัด</label>
                  <select value={form.province} onChange={e => set('province', e.target.value)}>
                    <option value="">-- เลือก --</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.province && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.province}</span>}
                </div>
                <div className="form-group">
                  <label>อำเภอ</label>
                  <input type="text" placeholder="อำเภอ" value={form.district} onChange={e => set('district', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ตำบล</label>
                  <input type="text" placeholder="ตำบล" value={form.subdistrict} onChange={e => set('subdistrict', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>บ้านเลขที่</label>
                  <input type="text" placeholder="เช่น 123/4" value={form.house_no} onChange={e => set('house_no', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ชื่อหมู่บ้าน / โครงการ</label>
                  <input type="text" placeholder="เช่น หมู่บ้านสุขสันต์" value={form.village_name} onChange={e => set('village_name', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  โลเคชั่น
                  {/* ★ ปุ่ม GPS อุปกรณ์จริง — กดครั้งเดียว auto-fill URL */}
                  <button type="button"
                    onClick={useDeviceGPS}
                    style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-location-arrow"></i> ใช้ GPS อุปกรณ์
                  </button>
                  {/* ★ ค้นหาจากที่อยู่ (Nominatim) — เฉพาะเมื่อกรอกที่อยู่แล้ว */}
                  {(form.province || form.district || form.subdistrict) && (
                    <button type="button"
                      onClick={generateMapsUrl}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#ea4335,#fbbc04)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="fas fa-map-marked-alt"></i> ค้นหาจากที่อยู่
                    </button>
                  )}
                </label>
                <input type="url" placeholder="https://maps.app.goo.gl/..." value={form.location_url} onChange={e => set('location_url', e.target.value)} />
                <MapPreview url={form.location_url} label="โลเคชั่นทรัพย์" />

                {/* ★ Copy panel สำหรับกรอก landsmaps */}
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'จังหวัด', value: form.province, color: '#2563eb' },
                    { label: 'อำเภอ', value: form.district, color: '#0369a1' },
                    { label: 'เลขโฉนด', value: form.deed_number, color: '#059669' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b', minWidth: 68 }}>{label}</span>
                      <span style={{
                        flex: 1, fontWeight: 700, fontSize: 13, color,
                        background: '#fff', padding: '3px 8px', borderRadius: 6,
                        border: `1px solid ${color}30`
                      }}>
                        {value || <span style={{ color: '#aaa', fontWeight: 400 }}>—</span>}
                      </span>
                      {value && (
                        <button type="button"
                          onClick={() => navigator.clipboard.writeText(value).catch(() => {})}
                          title="คัดลอก"
                          style={{
                            fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none',
                            background: color, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600
                          }}>
                          <i className="fas fa-copy"></i> copy
                        </button>
                      )}
                    </div>
                  ))}
                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    เลขโฉนด
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                      background: ocrLoading ? '#e5e7eb' : 'linear-gradient(135deg,#059669,#047857)',
                      color: ocrLoading ? '#888' : '#fff', fontSize: 11, fontWeight: 700,
                      padding: '3px 10px', borderRadius: 20, userSelect: 'none',
                      pointerEvents: ocrLoading ? 'none' : 'auto'
                    }}>
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files[0]) handleManualOcr(e.target.files[0], 'land_deed'); e.target.value = '' }} />
                      {ocrLoading ? <><i className="fas fa-spinner fa-spin"></i> อ่านอยู่...</>
                        : <><i className="fas fa-magic"></i> OCR โฉนด</>}
                    </label>
                  </label>
                  <input type="text" placeholder="กข.12345" value={form.deed_number} onChange={e => set('deed_number', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>ประเภทโฉนด <span style={{ color: '#e74c3c', fontSize: 11 }}>*</span></label>
                  <select
                    value={form.deed_type}
                    onChange={e => set('deed_type', e.target.value)}
                    style={{
                      borderColor: form.deed_type
                        ? (isDeedOk(form.deed_type) ? '#27ae60' : '#e74c3c')
                        : '#ddd',
                      fontWeight: form.deed_type ? 600 : 400,
                    }}
                  >
                    <option value="">-- เลือกประเภท --</option>
                    {deedTypes.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  {form.deed_type && !isDeedOk(form.deed_type) && (
                    <div style={{ background: '#fff0f0', border: '1px solid #e74c3c', borderRadius: 6, padding: '5px 10px', marginTop: 5, fontSize: 11, color: '#c0392b' }}>
                      <i className="fas fa-ban" style={{ marginRight: 4 }}></i>โฉนดประเภทนี้ไม่รับพิจารณา
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>{form.property_type === 'condo' ? 'ขนาดห้อง (ตร.ม)' : 'พื้นที่'}</label>
                  <input
                    type="text"
                    placeholder={form.property_type === 'condo' ? 'เช่น 35 ตร.ม' : 'เช่น 50 ตร.วา / 2 ไร่ 3 งาน'}
                    value={form.land_area}
                    onChange={e => set('land_area', e.target.value)}
                  />
                </div>
              </div>




            </div>

            {/* ===== ★ คัดทรัพย์ (SOP Auto Screening) — Dropdown ===== */}
            <div style={{ marginBottom: 20 }}>
              {/* Dropdown trigger bar */}
              <button type="button"
                onClick={() => setScreeningExpanded(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderRadius: screeningExpanded ? '10px 10px 0 0' : 10,
                  border: screenOverall === 'fail' ? '1.5px solid #fecaca' : '1.5px solid #e5e7eb',
                  background: screenOverall === 'fail' ? '#fef2f2' : '#f9fafb',
                  cursor: 'pointer',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-shield-alt" style={{ color: '#dc2626', fontSize: 13 }}></i>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>คัดทรัพย์</span>
                  {failedChecks.length > 0
                    ? <span style={{ background: '#dc2626', color: '#fff', borderRadius: 20, padding: '1px 10px', fontSize: 11, fontWeight: 700 }}>✗ ไม่ผ่าน {failedChecks.length} เกณฑ์</span>
                    : <span style={{ fontSize: 11, color: '#9ca3af' }}>ติ๊กเกณฑ์ที่ไม่ผ่าน</span>}
                </div>
                <i className={`fas fa-chevron-${screeningExpanded ? 'up' : 'down'}`} style={{ color: '#9ca3af', fontSize: 12 }}></i>
              </button>

              {/* Expanded panel */}
              {screeningExpanded && (
                <div style={{
                  border: screenOverall === 'fail' ? '1.5px solid #fecaca' : '1.5px solid #e5e7eb',
                  borderTop: 'none', borderRadius: '0 0 10px 10px',
                  padding: '14px 16px', background: '#fff',
                }}>
                  {/* เกณฑ์ — ติ๊กถ้าไม่ผ่าน (บางเกณฑ์คำนวณอัตโนมัติ) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                    {SCREEN_CRITERIA.map(c => {
                      const checked = getCheck(c.key)
                      const isAutoKey = c.key in autoFails
                      const autoVal = autoFails[c.key]
                      const hasAutoData = isAutoKey && autoVal !== null
                      // สร้าง description ที่แสดงสถานะปัจจุบัน
                      let statusText = c.hint
                      if (c.key === 'deed' && form.deed_type) {
                        const deedLabel = { chanote: 'โฉนดที่ดิน (น.ส.4จ.)', ns4k: 'น.ส.4ก.', ns3: 'น.ส.3', ns3k: 'น.ส.3ก.', ns3g: 'น.ส.3ข.', sor_por_kor: 'สปก.4-01', other: 'อื่นๆ' }
                        const dl = deedLabel[form.deed_type] || form.deed_type
                        statusText = isDeedOk(form.deed_type) ? `${dl} — ผ่านเกณฑ์ ✓` : `${dl} — ไม่รับพิจารณา ✗`
                      } else if (c.key === 'property_type' && propTypeVal) {
                        statusText = !AGRI_TYPES.includes(propTypeVal) ? `${propTypeVal} — ผ่านเกณฑ์ ✓` : `ที่ดินประเภทนี้ไม่รับพิจารณา ✗`
                      } else if (c.key === 'ltv' && actualLtvPct !== null) {
                        statusText = ltvPass ? `LTV ${actualLtvPct}% — ผ่านเกณฑ์ ✓` : `LTV ${actualLtvPct}% เกินเกณฑ์ ${ltvMax}% ✗`
                      }
                      return (
                        <label key={c.key} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer',
                          padding: '9px 12px', borderRadius: 8,
                          background: checked ? '#fef2f2' : '#f9fafb',
                          border: `1px solid ${checked ? '#fecaca' : '#e5e7eb'}`,
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => setManualFailChecks(prev => ({ ...prev, [c.key]: e.target.checked }))}
                            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#dc2626', marginTop: 2, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: checked ? '#dc2626' : '#374151' }}>
                                {c.label}
                              </span>
                              {hasAutoData && (
                                <span style={{ fontSize: 10, background: '#eff6ff', color: '#3b82f6', borderRadius: 20, padding: '0 7px', fontWeight: 600, lineHeight: '18px' }}>
                                  อัตโนมัติ
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: checked ? '#b91c1c' : '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
                              {statusText}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {screenOverall === 'fail' && (
                      <button type="button"
                        onClick={handleMarkIneligibleAndCancel}
                        disabled={savingScreening}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                          background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                        {savingScreening
                          ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</>
                          : <><i className="fas fa-times-circle"></i> ทรัพย์ไม่เข้าเกณฑ์</>}
                      </button>
                    )}
                    {screenOverall === null && isEdit && (
                      <button type="button"
                        onClick={() => handleSaveScreening()}
                        disabled={screenOverall === null || savingScreening}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                          background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                        {savingScreening
                          ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</>
                          : <><i className="fas fa-check-circle"></i> บันทึก — ผ่านเกณฑ์</>}
                      </button>
                    )}
                  </div>

                  {screeningMsg && (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, textAlign: 'center',
                      color: screeningMsg.includes('⚠️') ? '#b45309' : '#15803d' }}>
                      {screeningMsg}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ===== ★ นัดประเมิน ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              {/* ===== ★ นัดประเมิน (ฝ่ายขายดีลให้) ===== */}
              <div style={{
                background: '#fff8e1', border: '1.5px solid #ffe082', borderRadius: 10,
                padding: 16, marginTop: 12
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#f57c00', marginBottom: 12 }}>
                  <i className="fas fa-calendar-check" style={{ marginRight: 6 }}></i>
                  นัดประเมิน (ฝ่ายขายดีล)
                </div>
                {/* ===== แถว 1: วันนัด + ค่าประเมิน + ประเภทประเมิน ===== */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>วันนัดประเมิน</label>
                    <input
                      type="date"
                      value={form.appraisal_date ? form.appraisal_date.slice(0, 10) : ''}
                      onChange={e => set('appraisal_date', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>ค่าประเมิน (บาท)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="เช่น 2900"
                      value={form.appraisal_fee}
                      onChange={e => set('appraisal_fee', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>ประเภทการประเมิน <span style={{ fontSize: 10, color: '#f57c00', fontWeight: 600 }}>(ฝ่ายขายเลือก)</span></label>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {[
                        { value: 'outside', label: 'ประเมินนอก', icon: 'fas fa-map-marker-alt', color: '#e67e22' },
                        { value: 'inside',  label: 'ประเมินใน',  icon: 'fas fa-home',            color: '#1565c0' },
                      ].map(opt => {
                        const isActive = form.appraisal_type === opt.value
                        return (
                          <button key={opt.value} type="button"
                            onClick={() => set('appraisal_type', opt.value)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                              border: `2px solid ${isActive ? opt.color : '#e2e8f0'}`,
                              background: isActive ? opt.color : '#fff',
                              color: isActive ? '#fff' : '#64748b',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}>
                            <i className={opt.icon} style={{ fontSize: 11 }}></i>
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                {/* ===== แถว 2: ผลประเมิน (read-only จากฝ่ายประเมิน) ===== */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 4 }}>ผลประเมิน (อัพเดทโดยฝ่ายประเมิน)</div>
                  {caseInfo?.appraisal_result ? (
                    <div style={{
                      padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: caseInfo.appraisal_result === 'passed' ? '#e8f5e9' : '#ffebee',
                      color: caseInfo.appraisal_result === 'passed' ? '#2e7d32' : '#c62828',
                      border: `1px solid ${caseInfo.appraisal_result === 'passed' ? '#a5d6a7' : '#ef9a9a'}`,
                      display: 'inline-block'
                    }}>
                      <i className={`fas fa-${caseInfo.appraisal_result === 'passed' ? 'check-circle' : 'times-circle'}`} style={{ marginRight: 6 }}></i>
                      {caseInfo.appraisal_result === 'passed' ? 'ผ่านการประเมิน' : 'ไม่ผ่านการประเมิน'}
                    </div>
                  ) : (
                    <div style={{ padding: '9px 14px', borderRadius: 8, fontSize: 13, color: '#888', background: '#f5f5f5', border: '1px solid #e0e0e0', display: 'inline-block' }}>
                      รอผลจากฝ่ายประเมิน
                    </div>
                  )}
                </div>

                {/* ===== ผลเช็คราคา (จากฝ่ายประเมิน — read-only) ===== */}
                {isEdit && (
                  <div style={{ marginTop: 14, padding: '12px 14px', background: '#fdf4ff', borderRadius: 8, border: `1.5px solid ${caseInfo?.check_price_value ? '#d8b4fe' : '#e9d5ff'}` }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#7c3aed', marginBottom: 8 }}>
                      <i className="fas fa-tags" style={{ marginRight: 6 }}></i> ผลเช็คราคา
                      <span style={{ fontSize: 10, background: '#ede9fe', color: '#7c3aed', borderRadius: 10, padding: '1px 7px', fontWeight: 600, marginLeft: 6 }}>ฝ่ายประเมิน/อนุมัติกรอก</span>
                    </div>
                    {caseInfo?.check_price_value ? (
                      <>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#6d28d9', marginBottom: 4 }}>
                          ฿{Number(caseInfo.check_price_value).toLocaleString('th-TH')}
                        </div>
                        {caseInfo.check_price_detail && (
                          <div style={{ fontSize: 12, color: '#666', background: '#f5f3ff', padding: '6px 10px', borderRadius: 6, marginTop: 4 }}>
                            <i className="fas fa-info-circle" style={{ marginRight: 4, color: '#a78bfa' }}></i>
                            {caseInfo.check_price_detail}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: '#c4b5fd', fontStyle: 'italic' }}>
                        <i className="fas fa-clock" style={{ marginRight: 5 }}></i>รอฝ่ายประเมินกรอกผลเช็คราคา
                      </div>
                    )}
                  </div>
                )}

                {/* ===== ค่าประเมิน — แนบสลิปตอนสร้างใหม่ ===== */}
                {!isEdit && (
                  <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, border: '1px solid #ffe082' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#e65100', marginBottom: 10 }}>
                      <i className="fas fa-receipt" style={{ marginRight: 6 }}></i> สลิปค่าประเมิน
                    </div>
                    {/* แสดงชื่อไฟล์ที่เลือก */}
                    {slipFiles.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: '#fff9c4', borderRadius: 8, border: '1px solid #fff176' }}>
                        <i className="fas fa-file-image" style={{ color: '#f57f17', fontSize: 18 }}></i>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#555', wordBreak: 'break-all' }}>
                          {slipFiles[0].name}
                        </div>
                        <button type="button"
                          onClick={() => setSlipFiles([])}
                          style={{ padding: '3px 8px', background: '#ffccbc', border: 'none', borderRadius: 5, fontSize: 11, cursor: 'pointer', color: '#bf360c' }}>
                          ✕ ลบ
                        </button>
                      </div>
                    )}
                    <label style={{
                      display: 'block', cursor: 'pointer',
                      background: slipFiles.length > 0 ? '#fffde7' : '#fffff0',
                      border: `2px dashed ${slipFiles.length > 0 ? '#f59e0b' : '#fde68a'}`,
                      borderRadius: 10, padding: 10, transition: 'border-color 0.2s',
                    }}>
                      <input type="file" accept="image/*,.pdf" id="create-slip-file-input" style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files[0]
                          if (f) { setSlipFiles([f]); slipVerify.runVerify(f) }
                          e.target.value = ''
                        }} />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{
                          width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                          background: '#fef3c7', border: '1px solid #fde68a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                        }}>
                          {slipFiles[0] && slipFiles[0].type !== 'application/pdf'
                            ? <img src={URL.createObjectURL(slipFiles[0])} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : slipFiles[0]
                              ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#d97706' }}></i>
                              : <i className="fas fa-receipt" style={{ fontSize: 22, color: '#d97706' }}></i>
                          }
                          {slipFiles.length > 0 && (
                            <button type="button"
                              onClick={e => { e.preventDefault(); e.stopPropagation(); setSlipFiles([]) }}
                              style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                              title="ลบ">✕</button>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                            <i className="fas fa-paperclip" style={{ marginRight: 4 }}></i>
                            {slipFiles.length > 0 ? 'เปลี่ยนสลิป' : 'แนบสลิปค่าประเมิน'}
                          </div>
                          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                            {slipFiles.length > 0
                              ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกแล้ว</span> — {slipFiles[0].name}</>
                              : 'รูปภาพ / PDF'
                            }
                          </div>
                        </div>
                      </div>
                    </label>
                    {/* ★ ผลตรวจสลิป QR */}
                    <SlipVerifyBadge result={slipVerify.verifyResult} verifying={slipVerify.verifying} />
                    {/* วันที่ชำระ */}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#e65100', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-calendar-check" style={{ marginRight: 5 }}></i>วันที่ชำระ:
                      </label>
                      <input
                        type="date"
                        value={form.payment_date || ''}
                        onChange={e => set('payment_date', e.target.value)}
                        style={{ border: '1px solid #fdd835', borderRadius: 6, padding: '4px 8px', fontSize: 12, background: '#fffde7' }}
                      />
                    </div>
                  </div>
                )}

                {/* ===== ค่าประเมิน — สลิปฝ่ายขายอัพโหลด ===== */}
                {isEdit && caseInfo && (
                  <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 8, border: '1px solid #ffe082' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#e65100', marginBottom: 10 }}>
                      <i className="fas fa-receipt" style={{ marginRight: 6 }}></i> ค่าประเมิน
                    </div>
                    {(caseInfo.case_slip_image || caseInfo.slip_image) ? (() => {
                      const slipUrl = caseInfo.case_slip_image || caseInfo.slip_image
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: '#fff9c4', borderRadius: 8, border: '1px solid #fff176' }}>
                          <i className="fas fa-file-image" style={{ color: '#f57f17', fontSize: 18 }}></i>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: '#888', wordBreak: 'break-all' }}>
                              {slipUrl.split('/').pop()}
                            </div>
                          </div>
                          <a
                            href={slipUrl.startsWith('/') ? slipUrl : `/${slipUrl}`}
                            target="_blank" rel="noreferrer"
                            style={{ padding: '4px 12px', background: '#f57f17', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            <i className="fas fa-eye"></i> ดูสลิป
                          </a>
                        </div>
                      )
                    })() : (
                      <p style={{ margin: '0 0 10px', fontSize: 12, color: '#bbb' }}>ยังไม่มีสลิปค่าประเมิน</p>
                    )}
                    <label style={{
                      display: 'block', cursor: uploadingSlip ? 'default' : 'pointer', marginBottom: 8,
                      background: slipFiles.length > 0 ? '#fffde7' : '#fffff0',
                      border: `2px dashed ${slipFiles.length > 0 ? '#f59e0b' : '#fde68a'}`,
                      borderRadius: 10, padding: 10, transition: 'border-color 0.2s',
                    }}>
                      <input type="file" accept="image/*,.pdf" multiple id="slip-file-input" style={{ display: 'none' }}
                        disabled={uploadingSlip}
                        onChange={e => {
                          const files = Array.from(e.target.files)
                          setSlipFiles(files)
                          setSlipMsg('')
                          if (files[0]) slipVerify.runVerify(files[0])
                          e.target.value = ''
                        }} />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{
                          width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                          background: '#fef3c7', border: '1px solid #fde68a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                        }}>
                          {slipFiles[0] && slipFiles[0].type !== 'application/pdf'
                            ? <img src={URL.createObjectURL(slipFiles[0])} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : slipFiles[0]
                              ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#d97706' }}></i>
                              : <i className="fas fa-receipt" style={{ fontSize: 22, color: '#d97706' }}></i>
                          }
                          {slipFiles.length > 0 && !uploadingSlip && (
                            <button type="button"
                              onClick={e => { e.preventDefault(); e.stopPropagation(); setSlipFiles([]); setSlipMsg('') }}
                              style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                              title="ลบ">✕</button>
                          )}
                          {uploadingSlip && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,127,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 18 }}></i>
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                            <i className="fas fa-paperclip" style={{ marginRight: 4 }}></i>
                            {uploadingSlip ? 'กำลังอัพโหลด...' : slipFiles.length > 0 ? `เลือกแล้ว ${slipFiles.length} ไฟล์ — คลิกเพื่อเปลี่ยน` : ((caseInfo.case_slip_image || caseInfo.slip_image) ? 'เปลี่ยนสลิป' : 'แนบสลิป')}
                          </div>
                          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                            {slipFiles.length > 0
                              ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ พร้อมอัพโหลด</span>
                              : 'รูปภาพ / PDF'
                            }
                          </div>
                        </div>
                      </div>
                    </label>
                    {/* ★ ผลตรวจสลิป QR */}
                    <SlipVerifyBadge result={slipVerify.verifyResult} verifying={slipVerify.verifying} />
                    <button onClick={handleUploadSlip} disabled={!slipFiles.length || uploadingSlip}
                      style={{ padding: '6px 14px', background: slipFiles.length ? '#f57f17' : '#bdbdbd', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: slipFiles.length ? 'pointer' : 'not-allowed', opacity: slipFiles.length ? 1 : 0.6 }}>
                      {uploadingSlip ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</> : <><i className="fas fa-upload" style={{ marginRight: 4 }}></i>อัพโหลด</>}
                    </button>
                    {slipMsg && <p style={{ marginTop: 6, fontSize: 12, color: slipMsg.includes('✅') ? '#2e7d32' : '#c62828', margin: '6px 0 0' }}>{slipMsg}</p>}
                    {/* วันที่ชำระ — ฝ่ายขายเป็นคนตั้ง (บันทึกลง lr.payment_date ก่อนมีเคส / cases.payment_date หลังมีเคส) */}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#e65100', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-calendar-check" style={{ marginRight: 5 }}></i>วันที่ชำระ:
                      </label>
                      <input
                        type="date"
                        value={form.payment_date || ''}
                        onChange={e => {
                          const val = e.target.value
                          set('payment_date', val)
                          // ถ้ามีเคสแล้ว → อัพเดท cases.payment_date real-time ด้วย
                          if (caseInfo?.case_id) updateCaseField('payment_date', val)
                        }}
                        style={{ border: '1px solid #fdd835', borderRadius: 6, padding: '4px 8px', fontSize: 12, background: '#fffde7' }}
                      />
                    </div>
                  </div>
                )}
              </div>

{/* section ส้มลบออกแล้ว — status badge ย้ายไปอยู่ใน section ม่วงด้านบน */}

              {/* ★ Property-type Document Checklist placeholder */}
              {(() => {
                const propTypeKey = PROP_CHECKLIST_KEY_MAP[form.property_type]
                const items = propTypeKey ? PROP_TYPE_CHECKLIST[propTypeKey] : null
                if (!items) return null
                const checkedCount = items.filter(it => propChecklist[it.key]).length
                const uploadedPropCount = items.filter(it => (checklistDocs[it.key] || []).length > 0).length
                const ptLabel = propertyTypes.find(t => t.value === form.property_type)?.label || form.property_type
                return (
                  <div style={{
                    background: '#f0fdf4', border: '2px solid #86efac',
                    borderRadius: 10, padding: 16, marginBottom: 8, marginTop: -4
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{
                        background: '#16a34a', color: '#fff', borderRadius: 6,
                        padding: '3px 10px', fontSize: 12, fontWeight: 700
                      }}>
                        {ptLabel}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d', flex: 1 }}>
                        <i className="fas fa-clipboard-list" style={{ marginRight: 6 }}></i>
                        Checklist เอกสารทรัพย์: {ptLabel}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          background: checkedCount === items.length ? '#dcfce7' : '#fef9c3',
                          color: checkedCount === items.length ? '#15803d' : '#92400e',
                          border: `1px solid ${checkedCount === items.length ? '#86efac' : '#fde68a'}`,
                          borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          {savingPropChecklist && <i className="fas fa-spinner fa-spin" style={{ fontSize: 10 }}></i>}
                          ✅ {checkedCount}/{items.length}
                        </div>
                        <div style={{
                          background: uploadedPropCount > 0 ? '#eff6ff' : '#f3f4f6',
                          color: uploadedPropCount > 0 ? '#1d4ed8' : '#9ca3af',
                          border: `1px solid ${uploadedPropCount > 0 ? '#bfdbfe' : '#e5e7eb'}`,
                          borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                        }}>
                          <i className="fas fa-paperclip" style={{ marginRight: 3, fontSize: 10 }}></i>
                          {uploadedPropCount} ไฟล์
                        </div>
                      </div>
                    </div>

                    {!isEdit && (
                      <div style={{
                        background: '#fff8e1', border: '1px dashed #ffc107',
                        borderRadius: 8, padding: '8px 12px', marginBottom: 10,
                        fontSize: 12, color: '#795548', display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        <i className="fas fa-info-circle" style={{ color: '#ffc107' }}></i>
                        กรุณาบันทึกข้อมูลก่อน แล้วกลับมาติ๊กและอัพโหลดเอกสาร
                      </div>
                    )}

                    {/* รายการ checkbox + upload */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map((item) => {
                        const checked = !!propChecklist[item.key]
                        const files = checklistDocs[item.key] || []
                        const hasFiles = files.length > 0
                        const isUploading = uploadingChecklistDoc === item.key
                        return (
                          <div key={item.key} style={{
                            background: '#fff',
                            border: `1px solid ${hasFiles ? '#86efac' : checked ? '#86efac' : '#e5e7eb'}`,
                            borderRadius: 8, padding: '10px 12px',
                            display: 'flex', flexDirection: 'column', gap: 6
                          }}>
                            {/* Row: checkbox + label + upload button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
                              {/* Checkbox — click only on this area to toggle */}
                              <div
                                onClick={() => isEdit && togglePropChecklist(item.key)}
                                style={{
                                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                                  background: checked ? '#16a34a' : '#fff',
                                  border: `2px solid ${checked ? '#16a34a' : '#d1d5db'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                  cursor: isEdit ? 'pointer' : 'default'
                                }}>
                                {checked && <i className="fas fa-check" style={{ color: '#fff', fontSize: 11 }}></i>}
                              </div>
                              <span
                                onClick={() => isEdit && togglePropChecklist(item.key)}
                                style={{
                                  flex: 1, fontSize: 13,
                                  color: checked ? '#15803d' : '#374151',
                                  fontWeight: checked ? 600 : 400,
                                  cursor: isEdit ? 'pointer' : 'default'
                                }}>
                                {item.label}
                                {item.required && <span style={{ color: '#ef4444', marginLeft: 4, fontSize: 11 }}>*</span>}
                              </span>
                              {/* Upload button — ยกเว้น property_photos ใช้ UI ด้านล่างแทน */}
                              {isEdit && item.key !== 'property_photos' && (
                                <label style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: isUploading ? '#e0e0e0' : '#16a34a',
                                  color: '#fff', borderRadius: 6, padding: '4px 10px',
                                  fontSize: 11, fontWeight: 600,
                                  cursor: isUploading ? 'default' : 'pointer',
                                  whiteSpace: 'nowrap', flexShrink: 0
                                }}>
                                  {isUploading
                                    ? <><i className="fas fa-spinner fa-spin" /> กำลังอัพ...</>
                                    : <><i className="fas fa-upload" /> อัพโหลด<span style={{ fontSize: 10, opacity: 0.8, marginLeft: 3 }}>(หลายไฟล์ได้)</span></>
                                  }
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    multiple
                                    style={{ display: 'none' }}
                                    disabled={isUploading}
                                    onChange={e => {
                                      if (e.target.files?.length) {
                                        handleChecklistUpload(item.key, Array.from(e.target.files))
                                        e.target.value = ''
                                      }
                                    }}
                                  />
                                </label>
                              )}
                              {checked && !hasFiles && (
                                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  ✅ ได้รับแล้ว
                                </span>
                              )}
                            </div>

                            {/* property_photos: drag-drop + multi-file upload zone */}
                            {item.key === 'property_photos' && isEdit && (
                              <div style={{ paddingLeft: 30 }}>
                                {/* Drop zone */}
                                <label
                                  style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: 6, padding: '14px 12px',
                                    background: propPhotosDragging ? '#dcfce7' : '#f0fdf4',
                                    border: `2px dashed ${propPhotosDragging ? '#16a34a' : '#86efac'}`,
                                    borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                                    minHeight: 72
                                  }}
                                  onDragOver={e => { e.preventDefault(); setPropPhotosDragging(true) }}
                                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPropPhotosDragging(false) }}
                                  onDrop={e => {
                                    e.preventDefault()
                                    setPropPhotosDragging(false)
                                    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
                                    // ลากวาง → อัพโหลดทันที ไม่ผ่าน queue
                                    if (dropped.length) handleChecklistUpload('property_photos', dropped)
                                  }}
                                >
                                  <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
                                    onChange={e => setPropPhotosQueue(prev => [...prev, ...Array.from(e.target.files)])} />
                                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: 22, color: '#16a34a' }} />
                                  <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600, textAlign: 'center' }}>
                                    ลากไฟล์มาวาง หรือ คลิกเพื่อเลือก
                                  </span>
                                  <span style={{ fontSize: 11, color: '#6b7280' }}>รองรับรูปและ PDF หลายไฟล์พร้อมกัน</span>
                                </label>

                                {/* Queue preview + upload button */}
                                {propPhotosQueue.length > 0 && (
                                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {/* Mini previews */}
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                                      {propPhotosQueue.map((f, i) => (
                                        <div key={i} style={{ position: 'relative' }}>
                                          {f.type === 'application/pdf' ? (
                                            <div style={{
                                              width: 44, height: 44, borderRadius: 6, border: '1px solid #86efac',
                                              background: '#fff3e0', display: 'flex', flexDirection: 'column',
                                              alignItems: 'center', justifyContent: 'center', gap: 1
                                            }}>
                                              <i className="fas fa-file-pdf" style={{ fontSize: 16, color: '#f57c00' }} />
                                              <span style={{ fontSize: 7, color: '#f57c00', fontWeight: 700 }}>PDF</span>
                                            </div>
                                          ) : (
                                            <img
                                              src={URL.createObjectURL(f)}
                                              alt=""
                                              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #86efac' }}
                                            />
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => setPropPhotosQueue(prev => prev.filter((_, idx) => idx !== i))}
                                            style={{
                                              position: 'absolute', top: -4, right: -4,
                                              width: 16, height: 16, borderRadius: '50%',
                                              background: '#e53935', border: 'none', color: '#fff',
                                              fontSize: 8, cursor: 'pointer', display: 'flex',
                                              alignItems: 'center', justifyContent: 'center', padding: 0
                                            }}>
                                            <i className="fas fa-times" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isUploading}
                                      onClick={() => {
                                        handleChecklistUpload('property_photos', propPhotosQueue)
                                        setPropPhotosQueue([])
                                      }}
                                      style={{
                                        background: isUploading ? '#e0e0e0' : '#16a34a', color: '#fff',
                                        border: 'none', borderRadius: 8, padding: '8px 16px',
                                        fontSize: 12, fontWeight: 700, cursor: isUploading ? 'default' : 'pointer',
                                        whiteSpace: 'nowrap', flexShrink: 0
                                      }}>
                                      {isUploading
                                        ? <><i className="fas fa-spinner fa-spin" /> อัพโหลด...</>
                                        : <><i className="fas fa-upload" /> อัพโหลด {propPhotosQueue.length} ไฟล์</>
                                      }
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Thumbnails */}
                            {hasFiles && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 30 }}>
                                {files.map((fp, fi) => {
                                  const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(fp)
                                  const isPdf = /\.pdf$/i.test(fp)
                                  return (
                                    <div key={fi} style={{ position: 'relative', display: 'inline-flex' }}>
                                      {isImg ? (
                                        <img
                                          src={`/${fp}`}
                                          alt=""
                                          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}
                                          onClick={() => window.open(`/${fp}`, '_blank')}
                                        />
                                      ) : (
                                        <div
                                          onClick={() => window.open(`/${fp}`, '_blank')}
                                          style={{
                                            width: 56, height: 56, borderRadius: 6, border: '1px solid #ddd',
                                            background: isPdf ? '#fff3e0' : '#f5f5f5',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', fontSize: 10, color: '#666', gap: 2
                                          }}>
                                          <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file'}`}
                                            style={{ fontSize: 20, color: isPdf ? '#f57c00' : '#90a4ae' }} />
                                          PDF
                                        </div>
                                      )}
                                      {isEdit && (
                                        <button
                                          type="button"
                                          onClick={() => handleChecklistRemove(item.key, fp)}
                                          style={{
                                            position: 'absolute', top: -5, right: -5,
                                            width: 18, height: 18, borderRadius: '50%',
                                            background: '#e53935', border: 'none', color: '#fff',
                                            fontSize: 9, cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', padding: 0
                                          }}>
                                          <i className="fas fa-times" />
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 4, color: '#16a34a' }}></i>
                      ติ๊กเครื่องหมายเมื่อได้รับเอกสาร • กดอัพโหลดเพื่อแนบไฟล์ภาพหรือ PDF | * หมายถึงเอกสารบังคับ
                    </div>
                  </div>
                )
              })()}

              {/* ===== วีดีโอทรัพย์ — อัพโหลดผ่าน checklist ===== */}
              {isEdit && (
                <div style={{ marginTop: 14, padding: '12px 16px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-video"></i> วีดีโอทรัพย์
                    </span>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: uploadingChecklistDoc === 'property_video' ? '#e0e0e0' : '#7c3aed',
                      color: '#fff', borderRadius: 7, padding: '5px 14px',
                      fontSize: 12, fontWeight: 600, cursor: uploadingChecklistDoc === 'property_video' ? 'default' : 'pointer',
                      whiteSpace: 'nowrap'
                    }}>
                      {uploadingChecklistDoc === 'property_video'
                        ? <><i className="fas fa-spinner fa-spin" /> กำลังอัพ...</>
                        : <><i className="fas fa-upload" /> อัพโหลดวีดีโอ</>
                      }
                      <input type="file" accept="video/*" multiple style={{ display: 'none' }}
                        disabled={uploadingChecklistDoc === 'property_video'}
                        onChange={e => {
                          if (e.target.files?.length) {
                            handleChecklistUpload('property_video', Array.from(e.target.files))
                            e.target.value = ''
                          }
                        }} />
                    </label>
                  </div>
                  {/* Thumbnails ของวีดีโอที่อัพแล้ว */}
                  {(checklistDocs.property_video || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {(checklistDocs.property_video || []).map((fp, fi) => (
                        <div key={fi} style={{ position: 'relative', display: 'inline-flex' }}>
                          <div
                            onClick={() => window.open(`/${fp}`, '_blank')}
                            style={{
                              width: 64, height: 64, borderRadius: 8,
                              background: '#ede9fe', border: '1.5px solid #c4b5fd',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: 10, color: '#7c3aed', gap: 3
                            }}>
                            <i className="fas fa-play-circle" style={{ fontSize: 22, color: '#7c3aed' }} />
                            <span style={{ fontSize: 9, fontWeight: 600 }}>VDO</span>
                          </div>
                          <button type="button"
                            onClick={() => handleChecklistRemove('property_video', fp)}
                            style={{
                              position: 'absolute', top: -5, right: -5,
                              width: 18, height: 18, borderRadius: '50%',
                              background: '#e53935', border: 'none', color: '#fff',
                              fontSize: 9, cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', padding: 0
                            }}>
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* แสดงวีดีโอเก่าจาก images column (backward compat) */}
                  {isEdit && existingImages.filter(p => p.includes('videos')).length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <small style={{ color: '#9ca3af', fontSize: 10 }}>วีดีโอเก่า:</small>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {existingImages.filter(p => p.includes('videos')).map((fp, fi) => (
                          <div key={fi}
                            onClick={() => window.open(`/${fp}`, '_blank')}
                            style={{
                              width: 56, height: 56, borderRadius: 6, background: '#f3f0ff', border: '1px solid #c4b5fd',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: 9, color: '#7c3aed', gap: 2
                            }}>
                            <i className="fas fa-play-circle" style={{ fontSize: 18 }} />
                            <span>VDO</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* ===== ★ Appointments: นัดหมาย ===== */}
            {isEdit && caseInfo && (
              <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid #e3f2fd', background: '#f9fdff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1565c0' }}>
                    <i className="fas fa-calendar-alt" style={{ marginRight: 8 }}></i>นัดหมาย
                  </h3>
                  <button type="button" onClick={() => setShowApptForm(v => !v)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#1565c0', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <i className="fas fa-plus"></i> เพิ่มนัด
                  </button>
                </div>
                {showApptForm && (
                  <div style={{ background: '#e3f2fd', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#1565c0', display: 'block', marginBottom: 4 }}>ประเภทนัด *</label>
                        <select value={newAppt.appt_type} onChange={e => setNewAppt(p => ({ ...p, appt_type: e.target.value }))}
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #90caf9', fontSize: 12 }}>
                          <option value="valuation">🏠 นัดประเมินทรัพย์</option>
                          <option value="transaction">🏛️ นัดกรมที่ดิน</option>
                          <option value="call">📞 โทรหาลูกหนี้</option>
                          <option value="other">📌 อื่นๆ</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#1565c0', display: 'block', marginBottom: 4 }}>วันที่นัด *</label>
                        <input type="date" value={newAppt.appt_date} onChange={e => setNewAppt(p => ({ ...p, appt_date: e.target.value }))}
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #90caf9', fontSize: 12, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#1565c0', display: 'block', marginBottom: 4 }}>เวลา</label>
                        <input type="time" value={newAppt.appt_time} onChange={e => setNewAppt(p => ({ ...p, appt_time: e.target.value }))}
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #90caf9', fontSize: 12, boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#1565c0', display: 'block', marginBottom: 4 }}>สถานที่ / Google Maps</label>
                        <input type="text" value={newAppt.location} onChange={e => setNewAppt(p => ({ ...p, location: e.target.value }))}
                          placeholder="ที่อยู่หรือลิงก์แผนที่..."
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #90caf9', fontSize: 12, boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#1565c0', display: 'block', marginBottom: 4 }}>หมายเหตุ</label>
                      <input type="text" value={newAppt.notes} onChange={e => setNewAppt(p => ({ ...p, notes: e.target.value }))}
                        placeholder="รายละเอียดเพิ่มเติม..."
                        style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #90caf9', fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" disabled={savingAppt || !newAppt.appt_date}
                        onClick={async () => {
                          if (!newAppt.appt_date) return
                          setSavingAppt(true)
                          try {
                            const res = await fetch(`${API}/cases/${caseInfo.case_id}/appointments`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                              body: JSON.stringify(newAppt),
                            })
                            const d = await res.json()
                            if (d.success) {
                              setShowApptForm(false)
                              setNewAppt({ appt_type: 'valuation', appt_date: '', appt_time: '', location: '', notes: '' })
                              fetch(`${API}/cases/${caseInfo.case_id}/appointments`, { headers: { Authorization: `Bearer ${token()}` } })
                                .then(r => r.json()).then(r2 => { if (r2.success) setAppointments(r2.data || []) })
                            } else alert(d.error || 'บันทึกไม่สำเร็จ')
                          } finally { setSavingAppt(false) }
                        }}
                        style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: '#1565c0', color: '#fff', fontSize: 12, fontWeight: 700, cursor: savingAppt ? 'wait' : 'pointer' }}>
                        {savingAppt ? '⏳...' : '✅ บันทึกนัด'}
                      </button>
                      <button type="button" onClick={() => setShowApptForm(false)}
                        style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #ccc', background: '#fff', fontSize: 12, cursor: 'pointer' }}>ยกเลิก</button>
                    </div>
                  </div>
                )}
                {appointments.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>ยังไม่มีนัดหมาย</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {appointments.map(a => {
                      const typeMap = { valuation: { label: '🏠 นัดประเมิน', color: '#1565c0' }, transaction: { label: '🏛️ นัดกรมที่ดิน', color: '#6a1b9a' }, call: { label: '📞 โทร', color: '#2e7d32' }, other: { label: '📌 อื่นๆ', color: '#e65100' } }
                      const t = typeMap[a.appt_type] || typeMap.other
                      const statusColor = a.status === 'completed' ? '#27ae60' : a.status === 'cancelled' ? '#e74c3c' : '#1565c0'
                      return (
                        <div key={a.id} style={{ background: '#fff', border: `1px solid ${t.color}33`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: t.color }}>{t.label}</span>
                              <span style={{ fontSize: 12, color: '#555' }}>
                                {a.appt_date ? new Date(a.appt_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                {a.appt_time ? ` ${a.appt_time.slice(0, 5)} น.` : ''}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44` }}>
                                {a.status === 'completed' ? 'เสร็จแล้ว' : a.status === 'cancelled' ? 'ยกเลิก' : a.status === 'rescheduled' ? 'เลื่อนนัด' : 'กำหนดไว้'}
                              </span>
                            </div>
                            {a.location && <div style={{ fontSize: 12, color: '#555' }}><i className="fas fa-map-marker-alt" style={{ marginRight: 4 }}></i>{a.location}</div>}
                            {a.notes && <div style={{ fontSize: 12, color: '#888' }}><i className="fas fa-sticky-note" style={{ marginRight: 4 }}></i>{a.notes}</div>}
                          </div>
                          {a.status === 'scheduled' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button type="button" title="ทำเสร็จแล้ว"
                                onClick={async () => {
                                  await fetch(`${API}/appointments/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status: 'completed' }) })
                                  fetch(`${API}/cases/${caseInfo.case_id}/appointments`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(r2 => { if (r2.success) setAppointments(r2.data || []) })
                                }}
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #27ae60', background: '#f0fff4', color: '#27ae60', fontSize: 11, cursor: 'pointer' }}>✅</button>
                              <button type="button" title="ยกเลิกนัด"
                                onClick={async () => {
                                  if (!window.confirm('ยกเลิกนัดหมายนี้?')) return
                                  await fetch(`${API}/appointments/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status: 'cancelled' }) })
                                  fetch(`${API}/cases/${caseInfo.case_id}/appointments`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).then(r2 => { if (r2.success) setAppointments(r2.data || []) })
                                }}
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff0f0', color: '#e74c3c', fontSize: 11, cursor: 'pointer' }}>✕</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ★ กระดิ่งแจ้งฝ่ายต่างๆ — ฝ่ายขายเป็นตัวกลาง */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fas fa-satellite-dish" style={{ marginRight: 5 }}></i>ส่งกระดิ่งแจ้งฝ่าย
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>

                {/* ★ ฝ่ายประเมิน — orange */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifyAppraisal ? '#fff7ed' : '#fafafa',
                  border: `2px solid ${notifyAppraisal ? '#f97316' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifyAppraisal ? '0 0 0 3px rgba(249,115,22,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input
                    type="checkbox"
                    checked={notifyAppraisal}
                    onChange={e => setNotifyAppraisal(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifyAppraisal ? '#ea580c' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifyAppraisal && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายประเมิน
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>แจ้งให้ไปประเมินทรัพย์</div>
                  </div>
                </label>

                {/* ★ ฝ่ายอนุมัติ — blue */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifyApproval ? '#eff6ff' : '#fafafa',
                  border: `2px solid ${notifyApproval ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifyApproval ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input
                    type="checkbox"
                    checked={notifyApproval}
                    onChange={e => setNotifyApproval(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#3b82f6', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifyApproval ? '#1d4ed8' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifyApproval && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายอนุมัติสินเชื่อ
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>ส่งให้พิจารณาอนุมัติ</div>
                  </div>
                </label>

                {/* ★ ฝ่ายนิติ — purple */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifyLegal ? '#faf5ff' : '#fafafa',
                  border: `2px solid ${notifyLegal ? '#a855f7' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifyLegal ? '0 0 0 3px rgba(168,85,247,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input
                    type="checkbox"
                    checked={notifyLegal}
                    onChange={e => setNotifyLegal(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#a855f7', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifyLegal ? '#7e22ce' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifyLegal && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายนิติ
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>ส่งให้ดูแลด้านกฎหมาย</div>
                  </div>
                </label>

              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '12px 32px', flex: 1 }}>
                {submitting ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> {isEdit ? 'อัพเดทข้อมูล' : 'บันทึกข้อมูล'}</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '12px 24px' }}>
                กลับ
              </button>
              {/* ปุ่มยกเลิกเคส — เฉพาะตอน edit + ฝ่ายขาย/admin/approval กดได้ → รออนุมัติจาก super_admin */}
              {isEdit && caseInfo && (
                <CancelCaseButton
                  caseId={caseInfo.id}
                  caseCode={caseInfo.case_code}
                  caseStatus={caseInfo.status}
                  onSuccess={() => navigate(-1)}
                />
              )}
            </div>
          </div>
        </div>

      </form>

      <style>{`
        @keyframes ocrFlashIn {
          from { opacity: 0; transform: scale(0.8) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
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

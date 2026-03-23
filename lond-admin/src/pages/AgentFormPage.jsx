import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '../styles/sales.css'
import MapPreview from '../components/MapPreview'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales'

const propertyTypes = [
  { value: 'land', label: 'ที่ดินเปล่า' },
  { value: 'house', label: 'บ้านเดี่ยว' },
  { value: 'condo', label: 'คอนโด' },
  { value: 'townhouse', label: 'ทาวน์เฮ้าส์' },
  { value: 'shophouse', label: 'ตึกแถว' },
  { value: 'other', label: 'อื่นๆ' },
]

const propertyTypeLabel = {
  house: 'บ้าน', townhouse: 'ทาวน์โฮม', condo: 'คอนโด',
  single_house: 'บ้านเดี่ยว (สร้างเอง)', shophouse: 'ตึกแถว',
  apartment: 'หอพัก / อพาร์ตเมนต์', land: 'ที่ดินเปล่า', other: 'อื่นๆ'
}

const deedTypes = [
  { value: 'chanote', label: 'โฉนดที่ดิน (น.ส.4)', ok: true },
  { value: 'ns4k', label: 'น.ส.4ก.', ok: true },
  { value: 'ns3', label: 'นส.3', ok: false },
  { value: 'ns3k', label: 'นส.3ก.', ok: false },
  { value: 'spk', label: 'ที่ดิน ส.ป.ก.', ok: false },
  { value: 'other', label: 'อื่นๆ', ok: null },
]

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

const statusBadge = {
  new: 'badge-pending', contacting: 'badge-pending', incomplete: 'badge-pending',
  awaiting_appraisal_fee: 'badge-pending', appraisal_scheduled: 'badge-approve',
  appraisal_passed: 'badge-paid', appraisal_not_passed: 'badge-cancelled',
  pending_approve: 'badge-approve', credit_approved: 'badge-paid',
  pending_auction: 'badge-auction', preparing_docs: 'badge-approve',
  legal_scheduled: 'badge-transaction', legal_completed: 'badge-transaction',
  completed: 'badge-completed', cancelled: 'badge-cancelled'
}
const statusLabel = {
  new: 'เคสใหม่', contacting: 'กำลังติดต่อ', incomplete: 'ข้อมูลไม่ครบ',
  awaiting_appraisal_fee: 'รอชำระค่าประเมิน', appraisal_scheduled: 'นัดประเมินแล้ว',
  appraisal_passed: 'ผ่านประเมินแล้ว', appraisal_not_passed: 'ไม่ผ่านประเมิน',
  pending_approve: 'รออนุมัติวงเงิน', credit_approved: 'อนุมัติวงเงินแล้ว',
  pending_auction: 'รอประมูล', preparing_docs: 'เตรียมเอกสาร',
  legal_scheduled: 'นัดนิติกรรมแล้ว', legal_completed: 'ทำนิติกรรมเสร็จสิ้น',
  completed: 'เสร็จสมบูรณ์', cancelled: 'ยกเลิก'
}

// ── Checklist เอกสารทรัพย์ ──
const PROPERTY_DOCS = [
  { key: 'deed',      label: 'โฉนดที่ดิน (ฉบับจริง/สำเนา)',                    icon: 'fa-scroll',        color: '#1565c0', required: true,  accept: 'image/*,.pdf', multiple: true,  hasOcr: true },
  { key: 'permit',    label: 'ใบอนุญาตก่อสร้าง / ใบรับรองการก่อสร้าง',          icon: 'fa-hard-hat',      color: '#e65100', required: false, accept: 'image/*,.pdf', multiple: true,  hasOcr: false },
  { key: 'land_tax',  label: 'หลักฐานชำระภาษีที่ดิน (ภ.บ.น.5 / ภ.ด.8)',       icon: 'fa-receipt',       color: '#6a1b9a', required: true,  accept: 'image/*,.pdf', multiple: false, hasOcr: false },
  { key: 'lease',     label: 'สัญญาเช่า (ถ้าปล่อยเช่า)',                        icon: 'fa-file-signature', color: '#0288d1', required: false, accept: 'image/*,.pdf', multiple: false, hasOcr: false },
  { key: 'commerce',  label: 'ทะเบียนพาณิชย์ (ถ้าประกอบการค้า)',               icon: 'fa-store',         color: '#00695c', required: false, accept: 'image/*,.pdf', multiple: false, hasOcr: false },
  { key: 'debt_free', label: 'ใบปลอดภาระ (ปลอดหนี้จากสถาบันการเงิน)',          icon: 'fa-certificate',   color: '#c62828', required: true,  accept: 'image/*,.pdf', multiple: false, hasOcr: false },
  { key: 'maps',      label: 'แผนที่/Google Maps ทำเล',                         icon: 'fa-map-marked-alt', color: '#558b2f', required: false, accept: 'image/*,.pdf', multiple: false, hasOcr: false },
]

export default function AgentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const fileRefs = useRef({})
  const debtorDropdownRef = useRef(null)

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agentCode, setAgentCode] = useState('')
  const [debtorCode, setDebtorCode] = useState('')
  const [newAgentId, setNewAgentId] = useState(null)

  // ── Agent selection (create mode) ──
  const [agentList, setAgentList] = useState([])
  const [agentSearch, setAgentSearch] = useState('')
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [selectedAgentInfo, setSelectedAgentInfo] = useState(null)

  // ── Debtor info (create mode) ──
  const [debtor, setDebtor] = useState({
    contact_name: '', contact_phone: '', property_type: '', property_type_other: '',
    loan_type_detail: '',
    has_obligation: 'no', obligation_count: '',
    province: '', district: '', subdistrict: '',
    house_no: '', village_name: '', additional_details: '',
    location_url: '', deed_number: '', deed_type: '', land_area: '',
    desired_amount: '', interest_rate: '', occupation: '', monthly_income: '',
    loan_purpose: '', contract_years: '', net_desired_amount: '',
  })

  // ── Document checklist files (create mode) ──
  const [docFiles, setDocFilesState] = useState({
    deed: null, permit: null, photos: null,
    land_tax: null, lease: null, commerce: null, debt_free: null, maps: null
  })
  const setDocFile = (key, arr) => setDocFilesState(prev => ({ ...prev, [key]: arr && arr.length > 0 ? arr : null }))

  // ── Deed OCR ──
  const [deedOcrLoading, setDeedOcrLoading] = useState(false)
  const [deedOcrFilled, setDeedOcrFilled] = useState(null)
  const [ocrFlash, setOcrFlash] = useState(null)

  // ── Video (create mode) ──
  const [videoFiles, setVideoFiles] = useState(null)

  // ── Edit mode state ──
  const [agent, setAgent] = useState({
    full_name: '', nickname: '', phone: '', email: '', line_id: '', facebook: '', national_id: '',
    status: 'active', id_card_files: null,
    date_of_birth: '', national_id_expiry: '',
    area: '', address: '',
    bank_name: '', bank_account_number: '', bank_account_name: '',
  })

  const [existingIdCard, setExistingIdCard] = useState(null)
  const [removeIdCard, setRemoveIdCard] = useState(false)
  const [existingHouseReg, setExistingHouseReg] = useState(null)
  const [removeHouseReg, setRemoveHouseReg] = useState(false)
  const [houseRegFile, setHouseRegFile] = useState(null)
  const [houseOcrLoading, setHouseOcrLoading] = useState(false)
  const [houseOcrMsg, setHouseOcrMsg] = useState('')
  const [passbookFile, setPassbookFile] = useState(null)
  const [passbookOcrLoading, setPassbookOcrLoading] = useState(false)
  const [passbookOcrMsg, setPassbookOcrMsg] = useState('')
  const [agentOcrLoading, setAgentOcrLoading] = useState(false)
  const [agentOcrFilled, setAgentOcrFilled] = useState(null)
  const [linkedDebtors, setLinkedDebtors] = useState([])
  const [existingDebtors, setExistingDebtors] = useState([])
  const [showLinkPanel, setShowLinkPanel] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
  const [linkingId, setLinkingId] = useState(null)
  const [linkMsg, setLinkMsg] = useState('')

  // ── Create mode: pre-select debtors BEFORE submit ──
  const [preSelectedDebtors, setPreSelectedDebtors] = useState([])
  const [preSelectSearch, setPreSelectSearch] = useState('')
  const [showDebtorDropdown, setShowDebtorDropdown] = useState(false)

  // ── Create mode: inline debtor link panel (after broker created) ──
  const [showCreateLinkPanel, setShowCreateLinkPanel] = useState(false)
  const [createLinkSearch, setCreateLinkSearch] = useState('')
  const [createLinkingId, setCreateLinkingId] = useState(null)
  const [createLinkMsg, setCreateLinkMsg] = useState('')
  const [createLinkedDebtors, setCreateLinkedDebtors] = useState([])

  const xBtnStyle = {
    background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%',
    width: 18, height: 18, fontSize: 9, cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
    verticalAlign: 'middle', marginLeft: 6
  }

  // ── Load agents list (for selector) ──
  useEffect(() => {
    fetch(`${API}/agents`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setAgentList(d.agents || []) })
      .catch(() => {})
  }, [])

  // ── Load debtors (link panel — both create & edit) ──
  useEffect(() => {
    fetch(`${API}/debtors`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setExistingDebtors(d.debtors) })
      .catch(() => {})
  }, [isEdit])

  // ── Load agent data (edit mode) ──
  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    fetch(`${API}/agents/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.agent) {
          const a = d.agent
          const toDate = (d) => { if (!d) return ''; const dt = new Date(d); return isNaN(dt.getTime()) ? '' : dt.toISOString().split('T')[0] }
          setAgent({
            full_name: a.full_name || '', nickname: a.nickname || '', phone: a.phone || '',
            email: a.email || '', line_id: a.line_id || '', facebook: a.facebook || '',
            national_id: a.national_id || '',
            status: a.status || 'active', id_card_files: null,
            date_of_birth: toDate(a.date_of_birth), national_id_expiry: toDate(a.national_id_expiry),
            area: a.area || '', address: a.address || '',
            bank_name: a.bank_name || '', bank_account_number: a.bank_account_number || '', bank_account_name: a.bank_account_name || '',
          })
          setAgentCode(a.agent_code || '')
          setExistingIdCard(a.id_card_image || null)
          setExistingHouseReg(a.house_registration_image || null)
        }
        if (d.linked_debtors) setLinkedDebtors(d.linked_debtors)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const setD = (key, val) => { setDebtor(prev => ({ ...prev, [key]: val })); setErrors(prev => ({ ...prev, [key]: '' })) }
  const setA = (key, val) => { setAgent(prev => ({ ...prev, [key]: val })); setErrors(prev => ({ ...prev, [key]: '' })) }

  const isDeedOk = (v) => v && ['chanote', 'ns4k'].includes(v)
  const isDeedBlacklisted = (v) => v && ['ns3', 'ns3k', 'spk'].includes(v)

  // ── Deed OCR ──
  const handleDeedOcr = async (files, storeFile = true) => {
    if (storeFile) setDocFile('deed', Array.from(files))
    if (!files[0]) return
    setDeedOcrLoading(true)
    setDeedOcrFilled(null)
    try {
      const fd = new FormData()
      fd.append('file', files[0])
      fd.append('doc_type', 'land_deed')
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success && data.extracted) {
        const ex = data.extracted
        const filled = []
        const tryFill = (key, val) => { if (val) { setD(key, val); filled.push(key) } }
        tryFill('deed_number', ex.deed_number)
        tryFill('province', ex.province)
        tryFill('district', ex.district || ex.amphoe)
        tryFill('subdistrict', ex.subdistrict || ex.sub_district)
        tryFill('land_area', ex.land_area)
        if (filled.length > 0) {
          setDeedOcrFilled(filled)
          setOcrFlash(filled)
          setTimeout(() => setOcrFlash(null), 4000)
        }
      }
    } catch (e) {
      console.warn('[DeedOCR] error:', e)
    } finally {
      setDeedOcrLoading(false)
    }
  }

  // ── Agent ID card OCR (edit mode) ──
  const handleAgentIdCardChange = async (files) => {
    setA('id_card_files', files)
    setAgentOcrFilled(null)
    setRemoveIdCard(false)
    if (!files || !files[0]) return
    setAgentOcrLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', files[0])
      fd.append('doc_type', 'id_card')
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success && data.extracted) {
        const ex = data.extracted
        const filled = {}
        
        // Parse date from OCR — handles YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY + พ.ศ.→ค.ศ.
        const fixDate = (str) => {
          if (!str) return null
          str = String(str).trim()
          let y, m, d
          // YYYY-MM-DD or YYYY/MM/DD
          const iso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
          if (iso) { y = parseInt(iso[1]); m = iso[2].padStart(2,'0'); d = iso[3].padStart(2,'0') }
          // DD/MM/YYYY or DD-MM-YYYY
          const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
          if (!iso && dmy) { y = parseInt(dmy[3]); m = dmy[2].padStart(2,'0'); d = dmy[1].padStart(2,'0') }
          if (!y) return null
          if (y > 2400) y -= 543  // พ.ศ. → ค.ศ.
          if (y < 1900 || y > 2100) return null
          return `${y}-${m}-${d}`
        }

        setAgent(prev => {
          const next = { ...prev }
          if (ex.full_name) { next.full_name = ex.full_name; filled.full_name = ex.full_name }
          if (ex.id_number) {
            const raw = ex.id_number.replace(/[^\d]/g, '')
            next.national_id = raw
            filled.national_id = raw
          }
          if (ex.address) { next.address = ex.address; filled.address = ex.address }
          
          if (ex.date_of_birth) { 
            const d = fixDate(ex.date_of_birth)
            if (d) { next.date_of_birth = d; filled.date_of_birth = d }
          }
          if (ex.expire_date) { 
            const d = fixDate(ex.expire_date)
            if (d) { next.national_id_expiry = d; filled.national_id_expiry = d }
          }
          return next
        })
        
        // Also clear any related errors automatically
        setErrors(prev => {
          const nextE = { ...prev }
          if (ex.full_name) nextE.full_name = ''
          if (ex.id_number) nextE.national_id = ''
          return nextE
        })

        if (Object.keys(filled).length > 0) setAgentOcrFilled(filled)
      }
    } catch (e) {
      console.warn('[AgentOCR] error:', e)
    } finally {
      setAgentOcrLoading(false)
    }
  }

  // ── House Registration OCR ──
  const handleHouseRegChange = async (file) => {
    setHouseRegFile(file)
    setRemoveHouseReg(false)
    setHouseOcrMsg('')
    if (!file) return
    setHouseOcrLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', 'house_registration')
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success && data.extracted?.full_address) {
        setAgent(prev => ({ ...prev, address: data.extracted.full_address }))
        setHouseOcrMsg('✅ OCR สำเร็จ — ตรวจสอบที่อยู่ด้วยนะคะ')
      } else {
        setHouseOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกที่อยู่เอง')
      }
    } catch {
      setHouseOcrMsg('⚠️ OCR ล้มเหลว')
    } finally {
      setHouseOcrLoading(false)
    }
  }

  // ── Passbook OCR (Agent) ──
  const handleAgentPassbookOcr = async (file) => {
    setPassbookFile(file)
    setPassbookOcrMsg('')
    if (!file) return
    setPassbookOcrLoading(true)
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
        if (ex.bank_name)      updates.bank_name = ex.bank_name
        if (ex.account_number) updates.bank_account_number = ex.account_number
        if (ex.account_name)   updates.bank_account_name = ex.account_name
        if (Object.keys(updates).length > 0) {
          setAgent(prev => ({ ...prev, ...updates }))
          setPassbookOcrMsg('✅ OCR สำเร็จ — ตรวจสอบข้อมูลธนาคารด้วยนะคะ')
        } else {
          setPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเอง')
        }
      } else {
        setPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเอง')
      }
    } catch {
      setPassbookOcrMsg('⚠️ OCR ล้มเหลว')
    } finally {
      setPassbookOcrLoading(false)
    }
  }

  // ── Link debtor (edit mode) ──
  const handleLinkDebtor = async (debtorId) => {
    setLinkingId(debtorId)
    setLinkMsg('')
    try {
      const res = await fetch(`${API}/agents/${id}/link-debtor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ debtor_id: debtorId }),
      })
      const data = await res.json()
      if (data.success) {
        const r2 = await fetch(`${API}/agents/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
        const d2 = await r2.json()
        if (d2.linked_debtors) setLinkedDebtors(d2.linked_debtors)
        setLinkMsg('เชื่อมลูกหนี้สำเร็จ!')
        setShowLinkPanel(false)
        setLinkSearch('')
        setTimeout(() => setLinkMsg(''), 3000)
      } else {
        setLinkMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setLinkMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setLinkingId(null)
  }

  // ── Link debtor to newly-created broker (create mode) ──
  const handleCreateLinkDebtor = async (debtorId) => {
    if (!newAgentId) return
    setCreateLinkingId(debtorId)
    setCreateLinkMsg('')
    try {
      const res = await fetch(`${API}/agents/${newAgentId}/link-debtor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ debtor_id: debtorId }),
      })
      const data = await res.json()
      if (data.success) {
        const linked = existingDebtors.find(d => d.id === debtorId)
        if (linked) setCreateLinkedDebtors(prev => [...prev, linked])
        setCreateLinkMsg('เชื่อมลูกหนี้สำเร็จ!')
        setCreateLinkSearch('')
        setTimeout(() => setCreateLinkMsg(''), 3000)
      } else {
        setCreateLinkMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setCreateLinkMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setCreateLinkingId(null)
  }

  const validate = () => {
    const err = {}
    if (!agent.full_name.trim()) err.agent_full_name = 'กรุณากรอกชื่อนายหน้า'
    if (!agent.phone.trim()) err.agent_phone = 'กรุณากรอกเบอร์โทรนายหน้า'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const fd = new FormData()

      if (!isEdit) {
        // ── CREATE: สร้างนายหน้าใหม่ (POST /agents) ──
        fd.append('full_name', agent.full_name)
        fd.append('nickname', agent.nickname)
        fd.append('phone', agent.phone)
        fd.append('email', agent.email)
        fd.append('line_id', agent.line_id)
        fd.append('facebook', agent.facebook)
        fd.append('national_id', agent.national_id)
        if (agent.date_of_birth)    fd.append('date_of_birth', agent.date_of_birth)
        if (agent.national_id_expiry) fd.append('national_id_expiry', agent.national_id_expiry)
        if (agent.address)          fd.append('address', agent.address)
        if (agent.area)             fd.append('area', agent.area)
        if (agent.bank_name)           fd.append('bank_name', agent.bank_name)
        if (agent.bank_account_number) fd.append('bank_account_number', agent.bank_account_number)
        if (agent.bank_account_name)   fd.append('bank_account_name', agent.bank_account_name)
        fd.append('status', agent.status)
        if (agent.id_card_files)  { for (const f of agent.id_card_files)  fd.append('id_card_image', f) }
        if (houseRegFile)              fd.append('house_registration_image', houseRegFile)

        const res = await fetch(`${API}/agents`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}` },
          body: fd,
        })
        const data = await res.json()
        if (data.success) {
          if (data.agent_code) setAgentCode(data.agent_code)
          const createdId = data.id
          if (createdId) setNewAgentId(createdId)
          // auto-link pre-selected debtors
          if (createdId && preSelectedDebtors.length > 0) {
            const linked = []
            for (const d of preSelectedDebtors) {
              try {
                const lr = await fetch(`${API}/agents/${createdId}/link-debtor`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                  body: JSON.stringify({ debtor_id: d.id }),
                })
                const ld = await lr.json()
                if (ld.success) linked.push(d)
              } catch {}
            }
            if (linked.length > 0) setCreateLinkedDebtors(linked)
          }
          setSuccess(true)
          // ไม่ navigate ออกทันที — รอให้กดปุ่มเองหรือกดพ่วงลูกหนี้
        } else {
          setErrors({ submit: data.message || 'เกิดข้อผิดพลาด' })
        }
      } else {
        // ── EDIT: อัพเดทนายหน้า (PUT /agents/:id) ──
        fd.append('full_name', agent.full_name)
        fd.append('nickname', agent.nickname)
        fd.append('phone', agent.phone)
        fd.append('email', agent.email)
        fd.append('line_id', agent.line_id)
        fd.append('facebook', agent.facebook)
        fd.append('national_id', agent.national_id)
        if (agent.date_of_birth)      fd.append('date_of_birth', agent.date_of_birth)
        if (agent.national_id_expiry) fd.append('national_id_expiry', agent.national_id_expiry)
        if (agent.address)            fd.append('address', agent.address)
        if (agent.area)               fd.append('area', agent.area)
        if (agent.bank_name)           fd.append('bank_name', agent.bank_name)
        if (agent.bank_account_number) fd.append('bank_account_number', agent.bank_account_number)
        if (agent.bank_account_name)   fd.append('bank_account_name', agent.bank_account_name)
        fd.append('status', agent.status)
        if (agent.id_card_files)   { for (const f of agent.id_card_files) fd.append('id_card_image', f) }
        if (removeIdCard)          fd.append('remove_id_card', '1')
        if (houseRegFile)           fd.append('house_registration_image', houseRegFile)
        if (removeHouseReg)        fd.append('remove_house_registration', '1')

        const res = await fetch(`${API}/agents/${id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token()}` },
          body: fd,
        })
        const data = await res.json()
        if (data.success) {
          if (data.agent_code) setAgentCode(data.agent_code)
          setSuccess(true)
          setTimeout(() => navigate(-1), 800)
        } else {
          setErrors({ submit: data.message || 'เกิดข้อผิดพลาด' })
        }
      }
    } catch {
      setErrors({ submit: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' })
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
        <p style={{ marginTop: 12, color: '#888' }}>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  const filteredAgents = agentSearch
    ? agentList.filter(a =>
        (a.full_name || '').toLowerCase().includes(agentSearch.toLowerCase()) ||
        (a.phone || '').includes(agentSearch) ||
        (a.agent_code || '').toLowerCase().includes(agentSearch.toLowerCase())
      )
    : agentList.slice(0, 12)

  // ─────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-outline" onClick={() => navigate('/sales?tab=agents')} style={{ padding: '8px 16px' }}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-user-tie" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            {isEdit ? 'แก้ไขนายหน้า' : 'สร้างเคสใหม่'}
          </h2>
          {agentCode && (
            <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 12px', background: 'var(--primary)', color: '#fff', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{agentCode}</span>
          )}
          {debtorCode && (
            <span style={{ display: 'inline-block', marginTop: 4, marginLeft: 8, padding: '2px 12px', background: '#1565c0', color: '#fff', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{debtorCode}</span>
          )}
        </div>
      </div>

      {errors.submit && <div className="error-msg" style={{ marginBottom: 16 }}>{errors.submit}</div>}
      {success && !isEdit && (
        <div style={{ marginBottom: 20, padding: '16px 20px', background: '#f0faf5', border: '2px solid #27ae60', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <i className="fas fa-check-circle" style={{ color: '#27ae60', fontSize: 20 }}></i>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1b5e20' }}>สร้างนายหน้าสำเร็จ!</div>
              {agentCode && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>รหัส: <strong style={{ color: 'var(--primary)' }}>{agentCode}</strong></div>}
            </div>
          </div>
          {/* ── ลูกหนี้ที่เชื่อมไปแล้ว ── */}
          {createLinkedDebtors.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1b5e20', marginBottom: 8 }}>
                <i className="fas fa-link" style={{ marginRight: 5 }}></i>เชื่อมแล้ว {createLinkedDebtors.length} ราย
              </div>
              {createLinkedDebtors.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: '#e8f5e9', borderRadius: 8, marginBottom: 5, fontSize: 12 }}>
                  <i className="fas fa-user" style={{ color: '#2e7d32' }}></i>
                  <span style={{ fontWeight: 600, color: '#1b5e20' }}>{d.contact_name || '(ไม่ระบุชื่อ)'}</span>
                  <span style={{ color: '#888' }}>{d.contact_phone}</span>
                </div>
              ))}
            </div>
          )}
          {createLinkMsg && (
            <div style={{ marginBottom: 10, padding: '7px 12px', background: createLinkMsg.includes('สำเร็จ') ? '#e8f5e9' : '#fdecea', borderRadius: 8, fontSize: 13, color: createLinkMsg.includes('สำเร็จ') ? '#2e7d32' : '#c62828' }}>
              <i className={`fas fa-${createLinkMsg.includes('สำเร็จ') ? 'check-circle' : 'exclamation-circle'}`} style={{ marginRight: 6 }}></i>{createLinkMsg}
            </div>
          )}
          {/* ── แผงค้นหาเชื่อมลูกหนี้ ── */}
          {showCreateLinkPanel && (
            <div style={{ border: '1px solid #bbdefb', borderRadius: 10, padding: 14, marginBottom: 12, background: '#f0f7ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1565C0' }}><i className="fas fa-search" style={{ marginRight: 6 }}></i>ค้นหาลูกหนี้มาเชื่อม</span>
                <button type="button" onClick={() => { setShowCreateLinkPanel(false); setCreateLinkSearch('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
              <input type="text" placeholder="พิมพ์ชื่อ, เบอร์, รหัส LDD..." value={createLinkSearch} onChange={e => setCreateLinkSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #90caf9', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {existingDebtors
                  .filter(d => {
                    const q = createLinkSearch.toLowerCase()
                    if (!q) return true
                    return (d.contact_name || '').toLowerCase().includes(q) || (d.contact_phone || '').includes(q) || (d.debtor_code || '').toLowerCase().includes(q)
                  })
                  .filter(d => !createLinkedDebtors.some(ld => ld.id === d.id))
                  .slice(0, 30)
                  .map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: 6, borderRadius: 8, background: '#fff', border: '1px solid #e3f2fd' }}>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: '#1565C0' }}>
                          {d.debtor_code && <span style={{ marginRight: 6, fontSize: 11, padding: '1px 6px', background: '#1565C0', color: '#fff', borderRadius: 10 }}>{d.debtor_code}</span>}
                          {d.contact_name || '(ไม่ระบุชื่อ)'}
                        </span>
                        <span style={{ color: '#888', marginLeft: 8, fontSize: 12 }}>{d.contact_phone}</span>
                      </div>
                      <button type="button" className="btn btn-primary" style={{ padding: '4px 14px', fontSize: 12 }}
                        disabled={createLinkingId === d.id} onClick={() => handleCreateLinkDebtor(d.id)}>
                        {createLinkingId === d.id ? <i className="fas fa-spinner fa-spin"></i> : 'เชื่อม'}
                      </button>
                    </div>
                  ))}
                {existingDebtors.filter(d => !createLinkedDebtors.some(ld => ld.id === d.id)).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: 12 }}>ไม่พบลูกหนี้</div>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {newAgentId && !showCreateLinkPanel && (
              <button type="button" className="btn btn-outline" style={{ padding: '10px 20px', fontSize: 13, borderColor: '#1565c0', color: '#1565c0' }}
                onClick={() => setShowCreateLinkPanel(true)}>
                <i className="fas fa-link" style={{ marginRight: 7 }}></i>
                เลือกลูกหนี้ที่มีอยู่มาเชื่อม
              </button>
            )}
            {newAgentId && (
              <button type="button" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}
                onClick={() => navigate(`/sales/new?agent_id=${newAgentId}`)}>
                <i className="fas fa-user-plus" style={{ marginRight: 7 }}></i>
                สร้างลูกหนี้ใหม่พ่วงนายหน้านี้
              </button>
            )}
            <button type="button" className="btn btn-outline" style={{ padding: '10px 20px', fontSize: 13 }}
              onClick={() => navigate('/sales?tab=agents')}>
              <i className="fas fa-list" style={{ marginRight: 7 }}></i>
              กลับหน้ารายการนายหน้า
            </button>
          </div>
        </div>
      )}
      {success && isEdit && (
        <div className="success-msg" style={{ marginBottom: 16 }}>
          <i className="fas fa-check-circle"></i> อัพเดทข้อมูลนายหน้าสำเร็จ!
        </div>
      )}

      <form onSubmit={handleSubmit}>


        {/* ════════════════════ CREATE MODE ════════════════════ */}
        {!isEdit && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>

            {/* ===== ซ้าย: ข้อมูลพื้นฐาน ===== */}
            <div>
              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                  <i className="fas fa-user-tie" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                  ข้อมูลนายหน้า
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>ชื่อ-สกุล *</label>
                    <input type="text" placeholder="ชื่อ-นามสกุล" value={agent.full_name} onChange={e => setA('full_name', e.target.value)} />
                    {errors.agent_full_name && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.agent_full_name}</span>}
                  </div>
                  <div className="form-group">
                    <label>ชื่อเล่น</label>
                    <input type="text" placeholder="ชื่อเล่น" value={agent.nickname} onChange={e => setA('nickname', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>เบอร์โทร *</label>
                    <input type="tel" placeholder="0XX-XXX-XXXX" value={agent.phone} onChange={e => setA('phone', e.target.value)} />
                    {errors.agent_phone && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.agent_phone}</span>}
                  </div>
                  <div className="form-group">
                    <label>อีเมล</label>
                    <input type="email" placeholder="email@example.com" value={agent.email} onChange={e => setA('email', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label><i className="fab fa-line" style={{ color: '#00C300', marginRight: 5 }}></i>LINE ID</label>
                    <input type="text" placeholder="@username" value={agent.line_id} onChange={e => setA('line_id', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label><i className="fab fa-facebook" style={{ color: '#1877F2', marginRight: 5 }}></i>Facebook</label>
                    <input type="text" placeholder="ชื่อ Facebook หรือ URL" value={agent.facebook} onChange={e => setA('facebook', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>เลขบัตรประชาชน</label>
                  <input type="text" placeholder="1-XXXX-XXXXX-XX-X" maxLength={13} value={agent.national_id} onChange={e => setA('national_id', e.target.value)} />
                </div>
                {/* ── ข้อมูลส่วนตัว (สำหรับสัญญา) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>วันเกิด <span style={{ fontSize: 11, color: '#999' }}>(สำหรับสัญญา)</span></label>
                    <input type="date" value={agent.date_of_birth} onChange={e => setA('date_of_birth', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>วันหมดอายุบัตรประชาชน</label>
                    <input type="date" value={agent.national_id_expiry} onChange={e => setA('national_id_expiry', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>ที่อยู่ <span style={{ fontSize: 11, color: '#999' }}>(OCR อัตโนมัติจากทะเบียนบ้าน)</span></label>
                  <textarea rows={2} placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                    value={agent.address} onChange={e => setA('address', e.target.value)}
                    style={{ width: '100%', resize: 'vertical', fontSize: 13 }} />
                </div>

                {/* ─── ข้อมูลธนาคาร ─── */}
                <div style={{ borderTop: '1px solid #eee', paddingTop: 14, marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', marginBottom: 10 }}>
                    <i className="fas fa-university" style={{ marginRight: 6 }}></i>ข้อมูลบัญชีธนาคาร
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#999', marginLeft: 6 }}>(OCR อัตโนมัติจากสมุดบัญชี)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>ธนาคาร</label>
                      <input type="text" placeholder="ชื่อธนาคาร"
                        value={agent.bank_name} onChange={e => setA('bank_name', e.target.value)}
                        style={{ fontSize: 13 }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>เลขบัญชี</label>
                      <input type="text" placeholder="xxx-x-xxxxx-x"
                        value={agent.bank_account_number} onChange={e => setA('bank_account_number', e.target.value)}
                        style={{ fontSize: 13 }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>ชื่อบัญชี</label>
                    <input type="text" placeholder="ชื่อ-นามสกุล เจ้าของบัญชี"
                      value={agent.bank_account_name} onChange={e => setA('bank_account_name', e.target.value)}
                      style={{ fontSize: 13 }} />
                  </div>
                </div>
              </div>

              {/* ปุ่มบันทึก (create) */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '12px 32px', flex: 1 }}>
                  {submitting ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-user-plus"></i> เพิ่มนายหน้า</>}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '12px 24px' }}>ยกเลิก</button>
              </div>
            </div>

            {/* ===== ขวา: พื้นที่ + ธนาคาร + สัญญา + tips ===== */}
            <div>
              {/* สถานะและเอกสาร */}
              <div className="card" style={{ padding: 20, marginBottom: 16, border: '1.5px solid #e3f2fd', background: '#f8fbff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 15 }}>
                  <i className="fas fa-id-card" style={{ color: '#1565C0', fontSize: 14 }}></i>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1565C0' }}>สถานะและเอกสารยืนยันตัวตน</span>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>สถานะการใช้งาน</label>
                  <select value={agent.status} onChange={e => setA('status', e.target.value)}
                    style={{ background: '#fff', border: '1.2px solid #90caf9' }}>
                    <option value="active">ใช้งาน (Active)</option>
                    <option value="inactive">ปิดใช้งาน (Inactive)</option>
                  </select>
                </div>

                {/* ── บัตรประชาชน + OCR ── */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'block' }}>รูปหน้าบัตรประชาชน <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}><i className="fas fa-magic" style={{ marginRight: 3 }}></i>OCR อัตโนมัติ</span></label>
                  <label style={{
                    display: 'block', cursor: agentOcrLoading ? 'default' : 'pointer',
                    background: agent.id_card_files?.[0] ? '#f5f3ff' : '#faf5ff',
                    border: `2px dashed ${agent.id_card_files?.[0] ? '#7c3aed' : '#c4b5fd'}`,
                    borderRadius: 10, padding: 12, transition: 'border-color 0.2s',
                  }}>
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} disabled={agentOcrLoading}
                      onChange={e => { if (e.target.files[0]) handleAgentIdCardChange(Array.from(e.target.files)); e.target.value = '' }} />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{
                        width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                        background: '#ede9fe', border: '1px solid #d8b4fe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      }}>
                        {agent.id_card_files?.[0]
                          ? <img src={URL.createObjectURL(agent.id_card_files[0])} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <i className="fas fa-id-card" style={{ fontSize: 26, color: '#a855f7' }}></i>
                        }
                        {agent.id_card_files?.[0] && !agentOcrLoading && (
                          <button type="button"
                            onClick={e => { e.stopPropagation(); setA('id_card_files', null); setAgentOcrFilled(null) }}
                            style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                            title="ลบ">✕</button>
                        )}
                        {agentOcrLoading && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(124,58,237,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 20 }}></i>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#7e22ce', marginBottom: 3 }}>
                          <i className="fas fa-camera" style={{ marginRight: 5 }}></i>
                          {agentOcrLoading ? 'กำลังอ่านบัตร...' : agent.id_card_files?.[0] ? 'เปลี่ยนรูปบัตรประชาชน' : 'สแกน / อัพโหลดบัตรประชาชน'}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>
                          {agentOcrLoading
                            ? <span style={{ color: '#6366f1', fontWeight: 600 }}>AI กำลังอ่านชื่อ-เลขบัตร...</span>
                            : agent.id_card_files?.[0]
                              ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ อัพโหลดแล้ว</span> — คลิกเพื่อเปลี่ยน</>
                              : 'JPG / PNG — กรอกชื่อ-เลขบัตรอัตโนมัติ'
                          }
                        </div>
                        {agentOcrFilled && (
                          <div style={{ marginTop: 4, fontSize: 10, color: '#15803d', fontWeight: 600 }}>
                            <i className="fas fa-check-circle" style={{ marginRight: 3 }}></i>OCR กรอกข้อมูลอัตโนมัติแล้ว
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                </div>

                {/* ── ทะเบียนบ้าน ── */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    สำเนาทะเบียนบ้าน
                    {houseOcrLoading && <span style={{ fontSize: 11, color: '#e65100', display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
                  </label>
                  <label style={{
                    display: 'block', cursor: houseOcrLoading ? 'default' : 'pointer',
                    background: houseRegFile ? '#fff5f5' : '#fdf2f0',
                    border: `2px dashed ${houseRegFile ? '#e53e3e' : '#f5a5a5'}`,
                    borderRadius: 10, padding: 12, transition: 'border-color 0.2s',
                  }}>
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                      disabled={houseOcrLoading}
                      onChange={e => { handleHouseRegChange(e.target.files[0] || null); e.target.value = '' }} />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{
                        width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                        background: '#fee2e2', border: '1px solid #fca5a5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      }}>
                        {houseRegFile && houseRegFile.type !== 'application/pdf'
                          ? <img src={URL.createObjectURL(houseRegFile)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : houseRegFile
                            ? <i className="fas fa-file-pdf" style={{ fontSize: 26, color: '#e53e3e' }}></i>
                            : <i className="fas fa-home" style={{ fontSize: 26, color: '#e53e3e' }}></i>
                        }
                        {houseRegFile && !houseOcrLoading && (
                          <button type="button"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setHouseRegFile(null); setHouseOcrMsg('') }}
                            style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                            title="ลบ">✕</button>
                        )}
                        {houseOcrLoading && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(229,62,62,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 20 }}></i>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#c0392b', marginBottom: 3 }}>
                          <i className="fas fa-upload" style={{ marginRight: 5 }}></i>
                          {houseOcrLoading ? 'กำลัง OCR...' : houseRegFile ? 'เปลี่ยนไฟล์' : 'อัพโหลดสำเนาทะเบียนบ้าน'}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>
                          {houseRegFile
                            ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกแล้ว</span> — {houseRegFile.name}</>
                            : 'JPG / PNG / PDF'
                          }
                        </div>
                        {houseOcrMsg && <div style={{ marginTop: 4, fontSize: 10, color: houseOcrMsg.startsWith('✅') ? '#2e7d32' : '#e65100', fontWeight: 600 }}>{houseOcrMsg}</div>}
                      </div>
                    </div>
                  </label>
                </div>

                <div className="form-group" style={{ marginBottom: 0, marginTop: 14, borderTop: '1px solid #e3f2fd', paddingTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 }}>
                    <span>หน้าสมุดบัญชี (Book Bank)</span>
                    {passbookOcrLoading && <span style={{ fontSize: 11, color: '#1565c0', display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
                  </label>
                  <input type="file" accept="image/*,.pdf"
                    onChange={e => handleAgentPassbookOcr(e.target.files[0] || null)}
                    style={{ fontSize: 12 }} />
                  {passbookOcrMsg && (
                    <div style={{ marginTop: 6, fontSize: 11, padding: '4px 8px', borderRadius: 6,
                      background: passbookOcrMsg.startsWith('✅') ? '#e8f5e9' : '#fff3e0',
                      color: passbookOcrMsg.startsWith('✅') ? '#2e7d32' : '#e65100' }}>
                      {passbookOcrMsg}
                    </div>
                  )}
                  {passbookFile && (
                    <div style={{ position: 'relative', display: 'inline-block', border: '1px solid #ddd', borderRadius: 8, padding: 4, background: '#fff', marginTop: 6 }}>
                      <img src={URL.createObjectURL(passbookFile)} alt="preview" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, display: 'block' }} />
                      <button type="button" onClick={() => { setPassbookFile(null); setPassbookOcrMsg('') }}
                        style={{ ...xBtnStyle, position: 'absolute', top: -8, right: -8, width: 22, height: 22, fontSize: 11, background: '#ff5252' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* คำแนะนำ */}
              <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg,#f0faf5,#e8f5e9)', border: '1.5px solid #a5d6a7', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <i className="fas fa-lightbulb" style={{ color: '#2e7d32', fontSize: 13 }}></i>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#1b5e20' }}>คำแนะนำ</span>
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#2e7d32', lineHeight: 1.9 }}>
                  <li>ชื่อ-สกุล + เบอร์โทร <strong>บังคับกรอก</strong></li>
                  <li>อัพโหลดรูปบัตรฯ → <strong>OCR อัตโนมัติ</strong></li>
                  <li>เลือกลูกหนี้ด้านล่างเพื่อ<strong>เชื่อมพร้อมกัน</strong></li>
                </ul>
              </div>

              {/* ── เชื่อมลูกหนี้ ── */}
              <div className="card" style={{ padding: 16, border: '1.5px solid #bbdefb', background: '#f8fbff' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1565C0', marginBottom: 10 }}>
                  <i className="fas fa-users" style={{ marginRight: 6 }}></i>เชื่อมลูกหนี้
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#888', marginLeft: 5 }}>(ไม่บังคับ)</span>
                </div>

                {/* chips ที่เลือกแล้ว */}
                {preSelectedDebtors.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                    {preSelectedDebtors.map(d => (
                      <span key={d.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 20, fontSize: 12, color: '#1565C0' }}>
                        <span style={{ fontWeight: 600 }}>{d.contact_name || '(ไม่ระบุ)'}</span>
                        <button type="button" onClick={() => setPreSelectedDebtors(prev => prev.filter(x => x.id !== d.id))}
                          style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* dropdown */}
                <div ref={debtorDropdownRef} style={{ position: 'relative', marginBottom: 10 }}>
                  <input type="text" placeholder="ค้นหาลูกหนี้ที่มีอยู่..." value={preSelectSearch}
                    onChange={e => { setPreSelectSearch(e.target.value); setShowDebtorDropdown(true) }}
                    onFocus={() => setShowDebtorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDebtorDropdown(false), 150)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #90caf9', fontSize: 12, boxSizing: 'border-box' }} />
                  {showDebtorDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #90caf9', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                      {(() => {
                        const q = preSelectSearch.toLowerCase()
                        const results = existingDebtors
                          .filter(d => !q || (d.contact_name || '').toLowerCase().includes(q) || (d.contact_phone || '').includes(q) || (d.debtor_code || '').toLowerCase().includes(q))
                          .filter(d => !preSelectedDebtors.some(p => p.id === d.id))
                          .slice(0, 25)
                        if (results.length === 0) return <div style={{ padding: '10px 12px', fontSize: 12, color: '#aaa', textAlign: 'center' }}>ไม่พบลูกหนี้</div>
                        return results.map(d => (
                          <div key={d.id}
                            onMouseDown={() => { setPreSelectedDebtors(prev => [...prev, d]); setPreSelectSearch(''); setShowDebtorDropdown(false) }}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f7ff', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e3f2fd'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <span>
                              {d.debtor_code && <span style={{ fontSize: 10, padding: '1px 5px', background: '#1565C0', color: '#fff', borderRadius: 8, marginRight: 5 }}>{d.debtor_code}</span>}
                              <span style={{ fontWeight: 600 }}>{d.contact_name || '(ไม่ระบุชื่อ)'}</span>
                              <span style={{ color: '#888', marginLeft: 6 }}>{d.contact_phone}</span>
                            </span>
                            <i className="fas fa-plus" style={{ color: '#1565c0', fontSize: 10 }}></i>
                          </div>
                        ))
                      })()}
                    </div>
                  )}
                </div>

                {/* ปุ่มเพิ่มลูกหนี้ใหม่ — ใช้งานได้ทันที */}
                <button type="button"
                  onClick={() => navigate(newAgentId ? `/sales/new?agent_id=${newAgentId}` : '/sales/new')}
                  style={{ width: '100%', padding: '9px 0', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <i className="fas fa-user-plus"></i>เพิ่มลูกหนี้ใหม่
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ════════════════════ EDIT MODE ════════════════════ */}
        {isEdit && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>

            {/* ===== ซ้าย: ข้อมูลพื้นฐาน ===== */}
            <div>
              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                  <i className="fas fa-user-tie" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                  ข้อมูลนายหน้า
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>ชื่อ-สกุล *</label>
                    <input type="text" placeholder="ชื่อ-นามสกุล" value={agent.full_name} onChange={e => setA('full_name', e.target.value)} />
                    {errors.agent_full_name && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.agent_full_name}</span>}
                  </div>
                  <div className="form-group">
                    <label>ชื่อเล่น</label>
                    <input type="text" placeholder="ชื่อเล่น" value={agent.nickname} onChange={e => setA('nickname', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>เบอร์โทร *</label>
                    <input type="tel" placeholder="0XX-XXX-XXXX" value={agent.phone} onChange={e => setA('phone', e.target.value)} />
                    {errors.agent_phone && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.agent_phone}</span>}
                  </div>
                  <div className="form-group">
                    <label>อีเมล</label>
                    <input type="email" placeholder="email@example.com" value={agent.email} onChange={e => setA('email', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label><i className="fab fa-line" style={{ color: '#00C300', marginRight: 5 }}></i>LINE ID</label>
                    <input type="text" placeholder="@username" value={agent.line_id} onChange={e => setA('line_id', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label><i className="fab fa-facebook" style={{ color: '#1877F2', marginRight: 5 }}></i>Facebook</label>
                    <input type="text" placeholder="ชื่อ Facebook หรือ URL" value={agent.facebook} onChange={e => setA('facebook', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>เลขบัตรประชาชน</label>
                  <input type="text" placeholder="1-XXXX-XXXXX-XX-X" maxLength={13} value={agent.national_id} onChange={e => setA('national_id', e.target.value)} />
                </div>
                {/* ── ข้อมูลส่วนตัว (สำหรับสัญญา) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>วันเกิด <span style={{ fontSize: 11, color: '#999' }}>(สำหรับสัญญา)</span></label>
                    <input type="date" value={agent.date_of_birth} onChange={e => setA('date_of_birth', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>วันหมดอายุบัตรประชาชน</label>
                    <input type="date" value={agent.national_id_expiry} onChange={e => setA('national_id_expiry', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>ที่อยู่ <span style={{ fontSize: 11, color: '#999' }}>(OCR อัตโนมัติจากทะเบียนบ้าน)</span></label>
                  <textarea rows={2} placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                    value={agent.address} onChange={e => setA('address', e.target.value)}
                    style={{ width: '100%', resize: 'vertical', fontSize: 13 }} />
                </div>

                {/* ─── ข้อมูลธนาคาร ─── */}
                <div style={{ borderTop: '1px solid #eee', paddingTop: 14, marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', marginBottom: 10 }}>
                    <i className="fas fa-university" style={{ marginRight: 6 }}></i>ข้อมูลบัญชีธนาคาร
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#999', marginLeft: 6 }}>(OCR อัตโนมัติจากสมุดบัญชี)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>ธนาคาร</label>
                      <input type="text" placeholder="ชื่อธนาคาร"
                        value={agent.bank_name} onChange={e => setA('bank_name', e.target.value)}
                        style={{ fontSize: 13 }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>เลขบัญชี</label>
                      <input type="text" placeholder="xxx-x-xxxxx-x"
                        value={agent.bank_account_number} onChange={e => setA('bank_account_number', e.target.value)}
                        style={{ fontSize: 13 }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>ชื่อบัญชี</label>
                    <input type="text" placeholder="ชื่อ-นามสกุล เจ้าของบัญชี"
                      value={agent.bank_account_name} onChange={e => setA('bank_account_name', e.target.value)}
                      style={{ fontSize: 13 }} />
                  </div>
                </div>
              </div>

              {/* ปุ่มบันทึก (edit) */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '12px 32px', flex: 1 }}>
                  {submitting ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> อัพเดทข้อมูล</>}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '12px 24px' }}>ยกเลิก</button>
              </div>
            </div>

            {/* ===== ขวา (edit) ===== */}
            <div>
              {/* สถานะและเอกสาร (Edit) */}
              <div className="card" style={{ padding: 20, marginBottom: 16, border: '1.5px solid #e3f2fd', background: '#f8fbff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 15 }}>
                  <i className="fas fa-id-card" style={{ color: '#1565C0', fontSize: 14 }}></i>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1565C0' }}>สถานะและเอกสารยืนยันตัวตน</span>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>สถานะการใช้งาน</label>
                  <select value={agent.status} onChange={e => setA('status', e.target.value)}
                    style={{ background: '#fff', border: '1.2px solid #90caf9' }}>
                    <option value="active">ใช้งาน (Active)</option>
                    <option value="inactive">ปิดใช้งาน (Inactive)</option>
                  </select>
                </div>

                {/* ── บัตรประชาชน (edit) ── */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'block' }}>รูปหน้าบัตรประชาชน <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}><i className="fas fa-magic" style={{ marginRight: 3 }}></i>OCR อัตโนมัติ</span></label>
                  {/* รูปที่มีอยู่ในระบบ */}
                  {existingIdCard && !agent.id_card_files && (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                      <a href={existingIdCard.startsWith('/') ? existingIdCard : `/${existingIdCard}`} target="_blank" rel="noreferrer">
                        <img src={existingIdCard.startsWith('/') ? existingIdCard : `/${existingIdCard}`} alt="existing" style={{ maxHeight: 100, borderRadius: 8, border: '1px solid #ddd', display: 'block' }} />
                      </a>
                      <button type="button" onClick={() => { setExistingIdCard(null); setRemoveIdCard(true) }}
                        style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#ff5252', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                  <label style={{
                    display: 'block', cursor: agentOcrLoading ? 'default' : 'pointer',
                    background: agent.id_card_files?.[0] ? '#f5f3ff' : '#faf5ff',
                    border: `2px dashed ${agent.id_card_files?.[0] ? '#7c3aed' : '#c4b5fd'}`,
                    borderRadius: 10, padding: 12,
                  }}>
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} disabled={agentOcrLoading}
                      onChange={e => { if (e.target.files[0]) handleAgentIdCardChange(Array.from(e.target.files)); e.target.value = '' }} />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#ede9fe', border: '1px solid #d8b4fe', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {agent.id_card_files?.[0]
                          ? <img src={URL.createObjectURL(agent.id_card_files[0])} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <i className="fas fa-id-card" style={{ fontSize: 26, color: '#a855f7' }}></i>
                        }
                        {agent.id_card_files?.[0] && !agentOcrLoading && (
                          <button type="button" onClick={e => { e.stopPropagation(); setA('id_card_files', null); setAgentOcrFilled(null) }}
                            style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                            title="ลบ">✕</button>
                        )}
                        {agentOcrLoading && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(124,58,237,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 20 }}></i>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#7e22ce', marginBottom: 3 }}>
                          <i className="fas fa-camera" style={{ marginRight: 5 }}></i>
                          {agentOcrLoading ? 'กำลังอ่านบัตร...' : agent.id_card_files?.[0] ? 'เปลี่ยนรูปบัตรประชาชน' : 'สแกน / อัพโหลดบัตรใหม่'}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>
                          {agentOcrLoading ? <span style={{ color: '#6366f1', fontWeight: 600 }}>AI กำลังอ่านชื่อ-เลขบัตร...</span>
                            : agent.id_card_files?.[0] ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกแล้ว</span> — คลิกเพื่อเปลี่ยน</>
                            : 'JPG / PNG — OCR กรอกข้อมูลอัตโนมัติ'}
                        </div>
                        {agentOcrFilled && <div style={{ marginTop: 4, fontSize: 10, color: '#15803d', fontWeight: 600 }}><i className="fas fa-check-circle" style={{ marginRight: 3 }}></i>OCR กรอกข้อมูลอัตโนมัติแล้ว</div>}
                      </div>
                    </div>
                  </label>
                </div>

                {/* ── ทะเบียนบ้าน (edit) ── */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    สำเนาทะเบียนบ้าน
                    {houseOcrLoading && <span style={{ fontSize: 11, color: '#e65100', display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
                  </label>
                  <label style={{
                    display: 'block', cursor: houseOcrLoading ? 'default' : 'pointer',
                    background: houseRegFile ? '#fff5f5' : '#fdf2f0',
                    border: `2px dashed ${houseRegFile ? '#e53e3e' : '#f5a5a5'}`,
                    borderRadius: 10, padding: 12,
                  }}>
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                      disabled={houseOcrLoading}
                      onChange={e => { handleHouseRegChange(e.target.files[0] || null); e.target.value = '' }} />
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {houseRegFile && houseRegFile.type !== 'application/pdf' ? <img src={URL.createObjectURL(houseRegFile)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : houseRegFile ? <i className="fas fa-file-pdf" style={{ fontSize: 26, color: '#e53e3e' }}></i>
                          : existingHouseReg ? <img src={existingHouseReg.startsWith('/') ? existingHouseReg : `/${existingHouseReg}`} alt="existing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <i className="fas fa-home" style={{ fontSize: 26, color: '#e53e3e' }}></i>
                        }
                        {(houseRegFile || existingHouseReg) && !houseOcrLoading && (
                          <button type="button"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setHouseRegFile(null); setHouseOcrMsg('') }}
                            style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                            title="ลบ">✕</button>
                        )}
                        {houseOcrLoading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(229,62,62,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 20 }}></i></div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#c0392b', marginBottom: 3 }}>
                          <i className="fas fa-upload" style={{ marginRight: 5 }}></i>
                          {houseOcrLoading ? 'กำลัง OCR...' : houseRegFile ? 'เปลี่ยนไฟล์' : 'อัพโหลดสำเนาทะเบียนบ้าน'}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>
                          {houseRegFile ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกแล้ว</span> — {houseRegFile.name}</> : 'JPG / PNG / PDF'}
                        </div>
                        {houseOcrMsg && <div style={{ marginTop: 4, fontSize: 10, color: houseOcrMsg.startsWith('✅') ? '#2e7d32' : '#e65100', fontWeight: 600 }}>{houseOcrMsg}</div>}
                      </div>
                    </div>
                  </label>
                  {existingHouseReg && !houseRegFile && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a href={existingHouseReg.startsWith('/') ? existingHouseReg : `/${existingHouseReg}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#c0392b', textDecoration: 'underline' }}><i className="fas fa-eye" style={{ marginRight: 3 }}></i>ดูไฟล์ปัจจุบัน</a>
                      <button type="button" onClick={() => { setExistingHouseReg(null); setRemoveHouseReg(true) }} style={{ fontSize: 11, padding: '2px 8px', background: '#fef2f2', color: '#e74c3c', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer' }}><i className="fas fa-trash"></i> ลบ</button>
                    </div>
                  )}

                  {/* ใหม่: ไฟล์ที่เพิ่งเลือก */}
                  {houseRegFile && (
                    <div style={{ position: 'relative', display: 'inline-block', border: '1px solid #ddd', borderRadius: 8, padding: 4, background: '#fff' }}>
                      <img src={URL.createObjectURL(houseRegFile)} alt="preview" style={{ maxHeight: 140, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, display: 'block' }} />
                      <button type="button" onClick={() => { setHouseRegFile(null); setHouseOcrMsg('') }}
                        style={{ ...xBtnStyle, position: 'absolute', top: -8, right: -8, width: 22, height: 22, fontSize: 11, background: '#ff5252' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}

                  {/* เดิม: รูปที่มีอยู่ในระบบ */}
                  {existingHouseReg && !houseRegFile && !removeHouseReg && (
                    <div style={{ position: 'relative', display: 'inline-block', border: '1px solid #ddd', borderRadius: 8, padding: 4, background: '#fff' }}>
                      <a href={existingHouseReg.startsWith('/') ? existingHouseReg : `/${existingHouseReg}`} target="_blank" rel="noreferrer">
                        <img src={existingHouseReg.startsWith('/') ? existingHouseReg : `/${existingHouseReg}`} alt="existing" style={{ maxHeight: 140, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, display: 'block' }} />
                      </a>
                      <button type="button" onClick={() => { setExistingHouseReg(null); setRemoveHouseReg(true) }}
                        style={{ ...xBtnStyle, position: 'absolute', top: -10, right: -10, width: 24, height: 24, background: '#ff5252', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0, marginTop: 14, borderTop: '1px solid #e3f2fd', paddingTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 }}>
                    <span>หน้าสมุดบัญชี (Book Bank)</span>
                    {passbookOcrLoading && <span style={{ fontSize: 11, color: '#1565c0', display: 'inline-flex', alignItems: 'center', gap: 4 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
                  </label>
                  <input type="file" accept="image/*,.pdf"
                    onChange={e => handleAgentPassbookOcr(e.target.files[0] || null)}
                    style={{ fontSize: 12, marginBottom: 6 }} />
                  {passbookOcrMsg && (
                    <div style={{ marginTop: 4, fontSize: 11, padding: '4px 8px', borderRadius: 6,
                      background: passbookOcrMsg.startsWith('✅') ? '#e8f5e9' : '#fff3e0',
                      color: passbookOcrMsg.startsWith('✅') ? '#2e7d32' : '#e65100' }}>
                      {passbookOcrMsg}
                    </div>
                  )}
                  {passbookFile && (
                    <div style={{ position: 'relative', display: 'inline-block', border: '1px solid #ddd', borderRadius: 8, padding: 4, background: '#fff', marginTop: 6 }}>
                      <img src={URL.createObjectURL(passbookFile)} alt="preview" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, display: 'block' }} />
                      <button type="button" onClick={() => { setPassbookFile(null); setPassbookOcrMsg('') }}
                        style={{ ...xBtnStyle, position: 'absolute', top: -8, right: -8, width: 22, height: 22, fontSize: 11, background: '#ff5252' }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>


              {/* ลูกหนี้ที่เชื่อมอยู่ */}
              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>
                  <i className="fas fa-users" style={{ color: '#2196F3', marginRight: 8 }}></i>
                  ลูกหนี้ที่เชื่อมอยู่ ({linkedDebtors.length} ราย)
                </h3>

                {linkedDebtors.map((d, i) => (
                  <div key={i} style={{ padding: 14, marginBottom: 10, borderRadius: 10, border: '1px solid #e3f2fd', background: '#f8fbff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: '#1565C0', fontSize: 14 }}>
                        <i className="fas fa-user" style={{ marginRight: 6 }}></i>
                        {d.contact_name}
                        {d.debtor_code && <span style={{ marginLeft: 8, padding: '2px 8px', background: '#1565C0', color: '#fff', borderRadius: 12, fontSize: 11 }}>{d.debtor_code}</span>}
                      </div>
                      <button type="button" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 11 }}
                        onClick={() => navigate(`/sales/edit/${d.id}`)}>
                        <i className="fas fa-edit"></i> แก้ไข
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', fontSize: 12, color: '#666' }}>
                      <div><span style={{ color: '#999' }}>เบอร์โทร:</span> {d.contact_phone}</div>
                      <div><span style={{ color: '#999' }}>ทรัพย์:</span> {propertyTypeLabel[d.property_type] || d.property_type || '-'}</div>
                      <div><span style={{ color: '#999' }}>จังหวัด:</span> {d.province || '-'}</div>
                    </div>
                    {d.case_code ? (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>เคส: {d.case_code}</span>
                        <span className={`badge ${statusBadge[d.case_status] || 'badge-pending'}`} style={{ fontSize: 10 }}>{statusLabel[d.case_status] || d.case_status || '-'}</span>
                        <span className={`badge ${d.payment_status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`} style={{ fontSize: 10 }}>{d.payment_status === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}</span>
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#999' }}><i className="fas fa-info-circle"></i> ยังไม่มีเคส</div>
                    )}
                  </div>
                ))}

                {linkMsg && (
                  <div style={{ marginBottom: 10, padding: '8px 12px', background: linkMsg.includes('สำเร็จ') ? '#e8f5e9' : '#fdecea', borderRadius: 8, fontSize: 13, color: linkMsg.includes('สำเร็จ') ? '#2e7d32' : '#c62828' }}>
                    <i className={`fas fa-${linkMsg.includes('สำเร็จ') ? 'check-circle' : 'exclamation-circle'}`} style={{ marginRight: 6 }}></i>{linkMsg}
                  </div>
                )}

                {!showLinkPanel ? (
                  <button type="button" className="btn btn-outline" style={{ width: '100%', padding: '10px 16px', fontSize: 13, marginBottom: 8, borderColor: '#2196F3', color: '#2196F3' }}
                    onClick={() => setShowLinkPanel(true)}>
                    <i className="fas fa-link" style={{ marginRight: 6 }}></i> เชื่อมลูกหนี้ที่มีอยู่ในระบบ
                  </button>
                ) : (
                  <div style={{ border: '1px solid #bbdefb', borderRadius: 10, padding: 16, marginBottom: 10, background: '#f0f7ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#1565C0' }}><i className="fas fa-search" style={{ marginRight: 6 }}></i>ค้นหาลูกหนี้</span>
                      <button type="button" onClick={() => { setShowLinkPanel(false); setLinkSearch('') }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 18, lineHeight: 1 }}>×</button>
                    </div>
                    <input type="text" placeholder="พิมพ์ชื่อ, เบอร์, รหัส LDD..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #90caf9', fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }} />
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {existingDebtors
                        .filter(d => {
                          const q = linkSearch.toLowerCase()
                          if (!q) return true
                          return (d.contact_name || '').toLowerCase().includes(q) || (d.contact_phone || '').includes(q) || (d.debtor_code || '').toLowerCase().includes(q)
                        })
                        .filter(d => !linkedDebtors.some(ld => ld.id === d.id))
                        .slice(0, 30)
                        .map(d => (
                          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', marginBottom: 6, borderRadius: 8, background: '#fff', border: '1px solid #e3f2fd' }}>
                            <div style={{ fontSize: 13 }}>
                              <span style={{ fontWeight: 600, color: '#1565C0' }}>
                                {d.debtor_code && <span style={{ marginRight: 6, fontSize: 11, padding: '1px 6px', background: '#1565C0', color: '#fff', borderRadius: 10 }}>{d.debtor_code}</span>}
                                {d.contact_name || '(ไม่ระบุชื่อ)'}
                              </span>
                              <span style={{ color: '#888', marginLeft: 8, fontSize: 12 }}>{d.contact_phone}</span>
                            </div>
                            <button type="button" className="btn btn-primary" style={{ padding: '4px 14px', fontSize: 12 }}
                              disabled={linkingId === d.id} onClick={() => handleLinkDebtor(d.id)}>
                              {linkingId === d.id ? <i className="fas fa-spinner fa-spin"></i> : 'เชื่อม'}
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                <button type="button" className="btn btn-outline" style={{ width: '100%', padding: '10px 16px', fontSize: 13 }}
                  onClick={() => navigate(`/sales/new?agent_id=${id}`)}>
                  <i className="fas fa-user-plus" style={{ marginRight: 6 }}></i> เพิ่มลูกหนี้ใหม่ให้นายหน้าคนนี้
                </button>
              </div>

            </div>

          </div>
        )}

      </form>
    </div>
  )
}

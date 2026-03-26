import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'
import MapPreview from '../components/MapPreview'
import AgentCard from '../components/AgentCard'
import ChecklistDocsPanel from '../components/ChecklistDocsPanel'
import LandOfficeInput from '../components/LandOfficeInput'
// CaseInfoSummary removed
// AppraisalStatusCard removed — ย้ายไปดูที่ฝ่ายประเมินโดยตรง

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales'

// สถานะเคส (แสดงอย่างเดียว — อัพเดทอัตโนมัติจากแต่ละฝ่าย)
const statusLabelMap = {
  new: 'เคสใหม่', contacting: 'กำลังติดต่อ', incomplete: 'ข้อมูลไม่ครบ',
  awaiting_appraisal_fee: 'รอชำระค่าประเมิน', appraisal_scheduled: 'นัดประเมินแล้ว',
  appraisal_passed: 'ผ่านประเมินแล้ว', appraisal_not_passed: 'ไม่ผ่านประเมิน',
  pending_approve: 'รออนุมัติวงเงิน', credit_approved: 'อนุมัติวงเงินแล้ว',
  pending_auction: 'รอประมูล', preparing_docs: 'เตรียมเอกสาร',
  legal_scheduled: 'นัดนิติกรรมแล้ว', legal_completed: 'ทำนิติกรรมเสร็จสิ้น',
  completed: 'เสร็จสมบูรณ์', cancelled: 'ยกเลิก'
}

const paymentStatusOptions = [
  { value: 'unpaid', label: 'ยังไม่ชำระ' },
  { value: 'paid', label: 'ชำระแล้ว' },
]

const appraisalTypeOptions = [
  { value: 'outside', label: 'ประเมินนอก' },
  { value: 'inside', label: 'ประเมินใน' },
  { value: 'check_price', label: 'เช็คราคา' },
]

const loanTypeLabel = { mortgage: 'จำนอง', selling_pledge: 'ขายฝาก' }
const propertyTypeLabel = {
  land: 'ที่ดินเปล่า', house: 'บ้าน', single_house: 'บ้านเดี่ยว',
  condo: 'คอนโด', townhouse: 'ทาวน์โฮม', shophouse: 'ตึกแถว', other: 'อื่นๆ',
}

function formatMoney(n) {
  if (!n) return '0'
  return Number(n).toLocaleString('th-TH')
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toDateInput(d) {
  if (!d) return ''
  const s = String(d)
  // pure date string (ไม่มี timezone) → ใช้ตรงๆ
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // datetime จาก DB มาเป็น UTC → บวก UTC+7 ก่อน format
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  const local = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
  return local.toISOString().split('T')[0]
}

// สไตล์ปุ่มกากบาทลบรูปเดิม (อยู่ในขอบรูป ไม่โดน overflow ตัด)
const xBtnOverlay = {
  position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
  background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 11,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 2, padding: 0, lineHeight: 1
}

// สไตล์ปุ่มกากบาทลบไฟล์ที่เลือก (inline)
const xBtnInline = {
  background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%',
  width: 18, height: 18, fontSize: 9, cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1,
  verticalAlign: 'middle', marginLeft: 6
}

const loanTypeDetailOptions = [
  { value: '', label: 'ไม่ระบุ' },
  { value: 'mortgage', label: 'จำนอง' },
  { value: 'selling_pledge', label: 'ขายฝาก' },
]

const AUCTION_API = '/api/admin/auction'


const loanTypeDetailColor = { mortgage: '#1565c0', selling_pledge: '#6a1b9a', '': '#888' }
const loanTypeDetailBg = { mortgage: '#e3f2fd', selling_pledge: '#f3e5f5', '': '#f5f5f5' }

export default function CaseEditPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEditMode = !!id
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [agents, setAgents] = useState([])
  const [debtors, setDebtors] = useState([])
  const [debtorDetail, setDebtorDetail] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [loanTypeDetail, setLoanTypeDetail] = useState('')
  const [loanTypeDropdownOpen, setLoanTypeDropdownOpen] = useState(false)

  // ── ID Card OCR ──
  const [idOcrLoading, setIdOcrLoading] = useState(false)
  const [idOcrResult, setIdOcrResult] = useState(null)

  // ── Photo comparison toggle ──
  const [showPhotoCompare, setShowPhotoCompare] = useState(false)

  const slipRef = useRef(null)
  const txSlipRef = useRef(null)
  const advanceSlipRef = useRef(null)
  const bookRef = useRef(null)
  const createSlipRef = useRef(null)
  const createBookRef = useRef(null)

  // track ชื่อไฟล์ที่เลือกใหม่ (สำหรับแสดง X)
  const [createSlipName, setCreateSlipName] = useState('')
  const [createBookName, setCreateBookName] = useState('')
  const [editSlipName, setEditSlipName] = useState('')
  const [editBookName, setEditBookName] = useState('')
  // file previews
  const [createSlipPreview, setCreateSlipPreview] = useState(null)
  const [createBookPreview, setCreateBookPreview] = useState(null)
  const [idCardPreview, setIdCardPreview] = useState(null)

  const [createForm, setCreateForm] = useState({
    loan_request_id: '',
    agent_id: '',
    note: '',
    payment_status: 'unpaid',
    appraisal_type: 'outside',
    appraisal_date: '',
    appraisal_fee: 4500,
    payment_date: '',
    recorded_by: '',
    has_obligation: 'no',
    obligation_count: '',
    // ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
    transaction_date: '',
    transaction_time: '',
    transaction_land_office: '',
    transaction_note: '',
    transaction_recorded_by: '',
  })

  const [form, setForm] = useState({
    status: 'pending_approve',
    payment_status: 'unpaid',
    appraisal_fee: 4500,
    approved_amount: '',
    agent_id: '',
    assigned_sales_id: '',
    note: '',
    appraisal_type: 'outside',
    appraisal_date: '',
    payment_date: '',
    recorded_by: '',
    recorded_at: '',
    // ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
    transaction_date: '',
    transaction_time: '',
    transaction_land_office: '',
    transaction_note: '',
    transaction_recorded_by: '',
    // ★ นักลงทุน + ค่าคอมมิชชั่น
    investor_marital_status: '',
    commission_paid: 0,
    commission_amount: '',
    _commission_slip_file: null,  // ไม่ส่งไป DB — ใช้เฉพาะ UI
    // ★ Email ลูกค้า (เก็บที่ loan_requests — ฝ่ายออกสัญญาใช้ส่งสัญญา)
    contact_email: null,  // null = ยังไม่แตะ, string = แก้แล้ว
  })

  // ★ re-fetch เคสใหม่โดยไม่ navigate ออก (ใช้หลัง save)
  const reloadCase = () => {
    if (!id) return
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCaseData(d.caseData)
          setLoanTypeDetail(d.caseData.loan_type_detail || '')
          setForm(prev => ({
            ...prev,
            status: d.caseData.status || 'pending_approve',
            payment_status: d.caseData.payment_status || 'unpaid',
            approved_amount: d.caseData.approved_amount || '',
            agent_id: d.caseData.agent_id || '',
            assigned_sales_id: d.caseData.assigned_sales_id || '',
            note: d.caseData.note || '',
          }))
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetch(`${API}/agents`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setAgents(d.agents) })
      .catch(() => { })

    if (isEditMode) {
      fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setCaseData(d.caseData)
            setLoanTypeDetail(d.caseData.loan_type_detail || '')
            setForm({
              status: d.caseData.status || 'pending_approve',
              payment_status: d.caseData.payment_status || 'unpaid',
              appraisal_fee: d.caseData.appraisal_fee || 4500,
              approved_amount: d.caseData.approved_amount || '',
              agent_id: d.caseData.agent_id || '',
              assigned_sales_id: d.caseData.assigned_sales_id || '',
              note: d.caseData.note || '',
              appraisal_type: d.caseData.appraisal_type || 'outside',
              appraisal_date: toDateInput(d.caseData.appraisal_date),
              payment_date: toDateInput(d.caseData.payment_date),
              recorded_by: d.caseData.recorded_by || '',
              recorded_at: d.caseData.recorded_at || '',
              transaction_date: toDateInput(d.caseData.transaction_date),
              transaction_time: d.caseData.transaction_time || '',
              transaction_land_office: d.caseData.transaction_land_office || '',
              transaction_note: d.caseData.transaction_note || '',
              transaction_recorded_by: d.caseData.transaction_recorded_by || '',
              investor_marital_status: d.caseData.investor_marital_status || '',
              commission_paid: d.caseData.commission_paid || 0,
              commission_amount: d.caseData.commission_amount != null ? String(d.caseData.commission_amount) : '',
            })
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      // ★ รับ ?lr= จาก URL (มาจากปุ่ม "สร้างเคส" ใน SalesFormPage)
      const lrFromUrl = searchParams.get('lr')
      fetch(`${API}/debtors`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const available = d.debtors.filter(x => !x.case_code)
            setDebtors(available)
            // Pre-select ลูกหนี้จาก URL param
            if (lrFromUrl) {
              const matched = d.debtors.find(x => String(x.id) === String(lrFromUrl))
              if (matched) {
                setCreateForm(prev => ({ ...prev, loan_request_id: String(lrFromUrl) }))
                // ดึงรายละเอียดลูกหนี้ทันที
                fetch(`${API}/debtors/${lrFromUrl}`, { headers: { Authorization: `Bearer ${token()}` } })
                  .then(r2 => r2.json())
                  .then(d2 => { if (d2.success) setDebtorDetail(d2.debtor) })
                  .catch(() => { })
              }
            }
          }
        })
        .catch(() => { })
      setLoading(false)
    }
  }, [id])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const setCreate = (key, val) => setCreateForm(prev => ({ ...prev, [key]: val }))

  const handleLoanTypeChange = async (newVal) => {
    if (!caseData?.loan_request_id) return
    setLoanTypeDetail(newVal)
    setLoanTypeDropdownOpen(false)
    try {
      await fetch(`${API}/debtors/${caseData.loan_request_id}/loan-type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ loan_type_detail: newVal })
      })
    } catch { }
  }

  const handleDebtorSelect = (debtorId) => {
    setCreate('loan_request_id', debtorId)

    // ถ้าไม่ได้เลือกลูกหนี้ ให้เคลียร์ข้อมูลลูกหนี้และนายหน้าออก
    if (!debtorId) {
      setDebtorDetail(null)
      setCreate('agent_id', '') // เพิ่มการเคลียร์นายหน้า
      return
    }

    fetch(`${API}/debtors/${debtorId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setDebtorDetail(d.debtor)
          const db = d.debtor
          setCreateForm(prev => ({
            ...prev,
            has_obligation: db.has_obligation || 'no',
            obligation_count: db.obligation_count || '',
            agent_id: db.agent_id || '',
            // ดึงข้อมูลสถานะประเมินที่ฝ่ายประเมินกรอกมาแล้ว
            appraisal_type: db.appraisal_type || prev.appraisal_type,
            appraisal_date: db.appraisal_date ? new Date(db.appraisal_date).toISOString().split('T')[0] : prev.appraisal_date,
            appraisal_fee: db.appraisal_fee || prev.appraisal_fee,
            payment_date: db.payment_date ? new Date(db.payment_date).toISOString().split('T')[0] : prev.payment_date,
            payment_status: db.payment_status || prev.payment_status,
            recorded_by: db.appraisal_recorded_by || prev.recorded_by,
          }))
        }
      })
      .catch(() => { })
  }

  // ล้างไฟล์ ref
  const clearFileRef = (ref, setName) => {
    if (ref.current) ref.current.value = ''
    setName('')
  }

  // ลบสลิป/เล่มประเมิน (single column → set NULL ใน cases table)
  const deleteCaseImage = async (column) => {
    if (!confirm('ต้องการลบรูปนี้?')) return
    try {
      const res = await fetch('/api/admin/appraisal/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ table: 'cases', id, column })
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => ({ ...prev, [column]: null }))
      } else {
        alert(data.message || 'ลบไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  // ลบรูปลูกหนี้จาก JSON array (loan_requests table)
  const deleteDebtorImage = async (field, imgPath) => {
    if (!confirm('ต้องการลบรูปนี้?')) return
    try {
      const res = await fetch(`${API}/remove-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ debtor_id: caseData.loan_request_id, field, image_path: imgPath })
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => {
          const arr = (parseImages(prev[field]) || []).filter(p => p !== imgPath)
          return { ...prev, [field]: JSON.stringify(arr) }
        })
      } else {
        alert(data.message || 'ลบไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  // อัพโหลดรูปลูกหนี้เพิ่ม (เรียก API ทันทีเมื่อเลือกไฟล์)
  const uploadDebtorFile = async (fieldName, files) => {
    if (!files || files.length === 0) return
    if (!caseData?.loan_request_id) return

    const fd = new FormData()
    for (const f of files) fd.append(fieldName, f)

    try {
      const res = await fetch(`${API}/debtors/${caseData.loan_request_id}/upload-images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        // อัพเดต state ให้แสดงรูปใหม่ทันที
        setCaseData(prev => ({
          ...prev,
          images: data.images || prev.images,
          deed_images: data.deed_images || prev.deed_images,
          appraisal_images: data.appraisal_images || prev.appraisal_images,
        }))
      } else {
        alert(data.message || 'อัพโหลดไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  // ── ID Card OCR ── เรียกหลัง upload บัตรประชาชน
  const handleIdCardOcr = async (file) => {
    if (!file || !caseData?.loan_request_id) return
    setIdOcrLoading(true)
    setIdOcrResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', 'id_card')
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success && data.extracted) {
        const ex = data.extracted
        const fields = {}
        if (ex.full_name) fields.contact_name = ex.full_name
        if (ex.id_number) fields.national_id = ex.id_number
        if (Object.keys(fields).length > 0) {
          setCaseData(prev => ({ ...prev, ...fields }))
          const fdUpd = new FormData()
          Object.entries(fields).forEach(([k, v]) => fdUpd.append(k, String(v)))
          await fetch(`${API}/debtors/${caseData.loan_request_id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token()}` },
            body: fdUpd,
          }).catch(() => { })
          setIdOcrResult(fields)
          setTimeout(() => setIdOcrResult(null), 7000)
        }
      }
    } catch (e) {
      console.warn('[IdCardOCR] error:', e)
    } finally {
      setIdOcrLoading(false)
    }
  }

  // ── Deed OCR ── เรียกหลัง upload โฉนด → อ่านเลขโฉนด/พื้นที่อัตโนมัติ
  // ==================== สร้างเคสใหม่ ====================
  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')

    if (!createForm.loan_request_id) {
      setMsg('กรุณาเลือกลูกหนี้')
      setSaving(false)
      return
    }

    try {
      const fd = new FormData()
      Object.entries(createForm).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v)
      })
      if (createSlipRef.current?.files[0]) {
        fd.append('slip_image', createSlipRef.current.files[0])
      }
      if (createBookRef.current?.files[0]) {
        fd.append('appraisal_book_image', createBookRef.current.files[0])
      }

      const res = await fetch(`${API}/cases`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`สร้างเคสสำเร็จ! รหัส: ${data.case_code}`)
        setTimeout(() => navigate('/sales'), 1200)
      } else {
        setMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  // ==================== อัปเดตเคส ====================
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')

    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'recorded_by' || k === 'transaction_recorded_by') return // ไม่ส่ง recorded_by
        if (k.startsWith('_')) return // ไม่ส่ง internal fields (_slip_changed, _commission_slip_file ฯลฯ)
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v)
      })

      if (slipRef.current?.files[0]) {
        fd.append('slip_image', slipRef.current.files[0])
      }
      if (txSlipRef.current?.files[0]) {
        fd.append('transaction_slip', txSlipRef.current.files[0])
      } else if (form._tx_slip_cleared) {
        fd.append('transaction_slip_clear', '1') // แจ้ง backend ให้ลบ
      }
      if (advanceSlipRef.current?.files[0]) {
        fd.append('advance_slip', advanceSlipRef.current.files[0])
      } else if (form._adv_slip_cleared) {
        fd.append('advance_slip_clear', '1') // แจ้ง backend ให้ลบ
      }
      if (bookRef.current?.files[0]) {
        fd.append('appraisal_book_image', bookRef.current.files[0])
      }
      // ★ สลิปค่าคอมมิชชั่น
      if (form._commission_slip_file) {
        fd.append('commission_slip', form._commission_slip_file)
        fd.delete('_commission_slip_file')  // ไม่ส่ง object ไปกับ form
      }

      const res = await fetch(`${API}/cases/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setTimeout(() => navigate(-1), 800)
      } else {
        setMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  // ==================== Loading ====================
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
        <p style={{ marginTop: 12 }}>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  // ==================== Helper ====================
  const parseImages = (jsonStr) => {
    try { return JSON.parse(jsonStr) || [] } catch { return [] }
  }

  const ImageGrid = ({ images, label, onDelete }) => {
    if (!images || images.length === 0) return <span style={{ fontSize: 12, color: '#999' }}>ไม่มีรูป</span>
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {images.map((img, i) => (
          <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
            {onDelete && (
              <button type="button" onClick={() => onDelete(img)} style={xBtnOverlay} title="ลบรูป">
                <i className="fas fa-times"></i>
              </button>
            )}
            <a href={img.startsWith('/') ? img : `/${img}`} target="_blank" rel="noreferrer">
              <img src={img.startsWith('/') ? img : `/${img}`} alt={`${label}-${i}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} onError={(e) => { e.target.style.display = 'none' }} />
            </a>
          </div>
        ))}
      </div>
    )
  }

  // ลบรูปลูกหนี้ (เรียก API จริง)
  const removeImage = (field, imgPath) => {
    deleteDebtorImage(field, imgPath)
  }

  // ==================== โหมดสร้างเคสใหม่ ====================
  if (!isEditMode) {
    const d = debtorDetail
    let images = d ? parseImages(d.images) : []
    let deedImages = d ? parseImages(d.deed_images) : []

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>ID ลูกหนี้</h2>
        </div>
        <p style={{ margin: '0 0 20px', color: '#888', fontSize: 13 }}>เลือก ID ลูกหนี้ เพื่อกรอกเคสใหม่</p>

        {msg && <div className="error-msg" style={{ marginBottom: 16 }}>{msg}</div>}
        {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

        <div style={{ marginBottom: 20, maxWidth: 500 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: 'block' }}>
            <i className="fas fa-user-tag" style={{ color: 'var(--primary)', marginRight: 6 }}></i>
            เลือกลูกหนี้ <span style={{ color: 'red' }}>*</span>
          </label>
          <select
            value={createForm.loan_request_id}
            onChange={e => handleDebtorSelect(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #ddd' }}
          >
            <option value="">-- เลือกลูกหนี้ที่ยังไม่มีเคส --</option>
            {debtors.map(dt => (
              <option key={dt.id} value={dt.id}>
                ID:{dt.id} — {dt.contact_name} — {dt.contact_phone}
              </option>
            ))}
          </select>
          {debtors.length === 0 && (
            <small style={{ color: '#999', marginTop: 4, display: 'block' }}>
              <i className="fas fa-info-circle"></i> ไม่มีลูกหนี้ที่ยังไม่ได้สร้างเคส
            </small>
          )}
        </div>

        <form onSubmit={handleCreate}>
          <div className="edit-page-grid">

            {/* คอลัมน์ซ้าย */}
            <div>
              <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid var(--primary)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-user-circle" style={{ fontSize: 18 }}></i>
                  {d ? `รหัสจะถูกสร้างอัตโนมัติ` : 'กรุณาเลือกลูกหนี้'}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>ชื่อ-สกุล (เจ้าของทรัพย์)</label>
                    <input type="text" value={d?.contact_name || ''} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group">
                    <label>เบอร์โทร (เจ้าของทรัพย์)</label>
                    <input type="text" value={d?.contact_phone || ''} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>

                {/* ★ ช่องทางการติดต่อ + ข้อมูลเพิ่มเติม */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                  <div className="form-group">
                    <label><i className="fab fa-line" style={{ color: '#00C300', marginRight: 5 }}></i>LINE ID</label>
                    <input type="text" value={d?.contact_line || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group">
                    <label><i className="fab fa-facebook" style={{ color: '#1877F2', marginRight: 5 }}></i>Facebook</label>
                    <input type="text" value={d?.contact_facebook || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
                  <div className="form-group">
                    <label><i className="fas fa-ring" style={{ color: '#be185d', marginRight: 5 }}></i>สถานะสมรส</label>
                    <input type="text" value={
                      {
                        single: 'โสด', married_reg: 'สมรส (จดทะเบียน)', married_unreg: 'สมรส (ไม่จดทะเบียน)',
                        divorced: 'หย่า', inherited: 'รับมรดก'
                      }[d?.marital_status] || d?.marital_status || '-'
                    } readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>

                {images.filter(img => img.includes('id-cards')).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>รูปหน้าบัตรประชาชน</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {images.filter(img => img.includes('id-cards')).map((img, i) => (
                        <a key={i} href={img.startsWith('/') ? img : `/${img}`} target="_blank" rel="noreferrer">
                          <img src={img.startsWith('/') ? img : `/${img}`} alt={`id-${i}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }} onError={(e) => { e.target.style.display = 'none' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>ลักษณะทรัพย์</label>
                  <input type="text" value={d ? (propertyTypeLabel[d.property_type] || d.property_type || '-') : ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e67e22' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#e67e22', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-home" style={{ fontSize: 17 }}></i>
                  ข้อมูลทรัพย์
                </h3>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>ทรัพย์ติดภาระหรือไม่</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setCreate('has_obligation', 'no')} style={{
                      padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: '2px solid',
                      background: createForm.has_obligation !== 'yes' ? '#dcfce7' : '#f9fafb',
                      color: createForm.has_obligation !== 'yes' ? '#15803d' : '#9ca3af',
                      borderColor: createForm.has_obligation !== 'yes' ? '#86efac' : '#e5e7eb',
                    }}>
                      <i className="fas fa-check-circle" style={{ marginRight: 5 }}></i>ไม่ติดภาระ
                    </button>
                    <button type="button" onClick={() => setCreate('has_obligation', 'yes')} style={{
                      padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', border: '2px solid',
                      background: createForm.has_obligation === 'yes' ? '#fee2e2' : '#f9fafb',
                      color: createForm.has_obligation === 'yes' ? '#b91c1c' : '#9ca3af',
                      borderColor: createForm.has_obligation === 'yes' ? '#fca5a5' : '#e5e7eb',
                    }}>
                      <i className="fas fa-exclamation-circle" style={{ marginRight: 5 }}></i>ติดภาระ
                    </button>
                    {createForm.has_obligation === 'yes' && (
                      <input type="text" value={createForm.obligation_count} onChange={e => setCreate('obligation_count', e.target.value)}
                        placeholder="จำนวน เช่น 1" style={{ width: 120, padding: '7px 12px', borderRadius: 8, border: '1.5px solid #fca5a5', fontSize: 14 }} />
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div className="form-group">
                    <label>จังหวัด</label>
                    <input type="text" value={d?.province || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group">
                    <label>อำเภอ</label>
                    <input type="text" value={d?.district || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group">
                    <label>ตำบล</label>
                    <input type="text" value={d?.subdistrict || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <i className="fas fa-map-marker-alt" style={{ color: '#e53935', fontSize: 13 }}></i>
                    โลเคชั่น
                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>(กรอกโดยฝ่ายขาย)</span>
                    <button type="button"
                      onClick={() => {
                        const m = (d?.location_url || '').match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || (d?.location_url || '').match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
                        window.open(m ? `https://landsmaps.dol.go.th/#16/${m[1]}/${m[2]}` : 'https://landsmaps.dol.go.th/#', '_blank')
                      }}
                      style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#0369a1,#0284c7)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="fas fa-map"></i> LandsMaps
                    </button>
                  </label>
                  <input type="url" value={d?.location_url || ''} readOnly
                    style={{ background: '#f9fafb', color: d?.location_url ? '#111827' : '#9ca3af', cursor: 'default' }}
                    placeholder="ฝ่ายขายยังไม่ได้กรอกโลเคชั่น" />
                  <MapPreview url={d?.location_url} label="โลเคชั่นทรัพย์" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>เลขโฉนด</label>
                    <input type="text" value={d?.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div className="form-group">
                    <label>พื้นที่</label>
                    <input type="text" value={d?.land_area ? `${d.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปภาพทรัพย์</label>
                  <ImageGrid images={images.filter(img => img.includes('properties'))} label="prop" />
                </div>

                {images.filter(img => img.includes('videos')).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>วีดีโอทรัพย์</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {images.filter(img => img.includes('videos')).map((vid, i) => (
                        <a key={i} href={vid.startsWith('/') ? vid : `/${vid}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--primary)' }}>
                          <i className="fas fa-video"></i> วิดีโอ {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>เลือกนายหน้า</label>
                  <select value={createForm.agent_id} onChange={e => setCreate('agent_id', e.target.value)}>
                    <option value="">-- เลือกนายหน้า --</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.full_name} {a.nickname ? `(${a.nickname})` : ''} — {a.phone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* คอลัมน์ขวา: สถานะประเมิน */}
            <div>
              <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e65100' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#e65100', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-clipboard-check" style={{ fontSize: 16 }}></i>
                  สถานะประเมิน
                </h3>

                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>สถานะประเมิน</label>
                  <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
                    {appraisalTypeOptions.map(opt => (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="appraisal_type"
                          value={opt.value}
                          checked={createForm.appraisal_type === opt.value}
                          onChange={e => setCreate('appraisal_type', e.target.value)}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div className="form-group">
                    <label>วันที่นัดประเมิน</label>
                    <input type="date" value={createForm.appraisal_date} onChange={e => setCreate('appraisal_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>จำนวนเงิน</label>
                    <input type="number" step="0.01" value={createForm.appraisal_fee} onChange={e => setCreate('appraisal_fee', e.target.value)} placeholder="4500" />
                  </div>
                </div>

                <div className="form-group">
                  <label>วันที่ชำระ</label>
                  <input type="date" value={createForm.payment_date} onChange={e => setCreate('payment_date', e.target.value)} />
                </div>

                <div className="form-group">
                  <label>อัพโหลดรูปสลิป</label>
                  <label style={{
                    display: 'block', cursor: 'pointer', marginTop: 4,
                    background: createSlipPreview ? '#fffde7' : '#fffff5',
                    border: `2px dashed ${createSlipPreview ? '#f59e0b' : '#fde68a'}`,
                    borderRadius: 10, padding: 10, transition: 'border-color 0.2s',
                  }}>
                    <input type="file" accept="image/*,.pdf" ref={createSlipRef} style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files[0]
                        setCreateSlipName(f?.name || '')
                        setCreateSlipPreview(f ? (f.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(f)) : null)
                      }} />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{
                        width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                        background: '#fef3c7', border: '1px solid #fde68a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      }}>
                        {createSlipPreview === 'pdf'
                          ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#d97706' }}></i>
                          : createSlipPreview
                            ? <img src={createSlipPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <i className="fas fa-receipt" style={{ fontSize: 22, color: '#d97706' }}></i>
                        }
                        {createSlipPreview && (
                          <button type="button"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); clearFileRef(createSlipRef, setCreateSlipName); setCreateSlipPreview(null) }}
                            style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                            title="ลบ">✕</button>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e' }}>
                          <i className="fas fa-paperclip" style={{ marginRight: 4 }}></i>
                          {createSlipPreview ? 'เปลี่ยนสลิป' : 'แนบรูปสลิป'}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                          {createSlipPreview
                            ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกแล้ว</span> — {createSlipName}</>
                            : 'รูปภาพ / PDF'
                          }
                        </div>
                      </div>
                    </div>
                  </label>
                  {debtorDetail?.slip_image && !createSlipName && (
                    <div style={{ marginTop: 6 }}>
                      <small style={{ color: '#888', fontSize: 11 }}>ฝ่ายประเมินอัพโหลดไว้แล้ว: </small>
                      <a href={debtorDetail.slip_image.startsWith('/') ? debtorDetail.slip_image : `/${debtorDetail.slip_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#e65100' }}>
                        <i className="fas fa-eye"></i> ดูสลิป
                      </a>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>อัพโหลดเล่มประเมิน</label>
                  <label style={{
                    display: 'block', cursor: 'pointer', marginTop: 4,
                    background: createBookPreview ? '#f0fdf4' : '#f5fff7',
                    border: `2px dashed ${createBookPreview ? '#16a34a' : '#86efac'}`,
                    borderRadius: 10, padding: 10, transition: 'border-color 0.2s',
                  }}>
                    <input type="file" accept="image/*,.pdf" ref={createBookRef} style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files[0]
                        setCreateBookName(f?.name || '')
                        setCreateBookPreview(f ? (f.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(f)) : null)
                      }} />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{
                        width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                        background: '#dcfce7', border: '1px solid #86efac',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      }}>
                        {createBookPreview === 'pdf'
                          ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#16a34a' }}></i>
                          : createBookPreview
                            ? <img src={createBookPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <i className="fas fa-book-open" style={{ fontSize: 22, color: '#16a34a' }}></i>
                        }
                        {createBookPreview && (
                          <button type="button"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); clearFileRef(createBookRef, setCreateBookName); setCreateBookPreview(null) }}
                            style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                            title="ลบ">✕</button>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>
                          <i className="fas fa-upload" style={{ marginRight: 4 }}></i>
                          {createBookPreview ? 'เปลี่ยนไฟล์เล่มประเมิน' : 'แนบเล่มประเมิน'}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                          {createBookPreview
                            ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกแล้ว</span> — {createBookName}</>
                            : 'รูปภาพ / PDF'
                          }
                        </div>
                      </div>
                    </div>
                  </label>
                  {debtorDetail?.appraisal_book_image && !createBookName && (
                    <div style={{ marginTop: 6 }}>
                      <small style={{ color: '#888', fontSize: 11 }}>ฝ่ายประเมินอัพโหลดไว้แล้ว: </small>
                      <a href={debtorDetail.appraisal_book_image.startsWith('/') ? debtorDetail.appraisal_book_image : `/${debtorDetail.appraisal_book_image}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#e65100' }}>
                        <i className="fas fa-eye"></i> ดูเล่มประเมิน
                      </a>
                    </div>
                  )}
                </div>

                {createForm.recorded_by && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-user-check" style={{ color: '#22c55e' }}></i>
                    บันทึกโดย: <strong style={{ color: '#333' }}>{createForm.recorded_by}</strong>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label style={{ fontWeight: 600 }}>สถานะชำระ</label>
                  <select value={createForm.payment_status} onChange={e => setCreate('payment_status', e.target.value)}>
                    <option value="unpaid">ยังไม่ชำระ</option>
                    <option value="paid">ชำระแล้ว</option>
                  </select>
                </div>

              </div>

              {/* ===== ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม) ===== */}
              <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid var(--primary)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                  <i className="fas fa-handshake" style={{ marginRight: 8 }}></i>
                  ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
                </h3>
                <p style={{ margin: '-8px 0 14px', fontSize: 12, color: '#888' }}>
                  กรอกเมื่อนัดหมายวันทำนิติกรรมแล้ว — ฝ่ายนิติจะเห็นข้อมูลนี้เป็นอ้างอิง
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>วันที่ธุรกรรม</label>
                    <input type="date" value={createForm.transaction_date} onChange={e => setCreate('transaction_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>เวลา</label>
                    <input type="text" value={createForm.transaction_time} onChange={e => setCreate('transaction_time', e.target.value)} placeholder="เช่น 10:00" />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>สำนักงานที่ดิน</label>
                  <LandOfficeInput id="create" value={createForm.transaction_land_office} onChange={e => setCreate('transaction_land_office', e.target.value)} />
                </div>

              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={saving || !createForm.loan_request_id} style={{ padding: '12px 32px', flex: 1 }}>
                  {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังสร้าง...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '12px 24px' }}>
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // ==================== ไม่พบเคส ====================
  if (!caseData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#e74c3c' }}></i>
        <p style={{ marginTop: 12 }}>ไม่พบข้อมูลเคส</p>
        <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายขาย
        </button>
      </div>
    )
  }

  // ==================== โหมดแก้ไข ====================
  let images = parseImages(caseData.images)
  let deedImages = parseImages(caseData.deed_images)

  return (
    <div>
      {/* ★ แบนเนอร์แจ้งเตือน: คัดทรัพย์ไม่ผ่านเกณฑ์ */}
      {(caseData.ineligible_property === 1 || caseData.screening_status === 'ineligible') && (
        <div style={{
          background: '#b71c1c', color: '#fff',
          borderRadius: 10, padding: '14px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 14,
          boxShadow: '0 2px 12px rgba(183,28,28,0.25)'
        }}>
          <i className="fas fa-ban" style={{ fontSize: 22, marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
              ⚠️ ทรัพย์ไม่ผ่านเกณฑ์คัดทรัพย์ (SOP Screening)
            </div>
            {caseData.ineligible_reason && (
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                เหตุผล: {caseData.ineligible_reason}
              </div>
            )}
            {caseData.screened_at && (
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 3 }}>
                บันทึกเมื่อ {new Date(caseData.screened_at).toLocaleString('th-TH')}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ★ แบนเนอร์แจ้งเตือน: คัดทรัพย์ผ่านเกณฑ์ */}
      {caseData.screening_status === 'eligible' && (
        <div style={{
          background: '#1b5e20', color: '#fff',
          borderRadius: 10, padding: '10px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 2px 8px rgba(27,94,32,0.2)'
        }}>
          <i className="fas fa-check-circle" style={{ fontSize: 18, flexShrink: 0 }} />
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            ✅ ทรัพย์ผ่านเกณฑ์คัดทรัพย์แล้ว
            {caseData.screened_at && (
              <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 400, marginLeft: 8 }}>
                ({new Date(caseData.screened_at).toLocaleString('th-TH')})
              </span>
            )}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-folder-open" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            ID ลูกหนี้ — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
            {caseData.contact_name && <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginLeft: 4 }}>({caseData.contact_name})</span>}
          </h2>
          {/* Inline loan_type_detail dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setLoanTypeDropdownOpen(v => !v)}
              style={{
                padding: '4px 12px', fontSize: 13, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
                background: loanTypeDetailBg[loanTypeDetail] || '#f5f5f5',
                color: loanTypeDetailColor[loanTypeDetail] || '#888',
                border: `1.5px solid ${loanTypeDetailColor[loanTypeDetail] || '#ccc'}`,
                display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
            >
              {loanTypeDetailOptions.find(o => o.value === loanTypeDetail)?.label || 'ไม่ระบุ'}
              <i className="fas fa-chevron-down" style={{ fontSize: 10 }}></i>
            </button>
            {loanTypeDropdownOpen && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, zIndex: 200,
                background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 130
              }}>
                {loanTypeDetailOptions.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => handleLoanTypeChange(opt.value)}
                    style={{
                      padding: '9px 16px', cursor: 'pointer', fontSize: 13,
                      fontWeight: loanTypeDetail === opt.value ? 700 : 400,
                      color: loanTypeDetailColor[opt.value] || '#333',
                      background: loanTypeDetail === opt.value ? (loanTypeDetailBg[opt.value] || '#f5f5f5') : '#fff',
                      borderRadius: opt === loanTypeDetailOptions[0] ? '8px 8px 0 0' : (opt === loanTypeDetailOptions[loanTypeDetailOptions.length - 1] ? '0 0 8px 8px' : 0),
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = loanTypeDetailBg[opt.value] || '#f5f5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = loanTypeDetail === opt.value ? (loanTypeDetailBg[opt.value] || '#f5f5f5') : '#fff'}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--gray)' }}>
          สร้างเมื่อ: {formatDate(caseData.created_at)}
        </span>
      </div>

      {msg && <div className="error-msg" style={{ marginBottom: 16 }}>{msg}</div>}
      {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="edit-page-grid">

          {/* คอลัมน์ซ้าย */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid var(--primary)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-user-circle" style={{ fontSize: 18 }}></i>
                {caseData.case_code}{caseData.contact_name ? ` — ${caseData.contact_name}` : ''}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ชื่อ-สกุล (เจ้าของทรัพย์)</label>
                  <input type="text" value={caseData.contact_name || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>เบอร์โทร (เจ้าของทรัพย์)</label>
                  <input type="text" value={caseData.contact_phone || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              {/* ★ Email ลูกค้า — ฝ่ายขายแก้ได้ → ส่งสัญญาผ่านฝ่ายออกสัญญา */}
              <div className="form-group" style={{ marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-envelope" style={{ color: '#e53935', fontSize: 13 }}></i>
                  Email ลูกค้า
                  <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>(เอกสารอ้างอิง 17)</span>
                  <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', padding: '1px 7px', borderRadius: 10, fontWeight: 600, marginLeft: 2 }}>
                    ฝ่ายออกสัญญาจะส่งสัญญาไปที่อีเมลนี้
                  </span>
                </label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={form.contact_email ?? (caseData.contact_email || '')}
                  onChange={e => set('contact_email', e.target.value)}
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  รูปหน้าบัตรประชาชน
                  {idOcrLoading && <span style={{ fontSize: 11, color: '#1565c0', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
                </label>
                {images.filter(img => img.includes('id-cards')).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {images.filter(img => img.includes('id-cards')).map((img, i) => (
                      <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                        <button type="button" onClick={() => removeImage('images', img)} style={xBtnOverlay} title="ลบรูป">
                          <i className="fas fa-times"></i>
                        </button>
                        <a href={img.startsWith('/') ? img : `/${img}`} target="_blank" rel="noreferrer">
                          <img src={img.startsWith('/') ? img : `/${img}`} alt={`id-${i}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }} onError={(e) => { e.target.style.display = 'none' }} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{
                  display: 'block', cursor: idOcrLoading ? 'default' : 'pointer', marginTop: 6,
                  background: idCardPreview ? '#f5f3ff' : '#faf5ff',
                  border: `2px dashed ${idCardPreview ? '#7c3aed' : '#c4b5fd'}`,
                  borderRadius: 10, padding: 10, transition: 'border-color 0.2s',
                }}>
                  <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                    disabled={idOcrLoading}
                    onChange={e => {
                      if (e.target.files[0]) {
                        const f = e.target.files[0]
                        setIdCardPreview(f.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(f))
                        uploadDebtorFile('id_card_image', Array.from(e.target.files))
                        handleIdCardOcr(f)
                        e.target.value = ''
                      }
                    }} />
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{
                      width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                      background: '#ede9fe', border: '1px solid #c4b5fd',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                    }}>
                      {idCardPreview === 'pdf'
                        ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#7c3aed' }}></i>
                        : idCardPreview
                          ? <img src={idCardPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <i className="fas fa-id-card" style={{ fontSize: 22, color: '#7c3aed' }}></i>
                      }
                      {idCardPreview && !idOcrLoading && (
                        <button type="button"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); setIdCardPreview(null) }}
                          style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                          title="ลบ">✕</button>
                      )}
                      {idOcrLoading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(124,58,237,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 18 }}></i>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9' }}>
                        <i className="fas fa-camera" style={{ marginRight: 4 }}></i>
                        {idOcrLoading ? 'กำลัง OCR...' : idCardPreview ? 'เปลี่ยนรูปบัตรประชาชน' : 'สแกน / อัพโหลดบัตรประชาชน'}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        {idOcrLoading
                          ? <span style={{ color: '#6366f1', fontWeight: 600 }}><i className="fas fa-magic" style={{ marginRight: 3 }}></i>AI กำลังอ่านข้อมูลจากบัตร...</span>
                          : idCardPreview
                            ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ อัพโหลดแล้ว</span> — คลิกเพื่อเปลี่ยน</>
                            : <><i className="fas fa-magic" style={{ marginRight: 3, color: '#6366f1' }}></i>OCR อ่านชื่อ-เลขบัตรอัตโนมัติ</>
                        }
                      </div>
                    </div>
                  </div>
                </label>
                {idOcrResult && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#e8f5e9', borderRadius: 8, border: '1px solid #a5d6a7', fontSize: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ color: '#2e7d32', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="fas fa-magic"></i> OCR อ่านบัตรสำเร็จ — บันทึกอัตโนมัติแล้ว
                    </span>
                    {idOcrResult.contact_name && <span>ชื่อ: <strong>{idOcrResult.contact_name}</strong></span>}
                    {idOcrResult.national_id && <span>เลขบัตร: <strong>{idOcrResult.national_id}</strong></span>}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>ลักษณะทรัพย์</label>
                <input type="text" value={propertyTypeLabel[caseData.property_type] || caseData.property_type || '-'} readOnly style={{ background: '#f5f5f5' }} />
              </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e67e22' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#e67e22', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-home" style={{ fontSize: 17 }}></i>
                ข้อมูลทรัพย์
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>ทรัพย์ติดภาระหรือไม่</label>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
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
                <div className="form-group">
                  <label>จังหวัด</label>
                  <input type="text" value={caseData.province || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>อำเภอ</label>
                  <input type="text" value={caseData.district || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>ตำบล</label>
                  <input type="text" value={caseData.subdistrict || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label>บ้านเลขที่</label>
                  <input type="text" value={caseData.house_no || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>ชื่อหมู่บ้าน / โครงการ</label>
                  <input type="text" value={caseData.village_name || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#e53935', fontSize: 13 }}></i>
                  โลเคชั่น
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>(กรอกโดยฝ่ายขาย)</span>
                  <button type="button"
                    onClick={() => {
                      const m = (caseData.location_url || '').match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || (caseData.location_url || '').match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
                      window.open(m ? `https://landsmaps.dol.go.th/#16/${m[1]}/${m[2]}` : 'https://landsmaps.dol.go.th/#', '_blank')
                    }}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#0369a1,#0284c7)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-map"></i> LandsMaps
                  </button>
                </label>
                <input type="url" value={caseData.location_url || ''} readOnly
                  style={{ background: '#f9fafb', color: caseData.location_url ? '#111827' : '#9ca3af', cursor: 'default' }}
                  placeholder="ฝ่ายขายยังไม่ได้กรอกโลเคชั่น" />
                <MapPreview url={caseData.location_url} label="โลเคชั่นทรัพย์" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>เลขโฉนด</label>
                  <input type="text" value={caseData.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>พื้นที่</label>
                  <input type="text" value={caseData.land_area ? `${caseData.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>



              <div className="form-group" style={{ marginTop: 16 }}>
                <label>เลือกนายหน้า</label>
                <select value={form.agent_id} onChange={e => set('agent_id', e.target.value)}>
                  <option value="">-- เลือกนายหน้า --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.full_name} {a.nickname ? `(${a.nickname})` : ''} — {a.phone}
                    </option>
                  ))}
                </select>
                {(() => {
                  const sel = agents.find(a => String(a.id) === String(form.agent_id))
                  return sel ? <AgentCard agentName={sel.full_name} agentPhone={sel.phone} agentCode={sel.agent_code} /> : null
                })()}
              </div>

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button type="button" className="btn btn-outline" onClick={() => navigate(`/sales/edit/${caseData.loan_request_id}`)} style={{ fontSize: 13 }}>
                  <i className="fas fa-edit"></i> แก้ไขข้อมูลลูกหนี้
                </button>
              </div>
            </div>


            {/* ===== เปรียบเทียบรูปทรัพย์: ฝ่ายขาย vs ฝ่ายประเมิน ===== */}
            {(() => {
              const salesPropImgs = parseImages(caseData.property_photos)
              const appraisalImgs = parseImages(caseData.appraisal_images)
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

          </div>

          {/* คอลัมน์ขวา */}
          <div>
            {/* ===== เอกสารสัญญาทั้งหมด (จากฝ่ายออกสัญญา) ===== */}
            <div className="card" style={{ padding: 20, marginBottom: 20, background: '#f1f8e9', borderTop: '3px solid #558b2f' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#33691e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-folder-open"></i>
                เอกสารสัญญา (จากฝ่ายออกสัญญา)
              </h3>

              {/* helper: render 4-tile grid per group */}
              {(() => {
                const DocTile = ({ docKey, label, icon, color }) => {
                  const val = caseData[docKey]
                  const src = val ? (val.startsWith('/') ? val : `/${val}`) : null
                  const isPdf = val && /\.pdf$/i.test(val)
                  const isImg = val && /\.(jpg|jpeg|png|webp)$/i.test(val)
                  return (
                    <div style={{ borderRadius: 8, border: `1.5px solid ${val ? color : '#e0e0e0'}`, overflow: 'hidden', background: val ? '#fafffe' : '#fafafa', opacity: val ? 1 : 0.6 }}>
                      {val ? (
                        <a href={src} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                          {isImg ? (
                            <img src={src} alt={label} style={{ width: '100%', height: 72, objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <div style={{ height: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${color}18`, gap: 4 }}>
                              <i className={`fas ${icon}`} style={{ fontSize: 22, color }}></i>
                              <span style={{ fontSize: 9, color, fontWeight: 600 }}>{isPdf ? 'PDF' : 'ไฟล์'}</span>
                            </div>
                          )}
                          <div style={{ padding: '4px 6px', background: color, textAlign: 'center' }}>
                            <span style={{ fontSize: 9, color: '#fff', fontWeight: 600, lineHeight: 1.3, display: 'block' }}>{label}</span>
                          </div>
                          <div style={{ padding: '3px 6px', textAlign: 'center', background: '#fff' }}>
                            <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 600 }}>✓ พร้อมแล้ว — คลิกดู</span>
                          </div>
                        </a>
                      ) : (
                        <>
                          <div style={{ height: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#f5f5f5' }}>
                            <i className={`fas ${icon}`} style={{ fontSize: 22, color: '#bdbdbd' }}></i>
                          </div>
                          <div style={{ padding: '4px 6px', background: '#e0e0e0', textAlign: 'center' }}>
                            <span style={{ fontSize: 9, color: '#757575', fontWeight: 600, lineHeight: 1.3, display: 'block' }}>{label}</span>
                          </div>
                          <div style={{ padding: '3px 6px', textAlign: 'center', background: '#fff' }}>
                            <span style={{ fontSize: 9, color: '#f57f17' }}>⏳ รอฝ่ายออกสัญญา</span>
                          </div>
                        </>
                      )}
                    </div>
                  )
                }

                // แสดง section ถ้า: loan type ตรง, ไม่มี loan type, หรือมีไฟล์อัพโหลดอยู่แล้ว
                const hasSPDoc = caseData.issuing_doc_selling_pledge || caseData.issuing_doc_sp_broker || caseData.issuing_doc_sp_appendix || caseData.issuing_doc_sp_notice
                const hasMGDoc = caseData.issuing_doc_mortgage || caseData.issuing_doc_mg_broker || caseData.issuing_doc_mg_appendix || caseData.issuing_doc_mg_addendum
                const showSP = !loanTypeDetail || loanTypeDetail === 'selling_pledge' || !!hasSPDoc
                const showMG = !loanTypeDetail || loanTypeDetail === 'mortgage' || !!hasMGDoc

                return (
                  <>
                    {/* ชุดขายฝาก */}
                    {showSP && (
                      <div style={{ marginBottom: showMG ? 14 : 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', marginBottom: 8 }}>
                          <i className="fas fa-home" style={{ marginRight: 5 }}></i>เอกสารชุดขายฝาก
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <DocTile docKey="issuing_doc_selling_pledge" label="สัญญาขายฝาก"                     icon="fa-file-contract"      color="#1565c0" />
                          <DocTile docKey="issuing_doc_sp_broker"      label="สัญญาแต่งตั้งนายหน้า (ขายฝาก)"  icon="fa-handshake"          color="#2e7d32" />
                          <DocTile docKey="issuing_doc_sp_appendix"    label="เอกสารแนบท้ายสัญญาแต่งตั้ง (ขายฝาก)" icon="fa-paperclip"     color="#6a1b9a" />
                          <DocTile docKey="issuing_doc_sp_notice"      label="หนังสือแจ้งเตือน"               icon="fa-bell"               color="#e65100" />
                        </div>
                      </div>
                    )}

                    {/* ชุดจำนอง */}
                    {showMG && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#4527a0', marginBottom: 8, marginTop: showSP ? 4 : 0 }}>
                          <i className="fas fa-landmark" style={{ marginRight: 5 }}></i>เอกสารชุดจำนอง
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <DocTile docKey="issuing_doc_mortgage"    label="สัญญาจำนอง"                       icon="fa-file-contract"      color="#4527a0" />
                          <DocTile docKey="issuing_doc_mg_broker"   label="สัญญาแต่งตั้งนายหน้า (จำนอง)"    icon="fa-handshake"          color="#00695c" />
                          <DocTile docKey="issuing_doc_mg_appendix" label="เอกสารแนบท้ายสัญญาแต่งตั้ง (จำนอง)" icon="fa-paperclip"       color="#ad1457" />
                          <DocTile docKey="issuing_doc_mg_addendum" label="สัญญาต่อท้ายสัญญาจำนอง"          icon="fa-plus-circle"        color="#bf360c" />
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>


            {/* ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม) */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid var(--primary)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-handshake" style={{ marginRight: 8 }}></i>
                ข้อมูลการทำธุรกรรม (ฝ่ายขาย → ฝ่ายนิติกรรม)
              </h3>
              <p style={{ margin: '-12px 0 12px', fontSize: 12, color: '#888' }}>
                กรอกเมื่อนัดหมายวันทำนิติกรรมแล้ว — ฝ่ายนิติจะเห็นข้อมูลนี้เป็นอ้างอิง
              </p>
              <div style={{
                background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 8,
                padding: '8px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
              }}>
                <i className="fas fa-bell" style={{ color: '#3b82f6', fontSize: 13 }}></i>
                <span style={{ color: '#1d4ed8', fontWeight: 600 }}>
                  เมื่อกรอกวันที่ธุรกรรมและบันทึก — ระบบจะแจ้งเตือนฝ่ายนิติกรรมอัตโนมัติ พร้อมลิงก์เพิ่มปฏิทิน (.ics)
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>วันที่ธุรกรรม</label>
                  <input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>เวลา</label>
                  <input type="text" value={form.transaction_time} onChange={e => set('transaction_time', e.target.value)} placeholder="เช่น 10:00" />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>สำนักงานที่ดิน</label>
                <LandOfficeInput id="edit" value={form.transaction_land_office} onChange={e => set('transaction_land_office', e.target.value)} />
              </div>

              {form.transaction_recorded_by && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-user-check" style={{ color: '#22c55e' }}></i>
                  บันทึกโดย: <strong style={{ color: '#333' }}>{form.transaction_recorded_by}</strong>
                  {caseData?.transaction_recorded_at && <span style={{ color: '#aaa' }}>· {new Date(caseData.transaction_recorded_at).toLocaleString('th-TH')}</span>}
                </div>
              )}

              {/* สลิปการเงิน — 2 คอลัมน์ */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed #e0e0e0' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                  <i className="fas fa-eye" style={{ fontSize: 10 }}></i>
                  ฝ่ายขาย · นิติ · บัญชี มองเห็น
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                  {/* ── สลิปโอนเงินค่าปากถุง ── */}
                  {(() => {
                    const txSlipName = form._tx_slip_name || ''
                    const existingSlip = caseData?.transaction_slip
                    const hasNew = !!txSlipName
                    const hasExisting = !!existingSlip && !form._tx_slip_cleared
                    return (
                      <div style={{ background: '#fffbf7', border: '1.5px solid #ffe0b2', borderRadius: 12, padding: 16 }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #ff6d00, #e65100)', color: '#fff',
                          borderRadius: 7, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
                          boxShadow: '0 2px 6px rgba(230,81,0,0.3)'
                        }}>
                          <i className="fas fa-receipt" style={{ fontSize: 11 }}></i>
                          สลิปโอนเงินค่าปากถุง
                        </div>

                        {hasExisting && !hasNew && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff8f0', borderRadius: 10, border: '1.5px solid #ffcc80', marginBottom: 10 }}>
                            {existingSlip.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                              <a href={existingSlip.startsWith('/') ? existingSlip : `/${existingSlip}`} target="_blank" rel="noreferrer">
                                <img src={existingSlip.startsWith('/') ? existingSlip : `/${existingSlip}`} alt="สลิป"
                                  style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 6, border: '1.5px solid #ffcc80', cursor: 'pointer' }} />
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
                              <div style={{ fontSize: 10, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{existingSlip.split('/').pop()}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                              <a href={existingSlip.startsWith('/') ? existingSlip : `/${existingSlip}`} target="_blank" rel="noreferrer"
                                style={{ padding: '4px 10px', background: '#e65100', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <i className="fas fa-eye"></i> ดู
                              </a>
                              <button type="button" onClick={() => { set('_tx_slip_cleared', true); if (txSlipRef.current) txSlipRef.current.value = '' }}
                                style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <i className="fas fa-trash-alt"></i> ลบ
                              </button>
                            </div>
                          </div>
                        )}
                        {hasNew && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #86efac', marginBottom: 10 }}>
                            <div style={{ width: 38, height: 38, background: '#dcfce7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className="fas fa-file-check" style={{ color: '#16a34a', fontSize: 16 }}></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 2 }}><i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>เลือกไฟล์แล้ว</div>
                              <div style={{ fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txSlipName}</div>
                            </div>
                            <button type="button" onClick={() => { set('_tx_slip_name', ''); set('_tx_slip_changed', false); if (txSlipRef.current) txSlipRef.current.value = '' }}
                              style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              <i className="fas fa-times"></i> ยกเลิก
                            </button>
                          </div>
                        )}
                        {form._tx_slip_cleared && !hasNew && (
                          <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px dashed #fca5a5', fontSize: 11, color: '#dc2626', marginBottom: 10 }}>
                            <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>จะลบสลิปออกเมื่อกดบันทึก
                          </div>
                        )}
                        <label style={{
                          display: 'inline-flex', alignItems: 'center', gap: 7,
                          padding: '7px 14px', background: hasNew ? '#f0fdf4' : '#fff8f0',
                          border: `1.5px dashed ${hasNew ? '#86efac' : '#ffb74d'}`,
                          borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          color: hasNew ? '#16a34a' : '#e65100'
                        }}>
                          <i className={`fas ${hasNew ? 'fa-exchange-alt' : 'fa-cloud-upload-alt'}`}></i>
                          {hasNew ? 'เปลี่ยนไฟล์' : hasExisting ? 'ไฟล์ใหม่แทน' : 'เลือกไฟล์สลิป'}
                          <input type="file" accept="image/*,.pdf" ref={txSlipRef} style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files[0]; if (f) { set('_tx_slip_name', f.name); set('_tx_slip_changed', true); set('_tx_slip_cleared', false) } }} />
                        </label>
                        <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>รูปภาพ / PDF</span>
                      </div>
                    )
                  })()}

                  {/* ── สลิปค่าหักล่วงหน้า ── */}
                  {(() => {
                    const advSlipName = form._adv_slip_name || ''
                    const existingSlip = caseData?.advance_slip
                    const hasNew = !!advSlipName
                    const hasExisting = !!existingSlip && !form._adv_slip_cleared
                    return (
                      <div style={{ background: '#fffbf7', border: '1.5px solid #ffe0b2', borderRadius: 12, padding: 16 }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #ff6d00, #e65100)', color: '#fff',
                          borderRadius: 7, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
                          boxShadow: '0 2px 6px rgba(230,81,0,0.3)'
                        }}>
                          <i className="fas fa-receipt" style={{ fontSize: 11 }}></i>
                          สลิปค่าหักล่วงหน้า
                        </div>

                        {hasExisting && !hasNew && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff8f0', borderRadius: 10, border: '1.5px solid #ffcc80', marginBottom: 10 }}>
                            {existingSlip.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                              <a href={existingSlip.startsWith('/') ? existingSlip : `/${existingSlip}`} target="_blank" rel="noreferrer">
                                <img src={existingSlip.startsWith('/') ? existingSlip : `/${existingSlip}`} alt="สลิปล่วงหน้า"
                                  style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 6, border: '1.5px solid #ffcc80', cursor: 'pointer' }} />
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
                              <div style={{ fontSize: 10, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{existingSlip.split('/').pop()}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                              <a href={existingSlip.startsWith('/') ? existingSlip : `/${existingSlip}`} target="_blank" rel="noreferrer"
                                style={{ padding: '4px 10px', background: '#e65100', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <i className="fas fa-eye"></i> ดู
                              </a>
                              <button type="button" onClick={() => { set('_adv_slip_cleared', true); if (advanceSlipRef.current) advanceSlipRef.current.value = '' }}
                                style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <i className="fas fa-trash-alt"></i> ลบ
                              </button>
                            </div>
                          </div>
                        )}
                        {hasNew && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #86efac', marginBottom: 10 }}>
                            <div style={{ width: 38, height: 38, background: '#dcfce7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className="fas fa-file-check" style={{ color: '#16a34a', fontSize: 16 }}></i>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 2 }}><i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>เลือกไฟล์แล้ว</div>
                              <div style={{ fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{advSlipName}</div>
                            </div>
                            <button type="button" onClick={() => { set('_adv_slip_name', ''); set('_adv_slip_changed', false); if (advanceSlipRef.current) advanceSlipRef.current.value = '' }}
                              style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              <i className="fas fa-times"></i> ยกเลิก
                            </button>
                          </div>
                        )}
                        {form._adv_slip_cleared && !hasNew && (
                          <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px dashed #fca5a5', fontSize: 11, color: '#dc2626', marginBottom: 10 }}>
                            <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>จะลบสลิปออกเมื่อกดบันทึก
                          </div>
                        )}
                        <label style={{
                          display: 'inline-flex', alignItems: 'center', gap: 7,
                          padding: '7px 14px', background: hasNew ? '#f0fdf4' : '#fff8f0',
                          border: `1.5px dashed ${hasNew ? '#86efac' : '#ffb74d'}`,
                          borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          color: hasNew ? '#16a34a' : '#e65100'
                        }}>
                          <i className={`fas ${hasNew ? 'fa-exchange-alt' : 'fa-cloud-upload-alt'}`}></i>
                          {hasNew ? 'เปลี่ยนไฟล์' : hasExisting ? 'ไฟล์ใหม่แทน' : 'เลือกไฟล์สลิป'}
                          <input type="file" accept="image/*,.pdf" ref={advanceSlipRef} style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files[0]; if (f) { set('_adv_slip_name', f.name); set('_adv_slip_changed', true); set('_adv_slip_cleared', false) } }} />
                        </label>
                        <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>รูปภาพ / PDF</span>
                      </div>
                    )
                  })()}

                </div>
              </div>
            </div>


            {/* ===== Checklist เอกสารจากไอดีลูกหนี้ ===== */}
            <div className="card" style={{ padding: 20, marginBottom: 20, borderTop: '3px solid #2e7d32' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-clipboard-check"></i>
                Checklist เอกสารทรัพย์
                <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>(จากไอดีลูกหนี้)</span>
              </h3>
              <ChecklistDocsPanel
                caseData={{
                  ...caseData,
                  house_reg_book:  caseData.debtor_house_reg_book,
                  marriage_cert:   caseData.debtor_marriage_cert,
                  spouse_id_card:  caseData.debtor_spouse_id_card,
                  spouse_reg_copy: caseData.debtor_spouse_reg_copy,
                  divorce_doc:     caseData.debtor_divorce_doc,
                }}
                lrId={caseData.loan_request_id}
                token={token()}
                onDocsUpdated={(field, paths) => setCaseData(prev => ({ ...prev, [field]: JSON.stringify(paths) }))}
              />
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '12px 24px' }}>
                ยกเลิก
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <CancelCaseButton caseId={caseData.id} caseCode={caseData.case_code} caseStatus={caseData.status} onSuccess={() => window.location.reload()} />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
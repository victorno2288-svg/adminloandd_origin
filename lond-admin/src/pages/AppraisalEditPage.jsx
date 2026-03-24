import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'
import MapPreview from '../components/MapPreview'
import AgentCard from '../components/AgentCard'
import CaseInfoSummary from '../components/CaseInfoSummary'
import ChecklistDocsPanel from '../components/ChecklistDocsPanel'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/appraisal'

const appraisalTypeOptions = [
  { value: 'outside', label: 'ประเมินนอก' },
  { value: 'inside', label: 'ประเมินใน' },
  { value: 'check_price', label: 'เช็คราคา' },
]

const appraisalResultOptions = [
  { value: '', label: '-- ยังไม่ประเมิน --' },
  { value: 'passed', label: 'ผ่านมาตรฐาน' },
  { value: 'not_passed', label: 'ไม่ผ่านมาตรฐาน' },
]

// สถานะเคส (แสดงอย่างเดียว — auto จาก appraisal_result)
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

const propertyTypeLabel = {
  house: 'บ้าน', townhouse: 'ทาวน์โฮม', condo: 'คอนโด',
  single_house: 'บ้านเดี่ยว (สร้างเอง)', shophouse: 'ตึกแถว',
  apartment: 'หอพัก / อพาร์ตเมนต์', land: 'ที่ดินเปล่า', other: 'อื่นๆ'
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toDateInput(d) {
  if (!d) return ''
  // ใช้ slice โดยตรง หลีกเลี่ยง new Date() ที่แปลง timezone ทำให้วัน/เดือนเลื่อน
  const s = String(d).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
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

export default function AppraisalEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [notifySales, setNotifySales] = useState(false)       // ★ แจ้งฝ่ายขาย เมื่อบันทึก
  const [notifyApproval, setNotifyApproval] = useState(false) // ★ แจ้งฝ่ายอนุมัติ เมื่อบันทึก
  const [activeAppraisalPanel, setActiveAppraisalPanel] = useState('') // '' = ไม่ระบุ
  const [appointments, setAppointments] = useState([])        // ★ นัดหมายจากฝ่ายขาย (read-only)

  const slipRef = useRef(null)
  const bookRef = useRef(null)
  const propImgRef = useRef(null)
  const [editSlipName, setEditSlipName] = useState('')
  const [editBookName, setEditBookName] = useState('')
  const [propUploadNames, setPropUploadNames] = useState([])
  const [propUploading, setPropUploading] = useState(false)
  const [propMsg, setPropMsg] = useState('')
  // ===== VDO Upload =====
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoFiles, setVideoFiles] = useState([])

  const [form, setForm] = useState({
    appraisal_type: 'outside',
    appraisal_result: '',
    appraisal_date: '',
    appraisal_fee: '',
    appraisal_company: '',   // ★ บริษัทประเมิน (SOP Phase 3)
    appraiser_name: '',      // ★ ชื่อผู้ประเมิน (SOP Phase 3)
    payment_date: '',
    payment_status: 'unpaid',
    status: 'pending_approve',
    approved_amount: '',
    note: '',
    recorded_by: '',
    recorded_at: '',
    outside_result: '',
    outside_reason: '',
    inside_result: '',
    inside_reason: '',
    check_price_value: '',
    check_price_detail: '',
  })

  useEffect(() => {
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCaseData(d.caseData)
          setForm({
            appraisal_type: d.caseData.appraisal_type || 'outside',
            appraisal_result: d.caseData.appraisal_result || '',
            appraisal_date: toDateInput(d.caseData.appraisal_date),
            appraisal_fee: d.caseData.appraisal_fee || '',
            appraisal_company: d.caseData.appraisal_company || '',   // ★
            appraiser_name: d.caseData.appraiser_name || '',         // ★
            payment_date: toDateInput(d.caseData.payment_date),
            payment_status: d.caseData.payment_status || 'unpaid',
            status: d.caseData.status || 'pending_approve',
            approved_amount: d.caseData.approved_amount || '',
            note: d.caseData.note || '',
            recorded_by: d.caseData.recorded_by || '',
            recorded_at: d.caseData.recorded_at || '',
            outside_result: d.caseData.outside_result || '',
            outside_reason: d.caseData.outside_reason || '',
            inside_result: d.caseData.inside_result || '',
            inside_reason: d.caseData.inside_reason || '',
            check_price_value: d.caseData.check_price_value || '',
            check_price_detail: d.caseData.check_price_detail || '',
          })
          // sync panel selector — ถ้า DB มีข้อมูลแล้วให้เปิด panel นั้น
          if (d.caseData.appraisal_type) setActiveAppraisalPanel(d.caseData.appraisal_type)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // ดึงนัดหมายจากฝ่ายขาย (read-only)
    fetch(`${API}/cases/${id}/appointments`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setAppointments(d.appointments || []) })
      .catch(() => {})
  }, [id])

  // ===== โหลด checklist video docs =====
  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/debtors/${id}/checklist-docs`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success && d.docs?.property_video) setVideoFiles(d.docs.property_video) })
      .catch(() => {})
  }, [id])

  const handleVideoUpload = async (files) => {
    if (!files || files.length === 0) return
    setUploadingVideo(true)
    const formData = new FormData()
    for (const f of files) formData.append('property_video', f)
    try {
      const res = await fetch(`/api/admin/debtors/${id}/checklist-docs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      })
      const data = await res.json()
      if (data.success && data.docs?.property_video) setVideoFiles(data.docs.property_video)
    } catch { /* silent */ }
    setUploadingVideo(false)
  }

  const handleVideoRemove = async (filePath) => {
    try {
      const res = await fetch(`/api/admin/debtors/${id}/checklist-docs/remove`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'property_video', file_path: filePath })
      })
      const data = await res.json()
      if (data.success && data.docs?.property_video !== undefined) setVideoFiles(data.docs.property_video)
      else setVideoFiles(prev => prev.filter(p => p !== filePath))
    } catch { /* silent */ }
  }

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const clearFileRef = (ref, setName) => {
    if (ref.current) ref.current.value = ''
    setName('')
  }

  // ลบสลิป/เล่มประเมิน
  const deleteCaseImage = async (column) => {
    if (!confirm('ต้องการลบรูปนี้?')) return
    try {
      const res = await fetch(`${API}/delete-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ table: 'loan_requests', id, column })
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

  // อัพโหลดรูปทรัพย์ใหม่ (บันทึกลง loan_requests.images)
  const handleUploadPropertyImages = async () => {
    const files = propImgRef.current?.files
    if (!files || files.length === 0) {
      setPropMsg('กรุณาเลือกรูปภาพก่อน')
      return
    }
    setPropUploading(true)
    setPropMsg('')
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append('appraisal_property_image', f))
      const res = await fetch(`${API}/property-images/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        // อัพเดทรูปฝ่ายประเมินใน caseData ทันที (appraisal_images แยกจาก images)
        setCaseData(prev => ({ ...prev, appraisal_images: JSON.stringify(data.allImages) }))
        propImgRef.current.value = ''
        setPropUploadNames([])
        setPropMsg('อัพโหลดรูปสำเร็จ!')
        setTimeout(() => setPropMsg(''), 3000)
      } else {
        setPropMsg(data.message || 'อัพโหลดไม่สำเร็จ')
      }
    } catch {
      setPropMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setPropUploading(false)
  }

  // ลบรูปทรัพย์ฝ่ายประเมินจาก loan_requests.appraisal_images
  const handleDeletePropertyImage = async (imgPath) => {
    if (!confirm('ต้องการลบรูปนี้?')) return
    try {
      const res = await fetch(`${API}/delete-property-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ loanRequestId: id, imagePath: imgPath })
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => ({ ...prev, appraisal_images: JSON.stringify(data.updatedImages) }))
      } else {
        alert(data.message || 'ลบไม่สำเร็จ')
      }
    } catch {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
  }

  // บันทึกข้อมูล
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')

    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'recorded_by') return // ไม่ส่ง recorded_by
        if (k === 'recorded_at') return // ไม่ส่ง recorded_at
        if (k === 'appraisal_date') return // ตั้งโดยฝ่ายขายเท่านั้น — ไม่ส่งกลับ
        if (k === 'payment_date') return   // ตั้งโดยฝ่ายขายเท่านั้น — ไม่ส่งกลับ
        fd.append(k, v !== null && v !== undefined ? v : '')
      })
      fd.append('notify_sales',    notifySales    ? '1' : '0') // ★ แจ้งฝ่ายขาย
      fd.append('notify_approval', notifyApproval ? '1' : '0') // ★ แจ้งฝ่ายอนุมัติ
      if (form.appraisal_result === 'not_passed') fd.append('notify_rejected', '1')

      if (slipRef.current?.files[0]) {
        fd.append('slip_image', slipRef.current.files[0])
      }
      if (bookRef.current?.files[0]) {
        fd.append('appraisal_book_image', bookRef.current.files[0])
      }

      const res = await fetch(`${API}/cases/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setTimeout(() => navigate('/appraisal'), 1000)
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

  if (!caseData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#e74c3c' }}></i>
        <p style={{ marginTop: 12 }}>ไม่พบข้อมูลเคส</p>
        <button className="btn btn-outline" onClick={() => navigate('/appraisal')} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายประเมิน
        </button>
      </div>
    )
  }

  // ==================== Helper ====================
  const parseImages = (jsonStr) => {
    try { return JSON.parse(jsonStr) || [] } catch { return [] }
  }

  let images = parseImages(caseData.images)
  let deedImages = parseImages(caseData.deed_images)
  let appraisalImages = parseImages(caseData.appraisal_images)
  // รูปทรัพย์จากฝ่ายขาย: รวมทั้งจาก images (property_image upload) + property_photos (checklist docs)
  let salesPropertyPhotos = [
    ...images.filter(img => img.includes('properties')),
    ...parseImages(caseData.property_photos),
  ]
  let borrowerIdCards = parseImages(caseData.borrower_id_card)

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
                  onError={(e) => { e.target.style.display = 'none' }} />
              )}
            </a>
          )
        })}
      </div>
    )
  }

  // ==================== RENDER ====================
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => navigate('/appraisal')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-clipboard-check" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            แก้ไขเคส (ฝ่ายประเมิน) — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
            {caseData.contact_name && <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginLeft: 4 }}>({caseData.contact_name})</span>}
          </h2>
        </div>
        <span style={{ fontSize: 13, color: 'var(--gray)' }}>
          สร้างเมื่อ: {formatDate(caseData.created_at)}
        </span>
      </div>

      {msg && <div className="error-msg" style={{ marginBottom: 16 }}>{msg}</div>}
      {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="edit-page-grid">

          {/* ===== คอลัมน์ซ้าย: ข้อมูลลูกหนี้ (read-only) ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
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
              </div>

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

              <AgentCard agentName={caseData.agent_name} agentPhone={caseData.agent_phone} agentCode={caseData.agent_code} />

              {/* บัตรประชาชน */}
              {borrowerIdCards.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปหน้าบัตรประชาชน</label>
                  <ImageGrid imgList={borrowerIdCards} label="id" />
                </div>
              )}

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>ลักษณะทรัพย์</label>
                <input type="text" value={propertyTypeLabel[caseData.property_type] || caseData.property_type || '-'} readOnly style={{ background: '#f5f5f5' }} />
              </div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>ข้อมูลทรัพย์</h3>

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
                <div className="form-group">
                  <label>เลขโฉนด</label>
                  <input type="text" value={caseData.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>ประเภทโฉนด</label>
                  <input type="text" value={{ chanote: 'โฉนดที่ดิน (น.ส.4)', ns4k: 'น.ส.4ก.', ns3: 'นส.3', ns3k: 'นส.3ก.', spk: 'ที่ดิน ส.ป.ก.' }[caseData.deed_type] || caseData.deed_type || '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>พื้นที่ดิน (ตร.วา)</label>
                  <input type="text" value={caseData.land_area ? `${caseData.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>

              {caseData.building_area && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
                  <div className="form-group">
                    <label>พื้นที่อาคาร (ตร.ม.)</label>
                    <input type="text" value={`${caseData.building_area} ตร.ม.`} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                </div>
              )}

              {caseData.estimated_value && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, border: '1.5px solid #fcd34d', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-tag" style={{ color: '#d97706', fontSize: 16 }}></i>
                  <div>
                    <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>ราคาประเมินเบื้องต้น (ฝ่ายขาย)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#b45309' }}>
                      {Number(caseData.estimated_value).toLocaleString('th-TH')} บาท
                    </div>
                  </div>
                </div>
              )}



              {/* ===== เปรียบเทียบรูปทรัพย์: ฝ่ายขาย vs ฝ่ายประเมิน (เข้าพื้นที่) ===== */}
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
                      รูปจากฝ่ายขาย ({salesPropertyPhotos.length} รูป)
                    </div>
                    {salesPropertyPhotos.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
                        {salesPropertyPhotos.map((src, i) => {
                          const fullSrc = src.startsWith('/') ? src : `/${src}`
                          const isPdf = src.toLowerCase().includes('.pdf')
                          return (
                            <div key={i} style={{ border: '1.5px solid #86efac', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#fafafa' }}
                              onClick={() => window.open(fullSrc, '_blank')}>
                              {isPdf ? (
                                <div style={{ width: '100%', height: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', gap: 4 }}>
                                  <i className="fas fa-file-pdf" style={{ fontSize: 24, color: '#e53935' }}></i>
                                  <span style={{ fontSize: 9, color: '#e53935', fontWeight: 600 }}>PDF</span>
                                </div>
                              ) : (
                                <img src={fullSrc} alt={`sales-${i}`}
                                  style={{ width: '100%', height: 90, objectFit: 'cover' }}
                                  onError={e => { e.target.style.display = 'none' }} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#999' }}>ยังไม่มีรูปจากฝ่ายขาย</span>
                    )}
                  </div>
                  {/* ฝ่ายประเมิน */}
                  <div style={{ background: '#f3e5f5', borderRadius: 8, padding: 12, border: '1px solid #ce93d8' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#7b1fa2', marginBottom: 8 }}>
                      <i className="fas fa-search-location" style={{ marginRight: 5 }}></i>
                      รูปจากฝ่ายประเมิน – เข้าพื้นที่ ({appraisalImages.length} รูป)
                    </div>
                    {/* แสดงรูปพร้อมปุ่มลบ */}
                    {appraisalImages.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
                        {appraisalImages.map((img, i) => {
                          const src = img.startsWith('/') ? img : `/${img}`
                          const isPdf = img.toLowerCase().includes('.pdf')
                          return (
                            <div key={i} style={{ position: 'relative', border: '1.5px solid #ce93d8', borderRadius: 8, overflow: 'hidden', background: '#fafafa' }}>
                              <button type="button" onClick={() => handleDeletePropertyImage(img)} style={{ ...xBtnOverlay }} title="ลบรูป">
                                <i className="fas fa-times"></i>
                              </button>
                              {isPdf ? (
                                <div style={{ width: '100%', height: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', cursor: 'pointer', gap: 4 }}
                                  onClick={() => window.open(src, '_blank')}>
                                  <i className="fas fa-file-pdf" style={{ fontSize: 24, color: '#e53935' }}></i>
                                  <span style={{ fontSize: 9, color: '#e53935', fontWeight: 600 }}>PDF</span>
                                </div>
                              ) : (
                                <a href={src} target="_blank" rel="noreferrer">
                                  <img src={src} alt={`appr-${i}`}
                                    style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
                                    onError={e => { e.target.style.display = 'none' }} />
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#999' }}>ยังไม่มีรูปจากฝ่ายประเมิน</span>
                    )}
                    {/* อัพโหลดรูปใหม่ */}
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input type="file" accept="image/*,.pdf" multiple ref={propImgRef}
                          onChange={e => setPropUploadNames(Array.from(e.target.files).map(f => f.name))}
                          style={{ fontSize: 12 }} />
                        {propUploadNames.length > 0 && (
                          <small style={{ color: '#7b1fa2', fontSize: 11 }}>เลือก {propUploadNames.length} ไฟล์</small>
                        )}
                      </div>
                      <button type="button" onClick={handleUploadPropertyImages} disabled={propUploading}
                        style={{
                          background: '#7b1fa2', color: '#fff', border: 'none', borderRadius: 6,
                          padding: '6px 14px', fontWeight: 600, fontSize: 12,
                          cursor: propUploading ? 'not-allowed' : 'pointer', opacity: propUploading ? 0.7 : 1,
                          whiteSpace: 'nowrap'
                        }}>
                        {propUploading ? <><i className="fas fa-spinner fa-spin"></i> อัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลด</>}
                      </button>
                    </div>
                    {propMsg && (
                      <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600,
                        color: propMsg.includes('สำเร็จ') ? '#15803d' : '#e74c3c' }}>
                        <i className={`fas fa-${propMsg.includes('สำเร็จ') ? 'check-circle' : 'exclamation-circle'}`}></i> {propMsg}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== VDO ทรัพย์สิน — ฝ่ายประเมินอัพโหลด ===== */}
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-video"></i> VDO ทรัพย์สิน
                  </span>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: uploadingVideo ? '#e0e0e0' : '#7c3aed',
                    color: '#fff', borderRadius: 7, padding: '5px 14px',
                    fontSize: 12, fontWeight: 600, cursor: uploadingVideo ? 'default' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}>
                    {uploadingVideo
                      ? <><i className="fas fa-spinner fa-spin" /> กำลังอัพ...</>
                      : <><i className="fas fa-upload" /> อัพโหลดวีดีโอ</>
                    }
                    <input type="file" accept="video/*" multiple style={{ display: 'none' }}
                      disabled={uploadingVideo}
                      onChange={e => {
                        if (e.target.files?.length) {
                          handleVideoUpload(Array.from(e.target.files))
                          e.target.value = ''
                        }
                      }} />
                  </label>
                </div>
                {/* Thumbnails วีดีโอที่อัพแล้ว */}
                {videoFiles.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {videoFiles.map((fp, fi) => (
                      <div key={fi} style={{ position: 'relative', display: 'inline-flex' }}>
                        <div
                          onClick={() => window.open(fp.startsWith('/') ? fp : `/${fp}`, '_blank')}
                          style={{
                            width: 64, height: 64, borderRadius: 8,
                            background: '#ede9fe', border: '1.5px solid #c4b5fd',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', gap: 3
                          }}>
                          <i className="fas fa-play-circle" style={{ fontSize: 22, color: '#7c3aed' }} />
                          <span style={{ fontSize: 9, fontWeight: 600, color: '#7c3aed' }}>VDO {fi + 1}</span>
                        </div>
                        <button type="button" onClick={() => handleVideoRemove(fp)}
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
                {/* วีดีโอเก่าจาก images column */}
                {images.filter(img => img.includes('videos')).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <small style={{ color: '#9ca3af', fontSize: 10 }}>วีดีโอเก่า:</small>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {images.filter(img => img.includes('videos')).map((fp, fi) => (
                        <div key={fi} onClick={() => window.open(fp.startsWith('/') ? fp : `/${fp}`, '_blank')}
                          style={{
                            width: 56, height: 56, borderRadius: 6, background: '#f3f0ff',
                            border: '1px solid #c4b5fd', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 2
                          }}>
                          <i className="fas fa-play-circle" style={{ fontSize: 18, color: '#7c3aed' }} />
                          <span style={{ fontSize: 9, color: '#7c3aed' }}>VDO</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {videoFiles.length === 0 && images.filter(img => img.includes('videos')).length === 0 && (
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '8px 0 0', fontStyle: 'italic' }}>ยังไม่มีวีดีโอ — กดอัพโหลดเพื่อเพิ่ม</p>
                )}
              </div>
            </div>

          </div>

          {/* ===== คอลัมน์ขวา: สถานะประเมิน (แก้ไขได้) ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-clipboard-check" style={{ marginRight: 8 }}></i>
                สถานะประเมิน
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    วันที่นัดประเมิน
                    <span style={{ fontSize: 10, background: '#e3f2fd', color: '#1565c0', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                      ฝ่ายขายกรอก
                    </span>
                  </label>
                  <input type="date" value={form.appraisal_date} readOnly
                    style={{ background: '#f5f5f5', cursor: 'default' }} />
                </div>
                <div className="form-group">
                  <label>ค่าประเมิน (บาท)</label>
                  <input type="number" step="0.01" value={form.appraisal_fee} onChange={e => set('appraisal_fee', e.target.value)} placeholder="2900" />
                </div>
              </div>

              {/* ★ บริษัทประเมิน + ชื่อผู้ประเมิน (SOP Phase 3) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
                <div className="form-group">
                  <label>
                    <i className="fas fa-building" style={{ color: '#6366f1', marginRight: 6 }}></i>
                    บริษัทประเมิน
                  </label>
                  <input type="text" value={form.appraisal_company}
                    onChange={e => set('appraisal_company', e.target.value)}
                    placeholder="เช่น บจก. ประเมินราคา เอเชีย" />
                </div>
                <div className="form-group">
                  <label>
                    <i className="fas fa-user-tie" style={{ color: '#0369a1', marginRight: 6 }}></i>
                    ชื่อผู้ประเมิน
                  </label>
                  <input type="text" value={form.appraiser_name}
                    onChange={e => set('appraiser_name', e.target.value)}
                    placeholder="ชื่อ-สกุล ผู้ประเมิน" />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  วันที่ชำระ
                  <span style={{ fontSize: 10, background: '#e3f2fd', color: '#1565c0', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                    ฝ่ายขายกรอก
                  </span>
                </label>
                <input type="date" value={form.payment_date} readOnly
                  style={{ background: '#f5f5f5', cursor: 'default' }} />
              </div>

              {/* ===== นัดหมายจากฝ่ายขาย (read-only) ===== */}
              {appointments.length > 0 && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#fff8e1', borderRadius: 10, border: '1.5px solid #ffe082' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#f57c00', marginBottom: 10 }}>
                    <i className="fas fa-calendar-check" style={{ marginRight: 6 }}></i>
                    นัดหมาย (ฝ่ายขายนัด)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {appointments.map((a, i) => {
                      const typeMap = {
                        valuation:   { label: '🏠 นัดประเมินทรัพย์', color: '#1565c0' },
                        transaction: { label: '🏛️ นัดกรมที่ดิน',     color: '#6a1b9a' },
                        call:        { label: '📞 โทรหาลูกหนี้',      color: '#2e7d32' },
                        other:       { label: '📌 อื่นๆ',              color: '#e65100' },
                      }
                      const t = typeMap[a.appt_type] || typeMap.other
                      const statusColor = a.status === 'completed' ? '#27ae60' : a.status === 'cancelled' ? '#e74c3c' : '#1565c0'
                      const statusLabel = a.status === 'completed' ? '✅ เสร็จแล้ว' : a.status === 'cancelled' ? '❌ ยกเลิก' : '🕐 รอดำเนินการ'
                      const apptDate = a.appt_date ? new Date(a.appt_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
                      const apptTime = a.appt_time ? a.appt_time.slice(0, 5) : ''
                      return (
                        <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #ffe082', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#555' }}>
                            <i className="fas fa-calendar" style={{ marginRight: 5, color: '#f57c00' }}></i>
                            {apptDate}{apptTime ? ` เวลา ${apptTime}` : ''}
                          </div>
                          {a.location && (
                            <div style={{ fontSize: 12, color: '#555' }}>
                              <i className="fas fa-map-marker-alt" style={{ marginRight: 5, color: '#e74c3c' }}></i>
                              {a.location}
                            </div>
                          )}
                          {a.note && (
                            <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                              <i className="fas fa-sticky-note" style={{ marginRight: 4 }}></i>{a.note}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* สลิปค่าประเมิน — อัพโหลดโดยฝ่ายขาย ดูได้อย่างเดียว */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  สลิปค่าประเมิน
                  <span style={{ fontSize: 10, background: '#fff9c4', color: '#f57f17', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                    ฝ่ายขายอัพโหลด
                  </span>
                </label>
                {caseData.slip_image ? (
                  <div style={{ marginTop: 6, display: 'inline-block' }}>
                    <a href={`/${caseData.slip_image}`} target="_blank" rel="noreferrer">
                      {/\.pdf$/i.test(caseData.slip_image) ? (
                        <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #ffe082', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fffde7', color: '#f57f17' }}>
                          <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                          <span style={{ fontSize: 10, marginTop: 4 }}>PDF</span>
                        </div>
                      ) : (
                        <img src={`/${caseData.slip_image}`} alt="slip" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #ffe082' }} onError={(e) => { e.target.style.display = 'none' }} />
                      )}
                    </a>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f5f5f5', border: '1px solid #e0e0e0', fontSize: 12, color: '#aaa', marginTop: 4 }}>
                    ยังไม่มีสลิป (ฝ่ายขายจะอัพโหลดให้)
                  </div>
                )}
              </div>

              {/* เล่มประเมิน */}
              <div className="form-group">
                <label>อัพโหลดเล่มประเมิน</label>
                <input type="file" accept="image/*,.pdf" ref={bookRef}
                  onChange={e => setEditBookName(e.target.files[0]?.name || '')} />
                {editBookName && (
                  <small style={{ color: '#04AA6D', fontSize: 11 }}>
                    {editBookName} <button type="button" onClick={() => clearFileRef(bookRef, setEditBookName)} style={xBtnInline} title="ล้างไฟล์"><i className="fas fa-times"></i></button>
                  </small>
                )}
                {caseData.appraisal_book_image && (
                  <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                    <button type="button" onClick={() => deleteCaseImage('appraisal_book_image')}
                      style={xBtnOverlay} title="ลบรูป">
                      <i className="fas fa-times"></i>
                    </button>
                    <a href={`/${caseData.appraisal_book_image}`} target="_blank" rel="noreferrer">
                      {/\.pdf$/i.test(caseData.appraisal_book_image) ? (
                        <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c' }}>
                          <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                          <span style={{ fontSize: 10, marginTop: 4 }}>PDF</span>
                        </div>
                      ) : (
                        <img src={`/${caseData.appraisal_book_image}`} alt="book" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }} onError={(e) => { e.target.style.display = 'none' }} />
                      )}
                    </a>
                  </div>
                )}
              </div>

              {form.recorded_by && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-user-check" style={{ color: '#22c55e' }}></i>
                  บันทึกโดย: <strong style={{ color: '#333' }}>{form.recorded_by}</strong>
                  {form.recorded_at && <span style={{ color: '#aaa' }}>· {formatDate(form.recorded_at)}</span>}
                </div>
              )}
            </div>


            {/* ผลประเมินจากฝ่ายประเมิน */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e67e22' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#e67e22' }}>
                <i className="fas fa-chart-bar" style={{ marginRight: 8 }}></i>
                ผลประเมินจากฝ่ายประเมิน
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#888' }}>
                ประเภทการประเมินกำหนดโดยฝ่ายขาย — ฝ่ายอนุมัติและนิติจะเห็นผลนี้
              </p>

              {/* Badge แสดงประเภท (อ่านจาก form.appraisal_type ที่ฝ่ายขายเลือก) */}
              {(() => {
                const typeMap = {
                  outside:     { label: 'ประเมินนอก', icon: 'fas fa-map-marker-alt', color: '#e67e22', bg: '#fff8f3', border: '#e67e2240', resultBorder: '#e67e22' },
                  inside:      { label: 'ประเมินใน',  icon: 'fas fa-home',            color: '#3498db', bg: '#f0f8ff', border: '#3498db40', resultBorder: '#3498db' },
                  check_price: { label: 'เช็คราคา',   icon: 'fas fa-tags',             color: '#9b59b6', bg: '#fdf4ff', border: '#9b59b640', resultBorder: '#9b59b6' },
                }
                const t = typeMap[form.appraisal_type] || typeMap.outside
                const isCheckPrice = form.appraisal_type === 'check_price'

                return (
                  <>
                    {/* Badge ประเภท (ฝ่ายขายกำหนด) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 20, background: t.bg, border: `2px solid ${t.resultBorder}`, fontWeight: 700, fontSize: 13, color: t.color }}>
                        <i className={t.icon} style={{ fontSize: 12 }}></i>
                        {t.label}
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>ฝ่ายขายเลือก</span>
                    </div>

                    <div style={{ background: t.bg, border: `1.5px solid ${t.border}`, borderRadius: 10, padding: 18 }}>
                      {!isCheckPrice ? (
                        // ประเมินนอก / ประเมินใน → ผลเดียว = appraisal_result
                        <>
                          <div className="form-group">
                            <label style={{ fontWeight: 700 }}>{t.label} ผ่านเกณฑ์ไหม?</label>
                            <select value={form.appraisal_result} onChange={e => set('appraisal_result', e.target.value)}
                              style={{
                                borderColor: form.appraisal_result === 'passed' ? '#27ae60' : form.appraisal_result === 'not_passed' ? '#e74c3c' : t.resultBorder,
                                fontWeight: form.appraisal_result ? 700 : 400,
                                color: form.appraisal_result === 'passed' ? '#27ae60' : form.appraisal_result === 'not_passed' ? '#e74c3c' : undefined,
                                fontSize: 14,
                              }}>
                              <option value="">-- ยังไม่ประเมิน --</option>
                              <option value="passed">✅ ผ่านมาตรฐาน</option>
                              <option value="not_passed">❌ ไม่ผ่านมาตรฐาน</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>เหตุผลประกอบ</label>
                            <textarea rows="3"
                              value={form.appraisal_type === 'outside' ? form.outside_reason : form.inside_reason}
                              onChange={e => set(form.appraisal_type === 'outside' ? 'outside_reason' : 'inside_reason', e.target.value)}
                              placeholder="ระบุเหตุผลหรือรายละเอียดเพิ่มเติม..." style={{ resize: 'vertical' }}></textarea>
                          </div>
                        </>
                      ) : (
                        // เช็คราคา → ราคา + รายละเอียด
                        <>
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: '#9b59b6', display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            ผลเช็คราคา
                            <span style={{ fontSize: 10, fontWeight: 400, color: '#7c3aed', background: '#ede9fe', borderRadius: 10, padding: '1px 8px' }}>ฝ่ายอนุมัติแก้ไขได้</span>
                            <span style={{ fontSize: 10, fontWeight: 400, color: '#059669', background: '#d1fae5', borderRadius: 10, padding: '1px 8px' }}>ฝ่ายขายเห็นได้</span>
                          </div>
                          <div className="form-group">
                            <label>ราคาประเมิน (บาท)</label>
                            <input type="number" value={form.check_price_value} onChange={e => set('check_price_value', e.target.value)}
                              placeholder="ระบุราคา" style={{ borderColor: form.check_price_value ? '#9b59b6' : undefined }} />
                          </div>
                          <div className="form-group">
                            <label>รายละเอียดเพิ่มเติม</label>
                            <textarea rows="3" value={form.check_price_detail} onChange={e => set('check_price_detail', e.target.value)}
                              placeholder="รายละเอียดเพิ่มเติม..." style={{ resize: 'vertical' }}></textarea>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>

            {/* ===== ผลเช็คราคา (แยกการ์ด — กรอกได้เสมอ) ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderLeft: '3px solid #9b59b6' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#9b59b6' }}>
                <i className="fas fa-tags" style={{ marginRight: 8 }}></i>ผลเช็คราคา
                <span style={{ fontSize: 11, fontWeight: 400, color: '#7c3aed', background: '#ede9fe', borderRadius: 10, padding: '1px 8px', marginLeft: 8 }}>ฝ่ายอนุมัติแก้ไขได้</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: '#059669', background: '#d1fae5', borderRadius: 10, padding: '1px 8px', marginLeft: 6 }}>ฝ่ายขายเห็นได้</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ราคาเช็ค (บาท)</label>
                  <input type="number" placeholder="ระบุราคาที่ประเมินได้"
                    value={form.check_price_value}
                    onChange={e => set('check_price_value', e.target.value)}
                    style={{ borderColor: form.check_price_value ? '#9b59b6' : undefined }} />
                </div>
                <div className="form-group">
                  <label>รายละเอียด</label>
                  <input type="text" placeholder="เช่น ราคาตลาด, แหล่งข้อมูล..."
                    value={form.check_price_detail}
                    onChange={e => set('check_price_detail', e.target.value)} />
                </div>
              </div>
              {caseData.check_price_recorded_at && (
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  บันทึกล่าสุด: {new Date(caseData.check_price_recorded_at).toLocaleString('th-TH')}
                </div>
              )}
            </div>


            {/* ★ checkbox/banner แจ้งผลราคาประเมิน — แสดงต่างกันตามผลประเมิน */}
            {form.appraisal_result === 'not_passed' ? (
              /* ผลไม่ผ่าน → banner แดงแจ้งว่าจะ auto-notify ฝ่ายขาย */
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                <i className="fas fa-exclamation-circle" style={{ color: '#dc2626', fontSize: 16, flexShrink: 0 }}></i>
                <div>
                  <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 700 }}>
                    เมื่อบันทึก ระบบจะแจ้งฝ่ายขายว่าทรัพย์ไม่ผ่านเกณฑ์พร้อมเหตุผล
                  </div>
                </div>
              </div>
            ) : (
              /* ผลผ่าน / ยังไม่ประเมิน → 2 checkbox แยกกัน */
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-bell" style={{ color: '#d97706' }}></i>
                  แจ้งเตือนทันทีเมื่อบันทึก — เลือกฝ่ายที่ต้องการส่งสัญญาณ
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                  {/* แจ้งฝ่ายขาย */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                    background: notifySales ? '#ecfdf5' : '#f9fafb',
                    border: `1.5px solid ${notifySales ? '#6ee7b7' : '#e5e7eb'}`,
                    borderRadius: 10, padding: '12px 14px', transition: 'all 0.18s',
                    boxShadow: notifySales ? '0 0 0 3px rgba(110,231,183,0.25)' : 'none',
                  }}>
                    <input
                      type="checkbox"
                      checked={notifySales}
                      onChange={e => setNotifySales(e.target.checked)}
                      style={{ width: 17, height: 17, accentColor: '#059669', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: notifySales ? '#065f46' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {notifySales && <i className="fas fa-bell" style={{ color: '#059669', fontSize: 12 }}></i>}
                        ฝ่ายขาย
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>ส่งราคาประเมินให้ฝ่ายขาย</div>
                    </div>
                  </label>

                  {/* แจ้งฝ่ายอนุมัติ */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                    background: notifyApproval ? '#eff6ff' : '#f9fafb',
                    border: `1.5px solid ${notifyApproval ? '#93c5fd' : '#e5e7eb'}`,
                    borderRadius: 10, padding: '12px 14px', transition: 'all 0.18s',
                    boxShadow: notifyApproval ? '0 0 0 3px rgba(147,197,253,0.25)' : 'none',
                  }}>
                    <input
                      type="checkbox"
                      checked={notifyApproval}
                      onChange={e => setNotifyApproval(e.target.checked)}
                      style={{ width: 17, height: 17, accentColor: '#2563eb', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: notifyApproval ? '#1e40af' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {notifyApproval && <i className="fas fa-bell" style={{ color: '#2563eb', fontSize: 12 }}></i>}
                        ฝ่ายอนุมัติ
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>ส่งราคาประเมินให้ฝ่ายอนุมัติ</div>
                    </div>
                  </label>

                </div>
              </div>
            )}


            {/* ข้อมูลจากฝ่ายขาย */}
            <CaseInfoSummary caseId={caseData.id} />

            {/* เอกสาร Checklist จากฝ่ายขาย */}
            <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid #d1fae5', background: '#f0fdf4' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#15803d' }}>
                <i className="fas fa-folder-open" style={{ marginRight: 8 }}></i>เอกสารประกอบ
              </h3>
              <ChecklistDocsPanel caseData={caseData} lrId={caseData.loan_request_id} token={token()} onDocsUpdated={(field, paths) => setCaseData(prev => ({ ...prev, [field]: JSON.stringify(paths) }))} />
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              {form.appraisal_result === 'not_passed' ? (
                <button type="submit" disabled={saving} style={{
                  padding: '13px 32px', flex: 1, border: 'none', borderRadius: 8, cursor: saving ? 'wait' : 'pointer',
                  background: saving ? '#ccc' : '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: saving ? 'none' : '0 2px 8px rgba(220,38,38,0.3)',
                }}>
                  {saving
                    ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</>
                    : <><i className="fas fa-times-circle"></i> บันทึก &amp; แจ้งฝ่ายขายว่าไม่ผ่าน</>
                  }
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                  {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
                </button>
              )}
              <button type="button" className="btn btn-outline" onClick={() => navigate('/appraisal')} style={{ padding: '12px 24px' }}>
                กลับ
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
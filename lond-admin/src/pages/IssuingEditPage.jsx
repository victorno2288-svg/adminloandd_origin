import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'
import MapPreview from '../components/MapPreview'
import AgentCard from '../components/AgentCard'
import ChecklistDocsPanel from '../components/ChecklistDocsPanel'
import DocGeneratorPanel from '../components/DocGeneratorPanel'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/issuing'

// อ่าน department จาก JWT (client-side decode ไม่ต้อง verify)
function getMyDept() {
  try {
    const t = localStorage.getItem('loandd_admin')
    if (!t) return ''
    return JSON.parse(atob(t.split('.')[1])).department || ''
  } catch { return '' }
}

const appraisalTypeLabel = { outside: 'ประเมินนอก', inside: 'ประเมินใน', check_price: 'เช็คราคา' }
const appraisalResultLabel = { passed: 'ผ่านมาตรฐาน', not_passed: 'ไม่ผ่านมาตรฐาน', '': 'ยังไม่ประเมิน' }

const propertyTypeLabel = {
  house: 'บ้าน', townhouse: 'ทาวน์โฮม', condo: 'คอนโด',
  single_house: 'บ้านเดี่ยว (สร้างเอง)', shophouse: 'ตึกแถว',
  apartment: 'หอพัก / อพาร์ตเมนต์', land: 'ที่ดินเปล่า', other: 'อื่นๆ'
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
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isPdfNew, setIsPdfNew] = useState(false)

  const handleChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileNameState(file.name)
    // สร้าง preview URL สำหรับไฟล์ใหม่
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
      setIsPdfNew(false)
    } else {
      setPreviewUrl(null)
      setIsPdfNew(file.type === 'application/pdf')
    }
  }

  const handleClear = () => {
    if (fileRef.current) fileRef.current.value = ''
    setFileNameState('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setIsPdfNew(false)
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <input type="file" accept="image/*,.pdf" ref={fileRef} onChange={handleChange} />

      {/* ── preview ไฟล์ใหม่ที่เลือก (ก่อน save) ── */}
      {fileNameState && (
        <div style={{ marginTop: 10 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button type="button" onClick={handleClear} style={xBtnOverlay} title="ล้างไฟล์">
              <i className="fas fa-times"></i>
            </button>
            {previewUrl ? (
              <img src={previewUrl} alt="preview" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #04AA6D' }} />
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: 8, border: `2px solid ${isPdfNew ? '#e74c3c' : '#aaa'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isPdfNew ? '#fff5f5' : '#f9f9f9', color: isPdfNew ? '#e74c3c' : '#888' }}>
                <i className={`fas ${isPdfNew ? 'fa-file-pdf' : 'fa-file'}`} style={{ fontSize: 28 }}></i>
                <span style={{ fontSize: 10, marginTop: 4 }}>{isPdfNew ? 'PDF' : 'ไฟล์'}</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#04AA6D' }}>
            {fileNameState} <span style={{ color: '#888' }}>(รอบันทึก)</span>
          </div>
        </div>
      )}

      {/* ── ไฟล์ที่ save แล้ว ── */}
      {currentFile && !fileNameState && (
        <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
          <button type="button" onClick={() => onDelete(fieldName)} style={xBtnOverlay} title="ลบเอกสาร">
            <i className="fas fa-times"></i>
          </button>
          <a href={currentFile.startsWith('/') ? currentFile : `/${currentFile}`} target="_blank" rel="noreferrer">
            {/\.pdf$/i.test(currentFile) ? (
              <div style={{ width: 100, height: 100, borderRadius: 8, border: '2px solid #e74c3c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: '#e74c3c' }}>
                <i className="fas fa-file-pdf" style={{ fontSize: 28 }}></i>
                <span style={{ fontSize: 10, marginTop: 4 }}>PDF</span>
              </div>
            ) : (
              <img src={currentFile.startsWith('/') ? currentFile : `/${currentFile}`} alt={label} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #e0e0e0' }}
                onError={e => { e.target.style.display = 'none' }} />
            )}
          </a>
        </div>
      )}
    </div>
  )
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

function toDateTimeInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 16)
}

export default function IssuingEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    issuing_status: 'pending',
    contract_appointment: 0,
    contract_selling_pledge: 0,
    contract_mortgage: 0,
    reminder_selling_pledge: 0,
    reminder_mortgage: 0,
    email: '',
    note: '',
    commission_amount: '',   // ★ ค่าคอมมิชชั่นนายหน้า
  })

  // ===== Document file refs =====
  const docSellingPledgeRef  = useRef(null)
  const docMortgageRef       = useRef(null)
  const commissionSlipRef    = useRef(null)   // ★ สลิปค่าดำเนินการ
  const brokerContractRef    = useRef(null)   // ★ สัญญาแต่งตั้งนายหน้า
  const brokerIdRef          = useRef(null)   // ★ บัตรประชาชนนายหน้า
  const docPanelRef          = useRef(null)   // ★ ref สำหรับ DocGeneratorPanel (เอกสารสัญญาแต่ละประเภท)
  const [fileNames, setFileNames] = useState({ doc_selling_pledge: '', doc_mortgage: '', commission_slip: '', broker_contract: '', broker_id: '' })
  const [notifyLegalOnSave, setNotifyLegalOnSave] = useState(false)       // ★ แจ้งฝ่ายนิติ
  const [notifyAccountingOnSave, setNotifyAccountingOnSave] = useState(false) // ★ แจ้งฝ่ายบัญชี
  const [notifySalesOnSave, setNotifySalesOnSave] = useState(false)       // ★ แจ้งฝ่ายขาย
  const setFileName = (field, name) => setFileNames(prev => ({ ...prev, [field]: name }))

  useEffect(() => {
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCaseData(d.caseData)
          // ★ Auto-calculate commission จาก approved_credit × agent_commission_rate (ถ้ายังไม่มีค่า)
          const autoCommission = (() => {
            if (d.caseData.commission_amount) return d.caseData.commission_amount
            const credit = parseFloat(d.caseData.approved_credit) || 0
            const rate = parseFloat(d.caseData.agent_commission_rate) || 0
            if (credit > 0 && rate > 0) return Math.round(credit * (rate / 100)).toString()
            return ''
          })()
          setForm({
            issuing_status: d.caseData.issuing_status || 'pending',
            contract_appointment: d.caseData.contract_appointment || 0,
            contract_selling_pledge: d.caseData.contract_selling_pledge || 0,
            contract_mortgage: d.caseData.contract_mortgage || 0,
            reminder_selling_pledge: d.caseData.reminder_selling_pledge || 0,
            reminder_mortgage: d.caseData.reminder_mortgage || 0,
            // ★ Email: contact_email (ฝ่ายขาย) เป็นหลัก, fallback tracking_no (เคสเก่า)
            email: d.caseData.contact_email || d.caseData.tracking_no || '',
            note: d.caseData.issuing_note || '',
            commission_amount: autoCommission,
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // ★ Feature 2: Send Email
  const [emailSending, setEmailSending] = useState(false)
  const handleSendEmail = async () => {
    const toEmail = caseData?.contact_email
    if (!toEmail) { alert('ฝ่ายขายยังไม่ได้กรอกอีเมลลูกค้า'); return }
    setEmailSending(true)
    try {
      const res = await fetch(`${API}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ case_id: id, to_email: toEmail })
      })
      const data = await res.json()
      if (data.success) alert('✅ ส่ง Email สำเร็จ!')
      else alert('❌ ส่ง Email ไม่สำเร็จ: ' + (data.message || ''))
    } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
    setEmailSending(false)
  }

  // ลบเอกสารออกสัญญา
  const deleteDocument = async (column) => {
    if (!confirm('ต้องการลบเอกสารนี้?')) return
    try {
      const res = await fetch(`${API}/delete-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ case_id: id, column })
      })
      const data = await res.json()
      if (data.success) setCaseData(prev => ({ ...prev, [`issuing_${column}`]: null }))
      else alert(data.message || 'ลบไม่สำเร็จ')
    } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้') }
  }

  // ★ doSave — ส่ง FormData จริง (ไม่มี validation)
  const doSave = async () => {
    setSaving(true)
    setMsg('')
    setSuccess('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))
      const docRefs = { doc_selling_pledge: docSellingPledgeRef, doc_mortgage: docMortgageRef, commission_slip: commissionSlipRef, broker_contract: brokerContractRef, broker_id: brokerIdRef }
      Object.entries(docRefs).forEach(([k, ref]) => { if (ref.current?.files[0]) fd.append(k, ref.current.files[0]) })
      // ★ เพิ่มไฟล์จาก DocGeneratorPanel (เอกสารสัญญาแต่ละประเภท)
      if (docPanelRef.current) {
        const panelFiles = docPanelRef.current.getFiles()
        Object.entries(panelFiles).forEach(([k, file]) => { if (file) fd.append(k, file) })
        const deletedFiles = docPanelRef.current.getDeletedFiles()
        deletedFiles.forEach(k => fd.append(`${k}_delete`, '1'))
      }
      fd.append('notify_legal_save',      notifyLegalOnSave      ? '1' : '0')
      fd.append('notify_accounting_save', notifyAccountingOnSave ? '1' : '0')
      fd.append('notify_sales_save',      notifySalesOnSave      ? '1' : '0')

      const res = await fetch(`${API}/cases/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setTimeout(() => navigate('/issuing'), 1000)
      } else {
        setMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  // บันทึกข้อมูล (FormData เพื่อรองรับไฟล์อัพโหลด)
  const handleSubmit = async (e) => {
    e.preventDefault()
    doSave()
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
        <button className="btn btn-outline" onClick={() => navigate('/issuing')} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายออกสัญญา
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
  let salesPropertyPhotos = [
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
          <button className="btn btn-outline" onClick={() => navigate('/issuing')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-file-contract" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            แก้ไขเคส (ฝ่ายออกสัญญา) — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
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

          {/* ===== คอลัมน์ซ้าย: ข้อมูลลูกหนี้ + ทรัพย์ + ประเมิน (read-only) ===== */}
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
            </div>

          </div>

          {/* ===== คอลัมน์ขวา: ออกสัญญา (แก้ไขได้) ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                  <i className="fas fa-file-contract" style={{ marginRight: 8 }}></i>
                  ข้อมูลออกสัญญา
                </h3>
                {/* ★ สถานะงานออกสัญญา */}
                {(() => {
                  const sMap = {
                    pending: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: 'fa-clock',        label: 'รอดำเนินการ' },
                    sent:    { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', icon: 'fa-paper-plane',  label: 'ส่งสัญญาแล้ว' },
                    done:    { bg: '#dcfce7', color: '#15803d', border: '#86efac', icon: 'fa-check-circle', label: 'เสร็จสิ้น'     },
                  }
                  const s = sMap[form.issuing_status] || sMap.pending
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ padding: '4px 12px', borderRadius: 20, background: s.bg, border: `1.5px solid ${s.border}`, color: s.color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className={`fas ${s.icon}`}></i>{s.label}
                      </div>
                      <select
                        value={form.issuing_status}
                        onChange={e => set('issuing_status', e.target.value)}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
                      >
                        <option value="pending">รอดำเนินการ</option>
                        <option value="sent">ส่งสัญญาแล้ว</option>
                        <option value="done">เสร็จสิ้น</option>
                      </select>
                    </div>
                  )
                })()}
              </div>

              {/* ★ ประเภทสัญญา — badge อ่านอย่างเดียว จาก approval_type */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>
                  ประเภทสัญญา
                </div>
                {(() => {
                  const lMap = {
                    selling_pledge: { color: '#6a1b9a', bg: '#f3e5f5', border: '#d8b4fe', icon: 'fa-handshake', label: 'ขายฝาก' },
                    mortgage:       { color: '#1565c0', bg: '#e3f2fd', border: '#93c5fd', icon: 'fa-home',       label: 'จำนอง'  },
                  }
                  const lt = lMap[caseData?.approval_type]
                  return lt ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 20, background: lt.bg, border: `2px solid ${lt.border}`, fontWeight: 700, fontSize: 14, color: lt.color, marginBottom: 12 }}>
                      <i className={`fas ${lt.icon}`} style={{ fontSize: 13 }}></i>
                      สัญญา{lt.label}
                    </div>
                  ) : (
                    <div style={{ color: '#aaa', fontSize: 13, marginBottom: 12 }}>ยังไม่ระบุประเภทสัญญา</div>
                  )
                })()}

              </div>

              {/* จดหมายแจ้งเตือน — แสดงเฉพาะตามประเภทสัญญา */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>
                  <i className="fas fa-envelope" style={{ marginRight: 5 }}></i>จดหมายแจ้งเตือน
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(caseData?.approval_type === 'selling_pledge' || !caseData?.approval_type) && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      padding: '10px 14px', borderRadius: 8,
                      background: (form.reminder_selling_pledge === 1 || form.reminder_selling_pledge === '1') ? '#f5f3ff' : '#fafafa',
                      border: `1.5px solid ${(form.reminder_selling_pledge === 1 || form.reminder_selling_pledge === '1') ? '#a855f7' : '#e5e7eb'}`,
                      transition: 'all 0.15s'
                    }}>
                      <input
                        type="checkbox"
                        checked={form.reminder_selling_pledge === 1 || form.reminder_selling_pledge === '1'}
                        onChange={e => set('reminder_selling_pledge', e.target.checked ? 1 : 0)}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#a855f7', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9' }}>จดหมายแจ้งเตือนขายฝาก</span>
                    </label>
                  )}
                  {(caseData?.approval_type === 'mortgage' || !caseData?.approval_type) && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      padding: '10px 14px', borderRadius: 8,
                      background: (form.reminder_mortgage === 1 || form.reminder_mortgage === '1') ? '#eff6ff' : '#fafafa',
                      border: `1.5px solid ${(form.reminder_mortgage === 1 || form.reminder_mortgage === '1') ? '#3b82f6' : '#e5e7eb'}`,
                      transition: 'all 0.15s'
                    }}>
                      <input
                        type="checkbox"
                        checked={form.reminder_mortgage === 1 || form.reminder_mortgage === '1'}
                        onChange={e => set('reminder_mortgage', e.target.checked ? 1 : 0)}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#3b82f6', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>จดหมายแจ้งเตือนจำนอง</span>
                    </label>
                  )}
                </div>
              </div>

              {/* อีเมลสำหรับส่งสัญญา — ดึงจากข้อมูลฝ่ายขายโดยตรง */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-envelope" style={{ color: '#e53935', fontSize: 13 }}></i>
                  อีเมลสำหรับส่งสัญญา
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>(กรอกโดยฝ่ายขาย)</span>
                </label>
                <input
                  type="text"
                  value={caseData?.contact_email || ''}
                  readOnly
                  style={{ background: '#f9fafb', color: caseData?.contact_email ? '#111827' : '#9ca3af', cursor: 'default' }}
                  placeholder="ฝ่ายขายยังไม่ได้กรอกอีเมลลูกค้า"
                />
              </div>

              {/* หมายเหตุ — ย้ายไปอยู่ก่อนปุ่มบันทึก */}
            </div>

            {/* ★ เอกสารประกอบ */}
            <ChecklistDocsPanel caseData={caseData} lrId={caseData.loan_request_id} token={token()} onDocsUpdated={(field, paths) => setCaseData(prev => ({ ...prev, [field]: JSON.stringify(paths) }))} canUpload={true} />

            {/* ★ สร้างเอกสารอัตโนมัติ */}
            <DocGeneratorPanel ref={docPanelRef} caseData={caseData} caseId={id} />

            {/* เอกสารออกสัญญาทั้งหมดอยู่ใน DocGeneratorPanel แล้ว */}

            {/* ★ กระดิ่งแจ้งฝ่ายต่างๆ */}
            <div style={{ marginBottom: 14 }}>
              {(() => {
                const notifyCount = [notifyLegalOnSave, notifyAccountingOnSave, notifySalesOnSave].filter(Boolean).length
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <i className="fas fa-satellite-dish" style={{ marginRight: 5 }}></i>ส่งกระดิ่งแจ้งฝ่าย
                    </div>
                    {notifyCount > 0 && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#7c3aed', borderRadius: 20, padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="fas fa-bell"></i> จะแจ้ง {notifyCount} ฝ่าย
                      </div>
                    )}
                  </div>
                )
              })()}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>

                {/* ฝ่ายนิติ — purple */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifyLegalOnSave ? '#faf5ff' : '#fafafa',
                  border: `2px solid ${notifyLegalOnSave ? '#a855f7' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifyLegalOnSave ? '0 0 0 3px rgba(168,85,247,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input type="checkbox" checked={notifyLegalOnSave} onChange={e => setNotifyLegalOnSave(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#a855f7', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifyLegalOnSave ? '#7e22ce' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifyLegalOnSave && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายนิติ
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>ส่งเรื่องให้ดูแลนิติกรรม</div>
                  </div>
                </label>

                {/* ฝ่ายบัญชี — amber */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifyAccountingOnSave ? '#fffbeb' : '#fafafa',
                  border: `2px solid ${notifyAccountingOnSave ? '#f59e0b' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifyAccountingOnSave ? '0 0 0 3px rgba(245,158,11,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input type="checkbox" checked={notifyAccountingOnSave} onChange={e => setNotifyAccountingOnSave(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#f59e0b', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifyAccountingOnSave ? '#b45309' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifyAccountingOnSave && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายบัญชี
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>แจ้งเพื่อจัดการการเงิน</div>
                  </div>
                </label>

                {/* ฝ่ายขาย — green */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifySalesOnSave ? '#ecfdf5' : '#fafafa',
                  border: `2px solid ${notifySalesOnSave ? '#6ee7b7' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifySalesOnSave ? '0 0 0 3px rgba(110,231,183,0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input type="checkbox" checked={notifySalesOnSave} onChange={e => setNotifySalesOnSave(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#059669', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifySalesOnSave ? '#065f46' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifySalesOnSave && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายขาย
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>อัปเดตสถานะให้ฝ่ายขาย</div>
                  </div>
                </label>

              </div>
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/issuing')} style={{ padding: '12px 24px' }}>
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
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(22,163,74,0.4); }
          50% { box-shadow: 0 4px 32px rgba(22,163,74,0.7); }
        }
        @keyframes popIn {
          0% { transform: scale(0.7); opacity: 0; }
          80% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confetti {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80px) rotate(360deg); opacity: 0; }
        }
      `}</style>


    </div>
  )
}
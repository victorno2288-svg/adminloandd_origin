import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'
import MapPreview from '../components/MapPreview'
import AgentCard from '../components/AgentCard'
import CaseInfoSummary from '../components/CaseInfoSummary'
import ChecklistDocsPanel from '../components/ChecklistDocsPanel'

// ========== PreviewModal ==========
function PreviewModal({ src, onClose }) {
  if (!src) return null
  const isPdf = /\.pdf$/i.test(src)
  const isHttp = /^https?:\/\//.test(src)
  const fullSrc = isHttp ? src : src.startsWith('/') ? src : `/${src}`
  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.78)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
    }}>
      <button onClick={e => { e.stopPropagation(); onClose() }} style={{
        position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(255,255,255,0.9)', border: 'none', fontSize: 22, color: '#333',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 100000
      }}>
        <i className="fas fa-times"></i>
      </button>
      {isPdf ? (
        <iframe src={fullSrc} onClick={e => e.stopPropagation()}
          style={{ width: '80vw', height: '85vh', borderRadius: 8, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }}
          title="PDF Preview" />
      ) : (
        <img src={fullSrc} alt="preview" onClick={e => e.stopPropagation()}
          style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }} />
      )}
    </div>
  )
}

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/approval'


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

function toDateTimeInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 16)
}

export default function ApprovalEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  // ตรวจสิทธิ์: แก้ไขตารางวงเงินได้เฉพาะฝ่ายอนุมัติสินเชื่อ + ซุปเปอร์แอดมิน เท่านั้น
  const _approvalUser = (() => { try { return JSON.parse(localStorage.getItem('loandd_admin_user') || '{}') } catch { return {} } })()
  const _dept = _approvalUser?.department || ''
  const canEditCreditTable = _dept === 'approval' || _dept === 'super_admin'
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    approval_type: '',
    approved_credit: '',
    interest_per_year: '',
    interest_per_month: '',
    operation_fee: '',
    land_tax_estimate: '',
    advance_interest: '',
    is_cancelled: 0,
    approval_status: 'pending',
    recorded_by: '',
    recorded_at: '',
    approval_date: '',
    check_price_value: '',
    check_price_detail: '',
  })
  const [creditTableFile, setCreditTableFile] = useState(null)
  const [creditTableUploading, setCreditTableUploading] = useState(false)
  const [creditTableDeleting, setCreditTableDeleting] = useState(false)
  const [creditTableMsg, setCreditTableMsg] = useState('')
  const [notifySalesOnUpload, setNotifySalesOnUpload] = useState(true)     // ★ แจ้งฝ่ายขายเมื่ออัพโหลดตาราง
  const [notifyAppraisalOnUpload, setNotifyAppraisalOnUpload] = useState(true) // ★ แจ้งฝ่ายประเมินเมื่ออัพโหลดตาราง
  const [notifySalesOnSave, setNotifySalesOnSave] = useState(false)     // ★ แจ้งฝ่ายขายเมื่อบันทึก
  const [notifyAppraisalOnSave, setNotifyAppraisalOnSave] = useState(false) // ★ แจ้งฝ่ายประเมินเมื่อบันทึก
  const [notifyLegalOnSave, setNotifyLegalOnSave] = useState(false)     // ★ แจ้งฝ่ายนิติเมื่อบันทึก
  const [creditTableFile2, setCreditTableFile2] = useState(null)
  const [creditTableUploading2, setCreditTableUploading2] = useState(false)
  const [creditTableDeleting2, setCreditTableDeleting2] = useState(false)
  const [creditTableMsg2, setCreditTableMsg2] = useState('')
  // ★ ตารางผ่อนชำระ — อนุมัติ / ทำเอง
  const [scheduleApproving, setScheduleApproving] = useState(false)
  const [scheduleApproveMsg, setScheduleApproveMsg] = useState('')
  const [approvalScheduleFile, setApprovalScheduleFile] = useState(null)
  const [approvalScheduleUploading, setApprovalScheduleUploading] = useState(false)
  const [showUploadOwnSchedule, setShowUploadOwnSchedule] = useState(false)
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(false) // collapsible ตารางผ่อนชำระ
  const [previewSrc, setPreviewSrc] = useState(null)
  const [capturing, setCapturing] = useState(false)
  // ===== VDO (read-only — อัพโหลดที่ฝ่ายประเมิน) =====
  const [videoFiles, setVideoFiles] = useState([])
  const [showCalcModal, setShowCalcModal] = useState(false)
  // ===== Credit Table Calculator State =====
  const [calcAmount, setCalcAmount] = useState('')
  const [calcMortgageMonths, setCalcMortgageMonths] = useState('12')
  const [calcPledgeMonths, setCalcPledgeMonths] = useState('6')

  const FIXED_RATE = 15 // ดอกเบี้ยคงที่ 15% ต่อปี
  const calcFmt = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })
  const calcFor = (type, months) => {
    const amount = parseFloat(calcAmount) || 0
    const rate = FIXED_RATE
    const m = parseInt(months) || 0
    const monthlyRate = rate / 100 / 12          // = 1.25%
    const monthlyInterest = Math.round(amount * monthlyRate)
    const mgmtFee = Math.round(amount * 0.05)    // ค่าดำเนินการ 5%
    const taxRate = type === 'mortgage' ? 0.01 : 0.063  // จำนอง 1%, ขายฝาก 6.3%
    const taxFee = Math.round(amount * taxRate)
    const advanceTotal = monthlyInterest * m
    const netAmount = amount - mgmtFee - taxFee - advanceTotal
    return { amount, rate, monthlyRate, monthlyInterest, mgmtFee, taxRate, taxFee, advanceTotal, netAmount, months: m }
  }
  const mortgageValues = calcFor('mortgage', calcMortgageMonths)
  const pledgeValues = calcFor('selling_pledge', calcPledgeMonths)

  useEffect(() => {
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const caseInfo = d.caseData
          setForm({
            approval_type: caseInfo.loan_type_detail || caseInfo.approval_type || '',
            approved_credit: caseInfo.approved_credit || '',
            interest_per_year: caseInfo.interest_per_year || '',
            interest_per_month: caseInfo.interest_per_month || '',
            operation_fee: caseInfo.operation_fee || '',
            land_tax_estimate: caseInfo.land_tax_estimate || '',
            advance_interest: caseInfo.advance_interest || '',
            is_cancelled: caseInfo.is_cancelled || 0,
            approval_status: caseInfo.approval_status || 'pending',
            recorded_by: caseInfo.recorded_by || '',
            recorded_at: toDateTimeInput(caseInfo.recorded_at),
            approval_date: toDateInput(caseInfo.approval_date),
            check_price_value: caseInfo.check_price_value || '',
            check_price_detail: caseInfo.check_price_detail || '',
          })

          // ถ้า credit_table_file ไม่ถูกส่งมาจาก detail endpoint (server เก่า)
          // ดึงจาก list endpoint แทน
          if (caseInfo.credit_table_file !== undefined) {
            setCaseData(caseInfo)
            setLoading(false)
          } else {
            fetch(`${API}/cases`, { headers: { Authorization: `Bearer ${token()}` } })
              .then(r => r.json())
              .then(list => {
                const match = list.data?.find(c => String(c.loan_request_id) === String(id))
                setCaseData({ ...caseInfo, credit_table_file: match?.credit_table_file || null })
              })
              .catch(() => setCaseData(caseInfo))
              .finally(() => setLoading(false))
          }
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [id])

  // ===== โหลด checklist video docs =====
  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/debtors/${id}/checklist-docs`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.docs?.property_video) {
          setVideoFiles(d.docs.property_video)
        }
      })
      .catch(() => {})
  }, [id])

  const handleDeleteCreditTable = async () => {
    if (!window.confirm('ต้องการลบไฟล์ตารางวงเงินนี้หรือไม่?')) return
    setCreditTableDeleting(true)
    setCreditTableMsg('')
    try {
      const res = await fetch(`${API}/cases/${id}/credit-table`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => ({ ...prev, credit_table_file: null }))
        setCreditTableMsg('ลบไฟล์สำเร็จ')
      } else {
        setCreditTableMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setCreditTableMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์')
    }
    setCreditTableDeleting(false)
  }

  const handleCreditTableUpload = async () => {
    if (!creditTableFile) return
    setCreditTableUploading(true)
    setCreditTableMsg('')
    const formData = new FormData()
    formData.append('credit_table_file', creditTableFile)
    formData.append('notify_sales', notifySalesOnUpload ? '1' : '0')       // ★
    formData.append('notify_appraisal', notifyAppraisalOnUpload ? '1' : '0') // ★
    try {
      const res = await fetch(`${API}/cases/${id}/upload-credit-table`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        const notified = [notifySalesOnUpload && 'ฝ่ายขาย', notifyAppraisalOnUpload && 'ฝ่ายประเมิน'].filter(Boolean).join(' + ')
        setCreditTableMsg(notified ? `อัพโหลดสำเร็จ! แจ้ง${notified}แล้ว` : 'อัพโหลดสำเร็จ!')
        setCaseData(prev => ({ ...prev, credit_table_file: data.file_path }))
        setCreditTableFile(null)
      } else {
        setCreditTableMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setCreditTableMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์')
    }
    setCreditTableUploading(false)
  }

  // ===== handlers ตารางวงเงิน 2 (ขายฝาก) =====
  const handleDeleteCreditTable2 = async () => {
    if (!window.confirm('ต้องการลบไฟล์ตารางขายฝากนี้หรือไม่?')) return
    setCreditTableDeleting2(true); setCreditTableMsg2('')
    try {
      const res = await fetch(`${API}/cases/${id}/credit-table2`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (data.success) { setCaseData(prev => ({ ...prev, credit_table_file2: null })); setCreditTableMsg2('ลบไฟล์สำเร็จ') }
      else setCreditTableMsg2(data.message || 'เกิดข้อผิดพลาด')
    } catch { setCreditTableMsg2('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์') }
    setCreditTableDeleting2(false)
  }

  const handleCreditTableUpload2 = async () => {
    if (!creditTableFile2) return
    setCreditTableUploading2(true); setCreditTableMsg2('')
    const formData = new FormData()
    formData.append('credit_table_file2', creditTableFile2)
    try {
      const res = await fetch(`${API}/cases/${id}/upload-credit-table2`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: formData
      })
      const data = await res.json()
      if (data.success) { setCreditTableMsg2('อัพโหลดสำเร็จ!'); setCaseData(prev => ({ ...prev, credit_table_file2: data.file_path })); setCreditTableFile2(null) }
      else setCreditTableMsg2(data.message || 'เกิดข้อผิดพลาด')
    } catch { setCreditTableMsg2('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์') }
    setCreditTableUploading2(false)
  }

  // ===== handlers ตารางผ่อนชำระ — dropdown status =====
  // 0=รอตรวจสอบ, 1=อนุมัติ, 2=ไม่อนุมัติ
  const handleApproveSchedule = async (statusVal) => {
    setScheduleApproving(true); setScheduleApproveMsg('')
    try {
      const res = await fetch(`${API}/cases/${id}/approve-schedule`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: parseInt(statusVal) })
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => ({
          ...prev,
          payment_schedule_approved: parseInt(statusVal),
          payment_schedule_approved_at: parseInt(statusVal) === 1 ? new Date().toISOString() : null
        }))
        const msgs = { 0: '', 1: '✅ อนุมัติแล้ว — ฝ่ายขายได้รับแจ้งแล้ว', 2: 'ไม่อนุมัติ — อัพโหลดตารางใหม่ด้านล่างได้เลย' }
        setScheduleApproveMsg(msgs[parseInt(statusVal)] || '')
      } else setScheduleApproveMsg(data.message || 'เกิดข้อผิดพลาด')
    } catch { setScheduleApproveMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์') }
    setScheduleApproving(false)
  }

  const handleUploadApprovalSchedule = async () => {
    if (!approvalScheduleFile) return
    setApprovalScheduleUploading(true)
    const formData = new FormData()
    formData.append('approval_schedule_file', approvalScheduleFile)
    try {
      const res = await fetch(`${API}/cases/${id}/upload-approval-schedule`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: formData
      })
      const data = await res.json()
      if (data.success) {
        setCaseData(prev => ({ ...prev, approval_schedule_file: data.file_path }))
        setApprovalScheduleFile(null); setShowUploadOwnSchedule(false)
      }
    } catch {}
    setApprovalScheduleUploading(false)
  }

  const handleDeleteApprovalSchedule = async () => {
    if (!window.confirm('ต้องการลบตารางผ่อนชำระที่ทำเองหรือไม่?')) return
    try {
      const res = await fetch(`${API}/cases/${id}/approval-schedule`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (data.success) setCaseData(prev => ({ ...prev, approval_schedule_file: null }))
    } catch {}
  }

  // ===== Capture tables as image and upload =====
  const handleCaptureAndUpload = async () => {
    const container = document.getElementById('credit-tables-container')
    if (!container) return
    setCapturing(true)
    setCreditTableMsg('')
    try {
      // Load html2canvas from CDN (lazy, only once)
      const h2c = await new Promise((resolve, reject) => {
        if (window.html2canvas) return resolve(window.html2canvas)
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        s.onload = () => resolve(window.html2canvas)
        s.onerror = () => reject(new Error('โหลด html2canvas ไม่สำเร็จ'))
        document.head.appendChild(s)
      })
      const canvas = await h2c(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      canvas.toBlob(async (blob) => {
        if (!blob) { setCreditTableMsg('ไม่สามารถสร้างภาพได้'); setCapturing(false); return }
        const fileName = `credit_table_${caseData?.case_code || 'table'}_${Date.now()}.png`
        const fd = new FormData()
        fd.append('credit_table_file', blob, fileName)
        try {
          const res = await fetch(`${API}/cases/${id}/upload-credit-table`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token()}` },
            body: fd,
          })
          const data = await res.json()
          if (data.success) {
            setCreditTableMsg('บันทึกภาพและอัพโหลดสำเร็จ!')
            setCaseData(prev => ({ ...prev, credit_table_file: data.file_path }))
          } else {
            setCreditTableMsg(data.message || 'เกิดข้อผิดพลาดในการอัพโหลด')
          }
        } catch { setCreditTableMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์') }
        setCapturing(false)
      }, 'image/png')
    } catch (err) {
      setCreditTableMsg(err.message || 'ไม่สามารถบันทึกภาพได้')
      setCapturing(false)
    }
  }

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // บันทึกข้อมูล
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')

    try {
      const { recorded_by, recorded_at, ...formData } = form
      const res = await fetch(`${API}/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          ...formData,
          notify_sales_save:     notifySalesOnSave     ? '1' : '0',
          notify_appraisal_save: notifyAppraisalOnSave ? '1' : '0',
          notify_legal_save:     notifyLegalOnSave     ? '1' : '0',
        })
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setTimeout(() => navigate('/approval'), 1000)
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
        <p style={{ marginTop: 12 }}>ไม่พบข้อมูลลูกหนี้</p>
        <button className="btn btn-outline" onClick={() => navigate('/approval')} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายอนุมัติสินเชื่อ
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
          <button className="btn btn-outline" onClick={() => navigate('/approval')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>
              <i className="fas fa-money-check-alt" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              ฝ่ายอนุมัติสินเชื่อ — <span style={{ color: 'var(--primary)' }}>{caseData.debtor_code || `#${id}`}</span>
              {caseData.contact_name && <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginLeft: 4 }}>({caseData.contact_name})</span>}
              {caseData.case_code && <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 8, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 10 }}>เคส: {caseData.case_code}</span>}
            </h2>
            {(form.approval_type || caseData.loan_type_detail) && (
              <span style={{
                fontSize: 13, fontWeight: 700, padding: '4px 14px', borderRadius: 20,
                background: (form.approval_type || caseData.loan_type_detail) === 'mortgage' ? '#e3f2fd' : '#f3e5f5',
                color: (form.approval_type || caseData.loan_type_detail) === 'mortgage' ? '#1565c0' : '#6a1b9a',
                border: `1.5px solid ${(form.approval_type || caseData.loan_type_detail) === 'mortgage' ? '#1565c0' : '#6a1b9a'}40`,
              }}>
                <i className="fas fa-tag" style={{ marginRight: 5 }}></i>
                {(form.approval_type || caseData.loan_type_detail) === 'mortgage' ? 'จำนอง' : 'ขายฝาก'}
              </span>
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

          {/* ===== คอลัมน์ซ้าย: ข้อมูลลูกหนี้ + ทรัพย์ + ประเมิน (read-only) ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                {caseData.debtor_code || `#${id}`}{caseData.contact_name ? ` — ${caseData.contact_name}` : ' — ข้อมูลลูกหนี้'}
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
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปหน้าบัตรประชาชน (ลูกหนี้)</label>
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

              {/* ===== VDO ทรัพย์สิน — ดูได้ (อัพโหลดที่ฝ่ายประเมิน) ===== */}
              {(videoFiles.length > 0 || images.filter(img => img.includes('videos')).length > 0) && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <i className="fas fa-video" style={{ color: '#6d28d9' }}></i>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9' }}>VDO ทรัพย์สิน</span>
                    <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>(อัพโหลดโดยฝ่ายประเมิน)</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {videoFiles.map((fp, fi) => (
                      <div key={fi}
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
                    ))}
                    {images.filter(img => img.includes('videos')).map((fp, fi) => (
                      <div key={`old-${fi}`}
                        onClick={() => window.open(fp.startsWith('/') ? fp : `/${fp}`, '_blank')}
                        style={{
                          width: 64, height: 64, borderRadius: 8,
                          background: '#f3f0ff', border: '1px solid #c4b5fd',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', gap: 3
                        }}>
                        <i className="fas fa-play-circle" style={{ fontSize: 20, color: '#7c3aed' }} />
                        <span style={{ fontSize: 9, color: '#7c3aed' }}>VDO</span>
                      </div>
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

            </div>

            {/* ผลประเมินจากฝ่ายประเมิน — read-only unified */}
            {(() => {
              const typeMap = {
                outside:     { label: 'ประเมินนอก', icon: 'fas fa-map-marker-alt', color: '#e67e22', bg: '#fff8f3', border: '#e67e2240' },
                inside:      { label: 'ประเมินใน',  icon: 'fas fa-home',            color: '#3498db', bg: '#f0f8ff', border: '#3498db40' },
                check_price: { label: 'เช็คราคา',   icon: 'fas fa-tags',             color: '#9b59b6', bg: '#fdf4ff', border: '#9b59b640' },
              }
              const t = typeMap[caseData.appraisal_type] || typeMap.outside
              const resultLabel = caseData.appraisal_result === 'passed' ? 'ผ่านเกณฑ์' : caseData.appraisal_result === 'not_passed' ? 'ไม่ผ่านเกณฑ์' : null
              const resultColor = caseData.appraisal_result === 'passed' ? '#27ae60' : caseData.appraisal_result === 'not_passed' ? '#e74c3c' : '#aaa'
              const resultBg    = caseData.appraisal_result === 'passed' ? '#f0fdf4' : caseData.appraisal_result === 'not_passed' ? '#fef2f2' : '#f5f5f5'
              const resultBorder= caseData.appraisal_result === 'passed' ? '#27ae60' : caseData.appraisal_result === 'not_passed' ? '#e74c3c' : '#e0e0e0'
              return (
                <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: `3px solid ${t.color}` }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: t.color }}>
                    <i className="fas fa-chart-bar" style={{ marginRight: 8 }}></i>ผลประเมินจากฝ่ายประเมิน
                  </h3>
                  <p style={{ margin: '0 0 14px', fontSize: 12, color: '#888' }}>ข้อมูลจากฝ่ายประเมิน — ดูอ้างอิงเท่านั้น</p>

                  {/* Badge ประเภท */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 20, background: t.bg, border: `2px solid ${t.color}`, fontWeight: 700, fontSize: 13, color: t.color }}>
                      <i className={t.icon} style={{ fontSize: 12 }}></i>{t.label}
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>ฝ่ายขายเลือก</span>
                  </div>

                  <div style={{ background: t.bg, border: `1.5px solid ${t.border}`, borderRadius: 10, padding: 16 }}>
                    {/* ผลประเมิน */}
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label style={{ fontWeight: 700 }}>ผลประเมิน</label>
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: resultBg, border: `1.5px solid ${resultBorder}`, fontWeight: 700, fontSize: 14, color: resultColor, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {caseData.appraisal_result === 'passed'     && <i className="fas fa-check-circle"></i>}
                        {caseData.appraisal_result === 'not_passed' && <i className="fas fa-times-circle"></i>}
                        {!caseData.appraisal_result                 && <i className="fas fa-clock" style={{ color: '#ccc' }}></i>}
                        {resultLabel || 'ยังไม่มีผล'}
                      </div>
                    </div>

                    {/* วันนัด + ค่าประเมิน */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>วันนัดประเมิน <span style={{ fontSize: 10, background: '#e3f2fd', color: '#1565c0', borderRadius: 10, padding: '1px 6px', fontWeight: 600 }}>ฝ่ายขายนัด</span></label>
                        <input type="text" readOnly style={{ background: '#f5f5f5' }}
                          value={caseData.appraisal_date ? new Date(caseData.appraisal_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>ค่าประเมิน (บาท)</label>
                        <input type="text" readOnly style={{ background: '#f5f5f5' }}
                          value={caseData.appraisal_fee ? Number(caseData.appraisal_fee).toLocaleString('th-TH') : '-'} />
                      </div>
                    </div>

                    {/* ผู้บันทึก + วันบันทึก */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>ผู้บันทึกผล</label>
                        <input type="text" readOnly style={{ background: '#f5f5f5' }} value={caseData.appraisal_recorded_by || '-'} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>วันเวลาบันทึก</label>
                        <input type="text" readOnly style={{ background: '#f5f5f5' }}
                          value={caseData.appraisal_recorded_at ? new Date(caseData.appraisal_recorded_at).toLocaleString('th-TH') : '-'} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

          </div>

          {/* ===== คอลัมน์ขวา: อนุมัติวงเงิน (แก้ไขได้) ===== */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-money-check-alt" style={{ marginRight: 8 }}></i>
                ผลอนุมัติวงเงิน
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: '#888' }}>
                ฝ่ายขายจะเห็นผลนี้ — ดูตารางวงเงินที่แนบมาด้วย
              </p>

              {/* ประเภทสินเชื่อ badge */}
              {(caseData.loan_type_detail === 'selling_pledge' || caseData.loan_type_detail === 'mortgage') && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, padding: '6px 18px', borderRadius: 20,
                    background: caseData.loan_type_detail === 'mortgage' ? '#e3f2fd' : '#f3e5f5',
                    color: caseData.loan_type_detail === 'mortgage' ? '#1565c0' : '#6a1b9a',
                    border: `2px solid ${caseData.loan_type_detail === 'mortgage' ? '#1565c0' : '#6a1b9a'}50` }}>
                    <i className={`fas ${caseData.loan_type_detail === 'mortgage' ? 'fa-home' : 'fa-handshake'}`} style={{ marginRight: 6 }}></i>
                    {caseData.loan_type_detail === 'mortgage' ? 'จำนอง' : 'ขายฝาก'}
                  </span>
                </div>
              )}

              {/* ===== 2 ปุ่มใหญ่ อนุมัติ / ไม่อนุมัติ ===== */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {/* อนุมัติ */}
                <button type="button"
                  onClick={() => set('approval_status', 'approved')}
                  style={{
                    padding: '18px 12px', borderRadius: 12, border: `3px solid ${form.approval_status === 'approved' ? '#27ae60' : '#e0e0e0'}`,
                    background: form.approval_status === 'approved' ? 'linear-gradient(135deg,#27ae60,#2ecc71)' : '#f9f9f9',
                    color: form.approval_status === 'approved' ? '#fff' : '#aaa',
                    fontWeight: 800, fontSize: 16, cursor: 'pointer', transition: 'all 0.18s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    boxShadow: form.approval_status === 'approved' ? '0 4px 16px rgba(39,174,96,0.35)' : 'none',
                  }}>
                  <i className="fas fa-check-circle" style={{ fontSize: 28 }}></i>
                  อนุมัติวงเงิน
                </button>
                {/* ไม่อนุมัติ */}
                <button type="button"
                  onClick={() => set('approval_status', 'rejected')}
                  style={{
                    padding: '18px 12px', borderRadius: 12, border: `3px solid ${form.approval_status === 'rejected' ? '#e74c3c' : '#e0e0e0'}`,
                    background: form.approval_status === 'rejected' ? 'linear-gradient(135deg,#e74c3c,#c0392b)' : '#f9f9f9',
                    color: form.approval_status === 'rejected' ? '#fff' : '#aaa',
                    fontWeight: 800, fontSize: 16, cursor: 'pointer', transition: 'all 0.18s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    boxShadow: form.approval_status === 'rejected' ? '0 4px 16px rgba(231,76,60,0.35)' : 'none',
                  }}>
                  <i className="fas fa-times-circle" style={{ fontSize: 28 }}></i>
                  ไม่อนุมัติ
                </button>
              </div>

              {/* status badge แสดงสถานะปัจจุบัน */}
              {form.approval_status === 'pending' && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fffde7', border: '1.5px solid #ffe082', color: '#f57f17', fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-clock"></i> รอการอนุมัติ
                </div>
              )}

              {/* วันที่อนุมัติ */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>วันที่อนุมัติ</label>
                <input type="date" value={form.approval_date} onChange={e => set('approval_date', e.target.value)} />
              </div>

              {/* ผู้บันทึก — read-only */}
              {form.recorded_by && (
                <div style={{ fontSize: 12, color: '#888', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-user-check" style={{ color: '#22c55e' }}></i>
                  บันทึกโดย: <strong style={{ color: '#333' }}>{form.recorded_by}</strong>
                  {form.recorded_at && <span style={{ color: '#aaa' }}>· {new Date(form.recorded_at).toLocaleString('th-TH')}</span>}
                </div>
              )}

              {/* ยกเลิกเคส */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: (form.is_cancelled === 1 || form.is_cancelled === '1') ? '#fef2f2' : '#f9f9f9', borderRadius: 8, border: `1.5px solid ${(form.is_cancelled === 1 || form.is_cancelled === '1') ? '#e74c3c' : '#e0e0e0'}` }}>
                <input
                  type="checkbox"
                  id="is_cancelled"
                  checked={form.is_cancelled === 1 || form.is_cancelled === '1'}
                  onChange={e => set('is_cancelled', e.target.checked ? 1 : 0)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#e74c3c' }}
                />
                <label htmlFor="is_cancelled" style={{ margin: 0, cursor: 'pointer', fontWeight: 700, color: (form.is_cancelled === 1 || form.is_cancelled === '1') ? '#e74c3c' : '#555', fontSize: 14 }}>
                  <i className="fas fa-ban" style={{ marginRight: 6 }}></i>ยกเลิกรายการเคสนี้
                </label>
              </div>
            </div>

            {/* ===== ผลเช็คราคา (แก้ไขได้โดยฝ่ายอนุมัติ) ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderLeft: '3px solid #9b59b6' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#9b59b6' }}>
                <i className="fas fa-tags" style={{ marginRight: 8 }}></i>ผลเช็คราคา
                <span style={{ fontSize: 11, fontWeight: 400, color: '#aaa', marginLeft: 8 }}>(แก้ไขได้ — ฝ่ายอนุมัติ)</span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ราคาเช็ค (บาท)</label>
                  <input type="number" placeholder="ระบุราคาที่ประเมินได้"
                    value={form.check_price_value}
                    onChange={e => set('check_price_value', e.target.value)} />
                  {caseData.check_price_value && !form.check_price_value && (
                    <small style={{ color: '#9b59b6', fontSize: 11 }}>
                      ล่าสุด: {Number(caseData.check_price_value).toLocaleString('th-TH')} บาท
                    </small>
                  )}
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

            {/* ===== สร้างตารางวงเงิน — ปุ่มเปิด Modal ===== */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                  <i className="fas fa-calculator" style={{ marginRight: 8 }}></i>ตารางวงเงิน
                </h3>
                {canEditCreditTable && (
                  <button type="button" onClick={() => {
                      const params = new URLSearchParams()
                      if (caseData?.case_code) params.set('case_code', caseData.case_code)
                      else if (caseData?.debtor_code) params.set('debtor_code', caseData.debtor_code)
                      if (form.approved_credit) params.set('loan_amount', form.approved_credit)
                      params.set('back_id', id)
                      window.open(`/approval/loan-table?${params.toString()}`, '_blank')
                    }}
                    style={{ padding: '9px 20px', background: 'linear-gradient(135deg,#1a237e,#1565c0)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(21,101,192,0.3)' }}>
                    <i className="fas fa-table"></i> สร้าง / แก้ไขตารางวงเงิน
                  </button>
                )}
              </div>

              {/* ---- ตารางผ่อนชำระ (อัพโหลดโดยฝ่ายขาย) — แสดงเมื่อฝ่ายขายอัพโหลดแล้วเท่านั้น ---- */}
              {caseData?.payment_schedule_file && <div style={{ marginBottom: 20, borderRadius: 10, border: '2px solid #9c27b0', overflow: 'hidden' }}>
                {/* Header toggle */}
                <button type="button" onClick={() => setShowPaymentSchedule(p => !p)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: 'linear-gradient(135deg,#f3e5f5,#fdf4ff)', border: 'none', cursor: 'pointer', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-calendar-alt" style={{ color: '#7b1fa2', fontSize: 15 }}></i>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#6a1b9a' }}>ตารางผ่อนชำระ</span>
                    <span style={{ fontSize: 10, background: '#fff', color: '#7b1fa2', padding: '1px 7px', borderRadius: 10, border: '1px solid #ce93d8', fontWeight: 500 }}>อัพโหลดโดยฝ่ายขาย</span>
                    {caseData?.payment_schedule_file && (
                      <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2e7d32', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>
                        <i className="fas fa-paperclip" style={{ marginRight: 3 }}></i>มีไฟล์จากฝ่ายขาย
                      </span>
                    )}
                    {Number(caseData?.payment_schedule_approved ?? 0) === 2 && (
                      <span style={{ fontSize: 10, background: '#ffebee', color: '#b71c1c', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>❌ ไม่ผ่าน</span>
                    )}
                    {Number(caseData?.payment_schedule_approved ?? 0) === 1 && (
                      <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2e7d32', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>✅ อนุมัติแล้ว</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#9c27b0', fontStyle: 'italic' }}>ไม่จำเป็นหากไม่มีการผ่อนชำระ</span>
                    <i className={`fas fa-chevron-${showPaymentSchedule ? 'up' : 'down'}`} style={{ color: '#7b1fa2', fontSize: 12 }}></i>
                  </div>
                </button>
              {showPaymentSchedule && <div style={{ paddingBottom: 20, borderTop: '1px solid #e8eaf6' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#6a1b9a', marginBottom: 10 }}>
                  <i className="fas fa-calendar-alt" style={{ marginRight: 6 }}></i>ตารางผ่อนชำระ (อัพโหลดโดยฝ่ายขาย)
                </div>

                {/* ไฟล์ของฝ่ายขาย */}
                {caseData?.payment_schedule_file ? (
                  <div style={{ marginBottom: 10, padding: '10px 14px', background: '#f3e5f5', borderRadius: 8, border: '1px solid #ce93d8', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="fas fa-file-image" style={{ color: '#6a1b9a', fontSize: 16 }}></i>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#6a1b9a', marginBottom: 1, fontWeight: 600 }}>ไฟล์ที่ฝ่ายขายอัพโหลด</div>
                      <div style={{ fontSize: 11, color: '#888', wordBreak: 'break-all' }}>{caseData.payment_schedule_file.split('/').pop()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button type="button" onClick={() => setPreviewSrc(caseData.payment_schedule_file)}
                        style={{ padding: '5px 12px', background: '#6a1b9a', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                        <i className="fas fa-eye"></i> ดู
                      </button>
                      <a href={caseData.payment_schedule_file.startsWith('/') ? caseData.payment_schedule_file : `/${caseData.payment_schedule_file}`}
                        download target="_blank" rel="noreferrer"
                        style={{ padding: '5px 12px', background: '#fff', color: '#6a1b9a', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #6a1b9a', cursor: 'pointer', textDecoration: 'none' }}>
                        <i className="fas fa-download"></i> โหลด
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', background: '#fafafa', borderRadius: 8, border: '1px dashed #ce93d8', color: '#999', fontSize: 12, marginBottom: 10 }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>ยังไม่มีตารางผ่อนชำระ (ฝ่ายขายอัพโหลดได้จากหน้าลูกหนี้)
                  </div>
                )}

                {/* Dropdown สถานะการตรวจสอบ — ทุกคนดูได้ แก้ได้เฉพาะ approval/super_admin */}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>สถานะตาราง:</label>
                  {(() => {
                    const _st = Number(caseData?.payment_schedule_approved ?? 0)
                    return (
                  <select
                    value={_st}
                    disabled={!canEditCreditTable || scheduleApproving}
                    onChange={e => handleApproveSchedule(e.target.value)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1.5px solid',
                      borderColor: _st === 1 ? '#a5d6a7' : _st === 2 ? '#ef9a9a' : '#ce93d8',
                      background: _st === 1 ? '#e8f5e9' : _st === 2 ? '#ffebee' : '#f3e5f5',
                      color: _st === 1 ? '#1b5e20' : _st === 2 ? '#b71c1c' : '#6a1b9a',
                      fontSize: 12, fontWeight: 700,
                      cursor: canEditCreditTable ? 'pointer' : 'default',
                      minWidth: 160, opacity: canEditCreditTable ? 1 : 0.85
                    }}>
                    <option value={0}>⏳ รอตรวจสอบ</option>
                    <option value={1}>✅ อนุมัติ</option>
                    <option value={2}>❌ ไม่อนุมัติ</option>
                  </select>
                    )
                  })()}
                  {scheduleApproving && <i className="fas fa-spinner fa-spin" style={{ color: '#6a1b9a' }}></i>}
                </div>

                {scheduleApproveMsg && (
                  <div style={{ marginTop: 6, fontSize: 12, color: scheduleApproveMsg.includes('✅') ? '#2e7d32' : '#c62828' }}>{scheduleApproveMsg}</div>
                )}

                {/* Upload / สร้างตารางที่ฝ่ายอนุมัติทำเอง — แสดงเมื่อเลือก "ไม่อนุมัติ" */}
                {Number(caseData?.payment_schedule_approved ?? 0) === 2 && canEditCreditTable && (
                  <div style={{ marginTop: 12, padding: '12px 14px', background: '#ffebee', borderRadius: 8, border: '1.5px solid #ef9a9a' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#b71c1c', marginBottom: 8 }}>
                      <i className="fas fa-table" style={{ marginRight: 6 }}></i>ตารางผ่อนชำระใหม่ (ฝ่ายอนุมัติทำเอง)
                    </div>

                    {/* ปุ่มสร้างตาราง — เปิด PaymentSchedulePage เหมือนฝ่ายขาย */}
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams({
                          debtor_code: caseData?.debtor_code || id,
                          customer_name: caseData?.contact_name || '',
                          loan_amount: caseData?.approved_credit || '',
                          back_id: id,
                        })
                        window.open(`/approval/payment-schedule?${params.toString()}`, '_blank')
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#c62828', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
                      <i className="fas fa-calculator"></i> สร้าง / ดูตาราง
                    </button>

                    {/* ไฟล์ที่อัพโหลดไว้ */}
                    {caseData?.approval_schedule_file && (
                      <div style={{ marginBottom: 8, padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #ef9a9a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-file" style={{ color: '#c62828' }}></i>
                        <div style={{ flex: 1, fontSize: 11, wordBreak: 'break-all' }}>{caseData.approval_schedule_file.split('/').pop()}</div>
                        <button type="button" onClick={() => setPreviewSrc(caseData.approval_schedule_file)}
                          style={{ padding: '3px 10px', background: '#c62828', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
                          <i className="fas fa-eye"></i> ดู
                        </button>
                        <button type="button" onClick={handleDeleteApprovalSchedule}
                          style={{ padding: '3px 8px', background: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    )}

                    {/* หรืออัพโหลดตารางเอง */}
                    <div style={{ fontSize: 11, color: '#c62828', marginBottom: 6, fontWeight: 600 }}>หรืออัพโหลดไฟล์ตารางเอง:</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg"
                        onChange={e => setApprovalScheduleFile(e.target.files[0] || null)}
                        style={{ fontSize: 12 }} />
                      <button type="button" onClick={handleUploadApprovalSchedule} disabled={!approvalScheduleFile || approvalScheduleUploading}
                        style={{ padding: '6px 14px', background: approvalScheduleFile ? '#c62828' : '#ccc', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: approvalScheduleFile ? 'pointer' : 'not-allowed' }}>
                        {approvalScheduleUploading ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลด</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* แสดง approval_schedule_file แม้ไม่ได้เลือก "ไม่อนุมัติ" (กรณีมีไฟล์อยู่แล้ว) */}
                {Number(caseData?.payment_schedule_approved ?? 0) !== 2 && caseData?.approval_schedule_file && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#e3f2fd', borderRadius: 6, border: '1px solid #90caf9', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-file" style={{ color: '#1565c0' }}></i>
                    <div style={{ flex: 1, fontSize: 11, wordBreak: 'break-all', color: '#1565c0' }}>ตารางจากฝ่ายอนุมัติ: {caseData.approval_schedule_file.split('/').pop()}</div>
                    <button type="button" onClick={() => setPreviewSrc(caseData.approval_schedule_file)}
                      style={{ padding: '3px 10px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>
                      <i className="fas fa-eye"></i> ดู
                    </button>
                  </div>
                )}
              </div>}
              </div>}

              {/* ---- ตารางจำนอง ---- */}
              {(() => {
                const lt = (caseData.loan_type_detail || form.approval_type || '').toLowerCase()
                const show = !lt || lt.includes('mortgage') || lt.includes('จำนอง') || !!caseData.credit_table_file
                return show
              })() && (
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #e8eaf6' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#b8860b', marginBottom: 10 }}>
                  <i className="fas fa-landmark" style={{ marginRight: 6 }}></i>ตารางจำนอง
                </div>
                {caseData.credit_table_file && (
                  <div style={{ marginBottom: 10, padding: '10px 14px', background: '#fffde7', borderRadius: 8, border: '1px solid #ffe082', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="fas fa-file-image" style={{ color: '#b8860b', fontSize: 16 }}></i>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#856404', marginBottom: 1 }}>ไฟล์ที่บันทึกไว้</div>
                      <div style={{ fontSize: 11, color: '#888', wordBreak: 'break-all' }}>{caseData.credit_table_file.split('/').pop()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button type="button" onClick={() => setPreviewSrc(caseData.credit_table_file)}
                        style={{ padding: '5px 12px', background: '#b8860b', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                        <i className="fas fa-eye"></i> ดู
                      </button>
                      {canEditCreditTable && (
                        <button type="button" onClick={handleDeleteCreditTable} disabled={creditTableDeleting}
                          style={{ padding: '5px 10px', background: '#fff', color: '#e74c3c', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #e74c3c', cursor: 'pointer' }}>
                          {creditTableDeleting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {canEditCreditTable && (
                  <>
                    {/* ★ checkbox แจ้งฝ่ายขาย + ฝ่ายประเมิน */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', padding: '5px 10px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 6 }}>
                        <input
                          type="checkbox"
                          checked={notifySalesOnUpload}
                          onChange={e => setNotifySalesOnUpload(e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: '#b8860b', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 12, color: '#7c5c00', fontWeight: 600 }}>
                          <i className="fas fa-bell" style={{ marginRight: 4 }}></i>แจ้งฝ่ายขาย
                        </span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', padding: '5px 10px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6 }}>
                        <input
                          type="checkbox"
                          checked={notifyAppraisalOnUpload}
                          onChange={e => setNotifyAppraisalOnUpload(e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: '#ca8a04', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 12, color: '#854d0e', fontWeight: 600 }}>
                          <i className="fas fa-bell" style={{ marginRight: 4 }}></i>แจ้งฝ่ายประเมิน
                        </span>
                      </label>
                    </div>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg"
                      onChange={e => { setCreditTableFile(e.target.files[0] || null); setCreditTableMsg('') }}
                      style={{ fontSize: 12, display: 'block', marginBottom: 6 }} />
                    {creditTableFile && <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}><i className="fas fa-file" style={{ marginRight: 4 }}></i>{creditTableFile.name}</div>}
                    <button type="button" onClick={handleCreditTableUpload} disabled={!creditTableFile || creditTableUploading}
                      style={{ padding: '7px 18px', fontSize: 12, background: creditTableFile ? '#b8860b' : '#ccc', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: creditTableFile ? 'pointer' : 'not-allowed' }}>
                      {creditTableUploading ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลดตารางจำนอง</>}
                    </button>
                    {creditTableMsg && <div style={{ fontSize: 11, marginTop: 6, color: creditTableMsg.includes('สำเร็จ') ? '#2e7d32' : '#c62828' }}>{creditTableMsg}</div>}
                  </>
                )}
              </div>
              )}

              {/* ---- ตารางขายฝาก ---- */}
              {(() => {
                const lt = (caseData.loan_type_detail || form.approval_type || '').toLowerCase()
                const show = !lt || lt.includes('selling') || lt.includes('ขายฝาก') || !!caseData.credit_table_file2
                return show
              })() && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32', marginBottom: 10 }}>
                  <i className="fas fa-home" style={{ marginRight: 6 }}></i>ตารางขายฝาก
                </div>
                {caseData.credit_table_file2 && (
                  <div style={{ marginBottom: 10, padding: '10px 14px', background: '#f1f8e9', borderRadius: 8, border: '1px solid #aed581', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="fas fa-file-image" style={{ color: '#2e7d32', fontSize: 16 }}></i>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#1b5e20', marginBottom: 1 }}>ไฟล์ที่บันทึกไว้</div>
                      <div style={{ fontSize: 11, color: '#888', wordBreak: 'break-all' }}>{caseData.credit_table_file2.split('/').pop()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button type="button" onClick={() => setPreviewSrc(caseData.credit_table_file2)}
                        style={{ padding: '5px 12px', background: '#2e7d32', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                        <i className="fas fa-eye"></i> ดู
                      </button>
                      {canEditCreditTable && (
                        <button type="button" onClick={handleDeleteCreditTable2} disabled={creditTableDeleting2}
                          style={{ padding: '5px 10px', background: '#fff', color: '#e74c3c', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #e74c3c', cursor: 'pointer' }}>
                          {creditTableDeleting2 ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {canEditCreditTable && (
                  <>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg"
                      onChange={e => { setCreditTableFile2(e.target.files[0] || null); setCreditTableMsg2('') }}
                      style={{ fontSize: 12, display: 'block', marginBottom: 6 }} />
                    {creditTableFile2 && <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}><i className="fas fa-file" style={{ marginRight: 4 }}></i>{creditTableFile2.name}</div>}
                    <button type="button" onClick={handleCreditTableUpload2} disabled={!creditTableFile2 || creditTableUploading2}
                      style={{ padding: '7px 18px', fontSize: 12, background: creditTableFile2 ? '#2e7d32' : '#ccc', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: creditTableFile2 ? 'pointer' : 'not-allowed' }}>
                      {creditTableUploading2 ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลดตารางขายฝาก</>}
                    </button>
                  </>
                )}
                {creditTableMsg2 && <div style={{ fontSize: 11, marginTop: 6, color: creditTableMsg2.includes('สำเร็จ') ? '#2e7d32' : '#c62828' }}>{creditTableMsg2}</div>}
              </div>
              )}

            </div>

            {/* เอกสาร Checklist จากฝ่ายขาย */}
            <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid #d1fae5', background: '#f0fdf4' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#15803d' }}>
                <i className="fas fa-folder-open" style={{ marginRight: 8 }}></i>เอกสารประกอบ
              </h3>
              <ChecklistDocsPanel caseData={caseData} lrId={caseData.loan_request_id} token={token()} onDocsUpdated={(field, paths) => setCaseData(prev => ({ ...prev, [field]: JSON.stringify(paths) }))} />
            </div>

            {/* ข้อมูลจากฝ่ายขาย */}
            {caseData.case_id && <CaseInfoSummary caseId={caseData.case_id} />}

            {/* ★ กระดิ่งแจ้งฝ่ายต่างๆ เมื่อบันทึก */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fas fa-satellite-dish" style={{ marginRight: 5 }}></i>ส่งกระดิ่งแจ้งฝ่าย
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>

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
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>แจ้งผลอนุมัติวงเงิน</div>
                  </div>
                </label>

                {/* ฝ่ายประเมิน — orange */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifyAppraisalOnSave ? '#fff7ed' : '#fafafa',
                  border: `2px solid ${notifyAppraisalOnSave ? '#f97316' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifyAppraisalOnSave ? '0 0 0 3px rgba(249,115,22,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input type="checkbox" checked={notifyAppraisalOnSave} onChange={e => setNotifyAppraisalOnSave(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifyAppraisalOnSave ? '#ea580c' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifyAppraisalOnSave && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายประเมิน
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>ขอข้อมูลเพิ่มเติม</div>
                  </div>
                </label>

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
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>ส่งต่อฝ่ายนิติ</div>
                  </div>
                </label>

              </div>
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/approval')} style={{ padding: '12px 24px' }}>
                ยกเลิก
              </button>
            </div>
            {caseData.case_id && (
              <div style={{ marginTop: 12 }}>
                <CancelCaseButton caseId={caseData.case_id} caseCode={caseData.case_code} caseStatus={caseData.case_status} onSuccess={() => window.location.reload()} />
              </div>
            )}
          </div>
        </div>
      </form>

      {/* ===== Credit Table Calculator Modal — เฉพาะฝ่ายอนุมัติสินเชื่อ ===== */}
      {showCalcModal && canEditCreditTable && (() => {
        const renderTableModal = (type, values) => {
          const themeColor = type === 'mortgage' ? '#b8860b' : '#2e7d32'
          const typeLabel = type === 'mortgage' ? 'จำนอง' : 'ขายฝาก'
          const taxRatePct = (values.taxRate * 100).toFixed(1) + '%'
          const rows = [
            { label: `วงเงินอนุมัติยอด${typeLabel}  ดอกเบี้ย ${values.rate}% ต่อปี`, value: values.amount, boldAmt: true },
            { label: 'ดอกเบี้ยต่อเดือน', badge: '1.25%', badgeRed: true, value: values.monthlyInterest },
            { label: 'ค่าดำเนินการ', badge: '5%', value: values.mgmtFee },
            { label: 'ค่าประมาณการค่าภาษีกรมที่ดิน', badge: taxRatePct, value: values.taxFee },
            { label: 'ชำระดอกเบี้ยล่วงหน้า', badge: String(values.months), badgeRed: true, value: values.advanceTotal },
            { label: 'วงเงินคงเหลือ', value: values.netAmount, isTotal: true },
          ]
          return (
            <div key={type} style={{ background: '#fff', border: `2px solid ${themeColor}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16, fontFamily: 'Sarabun, sans-serif' }}>
              {/* Logo header — white bg with real image */}
              <div style={{ background: '#fff', padding: '16px 20px', textAlign: 'center', borderBottom: `2px solid ${themeColor}` }}>
                <img src="/loand.png" alt="LOAN DD" style={{ height: 80, objectFit: 'contain' }} />
              </div>
              {/* Colored title bar */}
              <div style={{ background: themeColor, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>รายละเอียดค่าใช้จ่ายการ{typeLabel} (ประมาณการเบื้องต้น)</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>รหัสเคส : {caseData?.case_code || '-'}</span>
              </div>
              {/* Rows */}
              {rows.map((row, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto',
                  padding: '12px 20px', borderBottom: i < 5 ? '1px solid #e8eaf6' : 'none',
                  background: '#fff'
                }}>
                  <span style={{ fontSize: 13, fontWeight: row.isTotal ? 700 : 400, color: row.isTotal ? '#c62828' : '#333' }}>
                    {row.label}
                    {row.badge && (
                      <span style={{ fontSize: 12, color: row.badgeRed ? '#c62828' : '#555', fontWeight: 700, marginLeft: 14 }}>
                        {row.badge}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: (row.isTotal || row.boldAmt) ? 800 : 500, color: row.isTotal ? '#c62828' : '#1a1a1a', textAlign: 'right' }}>
                    {calcFmt(row.value)}
                  </span>
                </div>
              ))}
            </div>
          )
        }

        const buildTableHtml = (type, values) => {
          const tc = type === 'mortgage' ? '#b8860b' : '#2e7d32'
          const tl = type === 'mortgage' ? 'จำนอง' : 'ขายฝาก'
          const tr2 = (values.taxRate * 100).toFixed(1) + '%'
          const origin = window.location.origin
          return `<div class="wrap" style="border-color:${tc}"><div class="logo-hd"><img src="${origin}/loand.png" class="logo-img" alt="LOAN DD"></div><div class="title-row" style="background:${tc}"><span class="title-txt">รายละเอียดค่าใช้จ่ายการ${tl} (ประมาณการเบื้องต้น)</span><span class="title-code">รหัสเคส : ${caseData?.case_code || '-'}</span></div><div class="row row-even"><span class="lbl">วงเงินอนุมัติยอด${tl} ดอกเบี้ย ${values.rate}% ต่อปี</span><span class="amt amt-bold">${calcFmt(values.amount)}</span></div><div class="row row-odd"><span class="lbl">ดอกเบี้ยต่อเดือน<span class="badge badge-red">1.25%</span></span><span class="amt">${calcFmt(values.monthlyInterest)}</span></div><div class="row row-even"><span class="lbl">ค่าดำเนินการ<span class="badge">5%</span></span><span class="amt">${calcFmt(values.mgmtFee)}</span></div><div class="row row-odd"><span class="lbl">ค่าประมาณการค่าภาษีกรมที่ดิน<span class="badge">${tr2}</span></span><span class="amt">${calcFmt(values.taxFee)}</span></div><div class="row row-even"><span class="lbl">ชำระดอกเบี้ยล่วงหน้า<span class="badge badge-red">${values.months}</span></span><span class="amt">${calcFmt(values.advanceTotal)}</span></div><div class="row row-total"><span class="lbl-total">วงเงินคงเหลือ</span><span class="amt-total">${calcFmt(values.netAmount)}</span></div></div>`
        }

        const pd = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        const css = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Sarabun',sans-serif;background:#fff;padding:40px;max-width:580px;margin:0 auto}@page{size:A4;margin:18mm}.wrap{border:2px solid;border-radius:10px;overflow:hidden;margin-bottom:32px}.logo-hd{background:#fff;padding:18px 22px;text-align:center;border-bottom:2px solid currentColor}.logo-img{height:68px;object-fit:contain}.title-row{padding:11px 22px;display:flex;justify-content:space-between;align-items:center}.title-txt{font-size:14px;font-weight:700;color:#fff}.title-code{font-size:12px;color:rgba(255,255,255,0.92);font-weight:600}.row{display:grid;grid-template-columns:1fr auto;padding:12px 22px;border-bottom:1px solid #e8eaf6}.row:last-child{border-bottom:none}.row-even{background:#fff}.row-odd{background:#fff}.row-total{background:#fff}.lbl{font-size:13px;color:#333}.lbl-total{font-size:13px;color:#c62828;font-weight:700}.badge{font-size:12px;color:#444;font-weight:700;margin-left:14px}.badge-red{color:#c62828}.amt{font-size:14px;color:#1a1a1a;font-weight:500;text-align:right}.amt-bold{font-weight:800}.amt-total{font-size:14px;color:#c62828;font-weight:800;text-align:right}.footer{text-align:center;margin-top:28px;color:#aaa;font-size:11px}@media print{body{padding:0}}`

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' }}>
            <div style={{ background: '#f4f6fa', borderRadius: 16, width: '100%', maxWidth: 680, boxShadow: '0 24px 64px rgba(0,0,0,0.35)', position: 'relative' }}>

              {/* Modal Header */}
              <div style={{ background: 'linear-gradient(135deg, #1a237e, #1565c0)', borderRadius: '16px 16px 0 0', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
                    <i className="fas fa-calculator" style={{ marginRight: 10 }}></i>สร้างตารางวงเงิน
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
                    รหัสเคส: {caseData?.case_code || '-'}
                  </div>
                </div>
                <button type="button" onClick={() => setShowCalcModal(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: 24 }}>

                {/* ===== Inputs ===== */}
                <div style={{ background: '#fff', borderRadius: 10, padding: '18px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a237e', marginBottom: 14 }}>
                    <i className="fas fa-sliders-h" style={{ marginRight: 6 }}></i>ปรับค่าคำนวณ
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>วงเงินอนุมัติ (บาท)</label>
                      <input type="number" value={calcAmount} onChange={e => setCalcAmount(e.target.value)}
                        placeholder={caseData?.approved_credit || '1,300,000'}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontWeight: 700 }} />
                      {caseData?.approved_credit && !calcAmount && (
                        <button type="button" onClick={() => setCalcAmount(String(caseData.approved_credit))}
                          style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 3 }}>
                          ใช้วงเงินอนุมัติ ({Number(caseData.approved_credit).toLocaleString('th-TH')})
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ background: '#f0f4f8', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>ดอกเบี้ย (คงที่)</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1565c0' }}>15% / ปี <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>= 1.25%/เดือน</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#b8860b', display: 'block', marginBottom: 5 }}>
                        <i className="fas fa-home" style={{ marginRight: 4 }}></i>ชำระล่วงหน้า จำนอง (เดือน)
                      </label>
                      <select value={calcMortgageMonths} onChange={e => setCalcMortgageMonths(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #b8860b', borderRadius: 8, fontSize: 14 }}>
                        {['3','6','9','12','18','24'].map(m => <option key={m} value={m}>{m} เดือน</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#2e7d32', display: 'block', marginBottom: 5 }}>
                        <i className="fas fa-handshake" style={{ marginRight: 4 }}></i>ชำระล่วงหน้า ขายฝาก (เดือน)
                      </label>
                      <select value={calcPledgeMonths} onChange={e => setCalcPledgeMonths(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #2e7d32', borderRadius: 8, fontSize: 14 }}>
                        {['3','6','9','12','18','24'].map(m => <option key={m} value={m}>{m} เดือน</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ===== ตารางผลลัพธ์ ===== */}
                {parseFloat(calcAmount) > 0 ? (
                  <>
                    <div id="credit-tables-container" style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      {renderTableModal('mortgage', mortgageValues)}
                      {renderTableModal('selling_pledge', pledgeValues)}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button"
                        onClick={() => {
                          const w = window.open('', '_blank', 'width=680,height=1200')
                          w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>ตารางวงเงิน LOAN DD</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>${css}</style></head><body>${buildTableHtml('mortgage', mortgageValues)}${buildTableHtml('selling_pledge', pledgeValues)}<div class="footer">พิมพ์วันที่: ${pd}</div><script>window.onload=function(){window.print()}<\/script></body></html>`)
                          w.document.close()
                        }}
                        style={{ padding: '10px 20px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-print"></i> พิมพ์ตารางทั้งสอง
                      </button>
                      <button type="button" disabled={capturing} onClick={handleCaptureAndUpload}
                        style={{ padding: '10px 20px', background: capturing ? '#9e9e9e' : '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: capturing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {capturing
                          ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</>
                          : <><i className="fas fa-image"></i> บันทึกภาพ &amp; อัพโหลด</>}
                      </button>
                      {creditTableMsg && (
                        <div style={{ alignSelf: 'center', fontSize: 12, padding: '6px 12px', borderRadius: 6,
                          background: creditTableMsg.includes('สำเร็จ') ? '#e8f5e9' : '#fdecea',
                          color: creditTableMsg.includes('สำเร็จ') ? '#2e7d32' : '#c62828' }}>
                          {creditTableMsg}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ background: '#fff', borderRadius: 10, padding: '40px 20px', textAlign: 'center', color: '#aaa', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <i className="fas fa-calculator" style={{ fontSize: 36, marginBottom: 12, display: 'block', opacity: 0.3 }}></i>
                    <div style={{ fontSize: 14 }}>กรอก<strong>วงเงินอนุมัติ</strong>เพื่อดูตัวอย่างตาราง</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Preview Modal สำหรับดูเอกสารแบบ popup */}
      <PreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} />

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
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/investors'

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ========== Pagination ==========
const PER_PAGE = 10

function Pagination({ total, page, setPage }) {
  const totalPages = Math.ceil(total / PER_PAGE)
  if (totalPages <= 1) return null
  const startItem = (page - 1) * PER_PAGE + 1
  const endItem = Math.min(page * PER_PAGE, total)

  let pages = []
  const maxShow = 5
  let startP = Math.max(1, page - Math.floor(maxShow / 2))
  let endP = Math.min(totalPages, startP + maxShow - 1)
  if (endP - startP < maxShow - 1) startP = Math.max(1, endP - maxShow + 1)
  for (let i = startP; i <= endP; i++) pages.push(i)

  const btnStyle = (active) => ({
    padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 700 : 400, minWidth: 36, textAlign: 'center',
    background: active ? 'var(--primary)' : '#fff', color: active ? '#fff' : '#333',
    transition: 'all 0.15s'
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginTop: 8 }}>
      <span style={{ fontSize: 13, color: '#888' }}>แสดง {startItem} ถึง {endItem} จาก {total} รายการ</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={btnStyle(false)} onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</button>
        {pages.map(p => (
          <button key={p} style={btnStyle(p === page)} onClick={() => setPage(p)}>{p}</button>
        ))}
        <button style={btnStyle(false)} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</button>
      </div>
    </div>
  )
}

// ========== Modal ฟอร์มเพิ่ม/แก้ไขนายทุน ==========
function InvestorModal({ isOpen, onClose, onSaved, editData }) {
  const isEdit = !!editData
  const [form, setForm] = useState({
    investor_code: '',
    full_name: '',
    date_of_birth: '',
    nationality: 'ไทย',
    marital_status: '',
    spouse_name: '',
    spouse_national_id: '',
    national_id: '',
    national_id_expiry: '',
    address: '',
    phone: '',
    line_id: '',
    email: '',
    bank_name: '',
    bank_account_no: '',
    bank_account_name: '',
  })
  const [saving, setSaving] = useState(false)
  // ID card upload (edit mode only)
  const [idCardFile, setIdCardFile] = useState(null)
  const [uploadingIdCard, setUploadingIdCard] = useState(false)
  const [idCardMsg, setIdCardMsg] = useState('')
  // passbook upload
  const [passbookFile, setPassbookFile] = useState(null)
  const [uploadingPassbook, setUploadingPassbook] = useState(false)
  const [passbookMsg, setPassbookMsg] = useState('')
  // investor contract upload
  const [contractFile, setContractFile] = useState(null)
  const [uploadingContract, setUploadingContract] = useState(false)
  const [contractMsg, setContractMsg] = useState('')
  // house registration upload
  const [houseRegFile, setHouseRegFile] = useState(null)
  const [uploadingHouseReg, setUploadingHouseReg] = useState(false)
  const [houseRegMsg, setHouseRegMsg] = useState('')
  // deposit slip upload
  const [depositSlipFile, setDepositSlipFile] = useState(null)
  const [uploadingDepositSlip, setUploadingDepositSlip] = useState(false)
  const [depositSlipMsg, setDepositSlipMsg] = useState('')
  // file previews
  const [idCardPreview, setIdCardPreview] = useState(null)
  const [houseRegPreview, setHouseRegPreview] = useState(null)
  const [passbookPreview, setPassbookPreview] = useState(null)
  const [contractPreview, setContractPreview] = useState(null)
  const [depositSlipPreview, setDepositSlipPreview] = useState(null)
  // OCR — บัตรประชาชน
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMsg, setOcrMsg] = useState('')
  // OCR — ทะเบียนบ้าน
  const [houseOcrLoading, setHouseOcrLoading] = useState(false)
  const [houseOcrMsg, setHouseOcrMsg] = useState('')
  // OCR — สมุดบัญชี
  const [passbookOcrLoading, setPassbookOcrLoading] = useState(false)
  const [passbookOcrMsg, setPassbookOcrMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setIdCardFile(null); setIdCardMsg(''); setIdCardPreview(null)
      setHouseRegFile(null); setHouseRegMsg(''); setHouseRegPreview(null)
      setPassbookFile(null); setPassbookMsg(''); setPassbookPreview(null)
      setContractFile(null); setContractMsg(''); setContractPreview(null)
      setDepositSlipFile(null); setDepositSlipMsg(''); setDepositSlipPreview(null)
      setOcrLoading(false); setOcrMsg('')
      setHouseOcrLoading(false); setHouseOcrMsg('')
      setPassbookOcrLoading(false); setPassbookOcrMsg('')
      if (editData) {
        if (editData.deposit_slip) setDepositSlipPreview(editData.deposit_slip)
        setForm({
          investor_code: editData.investor_code || '',
          full_name: editData.full_name || '',
          date_of_birth: editData.date_of_birth ? editData.date_of_birth.slice(0, 10) : '',
          nationality: editData.nationality || 'ไทย',
          marital_status: editData.marital_status || '',
          spouse_name: editData.spouse_name || '',
          spouse_national_id: editData.spouse_national_id || '',
          national_id: editData.national_id || '',
          national_id_expiry: editData.national_id_expiry ? editData.national_id_expiry.slice(0, 10) : '',
          address: editData.address || '',
          phone: editData.phone || '',
          line_id: editData.line_id || '',
          email: editData.email || '',
          bank_name: editData.bank_name || '',
          bank_account_no: editData.bank_account_no || '',
          bank_account_name: editData.bank_account_name || '',
        })
      } else {
        setForm({
          investor_code: '',
          full_name: '',
          date_of_birth: '',
          nationality: 'ไทย',
          marital_status: '',
          spouse_name: '',
          spouse_national_id: '',
          national_id: '',
          national_id_expiry: '',
          address: '',
          phone: '',
          line_id: '',
          email: '',
          bank_name: '',
          bank_account_no: '',
          bank_account_name: '',
        })
        fetch(`${API}/next-code`, { headers: { Authorization: `Bearer ${token()}` } })
          .then(r => r.json())
          .then(d => { if (d.success) setForm(prev => ({ ...prev, investor_code: d.code })) })
          .catch(() => {})
      }
    }
  }, [isOpen, editData])

  const handleUploadIdCard = async (investorId) => {
    const targetId = investorId || editData?.id
    if (!idCardFile || !targetId) return
    setUploadingIdCard(true); setIdCardMsg('')
    const fd = new FormData(); fd.append('id_card', idCardFile)
    const res = await fetch(`${API}/${targetId}/id-card`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd
    })
    const d = await res.json()
    setIdCardMsg(d.success ? '✅ อัพโหลดสำเร็จ' : (d.message || 'เกิดข้อผิดพลาด'))
    if (d.success) onSaved()
    setUploadingIdCard(false)
  }

  const handleUploadFile = async (investorId, field, file, setUploading, setMsg) => {
    const targetId = investorId || editData?.id
    if (!file || !targetId) return
    setUploading(true); setMsg('')
    const fd = new FormData(); fd.append(field, file)
    const res = await fetch(`${API}/${targetId}/doc-upload`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd
    })
    const d = await res.json()
    setMsg(d.success ? '✅ อัพโหลดสำเร็จ' : (d.message || 'เกิดข้อผิดพลาด'))
    if (d.success) onSaved()
    setUploading(false)
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleOcr = async (file) => {
    if (!file) return
    setOcrLoading(true); setOcrMsg('')
    try {
      const fd = new FormData(); fd.append('image', file)
      const res = await fetch(`${API}/ocr-id-card`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const d = await res.json()
      if (d.success) {
        const updates = {}
        if (d.national_id) updates.national_id = d.national_id
        if (d.national_id_expiry) updates.national_id_expiry = d.national_id_expiry
        if (d.full_name && !form.full_name) updates.full_name = d.full_name
        setForm(prev => ({ ...prev, ...updates }))
        const filled = Object.keys(updates).length
        setOcrMsg(filled > 0
          ? '✅ อ่านบัตรสำเร็จ กรุณาตรวจสอบข้อมูลที่กรอกอัตโนมัติ'
          : '⚠️ อ่านบัตรได้แต่ไม่พบข้อมูล — กรุณากรอกเอง')
      } else {
        setOcrMsg('❌ ' + (d.message || 'OCR ล้มเหลว'))
      }
    } catch {
      setOcrMsg('❌ เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setOcrLoading(false)
    }
  }

  const handleHouseOcr = async (file) => {
    if (!file) return
    setHouseOcrLoading(true); setHouseOcrMsg('')
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('doc_type', 'house_registration')
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd
      })
      const d = await res.json()
      if (d.success && d.extracted?.full_address) {
        setForm(prev => ({ ...prev, address: d.extracted.full_address }))
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

  const handlePassbookOcr = async (file) => {
    if (!file) return
    setPassbookOcrLoading(true); setPassbookOcrMsg('')
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('doc_type', 'passbook')
      const res = await fetch('/api/admin/ocr/extract', {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd
      })
      const d = await res.json()
      if (d.success && d.extracted) {
        const ex = d.extracted
        const updates = {}
        if (ex.bank_name)      updates.bank_name      = ex.bank_name
        if (ex.account_number) updates.bank_account_no = ex.account_number
        if (ex.account_name)   updates.bank_account_name = ex.account_name
        if (Object.keys(updates).length > 0) {
          setForm(prev => ({ ...prev, ...updates }))
          setPassbookOcrMsg('✅ OCR สำเร็จ — ตรวจสอบข้อมูลธนาคารด้วยนะคะ')
        } else {
          setPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเองนะคะ')
        }
      } else {
        setPassbookOcrMsg('⚠️ OCR อ่านไม่ได้ — กรอกเองนะคะ')
      }
    } catch { setPassbookOcrMsg('⚠️ OCR ล้มเหลว') }
    finally { setPassbookOcrLoading(false) }
  }

  const handleDeleteDoc = async (field) => {
    if (!editData?.id) return
    if (!confirm('ยืนยันลบไฟล์นี้?')) return
    const res = await fetch(`${API}/${editData.id}/doc`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ field })
    })
    const d = await res.json()
    if (d.success) { alert('ลบไฟล์เรียบร้อย'); onSaved() }
    else alert(d.message || 'ลบไม่สำเร็จ')
  }

  const handleSave = async () => {
    if (!form.full_name) return alert('กรุณากรอกชื่อ-สกุล')
    setSaving(true)
    try {
      const url = isEdit ? `${API}/${editData.id}` : API
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form)
      })
      const r = await res.json()
      if (r.success) {
        // ถ้าสร้างใหม่และมีไฟล์บัตรประชาชน ให้ upload ต่อเลย
        if (!isEdit && idCardFile && r.id) {
          await handleUploadIdCard(r.id)
        }
        onSaved()
        onClose()
      } else {
        alert(r.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      alert('เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const labelStyle = { fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4 }
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box'
  }
  const readonlyStyle = { ...inputStyle, background: '#f5f5f5', color: '#888' }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.4)', zIndex: 9998
      }}></div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9999, background: '#fff', borderRadius: 12,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--primary)', color: '#fff', padding: '16px 24px',
          borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isEdit ? 'แก้ไขนายทุน' : 'เพิ่มนายทุน'}
          </h3>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: '50%', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ID ของนายทุน */}
          <div>
            <label style={labelStyle}>ID ของนายทุน</label>
            <input style={readonlyStyle} value={form.investor_code} readOnly />
          </div>

          {/* ชื่อ-สกุล */}
          <div>
            <label style={labelStyle}>ชื่อ-สกุล <span style={{ color: '#e74c3c' }}>*</span></label>
            <input style={inputStyle} value={form.full_name}
              onChange={e => handleChange('full_name', e.target.value)} placeholder="กรอกชื่อ-สกุล"
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = '#ddd'} />
          </div>

          {/* เบอร์โทร + ชื่อไลน์ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>เบอร์โทร</label>
              <input style={inputStyle} value={form.phone}
                onChange={e => handleChange('phone', e.target.value)} placeholder="กรอกเบอร์โทร"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
            <div>
              <label style={labelStyle}>ชื่อไลน์</label>
              <input style={inputStyle} value={form.line_id}
                onChange={e => handleChange('line_id', e.target.value)} placeholder="LINE ID"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.email}
              onChange={e => handleChange('email', e.target.value)} placeholder="กรอก Email"
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = '#ddd'} />
          </div>

          {/* ─── ข้อมูลส่วนตัว (สำหรับสัญญา) ─── */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6c3483', marginBottom: 10 }}>
              <i className="fas fa-user-circle" style={{ marginRight: 6 }}></i>ข้อมูลส่วนตัว <span style={{ fontSize: 11, fontWeight: 400, color: '#999' }}>(สำหรับสัญญา)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>วันเกิด</label>
                <input style={{ ...inputStyle, fontSize: 13 }} type="date" value={form.date_of_birth}
                  onChange={e => handleChange('date_of_birth', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#6c3483'}
                  onBlur={e => e.target.style.borderColor = '#ddd'} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>สัญชาติ</label>
                <input style={{ ...inputStyle, fontSize: 13 }} value={form.nationality}
                  onChange={e => handleChange('nationality', e.target.value)}
                  placeholder="ไทย"
                  onFocus={e => e.target.style.borderColor = '#6c3483'}
                  onBlur={e => e.target.style.borderColor = '#ddd'} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ ...labelStyle, fontSize: 12 }}>สถานภาพสมรส</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {['โสด', 'สมรส', 'หย่า', 'หม้าย'].map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer',
                    padding: '5px 12px', borderRadius: 20,
                    background: form.marital_status === s ? '#6c3483' : '#f5f5f5',
                    color: form.marital_status === s ? '#fff' : '#555',
                    border: `1px solid ${form.marital_status === s ? '#6c3483' : '#ddd'}`,
                    transition: 'all 0.15s' }}>
                    <input type="radio" name="marital_status" value={s} checked={form.marital_status === s}
                      onChange={() => handleChange('marital_status', s)} style={{ display: 'none' }} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            {/* ─ เตือนเอกสารตามสถานภาพ ─ */}
            {form.marital_status === 'สมรส' && (
              <div style={{ background: '#fdf2fb', border: '1px solid #e8b4f8', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: '#6c3483' }}>
                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                <strong>เตรียมเอกสารคู่สมรส:</strong> บัตรประชาชนคู่สมรส + ทะเบียนบ้าน + ใบสำคัญการสมรส (ตัวจริง) + หนังสือยินยอมคู่สมรส
              </div>
            )}
            {(form.marital_status === 'หย่า') && (
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: '#92400e' }}>
                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                <strong>เตรียมเอกสารเพิ่มเติม:</strong> ใบสำคัญการหย่า (ตัวจริง)
              </div>
            )}
            {form.marital_status === 'หม้าย' && (
              <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: '#374151' }}>
                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                <strong>เตรียมเอกสารเพิ่มเติม:</strong> ใบมรณบัตรคู่สมรส
              </div>
            )}
          </div>

          {/* ─── ข้อมูลบัตรประชาชน ─── */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c0392b', marginBottom: 10 }}>
              <i className="fas fa-id-card" style={{ marginRight: 6 }}></i>ข้อมูลบัตรประชาชน
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>เลขบัตรประชาชน</label>
                <input style={{ ...inputStyle, fontSize: 13 }} value={form.national_id}
                  onChange={e => handleChange('national_id', e.target.value)}
                  placeholder="1-XXXX-XXXXX-XX-X" maxLength={17}
                  onFocus={e => e.target.style.borderColor = '#c0392b'}
                  onBlur={e => e.target.style.borderColor = '#ddd'} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>วันหมดอายุบัตร</label>
                <input style={{ ...inputStyle, fontSize: 13 }} type="date" value={form.national_id_expiry}
                  onChange={e => handleChange('national_id_expiry', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#c0392b'}
                  onBlur={e => e.target.style.borderColor = '#ddd'} />
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 12 }}>ที่อยู่ตามทะเบียนบ้าน</label>
              <textarea style={{ ...inputStyle, fontSize: 13, resize: 'vertical', minHeight: 60 }}
                value={form.address} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                onChange={e => handleChange('address', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#c0392b'}
                onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
          </div>

          {/* ─── บัญชีธนาคาร ─── */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1565c0', marginBottom: 10 }}>
              <i className="fas fa-university" style={{ marginRight: 6 }}></i>บัญชีธนาคาร
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>ธนาคาร</label>
                <select style={{ ...inputStyle, fontSize: 13 }}
                  value={form.bank_name} onChange={e => handleChange('bank_name', e.target.value)}>
                  <option value="">-- เลือกธนาคาร --</option>
                  {['กสิกรไทย','กรุงไทย','กรุงเทพ','ไทยพาณิชย์','กรุงศรีอยุธยา','ทหารไทยธนชาต','ออมสิน','ธ.ก.ส.','อาคารสงเคราะห์','ซิตี้แบงก์','อื่นๆ'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 12 }}>เลขบัญชี</label>
                <input style={{ ...inputStyle, fontSize: 13 }} value={form.bank_account_no}
                  onChange={e => handleChange('bank_account_no', e.target.value)} placeholder="000-0-00000-0" />
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 12 }}>ชื่อบัญชี</label>
              <input style={{ ...inputStyle, fontSize: 13 }} value={form.bank_account_name}
                onChange={e => handleChange('bank_account_name', e.target.value)} placeholder="ชื่อ-สกุล เจ้าของบัญชี" />
            </div>
          </div>

          {/* ─── บัตรประชาชน / หลักฐานตัวตน ─── */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8e44ad', marginBottom: 8 }}>
              <i className="fas fa-id-card" style={{ marginRight: 6 }}></i>บัตรประชาชน / หลักฐานตัวตน
              {ocrLoading && <span style={{ fontSize: 11, fontWeight: 400, color: '#e67e22', marginLeft: 8 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
              {!isEdit && <span style={{ fontSize: 11, fontWeight: 400, color: '#aaa', marginLeft: 6 }}>(อัพโหลดหลังบันทึกอัตโนมัติ)</span>}
            </div>
            {isEdit && editData?.id_card_image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 10, marginBottom: 10 }}>
                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #d8b4fe', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => window.open(editData.id_card_image.startsWith('/') ? editData.id_card_image : `/${editData.id_card_image}`, '_blank')}>
                  {editData.id_card_image.toLowerCase().includes('.pdf')
                    ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#e53935' }}></i>
                    : <img src={editData.id_card_image.startsWith('/') ? editData.id_card_image : `/${editData.id_card_image}`} alt="id card" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}><i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>มีไฟล์แล้ว</div>
                  <a href={editData.id_card_image.startsWith('/') ? editData.id_card_image : `/${editData.id_card_image}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: '#8e44ad', textDecoration: 'underline' }}>
                    <i className="fas fa-external-link-alt" style={{ marginRight: 3 }}></i>ดูไฟล์
                  </a>
                </div>
                <button type="button" onClick={() => handleDeleteDoc('id_card_image')}
                  style={{ padding: '5px 10px', background: '#fef2f2', color: '#e74c3c', border: '1.5px solid #fca5a5', borderRadius: 7, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, flexShrink: 0 }}>
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            )}
            {/* ── styled upload zone with preview ── */}
            <label style={{
              display: 'block', cursor: ocrLoading ? 'default' : 'pointer', marginBottom: 8,
              background: idCardPreview ? '#faf5ff' : '#f9f0ff',
              border: `2px dashed ${idCardPreview ? '#a855f7' : '#c39bd3'}`,
              borderRadius: 10, padding: 12, transition: 'border-color 0.2s',
            }}
              onMouseEnter={e => { if (!idCardPreview) e.currentTarget.style.borderColor = '#8e44ad' }}
              onMouseLeave={e => { if (!idCardPreview) e.currentTarget.style.borderColor = '#c39bd3' }}
            >
              <input type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }}
                disabled={ocrLoading}
                onChange={e => {
                  const f = e.target.files[0] || null
                  if (!f) return
                  setIdCardFile(f); setIdCardMsg(''); setOcrMsg('')
                  setIdCardPreview(URL.createObjectURL(f))
                  handleOcr(f)
                  e.target.value = ''
                }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* thumbnail */}
                <div style={{
                  width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                  background: '#ede9fe', border: '1px solid #d8b4fe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                  {idCardPreview
                    ? <img src={idCardPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <i className="fas fa-id-card" style={{ fontSize: 26, color: '#a855f7' }}></i>
                  }
                  {idCardPreview && !ocrLoading && (
                    <button type="button"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setIdCardFile(null); setIdCardPreview(null); setOcrMsg('') }}
                      style={{
                        position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2,
                      }} title="ลบรูป">✕</button>
                  )}
                  {ocrLoading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(139,92,246,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 20 }}></i>
                    </div>
                  )}
                </div>
                {/* text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7e22ce', marginBottom: 3 }}>
                    <i className="fas fa-camera" style={{ marginRight: 5 }}></i>
                    {ocrLoading ? 'กำลังอ่านบัตร...' : idCardPreview ? 'เปลี่ยนรูปบัตรประชาชน' : 'สแกน / อัพโหลดบัตรประชาชน'}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
                    {ocrLoading
                      ? 'AI กำลังอ่านข้อมูลจากบัตร...'
                      : idCardPreview
                        ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ อัพโหลดบัตรแล้ว</span> — คลิกเพื่อเปลี่ยน</>
                        : <>JPG / PNG — OCR อ่านชื่อ-เลขบัตรอัตโนมัติ</>
                    }
                  </div>
                  {idCardFile && !ocrLoading && (
                    <div style={{ fontSize: 10, color: '#7d3c98', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <i className="fas fa-paperclip" style={{ marginRight: 3 }}></i>{idCardFile.name}
                    </div>
                  )}
                </div>
              </div>
            </label>
            {isEdit && (
              <button type="button" onClick={() => handleUploadIdCard()}
                disabled={uploadingIdCard || !idCardFile}
                style={{ padding: '5px 12px', background: '#8e44ad', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {uploadingIdCard ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลด</>}
              </button>
            )}
            {ocrMsg && <div style={{ fontSize: 11, marginTop: 5, padding: '5px 10px', borderRadius: 6, background: ocrMsg.startsWith('✅') ? '#eafaf1' : ocrMsg.startsWith('⚠️') ? '#fef9e7' : '#fdf2f0', color: ocrMsg.startsWith('✅') ? '#1e8449' : ocrMsg.startsWith('⚠️') ? '#9a7d0a' : '#c0392b', fontWeight: 500 }}>{ocrMsg}</div>}
            {idCardMsg && <div style={{ fontSize: 11, marginTop: 6, color: idCardMsg.startsWith('✅') ? '#27ae60' : '#e74c3c' }}>{idCardMsg}</div>}
          </div>

          {/* ─── สำเนาทะเบียนบ้าน ─── */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c0392b', marginBottom: 8 }}>
              <i className="fas fa-home" style={{ marginRight: 6 }}></i>สำเนาทะเบียนบ้าน
              {houseOcrLoading && <span style={{ fontSize: 11, fontWeight: 400, color: '#e65100', marginLeft: 8 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
              {!isEdit && <span style={{ fontSize: 11, fontWeight: 400, color: '#aaa', marginLeft: 6 }}>(อัพโหลดหลังบันทึก)</span>}
            </div>
            {isEdit && editData?.house_registration_image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: 10, marginBottom: 10 }}>
                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #fca5a5', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => window.open(editData.house_registration_image.startsWith('/') ? editData.house_registration_image : `/${editData.house_registration_image}`, '_blank')}>
                  {editData.house_registration_image.toLowerCase().includes('.pdf')
                    ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#e53935' }}></i>
                    : <img src={editData.house_registration_image.startsWith('/') ? editData.house_registration_image : `/${editData.house_registration_image}`} alt="house reg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}><i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>มีไฟล์แล้ว</div>
                  <a href={editData.house_registration_image.startsWith('/') ? editData.house_registration_image : `/${editData.house_registration_image}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: '#c0392b', textDecoration: 'underline' }}>
                    <i className="fas fa-external-link-alt" style={{ marginRight: 3 }}></i>ดูไฟล์
                  </a>
                </div>
                <button type="button" onClick={() => handleDeleteDoc('house_registration_image')}
                  style={{ padding: '5px 10px', background: '#fef2f2', color: '#e74c3c', border: '1.5px solid #fca5a5', borderRadius: 7, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, flexShrink: 0 }}>
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            )}
            <label style={{
              display: 'block', cursor: houseOcrLoading ? 'default' : 'pointer', marginBottom: 8,
              background: houseRegPreview ? '#fff5f5' : '#fdf2f0',
              border: `2px dashed ${houseRegPreview ? '#e53e3e' : '#f5a5a5'}`,
              borderRadius: 10, padding: 12, transition: 'border-color 0.2s',
            }}>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }}
                disabled={houseOcrLoading}
                onChange={e => {
                  const f = e.target.files[0] || null
                  if (!f) return
                  setHouseRegFile(f); setHouseRegMsg('')
                  setHouseRegPreview(f.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(f))
                  handleHouseOcr(f)
                  e.target.value = ''
                }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                  background: '#fee2e2', border: '1px solid #fca5a5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                  {houseRegPreview === 'pdf'
                    ? <i className="fas fa-file-pdf" style={{ fontSize: 26, color: '#e53e3e' }}></i>
                    : houseRegPreview
                      ? <img src={houseRegPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <i className="fas fa-home" style={{ fontSize: 26, color: '#e53e3e' }}></i>
                  }
                  {houseRegPreview && !houseOcrLoading && (
                    <button type="button"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setHouseRegFile(null); setHouseRegPreview(null); setHouseOcrMsg('') }}
                      style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                      title="ลบไฟล์">✕</button>
                  )}
                  {houseOcrLoading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(229,62,62,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 20 }}></i>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#c0392b', marginBottom: 3 }}>
                    <i className="fas fa-upload" style={{ marginRight: 5 }}></i>
                    {houseOcrLoading ? 'กำลังอ่านข้อมูล...' : houseRegPreview ? 'เปลี่ยนไฟล์ทะเบียนบ้าน' : 'อัพโหลดสำเนาทะเบียนบ้าน'}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
                    {houseRegPreview
                      ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกไฟล์แล้ว</span> — คลิกเพื่อเปลี่ยน</>
                      : <>JPG / PNG / PDF</>
                    }
                  </div>
                  {houseRegFile && !houseOcrLoading && (
                    <div style={{ fontSize: 10, color: '#c0392b', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <i className="fas fa-paperclip" style={{ marginRight: 3 }}></i>{houseRegFile.name}
                    </div>
                  )}
                </div>
              </div>
            </label>
            {isEdit && (
              <button type="button"
                onClick={() => handleUploadFile(null, 'house_registration_image', houseRegFile, setUploadingHouseReg, setHouseRegMsg)}
                disabled={uploadingHouseReg || !houseRegFile}
                style={{ padding: '5px 12px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {uploadingHouseReg ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลด</>}
              </button>
            )}
            {houseOcrMsg && <div style={{ fontSize: 11, marginTop: 5, padding: '4px 8px', borderRadius: 6,
              background: houseOcrMsg.startsWith('✅') ? '#e8f5e9' : '#fff3e0',
              color: houseOcrMsg.startsWith('✅') ? '#2e7d32' : '#e65100', fontWeight: 500 }}>{houseOcrMsg}</div>}
            {houseRegMsg && <div style={{ fontSize: 11, marginTop: 6, color: houseRegMsg.startsWith('✅') ? '#27ae60' : '#e74c3c' }}>{houseRegMsg}</div>}
          </div>

          {/* ─── หน้าสมุดบัญชี ─── */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1565c0', marginBottom: 8 }}>
              <i className="fas fa-book-open" style={{ marginRight: 6 }}></i>หน้าสมุดบัญชี (Book Bank)
              {passbookOcrLoading && <span style={{ fontSize: 11, fontWeight: 400, color: '#1565c0', marginLeft: 8 }}><i className="fas fa-spinner fa-spin"></i> OCR...</span>}
              {!isEdit && <span style={{ fontSize: 11, fontWeight: 400, color: '#aaa', marginLeft: 6 }}>(อัพโหลดหลังบันทึก)</span>}
            </div>
            {isEdit && editData?.passbook_image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 10, marginBottom: 10 }}>
                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #93c5fd', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => window.open(editData.passbook_image.startsWith('/') ? editData.passbook_image : `/${editData.passbook_image}`, '_blank')}>
                  {editData.passbook_image.toLowerCase().includes('.pdf')
                    ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#e53935' }}></i>
                    : <img src={editData.passbook_image.startsWith('/') ? editData.passbook_image : `/${editData.passbook_image}`} alt="passbook" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}><i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>มีไฟล์แล้ว</div>
                  <a href={editData.passbook_image.startsWith('/') ? editData.passbook_image : `/${editData.passbook_image}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: '#1565c0', textDecoration: 'underline' }}>
                    <i className="fas fa-external-link-alt" style={{ marginRight: 3 }}></i>ดูไฟล์
                  </a>
                </div>
                <button type="button" onClick={() => handleDeleteDoc('passbook_image')}
                  style={{ padding: '5px 10px', background: '#fef2f2', color: '#e74c3c', border: '1.5px solid #fca5a5', borderRadius: 7, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, flexShrink: 0 }}>
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            )}
            <label style={{
              display: 'block', cursor: passbookOcrLoading ? 'default' : 'pointer', marginBottom: 8,
              background: passbookPreview ? '#eff6ff' : '#f0f4ff',
              border: `2px dashed ${passbookPreview ? '#1d4ed8' : '#93c5fd'}`,
              borderRadius: 10, padding: 12, transition: 'border-color 0.2s',
            }}>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }}
                disabled={passbookOcrLoading}
                onChange={e => {
                  const f = e.target.files[0] || null
                  if (!f) return
                  setPassbookFile(f); setPassbookMsg('')
                  setPassbookPreview(f.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(f))
                  handlePassbookOcr(f)
                  e.target.value = ''
                }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                  background: '#dbeafe', border: '1px solid #93c5fd',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                  {passbookPreview === 'pdf'
                    ? <i className="fas fa-file-pdf" style={{ fontSize: 26, color: '#1565c0' }}></i>
                    : passbookPreview
                      ? <img src={passbookPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <i className="fas fa-book-open" style={{ fontSize: 26, color: '#1565c0' }}></i>
                  }
                  {passbookPreview && !passbookOcrLoading && (
                    <button type="button"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setPassbookFile(null); setPassbookPreview(null); setPassbookOcrMsg('') }}
                      style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                      title="ลบไฟล์">✕</button>
                  )}
                  {passbookOcrLoading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(29,78,216,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 20 }}></i>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', marginBottom: 3 }}>
                    <i className="fas fa-upload" style={{ marginRight: 5 }}></i>
                    {passbookOcrLoading ? 'กำลังอ่านข้อมูล...' : passbookPreview ? 'เปลี่ยนไฟล์สมุดบัญชี' : 'อัพโหลดหน้าสมุดบัญชี'}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
                    {passbookPreview
                      ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกไฟล์แล้ว</span> — คลิกเพื่อเปลี่ยน</>
                      : <>JPG / PNG / PDF</>
                    }
                  </div>
                  {passbookFile && !passbookOcrLoading && (
                    <div style={{ fontSize: 10, color: '#1565c0', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <i className="fas fa-paperclip" style={{ marginRight: 3 }}></i>{passbookFile.name}
                    </div>
                  )}
                </div>
              </div>
            </label>
            {isEdit && (
              <button type="button"
                onClick={() => handleUploadFile(null, 'passbook_image', passbookFile, setUploadingPassbook, setPassbookMsg)}
                disabled={uploadingPassbook || !passbookFile}
                style={{ padding: '5px 12px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {uploadingPassbook ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลด</>}
              </button>
            )}
            {passbookOcrMsg && <div style={{ fontSize: 11, marginTop: 5, padding: '4px 8px', borderRadius: 6,
              background: passbookOcrMsg.startsWith('✅') ? '#e8f5e9' : '#fff3e0',
              color: passbookOcrMsg.startsWith('✅') ? '#2e7d32' : '#e65100', fontWeight: 500 }}>{passbookOcrMsg}</div>}
            {passbookMsg && <div style={{ fontSize: 11, marginTop: 6, color: passbookMsg.startsWith('✅') ? '#27ae60' : '#e74c3c' }}>{passbookMsg}</div>}
          </div>

          {/* ─── สัญญานายทุน ─── */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', marginBottom: 8 }}>
              <i className="fas fa-file-signature" style={{ marginRight: 6 }}></i>สัญญานายทุน
              {!isEdit && <span style={{ fontSize: 11, fontWeight: 400, color: '#aaa', marginLeft: 6 }}>(อัพโหลดหลังบันทึก)</span>}
            </div>
            {isEdit && editData?.investor_contract && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 10, marginBottom: 10 }}>
                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #c4b5fd', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => window.open(editData.investor_contract.startsWith('/') ? editData.investor_contract : `/${editData.investor_contract}`, '_blank')}>
                  {editData.investor_contract.toLowerCase().includes('.pdf')
                    ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#e53935' }}></i>
                    : <img src={editData.investor_contract.startsWith('/') ? editData.investor_contract : `/${editData.investor_contract}`} alt="contract" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}><i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>มีไฟล์แล้ว</div>
                  <a href={editData.investor_contract.startsWith('/') ? editData.investor_contract : `/${editData.investor_contract}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: '#6d28d9', textDecoration: 'underline' }}>
                    <i className="fas fa-external-link-alt" style={{ marginRight: 3 }}></i>ดูไฟล์
                  </a>
                </div>
                <button type="button" onClick={() => handleDeleteDoc('investor_contract')}
                  style={{ padding: '5px 10px', background: '#fef2f2', color: '#e74c3c', border: '1.5px solid #fca5a5', borderRadius: 7, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, flexShrink: 0 }}>
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            )}
            <label style={{
              display: 'block', cursor: 'pointer', marginBottom: 8,
              background: contractPreview ? '#f5f3ff' : '#f3f0ff',
              border: `2px dashed ${contractPreview ? '#7c3aed' : '#c4b5fd'}`,
              borderRadius: 10, padding: 12, transition: 'border-color 0.2s',
            }}>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files[0] || null
                  if (!f) return
                  setContractFile(f); setContractMsg('')
                  setContractPreview(f.type === 'application/pdf' ? 'pdf' : URL.createObjectURL(f))
                  e.target.value = ''
                }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                  background: '#ede9fe', border: '1px solid #c4b5fd',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                  {contractPreview === 'pdf'
                    ? <i className="fas fa-file-pdf" style={{ fontSize: 26, color: '#7c3aed' }}></i>
                    : contractPreview
                      ? <img src={contractPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <i className="fas fa-file-signature" style={{ fontSize: 26, color: '#7c3aed' }}></i>
                  }
                  {contractPreview && (
                    <button type="button"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setContractFile(null); setContractPreview(null) }}
                      style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}
                      title="ลบไฟล์">✕</button>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 3 }}>
                    <i className="fas fa-upload" style={{ marginRight: 5 }}></i>
                    {contractPreview ? 'เปลี่ยนไฟล์สัญญา' : 'อัพโหลดสัญญานายทุน'}
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
                    {contractPreview
                      ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ เลือกไฟล์แล้ว</span> — คลิกเพื่อเปลี่ยน</>
                      : <>JPG / PNG / PDF</>
                    }
                  </div>
                  {contractFile && (
                    <div style={{ fontSize: 10, color: '#6d28d9', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <i className="fas fa-paperclip" style={{ marginRight: 3 }}></i>{contractFile.name}
                    </div>
                  )}
                </div>
              </div>
            </label>
            {isEdit && (
              <button type="button"
                onClick={() => handleUploadFile(null, 'investor_contract', contractFile, setUploadingContract, setContractMsg)}
                disabled={uploadingContract || !contractFile}
                style={{ padding: '5px 12px', background: '#6d28d9', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {uploadingContract ? <><i className="fas fa-spinner fa-spin"></i> กำลังอัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลด</>}
              </button>
            )}
            {contractMsg && <div style={{ fontSize: 11, marginTop: 6, color: contractMsg.startsWith('✅') ? '#27ae60' : '#e74c3c' }}>{contractMsg}</div>}
          </div>

          {/* ─── สลิปเงินมัดจำนายทุน 1% ─── */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', marginBottom: 10 }}>
              <i className="fas fa-receipt" style={{ marginRight: 6 }}></i>สลิปเงินมัดจำนายทุน 1%
            </div>

            {isEdit && depositSlipPreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 10 }}>
                <div style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #d8b4fe', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => window.open(depositSlipPreview, '_blank')}>
                  {depositSlipPreview.toLowerCase().includes('.pdf')
                    ? <i className="fas fa-file-pdf" style={{ fontSize: 22, color: '#e53935' }}></i>
                    : <img src={depositSlipPreview} alt="slip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                    <i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>มีสลิปแล้ว
                  </div>
                  <a href={depositSlipPreview} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: '#7c3aed', textDecoration: 'underline' }}>
                    <i className="fas fa-external-link-alt" style={{ marginRight: 3 }}></i>ดูสลิป
                  </a>
                </div>
                <label style={{ cursor: 'pointer', padding: '4px 10px', background: '#ede9fe', color: '#7c3aed', borderRadius: 6, fontSize: 10, fontWeight: 600, border: '1px solid #d8b4fe', whiteSpace: 'nowrap' }}>
                  <i className="fas fa-sync-alt" style={{ marginRight: 3 }}></i>เปลี่ยน
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf,.webp" style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files[0]; if (!f) return; e.target.value = ''
                      const fd = new FormData(); fd.append('deposit_slip', f)
                      try {
                        const r = await fetch(`${API}/${editData.id}/doc-upload`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd })
                        const d = await r.json()
                        if (d.success) {
                          setDepositSlipPreview(d.deposit_slip || depositSlipPreview)
                          setDepositSlipMsg('✅ เปลี่ยนสลิปสำเร็จ')
                        } else { alert(d.message || 'อัพโหลดไม่สำเร็จ') }
                      } catch { alert('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
                    }} />
                </label>
              </div>
            ) : isEdit ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  height: 80, borderRadius: 8, border: '2px dashed #fdba74', background: '#fff7ed',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf,.webp" style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files[0]; if (!f) return; e.target.value = ''
                      const fd = new FormData(); fd.append('deposit_slip', f)
                      try {
                        const r = await fetch(`${API}/${editData.id}/doc-upload`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd })
                        const d = await r.json()
                        if (d.success) {
                          setDepositSlipPreview(d.deposit_slip || URL.createObjectURL(f))
                          setDepositSlipMsg('✅ อัพโหลดสลิปสำเร็จ')
                        } else { alert(d.message || 'อัพโหลดไม่สำเร็จ') }
                      } catch { alert('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ') }
                    }} />
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: 22, color: '#f97316' }}></i>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>อัพโหลดสลิปมัดจำ</div>
                  <div style={{ fontSize: 9, color: '#fb923c' }}>JPG · PNG · PDF · WEBP</div>
                </label>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#aaa' }}>(อัพโหลดหลังบันทึก)</div>
            )}
            {depositSlipMsg && <div style={{ fontSize: 11, marginTop: 6, color: depositSlipMsg.startsWith('✅') ? '#27ae60' : '#e74c3c' }}>{depositSlipMsg}</div>}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #eee',
          display: 'flex', justifyContent: 'flex-end', gap: 10
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px', borderRadius: 8, border: '1px solid #ddd',
              background: '#fff', color: '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              transition: 'all 0.15s'
            }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </>
  )
}

// ==================== MAIN INVESTOR PAGE ====================
export default function InvestorPage() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetch(API, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const filtered = data.filter(d => {
    if (!search) return true
    if (searchField === 'full_name') return d.full_name?.includes(search)
    if (searchField === 'phone') return d.phone?.includes(search)
    if (searchField === 'investor_code') return d.investor_code?.toLowerCase().includes(search.toLowerCase())
    if (searchField === 'email') return d.email?.toLowerCase().includes(search.toLowerCase())
    if (searchField === 'line_id') return d.line_id?.toLowerCase().includes(search.toLowerCase())
    return d.investor_code?.toLowerCase().includes(search.toLowerCase()) || d.full_name?.includes(search) || d.phone?.includes(search) || d.email?.toLowerCase().includes(search.toLowerCase()) || d.line_id?.toLowerCase().includes(search.toLowerCase())
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  useEffect(() => { setPage(1) }, [search])

  const openCreate = () => { setEditData(null); setModalOpen(true) }
  const openEdit = (investor) => { setEditData(investor); setModalOpen(true) }

  const handleDelete = async (investor) => {
    if (!confirm(`ยืนยันลบนายทุน "${investor.full_name || investor.investor_code}"?`)) return
    const res = await fetch(`${API}/${investor.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    })
    const d = await res.json()
    if (d.success) loadData()
    else alert(d.message || 'ลบไม่สำเร็จ')
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>นายทุน</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงทั้งหมด</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={searchField}
            onChange={e => setSearchField(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 140 }}
          >
            <option value="">ทั้งหมด</option>
            <option value="full_name">ชื่อ</option>
            <option value="phone">เบอร์โทร</option>
            <option value="investor_code">รหัสนายทุน</option>
            <option value="email">อีเมล</option>
            <option value="line_id">Line ID</option>
          </select>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 13 }}></i>
            <input
              type="text"
              placeholder="ค้นหา..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #ddd',
                fontSize: 14, width: 220, outline: 'none'
              }}
            />
          </div>
          <button
            onClick={openCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(39,174,96,0.3)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <i className="fas fa-plus"></i> เพิ่มนายทุน
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>#</th>
              <th>ID นายทุน</th>
              <th>ชื่อ-สกุล</th>
              <th>เบอร์โทร</th>
              <th>ไลน์</th>
              <th>Email</th>
              <th>วันที่อัพเดท</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8">
                <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8 }}></i>
                  <p>กำลังโหลด...</p>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8">
                <div className="empty-state">
                  <i className="fas fa-user-slash"></i>
                  <p>ยังไม่มีข้อมูลนายทุน</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => (
              <tr key={d.id}>
                <td>{(page - 1) * PER_PAGE + i + 1}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{d.investor_code || '-'}</strong></td>
                <td>{d.full_name || '-'}</td>
                <td>{d.phone || '-'}</td>
                <td>{d.line_id || '-'}</td>
                <td>{d.email || '-'}</td>
                <td>{formatDate(d.updated_at)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate(`/investors/${d.id}/portfolio`)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #8e44ad',
                      background: '#f9f0ff', color: '#8e44ad', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}>
                      <i className="fas fa-chart-pie"></i> Portfolio
                    </button>
                    <button onClick={() => openEdit(d)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #27ae60',
                      background: '#f0fff4', color: '#27ae60', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}>
                      <i className="fas fa-edit"></i> แก้ไข
                    </button>
                    <button onClick={() => handleDelete(d)} style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #e74c3c',
                      background: '#fff0f0', color: '#e74c3c', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                    }}>
                      <i className="fas fa-trash"></i> ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination total={filtered.length} page={page} setPage={setPage} />

      {/* Modal เพิ่ม/แก้ไข */}
      <InvestorModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        onSaved={loadData}
        editData={editData}
      />

    </div>
  )
}
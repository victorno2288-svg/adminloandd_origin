import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/sales.css'
import MapPreview from '../components/MapPreview'
import { verifySlipFile } from '../utils/slipVerifier'
import SlipVerifyBadge from '../components/SlipVerifyBadge'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/accounting'
const SALES_API = '/api/admin/sales'

function toDateInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().split('T')[0]
}

// ========== Modal ดูรูปใหญ่ ==========
function ImageModal({ src, onClose }) {
  if (!src) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        style={{
          position: 'fixed', top: 16, right: 16,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', border: 'none',
          fontSize: 22, color: '#333', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 100000
        }}
        title="ปิด"
      >
        <i className="fas fa-times"></i>
      </button>
      <img
        src={src} alt="preview"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }}
      />
    </div>
  )
}

// ========== Upload + ดูรูป ==========
function SlipUpload({ label, value, onChange, fieldName = 'slip_image' }) {
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    // ★ สแกน QR สลิป (รันพร้อมกับ upload)
    setVerifying(true)
    setVerifyResult(null)
    verifySlipFile(file)
      .then(r => setVerifyResult(r ? { ...r, _file: file } : { status: 'no_qr', message: 'ไม่พบ QR', _file: file }))
      .finally(() => setVerifying(false))
    setUploading(true)
    const fd = new FormData()
    fd.append(fieldName, file)
    try {
      const res = await fetch('/api/admin/accounting/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (data.success) onChange(data.filePath)
    } catch {}
    setUploading(false)
  }

  return (
    <div>
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="file" accept="image/*,application/pdf" onChange={handleFile} disabled={uploading} style={{ fontSize: 13 }} />
        {uploading && <i className="fas fa-spinner fa-spin" style={{ color: 'var(--primary)' }}></i>}
      </div>
      {value && (
        <div style={{ marginTop: 6, position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={() => { if (confirm('ต้องการลบรูปนี้?')) onChange(null) }}
            style={{
              position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%',
              background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 11,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)', zIndex: 2, padding: 0, lineHeight: 1
            }}
            title="ลบรูป"
          >
            <i className="fas fa-times"></i>
          </button>
          <img
            src={value}
            alt="slip"
            style={{ maxWidth: 100, maxHeight: 70, borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}
            onClick={() => setPreview(value)}
            title="คลิกดูรูปใหญ่"
          />
        </div>
      )}
      <ImageModal src={preview} onClose={() => setPreview(null)} />
      {/* ★ ผลตรวจสลิป QR */}
      <SlipVerifyBadge result={verifyResult} verifying={verifying} />
    </div>
  )
}

// ========== ดูสลิปแบบอ่านอย่างเดียว (ไม่มีปุ่มลบ/อัพโหลด) ==========
function SlipViewOnly({ src }) {
  const [preview, setPreview] = useState(null)
  if (!src) return null
  const isPdf = src.toLowerCase().endsWith('.pdf')
  return (
    <div>
      {isPdf ? (
        <a
          href={src} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 7,
            background: '#ede9fe', border: '1px solid #c4b5fd',
            color: '#6d28d9', fontSize: 13, fontWeight: 600, textDecoration: 'none'
          }}
        >
          <i className="fas fa-file-pdf"></i> เปิดสลิป PDF
        </a>
      ) : (
        <img
          src={src} alt="commission slip"
          onClick={() => setPreview(src)}
          style={{
            maxWidth: 120, maxHeight: 80, borderRadius: 8,
            border: '2px solid #c4b5fd', cursor: 'zoom-in',
            boxShadow: '0 2px 8px rgba(109,40,217,0.15)'
          }}
          title="คลิกดูรูปใหญ่"
        />
      )}
      <ImageModal src={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

// ========== Radio สถานะจ่าย ==========
function PaymentRadio({ name, value, onChange, disabled = false }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 4, opacity: disabled ? 0.5 : 1 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14 }}>
        <input
          type="radio" name={name}
          checked={value === 'paid'}
          onChange={() => !disabled && onChange('paid')}
          disabled={disabled}
          style={{ accentColor: '#27ae60', width: 18, height: 18 }}
        />
        <span style={{ color: '#27ae60', fontWeight: 600 }}>ชำระแล้ว</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14 }}>
        <input
          type="radio" name={name}
          checked={value !== 'paid'}
          onChange={() => !disabled && onChange('unpaid')}
          disabled={disabled}
          style={{ accentColor: '#27ae60', width: 18, height: 18 }}
        />
        <span style={{ color: '#333' }}>ยังไม่ชำระ</span>
      </label>
    </div>
  )
}

// ========== styles ==========
const labelStyle = { display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#333' }
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc',
  fontSize: 14, boxSizing: 'border-box', outline: 'none'
}
const readOnlyStyle = { ...inputStyle, background: '#f5f5f5', color: '#666' }
const sectionTitle = (color) => ({
  fontWeight: 700, fontSize: 15, color, marginBottom: 12, paddingBottom: 6,
  borderBottom: `2px solid ${color}`
})

// ==================== MAIN PAGE ====================
export default function DebtorAccountingEditPage() {
  const { caseId: paramCaseId } = useParams()
  const navigate = useNavigate()
  const isCreate = !paramCaseId
  const slipRef = useRef(null)

  const [debtorList, setDebtorList] = useState([])   // edit mode: เคสที่มีอยู่
  const [lrList, setLrList] = useState([])           // create mode: loan_requests ทั้งหมด
  const [agentList, setAgentList] = useState([])     // create mode: นายหน้า
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [caseSlipName, setCaseSlipName] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState(paramCaseId || '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [masterStatus, setMasterStatus] = useState('unpaid')
  const [caseInfo, setCaseInfo] = useState({})
  const [form, setForm] = useState({
    debtor_status: '', property_location: '', contact_person: '', id_card_image: null,
    appraisal_amount: '', appraisal_payment_date: '', appraisal_slip: null, appraisal_status: 'unpaid',
    bag_fee_amount: '', bag_fee_payment_date: '', bag_fee_slip: null, bag_fee_status: 'unpaid',
    contract_sale_amount: '', contract_sale_payment_date: '', contract_sale_slip: null, contract_sale_status: 'unpaid',
    redemption_amount: '', redemption_payment_date: '', redemption_slip: null, redemption_status: 'unpaid',
    additional_service_amount: '', additional_service_payment_date: '', additional_service_note: '',
    property_forfeited_amount: '', property_forfeited_payment_date: '', property_forfeited_slip: null, property_forfeited_status: 'unpaid', property_forfeited_note: '',
    recorded_by: ''
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // รายชื่อ status fields ทั้งหมด
  const allStatusFields = ['appraisal_status', 'bag_fee_status', 'contract_sale_status', 'redemption_status', 'property_forfeited_status']

  // เปลี่ยนสถานะชำระทั้งหมด + อัปเดทตารางทันทีผ่าน API เดียว
  const handleMasterStatus = async (val) => {
    setMasterStatus(val)
    // เปลี่ยนทุก status fields ในฟอร์ม
    const updates = {}
    allStatusFields.forEach(f => { updates[f] = val })
    setForm(prev => ({ ...prev, ...updates }))

    // เรียก API อัปเดท cases.payment_status + debtor_accounting ทุก status พร้อมกัน
    if (selectedCaseId) {
      try {
        const res = await fetch(`${API}/debtor-master-status/${selectedCaseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ status: val })
        })
        const data = await res.json()
        if (data.success) {
          // ไม่ต้อง alert — สถานะในตารางจะเปลี่ยนทันทีเมื่อกลับไปหน้า accounting
        }
      } catch {}
    }
  }

  // ดึงรายชื่อสำหรับ dropdown
  useEffect(() => {
    if (isCreate) {
      // create mode: ดึงลูกหนี้จาก loan_requests ทั้งหมด
      fetch(`${SALES_API}/debtors`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setLrList(d.debtors || []) })
        .catch(() => {})
      // create mode: ดึงนายหน้า
      fetch(`${SALES_API}/agents`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setAgentList(d.agents || []) })
        .catch(() => {})
    } else {
      // edit mode: ดึงเคสที่มีอยู่
      fetch(`${API}/debtor-list`, { headers: { Authorization: `Bearer ${token()}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setDebtorList(d.data) })
        .catch(() => {})
    }
  }, [isCreate])

  // create mode: เมื่อเลือกลูกหนี้ → auto-fill agent ถ้ามี
  const handleDebtorSelect = (lrId) => {
    setSelectedCaseId(lrId)
    setSelectedAgentId('')
    if (!lrId) return
    fetch(`${SALES_API}/debtors/${lrId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.debtor?.agent_id) {
          setSelectedAgentId(String(d.debtor.agent_id))
        }
        if (d.success && d.debtor) {
          const loc = [d.debtor.district, d.debtor.province].filter(Boolean).join(' / ')
          if (loc) set('property_location', loc)
        }
      })
      .catch(() => {})
  }

  // โหลดข้อมูลเมื่อเลือก case (edit mode)
  useEffect(() => {
    if (isCreate || !selectedCaseId) return
    setLoading(true)
    fetch(`${API}/debtor-detail/${selectedCaseId}`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const ci = d.caseInfo || {}
          setCaseInfo(ci)
          if (d.accounting) {
            const acc = { ...d.accounting }
            // ถ้ายังไม่เคยกรอกจังหวัด ดึงจาก loan_requests มา autofill
            if (!acc.property_location && (ci.district || ci.province)) {
              acc.property_location = [ci.district, ci.province].filter(Boolean).join(' / ')
            }
            setForm(prev => ({ ...prev, ...acc }))
            // sync masterStatus ถ้าชำระครบทุกช่องแล้ว
            const allPaid = ['appraisal_status', 'bag_fee_status', 'contract_sale_status', 'redemption_status', 'property_forfeited_status']
              .every(f => acc[f] === 'paid')
            setMasterStatus(allPaid ? 'paid' : 'unpaid')
          } else {
            // ยังไม่มี record บัญชี — autofill จังหวัดจาก loan_requests
            if (ci.district || ci.province) {
              setForm(prev => ({ ...prev, property_location: [ci.district, ci.province].filter(Boolean).join(' / ') }))
            }
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedCaseId])

  // บันทึก
  const handleSave = async () => {
    if (!selectedCaseId) return alert('กรุณาเลือก ID ลูกหนี้ก่อน')
    setSaving(true)

    if (isCreate) {
      // create mode: สร้างเคสก่อน แล้วบันทึกข้อมูลบัญชี
      try {
        const fd = new FormData()
        fd.append('loan_request_id', selectedCaseId)
        if (selectedAgentId) fd.append('agent_id', selectedAgentId)
        fd.append('payment_status', masterStatus === 'paid' ? 'paid' : 'unpaid')
        if (slipRef.current?.files[0]) fd.append('slip_image', slipRef.current.files[0])

        const caseRes = await fetch(`${SALES_API}/cases`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}` },
          body: fd
        })
        const caseData = await caseRes.json()
        if (!caseData.success) {
          alert('สร้างเคสไม่สำเร็จ: ' + (caseData.message || ''))
          setSaving(false)
          return
        }

        // บันทึกข้อมูลบัญชีด้วย
        const { recorded_by, ...formData } = form
        await fetch(`${API}/debtor-detail/${caseData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify(formData)
        })

        alert(`สร้างเคส ${caseData.case_code} สำเร็จ`)
        navigate('/accounting')
      } catch { alert('เกิดข้อผิดพลาด') }
    } else {
      // edit mode: บันทึกข้อมูลบัญชีของเคสเดิม
      try {
        const { recorded_by, ...formData } = form
        const res = await fetch(`${API}/debtor-detail/${selectedCaseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify(formData)
        })
        const data = await res.json()
        if (data.success) {
          alert('บันทึกข้อมูลสำเร็จ')
          navigate('/accounting')
        } else {
          alert(data.message || 'เกิดข้อผิดพลาด')
        }
      } catch { alert('เกิดข้อผิดพลาด') }
    }

    setSaving(false)
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        {isCreate ? 'สร้างเคสใหม่' : 'เพิ่ม/แก้ไขบัญชีลูกหนี้'}
      </h2>

      <div style={{ borderTop: '3px solid var(--primary)', background: '#fff', borderRadius: 10, padding: 24 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ==================== คอลัมน์ซ้าย ==================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ID ลูกหนี้ — Dropdown */}
            <div>
              <label style={labelStyle}>ID ลูกหนี้</label>
              {isCreate ? (
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={selectedCaseId}
                  onChange={e => handleDebtorSelect(e.target.value)}
                >
                  <option value="">-- เลือก ID ลูกหนี้ --</option>
                  {lrList.map(d => (
                    <option key={d.id} value={d.id}>
                      [{d.debtor_code || `ID:${d.id}`}] {d.contact_name} — {d.contact_phone}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={selectedCaseId}
                  onChange={e => {
                    setSelectedCaseId(e.target.value)
                    setCaseInfo({})
                    setForm(prev => {
                      const reset = {}
                      Object.keys(prev).forEach(k => { reset[k] = typeof prev[k] === 'string' ? '' : null })
                      return reset
                    })
                  }}
                >
                  <option value="">-- เลือก ID ลูกหนี้ --</option>
                  {debtorList.map(d => (
                    <option key={d.case_id} value={d.case_id}>
                      {d.debtor_code} - {d.debtor_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* นายหน้า (create mode เท่านั้น) */}
            {isCreate && (
              <div>
                <label style={labelStyle}>
                  นายหน้า <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>(ไม่บังคับ)</span>
                </label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={selectedAgentId}
                  onChange={e => setSelectedAgentId(e.target.value)}
                >
                  <option value="">-- ไม่มีนายหน้า --</option>
                  {agentList.map(a => (
                    <option key={a.id} value={a.id}>
                      [{a.agent_code || `ID:${a.id}`}] {a.full_name} — {a.phone}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* สลิปการชำระ (create mode เท่านั้น) */}
            {isCreate && (
              <div>
                <label style={labelStyle}>สลิปการชำระ</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    ref={slipRef}
                    type="file" accept="image/*,application/pdf"
                    style={{ fontSize: 13 }}
                    onChange={e => setCaseSlipName(e.target.files[0]?.name || '')}
                  />
                  {caseSlipName && (
                    <button
                      type="button"
                      onClick={() => {
                        slipRef.current.value = ''
                        setCaseSlipName('')
                      }}
                      style={{
                        padding: '3px 8px', borderRadius: 6, border: '1px solid #e74c3c',
                        background: '#fff0f0', color: '#e74c3c', fontSize: 12,
                        cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                      title="ล้างไฟล์"
                    >
                      <i className="fas fa-times" style={{ marginRight: 4 }}></i>ล้าง
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ID Case (edit mode เท่านั้น) */}
            {!isCreate && (
              <div>
                <label style={labelStyle}>ID Case</label>
                <input style={readOnlyStyle} value={caseInfo.case_code || ''} readOnly />
              </div>
            )}

            {/* เบอร์โทร (edit mode เท่านั้น) */}
            {!isCreate && (
              <div>
                <label style={labelStyle}>เบอร์โทร</label>
                <input style={readOnlyStyle} value={caseInfo.debtor_phone || ''} readOnly />
              </div>
            )}

            {/* ชื่อ-นามสกุลลูกหนี้ (read-only จากฝ่ายขาย) */}
            {!isCreate && caseInfo.contact_name && (
              <div>
                <label style={labelStyle}>ชื่อ-นามสกุลลูกหนี้ <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>(จากฝ่ายขาย)</span></label>
                <input style={readOnlyStyle} value={caseInfo.contact_name || ''} readOnly />
              </div>
            )}

            {/* สถานะสมรส (read-only จากฝ่ายขาย) */}
            {!isCreate && (
              <div>
                <label style={labelStyle}>สถานะสมรส (เจ้าของทรัพย์) <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>(จากฝ่ายขาย)</span></label>
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
                  const ms = caseInfo.marital_status
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
            )}

            {/* รูปหน้าบัตรประชาชนลูกหนี้ (read-only จากฝ่ายขาย) */}
            {!isCreate && caseInfo.checklist_id_card && (
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>รูปหน้าบัตรประชาชนลูกหนี้ <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>(จากฝ่ายขาย)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(Array.isArray(caseInfo.checklist_id_card) ? caseInfo.checklist_id_card : [caseInfo.checklist_id_card]).filter(Boolean).map((img, i) => {
                    const src = img.startsWith('/') ? img : `/${img}`
                    return (
                      <a key={i} href={src} target="_blank" rel="noreferrer">
                        <img src={src} alt={`id-card-${i}`}
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '2px solid #e2e8f0' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* โลเคชั่น (read-only จากฝ่ายขาย) */}
            {!isCreate && (
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#e53935', fontSize: 13 }}></i>
                  โลเคชั่น
                  <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>(กรอกโดยฝ่ายขาย)</span>
                  <button type="button"
                    onClick={() => window.open('https://landsmaps.dol.go.th/#', '_blank')}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#0369a1,#0284c7)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-map"></i> ค้นหา landsmaps
                  </button>
                </label>
                <input type="url" value={caseInfo.location_url || ''} readOnly
                  style={{ ...readOnlyStyle, color: caseInfo.location_url ? '#111827' : '#9ca3af' }}
                  placeholder="ฝ่ายขายยังไม่ได้กรอกโลเคชั่น" />
                <MapPreview url={caseInfo.location_url} label="โลเคชั่นทรัพย์" />
              </div>
            )}

            {/* ชื่อ-สกุล (ลูกหนี้/ผู้ติดต่อสำรอง) */}
            <div>
              <label style={labelStyle}>ชื่อ-สกุล (ลูกหนี้/ผู้ติดต่อสำรอง)</label>
              <input style={inputStyle} value={form.contact_person || caseInfo.debtor_name || ''} onChange={e => set('contact_person', e.target.value)} />
            </div>

            {/* รูปหน้าบัตรเจ้าของทรัพย์ */}
            <SlipUpload label="รูปหน้าบัตรเจ้าของทรัพย์" value={form.id_card_image} onChange={v => set('id_card_image', v)} fieldName="id_card_image" />

            {/* สถานะลูกหนี้ */}
            <div>
              <label style={labelStyle}>สถานะลูกหนี้</label>
              <input style={inputStyle} value={form.debtor_status || ''} onChange={e => set('debtor_status', e.target.value)} placeholder="เช่น ทำธุรกรรมเสร็จสิ้น" />
            </div>

            {/* อำเภอ/จังหวัดที่ตั้งทรัพย์ (ดึงจาก loan_requests อัตโนมัติ) */}
            <div>
              <label style={labelStyle}>อำเภอ/จังหวัดที่ตั้งทรัพย์ <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>(ดึงอัตโนมัติ)</span></label>
              <input style={{ ...inputStyle, background: form.property_location ? '#f0fff4' : '#fff' }} value={form.property_location || ''} onChange={e => set('property_location', e.target.value)} placeholder="อำเภอ / จังหวัด" />
            </div>

            {/* ---------- สลิปจากฝ่ายต่างๆ (read-only สำหรับบัญชี) ---------- */}
            {(caseInfo?.appraisal_slip_image || caseInfo?.appraisal_fee || caseInfo?.transaction_slip || caseInfo?.advance_slip || caseInfo?.agent_id_card || caseInfo?.borrower_id_card) && (
              <div style={{ gridColumn: '1 / -1', background: '#f8f9ff', borderRadius: 10, border: '1.5px solid #c7d2fe', padding: '14px 16px', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#3730a3', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <i className="fas fa-folder-open"></i> เอกสารอ้างอิงจากฝ่ายต่างๆ
                  <span style={{ fontSize: 10, background: '#e0e7ff', color: '#3730a3', borderRadius: 10, padding: '2px 8px', fontWeight: 600 }}>อ่านอย่างเดียว</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>

                  {/* สลิปค่าประเมิน (จากฝ่ายขาย/ประเมิน) */}
                  {(caseInfo.appraisal_slip_image || caseInfo.appraisal_fee) && (
                    <div style={{ flex: '1 1 200px', padding: '10px 12px', background: '#fffde7', borderRadius: 8, border: '1.5px solid #ffe082' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#f57f17', marginBottom: 6 }}>
                        <i className="fas fa-receipt" style={{ marginRight: 5 }}></i> สลิปค่าประเมิน
                        <span style={{ fontSize: 9, background: '#fff9c4', color: '#f57f17', borderRadius: 10, padding: '1px 6px', marginLeft: 5 }}>ฝ่ายประเมิน</span>
                      </div>
                      {caseInfo.appraisal_fee && (
                        <div style={{ fontSize: 12, color: '#555', marginBottom: 5 }}>
                          ฿{Number(caseInfo.appraisal_fee).toLocaleString('th-TH')}
                        </div>
                      )}
                      {caseInfo.appraisal_slip_image ? (
                        <a href={caseInfo.appraisal_slip_image.startsWith('/') ? caseInfo.appraisal_slip_image : `/${caseInfo.appraisal_slip_image}`}
                          target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#f57f17', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                          <i className="fas fa-eye"></i> ดูสลิป
                        </a>
                      ) : <span style={{ fontSize: 11, color: '#bbb' }}>ยังไม่มีสลิป</span>}
                    </div>
                  )}

                  {/* สลิปโอนเงินค่าปากถุง (จากฝ่ายนิติ) */}
                  <div style={{ flex: '1 1 200px', padding: '10px 12px', background: '#e0f2fe', borderRadius: 8, border: '1.5px solid #7dd3fc' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#0369a1', marginBottom: 6 }}>
                      <i className="fas fa-money-bill-transfer" style={{ marginRight: 5 }}></i> สลิปโอนเงินค่าปากถุง
                      <span style={{ fontSize: 9, background: '#bae6fd', color: '#0369a1', borderRadius: 10, padding: '1px 6px', marginLeft: 5 }}>ฝ่ายนิติ</span>
                    </div>
                    {caseInfo.transaction_slip ? (
                      <a href={caseInfo.transaction_slip.startsWith('/') ? caseInfo.transaction_slip : `/${caseInfo.transaction_slip}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#0369a1', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                        <i className="fas fa-eye"></i> ดูสลิป
                      </a>
                    ) : <span style={{ fontSize: 11, color: '#bbb' }}>ยังไม่มีสลิป</span>}
                  </div>

                  {/* สลิปค่าหักล่วงหน้า (จากฝ่ายนิติ) */}
                  <div style={{ flex: '1 1 200px', padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1.5px solid #86efac' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#15803d', marginBottom: 6 }}>
                      <i className="fas fa-file-invoice-dollar" style={{ marginRight: 5 }}></i> สลิปค่าหักล่วงหน้า
                      <span style={{ fontSize: 9, background: '#bbf7d0', color: '#15803d', borderRadius: 10, padding: '1px 6px', marginLeft: 5 }}>ฝ่ายนิติ</span>
                    </div>
                    {caseInfo.advance_slip ? (
                      <a href={caseInfo.advance_slip.startsWith('/') ? caseInfo.advance_slip : `/${caseInfo.advance_slip}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#15803d', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                        <i className="fas fa-eye"></i> ดูสลิป
                      </a>
                    ) : <span style={{ fontSize: 11, color: '#bbb' }}>ยังไม่มีสลิป</span>}
                  </div>

                  {/* บัตรประชาชนลูกหนี้ (จากฝ่ายขาย checklist) */}
                  {caseInfo.borrower_id_card && (
                    <div style={{ flex: '1 1 200px', padding: '10px 12px', background: '#fdf4ff', borderRadius: 8, border: '1.5px solid #e9d5ff' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', marginBottom: 6 }}>
                        <i className="fas fa-id-card" style={{ marginRight: 5 }}></i> บัตรประชาชนลูกหนี้
                        <span style={{ fontSize: 9, background: '#ede9fe', color: '#7c3aed', borderRadius: 10, padding: '1px 6px', marginLeft: 5 }}>ฝ่ายขาย</span>
                      </div>
                      {(() => {
                        const cards = Array.isArray(caseInfo.borrower_id_card) ? caseInfo.borrower_id_card : [caseInfo.borrower_id_card]
                        return cards.filter(Boolean).map((img, i) => {
                          const src = img.startsWith('/') ? img : `/${img}`
                          return (
                            <a key={i} href={src} target="_blank" rel="noreferrer">
                              <img src={src} alt={`id-${i}`} style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 4, border: '1.5px solid #e9d5ff', marginRight: 4 }} onError={e => { e.target.style.display = 'none' }} />
                            </a>
                          )
                        })
                      })()}
                    </div>
                  )}

                  {/* บัตรประชาชนนายหน้า */}
                  {caseInfo.agent_id_card && (
                    <div style={{ flex: '1 1 200px', padding: '10px 12px', background: '#fff7ed', borderRadius: 8, border: '1.5px solid #fed7aa' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#c2410c', marginBottom: 6 }}>
                        <i className="fas fa-id-badge" style={{ marginRight: 5 }}></i> บัตรประชาชนนายหน้า
                        {caseInfo.agent_name && <span style={{ fontSize: 10, color: '#c2410c', fontWeight: 400, marginLeft: 5 }}>({caseInfo.agent_name})</span>}
                      </div>
                      <a href={caseInfo.agent_id_card.startsWith('/') ? caseInfo.agent_id_card : `/${caseInfo.agent_id_card}`}
                        target="_blank" rel="noreferrer">
                        <img src={caseInfo.agent_id_card.startsWith('/') ? caseInfo.agent_id_card : `/${caseInfo.agent_id_card}`}
                          alt="agent-id" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 4, border: '1.5px solid #fed7aa' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      </a>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ---------- ค่าประเมิน ---------- */}
            <div style={sectionTitle('#27ae60')}>ค่าประเมิน</div>
            <div>
              <label style={labelStyle}>ค่าประเมิน</label>
              <input type="number" style={inputStyle} value={form.appraisal_amount || ''} onChange={e => set('appraisal_amount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>วันที่ชำระเงินค่าประเมิน</label>
              <input type="date" style={inputStyle} value={toDateInput(form.appraisal_payment_date)} onChange={e => set('appraisal_payment_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>สถานะชำระค่าประเมิน</label>
              <PaymentRadio name="appraisal_status" value={form.appraisal_status} onChange={v => set('appraisal_status', v)} />
            </div>
            <SlipUpload label="รูปสลิปค่าประเมิน" value={form.appraisal_slip} onChange={v => set('appraisal_slip', v)} />

            {/* ---------- ค่าปากถุง ---------- */}
            <div style={sectionTitle('#2980b9')}>ค่าปากถุง</div>
            <div>
              <label style={labelStyle}>ค่าปากถุง</label>
              <input type="number" style={inputStyle} value={form.bag_fee_amount || ''} onChange={e => set('bag_fee_amount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>วันที่ชำระเงินค่าปากถุง</label>
              <input type="date" style={inputStyle} value={toDateInput(form.bag_fee_payment_date)} onChange={e => set('bag_fee_payment_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>สถานะจ่ายค่าปากถุง</label>
              <PaymentRadio name="bag_fee_status" value={form.bag_fee_status} onChange={v => set('bag_fee_status', v)} />
            </div>
            <SlipUpload label="รูปสลิปค่าปากถุง" value={form.bag_fee_slip} onChange={v => set('bag_fee_slip', v)} />

            {/* ---------- ค่าขายสัญญา ---------- */}
            <div style={sectionTitle('#f39c12')}>ค่าขายสัญญา</div>
            <div>
              <label style={labelStyle}>ค่าขายสัญญา</label>
              <input type="number" style={inputStyle} value={form.contract_sale_amount || ''} onChange={e => set('contract_sale_amount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>วันที่ชำระเงินค่าขายสัญญา</label>
              <input type="date" style={inputStyle} value={toDateInput(form.contract_sale_payment_date)} onChange={e => set('contract_sale_payment_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>สถานะจ่ายค่าขายสัญญา</label>
              <PaymentRadio name="contract_sale_status" value={form.contract_sale_status} onChange={v => set('contract_sale_status', v)} />
            </div>
            <SlipUpload label="รูปสลิปค่าขายสัญญา" value={form.contract_sale_slip} onChange={v => set('contract_sale_slip', v)} />
          </div>

          {/* ==================== คอลัมน์ขวา ==================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ---------- ค่าไถ่ถอน ---------- */}
            <div style={sectionTitle('#e74c3c')}>ค่าไถ่ถอน</div>
            <div>
              <label style={labelStyle}>ค่าไถ่ถอน</label>
              <input type="number" style={inputStyle} value={form.redemption_amount || ''} onChange={e => set('redemption_amount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>วันที่ชำระเงินค่าไถ่ถอน</label>
              <input type="date" style={inputStyle} value={toDateInput(form.redemption_payment_date)} onChange={e => set('redemption_payment_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>สถานะจ่ายค่าไถ่ถอน</label>
              <PaymentRadio name="redemption_status" value={form.redemption_status} onChange={v => set('redemption_status', v)} />
            </div>
            <SlipUpload label="รูปสลิปค่าไถ่ถอน" value={form.redemption_slip} onChange={v => set('redemption_slip', v)} />

            {/* ---------- ค่าบริการเพิ่มเติม ---------- */}
            <div style={sectionTitle('#8e44ad')}>ค่าบริการเพิ่มเติม</div>
            <div>
              <label style={labelStyle}>ค่าบริการเพิ่มเติม</label>
              <input type="number" style={inputStyle} value={form.additional_service_amount || ''} onChange={e => set('additional_service_amount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>หมายเหตุ: ค่าบริการเพิ่มเติม</label>
              <input style={inputStyle} value={form.additional_service_note || ''} onChange={e => set('additional_service_note', e.target.value)} placeholder="หมายเหตุ" />
            </div>
            <div>
              <label style={labelStyle}>วันที่ชำระเงินค่าบริการเพิ่มเติม</label>
              <input type="date" style={inputStyle} value={toDateInput(form.additional_service_payment_date)} onChange={e => set('additional_service_payment_date', e.target.value)} />
            </div>

            {/* ---------- ทรัพย์หลุด ---------- */}
            <div style={sectionTitle('#e67e22')}>ทรัพย์หลุด</div>
            <div>
              <label style={labelStyle}>ทรัพย์หลุด</label>
              <input type="number" style={inputStyle} value={form.property_forfeited_amount || ''} onChange={e => set('property_forfeited_amount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>วันที่ชำระเงินทรัพย์หลุด</label>
              <input type="date" style={inputStyle} value={toDateInput(form.property_forfeited_payment_date)} onChange={e => set('property_forfeited_payment_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>สถานะจ่ายทรัพย์หลุด</label>
              <PaymentRadio name="property_forfeited_status" value={form.property_forfeited_status} onChange={v => set('property_forfeited_status', v)} />
            </div>
            <SlipUpload label="รูปสลิปทรัพย์หลุด" value={form.property_forfeited_slip} onChange={v => set('property_forfeited_slip', v)} />
            <div>
              <label style={labelStyle}>หมายเหตุ: ทรัพย์หลุด</label>
              <input style={inputStyle} value={form.property_forfeited_note || ''} onChange={e => set('property_forfeited_note', e.target.value)} placeholder="หมายเหตุ" />
            </div>

            {/* ---------- สลิปค่าดำเนินการ (จากฝ่ายออก) ---------- */}
            {caseInfo.issuing_commission_slip && (
              <>
                <div style={{ ...sectionTitle('#7c3aed'), marginTop: 16 }}>
                  <i className="fas fa-receipt" style={{ marginRight: 6 }}></i>
                  สลิปค่าดำเนินการ (เก็บจากลูกหนี้ ณ กรมที่ดิน)
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: '#f5f3ff', border: '1.5px solid #c4b5fd'
                }}>
                  <p style={{ fontSize: 12, color: '#7c3aed', marginBottom: 10 }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>
                    อัพโหลดโดยฝ่ายออก — ดูเพื่อตรวจสอบเท่านั้น
                  </p>
                  <SlipViewOnly src={caseInfo.issuing_commission_slip} />
                </div>
              </>
            )}
            {!caseInfo.issuing_commission_slip && selectedCaseId && !loading && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginTop: 4,
                background: '#fafafa', border: '1px dashed #c4b5fd', fontSize: 12, color: '#a78bfa'
              }}>
                <i className="fas fa-receipt" style={{ marginRight: 5 }}></i>
                ยังไม่มีสลิปค่าดำเนินการจากกรมที่ดิน (ฝ่ายออกยังไม่ได้อัพโหลด)
              </div>
            )}

            {/* ---------- ผู้บันทึก ---------- */}
            {form.recorded_by && (
              <div style={{ ...sectionTitle('#95a5a6'), marginTop: 16 }}>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-user-check" style={{ color: '#22c55e' }}></i>
                  บันทึกโดย: <strong style={{ color: '#333' }}>{form.recorded_by}</strong>
                  {form.updated_at && <span style={{ color: '#aaa' }}>· {new Date(form.updated_at).toLocaleString('th-TH')}</span>}
                </div>
              </div>
            )}

            {/* ---------- สถานะชำระทั้งหมด ---------- */}
            <div style={{
              ...sectionTitle('#27ae60'), marginTop: 20,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <i className="fas fa-check-double"></i> สถานะชำระทั้งหมด
            </div>
            <div style={{
              padding: '14px 18px', borderRadius: 10,
              background: masterStatus === 'paid' ? '#f0fff4' : '#fff8f0',
              border: masterStatus === 'paid' ? '2px solid #27ae60' : '2px solid #e0e0e0',
              transition: 'all 0.2s'
            }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15 }}>
                  <input
                    type="radio" name="master_status"
                    checked={masterStatus === 'paid'}
                    onChange={() => handleMasterStatus('paid')}
                    style={{ accentColor: '#27ae60', width: 20, height: 20 }}
                  />
                  <span style={{ color: '#27ae60', fontWeight: 700 }}>
                    <i className="fas fa-check-circle" style={{ marginRight: 4 }}></i> ชำระแล้ว
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15 }}>
                  <input
                    type="radio" name="master_status"
                    checked={masterStatus !== 'paid'}
                    onChange={() => handleMasterStatus('unpaid')}
                    style={{ accentColor: '#e74c3c', width: 20, height: 20 }}
                  />
                  <span style={{ color: '#e74c3c', fontWeight: 700 }}>
                    <i className="fas fa-times-circle" style={{ marginRight: 4 }}></i> ยังไม่ชำระ
                  </span>
                </label>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888' }}>
                {masterStatus === 'paid'
                  ? 'สถานะชำระทุกรายการถูกตั้งเป็น "ชำระแล้ว" และอัปเดทในตารางแล้ว'
                  : 'เลือก "ชำระแล้ว" เพื่อเปลี่ยนสถานะทุกรายการและอัปเดทในตารางทันที'}
              </p>
            </div>

            {/* ---------- ปุ่ม ---------- */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={handleSave}
                disabled={saving || !selectedCaseId}
                style={{
                  padding: '10px 28px', borderRadius: 8, border: 'none',
                  background: 'var(--primary)', color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: (saving || !selectedCaseId) ? 'not-allowed' : 'pointer',
                  opacity: (saving || !selectedCaseId) ? 0.6 : 1
                }}
              >
                <i className={`fas ${saving ? 'fa-spinner fa-spin' : isCreate ? 'fa-plus-circle' : 'fa-save'}`} style={{ marginRight: 6 }}></i>
                {saving ? 'กำลังบันทึก...' : isCreate ? 'สร้างเคส' : 'บันทึกข้อมูล'}
              </button>
              <button
                onClick={() => navigate('/accounting')}
                style={{
                  padding: '10px 28px', borderRadius: 8, border: '1px solid #ddd',
                  background: '#666', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer'
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
            <p style={{ marginTop: 8 }}>กำลังโหลด...</p>
          </div>
        </div>
      )}
    </div>
  )
}

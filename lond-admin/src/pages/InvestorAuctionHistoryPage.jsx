import { useState, useEffect } from 'react'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/investor-history'

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMoney(n) {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0 })
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

// ========== Modal เพิ่ม/แก้ไขรายการประมูล ==========
function AuctionModal({ isOpen, onClose, onSaved, editData, investors, cases }) {
  const isEdit = !!editData
  const [form, setForm] = useState({
    investor_id: '', case_id: '', case_location: '', auction_date: '', winning_price: '', note: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        // สร้าง location string
        let loc = ''
        if (editData.district || editData.province) {
          const parts = []
          if (editData.district) parts.push(editData.district)
          if (editData.province) parts.push(editData.province)
          loc = parts.join(', ')
        }
        setForm({
          investor_id: editData.investor_id || '',
          case_id: editData.case_id || '',
          case_location: loc,
          auction_date: editData.auction_date ? editData.auction_date.substring(0, 10) : '',
          winning_price: editData.winning_price || '',
          note: editData.note || ''
        })
      } else {
        setForm({ investor_id: '', case_id: '', case_location: '', auction_date: '', winning_price: '', note: '' })
      }
    }
  }, [isOpen, editData])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  // เมื่อเลือกเคส → auto-fill ที่ตั้งทรัพย์
  const handleCaseChange = (caseId) => {
    setForm(prev => ({ ...prev, case_id: caseId }))
    if (!caseId) {
      setForm(prev => ({ ...prev, case_location: '' }))
      return
    }
    const selected = cases.find(c => String(c.id) === String(caseId))
    if (selected) {
      let loc = ''
      if (selected.district || selected.province) {
        const parts = []
        if (selected.district) parts.push(selected.district)
        if (selected.province) parts.push(selected.province)
        loc = parts.join(', ')
      }
      setForm(prev => ({ ...prev, case_location: loc }))
    }
  }

  const handleSave = async () => {
    if (!form.investor_id) return alert('กรุณาเลือกนายทุน')
    setSaving(true)
    try {
      const url = isEdit ? `${API}/auction/${editData.id}` : `${API}/auction`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          investor_id: form.investor_id,
          case_id: form.case_id || null,
          auction_date: form.auction_date || null,
          winning_price: form.winning_price || null,
          note: form.note || null
        })
      })
      const r = await res.json()
      if (r.success) { onSaved(); onClose() }
      else alert(r.message || 'เกิดข้อผิดพลาด')
    } catch { alert('เกิดข้อผิดพลาด') }
    finally { setSaving(false) }
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
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }}></div>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9999, background: '#fff', borderRadius: 12,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        <div style={{
          background: 'var(--primary)', color: '#fff', padding: '16px 24px',
          borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isEdit ? 'แก้ไขรายการประมูล' : 'เพิ่มรายการประมูล'}
          </h3>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: '50%', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* เลือกนายทุน (dropdown) */}
          <div>
            <label style={labelStyle}>นายทุน</label>
            <select style={inputStyle} value={form.investor_id} onChange={e => handleChange('investor_id', e.target.value)}>
              <option value="">-- เลือกนายทุน --</option>
              {investors.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.investor_code} - {inv.full_name}</option>
              ))}
            </select>
          </div>

          {/* เลือกเคส (dropdown) → auto-fill ที่ตั้ง */}
          <div>
            <label style={labelStyle}>ID เคสที่ประมูลได้</label>
            <select style={inputStyle} value={form.case_id} onChange={e => handleCaseChange(e.target.value)}>
              <option value="">-- เลือกเคส --</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.case_code}{c.district || c.province ? ` - ${[c.district, c.province].filter(Boolean).join(', ')}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ที่ตั้งทรัพย์ (auto-fill, readonly) */}
          <div>
            <label style={labelStyle}>ชื่ออำเภอ/จังหวัดที่ตั้งทรัพย์</label>
            <input style={readonlyStyle} value={form.case_location} readOnly placeholder="เลือกเคสด้านบนเพื่อกรอกอัตโนมัติ" />
          </div>

          {/* วันที่ประมูล + ราคา */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>วันที่ประมูลได้</label>
              <input style={inputStyle} type="date" value={form.auction_date} onChange={e => handleChange('auction_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>ราคาที่ชนะ</label>
              <input style={inputStyle} type="number" value={form.winning_price} onChange={e => handleChange('winning_price', e.target.value)} placeholder="0"
                onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
            </div>
          </div>

          {/* หมายเหตุ */}
          <div>
            <label style={labelStyle}>หมายเหตุ</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.note} onChange={e => handleChange('note', e.target.value)} placeholder="หมายเหตุ (ถ้ามี)"
              onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = '#ddd'} />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{
            padding: '10px 24px', borderRadius: 8, border: '1px solid #ddd',
            background: '#fff', color: '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
          }}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </div>
    </>
  )
}

// ========== Modal อัพโหลดสลิปโอนเงิน ==========
function TransferSlipModal({ item, onClose, onSaved }) {
  const [slipFile, setSlipFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      const fd = new FormData()
      if (slipFile) fd.append('transfer_slip', slipFile)
      const res = await fetch(`${API}/auction/${item.id}/transfer-slip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const d = await res.json()
      if (d.success) { setMsg('บันทึกสำเร็จ ✓'); setTimeout(() => { onSaved(); onClose() }, 600) }
      else setMsg(d.message || 'เกิดข้อผิดพลาด')
    } catch { setMsg('เกิดข้อผิดพลาด') }
    setSaving(false)
  }

  const handleDeleteSlip = async () => {
    if (!confirm('ยืนยันลบสลิปโอนเงิน?')) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/auction/${item.id}/transfer-slip`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
      })
      const d = await res.json()
      if (d.success) { onSaved(); onClose() }
      else setMsg(d.message || 'ลบไม่สำเร็จ')
    } catch { setMsg('เกิดข้อผิดพลาด') }
    setDeleting(false)
  }

  const isTransferred = item.transfer_status === 'transferred'

  return (
    <>
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <button onClick={e => { e.stopPropagation(); setPreview(null) }}
            style={{ position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', fontSize: 20, cursor: 'pointer', zIndex: 100001 }}>✕</button>
          {/\.pdf$/i.test(preview)
            ? <iframe src={preview} title="preview" style={{ width: '85vw', height: '90vh', border: 'none', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
            : <img src={preview} alt="slip" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }} />
          }
        </div>
      )}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 9999, background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440,
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ background: isTransferred ? 'linear-gradient(135deg,#1b5e20,#2e7d32)' : 'linear-gradient(135deg,#e65100,#f57c00)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
              <i className={`fas ${isTransferred ? 'fa-check-circle' : 'fa-money-bill-wave'}`} style={{ marginRight: 7 }}></i>
              {isTransferred ? 'โอนเงินแล้ว' : 'บันทึกการโอนเงิน'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              {item.investor_name} · เคส {item.case_code || '-'} · {formatMoney(item.winning_price)} บาท
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', fontSize: 15, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status badge */}
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: isTransferred ? '#f0fdf4' : '#fffbeb',
            border: `1.5px solid ${isTransferred ? '#86efac' : '#fde68a'}`,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: isTransferred ? '#16a34a' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`fas ${isTransferred ? 'fa-check' : 'fa-clock'}`} style={{ color: '#fff', fontSize: 14 }}></i>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: isTransferred ? '#15803d' : '#92400e' }}>
                {isTransferred ? 'โอนเงินแล้ว' : 'รอโอนเงิน'}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {isTransferred ? 'บันทึกการโอนเงินเรียบร้อย' : 'อัพโหลดสลิปเพื่อยืนยันการโอน'}
              </div>
            </div>
          </div>

          {/* สลิปปัจจุบัน */}
          {item.transfer_slip && (
            <div style={{ background: '#e0f2f1', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-file-image" style={{ color: '#00695c', fontSize: 16 }}></i>
              <span style={{ fontSize: 12, color: '#004d40', flex: 1, wordBreak: 'break-all' }}>
                {item.transfer_slip.split('/').pop()}
              </span>
              <button onClick={() => setPreview(item.transfer_slip)}
                style={{ padding: '4px 10px', background: '#00695c', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                <i className="fas fa-eye"></i> ดู
              </button>
              <button onClick={handleDeleteSlip} disabled={deleting}
                style={{ padding: '4px 10px', background: '#fff0f0', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                <i className="fas fa-trash"></i>
              </button>
            </div>
          )}

          {/* อัพโหลดสลิปใหม่ */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
              <i className="fas fa-upload" style={{ marginRight: 5, color: '#2e7d32' }}></i>
              {item.transfer_slip ? 'เปลี่ยนสลิป (ถ้าต้องการ)' : 'อัพโหลดสลิปโอนเงิน'}
            </div>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf"
              onChange={e => { setSlipFile(e.target.files[0] || null); setMsg('') }}
              style={{ fontSize: 13, width: '100%' }} />
            {slipFile && <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>เลือก: {slipFile.name}</div>}
          </div>

          {msg && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: msg.includes('สำเร็จ') ? '#f0fdf4' : '#fef2f2', fontSize: 12, fontWeight: 600, color: msg.includes('สำเร็จ') ? '#16a34a' : '#dc2626', border: `1px solid ${msg.includes('สำเร็จ') ? '#86efac' : '#fca5a5'}` }}>
              {msg}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ปิด
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: saving ? '#94a3b8' : '#2e7d32', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-check"></i> ยืนยันโอนแล้ว</>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ==================== MAIN PAGE ====================
export default function InvestorAuctionHistoryPage() {
  const [data, setData] = useState([])
  const [investors, setInvestors] = useState([])
  const [cases, setCases] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [transferTarget, setTransferTarget] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetch(`${API}/auction`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadInvestors = () => {
    fetch(`${API}/investor-list`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setInvestors(d.data) })
      .catch(() => {})
  }

  const loadCases = () => {
    fetch(`${API}/cases`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setCases(d.data) })
      .catch(() => {})
  }

  useEffect(() => { loadData(); loadInvestors(); loadCases() }, [])

  // สร้างข้อความที่ตั้งทรัพย์
  const getLocation = (d) => {
    const parts = []
    if (d.district) parts.push(d.district)
    if (d.province) parts.push(d.province)
    if (parts.length > 0) return parts.join(', ')
    return '-'
  }

  const filtered = data.filter(d =>
    !search ||
    d.investor_code?.toLowerCase().includes(search.toLowerCase()) ||
    d.investor_name?.includes(search) ||
    d.case_code?.toLowerCase().includes(search.toLowerCase()) ||
    d.district?.includes(search) ||
    d.province?.includes(search)
  )
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  useEffect(() => { setPage(1) }, [search])

  const openCreate = () => { setEditData(null); setModalOpen(true) }
  const openEdit = (item) => { setEditData(item); setModalOpen(true) }

  const handleDelete = async (item) => {
    if (!confirm('ยืนยันลบรายการนี้?')) return
    const res = await fetch(`${API}/auction/${item.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
    })
    const d = await res.json()
    if (d.success) loadData()
    else alert(d.message || 'ลบไม่สำเร็จ')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>History การประมูลนายทุน</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>แสดงทั้งหมด</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontSize: 13 }}></i>
            <input type="text" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: 220, outline: 'none' }} />
          </div>
          <button onClick={openCreate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(39,174,96,0.3)', whiteSpace: 'nowrap'
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <i className="fas fa-plus"></i> เพิ่มรายการ
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ID นายทุน</th>
              <th>ชื่อ-สกุล</th>
              <th>ID เคสที่ประมูลได้</th>
              <th>ชื่ออำเภอ/จังหวัดที่ตั้งทรัพย์</th>
              <th>วันที่ประมูลได้</th>
              <th>ราคาที่ชนะ</th>
              <th style={{ textAlign: 'center' }}>สถานะโอนเงิน</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9">
                <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8 }}></i>
                  <p>กำลังโหลด...</p>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="9">
                <div className="empty-state">
                  <i className="fas fa-gavel"></i>
                  <p>ยังไม่มีรายการประมูล</p>
                </div>
              </td></tr>
            ) : paged.map((d, i) => {
              const isTransferred = d.transfer_status === 'transferred'
              return (
                <tr key={d.id}>
                  <td>{(page - 1) * PER_PAGE + i + 1}</td>
                  <td><strong style={{ color: 'var(--primary)' }}>{d.investor_code || '-'}</strong></td>
                  <td>{d.investor_name || '-'}</td>
                  <td><strong>{d.case_code || '-'}</strong></td>
                  <td>{getLocation(d)}</td>
                  <td>{formatDate(d.auction_date)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(d.winning_price)}</td>
                  {/* คอลัมน์สถานะโอนเงิน */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => setTransferTarget(d)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 11px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          background: isTransferred ? '#dcfce7' : '#fef3c7',
                          color: isTransferred ? '#16a34a' : '#d97706',
                        }}>
                        <i className={`fas ${isTransferred ? 'fa-check-circle' : 'fa-clock'}`}></i>
                        {isTransferred ? 'โอนแล้ว' : 'รอโอน'}
                      </button>
                      {d.transfer_slip && (
                        <button onClick={() => setTransferTarget(d)}
                          style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid #2e7d32', background: '#f0fff4', color: '#2e7d32', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
                          <i className="fas fa-receipt"></i> ดูสลิป
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
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
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination total={filtered.length} page={page} setPage={setPage} />

      <AuctionModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        onSaved={loadData}
        editData={editData}
        investors={investors}
        cases={cases}
      />

      {transferTarget && (
        <TransferSlipModal
          item={transferTarget}
          onClose={() => setTransferTarget(null)}
          onSaved={() => { loadData(); setTransferTarget(null) }}
        />
      )}
    </div>
  )
}
import { useState, useEffect, useRef } from 'react'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales-management'

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toDateInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().split('T')[0]
}

const BANKS = [
  'ธนาคารกสิกรไทย (KBank)', 'ธนาคารไทยพาณิชย์ (SCB)', 'ธนาคารกรุงเทพ (BBL)',
  'ธนาคารกรุงไทย (KTB)', 'ธนาคารกรุงศรีอยุธยา (BAY)', 'ธนาคารออมสิน',
  'ธนาคารทหารไทยธนชาต (TTB)', 'ธนาคารเกียรตินาคินภัทร (KKP)',
  'ธนาคารซีไอเอ็มบีไทย (CIMB)', 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH)', 'อื่นๆ'
]

// ==================== Agent Modal ====================
function AgentModal({ show, onClose, onSave, editData }) {
  const emptyForm = {
    full_name: '', nickname: '', phone: '', email: '', line_id: '', facebook: '',
    national_id: '', commission_rate: '', status: 'active',
    bank_name: '', bank_account_number: '', bank_account_name: '',
    area: '', contract_date: '',
  }

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const idCardRef = useRef(null)
  const contractRef = useRef(null)
  const [idCardName, setIdCardName] = useState('')
  const [contractName, setContractName] = useState('')

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    if (editData) {
      setForm({
        full_name: editData.full_name || '',
        nickname: editData.nickname || '',
        phone: editData.phone || '',
        email: editData.email || '',
        line_id: editData.line_id || '',
        facebook: editData.facebook || '',
        national_id: editData.national_id || '',
        commission_rate: editData.commission_rate ?? '',
        status: editData.status || 'active',
        bank_name: editData.bank_name || '',
        bank_account_number: editData.bank_account_number || '',
        bank_account_name: editData.bank_account_name || '',
        area: editData.area || '',
        contract_date: toDateInput(editData.contract_date),
      })
    } else {
      setForm(emptyForm)
    }
    setIdCardName('')
    setContractName('')
  }, [editData, show])

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return alert('กรุณากรอกชื่อ-สกุล')
    setSaving(true)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) fd.append(k, v)
    })
    if (idCardRef.current?.files[0])    fd.append('agent_id_card_image', idCardRef.current.files[0])
    if (contractRef.current?.files[0])  fd.append('agent_contract_file', contractRef.current.files[0])

    await onSave(fd)
    setSaving(false)
  }

  if (!show) return null

  const SectionHeader = ({ icon, label, color = 'var(--primary)' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 12px', paddingBottom: 8, borderBottom: `2px solid ${color}20` }}>
      <i className={`fas ${icon}`} style={{ color, fontSize: 14 }}></i>
      <span style={{ fontWeight: 700, fontSize: 13, color }}>{label}</span>
    </div>
  )

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 14, padding: 0, zIndex: 9999,
        width: '94%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 12px 40px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', background: 'var(--primary)', color: '#fff', borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-handshake"></i>
            {editData ? `แก้ไขนายหน้า — ${editData.agent_code}` : 'เพิ่มนายหน้าใหม่'}
          </h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>&times;</span>
        </div>

        <div style={{ padding: 24 }}>
          {/* รหัส (edit mode) */}
          {editData && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: '#e8f5e9', border: '1.5px solid #a5d6a7', marginBottom: 4 }}>
              <i className="fas fa-id-badge" style={{ color: 'var(--primary)', fontSize: 14 }}></i>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>{editData.agent_code}</span>
            </div>
          )}

          {/* ── ข้อมูลพื้นฐาน ── */}
          <SectionHeader icon="fa-user" label="ข้อมูลพื้นฐาน" color="var(--primary)" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>ชื่อ-สกุล <span style={{ color: 'red' }}>*</span></label>
              <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="ชื่อ-สกุลนายหน้า" />
            </div>
            <div className="form-group">
              <label>ชื่อเล่น</label>
              <input type="text" value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="ชื่อเล่น (ถ้ามี)" />
            </div>
            <div className="form-group">
              <label>เลขบัตรประชาชน</label>
              <input type="text" value={form.national_id} onChange={e => set('national_id', e.target.value)} placeholder="x-xxxx-xxxxx-xx-x" maxLength={17} />
            </div>
          </div>

          {/* ── ช่องทางติดต่อ ── */}
          <SectionHeader icon="fa-address-book" label="ช่องทางติดต่อ" color="#1565c0" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label><i className="fas fa-phone" style={{ marginRight: 5, color: '#1565c0' }}></i>เบอร์โทร</label>
              <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0xx-xxx-xxxx" />
            </div>
            <div className="form-group">
              <label><i className="fas fa-envelope" style={{ marginRight: 5, color: '#1565c0' }}></i>อีเมล</label>
              <input type="text" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label><i className="fab fa-line" style={{ marginRight: 5, color: '#06c755' }}></i>Line ID</label>
              <input type="text" value={form.line_id} onChange={e => set('line_id', e.target.value)} placeholder="Line ID" />
            </div>
            <div className="form-group">
              <label><i className="fab fa-facebook" style={{ marginRight: 5, color: '#1877f2' }}></i>Facebook</label>
              <input type="text" value={form.facebook} onChange={e => set('facebook', e.target.value)} placeholder="ชื่อ Facebook" />
            </div>
          </div>

          {/* ── ค่าคอม + สถานะ ── */}
          <SectionHeader icon="fa-percent" label="ค่าคอม & สถานะ" color="#e67e22" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label>ค่าคอมมิชชั่น (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.commission_rate}
                onChange={e => set('commission_rate', e.target.value)} placeholder="เช่น 2.5" />
            </div>
            <div className="form-group">
              <label>สถานะ</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, width: '100%',
                  color: form.status === 'active' ? '#2e7d32' : '#c62828',
                  background: form.status === 'active' ? '#e8f5e9' : '#ffebee',
                  fontWeight: 600 }}>
                <option value="active">✓ ใช้งาน</option>
                <option value="inactive">✗ ไม่ใช้งาน</option>
              </select>
            </div>
          </div>

          {/* ── ข้อมูลธนาคาร ── */}
          <SectionHeader icon="fa-university" label="ข้อมูลธนาคาร (สำหรับโอนค่าคอม)" color="#6a1b9a" />

          <div style={{ padding: '14px 16px', background: '#f8f4ff', borderRadius: 10, border: '1.5px solid #ce93d8' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label>ธนาคาร</label>
                <select value={form.bank_name} onChange={e => set('bank_name', e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #ce93d8', fontSize: 13, width: '100%', background: '#fff' }}>
                  <option value="">-- เลือกธนาคาร --</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>เลขบัญชี</label>
                <input type="text" value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)}
                  placeholder="xxx-x-xxxxx-x" style={{ border: '1px solid #ce93d8' }} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>ชื่อบัญชี</label>
                <input type="text" value={form.bank_account_name} onChange={e => set('bank_account_name', e.target.value)}
                  placeholder="ชื่อ-สกุล เจ้าของบัญชี" style={{ border: '1px solid #ce93d8' }} />
              </div>
            </div>
          </div>

          {/* ── เอกสาร ── */}
          <SectionHeader icon="fa-file-contract" label="เอกสาร" color="#c62828" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* บัตรประชาชน */}
            <div style={{ padding: '12px 14px', background: '#fafafa', borderRadius: 10, border: '1.5px solid #e0e0e0' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-id-card" style={{ color: '#c62828' }}></i> สำเนาบัตรประชาชน
              </div>
              {editData?.id_card_image && !idCardName && (
                <div style={{ marginBottom: 8 }}>
                  <a href={`/${editData.id_card_image}`} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--primary)', textDecoration: 'none', background: '#e8f5e9', padding: '4px 10px', borderRadius: 6 }}>
                    <i className="fas fa-eye"></i> ดูไฟล์เดิม
                  </a>
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                border: '1.5px dashed #c62828', color: '#c62828', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fff' }}>
                <i className="fas fa-upload"></i>
                {idCardName ? idCardName.slice(0, 20) + (idCardName.length > 20 ? '…' : '') : 'อัพโหลดไฟล์'}
                <input type="file" accept="image/*,.pdf" ref={idCardRef}
                  onChange={e => setIdCardName(e.target.files[0]?.name || '')} style={{ display: 'none' }} />
              </label>
              {idCardName && (
                <button type="button" onClick={() => { idCardRef.current.value = ''; setIdCardName('') }}
                  style={{ marginLeft: 6, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                  ✕
                </button>
              )}
            </div>

            {/* สัญญาแต่งตั้งนายหน้า */}
            <div style={{ padding: '12px 14px', background: '#fafafa', borderRadius: 10, border: '1.5px solid #e0e0e0' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-file-signature" style={{ color: '#1565c0' }}></i> สัญญาแต่งตั้งนายหน้า
              </div>
              {editData?.contract_file && !contractName && (
                <div style={{ marginBottom: 8 }}>
                  <a href={`/${editData.contract_file}`} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1565c0', textDecoration: 'none', background: '#e3f2fd', padding: '4px 10px', borderRadius: 6 }}>
                    <i className="fas fa-eye"></i> ดูสัญญาเดิม
                  </a>
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                border: '1.5px dashed #1565c0', color: '#1565c0', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fff' }}>
                <i className="fas fa-upload"></i>
                {contractName ? contractName.slice(0, 20) + (contractName.length > 20 ? '…' : '') : 'อัพโหลดไฟล์'}
                <input type="file" accept="image/*,.pdf" ref={contractRef}
                  onChange={e => setContractName(e.target.files[0]?.name || '')} style={{ display: 'none' }} />
              </label>
              {contractName && (
                <button type="button" onClick={() => { contractRef.current.value = ''; setContractName('') }}
                  style={{ marginLeft: 6, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                  ✕
                </button>
              )}
              <div className="form-group" style={{ marginTop: 10 }}>
                <label style={{ fontSize: 12, color: '#888' }}>วันที่ลงนามสัญญา</label>
                <input type="date" value={form.contract_date} onChange={e => set('contract_date', e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #90caf9', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28, paddingTop: 16, borderTop: '1px solid #eee' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              ยกเลิก
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึก</>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ==================== MAIN PAGE ====================
export default function AgentsManagePage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetch(`${API}/agents`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleCreate = () => { setEditData(null); setShowForm(true) }
  const handleEdit = (agent) => { setEditData(agent); setShowForm(true) }

  // รับ FormData แทน JSON object
  const handleSave = async (formData) => {
    const url = editData ? `${API}/agents/${editData.id}` : `${API}/agents`
    const method = editData ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token()}` }, // ไม่ต้อง Content-Type — browser จะ set boundary ให้เอง
      body: formData
    })
    const d = await res.json()
    if (d.success) {
      setShowForm(false)
      loadData()
    } else {
      alert(d.message || 'เกิดข้อผิดพลาด')
    }
  }

  const handleDelete = async (agentId) => {
    if (!confirm('ยืนยันลบนายหน้าคนนี้?')) return
    const res = await fetch(`${API}/agents/${agentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    const d = await res.json()
    if (d.success) loadData()
  }

  const statusBadge = (status) => {
    const map = {
      active:   { label: 'ใช้งาน',     bg: '#e6f9ee', color: '#27ae60' },
      inactive: { label: 'ไม่ใช้งาน', bg: '#fff0f0', color: '#e74c3c' }
    }
    const s = map[status] || { label: status, bg: '#f5f5f5', color: '#999' }
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#333' }}>
            <i className="fas fa-handshake" style={{ marginRight: 10, color: 'var(--primary)' }}></i>
            จัดการนายหน้า
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>ทั้งหมด {data.length} คน</p>
        </div>
        <button onClick={handleCreate} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          <i className="fas fa-plus"></i> เพิ่มนายหน้า
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table-green" style={{ width: '100%', minWidth: 900 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>รหัส</th>
              <th>ชื่อ-สกุล</th>
              <th>เบอร์โทร</th>
              <th>Line / Email</th>
              <th>พื้นที่</th>
              <th>ค่าคอม%</th>
              <th>ธนาคาร</th>
              <th>สัญญา</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="11"><div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i><p>กำลังโหลด...</p></div></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="11"><div className="empty-state"><i className="fas fa-inbox"></i><p>ยังไม่มีนายหน้า</p></div></td></tr>
            ) : data.map((d, i) => (
              <tr key={d.id}>
                <td style={{ color: '#aaa', fontSize: 12 }}>{i + 1}</td>
                <td><strong style={{ color: 'var(--primary)' }}>{d.agent_code}</strong></td>
                <td>
                  <div style={{ fontWeight: 600 }}>{d.full_name}</div>
                  {d.nickname && <div style={{ fontSize: 11, color: '#aaa' }}>{d.nickname}</div>}
                </td>
                <td>{d.phone || '-'}</td>
                <td>
                  {d.line_id && <div style={{ fontSize: 12 }}><i className="fab fa-line" style={{ color: '#06c755', marginRight: 3 }}></i>{d.line_id}</div>}
                  {d.email && <div style={{ fontSize: 12, color: '#888' }}>{d.email}</div>}
                  {!d.line_id && !d.email && '-'}
                </td>
                <td>
                  {d.area
                    ? <span style={{ fontSize: 12, color: '#e67e22' }}><i className="fas fa-map-marker-alt" style={{ marginRight: 3 }}></i>{d.area}</span>
                    : <span style={{ color: '#ccc' }}>-</span>}
                </td>
                <td>
                  {d.commission_rate != null
                    ? <span style={{ fontWeight: 700, color: '#6a1b9a' }}>{d.commission_rate}%</span>
                    : '-'}
                </td>
                <td>
                  {d.bank_name ? (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6a1b9a' }}>{d.bank_name.replace(/ \(.*\)/, '')}</div>
                      {d.bank_account_number && <div style={{ fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{d.bank_account_number}</div>}
                    </div>
                  ) : <span style={{ color: '#ccc' }}>-</span>}
                </td>
                <td>
                  {d.contract_file ? (
                    <a href={`/${d.contract_file}`} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#1565c0', background: '#e3f2fd', padding: '3px 8px', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
                      <i className="fas fa-file-contract"></i>
                      {d.contract_date ? formatDate(d.contract_date) : 'ดูสัญญา'}
                    </a>
                  ) : <span style={{ color: '#ccc' }}>-</span>}
                </td>
                <td>{statusBadge(d.status)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button onClick={() => handleEdit(d)}
                      style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #f39c12', background: '#fffbe6', color: '#f39c12', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <i className="fas fa-edit"></i> แก้ไข
                    </button>
                    <button onClick={() => handleDelete(d.id)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e74c3c', background: '#fff0f0', color: '#e74c3c', fontSize: 12, cursor: 'pointer' }}>
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AgentModal show={showForm} onClose={() => setShowForm(false)} onSave={handleSave} editData={editData} />
    </div>
  )
}

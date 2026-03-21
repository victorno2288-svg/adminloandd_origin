import { useState, useEffect, useCallback } from 'react'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/chat'

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function BlacklistPage() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [addPhone, setAddPhone] = useState('')
  const [addReason, setAddReason] = useState('')
  const [adding, setAdding]     = useState(false)
  const [removingPhone, setRemovingPhone] = useState(null)
  const [msg, setMsg]           = useState(null) // { type: 'success'|'error', text }

  const showMsg = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const load = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const url = `${API}/blacklist${q ? `?search=${encodeURIComponent(q)}` : ''}`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      const d = await r.json()
      setList(d.success ? d.data : [])
    } catch { setList([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search), 400)
    return () => clearTimeout(t)
  }, [search, load])

  const handleAdd = async () => {
    if (!addPhone.trim()) return
    setAdding(true)
    try {
      const r = await fetch(`${API}/blacklist`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: addPhone.trim(), reason: addReason.trim() || null })
      })
      const d = await r.json()
      if (d.success) {
        showMsg('success', d.message || 'เพิ่มเข้า Blacklist แล้ว')
        setShowAdd(false); setAddPhone(''); setAddReason('')
        load(search)
      } else { showMsg('error', d.message || 'เกิดข้อผิดพลาด') }
    } catch { showMsg('error', 'ไม่สามารถเชื่อมต่อ server') }
    setAdding(false)
  }

  const handleRemove = async (phone) => {
    if (!window.confirm(`ยกเลิก Blacklist เบอร์ ${phone} ?`)) return
    setRemovingPhone(phone)
    try {
      const r = await fetch(`${API}/blacklist/${encodeURIComponent(phone)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      const d = await r.json()
      if (d.success) {
        showMsg('success', d.message || 'ยกเลิก Blacklist แล้ว')
        load(search)
      } else { showMsg('error', d.message || 'เกิดข้อผิดพลาด') }
    } catch { showMsg('error', 'ไม่สามารถเชื่อมต่อ server') }
    setRemovingPhone(null)
  }

  const activeList   = list.filter(r => r.is_active)
  const inactiveList = list.filter(r => !r.is_active)

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>

      {/* Toast */}
      {msg && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: msg.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', borderRadius: 10, padding: '12px 20px',
          fontWeight: 600, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <i className={`fas fa-${msg.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          background: 'linear-gradient(135deg, #dc2626, #991b1b)',
          color: '#fff', borderRadius: 12, padding: '10px 16px',
          fontSize: 20, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700
        }}>
          <i className="fas fa-ban" /> Blacklist ลูกหนี้
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          background: '#fee2e2', color: '#991b1b', borderRadius: 20,
          padding: '4px 14px', fontSize: 13, fontWeight: 700
        }}>
          {activeList.length} รายการ
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddPhone(''); setAddReason('') }}
          style={{
            background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
          <i className="fas fa-plus" /> เพิ่มเบอร์
        </button>
      </div>

      {/* Info Banner */}
      <div style={{
        background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10,
        padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#92400e',
        display: 'flex', alignItems: 'flex-start', gap: 8
      }}>
        <i className="fas fa-info-circle" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          เบอร์ที่อยู่ใน Blacklist จะถูก<strong> แจ้งเตือนอัตโนมัติ</strong>เมื่อโทรเข้าใหม่ผ่านระบบแชท
          และจะแสดง ⚠️ แบนเนอร์สีแดงในหน้าแชทนั้น
        </span>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <i className="fas fa-search" style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#9ca3af', fontSize: 14
        }} />
        <input
          placeholder="ค้นหาเบอร์โทร หรือ เหตุผล..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 12px 10px 36px', borderRadius: 8,
            border: '1px solid #d1d5db', fontSize: 14, outline: 'none'
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16
          }}>×</button>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 28, width: 420,
            maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
              <i className="fas fa-ban" style={{ marginRight: 8 }} />เพิ่มเบอร์เข้า Blacklist
            </h3>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              เบอร์โทรศัพท์ <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              placeholder="0812345678"
              value={addPhone}
              onChange={e => setAddPhone(e.target.value)}
              maxLength={20}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', marginBottom: 16,
                padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db',
                fontSize: 14, outline: 'none', fontFamily: 'monospace', letterSpacing: 1
              }}
            />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              เหตุผล (ไม่บังคับ)
            </label>
            <textarea
              placeholder="เช่น: ติดต่อซ้ำหลายครั้งแต่ไม่มีคุณสมบัติ, รบกวนพนักงาน, ฯลฯ"
              value={addReason}
              onChange={e => setAddReason(e.target.value)}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', marginBottom: 20,
                padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db',
                fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit'
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid #d1d5db',
                  background: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600, color: '#6b7280'
                }}>
                ยกเลิก
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !addPhone.trim()}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: adding || !addPhone.trim() ? '#fca5a5' : '#dc2626',
                  color: '#fff', fontSize: 14, cursor: adding || !addPhone.trim() ? 'default' : 'pointer',
                  fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                {adding ? <><i className="fas fa-spinner fa-spin" /> กำลังบันทึก...</> : <><i className="fas fa-ban" /> เพิ่มเข้า Blacklist</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Blacklist Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, marginBottom: 12, display: 'block' }} />
          กำลังโหลด...
        </div>
      ) : activeList.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, color: '#9ca3af',
          background: '#f9fafb', borderRadius: 12, border: '2px dashed #e5e7eb'
        }}>
          <i className="fas fa-ban" style={{ fontSize: 40, marginBottom: 12, display: 'block', color: '#d1d5db' }} />
          {search ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีรายการ Blacklist'}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1f2937', color: '#fff' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700 }}>#</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700 }}>เบอร์โทร</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700 }}>เหตุผล</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700 }}>เพิ่มโดย</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700 }}>วันที่เพิ่ม</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {activeList.map((row, i) => (
                <tr key={row.id} style={{
                  borderBottom: '1px solid #f3f4f6',
                  background: i % 2 === 0 ? '#fff' : '#fef2f2',
                  transition: 'background 0.1s'
                }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9ca3af' }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        background: '#fee2e2', color: '#dc2626', borderRadius: 6,
                        padding: '3px 10px', fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
                        letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        <i className="fas fa-ban" style={{ fontSize: 10 }} />
                        {row.phone}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: row.reason ? '#374151' : '#9ca3af', maxWidth: 280 }}>
                    {row.reason || <span style={{ fontStyle: 'italic' }}>ไม่ระบุ</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                    {row.added_by_name || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {fmt(row.created_at)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleRemove(row.phone)}
                      disabled={removingPhone === row.phone}
                      style={{
                        background: removingPhone === row.phone ? '#f3f4f6' : '#fff',
                        color: removingPhone === row.phone ? '#9ca3af' : '#dc2626',
                        border: '1.5px solid currentColor', borderRadius: 6,
                        padding: '5px 12px', fontSize: 12, cursor: removingPhone === row.phone ? 'default' : 'pointer',
                        fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4
                      }}>
                      {removingPhone === row.phone
                        ? <><i className="fas fa-spinner fa-spin" /> กำลังยกเลิก...</>
                        : <><i className="fas fa-unlock-alt" /> ยกเลิก Blacklist</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inactive (history) section */}
      {inactiveList.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', marginBottom: 10 }}>
            <i className="fas fa-history" style={{ marginRight: 6 }} />ประวัติที่ยกเลิกแล้ว ({inactiveList.length})
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {inactiveList.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' }}>
                        {row.phone}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#9ca3af' }}>{row.reason || '-'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#9ca3af' }}>{fmt(row.created_at)}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => { setAddPhone(row.phone); setAddReason(row.reason || ''); setShowAdd(true) }}
                        style={{
                          background: 'none', color: '#dc2626', border: '1px solid #fca5a5',
                          borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600
                        }}>
                        <i className="fas fa-plus" style={{ marginRight: 4 }} />Blacklist ใหม่
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { io as socketIO } from 'socket.io-client'

const API = '/api/admin/advance'
const token = () => localStorage.getItem('loandd_admin')

const fmt = (n) =>
  n ? Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

const TYPE_LABELS = { chat: '💬 แชท', call: '📞 โทร', note: '📝 โน้ต' }

export default function AdvanceDashboard() {
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [replyPrice, setReplyPrice] = useState('')
  const [replyNote, setReplyNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const socketRef = useRef(null)

  const fetchRequests = async (f = filter) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/requests?status=${f}`, {
        headers: { Authorization: 'Bearer ' + token() },
      })
      const data = await res.json()
      if (data.success) setRequests(data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests(filter)
  }, [filter])

  // socket — join advance_room รับ notification งานใหม่
  useEffect(() => {
    const s = socketIO({ auth: { token: token() } })
    socketRef.current = s
    s.emit('join_room', 'advance_room')
    s.on('new_price_request', () => fetchRequests(filter))
    return () => s.disconnect()
  }, [])

  const handleReply = async () => {
    if (!replyPrice || !selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/requests/${selected.id}/reply`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token(),
        },
        body: JSON.stringify({ preliminary_price: replyPrice, appraiser_note: replyNote }),
      })
      const data = await res.json()
      if (data.success) {
        setSelected(null)
        setReplyPrice('')
        setReplyNote('')
        fetchRequests(filter)
      } else {
        alert('เกิดข้อผิดพลาด: ' + data.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: 24, fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a3a5c' }}>
          🏠 Advance — รายการขอราคาเบื้องต้น
        </h2>
        <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>
          รายการที่ฝ่ายขายส่งมาขอราคาประเมินคร่าวๆ
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { v: 'pending', label: `รอตอบ ${pendingCount > 0 ? `(${pendingCount})` : ''}`, color: '#e65100' },
          { v: 'replied', label: 'ตอบแล้ว', color: '#2e7d32' },
          { v: 'all', label: 'ทั้งหมด', color: '#1565c0' },
        ].map(({ v, label, color }) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            style={{
              padding: '8px 20px', borderRadius: 20, border: 'none',
              background: filter === v ? color : '#e0e0e0',
              color: filter === v ? '#fff' : '#555',
              fontWeight: filter === v ? 700 : 400, cursor: 'pointer', fontSize: 14,
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => fetchRequests(filter)}
          style={{
            marginLeft: 'auto', padding: '8px 16px', borderRadius: 20,
            border: '1px solid #bbb', background: '#fff', cursor: 'pointer', fontSize: 13,
          }}
        >
          🔄 รีเฟรช
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>กำลังโหลด...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#bbb', fontSize: 18 }}>
          ✅ ไม่มีรายการ{filter === 'pending' ? 'รอตอบ' : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{
                background: '#fff', borderRadius: 12, padding: '18px 20px',
                boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${r.status === 'pending' ? '#e65100' : '#2e7d32'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                {/* ข้อมูลซ้าย */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      background: r.status === 'pending' ? '#fff3e0' : '#e8f5e9',
                      color: r.status === 'pending' ? '#e65100' : '#2e7d32',
                      borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                    }}>
                      {r.status === 'pending' ? '⏳ รอตอบ' : '✅ ตอบแล้ว'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#1a3a5c' }}>{r.case_code}</span>
                  </div>
                  <div style={{ fontSize: 15, color: '#333', marginBottom: 2 }}>
                    <strong>{r.customer_name || '—'}</strong>
                    {r.customer_phone && <span style={{ color: '#666', marginLeft: 8 }}>{r.customer_phone}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#555' }}>
                    ประเภท: {r.property_type || '—'} &nbsp;|&nbsp;
                    โฉนด: {r.deed_type || '—'} {r.deed_number ? `(${r.deed_number})` : ''}
                  </div>
                  {r.location_hint && (
                    <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>📍 {r.location_hint}</div>
                  )}
                  {r.desired_amount && (
                    <div style={{ fontSize: 13, color: '#1565c0', marginTop: 2 }}>
                      💰 ต้องการ {fmt(r.desired_amount)} บาท
                      {r.estimated_value ? ` / ประเมินไว้ ${fmt(r.estimated_value)} บาท` : ''}
                    </div>
                  )}
                  {r.note && (
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4, fontStyle: 'italic' }}>
                      📝 "{r.note}"
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                    เซลล์: {r.requested_by_name || '—'} &nbsp;|&nbsp; ส่งมา: {fmtDate(r.created_at)}
                  </div>
                  {/* ราคาที่ตอบกลับแล้ว */}
                  {r.status === 'replied' && (
                    <div style={{
                      marginTop: 10, padding: '10px 14px', background: '#e8f5e9',
                      borderRadius: 8, borderLeft: '3px solid #43a047',
                    }}>
                      <div style={{ fontWeight: 700, color: '#2e7d32', fontSize: 15 }}>
                        💰 ราคาเบื้องต้น: {fmt(r.preliminary_price)} บาท
                      </div>
                      {r.appraiser_note && (
                        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{r.appraiser_note}</div>
                      )}
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>ตอบเมื่อ: {fmtDate(r.replied_at)}</div>
                    </div>
                  )}
                  {/* รูปโฉนด */}
                  {r.deed_images && (
                    <div style={{ marginTop: 8 }}>
                      {JSON.parse(r.deed_images.startsWith('[') ? r.deed_images : `["${r.deed_images}"]`).map((img, i) => (
                        <a key={i} href={`/uploads/${img}`} target="_blank" rel="noreferrer">
                          <img
                            src={`/uploads/${img}`}
                            alt="โฉนด"
                            style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: 6, marginRight: 4, border: '1px solid #ddd' }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* ปุ่มตอบ */}
                {r.status === 'pending' && (
                  <button
                    onClick={() => { setSelected(r); setReplyPrice(''); setReplyNote('') }}
                    style={{
                      padding: '10px 20px', borderRadius: 8, border: 'none',
                      background: '#1565c0', color: '#fff', fontWeight: 700,
                      cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
                    }}
                  >
                    ✏️ กรอกราคา
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ตอบราคา */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 32,
            width: '100%', maxWidth: 460, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 6px', color: '#1a3a5c' }}>✏️ กรอกราคาเบื้องต้น</h3>
            <p style={{ margin: '0 0 20px', color: '#666', fontSize: 14 }}>
              {selected.case_code} — {selected.customer_name}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: '#444', display: 'block', marginBottom: 6 }}>
                ราคาเบื้องต้น (บาท) <span style={{ color: '#e53935' }}>*</span>
              </label>
              <input
                type="number"
                value={replyPrice}
                onChange={(e) => setReplyPrice(e.target.value)}
                placeholder="เช่น 1500000"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1.5px solid #1565c0', fontSize: 16, boxSizing: 'border-box',
                }}
                autoFocus
              />
              {replyPrice && (
                <div style={{ fontSize: 13, color: '#1565c0', marginTop: 4 }}>
                  = {fmt(replyPrice)} บาท
                </div>
              )}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: '#444', display: 'block', marginBottom: 6 }}>
                หมายเหตุ / Short note
              </label>
              <textarea
                value={replyNote}
                onChange={(e) => setReplyNote(e.target.value)}
                rows={3}
                placeholder="เช่น พื้นที่ 50 ตร.ว. คิดตร.ม.ละ 18,000..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleReply}
                disabled={!replyPrice || submitting}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                  background: replyPrice ? '#2e7d32' : '#ccc', color: '#fff',
                  fontWeight: 700, fontSize: 15, cursor: replyPrice ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? '⏳ กำลังส่ง...' : '✅ ส่งราคากลับ'}
              </button>
              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: '12px 20px', borderRadius: 8,
                  border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 15,
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

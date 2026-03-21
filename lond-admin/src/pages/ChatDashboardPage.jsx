import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/chat'
const token = () => localStorage.getItem('loandd_admin')

const DAYS_OPTIONS = [
  { v: 1, label: 'วันนี้' },
  { v: 3, label: '3 วัน' },
  { v: 7, label: '7 วัน' },
  { v: 14, label: '14 วัน' },
  { v: 30, label: '30 วัน' }
]

function fmtSec(sec) {
  if (sec == null || isNaN(sec)) return '—'
  sec = Math.round(sec)
  if (sec < 60) return `${sec} วิ`
  if (sec < 3600) return `${Math.floor(sec / 60)} น. ${sec % 60} วิ`
  return `${Math.floor(sec / 3600)} ชม. ${Math.floor((sec % 3600) / 60)} น.`
}

function SLAColor(sec) {
  if (sec == null) return '#94a3b8'
  const mins = sec / 60
  if (mins <= 5) return '#16a34a'
  if (mins <= 15) return '#d97706'
  return '#dc2626'
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s' }} />
    </div>
  )
}

export default function ChatDashboardPage() {
  const navigate = useNavigate()
  const [days, setDays] = useState(7)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [qData, setQData] = useState(null)  // ★ Chat Quality Monitor data
  const [qTab, setQTab] = useState('slow')  // slow | no_response | sales
  const [slipToasts, setSlipToasts] = useState([])  // ★ สลิปค่าประเมินที่เข้ามาใหม่
  const socketRef = useRef(null)

  useEffect(() => { load() }, [days])
  useEffect(() => { loadQuality() }, [])

  // ★ Socket listener สำหรับสลิปค่าประเมิน
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    const sock = io(backendUrl, {
      auth: { token: token() },
      transports: ['websocket', 'polling']
    })
    socketRef.current = sock
    sock.emit('join_admin_room')

    sock.on('appraisal_slip_received', (data) => {
      const toast = { ...data, id: Date.now() }
      setSlipToasts(prev => [toast, ...prev.slice(0, 4)])  // เก็บแค่ 5 อัน
      // ลบ toast อัตโนมัติหลัง 30 วิ
      setTimeout(() => {
        setSlipToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 30000)
    })

    return () => { sock.disconnect() }
  }, [])

  function load() {
    setLoading(true)
    fetch(`${API}/dashboard/chat-stats?days=${days}`, {
      headers: { Authorization: 'Bearer ' + token() }
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  function loadQuality() {
    fetch(`${API}/analytics/quality-monitor`, {
      headers: { Authorization: 'Bearer ' + token() }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setQData(d) })
      .catch(() => {})
  }

  const sum = data?.summary?.[0] || {}
  const sla = data?.sla?.[0] || {}
  const agents = data?.byAgent || []
  const daily = data?.daily || []
  const byPlatform = data?.byPlatform || []
  const leadQuality = data?.leadQuality || []

  const maxDayTotal = Math.max(...daily.map(d => d.total), 1)
  const maxAgentTotal = Math.max(...agents.map(a => a.total_assigned), 1)

  const lqMap = { unknown: { label: 'ยังไม่ระบุ', color: '#94a3b8' }, ghost: { label: '👻 Ghost', color: '#ca8a04' }, unqualified: { label: '❌ ไม่ผ่าน', color: '#dc2626' }, qualified: { label: '✅ ผ่าน', color: '#16a34a' }, hot: { label: '🔥 Hot', color: '#ea580c' } }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Sarabun, sans-serif' }}>

      {/* ★ Appraisal Slip Toast Notifications */}
      {slipToasts.length > 0 && (
        <div style={{ position: 'fixed', top: 80, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {slipToasts.map(toast => (
            <div key={toast.id} style={{
              background: '#fff', border: '2px solid #22c55e', borderRadius: 12,
              padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              minWidth: 300, maxWidth: 380,
              animation: 'slideInRight 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 28 }}>💳</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#15803d', fontSize: 14, marginBottom: 4 }}>
                    สลิปค่าประเมินเข้ามาแล้ว!
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>
                    {toast.case_code ? `✅ สร้างเคส ${toast.case_code}` : '⚠️ รอสร้างเคส'}
                    {' — ฿'}{(toast.amount || 0).toLocaleString('th-TH')}
                  </div>
                  {toast.sender_name && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>ผู้โอน: {toast.sender_name}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => navigate(`/chat?conv=${toast.conversation_id}`)}
                      style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                    >ดูแชท</button>
                    {toast.case_code && (
                      <button
                        onClick={() => navigate('/appraisal')}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                      >ดูเคส</button>
                    )}
                    <button
                      onClick={() => setSlipToasts(prev => prev.filter(t => t.id !== toast.id))}
                      style={{ background: '#f1f5f9', color: '#6b7280', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                    >ปิด</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/chat')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18 }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
              <i className="fas fa-chart-bar" style={{ marginRight: 8, color: '#3b82f6' }}></i>
              Chat Dashboard
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>วิเคราะห์ประสิทธิภาพทีมแชท</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {DAYS_OPTIONS.map(o => (
            <button key={o.v} onClick={() => setDays(o.v)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: days === o.v ? '#3b82f6' : '#f1f5f9',
                color: days === o.v ? '#fff' : '#64748b'
              }}>
              {o.label}
            </button>
          ))}
          <button onClick={load} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#64748b' }}>
            <i className={`fas fa-sync-alt${loading ? ' fa-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>

        {loading && !data && (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }}></i>
            <div style={{ marginTop: 8 }}>กำลังโหลดข้อมูล...</div>
          </div>
        )}

        {data && <>

          {/* ===== Summary Cards ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { icon: 'fas fa-comments', label: 'แชททั้งหมด', value: sum.total_chats || 0, color: '#3b82f6', bg: '#eff6ff' },
              { icon: 'fas fa-envelope', label: 'ยังไม่ตอบ', value: sum.unread || 0, color: '#ef4444', bg: '#fef2f2' },
              { icon: 'fas fa-reply', label: 'ตอบแล้ว', value: sum.replied || 0, color: '#10b981', bg: '#f0fdf4' },
              { icon: 'fas fa-fire', label: '🔥 Hot Leads', value: sum.hot_leads || 0, color: '#ea580c', bg: '#fff7ed' },
              { icon: 'fas fa-ghost', label: '👻 Ghost', value: sum.ghost_leads || 0, color: '#ca8a04', bg: '#fefce8' },
              { icon: 'fas fa-stopwatch', label: 'เวลาตอบเฉลี่ย', value: fmtSec(sum.avg_first_response_sec), color: SLAColor(sum.avg_first_response_sec), bg: '#f8fafc', isText: true }
            ].map((c, i) => (
              <div key={i} style={{ background: c.bg, borderRadius: 12, padding: '16px 18px', border: `1px solid ${c.color}22` }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                  <i className={c.icon} style={{ marginRight: 4, color: c.color }}></i>{c.label}
                </div>
                <div style={{ fontSize: c.isText ? 18 : 28, fontWeight: 800, color: c.color, lineHeight: 1 }}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

            {/* ===== Daily Chart ===== */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e7eb', gridColumn: '1 / -1' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 16 }}>
                <i className="fas fa-chart-area" style={{ marginRight: 8, color: '#3b82f6' }}></i>
                แชทรายวัน ({days} วันที่ผ่านมา)
              </div>
              {daily.length === 0
                ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>ไม่มีข้อมูล</div>
                : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, overflowX: 'auto' }}>
                    {daily.map((d, i) => {
                      const pct = (d.total / maxDayTotal) * 100
                      const date = new Date(d.date)
                      const label = `${date.getDate()}/${date.getMonth() + 1}`
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 0 40px', minWidth: 40 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 3 }}>{d.total}</div>
                          <div style={{ width: '100%', maxWidth: 40, background: '#3b82f6', borderRadius: '4px 4px 0 0', height: `${Math.max(pct, 4)}%`, transition: 'height .4s', position: 'relative' }}>
                            {d.facebook > 0 && (
                              <div style={{ position: 'absolute', bottom: 0, width: '50%', left: 0, height: `${(d.facebook / d.total) * 100}%`, background: '#0084ff', borderRadius: '4px 0 0 4px' }} />
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{label}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11 }}>
                <span style={{ color: '#0084ff' }}><i className="fab fa-facebook"></i> Facebook</span>
                <span style={{ color: '#06c755' }}><i className="fab fa-line"></i> LINE</span>
              </div>
            </div>

            {/* ===== SLA ===== */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 16 }}>
                <i className="fas fa-stopwatch" style={{ marginRight: 8, color: '#f59e0b' }}></i>
                SLA — เวลาตอบครั้งแรก
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: '≤ 5 นาที 🟢', val: sla.within_5min, color: '#16a34a' },
                  { label: '≤ 15 นาที 🟡', val: sla.within_15min - sla.within_5min, color: '#d97706' },
                  { label: '≤ 30 นาที 🟠', val: sla.within_30min - sla.within_15min, color: '#ea580c' },
                  { label: '> 30 นาที 🔴', val: sla.over_1hr, color: '#dc2626' }
                ].map((row, i) => {
                  const v = Math.max(0, row.val || 0)
                  const total = sla.total_responded || 1
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: '#374151' }}>{row.label}</span>
                        <span style={{ fontWeight: 700, color: row.color }}>{v} ({total > 0 ? Math.round(v / total * 100) : 0}%)</span>
                      </div>
                      <MiniBar value={v} max={total} color={row.color} />
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                <div style={{ textAlign: 'center', background: '#f0fdf4', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>เร็วสุด</div>
                  <div style={{ fontWeight: 700, color: '#16a34a' }}>{fmtSec(sum.min_first_response_sec)}</div>
                </div>
                <div style={{ textAlign: 'center', background: '#fef3c7', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>เฉลี่ย</div>
                  <div style={{ fontWeight: 700, color: '#d97706' }}>{fmtSec(sum.avg_first_response_sec)}</div>
                </div>
                <div style={{ textAlign: 'center', background: '#fee2e2', borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>ช้าสุด</div>
                  <div style={{ fontWeight: 700, color: '#dc2626' }}>{fmtSec(sum.max_first_response_sec)}</div>
                </div>
              </div>
            </div>

            {/* ===== Sentiment + Lead Quality ===== */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>
                <i className="fas fa-smile" style={{ marginRight: 8, color: '#8b5cf6' }}></i>
                Sentiment & Lead Quality
              </div>

              {/* Sentiment */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Sentiment ลูกหนี้</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { key: 'positive', icon: '😊', label: 'บวก', val: sum.positive_sentiment || 0, color: '#16a34a', bg: '#dcfce7' },
                    { key: 'negative', icon: '😠', label: 'ลบ', val: sum.negative_sentiment || 0, color: '#dc2626', bg: '#fee2e2' },
                    { key: 'other', icon: '😐', label: 'กลาง', val: (sum.total_chats || 0) - (sum.positive_sentiment || 0) - (sum.negative_sentiment || 0), color: '#d97706', bg: '#fef9c3' }
                  ].map((s, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', background: s.bg, borderRadius: 10, padding: '10px 6px' }}>
                      <div style={{ fontSize: 20 }}>{s.icon}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{Math.max(0, s.val)}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lead Quality */}
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Lead Quality</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {leadQuality.map((lq, i) => {
                    const info = lqMap[lq.lead_quality] || { label: lq.lead_quality, color: '#64748b' }
                    const total = sum.total_chats || 1
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 12, minWidth: 100, color: info.color, fontWeight: 600 }}>{info.label}</div>
                        <MiniBar value={lq.count} max={total} color={info.color} />
                        <div style={{ fontSize: 12, fontWeight: 700, color: info.color, minWidth: 30, textAlign: 'right' }}>{lq.count}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* ===== Agent Performance ===== */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e7eb', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 16 }}>
              <i className="fas fa-users" style={{ marginRight: 8, color: '#10b981' }}></i>
              ประสิทธิภาพทีมขาย (Agent Performance)
            </div>
            {agents.length === 0
              ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: 16 }}>ไม่มีข้อมูล</div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>เซลล์</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>แชทได้รับ</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>ค้างตอบ</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>ตอบแล้ว</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>เวลาตอบเฉลี่ย</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e5e7eb' }}>Workload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((a, i) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%', background: '#3b82f6',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0
                              }}>
                                {(a.full_name || a.username || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{a.full_name || a.username}</div>
                                {a.nickname && <div style={{ fontSize: 11, color: '#94a3b8' }}>({a.nickname})</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#3b82f6', fontSize: 16 }}>{a.total_assigned}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: a.pending > 0 ? '#ef4444' : '#94a3b8' }}>{a.pending || 0}</span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#10b981' }}>{a.replied || 0}</span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, color: SLAColor(a.avg_response_sec) }}>{fmtSec(a.avg_response_sec)}</span>
                          </td>
                          <td style={{ padding: '10px 12px', minWidth: 120 }}>
                            <MiniBar value={a.total_assigned} max={maxAgentTotal} color="#3b82f6" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          {/* ===== Platform Breakdown ===== */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>
              <i className="fas fa-layer-group" style={{ marginRight: 8, color: '#8b5cf6' }}></i>
              แยกตาม Platform
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {byPlatform.map((p, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: 16, borderRadius: 12,
                  background: p.platform === 'facebook' ? '#eff6ff' : p.platform === 'line' ? '#f0fdf4' : '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>
                    {p.platform === 'facebook' ? <i className="fab fa-facebook" style={{ color: '#0084ff' }}></i>
                      : p.platform === 'line' ? <i className="fab fa-line" style={{ color: '#06c755' }}></i>
                        : <i className="fas fa-comment" style={{ color: '#64748b' }}></i>}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize', marginBottom: 4 }}>{p.platform}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>{p.total}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>เวลาตอบเฉลี่ย: {fmtSec(p.avg_response_sec)}</div>
                </div>
              ))}
              {byPlatform.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13 }}>ไม่มีข้อมูล</div>}
            </div>
          </div>

        </>}

        {/* ★ Chat Quality Monitor Section */}
        {qData && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-stopwatch" style={{ color: '#f59e0b' }}></i>
                Chat Quality Monitor
                {(qData.slow_chats?.length > 0 || qData.no_response?.length > 0) && (
                  <span style={{ background: '#dc2626', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    !!! {(qData.slow_chats?.length || 0) + (qData.no_response?.length || 0)} แชทที่ต้องแก้
                  </span>
                )}
              </h3>
              <button onClick={loadQuality} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-sync-alt"></i> รีเฟรช
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '2px solid #f1f5f9' }}>
              {[
                { id: 'slow', label: `ตอบช้า > 30 น. (${qData.slow_chats?.length || 0})`, color: '#f59e0b' },
                { id: 'no_response', label: `ยังไม่ตอบ > 1 ชม. (${qData.no_response?.length || 0})`, color: '#dc2626' },
                { id: 'sales', label: 'สถิติเซลล์', color: '#6366f1' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setQTab(tab.id)} style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: qTab === tab.id ? 700 : 400,
                  border: 'none', borderRadius: '8px 8px 0 0',
                  background: qTab === tab.id ? tab.color : 'transparent',
                  color: qTab === tab.id ? '#fff' : '#64748b',
                  cursor: 'pointer', transition: 'all .2s'
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: ตอบช้า */}
            {qTab === 'slow' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {qData.slow_chats?.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#16a34a', padding: 24, fontSize: 14 }}>
                    <i className="fas fa-check-circle" style={{ fontSize: 28, marginBottom: 8, display: 'block' }}></i>
                    ไม่มีแชทที่รอนานเกิน 30 นาที
                  </div>
                )}
                {qData.slow_chats?.map(c => (
                  <div key={c.id} onClick={() => navigate(`/chat/${c.id}`)} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                    background: c.waiting_min > 120 ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${c.waiting_min > 120 ? '#fecaca' : '#fde68a'}`,
                    borderRadius: 10, cursor: 'pointer'
                  }}>
                    <div style={{
                      background: c.waiting_min > 120 ? '#dc2626' : '#f59e0b',
                      color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0
                    }}>
                      {c.waiting_min >= 60 ? `${Math.floor(c.waiting_min/60)} ชม.${c.waiting_min%60 > 0 ? ` ${c.waiting_min%60} น.` : ''}` : `${c.waiting_min} น.`}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{c.customer_name || '(ไม่มีชื่อ)'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                        {c.debtor_code && <span style={{ color: '#7c3aed' }}>{c.debtor_code}</span>}
                        {c.platform && <span>{c.platform === 'line' ? '💚 LINE' : '💙 Facebook'}</span>}
                        {c.assigned_name && <span>ดูแลโดย: {c.assigned_name}</span>}
                      </div>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#94a3b8', fontSize: 12 }}></i>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: ยังไม่ตอบ */}
            {qTab === 'no_response' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {qData.no_response?.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#16a34a', padding: 24, fontSize: 14 }}>
                    <i className="fas fa-check-circle" style={{ fontSize: 28, marginBottom: 8, display: 'block' }}></i>
                    ทุกแชทได้รับการตอบกลับแล้ว
                  </div>
                )}
                {qData.no_response?.map(c => (
                  <div key={c.id} onClick={() => navigate(`/chat/${c.id}`)} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer'
                  }}>
                    <div style={{ background: '#dc2626', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      ไม่มีการตอบ {c.age_min >= 60 ? `${Math.floor(c.age_min/60)} ชม.` : `${c.age_min} น.`}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{c.customer_name || '(ไม่มีชื่อ)'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                        {c.debtor_code && <span style={{ color: '#7c3aed' }}>{c.debtor_code}</span>}
                        {c.assigned_name ? <span>มอบหมาย: {c.assigned_name}</span> : <span style={{ color: '#dc2626' }}>ยังไม่มีเซลล์รับผิดชอบ</span>}
                      </div>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#94a3b8', fontSize: 12 }}></i>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: สถิติเซลล์ */}
            {qTab === 'sales' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['เซลล์', 'แชทรับ (30 วัน)', 'เวลาตอบเฉลี่ย', 'เร็วสุด', 'ช้าสุด', 'ตอบช้า (>30น.)', 'ยังไม่ตอบ'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {qData.sales_stats?.map((s, i) => (
                      <tr key={s.sales_id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{s.sales_name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{s.total_chats}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ color: SLAColor(s.avg_response_sec), fontWeight: 700 }}>{fmtSec(s.avg_response_sec)}</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#16a34a' }}>{fmtSec(s.min_response_sec)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#dc2626' }}>{fmtSec(s.max_response_sec)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ background: s.slow_count > 0 ? '#fef3c7' : '#f0fdf4', color: s.slow_count > 0 ? '#b45309' : '#16a34a', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                            {s.slow_count}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ background: s.no_response_count > 0 ? '#fef2f2' : '#f0fdf4', color: s.no_response_count > 0 ? '#dc2626' : '#16a34a', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>
                            {s.no_response_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!qData.sales_stats || qData.sales_stats.length === 0) && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>ไม่มีข้อมูล</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

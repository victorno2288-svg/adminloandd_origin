// ============================================
// FollowUpReminderBanner.jsx
// Banner แจ้งเตือน follow-up ที่ครบกำหนด/เกินกำหนด
// - Polling ทุก 5 นาที
// - แสดงเมื่อมีเคสที่ต้องติดตาม
// - Super Admin: เห็น escalation เคสที่เกินกำหนด > 3 วัน
// ============================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'

const token = () => localStorage.getItem('loandd_admin') || ''
const POLL_INTERVAL = 5 * 60 * 1000   // 5 นาที
const ESCALATE_DAYS = 3               // เกินกำหนดกี่วันถือว่า escalate

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (new Date() - new Date(dateStr)) / 1000
  if (diff < 3600) return Math.floor(diff / 60) + ' นาทีที่แล้ว'
  if (diff < 86400) return Math.floor(diff / 3600) + ' ชม.ที่แล้ว'
  return Math.floor(diff / 86400) + ' วันที่แล้ว'
}

function daysOverdue(dateStr) {
  if (!dateStr) return 0
  return (new Date() - new Date(dateStr)) / 86400000
}

export default function FollowUpReminderBanner() {
  const [dueData, setDueData] = useState([])          // รายการครบกำหนด (รวม overdue + วันนี้)
  const [dismissed, setDismissed] = useState(false)   // ซ่อน banner ชั่วคราว
  const [expanded, setExpanded] = useState(false)     // แสดงรายชื่อ
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const pollRef = useRef(null)
  const lastDismissKey = useRef('')

  const user = getCurrentUser() || {}
  const isSuperAdmin = user.department === 'super_admin'
  const userId = user.id

  // ── fetch follow-ups ที่ครบกำหนดใน 1 วัน (รวม overdue + วันนี้)
  const fetchDue = useCallback(() => {
    const t = token()
    if (!t) return
    setLoading(true)
    fetch('/api/admin/sales/followups/due?days=1', {
      headers: { Authorization: `Bearer ${t}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          // เซลล์เห็นเฉพาะเคสที่ assigned ตัวเอง, super_admin เห็นทั้งหมด
          const filtered = isSuperAdmin
            ? d.data
            : d.data.filter(c => !c.assigned_sales_id || c.assigned_sales_id === userId)
          setDueData(filtered)
          // ถ้าจำนวนเปลี่ยนจากตอน dismiss → re-show banner
          const key = String(filtered.length)
          if (key !== lastDismissKey.current) {
            setDismissed(false)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isSuperAdmin, userId])

  // ── poll ทุก 5 นาที + ตอน focus tab
  useEffect(() => {
    fetchDue()
    pollRef.current = setInterval(fetchDue, POLL_INTERVAL)
    const onFocus = () => fetchDue()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(pollRef.current)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchDue])

  if (dueData.length === 0 || dismissed) return null

  const overdueList     = dueData.filter(c => new Date(c.next_follow_up_at) < new Date())
  const todayList       = dueData.filter(c => {
    const d = new Date(c.next_follow_up_at)
    const t = new Date()
    return d >= new Date(t.getFullYear(), t.getMonth(), t.getDate()) && d < new Date()
  })
  const escalateList    = overdueList.filter(c => daysOverdue(c.next_follow_up_at) >= ESCALATE_DAYS)

  // สี banner ตาม severity
  const hasEscalate  = isSuperAdmin && escalateList.length > 0
  const bannerColor  = hasEscalate ? '#e74c3c' : overdueList.length > 0 ? '#e67e22' : '#f59e0b'
  const bannerBg     = hasEscalate ? '#fef2f2' : overdueList.length > 0 ? '#fff7ed' : '#fffbeb'
  const bannerBorder = hasEscalate ? '#fca5a5' : overdueList.length > 0 ? '#fdba74' : '#fcd34d'

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 8000, width: 'min(640px, calc(100vw - 32px))',
      animation: 'fuSlideUp 0.35s cubic-bezier(0.4,0,0.2,1)',
      filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.18))',
    }}>
      <div style={{
        background: bannerBg, border: `1.5px solid ${bannerBorder}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* ── Main Bar ── */}
        <div style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {/* Pulse icon */}
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: bannerColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <i className="fas fa-bell" style={{ color: bannerColor, fontSize: 16 }}></i>
            <span style={{
              position: 'absolute', top: -3, right: -3,
              background: bannerColor, color: '#fff',
              borderRadius: '50%', width: 18, height: 18,
              fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff',
            }}>
              {dueData.length > 99 ? '99+' : dueData.length}
            </span>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: bannerColor }}>
              {hasEscalate
                ? `🚨 Escalation — ${escalateList.length} เคสเกินกำหนดเกิน ${ESCALATE_DAYS} วัน ยังไม่มีการติดตาม`
                : overdueList.length > 0
                  ? `⚠️ มี ${overdueList.length} เคสที่เลยกำหนด follow-up แล้ว`
                  : `📅 มี ${dueData.length} เคสที่ต้องติดตามวันนี้`
              }
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              {isSuperAdmin
                ? `ทีมขาย — overdue ${overdueList.length} • วันนี้ ${dueData.length - overdueList.length}`
                : `overdue ${overdueList.length} • วันนี้ ${dueData.length - overdueList.length}`
              }
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: bannerColor + '18', color: bannerColor,
                border: `1px solid ${bannerColor}30`,
                borderRadius: 8, padding: '5px 10px',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <i className={`fas fa-chevron-${expanded ? 'down' : 'up'}`} style={{ marginRight: 4 }}></i>
              {expanded ? 'ซ่อน' : 'ดูรายการ'}
            </button>
            <button
              onClick={() => navigate('/sales/followups')}
              style={{
                background: bannerColor, color: '#fff',
                border: 'none', borderRadius: 8, padding: '5px 12px',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <i className="fas fa-arrow-right" style={{ marginRight: 4 }}></i>
              จัดการ
            </button>
            <button
              onClick={() => { setDismissed(true); lastDismissKey.current = String(dueData.length) }}
              style={{
                background: 'transparent', color: '#aaa',
                border: '1px solid #e0e0e0', borderRadius: 8,
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 12, flexShrink: 0,
              }}
              title="ปิดชั่วคราว"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* ── Expanded List ── */}
        {expanded && (
          <div style={{
            borderTop: `1px solid ${bannerBorder}`,
            maxHeight: 240, overflowY: 'auto',
          }}>
            {/* Escalation section (super admin only) */}
            {hasEscalate && (
              <div style={{ background: '#fef2f2', padding: '6px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#e74c3c', marginBottom: 4 }}>
                  🚨 Escalate — เกินกำหนด &gt; {ESCALATE_DAYS} วัน (รอหัวหน้าดำเนินการ)
                </div>
                {escalateList.map((c, i) => (
                  <div key={c.case_id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 0', borderBottom: '1px solid #fee2e2',
                  }}>
                    <i className="fas fa-exclamation-triangle" style={{ color: '#e74c3c', fontSize: 12, flexShrink: 0 }}></i>
                    <div style={{ flex: 1, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{c.customer_name || '-'}</span>
                      {c.case_code && <span style={{ color: '#aaa', marginLeft: 6, fontSize: 11 }}>#{c.case_code}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#e74c3c', fontWeight: 700 }}>
                      เกิน {Math.floor(daysOverdue(c.next_follow_up_at))} วัน
                    </div>
                    {c.sales_name && (
                      <div style={{ fontSize: 11, color: '#888' }}>
                        <i className="fas fa-user" style={{ marginRight: 3 }}></i>{c.sales_name}
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/sales/followups`)}
                      style={{
                        background: '#e74c3c', color: '#fff', border: 'none',
                        borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer',
                      }}
                    >
                      ดู
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Normal overdue + today */}
            <div style={{ padding: '0 14px' }}>
              {dueData.slice(0, 8).map((c, i) => {
                const isOverdue = new Date(c.next_follow_up_at) < new Date()
                const dOv = Math.floor(daysOverdue(c.next_follow_up_at))
                return (
                  <div key={c.case_id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', borderBottom: '1px solid #f5f5f5',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isOverdue ? '#e74c3c' : '#f59e0b',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.customer_name || '-'}
                        {c.case_code && <span style={{ color: '#aaa', marginLeft: 6, fontWeight: 400 }}>#{c.case_code}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        {c.sales_name && <span style={{ marginRight: 8 }}><i className="fas fa-user" style={{ marginRight: 3 }}></i>{c.sales_name}</span>}
                        ติดตามครั้งที่ {c.follow_up_count || 0}
                        {c.contact_phone && <span style={{ marginLeft: 8 }}><i className="fas fa-phone" style={{ marginRight: 3 }}></i>{c.contact_phone}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isOverdue ? '#e74c3c' : '#f59e0b', flexShrink: 0 }}>
                      {isOverdue
                        ? dOv > 0 ? `เกิน ${dOv} วัน` : 'เกินกำหนด'
                        : 'วันนี้'
                      }
                    </div>
                  </div>
                )
              })}
              {dueData.length > 8 && (
                <div style={{ padding: '8px 0', fontSize: 11, color: '#aaa', textAlign: 'center' }}>
                  + {dueData.length - 8} รายการ — <span
                    style={{ color: bannerColor, cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => navigate('/sales/followups')}
                  >ดูทั้งหมด</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fuSlideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}

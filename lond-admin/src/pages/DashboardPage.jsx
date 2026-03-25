// ============================================================
// DashboardPage.jsx
// แดชบอร์ดฝ่าย — แสดงผลแตกต่างตาม department ของ account
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin'

// ─── สีและข้อมูลฝ่าย ─────────────────────────────────────────
const DEPT = {
  sales:       { label: 'ฝ่ายขาย',             icon: 'fa-handshake',          color: '#3b82f6' },
  appraisal:   { label: 'ฝ่ายประเมิน',          icon: 'fa-house-circle-check', color: '#8b5cf6' },
  approval:    { label: 'ฝ่ายอนุมัติสินเชื่อ',   icon: 'fa-circle-check',       color: '#f59e0b' },
  legal:       { label: 'ฝ่ายนิติกรรม',          icon: 'fa-scale-balanced',     color: '#06b6d4' },
  issuing:     { label: 'ฝ่ายออกสัญญา',          icon: 'fa-file-signature',     color: '#10b981' },
  accounting:  { label: 'ฝ่ายบัญชี',             icon: 'fa-calculator',         color: '#ec4899' },
  auction:     { label: 'ฝ่ายประมูลทรัพย์',      icon: 'fa-gavel',              color: '#f97316' },
  super_admin: { label: 'Super Admin',            icon: 'fa-crown',              color: '#ef4444' },
  manager:     { label: 'ผู้จัดการ',              icon: 'fa-crown',              color: '#ef4444' },
}

const STATUS_LABEL = {
  new: 'ลูกค้าใหม่', contacting: 'กำลังติดต่อ', incomplete: 'ข้อมูลไม่ครบ',
  awaiting_appraisal_fee: 'รอชำระค่าประเมิน', appraisal_scheduled: 'นัดประเมินแล้ว',
  appraisal_passed: 'ผ่านประเมิน', appraisal_not_passed: 'ไม่ผ่านประเมิน',
  pending_approve: 'รออนุมัติ', credit_approved: 'อนุมัติวงเงิน',
  pending_auction: 'รอประมูล', auction_completed: 'ประมูลสำเร็จ',
  preparing_docs: 'เตรียมเอกสาร', legal_scheduled: 'นัดนิติกรรม',
  legal_completed: 'นิติกรรมเสร็จ', completed: 'ปิดดีล', cancelled: 'ยกเลิก',
}
const STATUS_COLOR = {
  new: '#94a3b8', contacting: '#64748b', incomplete: '#f97316',
  awaiting_appraisal_fee: '#f59e0b', appraisal_scheduled: '#8b5cf6',
  appraisal_passed: '#22c55e', appraisal_not_passed: '#ef4444',
  pending_approve: '#6366f1', credit_approved: '#22c55e',
  pending_auction: '#f59e0b', auction_completed: '#16a34a',
  preparing_docs: '#14b8a6', legal_scheduled: '#0ea5e9',
  legal_completed: '#0284c7', completed: '#15803d', cancelled: '#9ca3af',
}
const LEAD_SOURCE_LABEL = {
  line: 'LINE', facebook: 'Facebook', referral: 'แนะนำต่อ',
  phone_in: 'โทรเข้า', website: 'เว็บไซต์', walk_in: 'Walk-in',
  agent: 'ผ่านนายหน้า', other: 'อื่นๆ', '': 'ไม่ระบุ',
}
const LEAD_SOURCE_COLOR = {
  line: '#00C300', facebook: '#1877F2', referral: '#9c27b0',
  phone_in: '#e65100', website: '#0288d1', walk_in: '#2e7d32',
  agent: '#795548', other: '#607d8b', '': '#bdbdbd',
}

// ─── Helpers ─────────────────────────────────────────────────
const fmt = n => n ? `฿${Number(n).toLocaleString('th-TH')}` : '฿0'
const fmtK = n => {
  if (!n) return '฿0'
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `฿${(n / 1_000).toFixed(0)}K`
  return `฿${Number(n).toLocaleString('th-TH')}`
}
const fmtDate = d => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'อรุณสวัสดิ์'
  if (h < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}
const useApi = (url) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!url) { setLoading(false); return }
    fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [url])
  return { data, loading }
}

// ─── Shared UI Components ─────────────────────────────────────
function StatCard({ icon, label, value, sub, color = '#3b82f6', onClick }) {
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px',
      border: `1.5px solid ${color}22`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s',
      display: 'flex', alignItems: 'center', gap: 14,
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}30` } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`fas ${icon}`} style={{ color, fontSize: 20 }}></i>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

function QueueCard({ icon, label, count, color, onClick, urgent }) {
  return (
    <div onClick={onClick} style={{
      background: urgent ? `${color}08` : '#fff', borderRadius: 12, padding: '14px 16px',
      border: `1.5px solid ${urgent ? color : color + '25'}`,
      cursor: onClick ? 'pointer' : 'default',
      display: 'flex', alignItems: 'center', gap: 12,
      transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = `${color}10` }}
      onMouseLeave={e => { e.currentTarget.style.background = urgent ? `${color}08` : '#fff' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`fas ${icon}`} style={{ color, fontSize: 17 }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{label}</div>
      </div>
      <span style={{
        fontWeight: 800, fontSize: 22, color: urgent && count > 0 ? color : count > 0 ? color : '#d1d5db',
        minWidth: 32, textAlign: 'right'
      }}>{count ?? '—'}</span>
      {urgent && count > 0 && (
        <span style={{ fontSize: 10, background: color, color: '#fff', borderRadius: 8, padding: '2px 7px', fontWeight: 700, flexShrink: 0 }}>รีบ!</span>
      )}
    </div>
  )
}

function SectionBox({ title, icon, color, children, action, actionLabel }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <i className={`fas ${icon}`} style={{ color }}></i>
          {title}
        </span>
        {action && actionLabel && (
          <button onClick={action} style={{
            fontSize: 11, color, background: `${color}12`, border: `1px solid ${color}30`,
            borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 700
          }}>{actionLabel}</button>
        )}
      </div>
      {children}
    </div>
  )
}

function CaseRow({ item, navigate }) {
  const sc = STATUS_COLOR[item.status] || '#94a3b8'
  const sl = STATUS_LABEL[item.status] || item.status
  return (
    <div onClick={() => navigate(`/sales/case/edit/${item.case_id}`)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
      borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
      onMouseLeave={e => { e.currentTarget.style.background = '' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.debtor_name || '-'}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.case_code} · {fmtDate(item.updated_at)}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: sc, background: `${sc}15`, borderRadius: 6, padding: '2px 7px' }}>{sl}</div>
        {(item.loan_amount > 0 || item.approved_amount > 0) && (
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{fmtK(item.approved_amount || item.loan_amount)}</div>
        )}
      </div>
    </div>
  )
}

function ExpiryRow({ item, navigate, linkTo }) {
  const days = item.days_remaining
  const urgent = days <= 14
  const warn = days <= 30
  const color = urgent ? '#ef4444' : warn ? '#f59e0b' : '#3b82f6'
  return (
    <div onClick={() => navigate(linkTo || `/legal/edit/${item.case_id}`)} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      borderRadius: 10, background: urgent ? '#fef2f2' : warn ? '#fffbeb' : '#eff6ff',
      border: `1.5px solid ${color}30`, cursor: 'pointer', marginBottom: 6, transition: 'all 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'column' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>{days}</span>
        <span style={{ fontSize: 9, color, lineHeight: 1 }}>วัน</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.debtor_name || '-'}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{item.case_code} · ครบ {fmtDate(item.contract_end_date)}{item.loan_amount ? ` · ${fmtK(item.loan_amount)}` : ''}</div>
      </div>
      {urgent && <span style={{ fontSize: 10, background: '#fecaca', color: '#ef4444', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>เร่งด่วน!</span>}
      {!urgent && warn && <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>ใกล้ครบ</span>}
    </div>
  )
}

function EmptyState({ icon = 'fa-inbox', text = 'ยังไม่มีรายการ' }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8' }}>
      <i className={`fas ${icon}`} style={{ fontSize: 28, display: 'block', marginBottom: 8 }}></i>
      <span style={{ fontSize: 12 }}>{text}</span>
    </div>
  )
}

function DashHeader({ dept, user, pendingChats, navigate }) {
  const d = DEPT[dept] || { label: dept, icon: 'fa-user', color: '#3b82f6' }
  return (
    <div style={{
      borderRadius: 16, padding: '20px 24px', marginBottom: 22,
      background: `linear-gradient(135deg, ${d.color}, ${d.color}cc)`,
      color: '#fff', display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: `0 6px 24px ${d.color}40`,
    }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`fas ${d.icon}`} style={{ fontSize: 24 }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{greeting()}, {user?.full_name || user?.username || 'ผู้ใช้งาน'}</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <i className="fas fa-building" style={{ marginRight: 3 }}></i>
          {d.label}
          {pendingChats > 0 && (
            <span onClick={() => navigate('/chat')} style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '2px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
              <i className="fas fa-comment-dots" style={{ marginRight: 4 }}></i>แชทค้าง {pendingChats} ห้อง
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* Quick action button — dept specific */}
        {dept === 'sales' && (
          <button onClick={() => navigate('/sales/select-type')} style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>เคสใหม่
          </button>
        )}
        {dept === 'appraisal' && (
          <button onClick={() => navigate('/appraisal')} style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <i className="fas fa-list" style={{ marginRight: 6 }}></i>คิวประเมิน
          </button>
        )}
        {dept === 'approval' && (
          <button onClick={() => navigate('/approval')} style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <i className="fas fa-list" style={{ marginRight: 6 }}></i>คิวอนุมัติ
          </button>
        )}
        {dept === 'legal' && (
          <button onClick={() => navigate('/legal')} style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <i className="fas fa-list" style={{ marginRight: 6 }}></i>คิวนิติกรรม
          </button>
        )}
        {dept === 'issuing' && (
          <button onClick={() => navigate('/issuing')} style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <i className="fas fa-list" style={{ marginRight: 6 }}></i>คิวออกสัญญา
          </button>
        )}
        {dept === 'accounting' && (
          <button onClick={() => navigate('/accounting')} style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <i className="fas fa-calculator" style={{ marginRight: 6 }}></i>ไปที่บัญชี
          </button>
        )}
        {dept === 'auction' && (
          <button onClick={() => navigate('/auction')} style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <i className="fas fa-gavel" style={{ marginRight: 6 }}></i>คิวประมูล
          </button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// 1. SALES DASHBOARD
// ══════════════════════════════════════════════════
function SalesDashboard({ myStats, navigate }) {
  const color = DEPT.sales.color
  const { data: kpi } = useApi(`${API}/sales/kpi`)
  const { data: followups } = useApi(`${API}/sales/followups/due`)

  const s = myStats?.summary || {}
  const recentCases = myStats?.recent_cases || []
  const expiring = myStats?.expiring || []
  const followupList = followups?.followups || []
  const todayFollowups = followupList.filter(f => {
    if (!f.due_date) return false
    const d = new Date(f.due_date)
    const today = new Date()
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  })

  // lead source weekly
  const sourceData = kpi?.weekly_by_source || []

  return (
    <div>
      {/* ─── Stat cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="fa-folder-open"   label="เคสทั้งหมดของฉัน"  value={s.total_cases ?? 0}        color={color} onClick={() => navigate('/sales')} />
        <StatCard icon="fa-spinner"       label="เคสที่ active"       value={s.active_cases ?? 0}       color="#6366f1" />
        <StatCard icon="fa-house-circle-check" label="ผ่านประเมิน"   value={s.appraisal_passed ?? 0}   color="#22c55e" onClick={() => navigate('/appraisal')} />
        <StatCard icon="fa-flag-checkered" label="ปิดดีลแล้ว"        value={s.completed_cases ?? 0}    color="#15803d" />
        <StatCard icon="fa-sack-dollar"   label="ยอดวงเงินรวม"       value={fmtK(s.total_loan_amount)} color="#f59e0b" sub="วงเงินทั้งหมดที่ดูแล" />
        <StatCard icon="fa-bell"          label="สัญญาใกล้ครบ"       value={expiring.length}            color={expiring.some(e=>e.days_remaining<=14)?'#ef4444':'#f59e0b'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 18, marginBottom: 20 }}>

        {/* ─── Pipeline เคส ─── */}
        <SectionBox title="Pipeline เคสของฉัน" icon="fa-timeline" color={color}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-clock"              label="รอชำระค่าประเมิน / นัดประเมิน" count={s.waiting_appraisal ?? 0} color="#8b5cf6" onClick={() => navigate('/appraisal')} />
            <QueueCard icon="fa-gavel"              label="รอประมูล / รออนุมัติ"          count={s.waiting_auction ?? 0}   color="#f59e0b" />
            <QueueCard icon="fa-scale-balanced"     label="รอนิติกรรม"                    count={s.waiting_legal ?? 0}     color="#06b6d4" onClick={() => navigate('/legal')} />
            <QueueCard icon="fa-file-signature"     label="รอออกสัญญา"                   count={s.waiting_issuing ?? 0}   color="#10b981" onClick={() => navigate('/issuing')} />
            <QueueCard icon="fa-house-circle-xmark" label="ไม่ผ่านประเมิน"               count={s.appraisal_not_passed ?? 0} color="#ef4444" />
          </div>
        </SectionBox>

        {/* ─── Follow-up วันนี้ ─── */}
        <SectionBox title={`นัด Follow-up วันนี้ (${todayFollowups.length})`} icon="fa-phone-flip" color="#3b82f6" action={() => navigate('/sales/followups')} actionLabel="ดูทั้งหมด">
          {todayFollowups.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มี follow-up วันนี้ 🎉" />
            : (
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {todayFollowups.slice(0, 8).map((f, i) => (
                  <div key={i} onClick={() => navigate(`/sales/case/edit/${f.case_id || ''}`)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    borderRadius: 8, cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0f9ff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.contact_name || f.case_code || '-'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{f.note || f.follow_type || 'follow-up'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </SectionBox>

        {/* ─── แหล่ง Lead 7 วัน ─── */}
        <SectionBox title="แหล่งที่มา Lead (7 วัน)" icon="fa-chart-pie" color="#6366f1" action={() => navigate('/sales/kpi')} actionLabel="ดู KPI">
          {sourceData.length === 0
            ? <EmptyState icon="fa-chart-pie" text="ยังไม่มีข้อมูล" />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sourceData.slice(0, 7).map((s, i) => {
                  const maxCnt = Math.max(...sourceData.map(x => x.cnt), 1)
                  const pct = Math.round((s.cnt / maxCnt) * 100)
                  const c = LEAD_SOURCE_COLOR[s.lead_source] || '#607d8b'
                  const lbl = LEAD_SOURCE_LABEL[s.lead_source] || s.lead_source || 'อื่นๆ'
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, marginRight: 6 }} />
                          {lbl}
                        </span>
                        <span style={{ fontSize: 12, color: c, fontWeight: 800 }}>{s.cnt}</span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </SectionBox>

        {/* ─── สัญญาใกล้ครบ ─── */}
        <SectionBox title="สัญญาใกล้ครบกำหนด" icon="fa-bell" color={expiring.some(e=>e.days_remaining<=14)?'#ef4444':'#f59e0b'}>
          {expiring.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มีสัญญาใกล้ครบ ✓" />
            : (
              <div style={{ maxHeight: 230, overflowY: 'auto' }}>
                {expiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} />)}
              </div>
            )}
        </SectionBox>
      </div>

      {/* ─── เคสล่าสุด ─── */}
      {recentCases.length > 0 && (
        <SectionBox title="เคสล่าสุดของฉัน" icon="fa-list-ul" color={color} action={() => navigate('/sales')} actionLabel="ดูทั้งหมด">
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {recentCases.slice(0, 12).map((item, i) => <CaseRow key={i} item={item} navigate={navigate} />)}
          </div>
        </SectionBox>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════
// 2. APPRAISAL DASHBOARD
// ══════════════════════════════════════════════════
function AppraisalDashboard({ myStats, navigate }) {
  const color = DEPT.appraisal.color
  const s = myStats?.summary || {}
  const appraisals = myStats?.appraisals || []
  const recentCases = myStats?.recent_cases || []
  const expiring = myStats?.expiring || []

  // นับสถิติจาก recent cases
  const waitingAppraisal = recentCases.filter(c => ['awaiting_appraisal_fee','appraisal_scheduled','appraisal_in_progress'].includes(c.status)).length
  const passedAppraisal  = recentCases.filter(c => c.status === 'appraisal_passed').length
  const failedAppraisal  = recentCases.filter(c => c.status === 'appraisal_not_passed').length

  const passRate = (passedAppraisal + failedAppraisal) > 0
    ? Math.round((passedAppraisal / (passedAppraisal + failedAppraisal)) * 100)
    : null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="fa-clock"              label="รอการประเมิน"   value={s.waiting_appraisal ?? 0}    color="#f59e0b" onClick={() => navigate('/appraisal')} urgent />
        <StatCard icon="fa-house-circle-check" label="ผ่านประเมิน"    value={s.appraisal_passed ?? 0}     color="#22c55e" />
        <StatCard icon="fa-house-circle-xmark" label="ไม่ผ่านประเมิน" value={s.appraisal_not_passed ?? 0} color="#ef4444" />
        <StatCard icon="fa-folder-open"        label="เคสทั้งหมด"     value={s.total_cases ?? 0}          color={color} />
        <StatCard icon="fa-percent"            label="อัตราผ่าน"       value={passRate !== null ? `${passRate}%` : '—'} color="#3b82f6" sub="จากเคสที่มีผลแล้ว" />
        <StatCard icon="fa-sack-dollar"        label="ราคาประเมินรวม"  value={fmtK(s.total_loan_amount)}  color="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 18, marginBottom: 20 }}>

        {/* ─── คิวรอประเมิน ─── */}
        <SectionBox title="คิวประเมิน" icon="fa-clock" color="#f59e0b" action={() => navigate('/appraisal')} actionLabel="เปิดคิว">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-money-bill"       label="รอชำระค่าประเมิน"   count={recentCases.filter(c=>c.status==='awaiting_appraisal_fee').length} color="#f59e0b" onClick={() => navigate('/appraisal')} urgent />
            <QueueCard icon="fa-calendar-check"   label="นัดประเมินแล้ว"     count={recentCases.filter(c=>c.status==='appraisal_scheduled').length}    color="#8b5cf6" onClick={() => navigate('/appraisal')} />
            <QueueCard icon="fa-house-circle-check" label="ผ่านประเมิน (รอต่อ)" count={recentCases.filter(c=>c.status==='appraisal_passed').length}   color="#22c55e" />
            <QueueCard icon="fa-house-circle-xmark" label="ไม่ผ่าน (ปิดเคส)"  count={recentCases.filter(c=>c.status==='appraisal_not_passed').length} color="#ef4444" />
          </div>
        </SectionBox>

        {/* ─── ราคาประเมินล่าสุด ─── */}
        <SectionBox title="ราคาประเมินล่าสุด" icon="fa-chart-bar" color={color} action={() => navigate('/appraisal')} actionLabel="ดูทั้งหมด">
          {appraisals.length === 0
            ? <EmptyState icon="fa-search-dollar" text="ยังไม่มีผลประเมิน" />
            : (
              <div style={{ maxHeight: 230, overflowY: 'auto' }}>
                {appraisals.slice(0, 8).map((a, i) => (
                  <div key={i} onClick={() => navigate(a.case_id ? `/appraisal/edit/${a.lr_id}` : `/sales/edit/${a.lr_id}`)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    borderRadius: 8, cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.debtor_name || '-'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{[a.district, a.province].filter(Boolean).join(' / ') || '-'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#8b5cf6' }}>{fmtK(a.estimated_value)}</div>
                      <div style={{ fontSize: 10, marginTop: 2 }}>
                        {a.appraisal_result === 'passed'
                          ? <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 5, padding: '1px 6px', fontWeight: 700 }}>✓ ผ่าน</span>
                          : a.appraisal_result === 'not_passed'
                            ? <span style={{ background: '#fecaca', color: '#dc2626', borderRadius: 5, padding: '1px 6px', fontWeight: 700 }}>✗ ไม่ผ่าน</span>
                            : <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 5, padding: '1px 6px', fontWeight: 700 }}>รอผล</span>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </SectionBox>

        {/* ─── สัญญาใกล้ครบ ─── */}
        <SectionBox title="สัญญาใกล้ครบกำหนด" icon="fa-bell" color="#f59e0b">
          {expiring.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มีสัญญาใกล้ครบ ✓" />
            : <div style={{ maxHeight: 230, overflowY: 'auto' }}>{expiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// 3. APPROVAL DASHBOARD
// ══════════════════════════════════════════════════
function ApprovalDashboard({ myStats, navigate }) {
  const color = DEPT.approval.color
  const s = myStats?.summary || {}
  const recentCases = myStats?.recent_cases || []
  const expiring = myStats?.expiring || []

  const approvalQueue = recentCases.filter(c => c.status === 'pending_approve').length
  const approved      = recentCases.filter(c => ['credit_approved','pending_auction','preparing_docs','legal_scheduled','legal_completed','auction_completed','completed'].includes(c.status)).length
  const totalApproved = recentCases.reduce((acc, c) => acc + (c.approved_amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="fa-hourglass-half"  label="รออนุมัติ"        value={approvalQueue}          color={color}     onClick={() => navigate('/approval')} />
        <StatCard icon="fa-circle-check"    label="ผ่านการอนุมัติ"   value={approved}               color="#22c55e" />
        <StatCard icon="fa-folder-open"     label="เคสทั้งหมด"       value={s.total_cases ?? 0}     color="#6366f1" />
        <StatCard icon="fa-sack-dollar"     label="ยอดวงเงินอนุมัติ" value={fmtK(totalApproved)}    color="#f59e0b" sub="จากเคสที่อนุมัติ" />
        <StatCard icon="fa-house-circle-check" label="ผ่านประเมิน"   value={s.appraisal_passed ?? 0} color="#8b5cf6" onClick={() => navigate('/appraisal')} />
        <StatCard icon="fa-gavel"           label="รอประมูล"          value={s.waiting_auction ?? 0} color="#f97316" onClick={() => navigate('/auction')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 18, marginBottom: 20 }}>

        {/* ─── คิวอนุมัติ ─── */}
        <SectionBox title="Pipeline อนุมัติ" icon="fa-timeline" color={color}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-hourglass-half"  label="รออนุมัติ"            count={recentCases.filter(c=>c.status==='pending_approve').length}                                                          color={color}    onClick={() => navigate('/approval')} urgent />
            <QueueCard icon="fa-circle-check"    label="อนุมัติวงเงินแล้ว"   count={recentCases.filter(c=>c.status==='credit_approved').length}                                                           color="#22c55e"  />
            <QueueCard icon="fa-gavel"           label="รอประมูล"             count={recentCases.filter(c=>c.status==='pending_auction').length}                                                           color="#f59e0b"  onClick={() => navigate('/auction')} />
            <QueueCard icon="fa-scale-balanced"  label="รอนิติกรรม"          count={recentCases.filter(c=>['preparing_docs','legal_scheduled'].includes(c.status)).length}                                color="#06b6d4"  onClick={() => navigate('/legal')} />
            <QueueCard icon="fa-flag-checkered"  label="เสร็จสิ้น"           count={recentCases.filter(c=>['auction_completed','completed'].includes(c.status)).length}                                   color="#15803d"  />
          </div>
        </SectionBox>

        {/* ─── เคสล่าสุด ─── */}
        <SectionBox title="เคสล่าสุด" icon="fa-list-ul" color={color} action={() => navigate('/approval')} actionLabel="ดูทั้งหมด">
          {recentCases.length === 0
            ? <EmptyState icon="fa-inbox" text="ยังไม่มีเคส" />
            : <div style={{ maxHeight: 240, overflowY: 'auto' }}>{recentCases.slice(0, 10).map((item, i) => <CaseRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>

        {/* ─── สัญญาใกล้ครบ ─── */}
        <SectionBox title="สัญญาใกล้ครบกำหนด" icon="fa-bell" color="#f59e0b">
          {expiring.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มีสัญญาใกล้ครบ ✓" />
            : <div style={{ maxHeight: 230, overflowY: 'auto' }}>{expiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>

        {/* ─── นายทุน ─── */}
        <SectionBox title="จัดการนายทุน" icon="fa-hand-holding-usd" color="#6366f1" action={() => navigate('/investors')} actionLabel="ดูนายทุน">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-hand-holding-usd" label="จัดการนายทุน"       count={null} color="#6366f1" onClick={() => navigate('/investors')} />
            <QueueCard icon="fa-gavel"            label="ประวัตินายทุนประมูล" count={null} color="#f97316" onClick={() => navigate('/investor-auction-history')} />
          </div>
        </SectionBox>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// 4. LEGAL DASHBOARD
// ══════════════════════════════════════════════════
function LegalDashboard({ myStats, navigate }) {
  const color = DEPT.legal.color
  const s = myStats?.summary || {}
  const recentCases = myStats?.recent_cases || []
  const expiring = myStats?.expiring || []

  const urgentExpiring = expiring.filter(e => e.days_remaining <= 14)
  const warnExpiring   = expiring.filter(e => e.days_remaining > 14 && e.days_remaining <= 30)

  const legalQueue      = recentCases.filter(c => ['preparing_docs','legal_scheduled'].includes(c.status)).length
  const legalCompleted  = recentCases.filter(c => c.status === 'legal_completed').length
  const issuingPending  = recentCases.filter(c => c.status === 'legal_completed').length

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="fa-scale-balanced"  label="รอนิติกรรม"        value={legalQueue}            color={color}    onClick={() => navigate('/legal')} />
        <StatCard icon="fa-check-circle"    label="นิติกรรมเสร็จ"      value={legalCompleted}        color="#22c55e" />
        <StatCard icon="fa-triangle-exclamation" label="สัญญาเร่งด่วน"  value={urgentExpiring.length} color="#ef4444" />
        <StatCard icon="fa-bell"            label="สัญญาใกล้ครบ 30 วัน" value={warnExpiring.length}   color="#f59e0b" />
        <StatCard icon="fa-folder-open"     label="เคสทั้งหมด"         value={s.total_cases ?? 0}   color="#6366f1" />
        <StatCard icon="fa-file-signature"  label="รอออกสัญญา"         value={issuingPending}        color="#10b981" onClick={() => navigate('/issuing')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 18, marginBottom: 20 }}>

        {/* ─── สัญญาเร่งด่วน ─── */}
        <SectionBox title={`สัญญาครบกำหนด — เร่งด่วน (${urgentExpiring.length})`} icon="fa-triangle-exclamation" color="#ef4444">
          {urgentExpiring.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มีสัญญาเร่งด่วน ✓" />
            : <div style={{ maxHeight: 240, overflowY: 'auto' }}>{urgentExpiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>

        {/* ─── สัญญาใกล้ครบ 30–60 วัน ─── */}
        <SectionBox title="สัญญาครบกำหนด 30–60 วัน" icon="fa-bell" color="#f59e0b">
          {warnExpiring.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มีสัญญาใกล้ครบ ✓" />
            : <div style={{ maxHeight: 240, overflowY: 'auto' }}>{warnExpiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>

        {/* ─── คิวนิติกรรม ─── */}
        <SectionBox title="คิวนิติกรรม" icon="fa-timeline" color={color} action={() => navigate('/legal')} actionLabel="เปิดคิว">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-file-alt"       label="เตรียมเอกสาร"     count={recentCases.filter(c=>c.status==='preparing_docs').length}   color="#64748b" onClick={() => navigate('/legal')} />
            <QueueCard icon="fa-calendar-check" label="นัดนิติกรรมแล้ว"  count={recentCases.filter(c=>c.status==='legal_scheduled').length}  color={color}   onClick={() => navigate('/legal')} urgent />
            <QueueCard icon="fa-check-circle"   label="นิติกรรมเสร็จสิ้น" count={recentCases.filter(c=>c.status==='legal_completed').length} color="#22c55e" />
          </div>
        </SectionBox>

        {/* ─── เคสล่าสุด ─── */}
        <SectionBox title="เคสล่าสุด" icon="fa-list-ul" color={color} action={() => navigate('/legal')} actionLabel="ดูทั้งหมด">
          {recentCases.length === 0
            ? <EmptyState icon="fa-inbox" text="ยังไม่มีเคส" />
            : <div style={{ maxHeight: 230, overflowY: 'auto' }}>{recentCases.slice(0, 10).map((item, i) => <CaseRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// 5. ISSUING DASHBOARD
// ══════════════════════════════════════════════════
function IssuingDashboard({ myStats, navigate }) {
  const color = DEPT.issuing.color
  const s = myStats?.summary || {}
  const recentCases = myStats?.recent_cases || []
  const expiring = myStats?.expiring || []

  const issuingQueue    = recentCases.filter(c => c.status === 'legal_completed').length
  const completed       = recentCases.filter(c => ['auction_completed','completed'].includes(c.status)).length
  const urgentExpiring  = expiring.filter(e => e.days_remaining <= 14)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="fa-file-signature"  label="รอออกสัญญา"        value={issuingQueue}           color={color}    onClick={() => navigate('/issuing')} />
        <StatCard icon="fa-flag-checkered"  label="ออกสัญญาแล้ว"      value={completed}              color="#22c55e" />
        <StatCard icon="fa-folder-open"     label="เคสทั้งหมด"        value={s.total_cases ?? 0}    color="#6366f1" />
        <StatCard icon="fa-sack-dollar"     label="ยอดวงเงินรวม"      value={fmtK(s.total_loan_amount)} color="#f59e0b" />
        <StatCard icon="fa-triangle-exclamation" label="สัญญาเร่งด่วน" value={urgentExpiring.length} color="#ef4444" />
        <StatCard icon="fa-bell"            label="สัญญาใกล้ครบ 60 วัน" value={expiring.length}      color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 18, marginBottom: 20 }}>

        {/* ─── คิวออกสัญญา ─── */}
        <SectionBox title="คิวออกสัญญา" icon="fa-file-signature" color={color} action={() => navigate('/issuing')} actionLabel="เปิดคิว">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-file-signature"  label="รอออกสัญญา (นิติกรรมเสร็จ)"  count={recentCases.filter(c=>c.status==='legal_completed').length}             color={color}   onClick={() => navigate('/issuing')} urgent />
            <QueueCard icon="fa-gavel"           label="ประมูลสำเร็จ / ปิดดีล"        count={recentCases.filter(c=>['auction_completed','completed'].includes(c.status)).length} color="#15803d" />
            <QueueCard icon="fa-times-circle"    label="ยกเลิก"                       count={recentCases.filter(c=>c.status==='cancelled').length}                    color="#9ca3af" onClick={() => navigate('/cancellation')} />
          </div>
        </SectionBox>

        {/* ─── สัญญาใกล้ครบ ─── */}
        <SectionBox title="แจ้งเตือนสัญญาครบกำหนด" icon="fa-bell" color={urgentExpiring.length > 0 ? '#ef4444' : '#f59e0b'}>
          {expiring.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มีสัญญาใกล้ครบ ✓" />
            : <div style={{ maxHeight: 240, overflowY: 'auto' }}>{expiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} linkTo={`/issuing/edit/${item.case_id}`} />)}</div>}
        </SectionBox>

        {/* ─── เคสล่าสุด ─── */}
        <SectionBox title="เคสล่าสุด" icon="fa-list-ul" color={color} action={() => navigate('/issuing')} actionLabel="ดูทั้งหมด">
          {recentCases.length === 0
            ? <EmptyState icon="fa-inbox" text="ยังไม่มีเคส" />
            : <div style={{ maxHeight: 230, overflowY: 'auto' }}>{recentCases.slice(0, 10).map((item, i) => <CaseRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// 6. ACCOUNTING DASHBOARD
// ══════════════════════════════════════════════════
function AccountingDashboard({ myStats, navigate }) {
  const color = DEPT.accounting.color
  const s = myStats?.summary || {}
  const recentCases = myStats?.recent_cases || []
  const expiring = myStats?.expiring || []

  const urgentExpiring = expiring.filter(e => e.days_remaining <= 14)
  const activeLoans    = recentCases.filter(c => !['cancelled','completed','auction_completed','appraisal_not_passed'].includes(c.status)).length
  const completedLoans = recentCases.filter(c => ['completed','auction_completed'].includes(c.status)).length
  const totalLoan      = recentCases.reduce((a, c) => a + (c.loan_amount || 0), 0)
  const totalApproved  = recentCases.reduce((a, c) => a + (c.approved_amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="fa-folder-open"      label="เคสทั้งหมด"         value={s.total_cases ?? 0}       color={color}    onClick={() => navigate('/accounting')} />
        <StatCard icon="fa-spinner"          label="เคส Active"          value={activeLoans}              color="#6366f1" />
        <StatCard icon="fa-flag-checkered"   label="ปิดดีลแล้ว"          value={completedLoans}           color="#22c55e" />
        <StatCard icon="fa-sack-dollar"      label="ยอดวงเงินทั้งหมด"   value={fmtK(s.total_loan_amount || totalLoan)} color="#f59e0b" sub="วงเงินทุกเคส" />
        <StatCard icon="fa-check-double"     label="วงเงินอนุมัติ"       value={fmtK(s.total_approved_amount || totalApproved)} color="#10b981" />
        <StatCard icon="fa-triangle-exclamation" label="สัญญาเร่งด่วน"  value={urgentExpiring.length}    color="#ef4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 18, marginBottom: 20 }}>

        {/* ─── Quick Links ─── */}
        <SectionBox title="เมนูหลัก" icon="fa-calculator" color={color}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-calculator"       label="ไปที่หน้าบัญชี"       count={null} color={color}   onClick={() => navigate('/accounting')} />
            <QueueCard icon="fa-hand-holding-usd" label="จัดการนายทุน"         count={null} color="#6366f1" onClick={() => navigate('/investors')} />
            <QueueCard icon="fa-gavel"            label="ประวัตินายทุนประมูล"   count={null} color="#f97316" onClick={() => navigate('/investor-auction-history')} />
            <QueueCard icon="fa-money-bill-trend-up" label="ประวัติถอนเงิน"    count={null} color="#10b981" onClick={() => navigate('/withdrawal-history')} />
          </div>
        </SectionBox>

        {/* ─── สัญญาใกล้ครบ ─── */}
        <SectionBox title="สัญญาใกล้ครบกำหนด" icon="fa-bell" color={urgentExpiring.length > 0 ? '#ef4444' : '#f59e0b'}>
          {expiring.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มีสัญญาใกล้ครบ ✓" />
            : <div style={{ maxHeight: 240, overflowY: 'auto' }}>{expiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>

        {/* ─── เคสล่าสุด ─── */}
        <SectionBox title="เคสล่าสุด" icon="fa-list-ul" color={color} action={() => navigate('/accounting')} actionLabel="ดูทั้งหมด">
          {recentCases.length === 0
            ? <EmptyState icon="fa-inbox" text="ยังไม่มีเคส" />
            : <div style={{ maxHeight: 230, overflowY: 'auto' }}>{recentCases.slice(0, 10).map((item, i) => <CaseRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// 7. AUCTION DASHBOARD
// ══════════════════════════════════════════════════
function AuctionDashboard({ myStats, navigate }) {
  const color = DEPT.auction.color
  const s = myStats?.summary || {}
  const recentCases = myStats?.recent_cases || []
  const expiring = myStats?.expiring || []

  const auctionQueue    = recentCases.filter(c => ['pending_auction','credit_approved'].includes(c.status)).length
  const auctionDone     = recentCases.filter(c => c.status === 'auction_completed').length
  const completed       = recentCases.filter(c => c.status === 'completed').length
  const totalAuctioned  = recentCases.filter(c => ['auction_completed','completed'].includes(c.status)).reduce((a, c) => a + (c.approved_amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="fa-gavel"           label="รอประมูล"       value={auctionQueue}         color={color}    onClick={() => navigate('/auction')} />
        <StatCard icon="fa-handshake"       label="ประมูลสำเร็จ"   value={auctionDone}          color="#22c55e" />
        <StatCard icon="fa-flag-checkered"  label="ปิดดีลแล้ว"    value={completed}             color="#15803d" />
        <StatCard icon="fa-folder-open"     label="เคสทั้งหมด"    value={s.total_cases ?? 0}   color="#6366f1" />
        <StatCard icon="fa-sack-dollar"     label="ยอดประมูลรวม"  value={fmtK(totalAuctioned)} color="#f59e0b" sub="วงเงินที่ประมูลสำเร็จ" />
        <StatCard icon="fa-hand-holding-usd" label="นายทุน"       value={null}                  color="#8b5cf6" onClick={() => navigate('/investors')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 18, marginBottom: 20 }}>

        {/* ─── คิวประมูล ─── */}
        <SectionBox title="คิวประมูล" icon="fa-gavel" color={color} action={() => navigate('/auction')} actionLabel="เปิดคิว">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-gavel"             label="รอประมูล"           count={auctionQueue}                                                                                                          color={color}   onClick={() => navigate('/auction')} urgent />
            <QueueCard icon="fa-handshake"         label="ประมูลสำเร็จ"       count={auctionDone}                                                                                                           color="#22c55e" />
            <QueueCard icon="fa-hand-holding-usd"  label="จัดการนายทุน"      count={null}                                                                                                                  color="#6366f1" onClick={() => navigate('/investors')} />
            <QueueCard icon="fa-clock-rotate-left" label="ประวัติประมูล"      count={null}                                                                                                                  color="#8b5cf6" onClick={() => navigate('/investor-auction-history')} />
          </div>
        </SectionBox>

        {/* ─── เคสรอประมูล ─── */}
        <SectionBox title="เคสรอประมูล" icon="fa-list-ul" color={color} action={() => navigate('/auction')} actionLabel="ดูทั้งหมด">
          {recentCases.filter(c => ['pending_auction','credit_approved'].includes(c.status)).length === 0
            ? <EmptyState icon="fa-gavel" text="ไม่มีเคสรอประมูล" />
            : (
              <div style={{ maxHeight: 230, overflowY: 'auto' }}>
                {recentCases.filter(c => ['pending_auction','credit_approved'].includes(c.status)).slice(0, 10).map((item, i) => <CaseRow key={i} item={item} navigate={navigate} />)}
              </div>
            )}
        </SectionBox>

        {/* ─── สัญญาใกล้ครบ ─── */}
        <SectionBox title="สัญญาใกล้ครบกำหนด" icon="fa-bell" color="#f59e0b">
          {expiring.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มีสัญญาใกล้ครบ ✓" />
            : <div style={{ maxHeight: 230, overflowY: 'auto' }}>{expiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════
// 8. ADMIN / MANAGER DASHBOARD
// ══════════════════════════════════════════════════
function AdminDashboard({ myStats, navigate }) {
  const color = '#ef4444'
  const { data: daily } = useApi(`${API}/dashboard/daily-report`)
  const s = myStats?.summary || {}
  const expiring = myStats?.expiring || []
  const recentCases = myStats?.recent_cases || []
  const pendingChats = myStats?.pending_chats || 0

  const today = daily?.today || {}
  const pipeline = daily?.pipeline || {}
  const revenue = daily?.revenue || {}

  function DeltaBadge({ pct }) {
    if (pct === undefined || pct === null) return null
    const pos = pct >= 0
    return (
      <span style={{ fontSize: 10, fontWeight: 700, color: pos ? '#22c55e' : '#ef4444', background: pos ? '#dcfce7' : '#fecaca', borderRadius: 6, padding: '1px 6px', marginLeft: 6 }}>
        {pos ? '▲' : '▼'} {Math.abs(pct)}%
      </span>
    )
  }

  return (
    <div>
      {/* ─── วันนี้ ─── */}
      <div style={{ marginBottom: 10, fontWeight: 700, fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 7 }}>
        <i className="fas fa-sun" style={{ color: '#f59e0b' }}></i> ภาพรวมวันนี้
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon="fa-user-plus"        label="Lead ใหม่วันนี้"      value={today.leads ?? 0}          color="#3b82f6" sub={<DeltaBadge pct={today.leads_pct} />} />
        <StatCard icon="fa-folder-plus"      label="เคสใหม่วันนี้"         value={today.new_cases ?? 0}      color="#6366f1" sub={<DeltaBadge pct={today.new_cases_pct} />} />
        <StatCard icon="fa-circle-check"     label="อนุมัติวันนี้"         value={today.approved ?? 0}       color="#f59e0b" sub={<DeltaBadge pct={today.approved_pct} />} />
        <StatCard icon="fa-flag-checkered"   label="ปิดดีลวันนี้"          value={today.completed ?? 0}      color="#22c55e" sub={<DeltaBadge pct={today.completed_pct} />} />
        <StatCard icon="fa-file-signature"   label="ออกสัญญาวันนี้"        value={today.issuing_done ?? 0}   color="#10b981" />
        <StatCard icon="fa-scale-balanced"   label="นิติกรรมเสร็จวันนี้"   value={today.legal_done ?? 0}     color="#06b6d4" />
        <StatCard icon="fa-gavel"            label="ประมูลสำเร็จวันนี้"    value={today.auction_cnt ?? 0}    color="#f97316" />
        <StatCard icon="fa-times-circle"     label="ยกเลิกวันนี้"          value={today.cancelled ?? 0}     color="#9ca3af" />
      </div>

      {/* ─── Pipeline ระบบ + รายได้ ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 18, marginBottom: 20 }}>
        <SectionBox title="Pipeline ทั้งระบบ" icon="fa-timeline" color={color}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-headset"         label="ฝ่ายขาย (เคส active)"   count={pipeline.sales ?? 0}    color="#3b82f6" onClick={() => navigate('/sales')} />
            <QueueCard icon="fa-house-circle-check" label="ฝ่ายประเมิน (รอผล)"  count={pipeline.appraisal ?? 0} color="#8b5cf6" onClick={() => navigate('/appraisal')} />
            <QueueCard icon="fa-circle-check"    label="ฝ่ายอนุมัติ (รอ)"       count={pipeline.approval ?? 0} color="#f59e0b" onClick={() => navigate('/approval')} />
            <QueueCard icon="fa-scale-balanced"  label="ฝ่ายนิติกรรม (รอ)"      count={pipeline.legal ?? 0}    color="#06b6d4" onClick={() => navigate('/legal')} />
            <QueueCard icon="fa-file-signature"  label="ฝ่ายออกสัญญา (รอ)"     count={pipeline.issuing ?? 0}  color="#10b981" onClick={() => navigate('/issuing')} />
            <QueueCard icon="fa-gavel"           label="ฝ่ายประมูล (รอ)"        count={pipeline.auction ?? 0}  color="#f97316" onClick={() => navigate('/auction')} />
          </div>
        </SectionBox>

        {/* ─── รายได้โดยประมาณ ─── */}
        <SectionBox title="ประมาณการรายได้ (พอร์ตปัจจุบัน)" icon="fa-chart-line" color="#22c55e">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'วงเงินลงทุนรวม', value: fmtK(revenue.total_invested), icon: 'fa-sack-dollar', color: '#6366f1' },
              { label: 'ดอกเบี้ยเฉลี่ย/ปี', value: revenue.avg_rate ? `${Number(revenue.avg_rate).toFixed(1)}%` : '—', icon: 'fa-percent', color: '#f59e0b' },
              { label: 'รายได้ประมาณ/เดือน', value: fmtK(revenue.estimated_monthly), icon: 'fa-calendar-alt', color: '#22c55e' },
              { label: 'รายได้ประมาณ/ปี', value: fmtK(revenue.estimated_annual), icon: 'fa-chart-line', color: '#10b981' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: `${r.color}08`, borderRadius: 10, border: `1px solid ${r.color}20` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${r.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fas ${r.icon}`} style={{ color: r.color, fontSize: 16 }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{r.label}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: r.color }}>{r.value}</div>
              </div>
            ))}
          </div>
        </SectionBox>

        {/* ─── สัญญาใกล้ครบ ─── */}
        <SectionBox title="สัญญาใกล้ครบกำหนด (60 วัน)" icon="fa-bell" color={expiring.some(e=>e.days_remaining<=14)?'#ef4444':'#f59e0b'}>
          {expiring.length === 0
            ? <EmptyState icon="fa-check-circle" text="ไม่มีสัญญาใกล้ครบ ✓" />
            : <div style={{ maxHeight: 240, overflowY: 'auto' }}>{expiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} />)}</div>}
        </SectionBox>

        {/* ─── Quick Links ─── */}
        <SectionBox title="จัดการระบบ" icon="fa-crown" color={color}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <QueueCard icon="fa-crown"         label="CEO Dashboard"         count={null} color="#ef4444" onClick={() => navigate('/ceo-dashboard')} />
            <QueueCard icon="fa-chart-bar"     label="รายงานประจำวัน"        count={null} color="#6366f1" onClick={() => navigate('/daily-report')} />
            <QueueCard icon="fa-calendar-week" label="รายงานประจำสัปดาห์"    count={null} color="#8b5cf6" onClick={() => navigate('/weekly-report')} />
            <QueueCard icon="fa-shield-alt"    label="จัดการแอคเคาท์"        count={null} color="#64748b" onClick={() => navigate('/account-user')} />
            <QueueCard icon="fa-comments"      label="แชทค้าง"               count={pendingChats || null} color="#3b82f6" onClick={() => navigate('/chat')} urgent={pendingChats > 0} />
          </div>
        </SectionBox>
      </div>

      {/* ─── เคสล่าสุด ─── */}
      {recentCases.length > 0 && (
        <SectionBox title="เคสล่าสุดทั้งระบบ" icon="fa-list-ul" color={color} action={() => navigate('/sales')} actionLabel="ดูทั้งหมด">
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {recentCases.slice(0, 15).map((item, i) => <CaseRow key={i} item={item} navigate={navigate} />)}
          </div>
        </SectionBox>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════
// MAIN DashboardPage — routes to dept sub-dashboard
// ══════════════════════════════════════════════════
export default function DashboardPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const dept = user?.department || 'super_admin'
  const { data: myStats, loading } = useApi(`${API}/dashboard/my-stats`)

  const pendingChats = myStats?.pending_chats || 0

  if (loading) {
    const d = DEPT[dept] || { color: '#3b82f6' }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: d.color }}></i>
        <span style={{ color: '#94a3b8', fontSize: 14 }}>กำลังโหลด Dashboard...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 1100, margin: '0 auto' }}>
      <DashHeader dept={dept} user={user} pendingChats={pendingChats} navigate={navigate} />

      {dept === 'sales'       && <SalesDashboard      myStats={myStats} navigate={navigate} />}
      {dept === 'appraisal'   && <AppraisalDashboard  myStats={myStats} navigate={navigate} />}
      {dept === 'approval'    && <ApprovalDashboard   myStats={myStats} navigate={navigate} />}
      {dept === 'legal'       && <LegalDashboard      myStats={myStats} navigate={navigate} />}
      {dept === 'issuing'     && <IssuingDashboard    myStats={myStats} navigate={navigate} />}
      {dept === 'accounting'  && <AccountingDashboard myStats={myStats} navigate={navigate} />}
      {dept === 'auction'     && <AuctionDashboard    myStats={myStats} navigate={navigate} />}
      {(dept === 'super_admin' || dept === 'manager') && <AdminDashboard myStats={myStats} navigate={navigate} />}

      {/* fallback: dept ที่ไม่รู้จัก */}
      {!['sales','appraisal','approval','legal','issuing','accounting','auction','super_admin','manager'].includes(dept) && (
        <AdminDashboard myStats={myStats} navigate={navigate} />
      )}
    </div>
  )
}

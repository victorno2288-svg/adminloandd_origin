import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'

const token = () => localStorage.getItem('loandd_admin')

// ── Department labels ──
const DEPT_LABEL = {
  sales: 'ฝ่ายขาย', appraisal: 'ฝ่ายประเมิน', approval: 'ฝ่ายอนุมัติ',
  legal: 'ฝ่ายนิติกรรม', issuing: 'ฝ่ายออกสัญญา', accounting: 'ฝ่ายบัญชี',
  auction: 'ฝ่ายประมูล', super_admin: 'Super Admin', manager: 'ผู้จัดการ',
}
const DEPT_COLOR = {
  sales: '#3b82f6', appraisal: '#8b5cf6', approval: '#f59e0b',
  legal: '#06b6d4', issuing: '#10b981', accounting: '#ec4899',
  auction: '#f97316', super_admin: '#ef4444', manager: '#ef4444',
}
const DEPT_ICON = {
  sales: 'fa-handshake', appraisal: 'fa-house-circle-check', approval: 'fa-circle-check',
  legal: 'fa-scale-balanced', issuing: 'fa-file-signature', accounting: 'fa-calculator',
  auction: 'fa-gavel', super_admin: 'fa-crown', manager: 'fa-crown',
}

// ── Status labels / colors ──
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

function fmt(n) { return n ? `฿${Number(n).toLocaleString('th-TH')}` : '฿0' }
function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'อรุณสวัสดิ์'
  if (h < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}

// ── Stat Card ──
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
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Pipeline Row ──
function PipelineCard({ icon, label, count, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 12, padding: '14px 16px',
      border: `1.5px solid ${color}22`, cursor: onClick ? 'pointer' : 'default',
      display: 'flex', alignItems: 'center', gap: 12,
      transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = `${color}08` }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`fas ${icon}`} style={{ color, fontSize: 16 }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      </div>
      <span style={{ fontWeight: 800, fontSize: 20, color, minWidth: 28, textAlign: 'right' }}>{count}</span>
    </div>
  )
}

// ── Expiry Alert Row ──
function ExpiryRow({ item, navigate }) {
  const days = item.days_remaining
  const urgent = days <= 14
  const warn = days <= 30
  const color = urgent ? '#ef4444' : warn ? '#f59e0b' : '#3b82f6'
  return (
    <div onClick={() => navigate(`/legal/edit/${item.case_id}`)} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      borderRadius: 10, background: urgent ? '#fef2f2' : warn ? '#fffbeb' : '#eff6ff',
      border: `1.5px solid ${color}30`, cursor: 'pointer', marginBottom: 6,
      transition: 'all 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = '' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'column' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>{days}</span>
        <span style={{ fontSize: 9, color, lineHeight: 1 }}>วัน</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.debtor_name || '-'}
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          {item.case_code} · ครบ {fmtDate(item.contract_end_date)}
          {item.loan_amount ? ` · ${fmt(item.loan_amount)}` : ''}
        </div>
      </div>
      {urgent && <span style={{ fontSize: 10, background: '#fecaca', color: '#ef4444', borderRadius: 6, padding: '2px 7px', fontWeight: 700, flexShrink: 0 }}>เร่งด่วน!</span>}
      {!urgent && warn && <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', borderRadius: 6, padding: '2px 7px', fontWeight: 700, flexShrink: 0 }}>ใกล้ครบ</span>}
    </div>
  )
}

// ── Recent Case Row ──
function CaseRow({ item, navigate }) {
  const statusColor = STATUS_COLOR[item.status] || '#94a3b8'
  const statusLabel = STATUS_LABEL[item.status] || item.status
  return (
    <div onClick={() => navigate(`/sales/case/edit/${item.case_id}`)} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
      borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
      onMouseLeave={e => { e.currentTarget.style.background = '' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.debtor_name || '-'}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.case_code}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: `${statusColor}15`, borderRadius: 6, padding: '2px 7px' }}>{statusLabel}</div>
        {item.loan_amount > 0 && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{fmt(item.loan_amount)}</div>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = getCurrentUser()
  const dept = user?.department || 'unknown'
  const deptColor = DEPT_COLOR[dept] || '#3b82f6'
  const deptLabel = DEPT_LABEL[dept] || dept
  const deptIcon = DEPT_ICON[dept] || 'fa-user'

  useEffect(() => {
    fetch('/api/admin/dashboard/my-stats', {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: deptColor }}></i>
      <span style={{ color: '#94a3b8', fontSize: 14 }}>กำลังโหลดข้อมูล...</span>
    </div>
  )

  const s = data?.summary || {}
  const expiring = data?.expiring || []
  const recentCases = data?.recent_cases || []
  const appraisals = data?.appraisals || []
  const pendingChats = data?.pending_chats || 0

  return (
    <div style={{ padding: '20px 16px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{
        borderRadius: 16, padding: '20px 24px', marginBottom: 22,
        background: `linear-gradient(135deg, ${deptColor}, ${deptColor}cc)`,
        color: '#fff', display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: `0 6px 24px ${deptColor}40`,
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${deptIcon}`} style={{ fontSize: 24 }}></i>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {greeting()}, {user?.full_name || user?.username || 'ผู้ใช้งาน'}
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>
            <i className="fas fa-building" style={{ marginRight: 5 }}></i>
            {deptLabel}
            {(dept === 'super_admin' || dept === 'manager') && (
              <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>ภาพรวมทั้งระบบ</span>
            )}
            {pendingChats > 0 && (
              <span onClick={() => navigate('/chat')} style={{ marginLeft: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '2px 10px', cursor: 'pointer', fontWeight: 700 }}>
                <i className="fas fa-comment-dots" style={{ marginRight: 4 }}></i>
                แชทค้าง {pendingChats} ห้อง
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 22 }}>
        <StatCard icon="fa-folder-open"
          label={(dept === 'super_admin' || dept === 'manager') ? 'เคสทั้งหมดในระบบ' : 'เคสทั้งหมดของฉัน'}
          value={s.total_cases ?? 0} color={deptColor} />
        <StatCard icon="fa-spinner" label="เคสที่ active" value={s.active_cases ?? 0} color="#6366f1" />
        <StatCard icon="fa-house-circle-check" label="เข้าเกณฑ์" value={s.appraisal_passed ?? 0} color="#22c55e"
          onClick={() => navigate('/appraisal')} />
        <StatCard icon="fa-house-circle-xmark" label="ไม่เข้าเกณฑ์" value={s.appraisal_not_passed ?? 0} color="#ef4444" />
        <StatCard icon="fa-flag-checkered" label="ทำธุรกรรมแล้ว" value={s.completed_cases ?? 0} color="#15803d" />
        <StatCard icon="fa-sack-dollar" label="ยอดวงเงินรวม" value={fmt(s.total_loan_amount)} color="#f59e0b" sub="วงเงินทั้งหมดที่ดูแล" />
      </div>

      {/* ── Pipeline + Expiry (2-col on large) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18, marginBottom: 22 }}>

        {/* Pipeline */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-timeline" style={{ color: deptColor }}></i>
            {(dept === 'super_admin' || dept === 'manager') ? 'Pipeline ทั้งระบบ' : 'Pipeline เคสของฉัน'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <PipelineCard icon="fa-clock" label="รอประเมิน" count={s.waiting_appraisal ?? 0} color="#8b5cf6" onClick={() => navigate('/appraisal')} />
            <PipelineCard icon="fa-gavel" label="รอประมูล" count={s.waiting_auction ?? 0} color="#f59e0b" onClick={() => navigate('/auction')} />
            <PipelineCard icon="fa-scale-balanced" label="รอนิติกรรม" count={s.waiting_legal ?? 0} color="#06b6d4" onClick={() => navigate('/legal')} />
            <PipelineCard icon="fa-file-signature" label="รอออกสัญญา" count={s.waiting_issuing ?? 0} color="#10b981" onClick={() => navigate('/issuing')} />
            <PipelineCard icon="fa-flag-checkered" label="เสร็จสิ้น" count={s.completed_cases ?? 0} color="#15803d" />
          </div>
        </div>

        {/* Contract Expiry */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-bell" style={{ color: expiring.some(e => e.days_remaining <= 14) ? '#ef4444' : '#f59e0b' }}></i>
            แจ้งเตือนสัญญาครบกำหนด
            <span style={{ fontSize: 10, background: '#fef3c7', color: '#d97706', borderRadius: 10, padding: '2px 7px', fontWeight: 600 }}>ภายใน 60 วัน</span>
          </div>
          {expiring.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#c4b5fd' }}>
              <i className="fas fa-check-circle" style={{ fontSize: 28, display: 'block', marginBottom: 6, color: '#22c55e' }}></i>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>ไม่มีสัญญาใกล้ครบกำหนด</span>
            </div>
          ) : (
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {expiring.map((item, i) => <ExpiryRow key={i} item={item} navigate={navigate} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Appraisal Prices ── */}
      {appraisals.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-chart-bar" style={{ color: '#8b5cf6' }}></i> ราคาประเมินเคสของฉัน (ล่าสุด)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['ลูกหนี้', 'ทำเล', 'ราคาประเมิน', 'วงเงิน', 'ผล'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appraisals.map((a, i) => (
                  <tr key={i} onClick={() => navigate(a.case_id ? `/appraisal/edit/${a.lr_id}` : `/sales/edit/${a.lr_id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{a.debtor_name || '-'}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{[a.district, a.province].filter(Boolean).join(' / ') || '-'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#8b5cf6' }}>{fmt(a.estimated_value)}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#3b82f6' }}>{fmt(a.loan_amount)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {a.appraisal_result === 'passed'
                        ? <span style={{ background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '2px 7px', fontWeight: 700, fontSize: 11 }}>✓ ผ่าน</span>
                        : a.appraisal_result === 'not_passed'
                          ? <span style={{ background: '#fecaca', color: '#dc2626', borderRadius: 6, padding: '2px 7px', fontWeight: 700, fontSize: 11 }}>✗ ไม่ผ่าน</span>
                          : <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 6, padding: '2px 7px', fontWeight: 700, fontSize: 11 }}>รอผล</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent Cases ── */}
      {recentCases.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-list-ul" style={{ color: deptColor }}></i>
            {(dept === 'super_admin' || dept === 'manager') ? 'เคสล่าสุดทั้งระบบ' : 'เคสล่าสุดของฉัน'}
          </div>
          {recentCases.map((item, i) => <CaseRow key={i} item={item} navigate={navigate} />)}
        </div>
      )}

      {recentCases.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
          <i className="fas fa-inbox" style={{ fontSize: 36, display: 'block', marginBottom: 10 }}></i>
          <div style={{ fontSize: 14 }}>ยังไม่มีเคสที่สร้างโดย account นี้</div>
        </div>
      )}
    </div>
  )
}

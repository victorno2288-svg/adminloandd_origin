// ============================================
// CeoDashboardPage.jsx
// Executive Dashboard — KPI รายเดือน + Commission + Top Sales
// ============================================
import { useState, useEffect } from 'react'

const token = () => localStorage.getItem('loandd_admin') || ''

function fmt(n) {
  if (!n && n !== 0) return '-'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return Number(n).toLocaleString('th-TH')
}
function fmtFull(n) {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0 }) + ' บาท'
}
function monthTH(ym) {
  if (!ym) return '-'
  const [y, m] = ym.split('-')
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `${months[parseInt(m) - 1]} ${parseInt(y) + 543}`
}
function nowMonthTH() {
  const d = new Date()
  return monthTH(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`)
}

// Mini bar chart horizontal
function HBar({ value, max, color = '#3b82f6', label, sublabel }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 800 }}>{sublabel || fmt(value)}</span>
      </div>
      <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s' }} />
      </div>
    </div>
  )
}

// Monthly bar chart (vertical)
function MonthChart({ data, field, color, maxOverride }) {
  const max = maxOverride || Math.max(...data.map(d => Number(d[field] || 0)), 1)
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80, padding: '0 4px' }}>
      {data.map((d, i) => {
        const val = Number(d[field] || 0)
        const pct = val / max
        const isThisMonth = d.month === new Date().toISOString().slice(0, 7)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: isThisMonth ? color : '#888' }}>{val || ''}</div>
            <div style={{
              width: '100%', borderRadius: '3px 3px 0 0',
              background: isThisMonth ? color : color + '60',
              height: `${Math.max(pct * 60, val > 0 ? 3 : 0)}px`,
              transition: 'height 0.5s',
            }} />
            <div style={{ fontSize: 9, color: isThisMonth ? color : '#ccc', fontWeight: isThisMonth ? 700 : 400, whiteSpace: 'nowrap' }}>
              {monthTH(d.month).split(' ')[0]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Stat card
function StatCard({ label, value, sub, icon, color, bg }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg || color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${icon}`} style={{ color, fontSize: 16 }}></i>
        </div>
        <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>{label}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa' }}>{sub}</div>}
    </div>
  )
}

const LEAD_COLORS = {
  line: '#00C300', facebook: '#1877F2', referral: '#9c27b0',
  phone_in: '#e65100', website: '#0288d1', walk_in: '#2e7d32',
  agent: '#795548', other: '#607d8b',
}
const LEAD_LABELS = {
  line: 'LINE', facebook: 'Facebook', referral: 'แนะนำต่อ',
  phone_in: 'โทรเข้า', website: 'เว็บไซต์', walk_in: 'Walk-in',
  agent: 'ผ่านนายหน้า', other: 'อื่นๆ',
}

export default function CeoDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const loadData = () => {
    setLoading(true)
    fetch('/api/admin/dashboard/ceo', {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => { if (d.monthly_kpi) { setData(d); setLastRefresh(new Date()) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
      <p style={{ color: '#888', marginTop: 12 }}>กำลังโหลด CEO Dashboard...</p>
    </div>
  )
  if (!data) return <div style={{ padding: 40, color: '#888' }}>ไม่สามารถโหลดข้อมูลได้</div>

  const lt = (data.lifetime && data.lifetime[0]) || {}
  const comm = (data.commission_summary && data.commission_summary[0]) || {}
  const topSales = data.top_sales || []
  const monthlyKpi = data.monthly_kpi || []
  const commMonthly = data.commission_monthly || []
  const leadSources = data.lead_sources || []
  const maxLeads = Math.max(...leadSources.map(l => l.count), 1)

  // เตรียม 12 เดือนล่าสุดสำหรับ chart (fill เดือนที่ไม่มีข้อมูลด้วย 0)
  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const found = monthlyKpi.find(r => r.month === ym)
    return { month: ym, new_cases: 0, approved: 0, completed: 0, total_loan_amount: 0, ...found }
  })

  // commission monthly 12 เดือน
  const last12Comm = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const found = commMonthly.find(r => r.month === ym)
    return { month: ym, total: 0, paid: 0, count: 0, ...found }
  })

  const thisMonth = last12[last12.length - 1] || {}

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #1e3a5f, #2d6a9f)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <i className="fas fa-crown" style={{ color: '#fbbf24', fontSize: 16 }}></i>
            </span>
            CEO Dashboard
          </h2>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4, marginLeft: 2 }}>
            Executive Overview — อัพเดทล่าสุด {lastRefresh.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <button
          onClick={loadData}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#fff', fontSize: 12, color: '#555', cursor: 'pointer',
          }}
        >
          <i className="fas fa-sync-alt" style={{ color: 'var(--primary)' }}></i> รีเฟรช
        </button>
      </div>

      {/* ── Lifetime Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="เคสทั้งหมด (ตลอดกาล)" value={fmt(lt.total_cases)} icon="fa-folder" color="#3498db" />
        <StatCard label="ปิดดีลสำเร็จ" value={fmt(lt.total_completed)} icon="fa-trophy" color="#27ae60"
          sub={lt.total_cases > 0 ? `Conversion ${Math.round(lt.total_completed / lt.total_cases * 100)}%` : ''} />
        <StatCard label="วงเงินรวมที่ปิดดีล" value={`฿${fmt(lt.lifetime_loan_amount)}`} icon="fa-coins" color="#f39c12"
          sub={fmtFull(lt.lifetime_loan_amount)} />
        <StatCard label="เคส Active ตอนนี้" value={fmt(lt.total_active)} icon="fa-fire" color="#e74c3c" />
        <StatCard label="Commission ค้างจ่าย" value={`฿${fmt(comm.unpaid_commission)}`} icon="fa-hand-holding-usd" color="#9b59b6"
          sub={`${comm.unpaid_count || 0} นายหน้า`} />
      </div>

      {/* ── เดือนนี้ Highlight ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)',
        borderRadius: 14, padding: '20px 24px', color: '#fff',
        boxShadow: '0 4px 16px rgba(30,58,95,0.3)',
        marginBottom: 20, display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2, letterSpacing: 1 }}>เดือนนี้ ({nowMonthTH()})</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{thisMonth.new_cases || 0}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>เคสใหม่</div>
        </div>
        <div style={{ width: 1, height: 56, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>อนุมัติแล้ว</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{thisMonth.approved || 0}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {thisMonth.new_cases > 0 ? `${Math.round((thisMonth.approved / thisMonth.new_cases) * 100)}% approval rate` : '-'}
          </div>
        </div>
        <div style={{ width: 1, height: 56, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>ปิดดีล</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{thisMonth.completed || 0}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>เคส completed</div>
        </div>
        <div style={{ width: 1, height: 56, background: 'rgba(255,255,255,0.2)' }} />
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>วงเงินรวม</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>฿{fmt(thisMonth.total_loan_amount)}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{fmtFull(thisMonth.total_loan_amount)}</div>
        </div>
      </div>

      {/* ── Row: Monthly Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* เคสใหม่รายเดือน */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700 }}>
            <i className="fas fa-chart-bar" style={{ color: '#3498db', marginRight: 7 }}></i>
            เคสใหม่รายเดือน (12 เดือน)
          </h4>
          <MonthChart data={last12} field="new_cases" color="#3498db" />
          <div style={{ marginTop: 10, fontSize: 11, color: '#aaa', textAlign: 'right' }}>
            รวม: <strong style={{ color: '#555' }}>{last12.reduce((s, d) => s + Number(d.new_cases || 0), 0)}</strong> เคส
          </div>
        </div>

        {/* ปิดดีลรายเดือน */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700 }}>
            <i className="fas fa-trophy" style={{ color: '#27ae60', marginRight: 7 }}></i>
            ปิดดีลรายเดือน (12 เดือน)
          </h4>
          <MonthChart data={last12} field="completed" color="#27ae60" />
          <div style={{ marginTop: 10, fontSize: 11, color: '#aaa', textAlign: 'right' }}>
            รวม: <strong style={{ color: '#555' }}>{last12.reduce((s, d) => s + Number(d.completed || 0), 0)}</strong> เคส
          </div>
        </div>

        {/* Commission รายเดือน */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700 }}>
            <i className="fas fa-hand-holding-usd" style={{ color: '#9b59b6', marginRight: 7 }}></i>
            Commission จ่ายแล้ว รายเดือน
          </h4>
          <MonthChart data={last12Comm} field="paid" color="#9b59b6" />
          <div style={{ marginTop: 10, fontSize: 11, color: '#aaa', textAlign: 'right' }}>
            รวมจ่ายแล้ว: <strong style={{ color: '#555' }}>฿{fmt(last12Comm.reduce((s, d) => s + Number(d.paid || 0), 0))}</strong>
          </div>
        </div>
      </div>

      {/* ── Row: Top Sales + Commission Summary + Lead Sources ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr)', gap: 16, marginBottom: 20 }}
        className="ceo-bottom-grid">

        {/* Top Sales เดือนนี้ */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700 }}>
            <i className="fas fa-medal" style={{ color: '#f39c12', marginRight: 7 }}></i>
            Top Sales เดือนนี้
          </h4>
          {topSales.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 12, padding: '16px 0' }}>ยังไม่มีข้อมูล</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'ชื่อ', 'เคสใหม่', 'อนุมัติ', 'ปิดดีล', 'วงเงิน'].map((h, i) => (
                    <th key={i} style={{
                      padding: '6px 8px', textAlign: i > 1 ? 'center' : 'left',
                      color: '#888', fontWeight: 700, fontSize: 10,
                      borderBottom: '2px solid #f0f0f0',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topSales.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5f5f5', background: i === 0 ? '#fffbeb' : 'transparent' }}>
                    <td style={{ padding: '8px', fontWeight: 800, color: i === 0 ? '#f39c12' : i === 1 ? '#888' : '#aaa' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: 700, color: '#1a1a2e' }}>{s.sales_name || '-'}</div>
                      {s.nickname && <div style={{ fontSize: 10, color: '#aaa' }}>{s.nickname}</div>}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#3498db' }}>{s.total_cases}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#27ae60' }}>{s.approved}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#f39c12' }}>{s.closed}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: 11, color: '#555' }}>
                      ฿{fmt(s.total_loan_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Commission Summary */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700 }}>
            <i className="fas fa-coins" style={{ color: '#9b59b6', marginRight: 7 }}></i>
            Commission นายหน้า
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>จ่ายแล้วรวม</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#27ae60' }}>฿{fmt(comm.paid_commission)}</div>
              <div style={{ fontSize: 10, color: '#aaa' }}>{comm.paid_count || 0} รายการ</div>
            </div>
            <div style={{ background: '#fff7ed', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>ค้างจ่าย</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#e74c3c' }}>฿{fmt(comm.unpaid_commission)}</div>
              <div style={{ fontSize: 10, color: '#aaa' }}>{comm.unpaid_count || 0} รายการ</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa' }}>
              นายหน้า {comm.total_agents || 0} ราย · ยอดรวม ฿{fmt(comm.total_commission)}
            </div>
          </div>
        </div>

        {/* Lead Sources */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700 }}>
            <i className="fas fa-funnel-dollar" style={{ color: '#3498db', marginRight: 7 }}></i>
            แหล่ง Lead เดือนนี้
          </h4>
          {leadSources.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 12 }}>ยังไม่มีข้อมูล</div>
          ) : (
            leadSources.slice(0, 7).map((l, i) => (
              <HBar
                key={i}
                label={LEAD_LABELS[l.source] || l.source || 'อื่นๆ'}
                value={l.count}
                max={maxLeads}
                color={LEAD_COLORS[l.source] || '#607d8b'}
                sublabel={`${l.count} ราย`}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Monthly KPI Table ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', overflowX: 'auto' }}>
        <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700 }}>
          <i className="fas fa-table" style={{ color: '#2d6a9f', marginRight: 7 }}></i>
          ตาราง KPI รายเดือน (12 เดือนล่าสุด)
        </h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['เดือน', 'เคสใหม่', 'อนุมัติ', '% Approval', 'ปิดดีล', '% Conversion', 'วงเงินรวม'].map((h, i) => (
                <th key={i} style={{
                  padding: '8px 12px', textAlign: i > 0 ? 'center' : 'left',
                  color: '#666', fontWeight: 700, fontSize: 11,
                  borderBottom: '2px solid #f0f0f0', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...last12].reverse().map((r, i) => {
              const approvalPct = r.new_cases > 0 ? Math.round((r.approved / r.new_cases) * 100) : 0
              const closePct    = r.new_cases > 0 ? Math.round((r.completed / r.new_cases) * 100) : 0
              const isNow       = r.month === new Date().toISOString().slice(0, 7)
              return (
                <tr key={i} style={{
                  borderBottom: '1px solid #f5f5f5',
                  background: isNow ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa',
                  fontWeight: isNow ? 700 : 400,
                }}>
                  <td style={{ padding: '9px 12px', fontWeight: 700, color: isNow ? '#2563eb' : '#444' }}>
                    {monthTH(r.month)} {isNow && <span style={{ fontSize: 10, background: '#2563eb', color: '#fff', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>เดือนนี้</span>}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#3498db' }}>{r.new_cases || 0}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#27ae60' }}>{r.approved || 0}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <span style={{ color: approvalPct >= 50 ? '#27ae60' : approvalPct >= 25 ? '#e67e22' : '#e74c3c', fontWeight: 700 }}>
                      {approvalPct}%
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#f39c12' }}>{r.completed || 0}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <span style={{ color: closePct >= 30 ? '#27ae60' : closePct >= 10 ? '#e67e22' : '#e74c3c', fontWeight: 700 }}>
                      {closePct}%
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#555' }}>
                    {r.total_loan_amount > 0 ? `฿${fmt(r.total_loan_amount)}` : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .ceo-bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

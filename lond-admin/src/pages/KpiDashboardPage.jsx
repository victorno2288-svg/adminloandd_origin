import { useState, useEffect, useCallback } from 'react'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales'
const DASH_API = '/api/admin/dashboard'

const LEAD_SOURCE_LABEL = {
  line: 'LINE',
  facebook: 'Facebook',
  referral: 'แนะนำต่อ',
  phone_in: 'โทรเข้า',
  website: 'เว็บไซต์',
  walk_in: 'Walk-in',
  agent: 'ผ่านนายหน้า',
  other: 'อื่นๆ',
  '': 'ไม่ระบุ',
  null: 'ไม่ระบุ',
}

const DEAD_REASON_LABEL = {
  no_response:      'ลูกหนี้ไม่ตอบ/หาย',
  bad_deed:         'โฉนดไม่ผ่าน',
  low_value:        'ราคาประเมินต่ำ',
  high_interest:    'ดอกเบี้ยสูงไป',
  has_debt:         'ติดหนี้มาก',
  not_interested:   'ลูกหนี้ไม่สนใจ',
  went_competitor:  'ไปใช้ที่อื่น',
  incomplete_docs:  'เอกสารไม่ครบ',
  outside_area:     'นอกพื้นที่',
  other:            'อื่นๆ',
}

const SOURCE_COLOR = {
  line: '#00C300',
  facebook: '#1877F2',
  referral: '#9c27b0',
  phone_in: '#e65100',
  website: '#0288d1',
  walk_in: '#2e7d32',
  agent: '#795548',
  other: '#607d8b',
  '': '#bdbdbd',
}

// แถบ bar อย่างง่าย
function SimpleBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8, width: '100%', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color || 'var(--primary)', borderRadius: 4, transition: 'width 0.5s' }} />
    </div>
  )
}

// Stat card เล็ก
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: `1.5px solid ${color}30`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${icon}`} style={{ color, fontSize: 16 }}></i>
        </div>
        <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{label}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ฟังก์ชันแปลงวินาที → "X นาที Y วินาที"
function fmtSeconds(sec) {
  if (!sec && sec !== 0) return '-'
  sec = Math.round(Number(sec))
  if (sec < 60) return `${sec} วิ`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m} น. ${s} วิ` : `${m} น.`
}

// Badge สี response time
function SLABadge({ seconds }) {
  if (!seconds && seconds !== 0) return <span style={{ color: '#aaa', fontSize: 12 }}>-</span>
  const s = Number(seconds)
  let bg, color, label
  if (s <= 120) { bg = '#e8f5e9'; color = '#2e7d32'; label = '🟢 เร็ว' }
  else if (s <= 300) { bg = '#fff8e1'; color = '#f57f17'; label = '🟡 พอใช้' }
  else { bg = '#ffebee'; color = '#c62828'; label = '🔴 ช้า' }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: bg, color }}>
      {label} ({fmtSeconds(s)})
    </span>
  )
}

export default function KpiDashboardPage() {
  const [kpi, setKpi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview') // overview | weekly | per_sales | funnel | sla

  // SLA state
  const [sla, setSla] = useState(null)
  const [slaLoading, setSlaLoading] = useState(false)
  const [slaRange, setSlaRange] = useState('week') // today | week | month

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/kpi`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setKpi(d.kpi) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadSla = useCallback((range) => {
    setSlaLoading(true)
    fetch(`${DASH_API}/chat-sla?range=${range}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setSla(d.sla) })
      .catch(() => {})
      .finally(() => setSlaLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'sla') loadSla(slaRange)
  }, [tab, slaRange, loadSla])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
        <p style={{ marginTop: 12, color: '#888' }}>กำลังโหลดข้อมูล KPI...</p>
      </div>
    )
  }

  if (!kpi) return <div style={{ padding: 40, color: '#888' }}>ไม่สามารถโหลดข้อมูลได้</div>

  const summary = kpi.summary_30d || {}
  const todaySources = kpi.today_by_source || []
  const weeklyDaily = kpi.weekly_daily || []
  const weeklyBySrc = kpi.weekly_by_source || []
  const perSales = kpi.per_sales || []
  const deadReasons = kpi.dead_reasons || []

  const todayTotal = Number(summary.today_total || 0)
  const weekTotal = Number(summary.week_total || 0)
  const total30d = Number(summary.total_30d || 0)
  const dead30d = Number(summary.dead_30d || 0)
  const convertRate = total30d > 0 ? Math.round(((total30d - dead30d) / total30d) * 100) : 0

  // สร้าง 7 วัน label
  const last7Days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last7Days.push(d.toISOString().slice(0, 10))
  }
  const dailyMap = {}
  weeklyDaily.forEach(r => { dailyMap[r.day?.slice(0, 10)] = Number(r.cnt) })
  const dailyData = last7Days.map(day => ({ day, cnt: dailyMap[day] || 0 }))
  const maxDaily = Math.max(...dailyData.map(d => d.cnt), 1)

  const maxSrc = Math.max(...weeklyBySrc.map(r => Number(r.cnt)), 1)

  const tabs = [
    { key: 'overview', label: 'ภาพรวม', icon: 'fa-chart-pie' },
    { key: 'weekly', label: 'รายสัปดาห์', icon: 'fa-calendar-week' },
    { key: 'per_sales', label: 'รายเซลล์', icon: 'fa-users' },
    { key: 'funnel', label: 'สาเหตุดีดออก', icon: 'fa-filter' },
    { key: 'sla', label: 'SLA แชท', icon: 'fa-stopwatch' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          <i className="fas fa-chart-line" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
          KPI Dashboard ฝ่ายขาย
        </h2>
        <span style={{ fontSize: 12, color: '#888', background: '#f5f5f5', padding: '3px 10px', borderRadius: 20 }}>
          อัพเดท: {new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>

      {/* Tab nav */}
      <div className="kpi-tab-nav" style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #f0f0f0', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? '#fff' : '#888',
              borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            <i className={`fas ${t.icon}`} style={{ marginRight: 6 }}></i>{t.label}
          </button>
        ))}
      </div>

      {/* ===== Tab: ภาพรวม ===== */}
      {tab === 'overview' && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard label="Lead วันนี้" value={todayTotal} icon="fa-plus-circle" color="#1976d2" sub="จำนวน lead ที่เข้ามาวันนี้" />
            <StatCard label="Lead 7 วัน" value={weekTotal} icon="fa-calendar-week" color="#7b1fa2" sub="รวม 7 วันล่าสุด" />
            <StatCard label="Lead 30 วัน" value={total30d} icon="fa-calendar-alt" color="#e65100" sub={`ดีดออก ${dead30d} เคส`} />
            <StatCard label="Conversion Rate" value={`${convertRate}%`} icon="fa-percentage" color="#2e7d32" sub="(30 วัน) ไม่รวมที่ดีดออก" />
          </div>

          {/* ช่องทางที่มาวันนี้ */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
              <i className="fas fa-share-alt" style={{ color: '#1976d2', marginRight: 8 }}></i>
              Lead วันนี้ แยกตามช่องทาง
            </h3>
            {todaySources.length === 0 ? (
              <div style={{ color: '#aaa', fontSize: 13, padding: '20px 0' }}>ยังไม่มี lead วันนี้</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {todaySources.map((r, i) => {
                  const src = r.lead_source || ''
                  const color = SOURCE_COLOR[src] || '#607d8b'
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: 16, borderRadius: 10, border: `2px solid ${color}30`, background: `${color}08` }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color }}>{r.cnt}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{LEAD_SOURCE_LABEL[src] || src}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* LINE vs Facebook highlight */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <i className="fab fa-line" style={{ fontSize: 24, color: '#00C300' }}></i>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#00C300' }}>{Number(summary.from_line || 0).toLocaleString('th-TH')}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>Lead จาก LINE (30 วัน)</div>
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <i className="fab fa-facebook" style={{ fontSize: 24, color: '#1877F2' }}></i>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1877F2' }}>{Number(summary.from_facebook || 0).toLocaleString('th-TH')}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>Lead จาก Facebook (30 วัน)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Tab: รายสัปดาห์ ===== */}
      {tab === 'weekly' && (
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>
              <i className="fas fa-chart-bar" style={{ color: '#7b1fa2', marginRight: 8 }}></i>
              Lead รายวัน (7 วันล่าสุด)
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160 }}>
              {dailyData.map((d, i) => {
                const pct = d.cnt / maxDaily
                const dayLabel = new Date(d.day).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                const isToday = d.day === new Date().toISOString().slice(0, 10)
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--primary)' : '#555' }}>{d.cnt}</div>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      background: isToday ? 'var(--primary)' : '#c5cae9',
                      height: `${Math.max(pct * 110, d.cnt > 0 ? 6 : 0)}px`,
                      transition: 'height 0.4s',
                    }} />
                    <div style={{ fontSize: 10, color: '#999', textAlign: 'center', whiteSpace: 'nowrap' }}>{dayLabel}</div>
                    {isToday && <div style={{ fontSize: 9, color: 'var(--primary)', fontWeight: 700 }}>วันนี้</div>}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
              <i className="fas fa-share-alt" style={{ color: '#1976d2', marginRight: 8 }}></i>
              Lead แยกช่องทาง (7 วันล่าสุด)
            </h3>
            {weeklyBySrc.length === 0 ? (
              <div style={{ color: '#aaa', fontSize: 13 }}>ยังไม่มีข้อมูล</div>
            ) : weeklyBySrc.map((r, i) => {
              const src = r.lead_source || ''
              const color = SOURCE_COLOR[src] || '#607d8b'
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color }}>
                      {LEAD_SOURCE_LABEL[src] || src || 'ไม่ระบุ'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{r.cnt}</span>
                  </div>
                  <SimpleBar value={Number(r.cnt)} max={maxSrc} color={color} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== Tab: รายเซลล์ ===== */}
      {tab === 'per_sales' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
            <i className="fas fa-users" style={{ color: '#1976d2', marginRight: 8 }}></i>
            ผลงานรายเซลล์ (ทุกเวลา)
          </h3>
          {perSales.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 13 }}>ยังไม่มีข้อมูล</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f5f7ff', borderBottom: '2px solid #e8eaf6' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#555' }}>เซลล์</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>เคสทั้งหมด</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#2e7d32' }}>ผ่านประเมิน</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#1976d2' }}>ปิดดีล</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#c62828' }}>ยกเลิก</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#e65100' }}>วงเงินอนุมัติ</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#7b1fa2' }}>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {perSales.map((s, i) => {
                    const conv = s.total_cases > 0 ? Math.round((s.closed / s.total_cases) * 100) : 0
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#1a1a2e' }}>{s.sales_name}</div>
                          {s.nickname && <div style={{ fontSize: 11, color: '#aaa' }}>{s.nickname}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{s.total_cases}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#2e7d32', fontWeight: 600 }}>{s.passed_appraisal}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#1976d2', fontWeight: 700 }}>{s.closed}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#c62828' }}>{s.cancelled}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#e65100', fontWeight: 600 }}>
                          {s.total_approved > 0 ? `฿${Number(s.total_approved).toLocaleString('th-TH')}` : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                            background: conv >= 50 ? '#e8f5e9' : conv >= 20 ? '#fff8e1' : '#ffebee',
                            color: conv >= 50 ? '#2e7d32' : conv >= 20 ? '#f57f17' : '#c62828',
                          }}>{conv}%</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== Tab: SLA แชท ===== */}
      {tab === 'sla' && (
        <div>
          {/* Range selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>ช่วงเวลา:</span>
            {[
              { key: 'today', label: 'วันนี้' },
              { key: 'week', label: '7 วัน' },
              { key: 'month', label: '30 วัน' },
            ].map(r => (
              <button key={r.key} onClick={() => setSlaRange(r.key)} style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: slaRange === r.key ? 'var(--primary)' : '#f0f0f0',
                color: slaRange === r.key ? '#fff' : '#555',
              }}>{r.label}</button>
            ))}
            <button onClick={() => loadSla(slaRange)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid #e0e0e0', cursor: 'pointer',
              fontSize: 13, background: '#fff', color: '#555',
            }}>
              <i className="fas fa-sync-alt" style={{ marginRight: 4 }}></i>รีเฟรช
            </button>
          </div>

          {slaLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--primary)' }}></i>
              <p style={{ color: '#888', marginTop: 10 }}>กำลังโหลด SLA...</p>
            </div>
          ) : !sla ? (
            <div style={{ color: '#aaa', padding: 40, textAlign: 'center' }}>ยังไม่มีข้อมูล</div>
          ) : (() => {
            const summary = (sla.summary && sla.summary[0]) || {}
            const perAdmin = sla.per_admin || []
            const hist = (sla.histogram && sla.histogram[0]) || {}
            const dailyTrend = sla.daily_trend || []

            const totalConvs = Number(summary.total_convs || 0)
            const avgSec = Number(summary.avg_seconds || 0)
            const slowCount = Number(summary.slow_count || 0)
            const slowPct = totalConvs > 0 ? Math.round((slowCount / totalConvs) * 100) : 0
            const noResp = Number(summary.no_response || 0)
            const ghostCount = Number(summary.ghost_count || 0)
            const qualityCount = Number(summary.quality_count || 0)

            return (
              <>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <StatCard label="บทสนทนาทั้งหมด" value={totalConvs.toLocaleString('th-TH')} icon="fa-comments" color="#1976d2" />
                  <StatCard
                    label="เวลาตอบเฉลี่ย"
                    value={fmtSeconds(avgSec)}
                    icon="fa-clock"
                    color={avgSec <= 120 ? '#2e7d32' : avgSec <= 300 ? '#f57f17' : '#c62828'}
                  />
                  <StatCard
                    label="ช้าเกิน 5 นาที"
                    value={slowCount}
                    icon="fa-exclamation-triangle"
                    color="#c62828"
                    sub={`${slowPct}% ของทั้งหมด`}
                  />
                  <StatCard label="ไม่ตอบเลย" value={noResp} icon="fa-ghost" color="#757575" />
                  <StatCard label="Ghost Lead" value={ghostCount} icon="fa-user-slash" color="#9c27b0" />
                  <StatCard label="Lead คุณภาพ" value={qualityCount} icon="fa-star" color="#f57f17" sub="hot + qualified" />
                </div>

                {/* Histogram */}
                <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
                    <i className="fas fa-chart-bar" style={{ color: '#1976d2', marginRight: 8 }}></i>
                    การกระจายเวลาตอบ
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                    {[
                      { label: '< 1 นาที', value: Number(hist.under_1min || 0), color: '#2e7d32', bg: '#e8f5e9' },
                      { label: '1–2 นาที', value: Number(hist.s1_2min || 0), color: '#43a047', bg: '#f1f8e9' },
                      { label: '2–5 นาที', value: Number(hist.s2_5min || 0), color: '#f57f17', bg: '#fff8e1' },
                      { label: '> 5 นาที', value: Number(hist.over_5min || 0), color: '#c62828', bg: '#ffebee' },
                      { label: 'ไม่ตอบ', value: Number(hist.no_response || 0), color: '#757575', bg: '#f5f5f5' },
                    ].map((h, i) => (
                      <div key={i} style={{ textAlign: 'center', padding: '14px 10px', borderRadius: 10, background: h.bg, border: `1.5px solid ${h.color}20` }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: h.color }}>{h.value.toLocaleString('th-TH')}</div>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4, fontWeight: 600 }}>{h.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily trend */}
                {dailyTrend.length > 0 && (
                  <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
                      <i className="fas fa-chart-line" style={{ color: '#7b1fa2', marginRight: 8 }}></i>
                      เวลาตอบเฉลี่ยรายวัน (7 วัน)
                    </h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
                      {(() => {
                        const maxAvg = Math.max(...dailyTrend.map(d => Number(d.avg_seconds || 0)), 1)
                        return dailyTrend.map((d, i) => {
                          const avg = Number(d.avg_seconds || 0)
                          const pct = avg / maxAvg
                          const isToday = d.day?.slice(0, 10) === new Date().toISOString().slice(0, 10)
                          const barColor = avg <= 120 ? '#66bb6a' : avg <= 300 ? '#ffa726' : '#ef5350'
                          const dayLabel = new Date(d.day).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                          return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? 'var(--primary)' : '#555', textAlign: 'center' }}>
                                {fmtSeconds(avg)}
                              </div>
                              <div style={{
                                width: '100%', borderRadius: '4px 4px 0 0', background: barColor,
                                height: `${Math.max(pct * 80, avg > 0 ? 6 : 0)}px`, transition: 'height 0.4s',
                              }} />
                              <div style={{ fontSize: 10, color: '#999', textAlign: 'center', whiteSpace: 'nowrap' }}>{dayLabel}</div>
                              {d.slow_count > 0 && (
                                <div style={{ fontSize: 9, color: '#c62828' }}>🔴 {d.slow_count}</div>
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 11, color: '#888' }}>
                      <span><span style={{ color: '#66bb6a' }}>■</span> &lt;2น.</span>
                      <span><span style={{ color: '#ffa726' }}>■</span> 2-5น.</span>
                      <span><span style={{ color: '#ef5350' }}>■</span> &gt;5น.</span>
                      <span style={{ marginLeft: 'auto' }}>🔴 = จำนวนช้าเกิน 5 น.</span>
                    </div>
                  </div>
                )}

                {/* Per admin table */}
                <div className="card" style={{ padding: 20 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
                    <i className="fas fa-user-clock" style={{ color: '#1976d2', marginRight: 8 }}></i>
                    SLA รายเซลล์
                  </h3>
                  {perAdmin.length === 0 ? (
                    <div style={{ color: '#aaa', fontSize: 13, padding: '20px 0' }}>
                      ยังไม่มีข้อมูล — ข้อมูล SLA จะเริ่มสะสมเมื่อเซลล์ตอบแชทและ migration ถูกรัน
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f5f7ff', borderBottom: '2px solid #e8eaf6' }}>
                            <th style={{ padding: '10px 14px', textAlign: 'left', color: '#555' }}>เซลล์</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>บทสนทนา</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>ตอบแล้ว</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#c62828' }}>ไม่ตอบ</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>เวลาเฉลี่ย</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#2e7d32' }}>เร็ว (&lt;2น.)</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#f57f17' }}>พอใช้ (2-5น.)</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#c62828' }}>ช้า (&gt;5น.)</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#f57f17' }}>Lead ดี</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', color: '#9c27b0' }}>Ghost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {perAdmin.map((a, i) => {
                            const avg = Number(a.avg_seconds || 0)
                            const total = Number(a.total_convs || 0)
                            const slowPctRow = total > 0 ? Math.round((Number(a.slow_count || 0) / total) * 100) : 0
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ fontWeight: 700, color: '#1a1a2e' }}>{a.full_name || a.first_response_by}</div>
                                  {a.nickname && <div style={{ fontSize: 11, color: '#aaa' }}>{a.nickname}</div>}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>{total}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#2e7d32' }}>{a.responded}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center', color: Number(a.no_response) > 0 ? '#c62828' : '#aaa', fontWeight: Number(a.no_response) > 0 ? 700 : 400 }}>
                                  {a.no_response}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                  <SLABadge seconds={a.avg_seconds} />
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#2e7d32', fontWeight: 600 }}>{a.fast_count}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#f57f17', fontWeight: 600 }}>{a.ok_count}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                  {Number(a.slow_count) > 0 ? (
                                    <span style={{ color: '#c62828', fontWeight: 700 }}>
                                      {a.slow_count} <span style={{ fontSize: 11, color: '#e57373' }}>({slowPctRow}%)</span>
                                    </span>
                                  ) : <span style={{ color: '#aaa' }}>0</span>}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#f57f17', fontWeight: 600 }}>{a.quality_leads}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center', color: Number(a.ghost_leads) > 0 ? '#9c27b0' : '#aaa' }}>
                                  {a.ghost_leads}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ===== Tab: สาเหตุดีดออก ===== */}
      {tab === 'funnel' && (
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
              <i className="fas fa-times-circle" style={{ color: '#c62828', marginRight: 8 }}></i>
              สาเหตุที่ดีดออก / ไม่ผ่าน (ทั้งหมด)
            </h3>
            {deadReasons.length === 0 ? (
              <div style={{ color: '#aaa', fontSize: 13, padding: '20px 0' }}>ยังไม่มีข้อมูล (กรอก dead_reason ในแบบฟอร์ม)</div>
            ) : (() => {
              const maxDead = Math.max(...deadReasons.map(r => Number(r.cnt)), 1)
              return deadReasons.map((r, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>
                      {DEAD_REASON_LABEL[r.dead_reason] || r.dead_reason || 'ไม่ระบุ'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#c62828' }}>{r.cnt}</span>
                  </div>
                  <SimpleBar value={Number(r.cnt)} max={maxDead} color="#e57373" />
                </div>
              ))
            })()}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
              <i className="fas fa-share-alt" style={{ color: '#1976d2', marginRight: 8 }}></i>
              Lead Funnel 7 วัน (แยกช่องทาง)
            </h3>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>เปรียบเทียบ leads ที่เข้ามา vs ที่ดีดออก</div>
            {(kpi.lead_funnel || []).length === 0 ? (
              <div style={{ color: '#aaa', fontSize: 13 }}>ยังไม่มีข้อมูล</div>
            ) : (kpi.lead_funnel || []).map((r, i) => {
              const src = r.lead_source || ''
              const color = SOURCE_COLOR[src] || '#607d8b'
              const total = Number(r.total_leads)
              const dead = Number(r.dead_leads)
              const alive = total - dead
              const deadPct = total > 0 ? Math.round((dead / total) * 100) : 0
              return (
                <div key={i} style={{ marginBottom: 16, padding: 14, borderRadius: 10, border: `1px solid ${color}20`, background: `${color}06` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{LEAD_SOURCE_LABEL[src] || src || 'ไม่ระบุ'}</span>
                    <span style={{ fontSize: 12, color: '#666' }}>รวม {total} เคส</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <div style={{ color: '#2e7d32' }}><i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>ดำเนินต่อ {alive}</div>
                    <div style={{ color: '#c62828' }}><i className="fas fa-times-circle" style={{ marginRight: 4 }}></i>ดีดออก {dead} ({deadPct}%)</div>
                  </div>
                  <div style={{ marginTop: 8, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ height: '100%', width: `${100 - deadPct}%`, background: '#a5d6a7', transition: 'width 0.4s' }} />
                    <div style={{ height: '100%', width: `${deadPct}%`, background: '#ef9a9a', transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

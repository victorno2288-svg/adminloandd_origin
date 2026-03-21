import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/dashboard/daily-report'

function fmtMoney(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return Number(n).toLocaleString('th-TH')
}
function fmtMoneyFull(n) {
  return Number(n || 0).toLocaleString('th-TH') + ' บาท'
}
function todayTH() {
  return new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function dayLabel(iso) {
  const d = new Date(iso)
  const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  return `${days[d.getDay()]} ${d.getDate()}`
}

// Trend arrow badge
function Trend({ pct }) {
  if (pct === 0) return <span style={{ fontSize: 11, color: '#aaa' }}>เท่าเดิม</span>
  const up = pct > 0
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: up ? '#27ae60' : '#e74c3c',
      background: up ? '#e8f5e9' : '#ffebee',
      padding: '2px 7px', borderRadius: 20,
      display: 'inline-flex', alignItems: 'center', gap: 3
    }}>
      <i className={`fas fa-arrow-${up ? 'up' : 'down'}`} style={{ fontSize: 9 }}></i>
      {Math.abs(pct)}% จากเมื่อวาน
    </span>
  )
}

// Stat card พร้อม trend
function DayCard({ label, value, icon, color, pct, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <i className={`fas ${icon}`} style={{ color, fontSize: 17 }}></i>
        </div>
        <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{label}</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {pct !== undefined && <Trend pct={pct} />}
        {sub && <span style={{ fontSize: 11, color: '#aaa' }}>{sub}</span>}
      </div>
    </div>
  )
}

// Pipeline block แต่ละฝ่าย
function PipelineCard({ label, sub, icon, color, count, path }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => path && navigate(path)}
      style={{
        background: '#fff', borderRadius: 12, padding: '14px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: path ? 'pointer' : 'default',
        border: `1.5px solid ${count > 0 ? color + '30' : '#f0f0f0'}`,
        transition: 'all 0.2s', position: 'relative',
      }}
      onMouseEnter={e => { if (path) { e.currentTarget.style.boxShadow = `0 4px 16px ${color}22`; e.currentTarget.style.borderColor = color + '60' } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = count > 0 ? color + '30' : '#f0f0f0' }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: count > 0 ? color + '18' : '#f5f5f5',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <i className={`fas ${icon}`} style={{ color: count > 0 ? color : '#ccc', fontSize: 16 }}></i>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 1 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>{sub}</div>}
        <div style={{ fontSize: 22, fontWeight: 800, color: count > 0 ? color : '#ccc', lineHeight: 1 }}>{count}</div>
      </div>
      {path && (
        <div style={{ color: count > 0 ? color : '#ddd', fontSize: 12 }}>
          <i className="fas fa-chevron-right"></i>
        </div>
      )}
      {count > 0 && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 7, height: 7, borderRadius: '50%',
          background: color, animation: 'pulse 2s infinite'
        }} />
      )}
    </div>
  )
}

// Mini bar chart สำหรับ 7-day trend
function WeekChart({ trend }) {
  const maxNew = Math.max(...trend.map(d => d.new_cases), 1)

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
      {trend.map((d, i) => {
        const isToday = d.day === new Date().toISOString().slice(0, 10)
        const pct = d.new_cases / maxNew
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? 'var(--primary)' : '#888' }}>
              {d.new_cases}
            </div>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              background: isToday ? 'var(--primary)' : '#c5cae9',
              height: `${Math.max(pct * 52, d.new_cases > 0 ? 4 : 0)}px`,
              transition: 'height 0.5s',
            }} />
            <div style={{ fontSize: 10, color: isToday ? 'var(--primary)' : '#bbb', fontWeight: isToday ? 700 : 400 }}>
              {dayLabel(d.day)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ========== Chat KPI helpers ==========
function fmtSec(s) {
  if (!s && s !== 0) return '-'
  s = Number(s)
  if (s < 60) return `${s} วิ`
  if (s < 3600) return `${Math.floor(s / 60)} น. ${s % 60} วิ`
  return `${Math.floor(s / 3600)} ชม. ${Math.floor((s % 3600) / 60)} น.`
}
function SLABadge({ seconds }) {
  if (!seconds) return (
    <span style={{ fontSize: 11, color: '#aaa', background: '#f5f5f5', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
      ไม่มีข้อมูล
    </span>
  )
  const s = Number(seconds)
  if (s <= 120) return (
    <span style={{ fontSize: 11, color: '#27ae60', background: '#e8f5e9', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
      🟢 ดีมาก
    </span>
  )
  if (s <= 300) return (
    <span style={{ fontSize: 11, color: '#e67e22', background: '#fef9e7', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
      🟡 พอใช้
    </span>
  )
  return (
    <span style={{ fontSize: 11, color: '#e74c3c', background: '#ffebee', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>
      🔴 ช้า
    </span>
  )
}
function SlowBar({ slow, total }) {
  const pct = total > 0 ? Math.round((slow / total) * 100) : 0
  const color = pct >= 30 ? '#e74c3c' : pct >= 10 ? '#e67e22' : '#27ae60'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 6, overflow: 'hidden', minWidth: 40 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 30 }}>{pct}%</span>
    </div>
  )
}

// ========== Main Component ==========
export default function DailyReportPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [chatSla, setChatSla] = useState(null)
  const [chatLoading, setChatLoading] = useState(false)

  const loadData = () => {
    setLoading(true)
    fetch(API, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); setLastRefresh(new Date()) })
      .catch(() => {})
      .finally(() => setLoading(false))
    // โหลด chat KPI วันนี้ พร้อมกัน
    setChatLoading(true)
    fetch('/api/admin/dashboard/chat-sla?range=today', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setChatSla(d.sla) })
      .catch(() => {})
      .finally(() => setChatLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
      <p style={{ marginTop: 12, color: '#888' }}>กำลังโหลดรายงาน...</p>
    </div>
  )
  if (!data) return <div style={{ padding: 40, color: '#888' }}>ไม่สามารถโหลดข้อมูลได้</div>

  const { today, pipeline, revenue, week_trend } = data

  const pipelineItems = [
    { label: 'ฝ่ายขาย', sub: 'Leads ที่ยังดำเนินการ', icon: 'fa-headset', color: '#3498db', count: pipeline.sales, path: '/sales' },
    { label: 'ฝ่ายอนุมัติ', sub: 'รออนุมัติวงเงิน', icon: 'fa-money-check-alt', color: '#9b59b6', count: pipeline.approval, path: '/approval' },
    { label: 'ฝ่ายประเมิน', sub: 'รอผลประเมิน', icon: 'fa-search-dollar', color: '#e67e22', count: pipeline.appraisal, path: '/appraisal' },
    { label: 'ฝ่ายออกสัญญา', sub: 'รอออกเอกสาร', icon: 'fa-file-signature', color: '#1abc9c', count: pipeline.issuing, path: '/issuing' },
    { label: 'ฝ่ายนิติกรรม', sub: 'รอทำนิติกรรม', icon: 'fa-balance-scale', color: '#e74c3c', count: pipeline.legal, path: '/legal' },
    { label: 'ฝ่ายประมูล', sub: 'รอประมูลทรัพย์', icon: 'fa-gavel', color: '#f39c12', count: pipeline.auction, path: '/auction' },
  ]

  return (
    <div>
      {/* ===== Header ===== */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--primary), #038a58)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <i className="fas fa-chart-line" style={{ color: '#fff', fontSize: 16 }}></i>
            </span>
            รายงานประจำวัน
          </h2>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6, marginLeft: 2 }}>
            <i className="fas fa-calendar-day" style={{ marginRight: 6, color: 'var(--primary)' }}></i>
            {todayTH()}
          </div>
        </div>

        <button
          onClick={loadData}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#fff', fontSize: 12, color: '#555', cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0
          }}
        >
          <i className="fas fa-sync-alt" style={{ color: 'var(--primary)' }}></i>
          รีเฟรช
          <span style={{ fontSize: 10, color: '#bbb', marginLeft: 4 }}>
            {lastRefresh.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </button>
      </div>

      {/* ===== Today Stats Cards ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
        <DayCard
          label="Lead ใหม่วันนี้"
          value={today.leads}
          icon="fa-user-plus"
          color="#3498db"
          pct={today.leads_pct}
        />
        <DayCard
          label="เคสใหม่วันนี้"
          value={today.new_cases}
          icon="fa-folder-plus"
          color="#8e44ad"
          pct={today.new_cases_pct}
        />
        <DayCard
          label="อนุมัติวันนี้"
          value={today.approved}
          icon="fa-check-circle"
          color="#27ae60"
          pct={today.approved_pct}
        />
        <DayCard
          label="ปิดดีลวันนี้"
          value={today.completed}
          icon="fa-trophy"
          color="#f39c12"
          pct={today.completed_pct}
        />
        <DayCard
          label="ยกเลิกวันนี้"
          value={today.cancelled}
          icon="fa-times-circle"
          color="#e74c3c"
          pct={today.cancelled_pct}
        />
      </div>

      {/* ===== งานที่เสร็จวันนี้ รายฝ่าย ===== */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '14px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20,
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10
      }}>
        <span style={{ fontSize: 12, color: '#888', fontWeight: 700, marginRight: 4 }}>
          <i className="fas fa-check-double" style={{ color: '#27ae60', marginRight: 5 }}></i>
          งานที่เสร็จวันนี้:
        </span>
        {[
          { label: 'อนุมัติวงเงิน', value: today.approval_done, color: '#9b59b6', icon: 'fa-money-check-alt', path: '/approval' },
          { label: 'ออกสัญญา', value: today.issuing_done, color: '#1abc9c', icon: 'fa-file-signature', path: '/issuing' },
          { label: 'นิติกรรม', value: today.legal_done, color: '#e74c3c', icon: 'fa-balance-scale', path: '/legal' },
          { label: 'ปิดดีล', value: today.completed, color: '#f39c12', icon: 'fa-trophy', path: '/sales' },
        ].map((item, i) => (
          <a key={i} href={item.path}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20, textDecoration: 'none',
              background: item.value > 0 ? item.color + '15' : '#f8f8f8',
              border: `1px solid ${item.value > 0 ? item.color + '40' : '#eee'}`,
              color: item.value > 0 ? item.color : '#bbb',
              fontSize: 12, fontWeight: 700, transition: 'all 0.15s'
            }}
          >
            <i className={`fas ${item.icon}`} style={{ fontSize: 11 }}></i>
            {item.label}
            <span style={{
              background: item.value > 0 ? item.color : '#ddd',
              color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 12, fontWeight: 800, minWidth: 20, textAlign: 'center'
            }}>{item.value || 0}</span>
          </a>
        ))}
      </div>

      {/* ===== Revenue + Auction Row ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* ยอดวงเงินรวมที่อนุมัติวันนี้ */}
        <div style={{
          background: 'linear-gradient(135deg, #2c3e50 0%, #3d5166 100%)',
          borderRadius: 14, padding: '20px 24px', color: '#fff',
          boxShadow: '0 4px 16px rgba(44,62,80,0.3)'
        }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
            วงเงินอนุมัติวันนี้
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            ฿{fmtMoney(today.approved_amount)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>{fmtMoneyFull(today.approved_amount)}</div>
        </div>

        {/* ยอดลงทุนประมูลวันนี้ */}
        <div style={{
          background: 'linear-gradient(135deg, #8e44ad 0%, #6c3483 100%)',
          borderRadius: 14, padding: '20px 24px', color: '#fff',
          boxShadow: '0 4px 16px rgba(142,68,173,0.3)'
        }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
            ประมูลสำเร็จวันนี้
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            {today.auction_cnt} <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.8 }}>เคส</span>
          </div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>มูลค่ารวม: ฿{fmtMoney(today.auction_invested)}</div>
        </div>

        {/* รายได้โดยประมาณ */}
        <div style={{
          background: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)',
          borderRadius: 14, padding: '20px 24px', color: '#fff',
          boxShadow: '0 4px 16px rgba(39,174,96,0.3)'
        }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
            รายได้ดอกเบี้ย (ประมาณ)
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            ฿{fmtMoney(revenue.estimated_monthly)}
            <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.8 }}>/เดือน</span>
          </div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>
            วงเงินรวม ฿{fmtMoney(revenue.total_invested)} × {revenue.avg_rate?.toFixed(1)}%/ปี
          </div>
        </div>
      </div>

      {/* ===== Pipeline + Weekly Trend ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 16, marginBottom: 24 }}
        className="daily-pipeline-grid">
        {/* Pipeline */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              <i className="fas fa-stream" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              งานค้างในระบบ (Pipeline)
            </h3>
            <span style={{
              background: '#f0f0f0', color: '#555', borderRadius: 20,
              fontSize: 12, fontWeight: 700, padding: '3px 12px'
            }}>
              รวม {pipeline.total_active} เคส active
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {pipelineItems.map((p, i) => <PipelineCard key={i} {...p} />)}
          </div>
        </div>

        {/* Weekly trend */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
            <i className="fas fa-chart-bar" style={{ color: '#3498db', marginRight: 8 }}></i>
            เคสใหม่ 7 วันล่าสุด
          </h3>
          <WeekChart trend={week_trend} />
          <div style={{ marginTop: 12, fontSize: 11, color: '#bbb', textAlign: 'center' }}>
            รวม 7 วัน: <strong style={{ color: '#555' }}>{week_trend.reduce((s, d) => s + d.new_cases, 0)}</strong> เคส
          </div>
        </div>
      </div>

      {/* ===== Chat KPI รายเซลล์วันนี้ ===== */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            <i className="fas fa-comments" style={{ color: '#ec4899', marginRight: 8 }}></i>
            Chat KPI รายเซลล์ — วันนี้
          </h3>
          {chatSla?.summary?.[0] && (() => {
            const s = chatSla.summary[0]
            return (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'แชทเข้าวันนี้', value: s.total_convs || 0, color: '#3498db', icon: 'fa-inbox' },
                  { label: 'ตอบแล้ว', value: s.responded || 0, color: '#27ae60', icon: 'fa-reply' },
                  { label: 'ยังไม่ตอบ', value: s.no_response || 0, color: '#e74c3c', icon: 'fa-clock' },
                  { label: 'ตอบช้า>5นาที', value: s.slow_count || 0, color: '#e67e22', icon: 'fa-hourglass-half' },
                ].map((b, i) => (
                  <div key={i} style={{
                    background: b.color + '12', border: `1px solid ${b.color}25`,
                    borderRadius: 10, padding: '6px 14px',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <i className={`fas ${b.icon}`} style={{ color: b.color, fontSize: 13 }}></i>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: b.color, lineHeight: 1 }}>{b.value}</div>
                      <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{b.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {chatLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#aaa' }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>กำลังโหลด chat KPI...
          </div>
        ) : !chatSla || !chatSla.per_admin || chatSla.per_admin.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#bbb' }}>
            <i className="fas fa-comments" style={{ fontSize: 28, display: 'block', marginBottom: 8 }}></i>
            ยังไม่มีแชทที่ตอบวันนี้
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'เซลล์', 'แชทที่ตอบ', 'ตอบช้า >5นาที', 'เวลาเฉลี่ย', 'SLA', 'Lead ดี', 'Ghost'].map((h, i) => (
                    <th key={i} style={{
                      padding: '8px 12px', textAlign: i > 1 ? 'center' : 'left',
                      color: '#666', fontWeight: 700, fontSize: 11,
                      borderBottom: '2px solid #f0f0f0', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chatSla.per_admin.map((r, i) => {
                  const name = r.full_name || r.nickname || r.first_response_by || '-'
                  const slowPct = r.responded > 0 ? Math.round((r.slow_count / r.responded) * 100) : 0
                  const isWorst = r.avg_seconds > 300
                  return (
                    <tr key={i} style={{
                      borderBottom: '1px solid #f5f5f5',
                      background: isWorst ? '#fff8f8' : i % 2 === 0 ? '#fff' : '#fafafa',
                      transition: 'background 0.15s'
                    }}>
                      <td style={{ padding: '10px 12px', color: '#aaa', fontWeight: 700, fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--primary), #038a58)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 12, fontWeight: 800
                          }}>
                            {name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e' }}>{name}</div>
                            {r.nickname && r.full_name && (
                              <div style={{ fontSize: 10, color: '#aaa' }}>{r.nickname}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: 16, color: '#3498db' }}>{r.responded || 0}</span>
                        <span style={{ fontSize: 11, color: '#aaa' }}> / {r.total_convs}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                          <span style={{
                            fontWeight: 800, fontSize: 15,
                            color: r.slow_count > 0 ? '#e74c3c' : '#27ae60'
                          }}>{r.slow_count || 0}</span>
                          {r.responded > 0 && <SlowBar slow={r.slow_count || 0} total={r.responded || 0} />}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 700, fontSize: 13,
                          color: r.avg_seconds <= 120 ? '#27ae60' : r.avg_seconds <= 300 ? '#e67e22' : '#e74c3c'
                        }}>
                          {fmtSec(r.avg_seconds)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <SLABadge seconds={r.avg_seconds} />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#27ae60' }}>{r.quality_leads || 0}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: r.ghost_leads > 0 ? '#e74c3c' : '#aaa' }}>{r.ghost_leads || 0}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* ── Footer note */}
            <div style={{ marginTop: 10, fontSize: 11, color: '#bbb', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span><span style={{ color: '#27ae60', fontWeight: 700 }}>🟢 ดีมาก</span> = ตอบ ≤ 2 นาที</span>
              <span><span style={{ color: '#e67e22', fontWeight: 700 }}>🟡 พอใช้</span> = 2-5 นาที</span>
              <span><span style={{ color: '#e74c3c', fontWeight: 700 }}>🔴 ช้า</span> = &gt; 5 นาที</span>
              <span style={{ marginLeft: 'auto' }}>นับเฉพาะแชทที่ตอบวันนี้</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== Quick Links ===== */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#555' }}>
          <i className="fas fa-bolt" style={{ color: '#f39c12', marginRight: 8 }}></i>
          ลิงก์ด่วนไปยังทุกฝ่าย
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Dashboard', icon: 'fa-chart-pie', path: '/dashboard', color: '#3498db' },
            { label: 'ฝ่ายขาย', icon: 'fa-headset', path: '/sales', color: '#3498db' },
            { label: 'KPI ฝ่ายขาย', icon: 'fa-chart-line', path: '/sales/kpi', color: '#3498db' },
            { label: 'ฝ่ายอนุมัติ', icon: 'fa-money-check-alt', path: '/approval', color: '#9b59b6' },
            { label: 'ฝ่ายประเมิน', icon: 'fa-search-dollar', path: '/appraisal', color: '#e67e22' },
            { label: 'ฝ่ายออกสัญญา', icon: 'fa-file-signature', path: '/issuing', color: '#1abc9c' },
            { label: 'ฝ่ายนิติกรรม', icon: 'fa-balance-scale', path: '/legal', color: '#e74c3c' },
            { label: 'ฝ่ายประมูล', icon: 'fa-gavel', path: '/auction', color: '#f39c12' },
            { label: 'ฝ่ายบัญชี', icon: 'fa-landmark', path: '/accounting', color: '#27ae60' },
            { label: 'Chat', icon: 'fa-comments', path: '/chat', color: '#ec4899' },
            { label: 'ปฏิทิน', icon: 'fa-calendar-alt', path: '/calendar', color: '#7c3aed' },
            { label: 'AI สรุป', icon: 'fa-robot', path: '/ai-summary', color: '#059669' },
            { label: 'นายทุน', icon: 'fa-hand-holding-usd', path: '/investors', color: '#1976d2' },
            { label: 'CEO Dashboard', icon: 'fa-crown', path: '/ceo-dashboard', color: '#b45309' },
          ].map((link, i) => (
            <a key={i} href={link.path}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
                background: link.color + '12', color: link.color,
                fontSize: 12, fontWeight: 600, border: `1px solid ${link.color}25`,
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = link.color + '22'}
              onMouseLeave={e => e.currentTarget.style.background = link.color + '12'}
            >
              <i className={`fas ${link.icon}`}></i>
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @media (max-width: 900px) {
          .daily-pipeline-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales'

const STATUS_LABEL = {
  new: 'ใหม่', contacting: 'กำลังติดต่อ', incomplete: 'เอกสารไม่ครบ',
  reviewing: 'กำลังตรวจ', pending_approve: 'รอผู้บริหาร',
  credit_approved: 'อนุมัติสินเชื่อ', awaiting_appraisal_fee: 'รอค่าประเมิน',
  appraisal_scheduled: 'นัดประเมิน', appraisal_passed: 'ผ่านประเมิน',
  preparing_docs: 'จัดทำเอกสาร', legal_scheduled: 'นัดโอน', legal_completed: 'โอนแล้ว',
  pending_auction: 'รอประมูล', auction_in_progress: 'ประมูล', auction_completed: 'ประมูลสำเร็จ',
  completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก',
}

const FOLLOWUP_TYPE_LABEL = {
  chat: '💬 แชท', call: '📞 โทร', note: '📝 โน้ต',
  line_msg: '🟢 LINE', facebook_msg: '🔵 Facebook',
}

const PROPERTY_TYPE_LABEL = {
  house: 'บ้านเดี่ยว', condo: 'คอนโด', townhouse: 'ทาวน์เฮ้าส์',
  land: 'ที่ดิน', commercial: 'อาคารพาณิชย์', other: 'อื่นๆ',
}

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtDateShort(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

function daysFromNow(d) {
  if (!d) return null
  const diff = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24)
  return diff
}

function DueBadge({ next_follow_up_at }) {
  if (!next_follow_up_at) {
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#f5f5f5', color: '#9e9e9e' }}>ยังไม่กำหนด</span>
  }
  const diff = daysFromNow(next_follow_up_at)
  if (diff < 0) {
    const hrs = Math.abs(Math.round(diff * 24))
    const label = hrs < 24 ? `เกิน ${hrs} ชม.` : `เกิน ${Math.round(-diff)} วัน`
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#ffebee', color: '#c62828' }}>🔴 {label}</span>
  }
  if (diff < 1) return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fff3e0', color: '#e65100' }}>🟠 วันนี้</span>
  if (diff < 3) return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fff8e1', color: '#f57f17' }}>🟡 {Math.ceil(diff)} วัน</span>
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#e8f5e9', color: '#2e7d32' }}>🟢 {Math.ceil(diff)} วัน</span>
}

function SummaryCard({ label, value, color, bg, icon, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: active ? color : '#fff',
      border: `2px solid ${active ? color : color + '30'}`,
      borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
      boxShadow: active ? `0 4px 16px ${color}40` : '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <i className={`fas ${icon}`} style={{ color: active ? '#fff' : color, fontSize: 16 }}></i>
        <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#ffffffcc' : '#888' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: active ? '#fff' : color }}>{value}</div>
    </div>
  )
}

export default function FollowUpPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('overdue')
  const [salesFilter, setSalesFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (salesFilter) params.set('sales_id', salesFilter)
    params.set('status', statusFilter)
    fetch(`${API}/followups/admin-overview?${params}`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d)
        } else {
          setError(d.error || 'เกิดข้อผิดพลาด')
          if (d.needsMigration) setData(null)
        }
      })
      .catch(e => setError(e.message || 'ไม่สามารถเชื่อมต่อ server ได้'))
      .finally(() => setLoading(false))
  }, [statusFilter, salesFilter])

  useEffect(() => { load() }, [load])

  const summary = data?.summary || {}
  const cases = data?.cases || []
  const salesList = data?.sales_list || []

  const filtered = search.trim()
    ? cases.filter(c =>
        (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.case_code || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.sales_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : cases

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          <i className="fas fa-bell" style={{ color: '#f57f17', marginRight: 8 }}></i>
          ติดตามลูกหนี้ (Follow-up)
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #e0e0e0',
            background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555',
          }}>
            <i className="fas fa-sync-alt" style={{ marginRight: 6 }}></i>รีเฟรช
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffcc02', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <i className="fas fa-exclamation-triangle" style={{ color: '#e65100', marginTop: 2 }}></i>
          <div>
            <div style={{ fontWeight: 700, color: '#e65100', marginBottom: 4 }}>ไม่สามารถโหลดข้อมูลได้</div>
            <div style={{ fontSize: 13, color: '#555' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <SummaryCard
          label="เกินกำหนด" value={Number(summary.overdue || 0)}
          color="#c62828" icon="fa-exclamation-circle"
          active={statusFilter === 'overdue'} onClick={() => setStatusFilter('overdue')}
        />
        <SummaryCard
          label="วันนี้" value={Number(summary.due_today || 0)}
          color="#e65100" icon="fa-calendar-day"
          active={statusFilter === 'today'} onClick={() => setStatusFilter('today')}
        />
        <SummaryCard
          label="3 วันข้างหน้า" value={Number(summary.upcoming_3d || 0)}
          color="#f57f17" icon="fa-calendar-alt"
          active={statusFilter === 'upcoming'} onClick={() => setStatusFilter('upcoming')}
        />
        <SummaryCard
          label="ยังไม่กำหนด" value={Number(summary.unscheduled || 0)}
          color="#9e9e9e" icon="fa-question-circle"
          active={statusFilter === 'unscheduled'} onClick={() => setStatusFilter('unscheduled')}
        />
        <SummaryCard
          label="ทั้งหมด" value={Number(summary.total_active || 0)}
          color="#1976d2" icon="fa-list"
          active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Sales filter */}
        <select
          value={salesFilter}
          onChange={e => setSalesFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, background: '#fff', color: '#333' }}
        >
          <option value="">ทุกเซลล์</option>
          {salesList.map(s => (
            <option key={s.id} value={s.id}>{s.full_name}{s.nickname ? ` (${s.nickname})` : ''}</option>
          ))}
        </select>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: 13 }}></i>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาลูกหนี้, เคส, เซลล์..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>

        <span style={{ fontSize: 13, color: '#888', marginLeft: 'auto' }}>
          แสดง <strong>{filtered.length}</strong> เคส
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--primary)' }}></i>
          <p style={{ color: '#888', marginTop: 10 }}>กำลังโหลดข้อมูล...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
          <i className="fas fa-check-circle" style={{ fontSize: 40, color: '#c8e6c9', marginBottom: 12 }}></i>
          <p style={{ fontSize: 14 }}>
            {statusFilter === 'overdue' ? '🎉 ไม่มีเคสที่เกินกำหนด!' :
             statusFilter === 'today' ? 'ไม่มีนัด follow-up วันนี้' :
             'ไม่มีเคสในหมวดนี้'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f7ff', borderBottom: '2px solid #e8eaf6' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#555', whiteSpace: 'nowrap' }}>เคส / ลูกหนี้</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#555' }}>เซลล์</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>ทรัพย์</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>ติดตามแล้ว</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>กำหนดตาม</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: '#555' }}>Note ล่าสุด</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>สถานะเคส</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const diff = daysFromNow(c.next_follow_up_at)
                const isOverdue = c.next_follow_up_at && diff < 0
                const rowBg = isOverdue ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafafa'
                return (
                  <tr key={c.case_id} style={{ borderBottom: '1px solid #f0f0f0', background: rowBg }}>
                    {/* เคส / ลูกหนี้ */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>
                        {c.contact_name || 'ไม่ระบุ'}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>
                        {c.case_code || `#${c.case_id}`}
                        {c.contact_phone && <span style={{ marginLeft: 6 }}>📞 {c.contact_phone}</span>}
                      </div>
                    </td>
                    {/* เซลล์ */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#333' }}>{c.sales_name || '-'}</div>
                      {c.sales_nickname && <div style={{ fontSize: 11, color: '#aaa' }}>{c.sales_nickname}</div>}
                    </td>
                    {/* ทรัพย์ */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: '#666' }}>{PROPERTY_TYPE_LABEL[c.property_type] || c.property_type || '-'}</div>
                      {c.province && <div style={{ fontSize: 11, color: '#aaa' }}>{c.province}</div>}
                    </td>
                    {/* ติดตามแล้ว */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, borderRadius: '50%',
                        background: Number(c.follow_up_count) > 0 ? '#e3f2fd' : '#f5f5f5',
                        color: Number(c.follow_up_count) > 0 ? '#1976d2' : '#bbb',
                        fontWeight: 800, fontSize: 14,
                      }}>
                        {c.follow_up_count || 0}
                      </div>
                      {c.last_follow_up_at && (
                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
                          {fmtDateShort(c.last_follow_up_at)}
                        </div>
                      )}
                    </td>
                    {/* กำหนดตาม */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <DueBadge next_follow_up_at={c.next_follow_up_at} />
                      {c.next_follow_up_at && (
                        <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
                          {fmtDate(c.next_follow_up_at)}
                        </div>
                      )}
                    </td>
                    {/* Note ล่าสุด */}
                    <td style={{ padding: '12px 14px', maxWidth: 200 }}>
                      {c.last_note ? (
                        <>
                          <div style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                            {c.last_note}
                          </div>
                          {c.last_type && (
                            <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                              {FOLLOWUP_TYPE_LABEL[c.last_type] || c.last_type}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#ccc', fontSize: 12 }}>ยังไม่มีบันทึก</span>
                      )}
                    </td>
                    {/* สถานะเคส */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#e8eaf6', color: '#3949ab', fontWeight: 600 }}>
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                    </td>
                    {/* ปุ่มดูเคส */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/sales/cases/${c.case_id}`)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none',
                          background: 'var(--primary)', color: '#fff',
                          cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <i className="fas fa-external-link-alt" style={{ marginRight: 4 }}></i>ดูเคส
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/sales/weekly-report'

function getMondayOfWeek(date) {
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}
function fmtDate(s) {
  if (!s) return '-'
  const d = new Date(s)
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
}
function fmtAmount(n) {
  if (!n || isNaN(n)) return '-'
  return Number(n).toLocaleString('th-TH', { maximumFractionDigits: 0 })
}
function parseDetail(str) {
  if (!str) return []
  return str.split(';;').map(s => s.split('|'))
}

// ── sub-row toggle ─────────────────────────────────────────────────────────
function DetailRows({ rows, cols }) {
  return (
    <tr>
      <td colSpan={99} style={{ padding: 0 }}>
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 8, margin: '4px 12px 8px', padding: '8px 12px',
          fontSize: 12
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px dashed #e5e7eb' : 'none' }}>
                  {r.slice(0, cols).map((cell, j) => (
                    <td key={j} style={{ padding: '4px 8px', color: '#374151' }}>{cell || '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}

// ── Sales row ──────────────────────────────────────────────────────────────
function SalesRow({ salesId, salesName, nickname, contacts, followups, closed, active, color }) {
  const [openSection, setOpenSection] = useState(null)
  const toggle = (key) => setOpenSection(prev => prev === key ? null : key)

  const contactDetail  = parseDetail(contacts?.contacts_detail)
  const followupDetail = parseDetail(followups?.followup_detail)
  const closedDetail   = parseDetail(closed?.closed_detail)

  const newContacts  = contacts?.new_contacts  || 0
  const converted    = contacts?.converted_to_case || 0
  const rejected     = contacts?.rejected || 0
  const fups         = followups?.followup_count || 0
  const fupCases     = followups?.followup_cases || 0
  const closedCases  = closed?.closed_cases || 0
  const totalAmt     = closed?.total_amount || 0
  const activeCases  = active?.active_cases || 0
  const overdueFollowups = active?.overdue_followups || 0

  const hasActivity = newContacts > 0 || fups > 0 || closedCases > 0

  return (
    <>
      <tr style={{
        background: hasActivity ? '#fff' : '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        opacity: hasActivity ? 1 : 0.6
      }}>
        {/* Sales name */}
        <td style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14
            }}>
              {(nickname || salesName || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{salesName}</div>
              {nickname && <div style={{ fontSize: 11, color: '#9ca3af' }}>{nickname}</div>}
            </div>
          </div>
        </td>

        {/* ลูกหนี้ใหม่ */}
        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
          <button
            onClick={() => toggle('contacts')}
            disabled={newContacts === 0}
            style={{
              background: newContacts > 0 ? '#eff6ff' : 'transparent',
              color: newContacts > 0 ? '#1d4ed8' : '#d1d5db',
              border: 'none', borderRadius: 8, padding: '4px 12px',
              fontWeight: 700, fontSize: 15, cursor: newContacts > 0 ? 'pointer' : 'default'
            }}>
            {newContacts}
          </button>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
            {converted > 0 && `${converted} เป็นเคส`}
            {rejected > 0 && ` / ${rejected} ปฏิเสธ`}
          </div>
        </td>

        {/* Follow-up */}
        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
          <button
            onClick={() => toggle('followups')}
            disabled={fups === 0}
            style={{
              background: fups > 0 ? '#f0fdf4' : 'transparent',
              color: fups > 0 ? '#16a34a' : '#d1d5db',
              border: 'none', borderRadius: 8, padding: '4px 12px',
              fontWeight: 700, fontSize: 15, cursor: fups > 0 ? 'pointer' : 'default'
            }}>
            {fups}
          </button>
          {fupCases > 0 && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{fupCases} เคส</div>}
        </td>

        {/* ปิดดีล */}
        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
          <button
            onClick={() => toggle('closed')}
            disabled={closedCases === 0}
            style={{
              background: closedCases > 0 ? '#fef9c3' : 'transparent',
              color: closedCases > 0 ? '#92400e' : '#d1d5db',
              border: 'none', borderRadius: 8, padding: '4px 12px',
              fontWeight: 700, fontSize: 15, cursor: closedCases > 0 ? 'pointer' : 'default'
            }}>
            {closedCases}
          </button>
          {totalAmt > 0 && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>฿{fmtAmount(totalAmt)}</div>}
        </td>

        {/* Active */}
        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: activeCases > 0 ? '#374151' : '#d1d5db' }}>
            {activeCases}
          </span>
          {overdueFollowups > 0 && (
            <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginTop: 2 }}>
              ⚠ {overdueFollowups} เกินกำหนด
            </div>
          )}
        </td>
      </tr>

      {/* Detail sub-rows */}
      {openSection === 'contacts' && contactDetail.length > 0 && (
        <DetailRows rows={contactDetail.map(r => [r[1] || '-', r[2] || '-', r[3] || '-', fmtDate(r[4])])} cols={4} />
      )}
      {openSection === 'followups' && followupDetail.length > 0 && (
        <DetailRows rows={followupDetail.map(r => [r[1] || '-', r[2] || '-', `ครั้งที่ ${r[3] || '?'}`, fmtDate(r[4]), r[5] || ''])} cols={5} />
      )}
      {openSection === 'closed' && closedDetail.length > 0 && (
        <DetailRows rows={closedDetail.map(r => [r[1] || '-', r[2] || '-', r[3] > 0 ? `฿${fmtAmount(r[3])}` : '-', fmtDate(r[4])])} cols={4} />
      )}
    </>
  )
}

const AVATAR_COLORS = ['#1d4ed8','#7c3aed','#be185d','#0891b2','#16a34a','#d97706','#dc2626','#4f46e5']

export default function WeeklyReportPage() {
  const today    = new Date()
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(today))
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const printRef = useRef(null)

  const load = useCallback(async (ws) => {
    setLoading(true)
    try {
      const r = await fetch(`${API}?week_start=${ws}`, { headers: { Authorization: `Bearer ${token()}` } })
      const d = await r.json()
      if (d.success) setData(d)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load(weekStart) }, [weekStart, load])

  const prevWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().slice(0, 10))
  }
  const nextWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().slice(0, 10))
  }

  // Merge sales data
  const salesMap = {}
  if (data) {
    ;[...data.contacts, ...data.followups, ...data.closed, ...data.active].forEach(r => {
      if (!salesMap[r.sales_id]) salesMap[r.sales_id] = { salesId: r.sales_id, salesName: r.sales_name, nickname: r.nickname }
    })
    data.contacts.forEach(r  => { salesMap[r.sales_id].contacts  = r })
    data.followups.forEach(r => { salesMap[r.sales_id].followups = r })
    data.closed.forEach(r   => { salesMap[r.sales_id].closed     = r })
    data.active.forEach(r   => { salesMap[r.sales_id].active     = r })
  }
  const salesList = Object.values(salesMap)

  const totalContacts  = salesList.reduce((s, r) => s + (r.contacts?.new_contacts  || 0), 0)
  const totalFollowups = salesList.reduce((s, r) => s + (r.followups?.followup_count || 0), 0)
  const totalClosed    = salesList.reduce((s, r) => s + (r.closed?.closed_cases || 0), 0)
  const totalAmount    = salesList.reduce((s, r) => s + Number(r.closed?.total_amount || 0), 0)

  const weekLabel = data
    ? `${fmtDate(data.week_start)} – ${fmtDate(data.week_end)}`
    : ''

  return (
    <div ref={printRef} style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          color: '#fff', borderRadius: 12, padding: '10px 16px',
          fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8
        }}>
          <i className="fas fa-calendar-week" /> รายงานประจำสัปดาห์
        </div>

        {/* Week navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 10, padding: '4px 8px' }}>
          <button onClick={prevWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16, padding: '4px 8px' }}>
            ‹
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', minWidth: 140, textAlign: 'center' }}>
            {weekLabel || weekStart}
          </div>
          <button onClick={nextWeek} disabled={weekStart >= getMondayOfWeek(today)} style={{
            background: 'none', border: 'none',
            cursor: weekStart >= getMondayOfWeek(today) ? 'default' : 'pointer',
            color: weekStart >= getMondayOfWeek(today) ? '#d1d5db' : '#6b7280',
            fontSize: 16, padding: '4px 8px'
          }}>›</button>
        </div>

        <input
          type="date"
          value={weekStart}
          onChange={e => { if (e.target.value) setWeekStart(getMondayOfWeek(e.target.value)) }}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}
        />

        <div style={{ flex: 1 }} />

        <button
          onClick={() => window.print()}
          style={{
            background: '#374151', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
          <i className="fas fa-print" /> พิมพ์
        </button>
      </div>

      {/* Summary cards */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'ลูกหนี้ติดต่อใหม่', value: totalContacts, icon: 'fas fa-user-plus', color: '#1d4ed8', bg: '#eff6ff' },
            { label: 'Follow-up ที่ทำ', value: totalFollowups, icon: 'fas fa-phone-alt', color: '#16a34a', bg: '#f0fdf4' },
            { label: 'เคสปิดดีล', value: totalClosed, icon: 'fas fa-check-circle', color: '#d97706', bg: '#fef9c3' },
            { label: 'วงเงินรวม', value: `฿${fmtAmount(totalAmount)}`, icon: 'fas fa-baht-sign', color: '#7c3aed', bg: '#f5f3ff' },
          ].map(c => (
            <div key={c.label} style={{
              background: c.bg, border: `1px solid ${c.color}30`,
              borderRadius: 12, padding: '14px 16px', textAlign: 'center'
            }}>
              <i className={c.icon} style={{ fontSize: 22, color: c.color, marginBottom: 6, display: 'block' }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value || 0}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />
          กำลังโหลด...
        </div>
      ) : salesList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', background: '#f9fafb', borderRadius: 12, border: '2px dashed #e5e7eb' }}>
          <i className="fas fa-inbox" style={{ fontSize: 36, display: 'block', marginBottom: 10, color: '#d1d5db' }} />
          ไม่มีข้อมูลสัปดาห์นี้
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#fff' }}>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, width: '25%' }}>เซลล์</th>
                <th style={{ padding: '13px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
                  <i className="fas fa-user-plus" style={{ marginRight: 4 }} />ลูกหนี้ใหม่
                </th>
                <th style={{ padding: '13px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
                  <i className="fas fa-phone-alt" style={{ marginRight: 4 }} />Follow-up
                </th>
                <th style={{ padding: '13px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
                  <i className="fas fa-handshake" style={{ marginRight: 4 }} />ปิดดีล
                </th>
                <th style={{ padding: '13px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
                  <i className="fas fa-briefcase" style={{ marginRight: 4 }} />Active
                </th>
              </tr>
            </thead>
            <tbody>
              {salesList.map((s, i) => (
                <SalesRow
                  key={s.salesId}
                  {...s}
                  color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                />
              ))}
            </tbody>
            {/* Footer totals */}
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>รวมทั้งทีม</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#1d4ed8' }}>{totalContacts}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#16a34a' }}>{totalFollowups}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#d97706' }}>
                  {totalClosed}
                  {totalAmount > 0 && <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>฿{fmtAmount(totalAmount)}</div>}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, fontSize: 15 }}>
                  {salesList.reduce((s, r) => s + (r.active?.active_cases || 0), 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
        <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
        คลิกตัวเลขในแต่ละช่องเพื่อดูรายละเอียด
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          @page { size: A4 landscape; margin: 1cm; }
        }
      `}</style>
    </div>
  )
}

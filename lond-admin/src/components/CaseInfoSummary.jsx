/**
 * CaseInfoSummary — แสดงข้อมูลที่ฝ่ายขายกรอกไว้ (อ่านอย่างเดียว)
 * ใช้ได้กับทุกหน้าแก้ไขของแต่ละฝ่าย
 * Props: caseId (int), loanRequestId (int, optional)
 */
import { useState, useEffect } from 'react'

const SALES_API = '/api/admin/sales'
const token = () => localStorage.getItem('loandd_admin')

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const apptTypeLabel = {
  valuation:   { label: '🏠 นัดประเมิน',     color: '#1565c0' },
  transaction: { label: '🏛️ นัดกรมที่ดิน',   color: '#6a1b9a' },
  call:        { label: '📞 โทรหาลูกหนี้',     color: '#2e7d32' },
  other:       { label: '📌 อื่นๆ',           color: '#e65100' },
}

export default function CaseInfoSummary({ caseId, loanRequestId }) {
  const [followups, setFollowups] = useState([])
  const [appointments, setAppointments] = useState([])
  const [screening, setScreening] = useState(null)
  const [caseExtra, setCaseExtra] = useState(null)   // next_follow_up_at, follow_up_count
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (!caseId) return
    const h = { Authorization: `Bearer ${token()}` }

    fetch(`${SALES_API}/cases/${caseId}/followups`, { headers: h })
      .then(r => r.json()).then(d => { if (d.success) setFollowups(d.data || []) }).catch(() => {})

    fetch(`${SALES_API}/cases/${caseId}/appointments`, { headers: h })
      .then(r => r.json()).then(d => { if (d.success) setAppointments(d.data || []) }).catch(() => {})

    // ดึง next_follow_up_at จาก case
    fetch(`${SALES_API}/cases/${caseId}`, { headers: h })
      .then(r => r.json()).then(d => {
        if (d.success && d.caseData) {
          setCaseExtra(d.caseData)
          // screening จาก loan_request ที่แนบมากับ case
          if (d.caseData.loan_request_id || loanRequestId) {
            const lrId = loanRequestId || d.caseData.loan_request_id
            fetch(`${SALES_API}/debtors/${lrId}`, { headers: h })
              .then(r2 => r2.json()).then(d2 => {
                if (d2.success && d2.debtor) setScreening(d2.debtor)
              }).catch(() => {})
          }
        }
      }).catch(() => {})
  }, [caseId, loanRequestId])

  // FollowUp badge
  const FollowBadge = ({ nextAt }) => {
    if (!nextAt) return null
    const now = new Date()
    const due = new Date(nextAt)
    const diffMs = due - now
    const diffDays = Math.ceil(diffMs / 86400000)
    let bg, color, icon, label
    if (diffMs < 0) { bg = '#fde8e8'; color = '#e53935'; icon = 'fa-exclamation-circle'; label = `เกินกำหนด ${Math.abs(diffDays)} วัน` }
    else if (diffDays <= 1) { bg = '#fff3e0'; color = '#e65100'; icon = 'fa-bell'; label = 'วันนี้/พรุ่งนี้' }
    else if (diffDays <= 3) { bg = '#fff8e1'; color = '#f57f17'; icon = 'fa-clock'; label = `อีก ${diffDays} วัน` }
    else { bg = '#f1f8e9'; color = '#558b2f'; icon = 'fa-calendar-check'; label = fmtDate(nextAt) }
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:12,
        background: bg, color, fontWeight:700, fontSize:11, border:`1px solid ${color}44`, whiteSpace:'nowrap' }}>
        <i className={`fas ${icon}`} style={{ fontSize:10 }}></i> {label}
      </span>
    )
  }

  const hasAny = followups.length > 0 || appointments.length > 0 || screening

  return (
    <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
      {/* Header — คลิกพับ/ขยาย */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', background:'#f0faf5', cursor:'pointer', userSelect:'none' }}>
        <i className="fas fa-clipboard-list" style={{ color:'var(--primary)', fontSize:15 }}></i>
        <span style={{ fontWeight:700, fontSize:14, color:'#1a472a', flex:1 }}>
          ข้อมูลจากฝ่ายขาย
        </span>
        {/* badges สรุป */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {caseExtra?.next_follow_up_at && <FollowBadge nextAt={caseExtra.next_follow_up_at} />}
          {appointments.filter(a => a.status === 'scheduled').length > 0 && (
            <span style={{ background:'#e3f2fd', color:'#1565c0', borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:700, border:'1px solid #90caf9' }}>
              <i className="fas fa-calendar-alt" style={{ marginRight:4, fontSize:10 }}></i>
              {appointments.filter(a => a.status === 'scheduled').length} นัด
            </span>
          )}
          {screening?.ineligible_property ? (
            <span style={{ background:'#fde8e8', color:'#c62828', borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:700, border:'1px solid #ef9a9a' }}>
              <i className="fas fa-times-circle" style={{ marginRight:4, fontSize:10 }}></i>ทรัพย์ไม่ผ่าน
            </span>
          ) : screening?.screening_status === 'eligible' ? (
            <span style={{ background:'#e8f5e9', color:'#2e7d32', borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:700, border:'1px solid #a5d6a7' }}>
              <i className="fas fa-check-circle" style={{ marginRight:4, fontSize:10 }}></i>ผ่านเกณฑ์
            </span>
          ) : null}
        </div>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color:'#888', fontSize:12 }}></i>
      </div>

      {open && (
        <div style={{ padding:'16px 18px', background:'#fff' }}>
          {!hasAny && !caseExtra && (
            <p style={{ color:'#aaa', fontSize:13, margin:0 }}>ยังไม่มีข้อมูลจากฝ่ายขาย</p>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>

            {/* ── Follow-up ── */}
            <div>
              <div style={{ fontWeight:700, fontSize:12, color:'#6a1b9a', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <i className="fas fa-phone-alt"></i> Follow-up
                {caseExtra?.follow_up_count > 0 && (
                  <span style={{ background:'#f3e5f5', color:'#6a1b9a', borderRadius:10, padding:'1px 7px', fontSize:11 }}>
                    {caseExtra.follow_up_count} ครั้ง
                  </span>
                )}
              </div>
              {caseExtra?.next_follow_up_at && (
                <div style={{ marginBottom:6 }}>
                  <span style={{ fontSize:11, color:'#888' }}>ครั้งถัดไป: </span>
                  <FollowBadge nextAt={caseExtra.next_follow_up_at} />
                </div>
              )}
              {caseExtra?.last_follow_up_at && (
                <div style={{ fontSize:12, color:'#666', marginBottom:6 }}>
                  <i className="fas fa-history" style={{ marginRight:4, color:'#aaa' }}></i>
                  ตามล่าสุด: {fmtDateTime(caseExtra.last_follow_up_at)}
                </div>
              )}
              {followups.slice(0, 3).map((f, i) => (
                <div key={i} style={{ fontSize:11, color:'#555', marginBottom:4, display:'flex', gap:5, alignItems:'flex-start', borderLeft:'2px solid #ce93d8', paddingLeft:6 }}>
                  <span style={{ flexShrink:0 }}>{f.followup_type === 'call' ? '📞' : f.followup_type === 'chat' ? '💬' : '📝'}</span>
                  <span style={{ flex:1 }}>
                    {f.note || f.followup_type}
                    <span style={{ color:'#bbb', marginLeft:4, fontSize:10 }}>
                      {fmtDate(f.created_at)}
                    </span>
                  </span>
                </div>
              ))}
              {followups.length === 0 && <p style={{ fontSize:11, color:'#ccc', margin:0 }}>ยังไม่มีประวัติ</p>}
            </div>

            {/* ── Appointments ── */}
            <div>
              <div style={{ fontWeight:700, fontSize:12, color:'#1565c0', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <i className="fas fa-calendar-alt"></i> นัดหมาย
              </div>
              {appointments.length === 0 && <p style={{ fontSize:11, color:'#ccc', margin:0 }}>ยังไม่มีนัด</p>}
              {appointments.slice(0, 3).map((a, i) => {
                const t = apptTypeLabel[a.appt_type] || apptTypeLabel.other
                const statusColor = a.status === 'completed' ? '#27ae60' : a.status === 'cancelled' ? '#e74c3c' : '#1565c0'
                return (
                  <div key={i} style={{ marginBottom:8, borderLeft:`2px solid ${t.color}`, paddingLeft:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{ fontWeight:700, fontSize:11, color:t.color }}>{t.label}</span>
                      <span style={{ fontSize:10, padding:'1px 6px', borderRadius:8, background:statusColor+'22', color:statusColor, fontWeight:600 }}>
                        {a.status === 'completed' ? 'เสร็จ' : a.status === 'cancelled' ? 'ยกเลิก' : 'กำหนดไว้'}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:'#555' }}>
                      {a.appt_date ? new Date(a.appt_date).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'numeric' }) : '-'}
                      {a.appt_time ? ` ${a.appt_time.slice(0,5)} น.` : ''}
                    </div>
                    {a.location && <div style={{ fontSize:10, color:'#888' }}><i className="fas fa-map-marker-alt" style={{ marginRight:3 }}></i>{a.location}</div>}
                  </div>
                )
              })}
            </div>

            {/* ── Asset Screening ── */}
            <div>
              <div style={{ fontWeight:700, fontSize:12, color:'#c62828', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                <i className="fas fa-shield-alt"></i> คัดทรัพย์
              </div>
              {!screening && <p style={{ fontSize:11, color:'#ccc', margin:0 }}>-</p>}
              {screening && (
                <div>
                  <div style={{ marginBottom:6 }}>
                    {screening.ineligible_property ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:12, background:'#fde8e8', color:'#c62828', fontWeight:700, fontSize:12, border:'1px solid #ef9a9a' }}>
                        <i className="fas fa-times-circle"></i> ทรัพย์ไม่ผ่านเกณฑ์
                      </span>
                    ) : screening.screening_status === 'eligible' ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:12, background:'#e8f5e9', color:'#2e7d32', fontWeight:700, fontSize:12, border:'1px solid #a5d6a7' }}>
                        <i className="fas fa-check-circle"></i> ผ่านเกณฑ์ SOP
                      </span>
                    ) : screening.screening_status === 'pending' ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:12, background:'#fff8e1', color:'#f57f17', fontWeight:700, fontSize:12, border:'1px solid #ffe082' }}>
                        <i className="fas fa-search"></i> กำลังตรวจสอบ
                      </span>
                    ) : (
                      <span style={{ fontSize:12, color:'#bbb' }}>ยังไม่ประเมิน</span>
                    )}
                  </div>
                  {screening.ineligible_reason && (
                    <div style={{ fontSize:11, color:'#c62828', background:'#fff0f0', borderRadius:6, padding:'4px 8px' }}>
                      <i className="fas fa-exclamation-circle" style={{ marginRight:4 }}></i>
                      {screening.ineligible_reason}
                    </div>
                  )}
                  {screening.deed_type && (
                    <div style={{ fontSize:11, color:'#555', marginTop:4 }}>
                      ประเภทโฉนด: <strong>{screening.deed_type === 'chanote' ? 'โฉนด (น.ส.4)' : screening.deed_type === 'ns4k' ? 'น.ส.4ก.' : screening.deed_type === 'ns3' ? 'นส.3 ⚠️' : screening.deed_type === 'spk' ? 'ส.ป.ก. ❌' : screening.deed_type}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/admin') + '/sales'
// token key ต้องตรงกับ AdminLogin.jsx ที่ set ไว้ว่า 'loandd_admin'
const token = () => localStorage.getItem('loandd_admin') || localStorage.getItem('loandd_token') || ''

// แปลงเวลา "HH:MM" หรือ "HH:MM:SS" → "HH:MM น."
function fmtTime(t) {
  if (!t) return null
  const m = String(t).match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return `${m[1].padStart(2,'0')}:${m[2]} น.`
}

// ====== สีและ label แต่ละประเภทนัดหมาย ======
const EVENT_TYPES = {
  followup:        { label: 'นัดติดตามแชท',        color: '#ec4899', bg: '#fdf2f8', icon: 'fa-comments' },
  case_followup:   { label: 'ติดตาม Case',           color: '#f97316', bg: '#fff7ed', icon: 'fa-bell' },
  valuation:       { label: 'นัดประเมิน',            color: '#f59e0b', bg: '#fffbeb', icon: 'fa-search-dollar' },
  appraisal_date:  { label: 'วันประเมินราคา',        color: '#f59e0b', bg: '#fffbeb', icon: 'fa-search-dollar' },
  transaction:     { label: 'นัดนิติกรรม / โอนสิทธิ์', color: '#10b981', bg: '#f0fdf4', icon: 'fa-handshake' },
  land_appointment:{ label: 'นัดกรมที่ดิน / โอนเงิน', color: '#8b5cf6', bg: '#f5f3ff', icon: 'fa-university' },
  call:            { label: 'นัดโทรติดตาม',           color: '#3b82f6', bg: '#eff6ff', icon: 'fa-phone' },
  other:           { label: 'นัดทั่วไป',              color: '#6b7280', bg: '#f9fafb', icon: 'fa-calendar-check' },
}

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const THAI_DAYS   = ['อา','จ','อ','พ','พฤ','ศ','ส']

// toDateStr: แปลง Date หรือ string → "YYYY-MM-DD" ตาม local time (ป้องกัน UTC drift)
function toDateStr(d) {
  if (!d) return null
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d  // already formatted
  const dt = new Date(d)
  if (isNaN(dt)) return null
  // ใช้ local offset
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const APPT_TYPE_OPTIONS = [
  { value: 'valuation',        label: 'นัดประเมิน' },
  { value: 'land_appointment', label: 'นัดกรมที่ดิน' },
  { value: 'transaction',      label: 'นัดนิติกรรม / โอน' },
  { value: 'call',             label: 'นัดโทรติดตาม' },
  { value: 'other',            label: 'นัดทั่วไป' },
]

export default function CalendarPage() {
  const navigate = useNavigate()
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [selectedDay, setSelectedDay]   = useState(null)   // 'YYYY-MM-DD'
  const [detailEvent, setDetailEvent]   = useState(null)   // คลิก event → popup detail

  // ====== Add Appointment Modal ======
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ appt_type: 'valuation', appt_date: '', appt_time: '', customer_name: '', location: '', notes: '' })
  const [savingAdd, setSavingAdd] = useState(false)
  const [addError, setAddError] = useState('')

  // ====== Edit / Cancel Appointment ======
  const [editingAppt, setEditingAppt] = useState(false)
  const [editApptForm, setEditApptForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [cancellingAppt, setCancellingAppt] = useState(false)
  const [editApptError, setEditApptError] = useState('')

  // ====== โหลด events ======
  const fetchEvents = useCallback(() => {
    setLoading(true)
    fetch(`${API}/calendar/events?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setEvents(d.events || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [year, month])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // ====== สร้างนัดหมายใหม่ ======
  async function saveAppointment() {
    if (!addForm.appt_type || !addForm.appt_date) { setAddError('กรุณาระบุประเภทและวันนัดหมาย'); return }
    setSavingAdd(true); setAddError('')
    try {
      const r = await fetch(`${API}/appointments/standalone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(addForm)
      })
      const d = await r.json()
      if (d.success) {
        setShowAddModal(false)
        setAddForm({ appt_type: 'valuation', appt_date: '', appt_time: '', customer_name: '', location: '', notes: '' })
        fetchEvents()  // reload calendar
      } else {
        setAddError(d.error || 'เกิดข้อผิดพลาด')
      }
    } catch (e) { setAddError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์') }
    setSavingAdd(false)
  }

  // เปิด modal พร้อมกรอกวันที่ที่คลิก
  function openAddModal(dateStr) {
    setAddForm(f => ({ ...f, appt_date: dateStr || toDateStr(today) }))
    setShowAddModal(true)
  }

  // เปิด edit mode สำหรับนัดหมายที่เลือก
  function openEditAppt() {
    setEditApptForm({
      appt_type: detailEvent?.type || 'other',
      appt_date: detailEvent?.date ? String(detailEvent.date).slice(0, 10) : '',
      appt_time: detailEvent?.time ? String(detailEvent.time).slice(0, 5) : '',
      location:  detailEvent?.location  || '',
      notes:     detailEvent?.notes     || '',
    })
    setEditApptError('')
    setEditingAppt(true)
  }

  // บันทึกการแก้ไขนัดหมาย
  async function saveEditAppointment() {
    const apptId = detailEvent?.id?.toString().replace('appt_', '')
    if (!editApptForm.appt_date) { setEditApptError('กรุณาระบุวันนัดหมาย'); return }
    setSavingEdit(true); setEditApptError('')
    try {
      const r = await fetch(`${API}/appointments/${apptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          appt_type: editApptForm.appt_type,
          appt_date: editApptForm.appt_date,
          appt_time: editApptForm.appt_time || null,
          location:  editApptForm.location,
          notes:     editApptForm.notes,
        })
      })
      const d = await r.json()
      if (d.success) {
        setEditingAppt(false)
        setDetailEvent(null)
        fetchEvents()
      } else {
        setEditApptError(d.error || 'เกิดข้อผิดพลาด')
      }
    } catch { setEditApptError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์') }
    setSavingEdit(false)
  }

  // ยกเลิกนัดหมาย
  async function cancelAppointment() {
    if (!window.confirm('ยืนยันยกเลิกนัดหมายนี้หรือไม่?')) return
    const apptId = detailEvent?.id?.toString().replace('appt_', '')
    setCancellingAppt(true)
    try {
      const r = await fetch(`${API}/appointments/${apptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: 'cancelled' })
      })
      const d = await r.json()
      if (d.success) {
        setDetailEvent(null)
        fetchEvents()
      }
    } catch { /* ignore */ }
    setCancellingAppt(false)
  }

  // ====== สร้าง grid ของเดือน ======
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth     = new Date(year, month, 0).getDate()
  // จำนวน cell ทั้งหมด (กรอกด้วย null ก่อน + หลัง)
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDayOfMonth + 1
    return (dayNum < 1 || dayNum > daysInMonth) ? null : dayNum
  })

  // ====== map events ลง date ======
  // map source → filter key เพื่อให้ land_transfer ติดกับ land_appointment
  function eventMatchesFilter(e, ft) {
    if (ft === 'all') return true
    if (e.type === ft || e.source === ft) return true
    if (ft === 'land_appointment' && e.source === 'land_transfer') return true
    if (ft === 'case_followup' && e.source === 'case_followup') return true
    return false
  }
  const eventsFiltered = filterType === 'all' ? events : events.filter(e => eventMatchesFilter(e, filterType))
  const eventsByDate = {}
  eventsFiltered.forEach(ev => {
    const d = ev.date ? String(ev.date).slice(0, 10) : null
    if (!d) return
    if (!eventsByDate[d]) eventsByDate[d] = []
    eventsByDate[d].push(ev)
  })

  // ====== นำทาง เดือน ======
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
    setSelectedDay(toDateStr(today))
  }

  const todayStr = toDateStr(today)

  // ====== สรุป event ของวันที่เลือก ======
  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] || []) : []

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: 0 }}>

      {/* ===== Header ===== */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)',
        color: '#fff', padding: '18px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <i className="fas fa-calendar-alt" style={{ fontSize: 22 }}></i>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>ปฏิทินนัดหมาย</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>รวมนัดหมายทุกฝ่าย — อัพเดทแบบ real-time</div>
          </div>
        </div>

        {/* Month Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={prevMonth} style={navBtnStyle}>
            <i className="fas fa-chevron-left"></i>
          </button>

          {/* ★ Month + Year selects */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              value={month}
              onChange={e => { setMonth(Number(e.target.value)); setSelectedDay(null) }}
              style={headerSelectStyle}
            >
              {THAI_MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => { setYear(Number(e.target.value)); setSelectedDay(null) }}
              style={{ ...headerSelectStyle, minWidth: 80 }}
            >
              {Array.from({ length: 15 }, (_, i) => today.getFullYear() - 9 + i).map(y => (
                <option key={y} value={y}>{y + 543}</option>
              ))}
            </select>
          </div>

          <button onClick={nextMonth} style={navBtnStyle}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <button onClick={goToday} style={{
            ...navBtnStyle, background: '#f59e0b', borderRadius: 8,
            padding: '6px 14px', fontSize: 12, fontWeight: 700, marginLeft: 6
          }}>
            <i className="fas fa-dot-circle" style={{ marginRight: 5 }}></i>วันนี้
          </button>
          <button onClick={() => openAddModal(selectedDay || toDateStr(today))} style={{
            ...navBtnStyle, background: '#22c55e', borderRadius: 8,
            padding: '6px 16px', fontSize: 12, fontWeight: 700, marginLeft: 4
          }}>
            <i className="fas fa-plus" style={{ marginRight: 5 }}></i>เพิ่มนัดหมาย
          </button>
        </div>
      </div>

      {/* ===== Filter Bar ===== */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginRight: 4 }}>
          <i className="fas fa-filter" style={{ marginRight: 4 }}></i>แสดง:
        </span>
        {[
          { key: 'all', label: 'ทั้งหมด', color: '#1e3a5f', icon: 'fa-th' },
          ...Object.entries(EVENT_TYPES).map(([k, v]) => ({ key: k, label: v.label, color: v.color, icon: v.icon }))
        ].map(f => (
          <button key={f.key} onClick={() => setFilterType(f.key)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            border: `1.5px solid ${f.color}`,
            background: filterType === f.key ? f.color : '#fff',
            color: filterType === f.key ? '#fff' : f.color,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s'
          }}>
            <i className={`fas ${f.icon}`} style={{ fontSize: 10 }}></i>
            {f.label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
          {loading
            ? <span><i className="fas fa-spinner fa-spin" style={{ marginRight: 5 }}></i>กำลังโหลด...</span>
            : <span><i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: 5 }}></i>
                {eventsFiltered.length} รายการ
              </span>
          }
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 145px)' }}>

        {/* ===== Calendar Grid ===== */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {THAI_DAYS.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 12, fontWeight: 800,
                color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#475569',
                padding: '8px 4px', background: '#f8fafc', borderRadius: 6
              }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((dayNum, idx) => {
              if (!dayNum) return <div key={`empty_${idx}`} style={{ minHeight: 100, background: '#f8fafc', borderRadius: 6, opacity: 0.4 }} />

              const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
              const dayEvents = eventsByDate[dateStr] || []
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDay
              const isWeekend = idx % 7 === 0 || idx % 7 === 6

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    minHeight: 100, borderRadius: 8, cursor: 'pointer', padding: '6px 5px',
                    background: isSelected ? '#eff6ff' : isToday ? '#fefce8' : '#fff',
                    border: isSelected ? '2px solid #3b82f6' : isToday ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                    transition: 'all 0.15s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Day number + add button */}
                  <div style={{
                    fontSize: 13, fontWeight: isToday ? 900 : 600,
                    color: isToday ? '#d97706' : isWeekend ? (idx % 7 === 0 ? '#ef4444' : '#3b82f6') : '#334155',
                    marginBottom: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span style={{
                      background: isToday ? '#f59e0b' : 'transparent',
                      color: isToday ? '#fff' : 'inherit',
                      width: 22, height: 22, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12
                    }}>{dayNum}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {/* + เพิ่มนัดหมาย */}
                      <button
                        onClick={e => { e.stopPropagation(); openAddModal(dateStr) }}
                        title="เพิ่มนัดหมาย"
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: '#94a3b8', fontSize: 11, padding: '0 2px', lineHeight: 1,
                          borderRadius: 4
                        }}
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                      {dayEvents.length > 0 && (
                        <span style={{
                          background: '#1e3a5f', color: '#fff', borderRadius: 10,
                          fontSize: 9, fontWeight: 800, padding: '1px 5px', minWidth: 16, textAlign: 'center'
                        }}>{dayEvents.length}</span>
                      )}
                    </span>
                  </div>

                  {/* Event pills — show max 3, then "+N more" */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayEvents.slice(0, 3).map(ev => {
                      const cfg = EVENT_TYPES[ev.type] || EVENT_TYPES[ev.source] || EVENT_TYPES.other
                      return (
                        <div key={ev.id}
                          onClick={e => { e.stopPropagation(); setDetailEvent(ev); setSelectedDay(dateStr) }}
                          style={{
                            background: cfg.color, color: '#fff',
                            borderRadius: 4, fontSize: 9, fontWeight: 700,
                            padding: '2px 5px', cursor: 'pointer',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            display: 'flex', alignItems: 'center', gap: 3
                          }}
                        >
                          <i className={`fas ${cfg.icon}`} style={{ fontSize: 8, flexShrink: 0 }}></i>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.customer_name || cfg.label}
                          </span>
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, paddingLeft: 4 }}>
                        +{dayEvents.length - 3} เพิ่มเติม
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ===== Right Panel: Selected Day Detail ===== */}
        <div style={{
          width: 300, background: '#fff', borderLeft: '1px solid #e2e8f0',
          overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column'
        }}>
          {/* Panel header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #e2e8f0',
            background: selectedDay ? '#1e3a5f' : '#f8fafc',
            color: selectedDay ? '#fff' : '#94a3b8'
          }}>
            {selectedDay ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>
                    <i className="fas fa-calendar-day" style={{ marginRight: 6 }}></i>
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('th-TH', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                    {selectedDayEvents.length} นัดหมาย
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  title="ปิด"
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                    borderRadius: '50%', width: 26, height: 26, cursor: 'pointer',
                    fontSize: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, textAlign: 'center', padding: 8 }}>
                <i className="fas fa-hand-pointer" style={{ fontSize: 18, display: 'block', marginBottom: 6 }}></i>
                คลิกที่วันเพื่อดูรายละเอียด
              </div>
            )}
          </div>

          {/* Event list for selected day */}
          {selectedDay && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              {selectedDayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>
                  <i className="fas fa-calendar-times" style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: 0.4 }}></i>
                  ไม่มีนัดหมายในวันนี้
                </div>
              ) : (
                selectedDayEvents.map(ev => {
                  const cfg = EVENT_TYPES[ev.type] || EVENT_TYPES[ev.source] || EVENT_TYPES.other
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setDetailEvent(ev)}
                      style={{
                        background: cfg.bg, border: `1.5px solid ${cfg.color}`,
                        borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                        cursor: 'pointer', transition: 'box-shadow 0.15s'
                      }}
                    >
                      {/* Type badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{
                          background: cfg.color, color: '#fff', borderRadius: 6,
                          fontSize: 10, fontWeight: 800, padding: '2px 8px',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <i className={`fas ${cfg.icon}`} style={{ fontSize: 9 }}></i>
                          {cfg.label}
                        </span>
                        {fmtTime(ev.time) && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            <i className="fas fa-clock" style={{ marginRight: 3 }}></i>
                            {fmtTime(ev.time)}
                          </span>
                        )}
                      </div>

                      {/* Customer name */}
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 2 }}>
                        <i className="fas fa-user" style={{ marginRight: 5, color: cfg.color, fontSize: 11 }}></i>
                        {ev.customer_name}
                      </div>

                      {/* Case code */}
                      {ev.case_code && (
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                          <i className="fas fa-tag" style={{ marginRight: 4 }}></i>
                          เคส: {ev.case_code}
                        </div>
                      )}

                      {/* Location */}
                      {ev.location && (
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                          <i className="fas fa-map-marker-alt" style={{ marginRight: 4 }}></i>
                          {ev.location}
                        </div>
                      )}

                      {/* Notes */}
                      {ev.notes && (
                        <div style={{
                          fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.7)',
                          borderRadius: 5, padding: '3px 7px', marginTop: 4,
                          borderLeft: `3px solid ${cfg.color}`
                        }}>
                          {ev.notes}
                        </div>
                      )}

                      {/* Assigned */}
                      {ev.assigned_to_name && (
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>
                          <i className="fas fa-user-tie" style={{ marginRight: 3 }}></i>
                          {ev.assigned_to_name}
                        </div>
                      )}

                      {/* Link to case */}
                      {ev.loan_request_id && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/sales/edit/${ev.loan_request_id}`) }}
                          style={{
                            marginTop: 7, background: cfg.color, color: '#fff',
                            border: 'none', borderRadius: 6, padding: '4px 10px',
                            fontSize: 10, fontWeight: 700, cursor: 'pointer', width: '100%'
                          }}
                        >
                          <i className="fas fa-external-link-alt" style={{ marginRight: 4 }}></i>
                          ไปที่เคส
                        </button>
                      )}
                      {ev.conv_id && !ev.loan_request_id && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate('/chat') }}
                          style={{
                            marginTop: 7, background: cfg.color, color: '#fff',
                            border: 'none', borderRadius: 6, padding: '4px 10px',
                            fontSize: 10, fontWeight: 700, cursor: 'pointer', width: '100%'
                          }}
                        >
                          <i className="fas fa-comments" style={{ marginRight: 4 }}></i>
                          ไปที่แชท
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Upcoming summary (ถ้าไม่ได้เลือกวัน) */}
          {!selectedDay && (
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>
                <i className="fas fa-stream" style={{ marginRight: 5 }}></i>สรุปนัดหมายทั้งเดือน
              </div>
              {/* Count by type */}
              {Object.entries(EVENT_TYPES).map(([k, cfg]) => {
                const count = events.filter(e => e.type === k || e.source === k).length
                if (!count) return null
                return (
                  <div key={k} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 8, marginBottom: 5,
                    background: cfg.bg, border: `1px solid ${cfg.color}20`
                  }}>
                    <i className={`fas ${cfg.icon}`} style={{ color: cfg.color, fontSize: 12, width: 16 }}></i>
                    <span style={{ flex: 1, fontSize: 12, color: '#334155' }}>{cfg.label}</span>
                    <span style={{
                      background: cfg.color, color: '#fff', borderRadius: 12,
                      fontSize: 11, fontWeight: 800, padding: '1px 8px'
                    }}>{count}</span>
                  </div>
                )
              })}
              {events.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>
                  ไม่มีนัดหมายในเดือนนี้
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== Add Appointment Modal ===== */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, width: 460, maxWidth: '92vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden'
          }}>
            {/* Modal header */}
            <div style={{ background: '#22c55e', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                <i className="fas fa-plus-circle" style={{ marginRight: 8 }}></i>เพิ่มนัดหมายใหม่
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '18px 20px' }}>
              {/* ประเภทนัดหมาย */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>ประเภทนัดหมาย *</label>
                <select value={addForm.appt_type} onChange={e => setAddForm(f => ({ ...f, appt_type: e.target.value }))} style={inputStyle}>
                  {APPT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {/* วันที่ */}
                <div>
                  <label style={labelStyle}>วันที่นัดหมาย *</label>
                  <input type="date" value={addForm.appt_date} onChange={e => setAddForm(f => ({ ...f, appt_date: e.target.value }))} style={inputStyle} />
                </div>
                {/* เวลา */}
                <div>
                  <label style={labelStyle}>เวลา (ไม่บังคับ)</label>
                  <input type="time" value={addForm.appt_time} onChange={e => setAddForm(f => ({ ...f, appt_time: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {/* ชื่อลูกหนี้ */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>ชื่อลูกหนี้ / เรื่อง</label>
                <input type="text" placeholder="ระบุชื่อหรือหัวข้อ..." value={addForm.customer_name} onChange={e => setAddForm(f => ({ ...f, customer_name: e.target.value }))} style={inputStyle} />
              </div>

              {/* สถานที่ */}
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>สถานที่</label>
                <input type="text" placeholder="กรมที่ดิน, สำนักงาน, ออนไลน์..." value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} />
              </div>

              {/* หมายเหตุ */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>หมายเหตุ</label>
                <textarea rows={2} placeholder="รายละเอียดเพิ่มเติม..." value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {addError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', color: '#dc2626', fontSize: 12, marginBottom: 12 }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: 5 }}></i>{addError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveAppointment} disabled={savingAdd} style={actionBtnStyle('#22c55e')}>
                  {savingAdd ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 5 }}></i>กำลังบันทึก...</> : <><i className="fas fa-save" style={{ marginRight: 5 }}></i>บันทึกนัดหมาย</>}
                </button>
                <button onClick={() => setShowAddModal(false)} style={actionBtnStyle('#94a3b8')}>ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Event Detail Modal ===== */}
      {detailEvent && (
        <div
          onClick={() => { setDetailEvent(null); setEditingAppt(false) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16, width: 420, maxWidth: '92vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden'
            }}
          >
            {/* Modal header */}
            {(() => {
              const cfg = EVENT_TYPES[detailEvent.type] || EVENT_TYPES[detailEvent.source] || EVENT_TYPES.other
              const isEditable = detailEvent.source === 'appointment'
              return (
                <>
                  <div style={{
                    background: editingAppt ? '#f59e0b' : cfg.color, color: '#fff',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>
                        <i className={`fas ${editingAppt ? 'fa-edit' : cfg.icon}`} style={{ marginRight: 8 }}></i>
                        {editingAppt ? 'แก้ไขนัดหมาย' : cfg.label}
                      </div>
                      {!editingAppt && (
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                          {detailEvent.date && new Date(detailEvent.date + 'T00:00:00').toLocaleDateString('th-TH', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                          })}
                          {fmtTime(detailEvent.time) && ` เวลา ${fmtTime(detailEvent.time)}`}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setDetailEvent(null); setEditingAppt(false) }}
                      style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}
                    ><i className="fas fa-times"></i></button>
                  </div>

                  {/* ===== EDIT FORM ===== */}
                  {editingAppt ? (
                    <div style={{ padding: '18px 20px' }}>
                      {/* ประเภทนัดหมาย */}
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>ประเภทนัดหมาย</label>
                        <select value={editApptForm.appt_type} onChange={e => setEditApptForm(f => ({ ...f, appt_type: e.target.value }))} style={inputStyle}>
                          {APPT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <div>
                          <label style={labelStyle}>วันที่นัดหมาย *</label>
                          <input type="date" value={editApptForm.appt_date} onChange={e => setEditApptForm(f => ({ ...f, appt_date: e.target.value }))} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>เวลา</label>
                          <input type="time" value={editApptForm.appt_time} onChange={e => setEditApptForm(f => ({ ...f, appt_time: e.target.value }))} style={inputStyle} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>สถานที่</label>
                        <input type="text" placeholder="สถานที่นัดหมาย..." value={editApptForm.location} onChange={e => setEditApptForm(f => ({ ...f, location: e.target.value }))} style={inputStyle} />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>หมายเหตุ</label>
                        <textarea rows={2} placeholder="รายละเอียดเพิ่มเติม..." value={editApptForm.notes} onChange={e => setEditApptForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
                      </div>

                      {editApptError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', color: '#dc2626', fontSize: 12, marginBottom: 12 }}>
                          <i className="fas fa-exclamation-circle" style={{ marginRight: 5 }}></i>{editApptError}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={saveEditAppointment} disabled={savingEdit} style={actionBtnStyle('#f59e0b')}>
                          {savingEdit ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 5 }}></i>กำลังบันทึก...</> : <><i className="fas fa-save" style={{ marginRight: 5 }}></i>บันทึก</>}
                        </button>
                        <button onClick={() => setEditingAppt(false)} style={actionBtnStyle('#94a3b8')}>
                          <i className="fas fa-arrow-left" style={{ marginRight: 5 }}></i>ย้อนกลับ
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ===== DETAIL VIEW ===== */
                    <div style={{ padding: '18px 20px' }}>
                      {/* ชื่อลูกหนี้ */}
                      <InfoRow icon="fa-user" label="ลูกหนี้" value={detailEvent.customer_name} big />

                      {/* เคส */}
                      {detailEvent.case_code && <InfoRow icon="fa-tag" label="เลขเคส" value={detailEvent.case_code} />}
                      {detailEvent.platform && <InfoRow icon="fa-share-alt" label="Platform" value={detailEvent.platform} />}

                      {/* สถานที่ */}
                      {detailEvent.location && <InfoRow icon="fa-map-marker-alt" label="สถานที่" value={detailEvent.location} />}

                      {/* ผู้รับผิดชอบ */}
                      {detailEvent.assigned_to_name && <InfoRow icon="fa-user-tie" label="ผู้รับผิดชอบ" value={detailEvent.assigned_to_name} />}

                      {/* หมายเหตุ */}
                      {detailEvent.notes && (
                        <div style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}40`, borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
                          <div style={{ fontSize: 11, color: cfg.color, fontWeight: 700, marginBottom: 4 }}>
                            <i className="fas fa-sticky-note" style={{ marginRight: 4 }}></i>หมายเหตุ
                          </div>
                          <div style={{ fontSize: 13, color: '#334155' }}>{detailEvent.notes}</div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                        {/* ปุ่มแก้ไข + ยกเลิก — เฉพาะ appointment */}
                        {isEditable && (
                          <>
                            <button
                              onClick={openEditAppt}
                              style={{ ...actionBtnStyle('#f59e0b'), flex: '1 1 auto' }}
                            >
                              <i className="fas fa-edit" style={{ marginRight: 5 }}></i>แก้ไข
                            </button>
                            <button
                              onClick={cancelAppointment}
                              disabled={cancellingAppt}
                              style={{ ...actionBtnStyle('#ef4444'), flex: '1 1 auto' }}
                            >
                              {cancellingAppt
                                ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 5 }}></i>กำลังยกเลิก...</>
                                : <><i className="fas fa-ban" style={{ marginRight: 5 }}></i>ยกเลิกนัด</>
                              }
                            </button>
                          </>
                        )}

                        {detailEvent.loan_request_id && (
                          <button
                            onClick={() => { setDetailEvent(null); navigate(`/sales/edit/${detailEvent.loan_request_id}`) }}
                            style={{ ...actionBtnStyle(cfg.color), flex: '1 1 auto' }}
                          >
                            <i className="fas fa-external-link-alt" style={{ marginRight: 5 }}></i>
                            ไปที่เคส
                          </button>
                        )}
                        {detailEvent.conv_id && !detailEvent.loan_request_id && (
                          <button
                            onClick={() => { setDetailEvent(null); navigate('/chat') }}
                            style={{ ...actionBtnStyle(cfg.color), flex: '1 1 auto' }}
                          >
                            <i className="fas fa-comments" style={{ marginRight: 5 }}></i>
                            ไปที่แชท
                          </button>
                        )}
                        <button onClick={() => { setDetailEvent(null); setEditingAppt(false) }} style={{ ...actionBtnStyle('#94a3b8'), flex: '1 1 auto' }}>
                          ปิด
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

// ====== Helper UI Components ======
function InfoRow({ icon, label, value, big }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <i className={`fas ${icon}`} style={{ color: '#94a3b8', fontSize: 12, marginTop: 2, width: 14, flexShrink: 0 }}></i>
      <div>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: big ? 15 : 13, fontWeight: big ? 800 : 500, color: '#1e3a5f' }}>{value}</div>
      </div>
    </div>
  )
}

const navBtnStyle = {
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
  color: '#fff', borderRadius: 8, width: 34, height: 34,
  cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
}

const headerSelectStyle = {
  background: '#fff',
  border: 'none',
  color: '#1e3a5f',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  outline: 'none',
  minWidth: 110,
  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
}

const actionBtnStyle = (color) => ({
  flex: 1, background: color, color: '#fff', border: 'none',
  borderRadius: 8, padding: '9px 14px', cursor: 'pointer',
  fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
})

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4
}

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
  border: '1.5px solid #e2e8f0', outline: 'none', boxSizing: 'border-box',
  background: '#f8fafc'
}

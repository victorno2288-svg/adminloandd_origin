import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getCurrentUser } from '../utils/auth'

const API = '/api/admin/chat'
const token = () => localStorage.getItem('loandd_admin')

const PLATFORM_ICONS = {
  facebook: { icon: 'fab fa-facebook-messenger', color: '#0084ff', label: 'Facebook' },
  line: { icon: 'fab fa-line', color: '#06C755', label: 'LINE' }
}

const STATUS_BADGE = {
  unread: { bg: '#fee2e2', color: '#dc2626', label: 'ยังไม่อ่าน' },
  read: { bg: '#dbeafe', color: '#2563eb', label: 'อ่านแล้ว' },
  replied: { bg: '#dcfce7', color: '#16a34a', label: 'ตอบแล้ว' }
}

// สีเตรียมไว้ให้เลือกตอนสร้างแท็ก
const TAG_COLORS = [
  { bg: '#fef3c7', text: '#92400e', label: 'เหลือง' },
  { bg: '#dcfce7', text: '#166534', label: 'เขียว' },
  { bg: '#fee2e2', text: '#991b1b', label: 'แดง' },
  { bg: '#f3e8ff', text: '#6b21a8', label: 'ม่วง' },
  { bg: '#dbeafe', text: '#1e40af', label: 'น้ำเงิน' },
  { bg: '#fce7f3', text: '#9d174d', label: 'ชมพู' },
  { bg: '#f1f5f9', text: '#475569', label: 'เทา' },
  { bg: '#ffedd5', text: '#9a3412', label: 'ส้ม' },
  { bg: '#ccfbf1', text: '#115e59', label: 'เขียวมิ้นต์' },
  { bg: '#fef9c3', text: '#854d0e', label: 'ทอง' }
]

// ============================================
// FollowupSection — บันทึกและดูประวัติการติดตาม
// ============================================
function FollowupSection({ convId, apiBase, token, convDetail }) {
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ followup_type: 'chat', note: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (open && convId) fetchFollowups()
    // eslint-disable-next-line
  }, [open, convId])

  const fetchFollowups = () => {
    setLoading(true)
    fetch(`${apiBase}/conversations/${convId}/followups`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setFollowups(d.data || []) })
      .finally(() => setLoading(false))
  }

  const handleAdd = async () => {
    setSaving(true); setMsg('')
    const r = await fetch(`${apiBase}/conversations/${convId}/followup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const d = await r.json()
    setMsg(d.success ? '✅ บันทึกสำเร็จ' : (d.message || 'เกิดข้อผิดพลาด'))
    if (d.success) { setForm({ followup_type: 'chat', note: '' }); fetchFollowups() }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const typeLabel = { chat: '💬 แชท', call: '📞 โทร', note: '📝 โน้ต', line_msg: '🟢 Line', facebook_msg: '🔵 Facebook' }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6, cursor: 'pointer'
      }} onClick={() => setOpen(v => !v)}>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#555' }}>
          <i className="fas fa-history" style={{ marginRight: 6, color: '#f59e0b' }}></i>
          ประวัติการติดตาม
          {convDetail?.follow_up_count > 0 && (
            <span style={{ marginLeft: 6, background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>
              {convDetail.follow_up_count} ครั้ง
            </span>
          )}
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: '#999', fontSize: 11 }}></i>
      </div>
      {open && (
        <div>
          {/* บันทึกการติดตามใหม่ */}
          <div style={{ background: '#fffbeb', borderRadius: 8, padding: 10, marginBottom: 10, border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {Object.entries(typeLabel).map(([k, v]) => (
                <button key={k} type="button"
                  onClick={() => setForm(f => ({ ...f, followup_type: k }))}
                  style={{
                    padding: '4px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                    border: form.followup_type === k ? '2px solid #f59e0b' : '1.5px solid #e5e7eb',
                    background: form.followup_type === k ? '#fef3c7' : '#fff',
                    color: form.followup_type === k ? '#92400e' : '#555'
                  }}>{v}</button>
              ))}
            </div>
            <textarea rows={2} placeholder="หมายเหตุ (ไม่บังคับ)"
              value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1.5px solid #e5e7eb', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
            <button type="button" onClick={handleAdd} disabled={saving}
              style={{ marginTop: 6, width: '100%', padding: '7px 0', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : '+ บันทึกการติดตาม'}
            </button>
            {msg && <div style={{ marginTop: 5, fontSize: 11, color: msg.startsWith('✅') ? '#166534' : '#dc2626', textAlign: 'center' }}>{msg}</div>}
          </div>
          {/* รายการ */}
          {loading ? <div style={{ textAlign: 'center', padding: 8 }}><i className="fas fa-spinner fa-spin" style={{ color: '#f59e0b' }}></i></div>
          : followups.length === 0 ? <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: 4 }}>ยังไม่มีประวัติการติดตาม</div>
          : followups.map(f => (
            <div key={f.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>
                {f.followup_type === 'call' ? '📞' : f.followup_type === 'note' ? '📝' : f.followup_type === 'line_msg' ? '🟢' : f.followup_type === 'facebook_msg' ? '🔵' : '💬'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>
                  {f.agent_name || 'ทีม'}
                  <span style={{ marginLeft: 6, color: '#999', fontWeight: 400 }}>
                    {new Date(f.created_at).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {f.response_time_min != null && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: f.response_time_min <= 5 ? '#16a34a' : f.response_time_min <= 30 ? '#d97706' : '#dc2626', background: '#f1f5f9', padding: '1px 5px', borderRadius: 6 }}>
                      ตอบใน {f.response_time_min} นาที
                    </span>
                  )}
                </div>
                {f.note && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{f.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// DedupSection — ลูกหนี้ช่องทางอื่น (Deduplication)
// ============================================
function DedupSection({ convId, convDetail, linkedConvs, setLinkedConvs,
  dedupSearch, setDedupSearch, dedupResults, setDedupResults,
  showDedupSearch, setShowDedupSearch, apiBase, token, onSelectConv, conversations }) {
  const [linking, setLinking] = useState(false)
  const [msg, setMsg] = useState('')

  const platformIcon = (p) => p === 'facebook' ? '🔵 FB' : '🟢 LINE'
  const platformColor = (p) => p === 'facebook' ? '#1877F2' : '#00C300'

  const doSearch = async (q) => {
    setDedupSearch(q)
    if (q.length < 2) { setDedupResults([]); return }
    const r = await fetch(`${apiBase}/customers/search?q=${encodeURIComponent(q)}&exclude_conv=${convId}`, {
      headers: { Authorization: 'Bearer ' + token() }
    })
    const d = await r.json()
    setDedupResults(d.results || [])
  }

  const doLink = async (targetConvId) => {
    setLinking(true); setMsg('')
    const r = await fetch(`${apiBase}/conversations/link-profiles`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ conv_id_1: convId, conv_id_2: targetConvId })
    })
    const d = await r.json()
    if (d.success) {
      // Refresh linked convs
      const r2 = await fetch(`${apiBase}/conversations/${convId}/linked-convs`, {
        headers: { Authorization: 'Bearer ' + token() }
      })
      const d2 = await r2.json()
      setLinkedConvs(d2.linked || [])
      setDedupResults([]); setDedupSearch(''); setShowDedupSearch(false)
      setMsg('เชื่อมโยงสำเร็จ')
    } else setMsg(d.message || 'เกิดข้อผิดพลาด')
    setLinking(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const doUnlink = async () => {
    const r = await fetch(`${apiBase}/conversations/${convId}/unlink-profile`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + token() }
    })
    const d = await r.json()
    if (d.success) { setLinkedConvs([]); setMsg('ยกเลิกการเชื่อมโยงแล้ว') }
    setTimeout(() => setMsg(''), 3000)
  }

  const hasDuplicate = linkedConvs.length > 0

  return (
    <div style={{ marginBottom: 14, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fas fa-link" style={{ color: hasDuplicate ? '#f59e0b' : '#94a3b8' }}></i>
          ลูกหนี้ช่องทางอื่น
          {hasDuplicate && (
            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
              {linkedConvs.length} ช่องทาง
            </span>
          )}
        </span>
        <button onClick={() => setShowDedupSearch(v => !v)}
          style={{ fontSize: 11, color: '#3b82f6', background: 'none', border: '1px solid #bfdbfe', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>
          <i className="fas fa-search" style={{ marginRight: 4 }}></i>ค้นหา
        </button>
      </div>

      {/* Linked conversations */}
      {hasDuplicate && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 9, padding: '8px 10px', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, marginBottom: 6 }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>
            ลูกหนี้คนเดียวกัน — เชื่อมแล้ว {linkedConvs.length} ช่องทาง
          </div>
          {linkedConvs.map(lc => (
            <div key={lc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid #fef3c7' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: platformColor(lc.platform), background: lc.platform === 'facebook' ? '#eff6ff' : '#f0fdf4', padding: '1px 6px', borderRadius: 6, flexShrink: 0 }}>
                {platformIcon(lc.platform)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lc.customer_name || 'ไม่ระบุชื่อ'}
                </div>
                <div style={{ fontSize: 10, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lc.last_message_text || '—'} · {lc.last_msg_date}
                </div>
              </div>
              <button onClick={() => {
                const c = conversations.find(x => x.id === lc.id)
                if (c) onSelectConv(c)
              }}
                style={{ fontSize: 10, color: '#3b82f6', background: 'none', border: '1px solid #bfdbfe', borderRadius: 5, padding: '2px 6px', cursor: 'pointer', flexShrink: 0 }}>
                ดู
              </button>
            </div>
          ))}
          <button onClick={doUnlink}
            style={{ marginTop: 6, fontSize: 10, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <i className="fas fa-unlink" style={{ marginRight: 3 }}></i>ยกเลิกการเชื่อม
          </button>
        </div>
      )}

      {/* Search panel */}
      {showDedupSearch && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
          <input
            value={dedupSearch}
            onChange={e => doSearch(e.target.value)}
            placeholder="ค้นหาด้วยชื่อหรือเบอร์โทร..."
            style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1.5px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box', marginBottom: 8 }}
          />
          {dedupResults.length > 0 && (
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {dedupResults.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: platformColor(r.platform), background: r.platform === 'facebook' ? '#eff6ff' : '#f0fdf4', padding: '1px 6px', borderRadius: 6, flexShrink: 0 }}>
                    {platformIcon(r.platform)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{r.customer_name || 'ไม่ระบุ'}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>{r.customer_phone || ''} · {r.last_msg_date}</div>
                  </div>
                  <button onClick={() => doLink(r.id)} disabled={linking}
                    style={{ fontSize: 10, color: '#fff', background: '#f59e0b', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', flexShrink: 0, fontWeight: 700 }}>
                    เชื่อม
                  </button>
                </div>
              ))}
            </div>
          )}
          {dedupSearch.length >= 2 && dedupResults.length === 0 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#bbb', padding: '8px 0' }}>ไม่พบลูกหนี้ที่ตรงกัน</div>
          )}
        </div>
      )}

      {msg && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 5, fontWeight: 600 }}>{msg}</div>}
    </div>
  )
}

// ============================================
// DeadLeadSection — ปิดเคส / Dead Lead
// ============================================
// Property type options (ต้องตรงกับ SalesFormPage)
const PROPERTY_TYPES = [
  { value: 'house',        label: 'บ้าน' },
  { value: 'townhouse',    label: 'ทาวน์โฮม' },
  { value: 'condo',        label: 'คอนโด' },
  { value: 'single_house', label: 'บ้านเดี่ยว' },
  { value: 'shophouse',    label: 'ตึกแถว' },
  { value: 'land',         label: 'ที่ดินเปล่า' },
]
const PROPERTY_TYPE_LABEL = Object.fromEntries(PROPERTY_TYPES.map(t => [t.value, t.label]))

const PROVINCES = ['กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','พะเยา','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี']

// Dead reason codes — value เก็บลง DB, label แสดงผล
const DEAD_REASONS = [
  { value: 'low_value',        label: 'ราคาประเมินไม่พอ' },
  { value: 'high_interest',    label: 'ดอกเบี้ยสูงไป' },
  { value: 'has_debt',         label: 'ติดภาระหนี้สูง' },
  { value: 'bad_deed',         label: 'ทรัพย์ไม่ผ่านเกณฑ์ (โฉนด/ที่นา)' },
  { value: 'no_response',      label: 'ลูกหนี้หายไป ไม่ตอบ' },
  { value: 'not_interested',   label: 'ลูกหนี้เปลี่ยนใจ' },
  { value: 'went_competitor',  label: 'ล้มเลิกไปกู้ที่อื่น' },
  { value: 'incomplete_docs',  label: 'ข้อมูลไม่ครบ / ยืนยันตัวตนไม่ได้' },
  { value: 'outside_area',     label: 'นอกพื้นที่รับ' },
  { value: 'other',            label: 'อื่นๆ' },
]
// Helper: แปลง code → label (รองรับทั้ง code ใหม่และ Thai text เก่า)
const DEAD_REASON_LABEL_MAP = Object.fromEntries(DEAD_REASONS.map(r => [r.value, r.label]))

function DeadLeadSection({ convId, apiBase, token, convDetail, onChanged }) {
  const [open, setOpen] = useState(false)
  const [deadReason, setDeadReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const isDead = convDetail?.is_dead

  const handleMarkDead = async () => {
    const finalReason = deadReason === 'other' ? ('other:' + customReason) : deadReason
    if (!finalReason) { setMsg('กรุณาระบุเหตุผล'); return }
    setSaving(true); setMsg('')
    const r = await fetch(`${apiBase}/conversations/${convId}/dead`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dead_reason: finalReason })
    })
    const d = await r.json()
    if (d.success) { onChanged(true, finalReason); setOpen(false) }
    else setMsg(d.message || 'เกิดข้อผิดพลาด')
    setSaving(false)
  }

  const handleMarkAlive = async () => {
    setSaving(true)
    const r = await fetch(`${apiBase}/conversations/${convId}/alive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` }
    })
    const d = await r.json()
    if (d.success) { onChanged(false, null); setMsg('') }
    setSaving(false)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
        {isDead ? (
          <div style={{ background: '#fff0f0', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <i className="fas fa-times-circle" style={{ color: '#dc2626' }}></i>
              <span style={{ fontWeight: 700, fontSize: 12, color: '#991b1b' }}>เคสปิดแล้ว (Dead Lead)</span>
            </div>
            {convDetail?.dead_reason && <div style={{ fontSize: 11, color: '#7f1d1d', marginBottom: 8 }}>
              เหตุผล: {(() => {
                const r = convDetail.dead_reason
                if (r && r.startsWith('other:')) return 'อื่นๆ: ' + r.slice(6)
                return DEAD_REASON_LABEL_MAP[r] || r
              })()}
            </div>}
            <button type="button" onClick={handleMarkAlive} disabled={saving}
              style={{ width: '100%', padding: '6px 0', background: '#dcfce7', color: '#166534', border: '1.5px solid #86efac', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              <i className="fas fa-redo"></i> เปิดเคสใหม่อีกครั้ง
            </button>
          </div>
        ) : (
          <>
            <button type="button" onClick={() => setOpen(v => !v)}
              style={{ width: '100%', padding: '7px 0', background: '#fff', color: '#dc2626', border: '1.5px dashed #fca5a5', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <i className="fas fa-times-circle"></i> ปิดเคส / Dead Lead
            </button>
            {open && (
              <div style={{ marginTop: 8, background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>เหตุผลที่ไม่ผ่าน</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {DEAD_REASONS.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setDeadReason(r.value)}
                      style={{
                        padding: '4px 9px', fontSize: 11, borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                        border: deadReason === r.value ? '2px solid #dc2626' : '1.5px solid #e5e7eb',
                        background: deadReason === r.value ? '#fee2e2' : '#fff',
                        color: deadReason === r.value ? '#991b1b' : '#555'
                      }}>{r.label}</button>
                  ))}
                </div>
                {deadReason === 'other' && (
                  <input type="text" placeholder="ระบุเหตุผล..." value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1.5px solid #e5e7eb', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }} />
                )}
                {msg && <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 5 }}>{msg}</div>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={handleMarkDead} disabled={saving || !deadReason}
                    style={{ flex: 1, padding: '7px 0', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {saving ? <i className="fas fa-spinner fa-spin"></i> : 'ยืนยันปิดเคส'}
                  </button>
                  <button type="button" onClick={() => { setOpen(false); setDeadReason(''); setMsg('') }}
                    style={{ flex: 1, padding: '7px 0', background: '#f1f5f9', color: '#555', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser() || {}
  const isSuperAdmin = currentUser.department === 'super_admin' || currentUser.department === 'admin'

  // State
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [convDetail, setConvDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [showDead, setShowDead] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editingInfo, setEditingInfo] = useState(false)
  const [customerForm, setCustomerForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', contact_facebook: '', contact_line: '', province: '' })
  const [showQuickFill, setShowQuickFill] = useState(false)
  const [quickSaving, setQuickSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showPlatformSetup, setShowPlatformSetup] = useState(false)
  const [platformForm, setPlatformForm] = useState({ platform_name: 'facebook', platform_id: '', access_token: '', channel_secret: '', page_name: '' })
  const [platforms, setPlatforms] = useState([])
  const [stats, setStats] = useState(null)
  const [archiveMonths, setArchiveMonths] = useState(3)
  const [archivePreview, setArchivePreview] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [tags, setTags] = useState([])
  const [filterTag, setFilterTag] = useState('all')
  const [tagForm, setTagForm] = useState({ name: '', bg_color: '#fef3c7', text_color: '#92400e' })
  const [editingTagId, setEditingTagId] = useState(null)
  const [linkedUser, setLinkedUser] = useState(null)
  const [loadingLinkedUser, setLoadingLinkedUser] = useState(false)
  const [linkedConvs, setLinkedConvs] = useState([])
  // ★ Dedup (ลูกหนี้หลายช่องทาง)
  const [dedupSearch, setDedupSearch] = useState('')
  const [dedupResults, setDedupResults] = useState([])
  const [showDedupSearch, setShowDedupSearch] = useState(false)
  const [notifPermission, setNotifPermission] = useState('default')
  // ★ Transfer case จากแชท
  const [showChatTransferModal, setShowChatTransferModal] = useState(false)
  const [chatTransferTargetId, setChatTransferTargetId] = useState('')
  const [chatTransferReason, setChatTransferReason] = useState('')
  const [chatTransferring, setChatTransferring] = useState(false)
  const [chatSalesUsers, setChatSalesUsers] = useState([])
  // ★ Admin list + assign
  const [adminUsers, setAdminUsers] = useState([])
  // ★ Quick Replies
  const [quickReplies, setQuickReplies] = useState([])
  const [showQRPicker, setShowQRPicker] = useState(false)
  const [qrForm, setQrForm] = useState({ title: '', content: '', is_global: false })
  const [qrEditing, setQrEditing] = useState(null) // id being edited
  const [showQRManager, setShowQRManager] = useState(false)
  // ★ Round-Robin Management
  const [rrSales, setRrSales] = useState([])
  // ★ Broker Contract
  const [brokerEmailInput, setBrokerEmailInput] = useState('')
  const [showBrokerEmailInput, setShowBrokerEmailInput] = useState(false)
  // ★ Sentiment
  const [showSentimentMenu, setShowSentimentMenu] = useState(false)
  // ★ SLA Breach Alerts — ลูกหนี้รอนานเกิน 5 นาที
  const [slaAlerts, setSlaAlerts] = useState([]) // [{ id, customer_name, waiting_minutes, ... }]
  // ★ Follow-up Reminder
  const [followupDueList, setFollowupDueList] = useState([])  // overdue follow-ups (header badge)
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [followupDate, setFollowupDate] = useState('')
  const [followupNote, setFollowupNote] = useState('')
  const [savingFollowup, setSavingFollowup] = useState(false)
  const [showFollowupDuePanel, setShowFollowupDuePanel] = useState(false)
  // Mobile adaptive states
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [activeMobileView, setActiveMobileView] = useState('list') // 'list', 'chat', 'info'



  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const selectedConvRef = useRef(null)
  const fileInputRef = useRef(null)
  const replyTextareaRef = useRef(null)

  // เก็บ selectedConv ไว้ใน ref เพื่อให้ socket callback เข้าถึงได้
  useEffect(() => { selectedConvRef.current = selectedConv }, [selectedConv])

  // ขอสิทธิ์ Notification ตั้งแต่เข้าหน้า
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => setNotifPermission(p))
      }
    }

    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setActiveMobileView('list')
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])



  // Helper: เล่นเสียงแจ้งเตือน
  function playNotifSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      // เสียง beep 2 ครั้ง
      const playBeep = (time) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 800
        osc.type = 'sine'
        gain.gain.value = 0.3
        osc.start(time)
        osc.stop(time + 0.15)
      }
      playBeep(ctx.currentTime)
      playBeep(ctx.currentTime + 0.25)
    } catch (e) { console.log('Sound error:', e) }
  }

  // Helper: แจ้งเตือน browser + เสียง
  function showNotification(title, body) {
    console.log('🔔 Notification:', title, body)
    playNotifSound()

    // Browser Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: body || 'มีข้อความใหม่',
          icon: '/favicon.ico',
          requireInteraction: false
        })
        notif.onclick = () => {
          window.focus()
          notif.close()
        }
        setTimeout(() => notif.close(), 8000)
      } catch (e) { console.log('Notif error:', e) }
    }
  }

  // Socket.io + ดึงข้อมูลครั้งแรก
  useEffect(() => {
    fetchConversations()
    fetchPlatforms()
    fetchStats()
    fetchTags()
    fetchFollowupDue()
    const followupInterval = setInterval(fetchFollowupDue, 5 * 60 * 1000) // ตรวจทุก 5 นาที

    // ถ้ามี socket อยู่แล้ว ไม่ต้องสร้างใหม่
    if (socketRef.current) {
      return () => clearInterval(followupInterval)
    }

    // connect ตรงไป backend — ใช้ VITE_BACKEND_URL ถ้าตั้งไว้ หรือ localhost:3000
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    const socket = io(backendUrl, {
      auth: { token: token() },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id)
    })

    // เมื่อมีข้อความใหม่ใน conversation ที่เปิดดูอยู่
    socket.on('new_message', (data) => {
      setMessages(prev => {
        if (prev.find(m => m.id === data.message.id)) return prev
        return [...prev, data.message]
      })
      // แจ้งเตือนถ้าเป็นข้อความจากลูกหนี้ (ไม่ใช่ admin)
      if (data.message && data.message.sender_type === 'customer') {
        showNotification(
          data.message.sender_name || 'ลูกหนี้',
          data.message.message_text || 'ส่งข้อความใหม่'
        )
      }
    })

    // เมื่อ conversation list มีการอัพเดท (ทุกแอดมินจะได้รับ)
    socket.on('conversation_updated', (data) => {
      fetchConversations()
      fetchStats()
      // แจ้งเตือนทุกครั้งที่มี conversation update (แชทใหม่เข้ามา)
      var custName = (data && data.customer_name) || ''
      var lastMsg = (data && data.last_message) || 'มีข้อความใหม่เข้ามา'
      showNotification(
        custName ? ('แชทใหม่จาก ' + custName) : 'แชทอัพเดท',
        lastMsg
      )
    })

    // เมื่อได้รับ assign ลูกหนี้ใหม่
    socket.on('assigned_to_you', (data) => {
      setMsg('📩 คุณได้รับลูกหนี้ใหม่!')
      fetchConversations()
      fetchStats()
      showNotification('มอบหมายลูกหนี้ใหม่', (data && data.customer_name) || 'คุณได้รับเคสใหม่')
      setTimeout(() => setMsg(''), 5000)
    })

    // ★ เมื่อได้รับแชทที่โอนมา
    socket.on('chat_transferred_to_you', (data) => {
      const name = (data && data.customer_name) || 'ลูกหนี้'
      const from = (data && data.from_name) || ''
      setMsg(`📩 ได้รับแชท "${name}"${from ? ` จาก ${from}` : ''} แล้วค่ะ`)
      fetchConversations()
      showNotification('ได้รับแชทลูกหนี้', `${name}${from ? ` โอนมาจาก ${from}` : ''}`)
      setTimeout(() => setMsg(''), 6000)
    })

    // ★ super_admin / admin: รับรู้เมื่อมีการโอนแชทในระบบ → refresh list
    socket.on('chat_transfer_done', (data) => {
      if (isSuperAdmin) {
        fetchConversations()
        const name = (data && data.customer_name) || 'ลูกหนี้'
        const from = (data && data.from_name) || '?'
        const to = (data && data.to_name) || '?'
        setMsg(`🔄 โอนแชท "${name}" จาก ${from} → ${to}`)
        setTimeout(() => setMsg(''), 5000)
      }
    })

    // เมื่อระบบสร้างลูกหนี้อัตโนมัติ/เชื่อมจากแชท
    socket.on('loan_request_created', (data) => {
      if (data && data.conversation_id && selectedConvRef.current === data.conversation_id) {
        setConvDetail(prev => prev ? ({
          ...prev,
          loan_request_id: data.loan_request_id,
          debtor_code: data.debtor_code,
          loan_request_status: 'pending'
        }) : prev)
      }
      setMsg(data?.message || 'สร้างลูกหนี้อัตโนมัติสำเร็จ')
      setTimeout(() => setMsg(''), 5000)
    })

    socket.on('loan_request_linked', (data) => {
      if (data && data.conversation_id && selectedConvRef.current === data.conversation_id) {
        setConvDetail(prev => prev ? ({
          ...prev,
          loan_request_id: data.loan_request_id,
          debtor_code: data.debtor_code
        }) : prev)
      }
    })

    // เมื่อไม่มีสิทธิ์เข้า conversation
    socket.on('error_message', (errMsg) => {
      setMsg(errMsg)
      setTimeout(() => setMsg(''), 3000)
    })

    // OCR สแกนโฉนดสำเร็จ → แสดงผลในแชท + อัพเดท sidebar + sync updated_fields กลับ UI
    socket.on('deed_ocr_result', (data) => {
      if (data.conversation_id && selectedConv === data.conversation_id) {
        const uf = data.updated_fields || {}
        const DEED_CODE = { chanote: 'chanote', ns4k: 'ns4k', ns3: 'ns3', ns3k: 'ns3k', spk: 'spk' }

        // อัพเดท convDetail ด้วยค่าที่เพิ่งเขียนลง DB จริง
        setConvDetail(prev => ({
          ...prev,
          location_hint: uf.province || data.deed_data?.province || prev?.location_hint,
          deed_type: prev?.deed_type || (uf.deed_type ? DEED_CODE[uf.deed_type] || uf.deed_type : null),
          ocr_deed_data: data.deed_data
        }))

        // inject system message แสดงผล OCR ในแชท
        const ocrMsg = {
          id: `ocr_${Date.now()}`,
          sender_type: 'system',
          message_type: 'ocr_deed',
          deed_data: data.deed_data,
          updated_fields: uf,
          loan_request_id: data.loan_request_id,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, ocrMsg])
      }
    })

    // ⚠️ ทรัพย์ไม่ผ่านเกณฑ์ SOP → inject system warning message ในแชท
    socket.on('ineligible_property_detected', (data) => {
      if (data.conversation_id && selectedConv === data.conversation_id) {
        const warnMsg = {
          id: `warn_${Date.now()}`,
          sender_type: 'system',
          message_type: 'sop_warning',
          warning_reason: data.reason,
          deed_type: data.deed_type,
          property_type: data.property_type,
          created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, warnMsg])
        // อัพเดท convDetail ด้วย flag
        setConvDetail(prev => ({ ...prev, ineligible_property: 1, ineligible_reason: data.reason }))
      }
    })

    // ⏱️ SLA Breach Alert — ลูกหนี้รอนานเกิน 5 นาที ยังไม่มีคนตอบ
    socket.on('sla_breach', (data) => {
      if (data && Array.isArray(data.alerts)) {
        setSlaAlerts(data.alerts)
      }
    })

    // ⏰ Follow-up Reminder — ถึงเวลา follow-up แล้ว
    socket.on('followup_reminder', (data) => {
      setFollowupDueList(prev => {
        const exists = prev.find(f => f.conversation && f.conversation.id === data.conversation?.id)
        if (exists) return prev
        return [...prev, data]
      })
      // แสดง browser notification (ถ้ามีสิทธิ์)
      if (Notification && Notification.permission === 'granted' && data.conversation) {
        new Notification('⏰ Follow-up ถึงกำหนด', {
          body: data.message || `ถึงเวลา follow-up ลูกหนี้ ${data.conversation.customer_name || data.conversation.customer_phone}`,
          icon: '/logo.png'
        })
      }
    })

    // 🚨 Follow-up Overdue Alert — เลยกำหนดเกิน 2 วัน (แจ้งหัวหน้า)
    socket.on('followup_overdue', (data) => {
      if (data && data.items) {
        setFollowupDueList(prev => {
          const newItems = (data.items || []).filter(item =>
            !prev.find(f => f.conversation && f.conversation.id === item.id)
          ).map(item => ({ type: 'overdue', conversation: item, message: `🚨 เลยกำหนด follow-up เกิน 2 วัน` }))
          return [...prev, ...newItems]
        })
      }
    })

    // เมื่อ socket connect ไม่สำเร็จ (token หมดอายุ)
    socket.on('connect_error', (err) => {
      console.log('🔒 Socket auth error:', err.message)
    })

    return () => {
      clearInterval(followupInterval)
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  // ดึง conversations ใหม่เมื่อ filter เปลี่ยน
  useEffect(() => {
    fetchConversations()
  }, [filterStatus, filterPlatform, searchText, filterTag, showDead])

  // ★ โหลดรายชื่อเซลล์สำหรับ Transfer + Admin list สำหรับ assign + Quick Replies
  useEffect(() => {
    fetch(`${API}/sales-list`, { headers: { Authorization: 'Bearer ' + token() } })
      .then(r => r.json())
      .then(d => { if (d.success) setChatSalesUsers(d.sales_users || []) })
      .catch(() => {})

    fetch(`${API}/admin-list`, { headers: { Authorization: 'Bearer ' + token() } })
      .then(r => r.json())
      .then(d => { if (d.success) setAdminUsers(d.admins || []) })
      .catch(() => {})

    fetchQuickReplies()
  }, [])

  function fetchQuickReplies() {
    fetch(`${API}/quick-replies`, { headers: { Authorization: 'Bearer ' + token() } })
      .then(r => r.json())
      .then(d => { if (d.success) setQuickReplies(d.quick_replies || []) })
      .catch(() => {})
  }

  async function saveQuickReply() {
    if (!qrForm.title.trim() || !qrForm.content.trim()) return
    const url = qrEditing ? `${API}/quick-replies/${qrEditing}` : `${API}/quick-replies`
    const method = qrEditing ? 'PUT' : 'POST'
    try {
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify(qrForm)
      })
      const d = await r.json()
      if (d.success) {
        setQrForm({ title: '', content: '', is_global: false })
        setQrEditing(null)
        fetchQuickReplies()
        setMsg(d.message || 'บันทึกสำเร็จ')
        setTimeout(() => setMsg(''), 2000)
      } else {
        setMsg(d.message || 'เกิดข้อผิดพลาด')
        setTimeout(() => setMsg(''), 3000)
      }
    } catch (e) { setMsg('เกิดข้อผิดพลาด') }
  }

  async function deleteQuickReply(id) {
    if (!confirm('ลบ Quick Reply นี้?')) return
    try {
      const r = await fetch(`${API}/quick-replies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token() }
      })
      const d = await r.json()
      if (d.success) { fetchQuickReplies(); setMsg('ลบสำเร็จ'); setTimeout(() => setMsg(''), 2000) }
    } catch (e) {}
  }

  // ★ ติดตั้ง SOP Reject Templates (global, ป้องกันซ้ำ)
  async function seedSOPTemplates() {
    if (!confirm('ติดตั้ง SOP Reject Templates (4 แม่แบบ) เป็น Global Quick Replies?\nระบบจะข้ามรายการที่มีอยู่แล้วโดยอัตโนมัติ')) return
    try {
      const r = await fetch(`${API}/quick-replies/seed-sop`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token() }
      })
      const d = await r.json()
      if (d.success) {
        fetchQuickReplies()
        setMsg(d.message || 'ติดตั้ง SOP Templates สำเร็จ')
        setTimeout(() => setMsg(''), 4000)
      } else {
        setMsg(d.message || 'เกิดข้อผิดพลาด')
        setTimeout(() => setMsg(''), 3000)
      }
    } catch (e) { setMsg('เกิดข้อผิดพลาด') }
  }

  async function handleAssignConversation(convId, adminId) {
    try {
      const r = await fetch(`${API}/conversations/${convId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({ assigned_to: adminId || null })
      })
      const d = await r.json()
      if (d.success) {
        const admin = adminUsers.find(a => a.id === parseInt(adminId))
        setConvDetail(prev => ({
          ...prev,
          assigned_to: adminId || null,
          assigned_username: admin?.username || null,
          assigned_full_name: admin?.full_name || null
        }))
        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, assigned_to: adminId || null, assigned_username: admin?.username || null } : c
        ))
        setMsg('มอบหมายสำเร็จ')
        setTimeout(() => setMsg(''), 2000)
      }
    } catch (e) {}
  }

  // ★ Handler: โอนเคสจากแชท
  async function handleChatTransfer() {
    if (!chatTransferTargetId || !selectedConv) return
    setChatTransferring(true)
    try {
      const res = await fetch(`${API}/conversations/${selectedConv}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({ to_sales_id: chatTransferTargetId, reason: chatTransferReason })
      })
      const d = await res.json()
      if (d.success) {
        setShowChatTransferModal(false)
        setChatTransferTargetId('')
        setChatTransferReason('')
        if (isSuperAdmin) {
          // super_admin / admin เห็นทุกแชทอยู่แล้ว → refresh list เพื่ออัพเดทชื่อเซลล์ใหม่
          fetchConversations()
        } else {
          // ฝ่ายขาย → ลบออกจาก list ทันที + clear หน้าแชท
          setConversations(prev => prev.filter(c => c.id !== selectedConv))
          setSelectedConv(null)
          setConvDetail(null)
          setMessages([])
        }
        setMsg('✅ ' + d.message)
      } else {
        setMsg('❌ ' + (d.message || 'โอนไม่สำเร็จ'))
      }
    } catch (e) {
      setMsg('❌ เกิดข้อผิดพลาด: ' + e.message)
    }
    setChatTransferring(false)
    setTimeout(() => setMsg(''), 4000)
  }

  function fetchConversations() {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterPlatform !== 'all') params.set('platform', filterPlatform)
    if (searchText) params.set('search', searchText)
    if (filterTag !== 'all') params.set('tag_id', filterTag)
    if (showDead) params.set('show_dead', '1')

    fetch(`${API}/conversations?${params}`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setConversations(d.conversations || [])
          setUnreadCount(d.unread || 0)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  function fetchPlatforms() {
    fetch(`${API}/platforms`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setPlatforms(d.platforms || [])
      })
      .catch(() => { })
  }

  function fetchStats() {
    fetch(`${API}/stats`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats(d.stats)
      })
      .catch(() => { })
  }

  function fetchTags() {
    fetch(`${API}/tags`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setTags(d.tags || [])
      })
      .catch(() => { })
  }

  // ตั้งแท็กให้ conversation
  function setConversationTag(convId, tagId) {
    fetch(`${API}/conversations/${convId}/tag`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify({ tag_id: tagId })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // อัพเดท local state ทันที
          const tagInfo = tags.find(t => t.id === tagId)
          setConversations(prev => prev.map(c =>
            c.id === convId ? {
              ...c,
              tag_id: tagId,
              tag_name: tagInfo?.name || null,
              tag_bg_color: tagInfo?.bg_color || null,
              tag_text_color: tagInfo?.text_color || null
            } : c
          ))
          if (convDetail && convDetail.id === convId) {
            setConvDetail(prev => ({
              ...prev,
              tag_id: tagId,
              tag_name: tagInfo?.name || null,
              tag_bg_color: tagInfo?.bg_color || null,
              tag_text_color: tagInfo?.text_color || null
            }))
          }
        }
      })
      .catch(() => { })
  }

  // สร้างแท็กใหม่
  function saveTag() {
    if (!tagForm.name.trim()) return
    const url = editingTagId ? `${API}/tags/${editingTagId}` : `${API}/tags`
    const method = editingTagId ? 'PUT' : 'POST'

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify(tagForm)
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMsg(d.message)
          setTagForm({ name: '', bg_color: '#fef3c7', text_color: '#92400e' })
          setEditingTagId(null)
          fetchTags()
          setTimeout(() => setMsg(''), 2000)
        }
      })
  }

  // ลบแท็ก
  function deleteTag(tagId) {
    if (!confirm('ลบแท็กนี้? conversation ที่ใช้แท็กนี้จะถูกลบแท็กออก')) return
    fetch(`${API}/tags/${tagId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMsg('ลบแท็กสำเร็จ')
          fetchTags()
          fetchConversations()
          setTimeout(() => setMsg(''), 2000)
        }
      })
  }

  // ★ ดึงสถานะ Round-Robin ของเซลล์ทุกคน
  function fetchRRStatus() {
    fetch(`${API}/rr-status`, { headers: { 'Authorization': `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setRrSales(d.sales || []) })
      .catch(() => {})
  }

  // ★ Toggle Round-Robin สำหรับ sales คนหนึ่ง
  async function toggleRR(userId, currentVal) {
    const r = await fetch(`${API}/rr-toggle/${userId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rr_active: currentVal ? 0 : 1 })
    })
    const d = await r.json()
    if (d.success) fetchRRStatus()
  }

  // ★ ส่งสัญญานายหน้า
  async function sendBrokerContract() {
    if (!brokerEmailInput.trim()) return
    const r = await fetch(`${API}/conversations/${selectedConv}/broker-contract/send`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: brokerEmailInput })
    })
    const d = await r.json()
    if (d.success) {
      setShowBrokerEmailInput(false)
      setBrokerEmailInput('')
      loadConversationDetail(selectedConv)
    } else {
      alert(d.error || 'เกิดข้อผิดพลาด')
    }
  }

  // ★ บันทึกว่าลูกหนี้เซ็นสัญญาแล้ว
  async function markBrokerContractSigned() {
    const r = await fetch(`${API}/conversations/${selectedConv}/broker-contract/sign`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}` }
    })
    const d = await r.json()
    if (d.success) loadConversationDetail(selectedConv)
  }

  // ★ ตั้งค่า Lead Quality
  async function setLeadQuality(quality) {
    const r = await fetch(`${API}/conversations/${selectedConv}/lead-quality`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_quality: quality })
    })
    const d = await r.json()
    if (d.success) loadConversationDetail(selectedConv)
  }

  // ★ ตั้ง Sentiment
  async function setSentimentAPI(sentiment) {
    const r = await fetch(`${API}/conversations/${selectedConv}/sentiment`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentiment })
    })
    const d = await r.json()
    if (d.success) { loadConversationDetail(selectedConv); setShowSentimentMenu(false) }
  }

  // ดึงข้อมูล user ที่เชื่อมกับ conversation จาก property_db
  function fetchLinkedUser(convId) {
    setLoadingLinkedUser(true)
    setLinkedUser(null)
    fetch(`${API}/conversations/${convId}/linked-user`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setLinkedUser(d.linked_user)
        setLoadingLinkedUser(false)
      })
      .catch(() => setLoadingLinkedUser(false))
  }

  // ★ บันทึกวันนัด follow-up
  async function saveFollowupSchedule() {
    if (!selectedConv || !followupDate) return
    setSavingFollowup(true)
    try {
      const r = await fetch(`${API}/conversations/${selectedConv}/followup-schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ next_follow_up_at: followupDate, note: followupNote })
      })
      const d = await r.json()
      if (d.success) {
        setConvDetail(prev => prev ? { ...prev, next_follow_up_at: followupDate, followup_note: followupNote } : prev)
        setShowFollowupModal(false)
        setFollowupDate('')
        setFollowupNote('')
      }
    } catch {}
    setSavingFollowup(false)
  }

  // ★ ล้างวันนัด follow-up
  async function clearFollowupSchedule() {
    if (!selectedConv) return
    await fetch(`${API}/conversations/${selectedConv}/followup-schedule`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token()}` }
    })
    setConvDetail(prev => prev ? { ...prev, next_follow_up_at: null, followup_note: null } : prev)
  }

  // ★ โหลด followup-due list (สำหรับ badge)
  function fetchFollowupDue() {
    fetch(`${API}/conversations/followup-due`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setFollowupDueList((d.due || []).map(c => ({ type: c.overdue_minutes > 2880 ? 'overdue' : 'due', conversation: c, message: '' })))
      })
      .catch(() => {})
  }

  // ★ refresh เฉพาะ convDetail + messages (ไม่ reset scroll / room)
  function loadConversationDetail(convId) {
    if (!convId) return
    fetch(`${API}/conversations/${convId}`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMessages(d.messages || [])
          setConvDetail(d.conversation)
        }
      })
      .catch(() => {})
  }

  // ดึง messages เมื่อเลือก conversation
  function selectConversation(conv) {
    // ออกจาก room เก่า แล้วเข้า room ใหม่
    if (selectedConvRef.current && socketRef.current) {
      socketRef.current.emit('leave_conversation', selectedConvRef.current)
    }
    if (socketRef.current) {
      socketRef.current.emit('join_conversation', conv.id)
    }

    setSelectedConv(conv.id)
    setLoadingMsgs(true)
    setReplyText('')

    fetch(`${API}/conversations/${conv.id}`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMessages(d.messages || [])
          setConvDetail(d.conversation)
          setNoteText(d.conversation.notes || '')
          setCustomerForm({
            customer_name:    d.conversation.customer_name    || '',
            customer_phone:   d.conversation.customer_phone   || '',
            customer_email:   d.conversation.customer_email   || '',
            contact_facebook: d.conversation.contact_facebook || '',
            contact_line:     d.conversation.contact_line     || '',
            province:         d.conversation.province         || '',
          })
          // ดึงข้อมูล linked user จาก property_db
          fetchLinkedUser(conv.id)
          // ดึง conversations อื่นของลูกหนี้คนเดียวกัน (dedup)
          fetch(`${API}/conversations/${conv.id}/linked-convs`, {
            headers: { Authorization: 'Bearer ' + token() }
          }).then(r => r.json()).then(d => {
            setLinkedConvs(d.linked || [])
          }).catch(() => setLinkedConvs([]))
          setDedupSearch(''); setDedupResults([]); setShowDedupSearch(false)
          // อัพเดท status ใน list
          setConversations(prev => prev.map(c =>
            c.id === conv.id ? { ...c, status: c.status === 'unread' ? 'read' : c.status } : c
          ))

          // Switch to chat view on mobile
          if (isMobile) setActiveMobileView('chat')
        }


        setLoadingMsgs(false)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .catch(() => setLoadingMsgs(false))
  }

  // ส่งข้อความตอบกลับ
  function handleSendReply() {
    if (!replyText.trim() || !selectedConv) return
    setSending(true)

    fetch(`${API}/conversations/${selectedConv}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token()}`
      },
      body: JSON.stringify({ message: replyText })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const sentText = replyText
          setReplyText('')
          // เพิ่มข้อความ — ใช้ message_id จาก server ป้องกัน duplicate กับ socket event
          const realId = d.message_id || Date.now()
          setMessages(prev => {
            if (prev.find(m => m.id === realId)) return prev
            return [...prev, {
              id: realId,
              sender_type: 'admin',
              sender_name: 'Admin',
              message_text: sentText,
              message_type: 'text',
              created_at: new Date().toISOString()
            }]
          })
          // อัพเดท conversation status
          setConversations(prev => prev.map(c =>
            c.id === selectedConv ? { ...c, status: 'replied', last_message_text: sentText } : c
          ))
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        } else {
          setMsg(d.message || 'เกิดข้อผิดพลาด')
          setTimeout(() => setMsg(''), 3000)
        }
        setSending(false)
      })
      .catch(() => {
        setMsg('เชื่อมต่อ server ไม่ได้')
        setSending(false)
        setTimeout(() => setMsg(''), 3000)
      })
  }

  // ส่งไฟล์ (รูป/PDF/เอกสาร)
  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file || !selectedConv) return

    // เคลียร์ input เพื่อให้เลือกไฟล์ซ้ำได้
    e.target.value = ''

    if (file.size > 25 * 1024 * 1024) {
      setMsg('ไฟล์ใหญ่เกิน 25MB')
      setTimeout(() => setMsg(''), 3000)
      return
    }

    setSending(true)
    const formData = new FormData()
    formData.append('file', file)

    fetch(`${API}/conversations/${selectedConv}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}` },
      body: formData
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // เพิ่มข้อความในรายการ — ใช้ message_id จาก server เพื่อป้องกัน duplicate กับ socket event
          const ext = file.name.split('.').pop().toLowerCase()
          const msgType = /^(jpg|jpeg|png|gif|webp)$/.test(ext) ? 'image' : 'file'
          const realId = d.message_id || Date.now()
          setMessages(prev => {
            // ป้องกัน duplicate ถ้า socket emit มาก่อน response กลับ
            if (prev.find(m => m.id === realId)) return prev
            return [...prev, {
              id: realId,
              sender_type: 'admin',
              sender_name: 'Admin',
              message_text: msgType === 'image' ? '[รูปภาพ]' : '[ไฟล์] ' + file.name,
              message_type: msgType,
              attachment_url: d.attachment_url,
              created_at: new Date().toISOString()
            }]
          })
          setConversations(prev => prev.map(c =>
            c.id === selectedConv ? { ...c, status: 'replied', last_message_text: msgType === 'image' ? '[รูปภาพ]' : '[ไฟล์] ' + file.name } : c
          ))
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        } else {
          setMsg(d.message || 'อัปโหลดไม่สำเร็จ')
          setTimeout(() => setMsg(''), 3000)
        }
        setSending(false)
      })
      .catch(() => {
        setMsg('เชื่อมต่อ server ไม่ได้')
        setSending(false)
        setTimeout(() => setMsg(''), 3000)
      })
  }

  // Sync Facebook
  function handleSync() {
    setSyncing(true)
    fetch(`${API}/sync/facebook`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        setMsg(d.message || 'Sync สำเร็จ')
        setSyncing(false)
        fetchConversations()
        fetchStats()
        setTimeout(() => setMsg(''), 5000)
      })
      .catch(() => {
        setMsg('Sync ไม่สำเร็จ — ตรวจสอบ Facebook Token')
        setSyncing(false)
        setTimeout(() => setMsg(''), 3000)
      })
  }

  // บันทึก Note
  function saveNote() {
    fetch(`${API}/conversations/${selectedConv}/note`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify({ notes: noteText })
    })
      .then(r => r.json())
      .then(d => {
        setEditingNote(false)
        setMsg(d.message || 'บันทึกแล้ว')
        setTimeout(() => setMsg(''), 2000)
      })
  }

  // บันทึกข้อมูลลูกหนี้
  function saveCustomerInfo(opts = {}) {
    const { onDone } = opts
    return fetch(`${API}/conversations/${selectedConv}/info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify(customerForm)
    })
      .then(r => r.json())
      .then(d => {
        setEditingInfo(false)
        setConvDetail(prev => ({ ...prev, ...customerForm }))
        setMsg(d.message || 'บันทึกแล้ว')
        setTimeout(() => setMsg(''), 2000)
        if (onDone) onDone(d)
      })
  }

  // ★ Quick Fill save + auto-create case
  async function handleQuickSave() {
    if (!customerForm.customer_name && !customerForm.customer_phone) return
    setQuickSaving(true)
    try {
      await saveCustomerInfo()
      setShowQuickFill(false)
    } finally {
      setQuickSaving(false)
    }
  }

  // บันทึก Platform
  function savePlatform() {
    fetch(`${API}/platforms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify(platformForm)
    })
      .then(r => r.json())
      .then(d => {
        setMsg(d.message || 'บันทึกแล้ว')
        setPlatformForm({ platform_name: 'facebook', platform_id: '', access_token: '', channel_secret: '', page_name: '' })
        fetchPlatforms()
        setTimeout(() => setMsg(''), 2000)
      })
  }

  // ดูตัวอย่าง Archive
  function previewArchiveData() {
    fetch(`${API}/archive/preview?months=${archiveMonths}`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setArchivePreview(d.preview)
        else setMsg(d.message || 'ดึงข้อมูลไม่สำเร็จ')
      })
      .catch(() => setMsg('เชื่อมต่อ server ไม่ได้'))
  }

  // Archive ข้อมูลเก่า
  function executeArchiveData() {
    if (!confirm(`ยืนยันย้ายข้อความเก่ากว่า ${archiveMonths} เดือนไป archive? ข้อความจะถูกย้ายออกจากตารางหลัก`)) return
    setArchiving(true)
    fetch(`${API}/archive/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify({ months: archiveMonths })
    })
      .then(r => r.json())
      .then(d => {
        setMsg(d.message || 'Archive สำเร็จ')
        setArchiving(false)
        setArchivePreview(null)
        fetchConversations()
        fetchStats()
        setTimeout(() => setMsg(''), 5000)
      })
      .catch(() => {
        setMsg('Archive ไม่สำเร็จ')
        setArchiving(false)
        setTimeout(() => setMsg(''), 3000)
      })
  }

  // ลบ Platform
  function deletePlatform(id) {
    if (!confirm('ต้องการลบ platform นี้?')) return
    fetch(`${API}/platforms/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(d => {
        setMsg(d.message || 'ลบแล้ว')
        fetchPlatforms()
        setTimeout(() => setMsg(''), 2000)
      })
  }

  // ============ RENDER ============

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: '#3b82f6' }}></i>
    </div>
  }

  return (
    <div style={{ height: isMobile ? 'calc(100vh - 56px)' : 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: '#fff' }}>



      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '1px solid #e5e7eb', background: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <i className="fas fa-comments" style={{ fontSize: 22, color: '#3b82f6' }}></i>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Chat Engagement</h2>
          {unreadCount > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', borderRadius: 20, padding: '2px 10px',
              fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap'
            }}>{unreadCount} {isMobile ? '' : 'ยังไม่อ่าน'}</span>
          )}

          {stats && !isMobile && (
            <div style={{ display: 'flex', gap: 12, marginLeft: 12, fontSize: 12, color: '#666' }}>
              <span><i className="fab fa-facebook" style={{ color: '#0084ff' }}></i> {stats.facebook || 0}</span>
              <span><i className="fab fa-line" style={{ color: '#06C755' }}></i> {stats.line_count || 0}</span>
              <span>ทั้งหมด {stats.total || 0}</span>
            </div>
          )}

        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Notification status */}
          {'Notification' in window && (
            <button
              onClick={() => {
                if (notifPermission !== 'granted') {
                  Notification.requestPermission().then(p => setNotifPermission(p))
                }
              }}
              title={notifPermission === 'granted' ? 'การแจ้งเตือนเปิดอยู่' : 'คลิกเพื่อเปิดการแจ้งเตือน'}
              style={{
                padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd',
                cursor: notifPermission === 'granted' ? 'default' : 'pointer',
                background: notifPermission === 'granted' ? '#dcfce7' : '#fffbeb',
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <i className={notifPermission === 'granted' ? 'fas fa-bell' : 'fas fa-bell-slash'}
                style={{ color: notifPermission === 'granted' ? '#16a34a' : '#f59e0b' }}></i>
              {notifPermission === 'granted' ? 'แจ้งเตือน ON' : 'เปิดแจ้งเตือน'}
            </button>
          )}
          {notifPermission === 'granted' && (
            <button
              onClick={() => showNotification('ทดสอบแจ้งเตือน', 'ระบบแจ้งเตือนทำงานปกติ')}
              title="ทดสอบแจ้งเตือน"
              style={{
                padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd',
                cursor: 'pointer', background: '#fff', fontSize: 13
              }}
            >
              🔔 ทดสอบ
            </button>
          )}
          <button onClick={handleSync} disabled={syncing}
            style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer',
              background: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
            }}>
            <i className={syncing ? 'fas fa-spinner fa-spin' : 'fab fa-facebook'} style={{ color: '#0084ff' }}></i>
            {syncing ? 'กำลัง Sync...' : 'Sync Facebook'}
          </button>
          {isSuperAdmin && (
            <button onClick={() => navigate('/chat/dashboard')}
              style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid #bfdbfe', cursor: 'pointer',
                background: '#eff6ff', fontSize: 13, color: '#1d4ed8', fontWeight: 600
              }}
              title="Chat Dashboard">
              <i className="fas fa-chart-bar"></i> {!isMobile && 'Dashboard'}
            </button>
          )}
          <button onClick={() => { setShowPlatformSetup(!showPlatformSetup); if (!showPlatformSetup) fetchRRStatus() }}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer',
              background: showPlatformSetup ? '#eff6ff' : '#fff', fontSize: 13
            }}>
            <i className="fas fa-cog"></i> {isMobile ? '' : 'ตั้งค่า'}
          </button>

        </div>
      </div>

      {/* Alert */}
      {msg && (
        <div style={{
          padding: '8px 20px', background: msg.includes('ไม่สำเร็จ') || msg.includes('Error') ? '#fee2e2' : '#dbeafe',
          color: msg.includes('ไม่สำเร็จ') || msg.includes('Error') ? '#dc2626' : '#1e40af',
          fontSize: 13, textAlign: 'center', borderBottom: '1px solid #bfdbfe'
        }}>{msg}</div>
      )}

      {/* Platform Setup Panel */}
      {showPlatformSetup && (
        <div style={{ padding: 20, background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>
            <i className="fas fa-plug" style={{ marginRight: 8, color: '#3b82f6' }}></i>
            ตั้งค่าแพลตฟอร์ม
          </h3>

          {/* รายการ platforms ที่มีอยู่ */}
          {platforms.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>แพลตฟอร์มที่เชื่อมต่อแล้ว:</div>
              {platforms.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                  background: '#fff', borderRadius: 6, marginBottom: 4, border: '1px solid #e5e7eb'
                }}>
                  <i className={PLATFORM_ICONS[p.platform_name]?.icon || 'fas fa-plug'}
                    style={{ color: PLATFORM_ICONS[p.platform_name]?.color || '#666', fontSize: 16 }}></i>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{p.page_name || p.platform_name}</span>
                  <span style={{ fontSize: 11, color: '#999' }}>ID: {p.platform_id}</span>
                  <span style={{
                    fontSize: 10, padding: '1px 8px', borderRadius: 10,
                    background: p.is_active ? '#dcfce7' : '#fee2e2',
                    color: p.is_active ? '#16a34a' : '#dc2626'
                  }}>
                    {p.is_active ? 'ใช้งาน' : 'ปิด'}
                  </span>
                  <button onClick={() => deletePlatform(p.id)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ฟอร์มเพิ่ม platform */}
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>เพิ่มแพลตฟอร์มใหม่:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#666' }}>Platform</label>
              <select value={platformForm.platform_name} onChange={e => setPlatformForm({ ...platformForm, platform_name: e.target.value })}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
                <option value="facebook">Facebook</option>
                <option value="line">LINE</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666' }}>Page/Channel ID</label>
              <input value={platformForm.platform_id} onChange={e => setPlatformForm({ ...platformForm, platform_id: e.target.value })}
                placeholder="Page ID หรือ Channel ID"
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666' }}>Access Token</label>
              <input value={platformForm.access_token} onChange={e => setPlatformForm({ ...platformForm, access_token: e.target.value })}
                placeholder="Page Access Token / Channel Access Token"
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <button onClick={savePlatform}
              style={{ padding: '8px 20px', borderRadius: 6, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              บันทึก
            </button>
          </div>
          {platformForm.platform_name === 'line' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 8, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 12, color: '#666' }}>Channel Secret</label>
                <input value={platformForm.channel_secret} onChange={e => setPlatformForm({ ...platformForm, channel_secret: e.target.value })}
                  placeholder="Channel Secret (สำหรับ Webhook)"
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666' }}>ชื่อบัญชี</label>
                <input value={platformForm.page_name} onChange={e => setPlatformForm({ ...platformForm, page_name: e.target.value })}
                  placeholder="ชื่อบัญชี LINE"
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}
          {platformForm.platform_name === 'facebook' && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: '#666' }}>ชื่อเพจ</label>
              <input value={platformForm.page_name} onChange={e => setPlatformForm({ ...platformForm, page_name: e.target.value })}
                placeholder="ชื่อเพจ Facebook"
                style={{ width: 300, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
            </div>
          )}

          {/* ===== Tag Management Section ===== */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>
              <i className="fas fa-tags" style={{ marginRight: 8, color: '#8b5cf6' }}></i>
              จัดการแท็กสถานะ
            </h3>

            {/* รายการแท็กที่มี */}
            {tags.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {tags.map(tag => (
                  <div key={tag.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    background: '#fff', borderRadius: 6, marginBottom: 4, border: '1px solid #e5e7eb'
                  }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 12px', borderRadius: 10,
                      background: tag.bg_color, color: tag.text_color, fontSize: 12, fontWeight: 600
                    }}>{tag.name}</span>
                    <button onClick={() => {
                      setEditingTagId(tag.id)
                      setTagForm({ name: tag.name, bg_color: tag.bg_color, text_color: tag.text_color })
                    }}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12 }}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => deleteTag(tag.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ฟอร์มสร้าง/แก้ไขแท็ก */}
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
              {editingTagId ? 'แก้ไขแท็ก:' : 'เพิ่มแท็กใหม่:'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 11, color: '#999' }}>ชื่อแท็ก</label>
                <input value={tagForm.name} onChange={e => setTagForm({ ...tagForm, name: e.target.value })}
                  placeholder="เช่น รอข้อมูล, อนุมัติแล้ว"
                  style={{ display: 'block', width: 180, padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#999' }}>สี</label>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 200 }}>
                  {TAG_COLORS.map((c, i) => (
                    <div key={i}
                      onClick={() => setTagForm({ ...tagForm, bg_color: c.bg, text_color: c.text })}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                        background: c.bg, border: tagForm.bg_color === c.bg ? '2px solid ' + c.text : '2px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      title={c.label}
                    >
                      {tagForm.bg_color === c.bg && <i className="fas fa-check" style={{ fontSize: 9, color: c.text }}></i>}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={saveTag}
                  style={{
                    padding: '6px 16px', borderRadius: 6, background: '#8b5cf6', color: '#fff',
                    border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12
                  }}>
                  {editingTagId ? 'อัพเดท' : 'เพิ่ม'}
                </button>
                {editingTagId && (
                  <button onClick={() => { setEditingTagId(null); setTagForm({ name: '', bg_color: '#fef3c7', text_color: '#92400e' }) }}
                    style={{ padding: '6px 12px', borderRadius: 6, background: '#f0f0f0', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                    ยกเลิก
                  </button>
                )}
              </div>
            </div>

            {/* ตัวอย่างแท็ก */}
            {tagForm.name && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#999', marginRight: 8 }}>ตัวอย่าง:</span>
                <span style={{
                  padding: '2px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: tagForm.bg_color, color: tagForm.text_color
                }}>{tagForm.name}</span>
              </div>
            )}
          </div>

          {/* ===== Quick Reply Management Section ===== */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                <i className="fas fa-bolt" style={{ marginRight: 8, color: '#f59e0b' }}></i>
                ข้อความตอบกลับด่วน (Quick Replies)
              </h3>
              <button onClick={() => setShowQRManager(v => !v)}
                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
                {showQRManager ? 'ซ่อน' : 'จัดการ'}
              </button>
            </div>

            {showQRManager && (
              <div>
                {/* ★ SOP Templates button — admin only */}
                {isSuperAdmin && (
                  <div style={{ marginBottom: 12, padding: '10px 12px', background: '#fef9ec', border: '1px solid #fcd34d', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 2 }}>
                          <i className="fas fa-file-alt" style={{ marginRight: 6 }}></i>
                          SOP Reject Templates (ตาม SOP ข้อ 6.3)
                        </div>
                        <div style={{ fontSize: 11, color: '#92400e' }}>
                          4 แม่แบบข้อความปฏิเสธ: ประเมินต่ำ, ติดภาระ, เอกสารไม่ครบ, นอกพื้นที่
                        </div>
                      </div>
                      <button onClick={seedSOPTemplates}
                        style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 6, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                        <i className="fas fa-download" style={{ marginRight: 5 }}></i>
                        ติดตั้ง SOP Templates
                      </button>
                    </div>
                  </div>
                )}

                {/* รายการ Quick Replies ที่มี */}
                {quickReplies.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {quickReplies.map(qr => (
                      <div key={qr.id} style={{
                        display: 'flex', gap: 8, padding: '8px 10px', background: '#fff',
                        borderRadius: 8, marginBottom: 6, border: '1px solid #e5e7eb', alignItems: 'flex-start'
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{qr.title}</span>
                            {qr.is_global
                              ? <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>GLOBAL</span>
                              : <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: '#f1f5f9', color: '#64748b', fontWeight: 700 }}>ส่วนตัว</span>
                            }
                          </div>
                          <div style={{ fontSize: 11, color: '#666', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {qr.content}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => { setQrEditing(qr.id); setQrForm({ title: qr.title, content: qr.content, is_global: !!qr.is_global }) }}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button onClick={() => deleteQuickReply(qr.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ฟอร์มเพิ่ม / แก้ไข Quick Reply */}
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>
                    {qrEditing ? '✏️ แก้ไข Quick Reply' : '+ เพิ่ม Quick Reply ใหม่'}
                  </div>
                  <input value={qrForm.title} onChange={e => setQrForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="ชื่อ (เช่น ทักทาย, ขอโทษที่รอ)"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }} />
                  <textarea value={qrForm.content} onChange={e => setQrForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="เนื้อหาข้อความ..."
                    rows={3}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit' }} />
                  {isSuperAdmin && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555', marginBottom: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={qrForm.is_global} onChange={e => setQrForm(f => ({ ...f, is_global: e.target.checked }))} />
                      ใช้ร่วมกัน (Global — ทุกคนเห็น)
                    </label>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={saveQuickReply}
                      style={{ flex: 1, padding: '7px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      {qrEditing ? 'อัพเดท' : 'เพิ่ม'}
                    </button>
                    {qrEditing && (
                      <button onClick={() => { setQrEditing(null); setQrForm({ title: '', content: '', is_global: false }) }}
                        style={{ flex: 1, padding: '7px 0', background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                        ยกเลิก
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== Archive Section ===== */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>
              <i className="fas fa-archive" style={{ marginRight: 8, color: '#f59e0b' }}></i>
              Archive ข้อมูลเก่า
            </h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13 }}>ย้ายข้อความเก่ากว่า</span>
              <select value={archiveMonths} onChange={e => setArchiveMonths(parseInt(e.target.value))}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}>
                <option value={1}>1 เดือน</option>
                <option value={3}>3 เดือน</option>
                <option value={6}>6 เดือน</option>
                <option value={12}>12 เดือน</option>
              </select>
              <button onClick={previewArchiveData}
                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer', background: '#fff', fontSize: 13 }}>
                <i className="fas fa-search"></i> ดูตัวอย่าง
              </button>
            </div>

            {archivePreview && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 600, color: '#92400e' }}>
                  ข้อมูลที่จะ Archive:
                </div>
                <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.8 }}>
                  <span style={{ marginRight: 16 }}>ข้อความ: <b>{archivePreview.messages_to_archive?.toLocaleString()}</b> รายการ</span>
                  <span style={{ marginRight: 16 }}>conversation: <b>{archivePreview.conversations_affected?.toLocaleString()}</b> สนทนา</span>
                  <span>เก่าสุด: <b>{archivePreview.oldest_message ? new Date(archivePreview.oldest_message).toLocaleDateString('th-TH') : '-'}</b></span>
                </div>
                <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>
                  ข้อความปัจจุบัน: {archivePreview.total_messages_current?.toLocaleString()} | Archived: {archivePreview.total_messages_archived?.toLocaleString()}
                </div>
                {archivePreview.messages_to_archive > 0 && (
                  <button onClick={executeArchiveData} disabled={archiving}
                    style={{
                      marginTop: 10, padding: '8px 20px', borderRadius: 6,
                      background: archiving ? '#cbd5e1' : '#f59e0b', color: '#fff',
                      border: 'none', cursor: archiving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13
                    }}>
                    <i className={archiving ? 'fas fa-spinner fa-spin' : 'fas fa-archive'}></i>
                    {archiving ? ' กำลัง Archive...' : ` Archive ${archivePreview.messages_to_archive?.toLocaleString()} ข้อความ`}
                  </button>
                )}
                {archivePreview.messages_to_archive === 0 && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#16a34a' }}>
                    <i className="fas fa-check-circle"></i> ไม่มีข้อความที่ต้อง archive
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== ★ Round-Robin Auto-Assign ===== */}
          {isSuperAdmin && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                  <i className="fas fa-sync-alt" style={{ marginRight: 8, color: '#10b981' }}></i>
                  Round-Robin Auto-Assign
                </h3>
                <button onClick={fetchRRStatus}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
                  <i className="fas fa-refresh"></i> รีเฟรช
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, background: '#f0fdf4', padding: '8px 10px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <i className="fas fa-info-circle" style={{ marginRight: 5, color: '#10b981' }}></i>
                เซลล์ที่เปิด ON จะได้รับลูกหนี้ใหม่แบบวนลำดับ (1→2→3→1...) เซลล์ที่ปิด OFF จะถูกข้ามไป
              </div>
              {rrSales.length === 0 ? (
                <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 8 }}>ไม่พบข้อมูลเซลล์ (กดรีเฟรช)</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rrSales.map(s => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8, background: s.rr_active ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${s.rr_active ? '#86efac' : '#e2e8f0'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                          background: s.rr_active ? '#10b981' : '#94a3b8', color: '#fff'
                        }}>
                          {(s.full_name || s.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                            {s.full_name || s.username}
                            {s.nickname ? <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>({s.nickname})</span> : null}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>รับแล้ว {s.chat_count || 0} แชท</div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleRR(s.id, s.rr_active)}
                        style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          border: 'none',
                          background: s.rr_active ? '#10b981' : '#e2e8f0',
                          color: s.rr_active ? '#fff' : '#64748b'
                        }}>
                        {s.rr_active ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main 3-panel layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ===== LEFT: Conversation List ===== */}
        <div style={{
          width: isMobile ? '100%' : 340,
          borderRight: '1px solid #e5e7eb',
          display: (isMobile && activeMobileView !== 'list') ? 'none' : 'flex',
          flexDirection: 'column',
          background: '#fff',
          height: '100%'
        }}>


          {/* Search + Filter */}
          <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: 10, color: '#999', fontSize: 13 }}></i>
              <input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="ค้นหาชื่อ เบอร์ ข้อความ..."
                style={{
                  width: '100%', padding: '8px 8px 8px 32px', borderRadius: 8,
                  border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}>
                <option value="all">ทั้งหมด</option>
                <option value="unread">ยังไม่อ่าน</option>
                <option value="read">อ่านแล้ว</option>
                <option value="replied">ตอบแล้ว</option>
              </select>
              <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
                style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }}>
                <option value="all">ทุกแพลตฟอร์ม</option>
                <option value="facebook">Facebook</option>
                <option value="line">LINE</option>
              </select>
            </div>
            {/* Filter แท็ก */}
            {tags.length > 0 && (
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
                style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, marginTop: 6 }}>
                <option value="all">แท็ก: ทั้งหมด</option>
                <option value="none">ไม่มีแท็ก</option>
                {tags.map(tag => (
                  <option key={tag.id} value={String(tag.id)}>{tag.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* ⏱️ SLA Breach Banner — แสดงเมื่อมีลูกหนี้รอนานเกิน 5 นาที */}
          {slaAlerts.length > 0 && (
            <div style={{
              background: '#fef2f2', borderBottom: '1px solid #fecaca',
              padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', fontSize: 13 }}></i>
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                ⏱️ รอตอบ {slaAlerts.length} ราย เกิน 5 นาทีแล้ว!
              </span>
            </div>
          )}

          {/* ⏰ Follow-up Due Banner */}
          {followupDueList.length > 0 && (
            <div
              onClick={() => setShowFollowupDuePanel(v => !v)}
              style={{
                background: followupDueList.some(f => f.type === 'overdue') ? '#fff7ed' : '#f0fdf4',
                borderBottom: `1px solid ${followupDueList.some(f => f.type === 'overdue') ? '#fed7aa' : '#bbf7d0'}`,
                padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
              }}>
              <i className="fas fa-bell" style={{ color: followupDueList.some(f => f.type === 'overdue') ? '#ea580c' : '#16a34a', fontSize: 13 }}></i>
              <span style={{ fontSize: 12, color: followupDueList.some(f => f.type === 'overdue') ? '#c2410c' : '#15803d', fontWeight: 600, flex: 1 }}>
                ⏰ {followupDueList.length} นัด follow-up ถึงกำหนดแล้ว {followupDueList.some(f => f.type === 'overdue') ? '🚨' : ''}
              </span>
              <i className={`fas fa-chevron-${showFollowupDuePanel ? 'up' : 'down'}`} style={{ fontSize: 10, color: '#94a3b8' }}></i>
            </div>
          )}
          {/* Follow-up Due Panel — expanded list */}
          {showFollowupDuePanel && followupDueList.length > 0 && (
            <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', maxHeight: 200, overflowY: 'auto' }}>
              {followupDueList.map((f, idx) => {
                const conv = f.conversation || {}
                const isOverdue = f.type === 'overdue'
                return (
                  <div key={idx}
                    onClick={() => conv.id && selectConversation(conv)}
                    style={{
                      padding: '8px 16px', borderBottom: '1px solid #fde68a', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: isOverdue ? '#fff1f2' : '#fff',
                      ':hover': { background: '#fef9c3' }
                    }}>
                    <i className={`fas ${isOverdue ? 'fa-exclamation-circle' : 'fa-clock'}`}
                      style={{ color: isOverdue ? '#ef4444' : '#f59e0b', fontSize: 13, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.customer_name || conv.customer_phone || 'ไม่ทราบชื่อ'}
                      </div>
                      {conv.followup_note && (
                        <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.followup_note}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: isOverdue ? '#ef4444' : '#f59e0b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {conv.next_follow_up_at ? new Date(conv.next_follow_up_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : ''}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setFollowupDueList(prev => prev.filter((_, i) => i !== idx)) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px', fontSize: 12 }}>
                      <i className="fas fa-times" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Conversation items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <i className="fas fa-inbox" style={{ fontSize: 40, marginBottom: 12 }}></i>
                <p>ยังไม่มีข้อความ</p>
                <p style={{ fontSize: 12 }}>
                  {platforms.length === 0
                    ? 'กด "ตั้งค่า" เพื่อเพิ่ม Facebook/LINE token ก่อน'
                    : 'กด "Sync Facebook" เพื่อดึงข้อมูลแชท'
                  }
                </p>
              </div>
            ) : (
              conversations.map(conv => {
                const plt = PLATFORM_ICONS[conv.platform] || PLATFORM_ICONS.facebook
                const badge = STATUS_BADGE[conv.status] || STATUS_BADGE.unread
                const isSelected = selectedConv === conv.id
                // SLA breach: หาจาก slaAlerts state ที่ได้จาก socket
                const slaInfo = slaAlerts.find(a => a.id === conv.id)
                const isSlaBreach = !!slaInfo

                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    style={{
                      padding: '14px 16px', cursor: 'pointer',
                      borderBottom: '1px solid #f0f0f0',
                      background: isSelected ? '#eff6ff' : isSlaBreach ? '#fff1f2' : conv.status === 'unread' ? '#fefce8' : '#fff',
                      borderLeft: isSelected ? '3px solid #3b82f6' : isSlaBreach ? '3px solid #ef4444' : '3px solid transparent',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Avatar */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {conv.customer_avatar ? (
                          <img src={conv.customer_avatar} alt=""
                            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                            onError={e => e.target.style.display = 'none'} />
                        ) : (
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%', background: plt.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 16, fontWeight: 700
                          }}>
                            {(conv.customer_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <i className={plt.icon} style={{
                          position: 'absolute', bottom: -2, right: -2,
                          fontSize: 14, color: plt.color, background: '#fff', borderRadius: '50%', padding: 1
                        }}></i>
                      </div>

                      {/* Name + preview */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontWeight: conv.status === 'unread' ? 700 : 500,
                            fontSize: 14, color: '#333',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160
                          }}>
                            {conv.customer_name || 'ไม่ทราบชื่อ'}
                          </span>
                          <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>
                            {formatTime(conv.last_message_at)}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 12, color: '#666', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {(conv.last_message_text || '...').replace(/\n/g, ' ')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          {/* แท็กสถานะ */}
                          {conv.tag_name ? (
                            <span style={{
                              fontSize: 10, padding: '1px 8px', borderRadius: 10, fontWeight: 600,
                              background: conv.tag_bg_color, color: conv.tag_text_color
                            }}>{conv.tag_name}</span>
                          ) : (
                            <span style={{
                              fontSize: 10, padding: '1px 8px', borderRadius: 10, fontWeight: 600,
                              background: badge.bg, color: badge.color
                            }}>{badge.label}</span>
                          )}
                          {/* ⏱️ SLA Breach badge — ลูกหนี้รอนานเกิน 5 นาที */}
                          {isSlaBreach && (
                            <span title={`ลูกหนี้รอ ${slaInfo.waiting_minutes} นาทีแล้ว ยังไม่มีคนตอบ!`} style={{
                              fontSize: 10, padding: '1px 6px', borderRadius: 10,
                              background: '#fee2e2', color: '#dc2626', fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 2
                            }}>
                              <i className="fas fa-clock" style={{ fontSize: 9 }}></i>
                              {slaInfo.waiting_minutes}นาที
                            </span>
                          )}
                          {/* ★ Lead Quality badge */}
                          {conv.lead_quality && conv.lead_quality !== 'unknown' && (() => {
                            const lqMap = { ghost: { icon: '👻', bg: '#fef9c3', color: '#ca8a04' }, unqualified: { icon: '❌', bg: '#fee2e2', color: '#dc2626' }, qualified: { icon: '✅', bg: '#dcfce7', color: '#16a34a' }, hot: { icon: '🔥', bg: '#fff7ed', color: '#ea580c' } }
                            const lq = lqMap[conv.lead_quality]
                            return lq ? (
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: lq.bg, color: lq.color, fontWeight: 700 }}>
                                {lq.icon}
                              </span>
                            ) : null
                          })()}
                          {/* ฝ่ายขายที่รับผิดชอบ (super_admin เห็น) */}
                          {isSuperAdmin && (() => {
                            const assignedName = conv.assigned_full_name || conv.assigned_nickname || conv.assigned_username
                            const salesName = conv.sales_full_name || conv.sales_nickname
                            const displayName = assignedName || salesName
                            return displayName ? (
                              <span style={{
                                fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 500,
                                background: '#ede9fe', color: '#7c3aed'
                              }}>
                                <i className="fas fa-user" style={{ fontSize: 8, marginRight: 3 }}></i>
                                {displayName}
                              </span>
                            ) : null
                          })()}
                          {/* ผู้ตอบล่าสุด (super_admin เห็น) — ต่างจากผู้รับผิดชอบ */}
                          {isSuperAdmin && conv.last_replied_by_name && conv.last_replied_by_name !== (conv.assigned_full_name || conv.assigned_username) && (
                            <span style={{
                              fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 500,
                              background: '#fef3c7', color: '#b45309'
                            }}>
                              <i className="fas fa-reply" style={{ fontSize: 8, marginRight: 3 }}></i>
                              {conv.last_replied_by_name}
                            </span>
                          )}
                          {/* สถานะอ่าน (จุดเล็กๆ) */}
                          {conv.status === 'unread' && (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }}></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Dead Lead toggle ด้านล่าง list */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
            <button type="button"
              onClick={() => setShowDead(v => !v)}
              style={{
                width: '100%', padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: showDead ? '#fee2e2' : '#f9fafb',
                color: showDead ? '#991b1b' : '#888',
                border: showDead ? '1.5px solid #fca5a5' : '1.5px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
              <i className={`fas ${showDead ? 'fa-eye-slash' : 'fa-times-circle'}`}></i>
              {showDead ? 'ซ่อน Dead Leads / กลับ Inbox' : 'ดู Dead Leads'}
            </button>
          </div>
        </div>

        {/* ===== CENTER: Chat Messages ===== */}
        <div style={{
          flex: 1,
          display: (isMobile && activeMobileView !== 'chat') ? 'none' : 'flex',
          flexDirection: 'column',
          background: '#f9fafb',
          height: '100%'
        }}>


          {!selectedConv ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#999'
            }}>
              <i className="fas fa-comments" style={{ fontSize: 60, marginBottom: 16, opacity: 0.3 }}></i>
              <p style={{ fontSize: 16 }}>เลือก conversation ด้านซ้ายเพื่อดูข้อความ</p>
              {platforms.length === 0 && (
                <p style={{ fontSize: 13, color: '#f59e0b' }}>
                  <i className="fas fa-exclamation-triangle"></i> ยังไม่ได้ตั้งค่า — กดปุ่ม "ตั้งค่า" ด้านบนเพื่อเพิ่ม Facebook Token
                </p>
              )}
            </div>
          ) : loadingMsgs ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#3b82f6' }}></i>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{
                padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff',
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                {isMobile && (
                  <button onClick={() => setActiveMobileView('list')}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #dbeafe',
                      color: '#3b82f6',
                      fontSize: 14,
                      cursor: 'pointer',
                      padding: '6px 12px',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600
                    }}>
                    <i className="fas fa-chevron-left"></i> ย้อนกลับ
                  </button>
                )}
                <i className={PLATFORM_ICONS[convDetail?.platform]?.icon || 'fas fa-comment'}

                  style={{ fontSize: 18, color: PLATFORM_ICONS[convDetail?.platform]?.color || '#666' }}></i>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{convDetail?.customer_name || 'ไม่ทราบชื่อ'}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>
                    {PLATFORM_ICONS[convDetail?.platform]?.label} • {messages.length} ข้อความ
                    {convDetail?.case_code && <span style={{ marginLeft: 6, color: '#7c3aed' }}>• เคส {convDetail.case_code}</span>}
                  </div>
                </div>
                {/* ★ ปุ่มโอนลูกหนี้ — โชว์ทุก conversation */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  {chatSalesUsers.length > 0 && (
                    <button
                      onClick={() => { setShowChatTransferModal(true); setChatTransferTargetId(''); setChatTransferReason('') }}
                      style={{
                        padding: '6px 14px', borderRadius: 8,
                        background: '#fff3e0', border: '1.5px solid #fb8c00',
                        color: '#e65100', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                      }}
                      title="โอนลูกหนี้นี้ให้เซลล์คนอื่น"
                    >
                      <i className="fas fa-exchange-alt"></i>
                      {!isMobile && 'โอนลูกหนี้'}
                    </button>
                  )}

                  {/* ★ SLA badge */}
                    {convDetail && convDetail.first_response_seconds != null && (() => {
                      const sec = convDetail.first_response_seconds
                      const mins = Math.floor(sec / 60)
                      const label = mins < 60 ? `${mins}น.` : `${Math.floor(mins/60)}ชม.${mins%60 > 0 ? mins%60+'น.' : ''}`
                      const color = mins <= 5 ? '#16a34a' : mins <= 15 ? '#d97706' : '#dc2626'
                      const bg = mins <= 5 ? '#dcfce7' : mins <= 15 ? '#fef3c7' : '#fee2e2'
                      return (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                          borderRadius: 8, background: bg, border: `1px solid ${color}`,
                          fontSize: 11, fontWeight: 700, color, whiteSpace: 'nowrap'
                        }} title="เวลาตอบครั้งแรก (SLA)">
                          <i className="fas fa-stopwatch"></i>
                          {label}
                        </div>
                      )
                    })()}

                    {/* ★ Sentiment button */}
                    {convDetail && (
                      <div style={{ position: 'relative' }}>
                        {(() => {
                          const s = convDetail.sentiment
                          const sm = { positive: { icon: '😊', label: 'บวก', bg: '#dcfce7', color: '#16a34a', border: '#86efac' }, neutral: { icon: '😐', label: 'กลาง', bg: '#fef9c3', color: '#ca8a04', border: '#fde047' }, negative: { icon: '😠', label: 'ลบ', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' } }
                          const cur = sm[s]
                          return (
                            <button
                              onClick={() => setShowSentimentMenu(v => !v)}
                              style={{
                                padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                background: cur ? cur.bg : '#f1f5f9',
                                border: `1px solid ${cur ? cur.border : '#e2e8f0'}`,
                                color: cur ? cur.color : '#64748b',
                                display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
                              }}
                              title="Sentiment ลูกหนี้"
                            >
                              {cur ? cur.icon : '🔘'} {!isMobile && (cur ? cur.label : 'Sentiment')}
                            </button>
                          )
                        })()}
                        {showSentimentMenu && (
                          <div style={{
                            position: 'absolute', top: '110%', right: 0, zIndex: 200,
                            background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.15)',
                            border: '1px solid #e2e8f0', padding: 6, minWidth: 140
                          }}>
                            {[
                              { v: 'positive', icon: '😊', label: 'Positive (บวก)', bg: '#dcfce7', color: '#16a34a' },
                              { v: 'neutral',  icon: '😐', label: 'Neutral (กลาง)', bg: '#fef9c3', color: '#ca8a04' },
                              { v: 'negative', icon: '😠', label: 'Negative (ลบ)',  bg: '#fee2e2', color: '#dc2626' },
                              { v: null,       icon: '🔘', label: 'ล้างค่า',        bg: '#f1f5f9', color: '#64748b' }
                            ].map(opt => (
                              <button key={opt.v ?? 'none'} onClick={() => setSentimentAPI(opt.v)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                  padding: '7px 10px', border: 'none', borderRadius: 7,
                                  background: convDetail.sentiment === opt.v ? opt.bg : 'transparent',
                                  color: opt.color, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                  marginBottom: 2
                                }}>
                                {opt.icon} {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  {isMobile && (
                    <button onClick={() => setActiveMobileView('info')}
                      style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 18, cursor: 'pointer' }}>
                      <i className="fas fa-info-circle"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* ★ Quick Tag Bar — one-click tag pills below header */}
              {tags.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', background: '#f8fafc',
                  borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginRight: 2, whiteSpace: 'nowrap' }}>
                    <i className="fas fa-tag" style={{ marginRight: 4 }}></i>แท็ก:
                  </span>
                  {tags.map(tag => {
                    const isActive = convDetail?.tag_id === tag.id
                    return (
                      <button key={tag.id}
                        onClick={() => setConversationTag(convDetail.id, isActive ? null : tag.id)}
                        title={isActive ? `ถอดแท็ก "${tag.name}"` : `แท็ก "${tag.name}"`}
                        style={{
                          padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          background: isActive ? (tag.bg_color || '#3b82f6') : '#fff',
                          color: isActive ? (tag.text_color || '#fff') : (tag.bg_color || '#3b82f6'),
                          border: `1.5px solid ${tag.bg_color || '#3b82f6'}`,
                          transition: 'all 0.15s',
                          boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isActive && <i className="fas fa-check" style={{ marginRight: 4, fontSize: 10 }}></i>}
                        {tag.name}
                      </button>
                    )
                  })}
                  {convDetail?.tag_id && (
                    <button
                      onClick={() => setConversationTag(convDetail.id, null)}
                      title="ล้างแท็ก"
                      style={{
                        padding: '3px 8px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
                        background: 'transparent', color: '#94a3b8',
                        border: '1px dashed #cbd5e1', whiteSpace: 'nowrap'
                      }}
                    >
                      <i className="fas fa-times" style={{ marginRight: 3 }}></i>ล้าง
                    </button>
                  )}
                </div>
              )}

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {messages.map((m, i) => {
                  // ===== System message: OCR โฉนด =====
                  if (m.sender_type === 'system' && m.message_type === 'ocr_deed') {
                    const d = m.deed_data || {}
                    const rows = [
                      d.deed_type    && { icon: 'fa-file-alt',       label: 'ประเภท',      val: d.deed_type },
                      d.deed_number  && { icon: 'fa-hashtag',        label: 'เลขที่โฉนด',  val: d.deed_number },
                      d.parcel_number && { icon: 'fa-map',           label: 'เลขที่ดิน',   val: d.parcel_number },
                      (d.volume || d.page) && {
                        icon: 'fa-book', label: 'เล่ม/หน้า',
                        val: [d.volume && `เล่ม ${d.volume}`, d.page && `หน้า ${d.page}`].filter(Boolean).join('  ')
                      },
                      d.map_sheet    && { icon: 'fa-layer-group',    label: 'ระวาง',       val: d.map_sheet },
                      (d.tambon || d.amphoe || d.province) && {
                        icon: 'fa-map-marker-alt', label: 'ที่ตั้ง',
                        val: [d.tambon && `ต.${d.tambon}`, d.amphoe && `อ.${d.amphoe}`, d.province && `จ.${d.province}`].filter(Boolean).join(' ')
                      },
                      d.land_area    && { icon: 'fa-ruler-combined', label: 'เนื้อที่',    val: d.land_area },
                    ].filter(Boolean)

                    return (
                      <div key={m.id || i} style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                        <div style={{
                          background: '#f0f9ff', border: '1px solid #7dd3fc',
                          borderRadius: 14, padding: '10px 14px', maxWidth: 340, width: '100%',
                          boxShadow: '0 1px 4px rgba(14,165,233,0.10)'
                        }}>
                          {/* Header */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                            paddingBottom: 7, borderBottom: '1px solid #bae6fd'
                          }}>
                            <i className="fas fa-search" style={{ color: '#0ea5e9', fontSize: 13 }}></i>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#0369a1' }}>สแกนโฉนดอัตโนมัติ</span>
                            <span style={{
                              marginLeft: 'auto', fontSize: 10, background: '#0ea5e9', color: '#fff',
                              padding: '1px 7px', borderRadius: 10, fontWeight: 700
                            }}>AI</span>
                          </div>
                          {/* Rows พร้อม highlight ฟิลด์ที่ถูกอัพเดทลง DB */}
                          {rows.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {rows.map((r, ri) => {
                                // highlight ถ้า field นี้ถูกอัพเดทใน loan_request จริง
                                const saved = m.updated_fields && Object.keys(m.updated_fields).some(k =>
                                  (k === 'province' && r.label === 'ที่ตั้ง') ||
                                  (k === 'district' && r.label === 'ที่ตั้ง') ||
                                  (k === 'deed_number' && r.label === 'เลขที่โฉนด') ||
                                  (k === 'deed_type' && r.label === 'ประเภท') ||
                                  (k === 'land_area' && r.label === 'เนื้อที่')
                                )
                                return (
                                  <div key={ri} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12,
                                    background: saved ? 'rgba(16,185,129,0.08)' : 'transparent',
                                    borderRadius: 6, padding: saved ? '2px 5px' : '0'
                                  }}>
                                    <i className={`fas ${r.icon}`} style={{ color: saved ? '#059669' : '#0ea5e9', width: 13, flexShrink: 0, marginTop: 1 }}></i>
                                    <span style={{ color: '#64748b', minWidth: 72 }}>{r.label}:</span>
                                    <span style={{ fontWeight: 600, color: saved ? '#065f46' : '#0c4a6e', flex: 1 }}>{r.val}</span>
                                    {saved && <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}></i>}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>ไม่พบข้อมูลในโฉนด</div>
                          )}
                          {/* Badge บอกว่าอัพเดทลูกหนี้แล้ว */}
                          {m.loan_request_id && m.updated_fields && Object.keys(m.updated_fields).length > 0 && (
                            <div style={{
                              marginTop: 8, display: 'flex', alignItems: 'center', gap: 5,
                              fontSize: 11, color: '#059669', background: 'rgba(16,185,129,0.1)',
                              borderRadius: 8, padding: '4px 8px'
                            }}>
                              <i className="fas fa-check-circle"></i>
                              <span>บันทึกลงข้อมูลลูกหนี้เรียบร้อย</span>
                            </div>
                          )}
                          {/* Timestamp */}
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 7, textAlign: 'right' }}>
                            {new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // ===== SOP Warning Card (ทรัพย์ไม่ผ่านเกณฑ์) =====
                  if (m.sender_type === 'system' && m.message_type === 'sop_warning') {
                    return (
                      <div key={m.id || i} style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                        <div style={{
                          background: '#fff7ed', border: '1.5px solid #fb923c',
                          borderRadius: 14, padding: '10px 14px', maxWidth: 340, width: '100%',
                          boxShadow: '0 1px 4px rgba(251,146,60,0.15)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                            <i className="fas fa-exclamation-triangle" style={{ color: '#ea580c', fontSize: 14 }}></i>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#c2410c' }}>ทรัพย์ไม่ผ่านเกณฑ์ SOP</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#7c2d12', lineHeight: 1.5 }}>
                            {m.warning_reason || 'กรุณาตรวจสอบเงื่อนไขการรับทรัพย์'}
                          </div>
                          {(m.deed_type || m.property_type) && (
                            <div style={{ fontSize: 11, color: '#9a3412', marginTop: 5, display: 'flex', gap: 10 }}>
                              {m.deed_type && <span>เอกสาร: <b>{m.deed_type}</b></span>}
                              {m.property_type && <span>ทรัพย์: <b>{m.property_type}</b></span>}
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: '#c2410c', marginTop: 6, fontStyle: 'italic' }}>
                            แจ้งเตือนอัตโนมัติตาม SOP ฝ่ายขาย
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // ===== Normal message =====
                  const isAdmin = m.sender_type === 'admin'
                  return (
                    <div key={m.id || i} style={{
                      display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                      marginBottom: 10
                    }}>
                      <div style={{
                        maxWidth: '70%', padding: '10px 14px', borderRadius: 16,
                        background: isAdmin ? '#3b82f6' : '#fff',
                        color: isAdmin ? '#fff' : '#333',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        borderBottomRightRadius: isAdmin ? 4 : 16,
                        borderBottomLeftRadius: isAdmin ? 16 : 4
                      }}>
                        {!isAdmin && m.sender_name && (
                          <div style={{ fontSize: 11, color: '#999', marginBottom: 2, fontWeight: 600 }}>
                            {m.sender_name}
                          </div>
                        )}
                        {/* super_admin เห็นชื่อแอดมินที่ตอบข้อความ — เพื่อดูพฤติกรรมพนักงาน */}
                        {isAdmin && isSuperAdmin && m.sender_name && (
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginBottom: 2, fontWeight: 600 }}>
                            <i className="fas fa-user-shield" style={{ marginRight: 4, fontSize: 9 }}></i>
                            {m.sender_name}
                          </div>
                        )}

                        {/* Image — กดเพื่อขยาย */}
                        {m.message_type === 'image' && m.attachment_url && (
                          <img
                            src={m.attachment_url}
                            alt="รูปภาพ"
                            style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, marginBottom: 4, cursor: 'pointer', display: 'block' }}
                            onClick={() => window.open(m.attachment_url, '_blank')}
                            onError={e => {
                              e.target.style.display = 'none'
                              e.target.insertAdjacentHTML('afterend', '<div style="color:#999;font-size:12px;padding:8px">⚠️ โหลดรูปไม่ได้</div>')
                            }}
                          />
                        )}

                        {/* Video */}
                        {m.message_type === 'video' && m.attachment_url && (
                          <video
                            controls
                            style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, marginBottom: 4 }}
                            onError={e => e.target.style.display = 'none'}
                          >
                            <source src={m.attachment_url} />
                            วิดีโอไม่สามารถแสดงได้
                          </video>
                        )}

                        {/* Sticker */}
                        {m.message_type === 'sticker' && m.attachment_url && (
                          <img
                            src={m.attachment_url}
                            alt="sticker"
                            style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: 4 }}
                            onError={e => e.target.style.display = 'none'}
                          />
                        )}

                        {/* ไฟล์ทุกประเภท (PDF, Word, Excel, ZIP ฯลฯ) */}
                        {m.message_type === 'file' && m.attachment_url && (() => {
                          const ext = m.attachment_url.split('.').pop().toLowerCase()
                          const fileInfo = {
                            pdf:  { icon: 'fa-file-pdf',   color: '#dc2626', label: 'PDF' },
                            doc:  { icon: 'fa-file-word',  color: '#2563eb', label: 'Word' },
                            docx: { icon: 'fa-file-word',  color: '#2563eb', label: 'Word' },
                            xls:  { icon: 'fa-file-excel', color: '#16a34a', label: 'Excel' },
                            xlsx: { icon: 'fa-file-excel', color: '#16a34a', label: 'Excel' },
                            csv:  { icon: 'fa-file-csv',   color: '#16a34a', label: 'CSV' },
                            zip:  { icon: 'fa-file-archive', color: '#92400e', label: 'ZIP' },
                            rar:  { icon: 'fa-file-archive', color: '#92400e', label: 'RAR' },
                            txt:  { icon: 'fa-file-alt',   color: '#6b7280', label: 'Text' },
                          }[ext] || { icon: 'fa-file', color: '#6b7280', label: ext?.toUpperCase() || 'ไฟล์' }
                          const fileName = m.message_text?.replace('[ไฟล์] ', '') || 'ดาวน์โหลดไฟล์'
                          const iconColor = isAdmin ? 'rgba(255,255,255,0.9)' : fileInfo.color
                          return (
                            <a href={m.attachment_url} target="_blank" rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                background: isAdmin ? 'rgba(255,255,255,0.15)' : '#f8fafc',
                                borderRadius: 10, textDecoration: 'none',
                                border: isAdmin ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0',
                                marginBottom: 4, maxWidth: 240
                              }}>
                              <i className={`fas ${fileInfo.icon}`} style={{ fontSize: 22, color: iconColor, flexShrink: 0 }}></i>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: isAdmin ? '#fff' : '#1e293b',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {fileName}
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.65, color: isAdmin ? '#fff' : '#64748b' }}>
                                  {fileInfo.label} · คลิกเพื่อดาวน์โหลด
                                </div>
                              </div>
                              <i className="fas fa-download" style={{ fontSize: 12, opacity: 0.5, color: isAdmin ? '#fff' : '#64748b', flexShrink: 0 }}></i>
                            </a>
                          )
                        })()}

                        {/* Text — ไม่แสดงถ้าเป็นรูป/สติกเกอร์/ไฟล์ที่มี placeholder text */}
                        {m.message_text && !(
                          (m.message_type === 'image' && m.message_text === '[รูปภาพ]') ||
                          (m.message_type === 'video' && m.message_text === '[วิดีโอ]') ||
                          (m.message_type === 'sticker' && m.message_text === '[สติกเกอร์]') ||
                          (m.message_type === 'file' && m.attachment_url && m.message_text.startsWith('[ไฟล์]'))
                        ) && (
                            <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              {m.message_text}
                            </div>
                          )}

                        <div style={{
                          fontSize: 10, marginTop: 4,
                          color: isAdmin ? 'rgba(255,255,255,0.7)' : '#999',
                          textAlign: 'right'
                        }}>
                          {formatTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div style={{ borderTop: '1px solid #e5e7eb', background: '#fff' }}>
                {/* Quick Reply picker — dropdown */}
                {showQRPicker && quickReplies.length > 0 && (
                  <div style={{
                    borderBottom: '1px solid #f0f0f0', background: '#f8fafc',
                    maxHeight: 200, overflowY: 'auto', padding: '4px 0'
                  }}>
                    {quickReplies.map(qr => (
                      <div key={qr.id}
                        onClick={() => { setReplyText(qr.content); setShowQRPicker(false) }}
                        style={{
                          padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                          borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ fontWeight: 600, color: '#1e40af', fontSize: 12 }}>
                          {qr.is_global ? '🌐' : '👤'} {qr.title}
                        </div>
                        <div style={{
                          color: '#666', fontSize: 12, marginTop: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{qr.content}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                {/* ปุ่มแนบไฟล์ */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,.mp4,.mov"
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="แนบไฟล์ (รูป, PDF, เอกสาร)"
                  style={{
                    padding: '10px 12px', borderRadius: 12, background: '#f3f4f6',
                    border: '1px solid #e5e7eb', cursor: sending ? 'not-allowed' : 'pointer',
                    fontSize: 16, color: '#6b7280', flexShrink: 0,
                    minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <i className="fas fa-paperclip"></i>
                </button>
                {/* ปุ่ม Quick Reply */}
                <button
                  onClick={() => setShowQRPicker(v => !v)}
                  disabled={sending}
                  title="ข้อความตอบกลับด่วน"
                  style={{
                    padding: '10px 12px', borderRadius: 12,
                    background: showQRPicker ? '#eff6ff' : '#f3f4f6',
                    border: showQRPicker ? '1px solid #93c5fd' : '1px solid #e5e7eb',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    fontSize: 16, color: showQRPicker ? '#3b82f6' : '#6b7280', flexShrink: 0,
                    minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <i className="fas fa-bolt"></i>
                </button>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply()
                    }
                  }}
                  placeholder="พิมพ์ข้อความตอบกลับ..."
                  rows={2}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 12,
                    border: '1px solid #e5e7eb', resize: 'none',
                    fontSize: 16, fontFamily: 'inherit', outline: 'none'
                  }}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  style={{
                    padding: '10px 20px', borderRadius: 12,
                    background: sending || !replyText.trim() ? '#cbd5e1' : '#3b82f6',
                    color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6,
                    minHeight: 44, flexShrink: 0
                  }}
                >
                  <i className={sending ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'}></i>
                  {sending ? 'กำลังส่ง...' : 'ส่ง'}
                </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ===== RIGHT: Customer Info ===== */}
        <div style={{
          width: isMobile ? '100%' : 280,
          borderLeft: '1px solid #e5e7eb',
          background: '#fff',
          overflowY: 'auto',
          display: (isMobile && activeMobileView === 'info') ? 'block' : (!isMobile && selectedConv) ? 'block' : 'none',
          height: '100%'
        }}>
          {isMobile && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <button onClick={() => setActiveMobileView('chat')}
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-chevron-left"></i> กลับไปยังแชท
              </button>
            </div>
          )}

          {convDetail && (
            <div style={{ padding: 16 }}>

              {/* ★ Quick Fill Panel — กรอกด่วน Ctrl+Enter */}
              <div style={{ marginBottom: 14 }}>
                <button
                  onClick={() => setShowQuickFill(v => !v)}
                  style={{
                    width: '100%', padding: '8px 0',
                    background: showQuickFill ? '#7c3aed' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                    color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}>
                  <i className="fas fa-bolt"></i> กรอกด่วน
                  <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 400 }}>Ctrl+Enter</span>
                </button>

                {showQuickFill && (
                  <div style={{
                    marginTop: 8, padding: 12, borderRadius: 10,
                    background: '#faf5ff', border: '1.5px solid #c4b5fd',
                    display: 'flex', flexDirection: 'column', gap: 7
                  }}
                    onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleQuickSave() } }}
                  >
                    <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 2 }}>
                      <i className="fas fa-keyboard" style={{ marginRight: 4 }}></i>
                      กรอกแล้วกด Ctrl+Enter เพื่อบันทึก + สร้างเคสอัตโนมัติ
                    </div>
                    {[
                      { key: 'customer_name',    placeholder: 'ชื่อจริง', icon: 'fas fa-user', type: 'text' },
                      { key: 'contact_facebook', placeholder: 'ชื่อ Facebook (เฟส)', icon: 'fab fa-facebook', type: 'text' },
                      { key: 'contact_line',     placeholder: 'LINE ID / ชื่อไลน์', icon: 'fab fa-line', type: 'text' },
                      { key: 'customer_phone',   placeholder: 'เบอร์โทร', icon: 'fas fa-phone', type: 'tel' },
                      { key: 'customer_email',   placeholder: 'อีเมล', icon: 'fas fa-envelope', type: 'email' },
                    ].map(({ key, placeholder, icon, type }) => (
                      <div key={key} style={{ position: 'relative' }}>
                        <i className={icon} style={{
                          position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                          color: '#9ca3af', fontSize: 12, pointerEvents: 'none'
                        }}></i>
                        <input
                          type={type}
                          value={customerForm[key] || ''}
                          onChange={e => setCustomerForm(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={placeholder}
                          style={{ width: '100%', padding: '7px 8px 7px 28px', borderRadius: 7, border: '1px solid #ddd8fe', fontSize: 12, boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                    <select
                      value={customerForm.province || ''}
                      onChange={e => setCustomerForm(prev => ({ ...prev, province: e.target.value }))}
                      style={{ width: '100%', padding: '7px 8px', borderRadius: 7, border: '1px solid #ddd8fe', fontSize: 12, color: customerForm.province ? '#111' : '#9ca3af' }}
                    >
                      <option value="">— จังหวัด —</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button
                      onClick={handleQuickSave}
                      disabled={quickSaving || (!customerForm.customer_name && !customerForm.customer_phone)}
                      style={{
                        padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: quickSaving ? '#e5e7eb' : '#7c3aed', color: quickSaving ? '#9ca3af' : '#fff',
                        fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}>
                      {quickSaving
                        ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</>
                        : <><i className="fas fa-check-circle"></i> บันทึก + สร้างเคส</>}
                    </button>
                  </div>
                )}
              </div>

              {/* Customer avatar + name */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                {convDetail.customer_avatar ? (
                  <img src={convDetail.customer_avatar} alt=""
                    style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }}
                    onError={e => e.target.style.display = 'none'} />
                ) : (
                  <div style={{
                    width: 70, height: 70, borderRadius: '50%', margin: '0 auto 8',
                    background: PLATFORM_ICONS[convDetail.platform]?.color || '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 28, fontWeight: 700
                  }}>
                    {(convDetail.customer_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 16 }}>{convDetail.customer_name || 'ไม่ทราบชื่อ'}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                  <i className={PLATFORM_ICONS[convDetail.platform]?.icon}
                    style={{ color: PLATFORM_ICONS[convDetail.platform]?.color, marginRight: 4 }}></i>
                  {PLATFORM_ICONS[convDetail.platform]?.label}
                </div>
              </div>

              {/* Customer Info */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#555' }}>
                    <i className="fas fa-user" style={{ marginRight: 6 }}></i>ข้อมูลลูกหนี้
                  </span>
                  <button onClick={() => setEditingInfo(!editingInfo)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 12 }}>
                    <i className="fas fa-edit"></i> แก้ไข
                  </button>
                </div>

                {editingInfo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={customerForm.customer_name} onChange={e => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                      placeholder="ชื่อจริง" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                    <input value={customerForm.contact_facebook} onChange={e => setCustomerForm({ ...customerForm, contact_facebook: e.target.value })}
                      placeholder="ชื่อ Facebook" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                    <input value={customerForm.contact_line} onChange={e => setCustomerForm({ ...customerForm, contact_line: e.target.value })}
                      placeholder="LINE ID" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                    <input value={customerForm.customer_phone} onChange={e => setCustomerForm({ ...customerForm, customer_phone: e.target.value })}
                      placeholder="เบอร์โทร" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                    <input value={customerForm.customer_email} onChange={e => setCustomerForm({ ...customerForm, customer_email: e.target.value })}
                      placeholder="อีเมล" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                    <select value={customerForm.province} onChange={e => setCustomerForm({ ...customerForm, province: e.target.value })}
                      style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', fontSize: 13, color: customerForm.province ? '#111' : '#9ca3af' }}>
                      <option value="">— จังหวัด —</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={saveCustomerInfo}
                        style={{ flex: 1, padding: 6, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        บันทึก
                      </button>
                      <button onClick={() => setEditingInfo(false)}
                        style={{ flex: 1, padding: 6, background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13 }}>
                    <InfoRow icon="fas fa-user" label="ชื่อ" value={convDetail.customer_name} />
                    {convDetail.contact_facebook && <InfoRow icon="fab fa-facebook" label="Facebook" value={convDetail.contact_facebook} />}
                    {convDetail.contact_line && <InfoRow icon="fab fa-line" label="LINE" value={convDetail.contact_line} />}
                    <InfoRow icon="fas fa-phone" label="เบอร์" value={convDetail.customer_phone} />
                    <InfoRow icon="fas fa-envelope" label="อีเมล" value={convDetail.customer_email} />
                    {convDetail.province && <InfoRow icon="fas fa-map-marker-alt" label="จังหวัด" value={convDetail.province} />}
                    <InfoRow icon="fas fa-id-badge" label="Platform ID" value={convDetail.customer_platform_id} small />
                  </div>
                )}
              </div>

              {/* ===== SOP Warning: ทรัพย์ไม่ผ่านเกณฑ์ ===== */}
              {convDetail.ineligible_property ? (
                <div style={{
                  marginBottom: 12, background: '#fff7ed', border: '1.5px solid #fb923c',
                  borderRadius: 10, padding: '9px 12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <i className="fas fa-exclamation-triangle" style={{ color: '#ea580c' }}></i>
                    <span style={{ fontWeight: 700, fontSize: 12, color: '#c2410c' }}>ทรัพย์ไม่ผ่านเกณฑ์ SOP</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#7c2d12' }}>{convDetail.ineligible_reason || 'กรุณาตรวจสอบเงื่อนไขการรับทรัพย์'}</div>
                </div>
              ) : null}

              {/* ===== Intent badge ===== */}
              {convDetail.intent_type && (() => {
                const intentMap = {
                  loan_inquiry:      { label: 'สนใจขอสินเชื่อ',    bg: '#dcfce7', color: '#166534', icon: 'fa-hand-holding-usd' },
                  ask_interest:      { label: 'ถามดอกเบี้ย',       bg: '#fffbeb', color: '#92400e', icon: 'fa-percent' },
                  ask_fee:           { label: 'ถามค่าธรรมเนียม',   bg: '#faf5ff', color: '#6b21a8', icon: 'fa-receipt' },
                  contract_renewal:  { label: 'ต่อสัญญา',          bg: '#eff6ff', color: '#1d4ed8', icon: 'fa-sync-alt' },
                  ask_appraisal:     { label: 'ถามราคาประเมิน',    bg: '#f0fdf4', color: '#166534', icon: 'fa-search-dollar' },
                }
                const it = intentMap[convDetail.intent_type]
                if (!it) return null
                return (
                  <div style={{
                    marginBottom: 10, background: it.bg, border: `1px solid ${it.color}40`,
                    borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 7
                  }}>
                    <i className={`fas ${it.icon}`} style={{ color: it.color, fontSize: 12 }}></i>
                    <span style={{ fontSize: 12, fontWeight: 600, color: it.color }}>{it.label}</span>
                    {convDetail.is_refinance ? <span style={{ fontSize: 11, color: '#1d4ed8' }}>• รีไฟแนนซ์</span> : null}
                  </div>
                )
              })()}



              {/* ===== OCR โฉนด (Gemini Vision) ===== */}
              {convDetail.ocr_deed_data && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 13, color: '#555', marginBottom: 8,
                    borderBottom: '1px solid #f0f0f0', paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <i className="fas fa-search" style={{ color: '#0ea5e9' }}></i>
                    OCR สแกนโฉนด
                    <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>AI</span>
                  </div>
                  <div style={{
                    background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 12px',
                    fontSize: 12, display: 'flex', flexDirection: 'column', gap: 5
                  }}>
                    {convDetail.ocr_deed_data.deed_type && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <i className="fas fa-file-alt" style={{ width: 14, color: '#0ea5e9', flexShrink: 0, marginTop: 1 }}></i>
                        <span style={{ color: '#777', minWidth: 80 }}>ประเภท:</span>
                        <span style={{ fontWeight: 600, color: '#0c4a6e' }}>{convDetail.ocr_deed_data.deed_type}</span>
                      </div>
                    )}
                    {convDetail.ocr_deed_data.deed_number && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <i className="fas fa-hashtag" style={{ width: 14, color: '#0ea5e9', flexShrink: 0, marginTop: 1 }}></i>
                        <span style={{ color: '#777', minWidth: 80 }}>เลขที่โฉนด:</span>
                        <span style={{ fontWeight: 600, color: '#0c4a6e' }}>{convDetail.ocr_deed_data.deed_number}</span>
                      </div>
                    )}
                    {convDetail.ocr_deed_data.parcel_number && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <i className="fas fa-map" style={{ width: 14, color: '#0ea5e9', flexShrink: 0, marginTop: 1 }}></i>
                        <span style={{ color: '#777', minWidth: 80 }}>เลขที่ดิน:</span>
                        <span style={{ fontWeight: 600, color: '#0c4a6e' }}>{convDetail.ocr_deed_data.parcel_number}</span>
                      </div>
                    )}
                    {(convDetail.ocr_deed_data.volume || convDetail.ocr_deed_data.page) && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <i className="fas fa-book" style={{ width: 14, color: '#0ea5e9', flexShrink: 0, marginTop: 1 }}></i>
                        <span style={{ color: '#777', minWidth: 80 }}>เล่ม/หน้า:</span>
                        <span style={{ fontWeight: 600, color: '#0c4a6e' }}>
                          {[convDetail.ocr_deed_data.volume && `เล่ม ${convDetail.ocr_deed_data.volume}`, convDetail.ocr_deed_data.page && `หน้า ${convDetail.ocr_deed_data.page}`].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    )}
                    {convDetail.ocr_deed_data.map_sheet && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <i className="fas fa-layer-group" style={{ width: 14, color: '#0ea5e9', flexShrink: 0, marginTop: 1 }}></i>
                        <span style={{ color: '#777', minWidth: 80 }}>ระวาง:</span>
                        <span style={{ fontWeight: 600, color: '#0c4a6e' }}>{convDetail.ocr_deed_data.map_sheet}</span>
                      </div>
                    )}
                    {(convDetail.ocr_deed_data.tambon || convDetail.ocr_deed_data.amphoe || convDetail.ocr_deed_data.province) && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <i className="fas fa-map-marker-alt" style={{ width: 14, color: '#0ea5e9', flexShrink: 0, marginTop: 1 }}></i>
                        <span style={{ color: '#777', minWidth: 80 }}>ที่ตั้ง:</span>
                        <span style={{ fontWeight: 600, color: '#0c4a6e' }}>
                          {[
                            convDetail.ocr_deed_data.tambon && `ต.${convDetail.ocr_deed_data.tambon}`,
                            convDetail.ocr_deed_data.amphoe && `อ.${convDetail.ocr_deed_data.amphoe}`,
                            convDetail.ocr_deed_data.province && `จ.${convDetail.ocr_deed_data.province}`
                          ].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    )}
                    {convDetail.ocr_deed_data.land_area && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <i className="fas fa-ruler-combined" style={{ width: 14, color: '#0ea5e9', flexShrink: 0, marginTop: 1 }}></i>
                        <span style={{ color: '#777', minWidth: 80 }}>เนื้อที่:</span>
                        <span style={{ fontWeight: 600, color: '#0c4a6e' }}>{convDetail.ocr_deed_data.land_area}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== Loan Request (ลูกหนี้) ===== */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontWeight: 600, fontSize: 13, color: '#555', marginBottom: 8,
                  borderBottom: '1px solid #f0f0f0', paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <i className="fas fa-file-invoice-dollar" style={{ color: '#f59e0b' }}></i>
                  ข้อมูลลูกหนี้
                </div>

                {convDetail.loan_request_id ? (
                  <div>
                    <div style={{
                      background: '#fffbeb', borderRadius: 10, padding: 10, marginBottom: 8,
                      border: '1px solid #fde68a'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{
                          background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 8
                        }}>
                          {convDetail.debtor_code || 'LDD????'}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6,
                          background: convDetail.loan_request_status === 'pending' ? '#fee2e2' : '#dcfce7',
                          color: convDetail.loan_request_status === 'pending' ? '#dc2626' : '#16a34a'
                        }}>
                          {convDetail.loan_request_status === 'pending' ? 'รอดำเนินการ' : convDetail.loan_request_status || '-'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#78716c' }}>
                        สร้างจากแชท — ฝ่ายขายแก้ไขเพิ่มเติมได้
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => navigate(`/sales/edit/${convDetail.loan_request_id}`)}
                        style={{
                          flex: 1, padding: '7px 0', background: '#f59e0b', color: '#fff',
                          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}
                      >
                        <i className="fas fa-external-link-alt"></i> ดูข้อมูล
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const r = await fetch(`${API}/conversations/${selectedConv}/sync-loan-request`, {
                              method: 'POST',
                              headers: { Authorization: 'Bearer ' + token() }
                            })
                            const d = await r.json()
                            setMsg(d.message || (d.success ? 'อัพเดทสำเร็จ' : 'เกิดข้อผิดพลาด'))
                          } catch (e) { setMsg('เกิดข้อผิดพลาด: ' + e.message) }
                          setTimeout(() => setMsg(''), 4000)
                        }}
                        style={{
                          flex: 1, padding: '7px 0', background: '#8b5cf6', color: '#fff',
                          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}
                        title="ดึงข้อมูลจากแชทเข้าลูกหนี้"
                      >
                        <i className="fas fa-sync-alt"></i> อัพเดท
                      </button>
                    </div>
                    {/* ★ ปุ่มโอนเคสให้เซลล์คนอื่น */}
                    {chatSalesUsers.length > 0 && convDetail.case_id && (
                      <button
                        type="button"
                        onClick={() => { setShowChatTransferModal(true); setChatTransferTargetId(''); setChatTransferReason('') }}
                        style={{
                          width: '100%', marginTop: 8, padding: '7px 0',
                          background: '#fff3e0', border: '1.5px dashed #fb8c00', color: '#e65100',
                          borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                      >
                        <i className="fas fa-exchange-alt"></i> โอนให้เซลล์คนอื่น
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 6, textAlign: 'center' }}>
                      ยังไม่ได้สร้างลูกหนี้
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm('ต้องการสร้างลูกหนี้จากข้อมูลแชทนี้?')) return
                        try {
                          const r = await fetch(`${API}/conversations/${selectedConv}/create-loan-request`, {
                            method: 'POST',
                            headers: { Authorization: 'Bearer ' + token() }
                          })
                          const d = await r.json()
                          if (d.success) {
                            setMsg(d.message)
                            setConvDetail(prev => ({
                              ...prev,
                              loan_request_id: d.loan_request_id,
                              debtor_code: d.debtor_code,
                              loan_request_status: 'pending'
                            }))
                          } else {
                            setMsg(d.message || 'เกิดข้อผิดพลาด')
                          }
                        } catch (e) {
                          setMsg('เกิดข้อผิดพลาด: ' + e.message)
                        }
                      }}
                      style={{
                        width: '100%', padding: '7px 0', background: '#10b981', color: '#fff',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      <i className="fas fa-plus-circle"></i> สร้างลูกหนี้
                    </button>
                  </div>
                )}
              </div>





              {/* ===== Linked User จากเว็บอสังหา — แสดงเฉพาะเมื่อมีข้อมูล ===== */}
              {linkedUser && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#555' }}>
                    <i className="fas fa-link" style={{ marginRight: 6, color: '#8b5cf6' }}></i>ข้อมูลจากเว็บอสังหา
                  </span>
                  <button onClick={() => fetchLinkedUser(selectedConv)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 12 }}
                    title="รีเฟรช">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                </div>

                {loadingLinkedUser ? (
                  <div style={{ textAlign: 'center', padding: 8 }}>
                    <i className="fas fa-spinner fa-spin" style={{ color: '#8b5cf6' }}></i>
                  </div>
                ) : linkedUser ? (
                  <div>
                    {/* User info card */}
                    <div style={{
                      background: '#f5f3ff', borderRadius: 10, padding: 10, marginBottom: 8,
                      border: '1px solid #ede9fe'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {linkedUser.avatar_url ? (
                          <img src={linkedUser.avatar_url} alt=""
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                            onError={e => e.target.style.display = 'none'} />
                        ) : (
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: '#8b5cf6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 14, fontWeight: 700
                          }}>
                            {(linkedUser.display_name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{linkedUser.display_name}</div>
                          <span style={{
                            fontSize: 10, padding: '1px 8px', borderRadius: 10, fontWeight: 600,
                            background: linkedUser.role === 'agent' ? '#dbeafe' : linkedUser.role === 'admin' ? '#fee2e2' : '#dcfce7',
                            color: linkedUser.role === 'agent' ? '#1e40af' : linkedUser.role === 'admin' ? '#991b1b' : '#166534'
                          }}>{linkedUser.role || 'user'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                        {linkedUser.email && <div><i className="fas fa-envelope" style={{ width: 16, color: '#999' }}></i> {linkedUser.email}</div>}
                        {linkedUser.phone && <div><i className="fas fa-phone" style={{ width: 16, color: '#999' }}></i> {linkedUser.phone}</div>}
                        {linkedUser.company_name && <div><i className="fas fa-building" style={{ width: 16, color: '#999' }}></i> {linkedUser.company_name}</div>}
                        {linkedUser.line_id && <div><i className="fab fa-line" style={{ width: 16, color: '#06C755' }}></i> {linkedUser.line_id}</div>}
                        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                          สมัครเมื่อ: {linkedUser.created_at ? new Date(linkedUser.created_at).toLocaleDateString('th-TH') : '-'}
                        </div>
                      </div>
                    </div>

                    {/* ทรัพย์ที่ลงประกาศ (investment_properties) */}
                    {linkedUser.investment_properties && linkedUser.investment_properties.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
                          <i className="fas fa-home" style={{ marginRight: 4, color: '#f59e0b' }}></i>
                          ลงประกาศขาย/เช่า ({linkedUser.investment_properties.length})
                        </div>
                        {linkedUser.investment_properties.map(p => (
                          <div key={p.id} style={{
                            fontSize: 11, padding: '4px 8px', background: '#fffbeb',
                            borderRadius: 6, marginBottom: 3, border: '1px solid #fef3c7'
                          }}>
                            <div style={{ fontWeight: 600 }}>
                              {p.property_type} • {p.listing_type === 'rent' ? 'เช่า' : 'ขาย'}
                            </div>
                            <div style={{ color: '#666' }}>
                              {p.province} {p.district && `• ${p.district}`}
                              {p.price && ` • ฿${Number(p.price).toLocaleString()}`}
                            </div>
                            <div style={{ color: '#999' }}>
                              สถานะ: <span style={{
                                color: p.status === 'approved' ? '#16a34a' : p.status === 'rejected' ? '#dc2626' : '#f59e0b'
                              }}>{p.status === 'approved' ? 'อนุมัติ' : p.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ทรัพย์ที่เป็นเจ้าของ (properties) */}
                    {linkedUser.owned_properties && linkedUser.owned_properties.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>
                          <i className="fas fa-building" style={{ marginRight: 4, color: '#3b82f6' }}></i>
                          ทรัพย์ในระบบ ({linkedUser.owned_properties.length})
                        </div>
                        {linkedUser.owned_properties.map(p => (
                          <div key={p.id} style={{
                            fontSize: 11, padding: '4px 8px', background: '#eff6ff',
                            borderRadius: 6, marginBottom: 3, border: '1px solid #dbeafe'
                          }}>
                            <div style={{ fontWeight: 600 }}>{p.title}</div>
                            <div style={{ color: '#666' }}>
                              {p.property_type} • {p.listing_type === 'rent' ? 'เช่า' : 'ขาย'}
                              {p.price_requested && ` • ฿${Number(p.price_requested).toLocaleString()}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ถ้าไม่มีทรัพย์เลย */}
                    {(!linkedUser.investment_properties || linkedUser.investment_properties.length === 0) &&
                      (!linkedUser.owned_properties || linkedUser.owned_properties.length === 0) && (
                        <div style={{ fontSize: 12, color: '#999', padding: 4 }}>
                          ยังไม่มีทรัพย์ในระบบ
                        </div>
                      )}
                  </div>
                ) : null}
              </div>
              )}

              {/* แท็กสถานะ */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontWeight: 600, fontSize: 13, color: '#555', marginBottom: 8,
                  borderBottom: '1px solid #f0f0f0', paddingBottom: 6
                }}>
                  <i className="fas fa-tag" style={{ marginRight: 6 }}></i>แท็กสถานะ
                </div>
                {/* แสดงแท็กปัจจุบัน */}
                {convDetail.tag_name && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{
                      padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: convDetail.tag_bg_color, color: convDetail.tag_text_color
                    }}>{convDetail.tag_name}</span>
                  </div>
                )}
                {/* Dropdown เลือกแท็ก */}
                <select
                  value={convDetail.tag_id || ''}
                  onChange={e => setConversationTag(convDetail.id, e.target.value ? parseInt(e.target.value) : null)}
                  style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                >
                  <option value="">— ไม่มีแท็ก —</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
                {tags.length === 0 && (
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>ยังไม่มีแท็ก — สร้างในตั้งค่า</div>
                )}
                <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
                  สร้างเมื่อ: {formatTime(convDetail.created_at)}
                </div>
                {/* Assign conversation to admin */}
                {isSuperAdmin && adminUsers.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 3 }}>
                      <i className="fas fa-user-check" style={{ marginRight: 4 }}></i>มอบหมายให้:
                    </label>
                    <select
                      value={convDetail.assigned_to || ''}
                      onChange={e => handleAssignConversation(convDetail.id, e.target.value || null)}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                    >
                      <option value="">— ไม่มอบหมาย —</option>
                      {adminUsers.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.full_name || a.username}{a.nickname ? ` (${a.nickname})` : ''} [{a.department}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!isSuperAdmin && convDetail.assigned_username && (
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    มอบหมาย: {convDetail.assigned_username}
                  </div>
                )}
                {/* เซลล์ที่รับผิดชอบเคส + รหัสเคส (super_admin เห็น) */}
                {isSuperAdmin && convDetail.case_code && (
                  <div style={{
                    marginTop: 8, padding: '6px 10px', background: '#f5f3ff',
                    borderRadius: 8, border: '1px solid #e9e5ff'
                  }}>
                    <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 2 }}>
                      <i className="fas fa-briefcase" style={{ marginRight: 4 }}></i>
                      เคส: {convDetail.case_code}
                    </div>
                    {(convDetail.sales_full_name || convDetail.sales_nickname || convDetail.sales_username) && (
                      <div style={{ fontSize: 11, color: '#6d28d9' }}>
                        <i className="fas fa-user" style={{ marginRight: 4 }}></i>
                        เซลล์: {convDetail.sales_full_name || convDetail.sales_nickname || convDetail.sales_username}
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* ===== ★ Ad Source / Campaign Tracking ===== */}
              {(convDetail.utm_source || convDetail.fb_ad_id || convDetail.line_ref) && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 13, color: '#555', marginBottom: 8,
                    borderBottom: '1px solid #f0f0f0', paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <i className="fas fa-bullhorn" style={{ color: '#3b82f6' }}></i>
                    แหล่งที่มา (Ad Source)
                  </div>
                  <div style={{
                    background: '#eff6ff', borderRadius: 10, padding: '10px 12px',
                    border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12
                  }}>
                    {convDetail.utm_source && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <i className="fas fa-globe" style={{ width: 14, color: '#3b82f6' }}></i>
                        <span style={{ color: '#64748b', minWidth: 60 }}>Source:</span>
                        <span style={{ fontWeight: 600, color: '#1e40af', textTransform: 'capitalize' }}>{convDetail.utm_source}</span>
                        {convDetail.utm_medium && <span style={{ color: '#94a3b8', fontSize: 11 }}>/ {convDetail.utm_medium}</span>}
                      </div>
                    )}
                    {convDetail.utm_campaign && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <i className="fas fa-tag" style={{ width: 14, color: '#3b82f6' }}></i>
                        <span style={{ color: '#64748b', minWidth: 60 }}>Campaign:</span>
                        <span style={{ fontWeight: 600, color: '#1e40af' }}>{convDetail.utm_campaign}</span>
                      </div>
                    )}
                    {convDetail.utm_ad_set && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <i className="fas fa-layer-group" style={{ width: 14, color: '#3b82f6' }}></i>
                        <span style={{ color: '#64748b', minWidth: 60 }}>Ad Set:</span>
                        <span style={{ fontWeight: 600, color: '#1e40af' }}>{convDetail.utm_ad_set}</span>
                      </div>
                    )}
                    {convDetail.fb_ad_id && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <i className="fab fa-facebook" style={{ width: 14, color: '#0084ff' }}></i>
                        <span style={{ color: '#64748b', minWidth: 60 }}>FB Ad ID:</span>
                        <span style={{ fontWeight: 600, color: '#1e40af', fontFamily: 'monospace', fontSize: 11 }}>{convDetail.fb_ad_id}</span>
                      </div>
                    )}
                    {convDetail.line_ref && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <i className="fab fa-line" style={{ width: 14, color: '#06c755' }}></i>
                        <span style={{ color: '#64748b', minWidth: 60 }}>LINE Ref:</span>
                        <span style={{ fontWeight: 600, color: '#065f46', fontFamily: 'monospace', fontSize: 11 }}>{convDetail.line_ref}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#555' }}>
                    <i className="fas fa-sticky-note" style={{ marginRight: 6 }}></i>บันทึก
                  </span>
                  <button onClick={() => setEditingNote(!editingNote)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 12 }}>
                    <i className="fas fa-edit"></i>
                  </button>
                </div>

                {editingNote ? (
                  <div>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                      rows={4} placeholder="เพิ่มบันทึก..."
                      style={{
                        width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd',
                        fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit'
                      }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button onClick={saveNote}
                        style={{ flex: 1, padding: 6, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        บันทึก
                      </button>
                      <button onClick={() => setEditingNote(false)}
                        style={{ flex: 1, padding: 6, background: '#f0f0f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: noteText ? '#333' : '#999', padding: 4, lineHeight: 1.6 }}>
                    {noteText || 'ยังไม่มีบันทึก — คลิก แก้ไข เพื่อเพิ่ม'}
                  </div>
                )}
              </div>


              {/* ===== ★ Follow-up Reminder (ตั้งวันนัดติดตาม) ===== */}
              <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-calendar-check" style={{ color: '#f59e0b' }}></i>
                    นัด Follow-up
                  </span>
                  {convDetail?.next_follow_up_at ? (
                    <button onClick={clearFollowupSchedule}
                      style={{ fontSize: 11, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px' }}>
                      <i className="fas fa-times"></i> ล้าง
                    </button>
                  ) : null}
                </div>

                {convDetail?.next_follow_up_at ? (
                  <div style={{
                    background: (() => {
                      const diff = new Date(convDetail.next_follow_up_at) - new Date()
                      return diff < 0 ? '#fff1f2' : diff < 86400000 ? '#fff7ed' : '#f0fdf4'
                    })(),
                    border: `1px solid ${(() => {
                      const diff = new Date(convDetail.next_follow_up_at) - new Date()
                      return diff < 0 ? '#fca5a5' : diff < 86400000 ? '#fed7aa' : '#bbf7d0'
                    })()}`,
                    borderRadius: 8, padding: '8px 12px'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                      {(() => {
                        const diff = new Date(convDetail.next_follow_up_at) - new Date()
                        if (diff < 0) return '🚨 เลยกำหนดแล้ว!'
                        if (diff < 3600000) return '⏰ ถึงกำหนดแล้ว!'
                        if (diff < 86400000) return '⚡ วันนี้!'
                        return '📅 ' + new Date(convDetail.next_follow_up_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                      })()}
                    </div>
                    {convDetail.followup_note && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{convDetail.followup_note}</div>
                    )}
                    <button onClick={() => { setFollowupDate(convDetail.next_follow_up_at?.slice(0,16) || ''); setFollowupNote(convDetail.followup_note || ''); setShowFollowupModal(true) }}
                      style={{ marginTop: 6, fontSize: 11, background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: '#475569' }}>
                      <i className="fas fa-edit" style={{ marginRight: 4 }}></i>แก้ไข
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setFollowupDate(''); setFollowupNote(''); setShowFollowupModal(true) }}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      background: '#fffbeb', border: '1.5px dashed #f59e0b',
                      color: '#d97706', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}>
                    <i className="fas fa-plus"></i> ตั้งวันนัด follow-up
                  </button>
                )}
              </div>

              {/* ===== Dead / Close Lead ===== */}
              <DeadLeadSection convId={selectedConv} apiBase={API} token={token} convDetail={convDetail}
                onChanged={(isDead, reason) => setConvDetail(prev => ({ ...prev, is_dead: isDead ? 1 : 0, dead_reason: reason }))} />

            </div>
          )}
        </div>
      </div>

      {/* ★ Follow-up Schedule Modal */}
      {showFollowupModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 360, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-calendar-check" style={{ color: '#f59e0b' }}></i> ตั้งวันนัด Follow-up
            </h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>วันและเวลานัด *</label>
              <input type="datetime-local" value={followupDate} onChange={e => setFollowupDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>บันทึก / เหตุผล</label>
              <textarea value={followupNote} onChange={e => setFollowupNote(e.target.value)}
                rows={3} placeholder="เช่น โทรนัดดูทรัพย์, ส่งเอกสารเพิ่มเติม..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowFollowupModal(false)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>
                ยกเลิก
              </button>
              <button onClick={saveFollowupSchedule} disabled={!followupDate || savingFollowup}
                style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: savingFollowup ? '#fde68a' : '#f59e0b', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                {savingFollowup ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>กำลังบันทึก...</> : <><i className="fas fa-check" style={{ marginRight: 6 }}></i>บันทึกวันนัด</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ Modal โอนเคสให้เซลล์คนอื่น */}
      {showChatTransferModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, width: 360, maxWidth: '90vw',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e65100', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-exchange-alt"></i> โอนเคสให้เซลล์คนอื่น
            </h3>
            {convDetail?.case_code && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: '#fff8f0', borderRadius: 8, fontSize: 13, color: '#e65100' }}>
                <i className="fas fa-briefcase" style={{ marginRight: 6 }}></i>
                เคส: <strong>{convDetail.case_code}</strong>
                {convDetail.contact_name && <span style={{ color: '#888' }}> — {convDetail.contact_name}</span>}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                เซลล์ที่ต้องการโอนให้ <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                value={chatTransferTargetId}
                onChange={e => setChatTransferTargetId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13 }}
              >
                <option value="">-- เลือกเซลล์ --</option>
                {chatSalesUsers
                  .filter(u => u.id !== currentUser.id)
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username}{u.nickname ? ` (${u.nickname})` : ''} — {u.username}
                    </option>
                  ))}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>เหตุผลในการโอน</label>
              <input
                type="text"
                placeholder="เช่น ลูกหนี้ทักมาผิดคน, ส่งต่อพื้นที่..."
                value={chatTransferReason}
                onChange={e => setChatTransferReason(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleChatTransfer}
                disabled={!chatTransferTargetId || chatTransferring}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  background: chatTransferTargetId ? '#e65100' : '#ccc', color: '#fff',
                  border: 'none', cursor: chatTransferTargetId ? 'pointer' : 'not-allowed',
                  fontWeight: 700, fontSize: 14
                }}
              >
                {chatTransferring ? <><i className="fas fa-spinner fa-spin"></i> กำลังโอน...</> : 'ยืนยันโอนเคส'}
              </button>
              <button
                onClick={() => { setShowChatTransferModal(false); setChatTransferTargetId(''); setChatTransferReason('') }}
                style={{
                  padding: '10px 20px', borderRadius: 8, background: '#f5f5f5',
                  color: '#666', border: '1px solid #e0e0e0', cursor: 'pointer', fontWeight: 600
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Component: Info Row
function InfoRow({ icon, label, value, small }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0', gap: 8 }}>
      <i className={icon} style={{ color: '#999', width: 16, textAlign: 'center', fontSize: small ? 11 : 13 }}></i>
      <span style={{ color: '#999', fontSize: 12, minWidth: 50 }}>{label}:</span>
      <span style={{ color: value ? '#333' : '#ccc', fontSize: small ? 11 : 13, wordBreak: 'break-all' }}>
        {value || '-'}
      </span>
    </div>
  )
}
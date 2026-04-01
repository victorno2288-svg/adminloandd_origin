// ChatFlowBuilderPage.jsx
// ★ หน้า Super Admin — สร้างและจัดการ Question Flow สำหรับบอทแชท
// เส้นทาง: /chat-flow-builder

import { useState, useEffect, useRef, useCallback } from 'react'

const token = () => localStorage.getItem('loandd_admin')
const API   = '/api/admin/chat-flow'

// ─── constants ────────────────────────────────────────────────────────────────
const QUESTION_TYPES = [
  { value: 'text',   label: 'ข้อความ',       icon: 'fa-font',           color: '#3b82f6' },
  { value: 'choice', label: 'ตัวเลือก',       icon: 'fa-list-ul',        color: '#8b5cf6' },
  { value: 'image',  label: 'รูปภาพ / ไฟล์',   icon: 'fa-image',          color: '#f59e0b' },
  { value: 'number', label: 'ตัวเลข',          icon: 'fa-hashtag',        color: '#10b981' },
  { value: 'date',   label: 'วันที่',           icon: 'fa-calendar-alt',   color: '#ef4444' },
  { value: 'info',   label: 'แจ้งข้อมูล (ไม่ถาม)', icon: 'fa-info-circle', color: '#6b7280' },
]

const CHANNEL_OPTS = [
  { value: 'both',     label: 'Line + Facebook',  icon: 'fa-globe',      color: '#1a73e8' },
  { value: 'line',     label: 'Line เท่านั้น',     icon: 'fa-comment',    color: '#06b25b' },
  { value: 'facebook', label: 'Facebook เท่านั้น', icon: 'fa-facebook',   color: '#1877f2' },
]

const FIELD_KEYS = [
  { value: 'customer_name',   label: 'ชื่อลูกค้า' },
  { value: 'phone',           label: 'เบอร์โทรศัพท์' },
  { value: 'loan_type',       label: 'ประเภทสินเชื่อ (จำนอง/ขายฝาก)' },
  { value: 'asset_type',      label: 'ประเภททรัพย์สิน' },
  { value: 'asset_province',  label: 'จังหวัดที่ตั้งทรัพย์' },
  { value: 'asset_district',  label: 'อำเภอที่ตั้งทรัพย์' },
  { value: 'asset_area',      label: 'เนื้อที่ (ไร่/ตร.ว.)' },
  { value: 'loan_amount',     label: 'วงเงินที่ต้องการ (บาท)' },
  { value: 'deed_image',      label: 'รูปโฉนดที่ดิน' },
  { value: 'house_reg_image', label: 'สำเนาทะเบียนบ้าน' },
  { value: 'property_photo',  label: 'รูปถ่ายทรัพย์สิน' },
  { value: 'marital_status',  label: 'สถานะสมรส' },
  { value: 'id_card_image',   label: 'รูปบัตรประชาชน' },
  { value: 'facebook_name',   label: 'ชื่อ Facebook' },
  { value: 'line_name',       label: 'ชื่อ Line' },
  { value: 'other',           label: 'อื่นๆ (ระบุเอง)' },
]

const typeInfo = (t) => QUESTION_TYPES.find(x => x.value === t) || QUESTION_TYPES[0]
const channelInfo = (c) => CHANNEL_OPTS.find(x => x.value === c) || CHANNEL_OPTS[0]

// ─── API helpers ─────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  return r.json()
}

// ─── QuestionModal — เพิ่ม/แก้ไขคำถาม ────────────────────────────────────────
function QuestionModal({ question, onSave, onClose }) {
  const isNew = !question?.id
  const [form, setForm] = useState({
    question_text:  question?.question_text  || '',
    question_type:  question?.question_type  || 'text',
    choices:        question?.choices        || [''],
    field_key:      question?.field_key      || '',
    custom_field:   '',
    is_required:    question?.is_required    !== undefined ? question.is_required : 1,
    skip_if_field:  question?.skip_if_field  || '',
    proactive_info: question?.proactive_info || '',
    wait_seconds:   question?.wait_seconds   || 0,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const addChoice = () => set('choices', [...form.choices, ''])
  const setChoice = (i, v) => {
    const c = [...form.choices]; c[i] = v; set('choices', c)
  }
  const removeChoice = (i) => set('choices', form.choices.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!form.question_text.trim()) return setErr('กรุณากรอกข้อความคำถาม')
    if (form.question_type === 'choice' && form.choices.filter(c => c.trim()).length < 2)
      return setErr('ตัวเลือกต้องมีอย่างน้อย 2 ตัวเลือก')
    setSaving(true); setErr('')
    const payload = {
      ...form,
      field_key: form.field_key === 'other' ? form.custom_field : form.field_key,
      choices: form.question_type === 'choice' ? form.choices.filter(c => c.trim()) : [],
    }
    await onSave(payload)
    setSaving(false)
  }

  const selectedType = typeInfo(form.question_type)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
          borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <i className={`fas ${selectedType.icon}`} style={{ color: '#fff', fontSize: 18 }}></i>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, flex: 1 }}>
            {isNew ? 'เพิ่มคำถามใหม่' : 'แก้ไขคำถาม'}
          </span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {err && <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 14 }}>{err}</div>}

          {/* ประเภทคำถาม */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
              <i className="fas fa-tag" style={{ marginRight: 5, color: '#6b7280' }}></i>ประเภทคำถาม
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {QUESTION_TYPES.map(t => (
                <button key={t.value} onClick={() => set('question_type', t.value)}
                  style={{
                    padding: '8px 4px', borderRadius: 10, border: `2px solid ${form.question_type === t.value ? t.color : '#e5e7eb'}`,
                    background: form.question_type === t.value ? t.color + '18' : '#f9fafb',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  }}>
                  <i className={`fas ${t.icon}`} style={{ color: t.color, display: 'block', marginBottom: 4, fontSize: 16 }}></i>
                  <span style={{ fontSize: 11, fontWeight: 600, color: form.question_type === t.value ? t.color : '#374151' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ข้อความคำถาม */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
              <i className="fas fa-comment-dots" style={{ marginRight: 5, color: '#6b7280' }}></i>
              {form.question_type === 'info' ? 'ข้อความที่จะส่ง' : 'คำถาม / ข้อความ'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={form.question_text}
              onChange={e => set('question_text', e.target.value)}
              rows={3}
              placeholder={form.question_type === 'info' ? 'เช่น: สวัสดีค่ะ! หนูน้องดีดียินดีให้บริการค่ะ 😊' : 'เช่น: คุณพี่สนใจบริการจำนองหรือขายฝากคะ?'}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {/* ตัวเลือก (choice เท่านั้น) */}
          {form.question_type === 'choice' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
                <i className="fas fa-list-ul" style={{ marginRight: 5, color: '#8b5cf6' }}></i>ตัวเลือก <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {form.choices.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ lineHeight: '36px', fontSize: 12, color: '#9ca3af', minWidth: 20 }}>{i + 1}.</span>
                  <input
                    value={c} onChange={e => setChoice(i, e.target.value)}
                    placeholder={`ตัวเลือกที่ ${i + 1}`}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13 }}
                  />
                  <button onClick={() => removeChoice(i)} disabled={form.choices.length <= 1}
                    style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', cursor: form.choices.length <= 1 ? 'not-allowed' : 'pointer', opacity: form.choices.length <= 1 ? 0.4 : 1 }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button onClick={addChoice}
                style={{ padding: '6px 14px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 8, color: '#7c3aed', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-plus"></i> เพิ่มตัวเลือก
              </button>
            </div>
          )}

          {/* Field Key */}
          {form.question_type !== 'info' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                <i className="fas fa-database" style={{ marginRight: 5, color: '#6b7280' }}></i>เก็บข้อมูลใน field
              </label>
              <select value={form.field_key} onChange={e => set('field_key', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, background: '#fff', boxSizing: 'border-box' }}>
                <option value="">— ไม่เก็บ (ถามเพื่อบอก AI เท่านั้น) —</option>
                {FIELD_KEYS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              {form.field_key === 'other' && (
                <input value={form.custom_field} onChange={e => set('custom_field', e.target.value)}
                  placeholder="ระบุชื่อ field เอง เช่น asset_size_wa"
                  style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} />
              )}
            </div>
          )}

          {/* Advanced: row ────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {/* บังคับตอบ */}
            {form.question_type !== 'info' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                  <i className="fas fa-asterisk" style={{ marginRight: 5, color: '#ef4444', fontSize: 10 }}></i>บังคับตอบ
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.is_required} onChange={e => set('is_required', e.target.checked ? 1 : 0)}
                    style={{ width: 16, height: 16, accentColor: '#ef4444' }} />
                  <span style={{ fontSize: 13 }}>ต้องตอบก่อนถามข้อถัดไป</span>
                </label>
              </div>
            )}
            {/* หน่วงเวลา */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                <i className="fas fa-clock" style={{ marginRight: 5, color: '#6b7280' }}></i>หน่วงเวลา (วินาที)
              </label>
              <input type="number" min={0} max={30} value={form.wait_seconds} onChange={e => set('wait_seconds', parseInt(e.target.value) || 0)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Skip if field */}
          {form.question_type !== 'info' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                <i className="fas fa-forward" style={{ marginRight: 5, color: '#6b7280' }}></i>ข้ามถ้ามีข้อมูลใน field (skip_if_field)
              </label>
              <input value={form.skip_if_field} onChange={e => set('skip_if_field', e.target.value)}
                placeholder="เช่น customer_name — ถ้ามีแล้ว จะไม่ถามซ้ำ"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          )}

          {/* Proactive info */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
              <i className="fas fa-lightbulb" style={{ marginRight: 5, color: '#f59e0b' }}></i>ข้อมูล Proactive (บอทจะบอกลูกค้าก่อนถาม)
            </label>
            <textarea value={form.proactive_info} onChange={e => set('proactive_info', e.target.value)}
              rows={2} placeholder="เช่น: จำนองคือการใช้ทรัพย์ค้ำประกันโดยยังถือครองกรรมสิทธิ์ ขายฝากคือโอนกรรมสิทธิ์ชั่วคราว..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #fde68a', background: '#fffbeb', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' }}>ยกเลิก</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึก</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FlowCard ─────────────────────────────────────────────────────────────────
function FlowCard({ flow, isActive, onClick, onToggleActive, onDelete }) {
  const ch = channelInfo(flow.channel)
  return (
    <div onClick={onClick}
      style={{
        padding: '14px 16px', borderRadius: 12, cursor: 'pointer', marginBottom: 10,
        border: `2px solid ${isActive ? '#2563eb' : '#e5e7eb'}`,
        background: isActive ? '#eff6ff' : '#fff',
        boxShadow: isActive ? '0 0 0 3px rgba(37,99,235,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'all 0.15s',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? '#1d4ed8' : '#111827', marginBottom: 4, wordBreak: 'break-word' }}>
            {flow.flow_name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: ch.color + '18', color: ch.color, fontWeight: 600, border: `1px solid ${ch.color}33` }}>
              <i className={`fas ${ch.icon}`} style={{ marginRight: 4 }}></i>{ch.label}
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 600, border: '1px solid #bbf7d0' }}>
              <i className="fas fa-question-circle" style={{ marginRight: 4 }}></i>{flow.question_count} คำถาม
            </span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: flow.is_active ? '#dcfce7' : '#f3f4f6', color: flow.is_active ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
              {flow.is_active ? '● เปิดใช้' : '○ ปิด'}
            </span>
          </div>
          {flow.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{flow.description}</div>}
          {flow.trigger_keywords && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {flow.trigger_keywords.split(',').slice(0, 5).map((kw, i) => (
                <span key={i} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontWeight: 600 }}>
                  ⚡ {kw.trim()}
                </span>
              ))}
              {flow.trigger_keywords.split(',').length > 5 && (
                <span style={{ fontSize: 10, color: '#d97706', fontWeight: 600 }}>+{flow.trigger_keywords.split(',').length - 5} อื่นๆ</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onToggleActive() }}
            title={flow.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
            style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${flow.is_active ? '#86efac' : '#d1d5db'}`, background: flow.is_active ? '#f0fdf4' : '#f9fafb', color: flow.is_active ? '#16a34a' : '#6b7280', cursor: 'pointer', fontSize: 11 }}>
            <i className={`fas ${flow.is_active ? 'fa-eye' : 'fa-eye-slash'}`}></i>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            title="ลบ flow"
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 11 }}>
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── QuestionRow ──────────────────────────────────────────────────────────────
function QuestionRow({ q, index, total, onEdit, onDelete, onMoveUp, onMoveDown }) {
  const t = typeInfo(q.question_type)
  return (
    <div style={{
      background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12,
      padding: '14px 16px', marginBottom: 10,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.15s',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Step badge */}
        <div style={{
          minWidth: 32, height: 32, borderRadius: '50%',
          background: t.color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 13, flexShrink: 0,
        }}>{index + 1}</div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Proactive info */}
          {q.proactive_info && (
            <div style={{ fontSize: 11, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 8px', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <i className="fas fa-lightbulb" style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}></i>
              <span style={{ wordBreak: 'break-word' }}>{q.proactive_info}</span>
            </div>
          )}
          {/* Question text */}
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 6, wordBreak: 'break-word' }}>
            {q.question_type !== 'info' && <span style={{ color: '#ef4444', marginRight: 4 }}>💬</span>}
            {q.question_text}
          </div>
          {/* Choices */}
          {q.question_type === 'choice' && q.choices?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {q.choices.map((c, i) => (
                <span key={i} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed', fontWeight: 600, border: '1px solid #c4b5fd' }}>
                  {c}
                </span>
              ))}
            </div>
          )}
          {/* Meta badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: t.color + '18', color: t.color, fontWeight: 600, border: `1px solid ${t.color}30` }}>
              <i className={`fas ${t.icon}`} style={{ marginRight: 3 }}></i>{t.label}
            </span>
            {q.field_key && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                <i className="fas fa-database" style={{ marginRight: 3 }}></i>{q.field_key}
              </span>
            )}
            {q.skip_if_field && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#f0f9ff', color: '#0284c7', fontWeight: 600, border: '1px solid #bae6fd' }}>
                <i className="fas fa-forward" style={{ marginRight: 3 }}></i>ข้ามถ้ามี: {q.skip_if_field}
              </span>
            )}
            {q.wait_seconds > 0 && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#fafafa', color: '#6b7280', fontWeight: 600, border: '1px solid #e5e7eb' }}>
                <i className="fas fa-clock" style={{ marginRight: 3 }}></i>{q.wait_seconds}s
              </span>
            )}
            {!q.is_required && q.question_type !== 'info' && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#fff3e0', color: '#f57c00', fontWeight: 600, border: '1px solid #ffcc80' }}>
                ไม่บังคับ
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onMoveUp(index)} disabled={index === 0}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db', background: '#f9fafb', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1, fontSize: 11, color: '#374151' }}>
              <i className="fas fa-chevron-up"></i>
            </button>
            <button onClick={() => onMoveDown(index)} disabled={index === total - 1}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db', background: '#f9fafb', cursor: index === total - 1 ? 'not-allowed' : 'pointer', opacity: index === total - 1 ? 0.3 : 1, fontSize: 11, color: '#374151' }}>
              <i className="fas fa-chevron-down"></i>
            </button>
          </div>
          <button onClick={onEdit}
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #93c5fd', background: '#eff6ff', cursor: 'pointer', fontSize: 11, color: '#2563eb' }}>
            <i className="fas fa-pencil-alt"></i>
          </button>
          <button onClick={onDelete}
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: 11, color: '#dc2626' }}>
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Preview Panel ────────────────────────────────────────────────────────────
function PreviewPanel({ questions }) {
  return (
    <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="fas fa-mobile-alt" style={{ color: '#64748b' }}></i>ตัวอย่างบทสนทนา
      </div>
      {questions.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '20px 0' }}>ยังไม่มีคำถาม</div>
      ) : (
        questions.map((q, i) => (
          <div key={q.id || i} style={{ marginBottom: 14 }}>
            {q.proactive_info && (
              <div style={{
                background: '#1e3a5f', color: '#fff', borderRadius: '14px 14px 14px 4px',
                padding: '8px 12px', fontSize: 12, marginBottom: 6, maxWidth: '85%',
              }}>
                <i className="fas fa-robot" style={{ marginRight: 6, color: '#93c5fd' }}></i>
                {q.proactive_info}
              </div>
            )}
            {q.question_type !== 'info' ? (
              <div style={{
                background: '#2563eb', color: '#fff', borderRadius: '14px 14px 14px 4px',
                padding: '8px 12px', fontSize: 12, maxWidth: '85%',
              }}>
                {q.question_text}
                {q.question_type === 'choice' && q.choices?.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {q.choices.map((c, ci) => (
                      <span key={ci} style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 20, fontSize: 11, border: '1px solid rgba(255,255,255,0.4)' }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#1e3a5f', color: '#c7d2fe', borderRadius: '14px 14px 14px 4px',
                padding: '8px 12px', fontSize: 12, maxWidth: '85%',
              }}>
                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>{q.question_text}
              </div>
            )}
            {q.field_key && (
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, marginLeft: 4 }}>
                → บันทึกใน: <code>{q.field_key}</code>
                {q.skip_if_field && ` (ข้ามถ้ามี ${q.skip_if_field})`}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ChatFlowBuilderPage() {
  const [flows,          setFlows]          = useState([])
  const [selectedFlow,   setSelectedFlow]   = useState(null)
  const [questions,      setQuestions]      = useState([])
  const [loadingFlows,   setLoadingFlows]   = useState(true)
  const [loadingQs,      setLoadingQs]      = useState(false)
  const [modal,          setModal]          = useState(null)  // null | 'add-flow' | { question }
  const [newFlowName,     setNewFlowName]    = useState('')
  const [newFlowCh,       setNewFlowCh]      = useState('both')
  const [newFlowDesc,     setNewFlowDesc]    = useState('')
  const [newFlowTriggers, setNewFlowTriggers]= useState('')
  const [creatingFlow,   setCreatingFlow]   = useState(false)
  const [editingFlow,    setEditingFlow]    = useState(null)  // flow obj ที่กำลังแก้ชื่อ
  const [showPreview,    setShowPreview]    = useState(false)
  const [toast,          setToast]          = useState('')

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }, [])

  // ─── Load flows ────────────────────────────────────────
  useEffect(() => {
    setLoadingFlows(true)
    apiFetch('/flows').then(d => {
      if (d.success) setFlows(d.flows || [])
    }).finally(() => setLoadingFlows(false))
  }, [])

  // ─── Load questions when flow selected ─────────────────
  useEffect(() => {
    if (!selectedFlow) { setQuestions([]); return }
    setLoadingQs(true)
    apiFetch(`/flows/${selectedFlow.id}/questions`).then(d => {
      if (d.success) setQuestions(d.questions || [])
    }).finally(() => setLoadingQs(false))
  }, [selectedFlow])

  // ─── Flow actions ──────────────────────────────────────
  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) return
    setCreatingFlow(true)
    const d = await apiFetch('/flows', { method: 'POST', body: { flow_name: newFlowName, channel: newFlowCh, description: newFlowDesc, trigger_keywords: newFlowTriggers } })
    if (d.success) {
      setFlows(prev => [...prev, d.flow])
      setSelectedFlow(d.flow)
      setNewFlowName(''); setNewFlowDesc(''); setNewFlowTriggers('')
      setModal(null)
      showToast('✅ สร้าง Flow ใหม่สำเร็จ')
    }
    setCreatingFlow(false)
  }

  const handleToggleActive = async (flow) => {
    const d = await apiFetch(`/flows/${flow.id}`, { method: 'PUT', body: { is_active: flow.is_active ? 0 : 1 } })
    if (d.success) {
      setFlows(prev => prev.map(f => f.id === flow.id ? d.flow : f))
      if (selectedFlow?.id === flow.id) setSelectedFlow(d.flow)
    }
  }

  const handleDeleteFlow = async (flow) => {
    if (!window.confirm(`ยืนยันลบ Flow "${flow.flow_name}"?\nคำถามทั้งหมดใน Flow นี้จะถูกลบด้วย`)) return
    const d = await apiFetch(`/flows/${flow.id}`, { method: 'DELETE' })
    if (d.success) {
      setFlows(prev => prev.filter(f => f.id !== flow.id))
      if (selectedFlow?.id === flow.id) setSelectedFlow(null)
      showToast('🗑️ ลบ Flow แล้ว')
    } else {
      alert(`ลบไม่ได้: ${d.message || 'เกิดข้อผิดพลาด'}`)
    }
  }

  const handleSaveFlowName = async () => {
    if (!editingFlow) return
    const d = await apiFetch(`/flows/${editingFlow.id}`, { method: 'PUT', body: {
      flow_name:        editingFlow.flow_name,
      channel:          editingFlow.channel,
      description:      editingFlow.description,
      trigger_keywords: editingFlow.trigger_keywords,
      ai_system_prompt: editingFlow.ai_system_prompt || null
    } })
    if (d.success) {
      setFlows(prev => prev.map(f => f.id === editingFlow.id ? d.flow : f))
      if (selectedFlow?.id === editingFlow.id) setSelectedFlow(d.flow)
      showToast('✅ บันทึกแล้ว')
    }
    setEditingFlow(null)
  }

  // ─── Question actions ──────────────────────────────────
  const handleSaveQuestion = async (payload) => {
    if (modal?.question?.id) {
      // edit
      const d = await apiFetch(`/questions/${modal.question.id}`, { method: 'PUT', body: payload })
      if (d.success) {
        setQuestions(prev => prev.map(q => q.id === modal.question.id ? d.question : q))
        setFlows(prev => prev.map(f => f.id === selectedFlow.id ? { ...f, question_count: prev.find(x => x.id === selectedFlow.id)?.question_count || f.question_count } : f))
        showToast('✅ แก้ไขคำถามแล้ว')
      }
    } else {
      // create
      const d = await apiFetch(`/flows/${selectedFlow.id}/questions`, { method: 'POST', body: payload })
      if (d.success) {
        setQuestions(prev => [...prev, d.question])
        setFlows(prev => prev.map(f => f.id === selectedFlow.id ? { ...f, question_count: (f.question_count || 0) + 1 } : f))
        showToast('✅ เพิ่มคำถามแล้ว')
      }
    }
    setModal(null)
  }

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm('ยืนยันลบคำถามนี้?')) return
    const d = await apiFetch(`/questions/${q.id}`, { method: 'DELETE' })
    if (d.success) {
      setQuestions(prev => prev.filter(x => x.id !== q.id).map((x, i) => ({ ...x, step_number: i + 1 })))
      setFlows(prev => prev.map(f => f.id === selectedFlow.id ? { ...f, question_count: Math.max(0, (f.question_count || 1) - 1) } : f))
      showToast('🗑️ ลบคำถามแล้ว')
    }
  }

  // ─── Seed ตัวอย่าง flows ────────────────────────────────
  const [seeding, setSeeding] = useState(false)
  const handleSeedExample = async () => {
    if (!window.confirm('โหลด Flow ตัวอย่าง "สมัครสินเชื่อ" และ "สอบถามทั่วไป" ?\n\n(ถ้ามีอยู่แล้วจะข้ามไป ไม่เขียนทับ)')) return
    setSeeding(true)
    try {
      const d = await apiFetch('/seed', { method: 'POST' })
      if (d.success) {
        const created = d.results.filter(r => r.status === 'created').length
        const skipped = d.results.filter(r => r.status === 'skip').length
        showToast(created > 0 ? `✅ เพิ่ม ${created} Flow ตัวอย่างสำเร็จ!` : `ℹ️ Flow ตัวอย่างมีอยู่แล้วทั้งหมด (${skipped} รายการ)`)
        // โหลด flows ใหม่
        const d2 = await apiFetch('/flows')
        if (d2.success) setFlows(d2.flows || [])
      } else {
        showToast('❌ เกิดข้อผิดพลาด: ' + d.message)
      }
    } catch (e) {
      showToast('❌ เกิดข้อผิดพลาด')
    } finally {
      setSeeding(false)
    }
  }

  const handleMove = async (index, dir) => {
    const newQs = [...questions]
    const [item] = newQs.splice(index, 1)
    newQs.splice(index + dir, 0, item)
    setQuestions(newQs.map((q, i) => ({ ...q, step_number: i + 1 })))
    // persist
    apiFetch(`/flows/${selectedFlow.id}/reorder`, {
      method: 'PUT',
      body: { order: newQs.map((q, i) => ({ id: q.id, sort_order: i })) },
    })
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99999,
          background: '#1e3a5f', color: '#fff', padding: '10px 20px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          animation: 'slideIn 0.2s ease',
        }}>{toast}</div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2><i className="fas fa-robot" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Chat Flow Builder</h2>
          <p className="page-subtitle">กำหนดบทสนทนาบอทแชทแบบ Step-by-Step ไม่ต้องเขียนโค้ด</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ═══ LEFT: Flows List ════════════════════════════════════ */}
        <div>
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #1e3a5f, #1e40af)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-sitemap" style={{ color: '#93c5fd', fontSize: 14 }}></i>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1 }}>Flow ทั้งหมด</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '1px 10px', fontSize: 12, fontWeight: 700 }}>{flows.length}</span>
            </div>
            <div style={{ padding: 12 }}>
              {/* Create new flow */}
              <button onClick={() => setModal('add-flow')}
                style={{
                  width: '100%', padding: '10px 16px', borderRadius: 10,
                  border: '2px dashed #93c5fd', background: '#eff6ff',
                  color: '#2563eb', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 8, transition: 'all 0.15s',
                }}>
                <i className="fas fa-plus-circle" style={{ fontSize: 16 }}></i>สร้าง Flow ใหม่
              </button>

              {/* ปุ่มโหลด Flow ตัวอย่าง */}
              <button
                onClick={handleSeedExample}
                disabled={seeding}
                title="โหลด Flow ตัวอย่าง: สมัครสินเชื่อ + สอบถามทั่วไป"
                style={{
                  width: '100%', padding: '8px 16px', borderRadius: 10,
                  border: '2px dashed #86efac', background: '#f0fdf4',
                  color: '#15803d', fontWeight: 600, fontSize: 12,
                  cursor: seeding ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 12, opacity: seeding ? 0.6 : 1, transition: 'all 0.15s',
                }}>
                {seeding
                  ? <><i className="fas fa-spinner fa-spin"></i>กำลังโหลด...</>
                  : <><i className="fas fa-magic" style={{ fontSize: 13 }}></i>โหลด Flow ตัวอย่าง</>
                }
              </button>

              {loadingFlows ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
              ) : flows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 12 }}>
                  ยังไม่มี Flow — กดสร้างใหม่
                </div>
              ) : (
                flows.map(flow => (
                  <FlowCard key={flow.id} flow={flow}
                    isActive={selectedFlow?.id === flow.id}
                    onClick={() => { setSelectedFlow(flow); setShowPreview(false) }}
                    onToggleActive={() => handleToggleActive(flow)}
                    onDelete={() => handleDeleteFlow(flow)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Questions Editor ══════════════════════════════ */}
        <div>
          {!selectedFlow ? (
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e5e7eb', padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-hand-pointer" style={{ fontSize: 40, display: 'block', marginBottom: 14, color: '#cbd5e1' }}></i>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>เลือก Flow จากแถบซ้าย</div>
              <div style={{ fontSize: 13 }}>หรือกด "สร้าง Flow ใหม่" เพื่อเริ่มต้น</div>
            </div>
          ) : (
            <div>
              {/* Flow editor header */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e5e7eb', marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {editingFlow?.id === selectedFlow.id ? (
                    <input value={editingFlow.flow_name} onChange={e => setEditingFlow(p => ({ ...p, flow_name: e.target.value }))}
                      style={{ flex: 1, minWidth: 160, padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 15, fontWeight: 700 }} />
                  ) : (
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, flex: 1 }}>{selectedFlow.flow_name}</span>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {editingFlow?.id === selectedFlow.id ? (
                      <>
                        <button onClick={handleSaveFlowName}
                          style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          <i className="fas fa-check" style={{ marginRight: 4 }}></i>บันทึก
                        </button>
                        <button onClick={() => setEditingFlow(null)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>ยกเลิก</button>
                      </>
                    ) : (
                      <button onClick={() => setEditingFlow({ ...selectedFlow })}
                        style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                        <i className="fas fa-pencil-alt" style={{ marginRight: 4 }}></i>แก้ชื่อ
                      </button>
                    )}
                    <button onClick={() => setShowPreview(p => !p)}
                      style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: showPreview ? '#f59e0b' : 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                      <i className={`fas ${showPreview ? 'fa-times' : 'fa-eye'}`} style={{ marginRight: 4 }}></i>
                      {showPreview ? 'ปิด Preview' : 'ดู Preview'}
                    </button>
                  </div>
                </div>

                {/* Channel + active row */}
                {editingFlow?.id === selectedFlow.id && (
                  <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>ช่องทาง</label>
                      <select value={editingFlow.channel} onChange={e => setEditingFlow(p => ({ ...p, channel: e.target.value }))}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 12 }}>
                        {CHANNEL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 2, minWidth: 160 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>คำอธิบาย</label>
                      <input value={editingFlow.description || ''} onChange={e => setEditingFlow(p => ({ ...p, description: e.target.value }))}
                        placeholder="เช่น: Flow สำหรับลูกค้าจำนองที่ดิน"
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ width: '100%' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#92400e', display: 'block', marginBottom: 4 }}>
                        <i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: 4 }}></i>คีย์เวิร์ดทริกเกอร์ <span style={{ fontWeight: 400, color: '#9ca3af' }}>(คั่นด้วยคอมม่า)</span>
                      </label>
                      <textarea
                        value={editingFlow.trigger_keywords || ''}
                        onChange={e => setEditingFlow(p => ({ ...p, trigger_keywords: e.target.value }))}
                        rows={2}
                        placeholder="เช่น: จำนอง,ขายฝาก,สินเชื่อ,กู้เงิน"
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #fde68a', background: '#fffbeb', fontSize: 12, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }}
                      />
                    </div>

                    {/* ── AI System Prompt ─────────────────────────────── */}
                    <div style={{ width: '100%' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', display: 'block', marginBottom: 4 }}>
                        <i className="fas fa-robot" style={{ color: '#6366f1', marginRight: 4 }}></i>
                        AI System Prompt <span style={{ fontWeight: 400, color: '#9ca3af' }}>— คำสั่งให้ AI ตอบอิสระในแชทนี้</span>
                      </label>
                      <textarea
                        value={editingFlow.ai_system_prompt || ''}
                        onChange={e => setEditingFlow(p => ({ ...p, ai_system_prompt: e.target.value }))}
                        rows={6}
                        placeholder={`เช่น:\nคุณคือผู้ช่วยบริษัทสินเชื่อ ตอบภาษาไทย สุภาพ กระชับ\nวัตถุประสงค์: ช่วยลูกค้าที่สนใจสินเชื่อจำนองที่ดิน\nข้อมูลที่ต้องถาม (ตามลำดับที่เหมาะสม): จังหวัด, ประเภทโฉนด, เนื้อที่, วงเงินที่ต้องการ\nห้าม: สัญญาอนุมัติ, ระบุดอกเบี้ยชัดเจน\nถ้าลูกค้าต้องการนัด: บอกว่าเจ้าหน้าที่จะติดต่อกลับภายใน 1 ชั่วโมง`}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8,
                          border: '1.5px solid #a5b4fc', background: '#eef2ff',
                          fontSize: 12, boxSizing: 'border-box', resize: 'vertical',
                          lineHeight: 1.7, fontFamily: 'inherit', color: '#1e1b4b'
                        }}
                      />
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>
                        💡 ถ้าไม่กรอก จะใช้ prompt default ของระบบ | เมื่อเลือก flow นี้ใน "แชท" AI จะใช้ prompt นี้แทน
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview / Questions */}
              {showPreview ? (
                <PreviewPanel questions={questions} />
              ) : (
                <div>
                  {/* Add question button */}
                  <button onClick={() => setModal({ question: null })}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 12,
                      border: '2px dashed #93c5fd', background: '#eff6ff',
                      color: '#2563eb', fontWeight: 700, fontSize: 14,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 8, marginBottom: 14,
                    }}>
                    <i className="fas fa-plus-circle" style={{ fontSize: 18 }}></i>เพิ่มคำถาม / ข้อความ
                  </button>

                  {/* Questions list */}
                  {loadingQs ? (
                    <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                      <i className="fas fa-spinner fa-spin" style={{ fontSize: 24 }}></i>
                    </div>
                  ) : questions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#fff', borderRadius: 14, border: '1.5px solid #e5e7eb' }}>
                      <i className="fas fa-comments" style={{ fontSize: 36, display: 'block', marginBottom: 12, color: '#cbd5e1' }}></i>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>ยังไม่มีคำถาม</div>
                      <div style={{ fontSize: 12 }}>กดปุ่มด้านบนเพื่อเพิ่มคำถามแรก</div>
                    </div>
                  ) : (
                    questions.map((q, i) => (
                      <QuestionRow key={q.id} q={q} index={i} total={questions.length}
                        onEdit={() => setModal({ question: q })}
                        onDelete={() => handleDeleteQuestion(q)}
                        onMoveUp={(idx) => handleMove(idx, -1)}
                        onMoveDown={(idx) => handleMove(idx, 1)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Modal: Create Flow ══════════════════════════════════════ */}
      {modal === 'add-flow' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#1e3a5f', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-sitemap" style={{ color: '#2563eb' }}></i>สร้าง Flow ใหม่
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>ชื่อ Flow <span style={{ color: '#ef4444' }}>*</span></label>
              <input value={newFlowName} onChange={e => setNewFlowName(e.target.value)}
                placeholder="เช่น: Flow จำนองที่ดิน"
                autoFocus
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>ช่องทาง</label>
              <select value={newFlowCh} onChange={e => setNewFlowCh(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                {CHANNEL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>คำอธิบาย (ไม่บังคับ)</label>
              <input value={newFlowDesc} onChange={e => setNewFlowDesc(e.target.value)}
                placeholder="เช่น: ใช้กับลูกค้าที่ทักเข้ามาใหม่"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                <i className="fas fa-bolt" style={{ color: '#f59e0b', marginRight: 5 }}></i>คำสั่ง / คีย์เวิร์ดทริกเกอร์ <span style={{ fontWeight: 400, color: '#9ca3af' }}>(คั่นด้วยคอมม่า)</span>
              </label>
              <textarea value={newFlowTriggers} onChange={e => setNewFlowTriggers(e.target.value)}
                rows={2}
                placeholder="เช่น: จำนอง,ขายฝาก,สมัครสินเชื่อ,กู้เงิน"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #fde68a', background: '#fffbeb', fontSize: 13, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }} />
              <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>
                💡 เมื่อลูกค้าพิมพ์คำใดคำหนึ่งใน Line/Facebook บอทจะเริ่ม Flow นี้ทันที
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleCreateFlow} disabled={!newFlowName.trim() || creatingFlow}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: !newFlowName.trim() ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: !newFlowName.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {creatingFlow ? <><i className="fas fa-spinner fa-spin"></i> กำลังสร้าง...</> : <><i className="fas fa-plus"></i> สร้าง Flow</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Add/Edit Question ════════════════════════════════ */}
      {modal && modal !== 'add-flow' && (
        <QuestionModal
          question={modal.question}
          onSave={handleSaveQuestion}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

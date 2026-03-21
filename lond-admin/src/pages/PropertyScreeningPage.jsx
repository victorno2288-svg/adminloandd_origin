import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── constants ───────────────────────────────────────────────────────────────
const DEED_OPTIONS = [
  { value: '', label: '— เลือกประเภทโฉนด —' },
  { value: 'chanote',    label: 'โฉนดที่ดิน (น.ส.4จ.)' },
  { value: 'ns4k',       label: 'น.ส.4ก.' },
  { value: 'ns3k',       label: 'น.ส.3ก.' },
  { value: 'ns3',        label: 'น.ส.3' },
  { value: 'sor_por_gor',label: 'ส.ป.ก.' },
  { value: 'tor_dor_4',  label: 'ท.ด.4 / ภบท.5' },
  { value: 'other',      label: 'อื่นๆ' },
]

const PROPERTY_OPTIONS = [
  { value: '',           label: '— เลือกประเภทอสังหาฯ —' },
  { value: 'house',      label: '🏠 บ้านเดี่ยว' },
  { value: 'townhouse',  label: '🏘️ ทาวน์เฮาส์ / ทาวน์โฮม' },
  { value: 'condo',      label: '🏢 คอนโดมิเนียม / อาคารชุด' },
  { value: 'land',       label: '📋 ที่ดินเปล่า' },
  { value: 'commercial', label: '🏪 อาคารพาณิชย์ / ออฟฟิศ' },
  { value: 'warehouse',  label: '🏭 โกดัง / โรงงาน' },
  { value: 'agri',       label: '🌾 ที่ดินเกษตร / ไร่ / นา (ไม่รับ)' },
  { value: 'farm',       label: '🌿 สวน / ฟาร์ม (ไม่รับ)' },
  { value: 'rice_field', label: '🌾 นาข้าว (ไม่รับ)' },
  { value: 'orchard',    label: '🌳 สวนผลไม้ (ไม่รับ)' },
  { value: 'swamp',      label: '💧 พื้นที่ชุ่มน้ำ / บึง (ไม่รับ)' },
]

const ROAD_ACCESS_OPTIONS = [
  { value: '', label: '— เลือก —' },
  { value: 'yes', label: '✅ มีทางเข้าออกถนนสาธารณะ' },
  { value: 'no',  label: '❌ ที่ดินตาบอด — ไม่มีทางเข้าออก' },
]

const ROAD_WIDTH_OPTIONS = [
  { value: '',     label: '— เลือกความกว้างถนน —' },
  { value: 'lt4',  label: '< 4 เมตร (ไม่รับ)' },
  { value: '4to6', label: '4–6 เมตร (ผ่าน)' },
  { value: 'gt6',  label: '> 6 เมตร (ดีมาก)' },
]

const UTILITY_OPTIONS = [
  { value: '',        label: '— เลือกสาธารณูปโภค —' },
  { value: 'yes',     label: '✅ ครบ — มีไฟฟ้าและประปา' },
  { value: 'partial', label: '⚠️ บางส่วน — มีไฟฟ้าหรือประปาอย่างใดอย่างหนึ่ง' },
  { value: 'no',      label: '❌ ไม่มีเลย' },
]

const FLOOD_OPTIONS = [
  { value: '',       label: '— เลือกความเสี่ยงน้ำท่วม —' },
  { value: 'never',  label: '✅ ไม่เคยท่วม' },
  { value: 'rarely', label: '⚠️ ท่วมนานๆ ครั้ง (ทนได้)' },
  { value: 'often',  label: '❌ ท่วมบ่อย (ไม่รับ)' },
]

const SEIZURE_OPTIONS = [
  { value: '',         label: '— เลือกสถานะ —' },
  { value: 'none',     label: '✅ ไม่ติดภาระใดๆ' },
  { value: 'mortgaged',label: '⚠️ ติดจำนอง (รับได้ถ้า LTV ผ่าน)' },
  { value: 'seized',   label: '❌ ถูกอายัด (ไม่รับ)' },
]

const LOAN_TYPE_OPTIONS = [
  { value: '',               label: '— เลือกประเภทสัญญา —' },
  { value: 'mortgage',       label: 'จำนอง' },
  { value: 'selling_pledge', label: 'ขายฝาก' },
]

const AGRI_TYPES = ['agri', 'farm', 'rice_field', 'orchard', 'swamp']
const isDeedOk = (v) => v && ['chanote', 'ns4k'].includes(v)
const fmt = (n) => n > 0 ? n.toLocaleString('th-TH') : '—'

// ─── CriteriaRow component ────────────────────────────────────────────────────
function CriteriaRow({ label, pass, passMsg, failMsg, pending = false }) {
  const color = pass === null
    ? '#9ca3af'
    : pass ? '#16a34a' : '#dc2626'
  const bg = pass === null
    ? '#f9fafb'
    : pass ? '#f0fdf4' : '#fef2f2'
  const border = pass === null
    ? '#e5e7eb'
    : pass ? '#bbf7d0' : '#fecaca'
  const icon = pass === null ? '○' : pass ? '✓' : '✗'
  const msg = pass === null
    ? (pending ? 'รอกรอกข้อมูล' : '—')
    : pass ? passMsg : failMsg

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 8, padding: '10px 14px', marginBottom: 8,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: pass === null ? '#e5e7eb' : pass ? '#dcfce7' : '#fee2e2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 14, color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</div>
        <div style={{ fontSize: 12, color, marginTop: 1 }}>{msg}</div>
      </div>
      {pass !== null && (
        <div style={{
          background: pass ? '#16a34a' : '#dc2626',
          color: '#fff', borderRadius: 20, padding: '2px 10px',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {pass ? 'ผ่าน' : 'ไม่ผ่าน'}
        </div>
      )}
    </div>
  )
}

// ─── SelectField component ────────────────────────────────────────────────────
function SelectField({ label, value, onChange, options, color }) {
  const passColor = color === 'pass' ? '#16a34a' : color === 'fail' ? '#dc2626' : undefined
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8,
          border: `1.5px solid ${passColor || '#d1d5db'}`,
          background: '#fff', fontSize: 13, color: '#111827',
          outline: 'none', cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── NumberField component ────────────────────────────────────────────────────
function NumberField({ label, value, onChange, placeholder, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>{hint}</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8,
          border: '1.5px solid #d1d5db', fontSize: 13, color: '#111827',
          boxSizing: 'border-box', outline: 'none',
        }}
      />
      {value && !isNaN(parseFloat(value.replace(/,/g, ''))) && (
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
          = {parseFloat(value.replace(/,/g, '')).toLocaleString('th-TH')} บาท
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PropertyScreeningPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    deed_type: '',
    property_type: '',
    road_access: '',
    road_width: '',
    utility_access: '',
    flood_risk: '',
    seizure_status: '',
    loan_type_detail: 'mortgage',
    estimated_value: '',
    desired_amount: '',
  })
  const [printed, setPrinted] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ─── Screening logic (mirrors SalesFormPage) ───────────────────────────────
  const ltvMax = form.loan_type_detail === 'selling_pledge' ? 60 : 40
  const ltvMin = form.loan_type_detail === 'selling_pledge' ? 50 : 30
  const estimatedNum = parseFloat(String(form.estimated_value).replace(/,/g, '')) || 0
  const desiredNum = parseFloat(String(form.desired_amount).replace(/,/g, '')) || 0
  const ltvLow  = estimatedNum > 0 ? Math.round(estimatedNum * ltvMin / 100) : 0
  const ltvHigh = estimatedNum > 0 ? Math.round(estimatedNum * ltvMax / 100) : 0
  const actualLtvPct = (estimatedNum > 0 && desiredNum > 0)
    ? Math.round((desiredNum / estimatedNum) * 100 * 10) / 10
    : null
  const ltvPass = actualLtvPct !== null && actualLtvPct <= ltvMax

  const getColor = (pass) => pass === null ? undefined : pass ? 'pass' : 'fail'

  const screenChecks = [
    {
      key: 'deed',
      label: 'ประเภทโฉนด',
      pass: form.deed_type ? isDeedOk(form.deed_type) : null,
      failMsg: 'โฉนดประเภทนี้ไม่รับพิจารณา (ต้องเป็น โฉนดที่ดิน หรือ น.ส.4ก. เท่านั้น)',
      passMsg: 'โฉนดผ่านเกณฑ์ ✓',
    },
    {
      key: 'property_type',
      label: 'ประเภทอสังหาริมทรัพย์',
      pass: form.property_type ? !AGRI_TYPES.includes(form.property_type) : null,
      failMsg: 'ที่ดินเกษตร / สวน / ไร่ / นา — ไม่รับพิจารณา',
      passMsg: 'ประเภททรัพย์ผ่านเกณฑ์ ✓',
    },
    {
      key: 'road',
      label: 'ทางเข้าออกถนน',
      pass: form.road_access ? form.road_access === 'yes' : null,
      failMsg: 'ที่ดินตาบอด (ไม่มีทางเข้าออก) — ไม่รับพิจารณา',
      passMsg: 'มีทางเข้าออกถนนสาธารณะ ✓',
    },
    {
      key: 'road_width',
      label: 'ความกว้างถนน',
      pass: form.road_width ? form.road_width !== 'lt4' : null,
      failMsg: 'ถนนกว้างน้อยกว่า 4 เมตร — รถบรรทุกเข้าไม่ได้ ไม่รับพิจารณา',
      passMsg: form.road_width === 'gt6' ? 'ถนนกว้าง > 6 เมตร — ดีมาก ✓' : 'ถนนกว้าง 4–6 เมตร — ผ่านเกณฑ์ ✓',
    },
    {
      key: 'utility',
      label: 'สาธารณูปโภค (ไฟฟ้า / ประปา)',
      pass: form.utility_access ? form.utility_access !== 'no' : null,
      failMsg: 'ไม่มีไฟฟ้า/ประปา — ลดมูลค่าทรัพย์อย่างมาก ไม่รับพิจารณา',
      passMsg: form.utility_access === 'yes' ? 'ครบทุกอย่าง ✓' : 'มีบางส่วน — รับได้ ✓',
    },
    {
      key: 'flood',
      label: 'ความเสี่ยงน้ำท่วม',
      pass: form.flood_risk ? form.flood_risk !== 'often' : null,
      failMsg: 'น้ำท่วมบ่อย — ลดมูลค่าทรัพย์ ไม่รับพิจารณา',
      passMsg: form.flood_risk === 'never' ? 'ไม่เคยท่วม ✓' : 'ท่วมนานๆ ครั้ง — รับได้ ✓',
    },
    {
      key: 'seizure',
      label: 'สถานะการอายัด / ภาระหนี้',
      pass: form.seizure_status ? form.seizure_status !== 'seized' : null,
      failMsg: 'ทรัพย์ถูกอายัด — ไม่รับพิจารณา',
      passMsg: form.seizure_status === 'mortgaged' ? 'ติดจำนอง — รับได้ถ้า LTV ผ่าน ✓' : 'ไม่ถูกอายัด ✓',
    },
    {
      key: 'ltv',
      label: `LTV สัดส่วนกู้/ประเมิน (สูงสุด ${ltvMax}% สำหรับ${form.loan_type_detail === 'selling_pledge' ? 'ขายฝาก' : 'จำนอง'})`,
      pass: actualLtvPct !== null ? ltvPass : null,
      failMsg: `LTV ${actualLtvPct}% เกินเกณฑ์ ${ltvMax}% — วงเงินที่ขอสูงเกินไป`,
      passMsg: `LTV ${actualLtvPct}% ผ่านเกณฑ์ ✓`,
    },
  ]

  const filledChecks  = screenChecks.filter(c => c.pass !== null)
  const failedChecks  = filledChecks.filter(c => c.pass === false)
  const screenOverall = filledChecks.length === 0 ? null
    : failedChecks.length > 0 ? 'fail'
    : filledChecks.length === screenChecks.length ? 'pass'
    : 'partial'

  // ─── Reset ────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setForm({
      deed_type: '', property_type: '', road_access: '', road_width: '',
      utility_access: '', flood_risk: '', seizure_status: '',
      loan_type_detail: 'mortgage', estimated_value: '', desired_amount: '',
    })
    setPrinted(false)
  }

  const filledCount = [
    form.deed_type, form.property_type, form.road_access, form.road_width,
    form.utility_access, form.flood_risk, form.seizure_status,
    form.estimated_value, form.desired_amount,
  ].filter(Boolean).length

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, padding: 4 }}
        >
          <i className="fas fa-arrow-left" />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>
            <i className="fas fa-clipboard-check" style={{ color: '#6366f1', marginRight: 10 }} />
            ฟอร์มคัดทรัพย์เบื้องต้น
          </h1>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            เลือกข้อมูลทรัพย์ด้านล่าง — ระบบประเมินผลให้อัตโนมัติ
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <i className="fas fa-redo" style={{ marginRight: 6 }} />เริ่มใหม่
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <i className="fas fa-print" style={{ marginRight: 6 }} />พิมพ์ผล
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ─── Left: Input Form ─────────────────────────────────────────────── */}
        <div>
          {/* Card 1: เอกสารสิทธิ์และทรัพย์ */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-file-alt" />
              ข้อมูลเอกสารสิทธิ์และทรัพย์
            </div>

            <SelectField
              label="ประเภทโฉนด / เอกสารสิทธิ์"
              value={form.deed_type}
              onChange={v => set('deed_type', v)}
              options={DEED_OPTIONS}
              color={form.deed_type ? (isDeedOk(form.deed_type) ? 'pass' : 'fail') : undefined}
            />
            {form.deed_type && !isDeedOk(form.deed_type) && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '7px 12px', marginTop: -8, marginBottom: 14, fontSize: 12, color: '#dc2626' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }} />
                โฉนดประเภทนี้ไม่รับพิจารณา — ต้องเป็น โฉนดที่ดิน (น.ส.4จ.) หรือ น.ส.4ก. เท่านั้น
              </div>
            )}

            <SelectField
              label="ประเภทอสังหาริมทรัพย์"
              value={form.property_type}
              onChange={v => set('property_type', v)}
              options={PROPERTY_OPTIONS}
              color={form.property_type ? (!AGRI_TYPES.includes(form.property_type) ? 'pass' : 'fail') : undefined}
            />
          </div>

          {/* Card 2: สภาพทรัพย์ */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-map-marked-alt" />
              สภาพทางกายภาพและทำเล
            </div>

            <SelectField
              label="ทางเข้าออกถนน"
              value={form.road_access}
              onChange={v => set('road_access', v)}
              options={ROAD_ACCESS_OPTIONS}
              color={form.road_access ? (form.road_access === 'yes' ? 'pass' : 'fail') : undefined}
            />

            <SelectField
              label="ความกว้างถนนหน้าทรัพย์"
              value={form.road_width}
              onChange={v => set('road_width', v)}
              options={ROAD_WIDTH_OPTIONS}
              color={form.road_width ? (form.road_width !== 'lt4' ? 'pass' : 'fail') : undefined}
            />

            <SelectField
              label="สาธารณูปโภค (ไฟฟ้า / ประปา)"
              value={form.utility_access}
              onChange={v => set('utility_access', v)}
              options={UTILITY_OPTIONS}
              color={form.utility_access ? (form.utility_access !== 'no' ? 'pass' : 'fail') : undefined}
            />

            <SelectField
              label="ความเสี่ยงน้ำท่วม"
              value={form.flood_risk}
              onChange={v => set('flood_risk', v)}
              options={FLOOD_OPTIONS}
              color={form.flood_risk ? (form.flood_risk !== 'often' ? 'pass' : 'fail') : undefined}
            />

            <SelectField
              label="สถานะการอายัด / ภาระหนี้"
              value={form.seizure_status}
              onChange={v => set('seizure_status', v)}
              options={SEIZURE_OPTIONS}
              color={form.seizure_status ? (form.seizure_status !== 'seized' ? 'pass' : 'fail') : undefined}
            />
          </div>

          {/* Card 3: LTV */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-calculator" />
              คำนวณ LTV (สัดส่วนวงเงินกู้/ราคาประเมิน)
            </div>

            <SelectField
              label="ประเภทสัญญา"
              value={form.loan_type_detail}
              onChange={v => set('loan_type_detail', v)}
              options={LOAN_TYPE_OPTIONS}
            />

            <NumberField
              label="ราคาประเมินทรัพย์"
              value={form.estimated_value}
              onChange={v => set('estimated_value', v)}
              placeholder="เช่น 3000000"
              hint="บาท"
            />
            {estimatedNum > 0 && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 7, padding: '8px 12px', marginTop: -8, marginBottom: 14, fontSize: 12, color: '#0369a1' }}>
                วงเงินที่อนุมัติได้ ({form.loan_type_detail === 'selling_pledge' ? 'ขายฝาก' : 'จำนอง'}):&nbsp;
                <strong>{fmt(ltvLow)} – {fmt(ltvHigh)} บาท</strong>
                &nbsp;({ltvMin}–{ltvMax}% ของราคาประเมิน)
              </div>
            )}

            <NumberField
              label="วงเงินที่ลูกค้าขอ"
              value={form.desired_amount}
              onChange={v => set('desired_amount', v)}
              placeholder="เช่น 1500000"
              hint="บาท"
            />

            {actualLtvPct !== null && (
              <div style={{
                background: ltvPass ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${ltvPass ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: 8, padding: '10px 14px',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: ltvPass ? '#16a34a' : '#dc2626' }}>
                  {ltvPass ? '✓' : '✗'} LTV = {actualLtvPct}%
                  &nbsp;{ltvPass ? `ผ่านเกณฑ์ (≤${ltvMax}%)` : `เกินเกณฑ์ ${ltvMax}%`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Result Panel ──────────────────────────────────────────── */}
        <div>
          {/* Overall Result Banner */}
          <div style={{
            borderRadius: 12, padding: 20, marginBottom: 16,
            background: screenOverall === null ? '#f9fafb'
              : screenOverall === 'fail' ? '#fef2f2'
              : screenOverall === 'pass' ? '#f0fdf4'
              : '#fffbeb',
            border: `1.5px solid ${
              screenOverall === null ? '#e5e7eb'
              : screenOverall === 'fail' ? '#fca5a5'
              : screenOverall === 'pass' ? '#86efac'
              : '#fcd34d'
            }`,
          }}>
            {screenOverall === null ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>เริ่มกรอกข้อมูลด้านซ้าย</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>ระบบจะประเมินผลให้อัตโนมัติทันที</div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(filledCount / 9) * 100}%`, background: '#6366f1', borderRadius: 6, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>กรอกแล้ว {filledCount}/9 ข้อ</div>
                </div>
              </div>
            ) : screenOverall === 'fail' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 36 }}>❌</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>ไม่ผ่านเกณฑ์ SOP</div>
                    <div style={{ fontSize: 12, color: '#ef4444' }}>ทรัพย์นี้ไม่ควรดำเนินการต่อ</div>
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>สาเหตุที่ไม่ผ่าน:</div>
                  {failedChecks.map(c => (
                    <div key={c.key} style={{ fontSize: 12, color: '#dc2626', padding: '3px 0', display: 'flex', gap: 6 }}>
                      <span>✗</span><span>{c.label}: {c.failMsg}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : screenOverall === 'pass' ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>ผ่านเกณฑ์เบื้องต้น</div>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>ทรัพย์ผ่านทุกเงื่อนไข — สามารถดำเนินการต่อได้</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{ fontSize: 28 }}>⚠️</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#d97706' }}>ประเมินได้บางส่วน</div>
                    <div style={{ fontSize: 12, color: '#92400e' }}>
                      กรอกให้ครบเพื่อผลลัพธ์ที่แม่นยำ ({filledCount}/9)
                    </div>
                  </div>
                </div>
                <div style={{ height: 6, background: '#fde68a', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(filledChecks.length / screenChecks.length) * 100}%`, background: '#f59e0b', borderRadius: 6, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
          </div>

          {/* Criteria Checklist */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>
              <i className="fas fa-tasks" style={{ color: '#6366f1', marginRight: 8 }} />
              ผลประเมินรายเกณฑ์
            </div>

            {screenChecks.map(c => (
              <CriteriaRow
                key={c.key}
                label={c.label}
                pass={c.pass}
                passMsg={c.passMsg}
                failMsg={c.failMsg}
                pending={true}
              />
            ))}

            {/* Summary bar */}
            {filledChecks.length > 0 && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                  <span>ผ่าน {filledChecks.filter(c => c.pass).length} / {screenChecks.length} เกณฑ์</span>
                  <span style={{ color: failedChecks.length > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                    {failedChecks.length > 0 ? `ไม่ผ่าน ${failedChecks.length} เกณฑ์` : 'ผ่านทุกเกณฑ์ที่ตอบ'}
                  </span>
                </div>
                <div style={{ height: 8, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', width: `${(filledChecks.filter(c => c.pass).length / screenChecks.length) * 100}%`, background: '#22c55e', transition: 'width 0.3s' }} />
                  <div style={{ height: '100%', width: `${(failedChecks.length / screenChecks.length) * 100}%`, background: '#ef4444', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            {/* Note */}
            <div style={{ marginTop: 16, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
              <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
              <strong>หมายเหตุ:</strong> ฟอร์มนี้ใช้ประเมินเบื้องต้นเท่านั้น ผลการประเมินขั้นสุดท้ายขึ้นอยู่กับการตรวจสอบเอกสารจริงและการพิจารณาของฝ่ายอนุมัติ
            </div>
          </div>

          {/* Quick SOP Reference */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
              <i className="fas fa-book" style={{ color: '#6366f1', marginRight: 8 }} />
              เกณฑ์ SOP อ้างอิงด่วน
            </div>
            {[
              { icon: '📄', label: 'โฉนด', value: 'โฉนดที่ดิน (น.ส.4จ.) หรือ น.ส.4ก. เท่านั้น' },
              { icon: '🌾', label: 'ประเภท', value: 'ไม่รับที่ดินเกษตร / สวน / ไร่ / นา' },
              { icon: '🛣️', label: 'ถนน', value: 'ต้องมีทางเข้าออก กว้าง ≥ 4 เมตร' },
              { icon: '💡', label: 'สาธารณูปโภค', value: 'ต้องมีไฟฟ้าหรือประปาอย่างน้อยหนึ่งอย่าง' },
              { icon: '🌊', label: 'น้ำท่วม', value: 'ไม่รับทรัพย์ที่น้ำท่วมบ่อย' },
              { icon: '⚖️', label: 'อายัด', value: 'ไม่รับทรัพย์ที่ถูกอายัด' },
              { icon: '📊', label: 'LTV จำนอง', value: 'สูงสุด 40% ของราคาประเมิน' },
              { icon: '📊', label: 'LTV ขายฝาก', value: 'สูงสุด 60% ของราคาประเมิน' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                <span style={{ flexShrink: 0 }}>{r.icon}</span>
                <span style={{ color: '#374151', fontWeight: 600, width: 80, flexShrink: 0 }}>{r.label}</span>
                <span style={{ color: '#6b7280' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  )
}

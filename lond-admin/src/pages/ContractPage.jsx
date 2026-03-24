/**
 * ContractPage.jsx
 * Auto-generate สัญญาขายฝาก / สัญญาจำนอง จากข้อมูล OCR ในระบบ
 * เปิดในแท็บใหม่ → กด "พิมพ์ / บันทึก PDF"
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LAND_OFFICES } from '../components/LandOfficeInput'

const token = () => localStorage.getItem('loandd_admin')
const LEGAL_API = '/api/admin/legal'

// ── Thai number helpers ────────────────────────────────────────────────────────
const ONES = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const TENS = ['', 'สิบ', 'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'หกสิบ', 'เจ็ดสิบ', 'แปดสิบ', 'เก้าสิบ']
const POSITIONS = ['', 'ล้าน']
function threeDigits(n) {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10
  let s = ''
  if (h) s += ONES[h] + 'ร้อย'
  if (t === 1) s += 'สิบ'
  else if (t) s += TENS[t]
  if (o === 1 && t !== 0) s += 'เอ็ด'
  else if (o) s += ONES[o]
  return s
}
function bahtThai(amount) {
  if (!amount || isNaN(amount)) return ''
  const n = Math.round(parseFloat(amount))
  if (n === 0) return 'ศูนย์บาทถ้วน'
  let s = ''
  const millions = Math.floor(n / 1000000)
  const rest = n % 1000000
  const thousands = Math.floor(rest / 1000)
  const under = rest % 1000
  if (millions) s += threeDigits(millions) + 'ล้าน'
  if (thousands) s += threeDigits(thousands) + 'พัน'
  if (under) s += threeDigits(under)
  return s + 'บาทถ้วน'
}
function fmtMoney(v) { return v ? Number(v).toLocaleString('th-TH') : '0' }
function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt)) return ''
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}
function toDateInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt) ? '' : dt.toISOString().split('T')[0]
}

// ── Property type Thai label ───────────────────────────────────────────────────
const propTypeLabel = {
  land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', single_house: 'บ้านเดี่ยว',
  condo: 'คอนโดมิเนียม', townhouse: 'ทาวน์เฮ้าส์', shophouse: 'ตึกแถว/อาคารพาณิชย์',
}

export default function ContractPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Editable contract fields ──────────────────────────────────────────────
  const [form, setForm] = useState({
    contract_date: toDateInput(new Date()),
    contract_type: 'selling_pledge',  // selling_pledge | mortgage

    // ลูกหนี้
    debtor_name: '',
    debtor_national_id: '',
    debtor_address: '',
    debtor_phone: '',

    // นายทุน
    investor_name: '',
    investor_national_id: '',
    investor_address: '',
    investor_phone: '',

    // ทรัพย์
    deed_number: '',
    deed_type: '',
    land_area: '',
    building_area: '',
    property_address: '',
    land_office: '',

    // เงื่อนไข
    loan_amount: '',         // วงเงินกู้ (บาท)
    interest_rate: '',       // % ต่อเดือน
    contract_years: '',      // ระยะเวลา (ปี)
    advance_months: '',      // ดอกจ่ายล่วงหน้า (เดือน)
    net_amount: '',          // วงเงินที่ลูกหนี้รับไปจริง (หลังหักดอกล่วงหน้า)
    redemption_value: '',    // ค่าสินไถ่

    // บริษัท
    company_name: 'บริษัท โลน ดีดี จำกัด',
    company_address: '',
    witness1: '',
    witness2: '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // ── Computed: ค่าสินไถ่ ──────────────────────────────────────────────────
  useEffect(() => {
    const principal = parseFloat(form.loan_amount) || 0
    const rate = parseFloat(form.interest_rate) || 0
    const years = parseFloat(form.contract_years) || 0
    const advance = parseInt(form.advance_months) || 0
    const months = years * 12
    const totalInterest = principal * (rate / 100) * months
    const advancePaid = principal * (rate / 100) * advance
    const redemption = Math.round(principal + totalInterest - advancePaid)
    if (redemption > 0) set('redemption_value', redemption)
  }, [form.loan_amount, form.interest_rate, form.contract_years, form.advance_months])

  // ── Fetch case data ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${LEGAL_API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const c = d.caseData
          setCaseData(c)
          const loanAmount = c.approved_amount || c.desired_amount || ''
          const rate = c.interest_rate || ''
          const yrs = c.contract_years || ''
          const adv = c.advance_months || 0
          const principal = parseFloat(loanAmount) || 0
          const rateNum = parseFloat(rate) || 0
          const yrsNum = parseFloat(yrs) || 0
          const months = yrsNum * 12
          const totalInt = principal * (rateNum / 100) * months
          const advPaid = principal * (rateNum / 100) * adv
          const redemption = principal > 0 && rateNum > 0 ? Math.round(principal + totalInt - advPaid) : ''

          setForm(p => ({
            ...p,
            contract_type: c.loan_type_detail || 'selling_pledge',
            debtor_name: c.contact_name || '',
            debtor_phone: c.contact_phone || '',
            debtor_address: [c.house_no, c.village_name, c.subdistrict, c.district, c.province].filter(Boolean).join(' ') || c.property_address || '',
            investor_name: c.investor_name || '',
            investor_phone: c.investor_phone || '',
            deed_number: c.deed_number || '',
            deed_type: c.deed_type || '',
            land_area: c.land_area || '',
            building_area: c.building_area || '',
            property_address: c.property_address || [c.subdistrict, c.district, c.province].filter(Boolean).join(' ') || '',
            land_office: c.land_office || c.transaction_land_office || '',
            loan_amount: loanAmount,
            interest_rate: rate,
            contract_years: yrs,
            advance_months: adv,
            net_amount: c.net_desired_amount || (principal > 0 && rateNum > 0 && adv ? Math.round(principal - advPaid) : principal) || '',
            redemption_value: redemption,
          }))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print()

  const isSellingPledge = form.contract_type === 'selling_pledge'
  const contractTitle = isSellingPledge ? 'สัญญาขายฝาก' : 'สัญญาจำนอง'
  const contractColor = isSellingPledge ? '#6a1b9a' : '#1565c0'

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Sarabun, sans-serif' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: '#6a1b9a' }}></i>
      <p style={{ marginTop: 12 }}>กำลังโหลดข้อมูลเคส...</p>
    </div>
  )

  if (!caseData) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Sarabun, sans-serif' }}>
      <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#e74c3c' }}></i>
      <p>ไม่พบข้อมูลเคส</p>
      <button onClick={() => navigate(-1)} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer' }}>← กลับ</button>
    </div>
  )

  return (
    <div style={{ fontFamily: '"Sarabun", "TH Sarabun New", sans-serif', background: '#f0f0f0', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .contract-paper { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
          @page { size: A4; margin: 1.5cm; }
        }
        .field-input {
          border: none; border-bottom: 1px solid #999; background: transparent;
          font-family: inherit; font-size: inherit; width: 100%; outline: none;
          padding: 0 2px;
        }
        .field-input:focus { border-bottom-color: #6a1b9a; }
        @media print { .field-input { border-bottom: 1px dotted #999; } }
      `}</style>

      {/* ── Toolbar (no-print) ── */}
      <div className="no-print" style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#555', fontSize: 13 }}>
          <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i>กลับ
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: contractColor }}>
            <i className="fas fa-file-signature" style={{ marginRight: 8 }}></i>
            {contractTitle} — เคส {caseData.case_code}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>แก้ไขข้อมูลได้โดยตรง แล้วกดพิมพ์</div>
        </div>
        {/* ประเภทสัญญา toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { v: 'selling_pledge', label: 'ขายฝาก', color: '#6a1b9a' },
            { v: 'mortgage', label: 'จำนอง', color: '#1565c0' },
          ].map(o => (
            <button key={o.v} onClick={() => set('contract_type', o.v)} style={{
              padding: '6px 16px', borderRadius: 8, border: `2px solid ${o.color}`,
              background: form.contract_type === o.v ? o.color : '#fff',
              color: form.contract_type === o.v ? '#fff' : o.color,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {o.label}
            </button>
          ))}
        </div>
        <button onClick={handlePrint} style={{
          background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="fas fa-print"></i> พิมพ์ / บันทึก PDF
        </button>
      </div>

      {/* ── Edit panel (no-print) ── */}
      <div className="no-print" style={{
        maxWidth: 900, margin: '20px auto 0', padding: '0 20px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12
      }}>
        {[
          { k: 'debtor_name', label: 'ชื่อลูกหนี้' },
          { k: 'debtor_national_id', label: 'เลขบัตรลูกหนี้' },
          { k: 'debtor_phone', label: 'โทร.ลูกหนี้' },
          { k: 'debtor_address', label: 'ที่อยู่ลูกหนี้' },
          { k: 'investor_name', label: 'ชื่อนายทุน' },
          { k: 'investor_national_id', label: 'เลขบัตรนายทุน' },
          { k: 'investor_phone', label: 'โทร.นายทุน' },
          { k: 'investor_address', label: 'ที่อยู่นายทุน' },
          { k: 'deed_number', label: 'เลขโฉนด' },
          { k: 'land_area', label: 'เนื้อที่ดิน' },
          { k: 'building_area', label: 'พื้นที่อาคาร (ตร.ม.)' },
          { k: 'property_address', label: 'ที่ตั้งทรัพย์' },
          { k: 'land_office', label: 'สำนักงานที่ดิน' },
          { k: 'loan_amount', label: 'วงเงิน (บาท)', type: 'number' },
          { k: 'interest_rate', label: 'ดอกเบี้ย (%/เดือน)', type: 'number' },
          { k: 'contract_years', label: 'ระยะเวลา (ปี)', type: 'number' },
          { k: 'advance_months', label: 'ดอกล่วงหน้า (เดือน)', type: 'number' },
          { k: 'net_amount', label: 'วงเงินสุทธิ (รับไป)', type: 'number' },
          { k: 'redemption_value', label: 'ค่าสินไถ่ (คำนวณอัตโนมัติ)', type: 'number' },
          { k: 'contract_date', label: 'วันทำสัญญา', type: 'date' },
          { k: 'company_address', label: 'ที่อยู่บริษัท' },
          { k: 'witness1', label: 'พยาน 1' },
          { k: 'witness2', label: 'พยาน 2' },
        ].map(({ k, label, type }) => (
          <div key={k} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{label}</div>
            <input
              type={type || 'text'}
              value={form[k]}
              onChange={e => set(k, e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', color: '#1e293b' }}
            />
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTRACT PAPER (printed)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="contract-paper" style={{
        maxWidth: 794, margin: '20px auto', background: '#fff',
        padding: '48px 56px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        borderRadius: 4, fontSize: 14, lineHeight: 1.9, color: '#1a1a1a',
      }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: '#666', letterSpacing: 2 }}>สัญญาฉบับนี้ทำขึ้น ณ</div>
          <div style={{ fontSize: 11 }}>{form.company_name} {form.company_address}</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, letterSpacing: 4,
            color: contractColor, borderBottom: `3px solid ${contractColor}`,
            display: 'inline-block', paddingBottom: 4, marginBottom: 6
          }}>
            {contractTitle}
          </div>
          <div style={{ fontSize: 12, color: '#555' }}>
            วันที่{' '}
            <input className="field-input no-print" type="date" value={form.contract_date} onChange={e => set('contract_date', e.target.value)} style={{ width: 140 }} />
            <span className="print-only">{fmtDate(form.contract_date)}</span>
          </div>
        </div>

        {/* ── ฝ่าย ── */}
        <Section title="ผู้ขายฝาก / ผู้จำนอง" color={contractColor} icon="fa-user">
          <Row label="ชื่อ - นามสกุล"><EditField k="debtor_name" form={form} set={set} bold /></Row>
          <Row label="เลขประจำตัวประชาชน"><EditField k="debtor_national_id" form={form} set={set} ph="กรอกเลขบัตร 13 หลัก" /></Row>
          <Row label="ที่อยู่"><EditField k="debtor_address" form={form} set={set} /></Row>
          <Row label="เบอร์โทรศัพท์"><EditField k="debtor_phone" form={form} set={set} /></Row>
        </Section>

        <Section title={isSellingPledge ? 'ผู้ซื้อฝาก (นายทุน)' : 'ผู้รับจำนอง (นายทุน)'} color={contractColor} icon="fa-landmark">
          <Row label="ชื่อ - นามสกุล"><EditField k="investor_name" form={form} set={set} bold ph="กรอกชื่อนายทุน" /></Row>
          <Row label="เลขประจำตัวประชาชน"><EditField k="investor_national_id" form={form} set={set} ph="กรอกเลขบัตร 13 หลัก" /></Row>
          <Row label="ที่อยู่"><EditField k="investor_address" form={form} set={set} /></Row>
          <Row label="เบอร์โทรศัพท์"><EditField k="investor_phone" form={form} set={set} /></Row>
        </Section>

        {/* ── ทรัพย์ ── */}
        <Section title="รายละเอียดทรัพย์" color={contractColor} icon="fa-home">
          <Row label="ประเภทอสังหาริมทรัพย์">
            {propTypeLabel[caseData.property_type] || caseData.property_type || '—'}
          </Row>
          <Row label="เลขที่โฉนด / ประเภทเอกสาร">
            <EditField k="deed_number" form={form} set={set} bold ph="เลขโฉนด" />{' '}
            {form.deed_type && <span style={{ color: '#555' }}>({form.deed_type})</span>}
          </Row>
          <Row label="ที่ตั้งทรัพย์"><EditField k="property_address" form={form} set={set} /></Row>
          <Row label="เนื้อที่ดิน"><EditField k="land_area" form={form} set={set} ph="เช่น 50 ตร.ว." /></Row>
          {form.building_area && <Row label="พื้นที่อาคาร"><EditField k="building_area" form={form} set={set} ph="ตร.ม." /></Row>}
          <Row label="สำนักงานที่ดิน"><EditField k="land_office" form={form} set={set} ph="สำนักงานที่ดิน..." /></Row>
        </Section>

        {/* ── เงื่อนไข ── */}
        <Section title="เงื่อนไขและข้อตกลง" color={contractColor} icon="fa-handshake">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 4 }}>
            <tbody>
              {[
                ['วงเงิน' + (isSellingPledge ? 'ขายฝาก' : 'จำนอง'), form.loan_amount ? `${fmtMoney(form.loan_amount)} บาท (${bahtThai(form.loan_amount)})` : '—', 'loan_amount'],
                ['อัตราดอกเบี้ย', form.interest_rate ? `${form.interest_rate}% ต่อเดือน (${(parseFloat(form.interest_rate) * 12).toFixed(1)}% ต่อปี)` : '—', null],
                ['ระยะเวลาสัญญา', form.contract_years ? `${form.contract_years} ปี (${Math.round(parseFloat(form.contract_years || 0) * 12)} เดือน)` : '—', null],
                ['ดอกเบี้ยจ่ายล่วงหน้า', form.advance_months ? `${form.advance_months} เดือน` : '—', null],
                ['วงเงินที่ผู้ขายฝากได้รับ', form.net_amount ? `${fmtMoney(form.net_amount)} บาท (${bahtThai(form.net_amount)})` : '—', null],
              ].map(([label, val], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '7px 12px', width: '40%', color: '#555', borderBottom: '1px solid #eee', fontWeight: 600 }}>{label}</td>
                  <td style={{ padding: '7px 12px', borderBottom: '1px solid #eee', fontWeight: 700, color: contractColor }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* ── ค่าสินไถ่ (ขายฝากเท่านั้น) ── */}
        {isSellingPledge && (
          <div style={{
            background: '#f3e5f5', border: `2px solid ${contractColor}`,
            borderRadius: 8, padding: '14px 18px', margin: '16px 0',
          }}>
            <div style={{ fontWeight: 700, color: contractColor, fontSize: 15, marginBottom: 6 }}>
              <i className="fas fa-calculator" style={{ marginRight: 8 }}></i>
              ค่าสินไถ่ (ราคาไถ่คืน)
            </div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {form.redemption_value ? (
                <>
                  <span style={{ fontSize: 20, color: contractColor }}>{fmtMoney(form.redemption_value)}</span> บาท
                  <span style={{ fontSize: 12, color: '#7b1fa2', marginLeft: 12 }}>({bahtThai(form.redemption_value)})</span>
                </>
              ) : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#7b1fa2', marginTop: 4 }}>
              = วงเงิน + ดอกเบี้ยรวม − ดอกเบี้ยที่จ่ายล่วงหน้าไปแล้ว
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              ผู้ขายฝากมีสิทธิ์ไถ่ทรัพย์คืนได้ ภายในระยะเวลาสัญญา {form.contract_years || '—'} ปี
              นับตั้งแต่วันทำสัญญา
            </div>
          </div>
        )}

        {/* ── สัญญาจำนอง เพิ่มเติม ── */}
        {!isSellingPledge && (
          <div style={{
            background: '#e3f2fd', border: `2px solid #1565c0`,
            borderRadius: 8, padding: '12px 18px', margin: '16px 0',
            fontSize: 13, color: '#0d47a1',
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>เงื่อนไขจำนอง
            </div>
            ผู้จำนองตกลงนำทรัพย์ดังกล่าวมาจำนองเป็นประกันการชำระหนี้ตามวงเงินที่ระบุ
            โดยยังคงครอบครองทรัพย์ได้ ผู้รับจำนองมีสิทธิ์บังคับจำนองได้หากผิดนัดชำระ
          </div>
        )}

        {/* ── Signature block ── */}
        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <SignBlock
            title={isSellingPledge ? 'ผู้ขายฝาก' : 'ผู้จำนอง'}
            name={form.debtor_name}
            label="ลงนาม"
          />
          <SignBlock
            title={isSellingPledge ? 'ผู้ซื้อฝาก' : 'ผู้รับจำนอง'}
            name={form.investor_name || '...............................................'}
            label="ลงนาม"
          />
        </div>
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <SignBlock
            title="พยาน"
            name={<input className="field-input" value={form.witness1} onChange={e => set('witness1', e.target.value)} placeholder="ชื่อพยาน" />}
            label="ลงนาม"
          />
          <SignBlock
            title="พยาน"
            name={<input className="field-input" value={form.witness2} onChange={e => set('witness2', e.target.value)} placeholder="ชื่อพยาน" />}
            label="ลงนาม"
          />
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 32, borderTop: '1px solid #ddd', paddingTop: 12, fontSize: 11, color: '#888', textAlign: 'center' }}>
          สัญญาฉบับนี้ทำขึ้น 2 ฉบับ มีข้อความตรงกัน คู่สัญญาแต่ละฝ่ายยึดถือไว้ฝ่ายละ 1 ฉบับ
          <br />สร้างโดยระบบ {form.company_name} · เคส {caseData.case_code}
        </div>
      </div>

      <div className="no-print" style={{ height: 40 }} />
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────
function Section({ title, color, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        background: color, color: '#fff', padding: '6px 14px', borderRadius: '6px 6px 0 0',
        fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className={`fas ${icon}`}></i>{title}
      </div>
      <div style={{ border: `1px solid ${color}`, borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '10px 14px' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '3px 0', borderBottom: '1px dotted #eee' }}>
      <span style={{ minWidth: 180, color: '#555', fontSize: 13, flexShrink: 0 }}>{label}:</span>
      <span style={{ flex: 1, fontWeight: 500 }}>{children}</span>
    </div>
  )
}

function EditField({ k, form, set, bold, ph }) {
  const isLandOffice = k === 'land_office'
  return (
    <>
      <input
        className="field-input"
        list={isLandOffice ? 'contract-land-office-list' : undefined}
        value={form[k] || ''}
        onChange={e => set(k, e.target.value)}
        placeholder={ph || ''}
        style={{ fontWeight: bold ? 700 : 500 }}
        autoComplete={isLandOffice ? 'off' : undefined}
      />
      {isLandOffice && (
        <datalist id="contract-land-office-list">
          {LAND_OFFICES.map((name, i) => <option key={`${name}-${i}`} value={name} />)}
        </datalist>
      )}
    </>
  )
}

function SignBlock({ title, name, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#555' }}>{title}</div>
      <div style={{ borderBottom: '1px solid #333', minWidth: 180, height: 48, margin: '0 auto 4px' }}></div>
      <div style={{ fontSize: 12, color: '#555' }}>({name || '....................................'})</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</div>
    </div>
  )
}

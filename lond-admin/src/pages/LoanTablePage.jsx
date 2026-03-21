import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'
import logoImg from '../pic/loand.png'

const fmt = (n) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function LoanTablePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentUser = getCurrentUser() || {}
  const dept = currentUser.department
  const canEdit = dept === 'approval' || dept === 'super_admin' // เฉพาะฝ่ายอนุมัติสินเชื่อ + ซุปเปอร์แอดมิน

  const mortgageRef = useRef()
  const pledgeRef = useRef()
  const [h2cReady, setH2cReady] = useState(false)
  const [dlMortgage, setDlMortgage] = useState(false)
  const [dlPledge, setDlPledge] = useState(false)

  // โหลด html2canvas จาก CDN
  useEffect(() => {
    if (window.html2canvas) { setH2cReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    script.onload = () => setH2cReady(true)
    document.head.appendChild(script)
  }, [])

  const backId = searchParams.get('back_id') || ''

  const [form, setForm] = useState({
    case_code: searchParams.get('case_code') || searchParams.get('debtor_code') || '',
    loan_amount: searchParams.get('loan_amount') || '',
    interest_rate: '15',
    fee_rate: '5',
    // จำนอง
    mortgage_months: '12',
    mortgage_tax: '1',
    // ขายฝาก
    pledge_months: '6',
    pledge_tax: '6.3',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const amount = parseFloat(form.loan_amount) || 0
  const annualRate = parseFloat(form.interest_rate) || 0
  const feeRate = parseFloat(form.fee_rate) || 0
  const monthlyRateDecimal = annualRate / 100 / 12
  const monthlyInterest = Math.round(amount * monthlyRateDecimal)
  const fee = Math.round(amount * (feeRate / 100))
  const ready = amount > 0 && annualRate > 0

  // จำนอง
  const mMonths = parseFloat(form.mortgage_months) || 0
  const mTax = parseFloat(form.mortgage_tax) || 0
  const mTaxAmt = Math.round(amount * (mTax / 100))
  const mAdvance = monthlyInterest * mMonths
  const mRemaining = amount - fee - mTaxAmt - mAdvance

  // ขายฝาก
  const pMonths = parseFloat(form.pledge_months) || 0
  const pTax = parseFloat(form.pledge_tax) || 0
  const pTaxAmt = Math.round(amount * (pTax / 100))
  const pAdvance = monthlyInterest * pMonths
  const pRemaining = amount - fee - pTaxAmt - pAdvance

  // ดาวน์โหลดรูป
  const downloadTable = async (ref, filename, setLoading) => {
    if (!window.html2canvas || !ref.current) return
    setLoading(true)
    try {
      const canvas = await window.html2canvas(ref.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '24px' }}>
      {/* ปุ่มกลับ */}
      <div className="no-print" style={{ marginBottom: 20 }}>
        <button onClick={() => backId ? navigate(`/approval/edit/${backId}`) : navigate(-1)} style={{
          background: 'none', border: '1px solid #ccc', borderRadius: 8,
          padding: '8px 16px', cursor: 'pointer', color: '#555', fontSize: 14,
        }}>← กลับ{backId ? 'ฟอร์มอนุมัติ' : ''}</button>
      </div>

      {/* View-only banner */}
      {!canEdit && (
        <div className="no-print" style={{
          background: '#fff8e1', border: '1.5px solid #ffc107', borderRadius: 10,
          padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#856404',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <i className="fas fa-eye" style={{ fontSize: 18 }}></i>
          <div>
            <div style={{ fontWeight: 700 }}>โหมดดูอย่างเดียว</div>
            <div style={{ marginTop: 2, opacity: 0.85 }}>ฝ่ายอนุมัติสินเชื่อเป็นผู้จัดทำตารางวงเงิน</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ---- FORM (เฉพาะฝ่ายอนุมัติ) ---- */}
        <div className="no-print" style={{
          background: '#fff', borderRadius: 12, padding: 28,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', flex: '0 0 320px',
          display: canEdit ? 'block' : 'none',
        }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 17, color: '#1a3a1a', fontWeight: 700 }}>
            กรอกข้อมูลวงเงิน
          </h2>

          {/* Shared fields */}
          {[
            { label: 'รหัสลูกหนี้/เคส', name: 'case_code', type: 'text', placeholder: 'เช่น DB-0001 หรือ LD-2025-001' },
            { label: 'วงเงินอนุมัติ (บาท)', name: 'loan_amount', type: 'number', placeholder: 'เช่น 1300000' },
            { label: 'ดอกเบี้ย % ต่อปี', name: 'interest_rate', type: 'number', placeholder: '15' },
            { label: 'ค่าดำเนินการ %', name: 'fee_rate', type: 'number', placeholder: '5' },
          ].map(({ label, name, type, placeholder }) => (
            <div key={name} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 5, fontWeight: 600 }}>{label}</label>
              <input type={type} name={name} value={form[name]} onChange={e => set(name, e.target.value)}
                placeholder={placeholder} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          ))}

          <div style={{ borderTop: '1.5px solid #e8eaf6', margin: '16px 0 14px', paddingTop: 14 }}>
            {/* จำนอง inputs */}
            <div style={{ background: '#fffde7', borderRadius: 8, padding: '12px 14px', marginBottom: 14, border: '1px solid #ffe082' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#b8860b', marginBottom: 10 }}>
                <i className="fas fa-landmark" style={{ marginRight: 6 }}></i>ตารางจำนอง
              </div>
              {[
                { label: 'ชำระล่วงหน้า (เดือน)', name: 'mortgage_months', placeholder: '12' },
                { label: 'ค่าภาษีกรมที่ดิน %', name: 'mortgage_tax', placeholder: '1' },
              ].map(({ label, name, placeholder }) => (
                <div key={name} style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#856404', marginBottom: 4, fontWeight: 600 }}>{label}</label>
                  <input type="number" name={name} value={form[name]} onChange={e => set(name, e.target.value)}
                    placeholder={placeholder} style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #ffe082', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            {/* ขายฝาก inputs */}
            <div style={{ background: '#f1f8e9', borderRadius: 8, padding: '12px 14px', border: '1px solid #aed581' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2e7d32', marginBottom: 10 }}>
                <i className="fas fa-home" style={{ marginRight: 6 }}></i>ตารางขายฝาก
              </div>
              {[
                { label: 'ชำระล่วงหน้า (เดือน)', name: 'pledge_months', placeholder: '6' },
                { label: 'ค่าภาษีกรมที่ดิน %', name: 'pledge_tax', placeholder: '6.3' },
              ].map(({ label, name, placeholder }) => (
                <div key={name} style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#1b5e20', marginBottom: 4, fontWeight: 600 }}>{label}</label>
                  <input type="number" name={name} value={form[name]} onChange={e => set(name, e.target.value)}
                    placeholder={placeholder} style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #aed581', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          </div>

          {!ready && (
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 4 }}>
              กรอกวงเงินและดอกเบี้ยก่อน
            </p>
          )}

          {/* ปุ่ม Print */}
          <button onClick={() => window.print()} disabled={!ready} style={{
            width: '100%', padding: '11px', borderRadius: 8, border: 'none',
            background: ready ? '#2d6a2d' : '#ccc', color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed', marginTop: 10,
          }}>🖨️ พิมพ์ / บันทึก PDF (2 ตาราง)</button>

          <div style={{ borderTop: '1.5px solid #e8eaf6', margin: '16px 0 0' }} />

          {/* Download จำนอง */}
          <button onClick={() => downloadTable(mortgageRef, `ตารางจำนอง-${form.case_code || 'LoanDD'}.png`, setDlMortgage)}
            disabled={!ready || !h2cReady || dlMortgage} style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none',
              background: ready && h2cReady ? '#b8860b' : '#ccc', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: ready && h2cReady ? 'pointer' : 'not-allowed', marginTop: 10,
            }}>
            {dlMortgage ? '⏳ กำลังสร้าง...' : '📷 ดาวน์โหลดตารางจำนอง'}
          </button>

          {/* Download ขายฝาก */}
          <button onClick={() => downloadTable(pledgeRef, `ตารางขายฝาก-${form.case_code || 'LoanDD'}.png`, setDlPledge)}
            disabled={!ready || !h2cReady || dlPledge} style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none',
              background: ready && h2cReady ? '#2e7d32' : '#ccc', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: ready && h2cReady ? 'pointer' : 'not-allowed', marginTop: 8,
            }}>
            {dlPledge ? '⏳ กำลังสร้าง...' : '📷 ดาวน์โหลดตารางขายฝาก'}
          </button>

        </div>

        {/* ---- ตาราง 2 อัน ---- */}
        <div style={{ flex: '1 1 600px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>

          {/* ตาราง จำนอง */}
          <div ref={mortgageRef} style={{
            background: '#fff', borderRadius: 12, padding: '40px 48px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)', flex: '1 1 440px', maxWidth: 640,
          }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <img src={logoImg} alt="LOAN DD" style={{ height: 70, objectFit: 'contain' }}
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
              <div style={{ display: 'none', fontSize: 32, fontWeight: 900, letterSpacing: 2 }}>
                <span style={{ color: '#1a3a1a' }}>LOAN</span><span style={{ color: '#c8a020' }}> DD</span>
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#b8860b', color: '#fff', padding: '14px 20px', borderRadius: '8px 8px 0 0',
            }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>รายละเอียดค่าใช้จ่ายการจำนอง (ประมาณการเบื้องต้น)</span>
              <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', marginLeft: 16 }}>
                รหัสเคส : {form.case_code || '...'}
              </span>
            </div>
            {[
              { label: `วงเงินอนุมัติยอดจำนอง  ดอกเบี้ย ${annualRate || '—'}% ต่อปี`, rate: null, value: amount, bold: true },
              { label: 'ดอกเบี้ยต่อเดือน', rate: `${annualRate ? (annualRate / 12).toFixed(2) : '—'}%`, rateRed: true, value: monthlyInterest },
              { label: 'ค่าดำเนินการ', rate: `${feeRate}%`, value: fee },
              { label: 'ค่าประมาณการค่าภาษีกรมที่ดิน', rate: `${mTax}%`, value: mTaxAmt },
              { label: 'ชำระดอกเบี้ยล่วงหน้า', rate: mMonths ? String(mMonths) : '—', rateRed: true, value: mAdvance },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '15px 20px', borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fafafa' : '#fff',
              }}>
                <span style={{ fontSize: 15, fontWeight: row.bold ? 700 : 400, flex: 1, color: '#222' }}>{row.label}</span>
                {row.rate !== null && (
                  <span style={{ fontSize: 15, fontWeight: 600, minWidth: 70, textAlign: 'center', color: row.rateRed ? '#c0392b' : '#444' }}>{row.rate}</span>
                )}
                <span style={{ fontSize: 15, fontWeight: row.bold ? 700 : 400, minWidth: 110, textAlign: 'right', color: '#1a1a1a' }}>
                  {ready ? fmt(row.value) : '—'}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderRadius: '0 0 8px 8px', background: '#fff', borderTop: '2px solid #eee' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#c0392b' }}>วงเงินคงเหลือ</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#c0392b' }}>{ready ? fmt(mRemaining) : '—'}</span>
            </div>
            <p style={{ fontSize: 12, color: '#999', marginTop: 20, textAlign: 'center' }}>
              * ตัวเลขนี้เป็นประมาณการเบื้องต้นเท่านั้น อาจมีการเปลี่ยนแปลง
            </p>
          </div>

          {/* ตาราง ขายฝาก */}
          <div ref={pledgeRef} style={{
            background: '#fff', borderRadius: 12, padding: '40px 48px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)', flex: '1 1 440px', maxWidth: 640,
          }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <img src={logoImg} alt="LOAN DD" style={{ height: 70, objectFit: 'contain' }}
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
              <div style={{ display: 'none', fontSize: 32, fontWeight: 900, letterSpacing: 2 }}>
                <span style={{ color: '#1a3a1a' }}>LOAN</span><span style={{ color: '#c8a020' }}> DD</span>
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#2e7d32', color: '#fff', padding: '14px 20px', borderRadius: '8px 8px 0 0',
            }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>รายละเอียดค่าใช้จ่ายการขายฝาก (ประมาณการเบื้องต้น)</span>
              <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', marginLeft: 16 }}>
                รหัสเคส : {form.case_code || '...'}
              </span>
            </div>
            {[
              { label: `วงเงินอนุมัติยอดขายฝาก  ดอกเบี้ย ${annualRate || '—'}% ต่อปี`, rate: null, value: amount, bold: true },
              { label: 'ดอกเบี้ยต่อเดือน', rate: `${annualRate ? (annualRate / 12).toFixed(2) : '—'}%`, rateRed: true, value: monthlyInterest },
              { label: 'ค่าดำเนินการ', rate: `${feeRate}%`, value: fee },
              { label: 'ค่าประมาณการค่าภาษีกรมที่ดิน', rate: `${pTax}%`, value: pTaxAmt },
              { label: 'ชำระดอกเบี้ยล่วงหน้า', rate: pMonths ? String(pMonths) : '—', rateRed: true, value: pAdvance },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '15px 20px', borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fafafa' : '#fff',
              }}>
                <span style={{ fontSize: 15, fontWeight: row.bold ? 700 : 400, flex: 1, color: '#222' }}>{row.label}</span>
                {row.rate !== null && (
                  <span style={{ fontSize: 15, fontWeight: 600, minWidth: 70, textAlign: 'center', color: row.rateRed ? '#c0392b' : '#444' }}>{row.rate}</span>
                )}
                <span style={{ fontSize: 15, fontWeight: row.bold ? 700 : 400, minWidth: 110, textAlign: 'right', color: '#1a1a1a' }}>
                  {ready ? fmt(row.value) : '—'}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderRadius: '0 0 8px 8px', background: '#fff', borderTop: '2px solid #eee' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#c0392b' }}>วงเงินคงเหลือ</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#c0392b' }}>{ready ? fmt(pRemaining) : '—'}</span>
            </div>
            <p style={{ fontSize: 12, color: '#999', marginTop: 20, textAlign: 'center' }}>
              * ตัวเลขนี้เป็นประมาณการเบื้องต้นเท่านั้น อาจมีการเปลี่ยนแปลง
            </p>
          </div>

        </div>
      </div>

      {/* CSS print */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
          div[style*="min-height: 100vh"] { padding: 0 !important; background: #fff !important; }
        }
        @page { margin: 10mm; }
      `}</style>
    </div>
  )
}

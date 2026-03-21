import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'
import logoImg from '../pic/loand.png'

const fmt = (n) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtDate = (baseDate, addMonths) => {
  const d = new Date(baseDate)
  d.setMonth(d.getMonth() + addMonths)
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function PaymentSchedulePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentUser = getCurrentUser() || {}
  const dept = currentUser.department
  const canEdit = dept === 'approval' || dept === 'sales' || dept === 'super_admin'

  const mortgageRef = useRef()
  const pledgeRef = useRef()
  const [h2cReady, setH2cReady] = useState(false)
  const [dlMortgage, setDlMortgage] = useState(false)
  const [dlPledge, setDlPledge] = useState(false)

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
    customer_name: searchParams.get('customer_name') || '',
    loan_amount: searchParams.get('loan_amount') || '',
    interest_rate: '15',
    // จำนอง
    mortgage_months: '12',
    mortgage_start: new Date().toISOString().slice(0, 10),
    // ขายฝาก
    pledge_months: '6',
    pledge_start: new Date().toISOString().slice(0, 10),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const amount = parseFloat(form.loan_amount) || 0
  const annualRate = parseFloat(form.interest_rate) || 0
  const monthlyRate = annualRate / 100 / 12
  const monthlyInterest = Math.round(amount * monthlyRate)
  const ready = amount > 0 && annualRate > 0

  // สร้าง rows ตารางผ่อน
  const buildSchedule = (months, startDate) => {
    const rows = []
    let totalPaid = 0
    for (let i = 1; i <= months; i++) {
      totalPaid += monthlyInterest
      rows.push({
        month: i,
        dueDate: fmtDate(startDate, i),
        interest: monthlyInterest,
        totalPaid,
        remaining: amount, // interest-only loan: principal unchanged
      })
    }
    return rows
  }

  const mSchedule = buildSchedule(
    parseInt(form.mortgage_months) || 0,
    form.mortgage_start
  )
  const pSchedule = buildSchedule(
    parseInt(form.pledge_months) || 0,
    form.pledge_start
  )

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

  const ScheduleTable = ({ scheduleRows, type, startDate, accentColor, headerBg, tableRef }) => (
    <div ref={tableRef} style={{
      background: '#fff', borderRadius: 12, padding: '36px 40px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)', flex: '1 1 420px', maxWidth: 600,
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src={logoImg} alt="LOAN DD" style={{ height: 60, objectFit: 'contain' }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
        <div style={{ display: 'none', fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>
          <span style={{ color: '#1a3a1a' }}>LOAN</span><span style={{ color: '#c8a020' }}> DD</span>
        </div>
      </div>

      {/* Header */}
      <div style={{
        background: headerBg, color: '#fff', padding: '12px 18px',
        borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            ตารางผ่อนชำระดอกเบี้ย{type === 'mortgage' ? 'จำนอง' : 'ขายฝาก'}
          </div>
          {form.customer_name && (
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>ชื่อลูกหนี้: {form.customer_name}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          <div>รหัสเคส: <b>{form.case_code || '—'}</b></div>
          <div style={{ marginTop: 2 }}>วงเงิน: <b>{ready ? fmt(amount) : '—'} บาท</b></div>
        </div>
      </div>

      {/* Summary row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', background: '#f8f9fa',
        padding: '10px 18px', borderBottom: '2px solid #eee', fontSize: 13,
      }}>
        <span>ดอกเบี้ย <b style={{ color: accentColor }}>{annualRate}% ต่อปี</b></span>
        <span>ดอกเบี้ย/เดือน <b style={{ color: accentColor }}>{ready ? fmt(monthlyInterest) : '—'} บาท</b></span>
        <span>ระยะเวลา <b>{scheduleRows.length} เดือน</b></span>
      </div>

      {/* Table */}
      {ready && scheduleRows.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1.5px solid #ddd', fontWeight: 700, color: '#374151', width: 48 }}>งวด</th>
              <th style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1.5px solid #ddd', fontWeight: 700, color: '#374151' }}>ครบกำหนด</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1.5px solid #ddd', fontWeight: 700, color: '#374151' }}>ดอกเบี้ย (บาท)</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1.5px solid #ddd', fontWeight: 700, color: '#374151' }}>รวมจ่ายสะสม</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', borderBottom: '1.5px solid #ddd', fontWeight: 700, color: '#374151' }}>เงินต้นคงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {scheduleRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', color: '#555' }}>{row.month}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', color: '#374151', fontWeight: 500 }}>{row.dueDate}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', color: accentColor, fontWeight: 600 }}>{fmt(row.interest)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', color: '#374151' }}>{fmt(row.totalPaid)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', color: '#111', fontWeight: 600 }}>{fmt(row.remaining)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f1f5f9', borderTop: '2px solid #ddd' }}>
              <td colSpan={2} style={{ padding: '10px 10px', fontWeight: 700, fontSize: 13, color: '#374151' }}>รวมดอกเบี้ยตลอดสัญญา</td>
              <td colSpan={2} style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#dc2626' }}>
                {fmt(monthlyInterest * scheduleRows.length)} บาท
              </td>
              <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>
                {fmt(amount)} บาท
              </td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <div style={{ padding: '32px 18px', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
          {!ready ? 'กรอกวงเงินและดอกเบี้ยก่อน' : 'ระบุจำนวนเดือน'}
        </div>
      )}

      <p style={{ fontSize: 11, color: '#aaa', marginTop: 16, textAlign: 'center' }}>
        * ตัวเลขนี้เป็นประมาณการเบื้องต้นเท่านั้น เงินต้นชำระคืนเมื่อครบกำหนดสัญญา
      </p>
    </div>
  )

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
            <div style={{ marginTop: 2, opacity: 0.85 }}>ฝ่ายอนุมัติสินเชื่อเป็นผู้จัดทำตารางผ่อน</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ---- FORM ---- */}
        <div className="no-print" style={{
          background: '#fff', borderRadius: 12, padding: 28,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', flex: '0 0 300px',
          display: canEdit ? 'block' : 'none',
        }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 17, color: '#1a3a1a', fontWeight: 700 }}>
            กรอกข้อมูลตารางผ่อน
          </h2>

          {[
            { label: 'รหัสลูกหนี้/เคส', name: 'case_code', type: 'text', placeholder: 'LDD-0001' },
            { label: 'ชื่อลูกหนี้', name: 'customer_name', type: 'text', placeholder: 'ชื่อ-นามสกุล' },
            { label: 'วงเงินอนุมัติ (บาท)', name: 'loan_amount', type: 'number', placeholder: '1300000' },
            { label: 'ดอกเบี้ย % ต่อปี', name: 'interest_rate', type: 'number', placeholder: '15' },
          ].map(({ label, name, type, placeholder }) => (
            <div key={name} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#555', marginBottom: 5, fontWeight: 600 }}>{label}</label>
              <input type={type} value={form[name]} onChange={e => set(name, e.target.value)}
                placeholder={placeholder} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          ))}

          <div style={{ borderTop: '1.5px solid #e8eaf6', margin: '16px 0 14px', paddingTop: 14 }}>

            {/* จำนอง section */}
            <div style={{ background: '#fffde7', borderRadius: 8, padding: '12px 14px', marginBottom: 14, border: '1px solid #ffe082' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#b8860b', marginBottom: 10 }}>
                <i className="fas fa-landmark" style={{ marginRight: 6 }}></i>ตารางผ่อน — จำนอง
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#856404', marginBottom: 4, fontWeight: 600 }}>จำนวนเดือน</label>
                <input type="number" value={form.mortgage_months} onChange={e => set('mortgage_months', e.target.value)}
                  placeholder="12" style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #ffe082', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#856404', marginBottom: 4, fontWeight: 600 }}>วันที่เริ่มต้นสัญญา</label>
                <input type="date" value={form.mortgage_start} onChange={e => set('mortgage_start', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #ffe082', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* ขายฝาก section */}
            <div style={{ background: '#f1f8e9', borderRadius: 8, padding: '12px 14px', border: '1px solid #aed581' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2e7d32', marginBottom: 10 }}>
                <i className="fas fa-home" style={{ marginRight: 6 }}></i>ตารางผ่อน — ขายฝาก
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#1b5e20', marginBottom: 4, fontWeight: 600 }}>จำนวนเดือน</label>
                <input type="number" value={form.pledge_months} onChange={e => set('pledge_months', e.target.value)}
                  placeholder="6" style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #aed581', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#1b5e20', marginBottom: 4, fontWeight: 600 }}>วันที่เริ่มต้นสัญญา</label>
                <input type="date" value={form.pledge_start} onChange={e => set('pledge_start', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #aed581', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {!ready && (
            <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 4 }}>กรอกวงเงินและดอกเบี้ยก่อน</p>
          )}

          {/* ปุ่ม Print */}
          <button onClick={() => window.print()} disabled={!ready} style={{
            width: '100%', padding: '11px', borderRadius: 8, border: 'none',
            background: ready ? '#2d6a2d' : '#ccc', color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed', marginTop: 10,
          }}>🖨️ พิมพ์ / บันทึก PDF</button>

          <div style={{ borderTop: '1.5px solid #e8eaf6', margin: '12px 0 0' }} />

          <button onClick={() => downloadTable(mortgageRef, `ตารางผ่อนจำนอง-${form.case_code || 'LoanDD'}.png`, setDlMortgage)}
            disabled={!ready || !h2cReady || dlMortgage} style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none',
              background: ready && h2cReady ? '#b8860b' : '#ccc', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: ready && h2cReady ? 'pointer' : 'not-allowed', marginTop: 10,
            }}>
            {dlMortgage ? '⏳ กำลังสร้าง...' : '📷 ดาวน์โหลดตารางจำนอง'}
          </button>

          <button onClick={() => downloadTable(pledgeRef, `ตารางผ่อนขายฝาก-${form.case_code || 'LoanDD'}.png`, setDlPledge)}
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
          <ScheduleTable
            scheduleRows={mSchedule}
            type="mortgage"
            startDate={form.mortgage_start}
            accentColor="#b8860b"
            headerBg="#b8860b"
            tableRef={mortgageRef}
          />
          <ScheduleTable
            scheduleRows={pSchedule}
            type="pledge"
            startDate={form.pledge_start}
            accentColor="#2e7d32"
            headerBg="#2e7d32"
            tableRef={pledgeRef}
          />
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
          div[style*="min-height: 100vh"] { padding: 0 !important; background: #fff !important; }
        }
        @page { margin: 10mm; size: landscape; }
      `}</style>
    </div>
  )
}

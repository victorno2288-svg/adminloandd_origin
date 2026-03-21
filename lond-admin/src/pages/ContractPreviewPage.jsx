/**
 * ContractPreviewPage — หน้าสร้างสัญญาสำหรับพิมพ์ PDF
 * เปิดจาก IssuingEditPage ด้วย window.open('/issuing/contract/:id', '_blank')
 * รองรับสัญญาขายฝาก (selling_pledge) และจำนอง (mortgage)
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/issuing'

function fmt(n) {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
}

function fmtDate(d) {
  if (!d) return '............'
  return new Date(d).toLocaleDateString('th-TH', {
    day: '2-digit', month: 'long', year: 'numeric',
    calendar: 'buddhist'
  })
}

function fmtDateBE(d) {
  if (!d) return '............'
  const dt = new Date(d)
  const day = dt.getDate().toString().padStart(2, '0')
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  const month = months[dt.getMonth()]
  const year = dt.getFullYear() + 543
  return `${day} ${month} ${year}`
}

function Blank({ w = 120 }) {
  return <span style={{ display: 'inline-block', borderBottom: '1px solid #000', minWidth: w, margin: '0 4px' }}>&nbsp;</span>
}

export default function ContractPreviewPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.caseData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'serif' }}>
      กำลังโหลดข้อมูลสัญญา...
    </div>
  )

  if (!data) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'serif', color: '#c00' }}>
      ไม่พบข้อมูลเคส
    </div>
  )

  const isSelling = data.approval_type === 'selling_pledge'
  const contractType = isSelling ? 'สัญญาขายฝาก' : 'สัญญาจำนอง'
  const today = fmtDateBE(new Date())
  const creditAmt = fmt(data.approved_credit)
  const interestPerMonth = data.interest_per_month ? `${data.interest_per_month}%` : '............'
  const interestPerYear = data.interest_per_year ? `${data.interest_per_year}%` : '............'
  const opFee = fmt(data.operation_fee)
  const landTax = fmt(data.land_tax_estimate)

  const debtorName = data.contact_name || '............................................'
  const debtorPhone = data.contact_phone || '............'
  const debtorIdCard = data.borrower_id_card_number || '............................................'
  const propertyAddress = data.property_address || `${data.subdistrict || ''}  ${data.district || ''}  ${data.province || ''}`
  const deedNumber = data.deed_number || '............'
  const landArea = data.land_area ? `${data.land_area} ตร.วา` : '............'
  const agentName = data.agent_name || '............................................'
  const agentCode = data.agent_code || '............'
  const officerName = data.officer_name || '............................................'
  const landOffice = data.land_office || '............................................'

  const s = {
    page: {
      fontFamily: '"Sarabun", "TH Sarabun New", "Tahoma", sans-serif',
      fontSize: 15,
      color: '#000',
      background: '#fff',
      padding: '40px 60px',
      maxWidth: 800,
      margin: '0 auto',
      lineHeight: 1.8,
    },
    h1: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    h2: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 24 },
    section: { marginBottom: 20 },
    row: { display: 'flex', gap: 8, marginBottom: 6, alignItems: 'baseline' },
    label: { minWidth: 200, fontWeight: 'bold', flexShrink: 0 },
    divider: { borderTop: '1px solid #000', margin: '20px 0' },
    signBox: {
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 40
    },
    sigLine: { textAlign: 'center', paddingTop: 40, borderTop: '1px solid #555', marginTop: 40 },
    printBtn: {
      position: 'fixed', top: 16, right: 16,
      background: '#dc2626', color: '#fff', border: 'none',
      borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700,
      cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
      display: 'flex', alignItems: 'center', gap: 6,
      zIndex: 9999
    }
  }

  return (
    <div>
      {/* ปุ่มพิมพ์ — ซ่อนตอนพิมพ์ */}
      <button style={s.printBtn} onClick={() => window.print()} className="no-print">
        🖨️ พิมพ์ / บันทึก PDF
      </button>

      <div style={s.page} id="contract-body">

        {/* ===== หัวสัญญา ===== */}
        <div style={s.h1}>{contractType}</div>
        <div style={s.h2}>
          เลขที่เคส: {data.case_code || '............'}
          {' '}|{' '}
          วันที่จัดทำ: {today}
        </div>

        <div style={s.divider} />

        {/* ===== ส่วนที่ 1: คู่สัญญา ===== */}
        <div style={{ ...s.section, background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 12, color: '#1565c0' }}>
            ส่วนที่ 1 — คู่สัญญา
          </div>
          <div style={s.row}>
            <span style={s.label}>ผู้กู้ / เจ้าของทรัพย์:</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1 }}>{debtorName}</span>
          </div>
          <div style={s.row}>
            <span style={s.label}>เบอร์โทรศัพท์:</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1 }}>{debtorPhone}</span>
          </div>
          <div style={s.row}>
            <span style={s.label}>เลขบัตรประชาชน:</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1 }}>{debtorIdCard}</span>
          </div>
          {data.marital_status && (
            <div style={s.row}>
              <span style={s.label}>สถานภาพสมรส:</span>
              <span>{
                { single: 'โสด', married_reg: 'สมรสจดทะเบียน', married_unreg: 'สมรสไม่จดทะเบียน',
                  divorced: 'หย่า', inherited: 'รับมรดก' }[data.marital_status] || data.marital_status
              }</span>
            </div>
          )}
          <div style={{ ...s.divider, margin: '12px 0' }} />
          <div style={s.row}>
            <span style={s.label}>นายหน้า:</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1 }}>{agentName}</span>
            <span style={{ marginLeft: 16 }}>รหัส: {agentCode}</span>
          </div>
          <div style={{ ...s.divider, margin: '12px 0' }} />
          <div style={s.row}>
            <span style={s.label}>เจ้าหน้าที่ผู้รับผิดชอบ:</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1 }}>{officerName}</span>
          </div>
          <div style={s.row}>
            <span style={s.label}>สำนักงานที่ดิน:</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1 }}>{landOffice}</span>
          </div>
        </div>

        {/* ===== ส่วนที่ 2: ทรัพย์หลักประกัน ===== */}
        <div style={{ ...s.section, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '16px 20px', marginTop: 16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 12, color: '#15803d' }}>
            ส่วนที่ 2 — ทรัพย์หลักประกัน
          </div>
          <div style={s.row}>
            <span style={s.label}>ประเภททรัพย์:</span>
            <span>{{
              land: 'ที่ดินเปล่า', house: 'บ้าน', single_house: 'บ้านเดี่ยว',
              condo: 'คอนโด', townhouse: 'ทาวน์โฮม', shophouse: 'ตึกแถว', other: 'อื่นๆ'
            }[data.property_type] || data.property_type || '............'}</span>
          </div>
          <div style={s.row}>
            <span style={s.label}>เลขที่โฉนด:</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1 }}>{deedNumber}</span>
          </div>
          <div style={s.row}>
            <span style={s.label}>พื้นที่:</span>
            <span>{landArea}</span>
          </div>
          <div style={s.row}>
            <span style={s.label}>ที่ตั้งทรัพย์:</span>
            <span style={{ borderBottom: '1px solid #000', flex: 1 }}>
              {data.property_address || `ต.${data.subdistrict || '...'} อ.${data.district || '...'} จ.${data.province || '...'}`}
            </span>
          </div>
          {data.has_obligation === 'yes' && (
            <div style={{ marginTop: 8, padding: '6px 12px', background: '#fee2e2', borderRadius: 6, fontSize: 13, color: '#b91c1c' }}>
              ⚠️ ทรัพย์ติดภาระ {data.obligation_count ? `(${data.obligation_count} รายการ)` : ''} — ต้องชำระภาระก่อนจดทะเบียน
            </div>
          )}
        </div>

        {/* ===== ส่วนที่ 3: เงื่อนไขสัญญา ===== */}
        <div style={{ ...s.section, background: isSelling ? '#faf5ff' : '#eff6ff', border: `1px solid ${isSelling ? '#d8b4fe' : '#93c5fd'}`, borderRadius: 8, padding: '16px 20px', marginTop: 16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 12, color: isSelling ? '#6d28d9' : '#1d4ed8' }}>
            ส่วนที่ 3 — เงื่อนไข{contractType}
          </div>
          <div style={s.row}>
            <span style={s.label}>วงเงิน{isSelling ? 'ขายฝาก' : 'จำนอง'}:</span>
            <strong style={{ borderBottom: '2px solid #000', paddingRight: 16 }}>{creditAmt} บาท</strong>
          </div>
          <div style={s.row}>
            <span style={s.label}>อัตราดอกเบี้ยต่อเดือน:</span>
            <span>{interestPerMonth}</span>
            <span style={{ marginLeft: 24 }}>ต่อปี: {interestPerYear}</span>
          </div>
          <div style={s.row}>
            <span style={s.label}>ค่าดำเนินการ:</span>
            <span>{opFee} บาท</span>
          </div>
          <div style={s.row}>
            <span style={s.label}>ค่าประมาณการกรมที่ดิน:</span>
            <span>{landTax} บาท</span>
          </div>
          {data.advance_interest && (
            <div style={s.row}>
              <span style={s.label}>ดอกเบี้ยล่วงหน้า:</span>
              <span>{fmt(data.advance_interest)} บาท</span>
            </div>
          )}
          {data.commission_amount && Number(data.commission_amount) > 0 && (
            <div style={s.row}>
              <span style={s.label}>ค่าคอมมิชชั่นนายหน้า:</span>
              <span>{fmt(data.commission_amount)} บาท</span>
            </div>
          )}
        </div>

        {/* ===== ข้อความสัญญา ===== */}
        <div style={{ marginTop: 24, lineHeight: 2, fontSize: 14 }}>
          <p>
            &emsp;โดยสัญญาฉบับนี้ทำขึ้น ณ วันที่ <strong>{today}</strong> โดยมีคู่สัญญา คือ
            ผู้กู้/เจ้าของทรัพย์ ชื่อ <strong>{debtorName}</strong> ตกลงทำ{contractType}ทรัพย์สิน
            ประเภท <strong>{{
              land: 'ที่ดินเปล่า', house: 'บ้าน', single_house: 'บ้านเดี่ยว',
              condo: 'คอนโด', townhouse: 'ทาวน์โฮม', shophouse: 'ตึกแถว', other: 'อื่นๆ'
            }[data.property_type] || data.property_type || '............'}</strong>
            {' '}เลขที่โฉนด <strong>{deedNumber}</strong>
            {' '}ตั้งอยู่ที่ <strong>{data.property_address || `ต.${data.subdistrict || '...'} อ.${data.district || '...'} จ.${data.province || '...'}`}</strong>
            {' '}พื้นที่ <strong>{landArea}</strong>
            {' '}ในวงเงิน <strong>{creditAmt} บาท</strong>
            {' '}อัตราดอกเบี้ย <strong>{interestPerMonth}</strong> ต่อเดือน ({interestPerYear} ต่อปี)
          </p>
          {isSelling && (
            <p>
              &emsp;ผู้กู้มีสิทธิ์ไถ่ถอนทรัพย์คืนตามเงื่อนไขที่กำหนดไว้ในสัญญา โดยต้องชำระเงินต้น
              พร้อมดอกเบี้ยและค่าใช้จ่ายอื่นๆ ทั้งหมด ณ สำนักงานที่ดิน <strong>{landOffice || '............'}</strong>
            </p>
          )}
          {!isSelling && (
            <p>
              &emsp;ผู้กู้นำทรัพย์ไปจดทะเบียนจำนองเป็นประกันการชำระหนี้ โดยผู้รับจำนองมีสิทธิ์บังคับ
              จำนองได้ตามกฎหมายหากผู้กู้ผิดนัดชำระ ณ สำนักงานที่ดิน <strong>{landOffice || '............'}</strong>
            </p>
          )}
        </div>

        <div style={s.divider} />

        {/* ===== ลายเซ็น ===== */}
        <div style={s.signBox}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ paddingTop: 50, borderTop: '1px solid #000', marginTop: 50 }}>
              <div>ลายมือชื่อผู้กู้/เจ้าของทรัพย์</div>
              <div style={{ marginTop: 4, fontSize: 13 }}>( {debtorName} )</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#555' }}>วันที่ ........../........../..........&nbsp;&nbsp;</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ paddingTop: 50, borderTop: '1px solid #000', marginTop: 50 }}>
              <div>ลายมือชื่อผู้ให้กู้/ตัวแทนบริษัท</div>
              <div style={{ marginTop: 4, fontSize: 13 }}>( ..................................................... )</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#555' }}>วันที่ ........../........../..........&nbsp;&nbsp;</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ paddingTop: 50, borderTop: '1px solid #000', marginTop: 50 }}>
              <div>ลายมือชื่อนายหน้า</div>
              <div style={{ marginTop: 4, fontSize: 13 }}>( {agentName} )</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#555' }}>วันที่ ........../........../..........&nbsp;&nbsp;</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ paddingTop: 50, borderTop: '1px solid #000', marginTop: 50 }}>
              <div>ลายมือชื่อพยาน</div>
              <div style={{ marginTop: 4, fontSize: 13 }}>( ..................................................... )</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#555' }}>วันที่ ........../........../..........&nbsp;&nbsp;</div>
            </div>
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div style={{ marginTop: 40, padding: '12px 16px', background: '#f5f5f5', borderRadius: 8, fontSize: 12, color: '#666', textAlign: 'center' }}>
          เอกสารนี้จัดทำโดยระบบ LoanDD Admin | เคส {data.case_code} | พิมพ์: {today}
        </div>
      </div>

      {/* ===== Print CSS ===== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          #contract-body { padding: 20px 30px !important; max-width: 100% !important; }
        }
        @page {
          size: A4;
          margin: 15mm 20mm;
        }
      `}</style>
    </div>
  )
}

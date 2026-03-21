/**
 * BrokerAppointmentPage.jsx
 * สัญญาแต่งตั้งนายหน้าจัดหาทุน — ออโต้ดึงข้อมูลจากเคส แก้ไขได้ก่อนพิมพ์
 * เปิดจาก IssuingEditPage ด้วย window.open('/issuing/broker-appointment/:id', '_blank')
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/issuing'

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

function Underline({ value, onChange, width = 200, bold = false, placeholder = '' }) {
  return (
    <span style={{ display: 'inline-block', borderBottom: '1px solid #000', minWidth: width, position: 'relative' }}>
      <input
        className="field-edit no-print"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: 'none', outline: 'none', background: 'transparent',
          width: '100%', fontFamily: 'inherit', fontSize: 'inherit',
          fontWeight: bold ? 700 : 'inherit', color: bold ? '#000' : 'inherit',
          padding: '0 2px',
        }}
      />
      <span className="print-only" style={{ fontWeight: bold ? 700 : 'inherit' }}>{value || '\u00a0'.repeat(20)}</span>
    </span>
  )
}

function Clause({ num, children }) {
  return (
    <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
      <div style={{ minWidth: 32, fontWeight: 700, color: '#1a237e' }}>ข้อ {num}.</div>
      <div style={{ flex: 1, lineHeight: 1.9 }}>{children}</div>
    </div>
  )
}

export default function BrokerAppointmentPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [f, setF] = useState({
    contract_date: fmtDateBE(new Date()),
    contract_number: '',

    // ผู้ว่าจ้าง (ลูกหนี้)
    client_name: '',
    client_id_card: '',
    client_address: '',
    client_phone: '',

    // ทรัพย์
    property_type: '',
    deed_number: '',
    land_area: '',
    property_address: '',

    // วงเงิน
    loan_amount: '',
    commission_rate: '3',   // % ของวงเงิน

    // บริษัท
    company_rep: 'ผู้มีอำนาจ บริษัท โลน ดีดี จำกัด',
    contract_duration: '3',  // เดือน
  })

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const c = d.caseData
          setData(c)
          setF(p => ({
            ...p,
            contract_number: c.case_code || '',
            client_name: c.contact_name || '',
            client_id_card: c.borrower_id_card_number || '',
            client_phone: c.contact_phone || '',
            client_address: [c.house_no, c.village_name, c.subdistrict, c.district, c.province].filter(Boolean).join(' ')
              || c.property_address || '',
            property_type: {
              land: 'ที่ดินเปล่า', house: 'บ้านเดี่ยว', single_house: 'บ้านเดี่ยว',
              condo: 'คอนโดมิเนียม', townhouse: 'ทาวน์เฮ้าส์', shophouse: 'ตึกแถว/อาคารพาณิชย์',
            }[c.property_type] || c.property_type || '',
            deed_number: c.deed_number || '',
            land_area: c.land_area || '',
            property_address: c.property_address
              || [c.subdistrict, c.district, c.province].filter(Boolean).join(' ') || '',
            loan_amount: c.approved_credit || c.desired_amount || '',
            commission_rate: c.commission_rate || '3',
          }))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Sarabun, sans-serif' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: '#1a237e' }}></i>
      <p>กำลังโหลดข้อมูล...</p>
    </div>
  )

  if (!data) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'Sarabun, sans-serif', color: '#c00' }}>
      ไม่พบข้อมูลเคส
    </div>
  )

  const commissionAmt = f.loan_amount && f.commission_rate
    ? Math.round(parseFloat(f.loan_amount) * parseFloat(f.commission_rate) / 100).toLocaleString('th-TH')
    : '............'

  return (
    <div style={{ fontFamily: '"Sarabun", "TH Sarabun New", Tahoma, sans-serif', background: '#e8eaf0', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .contract-paper { box-shadow: none !important; margin: 0 !important; }
          @page { size: A4; margin: 1.5cm; }
        }
        .print-only { display: none; }
        @media print { .print-only { display: inline; } }
        .field-edit { display: inline-block; }
        @media print { .field-edit { display: none; } }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="no-print" style={{
        background: '#1a237e', padding: '12px 24px', display: 'flex',
        alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
      }}>
        <button onClick={() => window.close()} style={{
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#fff', fontSize: 13
        }}>
          <i className="fas fa-times" style={{ marginRight: 6 }}></i>ปิด
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>
            <i className="fas fa-file-signature" style={{ marginRight: 8 }}></i>
            สัญญาแต่งตั้งนายหน้าจัดหาทุน — เคส {data.case_code}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>แก้ไขข้อมูลได้โดยตรง แล้วกดพิมพ์</div>
        </div>
        <button onClick={() => window.print()} style={{
          background: '#43a047', color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 2px 8px rgba(67,160,71,0.4)'
        }}>
          <i className="fas fa-print"></i> พิมพ์ / บันทึก PDF
        </button>
      </div>

      {/* ── Quick edit grid ── */}
      <div className="no-print" style={{
        maxWidth: 900, margin: '20px auto 0', padding: '0 20px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10
      }}>
        {[
          { k: 'contract_number', label: 'เลขที่สัญญา / เลขเคส' },
          { k: 'contract_date', label: 'วันที่ทำสัญญา (พ.ศ.)' },
          { k: 'contract_duration', label: 'อายุสัญญา (เดือน)', type: 'number' },
          { k: 'client_name', label: 'ชื่อ-นามสกุลผู้ว่าจ้าง' },
          { k: 'client_id_card', label: 'เลขบัตรประชาชนผู้ว่าจ้าง' },
          { k: 'client_phone', label: 'โทรศัพท์ผู้ว่าจ้าง' },
          { k: 'client_address', label: 'ที่อยู่ผู้ว่าจ้าง' },
          { k: 'deed_number', label: 'เลขที่โฉนด' },
          { k: 'land_area', label: 'เนื้อที่ดิน' },
          { k: 'property_address', label: 'ที่ตั้งทรัพย์' },
          { k: 'loan_amount', label: 'วงเงินที่ต้องการ (บาท)', type: 'number' },
          { k: 'commission_rate', label: 'ค่าตอบแทน (% ของวงเงิน)', type: 'number' },
          { k: 'company_rep', label: 'ผู้แทนบริษัท (นายหน้า)' },
        ].map(({ k, label, type }) => (
          <div key={k} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{label}</div>
            <input
              type={type || 'text'}
              value={f[k]}
              onChange={e => set(k, e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', color: '#1e293b' }}
            />
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          CONTRACT PAPER
      ══════════════════════════════════════════ */}
      <div className="contract-paper" style={{
        maxWidth: 800, margin: '20px auto', background: '#fff',
        padding: '52px 60px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        borderRadius: 4, fontSize: 15, lineHeight: 1.9, color: '#111',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: 1, marginBottom: 4 }}>
            บริษัท โลน ดีดี จำกัด
          </div>
          <div style={{
            fontSize: 20, fontWeight: 700, letterSpacing: 3,
            color: '#1a237e', borderBottom: '3px double #1a237e',
            display: 'inline-block', paddingBottom: 4, marginBottom: 10,
          }}>
            สัญญาแต่งตั้งนายหน้าจัดหาทุน
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>
            เลขที่ <Underline value={f.contract_number} onChange={v => set('contract_number', v)} width={120} bold />
            {' '}วันที่{' '}
            <Underline value={f.contract_date} onChange={v => set('contract_date', v)} width={160} />
          </div>
        </div>

        {/* คู่สัญญา */}
        <div style={{ marginBottom: 20, background: '#f5f5fb', border: '1px solid #c5cae9', borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a237e', marginBottom: 12 }}>
            คู่สัญญา
          </div>

          {/* ผู้ว่าจ้าง */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontWeight: 700, minWidth: 130, display: 'inline-block' }}>ผู้ว่าจ้าง</span>
            <Underline value={f.client_name} onChange={v => set('client_name', v)} width={220} bold />
            <span style={{ margin: '0 8px', color: '#555' }}>เลขบัตรประชาชน</span>
            <Underline value={f.client_id_card} onChange={v => set('client_id_card', v)} width={160} />
          </div>
          <div style={{ marginBottom: 6, paddingLeft: 130 }}>
            <span style={{ color: '#555', marginRight: 8 }}>ที่อยู่</span>
            <Underline value={f.client_address} onChange={v => set('client_address', v)} width={380} />
          </div>
          <div style={{ paddingLeft: 130 }}>
            <span style={{ color: '#555', marginRight: 8 }}>โทรศัพท์</span>
            <Underline value={f.client_phone} onChange={v => set('client_phone', v)} width={160} />
          </div>
        </div>

        <div style={{ marginBottom: 20, background: '#f5f5fb', border: '1px solid #c5cae9', borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 700, minWidth: 130, display: 'inline-block' }}>ผู้รับจ้าง (นายหน้า)</span>
            <strong>บริษัท โลน ดีดี จำกัด</strong>
            <span style={{ color: '#555', margin: '0 8px' }}>โดย</span>
            <Underline value={f.company_rep} onChange={v => set('company_rep', v)} width={220} />
          </div>
          <div style={{ paddingLeft: 130, fontSize: 13, color: '#555' }}>
            ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>"นายหน้า"</strong>
          </div>
        </div>

        <p style={{ textIndent: 32, marginBottom: 20 }}>
          คู่สัญญาทั้งสองฝ่ายได้ตกลงกันโดยสมัครใจ มีข้อตกลงและเงื่อนไขดังต่อไปนี้
        </p>

        {/* ข้อ 1 */}
        <Clause num={1}>
          <strong>วัตถุประสงค์การแต่งตั้ง</strong><br />
          ผู้ว่าจ้างตกลงแต่งตั้งให้นายหน้าดำเนินการจัดหาผู้ลงทุน (นายทุน) สำหรับอสังหาริมทรัพย์
          ประเภท{' '}
          <Underline value={f.property_type} onChange={v => set('property_type', v)} width={120} bold />
          {' '}โฉนดที่ดินเลขที่{' '}
          <Underline value={f.deed_number} onChange={v => set('deed_number', v)} width={120} bold />
          {' '}เนื้อที่{' '}
          <Underline value={f.land_area} onChange={v => set('land_area', v)} width={100} />
          {' '}ตั้งอยู่ที่{' '}
          <Underline value={f.property_address} onChange={v => set('property_address', v)} width={260} />
          {' '}เพื่อดำเนินการทำสัญญาขายฝาก/จำนองในวงเงินที่ต้องการ{' '}
          <Underline value={f.loan_amount ? Number(f.loan_amount).toLocaleString('th-TH') : ''} onChange={v => set('loan_amount', v.replace(/,/g, ''))} width={130} bold />
          {' '}บาท
        </Clause>

        {/* ข้อ 2 */}
        <Clause num={2}>
          <strong>หน้าที่ของนายหน้า</strong><br />
          นายหน้าตกลงดำเนินการหาผู้ลงทุนและจัดเตรียมเอกสารสัญญาที่เกี่ยวข้องทั้งหมด
          รวมถึงประสานงานระหว่างผู้ว่าจ้างและผู้ลงทุนเพื่อให้การทำธุรกรรมสำเร็จลุล่วง
          โดยสัญญานี้มีอายุ{' '}
          <Underline value={f.contract_duration} onChange={v => set('contract_duration', v)} width={50} bold />
          {' '}เดือน นับจากวันทำสัญญา
        </Clause>

        {/* ข้อ 3 */}
        <Clause num={3}>
          <strong>ค่าตอบแทนนายหน้า</strong><br />
          ผู้ว่าจ้างตกลงชำระค่าตอบแทนให้แก่นายหน้าในอัตรา{' '}
          <Underline value={f.commission_rate} onChange={v => set('commission_rate', v)} width={50} bold />
          % ของวงเงินที่ได้รับ คิดเป็นจำนวนเงิน{' '}
          <strong style={{ color: '#1a237e' }}>{commissionAmt}</strong>
          {' '}บาท (โดยประมาณ) โดยผู้ว่าจ้างจะชำระค่าตอบแทนในวันที่ดำเนินการทำธุรกรรมที่สำนักงานที่ดินเสร็จสมบูรณ์
        </Clause>

        {/* ข้อ 4 */}
        <Clause num={4}>
          <strong>เอกสารที่ต้องเตรียม</strong><br />
          ผู้ว่าจ้างตกลงจัดเตรียมเอกสารที่เกี่ยวข้อง ได้แก่ บัตรประจำตัวประชาชน
          ทะเบียนบ้าน โฉนดที่ดิน และเอกสารอื่นๆ ตามที่นายหน้าร้องขอ
          เพื่อประกอบการทำสัญญาและจดทะเบียนที่สำนักงานที่ดิน
        </Clause>

        {/* ข้อ 5 */}
        <Clause num={5}>
          <strong>การชำระค่าใช้จ่ายอื่นๆ</strong><br />
          ค่าธรรมเนียมการจดทะเบียนที่ดิน ค่าภาษี และค่าใช้จ่ายอื่นๆ ที่เกิดขึ้น
          ณ สำนักงานที่ดิน เป็นความรับผิดชอบของผู้ว่าจ้าง เว้นแต่จะตกลงกันเป็นอย่างอื่น
        </Clause>

        {/* ข้อ 6 — Exclusivity */}
        <Clause num={6}>
          <strong>ความผูกพันในการใช้นายหน้า (Exclusivity)</strong><br />
          ผู้ว่าจ้างตกลงว่าการทำธุรกรรม{f.deed_number ? `โฉนดเลขที่ ${f.deed_number}` : 'อสังหาริมทรัพย์ที่ระบุในสัญญานี้'}
          {' '}จะต้องดำเนินการผ่านนายหน้าเพียงผู้เดียวตลอดอายุสัญญา
          <span style={{ color: '#c62828', fontWeight: 600 }}>
            {' '}แม้ว่าผู้ว่าจ้างจะมีผู้ลงทุนของตนเองก็ตาม
          </span>{' '}
          หากผู้ว่าจ้างดำเนินการกับผู้ลงทุนรายอื่นโดยไม่ผ่านนายหน้าภายในระยะเวลาสัญญา
          ผู้ว่าจ้างยังคงต้องชำระค่าตอบแทนให้แก่นายหน้าตามที่กำหนดในข้อ 3
        </Clause>

        {/* ข้อ 7 */}
        <Clause num={7}>
          <strong>การยกเลิกสัญญา</strong><br />
          หากผู้ว่าจ้างประสงค์จะยกเลิกสัญญาก่อนครบกำหนด ผู้ว่าจ้างจะต้องแจ้งเป็นลายลักษณ์อักษรล่วงหน้า
          ไม่น้อยกว่า 15 วัน และหากนายหน้าได้ดำเนินการหาผู้ลงทุนไปแล้วบางส่วน
          ผู้ว่าจ้างตกลงชำระค่าตอบแทนตามสัดส่วนที่เหมาะสม
        </Clause>

        {/* ข้อ 8 */}
        <Clause num={8}>
          <strong>กฎหมายที่ใช้บังคับ</strong><br />
          สัญญาฉบับนี้อยู่ภายใต้บังคับกฎหมายไทย หากมีข้อพิพาทใดๆ เกิดขึ้น
          คู่สัญญาทั้งสองฝ่ายตกลงนำคดีขึ้นสู่ศาลในเขตกรุงเทพมหานคร
        </Clause>

        {/* ลายมือชื่อ */}
        <div style={{ marginTop: 40, borderTop: '1.5px solid #ddd', paddingTop: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>

            {/* ผู้ว่าจ้าง */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1a237e', marginBottom: 4 }}>ผู้ว่าจ้าง</div>
              <div style={{ borderBottom: '1px solid #333', height: 52, marginBottom: 6 }}></div>
              <div style={{ fontSize: 13, color: '#333' }}>
                ({f.client_name || '................................................................'})
              </div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>ลงนาม / วันที่ .................................</div>
            </div>

            {/* นายหน้า */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1a237e', marginBottom: 4 }}>ผู้รับจ้าง (นายหน้า)</div>
              <div style={{ borderBottom: '1px solid #333', height: 52, marginBottom: 6 }}></div>
              <div style={{ fontSize: 13, color: '#333' }}>
                (บริษัท โลน ดีดี จำกัด)
              </div>
              <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>ลงนาม / วันที่ .................................</div>
            </div>
          </div>

          {/* พยาน */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 32 }}>
            {['พยาน', 'พยาน'].map((title, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#555', marginBottom: 4 }}>{title}</div>
                <div style={{ borderBottom: '1px solid #aaa', height: 44, marginBottom: 6 }}></div>
                <div style={{ fontSize: 12, color: '#555' }}>(...................................................)</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>ลงนาม / วันที่ .................................</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 28, borderTop: '1px solid #ddd', paddingTop: 10, fontSize: 11, color: '#999', textAlign: 'center' }}>
          สัญญาฉบับนี้ทำขึ้น 2 ฉบับ มีข้อความตรงกัน คู่สัญญาแต่ละฝ่ายยึดถือไว้ฝ่ายละ 1 ฉบับ
          <br />จัดทำโดยระบบ บริษัท โลน ดีดี จำกัด · เคส {data.case_code}
        </div>
      </div>

      <div className="no-print" style={{ height: 40 }} />
    </div>
  )
}

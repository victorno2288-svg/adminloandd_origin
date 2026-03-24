import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/sales.css'
import MapPreview from '../components/MapPreview'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/accounting'
const PER_PAGE = 20

const STATUS_LABEL = {
  // ★ ฝ่ายขาย
  new:                     'เคสใหม่',
  contacting:              'กำลังติดต่อ',
  incomplete:              'ข้อมูลไม่ครบ',
  awaiting_appraisal_fee:  'รอชำระค่าประเมิน',
  // ★ ฝ่ายประเมิน
  appraisal_scheduled:     'นัดประเมินแล้ว',
  appraisal_passed:        'ผ่านประเมินแล้ว',
  appraisal_not_passed:    'ไม่ผ่านประเมิน',
  // ★ ฝ่ายอนุมัติ
  pending_approve:         'รออนุมัติวงเงิน',
  credit_approved:         'อนุมัติวงเงิน',
  // ★ ฝ่ายประมูล
  pending_auction:         'รอประมูล',
  auction_completed:       'ประมูลเสร็จสิ้น',
  // ★ ฝ่ายนิติกรรม
  preparing_docs:          'ออกสัญญาแล้ว',
  legal_scheduled:         'นัดนิติกรรมแล้ว',
  legal_completed:         'ทำนิติกรรมเสร็จสิ้น',
  // ★ ปิดเคส
  completed:               'เสร็จสมบูรณ์',
  pending_cancel:          'รออนุมัติยกเลิก',
  cancelled:               'ยกเลิก',
}
const STATUS_BADGE = {
  new:                     'badge-pending',
  contacting:              'badge-pending',
  incomplete:              'badge-pending',
  awaiting_appraisal_fee:  'badge-pending',
  appraisal_scheduled:     'badge-approve',
  appraisal_passed:        'badge-paid',
  appraisal_not_passed:    'badge-cancelled',
  pending_approve:         'badge-approve',
  credit_approved:         'badge-paid',
  pending_auction:         'badge-auction',
  auction_completed:       'badge-completed',
  preparing_docs:          'badge-approve',
  legal_scheduled:         'badge-transaction',
  legal_completed:         'badge-transaction',
  completed:               'badge-completed',
  pending_cancel:          'badge-cancelled',
  cancelled:               'badge-cancelled',
}
const BANKS = [
  'กรุงเทพ (BBL)', 'กสิกรไทย (KBANK)', 'กรุงไทย (KTB)', 'ไทยพาณิชย์ (SCB)',
  'กรุงศรีอยุธยา (BAY)', 'ทีทีบี (TTB)', 'ออมสิน', 'ธ.ก.ส.',
  'อาคารสงเคราะห์ (GHB)', 'ยูโอบี (UOB)', 'แลนด์แอนด์เฮ้าส์ (LH)',
  'ทิสโก้ (TISCO)', 'ซิตี้แบงก์ (CITI)'
]
const fmt = (n) => n ? `฿${Number(n).toLocaleString('th-TH')}` : null
const parseJsonArr = (str) => { try { const r = JSON.parse(str || '[]'); return Array.isArray(r) ? r : [] } catch { return [] } }

// ============================================================
// MODAL COMPONENTS (keep same rich design)
// ============================================================
function ImgPreview({ src, onClose }) {
  if (!src) return null
  const isPdf = /\.pdf$/i.test(src)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
      <button onClick={e => { e.stopPropagation(); onClose() }}
        style={{ position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', fontSize: 20, cursor: 'pointer', zIndex: 100000 }}>✕</button>
      {isPdf
        ? <iframe src={src} title="preview" style={{ width: '85vw', height: '90vh', border: 'none', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
        : <img src={src} alt="preview" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }} />
      }
    </div>
  )
}

function DocCard({ label, src, onPreview }) {
  if (!src) return null
  const isPdf = /\.pdf$/i.test(src)
  return (
    <div onClick={() => onPreview(src)}
      style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: '#fff', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#2e7d32'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(46,125,50,0.15)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}>
      {isPdf
        ? <div style={{ width: '100%', height: 86, background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <i className="fas fa-file-pdf" style={{ fontSize: 28, color: '#ef4444' }}></i>
            <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>PDF</span>
          </div>
        : <img src={src} alt={label} style={{ width: '100%', height: 86, objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }} />
      }
      <div style={{ padding: '5px 7px', fontSize: 10, color: '#475569', fontWeight: 600, background: '#f8fafc', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

function DocGroup({ title, icon, color, docs, onPreview }) {
  const valid = docs.filter(d => d.src)
  if (!valid.length) return null
  return (
    <div style={{ marginTop: 14 }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          {icon && <i className={`fas ${icon}`} style={{ color, fontSize: 11 }}></i>}
          <span style={{ fontSize: 12, fontWeight: 700, color: color || '#64748b' }}>
            {title} <span style={{ fontWeight: 400, color: '#94a3b8' }}>({valid.length})</span>
          </span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 8 }}>
        {valid.map((d, i) => <DocCard key={i} label={d.label} src={d.src} onPreview={onPreview} />)}
      </div>
    </div>
  )
}

function DocSection({ title, icon, color, docs, onPreview }) {
  const valid = docs.filter(d => d.src)
  if (!valid.length) return null
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${icon}`} style={{ color, fontSize: 13 }}></i>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{title}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>({valid.length})</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 9 }}>
        {valid.map((d, i) => <DocCard key={i} label={d.label} src={d.src} onPreview={onPreview} />)}
      </div>
    </div>
  )
}

function SectionCard({ title, icon, color, badge, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1.5px solid #f1f5f9' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fas ${icon}`} style={{ color, fontSize: 14 }}></i>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color, flex: 1 }}>{title}</span>
        {badge && <span style={{ fontSize: 11, background: color + '18', color, padding: '2px 10px', borderRadius: 10, fontWeight: 700 }}>{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, mono, link }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      {link
        ? <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2e7d32', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="fas fa-external-link-alt" style={{ fontSize: 10 }}></i> เปิดแผนที่
          </a>
        : <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, fontFamily: mono ? 'monospace' : undefined }}>{value}</div>
      }
    </div>
  )
}

// ============================================================
// CASE MODAL — rich 9-section document viewer
// ============================================================
function CaseModal({ caseRow, onClose }) {
  const [docs, setDocs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bankForm, setBankForm] = useState({ bank_account_number: '', bank_name: '', bank_account_name: '' })
  const [bankSaving, setBankSaving] = useState(false)
  const [bankMsg, setBankMsg] = useState('')
  const [bookFile, setBookFile] = useState(null)
  const [bookUploading, setBookUploading] = useState(false)
  const [bookMsg, setBookMsg] = useState('')
  const [preview, setPreview] = useState(null)
  // ★ contract dates + investor amount
  const [contractForm, setContractForm] = useState({ investor_amount: '', contract_start_date: '', contract_end_date: '' })
  const [contractSaving, setContractSaving] = useState(false)
  const [contractMsg, setContractMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/case-docs/${caseRow.loan_request_id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => {
        if (d.success) {
        setDocs(d.data)
        setBankForm({ bank_account_number: d.data.bank_account_number || '', bank_name: d.data.bank_name || '', bank_account_name: d.data.bank_account_name || '' })
        setContractForm({
          investor_amount: d.data.investor_amount || '',
          contract_start_date: d.data.contract_start_date ? d.data.contract_start_date.slice(0, 10) : '',
          contract_end_date: d.data.contract_end_date ? d.data.contract_end_date.slice(0, 10) : '',
        })
      }
      }).catch(() => {}).finally(() => setLoading(false))
  }, [caseRow.loan_request_id])

  const saveBankInfo = async () => {
    if (!docs) return
    setBankSaving(true); setBankMsg('')
    try {
      const res = await fetch(`${API}/case-bank-info/${docs.loan_request_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(bankForm)
      })
      const d = await res.json()
      setBankMsg(d.success ? 'บันทึกสำเร็จ ✓' : (d.message || 'ผิดพลาด'))
      if (d.success) setDocs(prev => ({ ...prev, ...bankForm }))
    } catch { setBankMsg('ผิดพลาด') }
    setBankSaving(false)
  }

  const uploadBook = async () => {
    if (!bookFile || !docs) return
    setBookUploading(true); setBookMsg('')
    const fd = new FormData(); fd.append('bank_book_file', bookFile)
    try {
      const res = await fetch(`${API}/case-bank-book/${docs.loan_request_id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd
      })
      const d = await res.json()
      setBookMsg(d.success ? 'อัพโหลดสำเร็จ ✓' : (d.message || 'ผิดพลาด'))
      if (d.success) { setDocs(prev => ({ ...prev, bank_book_file: d.file_path })); setBookFile(null) }
    } catch { setBookMsg('ผิดพลาด') }
    setBookUploading(false)
  }

  const saveContractInfo = async () => {
    if (!docs?.case_id) return
    setContractSaving(true); setContractMsg('')
    try {
      const res = await fetch(`${API}/case-contract-info/${docs.case_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(contractForm)
      })
      const d = await res.json()
      setContractMsg(d.success ? 'บันทึกสำเร็จ ✓' : (d.message || 'ผิดพลาด'))
      if (d.success) setDocs(prev => ({ ...prev, ...contractForm }))
    } catch { setContractMsg('ผิดพลาด') }
    setContractSaving(false)
  }

  // แยกรูปตาม path folder (images เก็บรวมกันเป็น JSON array)
  const allImgs = parseJsonArr(docs?.images)
  const propImgs = [
    ...allImgs.filter(p => p && p.includes('properties')),
    ...parseJsonArr(docs?.property_photos),  // checklist upload จากฝ่ายขาย
  ]
  const idCardImgs = [
    ...allImgs.filter(p => p && p.includes('id-cards')),
    ...parseJsonArr(docs?.checklist_id_card),
  ]
  const permitImgs = [
    ...allImgs.filter(p => p && p.includes('permits')),
    ...parseJsonArr(docs?.building_permit),
  ]
  const appraisalImgs = parseJsonArr(docs?.appraisal_images)
  const deedImgs = [
    ...parseJsonArr(docs?.deed_images),
    ...parseJsonArr(docs?.deed_copy),  // checklist deed_copy จากฝ่ายขาย
  ]
  const videoImgs = allImgs.filter(p => p && p.includes('videos'))
  const landTaxDocs = parseJsonArr(docs?.land_tax_receipt)    // ใบเสียภาษีที่ดิน
  const houseRegDocs = parseJsonArr(docs?.checklist_house_reg) // ทะเบียนบ้าน

  let investorCode = '', investorName = '', investorPhone = ''
  if (docs?.investor_info) {
    const p = docs.investor_info.split('|')
    investorCode = p[0] || ''; investorName = p[1] || ''; investorPhone = p[2] || ''
  }
  const investorSlips = docs?.investor_slips ? docs.investor_slips.split('|').filter(Boolean) : []

  const auctionParse = (val) => { try { const a = JSON.parse(val || '[]'); return Array.isArray(a) ? a : [] } catch { return [] } }

  const baseV = parseFloat(docs?.appraisal_result || docs?.estimated_value || 0)
  const loanAmt = parseFloat(docs?.approved_amount || docs?.loan_amount || 0)
  const ltv = baseV > 0 && loanAmt > 0 ? ((loanAmt / baseV) * 100).toFixed(1) : null

  const hasProperty = docs && (docs.province || docs.district || docs.deed_number || docs.estimated_value || propImgs.length > 0 || deedImgs.length > 0 || idCardImgs.length > 0)
  const hasAgent = docs?.agent_name
  const hasInvestor = investorName || investorSlips.length > 0

  return (
    <>
      <div onClick={onClose} className="modal-overlay" style={{ zIndex: 9990 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 9991, width: '96vw', maxWidth: 880, maxHeight: '94vh',
        display: 'flex', flexDirection: 'column', borderRadius: 18,
        boxShadow: '0 28px 70px rgba(0,0,0,0.35)', overflow: 'hidden', background: '#f1f5f9'
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1b5e20,#2e7d32)', padding: '16px 22px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-folder-open"></i>{caseRow.debtor_name || '-'}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {caseRow.case_code && <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '2px 9px', borderRadius: 10 }}>เคส: {caseRow.case_code}</span>}
              {caseRow.debtor_code && <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '2px 9px', borderRadius: 10 }}>{caseRow.debtor_code}</span>}
              {caseRow.case_status && <span className={`badge ${STATUS_BADGE[caseRow.case_status] || 'badge-pending'}`} style={{ fontSize: 11 }}>{STATUS_LABEL[caseRow.case_status] || caseRow.case_status}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading
            ? <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 32 }}></i></div>
            : !docs
              ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>โหลดข้อมูลไม่สำเร็จ</div>
              : <>
                  {/* 1. ลูกหนี้ */}
                  <SectionCard title="ลูกหนี้" icon="fa-user" color="#2e7d32">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                      <InfoRow label="ชื่อ-สกุล" value={docs.debtor_name} />
                      <InfoRow label="เบอร์โทร" value={docs.debtor_phone} />
                      <InfoRow label="รหัสลูกหนี้" value={docs.debtor_code} mono />
                      <InfoRow label="รหัสเคส" value={docs.case_code} mono />
                      <InfoRow label="ประเภทสัญญา" value={{ selling_pledge: 'ขายฝาก', mortgage: 'จำนอง' }[docs.loan_type_detail] || docs.loan_type_detail} />
                      <InfoRow label="สถานะ" value={docs.case_status ? (STATUS_LABEL[docs.case_status] || docs.case_status) : null} />
                    </div>
                    {docs.acc_debtor_id_card && (
                      <div style={{ marginTop: 14, maxWidth: 120 }}>
                        <DocCard label="บัตรประชาชน" src={docs.acc_debtor_id_card} onPreview={setPreview} />
                      </div>
                    )}
                  </SectionCard>

                  {/* 2. ข้อมูลทรัพย์ */}
                  {hasProperty && (
                    <SectionCard title="ข้อมูลทรัพย์" icon="fa-map-marker-alt" color="#7b1fa2">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 12, marginBottom: 14 }}>
                        <InfoRow label="จังหวัด" value={docs.province} />
                        <InfoRow label="อำเภอ/เขต" value={docs.district} />
                        <InfoRow label="ตำบล/แขวง" value={docs.subdistrict} />
                        <InfoRow label="บ้านเลขที่" value={docs.house_no} />
                        <InfoRow label="ชื่อหมู่บ้าน" value={docs.village_name} />
                        <InfoRow label="เลขโฉนด" value={docs.deed_number} mono />
                        <InfoRow label="ประเภทเอกสารสิทธิ์" value={{ chanote: 'โฉนดที่ดิน (น.ส.4)', ns4k: 'น.ส.4ก.', ns3: 'นส.3', ns3k: 'นส.3ก.', spk: 'ที่ดิน ส.ป.ก.' }[docs.deed_type] || docs.deed_type} />
                        <InfoRow label="พื้นที่ดิน" value={docs.land_area} />
                        <InfoRow label="พื้นที่อาคาร" value={docs.building_area} />
                      </div>
                      {docs.location_url && (
                        <MapPreview url={docs.location_url} label="โลเคชั่นทรัพย์" />
                      )}
                      {(docs.estimated_value || docs.appraisal_result || docs.approved_amount || docs.loan_amount) && (
                        <div style={{ background: '#f3e8ff', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                          <InfoRow label="ราคาประเมิน (เบื้องต้น)" value={fmt(docs.estimated_value)} />
                          <InfoRow label="ราคาประเมิน (จริง)" value={fmt(docs.appraisal_result)} />
                          <InfoRow label="วงเงินอนุมัติ" value={fmt(docs.approved_amount || docs.loan_amount)} />
                          {ltv && (
                            <div>
                              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase' }}>LTV</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: parseFloat(ltv) <= 40 ? '#2e7d32' : '#e65100' }}>{ltv}%</div>
                              <div style={{ fontSize: 10, color: '#94a3b8' }}>เกณฑ์ 30–40%</div>
                            </div>
                          )}
                        </div>
                      )}
                      <DocGroup title="รูปทรัพย์" icon="fa-images" color="#7b1fa2" docs={propImgs.map((src, i) => ({ label: `รูปทรัพย์ #${i + 1}`, src }))} onPreview={setPreview} />
                      <DocGroup title="บัตรประชาชนลูกหนี้" icon="fa-id-card" color="#1565c0" docs={idCardImgs.map((src, i) => ({ label: `บัตร ปชช. #${i + 1}`, src }))} onPreview={setPreview} />
                      <DocGroup title="เอกสารโฉนด / สำเนาโฉนด" icon="fa-file-alt" color="#6a1b9a" docs={deedImgs.map((src, i) => ({ label: `โฉนด #${i + 1}`, src }))} onPreview={setPreview} />
                      <DocGroup title="ใบอนุญาตสิ่งปลูกสร้าง" icon="fa-hard-hat" color="#e65100" docs={permitImgs.map((src, i) => ({ label: `ใบอนุญาต #${i + 1}`, src }))} onPreview={setPreview} />
                      <DocGroup title="รูปประเมิน / สมุดประเมิน" icon="fa-search" color="#4527a0"
                        docs={[...appraisalImgs.map((src, i) => ({ label: `รูปประเมิน #${i + 1}`, src })), { label: 'สมุดประเมิน', src: docs.appraisal_book_image }]}
                        onPreview={setPreview} />
                      {videoImgs.length > 0 && (
                        <DocGroup title="วีดีโอทรัพย์" icon="fa-video" color="#c62828" docs={videoImgs.map((src, i) => ({ label: `วิดีโอ #${i + 1}`, src }))} onPreview={setPreview} />
                      )}
                      <DocGroup title="ใบเสียภาษีที่ดิน" icon="fa-file-invoice" color="#558b2f"
                        docs={landTaxDocs.map((src, i) => ({ label: `ใบเสียภาษี #${i + 1}`, src }))} onPreview={setPreview} />
                      <DocGroup title="ทะเบียนบ้าน" icon="fa-home" color="#00695c"
                        docs={houseRegDocs.map((src, i) => ({ label: `ทะเบียนบ้าน #${i + 1}`, src }))} onPreview={setPreview} />
                    </SectionCard>
                  )}

                  {/* 3. บัญชีธนาคาร */}
                  <SectionCard title="บัญชีธนาคารลูกหนี้" icon="fa-university" color="#2e7d32">
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, fontStyle: 'italic' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 4, color: '#7c3aed' }}></i>
                      ข้อมูลบัญชีกรอกโดยฝ่ายนิติกรรม (อ่านอย่างเดียว)
                    </div>
                    {(docs.bank_account_number || docs.bank_name || docs.bank_account_name) ? (
                      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 2 }}>ธนาคาร</div>
                            <div style={{ fontWeight: 700, color: '#15803d' }}>{docs.bank_name || '-'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 2 }}>เลขบัญชี</div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>{docs.bank_account_number || '-'}</div>
                          </div>
                          {docs.bank_account_name && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 2 }}>ชื่อบัญชี</div>
                              <div style={{ fontWeight: 600, color: '#166534' }}>{docs.bank_account_name}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#9ca3af', fontSize: 13, padding: '10px 0', fontStyle: 'italic' }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }}></i>ยังไม่มีข้อมูลบัญชี — ฝ่ายนิติกรรมจะกรอก
                      </div>
                    )}
                    {docs.bank_book_file && (
                      <div style={{ marginTop: 4, padding: '8px 10px', background: '#e0f2f1', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-book" style={{ color: '#00695c' }}></i>
                        <span style={{ fontSize: 12, color: '#004d40', flex: 1 }}>สมุดบัญชีลูกหนี้ (อัพโหลดโดยนิติ)</span>
                        <button onClick={() => setPreview(docs.bank_book_file)} style={{ padding: '4px 10px', background: '#00695c', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                          <i className="fas fa-eye"></i> ดู
                        </button>
                      </div>
                    )}
                  </SectionCard>

                  {/* 4. นายหน้า */}
                  {hasAgent && (
                    <SectionCard title="นายหน้า" icon="fa-user-tie" color="#2e7d32">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                        <InfoRow label="ชื่อ-สกุล" value={docs.agent_name} />
                        <InfoRow label="เบอร์โทร" value={docs.agent_phone} />
                      </div>
                      {/* ★ Commission info from agent_accounting */}
                      {docs.agent_commission_amount > 0 && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginBottom: 3, textTransform: 'uppercase' }}>ค่าคอมมิชชั่นนายหน้า</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>
                              ฿{Number(docs.agent_commission_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: 11, color: '#4ade80' }}>ตั้งโดยฝ่ายออกสัญญา</div>
                          </div>
                          {docs.agent_commission_status && (() => {
                            const badge = { paid: { l: 'จ่ายแล้ว', bg: '#dcfce7', c: '#16a34a' }, pending: { l: 'รอตรวจสอบ', bg: '#fef3c7', c: '#d97706' }, unpaid: { l: 'ยังไม่จ่าย', bg: '#fee2e2', c: '#dc2626' } }[docs.agent_commission_status] || { l: docs.agent_commission_status, bg: '#f1f5f9', c: '#64748b' }
                            return <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: badge.bg, color: badge.c }}>{badge.l}</span>
                          })()}
                        </div>
                      )}
                      <DocGroup title="บัตรประชาชนนายหน้า" icon="fa-id-card" color="#1b5e20"
                        docs={[{ label: 'บัตร ปชช. นายหน้า', src: docs.agent_id_card }]} onPreview={setPreview} />
                      <DocGroup title="เอกสารนายหน้า" icon="fa-receipt" color="#2e7d32"
                        docs={[
                          { label: 'สมุดบัญชีนายหน้า (ยืนยันโดยฝ่ายนิติ)', src: docs.legal_agent_bank_book },
                          { label: 'สลิปค่านายหน้า (ฝ่ายนิติ)', src: docs.legal_agent_payment_slip },
                          { label: 'สลิปค่าคอม (บัญชีนายหน้า)', src: docs.agent_commission_slip },
                          { label: 'สลิปค่าคอม (ฝ่ายนิติ)', src: docs.commission_slip },
                        ]} onPreview={setPreview} />
                      {/* ★ บัญชีธนาคารนายหน้า (กรอกโดยฝ่ายนิติกรรม) */}
                      {(docs.agent_bank_name || docs.agent_bank_account_no || docs.agent_bank_account_name) && (
                        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className="fas fa-university"></i> บัญชีธนาคารนายหน้า (สำหรับโอนค่าคอมมิชชั่น)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                            {docs.agent_bank_name && (
                              <div>
                                <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600, marginBottom: 2 }}>ธนาคาร</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#78350f' }}>{docs.agent_bank_name}</div>
                              </div>
                            )}
                            {docs.agent_bank_account_no && (
                              <div>
                                <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600, marginBottom: 2 }}>เลขบัญชี</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#78350f', fontFamily: 'monospace' }}>{docs.agent_bank_account_no}</div>
                              </div>
                            )}
                            {docs.agent_bank_account_name && (
                              <div>
                                <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600, marginBottom: 2 }}>ชื่อบัญชี</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#78350f' }}>{docs.agent_bank_account_name}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </SectionCard>
                  )}

                  {/* 5. นายทุน */}
                  {hasInvestor && (
                    <SectionCard title="นายทุน" icon="fa-hand-holding-usd" color="#1976d2">
                      {investorName && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                          <InfoRow label="ชื่อ-สกุล" value={investorName} />
                          <InfoRow label="เบอร์โทร" value={investorPhone} />
                          <InfoRow label="รหัสนายทุน" value={investorCode} mono />
                        </div>
                      )}
                      {/* ★ ยอดเงินนายทุน + วันสัญญา (editable) */}
                      <div style={{ borderTop: '1px solid #e3f2fd', paddingTop: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', marginBottom: 10 }}>
                          <i className="fas fa-file-contract" style={{ marginRight: 6 }}></i>ยอดเงินนายทุน & วันสัญญา
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>ยอดเงินนายทุน (บาท)</label>
                            <input type="number" value={contractForm.investor_amount}
                              onChange={e => setContractForm(p => ({ ...p, investor_amount: e.target.value }))}
                              placeholder="0.00"
                              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #90caf9', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>วันเริ่มสัญญา</label>
                            <input type="date" value={contractForm.contract_start_date}
                              onChange={e => setContractForm(p => ({ ...p, contract_start_date: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #90caf9', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>วันครบกำหนด</label>
                            <input type="date" value={contractForm.contract_end_date}
                              onChange={e => setContractForm(p => ({ ...p, contract_end_date: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${docs.days_remaining !== null && docs.days_remaining <= 30 ? '#ef9a9a' : '#90caf9'}`, borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                          </div>
                        </div>
                        {/* Days remaining badge */}
                        {docs.contract_end_date && (() => {
                          const d = docs.days_remaining
                          const badge = d === null ? null : d < 0
                            ? { l: `หมดอายุแล้ว ${Math.abs(d)} วัน`, bg: '#1a1a1a', c: '#fff' }
                            : d <= 30
                            ? { l: `⚠️ เหลือ ${d} วัน`, bg: '#fef2f2', c: '#dc2626' }
                            : d <= 60
                            ? { l: `เหลือ ${d} วัน`, bg: '#fffbeb', c: '#d97706' }
                            : { l: `เหลือ ${d} วัน`, bg: '#f0fdf4', c: '#16a34a' }
                          return badge
                            ? <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: badge.bg, color: badge.c, marginBottom: 10 }}>{badge.l}</div>
                            : null
                        })()}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button onClick={saveContractInfo} disabled={contractSaving}
                            style={{ padding: '8px 18px', background: contractSaving ? '#94a3b8' : '#1976d2', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: contractSaving ? 'not-allowed' : 'pointer' }}>
                            {contractSaving ? <><i className="fas fa-spinner fa-spin"></i> บันทึก...</> : <><i className="fas fa-save"></i> บันทึก</>}
                          </button>
                          {contractMsg && <span style={{ fontSize: 12, fontWeight: 600, color: contractMsg.includes('สำเร็จ') ? '#1976d2' : '#dc2626' }}>{contractMsg}</span>}
                        </div>
                      </div>
                      <DocGroup title="สลิปถอนเงินนายทุน" icon="fa-money-bill-wave" color="#2e7d32"
                        docs={investorSlips.map((src, i) => ({ label: `สลิปนายทุน #${i + 1}`, src }))} onPreview={setPreview} />
                      {docs.transfer_slip && (
                        <DocGroup title="สลิปโอนเงิน (กรมที่ดิน)" icon="fa-receipt" color="#1565c0"
                          docs={[{ label: 'สลิปโอนเงินหลังนัดโอน', src: docs.transfer_slip }]} onPreview={setPreview} />
                      )}
                      {/* ★ บัญชีธนาคารนายทุน (กรอกโดยฝ่ายประมูล) */}
                      <div style={{ marginTop: 12, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <i className="fas fa-university"></i> บัญชีธนาคารนายทุน (กรอกโดยฝ่ายนิติกรรม)
                        </div>
                        {(docs.auc_bank_name || docs.auc_bank_account_no || docs.auc_bank_account_name) ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                            {docs.auc_bank_name && (
                              <div>
                                <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 600, marginBottom: 2 }}>ธนาคาร</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>{docs.auc_bank_name}</div>
                              </div>
                            )}
                            {docs.auc_bank_account_no && (
                              <div>
                                <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 600, marginBottom: 2 }}>เลขบัญชี</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', fontFamily: 'monospace' }}>{docs.auc_bank_account_no}</div>
                              </div>
                            )}
                            {docs.auc_bank_account_name && (
                              <div>
                                <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 600, marginBottom: 2 }}>ชื่อบัญชี</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>{docs.auc_bank_account_name}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>
                            <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }}></i>ยังไม่มีข้อมูลบัญชี — ฝ่ายนิติกรรมจะกรอก
                          </div>
                        )}
                        {docs.auc_bank_book_file && (
                          <div style={{ marginTop: 8, padding: '6px 10px', background: '#dbeafe', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fas fa-book" style={{ color: '#1e40af' }}></i>
                            <span style={{ fontSize: 12, color: '#1e3a8a', flex: 1 }}>สมุดบัญชีนายทุน (อัพโหลดโดยนิติ)</span>
                            <button onClick={() => setPreview(docs.auc_bank_book_file)} style={{ padding: '4px 10px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                              <i className="fas fa-eye"></i> ดู
                            </button>
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  )}

                  {/* 6. สลิปลูกหนี้ */}
                  <DocSection title="สลิปลูกหนี้ (ฝ่ายประเมิน / บัญชีลูกหนี้)" icon="fa-receipt" color="#e65100" onPreview={setPreview}
                    docs={[
                      { label: 'สลิป (ฝ่ายขาย)', src: docs.case_slip_image },
                      { label: 'สลิปโอนค่าประเมิน', src: docs.slip_image },
                      { label: 'สลิปค่าประเมิน', src: docs.appraisal_slip },
                      { label: 'สลิปค่าปากถุง', src: docs.bag_fee_slip },
                      { label: 'สลิปค่าขายสัญญา', src: docs.contract_sale_slip },
                      { label: 'สลิปค่าไถ่ถอน', src: docs.redemption_slip },
                      { label: 'สลิปทรัพย์หลุด', src: docs.property_forfeited_slip },
                      { label: 'สลิปค่าดำเนินการ (กรมที่ดิน)', src: docs.issuing_commission_slip },
                    ]} />

                  {/* 6.1 รวมสลิปการเงินทุกแผนก */}
                  <SectionCard title="รวมสลิปการเงินทุกแผนก" icon="fa-file-invoice-dollar" color="#1a237e">
                    <DocGroup title="แผนกขาย / ประเมิน" icon="fa-chart-pie" color="#2e7d32" 
                      docs={[
                        { label: 'สลิป (ฝ่ายขาย)', src: docs.case_slip_image },
                        { label: 'สลิปโอนค่าประเมิน', src: docs.slip_image },
                        { label: 'สลิปค่าประเมิน (ทางกาาร)', src: docs.appraisal_slip },
                      ]} onPreview={setPreview} />
                    <DocGroup title="แผนกออกสัญญา / นิติกรรม" icon="fa-file-contract" color="#1565c0"
                      docs={[
                        { label: 'สลิปค่าดำเนินการ (กรมที่ดิน)', src: docs.issuing_commission_slip },
                        { label: 'สลิปค่าคอมมิชชั่น (ฝ่ายนิติ)', src: docs.commission_slip },
                        { label: 'สลิปโอนเงินหลังนัดโอน', src: docs.transfer_slip },
                      ]} onPreview={setPreview} />
                    <DocGroup title="บัญชีลูกหนี้ / นายหน้า / นายทุน" icon="fa-wallet" color="#e65100"
                      docs={[
                        { label: 'สลิปค่าปากถุง', src: docs.bag_fee_slip },
                        { label: 'สลิปค่าขายสัญญา', src: docs.contract_sale_slip },
                        { label: 'สลิปค่าไถ่ถอน', src: docs.redemption_slip },
                        { label: 'สลิปทรัพย์หลุด', src: docs.property_for_feited_slip },
                        { label: 'สลิปค่าคอม (บัญชีนายหน้า)', src: docs.agent_commission_slip },
                        ...parseJsonArr(docs.investor_slips).map((src, i) => ({ label: `สลิปนายทุน #${i + 1}`, src })),
                      ]} onPreview={setPreview} />
                  </SectionCard>

                  {/* 7. เอกสารฝ่ายนิติ */}
                  <DocSection title="เอกสารฝ่ายนิติ" icon="fa-gavel" color="#4527a0" onPreview={setPreview}
                    docs={[
                      { label: 'เอกสารแนบ', src: docs.legal_attachment },
                      { label: 'สลิปค่าคอม (ฝ่ายนิติ)', src: docs.commission_slip },
                      { label: 'สัญญาขายฝาก', src: docs.doc_selling_pledge },
                      { label: 'โฉนดขายฝาก', src: docs.deed_selling_pledge },
                      { label: 'สัญญาต่อสัญญา', src: docs.doc_extension },
                      { label: 'โฉนดต่อสัญญา', src: docs.deed_extension },
                      { label: 'สัญญาไถ่ถอน', src: docs.doc_redemption },
                      { label: 'โฉนดไถ่ถอน', src: docs.deed_redemption },
                    ]} />

                  {/* 8. เอกสารฝ่ายประมูล */}
                  {(() => {
                    const aucDocs = [
                      ...auctionParse(docs.spouse_consent_doc).map((src, i) => ({ label: `ใบยินยอมคู่สมรส #${i+1}`, src })),
                      ...auctionParse(docs.spouse_id_card).map((src, i) => ({ label: `บัตร ปชช. คู่สมรส #${i+1}`, src })),
                      ...auctionParse(docs.spouse_reg_copy).map((src, i) => ({ label: `ทะเบียนบ้านคู่สมรส #${i+1}`, src })),
                      ...auctionParse(docs.marriage_cert).map((src, i) => ({ label: `ทะเบียนสมรส #${i+1}`, src })),
                      ...auctionParse(docs.spouse_name_change_doc).map((src, i) => ({ label: `ใบเปลี่ยนชื่อคู่สมรส #${i+1}`, src })),
                    ]
                    return <DocSection title="เอกสารฝ่ายประมูล" icon="fa-hammer" color="#f59e0b" onPreview={setPreview} docs={aucDocs} />
                  })()}

                  {/* 9. ตารางวงเงิน */}
                  <DocSection title="ตารางวงเงิน" icon="fa-calculator" color="#6a1b9a" onPreview={setPreview}
                    docs={[{ label: 'ตารางวงเงิน', src: docs.credit_table_file }]} />
                </>
          }
        </div>
      </div>
      <ImgPreview src={preview} onClose={() => setPreview(null)} />
    </>
  )
}

// ============================================================
// PAGINATION
// ============================================================
function Pagination({ total, page, setPage }) {
  const totalPages = Math.ceil(total / PER_PAGE)
  if (totalPages <= 1) return null
  const s1 = (page - 1) * PER_PAGE + 1, e1 = Math.min(page * PER_PAGE, total)
  let pages = [], mx = 5
  let s = Math.max(1, page - Math.floor(mx / 2))
  let e = Math.min(totalPages, s + mx - 1)
  if (e - s < mx - 1) s = Math.max(1, e - mx + 1)
  for (let i = s; i <= e; i++) pages.push(i)
  const btn = (a) => ({
    padding: '6px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer',
    fontSize: 13, fontWeight: a ? 700 : 400, minWidth: 36, textAlign: 'center',
    background: a ? 'var(--primary)' : '#fff', color: a ? '#fff' : '#333', transition: 'all 0.15s'
  })
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginTop: 8 }}>
      <span style={{ fontSize: 13, color: '#888' }}>แสดง {s1} ถึง {e1} จาก {total} รายการ</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={btn(false)} onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>‹</button>
        {pages.map(p => <button key={p} style={btn(p === page)} onClick={() => setPage(p)}>{p}</button>)}
        <button style={btn(false)} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>›</button>
      </div>
    </div>
  )
}

// ============================================================
// CASES TAB
// ============================================================
function CasesTab({ q, searchField, onOpenCase }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  const fetchCases = useCallback(() => {
    setLoading(true)
    fetch(`${API}/cases-docs`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => { if (d.success) setCases(d.data || []) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchCases() }, [fetchCases])
  useEffect(() => { setPage(1) }, [q, searchField])

  const filtered = cases.filter(c => {
    if (!q) return true
    const lq = q.toLowerCase()
    if (searchField === 'debtor_name') return c.debtor_name?.toLowerCase().includes(lq)
    if (searchField === 'debtor_phone') return c.debtor_phone?.includes(q)
    if (searchField === 'debtor_code') return c.debtor_code?.includes(q)
    if (searchField === 'case_code') return c.case_code?.includes(q)
    if (searchField === 'agent_name') return c.agent_name?.toLowerCase().includes(lq)
    return (c.debtor_name?.toLowerCase().includes(lq) || c.debtor_phone?.includes(q) ||
      c.debtor_code?.includes(q) || c.case_code?.includes(q) || c.agent_name?.toLowerCase().includes(lq))
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  if (loading) return <div className="empty-state"><i className="fas fa-spinner fa-spin"></i><p>กำลังโหลด...</p></div>

  return (
    <div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
        พบ <strong style={{ color: 'var(--primary)' }}>{filtered.length}</strong> รายการ
      </div>
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสลูกหนี้</th>
              <th>ชื่อ-สกุล</th>
              <th>เบอร์โทร</th>
              <th>นายหน้า</th>
              <th>รหัสเคส</th>
              <th>ประเภท</th>
              <th>สถานะ</th>
              <th style={{ textAlign: 'center' }}>บัญชี</th>
              <th style={{ textAlign: 'center' }}>ไฟล์</th>
              <th style={{ textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {!paged.length
              ? <tr><td colSpan="11"><div className="empty-state"><i className="fas fa-inbox"></i><p>ไม่พบข้อมูล</p></div></td></tr>
              : paged.map((c, i) => (
                <tr key={c.loan_request_id}>
                  <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                  <td><strong style={{ color: 'var(--primary)' }}>{c.debtor_code || '-'}</strong></td>
                  <td>
                    <strong style={{ cursor: 'pointer', color: '#1e293b' }} onClick={() => navigate(`/accounting/debtor/edit/${c.loan_request_id}`)}>
                      {c.debtor_name || '-'} <i className="fas fa-external-link-alt" style={{ fontSize: 9, color: '#94a3b8' }}></i>
                    </strong>
                  </td>
                  <td>{c.debtor_phone || '-'}</td>
                  <td>{c.agent_name || <span style={{ color: '#ddd' }}>-</span>}</td>
                  <td><strong>{c.case_code || <span style={{ color: '#ddd', fontWeight: 400 }}>-</span>}</strong></td>
                  <td>
                    {c.loan_type_detail === 'mortgage'
                      ? <span className="badge badge-auction">จำนอง</span>
                      : c.loan_type_detail === 'selling_pledge'
                      ? <span className="badge badge-approve">ขายฝาก</span>
                      : <span style={{ color: '#ccc', fontSize: 12 }}>-</span>}
                  </td>
                  <td>
                    {c.case_status
                      ? <span className={`badge ${STATUS_BADGE[c.case_status] || 'badge-pending'}`}>{STATUS_LABEL[c.case_status] || c.case_status}</span>
                      : <span style={{ color: '#ddd' }}>-</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {c.bank_account_number
                      ? <span title={`${c.bank_name || ''} · ${c.bank_account_number}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: '#dcfce7' }}>
                          <i className="fas fa-check" style={{ color: '#16a34a', fontSize: 10 }}></i>
                        </span>
                      : <span style={{ color: '#e2e8f0' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: (c.doc_count || 0) > 0 ? 'var(--primary)' : '#ddd' }}>{c.doc_count || 0}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => onOpenCase(c)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #2e7d32', background: '#f0fff4', color: '#2e7d32', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#2e7d32'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#2e7d32' }}>
                      <i className="fas fa-folder-open"></i> ดูเอกสาร
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} />
    </div>
  )
}

// ============================================================
// AGENT PAYMENT MODAL — บันทึกค่าคอม + อัพโหลดสลิป (quick-pay)
// ============================================================
function AgentPaymentModal({ agent, onClose, onSaved }) {
  const [slip, setSlip] = useState(null)
  const [status, setStatus] = useState(agent.commission_status || 'unpaid')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSave = async () => {
    setSaving(true); setMsg('')
    const fd = new FormData()
    fd.append('payment_status', status)
    if (slip) fd.append('commission_slip', slip)
    try {
      const res = await fetch(`${API}/agent-payment/${agent.agent_id}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token()}` }, body: fd
      })
      const d = await res.json()
      setMsg(d.success ? 'บันทึกสำเร็จ ✓' : (d.message || 'ผิดพลาด'))
      if (d.success) setTimeout(() => { onSaved(); onClose() }, 800)
    } catch { setMsg('เกิดข้อผิดพลาด') }
    setSaving(false)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10001, background: '#fff', borderRadius: 16, padding: '24px 28px', width: 420, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>
              <i className="fas fa-receipt" style={{ marginRight: 6, color: '#2e7d32' }}></i>บันทึกค่าคอมมิชชั่น
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              {agent.agent_name} <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{agent.agent_code}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: '#475569' }}>✕</button>
        </div>

        {/* Commission Amount Banner */}
        {agent.commission_amount > 0
          ? <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-coins" style={{ color: '#fff', fontSize: 16 }}></i>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>ค่าคอมมิชชั่น (จากฝ่ายออกสัญญา)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', lineHeight: 1.2 }}>
                  ฿{Number(agent.commission_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          : <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i>ยังไม่มียอดค่าคอม — ให้ฝ่ายออกสัญญาบันทึกก่อน
            </div>
        }

        {/* Payment Status */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>สถานะการจ่ายเงิน</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { v: 'unpaid', l: 'ยังไม่จ่าย', c: '#dc2626', bg: '#fef2f2' },
              { v: 'pending', l: 'รอตรวจสอบ', c: '#d97706', bg: '#fffbeb' },
              { v: 'paid', l: 'จ่ายแล้ว', c: '#16a34a', bg: '#f0fdf4' }
            ].map(opt => (
              <label key={opt.v} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 8px', border: `2px solid ${status === opt.v ? opt.c : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer', background: status === opt.v ? opt.bg : '#fff', transition: 'all 0.15s' }}>
                <input type="radio" name="pay_status" value={opt.v} checked={status === opt.v} onChange={() => setStatus(opt.v)} style={{ accentColor: opt.c }} />
                <span style={{ fontWeight: 700, color: status === opt.v ? opt.c : '#64748b', fontSize: 12 }}>{opt.l}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Slip Upload */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
            อัพโหลดสลิปการจ่าย <span style={{ fontWeight: 400, color: '#94a3b8' }}>(ถ้ามี)</span>
          </div>
          {agent.agent_commission_slip && (
            <div style={{ fontSize: 11, color: '#2e7d32', marginBottom: 8, padding: '5px 10px', background: '#f0fdf4', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-check-circle"></i>มีสลิปเดิมแล้ว — อัพโหลดใหม่เพื่อแทนที่
            </div>
          )}
          <input type="file" accept=".pdf,.png,.jpg,.jpeg"
            onChange={e => { setSlip(e.target.files[0] || null); setMsg('') }}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>

        {/* Message */}
        {msg && (
          <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: msg.includes('สำเร็จ') ? '#f0fdf4' : '#fef2f2', color: msg.includes('สำเร็จ') ? '#15803d' : '#dc2626', fontSize: 13, fontWeight: 600 }}>
            {msg}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '10px', background: saving ? '#94a3b8' : '#2e7d32', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึก</>}
          </button>
        </div>
      </div>
    </>
  )
}

// ============================================================
// AGENTS TAB
// ============================================================
function AgentsTab({ q, searchField, onOpenCase }) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState(null)
  const [payAgent, setPayAgent] = useState(null) // agent row for payment modal

  const fetchAgents = useCallback(() => {
    setLoading(true)
    fetch(`${API}/agents-docs`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => { if (d.success) setAgents(d.data || []) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])
  useEffect(() => { setPage(1) }, [q])

  const filtered = agents.filter(a => {
    if (!q) return true
    const lq = q.toLowerCase()
    if (searchField === 'agent_name') return a.agent_name?.toLowerCase().includes(lq)
    if (searchField === 'agent_phone') return a.agent_phone?.includes(q)
    if (searchField === 'agent_code') return a.agent_code?.includes(q)
    return (a.agent_name?.toLowerCase().includes(lq) || a.agent_phone?.includes(q) || a.agent_code?.includes(q))
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  if (loading) return <div className="empty-state"><i className="fas fa-spinner fa-spin"></i><p>กำลังโหลด...</p></div>

  const PAYMENT_BADGE = {
    paid: { label: 'จ่ายแล้ว', bg: '#dcfce7', color: '#16a34a' },
    pending: { label: 'รอตรวจสอบ', bg: '#fef3c7', color: '#d97706' },
    unpaid: { label: 'ยังไม่จ่าย', bg: '#fee2e2', color: '#dc2626' },
  }

  return (
    <div>
      <ImgPreview src={preview} onClose={() => setPreview(null)} />
      {payAgent && (
        <AgentPaymentModal
          agent={payAgent}
          onClose={() => setPayAgent(null)}
          onSaved={fetchAgents}
        />
      )}
      <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
        พบ <strong style={{ color: 'var(--primary)' }}>{filtered.length}</strong> นายหน้า
      </div>
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสนายหน้า</th>
              <th>ชื่อ-สกุล</th>
              <th>เบอร์โทร</th>
              <th style={{ textAlign: 'center' }}>เคส</th>
              <th style={{ textAlign: 'right' }}>ค่าคอม</th>
              <th style={{ textAlign: 'center' }}>สถานะ</th>
              <th style={{ textAlign: 'center' }}>สลิป</th>
              <th style={{ textAlign: 'center' }}>บัตร ปชช.</th>
              <th>เคสล่าสุด</th>
              <th style={{ textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {!paged.length
              ? <tr><td colSpan="11"><div className="empty-state"><i className="fas fa-user-tie"></i><p>ไม่พบนายหน้า</p></div></td></tr>
              : paged.map((ag, i) => {
                  const cases = (ag.cases_info || '').split(';;').filter(Boolean).map(ci => { const p = ci.split('||'); return { case_id: p[0], case_code: p[1], debtor_name: p[2], debtor_code: p[3], loan_request_id: p[4] } })
                  const firstCase = cases[0]
                  const payBadge = PAYMENT_BADGE[ag.commission_status] || PAYMENT_BADGE.unpaid
                  const hasCommission = ag.commission_amount && parseFloat(ag.commission_amount) > 0
                  return (
                    <tr key={ag.agent_id}>
                      <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                      <td><strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{ag.agent_code || '-'}</strong></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {ag.agent_id_card
                            ? <img src={ag.agent_id_card} alt="ID" onClick={() => setPreview(ag.agent_id_card)} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', cursor: 'pointer', border: '1.5px solid #e2e8f0', flexShrink: 0 }} />
                            : <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #dcfce7', flexShrink: 0 }}>
                                <i className="fas fa-user-tie" style={{ color: '#2e7d32', fontSize: 14 }}></i>
                              </div>}
                          <strong style={{ cursor: 'pointer' }} onClick={() => navigate(`/accounting/agent/edit/${ag.agent_id}`)}>
                            {ag.agent_name} <i className="fas fa-external-link-alt" style={{ fontSize: 9, color: '#94a3b8' }}></i>
                          </strong>
                        </div>
                      </td>
                      <td>{ag.agent_phone || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>{ag.case_count || 0}</span>
                      </td>
                      {/* ★ NEW: ค่าคอม */}
                      <td style={{ textAlign: 'right' }}>
                        {hasCommission
                          ? <span style={{ fontWeight: 700, color: '#15803d', fontFamily: 'monospace', fontSize: 13 }}>
                              ฿{Number(ag.commission_amount).toLocaleString('th-TH')}
                            </span>
                          : <span style={{ color: '#cbd5e1', fontSize: 12 }}>-</span>}
                      </td>
                      {/* ★ NEW: สถานะจ่าย */}
                      <td style={{ textAlign: 'center' }}>
                        {hasCommission
                          ? <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: payBadge.bg, color: payBadge.color }}>
                              {payBadge.label}
                            </span>
                          : <span style={{ color: '#e2e8f0' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {ag.agent_commission_slip
                          ? <button onClick={() => setPreview(ag.agent_commission_slip)} style={{ padding: '4px 10px', background: '#f0fdf4', border: '1px solid #2e7d32', color: '#2e7d32', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                              <i className="fas fa-receipt"></i> ดู
                            </button>
                          : <span style={{ color: '#ddd' }}>-</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {ag.agent_id_card
                          ? <button onClick={() => setPreview(ag.agent_id_card)} style={{ padding: '4px 10px', background: '#fff8f0', border: '1px solid #e67e22', color: '#e67e22', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                              <i className="fas fa-id-card"></i> ดู
                            </button>
                          : <span style={{ color: '#ddd' }}>-</span>}
                      </td>
                      <td>
                        {firstCase && firstCase.loan_request_id
                          ? <button onClick={() => onOpenCase({ loan_request_id: firstCase.loan_request_id, debtor_name: firstCase.debtor_name, case_code: firstCase.case_code, debtor_code: firstCase.debtor_code })}
                              style={{ fontSize: 12, color: '#2e7d32', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, textDecoration: 'underline' }}>
                              {firstCase.case_code || firstCase.debtor_name || '-'}
                              {cases.length > 1 && <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>+{cases.length - 1}</span>}
                            </button>
                          : <span style={{ color: '#ddd' }}>-</span>}
                      </td>
                      {/* ★ Updated: จัดการ — เพิ่มปุ่มบันทึกค่าคอม */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {hasCommission && (
                            <button onClick={() => setPayAgent(ag)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: `1px solid ${ag.commission_status === 'paid' ? '#16a34a' : '#f59e0b'}`, background: ag.commission_status === 'paid' ? '#f0fdf4' : '#fffbeb', color: ag.commission_status === 'paid' ? '#16a34a' : '#d97706', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              <i className="fas fa-coins"></i> {ag.commission_status === 'paid' ? 'แก้ไข' : 'จ่ายค่าคอม'}
                            </button>
                          )}
                          {firstCase && firstCase.loan_request_id && (
                            <button onClick={() => onOpenCase({ loan_request_id: firstCase.loan_request_id, debtor_name: firstCase.debtor_name, case_code: firstCase.case_code, debtor_code: firstCase.debtor_code })}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: '1px solid #2e7d32', background: '#f0fff4', color: '#2e7d32', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#2e7d32'; e.currentTarget.style.color = '#fff' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#2e7d32' }}>
                              <i className="fas fa-folder-open"></i> เอกสาร
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} />
    </div>
  )
}

// ============================================================
// INVESTORS TAB
// ============================================================
function InvestorsTab({ q, searchField, onOpenCase }) {
  const [investors, setInvestors] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState(null)
  const navigate = useNavigate()

  const fetchInvestors = useCallback(() => {
    setLoading(true)
    fetch(`${API}/investors-docs`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => { if (d.success) setInvestors(d.data || []) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchInvestors() }, [fetchInvestors])
  useEffect(() => { setPage(1) }, [q] )

  const filtered = investors.filter(inv => {
    if (!q) return true
    const lq = q.toLowerCase()
    if (searchField === 'investor_name') return inv.investor_name?.toLowerCase().includes(lq)
    if (searchField === 'investor_phone') return inv.investor_phone?.includes(q)
    if (searchField === 'investor_code') return inv.investor_code?.includes(q)
    return (inv.investor_name?.toLowerCase().includes(lq) || inv.investor_phone?.includes(q) || inv.investor_code?.includes(q))
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  if (loading) return <div className="empty-state"><i className="fas fa-spinner fa-spin"></i><p>กำลังโหลด...</p></div>

  return (
    <div>
      <ImgPreview src={preview} onClose={() => setPreview(null)} />
      <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
        พบ <strong style={{ color: 'var(--primary)' }}>{filtered.length}</strong> นายทุน
      </div>
      <div className="table-responsive">
        <table className="table-green">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสนายทุน</th>
              <th>ชื่อ-สกุล</th>
              <th>เบอร์โทร</th>
              <th style={{ textAlign: 'center' }}>สลิปมัดจำ 1%</th>
              <th style={{ textAlign: 'center' }}>สลิป</th>
              <th>เคสที่เกี่ยวข้อง</th>
              <th style={{ textAlign: 'center' }}>สลิปถอนเงิน</th>
              <th style={{ textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {!paged.length
              ? <tr><td colSpan="9"><div className="empty-state"><i className="fas fa-hand-holding-usd"></i><p>ไม่พบนายทุน</p></div></td></tr>
              : paged.map((inv, i) => {
                  const slips = (inv.investor_slips || '').split('|').filter(Boolean)
                  const cases = (inv.cases_info || '').split(';;').filter(Boolean).map(ci => { const p = ci.split('||'); return { case_code: p[0], debtor_name: p[1], debtor_code: p[2], loan_request_id: p[3] } })
                  const validCases = cases.filter(c => c.case_code || c.debtor_name)
                  const firstCase = validCases[0]
                  return (
                    <tr key={inv.investor_id}>
                      <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                      <td><strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{inv.investor_code || '-'}</strong></td>
                      <td>
                        <strong style={{ cursor: 'pointer' }} onClick={() => navigate(`/accounting/investor/edit/${inv.investor_id}`)}>
                          {inv.investor_name || '-'} <i className="fas fa-external-link-alt" style={{ fontSize: 9, color: '#94a3b8' }}></i>
                        </strong>
                      </td>
                      <td>{inv.investor_phone || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {inv.deposit_slip
                          ? <button onClick={() => setPreview(inv.deposit_slip.startsWith('/') ? inv.deposit_slip : `/${inv.deposit_slip}`)}
                              style={{ padding: '4px 10px', background: '#fffbeb', border: '1px solid #d97706', color: '#b45309', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                              <i className="fas fa-receipt"></i> ดูสลิป
                            </button>
                          : <span style={{ color: '#ddd', fontSize: 12 }}>-</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: slips.length > 0 ? 'var(--primary)' : '#ddd' }}>{slips.length}</span>
                      </td>
                      <td>
                        {firstCase && firstCase.loan_request_id
                          ? <button onClick={() => onOpenCase({ loan_request_id: firstCase.loan_request_id, debtor_name: firstCase.debtor_name, case_code: firstCase.case_code, debtor_code: firstCase.debtor_code })}
                              style={{ fontSize: 12, color: '#2e7d32', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, textDecoration: 'underline' }}>
                              {firstCase.case_code || firstCase.debtor_name || '-'}
                              {validCases.length > 1 && <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>+{validCases.length - 1}</span>}
                            </button>
                          : <span style={{ color: '#ddd' }}>-</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {slips.length > 0
                          ? <button onClick={() => setPreview(slips[0])} style={{ padding: '4px 10px', background: '#f0fdf4', border: '1px solid #2e7d32', color: '#2e7d32', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                              <i className="fas fa-money-bill-wave"></i> ดู{slips.length > 1 ? ` (${slips.length})` : ''}
                            </button>
                          : <span style={{ color: '#ddd' }}>-</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {/* ★ ปุ่มพอร์ตโฟลิโอนายทุน */}
                          <button onClick={() => navigate(`/accounting/investor/${inv.investor_id}/cases`)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: '1px solid #1976d2', background: '#e3f2fd', color: '#1976d2', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <i className="fas fa-chart-pie"></i> พอร์ตโฟลิโอ
                          </button>
                          {firstCase && firstCase.loan_request_id && (
                            <button onClick={() => onOpenCase({ loan_request_id: firstCase.loan_request_id, debtor_name: firstCase.debtor_name, case_code: firstCase.case_code, debtor_code: firstCase.debtor_code })}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: '1px solid #2e7d32', background: '#f0fff4', color: '#2e7d32', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#2e7d32'; e.currentTarget.style.color = '#fff' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#2e7d32' }}>
                              <i className="fas fa-folder-open"></i> เอกสาร
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} />
    </div>
  )
}

// ============================================================
// CONTRACT EXPIRY TAB
// ============================================================
function ContractExpiryTab({ q, onOpenCase }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all') // all | urgent | soon | ok | expired
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/contract-expiry`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => { if (d.success) setRows(d.data || []) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])
  useEffect(() => { setPage(1) }, [q, filter])

  const filtered = rows.filter(r => {
    const d = r.days_remaining
    if (filter === 'expired') return d !== null && d < 0
    if (filter === 'urgent') return d !== null && d >= 0 && d <= 30
    if (filter === 'soon') return d !== null && d > 30 && d <= 60
    if (filter === 'ok') return d !== null && d > 60
    return true
  }).filter(r => {
    if (!q) return true
    const lq = q.toLowerCase()
    return r.debtor_name?.toLowerCase().includes(lq) || r.case_code?.includes(q) || r.debtor_code?.includes(q)
  })
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const daysLabel = (d) => {
    if (d === null || d === undefined) return { l: '-', bg: '#f1f5f9', c: '#94a3b8' }
    if (d < 0) return { l: `หมดอายุ ${Math.abs(d)} วัน`, bg: '#1e1e2e', c: '#f87171' }
    if (d <= 30) return { l: `⚠️ ${d} วัน`, bg: '#fef2f2', c: '#dc2626' }
    if (d <= 60) return { l: `${d} วัน`, bg: '#fffbeb', c: '#d97706' }
    return { l: `${d} วัน`, bg: '#f0fdf4', c: '#16a34a' }
  }
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

  const counts = {
    all: rows.length,
    expired: rows.filter(r => r.days_remaining !== null && r.days_remaining < 0).length,
    urgent: rows.filter(r => r.days_remaining !== null && r.days_remaining >= 0 && r.days_remaining <= 30).length,
    soon: rows.filter(r => r.days_remaining !== null && r.days_remaining > 30 && r.days_remaining <= 60).length,
    ok: rows.filter(r => r.days_remaining !== null && r.days_remaining > 60).length,
  }

  const FILTERS = [
    { v: 'all', l: 'ทั้งหมด', bg: '#f1f5f9', c: '#475569' },
    { v: 'expired', l: '⚫ หมดอายุแล้ว', bg: '#1e1e2e', c: '#f87171' },
    { v: 'urgent', l: '🔴 เร่งด่วน ≤30 วัน', bg: '#fef2f2', c: '#dc2626' },
    { v: 'soon', l: '🟡 ใกล้หมด 31-60 วัน', bg: '#fffbeb', c: '#d97706' },
    { v: 'ok', l: '🟢 ปกติ >60 วัน', bg: '#f0fdf4', c: '#16a34a' },
  ]

  if (loading) return <div className="empty-state"><i className="fas fa-spinner fa-spin"></i><p>กำลังโหลด...</p></div>

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${filter === f.v ? f.c : '#e2e8f0'}`, background: filter === f.v ? f.bg : '#fff', color: filter === f.v ? f.c : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
            {f.l} <span style={{ fontWeight: 400, marginLeft: 4 }}>({counts[f.v]})</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
        พบ <strong style={{ color: 'var(--primary)' }}>{filtered.length}</strong> เคสที่มีวันครบกำหนด
        {counts.urgent > 0 && <span style={{ marginLeft: 10, background: '#fef2f2', color: '#dc2626', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⚠️ เร่งด่วน {counts.urgent} เคส!</span>}
      </div>
      {rows.length === 0
        ? <div className="empty-state" style={{ padding: 40 }}>
            <i className="fas fa-calendar-check" style={{ fontSize: 40, color: '#94a3b8' }}></i>
            <p style={{ color: '#94a3b8', marginTop: 12 }}>ยังไม่มีเคสที่บันทึกวันครบกำหนด<br /><span style={{ fontSize: 12 }}>ไปที่ Tab นายทุน → กดปุ่ม "เอกสาร" → บันทึกวันสัญญาในส่วนนายทุน</span></p>
          </div>
        : <>
          <div className="table-responsive">
            <table className="table-green">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>รหัสเคส</th>
                  <th>ลูกหนี้</th>
                  <th>นายทุน</th>
                  <th>ประเภท</th>
                  <th style={{ textAlign: 'right' }}>ยอดนายทุน</th>
                  <th style={{ textAlign: 'center' }}>วันเริ่มสัญญา</th>
                  <th style={{ textAlign: 'center' }}>วันครบกำหนด</th>
                  <th style={{ textAlign: 'center' }}>เหลือ</th>
                  <th style={{ textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {!paged.length
                  ? <tr><td colSpan="10"><div className="empty-state"><i className="fas fa-filter"></i><p>ไม่พบเคสในกลุ่มนี้</p></div></td></tr>
                  : paged.map((r, i) => {
                      const badge = daysLabel(r.days_remaining)
                      const invInfo = (r.investor_info || '').split('|')
                      const invName = invInfo[1] || '-'
                      return (
                        <tr key={r.case_id} style={{ background: r.days_remaining !== null && r.days_remaining < 0 ? '#fef2f2' : r.days_remaining <= 30 ? '#fff7ed' : undefined }}>
                          <td>{String((page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
                          <td><strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{r.case_code || '-'}</strong></td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.debtor_name || '-'}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.debtor_code}</div>
                          </td>
                          <td style={{ fontSize: 12 }}>{invName}</td>
                          <td>
                            {r.loan_type_detail === 'selling_pledge'
                              ? <span className="badge badge-approve">ขายฝาก</span>
                              : r.loan_type_detail === 'mortgage'
                              ? <span className="badge badge-auction">จำนอง</span>
                              : <span style={{ color: '#ccc' }}>-</span>}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#15803d', fontWeight: 700 }}>
                            {r.investor_amount ? `฿${Number(r.investor_amount).toLocaleString('th-TH')}` : <span style={{ color: '#ddd' }}>-</span>}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12 }}>{fmtDate(r.contract_start_date)}</td>
                          <td style={{ textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{fmtDate(r.contract_end_date)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.c }}>{badge.l}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button onClick={() => onOpenCase({ loan_request_id: r.loan_request_id, case_code: r.case_code, debtor_name: r.debtor_name, debtor_code: r.debtor_code, case_status: r.case_status })}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #2e7d32', background: '#f0fff4', color: '#2e7d32', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#2e7d32'; e.currentTarget.style.color = '#fff' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#f0fff4'; e.currentTarget.style.color = '#2e7d32' }}>
                              <i className="fas fa-edit"></i> แก้ไข
                            </button>
                          </td>
                        </tr>
                      )
                    })}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} setPage={setPage} />
        </>
      }
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function AccountingPage() {
  const [tab, setTab] = useState('cases')
  const [selectedCase, setSelectedCase] = useState(null)
  const [q, setQ] = useState('')
  const [searchField, setSearchField] = useState('')
  const [stats, setStats] = useState({})

  useEffect(() => {
    fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => { if (d.success) setStats(d.stats || {}) }).catch(() => {})
  }, [])

  const TABS = [
    { id: 'cases', label: 'เคสทั้งหมด', icon: 'fa-folder' },
    { id: 'agents', label: 'นายหน้า', icon: 'fa-user-tie' },
    { id: 'investors', label: 'นายทุน', icon: 'fa-hand-holding-usd' },
    { id: 'expiry', label: 'ครบกำหนดสัญญา', icon: 'fa-calendar-exclamation' },
  ]

  const statCards = [
    { label: 'เคสทั้งหมด', value: stats.total_cases || 0, icon: 'fa-folder', color: 'primary' },
    { label: 'สำเร็จ', value: stats.completed || 0, icon: 'fa-check-double', color: 'green' },
    { label: 'รออนุมัติ', value: stats.pending_approve || 0, icon: 'fa-clock', color: 'yellow' },
    { label: 'ค่าประเมิน', value: stats.appraisal || 0, icon: 'fa-search-dollar', color: 'blue' },
    { label: 'ค่าคอมนายหน้า', value: stats.agent_commission || 0, icon: 'fa-user-tie', color: 'cyan' },
    { label: 'ยกเลิก', value: stats.cancelled || 0, icon: 'fa-times-circle', color: 'red' },
  ]

  const handleTabChange = (id) => { setTab(id); setQ(''); setSearchField('') }

  const searchOptions = {
    cases: [
      { value: '', label: 'ทั้งหมด' },
      { value: 'debtor_name', label: 'ชื่อลูกหนี้' },
      { value: 'debtor_phone', label: 'เบอร์โทร' },
      { value: 'debtor_code', label: 'รหัสลูกหนี้' },
      { value: 'case_code', label: 'รหัสเคส' },
      { value: 'agent_name', label: 'นายหน้า' },
    ],
    agents: [
      { value: '', label: 'ทั้งหมด' },
      { value: 'agent_name', label: 'ชื่อนายหน้า' },
      { value: 'agent_phone', label: 'เบอร์โทร' },
      { value: 'agent_code', label: 'รหัสนายหน้า' },
    ],
    investors: [
      { value: '', label: 'ทั้งหมด' },
      { value: 'investor_name', label: 'ชื่อนายทุน' },
      { value: 'investor_phone', label: 'เบอร์โทร' },
      { value: 'investor_code', label: 'รหัสนายทุน' },
    ],
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2><i className="fas fa-landmark" style={{ marginRight: 8, color: 'var(--primary)' }}></i>ฝ่ายบัญชี</h2>
          <p className="page-subtitle">รวมเอกสารจากทุกฝ่าย · บัตรประชาชน · สลิป · รูปทรัพย์ · ตารางวงเงิน · สมุดบัญชี</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sales-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`sales-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}>
            <i className={`fas ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="sales-filter-row">
        <select value={searchField} onChange={e => setSearchField(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 140 }}>
          {(searchOptions[tab] || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="search-wrapper">
          <i className="fas fa-search"></i>
          <input className="search-input" type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder={tab === 'cases' ? 'ค้นหาชื่อ, เบอร์, รหัสเคส, นายหน้า...' : tab === 'agents' ? 'ค้นหาชื่อนายหน้า, รหัส, เบอร์...' : 'ค้นหาชื่อนายทุน, รหัส, เบอร์...'} />
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'cases' && <CasesTab q={q} searchField={searchField} onOpenCase={setSelectedCase} />}
      {tab === 'agents' && <AgentsTab q={q} searchField={searchField} onOpenCase={setSelectedCase} />}
      {tab === 'investors' && <InvestorsTab q={q} searchField={searchField} onOpenCase={setSelectedCase} />}
      {tab === 'expiry' && <ContractExpiryTab q={q} onOpenCase={setSelectedCase} />}

      {/* Case Modal */}
      {selectedCase && <CaseModal caseRow={selectedCase} onClose={() => setSelectedCase(null)} />}
    </div>
  )
}

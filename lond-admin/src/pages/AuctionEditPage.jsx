import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/step-form.css'
import CancelCaseButton from '../components/CancelCaseButton'
import MapPreview from '../components/MapPreview'
import AgentCard from '../components/AgentCard'
import CaseInfoSummary from '../components/CaseInfoSummary'
import ChecklistDocsPanel from '../components/ChecklistDocsPanel'
import PropertyVideoPanel from '../components/PropertyVideoPanel'
import LandOfficeInput from '../components/LandOfficeInput'
import AppraisalStatusCard from '../components/AppraisalStatusCard'
import SlipVerifier from '../components/SlipVerifier'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/auction'
const INV_API = '/api/admin/investors'

const appraisalTypeLabel = { outside: 'ประเมินนอก', inside: 'ประเมินใน', check_price: 'เช็คราคา' }
const appraisalResultLabel = { passed: 'ผ่านมาตรฐาน', not_passed: 'ไม่ผ่านมาตรฐาน', '': 'ยังไม่ประเมิน' }
const propertyTypeLabel = {
  house: 'บ้าน', townhouse: 'ทาวน์โฮม', condo: 'คอนโด',
  single_house: 'บ้านเดี่ยว (สร้างเอง)', shophouse: 'ตึกแถว',
  apartment: 'หอพัก / อพาร์ตเมนต์', land: 'ที่ดินเปล่า', other: 'อื่นๆ'
}

const legalStatusOptions = [
  { value: 'pending', label: 'รอทำนิติกรรม' },
  { value: 'completed', label: 'ทำนิติกรรมเสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

const MARITAL_LABEL = {
  single: 'โสด', married_reg: 'สมรสจดทะเบียน', married_unreg: 'สมรสไม่จดทะเบียน',
  divorced: 'หย่า', inherited: 'รับมรดก',
}
const MARITAL_COLOR = {
  single: '#1565c0', married_reg: '#6a1b9a', married_unreg: '#e65100',
  divorced: '#c62828', inherited: '#2e7d32',
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMoney(n) {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('th-TH')
}

function toDateTimeInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 16)
}

const xBtnStyle = {
  position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%',
  background: '#e74c3c', border: '2px solid #fff', color: '#fff', fontSize: 9,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2, padding: 0, lineHeight: 1
}

export default function AuctionEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [caseData, setCaseData] = useState(null)
  const [checklistDocs, setChecklistDocs] = useState({})
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [investorList, setInvestorList] = useState([])

  // ประวัติการเสนอราคา
  const [bids, setBids] = useState([])
  const [bidForm, setBidForm] = useState({
    investor_id: '', investor_name: '', investor_code: '', investor_phone: '',
    bid_amount: '', bid_date: '', note: '', recorded_by: '', deposit_amount: ''
  })
  const [bidDepositFile, setBidDepositFile] = useState(null)
  const [bidDepositPreview, setBidDepositPreview] = useState(null) // base64 / object URL
  const [showBidForm, setShowBidForm] = useState(false)
  const [savingBid, setSavingBid] = useState(false)
  const [deletingBid, setDeletingBid] = useState(null)
  const [markingWinner, setMarkingWinner] = useState(null)
  const [previewSlip, setPreviewSlip] = useState(null)

  const EMPTY_NEW_INV = { full_name: '', phone: '', line_id: '', national_id: '', email: '' }

  // inline investor creation ในส่วน bid form
  const [bidInvMode, setBidInvMode] = useState('select') // 'select' | 'create'
  const [newBidInv, setNewBidInv] = useState({ ...EMPTY_NEW_INV })
  const [creatingBidInv, setCreatingBidInv] = useState(false)
  const [createdBidInvId, setCreatedBidInvId] = useState(null)
  const [bidIdCardFile, setBidIdCardFile] = useState(null)
  const [bidIdCardPreview, setBidIdCardPreview] = useState(null)
  const [ocrScanningBidInv, setOcrScanningBidInv] = useState(false)
  const [uploadingBidIdCard, setUploadingBidIdCard] = useState(false)
  const [bidIdCardMsg, setBidIdCardMsg] = useState('')

  // inline investor creation ในส่วน winning investor
  const [winInvMode, setWinInvMode] = useState('select') // 'select' | 'create'
  const [newWinInv, setNewWinInv] = useState({ ...EMPTY_NEW_INV })
  const [creatingWinInv, setCreatingWinInv] = useState(false)
  const [createdWinInvId, setCreatedWinInvId] = useState(null)
  const [ocrScanningWin, setOcrScanningWin] = useState(false)
  const [winIdCardPreview, setWinIdCardPreview] = useState(null)
  const [winIdCardFile, setWinIdCardFile] = useState(null)
  const [uploadingWinIdCard, setUploadingWinIdCard] = useState(false)
  const [winIdCardMsg, setWinIdCardMsg] = useState('')
  const [notifySalesOnSave, setNotifySalesOnSave] = useState(false)       // ★ แจ้งฝ่ายขาย
  const [notifyLegalOnSave, setNotifyLegalOnSave] = useState(false)       // ★ แจ้งฝ่ายนิติ
  const [notifyAccountingOnSave, setNotifyAccountingOnSave] = useState(false) // ★ แจ้งฝ่ายบัญชี

  // VDO — managed by PropertyVideoPanel

  const [form, setForm] = useState({
    investor_id: '', investor_name: '', investor_code: '', investor_phone: '', investor_line_id: '',
    investor_type: '', property_value: '', selling_pledge_amount: '', interest_rate: '',
    auction_land_area: '', contract_years: '',
    auction_status: 'pending', is_cancelled: 0,
    sale_type: 'auction', // 'auction' | 'direct' (ขายสด)
    recorded_by: '', recorded_at: '',
    // Legal/นิติกรรม shared fields
    officer_name: '', visit_date: '', land_office: '', time_slot: '', legal_status: 'pending',
  })

  // ดึงรายชื่อนายทุนสำหรับ dropdown
  useEffect(() => {
    fetch(INV_API, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setInvestorList(d.data || []) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    fetch(`${API}/cases/${id}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCaseData(d.caseData)
          setForm({
            investor_id: d.caseData.investor_id || '',
            investor_name: d.caseData.investor_name || '',
            investor_code: d.caseData.investor_code || '',
            investor_phone: d.caseData.investor_phone || '',
            investor_line_id: d.caseData.investor_line_id || '',
            investor_type: d.caseData.investor_type || '',
            property_value: d.caseData.property_value || '',
            selling_pledge_amount: d.caseData.selling_pledge_amount || '',
            interest_rate: d.caseData.interest_rate || '',
            auction_land_area: d.caseData.auction_land_area || '',
            contract_years: d.caseData.contract_years || '',
            auction_status: d.caseData.auction_status || 'pending',
            is_cancelled: d.caseData.is_cancelled || 0,
            sale_type: d.caseData.sale_type || 'auction',
            recorded_by: d.caseData.recorded_by || '',
            recorded_at: toDateTimeInput(d.caseData.recorded_at),
            // Legal/นิติกรรม shared fields (from legal_transactions via lt_ prefix)
            officer_name: d.caseData.lt_officer_name || '',
            visit_date: d.caseData.lt_visit_date ? d.caseData.lt_visit_date.substring(0, 10) : '',
            land_office: d.caseData.lt_land_office || '',
            time_slot: d.caseData.lt_time_slot || '',
            legal_status: d.caseData.lt_legal_status || 'pending',
          })
          // โหลดเอกสารนิติกรรม (auction_transactions)
          const docs = {}
          AUCTION_DOCS.forEach(({ field }) => {
            try { docs[field] = JSON.parse(d.caseData[field] || '[]') || [] } catch { docs[field] = [] }
          })
          setAuctionDocs(docs)
          // โหลด checklist docs (loan_requests — มาใน caseData จาก lr.*)
          const CHECKLIST_FIELDS = [
            'borrower_id_card','house_reg_book','name_change_doc','divorce_doc',
            'spouse_id_card','spouse_reg_copy','marriage_cert',
            'single_cert','death_cert','will_court_doc','testator_house_reg',
            // property-type checklist docs
            'deed_copy','building_permit','house_reg_prop','sale_contract','debt_free_cert',
            'blueprint','property_photos','land_tax_receipt','maps_url',
            'condo_title_deed','condo_location_map','common_fee_receipt','floor_plan',
            'location_sketch_map','land_use_cert','rental_contract','business_reg',
          ]
          const cl = {}
          CHECKLIST_FIELDS.forEach(f => {
            try { cl[f] = JSON.parse(d.caseData[f] || '[]') || [] } catch { cl[f] = [] }
          })
          setChecklistDocs(cl)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // โหลดประวัติการเสนอราคา
    fetch(`${API}/cases/${id}/bids`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setBids(d.bids || []) })
      .catch(() => {})
  }, [id])



  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // เมื่อเลือกนายทุน → auto-fill
  const handleInvestorSelect = (investorId) => {
    if (!investorId) {
      setForm(prev => ({ ...prev, investor_id: '', investor_name: '', investor_code: '', investor_phone: '' }))
      return
    }
    const inv = investorList.find(i => String(i.id) === String(investorId))
    if (inv) {
      setForm(prev => ({
        ...prev,
        investor_id: inv.id,
        investor_name: inv.full_name || '',
        investor_code: inv.investor_code || '',
        investor_phone: inv.phone || '',
        investor_line_id: inv.line_id || ''
      }))
    }
  }

  // เมื่อเลือกนายทุนใน bid form → auto-fill
  const handleBidInvestorSelect = (investorId) => {
    if (!investorId) {
      setBidForm(prev => ({ ...prev, investor_id: '', investor_name: '', investor_code: '', investor_phone: '' }))
      return
    }
    const inv = investorList.find(i => String(i.id) === String(investorId))
    if (inv) {
      setBidForm(prev => ({
        ...prev,
        investor_id: inv.id,
        investor_name: inv.full_name || '',
        investor_code: inv.investor_code || '',
        investor_phone: inv.phone || ''
      }))
    }
  }

  // สร้างนายทุน + เพิ่มการเสนอราคา + อัพโหลดสลิป ในปุ่มเดียว
  const handleCreateAndBid = async () => {
    const name = newBidInv.full_name.trim()
    if (!name) return alert('กรุณาระบุชื่อนายทุน')
    if (!bidForm.bid_amount) return alert('กรุณาระบุราคาเสนอ')
    setSavingBid(true)
    setBidIdCardMsg('')
    try {
      // 1) สร้างนายทุน
      const regRes = await fetch('/api/admin/auction/register-investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          full_name: name,
          phone: newBidInv.phone || '',
          line_id: newBidInv.line_id || '',
          national_id: newBidInv.national_id || '',
          email: newBidInv.email || '',
        })
      })
      const regData = await regRes.json()
      if (!regData.success) { alert(regData.message || 'สร้างนายทุนไม่สำเร็จ'); setSavingBid(false); return }

      const investorId = regData.id
      const investorCode = regData.investor_code
      const investorName = regData.full_name

      // อัพเดต list + form
      setInvestorList(prev => [{ id: investorId, full_name: investorName, phone: newBidInv.phone, investor_code: investorCode }, ...prev])

      // 2) อัพโหลด ID card ถ้ามี
      if (bidIdCardFile) {
        await handleUploadIdCard(investorId, bidIdCardFile, setUploadingBidIdCard, setBidIdCardMsg)
      }

      // 3) อัพโหลดสลิปมัดจำ → investors.deposit_slip (ฝ่ายบัญชี + โปรไฟล์นายทุน)
      if (bidDepositFile) {
        try {
          const fdSlip = new FormData()
          fdSlip.append('deposit_slip', bidDepositFile)
          await fetch(`${INV_API}/${investorId}/doc-upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token()}` },
            body: fdSlip
          })
        } catch {}
      }

      // 4) เพิ่มการเสนอราคา (bid) พร้อมสลิป
      const fd = new FormData()
      fd.append('investor_id', investorId)
      fd.append('investor_name', investorName)
      fd.append('investor_code', investorCode)
      fd.append('investor_phone', newBidInv.phone || '')
      fd.append('bid_amount', bidForm.bid_amount || '')
      fd.append('bid_date', bidForm.bid_date || '')
      fd.append('note', bidForm.note || '')
      fd.append('deposit_amount', bidForm.deposit_amount || '')
      if (bidDepositFile) fd.append('deposit_slip', bidDepositFile)
      const bidRes = await fetch(`${API}/cases/${id}/bids`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const bidData = await bidRes.json()
      if (bidData.success) {
        // reload bids
        const r2 = await fetch(`${API}/cases/${id}/bids`, { headers: { Authorization: `Bearer ${token()}` } })
        const d2 = await r2.json()
        if (d2.success) setBids(d2.bids || [])
        // reset form
        setBidForm({ investor_id: '', investor_name: '', investor_code: '', investor_phone: '', bid_amount: '', bid_date: '', note: '', recorded_by: '', deposit_amount: '' })
        setNewBidInv({ ...EMPTY_NEW_INV })
        setBidDepositFile(null)
        setBidDepositPreview(null)
        setBidIdCardFile(null)
        setBidIdCardPreview(null)
        setBidIdCardMsg('')
        setShowBidForm(false)
        setCreatedBidInvId(null)
      }
    } catch (e) { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์: ' + e.message) }
    setSavingBid(false)
  }

  // ทำเครื่องหมายผู้ชนะการประมูล
  const handleMarkBidWinner = async (bidId) => {
    if (!confirm('ยืนยันว่านายทุนรายนี้ชนะการประมูล? นายทุนอื่นจะถูกตั้งเป็น "รอคืนเงิน"')) return
    setMarkingWinner(bidId)
    try {
      const res = await fetch(`${API}/bids/${bidId}/winner`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (data.success) {
        const r2 = await fetch(`${API}/cases/${id}/bids`, { headers: { Authorization: `Bearer ${token()}` } })
        const d2 = await r2.json()
        if (d2.success) setBids(d2.bids || [])
      }
    } catch {}
    setMarkingWinner(null)
  }

  // ลบการเสนอราคา
  const handleDeleteBid = async (bidId) => {
    if (!confirm('ต้องการลบรายการเสนอราคานี้?')) return
    setDeletingBid(bidId)
    try {
      await fetch(`${API}/bids/${bidId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      setBids(prev => prev.filter(b => b.id !== bidId))
    } catch {}
    setDeletingBid(null)
  }

  // helper: อัพโหลด ID card หลังสร้างนายทุนสำเร็จ
  const handleUploadIdCard = async (investorId, file, setUploading, setMsg) => {
    if (!file) return
    setUploading(true)
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('id_card', file)
      const res = await fetch(`${INV_API}/${investorId}/id-card`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      setMsg(data.success ? '✅ อัพโหลดหลักฐานสำเร็จ' : (data.message || 'เกิดข้อผิดพลาด'))
    } catch { setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์') }
    setUploading(false)
  }

  // OCR บัตรประชาชนสำหรับ bid form → auto-fill ชื่อ
  const handleOcrScanBidInv = async (file) => {
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setBidIdCardPreview(previewUrl)
    setBidIdCardFile(file)
    setOcrScanningBidInv(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', 'id_card')
      const r = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const d = await r.json()
      if (d.success && d.extracted) {
        setNewBidInv(p => ({
          ...p,
          ...(d.extracted.full_name  ? { full_name:   d.extracted.full_name  } : {}),
          ...(d.extracted.phone      ? { phone:        d.extracted.phone      } : {}),
          ...(d.extracted.id_number  ? { national_id:  d.extracted.id_number  } : {}),
        }))
      }
    } catch {}
    setOcrScanningBidInv(false)
  }

  // สร้างนายทุนใหม่ inline → ลงทะเบียนเข้าระบบนายทุน + apply ลง bid form
  const handleCreateBidInvestor = async () => {
    const name = newBidInv.full_name.trim()
    if (!name) return alert('กรุณาระบุชื่อนายทุน')
    setCreatingBidInv(true)
    setBidIdCardMsg('')
    try {
      // ใช้ endpoint ภายใน auction routes เพื่อลงทะเบียนนายทุน
      const res = await fetch('/api/admin/auction/register-investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          full_name:   name,
          phone:       newBidInv.phone       || '',
          line_id:     newBidInv.line_id     || '',
          national_id: newBidInv.national_id || '',
          email:       newBidInv.email       || '',
        })
      })
      const data = await res.json()
      if (data.success) {
        const newEntry = { id: data.id, full_name: data.full_name, phone: newBidInv.phone, investor_code: data.investor_code }
        setInvestorList(prev => [newEntry, ...prev])
        setBidForm(prev => ({
          ...prev,
          investor_id:    data.id,
          investor_name:  data.full_name,
          investor_code:  data.investor_code,
          investor_phone: newBidInv.phone
        }))
        setCreatedBidInvId(data.id)
        // Auto-upload ID card ถ้าแนบมาด้วย
        if (bidIdCardFile) {
          await handleUploadIdCard(data.id, bidIdCardFile, setUploadingBidIdCard, setBidIdCardMsg)
        } else {
          setBidIdCardMsg(`✅ ลงทะเบียนสำเร็จ รหัส ${data.investor_code}`)
        }
        // Auto-upload deposit slip → บันทึกใน investors.deposit_slip ด้วย (ให้ปรากฏหน้าบัญชีและโปรไฟล์นายทุน)
        if (bidDepositFile) {
          try {
            const fdSlip = new FormData()
            fdSlip.append('deposit_slip', bidDepositFile)
            await fetch(`${INV_API}/${data.id}/doc-upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token()}` },
              body: fdSlip
            })
          } catch {}
        }
      } else {
        alert(data.message || 'สร้างนายทุนไม่สำเร็จ')
      }
    } catch (e) { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์: ' + e.message) }
    setCreatingBidInv(false)
  }

  // OCR สแกนบัตรประชาชนนายทุน → auto-fill ชื่อ
  const handleOcrScanWin = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    // แสดง preview ทันทีที่เลือกไฟล์
    const previewUrl = URL.createObjectURL(file)
    setWinIdCardPreview(previewUrl)
    setWinIdCardFile(file)
    setOcrScanningWin(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', 'id_card')
      const r = await fetch('/api/admin/ocr/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd
      })
      const d = await r.json()
      if (d.success && d.extracted) {
        setNewWinInv(p => ({
          ...p,
          ...(d.extracted.full_name  ? { full_name:  d.extracted.full_name  } : {}),
        }))
      } else {
        alert('สแกนไม่สำเร็จ — ' + (d.message || 'ลองถ่ายรูปให้ชัดขึ้น'))
      }
    } catch { alert('ไม่สามารถเชื่อมต่อ OCR') }
    setOcrScanningWin(false)
    e.target.value = ''
  }

  // สร้างนายทุนใหม่ inline สำหรับช่องผู้ชนะประมูล (+ auto-upload ID card ถ้ามี)
  const handleCreateWinInvestor = async () => {
    if (!newWinInv.full_name.trim()) return alert('กรุณาระบุชื่อนายทุน')
    setCreatingWinInv(true)
    setWinIdCardMsg('')
    try {
      const res = await fetch(INV_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(newWinInv)
      })
      const data = await res.json()
      if (data.success) {
        const newEntry = { id: data.id, full_name: newWinInv.full_name, phone: newWinInv.phone, investor_code: data.investor_code }
        setInvestorList(prev => [newEntry, ...prev])
        setForm(prev => ({
          ...prev,
          investor_id: data.id,
          investor_name: newWinInv.full_name,
          investor_code: data.investor_code,
          investor_phone: newWinInv.phone
        }))
        setCreatedWinInvId(data.id)
        // Auto-upload ID card ถ้าแนบมาด้วย
        if (winIdCardFile) {
          await handleUploadIdCard(data.id, winIdCardFile, setUploadingWinIdCard, setWinIdCardMsg)
        } else {
          setWinIdCardMsg('✅ สร้างนายทุนสำเร็จ')
        }
      } else {
        alert(data.message || 'สร้างนายทุนไม่สำเร็จ')
      }
    } catch { alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์') }
    setCreatingWinInv(false)
  }

  // บันทึกข้อมูลประมูล
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setSuccess('')
    try {
      const payload = { ...form }
      if (Number(payload.is_cancelled) === 1) payload.auction_status = 'cancelled'
      payload.notify_sales_save       = notifySalesOnSave       ? '1' : '0'
      payload.notify_legal_save       = notifyLegalOnSave       ? '1' : '0'
      payload.notify_accounting_save  = notifyAccountingOnSave  ? '1' : '0'
      const res = await fetch(`${API}/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('บันทึกข้อมูลสำเร็จ!')
        setTimeout(() => navigate('/auction'), 1000)
      } else {
        setMsg(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
        <p style={{ marginTop: 12 }}>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#e74c3c' }}></i>
        <p style={{ marginTop: 12 }}>ไม่พบข้อมูลเคส</p>
        <button className="btn btn-outline" onClick={() => navigate('/auction')} style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> กลับหน้าฝ่ายประมูลทรัพย์
        </button>
      </div>
    )
  }

  const parseImages = (jsonStr) => {
    try { return JSON.parse(jsonStr) || [] } catch { return [] }
  }

  let images = parseImages(caseData.lr_images || caseData.images)
  let deedImages = parseImages(caseData.lr_deed_images || caseData.deed_images)
  let appraisalImages = parseImages(caseData.lr_appraisal_images || caseData.appraisal_images)
  // รูปจากฝ่ายขาย: อ่านตรงจาก caseData.property_photos (= lr.property_photos จาก JOIN)
  // cases table ไม่มี property_photos column จึงไม่มี naming conflict กับ c.*
  let salesPropertyPhotos = parseImages(caseData.property_photos)

  const ImageGrid = ({ imgList, label }) => {
    if (!imgList || imgList.length === 0) return <span style={{ fontSize: 12, color: '#999' }}>ไม่มีรูป</span>
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {imgList.map((img, i) => {
          const src = img.startsWith('/') ? img : `/${img}`
          const isFilePdf = img.toLowerCase().includes('.pdf')
          return (
            <a key={i} href={src} target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', textDecoration: 'none' }}>
              {isFilePdf ? (
                <div style={{ width: 60, height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #f5c6c6', background: '#fff5f5', gap: 2 }}>
                  <i className="fas fa-file-pdf" style={{ fontSize: 20, color: '#e53935' }}></i>
                  <span style={{ fontSize: 8, color: '#e53935', fontWeight: 600 }}>PDF</span>
                </div>
              ) : (
                <img src={src} alt={`${label}-${i}`}
                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                  onError={e => { e.target.style.display = 'none' }} />
              )}
            </a>
          )
        })}
      </div>
    )
  }

  // Component: แสดงไฟล์เอกสารพร้อม Preview + ลบ
  const DocFileRow = ({ filePath, onDelete }) => {
    const ext = filePath.split('.').pop().toLowerCase()
    const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext)
    const isPdf = ext === 'pdf'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        background: '#f8f9fa', borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 6 }}>
        {isImage ? (
          <a href={`/${filePath}`} target="_blank" rel="noreferrer">
            <img src={`/${filePath}`} alt="doc" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }}
              onError={e => { e.target.style.display = 'none' }} />
          </a>
        ) : (
          <a href={`/${filePath}`} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#e74c3c', textDecoration: 'none' }}>
            <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file'}`} style={{ fontSize: 22 }}></i>
          </a>
        )}
        <a href={`/${filePath}`} target="_blank" rel="noreferrer"
          style={{ flex: 1, fontSize: 11, color: 'var(--primary)', wordBreak: 'break-all', textDecoration: 'none' }}>
          {filePath.split('/').pop()}
        </a>
        <button type="button" onClick={onDelete}
          style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
          <i className="fas fa-trash-alt"></i>
        </button>
      </div>
    )
  }

  // ==================== RENDER ====================
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => navigate('/auction')} style={{ padding: '8px 16px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            <i className="fas fa-gavel" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
            แก้ไขเคส (ฝ่ายประมูลทรัพย์) — <span style={{ color: 'var(--primary)' }}>{caseData.case_code}</span>
            {caseData.contact_name && <span style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginLeft: 4 }}>({caseData.contact_name})</span>}
          </h2>
        </div>
        <span style={{ fontSize: 13, color: 'var(--gray)' }}>
          สร้างเมื่อ: {formatDate(caseData.created_at)}
        </span>
      </div>

      {msg && <div className="error-msg" style={{ marginBottom: 16 }}>{msg}</div>}
      {success && <div className="success-msg" style={{ marginBottom: 16 }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="edit-page-grid">

          {/* ===== คอลัมน์ซ้าย ===== */}
          <div>
            {/* ข้อมูลลูกหนี้ */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>
                {caseData.case_code}{caseData.contact_name ? ` — ${caseData.contact_name}` : ' — ข้อมูลลูกหนี้'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ชื่อ-สกุล (เจ้าของทรัพย์)</label>
                  <input type="text" value={caseData.contact_name || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
                <div className="form-group">
                  <label>เบอร์โทร</label>
                  <input type="text" value={caseData.contact_phone || ''} readOnly style={{ background: '#f5f5f5' }} />
                </div>
              </div>
              {/* สถานะสมรส (read-only จากฝ่ายขาย) */}
              {caseData.marital_status && (() => {
                const ms = caseData.marital_status
                const color = MARITAL_COLOR[ms] || '#555'
                return (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>สถานะสมรส:</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: color + '18', color, border: `1.5px solid ${color}50`,
                      borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700
                    }}>
                      <i className="fas fa-heart" style={{ fontSize: 10 }}></i>
                      {MARITAL_LABEL[ms] || ms}
                    </span>
                    <span style={{ fontSize: 11, color: '#aaa' }}>(จากฝ่ายขาย)</span>
                  </div>
                )
              })()}
              <AgentCard agentName={caseData.agent_name} agentPhone={caseData.agent_phone} agentCode={caseData.agent_code} />
              {images.filter(img => img.includes('id-cards')).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>รูปหน้าบัตรประชาชน</label>
                  <ImageGrid imgList={images.filter(img => img.includes('id-cards'))} label="id" />
                </div>
              )}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>ลักษณะทรัพย์</label>
                <input type="text" value={propertyTypeLabel[caseData.property_type] || caseData.property_type || '-'} readOnly style={{ background: '#f5f5f5' }} />
              </div>
            </div>

            {/* ข้อมูลทรัพย์ */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>ข้อมูลทรัพย์</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>ทรัพย์ติดภาระหรือไม่</label>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                  background: caseData.has_obligation === 'yes' ? '#fee2e2' : '#dcfce7',
                  color: caseData.has_obligation === 'yes' ? '#b91c1c' : '#15803d',
                  border: `2px solid ${caseData.has_obligation === 'yes' ? '#fca5a5' : '#86efac'}`,
                }}>
                  <i className={`fas ${caseData.has_obligation === 'yes' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
                  {caseData.has_obligation === 'yes'
                    ? `ติดภาระ${caseData.obligation_count ? ` (${caseData.obligation_count} รายการ)` : ''}`
                    : 'ไม่ติดภาระ'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group"><label>จังหวัด</label>
                  <input type="text" value={caseData.province || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>อำเภอ</label>
                  <input type="text" value={caseData.district || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>ตำบล</label>
                  <input type="text" value={caseData.subdistrict || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#e53935', fontSize: 13 }}></i>
                  โลเคชั่น
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>(กรอกโดยฝ่ายขาย)</span>
                  <button type="button"
                    onClick={() => window.open('https://landsmaps.dol.go.th/#', '_blank')}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#0369a1,#0284c7)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-map"></i> ค้นหา landsmaps
                  </button>
                </label>
                <input type="url" value={caseData.location_url || ''} readOnly
                  style={{ background: '#f9fafb', color: caseData.location_url ? '#111827' : '#9ca3af', cursor: 'default' }}
                  placeholder="ฝ่ายขายยังไม่ได้กรอกโลเคชั่น" />
                <MapPreview url={caseData.location_url} label="โลเคชั่นทรัพย์" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group"><label>เลขโฉนด</label>
                  <input type="text" value={caseData.deed_number || '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
                <div className="form-group"><label>พื้นที่</label>
                  <input type="text" value={caseData.land_area ? `${caseData.land_area} ตร.วา` : '-'} readOnly style={{ background: '#f5f5f5' }} /></div>
              </div>

              {/* ===== เปรียบเทียบรูปทรัพย์: ฝ่ายขาย vs ฝ่ายประเมิน ===== */}
              {(() => {
                // ใช้ lr_appraisal_images (จาก injectLrImages) เป็นหลัก, fallback เป็น appraisal_images
                const rawAppraisal = caseData?.lr_appraisal_images || caseData?.appraisal_images
                let appraisalImgs = []
                if (rawAppraisal) {
                  try { appraisalImgs = typeof rawAppraisal === 'string' ? JSON.parse(rawAppraisal) || [] : (Array.isArray(rawAppraisal) ? rawAppraisal : []) } catch { appraisalImgs = [] }
                }
                // รูปจากฝ่ายขาย: จาก lr_property_photos (injectLrImages) หรือ property_photos
                const salesPropImgs = parseImages(caseData.lr_property_photos || caseData.property_photos)
                const PhotoThumb = ({ src, colorBorder }) => {
                  const fullSrc = src.startsWith('/') ? src : `/${src}`
                  const isPdf = src.toLowerCase().includes('.pdf')
                  return (
                    <div style={{ border: `1.5px solid ${colorBorder}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#fafafa' }}
                      onClick={() => window.open(fullSrc, '_blank')}>
                      {isPdf ? (
                        <div style={{ width: '100%', height: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', gap: 4 }}>
                          <i className="fas fa-file-pdf" style={{ fontSize: 24, color: '#e53935' }}></i>
                          <span style={{ fontSize: 9, color: '#e53935', fontWeight: 600 }}>PDF</span>
                        </div>
                      ) : (
                        <img src={fullSrc} alt="prop"
                          style={{ width: '100%', height: 90, objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      )}
                    </div>
                  )
                }
                return (
                  <div style={{ marginTop: 16, padding: 16, background: '#f8faff', borderRadius: 10, border: '1.5px solid #c7d2fe' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#3730a3', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-images"></i> เปรียบเทียบรูปทรัพย์
                      <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280' }}>— ทุกแผนกมองเห็น</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {/* ฝ่ายขาย */}
                      <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, border: '1px solid #86efac' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>
                          <i className="fas fa-user-tie" style={{ marginRight: 5 }}></i>
                          รูปจากฝ่ายขาย ({salesPropImgs.length} รูป)
                        </div>
                        {salesPropImgs.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
                            {salesPropImgs.map((src, i) => <PhotoThumb key={i} src={src} colorBorder="#86efac" />)}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#999' }}>ยังไม่มีรูปจากฝ่ายขาย</span>
                        )}
                      </div>
                      {/* ฝ่ายประเมิน */}
                      <div style={{ background: '#f3e5f5', borderRadius: 8, padding: 12, border: '1px solid #ce93d8' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#7b1fa2', marginBottom: 8 }}>
                          <i className="fas fa-search-location" style={{ marginRight: 5 }}></i>
                          รูปจากฝ่ายประเมิน – เข้าพื้นที่ ({appraisalImgs.length} รูป)
                        </div>
                        {appraisalImgs.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
                            {appraisalImgs.map((src, i) => <PhotoThumb key={i} src={src} colorBorder="#ce93d8" />)}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: '#999' }}>ยังไม่มีรูปจากฝ่ายประเมิน</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {caseData.appraisal_book_image && (() => {
                const ext = caseData.appraisal_book_image.split('.').pop().toLowerCase()
                const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext)
                const isPdf = ext === 'pdf'
                return (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#e65100' }}>
                      <i className="fas fa-book" style={{ marginRight: 4 }}></i>
                      เล่มประเมิน
                    </label>
                    <div style={{ marginTop: 6 }}>
                      <a href={`/${caseData.appraisal_book_image}`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#e65100', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        <i className={`fas ${isPdf ? 'fa-file-pdf' : isImage ? 'fa-file-image' : 'fa-file-alt'}`}></i> เปิดดูเล่มประเมิน
                      </a>
                    </div>
                    {isImage && (
                      <div style={{ marginTop: 8 }}>
                        <img src={`/${caseData.appraisal_book_image}`} alt="เล่มประเมิน"
                          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #ddd' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ===== VDO ทรัพย์สิน ===== */}
              <PropertyVideoPanel lrId={caseData?.loan_request_id} token={token()} canUpload={false} />
            </div>



            {/* นายหน้า */}
            <div className="card" style={{ padding: 24, marginBottom: 20, borderLeft: '3px solid #f59e0b' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#b45309' }}>
                <i className="fas fa-user-tie" style={{ marginRight: 8 }}></i>นายหน้า
              </h3>
              {caseData.agent_name ? (
                <>
                  <div className="form-group">
                    <label>ชื่อนายหน้า</label>
                    <input type="text" value={caseData.agent_name || ''} readOnly style={{ background: '#f5f5f5' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 11, color: '#888' }}>รหัสนายหน้า</label>
                      <input type="text" value={caseData.agent_code || '-'} readOnly style={{ background: '#f5f5f5', fontSize: 13 }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 11, color: '#888' }}>เบอร์โทร</label>
                      <input type="text" value={caseData.agent_phone || '-'} readOnly style={{ background: '#f5f5f5', fontSize: 13 }} />
                    </div>
                  </div>
                  {caseData.agent_line && (
                    <div className="form-group" style={{ marginTop: 8, marginBottom: 0 }}>
                      <label style={{ fontSize: 11, color: '#888' }}>
                        <i className="fab fa-line" style={{ color: '#00C300', marginRight: 4 }}></i>LINE ID
                      </label>
                      <input type="text" value={caseData.agent_line} readOnly style={{ background: '#f5f5f5', fontSize: 13 }} />
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: '#aaa', fontSize: 13, padding: '8px 0' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>ไม่มีนายหน้า (ลูกค้าตรง)
                </div>
              )}
            </div>

            {/* สถานะประเมิน */}
            <AppraisalStatusCard caseData={caseData} />
          </div>

          {/* ===== คอลัมน์ขวา: แก้ไขได้ ===== */}
          <div>
            {/* ===== ประเภทการขาย (ประมูล / ขายสด) ===== */}
            <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '4px solid #8e44ad' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#8e44ad' }}>
                <i className="fas fa-tag" style={{ marginRight: 8 }}></i>ประเภทการขาย
              </h3>
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ value: 'auction', label: '🔨 ประมูล', color: '#e67e22' }, { value: 'direct', label: '💵 ขายสด', color: '#27ae60' }].map(opt => (
                  <label key={opt.value} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                    border: form.sale_type === opt.value ? `2px solid ${opt.color}` : '1.5px solid #ddd',
                    background: form.sale_type === opt.value ? opt.color + '18' : '#fafafa',
                    color: form.sale_type === opt.value ? opt.color : '#888',
                    transition: 'all 0.15s'
                  }}>
                    <input type="radio" name="sale_type" value={opt.value}
                      checked={form.sale_type === opt.value}
                      onChange={e => set('sale_type', e.target.value)}
                      style={{ display: 'none' }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* นายทุน — แสดงทั้งประมูลและขายสด */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                  <i className={`fas ${form.sale_type === 'direct' ? 'fa-user-tie' : 'fa-trophy'}`} style={{ marginRight: 8 }}></i>
                  {form.sale_type === 'direct' ? 'ข้อมูลนายทุน' : 'ผู้ชนะการประมูล (นายทุน)'}
                </h3>
                <button type="button"
                  onClick={() => { setWinInvMode(m => m === 'select' ? 'create' : 'select'); setNewWinInv({ ...EMPTY_NEW_INV }); setCreatedWinInvId(null); setWinIdCardFile(null); setWinIdCardMsg('') }}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #8e44ad', background: winInvMode === 'create' ? '#8e44ad' : '#f5f0ff', color: winInvMode === 'create' ? '#fff' : '#8e44ad', cursor: 'pointer', fontWeight: 600 }}>
                  {winInvMode === 'create' ? '← เลือกจากรายการ' : '+ สร้างนายทุนใหม่'}
                </button>
              </div>
              {winInvMode === 'select' ? (
                <>
                  <div className="form-group">
                    <label>เลือกนายทุน</label>
                    <select value={form.investor_id || ''} onChange={e => handleInvestorSelect(e.target.value)}>
                      <option value="">-- เลือกนายทุน --</option>
                      {investorList.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.investor_code} — {inv.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>ชื่อนายทุน</label>
                    <input type="text" value={form.investor_name} readOnly style={{ background: '#f5f5f5' }} placeholder="ระบุชื่อนายทุน" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>รหัสนายทุน</label>
                      <input type="text" value={form.investor_code} readOnly style={{ background: '#f5f5f5' }} />
                    </div>
                    <div className="form-group">
                      <label>เบอร์โทรนายทุน</label>
                      <input type="text" value={form.investor_phone} readOnly style={{ background: '#f5f5f5' }} />
                    </div>
                  </div>
                  {form.investor_line_id && (
                    <div className="form-group" style={{ marginTop: 4 }}>
                      <label><i className="fab fa-line" style={{ color: '#00C300', marginRight: 5 }}></i>LINE ID นายทุน</label>
                      <input type="text" value={form.investor_line_id} readOnly style={{ background: '#f5f5f5' }} />
                    </div>
                  )}
                  <div className="form-group" style={{ marginTop: 4 }}>
                    <label>ประเภทนายทุน</label>
                    <select value={form.investor_type} onChange={e => set('investor_type', e.target.value)}>
                      <option value="">-- เลือกประเภท --</option>
                      <option value="individual">ส่วนตัว</option>
                      <option value="corporate">นิติบุคคล</option>
                    </select>
                  </div>
                </>
              ) : (
                <div style={{ background: '#f5f0ff', borderRadius: 8, padding: 14, border: '1px solid #d6b4fc' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8e44ad', marginBottom: 10 }}>สร้างนายทุนใหม่</div>
                  {!createdWinInvId ? (
                    <>
                      {/* ── ID Card + OCR ── */}
                      <label style={{
                        display: 'block', cursor: ocrScanningWin ? 'default' : 'pointer',
                        marginBottom: 10,
                        background: winIdCardPreview ? '#faf5ff' : '#f9f0ff',
                        border: `2px dashed ${winIdCardPreview ? '#a855f7' : '#c39bd3'}`,
                        borderRadius: 10, padding: 12, transition: 'border-color 0.2s',
                      }}
                        onMouseEnter={e => { if (!winIdCardPreview) e.currentTarget.style.borderColor = '#8e44ad' }}
                        onMouseLeave={e => { if (!winIdCardPreview) e.currentTarget.style.borderColor = '#c39bd3' }}
                      >
                        <input type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }}
                          disabled={ocrScanningWin} onChange={handleOcrScanWin} />
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          {/* preview หรือ placeholder */}
                          <div style={{
                            width: 72, height: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden',
                            background: '#ede9fe', border: '1px solid #d8b4fe',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                          }}>
                            {winIdCardPreview ? (
                              <img src={winIdCardPreview} alt="preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <i className="fas fa-id-card" style={{ fontSize: 26, color: '#a855f7' }}></i>
                            )}
                            {winIdCardPreview && !ocrScanningWin && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setWinIdCardFile(null)
                                  setWinIdCardPreview(null)
                                }}
                                style={{
                                  position: 'absolute', top: 3, right: 3,
                                  width: 18, height: 18, borderRadius: '50%',
                                  background: 'rgba(0,0,0,0.55)', border: 'none',
                                  color: '#fff', fontSize: 10, lineHeight: '18px',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  padding: 0, zIndex: 2,
                                }}
                                title="ลบรูป"
                              >✕</button>
                            )}
                            {ocrScanningWin && (
                              <div style={{
                                position: 'absolute', inset: 0, background: 'rgba(139,92,246,0.7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 20 }}></i>
                              </div>
                            )}
                          </div>
                          {/* ข้อความ */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#7e22ce', marginBottom: 3 }}>
                              <i className="fas fa-camera" style={{ marginRight: 5 }}></i>
                              {ocrScanningWin ? 'กำลังอ่านบัตร...' : winIdCardPreview ? 'เปลี่ยนรูปบัตรประชาชน' : 'สแกน / อัพโหลดบัตรประชาชน'}
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>
                              {ocrScanningWin
                                ? 'AI กำลังอ่านชื่อ-สกุลจากบัตร...'
                                : winIdCardPreview
                                  ? <><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ อัพโหลดบัตรแล้ว</span> — คลิกเพื่อเปลี่ยน</>
                                  : <>JPG / PNG — OCR อ่านชื่ออัตโนมัติ</>
                              }
                            </div>
                            {winIdCardFile && !ocrScanningWin && (
                              <div style={{ fontSize: 10, color: '#7d3c98', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-paperclip" style={{ marginRight: 3 }}></i>{winIdCardFile.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>ชื่อ-นามสกุล <span style={{ color: '#e74c3c' }}>*</span></label>
                          <input type="text" value={newWinInv.full_name} onChange={e => setNewWinInv(p => ({ ...p, full_name: e.target.value }))} placeholder="ชื่อนายทุน" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>เบอร์โทร</label>
                          <input type="text" value={newWinInv.phone} onChange={e => setNewWinInv(p => ({ ...p, phone: e.target.value }))} placeholder="เบอร์โทร" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>ชื่อไลน์</label>
                          <input type="text" value={newWinInv.line_id} onChange={e => setNewWinInv(p => ({ ...p, line_id: e.target.value }))} placeholder="LINE ID" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Email</label>
                          <input type="email" value={newWinInv.email} onChange={e => setNewWinInv(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
                        </div>
                      </div>
                      <button type="button" onClick={handleCreateWinInvestor} disabled={creatingWinInv || !newWinInv.full_name.trim()}
                        style={{ marginTop: 10, padding: '7px 18px', background: '#8e44ad', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        {creatingWinInv
                          ? <><i className="fas fa-spinner fa-spin"></i> {uploadingWinIdCard ? 'กำลังอัพโหลดบัตร...' : 'กำลังสร้าง...'}</>
                          : <><i className="fas fa-plus"></i> สร้างและเลือก{winIdCardFile ? ' + อัพโหลดบัตร' : ''}</>
                        }
                      </button>
                    </>
                  ) : (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 12, color: '#27ae60', fontWeight: 600, marginBottom: 6 }}>
                        ✅ สร้างนายทุนสำเร็จแล้ว (ID: {createdWinInvId})
                      </div>
                      {winIdCardMsg && (
                        <div style={{ fontSize: 12, marginBottom: 8, color: winIdCardMsg.startsWith('✅') ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
                          {winIdCardMsg}
                        </div>
                      )}
                      {/* อัพโหลดบัตรเพิ่มเติมได้ */}
                      {!winIdCardMsg.startsWith('✅ อัพโหลด') && (
                        <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', border: '1px dashed #c39bd3', marginBottom: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#7d3c98', display: 'block', marginBottom: 4 }}>
                            <i className="fas fa-id-card" style={{ marginRight: 4 }}></i>อัพโหลดบัตรประชาชนเพิ่มเติม
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                              onChange={e => setWinIdCardFile(e.target.files[0])}
                              style={{ fontSize: 11, flex: 1 }} />
                            <button type="button"
                              onClick={() => handleUploadIdCard(createdWinInvId, winIdCardFile, setUploadingWinIdCard, setWinIdCardMsg)}
                              disabled={uploadingWinIdCard || !winIdCardFile}
                              style={{ padding: '5px 12px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {uploadingWinIdCard ? <><i className="fas fa-spinner fa-spin"></i> อัพโหลด...</> : <><i className="fas fa-upload"></i> อัพโหลด</>}
                            </button>
                          </div>
                        </div>
                      )}
                      <button type="button"
                        onClick={() => { setWinInvMode('select'); setCreatedWinInvId(null); setWinIdCardFile(null); setWinIdCardMsg(''); setWinIdCardPreview(null); setNewWinInv({ ...EMPTY_NEW_INV }) }}
                        style={{ padding: '4px 12px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                        เสร็จสิ้น
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ===== การเสนอราคา (ประมูล) — สลิปมัดจำ ===== */}
            <div className="card" style={{ padding: 20, marginBottom: 20, borderLeft: '4px solid #e67e22' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e67e22' }}>
                  <i className="fas fa-balance-scale" style={{ marginRight: 8 }}></i>
                  การเสนอราคา (สู้ราคา)
                </h3>
                <button type="button"
                  onClick={() => { setShowBidForm(v => !v); if (showBidForm) { setBidIdCardFile(null); setBidIdCardPreview(null); setBidIdCardMsg('') } }}
                  style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', background: showBidForm ? '#e67e22' : '#fef3c7', color: showBidForm ? '#fff' : '#92400e', cursor: 'pointer', fontWeight: 700 }}>
                  {showBidForm ? '✕ ยกเลิก' : '+ เพิ่มนายทุนเสนอราคา'}
                </button>
              </div>

              {/* ── ฟอร์มเพิ่มนายทุน + เสนอราคา (ปุ่มเดียว) ── */}
              {showBidForm && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 12 }}>
                    <i className="fas fa-user-plus" style={{ marginRight: 6 }}></i>สร้างนายทุน + เสนอราคา
                  </div>

                  {/* ข้อมูลนายทุน */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11 }}>ชื่อ-นามสกุล <span style={{ color: '#e74c3c' }}>*</span></label>
                        <input type="text" value={newBidInv.full_name} onChange={e => setNewBidInv(p => ({ ...p, full_name: e.target.value }))} placeholder="ชื่อนายทุน" style={{ fontSize: 12 }} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11 }}>เบอร์โทร</label>
                        <input type="text" value={newBidInv.phone} onChange={e => setNewBidInv(p => ({ ...p, phone: e.target.value }))} placeholder="เบอร์โทร" style={{ fontSize: 12 }} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11 }}>เลขบัตรประชาชน</label>
                        <input type="text" value={newBidInv.national_id} onChange={e => setNewBidInv(p => ({ ...p, national_id: e.target.value }))} placeholder="1-xxxx-xxxxx-xx-x" style={{ fontSize: 12 }} maxLength={17} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: 11 }}>LINE ID</label>
                        <input type="text" value={newBidInv.line_id} onChange={e => setNewBidInv(p => ({ ...p, line_id: e.target.value }))} placeholder="LINE ID" style={{ fontSize: 12 }} />
                      </div>
                    </div>
                    {/* ── ID Card Upload + OCR ── */}
                    <div style={{ marginTop: 10 }}>
                      <label style={{
                        display: 'block', cursor: ocrScanningBidInv ? 'default' : 'pointer',
                        background: bidIdCardPreview ? '#fff7ed' : '#fffbeb',
                        border: `2px dashed ${bidIdCardPreview ? '#f97316' : '#fde68a'}`,
                        borderRadius: 12, padding: 12, transition: 'all 0.2s',
                      }}
                        onMouseEnter={e => { if (!bidIdCardPreview && !ocrScanningBidInv) e.currentTarget.style.borderColor = '#f97316' }}
                        onMouseLeave={e => { if (!bidIdCardPreview && !ocrScanningBidInv) e.currentTarget.style.borderColor = '#fde68a' }}
                      >
                        <input type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }}
                          disabled={ocrScanningBidInv}
                          onChange={e => { const f = e.target.files[0]; if (f) handleOcrScanBidInv(f); e.target.value = '' }} />
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{
                            width: 72, height: 72, flexShrink: 0, borderRadius: 10, overflow: 'hidden',
                            background: '#fed7aa', border: '1.5px solid #fdba74',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                          }}>
                            {bidIdCardPreview ? (
                              <img src={bidIdCardPreview} alt="id card" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <i className="fas fa-id-card" style={{ fontSize: 28, color: '#f97316' }}></i>
                            )}
                            {bidIdCardPreview && !ocrScanningBidInv && (
                              <button type="button"
                                onClick={e => { e.preventDefault(); e.stopPropagation(); setBidIdCardFile(null); setBidIdCardPreview(null) }}
                                style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}>
                                ✕
                              </button>
                            )}
                            {ocrScanningBidInv && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(234,88,12,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: 18 }}></i>
                                <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>OCR</span>
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <i className={`fas ${ocrScanningBidInv ? 'fa-magic' : bidIdCardPreview ? 'fa-check-circle' : 'fa-camera'}`}
                                style={{ color: ocrScanningBidInv ? '#f97316' : bidIdCardPreview ? '#16a34a' : '#f97316' }}></i>
                              {ocrScanningBidInv ? 'AI กำลังอ่านบัตร...' : bidIdCardPreview ? 'อัพโหลดบัตรแล้ว — คลิกเพื่อเปลี่ยน' : 'อัพโหลดบัตรประชาชน'}
                            </div>
                            <div style={{ fontSize: 10, color: '#a8753c', lineHeight: 1.5 }}>
                              {ocrScanningBidInv
                                ? <span style={{ color: '#f97316', fontWeight: 600 }}>กำลังอ่านชื่อ-สกุลอัตโนมัติ...</span>
                                : bidIdCardPreview
                                  ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ OCR กรอกชื่อให้แล้ว (ถ้าชัดเจน)</span>
                                  : 'JPG / PNG · AI อ่านชื่ออัตโนมัติ (ไม่บังคับ)'}
                            </div>
                            {bidIdCardFile && !ocrScanningBidInv && (
                              <div style={{ fontSize: 10, color: '#78350f', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-paperclip" style={{ marginRight: 3 }}></i>{bidIdCardFile.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                    {bidIdCardMsg && <div style={{ fontSize: 11, marginTop: 6, color: bidIdCardMsg.startsWith('✅') ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>{bidIdCardMsg}</div>}
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px dashed #fde68a', margin: '12px 0' }} />

                  {/* ราคาเสนอ + มัดจำ */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>ราคาเสนอ (บาท) <span style={{ color: '#e74c3c' }}>*</span></label>
                      <input type="number" value={bidForm.bid_amount} onChange={e => setBidForm(p => ({ ...p, bid_amount: e.target.value }))} placeholder="0.00" style={{ fontSize: 13, fontWeight: 700 }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>มัดจำที่โอนมา (บาท)</label>
                      <input type="number" value={bidForm.deposit_amount} onChange={e => setBidForm(p => ({ ...p, deposit_amount: e.target.value }))} placeholder="0.00" style={{ fontSize: 13 }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>วันที่เสนอ</label>
                      <input type="date" value={bidForm.bid_date} onChange={e => setBidForm(p => ({ ...p, bid_date: e.target.value }))} style={{ fontSize: 12 }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: 12 }}>หมายเหตุ</label>
                      <input type="text" value={bidForm.note} onChange={e => setBidForm(p => ({ ...p, note: e.target.value }))} placeholder="บันทึกเพิ่มเติม" style={{ fontSize: 12 }} />
                    </div>
                  </div>

                  {/* สลิปมัดจำ — upload card พร้อม preview */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <span><i className="fas fa-receipt" style={{ marginRight: 5 }}></i>แนบสลิปมัดจำ</span>
                      <span style={{ fontSize: 10, fontWeight: 400, color: '#aaa' }}>JPG / PNG / PDF / WEBP</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', borderRadius: 4, padding: '2px 7px', border: '1px solid #c4b5fd' }}>
                        <i className="fas fa-link" style={{ marginRight: 3 }}></i>บันทึกในโปรไฟล์นายทุน + หน้าบัญชีด้วย
                      </span>
                    </div>

                    <SlipVerifier
                      slipType="deposit"
                      caseId={caseData?.id}
                      onConfirm={(file) => {
                        setBidDepositFile(file || null)
                        setBidDepositPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
                      }}
                      label="แนบสลิปมัดจำ"
                    />
                  </div>

                  <button type="button" onClick={handleCreateAndBid} disabled={savingBid || !newBidInv.full_name.trim() || !bidForm.bid_amount}
                    style={{ width: '100%', padding: '10px 0', background: '#e67e22', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {savingBid ? <><i className="fas fa-spinner fa-spin"></i> กำลังสร้าง + บันทึก...</> : <><i className="fas fa-user-plus" style={{ marginRight: 5 }}></i>สร้างนายทุน + บันทึกเสนอราคา</>}
                  </button>
                </div>
              )}

              {/* ── ตารางการเสนอราคา ── */}
              {bids.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa', fontSize: 13 }}>
                  <i className="fas fa-inbox" style={{ fontSize: 24, display: 'block', marginBottom: 8 }}></i>
                  ยังไม่มีการเสนอราคา
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 8 }}>
                    <i className="fas fa-list-ol" style={{ marginRight: 4 }}></i>
                    รายการเสนอราคา ({bids.length} ราย) — เรียงตามสูงสุด
                  </div>
                  {[...bids].sort((a, b) => (Number(b.bid_amount) || 0) - (Number(a.bid_amount) || 0)).map((bid, idx) => {
                    const isWinner = bid.refund_status === 'winner'
                    const isRefunded = bid.refund_status === 'refunded'
                    const rank = idx + 1
                    const slipPath = bid.deposit_slip ? (bid.deposit_slip.startsWith('/') ? bid.deposit_slip : `/${bid.deposit_slip}`) : null
                    return (
                      <div key={bid.id} style={{
                        border: `2px solid ${isWinner ? '#f59e0b' : '#e5e7eb'}`,
                        borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                        background: isWinner ? '#fffbeb' : isRefunded ? '#f9fafb' : '#fff',
                        opacity: isRefunded ? 0.75 : 1,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              minWidth: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 800,
                              background: rank === 1 ? '#fef08a' : rank === 2 ? '#e5e7eb' : '#fff',
                              color: rank === 1 ? '#92400e' : '#555', border: '1.5px solid #e5e7eb',
                            }}>#{rank}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                                {bid.investor_name || '—'}
                                {bid.investor_code && <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>({bid.investor_code})</span>}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{bid.investor_phone || ''}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#e67e22' }}>
                              {bid.bid_amount ? `฿${Number(bid.bid_amount).toLocaleString('th-TH')}` : '—'}
                            </div>
                            {bid.deposit_amount && (
                              <div style={{ fontSize: 11, color: '#78350f' }}>
                                มัดจำ ฿{Number(bid.deposit_amount).toLocaleString('th-TH')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* สลิปมัดจำ */}
                        {slipPath && (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button type="button" onClick={() => setPreviewSlip(slipPath)}
                              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              <i className="fas fa-receipt" style={{ marginRight: 4 }}></i>ดูสลิปมัดจำ
                            </button>
                            <a href={slipPath} target="_blank" rel="noreferrer"
                              style={{ fontSize: 11, color: '#64748b', textDecoration: 'none' }}>
                              <i className="fas fa-external-link-alt" style={{ marginRight: 3 }}></i>เปิดใหม่
                            </a>
                          </div>
                        )}

                        {/* Badge + action */}
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {isWinner ? (
                            <span style={{ padding: '3px 10px', borderRadius: 20, background: '#fef08a', color: '#78350f', fontSize: 11, fontWeight: 700, border: '1px solid #f59e0b' }}>
                              <i className="fas fa-trophy" style={{ marginRight: 4 }}></i>ผู้ชนะ
                            </span>
                          ) : isRefunded ? (
                            <span style={{ padding: '3px 10px', borderRadius: 20, background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 700, border: '1px solid #6ee7b7' }}>
                              <i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>คืนเงินแล้ว
                            </span>
                          ) : (
                            <span style={{ padding: '3px 10px', borderRadius: 20, background: '#fef9c3', color: '#854d0e', fontSize: 11, fontWeight: 600, border: '1px solid #fde047' }}>
                              <i className="fas fa-clock" style={{ marginRight: 4 }}></i>รอคืนมัดจำ
                            </span>
                          )}
                          {!isWinner && (
                            <button type="button" onClick={() => handleMarkBidWinner(bid.id)} disabled={markingWinner === bid.id}
                              style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              {markingWinner === bid.id ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-crown" style={{ marginRight: 3 }}></i>ตั้งเป็นผู้ชนะ</>}
                            </button>
                          )}
                          <button type="button" onClick={() => handleDeleteBid(bid.id)} disabled={deletingBid === bid.id}
                            style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#e74c3c', fontSize: 11, cursor: 'pointer' }}>
                            {deletingBid === bid.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash-alt"></i>}
                          </button>
                        </div>

                        {bid.note && (
                          <div style={{ marginTop: 6, fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                            <i className="fas fa-comment-alt" style={{ marginRight: 4 }}></i>{bid.note}
                          </div>
                        )}
                        {bid.bid_date && (
                          <div style={{ fontSize: 10, color: '#b0bec5', marginTop: 4 }}>
                            วันที่เสนอ: {new Date(bid.bid_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal preview สลิปมัดจำ */}
            {previewSlip && (
              <div onClick={() => setPreviewSlip(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
                <button onClick={e => { e.stopPropagation(); setPreviewSlip(null) }}
                  style={{ position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', fontSize: 20, cursor: 'pointer', zIndex: 100000 }}>✕</button>
                {/\.pdf$/i.test(previewSlip)
                  ? <iframe src={previewSlip} title="deposit slip" style={{ width: '85vw', height: '90vh', border: 'none', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
                  : <img src={previewSlip} alt="deposit slip" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }} />
                }
              </div>
            )}

            {/* ข้อมูลทรัพย์ (ฝ่ายประมูล) */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-building" style={{ marginRight: 8 }}></i>ข้อมูลทรัพย์
              </h3>

              {/* ── read-only: สถานะทรัพย์สิน + ราคาประเมิน ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>สถานะทรัพย์สิน</div>
                  {caseData.loan_type_detail ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 14px', borderRadius: 20, fontWeight: 700, fontSize: 14,
                      background: caseData.loan_type_detail === 'selling_pledge' ? '#f3e5f5' : '#e3f2fd',
                      color: caseData.loan_type_detail === 'selling_pledge' ? '#6a1b9a' : '#1565c0',
                      border: `1px solid ${caseData.loan_type_detail === 'selling_pledge' ? '#ce93d8' : '#90caf9'}`,
                    }}>
                      <i className={`fas ${caseData.loan_type_detail === 'selling_pledge' ? 'fa-file-signature' : 'fa-home'}`}></i>
                      {caseData.loan_type_detail === 'selling_pledge' ? 'ขายฝาก' : 'จำนอง'}
                    </span>
                  ) : (
                    <span style={{ color: '#aaa', fontSize: 12 }}>ยังไม่ระบุ (ฝ่ายขายกรอก)</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>ราคาประเมิน</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: caseData.check_price_value ? '#9b59b6' : '#aaa' }}>
                    {caseData.check_price_value ? `฿${Number(caseData.check_price_value).toLocaleString('th-TH')}` : '—'}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>มูลค่าทรัพย์ (บาท)</label>
                <input type="number" value={form.property_value} onChange={e => set('property_value', e.target.value)} placeholder="ระบุมูลค่าทรัพย์" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>วงเงินขายฝาก (บาท)</label>
                  <input type="number" value={form.selling_pledge_amount} onChange={e => set('selling_pledge_amount', e.target.value)} placeholder="วงเงินขายฝาก" />
                </div>
                <div className="form-group">
                  <label>ดอกเบี้ย (%)</label>
                  <input type="number" step="0.01" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="ดอกเบี้ย" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>ขนาดพื้นที่</label>
                  <input type="text" value={form.auction_land_area} onChange={e => set('auction_land_area', e.target.value)} placeholder="เช่น 100 ตร.วา" />
                </div>
                <div className="form-group">
                  <label>ปีสัญญา</label>
                  <input type="number" value={form.contract_years} onChange={e => set('contract_years', e.target.value)} placeholder="จำนวนปี" />
                </div>
              </div>
            </div>

            {/* เอกสาร Checklist จากฝ่ายขาย */}
            <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid #d1fae5', background: '#f0fdf4' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#15803d' }}>
                <i className="fas fa-folder-open" style={{ marginRight: 8 }}></i>เอกสาร Checklist (อัพโหลดโดยฝ่ายขาย)
              </h3>
              <ChecklistDocsPanel caseData={caseData} lrId={caseData.loan_request_id} token={token()} onDocsUpdated={(field, paths) => {
                setCaseData(prev => ({ ...prev, [field]: JSON.stringify(paths) }))
                setChecklistDocs(prev => ({ ...prev, [field]: Array.isArray(paths) ? paths : [] }))
              }} />
            </div>

            {/* สถานะประมูล */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-flag" style={{ marginRight: 8 }}></i>สถานะประมูล
              </h3>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 16px' }}>เลือกสถานะแล้วกดบันทึก จะเชื่อมไปที่ฝ่ายขายอัตโนมัติ</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { value: 'pending',          label: 'รอประมูล',            color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: 'fa-clock' },
                  { value: 'auctioned',         label: 'ประมูลเสร็จสิ้น',     color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', icon: 'fa-gavel' },
                  { value: 'auction_completed', label: 'โอนทรัพย์เสร็จสิ้น',  color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: 'fa-check-circle' },
                ].map(opt => (
                  <label key={opt.value} style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 16px', borderRadius: 8,
                    border: form.auction_status === opt.value ? `2px solid ${opt.color}` : '1px solid #e5e7eb',
                    background: form.auction_status === opt.value ? opt.bg : '#fff', transition: 'all 0.15s'
                  }}>
                    <input type="radio" name="auction_status" value={opt.value}
                      checked={form.auction_status === opt.value}
                      onChange={e => set('auction_status', e.target.value)}
                      style={{ width: 18, height: 18, accentColor: opt.color, flexShrink: 0 }} />
                    <i className={`fas ${opt.icon}`} style={{ color: form.auction_status === opt.value ? opt.color : '#d1d5db', fontSize: 14, width: 16, textAlign: 'center' }}></i>
                    <span style={{ fontWeight: form.auction_status === opt.value ? 700 : 400, color: form.auction_status === opt.value ? opt.color : '#374151' }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>


            {/* ---- นิติกรรม (นัดที่ดิน) — ใช้ร่วมกับฝ่ายนิติ ---- */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
                <i className="fas fa-gavel" style={{ marginRight: 8 }}></i>นิติกรรม (นัดที่ดิน)
                <span style={{ fontSize: 11, fontWeight: 400, color: '#888', marginLeft: 8 }}>— ใช้ร่วมกับฝ่ายนิติ</span>
              </h3>

              {/* ── read-only: สิทธิ์ฝ่ายนิติเท่านั้น ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, padding: '12px 14px', background: '#f5f3ff', borderRadius: 8, border: '1px solid #e9d5ff' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>
                    <i className="fas fa-user-shield" style={{ marginRight: 4 }}></i>เจ้าหน้าที่
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#a78bfa', marginLeft: 4 }}>(ฝ่ายนิติแก้ไข)</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: form.officer_name ? '#1e1b4b' : '#bbb' }}>
                    {form.officer_name || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>
                    <i className="fas fa-flag" style={{ marginRight: 4 }}></i>สถานะนิติกรรม
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#a78bfa', marginLeft: 4 }}>(ฝ่ายนิติแก้ไข)</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: form.legal_status === 'completed' ? '#15803d' : form.legal_status === 'cancelled' ? '#b91c1c' : '#92400e' }}>
                    {legalStatusOptions.find(o => o.value === form.legal_status)?.label || '—'}
                  </div>
                </div>
              </div>

              {/* ── editable: วันนัด / สถานที่ ── */}
              <div className="form-group">
                <label>วันที่ไป</label>
                <input type="date" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label>สำนักงานที่ดิน</label>
                <LandOfficeInput id="auction" value={form.land_office} onChange={e => set('land_office', e.target.value)} />
              </div>
              <div className="form-group">
                <label>ช่วงเวลา</label>
                <input type="text" value={form.time_slot} onChange={e => set('time_slot', e.target.value)} placeholder="เช่น 09:00 - 12:00" />
              </div>

              {/* ★ ข้อมูลนายทุน (จาก investors profile) */}
              {caseData.investor_name && (
                <div style={{ background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-user-tie"></i> ข้อมูลนายทุน
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#a78bfa', marginLeft: 4 }}>(สำหรับออกสัญญา)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div>
                      <span style={{ color: '#888' }}>ชื่อ-สกุล:</span><br />
                      <strong>{caseData.investor_full_name || caseData.investor_name || '-'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#888' }}>รหัส / โทร:</span><br />
                      <strong>{caseData.investor_code || '-'}</strong> &nbsp;
                      <span style={{ color: '#555' }}>{caseData.investor_phone_profile || caseData.investor_phone || ''}</span>
                    </div>
                    <div>
                      <span style={{ color: '#888' }}>เลขบัตรประชาชน:</span><br />
                      <strong style={{ fontFamily: 'monospace' }}>{caseData.investor_national_id || '-'}</strong>
                      {caseData.investor_national_id_expiry && (
                        <span style={{ color: '#888', marginLeft: 6 }}>
                          (หมดอายุ {new Date(caseData.investor_national_id_expiry).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })})
                        </span>
                      )}
                    </div>
                    <div>
                      <span style={{ color: '#888' }}>วันเกิด / สัญชาติ:</span><br />
                      <strong>{caseData.investor_date_of_birth ? new Date(caseData.investor_date_of_birth).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</strong>
                      {caseData.investor_nationality && <span style={{ color: '#777', marginLeft: 6 }}>({caseData.investor_nationality})</span>}
                    </div>
                    {caseData.investor_address && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span style={{ color: '#888' }}>ที่อยู่ตามทะเบียนบ้าน:</span><br />
                        <span style={{ color: '#333' }}>{caseData.investor_address}</span>
                      </div>
                    )}
                    {caseData.investor_profile_marital_status === 'สมรส' && caseData.investor_spouse_name && (
                      <div style={{ gridColumn: '1 / -1', background: '#ede9fe', borderRadius: 6, padding: '6px 10px' }}>
                        <span style={{ color: '#7c3aed', fontSize: 11, fontWeight: 600 }}>
                          <i className="fas fa-heart" style={{ marginRight: 4 }}></i>คู่สมรส:
                        </span>{' '}
                        <strong>{caseData.investor_spouse_name}</strong>
                        {caseData.investor_spouse_national_id && (
                          <span style={{ color: '#666', marginLeft: 8, fontFamily: 'monospace' }}>
                            บัตร: {caseData.investor_spouse_national_id}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {caseData.investor_id_card_image && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e9d5ff' }}>
                      <a href={caseData.investor_id_card_image.startsWith('/') ? caseData.investor_id_card_image : `/${caseData.investor_id_card_image}`}
                        target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: '#7c3aed', textDecoration: 'underline' }}>
                        <i className="fas fa-id-card" style={{ marginRight: 4 }}></i>ดูสำเนาบัตรประชาชนนายทุน
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* ข้อมูลจากฝ่ายขาย */}
            <CaseInfoSummary caseId={caseData.id} />

            {/* ★ กระดิ่งแจ้งฝ่ายต่างๆ */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fas fa-satellite-dish" style={{ marginRight: 5 }}></i>ส่งกระดิ่งแจ้งฝ่าย
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>

                {/* ฝ่ายขาย — green */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifySalesOnSave ? '#ecfdf5' : '#fafafa',
                  border: `2px solid ${notifySalesOnSave ? '#6ee7b7' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifySalesOnSave ? '0 0 0 3px rgba(110,231,183,0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input type="checkbox" checked={notifySalesOnSave} onChange={e => setNotifySalesOnSave(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#059669', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifySalesOnSave ? '#065f46' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifySalesOnSave && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายขาย
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>แจ้งผลประมูลทรัพย์</div>
                  </div>
                </label>

                {/* ฝ่ายนิติ — purple */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifyLegalOnSave ? '#faf5ff' : '#fafafa',
                  border: `2px solid ${notifyLegalOnSave ? '#a855f7' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifyLegalOnSave ? '0 0 0 3px rgba(168,85,247,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input type="checkbox" checked={notifyLegalOnSave} onChange={e => setNotifyLegalOnSave(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#a855f7', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifyLegalOnSave ? '#7e22ce' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifyLegalOnSave && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายนิติ
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>ส่งต่อนิติกรรมหลังประมูล</div>
                  </div>
                </label>

                {/* ฝ่ายบัญชี — amber */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
                  flex: 1, minWidth: 160,
                  background: notifyAccountingOnSave ? '#fffbeb' : '#fafafa',
                  border: `2px solid ${notifyAccountingOnSave ? '#f59e0b' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 14px',
                  boxShadow: notifyAccountingOnSave ? '0 0 0 3px rgba(245,158,11,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}>
                  <input type="checkbox" checked={notifyAccountingOnSave} onChange={e => setNotifyAccountingOnSave(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#f59e0b', cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: notifyAccountingOnSave ? '#b45309' : '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {notifyAccountingOnSave && <i className="fas fa-bell" style={{ fontSize: 12, animation: 'bellShake 0.4s ease' }}></i>}
                      ฝ่ายบัญชี
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>แจ้งจัดการการเงินหลังประมูล</div>
                  </div>
                </label>

              </div>
            </div>

            {/* ปุ่มบันทึก */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '12px 32px', flex: 1 }}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</> : <><i className="fas fa-save"></i> บันทึกข้อมูล</>}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/auction')} style={{ padding: '12px 24px' }}>
                ยกเลิก
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <CancelCaseButton caseId={caseData.id} caseCode={caseData.case_code} caseStatus={caseData.status} onSuccess={() => window.location.reload()} />
            </div>
          </div>

        </div>
      </form>
      <style>{`
        @keyframes bellShake {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(-18deg); }
          40%  { transform: rotate(18deg); }
          60%  { transform: rotate(-12deg); }
          80%  { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  )
}

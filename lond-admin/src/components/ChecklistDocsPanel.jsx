/**
 * ChecklistDocsPanel — Viewer + uploader + tick-checker for checklist documents
 * Used in: SalesFormPage, AppraisalEditPage, ApprovalEditPage, LegalEditPage,
 *          IssuingEditPage, AuctionEditPage, CaseEditPage
 *
 * Props:
 *   caseData       — the case/loan_request data object (must include lr.* checklist fields)
 *   lrId           — loan_request.id — ถ้าส่งมา → tick ได้ (ทุกฝ่าย), ไม่ส่ง → อ่านอย่างเดียว
 *   token          — JWT token
 *   onDocsUpdated  — callback(field, paths[]) หลัง upload/remove
 *   canUpload      — true = แสดงปุ่มอัพโหลด (ฝ่ายขาย + นิติเท่านั้น)
 */
import { useState, useEffect } from 'react'

const API = '/api/admin'

// ── helpers ───────────────────────────────────────────────────────────────────
function parseFiles(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) || [] } catch { return [] }
}

// ── Marital doc definitions (borrower_id_card อยู่ทุกสถานะ เป็นรายการแรก) ────
const BORROWER_ID = { field: 'borrower_id_card', label: 'สำเนาบัตรประชาชนผู้กู้ (รับรองสำเนาถูกต้อง)', required: true }

const _marriedRegDocs = [
  BORROWER_ID,
  { field: 'house_reg_book',  label: 'สำเนาทะเบียนบ้านผู้กู้',           required: true },
  { field: 'marriage_cert',   label: 'ทะเบียนสมรส',                      required: true },
  { field: 'spouse_id_card',  label: 'สำเนาบัตรประชาชนคู่สมรส',         required: true },
  { field: 'spouse_reg_copy', label: 'สำเนาทะเบียนบ้านคู่สมรส',         required: true },
]

const MARITAL_DOCS = {
  single: [
    BORROWER_ID,
    { field: 'house_reg_book', label: 'สำเนาทะเบียนบ้าน',               required: true },
  ],
  married:       _marriedRegDocs,
  married_reg:   _marriedRegDocs,
  married_unreg: [
    BORROWER_ID,
    { field: 'house_reg_book', label: 'สำเนาทะเบียนบ้านผู้กู้',          required: true },
    { field: 'single_cert',    label: 'หนังสือรับรองโสด / ยืนยันไม่จดทะเบียน', required: true },
  ],
  divorced: [
    BORROWER_ID,
    { field: 'house_reg_book', label: 'สำเนาทะเบียนบ้าน',               required: true },
    { field: 'divorce_doc',    label: 'ทะเบียนหย่า',                     required: true },
  ],
  widowed: [
    BORROWER_ID,
    { field: 'house_reg_book', label: 'สำเนาทะเบียนบ้าน',               required: true },
    { field: 'death_cert',     label: 'ใบมรณบัตรคู่สมรส',               required: true },
  ],
  inherited: [
    BORROWER_ID,
    { field: 'house_reg_book',     label: 'สำเนาทะเบียนบ้านผู้รับมรดก', required: true },
    { field: 'death_cert',         label: 'ใบมรณบัตรเจ้ามรดก',          required: true },
    { field: 'will_court_doc',     label: 'พินัยกรรม หรือ คำสั่งศาล',   required: false },
    { field: 'testator_house_reg', label: 'สำเนาทะเบียนบ้านเจ้ามรดก',  required: true },
  ],
}

const MARITAL_META = {
  single:        { label: 'โสด',                  color: '#1565c0' },
  married:       { label: 'สมรสจดทะเบียน',        color: '#6a1b9a' },
  married_reg:   { label: 'สมรสจดทะเบียน',        color: '#6a1b9a' },
  married_unreg: { label: 'สมรสไม่จดทะเบียน',     color: '#e65100' },
  divorced:      { label: 'หย่า',                  color: '#c62828' },
  widowed:       { label: 'หม้าย',                 color: '#7b1fa2' },
  inherited:     { label: 'รับมรดก',               color: '#2e7d32' },
}

// ── Property type doc definitions ─────────────────────────────────────────────
const PROP_TYPE_CHECKLIST = {
  house: [
    { key: 'deed_copy',        label: 'โฉนดที่ดิน',                       required: true },
    { key: 'building_permit',  label: 'ใบอนุญาตก่อสร้าง',                required: true },
    { key: 'house_reg_prop',   label: 'ทะเบียนบ้านของทรัพย์',             required: true },
    { key: 'sale_contract',    label: 'สัญญาซื้อขาย / สัญญาจอง',          required: false },
    { key: 'debt_free_cert',   label: 'ใบปลอดภาระ',                       required: true },
    { key: 'blueprint',        label: 'แบบแปลนบ้าน',                      required: false },
    { key: 'property_photos',  label: 'รูปถ่ายทรัพย์',                    required: true },
    { key: 'land_tax_receipt', label: 'หลักฐานชำระภาษีที่ดิน',            required: true },
    { key: 'maps_url',         label: 'แผนที่/Google Maps ทำเล',           required: false },
  ],
  single_house: [
    { key: 'deed_copy',        label: 'โฉนดที่ดิน',                       required: true },
    { key: 'building_permit',  label: 'ใบอนุญาตก่อสร้าง',                required: true },
    { key: 'house_reg_prop',   label: 'ทะเบียนบ้านของทรัพย์',             required: true },
    { key: 'sale_contract',    label: 'สัญญาซื้อขาย / สัญญาจอง',          required: false },
    { key: 'debt_free_cert',   label: 'ใบปลอดภาระ',                       required: true },
    { key: 'blueprint',        label: 'แบบแปลนบ้าน',                      required: false },
    { key: 'property_photos',  label: 'รูปถ่ายทรัพย์',                    required: true },
    { key: 'land_tax_receipt', label: 'หลักฐานชำระภาษีที่ดิน',            required: true },
    { key: 'maps_url',         label: 'แผนที่/Google Maps ทำเล',           required: false },
  ],
  townhouse: [
    { key: 'deed_copy',        label: 'โฉนดที่ดิน',                       required: true },
    { key: 'building_permit',  label: 'ใบอนุญาตก่อสร้าง',                required: true },
    { key: 'house_reg_prop',   label: 'ทะเบียนบ้านของทรัพย์',             required: true },
    { key: 'sale_contract',    label: 'สัญญาซื้อขาย / สัญญาจอง',          required: false },
    { key: 'debt_free_cert',   label: 'ใบปลอดภาระ',                       required: true },
    { key: 'property_photos',  label: 'รูปถ่ายทรัพย์',                    required: true },
    { key: 'land_tax_receipt', label: 'หลักฐานชำระภาษีที่ดิน',            required: true },
    { key: 'maps_url',         label: 'แผนที่/Google Maps ทำเล',           required: false },
  ],
  condo: [
    { key: 'condo_title_deed',   label: 'หนังสือกรรมสิทธิ์ห้องชุด (อ.ช.2)', required: true },
    { key: 'debt_free_cert',     label: 'ใบปลอดหนี้นิติบุคคลอาคารชุด',    required: true },
    { key: 'condo_location_map', label: 'แผนที่ตั้งโครงการ / แผนผังห้อง',  required: false },
    { key: 'sale_contract',      label: 'สัญญาซื้อขาย / สัญญาจอง',         required: false },
    { key: 'common_fee_receipt', label: 'ใบเสร็จค่าส่วนกลาง (3 เดือนล่าสุด)', required: true },
    { key: 'property_photos',    label: 'รูปถ่ายห้อง',                      required: true },
    { key: 'floor_plan',         label: 'แปลนห้อง (floor plan)',             required: false },
    { key: 'building_permit',    label: 'ใบอนุญาตก่อสร้างอาคาร (ถ้ามี)',   required: false },
    { key: 'maps_url',           label: 'แผนที่/Google Maps ทำเล',           required: false },
  ],
  land: [
    { key: 'deed_copy',           label: 'โฉนดที่ดิน',                      required: true },
    { key: 'land_tax_receipt',    label: 'หลักฐานชำระภาษีที่ดิน',           required: true },
    { key: 'location_sketch_map', label: 'แผนที่สังเขปทำเล',               required: true },
    { key: 'property_photos',     label: 'รูปถ่ายที่ดิน (4 ด้าน)',           required: true },
    { key: 'sale_contract',       label: 'สัญญาซื้อขาย (ถ้ามี)',             required: false },
    { key: 'land_use_cert',       label: 'หนังสือรับรองการใช้ประโยชน์',      required: false },
    { key: 'debt_free_cert',      label: 'ใบปลอดภาระ',                      required: true },
    { key: 'maps_url',            label: 'แผนที่/Google Maps ทำเล',          required: false },
  ],
  shophouse: [
    { key: 'deed_copy',        label: 'โฉนดที่ดิน',                         required: true },
    { key: 'building_permit',  label: 'ใบอนุญาตก่อสร้าง',                  required: true },
    { key: 'property_photos',  label: 'รูปถ่ายทรัพย์',                      required: true },
    { key: 'land_tax_receipt', label: 'หลักฐานชำระภาษีที่ดิน',              required: true },
    { key: 'rental_contract',  label: 'สัญญาเช่า (ถ้าปล่อยเช่า)',           required: false },
    { key: 'business_reg',     label: 'ทะเบียนพาณิชย์ (ถ้าประกอบการค้า)',  required: false },
    { key: 'debt_free_cert',   label: 'ใบปลอดภาระ',                         required: true },
    { key: 'maps_url',         label: 'แผนที่/Google Maps ทำเล',             required: false },
  ],
  apartment: [
    { key: 'deed_copy',        label: 'โฉนดที่ดิน',                              required: true },
    { key: 'building_permit',  label: 'ใบอนุญาตก่อสร้าง',                       required: true },
    { key: 'house_reg_prop',   label: 'ทะเบียนบ้านของทรัพย์',                    required: true },
    { key: 'sale_contract',    label: 'สัญญาซื้อขาย / สัญญาจอง',               required: false },
    { key: 'debt_free_cert',   label: 'ใบปลอดภาระ',                              required: true },
    { key: 'property_photos',  label: 'รูปถ่ายทรัพย์ (ภายนอก/ภายใน/ห้องตัวอย่าง)', required: true },
    { key: 'land_tax_receipt', label: 'หลักฐานชำระภาษีที่ดิน',                   required: true },
    { key: 'rental_contract',  label: 'สัญญาเช่า / รายชื่อผู้เช่า (ถ้ามี)',      required: false },
    { key: 'business_reg',     label: 'ใบอนุญาตประกอบกิจการหอพัก (ถ้ามี)',       required: false },
    { key: 'maps_url',         label: 'แผนที่/Google Maps ทำเล',                  required: false },
  ],
}

const PROP_KEY_MAP = {
  house: 'house', single_house: 'single_house', townhouse: 'townhouse',
  condo: 'condo', land: 'land', shophouse: 'shophouse', apartment: 'apartment',
  'บ้านเดี่ยว': 'single_house', 'บ้าน': 'house', 'ทาวน์โฮม': 'townhouse',
  'คอนโด': 'condo', 'ที่ดิน': 'land', 'ตึกแถว': 'shophouse',
  'หอพัก': 'apartment', 'อพาร์ตเมนต์': 'apartment',
}

const propertyTypeLabel = {
  house: 'บ้าน', townhouse: 'ทาวน์โฮม', condo: 'คอนโด',
  single_house: 'บ้านเดี่ยว (สร้างเอง)', shophouse: 'ตึกแถว',
  apartment: 'หอพัก / อพาร์ตเมนต์', land: 'ที่ดินเปล่า', other: 'อื่นๆ',
}

// ── export helper for other components to compute readiness ───────────────────
export function checkRequiredDocsReady(caseData, ticks = {}) {
  if (!caseData) return { ready: false, missing: [], total: 0, uploaded: 0 }
  const missing = []; let total = 0; let uploaded = 0

  const maritalDocs = caseData.marital_status ? MARITAL_DOCS[caseData.marital_status] : null
  if (maritalDocs) {
    maritalDocs.forEach(doc => {
      if (!doc.required) return
      total++
      if (parseFiles(caseData[doc.field]).length > 0 || ticks[doc.field]) uploaded++
      else missing.push(doc.label)
    })
  } else {
    // if no marital status set, still require borrower_id_card
    total++
    if (parseFiles(caseData.borrower_id_card).length > 0 || ticks.borrower_id_card) uploaded++
    else missing.push('สำเนาบัตรประชาชนลูกหนี้')
  }

  const propTypeKey = PROP_KEY_MAP[caseData.property_type] || caseData.property_type
  const propItems = propTypeKey ? PROP_TYPE_CHECKLIST[propTypeKey] : null
  if (propItems) {
    propItems.forEach(item => {
      if (!item.required) return
      total++
      if (parseFiles(caseData[item.key]).length > 0 || ticks[item.key]) uploaded++
      else missing.push(item.label)
    })
  }
  return { ready: total > 0 && missing.length === 0, missing, total, uploaded }
}

// ── FileThumbnail ─────────────────────────────────────────────────────────────
function FileThumbnail({ fp }) {
  const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(fp)
  const isPdf = /\.pdf$/i.test(fp)
  return (
    <div onClick={() => window.open(fp.startsWith('/') ? fp : `/${fp}`, '_blank')} title={fp.split('/').pop()}
      style={{ cursor: 'pointer', display: 'inline-flex' }}>
      {isImg ? (
        <img src={fp.startsWith('/') ? fp : `/${fp}`} alt=""
          style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
      ) : (
        <div style={{ width: 52, height: 52, borderRadius: 6, border: '1px solid #ddd',
          background: isPdf ? '#fff3e0' : '#f5f5f5', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#666', gap: 2 }}>
          <i className={`fas ${isPdf ? 'fa-file-pdf' : 'fa-file'}`}
            style={{ fontSize: 18, color: isPdf ? '#f57c00' : '#90a4ae' }} />
          <span>{isPdf ? 'PDF' : 'FILE'}</span>
        </div>
      )}
    </div>
  )
}

// ── DocRow ────────────────────────────────────────────────────────────────────
function DocRow({ fieldOrKey, label, required, files, checked, onTickChange, lrId, token, onDocsUpdated, canUpload }) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(null)

  const handleUpload = async (e) => {
    const picked = e.target.files
    if (!lrId || !picked?.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      for (const f of Array.from(picked)) fd.append(fieldOrKey, f)
      const res = await fetch(`${API}/debtors/${lrId}/checklist-docs`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await res.json()
      if (data.success && onDocsUpdated) onDocsUpdated(data.field, data.paths)
    } catch {}
    setUploading(false)
    e.target.value = ''
  }

  const handleRemove = async (fp) => {
    if (!lrId || !window.confirm('ต้องการลบไฟล์นี้?')) return
    setRemoving(fp)
    try {
      const res = await fetch(`${API}/debtors/${lrId}/checklist-docs/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ field: fieldOrKey, file_path: fp }),
      })
      const data = await res.json()
      if (data.success && onDocsUpdated) onDocsUpdated(fieldOrKey, data.paths)
    } catch {}
    setRemoving(null)
  }

  const hasFiles = files.length > 0
  const isDone = hasFiles || !!checked
  const canInteract = !!lrId  // ทุกฝ่ายที่มี lrId → ติ๊กได้

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${isDone ? '#86efac' : '#e5e7eb'}`,
      borderRadius: 8, padding: '8px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {canInteract ? (
          <input
            type="checkbox"
            checked={!!checked}
            onChange={e => onTickChange && onTickChange(fieldOrKey, e.target.checked)}
            title="ติ๊กรับทราบ (ไม่จำเป็นต้องอัพโหลดก็ได้)"
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#16a34a', flexShrink: 0 }}
          />
        ) : (
          <i className={`fas ${isDone ? 'fa-check-circle' : 'fa-circle'}`}
            style={{ color: isDone ? '#16a34a' : '#d1d5db', fontSize: 14, flexShrink: 0 }} />
        )}
        <span style={{
          flex: 1, fontSize: 13,
          fontWeight: isDone ? 600 : 400,
          color: isDone ? '#14532d' : '#6b7280',
        }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: 4, fontSize: 10 }}>*</span>}
          {(!!checked && !hasFiles) && (
            <span style={{ marginLeft: 6, fontSize: 10, color: '#16a34a',
              background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 6px' }}>
              ติ๊กแล้ว
            </span>
          )}
        </span>
        {canInteract && canUpload && (
          <label style={{
            cursor: uploading ? 'default' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
            background: uploading ? '#e5e7eb' : '#eff6ff',
            color: uploading ? '#9ca3af' : '#2563eb',
            border: '1px solid #bfdbfe', whiteSpace: 'nowrap',
          }}>
            {uploading
              ? <><i className="fas fa-spinner fa-spin" />&nbsp;อัพโหลด...</>
              : <><i className="fas fa-upload" />&nbsp;อัพโหลด</>}
            <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
              disabled={uploading} onChange={handleUpload} />
          </label>
        )}
        {!hasFiles && !checked && !canInteract && (
          <span style={{ fontSize: 11, color: '#9ca3af' }}>ยังไม่มีไฟล์</span>
        )}
      </div>
      {hasFiles && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 24 }}>
          {files.map((fp, i) => (
            <div key={i} style={{ position: 'relative', display: 'inline-flex' }}>
              <FileThumbnail fp={fp} />
              {canInteract && canUpload && (
                <button type="button" onClick={() => handleRemove(fp)}
                  disabled={removing === fp}
                  title="ลบไฟล์"
                  style={{
                    position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                    borderRadius: '50%',
                    background: removing === fp ? '#9ca3af' : '#ef4444',
                    color: '#fff', border: 'none', fontSize: 9, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  }}>
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChecklistDocsPanel({
  caseData,
  skipMarital = false,   // kept for backwards compat but ignored
  lrId,
  token,
  onDocsUpdated,
  canUpload = false,     // true = ฝ่ายขาย + นิติเท่านั้น
}) {
  const [localDocs, setLocalDocs]     = useState({})
  const [localTicks, setLocalTicks]   = useState({})
  const [maritalOpen, setMaritalOpen] = useState(true)   // เปิดไว้เลย
  const [propOpen, setPropOpen]       = useState(true)   // เปิดไว้เลย

  // โหลด ticks จาก server (ticks เก็บใน checklist_ticks_json ไม่ได้อยู่ใน caseData)
  useEffect(() => {
    if (!lrId || !token) return
    fetch(`${API}/debtors/${lrId}/checklist-ticks`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setLocalTicks(d.ticks || {}) })
      .catch(() => {})
  }, [lrId])

  if (!caseData) return null

  // ── getFiles: ถ้าอัพโหลดในหน้านี้แล้ว → ใช้ localDocs; ไม่งั้น → ใช้ caseData ─
  const getFiles = (field) => {
    if (localDocs[field] !== undefined)
      return Array.isArray(localDocs[field]) ? localDocs[field] : []
    return parseFiles(caseData[field])
  }

  const getTick  = (field) => !!localTicks[field]
  const isDone   = (field) => getFiles(field).length > 0 || getTick(field)

  const handleDocUpdated = (field, paths) => {
    setLocalDocs(prev => ({ ...prev, [field]: Array.isArray(paths) ? paths : [] }))
    if (onDocsUpdated) onDocsUpdated(field, paths)
  }

  const handleTickChange = async (field, checked) => {
    setLocalTicks(prev => ({ ...prev, [field]: checked }))
    if (!lrId || !token) return
    try {
      await fetch(`${API}/debtors/${lrId}/checklist-ticks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ field, checked }),
      })
    } catch {}
  }

  const maritalKey  = caseData.marital_status
  const maritalMeta = maritalKey ? MARITAL_META[maritalKey] : null
  const maritalDocs = maritalKey ? (MARITAL_DOCS[maritalKey] || null) : null

  const propTypeKey = PROP_KEY_MAP[caseData.property_type] || caseData.property_type
  const propItems   = propTypeKey ? PROP_TYPE_CHECKLIST[propTypeKey] : null

  const maritalDone = maritalDocs ? maritalDocs.filter(i => isDone(i.field)).length : 0
  const propDone    = propItems   ? propItems.filter(i => isDone(i.key)).length     : 0

  // นับไฟล์ที่อัพโหลดไปทั้งหมด (marital + property)
  const allFields = [
    ...(maritalDocs || []).map(d => d.field),
    ...(propItems   || []).map(d => d.key),
  ]
  const totalUploaded = allFields.reduce((sum, f) => sum + getFiles(f).length, 0)
  const totalItems    = allFields.length

  const canInteract = !!lrId

  return (
    <div style={{ marginBottom: 16 }}>

      {/* ── Summary badge row ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#1e40af', color: '#fff', borderRadius: 8,
          padding: '5px 14px', fontSize: 12, fontWeight: 700,
        }}>
          <i className="fas fa-folder-open" />
          เอกสารที่ฝ่ายขายอัพโหลด
        </div>
        <div style={{
          background: totalUploaded > 0 ? '#f0fdf4' : '#fef9c3',
          color: totalUploaded > 0 ? '#15803d' : '#92400e',
          border: `1px solid ${totalUploaded > 0 ? '#86efac' : '#fde68a'}`,
          borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,
        }}>
          <i className="fas fa-paperclip" style={{ marginRight: 4 }} />
          {totalUploaded}/{totalItems} ไฟล์
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
          {canInteract && canUpload
            ? 'ติ๊กหรืออัพโหลดได้'
            : canInteract
              ? 'ติ๊กได้ — อัพโหลดได้เฉพาะฝ่ายขาย/นิติ'
              : 'อ่านอย่างเดียว — แก้ไขได้ที่ฝ่ายขาย'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Marital section ──────────────────────────────────────────────── */}
        {maritalDocs && maritalDocs.length > 0 && maritalMeta && (
          <div style={{ border: `1.5px solid ${maritalMeta.color}40`, borderRadius: 10, overflow: 'hidden' }}>
            <button type="button" onClick={() => setMaritalOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: `${maritalMeta.color}10`,
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
              <div style={{
                background: maritalMeta.color, color: '#fff', borderRadius: 6,
                padding: '2px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {maritalMeta.label}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#111', flex: 1 }}>
                <i className="fas fa-user-circle" style={{ marginRight: 6, color: maritalMeta.color }} />
                เอกสารส่วนตัว / สถานะสมรส
              </div>
              <div style={{
                background: maritalDone === maritalDocs.length ? '#dcfce7' : '#fef9c3',
                color: maritalDone === maritalDocs.length ? '#15803d' : '#92400e',
                border: `1px solid ${maritalDone === maritalDocs.length ? '#86efac' : '#fde68a'}`,
                borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {maritalDone}/{maritalDocs.length}
              </div>
              <i className={`fas fa-chevron-${maritalOpen ? 'up' : 'down'}`}
                style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }} />
            </button>
            {maritalOpen && (
              <div style={{
                padding: '10px 14px', background: `${maritalMeta.color}05`,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {maritalDocs.map(item => (
                  <DocRow key={item.field}
                    fieldOrKey={item.field} label={item.label} required={item.required}
                    files={getFiles(item.field)}
                    checked={getTick(item.field)}
                    onTickChange={handleTickChange}
                    lrId={lrId} token={token}
                    onDocsUpdated={handleDocUpdated}
                    canUpload={canUpload}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Property type section ────────────────────────────────────────── */}
        {propItems && (
          <div style={{ border: '1.5px solid #86efac', borderRadius: 10, overflow: 'hidden' }}>
            <button type="button" onClick={() => setPropOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: '#f0fdf4',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
              <div style={{
                background: '#16a34a', color: '#fff', borderRadius: 6,
                padding: '2px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {propertyTypeLabel[caseData.property_type] || caseData.property_type}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#111', flex: 1 }}>
                <i className="fas fa-home" style={{ marginRight: 6, color: '#16a34a' }} />
                เอกสารทรัพย์
              </div>
              <div style={{
                background: propDone === propItems.length ? '#dcfce7' : '#fef9c3',
                color: propDone === propItems.length ? '#15803d' : '#92400e',
                border: `1px solid ${propDone === propItems.length ? '#86efac' : '#fde68a'}`,
                borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {propDone}/{propItems.length}
              </div>
              <i className={`fas fa-chevron-${propOpen ? 'up' : 'down'}`}
                style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }} />
            </button>
            {propOpen && (
              <div style={{
                padding: '10px 14px', background: '#f0fdf4',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {propItems.map(item => (
                  <DocRow key={item.key}
                    fieldOrKey={item.key} label={item.label} required={item.required}
                    files={getFiles(item.key)}
                    checked={getTick(item.key)}
                    onTickChange={handleTickChange}
                    lrId={lrId} token={token}
                    onDocsUpdated={handleDocUpdated}
                    canUpload={canUpload}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

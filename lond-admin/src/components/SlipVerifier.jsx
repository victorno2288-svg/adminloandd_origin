// SlipVerifier.jsx — EasySlip verification component
// ใช้งาน: <SlipVerifier slipType="appraisal_fee" loanRequestId={id} onConfirm={file => ...} />
// เมื่อ user เลือกไฟล์ → ตรวจสอบ EasySlip อัตโนมัติ → แสดง modal ผล → กด "ยืนยัน" → onConfirm(file)

import { useState, useRef } from 'react'

const token = () => localStorage.getItem('loandd_admin')

// ชื่อประเภทสลิปภาษาไทย
const SLIP_TYPE_LABEL = {
  appraisal_fee: 'ค่าประเมิน',
  bag_fee:       'ค่าปากถุง',
  advance:       'ค่าหักล่วงหน้า',
  deposit:       'มัดจำ',
  commission:    'ค่าคอมมิชชั่น',
  transfer:      'โอนเงิน',
  legal:         'นิติกรรม',
  general:       'สลิป',
}

// สีธนาคาร
const BANK_BG = {
  KBANK: '#1a5276', SCB: '#4a148c', KTB: '#1565c0', BBL: '#1a237e',
  BAY:   '#ff6f00', TTB: '#00897b', GSB: '#e53935', BAAC:'#558b2f',
  UOB:   '#0d47a1', LH:  '#c0392b', TMB: '#00796b',
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SlipVerifier({
  slipType = 'general',   // ประเภทสลิป
  loanRequestId,           // optional — loan_request_id สำหรับบันทึกใน DB
  caseId,                  // optional — case_id สำหรับบันทึกใน DB
  currentSrc,              // URL สลิปเดิม (ถ้ามี)
  onConfirm,               // (file: File, verifyData: object|null) → void
  label,                   // text ปุ่ม (optional)
  disabled = false,
}) {
  const [verifying,  setVerifying ] = useState(false)
  const [modal,      setModal     ] = useState(null)   // null | { success, data, isDuplicate, message, file }
  const [confirmed,  setConfirmed ] = useState(null)   // { file, verifyData } — หลัง confirm
  const inputRef = useRef(null)

  // ── เมื่อ user เลือกไฟล์ ──
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVerifying(true)

    const fd = new FormData()
    fd.append('file',     file)
    fd.append('slip_type', slipType)
    if (loanRequestId) fd.append('loan_request_id', loanRequestId)
    if (caseId)        fd.append('case_id',         caseId)

    try {
      const res    = await fetch('/api/admin/slip/verify', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body:    fd,
      })
      const result = await res.json()
      setModal({ ...result, file })
    } catch {
      setModal({ success: false, message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', file })
    } finally {
      setVerifying(false)
    }
  }

  // ── user กด "ยืนยัน" ──
  const handleConfirm = () => {
    if (!modal) return
    const conf = { file: modal.file, verifyData: modal.success ? modal.data : null }
    setConfirmed(conf)
    onConfirm?.(conf.file, conf.verifyData)
    setModal(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── user กด "ยกเลิก" ──
  const handleCancel = () => {
    setModal(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── user กด "เปลี่ยน" / "ล้าง" ──
  const handleClear = () => {
    setConfirmed(null)
    onConfirm?.(null, null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const typeLabel  = SLIP_TYPE_LABEL[slipType] || 'สลิป'
  const btnLabel   = label || (confirmed ? `เปลี่ยน${typeLabel}` : `แนบ${typeLabel}`)
  const btnBg      = verifying ? '#f1f5f9' : confirmed ? '#f0fdf4' : '#fefce8'
  const btnBorder  = verifying ? '#94a3b8' : confirmed ? '#86efac' : '#facc15'
  const btnColor   = verifying ? '#94a3b8' : confirmed ? '#16a34a' : '#92400e'

  return (
    <div>
      {/* ── ผลหลัง confirm ── */}
      {confirmed && (
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'8px 12px', background:'#f0fdf4',
          border:'1.5px solid #86efac', borderRadius:10, marginBottom:8,
        }}>
          <i className="fas fa-check-circle" style={{ color:'#16a34a', fontSize:14 }}></i>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#15803d' }}>
              ✅ ยืนยันสลิปแล้ว
              {confirmed.verifyData?.amount
                ? ` — ฿${Number(confirmed.verifyData.amount).toLocaleString('th-TH')}`
                : confirmed.verifyData ? '' : ' (ไม่ผ่าน EasySlip)'}
            </div>
            {confirmed.verifyData && (
              <div style={{ fontSize:10, color:'#6b7280', marginTop:1 }}>
                {confirmed.verifyData.senderName} ({confirmed.verifyData.senderBank}) → {confirmed.verifyData.receiverName}
              </div>
            )}
            <div style={{ fontSize:10, color:'#9ca3af', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {confirmed.file.name}
            </div>
          </div>
          <button type="button" onClick={handleClear}
            style={{ padding:'3px 8px', background:'#fef2f2', color:'#dc2626', border:'1.5px solid #fca5a5', borderRadius:6, fontSize:11, cursor:'pointer', flexShrink:0 }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* ── ปุ่มอัพโหลด ── */}
      <label style={{
        display:'inline-flex', alignItems:'center', gap:7,
        padding:'7px 16px', background:btnBg,
        border:`1.5px dashed ${btnBorder}`,
        borderRadius:8, cursor: (disabled || verifying) ? 'not-allowed' : 'pointer',
        fontSize:12, fontWeight:600, color:btnColor,
        opacity: disabled ? 0.5 : 1, transition:'all 0.2s',
      }}>
        {verifying
          ? <><i className="fas fa-spinner fa-spin"></i> กำลังตรวจสอบ EasySlip...</>
          : confirmed
          ? <><i className="fas fa-exchange-alt"></i> {btnLabel}</>
          : <><i className="fas fa-shield-alt"></i> {btnLabel}</>
        }
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          style={{ display:'none' }}
          disabled={disabled || verifying}
          onChange={handleFileSelect}
        />
      </label>
      {!confirmed && (
        <span style={{ fontSize:10, color:'#9ca3af', marginLeft:6 }}>ตรวจ EasySlip อัตโนมัติ</span>
      )}

      {/* ── สลิปเดิม (ถ้ายังไม่มี confirmed) ── */}
      {currentSrc && !confirmed && (
        <div style={{ marginTop:6, fontSize:11 }}>
          <a href={currentSrc.startsWith('/') ? currentSrc : `/${currentSrc}`}
            target="_blank" rel="noreferrer" style={{ color:'#2563eb', display:'inline-flex', alignItems:'center', gap:4 }}>
            <i className="fas fa-paperclip" style={{ fontSize:10 }}></i>ดูสลิปปัจจุบัน
          </a>
        </div>
      )}

      {/* ── Modal ผลการตรวจ ── */}
      {modal && (
        <SlipResultModal
          modal={modal}
          typeLabel={typeLabel}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

// ============================================================
// MODAL — แสดงผลการตรวจสอบสลิป
// ============================================================
function SlipResultModal({ modal, typeLabel, onConfirm, onCancel }) {
  const { success, data, isDuplicate, message, file } = modal
  const previewUrl = file && !/\.pdf$/i.test(file.name) ? URL.createObjectURL(file) : null

  const headerBg = success
    ? 'linear-gradient(135deg,#14532d,#16a34a)'
    : isDuplicate
    ? 'linear-gradient(135deg,#92400e,#d97706)'
    : 'linear-gradient(135deg,#7f1d1d,#dc2626)'
  const headerIcon = success ? 'fa-shield-check' : isDuplicate ? 'fa-copy' : 'fa-exclamation-triangle'
  const confirmBg  = success ? '#16a34a' : isDuplicate ? '#d97706' : '#64748b'
  const confirmLbl = success
    ? 'ยืนยันและบันทึกสลิป'
    : isDuplicate
    ? 'บันทึกแม้สลิปซ้ำ'
    : 'บันทึกต่อไป (ไม่ผ่าน EasySlip)'

  const fmtDate = (d) => {
    if (!d) return '-'
    try { return new Date(d).toLocaleString('th-TH', { dateStyle:'medium', timeStyle:'short' }) }
    catch { return d }
  }

  const bankBg  = (bank) => BANK_BG[bank] || '#374151'

  return (
    <>
      {/* Backdrop */}
      <div onClick={onCancel}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:99990 }} />

      {/* Modal box */}
      <div style={{
        position:'fixed', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        zIndex:99991, background:'#fff', borderRadius:16,
        width:500, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto',
        boxShadow:'0 24px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px', background:headerBg,
          color:'#fff', display:'flex', alignItems:'center', gap:12,
          position:'sticky', top:0, zIndex:1, borderRadius:'16px 16px 0 0',
        }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className={`fas ${headerIcon}`} style={{ fontSize:18 }}></i>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800 }}>
              {success ? `✅ สลิปถูกต้อง — ${typeLabel}` : isDuplicate ? '⚠️ สลิปซ้ำในระบบ' : '❌ ตรวจสอบไม่ผ่าน'}
            </div>
            <div style={{ fontSize:11, opacity:0.85, marginTop:2 }}>
              {success ? 'EasySlip ยืนยันแล้ว' : isDuplicate ? 'สลิปนี้เคยถูกใช้แล้ว — ยังสามารถบันทึกได้' : 'ไม่พบ QR code — ตรวจสอบสลิปอีกครั้ง'}
            </div>
          </div>
          <button onClick={onCancel}
            style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:16, flexShrink:0 }}>✕</button>
        </div>

        <div style={{ padding:'20px 24px' }}>

          {/* ✅ Success — แสดงรายละเอียดสลิป */}
          {success && data && (
            <>
              {/* ยอดเงิน banner */}
              <div style={{
                background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                border:'2px solid #86efac', borderRadius:12,
                padding:'14px 18px', marginBottom:16,
                display:'flex', alignItems:'center', gap:14,
              }}>
                <div style={{ width:48, height:48, borderRadius:12, background:'#16a34a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className="fas fa-coins" style={{ color:'#fff', fontSize:20 }}></i>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#15803d', fontWeight:700, marginBottom:2 }}>ยอดโอน (ยืนยันจาก EasySlip)</div>
                  <div style={{ fontSize:28, fontWeight:900, color:'#15803d', lineHeight:1.1 }}>
                    ฿{Number(data.amount || 0).toLocaleString('th-TH', { minimumFractionDigits:2 })}
                  </div>
                  <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>
                    <i className="fas fa-calendar-alt" style={{ marginRight:4 }}></i>{fmtDate(data.date)}
                  </div>
                </div>
              </div>

              {/* ผู้โอน → ผู้รับ */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:10, marginBottom:14 }}>
                <BankCard label="ผู้โอน" name={data.senderName}   bank={data.senderBank}   account={data.senderAccount}   bankBg={bankBg(data.senderBank)}   />
                <div style={{ textAlign:'center' }}>
                  <i className="fas fa-arrow-right" style={{ color:'#94a3b8', fontSize:18 }}></i>
                  <div style={{ fontSize:9, color:'#cbd5e1', marginTop:2 }}>โอน</div>
                </div>
                <BankCard label="ผู้รับ"  name={data.receiverName} bank={data.receiverBank} account={data.receiverAccount} bankBg={bankBg(data.receiverBank)} />
              </div>

              {/* transRef */}
              {data.transRef && (
                <div style={{ fontSize:10, color:'#9ca3af', textAlign:'center', marginBottom:14, fontFamily:'monospace', background:'#f8fafc', padding:'4px 10px', borderRadius:6 }}>
                  Ref: {data.transRef}
                </div>
              )}
            </>
          )}

          {/* ⚠️ Duplicate */}
          {isDuplicate && (
            <div style={{ background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#92400e', marginBottom:4 }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight:6 }}></i>สลิปนี้เคยถูกใช้ในระบบแล้ว
              </div>
              <div style={{ fontSize:12, color:'#b45309' }}>
                กรุณาตรวจสอบว่าไม่ใช่สลิปซ้ำ — หากแน่ใจสามารถกดยืนยันต่อได้
              </div>
            </div>
          )}

          {/* ❌ Error */}
          {!success && !isDuplicate && (
            <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:4 }}>
                <i className="fas fa-times-circle" style={{ marginRight:6 }}></i>ตรวจสอบสลิปไม่ผ่าน
              </div>
              <div style={{ fontSize:12, color:'#b91c1c' }}>{message || 'ไม่พบ QR code — กรุณาส่งสลิปที่มี QR code ชัดเจน'}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>
                ยังสามารถบันทึกสลิปได้โดยไม่ผ่านการยืนยัน
              </div>
            </div>
          )}

          {/* Preview รูปสลิป */}
          {previewUrl && (
            <div style={{ marginBottom:16, textAlign:'center' }}>
              <img src={previewUrl} alt="slip"
                style={{ maxHeight:170, maxWidth:'100%', borderRadius:8, border:'1px solid #e2e8f0', objectFit:'contain' }} />
            </div>
          )}

          {/* Buttons */}
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={onCancel}
              style={{ flex:1, padding:'10px 14px', background:'#f1f5f9', color:'#475569', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <i className="fas fa-times" style={{ marginRight:6 }}></i>ยกเลิก
            </button>
            <button type="button" onClick={onConfirm}
              style={{ flex:2, padding:'10px 14px', background:confirmBg, color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <i className={`fas ${success ? 'fa-check' : 'fa-upload'}`} style={{ marginRight:6 }}></i>{confirmLbl}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Card ธนาคาร (ผู้โอน / ผู้รับ) ──
function BankCard({ label, name, bank, account, bankBg }) {
  return (
    <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', border:'1px solid #e2e8f0' }}>
      <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, marginBottom:6, textTransform:'uppercase' }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:800, color:'#1e293b', marginBottom:6, lineHeight:1.3 }}>{name || '-'}</div>
      {bank && (
        <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:bankBg, color:'#fff', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
          <i className="fas fa-university" style={{ fontSize:9 }}></i>{bank}
        </div>
      )}
      {account && (
        <div style={{ fontSize:10, color:'#9ca3af', marginTop:4, fontFamily:'monospace' }}>{account}</div>
      )}
    </div>
  )
}

// ============================================================
// SlipVerifyBadge — เดิมถูก remove ออก — redirect ไปที่ component ใหม่
// ============================================================
export { SlipVerifier }

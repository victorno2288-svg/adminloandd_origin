import { useState } from 'react'
import { getCurrentUser } from '../utils/auth'

const token = () => localStorage.getItem('loandd_admin')

/**
 * ปุ่มยกเลิกเคส — ทุกฝ่ายกดได้ แต่ต้องรออนุมัติจากฝ่ายอนุมัติ/super_admin
 * Props:
 *   caseId      — cases.id
 *   caseCode    — รหัสเคส (แสดงใน modal)
 *   caseStatus  — status ปัจจุบัน (ซ่อนปุ่มถ้า cancelled/pending_cancel)
 *   onSuccess   — callback หลัง submit สำเร็จ (reload หน้า หรือ navigate)
 */
export default function CancelCaseButton({ caseId, caseCode, caseStatus, onSuccess }) {
  // step: 0=ปิด, 1=ยืนยัน, 2=กรอกเหตุผล
  const [step, setStep] = useState(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // ฝ่ายขาย + ประเมิน + อนุมัติ + super_admin กดยกเลิกได้ (ต้องรออนุมัติจาก super_admin)
  const currentUser = getCurrentUser()
  const dept = currentUser?.department
  const canCancel = dept === 'super_admin' || dept === 'approval' || dept === 'sales' || dept === 'appraisal'

  // ฝ่ายอื่น: แสดงแค่สถานะถ้าเคสถูกยกเลิก/รอยกเลิกแล้ว
  if (!canCancel) {
    if (caseStatus === 'cancelled' || caseStatus === 'pending_cancel') {
      return (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#fdf2f2', border: '1px solid #f5c6c6', borderRadius: 8,
          padding: '8px 14px', fontSize: 13, color: '#c0392b'
        }}>
          <i className="fas fa-ban"></i>
          {caseStatus === 'pending_cancel' ? 'รออนุมัติยกเลิก' : 'เคสถูกยกเลิกแล้ว'}
        </div>
      )
    }
    return null
  }

  // ซ่อนถ้า cancelled หรือรออนุมัติยกเลิกแล้ว
  if (caseStatus === 'cancelled' || caseStatus === 'pending_cancel') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#fdf2f2', border: '1px solid #f5c6c6', borderRadius: 8,
        padding: '8px 14px', fontSize: 13, color: '#c0392b'
      }}>
        <i className="fas fa-ban"></i>
        {caseStatus === 'pending_cancel' ? 'รออนุมัติยกเลิก' : 'เคสถูกยกเลิกแล้ว'}
      </div>
    )
  }

  const handleOpen = () => { setStep(1); setReason(''); setErr('') }
  const handleClose = () => { if (!loading) { setStep(0); setReason(''); setErr('') } }

  const handleSubmit = async () => {
    if (!reason.trim()) { setErr('กรุณากรอกเหตุผลการยกเลิก'); return }
    setLoading(true)
    setErr('')
    try {
      const lsUser = JSON.parse(localStorage.getItem('loandd_admin_user') || '{}')
      const res = await fetch('/api/admin/cancellations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ case_id: caseId, requested_by: lsUser.id, reason: reason.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setStep(0)
        if (onSuccess) onSuccess()
      } else {
        setErr(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch {
      setErr('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setLoading(false)
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  }
  const boxStyle = {
    background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '92vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        style={{
          background: '#e74c3c', color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
          boxShadow: '0 2px 6px rgba(231,76,60,0.3)',
        }}
      >
        <i className="fas fa-times-circle"></i> ยกเลิกเคส
      </button>

      {/* ── Step 1: ยืนยัน ── */}
      {step === 1 && (
        <div style={overlayStyle} onClick={handleClose}>
          <div style={boxStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#fdf2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#e74c3c', fontSize: 22 }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>ต้องการยกเลิกเคสนี้ใช่ไหม?</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{caseCode}</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#555', margin: '0 0 22px', lineHeight: 1.65 }}>
              การยกเลิกต้องผ่านการอนุมัติจากผู้ดูแลระบบ<br />
              สถานะเคสจะเปลี่ยนเป็น <strong>"รออนุมัติยกเลิก"</strong> ก่อน
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  flex: 1, background: '#e74c3c', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '11px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer'
                }}
              >
                <i className="fas fa-check" style={{ marginRight: 6 }}></i>ใช่ ต้องการยกเลิก
              </button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1, background: '#f5f5f5', color: '#555', border: '1px solid #ddd',
                  borderRadius: 8, padding: '11px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer'
                }}
              >
                <i className="fas fa-times" style={{ marginRight: 6 }}></i>ไม่ใช่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: กรอกเหตุผล ── */}
      {step === 2 && (
        <div style={overlayStyle} onClick={handleClose}>
          <div style={boxStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fdf2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-comment-alt" style={{ color: '#e74c3c', fontSize: 16 }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>ระบุเหตุผลการยกเลิก</div>
                <div style={{ fontSize: 12, color: '#888' }}>{caseCode}</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>เหตุผลการยกเลิก <span style={{ color: '#e74c3c' }}>*</span></label>
              <textarea
                rows="4"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="ระบุเหตุผลการยกเลิกเคสนี้..."
                style={{ resize: 'vertical', marginTop: 6, fontSize: 13, borderColor: err ? '#e74c3c' : undefined }}
                disabled={loading}
              />
            </div>
            {err && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 10 }}><i className="fas fa-exclamation-circle"></i> {err}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1, background: '#e74c3c', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '11px 0', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? <><i className="fas fa-spinner fa-spin"></i> กำลังส่ง...</> : <><i className="fas fa-paper-plane"></i> ส่งคำขอยกเลิก</>}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                style={{
                  flex: 1, background: '#f5f5f5', color: '#555', border: '1px solid #ddd',
                  borderRadius: 8, padding: '11px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer'
                }}
              >
                <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i>ย้อนกลับ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

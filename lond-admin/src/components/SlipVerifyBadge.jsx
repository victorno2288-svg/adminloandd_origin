// ============================================================
// SlipVerifyBadge.jsx  — Preview + สแกน QR สลิป
// รองรับ: PromptPay, URL QR ทุกธนาคาร, ไม่มี QR
// แสดง: ชื่อธนาคาร, ยอด, ปลายทาง, Ref, สัญญาณสลิปปลอม
// ============================================================

import { useState, useCallback, useEffect } from 'react'
import { verifySlipFile } from '../utils/slipVerifier'

// ─── Hook ─────────────────────────────────────────────────────
// opts: { apiBase, token } — ส่งเพื่อเช็ค duplicate ref กับ backend
export function useSlipVerify(opts = {}) {
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying,    setVerifying]    = useState(false)

  const runVerify = useCallback(async (file, declaredAmount = null) => {
    if (!file) { setVerifyResult(null); return }
    setVerifying(true)
    setVerifyResult(null)
    try {
      const result = await verifySlipFile(file, declaredAmount, opts)
      setVerifyResult({ ...result, _file: file })
    } finally {
      setVerifying(false)
    }
  }, [opts.apiBase, opts.token]) // eslint-disable-line

  const reset = useCallback(() => setVerifyResult(null), [])

  return { verifyResult, verifying, runVerify, reset }
}

// ─── Badge ────────────────────────────────────────────────────
export default function SlipVerifyBadge({ result, verifying, style = {} }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [expanded,   setExpanded]   = useState(false)

  useEffect(() => {
    const file = result?._file
    if (!file || !(file instanceof File) || file.type === 'application/pdf') {
      setPreviewUrl(null); return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [result?._file])

  // ── กำลังสแกน ──
  if (verifying) {
    return (
      <div style={{
        marginTop: 8, padding: '8px 12px',
        background: '#eff6ff', border: '1px solid #bae6fd',
        borderRadius: 10, fontSize: 12, color: '#0369a1',
        display: 'flex', alignItems: 'center', gap: 8, ...style
      }}>
        <i className="fas fa-spinner fa-spin"></i> กำลังสแกน QR สลิป...
      </div>
    )
  }

  if (!result) return null

  const file   = result._file
  const isPdf  = file?.type === 'application/pdf'
  const status = result.status
  const flags  = result.riskFlags || []
  const bank   = result.bankInfo

  // สีตาม status
  const cfg = {
    ok:      { bg: '#f0fdf4', border: '#86efac', color: '#166534', icon: 'fa-check-circle',        iconColor: '#16a34a' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: 'fa-exclamation-triangle', iconColor: '#d97706' },
    error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', icon: 'fa-times-circle',        iconColor: '#dc2626' },
    no_qr:   { bg: '#fff8f0', border: '#fed7aa', color: '#7c3513', icon: 'fa-exclamation-circle',  iconColor: '#ea580c' },
    unknown: { bg: '#f8fafc', border: '#cbd5e1', color: '#475569', icon: 'fa-question-circle',     iconColor: '#64748b' },
  }
  const c = cfg[status] || cfg.unknown

  const hasDetail = result.qrData && (
    result.qrData.amount != null ||
    result.qrData.recipient ||
    result.qrData.ref
  ) && (result.qrType === 'promptpay' || result.qrType === 'bank_proprietary')

  const statusLabel = () => {
    if (status === 'error'  ) return result.isDuplicate ? '🚫 สลิปซ้ำ!' : 'ตรวจไม่ผ่าน ✗'
    if (status === 'ok'     ) return bank ? `${bank.abbr} ✓` : 'ตรวจผ่าน ✓'
    if (status === 'warning') return 'ตรวจพบความผิดปกติ ⚠️'
    if (status === 'no_qr'  ) return 'ไม่พบ QR ⚠️'
    return 'ไม่ทราบสถานะ'
  }

  return (
    <>
      <div style={{
        marginTop: 8, borderRadius: 10,
        border: `1px solid ${c.border}`,
        background: c.bg, fontSize: 12,
        overflow: 'hidden', ...style
      }}>

        {/* ── แถบแจ้งเตือนสลิปปลอม ── */}
        {flags.length > 0 && (
          <div style={{
            background: flags.includes('duplicate_ref') ? '#dc2626' : '#d97706',
            color: '#fff', fontSize: 11, fontWeight: 700,
            padding: '4px 10px', display: 'flex', gap: 10, flexWrap: 'wrap',
          }}>
            {flags.includes('duplicate_ref') && (
              <span><i className="fas fa-ban" style={{ marginRight: 4 }}></i>
                Ref ซ้ำในระบบ — สงสัยสลิปปลอม
              </span>
            )}
            {flags.includes('amount_mismatch') && (
              <span><i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>
                ยอดใน QR ไม่ตรงกับที่กรอก
              </span>
            )}
            {flags.includes('no_qr') && (
              <span><i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>
                ไม่มี QR Code — ความเสี่ยงสลิปปลอมสูง
              </span>
            )}
            {flags.includes('incomplete_qr') && (
              <span><i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>
                QR ข้อมูลไม่ครบ — อาจถูกดัดแปลง
              </span>
            )}
            {flags.includes('unknown_qr_format') && (
              <span><i className="fas fa-question-circle" style={{ marginRight: 4 }}></i>
                QR รูปแบบไม่รู้จัก
              </span>
            )}
          </div>
        )}

        {/* ── Main row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>

          {/* Thumbnail */}
          {file && (
            <div style={{
              width: 52, height: 52, flexShrink: 0, borderRadius: 7,
              overflow: 'hidden', border: `1.5px solid ${c.border}`,
              background: '#fafafa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: previewUrl ? 'pointer' : 'default',
            }} onClick={() => previewUrl && setModalOpen(true)}>
              {isPdf ? (
                <i className="fas fa-file-pdf" style={{ fontSize: 24, color: '#dc2626' }}></i>
              ) : previewUrl ? (
                <img src={previewUrl} alt="slip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <i className="fas fa-image" style={{ fontSize: 24, color: '#94a3b8' }}></i>
              )}
            </div>
          )}

          {/* Status + bank + message */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* แถว 1: status label + bank badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
              <i className={`fas ${c.icon}`} style={{ color: c.iconColor, fontSize: 13 }}></i>
              <span style={{ fontWeight: 700, color: c.color, fontSize: 12 }}>{statusLabel()}</span>
              {bank && (
                <span style={{
                  background: bank.color, color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  padding: '1px 8px', borderRadius: 10, whiteSpace: 'nowrap',
                }}>
                  {bank.abbr}
                </span>
              )}
              {bank && (
                <span style={{ fontSize: 10, color: c.color, opacity: 0.75 }}>{bank.name}</span>
              )}
            </div>
            {/* แถว 2: message */}
            <div style={{ color: c.color, opacity: 0.85, fontSize: 11, lineHeight: 1.4 }}>
              {result.message}
            </div>
            {/* แถว 3: duplicate info */}
            {result.duplicateInfo && (
              <div style={{ fontSize: 10, color: '#dc2626', marginTop: 2, fontWeight: 600 }}>
                <i className="fas fa-clock" style={{ marginRight: 3 }}></i>
                ใช้ครั้งแรก: {result.duplicateInfo.usedAt
                  ? new Date(result.duplicateInfo.usedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
                  : '—'}
                {result.duplicateInfo.caseId && ` | เคส #${result.duplicateInfo.caseId}`}
              </div>
            )}
          </div>

          {/* ปุ่ม */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {previewUrl && (
              <button type="button" onClick={() => setModalOpen(true)} style={{
                padding: '4px 8px', background: '#f59e0b', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}>
                <i className="fas fa-search-plus"></i> ดูสลิป
              </button>
            )}
            {isPdf && (
              <button type="button"
                onClick={() => { const u = URL.createObjectURL(file); window.open(u, '_blank') }}
                style={{
                  padding: '4px 8px', background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}>
                <i className="fas fa-file-pdf"></i> PDF
              </button>
            )}
            {hasDetail && (
              <button type="button" onClick={() => setExpanded(v => !v)} style={{
                padding: '4px 8px', background: 'transparent', color: c.color,
                border: `1px solid ${c.border}`, borderRadius: 6, fontSize: 10,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3
              }}>
                <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
                {expanded ? 'ซ่อน' : 'รายละเอียด QR'}
              </button>
            )}
            {result.qrData?.url && (
              <a href={result.qrData.url} target="_blank" rel="noreferrer" style={{
                padding: '4px 8px', color: '#fff',
                background: bank?.color || '#2563eb',
                border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                <i className="fas fa-external-link-alt"></i> ยืนยันกับ{bank?.abbr || 'ธนาคาร'}
              </a>
            )}
          </div>
        </div>

        {/* ── Detail panel (ธนาคาร proprietary) ── */}
        {expanded && result.qrData && result.qrType === 'bank_proprietary' && (
          <div style={{
            padding: '8px 10px', borderTop: `1px solid ${c.border}`,
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px',
            color: c.color, fontSize: 11,
          }}>
            {result.qrData.ref && (<>
              <span style={{ opacity: 0.65, whiteSpace: 'nowrap' }}>Ref ธุรกรรม</span>
              <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 700 }}>
                {result.qrData.ref}
              </span>
            </>)}
            {result.qrData.amount != null && (<>
              <span style={{ opacity: 0.65 }}>ยอดในสลิป</span>
              <span style={{ fontWeight: 700 }}>
                {result.qrData.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </span>
            </>)}
            <span style={{ opacity: 0.65 }}>หมายเหตุ</span>
            <span style={{ opacity: 0.8, fontStyle: 'italic' }}>
              QR ธนาคาร — ยืนยันยอดโอนจริงจาก{bank?.name || 'ระบบธนาคาร'}
            </span>
          </div>
        )}

        {/* ── Detail panel (PromptPay) ── */}
        {expanded && result.qrData && result.qrType === 'promptpay' && (
          <div style={{
            padding: '8px 10px', borderTop: `1px solid ${c.border}`,
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px',
            color: c.color, fontSize: 11,
          }}>
            {result.qrData.amount != null && (<>
              <span style={{ opacity: 0.65, whiteSpace: 'nowrap' }}>ยอดใน QR</span>
              <span style={{ fontWeight: 700 }}>
                {result.qrData.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                {result.amountMatch === true  && <span style={{ color: '#16a34a', marginLeft: 5 }}>✓ ตรงกัน</span>}
                {result.amountMatch === false && <span style={{ color: '#dc2626', marginLeft: 5 }}>✗ ไม่ตรง</span>}
              </span>
            </>)}
            {result.qrData.recipient && (<>
              <span style={{ opacity: 0.65 }}>ปลายทาง</span>
              <span style={{ fontFamily: 'monospace' }}>
                {result.qrData.recipient}
                {result.qrData.recipientType === 'phone'       && ' 📱 (เบอร์โทร)'}
                {result.qrData.recipientType === 'national_id' && ' 🪪 (บัตรประชาชน)'}
                {result.qrData.recipientType === 'tax_id'      && ' 🏢 (เลขนิติบุคคล)'}
              </span>
            </>)}
            {result.qrData.ref && (<>
              <span style={{ opacity: 0.65 }}>Reference</span>
              <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{result.qrData.ref}</span>
            </>)}
            {result.qrData.currency && (<>
              <span style={{ opacity: 0.65 }}>สกุลเงิน</span>
              <span>{result.qrData.currency === '764' ? 'THB 🇹🇭' : result.qrData.currency}</span>
            </>)}
          </div>
        )}
      </div>

      {/* ── Modal ดูรูปเต็ม ── */}
      {modalOpen && previewUrl && (
        <div onClick={() => setModalOpen(false)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.82)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
        }}>
          <button onClick={e => { e.stopPropagation(); setModalOpen(false) }} style={{
            position: 'fixed', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)', border: 'none', fontSize: 22, color: '#333',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 100000
          }}>
            <i className="fas fa-times"></i>
          </button>
          <img src={previewUrl} alt="สลิป" onClick={e => e.stopPropagation()} style={{
            maxWidth: '90vw', maxHeight: '90vh',
            borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.6)', cursor: 'default'
          }} />
        </div>
      )}
    </>
  )
}

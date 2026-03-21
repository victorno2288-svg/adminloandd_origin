import { useState, useRef } from 'react'

// ==================== OCR SEARCH MODAL ====================
// Shared component — ใช้ได้ทุกหน้าฝ่าย
// Props:
//   show        boolean
//   onClose     fn()
//   navigate    react-router navigate fn
//   deptRoutes  optional override — { debtor, agent, case } path prefixes
//               default: { debtor: '/sales/edit', agent: '/sales/agent/edit', case: '/sales/case/edit' }
// =========================================================

const DEFAULT_ROUTES = {
  debtor: '/sales/edit',
  agent:  '/sales/agent/edit',
  case:   '/sales/case/edit',
}

export default function OcrSearchModal({ show, onClose, navigate, deptRoutes }) {
  const routes = { ...DEFAULT_ROUTES, ...(deptRoutes || {}) }
  const [file, setFile] = useState(null)
  const [docType, setDocType] = useState('land_deed')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const reset = () => { setFile(null); setResult(null); setError(''); setScanning(false) }

  const handleScan = async () => {
    if (!file) return
    setScanning(true); setResult(null); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('doc_type', docType)
      const r = await fetch('/api/admin/ocr/search', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('loandd_admin')}` },
        body: fd
      })
      const d = await r.json()
      if (d.success) setResult(d)
      else setError(d.message || 'เกิดข้อผิดพลาด')
    } catch (e) { setError(e.message) }
    setScanning(false)
  }

  if (!show) return null

  const total = result?.results?.total || 0

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1565c0' }}>
            <i className="fas fa-camera" style={{ marginRight: 8 }}></i>
            OCR ค้นหาจากเอกสาร
          </h3>
          <button onClick={() => { reset(); onClose() }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 14px' }}>
          อัพโหลดรูปโฉนด, บัตรประชาชน หรือเอกสารอื่น — ระบบจะ OCR แล้วค้นหาลูกหนี้ / เคส / นายหน้าให้อัตโนมัติ
        </p>

        {/* ประเภทเอกสาร */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { value: 'land_deed', label: '📜 โฉนดที่ดิน', color: '#e65100' },
            { value: 'id_card',   label: '🪪 บัตรประชาชน', color: '#1565c0' },
            { value: 'general',  label: '📄 เอกสารทั่วไป', color: '#555' },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setDocType(opt.value)}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: docType === opt.value ? 700 : 500,
                border: `2px solid ${docType === opt.value ? opt.color : '#e0e0e0'}`,
                background: docType === opt.value ? opt.color + '15' : '#fafafa',
                color: docType === opt.value ? opt.color : '#666', cursor: 'pointer'
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? '#27ae60' : '#c7d2fe'}`,
            borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer',
            background: file ? '#f0fdf4' : '#f8faff', marginBottom: 14
          }}>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
            onChange={e => { setFile(e.target.files[0] || null); setResult(null); setError('') }} />
          {file ? (
            <div>
              <i className="fas fa-file-image" style={{ fontSize: 24, color: '#27ae60', marginBottom: 6 }}></i>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>{file.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          ) : (
            <div>
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: 28, color: '#a5b4fc', marginBottom: 8 }}></i>
              <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>คลิกเพื่อเลือกไฟล์</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>รองรับ JPG, PNG, PDF (สูงสุด 15MB)</div>
            </div>
          )}
        </div>

        {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 10, padding: '8px 12px', background: '#fee2e2', borderRadius: 6 }}>{error}</div>}

        <button
          onClick={handleScan} disabled={!file || scanning}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
            background: (!file || scanning) ? '#e5e7eb' : '#1565c0',
            color: (!file || scanning) ? '#9ca3af' : '#fff',
            fontSize: 14, fontWeight: 700, cursor: (!file || scanning) ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
          {scanning
            ? <><i className="fas fa-spinner fa-spin"></i> กำลัง OCR + ค้นหา...</>
            : <><i className="fas fa-search"></i> สแกนและค้นหา</>}
        </button>

        {/* ผลลัพธ์ */}
        {result && (
          <div style={{ marginTop: 16 }}>
            {/* Keywords */}
            {result.keywords?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>🔍 ข้อมูลที่อ่านได้จากเอกสาร:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.keywords.map((k, i) => (
                    <span key={i} style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
                      {k.type}: {k.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, color: total > 0 ? '#15803d' : '#9ca3af', marginBottom: 8 }}>
              {total > 0 ? `✅ พบ ${total} รายการ` : '❌ ไม่พบข้อมูลที่ตรงกัน'}
            </div>

            {/* ลูกหนี้ */}
            {result.results.debtors?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>👤 ลูกหนี้</div>
                {result.results.debtors.map((d, i) => (
                  <div key={i} onClick={() => { navigate(`${routes.debtor}/${d.id}`); reset(); onClose() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fffbeb', borderRadius: 8, marginBottom: 4, cursor: 'pointer', border: '1px solid #fde68a' }}>
                    <span style={{ background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>{d.debtor_code}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.contact_name || '-'}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{d.province} | {d.deed_number ? `โฉนด: ${d.deed_number}` : d.contact_phone}</div>
                    </div>
                    {d.case_code && <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4 }}>{d.case_code}</span>}
                    <i className="fas fa-chevron-right" style={{ color: '#ccc', fontSize: 10 }}></i>
                  </div>
                ))}
              </div>
            )}

            {/* นายหน้า */}
            {result.results.agents?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 6 }}>🤝 นายหน้า</div>
                {result.results.agents.map((a, i) => (
                  <div key={i} onClick={() => { navigate(`${routes.agent}/${a.id}`); reset(); onClose() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#faf5ff', borderRadius: 8, marginBottom: 4, cursor: 'pointer', border: '1px solid #e9d5ff' }}>
                    <span style={{ background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>{a.agent_code}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.full_name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{a.phone || '-'}</div>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#ccc', fontSize: 10 }}></i>
                  </div>
                ))}
              </div>
            )}

            {/* เคส */}
            {result.results.cases?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6 }}>📁 เคส</div>
                {result.results.cases.map((c, i) => (
                  <div key={i} onClick={() => { navigate(`${routes.case}/${c.id}`); reset(); onClose() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f0fdf4', borderRadius: 8, marginBottom: 4, cursor: 'pointer', border: '1px solid #bbf7d0' }}>
                    <span style={{ background: '#059669', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>{c.case_code}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.contact_name || '-'}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{c.province}</div>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: '#ccc', fontSize: 10 }}></i>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * DocGeneratorPanel — Web-based document upload form
 * Shows auto-fill info from case data and provides upload slots for each document type
 * Props: caseData, caseId
 * Uses forwardRef + useImperativeHandle to expose file handling to parent
 */

import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import DocEditorModal from './DocEditorModal'

// Document definitions with database field mappings
const ALL_DOCS = {
  selling_pledge: [
    { key: 'doc_sp_contract', label: 'สัญญาขายฝาก', icon: 'fa-file-contract', color: '#059669', dbField: 'doc_selling_pledge' },
    { key: 'doc_sp_broker', label: 'สัญญาแต่งตั้งนายหน้า (ขายฝาก)', icon: 'fa-handshake', color: '#0891b2', dbField: 'doc_sp_broker' },
    { key: 'doc_sp_appendix', label: 'เอกสารแนบท้ายสัญญาแต่งตั้ง (ขายฝาก)', icon: 'fa-paperclip', color: '#7c3aed', dbField: 'doc_sp_appendix' },
    { key: 'doc_sp_notice', label: 'หนังสือแจ้งเตือน', icon: 'fa-bell', color: '#dc2626', dbField: 'doc_sp_notice' },
  ],
  mortgage: [
    { key: 'doc_mg_loan', label: 'สัญญากู้ยืมเงิน (จำนอง)', icon: 'fa-file-invoice-dollar', color: '#b45309', dbField: 'doc_mortgage' },
    { key: 'doc_mg_addendum', label: 'สัญญาต่อท้ายสัญญาจำนอง', icon: 'fa-file-medical', color: '#be185d', dbField: 'doc_mg_addendum' },
    { key: 'doc_mg_appendix', label: 'เอกสารแนบท้ายสัญญาแต่งตั้ง (จำนอง)', icon: 'fa-paperclip', color: '#7c3aed', dbField: 'doc_mg_appendix' },
    { key: 'doc_mg_broker', label: 'สัญญาแต่งตั้งนายหน้า (จำนอง)', icon: 'fa-handshake', color: '#0891b2', dbField: 'doc_mg_broker' },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper function to map caseData fields to document display values
// ─────────────────────────────────────────────────────────────────────────────
const getExistingFileUrl = (caseData, docKey) => {
  // Map doc keys to caseData fields
  const fieldMap = {
    doc_sp_contract: caseData?.issuing_doc_selling_pledge,
    doc_mg_loan: caseData?.issuing_doc_mortgage,
    doc_sp_broker: caseData?.issuing_doc_sp_broker,
    doc_sp_appendix: caseData?.issuing_doc_sp_appendix,
    doc_sp_notice: caseData?.issuing_doc_sp_notice,
    doc_mg_addendum: caseData?.issuing_doc_mg_addendum,
    doc_mg_appendix: caseData?.issuing_doc_mg_appendix,
    doc_mg_broker: caseData?.issuing_doc_mg_broker,
  }
  return fieldMap[docKey]
}

const getFileExtension = (url) => {
  if (!url) return null
  const ext = url.split('.').pop().toLowerCase()
  return ext
}

const getFileName = (url) => {
  if (!url) return null
  return url.split('/').pop()
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const DocGeneratorPanel = forwardRef(({ caseData, caseId }, ref) => {
  const [expanded, setExpanded] = useState(true)
  const [deletedFiles, setDeletedFiles] = useState({})
  const [editorType, setEditorType] = useState(null) // ★ เปิด DocEditorModal

  // File refs for each document type
  const fileRefs = {
    doc_sp_contract: useRef(null),
    doc_sp_broker: useRef(null),
    doc_sp_appendix: useRef(null),
    doc_sp_notice: useRef(null),
    doc_mg_loan: useRef(null),
    doc_mg_addendum: useRef(null),
    doc_mg_appendix: useRef(null),
    doc_mg_broker: useRef(null),
  }

  // File name display states (from new uploads)
  const [uploadedFileNames, setUploadedFileNames] = useState({})
  // ★ เก็บ File object จริงๆ ไว้ใน state (แก้ bug: input unmount ทำให้ fileRef.current = null)
  const [uploadedFileObjects, setUploadedFileObjects] = useState({})

  // ★ useImperativeHandle ต้องอยู่ก่อน early return เสมอ (Rules of Hooks)
  useImperativeHandle(ref, () => ({
    getFiles: () => {
      const keyToDbField = {}
      ;[...ALL_DOCS.selling_pledge, ...ALL_DOCS.mortgage].forEach(d => {
        keyToDbField[d.key] = d.dbField
      })
      const files = {}
      Object.entries(uploadedFileObjects).forEach(([key, file]) => {
        if (file) {
          const dbField = keyToDbField[key] || key
          files[dbField] = file
        }
      })
      return files
    },
    getDeletedFiles: () => {
      return Object.keys(deletedFiles).filter(k => deletedFiles[k])
    },
    resetFiles: () => {
      Object.entries(fileRefs).forEach(([key, fileRef]) => {
        if (fileRef.current) fileRef.current.value = ''
      })
      setUploadedFileNames({})
      setUploadedFileObjects({})
      setDeletedFiles({})
    }
  }), [uploadedFileObjects, deletedFiles])

  if (!caseData) return null

  // Determine which doc types to show based on loan_type_detail (ตรงกับ CaseEditPage)
  const loanTypeDetail = caseData.loan_type_detail?.toLowerCase() || ''
  const showSelling = !loanTypeDetail || loanTypeDetail.includes('selling') || loanTypeDetail.includes('ขายฝาก')
  const showMortgage = !loanTypeDetail || loanTypeDetail.includes('mortgage') || loanTypeDetail.includes('จำนอง')

  const handleFileChange = (docKey, event) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFileNames(prev => ({ ...prev, [docKey]: file.name }))
      // ★ เก็บ File object ด้วย เพราะ input จะถูก unmount หลังเลือกไฟล์
      setUploadedFileObjects(prev => ({ ...prev, [docKey]: file }))
    }
  }

  const handleDeleteFile = (docKey) => {
    setDeletedFiles(prev => ({ ...prev, [docKey]: true }))
    setUploadedFileNames(prev => {
      const newNames = { ...prev }
      delete newNames[docKey]
      return newNames
    })
    setUploadedFileObjects(prev => {
      const newObjs = { ...prev }
      delete newObjs[docKey]
      return newObjs
    })
    if (fileRefs[docKey]?.current) {
      fileRefs[docKey].current.value = ''
    }
  }

  const handleUndoDelete = (docKey) => {
    setDeletedFiles(prev => ({ ...prev, [docKey]: false }))
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render Document Card
  // ─────────────────────────────────────────────────────────────────────────────
  const renderDocumentCard = (docDef) => {
    const existingUrl = getExistingFileUrl(caseData, docDef.key)
    const isDeleted = deletedFiles[docDef.key]
    const newFileName = uploadedFileNames[docDef.key]
    const hasFile = existingUrl && !isDeleted
    const hasNewFile = newFileName

    const displayUrl = hasNewFile ? null : existingUrl
    const displayName = hasNewFile ? newFileName : (displayUrl ? getFileName(displayUrl) : null)
    const fileExt = displayUrl ? getFileExtension(displayUrl) : null

    return (
      <div
        key={docDef.key}
        style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: 16, marginBottom: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
          paddingBottom: 12, borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{
            background: docDef.color, color: '#fff', borderRadius: 8,
            width: 40, height: 40, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 18, flexShrink: 0
          }}>
            <i className={`fas ${docDef.icon}`} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>
              {docDef.label}
            </div>
          </div>
          <div style={{
            background: displayUrl || newFileName ? '#dcfce7' : '#f3f4f6',
            color: displayUrl || newFileName ? '#166534' : '#6b7280',
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600
          }}>
            {displayUrl || newFileName ? '✓ อัพโหลดแล้ว' : 'รอเอกสาร'}
          </div>
        </div>

        {/* File Display / Upload Area */}
        <div>
          {displayUrl && !isDeleted ? (
            // Existing file display
            <div style={{
              background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: 12, display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 12
            }}>
              <div style={{
                background: '#f0f9ff', color: '#0369a1', borderRadius: 6,
                width: 40, height: 40, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 16, flexShrink: 0
              }}>
                <i className={`fas ${fileExt === 'pdf' ? 'fa-file-pdf' : 'fa-file'}`} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>
                  {displayName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (displayUrl) {
                    // เพิ่ม / นำหน้าถ้ายังไม่มี เพื่อให้ browser resolve ถูก path
                    const url = displayUrl.startsWith('/') ? displayUrl : `/${displayUrl}`
                    window.open(url, '_blank')
                  }
                }}
                style={{
                  background: 'transparent', color: '#0369a1', border: '1px solid #bfdbfe',
                  borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f0f9ff'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                }}
              >
                <i className="fas fa-eye" style={{ marginRight: 4 }} />
                ดู
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFile(docDef.key)}
                style={{
                  background: 'transparent', color: '#dc2626', border: '1px solid #fecaca',
                  borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#fef2f2'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                }}
              >
                <i className="fas fa-trash" style={{ marginRight: 4 }} />
                ลบออก
              </button>
            </div>
          ) : isDeleted && displayUrl ? (
            // Deleted file display with undo
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
              padding: 12, display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 12
            }}>
              <div style={{
                background: '#fee2e2', color: '#991b1b', borderRadius: 6,
                width: 40, height: 40, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 16, flexShrink: 0
              }}>
                <i className="fas fa-ban" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 500 }}>
                  {displayName} (ถูกลบออก)
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleUndoDelete(docDef.key)}
                style={{
                  background: 'transparent', color: '#ea580c', border: '1px solid #fed7aa',
                  borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#fffbeb'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                }}
              >
                <i className="fas fa-undo" style={{ marginRight: 4 }} />
                ยกเลิกลบ
              </button>
            </div>
          ) : null}

          {(!displayUrl || isDeleted) && !newFileName && (
            // Upload area for new files
            <label style={{
              display: 'block', border: '2px dashed #d1d5db', borderRadius: 8,
              padding: 24, textAlign: 'center', cursor: 'pointer',
              background: '#fafbfc', transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = docDef.color
              e.currentTarget.style.background = docDef.color + '05'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.background = '#fafbfc'
            }}
            >
              <input
                ref={fileRefs[docDef.key]}
                type="file"
                onChange={(e) => handleFileChange(docDef.key, e)}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: 32, color: docDef.color, marginBottom: 8 }}>
                <i className="fas fa-cloud-upload-alt" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937', marginBottom: 4 }}>
                อัพโหลดเอกสาร
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                คลิกเพื่อเลือกไฟล์ หรือลากวางลงมา
              </div>
            </label>
          )}

          {newFileName && (
            // New file display
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8,
              padding: 12, display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 12
            }}>
              <div style={{
                background: '#dbeafe', color: '#0369a1', borderRadius: 6,
                width: 40, height: 40, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 16, flexShrink: 0
              }}>
                <i className="fas fa-file" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>
                  {newFileName}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                  (ไฟล์ใหม่ - ยังไม่บันทึก)
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadedFileNames(prev => {
                    const newNames = { ...prev }
                    delete newNames[docDef.key]
                    return newNames
                  })
                  setUploadedFileObjects(prev => {
                    const newObjs = { ...prev }
                    delete newObjs[docDef.key]
                    return newObjs
                  })
                  if (fileRefs[docDef.key]?.current) {
                    fileRefs[docDef.key].current.value = ''
                  }
                }}
                style={{
                  background: 'transparent', color: '#dc2626', border: '1px solid #fecaca',
                  borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#fef2f2'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                }}
              >
                <i className="fas fa-times" style={{ marginRight: 4 }} />
                ลบออก
              </button>
            </div>
          )}
        </div>

        {/* ★ ปุ่มสร้างเอกสารอัตโนมัติ */}
        <button
          type="button"
          onClick={() => setEditorType(docDef.key.replace('doc_', ''))}
          style={{
            width: '100%', padding: '10px 16px', marginTop: 8,
            background: `linear-gradient(135deg, ${docDef.color}, ${docDef.color}dd)`,
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 2px 8px ${docDef.color}40`,
            transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-magic"></i>
          สร้างเอกสารอัตโนมัติ
        </button>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* DocEditorModal */}
      {editorType && (
        <DocEditorModal
          show={!!editorType}
          onClose={() => setEditorType(null)}
          templateType={editorType}
          caseData={caseData}
          caseId={caseId}
          onSaved={(filePath) => {
            // หลัง save สำเร็จ — reload หน้า
            window.location.reload()
          }}
        />
      )}

      {/* ── Card header ── */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 12,
          padding: 20, marginBottom: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
          color: '#fff', borderRadius: 8, padding: '8px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0
        }}>
          <i className="fas fa-file-alt" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>
            เอกสารสัญญา
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            อัพโหลดเอกสารสัญญาที่จำเป็นสำหรับคดีนี้
          </div>
        </div>
        <div style={{
          fontSize: 20, color: '#9ca3af', transition: 'transform 0.3s ease',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          <i className="fas fa-chevron-down" />
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── ขายฝาก documents section ── */}
          {(showSelling || (!showSelling && !showMortgage)) && (
            <div>
              <div style={{
                fontWeight: 700, fontSize: 14, color: '#059669', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <i className="fas fa-tag" />
                ขายฝาก (Selling Pledge)
              </div>
              <div>
                {ALL_DOCS.selling_pledge.map(docDef => renderDocumentCard(docDef))}
              </div>
            </div>
          )}

          {/* ── จำนอง documents section ── */}
          {(showMortgage || (!showSelling && !showMortgage)) && (
            <div>
              <div style={{
                fontWeight: 700, fontSize: 14, color: '#b45309', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <i className="fas fa-home" />
                จำนอง (Mortgage)
              </div>
              <div>
                {ALL_DOCS.mortgage.map(docDef => renderDocumentCard(docDef))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
})

DocGeneratorPanel.displayName = 'DocGeneratorPanel'

// ─────────────────────────────────────────────────────────────────────────────
// Info Pill Component
// ─────────────────────────────────────────────────────────────────────────────
function InfoPill({ label, value }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #c6f6d5', borderRadius: 8,
      padding: '8px 12px'
    }}>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>
        {value}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Info Section Component
// ─────────────────────────────────────────────────────────────────────────────
function InfoSection({ label, value }) {
  const fileName = value ? value.split('/').pop() : null
  const fileExt = value ? value.split('.').pop().toLowerCase() : null

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: 12
    }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 8 }}>
        {label}
      </div>
      {value ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <div style={{
            background: '#f0f9ff', color: '#0369a1', borderRadius: 6,
            width: 32, height: 32, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, flexShrink: 0
          }}>
            <i className={`fas ${fileExt === 'pdf' ? 'fa-file-pdf' : 'fa-file'}`} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 500 }}>
              {fileName}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const url = value.startsWith('/') ? value : `/${value}`
              window.open(url, '_blank')
            }}
            style={{
              background: 'transparent', color: '#0369a1', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              padding: 0
            }}
          >
            <i className="fas fa-external-link-alt" />
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
          ยังไม่มีข้อมูล
        </div>
      )}
    </div>
  )
}

export default DocGeneratorPanel

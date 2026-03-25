import React, { useState, useEffect } from 'react'

/**
 * PropertyVideoPanel — แสดงและจัดการวีดีโอทรัพย์สิน
 *
 * Props:
 *   lrId      — loan_request_id (ถ้าไม่มีจะซ่อน panel)
 *   token     — JWT token string
 *   canUpload — true = ฝ่ายประเมิน/ขาย (อัพโหลด+ลบได้), false = ฝ่ายอื่น (ดูอย่างเดียว)
 */
export default function PropertyVideoPanel({ lrId, token, canUpload = false }) {
  const [videos, setVideos] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!lrId) return
    fetch(`/api/admin/debtors/${lrId}/checklist-docs`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.docs?.property_video) setVideos(d.docs.property_video)
        else setVideos([])
      })
      .catch(() => {})
  }, [lrId])

  const handleUpload = async (files) => {
    if (!files?.length || !lrId) return
    setUploading(true)
    const fd = new FormData()
    for (const f of files) fd.append('property_video', f)
    try {
      const res = await fetch(`/api/admin/debtors/${lrId}/checklist-docs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })
      const data = await res.json()
      // backend returns { success, field, paths }
      if (data.success && data.paths) setVideos(data.paths)
    } catch { /* silent */ }
    setUploading(false)
  }

  const handleRemove = async (fp) => {
    try {
      const res = await fetch(`/api/admin/debtors/${lrId}/checklist-docs/remove`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'property_video', file_path: fp })
      })
      const data = await res.json()
      if (data.success && data.paths !== undefined) setVideos(data.paths)
      else setVideos(prev => prev.filter(p => p !== fp))
    } catch { /* silent */ }
  }

  if (!lrId) return null

  return (
    <div style={{
      marginTop: 16, padding: '12px 16px',
      background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fas fa-video" style={{ color: '#6d28d9' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9' }}>VDO ทรัพย์สิน</span>
          {!canUpload && (
            <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
              (อัพโหลดโดยฝ่ายประเมิน / ขาย)
            </span>
          )}
        </div>

        {canUpload && (
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: uploading ? '#d1d5db' : '#7c3aed',
            color: '#fff', borderRadius: 7, padding: '5px 14px',
            fontSize: 12, fontWeight: 600,
            cursor: uploading ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s'
          }}>
            {uploading
              ? <><i className="fas fa-spinner fa-spin" /> กำลังอัพ...</>
              : <><i className="fas fa-upload" /> อัพโหลดวีดีโอ</>}
            <input
              type="file" accept="video/*" multiple
              style={{ display: 'none' }}
              disabled={uploading}
              onChange={e => {
                if (e.target.files?.length) {
                  handleUpload(Array.from(e.target.files))
                  e.target.value = ''
                }
              }}
            />
          </label>
        )}
      </div>

      {/* Thumbnails */}
      {videos.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {videos.map((fp, i) => (
            <div key={i} style={{ position: 'relative', display: 'inline-flex' }}>
              <div
                onClick={() => window.open(fp.startsWith('/') ? fp : `/${fp}`, '_blank')}
                style={{
                  width: 64, height: 64, borderRadius: 8,
                  background: '#ede9fe', border: '2px solid #c4b5fd',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', gap: 2
                }}>
                <i className="fas fa-play-circle" style={{ fontSize: 22, color: '#7c3aed' }} />
                <span style={{ fontSize: 9, fontWeight: 600, color: '#7c3aed' }}>VDO {i + 1}</span>
              </div>
              {canUpload && (
                <button
                  type="button"
                  onClick={() => handleRemove(fp)}
                  style={{
                    position: 'absolute', top: -5, right: -5,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#ef4444', border: 'none', color: '#fff',
                    fontSize: 11, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                  }}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
          {canUpload ? 'ยังไม่มีวีดีโอ — กดอัพโหลดเพื่อเพิ่ม' : 'ยังไม่มีวีดีโอ'}
        </p>
      )}
    </div>
  )
}

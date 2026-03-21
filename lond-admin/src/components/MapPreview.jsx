// ============================================================
// MapPreview — แสดง map preview จาก Google Maps URL
// ใช้ OpenStreetMap (ฟรี ไม่ต้อง API key)
// รองรับ URL ทุกรูปแบบของ Google Maps
// ============================================================
import { useState, useEffect } from 'react'

// สกัด lat/lng จาก Google Maps URL หลายรูปแบบ
function extractLatLng(url) {
  if (!url) return null
  try {
    // รูปแบบ 1: @lat,lng,zoom  เช่น @13.7563,100.5018,15z
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }

    // รูปแบบ 2: ?q=lat,lng หรือ &q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }

    // รูปแบบ 3: /place/.../lat,lng
    const placeMatch = url.match(/\/(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) }

    // รูปแบบ 4: ll=lat,lng
    const llMatch = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }
  } catch { }
  return null
}

export default function MapPreview({ url, label = 'โลเคชั่นทรัพย์', compact = false }) {
  const [show, setShow] = useState(false)
  const coords = extractLatLng(url)
  const isShortUrl = url && (url.includes('goo.gl') || url.includes('maps.app'))

  if (!url) return null

  const zoom = 16
  const osmEmbedUrl = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005},${coords.lat - 0.004},${coords.lng + 0.005},${coords.lat + 0.004}&layer=mapnik&marker=${coords.lat},${coords.lng}`
    : null

  return (
    <div style={{ marginTop: 8 }}>
      {/* ปุ่มหลัก: เปิด Google Maps + toggle preview */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: '#1a73e8', color: '#fff',
            borderRadius: 8, fontSize: 12, fontWeight: 600,
            textDecoration: 'none', flexShrink: 0
          }}
        >
          <i className="fab fa-google"></i> เปิด Google Maps
        </a>

        {osmEmbedUrl && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', background: show ? '#e8f5e9' : '#f1f8e9',
              color: '#2e7d32', border: '1.5px solid #a5d6a7',
              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0
            }}
          >
            <i className={`fas fa-${show ? 'eye-slash' : 'map'}`}></i>
            {show ? 'ซ่อนแผนที่' : 'ดูแผนที่'}
          </button>
        )}

        {isShortUrl && !coords && (
          <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>
            (URL สั้น — กดเปิด Google Maps เพื่อดูแผนที่)
          </span>
        )}
      </div>

      {/* Map embed */}
      {show && osmEmbedUrl && (
        <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #c8e6c9', position: 'relative' }}>
          {/* Header bar */}
          <div style={{ background: '#e8f5e9', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#2e7d32', fontWeight: 600 }}>
              <i className="fas fa-map-marker-alt" style={{ marginRight: 4 }}></i>
              {label}
              {coords && (
                <span style={{ color: '#66bb6a', marginLeft: 8, fontWeight: 400 }}>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              )}
            </span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=${zoom}/${coords.lat}/${coords.lng}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: 10, color: '#388e3c', textDecoration: 'none' }}
            >
              เปิดใน OpenStreetMap ↗
            </a>
          </div>
          <iframe
            src={osmEmbedUrl}
            title="map"
            style={{ width: '100%', height: compact ? 180 : 240, border: 'none', display: 'block' }}
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}

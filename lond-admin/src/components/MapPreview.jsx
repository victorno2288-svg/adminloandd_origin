// ============================================================
// MapPreview — แสดง map preview จาก Google Maps URL
// รองรับ: OpenStreetMap embed + Google Maps + LandsMaps (พิกัดตรง)
// ============================================================
import { useState } from 'react'

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
  const zoom = 16

  if (!url) return null

  // OSM embed URL
  const osmEmbedUrl = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005},${coords.lat - 0.004},${coords.lng + 0.005},${coords.lat + 0.004}&layer=mapnik&marker=${coords.lat},${coords.lng}`
    : null

  // LandsMaps deep link — format #zoom/lat/lng (Leaflet standard)
  const landsMapsUrl = coords
    ? `https://landsmaps.dol.go.th/#${zoom}/${coords.lat}/${coords.lng}`
    : 'https://landsmaps.dol.go.th/#'

  return (
    <div style={{ marginTop: 8 }}>

      {/* ปุ่ม 3 อัน: Google Maps / LandsMaps / ดูแผนที่ inline */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>

        {/* Google Maps */}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', background: '#1a73e8', color: '#fff',
            borderRadius: 8, fontSize: 12, fontWeight: 600,
            textDecoration: 'none', flexShrink: 0,
            boxShadow: '0 1px 3px rgba(26,115,232,0.25)'
          }}
        >
          <i className="fab fa-google" style={{ fontSize: 11 }}></i>
          Google Maps
        </a>

        {/* LandsMaps — เปิดตรงพิกัด */}
        <a
          href={landsMapsUrl}
          target="_blank"
          rel="noreferrer"
          title={coords
            ? `เปิด LandsMaps ที่พิกัด ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
            : 'เปิด LandsMaps (ไม่พบพิกัด — จะเปิดหน้าแรก)'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 12px',
            background: coords
              ? 'linear-gradient(135deg,#0369a1,#0284c7)'
              : 'linear-gradient(135deg,#64748b,#94a3b8)',
            color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600,
            textDecoration: 'none', flexShrink: 0,
            boxShadow: '0 1px 3px rgba(3,105,161,0.25)'
          }}
        >
          <i className="fas fa-map" style={{ fontSize: 11 }}></i>
          LandsMaps
          {coords && (
            <span style={{
              fontSize: 9, opacity: 0.9,
              background: 'rgba(255,255,255,0.25)',
              borderRadius: 4, padding: '1px 4px', marginLeft: 2
            }}>
              ตรงพิกัด
            </span>
          )}
        </a>

        {/* ดูแผนที่ inline */}
        {osmEmbedUrl && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px',
              background: show ? '#dcfce7' : '#f0fdf4',
              color: '#15803d',
              border: `1.5px solid ${show ? '#86efac' : '#bbf7d0'}`,
              borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0
            }}
          >
            <i className={`fas fa-${show ? 'eye-slash' : 'map-marked-alt'}`} style={{ fontSize: 11 }}></i>
            {show ? 'ซ่อนแผนที่' : 'ดูแผนที่'}
          </button>
        )}

        {/* พิกัด (แสดงถ้าแกะจาก URL ได้) */}
        {coords && (
          <span style={{
            fontSize: 10, color: '#64748b', background: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: 6,
            padding: '3px 7px', fontFamily: 'monospace'
          }}>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </span>
        )}

        {isShortUrl && !coords && (
          <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>
            (URL สั้น — กดเปิด Google Maps เพื่อดูพิกัด)
          </span>
        )}
      </div>

      {/* OSM Map embed inline */}
      {show && osmEmbedUrl && (
        <div style={{
          marginTop: 8, borderRadius: 10, overflow: 'hidden',
          border: '1.5px solid #86efac',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            padding: '6px 12px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #bbf7d0'
          }}>
            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fas fa-map-marker-alt" style={{ color: '#dc2626' }}></i>
              {label}
              {coords && (
                <span style={{ color: '#64748b', fontWeight: 400, fontSize: 10, marginLeft: 4 }}>
                  ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={url} target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: '#1a73e8', textDecoration: 'none', fontWeight: 600 }}>
                <i className="fab fa-google"></i> Google Maps ↗
              </a>
              <span style={{ color: '#d1d5db', fontSize: 10 }}>|</span>
              <a href={landsMapsUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: '#0369a1', textDecoration: 'none', fontWeight: 600 }}>
                <i className="fas fa-map"></i> LandsMaps ↗
              </a>
              <span style={{ color: '#d1d5db', fontSize: 10 }}>|</span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=${zoom}/${coords.lat}/${coords.lng}`}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: '#64748b', textDecoration: 'none' }}>
                OSM ↗
              </a>
            </div>
          </div>

          {/* Map iframe */}
          <iframe
            src={osmEmbedUrl}
            title={label}
            style={{ width: '100%', height: compact ? 180 : 260, border: 'none', display: 'block' }}
            loading="lazy"
          />

          {/* Footer */}
          <div style={{
            background: '#f8fafc', padding: '4px 10px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              แผนที่: © OpenStreetMap contributors
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              LandsMaps: กรมที่ดิน
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

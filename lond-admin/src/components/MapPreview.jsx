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

// mapType: 'k' = satellite, 'h' = hybrid (ดาวเทียม+ชื่อถนน), 'm' = ถนน
function buildGoogleEmbedUrl(coords, mapType = 'h', zoom = 17) {
  if (!coords) return null
  return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&t=${mapType}&z=${zoom}&output=embed`
}

// ศูนย์กลางพิกัดจังหวัดไทย (ครบ 77 จังหวัด) — ใช้เตือนเมื่อ URL ผิดจังหวัด
const PROVINCE_CENTERS = {
  'กรุงเทพมหานคร':[13.753,100.501],'กระบี่':[8.093,98.906],'กาญจนบุรี':[14.004,99.548],
  'กาฬสินธุ์':[16.431,103.506],'กำแพงเพชร':[16.483,99.523],'ขอนแก่น':[16.441,102.836],
  'จันทบุรี':[12.611,102.104],'ฉะเชิงเทรา':[13.691,101.077],'ชลบุรี':[13.361,100.985],
  'ชัยนาท':[15.187,100.130],'ชัยภูมิ':[15.807,101.922],'ชุมพร':[10.494,99.180],
  'เชียงราย':[19.908,99.833],'เชียงใหม่':[18.787,98.993],'ตรัง':[7.556,99.611],
  'ตราด':[12.243,102.517],'ตาก':[16.883,99.126],'นครนายก':[14.206,101.213],
  'นครปฐม':[13.820,100.064],'นครพนม':[17.392,104.769],'นครราชสีมา':[14.973,102.101],
  'นครศรีธรรมราช':[8.432,99.963],'นครสวรรค์':[15.705,100.137],'นนทบุรี':[13.859,100.521],
  'นราธิวาส':[6.426,101.823],'น่าน':[18.770,100.777],'บึงกาฬ':[18.361,103.652],
  'บุรีรัมย์':[14.993,103.102],'ปทุมธานี':[14.020,100.525],'ประจวบคีรีขันธ์':[11.813,99.797],
  'ปราจีนบุรี':[14.053,101.370],'ปัตตานี':[6.869,101.250],'พระนครศรีอยุธยา':[14.353,100.587],
  'พะเยา':[19.163,99.900],'พระแท่งดงรัง':null,'พัทลุง':[7.617,100.074],
  'พิจิตร':[16.441,100.349],'พิษณุโลก':[16.826,100.265],'เพชรบุรี':[13.115,99.939],
  'เพชรบูรณ์':[16.419,101.159],'แพร่':[18.144,100.141],'ภูเก็ต':[7.880,98.398],
  'มหาสารคาม':[16.185,103.300],'มุกดาหาร':[16.543,104.724],'แม่ฮ่องสอน':[19.301,97.966],
  'ยโสธร':[15.792,104.145],'ยะลา':[6.547,101.281],'ร้อยเอ็ด':[16.054,103.652],
  'ระนอง':[9.960,98.635],'ระยอง':[12.681,101.282],'ราชบุรี':[13.537,99.816],
  'ลพบุรี':[14.799,100.654],'ลำปาง':[18.289,99.490],'ลำพูน':[18.574,99.009],
  'เลย':[17.486,101.726],'ศรีสะเกษ':[15.117,104.322],'สกลนคร':[17.155,104.148],
  'สงขลา':[7.189,100.595],'สตูล':[6.625,100.067],'สมุทรปราการ':[13.599,100.597],
  'สมุทรสงคราม':[13.411,100.002],'สมุทรสาคร':[13.548,100.274],'สระแก้ว':[13.824,102.064],
  'สระบุรี':[14.530,100.910],'สิงห์บุรี':[14.889,100.398],'สุโขทัย':[17.009,99.826],
  'สุพรรณบุรี':[14.472,100.118],'สุราษฎร์ธานี':[9.140,99.333],'สุรินทร์':[14.882,103.494],
  'หนองคาย':[17.878,102.742],'หนองบัวลำภู':[17.204,102.441],'อ่างทอง':[14.590,100.455],
  'อำนาจเจริญ':[15.865,104.627],'อุดรธานี':[17.415,102.787],'อุตรดิตถ์':[17.620,100.099],
  'อุทัยธานี':[15.380,100.024],'อุบลราชธานี':[15.228,104.857],
}

// คำนวณระยะห่างคร่าวๆ (km) ระหว่าง 2 พิกัด
function approxDistKm(lat1, lng1, lat2, lng2) {
  const dlat = (lat1 - lat2) * 111
  const dlng = (lng1 - lng2) * 111 * Math.cos((lat1 * Math.PI) / 180)
  return Math.sqrt(dlat * dlat + dlng * dlng)
}

// ตรวจว่าพิกัดตรงกับจังหวัดไหม (threshold = 90 km)
function checkProvinceMismatch(coords, province) {
  if (!coords || !province) return false
  const center = PROVINCE_CENTERS[province]
  if (!center) return false
  return approxDistKm(coords.lat, coords.lng, center[0], center[1]) > 90
}

export default function MapPreview({ url, label = 'โลเคชั่นทรัพย์', compact = false, province = null, onRefreshRequest = null }) {
  const [show, setShow] = useState(false)
  const [mapType, setMapType] = useState('h') // h = hybrid default
  const coords = extractLatLng(url)
  const isShortUrl = url && (url.includes('goo.gl') || url.includes('maps.app'))
  const zoom = 16
  const mismatch = checkProvinceMismatch(coords, province)

  if (!url) return null

  // Google Maps embed — satellite/hybrid/street
  const embedUrl = coords ? buildGoogleEmbedUrl(coords, mapType, 17) : null

  // LandsMaps deep link — format #zoom/lat/lng (Leaflet standard)
  const landsMapsUrl = coords
    ? `https://landsmaps.dol.go.th/#${zoom}/${coords.lat}/${coords.lng}`
    : 'https://landsmaps.dol.go.th/#'

  const MAP_TYPES = [
    { key: 'h', label: 'ดาวเทียม+ถนน', icon: 'fa-satellite' },
    { key: 'k', label: 'ดาวเทียม', icon: 'fa-satellite-dish' },
    { key: 'm', label: 'แผนที่', icon: 'fa-map' },
  ]

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
        {embedUrl && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px',
              background: show ? '#fef9c3' : '#fefce8',
              color: '#a16207',
              border: `1.5px solid ${show ? '#fde047' : '#fef08a'}`,
              borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0
            }}
          >
            <i className={`fas fa-${show ? 'eye-slash' : 'satellite'}`} style={{ fontSize: 11 }}></i>
            {show ? 'ซ่อนแผนที่' : 'ดูดาวเทียม'}
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

      {/* ⚠️ Province mismatch warning */}
      {mismatch && (
        <div style={{
          marginTop: 8, padding: '8px 12px',
          background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b' }} />
            พิกัดในลิงก์ไม่ตรงกับจังหวัด <strong>{province}</strong> — อาจเป็นข้อมูลเก่าหรือผิด
          </span>
          {onRefreshRequest && (
            <button type="button" onClick={onRefreshRequest}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none',
                background: '#f59e0b', color: '#fff', fontSize: 11,
                fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 4
              }}>
              <i className="fas fa-sync-alt" /> ค้นหาพิกัดใหม่
            </button>
          )}
        </div>
      )}

      {/* Satellite Map embed inline */}
      {show && embedUrl && (
        <div style={{
          marginTop: 8, borderRadius: 10, overflow: 'hidden',
          border: '1.5px solid #fde047',
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#1c1917,#292524)',
            padding: '6px 12px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
            borderBottom: '1px solid #44403c'
          }}>
            <span style={{ fontSize: 12, color: '#fef9c3', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fas fa-map-marker-alt" style={{ color: '#f87171' }}></i>
              {label}
              {coords && (
                <span style={{ color: '#a8a29e', fontWeight: 400, fontSize: 10, marginLeft: 4 }}>
                  ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
                </span>
              )}
            </span>

            {/* Layer toggle */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {MAP_TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => setMapType(t.key)}
                  style={{
                    padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: mapType === t.key ? '#fde047' : 'rgba(255,255,255,0.12)',
                    color: mapType === t.key ? '#1c1917' : '#d6d3d1',
                    transition: 'background 0.15s'
                  }}>
                  <i className={`fas ${t.icon}`} style={{ marginRight: 3 }} />{t.label}
                </button>
              ))}
              <span style={{ color: '#57534e', fontSize: 10, marginLeft: 4 }}>|</span>
              <a href={url} target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: '#93c5fd', textDecoration: 'none', fontWeight: 600 }}>
                <i className="fab fa-google" /> Maps ↗
              </a>
              <span style={{ color: '#57534e', fontSize: 10 }}>|</span>
              <a href={landsMapsUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: '#6ee7b7', textDecoration: 'none', fontWeight: 600 }}>
                <i className="fas fa-map" /> LandsMaps ↗
              </a>
            </div>
          </div>

          {/* Map iframe */}
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={label}
            style={{ width: '100%', height: compact ? 200 : 280, border: 'none', display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

          {/* Footer */}
          <div style={{
            background: '#1c1917', padding: '4px 10px',
            borderTop: '1px solid #44403c',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: 10, color: '#78716c' }}>
              © Google Maps
            </span>
            <span style={{ fontSize: 10, color: '#78716c' }}>
              LandsMaps: กรมที่ดิน
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

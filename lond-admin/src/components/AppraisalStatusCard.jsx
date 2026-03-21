/**
 * AppraisalStatusCard — แสดงผลประเมินแบบ read-only (UI เดียวกันทุกหน้า)
 * Props: caseData (object)
 */

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TYPE_MAP = {
  outside:     { color: '#e67e22', bg: '#fff8f3', border: '#fcd9a5', icon: 'fa-map-marker-alt', label: 'ประเมินนอก' },
  inside:      { color: '#3498db', bg: '#f0f8ff', border: '#93c5fd', icon: 'fa-home',           label: 'ประเมินใน'  },
  check_price: { color: '#9b59b6', bg: '#fdf4ff', border: '#d8b4fe', icon: 'fa-tags',           label: 'เช็คราคา'   },
}
const RESULT_MAP = {
  passed:     { color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: 'fa-check-circle',  label: 'ผ่านมาตรฐาน'    },
  not_passed: { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: 'fa-times-circle',  label: 'ไม่ผ่านมาตรฐาน' },
}

export default function AppraisalStatusCard({ caseData }) {
  if (!caseData) return null

  const t = TYPE_MAP[caseData.appraisal_type]
  const r = RESULT_MAP[caseData.appraisal_result]

  return (
    <div className="card" style={{ padding: 24, marginBottom: 20, borderTop: '3px solid #e67e22' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e67e22' }}>
        <i className="fas fa-clipboard-check" style={{ marginRight: 8 }}></i>ผลการประเมิน
      </h3>

      {/* Row 1: ประเภท + ผลประเมิน badges */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>

        {/* ประเภทประเมิน */}
        {t ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>ประเภทประเมิน</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 20, background: t.bg, border: `2px solid ${t.border}`, fontWeight: 700, fontSize: 13, color: t.color }}>
              <i className={`fas ${t.icon}`} style={{ fontSize: 12 }}></i>
              {t.label}
            </div>
          </div>
        ) : null}

        {/* ผลประเมิน */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>ผลประเมิน</span>
          {r ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 20, background: r.bg, border: `2px solid ${r.border}`, fontWeight: 700, fontSize: 13, color: r.color }}>
              <i className={`fas ${r.icon}`} style={{ fontSize: 12 }}></i>
              {r.label}
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 20, background: '#f9fafb', border: '2px solid #d1d5db', fontWeight: 600, fontSize: 13, color: '#6b7280' }}>
              <i className="fas fa-hourglass-half" style={{ fontSize: 12 }}></i>
              ยังไม่ประเมิน
            </div>
          )}
        </div>
      </div>

      {/* Row 2: วันที่นัด + ค่าประเมิน */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>วันที่นัดประเมิน</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{formatDate(caseData.appraisal_date)}</div>
        </div>
        {caseData.appraisal_fee && (
          <div>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>ค่าประเมิน</span>
            <div style={{ display: 'inline-block', fontSize: 14, fontWeight: 700, color: '#d97706', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 8, padding: '4px 12px' }}>
              ฿{Number(caseData.appraisal_fee).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Row 3: บริษัทประเมิน + ชื่อผู้ประเมิน */}
      {(caseData.appraisal_company || caseData.appraiser_name) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {caseData.appraisal_company && (
            <div>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>บริษัทประเมิน</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{caseData.appraisal_company}</div>
            </div>
          )}
          {caseData.appraiser_name && (
            <div>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>ชื่อผู้ประเมิน</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{caseData.appraiser_name}</div>
            </div>
          )}
        </div>
      )}

      {/* Row 4: ผลจากฝ่ายประเมิน (outside / inside / check_price detail) */}
      {(caseData.outside_result || caseData.inside_result || caseData.check_price_value) && (
        <div style={{ borderTop: '1.5px solid #f3f4f6', paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            ผลจากฝ่ายประเมิน
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { key: 'outside', label: 'นอก', result: caseData.outside_result, at: caseData.outside_recorded_at, reason: caseData.outside_reason, color: '#e67e22', icon: 'fa-map-marker-alt' },
              { key: 'inside',  label: 'ใน',  result: caseData.inside_result,  at: caseData.inside_recorded_at,  reason: caseData.inside_reason,  color: '#3498db', icon: 'fa-home'          },
            ].filter(row => row.result).map(({ key, label, result, at, reason, color, icon }) => (
              <div key={key} style={{ flex: 1, minWidth: 150, background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${color}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>
                  <i className={`fas ${icon}`} style={{ marginRight: 4 }}></i>ประเมิน{label}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  background: result === 'passed' ? '#dcfce7' : '#fee2e2',
                  color:      result === 'passed' ? '#15803d' : '#b91c1c',
                  border:    `1.5px solid ${result === 'passed' ? '#86efac' : '#fca5a5'}` }}>
                  <i className={`fas ${result === 'passed' ? 'fa-check' : 'fa-times'}`}></i>
                  {result === 'passed' ? 'ผ่าน' : 'ไม่ผ่าน'}
                </div>
                {reason && <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>{reason}</div>}
                {at && <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{new Date(at).toLocaleString('th-TH')}</div>}
              </div>
            ))}

            {caseData.check_price_value && (
              <div style={{ flex: 1, minWidth: 150, background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid #9b59b6' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9b59b6', marginBottom: 8 }}>
                  <i className="fas fa-tags" style={{ marginRight: 4 }}></i>เช็คราคา
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#6d28d9' }}>
                  ฿{Number(caseData.check_price_value).toLocaleString()}
                </div>
                {caseData.check_price_detail && <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>{caseData.check_price_detail}</div>}
                {caseData.check_price_recorded_at && <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{new Date(caseData.check_price_recorded_at).toLocaleString('th-TH')}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

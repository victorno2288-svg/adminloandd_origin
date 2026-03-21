import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/investors'

function formatMoney(n) {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('th-TH') + ' บาท'
}
function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

const caseStatusLabel = {
  pending: 'รอดำเนินการ',
  reviewing: 'กำลังตรวจสอบ',
  appraising: 'กำลังประเมิน',
  approved: 'อนุมัติแล้ว',
  pending_auction: 'รอประมูล',
  auction_in_progress: 'กำลังประมูล',
  auction_completed: 'จบประมูลแล้ว',
  pending_legal: 'รอนิติกรรม',
  legal_in_progress: 'ดำเนินนิติกรรม',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
  rejected: 'ปฏิเสธ',
}
const caseStatusColor = {
  completed: '#27ae60', cancelled: '#e74c3c', rejected: '#e74c3c',
  approved: '#2980b9', auction_completed: '#8e44ad', pending_legal: '#e67e22',
  legal_in_progress: '#e67e22',
}

// =========== Helpers ===========
// บางฟิลด์เก็บเป็น JSON array ["uploads/..."], บางฟิลด์เป็น string "uploads/..."
function parseDocField(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
    if (typeof parsed === 'string') return [parsed]
  } catch {}
  if (typeof raw === 'string') return [raw]
  return []
}
function toFileUrl(path) {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('/')) return path
  return `/${path}`
}

// =========== Docs Popup ===========
function DocsPopup({ caseRow, onClose }) {
  if (!caseRow) return null

  // แปลงฟิลด์ JSON array → flat list ของ { label, url }
  const buildDocs = (label, raw) =>
    parseDocField(raw).map((p, i) => ({
      label: parseDocField(raw).length > 1 ? `${label} (${i + 1})` : label,
      url: toFileUrl(p)
    }))

  const sections = [
    {
      label: 'เอกสารประมูล / โอนเงิน',
      color: '#8e44ad',
      icon: 'fas fa-gavel',
      docs: [
        ...buildDocs('เล่มทะเบียนบ้าน (นิติกรรม)', caseRow.house_reg_book_legal),
        ...buildDocs('หนังสือยินยอมคู่สมรส', caseRow.spouse_consent_doc),
        ...buildDocs('ใบเปลี่ยนชื่อนามสกุลคู่สมรส', caseRow.spouse_name_change_doc),
        ...buildDocs('สลิปโอนเงิน', caseRow.transfer_slip),
      ]
    },
    {
      label: 'เอกสารสัญญา (ฝ่ายออกสัญญา)',
      color: '#2980b9',
      icon: 'fas fa-file-contract',
      docs: [
        ...buildDocs('สัญญาขายฝาก', caseRow.issuing_doc_selling_pledge),
        ...buildDocs('สัญญาจำนอง', caseRow.issuing_doc_mortgage),
      ]
    },
    {
      label: 'เอกสารนิติกรรม',
      color: '#27ae60',
      icon: 'fas fa-balance-scale',
      docs: [
        ...buildDocs('เอกสารขายฝาก (นิติกรรม)', caseRow.legal_doc_selling_pledge),
        ...buildDocs('เอกสารต่อสัญญา', caseRow.legal_doc_extension),
        ...buildDocs('เอกสารไถ่ถอน', caseRow.legal_doc_redemption),
        ...buildDocs('เอกสารแนบ (นิติกรรม)', caseRow.legal_attachment),
      ]
    },
  ]

  // นับเอกสารทั้งหมดที่มี
  const totalDocs = sections.reduce((sum, s) => sum + s.docs.length, 0)

  const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
  const isPdf = (url) => /\.pdf$/i.test(url)

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)', zIndex: 9998,
        backdropFilter: 'blur(2px)'
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999, background: '#fff', borderRadius: 14,
        width: '100%', maxWidth: 680,
        maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 12px 48px rgba(0,0,0,0.28)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          color: '#fff', padding: '18px 24px',
          borderRadius: '14px 14px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
              เอกสารประกอบเคส
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              <i className="fas fa-folder-open" style={{ marginRight: 8, color: '#f1c40f' }}></i>
              {caseRow.case_code || 'ไม่มีรหัสเคส'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
              {caseRow.debtor_name && <span><i className="fas fa-user" style={{ marginRight: 5 }}></i>{caseRow.debtor_name}</span>}
              {caseRow.province && <span style={{ marginLeft: 12 }}><i className="fas fa-map-marker-alt" style={{ marginRight: 5 }}></i>{[caseRow.district, caseRow.province].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
              width: 32, height: 32, borderRadius: '50%', fontSize: 15,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <i className="fas fa-times"></i>
            </button>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
              {totalDocs > 0
                ? <span style={{ color: '#2ecc71', fontWeight: 600 }}>{totalDocs} ไฟล์</span>
                : <span style={{ color: '#e74c3c' }}>ยังไม่มีเอกสาร</span>
              }
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {totalDocs === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#bbb' }}>
              <i className="fas fa-folder-open" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontSize: 14 }}>ยังไม่มีเอกสารในเคสนี้</div>
            </div>
          ) : (
            sections.map((sec, si) => {
              const availDocs = sec.docs.filter(d => d.url)
              if (availDocs.length === 0) return null
              return (
                <div key={si} style={{ marginBottom: 24 }}>
                  {/* Section header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 12, paddingBottom: 8,
                    borderBottom: `2px solid ${sec.color}22`
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: sec.color + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <i className={sec.icon} style={{ color: sec.color, fontSize: 13 }}></i>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: sec.color }}>{sec.label}</div>
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                      background: sec.color + '18', color: sec.color,
                      borderRadius: 20, padding: '1px 9px'
                    }}>{availDocs.length} ไฟล์</span>
                  </div>

                  {/* Doc cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    {availDocs.map((doc, di) => {
                      const img = isImage(doc.url)
                      const pdf = isPdf(doc.url)
                      return (
                        <a key={di} href={doc.url} target="_blank" rel="noopener noreferrer"
                          style={{ textDecoration: 'none' }}>
                          <div style={{
                            border: `1px solid ${sec.color}33`,
                            borderRadius: 10, overflow: 'hidden',
                            transition: 'box-shadow 0.15s, transform 0.15s',
                            cursor: 'pointer',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${sec.color}33`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
                          >
                            {/* Preview area */}
                            <div style={{
                              height: 100, background: sec.color + '0d',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              position: 'relative', overflow: 'hidden'
                            }}>
                              {img ? (
                                <img src={doc.url} alt={doc.label}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : pdf ? (
                                <i className="fas fa-file-pdf" style={{ fontSize: 36, color: '#e53935' }}></i>
                              ) : (
                                <i className="fas fa-file-alt" style={{ fontSize: 36, color: sec.color }}></i>
                              )}
                              {/* Open icon overlay */}
                              <div style={{
                                position: 'absolute', top: 6, right: 6,
                                background: 'rgba(0,0,0,0.45)', borderRadius: 6,
                                padding: '2px 6px', fontSize: 10, color: '#fff'
                              }}>
                                <i className="fas fa-external-link-alt"></i>
                              </div>
                            </div>
                            {/* Label */}
                            <div style={{ padding: '8px 10px', background: '#fff' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#333', lineHeight: 1.3 }}>
                                {doc.label}
                              </div>
                              <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
                                {pdf ? 'PDF' : img ? 'รูปภาพ' : 'ไฟล์'}
                                {' · '}
                                <span style={{ color: sec.color }}>เปิดดู</span>
                              </div>
                            </div>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px', borderTop: '1px solid #eee',
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <button onClick={onClose} style={{
            padding: '8px 22px', borderRadius: 8, border: '1px solid #ddd',
            background: '#f5f5f5', fontSize: 13, cursor: 'pointer', color: '#555'
          }}>
            ปิด
          </button>
        </div>
      </div>
    </>
  )
}

// =========== Main Page ===========
export default function InvestorPortfolioPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('cases')
  const [docsCase, setDocsCase] = useState(null) // เคสที่เปิด popup

  useEffect(() => {
    fetch(`${API}/${id}/portfolio`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 28 }}></i>
      <p>กำลังโหลดข้อมูล...</p>
    </div>
  )
  if (!data) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#e74c3c' }}>
      <i className="fas fa-exclamation-circle" style={{ fontSize: 28 }}></i>
      <p>ไม่พบข้อมูลนายทุน</p>
    </div>
  )

  const { investor, cases, bids, summary } = data

  const summaryCards = [
    { label: 'เคสทั้งหมด', value: summary.totalCases, icon: 'fas fa-folder', color: '#3498db' },
    { label: 'กำลังดำเนินการ', value: summary.activeCount, icon: 'fas fa-clock', color: '#e67e22' },
    { label: 'เสร็จสิ้นแล้ว', value: summary.completedCount, icon: 'fas fa-check-circle', color: '#27ae60' },
    { label: 'ยอดลงทุนรวม', value: formatMoney(summary.totalInvested), icon: 'fas fa-coins', color: '#8e44ad', wide: true },
  ]

  const tabs = [
    { key: 'cases', label: 'เคสที่ลงทุน', icon: 'fas fa-building', count: cases.length },
    { key: 'bids', label: 'ประวัติมัดจำ', icon: 'fas fa-gavel', count: bids.length },
  ]

  // นับเอกสารทั้งหมดของแต่ละเคส (รองรับทั้ง JSON array และ string เดี่ยว)
  const countDocs = (c) => [
    c.house_reg_book_legal, c.spouse_consent_doc, c.spouse_name_change_doc,
    c.transfer_slip, c.issuing_doc_selling_pledge, c.issuing_doc_mortgage,
    c.legal_doc_selling_pledge, c.legal_doc_extension, c.legal_doc_redemption,
    c.legal_attachment
  ].reduce((sum, raw) => sum + parseDocField(raw).length, 0)

  return (
    <div>
      {/* Docs Popup */}
      {docsCase && <DocsPopup caseRow={docsCase} onClose={() => setDocsCase(null)} />}

      {/* Back */}
      <button onClick={() => navigate('/investors')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd',
        background: '#fff', fontSize: 13, color: '#555', cursor: 'pointer', marginBottom: 20
      }}>
        <i className="fas fa-arrow-left"></i> กลับรายชื่อนายทุน
      </button>

      {/* Investor Info Card */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #1a7a3f 100%)',
        borderRadius: 14, padding: '24px 28px', color: '#fff', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, flexShrink: 0
          }}>
            <i className="fas fa-user-tie"></i>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{investor.full_name || '-'}</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>
              <i className="fas fa-id-badge" style={{ marginRight: 6 }}></i>{investor.investor_code}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {investor.phone && (
            <div style={{ fontSize: 13 }}>
              <div style={{ opacity: 0.7, marginBottom: 2 }}>เบอร์โทร</div>
              <div style={{ fontWeight: 600 }}>{investor.phone}</div>
            </div>
          )}
          {investor.line_id && (
            <div style={{ fontSize: 13 }}>
              <div style={{ opacity: 0.7, marginBottom: 2 }}>Line</div>
              <div style={{ fontWeight: 600 }}>{investor.line_id}</div>
            </div>
          )}
          {investor.email && (
            <div style={{ fontSize: 13 }}>
              <div style={{ opacity: 0.7, marginBottom: 2 }}>Email</div>
              <div style={{ fontWeight: 600 }}>{investor.email}</div>
            </div>
          )}
          {investor.bank_name && (
            <div style={{ fontSize: 13 }}>
              <div style={{ opacity: 0.7, marginBottom: 2 }}>บัญชีธนาคาร</div>
              <div style={{ fontWeight: 600 }}>{investor.bank_name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{investor.bank_account_no} · {investor.bank_account_name}</div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {summaryCards.map((c, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 12, padding: '16px 20px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 14
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <i className={c.icon} style={{ color: c.color, fontSize: 18 }}></i>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{c.label}</div>
              <div style={{ fontSize: c.wide ? 15 : 22, fontWeight: 700, color: '#333' }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #eee', paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '9px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: activeTab === tab.key ? 700 : 400,
            color: activeTab === tab.key ? 'var(--primary)' : '#777',
            borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -2, display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s'
          }}>
            <i className={tab.icon}></i> {tab.label}
            <span style={{
              background: activeTab === tab.key ? 'var(--primary)' : '#eee',
              color: activeTab === tab.key ? '#fff' : '#888',
              borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '1px 8px'
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab: เคสที่ลงทุน */}
      {activeTab === 'cases' && (
        <div className="table-responsive">
          {cases.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-folder-open"></i>
              <p>ยังไม่มีเคสที่ลงทุน</p>
            </div>
          ) : (
            <table className="table-green">
              <thead>
                <tr>
                  <th>#</th>
                  <th>เคส</th>
                  <th>ลูกหนี้</th>
                  <th>ที่ตั้ง</th>
                  <th>ประเภท</th>
                  <th>วงเงิน</th>
                  <th>ดอกเบี้ย</th>
                  <th>สัญญา</th>
                  <th>สถานะ</th>
                  <th>เอกสาร</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c, i) => {
                  const docCount = countDocs(c)
                  return (
                    <tr key={c.auction_id}>
                      <td>{i + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--primary)' }}>{c.case_code || '-'}</strong>
                      </td>
                      <td>{c.debtor_name || '-'}</td>
                      <td style={{ fontSize: 12, color: '#666' }}>
                        {[c.district, c.province].filter(Boolean).join(', ') || '-'}
                      </td>
                      <td style={{ fontSize: 12 }}>{c.property_type || '-'}</td>
                      <td style={{ fontWeight: 600, color: '#2980b9' }}>
                        {c.selling_pledge_amount ? Number(c.selling_pledge_amount).toLocaleString('th-TH') : '-'}
                      </td>
                      <td style={{ color: '#e67e22', fontWeight: 600 }}>
                        {c.interest_rate ? c.interest_rate + '%' : '-'}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {c.contract_years ? c.contract_years + ' ปี' : '-'}
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: (caseStatusColor[c.case_status] || '#888') + '18',
                          color: caseStatusColor[c.case_status] || '#888'
                        }}>
                          {caseStatusLabel[c.case_status] || c.case_status || '-'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => setDocsCase(c)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                            fontWeight: 600, border: 'none',
                            background: docCount > 0 ? '#2c3e5018' : '#f0f0f0',
                            color: docCount > 0 ? '#2c3e50' : '#bbb',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { if (docCount > 0) e.currentTarget.style.background = '#2c3e5030' }}
                          onMouseLeave={e => { if (docCount > 0) e.currentTarget.style.background = '#2c3e5018' }}
                        >
                          <i className="fas fa-folder-open"></i>
                          เอกสาร
                          {docCount > 0 && (
                            <span style={{
                              background: '#2c3e50', color: '#fff',
                              borderRadius: 20, fontSize: 10, padding: '0px 6px',
                              fontWeight: 700, minWidth: 18, textAlign: 'center'
                            }}>
                              {docCount}
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: ประวัติมัดจำ */}
      {activeTab === 'bids' && (
        <div className="table-responsive">
          {bids.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-gavel"></i>
              <p>ยังไม่มีประวัติมัดจำ</p>
            </div>
          ) : (
            <table className="table-green">
              <thead>
                <tr>
                  <th>#</th>
                  <th>เคส</th>
                  <th>ที่ตั้ง</th>
                  <th>วันประมูล</th>
                  <th>ราคาที่ชนะ</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((b, i) => (
                  <tr key={b.id}>
                    <td>{i + 1}</td>
                    <td><strong style={{ color: 'var(--primary)' }}>{b.case_code || '-'}</strong></td>
                    <td style={{ fontSize: 12, color: '#666' }}>
                      {[b.district, b.province].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td>{formatDate(b.auction_date)}</td>
                    <td style={{ fontWeight: 600, color: '#27ae60' }}>
                      {b.winning_price ? Number(b.winning_price).toLocaleString('th-TH') + ' บาท' : '-'}
                    </td>
                    <td style={{ fontSize: 12, color: '#666' }}>{b.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

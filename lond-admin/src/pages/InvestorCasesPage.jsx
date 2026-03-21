import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import '../styles/sales.css'

const token = () => localStorage.getItem('loandd_admin')
const API = '/api/admin/accounting'

const STATUS_LABEL = {
  new: 'เคสใหม่', contacting: 'กำลังติดต่อ', incomplete: 'ข้อมูลไม่ครบ',
  awaiting_appraisal_fee: 'รอชำระค่าประเมิน', appraisal_scheduled: 'นัดประเมินแล้ว',
  appraisal_passed: 'ผ่านประเมิน', appraisal_not_passed: 'ไม่ผ่านประเมิน',
  pending_approve: 'รออนุมัติ', credit_approved: 'อนุมัติวงเงิน',
  pending_auction: 'รอประมูล', auction_completed: 'ประมูลเสร็จ',
  preparing_docs: 'ออกสัญญาแล้ว', legal_scheduled: 'นัดนิติกรรม',
  legal_completed: 'นิติกรรมเสร็จ', completed: 'เสร็จสมบูรณ์',
  pending_cancel: 'รออนุมัติยกเลิก', cancelled: 'ยกเลิก',
}
const STATUS_COLOR = {
  completed: '#16a34a', cancelled: '#dc2626', pending_cancel: '#dc2626',
  credit_approved: '#1976d2', legal_completed: '#7b1fa2',
}

function fmtMoney(n) {
  if (!n && n !== 0) return '-'
  return '฿' + Number(n).toLocaleString('th-TH', { minimumFractionDigits: 0 })
}
function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}
function daysRemaining(endDate) {
  if (!endDate) return null
  const diff = Math.round((new Date(endDate) - new Date()) / 86400000)
  return diff
}
function DaysBadge({ endDate }) {
  const d = daysRemaining(endDate)
  if (d === null) return <span style={{ color: '#cbd5e1' }}>-</span>
  const style =
    d < 0 ? { bg: '#1e1e2e', c: '#f87171', l: `หมดอายุ ${Math.abs(d)} วัน` } :
    d <= 30 ? { bg: '#fef2f2', c: '#dc2626', l: `⚠️ ${d} วัน` } :
    d <= 60 ? { bg: '#fffbeb', c: '#d97706', l: `${d} วัน` } :
    { bg: '#f0fdf4', c: '#16a34a', l: `${d} วัน` }
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: style.bg, color: style.c }}>
      {style.l}
    </span>
  )
}

export default function InvestorCasesPage() {
  const { investorId } = useParams()
  const navigate = useNavigate()
  const [investor, setInvestor] = useState({})
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active') // all | active | expiring | expired

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/investor-portfolio/${investorId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) { setInvestor(d.investor || {}); setCases(d.cases || []) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [investorId])

  const filtered = cases.filter(c => {
    if (filter === 'all') return true
    if (filter === 'active') return !['cancelled', 'completed'].includes(c.case_status)
    if (filter === 'expiring') { const d = daysRemaining(c.contract_end_date); return d !== null && d >= 0 && d <= 60 }
    if (filter === 'expired') { const d = daysRemaining(c.contract_end_date); return d !== null && d < 0 }
    return true
  })

  // Summaries
  const totalInvested = cases.reduce((s, c) => s + (parseFloat(c.investor_amount) || 0), 0)
  const activeCases = cases.filter(c => !['cancelled', 'completed'].includes(c.case_status)).length
  const urgentCases = cases.filter(c => { const d = daysRemaining(c.contract_end_date); return d !== null && d >= 0 && d <= 30 }).length
  const expiredCases = cases.filter(c => { const d = daysRemaining(c.contract_end_date); return d !== null && d < 0 }).length

  const today = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-size: 11pt; }
          .page-header { background: none !important; color: #000 !important; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 10pt; }
          thead { background: #f0f9f0 !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)}
            style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#475569', fontWeight: 600 }}>
            <i className="fas fa-arrow-left" style={{ marginRight: 6 }}></i>ย้อนกลับ
          </button>
          <div>
            <h2 style={{ margin: 0 }}><i className="fas fa-chart-pie" style={{ marginRight: 8, color: '#1976d2' }}></i>พอร์ตโฟลิโอนายทุน</h2>
            <p className="page-subtitle">{investor.investor_name || '...'} · {investor.investor_code}</p>
          </div>
        </div>
        <button onClick={() => window.print()}
          style={{ padding: '10px 20px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-print"></i> พิมพ์ / บันทึก PDF
        </button>
      </div>

      {/* Print header */}
      <div className="print-only" style={{ textAlign: 'center', marginBottom: 16, borderBottom: '2px solid #2e7d32', paddingBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1b5e20' }}>รายงานพอร์ตโฟลิโอนายทุน</div>
        <div style={{ fontSize: 14, marginTop: 4 }}>
          {investor.investor_name} ({investor.investor_code}) · โทร. {investor.investor_phone || '-'}
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>พิมพ์วันที่ {today}</div>
      </div>

      {loading
        ? <div className="empty-state"><i className="fas fa-spinner fa-spin" style={{ fontSize: 32 }}></i></div>
        : <>
          {/* Investor card */}
          <div style={{ background: 'linear-gradient(135deg,#1565c0,#1976d2)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: '#fff' }} className="no-print">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-user-circle" style={{ fontSize: 28 }}></i>
                  {investor.investor_name || '-'}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>
                    รหัส: {investor.investor_code || '-'}
                  </span>
                  {investor.investor_phone && (
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>
                      <i className="fas fa-phone" style={{ marginRight: 4 }}></i>{investor.investor_phone}
                    </span>
                  )}
                </div>
              </div>
              {/* Summary stats */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { l: 'เคสทั้งหมด', v: cases.length, icon: 'fa-folder' },
                  { l: 'กำลังดำเนินการ', v: activeCases, icon: 'fa-spinner' },
                  { l: 'เร่งด่วน ≤30 วัน', v: urgentCases, icon: 'fa-exclamation-triangle', alert: urgentCases > 0 },
                  { l: 'หมดอายุแล้ว', v: expiredCases, icon: 'fa-times-circle', alert: expiredCases > 0 },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.alert ? '#fbbf24' : '#fff' }}>
                      {s.v}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Total invested */}
            {totalInvested > 0 && (
              <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(255,255,255,0.15)', borderRadius: 10, display: 'inline-block' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>ยอดเงินรวม</span>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtMoney(totalInvested)}</div>
              </div>
            )}
          </div>

          {/* Print summary table */}
          <div className="print-only" style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <div><strong>เคสทั้งหมด:</strong> {cases.length} เคส</div>
            {totalInvested > 0 && <div><strong>ยอดเงินรวม:</strong> {fmtMoney(totalInvested)}</div>}
            {urgentCases > 0 && <div><strong>⚠️ เร่งด่วน ≤30 วัน:</strong> {urgentCases} เคส</div>}
            {expiredCases > 0 && <div><strong>หมดอายุแล้ว:</strong> {expiredCases} เคส</div>}
          </div>

          {/* Filter pills (no-print) */}
          <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { v: 'all', l: `ทั้งหมด (${cases.length})` },
              { v: 'active', l: `กำลังดำเนินการ (${activeCases})` },
              { v: 'expiring', l: `ใกล้หมด ≤60 วัน (${cases.filter(c => { const d = daysRemaining(c.contract_end_date); return d !== null && d >= 0 && d <= 60 }).length})` },
              { v: 'expired', l: `หมดอายุ (${expiredCases})` },
            ].map(f => (
              <button key={f.v} onClick={() => setFilter(f.v)}
                style={{ padding: '6px 16px', borderRadius: 20, border: `2px solid ${filter === f.v ? '#1976d2' : '#e2e8f0'}`, background: filter === f.v ? '#e3f2fd' : '#fff', color: filter === f.v ? '#1976d2' : '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                {f.l}
              </button>
            ))}
          </div>

          {/* Cases table */}
          {filtered.length === 0
            ? <div className="empty-state no-print">
                <i className="fas fa-inbox" style={{ fontSize: 36, color: '#94a3b8' }}></i>
                <p>ไม่พบเคสในกลุ่มนี้</p>
              </div>
            : <div className="table-responsive">
                <table className="table-green">
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th>รหัสเคส</th>
                      <th>ลูกหนี้</th>
                      <th>ประเภท</th>
                      <th style={{ textAlign: 'right' }}>วงเงินอนุมัติ</th>
                      <th style={{ textAlign: 'right' }}>ยอดเงินนายทุน</th>
                      <th style={{ textAlign: 'center' }}>วันเริ่มสัญญา</th>
                      <th style={{ textAlign: 'center' }}>วันครบกำหนด</th>
                      <th style={{ textAlign: 'center' }}>เหลือ</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={c.case_id} style={{
                        background: daysRemaining(c.contract_end_date) !== null && daysRemaining(c.contract_end_date) < 0 ? '#fef2f2'
                          : daysRemaining(c.contract_end_date) !== null && daysRemaining(c.contract_end_date) <= 30 ? '#fff7ed'
                          : undefined
                      }}>
                        <td>{String(i + 1).padStart(2, '0')}</td>
                        <td><strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{c.case_code || '-'}</strong></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.debtor_name || '-'}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.debtor_code}</div>
                        </td>
                        <td>
                          {c.loan_type_detail === 'selling_pledge'
                            ? <span className="badge badge-approve">ขายฝาก</span>
                            : c.loan_type_detail === 'mortgage'
                            ? <span className="badge badge-auction">จำนอง</span>
                            : <span style={{ color: '#ccc' }}>-</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>
                          {fmtMoney(c.approved_credit)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#1565c0', fontSize: 13 }}>
                          {fmtMoney(c.investor_amount)}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 12 }}>{fmtDate(c.contract_start_date)}</td>
                        <td style={{ textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{fmtDate(c.contract_end_date)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <DaysBadge endDate={c.contract_end_date} />
                        </td>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[c.case_status] || '#475569' }}>
                            {STATUS_LABEL[c.case_status] || c.case_status || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Total row */}
                  {totalInvested > 0 && (
                    <tfoot>
                      <tr style={{ background: '#f0fdf4', fontWeight: 800 }}>
                        <td colSpan="5" style={{ textAlign: 'right', paddingRight: 8, fontSize: 13, color: '#1565c0' }}>รวมยอดเงินนายทุน</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 14, color: '#1565c0' }}>
                          {fmtMoney(cases.reduce((s, c) => s + (parseFloat(c.investor_amount) || 0), 0))}
                        </td>
                        <td colSpan="4"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
          }
        </>
      }
    </div>
  )
}

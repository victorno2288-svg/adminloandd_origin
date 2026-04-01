import React, { useState, useEffect, useCallback } from 'react'
import { getCurrentUser } from '../utils/auth'

// ─── Config ───────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || ''
const token = () => localStorage.getItem('loandd_admin')

const PERIOD_OPTIONS = [
  { value: 'week',  label: 'รายสัปดาห์' },
  { value: 'month', label: 'รายเดือน' },
  { value: 'year',  label: 'รายปี' },
]

const DEPT_LABEL = {
  super_admin: 'ภาพรวมทั้งหมด', manager: 'ภาพรวมทั้งหมด',
  sales: 'ฝ่ายขาย', appraisal: 'ฝ่ายประเมิน',
  approval: 'ฝ่ายอนุมัติ', legal: 'ฝ่ายนิติกรรม',
  issuing: 'ฝ่ายออกสัญญา', accounting: 'ฝ่ายบัญชี', auction: 'ฝ่ายประมูล',
}
const DEPT_ICON = {
  super_admin: 'fas fa-globe', manager: 'fas fa-globe',
  sales: 'fas fa-headset', appraisal: 'fas fa-search-dollar',
  approval: 'fas fa-money-check-alt', legal: 'fas fa-balance-scale',
  issuing: 'fas fa-file-signature', accounting: 'fas fa-calculator',
  auction: 'fas fa-gavel',
}
const DEPT_COLOR = {
  super_admin: '#6366f1', manager: '#6366f1',
  sales: '#3b82f6', appraisal: '#f59e0b',
  approval: '#8b5cf6', legal: '#2196F3',
  issuing: '#3F51B5', accounting: '#22c55e', auction: '#9C27B0',
}

const SOURCE_LABEL = {
  line: 'LINE', facebook: 'Facebook', referral: 'แนะนำต่อ',
  phone_in: 'โทรเข้า', website: 'เว็บไซต์', walk_in: 'Walk-in',
  agent: 'ผ่านนายหน้า', other: 'อื่นๆ',
}
const SOURCE_COLOR = {
  line: '#00C300', facebook: '#1877F2', referral: '#9c27b0',
  phone_in: '#e65100', website: '#0288d1', walk_in: '#2e7d32',
  agent: '#795548', other: '#607d8b',
}
const CASE_STATUS_LABEL = {
  awaiting_appraisal_fee: 'รอค่าประเมิน', appraisal_scheduled: 'นัดประเมิน',
  appraisal_in_progress: 'กำลังประเมิน', appraisal_passed: 'ผ่านเกณฑ์',
  appraisal_not_passed: 'ไม่ผ่าน', credit_approved: 'อนุมัติแล้ว',
  pending_approve: 'รออนุมัติ', preparing_docs: 'เตรียมเอกสาร',
  legal_scheduled: 'นัดนิติ', legal_completed: 'นิติสำเร็จ',
  issuing: 'ออกสัญญา', contract_issuing: 'ออกสัญญา',
  completed: 'สำเร็จ', auction_completed: 'ประมูลสำเร็จ', cancelled: 'ยกเลิก',
}
const CASE_STATUS_COLOR = {
  awaiting_appraisal_fee: '#f59e0b', appraisal_scheduled: '#f59e0b',
  appraisal_in_progress: '#f59e0b', appraisal_passed: '#22c55e',
  appraisal_not_passed: '#ef4444', credit_approved: '#8b5cf6',
  pending_approve: '#f97316', preparing_docs: '#3b82f6',
  legal_scheduled: '#3b82f6', legal_completed: '#06b6d4',
  issuing: '#6366f1', contract_issuing: '#6366f1',
  completed: '#22c55e', auction_completed: '#22c55e', cancelled: '#9ca3af',
}

// ─── Formatters ───────────────────────────────────────────
const fmt  = n => (n != null ? Number(n).toLocaleString('th-TH') : '0')
const fmtB = n => (n != null ? Number(n).toLocaleString('th-TH') + ' ฿' : '0 ฿')
const fmtDate = d => d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

// ─── Shared UI Primitives ─────────────────────────────────
const card = (extra = {}) => ({
  background: '#fff', borderRadius: 14,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)', ...extra,
})

function KPI({ icon, label, value, color = '#3b82f6', sub }) {
  return (
    <div style={{ ...card(), padding: '18px 20px', flex: '1 1 190px', minWidth: 170,
      borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: color + '18', color, fontSize: 20 }}>
        <i className={icon} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

function SecTitle({ icon, children, color = '#3b82f6', badge }) {
  return (
    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b',
      margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 8,
      paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>
      <i className={icon} style={{ color }} />
      {children}
      {badge != null && badge > 0 && (
        <span style={{ marginLeft: 6, background: '#fef2f2', color: '#dc2626',
          padding: '1px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{badge}</span>
      )}
    </h3>
  )
}

function MiniBar({ rows, keyLabel = 'label', keyVal = 'cnt', getColor }) {
  if (!rows || rows.length === 0) return <Empty />
  const max = Math.max(...rows.map(r => r[keyVal] || 0), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rows.map((r, i) => {
        const pct = Math.round(((r[keyVal] || 0) / max) * 100)
        const color = getColor ? getColor(r) : '#3b82f6'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 90, fontSize: 11, color: '#64748b', textAlign: 'right', flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r[keyLabel] || '-'}
            </div>
            <div style={{ flex: 1, height: 16, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 6,
                width: pct + '%', background: color, minWidth: r[keyVal] > 0 ? 12 : 0,
                transition: 'width .4s' }} />
            </div>
            <div style={{ width: 32, fontSize: 12, fontWeight: 700, color: '#334155' }}>{r[keyVal]}</div>
          </div>
        )
      })}
    </div>
  )
}

function PipeCard({ label, count, color, icon }) {
  return (
    <div style={{ ...card(), padding: '14px 16px', textAlign: 'center',
      borderTop: `3px solid ${color}`, flex: '1 1 120px', minWidth: 110 }}>
      <i className={icon} style={{ color, fontSize: 18, marginBottom: 4, display: 'block' }} />
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{fmt(count)}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function Empty() {
  return <div style={{ padding: '20px 0', textAlign: 'center', color: '#cbd5e1', fontSize: 13 }}>ไม่มีข้อมูล</div>
}

// ─── Generic Table ────────────────────────────────────────
function DataTable({ cols, rows, emptyMsg = 'ไม่มีข้อมูล' }) {
  if (!rows || rows.length === 0) return <Empty />
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {cols.map(c => (
              <th key={c.key} style={{ padding: '9px 12px', textAlign: 'left',
                fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0',
                whiteSpace: 'nowrap' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              {cols.map(c => (
                <td key={c.key} style={{ padding: '8px 12px', ...c.style }}>
                  {c.render ? c.render(r) : (r[c.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }) {
  const label = CASE_STATUS_LABEL[status] || status
  const color = CASE_STATUS_COLOR[status] || '#64748b'
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, color: '#fff', background: color }}>
      {label}
    </span>
  )
}

// ─── Contract Expiry Table ────────────────────────────────
function ExpiryTable({ rows }) {
  if (!rows || rows.length === 0)
    return <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>ไม่มีสัญญาใกล้ครบกำหนด ✓</div>
  return (
    <DataTable
      rows={rows}
      cols={[
        { key: 'case_code', label: 'รหัสเคส', style: { fontWeight: 600, color: '#2563eb' } },
        { key: 'debtor_name', label: 'ลูกหนี้' },
        { key: 'sales_name', label: 'เซลล์', style: { color: '#64748b' } },
        { key: 'approved_amount', label: 'วงเงิน', render: r => fmtB(r.approved_amount || r.loan_amount) },
        { key: 'contract_end_date', label: 'สิ้นสุดสัญญา', render: r => fmtDate(r.contract_end_date) },
        {
          key: 'days_remaining', label: 'เหลือ',
          render: r => (
            <span style={{ fontWeight: 700, color: r.days_remaining <= 30 ? '#dc2626' : '#f59e0b' }}>
              {r.days_remaining} วัน {r.days_remaining <= 30 && <i className="fas fa-exclamation-triangle" />}
            </span>
          ),
        },
      ]}
    />
  )
}

// ─── My Cases Table (ทุกฝ่าย) ────────────────────────────
function MyCasesTable({ rows }) {
  return (
    <DataTable
      rows={rows}
      cols={[
        { key: 'case_code', label: 'รหัสเคส', style: { fontWeight: 600, color: '#2563eb' } },
        { key: 'debtor_code', label: 'รหัสลูกหนี้', style: { color: '#64748b' } },
        { key: 'debtor_name', label: 'ชื่อลูกหนี้' },
        { key: 'contact_phone', label: 'เบอร์' },
        { key: 'province', label: 'จังหวัด', style: { color: '#64748b' } },
        { key: 'status', label: 'สถานะ', render: r => <StatusBadge status={r.status} /> },
        { key: 'approved_amount', label: 'วงเงิน', render: r => fmtB(r.approved_amount || r.loan_amount) },
        { key: 'updated_at', label: 'อัปเดต', render: r => fmtDate(r.updated_at) },
      ]}
    />
  )
}

// ═══════════════════════════════════════════════════════════
// DEPARTMENT SECTIONS — แต่ละฝ่ายมี section เฉพาะ
// ═══════════════════════════════════════════════════════════

// ── ฝ่ายขาย ──────────────────────────────────────────────
function SalesSection({ data, period, isAdmin }) {
  const { leads_trend, leads_by_source, per_sales, cases_trend } = data
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 16 }}>
        <div style={{ ...card(), padding: 20 }}>
          <SecTitle icon="fas fa-user-plus" color="#3b82f6">Lead ใหม่ ({periodLabel})</SecTitle>
          <MiniBar rows={leads_trend} getColor={() => '#3b82f6'} />
        </div>
        <div style={{ ...card(), padding: 20 }}>
          <SecTitle icon="fas fa-tags" color="#8b5cf6">แหล่งที่มา Lead</SecTitle>
          <MiniBar
            rows={(leads_by_source || []).map(r => ({ ...r, label: SOURCE_LABEL[r.lead_source] || r.lead_source || 'ไม่ระบุ' }))}
            getColor={r => SOURCE_COLOR[r.lead_source] || '#64748b'}
          />
        </div>
        <div style={{ ...card(), padding: 20 }}>
          <SecTitle icon="fas fa-chart-line" color="#22c55e">เคสใหม่ ({periodLabel})</SecTitle>
          <MiniBar rows={cases_trend} getColor={() => '#22c55e'} />
        </div>
      </div>

      {(per_sales && per_sales.length > 0) && (
        <>
          <SecTitle icon="fas fa-users" color="#3b82f6">ผลงานรายเซลล์ ({periodLabel})</SecTitle>
          <div style={{ ...card(), overflow: 'hidden' }}>
            <DataTable
              rows={per_sales}
              cols={[
                { key: 'sales_name', label: 'เซลล์', style: { fontWeight: 600 } },
                { key: 'total_cases', label: 'เคส', render: r => fmt(r.total_cases) },
                { key: 'closed', label: 'ปิดได้', render: r => <span style={{ color: '#16a34a', fontWeight: 700 }}>{fmt(r.closed)}</span> },
                { key: 'cancelled', label: 'ยกเลิก', render: r => <span style={{ color: '#dc2626' }}>{fmt(r.cancelled)}</span> },
                { key: 'total_approved', label: 'วงเงิน', render: r => fmtB(r.total_approved) },
              ]}
            />
          </div>
        </>
      )}
    </>
  )
}

// ── ฝ่ายประเมิน ───────────────────────────────────────────
function AppraisalSection({ data, period }) {
  const { dept_appraisal_summary: s = {}, dept_appraisal_pending: pending = [], dept_appraisal_by_type: byType = [] } = data
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <KPI icon="fas fa-clipboard-list" label="ทรัพย์ที่ประเมิน" value={fmt(s.total_appraised)} color="#f59e0b" sub={`ช่วง${periodLabel}`} />
        <KPI icon="fas fa-check-circle" label="ผ่านเกณฑ์" value={fmt(s.passed)} color="#22c55e" />
        <KPI icon="fas fa-times-circle" label="ไม่ผ่าน" value={fmt(s.not_passed)} color="#ef4444" />
        <KPI icon="fas fa-clock" label="รอผล" value={fmt(s.pending)} color="#f59e0b" />
        <KPI icon="fas fa-search-dollar" label="มูลค่าประเมินรวม" value={fmtB(s.total_estimated)} color="#f59e0b" />
        <KPI icon="fas fa-receipt" label="ค่าประเมินที่ได้รับ" value={fmtB(s.total_appraisal_fee)} color="#8b5cf6" sub={`ชำระแล้ว ${fmt(s.paid_count)} ราย`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 16, marginBottom: 4 }}>
        <div style={{ ...card(), padding: 20 }}>
          <SecTitle icon="fas fa-home" color="#f59e0b">ประเภทอสังหาริมทรัพย์</SecTitle>
          <MiniBar rows={byType} keyLabel="property_type" keyVal="cnt" getColor={() => '#f59e0b'} />
        </div>
      </div>

      <SecTitle icon="fas fa-hourglass-half" color="#f59e0b" badge={pending.length}>รายการรอประเมิน</SecTitle>
      <div style={{ ...card(), overflow: 'hidden' }}>
        <DataTable
          rows={pending}
          cols={[
            { key: 'case_code', label: 'รหัสเคส', style: { fontWeight: 600, color: '#2563eb' } },
            { key: 'debtor_code', label: 'รหัสลูกหนี้', style: { color: '#64748b' } },
            { key: 'debtor_name', label: 'ลูกหนี้' },
            { key: 'province', label: 'จังหวัด', style: { color: '#64748b' } },
            { key: 'appraisal_type', label: 'ประเภทประเมิน', style: { color: '#64748b' } },
            { key: 'appraisal_date', label: 'วันนัด', render: r => fmtDate(r.appraisal_date) },
            { key: 'estimated_value', label: 'ราคาประเมิน', render: r => fmtB(r.estimated_value) },
            { key: 'sales_name', label: 'เซลล์', style: { color: '#94a3b8', fontSize: 12 } },
          ]}
        />
      </div>
    </>
  )
}

// ── ฝ่ายอนุมัติ ───────────────────────────────────────────
function ApprovalSection({ data, period }) {
  const { dept_approval_summary: s = {}, dept_approval_pending: pending = [], dept_approval_dist: dist = [] } = data
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <KPI icon="fas fa-folder-open" label="รายการทั้งหมด" value={fmt(s.total)} color="#8b5cf6" sub={`ช่วง${periodLabel}`} />
        <KPI icon="fas fa-thumbs-up" label="อนุมัติแล้ว" value={fmt(s.approved)} color="#22c55e" />
        <KPI icon="fas fa-hourglass" label="รออนุมัติ" value={fmt(s.pending)} color="#f59e0b" />
        <KPI icon="fas fa-ban" label="ยกเลิก" value={fmt(s.cancelled)} color="#9ca3af" />
        <KPI icon="fas fa-coins" label="วงเงินรวม" value={fmtB(s.total_credit)} color="#8b5cf6" />
        <KPI icon="fas fa-hand-holding-usd" label="ค่าดำเนินการ (ปากถุง)" value={fmtB(s.total_operation_fee)} color="#ec4899" />
        <KPI icon="fas fa-percentage" label="ค่าหักล่วงหน้า" value={fmtB(s.total_advance_interest)} color="#06b6d4" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 16, marginBottom: 4 }}>
        <div style={{ ...card(), padding: 20 }}>
          <SecTitle icon="fas fa-chart-pie" color="#8b5cf6">สถานะการอนุมัติ</SecTitle>
          <MiniBar rows={(dist || []).map(r => ({ cnt: r.cnt, label: r.status || 'ไม่ระบุ' }))} getColor={() => '#8b5cf6'} />
        </div>
      </div>

      <SecTitle icon="fas fa-clipboard-check" color="#8b5cf6" badge={pending.length}>เคสที่รออนุมัติ</SecTitle>
      <div style={{ ...card(), overflow: 'hidden' }}>
        <DataTable
          rows={pending}
          cols={[
            { key: 'case_code', label: 'รหัสเคส', style: { fontWeight: 600, color: '#2563eb' } },
            { key: 'debtor_code', label: 'รหัสลูกหนี้', style: { color: '#64748b' } },
            { key: 'debtor_name', label: 'ลูกหนี้' },
            { key: 'province', label: 'จังหวัด', style: { color: '#64748b' } },
            { key: 'estimated_value', label: 'ราคาประเมิน', render: r => fmtB(r.estimated_value) },
            { key: 'loan_amount', label: 'ขอกู้', render: r => fmtB(r.loan_amount) },
            { key: 'approved_credit', label: 'วงเงินอนุมัติ', render: r => fmtB(r.approved_credit), style: { fontWeight: 700, color: '#22c55e' } },
            { key: 'approval_status', label: 'สถานะ', render: r => <StatusBadge status={r.approval_status || r.status} /> },
            { key: 'sales_name', label: 'เซลล์', style: { color: '#94a3b8', fontSize: 12 } },
          ]}
        />
      </div>
    </>
  )
}

// ── ฝ่ายนิติกรรม ──────────────────────────────────────────
function LegalSection({ data, period }) {
  const { dept_legal_summary: s = {}, dept_legal_cases: cases = [], dept_legal_officers: officers = [] } = data
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <KPI icon="fas fa-file-contract" label="รายการทั้งหมด" value={fmt(s.total)} color="#2196F3" sub={`ช่วง${periodLabel}`} />
        <KPI icon="fas fa-stamp" label="นิติสำเร็จ" value={fmt(s.completed)} color="#22c55e" />
        <KPI icon="fas fa-clock" label="รอดำเนินการ" value={fmt(s.pending)} color="#f59e0b" />
        <KPI icon="fas fa-ban" label="ยกเลิก" value={fmt(s.cancelled)} color="#9ca3af" />
        <KPI icon="fas fa-user-tie" label="เจ้าหน้าที่" value={fmt(s.total_officers)} color="#2196F3" />
        <KPI icon="fas fa-landmark" label="สำนักงานที่ดิน" value={fmt(s.total_offices)} color="#2196F3" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 16, marginBottom: 4 }}>
        <div style={{ ...card(), padding: 20 }}>
          <SecTitle icon="fas fa-user-tie" color="#2196F3">เจ้าหน้าที่นิติกรรม</SecTitle>
          <MiniBar rows={officers} keyLabel="officer_name" keyVal="cnt" getColor={() => '#2196F3'} />
        </div>
      </div>

      <SecTitle icon="fas fa-balance-scale" color="#2196F3" badge={cases.filter(r => r.legal_status !== 'completed').length}>รายการนิติกรรม</SecTitle>
      <div style={{ ...card(), overflow: 'hidden' }}>
        <DataTable
          rows={cases}
          cols={[
            { key: 'case_code', label: 'รหัสเคส', style: { fontWeight: 600, color: '#2563eb' } },
            { key: 'debtor_code', label: 'รหัสลูกหนี้', style: { color: '#64748b' } },
            { key: 'debtor_name', label: 'ลูกหนี้' },
            { key: 'province', label: 'จังหวัด', style: { color: '#64748b' } },
            { key: 'approved_amount', label: 'วงเงิน', render: r => fmtB(r.approved_amount) },
            { key: 'officer_name', label: 'เจ้าหน้าที่', style: { color: '#64748b' } },
            { key: 'land_office', label: 'สำนักงาน', style: { color: '#64748b' } },
            { key: 'visit_date', label: 'วันนัด', render: r => fmtDate(r.visit_date) },
            { key: 'legal_status', label: 'สถานะ', render: r => <StatusBadge status={r.legal_status === 'completed' ? 'legal_completed' : r.legal_status === 'pending' ? 'preparing_docs' : r.legal_status} /> },
            { key: 'sales_name', label: 'เซลล์', style: { color: '#94a3b8', fontSize: 12 } },
          ]}
        />
      </div>
    </>
  )
}

// ── ฝ่ายออกสัญญา ──────────────────────────────────────────
function IssuingSection({ data, period }) {
  const { dept_issuing_summary: s = {}, dept_issuing_cases: cases = [] } = data
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <KPI icon="fas fa-file-signature" label="รายการทั้งหมด" value={fmt(s.total)} color="#3F51B5" sub={`ช่วง${periodLabel}`} />
        <KPI icon="fas fa-paper-plane" label="ส่งแล้ว" value={fmt(s.sent)} color="#22c55e" />
        <KPI icon="fas fa-clock" label="รอดำเนินการ" value={fmt(s.pending)} color="#f59e0b" />
        <KPI icon="fas fa-award" label="ค่าคอมมิชชั่น" value={fmtB(s.total_commission)} color="#3F51B5" />
      </div>

      <SecTitle icon="fas fa-file-signature" color="#3F51B5" badge={cases.filter(r => r.issuing_status !== 'sent').length}>รายการออกสัญญา</SecTitle>
      <div style={{ ...card(), overflow: 'hidden' }}>
        <DataTable
          rows={cases}
          cols={[
            { key: 'case_code', label: 'รหัสเคส', style: { fontWeight: 600, color: '#2563eb' } },
            { key: 'debtor_code', label: 'รหัสลูกหนี้', style: { color: '#64748b' } },
            { key: 'debtor_name', label: 'ลูกหนี้' },
            { key: 'approved_amount', label: 'วงเงิน', render: r => fmtB(r.approved_amount) },
            { key: 'tracking_no', label: 'เลขติดตาม', style: { color: '#64748b' } },
            { key: 'commission_amount', label: 'ค่าคอม', render: r => fmtB(r.commission_amount) },
            { key: 'issuing_status', label: 'สถานะ', render: r => (
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                fontSize: 11, fontWeight: 600, color: '#fff',
                background: r.issuing_status === 'sent' ? '#22c55e' : '#f59e0b' }}>
                {r.issuing_status === 'sent' ? 'ส่งแล้ว' : 'รอ'}
              </span>
            )},
            { key: 'sales_name', label: 'เซลล์', style: { color: '#94a3b8', fontSize: 12 } },
          ]}
        />
      </div>
    </>
  )
}

// ── ฝ่ายประมูล ────────────────────────────────────────────
function AuctionSection({ data, period }) {
  const {
    dept_auction_summary: s = {}, dept_auction_bids: bids = {},
    dept_auction_cases: cases = [], dept_auction_investors: investors = [],
  } = data
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <KPI icon="fas fa-gavel" label="รายการทั้งหมด" value={fmt(s.total)} color="#9C27B0" sub={`ช่วง${periodLabel}`} />
        <KPI icon="fas fa-check-double" label="ประมูลสำเร็จ" value={fmt(s.auctioned)} color="#22c55e" />
        <KPI icon="fas fa-trophy" label="ปิดเคส" value={fmt(s.completed)} color="#f59e0b" />
        <KPI icon="fas fa-clock" label="รอประมูล" value={fmt(s.pending)} color="#9C27B0" />
        <KPI icon="fas fa-hand-paper" label="bid ทั้งหมด" value={fmt(bids.total_bids)} color="#9C27B0" sub={`${fmt(bids.cases_with_bids)} เคส`} />
        <KPI icon="fas fa-coins" label="มูลค่า bid รวม" value={fmtB(bids.total_bid_amount)} color="#9C27B0" />
        <KPI icon="fas fa-piggy-bank" label="เงินมัดจำรวม" value={fmtB(bids.total_deposit)} color="#06b6d4" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 16, marginBottom: 4 }}>
        <div style={{ ...card(), padding: 20 }}>
          <SecTitle icon="fas fa-star" color="#9C27B0">Top นายทุน ({periodLabel})</SecTitle>
          <MiniBar rows={investors} keyLabel="investor_name" keyVal="bid_count" getColor={() => '#9C27B0'} />
        </div>
      </div>

      <SecTitle icon="fas fa-list-ul" color="#9C27B0" badge={cases.length}>เคสที่รอประมูล</SecTitle>
      <div style={{ ...card(), overflow: 'hidden' }}>
        <DataTable
          rows={cases}
          cols={[
            { key: 'case_code', label: 'รหัสเคส', style: { fontWeight: 600, color: '#2563eb' } },
            { key: 'debtor_code', label: 'รหัสลูกหนี้', style: { color: '#64748b' } },
            { key: 'debtor_name', label: 'ลูกหนี้' },
            { key: 'province', label: 'จังหวัด', style: { color: '#64748b' } },
            { key: 'estimated_value', label: 'ราคาประเมิน', render: r => fmtB(r.estimated_value) },
            { key: 'approved_amount', label: 'วงเงิน', render: r => fmtB(r.approved_amount) },
            { key: 'investor_name', label: 'นายทุน', style: { color: '#9C27B0', fontWeight: 600 } },
            { key: 'auction_status', label: 'สถานะ', render: r => (
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                fontSize: 11, fontWeight: 600, color: '#fff',
                background: r.auction_status === 'completed' ? '#22c55e' : r.auction_status === 'auctioned' ? '#8b5cf6' : '#f59e0b' }}>
                {r.auction_status === 'completed' ? 'สำเร็จ' : r.auction_status === 'auctioned' ? 'ประมูลแล้ว' : 'รอ'}
              </span>
            )},
            { key: 'sales_name', label: 'เซลล์', style: { color: '#94a3b8', fontSize: 12 } },
          ]}
        />
      </div>
    </>
  )
}

// ── ฝ่ายบัญชี ─────────────────────────────────────────────
function AccountingSection({ data, period }) {
  const { dept_accounting_summary: s = {}, dept_accounting_agent: ag = {}, dept_accounting_recent: recent = [] } = data
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <KPI icon="fas fa-file-invoice" label="รายการทั้งหมด" value={fmt(s.total_records)} color="#22c55e" sub={`ช่วง${periodLabel}`} />
        <KPI icon="fas fa-file-invoice-dollar" label="ค่าประเมิน (รับแล้ว)" value={fmtB(s.appraisal_revenue)} color="#22c55e" sub={`${fmt(s.appraisal_paid)} ราย`} />
        <KPI icon="fas fa-hand-holding-usd" label="ค่าปากถุง (รับแล้ว)" value={fmtB(s.bag_fee_revenue)} color="#f59e0b" sub={`${fmt(s.bag_fee_paid)} ราย`} />
        <KPI icon="fas fa-file-contract" label="ค่าขาย/จำนอง" value={fmtB(s.contract_sale_revenue)} color="#3b82f6" sub={`${fmt(s.contract_sale_paid)} ราย`} />
        <KPI icon="fas fa-plus-circle" label="บริการเพิ่มเติม" value={fmtB(s.additional_service_total)} color="#06b6d4" />
        <KPI icon="fas fa-user-friends" label="ค่านายหน้ารวม" value={fmtB(ag.total_commission)} color="#8b5cf6" sub={`จ่ายแล้ว ${fmt(ag.paid_agents)}/${fmt(ag.total_agents)} ราย`} />
      </div>

      <SecTitle icon="fas fa-history" color="#22c55e">รายการชำระล่าสุด ({periodLabel})</SecTitle>
      <div style={{ ...card(), overflow: 'hidden' }}>
        <DataTable
          rows={recent}
          cols={[
            { key: 'case_code', label: 'รหัสเคส', style: { fontWeight: 600, color: '#2563eb' } },
            { key: 'debtor_code', label: 'รหัสลูกหนี้', style: { color: '#64748b' } },
            { key: 'debtor_name', label: 'ลูกหนี้' },
            { key: 'appraisal_amount', label: 'ค่าประเมิน', render: r => fmtB(r.appraisal_amount) },
            { key: 'appraisal_status', label: 'ค่าประเมิน สถานะ', render: r => (
              <span style={{ color: r.appraisal_status === 'paid' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                {r.appraisal_status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
              </span>
            )},
            { key: 'bag_fee_amount', label: 'ค่าปากถุง', render: r => fmtB(r.bag_fee_amount) },
            { key: 'bag_fee_status', label: 'ปากถุง สถานะ', render: r => (
              <span style={{ color: r.bag_fee_status === 'paid' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
                {r.bag_fee_status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
              </span>
            )},
            { key: 'updated_at', label: 'อัปเดต', render: r => fmtDate(r.updated_at) },
          ]}
        />
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function SalesDashboardPage() {
  const user       = getCurrentUser() || {}
  const department = user.department || 'super_admin'
  const isAdmin    = department === 'super_admin' || department === 'manager'

  const [period, setPeriod] = useState('week')
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch(`${API}/api/admin/dashboard/unified?period=${period}`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      const json = await res.json()
      if (json.success) setData(json.dashboard)
      else setError(json.message || 'โหลดข้อมูลไม่สำเร็จ')
    } catch { setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้') }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // ── Loading / Error ────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 36, color: '#3b82f6', marginBottom: 12 }} />
        <div style={{ color: '#64748b' }}>กำลังโหลดแดชบอร์ด...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: 48 }}>
      <i className="fas fa-exclamation-circle" style={{ fontSize: 36, color: '#ef4444', marginBottom: 12 }} />
      <div style={{ color: '#ef4444', marginBottom: 16 }}>{error}</div>
      <button onClick={fetchDashboard} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 22px', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>ลองใหม่</button>
    </div>
  )

  if (!data) return null

  const {
    pipeline = {}, expiring_contracts = [], pending_chats = 0,
    fee_summary = {}, cases_trend = [], period_summary = {}, status_dist = [],
    appraisals = [], recent_cases = [], my_cases = [],
  } = data

  const p         = pipeline
  const fees      = fee_summary
  const ps        = period_summary
  const deptColor = DEPT_COLOR[department] || '#3b82f6'
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 8px 48px' }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: deptColor + '18', color: deptColor, fontSize: 24 }}>
            <i className={DEPT_ICON[department] || 'fas fa-chart-bar'} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
              แดชบอร์ด — {DEPT_LABEL[department] || department}
            </h2>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
              {user.full_name || user.nickname || user.username}
              {isAdmin && <span style={{ marginLeft: 6, color: deptColor, fontWeight: 600 }}>(ผู้ดูแลระบบ)</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#fff', fontSize: 14, fontWeight: 700, color: '#334155',
              cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={fetchDashboard}
            style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 10,
              padding: '9px 14px', cursor: 'pointer', color: '#3b82f6', fontSize: 14 }}>
            <i className="fas fa-sync-alt" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* KPI ภาพรวม                                        */}
      {/* ══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <KPI icon="fas fa-layer-group"       label="เคสทั้งหมด"            value={fmt(p.total_cases)}      color="#3b82f6"  sub={`แอคทีฟ ${fmt(p.active_cases)}`} />
        <KPI icon="fas fa-check-double"      label="สำเร็จ"                value={fmt(p.completed_cases)}  color="#22c55e" />
        {(department === 'sales' || isAdmin) &&
          <KPI icon="fas fa-comments"        label="แชทค้าง"               value={fmt(pending_chats)}      color="#f59e0b" />}
        <KPI icon="fas fa-money-bill-wave"   label="วงเงินอนุมัติรวม"      value={fmtB(fees.total_approved)} color="#8b5cf6" />
        <KPI icon="fas fa-hand-holding-usd"  label="ค่าดำเนินการ (ปากถุง)" value={fmtB(fees.total_operation_fee)} color="#ec4899" />
        <KPI icon="fas fa-percentage"        label="ค่าหักล่วงหน้า"        value={fmtB(fees.total_advance_interest)} color="#06b6d4" />
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* Pipeline                                          */}
      {/* ══════════════════════════════════════════════════ */}
      <SecTitle icon="fas fa-stream" color="#3b82f6">สถานะ Pipeline ทรัพย์ (ทั้งหมด)</SecTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        <PipeCard label="รอประเมิน"    count={p.waiting_appraisal}    color="#FF9800"  icon="fas fa-search" />
        <PipeCard label="ผ่านเกณฑ์"   count={p.appraisal_passed}     color="#4CAF50"  icon="fas fa-check-circle" />
        <PipeCard label="ไม่ผ่านเกณฑ์" count={p.appraisal_not_passed} color="#f44336"  icon="fas fa-times-circle" />
        <PipeCard label="รอประมูล"     count={p.waiting_auction}      color="#9C27B0"  icon="fas fa-gavel" />
        <PipeCard label="รอนิติ"       count={p.waiting_legal}        color="#2196F3"  icon="fas fa-balance-scale" />
        <PipeCard label="นิติสำเร็จ"  count={p.legal_completed}      color="#00BCD4"  icon="fas fa-stamp" />
        <PipeCard label="รอออกสัญญา"  count={p.waiting_issuing}      color="#3F51B5"  icon="fas fa-file-signature" />
        <PipeCard label="ยกเลิก"       count={p.cancelled_cases}      color="#9E9E9E"  icon="fas fa-ban" />
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* สัญญาใกล้ครบกำหนด — ทุกฝ่ายเห็น                 */}
      {/* ══════════════════════════════════════════════════ */}
      <SecTitle icon="fas fa-exclamation-triangle" color="#dc2626"
        badge={expiring_contracts.length}>
        สัญญาใกล้ครบกำหนด (ภายใน 2 เดือน) — ทุกฝ่าย
      </SecTitle>
      <div style={{ ...card(), overflow: 'hidden', marginBottom: 8 }}>
        <ExpiryTable rows={expiring_contracts} />
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* สรุปช่วงเวลา                                      */}
      {/* ══════════════════════════════════════════════════ */}
      <SecTitle icon="fas fa-calendar-check" color={deptColor}>สรุป ({periodLabel})</SecTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <KPI icon="fas fa-plus-circle"  label={`เคสใหม่ (${periodLabel})`} value={fmt(ps.total_cases)}    color="#3b82f6" />
        <KPI icon="fas fa-trophy"       label="ปิดเคสได้"                  value={fmt(ps.closed_cases)}   color="#22c55e" />
        <KPI icon="fas fa-times-circle" label="ยกเลิก"                    value={fmt(ps.cancelled_cases)} color="#ef4444" />
        <KPI icon="fas fa-coins"        label="วงเงิน (ช่วงนี้)"           value={fmtB(ps.total_approved)} color="#8b5cf6" />
      </div>

      {/* Charts 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 16, marginBottom: 8 }}>
        <div style={{ ...card(), padding: 20 }}>
          <SecTitle icon="fas fa-chart-line" color={deptColor}>เคสใหม่ ({periodLabel})</SecTitle>
          <MiniBar rows={cases_trend} getColor={() => deptColor} />
        </div>
        <div style={{ ...card(), padding: 20 }}>
          <SecTitle icon="fas fa-chart-bar" color={deptColor}>การกระจายสถานะเคส</SecTitle>
          <MiniBar
            rows={(status_dist || []).map(r => ({
              cnt: r.cnt, label: CASE_STATUS_LABEL[r.status] || r.status,
              _status: r.status,
            }))}
            getColor={r => CASE_STATUS_COLOR[r._status] || '#64748b'}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* DEPARTMENT-SPECIFIC SECTIONS                      */}
      {/* ══════════════════════════════════════════════════ */}

      {/* ── ฝ่ายขาย ─── */}
      {(department === 'sales' || isAdmin) && (
        <>
          <div style={{ margin: '28px 0 12px', padding: '10px 16px',
            background: '#eff6ff', borderRadius: 10, borderLeft: `4px solid #3b82f6`,
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-headset" style={{ color: '#3b82f6', fontSize: 16 }} />
            <span style={{ fontWeight: 700, color: '#1e40af', fontSize: 15 }}>ข้อมูลฝ่ายขาย</span>
          </div>
          <SalesSection data={data} period={period} isAdmin={isAdmin} />
        </>
      )}

      {/* ── ฝ่ายประเมิน ─── */}
      {(department === 'appraisal' || isAdmin) && (
        <>
          <div style={{ margin: '28px 0 12px', padding: '10px 16px',
            background: '#fffbeb', borderRadius: 10, borderLeft: `4px solid #f59e0b`,
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-search-dollar" style={{ color: '#f59e0b', fontSize: 16 }} />
            <span style={{ fontWeight: 700, color: '#92400e', fontSize: 15 }}>ข้อมูลฝ่ายประเมิน</span>
          </div>
          <AppraisalSection data={data} period={period} />
        </>
      )}

      {/* ── ฝ่ายอนุมัติ ─── */}
      {(department === 'approval' || isAdmin) && (
        <>
          <div style={{ margin: '28px 0 12px', padding: '10px 16px',
            background: '#f5f3ff', borderRadius: 10, borderLeft: `4px solid #8b5cf6`,
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-money-check-alt" style={{ color: '#8b5cf6', fontSize: 16 }} />
            <span style={{ fontWeight: 700, color: '#4c1d95', fontSize: 15 }}>ข้อมูลฝ่ายอนุมัติ</span>
          </div>
          <ApprovalSection data={data} period={period} />
        </>
      )}

      {/* ── ฝ่ายประมูล ─── */}
      {(department === 'auction' || isAdmin) && (
        <>
          <div style={{ margin: '28px 0 12px', padding: '10px 16px',
            background: '#fdf4ff', borderRadius: 10, borderLeft: `4px solid #9C27B0`,
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-gavel" style={{ color: '#9C27B0', fontSize: 16 }} />
            <span style={{ fontWeight: 700, color: '#6b21a8', fontSize: 15 }}>ข้อมูลฝ่ายประมูล</span>
          </div>
          <AuctionSection data={data} period={period} />
        </>
      )}

      {/* ── ฝ่ายนิติกรรม ─── */}
      {(department === 'legal' || isAdmin) && (
        <>
          <div style={{ margin: '28px 0 12px', padding: '10px 16px',
            background: '#eff6ff', borderRadius: 10, borderLeft: `4px solid #2196F3`,
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-balance-scale" style={{ color: '#2196F3', fontSize: 16 }} />
            <span style={{ fontWeight: 700, color: '#1e3a8a', fontSize: 15 }}>ข้อมูลฝ่ายนิติกรรม</span>
          </div>
          <LegalSection data={data} period={period} />
        </>
      )}

      {/* ── ฝ่ายออกสัญญา ─── */}
      {(department === 'issuing' || isAdmin) && (
        <>
          <div style={{ margin: '28px 0 12px', padding: '10px 16px',
            background: '#eef2ff', borderRadius: 10, borderLeft: `4px solid #3F51B5`,
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-file-signature" style={{ color: '#3F51B5', fontSize: 16 }} />
            <span style={{ fontWeight: 700, color: '#312e81', fontSize: 15 }}>ข้อมูลฝ่ายออกสัญญา</span>
          </div>
          <IssuingSection data={data} period={period} />
        </>
      )}

      {/* ── ฝ่ายบัญชี ─── */}
      {(department === 'accounting' || isAdmin) && (
        <>
          <div style={{ margin: '28px 0 12px', padding: '10px 16px',
            background: '#f0fdf4', borderRadius: 10, borderLeft: `4px solid #22c55e`,
            display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-calculator" style={{ color: '#22c55e', fontSize: 16 }} />
            <span style={{ fontWeight: 700, color: '#14532d', fontSize: 15 }}>ข้อมูลฝ่ายบัญชี</span>
          </div>
          <AccountingSection data={data} period={period} />
        </>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* ราคาประเมิน                                       */}
      {/* ══════════════════════════════════════════════════ */}
      {appraisals && appraisals.length > 0 && (
        <>
          <SecTitle icon="fas fa-search-dollar" color="#f59e0b">ราคาประเมินล่าสุด</SecTitle>
          <div style={{ ...card(), overflow: 'hidden' }}>
            <DataTable
              rows={appraisals}
              cols={[
                { key: 'case_code',     label: 'รหัสเคส',    style: { fontWeight: 600, color: '#2563eb' } },
                { key: 'debtor_code',   label: 'รหัสลูกหนี้', style: { color: '#64748b' } },
                { key: 'debtor_name',   label: 'ชื่อลูกหนี้' },
                { key: 'province',      label: 'จังหวัด',     style: { color: '#64748b' } },
                { key: 'estimated_value', label: 'ราคาประเมิน', render: r => <span style={{ fontWeight: 700, color: '#059669' }}>{fmtB(r.estimated_value)}</span> },
                { key: 'loan_amount',   label: 'ขอกู้',       render: r => fmtB(r.loan_amount) },
                { key: 'appraisal_result', label: 'ผล', render: r => (
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff',
                    background: r.appraisal_result === 'passed' ? '#22c55e' : r.appraisal_result === 'not_passed' ? '#ef4444' : '#f59e0b' }}>
                    {r.appraisal_result === 'passed' ? 'ผ่าน' : r.appraisal_result === 'not_passed' ? 'ไม่ผ่าน' : 'รอผล'}
                  </span>
                )},
                { key: 'updated_at', label: 'อัปเดต', render: r => fmtDate(r.updated_at) },
              ]}
            />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* เคสที่ฉันดูแล (My Cases)                          */}
      {/* ══════════════════════════════════════════════════ */}
      {!isAdmin && my_cases && my_cases.length > 0 && (
        <>
          <SecTitle icon="fas fa-user-circle" color={deptColor} badge={my_cases.length}>
            เคส/ลูกหนี้ที่ฉันดูแล
          </SecTitle>
          <div style={{ ...card(), overflow: 'hidden' }}>
            <MyCasesTable rows={my_cases} />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* เคสล่าสุด (ทั้งหมด)                              */}
      {/* ══════════════════════════════════════════════════ */}
      <SecTitle icon="fas fa-clock" color="#64748b">เคสล่าสุดที่อัปเดต</SecTitle>
      <div style={{ ...card(), overflow: 'hidden' }}>
        <DataTable
          rows={recent_cases}
          cols={[
            { key: 'case_code',     label: 'รหัสเคส',    style: { fontWeight: 600, color: '#2563eb' } },
            { key: 'debtor_name',   label: 'ลูกหนี้' },
            { key: 'status',        label: 'สถานะ',        render: r => <StatusBadge status={r.status} /> },
            { key: 'approved_amount', label: 'วงเงิน',    render: r => fmtB(r.approved_amount || r.loan_amount) },
            { key: 'sales_name',    label: 'เซลล์',        style: { color: '#64748b' } },
            { key: 'updated_at',    label: 'อัปเดต',       render: r => fmtDate(r.updated_at) },
          ]}
        />
      </div>

      <div style={{ textAlign: 'center', padding: '24px 0 0', color: '#cbd5e1', fontSize: 11 }}>
        LoanDD Unified Dashboard — ข้อมูลอัปเดตอัตโนมัติเมื่อเปลี่ยนช่วงเวลา
      </div>
    </div>
  )
}

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import logoImg from '../pic/loand.png'

const token = () => localStorage.getItem('loandd_admin')

const TEMPLATES = {
  sp_contract: { title: 'สัญญาขายฝาก', color: '#059669' },
  sp_broker: { title: 'สัญญาแต่งตั้งนายหน้า (ขายฝาก)', color: '#0891b2' },
  sp_appendix: { title: 'เอกสารแนบท้ายสัญญาแต่งตั้งนายหน้า (ขายฝาก)', color: '#7c3aed' },
  sp_notice: { title: 'หนังสือแจ้งเตือนเรื่องครบกำหนดไถ่ถอน', color: '#dc2626' },
  mg_loan: { title: 'สัญญากู้ยืมเงิน (จำนอง)', color: '#b45309' },
  mg_addendum: { title: 'สัญญาต่อท้ายสัญญาจำนอง', color: '#be185d' },
  mg_appendix: { title: 'เอกสารแนบท้ายสัญญาแต่งตั้งนายหน้า (จำนอง)', color: '#7c3aed' },
  mg_broker: { title: 'สัญญาแต่งตั้งนายหน้า (จำนอง)', color: '#0891b2' },
}

const COMPANY_INFO = {
  name: 'บริษัท โลนด์ ดีดี จำกัด',
  regId: '0105566225836',
  address: '87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510',
  phone: '081-638-6966',
  officer: 'วรวุฒิ กิตติอุดม',
}

const PROPERTY_TYPE_MAP = {
  land: 'ที่ดินเปล่า',
  land_building: 'ที่ดินพร้อมสิ่งปลูกสร้าง',
  condo: 'ห้องชุด',
  townhouse: 'ทาวน์เฮาส์',
  house: 'บ้านเดี่ยว',
  single_house: 'บ้านเดี่ยว',
  shophouse: 'อาคารพาณิชย์',
  apartment: 'หอพัก / อพาร์ตเมนต์',
}

const VERSION_CONFIG = {
  sp_contract: [
    { ver: 1, label: 'Ver.1' },
    { ver: 2, label: 'Ver.2' },
    { ver: 3, label: 'Ver.3' },
    { ver: 4, label: 'Ver.4' },
    { ver: 5, label: 'Ver.5 หัก 4 ด.+ไถ่ 6 จ่าย 6' },
    { ver: 6, label: 'Ver.6 หัก 12 ด. ไถ่ถอนก่อน 6 ด.' },
  ],
  sp_broker: [
    { ver: 1, label: 'Ver.1' },
    { ver: 2, label: 'Ver.2' },
    { ver: 3, label: 'Ver.3' },
  ],
  sp_appendix: [
    { ver: 1, label: 'Ver.1' },
    { ver: 2, label: 'Ver.2' },
    { ver: 3, label: 'Ver.3' },
  ],
  sp_notice: [
    { ver: 1, label: 'ที่ดิน/ที่ดินพร้อมสิ่งปลูกสร้าง' },
    { ver: 2, label: 'ห้องชุด' },
  ],
  mg_loan: [
    { ver: 1, label: 'Ver.1' },
    { ver: 2, label: 'Ver.2' },
    { ver: 3, label: 'Ver.3' },
    { ver: 4, label: 'Ver.4' },
  ],
  mg_addendum: [
    { ver: 1, label: 'Ver.1' },
    { ver: 2, label: 'Ver.2' },
    { ver: 3, label: 'Ver.3' },
  ],
  mg_appendix: [
    { ver: 1, label: 'ver.1' },
    { ver: 2, label: 'ver.2' },
    { ver: 3, label: 'ver.3' },
  ],
  mg_broker: [
    { ver: 1, label: 'ver.1' },
    { ver: 2, label: 'ver.2' },
    { ver: 3, label: 'ver.3' },
  ],
}

export default function DocEditorModal({ show, onClose, templateType, caseData, caseId, onSaved }) {
  const [fields, setFields] = useState({})
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState('')
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [pageCount, setPageCount] = useState(1)
  const [pageBreaks, setPageBreaks] = useState([])
  const paperRef = useRef(null)
  const PAGE_H = 1122 // ~297mm in px at 96dpi
  const GAP_H = 80   // total gap between pages (margin + bar + margin)

  const F = (key, width = 150, placeholder = '') => {
    const val = fields[key] || ''
    const autoWidth = val.length > 0 ? Math.max(width, val.length * 9 + 20) : width
    return (
      <input
        type="text"
        value={val}
        onChange={e => setFields(prev => ({...prev, [key]: e.target.value}))}
        placeholder={placeholder || ''}
        style={{
          border: 'none',
          borderBottom: '1px dotted #ccc',
          outline: 'none',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          width: autoWidth,
          minWidth: 30,
          maxWidth: '100%',
          textAlign: 'center',
          padding: '0 2px',
          background: 'transparent',
          borderRadius: 0,
          color: 'inherit',
        }}
      />
    )
  }

  const DocHeader = () => (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <img src={logoImg} alt="LoanDD" style={{ height: 60, marginBottom: 4 }} />
      <div style={{ fontSize: 12, color: '#666' }}>บริษัท โลนด์ ดีดี จำกัด</div>
    </div>
  )

  useEffect(() => {
    if (!show || !caseData) return

    const auto = {}
    if (caseData.contact_name) auto.seller_name = caseData.contact_name
    if (caseData.contact_phone) auto.seller_phone = caseData.contact_phone
    if (caseData.province) auto.province = caseData.province
    if (caseData.district) auto.amphoe = caseData.district
    if (caseData.subdistrict) auto.tambon = caseData.subdistrict
    if (caseData.deed_number) auto.deed_no = caseData.deed_number
    if (caseData.property_type) {
      auto.property_type_full = PROPERTY_TYPE_MAP[caseData.property_type] || caseData.property_type
    }
    if (caseData.approved_credit) auto.contract_amount = String(caseData.approved_credit)
    if (caseData.interest_per_year) auto.interest_rate = String(caseData.interest_per_year)
    if (caseData.case_code) auto.property_code = caseData.case_code
    if (caseData.land_area) auto.land_area = caseData.land_area

    // Company (buyer/lender) defaults
    auto.buyer_name = COMPANY_INFO.name
    auto.buyer_id = COMPANY_INFO.regId
    auto.buyer_address = COMPANY_INFO.address
    auto.buyer_phone = COMPANY_INFO.phone
    auto.lender_name = COMPANY_INFO.name
    auto.lender_id = COMPANY_INFO.regId
    auto.lender_address = COMPANY_INFO.address
    auto.lender_phone = COMPANY_INFO.phone

    // Today's date in Thai format
    auto.contract_date = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    setFields(auto)

    // Set default version
    const versions = VERSION_CONFIG[templateType]
    if (versions?.length) {
      setSelectedVersion(prev => prev || versions[versions.length - 1].ver)
    }
  }, [show, caseData, templateType])

  useLayoutEffect(() => {
    if (!paperRef.current || !show) return

    const measure = () => {
      const paper = paperRef.current
      if (!paper) return
      // Remove old spacers, fills, and labels first
      paper.querySelectorAll('.doc-page-spacer, .doc-last-page-num, .doc-last-page-fill').forEach(el => el.remove())

      const totalH = paper.scrollHeight
      const pages = Math.max(1, Math.ceil(totalH / PAGE_H))
      setPageCount(pages)
      if (pages <= 1) {
        // Still fill to full A4 height for visual clarity
        const fill1 = PAGE_H - paper.scrollHeight
        if (fill1 > 10) {
          const fd = document.createElement('div')
          fd.className = 'doc-last-page-fill'
          fd.style.cssText = `height:${fill1}px;`
          paper.appendChild(fd)
        }
        setPageBreaks([])
        return
      }

      // Find the best paragraph boundary near each ideal page break
      const paperRect = paper.getBoundingClientRect()
      const allEls = paper.querySelectorAll('p, div[style], b, h2, h3, table')
      const breaks = []

      for (let p = 1; p < pages; p++) {
        const prevGapTotal = breaks.reduce((s, b) => s + GAP_H, 0)
        const idealBreak = p * PAGE_H + prevGapTotal
        let bestEl = null
        let bestTop = idealBreak
        let bestDist = Infinity

        allEls.forEach(el => {
          if (el.classList.contains('doc-page-spacer')) return
          if (el.closest('.doc-page-spacer')) return
          const rect = el.getBoundingClientRect()
          const elTop = rect.top - paperRect.top
          const dist = Math.abs(elTop - idealBreak)
          if (dist < bestDist && dist < 150) {
            bestDist = dist
            bestTop = elTop
            bestEl = el
          }
        })

        // Insert a spacer element at this break point
        if (bestEl && bestEl.parentNode) {
          const spacer = document.createElement('div')
          spacer.className = 'doc-page-spacer'
          spacer.setAttribute('data-page', String(p))
          spacer.style.cssText = `
            position: relative;
            margin-top: 0;
            margin-bottom: 0;
            padding: 0;
          `

          // Bottom margin area (white space = end of page)
          const bottomMargin = document.createElement('div')
          bottomMargin.style.cssText = `
            height: 30px;
            background: white;
            width: calc(100% + 75.6mm);
            margin-left: -20mm;
            box-shadow: 0 2px 6px rgba(0,0,0,0.12);
            position: relative;
            z-index: 1;
          `

          // Gray gap strip (space between paper sheets)
          const gapStrip = document.createElement('div')
          gapStrip.style.cssText = `
            height: 20px;
            background: #b0b3b8;
            width: calc(100% + 75.6mm);
            margin-left: -20mm;
            position: relative;
          `

          // Page number label (centered in the gap)
          const pageLabel = document.createElement('div')
          pageLabel.style.cssText = `
            position: absolute; top: 50%; right: 20mm;
            transform: translateY(-50%);
            font-size: 11px; color: #666; font-family: sans-serif;
            pointer-events: none; user-select: none;
            background: rgba(255,255,255,0.7); padding: 1px 8px;
            border-radius: 3px;
          `
          pageLabel.textContent = `หน้า ${p} / ${pages}`
          gapStrip.appendChild(pageLabel)

          // Top margin area (white space = start of next page)
          const topMargin = document.createElement('div')
          topMargin.style.cssText = `
            height: 30px;
            background: white;
            width: calc(100% + 75.6mm);
            margin-left: -20mm;
            box-shadow: 0 -2px 6px rgba(0,0,0,0.12);
            position: relative;
            z-index: 1;
          `

          spacer.appendChild(bottomMargin)
          spacer.appendChild(gapStrip)
          spacer.appendChild(topMargin)

          bestEl.parentNode.insertBefore(spacer, bestEl)
          breaks.push(bestTop)
        }
      }

      // Pad last page to full A4 height for clear visual
      const afterSpacersH = paper.scrollHeight
      const targetH = pages * PAGE_H + (pages - 1) * GAP_H
      const fillH = Math.max(0, targetH - afterSpacersH - 24) // leave 24px for label
      if (fillH > 0) {
        const fillDiv = document.createElement('div')
        fillDiv.className = 'doc-last-page-fill'
        fillDiv.style.cssText = `height:${fillH}px;`
        paper.appendChild(fillDiv)
      }

      // Page number at bottom of last page
      const lastLabel = document.createElement('div')
      lastLabel.className = 'doc-last-page-num'
      lastLabel.style.cssText = `
        text-align: right; font-size: 11px; color: #888;
        font-family: sans-serif; margin-top: 8px; padding-right: 4px;
      `
      lastLabel.textContent = `หน้า ${pages} / ${pages}`
      paper.appendChild(lastLabel)

      setPageBreaks(breaks)
    }

    // Delay to allow render to complete
    const timer = setTimeout(measure, 200)
    return () => clearTimeout(timer)
  }, [show, templateType, selectedVersion])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/issuing/doc/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`,
        },
        body: JSON.stringify({
          case_id: caseId,
          template_type: templateType,
          version: selectedVersion || 1,
          field_overrides: fields,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onSaved?.(data.data?.file_path || data.file_path)
        onClose()
      } else {
        setError(data.message || 'ไม่สามารถบันทึกเอกสารได้')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // สร้าง HTML สำหรับพิมพ์/โหลด (แทนค่า input เป็น text ธรรมดา)
  const getCleanHTML = () => {
    const paper = document.getElementById('doc-editor-paper')
    if (!paper) return ''
    const clone = paper.cloneNode(true)
    // ลบ spacer, page number และ fill divs ออก (ไม่รวมใน output)
    clone.querySelectorAll('.doc-page-spacer, .doc-last-page-num, .doc-last-page-fill').forEach(el => el.remove())
    // แทน input ด้วยข้อความที่กรอก
    clone.querySelectorAll('input').forEach(inp => {
      const span = document.createElement('span')
      span.textContent = inp.value || inp.placeholder || '_______________'
      span.style.cssText = 'text-decoration: underline; padding: 0 4px;'
      inp.replaceWith(span)
    })
    return clone.innerHTML
  }

  const a4Styles = `
    @page {
      size: A4;
      margin: 15mm 20mm 20mm 20mm;
      @bottom-right { content: counter(page) " | " counter(pages); }
    }
    body {
      font-family: 'TH Sarabun New', Sarabun, serif;
      font-size: 13pt;
      line-height: 1.5;
      color: #000;
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm 20mm;
    }
    span { font-family: inherit; font-size: inherit; }
    @media print {
      body { padding: 0; }
    }
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 999;
      background: #fff; border-bottom: 2px solid #e5e7eb;
      padding: 10px 24px; display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .toolbar button {
      padding: 8px 16px; border: none; border-radius: 8px; font-size: 14px; font-weight: 700;
      cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
    }
    .btn-print { background: #0891b2; color: white; }
    .btn-download { background: #7c3aed; color: white; }
    .content { margin-top: 60px; }
    @media print { .toolbar { display: none; } .content { margin-top: 0; } }
  `

  // เปิด new tab แสดงเอกสาร A4 พร้อมปุ่มพิมพ์+โหลด
  const openNewTab = (autoPrint = false) => {
    const html = getCleanHTML()
    const title = TEMPLATES[templateType]?.title || 'เอกสาร'
    const win = window.open('', '_blank')
    win.document.write(`<html><head><meta charset="utf-8"><title>${title}</title><style>${a4Styles}</style></head><body>
      <div class="toolbar">
        <div style="font-size:16px;font-weight:bold;color:#1a5e1f;">${title}</div>
        <div style="display:flex;gap:10px;">
          <button class="btn-print" onclick="window.print()">🖨️ พิมพ์</button>
          <button class="btn-download" id="dlBtn">📥 โหลด .doc</button>
        </div>
      </div>
      <div class="content">${html}</div>
      <script>
        document.getElementById('dlBtn').onclick = function() {
          var content = document.querySelector('.content').innerHTML;
          var fullHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm 20mm;}body{font-family:serif;font-size:13pt;line-height:1.5;}</style></head><body>' + content + '</body></html>';
          var blob = new Blob([fullHtml], {type:'application/msword'});
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = '${title}.doc';
          a.click();
        };
      </script>
    </body></html>`)
    win.document.close()
    if (autoPrint) {
      setTimeout(() => win.print(), 500)
    }
  }

  const handlePrint = () => {
    openNewTab(true)
  }

  const handleDownload = () => {
    openNewTab(false)
  }

  const renderTemplate = () => {
    switch (templateType) {
      case 'sp_contract':
        return renderSpContract()
      case 'sp_broker':
        return renderSpBroker()
      case 'sp_appendix':
        return renderSpAppendix()
      case 'sp_notice':
        return renderSpNotice()
      case 'mg_loan':
        return renderMgLoan()
      case 'mg_addendum':
        return renderMgAddendum()
      case 'mg_appendix':
        return renderMgAppendix()
      case 'mg_broker':
        return renderMgBroker()
      default:
        return <div>เทมเพลตไม่พบ</div>
    }
  }

  const S = { margin: '6px 0' } // paragraph spacing ให้ตรงต้นฉบับ
  const renderSpContract = () => (
    <>
      <DocHeader />
      <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 12 }}>
        สัญญาขายฝาก
      </div>

      {/* Header - Company location and date */}
      <p style={{ ...S, textAlign: 'right', fontSize: 'inherit' }}>
        ทำที่ บริษัท โลนด์ ดีดี จำกัด 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510 วันที่ {F('contract_date', 160, 'วัน เดือน ปี')}
      </p>

      {/* Buyer (Purchaser) Info */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        สัญญาฉบับนี้ทำขึ้น ระหว่าง นาย/นาง/นางสาว {F('buyer_name', 180, 'ชื่อผู้ซื้อฝาก')} เลขบัตรประชาชน {F('buyer_id', 130, 'เลขบัตร')} ที่อยู่ตามบัตร {F('buyer_address', 250, 'ที่อยู่')} เบอร์ {F('buyer_phone', 100, 'เบอร์โทร')} ซึ่งต่อไปนี้เรียกว่า <b>"ผู้ซื้อฝาก"</b> ฝ่ายหนึ่งกับ
      </p>

      {/* Seller Info */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        นาย/นาง/นางสาว {F('seller_name', 180, 'ชื่อผู้ขายฝาก')} เลขบัตรประชาชน {F('seller_id', 130, 'เลขบัตร')} ที่อยู่ตามบัตร {F('seller_address', 250, 'ที่อยู่')} เบอร์ {F('seller_phone', 100)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้ขายฝาก"</b> รหัสทรัพย์ {F('property_code', 100)} อีกฝ่ายหนึ่ง
      </p>

      {/* Agreement intro */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญากันตามรายละเอียดดังต่อไปนี้
      </p>

      {/* Section 1 - Property Details */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 1.</b> ผู้ขายฝากตกลงขายฝาก และผู้ซื้อฝากตกลงรับซื้อฝาก <b>{F('property_type_full', 180, 'ประเภททรัพย์')}</b> เลขที่ {F('address_no', 80)} โฉนดเลขที่ {F('deed_no', 100)} เลขที่ดิน {F('land_no', 80)} หน้าสำรวจ {F('survey_page', 80)} ตำบล {F('tambon', 100)} อำเภอ {F('amphoe', 100)} จังหวัด {F('province', 100)} เนื้อที่รวม {F('land_area', 130, 'ไร่/งาน/ตร.วา')} โดยผู้ขายฝากรับรองว่า ผู้ขายฝากเป็นเจ้าของผู้มีกรรมสิทธิ์และมีสิทธิ์โดยชอบด้วยกฎหมายแต่เพียงผู้เดียวในการเข้าทำสัญญานี้และขายฝากทรัพย์สินที่ขายฝากได้ โดยปราศจากการไถ่แย่งและการออนสิทธิ์ใด ๆ ทั้งสิ้น รวมถึงไม่ติดค้าชำระค่าภาษีอากร ค่าธรรมเนียมใด ๆ และรวมถึงไม่ติดค่าสาธารณูปโภคใด ๆ อันเกี่ยวกับทรัพย์สินที่ขายฝากทั้งสิ้น และผู้ขายฝากไม่ได้อยู่ในระหว่างพิจารณาคดี ทรัพย์สินที่ขายฝากไม่เป็นบิลสินสมรส และไม่ได้เป็นหรือจะเป็นบุคคลล้มละลาย หรือเป็นผู้มีหนี้สินล้นพ้นตัวตามกฎหมาย และไม่เคยถูกศาลสั่งพิทักษ์ทรัพย์ในคดีล้มละลายมาก่อน โดยผู้ขายฝากจะรับรองว่าการทำสัญญานี้สมบูรณ์ชอบด้วยกฎหมายทุกประการ และจะไม่มีการเพิกถอนนิติกรรมในภายหลัง
      </p>

      {/* Section 2 - Price & Payment */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 2.</b> ผู้ขายฝากตกลงทำการขายฝากและผู้ซื้อฝากตกลงรับซื้อฝากทรัพย์สินที่ขายฝากตามข้อ 1 ในราคา {F('contract_amount', 130, 'จำนวนเงิน')} บาท ({F('contract_amount_text', 220, 'ตัวอักษร')}) โดยผู้ซื้อฝากตกลงจะชำระราคาค่าทรัพย์สินที่ขายฝากและส่งมอบให้แก่ผู้ขายฝากในวันที่ดำเนินการจดทะเบียนขายฝากตามข้อ 5 แล้วเสร็จ
      </p>
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        ผู้ขายฝากตกลงรับผิดชอบทั้งสิ้นแต่เพียงผู้เดียวในบรรดาค่าอากรแสตมป์ และ/หรือค่าภาษีธุรกิจเฉพาะ ภาษีเงินได้หัก ณ ที่จ่าย ภาษีอื่นใด รวมถึงค่าใช้จ่ายใด ๆ อันเกี่ยวกับการจดทะเบียนขายฝากและการไถ่ถอนทรัพย์สินที่ขายฝาก รวมถึงแต่ไม่จำกัดเพียง ค่าภาษีที่ดินและสิ่งปลูกสร้าง รวมถึงชำระค่าน้ำ ค่าไฟ ค่าโทรศัพท์ ค่าประกันอัคคีภัย และอื่นๆ ที่ผู้ขายฝากนำมาใช้กับที่ดินและสิ่งปลูกสร้าง ทั้งนี้ ผู้ขายฝากตกลงชำระสินไถ่ให้แก่ผู้ซื้อฝากบางส่วนในวันที่จดทะเบียนขายฝากต่อหน้าเจ้าหน้าที่เป็นเงินจำนวน {F('upfront_payment', 130)} บาท ({F('upfront_payment_text', 150)}) และผู้ขายฝากตกลงชำระสินไถ่ส่วนที่เหลือเป็นจำนวน {F('installment_count', 40)} งวดๆ ละ {F('installment_amount', 130)} บาท ({F('installment_text', 150)}) ทุกวันที่ {F('payment_day', 30)} ของทุกเดือน เป็นเงินจำนวนทั้งสิ้น {F('total_installment', 130)} บาท ({F('total_installment_text', 150)}) ให้แก่ผู้ซื้อฝากจนกว่าจะชำระครบถ้วน โดยผู้ซื้อฝากจะนำสินไถ่จำนวนดังกล่าวไปตัดชำระสินไถ่ในวันครบกำหนดไถ่ถอนตามสัญญานี้
      </p>

      {/* Section 3 - Redemption Period */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 3.</b> ผู้ขายฝากสัญญาว่าจะไถ่ถอนคืนทรัพย์สินที่ขายฝากตามสัญญานี้ ภายในระยะเวลา 1 (หนึ่ง) ปี นับตั้งแต่วันที่จดทะเบียนขายฝากทรัพย์สิน ตามข้อ 5 ในราคาสินไถ่เป็นจำนวนทั้งสิ้น {F('redemption_price', 130, 'จำนวนเงิน')} บาท ({F('redemption_price_text', 220, 'ตัวอักษร')}) หากพ้นกำหนดระยะเวลาดังกล่าวแล้วผู้ขายฝากไม่ทำการไถ่คืน ทรัพย์สินที่ขายฝากตามข้อ 1 จะตกเป็นกรรมสิทธิ์โดยเด็ดขาดของผู้ซื้อฝาก <b>กันทีและไม่มีสิทธิ์ไถ่คืนอีกต่อไป</b> ทั้งนี้ ผู้ขายฝากตกลงขนย้ายสิ่งของและบริวารออกจากทรัพย์สินที่ขายฝาก ภายในระยะ 7 (เจ็ด) วัน นับแต่วันครบระยะเวลาตามสัญญาขายฝาก หากผู้ขายฝากไม่ดำเนินการขนย้ายสิ่งของและบริวารออกไปภายในกำหนดเวลาดังกล่าว ผู้ซื้อฝากมีสิทธิ์จะเรียกร้องค่าเสียหาย ค่าเสียโอกาสใดๆ รวมถึงดอกเบี้ยผิดนัดในอัตราร้อยละ 15 (สิบห้า) ต่อปีอันเกิดจากการไม่ย้ายออกของผู้ขายฝากได้ อีกทั้ง ผู้ซื้อฝากมีสิทธิ์จะดำเนินการตามกฎหมายต่อไป
      </p>

      {/* Section 3.1 - Version-specific */}
      {(selectedVersion === 5) ? (
        <p style={{ ...S, fontSize: 'inherit' }}>
          <b>3.1</b> หากผู้ขายฝากต้องการไถ่ถอนทรัพย์สินที่ขายฝากก่อนครบกำหนดระยะเวลาตามสัญญาฉบับนี้ <b>ภายในระยะเวลา 6 เดือน</b> ผู้ขายฝากตกลงและยินยอมชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากเป็นจำนวน 2 งวดๆ ละ {F('early_6m_amount', 100)} บาท ({F('early_6m_text', 150)}) เป็นจำนวนเงิน {F('early_6m_total', 100)} บาท ({F('early_6m_total_text', 150)}) <b>กรณีไถ่ถอนภายใน 7-12 เดือน</b> ผู้ขายฝากตกลงและยินยอมชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากตามข้อ 3
        </p>
      ) : (selectedVersion === 6) ? (
        <p style={{ ...S, fontSize: 'inherit' }}>
          <b>3.1</b> หากผู้ขายฝากต้องการไถ่ถอนทรัพย์สินที่ขายฝากก่อนครบกำหนดระยะเวลาตามสัญญาฉบับนี้ <b>ภายในระยะเวลา 6 เดือน</b> ผู้ขายฝากตกลงและยินยอมชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากเป็นจำนวน 2 งวดๆ ละ {F('early_6m_amount', 100)} บาท ({F('early_6m_text', 150)}) เป็นจำนวนเงิน {F('early_6m_total', 100)} บาท ({F('early_6m_total_text', 150)}) <b>กรณีไถ่ถอนภายใน 7-12 เดือน</b> ผู้ขายฝากตกลงและยินยอมชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากตามข้อ 3
        </p>
      ) : (
        <p style={{ ...S, fontSize: 'inherit' }}>
          <b>3.1</b> หากผู้ขายฝากต้องการไถ่ถอนทรัพย์สินที่ขายฝากก่อนครบกำหนดระยะเวลาตามสัญญาฉบับนี้ ให้ถือว่าผู้ขายฝากชำระหนี้ไม่ถูกต้องตามสัญญานี้ ผู้ขายฝากตกลงและยินยอมชำระค่าสินไถ่ให้แก่ผู้ซื้อฝากตามข้อ 3
        </p>
      )}

      {/* Section 3.2 - Extension */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>3.2</b> กรณีที่ผู้ขายฝากต้องการขยายการชำระระยะเวลาในการไถ่ได้ไปอีก 1 (หนึ่ง) ปี สามารถกระทำได้เมื่อผู้ขายฝากได้ชำระค่าสินไถ่ให้กับผู้ซื้อฝากไปแล้วไม่น้อยกว่าอัตราร้อยละ {F('extension_percentage', 80, '%')} ของมูลค่าสินไถ่ตามสัญญาฉบับนี้ ทั้งนี้ภายในการขยายระยะเวลาดังกล่าวนั้น ผู้ขายฝากตกลงชำระค่าสินไถ่ล่วงหน้าเป็นเงินจำนวน {F('extension_advance', 120)} บาท ({F('extension_advance_text', 150)}) ให้แก่ผู้ซื้อฝากในอัตราร้อยละ {F('extension_rate', 80, '%')} ของมูลค่าสินไถ่ ณ วันที่ผู้ซื้อฝากตกลงขยายระยะเวลา และผู้ขายฝากตกลงชำระค่าสินไถ่ที่เพิ่มเติมจากการขยายระยะเวลาไถ่ถอนในส่วนที่เหลือเป็นจำนวน {F('ext_installment_count', 40)} งวดๆ ละ {F('ext_installment_amount', 100)} บาท ({F('ext_installment_text', 150)}) ทุกวันที่ {F('ext_payment_day', 30)} ของทุกเดือน เป็นเงินจำนวนทั้งสิ้น {F('ext_total', 120)} บาท ({F('ext_total_text', 150)}) ให้แก่ผู้ซื้อฝากจนกว่าจะชำระครบถ้วน โดยผู้ซื้อฝากจะนำสินไถ่จำนวนดังกล่าวไปตัดชำระสินไถ่ในวันครบกำหนดไถ่ถอนตามกำหนดระยะเวลาที่ขยาย
      </p>

      {/* Section 4 - Damage/Deterioration */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 4.</b> เมื่อสัญญาฉบับนี้สิ้นสุดลงโดยตามกำหนดระยะเวลาที่ระบุไว้ในสัญญา และคู่สัญญาทั้งสองฝ่ายไม่ประสงค์ที่จะขยายระยะเวลาตามสัญญา หากปรากฏว่าที่ดินและสิ่งปลูกสร้างถูกทำลายหรือทำให้เสื่อมสภาพไปอันเกิดจากความผิดของผู้ขายฝากแล้ว ผู้ขายฝากจะถูกดำเนินคดีทั้งทางแพ่งและทางอาญา และต้องเป็นผู้รับผิดชอบค่าเสียหายอย่างใดๆ อันเกิดแต่การนั้นแต่เพียงผู้เดียว
      </p>

      {/* Section 5 - Registration */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 5.</b> คู่สัญญาทั้งสองฝ่ายตกลงจะไปดำเนินการจดทะเบียนขายฝากทรัพย์สินที่ขายฝาก ณ สำนักงานที่ดินซึ่งทรัพย์สินที่ขายฝากตั้งอยู่ในเขตอำนาจ ให้แล้วเสร็จภายในวันที่ {F('registration_deadline', 100)}
      </p>

      {/* Section 6 - Occupancy */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 6.</b> ผู้ซื้อฝากยินยอมให้ผู้ขายฝากอาศัยอยู่ในทรัพย์สินที่ขายฝากตามสัญญาฉบับนี้ โดยผู้ขายฝากมีหน้าที่และความรับผิดชอบในการดูแลรักษาทรัพย์สินที่ขายฝากไม่ให้เกิดความเสียหายตลอดระยะเวลาตามสัญญาฉบับนี้
      </p>

      {/* Section 7 - Data Disclosure */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 7.</b> ผู้ขายฝากทราบดีว่าผู้ซื้อฝากอาจเปิดเผยข้อมูลใด ๆ ที่ผู้ขายฝากได้ให้ไว้แก่ผู้ซื้อฝาก และ/หรือข้อมูลที่เกี่ยวข้องกับผู้ขายฝาก (ซึ่งไม่ใช้ข้อมูลที่ได้รับจากบริษัทข้อมูลเครดิต) เท่าที่จำเป็นต่อบริษัทในเครือของ "ผู้ให้กู้" รวมถึงกรรมการ และลูกจ้างของผู้ขายฝาก เพื่อวัตถุประสงค์ในการจัดเก็บข้อมูล บริหาร วิเคราะห์ ตรวจสอบ ทบทวน และป้องกันความเสี่ยงด้านสินเชื่อ ซึ่งเป็นการประมวลผลข้อมูลส่วนบุคคลบนฐานประโยชน์อันชอบธรรม
      </p>

      {/* เนื้อหาต่อเนื่อง */}

      {/* Section 8 - Notices */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 8.</b> บรรดาหนังสือ จดหมายติดต่อ คำบอกกล่าวใดๆ ที่ผู้ซื้อฝากได้ส่งให้ผู้ขายฝากตามที่อยู่ที่แจ้งไว้ตามสัญญาฉบับนี้ ไม่ว่าจะโดยส่งแนะ หรือส่งทางไปรษณีย์ลงทะเบียน หรือไม่ลงทะเบียน ให้ถือว่าได้ส่งให้แก่ผู้ขายฝากแล้วโดยชอบ ทั้งนี้ โดยไม่ต้องคำนึงถึงว่าจะมีผู้รับไว้หรือไม่ และแม้หากส่งให้ไม่ได้เพราะที่อยู่เปลี่ยนแปลงไป หรือถูกปิดอยู่ หรือคำบอกกล่าวดังกล่าวหรือจดหมายหรือคำบอกกล่าวจะส่งไม่ได้เพราะหาที่อยู่ตามที่ระบุไว้นี้ไม่พบก็ดี ให้ถือว่าผู้ขายฝากได้รับและทราบหนังสือ จดหมาย หรือคำบอกกล่าวดังกล่าวแล้วโดยชอบ ทั้งนี้ หากมีการเปลี่ยนแปลงที่อยู่ ผู้ขายฝากจะต้องแจ้งการเปลี่ยนแปลงให้ผู้ซื้อฝากทราบเป็นลายลักษณ์อักษรทันที
      </p>

      {/* Section 9 - Waiver */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 9.</b> การล่าช้าหรือการไม่ใช้สิทธิ์ใด ๆ ของผู้ซื้อฝากตามข้อกำหนดหรือเงื่อนไขใด ๆ ของสัญญานี้หรือตามกฎหมาย ไม่ถือว่าผู้ซื้อฝากสละสิทธิ์หรือให้ความยินยอมในการดำเนินการใด ๆ ตามที่ผู้ซื้อฝากมีสิทธิ์แต่เฉพาะสำหรับเหตุการณ์และวัตถุประสงค์นั้นเท่านั้น
      </p>

      {/* Section 10 - Severability */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 10.</b> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดหรือเงื่อนไขใด ในสัญญาฉบับนี้ไม่สมบูรณ์ หรือเป็นโมฆะ หรือขัดต่อกฎหมาย หรือไม่ชอบด้วยกฎหมาย หรือไม่ใช้บังคับตามกฎหมาย ให้ส่วนอื่นๆ ของข้อกำหนดและเงื่อนไขของสัญญาฉบับนี้ยังคงมีผลสมบูรณ์ ชอบด้วยกฎหมาย และใช้บังคับได้ตามกฎหมาย และไม่ถูกกระทบหรือเสียไปเพราะความไม่สมบูรณ์ เป็นโมฆะ ขัดต่อกฎหมาย ไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมายซึ่งข้อความข้อกำหนด หรือเงื่อนไขดังกล่าวนั้น
      </p>

      {/* Closing Statement */}
      <p style={{ ...S, fontSize: 'inherit', marginTop: 16 }}>
        สัญญานี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว เพื่อเป็นหลักฐาน คู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน ณ วันเดือนปีที่ระบุไว้ข้างต้น และต่างยึดถือไว้ฝ่ายละฉบับ
      </p>

      {/* Signatures */}
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ขายฝาก</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('seller_name', 150)} )</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ซื้อฝาก</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('buyer_name', 150)} )</div>
        </div>
      </div>

      {/* Witnesses */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('witness1', 150)} )</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('witness2', 150, 'นางสาว อารยา เพิ่มอุตส่าห์')} )</div>
        </div>
      </div>

    </>
  )

  const renderSpBroker = () => (
    <>
      <DocHeader />
      <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 12 }}>
        สัญญาแต่งตั้งนายหน้าขายฝาก
      </div>

      {/* Header - Company and Date */}
      <p style={{ ...S, textAlign: 'right', fontSize: 'inherit' }}>
        ทำที่ บริษัท โลนด์ ดีดี จำกัด 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510 วันที่ {F('contract_date', 150, 'วัน เดือน ปี')}
      </p>

      {/* Parties - Company (Broker) */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        ระหว่าง บริษัท โลนด์ ดีดี จำกัด ทะเบียนนิติบุคคลเลขที่ {F('company_id', 130, '0105566225836')} โดย นาย {F('company_officer', 120, 'วรวุฒิ กิตติอุดม')} กรรมการผู้มีอำนาจ สำนักงานตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร โทรศัพท์ {F('company_phone', 100, '081-6386966')} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"นายหน้า"</b> ฝ่ายหนึ่ง กับ
      </p>

      {/* Parties - Client (Property Owner) */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        นาย/นาง/นางสาว {F('seller_name', 150, 'ชื่อผู้ให้สัญญา')} เลขบัตรประชาชน {F('seller_id', 130)} ที่อยู่ตามบัตร {F('seller_address', 250)} เบอร์ {F('seller_phone', 100)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้ให้สัญญา"</b> รหัสทรัพย์ {F('property_code', 100)} อีกฝ่ายหนึ่ง
      </p>

      {/* Agreement intro */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญาแต่งตั้งนายหน้าขายฝาก ดังต่อไปนี้
      </p>

      {/* Section 1 - Property Details */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 1.</b> ผู้ให้สัญญาเป็นเจ้าของกรรมสิทธิ์ ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง เลขที่ {F('address_no', 80)} โฉนดเลขที่ {F('deed_no', 100)} เลขที่ดิน {F('land_no', 80)} หน้าสำรวจ {F('survey_page', 80)} ตำบล {F('tambon', 100)} อำเภอ {F('amphoe', 100)} จังหวัด {F('province', 100)} เนื้อที่รวม {F('land_area', 130, 'ไร่/งาน/ตร.วา')} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ทรัพย์สิน"</b> ผู้ให้สัญญาประสงค์จะขายฝากทรัพย์สินดังกล่าวกับบรรดาสิ่งปลูกสร้างหรือโรงเรือนหรืออาคารทั้งแบบถาวรและชั่วคราว รวมทั้งของตกแต่งต่าง ๆ ที่มีอยู่ในทรัพย์สินรายนี้ ในราคา {F('contract_amount', 130, 'จำนวนเงิน')} บาท ({F('contract_amount_text', 220, 'ตัวอักษร')})
      </p>

      {/* Section 2 - Broker Appointment */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 2.</b> ผู้ให้สัญญาแต่งตั้งให้นายหน้าเป็นผู้ติดต่อ จัดหา ซื้อขาย และจัดการให้ได้ทำสัญญากับนายทุนผู้ซื้อฝาก โดยหากผู้ให้สัญญาได้เข้าทำสัญญาขายฝากแล้ว จะดำเนินการสลามในเอกสารแนบท้ายต่อไป
      </p>

      {/* Section 3 - Payment Terms */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 3.</b> เมื่อนายทุนผู้ซื้อฝากเข้าทำสัญญาขายฝากที่สำนักงานที่ดินและได้รับชำระเงิน
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>3.1</b> ผู้ให้สัญญาตกลงชำระค่านายหน้าด้วยวิธีการโอนเงินไปยังบัญชีของนายหน้า ซึ่งมีรายละเอียดดังนี้:
      </p>

      <p style={{ ...S, textIndent: 60, fontSize: 'inherit' }}>
        • ชื่อธนาคาร: {F('bank_name', 120, 'ไทยพาณิชย์')}<br />
        • ชื่อบัญชี: {F('account_name', 200, 'บริษัท โลนด์ ดีดี จำกัด')}<br />
        • สาขา: {F('branch_name', 150, 'รามคำแหง (สัมมากร)')}<br />
        • หมายเลขบัญชี: {F('account_number', 150, '136-2707297')}
      </p>

      {/* Section 4 - Contract Duration */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 4.</b> สัญญาฉบับนี้มีกำหนดเวลา 1 (หนึ่ง) ปี นับแต่วันทำสัญญา
      </p>

      {/* Section 5 - Registration & Completion */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 5.</b> ผู้ให้สัญญาตกลงจะทำสัญญาขายฝากโดยจดทะเบียนฝากที่สำนักงานที่ดินภายใน 30 (สามสิบ) วัน นับจากวันทำสัญญา ทั้งนี้ ให้ถือว่านายหน้าได้ทำหน้าที่สมบูรณ์ตามสัญญาแล้วเมื่อพ้นกำหนดระยะเวลาดังกล่าว และยินยอมชำระค่านายหน้าตามข้อ 3
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.1</b> ค่าธรรมเนียมและค่าใช้จ่ายทั้งสิ้นในการจดทะเบียนขายฝาก ค่าไถ่ถอน ค่าภาษีที่ดินและสิ่งปลูกสร้าง ผู้ให้สัญญาจะเป็นผู้เสียเองทั้งสิ้น
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.2</b> ในกรณีแจ้งไถ่ถอน ผู้ให้สัญญาจะแจ้งให้นายหน้าทราบล่วงหน้าไม่ต่ำกว่า 15 (สิบห้า) วัน และมีค่าใช้จ่ายในการดำเนินการไถ่ถอนเป็นจำนวนเงิน {F('redemption_fee', 100, '5,000')} บาท ({F('redemption_fee_text', 150, 'ห้าพันบาท')})
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.3</b> ในกรณีที่ผู้ให้สัญญาไม่ทราบราคาประเมินทรัพย์สินและต้องการให้นายหน้าเป็นผู้ประเมินราคา ผู้ให้สัญญาตกลงชำระค่าประเมินจำนวน {F('appraisal_fee', 80)} บาท ({F('appraisal_fee_text', 150)})
      </p>

      {/* PAGE BREAK */}
      {/* เนื้อหาต่อเนื่อง */}

      {/* Section 6 - Exclusivity */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 6.</b> ในระหว่างที่สัญญานี้ยังมีผลบังคับใช้ ผู้ให้สัญญาตกลงว่าจะไม่ทำสัญญาแต่งตั้งนายหน้าหรือตัวแทนแต่เพียงผู้เดียวกับบุคคลหรือนิติบุคคลอื่นสำหรับการขายฝากทรัพย์สินดังกล่าว นอกจากนี้ ผู้ให้สัญญาตกลงว่าจะไม่ยกเลิกสัญญาฉบับนี้ก่อนครบกำหนดเวลา ในกรณีผิดสัญญา ผู้ให้สัญญาตกลงจะชำระค่านายหน้าตามข้อ 3
      </p>

      {/* Section 7 - Broker Compensation */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 7.</b> หากนายหน้าจัดหานายทุนผู้รับซื้อฝากได้แล้ว แต่ผู้ให้สัญญาปฏิเสธไม่ยอมทำสัญญา ผู้ให้สัญญาตกลงชำระค่านายหน้าอัตราร้อยละ 1 (หนึ่ง) ของวงเงินขายฝาก สำหรับวงเงินต่ำกว่า 1,000,000 บาท คิดอัตราค่านายหน้าขั้นต่ำ {F('min_broker_fee_low', 100, '10,000')} บาท สำหรับวงเงินเกินกว่า 1,000,000 บาท คิดอัตราค่านายหน้าร้อยละ 5 ขั้นต่ำ {F('min_broker_fee_high', 100, '50,000')} บาท
      </p>

      {/* Section 8 - Default Penalty */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 8.</b> ผู้ให้สัญญาตกลงและยินยอมรับผิดชอบ เมื่อผิดนัดชำระค่าสินไถ่เสียดอกเบี้ยผิดนัดร้อยละ 1 (หนึ่ง) ของวงเงินขายฝาก
      </p>

      {/* Section 9 - Data Disclosure */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 9.</b> ผู้ให้สัญญาตกลงและอนุญาตให้นายหน้าเปิดเผยข้อมูลใดๆ เท่าที่จำเป็นต่อวัตถุประสงค์เกี่ยวกับสัญญานี้
      </p>

      {/* Section 10 - Waiver */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 10.</b> การล่าช้าหรือการไม่ใช้สิทธิ์ใดๆ ของนายหน้า ไม่ถือว่านายหน้าสละสิทธิ์ดังกล่าว
      </p>

      {/* Section 11 - Severability */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 11.</b> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดใดไม่สมบูรณ์หรือเป็นโมฆะ ให้ส่วนอื่นๆ ยังคงมีผลบังคับใช้
      </p>

      {/* Section 12 - Post-Contract Dealings */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 12.</b> เมื่อสัญญาฉบับนี้สิ้นสุดลง หากนายหน้ายังไม่สามารถทำให้ได้เข้าทำสัญญากับนายทุนผู้ซื้อฝากได้ ผู้ให้สัญญาไม่ต้องเสียค่าใช้จ่าย เว้นแต่เป็นบุคคลหรือผู้ที่ได้รับการซื้อขายจากบุคคลที่นายหน้าเคยติดต่อแนะนำ
      </p>

      {/* Section 13 - Dispute Resolution */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 13.</b> ในกรณีมีข้อเรียกร้องหรือข้อพิพาทใดๆ คู่สัญญาตกลงให้จำนวนศาลยุติธรรม
      </p>

      {/* Section 14 - Rights Assignment */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 14.</b> ห้ามคู่สัญญาฝ่ายใดโอนสิทธิ์หรือหน้าที่ตามสัญญานี้ให้แก่บุคคลอื่น
      </p>

      {/* Closing Statement */}
      <p style={{ ...S, fontSize: 'inherit', marginTop: 16 }}>
        สัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว เพื่อเป็นหลักฐาน คู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน
      </p>

      {/* Signatures */}
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('seller_name', 150)} )</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................นายหน้า</div>
          <div style={{ marginTop: 8, fontSize: 'inherit' }}>บริษัท โลนด์ ดีดี จำกัด</div>
          <div style={{ marginTop: 8, fontSize: 'inherit' }}>นางสาว {F('broker_officer', 150, 'อารยา เพิ่มอุตส่าห์')}</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>เจ้าหน้าที่นิติกรรม</div>
        </div>
      </div>

      {/* Witnesses */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('witness1', 150, 'นางสาว พิสชา วงษา')} )</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('witness2', 150)} )</div>
        </div>
      </div>
    </>
  )

  const renderSpAppendix = () => (
    <>
      <DocHeader />
      <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 12 }}>
        เอกสารแนบท้ายสัญญาแต่งตั้งนายหน้าขายฝาก
      </div>

      {/* Header */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        สัญญาฉบับนี้ทำขึ้น ณ สำนักงาน โลนด์ ดีดี จำกัด ตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร เมื่อวันที่ {F('appendix_date', 150, 'วัน เดือน ปี')}
      </p>

      {/* Client Info */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        ตามที่ นาย/นาง/นางสาว {F('seller_name', 150)} เลขบัตรประชาชน {F('seller_id', 130)} ที่อยู่ตามบัตร {F('seller_address', 250)} เบอร์ {F('seller_phone', 100)} <b>"ผู้ให้สัญญา"</b>
      </p>

      {/* Main Contract Reference */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        ได้ตกลงทำสัญญาแต่งตั้งนายหน้าขายฝาก ฉบับลงวันที่ {F('main_contract_date', 150)} กับ บริษัท โลนด์ ดีดี จำกัด <b>"นายหน้า"</b> ทะเบียนนิติบุคคลเลขที่ {F('company_id', 130, '0105566225836')} โดย นาย {F('company_officer', 120, 'วรวุฒิ กิตติอุดม')} กรรมการผู้มีอำนาจ สำนักงานตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร โทรศัพท์ {F('company_phone', 100, '081-6386966')}
      </p>

      {/* Property Transaction */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        บัดนี้ ร้านเจ้าผู้ให้สัญญาได้เข้าทำสัญญากับนายทุนผู้รับซื้อฝาก <b>{F('property_type_full', 180, 'ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง')}</b>
      </p>

      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        เลขที่ {F('address_no', 80)} โฉนดเลขที่ {F('deed_no', 100)} เลขที่ดิน {F('land_no', 80)} หน้าสำรวจ {F('survey_page', 80)} ตำบล {F('tambon', 100)} อำเภอ {F('amphoe', 100)} จังหวัด {F('province', 100)} เนื้อที่รวม {F('land_area', 130, 'ไร่/งาน/ตร.วา')} กำหนดเวลาไถ่คืนภายใน 1 ปี และกำหนดสินไถ่เป็นเงิน {F('redemption_price', 130)} บาท ({F('redemption_price_text', 220)}) และมีค่าบริการเพิ่มเติมจำนวน {F('additional_fee', 100)}
      </p>

      {/* Registration */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        โดยได้จดทะเบียนกับกรมที่ดินแล้วเมื่อวันที่ {F('registration_date', 150)}
      </p>

      {/* Closing */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        ดังนั้น ผู้ให้สัญญาจึงได้ลงนามเอกสารแนบท้ายสัญญาแต่งตั้งนายหน้าขายฝากฉบับนี้ เพื่อให้เป็นไปตามเงื่อนไขของสัญญาแต่งตั้งนายหน้าขายฝากฉบับวันที่ {F('original_contract_date', 150)}
      </p>

      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        สัญญาฉบับนี้ถือเป็นส่วนหนึ่งของสัญญาแต่งตั้งนายหน้าขายฝาก คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว จึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน และต่างยึดถือไว้ฝ่ายละฉบับ
      </p>

      {/* Signatures */}
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('seller_name', 150)} )</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................นายหน้า</div>
          <div style={{ marginTop: 8, fontSize: 'inherit' }}>บริษัท โลนด์ ดีดี จำกัด</div>
          <div style={{ marginTop: 8, fontSize: 'inherit' }}>นางสาว {F('broker_officer', 150, 'อารยา เพิ่มอุตส่าห์')}</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>เจ้าหน้าที่นิติกรรม</div>
        </div>
      </div>
    </>
  )

  const renderSpNotice = () => (
    <>
      <DocHeader />
      <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 12 }}>
        หนังสือแจ้งเตือนเรื่องครบกำหนดไถ่ถอน
      </div>

      {/* Header Info */}
      <p style={{ ...S, textAlign: 'right', fontSize: 'inherit' }}>
        ฉบับที่ {F('notice_number', 60, 'เลขที่')}/2568<br />
        วันที่ {F('notice_date', 150, 'วัน เดือน ปี')}
      </p>

      {/* Recipient */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        เรียน: นาย/นาง/นางสาว/บจก./หจก. {F('seller_name', 200)}
      </p>

      {/* Subject */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>เรื่อง:</b> แจ้งเตือนครบกำหนดไถ่ถอนทรัพย์สิน
      </p>

      {/* Reference */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>อ้างอิง:</b> หนังสือสัญญาขายฝาก ณ สำนักงานที่ดินจังหวัด {F('province', 100)}
      </p>

      {/* Property Details */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        ตามที่ท่านได้ทำสัญญาขายฝากกับ นาย/นาง/นางสาว/บจก./หจก. {F('buyer_name', 200, 'บริษัท โลนด์ ดีดี จำกัด')} โดยมีรายละเอียดของทรัพย์สินดังนี้:
      </p>

      <p style={{ ...S, textIndent: 60, fontSize: 'inherit' }}>
        • ประเภททรัพย์: {F('property_type_full', 180, 'ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง')}<br />
        • ที่ตั้ง: เลขที่ {F('address_no', 80)}<br />
        • โฉนดเลขที่ {F('deed_no', 100)}<br />
        • เลขที่ดิน {F('land_no', 80)}<br />
        • หน้าสำรวจ {F('survey_page', 80)}<br />
        • ตำบล {F('tambon', 100)}<br />
        • อำเภอ {F('amphoe', 100)}<br />
        • จังหวัด {F('province', 100)}<br />
        • เนื้อที่ {F('land_area', 130, 'ไร่/งาน/ตร.วา/ตร.ม.')}
      </p>

      {/* Redemption Details */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        กำหนดวันไถ่ถอน {F('final_redemption_date', 150, 'วัน เดือน ปี')}
      </p>

      <p style={{ ...S, fontSize: 'inherit' }}>
        ยอดไถ่ถอน {F('redemption_price', 130)} บาท ({F('redemption_price_text', 220)})
      </p>

      {/* Disclaimer */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>หมายเหตุ:</b> นาย/นาง/นางสาว/บจก./หจก. {F('seller_name', 200)} ได้มอบอำนาจให้ บริษัท โลนด์ ดีดี จำกัด ดำเนินการแจ้งเตือนถึงกำหนดเวลาและจำนวนเงินที่ต้องชำระตามกฎหมาย
      </p>

      {/* Contact Info */}
      <p style={{ ...S, fontSize: 'inherit', marginTop: 20 }}>
        หากท่านมีข้อสงสัยหรือต้องการข้อมูลเพิ่มเติม กรุณาติดต่อกลับมาภายในเวลาทำการ วันจันทร์-ศุกร์ เวลา 08.30 – 17.30 น. ที่หมายเลขโทรศัพท์ {F('company_phone', 100, '081-638-6966')}
      </p>

      {/* Closing */}
      <p style={{ ...S, fontSize: 'inherit', marginTop: 28 }}>
        ขอแสดงความนับถือ
      </p>

      {/* Signature */}
      <div style={{ marginTop: 36, textAlign: 'center' }}>
        <div style={{ fontSize: 'inherit' }}>...............................................</div>
        <div style={{ marginTop: 8, fontSize: 'inherit' }}>( นางสาว {F('officer_name', 150, 'พิสชา วงษา')} )</div>
        <div style={{ marginTop: 4, fontSize: 'inherit' }}>เจ้าหน้าที่ บริษัท โลนด์ ดีดี จำกัด</div>
      </div>

    </>
  )

  const renderMgLoan = () => (
    <>
      {/* PAGE 1 */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 'bold' }}>สัญญากู้ยืมเงิน</div>
      </div>

      {/* Header Section */}
      <p style={{ ...S, textAlign: 'center', fontSize: 'inherit' }}>
        สัญญาเลขที่{F('contract_number', 80)}/2568
      </p>

      <p style={{ ...S, textAlign: 'center', fontSize: 'inherit' }}>
        ทำที่ บริษัท โลนด์ ดีดี จำกัด 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510
      </p>

      <p style={{ ...S, textAlign: 'center', fontSize: 'inherit' }}>
        วันที่{F('contract_date', 80)}
      </p>

      {/* Parties — version-conditional */}
      {/* ผู้ให้กู้: Ver.1-3 = individual, Ver.4 = company */}
      {selectedVersion === 4 ? (
        <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
          สัญญาฉบับนี้ทำขึ้น ระหว่าง บจก./หจก. {F('lender_company', 200)} ทะเบียนนิติบุคคลเลขที่ {F('lender_reg_id', 130)} โดย {F('lender_first_name', 120)} กรรมการผู้มีอำนาจ ที่อยู่บริษัท {F('lender_address', 200)} เบอร์ {F('lender_phone', 80)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้ให้กู้"</b> ฝ่ายหนึ่ง กับ
        </p>
      ) : (
        <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
          สัญญาฉบับนี้ทำขึ้น ระหว่าง นาย/นาง/นางสาว {F('lender_first_name', 150)} เลขบัตรประชาชน {F('lender_id', 130)} ที่อยู่ตามบัตร {F('lender_address', 220)} เบอร์ {F('lender_phone', 80)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้ให้กู้"</b> ฝ่ายหนึ่ง กับ
        </p>
      )}

      {/* ผู้กู้: Ver.1 = individual, Ver.2 = two individuals, Ver.3 = company, Ver.4 = individual */}
      {selectedVersion === 2 ? (
        <>
          <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
            นาย/นาง/นางสาว {F('borrower_name', 150)} เลขบัตรประชาชน {F('borrower_id', 100)} ที่อยู่ตามบัตร {F('borrower_address', 220)}
          </p>
          <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
            และ นาย/นาง/นางสาว {F('borrower_name2', 150)} เลขบัตรประชาชน {F('borrower_id2', 100)} ที่อยู่ตามบัตร {F('borrower_address2', 220)} เบอร์ {F('borrower_phone', 80)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้กู้"</b> อีกฝ่ายหนึ่ง
          </p>
        </>
      ) : selectedVersion === 3 ? (
        <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
          บจก./หจก. {F('borrower_company', 200)} ทะเบียนนิติบุคคลเลขที่ {F('borrower_reg_id', 130)} โดย {F('borrower_name', 120)} กรรมการผู้มีอำนาจ ที่อยู่บริษัท {F('borrower_address', 200)} เบอร์ {F('borrower_phone', 80)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้กู้"</b> อีกฝ่ายหนึ่ง
        </p>
      ) : (
        <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
          นาย/นาง/นางสาว {F('borrower_name', 150)} เลขบัตรประชาชน {F('borrower_id', 100)} ที่อยู่ตามบัตร {F('borrower_address', 220)} เบอร์ {F('borrower_phone', 80)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้กู้"</b> อีกฝ่ายหนึ่ง
        </p>
      )}

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญากันมีข้อความดังต่อไปนี้
      </p>

      {/* Section 1 - Loan Amount */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 1.</b> "ผู้ให้กู้" ตกลงให้กู้และ "ผู้กู้" ได้ตกลงกู้ยืมเงินจาก "ผู้ให้กู้" เป็นเงินจำนวน {F('loan_amount', 120)} บาท ({F('loan_amount_text', 180)}) ซึ่งต่อไปในสัญญานี้จะเรียกว่า "เงินสินเชื่อ"
      </p>

      {/* Section 2 - Mortgage and Property Details */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 2.</b> "ผู้กู้" ตกลงให้ "ผู้ให้กู้" ส่งมอบเงินสินเชื่อให้แก่ "ผู้กู้" เมื่อได้จดทะเบียนจำนอง <b>{F('property_type_full', 120)}</b> เลขที่{F('address_no', 80)} โฉนดเลขที่{F('deed_no', 80)} เลขที่ดิน {F('land_no', 60)} หน้าสำรวจ {F('survey_page', 60)} ตำบล {F('tambon', 80)} อำเภอ {F('amphoe', 80)} จังหวัด {F('province', 100)} เนื้อที่รวม {F('land_area', 100)} เรียกว่าชื่อแล้ว เว้นแต่จะได้รับความยินยอมจาก "ผู้ให้กู้" เป็นอย่างอื่น
      </p>

      {/* Section 2.1 - Security */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>2.1</b> "ผู้กู้" ตกลงและยินยอมให้บรรดาทรัพย์สินที่ "ผู้กู้" ได้มอบไว้เป็นหลักประกันตามที่ระบุข้างต้นนั้น ให้ถือเป็นหลักประกันหนี้ และ/หรือภาระใด ๆ ทั้งหมดของ "ผู้กู้" ที่มีต่อ "ผู้ให้กู้" ทั้งที่มีอยู่แล้วในขณะนี้ และ/หรือจะมีต่อเป็นภายหน้า
      </p>

      {/* Section 2.2 - Insurance */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>2.2</b> "ผู้กู้" ตกลงและยินยอมทำประกันภัยทรัพย์สินตามที่ระบุข้างต้นไว้กับบริษัทประกันภัยที่ "ผู้ให้กู้" เห็นชอบ ในวงเงินไม่น้อยกว่าราคาประเมินตลาดตามเล่มประเมิน หรือมูลค่าของสิ่งปลูกสร้างไม่รวมที่ดินตามสัญญาฉบับนี้ โดยให้ "ผู้ให้กู้" เป็นผู้รับประโยชน์ตามกรมธรรม์ และ "ผู้กู้" ตกลงจะทำประกันภัยให้เสร็จสิ้นภายใน 15 วัน นับจากวันที่รับมอบเงินสินเชื่อตามสัญญาฉบับนี้หรือภายในเวลาที่ "ผู้ให้กู้" เห็นสมควรกำหนด โดย "ผู้กู้" เป็นผู้ชำระเบี้ยประกันภัยและเสียค่าใช้จ่ายเพื่อการประกันภัยเองทั้งสิ้น และ "ผู้กู้" จะต่อสัญญาประกันภัยตลอดระยะเวลาที่ "ผู้กู้" เป็นหนี้ "ผู้ให้กู้" หาก "ผู้กู้" ไม่ทำประกันภัยหรือไม่ต่ออายุสัญญาประกันภัย "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" เป็นผู้ดำเนินการแทน โดยค่าใช้จ่ายเป็นของ "ผู้กู้" เอง
      </p>

      {/* Section 2.3 - Property Value Protection */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>2.3</b> "ผู้กู้" จะไม่ทำให้ทรัพย์สินตามที่ระบุข้างต้นมีมูลค่าลดลงหรือเสื่อมราคาหรือจะไม่จำนองต่อไปอีกหรือจะไม่ทำให้เกิดบุริมสิทธิหรือภาระติดพันขึ้นบนทรัพย์สินดังกล่าว เว้นแต่จะได้รับความยินยอมเป็นลายลักษณ์อักษรจาก "ผู้ให้กู้" ก่อน
      </p>

      {/* Section 2.4 - Foreclosure */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>2.4</b> ในกรณีที่ "ผู้ให้กู้" ได้ใช้สิทธิบังคับจำนองเอาจากทรัพย์สินตามที่ระบุข้างต้นได้เงินสุทธิจากการขายทอดตลาดไม่เพียงพอชำระหนี้ให้แก่ "ผู้ให้กู้" "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" บังคับชำระหนี้จากทรัพย์สินอื่นๆ ของ "ผู้กู้" จนกว่าจะได้รับชำระหนี้ครบถ้วน
      </p>

      {/* Section 2.5 - Inspection and Appraisal */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>2.5</b> "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" หรือตัวแทนของ "ผู้ให้กู้" หรือผู้ที่ได้รับมอบหมายจาก "ผู้ให้กู้" ดำเนินการสำรวจและประเมินราคาทรัพย์สินตามที่ระบุข้างต้นโดย "ผู้ให้กู้" จะทำการสำรวจในระยะเวลาตามแต่ "ผู้ให้กู้" จะเห็นสมควร โดย "ผู้กู้" ตกลงจะให้ความร่วมมือและอำนวยความสะดวกแก่พนักงานเจ้าหน้าที่ของ "ผู้ให้กู้" หรือตัวแทนจาก "ผู้ให้กู้" หรือผู้ที่ได้รับมอบหมายจากผู้ให้กู้ให้เข้าไปในสถานที่ซึ่งเป็นหลักประกันดังกล่าวเพื่อการสำรวจและประเมินราคาโดยจะมีการแจ้งให้ทราบล่วงหน้าและการดำเนินการดังกล่าวจะกระทำในระหว่างพระอาทิตย์ขึ้นถึงพระอาทิตย์ตก เว้นแต่เป็นการดำเนินการที่ต่อเนื่อง และหาก "ผู้ให้กู้" พบว่าหลักประกันดังกล่าวมีมูลค่าลดน้อยถอยลงเกินกว่าร้อยละ 10 ของมูลค่าหลักประกัน "ผู้ให้กู้" สงวนสิทธิที่จะเรียกให้ "ผู้กู้" จัดหาหลักประกันอื่นมาทดแทน โดย "ผู้กู้" ยินยอมชำระค่าธรรมเนียมและค่าใช้จ่ายทั้งปวงในการสำรวจและประเมินราคา
      </p>

      {/* Section 2.6 - Mortgage Costs and Expenses */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>2.6</b> "ผู้กู้" ตกลงและยินยอมรับผิดชอบชำระค่าใช้จ่าย ค่าธรรมเนียม ค่าภาษีและค่าอากรแสตมป์ที่เกี่ยวข้องในการจดทะเบียนจำนองเป็นประกันรวมถึงการจดทะเบียนไถ่ถอนเองทั้งสิ้น
      </p>

      {/* PAGE BREAK */}
      {/* เนื้อหาต่อเนื่อง */}

      {/* PAGE 2 */}
      {/* Section 3 - Interest Rate */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 3.</b> "ผู้กู้" ตกลงชำระดอกเบี้ยในต้นเงินที่กู้ในอัตราร้อยละ {F('interest_per_year', 60)} ({F('interest_per_year_text', 100)}) ต่อปี ทั้งนี้ "ผู้กู้" ตกลงและยินยอมให้ "ผู้ให้กู้" คิดดอกเบี้ยตามจำนวนวันที่ผ่านไปจริง โดยนับตั้งแต่วันที่ "ผู้กู้" ได้รับหรือถือว่าได้รับเงินสินเชื่อจาก "ผู้ให้กู้" จนกว่าจะชำระหนี้ครบถ้วน
      </p>

      {/* Section 4 - Repayment */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 4.</b> "ผู้กู้" ตกลงจะชำระคืนต้นเงินสินเชื่อให้แก่ "ผู้ให้กู้" เมื่อครบกำหนดระยะเวลา {F('loan_term', 60)} ({F('loan_term_text', 100)}) เดือน นับแต่วันที่ "ผู้กู้" ได้รับหรือถือว่าได้รับเงินสินเชื่อจาก "ผู้ให้กู้" ทั้งนี้ "ผู้กู้" ตกลงและยินยอมชำระดอกเบี้ยล่วงหน้า โดยหักดอกเบี้ยคิดเป็นระยะเวลา {F('advance_interest_months', 50)} ({F('advance_interest_text', 80)}) เดือนของสินเชื่อออกจากต้นเงินในวันที่ "ผู้กู้" ได้รับ
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        ในกรณีที่ "ผู้กู้" ต้องการขอขยายระยะเวลาชำระคืนเงินสินเชื่อ "ผู้กู้" ตกลงชำระดอกเบี้ยล่วงหน้าตามระยะเวลาที่ขอขยายในวันที่ครบกำหนดชำระคืน หาก "ผู้กู้" ผ่านไม่ชำระดอกเบี้ยล่วงหน้าตามข้อตกลงนี้ ให้ถือว่า "ผู้กู้" ผิดนัดชำระหนี้และ "ผู้ให้กู้" จะดำเนินคดีตามกฎหมายต่อไป
      </p>

      {/* Section 5 - Default and Penalties */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 5.</b> หากเกิดเหตุการณ์เกิดเหตุอันผิดนัด ดังจะกล่าวต่อไปนี้ "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" มีสิทธิ์จะถือว่าเป็นกรณี "ผู้กู้" ผิดนัดชำระหนี้ และให้ถือว่าหนี้ตามสัญญานี้ถึงกำหนดชำระทันที "ผู้ให้กู้" คิดดอกเบี้ยจากเงินที่ค้างชำระทั้งหมดใน อัตราร้อยละ 20 (ยี่สิบ) ต่อปี นับแต่วันที่ "ผู้กู้" ตกเป็นผู้ผิดนัดชำระหนึ่งรายการขึ้นไป พร้อมด้วยค่าเสียหายและค่าใช้จ่ายทั้งหลายอันเนื่องจากการผิดนัดชำระหนี้ของ "ผู้กู้" รวมทั้งค่าใช้จ่ายในการเดือน เรียกร้อง ทวงถาม ดำเนินคดี และบังคับชำระหนึ่งเสร็จ ในกรณีดังต่อไปนี้
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.1</b> "ผู้กู้" ผิดนัดชำระเงินจำนวนใด ๆ ที่ถึงกำหนดชำระตามสัญญาให้สินเชื่อนี้
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.2</b> "ผู้กู้" ผิดนัดหรือผิดสัญญาอื่นใดที่ทำไว้กับ "ผู้ให้กู้"
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.3</b> "ผู้กู้" ไม่ปฏิบัติตามสัญญาฉบับนี้ ไม่ว่าจะทั้งหนึ่งข้อใดทั้งหมดทั้งสิ้นก่อนก็ดีภายหลังก็ดี ที่ "ผู้กู้" ให้ไว้ตามสัญญานี้เป็นคำรับรองหรือคำยืนยันที่ไม่เป็นความจริง ไม่เป็นความจริง ไม่ถูกต้อง หรืออาจจะก่อให้เกิดความเข้าใจผิดในสาระสำคัญ
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.4</b> "ผู้ให้กู้" ได้ทีจะบาลแล้วพบว่ามีการเปลี่ยนแปลงทางฐานะการเงินหรือรายได้ของ "ผู้กู้" ซึ่งเป็นสาระสำคัญอันมีผลกระทบต่อความสามารถในการชำระหนี้ของ "ผู้กู้"
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.5</b> "ผู้กู้" เสียชีวิต หรือถอกเป็นผู้ไร้ความสามารถ หรือเป็นบุคคลผู้หนี้สินล้นพ้นตัว หรือถูกอายัดทรัพย์ หรือทำการโอนสิทธิ์เพื่อประโยชน์ของเจ้าหนี้ของตน หรือมีการดำเนินคดีใด ๆ หรือมีการเขย้าออกคำสั่งอย่างใดๆ เพื่อการล้มละลาย การปรับปรุงโครงสร้างหนี้ใหม่
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.6</b> เจ้าของหลักประกันที่ให้ไว้เป็นประกันการชำระหนี้ตามสัญญานี้ ขอถอนหลักประกัน หรือปฏิบัติผิดสัญญา หลักประกันที่ให้ไว้ไม่เป็นประกัน ถูกบังคับหลักประกันที่ถูกอายัดและหรือ/อายัด ไม่ว่าตามกฎหมายล้มละลาย หรือกฎหมายอื่นใดก็ตาม
      </p>

      {/* Section 6 - Legal Action */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 6.</b> กรณีที่ "ผู้กู้" ผิดนัดชำระหนี้สินกู้ หรือตกลงเนื่องจากการผิดนัดชำระหนี้สินกู้เกินกว่า 30 วัน "ผู้ให้กู้" มีสิทธิ์จะถือว่าเป็นกรณี "ผู้กู้" ขอสงวนสิทธิ์ในการดำเนินคดีตามกฎหมาย และฟ้องร้องคดีต่อศาลได้ทันที
      </p>

      {/* Section 7 - Right Assignment */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 7.</b> "ผู้กู้" ยินยอมให้ "ผู้ให้กู้" โอนสิทธิตามสัญญานี้ไม่ว่าทั้งหมด หรือแต่เพียงบางส่วนให้แก่บุคคลหรือนิติบุคคลอื่นได้ โดยส่งคำบอกกล่าวเป็นลายลักษณ์อักษรให้ "ผู้กู้" ทราบล่วงหน้าไม่น้อยกว่า 30 (สามสิบ) วัน แต่ "ผู้กู้" ไม่มีสิทธิ์โอนสิทธิ์และหน้าที่ตามสัญญาให้สินเชื่อไม่ว่าทั้งหมดหรือบางส่วนให้แก่บุคคลหรือนิติบุคคลอื่นได้
      </p>

      {/* Section 8 - Data Disclosure */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 8.</b> "ผู้กู้" ทราบดีว่า "ผู้ให้กู้" อาจเปิดเผยข้อมูลใด ๆ ที่ "ผู้กู้" ได้ให้ไว้แก่ "ผู้ให้กู้" และ/หรือข้อมูลที่เกี่ยวข้องกับ "ผู้กู้" (ซึ่งไม่ใช่ข้อมูลที่ได้รับจากบริษัทข้อมูลเครดิต) เท่าที่จำเป็นต่อบริษัทในเครือของ "ผู้ให้กู้" รวมถึงกรรมการ และลูกจ้างของ "ผู้ให้กู้"
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        เพื่อวัตถุประสงค์ ในการจัดเก็บข้อมูล บริหาร วิเคราะห์ ตรวจสอบ ทบทวน และป้องกันความเสี่ยงด้านสินเชื่อ ซึ่งเป็นการประมวลผลข้อมูลส่วนบุคคลบนฐานประโยชน์อันชอบธรรม
      </p>

      {/* PAGE BREAK */}
      {/* เนื้อหาต่อเนื่อง */}

      {/* PAGE 3 */}
      {/* Section 9 - Notice */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 9.</b> บรรดาหนังสือ จดหมายติดต่อ คำบอกกล่าวใดๆ ที่ "ผู้ให้กู้" ได้ส่งให้ "ผู้กู้" ตามที่อยู่ที่แจ้งไว้ตามสัญญาฉบับนี้ ไม่ว่าจะโดยส่งเนะ หรือส่งทางไปรษณีย์ลงทะเบียนหรือไม่ลงทะเบียน ให้ถือว่าได้ส่งให้แล้วโดยชอบ ทั้งนี้ โดยไม่ต้องคำนึงว่าจะมีผู้รับไว้หรือไม่ และแม้หากส่งให้ไม่ได้เพราะที่อยู่เปลี่ยนแปลงไป หรือถูกปิดอยู่ หรือคำบอกกล่าวดังกล่าวหรือจดหมายหรือคำบอกกล่าวจะส่งไม่ได้เพราะหาที่อยู่ตามที่ระบุไว้นี้ไม่พบก็ดี ให้ถือว่า "ผู้กู้" ได้รับและทราบหนังสือ จดหมาย หรือคำบอกกล่าวดังกล่าวแล้วโดยชอบ ทั้งนี้ หากมีการเปลี่ยนแปลงที่อยู่ "ผู้กู้" จะต้องแจ้งการเปลี่ยนแปลงให้ "ผู้ให้กู้" ทราบเป็นลายลักษณ์อักษรทันที
      </p>

      {/* Section 10 - Waiver */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 10.</b> การล่าช้าหรือการไม่ใช้สิทธิ์ใด ๆ ของ "ผู้ให้กู้" ตามข้อกำหนดหรือเงื่อนไขใด ๆ ของสัญญานี้หรือตามกฎหมาย ไม่ถือว่า "ผู้ให้กู้" สละสิทธิ์หรือให้ความยินยอมในการดำเนินการใด ๆ ตามที่ "ผู้ให้กู้" มีสิทธิ์แก่ "ผู้กู้" แต่ประการใด เว้นแต่ "ผู้ให้กู้" จะได้ทำเป็นหนังสืออย่างชัดแจ้งและการสละสิทธิเช่นว่านั้นให้มีผลเฉพาะสำหรับเหตุการณ์และวัตถุประสงค์นั้นเท่านั้น
      </p>

      {/* Section 11 - Severability */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 11.</b> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดหรือเงื่อนไขใด ในสัญญาฉบับนี้ไม่สมบูรณ์ หรือเป็นโมฆะ หรือขัดต่อกฎหมาย หรือไม่ชอบด้วยกฎหมาย หรือไม่ใช้บังคับตามกฎหมาย ให้ส่วนอื่นๆ ของข้อกำหนดและเงื่อนไขของสัญญาฉบับนี้ยังคงมีผลสมบูรณ์ ชอบด้วยกฎหมาย และใช้บังคับได้ตามกฎหมาย และไม่ถูกกระทบหรือเสียไปเพราะความไม่สมบูรณ์ เป็นโมฆะ ขัดต่อกฎหมาย ไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมายซึ่งข้อความข้อกำหนด หรือเงื่อนไขดังกล่าวนั้น
      </p>

      {/* Closing Statement */}
      <p style={{ ...S, fontSize: 'inherit', marginTop: 16 }}>
        สัญญานี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว เพื่อเป็นหลักฐาน คู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน ณ วันเดือนปีที่ระบุไว้ข้างต้น และต่างยึดถือไว้ฝ่ายละฉบับ
      </p>

      {/* Signatures — version-conditional */}
      {selectedVersion === 2 ? (
        /* Ver.2: ผู้กู้(1) + ผู้กู้(2) left | ผู้ให้กู้ individual right */
        <>
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้กู้</div>
              <div style={{ marginTop: 24, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
              <div style={{ marginTop: 24, fontSize: 'inherit' }}>ลงชื่อ......................................ผู้กู้</div>
              <div style={{ marginTop: 24, fontSize: 'inherit' }}>( {F('borrower_name2', 150)} )</div>
            </div>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้กู้</div>
              <div style={{ marginTop: 24, fontSize: 'inherit' }}>( {F('lender_first_name', 150)} )</div>
            </div>
          </div>
        </>
      ) : selectedVersion === 3 ? (
        /* Ver.3: ผู้กู้ บจก. left | ผู้ให้กู้ individual right */
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้กู้</div>
            <div style={{ marginTop: 12, fontSize: 'inherit' }}>บจก./หจก. {F('borrower_company', 150)}</div>
            <div style={{ marginTop: 8, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
          </div>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้กู้</div>
            <div style={{ marginTop: 24, fontSize: 'inherit' }}>( {F('lender_first_name', 150)} )</div>
          </div>
        </div>
      ) : selectedVersion === 4 ? (
        /* Ver.4: ผู้กู้ individual left | ผู้ให้กู้ บจก. right */
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้กู้</div>
            <div style={{ marginTop: 24, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
          </div>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้กู้</div>
            <div style={{ marginTop: 12, fontSize: 'inherit' }}>บจก./หจก. {F('lender_company', 150)}</div>
            <div style={{ marginTop: 8, fontSize: 'inherit' }}>( {F('lender_first_name', 150)} )</div>
          </div>
        </div>
      ) : (
        /* Ver.1: ผู้กู้ individual left | ผู้ให้กู้ individual right */
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้กู้</div>
            <div style={{ marginTop: 24, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
          </div>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้กู้</div>
            <div style={{ marginTop: 24, fontSize: 'inherit' }}>( {F('lender_first_name', 150)} )</div>
          </div>
        </div>
      )}

      {/* Witnesses */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 24, fontSize: 'inherit' }}>( {F('witness1', 150)} )</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 24, fontSize: 'inherit' }}>( {F('witness2', 150, 'นางสาว อารยา เพิ่มอุตส่าห์')} )</div>
        </div>
      </div>
    </>
  )

  const renderMgAddendum = () => (
    <>
      <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 12 }}>
        สัญญาต่อท้ายสัญญาจำนอง
      </div>

      {/* Header - Company and Date */}
      <p style={{ ...S, textAlign: 'right', fontSize: 'inherit' }}>
        ทำที่ บริษัท โลนด์ ดีดี จำกัด 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510 วันที่ {F('contract_date', 150, 'วัน เดือน ปี')}
      </p>

      {/* Parties - ผู้รับจำนอง (individual, all versions) */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        ระหว่าง นาย/นาง/นางสาว {F('lender_first_name', 150, 'ชื่อผู้รับจำนอง')} เลขบัตรประชาชน {F('lender_id', 130)} ที่อยู่ตามบัตร {F('lender_address', 220)} เบอร์ {F('lender_phone', 100)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้รับจำนอง"</b> ฝ่ายหนึ่ง กับ
      </p>

      {/* Parties - ผู้จำนอง — version-conditional */}
      {selectedVersion === 3 ? (
        <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
          บจก./หจก. {F('borrower_company', 200)} ทะเบียนนิติบุคคลเลขที่ {F('borrower_reg_id', 130)} โดย {F('borrower_name', 120)} กรรมการผู้มีอำนาจ ที่อยู่บริษัท {F('borrower_address', 200)} เบอร์ {F('borrower_phone', 100)} <b>"ผู้จำนอง"</b> รหัสทรัพย์ {F('property_code', 100)}
        </p>
      ) : selectedVersion === 2 ? (
        <>
          <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
            นาย/นาง/นางสาว {F('borrower_name', 150, 'ชื่อผู้จำนอง')} เลขบัตรประชาชน {F('borrower_id', 130)} ที่อยู่ตามบัตร {F('borrower_address', 220)}
          </p>
          <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
            และ นาย/นาง/นางสาว {F('borrower_name2', 150)} เลขบัตรประชาชน {F('borrower_id2', 130)} ที่อยู่ตามบัตร {F('borrower_address2', 220)} เบอร์ {F('borrower_phone', 100)} <b>"ผู้จำนอง"</b> รหัสทรัพย์ {F('property_code', 100)}
          </p>
        </>
      ) : (
        <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
          นาย/นาง/นางสาว {F('borrower_name', 150, 'ชื่อผู้จำนอง')} เลขบัตรประชาชน {F('borrower_id', 130)} ที่อยู่ตามบัตร {F('borrower_address', 220)} เบอร์ {F('borrower_phone', 100)} <b>"ผู้จำนอง"</b> รหัสทรัพย์ {F('property_code', 100)}
        </p>
      )}

      {/* Agreement intro */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญาต่อท้ายสัญญาจำนอง ดังต่อไปนี้
      </p>

      {/* Section 1 - Property Details */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 1.</b> "ผู้จำนอง" เป็นเจ้าของกรรมสิทธิ์ ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง {F('property_type_full', 120)} เลขที่ {F('address_no', 80)} โฉนดเลขที่ {F('deed_no', 100)} เลขที่ดิน {F('land_no', 60)} หน้าสำรวจ {F('survey_page', 60)} ตำบล {F('tambon', 100)} อำเภอ {F('amphoe', 100)} จังหวัด {F('province', 100)} เนื้อที่รวม {F('land_area', 130, 'ไร่/งาน/ตร.วา')} ได้ตกลงจำนองกรรมสิทธิ์ในทรัพย์สินนี้กับบรรดาสิ่งปลูกสร้างต่าง ๆ ที่มีอยู่แล้วในที่ดินรายนี้ในขณะนี้หรือที่จะได้มีขึ้นต่อไปในภายหน้าในที่ดินรายนี้ทั้งสิ้นไว้แก่ <b>"ผู้รับจำนอง"</b> เพื่อเป็นประกันหนี้สินของ {selectedVersion === 3 ? <>บจก./หจก. {F('borrower_company', 150)}</> : <>นาย/นาง/นางสาว {F('borrower_name', 150)}</>} ในฐานะลูกหนี้ของ <b>"ผู้รับจำนอง"</b> ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ลูกหนี้"</b> จำนวนเงินไม่เกิน {F('loan_amount', 120)} บาท
      </p>

      {/* Section 2 - Loan Terms */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 2.</b> ลูกหนี้ตกลงจำนองทรัพย์ที่ระบุข้างต้นไว้เป็นประกันหนี้ กับทั้งค่าอุปกรณ์ ดอกเบี้ย ค่าสินไหมทดแทนในการไม่ชำระหนี้ ค่าฤชาธรรมเนียมในการบังคับจำนอง ในหนี้สินผู้ระหว่าง <b>"ผู้รับจำนอง"</b> กับลูกหนี้ มีกำหนดระยะเวลาก่อหนี้ {F('loan_term_months', 60)} เดือน ตามสัญญากู้ยืมเงินเลขที่ {F('loan_contract_number', 100, '___/2568')} ฉบับลงวันที่ {F('loan_contract_date', 120)} จำนวน {F('loan_amount', 120)} บาท ({F('loan_amount_text', 200)})
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        กรณีที่ลูกหนี้ขอขยายระยะเวลาชำระคืนเงินต้นไปอีก {F('extension_years', 50)} ({F('extension_years_text', 80)}) ปี "ผู้รับจำนอง" ตกลงขยายระยะเวลาจำนองทรัพย์ที่ระบุข้างต้นไว้เป็นประกันหนี้นั้นตามระยะเวลาดังกล่าว ทั้งนี้ ในกรณีที่จำนองเพื่อเป็นประกันหนี้ของตนเองในฐานะลูกหนี้ของ "ผู้รับจำนอง" "ผู้จำนอง" ตกลงและยินยอมชำระดอกเบี้ยล่วงหน้า โดยหักดอกเบี้ยคิดเป็นระยะเวลา {F('advance_interest_months', 50)} ({F('advance_interest_text', 80)}) เดือนออกจากเงินต้นที่ค้างชำระ ณ วันที่ "ผู้รับจำนอง" ตกลงขยายระยะเวลาดังกล่าว
      </p>

      {/* Section 3 - Interest Rate */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 3.</b> <b>"ผู้จำนอง"</b> ยอมเสียดอกเบี้ยให้แก่ <b>"ผู้รับจำนอง"</b> ในอัตราร้อยละ {F('interest_rate', 60, '%')} ต่อปี ในจำนวนเงินซึ่งลูกหนี้เป็นหนี้ <b>"ผู้รับจำนอง"</b> นั้น และถ้า <b>"ผู้จำนอง"</b> หรือลูกหนี้ปฏิบัติผิดนัด หรือผิดสัญญา หรือผิดเงื่อนไข <b>"ผู้จำนอง"</b> ยอมเสียดอกเบี้ยในอัตราร้อยละ {F('late_interest_rate', 60, '%')} ต่อปี ทั้งนี้ ค่าธรรมเนียมและค่าใช้จ่ายทั้งสิ้นในการจำนองและค่าไถ่ถอนจำนอง <b>"ผู้จำนอง"</b> จะเป็นผู้ชำระเองทั้งสิ้น
      </p>

      {/* PAGE BREAK */}
      {/* เนื้อหาต่อเนื่อง */}

      {/* Section 4 - Property Deterioration */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 4.</b> กรณีที่ทรัพย์ที่จำนองนี้บุบสลายหรือต้องภัยอันตรายหรือเสียหายไปซึ่งเป็นเหตุให้ทรัพย์นั้นเสื่อมราคาไม่พอเพียงแก่การประกันหนี้ของ "ผู้จำนอง" "ผู้จำนอง" จะต้องเอาทรัพย์อื่นที่มีราคาพอเพียงมาจำนองเพิ่มให้คุ้มพอกับจำนวนหนี้ที่ "ผู้จำนอง" เป็นหนี้อยู่โดยไม่ชักช้า ถ้า "ผู้จำนอง" บิดพริ้วไม่ยอมปฏิบัติหรือไม่สามารถปฏิบัติตามความที่กล่าวมานี้ "ผู้รับจำนอง" มีสิทธิจะเรียกให้ "ผู้จำนอง" ชำระหนี้และบังคับจำนองได้ตามวิธีการที่กำหนดในกฎหมาย
      </p>

      {/* Section 5 - Foreclosure Deficiency */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 5.</b> ในกรณีที่ "ผู้จำนอง" ตกลงจำนองเพื่อเป็นประกันหนี้ของตนเองในฐานะลูกหนี้ของ "ผู้รับจำนอง" เมื่อถึงเวลาบังคับจำนองโดยการขายทอดตลาด ได้เงินจำนวนสุทธิน้อยกว่าจำนวนเงินที่ค้างชำระกับค่าอุปกรณ์ต่างๆ เงินยังขาดจำนวนอยู่เท่าใด "ผู้จำนอง" ยอมรับผิดชอบส่วนที่ขาดให้แก่ "ผู้รับจำนอง" จนครบถ้วน สำหรับกรณีที่ "ผู้จำนอง" ซึ่งจำนองทรัพย์สินเป็นประกันหนี้ของบุคคลอื่น "ผู้จำนอง" ไม่ต้องรับผิดเกินมูลค่าของทรัพย์ที่จำนอง ณ เวลาที่ทำการขายทอดตลาดหรือเอาทรัพย์ที่จำนองหลุด
      </p>

      {/* Section 6 - Maintenance Obligations */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 6.</b> "ผู้จำนอง" สัญญาว่าจะรักษาซ่อมแซม ตึก บ้านเรือน อาคาร โรงเรือน และสิ่งปลูกสร้างต่างๆ ให้มั่นคงเรียบร้อยปกติดีอยู่เสมอ ตลอดเวลาที่จำนองไว้แก่ "ผู้รับจำนอง" โดย "ผู้จำนอง" เสียค่าบำรุงรักษาและซ่อมแซมเอง
      </p>

      {/* Section 7 - Insurance */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 7.</b> กรณีทรัพย์สินจดทะเบียนจำนองดังกล่าว เป็นที่ดินพร้อมสิ่งปลูกสร้าง "ผู้จำนอง" ตกลงและยินยอมจะทำประกันภัยทรัพย์ที่จำนองไว้กับบริษัทผู้รับประกันภัยที่ "ผู้รับจำนอง" เห็นชอบ ในวงเงินไม่น้อยกว่าราคาประเมินตลาดโดยให้ "ผู้รับจำนอง" เป็นผู้รับประโยชน์ตามกรมธรรม์ "ผู้จำนอง" เป็นผู้ชำระเบี้ยประกันภัยและเสียค่าใช้จ่ายเพื่อการประกันภัยเองทั้งสิ้น และ "ผู้จำนอง" จะต่อสัญญาประกันภัยตลอดระยะเวลาที่ลูกหนี้เป็นหนี้ "ผู้รับจำนอง" และเมื่อ "ผู้รับจำนอง" เรียกร้องให้ "ผู้จำนอง" สลักหลังกรมธรรม์ประกันภัยโอนสิทธิที่จะรับค่าเสียหายจากบริษัทผู้รับประกันภัย "ผู้จำนอง" ก็ต้องปฏิบัติตามนี้
      </p>

      {/* Section 8 - Restrictions on Further Encumbrances */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 8.</b> ในระหว่างที่ทรัพย์จำนองนี้อยู่ในการจำนองตามสัญญานี้ "ผู้จำนอง" จะให้สิทธิประการใดแก่บุคคลอื่นเหนือทรัพย์ที่จำนอง เช่น สิทธิการเช่า สิทธิอาศัย สิทธิครอบครอง หรือสิทธิในการก่อสร้าง ให้ทางเดิน ให้ยืม สิทธิเหนือพื้นดิน สิทธิเก็บกิน เป็นต้น และภาระจำยอมอื่น ๆ อันอาจเป็นการเสื่อมเสียสิทธิ รอนสิทธิ หรือตัดสิทธิของ "ผู้รับจำนอง" "ผู้จำนอง" ต้องได้รับความยินยอมและอนุญาตเป็นลายลักษณ์อักษรจาก "ผู้รับจำนอง" ก่อน การกระทำใด ๆ ที่ "ผู้จำนอง" ได้กระทำฝ่าฝืนต่อสัญญาข้อนี้ไม่ผูกพัน "ผู้รับจำนอง" และ "ผู้รับจำนอง" มีสิทธิที่จะปฏิเสธการกระทำเช่นนั้นของ "ผู้จำนอง" ได้ ทั้ง "ผู้รับจำนอง" มีสิทธิจะเรียกให้ "ผู้จำนอง" ชำระหนี้และบังคับจำนองได้ตามวิธีการที่กำหนดในกฎหมาย
      </p>

      {/* Section 9 - Title Defects */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 9.</b> ถ้าจะมีปัญหาเกิดขึ้นในเรื่องกรรมสิทธิ์ของ "ผู้จำนอง" ในทรัพย์ที่จำนองเมื่อใด "ผู้รับจำนอง" มีสิทธิจะเรียกให้ "ผู้จำนอง" ชำระหนี้และบังคับจำนองได้ตามวิธีการที่กำหนดในกฎหมาย
      </p>

      {/* Section 10 - Default */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 10.</b> ถ้า "ผู้จำนอง" ประพฤติผิดหรือไม่ปฏิบัติตามสัญญาฉบับนี้ไม่ว่าข้อหนึ่งข้อใดตลอดจนคำรับรองหรือคำยืนยันใดๆ ที่ "ผู้จำนอง" ให้ไว้ตามสัญญานี้ "ผู้รับจำนอง" มีสิทธิจะเรียกให้ "ผู้จำนอง" ชำระหนี้และบังคับจำนองได้ตามวิธีการที่กำหนดในกฎหมาย
      </p>

      {/* Section 11 - Voluntary Auction */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 11.</b> ในเวลาใดๆ หลังจากที่หนี้ถึงกำหนดชำระ ถ้าไม่มีการจำนองรายอื่นหรือบุริมสิทธิอื่นอันได้จดทะเบียนไว้เหนือทรัพย์สินอันเดียวกันนี้ และ "ผู้จำนอง" ใช้สิทธิแจ้งเป็นหนังสือมายัง "ผู้รับจำนอง" เพื่อให้ "ผู้รับจำนอง" ดำเนินการขายทอดตลาดทรัพย์สินที่จำนองโดยไม่ต้องฟ้องเป็นคดีต่อศาล "ผู้จำนอง" ตกลงให้ถือว่าหนังสือแจ้งของ "ผู้จำนอง" เป็นหนังสือยินยอมให้ขายทอดตลาด ทั้งนี้ เป็นการขายทอดตลาดตามวิธีการที่กำหนดในกฎหมาย เมื่อ "ผู้รับจำนอง" ขายทอดตลาดทรัพย์สินที่จำนองได้เงินสุทธิจำนวนเท่าใด "ผู้จำนอง" ตกลงให้ "ผู้รับจำนอง" จัดสรรเงินที่ได้รับภายหลังหักค่าใช้จ่ายต่างๆ ที่เกิดจากการขายทอดตลาดรวมถึงการโอนทรัพย์สินที่จำนองแล้ว เข้าชำระหนี้ของลูกหนี้ให้เสร็จสิ้นไป
      </p>

      {/* Section 12 - Transfer of Mortgage Rights */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 12.</b> "ผู้จำนอง" ยินยอมให้ "ผู้รับจำนอง" โอนสิทธิจำนองตามสัญญาจำนองนี้ไม่ว่าทั้งหมด หรือแต่เพียงบางส่วนให้แก่บุคคลหรือนิติบุคคลอื่นใดได้โดยส่งคำบอกกล่าวเป็นลายลักษณ์อักษรให้ "ผู้จำนอง" ทราบล่วงหน้าเป็นระยะเวลาไม่น้อยกว่า 30 (สามสิบ) วัน แต่ "ผู้จำนอง" ไม่มีสิทธิโอนสิทธิและหน้าที่ตามสัญญาจำนองนี้ไม่ว่าทั้งหมดหรือบางส่วนให้แก่บุคคลหรือนิติบุคคลอื่นได้
      </p>

      {/* Section 13 - Data Disclosure */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 13.</b> "ผู้จำนอง" ตกลงและอนุญาตให้ "ผู้รับจำนอง" เปิดเผยข้อมูลใดๆ ที่ได้ให้ไว้แก่ "ผู้จำนอง" และ/หรือข้อมูลที่เกี่ยวข้องกับ "ผู้จำนอง" (ซึ่งไม่ใช้ข้อมูลที่ได้รับจากบริษัทข้อมูลเครดิต) เท่าที่จำเป็นต่อบริษัทในเครือของ "ผู้รับจำนอง" รวมถึงกรรมการ และลูกจ้างของ "ผู้รับจำนอง" เพื่อวัตถุประสงค์ในการจัดเก็บข้อมูล บริหาร วิเคราะห์ตรวจสอบ ทบทวน และป้องกันความเสี่ยงด้านสินเชื่อ
      </p>

      {/* Section 14 - Notices */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 14.</b> บรรดาหนังสือ จดหมายติดต่อ คำบอกกล่าวใดๆ ที่ "ผู้รับจำนอง" ได้ส่งให้ "ผู้จำนอง" ตามที่อยู่ที่แจ้งไว้ตามสัญญาฉบับนี้ ไม่ว่าจะโดยส่งเองหรือส่งทางไปรษณีย์ลงทะเบียนหรือไม่ลงทะเบียน ให้ถือว่าได้ส่งให้แก่ "ผู้จำนอง" แล้วโดยชอบ ทั้งนี้ โดยไม่ต้องคำนึงถึงว่าจะมีผู้รับไว้หรือไม่ และแม้หากส่งให้ไม่ได้เพราะย้ายที่อยู่ หรือที่อยู่เปลี่ยนแปลงไป หรือถูกรื้อถอนไปโดยมิได้มีการแจ้งการย้าย การเปลี่ยนแปลง หรือการรื้อถอนนั้นเป็นลายลักษณ์อักษรให้ "ผู้รับจำนอง" ทราบก็ดี หรือส่งให้ไม่ได้เพราะหาที่อยู่ตามที่ระบุไว้นั้นไม่พบก็ดี ให้ถือว่า "ผู้จำนอง" ได้รับและทราบหนังสือ จดหมาย หรือคำบอกกล่าวดังกล่าวแล้วโดยชอบ ทั้งนี้ หากมีการเปลี่ยนแปลงที่อยู่ "ผู้จำนอง" จะต้องแจ้งการเปลี่ยนแปลงให้ "ผู้รับจำนอง" ทราบเป็นลายลักษณ์อักษรทันที
      </p>

      {/* Section 15 - Waiver */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 15.</b> การล่าช้าหรือการไม่ใช้สิทธิใดๆ ของ "ผู้รับจำนอง" ตามข้อกำหนดหรือเงื่อนไขใดๆ ของสัญญานี้หรือตามกฎหมาย ไม่ถือว่า "ผู้รับจำนอง" สละสิทธิหรือให้ความยินยอมในการดำเนินการใดๆ ตามที่ "ผู้รับจำนอง" มีสิทธิแก่ "ผู้จำนอง" แต่ประการใด เว้นแต่ "ผู้รับจำนอง" จะได้ทำเป็นหนังสืออย่างชัดแจ้งและการสละสิทธิเช่นว่านั้นให้มีผลเฉพาะสำหรับเหตุการณ์และวัตถุประสงค์นั้นเท่านั้น
      </p>

      {/* Section 16 - Severability */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 16.</b> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดหรือเงื่อนไขใด ๆ ในสัญญาฉบับนี้ไม่สมบูรณ์หรือเป็นโมฆะ หรือขัดต่อกฎหมาย หรือไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมาย ให้ส่วนอื่น ๆ ของข้อกำหนดและเงื่อนไขของสัญญาฉบับนี้ยังคงมีผลสมบูรณ์ชอบด้วยกฎหมาย และใช้บังคับได้ตามกฎหมาย และไม่ถูกกระทบหรือเสื่อมเสียไปเพราะความไม่สมบูรณ์เป็นโมฆะ ขัดต่อกฎหมาย ไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมายของข้อความข้อกำหนด หรือเงื่อนไขดังกล่าวนั้น
      </p>

      {/* Closing Statement */}
      <p style={{ ...S, fontSize: 'inherit', marginTop: 16 }}>
        สัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว เพื่อเป็นหลักฐาน คู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน ณ วันเดือนปีที่ระบุไว้ข้างต้น และต่างยึดถือไว้ฝ่ายละฉบับ
      </p>

      {/* Signatures — version-conditional */}
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          {selectedVersion === 3 ? (
            <>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้จำนอง</div>
              <div style={{ marginTop: 12, fontSize: 'inherit' }}>บจก./หจก. {F('borrower_company', 150)}</div>
              <div style={{ marginTop: 8, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
            </>
          ) : selectedVersion === 2 ? (
            <>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้จำนอง</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>ลงชื่อ......................................ผู้จำนอง</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('borrower_name2', 150)} )</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้จำนอง</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
            </>
          )}
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้รับจำนอง</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('lender_first_name', 150)} )</div>
        </div>
      </div>

      {/* Witnesses */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('witness1', 150)} )</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('witness2', 150, 'นางสาว อารยา เพิ่มอุตส่าห์')} )</div>
        </div>
      </div>
    </>
  )

  const renderMgAppendix = () => (
    <>
      <DocHeader />
      <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
        เอกสารแนบท้ายสัญญาแต่งตั้งนายหน้าจำนอง
      </div>

      {/* Header */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        ณ สำนักงาน โลนด์ ดีดี จำกัด ตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร เมื่อวันที่ {F('appendix_date', 150, 'วัน เดือน ปี')}
      </p>

      {/* Client Info — version-conditional */}
      {selectedVersion === 3 ? (
        <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
          ตามที่ บจก./หจก. {F('borrower_company', 200)} ทะเบียนนิติบุคคลเลขที่ {F('borrower_reg_id', 130)} โดย {F('borrower_name', 120)} กรรมการผู้มีอำนาจ ที่อยู่บริษัท {F('borrower_address', 200)} เบอร์ {F('borrower_phone', 100)} (<b>"ผู้ให้สัญญา"</b>)
        </p>
      ) : selectedVersion === 2 ? (
        <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
          ตามที่ นาย/นาง/นางสาว {F('borrower_name', 150)} เลขบัตรประชาชน {F('borrower_id', 130)} ที่อยู่ตามบัตร {F('borrower_address', 220)} และ นาย/นาง/นางสาว {F('borrower_name2', 150)} เลขบัตรประชาชน {F('borrower_id2', 130)} ที่อยู่ตามบัตร {F('borrower_address2', 220)} เบอร์ {F('borrower_phone', 100)} (<b>"ผู้ให้สัญญา"</b>)
        </p>
      ) : (
        <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
          ตามที่ นาย/นาง/นางสาว {F('borrower_name', 150)} เลขบัตรประชาชน {F('borrower_id', 130)} ที่อยู่ตามบัตร {F('borrower_address', 220)} เบอร์ {F('borrower_phone', 100)} (<b>"ผู้ให้สัญญา"</b>)
        </p>
      )}

      {/* Main Contract Reference */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        ได้ตกลงทำสัญญาแต่งตั้งนายหน้าจำนอง ฉบับลงวันที่ {F('main_contract_date', 150)} บริษัท โลนด์ ดีดี จำกัด (<b>"นายหน้า"</b>) ทะเบียนนิติบุคคลเลขที่ 0105566225836 โดย นาย วรวุฒิ กิตติอุดม กรรมการผู้มีอำนาจ สำนักงานตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร โทรศัพท์ 081-6386966
      </p>

      {/* Transaction Body */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        บัดนี้ ข้าพเจ้า "ผู้ให้สัญญา" ได้เข้าทำสัญญากับนายทุนผู้รับจำนอง ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง {F('property_type_full', 120)} เลขที่ {F('address_no', 80)} โฉนดเลขที่ {F('deed_no', 100)} เลขที่ดิน {F('land_no', 80)} หน้าสำรวจ {F('survey_page', 80)} ตำบล {F('tambon', 100)} อำเภอ {F('amphoe', 100)} จังหวัด {F('province', 100)} เนื้อที่รวม {F('land_area', 130, 'ไร่/งาน/ตารางวา/ตารางเมตร')} โดยมีค่าบริการเพิ่มเติมจำนวน {F('additional_fee', 100)} โดยได้จดทะเบียนกับกรมที่ดินแล้วเมื่อวันที่ {F('registration_date', 150)}
      </p>

      {/* Closing */}
      <p style={{ ...S, fontSize: 'inherit', marginBottom: 14 }}>
        ดังนั้น "ผู้ให้สัญญา" จึงได้ลงนามเอกสารแนบท้ายสัญญาแต่งตั้งนายหน้าจำนองฉบับนี้ เพื่อให้เป็นไปตามเงื่อนไขของสัญญาแต่งตั้งนายหน้าจำนองฉบับวันที่ {F('main_contract_date', 150)} สัญญาฉบับนี้ถือเป็นส่วนหนึ่งของสัญญาแต่งตั้งนายหน้าจำนอง คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว จึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน และต่างยึดถือไว้ฝ่ายละฉบับ
      </p>

      {/* Signatures — version-conditional */}
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          {selectedVersion === 3 ? (
            <>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
              <div style={{ marginTop: 12, fontSize: 'inherit' }}>บจก./หจก. {F('borrower_company', 150)}</div>
              <div style={{ marginTop: 8, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
            </>
          ) : selectedVersion === 2 ? (
            <>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('borrower_name2', 150)} )</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
            </>
          )}
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................นายหน้า</div>
          <div style={{ marginTop: 8, fontSize: 'inherit' }}>บริษัท โลนด์ ดีดี จำกัด</div>
          <div style={{ marginTop: 8, fontSize: 'inherit' }}>( นางสาว อารยา เพิ่มอุตส่าห์ )</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>เจ้าหน้าที่นิติกรรม</div>
        </div>
      </div>

      {/* Witnesses */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('witness1', 150)} )</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( นางสาว พิสชา วงษา )</div>
        </div>
      </div>
    </>
  )

  const renderMgBroker = () => (
    <>
      <DocHeader />
      <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 12 }}>
        สัญญาแต่งตั้งนายหน้าจำนอง
      </div>

      {/* Header - Company and Date */}
      <p style={{ ...S, textAlign: 'right', fontSize: 'inherit' }}>
        ทำที่ บริษัท โลนด์ ดีดี จำกัด 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510 วันที่ {F('contract_date', 150, 'วัน เดือน ปี')}
      </p>

      {/* Parties - Company (Broker) */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        ระหว่าง บริษัท โลนด์ ดีดี จำกัด ทะเบียนนิติบุคคลเลขที่ {F('company_id', 130, '0105566225836')} โดย นาย {F('company_officer', 120, 'วรวุฒิ กิตติอุดม')} กรรมการผู้มีอำนาจ สำนักงานตั้งอยู่เลขที่ 87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร โทรศัพท์ {F('company_phone', 100, '081-6386966')} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"นายหน้า"</b> ฝ่ายหนึ่ง กับ
      </p>

      {/* Parties - Client (Property Owner) — version-conditional */}
      {selectedVersion === 3 ? (
        <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
          บจก./หจก. {F('borrower_company', 200)} ทะเบียนนิติบุคคลเลขที่ {F('borrower_reg_id', 130)} โดย {F('borrower_name', 120)} กรรมการผู้มีอำนาจ ที่อยู่บริษัท {F('borrower_address', 200)} เบอร์ {F('borrower_phone', 100)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้ให้สัญญา"</b> รหัสทรัพย์ {F('property_code', 100)} อีกฝ่ายหนึ่ง
        </p>
      ) : selectedVersion === 2 ? (
        <>
          <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
            นาย/นาง/นางสาว {F('borrower_name', 150, 'ชื่อผู้ให้สัญญา')} เลขบัตรประชาชน {F('borrower_id', 130)} ที่อยู่ตามบัตร {F('borrower_address', 250)}
          </p>
          <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
            และ นาย/นาง/นางสาว {F('borrower_name2', 150)} เลขบัตรประชาชน {F('borrower_id2', 130)} ที่อยู่ตามบัตร {F('borrower_address2', 250)} เบอร์ {F('borrower_phone', 100)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้ให้สัญญา"</b> รหัสทรัพย์ {F('property_code', 100)} อีกฝ่ายหนึ่ง
          </p>
        </>
      ) : (
        <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
          นาย/นาง/นางสาว {F('borrower_name', 150, 'ชื่อผู้ให้สัญญา')} เลขบัตรประชาชน {F('borrower_id', 130)} ที่อยู่ตามบัตร {F('borrower_address', 250)} เบอร์ {F('borrower_phone', 100)} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <b>"ผู้ให้สัญญา"</b> รหัสทรัพย์ {F('property_code', 100)} อีกฝ่ายหนึ่ง
        </p>
      )}

      {/* Agreement intro */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญาแต่งตั้งนายหน้าจำนอง ดังต่อไปนี้
      </p>

      {/* Section 1 - Property Details */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 1.</b> ผู้ให้สัญญาแต่งตั้งให้นายหน้าเป็นผู้ติดต่อ จัดหา ชี้ช่อง และจัดการให้ได้เข้าทำสัญญากับนายทุนผู้รับจำนอง โดยจำนองทรัพย์สิน <b>{F('property_type_full', 180, 'ห้องชุด/ที่ดินเปล่า/ที่ดินพร้อมสิ่งปลูกสร้าง')}</b> เลขที่ {F('address_no', 80)} โฉนดเลขที่ {F('deed_no', 100)} เลขที่ดิน {F('land_no', 80)} หน้าสำรวจ {F('survey_page', 80)} ตำบล {F('tambon', 100)} อำเภอ {F('amphoe', 100)} จังหวัด {F('province', 100)} เนื้อที่รวม {F('land_area', 130, 'ไร่/งาน/ตร.วา')} เพื่อเป็นประกันหนี้สินของ {selectedVersion === 3 ? <>บจก./หจก. {F('borrower_company', 150)}</> : selectedVersion === 2 ? <>นาย/นาง/นางสาว {F('borrower_name', 120)} และ นาย/นาง/นางสาว {F('borrower_name2', 120)}</> : <>นาย/นาง/นางสาว {F('borrower_name', 150)}</>}
      </p>

      {/* Section 2 - Broker Appointment */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 2.</b> นายหน้าจะมีหน้าที่ค้นหาผู้ให้กู้ ปรึกษาปรงครองในการจดทะเบียนจำนอง และดำเนินการต่าง ๆ ตามข้อสัญญากู้ยืมเงิน
      </p>

      {/* Section 3 - Payment Terms */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 3.</b> เมื่อนายทุนผู้รับจำนองเข้าทำสัญญาจำนองแล้วและได้รับชำระเงิน ผู้ให้สัญญาตกลงชำระค่านายหน้าด้วยวิธีการโอนเงินไปยังบัญชีของนายหน้า ซึ่งมีรายละเอียดดังนี้:
      </p>

      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        • ชื่อธนาคาร: {F('bank_name', 120, 'ไทยพาณิชย์')}<br />
        • ชื่อบัญชี: {F('account_name', 200, 'บริษัท โลนด์ ดีดี จำกัด')}<br />
        • สาขา: {F('branch_name', 150, 'รามคำแหง (สัมมากร)')}<br />
        • หมายเลขบัญชี: {F('account_number', 150, '136-2707297')}
      </p>

      {/* Section 4 - Contract Duration */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 4.</b> สัญญาฉบับนี้มีกำหนดเวลา 1 (หนึ่ง) ปี นับแต่วันทำสัญญา
      </p>

      {/* PAGE BREAK */}
      {/* เนื้อหาต่อเนื่อง */}

      {/* Section 5 - Registration & Completion */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 5.</b> ผู้ให้สัญญาตกลงจะทำสัญญาจำนองโดยจดทะเบียนจำนองที่สำนักงานที่ดินภายใน 30 (สามสิบ) วัน นับจากวันทำสัญญา ทั้งนี้ ให้ถือว่านายหน้าได้ทำหน้าที่สมบูรณ์ตามสัญญาแล้ว และยินยอมชำระค่านายหน้าตามข้อ 3
      </p>

      {/* Section 5.1 */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.1</b> ค่าธรรมเนียมและค่าใช้จ่ายทั้งสิ้นในการจดทะเบียนจำนอง ค่าไถ่ถอน ค่าภาษี ผู้ให้สัญญาจะเป็นผู้เสียเองทั้งสิ้น
      </p>

      {/* Section 5.2 */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.2</b> ในกรณีแจ้งไถ่ถอน ผู้ให้สัญญาจะแจ้งให้นายหน้าทราบล่วงหน้าไม่ต่ำกว่า 15 (สิบห้า) วัน และมีค่าใช้จ่ายในการดำเนินการไถ่ถอนเป็นจำนวนเงิน {F('redemption_fee', 100, '5,000')} บาท
      </p>

      {/* Section 5.3 */}
      <p style={{ ...S, textIndent: 40, fontSize: 'inherit' }}>
        <b>5.3</b> ในกรณีที่ผู้ให้สัญญาไม่ทราบราคาประเมินทรัพย์สินและต้องการให้นายหน้าเป็นผู้ประเมินราคา ผู้ให้สัญญาตกลงชำระค่าประเมินจำนวน {F('appraisal_fee', 80)} บาท
      </p>

      {/* Section 6 - Exclusivity */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 6.</b> ในระหว่างที่สัญญานี้ยังมีผลบังคับใช้ ผู้ให้สัญญาตกลงว่าจะไม่ทำสัญญาแต่งตั้งนายหน้าหรือตัวแทนแต่เพียงผู้เดียวกับบุคคลหรือนิติบุคคลอื่นสำหรับการจำนองทรัพย์สินดังกล่าว นอกจากนี้ ผู้ให้สัญญาตกลงว่าจะไม่ยกเลิกสัญญาฉบับนี้ก่อนครบกำหนดเวลา ในกรณีผิดสัญญา ผู้ให้สัญญาตกลงจะชำระค่านายหน้าตามข้อ 3
      </p>

      {/* Section 7 - Broker Compensation */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 7.</b> หาก "นายหน้า" จัดหานายทุนผู้รับจำนองได้แล้ว แต่ "ผู้ให้สัญญา" ปฏิเสธการจดทะเบียนจำนอง หรือ "ผู้ให้สัญญา" ได้เข้าทำสัญญาจำนองกับนายทุนแล้ว แต่ไม่สามารถจดทะเบียนจำนองได้จากเหตุปฏิบัติผิดนัด ผิดสัญญา หรือผิดเงื่อนไขข้อหนึ่งข้อใดของ "ผู้ให้สัญญา" "ผู้ให้สัญญา" ยินยอมให้ถือว่านายหน้าได้ทำหน้าที่สมบูรณ์ตามสัญญาแล้ว และยินยอมชำระค่านายหน้าให้แก่ "นายหน้า" ตามข้อ 3. พร้อมดอกเบี้ยผิดนัดในอัตราร้อยละ 15 (สิบห้า) ต่อปี ตลอดจนค่าเสียหาย และค่าใช้จ่ายต่างๆ ในการติดตามทวงถาม หรือดำเนินคดีแก่ "ผู้ให้สัญญา"
      </p>

      {/* Section 8 - Contract Extension */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 8.</b> กรณี "นายหน้า" สามารถจัดหานายทุนให้ผู้จำนองได้แล้ว สัญญานายหน้ามีผลตลอดสัญญาจำนองจนถึงวันไถ่ถอน โดยหาก "ผู้ให้สัญญา" และนายทุนผู้รับจำนองได้ตกลงขยายระยะเวลาสัญญาจำนองไปอีกหนึ่งปี "ผู้ให้สัญญา" ตกลงจะชำระค่านายหน้าให้แก่ "นายหน้า" ทันทีในอัตราค่านายหน้าร้อยละ 1.5 (หนึ่งจุดห้า) ของวงเงินจำนอง สำหรับวงเงินต่ำกว่า 1,000,000 บาท (หนึ่งล้านบาทถ้วน) คิดอัตราค่านายหน้าขั้นต่ำ 10,000 บาท (หนึ่งหมื่นบาทถ้วน) แต่ในกรณีที่นายทุนผู้รับจำนองรายเดิมไม่ต่อสัญญาจากความผิดของ "ผู้ให้สัญญา" เช่น ผิดนัดชำระดอกเบี้ยงวดหนึ่งงวดใด เป็นเหตุให้ "ผู้ให้สัญญา" ตกเป็นผู้ผิดนัด ทำให้ "นายหน้า" ต้องหานายทุนรายใหม่ "ผู้ให้สัญญา" ตกลงและยินยอมจ่ายค่าธรรมเนียมในอัตราค่านายหน้าร้อยละ 5 (ห้า) ของวงเงินจำนอง โดยคิดอัตราขั้นต่ำ 50,000 บาท (ห้าหมื่นบาทถ้วน) สำหรับทรัพย์สินที่ราคาต่ำกว่า 1,000,000 บาท (หนึ่งล้านบาทถ้วน) ให้แก่ "นายหน้า"
      </p>

      {/* PAGE BREAK */}
      {/* เนื้อหาต่อเนื่อง */}

      {/* Section 9 - Data Disclosure */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 9.</b> "ผู้ให้สัญญา" ตกลงและอนุญาตให้ "นายหน้า" เปิดเผยข้อมูลใดๆ ที่ได้ให้ไว้แก่ "นายหน้า" และ/หรือข้อมูลที่เกี่ยวข้องกับ "ผู้ให้สัญญา" (ซึ่งไม่ใช้ข้อมูลที่ได้รับจากบริษัทข้อมูลเครดิต) เท่าที่จำเป็นต่อบริษัทในเครือของ "นายหน้า" รวมถึงกรรมการ และลูกจ้างของ "นายหน้า" เพื่อวัตถุประสงค์ในการจัดเก็บข้อมูล บริหาร วิเคราะห์ตรวจสอบ ทบทวน และป้องกันความเสี่ยงด้านสินเชื่อ
      </p>

      {/* Section 10 - Waiver */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 10.</b> การล่าช้าหรือการไม่ใช้สิทธิใดๆ ของ "นายหน้า" ตามข้อกำหนดหรือเงื่อนไขใดๆ ของสัญญานี้หรือตามกฎหมาย ไม่ถือว่า "นายหน้า" สละสิทธิหรือให้ความยินยอมในการดำเนินการใดๆ ตามที่ "นายหน้า" มีสิทธิแก่ "ผู้ให้สัญญา" แต่ประการใด เว้นแต่ "นายหน้า" ได้ทำเป็นหนังสืออย่างชัดแจ้งและการสละสิทธิเช่นว่านั้นให้มีผลเฉพาะสำหรับเหตุการณ์และวัตถุประสงค์เท่านั้น
      </p>

      {/* Section 11 - Severability */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 11.</b> คู่สัญญาตกลงว่า ในกรณีที่ข้อความข้อกำหนดหรือเงื่อนไขใด ในสัญญาฉบับนี้ไม่สมบูรณ์ หรือเป็นโมฆะ หรือขัดต่อกฎหมาย หรือไม่ชอบด้วยกฎหมาย หรือไม่ใช้บังคับตามกฎหมาย ให้ส่วนอื่นๆ ของข้อกำหนดและเงื่อนไขของสัญญาฉบับนี้ยังคงมีผลสมบูรณ์ ชอบด้วยกฎหมาย และใช้บังคับได้ตามกฎหมาย และไม่ถูกกระทบหรือเสียไปเพราะความไม่สมบูรณ์ เป็นโมฆะ ขัดต่อกฎหมาย ไม่ชอบด้วยกฎหมาย หรือใช้บังคับไม่ได้ตามกฎหมายซึ่งข้อความข้อกำหนด หรือเงื่อนไขดังกล่าวนั้น
      </p>

      {/* Section 12 - Post-Contract Dealings */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 12.</b> เมื่อสัญญาฉบับนี้สิ้นสุดลง หาก "นายหน้า" ยังไม่สามารถเป็นผู้ติดต่อ จัดหา ชี้ช่อง และจัดการให้ได้เข้าทำสัญญากับนายทุนผู้รับจำนองในทรัพย์สินได้ "ผู้ให้สัญญา" ไม่ต้องเสียค่าใช้จ่ายแต่อย่างใด เว้นแต่เป็นบุคคลหรือผู้ที่เกี่ยวข้องกับบุคคล หรือผู้ที่ได้รับการชี้ช่องจากบุคคลที่ "นายหน้า" เคยติดต่อ หรือแนะนำให้รับจำนองทรัพย์สินนี้ ให้ถือว่า "นายหน้า" ได้ทำหน้าที่สมบูรณ์ตามสัญญาแล้วและยินยอมชำระค่านายหน้าให้แก่ "นายหน้า" ตามข้อ 3.
      </p>

      {/* Section 13 - Dispute Resolution */}
      <p style={{ ...S, fontSize: 'inherit' }}>
        <b>ข้อ 13.</b> ในกรณีที่มีข้อเรียกร้องหรือข้อพิพาทใดๆ เกิดขึ้นภายใต้หรือเกี่ยวข้องกับข้อสัญญานี้ คู่สัญญาจะพยายามแก้ไขข้อเรียกร้องหรือข้อพิพาทดังกล่าวโดยการเจรจาก่อนที่จะดำเนินคดีทางกฎหมาย หากข้อเรียกร้องหรือข้อพิพาทไม่สามารถตกลงได้โดยการเจรจาภายใน 30 (สามสิบ) วัน หลังจากที่ฝ่ายใดฝ่ายหนึ่งได้ยื่นข้อเสนอเป็นลายลักษณ์อักษรให้กับอีกฝ่ายหนึ่งเพื่อเจรจาเพื่อยุติข้อเรียกร้องหรือข้อพิพาทดังกล่าว คู่สัญญามีสิทธินำข้อเรียกร้องหรือข้อพิพาทขึ้นสู่ศาลที่มีเขตอำนาจ
      </p>

      {/* Closing Statement */}
      <p style={{ ...S, fontSize: 'inherit', marginTop: 16 }}>
        สัญญาฉบับนี้ทำขึ้นเป็นสองฉบับ คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญาโดยตลอดแล้ว เพื่อเป็นหลักฐาน คู่สัญญาจึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน
      </p>

      {/* Signatures — version-conditional */}
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          {selectedVersion === 3 ? (
            <>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
              <div style={{ marginTop: 12, fontSize: 'inherit' }}>บจก./หจก. {F('borrower_company', 150)}</div>
              <div style={{ marginTop: 8, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
            </>
          ) : selectedVersion === 2 ? (
            <>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('borrower_name2', 150)} )</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................ผู้ให้สัญญา</div>
              <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('borrower_name', 150)} )</div>
            </>
          )}
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................นายหน้า</div>
          <div style={{ marginTop: 8, fontSize: 'inherit' }}>บริษัท โลนด์ ดีดี จำกัด</div>
          <div style={{ marginTop: 8, fontSize: 'inherit' }}>( นางสาว อารยา เพิ่มอุตส่าห์ )</div>
          <div style={{ marginTop: 4, fontSize: 12 }}>เจ้าหน้าที่นิติกรรม</div>
        </div>
      </div>

      {/* Witnesses */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( {F('witness1', 150)} )</div>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ fontSize: 'inherit' }}>ลงชื่อ......................................พยาน</div>
          <div style={{ marginTop: 20, fontSize: 'inherit' }}>( นางสาว พิสชา วงษา )</div>
        </div>
      </div>
    </>
  )

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        fontFamily: "'TH Sarabun New', Sarabun, serif",
      }}
    >
      {/* Toolbar — sticky ด้านบน */}
      <div
        style={{
          backgroundColor: '#fff',
          borderBottom: '2px solid #e5e7eb',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 10000,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-arrow-left"></i> ย้อนกลับ
          </button>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: TEMPLATES[templateType]?.color }}>
            {TEMPLATES[templateType]?.title}
          </div>
          {VERSION_CONFIG[templateType]?.length > 0 && (
            <select
              value={selectedVersion || ''}
              onChange={(e) => setSelectedVersion(Number(e.target.value))}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: `2px solid ${TEMPLATES[templateType]?.color}`,
                fontSize: 13,
                fontFamily: 'inherit',
                backgroundColor: '#fff',
                color: '#1f2937',
                cursor: 'pointer',
              }}
            >
              {VERSION_CONFIG[templateType].map(opt => (
                <option key={opt.ver} value={opt.ver}>{opt.label}</option>
              ))}
            </select>
          )}
          <div style={{
            fontSize: 12,
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '4px 10px',
            borderRadius: 6,
            fontFamily: 'sans-serif',
          }}>
            {pageCount} หน้า
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {error && <div style={{ color: '#dc2626', fontSize: 'inherit' }}>{error}</div>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 18px',
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 700,
              opacity: saving ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-save"></i>
            {saving ? 'กำลังบันทึก...' : 'บันทึกเอกสาร'}
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            style={{
              padding: '8px 14px',
              background: '#0891b2',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: printing ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 700,
              opacity: printing ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-print"></i>
            {printing ? 'กำลังพิมพ์...' : 'พิมพ์'}
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: '8px 14px',
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-download"></i>
            โหลด .doc
          </button>
        </div>
      </div>

      {/* Document Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          backgroundColor: '#b0b3b8',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          ref={paperRef}
          id="doc-editor-paper"
          style={{
            backgroundColor: 'white',
            width: '210mm',
            maxWidth: '210mm',
            minHeight: `${PAGE_H}px`,
            padding: '15mm 20mm',
            fontSize: '13.5px',
            lineHeight: 1.5,
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            color: '#000',
            fontFamily: "'TH Sarabun New', Sarabun, serif",
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
            outline: '1px solid #dce0e4',
            alignSelf: 'flex-start',
          }}
        >
          {renderTemplate()}
        </div>
      </div>
    </div>
  )
}

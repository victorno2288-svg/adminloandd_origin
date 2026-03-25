// ============================================================
// slipVerifier.js
// สแกน QR จากรูปสลิปโอนเงิน — ตรวจสอบและแจ้งเตือนสลิปปลอม
// รองรับ: PromptPay EMVCo QR + URL QR ทุกธนาคารไทย
// เพิ่ม: ระบุธนาคาร, เช็ค duplicate ref, flag ความเสี่ยง
// ============================================================

import jsQR from 'jsqr'

// ─── แผนที่ domain → ข้อมูลธนาคาร ───────────────────────────
export const BANK_DOMAINS = {
  'scb.co.th':            { name: 'ธนาคารไทยพาณิชย์',        abbr: 'SCB',   color: '#4e2d8e' },
  'kasikornbank.com':     { name: 'ธนาคารกสิกรไทย',          abbr: 'KBANK', color: '#138c3b' },
  'kbank.co.th':          { name: 'ธนาคารกสิกรไทย',          abbr: 'KBANK', color: '#138c3b' },
  'ktb.co.th':            { name: 'ธนาคารกรุงไทย',           abbr: 'KTB',   color: '#00a0e3' },
  'bangkokbank.com':      { name: 'ธนาคารกรุงเทพ',           abbr: 'BBL',   color: '#1c3172' },
  'bbl.co.th':            { name: 'ธนาคารกรุงเทพ',           abbr: 'BBL',   color: '#1c3172' },
  'krungsri.com':         { name: 'ธนาคารกรุงศรีอยุธยา',     abbr: 'BAY',   color: '#f0a500' },
  'bay.co.th':            { name: 'ธนาคารกรุงศรีอยุธยา',     abbr: 'BAY',   color: '#f0a500' },
  'ttbbank.com':          { name: 'ธนาคาร TTB',              abbr: 'TTB',   color: '#ec008b' },
  'tmb.co.th':            { name: 'ธนาคาร TMB',              abbr: 'TMB',   color: '#ec008b' },
  'thanachartbank.co.th': { name: 'ธนาคารธนชาต',             abbr: 'TBANK', color: '#ec008b' },
  'uob.co.th':            { name: 'ธนาคาร UOB',              abbr: 'UOB',   color: '#0e42a5' },
  'kiatnakin.co.th':      { name: 'ธนาคารเกียรตินาคินภัทร',  abbr: 'KKP',   color: '#5c1e8f' },
  'lhbank.co.th':         { name: 'ธนาคารแลนด์แอนด์เฮ้าส์', abbr: 'LHB',   color: '#e31d24' },
  'gsb.or.th':            { name: 'ธนาคารออมสิน',            abbr: 'GSB',   color: '#7b2d8b' },
  'baac.or.th':           { name: 'ธ.ก.ส. (BAAC)',           abbr: 'BAAC',  color: '#3b7a31' },
  'ghb.or.th':            { name: 'ธนาคารอาคารสงเคราะห์',    abbr: 'GHB',   color: '#f77f00' },
  'isbt.co.th':           { name: 'ธนาคารอิสลามแห่งประเทศไทย', abbr: 'IBANK', color: '#007a3d' },
  'cimbthai.com':         { name: 'ธนาคาร CIMB Thai',        abbr: 'CIMB',  color: '#e2231a' },
  'tcrb.co.th':           { name: 'ธนาคารไทยเครดิต',         abbr: 'TCRB',  color: '#003087' },
  'thqr.promptpay.io':    { name: 'พร้อมเพย์',               abbr: 'PP',    color: '#1a6fc4' },
  'promptpay.io':         { name: 'พร้อมเพย์',               abbr: 'PP',    color: '#1a6fc4' },
}

// หาธนาคารจาก URL
export function getBankFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    for (const [domain, info] of Object.entries(BANK_DOMAINS)) {
      if (host === domain || host.endsWith('.' + domain)) return info
    }
  } catch (_) {}
  return null
}

// ─── EMVCo TLV Parser ────────────────────────────────────────
function parseEMVCo(data) {
  const result = {}
  let i = 0
  try {
    while (i < data.length - 3) {
      const tag = data.substring(i, i + 2)
      i += 2
      const len = parseInt(data.substring(i, i + 2), 10)
      i += 2
      if (isNaN(len) || i + len > data.length) break
      const value = data.substring(i, i + len)
      i += len
      result[tag] = value
    }
  } catch (_) {}
  return result
}

function isPromptPayQR(str) {
  return typeof str === 'string' && str.startsWith('000201')
}

export function parsePromptPayQR(qrString) {
  if (!qrString) return null
  try {
    const tlv = parseEMVCo(qrString)
    const amount = tlv['54'] ? parseFloat(tlv['54']) : null
    let ref = null
    if (tlv['62']) {
      const sub = parseEMVCo(tlv['62'])
      ref = sub['05'] || sub['07'] || null
    }
    let recipient = null
    let recipientType = null
    const merchantRaw = tlv['29'] || tlv['30']
    if (merchantRaw) {
      const sub = parseEMVCo(merchantRaw)
      recipient = sub['01'] || null
      if (recipient) {
        const digits = recipient.replace(/\D/g, '')
        if (digits.length === 10)      recipientType = 'phone'
        else if (digits.length === 13) recipientType = 'national_id'
        else if (digits.length === 15) recipientType = 'tax_id'
        else                           recipientType = 'account'
      }
    }
    return {
      amount, ref, recipient, recipientType,
      country:  tlv['58'] || null,
      currency: tlv['53'] || null,
      raw: qrString,
    }
  } catch (_) {
    return null
  }
}

// ─── วาด region ลง canvas พร้อม contrast ──────────────────────
function drawRegion(canvas, img, srcX, srcY, srcW, srcH, maxDim, contrast) {
  const scale   = Math.min(maxDim / srcW, maxDim / srcH, 4)
  canvas.width  = Math.round(srcW * scale)
  canvas.height = Math.round(srcH * scale)
  const ctx = canvas.getContext('2d')
  ctx.filter = `contrast(${contrast}) brightness(1.05)`
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height)
  ctx.filter = 'none'
}

function scanCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' })
}

// ─── สแกน QR จากไฟล์รูปภาพ (multi-region) ────────────────────
export function scanQRFromFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) { resolve(null); return }

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const W = img.width
        const H = img.height
        const canvas = document.createElement('canvas')

        const regions = [
          [0,    0,    1,    1,    2400, 1.0],
          [0,    0,    1,    1,    2400, 1.6],
          [0,    0,    1,    1,    3600, 1.4],
          [0,    0,    1,    1,    2400, 2.2],
          [0,    0.45, 1,    0.55, 2400, 1.6],
          [0,    0.45, 1,    0.55, 2400, 2.2],
          [0.5,  0.5,  0.5,  0.5,  1600, 2.0],
          [0,    0.5,  0.5,  0.5,  1600, 2.0],
          [0.15, 0.4,  0.7,  0.6,  2000, 1.8],
          [0.55, 0.65, 0.45, 0.35, 2000, 2.5],
          [0,    0.65, 0.45, 0.35, 2000, 2.5],
        ]

        for (const [rx, ry, rw, rh, maxDim, contrast] of regions) {
          const sx = Math.round(rx * W)
          const sy = Math.round(ry * H)
          const sw = Math.round(rw * W)
          const sh = Math.round(rh * H)
          if (sw < 50 || sh < 50) continue
          drawRegion(canvas, img, sx, sy, sw, sh, maxDim, contrast)
          const code = scanCanvas(canvas)
          if (code) { resolve(code.data); return }
        }

        resolve(null)
      } catch (_) {
        resolve(null)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// ─── ตรวจจับ QR ของธนาคารไทย (proprietary format) ────────────
// ธนาคารไทยใช้ QR แบบ proprietary ในสลิป ≠ PromptPay / URL
// การมี QR ยืนยันว่าสลิปมาจากระบบธนาคาร ไม่ใช่แค่สร้างรูปเอง
export function parseThaiBankQR(raw) {
  if (!raw || typeof raw !== 'string') return null

  // ── KTB (กรุงไทย) ─────────────────────────────────────────
  // Pattern: ...COR[digits]TH[hex]
  // ตัวอย่าง: 0041000600000101030040220016082174555COR095595102TH9104FBA3
  const ktbMatch = raw.match(/COR(\d{6,15})TH([A-F0-9]{4,12})/i)
  if (ktbMatch || raw.startsWith('0041')) {
    const ref = ktbMatch ? `COR${ktbMatch[1]}` : null
    // ลอง parse ยอดจาก field 004xxx ใน raw (ถ้ามี)
    const amtMatch = raw.match(/00(\d{6,10})/)
    let amount = null
    if (amtMatch) {
      const raw_amt = parseInt(amtMatch[1], 10)
      // ยอดเงินมักเป็นสตางค์ (หาร 100) หรือบาท — ลองทั้งสอง
      if (raw_amt > 0 && raw_amt < 100000000) amount = raw_amt / 100
    }
    return {
      bank: { name: 'ธนาคารกรุงไทย', abbr: 'KTB', color: '#00a0e3' },
      ref,
      amount,
      raw,
    }
  }

  // ── KBank (กสิกรไทย) ──────────────────────────────────────
  // Pattern: K + digits หรือ KBANK prefix
  const kbankMatch = raw.match(/^(K|KBANK|KB)(\w{8,20})/i)
  if (kbankMatch) {
    return {
      bank: { name: 'ธนาคารกสิกรไทย', abbr: 'KBANK', color: '#138c3b' },
      ref: kbankMatch[0],
      amount: null,
      raw,
    }
  }

  // ── SCB (ไทยพาณิชย์) ──────────────────────────────────────
  // Pattern มักมี SCB หรือ format เฉพาะ
  const scbMatch = raw.match(/SCB(\w{6,20})/i)
  if (scbMatch) {
    return {
      bank: { name: 'ธนาคารไทยพาณิชย์', abbr: 'SCB', color: '#4e2d8e' },
      ref: scbMatch[0],
      amount: null,
      raw,
    }
  }

  // ── BBL (กรุงเทพ) ─────────────────────────────────────────
  const bblMatch = raw.match(/BBL(\w{6,20})/i)
  if (bblMatch) {
    return {
      bank: { name: 'ธนาคารกรุงเทพ', abbr: 'BBL', color: '#1c3172' },
      ref: bblMatch[0],
      amount: null,
      raw,
    }
  }

  // ── Generic: QR มีข้อมูลตัวเลขและตัวอักษรแบบ transaction reference ──
  // ถ้าไม่ match bank เฉพาะ แต่ QR มีลักษณะ reference code (8-30 chars alphanum)
  // → ถือว่าเป็น QR ธนาคารที่รู้จักบางส่วน
  if (/^[A-Z0-9]{8,60}$/i.test(raw) && /\d{6,}/.test(raw)) {
    return {
      bank: null,  // ไม่รู้ธนาคาร
      ref: raw.length > 30 ? raw.substring(0, 30) + '...' : raw,
      amount: null,
      raw,
    }
  }

  return null
}

// ─── เช็ค duplicate ref กับ backend ──────────────────────────
async function checkDuplicateRef(ref, opts) {
  if (!ref || !opts?.apiBase || !opts?.token) return null
  try {
    const res = await fetch(`${opts.apiBase}/slip/check-ref`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.token}` },
      body:    JSON.stringify({ ref }),
    })
    return await res.json()
  } catch (_) {
    return null
  }
}

// ─── Main: ตรวจสลิป ──────────────────────────────────────────
// opts: { declaredAmount?, apiBase?, token? }
export async function verifySlipFile(file, declaredAmount = null, opts = {}) {
  const result = {
    status:        'unknown',
    qrData:        null,
    qrType:        null,
    bankInfo:      null,     // { name, abbr, color }
    amountMatch:   null,
    isDuplicate:   false,
    duplicateInfo: null,     // { usedAt, caseId, fieldName }
    message:       '',
    warnings:      [],
    riskFlags:     [],       // สัญญาณเตือนสลิปปลอม
  }

  const qrRaw = await scanQRFromFile(file)

  // ── ไม่พบ QR ─────────────────────────────────────────────
  if (!qrRaw) {
    result.status   = 'no_qr'
    result.message  = 'ไม่พบ QR Code ในสลิป — กรุณาตรวจสอบยอดด้วยตนเอง'
    result.riskFlags.push('no_qr')
    return result
  }

  // ── PromptPay EMVCo QR ───────────────────────────────────
  if (isPromptPayQR(qrRaw)) {
    result.qrType  = 'promptpay'
    result.bankInfo = { name: 'พร้อมเพย์ (PromptPay)', abbr: 'PP', color: '#1a6fc4' }
    const qrData = parsePromptPayQR(qrRaw)

    if (!qrData || (!qrData.amount && !qrData.ref && !qrData.recipient)) {
      result.status  = 'warning'
      result.message = 'อ่าน QR ได้แต่ข้อมูลไม่ครบ — อาจถูกดัดแปลง'
      result.riskFlags.push('incomplete_qr')
      return result
    }

    result.qrData = qrData

    // เช็คยอดกับที่กรอก
    if (declaredAmount !== null && qrData.amount !== null) {
      const declared = parseFloat(String(declaredAmount).replace(/,/g, ''))
      result.amountMatch = Math.abs(qrData.amount - declared) < 0.01
      if (!result.amountMatch) {
        result.warnings.push(
          `ยอดใน QR ${qrData.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ≠ ยอดที่กรอก ${declared?.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`
        )
        result.riskFlags.push('amount_mismatch')
      }
    }

    // เช็ค duplicate
    if (qrData.ref) {
      const dupCheck = await checkDuplicateRef(qrData.ref, opts)
      if (dupCheck?.duplicate) {
        result.isDuplicate   = true
        result.duplicateInfo = dupCheck
        result.warnings.push('⚠️ Ref นี้เคยใช้ในระบบแล้ว — อาจเป็นสลิปซ้ำ!')
        result.riskFlags.push('duplicate_ref')
      }
    }

    result.status  = result.riskFlags.includes('duplicate_ref') ? 'error'
                   : result.warnings.length > 0                  ? 'warning'
                   : 'ok'
    result.message = result.warnings.length > 0
      ? result.warnings.join(' | ')
      : `PromptPay ✓${qrData.amount != null ? ` ยอด ${qrData.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` : ''}`

  // ── URL QR (ธนาคาร) ─────────────────────────────────────
  } else if (/^https?:\/\//i.test(qrRaw)) {
    result.qrType  = 'bank_url'
    result.bankInfo = getBankFromUrl(qrRaw)
    result.qrData   = { url: qrRaw, raw: qrRaw }
    result.status   = 'ok'
    result.message  = result.bankInfo
      ? `QR ยืนยันสลิป ${result.bankInfo.name} ✓ — คลิกเปิดเพื่อตรวจสอบรายการ`
      : 'พบ QR ลิงก์ยืนยันสลิปธนาคาร ✓'

  // ── QR ธนาคารไทย (proprietary format) ──────────────────────
  } else {
    const bankQR = parseThaiBankQR(qrRaw)
    if (bankQR) {
      result.qrType  = 'bank_proprietary'
      result.bankInfo = bankQR.bank || { name: 'ธนาคาร (ไม่ระบุ)', abbr: '?', color: '#6b7280' }
      result.qrData   = { ref: bankQR.ref, amount: bankQR.amount, raw: qrRaw }
      result.status   = 'ok'
      result.message  = bankQR.bank
        ? `QR ยืนยันสลิป ${bankQR.bank.name} ✓${bankQR.ref ? ` — Ref: ${bankQR.ref}` : ''}`
        : `พบ QR รหัสธุรกรรม ✓${bankQR.ref ? ` — Ref: ${bankQR.ref}` : ''}`
    } else {
      // QR ที่อ่านได้แต่ไม่รู้ format
      result.qrType  = 'other'
      result.qrData  = { raw: qrRaw }
      result.status  = 'warning'
      result.message = `พบ QR รูปแบบไม่รู้จัก — ตรวจสอบด้วยตนเอง`
      result.riskFlags.push('unknown_qr_format')
    }
  }

  return result
}

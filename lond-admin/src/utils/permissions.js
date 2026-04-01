// ============ permissions.js ============
// กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ ตาม department

const PERMISSIONS = {
  // Super Admin / Manager — เห็นทุกอย่าง
  super_admin: '*',
  manager: '*',

  // ฝ่ายขาย — เห็น: แชท + รายการเคส + นายหน้า + แดชบอร์ดรวม
  sales: [
    '/dashboard',
    '/calendar',
    '/chat',
    '/sales',
    '/agents',
  ],

  // ฝ่ายประเมิน — เห็น: หน้าประเมิน + ฟอร์มลูกหนี้ (edit only) + แดชบอร์ดรวม
  appraisal: [
    '/dashboard',
    '/calendar',
    '/appraisal',
    '/sales',   // ★ เข้าฟอร์มลูกหนี้ได้ (อัพโหลดรูป + ดูนัด) + แดชบอร์ดรวม (/sales/dashboard)
  ],

  // ฝ่ายอนุมัติสินเชื่อ — เห็น: ผลประเมิน + อนุมัติ + นายทุน + ประมูล + ฟอร์มลูกหนี้ + แดชบอร์ดรวม
  approval: [
    '/dashboard',
    '/calendar',
    '/approval',
    '/appraisal',
    '/sales',   // ★ เข้าฟอร์มลูกหนี้ได้ (ดูตารางวงเงิน + ผลประเมิน) + แดชบอร์ดรวม (/sales/dashboard)
    '/investors', '/investor-auction-history',
    '/auction',
  ],

  // ฝ่ายนิติกรรม — เห็น: นิติกรรม + นายทุน + ยกเลิกเคส + แดชบอร์ดรวม
  legal: [
    '/dashboard',
    '/calendar',
    '/legal',
    '/sales',   // ★ แดชบอร์ดรวม (/sales/dashboard)
    '/investors',
    '/cancellation',
  ],

  // ฝ่ายออกสัญญา — เห็น: ออกสัญญา + ยกเลิกเคส + แดชบอร์ดรวม
  issuing: [
    '/dashboard',
    '/calendar',
    '/issuing',
    '/sales',   // ★ แดชบอร์ดรวม (/sales/dashboard)
    '/cancellation',
  ],

  // ฝ่ายบัญชี — เห็น: บัญชี + แดชบอร์ดรวม
  accounting: [
    '/dashboard',
    '/calendar',
    '/accounting',
    '/sales',   // ★ แดชบอร์ดรวม (/sales/dashboard)
  ],

  // ฝ่ายประมูลทรัพย์ + แดชบอร์ดรวม
  auction: [
    '/dashboard',
    '/calendar',
    '/auction',
    '/sales',   // ★ แดชบอร์ดรวม (/sales/dashboard)
    '/investors', '/investor-auction-history',
  ],
}

// ถ้า department ไม่อยู่ใน list → ให้เข้า dashboard + calendar ได้อย่างน้อย (fallback)
const FALLBACK_PATHS = ['/dashboard', '/calendar']

export function hasAccess(department, path) {
  if (!department) return false
  const allowed = PERMISSIONS[department]
  // department ไม่รู้จัก → fallback ให้เข้า dashboard + calendar ได้
  if (!allowed) return FALLBACK_PATHS.includes(path)
  if (allowed === '*') return true
  return allowed.includes(path)
}

export function getAllowedPaths(department) {
  if (!department) return []
  const allowed = PERMISSIONS[department]
  if (!allowed) return []
  if (allowed === '*') return null
  return allowed
}

// แต่ละฝ่ายเข้าหน้า dashboard ของตัวเอง (route เดียวกัน, render ต่างกันตาม dept)
export function getDefaultPage(department) {
  return '/dashboard'
}

export default PERMISSIONS

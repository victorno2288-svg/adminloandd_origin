const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// =========================================================
//  โครงสร้างโฟลเดอร์ uploads/  (path ต้องตรงกับ controllers)
//  ├── id-cards/          บัตรประชาชน (id_card_image, debtor_id_card, borrower_id_card)
//  ├── deeds/             โฉนดที่ดิน
//  ├── properties/        รูปถ่ายทรัพย์
//  ├── appraisal-properties/  รูปทรัพย์ประเมิน
//  ├── permits/           ใบอนุญาตก่อสร้าง
//  ├── videos/            วิดีโอทรัพย์
//  ├── slips/             สลิปโอนเงิน
//  ├── appraisal-books/   สมุดประเมิน
//  ├── auction-docs/      เอกสารโอนกรรมสิทธิ์
//  ├── contracts/broker/  สัญญานายหน้า
//  └── general/           อื่นๆ
// =========================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'general'

    // บัตรประชาชน (ลูกค้า, ลูกหนี้, นายหน้า, คู่สมรส)
    if (['id_card_image','debtor_id_card','borrower_id_card','spouse_id_card_upload','agent_id_card_image'].includes(file.fieldname))
                                                          folder = 'id-cards'
    // โฉนดที่ดิน
    else if (file.fieldname === 'deed_image')             folder = 'deeds'
    // รูปทรัพย์สิน
    else if (file.fieldname === 'property_image')         folder = 'properties'
    else if (file.fieldname === 'appraisal_property_image') folder = 'appraisal-properties'
    else if (file.fieldname === 'building_permit')        folder = 'permits'
    else if (file.fieldname === 'property_video')         folder = 'videos'
    // ตารางผ่อนชำระ (ฝ่ายขาย)
    else if (file.fieldname === 'payment_schedule_file')  folder = 'payment-schedules'
    // สลิป/บัญชี
    else if (file.fieldname === 'slip_image')             folder = 'slips'
    // สลิปโอนเงินค่าปากถุง (ฝ่ายขาย + นิติ + บัญชี)
    else if (file.fieldname === 'transaction_slip')       folder = 'slips'
    // สลิปค่าหักล่วงหน้า
    else if (file.fieldname === 'advance_slip')           folder = 'slips'
    // สมุดประเมิน
    else if (file.fieldname === 'appraisal_book_image')   folder = 'appraisal-books'
    // สลิปค่าคอมมิชชั่น (accounting)
    else if (file.fieldname === 'commission_slip')        folder = 'slips'
    // สัญญาแต่งตั้งนายหน้า + บัตรประชาชนนายหน้า (ในเคส) + สัญญาในโปรไฟล์นายหน้า
    else if (['broker_contract_file','broker_id_file','agent_contract_file'].includes(file.fieldname))
                                                          folder = 'contracts/broker'
    // เอกสารโอนกรรมสิทธิ์ / ประมูล + เอกสาร Checklist ส่วนตัว/สมรส
    else if (['house_reg_book','house_reg_book_legal','name_change_doc','divorce_doc',
              'spouse_consent_doc','spouse_id_card','spouse_reg_copy',
              'marriage_cert','spouse_name_change_doc',
              // Checklist ส่วนบุคคล
              'borrower_id_card','house_reg_book','single_cert','death_cert',
              'will_court_doc','testator_house_reg',
              // Checklist ทรัพย์ (ทุก property type)
              'deed_copy','house_reg_prop','sale_contract','debt_free_cert',
              'blueprint','property_photos','land_tax_receipt','maps_url',
              // Condo
              'condo_title_deed','condo_location_map','common_fee_receipt','floor_plan',
              // Land
              'location_sketch_map','land_use_cert',
              // Shophouse
              'rental_contract','business_reg',
             ].includes(file.fieldname))
                                                          folder = 'auction-docs'

    const dir = path.join(uploadDir, folder)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`
    cb(null, name)
  }
})

const fileFilter = (req, file, cb) => {
  // อนุญาตรูปภาพ + วิดีโอ
  if (file.fieldname === 'property_video') {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์วิดีโอ'), false)
    }
  } else {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพหรือ PDF'), false)
    }
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

module.exports = upload
/**
 * sharedChecklistRoutes.js
 *
 * Shared checklist-docs and checklist-ticks routes accessible by ALL departments.
 * Mounted at /api/admin/debtors with authMiddleware only (no dept restriction).
 *
 * This allows every department (legal, appraisal, approval, issuing, etc.) to:
 *   - View checklist docs uploaded by sales
 *   - Upload additional docs
 *   - Remove docs
 *   - Tick/untick checklist items
 *
 * Sales dept continues to use /api/admin/sales/debtors/:lrId/... (unchanged).
 */
const express = require('express')
const router = express.Router()
const upload = require('../config/upload')
const salesController = require('../controllers/salesController')

// ── multer upload config (same fields as salesRoutes checklistUpload) ──────────
const checklistUpload = upload.fields([
  // ★ Personal / marital docs
  { name: 'borrower_id_card',   maxCount: 5 },
  { name: 'house_reg_book',     maxCount: 5 },
  { name: 'name_change_doc',    maxCount: 5 },
  { name: 'divorce_doc',        maxCount: 5 },
  { name: 'spouse_id_card',     maxCount: 5 },
  { name: 'spouse_reg_copy',    maxCount: 5 },
  { name: 'marriage_cert',      maxCount: 5 },
  { name: 'single_cert',        maxCount: 5 },
  { name: 'death_cert',         maxCount: 5 },
  { name: 'will_court_doc',     maxCount: 5 },
  { name: 'testator_house_reg', maxCount: 5 },
  // ★ Property type checklist docs
  { name: 'deed_copy',          maxCount: 5 },
  { name: 'building_permit',    maxCount: 5 },
  { name: 'house_reg_prop',     maxCount: 5 },
  { name: 'sale_contract',      maxCount: 5 },
  { name: 'debt_free_cert',     maxCount: 5 },
  { name: 'blueprint',          maxCount: 5 },
  { name: 'property_photos',    maxCount: 20 },
  { name: 'land_tax_receipt',   maxCount: 5 },
  { name: 'maps_url',           maxCount: 5 },
  // ★ Condo docs
  { name: 'condo_title_deed',   maxCount: 5 },
  { name: 'condo_location_map', maxCount: 5 },
  { name: 'common_fee_receipt', maxCount: 5 },
  { name: 'floor_plan',         maxCount: 5 },
  // ★ Land docs
  { name: 'location_sketch_map', maxCount: 5 },
  { name: 'land_use_cert',       maxCount: 5 },
  // ★ Shophouse docs
  { name: 'rental_contract',    maxCount: 5 },
  { name: 'business_reg',       maxCount: 5 },
  // ★ Video
  { name: 'property_video',     maxCount: 5 },
])

// ── Checklist docs ─────────────────────────────────────────────────────────────
router.get('/:lrId/checklist-docs', salesController.getChecklistDocs)
router.post('/:lrId/checklist-docs', checklistUpload, salesController.uploadChecklistDoc)
router.post('/:lrId/checklist-docs/remove', salesController.removeChecklistDoc)

// ── Checklist ticks ────────────────────────────────────────────────────────────
router.get('/:lrId/checklist-ticks', salesController.getChecklistTicks)
router.patch('/:lrId/checklist-ticks', salesController.saveChecklistTick)

module.exports = router

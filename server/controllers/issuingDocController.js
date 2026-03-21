const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const { generateDocument, getTemplateFields, TEMPLATE_TYPES } = require('../templates/docGenerator');

// Ensure output directory exists
const ensureOutputDir = (callback) => {
  const outputDir = path.join(__dirname, '..', 'uploads', 'contracts', 'generated');
  fs.mkdir(outputDir, { recursive: true }, (err) => {
    if (err) return callback(err);
    callback(null, outputDir);
  });
};

// Map database field names to template field names
const mapCaseDataToTemplate = (caseData, loanData) => {
  return {
    // ผู้ซื้อฝาก / ผู้ให้กู้ = บริษัท (default)
    buyer_name: 'บริษัท โลนด์ ดีดี จำกัด',
    buyer_id_number: '0105566225836',
    buyer_address: '87 ถนนสุวินทวงศ์ แขวงมีนบุรี เขตมีนบุรี กรุงเทพฯ 10510',
    buyer_phone: '081-638-6966',
    // ผู้ขายฝาก / ผู้กู้ = ลูกหนี้
    seller_name: loanData.contact_name || '',
    seller_id_number: '',
    seller_phone: loanData.contact_phone || '',
    seller_address: [loanData.house_no, loanData.village_name, loanData.subdistrict, loanData.district, loanData.province].filter(Boolean).join(' '),
    approval_type: caseData.approval_type || '',

    // Property details
    property_type: loanData.property_type || '',
    property_code: caseData.case_code || '',
    deed_no: loanData.deed_number || '',
    land_no: '',
    property_address: loanData.property_address || '',
    tambon: loanData.subdistrict || '',
    amphoe: loanData.district || '',
    province: loanData.province || '',
    area_rai: 0,
    area_ngan: 0,
    area_sqw: 0,
    area_sqm: 0,
    land_area: loanData.land_area || '',
    land_office: '',

    // Financial details
    contract_amount: caseData.approved_credit || 0,
    interest_rate: caseData.interest_per_year || 0,
    interest_per_month: caseData.interest_per_month || 0,
    operation_fee: caseData.operation_fee || 0,

    // Document reference
    doc_number: caseData.case_code || '',
    debtor_code: loanData.debtor_code || '',
    contract_date: new Date().toISOString().split('T')[0]
  };
};

// POST: Generate a document
exports.generateDocument = (req, res) => {
  const { case_id, template_type, version } = req.body;
  const field_overrides = req.body.field_overrides || {};
  const documentVersion = version || 1;

  // Validate required fields
  if (!case_id || !template_type) {
    return res.status(400).json({
      success: false,
      message: 'case_id and template_type are required'
    });
  }

  // Fetch case data
  const caseQuery = `
    SELECT
      c.id, c.case_code,
      lr.id AS loan_request_id, lr.debtor_code, lr.contact_name, lr.contact_phone,
      lr.property_type, lr.property_address, lr.province, lr.district, lr.subdistrict,
      lr.house_no, lr.village_name, lr.deed_number, lr.land_area, lr.location_url,
      at2.approved_credit, at2.interest_per_year, at2.interest_per_month,
      at2.approval_type, at2.operation_fee
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN approval_transactions at2 ON at2.case_id = c.id AND at2.is_cancelled = 0
    WHERE c.id = ?
  `;

  db.query(caseQuery, [case_id], (err, results) => {
    if (err) {
      console.error('Error fetching case data:', err);
      return res.status(500).json({ success: false, message: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const caseData = results[0];

    // Map database fields to template fields
    let templateData = mapCaseDataToTemplate(caseData, caseData);

    // Merge with field overrides (overrides take priority)
    templateData = { ...templateData, ...field_overrides };

    try {
      // Generate document HTML
      const { html, filename: generatedFilename } = generateDocument(template_type, documentVersion, templateData);

      // Ensure output directory exists and save file
      ensureOutputDir((err, outputDir) => {
        if (err) {
          console.error('Error creating output directory:', err);
          return res.status(500).json({ success: false, message: 'Failed to create output directory' });
        }

        // Create filename with case code, template type, version, and timestamp
        const timestamp = new Date().getTime();
        const filename = `${caseData.case_code}_${template_type}_v${documentVersion}_${timestamp}.doc`;
        const filepath = path.join(outputDir, filename);
        const relativePath = `uploads/contracts/generated/${filename}`;

        // Save HTML as .doc file
        fs.writeFile(filepath, html, 'utf-8', (err) => {
          if (err) {
            console.error('Error saving document:', err);
            return res.status(500).json({ success: false, message: 'Failed to save document' });
          }

          res.json({
            success: true,
            data: {
              file_path: relativePath,
              filename: filename,
              case_id: case_id,
              template_type: template_type,
              version: documentVersion
            }
          });
        });
      });
    } catch (error) {
      console.error('Error generating document:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });
};

// GET: Get template field definitions
exports.getTemplateInfo = (req, res) => {
  const { template_type } = req.query;

  if (!template_type) {
    return res.status(400).json({
      success: false,
      message: 'template_type query parameter is required'
    });
  }

  try {
    const fields = getTemplateFields(template_type);
    if (fields.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Unknown template type: ${template_type}`
      });
    }

    res.json({
      success: true,
      data: {
        template_type: template_type,
        fields: fields
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET: Get case data for document generation (pre-fill form)
exports.getCaseDataForDoc = (req, res) => {
  const case_id = req.params.caseId;

  if (!case_id) {
    return res.status(400).json({
      success: false,
      message: 'caseId parameter is required'
    });
  }

  const caseQuery = `
    SELECT
      c.id, c.case_code,
      lr.id AS loan_request_id, lr.debtor_code, lr.contact_name, lr.contact_phone,
      lr.property_type, lr.property_address, lr.province, lr.district, lr.subdistrict,
      lr.house_no, lr.village_name, lr.deed_number, lr.land_area, lr.location_url,
      at2.approved_credit, at2.interest_per_year, at2.interest_per_month,
      at2.approval_type, at2.operation_fee
    FROM cases c
    LEFT JOIN loan_requests lr ON lr.id = c.loan_request_id
    LEFT JOIN approval_transactions at2 ON at2.case_id = c.id AND at2.is_cancelled = 0
    WHERE c.id = ?
  `;

  db.query(caseQuery, [case_id], (err, results) => {
    if (err) {
      console.error('Error fetching case data:', err);
      return res.status(500).json({ success: false, message: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const caseData = results[0];

    // Map to template field names
    const mappedData = mapCaseDataToTemplate(caseData, caseData);

    res.json({
      success: true,
      data: mappedData
    });
  });
};

// GET: List generated documents for a case
exports.listGeneratedDocs = (req, res) => {
  const case_id = req.params.caseId;

  if (!case_id) {
    return res.status(400).json({
      success: false,
      message: 'caseId parameter is required'
    });
  }

  const outputDir = path.join(__dirname, '..', 'uploads', 'contracts', 'generated');

  // First, get case code to identify relevant files
  const caseQuery = 'SELECT case_code FROM cases WHERE id = ?';

  db.query(caseQuery, [case_id], (err, results) => {
    if (err) {
      console.error('Error fetching case:', err);
      return res.status(500).json({ success: false, message: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const caseCode = results[0].case_code;

    // Read files from output directory
    fs.readdir(outputDir, (err, files) => {
      if (err) {
        // Directory doesn't exist yet
        if (err.code === 'ENOENT') {
          return res.json({
            success: true,
            data: []
          });
        }
        console.error('Error reading directory:', err);
        return res.status(500).json({ success: false, message: err.message });
      }

      // Filter files for this case and extract metadata
      const caseFiles = files
        .filter(file => file.startsWith(caseCode + '_'))
        .map(filename => {
          // Parse filename: {case_code}_{template_type}_v{version}_{timestamp}.doc
          const parts = filename.replace('.doc', '').split('_');
          if (parts.length >= 3) {
            const templateType = parts.slice(1, -2).join('_');
            const version = parts[parts.length - 2].replace('v', '');

            return {
              filename: filename,
              file_path: `uploads/contracts/generated/${filename}`,
              template_type: templateType,
              version: parseInt(version) || 1,
              created_at: new Date(parseInt(parts[parts.length - 1]))
            };
          }
          return null;
        })
        .filter(item => item !== null)
        .sort((a, b) => b.created_at - a.created_at);

      res.json({
        success: true,
        data: caseFiles
      });
    });
  });
};

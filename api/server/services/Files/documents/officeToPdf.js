const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { logger } = require('@librechat/data-schemas');

/**
 * Office document types that can be converted to PDF
 */
const OFFICE_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/vnd.ms-powerpoint', // ppt
];

/**
 * Check if a file type is an Office document that can be converted
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean}
 */
function isOfficeDocument(mimeType) {
  return OFFICE_MIME_TYPES.includes(mimeType);
}

/**
 * Convert an Office document (Excel, Word, PowerPoint) to PDF using LibreOffice
 * @param {string} filePath - Path to the Office document
 * @param {Object} options - Conversion options
 * @param {number} options.timeout - Timeout in milliseconds (default: 120000)
 * @returns {Promise<string|null>} - Path to the converted PDF or null if conversion failed
 */
async function convertOfficeToPdf(filePath, options = {}) {
  const { timeout = 120000 } = options;

  try {
    const outputDir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const pdfPath = path.join(outputDir, `${baseName}.pdf`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn(`[officeToPdf] File not found: ${filePath}`);
      return null;
    }

    // Remove existing PDF if any (to ensure fresh conversion)
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }

    logger.info(`[officeToPdf] Converting ${path.basename(filePath)} to PDF...`);

    // LibreOffice headless conversion
    // --headless: Run without GUI
    // --convert-to pdf: Convert to PDF format
    // --outdir: Output directory
    execSync(
      `libreoffice --headless --convert-to pdf --outdir "${outputDir}" "${filePath}"`,
      {
        timeout,
        stdio: 'pipe', // Suppress output
        env: {
          ...process.env,
          HOME: '/tmp', // LibreOffice needs a writable home directory
        },
      },
    );

    // Verify conversion succeeded
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      logger.info(`[officeToPdf] Conversion successful: ${pdfPath} (${stats.size} bytes)`);
      return pdfPath;
    }

    logger.warn(`[officeToPdf] Conversion completed but PDF not found: ${pdfPath}`);
    return null;
  } catch (error) {
    logger.error(`[officeToPdf] Conversion failed for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Clean up converted PDF file
 * @param {string} pdfPath - Path to the PDF file to delete
 */
function cleanupConvertedPdf(pdfPath) {
  try {
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      logger.debug(`[officeToPdf] Cleaned up: ${pdfPath}`);
    }
  } catch (error) {
    logger.warn(`[officeToPdf] Failed to cleanup ${pdfPath}:`, error.message);
  }
}

module.exports = {
  OFFICE_MIME_TYPES,
  isOfficeDocument,
  convertOfficeToPdf,
  cleanupConvertedPdf,
};

// fileController.js
// Controller for file upload endpoints (Gofile integration)
import { uploadFile } from '../services/gofileService.js';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';

// Utility: Remove temp file after upload
function cleanupTempFile(filepath) {
  fs.unlink(filepath, err => {
    if (err) console.warn('Failed to remove temp file:', filepath, err.message);
  });
}

// Utility: Validate file type and size (customize as needed)
function validateFile(file, allowedTypes = null, maxSizeMB = 100) {
  if (!file) return 'No file provided.';
  if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) return `File too large (max ${maxSizeMB}MB).`;
  if (allowedTypes && !allowedTypes.includes(file.mimetype)) return 'File type not allowed.';
  return null;
}

/**
 * POST /api/files/upload
 * Upload a file to Gofile and return the Gofile response.
 * - Only allows single file upload (field: file)
 * - Validates file size and type
 * - Cleans up temp file after upload
 * - Returns clear error messages
 */
export const upload = async (req, res) => {
  const form = formidable({ multiples: false, maxFileSize: 200 * 1024 * 1024 }); // 200MB max
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    const file = files.file;
    const allowedTypes = null; // e.g., ['image/png', 'image/jpeg', 'application/pdf']
    const maxSizeMB = 200;
    const validationError = validateFile(file, allowedTypes, maxSizeMB);
    if (validationError) {
      if (file && file.filepath) cleanupTempFile(file.filepath);
      return res.status(400).json({ message: validationError });
    }
    try {
      const fileBuffer = fs.readFileSync(file.filepath);
      const result = await uploadFile(fileBuffer, file.originalFilename);
      cleanupTempFile(file.filepath);
      // Optionally, log upload event or store metadata in DB here
      res.json({ gofile: result });
    } catch (e) {
      if (file && file.filepath) cleanupTempFile(file.filepath);
      res.status(500).json({ message: 'Gofile upload failed', error: e.message });
    }
  });
};

// fileController.js
// Controller for file upload endpoints (Gofile integration)
import { uploadFile } from '../services/gofileService.js';
import { storeContent } from '../services/vaultService.js';
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

// Utility: Determine if a file is sensitive based on type, name, or user input
function isSensitiveFile(file, fields) {
  // 1. User input (form field 'sensitive')
  if (fields.sensitive === 'true') return true;
  // 2. File type (e.g., application/pdf, application/zip, text/plain, etc.)
  const sensitiveTypes = [
    'application/pdf',
    'application/zip',
    'application/x-pem-file',
    'application/x-pkcs12',
    'application/x-pkcs8',
    'application/x-x509-ca-cert',
    'application/x-x509-user-cert',
    'application/x-x509-server-cert',
    'application/x-x509-crl',
    'application/x-x509-cert',
    'application/x-pem-file',
    'application/x-ssh-key',
    'application/x-gpg-key',
    'application/x-pgp-key',
    'application/x-msdownload',
    'application/octet-stream',
    'text/plain', // for secrets/keys
  ];
  if (sensitiveTypes.includes(file.mimetype)) return true;
  // 3. File extension (e.g., .key, .pem, .env, .p12, .crt, .gpg, .pgp, .enc)
  const sensitiveExts = ['.key', '.pem', '.env', '.p12', '.crt', '.gpg', '.pgp', '.enc', '.secret', '.vault'];
  const ext = path.extname(file.originalFilename || '').toLowerCase();
  if (sensitiveExts.includes(ext)) return true;
  return false;
}

/**
 * POST /api/files/upload
 * Upload a file to Gofile or Vault based on sensitivity.
 * - If `fields.sensitive` is 'true', store in Vault, else use Gofile.
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
      const sensitive = isSensitiveFile(file, fields);
      if (sensitive) {
        // Store in Vault (as base64 string)
        const base64Content = fileBuffer.toString('base64');
        // You may want to use user/tenant info from req for path/keyId
        const vaultPath = `/files/${Date.now()}_${file.originalFilename}`;
        // TODO: get keyId from user/tenant context (e.g., req.user.vaultKeyId)
        const keyId = req.user?.vaultKeyId || null;
        const vaultResult = await storeContent(vaultPath, base64Content, keyId);
        cleanupTempFile(file.filepath);
        // Optionally, log upload event or store metadata in DB here
        return res.json({ vault: { path: vaultPath, result: vaultResult } });
      } else {
        // Store in Gofile
        const result = await uploadFile(fileBuffer, file.originalFilename);
        cleanupTempFile(file.filepath);
        // Optionally, log upload event or store metadata in DB here
        return res.json({ gofile: result });
      }
    } catch (e) {
      if (file && file.filepath) cleanupTempFile(file.filepath);
      res.status(500).json({ message: 'File upload failed', error: e.message });
    }
  });
};

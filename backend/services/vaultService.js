// vaultService.js
// Service for interacting with the Vault API (encryption, secrets, secure content)

import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import Joi from 'joi';
const { VAULT_API, VAULT_API_KEY } = require('../config/vault');

// Create a rate-limited axios instance
const http = rateLimit(axios.create(), { maxRequests: 5, perMilliseconds: 1000 });

function getHeaders() {
  return {
    'Authorization': `Bearer ${VAULT_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// Input validation schemas
const pathSchema = Joi.string().min(1).max(255).pattern(/^\//).required();
const contentSchema = Joi.string().min(1).required();
const keyIdSchema = Joi.string().alphanum().min(8).max(64).allow(null);
const nameSchema = Joi.string().min(1).max(128).required();
const storeSchema = Joi.string().min(1).max(255).allow(null);

// Store encrypted content
export async function storeContent(path, content, keyId = null) {
  // Validate inputs
  const { error: pathErr } = pathSchema.validate(path);
  const { error: contentErr } = contentSchema.validate(content);
  const { error: keyIdErr } = keyIdSchema.validate(keyId);
  if (pathErr || contentErr || keyIdErr) {
    throw new Error(`Invalid input: ${[pathErr, contentErr, keyIdErr].filter(Boolean).map(e => e.message).join('; ')}`);
  }
  try {
    const res = await http.post(
      `${VAULT_API}/content/store`,
      { path, content, keyId },
      { headers: getHeaders() }
    );
    return res.data;
  } catch (err) {
    // Retry logic: try once more if network error
    if (err.code === 'ECONNABORTED' || err.response?.status >= 500) {
      const res = await http.post(
        `${VAULT_API}/content/store`,
        { path, content, keyId },
        { headers: getHeaders() }
      );
      return res.data;
    }
    throw err;
  }
}

// Retrieve encrypted content
export async function getContent(path) {
  const { error: pathErr } = pathSchema.validate(path);
  if (pathErr) throw new Error(`Invalid path: ${pathErr.message}`);
  try {
    const res = await http.get(
      `${VAULT_API}/content/get`,
      { params: { path }, headers: getHeaders() }
    );
    return res.data;
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.response?.status >= 500) {
      const res = await http.get(
        `${VAULT_API}/content/get`,
        { params: { path }, headers: getHeaders() }
      );
      return res.data;
    }
    throw err;
  }
}

// Generate a new encryption key (optionally in a specific store path)
export async function generateKey(name, store = null) {
  const { error: nameErr } = nameSchema.validate(name);
  const { error: storeErr } = storeSchema.validate(store);
  if (nameErr || storeErr) {
    throw new Error(`Invalid input: ${[nameErr, storeErr].filter(Boolean).map(e => e.message).join('; ')}`);
  }
  const params = {};
  if (store) params.store = store;
  try {
    const res = await http.post(
      `${VAULT_API}/keys/generate`,
      { name },
      { headers: getHeaders(), params }
    );
    return res.data;
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.response?.status >= 500) {
      const res = await http.post(
        `${VAULT_API}/keys/generate`,
        { name },
        { headers: getHeaders(), params }
      );
      return res.data;
    }
    throw err;
  }
}

// List stored content (simulate file system)
export async function listContent(prefix = '/') {
  const { error: pathErr } = pathSchema.validate(prefix);
  if (pathErr) throw new Error(`Invalid prefix: ${pathErr.message}`);
  try {
    const res = await http.get(
      `${VAULT_API}/content/list`,
      { params: { prefix }, headers: getHeaders() }
    );
    return res.data;
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.response?.status >= 500) {
      const res = await http.get(
        `${VAULT_API}/content/list`,
        { params: { prefix }, headers: getHeaders() }
      );
      return res.data;
    }
    throw err;
  }
}

// Optionally: add more methods for key management, encryption, etc.

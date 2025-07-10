// vaultService.js
// Service for interacting with the Vault API (encryption, secrets, secure content)
import axios from 'axios';

const VAULT_API = process.env.VAULT_API_URL || 'https://api.vault.example.com'; // Set your Vault API URL
const VAULT_API_KEY = process.env.VAULT_API_KEY;

function getHeaders() {
  return {
    'Authorization': `Bearer ${VAULT_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// Store encrypted content
export async function storeContent(path, content, keyId = null) {
  const res = await axios.post(
    `${VAULT_API}/content/store`,
    { path, content, keyId },
    { headers: getHeaders() }
  );
  return res.data;
}

// Retrieve encrypted content
export async function getContent(path) {
  const res = await axios.get(
    `${VAULT_API}/content/get`,
    { params: { path }, headers: getHeaders() }
  );
  return res.data;
}

// Generate a new encryption key (optionally in a specific store path)
export async function generateKey(name, store = null) {
  const params = {};
  if (store) params.store = store;
  const res = await axios.post(
    `${VAULT_API}/keys/generate`,
    { name },
    { headers: getHeaders(), params }
  );
  return res.data;
}

// List stored content (simulate file system)
export async function listContent(prefix = '/') {
  const res = await axios.get(
    `${VAULT_API}/content/list`,
    { params: { prefix }, headers: getHeaders() }
  );
  return res.data;
}

// Optionally: add more methods for key management, encryption, etc.

// config/vault.js
// Centralized config for Vault API

const VAULT_API = process.env.VAULT_API_URL || 'https://api.vault.example.com';
const VAULT_API_KEY = process.env.VAULT_API_KEY;

module.exports = {
  VAULT_API,
  VAULT_API_KEY,
};

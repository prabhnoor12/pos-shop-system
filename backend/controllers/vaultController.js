// vaultController.js
// Controller for Vault API integration endpoints
import * as vaultService from '../services/vaultService.js';

// Store encrypted content
export async function storeContent(req, res) {
  const { path, content, keyId } = req.body;
  if (!path || !content) {
    return res.status(400).json({ message: 'Path and content are required.' });
  }
  try {
    const result = await vaultService.storeContent(path, content, keyId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Vault store error', error: e.message });
  }
}

// Retrieve encrypted content
export async function getContent(req, res) {
  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ message: 'Path is required.' });
  }
  try {
    const result = await vaultService.getContent(path);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Vault get error', error: e.message });
  }
}

// Generate a new encryption key
export async function generateKey(req, res) {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Key name is required.' });
  }
  try {
    const result = await vaultService.generateKey(name);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Vault key generation error', error: e.message });
  }
}

// Generate a new encryption key (with optional store path)
export async function generateKeyWithStore(req, res) {
  const { name, store } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Key name is required.' });
  }
  try {
    const result = await vaultService.generateKey(name, store);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Vault key generation error', error: e.message });
  }
}

// List stored content
export async function listContent(req, res) {
  const { prefix } = req.query;
  try {
    const result = await vaultService.listContent(prefix);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Vault list error', error: e.message });
  }
}

// gofileService.js
// Service for interacting with the Gofile API
import axios from 'axios';
import FormData from 'form-data';

const GOFILE_API = 'https://api.gofile.io';
const GOFILE_ACCOUNT = process.env.GOFILE_ACCOUNT_ID;
const GOFILE_TOKEN = process.env.GOFILE_API_TOKEN;

export async function uploadFile(fileBuffer, fileName, folderId = null) {
  const formData = new FormData();
  formData.append('file', fileBuffer, fileName);
  if (folderId) formData.append('folderId', folderId);
  if (GOFILE_TOKEN) formData.append('token', GOFILE_TOKEN);
  if (GOFILE_ACCOUNT) formData.append('accountId', GOFILE_ACCOUNT);

  const res = await axios.post(`${GOFILE_API}/uploadFile`, formData, {
    headers: formData.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return res.data;
}

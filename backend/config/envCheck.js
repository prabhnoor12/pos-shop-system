// envCheck.js
const requiredEnv = ['JWT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn('WARNING: Missing required environment variables:', missingEnv.join(', '));
}

export default missingEnv;

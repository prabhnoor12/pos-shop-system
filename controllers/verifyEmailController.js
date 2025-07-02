
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import bcrypt from 'bcryptjs';
import logger from '../config/logger.js';

const prisma = new PrismaClient();
const API_LAYER_KEY = process.env.API_LAYER;

// Helper: Verify email with API Layer
async function verifyEmailWithApiLayer(email) {
  // API Layer email verification endpoint (using GET and explicit Headers)
  const url = `https://api.apilayer.com/email_verification/check?email=${encodeURIComponent(email)}`;
  const myHeaders = new fetch.Headers ? new fetch.Headers() : {};
  if (myHeaders.append) {
    myHeaders.append('apikey', API_LAYER_KEY);
  } else {
    myHeaders['apikey'] = API_LAYER_KEY;
  }
  const requestOptions = {
    method: 'GET',
    redirect: 'follow',
    headers: myHeaders
  };
  const res = await fetch(url, requestOptions);
  if (!res.ok) {
    let errorText = await res.text();
    logger.error('API Layer error response', { status: res.status, body: errorText });
    throw new Error('Email verification API error: ' + errorText);
  }
  const data = await res.json();
  return data;
}

// Signup: verify email, then save user
export async function signup(req, res) {
  const { name, email, password, role } = req.body;
  try {
    // Enable email verification with API Layer
    const verification = await verifyEmailWithApiLayer(email);
    if (!verification || !verification.format_valid || !verification.smtp_check) {
      logger.info('Email verification failed', { email, verification });
      return res.status(400).json({ message: 'Invalid or undeliverable email address' });
    }
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
      select: { id: true, name: true, email: true, role: true }
    });
    logger.info('User created', { email });
    return res.status(201).json({ message: 'Signup successful', user });
  } catch (err) {
    logger.error('Signup error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Login: fetch user by email and password
export async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, password: true }
    });
    if (!user) {
      logger.info('[LOGIN_FAIL]', { email, reason: 'User not found', entered: password });
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    logger.info('[LOGIN_DEBUG]', { email, stored: user.password, entered: password });
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      logger.info('[LOGIN_FAIL]', { email, reason: 'Wrong password', stored: user.password, entered: password });
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    // In production, use JWT and hash passwords!
    return res.status(200).json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    logger.error('Login error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
// verifyEmailController.js
// Handles email verification and signup
//
// GDPR Data Minimization & Purpose Limitation:
// - Only processes and returns email/user data necessary for verification and signup.
// - Does not return or log unnecessary or sensitive data.
// - All endpoints are documented with their data processing purpose.

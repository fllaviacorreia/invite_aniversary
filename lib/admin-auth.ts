import 'server-only'

import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const ADMIN_COOKIE = 'invitation_admin_session'
const SESSION_DURATION_SECONDS = 8 * 60 * 60

type AdminSession = {
  role: 'admin'
  expiresAt: number
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  return secret && secret.length >= 32 ? secret : null
}

export function isAdminAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && getSessionSecret())
}

export function verifyAdminPassword(password: string) {
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedPassword || !getSessionSecret()) return false

  const suppliedHash = createHash('sha256').update(password).digest()
  const expectedHash = createHash('sha256').update(expectedPassword).digest()
  return timingSafeEqual(suppliedHash, expectedHash)
}

function signPayload(payload: string) {
  const secret = getSessionSecret()
  if (!secret) return null
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function createSessionToken() {
  const session: AdminSession = {
    role: 'admin',
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  }
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = signPayload(payload)
  return signature ? `${payload}.${signature}` : null
}

function verifySessionToken(token: string | undefined) {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const expectedSignature = signPayload(payload)
  if (!expectedSignature) return false

  const suppliedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return false

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AdminSession
    return session.role === 'admin' && session.expiresAt > Date.now()
  } catch {
    return false
  }
}

export async function createAdminSession() {
  const token = createSessionToken()
  if (!token) return false

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
    priority: 'high',
  })
  return true
}

export async function hasAdminSession() {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value)
}

export async function deleteAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
}

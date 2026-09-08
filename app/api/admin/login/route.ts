import { createAdminSession, isAdminAuthConfigured, verifyAdminPassword } from '@/lib/admin-auth'

type AttemptRecord = { count: number; resetAt: number }

const globalAttempts = globalThis as typeof globalThis & {
  invitationAdminAttempts?: Map<string, AttemptRecord>
}

const attempts = globalAttempts.invitationAdminAttempts ?? new Map<string, AttemptRecord>()
globalAttempts.invitationAdminAttempts = attempts

function getClientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return Response.json({ error: 'A autenticação administrativa ainda não foi configurada.' }, { status: 503 })
  }

  const clientKey = getClientKey(request)
  const now = Date.now()
  const currentAttempt = attempts.get(clientKey)
  if (currentAttempt && currentAttempt.resetAt > now && currentAttempt.count >= 5) {
    return Response.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' },
      { status: 429, headers: { 'Retry-After': '900' } },
    )
  }

  let password = ''
  try {
    const body = await request.json() as { password?: unknown }
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return Response.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  if (!verifyAdminPassword(password)) {
    const record = currentAttempt && currentAttempt.resetAt > now
      ? { count: currentAttempt.count + 1, resetAt: currentAttempt.resetAt }
      : { count: 1, resetAt: now + 15 * 60 * 1000 }
    attempts.set(clientKey, record)
    return Response.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  attempts.delete(clientKey)
  const created = await createAdminSession()
  if (!created) return Response.json({ error: 'Não foi possível criar a sessão.' }, { status: 503 })

  return Response.json(
    { authenticated: true },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

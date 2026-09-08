import { hasAdminSession, isAdminAuthConfigured } from '@/lib/admin-auth'

export async function GET() {
  if (!isAdminAuthConfigured()) {
    return Response.json(
      { authenticated: false, configured: false },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const authenticated = await hasAdminSession()
  return Response.json(
    { authenticated, configured: true },
    { status: authenticated ? 200 : 401, headers: { 'Cache-Control': 'no-store' } },
  )
}

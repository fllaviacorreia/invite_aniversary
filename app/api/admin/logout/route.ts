import { deleteAdminSession } from '@/lib/admin-auth'

export async function POST() {
  await deleteAdminSession()
  return Response.json(
    { authenticated: false },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

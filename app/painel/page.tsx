'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Shell } from 'lucide-react'
import { AdminPanel, configToRow, InvitationConfig, InvitationRow, rowToConfig, Rsvp } from '@/app/page'
import { supabase } from '@/lib/supabase-client'

type OwnedInvitation = InvitationRow & {
  id: string
  owner_id: string
  slug: string
}

type RsvpRow = {
  id: string
  name: string
  attendance: 'yes' | 'no'
  guests: number
  message: string
  created_at: string
}

export default function OwnerDashboardPage() {
  const router = useRouter()
  const [invitation, setInvitation] = useState<OwnedInvitation | null>(null)
  const [config, setConfig] = useState<InvitationConfig | null>(null)
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        router.replace('/acesso')
        return
      }

      const { data: adminMembership } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (adminMembership) {
        router.replace('/admin')
        return
      }

      const { data: invitationData, error: invitationError } = await supabase
        .from('invitations')
        .select('id, owner_id, slug, child_name, age, headline, introduction, event_date, event_time, venue, address, attire, attire_note, max_guests, soundtrack_url, background_image, gift_names, family_signature')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!active) return
      if (invitationError || !invitationData) {
        setError('Seu convite ainda não está disponível. Verifique se a configuração do banco foi aplicada.')
        setLoading(false)
        return
      }

      const ownedInvitation = invitationData as OwnedInvitation
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('rsvps')
        .select('id, name, attendance, guests, message, created_at')
        .eq('invitation_id', ownedInvitation.id)
        .order('created_at', { ascending: false })

      if (!active) return
      if (rsvpError) {
        setError('O convite foi carregado, mas não foi possível consultar as confirmações.')
      }

      setInvitation(ownedInvitation)
      setConfig(rowToConfig(ownedInvitation))
      setRsvps(((rsvpData ?? []) as RsvpRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        attendance: row.attendance,
        guests: row.guests,
        message: row.message,
        createdAt: row.created_at,
      })))
      setShareUrl(`${window.location.origin}/convite/${ownedInvitation.slug}`)
      setLoading(false)
    }

    void load()
    return () => { active = false }
  }, [router])

  const save = async (nextConfig: InvitationConfig) => {
    if (!invitation) throw new Error('Convite não encontrado.')
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ ...configToRow(nextConfig), updated_at: new Date().toISOString() })
      .eq('id', invitation.id)
    if (updateError) throw updateError
    setConfig(nextConfig)
  }

  const deleteRsvp = async (id: string) => {
    const { error: deleteError } = await supabase.from('rsvps').delete().eq('id', id)
    if (deleteError) throw deleteError
    setRsvps((current) => current.filter((rsvp) => rsvp.id !== id))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/acesso')
    router.refresh()
  }

  if (loading) return <DashboardMessage text="Carregando seu convite..." loading />
  if (!invitation || !config) return <DashboardMessage text={error || 'Convite não encontrado.'} />

  return (
    <main className="min-h-screen bg-[#073f53]">
      <AdminPanel
        config={config}
        rsvps={rsvps}
        shareUrl={shareUrl}
        storageOwnerId={invitation.owner_id}
        onSave={save}
        onDeleteRsvp={deleteRsvp}
        onLogout={() => void logout()}
        onClose={() => router.push(`/convite/${invitation.slug}`)}
      />
    </main>
  )
}

function DashboardMessage({ text, loading = false }: { text: string; loading?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#073f53] px-6 text-center text-white">
      <div>
        {loading ? <LoaderCircle className="mx-auto mb-4 animate-spin text-[#ffd36a]" size={30} /> : <Shell className="mx-auto mb-4 text-[#ffd36a]" size={30} />}
        <p className="max-w-md text-sm leading-relaxed text-white/80">{text}</p>
        {!loading && <a href="/acesso" className="primary-button mt-6">Voltar ao acesso</a>}
      </div>
    </main>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ExternalLink, LoaderCircle, LogOut, Mail, PartyPopper, Shell, UserRound, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

type Profile = {
  user_id: string
  full_name: string
  email: string
  created_at: string
}

type InvitationSummary = {
  id: string
  owner_id: string
  slug: string
  child_name: string
  event_date: string
  published: boolean
  created_at: string
  updated_at: string
}

export default function PlatformAdminPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [invitations, setInvitations] = useState<InvitationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        router.replace('/acesso')
        return
      }

      const { data: membership } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!membership) {
        router.replace('/painel')
        return
      }

      const [profilesResult, invitationsResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, created_at').order('created_at', { ascending: false }),
        supabase.from('invitations').select('id, owner_id, slug, child_name, event_date, published, created_at, updated_at').order('created_at', { ascending: false }),
      ])

      if (!active) return
      if (profilesResult.error || invitationsResult.error) {
        setError('Não foi possível carregar os cadastros. Confirme se a migração multiusuário foi aplicada no Supabase.')
      } else {
        setProfiles(((profilesResult.data ?? []) as Profile[]).filter((profile) => profile.user_id !== user.id))
        setInvitations((invitationsResult.data ?? []) as InvitationSummary[])
      }
      setOrigin(window.location.origin)
      setLoading(false)
    }

    void load()
    return () => { active = false }
  }, [router])

  const invitationsByOwner = useMemo(() => new Map(invitations.map((invitation) => [invitation.owner_id, invitation])), [invitations])

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/acesso')
    router.refresh()
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#073f53] text-white"><LoaderCircle className="animate-spin text-[#ffd36a]" size={32} /></main>
  }

  return (
    <main className="min-h-screen bg-[#edf7f3] text-[#123f4d]">
      <header className="bg-[#073f53] px-5 py-6 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#ffd36a]"><Shell size={22} /></div>
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/55">Administração da plataforma</p><h1 className="mt-1 font-display text-2xl">Convites especiais</h1></div>
          </div>
          <button onClick={() => void logout()} className="glass-button"><LogOut size={16} /> <span className="hidden sm:inline">Sair</span></button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="eyebrow text-[#178ba4]">Visão geral</p><h2 className="mt-2 font-display text-4xl text-[#073f53]">Cadastros e convites</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-[#617f87]">Acompanhamento somente para consulta. Cada responsável administra os dados do próprio convite.</p></div>
        </div>

        {error && <p role="alert" className="mt-7 rounded-2xl bg-[#fff0ed] px-5 py-4 text-sm font-medium text-[#9b4037]">{error}</p>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <SummaryCard icon={<Users />} value={profiles.length} label="pessoas cadastradas" />
          <SummaryCard icon={<PartyPopper />} value={invitations.length} label="convites gerados" />
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl text-[#073f53]">Responsáveis cadastrados</h2><span className="text-xs font-bold uppercase tracking-[.14em] text-[#79949c]">Somente leitura</span></div>
          <div className="overflow-hidden rounded-[1.75rem] border border-[#d8e8e3] bg-[#fffdf7] shadow-[0_12px_35px_rgba(6,59,91,.05)]">
            {profiles.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-[#79949c]">Nenhum responsável cadastrado ainda.</div>
            ) : profiles.map((profile, index) => {
              const invitation = invitationsByOwner.get(profile.user_id)
              const invitationUrl = invitation ? `${origin}/convite/${invitation.slug}` : ''
              return (
                <article key={profile.user_id} className={`grid gap-5 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:p-6 ${index ? 'border-t border-[#d8e8e3]' : ''}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#dff1ed] text-[#0a7088]"><UserRound size={18} /></div>
                    <div className="min-w-0"><h3 className="truncate font-bold text-[#073f53]">{profile.full_name || 'Responsável sem nome'}</h3><p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[#79949c]"><Mail size={12} /> {profile.email}</p></div>
                  </div>
                  <div>
                    {invitation ? <><p className="text-sm font-semibold text-[#315f69]">Convite de {invitation.child_name}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-[#79949c]"><CalendarDays size={12} /> {invitation.event_date}</p></> : <span className="status-pill status-no">Sem convite</span>}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs text-[#93a9ad]">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(profile.created_at))}</span>
                    {invitationUrl && <a href={invitationUrl} target="_blank" rel="noreferrer" className="image-action-button min-h-10 px-3" aria-label={`Abrir convite de ${invitation?.child_name ?? 'responsável'}`}><ExternalLink size={15} /> Abrir</a>}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <article className="flex items-center gap-4 rounded-[1.5rem] border border-white/80 bg-[#fffdf7] p-6 shadow-[0_12px_35px_rgba(6,59,91,.06)]">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#dff1ed] text-[#0a7088]">{icon}</div>
      <div><strong className="font-display text-4xl leading-none text-[#073f53]">{value}</strong><p className="mt-1 text-sm text-[#617f87]">{label}</p></div>
    </article>
  )
}

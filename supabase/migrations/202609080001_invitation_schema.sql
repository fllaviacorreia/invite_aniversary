-- Estrutura compartilhada do convite, confirmações e autorização administrativa.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_invitation_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_invitation_admin() from public;
grant execute on function public.is_invitation_admin() to authenticated;

create table if not exists public.invitation_settings (
  id smallint primary key default 1 check (id = 1),
  child_name text not null,
  age text not null,
  headline text not null,
  introduction text not null,
  event_date text not null,
  event_time text not null,
  venue text not null,
  address text not null,
  attire text not null,
  attire_note text not null,
  max_guests smallint not null check (max_guests between 1 and 10),
  soundtrack_url text not null default '',
  background_image text not null default '/hero-ocean.png',
  gift_names text[] not null default '{}',
  family_signature text not null,
  updated_at timestamptz not null default now()
);

insert into public.invitation_settings (
  id, child_name, age, headline, introduction, event_date, event_time,
  venue, address, attire, attire_note, max_guests, soundtrack_url,
  background_image, gift_names, family_signature
) values (
  1,
  'Theo',
  '5',
  'mergulha em uma nova idade!',
  'Prepare o traje de banho e venha celebrar com a gente no fundo do mar.',
  'Domingo, 18 de agosto',
  'Das 15h às 19h',
  'Espaço Coral Azul',
  'Rua das Conchas, 120 · Jardim Oceano',
  'Livre para mergulhar',
  'Venha com sua fantasia favorita',
  4,
  '',
  '/hero-ocean.png',
  array['Livro infantil sobre o oceano', 'Kit de pintura', 'Jogo de montar'],
  'Com carinho, mamãe, papai e Theo'
) on conflict (id) do nothing;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  attendance text not null check (attendance in ('yes', 'no')),
  guests smallint not null check (guests between 0 and 10),
  message text not null default '' check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  constraint valid_attendance_guests check (
    (attendance = 'yes' and guests >= 1) or
    (attendance = 'no' and guests = 0)
  )
);

alter table public.admin_users enable row level security;
alter table public.invitation_settings enable row level security;
alter table public.rsvps enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.invitation_settings from anon, authenticated;
revoke all on table public.rsvps from anon, authenticated;

grant select on table public.admin_users to authenticated;
grant select on table public.invitation_settings to anon, authenticated;
grant update on table public.invitation_settings to authenticated;
grant insert on table public.rsvps to anon, authenticated;
grant select, delete on table public.rsvps to authenticated;

drop policy if exists "Admin can read own membership" on public.admin_users;
create policy "Admin can read own membership"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Invitation is publicly readable" on public.invitation_settings;
create policy "Invitation is publicly readable"
on public.invitation_settings for select
to anon, authenticated
using (true);

drop policy if exists "Admin can update invitation" on public.invitation_settings;
create policy "Admin can update invitation"
on public.invitation_settings for update
to authenticated
using ((select public.is_invitation_admin()))
with check ((select public.is_invitation_admin()));

drop policy if exists "Guests can submit RSVP" on public.rsvps;
create policy "Guests can submit RSVP"
on public.rsvps for insert
to anon, authenticated
with check (
  char_length(trim(name)) between 2 and 120
  and char_length(message) <= 500
  and guests between 0 and 10
  and guests <= (select max_guests from public.invitation_settings where id = 1)
);

drop policy if exists "Admin can read RSVP" on public.rsvps;
create policy "Admin can read RSVP"
on public.rsvps for select
to authenticated
using ((select public.is_invitation_admin()));

drop policy if exists "Admin can delete RSVP" on public.rsvps;
create policy "Admin can delete RSVP"
on public.rsvps for delete
to authenticated
using ((select public.is_invitation_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invitation-assets',
  'invitation-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin can upload invitation assets" on storage.objects;
create policy "Admin can upload invitation assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'invitation-assets'
  and (select public.is_invitation_admin())
);

drop policy if exists "Admin can update invitation assets" on storage.objects;
create policy "Admin can update invitation assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'invitation-assets'
  and (select public.is_invitation_admin())
)
with check (
  bucket_id = 'invitation-assets'
  and (select public.is_invitation_admin())
);

drop policy if exists "Admin can delete invitation assets" on storage.objects;
create policy "Admin can delete invitation assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'invitation-assets'
  and (select public.is_invitation_admin())
);

-- Depois de criar o usuário em Authentication > Users, torne-o administrador:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'seu-email@exemplo.com'
-- on conflict (user_id) do nothing;

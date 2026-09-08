-- Opções de personalização do convite e nova imagem padrão da plataforma.

alter table public.invitations
  add column if not exists show_date boolean not null default true,
  add column if not exists show_venue boolean not null default true,
  add column if not exists show_attire boolean not null default true,
  add column if not exists show_gifts boolean not null default true;

alter table public.invitations
  alter column background_image set default '/hero-platform-generic.png';

-- Mantém imagens personalizadas e troca somente a capa padrão anterior.
update public.invitations
set background_image = '/hero-platform-generic.png',
    updated_at = now()
where background_image = '/hero-ocean.png';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invitations_slug_length'
      and conrelid = 'public.invitations'::regclass
  ) then
    alter table public.invitations
      add constraint invitations_slug_length check (char_length(slug) between 3 and 80);
  end if;
end $$;

create or replace function public.handle_invitation_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  child text;
  slug_base text;
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (user_id) do nothing;

  if lower(new.email) = 'freelas.jequie@gmail.com' then
    insert into public.platform_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    return new;
  end if;

  child := coalesce(nullif(trim(new.raw_user_meta_data ->> 'child_name'), ''), 'Meu convite');
  slug_base := trim(both '-' from lower(regexp_replace(child, '[^a-zA-Z0-9]+', '-', 'g')));
  if slug_base = '' then slug_base := 'convite'; end if;

  insert into public.invitations (
    owner_id, slug, child_name, age, headline, introduction, event_date,
    event_time, venue, address, attire, attire_note, max_guests,
    soundtrack_url, background_image, gift_names, family_signature
  ) values (
    new.id,
    slug_base || '-' || substring(replace(new.id::text, '-', ''), 1, 6),
    child,
    '1',
    'celebra uma nova idade!',
    'Você recebeu um convite muito especial. Venha celebrar com a gente!',
    'Defina a data da festa',
    'Defina o horário',
    'Defina o local',
    'Adicione o endereço completo',
    'Traje livre',
    'Venha como se sentir melhor',
    4,
    '',
    '/hero-platform-generic.png',
    array['Uma lembrança especial', 'Um livro divertido', 'Um brinquedo criativo'],
    'Com carinho, nossa família'
  )
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

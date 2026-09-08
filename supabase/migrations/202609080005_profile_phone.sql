alter table public.profiles
  add column if not exists phone text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_phone_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_phone_length check (char_length(phone) <= 30);
  end if;
end
$$;

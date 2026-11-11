-- Watten Tracker – gemeinsame Liste in Supabase
-- Einmal im Supabase-Dashboard unter „SQL Editor“ ausführen.
-- (Kann gefahrlos erneut ausgeführt werden; vorhandene Listen bleiben erhalten.)
--
-- Die Tabelle ist für den öffentlichen Anon-Key gesperrt (RLS ohne Policies).
-- Zugriff gibt es nur über die beiden Funktionen und nur mit dem geheimen,
-- 32-stelligen Raumcode aus dem Einladungslink.

create table if not exists public.watten_rooms (
  code       text primary key check (length(code) >= 24),
  data       jsonb not null,
  version    bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.watten_rooms enable row level security;
revoke all on public.watten_rooms from anon, authenticated;

-- Stand laden
create or replace function public.wt_get(p_code text)
returns table (data jsonb, version bigint)
language sql
security definer
set search_path = public
as $$
  select r.data, r.version from public.watten_rooms r where r.code = p_code;
$$;

-- Stand speichern, nur wenn sich die Version seit dem Laden nicht geändert hat.
-- p_version = 0 legt eine neue Liste an. Rückgabe: neue Version oder -1 bei Konflikt.
create or replace function public.wt_save(p_code text, p_data jsonb, p_version bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v bigint;
begin
  if p_code is null or p_code !~ '^[A-Za-z0-9]{24,64}$' then
    raise exception 'Raumcode ungültig';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Daten ungültig';
  end if;
  if pg_column_size(p_data) > 5000000 then
    raise exception 'Daten zu groß';
  end if;
  if p_version = 0 then
    insert into public.watten_rooms (code, data, version)
    values (p_code, p_data, 1)
    on conflict (code) do nothing;
    if found then
      return 1;
    end if;
    return -1;
  end if;
  update public.watten_rooms
     set data = p_data, version = version + 1, updated_at = now()
   where code = p_code and version = p_version
  returning version into v;
  return coalesce(v, -1);
end;
$$;

revoke all on function public.wt_get(text) from public;
revoke all on function public.wt_save(text, jsonb, bigint) from public;
grant execute on function public.wt_get(text) to anon, authenticated;
grant execute on function public.wt_save(text, jsonb, bigint) to anon, authenticated;

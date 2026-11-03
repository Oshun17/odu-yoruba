-- Obras propias de cada religioso o casa (privadas)
create table if not exists public.obras_propias (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null,
  orisha text,
  tipo text,
  objetivos text[] not null default '{}',
  materiales text[] not null default '{}',
  pasos text,
  entrega text,
  "requiereOsha" boolean not null default false,
  creado timestamptz not null default now()
);
create index if not exists obras_propias_owner_idx on public.obras_propias(owner);
alter table public.obras_propias enable row level security;
drop policy if exists "obras propias" on public.obras_propias;
create policy "obras propias" on public.obras_propias for all using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on public.obras_propias to authenticated;

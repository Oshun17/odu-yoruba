-- =============================================================
-- Odu Yoruba · Base de datos (Supabase / Postgres)
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- Cada religioso solo ve y modifica sus propios datos (RLS).
-- =============================================================

-- 1) Perfil del religioso (1 por usuario)
create table if not exists public.perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre          text,
  nombre_santo    text,
  tipo            text check (tipo in ('olorisha','iyalorisha','babalawo','iyanifa','aleyo','otro')) default 'olorisha',
  orisha_cabecera text,
  casa            text,          -- nombre del ilé / casa religiosa
  padrino         text,
  telefono        text,
  pais            text,
  plan            text not null default 'gratis',  -- gratis | pro (lo cambia solo el administrador)
  creado          timestamptz not null default now()
);

-- 2) Consultados / ahijados
create table if not exists public.consultados (
  id               uuid primary key default gen_random_uuid(),
  owner            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre           text not null,
  nombre_santo     text,
  relacion         text check (relacion in ('ahijado','aleyo','familia','otro')) default 'aleyo',
  fecha_nacimiento date,
  orisha_cabecera  text,
  signo_ita        text,          -- signo de Itá / mano de Orula
  telefono         text,
  notas            text,
  creado           timestamptz not null default now()
);
create index if not exists consultados_owner_idx on public.consultados(owner);

-- 3) Consultas
create table if not exists public.consultas (
  id             uuid primary key default gen_random_uuid(),
  owner          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  consultado_id  uuid references public.consultados(id) on delete set null,
  sistema        text not null check (sistema in ('dilo','ifa')),
  pie1           smallint not null check (pie1 between 1 and 16),
  pie2           smallint not null check (pie2 between 1 and 16),
  signo          text not null,                 -- nombre legible, ej. "Oshé tonti Obara"
  orientacion    text not null check (orientacion in ('ire','osogbo')),
  tipo           text,                          -- ej. "Iré Owó (bienestar económico)"
  pregunta       text,
  notas          text,
  ebbo           text,                          -- ebbó marcado
  ebbo_hecho     boolean not null default false,
  volver_el      date,                          -- fecha para volver a consultar
  fecha          timestamptz not null default now()
);
create index if not exists consultas_owner_idx on public.consultas(owner, fecha desc);
create index if not exists consultas_consultado_idx on public.consultas(consultado_id);

-- 4) Seguridad: cada usuario solo accede a lo suyo
alter table public.perfiles    enable row level security;
alter table public.consultados enable row level security;
alter table public.consultas   enable row level security;

drop policy if exists "perfil propio: ver"        on public.perfiles;
drop policy if exists "perfil propio: editar"     on public.perfiles;
create policy "perfil propio: ver"    on public.perfiles for select using (id = auth.uid());
create policy "perfil propio: editar" on public.perfiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "consultados propios" on public.consultados;
create policy "consultados propios" on public.consultados
  for all using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "consultas propias" on public.consultas;
create policy "consultas propias" on public.consultas
  for all using (owner = auth.uid())
  with check (
    owner = auth.uid()
    and (consultado_id is null or exists (
      select 1 from public.consultados c where c.id = consultado_id and c.owner = auth.uid()))
  );

-- El usuario no puede cambiarse el plan a sí mismo
revoke update (plan) on public.perfiles from authenticated;

-- 5) Crear el perfil automáticamente al registrarse
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse after insert on auth.users
  for each row execute function public.crear_perfil();

-- =============================================================
-- Odu Yoruba · Panel de administrador
-- Solo las cuentas en public.admins pueden usar estas funciones.
-- El panel muestra usuarios y CONTEOS; nunca el contenido de las consultas.
-- =============================================================

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creado  timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- ¿El usuario actual es administrador?
create or replace function public.soy_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Lista de religiosos registrados con su actividad
create or replace function public.admin_usuarios()
returns table (
  id uuid, email text, nombre text, nombre_santo text, tipo text, orisha_cabecera text,
  casa text, pais text, telefono text, plan text, registrado timestamptz, ultimo_acceso timestamptz,
  confirmado boolean, consultados bigint, consultas bigint, consultas_30d bigint, ultima_consulta timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.soy_admin() then raise exception 'Solo administradores'; end if;
  return query
    select u.id, u.email::text, p.nombre, p.nombre_santo, p.tipo, p.orisha_cabecera,
           p.casa, p.pais, p.telefono, coalesce(p.plan,'gratis'), u.created_at, u.last_sign_in_at,
           (u.email_confirmed_at is not null),
           (select count(*) from public.consultados c where c.owner = u.id),
           (select count(*) from public.consultas q where q.owner = u.id),
           (select count(*) from public.consultas q where q.owner = u.id and q.fecha > now() - interval '30 days'),
           (select max(q.fecha) from public.consultas q where q.owner = u.id)
    from auth.users u
    left join public.perfiles p on p.id = u.id
    order by u.created_at desc;
end $$;

-- Números generales
create or replace function public.admin_resumen()
returns json language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not public.soy_admin() then raise exception 'Solo administradores'; end if;
  select json_build_object(
    'usuarios',           (select count(*) from auth.users),
    'nuevos_7d',          (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'activos_30d',        (select count(distinct owner) from public.consultas where fecha > now() - interval '30 days'),
    'pro',                (select count(*) from public.perfiles where plan = 'pro'),
    'consultados',        (select count(*) from public.consultados),
    'consultas',          (select count(*) from public.consultas),
    'consultas_30d',      (select count(*) from public.consultas where fecha > now() - interval '30 days'),
    'dilo',               (select count(*) from public.consultas where sistema = 'dilo'),
    'ifa',                (select count(*) from public.consultas where sistema = 'ifa'),
    'por_tipo',           (select coalesce(json_object_agg(t, n), '{}'::json) from (select coalesce(tipo,'sin dato') t, count(*) n from public.perfiles group by 1) x),
    'por_pais',           (select coalesce(json_object_agg(t, n), '{}'::json) from (select coalesce(nullif(pais,''),'sin dato') t, count(*) n from public.perfiles group by 1 order by 2 desc limit 8) x),
    'registros_por_mes',  (select coalesce(json_agg(json_build_object('mes', m, 'n', n) order by m), '[]'::json) from (select to_char(date_trunc('month', created_at),'YYYY-MM') m, count(*) n from auth.users where created_at > now() - interval '12 months' group by 1) x)
  ) into r;
  return r;
end $$;

-- Cambiar el plan de un usuario
create or replace function public.admin_cambiar_plan(usuario uuid, nuevo_plan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.soy_admin() then raise exception 'Solo administradores'; end if;
  if nuevo_plan not in ('gratis','pro') then raise exception 'Plan no válido'; end if;
  update public.perfiles set plan = nuevo_plan where id = usuario;
end $$;

revoke all on function public.admin_usuarios() from public, anon;
revoke all on function public.admin_resumen() from public, anon;
revoke all on function public.admin_cambiar_plan(uuid, text) from public, anon;
grant execute on function public.soy_admin() to authenticated;
grant execute on function public.admin_usuarios() to authenticated;
grant execute on function public.admin_resumen() to authenticated;
grant execute on function public.admin_cambiar_plan(uuid, text) to authenticated;

-- Dueño de la plataforma: esta cuenta queda como administradora al registrarse (y ahora, si ya existe).
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  if lower(new.email) = 'cesarrosillo@gmail.com' then
    insert into public.admins (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;

insert into public.admins (user_id)
select id from auth.users where lower(email) = 'cesarrosillo@gmail.com'
on conflict do nothing;

-- Obras seleccionadas en cada consulta: [{id,titulo,orisha,hecha}]
alter table public.consultas add column if not exists obras jsonb not null default '[]'::jsonb;

-- Anotación de la consulta (mano, yale/coto, intori, onire, letras que respondieron)
alter table public.consultas add column if not exists detalle jsonb;

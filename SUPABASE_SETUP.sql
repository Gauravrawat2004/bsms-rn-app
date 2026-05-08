create table if not exists public.bsms_store (
  key text primary key,
  value jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.bsms_store (key, value)
values
  ('buses', '[]'::jsonb),
  ('students', '[]'::jsonb),
  ('faculties', '[]'::jsonb),
  ('chat', '[]'::jsonb),
  ('temp_tickets', '[]'::jsonb),
  ('device_tokens', '[]'::jsonb),
  ('pending_students', '[]'::jsonb)
on conflict (key) do nothing;

create or replace function public.set_bsms_store_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_bsms_store_updated_at on public.bsms_store;

create trigger set_bsms_store_updated_at
before update on public.bsms_store
for each row
execute function public.set_bsms_store_updated_at();

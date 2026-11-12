create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  credits_clp bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table users add column if not exists role text not null default 'user';
alter table users add column if not exists banned_at timestamptz;
alter table users add column if not exists last_login_at timestamptz;

create table if not exists uploads (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  slug text not null unique,
  txid text not null,
  filename text not null,
  content_type text not null,
  size_bytes bigint not null,
  cost_clp bigint not null,
  status text not null default 'pending',
  confirmed_at timestamptz,
  block_height bigint,
  created_at timestamptz not null default now()
);

create table if not exists credit_ledger (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  delta_clp bigint not null,
  reason text not null,
  upload_id uuid references uploads(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table credit_ledger add column if not exists actor_id uuid references users(id) on delete set null;
alter table credit_ledger add column if not exists operation_id uuid;
create unique index if not exists ledger_operation_idx on credit_ledger (operation_id) where operation_id is not null;

create table if not exists sessions (
  id uuid primary key,
  token_hash text not null unique,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table if not exists activity_log (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists uploads_user_idx on uploads (user_id, created_at desc);
create index if not exists uploads_status_idx on uploads (status, created_at desc);
create index if not exists ledger_user_idx on credit_ledger (user_id, created_at desc);
create index if not exists sessions_user_idx on sessions (user_id, revoked_at);
create index if not exists sessions_expiry_idx on sessions (expires_at);
create index if not exists activity_user_idx on activity_log (user_id, created_at desc);
create index if not exists activity_created_idx on activity_log (created_at desc);

-- La primera cuenta histórica queda como administradora inicial. Las cuentas
-- posteriores siempre entran como usuarias; otros administradores se asignan por CLI.
update users
   set role = 'admin'
 where id = (select id from users order by created_at asc limit 1)
   and not exists (select 1 from users where role = 'admin');

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_role_check') then
    alter table users add constraint users_role_check check (role in ('user', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_credits_nonnegative') then
    alter table users add constraint users_credits_nonnegative check (credits_clp >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'uploads_status_check') then
    alter table uploads add constraint uploads_status_check
      check (status in ('publishing', 'pending', 'confirmed', 'failed')) not valid;
  end if;
end $$;

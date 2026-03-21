-- ============================================================
-- BASKETBALL TRAINING APP — SUPABASE SCHEMA v2
-- Safe to run alongside existing StatStream tables:
--   teams, players, games
-- ============================================================


-- ------------------------------------------------------------
-- PROFILES
-- One row per authenticated user (coaches + players with accounts)
-- Links auth.users → existing players roster entry (optional)
-- ------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  role          text not null default 'player' check (role in ('player', 'coach')),
  input_mode    text not null default 'quick' check (input_mode in ('quick', 'court')),
  team_id       uuid references teams(id) on delete set null,
  player_id     uuid references players(id) on delete set null,  -- links to StatStream roster entry
  created_at    timestamptz default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ------------------------------------------------------------
-- DRILLS
-- Templates created by coaches or players
-- is_public = true means visible to all players on the team
-- ------------------------------------------------------------
create table drills (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  created_by    uuid references profiles(id) on delete set null,
  team_id       uuid references teams(id) on delete cascade,   -- scope drill to a team
  is_public     boolean default false,
  make_target   integer,                                        -- e.g. 7 (pass threshold)
  tags          text[] default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);


-- ------------------------------------------------------------
-- DRILL SPOTS
-- Ordered sequence of spots/zones within a drill
-- zone is nullable — only populated when using court mode
-- ------------------------------------------------------------
create table drill_spots (
  id          uuid primary key default gen_random_uuid(),
  drill_id    uuid not null references drills(id) on delete cascade,
  spot_order  integer not null,           -- 1-based, drives auto-advance
  label       text,                       -- e.g. "Left Corner", "Elbow"
  zone        text,                       -- court zone key, nullable
  shot_type   text not null check (shot_type in ('2PT', '3PT', 'FT')),
  reps        integer not null default 10
);


-- ------------------------------------------------------------
-- WORKOUT PLANS
-- Weekly drill schedule — coaches assign drills per day
-- ------------------------------------------------------------
create table workout_plans (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references profiles(id) on delete set null,
  team_id     uuid references teams(id) on delete cascade,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table workout_plan_drills (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references workout_plans(id) on delete cascade,
  drill_id      uuid not null references drills(id) on delete cascade,
  day_of_week   text not null check (day_of_week in (
                  'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
                )),
  drill_order   integer not null default 1   -- order within the day
);


-- ------------------------------------------------------------
-- DRILL ATTEMPTS
-- One row per time a player runs a drill
-- share_token enables a read-only public link per attempt
-- ------------------------------------------------------------
create table drill_attempts (
  id            uuid primary key default gen_random_uuid(),
  drill_id      uuid not null references drills(id) on delete cascade,
  player_id     uuid not null references profiles(id) on delete cascade,
  started_at    timestamptz default now(),
  completed_at  timestamptz,
  score         integer default 0,             -- total makes
  total_reps    integer default 0,             -- total shots taken
  passed        boolean,                       -- met make_target?
  share_token   uuid default gen_random_uuid() -- read-only shareable link
);


-- ------------------------------------------------------------
-- TRAINING SHOTS
-- Individual shot record within a drill attempt
-- zone is nullable — only set when using court mode
-- ------------------------------------------------------------
create table training_shots (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references drill_attempts(id) on delete cascade,
  spot_order    integer not null,              -- which spot in the drill sequence
  shot_type     text not null check (shot_type in ('2PT', '3PT', 'FT')),
  zone          text,                          -- nullable, court mode only
  made          boolean not null,
  contested     text check (contested in ('open', 'light', 'contested')),
  taken_at      timestamptz default now()
);


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
create index on profiles (team_id);
create index on profiles (player_id);
create index on drills (team_id);
create index on drills (created_by);
create index on drill_spots (drill_id, spot_order);
create index on workout_plan_drills (plan_id, day_of_week);
create index on drill_attempts (player_id);
create index on drill_attempts (drill_id);
create index on drill_attempts (share_token);
create index on training_shots (attempt_id);


-- ------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger drills_updated_at
  before update on drills
  for each row execute procedure set_updated_at();

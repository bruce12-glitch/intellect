begin;

create schema if not exists private;

create table public.community_circles (
  slug text primary key,
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

insert into public.community_circles (slug, name, description) values
  ('global-commons', 'Global Commons', 'A shared place for readers and curious minds across time zones.'),
  ('ai-researchers', 'AI Researchers', 'Discuss papers, inference, agentic memory, ML systems, and reproducible research.');

create table public.community_members (
  circle_slug text not null references public.community_circles(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  created_at timestamptz not null default now(),
  primary key (circle_slug, user_id)
);
create index community_members_user_idx on public.community_members(user_id);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  circle_slug text not null,
  author_id uuid not null,
  author_name text not null default '',
  title text not null check (char_length(btrim(title)) between 3 and 180),
  body text not null check (char_length(btrim(body)) between 3 and 6000),
  topic text not null,
  source_url text check (source_url is null or (char_length(source_url) <= 2000 and source_url ~ '^https://[^[:space:]]+$')),
  created_at timestamptz not null default now(),
  search_document tsvector generated always as (to_tsvector('english'::regconfig, title || ' ' || body)) stored,
  unique (id, circle_slug),
  foreign key (circle_slug, author_id) references public.community_members(circle_slug, user_id) on delete cascade,
  check (
    (circle_slug = 'ai-researchers' and topic in ('LLM inference', 'Agentic memory', 'ML systems', 'Paper club', 'Collaboration'))
    or (circle_slug = 'global-commons' and topic in ('Books & ideas', 'Philosophy', 'Introductions', 'Reading partners'))
  )
);
create index community_posts_feed_idx on public.community_posts(circle_slug, created_at desc, id desc);
create index community_posts_topic_idx on public.community_posts(circle_slug, topic, created_at desc);
create index community_posts_author_idx on public.community_posts(author_id, created_at desc);
create index community_posts_search_idx on public.community_posts using gin(search_document);

create table public.community_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  circle_slug text not null,
  author_id uuid not null,
  author_name text not null default '',
  body text not null check (char_length(btrim(body)) between 2 and 3000),
  created_at timestamptz not null default now(),
  foreign key (post_id, circle_slug) references public.community_posts(id, circle_slug) on delete cascade,
  foreign key (circle_slug, author_id) references public.community_members(circle_slug, user_id) on delete cascade
);
create index community_replies_thread_idx on public.community_replies(post_id, created_at, id);
create index community_replies_circle_idx on public.community_replies(circle_slug);
create index community_replies_author_idx on public.community_replies(author_id, created_at desc);

-- Write identity, author labels, timestamps, and rate limits are enforced by Postgres.
create function private.guard_community_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  member_name text;
  recent_count integer;
begin
  if auth.uid() is null or new.author_id <> auth.uid() then
    raise exception 'Sign in as the author before posting.' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.author_id::text, 0));
  select display_name into member_name from public.community_members
    where circle_slug = new.circle_slug and user_id = new.author_id;
  if not found then
    raise exception 'Join this circle before posting.' using errcode = '42501';
  end if;
  if tg_table_name = 'community_posts' then
    select count(*) into recent_count from public.community_posts
      where author_id = new.author_id and created_at > now() - interval '1 hour';
    if recent_count >= 5 then
      raise exception 'You have started five discussions this hour. Please come back a little later.';
    end if;
  else
    select count(*) into recent_count from public.community_replies
      where author_id = new.author_id and created_at > now() - interval '1 hour';
    if recent_count >= 60 then
      raise exception 'You have sent sixty replies this hour. Please come back a little later.';
    end if;
  end if;
  new.author_name := member_name;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function private.guard_community_write() from public, anon, authenticated;

create trigger community_posts_guard before insert on public.community_posts
  for each row execute function private.guard_community_write();
create trigger community_replies_guard before insert on public.community_replies
  for each row execute function private.guard_community_write();

alter table public.community_circles enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_replies enable row level security;

revoke all on public.community_circles, public.community_members, public.community_posts, public.community_replies from anon, authenticated;
grant select on public.community_circles, public.community_posts, public.community_replies to anon, authenticated;
grant select on public.community_members to authenticated;
grant insert (circle_slug, user_id, display_name) on public.community_members to authenticated;
grant update (display_name) on public.community_members to authenticated;
grant insert (id, circle_slug, author_id, title, body, topic, source_url) on public.community_posts to authenticated;
grant insert (id, post_id, circle_slug, author_id, body) on public.community_replies to authenticated;
grant delete on public.community_posts, public.community_replies to authenticated;

create policy "Public circle directory" on public.community_circles for select to anon, authenticated using (true);
create policy "Read own circle memberships" on public.community_members for select to authenticated using (user_id = (select auth.uid()));
create policy "Join as yourself" on public.community_members for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Rename own membership" on public.community_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Public discussions" on public.community_posts for select to anon, authenticated using (true);
create policy "Members start discussions" on public.community_posts for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (
    select 1 from public.community_members m where m.circle_slug = community_posts.circle_slug and m.user_id = (select auth.uid())
  ));
create policy "Authors remove own discussions" on public.community_posts for delete to authenticated using (author_id = (select auth.uid()));
create policy "Public replies" on public.community_replies for select to anon, authenticated using (true);
create policy "Members reply as themselves" on public.community_replies for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (
    select 1 from public.community_members m where m.circle_slug = community_replies.circle_slug and m.user_id = (select auth.uid())
  ));
create policy "Authors remove own replies" on public.community_replies for delete to authenticated using (author_id = (select auth.uid()));

-- Supabase projects provide this publication. The local Postgres test harness does not.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.community_posts, public.community_replies;
  end if;
end $$;

commit;

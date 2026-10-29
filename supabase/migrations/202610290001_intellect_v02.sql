begin;

-- Profiles are opt-in. An unpublished profile is visible only to its owner.
create table public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  headline text not null default '' check (char_length(headline) <= 100),
  bio text not null default '' check (char_length(bio) <= 800),
  interests text[] not null default '{}' check (cardinality(interests) <= 8 and char_length(array_to_string(interests, ',')) <= 240),
  skills text not null default '' check (char_length(skills) <= 180),
  looking_for text not null default 'Learning together' check (looking_for in ('Collaborators', 'Study partners', 'Mentoring', 'Learning together')),
  availability text not null default 'Just exploring' check (availability in ('Just exploring', '1–2 hours / week', '3–5 hours / week', '6–10 hours / week')),
  time_zone text not null default 'UTC' check (char_length(time_zone) <= 80),
  website_url text check (website_url is null or (char_length(website_url) <= 2000 and website_url ~ '^https://[^[:space:]]+$')),
  orcid_url text check (orcid_url is null or orcid_url ~ '^https://orcid\.org/[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'),
  published boolean not null default false,
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (to_tsvector('english'::regconfig, display_name || ' ' || headline || ' ' || bio || ' ' || skills)) stored
);
create index community_profiles_published_idx on public.community_profiles(updated_at desc) where published;
create index community_profiles_search_idx on public.community_profiles using gin(search_document);

create function private.guard_community_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'A profile belongs to the signed-in member.' using errcode = '42501';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'Choose a valid time zone.' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function private.guard_community_profile() from public, anon, authenticated;
create trigger community_profile_guard before insert or update on public.community_profiles
  for each row execute function private.guard_community_profile();

create table public.community_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  blocked_label text not null default 'Circle member' check (char_length(blocked_label) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index community_blocks_target_idx on public.community_blocks(blocked_id);

-- Moderator assignments are made by a database administrator, never by the client.
create table public.community_moderators (
  circle_slug text not null references public.community_circles(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (circle_slug, user_id)
);
create index community_moderators_user_idx on public.community_moderators(user_id);
create function private.is_circle_moderator(circle text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_moderators where circle_slug = circle and user_id = (select auth.uid()));
$$;
revoke all on function private.is_circle_moderator(text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_circle_moderator(text) to anon, authenticated;

alter table public.community_posts add column hidden_at timestamptz;
alter table public.community_replies add column hidden_at timestamptz;
alter table public.community_replies add constraint community_reply_post_pair unique (id, post_id);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  circle_slug text not null,
  post_id uuid not null,
  reply_id uuid,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('Spam', 'Harassment', 'Privacy', 'Other')),
  details text not null default '' check (char_length(details) <= 1200),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'restored')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text not null default '' check (char_length(resolution_note) <= 500),
  foreign key (post_id, circle_slug) references public.community_posts(id, circle_slug) on delete cascade,
  foreign key (reply_id, post_id) references public.community_replies(id, post_id) on delete cascade
);
create unique index community_report_post_unique on public.community_reports(reporter_id, post_id) where reply_id is null;
create unique index community_report_reply_unique on public.community_reports(reporter_id, reply_id) where reply_id is not null;
create index community_reports_queue_idx on public.community_reports(circle_slug, status, created_at);
create index community_reports_reporter_idx on public.community_reports(reporter_id, created_at desc);
create index community_reports_post_idx on public.community_reports(post_id);
create index community_reports_reply_idx on public.community_reports(reply_id, post_id);

create function private.guard_community_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or new.reporter_id <> auth.uid() then
    raise exception 'Sign in as the reporter.' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.reporter_id::text, 1));
  if (select count(*) from public.community_reports where reporter_id = new.reporter_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'You have sent ten reports this hour. Please return a little later.';
  end if;
  new.created_at := now();
  return new;
end $$;
revoke all on function private.guard_community_report() from public, anon, authenticated;
create trigger community_report_guard before insert on public.community_reports
  for each row execute function private.guard_community_report();

alter table public.community_profiles enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_moderators enable row level security;
alter table public.community_reports enable row level security;
revoke all on public.community_profiles, public.community_blocks, public.community_moderators, public.community_reports from anon, authenticated;
grant select on public.community_profiles to anon, authenticated;
grant insert (user_id, display_name, headline, bio, interests, skills, looking_for, availability, time_zone, website_url, orcid_url, published) on public.community_profiles to authenticated;
grant update (display_name, headline, bio, interests, skills, looking_for, availability, time_zone, website_url, orcid_url, published) on public.community_profiles to authenticated;
grant select, delete on public.community_blocks to authenticated;
grant insert (blocker_id, blocked_id, blocked_label) on public.community_blocks to authenticated;
grant select on public.community_moderators, public.community_reports to authenticated;
grant insert (id, circle_slug, post_id, reply_id, reporter_id, reason, details) on public.community_reports to authenticated;

create policy "Published profiles and own drafts" on public.community_profiles for select to anon, authenticated
  using (published or user_id = (select auth.uid()));
create policy "Members create own research profile" on public.community_profiles for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.community_members where circle_slug = 'ai-researchers' and user_id = (select auth.uid())));
create policy "Members edit own research profile" on public.community_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.community_members where circle_slug = 'ai-researchers' and user_id = (select auth.uid())));
create policy "Own block list" on public.community_blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "Block for yourself" on public.community_blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "Undo own block" on public.community_blocks for delete to authenticated using (blocker_id = (select auth.uid()));
create policy "Read own moderator roles" on public.community_moderators for select to authenticated using (user_id = (select auth.uid()));
create policy "Report as a circle member" on public.community_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and exists (select 1 from public.community_members where circle_slug = community_reports.circle_slug and user_id = (select auth.uid()))
    and exists (select 1 from public.community_posts where id = community_reports.post_id and hidden_at is null)
    and (reply_id is null or exists (select 1 from public.community_replies where id = community_reports.reply_id and hidden_at is null)));
create policy "Own reports and circle moderation queue" on public.community_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_circle_moderator(circle_slug));

drop policy "Public discussions" on public.community_posts;
create policy "Visible discussions or circle moderators" on public.community_posts for select to anon, authenticated
  using (hidden_at is null or private.is_circle_moderator(circle_slug));
drop policy "Public replies" on public.community_replies;
create policy "Visible replies or circle moderators" on public.community_replies for select to anon, authenticated
  using ((hidden_at is null and exists (select 1 from public.community_posts p where p.id = post_id and p.hidden_at is null)) or private.is_circle_moderator(circle_slug));
drop policy "Members reply as themselves" on public.community_replies;
create policy "Members reply to visible discussions" on public.community_replies for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (select 1 from public.community_members m where m.circle_slug = community_replies.circle_slug and m.user_id = (select auth.uid()))
    and exists (select 1 from public.community_posts p where p.id = post_id and p.hidden_at is null));

-- A privileged operation with a fresh, server-side role check for every request.
create function public.review_community_report(p_report_id uuid, p_decision text, p_note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare report public.community_reports%rowtype;
begin
  select * into report from public.community_reports where id = p_report_id for update;
  if not found or auth.uid() is null or not private.is_circle_moderator(report.circle_slug) then
    raise exception 'Only an assigned moderator can review this circle.' using errcode = '42501';
  end if;
  if p_decision not in ('hide', 'dismiss', 'restore') or p_decision is null or p_note is null or char_length(p_note) > 500 then
    raise exception 'Choose a valid moderation action and a note of up to 500 characters.' using errcode = '22023';
  end if;
  if (p_decision in ('hide', 'dismiss') and report.status <> 'open') or (p_decision = 'restore' and report.status <> 'reviewed') then
    raise exception 'This report has already changed. Refresh the queue before reviewing it.';
  end if;
  if p_decision in ('hide', 'restore') then
    if report.reply_id is null then
      update public.community_posts set hidden_at = case when p_decision = 'hide' then now() else null end where id = report.post_id;
    else
      update public.community_replies set hidden_at = case when p_decision = 'hide' then now() else null end where id = report.reply_id;
    end if;
  end if;
  update public.community_reports set status = case p_decision when 'hide' then 'reviewed' when 'restore' then 'restored' else 'dismissed' end,
    resolved_at = now(), resolved_by = auth.uid(), resolution_note = btrim(p_note) where id = p_report_id;
end $$;
revoke all on function public.review_community_report(uuid, text, text) from public, anon;
grant execute on function public.review_community_report(uuid, text, text) to authenticated;

commit;

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const users = Object.fromEntries(['alice', 'bob', 'researchMod', 'globalMod', 'outsider'].map((name, index) => [name, `${index + 1}1111111-1111-4111-8111-111111111111`]));
let checks = 0;
async function test(name, fn) { await fn(); checks++; console.log(`✓ v0.2: ${name}`); }
async function rejected(sql, params = [], code) {
  await assert.rejects(() => db.query(sql, params), error => { if (code) assert.equal(error.code, code, error.message); return true; });
}
async function as(name) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [users[name] || '']);
  await db.exec(`set role ${name ? 'authenticated' : 'anon'}`);
}
async function join(name, circle = 'ai-researchers') {
  await db.query('insert into community_members (circle_slug,user_id,display_name) values ($1,$2,$3)', [circle, users[name], name]);
}
async function post(name, circle = 'ai-researchers') {
  return (await db.query('insert into community_posts (circle_slug,author_id,title,body,topic) values ($1,$2,$3,$4,$5) returning *', [circle, users[name], 'A reproducible question', 'Compare a fixed quality and memory budget.', circle === 'ai-researchers' ? 'LLM inference' : 'Books & ideas'])).rows[0];
}
async function report(name, postId, replyId = null, circle = 'ai-researchers') {
  return (await db.query('insert into community_reports (circle_slug,post_id,reply_id,reporter_id,reason) values ($1,$2,$3,$4,$5) returning *', [circle, postId, replyId, users[name], 'Spam'])).rows[0];
}

try {
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  for (const file of ['202610280001_community_circles.sql', '202610290001_intellect_v02.sql']) {
    await db.exec(await readFile(new URL(`../../../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const id of Object.values(users)) await db.query('insert into auth.users(id) values ($1)', [id]);
  for (const name of ['alice', 'bob', 'researchMod', 'globalMod']) { await as(name); await join(name); }
  await as('globalMod'); await join('globalMod', 'global-commons');

  await test('a nonmember cannot create a researcher profile', async () => {
    await as('outsider');
    await rejected('insert into community_profiles (user_id,display_name) values ($1,$2)', [users.outsider, 'Outsider'], '42501');
  });
  await test('profile drafts are private to the owner', async () => {
    await as('alice');
    await db.query('insert into community_profiles (user_id,display_name,headline,time_zone) values ($1,$2,$3,$4)', [users.alice, 'Alice', 'Learning ML systems', 'Asia/Kolkata']);
    assert.equal((await db.query('select * from community_profiles')).rows.length, 1);
    await as('bob'); assert.equal((await db.query('select * from community_profiles')).rows.length, 0);
    await as(null); assert.equal((await db.query('select * from community_profiles')).rows.length, 0);
    await rejected('insert into community_profiles (user_id,display_name) values ($1,$2)', [users.bob, 'Bob'], '42501');
  });
  await test('publication is explicit and another member cannot change the profile', async () => {
    await as('alice'); await db.query('update community_profiles set published = true where user_id = $1', [users.alice]);
    await as(null); assert.equal((await db.query('select * from community_profiles')).rows.length, 1);
    await as('bob'); assert.equal((await db.query('update community_profiles set display_name = $1 where user_id = $2 returning user_id', ['Forged', users.alice])).rows.length, 0);
    await rejected('insert into community_profiles (user_id,display_name) values ($1,$2)', [users.alice, 'Forged'], '42501');
  });
  await test('profile time zones, links, identity, and server timestamps are constrained', async () => {
    await as('alice');
    await rejected('update community_profiles set time_zone = $1 where user_id = $2', ['Not/AZone', users.alice], '23514');
    await rejected('update community_profiles set website_url = $1 where user_id = $2', ['javascript:alert(1)', users.alice], '23514');
    await rejected('update community_profiles set orcid_url = $1 where user_id = $2', ['https://evil.example/0000', users.alice], '23514');
    await rejected('update community_profiles set user_id = $1 where user_id = $2', [users.bob, users.alice], '42501');
    await rejected('update community_profiles set updated_at = now() where user_id = $1', [users.alice], '42501');
  });
  await test('members can unpublish their profile without losing their private record', async () => {
    await db.query('update community_profiles set published = false where user_id = $1', [users.alice]);
    await as(null); assert.equal((await db.query('select * from community_profiles')).rows.length, 0);
    await as('alice'); assert.equal((await db.query('select * from community_profiles')).rows.length, 1);
  });
  await test('block lists are private, owner-controlled, and reversible', async () => {
    await as('alice');
    await db.query('insert into community_blocks (blocker_id,blocked_id,blocked_label) values ($1,$2,$3)', [users.alice, users.bob, 'Bob']);
    await rejected('insert into community_blocks (blocker_id,blocked_id) values ($1,$2)', [users.bob, users.alice], '42501');
    await rejected('insert into community_blocks (blocker_id,blocked_id) values ($1,$2)', [users.alice, users.alice], '23514');
    await as('bob'); assert.equal((await db.query('select * from community_blocks')).rows.length, 0);
    assert.equal((await db.query('delete from community_blocks returning *')).rows.length, 0);
    await as('alice'); assert.equal((await db.query('delete from community_blocks returning *')).rows.length, 1);
  });
  await test('moderator roles cannot be self-assigned or enumerated by another member', async () => {
    await as('alice'); await rejected('insert into community_moderators (circle_slug,user_id) values ($1,$2)', ['ai-researchers', users.alice], '42501');
    await db.exec('reset role');
    await db.query('insert into community_moderators (circle_slug,user_id) values ($1,$2),($3,$4)', ['ai-researchers', users.researchMod, 'global-commons', users.globalMod]);
    await as('bob'); assert.equal((await db.query('select * from community_moderators')).rows.length, 0);
    await as('researchMod'); assert.equal((await db.query('select * from community_moderators')).rows.length, 1);
  });

  await as('alice'); const discussion = await post('alice'); const other = await post('alice');
  await as('bob'); const reply = (await db.query('insert into community_replies (post_id,circle_slug,author_id,body) values ($1,$2,$3,$4) returning *', [discussion.id, 'ai-researchers', users.bob, 'A useful response.'])).rows[0];
  let ticket;
  await test('circle members can report a message once and cannot forge a reporter', async () => {
    ticket = await report('bob', discussion.id);
    await assert.rejects(() => report('bob', discussion.id), error => error.code === '23505');
    await rejected('insert into community_reports (circle_slug,post_id,reporter_id,reason) values ($1,$2,$3,$4)', ['ai-researchers', other.id, users.alice, 'Other'], '42501');
    await rejected('insert into community_reports (circle_slug,post_id,reply_id,reporter_id,reason) values ($1,$2,$3,$4,$5)', ['ai-researchers', other.id, reply.id, users.bob, 'Other'], '23503');
  });
  await test('nonmembers and anonymous visitors cannot report', async () => {
    await as('outsider'); await assert.rejects(() => report('outsider', discussion.id), error => error.code === '42501');
    await as(null); await assert.rejects(() => report('bob', other.id), error => error.code === '42501');
  });
  await test('report details are visible to the reporter and assigned circle moderators only', async () => {
    await as(null); await rejected('select * from community_reports', [], '42501');
    await as('alice'); assert.equal((await db.query('select * from community_reports')).rows.length, 0);
    await as('bob'); assert.equal((await db.query('select * from community_reports')).rows.length, 1);
    await as('globalMod'); assert.equal((await db.query('select * from community_reports')).rows.length, 0);
    await as('researchMod'); assert.equal((await db.query('select * from community_reports')).rows.length, 1);
  });
  await test('reporters cannot edit status, resolution, or moderation visibility', async () => {
    await as('bob');
    await rejected('update community_reports set status = $1 where id = $2', ['dismissed', ticket.id], '42501');
    await rejected('insert into community_reports (circle_slug,post_id,reporter_id,reason,status) values ($1,$2,$3,$4,$5)', ['ai-researchers', other.id, users.bob, 'Other', 'reviewed'], '42501');
    await rejected('update community_posts set hidden_at = now() where id = $1', [discussion.id], '42501');
  });
  await test('moderation RPC rejects ordinary members, anonymous calls, and moderators of another circle', async () => {
    for (const user of ['bob', 'globalMod', null]) {
      await as(user); await rejected('select review_community_report($1,$2,$3)', [ticket.id, 'hide', 'Review note'], '42501');
    }
  });
  await test('hiding a discussion removes it and its replies from public reads', async () => {
    await as('researchMod'); await db.query('select review_community_report($1,$2,$3)', [ticket.id, 'hide', 'Review completed.']);
    assert.equal((await db.query('select * from community_posts where id = $1', [discussion.id])).rows.length, 1);
    for (const user of [null, 'alice', 'bob']) {
      await as(user);
      assert.equal((await db.query('select * from community_posts where id = $1', [discussion.id])).rows.length, 0);
      assert.equal((await db.query('select * from community_replies where post_id = $1', [discussion.id])).rows.length, 0);
    }
  });
  await test('members cannot reply to hidden discussions', async () => {
    await as('bob');
    await rejected('insert into community_replies (post_id,circle_slug,author_id,body) values ($1,$2,$3,$4)', [discussion.id, 'ai-researchers', users.bob, 'Another response'], '42501');
  });
  await test('moderators can restore content, with server-owned resolution metadata', async () => {
    await as('researchMod'); await db.query('select review_community_report($1,$2,$3)', [ticket.id, 'restore', 'Restored after review.']);
    const resolved = (await db.query('select * from community_reports where id = $1', [ticket.id])).rows[0];
    assert.equal(resolved.status, 'restored'); assert.equal(resolved.resolved_by, users.researchMod); assert.ok(resolved.resolved_at);
    await as(null); assert.equal((await db.query('select * from community_replies where id = $1', [reply.id])).rows.length, 1);
  });
  await test('reply moderation hides the targeted reply while keeping the discussion available', async () => {
    await as('alice'); const replyTicket = await report('alice', discussion.id, reply.id);
    await as('researchMod'); await db.query('select review_community_report($1,$2,$3)', [replyTicket.id, 'hide', 'Reply reviewed.']);
    await as(null);
    assert.equal((await db.query('select * from community_posts where id = $1', [discussion.id])).rows.length, 1);
    assert.equal((await db.query('select * from community_replies where id = $1', [reply.id])).rows.length, 0);
  });
  await test('invalid decisions and stale duplicate reviews cannot alter a report', async () => {
    await as('researchMod');
    await rejected('select review_community_report($1,$2,$3)', [ticket.id, null, ''], '22023');
    await rejected('select review_community_report($1,$2,$3)', [ticket.id, 'hide', ''], 'P0001');
  });
  await test('report rate limits are enforced by PostgreSQL', async () => {
    await as('alice');
    const replies = [];
    for (let i = 0; i < 10; i++) replies.push((await db.query('insert into community_replies (post_id,circle_slug,author_id,body) values ($1,$2,$3,$4) returning id', [other.id, 'ai-researchers', users.alice, `Useful response ${i}`])).rows[0].id);
    await as('bob');
    const current = (await db.query('select count(*)::int as count from community_reports')).rows[0].count;
    for (let i = 0; i < 10 - current; i++) await report('bob', other.id, replies[i]);
    await assert.rejects(() => report('bob', other.id, replies[9]), error => error.code === 'P0001');
  });
  console.log(`v0.2 PostgreSQL checks passed: ${checks}. Hosted Auth, email, and Realtime require project activation.`);
} finally { await db.close(); }

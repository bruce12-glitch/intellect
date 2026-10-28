import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { validateCommunityConfig } from './check-community-config.mjs';

// Execute the real migration and policies inside PostgreSQL, not a mocked query client.
const db = new PGlite();
const ids = {
  alice: '11111111-1111-4111-8111-111111111111',
  bob: '22222222-2222-4222-8222-222222222222',
  outsider: '33333333-3333-4333-8333-333333333333',
};
let checks = 0;
async function test(name, fn) {
  await fn(); checks++; console.log(`✓ ${name}`);
}
async function rejected(sql, params = [], code) {
  await assert.rejects(() => db.query(sql, params), error => {
    if (code) assert.equal(error.code, code, error.message);
    return true;
  });
}
async function as(user) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ? ids[user] : '']);
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`);
}
async function join(circle = 'ai-researchers', user = 'alice', name = 'Alice') {
  return db.query('insert into community_members (circle_slug, user_id, display_name) values ($1, $2, $3)', [circle, ids[user], name]);
}
async function post(user = 'alice', circle = 'ai-researchers', topic = 'LLM inference') {
  return db.query('insert into community_posts (circle_slug, author_id, title, body, topic) values ($1, $2, $3, $4, $5) returning *', [circle, ids[user], 'Testing KV-cache evaluation', 'Measure latency and quality at a fixed memory budget.', topic]);
}

try {
  await test('public configuration accepts preview and browser-safe keys only', () => {
    assert.equal(validateCommunityConfig(), false);
    assert.equal(validateCommunityConfig('https://example.supabase.co', 'sb_publishable_example'), true);
    const token = role => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
    assert.equal(validateCommunityConfig('https://example.supabase.co', token('anon')), true);
    assert.throws(() => validateCommunityConfig('https://example.supabase.co', token('service_role')));
    assert.throws(() => validateCommunityConfig('https://example.supabase.co', 'sb_secret_example'));
    assert.throws(() => validateCommunityConfig('https://example.supabase.co'));
    assert.throws(() => validateCommunityConfig('', 'sb_publishable_example'));
    assert.throws(() => validateCommunityConfig('http://example.supabase.co', 'sb_publishable_example'));
    assert.equal(validateCommunityConfig('http://localhost:54321', 'sb_publishable_example'), true);
  });

  await test('Next configuration rejects unsafe settings after environment files are loaded', async () => {
    const loadConfig = createRequire(import.meta.url)('../next.config.js');
    const previous = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY];
    try {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_test_only';
      await assert.rejects(() => loadConfig(), /secret Supabase key/);
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
      assert.equal((await loadConfig()).reactStrictMode, true);
    } finally {
      ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].forEach((key, index) => {
        if (previous[index] === undefined) delete process.env[key];
        else process.env[key] = previous[index];
      });
    }
  });

  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const migration = await readFile(new URL('../../../supabase/migrations/202610280001_community_circles.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  for (const id of Object.values(ids)) await db.query('insert into auth.users (id) values ($1)', [id]);

  await test('anonymous readers see both circle definitions but cannot create memberships or posts', async () => {
    await as(null);
    assert.equal((await db.query('select * from community_circles')).rows.length, 2);
    await rejected('insert into community_members (circle_slug, user_id, display_name) values ($1, $2, $3)', ['ai-researchers', ids.alice, 'Alice'], '42501');
    await rejected('insert into community_posts (circle_slug, author_id, title, body, topic) values ($1, $2, $3, $4, $5)', ['ai-researchers', ids.alice, 'Title', 'Body', 'LLM inference'], '42501');
  });

  await test('membership belongs to the signed-in user and is private to that user', async () => {
    await as('alice'); await join();
    await rejected('insert into community_members (circle_slug, user_id, display_name) values ($1, $2, $3)', ['ai-researchers', ids.bob, 'Impersonation'], '42501');
    await as('bob');
    assert.equal((await db.query('select * from community_members')).rows.length, 0);
    await join('ai-researchers', 'bob', 'Bob');
    assert.equal((await db.query('select * from community_members')).rows.length, 1);
    assert.equal((await db.query('update community_members set display_name = $1 where user_id = $2 returning *', ['Forged', ids.alice])).rows.length, 0);
  });

  let rootPost;
  await test('Postgres stamps an authorized member’s name and timestamp', async () => {
    await as('alice');
    rootPost = (await post()).rows[0];
    assert.equal(rootPost.author_name, 'Alice');
    assert.equal(rootPost.author_id, ids.alice);
    assert.ok(Math.abs(Date.now() - new Date(rootPost.created_at).getTime()) < 10000);
    await rejected('insert into community_posts (circle_slug, author_id, author_name, title, body, topic) values ($1, $2, $3, $4, $5, $6)', ['ai-researchers', ids.alice, 'Forged', 'Title', 'Body', 'LLM inference'], '42501');
    await rejected('insert into community_posts (circle_slug, author_id, created_at, title, body, topic) values ($1, $2, now(), $3, $4, $5)', ['ai-researchers', ids.alice, 'Title', 'Body', 'LLM inference'], '42501');
    await rejected('update community_posts set body = $1 where id = $2', ['Changed', rootPost.id], '42501');
  });

  await test('nonmembers and forged author IDs cannot publish', async () => {
    await as('outsider'); await assert.rejects(() => post('outsider'), error => error.code === '42501');
    await as('bob'); await assert.rejects(() => post('alice'), error => error.code === '42501');
  });

  await test('database constraints reject invalid topics, links, and empty discussions', async () => {
    await as('alice');
    await assert.rejects(() => post('alice', 'ai-researchers', 'Introductions'), error => error.code === '23514');
    await rejected('insert into community_posts (circle_slug, author_id, title, body, topic, source_url) values ($1, $2, $3, $4, $5, $6)', ['ai-researchers', ids.alice, 'Title', 'Body', 'Paper club', 'javascript:alert(1)'], '23514');
    await rejected('insert into community_posts (circle_slug, author_id, title, body, topic) values ($1, $2, $3, $4, $5)', ['ai-researchers', ids.alice, ' ', 'Body', 'LLM inference'], '23514');
  });

  let replyId;
  await test('replies require the same circle and authenticated author', async () => {
    await as('bob');
    const reply = await db.query('insert into community_replies (post_id, circle_slug, author_id, body) values ($1, $2, $3, $4) returning *', [rootPost.id, 'ai-researchers', ids.bob, 'Add a fixed-quality baseline.']);
    replyId = reply.rows[0].id;
    assert.equal(reply.rows[0].author_name, 'Bob');
    await join('global-commons', 'bob', 'Bob');
    await rejected('insert into community_replies (post_id, circle_slug, author_id, body) values ($1, $2, $3, $4)', [rootPost.id, 'global-commons', ids.bob, 'Wrong room'], '23503');
    await rejected('insert into community_replies (post_id, circle_slug, author_id, body) values ($1, $2, $3, $4)', [rootPost.id, 'ai-researchers', ids.alice, 'Forged reply'], '42501');
  });

  await test('discussions and replies are public; membership details are not', async () => {
    await as(null);
    assert.equal((await db.query('select * from community_posts where id = $1', [rootPost.id])).rows.length, 1);
    assert.equal((await db.query('select * from community_replies where id = $1', [replyId])).rows.length, 1);
    await rejected('select * from community_members', [], '42501');
    assert.equal((await db.query("select id from community_posts where search_document @@ websearch_to_tsquery('english', $1)", ['latency memory'])).rows.length, 1);
  });

  await test('an author can remove their own message but cannot remove someone else’s', async () => {
    await as('bob');
    assert.equal((await db.query('delete from community_posts where id = $1 returning id', [rootPost.id])).rows.length, 0);
    await as('alice');
    assert.equal((await db.query('delete from community_replies where id = $1 returning id', [replyId])).rows.length, 0);
    await as('bob');
    assert.equal((await db.query('delete from community_replies where id = $1 returning id', [replyId])).rows.length, 1);
  });

  await test('server limits apply to discussions and replies, including cross-circle posting', async () => {
    await as('alice');
    for (let index = 0; index < 4; index++) await post();
    await join('global-commons');
    await assert.rejects(() => post('alice', 'global-commons', 'Books & ideas'), error => error.code === 'P0001');
    await as('bob');
    for (let index = 0; index < 60; index++) await db.query('insert into community_replies (post_id, circle_slug, author_id, body) values ($1, $2, $3, $4)', [rootPost.id, 'ai-researchers', ids.bob, `Reply ${index}`]);
    await rejected('insert into community_replies (post_id, circle_slug, author_id, body) values ($1, $2, $3, $4)', [rootPost.id, 'ai-researchers', ids.bob, 'One too many'], 'P0001');
  });

  await test('removing a discussion cascades its replies, and account removal does not leave orphaned messages', async () => {
    await as('alice');
    assert.equal((await db.query('delete from community_posts where id = $1 returning id', [rootPost.id])).rows.length, 1);
    assert.equal((await db.query('select * from community_replies where post_id = $1', [rootPost.id])).rows.length, 0);
    await db.exec('reset role');
    await db.query('delete from auth.users where id = $1', [ids.alice]);
    assert.equal((await db.query('select * from community_posts where author_id = $1', [ids.alice])).rows.length, 0);
  });
  console.log(`Community checks passed: ${checks}. Hosted email delivery and Realtime still require a configured Supabase project.`);
} finally { await db.close(); }

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getCommunityClient } from '@/lib/community-client';
import type { CircleSlug, CommunityPost, CommunityReply } from './community-data';

export function useCommunityCircle(circle: CircleSlug, topic: string, search: string) {
  const [client] = useState(getCommunityClient);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<{ display_name: string; user_id: string } | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(!!client);
  const [error, setError] = useState('');
  const [realtime, setRealtime] = useState(false);
  const [online, setOnline] = useState(true);
  const [blocks, setBlocks] = useState<{ blocked_id: string; blocked_label: string }[]>([]);
  const [moderator, setModerator] = useState(false);
  const [safetyError, setSafetyError] = useState('');
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!client) return;
    const request = ++generation.current;
    setLoading(true);
    let query = client.from('community_posts').select('*').eq('circle_slug', circle).is('hidden_at', null).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
    if (topic !== 'All rooms') query = query.eq('topic', topic);
    if (search.trim()) query = query.textSearch('search_document', search.trim(), { type: 'websearch', config: 'english' });
    try {
      const result = await query;
      if (request !== generation.current) return;
      if (result.error) throw result.error;
      setPosts((result.data || []) as CommunityPost[]);
      setError('');
    } catch {
      if (request === generation.current) setError('We couldn’t load the shared circle. Try refreshing in a moment. Your drafts are safe on this device.');
    } finally { if (request === generation.current) setLoading(false); }
  }, [client, circle, topic, search, limit]);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError) setError('Your sign-in link could not be used. Request a fresh link to sign in.');
      setSession(data.session);
    }).catch(() => { if (active) setError('Sign-in is unavailable right now. Please try again.'); });
    const { data } = client.auth.onAuthStateChange((_event, next) => { if (active) setSession(next); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => {
    setMember(null);
    if (!client || !session) return;
    let active = true;
    void client.from('community_members').select('display_name,user_id').eq('circle_slug', circle).eq('user_id', session.user.id).maybeSingle().then(result => {
      if (active && !result.error) setMember(result.data);
    });
    return () => { active = false; };
  }, [client, session, circle]);

  useEffect(() => {
    setBlocks([]); setModerator(false); setSafetyError('');
    if (!client || !session) return;
    let active = true;
    void (async () => {
      try {
        const [blocked, role] = await Promise.all([
          client.from('community_blocks').select('blocked_id,blocked_label').eq('blocker_id', session.user.id).limit(1000),
          client.from('community_moderators').select('user_id').eq('circle_slug', circle).eq('user_id', session.user.id).maybeSingle(),
        ]);
        if (!active) return;
        if (blocked.error || role.error) throw blocked.error || role.error;
        setBlocks(blocked.data || []); setModerator(!!role.data);
      } catch { if (active) setSafetyError('Community care needs the v0.2 database migration, or its connection could not be loaded.'); }
    })();
    return () => { active = false; };
  }, [client, session?.user.id, circle]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), search ? 300 : 0);
    return () => { clearTimeout(timer); generation.current++; };
  }, [refresh, search]);

  useEffect(() => {
    const updateNetwork = () => setOnline(navigator.onLine);
    updateNetwork();
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    if (!client) return () => { window.removeEventListener('online', updateNetwork); window.removeEventListener('offline', updateNetwork); };
    const update = () => { if (navigator.onLine && document.visibilityState === 'visible') void refreshRef.current(); };
    const channel = client.channel(`circle-${circle}-${Date.now()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts', filter: `circle_slug=eq.${circle}` }, update).subscribe(status => setRealtime(status === 'SUBSCRIBED'));
    const poll = setInterval(update, 30000);
    window.addEventListener('online', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('online', updateNetwork); window.removeEventListener('offline', updateNetwork);
      window.removeEventListener('online', update); window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update); clearInterval(poll);
      void client.removeChannel(channel);
    };
  }, [client, circle]);

  async function join(displayName: string) {
    if (!client || !session) throw new Error('Sign in before joining the shared circle.');
    const result = await client.from('community_members').insert({ circle_slug: circle, user_id: session.user.id, display_name: displayName.trim() }).select('display_name,user_id').single();
    if (result.error?.code === '23505') {
      const existing = await client.from('community_members').select('display_name,user_id').eq('circle_slug', circle).eq('user_id', session.user.id).single();
      if (existing.error) throw existing.error;
      setMember(existing.data); return;
    }
    if (result.error) throw result.error;
    setMember(result.data);
  }

  async function insertRecord(table: 'community_posts' | 'community_replies', payload: Record<string, unknown>) {
    if (!client || !session || !member) throw new Error('Sign in and join this circle before publishing.');
    const record = { ...payload, circle_slug: circle, author_id: session.user.id };
    const result = await client.from(table).insert(record).select().single();
    if (result.error) {
      // Retrying the same message ID after a network failure must not send twice.
      const existing = await client.from(table).select().eq('id', payload.id).eq('circle_slug', circle).eq('author_id', session.user.id).single();
      if (!existing.error) return existing.data;
    }
    if (result.error) throw result.error;
    return result.data;
  }

  async function remove(table: 'community_posts' | 'community_replies', id: string) {
    if (!client || !session) throw new Error('Sign in before removing a message.');
    const result = await client.from(table).delete().eq('id', id).eq('author_id', session.user.id);
    if (result.error) throw result.error;
    await refresh();
  }

  async function blockAuthor(id: string, label: string) {
    if (!client || !session) throw new Error('Sign in to manage your block list.');
    const result = await client.from('community_blocks').insert({ blocker_id: session.user.id, blocked_id: id, blocked_label: label.slice(0, 40) || 'Circle member' });
    if (result.error && result.error.code !== '23505') throw result.error;
    setBlocks(current => [...current.filter(item => item.blocked_id !== id), { blocked_id: id, blocked_label: label.slice(0, 40) || 'Circle member' }]);
  }

  async function unblockAuthor(id: string) {
    if (!client || !session) throw new Error('Sign in to manage your block list.');
    const result = await client.from('community_blocks').delete().eq('blocker_id', session.user.id).eq('blocked_id', id);
    if (result.error) throw result.error;
    setBlocks(current => current.filter(item => item.blocked_id !== id));
  }

  return { client, session, member, posts, loading, error, realtime, online, limit, setLimit, refresh, join, insertRecord, remove, blocks, moderator, safetyError, blockAuthor, unblockAuthor };
}

export type CommunityApi = ReturnType<typeof useCommunityCircle>;

export function useSharedReplies(post: CommunityPost | null, changed: number) {
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setReplies([]); setError('');
    const client = getCommunityClient();
    if (!client || !post || post.example || post.draft) return;
    let active = true;
    const load = async () => {
      try {
        const result = await client.from('community_replies').select('*').eq('post_id', post.id).is('hidden_at', null).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(300);
        if (!active) return;
        if (result.error) throw result.error;
        setReplies(((result.data || []) as CommunityReply[]).reverse()); setError('');
      } catch { if (active) setError('Replies could not be refreshed. Please try again.'); }
    };
    void load();
    const channel = client.channel(`thread-${post.id}-${Date.now()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'community_replies', filter: `post_id=eq.${post.id}` }, () => void load()).subscribe();
    const poll = setInterval(() => { if (navigator.onLine && document.visibilityState === 'visible') void load(); }, 30000);
    return () => { active = false; clearInterval(poll); void client.removeChannel(channel); };
  }, [post?.id, changed]);
  return { replies, error };
}

export function communityError(error: unknown, fallback: string) {
  const value = error as { code?: string; message?: string };
  if (value?.code === 'P0001' && value.message) return value.message;
  if (value?.code === '42501') return 'Sign in and join this circle before publishing.';
  if (value?.code === '23514') return 'Check the title, message length, selected room, and HTTPS source link.';
  return fallback;
}

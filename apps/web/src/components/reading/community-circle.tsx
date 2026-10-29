'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, Clock3, Cpu, FileText, Flag, Globe, Layers, Link2, Lock, LogOut, MessagesSquare, Plus, RefreshCw, Send, Trash2, Users, UserX, Wifi, X } from 'lucide-react';
import { circleDetails, examplePosts, newMessageId, validSourceUrl, type CircleSlug, type CommunityPost, type CommunityReply } from './community-data';
import { communityError, useCommunityCircle, useSharedReplies } from './use-community-circle';
import { CommunityDialog } from './community-dialog';
import { CommunityCare, type SafetyTarget } from './community-care';
import { ResearchDesk, ResearchProjects } from './research-desk';
import { ResearchPeople } from './research-people';
import type { DiscussionSeed, ResearchSpace } from './research-data';

interface Editor { id: string; title: string; body: string; topic: string; source_url: string }
interface LocalCircle { followed: boolean; posts: CommunityPost[]; replies: CommunityReply[]; editor: Editor; replyEditors: Record<string, { id: string; body: string }> }
const freshEditor = (circle: CircleSlug): Editor => ({ id: newMessageId(), title: '', body: '', topic: circleDetails[circle].topics[0], source_url: '' });
const asset = (name: string) => `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/images/${name}`;
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function formatTimestamp(value: string) {
  if (!value || Number.isNaN(Date.parse(value))) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function CommunityCircle({ circle, search, nickname, switchCircle }: { circle: CircleSlug; search: string; nickname: string; switchCircle: () => void }) {
  const details = circleDetails[circle];
  const [topic, setTopic] = useState('All rooms');
  const [space, setSpace] = useState<ResearchSpace>(() => {
    const value = new URLSearchParams(window.location.search).get('space');
    return circle === 'ai-researchers' && ['papers', 'projects', 'people'].includes(value || '') ? value as ResearchSpace : 'discussions';
  });
  const api = useCommunityCircle(circle, space === 'projects' ? 'Collaboration' : space === 'discussions' ? topic : 'All rooms', ['papers', 'people'].includes(space) ? '' : search);
  const [local, setLocal] = useState<LocalCircle>(() => ({ followed: false, posts: [], replies: [], editor: freshEditor(circle), replyEditors: {} }));
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [feed, setFeed] = useState<'discussions' | 'drafts'>('discussions');
  const [selected, setSelected] = useState<CommunityPost | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState(nickname === 'Reader' ? '' : nickname.slice(0, 40));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [replyVersion, setReplyVersion] = useState(0);
  const [now, setNow] = useState(new Date());
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);
  const [pendingSeed, setPendingSeed] = useState<DiscussionSeed | null>(null);
  const sharedReplies = useSharedReplies(selected, replyVersion);
  const preview = !api.client;
  const research = circle === 'ai-researchers';
  const storageKey = `intellect-circle-v1:${circle}`;
  const ownName = api.member?.display_name || displayName.trim() || nickname || 'Curious reader';

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved && typeof saved === 'object') {
        const posts = Array.isArray(saved.posts) ? saved.posts.filter((post: CommunityPost) => post && post.draft === true && post.circle_slug === circle && typeof post.id === 'string' && typeof post.title === 'string' && typeof post.body === 'string' && typeof post.topic === 'string') : [];
        const replies = Array.isArray(saved.replies) ? saved.replies.filter((reply: CommunityReply) => reply && reply.draft === true && reply.circle_slug === circle && typeof reply.body === 'string' && typeof reply.post_id === 'string') : [];
        const editor = saved.editor && typeof saved.editor.id === 'string' && isUuid(saved.editor.id) && ['title', 'body', 'topic', 'source_url'].every(key => typeof saved.editor[key] === 'string') ? saved.editor : freshEditor(circle);
        const replyEditors: LocalCircle['replyEditors'] = {};
        if (saved.replyEditors && typeof saved.replyEditors === 'object') {
          for (const [id, value] of Object.entries(saved.replyEditors)) {
            const draft = value as { id?: unknown; body?: unknown };
            if (typeof draft?.id === 'string' && isUuid(draft.id) && typeof draft.body === 'string') replyEditors[id] = { id: draft.id, body: draft.body };
          }
        }
        setLocal({ followed: saved.followed === true, posts, replies, editor, replyEditors });
      }
    } catch { setStorageError(true); }
    setHydrated(true);
  }, [circle, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(storageKey, JSON.stringify(local)); }
    catch { setStorageError(true); }
  }, [hydrated, local, storageKey]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('thread');
    if (!id || !isUuid(id) || !api.client) return;
    let active = true;
    void api.client.from('community_posts').select('*').eq('id', id).eq('circle_slug', circle).is('hidden_at', null).maybeSingle().then(result => {
      if (!active) return;
      if (result.error || !result.data) setActionError('This discussion is unavailable or has been removed.');
      else setSelected(result.data as CommunityPost);
    });
    return () => { active = false; };
  }, [api.client, circle]);

  useEffect(() => {
    if (!selected || !api.blocks.some(block => block.blocked_id === selected.author_id)) return;
    setSelected(null);
    const url = new URL(window.location.href); url.searchParams.delete('thread'); window.history.replaceState(null, '', url);
  }, [api.blocks, selected]);

  function chooseSpace(next: ResearchSpace) {
    setSpace(next); setSelected(null); setComposeOpen(false); setTopic('All rooms'); setFeed('discussions'); setNotice(''); setActionError(''); api.setLimit(30);
    const url = new URL(window.location.href);
    if (next === 'discussions') url.searchParams.delete('space'); else url.searchParams.set('space', next);
    url.searchParams.delete('thread'); window.history.replaceState(null, '', url);
  }

  function applySeed(seed: DiscussionSeed) {
    chooseSpace('discussions');
    setLocal(current => ({ ...current, editor: { ...seed, id: newMessageId() } }));
    setComposeOpen(true); setTopic(seed.topic); setPendingSeed(null);
    requestAnimationFrame(() => document.getElementById('post-title')?.focus({ preventScroll: true }));
  }

  function startDraft(seed: DiscussionSeed) {
    if (local.editor.title.trim() || local.editor.body.trim()) setPendingSeed(seed);
    else applySeed(seed);
  }

  function needAuth() {
    setAuthOpen(true);
    requestAnimationFrame(() => document.getElementById('circle-auth')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  }

  function openThread(post: CommunityPost | null) {
    setSelected(post); setConfirmRemove(false); setActionError(''); setNotice('');
    const url = new URL(window.location.href);
    if (post && !post.example && !post.draft) url.searchParams.set('thread', post.id);
    else url.searchParams.delete('thread');
    window.history.replaceState(null, '', url);
    if (post && !local.replyEditors[post.id]) setLocal(current => ({ ...current, replyEditors: { ...current.replyEditors, [post.id]: { id: newMessageId(), body: '' } } }));
  }

  function setEditor(field: keyof Omit<Editor, 'id'>, value: string) {
    setLocal(current => ({ ...current, editor: { ...current.editor, [field]: value } }));
  }

  async function sendSignIn(event: FormEvent) {
    event.preventDefault();
    if (!api.client || busy) return;
    setBusy(true); setActionError(''); setNotice('');
    try {
      const redirect = new URL(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/`, window.location.origin);
      redirect.searchParams.set('circle', circle);
      const result = await api.client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect.href } });
      if (result.error) throw result.error;
      setNotice('Check your email for a sign-in link. It brings you back to this circle.'); setEmail('');
    } catch { setActionError('The sign-in email could not be sent. Please try again in a moment.'); }
    finally { setBusy(false); }
  }

  async function joinCircle() {
    setActionError(''); setNotice('');
    if (preview) { setLocal(current => ({ ...current, followed: true })); setNotice('Circle followed on this device. Shared membership is not activated yet.'); return; }
    if (!api.session) { setAuthOpen(true); return; }
    if (displayName.trim().length < 2) { setAuthOpen(true); setActionError('Choose a public display name of 2–40 characters.'); return; }
    setBusy(true);
    try { await api.join(displayName.trim()); setNotice('You’ve joined the shared circle. Your display name is public when you post.'); setAuthOpen(false); }
    catch (error) { setActionError(communityError(error, 'We couldn’t join the circle. Please try again.')); }
    finally { setBusy(false); }
  }

  function savePostDraft() {
    const editor = local.editor;
    if (editor.title.trim().length < 3 || editor.body.trim().length < 3 || !validSourceUrl(editor.source_url)) { setActionError('Add a title, a thought of at least 3 characters, and a valid HTTPS source link if you include one.'); return; }
    const post: CommunityPost = { ...editor, title: editor.title.trim(), body: editor.body.trim(), source_url: editor.source_url.trim() || null, circle_slug: circle, author_id: 'local', author_name: ownName, created_at: new Date().toISOString(), draft: true };
    setLocal(current => ({ ...current, posts: [post, ...current.posts.filter(item => item.id !== post.id)], editor: freshEditor(circle) }));
    setComposeOpen(false); setFeed('drafts'); setTopic(post.topic); openThread(post); setNotice('Private draft saved on this device. Nothing was sent to other people.');
  }

  async function publishPost(event: FormEvent) {
    event.preventDefault(); setActionError(''); setNotice('');
    if (preview) { savePostDraft(); return; }
    if (!api.session || !api.member) { setAuthOpen(true); setActionError('Sign in and join this circle to publish. Your text is kept as a draft.'); return; }
    if (!validSourceUrl(local.editor.source_url)) { setActionError('Please use a valid HTTPS source link.'); return; }
    setBusy(true);
    try {
      const editor = local.editor;
      const result = await api.insertRecord('community_posts', { id: editor.id, title: editor.title.trim(), body: editor.body.trim(), topic: editor.topic, source_url: editor.source_url.trim() || null });
      setLocal(current => ({ ...current, posts: current.posts.filter(post => post.id !== editor.id), editor: freshEditor(circle) }));
      setComposeOpen(false); setFeed('discussions'); openThread(result as CommunityPost);
      await api.refresh(); setNotice('Discussion published to the shared circle.');
    } catch (error) { setActionError(communityError(error, 'We couldn’t confirm publication. Your draft is kept. Retry or refresh before starting a new discussion.')); }
    finally { setBusy(false); }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const editor = local.replyEditors[selected.id];
    if (!editor || editor.body.trim().length < 2) return;
    setActionError(''); setNotice(''); setBusy(true);
    try {
      if (preview || selected.draft || selected.example) {
        const reply: CommunityReply = { id: editor.id, post_id: selected.id, circle_slug: circle, author_id: 'local', author_name: ownName, body: editor.body.trim(), created_at: new Date().toISOString(), draft: true };
        setLocal(current => ({ ...current, replies: [...current.replies.filter(item => item.id !== reply.id), reply], replyEditors: { ...current.replyEditors, [selected.id]: { id: newMessageId(), body: '' } } }));
        setNotice('Private reply draft saved on this device. Nothing was sent.');
      } else {
        if (!api.session || !api.member) { setAuthOpen(true); setActionError('Sign in and join the circle before replying. Your text is kept.'); return; }
        await api.insertRecord('community_replies', { id: editor.id, post_id: selected.id, body: editor.body.trim() });
        setLocal(current => ({ ...current, replyEditors: { ...current.replyEditors, [selected.id]: { id: newMessageId(), body: '' } } }));
        setReplyVersion(value => value + 1); setNotice('Reply published to the shared discussion.');
      }
    } catch (error) { setActionError(communityError(error, 'We couldn’t confirm your reply. Your text is kept; retrying will not send the same message twice.')); }
    finally { setBusy(false); }
  }

  async function removeSelected() {
    if (!selected) return;
    setBusy(true); setActionError('');
    try {
      if (selected.draft) setLocal(current => ({ ...current, posts: current.posts.filter(post => post.id !== selected.id), replies: current.replies.filter(reply => reply.post_id !== selected.id) }));
      else await api.remove('community_posts', selected.id);
      openThread(null); setNotice('Discussion removed.');
    } catch { setActionError('The discussion could not be removed. Please try again.'); }
    finally { setBusy(false); }
  }

  const localPosts = local.posts.filter(post => (topic === 'All rooms' || post.topic === topic) && `${post.title} ${post.body} ${post.topic}`.toLowerCase().includes(search.toLowerCase().trim()));
  const examples = examplePosts.filter(post => post.circle_slug === circle && (topic === 'All rooms' || post.topic === topic) && `${post.title} ${post.body} ${post.topic}`.toLowerCase().includes(search.toLowerCase().trim()));
  const blocked = new Set(api.blocks.map(item => item.blocked_id));
  const shownPosts = feed === 'drafts' ? localPosts : preview ? examples : api.posts.filter(post => !blocked.has(post.author_id));
  const replyList = (selected?.draft || selected?.example || preview ? local.replies.filter(reply => reply.post_id === selected?.id) : sharedReplies.replies).filter(reply => !blocked.has(reply.author_id));
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const canRemove = selected && !selected.example && (selected.draft || selected.author_id === api.session?.user.id);

  return <section className={`community-space ${research ? 'research-space' : 'commons-space'} ${space !== 'discussions' ? 'workspace-open' : ''}`} aria-labelledby="circle-title">
    <header className="circle-hero"><div className="circle-hero-copy"><span className="circle-kicker">{research ? <Cpu size={15} /> : <Globe size={15} />}{details.eyebrow}</span><p className="circle-name">{details.name}<span>{research ? 'OPEN LAB · V0.2' : 'OPEN CIRCLE · V0.2'}</span></p><h1 id="circle-title">{details.title}</h1><p className="circle-description">{details.description}</p><div className="circle-hero-actions"><button className="button button-lime" onClick={() => void joinCircle()} disabled={busy || (preview ? local.followed : !!api.member)}>{(preview ? local.followed : api.member) ? <Check size={18} /> : <Users size={18} />}{preview ? local.followed ? 'Following on this device' : 'Follow this circle' : api.member ? 'Circle joined' : 'Join this circle'}</button><span><Globe size={15} />Open to curious minds, wherever you are.</span></div></div><div className="circle-orbit" aria-hidden="true"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><Globe size={102} strokeWidth={1} /><span className="orbit-node node-one"><Cpu size={19} /></span><span className="orbit-node node-two"><BookOpen size={20} /></span><span className="orbit-node node-three"><MessagesSquare size={19} /></span><span className="orbit-note">Ideas travel well.</span></div></header>

    <div className={`circle-connection ${preview ? 'connection-preview' : api.error || !api.online ? 'connection-error' : ''}`}><span className="connection-icon">{preview ? <Lock size={18} /> : <Wifi size={18} />}</span><div><strong>{preview ? 'Explore the circle. Shared messaging needs activation.' : !api.online ? 'You’re offline. Your draft stays here.' : api.error ? 'The shared connection is unavailable.' : api.loading ? 'Connecting to the shared circle…' : 'Shared circle connected.'}</strong><p>{preview ? 'These are example prompts. Posts and replies you draft here stay on this device; nobody else receives them.' : api.realtime ? 'Discussions are saved online. New messages update while you’re here.' : 'Discussions are saved online. Refresh to catch up while live updates reconnect.'}</p></div>{!preview && <button className="icon-button" aria-label="Refresh shared discussions" onClick={() => void api.refresh()} disabled={api.loading}><RefreshCw size={18} /></button>}</div>
    {storageError && <p className="circle-error" role="alert">This browser cannot save private drafts. Copy your text before leaving.</p>}

    {!preview && <div className="circle-account"><span>{api.session ? <><Check size={15} />{api.member ? `Posting as ${api.member.display_name}` : 'Signed in. Join the circle to contribute.'}</> : <><Lock size={15} />Sign in to take part in the shared conversation.</>}</span><button className="text-button" onClick={() => api.session ? void api.client?.auth.signOut().then(result => { if (result.error) setActionError('Sign-out could not be completed. Please retry.'); else { setNotice('Signed out.'); setAuthOpen(false); } }) : setAuthOpen(!authOpen)}>{api.session ? <><LogOut size={15} />Sign out</> : 'Sign in with email'}</button></div>}
    {!preview && (authOpen || (api.session && !api.member)) && <div className="circle-auth" id="circle-auth"><h2>{api.session ? 'A name for the conversation.' : 'A little introduction.'}</h2><p>{api.session ? 'Choose a public display name. Your email address is not shown on discussions.' : 'We’ll send a sign-in link. No password to remember. Published discussions and replies are visible to everyone.'}</p>{api.session ? <form onSubmit={event => { event.preventDefault(); void joinCircle(); }}><label htmlFor="circle-display-name">Public display name<input id="circle-display-name" value={displayName} onChange={event => setDisplayName(event.target.value)} minLength={2} maxLength={40} required placeholder="A name or a nickname" /></label><button className="button button-lime" type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join the shared circle'}<ArrowRight size={17} /></button></form> : <form onSubmit={sendSignIn}><label htmlFor="circle-email">Email address<input id="circle-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" /></label><button type="submit" className="button button-lime" disabled={busy}>{busy ? 'Sending…' : 'Send me a sign-in link'}<ArrowRight size={17} /></button></form>}</div>}

    {notice && <p className="circle-notice" role="status"><Check size={17} />{notice}<button className="icon-button" aria-label="Dismiss circle notice" onClick={() => setNotice('')}><X size={16} /></button></p>}
    {(actionError || api.error) && <p className="circle-error" role="alert">{actionError || api.error}</p>}

    <div className="research-navigation-row">{research && <nav className="research-space-navigation" aria-label="Research circle spaces">{([{ key: 'discussions', label: 'Discussions', icon: MessagesSquare }, { key: 'papers', label: 'Paper club', icon: BookOpen }, { key: 'projects', label: 'Projects', icon: Layers }, { key: 'people', label: 'People', icon: Users }] as const).map(({ key, label, icon: Icon }) => <button key={key} aria-pressed={space === key} className={space === key ? 'active' : ''} onClick={() => chooseSpace(key)}><Icon size={17} />{label}</button>)}</nav>}<CommunityCare api={api} circle={circle} target={safetyTarget} clearTarget={() => setSafetyTarget(null)} onNeedAuth={needAuth} /></div>

    {space === 'papers' ? <ResearchDesk search={search} onDraft={startDraft} /> : space === 'projects' ? <ResearchProjects api={api} search={search} onDraft={startDraft} onOpen={post => { chooseSpace('discussions'); openThread(post); }} /> : space === 'people' ? <ResearchPeople api={api} search={search} nickname={nickname} onNeedAuth={needAuth} onProjects={() => chooseSpace('projects')} /> : <div className="circle-layout"><div className="circle-main"><div className="circle-toolbar"><div role="group" aria-label="Discussion view"><button aria-pressed={feed === 'discussions'} className={feed === 'discussions' ? 'active' : ''} onClick={() => { setFeed('discussions'); openThread(null); }}>{preview ? 'Explore discussions' : 'Discussions'}</button><button aria-pressed={feed === 'drafts'} className={feed === 'drafts' ? 'active' : ''} onClick={() => { setFeed('drafts'); openThread(null); }}>My drafts<span>{local.posts.length}</span></button></div><button className="button button-lime" onClick={() => { openThread(null); setComposeOpen(!composeOpen); setActionError(''); }}><Plus size={17} />{preview ? 'Draft a discussion' : 'Start a discussion'}</button></div>
      <div className="circle-topics" role="group" aria-label="Choose a topic room">{['All rooms', ...details.topics].map(item => <button key={item} aria-pressed={topic === item} className={topic === item ? 'active' : ''} onClick={() => { setTopic(item); openThread(null); }}>{item === 'All rooms' ? <Globe size={14} /> : item === 'Paper club' ? <FileText size={14} /> : item === 'Collaboration' ? <Users size={14} /> : <Cpu size={14} />}{item}</button>)}</div>

      {composeOpen && <form className="circle-composer" onSubmit={publishPost}><div className="composer-heading"><h2>{preview ? 'A question worth keeping.' : 'Give an idea a place to grow.'}</h2><button type="button" className="icon-button" aria-label="Close discussion composer" onClick={() => setComposeOpen(false)}><X size={18} /></button></div><label htmlFor="post-topic">Topic room<select id="post-topic" value={local.editor.topic} onChange={event => setEditor('topic', event.target.value)}>{details.topics.map(item => <option key={item}>{item}</option>)}</select></label><label htmlFor="post-title">Discussion title<input id="post-title" value={local.editor.title} onChange={event => setEditor('title', event.target.value)} minLength={3} maxLength={180} required placeholder={research ? 'What are you trying to understand or build?' : 'What has you thinking?'} /></label><label htmlFor="post-body">Your question or idea<textarea id="post-body" value={local.editor.body} onChange={event => setEditor('body', event.target.value)} minLength={3} maxLength={6000} required rows={5} placeholder={research ? 'Share the question, setup, sources, and what you have tried. For collaboration, include the scope and help you need.' : 'Give the next reader a little context and something thoughtful to respond to.'} /></label><label htmlFor="post-source">Paper or source link <span>(optional · HTTPS)</span><input id="post-source" type="url" value={local.editor.source_url} onChange={event => setEditor('source_url', event.target.value)} maxLength={2000} placeholder="https://arxiv.org/abs/…" /></label><div className="composer-footer"><p>{preview ? 'Saved privately on this device. Not posted to other people.' : 'Published posts are public. Your draft remains here if sending fails.'}</p>{!preview && <button className="button button-light" type="button" onClick={savePostDraft} disabled={busy}>Save private draft</button>}<button className="button button-lime" type="submit" disabled={busy || (!preview && !api.online)}>{busy ? 'Sending…' : preview ? 'Save private draft' : 'Publish discussion'}<Send size={16} /></button></div></form>}

      {selected ? <article className="community-thread"><div className="thread-controls"><button className="text-button" onClick={() => openThread(null)}><ArrowLeft size={16} />Back to discussions</button>{!selected.draft && !selected.example && <button className="text-button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setNotice('Discussion link copied.'); } catch { setNotice('Use the address bar to copy this discussion’s link.'); } }}><Link2 size={15} />Copy thread link</button>}</div><div className="community-post-meta"><span className="room-label">{selected.topic}</span>{selected.draft ? <span className="private-label"><Lock size={12} />Private draft</span> : selected.example ? <span className="example-label">Example discussion</span> : <time dateTime={selected.created_at}>{formatTimestamp(selected.created_at)}</time>}</div><h2>{selected.title}</h2><div className="community-author"><span>{selected.author_name?.slice(0, 1).toUpperCase() || 'R'}</span><strong>{selected.author_name || 'Circle member'}</strong></div><p className="community-message">{selected.body}</p>{selected.source_url && validSourceUrl(selected.source_url) && <a className="community-source" href={selected.source_url} target="_blank" rel="noopener noreferrer"><FileText size={17} />Open the paper or source<ArrowUpRight size={16} /></a>}{selected.draft && <button className="text-button" onClick={() => { setLocal(current => ({ ...current, editor: { id: selected.id, title: selected.title, body: selected.body, topic: selected.topic, source_url: selected.source_url || '' } })); openThread(null); setComposeOpen(true); }}>Continue editing this draft<ArrowRight size={16} /></button>}{!selected.draft && !selected.example && selected.author_id !== api.session?.user.id && <div className="message-care-actions"><button className="text-button" onClick={() => setSafetyTarget({ action: 'report', post: selected })}><Flag size={14} />Report discussion</button>{api.session && <button className="text-button" onClick={() => setSafetyTarget({ action: 'block', post: selected })}><UserX size={14} />Block member</button>}</div>}{canRemove && <div className="remove-discussion">{confirmRemove ? <><span>Remove this discussion{selected.draft ? ' draft' : ' and its replies'}?</span><button className="text-button remove-confirm" onClick={() => void removeSelected()} disabled={busy}>Yes, remove it</button><button className="text-button" onClick={() => setConfirmRemove(false)}>Keep it</button></> : <button className="text-button" onClick={() => setConfirmRemove(true)}><Trash2 size={14} />Remove my {selected.draft ? 'draft' : 'discussion'}</button>}</div>}<div className="community-replies"><h3>{preview || selected.example || selected.draft ? 'Private reply drafts' : 'Replies'}<span>{replyList.length}{replyList.length === 300 ? ' shown' : ''}</span></h3>{!preview && !selected.draft && !selected.example && replyList.length === 300 && <p className="community-empty-replies">Showing the latest 300 replies, oldest to newest.</p>}{sharedReplies.error && <p className="circle-error">{sharedReplies.error}</p>}{replyList.length === 0 && <p className="community-empty-replies">{preview || selected.draft || selected.example ? 'Try a reply. It stays private on this device.' : 'A different perspective could start here.'}</p>}{replyList.map(reply => <div className="community-reply" key={reply.id}><div className="community-author"><span>{reply.author_name?.slice(0, 1).toUpperCase() || 'R'}</span><strong>{reply.author_name || 'Circle member'}</strong><small>{reply.draft ? 'Private draft' : formatTimestamp(reply.created_at)}</small></div><p>{reply.body}</p>{!reply.draft && !selected.example && !selected.draft && reply.author_id !== api.session?.user.id && <div className="message-care-actions"><button className="text-button" onClick={() => setSafetyTarget({ action: 'report', post: selected, reply })}><Flag size={13} />Report reply</button>{api.session && <button className="text-button" onClick={() => setSafetyTarget({ action: 'block', post: selected, reply })}><UserX size={13} />Block member</button>}</div>}</div>)}<form onSubmit={sendReply}><label htmlFor="community-reply">Add your perspective<textarea id="community-reply" value={local.replyEditors[selected.id]?.body || ''} onChange={event => { const body = event.target.value; setLocal(current => ({ ...current, replyEditors: { ...current.replyEditors, [selected.id]: { id: current.replyEditors[selected.id]?.id || newMessageId(), body } } })); }} minLength={2} maxLength={3000} required rows={3} placeholder="A thoughtful reply, a question, or a useful reference…" /></label><div className="composer-footer"><p>{preview || selected.draft || selected.example ? 'Only on this device. No message will be sent.' : 'Your reply will be visible in this public thread.'}</p><button type="submit" className="button button-lime" disabled={busy || (!preview && !api.online)}>{busy ? 'Sending…' : preview || selected.example || selected.draft ? 'Save private reply draft' : 'Publish reply'}<Send size={15} /></button></div></form></div></article> : <div className="community-feed" aria-busy={!preview && api.loading}>{api.loading && !preview && <p className="community-loading" role="status">Catching up with the circle…</p>}{shownPosts.map(post => <button className="community-post-card" key={post.id} onClick={() => openThread(post)}><span className="community-post-meta"><span className="room-label">{post.topic}</span><span className={post.draft ? 'private-label' : 'example-label'}>{post.draft ? 'Private draft' : post.example ? 'Example discussion' : formatTimestamp(post.created_at)}</span></span><strong>{post.title}</strong><span className="community-excerpt">{post.body.slice(0, 185)}{post.body.length > 185 ? '…' : ''}</span><span className="community-post-bottom"><span>{post.author_name || 'Circle member'}</span><span><MessagesSquare size={14} />Open discussion<ArrowRight size={14} /></span></span></button>)}{shownPosts.length === 0 && !api.loading && <div className="community-empty"><MessagesSquare size={32} /><h2>{feed === 'drafts' ? 'A little space for your next idea.' : 'The next conversation could start with you.'}</h2><p>{search || topic !== 'All rooms' ? 'Try another room or search, or bring a new question to this one.' : feed === 'drafts' ? 'Draft a question or collaboration idea. Private drafts are saved on this device.' : 'No discussions yet. Be the first to leave a thoughtful question.'}</p></div>}{!preview && feed === 'discussions' && api.posts.length >= api.limit && api.limit < 200 && <button className="button button-light full-width" onClick={() => api.setLimit(value => Math.min(200, value + 30))}>Load more discussions</button>}</div>}
    </div><aside className="circle-sidebar"><section className="circle-time-card"><span className="eyebrow"><Clock3 size={14} />ON YOUR TIME</span><h2>The conversation can wait for you.</h2><p>Threads stay here when you step away. Return when your day has room.</p><div className="world-clocks">{[{ city: 'Bengaluru', zone: 'Asia/Kolkata' }, { city: 'London', zone: 'Europe/London' }, { city: 'San Francisco', zone: 'America/Los_Angeles' }].map(place => <div key={place.zone}><span>{place.city}</span><time>{new Intl.DateTimeFormat(undefined, { timeZone: place.zone, hour: '2-digit', minute: '2-digit' }).format(now)}</time></div>)}</div><span className="your-timezone">Timestamps shown in {localZone}.</span></section><section className="circle-guidelines"><span className="eyebrow">MAKE A LITTLE ROOM</span><h2>{research ? 'Good research is a shared practice.' : 'Different perspectives belong here.'}</h2><ul><li><Check size={15} />{research ? 'Link the paper, code, or evidence.' : 'Give your idea a little context.'}</li><li><Check size={15} />{research ? 'Share setups and limitations.' : 'Disagree with care and reasons.'}</li><li><Check size={15} />Challenge ideas. Respect people.</li></ul><img src={asset('pip-reading.webp')} width="78" height="78" alt="Pip reading a book" /></section><button className="other-circle" onClick={switchCircle}><span>{research ? <Globe size={22} /> : <Cpu size={22} />}</span><strong>{research ? 'Visit the Global Commons' : 'Explore AI Researchers'}</strong><p>{research ? 'Books, ideas, and curious people across the world.' : 'Papers, experiments, and people asking what comes next.'}</p><ArrowUpRight size={18} /></button></aside></div>}
    {pendingSeed && <CommunityDialog title="You already have a discussion draft." close={() => setPendingSeed(null)}><div className="research-form"><p>Your current title and message are saved on this device. Using the new template will replace the text in the open composer.</p><button className="button button-light full-width" onClick={() => setPendingSeed(null)}>Keep my current draft</button><button className="button button-lime full-width" onClick={() => applySeed(pendingSeed)}>Use the new template<ArrowRight size={17} /></button></div></CommunityDialog>}
  </section>;
}

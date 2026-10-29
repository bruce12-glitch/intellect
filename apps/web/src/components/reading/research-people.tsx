'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, Clock3, Globe, Leaf, Lock, Pencil, RefreshCw, User, Users } from 'lucide-react';
import { CommunityDialog } from './community-dialog';
import { validSourceUrl } from './community-data';
import { communityError, type CommunityApi } from './use-community-circle';
import { useBrowserDraft } from './use-browser-draft';
import { availabilityOptions, decodeProfile, emptyProfile, profileGoals, profileInterests, type ProfileDraft, type ResearchProfile } from './research-data';

function toDraft(profile: ResearchProfile): ProfileDraft { return decodeProfile({ ...profile, website_url: profile.website_url || '', orcid_url: profile.orcid_url || '' })!; }
const profileFields = 'user_id,display_name,headline,bio,interests,skills,looking_for,availability,time_zone,website_url,orcid_url,published,updated_at';

export function ResearchPeople({ api, search, nickname, onNeedAuth, onProjects }: { api: CommunityApi; search: string; nickname: string; onNeedAuth: () => void; onProjects: () => void }) {
  const [people, setPeople] = useState<ResearchProfile[]>([]);
  const [own, setOwn] = useState<ResearchProfile | null>(null);
  const [interest, setInterest] = useState('All interests');
  const [limit, setLimit] = useState(30);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(!!api.client);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const userId = api.session?.user.id;
  const ownProfile = own?.user_id === userId ? own : null;

  const load = useCallback(async () => {
    if (!api.client) return;
    setLoading(true); setError('');
    try {
      let query = api.client.from('community_profiles').select(profileFields).eq('published', true).order('updated_at', { ascending: false }).order('user_id').limit(limit);
      if (search.trim()) query = query.textSearch('search_document', search.trim(), { type: 'websearch', config: 'english' });
      if (interest !== 'All interests') query = query.contains('interests', [interest]);
      const result = await query;
      if (result.error) throw result.error;
      return (result.data || []) as ResearchProfile[];
    } finally { setLoading(false); }
  }, [api.client, search, interest, limit]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => void load().then(result => { if (active && result) setPeople(result); }).catch(() => { if (active) setError('Researcher profiles could not be loaded. Check the connection and apply the v0.2 database migration.'); }), search ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [load, search]);
  useEffect(() => {
    setOwn(null);
    if (!api.client || !userId) return;
    let active = true;
    void api.client.from('community_profiles').select(profileFields).eq('user_id', userId).maybeSingle().then(result => {
      if (active && !result.error) setOwn(result.data as ResearchProfile | null);
    });
    return () => { active = false; };
  }, [api.client, userId]);

  async function refreshPeople() {
    try { const result = await load(); if (result) setPeople(result); }
    catch { setError('The directory could not be refreshed. Please try again.'); }
  }
  const blocked = new Set(api.blocks.map(item => item.blocked_id));
  const visible = people.filter(profile => !blocked.has(profile.user_id));
  return <div className="research-workspace"><div className="research-section-heading"><div><span className="eyebrow"><Users size={14} />DIFFERENT MINDS. SHARED QUESTIONS.</span><h2>Find your kind of curious.</h2><p>Students, independent researchers, builders, and mentors all have a place.</p></div><button className="button button-lime" onClick={() => setEditing(true)}><User size={17} />{ownProfile ? 'Edit my research profile' : 'Create my research profile'}</button></div>
    <div className="people-introduction"><span><Globe size={30} /></span><div><h3>A little context makes a good connection.</h3><p>Share what you’re exploring, what you can contribute, and a pace that works for you. Profiles appear here only when their owners publish them.</p></div><span className="research-mini-label">OPT-IN DIRECTORY</span></div>
    {notice && <p className="circle-notice" role="status"><Check size={16} />{notice}</p>}
    {error && <p className="circle-error" role="alert">{error}<button className="text-button" onClick={() => void refreshPeople()}><RefreshCw size={14} />Retry</button></p>}
    {!api.client ? <><div className="people-preview-note"><Lock size={17} /><p>The shared directory is not activated. You can build a private profile draft now; it will not appear to other people.</p></div><div className="people-purpose-grid">{[{ icon: BookOpen, title: 'Learning is a good beginning.', text: 'Name your interests and the concepts you want to understand. Experience is welcome at every level.' }, { icon: Users, title: 'A collaborator brings context.', text: 'Describe your skills, a manageable time commitment, and the questions you’d like to work on.' }, { icon: Leaf, title: 'Make room for someone new.', text: 'Offer a steady hour, a careful explanation, or a useful next step to someone learning alongside you.' }].map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={28} /></span><h3>{title}</h3><p>{text}</p></article>)}</div></> : <>
      <div className="people-filters"><label htmlFor="people-interest">Research interest<select id="people-interest" value={interest} onChange={event => { setInterest(event.target.value); setLimit(30); }}><option>All interests</option>{profileInterests.map(item => <option key={item}>{item}</option>)}</select></label><span className="research-small-note">Search names, skills, and profile descriptions above.</span><button className="icon-button" aria-label="Refresh researcher directory" disabled={loading} onClick={() => void refreshPeople()}><RefreshCw size={17} /></button></div>
      {loading && <p className="community-loading" role="status">Loading the researcher directory…</p>}
      <div className="people-grid">{visible.map(profile => <article className="person-card" key={profile.user_id}><div className="person-heading"><span className="person-avatar">{profile.display_name.slice(0, 1).toUpperCase()}</span><div><h3>{profile.display_name}</h3><p>{profile.headline || 'A curious member of the research circle'}</p></div></div><span className="person-goal">{profile.looking_for}</span><p className="person-bio">{profile.bio}</p><div className="profile-tags">{profile.interests.map(item => <span key={item}>{item}</span>)}</div>{profile.skills && <p className="person-skills"><strong>Can contribute</strong>{profile.skills}</p>}<div className="person-meta"><span><Clock3 size={14} />{profile.availability}</span><span><Globe size={14} />{profile.time_zone.replaceAll('_', ' ')}</span></div><div className="person-links">{profile.website_url && validSourceUrl(profile.website_url) && <a href={profile.website_url} target="_blank" rel="noopener noreferrer">Website<ArrowUpRight size={14} /></a>}{profile.orcid_url && /^https:\/\/orcid\.org\//.test(profile.orcid_url) && <a href={profile.orcid_url} target="_blank" rel="noopener noreferrer">ORCID<ArrowUpRight size={14} /></a>}</div><button className="text-button" onClick={profile.user_id === userId ? () => setEditing(true) : onProjects}>{profile.user_id === userId ? 'Edit my profile' : 'Explore collaboration discussions'}<ArrowRight size={15} /></button></article>)}</div>
      {!loading && visible.length === 0 && !error && <div className="community-empty"><Users size={32} /><h2>Good company starts with an introduction.</h2><p>{search || interest !== 'All interests' ? 'Try another search or interest. Profiles appear only when members choose to publish.' : 'No published profiles yet. Create yours when you’re ready to be found.'}</p></div>}
      {people.length >= limit && limit < 200 && <button className="button button-light full-width" onClick={() => setLimit(value => Math.min(200, value + 30))}>Load more profiles</button>}
    </>}
    <p className="research-small-note">Profiles and links are self-described. An ORCID link is not an identity or expertise verification badge. Introductions happen in public discussions; private messaging is not available.</p>
    {editing && <ProfileEditor key={userId || 'device'} api={api} initial={ownProfile ? toDraft(ownProfile) : emptyProfile(nickname)} onlineProfile={ownProfile} onNeedAuth={onNeedAuth} close={() => setEditing(false)} saved={(profile, message) => { if (profile) setOwn(profile); setEditing(false); setNotice(message); void refreshPeople(); }} />}
  </div>;
}

function ProfileEditor({ api, initial, onlineProfile, close, saved, onNeedAuth }: { api: CommunityApi; initial: ProfileDraft; onlineProfile: ResearchProfile | null; close: () => void; saved: (profile: ResearchProfile | null, message: string) => void; onNeedAuth: () => void }) {
  const key = `intellect-research-profile-v02:${api.session?.user.id || 'device'}`;
  const draft = useBrowserDraft(key, initial, decodeProfile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function field<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) { draft.setValue(current => ({ ...current, [key]: value })); }
  async function publish(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!api.client || !api.session || !api.member) { setError('Shared publication needs an activated connection, sign-in, and circle membership. Your draft stays on this device.'); return; }
    const item = draft.value;
    if (item.display_name.trim().length < 2 || !validSourceUrl(item.website_url) || (item.orcid_url.trim() && !/^https:\/\/orcid\.org\/[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$/.test(item.orcid_url.trim()))) { setError('Check your name, HTTPS website link, and full ORCID URL if you include one.'); return; }
    try { new Intl.DateTimeFormat(undefined, { timeZone: item.time_zone }); }
    catch { setError('Choose a valid time zone such as Asia/Kolkata or Europe/London.'); return; }
    setBusy(true);
    const payload = { ...item, display_name: item.display_name.trim(), website_url: item.website_url.trim() || null, orcid_url: item.orcid_url.trim() || null, published: true };
    const client = api.client; const userId = api.session.user.id;
    try {
      let result = onlineProfile ? await client.from('community_profiles').update(payload).eq('user_id', userId).select(profileFields).single() : await client.from('community_profiles').insert({ ...payload, user_id: userId }).select(profileFields).single();
      if (!onlineProfile && result.error?.code === '23505') result = await client.from('community_profiles').update(payload).eq('user_id', userId).select(profileFields).single();
      if (result.error) throw result.error;
      saved(result.data as ResearchProfile, 'Your profile is published in the shared researcher directory.');
    } catch (failure) { setError(communityError(failure, 'The profile could not be published. Your private draft is kept. Check the v0.2 migration and retry.')); }
    finally { setBusy(false); }
  }
  async function unpublish() {
    if (!api.client || !api.session || !onlineProfile) return;
    setBusy(true); setError('');
    try {
      const result = await api.client.from('community_profiles').update({ published: false }).eq('user_id', api.session.user.id).select(profileFields).single();
      if (result.error) throw result.error;
      saved(result.data as ResearchProfile, 'Your profile is no longer in the public directory. Your private record is kept.');
    } catch { setError('The profile could not be unpublished. Please retry.'); }
    finally { setBusy(false); }
  }
  function importDeviceDraft() {
    try {
      const value = decodeProfile(JSON.parse(localStorage.getItem('intellect-research-profile-v02:device') || 'null'));
      if (value) { draft.setValue(value); setError(''); }
      else setError('No private device profile draft was found.');
    } catch { setError('The private device draft could not be read.'); }
  }
  return <CommunityDialog title="A little introduction goes a long way." close={close}><form className="research-form profile-editor" onSubmit={publish}><p>Your name, interests, skills, availability, time zone, and links become public only when you choose <strong>Publish my profile</strong>. Your account email is not included.</p>
    {api.session && !onlineProfile && <button type="button" className="text-button" onClick={importDeviceDraft}><Pencil size={14} />Use my private device draft</button>}
    <label htmlFor="research-name">Public display name<input id="research-name" value={draft.value.display_name} onChange={event => field('display_name', event.target.value)} minLength={2} maxLength={40} required autoComplete="nickname" /></label><label htmlFor="research-headline">One-line introduction<input id="research-headline" value={draft.value.headline} maxLength={100} onChange={event => field('headline', event.target.value)} placeholder="A student exploring memory-efficient AI" /></label><label htmlFor="research-bio">What are you curious about?<textarea id="research-bio" value={draft.value.bio} maxLength={800} rows={4} onChange={event => field('bio', event.target.value)} placeholder="A question you’re working on, a topic you’re learning, or the kind of help you can offer." /></label>
    <fieldset className="profile-interest-picker"><legend>Research interests</legend>{profileInterests.map(interest => <button type="button" key={interest} aria-pressed={draft.value.interests.includes(interest)} onClick={() => field('interests', draft.value.interests.includes(interest) ? draft.value.interests.filter(item => item !== interest) : [...draft.value.interests, interest])}>{draft.value.interests.includes(interest) && <Check size={13} />}{interest}</button>)}</fieldset>
    <label htmlFor="research-skills">Skills or experience I can share<input id="research-skills" value={draft.value.skills} maxLength={180} onChange={event => field('skills', event.target.value)} placeholder="Python, experiment design, writing, careful questions…" /></label><div className="research-form-pair"><label htmlFor="research-goal">I’m looking for<select id="research-goal" value={draft.value.looking_for} onChange={event => field('looking_for', event.target.value)}>{profileGoals.map(item => <option key={item}>{item}</option>)}</select></label><label htmlFor="research-availability">My availability<select id="research-availability" value={draft.value.availability} onChange={event => field('availability', event.target.value)}>{availabilityOptions.map(item => <option key={item}>{item}</option>)}</select></label></div><label htmlFor="research-timezone">Time zone<input id="research-timezone" value={draft.value.time_zone} list="research-timezones" maxLength={80} onChange={event => field('time_zone', event.target.value)} required /><datalist id="research-timezones">{['UTC', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Berlin', 'Africa/Nairobi', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney'].map(zone => <option key={zone} value={zone} />)}</datalist></label><label htmlFor="research-website">Website or GitHub profile <span>(optional · HTTPS)</span><input id="research-website" type="url" value={draft.value.website_url} maxLength={2000} onChange={event => field('website_url', event.target.value)} placeholder="https://github.com/…" /></label><label htmlFor="research-orcid">ORCID profile <span>(optional)</span><input id="research-orcid" type="url" value={draft.value.orcid_url} maxLength={50} onChange={event => field('orcid_url', event.target.value)} placeholder="https://orcid.org/0000-0000-0000-0000" /></label>
    {(error || draft.error) && <p className="circle-error" role="alert">{error || 'This browser could not save your profile draft. Copy your text before leaving.'}</p>}
    <p className="research-small-note"><Lock size={13} />Private drafts are autosaved in this browser and kept separately for each signed-in account.</p><div className="profile-editor-actions"><button className="button button-light" type="button" disabled={busy || !draft.ready || draft.error} onClick={() => { try { localStorage.setItem(key, JSON.stringify(draft.value)); saved(null, 'Private profile draft saved on this device. Nothing was published.'); } catch { setError('Your draft could not be saved. Copy the text before leaving.'); } }}><Lock size={15} />Save private draft</button>{api.client && api.session && api.member ? <button className="button button-lime" type="submit" disabled={busy || !draft.ready || !api.online}>{busy ? 'Saving…' : 'Publish my profile'}<ArrowUpRight size={16} /></button> : api.client ? <button type="button" className="button button-lime" onClick={() => { close(); onNeedAuth(); }}>Sign in and join to publish<ArrowRight size={16} /></button> : <span className="research-small-note">Shared profile publication needs activation.</span>}</div>
    {onlineProfile?.published && <button type="button" className="text-button" onClick={() => void unpublish()} disabled={busy}>Remove my profile from the public directory</button>}
  </form></CommunityDialog>;
}

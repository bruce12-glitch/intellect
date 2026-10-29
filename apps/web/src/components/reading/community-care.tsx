'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Flag, Lock, RefreshCw, ShieldCheck, Undo2, UserX } from 'lucide-react';
import { CommunityDialog } from './community-dialog';
import { newMessageId, type CircleSlug, type CommunityPost, type CommunityReply } from './community-data';
import { type CommunityApi } from './use-community-circle';

export interface SafetyTarget { action: 'report' | 'block'; post: CommunityPost; reply?: CommunityReply }
interface Report { id: string; post_id: string; reply_id: string | null; reason: string; details: string; status: string; created_at: string; resolution_note: string }
interface ReportContent { title?: string; body: string; author_name: string }
type CareView = 'guide' | 'reports' | 'blocks' | 'moderation' | 'report' | 'block';
const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function CommunityCare({ api, circle, target, clearTarget, onNeedAuth }: { api: CommunityApi; circle: CircleSlug; target: SafetyTarget | null; clearTarget: () => void; onNeedAuth: () => void }) {
  const [view, setView] = useState<CareView | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [content, setContent] = useState<Record<string, ReportContent>>({});
  const [queueFilter, setQueueFilter] = useState('open');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [confirm, setConfirm] = useState<{ id: string; decision: 'hide' | 'restore' | 'dismiss' } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => { if (target) { setView(target.action); setError(''); setNotice(''); } }, [target]);
  useEffect(() => { if (!api.session) { setReports([]); setContent({}); } }, [api.session?.user.id]);
  useEffect(() => {
    if (!api.client || !api.session || !['reports', 'moderation'].includes(view || '') || (view === 'moderation' && !api.moderator)) return;
    const client = api.client; const userId = api.session.user.id;
    let active = true;
    setLoading(true); setError(''); setReports([]); setContent({});
    void (async () => {
      try {
        let query = client.from('community_reports').select('id,post_id,reply_id,reason,details,status,created_at,resolution_note').eq('circle_slug', circle).order('created_at', { ascending: false }).limit(100);
        if (view === 'reports') query = query.eq('reporter_id', userId);
        else if (queueFilter === 'open') query = query.eq('status', 'open');
        else query = query.neq('status', 'open');
        const result = await query;
        if (result.error) throw result.error;
        const list = (result.data || []) as Report[];
        if (view === 'moderation' && list.length) {
          const postIds = [...new Set(list.map(report => report.post_id))];
          const replyIds = [...new Set(list.flatMap(report => report.reply_id ? [report.reply_id] : []))];
          const [posts, replies] = await Promise.all([
            client.from('community_posts').select('id,title,body,author_name').in('id', postIds),
            replyIds.length ? client.from('community_replies').select('id,body,author_name').in('id', replyIds) : Promise.resolve({ data: [], error: null }),
          ]);
          if (posts.error || replies.error) throw posts.error || replies.error;
          if (active) setContent(Object.fromEntries([...(posts.data || []), ...(replies.data || [])].map(item => [item.id, item])));
        }
        if (active) setReports(list);
      } catch { if (active) setError('Reports could not be loaded. Check your connection, moderator assignment, and the v0.2 migration.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [api.client, api.session?.user.id, api.moderator, circle, view, queueFilter, revision]);

  function close() { setView(null); clearTarget(); setConfirm(null); setError(''); setNotice(''); }
  function selectView(next: CareView) { setView(next); clearTarget(); setConfirm(null); setError(''); setNotice(''); }
  async function review(id: string, decision: 'hide' | 'restore' | 'dismiss') {
    if (!api.client || !api.moderator) return;
    setBusy(id); setError('');
    try {
      const result = await api.client.rpc('review_community_report', { p_report_id: id, p_decision: decision, p_note: notes[id] || '' });
      if (result.error) throw result.error;
      setConfirm(null); setNotice(decision === 'hide' ? 'The reported message is hidden from public discussion.' : decision === 'restore' ? 'The message has been restored to public discussion.' : 'The report was dismissed. Content is unchanged.');
      setRevision(value => value + 1); await api.refresh();
    } catch { setError('The review could not be completed. Refresh the queue; your role or this report may have changed.'); }
    finally { setBusy(''); }
  }
  const author = target?.reply || target?.post;
  return <>
    <button className="community-care-button" onClick={() => selectView('guide')}><ShieldCheck size={16} />Community care{api.moderator && <span>MODERATOR</span>}</button>
    {view && <CommunityDialog title={view === 'report' ? 'Help us look after this circle.' : view === 'block' ? 'Make a little space for yourself.' : 'A thoughtful circle takes care.'} close={close} wide={view === 'moderation'}>
      {!['report', 'block'].includes(view) && <div className="care-navigation" role="group" aria-label="Community care tools"><button aria-pressed={view === 'guide'} onClick={() => selectView('guide')}>Our guidelines</button>{api.session && <><button aria-pressed={view === 'reports'} onClick={() => selectView('reports')}>My reports</button><button aria-pressed={view === 'blocks'} onClick={() => selectView('blocks')}>Blocked members</button></>}{api.moderator && <button aria-pressed={view === 'moderation'} onClick={() => selectView('moderation')}>Moderation queue</button>}</div>}
      {notice && <p className="circle-notice" role="status"><Check size={16} />{notice}</p>}
      {(error || api.safetyError) && <p className="circle-error" role="alert">{error || api.safetyError}</p>}
      {view === 'guide' && <div className="care-guidelines"><p>Bring your curiosity. Leave room for someone else’s experience.</p>{[{ title: 'Challenge ideas. Respect people.', text: 'Explain your reasoning. Criticism of a result should help a person understand or improve it.' }, { title: 'Make your sources visible.', text: 'Link papers and code, name assumptions, and distinguish evidence from a hypothesis or an AI-generated explanation.' }, { title: 'Protect personal boundaries.', text: 'Share only information you have permission to share. Ask before moving a conversation outside the circle.' }, { title: 'Help the next reader.', text: 'Give questions context, include a useful baseline, and welcome people who are learning the prerequisites.' }].map(item => <div key={item.title}><ShieldCheck size={20} /><span><strong>{item.title}</strong><p>{item.text}</p></span></div>)}<div className="research-expectation"><Lock size={18} /><p>{!api.client ? 'Shared reporting and blocking need activation. No reports are sent from this preview.' : !api.session ? 'Sign in and join a circle to report a message. Reports are visible to you and assigned circle moderators.' : 'Use Report on a shared message to ask for review. Blocked members’ messages are hidden in your signed-in view; public posts remain accessible to other readers.'}</p></div>{api.client && !api.session && <button className="button button-lime" onClick={() => { close(); onNeedAuth(); }}>Sign in to take part<ArrowRight size={17} /></button>}</div>}
      {view === 'reports' && api.session && <div className="care-reports"><p>Your reports are private to you and assigned moderators. This list shows the most recent 100 in this circle.</p><button className="text-button" onClick={() => setRevision(value => value + 1)} disabled={loading}><RefreshCw size={15} />Refresh my reports</button>{loading && <p role="status">Loading reports…</p>}{reports.map(report => <article key={report.id}><span className={`report-status status-${report.status}`}>{report.status === 'reviewed' ? 'Content hidden' : report.status}</span><h3>{report.reply_id ? 'Reply report' : 'Discussion report'} · {report.reason}</h3><time dateTime={report.created_at}>{date(report.created_at)}</time>{report.details && <p>{report.details}</p>}{report.resolution_note && <p><strong>Moderator note:</strong> {report.resolution_note}</p>}</article>)}{!loading && reports.length === 0 && !error && <p className="care-empty">No reports submitted in this circle.</p>}</div>}
      {view === 'blocks' && api.session && <div className="care-blocks"><p>Blocking hides messages and profiles in your signed-in view. It does not make public content private or stop another person reading the circle.</p>{api.blocks.map(block => <div key={block.blocked_id}><span><UserX size={17} />{block.blocked_label}</span><button className="text-button" disabled={!!busy} onClick={async () => { setBusy(block.blocked_id); setError(''); try { await api.unblockAuthor(block.blocked_id); setNotice('Member unblocked in your view.'); } catch { setError('The block could not be removed. Please retry.'); } finally { setBusy(''); } }}><Undo2 size={15} />Unblock</button></div>)}{api.blocks.length === 0 && <p className="care-empty">Your block list is empty.</p>}</div>}
      {view === 'moderation' && (api.moderator ? <div className="moderation-queue"><p>Review with context. Hiding a discussion also hides its replies from public readers. Reports and review notes are private to the reporter and assigned moderators.</p><div className="moderation-toolbar"><label htmlFor="moderation-filter">Queue<select id="moderation-filter" value={queueFilter} onChange={event => setQueueFilter(event.target.value)}><option value="open">Open reports</option><option value="closed">Reviewed and closed</option></select></label><button className="button button-light" onClick={() => setRevision(value => value + 1)} disabled={loading}><RefreshCw size={15} />Refresh queue</button></div>{loading && <p role="status">Loading the moderation queue…</p>}{reports.map(report => { const message = content[report.reply_id || report.post_id]; return <article className="moderation-report" key={report.id}><div className="community-post-meta"><span className="report-status">{report.status}</span><span>{report.reason} · {date(report.created_at)}</span></div><h3>{message?.title || (report.reply_id ? 'Reported reply' : 'Reported discussion')}</h3><p className="report-detail">{report.details || 'No additional details were provided.'}</p><details><summary>Read the reported content</summary><strong>{message?.author_name || 'Content unavailable'}</strong><p>{message?.body || 'The author may have removed this message.'}</p></details>{report.status === 'open' && <label htmlFor={`review-note-${report.id}`}>Review note <span>(optional · visible to the reporter)</span><textarea id={`review-note-${report.id}`} value={notes[report.id] || ''} maxLength={500} rows={2} onChange={event => setNotes(current => ({ ...current, [report.id]: event.target.value }))} /></label>}{report.resolution_note && <p>Review note: {report.resolution_note}</p>}<div className="moderation-actions">{confirm?.id === report.id ? <><p>{confirm.decision === 'hide' ? 'Hide this message from public discussion?' : confirm.decision === 'restore' ? 'Restore this message to public discussion?' : 'Dismiss this report without changing the content?'}</p><button className="button button-lime" disabled={!!busy} onClick={() => void review(report.id, confirm.decision)}>{busy === report.id ? 'Saving…' : `Confirm ${confirm.decision}`}</button><button className="text-button" disabled={!!busy} onClick={() => setConfirm(null)}>Keep reviewing</button></> : report.status === 'open' ? <><button className="button button-light" onClick={() => setConfirm({ id: report.id, decision: 'dismiss' })} disabled={!!busy}>Dismiss report</button><button className="button button-lime" onClick={() => setConfirm({ id: report.id, decision: 'hide' })} disabled={!!busy}>Hide reported message</button></> : report.status === 'reviewed' ? <button className="button button-light" onClick={() => setConfirm({ id: report.id, decision: 'restore' })} disabled={!!busy}><Undo2 size={15} />Restore content</button> : <span className="research-small-note">Review complete.</span>}</div></article>; })}{!loading && reports.length === 0 && !error && <p className="care-empty">No reports in this queue.</p>}<p className="research-small-note">Showing up to 100 reports per queue. Moderator roles are assigned by the project administrator.</p></div> : <p className="circle-error">An assigned moderator account is required.</p>)}
      {view === 'block' && target && author && <div className="care-block-confirm"><p>Hide messages and profiles from <strong>{author.author_name}</strong> in your signed-in view? You can undo this under Community care → Blocked members.</p><p className="research-small-note">Public posts remain readable by other people. Moderator review queues are unaffected.</p>{api.session && api.client && !target.post.example && !target.post.draft ? <button className="button button-lime full-width" disabled={!!busy} onClick={async () => { setBusy(author.author_id); setError(''); try { await api.blockAuthor(author.author_id, author.author_name); clearTarget(); setView('blocks'); setNotice('Member blocked in your signed-in view.'); } catch { setError('The block could not be saved. Please retry.'); } finally { setBusy(''); } }}><UserX size={17} />{busy ? 'Saving…' : 'Block this member'}</button> : <p className="circle-error">Sign in to manage blocks on shared messages.</p>}</div>}
      {view === 'report' && target && <ReportForm api={api} circle={circle} target={target} onNeedAuth={() => { close(); onNeedAuth(); }} sent={() => { clearTarget(); setView('reports'); setNotice('Report submitted for review by assigned circle moderators.'); setRevision(value => value + 1); }} />}
    </CommunityDialog>}
  </>;
}

function ReportForm({ api, circle, target, sent, onNeedAuth }: { api: CommunityApi; circle: CircleSlug; target: SafetyTarget; sent: () => void; onNeedAuth: () => void }) {
  const [id] = useState(newMessageId);
  const [reason, setReason] = useState('Spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!api.client || !api.session || !api.member || target.post.example || target.post.draft) return;
    setBusy(true); setError('');
    try {
      const result = await api.client.from('community_reports').insert({ id, circle_slug: circle, post_id: target.post.id, reply_id: target.reply?.id || null, reporter_id: api.session.user.id, reason, details: details.trim() }).select('id').single();
      if (result.error?.code === '23505') {
        const existing = await api.client.from('community_reports').select('id').eq('id', id).eq('reporter_id', api.session.user.id).maybeSingle();
        if (existing.data) { sent(); return; }
        setError('You have already reported this message. Check My reports for its status.'); return;
      }
      if (result.error) throw result.error;
      sent();
    } catch (failure) { const value = failure as { code?: string; message?: string }; setError(value.code === 'P0001' ? value.message || 'Please try again later.' : 'The report could not be submitted. Your text is kept here for a retry.'); }
    finally { setBusy(false); }
  }
  if (!api.client || target.post.example || target.post.draft) return <p className="research-small-note">Reporting is available on shared messages after activation. No report will be sent for a private draft or example.</p>;
  if (!api.session || !api.member) return <div className="care-guidelines"><p>Sign in and join this circle to submit a report.</p><button className="button button-lime" onClick={onNeedAuth}>Sign in and join<ArrowRight size={16} /></button></div>;
  return <form className="research-form" onSubmit={submit}><p>Reporting {target.reply ? 'a reply in' : 'the discussion'} <strong>{target.post.title}</strong>. Your report and details are visible only to you and assigned circle moderators.</p><label htmlFor="report-reason">Reason<select id="report-reason" value={reason} onChange={event => setReason(event.target.value)}>{['Spam', 'Harassment', 'Privacy', 'Other'].map(item => <option key={item}>{item}</option>)}</select></label><label htmlFor="report-details">What should the moderator know? <span>(optional)</span><textarea id="report-details" value={details} maxLength={1200} rows={4} onChange={event => setDetails(event.target.value)} placeholder="Give enough context for review. Avoid repeating private information." /></label>{error && <p className="circle-error" role="alert">{error}</p>}<button className="button button-lime full-width" type="submit" disabled={busy || !api.online}><Flag size={16} />{busy ? 'Submitting…' : 'Submit private report'}</button></form>;
}

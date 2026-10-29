'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, Copy, Download, FileText, FlaskConical, Layers, Lock, NotebookPen, Plus } from 'lucide-react';
import { CommunityDialog } from './community-dialog';
import { useBrowserDraft } from './use-browser-draft';
import { exampleProjects, readingSteps, researchPapers, type DiscussionSeed } from './research-data';
import { validSourceUrl, type CommunityPost } from './community-data';
import type { CommunityApi } from './use-community-circle';

interface PaperNotes { note: string; steps: boolean[] }
type Notebook = Record<string, PaperNotes>;
const emptyNotebook: Notebook = {};
function decodeNotebook(value: unknown): Notebook | null {
  if (!value || typeof value !== 'object') return null;
  const notebook: Notebook = {};
  for (const paper of researchPapers) {
    const item = (value as Notebook)[paper.id];
    if (item && typeof item.note === 'string' && Array.isArray(item.steps) && item.steps.every(step => typeof step === 'boolean')) notebook[paper.id] = { note: item.note.slice(0, 10000), steps: [!!item.steps[0], !!item.steps[1], !!item.steps[2]] };
  }
  return notebook;
}

export function ResearchDesk({ search, onDraft }: { search: string; onDraft: (seed: DiscussionSeed) => void }) {
  const [selectedId, setSelectedId] = useState(researchPapers[0].id);
  const [exportText, setExportText] = useState('');
  const notebook = useBrowserDraft('intellect-research-notebook-v02', emptyNotebook, decodeNotebook);
  const selected = researchPapers.find(paper => paper.id === selectedId)!;
  const notes = notebook.value[selectedId] || { note: '', steps: [false, false, false] };
  const completed = notes.steps.filter(Boolean).length;
  const filtered = researchPapers.filter(paper => `${paper.title} ${paper.topic} ${paper.idea}`.toLowerCase().includes(search.toLowerCase().trim()));

  function updateNotes(next: PaperNotes) { notebook.setValue(current => ({ ...current, [selectedId]: next })); }
  function exportNotes() {
    const text = `# ${selected.title}\n\n${selected.authors} · ${selected.year}\nSource: ${selected.url}\n\n## Reading steps\n${readingSteps.map((step, i) => `- [${notes.steps[i] ? 'x' : ' '}] ${step.title}`).join('\n')}\n\n## My notes\n${notes.note || '(No notes yet)'}\n\nPrivate notebook exported from Intellect v0.2. Progress is self-reported.\n`;
    setExportText(text);
  }

  return <div className="research-workspace">
    <section className="research-welcome"><div><span className="eyebrow"><FlaskConical size={14} />THE ASYNCHRONOUS PAPER CLUB</span><h2>A good paper.<br />An even better question.</h2><p>Read at your pace. Untangle a mechanism. Bring one useful question back to the circle.</p><span className="research-small-note"><Lock size={13} />Your notebook is private to this browser.</span></div><div className="paper-stack" aria-hidden="true"><span><FileText size={28} /><i /><i /><i /></span><span><Layers size={25} /><i /><i /><i /></span><span><FlaskConical size={28} /><i /><i /><i /></span><b>Curiosity is a practice.</b></div></section>
    <div className="research-section-heading"><div><span className="eyebrow">THREE PLACES TO BEGIN</span><h2>Look a little closer.</h2><p>Original papers, guided questions, and room for your own interpretation.</p></div><span className="research-mini-label">CURATED READING · NO LIVE EVENT</span></div>
    <div className="paper-grid">{filtered.map((paper, index) => {
      const count = (notebook.value[paper.id]?.steps || []).filter(Boolean).length;
      return <button key={paper.id} className={`paper-card paper-${paper.color} ${selectedId === paper.id ? 'selected' : ''}`} aria-pressed={selectedId === paper.id} onClick={() => setSelectedId(paper.id)}><span className="paper-card-top"><FileText size={22} /><span>0{researchPapers.indexOf(paper) + 1} / READING DESK</span>{selectedId === paper.id && <Check size={17} />}</span><span className="paper-topic">{paper.topic}</span><strong>{paper.shortTitle}</strong><span className="paper-idea">{paper.idea}</span><span className="paper-card-bottom"><span>{paper.authors}<small>{paper.year}</small></span><span className="paper-progress-label">{count}/3 steps<ArrowRight size={16} /></span></span></button>;
    })}</div>
    {filtered.length === 0 && <div className="community-empty"><BookOpen size={30} /><h2>No papers match this search.</h2><p>Try attention, memory, or systems. Your open notebook is still below.</p></div>}
    <section className="paper-notebook" aria-labelledby="notebook-title"><div className="notebook-header"><div><span className="eyebrow"><NotebookPen size={14} />YOUR READING DESK</span><h2 id="notebook-title">{selected.shortTitle}, one idea at a time.</h2><p>{selected.title}</p></div><a className="button button-light" href={selected.url} target="_blank" rel="noopener noreferrer">Read the original paper<ArrowUpRight size={17} /></a></div><div className="paper-prerequisites"><BookOpen size={18} /><span><strong>A little background helps.</strong>{selected.prerequisites}</span></div>
      <div className="notebook-layout"><div className="reading-path"><div className="reading-path-heading"><h3>Your three-step read</h3><span>{completed}/3</span></div><div className="progress-track" role="progressbar" aria-label={`${selected.shortTitle} reading steps`} aria-valuenow={completed} aria-valuemin={0} aria-valuemax={3}><span style={{ width: `${completed / 3 * 100}%` }} /></div>{readingSteps.map((step, index) => <label className={`reading-step ${notes.steps[index] ? 'complete' : ''}`} key={step.title}><input type="checkbox" checked={notes.steps[index]} disabled={!notebook.ready} onChange={event => updateNotes({ ...notes, steps: notes.steps.map((done, position) => position === index ? event.target.checked : done) })} /><span className="reading-step-number" aria-hidden="true">{notes.steps[index] ? <Check size={15} /> : index + 1}</span><span><strong>{step.title}</strong><small>{step.detail}</small></span></label>)}<p className="research-small-note">Self-reported progress. Take as long as you need.</p></div><div className="research-notes"><label htmlFor="research-notes">A thought worth keeping<textarea id="research-notes" value={notes.note} onChange={event => updateNotes({ ...notes, note: event.target.value })} disabled={!notebook.ready} maxLength={10000} rows={7} placeholder="Explain one mechanism in your own words. What makes sense? What are you still unsure about?" /></label><p className={notebook.error ? 'circle-error' : 'research-small-note'} role={notebook.error ? 'alert' : undefined}>{notebook.error ? 'Your notebook could not be saved in this browser. Export or copy your notes before leaving.' : 'Autosaved on this device. Notes do not sync or publish automatically.'}</p><div className="notebook-actions"><button className="button button-light" onClick={exportNotes} disabled={!notebook.ready}><Download size={16} />Export my notes</button><button className="button button-lime" disabled={!notebook.ready} onClick={() => onDraft({ title: `Paper club: a question about ${selected.shortTitle}`, body: `My question\n${(notes.note.trim().slice(0, 4500) + (notes.note.trim().length > 4500 ? '\n[Excerpt from my private notes.]' : '')) || selected.questions[0]}\n\nContext\nI’m reading ${selected.title}.\n\nWhat would help\nA clear explanation, a useful baseline, or a small example I can trace.`, topic: 'Paper club', source_url: selected.url })}>Review a discussion draft<ArrowRight size={17} /></button></div></div></div>
      <div className="paper-questions"><span className="eyebrow">TAKE A QUESTION WITH YOU</span>{selected.questions.map((question, index) => <p key={question}><span>0{index + 1}</span>{question}</p>)}</div>
    </section>
    {exportText && <NotebookExport text={exportText} filename={`intellect-${selected.id}-notes.md`} close={() => setExportText('')} />}
  </div>;
}

function NotebookExport({ text, filename, close }: { text: string; filename: string; close: () => void }) {
  const [url, setUrl] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [text]);
  return <CommunityDialog title="Your notes, ready to take with you." close={close}><div className="research-form"><p>Review your private Markdown export. You can download it or select and copy the text below.</p><label htmlFor="notebook-export">Exported Markdown notes<textarea id="notebook-export" readOnly value={text} rows={12} /></label><div className="notebook-actions"><button className="button button-light" onClick={async () => { try { await navigator.clipboard.writeText(text); setNotice('Markdown copied to your clipboard.'); } catch { setNotice('Select the text above and copy it using your keyboard or browser menu.'); } }}><Copy size={15} />Copy Markdown</button>{url && <a className="button button-lime notebook-download" href={url} download={filename}><Download size={15} />Download Markdown</a>}</div>{notice && <p className="circle-notice" role="status">{notice}</p>}<p className="research-small-note">This export stays with you. Nothing is uploaded or published.</p></div></CommunityDialog>;
}

interface ProjectBrief { title: string; question: string; scope: string; help: string; outcome: string; availability: string; source: string }
const emptyBrief: ProjectBrief = { title: '', question: '', scope: '', help: '', outcome: '', availability: '', source: '' };
const decodeBrief = (value: unknown): ProjectBrief | null => value && typeof value === 'object' && Object.keys(emptyBrief).every(key => typeof (value as Record<string, unknown>)[key] === 'string') ? value as ProjectBrief : null;

export function ResearchProjects({ api, search, onDraft, onOpen }: { api: CommunityApi; search: string; onDraft: (seed: DiscussionSeed) => void; onOpen: (post: CommunityPost) => void }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState('');
  const draft = useBrowserDraft('intellect-project-brief-v02', emptyBrief, decodeBrief);
  const blocked = new Set(api.blocks.map(item => item.blocked_id));
  const projects = (api.client ? api.posts.filter(post => post.topic === 'Collaboration' && !blocked.has(post.author_id)) : exampleProjects.filter(post => `${post.title} ${post.body}`.toLowerCase().includes(search.toLowerCase().trim())));
  function field(key: keyof ProjectBrief, value: string) { draft.setValue(current => ({ ...current, [key]: value })); }
  return <div className="research-workspace"><div className="research-section-heading"><div><span className="eyebrow"><Layers size={14} />FROM CURIOUS TO COLLABORATING</span><h2>Start small. Build something useful.</h2><p>A clear question, an honest scope, and one useful first artifact.</p></div><button className="button button-lime" onClick={() => setEditorOpen(true)}><Plus size={17} />Create a project brief</button></div>
    <div className="project-principles"><span><span>01</span>A bounded question</span><span><span>02</span>Room for a collaborator</span><span><span>03</span>A reproducible artifact</span></div>
    {!api.client && <p className="research-small-note">Example briefs show the format. There are no active project owners behind these examples.</p>}
    <div className="project-grid">{projects.map(project => <article className="project-card" key={project.id}><div className="community-post-meta"><span className="room-label">COLLABORATION</span><span>{project.example ? 'Example project brief' : 'Shared discussion'}</span></div><h3>{project.title}</h3><p>{project.body.slice(0, 230)}{project.body.length > 230 ? '…' : ''}</p><div className="project-card-footer"><span>{project.author_name}</span><button className="text-button" onClick={() => onOpen(project)}>{project.example ? 'Explore this example' : 'Discuss this project'}<ArrowRight size={16} /></button></div></article>)}</div>
    {api.client && api.loading && <p role="status" className="community-loading">Loading collaboration discussions…</p>}
    {projects.length === 0 && !api.loading && <div className="community-empty"><FlaskConical size={30} /><h2>A useful first project could start here.</h2><p>Try another search or write a brief explaining the question and help you need.</p></div>}
    {api.client && api.posts.length >= api.limit && api.limit < 200 && <button className="button button-light full-width" onClick={() => api.setLimit(value => Math.min(200, value + 30))}>Load more collaboration discussions</button>}
    <div className="research-expectation"><Lock size={19} /><p>Project briefs become public Collaboration discussions only after you review and publish them. Introductions happen in the thread; private messaging is not available.</p></div>
    {editorOpen && <CommunityDialog title="A small project. A real starting point." close={() => setEditorOpen(false)}><form className="research-form" onSubmit={event => { event.preventDefault(); setError(''); if (!validSourceUrl(draft.value.source)) { setError('Use an HTTPS source link, or leave the link empty.'); return; } const item = draft.value; if ([item.title, item.question, item.scope, item.help, item.outcome].some(value => value.trim().length < 3)) { setError('Give each part of the brief a little more detail.'); return; } onDraft({ title: item.title.trim(), body: `Research question\n${item.question.trim()}\n\nScope\n${item.scope.trim()}\n\nHelp wanted\n${item.help.trim()}\n\nFirst artifact\n${item.outcome.trim()}\n\nAvailability\n${item.availability.trim() || 'Let’s agree on a manageable pace.'}\n\nInterested? Reply with what you can contribute and your availability.`, topic: 'Collaboration', source_url: item.source.trim() }); setEditorOpen(false); }}>
      <p>Give a future collaborator enough context to decide whether they can help.</p><label htmlFor="project-title">Project title<input id="project-title" value={draft.value.title} maxLength={150} minLength={3} required onChange={event => field('title', event.target.value)} placeholder="One question you could work on together" /></label><label htmlFor="project-question">Research question<textarea id="project-question" value={draft.value.question} required minLength={3} maxLength={1000} rows={3} onChange={event => field('question', event.target.value)} /></label><label htmlFor="project-scope">Scope and limits<textarea id="project-scope" value={draft.value.scope} required minLength={3} maxLength={1000} rows={3} onChange={event => field('scope', event.target.value)} placeholder="One baseline, one dataset, available compute…" /></label><label htmlFor="project-help">Help wanted<input id="project-help" value={draft.value.help} required minLength={3} maxLength={600} onChange={event => field('help', event.target.value)} placeholder="Skills, feedback, or an independent reproduction" /></label><label htmlFor="project-outcome">First useful artifact<input id="project-outcome" value={draft.value.outcome} required minLength={3} maxLength={500} onChange={event => field('outcome', event.target.value)} placeholder="A notebook, evaluation protocol, or small open-source change" /></label><label htmlFor="project-time">Availability <span>(optional)</span><input id="project-time" value={draft.value.availability} maxLength={80} onChange={event => field('availability', event.target.value)} placeholder="A few hours a week, asynchronously" /></label><label htmlFor="project-source">Paper or code link <span>(optional · HTTPS)</span><input id="project-source" type="url" value={draft.value.source} maxLength={2000} onChange={event => field('source', event.target.value)} /></label>{(error || draft.error) && <p className="circle-error" role="alert">{error || 'This browser could not save the brief. Copy your text before leaving.'}</p>}<p className="research-small-note">The form stays on this device. The next step lets you review a discussion draft before publishing.</p><button className="button button-lime full-width" type="submit" disabled={!draft.ready}>Review discussion draft<ArrowRight size={17} /></button>
    </form></CommunityDialog>}
  </div>;
}

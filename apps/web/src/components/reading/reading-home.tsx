'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowRight, ArrowUpRight, Bell, BookOpen, Brain,
  Check, ChevronDown, ChevronRight, HelpCircle, Compass, Cpu,
  Feather, Flame, Headphones, Heart, Leaf, LibraryBig, Lightbulb, MessagesSquare,
  Palette, PenLine, Plus, Repeat2, Search, Send, ShoppingBag, Sparkles, Layers, Users,
  Trophy, X,
} from 'lucide-react';
import { books, categories, discussions, type Book, type Category, type Discussion } from './data';
import { MissionPanel } from './mission-panel';
import type { ResearchSpace } from './research-data';

const CommunityCircle = dynamic(() => import('./community-circle').then(module => module.CommunityCircle), { ssr: false, loading: () => <p className="community-loading" role="status">Opening the circle…</p> });

const asset = (name: string) => `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/images/${name}`;
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
const categoryIcons = [Sparkles, Lightbulb, Cpu, Brain, Feather, Palette];
type View = 'Discover' | 'Bookshop' | 'Reading circles' | 'AI Researchers' | 'My bookshelf';
type Panel = { kind: 'book'; book: Book } | { kind: 'thread'; discussion: Discussion } | { kind: 'goal' | 'how' | 'sell' | 'salon' | 'notifications' | 'profile' | 'mission' };
interface Listing { id: string; title: string; author: string; price: number; condition: string; notes: string }
interface Preferences { saved: string[]; goal: number; reading: Record<string, number>; reflections: Record<string, string[]>; listings: Listing[]; name: string }
const initial: Preferences = { saved: [], goal: 10, reading: {}, reflections: {}, listings: [], name: 'Reader' };

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getStreak(reading: Record<string, number>) {
  const date = new Date();
  if (!reading[dateKey(date)]) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (reading[dateKey(date)]) { streak++; date.setDate(date.getDate() - 1); }
  return streak;
}

function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-symbol"><BookOpen strokeWidth={2.5} /><Leaf className="brand-leaf" strokeWidth={3} /></span><span>intellect<span className="brand-dot">.</span></span></span>;
}

function FacePile() {
  return <span className="face-pile" aria-hidden="true"><span className="face peach">a</span><span className="face lavender">m</span><span className="face mint">j</span></span>;
}

function Modal({ children, title, close, wide = false }: { children: ReactNode; title: string; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`reading-dialog ${wide ? 'dialog-wide' : ''}`} aria-labelledby="dialog-title" onCancel={close} onClick={event => { if (event.target === ref.current) close(); }}>
    <div className="dialog-heading"><span className="eyebrow">A LITTLE MORE INTELLECT</span><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={21} /></button></div>
    <h2 id="dialog-title">{title}</h2>
    {children}
  </dialog>;
}

export function ReadingHome() {
  const [view, setView] = useState<View>('Discover');
  const [communityNavigation, setCommunityNavigation] = useState(0);
  const [category, setCategory] = useState<Category>('All books');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('curated');
  const [preferences, setPreferences] = useState<Preferences>(initial);
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [toast, setToast] = useState('');
  const [storageIssue, setStorageIssue] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const explore = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const circle = new URLSearchParams(window.location.search).get('circle');
    if (circle === 'ai-researchers') setView('AI Researchers');
    else if (circle === 'global-commons') setView('Reading circles');
    try {
      const stored = JSON.parse(localStorage.getItem('intellect-reading-v1') || 'null');
      if (stored && typeof stored === 'object') {
        const reflections: Record<string, string[]> = {};
        const reading: Record<string, number> = {};
        if (stored.reflections && typeof stored.reflections === 'object') {
          for (const [id, value] of Object.entries(stored.reflections)) {
            if (Array.isArray(value) && value.every(item => typeof item === 'string')) reflections[id] = value;
          }
        }
        if (stored.reading && typeof stored.reading === 'object') {
          for (const [day, value] of Object.entries(stored.reading)) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof value === 'number' && Number.isFinite(value) && value >= 0) reading[day] = value;
          }
        }
        setPreferences({
          saved: Array.isArray(stored.saved) ? stored.saved.filter((id: unknown) => typeof id === 'string' && books.some(book => book.id === id)) : [],
          goal: [10, 20, 30].includes(stored.goal) ? stored.goal : 10,
          reading,
          reflections,
          listings: Array.isArray(stored.listings) ? stored.listings.filter((item: Listing) => item && typeof item.title === 'string' && typeof item.author === 'string' && Number.isFinite(item.price)) : [],
          name: typeof stored.name === 'string' ? stored.name.slice(0, 30) : 'Reader',
        });
      }
    } catch { setStorageIssue(true); }
    setReady(true);
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem('intellect-reading-v1', JSON.stringify(preferences)); }
    catch { setStorageIssue(true); }
  }, [preferences, ready]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !panel) {
        event.preventDefault(); search.current?.focus();
      }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [panel]);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3800);
  }

  function navigate(next: View, space: ResearchSpace = 'discussions') {
    setView(next); setCommunityNavigation(value => value + 1); setCategory('All books'); setQuery(''); setSort('curated');
    const url = new URL(window.location.href);
    if (next === 'AI Researchers' || next === 'Reading circles') url.searchParams.set('circle', next === 'AI Researchers' ? 'ai-researchers' : 'global-commons');
    else url.searchParams.delete('circle');
    url.searchParams.delete('thread');
    if (next === 'AI Researchers' && space !== 'discussions') url.searchParams.set('space', space); else url.searchParams.delete('space');
    window.history.replaceState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function toggleSaved(book: Book) {
    const saved = preferences.saved.includes(book.id);
    setPreferences(current => ({ ...current, saved: saved ? current.saved.filter(id => id !== book.id) : [...current.saved, book.id] }));
    notify(saved ? `${book.title} removed from your shelf.` : `${book.title} is on your shelf. A good choice!`);
  }

  const filtered = useMemo(() => {
    const result = books.filter(book => (view !== 'My bookshelf' || preferences.saved.includes(book.id)) && (category === 'All books' || book.category === category) && `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(query.toLowerCase().trim()));
    if (sort === 'price-asc') return result.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return result.sort((a, b) => b.price - a.price);
    if (sort === 'readers') return result.sort((a, b) => b.readers - a.readers);
    return result;
  }, [view, category, query, sort, preferences.saved]);
  const isCommunityView = view === 'Reading circles' || view === 'AI Researchers';
  const visibleBooks = view === 'Discover' && !query && category === 'All books' ? filtered.slice(0, 3) : filtered;
  const DiscoveryTitle = view === 'Discover' && !query ? 'h2' : 'h1';
  const today = dateKey();
  const todayMinutes = Number(preferences.reading[today]) || 0;
  const goalDone = todayMinutes >= preferences.goal;
  const streak = getStreak(preferences.reading);
  const navItems = [{ label: 'Discover' as View, icon: Compass }, { label: 'Bookshop' as View, icon: ShoppingBag }, { label: 'Reading circles' as View, icon: MessagesSquare }, { label: 'AI Researchers' as View, icon: Cpu }, { label: 'My bookshelf' as View, icon: LibraryBig }];

  function bookCard(book: Book) {
    const saved = preferences.saved.includes(book.id);
    return <article className="book-card" key={book.id}>
      <div className={`book-stage ${book.color}`}>
        <span className="book-tag">{book.id === 'creative-act' ? <Sparkles size={12} /> : <PenLine size={12} />}{book.tag}</span>
        <button className={`save-book ${saved ? 'is-saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${book.title}`} aria-pressed={saved} onClick={() => toggleSaved(book)}><Heart size={19} fill={saved ? 'currentColor' : 'none'} /></button>
        <button className="cover-button" onClick={() => setPanel({ kind: 'book', book })} aria-label={`Explore ${book.title}`}><img src={asset(book.cover)} alt={`${book.title} book cover`} width="142" height="210" loading="lazy" /><span className="cover-shadow" /></button>
        <span className="book-number" aria-hidden="true">0{books.findIndex(item => item.id === book.id) + 1}</span><span className="stage-doodle" aria-hidden="true">{book.id === 'creative-act' ? '✳' : book.id === 'atomic-habits' ? '✺' : '✴'}</span>
      </div>
      <div className="book-info"><button className="book-title" onClick={() => setPanel({ kind: 'book', book })}>{book.title}<ArrowUpRight size={17} /></button><p className="book-author">{book.author}</p>
        <div className="book-meta"><span><strong>{money(book.price)}</strong><span className="condition">pre-loved</span></span><button className="reader-count" onClick={() => setPanel({ kind: 'book', book })} aria-label={`Explore the reading circle for ${book.title}`}><MessagesSquare size={14} />{book.readers} discussing</button></div>
      </div>
    </article>;
  }

  function discussionCard(discussion: Discussion) {
    return <button className="discussion-row" key={discussion.id} onClick={() => setPanel({ kind: 'thread', discussion })}>
      <span className={`reader-avatar ${discussion.color}`}>{discussion.initials}</span><span className="discussion-copy"><span className="discussion-tag">{discussion.category}<span>·</span>{discussion.tag}</span><strong>{discussion.title}</strong><span className="discussion-book"><BookOpen size={13} />{discussion.book}<span>·</span>{discussion.replies + (preferences.reflections[discussion.id]?.length || 0)} thoughts</span></span><ArrowUpRight className="discussion-arrow" size={20} />
    </button>;
  }

  return <div className="reading-app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar" aria-label="Main navigation">
      <button className="brand-button" onClick={() => navigate('Discover')} aria-label="Intellect home"><Brand /></button>
      <p className="sidebar-caption">A NEW CHAPTER EVERY DAY</p>
      <nav className="side-navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${view === label ? 'active' : ''}`} aria-current={view === label ? 'page' : undefined} onClick={() => navigate(label)}><Icon size={21} strokeWidth={1.9} /><span>{label}</span>{label === 'My bookshelf' && preferences.saved.length > 0 && <span className="nav-count">{preferences.saved.length}</span>}{label === 'Discover' && <span className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-divider" /><p className="sidebar-label">MAKE IT YOURS</p>
      <button className="nav-item" onClick={() => setPanel({ kind: 'goal' })}><Trophy size={20} />My reading goal</button>
      <button className="nav-item" onClick={() => setPanel({ kind: 'sell' })}><Repeat2 size={21} />Pass a book on<Plus size={15} className="nav-plus" /></button>
      <div className="sidebar-bottom"><div className="pip-note"><img src={asset('pip-reading.webp')} width="100" height="100" alt="" /><span className="tiny-star" aria-hidden="true">✦</span><h3>Small pages.<br />Big possibilities.</h3><p>Your next favorite idea<br />is a few pages away.</p><button onClick={() => setPanel({ kind: 'goal' })}>Make a little time<ArrowRight size={16} /></button></div><button className="help-button" onClick={() => setPanel({ kind: 'how' })}><HelpCircle size={18} />A little help from Pip<ArrowUpRight size={15} /></button></div>
    </aside>

    <div className="main-shell"><header className="topbar"><div className="mobile-brand"><button className="brand-button" onClick={() => navigate('Discover')} aria-label="Intellect home"><Brand small /></button></div><div className="topbar-location"><span>YOUR CURIOSITY, AT HOME</span><strong>{view}<span className="location-dot" /></strong></div>
      <div className="search-box"><Search size={19} /><input ref={search} aria-label={isCommunityView ? 'Search this circle' : 'Search books, authors, or ideas'} placeholder={isCommunityView ? 'Search this circle' : 'Search books, authors, or ideas'} value={query} onChange={event => setQuery(event.target.value)} /><kbd aria-hidden="true">⌘ K</kbd>{query && <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}</div>
      <div className="topbar-actions"><button className="streak-button" onClick={() => setPanel({ kind: 'goal' })} aria-label={`Reading streak: ${streak} day${streak === 1 ? '' : 's'}. Set your goal.`}><Flame size={22} /><span>{streak}<small>day streak</small></span></button><span className="topbar-separator" /><button className="notification-button icon-button" onClick={() => setPanel({ kind: 'notifications' })} aria-label="Notifications"><Bell size={21} /><span /></button><button className="profile-button" onClick={() => setPanel({ kind: 'profile' })} aria-label="Your reader profile">{preferences.name.slice(0, 1).toUpperCase()}<span /></button></div>
    </header>

    <main id="main-content" className="main-content"><div className="welcome-line"><span><span className="sun-icon" aria-hidden="true">✳</span> A little curiosity looks good on you.</span><span className="preview-label"><span />{isCommunityView ? 'V0.2 · INTELLECT COMMUNITY' : 'V0.2 · COMMUNITY PREVIEW'}</span></div>
      {view === 'Discover' && !query && <>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="hero-eyebrow"><span className="club-dot" />THE CURIOSITY CLUB<Sparkles size={13} /></span>
            <h1 id="hero-title">Get lost in a book.<br />Find your <span>people<svg viewBox="0 0 370 18" aria-hidden="true"><path d="M5 12 Q165 0 365 10" /></svg></span>.</h1>
            <p>Good stories. Fresh perspectives. Your kind of company.<br className="desktop-break" /> There’s a whole little world waiting between the covers.</p>
            <div className="hero-actions"><button className="button button-lime hero-button" onClick={() => navigate('Bookshop')}>Find my next read<ArrowRight size={20} /></button><button className="hero-secondary" onClick={() => navigate('Reading circles')}><MessagesSquare size={18} />Meet my people</button></div>
            <div className="hero-footnote"><FacePile /><span>For big thinkers &amp; one-more-chapter people.</span></div>
          </div>
          <div className="hero-art">
            <div className="world-arch" aria-hidden="true" />
            <div className="world-label"><Leaf size={14} />LET CURIOSITY TAKE THE LEAD</div>
            <img className="hero-world" src={asset('pip-reading-world.webp')} alt="Pip reading on a floating island of colorful books, surrounded by leaves and a giant open-book portal" width="440" height="440" fetchPriority="high" />
            <span className="world-star world-star-one" aria-hidden="true">✳</span><span className="world-star world-star-two" aria-hidden="true">✦</span>
            <div className="world-sticker"><Sparkles size={17} /><span>A new chapter.<br /><strong>A little more you.</strong></span></div>
            <div className="club-stamp" aria-hidden="true"><span>GOOD BOOKS</span><Heart size={22} /><span>GREAT COMPANY</span></div>
          </div>
        </section>
        <div className="reading-loop" aria-label="How Intellect works"><span><span className="loop-icon lime"><BookOpen size={20} /></span><span>Follow your curiosity<strong>There’s a book for that.</strong></span><small>01</small></span><ChevronRight size={18} className="loop-chevron" /><span><span className="loop-icon lavender"><MessagesSquare size={20} /></span><span>Find your kind of people<strong>Different minds. Shared pages.</strong></span><small>02</small></span><ChevronRight size={18} className="loop-chevron" /><span><span className="loop-icon peach"><Repeat2 size={20} /></span><span>Keep a good book going<strong>Read it. Love it. Pass it on.</strong></span><small>03</small></span><button className="loop-more" onClick={() => setPanel({ kind: 'how' })} aria-label="Learn how Intellect works"><ArrowUpRight size={20} /></button></div>
      </>}

      {isCommunityView ? <CommunityCircle key={`${view}-${communityNavigation}`} circle={view === 'AI Researchers' ? 'ai-researchers' : 'global-commons'} search={query} nickname={preferences.name} switchCircle={() => navigate(view === 'AI Researchers' ? 'Reading circles' : 'AI Researchers')} /> : <section ref={explore} className="discovery-section" aria-labelledby="discovery-title"><div className="section-heading"><div><span className="eyebrow">{view === 'My bookshelf' ? 'YOUR OWN LITTLE WORLD' : 'HANDPICKED FOR CURIOUS MINDS'}</span><DiscoveryTitle id="discovery-title">{query ? `Results for “${query}”` : view === 'Discover' ? 'Impossible to put down.' : view === 'Bookshop' ? 'Find your next favorite.' : 'A shelf full of possibilities.'}<span className="heading-spark" aria-hidden="true">✧</span></DiscoveryTitle><p>{view === 'My bookshelf' ? 'The books you’re curious about, all in one happy place.' : 'A few good reads. A thousand places they could take you.'}</p></div>{view === 'Discover' ? <button className="text-button" onClick={() => navigate('Bookshop')}>Explore the bookshop<ArrowRight size={17} /></button> : view === 'My bookshelf' ? <button className="button button-light" onClick={() => setPanel({ kind: 'sell' })}><Plus size={17} />Pass a book on</button> : null}</div>
        <div className="filter-bar"><div className="category-list" role="group" aria-label="Filter by interest">{categories.map((item, index) => { const Icon = categoryIcons[index]; return <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={`category-chip ${category === item ? 'selected' : ''}`}><Icon size={16} />{item === 'All books' ? 'For you' : item}</button>; })}</div><label className="sort-select"><span className="sr-only">Sort books</span><select aria-label="Sort books" value={sort} onChange={event => setSort(event.target.value)}><option value="curated">Curated for you</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="readers">Most discussed</option></select><ChevronDown size={15} /></label></div>
        <><div className="book-grid">{visibleBooks.map(bookCard)}</div>{visibleBooks.length === 0 && <EmptyState title={view === 'My bookshelf' && !query && category === 'All books' ? 'Every great shelf starts with one book.' : 'A little further down the rabbit hole?'} description={view === 'My bookshelf' && !query && category === 'All books' ? 'Tap a heart in the bookshop to keep a good read close.' : 'No books match this search yet. Try a different title, author, or interest.'} reset={() => { if (view === 'My bookshelf') navigate('Bookshop'); else { setQuery(''); setCategory('All books'); } }} />}</>
        {view === 'My bookshelf' && preferences.listings.length > 0 && <div className="local-listings"><h3>Books you’re passing on<span>{preferences.listings.length}</span></h3><p>Your draft listings. Saved on this device, not published for sale.</p>{preferences.listings.map(listing => <article className="listing-row" key={listing.id}><span className="listing-icon"><BookOpen size={24} /></span><div><strong>{listing.title}</strong><p>{listing.author} · {listing.condition}</p></div><strong>{money(listing.price)}</strong><button className="icon-button" aria-label={`Remove draft listing for ${listing.title}`} onClick={() => { setPreferences(current => ({ ...current, listings: current.listings.filter(item => item.id !== listing.id) })); notify('Draft listing removed.'); }}><X size={18} /></button></article>)}</div>}
      </section>}

      {view === 'Discover' && !query && category === 'All books' && <ReadingCollections choose={interest => { setView('Bookshop'); setCategory(interest); setQuery(''); setSort('curated'); window.scrollTo({ top: 0, behavior: 'instant' }); }} />}

      {view === 'Discover' && !query && <section className="v02-launch" aria-labelledby="v02-title"><div className="v02-launch-heading"><div><span className="eyebrow">NEW IN V0.2 · THE OPEN RESEARCH CIRCLE</span><h2 id="v02-title">Turn a good question into a shared pursuit.</h2><p>Read a paper. Define a small project. Find people asking what comes next.</p></div><span className="release-sticker"><Leaf size={16} />GROW TOGETHER</span></div><div className="v02-launch-grid">{([{ space: 'papers', title: 'A paper, one idea at a time.', text: 'Guided reading, private notes, and a question for the circle.', icon: BookOpen }, { space: 'projects', title: 'Start with something small.', text: 'Give a collaboration a clear question and a useful first artifact.', icon: Layers }, { space: 'people', title: 'Find your kind of curious.', text: 'Build a research profile and make room for a future collaborator.', icon: Users }] as const).map(({ space, title, text, icon: Icon }) => <button key={space} onClick={() => navigate('AI Researchers', space)}><span><Icon size={23} /></span><strong>{title}</strong><small>{text}</small><ArrowUpRight size={19} /></button>)}</div></section>}

      {view === 'Discover' && !query && <div className="community-grid"><section className="conversations" aria-labelledby="conversations-title"><div className="section-heading small-heading"><div><span className="eyebrow">BETTER TOGETHER</span><h2 id="conversations-title">Between the lines<span aria-hidden="true">↗</span></h2><p>The best part of a good book? Talking about it.</p></div><button className="icon-button" aria-label="Explore all reading circles" onClick={() => navigate('Reading circles')}><ArrowRight size={20} /></button></div><div className="discussion-list">{discussions.slice(0, 2).map(discussionCard)}</div></section>
        <section className={`daily-card ${goalDone ? 'goal-done' : ''}`} aria-labelledby="daily-title"><div className="daily-top"><span className="eyebrow">A LITTLE EVERY DAY</span><span className="daily-flame"><Flame size={22} /></span></div><h2 id="daily-title">{goalDone ? 'Look at you grow!' : 'Big ideas start\nwith small habits.'}</h2><p>{goalDone ? 'You made a little room for reading today. Pip is very proud.' : `${preferences.goal} minutes. A few pages. A whole new perspective.`}</p><div className="daily-progress-label"><span>Today’s reading</span><strong>{Math.min(todayMinutes, preferences.goal)} / {preferences.goal} min</strong></div><div className="progress-track" role="progressbar" aria-label="Today’s reading goal" aria-valuenow={Math.min(todayMinutes, preferences.goal)} aria-valuemin={0} aria-valuemax={preferences.goal}><span style={{ width: `${Math.min(100, todayMinutes / preferences.goal * 100)}%` }} /></div><button className="button button-dark" disabled={goalDone} onClick={() => { setPreferences(current => ({ ...current, reading: { ...current.reading, [today]: preferences.goal } })); notify('A chapter for you. A happy dance from Pip. Goal complete!'); }}>{goalDone ? <><Check size={17} />Today’s goal, done!</> : <>I read for {preferences.goal} minutes<Check size={17} /></>}</button></section>
      </div>}

      {view === 'Reading circles' && <section className="salon-card"><div className="salon-icon"><Headphones size={30} /><span className="sound-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span></div><div><span className="eyebrow">LESS SCROLLING. MORE LISTENING.</span><h2>Some ideas are better out loud.</h2><p>Take a peek inside an audio salon, a cozy space for a thoughtful exchange.</p></div><button className="button button-lime" onClick={() => setPanel({ kind: 'salon' })}>Explore a salon<ArrowUpRight size={18} /></button></section>}

      <footer className="app-footer"><span><Leaf size={15} />Read a little. Think a little. Grow a little.</span><button onClick={() => setPanel({ kind: 'mission' })}>Our mission &amp; roadmap<ArrowUpRight size={14} /></button><p>Example book catalog · Visit the circles for shared-connection status. {storageIssue ? 'Your browser cannot save changes right now.' : 'Your shelf and reading goals stay on this device.'}</p></footer>
    </main></div>

    <nav className="mobile-navigation" aria-label="Mobile navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} className={view === label ? 'active' : ''} aria-current={view === label ? 'page' : undefined} onClick={() => navigate(label)}><Icon size={21} /><span>{label === 'Reading circles' ? 'Circles' : label === 'AI Researchers' ? 'AI circle' : label === 'My bookshelf' ? 'My shelf' : label}</span></button>)}</nav>
    <div className={`app-toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">{toast && <><span><Check size={17} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={16} /></button></>}</div>

    {panel && <Modal key={panel.kind === 'book' ? panel.book.id : panel.kind === 'thread' ? panel.discussion.id : panel.kind} title={panel.kind === 'book' ? panel.book.title : panel.kind === 'thread' ? panel.discussion.title : panel.kind === 'goal' ? 'Make room for a little wonder.' : panel.kind === 'sell' ? 'A good book deserves another chapter.' : panel.kind === 'salon' ? 'A room for curious minds.' : panel.kind === 'profile' ? 'Hello, fellow bookworm.' : panel.kind === 'notifications' ? 'Your little reading corner.' : panel.kind === 'mission' ? 'More room for curious minds.' : 'Good books are just the beginning.'} close={() => setPanel(null)} wide={panel.kind === 'book'}>
      {panel.kind === 'mission' ? <MissionPanel /> : panel.kind === 'book' ? <BookDetail book={panel.book} saved={preferences.saved.includes(panel.book.id)} save={() => toggleSaved(panel.book)} openDiscussion={() => setPanel({ kind: 'thread', discussion: discussions.find(item => item.book.startsWith(panel.book.title)) || { ...discussions[0], id: `book-${panel.book.id}`, title: panel.book.question, book: panel.book.title, prompt: `A question to take into your next chapter: ${panel.book.question}`, category: panel.book.category } })} /> : panel.kind === 'thread' ? <ThreadDetail discussion={panel.discussion} reflections={preferences.reflections[panel.discussion.id] || []} addReflection={reflection => { const id = panel.discussion.id; setPreferences(current => ({ ...current, reflections: { ...current.reflections, [id]: [...(current.reflections[id] || []), reflection] } })); notify('Your thought is saved in this preview.'); }} /> : panel.kind === 'goal' ? <div className="goal-panel"><img src={asset('pip-reading.webp')} width="150" height="150" alt="Pip is ready to read with you" /><p>Choose a daily reading goal. A small, steady habit can open up a whole new world.</p><div className="goal-options">{[10, 20, 30].map(value => <button key={value} aria-pressed={preferences.goal === value} className={preferences.goal === value ? 'selected' : ''} onClick={() => { setPreferences(current => ({ ...current, goal: value })); notify(`Your daily reading goal is ${value} minutes.`); }}><span>{value}</span>minutes<small>{value === 10 ? 'A little spark' : value === 20 ? 'A curious chapter' : 'A good rabbit hole'}</small>{preferences.goal === value && <Check size={17} />}</button>)}</div><div className="streak-summary"><Flame size={22} /><strong>{streak} day{streak === 1 ? '' : 's'} of curiosity</strong><span>{todayMinutes} minutes read today</span></div><button className="button button-lime full-width" onClick={() => setPanel(null)}>Sounds like a good plan<ArrowRight size={18} /></button></div> : panel.kind === 'sell' ? <ListingForm onSave={listing => { setPreferences(current => ({ ...current, listings: [...current.listings, listing] })); setPanel(null); navigate('My bookshelf'); notify('Your book’s next chapter is saved as a draft.'); }} /> : panel.kind === 'profile' ? <ProfileForm name={preferences.name} onSave={name => { setPreferences(current => ({ ...current, name })); setPanel(null); notify(`Glad you’re here, ${name}.`); }} /> : panel.kind === 'salon' ? <div className="salon-preview"><div className="salon-preview-art"><Headphones size={44} /><span>THE ART OF PAYING ATTENTION</span></div><p>A place to listen, question, and share a passage that stayed with you.</p><div className="salon-people"><span className="reader-avatar lavender">AM</span><span className="reader-avatar peach">JK</span><span className="reader-avatar mint">SP</span><span>Different minds.<br /><strong>One thoughtful conversation.</strong></span></div><p className="preview-notice">This is a salon design preview. Live audio and scheduling are not connected yet.</p><button className="button button-lime full-width" onClick={() => { setPanel(null); navigate('Reading circles'); }}>Explore the reading circles<ArrowRight size={18} /></button></div> : panel.kind === 'notifications' ? <div className="notification-panel"><span className="notification-illustration"><Bell size={30} /></span><h3>A quiet corner. A fresh start.</h3><p>Your saved books and reading goals are ready when you are. Circle threads show new replies while you have them open when shared communication is activated. Background notifications are not available yet.</p><button className="button button-lime full-width" onClick={() => { setPanel(null); navigate('My bookshelf'); }}>Visit my bookshelf<ArrowRight size={17} /></button></div> : <div className="how-panel"><div className="how-intro"><img src={asset('pip-reading.webp')} width="130" height="130" alt="Pip, your friendly reading companion" /><p>A home for books, big ideas, and the people who love them. Pip’s happy you found us.</p></div>{[{ icon: BookOpen, title: 'Follow a little curiosity.', text: 'Explore books and discover an annotated copy with another reader’s thoughts tucked into the margins.' }, { icon: MessagesSquare, title: 'Go beyond the last page.', text: 'Find a reading circle, ask a question, and make room for a different point of view.' }, { icon: Repeat2, title: 'Let a good book keep going.', text: 'Finish a chapter of your life, then pass your copy on to the next curious mind.' }].map(({ icon: Icon, title, text }, i) => <div className="how-step" key={title}><span className={['lime', 'lavender', 'peach'][i]}><Icon size={22} /></span><div><h3>{title}</h3><p>{text}</p></div></div>)}<p className="preview-notice">You’re exploring an interactive frontend. Purchases and live audio need connected services. Visit Global Commons or AI Researchers for shared-connection status. Saved books, draft listings, private reflections, and goals work on this device.</p><button className="button button-lime full-width" onClick={() => { setPanel(null); navigate('Bookshop'); }}>Let’s find a good book<ArrowRight size={18} /></button></div>}
    </Modal>}
  </div>;
}

function ReadingCollections({ choose }: { choose: (interest: Category) => void }) {
  const collections: { category: Category; eyebrow: string; title: string; className: string; covers: string[]; icon: typeof Brain }[] = [
    { category: 'Philosophy', eyebrow: 'THE BIG QUESTIONS', title: 'A mind of\nyour own.', className: 'collection-lavender', covers: ['meditations.webp'], icon: Lightbulb },
    { category: 'AI & Technology', eyebrow: 'AHEAD OF THE CURVE', title: 'Big ideas.\nBigger possibilities.', className: 'collection-peach', covers: ['ml-systems.webp'], icon: Cpu },
    { category: 'Psychology', eyebrow: 'THE HUMAN SIDE', title: 'Get to know\nyour own mind.', className: 'collection-green', covers: ['atomic-habits.webp', 'thinking-fast.webp'], icon: Brain },
  ];
  return <section className="collections-section" aria-labelledby="collections-title"><div className="section-heading"><div><span className="eyebrow">TAKE THE SCENIC ROUTE</span><h2 id="collections-title">Where will curiosity take you?</h2><p>A little detour can lead to your next favorite idea.</p></div><span className="collections-note">Good rabbit holes, this way <span aria-hidden="true">↘</span></span></div><div className="collections-grid">{collections.map(({ category, eyebrow, title, className, covers, icon: Icon }) => <button className={`collection-card ${className}`} key={category} onClick={() => choose(category)} aria-label={`Explore ${category} books`}><span className="collection-eyebrow">{eyebrow}</span><span className="collection-title">{title}</span><span className="collection-bottom"><span>{category}<small>{books.filter(book => book.category === category).length} good read{books.filter(book => book.category === category).length === 1 ? '' : 's'}</small></span><span className="collection-arrow"><ArrowUpRight size={21} /></span></span><span className="collection-covers" aria-hidden="true">{covers.map(cover => <img key={cover} src={asset(cover)} alt="" loading="lazy" width="90" height="130" />)}</span><Icon className="collection-doodle" size={32} strokeWidth={1.4} /></button>)}</div></section>;
}

function EmptyState({ title, description, reset }: { title: string; description: string; reset: () => void }) {
  return <div className="empty-state"><BookOpen size={38} /><h3>{title}</h3><p>{description}</p><button className="button button-lime" onClick={reset}>Explore all books<ArrowRight size={17} /></button></div>;
}

function BookDetail({ book, saved, save, openDiscussion }: { book: Book; saved: boolean; save: () => void; openDiscussion: () => void }) {
  return <div className="book-detail"><div className={`detail-cover ${book.color}`}><img src={asset(book.cover)} width="200" height="300" alt={`${book.title} book cover`} /><span><PenLine size={15} />A book with a little history</span></div><div className="detail-copy"><p className="detail-author">by {book.author}</p><div className="detail-facts"><span>{book.category}</span><span>{book.pages} pages</span><span>Pre-loved</span></div><p>{book.description}</p><div className="margin-note"><span><PenLine size={16} />IN THE MARGINS</span><p>{book.notes}</p></div><div className="detail-price"><strong>{money(book.price)}</strong><span>Example listing · good condition</span></div><button className={`button ${saved ? 'button-light' : 'button-lime'} full-width`} onClick={save}>{saved ? <Check size={18} /> : <Heart size={18} />}{saved ? 'Saved to my bookshelf' : 'Save to my bookshelf'}</button><button className="button button-light full-width" onClick={openDiscussion}><MessagesSquare size={18} />Explore the conversation<ArrowUpRight size={17} /></button><p className="detail-disclaimer">A preview of the book experience. Checkout and real inventory are not connected.</p></div></div>;
}

function ThreadDetail({ discussion, reflections, addReflection }: { discussion: Discussion; reflections: string[]; addReflection: (text: string) => void }) {
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); if (text.trim()) { addReflection(text.trim()); setText(''); } }
  return <div className="thread-panel"><div className="thread-byline"><span className={`reader-avatar ${discussion.color}`}>{discussion.initials}</span><span>{discussion.name}<small>{discussion.book} · Sample discussion</small></span></div><p className="thread-prompt">{discussion.prompt}</p><div className="spoiler-note"><BookOpen size={18} /><span>Read at your own pace. Keep later chapters a surprise.</span></div><button className="spoiler-toggle" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide a later-chapter reflection' : 'Reveal a later-chapter reflection'}<ChevronDown size={17} /></button>{revealed && <blockquote className="sample-reflection">Perhaps the most useful thing a book gives us is a question we keep asking after we close it.</blockquote>}<div className="your-reflections"><h3>Your thoughts<span>{reflections.length}</span></h3>{reflections.length === 0 ? <p className="quiet-note">A good question deserves your point of view.</p> : reflections.map((reflection, i) => <div className="reflection" key={`${i}-${reflection.slice(0, 15)}`}><span className="reader-avatar lime">Y</span><div><strong>You<small>Saved on this device</small></strong><p>{reflection}</p></div></div>)}</div><form onSubmit={submit}><label htmlFor="reflection-text">What’s your take?</label><textarea id="reflection-text" value={text} maxLength={2000} onChange={event => setText(event.target.value)} placeholder="A question, a connection, a different perspective…" required rows={3} /><div className="reflection-form-footer"><span>Private reflection, saved only on this device.</span><button className="button button-lime" disabled={!text.trim()} type="submit">Save my thought<Send size={16} /></button></div></form></div>;
}

function ListingForm({ onSave }: { onSave: (listing: Listing) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') || '').trim();
    const author = String(data.get('author') || '').trim();
    const price = Number(data.get('price'));
    if (!title || !author || !Number.isInteger(price) || price < 1) return;
    onSave({ id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, title, author, price, condition: String(data.get('condition')), notes: String(data.get('notes') || '').trim() });
  }
  return <form className="listing-form" onSubmit={submit}><p>Someone else’s next favorite book might already be on your shelf.</p><label htmlFor="listing-title">Book title<input id="listing-title" name="title" maxLength={140} placeholder="The book that stayed with you" required /></label><div className="form-two"><label htmlFor="listing-author">Author<input id="listing-author" name="author" maxLength={100} placeholder="Written by…" required /></label><label htmlFor="listing-price">Asking price (₹)<input id="listing-price" name="price" type="number" min="1" max="100000" step="1" placeholder="299" required /></label></div><label htmlFor="listing-condition">A little about its condition<select id="listing-condition" name="condition"><option>Like new</option><option>Very good</option><option>Good, with character</option><option>Well-loved</option></select></label><label htmlFor="listing-notes">Any thoughts in the margins?<textarea id="listing-notes" name="notes" maxLength={1000} placeholder="A few underlines? A whole conversation in pencil? Tell the next reader." rows={3} /></label><p className="preview-notice">This creates a draft on this device. It does not publish a listing or accept a payment.</p><button className="button button-lime full-width" type="submit">Save my book’s next chapter<ArrowRight size={18} /></button></form>;
}

function ProfileForm({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [value, setValue] = useState(name);
  return <form className="profile-form" onSubmit={event => { event.preventDefault(); if (value.trim()) onSave(value.trim()); }}><span className="profile-large">{value.trim().slice(0, 1).toUpperCase() || '?'}</span><p>What should Pip call you? A nickname is perfectly good.</p><label htmlFor="reader-name">Your name<input id="reader-name" value={value} onChange={event => setValue(event.target.value)} maxLength={30} required /></label><p className="quiet-note">Saved on this device. No account needed for this preview.</p><button type="submit" className="button button-lime full-width" disabled={!value.trim()}>That’s me<Check size={18} /></button></form>;
}

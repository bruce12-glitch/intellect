export type CircleSlug = 'global-commons' | 'ai-researchers';
export interface CommunityPost {
  id: string;
  circle_slug: CircleSlug;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  topic: string;
  source_url: string | null;
  created_at: string;
  example?: boolean;
  draft?: boolean;
}
export interface CommunityReply {
  id: string;
  post_id: string;
  circle_slug: CircleSlug;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  draft?: boolean;
}
export const circleDetails = {
  'ai-researchers': {
    name: 'AI Researchers',
    eyebrow: 'THE RESEARCH CIRCLE',
    title: 'Big questions. Better together.',
    description: 'A home for researchers, students, and builders exploring how AI works. Bring a paper, a result, or a question you can’t leave alone.',
    topics: ['LLM inference', 'Agentic memory', 'ML systems', 'Paper club', 'Collaboration'],
  },
  'global-commons': {
    name: 'Global Commons',
    eyebrow: 'CURIOUS MINDS, WITHOUT BORDERS',
    title: 'Different places. Shared ideas.',
    description: 'Leave a thought before your day ends. Find a fresh perspective when the next reader’s day begins. Conversations don’t need everyone online at once.',
    topics: ['Books & ideas', 'Philosophy', 'Introductions', 'Reading partners'],
  },
} as const;

// These are prompts for the preview, not claims of existing members or live activity.
export const examplePosts: CommunityPost[] = [
  { id: 'example-inference', circle_slug: 'ai-researchers', author_id: 'example', author_name: 'Example research prompt', topic: 'LLM inference', title: 'KV-cache eviction: what would a fair evaluation look like?', body: 'Suppose two cache eviction methods have the same memory budget. Which workloads, quality checks, latency measurements, and failure cases would you include before calling one better? Share an experiment design or a useful baseline.', source_url: null, created_at: '', example: true },
  { id: 'example-memory', circle_slug: 'ai-researchers', author_id: 'example', author_name: 'Example research prompt', topic: 'Agentic memory', title: 'When should an agent forget?', body: 'What should a memory system retain, compress, or discard as a task changes? Bring a concrete example and explain how you would tell whether a memory was useful.', source_url: null, created_at: '', example: true },
  { id: 'example-paper', circle_slug: 'ai-researchers', author_id: 'example', author_name: 'Example paper-club prompt', topic: 'Paper club', title: 'Paper club: reading FlashAttention from the memory hierarchy up', body: 'Read FlashAttention by Tri Dao and coauthors. Which part of the IO-aware argument would you explain first to someone new to GPU systems? Bring a question about the method or a small reproduction idea.', source_url: 'https://arxiv.org/abs/2205.14135', created_at: '', example: true },
  { id: 'example-systems', circle_slug: 'ai-researchers', author_id: 'example', author_name: 'Example research prompt', topic: 'ML systems', title: 'A useful experiment starts with a reproducible setup.', body: 'What belongs in a minimal inference experiment report? Consider hardware, software versions, request shapes, warm-up, batching, latency percentiles, and the artifacts another reader would need.', source_url: null, created_at: '', example: true },
  { id: 'example-collaboration', circle_slug: 'ai-researchers', author_id: 'example', author_name: 'Example collaboration prompt', topic: 'Collaboration', title: 'Find a collaborator for a small, reproducible baseline.', body: 'Introduce a bounded project: the research question, one baseline, available compute, the help you need, and how you’ll share results. Start with work that two people could reproduce independently.', source_url: null, created_at: '', example: true },
  { id: 'example-global', circle_slug: 'global-commons', author_id: 'example', author_name: 'Example conversation starter', topic: 'Introductions', title: 'One book. One question. A good place to begin.', body: 'Tell the circle what you’re reading and one question it has left you with. You can reply whenever your day has room for it.', source_url: null, created_at: '', example: true },
  { id: 'example-partners', circle_slug: 'global-commons', author_id: 'example', author_name: 'Example conversation starter', topic: 'Reading partners', title: 'A reading partner doesn’t have to share your time zone.', body: 'Choose a book, agree on a small chapter milestone, and leave reflections in the thread. Each reader can catch up in their own time.', source_url: null, created_at: '', example: true },
  { id: 'example-ideas', circle_slug: 'global-commons', author_id: 'example', author_name: 'Example conversation starter', topic: 'Books & ideas', title: 'What idea followed you out of the last chapter?', body: 'Share an idea in your own words and tell us which book sparked it. A different perspective is welcome; give the next reader something thoughtful to respond to.', source_url: null, created_at: '', example: true },
  { id: 'example-philosophy', circle_slug: 'global-commons', author_id: 'example', author_name: 'Example conversation starter', topic: 'Philosophy', title: 'Can we disagree well?', body: 'Start with a claim, explain the reason for it, and name what evidence or argument might change your mind. How could that make a book discussion better?', source_url: null, created_at: '', example: true },
];

export function newMessageId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function validSourceUrl(value: string) {
  if (!value.trim()) return true;
  try { const url = new URL(value.trim()); return url.protocol === 'https:' && value.trim().length <= 2000 && !/\s/.test(value.trim()); } catch { return false; }
}

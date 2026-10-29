import type { CommunityPost } from './community-data';

export type ResearchSpace = 'discussions' | 'papers' | 'projects' | 'people';
export interface DiscussionSeed { title: string; body: string; topic: string; source_url: string }
export interface ResearchPaper {
  id: string; title: string; shortTitle: string; authors: string; year: string; topic: string; url: string; color: string;
  idea: string; prerequisites: string; questions: string[];
}
export const researchPapers: ResearchPaper[] = [
  { id: 'flashattention', shortTitle: 'FlashAttention', title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness', authors: 'Tri Dao and coauthors', year: '2022', topic: 'ML systems', url: 'https://arxiv.org/abs/2205.14135', color: 'sky', idea: 'Study how changing the movement of data through GPU memory can make exact attention more efficient.', prerequisites: 'Attention, matrix multiplication, and the GPU memory hierarchy.', questions: ['Which memory transfers does tiling avoid?', 'What stays exact, and what changes in the computation order?', 'What would you measure to separate memory traffic from wall-clock speed?'] },
  { id: 'pagedattention', shortTitle: 'PagedAttention', title: 'Efficient Memory Management for Large Language Model Serving with PagedAttention', authors: 'Woosuk Kwon and coauthors', year: '2023', topic: 'LLM inference', url: 'https://arxiv.org/abs/2309.06180', color: 'lavender', idea: 'Explore a serving system’s approach to fragmentation and sharing in a growing KV cache.', prerequisites: 'Autoregressive decoding, KV caches, and virtual memory.', questions: ['Where does KV-cache memory get wasted?', 'How does paging change allocation and sharing?', 'Which request shapes and latency constraints would make a useful comparison?'] },
  { id: 'memgpt', shortTitle: 'MemGPT', title: 'MemGPT: Towards LLMs as Operating Systems', authors: 'Charles Packer and coauthors', year: '2023 · revised 2024', topic: 'Agentic memory', url: 'https://arxiv.org/abs/2310.08560', color: 'peach', idea: 'Ask how an LLM-based system can manage information across memory tiers beyond its immediate context.', prerequisites: 'Context windows, retrieval, and hierarchical memory.', questions: ['What information belongs in each memory tier?', 'How is movement between tiers controlled?', 'What evidence would distinguish useful long-term memory from simply retrieving more text?'] },
];

export const readingSteps = [
  { title: 'Find the question', detail: 'Read the abstract and introduction. Describe the problem in your own words.' },
  { title: 'Trace the mechanism', detail: 'Follow one example through the method. Write down an assumption or a missing prerequisite.' },
  { title: 'Imagine a fair test', detail: 'Choose a baseline, a metric, and one failure case. Separate the paper’s evidence from your hypothesis.' },
];

export const exampleProjects: CommunityPost[] = [
  { id: 'project-cache', circle_slug: 'ai-researchers', author_id: 'example', author_name: 'Example project brief', title: 'A fair KV-cache eviction comparison', body: 'Question\nHow do two eviction policies compare at the same cache budget?\n\nScope\nOne model, one fixed dataset, and documented quality and latency measurements.\n\nHelp wanted\nPython, evaluation design, and checking assumptions.\n\nFirst artifact\nA reproducible configuration and an honest limitations note.', topic: 'Collaboration', source_url: null, created_at: '', example: true },
  { id: 'project-memory', circle_slug: 'ai-researchers', author_id: 'example', author_name: 'Example project brief', title: 'When does an agent’s memory help?', body: 'Question\nWhich memories improve performance on a bounded, multi-session task?\n\nScope\nCompare a small retrieval baseline with a clearly defined memory policy.\n\nHelp wanted\nTask design, failure analysis, and writing up negative results.\n\nFirst artifact\nAn openly documented evaluation protocol.', topic: 'Collaboration', source_url: null, created_at: '', example: true },
];

export interface ProfileDraft {
  display_name: string; headline: string; bio: string; interests: string[]; skills: string;
  looking_for: string; availability: string; time_zone: string; website_url: string; orcid_url: string;
}
export interface ResearchProfile extends Omit<ProfileDraft, 'website_url' | 'orcid_url'> {
  user_id: string; website_url: string | null; orcid_url: string | null; published: boolean; updated_at: string;
}
export const profileInterests = ['LLM inference', 'Agentic memory', 'ML systems', 'Paper club', 'Collaboration'];
export const profileGoals = ['Collaborators', 'Study partners', 'Mentoring', 'Learning together'];
export const availabilityOptions = ['Just exploring', '1–2 hours / week', '3–5 hours / week', '6–10 hours / week'];
export function emptyProfile(name = ''): ProfileDraft {
  return { display_name: name === 'Reader' ? '' : name.slice(0, 40), headline: '', bio: '', interests: [], skills: '', looking_for: 'Learning together', availability: 'Just exploring', time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', website_url: '', orcid_url: '' };
}
export function decodeProfile(value: unknown): ProfileDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as ProfileDraft;
  if (!['display_name', 'headline', 'bio', 'skills', 'looking_for', 'availability', 'time_zone', 'website_url', 'orcid_url'].every(key => typeof (draft as unknown as Record<string, unknown>)[key] === 'string')) return null;
  if (!Array.isArray(draft.interests) || !draft.interests.every(item => typeof item === 'string')) return null;
  // Keep only editable fields; never carry server IDs or timestamps into an update.
  return {
    display_name: draft.display_name.slice(0, 40), headline: draft.headline.slice(0, 100), bio: draft.bio.slice(0, 800),
    interests: [...new Set(draft.interests.filter(item => profileInterests.includes(item)))].slice(0, 8), skills: draft.skills.slice(0, 180),
    looking_for: profileGoals.includes(draft.looking_for) ? draft.looking_for : 'Learning together',
    availability: availabilityOptions.includes(draft.availability) ? draft.availability : 'Just exploring',
    time_zone: draft.time_zone.slice(0, 80), website_url: draft.website_url.slice(0, 2000), orcid_url: draft.orcid_url.slice(0, 50),
  };
}

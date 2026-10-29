# Intellect releases

## v0.2.0 — Read, connect, research

The research circle now has four spaces: Discussions, Paper club, Projects, and People. The existing bookshop, shelves, reading goals, and Global Commons remain available.

### Included

- A guided paper desk for FlashAttention, PagedAttention, and MemGPT, with primary-source links, prerequisites, discussion prompts, a three-step reading path, private notes, and Markdown export.
- Structured collaboration briefs covering the question, scope, help wanted, first artifact, availability, and an optional source. Reviewing a brief opens a normal Collaboration discussion draft; publication always requires an explicit action.
- Researcher profile drafts, optional website/ORCID links, interests, skills, availability, and time zones. Shared publication is opt-in; owners can remove their profile from the public directory. Profile drafts are kept separately for each signed-in account on the current browser.
- Community guidelines, private reports, personal blocking/unblocking, report status, and a moderator queue with hide, dismiss, and restore actions. The database checks every moderator assignment and circle boundary. Hidden discussion threads and their replies are excluded from public reads.
- A v0.2 home-page feature section and a mission/roadmap view that distinguishes working local tools, services needing activation, and planned community programmes.
- Thirty community permission, data-integrity, and configuration checks, plus four frontend data-boundary tests. The publishing workflow runs both suites before the production build.

See [validation notes](apps/web/design/V02_QA.md) for browser checks and their limits.

### Activation and scope

The static frontend is deployed through the existing GitHub Pages workflow. Shared accounts, profiles, messaging, reports, and moderator operations require a Supabase project, **both migrations in order**, email delivery configuration, and the two public repository variables. See [COMMUNITY_SETUP.md](supabase/COMMUNITY_SETUP.md).

Private notebooks, progress, profile drafts, and discussion drafts work without that project. These records are not uploaded or automatically published. Example discussions and project briefs are labeled; the People preview does not invent researchers, credentials, or member counts.

Project introductions use public threads. Direct messages, a scheduled live paper-club session, translation, background notifications, book donation logistics, donation payments, and mentorship applications are outside this release. No charitable registration, funding, partners, or impact figures are asserted.

The profile directory refreshes on search, filtering, saving, or manual refresh. It is not a presence system. Blocking filters the signed-in view of discussions, replies, projects, and profiles; public content can still be read by other people or while signed out. Moderator queues retain access needed for review.

Reports show the latest review decision rather than a complete immutable moderation audit. Reports are removed if their target content or reporter account is deleted. Hosted Auth, email delivery, PostgREST, and Realtime must be tested against the activated project; local database tests do not validate those services.

### Sources for the reading desk

- [FlashAttention — arXiv:2205.14135](https://arxiv.org/abs/2205.14135)
- [PagedAttention — arXiv:2309.06180](https://arxiv.org/abs/2309.06180)
- [MemGPT — arXiv:2310.08560](https://arxiv.org/abs/2310.08560)

The short descriptions and questions are learning prompts, not claims of completed experiments or exhaustive paper summaries.

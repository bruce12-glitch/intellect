# Intellect v0.2 validation

Date: 29 October 2026.

## Automated checks

- 12 existing PostgreSQL/configuration checks passed.
- 18 v0.2 PostgreSQL checks passed against both real migration files using PGlite.
- Four Vitest tests passed for the profile publication boundary, malformed stored drafts, normalization, and source-link validation.
- The GitHub Pages production export compiled, passed type checking, and generated successfully after the final export-preview change.

## Browser checks

- Desktop paper-club navigation, paper selection, notebook editing, and reading-step labels.
- Notes and self-reported progress retained after a reload.
- Paper notes opened a discussion composer with the paper URL and correct topic. Saving created a labeled private draft.
- A structured project brief opened a Collaboration draft with its question, scope, requested help, artifact, and availability. Nothing was published automatically.
- Research profile name, skills, selected interests, and goal retained after saving and reopening. No public directory entry or account was fabricated in preview mode.
- Community guidelines and the mission/roadmap view showed the expected activation and programme status.
- The new home-page paper shortcut opened the correct research space.
- Phone previews at outer widths 390 and 360 pixels had no horizontal document overflow. Content viewports were 375 and 345 pixels after browser scrollbars. The narrow profile dialog also had no horizontal overflow.
- Markdown export preview contained the expected paper, source, progress, and note text. The copy action reported success. The download link had the expected `.md` filename; the cloud browser did not expose a completed download event, so file delivery was not verified in that browser.

## Verification limits

No Supabase project was connected during these checks. Hosted email sign-in, Auth redirects, PostgREST profile publication, multiple-user messaging, Realtime, reporting, and moderator actions still need the multi-account activation checks in [the setup guide](../../../supabase/COMMUNITY_SETUP.md).

Local SQL tests verify database authorization and visibility behavior. They do not establish hosted service availability, public email delivery, or production-scale capacity.

# Activate Intellect’s shared circles

The frontend is published at https://bruce12-glitch.github.io/intellect/. The two circles are:

- [Global Commons](https://bruce12-glitch.github.io/intellect/?circle=global-commons)
- [AI Researchers](https://bruce12-glitch.github.io/intellect/?circle=ai-researchers)

Without the two project settings below, the frontend displays labeled example prompts and saves private drafts on the visitor’s device. It does not send those drafts to other visitors. No hosted Supabase project was provisioned as part of this change.

## 1. Create the shared database

Create or choose a [Supabase project](https://supabase.com/dashboard). In its SQL Editor, run the complete contents of [202610280001_community_circles.sql](migrations/202610280001_community_circles.sql) once. Alternatively, apply it with the Supabase CLI to a linked project.

The migration creates the circle directory, memberships, discussions, and replies. It enables row-level security, limits browser writes to permitted columns, stamps authors and timestamps on the server, and adds the discussion tables to the `supabase_realtime` publication. It creates **no artificial users, discussions, or replies**.

Keep row-level security enabled. The browser uses public project credentials; authorization is enforced by Postgres policies and triggers.

## 2. Enable email sign-in

Under Supabase Authentication, enable the Email provider and signups if new visitors should be able to join. Keep the magic-link email template configured for a confirmation URL. In URL Configuration, set:

- Site URL: `https://bruce12-glitch.github.io/intellect/`
- Allowed redirect URL: `https://bruce12-glitch.github.io/intellect/?circle=global-commons`
- Allowed redirect URL: `https://bruce12-glitch.github.io/intellect/?circle=ai-researchers`

For local development, also allow the matching local URLs. Configure a [custom SMTP provider](https://supabase.com/docs/guides/auth/auth-smtp) for public delivery. The default email service only sends to project organization team addresses and has restrictive sending limits. Inspect Auth logs if an email is rejected, delayed, or a redirect is not allowed.

The UI sends a link only when a visitor submits the email form. On return, the visitor chooses a public display name and joins the selected circle. Discussions and replies are public. The UI never puts the email address into public posts or membership labels.

## 3. Connect GitHub Pages

Open the repository’s [Actions variables](https://github.com/bruce12-glitch/intellect/settings/variables/actions) and add these **repository variables**:

| Variable | Value from Supabase |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from the project’s Connect dialog/API settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`), or the legacy `anon` key |

These values are embedded in the browser build. **Never use an `sb_secret_…` or `service_role` key.** The build rejects missing pairs, secret keys, and legacy JWT keys with any role other than `anon`.

Run **Deploy frontend to GitHub Pages** from the repository’s Actions tab. Repository-variable changes do not automatically rebuild the existing static website. Wait for both build and deployment jobs to finish, then reload either circle link.

For development, copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the same two public settings. Use Node.js 22 or newer. No database service key is needed by the frontend.

## 4. Verify with two accounts

1. Open a circle. The activation notice should become a shared connection status, and there should be no example posts mixed into the real feed.
2. In separate browser profiles, sign in with two email addresses and join the same circle.
3. Publish a discussion from one account and reply from the other. Confirm that the other profile receives the change and that the messages survive a reload.
4. Check that another member cannot remove the first member’s discussion. Check that a signed-out visitor can read but cannot publish.
5. Switch to AI Researchers and try the paper link, topic-room filters, discussion search, and a copied thread link in the other profile.
6. Disconnect a browser briefly. Confirm that publication is disabled while offline and that draft text remains available after returning.

If live updates are unavailable, the app refreshes visible discussions and threads every 30 seconds. The feed also refreshes when the window regains focus, returns online, or becomes visible. A refresh button is available for the discussion feed. Failed submissions retain the message ID and text so a retry can recover an already-created message without duplicating it.

## Current scope

- Shared text discussions and replies; email-link accounts; public display names and circle membership; HTTPS paper/source links; English full-text discussion search; topic rooms; local-time timestamps; Realtime updates with polling fallback.
- Per-author server limits: five new discussions and sixty replies per rolling hour across both circles. The feed loads up to 200 recent discussions; search queries the database rather than only the loaded cards. Thread views show the latest 300 replies in chronological order.
- Private drafts, book goals, and shelves remain on the current device and do not sync between accounts. A saved discussion draft can be reopened, edited, and explicitly published after activation. Example discussion drafts never become shared messages automatically.
- Direct messages, translation, push notifications, audio/video rooms, a moderation console, reporting/blocking, and a full archive UI are not implemented. No presence counts or claims of active members are fabricated. Before a broad public launch, establish moderation operations, email delivery capacity, and database/Realtime capacity for the expected audience.
- Any-language text can be posted. Search currently uses an English text-search configuration; it is not automatic translation or multilingual semantic search.

## Validation

With frontend dependencies installed, run from the repository root:

```sh
npm run test:community --workspace=apps/web
GITHUB_PAGES=true npm run build:web
```

The 11 community checks execute the actual migration in an in-memory PostgreSQL instance using PGlite. They exercise anonymous permissions, private memberships, author spoofing, server timestamps, content constraints, cross-circle replies, public reads, full-text search, author-only removal, rate limits, and deletion cascades. The GitHub Pages workflow runs these checks before building.

These checks do not validate hosted Supabase email delivery, Auth redirect configuration, PostgREST, or WebSocket connectivity. The two-account checks above must be completed against the configured project before announcing shared communication as active.

References: [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [email magic links](https://supabase.com/docs/guides/auth/auth-email-passwordless), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), and [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

# Intellect — a home for curious minds

[View the frontend preview](https://bruce12-glitch.github.io/intellect/) — backend services are not hosted on GitHub Pages.

A playful social reading frontend: discover your next book, explore thoughtful discussions, and give a finished book another chapter. Built with Next.js, TypeScript, and an original reading companion, Pip.

## Frontend preview

The Curiosity Club visual direction combines an illustrated reading world for Pip, an oversized editorial hero, dimensional book cards, and themed collections that open the matching catalog category.

- Responsive discovery, bookshop, reading circles, and personal bookshelf views.
- Search, category filters, price/discussion sorting, and detailed book previews.
- Saved books, daily goals and streaks, private reflections, nicknames, and draft resale listings persist on the current device.
- Accessible native dialogs, keyboard focus, reduced-motion behavior, and mobile navigation.
- Original mascot artwork, design tokens, and generation brief: [design notes](apps/web/design/BRAND.md).

Books, prices, inventory, and community activity are examples. Checkout, shared conversations, authentication, shipping, and live audio are not connected in this frontend preview. Book cover thumbnails come from Open Library.

GitHub Actions builds a static export of `apps/web` and deploys it to GitHub Pages. `GITHUB_PAGES=true` sets the `/intellect` asset prefix. The public URL uses GitHub’s default domain; no custom domain is required.

## Existing API prototype

The API and browser extension directories retain an earlier AI knowledge-base prototype. The documentation below describes that prototype; those services do not power the new social reading frontend.

## Earlier prototype features

- **Content Ingestion**: Save YouTube videos, podcasts, PDFs, articles, Wikipedia pages, recipes, TikToks, and notes
- **AI Summarization**: Instant summaries using GPT-4, Claude, or Gemini with key points extraction
- **Audio Summaries**: Listen to summaries in cloned voices (ElevenLabs, OpenAI TTS)
- **Auto-Organization**: Smart tagging and automatic connections between related content
- **Knowledge Graph**: Visualize your knowledge as an interactive graph
- **Multi-Model Chat**: Chat with your knowledge base using GPT, Claude, or Gemini
- **Spaced Repetition**: Automated quizzes with SM-2 algorithm for long-term retention
- **Browser Extensions**: Save content with one click from Chrome, Safari, Edge, Firefox
- **Mobile Apps**: iOS and Android apps for on-the-go access
- **Data Portability**: Export to Markdown, JSON, CSV, or PDF
- **Privacy-First**: Local-first augmented browsing, encrypted cloud storage

## Tech Stack

### Frontend (apps/web)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **State**: Zustand + TanStack Query
- **Auth**: NextAuth.js

### Backend (apps/api)
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Auth**: JWT with refresh tokens

### Shared Packages
- `@intellect/shared`: Types, validation schemas, utilities
- `@intellect/ui`: Shared React components

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- npm 10+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd intellect

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start database and Redis
docker-compose up -d

# Set up database
npm run db:generate
npm run db:push
npm run db:seed

# Start development servers
npm run dev
```

### Development

```bash
# Run all services
npm run dev

# Run only web
npm run dev:web

# Run only API
npm run dev:api

# Database operations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database

# Testing
npm run test         # Run all tests
npm run lint         # Lint all packages
```

## Project Structure

```
intellect/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── lib/         # Utilities
│   │   │   └── styles/      # Global styles
│   │   └── ...
│   └── api/                 # Fastify backend
│       ├── src/
│       │   ├── config/      # Configuration
│       │   ├── plugins/     # Fastify plugins
│       │   ├── routes/      # API routes
│       │   ├── services/    # Business logic
│       │   ├── utils/       # Utilities
│       │   └── index.ts     # Entry point
│       └── prisma/          # Database schema
├── packages/
│   ├── shared/              # Shared types & utilities
│   └── ui/                  # Shared React components
├── extensions/
│   └── browser/             # Browser extensions
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Content
- `GET /api/content` - List content items (paginated, filterable)
- `GET /api/content/:id` - Get single content item
- `POST /api/content` - Create content item
- `PATCH /api/content/:id` - Update content item
- `DELETE /api/content/:id` - Delete content item
- `GET /api/content/stats/overview` - Get content statistics

### Summaries
- `GET /api/summaries/content/:contentItemId` - Get summaries for content
- `POST /api/summaries` - Generate summary
- `POST /api/summaries/audio` - Generate audio summary
- `DELETE /api/summaries/:id` - Delete summary

### Chat
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations` - List conversations
- `GET /api/chat/conversations/:id` - Get conversation with messages
- `POST /api/chat/messages` - Send message
- `DELETE /api/chat/conversations/:id` - Delete conversation

### Quizzes
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes` - List quizzes
- `GET /api/quizzes/:id` - Get quiz
- `POST /api/quizzes/attempts` - Submit quiz attempt
- `GET /api/quizzes/reviews/due` - Get due reviews

### Tags
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag
- `PATCH /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag
- `POST /api/tags/merge` - Merge tags

### Connections
- `GET /api/connections/content/:contentItemId` - Get connections
- `POST /api/connections` - Create connection
- `POST /api/connections/auto-generate` - Auto-generate connections
- `DELETE /api/connections/:id` - Delete connection

### User
- `GET /api/user/profile` - Get profile
- `PATCH /api/user/profile` - Update profile
- `POST /api/user/change-password` - Change password
- `GET /api/user/voice-profiles` - List voice profiles
- `POST /api/user/voice-profiles` - Create voice profile
- `GET /api/user/stats` - Get usage stats

### Export/Import
- `POST /api/exports` - Create export job
- `GET /api/exports` - List exports
- `GET /api/exports/:id/download` - Download export
- `POST /api/imports` - Create import job

## Environment Variables

See `.env.example` for all required variables.

## Deployment

### Docker
```bash
# Build images
docker-compose build

# Run production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Vercel (Frontend)
Connect your repository to Vercel and configure environment variables.

### Railway/Render (Backend)
Deploy the API service with PostgreSQL and Redis add-ons.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Inspired by [Recall.it](https://recall.it)
- Built with modern web technologies
- Thanks to the open-source community

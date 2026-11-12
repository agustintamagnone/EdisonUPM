# EDISON UPM

EDISON UPM is a university startup and idea discovery platform for the Universidad Politécnica de Madrid (UPM). It gives students a place to publish ideas, receive feedback from peers and professors, and make promising projects visible to investors.

## Features

- Landing page introducing the EDISON UPM platform.
- Pitch Board for browsing university ideas and projects.
- Individual idea pages with project details.
- Publish flow for submitting a new idea.
- Responsive interface built around the EDISON UPM visual identity.
- Spring Boot API integration for ideas, feedback, bookmarks, and publication drafts.

## Technology

- [Next.js](https://nextjs.org/) 15 with the App Router
- React 19
- TypeScript
- Tailwind CSS
- PostCSS

## Getting started

### Prerequisites

- Node.js 18.18 or newer
- npm

### Installation

```bash
npm install
```

### Development

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

### Production build

```bash
npm run build
npm run start
```

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run the Next.js lint command |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | EDISON UPM landing page |
| `/pitch-board` | Browse published ideas |
| `/ideas/[ideaId]` | View an idea by its backend UUID |
| `/publish` | Publish an idea |
| `/my-ideas` | Open and manage your drafts, published ideas, and archived ideas |
| `/saved` | View and remove your bookmarks |

## Project structure

```text
src/
├── app/                 # App Router pages and global styles
├── components/          # Reusable layout and UI components
├── types/               # Shared TypeScript types
└── utils/               # API client, auth, and client-side hooks
public/assets/           # Logos, illustrations, and other static assets
```

## Backend integration

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` in `.env.local` and start the Spring Boot backend before running the frontend. Use `localhost` for both browser origins and keep the frontend origin in the backend CORS allowlist. The frontend sends the browser session cookie and obtains a CSRF token for authenticated writes.

The Pitch Board uses the backend's published-date order, zero-based pagination, text search, and single-tag filtering. Idea links use UUIDs. Students can save a draft in Basics, resume it from My Ideas, upload up to five screenshots, and publish after choosing visibility and feedback permissions.

The backend currently exposes no ratings, helpful votes, view counts, aggregate bookmark counts, or anonymous posting. Stage-based browsing, alternate sort orders, founder biographies, and school details also have no API fields or controls. The frontend uses the available development stage, visibility, founder role, and comment count. Previously browser-local demo content is no longer shown.

## Demonstrations and future backend contracts

The publishing wizard can demonstrate an anonymous author and a future reveal action. While the demo is active, actual publishing is blocked. Exit the demo to publish under your account name. Published idea pages offer a five-star input that resets when the page is reopened. These demonstrations use React state only and make no API requests.

The backend team would need to agree on routes and DTO fields before connecting either feature:

| Capability | Contract needed |
| --- | --- |
| Anonymous publication | An explicit, persisted preference accepted by the publication request, with named publication as the default for existing ideas and omitted values. Idea list and detail responses need a viewer-safe author representation that withholds identifiers, names, and emails from viewers who may not see the identity. The same policy needs to apply to saved-idea lists and other responses that could disclose the author. |
| Reveal identity | An authenticated, owner-only operation that changes an anonymous publication to named and returns the updated idea. Define whether revealing is permanent and ensure subsequent reads use the new author representation. |
| Create or update a rating | An authenticated, CSRF-protected operation for a visible, eligible idea that accepts an integer from 1 to 5. Define who may rate and enforce one rating per account per idea. An update should replace that account's rating and return the accepted value. |
| Read rating totals | An idea response or read operation that returns the real average and rating count, plus the signed-in viewer's rating when applicable. Define a zero count with no average and make visibility rules consistent with idea access. |

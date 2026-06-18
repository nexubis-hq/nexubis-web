# Nexubis Website

Marketing website for Nexubis, migrated from Webflow into a maintainable Next.js codebase.

## Stack

- Next.js App Router with TypeScript
- React
- Tailwind CSS
- ESLint
- Prettier
- Vercel for deployment

## Project Structure

```text
app/              Routes, layouts, metadata, and global styles
components/       Shared UI components
lib/              Helpers and shared utilities
public/           Static assets that should be served by Next.js
webflow-export/   Local-only Webflow export reference, not committed or deployed
```

The Webflow export is source material only. Do not copy it wholesale into the app. Rebuild pages as typed React components, moving only intentional assets into `public/` when needed.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Quality Checks

Run linting:

```bash
npm run lint
```

Run TypeScript checks:

```bash
npm run typecheck
```

Check formatting:

```bash
npm run format:check
```

Format files:

```bash
npm run format
```

## Deployment

This repository is connected to Vercel through GitHub. Pushes to `main` deploy automatically.

Manual production build check:

```bash
npm run build
```

Manual Vercel deployment, if needed:

```bash
vercel --prod
```

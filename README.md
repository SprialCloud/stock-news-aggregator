# Market Pulse

Stock-news aggregator built with Next.js App Router. It fetches the latest market news from Finnhub when `FINNHUB_API_KEY` is present and falls back to preview data when it is not.

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local` and add a PostgreSQL connection string and optional Finnhub key.
3. Run `npm install`, `npm run db:generate`, `npm run db:push`, then `npm run dev`.

## Deploy

Push this folder to GitHub and import it into Vercel. Add `DATABASE_URL` and `FINNHUB_API_KEY` under Vercel project environment variables. A hosted PostgreSQL provider such as Neon or Supabase works with the included Prisma schema.

Portfolio additions call `/api/portfolio` and persist to PostgreSQL. Until an authentication provider is added, this route deliberately uses one demo identity; replace `DEMO_EMAIL` with the signed-in user's identity when integrating Auth.js or Clerk.

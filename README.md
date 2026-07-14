# Market Pulse

Full-stack stock-news aggregator built with Next.js 16, Neon Auth, Prisma, and PostgreSQL. It fetches market news from Finnhub when `FINNHUB_API_KEY` is present and falls back to preview data when it is not.

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Add `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and a random `NEON_AUTH_COOKIE_SECRET` of at least 32 characters. `FINNHUB_API_KEY` is optional.
4. Run `npm install`, `npm run db:push`, and `npm run dev`.

The portfolio API requires a Neon Auth session. Each authenticated user receives a separate portfolio in PostgreSQL.

## Deploy

Import the GitHub repository into Vercel and configure these project environment variables for Production and Preview:

- `DATABASE_URL` (use Neon's pooled connection string for serverless deployments)
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `FINNHUB_API_KEY` (optional)

After Vercel assigns a public URL, add the exact origin (for example, `https://your-project.vercel.app`) under Neon Console → Auth → Configuration → Domains. Neon Auth only redirects to allowlisted production domains.

## Checks

- `npm test` validates portfolio input normalization.
- `npm run build` runs the production compilation and TypeScript checks.

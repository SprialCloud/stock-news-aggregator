# Market Pulse

Full-stack stock-news aggregator built with Next.js 16, Neon Auth, Prisma, and PostgreSQL. It fetches market news and US stock quotes from Finnhub when `FINNHUB_API_KEY` is present; news falls back to preview data when the key is not configured.

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Add `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEXT_PUBLIC_APP_URL`, and a random `NEON_AUTH_COOKIE_SECRET` of at least 32 characters. `FINNHUB_API_KEY` is optional. Use your public site origin for `NEXT_PUBLIC_APP_URL` (for example, `https://example.vercel.app`) so password-reset emails return to the app.
4. Run `npm install`, `npm run db:push`, and `npm run dev`.

The portfolio API requires a Neon Auth session. Each authenticated user receives a separate portfolio in PostgreSQL.
Buy trades increase share count and recalculate weighted average cost. Sell trades reduce the position, preserve the remaining average cost, calculate realized profit or loss, and are stored in the `Trade` table.

The main navigation contains four functional workspaces: personalized news in **For you**, live ETF and ticker data in **Markets**, a per-user persistent **Watchlist**, and a full **Portfolio** view with live valuation and trade history.

## Deploy

Import the GitHub repository into Vercel and configure these project environment variables for Production and Preview:

- `DATABASE_URL` (use Neon's pooled connection string for serverless deployments)
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `FINNHUB_API_KEY` (optional)

After Vercel assigns a public URL, add the exact origin (for example, `https://your-project.vercel.app`) under Neon Console → Auth → Configuration → Domains. Neon Auth only redirects to allowlisted production domains.

## Checks

- `npm test` validates portfolio input normalization.
- `npm run build` runs the production compilation and TypeScript checks.

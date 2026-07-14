"use client";

import { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth/client";

type News = { id: number; headline: string; summary: string; source: string; datetime: number; url: string; image?: string; related?: string };
type Holding = { symbol: string; companyName: string; shares: number; averageCost: number };

const trends = ["NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "META"];

export default function Home() {
  const [active, setActive] = useState("For you");
  const [search, setSearch] = useState("");
  const [news, setNews] = useState<News[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ symbol: "", companyName: "", shares: "", averageCost: "" });
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioMessage, setPortfolioMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: session, isPending: sessionPending } = authClient.useSession();

  useEffect(() => {
    fetch("/api/news").then((r) => r.json()).then((data) => setNews(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (sessionPending) return;
    if (!session) { setHoldings([]); return; }
    setPortfolioLoading(true);
    fetch("/api/portfolio").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setHoldings(data); else setPortfolioMessage(data.error || "Could not load your portfolio."); }).catch(() => setPortfolioMessage("Could not load your portfolio.")).finally(() => setPortfolioLoading(false));
  }, [session, sessionPending]);

  const shownNews = useMemo(() => news.filter((item) => {
    const q = search.toLowerCase();
    return !q || `${item.headline} ${item.related} ${item.source}`.toLowerCase().includes(q);
  }), [news, search]);

  async function addHolding(event: React.FormEvent) {
    event.preventDefault();
    if (!session) { window.location.href = "/auth/sign-in"; return; }
    if (!form.symbol || !form.shares || !form.averageCost) return;
    setSaving(true);
    setPortfolioMessage("");
    const holding = { symbol: form.symbol.toUpperCase(), companyName: form.companyName || form.symbol.toUpperCase(), shares: Number(form.shares), averageCost: Number(form.averageCost) };
    const response = await fetch("/api/portfolio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(holding) });
    const stored = await response.json();
    setSaving(false);
    if (!response.ok) { setPortfolioMessage(stored.error || "Could not save this holding."); return; }
    setHoldings((list) => [...list.filter((item) => item.symbol !== holding.symbol), stored]);
    setPortfolioMessage(`${holding.symbol} saved.`);
    setModal(false); setForm({ symbol: "", companyName: "", shares: "", averageCost: "" });
  }

  async function removeHolding(symbol: string) {
    setPortfolioMessage("");
    const response = await fetch(`/api/portfolio?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
    if (!response.ok) { const data = await response.json().catch(() => ({})); setPortfolioMessage(data.error || "Could not remove this holding."); return; }
    setHoldings((items) => items.filter((item) => item.symbol !== symbol));
    setPortfolioMessage(`${symbol} removed.`);
  }

  return <main>
    <header className="topbar">
      <a className="brand" href="#"><span>◒</span> market<span>pulse</span></a>
      <nav>{["For you", "Markets", "Watchlist", "Portfolio"].map((item) => <button key={item} onClick={() => setActive(item)} className={active === item ? "active" : ""}>{item}</button>)}</nav>
      <div className="header-actions"><label className="search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search news or stocks" /></label><SignedOut><a className="sign-in" href="/auth/sign-in">Sign in</a></SignedOut><SignedIn><UserButton size="icon" /></SignedIn></div>
    </header>

    <section className="hero"><div><p className="eyebrow">TUESDAY, JULY 14</p><h1>Good morning{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""} <span>↗</span></h1><p className="subtle">The market is moving. Here&apos;s what matters to your money today.</p></div><button className="outline" onClick={() => session ? setModal(true) : window.location.href = "/auth/sign-in"}>＋ Add holding</button></section>

    <div className="dashboard">
      <section className="feed"><div className="section-heading"><div><p className="eyebrow">LATEST INTELLIGENCE</p><h2>Top stories</h2></div><button className="text-button">Customize <span>›</span></button></div>
        {loading ? <div className="loading">Loading latest market news…</div> : shownNews.map((item, index) => <article className="news-card" key={item.id}><div className="news-content"><div className="meta"><span>{item.source}</span><i>•</i><time>{relativeTime(item.datetime)}</time>{item.related && <><i>•</i><b>{item.related.split(",")[0]}</b></>}</div><h3><a href={item.url} target="_blank" rel="noreferrer">{item.headline}</a></h3><p>{item.summary}</p><div className="article-footer"><button>♡ Save</button><button>↗ Share</button></div></div><div className={`article-art art-${index % 4}`}>{item.image ? <img src={item.image} alt="" /> : <span>{item.related?.split(",")[0] || "MARKET"}</span>}</div></article>)}
        {!loading && shownNews.length === 0 && <div className="loading">No stories found. Try a ticker like NVDA or AAPL.</div>}
      </section>
      <aside><section className="portfolio card"><div className="section-heading"><div><p className="eyebrow">YOUR PORTFOLIO</p><h2>Holdings</h2></div><button className="icon-button" onClick={() => session ? setModal(true) : window.location.href = "/auth/sign-in"}>＋</button></div><div className="portfolio-total"><span>Estimated cost basis</span><strong>${holdings.reduce((sum, h) => sum + h.shares * h.averageCost, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>{portfolioLoading && <p className="portfolio-empty">Loading holdings…</p>}{!sessionPending && !session && <a className="portfolio-empty" href="/auth/sign-in">Sign in to save your holdings →</a>}{!portfolioLoading && !sessionPending && session && holdings.length === 0 && <p className="portfolio-empty">No holdings yet. Add your first stock.</p>}{holdings.map((h) => <div className="holding" key={h.symbol}><div className="ticker-logo">{h.symbol.slice(0, 1)}</div><div><b>{h.symbol}</b><small>{h.shares} shares · ${h.averageCost.toFixed(2)}</small></div><button aria-label={`Remove ${h.symbol}`} onClick={() => removeHolding(h.symbol)}>×</button></div>)}{portfolioMessage && <p className="portfolio-message">{portfolioMessage}</p>}<button className="full-link" onClick={() => session ? setModal(true) : window.location.href = "/auth/sign-in"}>Manage portfolio <span>›</span></button></section>
      <section className="trending card"><p className="eyebrow">ON THE MOVE</p><h2>Trending tickers</h2>{trends.map((ticker, index) => <button className="trend" key={ticker} onClick={() => setSearch(ticker)}><span className="rank">0{index + 1}</span><b>{ticker}</b><span className={index === 2 || index === 4 ? "down" : "up"}>{index === 2 || index === 4 ? "↓" : "↑"} {([3.4, 1.8, 2.1, 0.9, 1.2, 2.7][index]).toFixed(1)}%</span></button>)}</section></aside>
    </div>
    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><form className="modal" onSubmit={addHolding} onMouseDown={(e) => e.stopPropagation()}><button type="button" className="close" onClick={() => setModal(false)}>×</button><p className="eyebrow">PORTFOLIO</p><h2>Add a holding</h2><label>Ticker<input required value={form.symbol} onChange={(e) => setForm({...form, symbol: e.target.value})} placeholder="e.g. NVDA" /></label><label>Company name <input value={form.companyName} onChange={(e) => setForm({...form, companyName: e.target.value})} placeholder="Optional" /></label><div className="form-row"><label>Shares<input required min="0" step="any" type="number" value={form.shares} onChange={(e) => setForm({...form, shares: e.target.value})} /></label><label>Avg. cost<input required min="0" step="any" type="number" value={form.averageCost} onChange={(e) => setForm({...form, averageCost: e.target.value})} /></label></div><button className="submit" disabled={saving}>{saving ? "Saving…" : "Add to portfolio"}</button></form></div>}
  </main>;
}

function relativeTime(timestamp: number) { const hours = Math.max(1, Math.floor((Date.now() - timestamp * 1000) / 3_600_000)); return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`; }

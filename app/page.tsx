"use client";

import { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@neondatabase/auth/react";
import {
  ArrowUpRight,
  Briefcase,
  CaretRight,
  ChartLineUp,
  CheckCircle,
  Eye,
  MagnifyingGlass,
  Moon,
  Newspaper,
  Plus,
  Pulse,
  Sun,
  X,
} from "@phosphor-icons/react";
import { authClient } from "@/lib/auth/client";
import type { StockQuote } from "@/lib/quotes";
import { TickerInput } from "@/app/components/ticker-input";

type Tab = "For you" | "Markets" | "Watchlist" | "Portfolio";
type TradeType = "BUY" | "SELL";
type News = { id: number; headline: string; summary: string; source: string; datetime: number; url: string; image?: string; related?: string };
type Holding = { symbol: string; companyName: string; shares: number; averageCost: number };
type Trade = { id: string; type: TradeType; symbol: string; shares: number; price: number; realizedPnL: number | null; createdAt: string };
type WatchlistItem = { id: string; symbol: string };

const tabs: Tab[] = ["For you", "Markets", "Watchlist", "Portfolio"];
const trendingSymbols = ["NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "META"];
const marketBenchmarks = [
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "DIA", name: "Dow Jones ETF" },
  { symbol: "IWM", name: "Russell 2000 ETF" },
];
const emptyTradeForm = { type: "BUY" as TradeType, symbol: "", companyName: "", shares: "", price: "" };

export default function Home() {
  const [active, setActive] = useState<Tab>("For you");
  const [search, setSearch] = useState("");
  const [news, setNews] = useState<News[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [newsLoading, setNewsLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState("Loading live quotes…");
  const [tradeModal, setTradeModal] = useState(false);
  const [tradeForm, setTradeForm] = useState(emptyTradeForm);
  const [sellAllHolding, setSellAllHolding] = useState<Holding | null>(null);
  const [tradeMessage, setTradeMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [watchlistSymbol, setWatchlistSymbol] = useState("");
  const [watchlistMessage, setWatchlistMessage] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { data: session, isPending: sessionPending } = authClient.useSession();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("marketpulse-theme");
    const nextTheme = storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    fetch("/api/news")
      .then((response) => response.json())
      .then((data) => setNews(Array.isArray(data) ? data : []))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

  useEffect(() => {
    if (sessionPending) return;
    if (!session) {
      setHoldings([]);
      setTrades([]);
      setWatchlist([]);
      return;
    }

    let activeRequest = true;
    setAccountLoading(true);
    Promise.all([
      fetch("/api/portfolio").then((response) => response.json()),
      fetch("/api/trades").then((response) => response.json()),
      fetch("/api/watchlist").then((response) => response.json()),
    ]).then(([holdingData, tradeData, watchlistData]) => {
      if (!activeRequest) return;
      setHoldings(Array.isArray(holdingData) ? holdingData : []);
      setTrades(Array.isArray(tradeData) ? tradeData : []);
      setWatchlist(Array.isArray(watchlistData) ? watchlistData : []);
    }).finally(() => {
      if (activeRequest) setAccountLoading(false);
    });

    return () => { activeRequest = false; };
  }, [session, sessionPending]);

  const quoteSymbols = useMemo(() => {
    const prioritized = [
      ...holdings.map((holding) => holding.symbol),
      ...watchlist.map((item) => item.symbol),
      ...marketBenchmarks.map((market) => market.symbol),
      ...trendingSymbols,
    ];
    return [...new Set(prioritized)].slice(0, 20).join(",");
  }, [holdings, watchlist]);

  useEffect(() => {
    let activeRequest = true;

    async function loadQuotes() {
      try {
        const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(quoteSymbols)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Live quotes unavailable.");
        if (!activeRequest) return;
        setQuotes(Object.fromEntries((data as StockQuote[]).map((quote) => [quote.symbol, quote])));
        setQuoteStatus(`Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      } catch {
        if (activeRequest) setQuoteStatus("Live quotes temporarily unavailable");
      }
    }

    loadQuotes();
    const refresh = window.setInterval(loadQuotes, 60_000);
    return () => { activeRequest = false; window.clearInterval(refresh); };
  }, [quoteSymbols]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4_000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const shownNews = useMemo(() => {
    const query = search.toLowerCase();
    return news.filter((item) => !query || `${item.headline} ${item.related} ${item.source}`.toLowerCase().includes(query));
  }, [news, search]);

  const personalSymbols = useMemo(
    () => new Set([...holdings.map((holding) => holding.symbol), ...watchlist.map((item) => item.symbol)]),
    [holdings, watchlist],
  );
  const personalizedNews = useMemo(() => {
    const ranked = [...shownNews].sort((first, second) => {
      const score = (item: News) => (item.related ?? "").split(",").filter((symbol) => personalSymbols.has(symbol)).length;
      return score(second) - score(first);
    });

    return search.trim() ? ranked : ranked.slice(0, 6);
  }, [shownNews, personalSymbols, search]);

  const costBasis = holdings.reduce((sum, holding) => sum + holding.shares * holding.averageCost, 0);
  const marketValue = holdings.reduce((sum, holding) => sum + holding.shares * (quotes[holding.symbol]?.current ?? holding.averageCost), 0);
  const unrealizedPnL = holdings.reduce((sum, holding) => {
    const quote = quotes[holding.symbol];
    return sum + (quote ? holding.shares * (quote.current - holding.averageCost) : 0);
  }, 0);

  function openTrade(type: TradeType = "BUY", symbol = "") {
    if (!session) { window.location.href = "/auth/sign-in"; return; }
    setSellAllHolding(null);
    setTradeForm({ ...emptyTradeForm, type, symbol });
    setTradeMessage("");
    setTradeModal(true);
  }

  function openSellAll(holding: Holding) {
    if (!session) { window.location.href = "/auth/sign-in"; return; }
    const latestPrice = quotes[holding.symbol]?.current ?? holding.averageCost;
    setSellAllHolding(holding);
    setTradeForm({
      type: "SELL",
      symbol: holding.symbol,
      companyName: holding.companyName,
      shares: String(holding.shares),
      price: String(latestPrice),
    });
    setTradeMessage("");
    setTradeModal(true);
  }

  function closeTradeModal() {
    if (saving) return;
    setTradeModal(false);
    setSellAllHolding(null);
    setTradeForm(emptyTradeForm);
    setTradeMessage("");
  }

  async function submitTrade(event: React.FormEvent) {
    event.preventDefault();
    if (!tradeForm.symbol || !tradeForm.shares || !tradeForm.price) return;
    setSaving(true);
    setTradeMessage("");
    const input = {
      type: tradeForm.type,
      symbol: tradeForm.symbol.toUpperCase(),
      companyName: tradeForm.companyName || tradeForm.symbol.toUpperCase(),
      shares: Number(tradeForm.shares),
      price: Number(tradeForm.price),
    };
    const response = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const stored = await response.json();
    setSaving(false);
    if (!response.ok) { setTradeMessage(stored.error || "Could not save this trade."); return; }

    setHoldings((items) => stored.holding
      ? [...items.filter((item) => item.symbol !== input.symbol), stored.holding]
      : items.filter((item) => item.symbol !== input.symbol));
    setTrades((items) => [stored.trade, ...items].slice(0, 50));
    setNotice(input.type === "BUY"
      ? `${input.symbol} purchase added. Total: ${stored.holding.shares} shares.`
      : sellAllHolding
        ? `${input.symbol} position closed. Realized P/L: ${formatSignedCurrency(Number(stored.realizedPnL))}.`
        : `${input.symbol} sale recorded. Realized P/L: ${formatSignedCurrency(Number(stored.realizedPnL))}.`);
    setTradeModal(false);
    setSellAllHolding(null);
    setTradeForm(emptyTradeForm);
  }

  async function addWatchlistItem(event: React.FormEvent) {
    event.preventDefault();
    if (!session) { window.location.href = "/auth/sign-in"; return; }
    setWatchlistMessage("");
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: watchlistSymbol }),
    });
    const stored = await response.json();
    if (!response.ok) { setWatchlistMessage(stored.error || "Could not add this ticker."); return; }
    setWatchlist((items) => [...items.filter((item) => item.symbol !== stored.symbol), stored]);
    setWatchlistSymbol("");
    setWatchlistMessage(`${stored.symbol} added to your watchlist.`);
  }

  async function removeWatchlistItem(symbol: string) {
    const response = await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
    if (!response.ok) { setWatchlistMessage("Could not remove this ticker."); return; }
    setWatchlist((items) => items.filter((item) => item.symbol !== symbol));
    setWatchlistMessage(`${symbol} removed from your watchlist.`);
  }

  function findTickerNews(symbol: string) {
    setSearch(symbol);
    setActive("For you");
  }

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("marketpulse-theme", nextTheme);
  }

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand brand-button" onClick={() => setActive("For you")} aria-label="Open For you">
        <span className="brand-mark"><Pulse size={18} weight="bold" /></span>
        <span className="brand-name">market<b>pulse</b></span>
      </button>
      <nav aria-label="Primary navigation">
        {tabs.map((tab) => <button key={tab} onClick={() => setActive(tab)} className={active === tab ? "active" : ""} aria-current={active === tab ? "page" : undefined}>{tab}</button>)}
      </nav>
      <div className="header-actions">
        <label className="search">
          <MagnifyingGlass size={17} aria-hidden="true" />
          <span className="sr-only">Search news or stocks</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search news or stocks" />
        </label>
        <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <SignedOut><a className="sign-in" href="/auth/sign-in">Sign in</a></SignedOut>
        <SignedIn><UserButton size="icon" /></SignedIn>
      </div>
    </header>

    {active === "For you" && <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{formatToday()}</p>
          <h1>Good morning{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}.</h1>
          <p className="subtle">Your market brief, shaped by what you follow.</p>
          <button className="primary-action" onClick={() => openTrade()}><Plus size={17} weight="bold" /> Buy / Sell</button>
        </div>
        <div className="hero-market" aria-label="Live market snapshot">
          <div className="hero-market-heading"><span>Market pulse</span><small>{quoteStatus}</small></div>
          {marketBenchmarks.slice(0, 3).map((market) => {
            const quote = quotes[market.symbol];
            return <button key={market.symbol} onClick={() => { setSelectedMarket(market.symbol); setActive("Markets"); }}>
              <span><b>{market.symbol}</b><small>{market.name}</small></span>
              <strong>{quote ? formatCurrency(quote.current) : "N/A"}</strong>
              <em className={!quote ? "flat" : quote.percentChange < 0 ? "down" : "up"}>{quote ? formatSignedPercent(quote.percentChange) : "Quote unavailable"}</em>
            </button>;
          })}
        </div>
      </section>
      <div className="dashboard">
        <NewsFeed title="Top stories for you" news={personalizedNews} loading={newsLoading} />
        <aside>
          <PortfolioSnapshot holdings={holdings} quotes={quotes} marketValue={marketValue} costBasis={costBasis} unrealizedPnL={unrealizedPnL} loading={accountLoading} signedIn={Boolean(session)} onOpenPortfolio={() => setActive("Portfolio")} onTrade={() => openTrade()} quoteStatus={quoteStatus} />
          <TrendingCard quotes={quotes} onSelect={findTickerNews} />
        </aside>
      </div>
    </>}

    {active === "Markets" && <>
      <PageBanner eyebrow="Market overview" title="Markets" subtitle={`${quoteStatus}. Quotes refresh every 60 seconds.`} />
      <div className="page-shell">
        <div className="market-grid">{marketBenchmarks.map((market) => <MarketCard key={market.symbol} {...market} quote={quotes[market.symbol]} onSelect={setSelectedMarket} />)}</div>
        {selectedMarket && <MarketDetail symbol={selectedMarket} name={marketBenchmarks.find((market) => market.symbol === selectedMarket)?.name ?? "US stock"} quote={quotes[selectedMarket]} news={shownNews} onClose={() => setSelectedMarket(null)} />}
        <div className="content-grid">
          <NewsFeed title="Market intelligence" news={shownNews} loading={newsLoading} />
          <aside><TrendingCard quotes={quotes} onSelect={setSelectedMarket} /></aside>
        </div>
      </div>
    </>}

    {active === "Watchlist" && <>
      <PageBanner eyebrow="Personal list" title="Watchlist" subtitle="Track live prices and daily moves for the companies that matter to you." />
      <div className="page-shell">
        {sessionPending ? <LoadingBlock label="Checking your account" /> : !session ? <SignInPanel message="Sign in to create a personal watchlist." /> : <>
          <form className="watchlist-form" onSubmit={addWatchlistItem}>
            <label className="watchlist-search-label"><span>Find a company</span><TickerInput value={watchlistSymbol} onChange={setWatchlistSymbol} placeholder="Search ticker or company" /></label>
            <button className="primary-action" type="submit"><Plus size={17} weight="bold" /> Add ticker</button>
          </form>
          {watchlistMessage && <p className="inline-message" role="status">{watchlistMessage}</p>}
          {accountLoading ? <LoadingBlock label="Loading watchlist" /> : watchlist.length === 0 ? <EmptyPanel title="Your watchlist is empty" message="Add a ticker above to start tracking live prices." /> : <div className="watchlist-grid">{watchlist.map((item) => <WatchlistCard key={item.id} item={item} quote={quotes[item.symbol]} onRemove={removeWatchlistItem} onNews={findTickerNews} />)}</div>}
        </>}
      </div>
    </>}

    {active === "Portfolio" && <>
      <PageBanner eyebrow="Account overview" title="Portfolio" subtitle="Live valuation, cost basis, performance and transaction history." action={<button className="primary-action" onClick={() => openTrade()}><Plus size={17} weight="bold" /> Buy / Sell</button>} />
      <div className="page-shell">
        {sessionPending ? <LoadingBlock label="Checking your account" /> : !session ? <SignInPanel message="Sign in to view and manage your portfolio." /> : <>
          <div className="metric-grid"><MetricCard label="Market value" value={formatCurrency(marketValue)} /><MetricCard label="Cost basis" value={formatCurrency(costBasis)} /><MetricCard label="Unrealized P/L" value={formatSignedCurrency(unrealizedPnL)} tone={unrealizedPnL < 0 ? "down" : "up"} /></div>
          <section className="data-card"><div className="data-heading"><div><h2>Holdings</h2><p>Live positions at the latest available price.</p></div><small>{quoteStatus}</small></div>{accountLoading ? <LoadingBlock label="Loading holdings" /> : holdings.length === 0 ? <EmptyPanel title="No holdings yet" message="Buy your first stock to start tracking portfolio performance." /> : <div className="data-table holdings-table"><div className="table-head"><span>Symbol</span><span>Shares / avg.</span><span>Current</span><span>Market value</span><span>Unrealized</span><span></span></div>{holdings.map((holding) => <HoldingRow key={holding.symbol} holding={holding} quote={quotes[holding.symbol]} onSellAll={() => openSellAll(holding)} />)}</div>}</section>
          <section className="data-card"><div className="data-heading"><div><h2>Trade history</h2><p>Your most recent portfolio activity.</p></div><small>Latest 50 trades</small></div>{trades.length === 0 ? <EmptyPanel title="No trades recorded" message="Your completed buys and sells will appear here." /> : <div className="data-table trades-table"><div className="table-head"><span>Type</span><span>Symbol</span><span>Shares</span><span>Price</span><span>Realized P/L</span><span>Date</span></div>{trades.map((trade) => <div className="table-row" key={trade.id}><span className={`trade-pill ${trade.type.toLowerCase()}`}>{trade.type}</span><b>{trade.symbol}</b><span>{trade.shares}</span><span>{formatCurrency(trade.price)}</span><span className={trade.realizedPnL == null ? "flat" : trade.realizedPnL < 0 ? "down" : "up"}>{trade.realizedPnL == null ? "N/A" : formatSignedCurrency(trade.realizedPnL)}</span><span>{formatTradeDate(trade.createdAt)}</span></div>)}</div>}</section>
        </>}
      </div>
    </>}

    {notice && <div className="toast" role="status"><CheckCircle size={18} weight="fill" />{notice}</div>}
    {tradeModal && <TradeModal form={tradeForm} setForm={setTradeForm} message={tradeMessage} saving={saving} sellAllHolding={sellAllHolding} onSubmit={submitTrade} onClose={closeTradeModal} />}
  </main>;
}

function NewsFeed({ title, news, loading }: { title: string; news: News[]; loading: boolean }) {
  return <section className="feed">
    <div className="section-heading"><div className="section-title"><span className="section-icon"><Newspaper size={19} /></span><h2>{title}</h2></div><small>{!loading ? `${news.length} stories` : "Updating"}</small></div>
    {loading ? <FeedSkeleton /> : news.map((item, index) => <article className="news-card" key={item.id}>
      <div className="news-content">
        <div className="meta"><span>{item.source}</span><time>{relativeTime(item.datetime)}</time>{item.related && <b>{item.related.split(",")[0]}</b>}</div>
        <h3><a href={item.url} target="_blank" rel="noreferrer">{cleanVisibleCopy(item.headline)}</a></h3>
        <p>{cleanVisibleCopy(item.summary)}</p>
        <div className="article-footer"><a href={item.url} target="_blank" rel="noreferrer">Read source <ArrowUpRight size={14} weight="bold" /></a></div>
      </div>
      <div className={`article-art art-${index % 4}`}>{item.image ? <img src={item.image} alt="" /> : <span>{item.related?.split(",")[0] || "MARKET"}</span>}</div>
    </article>)}
    {!loading && news.length === 0 && <EmptyPanel title="No stories found" message="Try searching for a ticker like NVDA or AAPL." />}
  </section>;
}

function PortfolioSnapshot(props: { holdings: Holding[]; quotes: Record<string, StockQuote>; marketValue: number; costBasis: number; unrealizedPnL: number; loading: boolean; signedIn: boolean; quoteStatus: string; onOpenPortfolio: () => void; onTrade: () => void }) {
  return <section className="portfolio card">
    <div className="section-heading"><div className="section-title"><span className="section-icon"><Briefcase size={19} /></span><h2>Portfolio</h2></div><button className="icon-button" onClick={props.onTrade} aria-label="Add a trade"><Plus size={18} weight="bold" /></button></div>
    <div className="portfolio-total"><span>Market value</span><strong>{formatCurrency(props.marketValue)}</strong></div>
    <div className="portfolio-stats"><span>Cost basis <b>{formatCurrency(props.costBasis)}</b></span><span>Unrealized P/L <b className={props.unrealizedPnL < 0 ? "down" : "up"}>{formatSignedCurrency(props.unrealizedPnL)}</b></span></div>
    {props.loading && <p className="portfolio-empty">Loading holdings...</p>}
    {!props.signedIn && <a className="portfolio-empty portfolio-signin" href="/auth/sign-in">Sign in to save your holdings <CaretRight size={15} /></a>}
    {!props.loading && props.signedIn && props.holdings.length === 0 && <p className="portfolio-empty">No holdings yet. Buy your first stock.</p>}
    {props.holdings.slice(0, 5).map((holding) => { const quote = props.quotes[holding.symbol]; return <div className="holding" key={holding.symbol}><div className="ticker-logo">{holding.symbol.slice(0, 1)}</div><div><b>{holding.symbol}</b><small><span>{holding.shares} shares</span><span>avg {formatCurrency(holding.averageCost)}</span></small></div><div className="holding-quote"><b>{quote ? formatCurrency(holding.shares * quote.current) : "N/A"}</b><small className={!quote ? "flat" : quote.percentChange < 0 ? "down" : "up"}>{quote ? formatSignedPercent(quote.percentChange) : "Quote unavailable"}</small></div></div>; })}
    <p className="quote-status"><span>{props.quoteStatus}</span><span>Refreshes every 60 seconds</span></p>
    <button className="full-link" onClick={props.onOpenPortfolio}>Open portfolio <CaretRight size={16} weight="bold" /></button>
  </section>;
}

function TrendingCard({ quotes, onSelect }: { quotes: Record<string, StockQuote>; onSelect: (symbol: string) => void }) {
  return <section className="trending card"><div className="section-heading"><div className="section-title"><span className="section-icon"><ChartLineUp size={19} /></span><h2>Trending</h2></div><small>Live</small></div>{trendingSymbols.map((ticker) => { const quote = quotes[ticker]; return <button className="trend" key={ticker} onClick={() => onSelect(ticker)}><b>{ticker}<small>{quote ? formatCurrency(quote.current) : "N/A"}</small></b><span className={!quote ? "flat" : quote.percentChange < 0 ? "down" : "up"}>{quote ? formatSignedPercent(quote.percentChange) : "N/A"}</span><CaretRight size={14} /></button>; })}</section>;
}

function MarketCard({ symbol, name, quote, onSelect }: { symbol: string; name: string; quote?: StockQuote; onSelect: (symbol: string) => void }) {
  return <button className="market-card" onClick={() => onSelect(symbol)}><div><span>{name}</span><b>{symbol}</b></div><strong>{quote ? formatCurrency(quote.current) : "N/A"}</strong><small className={!quote ? "flat" : quote.percentChange < 0 ? "down" : "up"}>{quote ? <><span>{formatSignedCurrency(quote.change)}</span><span>{formatSignedPercent(quote.percentChange)}</span></> : "Quote unavailable"}</small></button>;
}

function MarketDetail({ symbol, name, quote, news, onClose }: { symbol: string; name: string; quote?: StockQuote; news: News[]; onClose: () => void }) {
  const related = news.filter((item) => (item.related ?? "").split(",").includes(symbol)).slice(0, 3);
  const stories = related.length > 0 ? related : news.slice(0, 3);
  return <section className="market-detail"><div className="market-detail-header"><div><span className="context-label">Market detail</span><h2>{symbol}<small>{name}</small></h2></div><button className="icon-button" onClick={onClose} aria-label="Close market detail"><X size={18} /></button></div>{quote ? <><div className="market-detail-price"><strong>{formatCurrency(quote.current)}</strong><span className={quote.percentChange < 0 ? "down" : "up"}>{formatSignedCurrency(quote.change)} <b>{formatSignedPercent(quote.percentChange)}</b></span></div><div className="quote-metrics"><span>Open <b>{formatCurrency(quote.open)}</b></span><span>Previous close <b>{formatCurrency(quote.previousClose)}</b></span><span>Day low <b>{formatCurrency(quote.low)}</b></span><span>Day high <b>{formatCurrency(quote.high)}</b></span></div></> : <p className="loading">Live quote unavailable.</p>}<div className="detail-news"><h3>Related news</h3>{stories.length === 0 ? <p>No related stories available.</p> : stories.map((item) => <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><span>{item.source}</span><b>{cleanVisibleCopy(item.headline)}</b><ArrowUpRight size={14} /></a>)}</div></section>;
}

function WatchlistCard({ item, quote, onRemove, onNews }: { item: WatchlistItem; quote?: StockQuote; onRemove: (symbol: string) => void; onNews: (symbol: string) => void }) {
  return <article className="watchlist-card"><div className="watchlist-card-top"><div><span className="watching-label"><Eye size={15} /> Watching</span><h2>{item.symbol}</h2></div><button className="icon-button" aria-label={`Remove ${item.symbol}`} onClick={() => onRemove(item.symbol)}><X size={17} /></button></div><strong>{quote ? formatCurrency(quote.current) : "N/A"}</strong><p className={!quote ? "flat" : quote.percentChange < 0 ? "down" : "up"}>{quote ? <><span>{formatSignedCurrency(quote.change)} today</span><span>{formatSignedPercent(quote.percentChange)}</span></> : "Live quote unavailable"}</p>{quote && <div className="quote-range"><span>Day low <b>{formatCurrency(quote.low)}</b></span><span>Day high <b>{formatCurrency(quote.high)}</b></span></div>}<button className="text-button" onClick={() => onNews(item.symbol)}>View related news <CaretRight size={15} weight="bold" /></button></article>;
}

function HoldingRow({ holding, quote, onSellAll }: { holding: Holding; quote?: StockQuote; onSellAll: () => void }) {
  const value = quote ? holding.shares * quote.current : holding.shares * holding.averageCost;
  const pnl = quote ? holding.shares * (quote.current - holding.averageCost) : 0;
  return <div className="table-row"><b>{holding.symbol}</b><span>{holding.shares} / {formatCurrency(holding.averageCost)}</span><span>{quote ? formatCurrency(quote.current) : "N/A"}</span><span>{formatCurrency(value)}</span><span className={pnl < 0 ? "down" : "up"}>{quote ? formatSignedCurrency(pnl) : "N/A"}</span><button className="table-action" onClick={onSellAll} aria-label={`Sell all ${holding.symbol} shares`}>Sell all</button></div>;
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) { return <article className="metric-card"><span>{label}</span><strong className={tone}>{value}</strong></article>; }
function PageBanner({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) { return <section className="page-banner"><div><span className="context-label">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</section>; }
function SignInPanel({ message }: { message: string }) { return <section className="empty-panel"><h2>{message}</h2><p>Your portfolio and watchlist are private to your account.</p><a className="submit inline-submit" href="/auth/sign-in">Sign in</a></section>; }
function EmptyPanel({ title, message }: { title: string; message: string }) { return <section className="empty-panel compact"><h2>{title}</h2><p>{message}</p></section>; }

function LoadingBlock({ label }: { label: string }) { return <div className="loading" role="status"><span className="loading-bar" /><span>{label}...</span></div>; }

function FeedSkeleton() { return <div className="feed-skeleton" aria-label="Loading latest market news">{[0, 1, 2].map((item) => <div className="skeleton-row" key={item}><div><span /><b /><i /></div><em /></div>)}</div>; }

function TradeModal({ form, setForm, message, saving, sellAllHolding, onSubmit, onClose }: { form: typeof emptyTradeForm; setForm: React.Dispatch<React.SetStateAction<typeof emptyTradeForm>>; message: string; saving: boolean; sellAllHolding: Holding | null; onSubmit: (event: React.FormEvent) => void; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const estimatedProceeds = Number(form.shares) * Number(form.price);

  return <div className="modal-backdrop" onMouseDown={onClose}><form className={`modal ${sellAllHolding ? "sell-all-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="trade-title" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="icon-button close-button" onClick={onClose} aria-label="Close trade ticket" disabled={saving}><X size={18} /></button><span className="context-label">{sellAllHolding ? "Close position" : "Trade ticket"}</span><h2 id="trade-title">{sellAllHolding ? `Sell all ${sellAllHolding.symbol}` : form.type === "BUY" ? "Buy shares" : "Sell shares"}</h2>{sellAllHolding ? <><div className="sell-all-summary"><div className="sell-all-symbol"><div><b>{sellAllHolding.symbol}</b><span>{sellAllHolding.companyName}</span></div><em>All shares</em></div><dl><div><dt>Shares to sell</dt><dd>{sellAllHolding.shares}</dd></div><div><dt>Average cost</dt><dd>{formatCurrency(sellAllHolding.averageCost)}</dd></div><div><dt>Estimated proceeds</dt><dd>{Number.isFinite(estimatedProceeds) ? formatCurrency(estimatedProceeds) : "$0.00"}</dd></div></dl></div><label>Sale price<input required min="0.000001" step="any" type="number" inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><p className="sell-all-note">This sells your entire position. The price starts at the latest available quote and can be adjusted before confirming.</p></> : <><div className="trade-toggle"><button type="button" className={form.type === "BUY" ? "active" : ""} onClick={() => setForm({ ...form, type: "BUY" })}>Buy</button><button type="button" className={form.type === "SELL" ? "active sell" : ""} onClick={() => setForm({ ...form, type: "SELL" })}>Sell</button></div><label>Ticker<TickerInput value={form.symbol} onChange={(symbol) => setForm({ ...form, symbol })} /></label><label>Company name<input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} placeholder="Optional" /></label><div className="form-row"><label>Shares<input required min="0" step="any" type="number" value={form.shares} onChange={(event) => setForm({ ...form, shares: event.target.value })} /></label><label>{form.type === "BUY" ? "Purchase price" : "Sale price"}<input required min="0" step="any" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label></div></>}{message && <p className="trade-message" role="alert">{message}</p>}<button className={`submit ${form.type === "SELL" ? "sell" : ""}`} disabled={saving}>{saving ? "Saving..." : sellAllHolding ? `Sell all ${sellAllHolding.symbol}` : form.type === "BUY" ? "Buy shares" : "Sell shares"}</button></form></div>;
}

function relativeTime(timestamp: number) { const hours = Math.max(1, Math.floor((Date.now() - timestamp * 1000) / 3_600_000)); return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`; }
function formatToday() { return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase(); }
function formatCurrency(value: number) { return value.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatSignedCurrency(value: number) { return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`; }
function formatSignedPercent(value: number) { return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}%`; }
function formatTradeDate(value: string) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function cleanVisibleCopy(value: string) { return value.replace(/[–—]/g, "-"); }

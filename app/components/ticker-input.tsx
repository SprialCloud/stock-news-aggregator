"use client";

import { useEffect, useState } from "react";
import type { SymbolSuggestion } from "@/lib/symbols";

export function TickerInput({ value, onChange, placeholder = "Search ticker or company" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/symbols?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        const data = await response.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, value ? 250 : 0);

    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [value]);

  function selectSuggestion(suggestion: SymbolSuggestion) {
    onChange(suggestion.symbol);
    setOpen(false);
  }

  return <div className="ticker-input">
    <input required autoComplete="off" value={value} onChange={(event) => { onChange(event.target.value.toUpperCase()); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} placeholder={placeholder} aria-autocomplete="list" aria-expanded={open} />
    {open && <div className="ticker-suggestions" role="listbox">{loading ? <p>Searching...</p> : suggestions.length === 0 ? <p>No matching US stocks</p> : suggestions.map((suggestion) => <button type="button" role="option" key={suggestion.symbol} onMouseDown={(event) => { event.preventDefault(); selectSuggestion(suggestion); }}><b>{suggestion.symbol}</b><span>{suggestion.description}</span><small>{suggestion.type}</small></button>)}</div>}
  </div>;
}

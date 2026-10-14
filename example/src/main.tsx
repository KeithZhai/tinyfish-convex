import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { SearchArgs, SearchResponse, FetchArgs, FetchResponse } from "tinyfish-convex";
import { sampleSearch, sampleFetch } from "./samples";
import "./style.css";
function App() {
  const [mode, setMode] = useState<"sample" | "live">("live");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [query, setQuery] = useState("Convex components");
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [fetched, setFetched] = useState<FetchResponse | null>(null);
  const [busy, setBusy] = useState<"search" | "fetch" | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const [format, setFormat] = useState<"markdown" | "html" | "json">("markdown");
  const [tab, setTab] = useState<"content" | "json">("content");
  useEffect(() => {
    fetch("/api/local/status").then(r => r.json()).then(v => setConnected(v.available === true)).catch(() => setConnected(false));
  }, []);
  async function liveCall<T>(operation: "search" | "fetch", args: SearchArgs | FetchArgs): Promise<T> {
    const r = await fetch(`/api/local/${operation}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const result = await r.json();
    if (!r.ok) throw new Error(result.message || "Request failed");
    return result;
  }
  function changeMode(next: "sample" | "live") {
    setMode(next); setSearch(null); setFetched(null); setSelected([]); setError("");
  }
  async function runSearch(e: React.FormEvent) {
    e.preventDefault(); setBusy("search"); setError(""); setFetched(null); setSearch(null); setSelected([]);
    try {
      const result = mode === "sample" ? sampleSearch : await liveCall<SearchResponse>("search", { query, purpose: "Find sources to read in a Convex application" });
      setSearch(result); setSelected(result.results.slice(0, 3).map(r => r.url));
    } catch (e) { setError(e instanceof Error ? e.message : "Search failed"); }
    finally { setBusy(null); }
  }
  async function runFetch() {
    setBusy("fetch"); setError(""); setFetched(null);
    try {
      const result = mode === "sample" ? sampleFetch(selected) : await liveCall<FetchResponse>("fetch", { urls: selected, format, links: true, per_url_timeout_ms: 45000 });
      setFetched(result); setActive(0); setTab("content");
    } catch (e) { setError(e instanceof Error ? e.message : "Fetch failed"); }
    finally { setBusy(null); }
  }
  const page = fetched?.results[active];
  return <div className="shell">
    <header><a className="brand" href="https://www.tinyfish.ai"><img src="/tinyfish.svg" alt="TinyFish" /></a><span className="times">×</span><span className="convex">convex</span><span className="header-note">COMPONENT LAB / 01</span><a className="docs" href="https://docs.tinyfish.ai">API docs ↗</a></header>
    <main>
      <section className="hero"><div><div className="eyebrow"><span /> THE WEB, INSIDE YOUR APP</div><h1>Search to source.<br /><span>One clean flow.</span></h1><p>Find the right pages. Bring back the content.<br />TinyFish Search + Fetch, built for Convex actions.</p></div><aside className="code-card"><div className="code-top"><i /><i /><i /><span>convex/web.ts</span></div><pre><span className="lime">const</span> tf = <span className="lime">new</span> TinyFish(components.tinyfish);{"\n\n"}<span className="muted">// Find your sources</span>{"\n"}<span className="lime">const</span> sources = <span className="lime">await</span> tf.search(ctx, {"{"}{"\n"}  query: <span className="peach">"Convex components"</span>{"\n"}{"}"});{"\n\n"}<span className="muted">// Read the pages that matter</span>{"\n"}<span className="lime">const</span> pages = <span className="lime">await</span> tf.fetch(ctx, {"{"}{"\n"}  urls: sources.results.slice(0, 3){"\n"}    .map(source =&gt; source.url){"\n"}{"}"});</pre><div className="code-footer">TYPED ACTIONS <span>NO COMPONENT TABLES</span></div></aside></section>
      <div className="lab-heading"><h2>Try the workflow <span>↓</span></h2><div className="switch" aria-label="Demo mode"><button disabled={!!busy} aria-pressed={mode === "sample"} className={mode === "sample" ? "chosen" : ""} onClick={() => changeMode("sample")}>Sample</button><button disabled={!!busy} aria-pressed={mode === "live"} className={mode === "live" ? "chosen" : ""} onClick={() => changeMode("live")}>Live Convex</button></div></div>
      <div className="mode-note">{mode === "sample" ? "Illustrative fixtures. No API calls, no account required. The sample query is fixed." : connected ? "Connected to local Convex. Real TinyFish requests; your API key stays on the backend." : "Start the local Convex demo to make real TinyFish requests."}</div>
      {mode === "live" && connected !== true && <div className="setup-note"><strong>{connected === null ? "Checking your local backend…" : "Start your real Convex demo"}</strong><p>In the project folder, run:</p><code>npm run demo -- --use-cli-key</code><p>Or supply TINYFISH_API_KEY in your shell. This starts Convex and connects the page automatically. No keys or session tokens go in the browser.</p></div>}
      {error && <div role="alert" className="alert">{error}</div>}
      <div className="workspace"><section className="search-panel"><div className="panel-heading"><span className="step">01</span><h3>Find sources</h3><span className="tag">SEARCH</span></div><form onSubmit={runSearch}><label htmlFor="query">What are you looking for?</label><div className="search-box"><input id="query" disabled={!!busy} value={query} readOnly={mode === "sample"} onChange={e => setQuery(e.target.value)} /><button disabled={!!busy || !query.trim() || (mode === "live" && connected !== true)}>{busy === "search" ? "Searching…" : "Search ↗"}</button></div></form>
        {search ? <><div className="result-note">{search.results.length} sources for “{search.query}” · choose up to 10</div><div className="result-list">{search.results.map(r => <label className="result" key={r.url}><input type="checkbox" disabled={!!busy || (!selected.includes(r.url) && selected.length >= 10)} checked={selected.includes(r.url)} onChange={() => setSelected(selected.includes(r.url) ? selected.filter(u => u !== r.url) : [...selected, r.url])} /><div><span className="site">{r.site_name}</span><strong>{r.title}</strong><p>{r.snippet}</p><a href={r.url} target="_blank" rel="noreferrer">Open source ↗</a></div></label>)}</div>{mode === "live" && <label className="format-choice">Output format<select aria-label="Output format" disabled={!!busy} value={format} onChange={e => setFormat(e.target.value as typeof format)}><option value="markdown">Markdown</option><option value="html">HTML</option><option value="json">JSON document</option></select></label>}<button className="fetch-button" onClick={runFetch} disabled={!!busy || !selected.length}>{busy === "fetch" ? "Fetching content…" : `Fetch ${selected.length} selected ${selected.length === 1 ? "source" : "sources"} →`}</button></> : <div className="empty-small"><span>↗</span><p>Start with a search.<br />Choose the sources you want to read.</p></div>}
      </section><section className="content-panel"><div className="panel-heading"><span className="step">02</span><h3>Read the content</h3><span className="tag">FETCH</span></div>
        {fetched ? <><div className="fetch-summary"><span className="success">{fetched.results.length} fetched</span>{!!fetched.errors.length && <span className="failure">{fetched.errors.length} unavailable</span>}<div className="tabs"><button aria-pressed={tab === "content"} onClick={() => setTab("content")} className={tab === "content" ? "chosen" : ""}>Content</button><button aria-pressed={tab === "json"} onClick={() => setTab("json")} className={tab === "json" ? "chosen" : ""}>JSON</button></div></div>
          {tab === "json" ? <pre className="json">{JSON.stringify(fetched, null, 2)}</pre> : <>{!!fetched.results.length && <select aria-label="Fetched page" value={active} onChange={e => setActive(Number(e.target.value))}>{fetched.results.map((p, i) => <option value={i} key={p.url}>{p.title || p.url}</option>)}</select>}{page && <><a className="source-url" href={page.url} target="_blank" rel="noreferrer">{page.url} ↗</a><pre className="page-content">{typeof page.text === "string" ? page.text : JSON.stringify(page.text, null, 2)}</pre></>}{fetched.errors.map(e => <div className="partial-error" key={e.url}><strong>{e.error}{e.status ? ` · ${e.status}` : ""}</strong><span>{e.url}</span><p>The other sources are still available.</p></div>)}</>}
        </> : <div className="empty"><div className="paper">Aa<div /><div /><div /></div><h4>Your sources, ready to use.</h4><p>Clean content lands here after fetching.<br />A failed page won't erase the rest.</p><span>MARKDOWN / HTML / JSON</span></div>}
      </section></div>
      <div className="benefits"><div><span>01 / CLEAN INTERFACE</span><h4>Two primitives. Plenty of room.</h4><p>Use them from any Convex action.</p></div><div><span>02 / USEFUL DETAILS</span><h4>Extract what matters.</h4><p>Selectors, metadata, conditional requests.</p></div><div><span>03 / YOUR APPLICATION</span><h4>Keep control of your data.</h4><p>Your app decides what to save and who can call.</p></div></div>
    </main><footer><span>TinyFish × Convex</span><span>SEARCH THE WEB. BUILD SOMETHING USEFUL.</span><a href="https://docs.convex.dev/components/authoring">Component docs ↗</a></footer>
  </div>;
}
createRoot(document.getElementById("root")!).render(<App />);

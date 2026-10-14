import { describe, expect, it } from "vitest";
import { readableMarkdown } from "../src/component/lib/markdown.js";

const url = "https://example.com/docs/page";
describe("readable Markdown", () => {
  it("keeps inline code within its paragraph without escaping identifiers", () => {
    const text = readableMarkdown('<p>Use <code>TINYFISH_API_KEY</code> with <code>ctx.runAction</code>.</p>', url);
    expect(text).toBe('Use `TINYFISH_API_KEY` with `ctx.runAction`.');
    expect(text).not.toContain('```');
  });
  it("preserves code indentation, backslashes and entities", () => {
    const text = readableMarkdown('<pre><code class="language-ts">if (a &lt; b) {\n  const TINYFISH_API_KEY = /\\w+/;\n}</code></pre>', url);
    expect(text).toContain('if (a < b) {\n  const TINYFISH_API_KEY = /\\w+/;\n}');
    expect(text).toContain('```ts');
  });
  it("uses a longer fence when the code contains Markdown fences", () => {
    const text = readableMarkdown('<pre><code>example:\n```ts\nlet a = 1;\n```</code></pre>', url);
    expect(text).toContain('````\nexample:\n```ts');
  });
  it("retains product-table fields and data", () => {
    const text = readableMarkdown('<table><tr><th>Field</th><th>Value</th></tr><tr><td>UPC</td><td>a897fe39b1053632</td></tr><tr><td>Price</td><td>£51.77</td></tr></table>', url);
    expect(text).toContain('a897fe39b1053632');
    expect(text).toContain('£51.77');
    expect(text).toContain('|');
  });
  it("resolves relative citations and keeps unsafe-link text without its target", () => {
    const text = readableMarkdown('<a href="../source">Source</a><a href="javascript:alert(1)">Text</a>', url);
    expect(text).toContain('https://example.com/source');
    expect(text).toContain('Text');
    expect(text).not.toContain('javascript:');
  });
  it("preserves raw Markdown exactly instead of re-escaping code", () => {
    const md = '# Guide\n\n```ts\nconst API_KEY = "test";\n```\n';
    expect(readableMarkdown(`<pre><code>${md}</code></pre>`, 'https://example.com/README.md')).toBe(md);
  });
  it("preserves unwrapped raw Markdown returned by the HTML endpoint", () => {
    const md = '# Guide\n\n```ts\nconst API_KEY = "test";\n```\n';
    expect(readableMarkdown(md, 'https://example.com/README.md')).toBe(md);
  });
  it("fences bare multiline pre blocks and rejoins inline symbols into prose", () => {
    const text = readableMarkdown('<p>Use</p><pre>API_KEY</pre><p>to authenticate.</p><pre>if (a) {\n  run();\n}</pre>', url);
    expect(text).toContain('Use `API_KEY` to authenticate.');
    expect(text).toContain('```\nif (a) {\n  run();\n}\n```');
  });
  it("does not mistake a normal HTML page ending in .md for a raw file", () => {
    const text = readableMarkdown('<h1>Guide</h1><p>Details</p><pre><code>const a = 1;</code></pre>', 'https://example.com/page.md');
    expect(text).toContain('# Guide');
    expect(text).toContain('Details');
  });
  it("removes script and style text without running or fetching anything", () => {
    expect(readableMarkdown('<script>throw Error("RUN")</script><style>.bad {}</style><p>Useful</p>', url)).toBe('Useful');
  });
});

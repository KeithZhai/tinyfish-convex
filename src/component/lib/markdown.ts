import { NodeHtmlMarkdown } from "node-html-markdown";
import { parse } from "node-html-parser";

/** Parse text only: no scripts are run and no linked resources are requested. */
export function readableMarkdown(html: string, sourceUrl: string): string {
  const markdownFile = /\.(md|markdown)$/i.test(new URL(sourceUrl).pathname);
  // TinyFish returns raw document text even when format=html was requested.
  if (markdownFile && !/^\s*</.test(html)) return html;
  const root = parse(html, { blockTextElements: { script: true, style: true, noscript: true } });
  for (const node of root.querySelectorAll("script,style,noscript")) node.remove();
  const pre = root.querySelectorAll("pre");
  // A raw Markdown file is already Markdown. Preserve its code and indentation.
  if (markdownFile && pre.length === 1 && root.text.trim() === pre[0].text.trim()) {
    return pre[0].text;
  }
  const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // The provider emits bare <pre> for both block code and inline symbols.
  // Keep multiline code fenced and single-line symbols inline.
  for (const node of pre) {
    const text = node.text;
    if (!text.trim().includes("\n")) node.replaceWith(`<code>${escapeHtml(text.trim())}</code>`);
    else {
      const language = node.querySelector("code")?.getAttribute("class")?.match(/language-([\w-]+)/)?.[1];
      node.innerHTML = `<code${language ? ` class="language-${language}"` : ""}>${escapeHtml(text)}</code>`;
    }
  }
  // Rejoin prose that the upstream HTML serializer split around inline code.
  for (const code of root.querySelectorAll("code")) {
    const before = code.previousElementSibling, after = code.nextElementSibling;
    if (code.parentNode?.tagName !== "PRE" && before?.tagName === "P" && after?.tagName === "P") {
      before.innerHTML += ` ${code.outerHTML} ${after.innerHTML}`;
      code.remove(); after.remove();
    }
  }
  for (const anchor of root.querySelectorAll("a[href]")) {
    try {
      const link = new URL(anchor.getAttribute("href")!, sourceUrl);
      if (["http:", "https:", "mailto:"].includes(link.protocol)) anchor.setAttribute("href", link.href);
      else anchor.removeAttribute("href");
    } catch { anchor.removeAttribute("href"); }
  }
  const longestFence = root.querySelectorAll("pre").reduce((max, node) => {
    for (const match of node.text.matchAll(/`+/g)) max = Math.max(max, match[0].length);
    return max;
  }, 0);
  return NodeHtmlMarkdown.translate(root.toString(), {
    codeFence: "`".repeat(Math.max(3, longestFence + 1)),
    bulletMarker: "-", preferNativeParser: false,
  });
}

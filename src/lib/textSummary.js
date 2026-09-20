/**
 * A plain-text summary of an HTML (or plain) string, for a meta description
 * or a link preview. Cut on a word boundary with an ellipsis.
 *
 * Shared by the browser (the blog post page's description) and the server
 * (api/blog-page.js, which writes the same text into the HTML that link
 * previews read), so the two never disagree.
 */
const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'" };

export function summarize(html, max = 155) {
  const text = String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39|#x27);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,.;:–—-]+$/, '')}…`;
}

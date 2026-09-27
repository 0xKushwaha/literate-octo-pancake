/**
 * User agents that read a page's raw HTML for a link preview or an index, and
 * so get pages from api/blog-page.js (articles) and api/page.js (everything
 * else) with the right title, description and picture in the tags. Everyone
 * else gets the static app shell exactly as before. Matched by Vercel's router (see scripts/gen-headers.js),
 * so it is written without flags: the case variants are spelled out.
 */
export const CRAWLER_UA =
  '.*(bot|Bot|BOT|crawler|Crawler|spider|Spider|facebookexternalhit|facebookcatalog|WhatsApp|Slack|Discord|Telegram|Pinterest|Embedly|Iframely|Skype|LinkedIn|Twitter|redditbot|Applebot|Google-InspectionTool|Bytespider|Preview|preview).*';

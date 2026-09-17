/**
 * POST /api/csp-report — where browsers send Content-Security-Policy
 * violation reports (see `report-uri` in security.config.js).
 *
 * Anyone can post here, so it is built to be cheap to abuse: a small body cap,
 * no database, only a few named fields logged (never the raw body), and a
 * 1-in-N sample once the reports stop looking rare. Read the output in Vercel
 * → Logs, filtered on "csp-violation".
 */

const MAX_BODY_BYTES = 8 * 1024;
const SAMPLE_EVERY = 10;
let seen = 0;

const clip = (v, n = 300) => (typeof v === 'string' ? v.slice(0, n) : undefined);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return res.status(413).end();

  try {
    let report = req.body;
    if (!report || typeof report !== 'object') {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > MAX_BODY_BYTES) return res.status(413).end();
      }
      report = JSON.parse(raw || '{}');
    }
    const r = report['csp-report'] || report.body || report;

    seen += 1;
    if (seen <= 20 || seen % SAMPLE_EVERY === 0) {
      console.warn(
        'csp-violation',
        JSON.stringify({
          page: clip(r['document-uri'] || r.documentURL),
          directive: clip(r['violated-directive'] || r.effectiveDirective, 80),
          blocked: clip(r['blocked-uri'] || r.blockedURL),
          source: clip(r['source-file'] || r.sourceFile),
          line: Number(r['line-number'] || r.lineNumber) || undefined,
        }),
      );
    }
  } catch {
    // A malformed report is not worth an error response.
  }
  return res.status(204).end();
}

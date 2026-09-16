export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  // Parse the report. In a real system, you might forward this to Sentry, 
  // Datadog, or your own monitoring endpoint.
  try {
    let body = '';
    for await (const chunk of req) body += chunk;
    const report = JSON.parse(body);
    
    // Log it so you can see it in Vercel's function logs
    console.warn('CSP Violation Report:', JSON.stringify(report, null, 2));
  } catch (err) {
    // Ignore parsing errors for reports
  }

  // Always return 204 No Content for reports
  return res.status(204).end();
}

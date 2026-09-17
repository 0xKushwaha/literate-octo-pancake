import { createHash } from 'node:crypto';
import { brand, faqs } from './src/data/site.js';

export const SITE_URL = 'https://www.zehnspaces.com';

/**
 * Every address the app answers. vercel.json rewrites exactly these to the
 * app (anything else is a real 404), and the sitemap lists the public ones.
 * Keep in step with the router in src/main.jsx.
 */
export const APP_ROUTES = [
  '/',
  '/services',
  '/how-it-works',
  '/therapists',
  '/pricing',
  '/resources',
  '/breathe',
  '/blog',
  '/blog/:slug',
  '/privacy',
  '/terms',
  '/admin',
  '/admin/:path*',
];

/** Pages worth listing for search engines (switched-off pages left out). */
export const SITEMAP_ROUTES = ['/', '/services', '/how-it-works', '/resources', '/breathe', '/blog', '/privacy', '/terms'];

export const meta = {
  title: `${brand.name} — Therapy that meets you where you are`,
  description:
    `${brand.name} is a therapy practice in India. Talk to a therapist, try free guided breathing exercises and articles, and join a supportive community.`,
  ogImage: `${SITE_URL}/og.png`,
};

/**
 * Structured data for search engines, as one @graph.
 *
 * Only what is true of the practice today: its name, site, contact email and
 * the questions answered on the site. The earlier version listed a street
 * address, opening hours, prices and six clinicians from the sample content;
 * search engines show that data to people, so it stays out until it is real.
 */
export function buildJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MedicalBusiness',
        '@id': `${SITE_URL}/#practice`,
        name: brand.name,
        url: SITE_URL,
        description: meta.description,
        email: brand.email,
        areaServed: { '@type': 'Country', name: 'India' },
        medicalSpecialty: 'Psychiatric',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: brand.name,
        publisher: { '@id': `${SITE_URL}/#practice` },
        inLanguage: 'en-IN',
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };
}

/** Exact string that goes in the tag — the CSP hash must cover this byte-for-byte. */
export const jsonLdString = JSON.stringify(buildJsonLd());

export const jsonLdHash = `'sha256-${createHash('sha256').update(jsonLdString, 'utf8').digest('base64')}'`;

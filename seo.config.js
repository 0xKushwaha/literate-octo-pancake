import { createHash } from 'node:crypto';
import { brand, faqs, plans, services, therapists } from './src/data/site.js';

export const SITE_URL = 'https://www.zehnspaces.com';

export const meta = {
  title: 'zehnspaces — Therapy that meets you where you are',
  description:
    'A modern therapy practice. Licensed clinicians matched to you by a human in under a day, video, phone or in person, and a first session this week. San Francisco and telehealth in 14 states.',
  ogImage: `${SITE_URL}/og.png`,
};

/**
 * Structured data, generated from src/data/site.js so the schema can never
 * drift from the copy on the page. Emitted as one @graph rather than several
 * script tags — fewer nodes to hash for the CSP, and easier for crawlers to
 * resolve the @id references between practice, clinicians and services.
 */
export function buildJsonLd() {
  const [street, city, stateZip] = brand.address.split(', ');
  const [region, postalCode] = (stateZip ?? '').split(' ');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['MedicalBusiness', 'Psychologist'],
        '@id': `${SITE_URL}/#practice`,
        name: `${brand.name} Therapy`,
        url: SITE_URL,
        description: meta.description,
        telephone: brand.phone,
        email: brand.email,
        priceRange: `$${Math.min(...plans.map((p) => p.price))}–$${Math.max(...services.map((s) => s.price))}`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: street,
          addressLocality: city,
          addressRegion: region,
          postalCode,
          addressCountry: 'US',
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '08:00',
            closes: '18:00',
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: 'Saturday',
            opens: '08:00',
            closes: '12:00',
          },
        ],
        medicalSpecialty: 'Psychiatric',
        availableService: services.map((s) => ({
          '@type': 'MedicalTherapy',
          name: s.name,
          description: s.blurb,
        })),
        employee: therapists.map((t) => ({ '@id': `${SITE_URL}/#${t.id}` })),
      },
      ...therapists.map((t) => ({
        '@type': t.credentials.includes('MD') ? 'Physician' : 'Person',
        '@id': `${SITE_URL}/#${t.id}`,
        name: t.name,
        jobTitle: t.credentials,
        description: t.bio,
        knowsLanguage: t.languages,
        worksFor: { '@id': `${SITE_URL}/#practice` },
      })),
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

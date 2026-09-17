/**
 * Starting text for /privacy and /terms, written for a practice in India and
 * for what this website actually does (see api/ and database/migrations/).
 *
 * It is a plain-language starting point, not legal advice. Have a lawyer read
 * it before relying on it, and edit it in Admin → Site content → Legal pages.
 * {name}, {email} and {updated} are filled in on the page.
 */

export const PRIVACY_UPDATED = '17 September 2026';

export const PRIVACY_BODY = `## Who we are
{name} ("we", "us") runs this website. This notice explains what personal data the website collects, why, who can see it and what you can ask us to do with it. It is written with India's Digital Personal Data Protection Act, 2023 in mind.

## What we collect
- If you join our community: your email address and the page of the site you joined from.
- If you ask for a session (when that form is open): your name, email address, phone number if you give one, your preferences (how and when you would like to meet) and anything you choose to write in the notes box. Notes can include health information, so please share only what you are comfortable sharing.
- To stop spam: a scrambled, one-way code made from your internet (IP) address. It cannot be turned back into the address, and we do not store the address itself.
- If you are staff signing in to the admin area: the login details needed to keep that area secure.

We do not use advertising or tracking cookies, and we never sell your data.

## Why we use it
- To send you the community invite, and the new link if it ever changes.
- To contact you about a session you asked for.
- To keep the website safe from spam and abuse.

We use your data only for these purposes, and only with the consent you give when you submit a form.

## Who can see it
Only authorised {name} staff, through a password-protected admin area. The website is hosted by Vercel and the database by Supabase, who store the data on our behalf and may do so outside India. Videos on the site are embedded from YouTube in its privacy-enhanced mode, and our community is hosted on Discord; their own privacy policies apply when you use them.

## How long we keep it
- Community emails: until you ask us to remove yours.
- Session requests: for as long as we need them to respond to you and to meet our legal and professional record-keeping duties, and then we delete them.
- Spam-protection codes: kept with the form they came with, and deleted with it.

## Your rights
You can ask us to show you the data we hold about you, correct it, or delete it, and you can withdraw your consent at any time. Write to {email}. Withdrawing consent does not undo anything done before you withdrew it. You can also name someone to act for you if you are unable to.

## Grievances
If you have a concern about how we handle your data, email {email} with the subject "Privacy" and we will respond as quickly as we can. If you are not satisfied with our answer, you can complain to the Data Protection Board of India.

## In a crisis
This website is not an emergency service. If you need help now, call Tele-MANAS on 14416 (free, 24 hours a day), or 112 if someone is in immediate danger.

## Changes to this notice
If we change this notice we will update it here and change the date at the top.`;

export const TERMS_UPDATED = '17 September 2026';

export const TERMS_BODY = `## About these terms
These terms apply to your use of the {name} website. By using the website you agree to them. If you do not agree, please do not use it.

## Not medical advice, not an emergency service
Articles, videos and breathing exercises on this website are general information. They are not a diagnosis or a substitute for care from a qualified professional. If you are in crisis, call Tele-MANAS on 14416 (free, 24 hours a day), or 112 if someone is in immediate danger.

## Using the website
- Please give accurate details when you fill in a form.
- Do not try to break, overload or get around the security of the website, or to access any part of it you are not meant to.
- Do not use the website to send spam or anything unlawful.

We may block access for anyone who does.

## Our content
The text, design and pictures on this website belong to {name} or are used with permission. You may read and share them for personal use with a link back to us; please ask before using them in any other way.

## Our community
Our community is hosted on Discord and moderated by our team. Discord's own terms apply there. We may remove anyone who is abusive or unsafe towards others. The community is peer support and is not therapy.

## Other websites
Links to other websites are for convenience. We are not responsible for their content or their privacy practices.

## Liability
We work to keep the website accurate and available, but we cannot promise it will always be either. To the extent the law allows, we are not liable for any loss that comes from using the website.

## Governing law
These terms are governed by the laws of India.

## Contact
Questions about these terms: {email}.

## Changes to these terms
If we change these terms we will update them here and change the date at the top.`;

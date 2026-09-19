/**
 * Production stand-in for demoData.js (see the alias in vite.config.js).
 * Demo mode cannot run in a production build, so nothing here is ever called;
 * every method exists only to keep the imports valid, and answers null.
 */
const empty = new Proxy({}, { get: () => () => null });

export const demoArticles = empty;
export const demoExercises = empty;
export const demoVideos = empty;
export const demoInfographics = empty;
export const demoFaqs = empty;
export const demoBookings = empty;
export const demoSiteContent = empty;

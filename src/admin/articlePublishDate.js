/**
 * Works out the `published_at` that has to travel with an article save.
 *
 * `articles` carries CHECK (is_published = FALSE OR published_at IS NOT NULL),
 * and saving goes through an upsert. Postgres validates the proposed row as an
 * INSERT even when it ends up resolving to an update, so a payload that sets
 * is_published: true while leaving published_at out fails the check outright —
 * which is why editing an already-published article used to error with
 * "violates check constraint published_has_date" while creating one and
 * deleting one were fine.
 *
 * The rules:
 *  - Publishing something that has never been published stamps it now.
 *  - Re-publishing keeps the original date, so editing an old article does not
 *    shove it back to the top of the list as though it were new.
 *  - Unpublishing keeps the date too, so publishing again restores the day it
 *    first went out. The check is satisfied either way once is_published is
 *    false.
 *
 * @param {{ isPublished: boolean, existing: string|null, now?: () => string }} args
 * @returns {string|null} the value to send as `published_at`
 */
export function publishedAtFor({ isPublished, existing, now = () => new Date().toISOString() }) {
  if (!isPublished) return existing ?? null;
  return existing ?? now();
}

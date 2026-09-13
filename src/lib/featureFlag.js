/**
 * How a switch in Site content → Show & hide reads.
 *
 * Its own module, with no imports, because both `features.js` and
 * `booking.jsx` need it and `features.js` already imports `booking.jsx` —
 * putting it in either one makes a cycle.
 *
 * Anything that is not the literal word "off" is on. Values are stored as
 * "on"/"off" rather than as a boolean because an empty stored value means
 * "fall back to the default" throughout this CMS: a switch turned off and
 * saved as "" would come back on.
 */
export const isFeatureOn = (value) => String(value ?? '').trim().toLowerCase() !== 'off';

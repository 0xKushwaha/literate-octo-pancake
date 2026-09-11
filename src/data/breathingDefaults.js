/**
 * Built-in breathing exercises.
 *
 * The Breathing section used to render only what came back from Supabase, and
 * hid itself entirely when that returned nothing — so an unrun migration, an
 * RLS mistake or a dropped connection all looked identical to "this section
 * does not exist". These mirror the seed rows in
 * database/migrations/004_lumen_cms.sql, so the section always has something to
 * show and the database becomes an override rather than a prerequisite.
 *
 * Same pattern as the FAQ section, which has fallen back to src/data/site.js
 * from the start.
 */
export const breathingDefaults = [
  {
    id: 'static-box',
    name: 'Box Breathing',
    slug: 'box-breathing',
    description:
      'Equal-count breathing used by Navy SEALs and first responders to reset the nervous system quickly.',
    technique: 'box',
    inhale_sec: 4,
    hold_in_sec: 4,
    exhale_sec: 4,
    hold_out_sec: 4,
    cycles: 4,
    benefits: ['Reduces stress', 'Improves focus', 'Calms anxiety'],
    suitable_for: ['anxiety', 'focus', 'stress'],
    difficulty: 'beginner',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'static-478',
    name: '4-7-8 Technique',
    slug: '4-7-8',
    description:
      'Developed by Dr. Andrew Weil. The extended exhale activates the parasympathetic nervous system for deep calm.',
    technique: '4-7-8',
    inhale_sec: 4,
    hold_in_sec: 7,
    exhale_sec: 8,
    hold_out_sec: 0,
    cycles: 4,
    benefits: ['Promotes sleep', 'Reduces anxiety', 'Lowers heart rate'],
    suitable_for: ['sleep', 'anxiety', 'relaxation'],
    difficulty: 'beginner',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'static-triangle',
    name: 'Triangle Breathing',
    slug: 'triangle-breathing',
    description:
      'A gentle three-phase pattern ideal for beginners and those with anxiety around breath-holding.',
    technique: 'triangle',
    inhale_sec: 4,
    hold_in_sec: 4,
    exhale_sec: 4,
    hold_out_sec: 0,
    cycles: 6,
    benefits: ['Gentle on beginners', 'Reduces tension', 'Grounding'],
    suitable_for: ['anxiety', 'grounding', 'beginners'],
    difficulty: 'beginner',
    is_active: true,
    sort_order: 3,
  },
];

export default breathingDefaults;

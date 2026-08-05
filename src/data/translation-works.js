/**
 * The Translations catalogue — the single source of naming truth.
 *
 * Every title here is what the reader sees on the listing pages AND what
 * the breadcrumb shows on the reading pages: a part's breadcrumb title is
 * exactly its title on the work's landing page, and the breadcrumb parent
 * is exactly the work's title as the translations index prints it. Change
 * a name here and it changes everywhere at once.
 */
export const translationWorks = [
  {
    slug: 'metamorphoses',
    title: 'অভিডের মেটামর্ফোসিজ',
    parts: [
      { slug: 'book-i', title: 'প্রথম বই' },
    ],
  },
  {
    slug: 'divine-comedy',
    title: 'দান্তের ডিভাইন কমেডি',
    // canticle labels as the landing page prints them; cantos are numbered
    canticles: [
      { slug: 'inferno',    title: 'দোজখ' },
      { slug: 'purgatorio', title: 'আরাফ' },
      { slug: 'paradiso',   title: 'বেহেশ্ত' },
    ],
  },
  {
    slug: 'divan',
    title: 'হাফিজের দিওয়ান',
    parts: [
      { slug: 'prathama', title: 'প্রথমা: গজল ১ থেকে ৩৩' },
    ],
  },
];

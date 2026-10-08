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
      { slug: 'dvitiya',  title: 'দ্বিতীয়া: গজল ৩৪ থেকে ৩৬' },
    ],
  },
  {
    slug: 'sonnets',
    title: 'শেকস্পিয়ারের সনেটধারা',
    // the four watches of the day the author sorted the 154 sonnets into
    parts: [
      { slug: 'usha',    title: 'ঊষা: সনেট ১ থেকে ৩৮',      from: 1,   to: 38 },
      { slug: 'diba',    title: 'দিবা: সনেট ৩৯ থেকে ৭৭',    from: 39,  to: 77 },
      { slug: 'sandhya', title: 'সন্ধ্যা: সনেট ৭৮ থেকে ১১৫', from: 78,  to: 115 },
      { slug: 'nisha',   title: 'নিশা: সনেট ১১৬ থেকে ১৫৪',  from: 116, to: 154 },
    ],
  },
];

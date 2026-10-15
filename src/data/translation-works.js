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
    slug: 'odyssey',
    title: 'হোমারের ওডিসি',
    parts: [
      { slug: 'book-i', title: 'প্রথম বই' },
      { slug: 'book-ii', title: 'দ্বিতীয় বই' },
      { slug: 'book-iii', title: 'তৃতীয় বই' },
      { slug: 'book-iv', title: 'চতুর্থ বই' },
      { slug: 'book-v', title: 'পঞ্চম বই' },
      { slug: 'book-vi', title: 'ষষ্ঠ বই' },
      { slug: 'book-vii', title: 'সপ্তম বই' },
      { slug: 'book-viii', title: 'অষ্টম বই' },
      { slug: 'book-ix', title: 'নবম বই' },
      { slug: 'book-x', title: 'দশম বই' },
      { slug: 'book-xi', title: 'এগারোতম বই' },
      { slug: 'book-xii', title: 'বারোতম বই' },
      { slug: 'book-xiii', title: 'তেরোতম বই' },
      { slug: 'book-xiv', title: 'চৌদ্দতম বই' },
      { slug: 'book-xv', title: 'পনেরোতম বই' },
      { slug: 'book-xvi', title: 'ষোলোতম বই' },
      { slug: 'book-xvii', title: 'সতেরোতম বই' },
      { slug: 'book-xviii', title: 'আঠারোতম বই' },
      { slug: 'book-xix', title: 'উনিশতম বই' },
      { slug: 'book-xx', title: 'বিশতম বই' },
      { slug: 'book-xxi', title: 'একুশতম বই' },
      { slug: 'book-xxii', title: 'বাইশতম বই' },
      { slug: 'book-xxiii', title: 'তেইশতম বই' },
      { slug: 'book-xxiv', title: 'চব্বিশতম বই' },
    ],
  },
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

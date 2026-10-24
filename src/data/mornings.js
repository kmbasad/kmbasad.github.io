// The morning essays: every morning Claude reads a passage of a book and
// writes an essay on it in English; here it is in Bangla, on a shelf of মাচা
// (/trellises/mornings/). One file a morning,
// src/stories/mornings/<yyyy-mm-dd>.md, its frontmatter `title` (the Bangla
// title) and `reads` (the book and the passage it reads); the body is plain
// paragraphs, with `##` headings if the essay has parts. An essay with `held:`
// in its frontmatter (the reason, e.g. a book still in copyright) is kept in
// the repo but not published: no page, no entry, no neighbour link.

const mods = import.meta.glob('../stories/mornings/*.md', { eager: true });

// newest first
export const mornings = Object.entries(mods)
  .map(([path, m]) => {
    const slug = path.match(/([^/]+)\.md$/)[1];
    return { slug, fm: m.frontmatter ?? {}, Content: m.Content };
  })
  .filter((m) => !m.fm.held)
  .sort((a, b) => (a.slug < b.slug ? 1 : -1));

const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const bn = (n) => String(n).replace(/\d/g, (d) => String.fromCharCode(0x09e6 + +d));
// 2026-10-24 → ২৪ অক্টোবর ২০২৬
export const bnDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${bn(d)} ${MONTHS[m - 1]} ${bn(y)}`;
};

// the words the essays' pages say of themselves, and where they stand
export const ESSAY_W = {
  name: 'ভোরের প্রবন্ধ',
  gloss: 'প্রতি ভোরে একটি বইয়ের পাঠ, ক্লডের ইংরেজি থেকে বাংলায়',
  lede: 'প্রতি ভোরে ক্লড একটি বইয়ের একটি অংশ পড়ে ইংরেজিতে একটি প্রবন্ধ লেখে, আর এখানে সেই প্রবন্ধ বাংলায় আসে।',
  credit: 'ক্লডের লেখা ইংরেজি প্রবন্ধের বাংলা অনুবাদ',
  reads: 'পাঠ',
};
export const ESSAYS_BASE = '/trellises/mornings/';

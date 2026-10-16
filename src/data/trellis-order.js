// The trellises, each with its name and its colour on the Trellises page.
// The page lists them in Bengali alphabetical order of their names, and each
// trellis's footer steps to its neighbours in that same order, so a new
// trellis finds its own place wherever it is added here.
const trellises = [
  { slug: 'kiarostami',    title: 'আব্বাস কিয়ারোস্তামি', mark: '#c03a2b' },
  { slug: 'god',           title: 'খোদা',               mark: '#e8a04a' },
  { slug: 'consciousness', title: 'চেতনা',              mark: '#5a2f4a' },
  { slug: 'chan-wook',     title: 'পাক চান-উক',          mark: '#f0c75a' },
  { slug: 'ray',           title: 'সত্যজিৎ রায়',         mark: '#8a3b5a' },
];

export const trellisList = [...trellises].sort((a, b) => a.title.localeCompare(b.title, 'bn'));
export const trellisOrder = trellisList.map((t) => t.slug);

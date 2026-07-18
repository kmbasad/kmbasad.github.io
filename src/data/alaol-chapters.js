// The ten chapters of Alaol's Sapta Paykar, in reading order.
// Shared by the Pangea work-landing and the dynamic [chapter] route, so the
// list lives in exactly one place. Each chapter's parallel text is at
// /pangea/alaol-sapta-paykar/<slug>/<slug>.md (tercet type).
// hasEn: true when the MD has Bengali :: English pairs; false = Bengali only.
export const alaolChapters = [
  { slug: 'prologue',        bn: 'প্রস্তাবনা',                 en: 'Prologue',                  hasEn: true  },
  { slug: 'bahram',          bn: 'বাহরাম-চরিত',                en: "Bahram's Story",             hasEn: false },
  { slug: 'saturday-black',  bn: 'শনিবার — কৃষ্ণ মণ্ডপ',       en: 'Saturday — Black Pavilion',  hasEn: false },
  { slug: 'sunday-yellow',   bn: 'রবিবার — পীত মণ্ডপ',         en: 'Sunday — Yellow Pavilion',   hasEn: false },
  { slug: 'monday-green',    bn: 'সোমবার — হরিত মণ্ডপ',        en: 'Monday — Green Pavilion',    hasEn: false },
  { slug: 'tuesday-red',     bn: 'মঙ্গলবার — রক্ত মণ্ডপ',      en: 'Tuesday — Red Pavilion',     hasEn: false },
  { slug: 'wednesday-blue',  bn: 'বুধবার — নীল মণ্ডপ',         en: 'Wednesday — Blue Pavilion',  hasEn: false },
  { slug: 'thursday-sandal', bn: 'বৃহস্পতিবার — চন্দন মণ্ডপ',  en: 'Thursday — Sandal Pavilion', hasEn: false },
  { slug: 'friday-white',    bn: 'শুক্রবার — শুভ্র মণ্ডপ',     en: 'Friday — White Pavilion',    hasEn: false },
  { slug: 'epilogue',        bn: 'উপসংহার',                    en: 'Epilogue',                   hasEn: false },
];

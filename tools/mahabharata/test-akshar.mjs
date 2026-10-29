#!/usr/bin/env node
/**
 * The অক্ষরবৃত্ত counter against words and lines whose count is known,
 * so a change to the rules in public/js/sanskrit.js shows what it breaks.
 *
 *   node tools/mahabharata/test-akshar.mjs
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, '../../public/js/sanskrit.js'), 'utf8'), ctx);
const SA = ctx.Sanskrit;

// word → মাত্রা; the rules should get these without the word list
const WORDS = {
  'করলেন': 3, 'বললেন': 3, 'বলেছিলেন': 5, 'শুনেছিলাম': 5, 'মহাভারতের': 6,
  'ভারতের': 4, 'আমরা': 2, 'তোমরা': 2, 'সবখানে': 3, 'একজন': 3, 'নারায়ণ': 4,
  'নারায়ণে': 4, 'নারায়ণকে': 4, 'বিজয়ী': 3, 'পুণ্যবান': 4, 'সংসার': 3, 'দুঃখ': 2,
  'উৎসব': 3, 'রং': 2, 'বাংলা': 2, 'কদাচিৎ': 4, 'যায়': 2, 'দিয়ে': 2, 'দেওয়া': 2,
  'পাওয়ার': 3, 'তোমাকে': 3, 'জন্যে': 2, 'মন': 2, 'নগর': 3, 'নগরে': 3, 'উত্তম': 3,
  'নরোত্তম': 4, 'ঋষিরা': 3, 'এখন': 3, 'তখন': 3, 'যাই': 2, 'এই': 2, 'বউটা': 2,
  'কাশীরাম': 4, 'অমৃত': 3, 'সমান': 3, 'নৈমিষারণ্যে': 5, 'মুনিদের': 4, 'প্রণাম': 3,
  'সূত': 2, 'বিচিত্র': 3, 'কাহিনি': 3, 'শুনে': 2, 'থেকে': 2, 'পদ্মলোচন': 5,
  'সমন্তপঞ্চক': 6, 'অতঃপর': 4, 'সবই': 2, 'তাঁরই': 2, 'আজও': 2, 'অল্পই': 3,
  'বিদুরকেও': 4, 'ক্ষত্রিয়দের': 5, 'থেকেই': 3, 'জনমেজয়কে': 5,
};
// lines → মাত্রা (Kashiram's পয়ার, a modern অক্ষরবৃত্ত phrase)
const LINES = {
  'মহাভারতের কথা অমৃত সমান': 14,
  'কাশীরাম দাস কহে শুনে পুণ্যবান': 14,
  'তোমাকে পাওয়ার জন্যে': 8,
};

const bad = [];
for (const [w, n] of Object.entries(WORDS)) {
  const got = SA.akshar(w).total;
  if (got !== n) bad.push(`${w}: ${got}, should be ${n}`);
}
for (const [l, n] of Object.entries(LINES)) {
  const got = SA.akshar(l).total;
  if (got !== n) bad.push(`${l}: ${got}, should be ${n}`);
}
const all = Object.keys(WORDS).length + Object.keys(LINES).length;
console.log(bad.length ? bad.join('\n') : `all ${all} right`);
process.exitCode = bad.length ? 1 : 0;

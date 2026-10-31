const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = [];
  for (const [w, h, name] of [[1280, 800, 'lap'], [390, 844, 'ph']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', (e) => out.push(name + ' ERR ' + e.message));
    await p.goto('file://' + process.argv[2]); await p.waitForTimeout(500);
    await p.click('.s[data-i="7"]'); await p.waitForTimeout(400);
    await p.click('#d-prev-box summary');
    await p.screenshot({ path: name + '-dhaka.png' });
    out.push(name + ' prev=' + (await p.textContent('#d-prev-text')).slice(0, 40) + ' overflow ' + await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  }
  console.log(out.join('\n')); await b.close();
})();

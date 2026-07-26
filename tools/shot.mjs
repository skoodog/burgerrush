import { chromium } from '@playwright/test';
const [,, url, out, script] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2500);
if (script) {
  for (const step of script.split('|')) {
    const [action, arg, wait] = step.split(':');
    if (action === 'key') await page.keyboard.press(arg);
    if (action === 'hold') await page.keyboard.down(arg);
    if (action === 'wait') await page.waitForTimeout(Number(arg));
    if (wait) await page.waitForTimeout(Number(wait));
    await page.waitForTimeout(250);
  }
}
await page.waitForTimeout(600);
await page.screenshot({ path: out });
console.log(JSON.stringify({ errors }, null, 2));
await browser.close();

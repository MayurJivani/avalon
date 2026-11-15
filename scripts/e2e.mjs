// Full multiplayer playthrough against the built app: 5 browser contexts, real Socket.IO server.
// usage: SCRIPT=scripts/e2e.mjs ./scripts/shot.sh <baseUrl>
import { chromium } from 'playwright-core';

const base = process.argv[2];
const SHOTS = 'shots';
const executablePath = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath, args: ['--disable-gpu', '--js-flags=--max-old-space-size=96'] });
const names = ['Gawain', 'Lancelot', 'Elaine', 'Bedivere', 'Tristan'];
const pages = [];
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); };

for (let i = 0; i < 5; i++) {
  const ctx = await browser.newContext({ viewport: i === 1 ? { width: 390, height: 844 } : i === 0 ? { width: 1366, height: 860 } : { width: 1024, height: 640 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${names[i]} pageerror]`, e.message));
  pages.push(p);
}
const [host] = pages;

await host.goto(base);
await host.waitForTimeout(1800);
await host.screenshot({ path: `${SHOTS}/01-landing.png` });
await host.getByPlaceholder('e.g. Gawain').fill(names[0]);
await host.getByRole('button', { name: 'Create a room' }).click();
await host.waitForURL(/\/r\/[A-Z]{5}$/);
const link = host.url();
console.log('room', link);

for (let i = 1; i < 5; i++) {
  const p = pages[i];
  await p.goto(link);
  await p.getByPlaceholder('e.g. Gawain').fill(names[i]);
  await p.getByRole('button', { name: 'Join' }).click();
  await p.getByRole('button', { name: 'I am ready' }).click();
}
await host.waitForTimeout(900);
await host.screenshot({ path: `${SHOTS}/02-lobby.png`, fullPage: true });
await pages[1].screenshot({ path: `${SHOTS}/02-lobby-mobile.png`, fullPage: true });
await host.getByRole('button', { name: 'Begin the game' }).click();
await host.waitForTimeout(800);
await host.screenshot({ path: `${SHOTS}/03-reveal-back.png` });

// learn roles through each player's own UI
const roles = {};
for (let i = 0; i < 5; i++) {
  const p = pages[i];
  await p.getByRole('button', { name: 'Turn the card' }).click();
  await p.waitForTimeout(700);
  roles[names[i]] = (await p.locator('h1.font-gothic').innerText()).trim();
  if (i === 0) await p.screenshot({ path: `${SHOTS}/04-reveal-front.png` });
  if (i === 1) await p.screenshot({ path: `${SHOTS}/04-reveal-mobile.png` });
  await p.getByRole('button', { name: 'Confirm identity' }).click();
}
console.log('roles', roles);
const evil = new Set(Object.keys(roles).filter((n) => ['Assassin', 'Morgana', 'Mordred', 'Oberon', 'Minion of Mordred'].includes(roles[n])));
assert(evil.size === 2, 'two evil at 5p');

// never: a player's DOM containing another player's role name in the board
const otherRoleLeak = async (i) => {
  const text = await pages[i].locator('main').innerText();
  return Object.entries(roles).some(([n, r]) => n !== names[i] && r !== roles[names[i]] && text.includes(r));
};
for (let i = 0; i < 5; i++) assert(!(await otherRoleLeak(i)), `${names[i]} sees another role`);

const dismiss = async () => { for (const p of pages) { await p.keyboard.press('Escape').catch(() => {}); } await host.waitForTimeout(300); };
const leaderPage = async () => {
  for (const p of pages) if (await p.getByRole('button', { name: 'Propose this team' }).count()) return p;
  throw new Error('no leader');
};

let shotBoard = false;
for (let round = 0; round < 12; round++) {
  await dismiss();
  if (await host.getByText(/PREVAILS|REIGNS|Assassin rises/i).count()) break;
  const lp = await leaderPage();
  const need = Number((await lp.getByRole('heading', { name: /Choose \d/ }).innerText()).match(/choose (\d)/i)[1]);
  // pick good players only so quests succeed and we reach the assassin
  const seatBtns = lp.locator('section[aria-label="The round table"] li button');
  let picked = 0;
  for (let k = 0; k < (await seatBtns.count()) && picked < need; k++) {
    const label = await seatBtns.nth(k).getAttribute('aria-label');
    const nm = label.split(/[,(]/)[0].trim();
    if (evil.has(nm)) continue;
    await seatBtns.nth(k).click();
    picked++;
  }
  if (!shotBoard) { await lp.screenshot({ path: `${SHOTS}/05-board-propose.png` }); }
  await lp.getByRole('button', { name: 'Propose this team' }).click();
  await host.waitForTimeout(400);
  for (let i = 0; i < 5; i++) {
    await pages[i].getByRole('button', { name: /^Approve/ }).click();
    if (i === 2 && !shotBoard) await pages[1].screenshot({ path: `${SHOTS}/06-board-vote-mobile.png`, fullPage: true });
  }
  await host.waitForTimeout(1500);
  if (!shotBoard) await host.screenshot({ path: `${SHOTS}/07-vote-reveal.png` });
  await dismiss();
  for (const p of pages) {
    const b = p.getByRole('button', { name: /Success/ });
    if (await b.count()) await b.first().click();
  }
  await host.waitForTimeout(2400);
  if (!shotBoard) { await host.screenshot({ path: `${SHOTS}/08-quest-reveal.png` }); shotBoard = true; }
}
await dismiss();
await host.waitForTimeout(3500);
await host.screenshot({ path: `${SHOTS}/09-assassin.png` });

const ai = names.findIndex((n) => roles[n] === 'Assassin');
const ap = pages[ai];
await ap.waitForSelector('text=Who is Merlin?', { timeout: 8000 });
await ap.screenshot({ path: `${SHOTS}/10-assassin-choose.png` });
const wrong = names.find((n) => !evil.has(n) && roles[n] !== 'Merlin');
await ap.getByRole('dialog', { name: 'The assassination' }).getByRole('button', { name: wrong, exact: true }).click();
await ap.getByRole('button', { name: 'Strike' }).click();
await host.waitForTimeout(1500);
await host.screenshot({ path: `${SHOTS}/11-strike.png` });
await host.waitForTimeout(5500);
await host.screenshot({ path: `${SHOTS}/12-results.png`, fullPage: true });
assert(await host.getByText('ARTHUR PREVAILS').count() || await host.locator('[aria-label="ARTHUR PREVAILS"]').count(), 'good wins');

// reconnect: refresh a non-host mid-results and they still see their seat
await pages[2].reload();
await pages[2].locator('[aria-label="ARTHUR PREVAILS"]').waitFor({ timeout: 12000 }); // strike cinematic replays first

// rematch
await host.getByRole('button', { name: 'Rematch, same rite' }).click();
await host.waitForTimeout(1000);
assert(await pages[3].getByRole('button', { name: 'Turn the card' }).count(), 'rematch deals new roles');
console.log('E2E OK');
await browser.close();

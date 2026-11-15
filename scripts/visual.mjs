// Visual sweep: one real browser seat + socket bots, screenshots of every phase at desktop and phone width.
// usage: SCRIPT=scripts/visual.mjs ./scripts/shot.sh <baseUrl> <scenario: fail|assassin>
import { chromium } from 'playwright-core';
import { io } from 'socket.io-client';

const [base, scenario = 'fail'] = process.argv.slice(2);
const N = scenario === 'fail' ? 10 : 7;
const OUT = `shots/v-${scenario}`;
const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: exe, args: ['--disable-gpu', '--js-flags=--max-old-space-size=128'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const wait = (ms) => page.waitForTimeout(ms);

const snap = async (name, both = true) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await wait(350);
  await page.screenshot({ path: `${OUT}-${name}-d.png`, fullPage: true });
  if (both) {
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(350);
    await page.screenshot({ path: `${OUT}-${name}-m.png`, fullPage: true });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 0) errors.push(`${name}: horizontal overflow ${over}px on mobile`);
    await page.setViewportSize({ width: 1366, height: 860 });
  }
};

// --- room
await page.goto(base);
await wait(1500);
await page.getByPlaceholder('e.g. Gawain').fill('Host');
await page.getByRole('button', { name: 'Create a room' }).click();
await page.waitForURL(/\/r\//);
const code = page.url().split('/r/')[1];

const bots = [];
for (let i = 1; i < N; i++) {
  const s = io(base, { auth: { token: `bot-token-${scenario}-${i}-xxxxxxxx` }, transports: ['websocket'] });
  const b = { s, last: null, emit: (ev, arg) => new Promise((r) => s.emit(ev, arg, r)) };
  s.on('state', (m) => (b.last = m));
  await new Promise((r) => s.on('connect', r));
  const res = await b.emit('room:join', { code, name: ['Gawain', 'Lancelot', 'Elaine', 'Bedivere', 'Tristan', 'Isolde', 'Kay', 'Gareth', 'Percy'][i - 1] });
  if (!res.ok) throw new Error(res.error);
  if (i < N - 1) await b.emit('room:ready', true);
  bots.push(b);
}
await wait(600);
await snap('lobby-notready');
await bots.at(-1).emit('room:ready', true);
await page.getByRole('button', { name: /Recommended for/ }).click();
await wait(400);
await snap('lobby-ready');

// rules modal
await page.getByRole('button', { name: /Rules/ }).first().click();
await wait(500);
await snap('rules');
await page.keyboard.press('Escape');

await page.getByRole('button', { name: 'Begin the game' }).click();
await wait(600);
await snap('reveal-back');
await page.getByRole('button', { name: 'Turn the card' }).click();
await wait(900);
await snap('reveal-front');
await page.getByRole('button', { name: 'Confirm identity' }).click();
await wait(500);

const G = () => bots[0].last.room.game;
const me = bots[0].last.room.members.find((m) => m.name === 'Host').id;
const botById = (id) => bots.find((b) => b.last.me === id);
const name = (id) => bots[0].last.room.members.find((m) => m.id === id).name;
const evilBots = () => bots.filter((b) => b.last.secret.team === 'evil');
const goodBots = () => bots.filter((b) => b.last.secret.team === 'good');
const dismiss = async () => { await page.keyboard.press('Escape'); await wait(250); await page.keyboard.press('Escape'); await wait(250); };

async function round(fails, { shots = false, approve = true } = {}) {
  const g = G();
  const size = g.quests[g.quest].size;
  const team = [...evilBots().slice(0, fails), ...goodBots()].slice(0, size).map((b) => b.last.me);
  if (g.leader === me) {
    for (const id of team) await page.locator(`section[aria-label="The round table"] button[aria-label^="${name(id)}"]`).click();
    if (shots) await snap('propose-leader');
    await page.getByRole('button', { name: 'Propose this team' }).click();
  } else {
    if (shots) await snap('propose-waiting');
    const r = await botById(g.leader).emit('game:act', { action: 'propose', arg: team });
    if (!r.ok) throw new Error('propose ' + r.error);
  }
  await wait(400);
  for (const b of bots.slice(0, 3)) await b.emit('game:act', { action: 'vote', arg: approve });
  await wait(300);
  if (shots) await snap('vote');
  await page.getByRole('button', { name: approve ? /^Approve/ : /^Reject/ }).click();
  for (const b of bots.slice(3)) await b.emit('game:act', { action: 'vote', arg: approve });
  await wait(1800);
  if (shots) await snap('vote-reveal');
  await dismiss();
  if (!approve) return;
  const onTeam = bots.filter((b) => team.includes(b.last.me));
  for (const b of onTeam.slice(0, -1)) await b.emit('game:act', { action: 'quest', arg: !evilBots().includes(b) || !team.slice(0, fails).includes(b.last.me) });
  await wait(300);
  if (shots) await snap('quest-waiting');
  const lastB = onTeam.at(-1);
  await lastB.emit('game:act', { action: 'quest', arg: !team.slice(0, fails).includes(lastB.last.me) });
  await wait(fails ? 3200 : 2600);
  if (shots) await snap('quest-reveal');
  await dismiss();
}

if (scenario === 'fail') {
  await round(0, { approve: false, shots: true }); // rejection path
  await snap('board-after-reject');
  await round(1, { shots: true });
  await page.getByRole('button', { name: 'My role' }).click();
  await wait(300);
  await page.getByRole('button', { name: 'Press and hold to see your role' }).dispatchEvent('pointerdown');
  await wait(800);
  await snap('peek');
  await page.keyboard.press('Escape');
  await round(0);
  await snap('board-mid');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Chronicle/ }).click();
  await wait(300);
  await page.screenshot({ path: `${OUT}-chronicle-m.png`, fullPage: true });
  await page.getByRole('button', { name: /Chronicle/ }).click();
  await round(1); // Q3 fails
  await round(1); // Q4 at 10 players needs 2 fails: 1 fail still succeeds
  if (G().quests[3].result !== 'success') errors.push('quest 4 with one fail did not succeed at 10 players');
  await round(1); // Q5 fails: third failure, evil wins
} else {
  for (let i = 0; i < 3; i++) await round(0, { shots: i === 0 });
  await wait(3500);
  await snap('assassin');
  const assassin = bots.find((b) => b.last.secret.role === 'assassin');
  const merlin = Object.entries(G().seats).length && [...bots.map((b) => b.last), { me }].find((x) => x.secret?.role === 'merlin')?.me;
  // if the page player is Merlin the bots cannot see it; strike whoever, the result screen still renders
  const target = merlin ?? me;
  if (assassin) {
    const r = await assassin.emit('game:act', { action: 'assassinate', arg: target });
    if (!r.ok) throw new Error(r.error);
  } else {
    await page.locator('[role="dialog"] li button').first().click();
    await page.getByRole('button', { name: 'Strike' }).click();
  }
  await wait(1200);
  await snap('strike', false);
}
await wait(7000);
await dismiss();
await wait(1500);
await snap('results');
console.log('phase', G().phase, 'winner', G().winner, 'reason', G().reason);
console.log('ERRORS', JSON.stringify(errors));
bots.forEach((b) => b.s.close());
await browser.close();

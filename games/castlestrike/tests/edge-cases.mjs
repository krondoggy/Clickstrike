import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Optional browser integration checks. Start the local server before running.
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chrome' }),
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const SAVE_KEY = 'castlestrike-v2-save', RECORD_KEY = 'castlestrike-v2-record';
const results = [];
await mkdir('test-results', { recursive: true });

async function scenario(name, run, initialize) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  if (initialize) await context.addInitScript(initialize);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) errors.push(`${response.status()} ${response.url()}`); });
  try {
    await page.goto(`${base}/games/castlestrike/`);
    await page.waitForFunction(() => window.castleStrike?.state?.status === 'preparation');
    await run(page);
    assert.deepEqual(errors, [], `${name}: no uncaught errors or missing local assets`);
    results.push(name);
    console.log(`PASS: ${name}`);
  } catch (error) {
    const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await page.screenshot({ path: `test-results/edge-failure-${filename}.png`, fullPage: true }).catch(() => {});
    console.error(`FAIL: ${name}`, error);
    throw error;
  } finally { await context.close(); }
}

try {
  await scenario('Real defeat, result, completed-save reload and restart', async page => {
    await page.locator('#play-btn').click();
    const completed = await page.evaluate(() => {
      const g = castleStrike.game;
      for (let i = 0; i < 30 && g.state.status === 'playing'; i++) g.update(30);
      return { status: g.state.status, time: g.state.time, wave: g.state.wave, kills: g.state.stats.kills };
    });
    assert.equal(completed.status, 'defeat');
    assert.ok(completed.time > 100 && completed.time < 900);
    await page.locator('#result-dialog[open]').waitFor();
    assert.equal(await page.locator('#result-title').textContent(), 'Defeat');
    const firstRecord = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), RECORD_KEY);
    assert.equal(firstRecord.matches, 1);
    const firstSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
    assert.equal(firstSave.status, 'defeat');
    await page.reload();
    await page.waitForFunction(() => window.castleStrike?.state?.status === 'defeat');
    assert.equal(await page.evaluate(() => castleStrike.state.time), completed.time);
    await page.waitForTimeout(200);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), RECORD_KEY), firstRecord, 'Reload does not duplicate a match record');
    await page.locator('#play-btn').click();
    await page.locator('#settings-dialog[open]').waitFor();
    await page.locator('[data-faction="horde"]').click();
    await page.locator('#new-match-btn').click();
    assert.deepEqual(await page.evaluate(() => ({ faction: castleStrike.state.faction, status: castleStrike.state.status, time: castleStrike.state.time, gold: castleStrike.state.gold, units: castleStrike.state.units.length })), { faction: 'horde', status: 'preparation', time: 0, gold: 280, units: 0 });
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), RECORD_KEY), firstRecord, 'Restart keeps prior records');
  });

  await scenario('Budget-constrained victory, fastest record and completed reload', async page => {
    await page.locator('#play-btn').click();
    const completed = await page.evaluate(async () => {
      const { UNITS } = await import('/games/castlestrike/src/data.js');
      const g = castleStrike.game, s = g.state;
      let plan = null;
      const command = () => {
        if (s.mineLevel < Math.min(4, Math.floor(s.time / 85) + 1) && s.supply >= 9) { g.research('mines'); return; }
        if (s.tier < 3 && s.time > (s.tier === 1 ? 75 : 225) && s.supply >= (s.tier === 1 ? 13 : 25)) { g.research('tier'); return; }
        if (s.supply >= s.supplyCap - 3 && s.research.barracks < 4) { g.research('barracks'); return; }
        if (s.supply >= 22 && s.time > 180) {
          const key = s.research.weapons <= s.research.armor ? 'weapons' : 'armor';
          if (s.research[key] < Math.min(3, Math.floor(s.time / 150)) && s.gold >= g.getResearchCost(key)) { g.research(key); return; }
        }
        if (plan) {
          if (s.supply + plan.supply > s.supplyCap) { plan = null; return; }
          if (g.recruit(plan.id).ok) plan = null;
          return;
        }
        const options = UNITS.filter(u => u.faction === s.faction && u.tier <= s.tier && u.supply + s.supply <= s.supplyCap && (!u.hero || !s.roster.some(r => r.unitId === u.id)));
        const score = u => {
          const count = s.roster.filter(r => r.unitId === u.id).length;
          return (u.hero ? 5 : 0) + (u.role === 'support' && count === 0 ? 3 : 0) + (u.role === 'siege' && count === 0 ? 2 : 0) + (u.role === 'frontline' ? 1.5 : 0) + u.tier * 0.8 - count * 1.2;
        };
        options.sort((a, b) => score(b) - score(a));
        plan = options[0];
        if (plan && g.recruit(plan.id).ok) plan = null;
      };
      for (let i = 0; i < 300 && s.status === 'playing'; i++) { command(); g.update(3); }
      return { status: s.status, time: s.time, kills: s.stats.kills, losses: s.stats.losses, peakUnits: s.stats.peakUnits, spentEnemy: s.enemy.spent, enemyGold: s.enemy.gold, earnedEnemy: s.enemy.goldEarned };
    });
    assert.equal(completed.status, 'victory', JSON.stringify(completed));
    assert.ok(completed.kills > 20 && completed.losses > 10, 'This was a played battle, not an artificial terminal state');
    assert.ok(completed.peakUnits <= 180);
    assert.ok(Math.abs(completed.enemyGold + completed.spentEnemy - completed.earnedEnemy - 280) < 0.01);
    await page.locator('#result-dialog[open]').waitFor();
    assert.equal(await page.locator('#result-title').textContent(), 'Victory');
    const record = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), RECORD_KEY);
    assert.equal(record.matches, 1); assert.equal(record.wins, 1); assert.equal(record.fastest, completed.time);
    await page.reload();
    await page.waitForFunction(() => window.castleStrike?.state?.status === 'victory');
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), RECORD_KEY), record);
    assert.equal(await page.evaluate(() => castleStrike.state.stats.kills), completed.kills);
    assert.equal(await page.evaluate(() => castleStrike.state.stats.peakUnits), completed.peakUnits);
    console.log(`  Victory after ${Math.round(completed.time)} seconds; ${completed.kills} kills; peak ${completed.peakUnits} troops.`);
  });

  await scenario('Unavailable browser storage preserves playability', async page => {
    await page.locator('[data-recruit="footman"]').click();
    assert.equal(await page.evaluate(() => castleStrike.state.roster.length), 4);
    assert.equal(await page.locator('#save-status').textContent(), 'SAVE UNAVAILABLE');
    await page.locator('#play-btn').click();
    await page.waitForFunction(() => castleStrike.state.units.length > 0);
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => castleStrike.state.paused), true);
    await page.locator('#resume-btn').click();
    assert.equal(await page.evaluate(() => castleStrike.state.paused), false);
    await page.locator('#settings-btn').click();
    await page.locator('[data-faction="undead"]').click();
    await page.locator('#new-match-btn').click();
    assert.equal(await page.evaluate(() => castleStrike.state.faction), 'undead');
  }, () => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage disabled for testing', 'SecurityError'); } }); });

  await scenario('Malformed save falls back to a fresh army and can be replaced', async page => {
    assert.equal(await page.evaluate(() => castleStrike.state.gold), 280);
    assert.equal(await page.evaluate(() => castleStrike.state.roster.length), 3);
    assert.match(await page.locator('#toast').textContent(), /previous save could not be read/i);
    await page.locator('[data-recruit="footman"]').click();
    const replacement = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
    assert.equal(replacement.version, 2); assert.equal(replacement.roster.length, 4);
    assert.equal(replacement.status, 'preparation');
  }, () => { localStorage.setItem('castlestrike-v2-save', '{not valid JSON'); });

  console.log(`PASS: all ${results.length} edge-case browser scenarios.`);
} finally { await browser.close(); }

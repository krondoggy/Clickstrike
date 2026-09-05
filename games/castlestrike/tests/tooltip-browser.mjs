import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chrome' }), args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
await mkdir('test-results', { recursive: true });
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', error => { errors.push(error.message); console.error(`Page error: ${error.message}`); });
page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) errors.push(`${response.status()} ${response.url()}`); });
const tip = page.locator('#unit-tooltip');
const number = value => Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 });
const tipStats = () => tip.evaluate(element => ({
  name: element.querySelector('h3').textContent,
  health: element.querySelector('.tooltip-health strong').textContent,
  values: Object.fromEntries([...element.querySelectorAll('.tooltip-stats > div')].map(row => [row.querySelector('dt').textContent, row.querySelector('dd').textContent])),
}));
const hoverCard = async locator => {
  await page.mouse.move(8, 8);
  await locator.evaluate(element => element.closest('[data-unit-tooltip]').scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
  await page.waitForTimeout(180);
  await locator.hover();
  await tip.waitFor({ state: 'visible' });
};
const assertFitsViewport = async () => {
  const rect = await tip.boundingBox(), viewport = page.viewportSize();
  assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= viewport.width + 1 && rect.y + rect.height <= viewport.height + 1, `Tooltip fits ${viewport.width}×${viewport.height}: ${JSON.stringify(rect)}`);
};

// Project actual unit bodies, then check the same mesh picked by a real pointer.
async function battlefieldPoint({ team = 'player', unitId = null, preview = false } = {}) {
  return page.evaluate(({ team, unitId, preview }) => {
    const f = castleStrike.battlefield, rect = f.canvas.getBoundingClientRect();
    for (const model of f.units.values()) {
      const unit = model.userData.unit;
      if (unit.team !== team || (unitId && unit.unitId !== unitId) || !!unit.rosterId !== preview || unit.hp <= 0) continue;
      for (const height of [.55, .8, .3]) {
        const position = model.position.clone(); position.y += (model.userData.height || 2) * height;
        position.project(f.camera);
        const clientX = rect.left + (position.x + 1) * rect.width / 2, clientY = rect.top + (1 - position.y) * rect.height / 2;
        if (document.elementFromPoint(clientX, clientY) !== f.canvas) continue;
        if (f._pickUnit({ clientX, clientY })?.id === unit.id) return { x: clientX, y: clientY, id: unit.id, unitId: unit.unitId };
      }
    }
    return null;
  }, { team, unitId, preview });
}

try {
  await page.goto(`${base}/games/castlestrike/`);
  await page.waitForFunction(() => window.castleStrike?.state.status === 'preparation' && castleStrike.battlefield.renderer?.info.render.frame > 2);
  await page.locator('[data-unit-tooltip="footman"]').first().waitFor();
  const definition = await page.evaluate(async () => (await import('/games/castlestrike/src/data.js')).UNIT_MAP.footman);
  const baseline = await page.evaluate(() => ({ selected: castleStrike.battlefield.selected, roster: JSON.stringify(castleStrike.state.roster), gold: castleStrike.state.gold, detail: document.querySelector('#unit-detail h3').textContent }));
  await hoverCard(page.locator('[data-inspect="footman"]'));
  let stats = await tipStats();
  assert.equal(stats.name, definition.name);
  assert.equal(stats.health, `${definition.hp} / ${definition.hp}`);
  assert.equal(stats.values.Attack, number(definition.damage));
  assert.equal(stats.values.Armor, number(definition.armor));
  assert.equal(stats.values['Attack time'], `${number(definition.attackSpeed)}s`);
  assert.equal(stats.values.Range, `${number(definition.range)}m`);
  assert.equal(stats.values.Movement, `${number(definition.speed)}m/s`);
  assert.match(await tip.textContent(), new RegExp(definition.ability));
  await assertFitsViewport();
  await page.locator('[data-recruit="footman"]').hover();
  await tip.waitFor({ state: 'visible' });
  assert.equal(await tip.isVisible(), true, 'Recruit button retains its whole-card tooltip');
  assert.match(await page.locator('[data-recruit="footman"]').getAttribute('aria-describedby') || '', /unit-tooltip/);
  await page.screenshot({ path: 'test-results/castle-strike-tooltip-card.png' });
  await hoverCard(page.locator('[data-inspect="archer"]'));
  assert.deepEqual(await page.evaluate(() => ({ selected: castleStrike.battlefield.selected, roster: JSON.stringify(castleStrike.state.roster), gold: castleStrike.state.gold, detail: document.querySelector('#unit-detail h3').textContent })), baseline, 'Hovering never selects or recruits a unit');
  await page.mouse.move(8, 8); await tip.waitFor({ state: 'hidden' });
  await page.keyboard.press('Tab');
  await page.locator('[data-inspect="footman"]').focus();
  await tip.waitFor({ state: 'visible' });
  assert.match(await page.locator('[data-inspect="footman"]').getAttribute('aria-describedby') || '', /unit-tooltip/);
  await page.keyboard.press('Escape');
  await tip.waitFor({ state: 'hidden' });
  await page.waitForTimeout(300);
  assert.equal(await tip.isHidden(), true, 'Escape stays dismissed while the source retains focus');
  console.log('PASS: card stats, recruit hover, selection invariance, keyboard focus, and Escape.');

  await page.evaluate(() => { castleStrike.state.gold = 1000; });
  await page.getByRole('tab', { name: 'Research' }).click();
  await page.locator('[data-research="weapons"]').click();
  await page.locator('[data-research="armor"]').click();
  await page.getByRole('tab', { name: 'Recruit' }).click();
  await hoverCard(page.locator('[data-inspect="footman"]'));
  const researched = await tipStats();
  assert.equal(researched.health, `${Math.round(definition.hp * 1.08)} / ${Math.round(definition.hp * 1.08)}`);
  assert.equal(researched.values.Attack, number(definition.damage * 1.12));
  assert.equal(researched.values.Armor, number(definition.armor + 2));

  await page.getByRole('tab', { name: 'Formation' }).click();
  await hoverCard(page.locator('.formation-cell.occupied').first());
  assert.match(await tip.textContent(), /Next reinforcement/);
  await page.mouse.move(8, 8); await tip.waitFor({ state: 'hidden' });
  await page.locator('.battlefield-canvas').scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
  const preview = await battlefieldPoint({ unitId: 'footman', preview: true });
  assert.ok(preview, 'A formation model is reachable through its visible body');
  await page.mouse.move(preview.x, preview.y); await tip.waitFor({ state: 'visible' });
  assert.deepEqual(await tipStats(), researched, 'Formation model uses researched reinforcement stats');
  await page.mouse.move(8, 8); await tip.waitFor({ state: 'hidden' });

  await page.evaluate(() => { castleStrike.state.enemy.research.armor = 3; castleStrike.state.enemy.research.weapons = 2; });
  await page.getByRole('tab', { name: 'Scout' }).click();
  const scout = page.locator('.scout-unit[data-unit-tooltip]').first();
  await hoverCard(scout);
  const scoutDefinition = await page.evaluate(async id => (await import('/games/castlestrike/src/data.js')).UNIT_MAP[id], await scout.getAttribute('data-unit-tooltip'));
  stats = await tipStats();
  assert.equal(await tip.getAttribute('data-team'), 'enemy');
  assert.equal(stats.health, `${Math.round(scoutDefinition.hp * 1.24)} / ${Math.round(scoutDefinition.hp * 1.24)}`);
  assert.equal(stats.values.Attack, number(scoutDefinition.damage * 1.24));
  assert.equal(stats.values.Armor, number(scoutDefinition.armor + 6));
  console.log('PASS: researched previews, formation cards/models, and enemy scouting stats.');

  await page.getByRole('tab', { name: 'Recruit' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await hoverCard(page.locator('[data-inspect="footman"]'));
  await assertFitsViewport();
  await tip.waitFor({ state: 'visible' });
  await page.screenshot({ path: 'test-results/castle-strike-tooltip-mobile.png' });
  await hoverCard(page.locator('.unit-card [data-inspect]').last());
  await assertFitsViewport();
  console.log('PASS: tooltips remain inside the narrow viewport at both ends of the roster.');
  await page.setViewportSize({ width: 1440, height: 900 });
  // Freeze simulation time without opening the pause overlay over the canvas.
  await page.evaluate(() => { window.scrollTo(0, 0); castleStrike.game.start(); castleStrike.state.speed = 0; castleStrike.battlefield.resetCamera(); });
  await page.waitForFunction(() => [...castleStrike.battlefield.units.values()].some(model => !model.userData.unit.rosterId));
  await page.waitForTimeout(250);
  const live = await battlefieldPoint({ unitId: 'footman' });
  assert.ok(live, 'A live model is reachable through its visible body');
  const beforeHover = await page.evaluate(() => castleStrike.battlefield.selected);
  await page.mouse.move(live.x, live.y); await tip.waitFor({ state: 'visible' });
  const spawned = await page.evaluate(id => castleStrike.state.units.find(unit => unit.id === id), live.id);
  stats = await tipStats();
  assert.equal(stats.health, `${spawned.hp} / ${spawned.maxHp}`);
  assert.equal(stats.values.Attack, number(spawned.damage));
  assert.equal(stats.values.Armor, number(spawned.armor));
  assert.equal(stats.health, researched.health, 'The preview matches the fighter actually spawned by the engine');
  assert.equal(await page.evaluate(() => castleStrike.battlefield.selected), beforeHover);
  await page.evaluate(id => { castleStrike.state.units.find(unit => unit.id === id).hp -= 57; }, live.id);
  await page.waitForFunction(expected => document.querySelector('#unit-tooltip .tooltip-health strong')?.textContent === expected, `${spawned.hp - 57} / ${spawned.maxHp}`);
  await assertFitsViewport();
  await tip.waitFor({ state: 'visible' });
  await page.screenshot({ path: 'test-results/castle-strike-tooltip-battlefield.png' });
  await page.evaluate(id => { castleStrike.state.units.find(unit => unit.id === id).hp = 0; }, live.id);
  await tip.waitFor({ state: 'hidden' });
  await page.mouse.move(8, 8);
  const other = await battlefieldPoint();
  assert.ok(other);
  await page.evaluate(() => castleStrike.battlefield.setTargeting('meteor'));
  await page.mouse.move(other.x, other.y); await page.waitForTimeout(350);
  assert.equal(await tip.isHidden(), true, 'Spell targeting suppresses battlefield hover');
  await page.evaluate(() => castleStrike.battlefield.setTargeting(null));
  await page.mouse.move(8, 8); await page.mouse.move(other.x, other.y); await tip.waitFor({ state: 'visible' });
  await page.mouse.move(8, 8); await tip.waitFor({ state: 'hidden' });

  // Focus without scrolling, keeping the parked mouse over the same fighter.
  // A far-right card also keeps its popup away from the fighter at the left.
  const parked = await battlefieldPoint();
  assert.ok(parked);
  await page.mouse.move(parked.x, parked.y); await tip.waitFor({ state: 'visible' });
  const focusId = await page.locator('.unit-card [data-inspect]').last().getAttribute('data-inspect');
  const focusName = await page.evaluate(async id => (await import('/games/castlestrike/src/data.js')).UNIT_MAP[id].name, focusId);
  await page.locator('.battlefield-canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.locator(`[data-inspect="${focusId}"]`).evaluate(element => element.focus({ preventScroll: true }));
  await page.waitForFunction(name => document.querySelector('#unit-tooltip:not([hidden]) h3')?.textContent === name, focusName);
  await page.waitForTimeout(450);
  assert.equal((await tipStats()).name, focusName, 'A parked battlefield pointer cannot override the keyboard-focused card');
  assert.equal(await page.evaluate(() => castleStrike.battlefield.hoverUnit?.id), parked.id, 'The field pointer is still over its fighter throughout the keyboard check');
  await page.keyboard.press('Escape');
  await tip.waitFor({ state: 'hidden' });
  await page.waitForTimeout(350);
  assert.equal(await tip.isHidden(), true, 'Escape dismissal survives the parked field pointer');
  await page.mouse.move(8, 8); await page.mouse.move(parked.x, parked.y); await tip.waitFor({ state: 'visible' });
  await page.mouse.move(8, 8); await tip.waitFor({ state: 'hidden' });
  console.log('PASS: keyboard focus wins over stationary battlefield picking until the mouse moves again.');

  // Exercise the real 2D fallback on a separate page with WebGL unavailable.
  console.log('PASS: live 3D stats, stationary health/death updates, targeting, and pointer leave.');
  const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  await fallbackContext.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl' ? null : getContext.call(this, type, ...args); };
  });
  const fallbackPage = await fallbackContext.newPage();
  fallbackPage.on('pageerror', error => errors.push(error.message));
  await fallbackPage.goto(`${base}/games/castlestrike/`);
  await fallbackPage.waitForFunction(() => castleStrike?.battlefield.fallback && castleStrike.battlefield.fallbackUnits?.length);
  await fallbackPage.evaluate(() => document.fonts.ready);
  await fallbackPage.waitForTimeout(250);
  const fallbackPoint = await fallbackPage.evaluate(() => {
    const f = castleStrike.battlefield, unit = f.fallbackUnits.find(unit => unit.team === 'player');
    const p = f._fallbackProject(unit.x, unit.z), rect = f.canvas.getBoundingClientRect();
    return { x: rect.left + p.x, y: rect.top + p.y - 7 };
  });
  await fallbackPage.mouse.move(fallbackPoint.x, fallbackPoint.y);
  await fallbackPage.locator('#unit-tooltip').waitFor({ state: 'visible' });
  assert.match(await fallbackPage.locator('#unit-tooltip').textContent(), /Health/);
  await fallbackPage.mouse.move(8, 8);
  await fallbackPage.locator('#unit-tooltip').waitFor({ state: 'hidden' });
  await fallbackContext.close();
  assert.deepEqual(errors, [], 'No page errors or missing assets');
  console.log('PASS: whole-card and recruit hover, stats, research, keyboard/Escape, formation/scout, narrow viewport, 3D live health/death, targeting, non-mutating hover, and 2D fallback.');
} catch (error) {
  if (errors.length) console.error('Page diagnostics:', errors);
  await page.screenshot({ path: 'test-results/castle-strike-tooltip-failure.png', fullPage: true, timeout: 10000 }).catch(() => {});
  throw error;
} finally { await browser.close(); }

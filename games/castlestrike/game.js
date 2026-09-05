import { createGame, restoreGame } from './src/engine.js';
import { FACTIONS, UNITS, UNIT_MAP, RESEARCH, SPELLS } from './src/data.js';
import { Battlefield } from './src/battlefield.js';
import { BattleAudio } from './src/audio.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'castlestrike-v2-save', SETTINGS_KEY = 'castlestrike-v2-settings', RECORD_KEY = 'castlestrike-v2-record';
const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
const timeText = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  castle: '<path d="M3 21V8h4v4h3V4h4v8h3V8h4v13H3Z"/><path d="M10 21v-5h4v5M3 8V5m4 3V5m10 3V5m4 3V5M12 4V1m0 0h5l-1 2h-4"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 4 12 4 12 0V7M3 11v4c0 2 4 3 7 3M15 9c8-2 9 5 1 6-2 0-3 0-4-1"/><path d="M12 13v5c0 4 10 4 10 0v-6"/>',
  army: '<path d="M9 13c-5 0-7 3-7 7h13c0-4-2-7-6-7Z"/><circle cx="9" cy="7" r="4"/><path d="M16 4a4 4 0 0 1 0 7m1 3c4 0 5 3 5 6h-4"/>',
  crown: '<path d="m2 6 5 5 5-8 5 8 5-5-3 13H5L2 6Zm3 9h14"/><path d="M7 22h10"/>',
  shield: '<path d="M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6l-9-4Z"/><path d="M12 6v11M7 10h10"/>',
  skull: '<path d="M6 16c-3-1-4-4-3-7 0-9 18-9 18 0 1 3 0 6-3 7v5H6v-5Z"/><path d="M9 17v4m6-4v4m-4-6 1-2 1 2"/><circle cx="7" cy="11" r="2"/><circle cx="17" cy="11" r="2"/>',
  swords: '<path d="m3 2 5 2 13 16-2 2L4 7 3 2Zm14 0 4 1-1 4-5 5M3 20l6-6m-7 3 5 5m10-9 5 5"/>',
  sword: '<path d="m17 2 5 0-1 5-12 12-4-4L17 2ZM3 14l7 7m-4-3-4 4"/>',
  heart: '<path d="M12 21 3 12C-4 3 8-3 12 6c4-9 16-3 9 6l-9 9Z"/>',
  banner: '<path d="M5 22V2m0 1h14l-3 5 3 5H5m-3 9h7"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/>',
  anvil: '<path d="M2 5h20v4l-7 3v3l4 5H5l4-5v-3L2 9V5Z"/><path d="M8 3h9v2M9 15h6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  focus: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="4"/>',
  shrine: '<path d="m12 2 5 7-5 6-5-6 5-7ZM12 15v5M5 20h14M3 23h18M5 7l-3 6m17-6 3 6"/>',
  sound: '<path d="M10 4 5 8H2v8h3l5 4V4Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  muted: '<path d="M10 4 5 8H2v8h3l5 4V4Zm5 5 6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01"/>',
  settings: '<path d="m10 2-1 3-3 1-3-1-2 4 3 2v3l-2 2 2 4 3-1 3 2h4l1-3 3-1 3 1 2-4-3-2v-3l2-2-2-4-3 1-3-2h-4Z"/><circle cx="12" cy="12" r="3"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  meteor: '<path d="m21 2-9 9m7-7-2 8m-8-5 8-5"/><path d="M12 10a6 6 0 1 1-7 0l4-7-1 8 4-1Z"/>',
  rally: '<path d="m4 15 10-9 5 11L5 19l-1-4Zm10-9 1-3 7 16-3-2M6 19l2 4h4l-2-5"/>',
  mend: '<path d="m12 2 2 7 7 3-7 3-2 7-2-7-7-3 7-3 2-7Zm-8 0v4M2 4h4m13 14v4m-2-2h4"/>',
  pause: '<path d="M7 4v16M17 4v16"/>',
  play: '<path d="m6 3 15 9-15 9V3Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.shield}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const portraitStyle = unit => {
  const index = UNITS.filter(candidate => candidate.faction === unit.faction).findIndex(candidate => candidate.id === unit.id);
  return `background-image:url('assets/portraits-${unit.faction}.png');background-size:300% 300%;background-position:${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`;
};
const factionOf = id => FACTIONS.find(f => f.id === id) || FACTIONS[0];
const audio = new BattleAudio();
let preferences = { sound: false, quality: 'high' };
try { const p = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); preferences = { sound: !!p.sound, quality: p.quality === 'low' ? 'low' : 'high' }; } catch { /* Storage can be disabled. */ }
let game, restored = false, badSave = false;
try { const save = localStorage.getItem(SAVE_KEY); if (save) { game = restoreGame(save); restored = true; if (game.state.status === 'playing') game.state.paused = true; } } catch { badSave = true; }
game ||= createGame({ seed: 42 });
let selectedId = game.state.roster[0]?.unitId || UNITS[0].id, selectedRoster = null, selectedLive = null;
let activeTab = 'army', armedSpell = null, pendingFaction = game.state.faction;
let workspaceKey = '', detailKey = '', lastWave = game.state.wave, resultShown = restored && ['victory', 'defeat'].includes(game.state.status);
let toastTimer, waveTimer, lastSave = 0, lastHud = 0, lastTime = performance.now(), dialogWasRunning = false;
const field = new Battlefield($('battlefield'), {
  onSelect(unit) {
    if (armedSpell && unit) { castAt(unit.x, unit.z); return; }
    if (!unit?.unitId) return;
    selectedId = unit.unitId; selectedLive = unit.rosterId ? null : unit.id;
    if (unit.rosterId && unit.team === 'player') {
      if (selectedRoster && selectedRoster !== unit.rosterId && activeTab === 'formation') {
        const target = game.state.roster.find(r => r.id === unit.rosterId);
        if (target) { perform(game.move(selectedRoster, target.row, target.col), 'select'); selectedRoster = null; }
      } else { selectedRoster = unit.rosterId; setTab('formation'); }
    } else selectedRoster = null;
    renderDetail(true); renderWorkspace(true);
  },
  onGround(x, z) {
    if (armedSpell) { castAt(x, z); return; }
    if (activeTab === 'formation' && selectedRoster) {
      const col = Math.round((x + 33) / 2.4), row = Math.round((z + 7.5) / 3);
      if (col >= 0 && col <= 4 && row >= 0 && row <= 5) { perform(game.move(selectedRoster, row, col), 'select'); selectedRoster = null; renderWorkspace(true); renderDetail(true); }
    }
  },
});
field.setQuality(preferences.quality);

function notify(message, error = false) {
  if (!message) return;
  $('toast').textContent = message; $('toast').classList.toggle('error', error); $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3100);
}
function save() {
  try { localStorage.setItem(SAVE_KEY, game.serialize()); $('save-status').innerHTML = 'PROGRESS SAVED <b>2.0</b>'; }
  catch { $('save-status').textContent = 'SAVE UNAVAILABLE'; }
}
function savePreferences() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences)); } catch { /* Optional preference storage. */ } }
function perform(result, sound = 'select') {
  if (!result.ok) { notify(result.message, true); return false; }
  audio.play(sound); notify(result.message); renderWorkspace(true); renderDetail(true); updateHud(); save(); return true;
}
function ended() { return ['victory', 'defeat'].includes(game.state.status); }
function setTab(tab) {
  activeTab = tab; armedSpell = null; $('cast-prompt').hidden = true;
  field.setTargeting(null); $('battlefield').style.cursor = '';
  field.setMode(tab === 'formation' ? 'formation' : 'battle');
  document.querySelectorAll('[role="tab"][data-tab]').forEach(b => { const active = b.dataset.tab === tab; b.classList.toggle('active', active); b.setAttribute('aria-selected', active); b.id ||= `tab-${b.dataset.tab}`; b.setAttribute('aria-controls', 'workspace-content'); });
  $('workspace-content').setAttribute('aria-labelledby', `tab-${tab}`);
  $('formation-toggle').classList.toggle('active', tab === 'formation');
  renderWorkspace(true); updateHud();
}
function renderWorkspace(force = false) {
  const s = game.state;
  const key = [activeTab, s.faction, s.tier, JSON.stringify(s.research), JSON.stringify(s.roster), selectedId, selectedRoster, activeTab === 'scout' ? JSON.stringify([s.enemyRoster, s.enemy.research]) : '', s.status].join('|');
  if (!force && key === workspaceKey) { updateButtons(); return; }
  workspaceKey = key;
  const root = $('workspace-content'), scroll = root.scrollLeft;
  const focus = document.activeElement;
  const focusAttr = focus && ['recruit', 'inspect', 'research', 'cell'].find(k => focus.dataset?.[k]);
  const focusValue = focusAttr && focus.dataset[focusAttr];
  if (activeTab === 'army') {
    root.innerHTML = `<div class="unit-cards">${UNITS.filter(u => u.faction === s.faction).map(u => {
      const count = s.roster.filter(r => r.unitId === u.id).length;
      return `<article class="unit-card ${selectedId === u.id ? 'selected' : ''} ${s.tier < u.tier ? 'locked' : ''}" data-card="${u.id}"><button class="card-inspect" data-inspect="${u.id}" aria-label="Inspect ${escape(u.name)}" title="${escape(u.name)} · ${escape(u.ability)}&#10;${escape(u.abilityDescription)}"><div class="unit-art portrait" style="${portraitStyle(u)}"><span class="card-tier">${u.hero ? '★' : roman(u.tier)}</span>${count ? `<span class="owned-badge">${count} OWNED</span>` : ''}</div><strong class="card-name">${escape(u.name)}</strong><span class="card-role">${escape(u.role)} · ${u.supply} supply</span></button><button class="recruit-btn" data-recruit="${u.id}" aria-label="Recruit ${escape(u.name)} for ${u.cost} gold"></button></article>`;
    }).join('')}</div>`;
  } else if (activeTab === 'research') {
    const icons = { mines: 'coins', tier: 'castle', weapons: 'sword', armor: 'shield', barracks: 'army' };
    root.innerHTML = `<div class="research-grid">${RESEARCH.map(r => `<article class="research-card"><h3>${icon(icons[r.id])}${escape(r.name)}</h3><p>${escape(r.description)}</p><div class="research-progress" aria-label="Level ${s.research[r.id]} of ${r.maxLevel}">${Array.from({ length: r.maxLevel }, (_, i) => `<i class="${i < s.research[r.id] ? 'done' : ''}"></i>`).join('')}</div><button class="recruit-btn" data-research="${r.id}" aria-label="Research ${escape(r.name)}"></button></article>`).join('')}</div>`;
  } else if (activeTab === 'formation') {
    const chosen = s.roster.find(r => r.id === selectedRoster);
    root.innerHTML = `<div class="formation-panel"><div class="formation-board-wrap"><div class="formation-labels"><span>BACK LINE</span><span>FRONT →</span></div><div class="formation-grid" aria-label="Army formation">${Array.from({ length: 30 }, (_, i) => {
      const row = Math.floor(i / 5), col = i % 5, r = s.roster.find(r => r.row === row && r.col === col), u = r && UNIT_MAP[r.unitId];
      return `<button class="formation-cell ${r ? 'occupied' : ''} ${r?.id === selectedRoster ? 'selected' : ''}" data-cell="${row},${col}" title="${u ? escape(u.name) : 'Empty position'} · row ${row + 1}, column ${col + 1}" aria-label="${u ? escape(u.name) : 'Empty position'}, row ${row + 1}, column ${col + 1}" aria-pressed="${r?.id === selectedRoster}">${u ? `<span class="portrait" style="${portraitStyle(u)}"></span>` : '·'}</button>`;
    }).join('')}</div></div><div class="formation-copy"><h3>Victory starts with a formation.</h3><p>Select a unit, then choose its new position. Occupied positions swap. Changes take effect with the next wave.</p><p class="formation-selection">${chosen ? `${escape(UNIT_MAP[chosen.unitId].name)} selected — choose a position` : 'Shields in front. Healers and siege in the rear.'}</p>${chosen ? `<button class="small-btn" data-sell="${chosen.id}">Dismiss unit · +${Math.floor(UNIT_MAP[chosen.unitId].cost * .7)} gold</button>` : '<button class="small-btn" data-tab="army">Recruit reinforcements</button>'}</div></div>`;
  } else {
    const counts = new Map(); s.enemyRoster.forEach(r => counts.set(r.unitId, (counts.get(r.unitId) || 0) + 1));
    root.innerHTML = `<div class="scout-panel"><div class="scout-copy"><h3>${escape(factionOf(s.enemyFaction).name)}</h3><p>${s.enemyRoster.length} units in their next wave. Inspect their army and recruit counters.</p><p style="margin-top:9px;color:var(--gold)">Age ${roman(s.enemy?.tier || 1)} · ${s.enemy?.mineLevel || 0} mines</p></div><div class="scout-units">${[...counts].map(([id, count]) => { const u = UNIT_MAP[id]; return `<button class="scout-unit" data-inspect="${id}" title="Inspect ${escape(u.name)}"><div class="portrait" style="${portraitStyle(u)}"></div><strong>${escape(u.name)}</strong><small>× ${count} · ${escape(u.role)}</small></button>`; }).join('')}</div></div>`;
  }
  root.scrollLeft = scroll;
  if (focusAttr) root.querySelector(`[data-${focusAttr}="${focusValue}"]`)?.focus({ preventScroll: true });
  updateButtons();
}
function updateButtons() {
  const s = game.state;
  document.querySelectorAll('[data-recruit]').forEach(button => {
    const u = UNIT_MAP[button.dataset.recruit], ownedHero = u.hero && s.roster.some(r => r.unitId === u.id), locked = u.tier > s.tier;
    button.disabled = ended() || locked || ownedHero || s.gold < u.cost || s.supply + u.supply > s.supplyCap || s.roster.length >= 30;
    const content = locked ? `<span class="lock-text">${icon('lock')} Age ${roman(u.tier)}</span>` : ownedHero ? '<span class="lock-text">Hero enlisted</span>' : `<span>${icon('coins')} ${u.cost}</span><span class="plus">＋</span>`;
    if (button.innerHTML !== content) button.innerHTML = content;
    button.title = locked ? `Research Citadel Age ${roman(u.tier)} to unlock` : ownedHero ? 'One hero per army' : s.supply + u.supply > s.supplyCap ? 'Upgrade War Camp for more supply' : s.gold < u.cost ? `${Math.ceil(u.cost - s.gold)} more gold needed` : `Recruit ${u.name} · ${u.supply} supply · joins every wave`;
  });
  document.querySelectorAll('[data-research]').forEach(button => {
    const cost = game.getResearchCost(button.dataset.research), maxed = !Number.isFinite(cost);
    button.disabled = ended() || maxed || s.gold < cost;
    const content = maxed ? '<span class="lock-text">Fully researched</span>' : `<span>${icon('coins')} ${cost}</span><span class="plus">↑</span>`;
    if (button.innerHTML !== content) button.innerHTML = content;
    button.title = maxed ? 'Maximum level reached' : `Research for ${cost} gold`;
  });
}
function renderDetail(force = false) {
  const s = game.state, u = UNIT_MAP[selectedId] || UNIT_MAP[s.roster[0]?.unitId] || UNITS[0];
  const live = s.units.find(unit => unit.id === selectedLive), chosen = s.roster.find(r => r.id === selectedRoster);
  const key = [u.id, chosen?.id, live?.id, Math.ceil(live?.hp || 0), JSON.stringify(s.research), JSON.stringify(s.enemy.research), s.wave, s.roster.filter(r => r.unitId === u.id).length].join('|');
  if (!force && detailKey === key) return; detailKey = key;
  const playerUnit = u.faction === s.faction;
  const heroLevel = u.hero ? 1 + Math.floor(s.wave / 5) : 1;
  const damage = live?.damage ?? u.damage * (1 + (playerUnit ? s.research.weapons : s.enemy.research.weapons) * .12) * (1 + (heroLevel - 1) * .1);
  const hp = live ? Math.ceil(live.hp) : Math.round(u.hp * (1 + (playerUnit ? s.research.armor : s.enemy.research.armor) * .08) * (1 + (heroLevel - 1) * .12));
  const armor = live?.armor ?? u.armor + (playerUnit ? s.research.armor : s.enemy.research.armor) * 2;
  $('unit-detail').innerHTML = `<div class="detail-heading"><div class="portrait detail-portrait" style="${portraitStyle(u)}" role="img" aria-label="${escape(u.name)} portrait"></div><div><h3>${escape(u.name)}</h3><span class="unit-role">${escape(u.role)} · ${live ? `Wave fighter${u.hero ? ` · Lv ${live.level || 1}` : ''}` : `Tier ${roman(u.tier)}`}</span></div></div><p class="detail-description">${escape(u.description)}</p><div class="unit-stat-grid"><span title="${live ? 'Current health' : 'Health of next reinforcement'}">${icon('heart')}${hp}<small>HP</small></span><span title="${escape(u.attackType)} attack damage">${icon('sword')}${Math.round(damage)}<small>ATK</small></span><span title="${escape(u.armorType)} armor">${icon('shield')}${armor}<small>ARM</small></span></div><p class="ability-description"><strong>${escape(u.ability)}</strong>${escape(u.abilityDescription)}</p><div class="counter-row">STRONG VS <span>${escape(u.strongVs?.join(' · ') || 'Balanced armies')}</span></div><div class="counter-row">WEAK VS <span>${escape(u.weakVs?.join(' · ') || 'Balanced counters')}</span></div>`;
}
function renderSpells() {
  $('spells').innerHTML = SPELLS.map((spell, i) => `<button class="spell" data-spell="${spell.id}" aria-label="${escape(spell.name)}: ${escape(spell.description)}" title="${escape(spell.name)} · ${spell.cost} gold · ${spell.cooldown}s cooldown&#10;${escape(spell.description)}"><kbd>${['Q', 'W', 'E'][i]}</kbd>${icon(spell.id)}<strong>${escape(spell.name)}</strong><small id="spell-status-${spell.id}">${spell.cost} gold</small></button>`).join('');
}
function armSpell(id) {
  const s = game.state, spell = SPELLS.find(sp => sp.id === id);
  if (s.status !== 'playing') { notify('Begin the battle to use commander abilities.', true); return; }
  if (s.paused) { notify('Resume the battle to use commander abilities.', true); return; }
  if (s.spellCooldowns[id] > 0) { notify(`${spell.name} is ready in ${Math.ceil(s.spellCooldowns[id])} seconds.`, true); return; }
  if (s.gold < spell.cost) { notify(`You need ${Math.ceil(spell.cost - s.gold)} more gold.`, true); return; }
  armedSpell = armedSpell === id ? null : id;
  if (armedSpell && activeTab === 'formation') { const armed = armedSpell; setTab('army'); armedSpell = armed; }
  $('cast-prompt').hidden = !armedSpell;
  field.setTargeting(armedSpell ? spell : null);
  $('cast-prompt').innerHTML = `${escape(spell.name)} — choose ${id === 'meteor' ? 'enemy' : 'allied'} units on the battlefield<span>${spell.cost} gold · ${spell.radius}m radius · Esc to cancel</span>`;
  $('battlefield').style.cursor = armedSpell ? 'crosshair' : '';
  if (armedSpell && window.innerWidth <= 650) $('battlefield').scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateHud();
}
function castAt(x, z) {
  if (!armedSpell) return;
  const result = game.cast(armedSpell, x, z);
  if (perform(result, 'spell')) cancelSpell();
}
function cancelSpell() { armedSpell = null; field.setTargeting(null); $('cast-prompt').hidden = true; $('battlefield').style.cursor = ''; updateHud(); }
function playPause() {
  if (ended()) { openSettings(); return; }
  if (preferences.sound && !audio.enabled) audio.enable(true);
  if (game.state.status === 'preparation') {
    game.start(); audio.play('wave');
    notify('Your army is marching. Reinforcements arrive every 25 seconds.');
  } else { game.togglePause(); cancelSpell(); }
  updateHud(); renderWorkspace(true); save();
}
function updateHud() {
  const s = game.state, ally = s.structures.find(v => v.id === 'player-castle'), enemy = s.structures.find(v => v.id === 'enemy-castle');
  $('gold').textContent = Math.floor(s.gold).toLocaleString(); $('income').textContent = `+${s.income.toFixed(1)} /s`;
  $('mobile-gold').textContent = Math.floor(s.gold).toLocaleString();
  $('mobile-wave').textContent = s.status === 'preparation' ? 'PREPARATION' : ended() ? s.status.toUpperCase() : `WAVE ${s.wave} · ${Math.ceil(s.nextWave)}s`;
  $('supply').innerHTML = `${s.supply} <i>/ ${s.supplyCap}</i>`; $('tier').textContent = `Age ${roman(s.tier)}`;
  $('age-name').textContent = ['AGE OF IRON', 'AGE OF MAGIC', 'AGE OF LEGENDS'][s.tier - 1];
  $('faction-name').textContent = factionOf(s.faction).name; $('faction-perk').textContent = factionOf(s.faction).perk;
  $('ally-name').textContent = factionOf(s.faction).name.toUpperCase(); $('enemy-name').textContent = factionOf(s.enemyFaction).name.toUpperCase();
  $('ally-hp').textContent = Math.ceil(ally.hp).toLocaleString(); $('enemy-hp').textContent = Math.ceil(enemy.hp).toLocaleString();
  $('ally-fill').style.width = `${100 * ally.hp / ally.maxHp}%`; $('enemy-fill').style.width = `${100 * enemy.hp / enemy.maxHp}%`;
  $('match-clock').textContent = timeText(s.time); $('difficulty-label').textContent = { easy: 'Recruit', normal: 'Veteran', hard: 'Warlord' }[s.difficulty];
  $('wave-label').textContent = ended() ? 'THE BATTLE IS OVER' : s.status === 'preparation' ? 'PREPARE YOUR ARMY' : s.time >= 720 ? 'FINAL SIEGE' : 'REINFORCEMENTS';
  $('wave-value').textContent = ended() ? s.status.toUpperCase() : `WAVE ${roman(Math.max(1, s.wave))}`;
  $('wave-countdown').textContent = ended() ? timeText(s.time) : s.status === 'preparation' ? 'Awaiting your command' : `Next wave in ${Math.ceil(s.nextWave)}s`;
  const control = s.control;
  $('control-label').textContent = control > .7 ? 'Sunwell held by your army' : control < -.7 ? 'Enemy controls the Sunwell' : 'Sunwell contested';
  if (s.status === 'preparation') $('control-label').textContent = 'The Sunwell awaits';
  $('control-fill').style.left = `${control < 0 ? 50 + control * 50 : 50}%`;
  $('control-fill').style.width = `${Math.abs(control) * 50}%`; $('control-fill').style.background = control < 0 ? 'var(--red)' : 'var(--blue)';
  $('control-hint').textContent = Math.abs(control) > .7 ? '+1.8 gold /s to the controlling army' : 'Hold the crossing for bonus income';
  $('kills').textContent = s.stats.kills; $('losses').textContent = s.stats.losses; $('live-units').textContent = `${s.units.filter(u => u.hp > 0).length} ON FIELD`;
  $('roster-count').textContent = `${s.roster.length} in your army`;
  const playing = s.status === 'playing' && !s.paused;
  const playText = ended() ? 'New Campaign' : s.status === 'preparation' ? 'Begin Battle' : s.paused ? 'Resume Battle' : 'Pause Battle';
  $('mobile-play-btn').textContent = playText;
  const playContent = `<span>${icon(playing ? 'pause' : 'swords')}</span><span>${playText}</span><kbd>SPACE</kbd>`;
  if ($('play-btn').innerHTML !== playContent) $('play-btn').innerHTML = playContent;
  $('play-btn').classList.toggle('running', playing);
  $('paused-overlay').hidden = !(s.status === 'playing' && s.paused);
  $('command-hint').textContent = s.status === 'preparation' ? 'Your army returns every 25 seconds' : ended() ? 'Your war story is written.' : `${Math.ceil(s.nextWave)}s until your next reinforcement`;
  document.querySelectorAll('[data-speed]').forEach(button => { const active = +button.dataset.speed === s.speed; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
  document.querySelectorAll('[data-spell]').forEach(button => {
    const id = button.dataset.spell, def = SPELLS.find(sp => sp.id === id), cooldown = s.spellCooldowns[id];
    button.classList.toggle('cooling', cooldown > 0 || s.gold < def.cost || !playing); button.classList.toggle('armed', armedSpell === id);
    button.setAttribute('aria-pressed', armedSpell === id);
    $(`spell-status-${id}`).textContent = cooldown > 0 ? `${Math.ceil(cooldown)}s` : `${def.cost} gold`;
  });
  const status = s.events[0]; if (status) $('status-text').textContent = status.text;
  if (s.wave > lastWave) { lastWave = s.wave; announceWave(); }
  renderWorkspace(); renderDetail(); drawMinimap();
  if (ended() && !resultShown) showResult();
}
function announceWave() {
  $('wave-announcement').hidden = true;
  void $('wave-announcement').offsetWidth;
  $('wave-announcement').textContent = `Wave ${game.state.wave} · To battle!`;
  $('wave-announcement').hidden = false; clearTimeout(waveTimer);
  waveTimer = setTimeout(() => { $('wave-announcement').hidden = true; }, 2750);
  audio.play('wave');
}
function drawMinimap() {
  const ctx = $('minimap').getContext('2d'), s = game.state;
  ctx.fillStyle = '#203b2a'; ctx.fillRect(0, 0, 280, 140);
  ctx.fillStyle = '#304c31';
  for (let i = 0; i < 46; i++) { const x = (i * 67 + 11) % 280, y = i % 2 ? 10 + (i * 19) % 27 : 109 + i % 20; ctx.beginPath(); ctx.arc(x, y, 6 + i % 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#3c6b6d'; ctx.beginPath(); ctx.moveTo(132,0);ctx.lineTo(148,0);ctx.lineTo(153,140);ctx.lineTo(135,140);ctx.fill();
  ctx.fillStyle = '#687054'; ctx.fillRect(12,58,256,24); ctx.fillStyle = '#979577'; ctx.fillRect(129,56,29,28);
  ctx.strokeStyle = '#c2b15d88'; ctx.beginPath();ctx.arc(140,70,10,0,Math.PI*2);ctx.stroke();
  const position = o => [140 + o.x * 2.65, 70 + o.z * 2.3];
  s.structures.forEach(o => { const [x,y] = position(o); ctx.fillStyle = o.hp <= 0 ? '#464d3c' : o.team === 'player' ? '#8bc5d4' : '#d98167'; const w = o.kind === 'castle' ? 9 : 5; ctx.fillRect(x-w/2,y-w/2,w,w); });
  const units = s.status === 'preparation' ? [...s.roster.map(r => ({ ...r, team: 'player', x: -33+r.col*2.4,z:-7.5+r.row*3 })),...s.enemyRoster.map(r => ({ ...r, team: 'enemy', x: 33-r.col*2.4,z:-7.5+r.row*3 }))] : s.units.filter(u=>u.hp>0);
  units.forEach(o => { const [x,y]=position(o); ctx.fillStyle=o.team==='player'?'#87d2e8':'#f49c7d'; ctx.beginPath();ctx.arc(x,y,UNIT_MAP[o.unitId]?.hero?2.8:1.7,0,Math.PI*2);ctx.fill(); });
}
function openDialog(dialog) {
  if (dialog.open) return;
  dialogWasRunning = game.state.status === 'playing' && !game.state.paused;
  if (dialogWasRunning) game.togglePause(); cancelSpell(); dialog.showModal();
}
function closeDialog(dialog) { dialog.close(); }
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('close', () => { if (dialogWasRunning && game.state.status === 'playing' && game.state.paused) game.togglePause(); dialogWasRunning = false; updateHud(); });
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r=dialog.getBoundingClientRect(); if (e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) closeDialog(dialog); } });
});
function openSettings() {
  pendingFaction = game.state.faction; $('difficulty-select').value = game.state.difficulty; $('quality-select').value = preferences.quality;
  renderFactionOptions(); openDialog($('settings-dialog'));
}
function renderFactionOptions() {
  $('faction-options').innerHTML = FACTIONS.map((f,i) => `<button class="faction-option ${pendingFaction===f.id?'active':''}" data-faction="${f.id}" aria-pressed="${pendingFaction===f.id}"><div class="portrait" style="${portraitStyle(UNIT_MAP[f.heroId])}"></div><strong>${escape(f.name)}</strong><small>${escape(f.title)}<br>${escape(f.perk)}</small></button>`).join('');
}
function newMatch() {
  game = createGame({ faction: pendingFaction, difficulty: $('difficulty-select').value, seed: Math.floor(Date.now() % 1000000) });
  preferences.quality = $('quality-select').value; field.setQuality(preferences.quality); savePreferences();
  dialogWasRunning = false; closeDialog($('settings-dialog'));
  selectedId=game.state.roster[0].unitId; selectedRoster=null;selectedLive=null;resultShown=false;lastWave=0;workspaceKey='';detailKey='';
  setTab('army'); field.resetCamera(); updateHud(); save();
  $('wave-announcement').hidden = true;
  notify(`${factionOf(game.state.faction).name} stands ready. Recruit your army, then begin battle.`);
}
function showResult() {
  resultShown=true;cancelSpell();audio.play(game.state.status);save();
  const s=game.state, victory=s.status==='victory';
  $('result-title').textContent=victory?'Victory':'Defeat'; $('result-eyebrow').textContent=victory?'THE CROSSING IS YOURS':'A CROWN HAS FALLEN';
  $('result-copy').textContent=victory?`${factionOf(s.faction).name} has broken the enemy citadel. The banners of your army fly over the crossing.`:'Your citadel has fallen, but a commander learns from every battle. Scout their army, protect your support units, and try a new formation.';
  $('result-stats').innerHTML=`<div><strong>${timeText(s.time)}</strong><small>Battle time</small></div><div><strong>${s.wave}</strong><small>Waves</small></div><div><strong>${s.stats.kills}</strong><small>Defeated</small></div>`;
  try { const record=JSON.parse(localStorage.getItem(RECORD_KEY)||'{}');record.matches=(record.matches||0)+1;if(victory){record.wins=(record.wins||0)+1;record.fastest=Math.min(record.fastest||Infinity,s.time);}localStorage.setItem(RECORD_KEY,JSON.stringify(record)); } catch { /* Optional records. */ }
  openDialog($('result-dialog'));
}
document.addEventListener('click', event => {
  const button=event.target.closest('button');if(!button || button.disabled)return;
  if(button.dataset.inspect){selectedId=button.dataset.inspect;selectedLive=null;selectedRoster=null;renderDetail(true);renderWorkspace(true);audio.play('select');}
  else if(button.dataset.recruit){selectedId=button.dataset.recruit;selectedLive=null;selectedRoster=null;perform(game.recruit(button.dataset.recruit),'recruit');}
  else if(button.dataset.research)perform(game.research(button.dataset.research),'upgrade');
  else if(button.dataset.tab)setTab(button.dataset.tab);
  else if(button.dataset.speed){game.setSpeed(+button.dataset.speed);updateHud();save();}
  else if(button.dataset.spell)armSpell(button.dataset.spell);
  else if(button.dataset.cell){
    const [row,col]=button.dataset.cell.split(',').map(Number), r=game.state.roster.find(r=>r.row===row&&r.col===col);
    if(selectedRoster){if(r?.id===selectedRoster)selectedRoster=null;else{perform(game.move(selectedRoster,row,col),'select');selectedRoster=null;}}
    else if(r){selectedRoster=r.id;selectedId=r.unitId;selectedLive=null;}
    renderWorkspace(true);renderDetail(true);
  }
  else if(button.dataset.sell){perform(game.sell(button.dataset.sell));selectedRoster=null;renderWorkspace(true);}
  else if(button.dataset.faction){pendingFaction=button.dataset.faction;renderFactionOptions();}
  else if(button.hasAttribute('data-close'))closeDialog(button.closest('dialog'));
});
$('play-btn').addEventListener('click',playPause);$('resume-btn').addEventListener('click',playPause);
$('mobile-play-btn').addEventListener('click',playPause);
$('help-btn').addEventListener('click',()=>openDialog($('help-dialog')));
$('settings-btn').addEventListener('click',openSettings);$('faction-btn').addEventListener('click',openSettings);
$('new-match-btn').addEventListener('click',newMatch);
$('formation-toggle').addEventListener('click',()=>setTab(activeTab==='formation'?'army':'formation'));
$('camera-reset').addEventListener('click',()=>field.resetCamera());
$('quality-select').addEventListener('change',()=>{preferences.quality=$('quality-select').value;field.setQuality(preferences.quality);savePreferences();});
$('audio-btn').addEventListener('click',()=>{preferences.sound=audio.enable(!preferences.sound);savePreferences();updateAudioButton();audio.play('select');});
function updateAudioButton(){const b=$('audio-btn');b.innerHTML=icon(preferences.sound?'sound':'muted');b.classList.toggle('active',preferences.sound);b.setAttribute('aria-label',preferences.sound?'Mute sound':'Enable sound');b.title=preferences.sound?'Mute sound':'Enable sound';b.setAttribute('aria-pressed',preferences.sound);}
$('play-again-btn').addEventListener('click',()=>{closeDialog($('result-dialog'));openSettings();});
$('view-field-btn').addEventListener('click',()=>closeDialog($('result-dialog')));
$('minimap').addEventListener('click',event=>{const r=$('minimap').getBoundingClientRect();field.focus(((event.clientX-r.left)/r.width*280-140)/2.65,((event.clientY-r.top)/r.height*140-70)/2.3);});
document.addEventListener('keydown',event=>{
  if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
  if(event.code==='Space' && event.target.closest('button') && !['play-btn','mobile-play-btn','resume-btn'].includes(event.target.closest('button').id))return;
  if(event.target.getAttribute('role')==='tab' && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();const tabs=[...document.querySelectorAll('.army-tabs [role="tab"]')],i=tabs.indexOf(event.target);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;
    setTab(tabs[next].dataset.tab);tabs[next].focus();return;
  }
  if(event.code==='Space'){event.preventDefault();playPause();}
  else if(event.code==='KeyF'){event.preventDefault();setTab(activeTab==='formation'?'army':'formation');}
  else if(['KeyQ','KeyW','KeyE'].includes(event.code)){event.preventDefault();armSpell(SPELLS[['KeyQ','KeyW','KeyE'].indexOf(event.code)].id);}
  else if(event.code==='Escape'){cancelSpell();selectedRoster=null;renderWorkspace(true);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(game.state.status==='playing'&&!game.state.paused)game.togglePause();save();}lastTime=performance.now();updateHud();});
window.addEventListener('pagehide',save);
function frame(now){
  const elapsed=Math.min((now-lastTime)/1000,.15);lastTime=now;
  if(!document.hidden){game.update(elapsed*game.state.speed);field.render(game.state,game.state.paused?0:elapsed*game.state.speed);if(game.state.effects.some(e=>['slash','arrow','explosion'].includes(e.type)))audio.play('hit');}
  if(now-lastHud>150){updateHud();lastHud=now;}
  if(now-lastSave>5000){if(game.state.status==='playing')save();lastSave=now;}
  requestAnimationFrame(frame);
}
renderSpells();setTab('army');updateAudioButton();updateHud();field.render(game.state,0);requestAnimationFrame(frame);
if(restored)notify(game.state.status==='playing'?'Your battle has been restored. Resume when you are ready.':'Your army has been restored.');
else if(badSave)notify('The previous save could not be read. A fresh army stands ready.',true);
// Small integration surface for automated smoke tests and embedders.
window.castleStrike={get game(){return game;},get battlefield(){return field;},get state(){return game.state;},setTab,save};

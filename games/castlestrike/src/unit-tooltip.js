import { FACTIONS, UNIT_MAP } from './data.js';
import { getUnitStats } from './unit-stats.js';
import { concreteCounters } from './combat-ui.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
const selector = '[data-unit-tooltip]';

/** One shared tooltip for roster buttons, keyboard focus, and battlefield picks. */
export class UnitTooltip {
  constructor({ getState, portraitStyle }) {
    this.getState = getState; this.portraitStyle = portraitStyle;
    this.active = null; this.dismissedKey = null; this.modality = 'keyboard';
    this.element = document.createElement('div');
    this.element.id = 'unit-tooltip'; this.element.className = 'unit-tooltip';
    this.element.setAttribute('role', 'tooltip'); this.element.hidden = true;
    document.body.appendChild(this.element);
    document.addEventListener('pointerover', event => {
      this.modality = event.pointerType === 'touch' ? 'touch' : 'pointer';
      if (this.modality === 'touch') return;
      const anchor = event.target.closest(selector);
      if (anchor) this.activateCard(anchor, event.target.closest('button') || anchor);
    });
    document.addEventListener('pointerout', event => {
      const anchor = event.target.closest(selector);
      if (!anchor || anchor.contains(event.relatedTarget) || this.element.contains(event.relatedTarget)) return;
      if (anchor.isConnected) this.dismissedKey = null;
      if (this.active?.anchor === anchor && !this.active.keyboard) this.leave();
    });
    document.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || event.buttons) return;
      this.modality = 'pointer';
      const anchor = event.target.closest(selector);
      if (anchor) this.activateCard(anchor, event.target.closest('button') || anchor);
    });
    document.addEventListener('focusin', event => {
      const anchor = event.target.closest(selector);
      const key = anchor && `card:${anchor.dataset.unitTeam || 'player'}:${anchor.dataset.unitTooltip}`;
      if (key !== this.dismissedKey) this.dismissedKey = null;
      if (anchor && this.modality === 'keyboard') this.activateCard(anchor, event.target, true);
    });
    document.addEventListener('focusout', event => {
      const anchor = event.target.closest(selector);
      if (anchor && !anchor.contains(event.relatedTarget)) {
        // A rerender briefly removes focus, then restores the same unit button.
        // Keep Escape dismissed through that replacement; real focus changes
        // clear the key here or in focusin above.
        if (event.relatedTarget) this.dismissedKey = null;
        if (this.active?.keyboard) this.hide();
      }
    });
    document.addEventListener('pointerdown', event => {
      this.modality = event.pointerType === 'touch' ? 'touch' : 'pointer';
      if (!this.element.contains(event.target)) this.dismiss();
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Tab' || event.key.startsWith('Arrow')) this.modality = 'keyboard';
      if (event.key === 'Escape') this.dismiss();
    }, true);
    document.addEventListener('scroll', event => {
      if (event.target === this.element) return;
      if (this.active?.keyboard) this.position(); else this.hide();
    }, true);
    window.addEventListener('resize', () => this.dismiss());
    window.addEventListener('blur', () => this.dismiss());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.dismiss(); });
    this.element.addEventListener('pointerenter', () => clearTimeout(this.hideTimer));
    this.element.addEventListener('pointerleave', event => {
      if (this.active?.keyboard && this.modality === 'keyboard' && this.active.described === document.activeElement) return;
      if (!this.active?.anchor?.contains(event.relatedTarget)) { this.dismissedKey = null; this.leave(); }
    });
  }

  bindCards(root) {
    const state = this.getState();
    for (const button of root.querySelectorAll('[data-inspect]')) {
      const unit = UNIT_MAP[button.dataset.inspect];
      if (!unit) continue;
      const anchor = button.closest('[data-card]') || button;
      anchor.dataset.unitTooltip = unit.id;
      anchor.dataset.unitTeam = unit.faction === state.faction ? 'player' : 'enemy';
      button.removeAttribute('title');
    }
    for (const button of root.querySelectorAll('[data-cell]')) {
      const [row, col] = button.dataset.cell.split(',').map(Number);
      const entry = state.roster.find(unit => unit.row === row && unit.col === col);
      if (!entry) continue;
      button.dataset.unitTooltip = entry.unitId; button.dataset.unitTeam = 'player';
      button.removeAttribute('title');
    }
  }

  activateCard(anchor, described, keyboard = false) {
    const unitId = anchor.dataset.unitTooltip, team = anchor.dataset.unitTeam || 'player';
    this.activate({ key: `card:${team}:${unitId}`, kind: 'card', unitId, team, anchor, described, keyboard });
  }

  hoverBattlefield(unit, position) {
    if (!unit || position?.pointerType === 'touch') {
      if (this.dismissedKey?.startsWith('field:')) this.dismissedKey = null;
      if (this.active?.kind === 'field') this.leave();
      return;
    }
    // Renderer polling must not take a tooltip away from keyboard focus just
    // because the mouse was left over a fighter before pressing Tab.
    if (this.modality === 'keyboard' && document.activeElement?.closest(selector)) return;
    this.activate({ key: `field:${unit.id}`, kind: 'field', unitId: unit.unitId, team: unit.team, unit, position });
  }

  activate(target) {
    if (!UNIT_MAP[target.unitId] || document.querySelector('dialog[open]') || this.dismissedKey === target.key) return;
    if (this.dismissedKey !== target.key) this.dismissedKey = null;
    clearTimeout(this.hideTimer);
    if (this.active?.key === target.key) {
      // Picking moving units refreshes the source without restarting the delay.
      const prior = this.active;
      this.active = { ...prior, ...target };
      if (prior.described !== target.described) { this.unlink(prior.described); this.link(target.described); }
      if (this.element.hidden && !this.showTimer) this.scheduleShow();
      return;
    }
    clearTimeout(this.showTimer);
    this.unlink(this.active?.described);
    this.active = target; this.content = '';
    if (!this.element.hidden || target.keyboard) this.show();
    else this.scheduleShow();
  }

  scheduleShow() { this.showTimer = setTimeout(() => { this.showTimer = null; this.show(); }, 140); }

  show() {
    if (!this.active || document.querySelector('dialog[open]')) { this.hide(); return; }
    this.element.hidden = false;
    this.refresh();
    if (this.active) this.link(this.active.described);
  }

  refresh() {
    if (!this.active || this.element.hidden) return;
    const target = this.active, state = this.getState(), unit = UNIT_MAP[target.unitId];
    if (document.querySelector('dialog[open]') || (target.anchor && !target.anchor.isConnected)) { this.hide(); return; }
    const live = target.kind === 'field' && !target.unit.rosterId ? state.units.find(u => u.id === target.unit.id) : null;
    if (target.kind === 'field' && !target.unit.rosterId && (!live || live.hp <= 0)) { this.hide(); return; }
    const stats = getUnitStats(state, target.unitId, { team: target.team, live });
    if (!stats) { this.hide(); return; }
    const faction = FACTIONS.find(f => f.id === unit.faction);
    const matchups = concreteCounters(unit, target.team === 'player' ? state.enemyFaction : state.faction);
    const recruit = target.anchor?.querySelector('[data-recruit]');
    const stat = (label, value, detail) => `<div><dt>${label}</dt><dd>${value}</dd><small>${escape(detail)}</small></div>`;
    const html = `<div class="tooltip-heading"><div class="portrait tooltip-portrait" style="${this.portraitStyle(unit)}"></div><div><span class="tooltip-allegiance">${target.team === 'enemy' ? 'Enemy' : 'Your army'} · ${escape(faction?.name)}</span><h3>${escape(unit.name)}</h3><p>${escape(unit.role)} · Age ${['', 'I', 'II', 'III'][unit.tier] || unit.tier}${unit.hero ? ` · Level ${stats.level}` : ''}</p></div></div>
      <div class="tooltip-health"><span>Health</span><strong>${number(Math.ceil(stats.health))} / ${number(stats.maxHp)}</strong><i style="--health:${Math.max(0, Math.min(100, stats.health / stats.maxHp * 100))}%"></i></div>
      <dl class="tooltip-stats">${stat('Attack', number(stats.damage), stats.attackType)}${stat('Armor', number(stats.armor), stats.armorType)}${stat('Attack time', `${number(stats.attackInterval)}s`, 'between attacks')}${stat('Range', `${number(stats.range)}m`, 'weapon reach')}${stat('Movement', `${number(stats.speed)}m/s`, 'move speed')}${stat('Supply', number(live?.summonedBy ? 0 : unit.supply), live?.summonedBy ? 'summoned unit' : `${unit.cost} gold to recruit`)}</dl>
      ${stats.shield > 0 ? `<div class="tooltip-shield">${number(stats.shield)} shield remaining</div>` : ''}
      ${stats.statuses?.length ? `<div class="tooltip-statuses">${stats.statuses.map(status => `<span>${escape(status)}</span>`).join('')}</div>` : ''}
      <p class="tooltip-ability"><strong>${escape(unit.ability)}</strong>${escape(unit.abilityDescription)}</p>
      <div class="tooltip-counters"><p><b>Strong vs</b> ${escape(matchups.strong.map(u => u.name).join(' · ') || unit.strongVs?.join(' · '))}</p><p><b>Answered by</b> ${escape(matchups.weak.map(u => u.name).join(' · ') || unit.weakVs?.join(' · '))}</p></div>
      ${recruit?.disabled ? `<p class="tooltip-recruit-hint">${escape(recruit.dataset.recruitHint)}</p>` : ''}
      <div class="tooltip-footer">${live ? 'Current fighter · includes active effects' : 'Next reinforcement · includes research'}<span>Esc to dismiss</span></div>`;
    if (html !== this.content) { this.element.innerHTML = html; this.content = html; }
    this.element.dataset.team = target.team;
    this.position();
  }

  position() {
    const target = this.active, margin = 12, width = this.element.offsetWidth, height = this.element.offsetHeight;
    let left, top;
    if (target.kind === 'card') {
      const rect = target.anchor.getBoundingClientRect();
      left = rect.left + rect.width / 2 - width / 2;
      top = rect.top - height - 10;
      if (top < margin) top = rect.bottom + 10;
    } else {
      left = target.position.clientX + 19; top = target.position.clientY + 16;
      if (left + width > innerWidth - margin) left = target.position.clientX - width - 19;
      if (top + height > innerHeight - margin) top = target.position.clientY - height - 16;
    }
    this.element.style.left = `${Math.max(margin, Math.min(left, innerWidth - width - margin))}px`;
    this.element.style.top = `${Math.max(margin, Math.min(top, innerHeight - height - margin))}px`;
  }

  link(element) {
    if (!element || this.element.hidden) return;
    const ids = new Set((element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    ids.add(this.element.id); element.setAttribute('aria-describedby', [...ids].join(' '));
  }

  unlink(element) {
    if (!element) return;
    const ids = (element.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== this.element.id);
    if (ids.length) element.setAttribute('aria-describedby', ids.join(' ')); else element.removeAttribute('aria-describedby');
  }

  leave() { clearTimeout(this.showTimer); this.showTimer = null; clearTimeout(this.hideTimer); this.hideTimer = setTimeout(() => this.hide(), 100); }
  dismiss() { this.dismissedKey = this.active?.key || this.dismissedKey; this.hide(); }
  reset() { this.dismissedKey = null; this.hide(); }
  hide() {
    clearTimeout(this.showTimer); clearTimeout(this.hideTimer);
    this.showTimer = null;
    this.unlink(this.active?.described); this.active = null; this.content = ''; this.element.hidden = true;
  }
}

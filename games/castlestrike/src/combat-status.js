// The same status list powers battlefield markers and the selected-unit readout.
export const COMBAT_STATUSES = [
  { id: 'stun', label: 'Stunned', symbol: '✦', color: '#ffe597', active: u => u.stunTime > 0 },
  { id: 'root', label: 'Rooted', symbol: '#', color: '#e6c389', active: u => u.rootTime > 0 },
  { id: 'curse', label: 'Cursed', symbol: '◉', color: '#d5a0ff', active: u => u.curseTime > 0 },
  { id: 'poison', label: 'Poisoned', symbol: '♦', color: '#aee776', active: u => u.poisonTime > 0 },
  { id: 'slow', label: 'Slowed', symbol: '❄', color: '#8ce2ff', active: u => u.slowTime > 0 },
  { id: 'armorBreak', label: 'Armor broken', symbol: 'ϟ', color: '#ffb680', active: u => u.armorBreak > 0 },
  { id: 'shield', label: 'Shielded', symbol: '◇', color: '#a3dfff', active: u => u.shield > 0 },
  { id: 'haste', label: 'Hastened', symbol: '»', color: '#ffd274', active: u => u.hasteTime > 0 || u.rallyTime > 0 },
];
export const activeStatuses = unit => unit?.hp > 0 ? COMBAT_STATUSES.filter(status => status.active(unit)) : [];

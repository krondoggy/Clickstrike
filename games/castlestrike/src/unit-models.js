import * as THREE from '../vendor/three.module.js';
import { attackPose, ease, lerp } from './render-motion.js';

// Every model is original, made from shared low-poly geometry. Vertex colours let
// an entire articulated body part render in a single draw call.
export const armyMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82, metalness: .13, flatShading: true });
const geometries = new Map();
const templates = new Map();
const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const position = new THREE.Vector3();
const scaling = new THREE.Vector3();
const euler = new THREE.Euler();

export function geometry(kind = 'box') {
  if (!geometries.has(kind)) {
    let g;
    if (kind === 'box') g = new THREE.BoxGeometry(1, 1, 1);
    else if (kind === 'sphere') g = new THREE.IcosahedronGeometry(.5, 1);
    else if (kind === 'foliage') g = new THREE.IcosahedronGeometry(.5, 2);
    else if (kind === 'rock') g = new THREE.IcosahedronGeometry(.5, 0);
    else if (kind === 'cone') g = new THREE.ConeGeometry(.5, 1, 7);
    else if (kind === 'pyramid') g = new THREE.ConeGeometry(.5, 1, 4);
    else if (kind === 'cylinder') g = new THREE.CylinderGeometry(.5, .5, 1, 8);
    else if (kind === 'taper') g = new THREE.CylinderGeometry(.35, .5, 1, 7);
    else if (kind === 'torus') g = new THREE.TorusGeometry(.5, .075, 4, 12);
    else if (kind === 'blade') {
      const shape = new THREE.Shape();
      shape.moveTo(-.13, 0); shape.lineTo(-.12, .78); shape.lineTo(0, 1); shape.lineTo(.12, .78); shape.lineTo(.13, 0); shape.closePath();
      g = new THREE.ExtrudeGeometry(shape, { depth: .045, bevelEnabled: false });
    } else g = new THREE.BoxGeometry(1, 1, 1);
    geometries.set(kind, g.index ? g.toNonIndexed() : g);
  }
  return geometries.get(kind);
}

export function part(parts, kind, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  parts.push({ kind, color, x, y, z, sx, sy, sz, rx, ry, rz });
}

export function bake(parts) {
  const vertices = [], normals = [], colors = [], uvs = [];
  const normalMatrix = new THREE.Matrix3();
  const v = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  for (const p of parts) {
    position.set(p.x, p.y, p.z); scaling.set(p.sx, p.sy, p.sz);
    quaternion.setFromEuler(euler.set(p.rx, p.ry, p.rz));
    matrix.compose(position, quaternion, scaling); normalMatrix.getNormalMatrix(matrix);
    const g = geometry(p.kind), a = g.attributes.position, b = g.attributes.normal, uv = g.attributes.uv;
    c.set(p.color);
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i).applyMatrix4(matrix);
      n.fromBufferAttribute(b, i).applyNormalMatrix(normalMatrix);
      vertices.push(v.x, v.y, v.z); normals.push(n.x, n.y, n.z); colors.push(c.r, c.g, c.b);
      uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  result.computeBoundingSphere();
  return result;
}

export function bakedMesh(parts, material = armyMaterial) {
  const mesh = new THREE.Mesh(bake(parts), material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function sword(p, x, y, z, gold, length = 1.1) {
  part(p, 'cylinder', '#493323', x, y, z, .11, .3, .11);
  part(p, 'box', gold, x, y + .16, z, .47, .09, .14);
  part(p, 'blade', '#cbdcdf', x, y + .2, z, 1.1, length, 1.1);
  part(p, 'sphere', gold, x, y - .17, z, .15, .15, .15);
}

function staff(p, x, y, z, color, crystal) {
  part(p, 'cylinder', '#6f4b2c', x, y, z, .12, 2.65, .12);
  part(p, 'torus', color, x, y + 1.25, z, .6, .6, .6);
  part(p, 'rock', crystal, x, y + 1.25, z, .38, .62, .38);
  part(p, 'cylinder', color, x, y + .52, z, .17, .1, .17);
}

function wingGeometry(color, large = false) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(.55, .45); shape.lineTo(1.7, .55);
  shape.lineTo(3.1, .12); shape.lineTo(2.35, -.18); shape.lineTo(2.25, -.45);
  shape.lineTo(1.5, -.33); shape.lineTo(1.27, -.64); shape.lineTo(.7, -.45); shape.lineTo(0, -.3);
  const g = new THREE.ExtrudeGeometry(shape, { depth: large ? .1 : .07, bevelEnabled: false });
  const non = g.index ? g.toNonIndexed() : g, col = new THREE.Color(color), colors = [];
  for (let i = 0; i < non.attributes.position.count; i++) colors.push(col.r, col.g, col.b);
  non.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  non.rotateX(-Math.PI / 2);
  if (non !== g) g.dispose();
  return non;
}

function buildTemplate(model, team) {
  const blue = team === 'player';
  const cloth = blue ? '#286ab4' : '#a52d36';
  const bright = blue ? '#5fc9e7' : '#ef7657';
  const trim = '#d7b465', iron = '#98a5a4', darkIron = '#485b64', leather = '#634332';
  const undead = ['ghoul', 'cryptfiend', 'skeleton', 'necromancer', 'abomination', 'banshee', 'frostwyrm', 'deathknight'].includes(model);
  const orc = ['grunt', 'headhunter', 'raider', 'shaman', 'tauren', 'wyvern', 'blademaster'].includes(model);
  const skin = undead ? '#b2c9a2' : orc ? '#82a65b' : '#d8b18a';
  const body = [], rightArm = [], leftArm = [], leftLeg = [], rightLeg = [], extra = [];
  const chunks = [], addChunk = (name, parts, offset) => { if (parts.length) chunks.push({ name, geometry: bake(parts), offset }); };
  const mounted = ['knight', 'raider', 'deathknight'].includes(model);
  const flying = ['gryphon', 'wyvern', 'frostwyrm'].includes(model);
  let height = 2.8, scale = 1.12;
  const bulky = ['tauren', 'abomination'].includes(model);
  const robe = ['priest', 'mage', 'shaman', 'necromancer', 'banshee'].includes(model);
  const archer = ['archer', 'headhunter'].includes(model);

  if (model === 'catapult') {
    part(body, 'box', leather, 0, .68, 0, 1.8, .35, 2.2);
    part(body, 'box', darkIron, 0, 1.1, -.2, 1.2, .38, .8);
    for (const x of [-.95, .95]) for (const z of [-.75, .75]) {
      const wheel = [];
      part(wheel, 'cylinder', '#372e27', 0, 0, 0, .88, .25, .88, 0, 0, Math.PI / 2);
      part(wheel, 'cylinder', trim, Math.sign(x) * .13, 0, 0, .24, .03, .24, 0, 0, Math.PI / 2);
      for (let i = 0; i < 3; i++) part(wheel, 'box', '#947444', Math.sign(x) * .14, 0, 0, .035, .7, .055, i * Math.PI / 3);
      addChunk(`wheel${x < 0 ? 'L' : 'R'}${z < 0 ? 'B' : 'F'}`, wheel, [x, .55, z]);
    }
    part(body, 'box', cloth, 0, 1.33, -.4, .85, .06, .7);
    part(rightArm, 'box', '#8c6440', 0, .25, .3, .22, .24, 2.8, -.47);
    part(rightArm, 'sphere', '#565955', 0, .83, 1.46, .7, .65, .7);
    part(rightArm, 'box', trim, 0, .06, -.8, .36, .33, .3);
    addChunk('body', body, [0, 0, 0]); addChunk('weapon', rightArm, [0, 1.2, 0]);
    return { chunks, height: 2.8, scale: 1.12, type: 'siege' };
  }

  if (model === 'cryptfiend') {
    part(body, 'sphere', '#514d60', 0, 1.05, -.35, 1.35, 1.0, 1.8);
    part(body, 'sphere', '#94a57f', 0, 1.35, .61, .82, .72, .7);
    part(body, 'cone', '#cbbd95', -.37, 1.2, 1.07, .2, .9, .2, 1.2, 0, -.25);
    part(body, 'cone', '#cbbd95', .37, 1.2, 1.07, .2, .9, .2, 1.2, 0, .25);
    for (let i = -1; i <= 1; i++) {
      for (const side of [-1, 1]) {
        const limb = side < 0 ? leftLeg : rightLeg;
        part(limb, 'box', '#635773', side * .8, .8, i * .63, 1.75, .18, .2, 0, side * .3, side * -.55);
        part(limb, 'cone', '#bcb48a', side * 1.46, .36, i * .8, .18, .9, .17, 0, 0, side * -.22);
      }
    }
    for (const x of [-.19, .19]) part(body, 'sphere', bright, x, 1.47, .93, .16, .12, .12);
    addChunk('body', body, [0, 0, 0]); addChunk('legL', leftLeg, [0, 0, 0]); addChunk('legR', rightLeg, [0, 0, 0]);
    return { chunks, height: 2.2, scale: 1.15, type: 'spider' };
  }

  if (flying) {
    const beast = model === 'gryphon' ? '#a98856' : model === 'frostwyrm' ? '#9bc8c9' : '#7c944d';
    part(body, 'sphere', beast, 0, .25, 0, 1.1, 1.0, 2.2);
    part(body, 'sphere', model === 'gryphon' ? '#e2d5b2' : beast, 0, .72, .87, .74, .82, .9);
    part(body, 'cone', model === 'gryphon' ? '#d3a74f' : '#b7d8c3', 0, .56, 1.44, .35, .8, .33, Math.PI / 2);
    part(body, 'cone', beast, 0, .03, -1.4, .54, 1.8, .5, -Math.PI / 2);
    for (const side of [-1, 1]) {
      part(body, 'sphere', '#f8e0a0', side * .24, .86, 1.16, .12, .1, .1);
      part(body, 'cone', '#e5dfc4', side * .4, -.48, .47, .22, .7, .24, .35);
    }
    part(body, 'box', cloth, 0, .9, -.2, .72, .36, .84);
    part(body, 'sphere', skin, 0, 1.38, -.12, .47, .5, .45);
    part(body, 'sphere', darkIron, 0, 1.57, -.16, .56, .34, .53);
    if (model === 'frostwyrm') for (let i = 0; i < 6; i++) part(body, 'cone', '#e2f5ec', 0, .8, -1.2 + i * .32, .19, .52, .2, -.2);
    addChunk('body', body, [0, 0, 0]);
    chunks.push({ name: 'wingL', geometry: wingGeometry(model === 'gryphon' ? '#c7b27b' : beast), offset: [-.36, .48, 0], wing: -1 });
    chunks.push({ name: 'wingR', geometry: wingGeometry(model === 'gryphon' ? '#c7b27b' : beast), offset: [.36, .48, 0], wing: 1 });
    return { chunks, height: 4.6, scale: 1.08, type: 'flying' };
  }

  const width = bulky ? 1.48 : orc ? .95 : .78;
  const torsoColor = robe ? (model === 'priest' ? '#e1debf' : model === 'banshee' ? '#8bbbb4' : cloth) : (undead ? '#667276' : orc ? '#67563b' : iron);
  part(body, robe ? 'taper' : 'box', torsoColor, 0, 1.4, 0, width, 1.06, .62);
  part(body, 'box', cloth, 0, 1.28, .34, width * .65, .67, .055);
  part(body, 'box', leather, 0, .98, 0, width + .04, .15, .64);
  part(body, 'box', trim, 0, .98, .35, .18, .18, .06);
  part(body, 'sphere', skin, 0, 2.09, .035, .62, .7, .59);
  part(body, 'box', skin, 0, 2.03, .33, .18, .19, .19);
  if (undead) {
    for (const side of [-1, 1]) part(body, 'sphere', '#83e5c9', side * .16, 2.2, .3, .13, .09, .085);
  } else {
    for (const side of [-1, 1]) part(body, 'box', '#263f37', side * .145, 2.19, .304, .085, .06, .04);
  }
  if (['footman', 'spearman', 'knight', 'paladin', 'deathknight'].includes(model)) {
    part(body, 'sphere', darkIron, 0, 2.36, 0, .75, .42, .72);
    part(body, 'box', iron, 0, 2.18, .34, .59, .12, .085);
    part(body, 'box', '#202f32', 0, 2.2, .391, .41, .048, .025);
    part(body, 'box', trim, 0, 2.33, .38, .06, .38, .06);
    part(body, 'box', cloth, 0, 2.64, -.055, .14, .37, .42);
  } else if (robe || model === 'archer') {
    part(body, 'sphere', model === 'priest' ? '#d4d9bb' : cloth, 0, 2.28, -.07, .8, .66, .7);
    part(body, 'box', '#363d39', 0, 2.11, .288, .53, .42, .04);
    part(body, 'sphere', skin, 0, 2.11, .33, .4, .4, .17);
    if (model === 'mage') part(body, 'cone', cloth, 0, 2.73, -.06, .74, .88, .66, 0, 0, -.15);
    if (model === 'priest') part(body, 'cone', '#e4dfc6', 0, 1.88, .31, .34, .49, .16, 0, 0, Math.PI);
  } else if (orc) {
    part(body, 'box', '#382e25', 0, 2.41, -.12, .5, .18, .52);
    for (const side of [-1, 1]) {
      part(body, 'cone', skin, side * .4, 2.2, -.02, .26, .48, .25, 0, 0, side * 1.1);
      part(body, 'cone', '#e9e0bc', side * .21, 1.99, .36, .115, .28, .12, .2, 0, side * -.18);
    }
  }
  const shoulderColor = bulky || orc ? '#615c53' : darkIron;
  for (const side of [-1, 1]) {
    part(body, 'sphere', shoulderColor, side * width * .68, 1.74, 0, .57, .45, .66);
    part(body, 'box', trim, side * width * .68, 1.75, .31, .39, .08, .06);
    if (orc || model === 'deathknight') for (const z of [-.15, .15]) part(body, 'cone', '#d9d1af', side * width * .71, 2.02, z, .14, .36, .14, 0, 0, side * -.25);
  }
  if (!['ghoul', 'skeleton', 'abomination', 'tauren'].includes(model)) {
    part(body, 'box', cloth, 0, 1.39, -.4, width * .93, 1.2, .11, -.11);
    part(body, 'box', trim, 0, .83, -.47, width * .95, .09, .13);
  }
  for (const side of [-1, 1]) {
    const arm = side < 0 ? leftArm : rightArm;
    part(arm, 'box', robe ? torsoColor : skin, 0, -.31, 0, .28, .59, .32, -.08);
    part(arm, 'box', darkIron, 0, -.61, .1, .34, .29, .36);
    part(arm, 'sphere', skin, 0, -.8, .17, .3, .28, .3);
    const leg = side < 0 ? leftLeg : rightLeg;
    part(leg, 'box', robe ? torsoColor : darkIron, 0, -.32, 0, .3, .64, .36);
    part(leg, 'box', leather, 0, -.64, .12, .37, .32, .55);
  }
  if (robe) part(body, 'taper', torsoColor, 0, .61, -.015, 1.08, .97, .78);
  if (['footman', 'knight', 'deathknight', 'paladin', 'skeleton'].includes(model)) {
    part(leftArm, 'box', trim, -.14, -.53, .37, .72, .99, .15);
    part(leftArm, 'box', cloth, -.14, -.53, .465, .58, .82, .06);
    part(leftArm, 'box', trim, -.14, -.53, .51, .09, .58, .025);
    part(leftArm, 'box', trim, -.14, -.39, .51, .39, .09, .025);
    part(leftArm, 'pyramid', trim, -.14, -1.03, .38, .68, .25, .19, 0, 0, Math.PI);
    if (model === 'paladin') {
      part(rightArm, 'cylinder', leather, 0, -.41, .25, .13, 1.25, .13);
      part(rightArm, 'box', '#c5c9be', 0, .16, .25, .85, .46, .46);
      part(rightArm, 'box', trim, 0, .16, .5, .3, .32, .045);
    } else sword(rightArm, 0, -.8, .3, trim, model === 'deathknight' ? 1.5 : 1.18);
  } else if (model === 'spearman' || model === 'headhunter') {
    part(rightArm, 'cylinder', leather, 0, -.26, .27, .095, 3.4, .095, .17);
    part(rightArm, 'cone', '#dbe0ca', 0, 1.47, .56, .3, .62, .2, .17);
    part(leftArm, 'cylinder', cloth, -.12, -.53, .35, .79, .17, .79, Math.PI / 2);
    part(leftArm, 'sphere', trim, -.12, -.53, .48, .23, .23, .14);
  } else if (archer) {
    part(leftArm, 'torus', '#b59c62', -.02, -.37, .5, .5, 1.35, .45);
    part(leftArm, 'box', '#e7d7b0', -.02, -.37, .51, .025, 1.22, .025);
    part(rightArm, 'cylinder', '#ceb589', 0, -.52, .55, .043, 1.65, .043, Math.PI / 2, 0, -.2);
    part(body, 'cylinder', leather, .3, 1.47, -.6, .3, 1.09, .32, 0, 0, -.2);
    for (let i = 0; i < 3; i++) part(body, 'box', '#cfdfc0', .22 + i * .08, 2.1 + i * .06, -.6, .05, .29, .09);
  } else if (robe) {
    staff(rightArm, 0, -.05, .28, trim, model === 'necromancer' ? '#71d9a4' : '#80daf1');
    if (model === 'priest') {
      part(leftArm, 'box', '#724e3c', 0, -.69, .3, .49, .15, .53, -.35);
      part(leftArm, 'box', '#eee7bb', 0, -.59, .3, .42, .035, .43, -.35);
    }
  } else if (['grunt', 'raider', 'tauren', 'abomination'].includes(model)) {
    part(rightArm, 'cylinder', leather, 0, -.16, .27, .14, 1.6, .14);
    part(rightArm, 'box', iron, .17, .47, .27, .8, .57, .2, 0, 0, -.22);
    part(rightArm, 'blade', '#d5d5bd', .47, .22, .16, 1.4, .68, 2.5, 0, 0, -.4);
    if (model === 'tauren') {
      part(body, 'sphere', '#71563f', 0, 2.21, .23, 1.08, .8, .84);
      for (const side of [-1, 1]) part(body, 'cone', '#e1d6ad', side * .64, 2.58, .02, .32, .96, .3, 0, 0, -side * .75);
    }
    if (model === 'abomination') {
      part(body, 'sphere', '#adb586', 0, 1.2, .32, 1.69, 1.55, 1.07);
      part(body, 'box', '#564b42', 0, 1.12, .9, .12, .95, .06, 0, 0, -.31);
      for (let i = 0; i < 4; i++) part(body, 'box', '#c2bda6', -.1 + i * .075, .84 + i * .17, .94, .31, .04, .035, 0, 0, -.22);
    }
  } else if (model === 'blademaster') {
    sword(rightArm, 0, -.65, .3, trim, 1.85);
    part(body, 'cone', '#c5ac65', 0, 2.64, -.05, 1.4, .35, 1.15);
    part(body, 'box', cloth, 0, 2.01, -.62, .75, .85, .055);
  } else {
    for (const arm of [leftArm, rightArm]) for (let i = 0; i < 3; i++) part(arm, 'cone', '#d9dfc2', -.12 + i * .12, -.94, .29, .07, .48, .075, .68);
  }
  let bodyOffset = mounted ? .8 : 0;
  if (mounted) {
    const horse = [], horseColor = model === 'deathknight' ? '#52656a' : model === 'raider' ? '#9a927e' : '#aa845c';
    part(horse, 'sphere', horseColor, 0, .94, -.15, .9, 1.14, 1.99);
    part(horse, 'box', cloth, 0, 1.25, -.25, 1.04, .53, 1.11);
    part(horse, 'box', trim, 0, 1.01, -.25, 1.08, .07, 1.12);
    part(horse, 'sphere', horseColor, 0, 1.55, .84, .57, 1.34, .67, .4);
    part(horse, 'sphere', horseColor, 0, 1.95, 1.24, .48, .49, .82);
    part(horse, 'box', darkIron, 0, 1.99, 1.42, .55, .33, .45, -.18);
    part(horse, 'box', '#303833', 0, 1.57, .59, .14, 1.14, .24, .37);
    part(horse, 'cone', '#333934', 0, .95, -1.25, .33, 1.03, .33, -.75);
    for (const side of [-1, 1]) part(horse, 'cone', horseColor, side * .18, 2.28, 1.09, .18, .37, .17);
    addChunk('horse', horse, [0, 0, 0]);
    for (const z of [-.77, .62]) for (const side of [-1, 1]) {
      const hoof = [];
      part(hoof, 'box', horseColor, 0, -.33, 0, .2, .72, .24);
      part(hoof, 'box', '#3b3531', 0, -.7, .05, .24, .2, .32);
      addChunk(`hoof${side < 0 ? 'L' : 'R'}${z < 0 ? 'B' : 'F'}`, hoof, [side * .32, .84, z]);
    }
    height = 3.65;
  }
  addChunk('body', body, [0, bodyOffset, 0]);
  addChunk('armL', leftArm, [-width * .76, 1.66 + bodyOffset, .03]);
  addChunk('armR', rightArm, [width * .76, 1.66 + bodyOffset, .03]);
  addChunk('legL', leftLeg, [-.24, .84 + bodyOffset, 0]);
  addChunk('legR', rightLeg, [.24, .84 + bodyOffset, 0]);
  if (bulky) { scale = 1.37; height = 3.7; }
  if (model === 'ghoul') scale = .98;
  return { chunks, height, scale, type: mounted ? 'mounted' : model === 'banshee' ? 'ghost' : 'humanoid' };
}

export function createUnitModel(model, team = 'player') {
  const key = `${model}:${team}`;
  if (!templates.has(key)) templates.set(key, buildTemplate(model, team));
  const template = templates.get(key), root = new THREE.Group(), limbs = {};
  for (const chunk of template.chunks) {
    const mesh = new THREE.Mesh(chunk.geometry, armyMaterial);
    mesh.position.fromArray(chunk.offset);
    mesh.userData.restPosition = mesh.position.clone();
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (chunk.wing) {
      mesh.scale.x = chunk.wing;
      mesh.material = armyMaterial;
    }
    root.add(mesh); limbs[chunk.name] = mesh;
  }
  root.scale.setScalar(template.scale);
  root.userData = { limbs, type: template.type, height: template.height, model, phase: Math.random() * Math.PI * 2, baseScale: template.scale };
  return root;
}

export function animateUnit(root, unit, time) {
  const data = root.userData, { limbs: l, phase, type, baseScale, model } = data;
  const motion = unit.motion || { delta: 0, walk: unit.action === 'walk' ? 1 : 0, speed: unit.speed || 2, attack: Infinity, hit: 0, death: unit.action === 'dead' ? 1 : 0, spawn: 1 };
  data.walkBlend = lerp(data.walkBlend ?? motion.walk, motion.walk, 1 - Math.exp(-motion.delta * 12));
  data.stridePhase = (data.stridePhase ?? phase) + motion.delta * Math.min(14, Math.max(5, motion.speed * (type === 'mounted' ? 3.3 : 4.1))) * data.walkBlend;
  data.wheelAngle = (data.wheelAngle || 0) + motion.delta * motion.speed * data.walkBlend / .44;
  const gait = Math.sin(data.stridePhase), stride = gait * .59 * data.walkBlend;
  const idle = Math.sin(time * 2 + phase), { windup, strike, strength } = attackPose(motion.attack);
  for (const limb of Object.values(l)) { limb.position.copy(limb.userData.restPosition); limb.rotation.set(0, 0, 0); }
  if (l.legL) l.legL.rotation.x = type === 'mounted' ? -.23 : stride;
  if (l.legR) l.legR.rotation.x = type === 'mounted' ? -.23 : -stride;
  if (l.armL) l.armL.rotation.x = -stride * .36 - .07 - strength * .28;
  if (l.armR) { l.armR.rotation.x = stride * .4 + windup * .6 - strike * 1.75; l.armR.rotation.z = -windup * .35 - strike * .14; }
  if (l.body) { l.body.rotation.y = windup * -.12 + strike * .2; l.body.rotation.x = -strike * .09; l.body.position.y += idle * .014; }
  if (['archer'].includes(model)) {
    l.armL.rotation.x = -strength * 1.25; l.armL.rotation.y = -.12 * strength;
    l.armR.rotation.x = -strength * 1.08; l.armR.rotation.y = -windup * .65 + strike * .25;
    l.armR.position.z -= windup * .23;
  } else if (['priest', 'mage', 'shaman', 'necromancer', 'banshee'].includes(model)) {
    l.armR.rotation.x = windup * -.55 - strike * 1.08; l.armR.rotation.z = -windup * .32;
    l.armL.rotation.x = -strength * .9; l.armL.rotation.z = strength * .3;
    l.body.rotation.y = windup * -.08 + strike * .12;
  } else if (['spearman', 'headhunter'].includes(model)) {
    l.armR.rotation.x = -strength * .85 - strike * .35;
    l.armR.position.z += strike * .5 - windup * .28;
    l.body.rotation.y = windup * -.16 + strike * .22;
  } else if (model === 'ghoul') {
    l.armL.rotation.x = -strike * 1.3 + windup * .4;
    l.armR.rotation.x = -strike * 1.7 + windup * .6;
  }
  for (const [name, limb] of Object.entries(l)) {
    if (name.startsWith('hoof')) {
      const opposite = name === 'hoofLF' || name === 'hoofRB';
      limb.rotation.x = stride * (opposite ? .82 : -.82);
      limb.position.y += Math.max(0, gait * (opposite ? 1 : -1)) * .1 * data.walkBlend;
    }
    if (name.startsWith('wheel')) limb.rotation.x = data.wheelAngle;
  }
  if (l.horse) l.horse.rotation.x = -stride * .045;
  if (l.weapon) l.weapon.rotation.x = windup * -.4 + strike * 1.4;
  if (type === 'spider') {
    l.legL.rotation.set(0, stride * .21, stride * .15); l.legR.rotation.set(0, -stride * .21, -stride * .15);
    l.body.rotation.x = -strike * .2;
  }
  if (type === 'flying') {
    l.wingL.rotation.z = -Math.sin(time * 5.8 + phase) * .46;
    l.wingR.rotation.z = Math.sin(time * 5.8 + phase) * .46;
    l.body.rotation.x = -strike * .22;
  }
  const bob = (1 - Math.cos(data.stridePhase * 2)) * .035 * data.walkBlend;
  root.position.y = type === 'flying' ? 3.8 + idle * .2 : type === 'ghost' ? .38 + idle * .13 : type === 'siege' ? bob * .16 : bob;
  const death = ease(motion.death), hit = Math.sin(motion.hit * Math.PI) * .065;
  root.rotation.x = hit;
  root.rotation.z = -death * Math.PI * .48;
  root.position.y = lerp(root.position.y, .12 - ease((motion.death - .75) / .25) * .65, death);
  root.scale.setScalar(baseScale * (.86 + motion.spawn * .14) * (1 - ease((motion.death - .8) / .2) * .24));
}

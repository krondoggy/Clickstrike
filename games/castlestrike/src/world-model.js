import * as THREE from '../vendor/three.module.js';
import { part, bake, bakedMesh, armyMaterial, geometry } from './unit-models.js';

const TAU = Math.PI * 2;
function random(seed = 8121) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function terrainTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
  const c = canvas.getContext('2d'), r = random(43);
  c.fillStyle = '#4f733a'; c.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 14000; i++) {
    const x = r() * 2048, y = r() * 1024, radius = 3 + r() * 39;
    c.fillStyle = ['#57723718', '#84974b29', '#344e3026', '#b0a75a19', '#91a85322'][i % 5];
    c.beginPath(); c.ellipse(x, y, radius * (1 + r()), radius, 0, 0, TAU); c.fill();
  }
  // Layered, soft-edged worn road through a sunlit meadow.
  for (let j = 0; j < 7; j++) {
    c.strokeStyle = ['#887d4825', '#97855330', '#9c905032', '#a0925538', '#9c8b553d', '#9a8a573a', '#a9986537'][j];
    c.lineWidth = 340 - j * 36; c.lineCap = 'round';
    c.beginPath(); c.moveTo(150, 512); c.bezierCurveTo(700, 510, 1200, 507, 1890, 512); c.stroke();
  }
  for (let i = 0; i < 28000; i++) {
    const x = r() * 2048, y = r() * 1024;
    c.fillStyle = r() > .5 ? '#e2d29912' : '#1b38220d';
    c.fillRect(x, y, 1 + r() * 4, 1 + r() * 3);
  }
  // The banks are painted into the grass, keeping the shallow water distinct.
  c.fillStyle = '#a59a70'; c.fillRect(963, 0, 122, 1024);
  c.fillStyle = '#657c5a'; c.fillRect(979, 0, 90, 1024);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

function leafTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d'), r = random(548);
  c.fillStyle = '#e5ead6'; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1700; i++) {
    const x = r() * 256, y = r() * 256, size = 1.2 + r() * 5;
    c.fillStyle = ['#65725439', '#ffffff43', '#81916939', '#c0ceac4d'][i % 4];
    c.beginPath(); c.ellipse(x, y, size, size * .42, r() * 6.28, 0, 6.28); c.fill();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2, 2); texture.anisotropy = 4;
  return texture;
}

function makeFlag(color) {
  const group = new THREE.Group(), p = [];
  part(p, 'cylinder', '#7d6040', 0, 1.5, 0, .105, 3, .105);
  part(p, 'sphere', '#dec17b', 0, 3.08, 0, .2, .21, .2);
  group.add(bakedMesh(p));
  const g = new THREE.PlaneGeometry(1.5, 1.0, 6, 2);
  g.translate(.75, 2.35, 0);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(g, m); flag.castShadow = true; group.add(flag);
  group.userData.flag = flag; group.userData.original = Float32Array.from(g.attributes.position.array);
  return group;
}

export function makeCastle(team, small = false) {
  const root = new THREE.Group(), p = [];
  const stone = '#a6a796', highlight = '#c0b99c', dark = '#6d756b';
  const roof = team === 'player' ? '#356684' : '#8e3938';
  const cloth = team === 'player' ? '#418dcc' : '#b73c3e';
  if (small) {
    part(p, 'cylinder', '#747d6a', 0, .12, 0, 3.1, .24, 3.1);
    part(p, 'taper', stone, 0, 2.05, 0, 2.1, 4.1, 2.1);
    part(p, 'cylinder', highlight, 0, 4.0, 0, 2.5, .3, 2.5);
    part(p, 'cylinder', dark, 0, 4.45, 0, 2.6, .65, 2.6);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; part(p, 'box', highlight, Math.cos(a) * 1.12, 4.95, Math.sin(a) * 1.12, .5, .57, .45, 0, -a); }
    part(p, 'cone', roof, 0, 5.2, 0, 2.85, 1.5, 2.85);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; part(p, 'box', '#263a32', Math.sin(a) * .78, 3.03, Math.cos(a) * .78, .18, .62, .06, 0, a); }
    part(p, 'box', cloth, 0, 2.11, .9, .75, 1.23, .08);
    part(p, 'box', '#d3b96d', 0, 2.15, .95, .08, .66, .025);
    root.add(bakedMesh(p));
    const flag = makeFlag(cloth); flag.position.set(0, 5.7, 0); flag.scale.setScalar(.65); root.add(flag);
    root.userData.flags = [flag]; root.userData.height = 6.4;
    return root;
  }
  part(p, 'box', '#6e7766', 0, .14, 0, 10.2, .32, 8.8);
  part(p, 'box', '#929885', 0, .35, 0, 9.7, .35, 8.4);
  part(p, 'box', stone, 0, 3.2, -1.25, 5.4, 6.2, 4.4);
  part(p, 'box', highlight, 0, 5.8, -1.25, 5.75, .4, 4.75);
  part(p, 'pyramid', roof, 0, 7.9, -1.3, 8.25, 3.1, 6.7, 0, Math.PI / 4);
  part(p, 'box', '#243a36', 0, 3.12, 1.005, 1.8, 3.6, .11);
  part(p, 'box', highlight, -1.13, 2.55, 1.12, .45, 4.5, .48);
  part(p, 'box', highlight, 1.13, 2.55, 1.12, .45, 4.5, .48);
  part(p, 'box', highlight, 0, 4.87, 1.12, 2.73, .57, .48);
  for (let i = -2; i <= 2; i++) part(p, 'box', '#917a4f', i * .29, 2.6, 1.08, .085, 3.7, .08);
  for (let i = 0; i < 3; i++) part(p, 'box', '#917a4f', 0, 1.4 + i * 1.05, 1.12, 1.79, .09, .08);
  for (const x of [-4, 4]) {
    part(p, 'box', stone, x, 1.9, .25, 1.0, 3.5, 7.3);
    for (let i = -3; i <= 3; i++) part(p, 'box', highlight, x, 3.85, i * 1.05 + .25, 1.05, .62, .6);
  }
  for (let course = 0; course < 7; course++) {
    const y = .68 + course * .77;
    // Slightly recessed-looking mortar gives the keep readable stone courses.
    for (const side of [-1, 1]) {
      part(p, 'box', '#858e7c', side * 2.712, y, -1.25, .022, .033, 4.37);
      for (let brick = 0; brick < 4; brick++) part(p, 'box', '#858e7c', side * 2.714, y + .34, -2.91 + brick * 1.05 + (course % 2) * .49, .024, .67, .027);
      if (course < 4) {
        part(p, 'box', '#858e7c', side * 4.511, y, .25, .023, .033, 7.22);
        for (let brick = 0; brick < 6; brick++) part(p, 'box', '#858e7c', side * 4.514, y + .34, -2.89 + brick * 1.18 + (course % 2) * .56, .024, .67, .027);
      }
    }
    part(p, 'box', '#858e7c', 0, y, -3.46, 5.36, .033, .023);
  }
  // Four individually banded guard turrets with slate roofs and arrow slits.
  for (const x of [-3.8, 3.8]) for (const z of [-3.15, 3.3]) {
    part(p, 'cylinder', stone, x, 2.8, z, 2.8, 5.4, 2.8);
    for (const h of [.9, 3.4, 5.1]) part(p, 'cylinder', highlight, x, h, z, 2.94, .21, 2.94);
    for (const h of [1.57, 2.22, 2.87, 4.06, 4.71]) part(p, 'cylinder', '#878f7d', x, h, z, 2.812, .032, 2.812);
    part(p, 'cylinder', dark, x, 5.45, z, 3.05, .45, 3.05);
    part(p, 'cone', roof, x, 6.8, z, 3.95, 2.6, 3.95);
    part(p, 'sphere', '#d3b671', x, 8.17, z, .18, .27, .18);
    part(p, 'box', '#28382f', x, 3.75, z + 1.35, .25, .86, .04);
    part(p, 'box', '#28382f', x, 2.14, z + 1.35, .2, .7, .04);
    if (z > 0) {
      part(p, 'box', cloth, x, 3.32, z + 1.42, .94, 1.3, .06);
      part(p, 'box', '#e0c379', x, 3.32, z + 1.465, .1, .76, .02);
      part(p, 'box', '#e0c379', x, 3.42, z + 1.465, .49, .1, .02);
    }
  }
  for (const x of [-1.65, 1.65]) {
    part(p, 'box', '#273c36', x, 5.07, 1, .42, .79, .08);
    part(p, 'box', highlight, x, 4.63, 1.05, .66, .15, .25);
  }
  for (let i = 0; i < 6; i++) part(p, 'box', '#a9a791', 0, .16 + i * .04, 2.5 + i * .5, 3.9, .26, .65);
  root.add(bakedMesh(p));
  const flags = [];
  for (const x of [-3.8, 3.8]) { const flag = makeFlag(cloth); flag.position.set(x, 7.7, -3.15); flag.scale.setScalar(.72); root.add(flag); flags.push(flag); }
  const mainFlag = makeFlag(cloth); mainFlag.position.set(0, 8.8, -1.3); root.add(mainFlag); flags.push(mainFlag);
  root.userData.flags = flags; root.userData.height = 11.9;
  return root;
}

function instanced(scene, parts, transforms, shadows = true, material = armyMaterial) {
  const mesh = new THREE.InstancedMesh(bake(parts), material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((p, i) => { dummy.position.set(p[0], p[1], p[2]); dummy.rotation.set(0, p[3] || 0, 0); dummy.scale.setScalar(p[4] || 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
  mesh.castShadow = shadows; mesh.receiveShadow = true; scene.add(mesh);
  return mesh;
}

export function createWorld(scene) {
  const r = random(1449), texture = terrainTexture();
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(240 / 120, 240 / 66); texture.offset.set((1 - 240 / 120) / 2, (1 - 240 / 66) / 2);
  const groundMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.11; ground.receiveShadow = true; scene.add(ground);
  const earth = new THREE.Mesh(new THREE.BoxGeometry(240, 1.8, 240), new THREE.MeshStandardMaterial({ color: '#3b5436', roughness: 1 }));
  earth.position.y = -1.05; earth.receiveShadow = true; scene.add(earth);
  const waterMaterial = new THREE.MeshStandardMaterial({ color: '#348d98', metalness: .24, roughness: .28, transparent: true, opacity: .94 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 240, 5, 50), waterMaterial);
  water.rotation.x = -Math.PI / 2; water.position.y = -.045; scene.add(water);
  const foamParts = [];
  for (let i = 0; i < 65; i++) {
    const z = r() * 99 - 49.5;
    if (Math.abs(z) < 10) continue;
    part(foamParts, 'torus', '#7db5a5', r() * 4.5 - 2.25, -.018, z, .5 + r() * .8, .16 + r() * .24, .12, -Math.PI / 2, 0, r() * .15);
  }
  const foam = bakedMesh(foamParts); foam.castShadow = false; scene.add(foam);
  const stone = [], bridge = [];
  // A broad battleground bridge leaves room for formations and flanking.
  part(bridge, 'box', '#676e60', 0, .02, 0, 11.7, .3, 19.6);
  for (let x = -6; x <= 6; x += .83) for (let z = -9; z <= 9; z += .8) {
    part(bridge, 'box', ['#a7a48b', '#939983', '#abb098', '#898f7b'][Math.floor(r() * 4)], x + (Math.floor(z * 1.25) % 2 ? .23 : 0), .11 + Math.cos(x * .24) * .06, z, .75, .22, .71, 0, r() * .04);
  }
  for (const z of [-9.65, 9.65]) {
    part(bridge, 'box', '#7d8772', 0, .44, z, 12.5, .7, .64);
    part(bridge, 'box', '#bbc0a0', 0, .87, z, 12.7, .18, .76);
    for (const x of [-6, -3, 0, 3, 6]) {
      part(bridge, 'box', '#8e987e', x, .81, z, .84, 1.5, .84);
      part(bridge, 'pyramid', '#c4c5a3', x, 1.72, z, 1.19, .33, 1.19, 0, Math.PI / 4);
    }
  }
  scene.add(bakedMesh(bridge));
  const treeTransforms = [[], [], []], rockTransforms = [], flowerTransforms = [[], [], []], grassTransforms = [];
  for (let i = 0; i < 1550; i++) {
    const x = r() * 198 - 99, z = r() * 174 - 87;
    if (Math.abs(x) < 5 || Math.abs(z) < 14.5 || (Math.abs(x) > 36 && Math.abs(z) < 18)) continue;
    treeTransforms[i % 3].push([x, -.05, z, r() * TAU, .7 + r() * .72]);
  }
  // A few grouped trees and ruins soften the edge of the playable lane.
  for (let i = 0; i < 30; i++) {
    const x = r() * 89 - 44.5, z = (12.3 + r() * 2.8) * (i % 2 ? 1 : -1);
    if (Math.abs(x) < 8 || Math.abs(x) > 32) continue;
    treeTransforms[i % 3].push([x, -.05, z, r() * TAU, .62 + r() * .45]);
  }
  const greens = [['#2b6344', '#3c7a45', '#618a44'], ['#315d3c', '#528242', '#729946'], ['#285950', '#387057', '#5b8855']];
  const foliageMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, map: leafTexture(), roughness: 1, metalness: 0, flatShading: false });
  const scenery = [];
  for (let i = 0; i < 3; i++) {
    const p = [];
    part(p, 'taper', '#5a4b33', 0, 1.7, 0, .61, 3.4, .6);
    if (i === 2) {
      for (let j = 0; j < 3; j++) part(p, 'cone', greens[i][j], 0, 2.4 + j * 1.23, 0, 4.1 - j * .86, 3.3 - j * .3, 4.1 - j * .86);
    } else {
      part(p, 'foliage', greens[i][0], 0, 3.6, 0, 4.5, 3.3, 4.2);
      part(p, 'foliage', greens[i][1], -.78, 4.36, -.3, 3.1, 2.95, 3.3);
      part(p, 'foliage', greens[i][2], .7, 4.8, .25, 2.8, 2.1, 2.8);
      part(p, 'box', '#655135', .62, 2.2, .1, .22, 1.85, .25, .1, 0, -.5);
    }
    scenery.push(instanced(scene, p, treeTransforms[i], true, foliageMaterial));
  }
  for (let i = 0; i < 150; i++) {
    const x = r() * 110 - 55, z = r() * 52 - 26;
    if (Math.abs(z) < 10.5 || Math.abs(x) < 3.5) continue;
    rockTransforms.push([x, 0, z, r() * TAU, .45 + r() * 1.5]);
  }
  const rocks = [];
  part(rocks, 'rock', '#798476', 0, .35, 0, 1.7, 1.08, 1.4);
  part(rocks, 'rock', '#929783', .57, .22, .35, .9, .61, .72);
  part(rocks, 'sphere', '#607e46', -.37, .22, -.27, .96, .34, .6);
  scenery.push(instanced(scene, rocks, rockTransforms));
  for (let i = 0; i < 650; i++) {
    const x = r() * 111 - 55.5, z = r() * 51 - 25.5;
    if (Math.abs(x) < 6.8 || Math.abs(z) < 9.4) continue;
    grassTransforms.push([x, -.015, z, r() * TAU, .6 + r() * .8]);
    if (i % 3 === 0) flowerTransforms[i % 9 < 3 ? 0 : i % 9 < 6 ? 1 : 2].push([x + .3, 0, z, r() * TAU, .6 + r()]);
  }
  const grass = [];
  for (let i = 0; i < 4; i++) part(grass, 'cone', i % 2 ? '#839d4c' : '#617f3b', (i % 2) * .25, .21, Math.floor(i / 2) * .25, .16, .48 + i * .05, .15, 0, 0, (i - 2) * .16);
  scenery.push(instanced(scene, grass, grassTransforms, false));
  for (let i = 0; i < 3; i++) {
    const p = [];
    for (let j = 0; j < 3; j++) {
      part(p, 'cylinder', '#4a703c', j * .19, .21, Math.sin(j) * .21, .035, .4, .035);
      part(p, 'sphere', ['#e6d389', '#bdd2bb', '#a69ac5'][i], j * .19, .43 + j * .035, Math.sin(j) * .21, .2, .16, .2);
    }
    scenery.push(instanced(scene, p, flowerTransforms[i], false));
  }
  // Wayside masonry, broken columns, camp supplies and warm braziers.
  for (const sign of [-1, 1]) {
    for (let i = 0; i < 5; i++) part(stone, 'box', i % 2 ? '#91967d' : '#acac8d', sign * (14 + i * 1.9), .36, -12.5 + r(), 1.5, .72 + r() * .5, .8, 0, r() * .15);
    part(stone, 'cylinder', '#9ca48b', sign * 13.2, .72, 12.6, 1.1, 1.44, 1.1);
    part(stone, 'cylinder', '#b4b897', sign * 13.2, 1.51, 12.6, 1.5, .2, 1.5);
    for (let i = 0; i < 3; i++) {
      part(stone, 'box', '#7e603b', sign * (29 + i * 1.1), .5, 12.5, .95, 1, .92, 0, .14 * i);
      part(stone, 'box', '#b09a64', sign * (29 + i * 1.1), .5, 13.0, .09, 1.08, .025, 0, .14 * i);
    }
    for (let i = 0; i < 8; i++) part(stone, 'box', '#999d82', sign * (8.5 + i * 3.8), -.005, -.8 + r() * 1.6, .78 + r() * .45, .12, .56, 0, r());
  }
  scene.add(bakedMesh(stone));
  const flames = [], torches = [];
  for (const x of [-8.2, 8.2, -35, 35]) for (const z of [-10.7, 10.7]) {
    const p = [];
    part(p, 'cylinder', '#747b62', 0, .13, 0, 1, .26, 1);
    part(p, 'cylinder', '#645c40', 0, 1.15, 0, .22, 2.25, .22);
    part(p, 'taper', '#564c37', 0, 2.24, 0, .7, .37, .7, 0, 0, Math.PI);
    const torch = bakedMesh(p); torch.position.set(x, 0, z); scene.add(torch); torches.push(torch);
    const flame = new THREE.Mesh(geometry('sphere'), new THREE.MeshBasicMaterial({ color: '#ffc35c' }));
    flame.position.set(x, 2.65, z); flame.scale.set(.39, .76, .39); scene.add(flame); flames.push(flame);
    const core = new THREE.Mesh(geometry('cone'), new THREE.MeshBasicMaterial({ color: '#fff0ac' }));
    core.scale.set(.2, .52, .2); flame.add(core);
  }
  const shrine = new THREE.Group(), shrineParts = [];
  part(shrineParts, 'cylinder', '#8b967e', 0, .15, 0, 4.6, .3, 4.6);
  part(shrineParts, 'cylinder', '#c1c3a0', 0, .38, 0, 3.5, .26, 3.5);
  part(shrineParts, 'taper', '#869a82', 0, .91, 0, 1.5, 1.1, 1.5);
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4; part(shrineParts, 'cone', '#b9c29c', Math.sin(a) * 1.4, 1.01, Math.cos(a) * 1.4, .51, 1.62, .51); }
  shrine.add(bakedMesh(shrineParts));
  const crystalMaterial = new THREE.MeshStandardMaterial({ color: '#7ed8cc', emissive: '#469e96', emissiveIntensity: .65, roughness: .2, metalness: .3 });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.69, 0), crystalMaterial); crystal.position.y = 2.22; crystal.scale.y = 1.6; shrine.add(crystal);
  shrine.position.set(0, 0, -12.9); scene.add(shrine);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.7, 2.82, 48), new THREE.MeshBasicMaterial({ color: '#afd8b3', transparent: true, opacity: .52, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, .31, 0); scene.add(ring);
  return { ground, water, foam, flames, crystal, crystalMaterial, scenery, ring, animate(time, control = 0) {
    foam.position.z = (time * .16) % 1.2;
    waterMaterial.color.setHSL(.49, .49, .29 + Math.sin(time * .9) * .012);
    flames.forEach((f, i) => { f.scale.y = .7 + Math.sin(time * 10 + i * 3.7) * .13; f.rotation.y = time + i; });
    crystal.rotation.y = time * .45; crystal.position.y = 2.22 + Math.sin(time * 1.9) * .12;
    crystalMaterial.color.set(control > .25 ? '#65bfed' : control < -.25 ? '#ec9276' : '#8adbc7');
    ring.material.opacity = .35 + Math.sin(time * 1.8) * .1;
  } };
}

export function animateFlags(flags, time) {
  for (let n = 0; n < flags.length; n++) {
    const group = flags[n], mesh = group.userData.flag, base = group.userData.original, attr = mesh.geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      attr.setXYZ(i, x, y + Math.sin(time * 2.8 + x * 3 + n) * x * .045, Math.sin(time * 3.3 + x * 2.8 + n) * x * .12);
    }
    attr.needsUpdate = true; mesh.geometry.computeVertexNormals();
  }
}

import * as THREE from '../vendor/three.module.js';
import { geometry } from './unit-models.js';
import { UNIT_MAP } from './data.js';
import { COMBAT_STATUSES, activeStatuses } from './combat-status.js';
import { bridgeHeight } from './render-motion.js';

const clamp = n => Math.max(0,Math.min(1,n));
const colors = { heal:'#9bffac',rally:'#ffd173',root:'#e7c597',stun:'#ffeaa2',poison:'#a1df62',slow:'#91e1ff',armorBreak:'#ffb079',revive:'#92eab3',meteor:'#ffb05f',collapse:'#e2be89',chain:'#c3eaff' };
export const effectKind = effect => effect.semanticKind || ({magic:'bolt',slash:'melee',explosion:'siege',lightning:'chain'}[effect.type] || effect.type);
const isProjectile = effect => effect.phase === 'release' || (effect.type === 'meteor' && effect.phase !== 'impact') || (!effect.phase && ['arrow','magic'].includes(effect.type));

export function createCombatEffect(effect, quality='high') {
  const group=new THREE.Group(),kind=effectKind(effect),def=UNIT_MAP[effect.unitId || effect.sourceUnitId];
  const color=colors[kind] || (def?.abilityId==='frost'?'#9ce6ff':def?.faction==='undead'?'#b6e3ac':effect.team==='enemy'?'#ffaf78':'#9cddff');
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide});
  const add=(shape,scale=[1,1,1],position=[0,0,0],mat=material)=>{
    const mesh=new THREE.Mesh(geometry(shape),mat);mesh.scale.set(...scale);mesh.position.set(...position);group.add(mesh);return mesh;
  };
  const ring=(radius=1,thickness=.05,start=0,length=Math.PI*2)=>{
    const mesh=new THREE.Mesh(new THREE.RingGeometry(Math.max(.02,radius-thickness),radius,32,1,start,length),material);
    mesh.geometry.userData.combatOwned=true;mesh.rotation.x=-Math.PI/2;group.add(mesh);return mesh;
  };
  group.userData={kind,projectile:isProjectile(effect),phase:effect.phase,quality};
  if(effect.phase==='windup') {
    ring(.65,.045);group.userData.mode='windup';
  } else if(isProjectile(effect)) {
    group.userData.mode='projectile';
    if(kind==='arrow'){
      const shaft=add('cylinder',[.055,1.1,.055],[0,0,0],new THREE.MeshBasicMaterial({color:'#d9bd88'}));shaft.rotation.x=Math.PI/2;
      const tip=add('cone',[.17,.33,.17],[0,0,.65],new THREE.MeshBasicMaterial({color:'#e8eee2'}));tip.rotation.x=Math.PI/2;
    } else {
      const size=kind==='meteor'?.95:kind==='siege'?.48:.29;
      add(kind==='siege'?'rock':'sphere',[size*2,size*2,size*2]);
      if(quality==='high') for(let i=1;i<=3;i++)add('sphere',[size*(1-i*.2),size*(1-i*.2),size*1.8],[0,0,-i*size*1.1]);
    }
  } else if((kind==='chain'||kind==='heal') && Math.hypot(effect.tx-effect.x,effect.tz-effect.z)>.05) {
    group.userData.mode='link';
    const points=[];
    for(let i=0;i<=12;i++){
      const t=i/12,jitter=kind==='chain'&&i>0&&i<12?Math.sin(i*13.7)*.22:0;
      const sy=effect.sourceY||1.5,ty=(effect.targetY||1.5)+bridgeHeight(effect.tx,effect.tz)-bridgeHeight(effect.x,effect.z);
      points.push(new THREE.Vector3((effect.tx-effect.x)*t+jitter,sy+(ty-sy)*t+Math.sin(t*Math.PI)*(kind==='heal'?.7:.3), (effect.tz-effect.z)*t));
    }
    const geo=new THREE.BufferGeometry().setFromPoints(points);geo.userData.combatOwned=true;
    group.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false})));
    const pulse=ring(.85,.1);pulse.position.set(effect.tx-effect.x,(effect.targetY>3?effect.targetY-1:0)+.06,effect.tz-effect.z);
    if(kind==='heal')add('sphere',[.38,.38,.38],[effect.tx-effect.x,effect.targetY||1.5,effect.tz-effect.z]);
  } else if(kind==='root') {
    group.userData.mode='target';
    for(let i=-1;i<=1;i++) { const line=add('box',[1.65,.025,.035],[0,.1,i*.45]);line.rotation.y=.4; const cross=add('box',[.035,.025,1.65],[i*.45,.1,0]);cross.rotation.y=.4; }
    ring(.95,.045);
  } else if(kind==='melee') {
    group.userData.mode='impact';ring(1,.13,Math.PI*.15,Math.PI*1.1);
    if(quality==='high')add('rock',[.12,.65,.12],[0,.5,0]);
  } else {
    group.userData.mode='impact';
    const radius=effect.radius ? Math.min(9,effect.radius) : kind==='siege'?2.8:kind==='collapse'?4:1.05;
    group.userData.radius=radius;ring(1,kind==='rally'||kind==='stun'?.06:.13);
    const pieces=quality==='low'?0:['siege','collapse','meteor','stun'].includes(kind)?6:3;
    for(let i=0;i<pieces;i++) { const particle=add('rock',[.17,.24,.17]);particle.userData.particle=i; }
  }
  return group;
}

export function updateCombatEffect(group,effect,time,reducedMotion=false) {
  const progress=clamp(1-effect.life/(effect.maxLife||1)),{mode,kind}=group.userData;
  const tx=effect.tx??effect.x,tz=effect.tz??effect.z;
  if(mode==='projectile'){
    const arc=kind==='siege'?4:kind==='arrow'?1.15:kind==='meteor'?0:.25;
    const sy=(effect.sourceY||1.5)+bridgeHeight(effect.x,effect.z),ty=(effect.targetY||1.5)+bridgeHeight(tx,tz);
    const y=kind==='meteor'?1+(1-progress)*13:sy+(ty-sy)*progress+Math.sin(progress*Math.PI)*arc;
    group.position.set(effect.x+(tx-effect.x)*progress,y,effect.z+(tz-effect.z)*progress);
    group.lookAt(tx,ty,tz);
  }else if(mode==='link')group.position.set(effect.x,bridgeHeight(effect.x,effect.z)+.15,effect.z);
  else if(mode==='target')group.position.set(tx,(effect.targetY>3?effect.targetY-1:0)+bridgeHeight(tx,tz)+.16,tz);
  else if(mode==='windup'){
    group.position.set(effect.x,bridgeHeight(effect.x,effect.z)+.1,effect.z);group.scale.setScalar(.65+progress*.3);
  }else{
    group.position.set(tx,(effect.targetY>3?effect.targetY-1:0)+bridgeHeight(tx,tz)+.18,tz);
    const radius=group.userData.radius||1;
    const scale=reducedMotion?radius:radius*(.45+progress*.55);
    group.scale.setScalar(scale);
    group.children.forEach(child=>{
      if(child.userData.particle!==undefined){const i=child.userData.particle,a=i*2.399;child.position.set(Math.cos(a)*progress,.2+Math.sin(progress*Math.PI)*.6,Math.sin(a)*progress);child.visible=!reducedMotion;}
    });
  }
  const opacity=mode==='windup'?.22:Math.min(.9,effect.life/Math.min(.24,effect.maxLife||1));
  group.traverse(child=>{if(child.material?.transparent)child.material.opacity=opacity;});
}

export function disposeCombatEffect(group) {
  const materials=new Set(),geometries=new Set();
  group.traverse(child=>{if(child.material)materials.add(child.material);if(child.geometry?.userData.combatOwned)geometries.add(child.geometry);});
  materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
}

/** One instanced draw per status, regardless of how many soldiers share it. */
export class StatusMarkers {
  constructor(scene,capacity=512) {
    this.scene=scene;this.layers=new Map();this.dummy=new THREE.Object3D();this.right=new THREE.Vector3();
    const geo=new THREE.PlaneGeometry(.5,.5);this.geometry=geo;
    for(const status of COMBAT_STATUSES){
      const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#101a14e8';ctx.beginPath();ctx.roundRect(4,4,56,56,9);ctx.fill();ctx.strokeStyle=status.color;ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle=status.color;ctx.font='bold 42px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(status.symbol,32,32);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false});
      const mesh=new THREE.InstancedMesh(geo,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=11;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);this.layers.set(status.id,mesh);
    }
    const arc=new THREE.RingGeometry(.78,.84,20,1,-Math.PI*.4,Math.PI*.8);arc.rotateX(-Math.PI/2);
    this.shields=new THREE.InstancedMesh(arc,new THREE.MeshBasicMaterial({color:'#bfe8ff',transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}),capacity);
    this.shields.count=0;this.shields.frustumCulled=false;scene.add(this.shields);
  }
  sync(models,camera,quality) {
    for(const mesh of this.layers.values())mesh.count=0;this.shields.count=0;
    this.right.set(1,0,0).applyQuaternion(camera.quaternion);
    for(const object of models.values()){
      const unit=object.userData.unit;if(!unit||unit.hp<=0||unit.rosterId)continue;
      const statuses=activeStatuses(unit).slice(0,quality==='low'?2:3),d=this.dummy;
      statuses.forEach((status,index)=>{
        const mesh=this.layers.get(status.id);if(mesh.count>=mesh.instanceMatrix.count)return;
        d.position.set(unit.x,object.position.y+object.userData.height+.75,unit.z).addScaledVector(this.right,(index-(statuses.length-1)/2)*.56);
        d.quaternion.copy(camera.quaternion);d.scale.setScalar(1);d.updateMatrix();mesh.setMatrixAt(mesh.count++,d.matrix);
      });
      if(unit.shield>0){d.position.set(unit.x,bridgeHeight(unit.x,unit.z)+.15,unit.z);d.rotation.set(0,unit.heading-Math.PI/2,0);d.scale.setScalar(unit.hero?1.3:1);d.updateMatrix();this.shields.setMatrixAt(this.shields.count++,d.matrix);}
    }
    for(const mesh of [...this.layers.values(),this.shields])mesh.instanceMatrix.needsUpdate=true;
  }
  destroy(){for(const mesh of [...this.layers.values(),this.shields]){this.scene.remove(mesh);mesh.material.map?.dispose();mesh.material.dispose();}this.geometry.dispose();this.shields.geometry.dispose();}
}

export function drawFallbackStatuses(ctx,unit,x,y,quality) {
  const statuses=activeStatuses(unit).slice(0,quality==='low'?2:3);
  ctx.save();ctx.font='bold 10px Georgia,serif';ctx.textAlign='center';
  statuses.forEach((status,i)=>{const px=x+(i-(statuses.length-1)/2)*13;ctx.fillStyle='#102018ee';ctx.fillRect(px-6,y-9,12,13);ctx.fillStyle=status.color;ctx.fillText(status.symbol,px,y+1);});
  ctx.restore();
}

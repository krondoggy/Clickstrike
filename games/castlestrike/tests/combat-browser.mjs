import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdir,writeFile } from 'node:fs/promises';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chrome'}),args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.BASE_URL||'http://127.0.0.1:4173',errors=[];
await mkdir('test-results',{recursive:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${base}/games/castlestrike/`);
  await page.waitForFunction(()=>window.castleStrike?.state.version===3);
  assert.match(await page.locator('.automatic-tactics').textContent(),/AUTOMATIC BEHAVIOR/);
  await page.getByRole('tab',{name:'Scout'}).click();
  assert.ok(await page.locator('.counter-suggestion').count()>0);
  const suggestions=await page.locator('.counter-suggestion').evaluateAll(nodes=>nodes.map(n=>n.dataset.inspect));
  assert.equal(await page.evaluate(async ids=>{const {UNIT_MAP}=await import('/games/castlestrike/src/data.js');return ids.every(id=>UNIT_MAP[id].faction===castleStrike.state.faction);},suggestions),true);
  assert.match(await page.locator('#combat-summary').textContent(),/Last 25 seconds/);

  const motion=await page.evaluate(()=>{
    const {game:g,battlefield:field}=castleStrike,s=g.state;
    g.start();const advance=g.update.bind(g);g.update=()=>{};
    const archer=s.units.find(u=>u.team==='player'&&u.unitId==='archer'),target=s.units.find(u=>u.team==='enemy');
    Object.assign(archer,{x:-4,z:0,nextAttackAt:0,cooldown:0,targetId:null});
    Object.assign(target,{x:4,z:0,stunUntil:1000,stunTime:1000,controlRecoveryUntil:1002,nextAttackAt:1000});
    s.units=[archer,target];s.nextWave=1000;s.aiTimer=1000;
    field.motion.state=null;field.render(s,0);
    const originalHp=target.hp,frames=[];
    for(let i=0;i<36;i++){
      advance(.05);field.render(s,.05);
      const visible=field.renderedState.units.find(u=>u.id===target.id);
      const effects=field.renderedState.effects;
      frames.push({time:s.time,visualTime:field.time,hp:target.hp,visibleHp:visible?.hp,projectiles:effects.filter(e=>e.phase==='release').map(e=>({kind:e.semanticKind,progress:1-e.life/e.maxLife})),impacts:effects.filter(e=>e.phase==='impact').map(e=>({time:e.startedAt,kind:e.semanticKind}))});
    }
    const markerCount=[...field.statusMarkers.layers.values()].reduce((sum,mesh)=>sum+mesh.count,0);
    s.paused=true;g.update=advance;
    return {frames,originalHp,markerCount};
  });
  const hit=motion.frames.find(frame=>frame.visibleHp<motion.originalHp);
  assert.ok(hit,'A real ranged attack damages its target');
  assert.ok(hit.impacts.some(impact=>Math.abs(hit.visualTime-impact.time)<.051),'Visible health changes at the displayed contact event');
  assert.ok(motion.frames.filter(frame=>frame.projectiles.length).length>=4,'Projectile spans multiple display frames');
  assert.ok(motion.markerCount>0,'A true status produces an instanced marker');
  await writeFile('test-results/combat-contact.json',JSON.stringify(motion,null,2));

  await page.locator('#settings-btn').click();await page.locator('#new-match-btn').click();
  await page.evaluate(async()=>{
    const {UNITS}=await import('/games/castlestrike/src/data.js');
    const g=castleStrike.game,s=g.state;s.gold=12000;
    for(let i=0;i<2;i++)g.research('tier');for(let i=0;i<4;i++)g.research('barracks');
    for(const u of UNITS.filter(u=>u.faction===s.faction))g.recruit(u.id);
    s.enemy.tier=3;s.enemy.supplyCap=72;s.enemy.research.tier=2;s.enemy.research.barracks=4;
    s.enemyRoster=UNITS.filter(u=>u.faction===s.enemyFaction).map((u,i)=>({id:`r${s.nextId++}`,unitId:u.id,row:i%6,col:u.range>3?0:4}));
    // Ensure unique legal formation positions while keeping casters behind the screen.
    s.enemyRoster.forEach((r,i)=>{r.row=i%6;r.col=i<6?3:1;});
    g.start();g.update(27);g.togglePause();castleStrike.save();
  });
  await page.getByRole('tab',{name:'Scout'}).click();
  await page.waitForFunction(()=>document.getElementById('combat-summary').textContent.includes('Leading threat'));
  await page.evaluate(()=>{ castleStrike.game.update=()=>{}; castleStrike.state.paused=false; });
  await page.waitForFunction(()=>document.getElementById('paused-overlay').hidden);
  await page.screenshot({path:'test-results/castle-strike-tactical-desktop.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>castleStrike.battlefield.reducedMotion);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile page does not overflow');
  await page.locator('.counter-suggestion').first().click();
  assert.ok(await page.locator('.automatic-tactics').isVisible());
  await page.screenshot({path:'test-results/castle-strike-tactical-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  const fallback=await browser.newPage({viewport:{width:1100,height:800}});
  fallback.on('pageerror',error=>errors.push(error.message));
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args);};});
  await fallback.goto(`${base}/games/castlestrike/`);
  await fallback.waitForFunction(()=>window.castleStrike?.battlefield.fallback);
  await fallback.evaluate(()=>{castleStrike.game.start();castleStrike.game.update(20);castleStrike.game.togglePause();});
  await fallback.screenshot({path:'test-results/castle-strike-tactical-fallback.png',fullPage:true});
  await fallback.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: authoritative projectile/HP/impact alignment, status markers, automatic role descriptions, faction-specific counter suggestions, measured combat report, reduced motion, mobile and illustrated fallback.');
} finally {await browser.close();}

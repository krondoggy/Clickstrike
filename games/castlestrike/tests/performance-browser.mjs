import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : { channel: 'chrome' }), args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const label = process.env.PERF_LABEL || 'current';
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  if (label.startsWith('baseline')) await page.route('**/games/castlestrike/src/engine.js', route => route.fulfill({ path: `${process.cwd()}/test-results/balance-baseline/engine.js`, contentType: 'text/javascript' }));
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:4173'}/games/castlestrike/`);
  await page.waitForFunction(() => !!window.castleStrike?.battlefield.renderer);
  const result = await page.evaluate(async label => {
    const moduleRoot = label.startsWith('baseline') ? '/test-results/balance-baseline' : '/games/castlestrike/src';
    const { createGame } = await import(`${moduleRoot}/engine.js`);
    const { UNITS } = await import(`${moduleRoot}/data.js`);
    const g = createGame(), s = g.state, field = castleStrike.battlefield;
    g.start(); const prototype = { ...s.units[0] };
    s.units = Array.from({ length: 180 }, (_, i) => {
      const def = UNITS[i % UNITS.length], team = i < 90 ? 'player' : 'enemy', n = i % 90;
      return { ...prototype, ...def, unitId: def.id, id: `u${10000+i}`, team, x: (team === 'player' ? -1 : 1) * (3 + Math.floor(n / 9) * 1.4), z: (n % 9 - 4) * 1.8, hp: def.hp, maxHp: def.hp, heading: team === 'player' ? Math.PI/2 : -Math.PI/2, nextAttackAt: 0, targetId: null, attackPose: null, action: 'walk' };
    });
    s.nextId = 20000; s.aiTimer = 10000; s.nextWave = 10000;
    // Keep a fixed 180-model scene: comparing render costs is independent of casualties.
    const sceneState = structuredClone(s); sceneState.paused = true;
    const render = field.render.bind(field); field.render = () => render(sceneState, 0);
    const quantile = (samples, q) => [...samples].sort((a,b)=>a-b)[Math.floor((samples.length-1)*q)];
    const renderResults = {};
    for (const quality of ['high', 'low']) {
      field.setQuality(quality);
      for (let i=0; i<8; i++) field.render();
      const samples=[];
      for (let i=0; i<45; i++) { const t=performance.now(); field.render(); samples.push(performance.now()-t); }
      renderResults[quality]={medianMs:quantile(samples,.5),p95Ms:quantile(samples,.95),drawCalls:field.renderer.info.render.calls,triangles:field.renderer.info.render.triangles};
    }
    const tickSamples=[];
    for (let i=0; i<60; i++) { const t=performance.now(); g.update(.1); tickSamples.push(performance.now()-t); }
    const dynamic={}; field.render=render;
    for(const quality of ['high','low']) {
      const live=createGame(); Object.assign(live.state,structuredClone(sceneState),{paused:false});
      field.setQuality(quality);field.motion.state=null;
      const samples=[];let peakEffects=0,peakStatusMarkers=0;
      for(let i=0;i<100;i++){
        const t=performance.now();live.update(1/60);render(live.state,1/60);
        if(i>=10)samples.push(performance.now()-t);
        peakEffects=Math.max(peakEffects,field.effects.size);
        peakStatusMarkers=Math.max(peakStatusMarkers,[...field.statusMarkers.layers.values()].reduce((sum,mesh)=>sum+mesh.count,0));
      }
      dynamic[quality]={medianCpuMs:quantile(samples,.5),p95CpuMs:quantile(samples,.95),peakEffects,peakStatusMarkers,remainingUnits:live.state.units.length};
    }
    return { label, units:180, viewport:'1280x900', renderer:renderResults, simulation:{medianMs:quantile(tickSamples,.5),p95Ms:quantile(tickSamples,.95),remainingUnits:s.units.length},dynamic,measurement:'CPU simulation and render submission; software WebGL does not measure physical GPU presentation latency.',userAgent:navigator.userAgent };
  }, label);
  await mkdir('test-results', { recursive:true });
  await writeFile(`test-results/combat-performance-${label}.json`, JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }

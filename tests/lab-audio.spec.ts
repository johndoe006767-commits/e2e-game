import {test,expect} from '@playwright/test';
import {completeGame} from './complete-game';

test('skeleton has equal page clearance at desktop, tablet and phone sizes',async({page})=>{
 for(const viewport of [{width:1280,height:720},{width:1440,height:1000},{width:768,height:1024},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto('/');
  await expect(page.getByTestId('body')).toHaveAttribute('data-scene-ready','true');
  const clearance=await page.getByTestId('body').evaluate(el=>{
   const r=el.getBoundingClientRect();return{top:r.top,bottom:document.documentElement.scrollHeight-r.bottom};
  });
  expect(Math.abs(clearance.top-clearance.bottom)).toBeLessThan(2);
 }
});

for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 test(`completion retains skeleton scale and thumbs-up at ${viewport.width}px`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/');
  const body=page.getByTestId('body');await expect(body).toHaveAttribute('data-scene-ready','true');
  await page.getByRole('button',{name:'Start game',exact:true}).click();
  const height=Number(await body.getAttribute('data-rendered-height'));
  const scene=await body.getAttribute('data-scene-id');
  await page.screenshot({path:`docs/lab-game-${viewport.width}.png`,fullPage:true});
  await completeGame(page);
  for(const wait of [100,450,1200,7000]){
   await page.waitForTimeout(wait);
   expect(Number(await body.getAttribute('data-rendered-height'))).toBeCloseTo(height,4);
  }
  await expect(body).toHaveAttribute('data-pose','thumbs-up');await expect(body).toHaveAttribute('data-scene-id',scene!);
  await body.focus();await page.keyboard.press('ArrowRight');await expect(body).toHaveAttribute('data-yaw','0');
  await page.locator('.celebration-particles').evaluate(c=>(c as HTMLElement).style.visibility='hidden');
  await page.screenshot({path:`docs/lab-complete-${viewport.width}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);
  await page.getByRole('button',{name:'Play again'}).click();await expect(body).not.toHaveAttribute('data-celebrating','true');
  expect(Number(await body.getAttribute('data-rendered-height'))).toBeCloseTo(height,4);
 });
}

test('audio is always on despite old mute preferences, pauses, celebrates and resets without stacking',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('anatomy-muted','true');
  const Base=window.AudioContext;
  (window as any).audioContexts=[];(window as any).audioSources=[];(window as any).audioNotes=[];
  window.AudioContext=class extends Base{
   constructor(){super();(window as any).audioContexts.push(this)}
   createOscillator(){const node=super.createOscillator(),set=node.frequency.setValueAtTime.bind(node.frequency);node.frequency.setValueAtTime=(value:number,time:number)=>{(window as any).audioNotes.push(Math.round(69+12*Math.log2(value/440)));return set(value,time)};return node}
   createDynamicsCompressor(){const node=super.createDynamicsCompressor(),analyser=this.createAnalyser();analyser.fftSize=2048;node.connect(analyser);(window as any).audioAnalyser=analyser;return node}
   createBufferSource(){const node=super.createBufferSource();const start=node.start.bind(node);node.start=(...args:Parameters<AudioBufferSourceNode['start']>)=>{(window as any).audioSources.push({duration:node.buffer?.duration,at:this.currentTime});start(...args)};return node}
  };
 });
 await page.goto('/');await expect(page.getByRole('button',{name:'Start game',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>(window as any).audioContexts.length)).toBe(0);
 await page.getByRole('button',{name:'Start game',exact:true}).click();
 const rms=()=>page.evaluate(()=>{const a=(window as any).audioAnalyser,data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((sum,n)=>sum+n*n,0)/data.length)});
 await expect.poll(rms).toBeGreaterThan(.001);
 expect(await page.evaluate(()=>(window as any).audioContexts.length)).toBe(1);
 await page.evaluate(()=>(window as any).audioNotes=[]);
 await page.locator('[data-organ="brain"]').click();
 const rect=await page.getByTestId('body').boundingBox();
 await page.mouse.click(rect!.x+rect!.width*.5,rect!.y+rect!.height*.069);
 await expect(page.locator('[data-organ="brain"]')).toBeDisabled();
 expect(await page.evaluate(()=>(window as any).audioNotes.join(','))).toContain('76,79,84');
 await page.evaluate(()=>(window as any).audioNotes=[]);
 await page.locator('[data-organ="heart"]').click();
 await page.mouse.click(rect!.x+rect!.width*.5,rect!.y+rect!.height*.75);
 expect(await page.evaluate(()=>(window as any).audioNotes.join(','))).toContain('70,65');
 await expect(page.getByRole('button',{name:/Mute sound|Turn sound on|Finish game/})).toHaveCount(0);
 await page.getByRole('button',{name:'Restart game',exact:true}).click();await expect.poll(rms).toBeLessThan(.0001);
 await page.getByRole('button',{name:'Keep progress',exact:true}).click();await expect.poll(rms).toBeGreaterThan(.001);
 await completeGame(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).audioSources.filter((s:any)=>s.duration>8).length)).toBe(1);
 await expect.poll(rms).toBeGreaterThan(.001);
 await page.getByRole('button',{name:'Play again',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).audioContexts.length)).toBe(1);
 await expect.poll(rms).toBeGreaterThan(.001);
 await page.reload();
 expect(await page.evaluate(()=>(window as any).audioContexts.length)).toBe(0);
 await page.getByRole('button',{name:'Start game',exact:true}).click();
 await expect.poll(rms).toBeGreaterThan(.001);
});

test('orientation instructions and left-right labels follow a full turn',async({page})=>{
 await page.goto('/');
 const body=page.getByTestId('body');await expect(body).toHaveAttribute('data-scene-ready','true');
 await expect(page.getByText('Drag the skeleton left or right to turn.',{exact:true})).toBeVisible();
 await expect(page.getByText('Some body parts can only be placed from the back.',{exact:true})).toBeVisible();
 await expect(page.locator('.side-label.screen-left')).toHaveText('Left');
 await expect(page.locator('.side-label.screen-right')).toHaveText('Right');
 await body.focus();for(let i=0;i<10;i++)await page.keyboard.press('ArrowRight');
 await expect(body).toHaveAttribute('data-view','Side view');
 await expect(page.locator('.side-label.screen-left')).toHaveCSS('opacity','0');
 for(let i=0;i<11;i++)await page.keyboard.press('ArrowRight');
 await expect(body).toHaveAttribute('data-view','Back view');
 await expect(page.locator('.side-label.screen-left')).toHaveText('Right');
 await expect(page.locator('.side-label.screen-right')).toHaveText('Left');
 await expect(page.locator('[data-checkpoint="hamstrings"]')).toBeVisible();
 for(let i=0;i<21;i++)await page.keyboard.press('ArrowRight');
 await expect(body).toHaveAttribute('data-view','Front view');
 await expect(page.locator('.side-label.screen-left')).toHaveText('Left');
 await page.getByRole('button',{name:'Start game',exact:true}).click();
 await expect(page.locator('#rotation-guide')).toBeVisible();
});

test('pregame fullscreen toggles without starting and disappears during play',async({page})=>{
 await page.goto('/');
 const start=page.getByRole('button',{name:'Start game',exact:true});await expect(start).toBeEnabled();
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
 await expect(start).toBeVisible();await expect(page.locator('.organ-piece:enabled')).toHaveCount(0);
 await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false);
 await page.getByRole('button',{name:'Fullscreen',exact:true}).click();await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Fullscreen',exact:true})).toBeVisible();
 await page.setViewportSize({width:360,height:780});
 await expect(start).toBeInViewport();await expect(page.getByRole('button',{name:'Fullscreen',exact:true})).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(360);
 await start.click();await expect(page.locator('.pregame-fullscreen')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Get a hint/})).toBeVisible();
});

import {test,expect} from '@playwright/test';
import {completeGame} from './complete-game';

test('4K stage is centered, readable and keeps its model scale through completion',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:3840,height:2160});await page.goto('/');
 const body=page.getByTestId('body');await expect(body).toHaveAttribute('data-native-muscle-count','10');
 const frame=await body.boundingBox();expect(Math.abs(frame!.y-(2160-frame!.y-frame!.height))).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(3840);
 await expect(page.locator('.organ-name').first()).toHaveCSS('font-size','24px');
 const start=page.getByRole('button',{name:'Start game',exact:true});await expect(start).toBeInViewport();expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(88);
 await start.click();
 const originalHeight=Number(await body.getAttribute('data-rendered-height')),sceneId=await body.getAttribute('data-scene-id');
 // At native 4K, the magnetic radius scales with the physical control size.
 const source=(await page.locator('[data-organ="biceps"]').boundingBox())!,marker=(await page.locator('[data-checkpoint="biceps"]').boundingBox())!;
 await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(marker.x+marker.width/2+36,marker.y+marker.height/2,{steps:8});
 await expect(page.locator('.drag-ghost')).toHaveAttribute('data-snap-target','biceps');await expect(page.locator('[data-organ="biceps"]')).toBeEnabled();await page.mouse.up();await expect(page.locator('[data-organ="biceps"]')).toBeDisabled();
 await completeGame(page);await expect(body).toHaveAttribute('data-pose','thumbs-up');
 expect(Number(await body.getAttribute('data-rendered-height'))).toBeCloseTo(originalHeight,0);
 await expect(body).toHaveAttribute('data-scene-id',sceneId!);await expect(page.getByRole('button',{name:'Play again'})).toBeInViewport();
 await page.screenshot({path:'docs/4k-complete.png'});
});

test('1080p stage and all tray assets fit the screen',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.goto('/');
 await expect(page.getByTestId('body')).toHaveAttribute('data-native-muscle-count','10');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(1920);
 const body=(await page.getByTestId('body').boundingBox())!;expect(Math.abs(body.y-(1080-body.y-body.height))).toBeLessThan(2);
 for(const piece of await page.locator('.organ-piece').all())await expect(piece).toBeInViewport();
 const broken=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!(i as HTMLImageElement).naturalWidth).length);expect(broken).toBe(0);
});

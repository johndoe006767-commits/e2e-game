import {expect,type Page} from '@playwright/test';
import {ORGANS} from '../src/game';

// Complete through normal selection and placement handlers, without a debug button.
export async function completeGame(page:Page){
 const body=page.getByTestId('body');let finalYaw=0;
 for(const organ of ORGANS){
  const source=page.locator(`[data-organ="${organ.id}"]`);
  if(await source.isDisabled())continue;
  await body.dispatchEvent('keydown',{key:'Escape'});
  const marker=page.locator(`[data-checkpoint="${organ.id}"]`);
  for(let i=0;i<22&&!await marker.isVisible();i++)await body.dispatchEvent('keydown',{key:'ArrowRight'});
  await expect(marker).toBeVisible();
  await source.dispatchEvent('click',{detail:0});
  const r=(await marker.boundingBox())!;
  finalYaw=Number(await body.getAttribute('data-yaw'));
  await body.dispatchEvent('click',{detail:1,clientX:r.x+r.width/2,clientY:r.y+r.height/2});
  await expect(source).toBeDisabled();
 }
 return Math.atan2(Math.sin(finalYaw),Math.cos(finalYaw));
}

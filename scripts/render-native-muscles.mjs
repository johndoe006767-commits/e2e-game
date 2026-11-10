import {chromium} from 'playwright';
import sharp from 'sharp';
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage();
await page.goto(process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:5180');
const rendered=await page.evaluate(async()=>{
 const T=await import('/node_modules/.vite/deps/three.js');
 const {createMuscleTexture,muscleMaterial,muscleUV}=await import('/src/muscle-material.ts');
 const atlas=await (await fetch('/anatomy/muscles.json')).json();
 const zipped=await (await fetch('/anatomy/muscles.bin.gz')).arrayBuffer();
 const buffer=new Uint8Array(zipped)[0]===31?await new Response(new Blob([zipped]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():zipped;
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 renderer.setSize(640,768);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 const texture=createMuscleTexture(),output={};
 for(const id of new Set(atlas.parts.map(p=>p.group))){
  const scene=new T.Scene(),model=new T.Group();scene.add(model);
  const back=['glutes','hamstrings','triceps','calves'].includes(id),direction=back?-1:1;
  scene.add(new T.HemisphereLight(0xfff5ea,0x655778,2));
  const key=new T.DirectionalLight(0xfff4e9,3);key.position.set(-2,3,5*direction);scene.add(key);
  const fill=new T.DirectionalLight(0xeae4ff,1);fill.position.set(2,1,3*direction);scene.add(fill);
  atlas.parts.filter(p=>p.group===id).forEach((p,i)=>{
   const geometry=new T.BufferGeometry();
   geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3).slice(),3));
   geometry.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer,p.normals,p.vertexCount*3),3,true));
   geometry.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));
   muscleUV(geometry);model.add(new T.Mesh(geometry,muscleMaterial(texture,i)));
  });
  const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());model.position.sub(box.getCenter(new T.Vector3()));
  const height=Math.max(size.y,size.x*768/640)*1.12,width=height*640/768;
  const camera=new T.OrthographicCamera(-width/2,width/2,height/2,-height/2,.01,20);camera.position.set(0,0,5*direction);camera.lookAt(0,0,0);
  renderer.render(scene,camera);output[id]=renderer.domElement.toDataURL('image/png');
  model.traverse(n=>{if(n.isMesh){n.geometry.dispose();n.material.dispose()}});
 }
 texture.dispose();renderer.dispose();return output;
});
for(const [id,data] of Object.entries(rendered)){
 await sharp(Buffer.from(data.split(',')[1],'base64')).trim().extend({top:12,bottom:12,left:12,right:12,background:{r:0,g:0,b:0,alpha:0}}).webp({quality:92,alphaQuality:100}).toFile(`public/assets/organs/${id}.webp`);
 console.log(`Rendered ${id}`);
}
await browser.close();

import * as T from 'three';

// Shared, subtle longitudinal fiber texture. Geometry supplies the silhouette;
// this texture adds surface detail without floating tubes or separate strands.
export function createMuscleTexture(){
 const w=256,h=512,data=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const phase=x+1.2*Math.sin(y*.018+x*.025);
  const strand=Math.pow(.5+.5*Math.sin(phase*1.9),10);
  const grain=Math.sin(x*127.1+y*311.7)*43758.5453;
  const shade=Math.round(217+strand*29+(grain-Math.floor(grain))*9);
  const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=shade;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,w,h,T.RGBAFormat);
 texture.wrapS=T.RepeatWrapping;texture.wrapT=T.RepeatWrapping;
 texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;
 texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export function muscleMaterial(texture:T.Texture,index:number){
 return new T.MeshPhysicalMaterial({color:['#9f4140','#a64843','#963a3a'][index%3],roughness:.76,metalness:0,clearcoat:0,map:texture,bumpMap:texture,bumpScale:.00035,side:T.DoubleSide});
}
export function muscleUV(geometry:T.BufferGeometry){
 geometry.computeBoundingBox();const box=geometry.boundingBox!,center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
 const positions=geometry.getAttribute('position'),uv=new Float32Array(positions.count*2);
 for(let i=0;i<positions.count;i++){
  uv[i*2]=Math.atan2((positions.getZ(i)-center.z)/Math.max(size.z,.001),(positions.getX(i)-center.x)/Math.max(size.x,.001))/(Math.PI*2)+.5;
  uv[i*2+1]=(positions.getY(i)-box.min.y)/Math.max(size.y,.001);
 }
 geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
}

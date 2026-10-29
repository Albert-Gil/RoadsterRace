import{Mesh}from'@babylonjs/core/Meshes/mesh';
import{VertexBuffer}from'@babylonjs/core/Buffers/buffer';
import{DynamicTexture}from'@babylonjs/core/Materials/Textures/dynamicTexture';
import{StandardMaterial}from'@babylonjs/core/Materials/standardMaterial';
import{Color3}from'@babylonjs/core/Maths/math.color';
import type{Scene}from'@babylonjs/core/scene';
import type{TrackDefinition}from'../core/types';
import{Geometry,hex,mix}from'./landscape/mesh';
import{yosemiteAppearance as art}from'./themes';
import{waterfallPoint,waterfallPoolPoint,yosemiteWaterfallSites,type WaterfallSite}from'./yosemite-waterfall-shape';

/** Broken, gravity-shaped sheets. UVs run down the drop, never across the cliff. */
export function waterfallCurtains(sites:WaterfallSite[]){
 const g=new Geometry(),uvs:number[]=[];
 for(const site of sites)for(let strip=0;strip<5;strip++){
  const middle=(strip-2)*site.width*.19,width=site.width*[.18,.24,.31,.22,.16][strip];
  const ranges=[[[0,.71],[.74,1]],[[0,.85],[.89,1]],[[0,1]],[[0,.55],[.59,.91],[.94,1]],[[0,.64],[.68,.89],[.92,1]]][strip];
  for(const[from,to]of ranges){
   const rows:number[][]=[];
   for(let i=0;i<=36;i++){
    const t=from+(to-from)*i/36,spread=1+t*t*.34,pulse=1+.13*Math.sin(t*34+strip*2.7),row:number[]=[];
    for(const side of[-1,1]){
     const across=(middle+side*width*.5*pulse)*spread,p=waterfallPoint(site,t,across);
     const color=mix(hex(art.foam),hex('#ffffff'),.45+.25*Math.sin(t*18+strip)**2);
     row.push(g.vertex(p.x,p.y,p.z,color));g.colors[g.colors.length-1]=.92-.18*t;
     uvs.push(side<0?0:1,1-t*5+strip*.19);
    }rows.push(row);
   }
   for(let i=0;i<36;i++){g.triangle(rows[i][0],rows[i+1][0],rows[i][1]);g.triangle(rows[i][1],rows[i+1][0],rows[i+1][1]);}
  }
 }
 return{geometry:g,uvs};
}

/** A cosmetic basin entirely within the existing non-drivable granite parcel. */
export function waterfallBasin(site:WaterfallSite){
 const water=new Geometry(),rim=new Geometry(),center=water.vertex(site.impact.x,site.impact.y,site.impact.z,hex(art.foam)),rings:number[][]=[];
 for(let k=1;k<=4;k++){
  const radius=k/4,ids:number[]=[];
  for(let i=0;i<64;i++){const p=waterfallPoolPoint(site,i/64*Math.PI*2,radius);ids.push(water.vertex(p.x,p.y,p.z,mix(hex(art.water),hex(art.waterDeep),radius*.6)));}
  rings.push(ids);
 }
 for(let i=0;i<64;i++){const j=(i+1)%64;water.triangle(center,rings[0][j],rings[0][i]);
  for(let k=0;k<3;k++){water.triangle(rings[k][i],rings[k][j],rings[k+1][j]);water.triangle(rings[k][i],rings[k+1][j],rings[k+1][i]);}
 }
 const rimRows=[.96,1.06,1.18].map((radius,k)=>Array.from({length:64},(_,i)=>{
  const p=waterfallPoolPoint(site,i/64*Math.PI*2,radius),height=k===0?.05:k===1?.38+.12*Math.sin(i*2.3):-.25;
  return rim.vertex(p.x,p.y+height,p.z,hex(art.granite[k===1?1:3]));
 }));
 for(let k=0;k<2;k++)for(let i=0;i<64;i++){const j=(i+1)%64;rim.triangle(rimRows[k][i],rimRows[k][j],rimRows[k+1][j]);rim.triangle(rimRows[k][i],rimRows[k+1][j],rimRows[k+1][i]);}
 return{water,rim};
}

export function buildYosemiteWaterfall(scene:Scene,track:TrackDefinition,waterMaterial:StandardMaterial,stone:StandardMaterial){
 const sites=yosemiteWaterfallSites(track),veil=new DynamicTexture('falling-water-fibres',{width:128,height:256},scene,true),ctx=veil.getContext()as CanvasRenderingContext2D,pixels=new ImageData(128,256);
 for(let y=0;y<256;y++)for(let x=0;x<128;x++){
  const u=x/127,edge=Math.sin(Math.PI*u)**1.4,fibres=.62+.20*Math.sin(x*.61+Math.sin(y*.05))+.18*Math.sin(x*.19-y*.09),breaks=.68+.32*Math.sin(y*.22+x*.08)**2,at=(y*128+x)*4;
  pixels.data[at]=232;pixels.data[at+1]=248;pixels.data[at+2]=255;pixels.data[at+3]=edge*fibres*breaks*255;
 }
 ctx.putImageData(pixels,0,0);veil.hasAlpha=true;veil.update();
 const material=new StandardMaterial('yosemite-waterfall',scene);material.diffuseTexture=veil;material.useAlphaFromDiffuseTexture=true;material.disableLighting=true;material.emissiveColor=Color3.White();material.backFaceCulling=false;material.disableDepthWrite=true;material.alpha=art.waterfall.opacity;material.metadata={roadsterOverlay:true};
 const bake=(name:string,g:Geometry,m:StandardMaterial)=>{const mesh=new Mesh(name,scene),v=g.toVertexData();v.uvs=Array.from({length:g.vertexCount},(_,i)=>[g.positions[i*3]/12,g.positions[i*3+2]/12]).flat();v.applyToMesh(mesh);mesh.material=m;mesh.isPickable=false;mesh.metadata={dynamicScenery:true,waterfallScenery:true};return mesh;};
 const built=waterfallCurtains(sites),curtains=bake('yosemite-freefall-curtains',built.geometry,material);curtains.setVerticesData(VertexBuffer.UVKind,built.uvs);curtains.hasVertexAlpha=true;
 const basin=waterfallBasin(sites[0]),pool=bake('yosemite-plunge-basin',basin.water,waterMaterial),rim=bake('yosemite-plunge-rim',basin.rim,stone);rim.receiveShadows=true;
 const foam=new Geometry(),foamSegments=64;
 for(let ring=0;ring<3;ring++)for(let i=0;i<foamSegments;i++){
  const j=(i+1)%foamSegments,ids:number[]=[];
  for(const[a,r]of[[i,.26],[j,.26],[j,.31],[i,.31]]){const p=waterfallPoolPoint(sites[0],a/foamSegments*Math.PI*2,r+ring*.23);ids.push(foam.vertex(p.x,p.y+.025,p.z,hex('#ffffff')));}
  foam.triangle(ids[0],ids[1],ids[2]);foam.triangle(ids[0],ids[2],ids[3]);
 }
 const rings=bake('yosemite-impact-ripples',foam,material),positions=new Float32Array(foam.positions),rippleColors=new Float32Array(foam.colors);rings.setVerticesData(VertexBuffer.PositionKind,positions,true);rings.setVerticesData(VertexBuffer.ColorKind,rippleColors,true);rings.hasVertexAlpha=true;
 const rippleUVs=Array.from({length:foam.vertexCount},(_,i)=>[(i%4<2?0:1),Math.floor(i/4)%13/13]).flat();rings.setVerticesData(VertexBuffer.UVKind,rippleUVs);
 const rippleEdge=Array.from({length:foamSegments+1},(_,i)=>waterfallPoolPoint(sites[0],i/foamSegments*Math.PI*2));
 return{sites,material,pool,rim,curtains,update(time:number,reduced:boolean){
  veil.vOffset=reduced?0:time*art.waterfall.speed;
  if(reduced)return;
  for(let ring=0;ring<3;ring++)for(let i=0;i<foamSegments;i++)for(let corner=0;corner<4;corner++){
   const phase=(time*.43+ring/3)%1,r=.12+phase*.82+(corner>=2?.035:0),edge=rippleEdge[i+(corner===1||corner===2?1:0)],center=sites[0].impact,at=(ring*foamSegments*4+i*4+corner)*3;
   positions[at]=center.x+(edge.x-center.x)*r;positions[at+1]=center.y+.025;positions[at+2]=center.z+(edge.z-center.z)*r;
   rippleColors[at/3*4+3]=(1-phase)*.75;
  }rings.updateVerticesData(VertexBuffer.PositionKind,positions);rings.updateVerticesData(VertexBuffer.ColorKind,rippleColors);
 }};
}

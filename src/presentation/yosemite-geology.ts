import type { TrackBarrier, TrackDefinition } from '../core/types';
import { Geometry, hex, mix, rayToEdge } from './landscape/mesh';
import { fbm2, smoothstep } from './landscape/noise';
import { boulder } from './landscape/rocks';
import { yosemiteAppearance as art } from './themes';
import { yosemiteGranitePoint, yosemiteRockStyle } from './yosemite-granite';
import { waterfallFaceWeight } from './yosemite-waterfall-shape';

/** All cliff faces, joint seams, shelves and rockfall fans share a single draw mesh. */
export function yosemiteGeology(track: TrackDefinition) {
  const all = new Geometry();
  for (const [index,b] of track.barriers.filter(b=>b.kind==='rock').entries()) {
    const style=yosemiteRockStyle(b),columns=b.height>30?72:40,layers=b.height>30?34:18;
    const g=new Geometry(),summit=yosemiteGranitePoint(b,1,0),pole=g.vertex(summit.x,summit.y,summit.z,hex(art.granite[2]));
    const rings=Array.from({length:layers+1},(_,k)=>k===layers?Array<number>(columns).fill(pole):Array.from({length:columns},(_,i)=>{
      const t=k/layers,angle=i/columns*Math.PI*2,p=yosemiteGranitePoint(b,t,angle);
      const grain=fbm2(p.x*.28,p.y*.32+p.z*.11,3),broad=fbm2(p.x*.045+index,p.z*.07+p.y*.04,3);
      const joint=Math.pow(.5+.5*Math.sin(angle*19+.17*Math.sin(t*7)+index),20);
      const exfoliation=Math.pow(.5+.5*Math.sin(t*44+angle*.55),28)*smoothstep(.38,.92,t);
      let color=mix(hex(art.granite[0]),hex(art.granite[2]),Math.max(.12,Math.min(.82,.44+t*.20+grain*.20+broad*.20)));
      color=mix(color,hex(art.granite[3]),joint*.31*(1-smoothstep(.7,.96,t))+exfoliation*.19+Math.max(0,-broad)*.19);
      color=mix(color,hex(art.lichen),(1-smoothstep(.02,.28,t))*(.11+.12*Math.sin(angle*7)**2));
      color=mix(color,hex(art.waterfall.wetRock),waterfallFaceWeight(b,angle)*(1-smoothstep(.72,.84,t))*.5);
      return g.vertex(p.x,p.y,p.z,color);
    }));
    for(let k=0;k<layers;k++)for(let i=0;i<columns;i++){
      const j=(i+1)%columns;if(k<layers-1)g.triangle(rings[k][i],rings[k+1][j],rings[k+1][i]);
      g.triangle(rings[k][i],rings[k][j],rings[k+1][j]);
    }
    all.append(g);
    // Individual irregular blocks break the lower silhouette. Every block is clipped
    // into its parent's authoritative footprint and vertical bounds, including talus.
    const blocks=style==='talus'?9:Math.round(9+b.height*.16);
    const center={x:b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,z:b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length};
    for(let i=0;i<blocks;i++){
      const a=i/blocks*Math.PI*2+index*.53,r=rayToEdge(center,a,b.footprint),size=Math.min(b.height*.19,r*.32,5.8)*( .65+.35*Math.sin(i*2.3+index)**2 );
      const waterfallAngle=b.id==='el-capitan-granite'?art.waterfall.angle:b.id==='bridalveil-granite'?-Math.PI/2:NaN;
      // Leave the entire falling-water/impact sight line clear, including each
      // block's width. The plunge-basin rim already supplies its shoreline rocks.
      if(Number.isFinite(waterfallAngle)&&Math.abs(Math.atan2(Math.sin(a-waterfallAngle),Math.cos(a-waterfallAngle)))<art.waterfall.halfAngle+.30)continue;
      const part=boulder({size:[size*1.6,size,size*1.35],seed:341+index*31+i,detail:1,roundness:3.6,roughness:.18,flatten:.84,
        colour:(_x,_y,_z,up,h)=>mix(hex(art.granite[3]),hex(art.granite[1]),.46+Math.max(0,up)*.24+h*.16)});
      const px=center.x+Math.cos(a)*r*.88,pz=center.z+Math.sin(a)*r*.88;
      for(let j=0;j<part.positions.length;j+=3){
        let x=part.positions[j]+px,z=part.positions[j+2]+pz;
        const ang=Math.atan2(z-center.z,x-center.x),len=Math.hypot(x-center.x,z-center.z),limit=rayToEdge(center,ang,b.footprint)-.025;
        if(len>limit){x=center.x+Math.cos(ang)*limit;z=center.z+Math.sin(ang)*limit;}
        part.positions[j]=x;part.positions[j+1]=(b.baseHeight??0)+Math.min(b.height,Math.max(0,part.positions[j+1]));part.positions[j+2]=z;
      }
      // Positions have changed; normals must be recomputed before batching.
      part.normals=null;all.append(part);
    }
  }
  return all;
}

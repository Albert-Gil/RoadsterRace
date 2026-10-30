import type { TrackDefinition } from '../core/types';
import { Geometry, hex, mix, type Rgb } from './landscape/mesh';
import { yosemiteAppearance as art } from './themes';
import { insideBarrier } from '../core/barriers';

/** Original, batched park architecture and fallen timber, inside existing protected footprints. */
export function yosemiteDressing(track: TrackDefinition) {
  const g = new Geometry(), d = art.dressing;
  const quad = (points: number[][], color: Rgb) => {
    const ids = points.map(p=>g.vertex(p[0],p[1],p[2],color));
    g.triangle(ids[0],ids[1],ids[2]);g.triangle(ids[0],ids[2],ids[3]);
  };
  const box = (x:number,y:number,z:number,w:number,h:number,depth:number,color:string) => {
    const a=x-w/2,b=x+w/2,c=z-depth/2,e=z+depth/2,lo=y-h/2,hi=y+h/2,col=hex(color);
    quad([[a,lo,c],[b,lo,c],[b,hi,c],[a,hi,c]],mix(col,hex('#333a35'),.12));
    quad([[b,lo,e],[a,lo,e],[a,hi,e],[b,hi,e]],col);
    quad([[a,lo,e],[a,lo,c],[a,hi,c],[a,hi,e]],mix(col,hex('#333a35'),.18));
    quad([[b,lo,c],[b,lo,e],[b,hi,e],[b,hi,c]],col);
    quad([[a,hi,c],[b,hi,c],[b,hi,e],[a,hi,e]],mix(col,hex('#efdfba'),.16));
  };
  for (const b of track.barriers.filter(b=>b.kind==='building')) {
    const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,w=Math.max(...xs)-Math.min(...xs),depth=Math.max(...zs)-Math.min(...zs),y=b.baseHeight??0;
    const wallTop=y+b.height*.69,ridge=y+b.height-.06,half=w/2-.08;
    box(x,y+.25,z,w,.5,depth,d.stonework);
    box(x,y+.5+(wallTop-y-.5)/2,z,w-.3,wallTop-y-.5,depth-.3,art.timber);
    // Individual foundation courses, timber siding and corner posts.
    for(let i=0;i<Math.floor(w/1.1);i++)for(const side of[-1,1])box(x-w/2+.65+i*1.1,y+.26,z+side*(depth/2-.035),.92,.26,.06,i%2?d.stonework:'#7c8277');
    for(let yy=y+.75;yy<wallTop-.2;yy+=.42)for(const side of[-1,1])box(x,yy,z+side*(depth/2-.14),w-.4,.055,.035,d.barkDark);
    for(const sx of[-1,1])for(const sz of[-1,1])box(x+sx*(w/2-.25),(y+.5+wallTop)/2,z+sz*(depth/2-.25),.22,wallTop-y-.5,.22,d.trim);
    for(const side of[-1,1]){
      // Sloped roof planes and dark cedar gables; nothing overhangs its collider.
      quad([[x-half,wallTop,z+side*(depth/2-.07)],[x+half,wallTop,z+side*(depth/2-.07)],[x,ridge,z+side*(depth/2-.07)],[x,ridge,z+side*(depth/2-.07)]],hex(d.barkDark));
      const xx=x+side*half;
      const panel=[[xx,wallTop,z-depth/2+.03],[x,ridge,z-depth/2+.03],[x,ridge,z+depth/2-.03],[xx,wallTop,z+depth/2-.03]];
      quad(side<0?panel:panel.reverse(),hex(art.roof));
      // Standing seams follow the sloped surface, rather than floating above it.
      for(let zz=z-depth/2+.45;zz<z+depth/2-.2;zz+=.8){const seam=[[xx,wallTop+.025,zz],[x,ridge+.025,zz],[x,ridge+.025,zz+.045],[xx,wallTop+.025,zz+.045]];quad(side<0?seam:seam.reverse(),hex(d.roofSeam));}
      for(let dx=-w*.31;dx<w*.4;dx+=w*.3){
        const wx=x+dx,wz=z+side*(depth/2-.12),wy=y+b.height*.4;
        box(wx,wy,wz,1.65,1.55,.13,d.trim);box(wx,wy,wz+side*.075,1.35,1.26,.025,art.window);
        box(wx,wy,wz+side*.09,.065,1.25,.025,art.roof);box(wx,wy,wz+side*.09,1.35,.065,.025,art.roof);
      }
    }
    box(x,y+.65,z, .2,.15,.2,d.trim);
    box(x+w/2-.09,y+1.55,z,.12,2.15,1.4,d.barkDark);
    box(x+w/2-.01,y+1.55,z+.42,.035,.12,.12,d.trim);
    // Low chimney stays below the authored roof height.
    box(x-w*.25,wallTop+.35,z+depth*.22,.65,.7,.7,d.stonework);
  }
  for(const[x,z]of[[-36,-17],[-37,12],[-38,34]]) {
    box(x,.85,z,3.2,.15,1.5,art.timber);
    for(const side of[-1,1]){box(x,.5,z+side*1.2,3.2,.15,.5,art.timber);box(x+side,.4,z,.16,.8,2.6,art.roof);}
    for(let i=0;i<4;i++)box(x-1.1+i*.73,.94,z,.025,.025,1.4,d.barkDark);
  }
  // Small park details are deliberately inside the existing protected groves.
  // They share the ranger mesh/material rather than adding per-prop draw calls.
  const grove=track.barriers.filter(b=>b.kind==='infield');
  const inGrove=(x:number,z:number,r=1)=>grove.some(b=>[-1,1].every(sx=>[-1,1].every(sz=>insideBarrier({x:x+sx*r,z:z+sz*r},b))))&&!track.barriers.some(b=>b.kind==='rock'&&insideBarrier({x,z},b));
  for(const [x,z] of [[-37,-17],[-37,12],[-38,34],[46,-17],[57,-15]]){
    if(!inGrove(x,z,2.9))continue;
    // Soft gravel picnic pads, benches and split timber seats.
    box(x,.025,z,5.7,.035,5.7,'#b2a68c');
    if(x>0){box(x,.56,z,3,.14,1.05,art.timber);for(const side of[-1,1]){box(x,.40,z+side*.92,3,.13,.38,art.timber);box(x+side*.85,.26,z,.16,.50,2.12,art.roof);}}
    for(const side of[-1,1])for(let i=0;i<3;i++)box(x-1.15+i*.8,.046,z+side*2.7,.72,.035,.17,d.stonework);
  }
  // A trailhead noticeboard, drinking-water station and bear-resistant storage.
  for(const[x,z]of[[-40,3],[44,-21]])if(inGrove(x,z,1.5)){
    for(const side of[-1,1])box(x+side*.72,.85,z,.15,1.7,.18,art.timber);
    box(x,1.32,z,1.65,.92,.12,d.trim);box(x,1.32,z+.075,1.42,.70,.025,art.roof);
    for(let i=0;i<3;i++)box(x-.36+i*.36,1.34,z+.094,.24,.43,.01,i%2?d.cutWood:'#83917b');
    box(x+1,.42,z+.8,.52,.84,.48,art.roof);box(x+1,.86,z+.8,.62,.06,.56,d.trim);
  }
  for(const[x,z]of[[-43,21],[-26,37],[55,-22]])if(inGrove(x,z,1.7)){
    box(x,.48,z,1.8,.90,.85,'#606a57');box(x,.95,z,1.88,.06,.91,d.trim);
    box(x,.52,z+.44,.06,.12,.025,d.trim);box(x+.65,.52,z+.44,.06,.12,.025,d.trim);
  }
  // Ranger-porch furniture, doors, vents and rain gutters stay within building envelopes.
  for(const b of track.barriers.filter(b=>b.kind==='building')){
    const xs=b.footprint.map(p=>p.x),zs=b.footprint.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,w=Math.max(...xs)-Math.min(...xs),depth=Math.max(...zs)-Math.min(...zs),y=b.baseHeight??0;
    box(x+w/2-.10,y+1.53,z,.10,2.12,1.34,d.trim);box(x+w/2-.035,y+1.53,z,.025,1.88,1.10,d.barkDark);
    box(x+w/2-.016,y+1.70,z,.012,.65,.76,art.window);
    for(const side of[-1,1]){box(x+side*(w/2-.30),y+1.9,z-depth/2+.10,.12,2.8,.12,d.roofSeam);box(x,y+b.height*.69-.14,z+side*(depth/2-.19),w-.4,.13,.13,art.roof);}
  }
  const obstacle=track.barriers.find(b=>b.id==='yosemite-fallen-cedar')!,xs=obstacle.footprint.map(p=>p.x),zs=obstacle.footprint.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,length=Math.max(...xs)-Math.min(...xs),radius=(Math.max(...zs)-Math.min(...zs))/2,y=(obstacle.baseHeight??0)+.83;
  const rings=Array.from({length:18},(_,k)=>Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2,r=radius*(.89+.08*Math.sin(i*5.1+k*.65)**2),c=mix(hex(art.timber),hex(d.barkDark),.2+.55*(.5+.5*Math.sin(i*3.1+k*.15)));return g.vertex(x-length/2+k/17*length,y+Math.cos(a)*r,z+Math.sin(a)*r,c);}));
  for(let k=0;k<17;k++)for(let i=0;i<24;i++){const j=(i+1)%24;g.triangle(rings[k][i],rings[k+1][j],rings[k][j]);g.triangle(rings[k][i],rings[k+1][i],rings[k+1][j]);}
  for(const side of[-1,1]){
    for(let ring=0;ring<10;ring++)for(let i=0;i<24;i++){
      const a=i/24*Math.PI*2,b=(i+1)/24*Math.PI*2,r0=radius*.9*ring/10,r1=radius*.9*(ring+1)/10;
      const cap=[[x+side*(length/2-.002),y+Math.cos(a)*r0,z+Math.sin(a)*r0],[x+side*(length/2-.002),y+Math.cos(a)*r1,z+Math.sin(a)*r1],[x+side*(length/2-.002),y+Math.cos(b)*r1,z+Math.sin(b)*r1],[x+side*(length/2-.002),y+Math.cos(b)*r0,z+Math.sin(b)*r0]];
      quad(side>0?cap.reverse():cap,hex(ring%2?d.cutWood:'#a48b61'));
    }
  }
  // Small broken limbs suggest a natural windfall without extending the obstacle.
  for(const dx of[-5,-1.5,3.4,6.3]){
    const direction=Math.sin(dx)*.2,lower=Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return g.vertex(x+dx+Math.sin(a)*.17,y+.46,z+.12+Math.cos(a)*.17,hex(d.barkDark));});
    const upper=Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return g.vertex(x+dx+direction+Math.sin(a)*.055,y+.91,z+.20+Math.cos(a)*.055,hex(art.timber));});
    const tip=g.vertex(x+dx+direction,y+.91,z+.20,hex(d.cutWood));
    for(let i=0;i<8;i++){const j=(i+1)%8;g.triangle(lower[i],upper[i],lower[j]);g.triangle(lower[j],upper[i],upper[j]);g.triangle(upper[i],tip,upper[j]);}
  }
  return g;
}

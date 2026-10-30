import {hex,mix} from './landscape/mesh';
import {fbm2,smoothstep} from './landscape/noise';
import {yosemiteAppearance as art} from './themes';
import { yosemiteCreekPath } from '../core/tracks/yosemite-terrain';
import { projectToPolyline, cumulative } from '../core/geometry';
const creekDistances = cumulative(yosemiteCreekPath);

/** Shared meadow/fringe colours prevent a bright ribbon around the dirt lane. */
export function yosemiteMeadowColor(x:number,z:number,height:number,slope=0){
 const patches=.5+fbm2(x/24,z/24,4)*.9,shade=.5+fbm2(x/47,z/47,3)*.85;
 let color=mix(hex(art.meadow),hex(art.dryMeadow),smoothstep(.28,.78,patches)*.82);
 color=mix(color,hex(art.forestFloor),smoothstep(.48,.78,shade)*.44);
 if(x>-12&&x<67&&z<31&&z>-180){
  const distance=projectToPolyline({x,z},yosemiteCreekPath,creekDistances).distance;
  color=mix(color,hex(art.dressing.stonework),(1-smoothstep(5,9,distance))*.58);
  color=mix(color,hex(art.fern),(1-smoothstep(8,15,distance))*smoothstep(5,9,distance)*.35);
 }
 const grain=fbm2(x*.68,z*.68,2)*.05;
 return mix(color,hex(art.granite[0]),Math.min(.48,slope*.3+smoothstep(18,60,height)*.20)).map(c=>Math.max(0,c+grain)) as [number,number,number];
}

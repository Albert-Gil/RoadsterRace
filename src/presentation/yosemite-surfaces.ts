import {hex,mix} from './landscape/mesh';
import {fbm2,smoothstep} from './landscape/noise';
import {yosemiteAppearance as art} from './themes';

/** Shared meadow/fringe colours prevent a bright ribbon around the dirt lane. */
export function yosemiteMeadowColor(x:number,z:number,height:number,slope=0){
 const patches=.5+fbm2(x/24,z/24,4)*.6,shade=.5+fbm2(x/47,z/47,3)*.6;
 let color=mix(hex(art.meadow),hex(art.dryMeadow),patches*.6);
 color=mix(color,hex(art.forestFloor),smoothstep(.45,.9,shade)*.3);
 return mix(color,hex(art.granite[0]),Math.min(.48,slope*.3+smoothstep(18,60,height)*.2));
}

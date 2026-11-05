/** Original, fictional LA architecture. Every building stands inside a protected block. */
import {laCityBlocks} from '../core/tracks/la-city-blocks';
export const laBuildings = [
  {x:-29.8,z:-22.8,w:20,d:20.2,h:10,style:0}, {x:1,z:-22.8,w:7,d:20.2,h:40,style:1},
  {x:-29.8,z:0,w:20,d:21.6,h:13,style:2}, {x:1,z:0,w:7,d:21.6,h:42,style:0},
  {x:-29.8,z:23,w:20,d:21,h:9,style:1}, {x:-7,z:23,w:20,d:21,h:7,style:2},
  {x:55,z:25,w:24,d:28,h:8,style:1}, {x:81,z:25,w:24,d:28,h:10,style:2},
  {x:107,z:25,w:24,d:28,h:12,style:0}, {x:-86,z:26,w:18,d:23,h:8,style:2},
  ...Array.from({length:10},(_,i)=>({x:-123+i*30,z:111,w:18+(i%3)*3,d:20,h:[46,70,52,88,58,76,42,64,54,92][i],style:i%3})),
  {x:23.5,z:29,w:37,d:10,h:9.28,style:1},
  ...laCityBlocks.map((b,i)=>({id:b.id,x:b.x,z:b.z,w:b.width,d:b.depth,h:b.height,style:i%3})),
];

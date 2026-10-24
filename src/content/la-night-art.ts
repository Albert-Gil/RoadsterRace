/** Original, fictional LA architecture. Every building stands inside a protected block. */
export const laBuildings = [
  {x:-28,z:-20,w:16,d:15,h:10,style:0}, {x:-7,z:-19,w:13,d:14,h:7,style:1},
  {x:-27,z:4,w:17,d:16,h:13,style:2}, {x:-7,z:5,w:12,d:17,h:10,style:0},
  {x:-27,z:24,w:16,d:12,h:8,style:1}, {x:-7,z:26,w:11,d:10,h:6,style:2},
  {x:55,z:26,w:18,d:22,h:6,style:1}, {x:80,z:27,w:17,d:20,h:8,style:2},
  {x:105,z:27,w:18,d:20,h:10,style:0}, {x:-86,z:26,w:16,d:22,h:7,style:2},
  ...Array.from({length:10},(_,i)=>({x:-123+i*30,z:111,w:18+(i%3)*3,d:20,h:17+(i*13%23),style:i%3})),
];

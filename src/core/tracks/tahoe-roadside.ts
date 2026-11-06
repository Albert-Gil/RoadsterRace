/** Solid exterior equipment pockets. Terrain is sampled after its existing grid is baked;
 * these footprints must never flatten the racing hillside or change its height profile. */
export const tahoeRoadsidePockets=[
 {id:'west-rescue-bay',x:-90,z:-63,width:10,depth:7,kind:'plow'},
 {id:'lakeside-winter-parking',x:122,z:8,width:8,depth:12,kind:'cars'},
 {id:'upper-service-bay',x:100,z:47,width:10,depth:7,kind:'plow'},
 {id:'south-winter-parking',x:18,z:-76,width:12,depth:7,kind:'cars-wide'},
] as const;

/** Authored outer-boulevard frontage. Dimensions are shared by collision and
 * presentation; these parcels remain outside normal roads and approved lanes. */
export const laCityBlocks=[
 ...[-90,-55,-20,15,50,85,120].map((x,i)=>({id:`avenue-south-${i}`,x,z:-80,width:24,depth:14,height:[8,11,7,12,9,10,8][i]})),
 ...[-23,5,33].map((z,i)=>({id:`avenue-west-${i}`,x:-135,z,width:18,depth:24,height:[9,12,8][i]})),
 ...[-80,-44,-8,28,64,100,136].map((x,i)=>({id:`avenue-north-${i}`,x,z:84,width:24,depth:12,height:[8,11,7,10,9,12,8][i]})),
];

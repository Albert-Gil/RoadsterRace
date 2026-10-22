// Reproducible adaptation of the user's MIT-licensed RoadsterLAB procedural geometry.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
const source = 'C:/Users/alber/OneDrive - UC Irvine/Cursor/GitHub/TRoadster';
const text = readFileSync(`${source}/impulse/src/scene.js`, 'utf8');
let car = text.slice(text.indexOf('const CAR=(()=>{'), text.indexOf('function transformMesh'));
car = car.replace('const N=Math.round((X0-X1)/.025)', 'const N=Math.round((X0-X1)/(detail === "showcase" ? .025 : .18))')
  .replace('seg=56', 'seg=detail === "showcase" ? 56 : 8')
  .replace('seg=28', 'seg=detail === "showcase" ? 28 : 10')
  .replace("['floor','satin',6]", "['floor','satin',detail === 'showcase' ? 6 : 1]")
  .replace("['side','paint',6]", "['side','paint',detail === 'showcase' ? 6 : 2]")
  .replace("['deck','paint',3]", "['deck','paint',detail === 'showcase' ? 3 : 1]")
  .replace("['green','paint',5]", "['green','paint',detail === 'showcase' ? 5 : 2]")
  .replace("['crown','paint',7]", "['crown','paint',detail === 'showcase' ? 7 : 3]");
const helper = 'const sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);},dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);';
writeFileSync('src/presentation/roadster-geometry.js', `/** Adapted from RoadsterLAB. Copyright (c) 2026 IMPULSE / TRoadster contributors. MIT; see public/licenses/RoadsterLAB.txt. */\n${helper}\nexport function buildRoadsterGeometry(detail = 'race') {\n${car}\nreturn { ...CAR.build(), mounts: CAR.WHEELS, materials: CAR.MATS, wheelMaterials: CAR.WHEEL_MATS };\n}\n`);
mkdirSync('public/licenses', {recursive:true});
copyFileSync(`${source}/LICENSE`, 'public/licenses/RoadsterLAB.txt');

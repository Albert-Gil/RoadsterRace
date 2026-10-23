import type { LapRecord } from '../core/lap-replay';
let connection:Promise<IDBDatabase>|undefined;
const memory=new Map<string,LapRecord>();
function database(){return connection??=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('roadster-race-laps',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('laps',{keyPath:'key'});
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});}
export function validRecord(value:unknown,key:string):value is LapRecord{
  const r=value as LapRecord;
  return !!r&&r.version===1&&r.key===key&&Number.isFinite(r.duration)&&r.duration>0&&Array.isArray(r.frames)&&r.frames.length>=2&&r.frames.every((f,i)=>!!f&&[f.t,f.x,f.z,f.y,f.heading].every(Number.isFinite)&&typeof f.thrust==='boolean'&&(i===0||f.t>=r.frames[i-1].t))&&r.frames[0].t===0&&Math.abs(r.frames.at(-1)!.t-r.duration)<1e-6;
}
export async function loadLap(key:string):Promise<LapRecord|null>{
  try{const db=await database();const value=await new Promise<unknown>((resolve,reject)=>{const r=db.transaction('laps').objectStore('laps').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(validRecord(value,key)){const old=memory.get(key);if(!old||value.duration<old.duration)memory.set(key,value);}}
  catch{/* Private/storage-disabled browsers retain session records. */}
  return memory.get(key)??null;
}
export async function saveLap(record:LapRecord){
  const old=memory.get(record.key);if(old&&old.duration<=record.duration)return;
  memory.set(record.key,record);
  try{const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('laps','readwrite'),store=tx.objectStore('laps'),r=store.get(record.key);r.onsuccess=()=>{if(!validRecord(r.result,record.key)||r.result.duration>record.duration)store.put(record);};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}catch{/* In-memory copy remains playable. */}
}

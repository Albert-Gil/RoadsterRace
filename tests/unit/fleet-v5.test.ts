import{test,expect}from'vitest';
import{sanDiegoFleetTrack as t}from'../../src/core/tracks/san-diego-fleet';
import{deckAt,onDeck}from'../../src/core/decks';
import{sampleSurface,RULES}from'../../src/core/simulation';
import{fleetGeometry}from'../../src/presentation/fleet';
import{fleetAppearance}from'../../src/presentation/themes';
import{barrierContact}from'../../src/core/barriers';

test('all vessel and ramp footprints are full-grip driving decks, with no sand on the former apron',()=>{
 expect(t.version).toBe(6);expect(t.decks!.every(d=>d.racingSurface)).toBe(true);let free=0,apron=0;
 for(let x=-145;x<145;x+=3)for(let z=-170;z<170;z+=3){const p={x,z},d=deckAt(p,t);if(!d)continue;const s=sampleSurface(p,t);expect(s.sandAmount).toBe(0);expect(s.grip).toBe(RULES.asphaltGrip);expect(s.response).toBe(RULES.asphaltResponse);if(!barrierContact(p,0,t,.3,d.elevation)){free++;if(d.kind==='carrier')apron++;}}
 expect(free).toBeGreaterThan(1000);expect(apron).toBeGreaterThan(500);
});

test('the entire rendered floor uses dark non-skid material; no separate road ribbon is painted',()=>{
 const g=fleetGeometry(t);expect(g.road.vertexCount).toBe(0);expect(g.deck.vertexCount).toBeGreaterThan(80);
 for(let i=0;i<g.deck.colors.length;i++)if(i%4!==3)expect(g.deck.colors[i]).toBeLessThan(.40);
 expect(fleetAppearance.deck).toBe(fleetAppearance.supportDeck);expect(Object.values(g).reduce((n,g)=>n+g.triangleCount,0)).toBeLessThan(120000);
});

test('naval command structures are substantially larger, with multiple large equipment families on actual decks',()=>{
 const area=(ps:{x:number;z:number}[])=>Math.abs(ps.reduce((n,a,i)=>{const b=ps[(i+1)%ps.length];return n+a.x*b.z-b.x*a.z;},0))/2;
 for(const b of t.barriers.filter(b=>b.id==='carrier-a-island'||b.id==='carrier-b-island')){expect(b.height).toBeGreaterThanOrEqual(44);expect(area(b.footprint)*b.height).toBeGreaterThan(56*12*28*2);}
 for(const b of t.barriers.filter(b=>b.id.startsWith('destroyer-bridge')))expect(b.height).toBeGreaterThanOrEqual(28);
 for(const b of t.barriers.filter(b=>b.id.startsWith('support-bridge')))expect(area(b.footprint)*b.height).toBeGreaterThan(14*3.5*8*3);
 const equipment=t.barriers.filter(b=>b.equipmentKind);expect(equipment.length).toBeGreaterThanOrEqual(16);
 for(const role of['early-warning-aircraft','transport-helicopter','deck-crane','crash-truck','missile-launcher'])expect(equipment.filter(b=>b.equipmentKind===role)).toHaveLength(2);
 for(const b of equipment){const owner=t.decks!.find(d=>d.id===b.vesselSurfaceId)!;expect(b.footprint.every(p=>onDeck(p,owner)),b.id).toBe(true);expect(b.sectionId).toBe('fleet-road');}
});

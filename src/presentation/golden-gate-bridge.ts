import {CompositionShapes} from './composition-shapes';
import {goldenBridgeAppearance as art} from './themes';

/**
 * Golden Gate span detail (presentation only). Everything sits on the existing towers, below the
 * deck or on the existing hanger brackets outside the bridge rails: no new support, collider or
 * surface, and the 16 m deck between the rails stays clear.
 * - `red`: tower flutes, Art Deco setbacks, caps, one portal strut high above the deck, and the
 *   stiffening truss and fascia under both deck edges (baked on the bridge-red material).
 * - `metal`: lamp standards on the hanger brackets (baked on the bay-metal material).
 */
export function goldenBridgeDetail(){
 const red=new CompositionShapes(),metal=new CompositionShapes(),t=art.tower,shade=art.shade,deep=art.deep;
 for(const x of t.x){
  for(const z of t.legs){
   // Vertical flutes on the four faces, and two stepped setback bands.
   for(const side of[-1,1])for(const off of[-.36,.36]){
    red.box(x+side*(t.leg/2+.03),t.fluteTop/2+t.fluteBottom/2,z+off,.06,t.fluteTop-t.fluteBottom,.22,deep);
    red.box(x+off,t.fluteTop/2+t.fluteBottom/2,z+side*(t.leg/2+.03),.22,t.fluteTop-t.fluteBottom,.06,deep);
   }
   for(const y of t.bands)red.box(x,y,z,t.leg+.34,.36,t.leg+.34,shade);
   // Stepped cap and saddle housing above the crossbeam.
   red.box(x,t.top+.22,z,t.leg-.2,.44,t.leg-.2,shade);red.box(x,t.top+.62,z,t.leg-.55,.36,t.leg-.55,'#ffffff');
  }
  // A single slim portal strut, well above any car, between the two legs.
  const inner=t.legs[0]+t.leg/2,outer=t.legs[1]-t.leg/2;
  red.box(x,t.portal,(inner+outer)/2,t.leg*.72,.62,outer-inner,shade);
  red.box(x,t.portal-.48,(inner+outer)/2,t.leg*.5,.18,outer-inner,deep);
 }
 // Stiffening truss and fascia under each deck edge, between the abutments.
 const d=art.deck;
 for(const z of d.edges){
  const out=z<42?-1:1,face=z+out*.06;
  red.box(0,(d.fasciaTop+d.fasciaBottom)/2,face,d.length,d.fasciaTop-d.fasciaBottom,.12,'#ffffff');
  red.box(0,d.chordTop,face,d.length,.22,.24,shade);red.box(0,d.chordBottom,face,d.length,.24,.26,shade);
  const n=Math.round(d.length/d.panel);
  for(let i=0;i<=n;i++){
   const x=-d.length/2+i*d.panel;
   red.box(x,(d.chordTop+d.chordBottom)/2,face,.16,d.chordTop-d.chordBottom,.2,shade);
   if(i<n){const x2=x+d.panel,up=i%2===0;red.beam([x,up?d.chordBottom:d.chordTop,face],[x2,up?d.chordTop:d.chordBottom,face],.07,deep,4);}
  }
 }
 // Lamp standards on the hanger brackets, outside the rails.
 const l=art.lamps;
 for(const z of l.z)for(const x of l.x){
  const inward=z<42?1:-1;
  metal.box(x,l.base+l.height/2,z,.14,l.height,.14,'#ffffff');
  metal.box(x,l.base+l.height,z+inward*.35,.16,.12,.9,'#ffffff');
  metal.box(x,l.base+l.height-.1,z+inward*.72,.34,.14,.26,'#f4ecd2');
 }
 return {red,metal};
}

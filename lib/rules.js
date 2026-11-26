/* Rules of the Vaults of Corhaven, shared by the page and the online room server.
   Loaded as a plain <script> in the browser and as a side-effect import in Node; both read globalThis.CorhavenRules.
   A piece is {h, idx, p}: kingdom 0-3, troop 0-3, progress (-1 keep, 0..LAST road, LAST+1..GOAL-1 passage, GOAL vault).
   In Conquest a piece also carries o, the kingdom it first marched for, and idx can pass 3 as an army grows. */
(function(root){
'use strict';
const NTRACK=68;
const LAST=63,GOAL=71;
const BONUS=20;
const STARTS=[0,17,34,51];
const SAFE=new Set([0,17,34,51, 7,24,41,58, 12,29,46,63]);
/* h is the kingdom whose marches are two squares longer. Only the mist is dealt in play; the others stay for the marker lab. */
const WORLD={
  flood:{h:3,name:'The Drowning Tide',lore:'Ancient waterways burst across the old roads.',rule:"Tidereach's movements are two squares longer."},
  ash:{h:0,name:'The Heartfire Rising',lore:'Lava breaks from the scorched ruins of Corhaven.',rule:"Emberhold's movements are two squares longer."},
  wild:{h:1,name:'The Wild Awakening',lore:'Roots and thorned vines reclaim the abandoned roads.',rule:"Thornwald's movements are two squares longer."},
  sun:{h:2,name:'The Searing Seal',lore:'A strange golden light uncovers paths hidden for centuries.',rule:"Solmere's movements are two squares longer."},
  mist:{name:'Mist',lore:'A thick fog covers the board.',rule:"You can see all of your own troops. Enemy troops on the road are hidden unless they're on or next to a square with one of yours."},
  ways:{name:'The Stones of the Pact',lore:'Four stones on the road trade places with the stone opposite.',rule:'Land on 14, 31, 48 or 65 and you are carried to the paired stone. A troop on the stone you enter stays. An enemy on the stone you arrive at falls.'},
};
/* Painted numbers 14, 31, 48 and 65. Tiles are numbered from 1, so these are track indices. Pairs sit on opposite sides of the road. */
const SHIFT={13:47,30:64,47:13,64:30};
/* The mist rolls in after every third round and lifts after the next one. */
const MIST_EVERY=3;
function worldAfter(rounds){return rounds>0&&rounds%MIST_EVERY===0?'mist':null;}
/* Conquest travels where a world id goes, because it changes how troops move: the passages are sealed, so the road never ends,
   and two troops on a square are not a phalanx. */
const CONQUEST='conquest';
/* A kingdom is home once every troop it still has is in the vault. */
function allHome(pieces,h){const mine=pieces.filter(pc=>pc.h===h);return mine.length>0&&mine.every(pc=>pc.p===GOAL);}
function worldBlessing(id){const w=WORLD[id];return w&&w.h!==undefined?w.h:null;}
function progressOn(h,ti){const p=(ti-STARTS[h]+NTRACK)%NTRACK;return p<=LAST?p:null;}

const trackIndex=(h,p)=>(STARTS[h]+p)%NTRACK;
/* at is a track index for a stone this kingdom's progress cannot name. */
function locKey(pc){if(pc.at!=null)return 't'+pc.at;return cellKey(pc.h,pc.p);}
function cellKey(h,p){if(p<0||p>=GOAL)return null;return p<=LAST?'t'+trackIndex(h,p):'h'+h+'_'+p;}
function occupants(pieces,key,exclude){return pieces.filter(pc=>pc!==exclude&&locKey(pc)===key);}
function isBlockade(pieces,key,exclude){const o=occupants(pieces,key,exclude);return o.length>=2&&o[0].h===o[1].h;}
function handOf(hands,h){if(!hands||h==null||h<0)return [];return hands[h]||[];}
function holds(hand,id){return !!(hand&&hand.some(c=>c&&c.id===id));}
/* Phantom March and Wayfarer's Grace let a troop walk through a phalanx. Landing on one is still blocked. */
function pathBlocked(pieces,key,pc,hand,worldId){
  if(worldId===CONQUEST)return false;
  const o=occupants(pieces,key,pc);
  if(o.length<2||o[0].h!==o[1].h)return false;
  if(o[0].h===pc.h&&holds(hand,'grace'))return false;
  if(o[0].h!==pc.h&&holds(hand,'phantom'))return false;
  return true;
}

function stopOnTrack(pieces,pc,ti,worldId){
  const occ=occupants(pieces,'t'+ti,pc);
  /* Conquest has no phalanx. Off a shrine or gate, every enemy on the square falls, even two together. */
  if(worldId===CONQUEST&&!SAFE.has(ti)){
    const foes=occ.filter(o=>o.h!==pc.h);
    if(foes.length)return{captures:foes};
    return occ.length>=2?null:{captures:[]};
  }
  if(occ.length>=2)return null;
  if(occ.length&&STARTS.some((s,i)=>i!==pc.h&&s===ti))return null;
  const captures=(occ.length===1&&occ[0].h!==pc.h&&!SAFE.has(ti))?[occ[0]]:[];
  return{captures};
}
/* A stop on the road. Null when the square cannot take the troop. */
function roadStop(pieces,pc,np,worldId){return stopOnTrack(pieces,pc,trackIndex(pc.h,np),worldId);}
/* A troop standing on a stone outside its road walks the track until the road takes it back.
   In Conquest every march is walked this way, so a troop passes its own passage and starts another lap. */
function landingAlong(pieces,pc,v,hand,worldId){
  let ti=pc.at!=null?pc.at:trackIndex(pc.h,pc.p);
  for(let s=1;s<=v;s++){
    ti=(ti+1)%NTRACK;
    if(s<v&&pathBlocked(pieces,'t'+ti,pc,hand,worldId))return null;
  }
  const prog=progressOn(pc.h,ti);
  if(prog===null){
    const stop=stopOnTrack(pieces,pc,ti,worldId);
    if(!stop)return null;
    return{np:pc.p,at:ti,captures:stop.captures};
  }
  const stop=roadStop(pieces,pc,prog,worldId);
  if(!stop)return null;
  return{np:prog,captures:stop.captures};
}
/* Returns null when the move is illegal, or {np, captures, exit, shift, land, at, push}. */
function landing(pieces,pc,v,hand,worldId){
  if(pc.p===GOAL)return null;
  if(pc.at!=null)return landingAlong(pieces,pc,v,hand,worldId);
  if(pc.p===-1){
    if(v!==1&&v!==6)return null;
    const occ=occupants(pieces,cellKey(pc.h,0),pc);
    const own=occ.filter(o=>o.h===pc.h);
    /* Conquest has no phalanx to form on the gate. A troop of this kingdom already standing there steps one square
       ahead to make room, and lands there like any other move: enemies on that square are captured, and the square
       still holds only two. The troops that step are returned in push. */
    if(worldId===CONQUEST&&own.length){
      const there=occupants(pieces,'t'+trackIndex(pc.h,1));
      const foes=there.filter(o=>o.h!==pc.h);
      if(there.length-foes.length+own.length>2)return null;
      return{np:0,exit:true,captures:occ.filter(o=>o.h!==pc.h).concat(foes),push:own};
    }
    if(own.length>=2)return null;
    return{np:0,exit:true,captures:occ.filter(o=>o.h!==pc.h)};
  }
  if(worldId===CONQUEST)return landingAlong(pieces,pc,v,hand,worldId);
  const np=pc.p+v;if(np>GOAL)return null;
  for(let s=1;s<v;s++){const k=cellKey(pc.h,pc.p+s);if(k&&pathBlocked(pieces,k,pc,hand))return null;}
  if(np===GOAL)return{np,captures:[]};
  if(np>LAST){
    const occ=occupants(pieces,cellKey(pc.h,np),pc);
    if(occ.length>=2)return null;
    return{np,captures:[]};
  }
  const stop=roadStop(pieces,pc,np);
  if(!stop)return null;
  return{np,captures:stop.captures};
}
/* The stone you enter never captures. The troop is carried to the pair, and only an enemy waiting there falls.
   A pair that this kingdom skips is still a landing: the troop stands there by track index. A blocked pair is an illegal move. */
function applyShift(pieces,pc,res,worldId){
  if(!res||worldId!=='ways'||res.exit||(res.at==null&&res.np>LAST))return res;
  const entry=res.at!=null?res.at:trackIndex(pc.h,res.np);
  const pair=SHIFT[entry];
  if(pair===undefined)return res;
  const dest=progressOn(pc.h,pair);
  const stop=dest===null?stopOnTrack(pieces,pc,pair):roadStop(pieces,pc,dest);
  if(!stop)return null;
  if(dest===null)return{np:res.np,at:pair,captures:stop.captures,shift:true,land:res.np};
  return{np:dest,captures:stop.captures,shift:true,land:res.np};
}
/* A landing that would put a second troop of yours on a lone friend. Broken Formation forbids that. */
function freshPhalanx(pieces,pc,res){
  if(!res||res.np<0||res.np>=GOAL)return false;
  const key=res.at!=null?'t'+res.at:cellKey(pc.h,res.np);
  if(!key)return false;
  return occupants(pieces,key,pc).filter(o=>o.h===pc.h).length===1;
}
/* The Unbroken leaves the protected troop where it stands. The square still holds only two. */
function spareUnbroken(pieces,pc,res,hands){
  if(!res||!res.captures||!res.captures.length)return res;
  const used=new Set(),captures=[],spared=[];
  for(const o of res.captures){
    if(!used.has(o.h)&&holds(handOf(hands,o.h),'unbroken')){used.add(o.h);spared.push(o);}
    else captures.push(o);
  }
  if(!spared.length)return res;
  const key=res.exit?cellKey(pc.h,0):(res.at!=null?'t'+res.at:cellKey(pc.h,res.np));
  const staying=(key?occupants(pieces,key,pc):[]).filter(o=>!captures.includes(o));
  if(staying.length+1>2)return null;
  return Object.assign({},res,{captures,spared});
}
function resolveLanding(pieces,pc,v,worldId,hands){
  const hand=handOf(hands,pc.h);
  const res=applyShift(pieces,pc,landing(pieces,pc,v,hand,worldId),worldId);
  if(!res)return null;
  if(holds(hand,'broken')&&freshPhalanx(pieces,pc,res))return null;
  return spareUnbroken(pieces,pc,res,hands);
}
/* The Pilgrim lengthens the move that enters the passage, or the next one that already starts inside it. */
function pilgrimApplies(pc,v,hand){
  if(!holds(hand,'pilgrim')||pc.at!=null||pc.p<0||pc.p>=GOAL)return false;
  if(pc.p>LAST)return true;
  return pc.p+v>LAST;
}
function moveResult(pieces,pc,v,worldId,hands){
  const hand=handOf(hands,pc.h);
  if(holds(hand,'sealed')&&pc.p===-1)return null;
  const bless=pc.p!==-1&&worldBlessing(worldId)===pc.h?2:0;
  const pilgrim=pilgrimApplies(pc,v,hand)?2:0;
  const land=(dist,flag)=>{const res=resolveLanding(pieces,pc,dist,worldId,hands);if(res&&flag)res.pilgrim=true;return res;};
  if(bless&&pilgrim){
    const both=land(v+4,true);if(both)return both;
    const just=land(v+2,false);if(just)return just;
    return land(v,false);
  }
  if(bless||pilgrim){const boosted=land(v+2,!!pilgrim);if(boosted)return boosted;}
  return land(v,false);
}
/* King's Favor: the first unused die that is not a bonus march, when one higher is a legal move. */
function favorDie(pieces,h,pending,worldId,hands){
  if(!holds(handOf(hands,h),'favor'))return -1;
  const di=pending.findIndex(d=>d&&!d.used&&!d.bonus);
  if(di<0)return -1;
  const v=pending[di].v+1;
  return pieces.some(pc=>pc.h===h&&moveResult(pieces,pc,v,worldId,hands))?di:-1;
}
function playedValue(pieces,h,pending,di,worldId,hands){
  const d=pending[di];if(!d)return 0;
  return favorDie(pieces,h,pending,worldId,hands)===di?d.v+1:d.v;
}
/* Painted squares walked before a stone hop. A troop on a foreign stone follows the track, not a straight line. */
function walkSpan(pc,res){
  if(!res||res.exit)return 0;
  if(pc.at!=null){
    let dest;
    if(res.shift){
      if(res.at!=null)dest=SHIFT[res.at];
      else if(res.land!=null)dest=trackIndex(pc.h,res.land);
      else dest=trackIndex(pc.h,res.np);
    }else if(res.at!=null)dest=res.at;
    else dest=trackIndex(pc.h,res.np);
    return (dest-pc.at+NTRACK)%NTRACK;
  }
  const land=res.shift?res.land:res.np;
  if(land==null||pc.p==null)return 0;
  /* A Conquest march that runs past the passage, or round onto a new lap, is counted along the track. */
  if(!res.shift&&pc.p>=0&&(res.at!=null||land<pc.p))return ((res.at!=null?res.at:trackIndex(pc.h,land))-trackIndex(pc.h,pc.p)+NTRACK)%NTRACK;
  return Math.max(0,land-pc.p);
}
function options(pieces,h,pending,worldId,hands){
  const mine=pieces.filter(pc=>pc.h===h);const out=[];
  const favorDi=favorDie(pieces,h,pending,worldId,hands);
  pending.forEach((d,di)=>{
    if(d.used)return;
    const v=di===favorDi?d.v+1:d.v;
    mine.forEach(pc=>{const r=moveResult(pieces,pc,v,worldId,hands);if(r)out.push({di,pc,r,v,favor:di===favorDi});});
  });
  return out;
}
function inPhalanx(pieces,pc){
  if(pc.p<0||pc.p>=GOAL)return false;
  const key=locKey(pc);let n=0;
  for(const o of pieces)if(o.h===pc.h&&locKey(o)===key)n++;
  return n>=2;
}
/* A double opens a phalanx: one locked troop marches with it, before anyone chooses the other die. */
function phalanxDouble(pieces,h,pending,worldId,hands){
  if(worldId===CONQUEST||pending.some(d=>d.used))return null;
  const dice=pending.filter(d=>!d.bonus);
  if(dice.length<2||dice.some(d=>d.v!==dice[0].v))return null;
  return options(pieces,h,pending,worldId,hands).find(o=>inPhalanx(pieces,o.pc))||null;
}
function inDanger(pieces,h,np){
  if(np<0||np>LAST)return false;const ti=trackIndex(h,np);if(SAFE.has(ti))return false;
  return pieces.some(o=>{
    if(o.h===h)return false;
    if(o.at!=null){const d=(ti-o.at+NTRACK)%NTRACK;return d>=1&&d<=12;}
    if(o.p<0||o.p>LAST)return false;
    const d=(ti-trackIndex(o.h,o.p)+NTRACK)%NTRACK;return d>=1&&d<=12&&o.p+d<=LAST;
  });
}
/* Conquest has no race to score. The computer hunts, shelters on shrines and gates, and guards the first troops that keep it alive. */
function conquestScore(pieces,o,rand){
  const{pc,r}=o;let s=(rand||Math.random)()*2;
  const spot=q=>q.at!=null?q.at:trackIndex(q.h,q.p);
  const dest=r.exit?STARTS[pc.h]:(r.at!=null?r.at:trackIndex(pc.h,r.np));
  const foes=pieces.filter(x=>x.h!==pc.h&&x.p>=0&&x.p<=LAST);
  const hunted=ti=>!SAFE.has(ti)&&foes.some(x=>{const d=(ti-spot(x)+NTRACK)%NTRACK;return d>=1&&d<=12;});
  const worth=pc.o===pc.h?1.6:1;
  r.captures.forEach(c=>{s+=110;if(c.o===c.h)s+=30;if(c.o===pc.h)s+=45;});
  if(r.exit)s+=40;
  /* Leaving the keep sends a troop on the gate one square out, off its safe square. */
  if(r.push&&hunted(trackIndex(pc.h,1)))r.push.forEach(q=>{s-=30*(q.o===q.h?1.6:1);});
  if(SAFE.has(dest))s+=16;
  else if(!r.exit&&occupants(pieces,'t'+dest,pc).some(x=>x.h===pc.h))s-=14;
  if(hunted(dest))s-=30*worth;
  if(pc.p>=0&&hunted(spot(pc)))s+=22*worth;
  if(foes.some(x=>{const d=(spot(x)-dest+NTRACK)%NTRACK;return d>=1&&d<=12&&!SAFE.has(spot(x));}))s+=8;
  return s;
}
function cpuScore(pieces,o,rand,worldId){
  if(worldId===CONQUEST)return conquestScore(pieces,o,rand);
  const{pc,r}=o;const np=r.np;let s=np*0.25+(rand||Math.random)()*2;
  if(np===GOAL)s+=100;
  if(r.captures.length)s+=85+r.captures.reduce((a,c)=>a+c.p,0)*0.6;
  if(r.exit)s+=55;
  if(np>LAST&&np<GOAL)s+=35;
  if(np<=LAST&&SAFE.has(trackIndex(pc.h,np)))s+=18;
  /* A locked square stalls the race. The computer would rather march than stack a barricade. */
  if(!r.exit&&(r.at!=null?occupants(pieces,'t'+r.at,pc).some(x=>x.h===pc.h):np<=LAST&&occupants(pieces,cellKey(pc.h,np),pc).some(x=>x.h===pc.h)))s-=18;
  if(inDanger(pieces,pc.h,np))s-=26;
  if(pc.p>=0&&inDanger(pieces,pc.h,pc.p))s+=20;
  return s;
}
function bestOption(pieces,opts,rand,worldId){
  let best=null,bs=-1e9;opts.forEach(o=>{const s=cpuScore(pieces,o,rand,worldId);if(s>bs){bs=s;best=o;}});return best;
}

/* Conquest. A captured troop changes kingdoms instead of going home. */
function freeIdx(pieces,h){const used=new Set(pieces.filter(p=>p.h===h).map(p=>p.idx));let i=0;while(used.has(i))i++;return i;}
/* The troop joins the captor's keep. Returns the kingdom and number it answers to now. */
function enlist(pieces,pc,h){
  const idx=freeIdx(pieces.filter(p=>p!==pc),h);
  pc.h=h;pc.idx=idx;pc.p=-1;delete pc.at;
  return{h,idx};
}
/* A kingdom has fallen when it holds none of the troops it started with. */
function fallen(pieces,h){return !pieces.some(p=>p.h===h&&p.o===h);}
/* The troops a fallen kingdom still holds change banners where they stand. Each entry is {from:{h,idx}, to:{h,idx}, p, at}. */
function absorb(pieces,from,to){
  const out=[];
  pieces.filter(p=>p.h===from).forEach(pc=>{
    const was={h:pc.h,idx:pc.idx};
    const idx=freeIdx(pieces,to);
    if(pc.p>=0){
      const ti=pc.at!=null?pc.at:trackIndex(from,pc.p);
      const prog=progressOn(to,ti);
      if(prog===null){pc.p=LAST;pc.at=ti;}
      else{pc.p=prog;delete pc.at;}
    }
    pc.h=to;pc.idx=idx;
    out.push({from:was,to:{h:to,idx},p:pc.p,at:pc.at!=null?pc.at:null});
  });
  return out;
}

/* Adaptive dice. Standard rolls stay uniform. Help starts only after two turns with no legal move,
   and a single face never rises above maxFace. Endgame help is separate and off until playtesting turns it on.
   A player who is strictly ahead keeps ordinary dice for that endgame help. */
const ADAPT={enabled:true,inactivity:true,endgame:false,dryTurns:2,finishMisses:2,maxFace:0.30,minFace:0.08};
function adaptCfg(cfg){return Object.assign({},ADAPT,cfg||{});}
function facesWhere(pieces,h,worldId,pred,hands){
  const out=[];
  for(let v=1;v<=6;v++){if(options(pieces,h,[{v}],worldId,hands).some(pred))out.push(v);}
  return out;
}
function usefulFaces(pieces,h,worldId,hands){return facesWhere(pieces,h,worldId,()=>true,hands);}
function finishFaces(pieces,h,worldId,hands){return facesWhere(pieces,h,worldId,o=>o.r.np===GOAL,hands);}
function pairOptions(pieces,h,vals,worldId,hands){return options(pieces,h,[{v:vals[0]},{v:vals[1]}],worldId,hands);}
function progressScore(pieces,h){
  return pieces.filter(p=>p.h===h).reduce((s,p)=>s+(p.p===GOAL?1000:p.p<0?0:p.p+1),0);
}
function inTheLead(pieces,players,h){
  if(!players||players.length<2)return false;
  const mine=progressScore(pieces,h);
  return players.every(p=>p.h===h||progressScore(pieces,p.h)<mine);
}
/* Boosted faces share what is left after the others keep minFace, and nothing exceeds maxFace. Null means stay uniform. */
function faceWeights(boosted,maxFace,minFace){
  const boost=new Set(boosted);const u=boost.size;
  if(!u||u===6)return null;
  const rest=6-u;
  let eachU=(1-rest*minFace)/u,eachR=minFace;
  if(eachU>maxFace){eachU=maxFace;eachR=(1-u*maxFace)/rest;}
  if(!(eachU>0)||!(eachR>0)||eachU>maxFace+1e-9||eachR>maxFace+1e-9)return null;
  const w=[];
  for(let v=1;v<=6;v++)w.push(boost.has(v)?eachU:eachR);
  const sum=w.reduce((a,b)=>a+b,0);
  return w.map(x=>x/sum);
}
function drawUniform(rng){return 1+Math.floor(rng()*6);}
function drawWeighted(weights,rng){
  let r=rng(),a=0;
  for(let i=0;i<6;i++){a+=weights[i];if(r<a||i===5)return i+1;}
  return 6;
}
/* vals is null when this roll should stay an ordinary throw. Otherwise the caller lands the dice on vals. */
function adaptRoll(pieces,h,worldId,state,players,rng,cfg,hands){
  const c=adaptCfg(cfg);
  const none={vals:null,assisted:false,reason:null};
  if(!c.enabled||typeof rng!=='function')return none;
  const stuck=c.inactivity&&((state&&state.dry)||0)>=c.dryTurns;
  const closing=c.endgame&&((state&&state.finishMiss)||0)>=c.finishMisses&&!inTheLead(pieces,players,h);
  if(!stuck&&!closing)return none;
  const natural=[drawUniform(rng),drawUniform(rng)];
  if(stuck){
    if(pairOptions(pieces,h,natural,worldId,hands).length)return{vals:natural,assisted:false,reason:null};
    const w=faceWeights(usefulFaces(pieces,h,worldId,hands),c.maxFace,c.minFace);
    if(!w)return{vals:natural,assisted:false,reason:null};
    return{vals:[drawWeighted(w,rng),drawWeighted(w,rng)],assisted:true,reason:'inactivity'};
  }
  if(pairOptions(pieces,h,natural,worldId,hands).some(o=>o.r.np===GOAL))return{vals:natural,assisted:false,reason:null};
  const w=faceWeights(finishFaces(pieces,h,worldId,hands),c.maxFace,c.minFace);
  if(!w)return{vals:natural,assisted:false,reason:null};
  return{vals:[drawWeighted(w,rng),drawWeighted(w,rng)],assisted:true,reason:'endgame'};
}
function noteDry(state,madeMove){if(!state)return;state.dry=madeMove?0:(state.dry||0)+1;}
/* A finishing face was available and the roll did not include one. Reaching the vault clears it. */
function noteFinish(pieces,h,worldId,state,a,b,hands){
  if(!state)return;
  const faces=finishFaces(pieces,h,worldId,hands);
  if(!faces.length)return;
  state.finishMiss=(faces.includes(a)||faces.includes(b))?0:(state.finishMiss||0)+1;
}
function noteVault(state){if(state)state.finishMiss=0;}
/* One roll, already recorded. Highest total first. Equal totals stay together, in the order they were given. */
function orderGroups(entries){
  const sorted=entries.slice().sort((a,b)=>b.total-a.total);
  const groups=[];
  for(let k=0;k<sorted.length;){
    const total=sorted[k].total;
    let end=k+1;
    while(end<sorted.length&&sorted[end].total===total)end++;
    groups.push(sorted.slice(k,end));
    k=end;
  }
  return groups;
}
function diceReport(stats,now){
  if(!stats)return null;
  const turns=stats.turns||0,started=stats.started||stats.t0||0,clock=now||Date.now();
  return{turns,noMoves:stats.noMoves||0,assisted:stats.assisted||0,noMoveRate:turns?(stats.noMoves||0)/turns:0,assistRate:turns?(stats.assisted||0)/turns:0,durationMs:started?Math.max(0,clock-started):0};
}

/* Fate cards. A shrine deals four. A kingdom keeps one, and a hand holds two. */
const HAND_MAX=2;
const FATE=[
  {id:'favor',cat:'Blessing',title:"The King's Favor",duration:'Until you use that die, or your next turn ends.',clock:'nextTurn',desc:'Add 1 to your next die, as long as the higher number still makes a legal move. Bonus moves are not affected.'},
  {id:'phantom',cat:'Blessing',title:'Phantom March',duration:'Through your next turn.',clock:'nextTurn',desc:'Your troops can move through enemy phalanxes, but can\'t land on them.'},
  {id:'unbroken',cat:'Blessing',title:'The Unbroken',duration:'Until it protects a troop, or your next turn ends.',clock:'nextTurn',desc:'The next time one of your troops would be captured, it stays on its square instead.'},
  {id:'grace',cat:'Blessing',title:"Wayfarer's Grace",duration:'Through your next turn.',clock:'nextTurn',desc:'Your troops can move through your own phalanxes, but can\'t land on them.'},
  {id:'sight',cat:'Blessing',title:'True Sight',duration:'Through the next Mist.',clock:'mist',desc:'You can see every enemy troop while the Mist covers the board.'},
  {id:'mark',cat:'Tactical',title:"The Hunter's Mark",duration:'Until your next capture.',clock:'capture',desc:'Your next capture gives a bonus move of 30 squares instead of 20.'},
  {id:'chance',cat:'Tactical',title:'Second Chance',duration:'Until you use it.',clock:'used',desc:'Reroll both dice once, before you move a troop.'},
  {id:'decree',cat:'Tactical',title:'Royal Decree',duration:'Takes effect right away.',clock:'instant',instant:true,desc:'Bring one troop out of your keep without rolling a 1 or a 6. Your gate needs room for it.'},
  {id:'pilgrim',cat:'Tactical',title:'The Pilgrim',duration:'Until one of your troops uses it.',clock:'vault',desc:'The next time one of your troops moves into or along its passage, it moves 2 extra squares.'},
  {id:'burden',cat:'Curse',title:"The King's Burden",duration:'Until your next bonus move, or your next turn ends.',clock:'nextTurn',desc:'Your next bonus move is 10 squares instead of 20.'},
  {id:'broken',cat:'Curse',title:'Broken Formation',duration:'Through your next turn.',clock:'nextTurn',desc:'You can\'t form new phalanxes. Phalanxes already on the board stay.'},
  {id:'wanderer',cat:'Curse',title:'The Wanderer',duration:'Takes effect right away.',clock:'instant',instant:true,desc:'The troop that landed on the shrine moves to a random empty square on its road.'},
  {id:'sealed',cat:'Curse',title:'Sealed Gates',duration:'Through your next turn.',clock:'nextTurn',desc:'You can\'t bring troops out of your keep.'}
];
const FATE_BY={};FATE.forEach(c=>{FATE_BY[c.id]=c;});
function fateCard(id){return FATE_BY[id]||null;}
function copyHands(hands){const out=[[],[],[],[]];for(let h=0;h<4;h++)out[h]=handOf(hands,h).map(c=>Object.assign({},c));return out;}
function landedShrine(pc){
  if(!pc||pc.p<0||pc.p>LAST)return false;
  const ti=pc.at!=null?pc.at:trackIndex(pc.h,pc.p);
  return SAFE.has(ti)&&STARTS.indexOf(ti)<0;
}
function canDecree(pieces,h,worldId,hands){
  if(holds(handOf(hands,h),'sealed'))return false;
  return pieces.some(pc=>pc.h===h&&pc.p===-1&&!!moveResult(pieces,pc,1,worldId,hands));
}
/* These rewrite the same bonus. A hand and a deal each keep one of them. */
const FATE_CLASH=[['mark','burden']];
function fateClashes(a,b){
  if(!a||!b||a===b)return false;
  return FATE_CLASH.some(group=>group.indexOf(a)>=0&&group.indexOf(b)>=0);
}
function fateBlocked(id,ids){
  return (ids||[]).some(other=>fateClashes(id,other));
}
function fateOffer(hand,rng,ctx){
  const c=ctx||{};
  const held=(hand||[]).map(card=>card.id);
  let pool=FATE.filter(card=>held.indexOf(card.id)<0&&!fateBlocked(card.id,held));
  if(!c.mistOn)pool=pool.filter(card=>card.id!=='sight');
  if(!canDecree(c.pieces||[],c.h,c.worldId,c.hands))pool=pool.filter(card=>card.id!=='decree');
  const bag=pool.slice();
  for(let i=bag.length-1;i>0;i--){const j=Math.floor((rng?rng():Math.random())*(i+1));const t=bag[i];bag[i]=bag[j];bag[j]=t;}
  const offer=[];
  bag.forEach(card=>{
    if(offer.length>=4||fateBlocked(card.id,offer))return;
    offer.push(card.id);
  });
  return offer;
}
function fateStamp(id,seq,turnCount,round,mistUp){
  const meta=FATE_BY[id];if(!meta)return null;
  const card={id,seq};
  if(meta.clock==='nextTurn')card.born=turnCount||0;
  if(meta.clock==='round')card.untilRound=(round||0)+1;
  if(meta.clock==='mist')card.mist=mistUp?'live':'wait';
  return card;
}
/* pick must be one of the four. A full hand names the card it gives up. An instant never takes a slot. */
function fateAccept(hand,offer,pick,drop,stamp){
  const held=hand||[];
  if(!offer||offer.indexOf(pick)<0||!FATE_BY[pick])return null;
  if(FATE_BY[pick].instant){if(drop)return null;return{hand:held.map(c=>Object.assign({},c)),instant:pick,dropped:null};}
  if(held.length>=HAND_MAX){if(!drop||!held.some(c=>c.id===drop))return null;}
  else if(drop)return null;
  const next=(drop?held.filter(c=>c.id!==drop):held.slice()).map(c=>Object.assign({},c));
  const made=typeof stamp==='function'?stamp(pick):stamp;
  if(!made||made.id!==pick)return null;
  if(fateBlocked(pick,next.map(card=>card.id)))return null;
  next.push(made);
  return{hand:next,instant:null,dropped:drop||null};
}
function fateSees(hand){return (hand||[]).some(c=>c.id==='sight'&&c.mist==='live');}
function captureBonusOf(hand){
  const marks=(hand||[]).filter(c=>c.id==='mark');
  if(marks.length){const c=marks.slice().sort((a,b)=>(b.seq||0)-(a.seq||0))[0];return{v:30,spend:c.id};}
  if(holds(hand,'burden'))return{v:10,spend:'burden'};
  return{v:BONUS,spend:null};
}
function vaultBonusOf(hand){
  if(holds(hand,'burden'))return{v:10,spend:'burden'};
  return{v:BONUS,spend:null};
}
/* Spend the cards a move used. Capture and vault bonuses come back with the hand that remains. */
function fateResolve(hands,h,info){
  const next=copyHands(hands);const spent=[];const n=info||{};
  const spend=(kh,id)=>{const i=next[kh].findIndex(c=>c.id===id);if(i<0)return;next[kh].splice(i,1);spent.push({h:kh,id});};
  if(n.favor)spend(h,'favor');
  (n.spared||[]).forEach(kh=>spend(kh,'unbroken'));
  if(n.pilgrim)spend(h,'pilgrim');
  let captureBonus=BONUS,vaultBonus=BONUS;
  const captureCount=Number(n.captures)||0;
  if(captureCount>0){const b=captureBonusOf(next[h]);captureBonus=b.v;if(b.spend)spend(h,b.spend);}
  if(n.goal){const b=vaultBonusOf(next[h]);vaultBonus=b.v;if(b.spend)spend(h,b.spend);spend(h,'pilgrim');}
  return{hands:next,spent,captureBonus,vaultBonus};
}
/* Drop cards whose clock has run out. A mist that arrives wakes True Sight; one that lifts spends it. */
function fateTick(hands,ev){
  const e=ev||{};const next=copyHands(hands);const spent=[];
  for(let h=0;h<4;h++){
    next[h]=next[h].filter(card=>{
      const meta=FATE_BY[card.id];if(!meta)return false;
      /* born is the turn it was drawn. It stays through the next turn, then burns as the one after begins. */
      if(e.turn&&e.turn.h===h&&meta.clock==='nextTurn'&&(card.born||0)+1<e.turn.count){spent.push({h,id:card.id});return false;}
      if(e.round!=null&&meta.clock==='round'&&card.untilRound<=e.round){spent.push({h,id:card.id});return false;}
      if(e.mist===false&&card.id==='sight'&&card.mist==='live'){spent.push({h,id:card.id});return false;}
      if(e.vault===h&&card.id==='pilgrim'){spent.push({h,id:card.id});return false;}
      return true;
    }).map(card=>{
      if(e.mist===true&&card.id==='sight'&&card.mist==='wait')return Object.assign({},card,{mist:'live'});
      return card;
    });
  }
  return{hands:next,spent};
}
function fateRank(id,pieces,h){
  const keep=(pieces||[]).filter(p=>p.h===h&&p.p<0).length;
  const table={favor:40,phantom:28,unbroken:36,grace:18,sight:24,mark:50,chance:32,decree:keep?56:-80,pilgrim:30,burden:-46,broken:-38,wanderer:0,sealed:keep?-60:-12};
  return table[id]||0;
}
function bestFate(offer,hand,pieces,h){
  const ids=offer||[];const held=hand||[];if(!ids.length)return null;
  let best=null,score=-1e9;
  const scoreHand=list=>list.reduce((a,c)=>a+fateRank(c.id,pieces,h),0);
  for(const pick of ids){
    if(FATE_BY[pick]&&FATE_BY[pick].instant){
      const v=fateRank(pick,pieces,h)+scoreHand(held);
      if(v>score){score=v;best={pick,drop:null};}
      continue;
    }
    if(held.length<HAND_MAX){
      const v=scoreHand(held.concat([{id:pick}]));
      if(v>score){score=v;best={pick,drop:null};}
      continue;
    }
    for(const drop of held){
      const v=scoreHand(held.filter(c=>c!==drop).concat([{id:pick}]));
      if(v>score){score=v;best={pick,drop:drop.id};}
    }
  }
  return best;
}
function isShrineTile(ti){return SAFE.has(ti)&&STARTS.indexOf(ti)<0;}
/* An empty square on this troop's own road, ahead or behind. Shrines, the passage, and the vault are not chosen. */
function wanderSquare(pieces,pc,rng){
  if(!pc||pc.p<0||pc.p>LAST)return null;
  const here=pc.at!=null?pc.at:trackIndex(pc.h,pc.p);
  const bag=[];
  for(let ti=0;ti<NTRACK;ti++){
    if(ti===here||isShrineTile(ti))continue;
    const np=progressOn(pc.h,ti);
    if(np===null)continue;
    if(occupants(pieces,'t'+ti,pc).length)continue;
    bag.push({ti:ti,np:np});
  }
  if(!bag.length)return null;
  let i=Math.floor((typeof rng==='function'?rng():Math.random())*bag.length);
  if(i<0||i>=bag.length)i=bag.length-1;
  return bag[i];
}
function emptyHands(){return[[],[],[],[]];}

root.CorhavenRules={NTRACK,LAST,GOAL,BONUS,STARTS,SAFE,WORLD,SHIFT,MIST_EVERY,CONQUEST,enlist,fallen,absorb,worldAfter,allHome,worldBlessing,progressOn,trackIndex,cellKey,locKey,occupants,isBlockade,moveResult,playedValue,walkSpan,options,inDanger,cpuScore,bestOption,inPhalanx,phalanxDouble,ADAPT,usefulFaces,finishFaces,faceWeights,inTheLead,adaptRoll,noteDry,noteFinish,noteVault,orderGroups,diceReport,HAND_MAX,FATE,fateCard,landedShrine,canDecree,fateClashes,fateOffer,fateStamp,fateAccept,fateSees,fateResolve,fateTick,fateRank,bestFate,wanderSquare,holds,handOf,emptyHands,copyHands};
})(globalThis);

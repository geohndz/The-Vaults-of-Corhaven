/* Rules of the Vaults of Corhaven, shared by the page and the online room server.
   Loaded as a plain <script> in the browser and as a side-effect import in Node; both read globalThis.CorhavenRules.
   A piece is {h, idx, p}: kingdom 0-3, troop 0-3, progress (-1 keep, 0..LAST road, LAST+1..GOAL-1 passage, GOAL vault). */
(function(root){
'use strict';
const NTRACK=68;
const LAST=63,GOAL=71;
const BONUS=20;
const STARTS=[0,17,34,51];
const SAFE=new Set([0,17,34,51, 7,24,41,58, 12,29,46,63]);
/* The March turns once each kingdom has marched. h is the kingdom whose marches are two squares longer. */
const WORLD={
  flood:{h:3,name:'The Drowning Tide',lore:'Ancient waterways burst across the old roads.',rule:"Tidereach's marches are two squares longer."},
  ash:{h:0,name:'The Heartfire Rising',lore:'Lava breaks from the scorched ruins of Corhaven.',rule:"Emberhold's marches are two squares longer."},
  wild:{h:1,name:'The Wild Awakening',lore:'Roots and thorned vines reclaim the abandoned roads.',rule:"Thornwald's marches are two squares longer."},
  sun:{h:2,name:'The Searing Seal',lore:'A strange golden light uncovers paths hidden for centuries.',rule:"Solmere's marches are two squares longer."},
  mist:{name:'The Veil of Mist',lore:'An unnatural fog hides everything beyond a short distance.',rule:'You see your own troops, and an enemy only on the next square. Markers for a hidden enemy stay off the board.'},
  ways:{name:'The Stones of the Pact',lore:'Four stones on the road trade places with the stone opposite.',rule:'Land on 14, 31, 48 or 65 and you are carried to the paired stone. A troop on the stone you enter stays. An enemy on the stone you arrive at falls.'},
};
/* Painted numbers 14, 31, 48 and 65. Tiles are numbered from 1, so these are track indices. Pairs sit on opposite sides of the road. */
const SHIFT={13:47,30:64,47:13,64:30};
function worldBlessing(id){const w=WORLD[id];return w&&w.h!==undefined?w.h:null;}
function progressOn(h,ti){const p=(ti-STARTS[h]+NTRACK)%NTRACK;return p<=LAST?p:null;}

const trackIndex=(h,p)=>(STARTS[h]+p)%NTRACK;
/* at is a track index for a stone this kingdom's progress cannot name. */
function locKey(pc){if(pc.at!=null)return 't'+pc.at;return cellKey(pc.h,pc.p);}
function cellKey(h,p){if(p<0||p>=GOAL)return null;return p<=LAST?'t'+trackIndex(h,p):'h'+h+'_'+p;}
function occupants(pieces,key,exclude){return pieces.filter(pc=>pc!==exclude&&locKey(pc)===key);}
function isBlockade(pieces,key,exclude){const o=occupants(pieces,key,exclude);return o.length>=2&&o[0].h===o[1].h;}

function stopOnTrack(pieces,pc,ti){
  const occ=occupants(pieces,'t'+ti,pc);
  if(occ.length>=2)return null;
  if(occ.length&&STARTS.some((s,i)=>i!==pc.h&&s===ti))return null;
  const captures=(occ.length===1&&occ[0].h!==pc.h&&!SAFE.has(ti))?[occ[0]]:[];
  return{captures};
}
/* A stop on the road. Null when the square cannot take the troop. */
function roadStop(pieces,pc,np){return stopOnTrack(pieces,pc,trackIndex(pc.h,np));}
/* A troop standing on a stone outside its road walks the track until the road takes it back. */
function landingAlong(pieces,pc,v){
  let ti=pc.at;
  for(let s=1;s<=v;s++){
    ti=(ti+1)%NTRACK;
    if(s<v&&isBlockade(pieces,'t'+ti,pc))return null;
  }
  const prog=progressOn(pc.h,ti);
  if(prog===null){
    const stop=stopOnTrack(pieces,pc,ti);
    if(!stop)return null;
    return{np:pc.p,at:ti,captures:stop.captures};
  }
  const stop=roadStop(pieces,pc,prog);
  if(!stop)return null;
  return{np:prog,captures:stop.captures};
}
/* Returns null when the move is illegal, or {np, captures, exit, shift, land, at}. */
function landing(pieces,pc,v){
  if(pc.p===GOAL)return null;
  if(pc.at!=null)return landingAlong(pieces,pc,v);
  if(pc.p===-1){
    if(v!==1&&v!==6)return null;
    const occ=occupants(pieces,cellKey(pc.h,0),pc);
    if(occ.filter(o=>o.h===pc.h).length>=2)return null;
    return{np:0,exit:true,captures:occ.filter(o=>o.h!==pc.h)};
  }
  const np=pc.p+v;if(np>GOAL)return null;
  for(let s=1;s<v;s++){const k=cellKey(pc.h,pc.p+s);if(k&&isBlockade(pieces,k,pc))return null;}
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
function moveResult(pieces,pc,v,worldId){
  const bless=pc.p!==-1&&worldBlessing(worldId)===pc.h;
  if(bless){
    const boosted=applyShift(pieces,pc,landing(pieces,pc,v+2),worldId);
    if(boosted)return boosted;
  }
  return applyShift(pieces,pc,landing(pieces,pc,v),worldId);
}
function options(pieces,h,pending,worldId){
  const mine=pieces.filter(pc=>pc.h===h);const out=[];
  pending.forEach((d,di)=>{if(d.used)return;mine.forEach(pc=>{const r=moveResult(pieces,pc,d.v,worldId);if(r)out.push({di,pc,r});});});
  return out;
}
function inPhalanx(pieces,pc){
  if(pc.p<0||pc.p>=GOAL)return false;
  const key=locKey(pc);let n=0;
  for(const o of pieces)if(o.h===pc.h&&locKey(o)===key)n++;
  return n>=2;
}
/* A double opens a phalanx: one locked troop marches with it, before anyone chooses the other die. */
function phalanxDouble(pieces,h,pending,worldId){
  if(pending.some(d=>d.used))return null;
  const dice=pending.filter(d=>!d.bonus);
  if(dice.length<2||dice.some(d=>d.v!==dice[0].v))return null;
  return options(pieces,h,pending,worldId).find(o=>inPhalanx(pieces,o.pc))||null;
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
function cpuScore(pieces,o,rand){
  const{pc,r}=o;const np=r.np;let s=np*0.25+(rand||Math.random)()*2;
  if(np===GOAL)s+=100;
  if(r.captures.length)s+=85+r.captures.reduce((a,c)=>a+c.p,0)*0.6;
  if(r.exit)s+=55;
  if(np>LAST&&np<GOAL)s+=35;
  if(np<=LAST&&SAFE.has(trackIndex(pc.h,np)))s+=18;
  if(!r.exit&&(r.at!=null?occupants(pieces,'t'+r.at,pc).some(x=>x.h===pc.h):np<=LAST&&occupants(pieces,cellKey(pc.h,np),pc).some(x=>x.h===pc.h)))s+=12;
  if(inDanger(pieces,pc.h,np))s-=26;
  if(pc.p>=0&&inDanger(pieces,pc.h,pc.p))s+=20;
  return s;
}
function bestOption(pieces,opts,rand){
  let best=null,bs=-1e9;opts.forEach(o=>{const s=cpuScore(pieces,o,rand);if(s>bs){bs=s;best=o;}});return best;
}

/* Adaptive dice. Standard rolls stay uniform. Help starts only after two turns with no legal move,
   and a single face never rises above maxFace. Endgame help is separate and off until playtesting turns it on.
   A player who is strictly ahead keeps ordinary dice for that endgame help. */
const ADAPT={enabled:true,inactivity:true,endgame:false,dryTurns:2,finishMisses:2,maxFace:0.30,minFace:0.08};
function adaptCfg(cfg){return Object.assign({},ADAPT,cfg||{});}
function facesWhere(pieces,h,worldId,pred){
  const out=[];
  for(let v=1;v<=6;v++){if(options(pieces,h,[{v}],worldId).some(pred))out.push(v);}
  return out;
}
function usefulFaces(pieces,h,worldId){return facesWhere(pieces,h,worldId,()=>true);}
function finishFaces(pieces,h,worldId){return facesWhere(pieces,h,worldId,o=>o.r.np===GOAL);}
function pairOptions(pieces,h,vals,worldId){return options(pieces,h,[{v:vals[0]},{v:vals[1]}],worldId);}
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
function adaptRoll(pieces,h,worldId,state,players,rng,cfg){
  const c=adaptCfg(cfg);
  const none={vals:null,assisted:false,reason:null};
  if(!c.enabled||typeof rng!=='function')return none;
  const stuck=c.inactivity&&((state&&state.dry)||0)>=c.dryTurns;
  const closing=c.endgame&&((state&&state.finishMiss)||0)>=c.finishMisses&&!inTheLead(pieces,players,h);
  if(!stuck&&!closing)return none;
  const natural=[drawUniform(rng),drawUniform(rng)];
  if(stuck){
    if(pairOptions(pieces,h,natural,worldId).length)return{vals:natural,assisted:false,reason:null};
    const w=faceWeights(usefulFaces(pieces,h,worldId),c.maxFace,c.minFace);
    if(!w)return{vals:natural,assisted:false,reason:null};
    return{vals:[drawWeighted(w,rng),drawWeighted(w,rng)],assisted:true,reason:'inactivity'};
  }
  if(pairOptions(pieces,h,natural,worldId).some(o=>o.r.np===GOAL))return{vals:natural,assisted:false,reason:null};
  const w=faceWeights(finishFaces(pieces,h,worldId),c.maxFace,c.minFace);
  if(!w)return{vals:natural,assisted:false,reason:null};
  return{vals:[drawWeighted(w,rng),drawWeighted(w,rng)],assisted:true,reason:'endgame'};
}
function noteDry(state,madeMove){if(!state)return;state.dry=madeMove?0:(state.dry||0)+1;}
/* A finishing face was available and the roll did not include one. Reaching the vault clears it. */
function noteFinish(pieces,h,worldId,state,a,b){
  if(!state)return;
  const faces=finishFaces(pieces,h,worldId);
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

root.CorhavenRules={NTRACK,LAST,GOAL,BONUS,STARTS,SAFE,WORLD,SHIFT,worldBlessing,progressOn,trackIndex,cellKey,locKey,occupants,isBlockade,moveResult,options,inDanger,cpuScore,bestOption,inPhalanx,phalanxDouble,ADAPT,usefulFaces,finishFaces,faceWeights,inTheLead,adaptRoll,noteDry,noteFinish,noteVault,orderGroups,diceReport};
})(globalThis);

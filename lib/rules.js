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
  flood:{h:3,name:'The Great Flood',lore:'Ancient waterways burst across the old roads.',rule:"Tidereach's marches are two squares longer."},
  ash:{h:0,name:'Ashen Skies',lore:'Lava breaks from the scorched ruins of Corhaven.',rule:"Emberhold's marches are two squares longer."},
  wild:{h:1,name:'The Wild Awakening',lore:'Roots and thorned vines reclaim the abandoned roads.',rule:"Thornwald's marches are two squares longer."},
  sun:{h:2,name:"The Sun's Ascendance",lore:'A strange golden light uncovers paths hidden for centuries.',rule:"Solmere's marches are two squares longer."},
  mist:{name:'The Veil of Mist',lore:'An unnatural fog hides everything beyond a short distance.',rule:'You see your own troops, and an enemy only on the next square.'},
  ways:{name:'The Shifting Ways',lore:'Four stones on the road trade places with the stone opposite.',rule:'Land on 14, 31, 48 or 65 and you are carried to the paired stone. An enemy waiting there falls.'},
};
/* Painted numbers 14, 31, 48 and 65. Tiles are numbered from 1, so these are track indices. Pairs sit on opposite sides of the road. */
const SHIFT={13:47,30:64,47:13,64:30};
function worldBlessing(id){const w=WORLD[id];return w&&w.h!==undefined?w.h:null;}
function progressOn(h,ti){const p=(ti-STARTS[h]+NTRACK)%NTRACK;return p<=LAST?p:null;}

const trackIndex=(h,p)=>(STARTS[h]+p)%NTRACK;
function cellKey(h,p){if(p<0||p>=GOAL)return null;return p<=LAST?'t'+trackIndex(h,p):'h'+h+'_'+p;}
function occupants(pieces,key,exclude){return pieces.filter(pc=>pc!==exclude&&cellKey(pc.h,pc.p)===key);}
function isBlockade(pieces,key,exclude){const o=occupants(pieces,key,exclude);return o.length>=2&&o[0].h===o[1].h;}

/* A stop on the road. Null when the square cannot take the troop. */
function roadStop(pieces,pc,np){
  const occ=occupants(pieces,cellKey(pc.h,np),pc);
  if(occ.length>=2)return null;
  const ti=trackIndex(pc.h,np);
  if(occ.length&&STARTS.some((s,i)=>i!==pc.h&&s===ti))return null;
  const captures=(occ.length===1&&occ[0].h!==pc.h&&!SAFE.has(ti))?[occ[0]]:[];
  return{captures};
}
/* Returns null when the move is illegal, or {np, captures, exit, shift, land}. */
function landing(pieces,pc,v){
  if(pc.p===GOAL)return null;
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
/* A shifting stone carries the troop to its pair and does not capture whoever was standing on the stone just left.
   If the pair is off this kingdom's road, or cannot take the troop, the stone is an ordinary square. */
function applyShift(pieces,pc,res,worldId){
  if(!res||worldId!=='ways'||res.exit||res.np>LAST)return res;
  const pair=SHIFT[trackIndex(pc.h,res.np)];
  if(pair===undefined)return res;
  const dest=progressOn(pc.h,pair);
  if(dest===null)return res;
  const stop=roadStop(pieces,pc,dest);
  if(!stop)return res;
  return{np:dest,captures:stop.captures,shift:true,land:res.np};
}
function moveResult(pieces,pc,v,worldId){
  const plain=landing(pieces,pc,v);
  if(pc.p===-1||worldBlessing(worldId)!==pc.h)return applyShift(pieces,pc,plain,worldId);
  const boosted=landing(pieces,pc,v+2);
  return applyShift(pieces,pc,boosted||plain,worldId);
}
function options(pieces,h,pending,worldId){
  const mine=pieces.filter(pc=>pc.h===h);const out=[];
  pending.forEach((d,di)=>{if(d.used)return;mine.forEach(pc=>{const r=moveResult(pieces,pc,d.v,worldId);if(r)out.push({di,pc,r});});});
  return out;
}
function inDanger(pieces,h,np){
  if(np<0||np>LAST)return false;const ti=trackIndex(h,np);if(SAFE.has(ti))return false;
  return pieces.some(o=>{if(o.h===h||o.p<0||o.p>LAST)return false;const d=(ti-trackIndex(o.h,o.p)+NTRACK)%NTRACK;return d>=1&&d<=12&&o.p+d<=LAST;});
}
function cpuScore(pieces,o,rand){
  const{pc,r}=o;const np=r.np;let s=np*0.25+(rand||Math.random)()*2;
  if(np===GOAL)s+=100;
  if(r.captures.length)s+=85+r.captures.reduce((a,c)=>a+c.p,0)*0.6;
  if(r.exit)s+=55;
  if(np>LAST&&np<GOAL)s+=35;
  if(np<=LAST&&SAFE.has(trackIndex(pc.h,np)))s+=18;
  if(!r.exit&&np<=LAST&&occupants(pieces,cellKey(pc.h,np),pc).some(x=>x.h===pc.h))s+=12;
  if(inDanger(pieces,pc.h,np))s-=26;
  if(pc.p>=0&&inDanger(pieces,pc.h,pc.p))s+=20;
  return s;
}
function bestOption(pieces,opts,rand){
  let best=null,bs=-1e9;opts.forEach(o=>{const s=cpuScore(pieces,o,rand);if(s>bs){bs=s;best=o;}});return best;
}

root.CorhavenRules={NTRACK,LAST,GOAL,BONUS,STARTS,SAFE,WORLD,SHIFT,worldBlessing,progressOn,trackIndex,cellKey,occupants,isBlockade,moveResult,options,inDanger,cpuScore,bestOption};
})(globalThis);

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

const trackIndex=(h,p)=>(STARTS[h]+p)%NTRACK;
function cellKey(h,p){if(p<0||p>=GOAL)return null;return p<=LAST?'t'+trackIndex(h,p):'h'+h+'_'+p;}
function occupants(pieces,key,exclude){return pieces.filter(pc=>pc!==exclude&&cellKey(pc.h,pc.p)===key);}
function isBlockade(pieces,key,exclude){const o=occupants(pieces,key,exclude);return o.length>=2&&o[0].h===o[1].h;}

/* Returns null when the move is illegal, or {np, captures, exit} */
function moveResult(pieces,pc,v){
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
  const occ=occupants(pieces,cellKey(pc.h,np),pc);
  if(occ.length>=2)return null;
  if(np<=LAST){const ti=trackIndex(pc.h,np);if(occ.length&&STARTS.some((s,i)=>i!==pc.h&&s===ti))return null;} // another kingdom's gate: only when empty
  const captures=(np<=LAST&&occ.length===1&&occ[0].h!==pc.h&&!SAFE.has(trackIndex(pc.h,np)))?[occ[0]]:[];
  return{np,captures};
}
function options(pieces,h,pending){
  const mine=pieces.filter(pc=>pc.h===h);const out=[];
  pending.forEach((d,di)=>{if(d.used)return;mine.forEach(pc=>{const r=moveResult(pieces,pc,d.v);if(r)out.push({di,pc,r});});});
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

root.CorhavenRules={NTRACK,LAST,GOAL,BONUS,STARTS,SAFE,trackIndex,cellKey,occupants,isBlockade,moveResult,options,inDanger,cpuScore,bestOption};
})(globalThis);

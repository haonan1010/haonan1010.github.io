/* A separate camera-space mesh: real front/back faces, edge depth and perspective. */
let swordViewCanvas=null,swordViewContext=null,swordViewMesh=null,swordViewTier=-1;
function swordMesh(tier){
 const palettes=[{body:'#a77c47',edge:'#d4b077',dark:'#66472a',steel:'#795a35',wrap:'#76502e',band:'#ba8d50'},{body:'#929f9e',edge:'#d7dfd7',dark:'#465553',steel:'#71817e',wrap:'#574635',band:'#9d936c'},{body:'#c7dadb',edge:'#f3ffff',dark:'#657d80',steel:'#a8bfc0',wrap:'#513c2c',band:'#b6a176'}],p=palettes[Math.min(2,tier)]||palettes[0],mesh=[];
 function box(x,y,z,w,h,d,color){for(const f of faces)mesh.push({q:f.q.map(v=>[x+(v[0]-.5)*w,y+v[1]*h,z+(v[2]-.5)*d]),n:f.n,color});}
 function surface(q,color,normal){mesh.push({q,n:normal,color});}
 // Continuous solid blade: broad faces, two ground bevels, and a stepped pointed silhouette.
 const sections=[[.055,.075],[.16,.106],[.86,.106],[.96,.075],[1.035,.037],[1.10,.002]];
 const ring=(y,w)=>{const shoulder=Math.max(.001,w-.023),thickness=Math.min(.028,w*.65);return [[-w,y,0],[-shoulder,y,-thickness],[shoulder,y,-thickness],[w,y,0],[shoulder,y,thickness],[-shoulder,y,thickness]];};
 const rings=sections.map(([y,w])=>ring(y,w));
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<6;j++){let q=[rings[k][j],rings[k+1][j],rings[k+1][(j+1)%6],rings[k][(j+1)%6]],u=q[1].map((v,i)=>v-q[0][i]),v=q[2].map((n,i)=>n-q[0][i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;n=n.map(v=>v/len);const center=q.reduce((a,v)=>a.map((n,i)=>n+v[i]/4),[0,0,0]);if(n[0]*center[0]+n[2]*center[2]<0){q=q.reverse();n=n.map(v=>-v);}surface(q,j===1||j===4?p.body:j===0||j===5?p.edge:p.dark,n);}
 surface([...rings[0]].reverse(),p.dark,[0,-1,0]);surface(rings[rings.length-1],p.edge,[0,1,0]);
 // Flush pixel details on each blade face, rather than raised tiles.
 for(const side of [-1,1]){const z=side*.0282,n=[0,0,side];surface([[-.012,.17,z],[.012,.17,z],[.012,.84,z],[-.012,.84,z]],p.dark,n);for(let i=0;i<7;i++){const y=.20+i*.088,x=i%2?-.032:.026;surface([[x-.014,y,z],[x+.014,y,z],[x+.014,y+.045,z],[x-.014,y+.045,z]],i%2?p.body:p.edge,n);}}
 // Symmetric stepped quillons and a raised central collar.
 box(0,-.035,0,.31,.075,.105,p.steel);for(const side of [-1,1]){box(side*.17,-.005,0,.09,.075,.105,p.dark);box(side*.215,.035,0,.075,.065,.105,p.steel);}box(0,.015,0,.14,.075,.11,p.steel);box(0,-.08,0,.125,.047,.115,p.band);
 // Recessed grip with four leather wraps, metal ferrule and compact two-step pommel.
 box(0,-.36,0,.092,.28,.083,p.wrap);for(let i=0;i<4;i++){const y=-.335+i*.063;box(0,y,0,.098,.018,.09,i%2?p.wrap:p.band);}box(0,-.39,0,.115,.035,.103,p.band);box(0,-.445,0,.15,.055,.12,p.dark);box(0,-.46,0,.105,.02,.092,p.steel);
 return mesh;
}
function swordPose(progress=0,kind='idle',variant=0){
 const idle={grip:[.72,-.76,1.55],axis:[.35,.93,.22],twist:.12};
 if(kind==='idle')return idle;
 const dash=kind==='dash',execution=kind==='execution';
 let frames=dash?[[0,[.35,-.75,1.55],[-.25,.35,.9],-.15],[.3,[.08,-.68,1.65],[-.13,.13,.98],-.45],[1,[.08,-.69,1.7],[-.13,.13,.98],-.45]]:
 [[0,idle.grip,idle.axis,idle.twist],[.08,execution?[.66,-.62,1.53]:[.73,-.73,1.52],execution?[-.12,.99,.03]:[.23,.97,.02],-.05],[.24,execution?[.38,-.67,1.70]:[.55,-.65,1.74],execution?[-.58,-.30,.76]:[-.72,.12,.68],-.52],[.40,execution?[.35,-.78,1.72]:[.53,-.77,1.73],execution?[-.64,-.38,.67]:[-.80,-.10,.59],-.58],[.80,execution?[.53,-.83,1.63]:[.64,-.83,1.62],[-.18,.75,.64],-.05],[1,idle.grip,idle.axis,idle.twist]];

 // The execution strike lands at 0.15 * .95s, matching the existing .14s impact cue.
 if(execution)frames=[
 [0,idle.grip,idle.axis,idle.twist],
 [.075,[.56,-.08,1.42],[-.23,.97,.12],-.78],
 [.15,[.27,.08,1.66],[-.34,-.84,.43],-.72],
 [.255,[.27,.08,1.66],[-.34,-.84,.43],-.72],
 [.34,[.31,.13,1.62],[-.42,-.76,.49],-.60],
 [.56,[.34,-.02,1.65],[-.41,-.70,.58],-.48],
 [.72,[.55,-.65,1.60],[-.28,.62,.73],-.45],
 [.88,[.66,-.77,1.51],[.23,.93,.27],.38],
 [1,idle.grip,idle.axis,idle.twist]];
 else if(!dash&&variant===1)frames=[
 [0,idle.grip,idle.axis,idle.twist],
 [.08,[.75,-.72,1.48],[.18,.94,.28],-.22],
 [.23,[.39,-.57,1.80],[-.38,.10,.92],-.86],
 [.38,[.38,-.59,1.82],[-.43,.04,.90],-.92],
 [.76,[.64,-.81,1.64],[-.12,.72,.68],-.20],
 [1,idle.grip,idle.axis,idle.twist]];
 else if(!dash&&variant===2)frames=[
 [0,idle.grip,idle.axis,idle.twist],
 [.10,[.64,-.42,1.48],[.02,.99,.12],-.36],
 [.25,[.43,-.51,1.77],[-.58,-.38,.72],-.64],
 [.40,[.42,-.61,1.78],[-.66,-.43,.62],-.68],
 [.78,[.61,-.82,1.62],[-.18,.69,.70],-.10],
 [1,idle.grip,idle.axis,idle.twist]];

 else if(!dash&&variant>=3&&variant<=7){
 const cuts={
 3:{wind:[.69,-.92,1.52],wa:[.32,.70,.62],hit:[.43,-.72,1.76],ha:[-.71,.36,.60],follow:[.44,-.63,1.78],fa:[-.76,.43,.49],twist:.24},
 4:{wind:[.80,-.57,1.52],wa:[.14,.91,.39],hit:[.58,-.46,1.77],ha:[-.91,.02,.41],follow:[.52,-.49,1.79],fa:[-.94,-.10,.33],twist:-.28},
 5:{wind:[.75,-.44,1.49],wa:[.03,.99,.10],hit:[.48,-.57,1.75],ha:[-.72,-.22,.66],follow:[.45,-.68,1.79],fa:[-.77,-.29,.57],twist:.48},
 6:{wind:[.68,-.87,1.49],wa:[.16,.75,.64],hit:[.29,-.74,1.88],ha:[-.22,.22,.95],follow:[.27,-.72,1.91],fa:[-.28,.24,.93],twist:-1.05},
 7:{wind:[.62,-.34,1.49],wa:[-.05,.99,.14],hit:[.44,-.38,1.77],ha:[-.45,-.55,.70],follow:[.41,-.53,1.81],fa:[-.53,-.58,.61],twist:-.78}
 }[variant];
 frames=[[0,idle.grip,idle.axis,idle.twist],[.08,cuts.wind,cuts.wa,cuts.twist*.35],[.24,cuts.hit,cuts.ha,cuts.twist],[.39,cuts.follow,cuts.fa,cuts.twist],[.77,[.64,-.82,1.63],[-.13,.73,.67],-.12],[1,idle.grip,idle.axis,idle.twist]];
 }
 const t=Math.max(0,Math.min(1,progress));if(!dash&&!execution){const handed=variant%2?1:-1;frames.splice(frames.length-1,0,[.89,[.68,-.77,1.52],[.18,.94,.29],handed*.68]);}let a=frames[0],b=frames[frames.length-1];for(let i=1;i<frames.length;i++)if(t<=frames[i][0]){a=frames[i-1];b=frames[i];break;}let k=(t-a[0])/(b[0]-a[0]||1);k=k*k*(3-2*k);return {grip:a[1].map((v,i)=>v+(b[1][i]-v)*k),axis:a[2].map((v,i)=>v+(b[2][i]-v)*k+(i===2&&!dash?Math.sin(Math.PI*Math.min(1,(execution?(t>.255?t-.105:Math.min(t,.15)):t)/.8))*(execution?.25:.38):0)),twist:a[3]+(b[3]-a[3])*k};
}
function swordTransform(pose){if(pose.forward){const f=pose.forward,up=pose.axis,dot=up.reduce((sum,v,i)=>sum+v*f[i],0),a=up.map((v,i)=>v-f[i]*dot),al=Math.hypot(...a)||1,u=a.map(v=>v/al),r=[u[1]*f[2]-u[2]*f[1],u[2]*f[0]-u[0]*f[2],u[0]*f[1]-u[1]*f[0]];return {point:v=>v.map((_,i)=>pose.grip[i]+r[i]*v[0]+u[i]*v[1]+f[i]*v[2]),normal:v=>v.map((_,i)=>r[i]*v[0]+u[i]*v[1]+f[i]*v[2])};}const len=Math.hypot(...pose.axis)||1,u=pose.axis.map(v=>v/len);let r=[u[1],-u[0],0],l=Math.hypot(...r)||1;r=r.map(v=>v/l);const n=[r[1]*u[2]-r[2]*u[1],r[2]*u[0]-r[0]*u[2],r[0]*u[1]-r[1]*u[0]],c=Math.cos(pose.twist),s=Math.sin(pose.twist),right=r.map((v,i)=>v*c+n[i]*s),normal=n.map((v,i)=>v*c-r[i]*s);return {point:v=>v.map((_,i)=>pose.grip[i]+right[i]*v[0]+u[i]*v[1]+normal[i]*v[2]),normal:v=>v.map((_,i)=>right[i]*v[0]+u[i]*v[1]+normal[i]*v[2])};}
function swordPolygons(mesh,pose,width,height){const focal=Math.min(height*.95,width*.95),offset=.36*width/focal*1.55-.72,fitted=pose.fitted?pose:{...pose,grip:[pose.grip[0]+offset,pose.grip[1],pose.grip[2]]},transform=swordTransform(fitted),f=pose.weaponFov?height/(2*Math.tan(pose.weaponFov/2)):Math.min(height*.95,width*.95),result=[];for(const face of mesh){const q=face.q.map(transform.point);if(q.some(v=>v[2]<.15))continue;const center=q.reduce((a,v)=>a.map((n,i)=>n+v[i]/q.length),[0,0,0]),n=transform.normal(face.n);if(n[0]*-center[0]+n[1]*-center[1]+n[2]*-center[2]<=0)continue;const light=.48+.48*Math.max(0,n[0]*.32+n[1]*.55-n[2]*.77),hex=face.color.slice(1),rgb=[0,2,4].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*light)));result.push({depth:center[2],points:q.map(v=>[width*.5+v[0]*f/v[2],height*.5-v[1]*f/v[2]]),color:'rgb('+rgb.join(',')+')'});}return result.sort((a,b)=>b.depth-a.depth);}
function renderSwordView(){if(!swordViewCanvas){swordViewCanvas=document.createElement('canvas');swordViewCanvas.id='swordView3D';swordViewCanvas.setAttribute('aria-hidden','true');document.body.appendChild(swordViewCanvas);swordViewContext=swordViewCanvas.getContext('2d');}const visible=playing&&survival.hp>0&&(activeTool==='sword'||activeTool==='bow');swordViewCanvas.style.display=visible?'block':'none';if(!visible||!swordViewContext)return;const ratio=Math.min(1,1100/innerWidth),w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(swordViewCanvas.width!==w||swordViewCanvas.height!==h){swordViewCanvas.width=w;swordViewCanvas.height=h;}const ctx=swordViewContext;ctx.clearRect(0,0,w,h);if(activeTool==='bow'){renderBowViewMesh(ctx,w,h);return;}if(swordViewTier!==survival.weapon){swordViewTier=survival.weapon;swordViewMesh=swordMesh(swordViewTier);}let kind='idle',t=0;if(dashState){kind='dash';t=1-dashState.remaining/.22;}else if(attackAnimation>0&&document.body.classList.contains('swinging')){kind=document.body.classList.contains('executing')?'execution':'swing';const duration=kind==='execution'?.95:swordVisualStep===2?.5:swordVisualStep===7?.48:.44;t=1-attackAnimation/duration;}if(REDUCED_FX){kind='idle';t=0;}const variant=swordVisualStep;const pose=swordPose(t,kind,variant);if(kind==='idle'&&!REDUCED_FX&&(keys.w||keys.a||keys.s||keys.d)){pose.grip[0]+=Math.sin(combatClock*7)*.012;pose.grip[1]+=Math.cos(combatClock*14)*.009;}for(const p of swordPolygons(swordViewMesh,pose,w,h)){ctx.fillStyle=p.color;ctx.beginPath();p.points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fill();}}

let bowViewMeshCache=null,bowViewCacheKey='',bowReleaseAt=-100;
let bowAimCacheAt=-100,bowAimCacheDistance=48;
function bowViewScale(distance){return Math.min(.35,distance*.3);}
function bowAimDistance(force=false){if(!force&&combatClock-bowAimCacheAt<.05)return bowAimCacheDistance;bowAimCacheAt=combatClock;const eye=[player.x,player.y+1.62,player.z],dir=direction();let distance=48;for(const m of mobs){if(m.dead)continue;const hull=enemyHull(m),d=intersectBox(eye,dir,[m.x-hull.x,m.y,m.z-hull.z],[m.x+hull.x,m.y+hull.h,m.z+hull.z]);if(d!==null&&d>=.1&&d<distance)distance=d;}for(let t=.1;t<=distance;t+=.1){if(solidAtPoint(...eye.map((v,i)=>v+dir[i]*t))){distance=t;break;}}bowAimCacheDistance=Math.max(.25,distance);return bowAimCacheDistance;}
function bowViewPose(charge=0,recoil=0,distance=bowAimDistance()){const edgeX=.36*(innerWidth/innerHeight)*2*Math.tan(viewFov/2)*1.645,grip=[edgeX-recoil*.02,-.27-recoil*.02,1.62+charge*.025+recoil*.08],to=[-grip[0],-grip[1],Math.max(distance/bowViewScale(distance),grip[2]+.8)-grip[2]],len=Math.hypot(...to)||1;return {grip,axis:[.10,.994,.035],twist:0,forward:to.map(v=>v/len),fitted:true,weaponFov:viewFov};}
function bowViewLaunchOffsets(distance=bowAimDistance()){return swordTransform(bowViewPose(Math.min(1,bowCharge),0,distance)).point([0,0,.55]).map(v=>v*bowViewScale(distance));}
function bowViewMesh(charge=0,tier=0,loaded=true,marked=false){const mesh=[],wood=tier?'#688f86':'#94612e',edge=tier?'#afd6c6':'#d3a665',metal=tier?'#b3dbd4':'#a5b0a4';
 function box(x,y,z,w,h,d,color){for(const f of faces)mesh.push({q:f.q.map(v=>[x+(v[0]-.5)*w,y+v[1]*h,z+(v[2]-.5)*d]),n:f.n,color});}
 function rod(a,b,width,depth,color){const delta=b.map((v,i)=>v-a[i]),len=Math.hypot(...delta)||1,u=delta.map(v=>v/len);let r=[u[1],-u[0],0],rl=Math.hypot(...r);if(rl<.001)r=[1,0,0];else r=r.map(v=>v/rl);const n=[r[1]*u[2]-r[2]*u[1],r[2]*u[0]-r[0]*u[2],r[0]*u[1]-r[1]*u[0]],rot=v=>v.map((_,i)=>r[i]*v[0]+u[i]*v[1]+n[i]*v[2]);for(const f of faces)mesh.push({q:f.q.map(v=>rot([(v[0]-.5)*width,v[1]*len,(v[2]-.5)*depth]).map((v,i)=>v+a[i])),n:rot(f.n),color});}
 const q=Math.max(0,Math.min(1,charge)),tips=[];for(const side of [-1,1]){const points=[[0,0,0],[0,side*.17,.028],[0,side*.33,.005-q*.025],[0,side*.47,-.055-q*.075],[0,side*.59,-.20-q*.12]];for(let i=1;i<points.length;i++)rod(points[i-1],points[i],.070-i*.006,.082-i*.008,wood);for(let i=1;i<points.length;i++){const a=points[i-1].map((v,k)=>k===0?v-.022:v),b=points[i].map((v,k)=>k===0?v-.022:v);rod(a,b,.012,.082-i*.008,edge);}tips.push(points[points.length-1]);const tip=points[points.length-1];box(0,tip[1]-.018,tip[2],.063,.036,.064,metal);}
 box(0,-.11,0,.096,.22,.11,'#493b2b');for(let i=0;i<4;i++)box(0,-.085+i*.047,-.057,.098,.012,.007,'#b5a17c');
 const nock=[0,0,-.20-q*.45];for(const tip of tips)rod(tip,nock,.009,.009,q>=.98?'#f3e9c7':'#b4b5a7');
 if(loaded){rod(nock,[0,0,.48],.017,.017,'#c9ae78');for(const x of [-1,1])box(x*.024,-.031,nock[2]+.04,.006,.062,.12,'#deded0');box(0,-.025,.48,.055,.05,.06,marked?'#b6a2ef':metal);box(0,-.014,.54,.030,.028,.025,marked?'#e5d9ff':'#e3e9df');}
 return mesh;
}
function renderBowViewMesh(ctx,w,h){const charge=bowDrawing?Math.min(1,bowCharge):0,stage=Math.round(charge*18),marked=triangleQuickDraw(),key=[stage,homestead.bowTier,homestead.arrows>0,marked].join(':');if(key!==bowViewCacheKey){bowViewCacheKey=key;bowViewMeshCache=bowViewMesh(stage/18,homestead.bowTier,homestead.arrows>0,marked);}const age=combatClock-bowReleaseAt,recoil=!REDUCED_FX&&age>=0&&age<.24?Math.sin(age/.24*Math.PI*2)*Math.exp(-age*10):0,pose=bowViewPose(charge,recoil);for(const p of swordPolygons(bowViewMeshCache,pose,w,h)){ctx.fillStyle=p.color;ctx.beginPath();p.points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fill();}}

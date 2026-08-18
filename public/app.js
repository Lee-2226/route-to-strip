
function eventAutoSize(n,text){
 let L=String(text||"EVENT").trim().length;
 if(L<=18)return [60,60];
 if(L<=32)return [80,60];
 if(L<=50)return [100,70];
 if(L<=72)return [120,80];
 return [140,90]
}
function boardOverlap(a,b,gap=8){
 return !(a.x+a.w+gap<=b.x||b.x+b.w+gap<=a.x||a.y+a.h+gap<=b.y||b.y+b.h+gap<=a.y)
}
function deOverlapNodes(nodes){
 let placed=[];
 nodes.forEach(n=>{
   if(placed.some(q=>boardOverlap(n,q))){
     let ox=n.x,oy=n.y,found=null;
     outer:for(let r=10;r<=400;r+=10){
       for(let [dx,dy] of [[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,r],[r,-r],[-r,-r]]){
         let t={...n,x:Math.max(0,Math.min(1240-n.w,ox+dx)),y:Math.max(0,Math.min(770-n.h,oy+dy))};
         if(!placed.some(q=>boardOverlap(t,q))){found=t;break outer}
       }
     }
     if(found){n.x=found.x;n.y=found.y}
   }
   placed.push(n)
 });
}
const s=io(),$=q=>document.querySelector(q);let me,state,L=[],sel=null,drag=null,snap=true;
s.on("connect",()=>me=s.id);$("#create").onclick=()=>s.emit("createRoom",{name:$("#name").value||"Host"});$("#join").onclick=()=>s.emit("joinRoom",{name:$("#name").value||"Player",code:$("#codeIn").value});$("#start").onclick=()=>s.emit("startGame");$("#roll").onclick=()=>s.emit("roll");s.on("err",m=>$("#err").textContent=m);
const E=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function lines(arr){let o="",by=id=>arr.find(n=>n.id===String(id));arr.forEach(n=>{if(n.next){let b=by(n.next);if(b)o+=`<line class="${n.id.startsWith("S")?"shortcut":"edge"}" x1="${n.x+n.w/2}" y1="${n.y+n.h/2}" x2="${b.x+b.w/2}" y2="${b.y+b.h/2}"/>`}});let a=by("50"),b=by("S1");if(a&&b)o+=`<line class="shortcut" x1="${a.x+a.w/2}" y1="${a.y+a.h/2}" x2="${b.x+b.w/2}" y2="${b.y+b.h/2}"/>`;return o}
function wrapSvgText(text,x,y,w,h){
 let words=String(text||"").trim().split(/\s+/).filter(Boolean),lines=[],line="";
 let max=Math.max(8,Math.floor((w-48)/12));
 words.forEach(word=>{
   let t=line?line+" "+word:word;
   if(t.length>max&&line){lines.push(line);line=word}else line=t
 });
 if(line)lines.push(line);
 let fs=w<=80?15:22;
 let lh=fs+6;
 let maxByHeight=Math.max(1,Math.floor((h-30)/lh));
 if(lines.length>maxByHeight){
   fs=Math.max(16,Math.floor((h-30)/lines.length)-5);
   lh=fs+5;
 }
 let startY=y+h/2-((lines.length-1)*lh)/2+fs*.35;
 return lines.map((l,i)=>`<text class="tileLabel" x="${x+w/2}" y="${startY+i*lh}" text-anchor="middle">${E(l)}</text>`).join("")
}
function draw(){
 let o=lines(state.nodes);
 state.nodes.forEach(n=>{
   let label=n.type==="workout"?"WORK-OUT TIME":n.type==="effect"?"EFFECT":
             n.type==="event"?(String(n.event||"").trim()||"EVENT"):
             n.type==="finish"?((n.name||"WIN THE GAME")+" — "+(n.event||"")):n.id;
   o+=`<g class="tile ${n.type}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}"/>
      ${wrapSvgText(label,n.x,n.y+5,n.w,n.h-5)}</g>`;
   state.players.filter(p=>p.pos===n.id).forEach((p,i)=>{let pi=state.players.findIndex(q=>q.id===p.id),h=(pi*137.508+18)%360;let cols=Math.max(1,Math.floor(n.w/34)),row=Math.floor(i/cols),col=i%cols;
let cx=n.x+n.w/2+(col-(Math.min(cols,state.players.filter(q=>q.pos===n.id).length)-1)/2)*30;
let cy=n.y+n.h/2+row*30;
o+=`<circle class="token" cx="${cx}" cy="${cy}" r="14" fill="hsl(${h} 78% 55%)"/>`})
 });
 $("#board").innerHTML=o
}
function target(){if(!state.pending||state.pending.actor!==me)return $("#targetBox").classList.add("hide");$("#targetBox").classList.remove("hide");$("#targetText").textContent=state.pending.card.text;if(state.pending.card.effect==="target_choose_goto"&&state.pending.targetId){$("#targetButtons").innerHTML=`<div class="spacePicker"><b>Choose destination:</b><input id="gotoSpace" type="number" min="1" max="100" value="50"><button onclick="pickSpace()">Move</button></div>`}else{$("#targetButtons").innerHTML=state.players.filter(p=>p.id!==me).map(p=>`<button onclick="pick('${p.id}')">${E(p.name)} — ${E(p.pos)}</button>`).join("")}}window.pick=id=>s.emit("targetPlayer",{targetId:id});window.pickSpace=()=>{let v=Math.max(1,Math.min(100,+($("#gotoSpace")?.value||1)));s.emit("targetSpace",{space:v})};
s.on("state",x=>{state=x;$("#lobby").classList.add("hide");$("#game").classList.remove("hide");$("#room").textContent=x.code;$("#msg").textContent=x.eventText||"";let host=x.host===me;$("#layoutBtn").classList.toggle("hide",!host||x.started);$("#edit").classList.toggle("hide",!host||x.started);$("#start").classList.toggle("hide",!host||x.started);$("#roll").classList.toggle("hide",!(x.started&&x.players[x.turn]?.id===me&&!x.pending));$("#players").innerHTML=x.players.map((p,i)=>{let h=(i*137.508+18)%360;return `<div class="player ${i===x.turn&&x.started?"turn":""}"><b><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:hsl(${h} 78% 55%);margin-right:6px"></span>${E(p.name)}</b><br>${E(p.pos)}</div>`}).join("");draw();target()});
function pt(e){let v=$("#layoutCanvas"),p=v.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(v.getScreenCTM().inverse())}
function fields(){let n=L.find(n=>n.id===sel);["x","y","w","h"].forEach(k=>{$("#"+k).disabled=!n;if(n)$("#"+k).value=Math.round(n[k])})}
function drawL(){let o=lines(L);L.forEach(n=>o+=`<g class="ltile ${n.id===sel?"selected":""}" data-id="${n.id}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}"/><text x="${n.x+n.w/2}" y="${n.y+n.h/2+4}" text-anchor="middle">${E(n.id)}</text>${n.id===sel?`<rect class="handle" x="${n.x+n.w-7}" y="${n.y+n.h-7}" width="14" height="14"/>`:""}</g>`);$("#layoutCanvas").innerHTML=o;fields();document.querySelectorAll(".ltile").forEach(g=>{g.onpointerdown=e=>{let n=L.find(n=>n.id===g.dataset.id),p=pt(e);sel=n.id;drag=e.target.classList.contains("handle")?{id:n.id,r:true,sx:p.x,sy:p.y,sw:n.w,sh:n.h}:{id:n.id,dx:p.x-n.x,dy:p.y-n.y};g.setPointerCapture(e.pointerId);drawL()};g.onpointermove=e=>{if(!drag||drag.id!==g.dataset.id)return;let n=L.find(n=>n.id===drag.id),p=pt(e);if(drag.r){let w=drag.sw+p.x-drag.sx,h=drag.sh+p.y-drag.sy;if(snap){w=Math.round(w/5)*5;h=Math.round(h/5)*5}n.w=Math.max(28,w);n.h=Math.max(24,h)}else{let x=p.x-drag.dx,y=p.y-drag.dy;if(snap){x=Math.round(x/5)*5;y=Math.round(y/5)*5}n.x=Math.max(0,x);n.y=Math.max(0,y)}drawL()};g.onpointerup=()=>drag=null})}
$("#layoutBtn").onclick=()=>{L=state.nodes.map(n=>({...n}));sel=null;$("#layoutModal").classList.remove("hide");drawL()};$("#layoutClose").onclick=()=>$("#layoutModal").classList.add("hide");$("#snap").onclick=()=>{snap=!snap;$("#snap").textContent="Snap "+(snap?"ON":"OFF")};
["x","y","w","h"].forEach(k=>$("#"+k).onchange=()=>{let n=L.find(n=>n.id===sel);if(n){n[k]=+$("#"+k).value;drawL()}});
$("#makeSmall").onclick=()=>{let n=L.find(n=>n.id===sel);if(n){n.w=40;n.h=40;drawL()}};
$("#makeLarge").onclick=()=>{let n=L.find(n=>n.id===sel);if(n){n.w=60;n.h=60;drawL()}};
$("#saveLayout").onclick=()=>{s.emit("saveLayout",{layout:L.map(n=>({id:n.id,x:n.x,y:n.y,w:n.w,h:n.h}))});$("#layoutStatus").textContent="Saved."};
function exportData(){return{format:"rainbow-route-board-v2",layout:L.map(n=>({id:n.id,x:n.x,y:n.y,w:n.w,h:n.h})),nodes:state.nodes.map(n=>({id:n.id,name:n.name,type:n.type,event:n.event,next:n.next})),chance:state.chance,destiny:state.destiny}}
$("#downloadJSON").onclick=()=>{try{let blob=new Blob([JSON.stringify(exportData(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="rainbow-route-board.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$("#layoutStatus").textContent="Downloaded rainbow-route-board.json";}catch(e){$("#layoutStatus").textContent="Download blocked — use Copy Board JSON.";}}
$("#copyJSON").onclick=async()=>{let txt=JSON.stringify(exportData(),null,2);try{await navigator.clipboard.writeText(txt);$("#layoutStatus").textContent="Board JSON copied."}catch(e){$("#jsonFallback").value=txt;$("#jsonFallback").classList.remove("hide");$("#jsonFallback").select();$("#layoutStatus").textContent="Clipboard blocked. JSON is selected below — copy it manually."}}
$("#importJSON").onchange=async e=>{try{let d=JSON.parse(await e.target.files[0].text());let m=new Map(d.layout.map(v=>[String(v.id),v]));L.forEach(n=>{let v=m.get(n.id);if(v)Object.assign(n,{x:+v.x,y:+v.y,w:+v.w,h:+v.h})});drawL();$("#layoutStatus").textContent="Imported. Click Save Layout."}catch(e){$("#layoutStatus").textContent="Invalid JSON."}};
function deck(d){return d.map(c=>`${c.text} | ${c.move||0} | ${c.effect||"none"} | ${c.value||0}`).join("\n")}function parse(id){return $(id).value.split("\n").filter(Boolean).map(l=>{let [text,move,effect,value]=l.split("|").map(x=>x.trim());return{text,move:+move||0,effect:effect||"none",value:+value||0}})}
const WORKOUT_SHORTCUTS=new Set(["S4","S10","S15"]);
$("#edit").onclick=()=>{
 const large=state.nodes.filter(n=>["event","workout","effect"].includes(n.type));
 $("#eventRows").innerHTML=large.map(n=>{
  const isS=n.id.startsWith("S");
  const tc=isS?`<span class="eventType">${WORKOUT_SHORTCUTS.has(n.id)?"WORK-OUT TIME":"EVENT"}</span>`:`<select class="tp"><option value="event" ${n.type==="event"?"selected":""}>event</option><option value="workout" ${n.type==="workout"?"selected":""}>work-out time</option><option value="effect" ${n.type==="effect"?"selected":""}>effect</option></select>`;
  const nm=n.type==="workout"?"WORK-OUT TIME":n.type==="effect"?"EFFECT":(n.name||"EVENT");
  return `<div class="eventrow" data-id="${E(n.id)}"><b>${E(n.id)}</b><input class="nm" value="${E(nm)}">${tc}<input class="ev" value="${E(n.event||"")}" placeholder="Event / task text"></div>`
 }).join("");
 $("#chance").value=deck(state.workout||[]);$("#destiny").value=deck(state.effects||[]);
 $("#contentStatus").textContent="Loaded current board content.";
 $("#contentModal").classList.remove("hide")
};
$("#contentClose").onclick=()=>$("#contentModal").classList.add("hide");$("#saveContent").onclick=()=>{
 let events=[...document.querySelectorAll(".eventrow")].map(r=>({id:r.dataset.id,name:r.querySelector(".nm").value,type:WORKOUT_SHORTCUTS.has(r.dataset.id)?"workout":(r.dataset.id.startsWith("S")?"event":(r.querySelector(".tp")?.value||"event")),event:r.querySelector(".ev").value}));
 events.forEach(e=>{let n=state.nodes.find(n=>String(n.id)===String(e.id));if(!n)return;n.type=e.type;n.event=e.event;n.name=e.type==="chance"?"CHANCE":e.type==="destiny"?"DESTINY":e.name;if(e.type==="event"){let z=eventAutoSize(n,e.event);n.w=Math.max(n.w,z[0]);n.h=Math.max(n.h,z[1])}});
 deOverlapNodes(state.nodes);
 s.emit("saveLayout",{layout:state.nodes.map(n=>({id:n.id,x:n.x,y:n.y,w:n.w,h:n.h}))});
 s.emit("saveContent",{events,workout:parse("#chance"),effects:parse("#destiny")});
 $("#contentModal").classList.add("hide")
};
function collectContent(){
 let events=[...document.querySelectorAll(".eventrow")].map(r=>({
   id:r.dataset.id,
   name:r.querySelector(".nm").value,
   type:WORKOUT_SHORTCUTS.has(r.dataset.id)?"workout":(r.dataset.id.startsWith("S")?"event":(r.querySelector(".tp")?.value||"event")),
   event:r.querySelector(".ev").value
 }));
 return {
   format:"rainbow-route-content-v1",
   exportedAt:new Date().toISOString(),
   events,
   workout:parse("#chance"),
   effects:parse("#destiny")
 };
}
$("#exportContent").onclick=()=>{
 try{
   let blob=new Blob([JSON.stringify(collectContent(),null,2)],{type:"application/json"}),
       url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download="rainbow-route-events-cards.json";document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   $("#contentStatus").textContent="Event / Work-Out / Effect data exported.";
 }catch(e){$("#contentStatus").textContent="Download blocked — use Copy Event + Cards."}
};
$("#copyContent").onclick=async()=>{
 let txt=JSON.stringify(collectContent(),null,2);
 try{await navigator.clipboard.writeText(txt);$("#contentStatus").textContent="Event + Cards JSON copied."}
 catch(e){$("#contentFallback").value=txt;$("#contentFallback").classList.remove("hide");$("#contentFallback").select();$("#contentStatus").textContent="Clipboard blocked. Copy the selected JSON below."}
};
$("#importContent").onchange=async e=>{
 try{
   let d=JSON.parse(await e.target.files[0].text());
   if(!Array.isArray(d.events)||!Array.isArray(d.workout)||!Array.isArray(d.effects))throw Error();
   let em=new Map(d.events.map(v=>[String(v.id),v]));
   document.querySelectorAll(".eventrow").forEach(r=>{
     let v=em.get(String(r.dataset.id));if(!v)return;
     r.querySelector(".nm").value=v.name||"";
     let tp=r.querySelector(".tp");if(tp)tp.value=v.type||"event";
     r.querySelector(".ev").value=v.event||"";
   });
   $("#chance").value=deck(d.workout);$("#destiny").value=deck(d.effects);
   $("#contentStatus").textContent="Imported. Click Save Content to apply.";
 }catch(e){$("#contentStatus").textContent="Invalid Event + Cards JSON."}
};

/* ===== v36 Room Chat ===== */
function addChatMessage(name,text,ts){
  let d=document.createElement("div");
  d.className="chatMsg";
  let time=new Date(ts||Date.now()).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  d.innerHTML=`<div class="chatMeta"><b>${E(name)}</b><small>${E(time)}</small></div><div class="chatText">${E(text)}</div>`;
  $("#chatLog").appendChild(d);
  $("#chatLog").scrollTop=$("#chatLog").scrollHeight;
}
function sendChat(){
  let input=$("#chatInput"),text=input.value.trim();
  if(!text)return;
  s.emit("chatMessage",{text});
  input.value="";
}
$("#chatSend").onclick=sendChat;
$("#chatInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){
    e.preventDefault();
    sendChat();
  }
});
s.on("chatMessage",m=>addChatMessage(m.name,m.text,m.ts));

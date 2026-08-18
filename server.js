const express=require("express"),http=require("http"),path=require("path"),fs=require("fs");const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server);app.use(express.static(path.join(__dirname,"public")));
const BASE=JSON.parse(fs.readFileSync(path.join(__dirname,"public","board.json")));const rooms=new Map(),clone=x=>JSON.parse(JSON.stringify(x));
function code(){let a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",s="";for(let i=0;i<5;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
function tile(r,id){return r.nodes.find(n=>n.id===String(id))}function emit(r,m=""){io.to(r.code).emit("state",{...r,eventText:m})}
function step(r,p){let n=tile(r,p.pos);if(n&&n.next)p.pos=n.next}function move(r,p,k){while(k-->0)step(r,p)}
function exact50(p,m){if(p.pos==="50"){p.pos="S1";return m+" Exact landing on 50 — enter Shortcut S1."}return m}
function cleanDeck(d){return Array.isArray(d)?d.map(c=>({text:String(c.text||"").slice(0,240),move:+c.move||0,effect:c.effect||"none",value:+c.value||0})).filter(c=>c.text):[]}
io.on("connection",s=>{
s.on("createRoom",({name})=>{let c=code(),b=clone(BASE),r={code:c,host:s.id,started:false,turn:0,nodes:b.nodes,workout:b.workout,effects:b.effects,pending:null,players:[{id:s.id,name:name||"Host",pos:"1",nextEffect:null}]};rooms.set(c,r);s.join(c);s.data.room=c;emit(r,"Room created.")});
s.on("joinRoom",({name,code})=>{let r=rooms.get(String(code||"").toUpperCase());if(!r||r.started)return s.emit("err","Room unavailable.");r.players.push({id:s.id,name:name||"Player",pos:"1",nextEffect:null});s.join(r.code);s.data.room=r.code;emit(r,(name||"Player")+" joined.")});
s.on("saveLayout",({layout})=>{let r=rooms.get(s.data.room);if(!r||r.host!==s.id||r.started)return;layout.forEach(v=>{let n=tile(r,v.id);if(n){n.x=+v.x;n.y=+v.y;n.w=+v.w;n.h=+v.h;
if(n.w===60&&n.h===60){if(String(n.id).startsWith("S"))n.type="event";else if(!["event","workout","effect"].includes(n.type))n.type="event"}else n.type=String(n.id).startsWith("S")?"shortcut":"normal"}});emit(r,"Layout saved.")});
s.on("saveContent",x=>{let r=rooms.get(s.data.room);if(!r||r.host!==s.id||r.started)return;if(Array.isArray(x.events))x.events.forEach(e=>{let n=tile(r,e.id);if(n){n.name=e.name;
n.type=String(n.id).startsWith("S")?"event":(["event","workout","effect"].includes(e.type)?e.type:"event");
n.event=e.event}});let c=cleanDeck(x.workout),d=cleanDeck(x.effects);if(c.length)r.workout=c;if(d.length)r.effects=d;emit(r,"Content saved.")});
s.on("startGame",()=>{let r=rooms.get(s.data.room);if(r&&r.host===s.id&&r.players.length>=2){r.started=true;emit(r,"Game started.")}});

function finishPendingTurn(r,msg){
  r.pending=null;
  r.turn=(r.turn+1)%r.players.length;
  emit(r,msg);
}
function resolveLanding(r,p,msg,actorId){
  let n=tile(r,p.pos);
  if(n&&n.type==="event"&&n.event){
    msg+=" EVENT: "+n.event;
  }
  let deck=n&&n.type==="workout"?r.workout:n&&n.type==="effect"?r.effects:null;
  if(deck&&deck.length){
    let c=deck[Math.floor(Math.random()*deck.length)];
    if(c.effect&&c.effect!=="none"){
      r.pending={actor:actorId,card:c,returnAfter:true,landingPlayer:p.id};
      emit(r,msg+" "+c.text+" Choose a target.");
      return true;
    }
    if(c.move){
      move(r,p,c.move);
      msg=exact50(p,msg);
      return resolveLanding(r,p,msg,actorId);
    }
    msg+=" "+c.text;
  }
  finishPendingTurn(r,msg);
  return true;
}

s.on("targetPlayer",({targetId})=>{
  let r=rooms.get(s.data.room);if(!r||!r.pending||r.pending.actor!==s.id)return;
  let a=r.players.find(p=>p.id===s.id),t=r.players.find(p=>p.id===targetId),c=r.pending.card;
  if(!a||!t||a===t)return;

  if(c.effect==="target_choose_goto"){
    r.pending.targetId=t.id;
    return emit(r,`${a.name} chose ${t.name}. Now choose a destination Space.`);
  }

  let msg=`${a.name} targeted ${t.name}.`;

  if(c.effect==="swap"){
    let q=a.pos;a.pos=t.pos;t.pos=q;
    // Both moved. Resolve target first, then actor if target didn't create another pending effect.
    r.pending=null;
    let n=tile(r,t.pos);
    if(n&&n.type==="event"&&n.event)msg+=` ${t.name}: ${n.event}`;
    let deck=n&&n.type==="workout"?r.workout:n&&n.type==="effect"?r.effects:null;
    if(deck&&deck.length){
      let cc=deck[Math.floor(Math.random()*deck.length)];
      if(cc.effect&&cc.effect!=="none"){
        r.pending={actor:a.id,card:cc,returnAfter:true,landingPlayer:t.id};
        return emit(r,msg+" "+cc.text+" Choose a target.");
      }
      if(cc.move){move(r,t,cc.move);msg=exact50(t,msg);}
      else msg+=" "+cc.text;
    }
    n=tile(r,a.pos);
    if(n&&n.type==="event"&&n.event)msg+=` ${a.name}: ${n.event}`;
    deck=n&&n.type==="workout"?r.workout:n&&n.type==="effect"?r.effects:null;
    if(deck&&deck.length){
      let cc=deck[Math.floor(Math.random()*deck.length)];
      if(cc.effect&&cc.effect!=="none"){
        r.pending={actor:a.id,card:cc,returnAfter:true,landingPlayer:a.id};
        return emit(r,msg+" "+cc.text+" Choose a target.");
      }
      if(cc.move){move(r,a,cc.move);msg=exact50(a,msg);}
      else msg+=" "+cc.text;
    }
    return finishPendingTurn(r,msg);
  }

  if(c.effect==="target_goto"){
    let dest=Math.max(1,Math.min(100,+c.value||1));
    t.pos=String(dest);
    msg=exact50(t,`${a.name} moved ${t.name} to Space ${dest}.`);
    r.pending=null;
    return resolveLanding(r,t,msg,a.id);
  }

  if(c.effect==="target_move"){
    let v=+c.value||0;
    if(v>=0) move(r,t,v);
    else{
      // main-route backward move by numeric space; shortcut players snap to 85 first
      let cur=parseInt(String(t.pos).replace(/^S/,""))||1;
      if(String(t.pos).startsWith("S")) cur=85;
      t.pos=String(Math.max(1,cur+v));
    }
    msg=exact50(t,`${a.name} moved ${t.name} ${v>=0?"forward":"backward"} ${Math.abs(v)} space${Math.abs(v)===1?"":"s"}.`);
    r.pending=null;
    return resolveLanding(r,t,msg,a.id);
  }

  if(c.effect==="skip"||c.effect==="next_exact"||c.effect==="next_plus"||c.effect==="next_minus"||c.effect==="double"){
    t.nextEffect={type:c.effect,value:+c.value||0,source:c.text};
    return finishPendingTurn(r,msg);
  }

  // task-only targeted card
  return finishPendingTurn(r,msg+" "+c.text);
});

s.on("targetSpace",({space})=>{
  let r=rooms.get(s.data.room);
  if(!r||!r.pending||r.pending.actor!==s.id||r.pending.card.effect!=="target_choose_goto"||!r.pending.targetId)return;
  let a=r.players.find(p=>p.id===s.id),t=r.players.find(p=>p.id===r.pending.targetId);
  if(!a||!t)return;
  let dest=Math.max(1,Math.min(100,Math.floor(+space||1)));
  t.pos=String(dest);
  let msg=exact50(t,`${a.name} moved ${t.name} to Space ${dest}.`);
  r.pending=null;
  resolveLanding(r,t,msg,a.id);
});
s.on("roll",()=>{let r=rooms.get(s.data.room);if(!r||!r.started||r.pending)return;let p=r.players[r.turn];if(!p||p.id!==s.id)return;let d=1+Math.floor(Math.random()*6),spaces=d;if(p.nextEffect){let e=p.nextEffect;p.nextEffect=null;if(e.type==="skip"){r.turn=(r.turn+1)%r.players.length;return emit(r,`${p.name} skips this turn.`)}if(e.type==="next_exact")spaces=e.value;if(e.type==="next_plus")spaces=d+e.value;if(e.type==="next_minus")spaces=Math.max(1,d-e.value);if(e.type==="double")spaces=d*2}move(r,p,spaces);let msg=exact50(p,`${p.name} rolled ${d}, moved ${spaces}, landed on ${p.pos}.`),n=tile(r,p.pos);if(n&&n.type==="event"&&n.event)msg+=" EVENT: "+n.event;let deck=n&&n.type==="workout"?r.workout:n&&n.type==="effect"?r.effects:null;if(deck&&deck.length){let c=deck[Math.floor(Math.random()*deck.length)];if(c.effect&&c.effect!=="none"){r.pending={actor:p.id,card:c};return emit(r,msg+" "+c.text+" Choose a target.")}if(c.move>0){move(r,p,c.move);msg=exact50(p,msg)}msg+=" "+c.text}r.turn=(r.turn+1)%r.players.length;emit(r,msg)});

s.on("chatMessage",({text})=>{
  let r=rooms.get(s.data.room);if(!r)return;
  let p=r.players.find(p=>p.id===s.id);if(!p)return;
  text=String(text||"").trim().slice(0,500);if(!text)return;
  io.to(r.code).emit("chatMessage",{id:s.id,name:p.name,text,ts:Date.now()});
});

});
server.listen(process.env.PORT||3000,()=>console.log("Open http://localhost:"+(process.env.PORT||3000)));
// the folder on the desk thickens as tasks get done: the done count at which each state (1..4) begins
const FOLDER_STATES = [0, 1, 3, 6];
function setFolderState(){
  const n = (S.tasks||[]).length;
  let k = 1; FOLDER_STATES.forEach((min, i)=>{ if(n >= min) k = i + 1; });
  document.querySelectorAll(".fold").forEach(el=>el.classList.toggle("cur", el.id === "hi-folder-"+k));
  const hit = document.querySelector('.hit[data-hit="folder"]'); if(hit) hit.dataset.hi = "hi-folder-"+k;
}

/* ---------------- content ---------------- */
const CLASSES = {
  lurker:  { name:"the professional lurker", desc:"reads everything. posts when absolutely necessary." },
  meme:    { name:"the meme department",     desc:"communicates primarily through images." },
  vibe:    { name:"the vibe inspector",      desc:"notices immediately when something feels off." },
  lore:    { name:"the lorekeeper",          desc:"remembers announcements the team has forgotten." },
  goblin:  { name:"the reply goblin",        desc:"somehow already in the replies." },
  question:{ name:"the question mark",       desc:"difficult to classify. apparently staying anyway." }
};
const ORDER = ["lurker","meme","vibe","goblin","lore","question"];

const IV = {
  opener:{ q:"you join a new community. what happens first?", options:[
    { k:"A", t:"i stay quiet and figure out what's going on.", r:"observer" },
    { k:"B", t:"i find something to make a meme about.",       r:"creator" },
    { k:"C", t:"i start asking questions immediately.",        r:"investigator" }]},
  routes:{
    observer:{ bonus:"lurker", intro:"a silent observer. we have several on staff. allegedly.",
      q2:{ q:"what finally gets you to break your silence?", options:[
        { k:"A", t:"someone says something confidently wrong.",        react:"so you're quiet until the facts are endangered. understood.", s:{vibe:2} },
        { k:"B", t:"a joke is too good not to join in.",               react:"noted. the humor is load-bearing.",                          s:{goblin:2} },
        { k:"C", t:"someone asks a question i can actually help with.",react:"helpful and quiet. we'll check whether that's allowed.",     s:{lore:2} }]},
      q3:{ q:"the community is confused about something. what do you do?", options:[
        { k:"A", t:"dig up the old announcement that explains it.", react:"you read the announcements. we've been meaning to.", s:{lore:2} },
        { k:"B", t:"wait. someone louder will handle it.",          react:"delegation. technically.",                           s:{lurker:2} },
        { k:"C", t:"post one correction and vanish for a week.",    react:"one message, one week. efficient.",                  s:{vibe:1,lurker:1} }]}},
    creator:{ bonus:"meme", intro:"straight to the meme department. they've been asking for supervision.",
      q2:{ q:"your first meme gets absolutely no reaction. what now?", options:[
        { k:"A", t:"make a better one.",                             react:"persistence. the department admires it from a distance.", s:{meme:2} },
        { k:"B", t:"explain it until everyone regrets ignoring it.", react:"we've tried this. it works, eventually, for nobody.",     s:{goblin:2} },
        { k:"C", t:"declare it ahead of its time.",                  react:"we've been ahead of our time for years. no evidence yet.", s:{question:2} }]},
      q3:{ q:"you've been given control of our announcement poster. your approach?", options:[
        { k:"A", t:"one image, no words. they'll get it.",                   react:"confident. the poster will be judged.",        s:{meme:2} },
        { k:"B", t:"a wall of text with one joke buried in paragraph four.", react:"paragraph four. we'll look.",                  s:{lore:2} },
        { k:"C", t:"a poll about what the poster should be.",                react:"delegating to the crowd. bold, for a poster.", s:{vibe:1,question:1} }]}},
    investigator:{ bonus:"vibe", intro:"questions already. i was hoping you'd just admire the stationery.",
      q2:{ q:"which question are you asking first?", options:[
        { k:"A", t:"who's actually building this?",                     react:"a fair question. the answer is being decided.",   s:{vibe:2} },
        { k:"B", t:"what makes this community different?",              react:"we have a department. most communities don't.",   s:{lore:2} },
        { k:"C", t:"why does that character look personally offended?", react:"that's our supervisor. please lower your voice.", s:{question:2} }]},
      q3:{ q:"one thing is still unclear. what happens next?", options:[
        { k:"A", t:"i ask in public so everyone gets the answer.", react:"public questions. brave. we'll answer publicly, eventually.", s:{goblin:2} },
        { k:"B", t:"i check the docs first, then ask.",            react:"documentation. we have some. somewhere.",                     s:{lore:2} },
        { k:"C", t:"i stay unclear about it and continue anyway.", react:"unclear and continuing. that's the department motto.",        s:{question:2} }]}}
  }
};

const PROMPTS = [
  { id:"why",       t:"why should we let you in? wrong answers encouraged." },
  { id:"community", t:"what would make this a community you'd actually stick around for?" },
  { id:"personal",  t:"describe your online personality in one sentence." }
];


/* ---------------- department state ----------------
   Prototype default only. Real application windows still require server authority. */
const DEPT = "open";

/* ---------------- state ---------------- */
const KEY = "dof.v2";
const BLANK = { alias:"", handle:"", x:false, a1:null, a2:null, a3:null,
                promptId:null, statement:"", wallet:"", caseNo:null, decision:null,
                step:"signin", d:"greet", b:0, err:null, derr:null, tasks:[], eng:null, boardSeen:0, rung:false, seenRoom:false, since:null, trayOpened:false, filedAt:null, mobNote:false, idleNudged:false, vent:null, pfp:null };
// Prototype dof.v2 identity/answers/rewards are never read or imported.
let S = {...BLANK, tasks:[]};
// when the board was last opened, kept in this browser: the board glows for anything posted since
try{ S.boardSeen = Number(localStorage.getItem("dof.boardSeen")) || 0; }catch(e){}
const save = ()=>{}; // Scene-only scratch state; server records are authoritative.
let identity = null, identityReady = false, identityError = '', identityBusy = false;
let identityEpoch = 0, sessionTimer = 0;
const identityChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('fomies-identity') : null;
let testPreview = null, realWalkthrough = null, ownerTestAllowed = false, ownerTestBusy = false;
const savedDraft = () => !testPreview && !!(identity?.user?.alias && ['draft','submitted'].includes(identity?.draft?.status));

const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const optOf = (list,k) => list.find(o=>o.k===k);
const routeOf = () => { const o = S.a1 && optOf(IV.opener.options,S.a1); return o ? IV.routes[o.r] : null; };
// where this person is: visitor -> rung -> connected -> applying -> filed -> decided
function appState(){
  return savedDraft() ? "draft" : !testPreview && identity?.user ? "connected" : S.rung ? "rung" : "visitor";
/* historical prototype states, unreachable from the identity UI */
  if(S.decision) return "decided";
  if(S.caseNo) return "filed";
  if(S.x && (S.a1 || S.alias)) return "applying";
  if(S.x) return "connected";
  if(S.rung) return "rung";
  return "visitor";
}

function classify(record){
  if(record){
    // Presentation only: match the pinned text to the designer's existing weights.
    // Edited/new content has no assigned weights; use the existing neutral class.
    const sc=Object.fromEntries(ORDER.map(k=>[k,0]));
    for(const q of record.allocation.questions){
      const text=q.options.find(o=>o.id===record.answers[q.id])?.text;
      const source=[IV.opener,...Object.values(IV.routes).flatMap(r=>[r.q2,r.q3])].find(v=>v.q===q.text);
      const option=source?.options.find(o=>o.t===text);
      if(!option)return 'question';
      const weights=option.s||{[IV.routes[option.r].bonus]:1};
      Object.entries(weights).forEach(([k,v])=>sc[k]+=v);
    }
    return ORDER.reduce((b,k)=>sc[k]>sc[b]?k:b,ORDER[0]);
  }
  const R = routeOf(); if(!R||!S.a2||!S.a3) return null;
  const sc = { lurker:0, meme:0, vibe:0, lore:0, goblin:0, question:0 };
  sc[R.bonus]++;
  Object.entries(optOf(R.q2.options,S.a2).s).forEach(([k,v])=>sc[k]+=v);
  Object.entries(optOf(R.q3.options,S.a3).s).forEach(([k,v])=>sc[k]+=v);
  return ORDER.reduce((b,k)=>sc[k]>sc[b]?k:b, ORDER[0]);
}

/* ---------------- layout from config ---------------- */
// Published copy only. No scene/layout changes and no mid-line refresh.
let sceneCopies = {vent:new Map(),idle:new Map()}, sceneTrees={vent:null,idle:null}, clerkTree=null,ventTree=null,clerkTreeTimer=null;
let officeContent=null;
function sceneCopy(section,original,values={}){
  const text=sceneCopies[section].get(original) ?? original;
  return text.replace(/\{(alias|handle|case)\}/g,(whole,key)=>Object.hasOwn(values,key)?String(values[key]):whole);
}
function officeLine(key,fallback,values={}){
  const line=officeContent?.lines?.[key]??sceneCopy('idle',fallback);
  return line.replace(/\{(alias|handle|case|solana|evm|classification|description)\}/g,(whole,name)=>Object.hasOwn(values,name)?String(values[name]):whole);
}
function contentAudience(){
  if(!identity?.user)return 'signed_out';
  if(interviewUI?.application?.data?.submission?.decision||S.decision)return 'decided';
  if(identity?.draft?.status==='submitted')return 'filed';
  if(interviewUI?.open)return 'interviewing';
  if(hasReview())return 'review';
  if(!identity?.user?.alias)return 'alias_needed';
  return 'unfiled';
}
const eligibleConversation=c=>!c.audiences||c.audiences.includes(contentAudience());
API.sceneContent().then(value=>{
  if(value.office?.version===1&&value.office?.section==='office')officeContent=value.office;
  for(const section of ['vent','idle']){const data=value[section],copies=Array.isArray(data)?data:data?.copies;if(Array.isArray(copies))sceneCopies[section]=new Map(copies.map(x=>[x.original,x.text]));if(data?.version===2&&Array.isArray(data.conversations))sceneTrees[section]=data;}
}).catch(()=>{}); // Original approved copy is the offline/unpublished fallback.

function place(el, box){ if(!el||!box) return;
  el.style.left = box.x+"%"; el.style.top = box.y+"%";
  el.style.width = box.w+"%"; el.style.height = box.h+"%";
}
// how the room art lands on screen: object-fit:cover, centred. scale is the same on both axes,
// so anything placed in art pixels through this frame sits on the background's own pixels.
// on a wide screen the room keeps its shape, sits at the top, and never overflows: it fills the
// width on a viewport squarer than the art (leaving one band below) and the height on an ultrawide
// one (leaving the sides). below WIDE_RATIO (tall windows, phones) it covers the viewport as before.
const WIDE_RATIO = 1.6;
function artFrame(){
  const c = CFG.art.canvas, vw = innerWidth, vh = innerHeight, wide = vw / vh >= WIDE_RATIO;
  const scale = wide ? Math.min(vw / c.w, vh / c.h) : Math.max(vw / c.w, vh / c.h);
  return { scale, ox:(vw - c.w*scale)/2, oy: wide ? 0 : (vh - c.h*scale)/2 };
}
function placeArt(el, box, f){ if(!el||!box) return;
  el.style.left = (f.ox + box.x*f.scale)+"px"; el.style.top = (f.oy + box.y*f.scale)+"px";
  el.style.width = (box.w*f.scale)+"px";       el.style.height = (box.h*f.scale)+"px";
}
// a portrait window (the same test as the mobile css) takes the CFG.artPortrait box when there is one
const isPortrait = () => innerWidth <= innerHeight;
/* how the visitor is driving: a pointer, or the keyboard (tab and the arrows, moving between controls).
   the css draws focus rings only in the keyboard mode, so focus that a click or a script moves — an
   overlay handing focus in and back out — never rings the thing it lands on. typing in a field is not
   navigation and does not switch the mode. */
document.documentElement.dataset.input = "mouse";
addEventListener("pointerdown", ()=>{ document.documentElement.dataset.input = "mouse"; }, true);
addEventListener("keydown", e=>{ if(["Tab","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) document.documentElement.dataset.input = "key"; }, true);
function artBox(k, f){
  const b = (isPortrait() && CFG.artPortrait[k]) || CFG.art[k];
  if(!b || !b.edge || !f) return b;
  // an edge-anchored portrait box: inset px in from that side of the window, whatever the plate crop.
  // on a wide portrait window (a tablet) the edges are far out on the desk, over the plaque painted into
  // the plate: xMin / xMax (art px) hold the piece nearer the folder instead
  const edgeX = b.edge === "right" ? (innerWidth - b.inset - b.w*f.scale - f.ox)/f.scale : (b.inset - f.ox)/f.scale;
  const x = b.edge === "right" ? Math.min(edgeX, b.xMax ?? Infinity) : Math.max(edgeX, b.xMin ?? -Infinity);
  return { ...b, x };
}
function placeArtLayers(){
  const f = artFrame(), whole = { x:0, y:0, w:CFG.art.canvas.w, h:CFG.art.canvas.h };
  document.querySelectorAll(".layer.full").forEach(img=>placeArt(img, whole, f));
  document.querySelectorAll(".layer.crop.art[data-box]").forEach(img=>placeArt(img, artBox(img.dataset.box, f), f));
  // every hit whose name is in CFG.art is placed in art space too, crop or not (the folder, for now)
  document.querySelectorAll(".hit[data-hit]").forEach(h=>{ if(h.dataset.hit!=="canvas") placeArt(h, artBox(h.dataset.hit, f), f); });
  placeGate();
  const menuBottom = document.querySelector('[data-hit="menu"]').getBoundingClientRect().bottom;
  document.documentElement.style.setProperty('--room-menu-bottom',menuBottom+'px');
  const deskBottom = Math.max(...['folder','bell','tasks','socials'].map(k=>{const b=artBox(k,f);return f.oy+(b.y+b.h)*f.scale;}));
  document.documentElement.style.setProperty('--room-actions-bottom',deskBottom+'px');
  cullCrumples(f);
}
/* the crumpled paper keeps the desk's layout on every screen. on a portrait window the bell and the menu
   sign sit at the window's edges, over the desk's ends, so any ball that would sit under either is left
   out there rather than moved; on a wider window it is back. */
function cullCrumples(f){
  const portrait = isPortrait(), covers = portrait ? ["bell","menu"].map(k=>artBox(k, f)).filter(Boolean) : [];
  const meets = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  document.querySelectorAll("#s-room .crumple[data-box]").forEach(el=>{
    const b = CFG.art[el.dataset.box];
    el.style.visibility = b && covers.some(c=>meets(b, c)) ? "hidden" : "";
  });
}
// the clerk's bubble hangs from a point in art space (CFG.bubble): its tail's tip goes just above his head
function placeBubble(){
  const f = artFrame(), b = CFG.bubble, bub = document.getElementById("bubble");
  bub.style.right = "auto"; bub.style.top = "auto";
  bub.style.left = (f.ox + b.cx * f.scale)+"px";
  bub.style.bottom = (innerHeight - (f.oy + b.tip * f.scale) + 20)+"px";   // the tail is a fixed 20px (.bub::before), so the box sits that much higher
  bub.style.maxWidth = (b.maxw * f.scale)+"px";
}
addEventListener("resize", ()=>{ placeArtLayers(); placeBubble(); });
// the gate on a phone: portrait crops the corridor to the middle door, and a finger drags it along.
// the stage (#gate-stage: layers and hits together) follows the finger 1:1, so the wall between the
// doors can be looked at, and past the corridor's ends it gives a little, on a rubber band. on
// release it settles on a door or the vent: the next one along if the drag was a real swipe (far enough, or a
// quick flick), otherwise back to the one it was on. landscape shows the whole corridor and sits still.
// the section itself is never moved: it stays over the whole screen and takes the pointer events, so
// a swipe registers wherever the finger lands. (when the section was what slid, its own box slid off
// screen at the side stops, and only a door hit, hanging outside it, could still catch a touch)
// the snap points of the phone swipe, left to right: each swipe carries the corridor to the next one
const GATE_STOPS = ["bathroom", "frame", "door", "vent", "elevator"];
const GATE_HOME = GATE_STOPS.indexOf("door");   // where the corridor opens, and where it goes back to
const gateEl = document.getElementById("s-gate"), gateStage = document.getElementById("gate-stage");
let gateStop = GATE_HOME;
// where the stage sits (translateX, px) with a stop's door centred, kept within the corridor's ends
function gateShift(stop){
  const f = artFrame(), b = CFG.art[GATE_STOPS[stop]], c = CFG.art.canvas;
  const want = innerWidth / 2 - (f.ox + (b.x + b.w / 2) * f.scale);
  return Math.max(innerWidth - (f.ox + c.w * f.scale), Math.min(-f.ox, want));
}
function placeGate(){
  if(!isPortrait()){ gateStop = GATE_HOME; gateStage.style.transform = ""; return; }
  gateStage.style.transform = `translateX(${gateShift(gateStop).toFixed(1)}px)`;
}
// the drag. from pointerdown the stage moves with the finger (no transition, so it sticks to it);
// pointerup or pointercancel (the browser took the gesture for a vertical pan; the last seen position
// still counts) picks the stop and lets the css transition carry it there. a drag is not a tap: the
// click that may follow it must not open the door it ends on.
const GATE_SWIPE_PX = 60;       // a drag this far (or a flick, see GATE_FLICK) goes to the next door; shorter springs back
const GATE_FLICK = 0.45;        // px per ms over the last stretch of the drag that counts as a flick
const GATE_GIVE = 0.3;          // past the corridor's ends the stage moves this fraction of the finger
const GATE_LOCK_PX = 8;         // the first move this long decides: sideways is a drag, up and down is left to the browser
let gsw = null, gateSwiped = false;   // gsw: { x, y, lx, ly, base, lock, vx, t } while a finger is down
function gateDragTo(x){
  const f = artFrame(), c = CFG.art.canvas;
  const lo = innerWidth - (f.ox + c.w * f.scale), hi = -f.ox;   // the corridor's right end at the screen's right, its left end at the left
  let s = gsw.base + (x - gsw.x);
  if(s > hi) s = hi + (s - hi) * GATE_GIVE; else if(s < lo) s = lo + (s - lo) * GATE_GIVE;
  gateStage.style.transform = `translateX(${s.toFixed(1)}px)`;
}
gateEl.addEventListener("pointerdown", e=>{
  if(e.pointerType === "mouse" || !isPortrait() || scene !== "gate") return;
  // pick the drag up from wherever the stage is, mid-settle included
  const m = new DOMMatrixReadOnly(getComputedStyle(gateStage).transform);
  gsw = { x:e.clientX, y:e.clientY, lx:e.clientX, ly:e.clientY, base:m.m41, lock:null, vx:0, t:e.timeStamp };
});
gateEl.addEventListener("pointermove", e=>{
  if(!gsw) return;
  const dx = e.clientX - gsw.x, dy = e.clientY - gsw.y;
  if(!gsw.lock){
    if(Math.abs(dx) < GATE_LOCK_PX && Math.abs(dy) < GATE_LOCK_PX) return;
    gsw.lock = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    if(gsw.lock === "x") gateStage.style.transition = "none";
  }
  if(gsw.lock !== "x") return;
  const dt = e.timeStamp - gsw.t;
  if(dt > 0) gsw.vx = (e.clientX - gsw.lx) / dt;   // the latest speed, for the flick test
  gsw.lx = e.clientX; gsw.ly = e.clientY; gsw.t = e.timeStamp;
  gateDragTo(e.clientX);
});
function endGateSwipe(e){
  if(!gsw) return;
  const g = gsw; gsw = null;
  const ex = e.type === "pointercancel" ? g.lx : e.clientX;
  const dx = ex - g.x;
  if(g.lock !== "x"){ return; }   // never moved sideways: a tap, or a vertical pan the browser had
  gateStage.style.transition = "";   // the transition is back for the settle
  gateSwiped = true; setTimeout(()=>{ gateSwiped = false; }, 400);   // a drag with no click after it must not eat the next tap
  if(Math.abs(dx) >= GATE_SWIPE_PX || Math.abs(g.vx) >= GATE_FLICK){
    const dir = Math.abs(dx) >= GATE_SWIPE_PX ? dx : g.vx;   // a flick back the way it came counts as the flick
    gateStop = Math.max(0, Math.min(GATE_STOPS.length - 1, gateStop + (dir < 0 ? 1 : -1)));
  }
  placeGate();   // to the new stop, or back to the old one (the ends included: past them it springs back)
}
gateEl.addEventListener("pointerup", endGateSwipe);
gateEl.addEventListener("pointercancel", endGateSwipe);
// the approved stamp is still drawn on a full folder canvas (1920x900), with the stamp itself at
function applyCfg(){
  // everything in the room and the gate is placed in room-art pixels, hits included
  placeArtLayers();

  // the sheets on the noticeboard: each hover box sits in the board hit (% of the board art), and
  // its paper layer scales around that box's centre
  document.querySelectorAll(".paper-hit").forEach(h=>{
    const b = CFG.papers[h.dataset.paper]; place(h, b);
    const img = document.getElementById("paper-"+h.dataset.paper);
    if(img && b) img.style.transformOrigin = (b.x + b.w/2)+"% "+(b.y + b.h/2)+"%";
  });
  placeBubble();
  place(document.getElementById("page"), CFG.page);
  place(document.getElementById("filed-close"), CFG.filedClose);
  place(document.getElementById("back"), CFG.back);
  place(document.getElementById("tasks-page"), tasksPageBox());
  paintBoardGlow();
  document.getElementById("f-back").style.transformOrigin = (CFG.back.x + CFG.back.w/2)+"% "+(CFG.back.y + CFG.back.h/2)+"%";
  document.getElementById("fw").style.setProperty("--folder-ar", CFG.folderAR);
}

/* ---------------- scenes ---------------- */
let scene = "gate";
function show(name){
  // walking out does not end the conversation: it puts it away. the dialogue and the folder are
  // fixed to the viewport and would otherwise hang over the corridor, but the beat the applicant
  // had got to is theirs to come back to, and arriveRoom draws it again.
  if(name !== "room") interviewUI.open ? stowInterviewView() : leaveInterviewView();
  if(name !== "gate") songOff(true);
  scene = name;
  document.querySelectorAll(".scene").forEach(s=>s.classList.remove("on"));
  const el = document.getElementById("s-"+name);
  if(el) el.classList.add("on");
  ambientSync();
}

// long-press on touch: no context menu or image callout on the art, its hits, or the menu sheet
document.addEventListener("contextmenu", e=>{ if(e.target.closest(".hit, .layer, img, .paper-hit, .menu-item")) e.preventDefault(); });

/* hover highlights. data-hi names the layer to light, or several separated by spaces (a sheet on
   the noticeboard lights itself and the board). */
function hiLayers(h){ return h.dataset.hi.split(/\s+/).map(id=>document.getElementById(id)).filter(Boolean); }
document.addEventListener("mouseover", e=>{
  const h = e.target.closest("[data-hi]"); if(!h) return;
  hiLayers(h).forEach(img=>img.classList.add("on"));
  if(h.dataset.hit === "bathroom") songOn();
});
document.addEventListener("mouseout", e=>{
  const h = e.target.closest("[data-hi]"); if(!h) return;
  hiLayers(h).forEach(img=>img.classList.remove("on"));
  if(h.dataset.hit === "bathroom") songOff();
});

/* tooltips: any [data-tip] shows its text in the one #tip label, which trails the mouse a little
   below and to the right of it and stays inside the window. keyboard focus shows it above the item. */
const tipEl = document.getElementById("tip");
let tipTarget = null;
function moveTip(x, y){
  const r = tipEl.getBoundingClientRect(), m = 10;
  let tx = x + 16, ty = y + 20;
  if(tx + r.width + m > innerWidth) tx = x - r.width - 12;
  if(ty + r.height + m > innerHeight) ty = y - r.height - 12;
  tipEl.style.transform = ""; tipEl.style.left = Math.max(m, tx)+"px"; tipEl.style.top = Math.max(m, ty)+"px";
}
function showTip(el, x, y){
  tipTarget = el; tipEl.textContent = el.dataset.tip; tipEl.classList.toggle("wrap", el.dataset.tip.length > 40); tipEl.classList.add("on");   // a long note wraps instead of running off the screen
  if(x == null){ const b = el.getBoundingClientRect(); x = b.left + b.width/2 - 16; y = b.top - tipEl.offsetHeight - 28; }
  moveTip(x, y);
}
function hideTip(){ tipTarget = null; tipEl.classList.remove("on"); }
document.addEventListener("mousemove", e=>{
  const t = e.target.closest("[data-tip]"); if(!t) return;
  if(t !== tipTarget) showTip(t, e.clientX, e.clientY); else moveTip(e.clientX, e.clientY);
});
document.addEventListener("mouseout", e=>{ const t = e.target.closest("[data-tip]"); if(t && !t.contains(e.relatedTarget)) hideTip(); });
document.addEventListener("focusin", e=>{ const t = e.target.closest("[data-tip]"); if(t) showTip(t); });
document.addEventListener("focusout", e=>{ if(e.target.closest("[data-tip]")) hideTip(); });
document.addEventListener("click", hideTip, true);   // the label goes when the thing is used

/* ---------------- folder ---------------- */
const folderEl = document.getElementById("folder");
let folderOpen = false, signingIn = false;
/* what a connected x account writes into state. one place, both sign-in paths, fed by API.connectX() */
function connectedX(acct){
  S.handle = acct.handle; S.pfp = acct.pfp || null;
  S.x = true; S.since = S.since || Date.now();
}
/* what the department files: the payload API.fileCase() receives */
function casePayload(){
  return { alias:S.alias, handle:S.handle, wallet:S.wallet, statement:S.statement, promptId:S.promptId,
           answers:[S.a1, S.a2, S.a3], classification:(classify()||{}).id || (classify()||{}).name || null };
}

// portrait: which page of the spread is in view. the paper (right) first; the card (left) only once there is one
let folderPage = 1;
function setFolderPage(n){
  folderPage = n;
  const fo = document.getElementById("folder");
  const sp = document.getElementById("f-filed");
  if(PORTRAIT.matches && fo.classList.contains("spread")){
    const ar = 2440/1404, vw = innerWidth, vh = innerHeight;
    // one page of the spread (half of it) fills the width with 16px either side, so the folder's edge shows;
    // capped so it never runs taller than the screen leaves room for
    // 2 = whole page in view; well past it, so the paper is readable and the folder's edges run off.
    // capped at 1900px of spread (a page of ~590px): a portrait tablet gets a desktop-sized sheet, not a poster
    const sw = Math.min(2.7 * (vw - 32), (vh - 150) * ar, 1900), sh = sw / ar;
    // % of the spread: the middle of the page's own box, not the leaf's, so the sheet on it is what sits centred
    const centre = n === 0 ? CFG.statsArea.x + CFG.statsArea.w / 2 : CFG.filedPage.x + CFG.filedPage.w / 2;
    sp.style.setProperty("--sw", sw + "px"); sp.style.setProperty("--sh", sh + "px");
    sp.style.setProperty("--fshift", (vw / 2 - centre / 100 * sw) + "px");
  } else { sp.style.removeProperty("--sw"); sp.style.removeProperty("--sh"); sp.style.removeProperty("--fshift"); }
  document.querySelector("#folder .fhint").hidden = false;   // the record sits on the left page from connect on
}
addEventListener("resize", ()=>{ if(folderOpen){ setFolderPage(folderPage); paintCard(); fitWallets(); } });   // the card takes its portrait box when the window turns; the wallets refit to theirs
// the tasks sheet does the same: turning the window swaps the clipboard for the slip, and the
// page on it is placed in percentages of a different shape
addEventListener("resize", ()=>{ place(document.getElementById("tasks-page"), tasksPageBox()); });
// portrait spread: a swipe turns the page. left from the left page shows the right one, right from the
// right page shows the left one (only once there's a card on it). a swipe is not a tap: the click that
// follows it must not close the folder.
// the finger is followed through pointermove, and the swipe is judged on pointerup or pointercancel
// (a browser that decides the move is a scroll cancels the pointer; the last seen position still counts)
let fswX = null, fswY = null, fswLX = 0, fswLY = 0, folderSwiped = false;
folderEl.addEventListener("pointerdown", e=>{ if(e.pointerType !== "mouse"){ fswX = fswLX = e.clientX; fswY = fswLY = e.clientY; } });
folderEl.addEventListener("pointermove", e=>{ if(fswX !== null){ fswLX = e.clientX; fswLY = e.clientY; } });
function endFolderSwipe(e){
  if(fswX === null) return;
  const ex = e.type === "pointercancel" ? fswLX : e.clientX, ey = e.type === "pointercancel" ? fswLY : e.clientY;
  const dx = ex - fswX, dy = ey - fswY; fswX = fswY = null;
  if(Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
  if(!(PORTRAIT.matches && folderEl.classList.contains("spread"))) return;
  folderSwiped = true;
  if(dx < 0 && folderPage === 0) setFolderPage(1);
  if(dx > 0 && folderPage === 1) setFolderPage(0);
}
folderEl.addEventListener("pointerup", endFolderSwipe);
folderEl.addEventListener("pointercancel", endFolderSwipe);
function openFolder(_cover, silent=false){   // the cover is gone; the argument is kept so call sites need not change
  if(!savedDraft()) return;
  S.step = "mycase";
  if(!folderOpen && !silent){ FOLDER_OPEN.currentTime = 0; playSound(FOLDER_OPEN); }   // only when it actually opens, not when it is re-shown mid-flow (or when a paper, not the folder, is what was picked up)
  setFolderPage(0);
  folderOpen = true;
  folderEl.classList.add("on");
  paint();
}
function closeFolder(){
  // putting the paper down is not walking away from the application. it goes back on the desk and
  // the clerk picks up where he left off, still offering it, with whatever was edited still saved.
  if(reviewPaperUp()){
    const a=interviewUI.application;
    a.view='conversation'; a.beat='mint-wrap'; a.paper='review'; a.edit=null; a.confirm=false; interviewUI.message='';
    folderOpen=false; folderEl.classList.remove('on');
    // he does not deliver the whole speech again for a paper you have just put down. straight to
    // the last line of it, where the file is on the desk and still on offer. S.b clamps itself.
    S.d='mint-wrap'; S.b=99; dlgRender(); dlgShow(true); paintDesk(); return;
  }
  // otherwise the interview view only needs taking down when it is in the folder: the filed case
  // sits on #page. a conversation lives in the dialogue and outlasts the folder, so opening the
  // folder mid-interview and shutting it again puts him back on the beat you left.
  if(!(interviewUI.open && dlgEl.contains(interviewPanel))) leaveInterviewView();
  folderOpen = false; folderEl.classList.remove("on");
  if(scene === "room"){ if(S.caseNo){ if(S.d !== "filed") S.d = "idle"; } else if(S.x && !["connected","alias","q1","q2","q3","prompt","statement","result","wallet","review"].includes(S.d)) S.d = "idle"; dlgRender(); dlgShow(true); }
}

/* the folder's pieces put back to their default: the loose paper and its page ready for whatever is
   about to be drawn on them, nothing filed, no card or stats carried over from a previous case.
   this used to be setCover(on), which toggled a closed cover that could not be reached. */
function resetFolderArt(){
  const showIf = (id,v)=>{ const el=document.getElementById(id); if(el) el.style.display = v?"":"none"; };
  showIf("f-paper", true); showIf("f-filed", false);
  showIf("back", false); showIf("f-back", false);   // the drawn back button is retired; the form carries its own
  document.querySelectorAll(".tab[data-tab]").forEach(t=>t.style.display = "");
  document.getElementById("page").style.display = "flex";
  document.getElementById("acard").classList.remove("on");
  document.getElementById("astats").classList.remove("on");
}

function paintTabs(){}   // the tape tabs were removed; progress is the clerk's job now

/* ---------------- pages ---------------- */
function stepHead(box, sec){
  return `<div class="gh">
    <div class="dept">department of fomo<small>office of intake and classification</small></div>
    <div class="casebox">${box}</div>
  </div>
  <div class="gtitle">${sec}</div>`;
}
function pageAlias(){
  return `
    ${stepHead("form dof-3b", "section 1 &middot; identification, continued.")}
    <div class="q">what should we call you?</div>
    <p class="sub">we'll use your handle unless you object. your legal name is unnecessary.</p>
    <div class="line">
      <label for="alias">alias</label>
      <input class="in" id="alias" maxlength="20" value="${esc(S.alias || S.handle.replace(/^@/,""))}" placeholder="whatever you go by" autocomplete="off">
    </div>
    <p class="sub">2 to 20 characters. this is the name on your paperwork.</p>
    ${S.err?`<div class="err">${S.err}</div>`:""}
    <div class="spacer"></div>
    <div class="row"><button class="btn" data-go="alias-next">continue</button></div>`;
}
function pageSignin(){
  return `
    ${stepHead("form dof-3b", "section 1 &middot; identification.")}
    <div class="q">first, connect your x account.</div>
    <p class="pg">so the department knows who it's ignoring, and keeps your case in one place.</p>
    <p class="sub">one active file per account. the department only reads your handle.</p>
    <div class="spacer"></div>
    <div class="row">
      <button class="btn" data-go="x">sign in with x</button>
      <button class="btn ghost" data-go="close-folder">not now</button>
    </div>`;
}
function pageInterview(){
  const R = routeOf();
  let q, opts, round;
  if(!S.a1){ q = IV.opener.q; opts = IV.opener.options; round = 1; }
  else if(!S.a2){ q = R.q2.q; opts = R.q2.options; round = 2; }
  else if(!S.a3){ q = R.q3.q; opts = R.q3.options; round = 3; }
  else {
    const last = optOf(R.q3.options, S.a3);
    return `
      ${stepHead("form dof-3b", "section 2 &middot; assessment, concluded.")}
      <div class="q">${last.react}</div>
      <p class="pg">that's all the questions. one more thing before the committee sees this.</p>
      <div class="spacer"></div>
      <div class="row">
        <button class="btn" data-go="to-statement">continue</button>
        <button class="btn ghost" data-go="redo">answer again</button>
      </div>`;
  }
  const react = round===2 ? R.intro : round===3 ? optOf(R.q2.options,S.a2).react : "";
  return `
    ${stepHead("form dof-3b", `section 2 &middot; assessment. item ${round} of 3.`)}
    ${react?`<p class="pg"><em>${react}</em></p>`:""}
    <div class="q">${q}</div>
    <hr class="rule">
    ${opts.map(o=>`<button class="opt" data-ans="${round}" data-k="${o.k}"><span class="box"></span><span>${o.t}</span></button>`).join("")}
    <div class="spacer"></div>
    <p class="fine">answers are recorded. the committee reads them once.</p>`;
}
function pageStatement(){
  const p = PROMPTS.find(x=>x.id===S.promptId);
  return `
    ${stepHead("form dof-3b", "section 3 &middot; statement.")}
    <div class="q">one final statement for the committee.</div>
    <p class="sub">keep it short. our attention span is a departmental issue.</p>
    ${PROMPTS.map(x=>`<button class="opt ${S.promptId===x.id?"on":""}" data-prompt="${x.id}"><span class="box"></span><span>${x.t}</span></button>`).join("")}
    ${p?`
      <hr class="rule">
      <textarea class="in" id="stmt" maxlength="240" placeholder="one or two sentences.">${esc(S.statement)}</textarea>
      <div class="count"><span id="cnt">${S.statement.length}</span> / 240</div>`:""}
    <div class="spacer"></div>
    <div class="row">
      <button class="btn" data-go="stmt-next" ${(!p||S.statement.trim().length<3)?"disabled":""}>complete my assessment</button>
      <button class="btn ghost" data-go="to-interview">back</button>
    </div>`;
}
function pageResult(){
  const c = CLASSES[classify()];
  return `
    ${stepHead("form dof-2", "notice of classification.")}
    <p class="pg">assessment complete. the department has classified you as:</p>
    <div class="gf"><div class="f w"><span class="l">classification</span><span class="v" style="font-size:1.35em">${c.name}</span></div></div>
    <p class="pg">${c.desc}</p>
    <p class="sub">derived from your answers. the clerk has no opinion.</p>
    <div class="spacer"></div>
    <div class="row">
      <button class="btn" data-go="to-file">file my application</button>
      <button class="btn ghost" data-go="to-statement">edit my statement</button>
    </div>`;
}
/* the right page before a case exists: the department left it blank on purpose, and says so */
function pageBlank(){
  return `<div class="blankp">
    <div class="bpbox">
      <span class="bpl">reserved for your application</span>
      <div class="bp1">this page intentionally left blank</div>
      <div class="bp2">the page is ready. the department is not.</div>
    </div>
    <div class="gfoot"><b>dof-0</b><span>rev. 2026</span><span>page 1 of 1</span></div>
  </div>`;
}
/* the folder's default page: the personnel file. who you are on paper, what you've filed, where the case stands */
function pagePersonnel(){
  const status = S.decision ? {approved:"approved", waitlisted:"waitlisted", not_selected:"not selected"}[S.decision]
               : S.caseNo ? "filed. under review." : DEPT === "open" ? "not filed." : DEPT === "closed" ? "closed. never filed." : "not yet accepting.";
  return `<div class="gov">
    ${govHead()}
    <div class="gtitle">personnel file.</div>
    <div class="gf">
      ${field("account", esc(S.handle||"—"))}${field("first seen", fmtStamp(S.since))}
      ${field("application", status, "w")}
    </div>
    <div class="office"><span class="l">for office use only</span></div>
    <p class="fine">${S.caseNo ? "nothing will happen fast. updates go on the noticeboard." : "the clerk takes the application. this folder only holds it."}</p>
    ${govFoot(1,1)}
  </div>`;
}
/* The X-activity rows are a bounded daily account snapshot. Task progress is loaded
   independently from the live tray; neither is inferred from the other. */
let engTicket = 0;
function adoptEngagement(r){
  const m = r?.metrics || {};
  S.eng = { status:r?.status || "not_collected", at:r?.observedAt ? r.observedAt * 1000 : null,
            coverage:m.coverage || null, viewCoverage:m.viewCoverage || null, scanned:m.postsScanned ?? null,
            mentions:m.matchingPosts ?? null, original:m.originalPosts ?? null, replies:m.repliesAuthored ?? null,
            quotes:m.quotePosts ?? null, views:m.viewsAcrossMatchingPosts ?? null, likes:m.likesReceived ?? null,
            repliesReceived:m.repliesReceived ?? null, repostsReceived:m.repostsReceived ?? null, quotesReceived:m.quotesReceived ?? null,
            points:r?.points || null };
  paintStats();
}
async function loadReferrals(){
  const owner = identity?.user?.id;
  if(!owner || typeof API.referrals !== 'function') return;
  try{
    const referrals = await API.referrals();
    if(identity?.user?.id !== owner) return;
    identity.referrals = referrals;
    paintStats();
  }catch(e){ /* keep the last count while the account service is unavailable */ }
}
async function loadEngagement(){
  if(typeof API.engagement !== "function" || !identity?.user || !savedDraft()) return;
  const ticket = ++engTicket;
  try{
    let r = await API.engagement();
    if(ticket !== engTicket) return;
    const due = r.enabled && typeof API.refreshEngagement === "function" && r.status !== "checking" && (!r.nextRefreshAt || r.nextRefreshAt * 1000 <= Date.now());
    if(due){ try{ r = await API.refreshEngagement(); }catch(e){ /* the server said no: the snapshot it gave stands */ } if(ticket !== engTicket) return; }
    adoptEngagement(r);
  }catch(e){ /* signed out, no case yet, or the count is off: the record shows what it has */ }
}
function engCell(l, v, cls=""){ return `<div class="c ${cls}"><span class="l">${l}</span><b class="v">${v}</b></div>`; }
function paintStats(){
  const el = document.getElementById("astats");
  const spreadUp = folderOpen && folderEl.classList.contains("spread");
  const show = spreadUp && savedDraft();
  el.classList.toggle("on", show);
  if(!show) return;
  const home = document.getElementById("f-filed");
  if(el.parentElement !== home) home.appendChild(el);
  place(el, (PORTRAIT.matches && CFG.statsAreaPortrait) || CFG.statsArea);
  // The account activity uses public @FomiesNFT/#Fomies posts found in the bounded
  // timeline scan. Received counts belong to those posts, not to task completions.
  const e = S.eng || {}, t = taskUI.data, sub = interviewUI.application?.data?.submission;
  if((!t || t.owner !== identity?.user?.id) && !taskUI.busy && !taskUI.error) loadSavedTasks();   // the tray is read for the sheet even before it was opened
  // Task progress is a live, independent record. The daily X-activity snapshot may be older.
  const liveTasks = t?.owner === identity?.user?.id ? t : null;
  const taskCount = liveTasks ? `${liveTasks.completed} of ${liveTasks.total}` : taskUI.busy ? 'loading…' : 'unavailable';
  const num = v => Number.isSafeInteger(v) && v >= 0 ? v.toLocaleString("en-US") : '—';
  const views = e.views == null ? '—' : num(e.views) + (e.viewCoverage === 'partial' ? '+' : '');
  const points = e.points ? num(e.points.total) : '—';
  const gained = e.points ? num(e.points.newViews) : '—';
  const referralCount = Number.isSafeInteger(identity?.referrals?.count) ? num(identity.referrals.count) : '—';
  const referralLink = identity?.referrals?.link || '';
  const xTip = 'counts your recent public X posts that use #Fomies or mention @FomiesNFT' + (e.viewCoverage === 'partial' ? ' · + means known views' : '');   // the scope, on the B caption's ? instead of the foot
  const short = u => u.replace(/^https?:\/\//, '');   // the field shows the link without its scheme; copy takes the whole thing
  el.innerHTML = `<div class="erec">
    <div class="gh">
      <div class="dept">department of fomo<small>office of engagement &middot; form er-1</small></div>
      <div class="casebox">ref ${esc((sub?.caseNumber || visibleCaseNumber() || "—"))}</div>
    </div>
    <div class="meta"><span class="gtitle">Fomies activity record</span><b>${esc(identity?.user?.handle || "unnamed account")}</b></div>
    <fieldset class="sec totals" aria-label="Your Fomies record"><legend>A &middot; Your Fomies record</legend>
      <div class="t"><span class="l">Fomies points</span><b class="v">${points}</b></div>
      <div class="t"><span class="l">Tasks</span><b class="v">${esc(taskCount)}</b></div>
      <div class="t"><span class="l">Referrals</span><b class="v">${referralCount}</b></div>
    </fieldset>
    <fieldset class="sec rows" aria-label="X activity"><legend>B &middot; X activity <span class="qm" tabindex="0" role="note" aria-label="${esc(xTip)}" data-tip="${esc(xTip)}">?</span></legend>
      <div class="r"><span class="l">Views on recent Fomies posts</span><b class="v">${views}</b></div>
      <div class="r"><span class="l">New views since last check</span><b class="v">${gained}</b></div>
      <div class="r"><span class="l">Fomies posts found</span><b class="v">${num(e.mentions)}</b></div>
    </fieldset>
    <fieldset class="sec reflink" aria-label="Your referral link"><legend>C &middot; Your referral link</legend>
      <div class="row"><input id="eng-referral-link" aria-label="Your referral link" value="${esc(referralLink)}" data-full="${esc(referralLink)}" readonly><button type="button" data-copy-referral ${referralLink?'':'disabled'}>Copy</button></div>
    </fieldset>
    <div class="gfoot"><span class="daily">Records are updated daily.</span><span>last updated</span><b>${e.at ? fmtStamp(e.at) : "not yet"}</b></div>
  </div>`;
  const inp = el.querySelector('#eng-referral-link'); if(inp && inp.value) inp.value = short(inp.value);   // shown short; the copy uses data-full
}
document.getElementById('astats').addEventListener('click',async event=>{
  const qm=event.target.closest('.qm');if(qm){showTip(qm);return;}   // a tap shows the ? note on a phone (no hover there); the next tap anywhere hides it
  const button=event.target.closest('[data-copy-referral]');if(!button)return;
  const input=document.getElementById('eng-referral-link');const full=input?.dataset.full||input?.value;if(!full)return;
  try{await navigator.clipboard.writeText(full);button.textContent='Copied';}
  catch{input.value=full;input.focus();input.select();button.textContent='Select and copy';}
});
/* ---------------- the department card ----------------
   one element (#acard) on the left page under the record, two faces from the same state:
   the applicant card once a case is filed (S.caseNo), the visitor badge before (S.x only).
   cardData() is the one reading of S both faces and the png export draw from. */
const DECISION_WORD = { approved:"approved", waitlisted:"waitlisted", not_selected:"not selected" };
const MRZ_LEN = 36;   // characters across the machine-readable strip
const mrzWord = t => String(t||"").toUpperCase().replace(/[^A-Z0-9]+/g, "<").replace(/^<|<$/g, "");
const mrzLine = t => (t + "<".repeat(MRZ_LEN)).slice(0, MRZ_LEN);
function cardData(){
  const c = S.a3 ? CLASSES[classify()] : null;
  const filed = !!S.caseNo;
  const name = S.alias || (S.handle||"").replace(/^@/,"") || "unnamed";
  const handle = S.handle || "";
  const classification = c ? c.name : "unassessed";
  // the visitor's pass number is the day the visit started, as the department writes dates
  const idNo = visibleCaseNumber() || "—";
  // what the bars encode: the case number once there is one (a finished interview); before it, the visitor's own x
  // account (the last ten digits of its id), so a pass with no number yet still carries a full code of its own.
  // always ten characters, so every card's bars are the same density
  const seed = String(visibleCaseNumber() || identity?.user?.id || handle || name).replace(/[^0-9a-z]/gi, "") || "0";
  const bars = seed.repeat(Math.ceil(10 / seed.length)).slice(-10);
  return {
    filed, name, handle, idNo, bars, classification,
    pfp: S.pfp || null,
    caseNo: S.caseNo || "",
    filedAt: fmtStamp(S.filedAt),
    since: fmtStamp(S.since),
    standing: identity?.draft?.status==='submitted'?"identity confirmed":"draft — not submitted",
    expires: "further notice",
    state: S.decision || "pending",                              // the status field
    stateWord: S.decision ? DECISION_WORD[S.decision] : "pending",
    micro: filed ? "non-transferable. position is everything." : "must be escorted at all times.",
    mrz: [ mrzLine(`DOF<${filed ? "APPLICANT" : "VISITOR"}<<${mrzWord(name)}`),
           mrzLine(`${mrzWord(idNo) || "<".repeat(10)}<${mrzWord(handle)}<${filed ? "FILED" : "ESCORTED"}`) ]   // no number yet: the field is filler, as a machine-readable strip writes an empty one
  };
}
// the card's box: the phone shows one page at a time, so the card takes a bigger box there
const cardBox = () => (PORTRAIT.matches && CFG.cardAreaPortrait) || CFG.cardArea;
// the tasks sheet sits on the clipboard in landscape and on the torn slip in portrait, and the two
// are different shapes, so the page it carries gets its own box for each
const tasksPageBox = () => (PORTRAIT.matches && CFG.tasksPagePortrait) || CFG.tasksPage;
function paintCard(){
  const el = document.getElementById("acard");
  const spreadUp = folderOpen && ((S.step === "file" && !!S.caseNo) || S.step === "mycase");
  const show = spreadUp && savedDraft();   // the same page as the record: there is a card from connect on
  el.classList.toggle("on", show);
  if(!show) return;
  const home = document.getElementById("f-filed");   // it sits on the spread, so it moves with it
  if(el.parentElement !== home) home.appendChild(el);
  place(el, cardSpot());   // its own box, or wherever it was last dropped
  fillCard(el);
  if(inspectOpen && inspectKind === "card") paintCardInspect();   // a repaint while it is being inspected reaches the big one too
}
// the card's markup, the same on the folder and in the viewer; a photograph that fails to load hands over to the dashed box
/* the barcode: a start guard, three bars and three gaps of one or two units per character of the id,
   a stop guard. decorative, but the same id draws the same code every time. [bar, gap] units */
function barcodePattern(code){
  const seq = [[2,1],[1,1],[2,1]];
  for(const ch of String(code)){ const c = ch.charCodeAt(0); for(let i = 0; i < 3; i++) seq.push([((c>>(i*2))&1)+1, ((c>>(i*2+1))&1)+1]); }
  seq.push([1,1],[2,0]);
  return seq;
}
const barcodeHTML = code => barcodePattern(code).map(([b,g])=>`<i style="--w:${b}"></i>${g ? `<i class="g" style="--w:${g}"></i>` : ""}`).join("");
const CARD_DOMAIN = "fomies.family";   // printed over the front's barcode, the way a barcode carries its human-readable line
function fillCard(el, extra=""){
  const d = cardData();
  // the photograph, or the dashed box. an image that fails to load hands over to the box (below)
  // the photograph a third of the card wide, the holder's role as a ribbon across its foot
  const photo = `<div class="pfw">
        <div class="pf${d.pfp ? "" : " none"}">${d.pfp ? `<img src="${esc(d.pfp)}" alt="" draggable="false">` : ""}<span class="nop">no photograph on file</span></div>
        <span class="tag">${d.filed ? "applicant" : "visitor"}</span>
      </div>`;
  const field = (l, v, cls="") => `<div class="f ${cls}"><span class="l">${l}</span><span class="v">${esc(v)}</span></div>`;
  const mrz = `<div class="mrz">${esc(d.mrz[0])}\n${esc(d.mrz[1])}</div>`;
  // the same header on both faces: the emblem, the department over its office, the number on the right
  const band = `<div class="band">
      <img class="seal icon" src="${CARD_ICON}" alt="" draggable="false">
      <div class="t"><b>department of fomo</b><small>office of intake and classification</small></div>
      <div class="no"><small>${d.filed ? "case no." : "pass no."}</small>${esc(d.idNo)}</div>
    </div>`;
  el.innerHTML = `<div class="idc${d.filed ? "" : " visitor"}">
    ${band}
    <div class="idrow">
      ${photo}
      <div class="who">
        <div class="fields">
          ${field("name", d.name, "w nm")}
          ${d.filed
            ? field("account", d.handle, "w") + field("filed", d.filedAt, "w") + field("status", d.stateWord, "w")
            : field("account", d.handle, "w") + field("visiting since", d.since, "w")}
        </div>
        <div class="barcode" aria-hidden="true">${barcodeHTML(d.bars)}<span class="bc-label">${CARD_DOMAIN}</span></div>
      </div>
    </div>
    ${mrz}
  </div>${cardSleeveImg(CARD_HOLDER, "holder")}${extra}`;
  const img = el.querySelector(".pf img");
  if(img) img.addEventListener("error", ()=>{ img.parentElement.classList.add("none"); img.remove(); });
}
/* the card in the evidence viewer. the folder stays up under it, not closed, and the viewer's ground
   darkens over it, so the card is seen to come off the folder: the big card starts where the small one
   lies (its place, size and angle) and flies to the middle, and flies back into its slot on the way out.
   the glare that the tilt sweeps is laid over the card here, clipped to its corners */
const CARD_FLY = 460, CARD_FLY_BACK = 380;   // ms: out of the folder, back into it
let cardFlight = 0;   // which flight is current: a late finish from an earlier one changes nothing
const cardFlyer = () => document.querySelector("#insp-card .tilt");
// the transform that lays the viewer's card over the small one on the folder, or null if there is none to fly from
function cardOnFolder(){
  const small = document.getElementById("acard"), big = document.getElementById("cplate"), fly = cardFlyer();
  if(reduceMotion || !folderOpen || !small.classList.contains("on")) return null;
  const s = small.getBoundingClientRect(), b = fly.getBoundingClientRect();
  if(!s.width || !b.width || !big.offsetWidth) return null;
  const k = small.offsetWidth * (small.matches(":hover") ? 1.03 : 1) / big.offsetWidth;   // the small card lifts 3% under the mouse
  return `translate(${(s.left + s.width / 2 - b.left - b.width / 2).toFixed(1)}px,${(s.top + s.height / 2 - b.top - b.height / 2).toFixed(1)}px) scale(${k.toFixed(4)}) rotate(-9deg)`;
}
// puts the flyer at rest to measure it, and hands back where it was (a flight can be cut short by the next one)
function flyerAtRest(fly){ const now = getComputedStyle(fly).transform; fly.style.transition = "none"; fly.style.transform = ""; return now === "none" ? "" : now; }
function flyCardIn(){
  const small = document.getElementById("acard"), fly = cardFlyer(), n = ++cardFlight;
  flyerAtRest(fly); fly.style.opacity = "";
  const from = cardOnFolder();
  if(!from) return;
  fly.style.transform = from; small.classList.add("lifted");   // it has left the folder
  fly.getBoundingClientRect();   // the start is laid out before the move begins
  requestAnimationFrame(()=>{ if(n !== cardFlight) return; fly.style.transition = `transform ${CARD_FLY}ms cubic-bezier(.2,.8,.2,1)`; fly.style.transform = ""; });
}
function flyCardBack(){
  const small = document.getElementById("acard"), fly = cardFlyer(), flip = document.getElementById("cflip"), n = ++cardFlight;
  const now = flyerAtRest(fly), to = cardOnFolder();
  fly.style.transform = now; fly.getBoundingClientRect();   // from wherever it is, even mid-flight
  const land = ()=>{ if(n !== cardFlight) return;
    small.classList.remove("lifted"); if(!inspectOpen) inspectEl.classList.remove("on");
    fly.style.transition = "none"; fly.style.transform = ""; fly.style.opacity = ""; flip.style.transition = ""; };
  if(!to){ fly.style.transition = "opacity .22s ease"; fly.style.opacity = "0"; setTimeout(land, 240); return; }   // nowhere to land: it fades with the ground
  if(flip.classList.contains("flipped")){   // turned over: it turns face up on the way back, in the same time
    flip.style.transition = `transform ${CARD_FLY_BACK}ms cubic-bezier(.45,.05,.2,1)`;
    flip.classList.remove("flipped"); flip.setAttribute("aria-pressed", false);
  }
  fly.style.transition = `transform ${CARD_FLY_BACK}ms cubic-bezier(.4,0,.2,1)`; fly.style.transform = to;
  setTimeout(land, CARD_FLY_BACK + 20);
}
function paintCardInspect(){
  fillCard(document.getElementById("acard-big"), `<div class="glare"><i></i></div>`);
  fillCardBack(document.getElementById("acard-back"));
}
/* the back of the card. a placeholder composition for now: the department's notice, the strip again */
function fillCardBack(el){
  const d = cardData();
  // laid out like the back of a real card: the magnetic stripe, the signature strip, the issuer's
  // conditions in small print, the barcode and number at the foot
  el.innerHTML = `<div class="idc back${d.filed ? "" : " visitor"}">
    <div class="mag"></div>
    <div class="sigrow">
      <span class="l">Authorised signature</span>
      <span class="strip"><i>${esc(d.name)}</i></span>
      <span class="signed">Not valid unless signed</span>
    </div>
    <div class="terms">
      <p>This card is the property of the Department of FOMO and must be surrendered on request. If found, return it to the Office of Intake and Classification, window three.</p>
      <p>${d.filed ? "Non-transferable. Valid for the holder's case only." : "The holder must be escorted at all times while on the premises."} Not valid as identification elsewhere. Not a promise of anything.</p>
    </div>
    <div class="foot">
      <span class="issuer">Issued by the Office of Intake and Classification &middot; rev. 2026</span>
      <span class="code"><span class="barcode" aria-hidden="true">${barcodeHTML(d.bars)}</span><span class="no">${esc(d.idNo)}</span></span>
    </div>
  </div>${cardSleeveImg(CARD_HOLDER_BACK, "holder")}`;
}
document.getElementById("cflip").addEventListener("click", e=>{
  e.stopPropagation(); playCardFlip(!document.getElementById("cflip").classList.contains("flipped"));
  const on = document.getElementById("cflip").classList.toggle("flipped");
  document.getElementById("cflip").setAttribute("aria-pressed", on);
});
function openCardInspect(){
  if(!folderOpen || inspectOpen) return;
  SOCIALS_OPEN.currentTime = 0; playSound(SOCIALS_OPEN);   // the card comes off the folder
  document.getElementById("cflip").classList.remove("flipped");   // it opens face up
  paintCardInspect();
  openInspect("card");   // the folder stays up under it
  flyCardIn();
}
/* the card on the folder: a click opens it in the viewer; a hold picks it up, and it goes where the
   pointer goes, anywhere on the folder art (#f-filed is the art's own box, so its percentages are the
   art's). with a mouse a move picks it up at once; a finger has to hold first, so a page swipe that
   starts on the card is still a swipe. where it is dropped is kept for the sitting, per orientation */
const cardDrop = {};   // { l:{x,y}, p:{x,y} }, percentages of the art
const cardSpot = () => { const b = cardBox(), d = cardDrop[PORTRAIT.matches ? "p" : "l"]; return d ? { ...b, x:d.x, y:d.y } : b; };
(function(){
  const el = document.getElementById("acard"), HOLD = 180, SLOP = 6, EDGE = 1;   // ms to pick up; px before a press is a move; % the card keeps from the art's edge
  let press = null, dragging = false, dragged = false, tip = "", last = null;
  const lift = e => {
    dragging = true; last = null; el.classList.add("drag"); try{ el.setPointerCapture(e.pointerId); }catch{}
    tip = el.dataset.tip; delete el.dataset.tip; hideTip();   // no label trailing a carried card
    fswX = null;                                               // a carried card is not a page swipe
  };
  const moveTo = e => {
    const r = el.parentElement.getBoundingClientRect(), b = cardBox();
    const x = (e.clientX - press.dx - r.left) / r.width * 100, y = (e.clientY - press.dy - r.top) / r.height * 100;
    last = { x: Math.min(Math.max(x, EDGE), 100 - b.w - EDGE), y: Math.min(Math.max(y, EDGE), 100 - b.h - EDGE) };
    el.style.left = last.x + "%"; el.style.top = last.y + "%";
    return last;
  };
  el.addEventListener("pointerdown", e=>{
    if(e.pointerType === "mouse" && e.button !== 0) return;
    const r = el.parentElement.getBoundingClientRect();
    dragged = false;   // a finger's carry ends with no click to clear it, so the next press does
    press = { x:e.clientX, y:e.clientY, id:e.pointerId, mouse:e.pointerType === "mouse",
              dx:e.clientX - (r.left + el.offsetLeft), dy:e.clientY - (r.top + el.offsetTop),   // where on the card it was taken
              timer:setTimeout(()=>{ if(press && !dragging) lift(e); }, HOLD) };
  });
  el.addEventListener("pointermove", e=>{
    if(!press || e.pointerId !== press.id) return;
    if(!dragging){
      if(Math.hypot(e.clientX - press.x, e.clientY - press.y) < SLOP) return;
      clearTimeout(press.timer);
      if(press.mouse) lift(e); else { press = null; return; }   // a finger that moves before the hold is turning the page
    }
    moveTo(e);
  });
  const drop = e => {
    if(!press || e.pointerId !== press.id) return;
    clearTimeout(press.timer);
    if(dragging){
      cardDrop[PORTRAIT.matches ? "p" : "l"] = last;   // it stays where it was last carried to: the release point can differ by a hair on touch, and a cancelled pointer has none
      dragging = false; dragged = true; el.classList.remove("drag"); el.dataset.tip = tip;
      try{ el.releasePointerCapture(e.pointerId); }catch{}
    }
    press = null;
  };
  el.addEventListener("pointerup", drop);
  el.addEventListener("pointercancel", drop);
  el.addEventListener("dragstart", e=>e.preventDefault());   // the browser's own drag would carry a ghost of the card
  el.addEventListener("click", e=>{ e.stopPropagation(); if(dragged){ dragged = false; return; } hideTip(); openCardInspect(); });   // the click that ends a carry opens nothing
  el.addEventListener("keydown", e=>{ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openCardInspect(); } });
})();
/* export: the card drawn again on a canvas (1.6:1, 2x) and saved as a png. the photograph is fetched
   with crossOrigin set: x's cdn may refuse, and then, for the export only, the dashed box stands in,
   so the canvas is never tainted and the file never comes out blank. the card on screen keeps the
   real photograph either way. */
const CARD_PNG = "fomies-department-id.png";
const CARD_ICON = "assets/folder/card-icon.webp";   // the department's emblem, in the band of both faces
/* The designer supplied both PNG sleeves and retired the old WebP. */
const CARD_HOLDER = "assets/folder/card-overlay.webp";
const CARD_HOLDER_BACK = "assets/folder/card-overlay-back.webp";
const cardSleeveImg = (path, cls) => `<img class="${cls}" src="${path}" alt="" draggable="false">`;
const CARD_BG = "#c9bcff";   // the export's ground behind the sleeve when the art can't load (the site's lilac); one flat colour
const CARD_BG_ART = "assets/folder/card-bg.webp";   // the ground art: cover-fitted to the sheet, centred, over the flat colour
const CARD_SHEET_DY = 20;   // the card and its sleeve sit this much below the sheet's centre (layout px: 40 in the 2x file), where the ground art wants them
const CARD_W = 1200, CARD_H = 750, CARD_SCALE = 2, CARD_MARGIN = 56;   // the card, and clear space round it for its shadow
const CARD_EXPORT_PAD = 96;   // ground shown round the sleeve in the exported png, in sheet px each side
const CARD_SLEEVE_FOOT = 88;   // the sleeve art's overhang below the card, in sheet px: the card is placed from the sheet's foot, so the art may grow upward
const CARD_INK = "#1c2340", CARD_SOFT = "#4a5270", CARD_PAPER = "#f4efe2";
const CARD_INK_FILED = "#1c402e";   // the filed case's band and tag; keep in step with --ink-filed in the css
function loadCardPhoto(src){   // resolves with the image, or null when it can't be drawn cleanly. a list tries each in turn
  if(Array.isArray(src)) return src.reduce((p, s)=>p.then(im=>im || loadCardPhoto(s)), Promise.resolve(null));
  return new Promise(res=>{
    if(!src) return res(null);
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = ()=>res(im); im.onerror = ()=>res(null);
    im.src = src;
  });
}
function cardFontsReady(){
  if(!document.fonts) return Promise.resolve();
  return Promise.all(["900 40px Nunito", "800 40px Nunito", "700 40px Nunito", '700 40px "Courier Prime"'].map(f=>document.fonts.load(f))).catch(()=>{});
}
/* the export draws the card the css draws: the same measures, in the same units. on screen the card's
   type is 4.2% of its width (1em) and its side padding 3.6% (.idc / .band / .idrow / .mrz rules); every
   size below is that em, so the two faces and the png stay one layout. change a measure in site.css,
   change it here. */
function drawCard(ctx, d, photo, icon){
  const W = CARD_W, H = CARD_H, em = W * 0.042, pad = W * 0.036;
  const rr = (x, y, w, h, r)=>{ ctx.beginPath(); ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r); ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath(); };
  const font = (wt, px, mono)=>{ ctx.font = `${wt} ${px}px ${mono ? '"Courier Prime", monospace' : "Nunito, sans-serif"}`; };
  const fit = (t, max)=>{ if(ctx.measureText(t).width <= max) return t; while(t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1); return t + "…"; };
  const spacedW = (t, sp)=>[...t].reduce((s, ch)=>s + ctx.measureText(ch).width + sp, -sp);
  const spaced = (t, x, y, sp, align="left", max=Infinity)=>{   // letter-spaced text (letterSpacing isn't everywhere yet), cut with an ellipsis past max
    while(t.length > 1 && spacedW(t, sp) > max) t = t.replace(/…?$/, "").slice(0, -1) + "…";
    const w = spacedW(t, sp); let cx = align === "center" ? x - w/2 : align === "right" ? x - w : x;
    ctx.textAlign = "left"; [...t].forEach(ch=>{ ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; }); return w;
  };
  const card = ()=>rr(3, 3, W-6, H-6, 6);   // the card's outline: a 2px rule in css, 6 here at this scale
  ctx.textBaseline = "alphabetic";
  const band = d.filed ? CARD_INK_FILED : CARD_INK;   // the filled blocks, the same switch as .idc's --band
  // the card: its hard shadow into the margin, then paper
  ctx.fillStyle = "rgba(28,35,64,.3)"; rr(3+9, 3+12, W-6, H-6, 6); ctx.fill();
  card(); ctx.fillStyle = CARD_PAPER; ctx.fill();
  // ---- the band (.band: padding .42em / .4em, the 2em seal, the department over its office, the number)
  const BAND = (.42 + 2 + .4) * em, ss = 2 * em, sx = pad, sy = .42 * em;
  ctx.save(); card(); ctx.clip(); ctx.fillStyle = band; ctx.fillRect(0, 0, W, BAND); ctx.restore();
  if(icon) ctx.drawImage(icon, sx, sy, ss, ss);
  else {   // the art missing: the drawn seal stands in
    ctx.strokeStyle = CARD_PAPER; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(sx+ss/2, sy+ss/2, ss/2-2, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx+ss/2, sy+ss/2, ss/2-.28*em, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = CARD_PAPER; font(900, .44*em); ctx.textAlign = "center"; ctx.fillText("DOF", sx+ss/2, sy+ss/2+.16*em); ctx.textAlign = "left";
  }
  const tx0 = sx + ss + .5 * em, noW = 4.2 * em;   // the title block, and room kept on the right for the number
  ctx.fillStyle = CARD_PAPER; font(900, .86*em); spaced("DEPARTMENT OF FOMO", tx0, BAND/2 - .02*em, .1*.86*em, "left", W - pad - noW - tx0);
  ctx.globalAlpha = .8; font(800, .48*em); spaced("OFFICE OF INTAKE AND CLASSIFICATION", tx0, BAND/2 + .62*em, .14*.48*em, "left", W - pad - noW - tx0);
  font(800, .46*em); spaced(d.filed ? "CASE NO." : "PASS NO.", W - pad, BAND/2 - .22*em, .14*.46*em, "right"); ctx.globalAlpha = 1;
  font(700, .7*em, true); ctx.textAlign = "right"; ctx.fillText(d.idNo, W - pad, BAND/2 + .62*em); ctx.textAlign = "left";
  // ---- the body (.idrow: padding .5em top, gap .7em; .pfw: 27% of the row, the tag .32em under the photograph)
  const y0 = BAND + .5 * em, px = pad, py = y0, ps = .36 * W;   // the photograph, most of the body's height
  if(photo){
    ctx.fillStyle = "rgba(28,35,64,.35)"; ctx.fillRect(px+6, py+6, ps, ps);           // the hard shadow
    ctx.fillStyle = "#fff"; ctx.fillRect(px, py, ps, ps);                                 // the white print border (.26em)
    ctx.lineWidth = 3; ctx.strokeStyle = CARD_INK; ctx.strokeRect(px+1.5, py+1.5, ps-3, ps-3);
    ctx.save(); const bw = .26*em; ctx.beginPath(); ctx.rect(px+bw, py+bw, ps-2*bw, ps-2*bw); ctx.clip();
    if("filter" in ctx) ctx.filter = "saturate(.72) contrast(1.08)";
    const k = Math.max((ps-2*bw)/photo.width, (ps-2*bw)/photo.height), dw = photo.width*k, dh = photo.height*k;   // cover-fit
    ctx.drawImage(photo, px+bw+((ps-2*bw)-dw)/2, py+bw+((ps-2*bw)-dh)/2, dw, dh); ctx.restore();
  } else {
    ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(28,35,64,.45)";
    rr(px, py, ps, ps, 6); ctx.stroke(); ctx.restore();
    ctx.fillStyle = CARD_SOFT; font(900, .55*em); ctx.textAlign = "center";
    ctx.fillText("no photograph", px+ps/2, py+ps/2 - .15*em); ctx.fillText("on file", px+ps/2, py+ps/2 + .55*em); ctx.textAlign = "left";
  }
  // the role, a ribbon across the foot of the photograph (.tag: 3% past each side, 7% up, with a hard shadow)
  const th = (.36 + .78 + .32) * em, ty = py + ps + .04*ps - th, tx = px - .03*ps, tw = ps * 1.06;
  ctx.fillStyle = "rgba(28,35,64,.35)"; rr(tx+4, ty+4, tw, th, 6); ctx.fill();
  rr(tx, ty, tw, th, 6); ctx.fillStyle = band; ctx.fill();
  ctx.fillStyle = CARD_PAPER; font(900, .78*em); spaced(d.filed ? "APPLICANT" : "VISITOR", px+ps/2, ty + .36*em + .68*em, .22*.78*em, "center");
  // the fields (.who .fields: two columns, gap .32em / .5em; .f .l .52em, .f .v .82em mono, the name 1.28em)
  const fx = px + ps + .026*W, fw = W - pad - fx, col = (fw - .5*em) / 2;
  let fy = y0;
  const fieldH = v => (.52 + .15 + 1.1 * v + .28) * em;
  const field = (l, v, x, w, vs)=>{
    ctx.fillStyle = CARD_SOFT; font(900, .52*em); spaced(l.toUpperCase(), x, fy + .52*em, .14*.52*em, "left", w);
    ctx.fillStyle = CARD_INK; font(700, vs*em, true); ctx.fillText(fit(v, w), x, fy + (.52 + .15) * em + vs*em * .92);
  };
  const row = (cells, vs=.82)=>{   // one full-width cell, or two side by side
    if(cells.length === 1) field(cells[0][0], cells[0][1], fx, fw, vs);
    else { field(cells[0][0], cells[0][1], fx, col, vs); field(cells[1][0], cells[1][1], fx + col + .5*em, col, vs); }
    fy += fieldH(vs);
  };
  row([["name", d.name]], 1.28);
  if(d.filed){ row([["account", d.handle]]); row([["filed", d.filedAt]]); row([["status", d.stateWord]]); }
  else { row([["account", d.handle]]); row([["visiting since", d.since]]); }
  // ---- the foot: the machine-readable strip (.mrz: .74em mono, two lines at 1.25); no fine print on the front
  const mh = (.32 + 2 * 1.25 * .74 + .36) * em, my = H - mh;
  // the barcode at the bottom of the column (.barcode: 70% of the column, 2.1em tall, .3em above the row's foot)
  const seq = barcodePattern(d.bars), units = seq.reduce((n,[b,g])=>n+b+g, 0), unit = fw / units, bh = 2.1*em, by = my - .3*em - .3*em - bh;
  ctx.fillStyle = CARD_INK; let bx = fx; for(const [b,g] of seq){ ctx.fillRect(bx, by, b*unit, bh); bx += (b+g)*unit; }
  // the domain over the bars (.bc-label: .95em black body type on a white slip, centred on the barcode)
  { font(900, .95*em); const tw = ctx.measureText(CARD_DOMAIN).width, lw = tw + 1.1*em, lh = 1.45*em, lx = fx + fw/2 - lw/2, ly = by + bh/2 - lh/2;
    ctx.fillStyle = "#fff"; rr(lx, ly, lw, lh, .18*em); ctx.fill();
    ctx.fillStyle = CARD_INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(CARD_DOMAIN, fx + fw/2, ly + lh/2 + .04*em); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }
  ctx.save(); card(); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(0, my, W, mh);
  ctx.fillStyle = "rgba(28,35,64,.4)"; ctx.fillRect(0, my, W, 3); ctx.restore();
  ctx.fillStyle = CARD_INK; font(700, .74*em, true);
  spaced(d.mrz[0], pad, my + .32*em + .74*em*.92, .05*.74*em); spaced(d.mrz[1], pad, my + .32*em + 1.25*.74*em + .74*em*.92, .05*.74*em);
  card(); ctx.lineWidth = 6; ctx.strokeStyle = CARD_INK; ctx.stroke();   // the rule last, over the band and the strip
}
function renderCardPNG(){
  const d = cardData();
  return Promise.all([cardFontsReady(), loadCardPhoto(d.pfp), loadCardPhoto(CARD_ICON), loadCardPhoto(CARD_HOLDER), loadCardPhoto(CARD_BG_ART)]).then(([, photo, icon, sleeve, ground])=>{
    const paint = ph=>{
      // the sheet: as wide as the card and its margins (the sleeve art was drawn to that width), as tall as
      // the sleeve needs; the card sits centred in it, the ground colour behind, the sleeve over everything
      const cw = CARD_W + 2*CARD_MARGIN, ch = sleeve ? Math.round(sleeve.naturalHeight * cw / sleeve.naturalWidth) : CARD_H + 2*CARD_MARGIN;
      // the sheet is the sleeve's size plus a margin of ground all round, so the export has room to breathe
      const sw = cw + 2*CARD_EXPORT_PAD, sh = ch + 2*CARD_EXPORT_PAD;
      const cv = document.createElement("canvas"); cv.width = sw*CARD_SCALE; cv.height = sh*CARD_SCALE;
      const ctx = cv.getContext("2d"); ctx.scale(CARD_SCALE, CARD_SCALE);
      ctx.fillStyle = CARD_BG; ctx.fillRect(0, 0, sw, sh);
      if(ground){   // the ground art fills the sheet like object-fit:cover, centred, whatever its own proportions
        const k = Math.max(sw / ground.naturalWidth, sh / ground.naturalHeight), gw = ground.naturalWidth * k, gh = ground.naturalHeight * k;
        ctx.drawImage(ground, (sw - gw)/2, (sh - gh)/2, gw, gh);
      }
      ctx.save(); ctx.translate(CARD_EXPORT_PAD, CARD_EXPORT_PAD + CARD_SHEET_DY);   // the card and the sleeve move together, inside the margin
      ctx.save(); ctx.translate(CARD_MARGIN, ch - CARD_SLEEVE_FOOT - CARD_H); drawCard(ctx, d, ph, icon); ctx.restore();
      if(sleeve) ctx.drawImage(sleeve, 0, 0, cw, ch);
      ctx.restore();
      return new Promise((res, rej)=>{ try{ cv.toBlob(b=>b ? res(b) : rej(new Error("no blob")), "image/png"); }catch(e){ rej(e); } });
    };
    // a photograph that loaded but still taints the canvas (an odd server) is dropped and the card drawn again without it
    return paint(photo).catch(()=>photo ? paint(null) : Promise.reject(new Error("export failed")));
  });
}
function downloadBlob(blob, name){
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}
/* the share copy: lowercase, deadpan, one line per state */
function cardShareText(){
  const d = cardData();
  const line = !d.filed ? "visiting the department of fomo. no case yet. must be escorted at all times."
    : d.state === "approved"     ? `the department of fomo approved my case. ${d.caseNo}. i have questions.`
    : d.state === "waitlisted"   ? `waitlisted by the department of fomo. case ${d.caseNo}. the list is in a file.`
    : d.state === "not_selected" ? `not selected by the department of fomo. case ${d.caseNo}. the committee has no comment.`
    : `just filed with the department of fomo. case ${d.caseNo}. still waiting.`;
  return `${line} @${X_HANDLE}`;
}
/* the buttons under the inspected card. export saves the png. share saves it too and opens an x post with the
   copy filled in; the intent window is opened first, in the click itself, so no popup blocker gets
   a say, and the download follows. the image can't ride along on a web intent: attaching it means
   posting through the x api (an api.js call, with the server holding the credentials), a later
   upgrade. until then the person attaches the downloaded png themselves. */
document.getElementById("acard-acts").addEventListener("click", e=>{
  const b = e.target.closest("[data-card]"); if(!b) return;
  e.stopPropagation();
  const share = b.dataset.card === "share";
  if(share) window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(cardShareText()), "_blank", "noopener");
  if(b.classList.contains("busy")) return;
  const was = b.textContent; b.classList.add("busy"); b.disabled = true; b.textContent = "printing…";
  renderCardPNG().then(blob=>downloadBlob(blob, CARD_PNG))
    .catch(()=>{ b.textContent = "no printer"; })
    .then(()=>setTimeout(()=>{ b.classList.remove("busy"); b.disabled = false; b.textContent = was; }, 900));
});
caseButtons(document.getElementById("acard-acts"));   // export / share, in the clerk's case like every other button
/* the government form. everything on the paper is drawn here; the art is blank. */
const fmtStamp = t => t ? new Date(t).toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"}) : "—";
function visibleCaseNumber(){ return interviewUI.record?.caseNumber || identity?.draft?.caseNumber || null; }
function govHead(caseNo = visibleCaseNumber()){
  return `<div class="gh">
    <div class="dept">department of fomo<small>office of intake and classification</small></div>
    <div class="casebox">case ${caseNo ? esc(caseNo) : "F-*****"}</div>
  </div>`;
}
function govFoot(page, of){
  return `<div class="gfoot"><b>DOF-3B</b><span>rev. 2026</span><span>page ${page} of ${of}</span></div>`;
}
const field = (l, v, cls="", attrs="") => `<div class="f ${cls}" ${attrs}><span class="l">${l}</span><span class="v">${v}</span></div>`;
// the statement's box: the question the applicant answered, printed on the form, and their answer under it
const statementField = (question, v) => `<div class="f w stmt"><span class="l">your statement</span><span class="ask">${esc(question)}</span><span class="v">${v}</span></div>`;
/* a wallet on a paper is written out whole when its box is wide enough, otherwise as its two ends
   around a "…", as many characters as the box takes: a paper's width, not a fixed count, decides.
   the address itself is on the field (data-wallet); the mark inside gets the fitted text. */
function walletField(label, addr, wide){
  return field(label, `<mark class="hl">${esc(addr)}</mark>`, (wide ? "w " : "") + "wal", `data-wallet="${esc(addr)}"`);
}
function fitWallets(again = true){
  document.querySelectorAll("#page .f.wal").forEach(f=>{
    const full = f.dataset.wallet || "", v = f.querySelector(".v"), t = v.querySelector("mark") || v;
    const fits = ()=> v.scrollWidth <= v.clientWidth;
    t.textContent = full;
    if(!v.clientWidth){ if(again) requestAnimationFrame(()=>fitWallets(false)); return; }   // not laid out yet: once more next frame
    if(fits()) return;
    const cut = k => full.slice(0, Math.ceil(k/2)) + "…" + full.slice(-Math.floor(k/2));
    let lo = 4, hi = full.length - 1;   // how many characters of the address stay, at least four
    while(lo < hi){ const k = Math.ceil((lo + hi) / 2); t.textContent = cut(k); if(fits()) lo = k; else hi = k - 1; }
    t.textContent = cut(lo);
  });
}
function govStamps(){
  if(!S.caseNo) return "";
  const dec = S.decision;
  const fresh = S.stampFresh ? " strike" : "";
  return `<span class="gstamp received">received<small>${fmtStamp(S.filedAt)}</small></span>`
       + (dec ? `<span class="gstamp ${dec}${fresh}">${dec.replace("_"," ")}</span>` : "");
}
function pageFile(){
  const c = CLASSES[classify()];
  const p = PROMPTS.find(x=>x.id===S.promptId);
  const wallet = PORTRAIT.matches ? shortWallet(S.wallet) : S.wallet;
  const hlF = v => `<mark class="hl">${v}</mark>`;
  if(S.caseNo){
    const dec = S.decision ? {approved:"approved", waitlisted:"waitlisted", not_selected:"not selected"}[S.decision] : "pending";
    return `<div class="gov">
      ${govHead()}
      <div class="gtitle">application, filed.</div>
      <div class="gf">
        ${field("alias", hlF(esc(S.alias)))}${field("account", esc(S.handle))}
        ${field("classification", esc(c.name))}${field("filed", fmtStamp(S.filedAt))}
        ${field("mint wallet", hlF(esc(wallet)), "w")}
        ${p ? field(esc(p.t), hlF(esc(S.statement)), "w stmt") : ""}
      </div>
      <div class="office"><span class="l">for office use only</span>${govStamps()}</div>
      <p class="fine">whitelist decision: ${dec}. nothing will happen fast. updates go on the noticeboard.</p>
      ${govFoot(1,1)}
    </div>`;
  }
  const hl = v => `<mark class="hl">${v}</mark>`;
  return `<div class="gov">
    ${govHead()}
    <div class="gtitle">review your case.</div>
    <div class="gf">
      ${field("alias", hl(esc(S.alias)))}${field("account", esc(S.handle))}
      ${field("classification", esc(c.name))}${field("filed", "not yet")}
      ${field("mint wallet", hl(esc(wallet)), "w")}
      ${p ? field(esc(p.t), hl(esc(S.statement)), "w stmt") : ""}
    </div>
    <div class="office"><span class="l">for office use only</span></div>
    <p class="fine">everything here can still be corrected. after filing, it can't. submission does not guarantee a whitelist spot.</p>
    <div class="spacer"></div>
    <div class="row bottom">
      <button class="btn" data-go="file-it">file it</button>
      <button class="btn ghost" data-go="to-result">back</button>
    </div>
    ${govFoot(1,1)}
  </div>`;
}

const PAGES = { personnel:pagePersonnel, alias:pageAlias, signin:pageSignin, interview:pageInterview,
                statement:pageStatement, result:pageResult, file:pageFile };

/* the application tab's face when the department isn't taking forms: a stamped notice, nothing to fill */
function pageNotAccepting(){
  const closed = DEPT === "closed";
  return `<div class="gov">
    ${govHead()}
    <div class="gtitle">${closed ? "applications are closed." : "not yet accepting."}</div>
    <div class="gf">
      ${field("account", esc(S.handle||"—"))}${field("tasks filed", (S.tasks||[]).length)}
      ${field("notice", closed ? "this window has shut. filed cases stay filed. unfiled ones were never cases." : "the forms have not arrived. the tray has, and it has things in it.", "w")}
    </div>
    <div class="office"><span class="l">for office use only</span><span class="gstamp ${closed ? "not_selected" : "pending"}">${closed ? "closed" : "not yet"}</span></div>
    <p class="fine">${closed ? "if applications reopen, this page will say so." : "when applications open, this page becomes a form."}</p>
    <div class="row"><button class="btn ghost" data-go="close-folder">close</button></div>
    ${govFoot(1,1)}
  </div>`;
}

// the one html page sits on the paper wrap, except for the filed case, where it sits on that spread's wrap
function parkPage(onPaper){
  const page = document.getElementById("page"), home = document.getElementById(onPaper ? "f-paper" : "f-filed");
  if(page.parentElement !== home) home.appendChild(page);
}
/* what the folder shows is whatever its one page is set to: the blank page before anything is
   filed, the loose review paper, or the filed case. paintSavedDraft decides which. the prototype
   pages this used to choose between read S.step and S.a1..a3, which nothing fills in here. */
function paint(){
  return paintSavedDraft();
}

/* ---------------- clerk iris follows the mouse ---------------- */
(function(){
  const iris = document.getElementById("room-iris");
  if(!iris || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const MAX_X = 14, MAX_Y = 8;               // px of travel at the screen edges
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  function tick(){
    cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;   // ease toward the target
    iris.style.transform = "translate(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px)";
    if(Math.abs(tx-cx) > 0.05 || Math.abs(ty-cy) > 0.05) raf = requestAnimationFrame(tick); else raf = 0;
  }
  function aim(nx, ny){ tx = nx * MAX_X; ty = ny * MAX_Y; if(!raf) raf = requestAnimationFrame(tick); }
  document.addEventListener("pointermove", e=>{
    if(scene !== "room") return;
    // the clerk sits at the centre of the screen: measure the cursor from there
    aim((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
  });
  document.addEventListener("pointerleave", ()=>aim(0, 0));
})();

/* ---------------- sound ---------------- */
// how loud, 0..100: where the knob sits on the slider (#vol), and the only sound control there is.
// 50 is the mix as tuned - every sound's own level (the vol given to loadSounds) is what plays there;
// above it they all rise together, below they all fall. a media element can't go past 1, so the loud
// ones top out before the knob does
let volume = (()=>{ try{ const v = localStorage.getItem("dof.vol"); return v === null || !isFinite(+v) ? 50 : Math.max(0, Math.min(100, +v)); }catch(e){ return 50; } })();
// the other half: a tap on the knob silences the page without moving it, so the level is still there
// when it comes back. dof.sound is the old on/off switch, read once so nobody who left it off gets a
// surprise
let muted = (()=>{ try{ return localStorage.getItem("dof.mute") === "1" || localStorage.getItem("dof.sound") === "off"; }catch(e){ return false; } })();
// whether the page makes a sound at all: not muted, and the knob off the far left. read first, every
// sound below asks it
let soundOn = !muted && volume > 0;
const volFactor = () => volume / 50;                                  // 0..2, 1 at the middle
const effVol = base => Math.min(1, base * volFactor());               // what a media element with that tuned level plays at now
const ALL_SOUNDS = new Set();
let audioAllowed = false;   // a stored preference is not a gesture in this visit
let audioBackground = !!document.hidden, audioGeneration = 0, continuousReturn = null, audioEffectsAllowed = false;
const SYNTH_VOICES = new Set();
const audioVisible = ()=>!audioBackground && !document.hidden;
const audioCanPlay = ()=>audioVisible() && audioAllowed && soundOn && volume > 0;
function mediaLevel(a){
  a.muted = !audioVisible() || !soundOn || volume === 0 || !!a._routeFailed;
  if(a._mix){
    // The master is applied exactly once. Preserve the old per-voice ceiling at 1.
    const factor = volFactor(), base = factor ? Math.min(a._base, 1 / factor) : a._base;
    a._mix.gain.value = base * (a._level ?? 1); a.volume = 1;
  }else if(a._base != null) a.volume = effVol(a._base) * (a._level ?? 1);
}
function routeSound(a){
  if(a._source || a._routeFailed) return !a._routeFailed;
  const ac = location.protocol === 'file:' ? null : audioCtx();
  if(!ac) return true; // Legacy fallback; zero and mute still use media.muted.
  try{
    const output = master();
    a._mix = ac.createGain();
    // Once bound, an element must never get a second MediaElementAudioSourceNode.
    a._source = ac.createMediaElementSource(a);
    let tail = a._source;
    if(a._throughWall){
      a._wall = ac.createBiquadFilter(); a._wall.type = 'lowpass';
      a._wall.frequency.value = 480; a._wall.Q.value = .8;
      a._envelope = ac.createGain(); a._envelope.gain.value = 0;
      tail.connect(a._wall).connect(a._envelope); tail = a._envelope;
    }
    tail.connect(a._mix).connect(output); mediaLevel(a); return true;
  }catch(_){
    a._routeFailed = true; a.muted = true; a.pause(); return false;
  }
}
/* every sound is an element from the start, but none is fetched until it is about to play: the whole
   set is a couple of megabytes (the bathroom's song alone is most of it), and a visitor who never
   presses anything should not download it. playSound() and the snippets call load() when they need
   the file; the browser fetches it then, once. */
const loadSounds = (srcs, vol)=>srcs.map(src=>{
  const a = new Audio(src); a.preload = "none"; a._base = vol; a._level = 1;
  mediaLevel(a); ALL_SOUNDS.add(a); return a;
});
const fetchSound = a=>{ if(!a._fetched){ a._fetched = true; a.preload = "auto"; try{ a.load(); }catch(e){} } };
function stopSound(a){ a._wanted = ()=>false; a.pause(); }
function playSound(a, wanted = ()=>true){
  a._wanted = wanted;
  if(!audioCanPlay() || (!a.loop && !audioEffectsAllowed) || a._blocked || a._pending || !wanted()) return Promise.resolve(false);
  if(!routeSound(a)) return Promise.resolve(false);
  fetchSound(a);
  a._pending = true;
  const generation=audioGeneration;
  let playing;
  try{ playing = a.play(); }catch(_){ a._blocked = true; a._pending = false; return Promise.resolve(false); }
  return Promise.resolve(playing).then(()=>{
    if(generation!==audioGeneration || !audioCanPlay() || !a._wanted()){ a.pause(); return false; }
    return true;
  }, ()=>{ a._blocked = true; return false; }).finally(()=>{ a._pending = false; });
}
// one door and one bell. the pitch drifts a touch every few presses (see pitcher), so a spammed
// bell isn't the same sample on repeat
const DOOR = loadSounds(["assets/sound/door-1.mp3"], 0.5)[0];   // the department door: in, and out again by the back arrow
const BELL = loadSounds(["assets/sound/bell.mp3"], 0.6)[0];
const BOARD_PAPER = loadSounds(["assets/sound/noticeboard.mp3"], 0.3)[0];        // a sheet rustling when the noticeboard opens
const FOLDER_OPEN = loadSounds(["assets/sound/folder.mp3"], 0.5)[0];             // the folder's cover lifting
const TASKS_OPEN  = loadSounds(["assets/sound/tasks.mp3"], 0.5)[0];              // the task sheet coming off the tray
const REVIEW_PAPER = loadSounds(["assets/sound/review-paper.mp3"], 0.5)[0];      // the interview paper picked up off the desk, and filed
const GALLERY_OPEN = loadSounds(["assets/sound/gallery.mp3"], 0.5)[0];           // the portraits coming off the wall
/* the gallery's step: one decoded buffer played through the site's master, so the knob rules it and
   quick presses can overlap instead of cutting each other off. a run of presses climbs a little in
   pitch, step by step, and a pause lets it fall back; each hit also gets a small random shift, so
   spamming the arrows sounds like a hand on a carousel, not a stuck key. */
const GALLERY_STEP = { src:"assets/sound/gallery-flip.mp3", buf:null, loading:null, run:0, last:0 };
function loadGalleryStep(){
  const ac = audioCtx(); if(!ac || GALLERY_STEP.buf || GALLERY_STEP.loading) return;
  GALLERY_STEP.loading = fetch(GALLERY_STEP.src).then(r=>{ if(!r.ok) throw Error(r.status); return r.arrayBuffer(); })
    .then(b=>new Promise((res, rej)=>{ const p = ac.decodeAudioData(b, res, rej); if(p && p.then) p.then(res, rej); }))
    .then(b=>{ GALLERY_STEP.buf = b; }).catch(()=>{ GALLERY_STEP.loading = null; });
}
function galleryStepSound(){
  if(!audioCanPlay() || !audioEffectsAllowed) return;
  const ac = audioCtx(), out = master(); if(!ac || !out) return;
  if(!GALLERY_STEP.buf){ loadGalleryStep(); return; }   // quiet rather than late; the next press has it
  const now = Date.now();
  GALLERY_STEP.run = now - GALLERY_STEP.last < 450 ? Math.min(GALLERY_STEP.run + 1, 8) : 0;
  GALLERY_STEP.last = now;
  const src = ac.createBufferSource(); src.buffer = GALLERY_STEP.buf;
  if(src.detune) src.detune.value = GALLERY_STEP.run * 45 + (Math.random() * 2 - 1) * 35;   // cents: up the run, plus a wobble
  const g = ac.createGain(); g.gain.value = .55;
  src.connect(g).connect(out); src.start(0);
  src.onended = ()=>{ try{ src.disconnect(); g.disconnect(); }catch(_){} };
}
const SOCIALS_OPEN = loadSounds(["assets/sound/business-cards.mp3"], 0.5)[0];    // the card plucked off the socials plaque, and the user card picked up off the folder
const CARD_FLIP = loadSounds(["assets/sound/swoosh.mp3"], 0.18)[0];               // a card turned over: the user card and the business card. quiet: a card is light
/* the flip: a touch higher turning to the back, a touch lower coming home to the front, and never quite
   the same twice, so turning a card over and over does not sound like one sample on repeat */
let cardFlipRate = 1;
function playCardFlip(toBack = true){
  let r; do{ r = (toBack ? 0.9 : 0.8) + rnd(-0.03, 0.03); }while(Math.abs(r - cardFlipRate) < 0.015);
  cardFlipRate = r; setRate(CARD_FLIP, r);
  CARD_FLIP.currentTime = 0; playSound(CARD_FLIP);
}
function playReviewPaper(){ REVIEW_PAPER.currentTime = 0; playSound(REVIEW_PAPER); }
const pick = list => list[Math.floor(Math.random() * list.length)];
// one audio context for everything synthesised or filtered, made on first use, after a gesture, so
// the browser does not hand back a suspended one
let AC = null;
// a tap on the knob, or the knob dragged to the far left (bottom left, #vol), mutes every media element and closes the master gain
// that all synthesised or filtered sound runs through
function master(){
  const ac = audioCtx(); if(!ac) return null;
  if(!ac._master){ ac._master = ac.createGain(); ac._master.gain.value = soundOn && audioVisible() ? volFactor() : 0; ac._master.connect(ac.destination); }
  return ac._master;
}
function applySound(){
  ALL_SOUNDS.forEach(mediaLevel);
  if(AC && AC._master){ AC._master.gain.cancelScheduledValues(AC.currentTime); AC._master.gain.value = soundOn && audioVisible() ? volFactor() : 0; }
  // .muted is what the css hangs the knob's second face on
  document.getElementById("vol").classList.toggle("muted", !soundOn);
}
function applyVolume(){
  soundOn = !muted && volume > 0;
  applySound();
  const s = document.getElementById("vol");
  if(+s.value !== volume) s.value = volume;
  s.style.setProperty("--v", volume);   // the gradient behind the cut-out bar fills to the knob
  s.title = soundOn ? "volume " + volume + "%" : "sound off - tap the knob";
  s.setAttribute("aria-valuetext", soundOn ? volume + "%" : volume + "%, sound off");
}
const volSave = ()=>{ try{
  localStorage.setItem("dof.vol", String(volume));
  localStorage.setItem("dof.mute", muted ? "1" : "0");
  localStorage.removeItem("dof.sound");   // the old switch, gone for good once either of these is touched
}catch(e){} };
// dragging the knob, or arrowing it, sets the level - and takes the page off mute, since moving it is
// asking to hear something
document.getElementById("vol").addEventListener("input", e=>{
  volume = Math.max(0, Math.min(100, +e.target.value || 0));
  muted = false;
  volSave(); applyVolume(); ambientSync();
  if(bathroomActive && scene === "gate") songOn();
});
/* a tap on the knob itself turns the sound over: the level stays where it is, the face turns and the
   bar goes black. anywhere else on the track is the native jump-to-here, so only a press that starts
   on the knob and ends there, without moving it, counts. the knob is 32 wide and travels the track's
   width less its own, so its left edge is that fraction of the way along */
(()=>{
  const s = document.getElementById("vol"), KNOB = 32;
  const onKnob = e=>{
    const r = s.getBoundingClientRect(); if(!r.width) return false;
    const left = (volume / 100) * (r.width - KNOB);
    const x = e.clientX - r.left;
    return x >= left && x <= left + KNOB;
  };
  const flip = event=>{
    muted = !muted; volSave(); applyVolume();
    if(!muted) allowAudio(event);   // unmuting is the gesture that unblocks playback
    ambientSync();
    if(bathroomActive && scene === "gate") songOn();
  };
  let tap = null;
  s.addEventListener("pointerdown", e=>{ tap = onKnob(e) ? { x:e.clientX, y:e.clientY, v:volume } : null; });
  s.addEventListener("pointercancel", ()=>{ tap = null; });
  s.addEventListener("pointerup", e=>{
    if(!tap) return;
    const still = Math.abs(e.clientX - tap.x) < 4 && Math.abs(e.clientY - tap.y) < 4;
    if(still && volume === tap.v) flip(e);   // a press that moved nothing
    tap = null;
  });
  // and from the keyboard, where the arrows are already the level: space or enter turns it over
  s.addEventListener("keydown", e=>{
    if(e.key !== " " && e.key !== "Enter") return;
    e.preventDefault(); flip(e);
  });
})();
function audioCtx(){
  if(!audioCanPlay()) return null;
  if(!AC){ const Ctx = window.AudioContext || window.webkitAudioContext; if(!Ctx) return null; AC = new Ctx(); }
  return AC;
}
function resumeAudio(onlyContinuous=false){
  const generation=audioGeneration;
  const ac=audioCtx();
  const resume=ac && ac.state !== 'running' && ac.state !== 'closed' ? ac.resume() : Promise.resolve();
  Promise.resolve(resume).then(()=>{
    if(generation!==audioGeneration || !audioVisible()){
      if(ac && !audioVisible()) ac.suspend().catch(()=>{});
      return;
    }
    applySound();
    if(onlyContinuous){
      const prior=continuousReturn; continuousReturn=null;
      if(prior && prior.scene===scene && audioCanPlay()) playSound(prior.player,()=>scene===prior.scene);
    }else ambientSync();
  }).catch(()=>{ if(generation===audioGeneration) audioAllowed=false; });
}
function allowAudio(event){
  if((event && !event.isTrusted) || !audioVisible()) return;
  audioAllowed = true; audioEffectsAllowed=true; continuousReturn=null;
  ALL_SOUNDS.forEach(a=>{ a._blocked = false; });
  resumeAudio(); ambientSync();
  if(bathroomActive && scene === "gate") songOn();
}
function backgroundAudio(){
  if(!audioBackground){
    const player=[AMBIENT,ROOM_AMBIENT].find(a=>!a.paused && audioAllowed && soundOn && volume>0);
    continuousReturn=player?{player,scene}:null;
  }
  audioBackground=true; audioGeneration++; audioAllowed=false; audioEffectsAllowed=false;
  // Immediate gain/mute cutoff before any asynchronous suspension or timer.
  applySound(); ALL_SOUNDS.forEach(stopSound); songOff(true);
  SNIPPETS.forEach(sn=>sn.stop());
  for(const voice of [...BELL_VOICES])voice._release();
  for(const voice of [...SYNTH_VOICES])voice.release();
  if(AC && AC.state !== 'closed') AC.suspend().catch(()=>{});
}
function foregroundAudio(){
  if(document.hidden)return;
  audioBackground=false;
  if(continuousReturn && soundOn && volume>0){audioAllowed=true;resumeAudio(true);}
  // A visible event never restarts one-shots or stale bathroom interaction.
  // If resume is refused, the next real gesture is the only retry.
}
["pointerdown", "keydown"].forEach(ev=>document.addEventListener(ev, allowAudio, true));
document.addEventListener('visibilitychange',()=>document.hidden?backgroundAudio():foregroundAudio());
addEventListener('pagehide',backgroundAudio);
addEventListener('pageshow',foregroundAudio);
const AMBIENT = loadSounds(["assets/sound/ambient-1.mp3"], 0.4)[0]; AMBIENT.loop = true;
const ROOM_AMBIENT = loadSounds(["assets/sound/room-ambient.mp3"], 0.5)[0]; ROOM_AMBIENT.loop = true;
function ambientSync(){
  const want = scene === "gate" ? AMBIENT : scene === "room" ? ROOM_AMBIENT : null;
  [AMBIENT, ROOM_AMBIENT].forEach(a=>{
    if(a === want && audioCanPlay()){ if(a.paused) playSound(a, ()=>soundOn && (a === AMBIENT ? scene === "gate" : scene === "room")); }
    else stopSound(a);
  });
  SNIPPETS.forEach(sn=>audioCanPlay() && sn.where.includes(scene) ? sn.start() : sn.stop());
}
// sounds heard only now and then in a scene: not a whole track but a snippet of it (a few seconds
// from a random point, faded in and out so it never clicks), with a long random wait between, only
// while that scene is up. snippet() makes one such player; each keeps its own timers
const rnd = (a, b) => a + Math.random() * (b - a);
function snippet(src, vol, gap, len, where){
  const a = loadSounds([src], vol)[0]; where = [].concat(where);
  let t = null, fade = null, end = null, generation = 0;
  function fadeTo(target, ms, token, then){
    clearInterval(fade); const from = a._level, steps = 20; let k = 0;
    fade = setInterval(()=>{
      if(token !== generation) return;
      a._level = from + (target - from) * ++k / steps; mediaLevel(a);
      if(k >= steps){ clearInterval(fade); fade = null; if(then) then(); }
    }, ms / steps);
  }
  function start(){ if(t === null && !a._pending && a.paused && !a._blocked) t = setTimeout(play, rnd(gap[0], gap[1]) * 1000); }
  function stop(){
    generation++; clearTimeout(t); clearTimeout(end); clearInterval(fade); t = end = fade = null;
    stopSound(a); a._level = 0; mediaLevel(a);
  }
  function play(){
    t = null; if(!audioCanPlay() || !where.includes(scene)) return;
    const token = ++generation, d = a.duration, n = len ? rnd(len[0], len[1]) : d;
    if(!d || !isFinite(d)){ fetchSound(a); start(); return; }   // not fetched yet: ask for it, and come back after the next gap
    a.currentTime = len ? rnd(0, Math.max(0, d - n)) : 0; a._level = 0; mediaLevel(a);
    playSound(a, ()=>token === generation && where.includes(scene)).then(ok=>{
      if(!ok || token !== generation) return;
      fadeTo(1, 300, token);
      end = setTimeout(()=>fadeTo(0, 400, token, ()=>{ stopSound(a); start(); }), Math.max(0, n - 0.4) * 1000);
    });
  }
  return { start, stop, el:a, where };
}
const SNIPPETS = [
  // the building, heard in the hallway and through the department's walls alike
  snippet("assets/sound/water-drops.mp3",       0.35, [8, 20],  [2, 4], ["gate", "room"]),   // a pipe drips somewhere
  snippet("assets/sound/basement-knocking.mp3", 0.35, [15, 40], [2, 5], ["gate", "room"]),   // and something knocks, below
  snippet("assets/sound/footsteps.mp3",         0.35, [20, 50], [3, 6], ["gate", "room"]),   // and someone walks past, out of sight
  snippet("assets/sound/electric-zap.mp3",      0.35, [25, 75], null,   ["gate", "room"]),   // and the wiring arcs, now and then, the whole zap
  // the room only
  snippet("assets/sound/neon-flicker.mp3",      0.35, [45, 110], [1.5, 4], "room"), // the tube light over the desk misbehaves, but not that often
  snippet("assets/sound/microwave.mp3",         0.35, [40, 90], null,     "room")  // someone's lunch, the whole cycle, in the back office
];
// the music behind the bathroom door: heard only while the mouse rests on the left door of the
// gate, as through a wall: a low-pass takes the top off it and it sits low in the mix, swelling
// in and out as if the door were cracked open and shut. it loops and picks up where it left off.
// (over file:// the browser feeds a media element into the graph as silence, so it plays plain there)
const SONG_VOL = 0.2, SONG_FADE = 0.35;
// the bath-* tracks, played as a run: shuffled once per visit, each one once, then the whole run again. a
// track that ends while the visitor is on the door hands straight over to the next; stepping off pauses it
// where it is, and it picks up there
const DOOR_SONGS = ["alarm", "meme", "metal", "scream", "song", "war", "war2", "yodel"].map(n => `assets/sound/bath-${n}.mp3`);
const DOOR_ORDER = [...DOOR_SONGS];
for(let i = DOOR_ORDER.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [DOOR_ORDER[i], DOOR_ORDER[j]] = [DOOR_ORDER[j], DOOR_ORDER[i]]; }
let doorTrack = 0;
const DOOR_SONG = loadSounds([DOOR_ORDER[0]], SONG_VOL)[0]; DOOR_SONG.loop = false; DOOR_SONG._throughWall = true;
// the next track in the run, from the top. the same element (it stays wired through the wall's filter), a new
// file, fetched only when it is about to play
function setDoorTrack(i){
  doorTrack = (i + DOOR_ORDER.length) % DOOR_ORDER.length;
  DOOR_SONG.src = DOOR_ORDER[doorTrack]; DOOR_SONG._fetched = false; DOOR_SONG.preload = "none";
}
DOOR_SONG.addEventListener("ended", ()=>{
  setDoorTrack(doorTrack + 1);
  if(bathroomActive && scene === "gate") playSound(DOOR_SONG, ()=>bathroomActive && scene === "gate");
});
// someone else has the radio now: coming back out of the room, the bathroom has moved on to the next track
function nextDoorSong(){ stopSound(DOOR_SONG); setDoorTrack(doorTrack + 1); }
let songGain = null, songStopTimer = null, bathroomActive = false;
function songGraph(){
  if(songGain) return songGain;
  routeSound(DOOR_SONG);
  songGain = DOOR_SONG._envelope || null;
  return songGain;
}
function songOn(){
  bathroomActive = scene === "gate";
  clearTimeout(songStopTimer);
  if(!bathroomActive || !audioCanPlay()){ stopSound(DOOR_SONG); return; }
  const g = songGraph();
  playSound(DOOR_SONG, ()=>bathroomActive && scene === "gate");
  if(g){ const t = g.context.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(1, t + SONG_FADE); }
}
function songOff(immediate = false){
  bathroomActive = false; clearTimeout(songStopTimer);
  // Pending play promises must also see that the hover/scene has ended.
  DOOR_SONG._wanted = ()=>false;
  const g = songGain;
  if(g){ const t = g.context.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + (immediate ? 0 : SONG_FADE)); }
  if(!g || immediate) stopSound(DOOR_SONG);
  else songStopTimer = setTimeout(()=>{ if(!bathroomActive) stopSound(DOOR_SONG); }, SONG_FADE * 1000 + 50);
}
// the pitch drift: one sample, played at natural pitch for a few presses (2 to 4), then a step up or
// down of up to 8% (a semitone is about 6%) for the next few, and so on. the rate is set with the
// pitch left free to move (preservesPitch off), so a faster play is a higher one. each sound keeps
// its own counter
function pitcher(){
  let left = Math.floor(rnd(2, 5)), rate = 1;
  return ()=>{ if(left-- <= 0){ let r; do{ r = 1 + rnd(-0.08, 0.08); }while(Math.abs(r - rate) < 0.025); rate = r; left = Math.floor(rnd(2, 5)) - 1; } return rate; };
}
function setRate(a, r){ a.preservesPitch = false; a.mozPreservesPitch = false; a.webkitPreservesPitch = false; a.playbackRate = r; }
const doorPitch = pitcher(), bellPitch = pitcher();
// the department door: on the way in (the door) and on the way out (the back arrow)
function playDoor(){
  setRate(DOOR, doorPitch());
  DOOR.currentTime = 0;
  playSound(DOOR);   // ignore autoplay refusals
}
// Keep overlapping rings, but retire the oldest voice at the cap. Dialogue counting is unchanged.
const BELL_VOICES = new Set(), MAX_BELL_VOICES = 4;
function playBell(){
  const rate = bellPitch();
  if(!audioCanPlay() || !audioEffectsAllowed) return;
  if(BELL_VOICES.size >= MAX_BELL_VOICES) BELL_VOICES.values().next().value._release();
  const a = BELL.cloneNode(); a._base = BELL._base; a._level = 1;
  mediaLevel(a); setRate(a, rate); ALL_SOUNDS.add(a); BELL_VOICES.add(a);
  const release = ()=>{
    stopSound(a); a.removeEventListener("ended", release); a.removeEventListener("error", release);
    ALL_SOUNDS.delete(a); BELL_VOICES.delete(a);
    a._source?.disconnect(); a._mix?.disconnect();
  };
  a._release = release;
  a.addEventListener("ended", release); a.addEventListener("error", release);
  playSound(a, ()=>BELL_VOICES.has(a)).then(ok=>{ if(!ok) release(); });
}

// the clerk's voice: a low, bored square-wave blip for each letter he types (see typeOut)
// the clerk's voice and the vent's: the low, bored square-wave blip
function blip(){
  const AC = audioCtx(); if(!AC || AC.state !== "running" || !audioEffectsAllowed) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = "square"; o.frequency.value = 90 + Math.random()*8;   // low, bored
  g.gain.setValueAtTime(.06, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + .05);
  o.connect(g).connect(master()); o.start(); o.stop(AC.currentTime + .05);
  const voice={release(){try{o.stop();}catch(_){} o.disconnect();g.disconnect();SYNTH_VOICES.delete(voice);}};
  SYNTH_VOICES.add(voice);o.onended=voice.release;
}

// a ring. the first one wakes the clerk up and starts the conversation. every one after that
// interrupts him: he answers the bell, holds it for a moment, then goes back to what he was saying.
function ringBell(){
  playBell();
  if(awaitingBell()){
    clerkTree=null;clearTimeout(clerkTreeTimer);
    S.rung = true; save(); paintDesk();
    setTimeout(()=>{ if(scene === "room" && !folderOpen && !galleryOpen && !noticesOpen && !tasksOpen && !socialsOpen){ dlgRender(); dlgShow(true); if(sceneTrees.idle||officeContent)interject('first'); } }, 350);
    return;
  }
  if(scene !== "room") return;
  if(bubEl.classList.contains("on") && !terminalLine()){ interject(); return; }
  if(folderOpen || galleryOpen || noticesOpen || tasksOpen || socialsOpen) return;
  // a finished line ("the forms arrived", "found you", "suit yourself"...) doesn't repeat: the bell moves him on
  if(["opened","connected","filed","lookaround","idle","nudge","chatr"].includes(S.d) && (S.x || ["lookaround","nudge","chatr"].includes(S.d))){
    S.d = S.x ? "idle" : "brief"; S.b = 0;
  }
  clearTimeout(fadeTimer); dlgRender(); dlgShow(true); interject('repeat');   // he answers the bell on a finished line too (a filed case), with the admin's lines or his own
}

// what the clerk says to a bell that keeps ringing, in order, then at random once he's past caring
const BELL_LINES = [
  "i'm right here.",
  "i heard you the first time.",
  "that's enough of that.",
  "the bell is for getting my attention. you have it.",
  "stop it.",
  "every ring is going in your file.",
  "i'm going to pretend that didn't happen. again."
];
const BELL_POOL = [
  "still here.", "yes.", "no.", "...", "the bell has feelings too, probably.",
  "ring it once more and i'm taking my break.", "this is why the last clerk left.",
  "you are not the first. you are not the worst. you are close."
];
const BELL_HOLD = 2600;   // ms the reply stays up after it's said, before he picks up where he left off
let bellRings = 0, interjection = null;   // interjection: { saved } while a reply is on screen
function interject(event='repeat'){
  const bell=officeContent?.bell?.[event],state=contentAudience();
  const office=bell?.[state]?.length?bell[state]:bell?.all;
  const custom=office||sceneTrees.idle?.bellReactions;
  if(custom&&!custom.length)return;
  if(typing) typing.skip();   // finish whatever he was saying so it can be put back whole
  if(!interjection) interjection = { saved: bubEl.innerHTML, timer: null };
  clearTimeout(interjection.timer);
  bellRings++;
  const line = office?office[(bellRings-1)%office.length]:custom?custom[(bellRings-1)%custom.length].text:bellRings <= BELL_LINES.length ? BELL_LINES[bellRings - 1] : pick(BELL_POOL);
  bubEl.innerHTML = `<div class="bub"><p class="said" data-type="${esc(clerkCase(sceneCopy('idle',line)))}"></p></div>`;
  typeOut(()=>{
    if(!interjection) return;
    interjection.timer = setTimeout(()=>{
      if(!interjection) return;
      bubEl.innerHTML = interjection.saved;   // back to where he left off, already fully said
      interjection = null; bellRings = 0;
    }, BELL_HOLD);
  });
}
// a new line from the conversation replaces any pending reply outright
function clearInterjection(){ if(interjection){ clearTimeout(interjection.timer); interjection = null; } bellRings = 0; }

// the bell rings on press, and shows its pressed art for as long as the pointer is held
(function(){
  const hit = document.getElementById("bell-hit"), room = document.getElementById("s-room");
  if(!hit) return;
  const up = ()=>room.classList.remove("bell-down");
  hit.addEventListener("pointerdown", e=>{
    if(e.button !== 0 && e.pointerType === "mouse") return;
    room.classList.add("bell-down"); ringBell();
    try{ hit.setPointerCapture(e.pointerId); }catch(_){}
  });
  hit.addEventListener("pointerup", e=>{ up(); hit.blur(); });   // a pointer ring must not leave the bell focused (or the next keypress draws its focus ring)
  hit.addEventListener("pointercancel", up);
  hit.addEventListener("lostpointercapture", up);
})();

/* ---------------- gallery ---------------- */
// the designer's portraits (lower case: the live server is case-sensitive); fomie6 retired by owner
const GALLERY = [1, 2, 3, 4, 5, 7].map(i => `assets/gallery/fomie${i}.webp`);
const galleryEl = document.getElementById("gallery");
let galleryOpen = false;

// one fomie at a time on the plate. arrows, keys and swipe move through the list.
const plate = document.getElementById("plate");
let galIdx = 0;
function paintGallery(){
  const N = GALLERY.length;
  galIdx = ((galIdx % N) + N) % N;
  plate.querySelectorAll("img").forEach(i=>i.remove());
  const img = document.createElement("img");
  img.src = encodeURI(GALLERY[galIdx]); img.alt = "fomie #" + (galIdx + 1); img.draggable = false;
  plate.insertBefore(img, plate.querySelector(".glare"));
  // warm the neighbours so flipping is instant
  for(const d of [-1, 1]){ const p = new Image(); p.src = encodeURI(GALLERY[((galIdx + d) % N + N) % N]); }
}
document.getElementById("galPrev").onclick = ()=>{ galIdx--; paintGallery(); galleryStepSound(); };
document.getElementById("galNext").onclick = ()=>{ galIdx++; paintGallery(); galleryStepSound(); };

// swipe on touch
let swX = null;
galleryEl.addEventListener("pointerdown", e=>{ if(e.pointerType !== "mouse") swX = e.clientX; });
galleryEl.addEventListener("pointerup", e=>{
  if(swX === null) return;
  const dx = e.clientX - swX; swX = null;
  if(Math.abs(dx) > 50){ galIdx += dx < 0 ? 1 : -1; paintGallery(); galleryStepSound(); }
});

// tilt + shine: the plate leans toward the cursor, up to MAX_TILT degrees,
// measured from its centre across the viewport. the shine's bright end points
// at the pointer and its strength follows the tilt. eased per frame.
// makeTilt(el, isOn) wires that up for one element and returns a reset; isOn says when to listen.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function makeTilt(el, isOn){
  if(reduceMotion) return ()=>{};
  const MAX_TILT = 10, TILT_EASE = .12;
  let tdx = 0, tdy = 0, cdx = 0, cdy = 0, tiltRaf = null;
  function paintTilt(){
    const st = el.style;
    st.setProperty("--ry", (cdx * MAX_TILT).toFixed(2) + "deg");
    st.setProperty("--rx", (-cdy * MAX_TILT).toFixed(2) + "deg");
    st.setProperty("--ga", (Math.atan2(cdx, -cdy) * 180 / Math.PI).toFixed(1) + "deg");
    st.setProperty("--glare", Math.min(1, Math.hypot(cdx, cdy) * 1.4).toFixed(3));
    st.setProperty("--lx", (-cdx * 2).toFixed(2) + "px");
    st.setProperty("--ly", (-cdy * 2).toFixed(2) + "px");
    st.setProperty("--shx", (-cdx * 36).toFixed(1) + "px");
    st.setProperty("--shy", (30 - cdy * 26).toFixed(1) + "px");
  }
  function tiltTick(){
    cdx += (tdx - cdx) * TILT_EASE;
    cdy += (tdy - cdy) * TILT_EASE;
    paintTilt();
    const settled = Math.abs(tdx - cdx) < .002 && Math.abs(tdy - cdy) < .002;
    tiltRaf = settled ? null : requestAnimationFrame(tiltTick);
  }
  function tiltKick(){ if(!tiltRaf) tiltRaf = requestAnimationFrame(tiltTick); }
  document.addEventListener("mousemove", e=>{
    if(!isOn()) return;
    const r = el.getBoundingClientRect();
    tdx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width/2)) / (window.innerWidth/2)));
    tdy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height/2)) / (window.innerHeight/2)));
    tiltKick();
  });
  return ()=>{ tdx = tdy = cdx = cdy = 0; paintTilt(); };
}
const resetTilt = makeTilt(plate, ()=>galleryOpen);

/* ---------------- the vent ----------------
   the one who got here early. voice only, lowercase, italic. no tooltip, no glow: the cursor
   and a held hover are the only tells. state lives in S.vent; he remembers what you told him. */
S.vent = Object.assign({ met:false, depth:0, seen:{}, btc:null, dropped:false, got:false }, S.vent || {});
const VENT = {
  n0:      { say:"…you can see me?", opts:[["who are you?","n_who"],["what are you doing in there?","n_doing"],["i'm going to back away slowly.","n_bye"]] },
  n_bye:   { say:"most do." },
  n_who:   { say:"a fomie. like you. except earlier.", opts:[["earlier?","n_early"],["ok.","n_ok"]] },
  n_ok:    { say:"ok." },
  n_early: { say:"i got here before the department opened. before the building, technically. position over comfort.", opts:[["how long has it been?","n_long"],["…respect.","n_resp"]] },
  n_resp:  { say:"finally. someone gets it.", opts:[["about the outside…","n_btcq"]] },
  n_long:  { say:"four years. or one bear market. time is soft in here.", opts:[["what do you miss?","n_miss"],["i should go.","n_btcq"]] },
  n_miss:  { say:"windows. and candles. the green ones.", opts:[["…the chart kind?","n_missr"]] },
  n_missr: { say:"obviously.", opts:[["right. of course.","n_btcq"]] },
  n_doing: { say:"waiting. for the mint.", opts:[["the mint isn't announced.","n_ann"],["me too, honestly.","n_metoo"]] },
  n_ann:   { say:"exactly. that's why i'm early.", opts:[["that's not how time works.","n_time"],["fair enough.","n_btcq"]] },
  n_time:  { say:"that's what late people say.", opts:[["…","n_btcq"]] },
  n_metoo: { say:"then you understand. there's room in the other vent. think about it.", opts:[["i won't.","n_wont"],["…maybe.","n_maybe"]] },
  n_wont:  { say:"everyone says that at first.", opts:[["about the outside…","n_btcq"]] },
  n_maybe: { say:"don't rush it. commitment matters.", opts:[["about the outside…","n_btcq"]] },
  n_btcq:  { say:"wait. before you go. what's bitcoin doing out there?", opts:[["up.","n_up"],["down.","n_down"],["sideways.","n_side"],["i'm not telling you.","n_no"]] },
  n_up:    { say:"good. i'm already positioned.", set:{ btc:"up", btcFresh:true } },
  n_down:  { say:"good thing i didn't sell.", set:{ btc:"down", btcFresh:true } },
  n_side:  { say:"so. like me.", set:{ btc:"side" } },
  n_no:    { say:"…noted. the department has trained you well.", set:{ btc:"no" } },
  r_hi:    ()=>{
    let g; do{ g = VENT_GREETS[Math.floor(Math.random()*VENT_GREETS.length)]; }while(g === ventLastGreet && VENT_GREETS.length > 1);
    ventLastGreet = g;
    const pool = [["just checking on you.","r_nice"],["what's new in there?","r_new"],["what do you eat in there?","t_eat"],
                  ["do you know the clerk?","t_clerk"],["what about the bathroom?","t_bath"],
                  ["why a vent?","t_why"],["about the market…","n_btcq"]];
    const opts = [];
    while(opts.length < 3 && pool.length){ opts.push(pool.splice(Math.floor(Math.random()*pool.length), 1)[0]); }
    return { say:g, opts };
  },
  r_nice:  { say:"…that's the nicest thing anyone has done to this wall." },
  r_new:   ()=>{
    const st = S.vent.spider || 0; S.vent.spider = Math.min(st + 1, 4);
    return [
      { say:"a spider moved in. we don't talk.", opts:[["why not?","r_spider"]] },
      { say:"the spider has started charting the wall cracks. amateur stuff. no risk management.", opts:[["maybe he knows something.","r_spider2"]] },
      { say:"the spider left. no note. typical." },
      { say:"…i miss the spider." },
      { say:"nothing is new. that's the whole point of a vent." }
    ][st];
  },
  r_spider:{ say:"he sold in 2022. we have nothing to say to each other." },
  r_spider2:{ say:"he has eight hands and no conviction. i'm not worried." },
  r_up:    { say:"you again. you said up last time. was it true?", opts:[["yes.","r_true"],["i lied.","r_lied"],["it's down now.","r_flip"]] },
  r_down:  { say:"you again. still down out there?", opts:[["yes.","r_still"],["it recovered.","r_rec"]] },
  r_true:  { say:"then we're both rich. in position." },
  r_lied:  { say:"…i respected you. i still do. but differently.", set:{ btc:null } },
  r_flip:  { say:"then i was right to stay in. again.", set:{ btc:"down" } },
  r_still: { say:"good. i can wait. it's the one thing i'm equipped for.", set:{ btc:"down" } },
  r_rec:   { say:"of course it did. the moment i stopped looking.", set:{ btc:"up" } },
  // return-visit topics: the pool r_hi rotates through
  t_eat:   { say:"the vending machine on the other side has a gap. we have an arrangement.", opts:[["that's stealing.","t_eat2"],["smart.","t_eat3"]] },
  t_eat2:  { say:"it's yield." },
  t_eat3:  { say:"survival is a skill issue. i don't have it. i have the gap." },
  t_clerk: { say:"we've never spoken. i know his footsteps though. tired. four out of ten.", opts:[["he seems fine.","t_clerk2"],["should i tell him you're here?","t_clerk3"]] },
  t_clerk2:{ say:"that's the suit talking." },
  t_clerk3:{ say:"he knows. we have an understanding. it's called the wall." },
  t_bath:  { say:"occupied. four years. i respect the commitment.", opts:[["you've never seen them?","t_bath2"]] },
  t_bath2: { say:"no. but the music is consistent. you have to admire a routine." },
  t_why:   { say:"best seat in the building. everything passes through here eventually. air. news. once, a moth.", opts:[["what happened to the moth?","t_why2"]] },
  t_why2:  { say:"he was early too. we understood each other. he left for the lamp. they always do." }
};
// what he opens with on a return visit, when there's no market answer to follow up on
const VENT_GREETS = ["you again.","who's there. …oh. you.","what do you want. wait. don't leave.",
                     "…i heard you coming. the floor is thin.","back so soon? time is soft, ignore that.","shh. quieter. the spider is asleep."];
let ventLastGreet = "";
const ventHit = document.querySelector('[data-hit="vent"]');
const vbubEl = document.getElementById("vbub"), voptsEl = document.getElementById("vopts");
const ventDialog = document.getElementById("vent-dialog");
const ventContent = document.getElementById("vent-content");
// The dialogue must not inherit the hallway's translated/panned coordinate system.
ventContent.append(vbubEl, voptsEl);
const compactReading = () => matchMedia('(max-width:700px), (max-aspect-ratio:1/1), (max-height:600px)').matches;
function readingViewport(){
  const v = window.visualViewport;
  document.documentElement.style.setProperty('--reading-height', (v?.height || innerHeight)+'px');
  document.documentElement.style.setProperty('--reading-top', (v?.offsetTop || 0)+'px');
  document.documentElement.classList.toggle('keyboard-reading', !!v && v.height < innerHeight * .75);
}
readingViewport();
addEventListener('resize', readingViewport);
window.visualViewport?.addEventListener('resize', readingViewport);
window.visualViewport?.addEventListener('scroll', readingViewport);
const vitemEl = document.querySelector(".vitem");
let ventOpen = false, vtimer = null, vcloseT = null;
// nothing is dropped now, and a save from before it was shelved must not leave one lying there

// the quiet tell: hold the hover for a beat and the slats brighten. a pass-through shows nothing.
let ventPeekT = null;
ventHit.addEventListener("mouseenter", ()=>{ ventPeekT = setTimeout(()=>document.getElementById("hi-vent").classList.add("peek"), 1200); });
ventHit.addEventListener("mouseleave", ()=>{ clearTimeout(ventPeekT); document.getElementById("hi-vent").classList.remove("peek"); });

function ventType(txt, done){
  const el = document.getElementById("vsaid");
  clearInterval(vtimer); vtimer = null; el.textContent = ""; txt = clerkCase(txt);
  if(PREFERS_STILL){ el.textContent = txt; done && done(); return; }
  let i = 0;
  vtimer = setInterval(()=>{
    i++; el.textContent = txt.slice(0, i);
    if(i % 3 === 0 && /\S/.test(txt[i-1])) blip();
    if(i >= txt.length){ clearInterval(vtimer); vtimer = null; done && done(); }
  }, 18);
  // a click on the bubble skips to the end
  vbubEl.onclick = ()=>{ if(vtimer){ clearInterval(vtimer); vtimer = null; el.textContent = txt; done && done(); } };
}
function ventGo(id){
  if(ventTree){const index=Number(id);if(!Number.isInteger(index)||!ventTree.choices[index])return;ventTree=ventTree.choices[index].next;return renderVentTree();}
  let n = VENT[id]; if(typeof n === "function") n = n(); if(!n) return closeVent();
  if(!S.vent.seen[id]){ S.vent.seen[id] = 1; S.vent.depth++; }
  if(n.set) Object.assign(S.vent, n.set);
  save();
  clearTimeout(vcloseT); voptsEl.classList.remove("on", "ready"); voptsEl.innerHTML = "";
  ventType(sceneCopy('vent',n.say), ()=>{
    if(n.opts){   // the clerk's answer boxes, lettered like his
      voptsEl.innerHTML = `<div class="choices">${n.opts.map(([t,go],i)=>`<button class="ch" data-vgo="${go}"><span class="k">${"ABCD"[i]}</span><span>${esc(sceneCopy('vent',t))}</span></button>`).join("")}</div>`; caseButtons(voptsEl);
      voptsEl.classList.add("on"); requestAnimationFrame(()=>voptsEl.classList.add("ready"));
    }
    // a terminal line closes the chat itself. he used to hand over a ticket here once you had really
    // talked; that is shelved for now, so nothing is dropped and nothing lands in the corridor.
    else if(!compactReading()) vcloseT = setTimeout(closeVent, 2600);
  });
}
voptsEl.addEventListener("click", e=>{ const b = e.target.closest("[data-vgo]"); if(b) ventGo(b.dataset.vgo); });
function ventEntry(){
  const v = S.vent;
  if(!v.met){ v.met = true; save(); return "n0"; }
  // a fresh market answer earns exactly one follow-up greeting; after that, the normal pool
  if(v.btcFresh && v.btc === "up"){ v.btcFresh = false; save(); return "r_up"; }
  if(v.btcFresh && v.btc === "down"){ v.btcFresh = false; save(); return "r_down"; }
  return "r_hi";
}
function openVent(){
  if(ventOpen) return;
  ventOpen = true; ventDialog.classList.add("on"); vbubEl.classList.add("on");
  ventContent.scrollTop = 0;
  if(sceneTrees.vent){const c=pick(sceneTrees.vent.conversations.filter(eligibleConversation));ventTree=c?structuredClone(c.root):null;if(ventTree)renderVentTree();else closeVent();}
  else ventGo(ventEntry());
}
function renderVentTree(){
  const node=ventTree;clearTimeout(vcloseT);voptsEl.classList.remove('on','ready');voptsEl.innerHTML='';
  ventType(node.text,()=>{if(node!==ventTree||!ventOpen)return;
    if(node.choices.length){voptsEl.innerHTML='<div class="choices">'+node.choices.map((c,i)=>`<button class="ch" data-vgo="${i}"><span class="k">${String.fromCharCode(65+i)}</span><span>${esc(c.text)}</span></button>`).join('')+'</div>';caseButtons(voptsEl);voptsEl.classList.add('on');requestAnimationFrame(()=>voptsEl.classList.add('ready'));}
    else if(!compactReading())vcloseT=setTimeout(closeVent,2600);
  });
}
function closeVent(){
  if(!ventOpen) return;
  ventTree=null;ventOpen = false; ventDialog.classList.remove("on"); clearInterval(vtimer); vtimer = null; clearTimeout(vcloseT);
  vbubEl.classList.remove("on"); voptsEl.classList.remove("on", "ready"); voptsEl.innerHTML = "";
}

/* ---------------- the evidence viewer ----------------
   one object at a time on a tilting plate: kind names it ("receipt": the vent's ticket; "card": the
   department card), and restore, if given, is run when the viewer closes, to put back whatever the
   opener took away (the card hides the folder under it). the receipt and the gallery open over the
   room and take nothing away, so they pass none */
const inspectEl = document.getElementById("inspect");
let inspectOpen = false, inspectKind = null, inspectRestore = null;
const resetITilt = makeTilt(document.getElementById("iplate"), ()=>inspectOpen && inspectKind === "receipt");
const resetCTilt = makeTilt(document.getElementById("cplate"), ()=>inspectOpen && inspectKind === "card");
function openInspect(kind = "receipt", restore = null){
  inspectOpen = true; inspectKind = kind; inspectRestore = restore;
  inspectEl.dataset.kind = kind;
  inspectEl.classList.add("on"); requestAnimationFrame(()=>inspectEl.classList.add("in"));
}
function closeInspect(){
  if(!inspectOpen) return;
  inspectOpen = false; resetITilt(); resetCTilt();
  inspectEl.classList.remove("in");
  const back = inspectRestore; inspectRestore = null;
  if(back) back();   // at once, under the fade: the folder is simply there again
  if(inspectKind === "card"){ flyCardBack(); return; }   // the card goes back into its slot, then the viewer goes
  setTimeout(()=>{ if(!inspectOpen) inspectEl.classList.remove("on"); }, 260);
}
// the vent's receipt: picking it up ends the whisper and is remembered
function openReceipt(){
  closeVent(); S.vent.got = true; save();
  if(isPortrait()){ gateStop = GATE_HOME; placeGate(); }
  openInspect("receipt");
  // Cosmetic reading only. No badge, interview access or reward is delivered.
}
document.getElementById('vent-close').addEventListener('click', closeVent);
document.getElementById("insp-close").addEventListener("click", closeInspect);
// anywhere off the object and its buttons closes the viewer (and puts back what it covered)
inspectEl.addEventListener("click", e=>{ if(!e.target.closest(".plate, #acard-acts, .gal-close")) closeInspect(); });
addEventListener("keydown", e=>{ if(e.key === "Escape"){ if(inspectOpen) closeInspect(); else if(ventOpen) closeVent(); } });

function openGallery(){
  GALLERY_OPEN.currentTime = 0; playSound(GALLERY_OPEN); loadGalleryStep();   // the step's buffer comes in with the pictures, so the first press is not the silent one
  galleryOpen = true; dlgShow(false); galleryEl.classList.add("on");
  paintGallery();
  requestAnimationFrame(()=>galleryEl.classList.add("in"));
}
function closeGallery(){
  galleryOpen = false; resetTilt(); if(scene === "room") dlgShow(true); galleryEl.classList.remove("in");
  setTimeout(()=>{ if(!galleryOpen) galleryEl.classList.remove("on"); }, 300);
}
// a click on the dark backdrop (not on the carousel or the controls) closes the gallery
galleryEl.addEventListener("click", e=>{ if(e.target === galleryEl) closeGallery(); });
document.getElementById("gal-close").addEventListener("click", closeGallery);
// the mobile close buttons on the other overlays
document.querySelectorAll(".ov-close[data-ovclose]").forEach(b=>b.addEventListener("click", e=>{
  e.stopPropagation();
  ({ folder:closeFolder, notices:closeNotices, tasks:closeTasks, socials:closeSocials, menu:closeMenu, disclaimer:closeDisclaimer })[b.dataset.ovclose]();
}));

/* ---------------- noticeboard ----------------
   announcements are text, never art. newest at the top. each has a kind that picks
   the paper tint: mint (butter, the permanent one), review (lilac), notice (mint green),
   general (paper). the board on the wall glows while there's anything posted since
   the person last opened it. */
const NOTICES = [];
let noticeState = 'loading';
/* the paper art, keyed "size-colour" after the file names in assets/noticeboard: m is the short
   sheet, l the tall one for wordy notices. a notice picks its size by how much body text it has
   (or names one with size:"m"|"l"). colours are dealt out evenly: the sheets of each size are cycled
   in NOTE_CYCLE order down the board, so no colour is used much more than another (a notice can
   still name one with color:"green"). a colour that has no sheet in that size falls back to the
   first sheet of that size. to add art, drop the png in, add a row here and put the colour in the
   cycle; w and h are its pixel size, for the aspect ratio. */
const NOTE_ART = {
  "m-yellow": { src:"assets/noticeboard/m-note-yellow.webp", w:1040, h:484 },
  "m-green":  { src:"assets/noticeboard/m-note-green.webp",  w:1040, h:484 },
  "m-orange": { src:"assets/noticeboard/m-note-orange.webp", w:1040, h:484 },
  "l-purple": { src:"assets/noticeboard/l-note-purple.webp", w:1040, h:752 },
  "l-blue":   { src:"assets/noticeboard/l-note-blue.webp",   w:1040, h:752 },
  "l-green":  { src:"assets/noticeboard/l-note-green.webp",  w:1040, h:752 }
};
const NOTE_CYCLE = { m:["yellow","green","orange"], l:["purple","blue","green"] };
const NOTE_LONG = 200;      // body characters past which a notice goes on the large sheet
const noteSize = n => n.size || (n.body.join(" ").length > NOTE_LONG ? "l" : "m");
function noteArt(n, nth){   // nth: how many notices of this size sit above it on the board
  if(n.paperStyle){ const m = n.paperStyle.mobile;   // the server names the sizes width/height; the board uses w/h
    return {src:n.paperStyle.src,w:n.paperStyle.width,h:n.paperStyle.height,mobile:m ? {src:m.src, w:m.width ?? m.w, h:m.height ?? m.h} : null}; }
  const size = noteSize(n);
  const cycle = NOTE_CYCLE[size] || ["yellow"];
  const color = n.color || cycle[(nth||0) % cycle.length];
  const sameSize = Object.keys(NOTE_ART).filter(k => k.startsWith(size + "-"));
  return NOTE_ART[size + "-" + color] || NOTE_ART[sameSize[0]] || NOTE_ART[Object.keys(NOTE_ART)[0]];
}
const noticesEl = document.getElementById("notices");
let noticesOpen = false;
const latestNotice = () => NOTICES.reduce((m,n)=>Math.max(m, n.publishedAt), 0);
const boardHasNew = () => latestNotice() > (S.boardSeen||0);
function paintBoardGlow(){ document.getElementById("hi-board").classList.toggle("fresh", boardHasNew()); }
function fmtDate(iso){ return new Date(iso+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}).toLowerCase(); }
let noticesSeenAtOpen = 0;   // what "new" means for this viewing: anything since the board was last opened, held while it is up
/* a sheet's drawing is laid on as three slices: the torn top and bottom edges, each this fraction of the
   drawing's height, keep their shape at any length of text; only the flat middle stretches when the text runs
   longer than the paper. text shorter than the paper leaves paper below it. */
const NOTE_CAP = 0.28;
function paintNotices(){
  const seen = noticesOpen ? noticesSeenAtOpen : (S.boardSeen||0);
  const list = [...NOTICES];
  const seenSize = {};
  document.getElementById("notes-col").innerHTML =
    `<div class="notes-head">${noticeState==='loading'?'noticeboard · loading announcements':noticeState==='error'?'noticeboard · temporarily unavailable. close and reopen to retry.':NOTICES.length?'noticeboard':'noticeboard · no announcements yet'}</div>` +
    list.map((n,i)=>{
      const isNew = n.publishedAt > seen;
      // a little seeded scatter so it reads as pinned by hand, stable across opens
      const rot = ((i*7)%5 - 2) * 0.7, off = ((i*11)%3 - 1) * 14;
      const sz = noteSize(n), nth = seenSize[sz] || 0; seenSize[sz] = nth + 1;
      const art = noteArt(n, nth);
      return `<article class="note ${isNew?"new":""} ${art.mobile?'has-mobile':''}" style="--rot:${rot}deg;--off:${off}px;--in:${i*NOTE_STAGGER}ms;--ar:${art.w}/${art.h};--arm:${art.mobile?art.mobile.w+'/'+art.mobile.h:art.w+'/'+art.h};aspect-ratio:var(--ar)">
        <div class="n-art n-art-desktop" style="--paper:url('${esc(art.src)}');--cap:${(NOTE_CAP*art.h/art.w).toFixed(4)}" data-src="${esc(art.src)}"></div>
        ${isNew?`<img class="n-new" src="assets/noticeboard/new-announcement.png" alt="new" draggable="false">`:''}
        ${art.mobile?`<div class="n-art n-art-mobile" style="--paper:url('${esc(art.mobile.src)}');--cap:${(NOTE_CAP*art.mobile.h/art.mobile.w).toFixed(4)}" data-src="${esc(art.mobile.src)}"></div>`:''}
        <div class="n-date"><span>${fmtDate(n.date)}</span><span class="tag">${esc(n.kind)}</span></div>
        <h3 class="n-title">${NoticeFormat.text(n.title)}</h3>
        ${n.body.map(p=>`<p class="n-body">${NoticeFormat.text(p)}</p>`).join("")}
        ${NoticeFormat.links(n.links)}
      </article>`;
    }).join("") +
    `<div class="notes-end">older notices fall off. the department does not keep records. it keeps a department.</div>`;
}
let noticeLoading = null;
// what is on the board, as one string: a re-read that brings back the same feed repaints nothing, so an
// open board is not rebuilt (and its notes' entrance not restarted) every time the feed is checked
const noticeSig = () => noticeState + "|" + NOTICES.map(n => [n.publishedAt, n.kind, n.title, ...n.body, JSON.stringify(n.links||[])].join("\u0001")).join("\u0002");
/* the notes' paper art, loaded once and held for the page's life. the board is rebuilt on every opening and
   each rebuild asks for its art again: held here, it is already decoded, so no note shows blank for a moment,
   on the first opening or where the files are not cached. only the art this screen draws, and only once in
   the room, where the board is (enterRoom, and a feed that changes while there) */
const noticeArtHeld = new Map();
function holdNoticeArt(){
  const seen = {}, want = [];
  for(const n of NOTICES){
    const sz = noteSize(n), nth = seen[sz] || 0; seen[sz] = nth + 1;   // the same paper choice paintNotices makes
    const a = noteArt(n, nth); want.push(PORTRAIT.matches && a.mobile ? a.mobile.src : a.src);
  }
  if(NOTICES.some(n => n.publishedAt > (S.boardSeen||0))) want.push("assets/noticeboard/new-announcement.png");
  for(const src of want) if(src && !noticeArtHeld.has(src)){ const i = new Image(); i.decoding = "async"; i.src = src; noticeArtHeld.set(src, i); }
}
function loadNotices(){
 if(noticeLoading)return noticeLoading;
 const before = noticeSig();
 noticeLoading=API.notices().then(result=>{
  NOTICES.splice(0,NOTICES.length,...result.announcements.map(n=>{
   const lines=n.text.split('\n');return {publishedAt:n.published_at*1000,date:new Date(n.published_at*1000).toISOString().slice(0,10),kind:n.labelText||n.label,paperStyle:n.paperStyle,links:n.links,title:lines.shift(),body:lines.filter(Boolean),size:n.paper[0],color:n.paper.slice(2)};
  }));noticeState='ready';paintBoardGlow();if(scene==='room')holdNoticeArt();
 }).catch(()=>{noticeState='error';NOTICES.length=0;paintBoardGlow();}).finally(()=>{noticeLoading=null;if(noticesOpen&&noticeSig()!==before){paintNotices();fitNotes();seatFirstNote();paintNoteScale();}});
 return noticeLoading;
}
loadNotices();
// a notice posted while the page is open: the feed is read again when the tab comes back, and every
// few minutes while it is up, so the board starts glowing without a reload
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) loadNotices(); });
// the tray, on the way back from x: a follow or a post made there is read again, and a check button whose
// cooldown ran out while the tab was away is enabled again (its state is only read when the tray is painted)
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden && tasksOpen && !taskUI.busy) loadSavedTasks(); });
setInterval(()=>{ if(!document.hidden) loadNotices(); }, 5 * 60 * 1000);
function openNotices(){
  noticesSeenAtOpen = S.boardSeen||0;   // the stickers show for this viewing; the next opening starts from now
  loadNotices();
  BOARD_PAPER.currentTime = 0; playSound(BOARD_PAPER);
  noticesOpen = true; dlgShow(false);
  paintNotices();
  noticesEl.classList.add("on"); noticesEl.scrollTop = 0;
  requestAnimationFrame(()=>{ noticesEl.classList.add("in"); fitNotes(); seatFirstNote(); paintNoteScale(); });
  // opening the board is seeing it. the "new" tags stay for this viewing, the glow goes.
  S.boardSeen = Date.now(); save(); paintBoardGlow();
  try{ localStorage.setItem("dof.boardSeen", String(S.boardSeen)); }catch(e){}
}
function closeNotices(){
  noticesOpen = false; if(scene === "room") dlgShow(true); noticesEl.classList.remove("in");
  setTimeout(()=>{ if(!noticesOpen) noticesEl.classList.remove("on"); }, 300);
}
noticesEl.addEventListener("click", e=>{ if(!e.target.closest(".note")) closeNotices(); });

// notes are full size on the focus line, a little above the centre of the screen, and shrink as
// they move toward the top or bottom edge. recomputed on scroll, one frame at a time.
const NOTE_FOCUS = 0.42;                   // the focus line, as a fraction of the viewport height from the top
const NOTE_MIN = 0.6, NOTE_REACH = 0.85;   // smallest scale, and how far (in half-viewports) it takes to get there
const NOTE_BLUR = 3.5;                     // px of blur on a note at the reach; the centre note stays sharp
const NOTE_FADE = 0.55;                    // how much opacity a note loses at the reach
const NOTE_STAGGER = 70;                   // ms between one note taking off and the next, top to bottom
let notesRaf = null;
function paintNoteScale(){
  notesRaf = null;
  if(compactReading()){
    noticesEl.querySelectorAll('.note').forEach(n=>{ n.style.removeProperty('filter'); n.style.setProperty('--sc','1'); n.style.setProperty('--alpha','1'); });
    return;
  }
  const vh = noticesEl.clientHeight, mid = vh * NOTE_FOCUS;
  noticesEl.querySelectorAll(".note").forEach(n=>{
    // measured from layout, not the rendered box: the notes move while they fly in and scale
    const centre = n.offsetTop + n.offsetHeight/2 - noticesEl.scrollTop;
    const d = Math.abs(centre - mid) / (vh / 2 * NOTE_REACH);   // 0 on the focus line, 1 at the reach
    const t = Math.min(1, d);
    const sc = 1 - (1 - NOTE_MIN) * (t * t);                       // ease-in so the centre stays flat
    n.style.setProperty("--sc", sc.toFixed(3));
    const blur = NOTE_BLUR * t * t;
    n.style.filter = blur > .05 ? "blur(" + blur.toFixed(2) + "px)" : "";
    n.style.setProperty("--alpha", (1 - NOTE_FADE * t * t).toFixed(3));
  });
}
// Keep the requested readable type sizes. Preview long text with a suitable paper asset.
function fitNotes(){
  noticesEl.querySelectorAll(".note").forEach(n=>n.style.setProperty('--fs','1'));
}
// pad the top of the column so the newest note, the last announcement, opens centred on the focus line
function seatFirstNote(){
  const col = document.getElementById("notes-col"), first = col.querySelector(".note");
  if(!first) return;
  if(compactReading()){ col.style.removeProperty('padding-top'); return; }
  const keep = noticesEl.scrollTop;   // a resize mid-read keeps its place
  col.style.paddingTop = "0px"; noticesEl.scrollTop = 0;
  const top = first.offsetTop - col.offsetTop;   // head + gap above it (layout, so the fly-in doesn't skew it)
  col.style.paddingTop = Math.max(0, noticesEl.clientHeight * NOTE_FOCUS - first.offsetHeight / 2 - top) + "px";
  noticesEl.scrollTop = keep;
}
function noteScaleKick(){ if(!notesRaf) notesRaf = requestAnimationFrame(paintNoteScale); }
noticesEl.addEventListener("scroll", noteScaleKick, { passive:true });
window.addEventListener("resize", ()=>{ if(noticesOpen){ fitNotes(); seatFirstNote(); noteScaleKick(); } });
// the display face can land after the board is open: re-fit once it does, since the titles change width
if(document.fonts) document.fonts.ready.then(()=>{ if(noticesOpen){ fitNotes(); seatFirstNote(); noteScaleKick(); } });

/* ---------------- tasks ---------------- */
// the clipboard's checklist. completion is self-reported: "open" takes you there and ticks the row.
const X_HANDLE = "FomiesNFT";   // the department's account: the share copy, the follow task and every x link below
const X_POST = `https://x.com/${X_HANDLE}`;   // the pinned post: swap in the status url when there is one
const TASKS = [
  { id:"follow",  t:`follow @${X_HANDLE} on x`,                 url:`https://x.com/intent/follow?screen_name=${X_HANDLE}` },
  { id:"like",    t:"like the pinned post",                     url:X_POST },
  { id:"repost",  t:"repost the pinned post",                   url:X_POST },
  { id:"reply",   t:"reply to the pinned post with your alias", url:X_POST },
  { id:"bell",    t:"turn on notifications for the account",    url:`https://x.com/${X_HANDLE}` },
  { id:"bookmark",t:"bookmark the pinned post",                  url:X_POST },
  { id:"quote",   t:"quote the pinned post with why you deserve in", url:X_POST },
  { id:"tag",     t:"tag two people who also deserve in",        url:X_POST },
  { id:"recent",  t:"like the three most recent posts",         url:`https://x.com/${X_HANDLE}` },
  { id:"casefile",t:"post a screenshot of your case file",       url:"https://x.com/compose/post" },
  { id:"banner",  t:"put a fomie in your profile picture",       url:"https://x.com/settings/profile" },
  { id:"discord", t:"join the discord",                         url:"https://discord.gg/fomies" },
  { id:"intro",   t:"introduce yourself in the discord",        url:"https://discord.gg/fomies" },
  { id:"lurk",    t:"lurk for a week. this one is honour-based.", url:`https://x.com/${X_HANDLE}` }
];
const tasksEl = document.getElementById("tasks");
let tasksOpen = false;
const taskDone = id => (S.tasks||[]).includes(id);
// how the department describes someone with n tasks filed
const standing = () => { const n = (S.tasks||[]).length; return n===0?"none":n<3?"noted":n<6?"persistent":n<10?"conspicuous":"a problem"; };
function setTask(id, on){
  const set = new Set(S.tasks||[]); on ? set.add(id) : set.delete(id);
  S.tasks = [...set]; save(); setFolderState(); paintTasks();
}
// portrait: the clipboard page is too small for the header and the list together, so it becomes two
// pages: the file (who you are, standing, fine print) and the list (rows only, compact)
const PORTRAIT = matchMedia("(max-aspect-ratio: 1/1)");
// the papers are written differently for a phone (the wallets shortened, side by side): when the window
// turns, whichever paper is up is written again for the shape it is now in
PORTRAIT.addEventListener("change", ()=>{ if(folderOpen && interviewUI.open && !interviewUI.busy){ reviewPaperUp() ? renderPaper() : renderSavedInterview(); } });

/* ---------------- idle: the lost-user system ----------------
   tier 1 (~25s): the clickable things pulse once, staggered, a quiet tour for the eye.
   tier 2 (~75s): the clerk speaks -- a state-aware nudge first, small talk on later cycles.
   any interaction re-arms everything; nothing fires over an open folder, overlay or dialogue;
   after the clerk has spoken once per quiet spell he goes quiet, and pulses back off to ~2min. */
const IDLE_PULSE_MS = 25000, IDLE_TALK_MS = 75000, IDLE_REPULSE_MS = 120000;
let idleLastAct = Date.now(), idleTalked = false, idleLastPulse = 0, idleLastLine = "";
["pointerdown","keydown","wheel","touchstart"].forEach(ev =>
  addEventListener(ev, ()=>{ idleLastAct = Date.now(); idleTalked = false; }, { passive:true }));
/* presence: a pointer moving, a key, a scroll, a touch. the idle clock above counts only presses, so a reader who is
   looking but not clicking still hears from him; but a line he says to someone who has gone quiet may be said to an
   empty chair, so its reading time waits until they are back (whenPresent), and is a proper read (chatterRead) */
let lastPresence = Date.now();
const presenceWaiters = [];
["pointermove","pointerdown","keydown","wheel","touchstart"].forEach(ev =>
  addEventListener(ev, ()=>{ lastPresence = Date.now(); if(presenceWaiters.length) presenceWaiters.splice(0).forEach(f=>f()); }, { passive:true }));
function whenPresent(fn){ if(Date.now() - lastPresence < 2500) fn(); else presenceWaiters.push(fn); }
const chatterRead = n => Math.max(6000, 2500 + n * 60);   // ms a line of his small talk stays up once it can be read

const CHATS = {
  weather: { q:"nice weather today.", opts:[
    { t:"is it?",                  r:"no." },
    { t:"you don't have windows.", r:"the department finds them distracting." },
    { t:"sure.",                   r:"noted." } ] },
  pipes: { q:"the pipes have been quiet lately. i don't trust it.", opts:[
    { t:"they're just pipes.",  r:"that's what they want you to think." },
    { t:"should i be worried?", r:"no. worrying is my job. it's on the desk somewhere." } ] }
};

function idleNudgeLine(){
  if(dept() !== "open") return officeLine('idle_closed',"the department is closed. the staff wall isn't. neither is the collection.");
  if(!S.x)            return officeLine('idle_signed_out',"the application starts with the sign-in. the department will wait. it's good at that.");
  if(S.caseNo)        return officeLine('idle_filed',"your case is filed. the noticeboard moves before i do.");
  if(S.d === "review" || hasReview()) return officeLine('idle_review',"the paper on the desk is your case. it reads faster than it looks.");
  return officeLine('idle_draft',"the folder on the desk is yours. that's why it has your name in it.");
}
function idleBusy(){
  if(sceneTrees.idle)return folderOpen||galleryOpen||noticesOpen||tasksOpen||socialsOpen||menuOpen||inspectOpen||typing!==null||!!clerkTree||!!dlgEl.querySelector('input,textarea');
  return folderOpen || galleryOpen || noticesOpen || tasksOpen || socialsOpen || menuOpen || inspectOpen ||
         typing !== null || dlgEl.classList.contains("on") || bubEl.classList.contains("on");
}
function idlePulse(){
  if(PREFERS_STILL) return;
  const ids = ["hi-bell","hi-tasks","hi-folder-1","hi-folder-2","hi-folder-3","hi-folder-4",
               "hi-review","hi-board","hi-gallery","hi-socials","hi-menu"];   // not the back arrow: it never glows
  const els = ids.map(id=>document.getElementById(id))
    .filter(el=>el && el.offsetParent !== null && getComputedStyle(el).display !== "none");
  els.slice(0,5).forEach((el,i)=>setTimeout(()=>{
    el.classList.add("idleping");
    setTimeout(()=>el.classList.remove("idleping"), 1400);
  }, i*500));
}
function idleSpeak(){
  if(sceneTrees.idle){const c=pick(sceneTrees.idle.conversations.filter(eligibleConversation));if(c){clerkTree=structuredClone(c.root);S.b=0;renderClerkTree();}return;}
  let line, next;
  if(!S.idleNudged || !S.x){ line = idleNudgeLine(); next = ()=>{ S.nudgeLine = line; S.idleNudged = true; S.d = "nudge"; }; }
  else{
    const keys = Object.keys(CHATS).filter(k=>CHATS[k].q !== idleLastLine);
    const k = keys[Math.floor(Math.random()*keys.length)] || "weather";
    line = CHATS[k].q; next = ()=>{ S.chatId = k; S.d = "chat"; };
  }
  if(line === idleLastLine) return;   // never the same line twice in a row
  idleLastLine = line; next(); S.b = 0; save(); dlgRender(); dlgShow(true);
}
setInterval(()=>{
  if(document.hidden || scene !== "room" || interviewUI.open || testPreview || identityBusy || idleBusy()) return;
  const idle = Date.now() - idleLastAct;
  if(idle >= IDLE_TALK_MS && !idleTalked && (sceneTrees.idle||!awaitingBell())){ idleTalked = true; idleSpeak(); }
  else if(idle >= IDLE_PULSE_MS && Date.now() - idleLastPulse >= (idleLastPulse ? IDLE_REPULSE_MS : 0)){
    idleLastPulse = Date.now(); idlePulse();
  }
}, 5000);
let tasksView = "intro";
function paintTasks(){
  return paintTaskPreview();
  const page = document.getElementById("tasks-page");
  const keep = page.querySelector(".task-list")?.scrollTop || 0;   // a tick shouldn't jump the list
  if(PORTRAIT.matches && tasksView === "intro"){
    page.innerHTML = `
      <div class="h">outstanding tasks.</div>
      <p class="sub"><strong>${esc(S.handle||"—")}</strong><br>${(S.tasks||[]).length} of ${TASKS.length} filed · standing: ${standing()}${DEPT === "closed" ? "<br>applications closed" : ""}</p>
      <p class="sub">the department requires proof of enthusiasm before it considers anyone.</p>
      <div class="spacer"></div>
      <button class="btn tlist-go" data-tview="list">open tasks</button>
      <p class="fine">completion is self-reported. the department is not naive, merely tired.</p>`;
    return;
  }
  if(PORTRAIT.matches){
    page.innerHTML = `
      <div class="trow"><button class="btn ghost tback" data-tview="intro">‹ back</button><span class="tcount">${(S.tasks||[]).length}/${TASKS.length}</span></div>
      <div class="task-scroll"><div class="task-list compact">${TASKS.map(t=>`
        <div class="task${taskDone(t.id)?" done":""}">
          <button class="tick" data-task="${t.id}" aria-label="${taskDone(t.id)?"mark not done":"mark done"}" aria-pressed="${taskDone(t.id)}"></button>
          <span class="what">${esc(t.t)}</span>
          <a class="go arrow" data-task-go="${t.id}" href="${t.url}" target="_blank" rel="noopener" aria-label="open"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg></a>
        </div>`).join("")}
      </div></div>`;
    page.querySelector(".task-list").scrollTop = keep;
    return;
  }
  page.innerHTML = `
    <div class="h">outstanding tasks.</div>
    <p class="sub"><strong>${esc(S.handle||"—")}</strong> · ${(S.tasks||[]).length} of ${TASKS.length} filed · standing: ${standing()}${DEPT === "closed" ? " · applications closed" : ""}</p>
    <p class="sub">the department requires proof of enthusiasm before it considers anyone.</p>
    <div class="task-scroll"><div class="task-list">${TASKS.map(t=>`
      <div class="task${taskDone(t.id)?" done":""}">
        <button class="tick" data-task="${t.id}" aria-label="${taskDone(t.id)?"mark not done":"mark done"}" aria-pressed="${taskDone(t.id)}"></button>
        <span class="what">${esc(t.t)}</span>
        <a class="btn ghost go" data-task-go="${t.id}" href="${t.url}" target="_blank" rel="noopener">open ↗</a>
      </div>`).join("")}
    </div></div>
    <p class="fine">completion is self-reported. the department is not naive, merely tired.</p>`;
  page.querySelector(".task-list").scrollTop = keep;
}
function openTasks(){
  if(!savedDraft()) return;
  TASKS_OPEN.currentTime = 0; playSound(TASKS_OPEN);
  tasksView = "intro";
  if(!S.trayOpened){ S.trayOpened = true; save(); paintDesk(); if(S.d === "connected" && DEPT !== "open") S.d = "idle"; }
  tasksOpen = true; dlgShow(false); tasksEl.classList.add("on");
  paintTasks();loadSavedTasks();
  requestAnimationFrame(()=>tasksEl.classList.add("in"));
}
function closeTasks(){
  tasksOpen = false; if(scene === "room" && !terminalLine()) dlgShow(true); tasksEl.classList.remove("in");
  setTimeout(()=>{ if(!tasksOpen) tasksEl.classList.remove("on"); }, 300);
}
// a click anywhere outside the clipboard art closes the sheet
tasksEl.addEventListener("click", e=>{
  const tick = e.target.closest("[data-task]");
  if(tick){ setTask(tick.dataset.task, !taskDone(tick.dataset.task)); return; }
  const go = e.target.closest("[data-task-go]");
  if(go){ setTask(go.dataset.taskGo, true); return; }   // the link opens in a new tab on its own
  const tv = e.target.closest("[data-tview]");
  if(tv){ tasksView = tv.dataset.tview; paintTasks(); return; }
  if(e.target.closest("#tasks-page")) return;
  const f = document.getElementById("tw").getBoundingClientRect(), a = CFG.tasksArea;
  const px = (e.clientX - f.left) / f.width * 100, py = (e.clientY - f.top) / f.height * 100;
  const inside = px >= a.x && px <= a.x + a.w && py >= a.y && py <= a.y + a.h;
  if(!inside) closeTasks();
});

/* ---------------- socials ---------------- */
// the department's plaque with a button per channel. the links are set from the handles here.
const TG_HANDLE = "fomiesofficial";
const socialsEl = document.getElementById("socials");
let socialsOpen = false;
for(const id of ["soc-x", "soc-x2"]) document.getElementById(id).href = `https://x.com/${X_HANDLE}`;     // both faces link
for(const id of ["soc-tg", "soc-tg2"]) document.getElementById(id).href = `https://t.me/${TG_HANDLE}`;

/* ---------------- mobile menu ---------------- */
const menuEl = document.getElementById("menu");
let menuOpen = false;
function openMenu(){
  menuEl.querySelector('[data-menu="tasks"]').disabled = !savedDraft();
  menuOpen = true; dlgShow(false); menuEl.classList.add("on");
  requestAnimationFrame(()=>menuEl.classList.add("in"));
}
/* the disclaimer: the framed picture in the hallway. it glows from the moment the wordmark goes until it has
   been opened once (kept in this browser), and opens a sheet of text with a close button top right. */
const disclaimerEl = document.getElementById("disclaimer");
let disclaimerOpen = false;
const disclaimerSeen = () => { try{ return localStorage.getItem("dof.disclaimerSeen") === "1"; }catch(e){ return false; } };
function paintFrameGlow(){ document.getElementById("s-gate").classList.toggle("frame-attract", !disclaimerSeen()); }
document.addEventListener("intro-done", paintFrameGlow);
if(!document.getElementById("intro")) paintFrameGlow();   // no wordmark on this load: glow from the start
function openDisclaimer(){
  disclaimerOpen = true; disclaimerEl.scrollTop = 0; disclaimerEl.classList.add("on");
  requestAnimationFrame(()=>disclaimerEl.classList.add("in"));
  try{ localStorage.setItem("dof.disclaimerSeen", "1"); }catch(e){}
  paintFrameGlow();
  disclaimerEl.querySelector(".ov-close").focus({ preventScroll:true });
}
function closeDisclaimer(){
  disclaimerOpen = false; disclaimerEl.classList.remove("in");
  setTimeout(()=>{ if(!disclaimerOpen) disclaimerEl.classList.remove("on"); }, 300);
  document.querySelector('#s-gate .hit.frame')?.focus({ preventScroll:true });
}
disclaimerEl.addEventListener("click", e=>{ if(!e.target.closest(".disc, .ov-close")) closeDisclaimer(); });   // the backdrop closes it

// handing on to another overlay skips the clerk's line, which that overlay hides again anyway
function closeMenu(handOn){
  menuOpen = false; if(scene === "room" && !handOn) dlgShow(true); menuEl.classList.remove("in");
  setTimeout(()=>{ if(!menuOpen) menuEl.classList.remove("on"); }, 300);
}
// an item closes the sheet and opens that piece; the backdrop just closes it; the socials are links
menuEl.addEventListener("click", e=>{
  const it = e.target.closest("[data-menu]");
  if(it){ closeMenu(true); ({ tasks:openTasks, board:openNotices, gallery:openGallery })[it.dataset.menu](); return; }
  if(!e.target.closest(".msoc, .ov-close")) closeMenu();
});
document.getElementById("menu-x").href  = `https://x.com/${X_HANDLE}`;
document.getElementById("menu-tg").href = `https://t.me/${TG_HANDLE}`;
const socCard = document.getElementById("soc-card");
const resetSocTilt = makeTilt(document.getElementById("sw"), ()=>socialsOpen);
function flipSocials(){
  playCardFlip(!socCard.classList.contains("flipped"));
  const on = socCard.classList.toggle("flipped");
  socCard.setAttribute("aria-pressed", on);
}
function openSocials(){
  SOCIALS_OPEN.currentTime = 0; playSound(SOCIALS_OPEN);
  socialsOpen = true; dlgShow(false); socialsEl.classList.add("on");
  requestAnimationFrame(()=>socialsEl.classList.add("in"));
}
function closeSocials(){
  socialsOpen = false; resetSocTilt(); if(scene === "room") dlgShow(true); socialsEl.classList.remove("in");
  setTimeout(()=>{ if(!socialsOpen){ socialsEl.classList.remove("on"); socCard.classList.remove("flipped"); socCard.setAttribute("aria-pressed", false); } }, 300);
}
// a click on the plaque turns it over (the buttons on it are left alone); anywhere off it closes
socialsEl.addEventListener("click", e=>{
  if(e.target.closest(".soc")) return;
  if(e.target.closest("#soc-card")){ flipSocials(); return; }
  if(!e.target.closest("#sw,.soc-hint")) closeSocials();
});

/* ---------------- interactions ---------------- */
document.addEventListener("click", e=>{
  if(mintConversationActive()&&e.target.closest('[data-hit="folder"],[data-hit="review"]')){
    // the paper on the desk is the one thing the clerk is pointing at while he talks, so it stays
    // live: picking it up is the same as taking him up on it. the folder beside it does not.
    if(!(hasReview()&&e.target.closest('[data-hit="review"]'))){
      e.preventDefault();e.stopImmediatePropagation();dlgShow(true);return;
    }
  }
  const mint=e.target.closest('#saved-interview [data-dgo]');
  // "next" through a multi-line bubble during the questions themselves
  if(mint&&interviewUI.open&&!mintConversationActive()&&mint.dataset.dgo==='beat'){
    e.preventDefault();e.stopImmediatePropagation();
    if(!mint.disabled&&!interviewUI.busy){if(typing)skipType();else{S.b++;renderSavedInterview();}}
    return;
  }
  if(mint&&mintConversationActive()){
    e.preventDefault();e.stopImmediatePropagation();
    if(!mint.disabled&&!interviewUI.busy){if(typing)skipType();else mintDialogueAction(mint.dataset.dgo);}
    return;
  }
  // the prototype's controls are inert, except the arrival's own buttons before sign-in
  if(e.target.closest('[data-go],[data-dq],[data-ans],[data-prompt],[data-dprompt],[data-task],[data-task-go]') ||
     (e.target.closest('[data-dgo]') && !arrivalBeat() && !chatterBeat())){
    e.preventDefault(); e.stopImmediatePropagation();
  }
}, true);
document.addEventListener("click", e=>{

  // click on the dimmed area outside the folder closes it (but not the click that ends a swipe)
  if(folderOpen && e.target.closest("#folder") && folderSwiped){ folderSwiped = false; return; }
  if(scene === "gate" && gateSwiped){ gateSwiped = false; return; }   // nor does the click that ends a corridor swipe open a door
  if(folderOpen && e.target.closest("#folder") && !e.target.closest("button, #page")){
    const up = ["f-paper","f-filed"].map(id=>document.getElementById(id)).find(w=>w.style.display !== "none");
    let inside;
    if(up){
      const r = up.getBoundingClientRect();
      inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    } else {
      const f = document.getElementById("fw").getBoundingClientRect(), a = CFG.folderArea;
      const px = (e.clientX - f.left) / f.width * 100, py = (e.clientY - f.top) / f.height * 100;
      inside = px >= a.x && px <= a.x + a.w && py >= a.y && py <= a.y + a.h;
    }
    if(!inside){ closeFolder(); return; }
  }

  const hit = e.target.closest("[data-hit]");
  if(hit){
    const k = hit.dataset.hit;
    if(ventOpen && k !== "vent" && k !== "vitem") closeVent();
    if(k === "door"){ if(travelling) doorWanted = true; else { playDoor(); enterRoom(); } }   // mid-travel: kept, and taken when the door is free
    // the folder is the filed case; the review paper is the unfiled one. both open the same page on different art
    if(k === "review") playReviewPaper();   // the unfiled paper rustles as it comes off the desk
    // the paper on the desk is the unfiled case: picking it up is reading the file, the same thing
    // the clerk offers. the folder beside it is for anything already on record.
    if(k === "review" && hasReview()){ performFilingAction('review'); return; }
    // a filed case opens onto its receipt; the blank page is only for a case that is not filed yet
    if(k === "folder" && savedDraft() && identity.draft.status === 'submitted'){ openSavedInterview(); return; }
    if(k === "folder" || k === "review"){ S.step = (k === "review" || S.caseNo) ? "file" : "mycase"; openFolder(false, k === "review"); dlgShow(false); }
    if(k === "gallery") openGallery();
    if(k === "tasks") openTasks();
    if(k === "board") openNotices();
    if(k === "socials") openSocials();
    if(k === "vent"){ ventOpen ? closeVent() : openVent(); }
    if(k === "frame") openDisclaimer();
    if(k === "vitem") openReceipt();
    if(k === "menu") openMenu();
    if(k === "exit") leaveRoom();   // the door again, on the way out
    if(k === "bell" && e.detail === 0) ringBell();   // keyboard activation; pointer presses ring on pointerdown
    return;
  }

  if(e.target.closest("#back")){
    if(S.step === "personnel") { closeFolder(); }
    else if(S.step === "file" && S.caseNo) { S.step = "personnel"; paint(); }
    else closeFolder();
    return;
  }
  if(e.target === folderEl){ closeFolder(); return; }

  const ans = e.target.closest("[data-ans]");
  if(ans){
    const r = +ans.dataset.ans, k = ans.dataset.k;
    if(r===1){ S.a1=k; S.a2=null; S.a3=null; }
    if(r===2){ S.a2=k; S.a3=null; }
    if(r===3){ S.a3=k; }
    paint(); return;
  }

  const pr = e.target.closest("[data-prompt]");
  if(pr){ S.promptId = pr.dataset.prompt; paint(); const t=document.getElementById("stmt"); if(t) t.focus(); return; }

  const go = e.target.closest("[data-go]");
  if(!go) return;
  const a = go.dataset.go;

  if(a === "alias-next"){
    const v = (document.getElementById("alias")?.value||"").trim();
    if(v.length < 2){ S.err = "two characters minimum. even the department has standards."; paint(); return; }
    S.alias = v; S.err = null; S.step = "interview"; paint();
  }
  if(a === "x"){
    if(signingIn) return;
    signingIn = true;
    // pretend to contact the account: spinner on the button, everything else locked
    go.classList.add("busy"); go.disabled = true;
    go.innerHTML = '<span class="spin"></span>connecting to x…';
    document.querySelectorAll('#page [data-go]').forEach(b=>{ if(b!==go) b.disabled = true; });
    API.connectX().then(acct=>{
      signingIn = false;
      if(!folderOpen || S.step !== "signin") return;   // folder closed meanwhile: do nothing
      connectedX(acct); paintDesk();
      S.step = "alias"; paint();
    }).catch(()=>{ signingIn = false; S.err = "x didn't answer. the department is used to it. try again."; paint(); });
  }
  if(a === "to-alias"){ S.step = "alias"; paint(); }
  if(a === "to-statement"){ S.step = "statement"; paint(); }
  if(a === "to-interview"){ S.step = "interview"; paint(); }
  if(a === "to-result"){ S.step = "result"; paint(); }
  if(a === "to-file"){ S.step = "file"; paint(); }
  if(a === "redo"){ S.a1=null; S.a2=null; S.a3=null; paint(); }
  if(a === "stmt-next"){ S.step = "result"; paint(); }
  if(a === "file-it"){
    playReviewPaper();   // and again as it goes into the folder
    API.fileCase(casePayload()).then(res=>{
      S.caseNo = res.caseNo; S.filedAt = res.filedAt || Date.now(); S.d = "filed"; S.step = "file"; save(); closeFolder();
      const room = document.getElementById("s-room");   // the paper goes, the folder lands
      paintDesk(); room.classList.add("landing-folder"); setTimeout(()=>room.classList.remove("landing-folder"), 700);
    });
  }
  if(a === "close-folder"){ closeFolder(); }
  if(a === "to-case"){ S.step = "file"; paint(); }
  if(a === "to-review"){ S.step = "file"; paint(); }
  if(a === "to-personnel"){ S.step = "personnel"; paint(); }
  if(a === "open-tasks"){ closeFolder(); openTasks(); }
  if(a === "resume-app"){ closeFolder(); dlgGo(resumeD()); dlgShow(true); }
});

document.addEventListener("input", e=>{
  if(e.target.id === "alias"){ S.alias = e.target.value; save(); }
  if(e.target.id === "stmt"){
    S.statement = e.target.value;
    const c = document.getElementById("cnt"); if(c) c.textContent = e.target.value.length;
    const b = document.querySelector('[data-go="stmt-next"]'); if(b) b.disabled = e.target.value.trim().length < 3;
    save();
  }
});

document.addEventListener("keydown", e=>{
  if(galleryOpen){
    if(e.key === "Escape"){ closeGallery(); return; }
    if(e.target.closest("input, textarea")) return;
    if(e.key === "ArrowLeft"){ galIdx--; paintGallery(); galleryStepSound(); }
    if(e.key === "ArrowRight"){ galIdx++; paintGallery(); galleryStepSound(); }
    return;
  }
  if(tasksOpen){ if(e.key === "Escape") closeTasks(); return; }
  if(socialsOpen){
    if(e.key === "Escape") closeSocials();
    if((e.key === "Enter" || e.key === " ") && e.target === socCard){ e.preventDefault(); flipSocials(); }
    return;
  }
  if(noticesOpen){ if(e.key === "Escape") closeNotices(); return; }
  if(disclaimerOpen){ if(e.key === "Escape") closeDisclaimer(); return; }
  if(e.key === "Escape" && folderOpen && !inspectOpen) closeFolder();   // with the card inspected, escape closes the viewer (its own handler) and the folder stays
  if(e.key === "Enter" && document.activeElement?.id === "alias"){
    e.preventDefault(); document.querySelector('[data-go="alias-next"]')?.click();
  }
});

/* ---------------- dialogue ----------------
   One exchange on screen at a time. No transcript: answering replaces the panel.
   The clerk's reaction to your last answer becomes the lead-in of the next line. */
const dlgEl = document.getElementById("dlg");
const bubEl = document.getElementById("bubble");

// dialogue step -> which folder tab is current, so the tabs still track progress
const D_TAB = { greet:"signin", brief:"signin", noapply:"signin", lookaround:"signin", signin:"signin", connected:"alias", opened:"alias", alias:"alias", idle:"alias",
                name:"alias", named:"alias",
                q1:"interview", q2:"interview", q3:"interview",
                prompt:"statement", statement:"statement", result:"result",
                wallet:"file", review:"file", filed:"file" };

// what the clerk says about the department, by state. the brief beat, and the beat after x connects.
const DEPT_LINES = {
  not_open:{
    brief:["applications aren't open. the forms haven't arrived.",
           "there's paperwork to do while we wait. there's always paperwork.",
           "connect your x so the department knows who it's ignoring."],
    connected:["there. the tray has work in it. applications open when the committee says so.",
               "the file needs a name on it either way. yours, ideally."]
  },
  open:{
    brief:["applications are open. qualifications are questionable.",
           "connect your x and i'll start the paperwork. one file per account. allegedly."],   // two lines: the button comes with the second
    connected:["there. the tray has work in it, for later.",
               "now the actual application."]
  },
  closed:{
    brief:["applications are closed.",
           "if you applied, connect your x and i'll find your file. if you didn't, that's a lesson."],
    // by whether a file turns up. until the lookup exists, "found" means a case saved on this device
    connected:{
      found:["found you. case CASE is filed. nothing more happens to it. the committee is occupied."],
      none:["no file under that name. too late to make one. the tray has work in it, if you want some."]
    }
  }
};
// returning visitors: one idle line per department x applicant cell
const IDLE_LINES = {
  "not_open.connected":"still not open. the tray is still there.",
  "not_open.applying":"still not open. the tray is still there.",
  "open.connected":"you're connected and you haven't applied. that's a choice.",
  "open.applying":"you were in the middle of something.",
  "closed.connected":"closed. you know this. the tray remains.",
  "closed.applying":"you didn't finish. the window did. your answers are still on my desk if it ever reopens.",
  "closed.filed":"your case is filed. the window is closed. that's the update.",
  "not_open.filed":"your case is filed. that's all it is.",
  "open.filed":"your case is filed. nothing has happened. nothing is scheduled to.",
  // once the committee has spoken (S.decision), the same line in every state
  "decided.approved":"your case came back. it's on the folder. don't make it weird.",
  "decided.waitlisted":"your case is on a list. the list is in a file. that's the update.",
  "decided.not_selected":"your case came back. the answer is on the folder. the committee has no comment. neither do i."
};

const shortWallet = w => (w||"").endsWith(".eth") ? w : (w||"").slice(0,6)+"…"+(w||"").slice(-4);
// the clerk only starts talking once the bell has been rung. a saved conversation past the
// greeting counts as rung, so older saves don't go quiet.
const awaitingBell = () => !S.rung && S.d === "greet";
// the arrival: what the clerk says to someone who has not signed in yet, from the bell to the x
// button. these are the original beats; from the sign-in on the session is the authority and
// renderIdentityDialogue takes over. the idle beats are in so his chatter still works before sign-in.
const ARRIVAL = new Set(["greet","mobnote","brief","noapply","lookaround","signin","nudge","chat","chatr"]);
const arrivalBeat = () => !testPreview && identityReady && !logoutPending && !identity?.user && ARRIVAL.has(S.d);
// his idle chatter (the nudge, the small talk and its reply) is the original's for everyone, signed in or not
const chatterBeat = () => !testPreview && !interviewUI.open && ["nudge","chat","chatr"].includes(S.d);
// the department's status is the campaign's, once the session has said what it is
const dept = () => identity?.campaign?.status || DEPT;
function dlgShow(on){
  if(on && awaitingBell()&&!clerkTree) on = false;
  dlgEl.classList.toggle("on", !!on); bubEl.classList.toggle("on", !!on);
  // a line with nothing to answer leaves on its own, and a finished one shown again (an overlay
  // closing over it) starts leaving again.
  if(on) scheduleFade(); else { clearTimeout(fadeTimer); clearBeat(); }
}

/* the clerk speaks in sentence case; the applicant (buttons, notes, paperwork) stays lowercase.
   every line he says passes through here, so the strings themselves stay in the brand's lowercase. */
function clerkCase(t){
  return String(t)
    .replace(/(^|[.!?]\s+)([a-z])/g, (m,a,b)=>a+b.toUpperCase())   // first letter of each sentence
    .replace(/\bi\b/g, "I")                                         // i, i'll, i'm, i've
    .replace(/\bx\b/g, "X");                                        // the platform (0x… wallets have no boundary)
}
// the applicant's buttons, once rendered: the text span of a choice (not its ▸ key), and the action buttons
function caseButtons(root){
  root.querySelectorAll(".ch > span:not(.k), .dbtn, .btn").forEach(el=>{ el.textContent = clerkCase(el.textContent); });
}
/* a bubble with more than one line can move through them on its own, like subtitles: a line stays
   up long enough to be read slowly, then the next one types, and the rows arrive with the last line.
   a click on the bubble moves on early. the same timer chains an action after a line has been read
   (the interview starting itself, say), so the clerk can talk and then do, with nothing to press. */
let beatTimer = 0, beatNext = null;
const readMs = t => Math.max(1500, 700 + t.length * 40);    // a comfortable read, not a slow one; a click moves on sooner
function clearBeat(){ clearTimeout(beatTimer); beatNext = null; }
function armBeat(fn){
  clearBeat();
  const said = bubEl.querySelector(".said")?.dataset.type || "";
  beatNext = ()=>{ clearBeat(); fn(); };
  beatTimer = setTimeout(beatNext, readMs(said));
}
// once a line has typed: more lines move on by themselves; a chained action runs after the last one
// has been read; otherwise a finished line leaves on its own
function afterLine(html, more, chain){
  if(html.more && more){ armBeat(more); return; }
  if(chain){ armBeat(chain); return; }
  scheduleFade();
}
function dlgPanel({ says, rows, note, err, auto }){
  const list = [].concat(says).filter(Boolean).map(clerkCase);
  const i = Math.min(S.b || 0, list.length - 1);
  const last = i >= list.length - 1;
  return {
    more: !last && !!auto,   // the bubble goes on by itself after this line
    bubble:`
      <div class="bub">
        <p class="said" data-type="${esc(list[i])}"></p>
      </div>
      ${list.length > 1 ? `<span class="beats">${list.map((_,j)=>`<i class="${j<=i?"on":""}"></i>`).join("")}</span>` : ""}`,
    dlg:`
      <div class="choices${/class="(field|drow)/.test(last ? rows : "") ? "" : " pick"}">${last ? rows : auto ? "" : `<button class="ch go solo" data-dgo="beat"><span>next</span></button>`}</div>
      ${last && err ? `<div class="derr">${err}</div>` : ""}
      ${last && note ? `<div class="dnote">${note}</div>` : ""}`
  };
}

const PREFERS_STILL = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const TYPE_MS = 16;

/* types the clerk's lines out, then releases the answers.
   clicking or pressing a key mid-type skips to the end. */
let typing = null;
function typeOut(done){
  const nodes = [...bubEl.querySelectorAll("[data-type]")];
  const caret = document.createElement("span");
  caret.className = "caret"; caret.textContent = "▌";
  let n = 0, i = 0, id = 0, finished = false;
  const finish = ()=>{
    if(finished) return; finished = true;   // natural end and skip must not both fire, and never twice
    clearInterval(id); typing = null;
    nodes.forEach(el=>{ el.textContent = el.dataset.type; });
    caret.remove(); done();
  };
  const cancel = ()=>{ finished = true; clearInterval(id); typing = null; caret.remove(); };   // stop without calling done
  typing = { skip:finish, cancel };
  if(!nodes.length || PREFERS_STILL){ finish(); return; }
  const tick = ()=>{
    const el = nodes[n];
    if(!el){ finish(); return; }
    const full = el.dataset.type;
    if(i === 0) el.appendChild(caret);
    i++;
    el.textContent = full.slice(0, i);
    el.appendChild(caret);
    if(i % 2 === 0 && /\S/.test(full[i-1])) blip();   // he mutters along: a blip every other letter, none for the gaps
    if(i >= full.length){ n++; i = 0; if(!nodes[n]){ finish(); return; } }
  };
  id = setInterval(tick, TYPE_MS);
  typing = { skip:finish, cancel };
}

const choiceRows = (opts, q) => opts.map(o =>
  `<button class="ch" data-dq="${q}" data-dk="${o.k}"><span class="k">${o.k}</span><span>${o.t}</span></button>`).join("");

function dlgRender(){
  clearBeat();
  if(interviewUI.open&&!testPreview){clerkTree=null;return renderSavedInterview();}
  if(clerkTree)return renderClerkTree();
  if(!arrivalBeat() && !chatterBeat()) return renderIdentityDialogue();
  // signed out: the conversation below, up to and including the sign-in. the beats past it (the
  // prototype interview) are not reached; the interview is renderSavedInterview.
  const d = S.d, R = routeOf();
  let html = "";

  if(d === "greet"){
    html = dlgPanel({
      says:[officeLine('arrival_greeting',"good. someone's here.")],
      rows:`<button class="ch go solo" data-dgo="to-brief"><span>hello</span></button>`
    });
  }
  else if(d === "brief"){
    // the brief plays through by itself and ends on the sign-in line, with the x button under it:
    // one press, not "fine. connect it" and then the button again
    const closed = dept() === "closed", problem = loginProblem();
    const status=dept(),brief=(DEPT_LINES[status]?.brief||DEPT_LINES.open.brief).map((line,i)=>officeLine(({open:['arrival_open','arrival_open_2','arrival_open_3'],not_open:['arrival_waiting','arrival_waiting_2','arrival_waiting_3'],closed:['arrival_closed','arrival_closed_2']})[status]?.[i]||'arrival_open',line));
    html = dlgPanel({
      says: closed || status === "open" ? brief : [...brief, "one active file per account. it keeps the department honest. allegedly."],   // open says the rule in its own second line
      rows: closed
        ? loginButton() + `<button class="ch" data-dgo="no-apply"><span class="k">◂</span><span>i didn't apply</span></button>
           <button class="ch" data-dgo="gallery-peek"><span class="k">◂</span><span>who else works here?</span></button>`
        : loginRows(),
      note: closed ? "no sign-in needed to look around." : "authorize only on x.com. no X password is entered here.",
      err: problem ? esc(IDENTITY_MESSAGES[problem] || IDENTITY_MESSAGES.temporarily_unavailable) : "",
      auto:true
    });
  }
  else if(d === "noapply"){
    html = dlgPanel({
      says:[officeLine('arrival_no_application',"then there's nothing to find. the tray still has work in it, if you want a file anyway.")],
      rows:loginButton() + `<button class="ch" data-dgo="look-around"><span class="k">◂</span><span>i'll just look around</span></button>`
    });
  }
  else if(d === "lookaround"){
    html = dlgPanel({ says:[officeLine('arrival_look_around',"suit yourself. the wall is free.")], rows:"" });
  }
  else if(d === "signin"){
    // the button is the session's: it starts the real x sign-in and comes back through #identity
    const problem = loginProblem();
    html = dlgPanel({
      says:[officeLine('sign_in_prompt',"one active file per account. it keeps the department honest. allegedly.")],
      rows:loginRows(),
      note:"authorize only on x.com. no X password is entered here.",
      err:problem ? esc(IDENTITY_MESSAGES[problem] || IDENTITY_MESSAGES.temporarily_unavailable) : ""
    });
  }
  else if(d === "connected"){
    const open = DEPT === "open";
    const says = DEPT === "closed"
      ? (S.caseNo ? [officeLine('connected_closed_found',DEPT_LINES.closed.connected.found[0].replace('CASE','{case}'),{case:S.caseNo})] : [officeLine('connected_closed_none',DEPT_LINES.closed.connected.none[0])])
      : DEPT_LINES[DEPT].connected.map((line,i)=>officeLine((DEPT==='open'?['connected_open','connected_open_2']:['connected_waiting','connected_waiting_2'])[i],line));
    // the open window goes on to the interview, which takes the name in its first beat. not_open has no
    // interview, so the clerk takes the name here instead — otherwise nothing is ever asked and the card
    // falls back to the handle. a closed department ends here: no buttons, the bubble fades, the desk takes over
    html = dlgPanel({
      says,
      rows: open
        ? `<button class="ch go" data-dgo="to-alias"><span class="k">▸</span><span>let's get it over with</span></button>
           <button class="ch" data-dgo="open-tasks"><span class="k">◂</span><span>what's in the tray?</span></button>`
        : DEPT === "not_open"
          ? `<button class="ch go solo" data-dgo="to-name"><span>fine. take it down</span></button>`
          : "",
      note: open ? "submission does not guarantee a whitelist spot." : ""
    });
  }
  else if(d === "opened"){
    html = dlgPanel({ says:["the forms arrived. applications are open. ring the bell when you're ready to be interviewed."], rows:"" });
  }
  else if(d === "alias"){
    const guess = S.alias || S.handle.replace(/^@/,"");
    html = dlgPanel({
      says:[`we'll call you ${esc(guess)} unless you object.`,
            "your legal name is unnecessary. your online personality will do."],
      rows:`<div class="field">
              <input class="din" id="d-alias" maxlength="20" value="${esc(guess)}" placeholder="whatever you go by" autocomplete="off">
              <button class="dbtn" data-dgo="alias">that'll do</button>
            </div>`,
      note:"2 to 20 characters. this is the name on your paperwork.",
      err:S.derr
    });
  }
  /* the name outside the open window. the same question the interview's alias beat asks, but it ends
     the conversation instead of opening the questions: there is no application to go on to yet. */
  else if(d === "name"){
    const guess = S.alias || S.handle.replace(/^@/,"");
    html = dlgPanel({
      says:[`we'll call you ${esc(guess)} unless you object.`,
            "your legal name is unnecessary. it only goes on the pass."],
      rows:`<div class="field">
              <input class="din" id="d-alias" maxlength="20" value="${esc(guess)}" placeholder="whatever you go by" autocomplete="off">
              <button class="dbtn" data-dgo="name">that'll do</button>
            </div>`,
      note:"2 to 20 characters. this is the name on your pass.",
      err:S.derr
    });
  }
  else if(d === "named"){
    html = dlgPanel({ says:[`${esc(S.alias)} it is. it's on your pass. the forms come when the committee says so.`], rows:"" });
  }
  else if(d === "idle"){
    const key=S.decision?'idle_decided_'+S.decision:
      DEPT==='not_open'?(appState()==='filed'?'idle_window_waiting_filed':'idle_window_waiting'):
      'idle_window_'+DEPT+'_'+appState();
    const line=officeLine(key,(S.decision ? IDLE_LINES["decided."+S.decision] : IDLE_LINES[DEPT+"."+appState()]) || "still here.");
    const rows = [];
    if(DEPT === "open" && appState() === "connected") rows.push(`<button class="ch go" data-dgo="to-alias"><span class="k">▸</span><span>fine. let's apply</span></button>`);
    if(DEPT === "open" && appState() === "applying") rows.push(`<button class="ch go" data-dgo="resume"><span class="k">▸</span><span>where was i?</span></button>`);
    // the name beat fades like any other line; outside the open window this is the way back to it
    if(DEPT === "not_open" && S.x && !S.alias) rows.push(`<button class="ch go" data-dgo="to-name"><span class="k">▸</span><span>about my name</span></button>`);
    html = dlgPanel({ says:[line], rows:rows.join("") });   // no buttons = the line fades on its own
  }
  else if(d === "mobnote"){
    html = dlgPanel({
      says:[officeLine('mobile_intro',"one more thing. the department's full office is on desktop. the phone counter is functional. barely.")],
      rows:`<button class="ch go solo" data-dgo="mob-ok"><span>ok</span></button>`
    });
  }
  else if(d === "nudge"){
    html = dlgPanel({ says:[S.nudgeLine || "still here."], rows:"" });   // no buttons: fades on its own
  }
  else if(d === "chat"){
    const t = CHATS[S.chatId] || CHATS.weather;
    html = dlgPanel({ says:[t.q],
      rows:t.opts.map((o,i)=>`<button class="ch" data-dgo="chatr:${S.chatId}:${i}"><span class="k">◂</span><span>${o.t}</span></button>`).join("") });
  }
  else if(d === "chatr"){
    html = dlgPanel({ says:[S.chatLine || "hm."], rows:"" });   // his reply, then the subject is closed
  }
  else if(d === "q1"){
    html = dlgPanel({ says:["first question.", IV.opener.q], rows:choiceRows(IV.opener.options, 1) });
  }
  else if(d === "q2"){
    html = dlgPanel({ says:[R.intro, R.q2.q], rows:choiceRows(R.q2.options, 2) });
  }
  else if(d === "q3"){
    html = dlgPanel({ says:[optOf(R.q2.options,S.a2).react, R.q3.q], rows:choiceRows(R.q3.options, 3) });
  }
  else if(d === "prompt"){
    html = dlgPanel({
      says:[optOf(R.q3.options,S.a3).react,
            "one final statement for the committee.",
            "pick something to answer. keep it short, our attention span is a departmental issue."],
      rows:PROMPTS.map(p=>`<button class="ch" data-dprompt="${p.id}"><span class="k">▸</span><span>${p.t}</span></button>`).join("")
    });
  }
  else if(d === "statement"){
    const p = PROMPTS.find(x=>x.id===S.promptId);
    const n = S.statement.trim().length;
    html = dlgPanel({
      says:["go ahead. i'll write it down exactly as you say it.", p.t],
      rows:`<div class="field wide stack">
              <textarea class="din" id="d-stmt" maxlength="240" placeholder="one or two sentences.">${esc(S.statement)}</textarea>
              <span class="dcount corner"><span id="d-cnt">${S.statement.length}</span>/240</span>
            </div>
            <div class="drow wide">
              <button class="ch" data-dgo="to-prompt"><span class="k">↩</span><span>back</span></button>
              <button class="dbtn" data-dgo="stmt" ${n<3?"disabled":""}>complete my assessment</button>
            </div>`
    });
  }
  else if(d === "result"){
    const c = CLASSES[classify()];
    html = dlgPanel({
      says:["statement attached. assessment complete.",
            `you are ${c.name}. ${c.desc}`],
      rows:`<button class="ch go" data-dgo="to-wallet"><span class="k">▸</span><span>fine. what's next?</span></button>
            <button class="ch" data-dgo="redo"><span class="k">↩</span><span>i'd like to answer that again</span></button>`
    });
  }
  else if(d === "wallet"){
    html = dlgPanel({
      says:["one last thing. verify the wallet you want on this application.",
            "which wallet will you use to mint?"],
      rows:`<div class="field">
              <input class="din" id="d-wallet" value="${esc(S.wallet)}" placeholder="0x… or name.eth" spellcheck="false" autocomplete="off">
              <button class="dbtn" data-dgo="wallet">verify</button>
            </div>`,
      note:"0x plus 40 characters, or a .eth name.",
      err:S.derr
    });
  }
  else if(d === "review"){
    html = dlgPanel({
      says:[`wallet noted. ${shortWallet(S.wallet)}. that's everything.`,
            "your file is on the desk. read it before i put it away."],
      rows:`<button class="ch go" data-dgo="open-review"><span class="k">▸</span><span>read my file</span></button>
            <button class="ch" data-dgo="to-wallet"><span class="k">↩</span><span>change my wallet</span></button>`,
      note:"submission does not guarantee a whitelist spot."
    });
  }
  else if(d === "filed"){
    html = dlgPanel({
      says:[`case ${S.caseNo} is filed. that folder is yours now. the committee is occupied. nothing will happen fast.`],
      rows:""   // the folder is on the desk; nothing to choose
    });
  }

  if(typing){ const t = typing; typing = null; t.cancel ? t.cancel() : (t.skip && t.skip()); }   // stop the previous line dead, without its callback
  clearTimeout(fadeTimer);
  clearInterjection();
  dlgEl.classList.remove("ready", "line-leaves");   // "leaves" is the identity lines' mark (a filed case's line), not his own lines': small talk keeps its own time (scheduleFade)
  bubEl.innerHTML = html.bubble;
  dlgEl.innerHTML = html.dlg; caseButtons(dlgEl);
  S.step = D_TAB[d] || "alias";
  paintDesk();
  save();
  typeOut(()=>{
    dlgEl.classList.add("ready");
    const f = dlgEl.querySelector("#d-alias, #d-stmt, #d-wallet");
    if(f) f.focus({ preventScroll:true });
    afterLine(html, ()=>{ S.b++; dlgRender(); });
  });
}
// end-of-conversation lines (no buttons on the last beat) leave on their own
let fadeTimer = 0;
const FADE_MS = 4000;
/* a line the applicant has nothing to answer. "line-leaves" says the same of a line whose one
   offer is also standing in the room, so it need not wait to be dismissed either. */
function terminalLine(){
  if(beatNext) return false;   // the bubble has more to say, or something to do, once this is read
  if(!dlgEl.classList.contains("ready")) return false;
  return dlgEl.classList.contains("line-leaves") || !dlgEl.querySelector("button, input, textarea");
}
// the clerk holds his line until the tray has been opened once, so a newcomer is pointed at it; a line that
// leaves (a filed case, interviews not open) goes anyway, and the tray keeps its pulse to say the same thing
const holdForTray = () => awaitingTray() && !dlgEl.classList.contains("line-leaves");
/* small talk once there is nothing left to start (a filed case, or interviews not open): his question and its answers
   stay 10s once someone is there to read them, then he lets it drop and is back to his filed line for the bell.
   anywhere else they wait for an answer */
const SETTLED_CHAT_MS = 10000;
const settledChat = () => chatterBeat() && S.d === "chat" && !!identity?.user && dlgEl.classList.contains("ready")
  && (identity?.draft?.status === "submitted" || dept() !== "open");
function scheduleFade(){
  clearTimeout(fadeTimer);
  if(settledChat()){
    const id = S.chatId;
    whenPresent(()=>{
      if(!settledChat() || S.chatId !== id) return;
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(()=>{ if(settledChat() && S.chatId === id){ S.d = "idle"; S.b = 0; save(); dlgShow(false); } }, SETTLED_CHAT_MS);
    });
    return;
  }
  if(!terminalLine() || holdForTray()) return;
  const said = bubEl.querySelector(".said")?.dataset.type || "", n = said.length;   // reading time: the filed line is a long one
  const go = ms => { clearTimeout(fadeTimer); fadeTimer = setTimeout(()=>{ if(terminalLine() && !holdForTray()) dlgShow(false); }, ms); };
  if(!chatterBeat()){ go(Math.max(FADE_MS, 1800 + n * 45)); return; }
  // his idle chatter (the nudge, and his reply to small talk): its clock starts when someone is there to read it
  whenPresent(()=>{ if(chatterBeat() && (bubEl.querySelector(".said")?.dataset.type || "") === said) go(chatterRead(n)); });
}

function dlgGo(d){
  if(mintConversationActive()&&['mint-assessment','mint-intro','mint-solana','mint-evm','mint-wrap'].includes(d))interviewUI.application.beat=d;
  S.d = d; S.b = 0; S.derr = null; dlgRender();
  // reaching the review: the paper drops onto the desk
  if((d === "review" || d === "mint-wrap") && !S.caseNo){ const room = document.getElementById("s-room"); paintDesk(); room.classList.add("landing-review"); setTimeout(()=>room.classList.remove("landing-review"), 700); }
}

/* the folder appears on the desk once there is a file to read: at review, or once filed */
/* the crumpled paper on the desk: one interview thrown out puts two balls by the folder, a second
   puts three more on the other side, a third a few at the back, a fourth lines the front of the
   desk, a fifth stacks a pyramid at its right end. they go when the case is filed. counted per
   account, here. */
const CRUMPLE_TIERS = 5;
const crumpleKey = () => 'dof.crumples.' + (identity?.user?.id || '');
const crumpleCount = () => { try{ return Number(localStorage.getItem(crumpleKey())) || 0; }catch(e){ return 0; } };
const addCrumple = () => { try{ localStorage.setItem(crumpleKey(), String(Math.min(CRUMPLE_TIERS, crumpleCount() + 1))); }catch(e){} };
const clearCrumples = () => { try{ localStorage.removeItem(crumpleKey()); }catch(e){} };
function paintDesk(){
  const room = document.getElementById("s-room");
  const crumples = savedDraft() && identity?.draft?.status !== 'submitted' ? crumpleCount() : 0;
  for(let t = 1; t <= CRUMPLE_TIERS; t++) room.classList.toggle("crumples-" + t, crumples >= t);
  room.classList.toggle("has-tray", savedDraft());
  room.classList.toggle("has-folder", hasFolder());
  room.classList.toggle("has-review", hasReview());
  room.classList.toggle("await-bell", awaitingBell());
  room.classList.toggle("await-tray", awaitingTray());
}
// the tray glows, and the connected line stays up, until the tray has been opened once
/* the tray wants looking at once, and holds the clerk's finished line up until it has been. a filed
   case is past that: there is nothing left for the tray to interrupt, so the line may leave. */
const awaitingTray = () => savedDraft() && !S.trayOpened && identity?.draft?.status !== 'submitted';
// the folder means "your file": on the desk from the moment x is connected, in every department
// state. before filing it holds the engagement record; the case paper joins it once filed.
const hasFolder = () => savedDraft();
// the review paper: lands on the desk when the clerk asks you to read your file, gone once it's filed
/* the review paper: lands on the desk when the clerk says it is there, gone once it is filed.
   after filing it is a case, and a case lives in the folder. */
const hasReview = () => { const a = interviewUI.application;
  return !!a && a.data.status !== 'submitted' && (a.beat === 'mint-wrap' || a.view === 'review'); };
/* Apply the fixed prototype room plate; no visitor preview switches. */
function applyDept(){
  document.body.dataset.dept = DEPT;
  const bg = document.getElementById("room-bg");
  if(bg && !bg.src.endsWith(ROOM_PLATE[DEPT].split("/").pop())){
    bg.onerror = ()=>{ bg.onerror = null; bg.src = ROOM_PLATE.open; };
    bg.src = ROOM_PLATE[DEPT];
  }
  paintDesk();
}

/* the walk through the department door, see #blackout: black falls (TRAVEL_IN), the scene changes
   under it (mid) after a short hold, and the black lifts (TRAVEL_OUT) off the room zooming in; away
   runs it the other way, the room zooming out under the black. one walk at a time */
const blackoutEl = document.getElementById("blackout"), roomEl = document.getElementById("s-room");
const TRAVEL_IN = 550, TRAVEL_HOLD = 150, TRAVEL_OUT = 900;
let travelling = false, doorWanted = false;   // doorWanted: the door was pressed while the black was still up
function travel(mid, away){
  if(travelling) return; travelling = true;
  blackoutEl.classList.remove("lift"); blackoutEl.classList.add("on");
  if(away) roomEl.classList.add("zoom-away");
  // whatever happens in the middle, the door is free again: a scene change that throws, or a tab put
  // in the background before the frames run, must not leave the site refusing every door after it
  const free = ()=>{ travelling = false; clearTimeout(safety);
    // a press that came while the corridor was still fading in is honoured now, not lost
    if(doorWanted){ doorWanted = false; if(scene === "gate") enterRoom(); } };
  const safety = setTimeout(free, TRAVEL_IN + TRAVEL_HOLD + TRAVEL_OUT + 1500);
  setTimeout(()=>{
    roomEl.classList.remove("zoom-away");
    if(!away) roomEl.classList.add("zoom-from");
    try{ mid(); }catch(e){ console.error(e); }
    requestAnimationFrame(()=>requestAnimationFrame(()=>{   // the zoomed-out frame is painted first, so the zoom in runs from it
      roomEl.classList.remove("zoom-from");
      blackoutEl.classList.add("lift"); blackoutEl.classList.remove("on");
      free();   // the black is lifting: the next door may be pressed while it does
    }));
  }, TRAVEL_IN + TRAVEL_HOLD);
}
/* the door, in and out: the room is only shown once the black is down */
// the desk's effects are small (a couple of hundred KB together): they are fetched as the visitor walks
// in, so the first ring, the first folder and the first sheet sound at once. the big files (the
// ambients, the building's snippets, the bathroom's song) wait for their own first play.
const DESK_SOUNDS = [DOOR, BELL, FOLDER_OPEN, TASKS_OPEN, REVIEW_PAPER, BOARD_PAPER, GALLERY_OPEN, SOCIALS_OPEN, CARD_FLIP];
document.getElementById("room-back").addEventListener("click", ()=>{ if(scene === "room" && !travelling) leaveRoom(); });
function enterRoom(){ DESK_SOUNDS.forEach(fetchSound); holdNoticeArt(); travel(arriveRoom, false); }
function leaveRoom(){ identitySaid=''; clerkTree=null;clearTimeout(clerkTreeTimer);playDoor(); dlgShow(false); travel(()=>{ nextDoorSong(); show("gate"); }, true); }   // the same door, on the way out
/* arrives in the room and puts the clerk back in conversation */
function arriveRoom(){
  show("room");
  const room = document.getElementById("s-room");
  // first time in the room: everything clickable glows for a moment, then only the bell keeps pulsing
  if(!S.seenRoom){ S.seenRoom = true; save(); room.classList.add("attract"); setTimeout(()=>room.classList.remove("attract"), 2600); }
  // a returning applicant gets the idle line for their cell, not the conversation they left mid-way.
  // the application itself can be resumed from the idle line.
  if(S.caseNo) S.d = "idle";   // the "it's filed" line plays once, at filing; after that he has a shorter one
  else if(S.x && S.d !== "connected") S.d = "idle";
  paintDesk();
  if(awaitingBell()){ dlgShow(false); return; }   // the clerk waits for the bell
  // back on the beat that was stowed. a review paper puts itself back on the desk and keeps the
  // dialogue down; anything else is a conversation and wants it up.
  dlgRender();
  if(!interviewUI.open || dlgEl.contains(interviewPanel)) dlgShow(true);
}
// where a half-done application picks up
function resumeD(){
  if(!S.alias) return "alias";
  if(!S.a1) return "q1"; if(!S.a2) return "q2"; if(!S.a3) return "q3";
  if(!S.promptId) return "prompt"; if(!S.statement.trim()) return "statement";
  if(!S.wallet) return "wallet";
  return "review";
}

/* click or key while the clerk is talking finishes the line instantly */
function skipType(){ if(typing && typing.skip){ typing.skip(); return true; } return false; }

/* dialogue clicks */
document.addEventListener("click", e=>{
  if(scene === "room" && !folderOpen && !galleryOpen && !noticesOpen && !tasksOpen && !socialsOpen && typing && !e.target.closest("[data-hit],#reset,#vol,.gal-close")){
    if(skipType()) return;
  }
  // read faster than the timer: a click anywhere but a control moves the bubble on now
  if(scene === "room" && beatNext && !typing && bubEl.classList.contains("on") && !e.target.closest("[data-hit],#reset,#vol,.gal-close,button,input,textarea,a")){ beatNext(); return; }
  if(scene === "room" && terminalLine() && !holdForTray() && bubEl.classList.contains("on") && !e.target.closest("[data-hit],#reset,#vol,.gal-close")){ clearTimeout(fadeTimer); dlgShow(false); return; }
  const ch = e.target.closest("[data-dq]");
  if(ch){
    const q = +ch.dataset.dq, k = ch.dataset.dk;
    if(q===1){ S.a1=k; S.a2=null; S.a3=null; dlgGo("q2"); }
    if(q===2){ S.a2=k; S.a3=null; dlgGo("q3"); }
    if(q===3){ S.a3=k; dlgGo("prompt"); }
    return;
  }
  const pr = e.target.closest("[data-dprompt]");
  if(pr){ S.promptId = pr.dataset.dprompt; dlgGo("statement"); return; }

  const g = e.target.closest("[data-dgo]"); if(!g) return;
  const a = g.dataset.dgo;

  if(a === "alias"){
    const v = (document.getElementById("d-alias")?.value||"").trim();
    if(v.length < 2){ S.derr = "two characters minimum. even the department has standards."; dlgRender(); return; }
    S.alias = v; dlgGo("q1");
  }
  if(a === "beat"){ S.b = (S.b||0) + 1; dlgRender(); return; }
  if(a === "to-brief") dlgGo(isPortrait() && !S.mobNote ? "mobnote" : "brief");   // the phone counter disclosure, once
  if(a === "mob-ok"){ S.mobNote = true; save(); dlgGo("brief"); }
  if(a.startsWith("chatr:")){ const [,id,i] = a.split(":"); S.chatLine = (CHATS[id]?.opts[+i]?.r) || "noted."; dlgGo("chatr"); }
  if(a === "to-signin") dlgGo("signin");
  if(a === "no-apply") dlgGo("noapply");
  if(a === "look-around"){ S.rung = true; dlgGo("lookaround"); }
  if(a === "gallery-peek") openGallery();
  if(a === "to-alias") dlgGo("alias");
  if(a === "to-name") dlgGo("name");
  if(a === "name"){
    const v = (document.getElementById("d-alias")?.value||"").trim();
    if(v.length < 2){ S.derr = "two characters minimum. even the department has standards."; dlgRender(); return; }
    S.alias = v; dlgGo("named");
  }
  if(a === "resume") dlgGo(resumeD());
  if(a === "open-tasks"){ openTasks(); return; }
  if(a === "open-folder"){ S.step = "personnel"; openFolder(false); dlgShow(false); return; }
  if(a === "x"){
    if(signingIn) return;
    signingIn = true;
    g.style.pointerEvents = "none";
    const lbl = document.getElementById("d-xlabel"); if(lbl) lbl.textContent = "connecting to x…";
    API.connectX().then(acct=>{
      signingIn = false;
      if(S.d !== "signin") return;
      connectedX(acct); save();
      // the moment: folder lands, papers drop into the tray
      const room = document.getElementById("s-room");
      paintDesk(); room.classList.add("landing"); setTimeout(()=>room.classList.remove("landing"), 700);
      dlgGo("connected");
    }).catch(()=>{ signingIn = false; g.style.pointerEvents = ""; const lbl = document.getElementById("d-xlabel"); if(lbl) lbl.textContent = "sign in with x"; });
  }
  if(a === "to-prompt") dlgGo("prompt");
  if(a === "stmt"){
    const v = (document.getElementById("d-stmt")?.value||"").trim();
    if(v.length < 3) return;
    S.statement = v; dlgGo("result");
  }
  if(a === "redo"){ S.a1=null; S.a2=null; S.a3=null; dlgGo("q1"); }
  if(a === "to-wallet") dlgGo("wallet");
  if(a === "wallet"){
    const v = (document.getElementById("d-wallet")?.value||"").trim();
    const ok = /^0x[a-fA-F0-9]{40}$/.test(v) || /^[a-z0-9-]{3,}\.eth$/i.test(v);
    if(!ok){ S.derr = "that doesn't look like a wallet. 0x plus 40 characters, or a .eth name."; dlgRender(); return; }
    S.wallet = v; dlgGo("review");
  }
  if(a === "open-review" || a === "open-case"){ S.step = "file"; openFolder(false); dlgShow(false); }
  if(a === "dismiss"){ dlgShow(false); return; }
});

document.addEventListener("input", e=>{
  if(e.target.id === "d-alias"){ S.alias = e.target.value; save(); }
  if(e.target.id === "d-wallet"){ S.wallet = e.target.value; save(); }
  if(e.target.id === "d-stmt"){
    S.statement = e.target.value;
    const c = document.getElementById("d-cnt"); if(c) c.textContent = e.target.value.length;
    const b = dlgEl.querySelector('[data-dgo="stmt"]'); if(b) b.disabled = e.target.value.trim().length < 3;
    save();
  }
});
document.addEventListener("keydown", e=>{
  if(e.key !== "Enter") return;
  const id = document.activeElement?.id;
  if(id === "d-alias"){ e.preventDefault(); dlgEl.querySelector('[data-dgo="alias"], [data-dgo="name"]')?.click(); }
  if(id === "d-wallet"){ e.preventDefault(); dlgEl.querySelector('[data-dgo="wallet"]')?.click(); }
});

/* ---------------- overlay sound and focus ---------------- */
const soundControls = document.getElementById("sound-controls");
const testControlsEl = document.getElementById('owner-tests');
let testControlsOpen = false;
const overlays = [ventDialog, folderEl, galleryEl, noticesEl, tasksEl, socialsEl, menuEl, inspectEl, testControlsEl];
// the vent counts as a modal only where its close button does. with a pointer the corridor stays
// live behind him, so clicking the door walks off mid-sentence, as it always has.
const VENT_MODAL = matchMedia("(max-aspect-ratio:1/1),(max-height:600px)");
const overlayOpen = el => ({folder:folderOpen, gallery:galleryOpen, notices:noticesOpen,
  tasks:tasksOpen, socials:socialsOpen, menu:menuOpen, inspect:inspectOpen,
  'vent-dialog':ventOpen && VENT_MODAL.matches, 'owner-tests':testControlsOpen})[el.id];
let activeOverlay = null;
const overlayReturn = new Map();
const focusable = el => [...el.querySelectorAll('button, input, textarea, select, a[href], [tabindex]')]
  .filter(n=>!n.disabled && n.tabIndex >= 0 && n.getClientRects().length && getComputedStyle(n).visibility !== "hidden" && !n.closest("[inert]"));
function syncOverlayControls(){
  const next = [...overlays].reverse().find(overlayOpen) || null;
  if(next === activeOverlay) return;
  const previous = activeOverlay, focused = document.activeElement;
  const returning = previous && overlayReturn.get(previous);
  if(next && !overlayReturn.has(next)) overlayReturn.set(next, focused);
  if(previous && !overlayOpen(previous)) overlayReturn.delete(previous);
  activeOverlay = next;
  // the sound control is deliberately NOT moved into the overlay: it stays in its corner, under the
  // scrim. body's inert pass below makes it non-interactive while a modal is up, which is correct for
  // something sitting behind one.
  const previewBanner = document.getElementById('test-preview-banner');
  previewBanner.inert = false; (next || document.body).append(previewBanner);
  for(const child of document.body.children){
    if(child.matches("script, style")) continue;
    child.inert = !!next && child !== next;
  }
  for(const el of overlays){
    el.setAttribute("role", "dialog");
    if(el === next) el.setAttribute("aria-modal", "true"); else el.removeAttribute("aria-modal");
  }
  if(soundControls.contains(focused)) focused.focus({preventScroll:true});
  else if(returning && returning.isConnected && (!next || next.contains(returning))) returning.focus({preventScroll:true});
  else if(next) (focusable(next)[0] || next).focus({preventScroll:true});
}
// Class changes already mark all existing overlay open/close transitions, including nested card inspection.
const overlayObserver = new MutationObserver(syncOverlayControls);
overlays.forEach(el=>overlayObserver.observe(el,{attributes:true,attributeFilter:["class"]}));
// turning the phone mid-sentence changes whether the vent is a modal, and no class changes with it
VENT_MODAL.addEventListener("change", syncOverlayControls);
["click","pointerdown","pointerup","pointermove"].forEach(type=>soundControls.addEventListener(type,e=>e.stopPropagation()));
soundControls.addEventListener("keydown", e=>{ if(!["Tab","Escape"].includes(e.key)) e.stopPropagation(); });
document.addEventListener("keydown", e=>{
  if(!activeOverlay || e.key !== "Tab") return;
  const items = focusable(activeOverlay), first = items[0], last = items[items.length - 1];
  if(!items.length) return;
  if(e.shiftKey && (document.activeElement === first || !activeOverlay.contains(document.activeElement))){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && (document.activeElement === last || !activeOverlay.contains(document.activeElement))){ e.preventDefault(); first.focus(); }
}, true);
document.addEventListener("focusin", e=>{
  if(activeOverlay && !activeOverlay.contains(e.target)) (focusable(activeOverlay)[0] || soundControls.querySelector("button")).focus({preventScroll:true});
});

/* ---------------- saved identity and draft views ---------------- */
const IDENTITY_MESSAGES = {
  configuration_unavailable:'sign-in setup is not ready. the gallery is still open.',
  login_unavailable:'x sign-in is unavailable. please try again later.',
  login_paused:'new x sign-ins are paused for this preview. the team needs to reopen them. your saved file is safe.',
  login_expired:'that sign-in expired. start a new sign-in.',
  login_cancelled:'x sign-in was cancelled. no account was connected.',
  access_expired:'the application could not be reached. reload and sign in again if requested.',
  connection_unavailable:'the connection is unavailable. please retry.',
  temporarily_unavailable:'the department cannot save right now. please retry.',
  sign_in_required:'your session ended. please sign in again.',
  invalid_alias:'use 2–20 letters or numbers, with spaces, dots, apostrophes, hyphens or underscores.',
  limit_reached:'too many attempts. wait a little before trying again.',
  csrf_rejected:'your session changed. refresh your connection before retrying.',
  writes_paused:'saving is paused. your existing draft remains safe.',
  rewards_unavailable:'rewards are not available in this test.',
  logout_failed:'sign-out could not be confirmed. retry sign-out.',
};
let logoutPending = false, interviewRecovery = null, aliasInput = null;
let autoInterview = false;   // the name has just gone on the file: the clerk goes on into the interview by himself
function clearIdentityView(preserveInput=false){
  clerkTree=null;clearTimeout(clerkTreeTimer);autoInterview=false;clearBeat();
  taskUI.telegramUrl=null;
  engTicket++; // discard a previous account's in-flight engagement response
  clearSavedTasks();
  if(!preserveInput)aliasInput=null;
  const held=preserveInput && interviewUI.dirty ? {...interviewUI,input:{...interviewUI.input},open:false,busy:false} : preserveInput?interviewRecovery:null;
  clearInterviewView();interviewRecovery=held;
  clearTimeout(sessionTimer);
  discardTestPreview(); setOwnerTestAllowed(false); closeTestControls();
  identity = null; identityReady = false;
  // Vent dialogue is anonymous scene memory, never applicant identity or a grant.
  closeVent();
  S = {...BLANK, tasks:[], rung:S.rung, seenRoom:S.seenRoom, boardSeen:S.boardSeen, vent:S.vent};
  folderOpen = false; tasksOpen = false; inspectOpen = false;
  [folderEl,tasksEl,inspectEl].forEach(el=>el.classList.remove('on','in','suspended'));
  document.getElementById('page').textContent = '';
  document.getElementById('tasks-page').textContent = '';
  document.getElementById('acard').textContent = '';
  document.getElementById('acard-big').textContent = '';
  document.getElementById('astats').textContent = '';
  paintDesk();
}
function acceptIdentity(value){
  if(identity?.draft?.id && identity.draft.id!==value.draft?.id){clearInterviewView();interviewRecovery=null;filedLine=null;}
  if(taskUI.owner!==value.user?.id)clearSavedTasks();
  if(value.draft?.status==='submitted'&&interviewUI.application?.data.status!=='submitted'){clearInterviewView();interviewRecovery=null;}
  if(interviewUI.owner && interviewUI.owner!==value.user?.id)clearInterviewView();
  if(interviewRecovery && value.user){
    if(interviewRecovery.owner===value.user.id)Object.assign(interviewUI,{...interviewRecovery,ticket:interviewUI.ticket,open:false,busy:false});
    interviewRecovery=null;
  }
  if(aliasInput?.owner!==value.user?.id||value.user?.alias)aliasInput=null;
  identity = value; identityReady = true;
  refreshOwnerTestCapability();
  S.x = !!value.user; S.handle = value.user?.handle || ''; S.alias = value.user?.alias || '';
  // the x profile picture, for the card: whichever key the session carries it under (none yet; see the handover)
  S.pfp = value.user?.pfp || value.user?.avatar || value.user?.profileImageUrl || value.user?.profile_image_url || null;
  S.since = value.user ? value.user.joinedAt * 1000 : null;
  if(value.user){ S.d = 'identity'; S.rung = true; }   // signed in: the identity dialogue, no bell to wait for
  paintDesk();
  if(value.expiresAt){
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(()=>{ identityEpoch++; clearIdentityView(true); identityReady=true; identityError='sign_in_required'; dlgRender(); },Math.max(0,value.expiresAt*1000-Date.now()));
  }
}
async function refreshIdentity(){
  if(logoutPending) return;
  const epoch = ++identityEpoch; clearIdentityView(true); identityError='';
  if(scene==='room') dlgRender();
  try {
    const result = await API.session(); if(epoch!==identityEpoch) return;
    acceptIdentity(result);
  } catch(error){ if(epoch!==identityEpoch) return; identityReady=true; identityError=error.code; }
  const result = location.hash.slice(1);
  if(['identity','login_cancelled','login_expired','login_unavailable','login_paused'].includes(result)){
    history.replaceState(null,'',location.pathname);
    if(result!=='identity') identityError=result;
    S.rung=true; show('room');
  }
  // still signed out but past the bell (signed out, came back from x without an account, retried):
  // the sign-in is where he picks up, not the greeting
  if(identityReady && !identity?.user && S.rung && S.d === "greet") S.d = "signin";
  if(scene==='room') afterIntro(()=>{ if(scene==='room'){ dlgRender(); dlgShow(S.rung); } });   // back from x: he speaks as the wordmark clears
}
// go marks the one action that advances the file. at most one per panel: .go is now a solid butter
// button, so a row of them reads as a row of primaries and nothing stands out.
function identityButton(action,label,disabled=false,go=false){
  return `<button class="ch${go?' go':''}" data-identity="${action}" ${disabled?'disabled':''}><span>${esc(label)}</span></button>`;
}
// the sign-in button and what goes with it: the same rows whether the clerk reaches the sign-in
// through the arrival or the session lands there on its own
function loginButton(){
  let rows=`<button class="ch go" data-identity="login" ${identityBusy||!identity?.loginEnabled?'disabled':''}><span class="k">▸</span><span>${identityBusy?'connecting to x…':'sign in with x'}</span></button>`;
  if(identityError||!identity?.loginEnabled)rows+=identityButton('retry','retry connection',identityBusy);
  return rows;
}
const loginRows = () => loginButton() + `<button class="ch" data-identity="gallery"><span class="k">◂</span><span>who else works here?</span></button>`;
const loginProblem = () => identity?.loginUnavailableReason==='login_paused'&&!identity?.user?'login_paused':identityError;
function renderClerkTree(){
 const node=clerkTree;if(!node)return;
 if(typing){typing.cancel?.();typing=null;}clearInterjection();clearTimeout(clerkTreeTimer);clearTimeout(fadeTimer);S.b=0;
 const html=dlgPanel({says:[node.text],rows:node.choices.map((c,i)=>`<button class="ch" data-clerk-tree="${i}"><span class="k">${String.fromCharCode(65+i)}</span><span>${esc(c.text)}</span></button>`).join('')});
 dlgEl.classList.remove('ready','line-leaves');bubEl.innerHTML=html.bubble;dlgEl.innerHTML=html.dlg;caseButtons(dlgEl);dlgShow(true);
 typeOut(()=>{if(clerkTree!==node)return;dlgEl.classList.add('ready');if(!node.choices.length)whenPresent(()=>{if(clerkTree===node){clearTimeout(clerkTreeTimer);clerkTreeTimer=setTimeout(()=>{if(clerkTree===node){clerkTree=null;dlgShow(false);}},chatterRead(node.text.length));}});});
}
dlgEl.addEventListener('click',e=>{const b=e.target.closest('[data-clerk-tree]');if(!b||!clerkTree||!dlgEl.classList.contains('ready'))return;const choice=clerkTree.choices[Number(b.dataset.clerkTree)];if(choice){clerkTree=choice.next;renderClerkTree();}});
document.addEventListener('visibilitychange',()=>{idleLastAct=Date.now();idleTalked=false;if(document.hidden&&clerkTree){clerkTree=null;clearTimeout(clerkTreeTimer);if(typing){typing.cancel?.();typing=null;}dlgShow(false);}});
let identitySaid='';   // the identity line last put in the bubble: a redraw of the same line does not type it again
function renderIdentityDialogue(){
  let says,rows,note,leaves=false,chain=null;   // leaves: he has finished, and what he offers is in the room too. chain: what he does next, by himself
  if(testPreview){
    says = testPreview.greeted ? DEPT_LINES[testPreview.state].brief[0] : "good. someone's here.";
    rows = testPreview.greeted ? identityButton('preview-disabled','X sign-in / interview — unavailable in preview',true,true) :
      '<button class="ch go" data-test-action="greet"><span>hello.</span></button>';
  }
  else if(!identityReady){ says=officeLine('connection_check',"checking your connection."); rows=''; }
  else if(logoutPending){ says=officeLine('sign_out_retry',"sign-out has not been confirmed."); rows=identityButton('logout','retry sign-out',identityBusy,true); }
  else if(!identity?.user){
    says=officeLine('sign_in_prompt',"one active file per account. it keeps the department honest. allegedly.");
    rows=loginRows();
    note='official x authorization only. no password is entered here.';
  } else if(!savedDraft()){
    const guess=aliasInput?.owner===identity.user.id?aliasInput.value:identity.user.handle.replace(/^@/,'');
    says=officeLine('alias_request',"we'll call you {handle} unless you object.",{handle:identity.user.handle.replace(/^@/,'')});
    rows=`<div class="field"><input class="din" id="identity-alias" aria-label="fomies alias" maxlength="20" autocomplete="off" value="${esc(guess)}" placeholder="whatever you go by" ${identityBusy?'disabled':''}>
      <button class="dbtn" data-identity="alias" ${identityBusy?'disabled':''}>${identityBusy?'saving…':"that'll do"}</button></div>`+identityButton('logout','sign out',identityBusy);
    note='2 to 20 characters. this is the name on your paperwork. x account: '+esc(identity.user.handle)+'.';
  } else if(filedLine){
    // the paper has just gone into the folder: he says so, once. the folder is on the desk; nothing to choose
    says=officeLine('newly_filed',"case {case} is filed. that folder is yours now. the committee is occupied. nothing will happen fast.",{case:filedLine.slice(0,10)});
    rows=identityButton('interview','open case',identityBusy,true);filedLine=null;leaves=true;
  } else {
    // he opens with what there is to do, not with the state of the paperwork. the footnote under
    // the rows already says where the file stands.
    says=identity.draft.status==='submitted'
      ?officeLine('returning_filed',"{alias}, your application is filed. the committee has it. nothing will happen fast.",{alias:identity.user.alias})
      :{open:officeLine('interview_available',"{alias}, the interviews are open. we can start whenever you want.",{alias:identity.user.alias}),
        not_open:officeLine('interview_waiting',"{alias}, the interviews aren't open yet. the forms haven't arrived.",{alias:identity.user.alias}),
        closed:officeLine('interview_closed',"{alias}, the interviews have closed. your file stays as it is.",{alias:identity.user.alias})
       }[identity.campaign.status]||officeLine('interview_closed',"{alias}, the interviews have closed. your file stays as it is.",{alias:identity.user.alias});
    // one thing to do, and it depends on where the file stands: a draft gets the interview, a filed
    // case gets the folder. the clipboard is on the desk already. then the way out.
    const filed=identity.draft.status==='submitted', open=identity.campaign.status==='open';
    leaves=filed||!open;   // a filed case, or interviews not open: nothing to start, so the line leaves like any finished one and the idle chat can begin; the bell brings him back
    if(autoInterview&&!filed&&open&&!identityBusy){
      // straight from the name: he says his line and opens the questions himself
      says=officeLine('interview_auto_start',"{alias}, the interviews are open.",{alias:identity.user.alias});
      rows=''; chain=()=>{ autoInterview=false; openSavedInterview(); };
    } else {
      autoInterview=false;
      rows=(filed?identityButton('interview','open case',identityBusy,true)
           :open?identityButton('interview','start interview',identityBusy,true):'')
          +identityButton('logout','sign out',identityBusy);
    }
  }
  const problem=loginProblem();
  const html=dlgPanel({says:[].concat(says).map(t=>sceneCopy('idle',t)),rows,note:testPreview?'TEST PREVIEW — no sign-in, interview, verification or filing is performed.':note!==undefined?note:identity?.user?`x account: ${esc(identity.user.handle)}${identity.draft?.status==='submitted'?' · submitted':''}`:'official x authorization only. no password is entered here.',err:problem?esc(IDENTITY_MESSAGES[problem]||IDENTITY_MESSAGES.temporarily_unavailable):''});
  if(typing){typing.cancel?.();typing=null;} clearTimeout(fadeTimer); clearInterjection();
  dlgEl.classList.toggle('line-leaves', leaves);
  bubEl.innerHTML=html.bubble; dlgEl.innerHTML=html.dlg; caseButtons(dlgEl); dlgEl.classList.remove('ready');
  const sayKey=JSON.stringify([].concat(says)), fresh=sayKey!==identitySaid; identitySaid=sayKey;
  if(chain){ paintDesk(); typeOut(()=>{ dlgEl.classList.add('ready'); afterLine(html, null, chain); }); return; }   // said, then done
  // a line he has not said yet types out, like every other line of his; the fields come up with the end of it
  if(fresh){ paintDesk(); typeOut(()=>{ dlgEl.classList.add('ready'); scheduleFade(); }); return; }
  // Static text keeps retry/alias fields stable while the session is checked: a line already said is not typed again.
  bubEl.querySelectorAll('[data-type]').forEach(el=>el.textContent=el.dataset.type);
  dlgEl.classList.add('ready'); paintDesk(); scheduleFade();
}
function paintSavedDraft(){
  if(!savedDraft()) return;
  if(reviewPaperUp()) return showReviewPaper(interviewUI.message);
  resetFolderArt(); S.step='mycase';
  document.getElementById('f-paper').style.display='none';
  document.getElementById('f-filed').style.display='';
  folderEl.classList.add('spread'); parkPage(false);
  const page=document.getElementById('page');place(page,CFG.filedPage);page.style.display='flex';
  // before anything is filed the right page is the department's blank one, as in the designer's
  // build: the card sits on the left, the page is reserved, and there is nothing on it to press.
  // the way into the interview is the clerk. a filed case never lands here: the receipt is drawn
  // over this page by renderApplicationPage, which is where "open case" and the desk both lead.
  page.innerHTML=pageBlank();
  setFolderPage(folderPage);paintCard();paintStats();loadEngagement();loadReferrals();
}
const taskUI={telegramUrl:null,owner:null,ticket:0,data:null,busy:false,error:'',inputs:{},requests:{},open:{},opened:false};   // open: which tasks are unfolded
function clearSavedTasks(){taskUI.ticket++;Object.assign(taskUI,{telegramUrl:null,owner:null,data:null,busy:false,error:'',inputs:{},requests:{},open:{},opened:false});}
const taskStateNames={available:'Available',checking:'Checking / Pending',pending:'Pending',completed:'Completed',needs_action:'Needs action',unavailable:'Temporarily unavailable',paused:'Paused',expired:'Expired',cancelled:'Needs action'};
function taskReason(reason){return ({telegram_link_expired:'This link expired. Connect Telegram again to get a new one.',telegram_disabled:'Telegram verification is not enabled yet.',telegram_not_linked:'Connect Telegram before checking.',telegram_not_member:'Join the Telegram channel, then check again.',telegram_no_boost:'No active personal boost found. Boost the channel, then try again.',telegram_limited:'Telegram is busy. Try again later.',telegram_unavailable:'Telegram could not be checked. Please retry later.',telegram_account_in_use:'That Telegram account is already linked to another Fomies account.',telegram_link_pending:'Start the bot and return here before confirming.',verification_disabled:'Verification is not enabled yet.',budget_exhausted:'The verification budget is temporarily unavailable.',provider_unavailable:'The evidence service is temporarily unavailable.',provider_limited:'The evidence service is busy. Try later.',incomplete_scan:'Still checking reposts. Try again shortly.',wrong_post_kind:'Use the required post type. A repost or quote does not count for this task.',stale_task:'This task changed. Refresh the tray before checking again.',task_not_available:'This task is paused, archived or expired. Refresh the tray.',limit_reached:'Too many checks. Wait a minute before trying again.',wrong_author:'Use a public post from your signed-in X account.',wrong_target:'The post does not directly target the required post.',content_mismatch:'The post does not meet the published content requirements.',outside_window:'The post was created outside this task’s time window.',not_following:'The checked relationship does not show you following this account.',task_changed:'This task changed during the check. Refresh before trying again.',interrupted_check:'The earlier check was interrupted. You may retry.',evidence_unavailable:'Public evidence could not be established.',schema_unavailable:'The provider’s evidence could not be validated.',target_unresolved:'The target could not be confirmed.'})[reason]||'The check is not complete. Refresh or retry when available.';}
async function loadSavedTasks(){
 if(testPreview||!identity?.user?.alias)return;
 const ticket=++taskUI.ticket,owner=identity.user.id;taskUI.owner=owner;taskUI.busy=true;taskUI.error='';paintTaskPreview();
 try{const data=await API.tasks();if(ticket!==taskUI.ticket||identity?.user?.id!==owner)return;if(data.owner!==owner){clearIdentityView();await refreshIdentity();return;}taskUI.data=data;}
 catch(e){if(ticket===taskUI.ticket)taskUI.error=e.status===401?'Sign in again to see your saved tasks.':'Tasks are temporarily unavailable. Try again.';}
 finally{if(ticket===taskUI.ticket){taskUI.busy=false;if(tasksOpen)paintTaskPreview();if(folderOpen)paintStats();}}   // the record reads the tray too
}
/* ---------- the task tray ----------
   a task is a line: the mark on the left says where it stands, the line is the task's title, and it
   opens to what the department actually wants — the instructions, then each action in the task: what
   to do, what the post has to carry (an @mention, a #hashtag, a link), the square that opens x, and,
   for a post the department can check, the field for its link and the one button that sends it. a
   task with a single action opens the same way. a task the department has passed folds shut and is
   struck through. the check flow under all this is the server's, unchanged. */
const LINK_OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-8 8"/>'
               + '<path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
// where the square goes: the compose box for a post, the account for a follow, the post for the rest
const taskOpenUrl = r => r.type === 'telegram_join' ? r.targetUrl : r.type === 'telegram_boost' ? 'https://t.me/boost/' + r.target.handle : r.type === 'post' ? 'https://x.com/compose/post'
  : r.type === 'follow' ? 'https://x.com/i/user/' + (r.target?.id || '')
  : 'https://x.com/i/web/status/' + (r.target?.id || '');
// the line for an action, in the department's words
function taskVerb(r){
  if(r.withLike) return 'like and ' + ({repost:'repost',reply:'reply',quote:'quote',post:'post on x',follow:'follow'}[r.type] || r.type);
  const at = r.target?.handle ? '@' + r.target.handle : 'the department';
  return { telegram_join:'join Telegram',telegram_boost:'boost Telegram — '+r.rewardPoints+' points',post:'post on x', reply:'reply to the post', quote:'quote the post', repost:'repost it',
           follow:'follow ' + at, like:'like the post' }[r.type] || r.type;
}
// what the post has to carry, as small chips after the verb
function taskNeeds(r){
  const chips = [];
  if(r.mention) chips.push(`<a class="chip" href="https://x.com/i/user/${esc(r.requiredMention?.id || '')}" target="_blank" rel="noopener noreferrer">@${esc(r.mention)}</a>`);
  if(r.hashtag) chips.push(`<span class="chip">#${esc(r.hashtag)}</span>`);
  if(r.link){ let host = r.link; try{ host = new URL(r.link).host.replace(/^www\./, ''); }catch(e){} chips.push(`<a class="chip" href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">${esc(host)}</a>`); }
  return chips.length ? `<span class="need">${chips.join('')}</span>` : '';
}
// every action in a task, with its own standing beside it. a single-action task is one part with no id
function taskParts(t){
  if(t.rule.type === 'combined') {
    const parts = t.rule.requirements.map(p => ({ ...p, key: t.id + ':' + p.id,
      st: t.requirements?.find(q => q.id === p.id) || { state: p.optional ? 'optional_unverified' : 'available' } }));
    const like = parts.find(p => p.type === 'like');
    const host = parts.find(p => p.type === 'repost' && p.targetUrl === like?.targetUrl)
      || parts.find(p => p.type !== 'like' && p.targetUrl === like?.targetUrl);
    if(like && host){ host.withLike = true; return parts.filter(p => p !== like); }
    return parts;
  }
  return [{ ...t.rule, id: '', key: t.id, st: { state: t.state, verified_at: t.verified_at, reason: t.reason, retry_at: t.retry_at } }];
}
const taskPassed = st => st.state === 'completed' || !!st.verified_at;
const taskWaiting = st => st.state === 'checking';
const taskRefused = st => ['needs_action','cancelled'].includes(st.state);
let taskRetryTimer = 0, taskRetryAt = 0;
function armTaskRetry(at){
  if(taskRetryTimer && taskRetryAt <= at) return;
  clearTimeout(taskRetryTimer); taskRetryAt = at;
  taskRetryTimer = setTimeout(()=>{ taskRetryTimer = 0; taskRetryAt = 0; if(tasksOpen) paintTaskPreview(); }, Math.max(250, at - Date.now() + 100));
}
function taskActionRow(t, r, data, busy, passed){
  const st = r.st, done = taskPassed(st), waiting = taskWaiting(st), refused = taskRefused(st);
  const telegram = r.type.startsWith('telegram_');
  const checkable = !r.optional && (telegram ? data.telegram?.enabled && data.telegram?.linked : data.provider.enabled && data.provider.types.includes(r.type));
  const authored = ['post','reply','quote'].includes(r.type);
  const retry = st.retry_at && st.retry_at * 1000 > Date.now();
  if(retry) armTaskRetry(st.retry_at * 1000);   // the tray repaints itself when the cooldown ends
  const off = ['paused','expired'].includes(t.state);
  const cls = done ? ' done' : waiting ? ' waiting' : refused ? ' refused' : r.optional ? ' optional' : '';
  let html = `<div class="act${cls}">
      <span class="mark" aria-hidden="true"></span>
      <span class="verb">${esc(taskVerb(r))}${r.optional && r.type !== 'like' ? '<small>optional</small>' : ''}</span>
      ${taskNeeds(r)}
      ${telegram ? '' : `<a class="go sq" href="${esc(taskOpenUrl(r))}" target="_blank" rel="noopener noreferrer" aria-label="open X" title="open X">${LINK_OUT}</a>`}
    </div>`;
  if(telegram && !done && !passed && data.telegram?.enabled && !data.telegram.linked){
    html += `<div class="task-do bare telegram-connect">${data.telegram.pendingName
      ? `<span class="hint">Link ${esc(data.telegram.pendingName)}?</span><button class="btn" data-telegram="confirm" ${busy?'disabled':''}>confirm account</button><button class="btn" data-telegram="connect" ${busy?'disabled':''}>use another account</button>`
      : taskUI.telegramUrl
        ? `<a class="btn" href="${esc(taskUI.telegramUrl)}" target="_blank" rel="noopener noreferrer">open Telegram bot</a><button class="btn" data-telegram="confirm" ${busy?'disabled':''}>I've started the bot</button>`
        : `<button class="btn" data-telegram="connect" ${busy?'disabled':''}>connect Telegram</button>`}</div><p class="task-note">${data.telegram.pendingName?'Confirm this is your Telegram account.':taskUI.telegramUrl?'Press Start in the bot, then return here.':'Connect once to verify your Telegram tasks.'}</p>`;
  }
  if(telegram && !done && !data.telegram?.enabled)html += '<p class="task-note">Telegram verification is not enabled yet.</p>';
  if(telegram && !done && data.telegram?.linked) html += `<div class="task-do bare telegram-connect"><a class="btn" href="${esc(taskOpenUrl(r))}" target="_blank" rel="noopener noreferrer">${r.type==='telegram_boost'?'boost channel':'join channel'}</a></div>`;
  if(telegram && !done && r.type==='telegram_boost') html += '<p class="task-note">Optional reward for Telegram Premium members.</p>';
  // the department can check this one: the field for the link where a post is wanted, and the button
  if(checkable && !done && !passed) html += `<div class="task-do${authored ? '' : ' bare'}">
      ${authored ? `<input class="din" data-task-url="${esc(r.key)}" type="url" maxlength="300" inputmode="url" value="${esc(taskUI.inputs[r.key] || '')}" placeholder="paste your x post link here" ${waiting ? 'disabled' : ''}>` : '<span class="hint">done it?</span>'}
      <button class="btn" data-saved-task="${esc(t.id)}" data-task-part="${esc(r.id)}" ${busy || waiting || retry || off ? 'disabled' : ''}>${waiting ? 'checking…' : telegram ? (r.type==='telegram_boost'?'check boost':'check membership') : 'check'}</button>
    </div>`;
  if(!done && st.reason && !['checking','verified'].includes(st.reason)) html += `<p class="task-note bad">${esc(taskReason(st.reason))}</p>`;
  return html;
}
function paintTaskPreview(){
  const page = document.getElementById('tasks-page');
  if(testPreview){ page.innerHTML = '<div class="h">tasks.</div><p class="fine">Owner preview is read-only. No real task checks run here.</p>'; return; }
  const data = taskUI.data, busy = taskUI.busy;
  const keep = page.querySelector('.task-list')?.scrollTop || 0;   // a repaint shouldn't jump the list
  const tasks = data?.tasks || [];
  // nothing chosen yet: the first task still to do opens, so the tray never starts as a list of shut doors
  if(!taskUI.opened && tasks.length){ const first = tasks.find(t => !taskPassed(t)) || tasks[0]; taskUI.open[first.id] = true; taskUI.opened = true; }
  const rows = tasks.map(t => {
    const parts = taskParts(t), done = taskPassed(t);
    const waiting = !done && parts.some(p => taskWaiting(p.st)), refused = !done && parts.some(p => taskRefused(p.st));
    const off = ['paused','expired'].includes(t.state);
    const open = !!taskUI.open[t.id] && !done;
    const cls = (done ? ' done' : waiting ? ' waiting' : refused ? ' refused' : '') + (off ? ' off' : '') + (open ? ' open' : '');
    const due = t.rule.deadline ? `<span class="due">by ${esc(new Date(t.rule.deadline * 1000).toLocaleDateString('en-US', { month:'short', day:'numeric' }).toLowerCase())}</span>` : '';
    return `<div class="task${cls}" data-task-open="${esc(t.id)}" role="button" aria-expanded="${open}">
        <span class="tick" aria-hidden="true"></span>
        <span class="what">${esc(t.rule.title)}</span>
        ${off ? `<span class="due">${esc(t.state)}</span>` : due}
        <span class="chev" aria-hidden="true">${CHEVRON}</span>
      </div>`
      + (open ? `<div class="task-body">
        ${t.rule.instructions ? `<p class="brief">${esc(t.rule.instructions)}</p>` : ''}
        ${parts.map(r => taskActionRow(t, r, data, busy, done)).join('')}
      </div>` : '');
  }).join('') || '<p class="fine">nothing published yet.</p>';
  // the count sits on the heading's line: the clipboard has no room to spend on two
  page.innerHTML = `<div class="task-head"><div class="h">tasks.</div><p class="sub">${data ? `${data.completed} of ${data.total} done.` : '…'}</p></div>`
    + `<div class="task-scroll"><div class="task-list">${rows}</div></div>`
    + `<p class="fine">${esc(taskUI.error || 'the department checks what it can and takes your word for the rest.')}</p>`;
  caseButtons(page);
  page.querySelector('.task-list').scrollTop = keep;
}
// a task's line opens and shuts it. its controls are their own
document.addEventListener('click', e => {
  const row = e.target.closest('[data-task-open]'); if(!row || e.target.closest('a, button, input')) return;
  const id = row.dataset.taskOpen; taskUI.open[id] = !taskUI.open[id]; taskUI.opened = true;
  if(tasksOpen) paintTaskPreview();
});
document.addEventListener('input',e=>{if(e.target.matches('[data-task-url]')){taskUI.inputs[e.target.dataset.taskUrl]=e.target.value;delete taskUI.requests[e.target.dataset.taskUrl];}});
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-telegram]');if(!button)return;
 e.preventDefault();e.stopImmediatePropagation();if(testPreview||taskUI.busy||!identity?.user?.alias)return;
 const owner=identity.user.id,ticket=++taskUI.ticket;taskUI.busy=true;taskUI.error='';paintTaskPreview();
 try{
  if(button.dataset.telegram==='connect'){
   const result=await API.connectTelegram();if(ticket!==taskUI.ticket||identity?.user?.id!==owner)return;
   const url=new URL(result.url);if(url.origin!=='https://t.me')throw new Error('Invalid Telegram link');
   taskUI.telegramUrl=url.href;
  }else {await API.confirmTelegram();if(ticket!==taskUI.ticket||identity?.user?.id!==owner)return;const next=await API.tasks();if(ticket!==taskUI.ticket||identity?.user?.id!==owner)return;taskUI.data=next;taskUI.telegramUrl=null;}
 }catch(error){if(ticket===taskUI.ticket){taskUI.error=taskReason(error.code);if(error.code==='telegram_link_expired')taskUI.telegramUrl=null;}}
 finally{if(ticket===taskUI.ticket){taskUI.busy=false;if(tasksOpen)paintTaskPreview();}}
});
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-saved-task],[data-task-refresh]');if(!button)return;
 e.preventDefault();e.stopImmediatePropagation();if(testPreview||taskUI.busy||!identity?.user?.alias)return;
 if(button.hasAttribute('data-task-refresh')){await loadSavedTasks();return;}
 const t=taskUI.data?.tasks.find(t=>t.id===button.dataset.savedTask);if(!t)return;
 const ticket=++taskUI.ticket,owner=identity.user.id;taskUI.busy=true;taskUI.error='';
 const partId=button.dataset.taskPart||'',rule=t.rule.type==='combined'?t.rule.requirements.find(r=>r.id===partId):t.rule;if(!rule)return;const key=t.id+(partId?':'+partId:'');
 const requestId=taskUI.requests[key]||crypto.randomUUID();taskUI.requests[key]=requestId;paintTaskPreview();
 try{const result=await API.checkTask({taskId:t.id,version:t.version,requestId,...(partId?{requirementId:partId}:{}),...(['post','reply','quote'].includes(rule.type)?{postUrl:taskUI.inputs[key]||''}:{})});if(ticket!==taskUI.ticket||identity?.user?.id!==owner)return;if(result.owner!==owner){clearIdentityView();await refreshIdentity();return;}taskUI.data=result;delete taskUI.requests[key];if(rule.type==='telegram_boost'){const points=await API.engagement();if(ticket===taskUI.ticket&&identity?.user?.id===owner)adoptEngagement(points);}}
 catch(e){if(ticket===taskUI.ticket)taskUI.error=e.code==='invalid_post_url'?'Enter a public X or Twitter status URL.':taskReason(e.code);}
 finally{if(ticket===taskUI.ticket){taskUI.busy=false;if(tasksOpen)paintTaskPreview();}}
});
document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-identity]');if(!button)return;
  e.preventDefault();e.stopImmediatePropagation();
  const action=button.dataset.identity;
  if(testPreview) return; // All authentic actions remain outside the disposable walkthrough.
  if(action==='gallery'){openGallery();return;}
  if(action==='interview'){openSavedInterview();return;}
  if(action==='case'){leaveInterviewView();openFolder(false);dlgShow(false);return;}
  if(action==='tasks'){openTasks();return;}
  if(action==='close-case'){closeFolder();return;}
  if(identityBusy)return;
  identityError='';
  if(action==='retry'){await refreshIdentity();return;}
  identityBusy=true;button.disabled=true;
  const epoch=++identityEpoch;
  try{
    if(action==='login'){
      // Begin is server validated; clear local account before leaving this page.
      await API.connectX();clearIdentityView();
    }
    if(action==='alias'){
      const alias=document.getElementById('identity-alias')?.value||'';
      const result=await API.confirmAlias(alias);if(epoch!==identityEpoch)return;
      acceptIdentity(result);identityChannel?.postMessage('changed');
      autoInterview=savedDraft()&&identity.draft.status!=='submitted'&&identity.campaign.status==='open';
      const room=document.getElementById('s-room');room.classList.add('landing');setTimeout(()=>room.classList.remove('landing'),700);
    }
    if(action==='logout'){
      logoutPending=true;clearIdentityView();identityChannel?.postMessage('changed');
      await API.logout();if(epoch!==identityEpoch)return;
      logoutPending=false;identityChannel?.postMessage('changed');
      identityBusy=false;await refreshIdentity();return;
    }
  }catch(error){
    if(epoch!==identityEpoch)return;
    if(action==='alias'&&error.code==='application_submitted'){
      // A stale tab may still offer alias confirmation after another tab files.
      // Recover the authoritative read-only case; never alter the filed alias.
      identityBusy=false;await refreshIdentity();return;
    }
    if(action==='login'&&error.code==='login_paused'){
      identityBusy=false;await refreshIdentity();identityError='login_paused';dlgRender();return;
    }
    if(action==='logout') identityError='logout_failed';
    else if(error.status===401||error.status===403){clearIdentityView();identityError=error.code;}
    else identityError=error.code;
    identityReady=true;
  }finally{identityBusy=false;if(epoch===identityEpoch){dlgRender();dlgShow(true);}}
},true);
document.addEventListener('input',e=>{
  if(e.target.id==='identity-alias'&&identity?.user)aliasInput={owner:identity.user.id,value:e.target.value};
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='identity-alias'){e.preventDefault();dlgEl.querySelector('[data-identity="alias"]')?.click();}
});
identityChannel?.addEventListener('message',()=>{identityEpoch++;clearIdentityView();refreshIdentity();});
/* coming back to the tab: the session is read again, quietly. the room is not touched unless the
   answer differs from what it was — another account, a filed case, the interviews closing. the same
   answer only moves the session's clock on. nothing is hidden while the check is out; a blink on every
   return read as the page reloading. */
const identitySig = v => JSON.stringify([v?.user?.id, v?.user?.alias, v?.user?.handle, v?.draft?.id, v?.draft?.status, v?.campaign?.status, v?.loginEnabled, v?.loginUnavailableReason]);
function adoptIdentity(value){   // the same session, later: keep it, reset its clock, redraw nothing
  identity = value; identityReady = true;
  if(value.expiresAt){
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(()=>{ identityEpoch++; clearIdentityView(true); identityReady=true; identityError='sign_in_required'; dlgRender(); },Math.max(0,value.expiresAt*1000-Date.now()));
  }
}
async function recheckVisibleIdentity(){
  if(document.hidden||logoutPending)return;
  const epoch=++identityEpoch, before=identity?.user?.id, was=identitySig(identity);
  try{
    const value=await API.session();if(epoch!==identityEpoch)return;
    if(before!==value.user?.id){clearIdentityView(true);acceptIdentity(value);dlgRender();if(scene==='room')dlgShow(S.rung&&!folderOpen);}
    else if(identitySig(value)!==was){acceptIdentity(value);if(!interviewUI.open)dlgRender();if(scene==='room')dlgShow(S.rung&&!folderOpen);}
    else adoptIdentity(value);
    document.body.classList.remove('session-checking');
  }catch(_){identityError='connection_unavailable';document.body.classList.add('session-checking');}
}
addEventListener('pageshow',e=>{if(e.persisted)recheckVisibleIdentity();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){setOwnerTestAllowed(false);discardTestPreview();closeTestControls();}   // nothing is hidden for the check: see recheckVisibleIdentity
  else recheckVisibleIdentity();
});

/* ---------------- owner-only disposable walkthrough ---------------- */
// Capability is checked by the server against staging configuration and stable X identity.
// It is not a grant to any business endpoint; preview writes are disabled at the API boundary.
function setOwnerTestAllowed(value){
  ownerTestAllowed = false; // Application reset is available only in admin Cases.
  document.getElementById('owner-tests-open').hidden = !ownerTestAllowed;
}
async function refreshOwnerTestCapability(){ setOwnerTestAllowed(false); }
function paintTestControls(){
  const banner = document.getElementById('test-preview-banner');
  banner.hidden = !testPreview;
  document.body.classList.toggle('test-preview',!!testPreview);
  banner.textContent = testPreview ? 'TEST PREVIEW — does not change your saved case · '+testPreview.state.replaceAll('_',' ') : '';
  document.getElementById('test-state').value = testPreview?.state || 'not_open';
  document.getElementById('test-state').disabled = !testPreview || ownerTestBusy;
  document.getElementById('test-exit').hidden = !testPreview;
  testControlsEl.querySelectorAll('[data-test-action]').forEach(b=>b.disabled=ownerTestBusy);
}
function closeTestControls(){
  testControlsOpen = false; testControlsEl.classList.remove('on');

}
function discardTestPreview(){
  if(testPreview){ S = realWalkthrough; realWalkthrough = null; testPreview = null; }
  API.setTestPreview(false); vitemEl.classList.toggle('on',!!S.vent?.dropped); paintTestControls();
}
function closeWalkthroughViews(){
  closeVent(); closeInspect(); closeGallery(); closeNotices(); closeTasks(); closeSocials(); closeMenu(); closeFolder();
}
async function authorizedTestAction(action){
  if(!ownerTestAllowed || ownerTestBusy) return;
  const epoch = identityEpoch;
  ownerTestBusy = true; paintTestControls();
  try{
    const capability = await API.testControls();
    if(epoch !== identityEpoch) return;
    if(!capability.enabled || capability.expiresAt * 1000 <= Date.now()) throw Error('denied');
    await action();
  }catch(_){
    if(epoch === identityEpoch){
      discardTestPreview(); closeTestControls(); setOwnerTestAllowed(false);
      await refreshIdentity();
    }
  }finally{ ownerTestBusy = false; paintTestControls(); }
}
document.getElementById('owner-tests-open').addEventListener('click',()=>authorizedTestAction(()=>{
  testControlsOpen = true; testControlsEl.classList.add('on'); paintTestControls();
}));
document.getElementById('test-close').addEventListener('click', closeTestControls);
document.getElementById('test-state').addEventListener('change',e=>{
  const state = e.target.value;
  if(!['not_open','open','closed'].includes(state)) return;
  authorizedTestAction(()=>{ if(testPreview){ testPreview.state = state; testPreview.greeted = true; dlgRender(); } });
});
document.addEventListener('click',e=>{
  const button = e.target.closest('[data-test-action]'); if(!button || button.disabled) return;
  e.preventDefault(); e.stopPropagation();
  const action = button.dataset.testAction;
  if(action === 'greet'){ if(testPreview){ testPreview.greeted = true; dlgRender(); } return; }
  if(action === 'exit'){
    closeWalkthroughViews(); discardTestPreview(); closeTestControls();
    vitemEl.classList.toggle('on', !!S.vent?.dropped);
    refreshIdentity().then(()=>enterRoom());
  }
});
addEventListener('keydown',e=>{ if(e.key === 'Escape' && testControlsOpen){ e.preventDefault(); closeTestControls(); } });


/* ---------------- persisted, non-branching interview ---------------- */
let filedLine=null;   // the case just filed, for the clerk's one line about it
// the written response stops here, whatever the server would take: the box will not accept more
const WRITTEN_MAX = 250;
const writtenLimit = r => Math.min(WRITTEN_MAX, r?.allocation?.writtenLimit || WRITTEN_MAX);
/* the written prompts as the site says them: two of the published ones are shown in a shorter wording that fits one
   line on a phone's button ("why should we let you in?" keeps its published text). matched on the published text,
   so a prompt reworded in the admin is shown as written there, and these entries simply stop matching. the saved
   record keeps the published text */
const PROMPT_SHORT = {
  "what would make this a community you'd actually stick around for?": "what makes you stay in a community?",
  "describe your online personality in one sentence.": "describe your online personality."
};
const promptText = p => p ? (PROMPT_SHORT[String(p.text || "").trim().replace(/\s+/g, " ").replace(/[‘’]/g, "'").toLowerCase()] || p.text) : "";
const interviewUI={owner:null,record:null,index:0,open:false,busy:false,dirty:false,input:{},message:'',latest:null,ticket:0,reaction:'',choosingPrompt:false,transition:false,redo:false,redoWallets:false,blankEvm:false,bubbleKey:'',application:null};
// Reuse the designer's clerk/choices while answering and the existing case paper for review.
const interviewPanel=document.createElement('section');
interviewPanel.id='saved-interview';interviewPanel.hidden=true;interviewPanel.setAttribute('aria-label','saved interview');folderEl.append(interviewPanel);
const interviewMessages={application_submitted:'This application has been submitted and is now read-only. Close and reopen your case to see the receipt.',interviews_closed:'Interviews are closed to changes. Your typed answer is still here; your saved answers remain safe.',content_not_ready:'The published question set is not ready. Nothing has been allocated.',revision_conflict:'Another tab changed this interview. Refresh to load saved progress; copy any unsaved text first.',sign_in_required:'Your session ended. Your input remains in this tab until you leave. Signing in navigates away; copy any unsaved text first.',invalid_answer:'Choose an option or prompt from this interview.',invalid_step:'That is not available from this step yet.',invalid_content:'Write 1–250 characters, excluding outer whitespace. Do not use control characters.',limit_reached:'Too many saves. Wait a minute and retry.',writes_paused:'Saving is paused. Your input remains here.',connection_unavailable:'Could not confirm the save. Your input remains here. Retry safely.',temporarily_unavailable:'The interview service is unavailable. Your input remains here. Retry later.'};
/* out of sight, still going: everything the applicant had typed or chosen stays where it is. */
function stowInterviewView(){
 if(typing){typing.cancel?.();typing=null;}
 clearTimeout(fadeTimer); clearInterjection();
 dlgShow(false);
 folderOpen=false; folderEl.classList.remove('on');
}
function leaveInterviewView(){
 interviewUI.open=false;interviewUI.bubbleKey='';interviewPanel.hidden=true;folderEl.classList.remove('interview-review');dlgEl.classList.remove('interview-conversation');
 if(typing){typing.cancel?.();typing=null;}clearTimeout(fadeTimer);clearInterjection();
 if(dlgEl.contains(interviewPanel)){dlgShow(false);bubEl.replaceChildren();folderEl.append(interviewPanel);}
}
function clearInterviewView(){
 leaveInterviewView();interviewUI.ticket++;Object.assign(interviewUI,{owner:null,record:null,index:0,busy:false,dirty:false,input:{},latest:null,message:'',reaction:'',choosingPrompt:false,transition:false,redo:false,redoWallets:false,blankEvm:false,application:null});interviewPanel.replaceChildren();
}
function interviewInput(){
 const r=interviewUI.record;if(!r)return;
 // after a start-over the server still holds the old prompt and text; here they are asked again as the first time
 interviewUI.input=interviewUI.index<3?{optionId:r.answers[r.allocation.questions[interviewUI.index].id]||''}:{promptId:r.promptId||r.allocation.prompts[0].id,text:interviewUI.redo?'':(r.written||'')};
 interviewUI.choosingPrompt=interviewUI.index===3&&(!r.promptId||interviewUI.redo);interviewUI.dirty=false;
}
/* the paper shows what a reader needs: the prompt and what was written. the three multiple choice
   answers are in the file and on the server, but reading them back changes nothing and crowds out
   the one answer that is actually the applicant's own words. */
function savedInterviewSummary(r){
 return `<h3>${esc(promptText(r.allocation.prompts.find(p=>p.id===r.promptId))||'Written response')}</h3><p class="written-answer">${esc(r.written||'Not answered')}</p>`;
}
function interviewButton(action,label,disabled=false,key='',extra='',go=false){
 return `<button class="ch${go?' go':''}${key?'':' solo'}" data-interview="${action}" ${disabled?'disabled':''} ${extra}>${key?`<span class="k" aria-hidden="true">${key}</span>`:''}<span>${esc(label)}</span></button>`;
}
function renderSavedInterview(){
 clearBeat();
 if(!interviewUI.open||!savedDraft())return;
 const r=interviewUI.record,step=interviewUI.index,busy=interviewUI.busy,closed=identity.campaign.status!=='open';
 const status=interviewUI.message||(busy?'Saving…':interviewUI.dirty?'Unsaved changes':'');
 if(step===4&&r?.completedAt&&r.phase!=='written_review'&&!interviewUI.reaction&&interviewUI.application?.view!=='review'&&interviewUI.application?.data.status!=='submitted')return renderMintConversation(status,closed);
 if(step===4&&r&&r.phase!=='written_review'&&!interviewUI.reaction){
  if(typing){typing.cancel?.();typing=null;}clearInterjection();dlgShow(false);dlgEl.classList.remove('interview-conversation');interviewUI.bubbleKey='';
  if(reviewPaperUp()){showReviewPaper(status);return;}   // the unfiled case is a paper, not a folder
  if(!folderOpen)openFolder(false);else paintSavedDraft();setFolderPage(1);
  const page=document.getElementById('page');page.replaceChildren(interviewPanel);folderEl.classList.add('interview-review');
  renderApplicationPage(r,status,closed);
  interviewPanel.hidden=false;page.scrollTop=0;return;
 }
 if(folderOpen){closeFolder();interviewUI.open=true;}
 folderEl.classList.remove('interview-review');
 let says,rows='',progress='',chain=null;   // chain: what he does after the last line, with nothing to press
 if(!r){
  // he says what it is and starts, unless the interviews are closed
  says=r?.allocation?.dialogue?.interviewStart||"three questions and one written response. let's get started.";
  if(!closed)chain=()=>runInterviewAction('start');
 }else if(r.phase==='mc_review'){
  // the reaction to the third answer, then the one place to change your mind before the written
  // part: "changed my mind" starts the three questions over, "yes" goes on
  says=[interviewUI.reaction||r.allocation.questions[2].options.find(o=>o.id===r.answers[r.allocation.questions[2].id])?.reaction,r.allocation.dialogue?.answersReview||'are these your final answers?'].filter(Boolean);
  rows=interviewButton('advance','yes',busy||closed,'▸','',true)+interviewButton('restart-mc','changed my mind',busy||closed,'↩');
 }else if(r.phase==='written_review'){
  // the statement is in: he takes it, and offers the way back to it or the way on
  says=[r.allocation.prompts.find(p=>p.id===r.promptId)?.reaction||r.allocation.dialogue?.writtenFallback||'hm. interesting. this goes on the file.',r.allocation.secondTransition?.text].filter(Boolean);
  rows=interviewButton('advance','next',busy||closed,'▸','',true)+interviewButton('edit-written','edit',busy||closed,'↩');
 }else if(step<3){
  // the clerk's reaction to the last answer is the first line of the next question's bubble, as
  // it is in the designer's build: one "next", then the question, not a beat with its own button
  const q=r.allocation.questions[step];says=[interviewUI.reaction,q.text].filter(Boolean);progress=`Question ${step+1}/3`;
  // an answer pressed is an answer given: the choices go at once, rather than sitting greyed out for the
  // round trip; they come back only if the save is refused
  rows=busy?'':q.options.map((o,i)=>interviewButton('answer',o.text,closed,String.fromCharCode(65+i),`data-option="${esc(o.id)}" aria-pressed="${interviewUI.input.optionId===o.id}"`)).join('');
 }else if(interviewUI.choosingPrompt){
  // the turn to the written part is said once, on the way in from the answers; picking a different
  // prompt later comes back here without it
  says=[interviewUI.reaction,interviewUI.transition?(r.allocation.firstTransition?.text||r.allocation.dialogue?.mcTransition||'next, your written statement.'):'',r.allocation.dialogue?.promptChoice||'pick something to answer. keep it short, our attention span is under review.'].filter(Boolean);progress='Written response';
  rows=r.allocation.prompts.map(p=>interviewButton('prompt',promptText(p),busy,'▸',`data-interview-prompt="${esc(p.id)}"`)).join('');
 }else{
  says=promptText(r.allocation.prompts.find(p=>p.id===interviewUI.input.promptId))||r.allocation.dialogue?.writtenEntry||'go ahead. i’ll write it down exactly as you say it.';progress='Written response';
  rows=`<label class="field wide stack"><span class="interview-sr">Your written response</span><textarea class="din" id="interview-written" rows="4" maxlength="${writtenLimit(r)}" placeholder="one or two sentences." ${busy?'disabled':''}>${esc(interviewUI.input.text||'')}</textarea><span class="dcount corner"><span id="interview-count">${[...(interviewUI.input.text||'').normalize('NFC').trim()].length}</span>/${writtenLimit(r)}</span></label><div class="drow wide">${interviewButton('choose-prompt','back',busy,'↩')}<button class="dbtn" data-interview="save" ${busy||closed?'disabled':''}>${busy?'Saving…':'Continue'}</button></div>`;
 }
 // no progress or status line under the rows: the footnote under the clerk's own panel is the only
 // small print he keeps. anything that went wrong is said as an error, in the panel's own place.
 // a new bubble starts at its first line; "next" moves through the rest of it
 const bubble=JSON.stringify([step,interviewUI.reaction,interviewUI.choosingPrompt,says]);
 if(bubble!==interviewUI.bubbleId){interviewUI.bubbleId=bubble;S.b=0;}
 const err=status&&!/^(Saving|Checking|Loading|Unsaved|Saved)/.test(status)?esc(status):'';
 // the questions and the prompt choice play their lines through by themselves; only the written
 // review and what comes after keep a "next"
 const auto=!r||r.phase==='mc_review'||step<3||interviewUI.choosingPrompt;
 const html=dlgPanel({says,rows,err,note:closed?'read-only while interviews are closed. your saved answers remain available.':undefined,auto});
 const key=bubble+S.b,fresh=key!==interviewUI.bubbleKey;
 const animate=fresh&&!busy;
 // a new line that comes up while a load or a save is out is held back and typed once it is in, not written out
 // whole and marked as said (it never typed after that: the next render found its key already taken)
 const held=fresh&&busy;if(!held)interviewUI.bubbleKey=key;
 /* the rows are marked not-ready before they are written, so they are born hidden and rise
    once. written first, they paint at full opacity and then have to be animated away again,
    which reads as the buttons flashing and dropping out from under the pointer. */
 if(animate)dlgEl.classList.remove('ready');
 if(typing){typing.cancel?.();typing=null;}clearTimeout(fadeTimer);clearInterjection();
 bubEl.innerHTML=html.bubble;dlgEl.replaceChildren(interviewPanel);dlgEl.classList.add('interview-conversation');
 dlgEl.classList.remove('line-leaves');
 interviewPanel.className='';interviewPanel.innerHTML=html.dlg;
 /* no saving, reloading or reviewing chrome under the questions: every answer is already written to
    the server as it is given, and the interview is two minutes long. a revision clash is a stale tab,
    which the team handles by reloading rather than by asking the applicant to arbitrate. */
 caseButtons(interviewPanel);   // last write before the panel shows, so the appended rows are cased too
 interviewPanel.hidden=false;dlgShow(true);
 const more=()=>{S.b++;renderSavedInterview();};
 if(held){bubEl.classList.remove('on');}   // nothing said until it can be said properly
 else if(animate)typeOut(()=>{dlgEl.classList.add('ready');afterLine(html,more,chain);});
 else{bubEl.querySelectorAll('[data-type]').forEach(el=>el.textContent=el.dataset.type);dlgEl.classList.add('ready');if(!busy)afterLine(html,more,chain);}   // nothing is armed while a save is out
 dlgEl.scrollTop=0;paintDesk();
}
async function openSavedInterview(){
 if(!savedDraft()||testPreview)return;
 closeWalkthroughViews();show('room');interviewUI.open=true;
 const owner=identity.user.id;
 if(interviewUI.owner===owner&&interviewUI.dirty){renderSavedInterview();return;}
 if(interviewUI.application&&interviewUI.application.data.status!=='submitted')interviewUI.application.view='conversation';
 interviewUI.owner=owner;interviewUI.reaction='';const ticket=++interviewUI.ticket;interviewUI.busy=true;interviewUI.message='Loading saved interview…';renderSavedInterview();
 try{const [v,a]=await Promise.all([API.interview(),API.application()]);if(ticket!==interviewUI.ticket||owner!==identity?.user?.id)return;interviewUI.record=v.interview;acceptApplication(a);identity.campaign.status=v.campaign.status;interviewUI.index=v.interview?(v.interview.phase==='mc_review'||v.interview.phase==='written'?3:v.interview.completedAt?4:Math.min(3,v.interview.allocation.questions.findIndex(q=>!v.interview.answers[q.id])<0?3:v.interview.allocation.questions.findIndex(q=>!v.interview.answers[q.id]))):0;interviewInput();interviewUI.message='';}
 catch(e){if(ticket===interviewUI.ticket)interviewUI.message=interviewMessages[e.code]||'Interview unavailable. Close and retry.';}
 finally{if(ticket===interviewUI.ticket){interviewUI.busy=false;renderSavedInterview();}}
}
interviewPanel.addEventListener('input',e=>{
 if(e.target.id!=='interview-written')return;
 if([...e.target.value].length>writtenLimit(interviewUI.record))e.target.value=[...e.target.value].slice(0,writtenLimit(interviewUI.record)).join('');   // a paste past the limit is cut at it
 interviewUI.input.text=e.target.value;document.getElementById('interview-count').textContent=[...e.target.value.normalize('NFC').trim()].length;
 interviewUI.dirty=true;
});
interviewPanel.addEventListener('click',async e=>{
 const button=e.target.closest('[data-interview]');if(!button||button.disabled||interviewUI.busy||testPreview)return;
 e.stopPropagation();if(typing){skipType();return;}
 runInterviewAction(button.dataset.interview,button);
});
// the same actions, run by a button or by the clerk himself once a line has been read
async function runInterviewAction(action,button){
 if(interviewUI.busy||testPreview||!interviewUI.open)return;
 if(interviewUI.application?.data.status==='submitted'&&action!=='close')return;
 if(action==='close'){leaveInterviewView();if(folderOpen)closeFolder();else{dlgRender();dlgShow(true);}return;}
 if(action==='choose-prompt'){interviewUI.choosingPrompt=true;interviewUI.transition=false;renderSavedInterview();return;}
 if(action==='prompt'){interviewUI.input.promptId=button.dataset.interviewPrompt;interviewUI.choosingPrompt=false;interviewUI.transition=false;interviewUI.dirty=true;renderSavedInterview();return;}
 if(['edit','back','review'].includes(action)){
  if(interviewUI.dirty&&!confirm('Discard this unsaved edit and show saved answers?'))return;
  interviewUI.index=action==='edit'?Number(button.dataset.step):action==='back'&&interviewUI.index?interviewUI.index-1:4;interviewUI.message='';interviewUI.reaction='';interviewInput();renderSavedInterview();return;
 }
 if(action==='answer'){interviewUI.input.optionId=button.dataset.option;interviewUI.dirty=true;action='save';}
 const owner=identity?.user?.id,ticket=++interviewUI.ticket,step=interviewUI.index;
 if(action==='save'){
  if(step<3&&!interviewUI.input.optionId){interviewUI.message='Select one answer.';renderSavedInterview();return;}
  if(step===3){const t=(interviewUI.input.text||'').normalize('NFC').trim();if(!t||[...t].length>writtenLimit(interviewUI.record)){interviewUI.message=interviewMessages.invalid_content;renderSavedInterview();return;}}
 }
 interviewUI.busy=true;interviewUI.message=action==='save'?'Saving…':'Checking…';renderSavedInterview();
 try{
  const old=interviewUI.record;
  const v=action==='start'?await API.startInterview():action==='restart-mc'?await API.restartInterview({revision:old.revision}):action==='advance'?await API.advanceInterview({revision:old.revision}):action==='edit-written'?await API.editWrittenInterview({revision:old.revision}):await saveInterviewStep(step);
  if(ticket!==interviewUI.ticket||owner!==identity?.user?.id)return;
  identity.campaign.status=v.campaign.status;
  if(interviewUI.application)interviewUI.application.review=null;
  interviewUI.record=v.interview;interviewUI.index=action==='start'||action==='restart-mc'?0:action==='edit-written'?3:action==='advance'?(v.interview.phase==='written'?3:4):step+1;interviewUI.latest=null;
  interviewUI.reaction=step<3&&action==='save'?v.interview.allocation.questions[step].options.find(o=>o.id===v.interview.answers[v.interview.allocation.questions[step].id])?.reaction||'':'';
  if(action==='restart-mc')interviewUI.reaction='from the top, then.';   // the first question again, with a word first
  if(action==='advance'&&v.interview.phase==='written')interviewUI.transition=true;   // the turn to the written part gets said on the way in
  if(action==='save'&&step===3)interviewUI.redo=false;   // the new statement is in; editing it from here keeps it
  interviewUI.message=action==='save'?'Saved. Your response is recorded.':'';interviewInput();
  if(interviewUI.index===4&&v.interview.phase!=='written_review'){
   const firstCompletion=(action==='save'&&step===3&&!old.completedAt)||action==='advance';
   // A read failure after the acknowledged written save must not open the folder.
   if(interviewUI.application){
    interviewUI.application.view='conversation';
    interviewUI.application.beat=mintEntry(interviewUI.application.data.addresses,firstCompletion);S.b=0;
   }
   const application=await API.application();if(ticket!==interviewUI.ticket||owner!==identity?.user?.id)return;
   acceptApplication(application);
   if(application.status!=='submitted'&&firstCompletion)interviewUI.application.beat=mintEntry(application.addresses,true);
   if(interviewUI.redoWallets){interviewUI.application.input={solana:'',evm:''};interviewUI.redoWallets=false;interviewUI.blankEvm=true;}   // the wallets are asked again, blank (both: see blankEvm)
  }
 }catch(e){if(ticket===interviewUI.ticket)interviewUI.message=interviewMessages[e.code]||'Save not confirmed. Your input remains here; retry.';}
 finally{if(ticket===interviewUI.ticket){interviewUI.busy=false;renderSavedInterview();}}
}
addEventListener('beforeunload',e=>{if(interviewUI.dirty||interviewRecovery?.dirty){e.preventDefault();e.returnValue='';}});

/* ---------------- nominated mint addresses and final filing ---------------- */
/* a wrong address: the clerk says so, in the bubble. the admin's wallet dialogue (invalid_solana_address,
   invalid_evm_address) takes precedence when it is set; these are the department's defaults. */
const CLERK_WRONG_ADDRESS={solana:"that isn't a solana address. paste the whole thing, no 0x. try again.",
                           evm:"that isn't an EVM address. 0x and forty characters after it. try again."};
const filingMessages={invalid_solana_address:'Enter a complete Solana public address in Base58 format.',invalid_evm_address:'Enter a complete EVM public address. Mixed-case addresses must have a valid checksum.',addresses_required:'Save both valid addresses before review.',interview_incomplete:'Complete and save all three answers and the written response first.',revision_conflict:'Saved details changed in another tab. Reload saved details and review again before submitting.',application_submitted:'This application is already submitted. Reload saved details to see the receipt.',applications_closed:'Applications are closed to changes. Your saved case is still available.',filing_paused:'Address saving and filing are not enabled for this testing session.',writes_paused:'Saving is paused. Your saved case is safe.',invalid_request:'Reload the saved review before submitting.',invalid_revision:'Reload saved details before saving.',...interviewMessages};
function acceptApplication(data){
 if(data.campaign)identity.campaign.status=data.campaign.status;
 S.b=0;
 interviewUI.application={data,view:data.status==='submitted'?'receipt':'conversation',beat:nextMintStep(data.addresses),input:{solana:data.addresses?.solana||'',evm:data.addresses?.evm||''},review:null};
 if(data.status==='submitted'){identity.draft.status='submitted';interviewUI.dirty=false;interviewUI.index=4;}
}
/* no copy button: the address came out of a wallet the applicant already has open, and the one
   place it matters is here, where they are checking it reads right before filing. */
function mintFields(m){
 return ['solana','evm'].map(k=>`<div class="mint-address"><h3>${k==='solana'?'Solana':'EVM'} mint address — nominated, unverified</h3><p class="full-address">${esc(m[k])}</p></div>`).join('');
}
function exactReview(s){return `<div class="gf">${field('fomies alias',esc(s.identity.alias))}${field('x account',esc(s.identity.handle))}</div>${savedInterviewSummary(s.interview)}${mintFields(s.destinations)}`;}
/* the review paper: the department's form dof-3b, filled in from the review snapshot the server
   returned. one page, the case on it, and the two things there are to do with it. it is a loose
   paper on the desk rather than a page in the folder because nothing is filed yet. */
function paperReview(s,status,busy,closed){
 const writeable = interviewUI.application?.data.writeEnabled && !closed;
 const prompt = s.interview.allocation.prompts.find(p => p.id === s.interview.promptId);
 const hl = v => `<mark class="hl">${v}</mark>`;
 return `${govHead()}
  <div class="gtitle">review your case.</div>
  <div class="gf">
   ${field("alias", hl(esc(s.identity.alias)))}${field("account", esc(s.identity.handle))}
   ${walletField("solana wallet", s.destinations.solana, !PORTRAIT.matches)}
   ${walletField("EVM wallet", s.destinations.evm, !PORTRAIT.matches)}
   ${prompt ? statementField(promptText(prompt), hl(esc(s.interview.written))) : ""}
  </div>
  <p class="fine">everything here can still be corrected. after filing, it can't. submission does not guarantee a whitelist spot.</p>
  ${status ? `<p class="fine" role="status">${esc(status)}</p>` : ""}
  <div class="spacer"></div>
  ${interviewUI.application?.confirm
   ? `<div class="gtitle ask">start over?</div>
  <p class="pg">everything goes in the bin. answers, statement, wallets.</p>
  <div class="row bottom">
   <button class="btn" data-paper="restart" ${busy || !writeable ? "disabled" : ""}>${busy ? "starting over…" : "yes, start over"}</button>
   <button class="btn ghost" data-filing="submit" ${busy || !writeable ? "disabled" : ""}>${busy ? "filing…" : "file it"}</button>
  </div>`
   : `<div class="row bottom">
   <button class="btn" data-filing="submit" ${busy || !writeable ? "disabled" : ""}>${busy ? "filing…" : "file it"}</button>
   <button class="btn ghost" data-paper="startover" ${busy || !writeable ? "disabled" : ""}>start over</button>
  </div>`}`;   // no form number, revision or page count under the buttons: they are the foot of this paper
}
/* the paper's other pages, for editing what is on it: the department's forms dof-2 and dof-3b, read
   from the saved record and written back to the server as each answer is given. the chain is the
   designer's: review -> notice of classification -> statement -> assessment, and back up. */
function paperResult(r,status){
 const c=CLASSES[classify(r)]||CLASSES.question;
 return `${stepHead("form dof-2","notice of classification.")}
  <p class="pg">assessment complete. the department has classified you as:</p>
  <div class="gf"><div class="f w"><span class="l">classification</span><span class="v" style="font-size:1.35em">${esc(c.name)}</span></div></div>
  <p class="pg">${esc(c.desc)}</p>
  <p class="sub">derived from your answers. the clerk has no opinion.</p>
  ${status?`<p class="fine" role="status">${esc(status)}</p>`:""}
  <div class="spacer"></div>
  <div class="row">
   <button class="btn" data-paper="review">file my application</button>
   <button class="btn ghost" data-paper="statement">edit my statement</button>
  </div>`;
}
function paperStatement(r,e,status,busy,closed){
 const limit=writtenLimit(r), p=r.allocation.prompts.find(x=>x.id===e.promptId), n=(e.text||'').trim().length;
 return `${stepHead("form dof-3b","section 3 &middot; statement.")}
  ${r.allocation.prompts.map(x=>`<button class="opt ${e.promptId===x.id?"on":""}" data-paper="prompt" data-pid="${esc(x.id)}" ${busy?"disabled":""}><span class="box"></span><span>${esc(promptText(x))}</span></button>`).join("")}
  ${p?`<hr class="rule">
  <textarea class="in" id="paper-stmt" maxlength="${limit}" placeholder="one or two sentences." ${busy||closed?"disabled":""}>${esc(e.text||'')}</textarea>
  <div class="count"><span id="paper-cnt">${(e.text||'').length}</span> / ${limit}</div>`:""}
  ${status?`<p class="fine" role="status">${esc(status)}</p>`:""}
  <div class="spacer"></div>
  <div class="row">
   <button class="btn" data-paper="statement-done" ${(!p||n<3||busy||closed)?"disabled":""}>complete my assessment</button>
   <button class="btn ghost" data-paper="interview" ${busy?"disabled":""}>back</button>
  </div>`;
}
function paperInterview(r,e,status,busy,closed){
 const qs=r.allocation.questions;
 if(e.q>=3){
  return `${stepHead("form dof-3b","section 2 &middot; assessment, concluded.")}
   <p class="fine">answers are recorded. the committee reads them once.</p>
   ${status?`<p class="fine" role="status">${esc(status)}</p>`:""}
   <div class="spacer"></div>
   <div class="row">
    <button class="btn" data-paper="statement">continue</button>
    <button class="btn ghost" data-paper="redo" ${busy||closed?"disabled":""}>answer again</button>
   </div>`;
 }
 const q=qs[e.q];
 return `${stepHead("form dof-3b",`section 2 &middot; assessment. item ${e.q+1} of 3.`)}
  <div class="q">${esc(q.text)}</div>
  <hr class="rule">
  ${q.options.map(o=>`<button class="opt" data-paper="answer" data-option="${esc(o.id)}" ${busy||closed?"disabled":""}><span class="box"></span><span>${esc(o.text)}</span></button>`).join("")}
  ${status?`<p class="fine" role="status">${esc(status)}</p>`:""}
  <div class="spacer"></div>
  <p class="fine">answers are recorded. the committee reads them once.</p>`;
}
/* the filed case: the same form, stamped. drawn from the receipt the server keeps. */
function paperFiled(receipt){
 const sn=receipt.snapshot;
 const prompt=sn.interview.allocation.prompts.find(p=>p.id===sn.interview.promptId);
 const hl=v=>`<mark class="hl">${v}</mark>`, filedAt=fmtStamp(receipt.submittedAt*1000);
 const DEC={approved:["approved","approved"],waitlisted:["waitlisted","waitlisted"],declined:["not_selected","not selected"]}[receipt.decision];
 const stamps=`<span class="gstamp received">received<small>${filedAt}</small></span>`+(DEC?`<span class="gstamp ${DEC[0]}">${DEC[1]}</span>`:"");
 return `${govHead(receipt.caseNumber)}
  <div class="gtitle">application, filed.</div>
  <div class="gf">
   ${field("alias",hl(esc(sn.identity.alias)))}${field("account",esc(sn.identity.handle))}
   ${walletField("solana wallet",sn.destinations.solana,!PORTRAIT.matches)}
   ${walletField("EVM wallet",sn.destinations.evm,!PORTRAIT.matches)}
   ${prompt?statementField(promptText(prompt),hl(esc(sn.interview.written))):""}
  </div>
  <div class="office"><span class="l">for office use only</span>${stamps}</div>
  <p class="fine">whitelist decision: ${DEC?DEC[1]:"pending"}. nothing will happen fast. updates go on the noticeboard.</p>
  ${govFoot(1,1)}`;
}
/* the loose paper, not the folder: f-paper on its own, the page on it, no spread and no tabs. the
   same arrangement paint() gives an unfiled case in the designer's build. which of the paper's pages
   is up is a.paper; the review needs the server's snapshot, the others read the record and the
   applicant's edits. */
function showReviewPaper(status){
 const a=interviewUI.application, r=interviewUI.record, page=a.paper||'review';
 if(page==='review'&&!a.review) return;   // the snapshot is on its way; leave what is on screen
 if(!folderOpen) openFolder(false, true);   // silent: playReviewPaper() is the sound for this one
 resetFolderArt();
 folderEl.classList.remove('spread','interview-review');
 document.getElementById('f-filed').style.display='none';
 document.getElementById('f-paper').style.display='';
 document.getElementById('back').style.display='none';
 document.getElementById('f-back').style.display='none';
 document.querySelectorAll('.tab[data-tab]').forEach(t=>t.style.display='none');
 const pageEl=document.getElementById('page');
 parkPage(true); place(pageEl,CFG.page); pageEl.style.display='flex';
 pageEl.replaceChildren(interviewPanel);
 const busy=interviewUI.busy, closed=identity.campaign.status!=='open';
 const note=/^(Saving|Checking|Loading|Unsaved|Saved)/.test(status||'')?'':(status||'');   // the paper has no progress line, only what went wrong
 if(page!=='review'&&!a.edit) a.edit={q:3,promptId:r.promptId,text:r.written};
 interviewPanel.className='gov';
 // no caseButtons here: the clerk speaks in sentence case, the department's paperwork stays lowercase
 interviewPanel.innerHTML=page==='review'?paperReview(a.review.snapshot,note,busy,closed)
  :page==='result'?paperResult(r,note)
  :page==='statement'?paperStatement(r,a.edit,note,busy,closed)
  :paperInterview(r,a.edit,note,busy,closed);
 fitWallets();
 interviewPanel.hidden=false; pageEl.scrollTop=0;
 setFolderPage(0); paintCard(); paintDesk();
}
const reviewPaperUp = () => { const a=interviewUI.application;
  return !!a && a.view==='review' && a.data.status!=='submitted'; };
const renderPaper = () => showReviewPaper(interviewUI.message);
function paperGo(page){
 const a=interviewUI.application;
 if(page==='review'&&!a.review){ a.paper='review'; interviewUI.message=''; return performFilingAction('review'); }   // the snapshot is stale after an edit
 a.paper=page; renderPaper();
}
async function paperAction(b){
 const a=interviewUI.application, act=b.dataset.paper;
 // starting over is asked once, on the paper; the answer either bins the answers or leaves it all
 if(act==='startover'){ a.confirm=true; return renderPaper(); }
 if(act==='restart'){ a.confirm=false; return restartFromPaper(); }
 if(['review','result','statement','interview'].includes(act)) return paperGo(act);
 if(act==='redo'){ a.edit.q=0; return paperGo('interview'); }
 if(act==='prompt'){ a.edit.promptId=b.dataset.pid; renderPaper(); document.getElementById('paper-stmt')?.focus(); return; }
 if(!a.data.writeEnabled||identity.campaign.status!=='open') return;
 // an answer or the statement: written to the server as it is given, the way the clerk's own beats are
 const step=act==='answer'?a.edit.q:3;
 interviewUI.input=act==='answer'?{optionId:b.dataset.option}:{promptId:a.edit.promptId,text:a.edit.text};
 const owner=identity?.user?.id, ticket=++interviewUI.ticket;
 interviewUI.busy=true; interviewUI.message=''; renderPaper();
 try{
  const v=await saveInterviewStep(step); if(ticket!==interviewUI.ticket||owner!==identity?.user?.id) return;
  interviewUI.record=v.interview; identity.campaign.status=v.campaign.status; a.review=null;
  if(act==='answer') a.edit.q=step+1; else a.paper='result';
 }catch(e){ if(ticket===interviewUI.ticket) interviewUI.message=interviewMessages[e.code]||'Save not confirmed. Your input remains here; retry.'; }
 finally{ if(ticket===interviewUI.ticket){ interviewUI.busy=false; renderPaper(); } }
}
interviewPanel.addEventListener('click',e=>{
 const b=e.target.closest('[data-paper]'); if(!b||b.disabled||interviewUI.busy||testPreview) return;
 e.preventDefault(); e.stopPropagation(); paperAction(b);
});
interviewPanel.addEventListener('input',e=>{
 if(e.target.id!=='paper-stmt') return;
 const a=interviewUI.application; a.edit.text=e.target.value;
 const c=document.getElementById('paper-cnt'); if(c) c.textContent=e.target.value.length;
 const d=interviewPanel.querySelector('[data-paper="statement-done"]'); if(d) d.disabled=e.target.value.trim().length<3;
});
function renderApplicationPage(r,status,closed){
 const a=interviewUI.application,submitted=a?.data.status==='submitted',busy=interviewUI.busy;
 interviewPanel.className='gov';
 if(submitted){interviewPanel.innerHTML=paperFiled(a.data.submission);fitWallets();return;}   // the filed case: the department's own form, stamped
 let content=stepHead(submitted?'application received':'saved application',submitted?'Submitted — read-only.':'Draft — not submitted.')+`<p role="status">${esc(status)}</p>`;
 if(submitted){
  const receipt=a.data.submission;
  content+=`<h3>Application received — decision ${esc(receipt.decision)}.</h3><p>Case ${esc(receipt.caseNumber)} was filed on ${esc(fmtStamp(receipt.submittedAt*1000))}.</p><p>Your application is now read-only. You can return here to check its status. Applying does not guarantee a whitelist spot.</p>${exactReview(receipt.snapshot)}`;
 }else if(a?.view==='review'&&a.review){
  content+=`<h3>Review your application</h3>${exactReview(a.review.snapshot)}<p class="filing-warning">Submitting is final. You will not be able to edit your answers or wallet addresses afterward. Applying does not guarantee a whitelist spot.</p><div class="row"><button class="btn ghost" data-filing="addresses" ${busy?'disabled':''}>Edit addresses</button>${[0,1,2,3].map(i=>`<button class="btn ghost" data-interview="edit" data-step="${i}" ${busy||closed?'disabled':''}>${i<3?'Edit question '+(i+1):'Edit written response'}</button>`).join('')}</div><button class="btn" data-filing="submit" ${busy||closed||!a.data.writeEnabled?'disabled':''}>${busy?'Checking submission…':'Submit application'}</button>`;
 }else{
  content+=`<h3>${r.completedAt?'Interview saved — application not submitted.':'Complete your interview before adding addresses.'}</h3>`;
  content+=savedInterviewSummary(r)+`<div class="row">${[0,1,2,3].map(i=>`<button class="btn ghost" data-interview="edit" data-step="${i}" ${busy||closed?'disabled':''}>${i<3?'Edit question '+(i+1):'Edit written response'}</button>`).join('')}</div>`;
 }
 content+=`<div class="row"><button class="btn ghost" data-filing="reload" ${busy?'disabled':''}>Reload saved details</button><button class="btn ghost" data-interview="close">Close application</button></div>`;
 interviewPanel.innerHTML=content;
 caseButtons(interviewPanel);
}
/* a revision clash is a stale tab, not a question for the applicant. take the server's current
   revision and replay the same answer once; their input is untouched either way, and a second
   clash falls through to the message. this calls the endpoints that are already there. */
/* start over from the paper: the three questions again, the statement with them; the addresses
   stay on the file. a ball of paper lands on the desk for the interview thrown out. */
async function restartFromPaper(){
 const a=interviewUI.application, r=interviewUI.record;
 if(!a||!r||!a.data.writeEnabled||identity.campaign.status!=='open') return;
 const owner=identity?.user?.id, ticket=++interviewUI.ticket;
 interviewUI.busy=true; interviewUI.message=''; renderPaper();
 try{
  const v=await API.restartInterview({revision:r.revision}); if(ticket!==interviewUI.ticket||owner!==identity?.user?.id) return;
  interviewUI.record=v.interview; identity.campaign.status=v.campaign.status;
  a.review=null; a.edit=null; a.paper=null; a.view='conversation'; a.beat=null;   // no paper on the desk until it is written again
  interviewUI.redo=true; interviewUI.redoWallets=true;   // everything again, as the first time
  interviewUI.index=0; interviewUI.latest=null; interviewInput(); interviewUI.dirty=false;
  interviewUI.reaction='from the top, then.';
  addCrumple();
  interviewUI.busy=false;
  closeFolder(); interviewUI.open=true; show('room'); renderSavedInterview(); paintDesk();
 }catch(e){ if(ticket===interviewUI.ticket){ interviewUI.busy=false; interviewUI.message=interviewMessages[e.code]||'Could not start over. Your file is unchanged.'; renderPaper(); } }
}
async function saveInterviewStep(step){
 const r=interviewUI.record;
 return API.saveInterview(step<3?{revision:r.revision,questionId:r.allocation.questions[step].id,optionId:interviewUI.input.optionId}:{revision:r.revision,promptId:interviewUI.input.promptId,text:interviewUI.input.text});
}

function nextMintStep(addresses){return !addresses?.solana?'mint-solana':!addresses.evm?'mint-evm':'mint-wrap';}
// where the wallet conversation starts when the interview has just been completed: the opening
// unless both addresses are already on file (an interview done over), then straight to the recap
function mintEntry(addresses,first){return first?'mint-intro':nextMintStep(addresses);}   // a completed interview always opens the wallets, even done over
function mintConversationActive(){return interviewUI.open&&savedDraft()&&interviewUI.index===4&&interviewUI.record?.phase!=='written_review'&&!!interviewUI.record?.completedAt&&interviewUI.application?.view==='conversation'&&interviewUI.application.data.status!=='submitted';}
function renderMintConversation(status,closed){
 clearBeat();
 if(folderOpen){closeFolder();interviewUI.open=true;}
 folderEl.classList.remove('interview-review');
 const a=interviewUI.application,busy=interviewUI.busy,disabled=busy||closed||!a?.data.writeEnabled;
 const beat=a?.beat||'mint-solana',copy=interviewUI.record?.allocation.dialogue||{};
 // go marks the one action that advances the file; the alternative beside it stays a plain choice
 const button=(action,label,off=busy,go=true)=>`<button class="ch${go?' go':''} solo" data-dgo="${action}" ${off?'disabled':''}><span>${esc(label)}</span></button>`;
 let says,rows,note='';   // a footnote only where the beat has one to give
 if(!a){says=copy.walletLoadError||'your saved addresses could not be loaded.';rows='';}
 else if(beat==='mint-assessment'){
  const c=CLASSES[classify(interviewUI.record)];
  says=[copy.walletAssessment||'statement attached. assessment complete.',(copy.walletClassification||'you are {classification}. {description}').replaceAll('{classification}',c.name).replaceAll('{description}',c.desc)];rows=button('mint-intro',"fine. what's next?");
 }else if(beat==='mint-intro'){
  says=['one last thing. the wallets.',"the department requires one Solana address and one EVM address.\nthis requirement is not open to discussion."];   // two sentences, two rows
  if(copy.walletOpening)says=copy.walletOpening;
  rows=button('mint-solana',"fine.");note='no connection, no signature, no transaction.';
 }else if(beat==='mint-wrap'){
  says=[`both noted. ${shortWallet(a.data.addresses.solana)} and ${shortWallet(a.data.addresses.evm)}.\nneither is verified and neither needs to be.`,   // two sentences, two rows
   copy.walletSavedWarning||'the department does not recover anything sent to an address you typed wrong.',
   copy.walletReview||'your file is on the desk. read it before i put it away.'];
  if(copy.walletSaved)says=copy.walletSaved;
  rows=button('mint-read','read my file')+button('mint-solana','change my addresses',busy,false);note='submission does not guarantee a whitelist spot.';
 }else{
  const sol=beat==='mint-solana',network=sol?'solana':'evm',id=sol?'d-sol':'d-evm';
  says=sol?[copy.walletSolanaIntro||'solana first.',copy.walletSolanaRequest||"paste the address you'd want the mint to land in."]:[copy.walletEvmIntro||'noted. now the EVM one.',copy.walletEvmRequest||'same again. the address, not the seed phrase.'];
  // the address goes in the same pill as the name did: the field, with its button inside it
  rows=`<div class="field wide"><input class="din" id="${id}" type="text" maxlength="128" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="${sol?'Solana':'EVM'} public mint address" placeholder="${sol?'solana address':'0x…'}" value="${esc(a.input[network])}" ${disabled?'disabled':''}><button class="dbtn" data-dgo="${sol?'mint-save-solana':'mint-save-evm'}" ${disabled?'disabled':''}>${sol?'use this':'this one'}</button></div>`;
  note=sol?'public address only. never a recovery phrase or a private key.':'0x plus 40 characters.';
 }
 if(disabled&&!busy&&a)note=closed?filingMessages.applications_closed:filingMessages.filing_paused;
 let err=status&&!/^(Saving|Checking|Loading|Unsaved|Saved)/.test(status)?esc(status):'';
 if(err&&(beat==='mint-solana'||beat==='mint-evm')){says=status;err='';}   // a wrong address is the clerk's line, not a box under the field
 const html=dlgPanel({says,rows,note,err,auto:true});   // the wallet lines play through like the rest
 const key=JSON.stringify([beat,S.b,says]),animate=key!==interviewUI.bubbleKey&&!busy;interviewUI.bubbleKey=key;
 /* the rows are marked not-ready before they are written, so they are born hidden and rise
    once. written first, they paint at full opacity and then have to be animated away again,
    which reads as the buttons flashing and dropping out from under the pointer. */
 if(animate)dlgEl.classList.remove('ready');
 if(typing){typing.cancel?.();typing=null;}clearTimeout(fadeTimer);clearInterjection();
 bubEl.innerHTML=html.bubble;dlgEl.replaceChildren(interviewPanel);dlgEl.classList.add('interview-conversation');
 dlgEl.classList.remove('line-leaves');
 interviewPanel.className='';interviewPanel.innerHTML=html.dlg;
 caseButtons(interviewPanel);   // last write before the panel shows, so the appended rows are cased too
 interviewPanel.hidden=false;dlgShow(true);
 const more=()=>{S.b++;renderMintConversation(status,closed);};
 if(animate)typeOut(()=>{dlgEl.classList.add('ready');afterLine(html,more,null);});
 else{bubEl.querySelectorAll('[data-type]').forEach(el=>el.textContent=el.dataset.type);dlgEl.classList.add('ready');if(!busy)afterLine(html,more,null);}
 dlgEl.scrollTop=0;paintDesk();
}
function mintDialogueAction(action){
 const a=interviewUI.application;
 if(action==='beat'){S.b++;dlgRender();return;}
 if((action==='mint-intro'&&a.beat==='mint-assessment')||(action==='mint-solana'&&['mint-intro','mint-wrap'].includes(a.beat))){
  interviewUI.message='';dlgGo(action);return;
 }
 if(action==='mint-read'&&a.beat==='mint-wrap')return performFilingAction('review');
 if(action==='mint-save-solana'&&a.beat==='mint-solana')return performFilingAction('save-solana');
 if(action==='mint-save-evm'&&a.beat==='mint-evm')return performFilingAction('save-evm');
}
interviewPanel.addEventListener('input',e=>{
 if(!['d-sol','d-evm'].includes(e.target.id)||!mintConversationActive())return;
 const a=interviewUI.application;a.input[e.target.id==='d-sol'?'solana':'evm']=e.target.value;a.review=null;interviewUI.dirty=true;interviewUI.message='Unsaved addresses';
 interviewPanel.querySelector('.derr')?.remove();e.target.removeAttribute('aria-invalid');
});
interviewPanel.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&!e.isComposing&&['d-sol','d-evm'].includes(e.target.id)){
  e.preventDefault();interviewPanel.querySelector('[data-dgo="mint-save-solana"],[data-dgo="mint-save-evm"]')?.click();
 }
});
interviewPanel.addEventListener('click',async e=>{
 const button=e.target.closest('[data-filing]');if(!button||button.disabled||interviewUI.busy||testPreview)return;
 e.preventDefault();e.stopPropagation();return performFilingAction(button.dataset.filing,button);
});
async function performFilingAction(action,button){
 const a=interviewUI.application;
 if(a?.data.status==='submitted'&&action!=='reload')return;
 if(action==='addresses'){a.view='conversation';interviewUI.message='';dlgGo('mint-solana');return;}
 if(action==='reload'&&interviewUI.dirty&&!confirm('Discard unsaved edits and load your saved case?'))return;
 const network=action==='save-solana'?'solana':action==='save-evm'?'evm':null;
 if(network){
  if(!a?.data.writeEnabled||identity.campaign.status!=='open')return;
  try{if(!AddressFormat.address(a.input[network],network))throw Error('empty');}
  catch{interviewUI.message=interviewUI.record?.allocation.dialogue?.['invalid_'+network+'_address']||CLERK_WRONG_ADDRESS[network];renderSavedInterview();document.getElementById(network==='solana'?'d-sol':'d-evm')?.setAttribute('aria-invalid','true');return;}
 }
 const owner=identity?.user?.id,ticket=++interviewUI.ticket;
 interviewUI.busy=true;interviewUI.message=action==='submit'?'Checking submission…':network?'Saving addresses…':'Loading saved details…';renderSavedInterview();
 const current=()=>ticket===interviewUI.ticket&&owner===identity?.user?.id;
 try{
  if(action==='submit'){
   const result=await API.submitApplication({reviewRevision:a.review.reviewRevision,requestId:crypto.randomUUID()});if(!current())return;acceptApplication(result);interviewUI.message='';
   // the paper goes into the folder. the clerk says so, once, and the folder lands on the desk.
   filedLine=result.submission?.caseNumber||visibleCaseNumber();clearCrumples();playReviewPaper();closeFolder();scheduleFade();
   const room=document.getElementById('s-room');paintDesk();room.classList.add('landing-folder');setTimeout(()=>room.classList.remove('landing-folder'),700);
  }else if(action==='review'){
   const result=await API.reviewApplication();if(!current())return;
   if(result.status==='submitted')acceptApplication(result);else{a.review=result;a.view='review';a.paper='review';a.edit=null;a.data.writeEnabled=result.writeEnabled;identity.campaign.status=result.campaign.status;}interviewUI.message='';
  }else if(network){
   const other=network==='solana'?'evm':'solana';
   const result=await API.saveAddresses({revision:a.data.addresses.revision,[network]:a.input[network],[other]:a.data.addresses[other]||''});if(!current())return;acceptApplication(result);interviewUI.dirty=false;interviewUI.message='';
   // after a restart the wallets are asked again from blank: saving the solana one reloads both fields from the file,
   // which still holds the old evm address, so the evm field is emptied again until a new one is given
   if(interviewUI.blankEvm){if(network==='solana')interviewUI.application.input.evm='';else interviewUI.blankEvm=false;}
   if(result.status!=='submitted')interviewUI.application.beat=network==='solana'?'mint-evm':'mint-wrap';S.b=0;
  }else{
   const [result,v]=await Promise.all([API.application(),API.interview()]);if(!current())return;acceptApplication(result);interviewUI.record=v.interview;interviewUI.dirty=false;interviewUI.application.view=result.status==='submitted'?'receipt':'conversation';S.b=0;interviewUI.message='Saved details loaded.';
  }
 }catch(err){
  if(!current())return;
  interviewUI.message=interviewUI.record?.allocation.dialogue?.[err.code]||(['temporarily_unavailable','connection_unavailable'].includes(err.code)?interviewUI.record?.allocation.dialogue?.saveFailed:'')||filingMessages[err.code]||'Could not confirm the operation. Your input remains here. Retry safely.';
  if(action==='submit'){
   // A lost response is uncertain, not a failed filing. Recover the immutable
   // receipt first; never claim success just because Submit was clicked.
   try{const read=await API.application();if(!current())return;if(read.status==='submitted'){acceptApplication(read);interviewUI.message='Submission confirmed from your saved receipt.';}else{a.review=null;a.view='conversation';a.beat=nextMintStep(a.data.addresses);S.b=0;interviewUI.message+=' Review the latest saved details before trying to submit again.';}}
   catch{if(current())interviewUI.message='Submission could not be confirmed. Reload saved details when the connection returns; do not assume it failed.';}
  }
 }finally{if(current()){interviewUI.busy=false;renderSavedInterview();}}
}

// what should not start under the wordmark waits for it to go: on the way back from x the page opens in the
// room, and the clerk's first line is said as the wordmark clears, not typed out behind it
function afterIntro(fn){ const el = document.getElementById("intro"); if(!el || el.classList.contains("gone")) fn(); else document.addEventListener("intro-done", fn, { once:true }); }
/* the wordmark on the way in. a muted inline clip with no audio track is allowed to play on its own;
   if the browser refuses anyway, or the file will not decode, or the visitor asked for no motion, the
   overlay leaves at once rather than holding the door shut. a press or a key skips it, and a backstop
   timer means a clip that never reports its end cannot strand anyone. */
(()=>{
  const intro = document.getElementById("intro"), clip = document.getElementById("intro-clip");
  if(!intro) return;
  if(/^Apple/.test(navigator.vendor)){ clip.src = "assets/gate/logo-alpha.mp4"; clip.load(); }   // WebKit drops WebM alpha; it gets the HEVC-alpha encode
  let gone = false;
  const leave = ()=>{
    if(gone) return; gone = true;
    intro.classList.add("gone");
    document.dispatchEvent(new Event("intro-done"));   // the hallway's frame starts to glow now
    setTimeout(()=>intro.remove(), 500);
  };
  // the overlay waits for the visitor: once the wordmark has settled, "enter the department" comes up under it,
  // and only that press (or enter / space) clears it. the press is also the gesture that lets the building's
  // sound start. a clip that will not play or decode brings the button up at once, the wordmark still or absent
  const enter = document.getElementById("intro-enter");
  // the way back from x (or a cancelled, expired or paused sign-in) lands with a hash: they came in through the
  // button already, so the wordmark plays as a loader and clears itself once it has settled, with no button
  const returning = /^#(identity|login_)/.test(location.hash);
  if(returning) intro.classList.add("returning");
  let ready = false;
  const offer = ()=>{ if(ready || gone) return; ready = true; if(returning){ leave(); return; } intro.classList.add("ready"); };
  enter.addEventListener("click", leave);
  addEventListener("keydown", e=>{ if(ready && !gone && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); leave(); } });
  clip.addEventListener("error", offer);
  // the wordmark finishes settling about 2.1s in (measured frame by frame); the file then holds its last frame
  // out to 3.9, and stays on it. the button comes up when the picture stops moving
  const SETTLED_AT = 2300;
  const armOnDuration = ()=>{
    if(isFinite(clip.duration) && clip.duration > 0) setTimeout(offer, Math.min(SETTLED_AT, clip.duration * 1000));
  };
  // the element is in the markup with preload="auto", so its metadata can be in before this file runs
  // and the event would never come. ask first, listen only if it has not happened yet.
  if(clip.readyState >= 1) armOnDuration(); else clip.addEventListener("loadedmetadata", armOnDuration);
  setTimeout(offer, 3500);                       // for a clip that never reports a duration either
  if(PREFERS_STILL){ leave(); return; }          // no motion wanted: no overlay, nothing to press (the css hides it)
  const playing = clip.play();
  if(playing && playing.catch) playing.catch(offer);
})();

/* ---------------- boot ---------------- */
applyCfg();
applyDept();
setFolderState();
resetFolderArt();
show("gate");   // always start at the gate, even with a saved case
applyVolume();   // and applySound with it: where the knob sits is the whole of the state

refreshIdentity();

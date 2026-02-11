/* Smooth UI version (no help/intro texts)
 * Flow: Envelope -> Letter -> Maze -> Finale (fireworks + photo wall)
 */

const CONFIG = {
  recipient: "杨珖",
  nickname: "小给给",

  letterTitle: "给你一封信",
  letterLines: [
    "我不想只说一句祝福就结束。",
    "你每把小球往前推一步，",
    "就相当于把这一年的好运“提前预存”一点。",
    "",
    "通关后，我把剩下那句祝福交给你。"
  ],

  finalMessage: [
    "杨珖，小给给：",
    "你刚刚把迷宫走通了——今年也一样，难的关卡都会被你过掉。",
    "愿你这一岁：想做的事都能开工，开工的事都能顺利，顺利的事都能变成快乐。",
    "生日这天，允许你把好运设成默认值。"
  ].join("\n"),

  // Put your mp3/ogg direct link here
  bgmUrl: "assets/audio/bgm.mp3",

  // Two images (2nd is placeholder until you replace it)
  photos: [
    "assets/img/photo2.jpg",
  ],

  cols: 12,
  rows: 18
};

// ---------- DOM ----------
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

const starsCv = $("#stars");
const mazeCv  = $("#maze");
const fireCv  = $("#fireworks");
const ctxS = starsCv.getContext("2d");
const ctxM = mazeCv.getContext("2d");
const ctxF = fireCv.getContext("2d");

const hudTitle = $("#hudTitle");

const btnBgm = $("#btnBgm");
const bgm = $("#bgm");

const envelopeWrap = $("#envelopeWrap");

const letterOverlay = $("#letterOverlay");
const btnCloseLetter = $("#btnCloseLetter");
const toLine = $("#toLine");
const letterTitleEl = $("#letterTitle");
const typeText = $("#typeText");
const cursor = $("#cursor");
const btnSkipType = $("#btnSkipType");
const btnEnterMaze = $("#btnEnterMaze");

const btnMotion = $("#btnMotion");
const btnReset = $("#btnReset");
const mazeTip = $("#mazeTip");
const gyroBar = $("#gyroBar");

const toast = $("#toast");

const finalMsg = $("#finalMsg");
const finalTitle = $("#finalTitle");
const photoWall = $("#photoWall");
const btnBoom = $("#btnBoom");
const btnReplay = $("#btnReplay");
const lightbox = $("#lightbox");
const lightboxImg = $("#lightboxImg");

// ---------- Helpers ----------
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
function showToast(text, ms=1400){
  toast.textContent = text;
  toast.style.display = "block";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.style.display="none", ms);
}

// ---------- Scene switch (smooth) ----------
function setScene(which){
  $$(".scene").forEach(s=>s.classList.remove("isActive"));

  const intro = $("#sceneIntro");
  const maze = $("#sceneMaze");
  const fin  = $("#sceneFinale");

  if (which === "intro"){
    intro.classList.add("isActive");
    mazeCv.style.opacity = 0; mazeCv.style.pointerEvents = "none";
    fireCv.style.opacity = 0; fireCv.style.pointerEvents = "none";
    hudTitle.textContent = "开场";
  } else if (which === "maze"){
    maze.classList.add("isActive");
    mazeCv.style.opacity = 1; mazeCv.style.pointerEvents = "auto";
    fireCv.style.opacity = 0; fireCv.style.pointerEvents = "none";
    hudTitle.textContent = "迷宫";
    resizeAll();
  } else if (which === "finale"){
    fin.classList.add("isActive");
    mazeCv.style.opacity = 0; mazeCv.style.pointerEvents = "none";
    fireCv.style.opacity = 1; fireCv.style.pointerEvents = "none";
    hudTitle.textContent = "烟花";
    resizeAll();
    startFireworksBurst();
  }
}

// ---------- BGM ----------
let bgmReady = false;
function initBgm(){
  if (CONFIG.bgmUrl && typeof CONFIG.bgmUrl === "string"){
    bgm.src = CONFIG.bgmUrl;
    bgmReady = true;
  } else {
    bgmReady = false;
  }
}
async function toggleBgm(){
  if (!bgmReady){
    showToast("BGM 还没设置（去 assets/app.js 填 bgmUrl）", 1900);
    return;
  }
  try{
    if (bgm.paused){
      await bgm.play();
      btnBgm.classList.add("isPlaying");
    } else {
      bgm.pause();
      btnBgm.classList.remove("isPlaying");
    }
  }catch(e){
    showToast("播放失败：需要手动点击按钮", 1900);
    console.error(e);
  }
}

// ---------- Typewriter ----------
let typing = {timer:null, i:0, text:"", done:false};
function startTypewriter(){
  typing.text = CONFIG.letterLines.join("\n");
  typing.i = 0;
  typing.done = false;
  typeText.textContent = "";
  cursor.style.display = "inline-block";
  btnEnterMaze.disabled = true;

  const tick = ()=>{
    typeText.textContent = typing.text.slice(0, typing.i);
    typing.i += 1;
    if (typing.i <= typing.text.length){
      typing.timer = setTimeout(tick, 22);
    } else {
      typing.done = true;
      typeText.textContent = typing.text;
      cursor.style.display = "none";
      btnEnterMaze.disabled = false;
    }
  };
  tick();
}
function skipTypewriter(){
  clearTimeout(typing.timer);
  typing.done = true;
  typeText.textContent = typing.text;
  cursor.style.display = "none";
  btnEnterMaze.disabled = false;
}

// ---------- Stars ----------
let W=0,H=0,DPR=1;
let stars = [];
let shooting = [];
let tilt = {x:0,y:0}; // normalized

function initStars(){
  stars = [];
  const n = Math.round((W*H)/12000);
  for(let i=0;i<n;i++){
    stars.push({x:Math.random()*W, y:Math.random()*H, z:Math.random()*1+0.15, r:Math.random()*1.4+0.2, tw:Math.random()*Math.PI*2});
  }
  shooting = [];
}
function maybeSpawnShooting(){
  if (shooting.length > 2) return;
  if (Math.random() < 0.012){
    const x = Math.random()*W*0.6;
    const y = Math.random()*H*0.35;
    const vx = 900 + Math.random()*600;
    const vy = 350 + Math.random()*220;
    shooting.push({x,y,vx,vy,life:0});
  }
}
function drawStars(dt){
  maybeSpawnShooting();
  ctxS.clearRect(0,0,W,H);

  const g1 = ctxS.createRadialGradient(W*0.25,H*0.15, 0, W*0.25,H*0.15, Math.max(W,H));
  g1.addColorStop(0, "rgba(255,86,140,0.10)");
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctxS.fillStyle = g1;
  ctxS.fillRect(0,0,W,H);

  const g2 = ctxS.createRadialGradient(W*0.8,H*0.2, 0, W*0.8,H*0.2, Math.max(W,H));
  g2.addColorStop(0, "rgba(140,170,255,0.14)");
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctxS.fillStyle = g2;
  ctxS.fillRect(0,0,W,H);

  const px = tilt.x * 36;
  const py = tilt.y * 36;

  for(const s of stars){
    s.tw += dt * (0.9 + s.z*1.2);
    s.y += dt * (12 * s.z);
    if (s.y > H+8){ s.y = -8; s.x = Math.random()*W; s.z = Math.random()*1 + 0.15; }
    const x = s.x + px*s.z;
    const y = s.y + py*s.z;
    const tw = 0.55 + 0.45*Math.sin(s.tw);
    ctxS.globalAlpha = (0.22 + 0.62*s.z) * tw;
    ctxS.beginPath();
    ctxS.arc(x, y, s.r + 0.9*s.z, 0, Math.PI*2);
    ctxS.fillStyle = "white";
    ctxS.fill();
  }
  ctxS.globalAlpha = 1;

  for(let i=shooting.length-1;i>=0;i--){
    const sh = shooting[i];
    sh.life += dt;
    sh.x += sh.vx*dt;
    sh.y += sh.vy*dt;
    const a = 1 - sh.life/0.9;
    ctxS.globalAlpha = Math.max(0, a);
    ctxS.strokeStyle = "rgba(255,255,255,0.9)";
    ctxS.lineWidth = 2;
    ctxS.beginPath();
    ctxS.moveTo(sh.x, sh.y);
    ctxS.lineTo(sh.x - 220, sh.y - 80);
    ctxS.stroke();
    ctxS.globalAlpha = 1;
    if (sh.life > 0.9 || sh.x > W+260 || sh.y > H+120) shooting.splice(i,1);
  }
}

// ---------- Maze ----------
let maze = null;
let walls = [];
let cellSize = 32;
let wallT = 10;
let mazeOffset = {x:0,y:0};
let goal = {x:0,y:0,r:18};

let ball = null;
let won = false;

let key = {left:false,right:false,up:false,down:false};
let drag = {active:false, x:0, y:0};

function makeGrid(cols, rows){
  const grid = [];
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      grid.push({x,y, visited:false, walls:{t:true,r:true,b:true,l:true}});
    }
  }
  const idx = (x,y)=> x + y*cols;
  const neigh = (c)=>{
    const n=[];
    if (c.y>0) n.push(grid[idx(c.x, c.y-1)]);
    if (c.x<cols-1) n.push(grid[idx(c.x+1, c.y)]);
    if (c.y<rows-1) n.push(grid[idx(c.x, c.y+1)]);
    if (c.x>0) n.push(grid[idx(c.x-1, c.y)]);
    return n.filter(k=>!k.visited);
  };

  let cur = grid[0];
  cur.visited=true;
  const st=[];
  while(true){
    const ns = neigh(cur);
    if (ns.length){
      const nxt = ns[Math.floor(Math.random()*ns.length)];
      st.push(cur);

      if (nxt.x===cur.x && nxt.y===cur.y-1){cur.walls.t=false; nxt.walls.b=false;}
      else if (nxt.x===cur.x+1 && nxt.y===cur.y){cur.walls.r=false; nxt.walls.l=false;}
      else if (nxt.x===cur.x && nxt.y===cur.y+1){cur.walls.b=false; nxt.walls.t=false;}
      else if (nxt.x===cur.x-1 && nxt.y===cur.y){cur.walls.l=false; nxt.walls.r=false;}

      nxt.visited=true;
      cur = nxt;
    } else if (st.length){
      cur = st.pop();
    } else break;
  }
  return {cols,rows,grid};
}

function buildWalls(){
  walls = [];
  const {cols,rows,grid} = maze;
  const idx = (x,y)=> x + y*cols;

  const padTop = 128;
  const pad = 18;
  const availW = W - pad*2;
  const availH = H - padTop - pad*2;

  cellSize = Math.floor(Math.min(availW/cols, availH/rows));
  cellSize = clamp(cellSize, 18, 46);
  wallT = clamp(Math.floor(cellSize*0.22), 6, 12);

  const mazeW = cellSize*cols;
  const mazeH = cellSize*rows;
  mazeOffset.x = Math.floor((W - mazeW)/2);
  mazeOffset.y = Math.floor(padTop + (availH - mazeH)/2);

  const add = (x,y,w,h)=>walls.push({x,y,w,h});

  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const c = grid[idx(x,y)];
      const ox = mazeOffset.x + x*cellSize;
      const oy = mazeOffset.y + y*cellSize;

      if (c.walls.t) add(ox, oy - wallT/2, cellSize, wallT);
      if (c.walls.l) add(ox - wallT/2, oy, wallT, cellSize);
      if (x===cols-1 && c.walls.r) add(ox + cellSize - wallT/2, oy, wallT, cellSize);
      if (y===rows-1 && c.walls.b) add(ox, oy + cellSize - wallT/2, cellSize, wallT);
    }
  }

  goal.x = mazeOffset.x + (cols-0.5)*cellSize;
  goal.y = mazeOffset.y + (rows-0.5)*cellSize;
  goal.r = clamp(Math.floor(cellSize*0.26), 12, 22);
}

function initBall(){
  ball = {x: mazeOffset.x + 0.5*cellSize, y: mazeOffset.y + 0.5*cellSize, vx:0, vy:0, r: clamp(Math.floor(cellSize*0.20), 9, 16)};
  won = false;
}

function circleRectResolve(b, r){
  const cx = clamp(b.x, r.x, r.x+r.w);
  const cy = clamp(b.y, r.y, r.y+r.h);
  const dx = b.x - cx;
  const dy = b.y - cy;
  const d2 = dx*dx + dy*dy;
  const rr = b.r;
  if (d2 < rr*rr){
    const d = Math.sqrt(d2) || 0.0001;
    const nx = dx/d;
    const ny = dy/d;
    const push = (rr - d) + 0.2;
    b.x += nx*push; b.y += ny*push;
    const vn = b.vx*nx + b.vy*ny;
    if (vn < 0){ b.vx -= 1.7*vn*nx; b.vy -= 1.7*vn*ny; }
    b.vx *= 0.98; b.vy *= 0.98;
    return true;
  }
  return false;
}

function buildMaze(){
  maze = makeGrid(CONFIG.cols, CONFIG.rows);
  buildWalls();
  initBall();
}

function drawMaze(){
  ctxM.clearRect(0,0,W,H);

  const mx = mazeOffset.x, my = mazeOffset.y;
  const mw = cellSize*maze.cols, mh = cellSize*maze.rows;

  ctxM.save();
  ctxM.globalAlpha = 0.15;
  ctxM.fillStyle = "white";
  ctxM.fillRect(mx-12, my-12, mw+24, mh+24);
  ctxM.restore();

  ctxM.save();
  ctxM.fillStyle = "rgba(255,255,255,0.78)";
  ctxM.strokeStyle = "rgba(140,170,255,0.16)";
  for(const w of walls){
    ctxM.fillRect(w.x, w.y, w.w, w.h);
    ctxM.strokeRect(w.x, w.y, w.w, w.h);
  }
  ctxM.restore();

  ctxM.save();
  const gg = ctxM.createRadialGradient(goal.x, goal.y, 2, goal.x, goal.y, goal.r*3.2);
  gg.addColorStop(0, "rgba(255,255,255,0.95)");
  gg.addColorStop(1, "rgba(255,255,255,0)");
  ctxM.fillStyle = gg;
  ctxM.beginPath();
  ctxM.arc(goal.x, goal.y, goal.r*3.2, 0, Math.PI*2);
  ctxM.fill();
  ctxM.fillStyle = "rgba(255,255,255,0.92)";
  ctxM.beginPath();
  ctxM.arc(goal.x, goal.y, goal.r, 0, Math.PI*2);
  ctxM.fill();
  ctxM.restore();

  ctxM.save();
  const bg = ctxM.createRadialGradient(ball.x-ball.r*0.3, ball.y-ball.r*0.3, 1, ball.x, ball.y, ball.r*1.6);
  bg.addColorStop(0, "rgba(255,255,255,0.98)");
  bg.addColorStop(1, "rgba(255,255,255,0.58)");
  ctxM.fillStyle = bg;
  ctxM.shadowColor = "rgba(0,0,0,0.35)";
  ctxM.shadowBlur = 16;
  ctxM.beginPath();
  ctxM.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
  ctxM.fill();
  ctxM.restore();
}

function checkWin(){
  const dx = ball.x-goal.x, dy = ball.y-goal.y;
  const d = Math.sqrt(dx*dx + dy*dy);
  if (d < goal.r*0.78 && !won){
    won = true;
    showToast("通关 🎉", 900);
    setTimeout(()=>goFinale(), 220);
  }
}

function updateBall(dt){
  if (won) return;

  let ax = tilt.x;
  let ay = tilt.y;

  if (key.left)  ax -= 0.9;
  if (key.right) ax += 0.9;
  if (key.up)    ay -= 0.9;
  if (key.down)  ay += 0.9;

  ax = clamp(ax, -1.3, 1.3);
  ay = clamp(ay, -1.3, 1.3);

  const accel = 980;
  ball.vx += ax*accel*dt;
  ball.vy += ay*accel*dt;

  ball.vx *= 0.985;
  ball.vy *= 0.985;

  const vmax = 540;
  ball.vx = clamp(ball.vx, -vmax, vmax);
  ball.vy = clamp(ball.vy, -vmax, vmax);

  ball.x += ball.vx*dt;
  ball.y += ball.vy*dt;

  for(let k=0;k<2;k++){
    for(const w of walls) circleRectResolve(ball,w);
  }

  const mx = mazeOffset.x, my = mazeOffset.y;
  const mw = cellSize*maze.cols, mh = cellSize*maze.rows;
  ball.x = clamp(ball.x, mx + ball.r, mx + mw - ball.r);
  ball.y = clamp(ball.y, my + ball.r, my + mh - ball.r);

  checkWin();
}

// ---------- Controls ----------
function isIOS(){ return /iP(hone|od|ad)/.test(navigator.userAgent); }

async function enableMotion(){
  try{
    if (typeof DeviceOrientationEvent === "undefined"){
      showToast("不支持陀螺仪：触摸拖动 / 方向键也能玩", 1800);
      return;
    }
    if (typeof DeviceOrientationEvent.requestPermission === "function"){
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted"){
        showToast("没授权：触摸拖动 / 方向键也能玩", 1800);
        hideGyroBarAfter(2000);
        return;
      }
    }
    window.addEventListener("deviceorientation", onOri, {passive:true});
    btnMotion.disabled = true;
    btnMotion.textContent = "已开启";
    mazeTip.textContent = "倾斜手机控制小球，走到右下角发光点通关。";
    showToast("陀螺仪已开启", 1200);
  }catch(e){
    showToast("开启失败：触摸拖动 / 方向键也能玩", 1800);
    console.error(e);
  }
}
function onOri(e){
  const g = clamp(e.gamma ?? 0, -45, 45) / 45;
  const b = clamp(e.beta ?? 0, -45, 45) / 45;
  tilt.x = tilt.x*0.85 + g*0.15;
  tilt.y = tilt.y*0.85 + b*0.15;
}

window.addEventListener("keydown", (e)=>{
  if (e.key === "ArrowLeft") key.left=true;
  if (e.key === "ArrowRight") key.right=true;
  if (e.key === "ArrowUp") key.up=true;
  if (e.key === "ArrowDown") key.down=true;
});
window.addEventListener("keyup", (e)=>{
  if (e.key === "ArrowLeft") key.left=false;
  if (e.key === "ArrowRight") key.right=false;
  if (e.key === "ArrowUp") key.up=false;
  if (e.key === "ArrowDown") key.down=false;
});

mazeCv.addEventListener("pointerdown", (e)=>{
  drag.active=true;
  drag.x = e.clientX; drag.y = e.clientY;
});
window.addEventListener("pointermove", (e)=>{
  if (!drag.active) return;
  const dx = (e.clientX - drag.x) / 120;
  const dy = (e.clientY - drag.y) / 120;
  tilt.x = clamp(dx, -1, 1);
  tilt.y = clamp(dy, -1, 1);
});
window.addEventListener("pointerup", ()=> drag.active=false);

// ---------- Fireworks ----------
let fireworks = [];
function spawnFirework(x, y){
  const hue = 300 + Math.random()*60;
  const n = 80 + Math.floor(Math.random()*40);
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const sp = 160 + Math.random()*260;
    fireworks.push({x,y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:0, ttl:1.6+Math.random()*0.7, hue});
  }
}
function startFireworksBurst(){
  const bursts = 4;
  for(let i=0;i<bursts;i++){
    setTimeout(()=>spawnFirework(W*(0.25+0.5*Math.random()), H*(0.22+0.25*Math.random())), i*240);
  }
}
function updateFireworks(dt){
  if (fireCv.style.opacity == 0) return;
  ctxF.clearRect(0,0,W,H);
  ctxF.save();
  ctxF.globalAlpha = 0.22;
  ctxF.fillStyle = "rgba(0,0,0,0.35)";
  ctxF.fillRect(0,0,W,H);
  ctxF.restore();

  for(let i=fireworks.length-1;i>=0;i--){
    const p = fireworks[i];
    p.life += dt;
    p.vy += 240*dt;
    p.vx *= 0.985; p.vy *= 0.985;
    p.x += p.vx*dt; p.y += p.vy*dt;
    const t = p.life / p.ttl;
    const a = Math.max(0, 1 - t);
    ctxF.globalAlpha = a;
    ctxF.fillStyle = `hsla(${p.hue}, 90%, 70%, 1)`;
    ctxF.beginPath();
    ctxF.arc(p.x, p.y, 2.2, 0, Math.PI*2);
    ctxF.fill();
    ctxF.globalAlpha = 1;
    if (p.life >= p.ttl) fireworks.splice(i,1);
  }
}

// ---------- Loop ----------
let last = performance.now();
function tick(now){
  const dt = Math.min(0.032, (now-last)/1000);
  last = now;

  drawStars(dt);

  const active = document.querySelector(".scene.isActive")?.dataset?.scene;
  if (active === "maze"){
    updateBall(dt);
    drawMaze();
  } else {
    ctxM.clearRect(0,0,W,H);
  }

  if (active === "finale"){
    updateFireworks(dt);
  } else {
    ctxF.clearRect(0,0,W,H);
  }

  requestAnimationFrame(tick);
}

// ---------- Resize ----------
function resizeAll(){
  DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  W = window.innerWidth;
  H = window.innerHeight;

  const resize = (c,ctx)=>{
    c.width = Math.floor(W*DPR);
    c.height = Math.floor(H*DPR);
    c.style.width = W+"px";
    c.style.height = H+"px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
  };

  resize(starsCv, ctxS);
  resize(mazeCv, ctxM);
  resize(fireCv, ctxF);

  initStars();
  if (document.querySelector(".scene.isActive")?.dataset?.scene === "maze"){
    buildMaze();
  }
}
window.addEventListener("resize", resizeAll);

// ---------- Photo wall ----------
function buildPhotoWall(){
  photoWall.innerHTML = "";
  const imgs = (CONFIG.photos && CONFIG.photos.length) ? CONFIG.photos : ["assets/img/role.jpg"];
  imgs.forEach((src)=>{
    const img = document.createElement("img");
    img.src = src;
    img.alt = "照片";
    img.loading = "lazy";
    img.addEventListener("error", ()=>{
      // If user hasn't added the 2nd image yet, don't crash; show placeholder
      if (src.includes("photo2.jpg")){
        img.src = "assets/img/photo2_placeholder.svg";
      }
    });
    img.addEventListener("click", ()=>{
      lightboxImg.src = img.src;
      lightbox.classList.add("isOpen");
      lightbox.setAttribute("aria-hidden","false");
    });
    photoWall.appendChild(img);
  });
}

// ---------- Letter open/close ----------
function openLetter(){
  envelopeWrap.classList.add("isOpen");
  letterOverlay.classList.add("isOpen");
  letterOverlay.setAttribute("aria-hidden","false");
  startTypewriter();
}
function closeLetter(){
  letterOverlay.classList.remove("isOpen");
  letterOverlay.setAttribute("aria-hidden","true");
}

// ---------- Navigation ----------
function goMaze(){
  closeLetter();
  setScene("maze");
  buildMaze();
  showToast("开始", 800);
  mazeTip.textContent = isIOS() ? "iPhone 点“开启陀螺仪”授权；也可触摸拖动。" : "倾斜/触摸拖动/方向键都能玩。";
  hideGyroBarAfter(50000);

}
async function playBgmAfterWin(){
  if (!bgmReady) return;
  if (!bgm.paused) return;

  try{
    // 可选：从头播放
    // bgm.currentTime = 0;

    await bgm.play();
    btnBgm.classList.add("isPlaying");
  }catch(e){
    // iPhone/浏览器可能禁止非用户触发的自动播放：失败就静默
    // 想提示的话可打开下一行
    // showToast("点一下 ♪ 才能播放BGM", 1600);
  }
}

function goFinale(){
  setScene("finale");
  finalTitle.textContent = `🎉 ${CONFIG.recipient}（${CONFIG.nickname}）生日快乐`;
  finalMsg.textContent = CONFIG.finalMessage;
  buildPhotoWall();
  fireworks = [];
  startFireworksBurst();
  playBgmAfterWin();

}

// ---------- Events ----------
btnBgm.addEventListener("click", toggleBgm);

envelopeWrap.addEventListener("click", openLetter);
envelopeWrap.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" ") openLetter(); });

btnCloseLetter.addEventListener("click", closeLetter);
letterOverlay.addEventListener("click", (e)=>{ if(e.target===letterOverlay) closeLetter(); });

btnSkipType.addEventListener("click", skipTypewriter);
btnEnterMaze.addEventListener("click", goMaze);

btnMotion.addEventListener("click", enableMotion);
btnReset.addEventListener("click", ()=>{
  buildMaze();
  showToast("重开", 800);
});

btnBoom.addEventListener("click", startFireworksBurst);
btnReplay.addEventListener("click", ()=>{
  setScene("maze");
  buildMaze();
});

lightbox.addEventListener("click", ()=>{
  lightbox.classList.remove("isOpen");
  lightbox.setAttribute("aria-hidden","true");
});

// ---------- Init ----------
(function init(){
  $("#titleName").textContent = CONFIG.recipient;
  $("#titleNick").textContent = CONFIG.nickname;
  toLine.textContent = `致：${CONFIG.recipient}（${CONFIG.nickname}）`;
  letterTitleEl.textContent = CONFIG.letterTitle;

  initBgm();

  // scene
  setScene("intro");
  resizeAll();

  // preload
  (CONFIG.photos || []).forEach((src)=>{
    const img = new Image();
    img.src = src;
  });

  requestAnimationFrame(tick);
})();
function hideGyroBarAfter(ms=2000){
  if (!gyroBar) return;
  gyroBar.classList.remove("isHidden");
  clearTimeout(gyroBar._t);
  gyroBar._t = setTimeout(()=> gyroBar.classList.add("isHidden"), ms);
}
function showGyroBar(){
  if (!gyroBar) return;
  gyroBar.classList.remove("isHidden");
  hideGyroBarAfter(2000);
}

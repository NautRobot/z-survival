import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, update, remove, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- 1. FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyCyD2K3TT7hOfakFPgJ9mMjTEM8Jim9_rA",
  authDomain: "z-clicker-97488.firebaseapp.com",
  databaseURL: "https://z-clicker-97488-default-rtdb.firebaseio.com",
  projectId: "z-clicker-97488",
  storageBucket: "z-clicker-97488.firebasestorage.app",
  messagingSenderId: "686862323992",
  appId: "1:686862323992:web:e25c46b7deb67254278e6d"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

signInAnonymously(auth).catch(console.error);
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  let activeSeconds = 0;
  setInterval(() => {
    if (!document.hidden) {
      activeSeconds++;
      if (activeSeconds >= 60) {
        activeSeconds = 0;
        runTransaction(ref(db, `users/${user.uid}/points`), (p) => (p || 0) + 1);
      }
    }
  }, 1000);
});

// --- 2. MAP & ZONES ---
const mapSize = 10000; 
const zones = [
  { name: "SUPERMARKET\n(Food/Water)", x: 4500, y: 1500, w: 1000, h: 800, color: "rgba(46, 204, 113, 0.15)", border: "#2ecc71", type: 'supermarket' },
  { name: "HOSPITAL\n(Absolute Heal)", x: 4500, y: 8000, w: 1200, h: 1000, color: "rgba(231, 76, 60, 0.15)", border: "#e74c3c", type: 'hospital' },
  { name: "BUNKER\n(Safe Spawn)", x: 1500, y: 4500, w: 1000, h: 1000, color: "rgba(52, 152, 219, 0.15)", border: "#3498db", type: 'safe' },
  { name: "TRADER\n(Buy/Sell)", x: 8000, y: 4500, w: 1000, h: 1000, color: "rgba(241, 196, 15, 0.15)", border: "#f1c40f", type: 'trader' },
  // Boss Zones
  { name: "SLAUGHTERHOUSE\n(Boss Area)", x: 8000, y: 1000, w: 1500, h: 1500, color: "rgba(192, 57, 43, 0.2)", border: "#c0392b", type: 'boss_butcher' },
  { name: "TOXIC SWAMP\n(Boss Area)", x: 500, y: 500, w: 1500, h: 1500, color: "rgba(192, 57, 43, 0.2)", border: "#c0392b", type: 'boss_spitter' },
  { name: "PRISON\n(Boss Area)", x: 500, y: 8000, w: 1500, h: 1500, color: "rgba(192, 57, 43, 0.2)", border: "#c0392b", type: 'boss_warden' }
];

const walls = [
  {x: 4800, y: 3500, w: 400, h: 100}, {x: 4800, y: 6500, w: 400, h: 100},
  {x: 3500, y: 4800, w: 100, h: 400}, {x: 6500, y: 4800, w: 100, h: 400},
  {x: 8500, y: 1500, w: 200, h: 200}, {x: 8800, y: 1900, w: 200, h: 200},
  {x: 1000, y: 1000, w: 300, h: 100}, {x: 800, y: 1300, w: 100, h: 300},
  {x: 1000, y: 8500, w: 600, h: 50}, {x: 1000, y: 9000, w: 600, h: 50},
  
  // Zone Borders
  {x: 4500, y: 1500, w: 1000, h: 40}, {x: 4500, y: 1500, w: 40, h: 800}, {x: 5460, y: 1500, w: 40, h: 800},
  {x: 4500, y: 2260, w: 400, h: 40}, {x: 5100, y: 2260, w: 400, h: 40},
  {x: 4500, y: 8960, w: 1200, h: 40}, {x: 4500, y: 8000, w: 40, h: 1000}, {x: 5660, y: 8000, w: 40, h: 1000},
  {x: 4500, y: 8000, w: 500, h: 40}, {x: 5200, y: 8000, w: 500, h: 40},
  {x: 1500, y: 4500, w: 1000, h: 40}, {x: 1500, y: 5460, w: 1000, h: 40}, {x: 1500, y: 4500, w: 40, h: 1000},
  {x: 2460, y: 4500, w: 40, h: 400}, {x: 2460, y: 5100, w: 40, h: 400},
  {x: 8000, y: 4500, w: 1000, h: 40}, {x: 8000, y: 5460, w: 1000, h: 40}, {x: 8960, y: 4500, w: 40, h: 1000},
  {x: 8000, y: 4500, w: 40, h: 400}, {x: 8000, y: 5100, w: 40, h: 400}
];

function inSafeZone(px, py) {
  for (let z of zones) {
    if (['safe', 'trader', 'supermarket', 'hospital'].includes(z.type)) {
      if (px > z.x && px < z.x + z.w && py > z.y && py < z.y + z.h) return true;
    }
  }
  return false;
}

function isColliding(nx, ny, r = 16, isNPC = false) {
  if (nx < r || nx > mapSize - r || ny < r || ny > mapSize - r) return true;
  for (let w of walls) {
    let closestX = Math.max(w.x, Math.min(nx, w.x + w.w));
    let closestY = Math.max(w.y, Math.min(ny, w.y + w.h));
    if (Math.hypot(nx - closestX, ny - closestY) < r) return true;
  }
  if (isNPC && inSafeZone(nx, ny)) return true;
  return false;
}

// --- 3. PERSISTENCE & INITIALIZATION ---
let savedId = localStorage.getItem('z_surv_id');
if (!savedId) { savedId = 'survivor_' + Math.random().toString(36).substr(2, 6); localStorage.setItem('z_surv_id', savedId); }
const playerId = savedId; const playerRef = ref(db, `players/${playerId}`);

function getNonGreenColor() {
  let h; do { h = Math.floor(Math.random() * 360); } while (h >= 70 && h <= 160);
  return `hsl(${h}, 80%, 50%)`;
}

let localPlayer = {
  x: 2000, y: 5000, hp: 100, maxHp: 100, virus: 0, stamina: 100, hunger: 100, thirst: 100, money: 0,
  angle: 0, isAttacking: false, activeSlot: 1, color: getNonGreenColor(),
  inv: { pistol: false, shotgun: false, mask: 0, medkit: 0, scrap: 0, food: 0, water: 0, pistolAmmo: 0, shotgunAmmo: 0 }
};

let isDead = false; 

let savedData = localStorage.getItem('z_surv_data');
if (savedData) {
  try {
    let parsed = JSON.parse(savedData);
    localPlayer = { ...localPlayer, ...parsed };
    localPlayer.x = Math.max(100, Math.min(mapSize-100, localPlayer.x));
    localPlayer.y = Math.max(100, Math.min(mapSize-100, localPlayer.y));
    
    if (localPlayer.hp <= 0) {
       isDead = true;
       document.getElementById('death-message').innerText = "You succumbed to the wasteland elements...";
       document.getElementById('death-screen').style.display = 'block';
    }
  } catch(e) {}
}

function saveGame() {
  localStorage.setItem('z_surv_data', JSON.stringify({
    x: localPlayer.x, y: localPlayer.y, hp: localPlayer.hp, maxHp: localPlayer.maxHp,
    virus: localPlayer.virus, stamina: localPlayer.stamina, hunger: localPlayer.hunger, thirst: localPlayer.thirst,
    money: localPlayer.money, inv: localPlayer.inv, color: localPlayer.color
  }));
}

const zekeImg = new Image(); zekeImg.src = 'zeke.jpg';
const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');

const minimapCanvas = document.getElementById('minimap'); const mCtx = minimapCanvas.getContext('2d');
minimapCanvas.width = 160; minimapCanvas.height = 160;

let width = window.innerWidth, height = window.innerHeight; canvas.width = width; canvas.height = height;
window.addEventListener('resize', () => { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; });

let otherPlayers = {}; let entities = {}; let drops = {}; let bossTimers = {};
let activeSlot = localPlayer.activeSlot || 1; let drawMuzzleFlash = 0; let lastSync = 0; let lastAttackTime = 0;
let camera = { x: localPlayer.x, y: localPlayer.y };
let shopOpenType = 'none'; let isReloading = false; let reloadProgress = 0;

// --- 4. INPUT & UI ---
const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const mouse = { x: width/2, y: height/2, down: false };
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', e => { if (e.button === 0 && shopOpenType==='none' && !isDead) { mouse.down = true; handleAction(); }});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; localPlayer.isAttacking = false; });

window.addEventListener('keydown', e => {
  if (isDead) return;
  if (shopOpenType !== 'none' && e.key.toLowerCase() === 'e') { closeShops(); return; }
  
  if (e.key.toLowerCase() === 'r' && !isReloading) startReload();

  if (['1','2','3','4','5','6','7'].includes(e.key)) {
    if (isReloading) return; 
    const slot = parseInt(e.key);
    if (slot === 2 && !localPlayer.inv.pistol) return;
    if (slot === 3 && !localPlayer.inv.shotgun) return;
    if (slot === 4 && localPlayer.inv.mask <= 0) return;
    if (slot === 5 && localPlayer.inv.medkit <= 0) return;
    if (slot === 6 && localPlayer.inv.food <= 0) return;
    if (slot === 7 && localPlayer.inv.water <= 0) return;
    switchSlot(slot);
  }

  if (e.key.toLowerCase() === 'e' && shopOpenType === 'none') {
    let inTrader = false, inSuper = false;
    zones.forEach(z => {
      if(localPlayer.x > z.x && localPlayer.x < z.x+z.w && localPlayer.y > z.y && localPlayer.y < z.y+z.h) {
        if (z.type === 'trader') inTrader = true;
        if (z.type === 'supermarket') inSuper = true;
      }
    });

    if (inTrader) openShop('trader');
    else if (inSuper) openShop('supermarket');
    else {
      let closestId = null, closestDist = 70;
      for (let id in drops) {
        let d = Math.hypot(drops[id].x - localPlayer.x, drops[id].y - localPlayer.y);
        if (d < closestDist) { closestDist = d; closestId = id; }
      }
      if (closestId) {
        let type = drops[closestId].type; remove(ref(db, `drops/${closestId}`));
        if (type === 'scrap') localPlayer.inv.scrap++;
        else if (type === 'mask') localPlayer.inv.mask++;
        else if (type === 'medkit') localPlayer.inv.medkit++;
        else if (type === 'pistol') { localPlayer.inv.pistol = true; localPlayer.inv.pistolAmmo = 12; }
        else if (type === 'shotgun') { localPlayer.inv.shotgun = true; localPlayer.inv.shotgunAmmo = 6; }
        updateUI();
        if (type === 'pistol' && activeSlot === 1) switchSlot(2);
        if (type === 'shotgun' && activeSlot !== 3) switchSlot(3);
      }
    }
  }
});

function startReload() {
  if (activeSlot === 2 && localPlayer.inv.pistolAmmo < 12) {
    isReloading = true; reloadProgress = 0;
    setTimeout(() => { localPlayer.inv.pistolAmmo = 12; isReloading = false; updateUI(); }, 1500);
  } else if (activeSlot === 3 && localPlayer.inv.shotgunAmmo < 6) {
    isReloading = true; reloadProgress = 0;
    setTimeout(() => { localPlayer.inv.shotgunAmmo = 6; isReloading = false; updateUI(); }, 1500);
  }
}

function switchSlot(slot) {
  document.getElementById(`slot-${activeSlot}`).classList.remove('active');
  activeSlot = slot; localPlayer.activeSlot = slot;
  document.getElementById(`slot-${activeSlot}`).classList.add('active');
  updateUI();
}

// --- 5. NETWORKING ---
onDisconnect(playerRef).remove();
  
onValue(ref(db, 'players'), s => { otherPlayers = s.val() || {}; delete otherPlayers[playerId]; });
onValue(ref(db, 'entities'), s => entities = s.val() || {});
onValue(ref(db, 'drops'), s => drops = s.val() || {});
onValue(ref(db, 'boss_timers'), s => bossTimers = s.val() || {});

onValue(playerRef, snapshot => {
  const data = snapshot.val();
  if (data && data.hp !== undefined) {
    if (data.hp <= 0 && localPlayer.hp > 0) handleDeath("You were killed by another survivor...");
    else if (data.hp < localPlayer.hp) localPlayer.hp = data.hp; 
    updateUI();
  }
});

function handleDeath(msg) {
  if (isDead) return;
  isDead = true;
  closeShops();
  
  localPlayer.hp = 0;
  localPlayer.money = 0;
  localPlayer.inv = { pistol: false, shotgun: false, mask: 0, medkit: 0, scrap: 0, food: 0, water: 0, pistolAmmo: 0, shotgunAmmo: 0 };
  
  update(playerRef, { hp: 0 }); 
  
  document.getElementById('death-message').innerText = msg;
  document.getElementById('death-screen').style.display = 'block';
  
  switchSlot(1);
  updateUI();
  saveGame(); 
}

document.getElementById('btn-respawn').onclick = () => {
  isDead = false;
  document.getElementById('death-screen').style.display = 'none';
  
  localPlayer.hp = localPlayer.maxHp;
  localPlayer.virus = 0;
  localPlayer.hunger = 100;
  localPlayer.thirst = 100;
  localPlayer.x = 2000;
  localPlayer.y = 5000; 
  
  update(playerRef, { hp: localPlayer.maxHp, x: localPlayer.x, y: localPlayer.y });
  saveGame();
  updateUI();
};

// --- 6. SHOPS ---
function openShop(type) {
  shopOpenType = type;
  document.getElementById('shop-ui').style.display = type === 'trader' ? 'block' : 'none';
  document.getElementById('supermarket-ui').style.display = type === 'supermarket' ? 'block' : 'none';
  keys['w']=false; keys['a']=false; keys['s']=false; keys['d']=false; keys['shift']=false;
  updateShopUI();
}
function closeShops() { shopOpenType = 'none'; document.getElementById('shop-ui').style.display = 'none'; document.getElementById('supermarket-ui').style.display = 'none'; }

function updateShopUI() {
  document.getElementById('shop-cash').innerText = localPlayer.money;
  document.getElementById('shop-scrap').innerText = localPlayer.inv.scrap;
  document.getElementById('btn-sell').disabled = localPlayer.inv.scrap <= 0;
  document.getElementById('btn-pistol').innerText = localPlayer.inv.pistol ? "Pistol (Owned)" : "Buy Pistol (-$400)";
  document.getElementById('btn-pistol').disabled = localPlayer.money < 400 || localPlayer.inv.pistol;
  document.getElementById('btn-shotgun').innerText = localPlayer.inv.shotgun ? "Shotgun (Owned)" : "Buy Shotgun (-$1000)";
  document.getElementById('btn-shotgun').disabled = localPlayer.money < 1000 || localPlayer.inv.shotgun;
  document.getElementById('btn-mask').disabled = localPlayer.money < 50;
  document.getElementById('btn-medkit').disabled = localPlayer.money < 100;

  document.getElementById('super-cash').innerText = localPlayer.money;
  document.getElementById('btn-food').disabled = localPlayer.money < 30;
  document.getElementById('btn-water').disabled = localPlayer.money < 20;
}

document.getElementById('btn-close').onclick = closeShops; document.getElementById('btn-close-super').onclick = closeShops;
document.getElementById('btn-sell').onclick = () => { if(localPlayer.inv.scrap > 0) { localPlayer.inv.scrap--; localPlayer.money += 25; updateUI(); updateShopUI(); }};
document.getElementById('btn-mask').onclick = () => { if(localPlayer.money >= 50) { localPlayer.money -= 50; localPlayer.inv.mask++; updateUI(); updateShopUI(); }};
document.getElementById('btn-medkit').onclick = () => { if(localPlayer.money >= 100) { localPlayer.money -= 100; localPlayer.inv.medkit++; updateUI(); updateShopUI(); }};
document.getElementById('btn-pistol').onclick = () => { if(localPlayer.money >= 400 && !localPlayer.inv.pistol) { localPlayer.money -= 400; localPlayer.inv.pistol = true; localPlayer.inv.pistolAmmo = 12; updateUI(); updateShopUI(); switchSlot(2); }};
document.getElementById('btn-shotgun').onclick = () => { if(localPlayer.money >= 1000 && !localPlayer.inv.shotgun) { localPlayer.money -= 1000; localPlayer.inv.shotgun = true; localPlayer.inv.shotgunAmmo = 6; updateUI(); updateShopUI(); switchSlot(3); }};
document.getElementById('btn-food').onclick = () => { if(localPlayer.money >= 30) { localPlayer.money -= 30; localPlayer.inv.food++; updateUI(); updateShopUI(); }};
document.getElementById('btn-water').onclick = () => { if(localPlayer.money >= 20) { localPlayer.money -= 20; localPlayer.inv.water++; updateUI(); updateShopUI(); }};

// --- 7. LOGIC & COMBAT ---
function handleAction() {
  if (isDead || isReloading) return;
  
  if (activeSlot === 4) { if (localPlayer.inv.mask > 0 && localPlayer.virus > 0) { localPlayer.inv.mask--; localPlayer.virus = Math.max(0, localPlayer.virus - 50); if (localPlayer.inv.mask === 0) switchSlot(1); updateUI(); } return; } 
  if (activeSlot === 5) { if (localPlayer.inv.medkit > 0 && localPlayer.hp < localPlayer.maxHp) { localPlayer.inv.medkit--; localPlayer.hp = Math.min(localPlayer.maxHp, localPlayer.hp + 60); update(playerRef, { hp: localPlayer.hp }); if (localPlayer.inv.medkit === 0) switchSlot(1); updateUI(); } return; }
  if (activeSlot === 6) { if (localPlayer.inv.food > 0 && localPlayer.hunger < 100) { localPlayer.inv.food--; localPlayer.hunger = Math.min(100, localPlayer.hunger + 50); if (localPlayer.inv.food === 0) switchSlot(1); updateUI(); } return; }
  if (activeSlot === 7) { if (localPlayer.inv.water > 0 && localPlayer.thirst < 100) { localPlayer.inv.water--; localPlayer.thirst = Math.min(100, localPlayer.thirst + 50); if (localPlayer.inv.water === 0) switchSlot(1); updateUI(); } return; }

  if (inSafeZone(localPlayer.x, localPlayer.y)) {
     let p = document.getElementById('interaction-prompt');
     p.style.display = 'block'; p.innerText = "Weapons disabled in Safe Zones!";
     setTimeout(() => p.style.display = 'none', 1000);
     return;
  }

  if (activeSlot === 2 && localPlayer.inv.pistolAmmo <= 0) { startReload(); return; }
  if (activeSlot === 3 && localPlayer.inv.shotgunAmmo <= 0) { startReload(); return; }

  const now = Date.now();
  let cooldown = 400; if (activeSlot === 2) cooldown = 300; if (activeSlot === 3) cooldown = 800; 
  if (now - lastAttackTime < cooldown) return; lastAttackTime = now;
  localPlayer.isAttacking = true;

  let range = 70, damage = 15, spread = 0.3;
  if (activeSlot === 2) { range = 500; damage = 25; spread = 0.1; drawMuzzleFlash = 5; localPlayer.inv.pistolAmmo--; }
  if (activeSlot === 3) { range = 350; damage = 45; spread = 0.5; drawMuzzleFlash = 8; localPlayer.inv.shotgunAmmo--; }
  updateUI();

  const checkHit = (target, isPlayer, id) => {
    if (isPlayer && inSafeZone(target.x, target.y)) return;

    let dx = target.x - localPlayer.x, dy = target.y - localPlayer.y; let dist = Math.sqrt(dx*dx + dy*dy);
    let angleToTarget = Math.atan2(dy, dx); let angleDiff = Math.abs(angleToTarget - localPlayer.angle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    if (dist < range && (activeSlot === 1 ? true : angleDiff < spread)) {
      let newHp = Math.max(0, target.hp - damage);
      let targetRef = isPlayer ? ref(db, `players/${id}`) : ref(db, `entities/${id}`);
      
      if (newHp === 0 && target.hp > 0) {
        if(!isPlayer) { 
          remove(targetRef); const dropId = 'drop_' + Math.random().toString(36).substr(2,6);
          let loot = 'scrap';
          if (target.type.startsWith('boss')) {
             loot = Math.random() < 0.5 ? 'shotgun' : 'medkit'; 
             localPlayer.money += 1000; 
             for(let i=0; i<3; i++) set(ref(db, `drops/drop_${Math.random().toString(36).substr(2,6)}`), {x: target.x+(Math.random()*40-20), y: target.y+(Math.random()*40-20), type: 'scrap', timestamp: Date.now()});
          } else { 
             const r = Math.random(); if (r < 0.05) loot = 'pistol'; else if (r < 0.15) loot = 'mask'; else if (r < 0.25) loot = 'medkit'; 
             localPlayer.money += 10;
          }
          set(ref(db, `drops/${dropId}`), {x: target.x, y: target.y, type: loot, timestamp: Date.now()});
        } else { 
          update(targetRef, { hp: newHp }); localPlayer.money += 300; 
          set(ref(db, `drops/drop_${Math.random().toString(36).substr(2,6)}`), {x: target.x, y: target.y, type: 'scrap', timestamp: Date.now()});
        } updateUI();
      } else { update(targetRef, { hp: newHp }); }
    }
  };
  for (let id in otherPlayers) if (otherPlayers[id].hp > 0) checkHit(otherPlayers[id], true, id);
  for (let id in entities) checkHit(entities[id], false, id);
}

function updateGame(dt) {
  if (isDead) return;
  if (localPlayer.hp <= 0) { handleDeath("You succumbed to the wasteland elements..."); return; }
  if (shopOpenType !== 'none') return;

  if (isReloading) reloadProgress = Math.min(1.0, reloadProgress + (dt / 1.5));

  let speed = keys['shift'] ? 450 : 250;
  if (keys['shift'] && (keys['w']||keys['a']||keys['s']||keys['d']) && localPlayer.stamina > 0) {
    localPlayer.stamina -= 30 * dt;
  } else { localPlayer.stamina = Math.min(100, localPlayer.stamina + 20 * dt); }
  if (localPlayer.stamina <= 0) speed = 250;

  let dx = 0, dy = 0;
  if (keys['w']) dy -= 1; if (keys['s']) dy += 1;
  if (keys['a']) dx -= 1; if (keys['d']) dx += 1;
  
  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx*dx + dy*dy);
    let nx = localPlayer.x + (dx/len) * speed * dt;
    let ny = localPlayer.y + (dy/len) * speed * dt;
    
    if (!isColliding(nx, ny, 16, false)) { localPlayer.x = nx; localPlayer.y = ny; }
    else if (!isColliding(nx, localPlayer.y, 16, false)) { localPlayer.x = nx; }
    else if (!isColliding(localPlayer.x, ny, 16, false)) { localPlayer.y = ny; }
  }
  
  localPlayer.angle = Math.atan2(mouse.y - height/2, mouse.x - width/2);
  camera.x += (localPlayer.x - camera.x) * 0.1; camera.y += (localPlayer.y - camera.y) * 0.1;

  let inSafe = false, inHosp = false, inTrader = false, inSuper = false;
  zones.forEach(z => {
    if (localPlayer.x > z.x && localPlayer.x < z.x+z.w && localPlayer.y > z.y && localPlayer.y < z.y+z.h) {
       if (z.type === 'safe' || z.type === 'trader' || z.type === 'supermarket') inSafe = true;
       if (z.type === 'hospital') inHosp = true;
       if (z.type === 'trader') inTrader = true;
       if (z.type === 'supermarket') inSuper = true;
    }
  });
  
  if (inHosp) {
    localPlayer.hp = Math.min(localPlayer.maxHp, localPlayer.hp + 20 * dt);
  } 
  
  localPlayer.hunger = Math.max(0, localPlayer.hunger - 0.5 * dt);
  localPlayer.thirst = Math.max(0, localPlayer.thirst - 0.8 * dt);

  let inVirusBubble = false;
  for (let id in entities) {
     let e = entities[id];
     if (e.type === 'zombie' || e.type.startsWith('boss')) {
        let r = e.type.startsWith('boss') ? 375 : 150;
        if (Math.hypot(e.x - localPlayer.x, e.y - localPlayer.y) < r) {
           inVirusBubble = true; break;
        }
     }
  }

  if (inVirusBubble && !inSafe) {
     localPlayer.virus = Math.min(100, localPlayer.virus + 5 * dt);
  }

  if (localPlayer.hunger <= 0 || localPlayer.thirst <= 0) localPlayer.hp -= 3 * dt;
  if (localPlayer.virus >= 100) localPlayer.hp -= 5 * dt; 
  if (localPlayer.hp <= 0) { handleDeath("You succumbed to the wasteland elements..."); return; }

  let showPrompt = false, promptText = "";
  if (inTrader) { showPrompt = true; promptText = "Press E to Trade"; }
  else if (inSuper) { showPrompt = true; promptText = "Press E to Shop Supermarket"; }
  else {
    for (let id in drops) {
      if (Math.hypot(drops[id].x - localPlayer.x, drops[id].y - localPlayer.y) < 70) {
        showPrompt = true; promptText = `Press E to pick up ${drops[id].type.toUpperCase()}`; break;
      }
    }
  }
  document.getElementById('interaction-prompt').style.display = showPrompt ? 'block' : 'none';
  document.getElementById('interaction-prompt').innerText = promptText;

  if (Date.now() - lastSync > 60) {
    update(playerRef, {
      x: Math.round(localPlayer.x), y: Math.round(localPlayer.y),
      angle: parseFloat(localPlayer.angle.toFixed(2)),
      isAttacking: localPlayer.isAttacking, color: localPlayer.color, 
      activeSlot: localPlayer.activeSlot, timestamp: Date.now()
    });
    lastSync = Date.now(); updateUI(); saveGame();
  }
}

function updateUI() {
  document.getElementById('hp-fill').style.width = Math.max(0, localPlayer.hp) + '%';
  document.getElementById('virus-fill').style.width = Math.min(100, localPlayer.virus) + '%';
  document.getElementById('stamina-fill').style.width = localPlayer.stamina + '%';
  document.getElementById('hunger-fill').style.width = localPlayer.hunger + '%';
  document.getElementById('thirst-fill').style.width = localPlayer.thirst + '%';
  
  document.getElementById('money').innerText = localPlayer.money;
  document.getElementById('scrap-count').innerText = localPlayer.inv.scrap;
  
  document.getElementById('slot-2').style.display = localPlayer.inv.pistol ? 'flex' : 'none';
  document.getElementById('slot-3').style.display = localPlayer.inv.shotgun ? 'flex' : 'none';
  document.getElementById('slot-4').style.display = localPlayer.inv.mask > 0 ? 'flex' : 'none';
  document.getElementById('slot-5').style.display = localPlayer.inv.medkit > 0 ? 'flex' : 'none';
  document.getElementById('slot-6').style.display = localPlayer.inv.food > 0 ? 'flex' : 'none';
  document.getElementById('slot-7').style.display = localPlayer.inv.water > 0 ? 'flex' : 'none';
  
  for(let i=1; i<=7; i++) { let el = document.getElementById(`slot-${i}`); if(el) el.className = `slot ${activeSlot===i?'active':''}`; }
  
  document.getElementById('qty-mask').innerText = localPlayer.inv.mask > 0 ? localPlayer.inv.mask : '';
  document.getElementById('qty-medkit').innerText = localPlayer.inv.medkit > 0 ? localPlayer.inv.medkit : '';
  document.getElementById('qty-food').innerText = localPlayer.inv.food > 0 ? localPlayer.inv.food : '';
  document.getElementById('qty-water').innerText = localPlayer.inv.water > 0 ? localPlayer.inv.water : '';
  
  document.getElementById('ammo-pistol').style.display = localPlayer.inv.pistol ? 'block' : 'none';
  document.getElementById('ammo-pistol').innerText = `${localPlayer.inv.pistolAmmo}/12`;
  document.getElementById('ammo-shotgun').style.display = localPlayer.inv.shotgun ? 'block' : 'none';
  document.getElementById('ammo-shotgun').innerText = `${localPlayer.inv.shotgunAmmo}/6`;
}
updateUI();

// --- 8. RENDERER ---
function drawCircle(x, y, r, color, border = null) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill(); if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawPlayer(p, isLocal) {
  ctx.save(); ctx.translate(p.x, p.y);
  const isBoss = p.type && p.type.startsWith('boss'); 
  const isZombie = p.type === 'zombie' || isBoss;
  const isProj = p.type === 'projectile';

  if (isProj) {
    ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore(); return;
  }
  
  if (isZombie) {
     ctx.save();
     ctx.beginPath();
     let r = isBoss ? 375 : 150; 
     ctx.arc(0, 0, r, 0, Math.PI * 2);
     ctx.fillStyle = 'rgba(46, 204, 113, 0.15)'; 
     ctx.fill();
     ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
     ctx.lineWidth = 2;
     ctx.stroke();
     ctx.restore();
  }

  const scale = isBoss ? 2.5 : 1; ctx.scale(scale, scale); ctx.rotate(p.angle);
  
  const currSlot = p.activeSlot || 1;
  if (isLocal && drawMuzzleFlash > 0 && !isDead) {
    drawMuzzleFlash--; ctx.fillStyle = 'rgba(241, 196, 15, 0.8)';
    if (currSlot === 2) ctx.fillRect(25, -2, 500, 3); 
    if (currSlot === 3) { ctx.beginPath(); ctx.moveTo(25,0); ctx.lineTo(300, -80); ctx.lineTo(300, 80); ctx.fill(); }
  }

  if (!isZombie) {
     ctx.fillStyle = '#f1c40f'; 
     if (currSlot === 2) { 
        drawCircle(15, 10, 5, '#f1c40f'); drawCircle(22, -12, 5, '#f1c40f'); 
        ctx.fillStyle = '#7f8c8d'; ctx.fillRect(18, -14, 12, 6);
     } else if (currSlot === 3) { 
        drawCircle(15, 10, 5, '#f1c40f'); drawCircle(25, -12, 5, '#f1c40f'); 
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(10, -15, 24, 7);
     } else if (currSlot === 5) { 
        drawCircle(15, 10, 5, '#f1c40f'); drawCircle(22, -12, 5, '#f1c40f');
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(15, -18, 12, 12);
        ctx.fillStyle = '#fff'; ctx.fillRect(19, -17, 4, 10); ctx.fillRect(16, -14, 10, 4);
     } else if (currSlot === 6) { 
        drawCircle(15, 10, 5, '#f1c40f'); drawCircle(20, -12, 5, '#f1c40f');
        ctx.fillStyle = '#d35400'; drawCircle(22, -12, 7, '#d35400', '#8e44ad');
     } else if (currSlot === 7) { 
        drawCircle(15, 10, 5, '#f1c40f'); drawCircle(20, -12, 5, '#f1c40f');
        ctx.fillStyle = '#0984e3'; ctx.fillRect(18, -18, 8, 14); ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.strokeRect(18,-18,8,14);
     } else { 
        if (p.isAttacking) { drawCircle(22, -12, 6, '#e67e22'); drawCircle(25, 10, 6, '#e67e22'); }
        else { drawCircle(15, -12, 5, '#f1c40f'); drawCircle(15, 10, 5, '#f1c40f'); }
     }
  } else {
     ctx.fillStyle = '#1e8449'; 
     if (p.isAttacking) { drawCircle(22, -12, 6, '#1e8449'); drawCircle(25, 10, 6, '#1e8449'); }
     else { drawCircle(15, -12, 5, '#1e8449'); drawCircle(15, 10, 5, '#1e8449'); }
  }
  
  let bodyColor = p.color || getNonGreenColor();
  if (isZombie) bodyColor = isBoss ? '#0d4018' : '#2ecc71';
  
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.clip();
  if (zekeImg.complete && zekeImg.naturalWidth !== 0) {
    ctx.drawImage(zekeImg, -16, -16, 32, 32);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = bodyColor; ctx.fillRect(-16, -16, 32, 32);
  } else { ctx.fillStyle = bodyColor; ctx.fillRect(-16, -16, 32, 32); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  
  if (!isZombie && currSlot === 4) {
     ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.arc(6, 0, 10, 0, Math.PI*2); ctx.fill();
     ctx.fillStyle = '#2c3e50'; ctx.fillRect(10, -5, 4, 10);
  }
  ctx.restore();
  
  if (p.hp > 0 || !isLocal) {
      ctx.fillStyle = '#000'; ctx.fillRect(p.x - 20, p.y - 35 - (isBoss?30:0), 40, 6);
      ctx.fillStyle = isBoss ? '#e67e22' : (isZombie ? '#8e44ad' : '#e74c3c');
      let maxHp = 100;
      if (p.type === 'boss_butcher') maxHp = 8000;
      else if (p.type === 'boss_spitter') maxHp = 6000;
      else if (p.type === 'boss_warden') maxHp = 7000;
      else if (isZombie) maxHp = 50;
      
      ctx.fillRect(p.x - 20, p.y - 35 - (isBoss?30:0), 40 * ((p.hp || maxHp)/maxHp), 6);
      
      if (isBoss) {
        ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 16px Courier New'; ctx.textAlign = 'center'; 
        let bName = p.type === 'boss_butcher' ? "THE BUTCHER" : (p.type === 'boss_spitter' ? "TOXIC SPITTER" : "THE WARDEN");
        ctx.fillText(bName, p.x, p.y - 45);
      } else if (isLocal) { 
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'center'; ctx.fillText("YOU", p.x, p.y - 42); 
        if (isReloading) {
           ctx.fillStyle = '#000'; ctx.fillRect(p.x - 15, p.y + 25, 30, 4);
           ctx.fillStyle = '#f1c40f'; ctx.fillRect(p.x - 15, p.y + 25, 30 * reloadProgress, 4);
        }
      } else if (!isZombie) { 
        ctx.fillStyle = '#e74c3c'; ctx.font = '10px Courier New'; ctx.textAlign = 'center'; ctx.fillText("PLAYER", p.x, p.y - 42); 
      }
  }
}

function drawMap() {
  ctx.fillStyle = '#1a252f'; ctx.fillRect(0, 0, mapSize, mapSize);
  ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2;
  for(let i=0; i<mapSize; i+=200) {
    if(i>camera.x-width && i<camera.x+width) { ctx.beginPath(); ctx.moveTo(i, Math.max(0,camera.y-height)); ctx.lineTo(i, Math.min(mapSize,camera.y+height)); ctx.stroke(); }
    if(i>camera.y-height && i<camera.y+height) { ctx.beginPath(); ctx.moveTo(Math.max(0,camera.x-width), i); ctx.lineTo(Math.min(mapSize,camera.x+width), i); ctx.stroke(); }
  }
  zones.forEach(z => {
    if (z.x+z.w < camera.x-width/2 || z.x > camera.x+width/2 || z.y+z.h < camera.y-height/2 || z.y > camera.y+height/2) return;
    ctx.fillStyle = z.color; ctx.fillRect(z.x, z.y, z.w, z.h); ctx.strokeStyle = z.border; ctx.lineWidth = 4; ctx.strokeRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 36px Courier New'; ctx.textAlign = 'center';
    const lines = z.name.split('\n'); lines.forEach((line, idx) => ctx.fillText(line, z.x + z.w/2, z.y + z.h/2 - 15 + (idx*40)));
  });

  ctx.fillStyle = '#34495e'; ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 3;
  walls.forEach(w => {
     if (w.x+w.w < camera.x-width/2 || w.x > camera.x+width/2 || w.y+w.h < camera.y-height/2 || w.y > camera.y+height/2) return;
     ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeRect(w.x, w.y, w.w, w.h);
  });

  for (let id in drops) {
     let d = drops[id]; if (d.x < camera.x-width/2 || d.x > camera.x+width/2 || d.y < camera.y-height/2 || d.y > camera.y+height/2) continue;
     ctx.save(); ctx.translate(d.x, d.y);
     if (d.type === 'scrap') { ctx.fillStyle = '#95a5a6'; ctx.fillRect(-8, -8, 16, 16); }
     else if (d.type === 'pistol') { ctx.fillStyle = '#f1c40f'; ctx.fillRect(-12, -4, 24, 8); }
     else if (d.type === 'shotgun') { ctx.fillStyle = '#e74c3c'; ctx.fillRect(-16, -6, 32, 12); }
     else if (d.type === 'mask') { ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); }
     else if (d.type === 'medkit') { ctx.fillStyle = '#fff'; ctx.fillRect(-10,-10,20,20); ctx.fillStyle='#e74c3c'; ctx.fillRect(-8,-2,16,4); ctx.fillRect(-2,-8,4,16); }
     ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-12,-12,24,24); ctx.restore();
  }
}

function drawMinimap() {
  mCtx.clearRect(0,0,160,160); const scale = 160 / mapSize;
  zones.forEach(z => { mCtx.fillStyle = z.border; mCtx.globalAlpha = 0.5; mCtx.fillRect(z.x * scale, z.y * scale, z.w * scale, z.h * scale); mCtx.globalAlpha = 1.0; });
  walls.forEach(w => { mCtx.fillStyle = '#555'; mCtx.fillRect(w.x*scale, w.y*scale, w.w*scale, w.h*scale); });
  for(let id in entities) { mCtx.fillStyle = entities[id].type.startsWith('boss') ? '#e67e22' : '#27ae60'; let s = entities[id].type.startsWith('boss') ? 5 : 2; mCtx.fillRect(entities[id].x * scale - s/2, entities[id].y * scale - s/2, s, s); }
  mCtx.fillStyle = '#e74c3c';
  for(let id in otherPlayers) { if (otherPlayers[id].hp > 0) mCtx.fillRect(otherPlayers[id].x * scale - 2, otherPlayers[id].y * scale - 2, 4, 4); }
  if (!isDead) { mCtx.fillStyle = '#fff'; mCtx.fillRect(localPlayer.x * scale - 2, localPlayer.y * scale - 2, 5, 5); }
}

// --- 9. PvE DISTRIBUTED AI & BOSS SPAWNER ---
setInterval(() => {
  const now = Date.now();
  
  const checkBoss = (bType, bHp, bx, by) => {
     let lastSpawn = bossTimers[bType] || 0;
     if (now - lastSpawn > 900000) {
        update(ref(db, `boss_timers`), { [bType]: now }); 
        const bId = bType + '_' + Math.random().toString(36).substr(2,6);
        set(ref(db, `entities/${bId}`), { x: bx, y: by, hp: bHp, type: bType, angle: 0, timestamp: now });
     }
  };
  checkBoss('boss_butcher', 8000, 8750, 1750);
  checkBoss('boss_spitter', 6000, 1250, 1250);
  checkBoss('boss_warden', 7000, 1250, 8750);

  if (Object.keys(entities).length < 75 && Math.random() < 0.4) {
    let zx = Math.random() * mapSize, zy = Math.random() * mapSize;
    if (!inSafeZone(zx, zy)) { 
       const zId = 'z_' + Math.random().toString(36).substr(2, 6);
       update(ref(db, `entities/${zId}`), { x: zx, y: zy, hp: 50, type: 'zombie', angle: 0, timestamp: now });
    }
  }
}, 1000);

setInterval(() => {
  const now = Date.now();
  for (let id in entities) {
    let e = entities[id]; if (!e || e.hp <= 0) continue;
    
    if (e.type === 'projectile') {
       let nx = e.x + Math.cos(e.angle) * 15; let ny = e.y + Math.sin(e.angle) * 15;
       if (isColliding(nx, ny, 8) || now - e.timestamp > 3000) { remove(ref(db, `entities/${id}`)); continue; }
       if (!isDead && Math.hypot(nx - localPlayer.x, ny - localPlayer.y) < 25 && !inSafeZone(localPlayer.x, localPlayer.y)) {
          localPlayer.hp = Math.max(0, localPlayer.hp - 15);
          localPlayer.virus = Math.min(100, localPlayer.virus + 10);
          update(playerRef, { hp: localPlayer.hp }); updateUI();
          remove(ref(db, `entities/${id}`)); continue;
       }
       if (Math.random() < 0.1) update(ref(db, `entities/${id}`), {x: nx, y: ny});
       e.x = nx; e.y = ny; 
       continue;
    }

    let closestDist = Math.hypot(e.x - localPlayer.x, e.y - localPlayer.y); let closestIsMe = true; let target = localPlayer;
    for (let pid in otherPlayers) {
      let p = otherPlayers[pid]; if (!p || p.hp <= 0) continue;
      let d = Math.hypot(e.x - p.x, e.y - p.y); if (d < closestDist) { closestDist = d; closestIsMe = false; }
    }
    
    if (closestIsMe && closestDist < 1500) {
      let angle = Math.atan2(target.y - e.y, target.x - e.x); 
      let speed = e.type === 'zombie' ? 8 : (e.type === 'boss_butcher' ? 12 : 5); 
      let isAttacking = false; let range = e.type.startsWith('boss') ? 80 : 40;

      if (e.type === 'boss_spitter' && Math.random() < 0.05 && closestDist < 800 && !inSafeZone(target.x, target.y) && !isDead) {
         let pId = 'projectile_' + Math.random().toString(36).substr(2,6);
         set(ref(db, `entities/${pId}`), {x: e.x, y: e.y, type: 'projectile', angle: angle, timestamp: now});
      }
      if (e.type === 'boss_warden' && Math.random() < 0.02) {
         let zId = 'z_' + Math.random().toString(36).substr(2,6);
         set(ref(db, `entities/${zId}`), {x: e.x + Math.random()*100-50, y: e.y + Math.random()*100-50, hp: 50, type: 'zombie', angle: 0, timestamp: now});
      }
      if (e.type === 'boss_butcher' && Math.random() < 0.05) { speed = 25; } 

      let nx = e.x + Math.cos(angle) * speed; let ny = e.y + Math.sin(angle) * speed;
      
      if (!isColliding(nx, ny, 16, true)) { e.x = nx; e.y = ny; }
      else if (!isColliding(nx, e.y, 16, true)) { e.x = nx; }
      else if (!isColliding(e.x, ny, 16, true)) { e.y = ny; }

      if (closestDist < range && !isDead && !inSafeZone(localPlayer.x, localPlayer.y)) {
        isAttacking = true; 
        if (Math.random() < 0.3) { 
           let dmg = e.type === 'boss_butcher' ? 30 : (e.type.startsWith('boss') ? 15 : 6);
           localPlayer.hp = Math.max(0, localPlayer.hp - dmg);
           update(playerRef, { hp: localPlayer.hp }); updateUI();
        }
      }
      update(ref(db, `entities/${id}`), { x: e.x, y: e.y, angle, isAttacking, timestamp: now });
    }
  }
  
  for (let eid in entities) if (now - (entities[eid].timestamp||0) > 15000) remove(ref(db, `entities/${eid}`));
  for (let did in drops) if (now - (drops[did].timestamp||0) > 120000) remove(ref(db, `drops/${did}`));
}, 100);

let lastTime = Date.now();
function loop() {
  const now = Date.now(); updateGame((now - lastTime) / 1000); lastTime = now;
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.translate(width/2 - camera.x, height/2 - camera.y);
  drawMap();
  
  let renderList = [];
  for (let id in entities) renderList.push({...entities[id], isPlayer: false, isLocal: false});
  for (let id in otherPlayers) if (otherPlayers[id].hp > 0) renderList.push({...otherPlayers[id], isPlayer: true, isLocal: false});
  if (!isDead) renderList.push({...localPlayer, isPlayer: true, isLocal: true});
  
  renderList.sort((a,b) => {
     if (a.type === 'projectile') return 1; if (b.type === 'projectile') return -1;
     if (a.type && a.type.startsWith('boss')) return -1; if (b.type && b.type.startsWith('boss')) return 1;
     return 0;
  });

  renderList.forEach(e => drawPlayer(e, e.isLocal));
  ctx.restore(); drawMinimap();
  requestAnimationFrame(loop);
}
loop();

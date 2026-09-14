import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, update, remove, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- 1. FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyCyD2K3TT7hOfakFPgJ9mMjTEM8Jim9_rA",
  authDomain: "z-clicker-97488.firebaseapp.com",
  databaseURL: "https://z-clicker-97488-default-rtdb.firebaseio.com",
  projectId: "z-clicker-97488"
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
  { name: "HOSPITAL\n(Health + Virus)", x: 4500, y: 8000, w: 1200, h: 1000, color: "rgba(231, 76, 60, 0.15)", border: "#e74c3c", type: 'hospital' },
  { name: "BUNKER\n(Black Market)", x: 1500, y: 4500, w: 1000, h: 1000, color: "rgba(52, 152, 219, 0.15)", border: "#3498db", type: 'bunker' },
  { name: "TRADER\n(Buy/Sell)", x: 8000, y: 4500, w: 1000, h: 1000, color: "rgba(241, 196, 15, 0.15)", border: "#f1c40f", type: 'trader' },
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
  {x: 4500, y: 1500, w: 1000, h: 40}, {x: 4500, y: 1500, w: 40, h: 800}, {x: 5460, y: 1500, w: 40, h: 800},
  {x: 4500, y: 8960, w: 1200, h: 40}, {x: 4500, y: 8000, w: 40, h: 1000}, {x: 5660, y: 8000, w: 40, h: 1000},
  
  // Bunker Walls (Door is the bottom gap)
  {x: 1500, y: 4500, w: 1000, h: 40}, {x: 1500, y: 4500, w: 40, h: 1000}, {x: 2460, y: 4500, w: 40, h: 1000},
  {x: 1500, y: 5460, w: 400, h: 40}, {x: 2100, y: 5460, w: 400, h: 40}, // 200px gap for door at (1900, 5460)
  
  {x: 8000, y: 4500, w: 1000, h: 40}, {x: 8000, y: 5460, w: 1000, h: 40}, {x: 8960, y: 4500, w: 40, h: 1000}
];

const bunkerDoor = { x: 1900, y: 5460, w: 200, h: 40 };

function inSafeZone(px, py) {
  for (let z of zones) {
    if (['bunker', 'trader', 'supermarket', 'hospital'].includes(z.type)) {
      if (px > z.x && px < z.x + z.w && py > z.y && py < z.y + z.h) return true;
    }
  }
  return false;
}

// WEAPON CONFIGURATION
const weapons = {
  1: { name: 'Fists', range: 70, dmg: 15, spread: 0.5, cd: 400, type: 'melee' },
  2: { name: 'Bat', range: 110, dmg: 30, spread: 1.5, cd: 600, type: 'melee' },
  3: { name: 'Pistol', range: 500, dmg: 25, spread: 0.1, cd: 300, type: 'ranged', ammo: 'pistolAmmo', maxAmmo: 12 },
  4: { name: 'Shotgun', range: 350, dmg: 45, spread: 0.5, cd: 800, type: 'ranged', ammo: 'shotgunAmmo', maxAmmo: 6 },
  5: { name: 'Crossbow', range: 600, dmg: 55, spread: 0.05, cd: 1200, type: 'ranged', ammo: 'crossAmmo', maxAmmo: 1 }
};

// --- 3. PERSISTENCE & INITIALIZATION ---
let savedId = localStorage.getItem('z_surv_id_v2');
if (!savedId) { savedId = 'survivor_' + Math.random().toString(36).substr(2, 6); localStorage.setItem('z_surv_id_v2', savedId); }
const playerId = savedId; const playerRef = ref(db, `players/${playerId}`);

function getNonGreenColor() {
  let h; do { h = Math.floor(Math.random() * 360); } while (h >= 70 && h <= 160);
  return `hsl(${h}, 80%, 50%)`;
}

let localPlayer = {
  x: 2000, y: 6000, hp: 100, maxHp: 100, virusLevel: 0, stamina: 100, hunger: 100, thirst: 100, money: 0,
  angle: 0, isAttacking: false, activeSlot: 1, color: getNonGreenColor(), virusTimer: 0,
  inv: { bat: false, pistol: false, shotgun: false, crossbow: false, maskLevel: 0, hasHazmat: false, bunkerPass: false,
         medkit: 0, scrap: 0, food: 0, water: 0, pistolAmmo: 0, shotgunAmmo: 0, crossAmmo: 0 }
};

let isDead = false; 
let savedData = localStorage.getItem('z_surv_data_v2');
if (savedData) {
  try {
    let parsed = JSON.parse(savedData);
    localPlayer = { ...localPlayer, ...parsed };
    if (localPlayer.hp <= 0) { isDead = true; document.getElementById('death-screen').style.display = 'block'; }
  } catch(e) {}
}

function saveGame() {
  localStorage.setItem('z_surv_data_v2', JSON.stringify({
    x: localPlayer.x, y: localPlayer.y, hp: localPlayer.hp, maxHp: localPlayer.maxHp, virusLevel: localPlayer.virusLevel, 
    stamina: localPlayer.stamina, hunger: localPlayer.hunger, thirst: localPlayer.thirst,
    money: localPlayer.money, inv: localPlayer.inv, color: localPlayer.color
  }));
}

function isColliding(nx, ny, r = 16, isNPC = false) {
  if (nx < r || nx > mapSize - r || ny < r || ny > mapSize - r) return true;
  for (let w of walls) {
    let closestX = Math.max(w.x, Math.min(nx, w.x + w.w));
    let closestY = Math.max(w.y, Math.min(ny, w.y + w.h));
    if (Math.hypot(nx - closestX, ny - closestY) < r) return true;
  }
  // Bunker Door logic
  let doorDistX = Math.max(bunkerDoor.x, Math.min(nx, bunkerDoor.x + bunkerDoor.w));
  let doorDistY = Math.max(bunkerDoor.y, Math.min(ny, bunkerDoor.y + bunkerDoor.h));
  if (Math.hypot(nx - doorDistX, ny - doorDistY) < r) {
      if (isNPC || !localPlayer.inv.bunkerPass) return true;
  }
  if (isNPC && inSafeZone(nx, ny)) return true;
  return false;
}

const zekeImg = new Image(); zekeImg.src = 'zeke.jpg';
const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap'); const mCtx = minimapCanvas.getContext('2d');
minimapCanvas.width = 160; minimapCanvas.height = 160;

let width = window.innerWidth, height = window.innerHeight; canvas.width = width; canvas.height = height;
window.addEventListener('resize', () => { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; });

let otherPlayers = {}; let entities = {}; let drops = {}; let bossTimers = {};
let activeSlot = localPlayer.activeSlot || 1; let drawMuzzleFlash = 0; let lastSync = 0; let lastAttackTime = 0;
let camera = { x: localPlayer.x, y: localPlayer.y }; let shopOpenType = 'none'; let isReloading = false; let reloadProgress = 0;

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

  if (['1','2','3','4','5','6','7','8'].includes(e.key)) {
    if (isReloading) return; 
    const slot = parseInt(e.key);
    if (slot === 2 && !localPlayer.inv.bat) return;
    if (slot === 3 && !localPlayer.inv.pistol) return;
    if (slot === 4 && !localPlayer.inv.shotgun) return;
    if (slot === 5 && !localPlayer.inv.crossbow) return;
    if (slot === 6 && localPlayer.inv.medkit <= 0) return;
    if (slot === 7 && localPlayer.inv.food <= 0) return;
    if (slot === 8 && localPlayer.inv.water <= 0) return;
    switchSlot(slot);
  }

  if (e.key.toLowerCase() === 'e' && shopOpenType === 'none') {
    let zType = null;
    zones.forEach(z => { if(localPlayer.x > z.x && localPlayer.x < z.x+z.w && localPlayer.y > z.y && localPlayer.y < z.y+z.h) zType = z.type; });
    if (zType === 'trader') openShop('trader');
    else if (zType === 'supermarket') openShop('supermarket');
    else if (zType === 'bunker' && localPlayer.inv.bunkerPass) openShop('bunker');
    else {
      let closestId = null, closestDist = 70;
      for (let id in drops) {
        let d = Math.hypot(drops[id].x - localPlayer.x, drops[id].y - localPlayer.y);
        if (d < closestDist) { closestDist = d; closestId = id; }
      }
      if (closestId) {
        let type = drops[closestId].type; remove(ref(db, `drops/${closestId}`));
        if (type === 'scrap') localPlayer.inv.scrap++;
        else if (type === 'medkit') localPlayer.inv.medkit++;
        else if (type === 'pistol') { localPlayer.inv.pistol = true; localPlayer.inv.pistolAmmo = 12; }
        else if (type === 'shotgun') { localPlayer.inv.shotgun = true; localPlayer.inv.shotgunAmmo = 6; }
        else if (type === 'crossbow') { localPlayer.inv.crossbow = true; localPlayer.inv.crossAmmo = 1; }
        updateUI();
      }
    }
  }
});

function startReload() {
  let w = weapons[activeSlot];
  if (w && w.type === 'ranged' && localPlayer.inv[w.ammo] < w.maxAmmo) {
    isReloading = true; reloadProgress = 0;
    setTimeout(() => { localPlayer.inv[w.ammo] = w.maxAmmo; isReloading = false; updateUI(); }, w.maxAmmo === 1 ? 1000 : 1500);
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
    if (data.hp <= 0 && localPlayer.hp > 0) handleDeath("You were killed...");
    else if (data.hp < localPlayer.hp) localPlayer.hp = data.hp; 
    updateUI();
  }
});

function handleDeath(msg) {
  if (isDead) return;
  isDead = true; closeShops();
  localPlayer.hp = 0; localPlayer.money = 0; localPlayer.virusLevel = 0;
  localPlayer.inv = { bat: false, pistol: false, shotgun: false, crossbow: false, maskLevel: 0, hasHazmat: false, bunkerPass: false,
         medkit: 0, scrap: 0, food: 0, water: 0, pistolAmmo: 0, shotgunAmmo: 0, crossAmmo: 0 };
  update(playerRef, { hp: 0 }); 
  document.getElementById('death-message').innerText = msg;
  document.getElementById('death-screen').style.display = 'block';
  switchSlot(1); updateUI(); saveGame(); 
}

document.getElementById('btn-respawn').onclick = () => {
  isDead = false; document.getElementById('death-screen').style.display = 'none';
  localPlayer.hp = localPlayer.maxHp; localPlayer.virusLevel = 0; localPlayer.hunger = 100; localPlayer.thirst = 100;
  localPlayer.x = 2000; localPlayer.y = 6000; 
  update(playerRef, { hp: localPlayer.maxHp, x: localPlayer.x, y: localPlayer.y });
  saveGame(); updateUI();
};

// --- 6. SHOPS ---
function openShop(type) {
  shopOpenType = type;
  document.getElementById('shop-ui').style.display = type === 'trader' ? 'block' : 'none';
  document.getElementById('supermarket-ui').style.display = type === 'supermarket' ? 'block' : 'none';
  document.getElementById('bunker-ui').style.display = type === 'bunker' ? 'block' : 'none';
  keys['w']=false; keys['a']=false; keys['s']=false; keys['d']=false; keys['shift']=false;
  updateShopUI();
}
function closeShops() { shopOpenType = 'none'; document.querySelectorAll('.shop-panel').forEach(el => el.style.display = 'none'); }

function updateShopUI() {
  // Trader UI
  document.getElementById('shop-cash').innerText = localPlayer.money;
  document.getElementById('shop-scrap').innerText = localPlayer.inv.scrap;
  document.getElementById('btn-sell').disabled = localPlayer.inv.scrap <= 0;
  document.getElementById('btn-bat').disabled = localPlayer.money < 200 || localPlayer.inv.bat;
  document.getElementById('btn-pistol').disabled = localPlayer.money < 400 || localPlayer.inv.pistol;
  document.getElementById('btn-shotgun').disabled = localPlayer.money < 1000 || localPlayer.inv.shotgun;
  document.getElementById('btn-crossbow').disabled = localPlayer.money < 1500 || localPlayer.inv.crossbow;
  document.getElementById('btn-mask-up').disabled = localPlayer.money < 150 || localPlayer.inv.maskLevel >= 4;
  document.getElementById('btn-mask-up').innerText = localPlayer.inv.maskLevel >= 4 ? "Mask Maxed" : "Upgrade Mask ($150)";
  document.getElementById('btn-hazmat').disabled = localPlayer.money < 3000 || localPlayer.inv.hasHazmat;
  document.getElementById('btn-hazmat').innerText = localPlayer.inv.hasHazmat ? "Hazmat (Owned)" : "Hazmat Suit ($3000)";
  document.getElementById('btn-pass').disabled = localPlayer.money < 500 || localPlayer.inv.bunkerPass;
  document.getElementById('btn-pass').innerText = localPlayer.inv.bunkerPass ? "Pass (Owned)" : "Bunker Pass ($500)";
  document.getElementById('btn-medkit').disabled = localPlayer.money < 100;

  // Bunker UI
  document.getElementById('bunker-cash').innerText = localPlayer.money;
  document.getElementById('btn-b-bat').disabled = localPlayer.money < 100 || localPlayer.inv.bat;
  document.getElementById('btn-b-pistol').disabled = localPlayer.money < 200 || localPlayer.inv.pistol;
  document.getElementById('btn-b-shotgun').disabled = localPlayer.money < 500 || localPlayer.inv.shotgun;
  document.getElementById('btn-b-crossbow').disabled = localPlayer.money < 750 || localPlayer.inv.crossbow;
  document.getElementById('btn-b-mask-up').disabled = localPlayer.money < 75 || localPlayer.inv.maskLevel >= 4;
  document.getElementById('btn-b-mask-up').innerText = localPlayer.inv.maskLevel >= 4 ? "Mask Maxed" : "Upgrade Mask ($75)";
  document.getElementById('btn-b-medkit').disabled = localPlayer.money < 50;
  document.getElementById('btn-b-food').disabled = localPlayer.money < 15;
  document.getElementById('btn-b-water').disabled = localPlayer.money < 10;
  
  // Supermarket
  document.getElementById('super-cash').innerText = localPlayer.money;
  document.getElementById('btn-food').disabled = localPlayer.money < 30;
  document.getElementById('btn-water').disabled = localPlayer.money < 20;
}

const buyItem = (cost, itemKey, ammoKey, maxAmmo, val = true) => {
  if (localPlayer.money >= cost) {
    localPlayer.money -= cost;
    if (typeof localPlayer.inv[itemKey] === 'number') localPlayer.inv[itemKey] += val;
    else localPlayer.inv[itemKey] = val;
    if(ammoKey) localPlayer.inv[ammoKey] = maxAmmo;
    updateUI(); updateShopUI(); return true;
  }
  return false;
};

// Listeners
document.getElementById('btn-close').onclick = closeShops; document.getElementById('btn-close-super').onclick = closeShops; document.getElementById('btn-close-bunker').onclick = closeShops;
document.getElementById('btn-sell').onclick = () => { if(localPlayer.inv.scrap > 0) { localPlayer.inv.scrap--; localPlayer.money += 25; updateUI(); updateShopUI(); }};
document.getElementById('btn-bat').onclick = () => buyItem(200, 'bat'); document.getElementById('btn-b-bat').onclick = () => buyItem(100, 'bat');
document.getElementById('btn-pistol').onclick = () => buyItem(400, 'pistol', 'pistolAmmo', 12); document.getElementById('btn-b-pistol').onclick = () => buyItem(200, 'pistol', 'pistolAmmo', 12);
document.getElementById('btn-shotgun').onclick = () => buyItem(1000, 'shotgun', 'shotgunAmmo', 6); document.getElementById('btn-b-shotgun').onclick = () => buyItem(500, 'shotgun', 'shotgunAmmo', 6);
document.getElementById('btn-crossbow').onclick = () => buyItem(1500, 'crossbow', 'crossAmmo', 1); document.getElementById('btn-b-crossbow').onclick = () => buyItem(750, 'crossbow', 'crossAmmo', 1);
document.getElementById('btn-mask-up').onclick = () => buyItem(150, 'maskLevel', null, null, 1); document.getElementById('btn-b-mask-up').onclick = () => buyItem(75, 'maskLevel', null, null, 1);
document.getElementById('btn-hazmat').onclick = () => buyItem(3000, 'hasHazmat');
document.getElementById('btn-pass').onclick = () => buyItem(500, 'bunkerPass');
document.getElementById('btn-medkit').onclick = () => buyItem(100, 'medkit', null, null, 1); document.getElementById('btn-b-medkit').onclick = () => buyItem(50, 'medkit', null, null, 1);
document.getElementById('btn-food').onclick = () => buyItem(30, 'food', null, null, 1); document.getElementById('btn-b-food').onclick = () => buyItem(15, 'food', null, null, 1);
document.getElementById('btn-water').onclick = () => buyItem(20, 'water', null, null, 1); document.getElementById('btn-b-water').onclick = () => buyItem(10, 'water', null, null, 1);

// --- 7. LOGIC & COMBAT ---
function handleAction() {
  if (isDead || isReloading) return;
  
  if (activeSlot === 6) { if (localPlayer.inv.medkit > 0 && (localPlayer.hp < localPlayer.maxHp || localPlayer.virusLevel > 0)) { localPlayer.inv.medkit--; localPlayer.hp = Math.min(localPlayer.maxHp, localPlayer.hp + 60); localPlayer.virusLevel = Math.max(0, localPlayer.virusLevel - 1); update(playerRef, { hp: localPlayer.hp }); if (localPlayer.inv.medkit === 0) switchSlot(1); updateUI(); } return; }
  if (activeSlot === 7) { if (localPlayer.inv.food > 0 && localPlayer.hunger < 100) { localPlayer.inv.food--; localPlayer.hunger = Math.min(100, localPlayer.hunger + 50); if (localPlayer.inv.food === 0) switchSlot(1); updateUI(); } return; }
  if (activeSlot === 8) { if (localPlayer.inv.water > 0 && localPlayer.thirst < 100) { localPlayer.inv.water--; localPlayer.thirst = Math.min(100, localPlayer.thirst + 50); if (localPlayer.inv.water === 0) switchSlot(1); updateUI(); } return; }

  if (inSafeZone(localPlayer.x, localPlayer.y)) {
     let p = document.getElementById('interaction-prompt');
     p.style.display = 'block'; p.innerText = "Weapons disabled in Safe Zones!";
     setTimeout(() => p.style.display = 'none', 1000);
     return;
  }

  let wep = weapons[activeSlot];
  if (!wep) return;
  
  if (wep.type === 'ranged' && localPlayer.inv[wep.ammo] <= 0) { startReload(); return; }
  
  const now = Date.now();
  if (now - lastAttackTime < wep.cd) return; lastAttackTime = now;
  localPlayer.isAttacking = true;

  if (wep.type === 'ranged') { drawMuzzleFlash = activeSlot === 5 ? 0 : 5; localPlayer.inv[wep.ammo]--; }
  updateUI();

  const checkHit = (target, isPlayer, id) => {
    if (isPlayer && inSafeZone(target.x, target.y)) return;
    let dx = target.x - localPlayer.x, dy = target.y - localPlayer.y; let dist = Math.sqrt(dx*dx + dy*dy);
    let angleToTarget = Math.atan2(dy, dx); let angleDiff = Math.abs(angleToTarget - localPlayer.angle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    if (dist < wep.range && angleDiff < wep.spread) {
      let newHp = Math.max(0, target.hp - wep.dmg);
      let targetRef = isPlayer ? ref(db, `players/${id}`) : ref(db, `entities/${id}`);
      
      if (newHp === 0 && target.hp > 0) {
        if(!isPlayer) { 
          remove(targetRef); const dropId = 'drop_' + Math.random().toString(36).substr(2,6);
          let loot = 'scrap';
          if (target.type && target.type.startsWith('boss')) {
             update(ref(db, `boss_timers`), { [target.type]: Date.now() });
             loot = 'medkit'; localPlayer.money += 1500; 
             for(let i=0; i<5; i++) set(ref(db, `drops/drop_${Math.random().toString(36).substr(2,6)}`), {x: target.x+(Math.random()*40-20), y: target.y+(Math.random()*40-20), type: 'scrap', timestamp: Date.now()});
          } else if (target.type === 'trooper') {
             loot = Math.random() < 0.5 ? 'pistol' : 'medkit'; localPlayer.money += 200;
          } else { 
             const r = Math.random(); if (r < 0.1) loot = 'medkit'; 
             localPlayer.money += (target.vLevel || 1) * 15;
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
  if (shopOpenType !== 'none') return;
  if (isReloading) reloadProgress = Math.min(1.0, reloadProgress + (dt / 1.5));

  let speed = keys['shift'] ? 450 : 250;
  if (keys['shift'] && (keys['w']||keys['a']||keys['s']||keys['d']) && localPlayer.stamina > 0) {
    localPlayer.stamina -= 25 * dt;
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

  let zType = null;
  zones.forEach(z => { if (localPlayer.x > z.x && localPlayer.x < z.x+z.w && localPlayer.y > z.y && localPlayer.y < z.y+z.h) zType = z.type; });
  if (zType === 'hospital') {
    localPlayer.hp = Math.min(localPlayer.maxHp, localPlayer.hp + 20 * dt);
    if(Math.random() < 0.05) localPlayer.virusLevel = 0; // Heal virus fast in hospital
  } 
  
  // Base Drains based on Virus Level
  let hDrain = 0.15, tDrain = 0.2, hpDrain = 0;
  if (localPlayer.virusLevel === 4) { hDrain = 0.8; tDrain = 1.0; hpDrain = 6.0; }
  else if (localPlayer.virusLevel === 3) { hDrain = 0.6; tDrain = 0.8; hpDrain = 3.0; }
  else if (localPlayer.virusLevel === 2) { hDrain = 0.4; tDrain = 0.6; hpDrain = 1.5; }
  else if (localPlayer.virusLevel === 1) { hDrain = 0.2; tDrain = 0.4; hpDrain = 0.5; }

  localPlayer.hunger = Math.max(0, localPlayer.hunger - hDrain * dt);
  localPlayer.thirst = Math.max(0, localPlayer.thirst - tDrain * dt);
  if (hpDrain > 0) localPlayer.hp -= hpDrain * dt;

  // New Virus Bubble Logic (Delay & Passive Protection)
  let maxExposure = 0;
  let exposed = false;
  for (let id in entities) {
     let e = entities[id];
     if (e.type === 'zombie' || (e.type && e.type.startsWith('boss'))) {
        let vLevel = e.vLevel || 1;
        let r = e.type.startsWith('boss') ? 350 : 80 + (vLevel * 20); // slightly bigger per level
        if (Math.hypot(e.x - localPlayer.x, e.y - localPlayer.y) < r) {
           exposed = true; if (vLevel > maxExposure) maxExposure = vLevel;
        }
     }
  }

  if (exposed && !inSafeZone(localPlayer.x, localPlayer.y)) {
     localPlayer.virusTimer += dt;
     let effectiveProtection = localPlayer.inv.hasHazmat ? 4 : localPlayer.inv.maskLevel;
     if (localPlayer.virusTimer > 1.5 && maxExposure > effectiveProtection && maxExposure > localPlayer.virusLevel) {
        localPlayer.virusLevel = maxExposure; // Caught the virus!
     }
  } else {
     localPlayer.virusTimer = 0;
  }

  if (localPlayer.hunger <= 0 || localPlayer.thirst <= 0) localPlayer.hp -= 3 * dt;
  if (localPlayer.hp <= 0) { handleDeath("You succumbed to the wasteland elements..."); return; }

  let showPrompt = false, promptText = "";
  if (zType === 'trader') { showPrompt = true; promptText = "Press E to Trade"; }
  else if (zType === 'supermarket') { showPrompt = true; promptText = "Press E to Shop Supermarket"; }
  else if (zType === 'bunker' && localPlayer.inv.bunkerPass) { showPrompt = true; promptText = "Press E to enter Black Market"; }
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
      x: Math.round(localPlayer.x), y: Math.round(localPlayer.y), angle: parseFloat(localPlayer.angle.toFixed(2)),
      isAttacking: localPlayer.isAttacking, color: localPlayer.color, activeSlot: localPlayer.activeSlot, 
      hp: Math.round(localPlayer.hp), virusLevel: localPlayer.virusLevel, hasHazmat: localPlayer.inv.hasHazmat, timestamp: Date.now()
    });
    lastSync = Date.now(); updateUI(); saveGame();
  }
}

function updateUI() {
  document.getElementById('hp-fill').style.width = Math.max(0, localPlayer.hp) + '%';
  document.getElementById('stamina-fill').style.width = localPlayer.stamina + '%';
  document.getElementById('hunger-fill').style.width = localPlayer.hunger + '%';
  document.getElementById('thirst-fill').style.width = localPlayer.thirst + '%';
  document.getElementById('virus-level-text').innerText = localPlayer.virusLevel;
  document.getElementById('mask-lvl').innerText = localPlayer.inv.maskLevel;
  document.getElementById('hazmat-status').innerText = localPlayer.inv.hasHazmat ? "Yes" : "No";
  
  document.getElementById('money').innerText = localPlayer.money;
  document.getElementById('scrap-count').innerText = localPlayer.inv.scrap;
  
  document.getElementById('slot-2').style.display = localPlayer.inv.bat ? 'flex' : 'none';
  document.getElementById('slot-3').style.display = localPlayer.inv.pistol ? 'flex' : 'none';
  document.getElementById('slot-4').style.display = localPlayer.inv.shotgun ? 'flex' : 'none';
  document.getElementById('slot-5').style.display = localPlayer.inv.crossbow ? 'flex' : 'none';
  document.getElementById('slot-6').style.display = localPlayer.inv.medkit > 0 ? 'flex' : 'none';
  document.getElementById('slot-7').style.display = localPlayer.inv.food > 0 ? 'flex' : 'none';
  document.getElementById('slot-8').style.display = localPlayer.inv.water > 0 ? 'flex' : 'none';
  
  for(let i=1; i<=8; i++) { let el = document.getElementById(`slot-${i}`); if(el) el.className = `slot ${activeSlot===i?'active':''}`; }
  
  document.getElementById('qty-medkit').innerText = localPlayer.inv.medkit > 0 ? localPlayer.inv.medkit : '';
  document.getElementById('qty-food').innerText = localPlayer.inv.food > 0 ? localPlayer.inv.food : '';
  document.getElementById('qty-water').innerText = localPlayer.inv.water > 0 ? localPlayer.inv.water : '';
  
  document.getElementById('ammo-pistol').style.display = localPlayer.inv.pistol ? 'block' : 'none'; document.getElementById('ammo-pistol').innerText = `${localPlayer.inv.pistolAmmo}/12`;
  document.getElementById('ammo-shotgun').style.display = localPlayer.inv.shotgun ? 'block' : 'none'; document.getElementById('ammo-shotgun').innerText = `${localPlayer.inv.shotgunAmmo}/6`;
  document.getElementById('ammo-crossbow').style.display = localPlayer.inv.crossbow ? 'block' : 'none'; document.getElementById('ammo-crossbow').innerText = `${localPlayer.inv.crossAmmo}/1`;
}
updateUI();

// --- 8. RENDERER ---
function drawCircle(x, y, r, color, border = null) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(); }
}

function drawPlayer(p, isLocal) {
  ctx.save(); ctx.translate(p.x, p.y);
  const isBoss = p.type && p.type.startsWith('boss'); 
  const isZombie = p.type === 'zombie' || p.type === 'runner' || p.type === 'tank' || isBoss;
  const isTrooper = p.type === 'trooper';
  const isProj = p.type === 'projectile';

  if (isProj) {
    ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill();
    ctx.restore(); return;
  }
  
  if (isZombie || (p.isPlayer && (p.virusLevel || 0) > 0)) {
     let vLvl = p.vLevel || p.virusLevel || 1;
     ctx.save(); ctx.beginPath();
     let r = isBoss ? 350 : 80 + (vLvl * 20);
     ctx.arc(0, 0, r, 0, Math.PI * 2);
     ctx.fillStyle = `rgba(46, 204, 113, ${0.1 + (vLvl*0.05)})`; ctx.fill();
     ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)'; ctx.lineWidth = 2; ctx.stroke();
     ctx.restore();
  }

  const scale = isBoss ? 2.5 : (p.type === 'tank' ? 1.5 : (p.type === 'runner' ? 0.8 : 1)); 
  ctx.scale(scale, scale); ctx.rotate(p.angle);
  
  const currSlot = p.activeSlot || 1;
  if (isLocal && drawMuzzleFlash > 0 && !isDead) {
    drawMuzzleFlash--; ctx.fillStyle = 'rgba(241, 196, 15, 0.8)';
    if (currSlot === 3) ctx.fillRect(25, -2, 500, 3); 
    if (currSlot === 4) { ctx.beginPath(); ctx.moveTo(25,0); ctx.lineTo(300, -80); ctx.lineTo(300, 80); ctx.fill(); }
  }

  if (isTrooper) {
      drawCircle(15, 10, 5, '#bdc3c7'); drawCircle(25, -12, 5, '#bdc3c7'); 
      ctx.fillStyle = '#2c3e50'; ctx.fillRect(10, -15, 24, 7); // Trooper holding gun
  } else if (!isZombie) {
     ctx.fillStyle = '#f1c40f'; 
     if (currSlot === 2) { // Bat
        drawCircle(15, -10, 5, '#f1c40f'); drawCircle(20, -5, 5, '#f1c40f');
        ctx.fillStyle = '#d35400'; ctx.fillRect(15, -25, 4, 30);
     } else if (currSlot === 3) { // Pistol
        drawCircle(15, 10, 5, '#f1c40f'); drawCircle(22, -12, 5, '#f1c40f'); 
        ctx.fillStyle = '#7f8c8d'; ctx.fillRect(18, -14, 12, 6);
     } else if (currSlot === 4) { // Shotgun
        drawCircle(15, 10, 5, '#f1c40f'); drawCircle(25, -12, 5, '#f1c40f'); 
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(10, -15, 24, 7);
     } else if (currSlot === 5) { // Crossbow
        drawCircle(15, 10, 5, '#f1c40f'); drawCircle(25, -12, 5, '#f1c40f'); 
        ctx.fillStyle = '#8e44ad'; ctx.fillRect(15, -14, 20, 4); ctx.fillRect(25, -20, 4, 16);
     } else if (currSlot === 6) { // Medkit
        drawCircle(15, 10, 5, '#f1c40f'); drawCircle(22, -12, 5, '#f1c40f');
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(15, -18, 12, 12); ctx.fillStyle = '#fff'; ctx.fillRect(19, -17, 4, 10); ctx.fillRect(16, -14, 10, 4);
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
  if (isZombie) bodyColor = isBoss || p.type === 'tank' ? '#0d4018' : '#2ecc71';
  if (isTrooper || p.hasHazmat) bodyColor = '#f39c12'; // Hazmat suit is orange
  
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.clip();
  if (zekeImg.complete && zekeImg.naturalWidth !== 0) {
    ctx.drawImage(zekeImg, -16, -16, 32, 32);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = bodyColor; ctx.fillRect(-16, -16, 32, 32);
  } else { ctx.fillStyle = bodyColor; ctx.fillRect(-16, -16, 32, 32); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  
  // Mask Visor
  if (isTrooper || p.hasHazmat) {
     ctx.fillStyle = '#000'; ctx.fillRect(8, -8, 8, 16);
  }

  ctx.restore();
  
  // Floating HP / Text above head
  if (p.hp > 0 || !isLocal) {
      let maxHp = 100;
      if (p.type === 'boss_butcher') maxHp = 8000;
      else if (p.type === 'boss_spitter') maxHp = 6000;
      else if (p.type === 'boss_warden') maxHp = 7000;
      else if (p.type === 'tank') maxHp = 150;
      else if (p.type === 'runner' || p.type === 'zombie') maxHp = 50;
      else if (p.type === 'trooper') maxHp = 100;
      
      let barW = 40; let yOff = 35 + (isBoss?30:(p.type==='tank'?15:0));
      ctx.fillStyle = '#000'; ctx.fillRect(p.x - barW/2, p.y - yOff, barW, 6);
      ctx.fillStyle = isBoss ? '#e67e22' : (isZombie ? '#8e44ad' : '#e74c3c');
      ctx.fillRect(p.x - barW/2, p.y - yOff, barW * ((p.hp || maxHp)/maxHp), 6);
      
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'center'; 
      if (isBoss) {
        let bName = p.type === 'boss_butcher' ? "THE BUTCHER" : (p.type === 'boss_spitter' ? "TOXIC SPITTER" : "THE WARDEN");
        ctx.fillStyle = '#f1c40f'; ctx.fillText(bName, p.x, p.y - yOff - 5);
      } else if (isZombie) {
        ctx.fillStyle = '#2ecc71'; ctx.fillText(`V${p.vLevel||1}`, p.x, p.y - yOff - 5);
      } else if (isTrooper) {
        ctx.fillStyle = '#f39c12'; ctx.fillText("TROOPER", p.x, p.y - yOff - 5);
      } else if (isLocal) { 
        ctx.fillText("YOU", p.x, p.y - yOff - 5); 
        if (isReloading) {
           ctx.fillStyle = '#000'; ctx.fillRect(p.x - 15, p.y + 25, 30, 4);
           ctx.fillStyle = '#f1c40f'; ctx.fillRect(p.x - 15, p.y + 25, 30 * reloadProgress, 4);
        }
      } else if (!isZombie) { 
        ctx.fillStyle = '#3498db'; ctx.fillText("SURVIVOR", p.x, p.y - yOff - 5); 
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
  
  // Bunker door visual
  ctx.fillStyle = '#7f8c8d'; ctx.fillRect(bunkerDoor.x, bunkerDoor.y, bunkerDoor.w, bunkerDoor.h);
  ctx.fillStyle = '#c0392b'; ctx.font = '20px Courier New'; ctx.fillText("GATE", bunkerDoor.x + 100, bunkerDoor.y + 25);

  for (let id in drops) {
     let d = drops[id]; if (d.x < camera.x-width/2 || d.x > camera.x+width/2 || d.y < camera.y-height/2 || d.y > camera.y+height/2) continue;
     ctx.save(); ctx.translate(d.x, d.y);
     if (d.type === 'scrap') { ctx.fillStyle = '#95a5a6'; ctx.fillRect(-8, -8, 16, 16); }
     else if (d.type === 'pistol') { ctx.fillStyle = '#f1c40f'; ctx.fillRect(-12, -4, 24, 8); }
     else if (d.type === 'shotgun') { ctx.fillStyle = '#e74c3c'; ctx.fillRect(-16, -6, 32, 12); }
     else if (d.type === 'crossbow') { ctx.fillStyle = '#8e44ad'; ctx.fillRect(-14, -4, 28, 8); }
     else if (d.type === 'medkit') { ctx.fillStyle = '#fff'; ctx.fillRect(-10,-10,20,20); ctx.fillStyle='#e74c3c'; ctx.fillRect(-8,-2,16,4); ctx.fillRect(-2,-8,4,16); }
     ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(-12,-12,24,24); ctx.restore();
  }
}

function drawMinimap() {
  mCtx.clearRect(0,0,160,160); const scale = 160 / mapSize;
  zones.forEach(z => { mCtx.fillStyle = z.border; mCtx.globalAlpha = 0.5; mCtx.fillRect(z.x * scale, z.y * scale, z.w * scale, z.h * scale); mCtx.globalAlpha = 1.0; });
  walls.forEach(w => { mCtx.fillStyle = '#555'; mCtx.fillRect(w.x*scale, w.y*scale, w.w*scale, w.h*scale); });
  for(let id in entities) { mCtx.fillStyle = entities[id].type && entities[id].type.startsWith('boss') ? '#e67e22' : '#27ae60'; let s = entities[id].type && entities[id].type.startsWith('boss') ? 5 : 2; mCtx.fillRect(entities[id].x * scale - s/2, entities[id].y * scale - s/2, s, s); }
  mCtx.fillStyle = '#e74c3c';
  for(let id in otherPlayers) { if (otherPlayers[id].hp === undefined || otherPlayers[id].hp > 0) mCtx.fillRect(otherPlayers[id].x * scale - 2, otherPlayers[id].y * scale - 2, 4, 4); }
  if (!isDead) { mCtx.fillStyle = '#fff'; mCtx.fillRect(localPlayer.x * scale - 2, localPlayer.y * scale - 2, 5, 5); }
}

// --- 9. PvE DISTRIBUTED AI & SPAWNER ---
setInterval(() => {
  const now = Date.now();
  
  const checkBoss = (bType, bHp, bx, by) => {
     let isAlive = false; for (let id in entities) if (entities[id].type === bType) { isAlive = true; break; }
     if (!isAlive) {
        let lastDeath = bossTimers[bType] || 0;
        if (lastDeath > now) { lastDeath = 0; update(ref(db, `boss_timers`), { [bType]: 0 }); }
        if (now - lastDeath > 900000) { set(ref(db, `entities/${bType}`), { x: bx, y: by, hp: bHp, type: bType, vLevel: 4, angle: 0, timestamp: now }); }
     }
  };
  checkBoss('boss_butcher', 8000, 8750, 1750);
  checkBoss('boss_spitter', 6000, 1250, 1250);
  checkBoss('boss_warden', 7000, 1250, 8750);

  // Trooper Spawner (4 guards outside Bunker)
  const trooperSpawns = [{x: 1600, y: 4400}, {x: 2400, y: 4400}, {x: 1600, y: 5600}, {x: 2400, y: 5600}];
  trooperSpawns.forEach((loc, i) => {
     let tId = `trooper_${i}`;
     if (!entities[tId] || entities[tId].hp <= 0) {
        set(ref(db, `entities/${tId}`), { x: loc.x, y: loc.y, hp: 100, type: 'trooper', angle: 0, timestamp: now });
     }
  });

  // Dynamic Spawner (Increased to 200, faster spawn rate)
  if (Object.keys(entities).length < 200 && Math.random() < 0.8) {
    let zx = Math.random() * mapSize, zy = Math.random() * mapSize;
    if (!inSafeZone(zx, zy)) { 
       const zId = 'z_' + Math.random().toString(36).substr(2, 6);
       let r = Math.random();
       let type = 'zombie', vLvl = 1, hp = 50;
       if (r < 0.1) { type = 'tank'; vLvl = 3; hp = 150; }
       else if (r < 0.3) { type = 'runner'; vLvl = 2; hp = 40; }
       else if (r < 0.5) { vLvl = 2; }
       
       update(ref(db, `entities/${zId}`), { x: zx, y: zy, hp: hp, type: type, vLevel: vLvl, angle: 0, timestamp: now });
    }
  }
}, 800);

setInterval(() => {
  const now = Date.now();
  for (let id in entities) {
    let e = entities[id]; if (!e || e.hp <= 0) continue;
    
    if (e.type === 'projectile') {
       let nx = e.x + Math.cos(e.angle) * 20; let ny = e.y + Math.sin(e.angle) * 20;
       if (isColliding(nx, ny, 8) || now - e.timestamp > 3000) { remove(ref(db, `entities/${id}`)); continue; }
       if (!isDead && Math.hypot(nx - localPlayer.x, ny - localPlayer.y) < 25 && !inSafeZone(localPlayer.x, localPlayer.y)) {
          localPlayer.hp = Math.max(0, localPlayer.hp - 20); update(playerRef, { hp: localPlayer.hp }); updateUI();
          remove(ref(db, `entities/${id}`)); continue;
       }
       if (Math.random() < 0.1) update(ref(db, `entities/${id}`), {x: nx, y: ny});
       e.x = nx; e.y = ny; 
       continue;
    }

    let closestDist = Math.hypot(e.x - localPlayer.x, e.y - localPlayer.y); let closestIsMe = true; let target = localPlayer;
    
    // Troopers Ignore Hazmat Users
    if (e.type === 'trooper' && localPlayer.inv.hasHazmat) {
        closestDist = Infinity; closestIsMe = false;
    }

    for (let pid in otherPlayers) {
      let p = otherPlayers[pid]; if (!p || p.hp === undefined || p.hp <= 0) continue;
      if (e.type === 'trooper' && p.hasHazmat) continue;
      let d = Math.hypot(e.x - p.x, e.y - p.y); if (d < closestDist) { closestDist = d; closestIsMe = false; target = p; }
    }
    
    if (closestIsMe) {
      if (closestDist < 1200) {
          let angle = Math.atan2(target.y - e.y, target.x - e.x); 
          let speed = 8;
          if (e.type === 'runner') speed = 14;
          if (e.type === 'tank') speed = 4;
          if (e.type === 'boss_butcher') speed = 12;
          if (e.type === 'trooper') speed = 2; // Troopers hold position mostly

          let isAttacking = false; let range = (e.type && e.type.startsWith('boss')) ? 80 : 40;
          if (e.type === 'trooper') range = 500;

          if ((e.type === 'boss_spitter' || e.type === 'trooper') && Math.random() < 0.05 && closestDist < 800 && !inSafeZone(target.x, target.y) && !isDead) {
             let pId = 'projectile_' + Math.random().toString(36).substr(2,6);
             set(ref(db, `entities/${pId}`), {x: e.x, y: e.y, type: 'projectile', angle: angle, timestamp: now});
          }
          if (e.type === 'boss_warden' && Math.random() < 0.02) {
             let zId = 'z_' + Math.random().toString(36).substr(2,6);
             set(ref(db, `entities/${zId}`), {x: e.x + Math.random()*100-50, y: e.y + Math.random()*100-50, hp: 50, type: 'runner', vLevel: 2, angle: 0, timestamp: now});
          }
          if (e.type === 'boss_butcher' && Math.random() < 0.05) { speed = 25; } 

          let nx = e.x + Math.cos(angle) * speed; let ny = e.y + Math.sin(angle) * speed;
          if (!isColliding(nx, ny, 16, true)) { e.x = nx; e.y = ny; }
          else if (!isColliding(nx, e.y, 16, true)) { e.x = nx; }
          else if (!isColliding(e.x, ny, 16, true)) { e.y = ny; }

          if (closestDist < range && !isDead && !inSafeZone(localPlayer.x, localPlayer.y) && e.type !== 'trooper') {
            isAttacking = true; 
            if (Math.random() < 0.3) { 
               let dmg = e.type === 'boss_butcher' ? 30 : ((e.type && e.type.startsWith('boss')) ? 15 : (e.type === 'tank' ? 20 : 6));
               localPlayer.hp = Math.max(0, localPlayer.hp - dmg);
               update(playerRef, { hp: localPlayer.hp }); updateUI();
            }
          }
          update(ref(db, `entities/${id}`), { x: e.x, y: e.y, angle, isAttacking, timestamp: now });
      } else if (e.type && (e.type.startsWith('boss') || e.type === 'trooper')) {
          update(ref(db, `entities/${id}`), { timestamp: now });
      }
    }
  }
  
  for (let eid in entities) {
    let e = entities[eid];
    if (e && e.type && (e.type.startsWith('boss') || e.type === 'trooper')) continue; 
    if (now - (e.timestamp||0) > 20000) remove(ref(db, `entities/${eid}`));
  }
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
  for (let id in otherPlayers) if (otherPlayers[id].hp === undefined || otherPlayers[id].hp > 0) renderList.push({...otherPlayers[id], isPlayer: true, isLocal: false});
  if (!isDead) renderList.push({...localPlayer, isPlayer: true, isLocal: true});
  
  renderList.sort((a,b) => {
     if (a.type === 'projectile') return 1; if (b.type === 'projectile') return -1;
     if (a.type && (a.type.startsWith('boss') || a.type === 'tank')) return -1; 
     if (b.type && (b.type.startsWith('boss') || b.type === 'tank')) return 1;
     return 0;
  });

  renderList.forEach(e => drawPlayer(e, e.isLocal));
  ctx.restore(); drawMinimap();
  requestAnimationFrame(loop);
}
loop();

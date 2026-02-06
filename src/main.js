import * as THREE from 'three';

// Minimal mobile-web FPS scaffold (original). Next commits: level, enemies, story, puzzles.

const $hp = document.getElementById('hp');
const $ammo = document.getElementById('ammo');

// Touch controls
const isTouch = matchMedia('(pointer: coarse)').matches;
const moveBase = document.getElementById('moveBase');
const moveStick = document.getElementById('moveStick');
const lookBase = document.getElementById('lookBase');
const lookStick = document.getElementById('lookStick');
const btnFire = document.getElementById('btnFire');
const btnJump = document.getElementById('btnJump');
const btnUse = document.getElementById('btnUse');

const input = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  fire: false,
  jump: false,
  use: false,
};

function makeStick(baseEl, stickEl, onMove){
  let pid = null;
  let center = {x:0,y:0};
  const max = 50;

  function set(dx, dy){
    const len = Math.hypot(dx,dy);
    const k = len > max ? (max/len) : 1;
    const sx = dx*k, sy = dy*k;
    stickEl.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
    onMove(sx/max, sy/max);
  }

  baseEl.addEventListener('pointerdown', (e)=>{
    e.preventDefault();
    pid = e.pointerId;
    baseEl.setPointerCapture?.(pid);
    const r = baseEl.getBoundingClientRect();
    center = {x: r.left + r.width/2, y: r.top + r.height/2};
    set(e.clientX-center.x, e.clientY-center.y);
  });
  baseEl.addEventListener('pointermove', (e)=>{
    if (e.pointerId !== pid) return;
    e.preventDefault();
    set(e.clientX-center.x, e.clientY-center.y);
  });
  const end = (e)=>{
    if (e.pointerId !== pid) return;
    e.preventDefault();
    pid = null;
    stickEl.style.transform = 'translate(-50%, -50%)';
    onMove(0,0);
  };
  baseEl.addEventListener('pointerup', end);
  baseEl.addEventListener('pointercancel', end);
}

if (isTouch) {
  makeStick(moveBase, moveStick, (x,y)=>{ input.moveX = x; input.moveY = y; });
  makeStick(lookBase, lookStick, (x,y)=>{ input.lookX = x; input.lookY = y; });

  const down = (key) => (e) => { e.preventDefault(); input[key] = true; };
  const up = (key) => (e) => { e.preventDefault(); input[key] = false; };
  btnFire.addEventListener('pointerdown', down('fire'));
  btnJump.addEventListener('pointerdown', down('jump'));
  btnUse.addEventListener('pointerdown', down('use'));
  addEventListener('pointerup', (e)=>{ up('fire')(e); up('jump')(e); up('use')(e); });
  addEventListener('pointercancel', (e)=>{ up('fire')(e); up('jump')(e); up('use')(e); });
}

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05070c, 8, 60);

const camera = new THREE.PerspectiveCamera(65, innerWidth/innerHeight, 0.1, 200);

// Lights (placeholder mood)
scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const key = new THREE.DirectionalLight(0xcfe8ff, 1.2);
key.position.set(10, 18, 6);
scene.add(key);

// Ground (placeholder)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 1 })
);
ground.rotation.x = -Math.PI/2;
scene.add(ground);

// Player capsule (invisible) + simple camera rig
const player = {
  pos: new THREE.Vector3(0, 1.7, 6),
  velY: 0,
  yaw: 0,
  pitch: 0,
  onGround: true,
  hp: 100,
  ammo: 30,
};

function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }

// Basic update loop
const clock = new THREE.Clock();
function tick(){
  const dt = Math.min(clock.getDelta(), 0.033);

  // Look
  const lookSpeed = 2.2;
  player.yaw   -= input.lookX * lookSpeed * dt;
  player.pitch -= input.lookY * lookSpeed * dt;
  player.pitch = clamp(player.pitch, -1.0, 1.0);

  // Move (relative to yaw)
  const moveSpeed = 6.0;
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const move = new THREE.Vector3();
  move.addScaledVector(right, input.moveX);
  move.addScaledVector(forward, -input.moveY);
  if (move.lengthSq() > 1e-6) move.normalize();
  player.pos.addScaledVector(move, moveSpeed * dt);

  // Jump + gravity
  const GRAV = -18;
  if (input.jump && player.onGround){
    player.velY = 7.5;
    player.onGround = false;
  }
  player.velY += GRAV * dt;
  player.pos.y += player.velY * dt;
  if (player.pos.y < 1.7){
    player.pos.y = 1.7;
    player.velY = 0;
    player.onGround = true;
  }

  // Fire (placeholder: drain ammo)
  if (input.fire && player.ammo > 0){
    player.ammo = Math.max(0, player.ammo - dt * 10);
  }

  // Camera
  camera.position.copy(player.pos);
  const dir = new THREE.Vector3(
    Math.sin(player.yaw) * Math.cos(player.pitch),
    Math.sin(player.pitch),
    Math.cos(player.yaw) * Math.cos(player.pitch)
  );
  camera.lookAt(player.pos.clone().add(dir));

  // HUD
  $hp.textContent = String(Math.round(player.hp));
  $ammo.textContent = String(Math.round(player.ammo));

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});

import * as THREE from './vendor/three.module.js';

export const MISSIONS = [
  { title: '01 · Midnight run', type: 'ride', distance: 1500, timeLimit: 100, objective: 'Ride to First Avenue. Clear the traffic and cross every checkpoint.' },
  { title: '02 · Backstage rescue', type: 'backstage', timeLimit: 140, objective: 'Find the guitar, drum case and master tape. Bring all three to the stage door.' },
  { title: '03 · The last ride', type: 'ride', distance: 1950, timeLimit: 115, objective: 'Make the encore. Ride through the storm to the final stage.' },
];

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const damp = (a, b, dt, speed = 7) => lerp(a, b, 1 - Math.exp(-dt * speed));
const COLORS = { asphalt: 0x111824, purple: 0x7339c9, aqua: 0x8cf5e9, gold: 0xffcd79, silver: 0x9babb9, black: 0x080b11 };

/** Self-contained action missions. update(dt) uses seconds. No global event listeners. */
export class Adventure {
  constructor(canvas, { onHud = () => {}, onComplete = () => {}, onFail = () => {} } = {}) {
    this.canvas = canvas;
    this.callbacks = { onHud, onComplete, onFail };
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.setClearColor(0x060913);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, .012);
    this.camera = new THREE.PerspectiveCamera(56, 1, .1, 340);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.keys = new Set();
    this.quality = 'auto';
    this.state = 'idle';
    this.missionIndex = 0;
    this.player = { position: new THREE.Vector3(), velocity: new THREE.Vector3(), health: 100, speed: 0 };
    this.materials = new Map();
    this.textures = new Set();
    this.surfaceTextures = new Map();
    this.hudTime = 0;
    this.disposed = false;
    this.resize();
  }

  material(color, roughness = .62, metalness = .12, emissive = false) {
    const key = `${color}/${roughness}/${metalness}/${emissive}`;
    if (!this.materials.has(key)) this.materials.set(key, emissive
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    return this.materials.get(key);
  }

  surfaceMaterial(file, color, roughness, metalness, bumpScale = .035) {
    const key = `surface/${file}/${color}/${roughness}/${metalness}`;
    if (!this.surfaceTextures.has(file)) {
      const texture = new THREE.TextureLoader().load('./assets/' + file);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      this.surfaceTextures.set(file, texture); this.textures.add(texture);
    }
    if (!this.materials.has(key)) {
      const texture = this.surfaceTextures.get(file);
      this.materials.set(key, new THREE.MeshStandardMaterial({ color, map: texture, bumpMap: texture, bumpScale, roughness, metalness }));
    }
    return this.materials.get(key);
  }

  texturedBox(w, h, d, material, x, y, z, parent = this.root, tileSize = 4) {
    const geometry = new THREE.BoxGeometry(w, h, d), uv = geometry.attributes.uv;
    const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let face = 0; face < 6; face++) for (let vertex = 0; vertex < 4; vertex++) {
      const i = face * 4 + vertex;
      uv.setXY(i, uv.getX(i) * faces[face][0] / tileSize, uv.getY(i) * faces[face][1] / tileSize);
    }
    uv.needsUpdate = true;
    return this.mesh(geometry, material, x, y, z, parent);
  }

  mesh(geometry, material, x, y, z, parent = this.root) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  box(w, h, d, color, x, y, z, parent = this.root, glow = false) {
    return this.mesh(new THREE.BoxGeometry(w, h, d), this.material(color, .6, .15, glow), x, y, z, parent);
  }
  cylinder(r, height, color, x, y, z, parent = this.root) {
    return this.mesh(new THREE.CylinderGeometry(r, r, height, 12), this.material(color, .35, .6), x, y, z, parent);
  }
  rod(a, b, radius, color, parent = this.root) {
    const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), delta = q.clone().sub(p);
    const m = this.cylinder(radius, delta.length(), color, 0, 0, 0, parent);
    m.position.copy(p.add(q).multiplyScalar(.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return m;
  }

  label(text, width = 7, color = '#e9e4f9', parent = this.root) {
    const canvas = document.createElement('canvas');
    canvas.width = 1536; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5,8,15,.90)'; ctx.fillRect(0, 0, 1536, 256);
    ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 1524, 244);
    ctx.font = 'bold 104px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    ctx.fillText(text, 768, 132, 1460);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy()); this.textures.add(texture);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    return this.mesh(new THREE.PlaneGeometry(width, width / 6), mat, 0, 0, 0, parent);
  }

  clearWorld() {
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && ![...this.materials.values()].includes(o.material)) o.material.dispose(); });
    this.root.clear();
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
    for (const texture of this.textures) texture.dispose();
    this.textures.clear(); this.surfaceTextures.clear();
    this.segments = []; this.obstacles = []; this.checkpoints = []; this.pickups = []; this.walls = []; this.rivals = []; this.billboards = []; this.wheels = [];
  }

  start(missionIndex = 0) {
    if (this.disposed) return;
    this.clearWorld();
    this.missionIndex = clamp(Math.floor(missionIndex), 0, MISSIONS.length - 1);
    this.mission = MISSIONS[this.missionIndex];
    this.time = 0; this.score = 0; this.invulnerability = 0; this.flash = 0; this.hudTime = 0; this.collected = 0;
    this.message = ''; this.messageUntil = 0; this.keys.clear(); this.state = 'playing'; this.paused = false;
    this.player.health = 100; this.player.speed = 24; this.player.position.set(0, 0, 0); this.player.velocity.set(0, 0, 0);
    this.scene.fog.density = this.mission.type === 'ride' ? .012 : .019;
    this.scene.fog.color.set(this.mission.type === 'ride' ? 0x060913 : 0x100f19);
    this.scene.background.copy(this.scene.fog.color);
    this.root.add(new THREE.HemisphereLight(0xbecbec, 0x443347, 2.6));
    const key = new THREE.DirectionalLight(0xd8d9ff, 2.7); key.position.set(-9, 25, 10); this.root.add(key);
    this.camera.fov = this.mission.type === 'ride' ? 56 : 45;
    this.camera.updateProjectionMatrix();
    if (this.mission.type === 'ride') this.buildRide(); else this.buildBackstage();
    this.resize(); this.updateHud(true); this.renderer.render(this.scene, this.camera);
  }

  buildRide() {
    this.player.position.set(0, 0, 0);
    this.bike = this.buildMotorcycle();
    this.root.add(this.bike);
    this.camera.position.set(0, 5.2, 10.5); this.camera.lookAt(0, 1, -14);
    for (let n = 0; n < 7; n++) {
      const segment = this.buildStreetSegment(n);
      segment.position.z = 70 - n * 80;
      this.segments.push(segment); this.root.add(segment);
    }
    const length = this.mission.distance;
    const harder = this.missionIndex === 2;
    for (let z = 95, i = 0; z < length - 80; z += harder ? 54 : 68, i++) {
      const lane = [-4, 0, 4][(i * 7 + (i % 4)) % 3];
      this.addRoadObstacle(lane, -z, i % 4 === 0 ? 'barrier' : 'car', i);
      if (harder && i % 4 === 2) this.addRoadObstacle(lane === -4 ? 4 : -4, -z - 8, 'barrier', i + 31);
    }
    for (let z = 250, n = 1; z < length; z += 250, n++) {
      const g = new THREE.Group(); g.position.z = -z;
      for (const x of [-7, 7]) { this.box(.22, 6, .22, COLORS.aqua, x, 3, 0, g, true); this.box(.8, .16, .8, COLORS.aqua, x, .1, 0, g, true); }
      this.box(14.2, .16, .16, COLORS.aqua, 0, 6, 0, g, true);
      const sign = this.label(`CHECKPOINT ${n}`, 6, '#a6fff2', g); sign.position.set(0, 5.25, 0);
      this.root.add(g); this.checkpoints.push({ mesh: g, distance: z, passed: false });
    }
    for (let z = 170, i = 0; z < length - 50; z += 180, i++) {
      const lane = [-4, 0, 4][i % 3], g = new THREE.Group(); g.position.set(lane, 1.35, -z);
      const ring = this.mesh(new THREE.TorusGeometry(.65, .07, 8, 24), this.material(COLORS.gold, .4, .2, true), 0, 0, 0, g);
      this.box(.13, .65, .15, COLORS.gold, 0, 0, 0, g, true); this.box(.55, .13, .15, COLORS.gold, 0, 0, 0, g, true);
      this.root.add(g); this.pickups.push({ mesh: g, ring, collected: false, distance: z });
    }
    this.finish = new THREE.Group(); this.finish.position.z = -length;
    this.box(21, 12, 8, 0x241a35, 0, 6, -6, this.finish);
    this.box(13, 6, .3, 0x09090f, 0, 3, -1.85, this.finish);
    for (const x of [-7, 7]) this.box(.3, 7, .3, COLORS.gold, x, 3.5, 0, this.finish, true);
    this.box(14.3, .3, .3, COLORS.gold, 0, 7, 0, this.finish, true);
    const finishSign = this.label(this.missionIndex === 2 ? 'ENCORE · FINISH' : 'FIRST AVENUE', 12, '#ffe1a0', this.finish); finishSign.position.set(0, 5.6, .2);
    this.root.add(this.finish);
    this.makeRain();
    this.announce('Steer around traffic. Gold rings repair your bike.', 7);
  }

  buildStreetSegment(index) {
    const g = new THREE.Group();
    this.texturedBox(15, .15, 80, this.surfaceMaterial('wet-asphalt-hd.png', 0xb6bdcd, .26, .38, .035), 0, -.12, 0, g, 3.5);
    for (const x of [-8.2, 8.2]) {
      this.box(2.5, .23, 80, 0x353947, x, -.02, 0, g);
      this.box(.12, .035, 80, 0xbdaeb7, x < 0 ? -7.25 : 7.25, .015, 0, g);
    }
    for (let z = -36; z < 40; z += 8) for (const x of [-2.25, 2.25]) this.box(.12, .02, 3.5, 0xafabb4, x, .01, z, g);
    const windowGeometry = new THREE.BoxGeometry(.9, 1.25, .035);
    const windows = new THREE.InstancedMesh(windowGeometry, this.material(index % 2 ? 0x9276b9 : 0xc5a477, .6, .1, true), 144);
    let wi = 0; const matrix = new THREE.Matrix4();
    for (const side of [-1, 1]) for (let n = 0; n < 3; n++) {
      const height = 10 + ((index * 7 + n * 13) % 17), width = 9 + n * 1.8, z = -27 + n * 27;
      const x = side * (10.7 + width / 2);
      this.texturedBox(width, height, 23, this.surfaceMaterial('brick-wall-hd.png', n % 2 ? 0x8c899c : 0xa494a7, .82, .08, .05), x, height / 2, z, g, 4);
      this.box(width + .4, .3, 23.4, 0x484150, x, height, z, g);
      this.box(width + .2, .22, 23.2, 0x483c51, x, 3.8, z, g);
      for (let y = 5; y < height - 1; y += 3.1) for (let j = 0; j < 4; j++) {
        if (wi >= 144 || (j + n + Math.floor(y)) % 4 === 0) continue;
        matrix.makeRotationY(Math.PI / 2); matrix.setPosition(side * 10.68, y, z - 8 + j * 5.1); windows.setMatrixAt(wi++, matrix);
      }
      this.box(.05, 2.8, 4.5, 0x110e1c, side * 10.64, 1.5, z, g);
      this.box(.06, .11, 5, COLORS.purple, side * 10.60, 3, z, g, true);
    }
    windows.count = wi; windows.instanceMatrix.needsUpdate = true; g.add(windows);
    for (const side of [-1, 1]) for (const z of [-28, 12]) {
      const x = side * 8;
      this.cylinder(.065, 6.6, 0x77808c, x, 3.3, z, g);
      this.rod([x, 6.5, z], [x - side * 1.35, 6.5, z], .06, 0x77808c, g);
      this.box(.9, .12, .5, 0xffe2ac, x - side * 1.1, 6.45, z, g, true);
      // Wet-road pools suggest reflected light without costly reflection passes.
      const pool = this.mesh(new THREE.PlaneGeometry(3.2, 13), new THREE.MeshBasicMaterial({ color: side === -1 ? 0x664e9d : 0x96734c, transparent: true, opacity: .12, depthWrite: false }), x - side * 2.2, .012, z, g);
      pool.rotation.x = -Math.PI / 2;
    }
    if (index % 2 === 0) {
      const sign = this.label(['7TH STREET', 'FIRST AVENUE →', 'DOWNTOWN'][index % 3], 5.5, '#d4c0ff', g);
      sign.position.set(-10.4, 4.6, -8); sign.rotation.y = .45;
    }
    return g;
  }

  buildMotorcycle() {
    const g = new THREE.Group();
    for (const z of [-1.15, 1.1]) {
      const tire = this.mesh(new THREE.TorusGeometry(.52, .14, 10, 24), this.material(0x090b0f, .9, .1), 0, .65, z, g); tire.rotation.y = Math.PI / 2;
      const wheel = this.cylinder(.37, .10, 0xcbd2e2, 0, .65, z, g); wheel.material = this.material(0xcbd2e2, .17, .88); wheel.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) {
        const rim = this.mesh(new THREE.TorusGeometry(.38, .025, 6, 24), this.material(0xe6e7f2, .13, .82), side * .09, .65, z, g); rim.rotation.y = Math.PI / 2;
      }
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) this.rod([0, .65, z], [0, .65 + Math.cos(a) * .37, z + Math.sin(a) * .37], .016, 0xd1c9e1, g);
      this.wheels.push(tire);
    }
    this.rod([0, .65, 1.1], [0, 1.4, -.25], .09, 0xc2b4d6, g);
    this.rod([0, .65, -1.15], [0, 1.7, -.75], .07, 0xc2b4d6, g);
    const tank = this.mesh(new THREE.SphereGeometry(.58, 16, 10), this.material(0x5a238c, .19, .7), 0, 1.32, -.25, g); tank.scale.set(.65, .65, 1.3);
    this.box(.58, .18, .95, 0x16101c, 0, 1.38, .58, g);
    this.box(.35, .42, .55, 0x707482, 0, .86, .05, g);
    this.rod([-.5, .65, .6], [-.5, .65, 1.4], .1, 0xb0a6b7, g);
    this.rod([-.55, 1.78, -.8], [.55, 1.78, -.8], .04, 0xcac2da, g);
    this.box(.3, .15, .07, 0xff335e, 0, 1.45, 1.12, g, true);
    this.box(.38, .28, .15, 0xffefc9, 0, 1.6, -1.2, g, true);
    // The riding figure is seen from behind; clothing and articulated limbs follow steering.
    const rider = new THREE.Group(); rider.position.set(0, 1.4, .35); g.add(rider); this.rider = rider;
    const coat = this.mesh(new THREE.CylinderGeometry(.24, .33, .75, 12), this.material(0x713bb0, .48, .2), 0, .51, 0, rider); coat.rotation.x = -.22;
    this.mesh(new THREE.SphereGeometry(.22, 16, 12), this.material(0x130f18, .65), 0, 1.08, -.14, rider);
    for (const s of [-1, 1]) {
      this.rod([s * .22, .77, -.1], [s * .47, .36, -.93], .09, 0x713bb0, rider);
      this.rod([s * .18, .15, .1], [s * .34, -.25, .3], .11, 0x211629, rider);
      this.rod([s * .34, -.25, .3], [s * .32, -.68, -.12], .10, 0x211629, rider);
      this.box(.17, .14, .38, 0x08070b, s * .32, -.69, -.23, rider);
    }
    this.headlight = new THREE.SpotLight(0xdac9ff, 120, 45, .4, .65, 1.5); this.headlight.position.set(0, 1.6, -1.2); this.headlight.target.position.set(0, 0, -18); g.add(this.headlight, this.headlight.target);
    const shadow = this.mesh(new THREE.PlaneGeometry(1.4, 3.5), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .52, depthWrite: false }), 0, .015, 0, g); shadow.rotation.x = -Math.PI / 2;
    return g;
  }

  addRoadObstacle(x, z, type, index) {
    const g = new THREE.Group(); g.position.set(x, 0, z); this.root.add(g);
    if (type === 'barrier') {
      this.box(2.4, .8, .7, 0xb2a6ac, 0, .5, 0, g);
      for (let n = -2; n <= 2; n++) { const stripe = this.box(.26, .65, .025, 0xf6a849, n * .44, .53, .37, g, true); stripe.rotation.z = -.35; }
      for (const xx of [-.85, .85]) this.box(.16, .2, .16, 0xffc45d, xx, 1.04, 0, g, true);
    } else {
      this.box(2.05, .7, 4.1, [0x373a60, 0x63283f, 0x254a54, 0x8a7a65][index % 4], 0, .77, 0, g);
      this.box(1.8, .67, 2.1, 0x1a2536, 0, 1.4, -.18, g);
      this.box(1.7, .46, .03, 0x3d5367, 0, 1.42, .89, g);
      for (const s of [-1, 1]) for (const zz of [-1.35, 1.35]) { const wheel = this.cylinder(.38, .18, 0x080a0e, s * 1.05, .45, zz, g); wheel.rotation.z = Math.PI / 2; }
      for (const xx of [-.73, .73]) { this.box(.35, .16, .04, 0xff3d63, xx, .94, 2.07, g, true); this.box(.36, .16, .04, 0xd5e2ff, xx, .94, -2.07, g, true); }
    }
    this.obstacles.push({ mesh: g, type, halfX: type === 'barrier' ? 1.5 : 1.35, halfZ: type === 'barrier' ? 1.1 : 2.8, speed: type === 'car' ? 6 + (index % 3) * 2 : 0, hit: false });
  }

  makeRain() {
    const count = this.quality === 'performance' ? 550 : 1200;
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) { const j = i * 6; const x = (Math.random() - .5) * 45, y = Math.random() * 25, z = (Math.random() - .5) * 90; positions.set([x, y, z, x - .08, y - .65, z + .15], j); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xb9b6e7, transparent: true, opacity: .3, depthWrite: false })); this.root.add(this.rain);
  }

  buildBackstage() {
    this.player.position.set(0, 0, 16); this.player.speed = 0;
    this.mesh(new THREE.BoxGeometry(31, .2, 41), this.material(0x292631, .28, .45), 0, -.15, 0);
    const brick = this.surfaceMaterial('brick-wall-hd.png', 0x81728d, .86, .06, .05);
    this.texturedBox(31, 6, .4, brick, 0, 3, -20);
    this.texturedBox(.4, 6, 41, brick, -15, 3, 0); this.texturedBox(.4, 6, 41, brick, 15, 3, 0);
    for (let z = -19; z < 20; z += 4) this.box(29, .018, .035, 0x5c4c67, 0, .01, z);
    for (const x of [-13.8, 13.8]) this.box(.08, .055, 38, 0x7945a7, x, .015, 0, this.root, true);
    // Broad walkable lanes around storage islands; every objective is reachable.
    const wallSpecs = [[-5, 8, 2.4, 8], [5, -3, 2.6, 8], [-5, -10, 2.4, 6], [5, 13, 6, 2.2]];
    for (const [x, z, w, d] of wallSpecs) {
      this.box(w, 2.5, d, 0x3b3442, x, 1.25, z); this.box(w + .08, .12, d + .08, 0x77657f, x, 2.5, z);
      this.walls.push({ x, z, w: w / 2 + .55, d: d / 2 + .55 });
      for (let zz = -d / 2 + .5; zz < d / 2; zz += 1.4) this.box(.03, 1.1, .7, 0x73568a, x + w / 2 + .02, 1.5, z + zz);
    }
    for (const x of [-12, 12]) for (let z = -15; z <= 15; z += 10) {
      this.box(1.6, 2.1, 1.1, 0x10121a, x, 1.05, z);
      for (const y of [.6, 1.45]) { const cone = this.cylinder(.44, .05, 0x32303c, x, y, z + .58); cone.rotation.x = Math.PI / 2; }
      this.box(1.2, .06, .05, 0x745183, x, 1.96, z + .58);
    }
    const topSign = this.label('FIRST AVENUE · BACKSTAGE', 11, '#c6a9e8'); topSign.position.set(0, 5, -19.7);
    for (const [x, z, color] of [[-10, -7, 0xc28be8], [9, 8, 0xffb470], [8, -13, 0x89d9ff]]) {
      const light = new THREE.PointLight(color, 50, 20, 1.7); light.position.set(x, 5, z); this.root.add(light);
      this.box(2, .07, .35, color, x, 5.3, z, this.root, true);
    }
    this.gear = [
      { name: 'Cloud guitar', kind: 'guitar', x: -10, z: -9, color: COLORS.aqua, collected: false },
      { name: 'Drum case', kind: 'drum', x: 9, z: 7, color: COLORS.gold, collected: false },
      { name: 'Master tape', kind: 'tape', x: 8, z: -13, color: 0xcf9bff, collected: false },
    ];
    for (const item of this.gear) {
      const g = new THREE.Group(); g.position.set(item.x, 0, item.z); this.root.add(g); item.mesh = g;
      this.box(1.8, .45, 1.4, 0x0e1118, 0, .25, 0, g); this.box(1.9, .08, 1.5, 0x8d7b9d, 0, .49, 0, g);
      if (item.kind === 'guitar') {
        const guitar = new THREE.Group(); guitar.position.set(0, 1.1, 0); guitar.rotation.z = -.4; g.add(guitar);
        const body = this.mesh(new THREE.SphereGeometry(.38, 16, 12), this.material(0xe2dce9, .3, .25), 0, .1, 0, guitar); body.scale.set(.8, 1.15, .3);
        this.box(.13, 1.35, .09, 0xbca8ca, 0, .9, 0, guitar); this.box(.22, .25, .12, 0xe4d2ed, 0, 1.55, 0, guitar);
        for (let s = 0; s < 4; s++) this.rod([-.035 + s * .023, -.1, .13], [-.035 + s * .023, 1.4, .13], .004, 0xc5c9d8, guitar);
      } else if (item.kind === 'drum') {
        this.cylinder(.62, 1.25, 0x57385e, 0, 1.15, 0, g); this.cylinder(.64, .08, 0xbdafc8, 0, 1.8, 0, g);
        for (const x of [-.5, .5]) this.rod([x, .6, .3], [x, 1.75, .3], .035, 0xc6b9d1, g);
      } else {
        this.box(1.25, 1, .3, 0x69606f, 0, 1.05, 0, g);
        for (const x of [-.33, .33]) { const reel = this.cylinder(.26, .06, 0xc2b6cc, x, 1.16, .19, g); reel.rotation.x = Math.PI / 2; }
      }
      const ring = this.mesh(new THREE.TorusGeometry(1.3, .055, 8, 32), this.material(item.color, .4, .2, true), 0, .04, 0, g); ring.rotation.x = Math.PI / 2;
      const label = this.label(item.name.toUpperCase(), 3.8, '#fff0dd', g); label.position.set(0, 3.3, 0); item.label = label;
      const arrow = this.mesh(new THREE.ConeGeometry(.25, .55, 4), this.material(item.color, .4, .1, true), 0, 2.6, 0, g); arrow.rotation.z = Math.PI; item.arrow = arrow;
    }
    this.stageDoor = new THREE.Group(); this.stageDoor.position.set(0, 0, -18.6); this.root.add(this.stageDoor);
    this.box(4, 4.5, .25, 0x11101a, 0, 2.25, 0, this.stageDoor);
    for (const x of [-2.15, 2.15]) this.box(.16, 4.7, .3, 0x706578, x, 2.35, .05, this.stageDoor);
    this.doorLight = this.box(4.4, .2, .35, 0xcc647a, 0, 4.6, .1, this.stageDoor, true);
    const label = this.label('STAGE · COLLECT ALL 3', 5, '#ffa8c5', this.stageDoor); label.position.set(0, 5.1, .2); this.stageLabel = label;
    this.hero = new THREE.Group(); this.root.add(this.hero);
    const portraitFile = this.avatar === 'morris' ? 'morris-hd-v3.png' : 'prince-hd-v3.png';
    const texture = new THREE.TextureLoader().load('./assets/' + portraitFile, loaded => {
      if (this.disposed || !this.hero?.parent || this.mission.type !== 'backstage') return;
      portrait.scale.x = (loaded.image.width / loaded.image.height) / (1.9 / 2.8);
    });
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(16, this.renderer.capabilities.getMaxAnisotropy()); this.textures.add(texture);
    const portrait = this.mesh(new THREE.PlaneGeometry(1.9, 2.8), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .1, side: THREE.DoubleSide }), 0, 1.4, 0, this.hero); this.portrait = portrait;
    const shadow = this.mesh(new THREE.CircleGeometry(.75, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .4, depthWrite: false }), 0, .015, 0, this.hero); shadow.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 2; i++) {
      const rival = new THREE.Group(); this.root.add(rival);
      this.box(1.4, 1.35, 1.4, 0x181d29, 0, .8, 0, rival); this.box(1.45, .08, 1.45, 0xd39c62, 0, 1.49, 0, rival);
      for (const x of [-.45, .45]) for (const z of [-.45, .45]) this.cylinder(.18, .16, 0x0b0d12, x, .14, z, rival);
      const warning = this.label('MOVING CASE', 2.6, '#ffcd79', rival); warning.position.set(0, 2.05, .1);
      this.rivals.push({ mesh: rival, baseZ: i === 0 ? 1 : -15, phase: i * 2.4 });
    }
    this.camera.position.set(0, 10.5, 27); this.camera.lookAt(0, .6, 12.4);
    this.announce('Find the glowing gear. Move close and press E to pick it up.', 8);
  }

  announce(message, duration = 3) { this.message = message; this.messageUntil = this.time + duration; }

  keyDown(key) {
    const normalized = key.length === 1 ? key.toLowerCase() : key;
    const first = !this.keys.has(normalized); this.keys.add(normalized);
    if (normalized === 'e' && first) this.action();
  }
  keyUp(key) { this.keys.delete(key.length === 1 ? key.toLowerCase() : key); }
  pause(value) { this.paused = Boolean(value); this.keys.clear(); }

  action() {
    if (this.state !== 'playing' || this.paused || this.mission.type !== 'backstage') return;
    const p = this.player.position;
    const item = this.gear.find(g => !g.collected && Math.hypot(p.x - g.x, p.z - g.z) < 2.7);
    if (item) {
      item.collected = true; item.mesh.visible = false; this.collected++; this.score += 400;
      this.announce(`${item.name} secured · ${this.collected}/3`, 3);
      if (this.collected === 3) {
        this.doorLight.material = this.material(COLORS.aqua, .4, .1, true);
        this.stageLabel.material.map?.dispose(); this.stageLabel.material.dispose(); this.stageLabel.geometry.dispose(); this.stageDoor.remove(this.stageLabel);
        this.stageLabel = this.label('STAGE · PRESS E', 5, '#a6fff2', this.stageDoor); this.stageLabel.position.set(0, 5.1, .2);
        this.announce('All gear secured. Reach the stage door and press E.', 6);
      }
      this.updateHud(true); return;
    }
    if (Math.hypot(p.x, p.z + 18.6) < 3.2) {
      if (this.collected === 3) this.complete(); else this.announce(`The band needs ${3 - this.collected} more ${this.collected === 2 ? 'item' : 'items'}. Follow the glowing markers.`, 4);
    } else this.announce('Move beside a glowing gear case, then press E.', 2.5);
  }

  update(dt) {
    if (this.disposed || this.state === 'idle') return;
    if (this.paused || this.state !== 'playing') return;
    dt = clamp(Number(dt) || 0, 0, .06);
    this.time += dt; this.hudTime += dt; this.invulnerability = Math.max(0, this.invulnerability - dt); this.flash = Math.max(0, this.flash - dt);
    if (this.mission.type === 'ride') this.updateRide(dt); else this.updateBackstage(dt);
    this.updateHud();
    this.renderer.render(this.scene, this.camera);
  }

  updateRide(dt) {
    const p = this.player.position;
    const steer = (this.keys.has('d') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('a') || this.keys.has('ArrowLeft') ? 1 : 0);
    const brake = this.keys.has('s') || this.keys.has('ArrowDown') || this.keys.has(' ') || this.keys.has('Space');
    const accelerate = this.keys.has('w') || this.keys.has('ArrowUp');
    const topSpeed = this.missionIndex === 2 ? 39 : 35;
    this.player.speed = damp(this.player.speed, brake ? 13 : accelerate ? topSpeed : 26, dt, brake ? 4 : 1.6);
    this.player.velocity.x = damp(this.player.velocity.x, steer * (brake ? 6.6 : 9.2), dt, 8);
    p.x = clamp(p.x + this.player.velocity.x * dt, -6.15, 6.15); p.z -= this.player.speed * dt;
    this.bike.position.copy(p); this.bike.rotation.z = damp(this.bike.rotation.z, -steer * .18, dt, 7); this.bike.rotation.y = damp(this.bike.rotation.y, -steer * .08, dt, 8);
    this.bike.visible = this.invulnerability === 0 || Math.floor(this.time * 12) % 2 === 0;
    for (const wheel of this.wheels) wheel.rotation.x -= this.player.speed * dt / .52;
    for (const segment of this.segments) if (segment.position.z > p.z + 130) segment.position.z -= 560;
    for (const obstacle of this.obstacles) {
      obstacle.mesh.position.z -= obstacle.speed * dt;
      const dz = obstacle.mesh.position.z - p.z;
      obstacle.mesh.visible = dz < 35 && dz > -270;
      if (!obstacle.hit && Math.abs(dz) < obstacle.halfZ && Math.abs(obstacle.mesh.position.x - p.x) < obstacle.halfX && this.invulnerability === 0) {
        obstacle.hit = true; this.takeDamage(25); this.player.speed = Math.max(9, this.player.speed * .45); this.announce('Collision! Brake earlier and steer into the clear lane.', 3.5);
      }
    }
    for (const gate of this.checkpoints) {
      gate.mesh.visible = gate.distance + p.z < 270 && gate.distance + p.z > -25;
      if (!gate.passed && -p.z >= gate.distance && Math.abs(p.x) < 6.6) { gate.passed = true; this.score += 250; this.announce('Checkpoint cleared · +250', 2); }
    }
    for (const pickup of this.pickups) {
      pickup.mesh.visible = !pickup.collected && pickup.distance + p.z < 200 && pickup.distance + p.z > -10;
      pickup.ring.rotation.y = this.time * 2;
      if (!pickup.collected && Math.abs(p.z + pickup.distance) < 2 && Math.abs(p.x - pickup.mesh.position.x) < 1.25) {
        pickup.collected = true; pickup.mesh.visible = false; this.player.health = Math.min(100, this.player.health + 20); this.score += 150; this.announce('Repair collected · +20 bike health', 2);
      }
    }
    this.camera.position.x = damp(this.camera.position.x, p.x * .5, dt, 3);
    this.camera.position.y = damp(this.camera.position.y, 4.5 + this.player.speed * .025, dt, 3);
    this.camera.position.z = p.z + 10.4 + this.player.speed * .035;
    this.camera.lookAt(p.x * .7, 1, p.z - 15);
    if (this.flash > 0) { this.camera.position.x += Math.sin(this.time * 65) * this.flash * .6; this.renderer.toneMappingExposure = 1.35 + this.flash * .4; } else this.renderer.toneMappingExposure = 1.35;
    if (this.rain) {
      this.rain.position.z = p.z - 25;
      const a = this.rain.geometry.attributes.position.array;
      for (let j = 0; j < a.length; j += 6) { const drop = dt * 22; a[j + 1] -= drop; a[j + 4] -= drop; if (a[j + 1] < 0) { a[j + 1] += 25; a[j + 4] += 25; } }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (-p.z >= this.mission.distance && this.state === 'playing') {
      if (this.checkpoints.every(gate => gate.passed)) this.complete();
      else this.fail('You missed a checkpoint. Stay between the glowing route markers on your next run.');
    }
    else if (this.time >= this.mission.timeLimit && this.state === 'playing') this.fail('The set started before you arrived. Use W or ↑ to accelerate on clear stretches, and brake only near traffic.');
  }

  updateBackstage(dt) {
    let x = (this.keys.has('d') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('a') || this.keys.has('ArrowLeft') ? 1 : 0);
    let z = (this.keys.has('s') || this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('w') || this.keys.has('ArrowUp') ? 1 : 0);
    const length = Math.hypot(x, z) || 1; x /= length; z /= length;
    const sprint = this.keys.has('Shift'); const speed = sprint ? 8.2 : 6.1;
    const p = this.player.position;
    const nextX = clamp(p.x + x * speed * dt, -13.8, 13.8);
    if (!this.walls.some(w => Math.abs(nextX - w.x) < w.w && Math.abs(p.z - w.z) < w.d)) p.x = nextX;
    const nextZ = clamp(p.z + z * speed * dt, -18, 18.7);
    if (!this.walls.some(w => Math.abs(p.x - w.x) < w.w && Math.abs(nextZ - w.z) < w.d)) p.z = nextZ;
    this.hero.position.copy(p); this.hero.position.y = (x || z) ? Math.sin(this.time * 13) * .045 : 0;
    this.hero.visible = this.invulnerability === 0 || Math.floor(this.time * 12) % 2 === 0;
    this.portrait.rotation.y = Math.atan2(this.camera.position.x - p.x, this.camera.position.z - p.z);
    this.camera.position.x = damp(this.camera.position.x, p.x * .5, dt, 3);
    this.camera.position.z = damp(this.camera.position.z, p.z + 11, dt, 4);
    this.camera.position.y = 10.5;
    this.camera.lookAt(p.x * .65, .6, p.z - 3.6);
    for (const item of this.gear) {
      item.arrow.position.y = 2.6 + Math.sin(this.time * 3) * .15;
      item.label.rotation.y = Math.atan2(this.camera.position.x - item.x, this.camera.position.z - item.z);
    }
    for (const rival of this.rivals) {
      rival.mesh.position.set(Math.sin(this.time * .6 + rival.phase) * 10.5, 0, rival.baseZ);
      if (Math.abs(p.x - rival.mesh.position.x) < 1.2 && Math.abs(p.z - rival.mesh.position.z) < 1.25 && this.invulnerability === 0) { this.takeDamage(15); this.announce('Watch the moving road cases. Take the open aisle.', 3); }
    }
    if (this.time >= this.mission.timeLimit && this.state === 'playing') this.fail('The set is starting. Collect the three marked items and get to the stage sooner.');
  }

  takeDamage(amount) {
    this.player.health = Math.max(0, this.player.health - amount); this.invulnerability = 2; this.flash = .6;
    if (this.player.health <= 0) this.fail(this.mission.type === 'ride' ? 'Your bike took too much damage. Brake to line up a clear lane; gold rings restore health.' : 'Too many collisions with road cases. Watch their routes and use the clear aisles.');
  }

  complete() {
    if (this.state !== 'playing') return;
    this.state = 'complete'; this.keys.clear();
    this.score += Math.round(this.player.health * 10 + Math.max(0, 150 - this.time) * 5);
    this.updateHud(true);
    this.callbacks.onComplete({ missionIndex: this.missionIndex, score: this.score, time: this.time, health: this.player.health });
  }
  fail(reason) {
    if (this.state !== 'playing') return;
    this.state = 'failed'; this.keys.clear(); this.updateHud(true); this.callbacks.onFail({ reason, score: this.score });
  }

  updateHud(force = false) {
    if (!force && this.hudTime < .1) return;
    this.hudTime = 0;
    const riding = this.mission.type === 'ride', p = this.player.position;
    let objective, hint;
    if (riding) {
      const remaining = Math.max(0, Math.ceil(this.mission.distance + p.z));
      objective = `${remaining.toLocaleString()} m to ${this.missionIndex === 2 ? 'the encore' : 'First Avenue'} · ${this.checkpoints.filter(gate => gate.passed).length}/${this.checkpoints.length} checkpoints`;
      hint = 'A / D or ← → steer · W accelerate · S / Space brake';
    } else {
      const nearby = this.gear.find(g => !g.collected && Math.hypot(p.x - g.x, p.z - g.z) < 2.7);
      const remaining = [...this.gear].filter(g => !g.collected).sort((a, b) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z));
      objective = this.collected === 3 ? 'Take all three items to the stage door' : `Find the band gear · ${this.collected}/3 secured`;
      if (nearby) hint = `E · Pick up ${nearby.name}`;
      else if (Math.hypot(p.x, p.z + 18.6) < 3.2) hint = this.collected === 3 ? 'E · Enter the stage' : 'Stage locked · find all three marked items';
      else if (remaining.length) { const target = remaining[0]; const meters = Math.ceil(Math.hypot(p.x - target.x, p.z - target.z)); const direction = `${target.z < p.z - 2 ? 'ahead' : target.z > p.z + 2 ? 'behind' : ''}${Math.abs(target.z - p.z) > 2 && Math.abs(target.x - p.x) > 2 ? ' / ' : ''}${target.x < p.x - 2 ? 'left' : target.x > p.x + 2 ? 'right' : ''}`; hint = `${target.name} · ${meters} m ${direction} · E to collect`; }
      else hint = 'Stage door ahead · WASD / arrows move · E interact';
    }
    this.callbacks.onHud({ title: this.mission.title, objective, hint, message: this.time < this.messageUntil ? this.message : '', progress: riding ? clamp(-p.z / this.mission.distance, 0, 1) : this.state === 'complete' ? 1 : this.collected / 4, health: this.player.health, speed: riding ? Math.round(this.player.speed * 3.6) : undefined, collected: riding ? undefined : this.collected, total: riding ? undefined : 3, time: this.time, timeRemaining: Math.max(0, Math.ceil(this.mission.timeLimit - this.time)), score: this.score, missionIndex: this.missionIndex, type: this.mission.type });
  }

  setQuality(quality = 'auto') { this.quality = ['auto', 'performance', '4k'].includes(quality) ? quality : 'auto'; this.resize(); }
  resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth), height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    let ratio = this.quality === 'performance' ? 1 : this.quality === '4k' ? Math.sqrt(8294400 / (width * height)) : Math.min(window.devicePixelRatio || 1, 2);
    ratio = Math.min(ratio, 4096 / Math.max(width, height), Math.sqrt(8294400 / (width * height)), this.renderer.capabilities.maxTextureSize / Math.max(width, height));
    this.renderer.setPixelRatio(Math.max(.25, ratio)); this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    if (this.state !== 'idle') this.renderer.render(this.scene, this.camera);
  }
  getResolution() { const size = this.renderer.getDrawingBufferSize(new THREE.Vector2()); return { width: size.x, height: size.y, quality: this.quality }; }
  dispose() {
    if (this.disposed) return;
    this.state = 'idle'; this.keys.clear(); this.clearWorld(); this.renderer.dispose(); this.disposed = true;
  }
}

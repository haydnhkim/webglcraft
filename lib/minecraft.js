const {
  Scene, Mesh, WebGLRenderer, PerspectiveCamera,
  CubeGeometry, PlaneGeometry, MeshLambertMaterial,
  AmbientLight, DirectionalLight, PointLight, Raycaster, Vector3, Vector2,
  Projector, Texture, UVMapping, RepeatWrapping, NearestFilter,
  LinearMipMapLinearFilter, ClampToEdgeWrapping, Clock
} = THREE;

const vec = (x, y, z) => new Vector3(x, y, z);

const CubeSize = 50;

class Player {
  constructor() {
    this.width = CubeSize * 0.3;
    this.depth = CubeSize * 0.3;
    this.height = CubeSize * 1.63;
    this.halfHeight = this.height / 2;
    this.halfWidth = this.width / 2;
    this.halfDepth = this.depth / 2;
    this.pos = vec();
    this.eyesDelta = this.halfHeight * 0.9;
  }

  eyesPosition() {
    const ret = this.pos.clone();
    ret.y += this.eyesDelta;
    return ret;
  }

  position(axis) {
    if (axis == null) {
      return this.pos;
    }
    return this.pos[axis];
  }

  incPosition(axis, val) {
    this.pos[axis] += val;
  }

  setPosition(axis, val) {
    this.pos[axis] = val;
  }

  collidesWithGround() {
    return this.position('y') < this.halfHeight;
  }

  vertex(vertexX, vertexY, vertexZ) {
    const vertex = this.position().clone();
    vertex.x += vertexX * this.halfWidth;
    vertex.y += vertexY * this.halfHeight;
    vertex.z += vertexZ * this.halfDepth;
    return vertex;
  }

  boundingBox() {
    const vmin = this.vertex(-1, -1, -1);
    const vmax = this.vertex(1, 1, 1);
    return {
      vmin,
      vmax
    };
  }
}

class Grid {
  constructor(size) {
    this.size = size != null ? size : 5;
    this.matrix = [...new Array(this.size)].map(() =>
      [...new Array(this.size)].map(() => [])
    );
    this.map = JSON.parse(JSON.stringify(this.matrix));
  }

  insideGrid(x, y, z) {
    return (0 <= x && x < this.size) &&
      (0 <= y && y < this.size) &&
      (0 <= z && z < this.size);
  }

  get(x, y, z) {
    return this.matrix[x][y][z];
  }

  put(x, y, z, val) {
    this.matrix[x][y][z] = val;
    if (!val) {
      return this.map[x][y][z] = null;
    }
    return this.map[x][y][z] = val.material.materials[0].map.image.src
      .match(/\/([a-zA-Z0-9_]*)\..*$/)[1];
  }

  gridCoords(x, y, z) {
    x = Math.floor(x / CubeSize);
    y = Math.floor(y / CubeSize);
    z = Math.floor(z / CubeSize);
    return [x, y, z];
  }
}

class CollisionHelper {
  constructor(player, grid) {
    this.player = player;
    this.grid = grid;
    this.rad = CubeSize;
    this.halfRad = CubeSize / 2;
  }

  collides() {
    if (this.player.collidesWithGround()) {
      return true;
    }
    if (this.beyondBounds()) {
      return true;
    }
    const playerBox = this.player.boundingBox();
    const ref = this.possibleCubes();
    for (let l = 0, len = ref.length; l < len; l++) {
      const cube = ref[l];
      if (this._collideWithCube(playerBox, cube)) {
        return true;
      }
    }
    return false;
  }

  beyondBounds() {
    const p = this.player.position();
    const ref = this.grid.gridCoords(p.x, p.y, p.z);
    const [x, y, z] = ref;
    if (!this.grid.insideGrid(x, 0, z)) {
      return true;
    }
  }

  _addToPosition(position, value) {
    const pos = position.clone();
    pos.x += value;
    pos.y += value;
    pos.z += value;
    return pos;
  }

  collideWithCube(cube) {
    return this._collideWithCube(this.player.boundingBox(), cube);
  }

  _collideWithCube(playerBox, cube) {
    const vmin = this._addToPosition(cube.position, -this.halfRad);
    const vmax = this._addToPosition(cube.position, this.halfRad);
    const cubeBox = {
      vmin,
      vmax
    };
    return CollisionUtils.testCubeCollision(playerBox, cubeBox);
  }

  possibleCubes() {
    const cubes = [];
    const grid = this.grid;
    this.withRange((x, y, z) => {
      const cube = grid.get(x, y, z);
      if (cube != null) {
        return cubes.push(cube);
      }
    });
    return cubes;
  }

  withRange(func) {
    const {vmin, vmax} = this.player.boundingBox();
    const minx = this.toGrid(vmin.x);
    const miny = this.toGrid(vmin.y);
    const minz = this.toGrid(vmin.z);
    const maxx = this.toGrid(vmax.x + this.rad);
    const maxy = this.toGrid(vmax.y + this.rad);
    const maxz = this.toGrid(vmax.z + this.rad);
    let x = minx;
    while (x <= maxx) {
      let y = miny;
      while (y <= maxy) {
        let z = minz;
        while (z <= maxz) {
          func(x, y, z);
          z++;
        }
        y++;
      }
      x++;
    }
  }

  toGrid(val) {
    const ret = Math.floor(val / this.rad);
    if (ret < 0) {
      return 0;
    }
    if (ret > this.grid.size - 1) {
      return this.grid.size - 1;
    }
    return ret;
  }
}

const TextureHelper = {
  loadTexture(path) {
    const image = new Image();
    image.src = path;
    const map = new Texture(
      image, UVMapping, ClampToEdgeWrapping, ClampToEdgeWrapping,
      NearestFilter, LinearMipMapLinearFilter);
    image.onload = function() {
      return map.needsUpdate = true;
    };
    return new THREE.MeshLambertMaterial({
      map
    });
  },
  tileTexture: function(path, repeatx, repeaty) {
    const image = new Image();
    image.src = path;
    const map = new Texture(
      image, UVMapping, RepeatWrapping, RepeatWrapping, NearestFilter,
      LinearMipMapLinearFilter);
    map.repeat.x = repeatx;
    map.repeat.y = repeaty;
    image.onload = function() {
      return map.needsUpdate = true;
    };
    return new THREE.MeshLambertMaterial({
      map
    });
  }
};

class Floor {
  constructor(width, height) {
    const repeatX = width / CubeSize;
    const repeatY = height / CubeSize;
    const material = TextureHelper.tileTexture("./textures/bedrock.png", repeatX, repeatY);
    const planeGeo = new PlaneGeometry(width, height, 1, 1);
    const plane = new Mesh(planeGeo, material);
    plane.position.y = -1;
    plane.rotation.x = -Math.PI / 2;
    plane.name = 'floor';
    this.plane = plane;
  }

  addToScene(scene) {
    return scene.add(this.plane);
  }
}

class Game {
  constructor(populateWorldFunction) {
    this.populateWorldFunction = populateWorldFunction;
    this.disablePointLock = this.disablePointLock.bind(this);
    this.enablePointLock = this.enablePointLock.bind(this);
    this.rad = CubeSize;
    this.currentMeshSpec = this.createGrassGeometry();
    this.cubeBlocks = this.createBlocksGeometry();
    this.selectCubeBlock('cobblestone');
    this.move = {
      x: 0,
      z: 0,
      y: 0
    };
    this.keysDown = {};
    this.grid = new Grid(100);
    this.onGround = true;
    this.pause = false;
    this.fullscreen = false;
    this.renderer = this.createRenderer();
    this.rendererPosition = $("#minecraft-container canvas").offset();
    this.camera = this.createCamera();
    THREEx.WindowResize(this.renderer, this.camera);
    this.canvas = this.renderer.domElement;
    this.controls = new Controls(this.camera, this.canvas);
    this.player = new Player();
    this.scene = new Scene();
    new Floor(50000, 50000).addToScene(this.scene);
    this.scene.add(this.camera);
    this.addLights(this.scene);
    this.projector = new Projector();
    this.castRay = null;
    this.moved = false;
    this.toDelete = null;
    this.collisionHelper = new CollisionHelper(this.player, this.grid);
    this.clock = new Clock();
    this.populateWorld();
    this.defineControls();
    this.handLength = 7;
    this.idealSpeed = 1 / 60;
    this.axes = ['x', 'y', 'z'];
    this.iterationCount = 10;
    this.playerKeys = {
      w: 'z+',
      up: 'z+',
      s: 'z-',
      down: 'z-',
      a: 'x+',
      left: 'x+',
      d: 'x-',
      right: 'x-'
    };
  }

  width() {
    return window.innerWidth;
  }

  height() {
    return window.innerHeight;
  }

  createBlocksGeometry() {
    const cubeBlocks = {};
    for (let l = 0, len = Blocks.length; l < len; l++) {
      const b = Blocks[l];
      const geo = new THREE.CubeGeometry(this.rad, this.rad, this.rad, 1, 1, 1);
      const t = this.texture(b);
      cubeBlocks[b] = this.meshSpec(geo, [t, t, t, t, t, t]);
    }
    return cubeBlocks;
  }

  createGrassGeometry() {
    const [grass_dirt, grass, dirt] = this.textures("grass_dirt", "grass", "dirt");
    const materials = [grass_dirt, grass_dirt, grass, dirt, grass_dirt, grass_dirt];
    return this.meshSpec(new THREE.CubeGeometry(this.rad, this.rad, this.rad, 1, 1, 1), materials);
  }

  texture(name) {
    return TextureHelper.loadTexture(`./textures/${name}.png`);
  }

  textures() {
    var name, names;
    names = 1 <= arguments.length ? Array.prototype.slice.call(arguments, 0) : [];
    return (function() {
      var l, len, results;
      results = [];
      for (l = 0, len = names.length; l < len; l++) {
      name = names[l];
      results.push(this.texture(name));
      }
      return results;
    }).call(this);
  }

  gridCoords(x, y, z) {
    return this.grid.gridCoords(x, y, z);
  }

  meshSpec(geometry, material) {
    return {
      geometry,
      material
    };
  }

  intoGrid(x, y, z, val) {
    var args, ref;
    args = this.gridCoords(x, y, z).concat(val);
    return (ref = this.grid).put.apply(ref, args);
  }

  generateHeight() {
    const size = 11;
    const perlin = new ImprovedNoise();
    return [...new Array(size)].map((n, x) =>
      [...new Array(size)].map((n, y) =>
        perlin.noise(x, y, 1) * 1
      )
    );
  }

  haveSave() {
    return !!localStorage["map"] && !!localStorage["position"] && !!localStorage["direction"];
  }

  loadWorld() {
    const map = JSON.parse(localStorage["map"]);
    const position = JSON.parse(localStorage["position"]);
    const direction = JSON.parse(localStorage["direction"]);
    let ref;
    (ref = this.player.pos).set.apply(ref, position);
    this.controls.setDirection(direction);
    const results = [];
    for (let x = 0, len = map.length; x < len; x++) {
      const mapYZ = map[x];
      results.push((() => {
        const results1 = [];
        for (let y = 0, len1 = mapYZ.length; y < len1; y++) {
          const mapZ = mapYZ[y];
          results1.push((() => {
            const results2 = [];
            for (let z = 0, len2 = mapZ.length; z < len2; z++) {
              const cubeName = mapZ[z];
              if (cubeName) {
                results2.push(this.cubeAt(x, y, z, this.cubeBlocks[cubeName]));
              } else {
                results2.push(void 0);
              }
            }
            return results2;
          })());
        }
        return results1;
      })());
    }
    return results;
  }

  populateWorld() {
    if (this.haveSave()) {
      return this.loadWorld();
    }
    const middle = this.grid.size / 2;
    const data = this.generateHeight();
    let playerHeight = null;
    let l, m;
    for (let i = l = -5; l <= 5; i = ++l) {
      for (let j = m = -5; m <= 5; j = ++m) {
        const height = (Math.abs(Math.floor(data[i + 5][j + 5]))) + 1;
        if (i === 0 && j === 0) {
          playerHeight = (height + 1) * CubeSize;
        }
        [...new Array(height)].forEach((n, k) => {
          this.cubeAt(middle + i, k, middle + j)
        });
      }
    }
    const middlePos = middle * CubeSize;
    return this.player.pos.set(middlePos, playerHeight, middlePos);
  }

  populateWorld2() {
    const middle = this.grid.size / 2;
    let setblockFunc;
    const ret = this.populateWorldFunction != null ? (setblockFunc = (() =>
      (x, y, z, blockName) => this.cubeAt(x, y, z, _this.cubeBlocks[blockName])
    )(), this.populateWorldFunction(setblockFunc, middle)) : [middle, 3, middle];
    const pos = (() => {
      const results = [];
      for (let l = 0, len = ret.length; l < len; l++) {
        const i = ret[l];
        results.push(i * CubeSize);
      }
      return results;
    })();
    let ref;
    return (ref = this.player.pos).set.apply(ref, pos);
  }

  cubeAt(x, y, z, meshSpec, validatingFunction) {
    meshSpec || (meshSpec = this.currentMeshSpec);
    if (meshSpec.geometry == null) {
      raise("bad material");
    }
    if (meshSpec.material == null) {
      raise("really bad material");
    }
    const mesh = new Mesh(meshSpec.geometry, new THREE.MeshFaceMaterial(meshSpec.material));
    mesh.geometry.dynamic = false;
    const halfcube = CubeSize / 2;
    mesh.position.set(CubeSize * x, y * CubeSize + halfcube, CubeSize * z);
    mesh.name = "block";
    if (validatingFunction && !validatingFunction(mesh))
      return;
    this.grid.put(x, y, z, mesh);
    this.scene.add(mesh);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
  }

  createCamera() {
    const camera = new PerspectiveCamera(45, this.width() / this.height(), 1, 10000);
    camera.lookAt(vec(0, 0, 0));
    return camera;
  }

  createRenderer() {
    const renderer = new WebGLRenderer({
      antialias: true
    });
    renderer.setSize(this.width(), this.height());
    renderer.setClearColor(0xBFD1E5, 1.0);
    renderer.clear();
    $('#minecraft-container').append(renderer.domElement);
    return renderer;
  }

  addLights(scene) {
    const ambientLight = new AmbientLight(0xaaaaaa);
    scene.add(ambientLight);
    const directionalLight = new DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 0.5);
    directionalLight.position.normalize();
    scene.add(directionalLight);
  }

  defineControls() {
    const bindit = key => {
      $(document).bind('keydown', key, () => {
        this.keysDown[key] = true;
        return false;
      });
      $(document).bind('keyup', key, () => {
        this.keysDown[key] = false;
        return false;
      });
    };
    const ref = "wasd".split('').concat('space', 'up', 'down', 'left', 'right');
    for (let l = 0, len = ref.length; l < len; l++) {
      const key = ref[l];
      bindit(key);
    }
    $(document).bind('keydown', 'p', () => {
      this.togglePause();
    });
    $(document).bind('keydown', 'k', () => {
      this.save();
    });
    const ref1 = [document, this.canvas];
    const results = [];
    for (let m = 0, len1 = ref1.length; m < len1; m++) {
      const target = ref1[m];
      $(target).mousedown(e => {
        this.onMouseDown(e);
      });
      $(target).mouseup(e => {
        this.onMouseUp(e);
      });
      results.push(
        $(target).mousemove(e => {
          this.onMouseMove(e);
        })
      );
    }
    return results;
  }

  save() {
    localStorage["map"] = JSON.stringify(this.grid.map);
    localStorage["position"] = JSON.stringify([this.player.position("x"), this.player.position("y"), this.player.position("z")]);
    localStorage["direction"] = JSON.stringify(this.controls.getDirection());
  }

  togglePause() {
    this.pause = !this.pause;
    if (this.pause)
      return;

    this.clock.start();
  }

  relativePosition(x, y) {
    return [x - this.rendererPosition.left, y - this.rendererPosition.top];
  }

  onMouseUp(e) {
    if (!this.moved && MouseEvent.isLeftButton(e)) {
      this.toDelete = this._targetPosition(e);
    }
    this.moved = false;
  }

  onMouseMove(e) {
    this.moved = true;
  }

  onMouseDown(e) {
    this.moved = false;
    if (!MouseEvent.isRightButton(e))
      return;

    this.castRay = this._targetPosition(e);
  }

  _targetPosition(e) {
    if (this.fullscreen) {
      return this.relativePosition(this.width() / 2, this.height() / 2);
    }
    return this.relativePosition(e.pageX, e.pageY);
  }

  deleteBlock() {
    if (!this.toDelete)
      return;

    let [x, y] = this.toDelete;
    x = (x / this.width()) * 2 - 1;
    y = (-y / this.height()) * 2 + 1;
    const vector = vec(x, y, 1);
    vector.unproject(this.camera);
    const todir = vector.sub(this.camera.position).normalize();
    this.deleteBlockInGrid(new Raycaster(this.camera.position, todir));
    this.toDelete = null;
  }

  findBlock(ray) {
    const ref = ray.intersectObjects(this.scene.children);
    for (let l = 0, len = ref.length; l < len; l++) {
      const o = ref[l];
      if (o.object.name !== 'floor') {
        return o;
      }
    }
    return null;
  }

  deleteBlockInGrid(ray) {
    const target = this.findBlock(ray);
    if (!target)
      return;

    if (!this.withinHandDistance(target.object.position))
      return;

    const mesh = target.object;
    this.scene.remove(mesh);
    const {x, y, z} = mesh.position;
    this.intoGrid(x, y, z, null);
  }

  placeBlock() {
    if (!this.castRay)
      return;

    let [x, y] = this.castRay;
    x = (x / this.width()) * 2 - 1;
    y = (-y / this.height()) * 2 + 1;
    const vector = vec(x, y, 1);
    vector.unproject(this.camera);
    const todir = vector.sub(this.camera.position).normalize();
    this.placeBlockInGrid(new Raycaster(this.camera.position, todir));
    this.castRay = null;
  }

  getAdjacentCubePosition(target) {
    const normal = target.face.normal.clone();
    const p = target.object.position.clone().add(normal.multiplyScalar(CubeSize));
    return p;
  }

  addHalfCube(p) {
    p.y += CubeSize / 2;
    p.z += CubeSize / 2;
    p.x += CubeSize / 2;
    return p;
  }

  getCubeOnFloorPosition(raycast) {
    const ray = raycast.ray;
    if (ray.direction.y >= 0)
      return null;

    const ret = vec();
    const o = ray.origin;
    const v = ray.direction;
    const t = (-o.y) / v.y;
    ret.y = 0;
    ret.x = o.x + t * v.x;
    ret.z = o.z + t * v.z;
    return this.addHalfCube(ret);
  }

  selectCubeBlock(name) {
    return this.currentCube = this.cubeBlocks[name];
  }

  getNewCubePosition(ray) {
    const target = this.findBlock(ray);
    if (!target)
      return this.getCubeOnFloorPosition(ray);

    return this.getAdjacentCubePosition(target);
  }

  createCubeAt(x, y, z) {
    return this.cubeAt(x, y, z, this.currentCube, cube =>
      !this.collisionHelper.collideWithCube(cube)
    );
  }

  withinHandDistance(pos) {
    const dist = pos.distanceTo(this.player.position());
    return dist <= CubeSize * this.handLength;
  }

  placeBlockInGrid(ray) {
    const p = this.getNewCubePosition(ray);
    if (!p)
      return;

    const gridPos = this.gridCoords(p.x, p.y, p.z);
    const [x, y, z] = gridPos;

    if (!this.withinHandDistance(p))
      return;
    if (!this.grid.insideGrid(x, y, z))
      return;
    if (this.grid.get(x, y, z))
      return;

    this.createCubeAt(x, y, z);
  }

  collides() {
    return this.collisionHelper.collides();
  }

  start() {
    const animate = () => {
      if (!this.pause)
        this.tick();

      requestAnimationFrame(animate);
    };
    animate();
  }

  enablePointLock() {
    $("#cursor").show();
    this.fullscreen = true;
  }

  disablePointLock() {
    $("#cursor").hide();
    this.fullscreen = false;
  }

  moveCube(speedRatio) {
    this.defineMove();
    let iterationCount = Math.round(this.iterationCount * speedRatio);
    while (iterationCount-- > 0) {
      this.applyGravity();
      const ref = this.axes;
      for (let l = 0, len = ref.length; l < len; l++) {
        const axis = ref[l];
        if (!(this.move[axis] !== 0))
          continue;

        const originalpos = this.player.position(axis);
        this.player.incPosition(axis, this.move[axis]);
        if (this.collides()) {
          this.player.setPosition(axis, originalpos);
          if (axis === 'y' && this.move.y < 0) {
          this.onGround = true;
          }
        } else if (axis === 'y' && this.move.y <= 0) {
          this.onGround = false;
        }
      }
    }
  }

  shouldJump() {
    return this.keysDown.space && this.onGround;
  }

  defineMove() {
    const baseVel = .4;
    const jumpSpeed = .8;
    this.move.x = 0;
    this.move.z = 0;
    const ref = this.playerKeys;
    for (let key in ref) {
      if (!ref.hasOwnProperty(key)) continue;

      const action = ref[key];
      const [axis, operation] = action;
      const vel = operation === '-' ? -baseVel : baseVel;
      if (this.keysDown[key]) {
      this.move[axis] += vel;
      }
    }
    if (this.shouldJump()) {
      this.onGround = false;
      this.move.y = jumpSpeed;
    }
    this.garanteeXYNorm();
    this.projectMoveOnCamera();
  }

  garanteeXYNorm() {
    if (this.move.x === 0 || this.move.z === 0)
      return;

    const ratio = Math.cos(Math.PI / 4);
    this.move.x *= ratio;
    this.move.z *= ratio;
  }

  projectMoveOnCamera() {
    const {x, z} = this.controls.viewDirection();
    const frontDir = new Vector2(x, z).normalize();
    const rightDir = new Vector2(frontDir.y, -frontDir.x);
    frontDir.multiplyScalar(this.move.z);
    rightDir.multiplyScalar(this.move.x);
    this.move.x = frontDir.x + rightDir.x;
    this.move.z = frontDir.y + rightDir.y;
  }

  applyGravity() {
    if (this.move.y < -1)
      return;

    this.move.y -= .005;
  }

  setCameraEyes() {
    const pos = this.player.eyesPosition();
    this.controls.move(pos);
    const eyesDelta = this.controls.viewDirection().normalize().multiplyScalar(20);
    eyesDelta.y = 0;
    pos.sub(eyesDelta);
  }

  tick() {
    const speedRatio = this.clock.getDelta() / this.idealSpeed;
    this.placeBlock();
    this.deleteBlock();
    this.moveCube(speedRatio);
    this.renderer.clear();
    this.controls.update();
    this.setCameraEyes();
    this.renderer.render(this.scene, this.camera);
  }
}

Minecraft = {
  start() {
    $("#blocks").hide();
    $('#instructions').hide();
    $(document).bind("contextmenu", () => {
      return false;
    });
    const startGame = () => {
      const game = new Game();
      new BlockSelection(game).insert();
      $("#minecraft-blocks").show();
      window.game = game;
      game.start();
    };
    new Instructions(startGame).insert();
  }
};

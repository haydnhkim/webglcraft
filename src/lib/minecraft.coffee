# Imports
{Object3D, Matrix4, Scene, Mesh, WebGLRenderer, PerspectiveCamera} = THREE
{CubeGeometry, PlaneGeometry, MeshLambertMaterial, MeshNormalMaterial} = THREE
{AmbientLight, DirectionalLight, PointLight, Raycaster, Vector3, Vector2} = THREE
{MeshLambertMaterial, MeshNormalMaterial, Projector} = THREE
{Texture, UVMapping, RepeatWrapping, RepeatWrapping, NearestFilter} = THREE
{LinearMipMapLinearFilter, ClampToEdgeWrapping, Clock} = THREE

vec = (x, y, z) -> new Vector3 x, y, z

CubeSize = 50

class Player
    width: CubeSize * 0.3
    depth: CubeSize * 0.3
    height: CubeSize * 1.63

    constructor: ->
        @halfHeight = @height / 2
        @halfWidth = @width / 2
        @halfDepth = @depth / 2
        @pos = vec()
        @eyesDelta = @halfHeight * 0.9

    eyesPosition: ->
        ret = @pos.clone()
        ret.y += @eyesDelta
        return ret


    position: (axis) ->
        return @pos unless axis?
        return @pos[axis]

    incPosition: (axis, val) ->
        @pos[axis] += val
        return

    setPosition: (axis, val) ->
        @pos[axis] = val
        return


    collidesWithGround: -> @position('y') < @halfHeight

    vertex: (vertexX, vertexY, vertexZ) ->
        vertex = @position().clone()
        vertex.x += vertexX * @halfWidth
        vertex.y += vertexY * @halfHeight
        vertex.z += vertexZ * @halfDepth
        return vertex

    boundingBox: ->
        vmin = @vertex(-1, -1, -1)
        vmax = @vertex 1, 1, 1
        return {vmin: vmin, vmax: vmax}


class Grid
    constructor: (@size = 5) ->
        @matrix = []
        @size.times (i) =>
            @matrix[i] = []
            @size.times (j) =>
                @matrix[i][j] = []
        @map = JSON.parse(JSON.stringify(@matrix)) #deep copy

    insideGrid: (x, y, z) -> 0 <= x < @size and 0 <= y < @size and 0 <= z < @size

    get: (x, y, z) -> @matrix[x][y][z]

    put: (x, y, z, val) -> 
        @matrix[x][y][z] = val
        return @map[x][y][z] = null unless val
        @map[x][y][z] = val.material.materials[0].map.image.src.match(/\/([a-zA-Z0-9_]*)\..*$/)[1] # hack to take cubeName

    gridCoords: (x, y, z) ->
        x = Math.floor(x / CubeSize)
        y = Math.floor(y / CubeSize)
        z = Math.floor(z / CubeSize)
        return [x, y, z]


class CollisionHelper
    constructor: (@player, @grid)-> return
    rad: CubeSize
    halfRad: CubeSize / 2

    collides: ->
        return true if @player.collidesWithGround()
        return true if @beyondBounds()
        playerBox = @player.boundingBox()
        for cube in @possibleCubes()
            return true if @_collideWithCube playerBox, cube
        return false

    beyondBounds: ->
        p = @player.position()
        [x, y, z] = @grid.gridCoords p.x, p.y, p.z
        return true unless @grid.insideGrid x, 0, z


    _addToPosition: (position, value) ->
        pos = position.clone()
        pos.x += value
        pos.y += value
        pos.z += value
        return pos

    collideWithCube: (cube) -> @_collideWithCube @player.boundingBox(), cube

    _collideWithCube: (playerBox, cube) ->
        vmin = @_addToPosition cube.position, -@halfRad
        vmax = @_addToPosition cube.position, @halfRad
        cubeBox = {vmin, vmax}
        return CollisionUtils.testCubeCollision playerBox, cubeBox

    possibleCubes: ->
        cubes = []
        grid = @grid
        @withRange (x, y, z) ->
            cube = grid.get x, y, z
            cubes.push cube if cube?
        return cubes

    withRange: (func) ->
        {vmin, vmax} = @player.boundingBox()
        minx = @toGrid(vmin.x)
        miny = @toGrid(vmin.y)
        minz = @toGrid(vmin.z)

        maxx = @toGrid(vmax.x + @rad)
        maxy = @toGrid(vmax.y + @rad)
        maxz = @toGrid(vmax.z + @rad)
        x = minx
        while x <= maxx
            y = miny
            while y <= maxy
                z = minz
                while z <= maxz
                    func x, y, z
                    z++
                y++
            x++
        return

    toGrid: (val) ->
        ret = Math.floor(val / @rad)
        return 0 if ret < 0
        return @grid.size - 1 if ret > @grid.size - 1
        return ret


TextureHelper =
    loadTexture: (path) ->
        image = new Image()
        image.src = path
        texture = new Texture(image, new UVMapping(), ClampToEdgeWrapping, ClampToEdgeWrapping, NearestFilter, LinearMipMapLinearFilter)
        image.onload = -> texture.needsUpdate = true
        new THREE.MeshLambertMaterial(map: texture, ambient: 0xbbbbbb)


    tileTexture: (path, repeatx, repeaty) ->
        image = new Image()
        image.src = path
        texture = new Texture(image, new UVMapping(), RepeatWrapping,
        RepeatWrapping, NearestFilter, LinearMipMapLinearFilter)
        texture.repeat.x = repeatx
        texture.repeat.y = repeaty
        image.onload = -> texture.needsUpdate = true
        new THREE.MeshLambertMaterial(map: texture, ambient: 0xbbbbbb)



class Floor
    constructor: (width, height) ->
        repeatX = width / CubeSize
        repeatY = height / CubeSize
        material = TextureHelper.tileTexture("./textures/bedrock.png", repeatX, repeatY)
        planeGeo = new PlaneGeometry(width, height, 1, 1)
        plane = new Mesh(planeGeo, material)
        plane.position.y = -1
        plane.rotation.x = -Math.PI / 2
        plane.name = 'floor'
        @plane = plane

    addToScene: (scene) -> scene.add @plane


class Game
    constructor: (@populateWorldFunction) ->
        @rad = CubeSize
        @currentMeshSpec = @createGrassGeometry()
        @cubeBlocks = @createBlocksGeometry()
        @selectCubeBlock 'cobblestone'
        @move = {x: 0, z: 0, y: 0}
        @keysDown = {}
        @grid = new Grid(100)
        @onGround = true
        @pause = off
        @fullscreen = off
        @renderer = @createRenderer()
        @rendererPosition = $("#minecraft-container canvas").offset()
        @camera = @createCamera()
        THREEx.WindowResize @renderer, @camera
        @canvas = @renderer.domElement
        @controls = new Controls @camera, @canvas
        @player = new Player()
        @scene = new Scene()
        new Floor(50000, 50000).addToScene @scene
        @scene.add @camera
        @addLights @scene
        @projector = new Projector()
        @castRay = null
        @moved = false
        @toDelete = null
        @collisionHelper = new CollisionHelper(@player, @grid)
        @clock = new Clock()
        @populateWorld()
        @defineControls()


    width: -> window.innerWidth
    height: -> window.innerHeight

    createBlocksGeometry: ->
        cubeBlocks = {}
        for b in Blocks
            geo = new THREE.CubeGeometry @rad, @rad, @rad, 1, 1, 1
            t = @texture(b)
            cubeBlocks[b] = @meshSpec geo, [t, t, t, t, t, t]
        return cubeBlocks

    createGrassGeometry: ->
        [grass_dirt, grass, dirt] = @textures "grass_dirt", "grass", "dirt"
        materials = [grass_dirt, #right
            grass_dirt, # left
            grass, # top
            dirt, # bottom
            grass_dirt, # back
            grass_dirt]  #front
        @meshSpec new THREE.CubeGeometry( @rad, @rad, @rad, 1, 1, 1), materials

    texture: (name) -> TextureHelper.loadTexture "./textures/#{name}.png"

    textures: (names...) -> return (@texture name for name in names)

    gridCoords: (x, y, z) -> @grid.gridCoords x, y, z

    meshSpec: (geometry, material) -> {geometry, material}


    intoGrid: (x, y, z, val) ->
        args = @gridCoords(x, y, z).concat(val)
        return @grid.put args...


    generateHeight: ->
        size = 11
        data = []
        size.times (i) ->
            data[i] = []
            size.times (j) ->
                data[i][j] = 0
        perlin = new ImprovedNoise()
        quality = 0.05
        z = Math.random() * 100
        4.times (j) ->
            size.times (x) ->
                size.times (y) ->
                    noise = perlin.noise(x / quality, y / quality, z)
                    data[x][y] += noise * quality
            quality *= 4
        data

    haveSave: -> !!localStorage["map"] and !!localStorage["position"] and !! localStorage["direction"]

    loadWorld: ->
        map = JSON.parse localStorage["map"]
        position = JSON.parse localStorage["position"]
        direction = JSON.parse localStorage["direction"]

        @player.pos.set position...
        @controls.setDirection direction

        for mapYZ,x in map
            for mapZ,y in mapYZ
                for cubeName,z in mapZ
                    @cubeAt x,y,z, @cubeBlocks[cubeName] if cubeName

    populateWorld: ->
      return @loadWorld() if @haveSave()
      middle = @grid.size / 2
      data = @generateHeight()
      playerHeight = null
      for i in [-5..5]
        for j in [-5..5]
          height =(Math.abs Math.floor(data[i + 5][j + 5])) + 1
          playerHeight = (height + 1) * CubeSize if i == 0 and j == 0
          height.times (k) => @cubeAt middle + i , k, middle + j
      middlePos = middle * CubeSize
      @player.pos.set middlePos, playerHeight, middlePos


    populateWorld2: ->
        middle = @grid.size / 2
        ret = if @populateWorldFunction?
            setblockFunc = (x, y, z, blockName) =>
                @cubeAt x, y, z, @cubeBlocks[blockName]
            @populateWorldFunction setblockFunc, middle
        else
            [middle, 3, middle] 
        pos = (i * CubeSize for i in ret)
        @player.pos.set pos...

    cubeAt: (x, y, z, meshSpec, validatingFunction) ->
        meshSpec or=@currentMeshSpec
        raise "bad material" unless meshSpec.geometry?
        raise "really bad material" unless meshSpec.material?
        mesh = new Mesh(meshSpec.geometry, new THREE.MeshFaceMaterial(meshSpec.material))
        mesh.geometry.dynamic = false
        halfcube = CubeSize / 2
        mesh.position.set CubeSize * x, y * CubeSize + halfcube, CubeSize * z
        mesh.name = "block"
        if validatingFunction?
            return unless validatingFunction(mesh)
        @grid.put x, y, z, mesh
        @scene.add mesh
        mesh.updateMatrix()
        mesh.matrixAutoUpdate = false
        return

    createCamera: ->
        camera = new PerspectiveCamera(45, @width() / @height(), 1, 10000)
        camera.lookAt vec 0, 0, 0
        camera

    createRenderer: ->
        renderer = new WebGLRenderer(antialias: true)
        renderer.setSize @width(), @height()
        renderer.setClearColorHex(0xBFD1E5, 1.0)
        renderer.clear()
        $('#minecraft-container').append(renderer.domElement)
        renderer

    addLights: (scene) ->
        ambientLight = new AmbientLight(0xaaaaaa)
        scene.add ambientLight
        directionalLight = new DirectionalLight(0xffffff, 1)
        directionalLight.position.set 1, 1, 0.5
        directionalLight.position.normalize()
        scene.add directionalLight

    defineControls: ->
        bindit = (key) =>
            $(document).bind 'keydown', key, =>
                @keysDown[key] = true
                return false
            $(document).bind 'keyup', key, =>
                @keysDown[key] = false
                return false
        for key in "wasd".split('').concat('space', 'up', 'down', 'left', 'right')
            bindit key
        $(document).bind 'keydown', 'p', => @togglePause()
        $(document).bind 'keydown', 'k', => @save()
        for target in [document, @canvas]
            $(target).mousedown (e) => @onMouseDown e
            $(target).mouseup (e) => @onMouseUp e
            $(target).mousemove (e) => @onMouseMove e

    save: ->
        localStorage["map"] = JSON.stringify @grid.map
        localStorage["position"] = JSON.stringify [ @player.position("x"),@player.position("y"),@player.position("z")]
        localStorage["direction"] = JSON.stringify @controls.getDirection()

    togglePause: ->
        @pause = !@pause
        @clock.start() if @pause is off
        return

    relativePosition: (x, y) ->
        [x - @rendererPosition.left, y - @rendererPosition.top]

    onMouseUp: (e) ->
        if not @moved and MouseEvent.isLeftButton e
            @toDelete = @_targetPosition(e)
        @moved = false

    onMouseMove: (event) -> @moved = true

    onMouseDown: (e) ->
        @moved = false
        return unless MouseEvent.isRightButton e
        @castRay = @_targetPosition(e)

    _targetPosition: (e) ->
        return @relativePosition(@width() / 2, @height() / 2) if @fullscreen
        @relativePosition(e.pageX, e.pageY)

    deleteBlock: ->
        return unless @toDelete?
        [x, y] = @toDelete
        x = (x / @width()) * 2 - 1
        y = (-y / @height()) * 2 + 1
        vector = vec x, y, 1
        @projector.unprojectVector vector, @camera
        todir = vector.sub(@camera.position).normalize()
        @deleteBlockInGrid new Raycaster @camera.position, todir
        @toDelete = null
        return

    findBlock: (ray) ->
        for o in ray.intersectObjects(@scene.children)
            return o unless o.object.name is 'floor'
        return null


    deleteBlockInGrid: (ray) ->
        target = @findBlock ray
        return unless target?
        return unless @withinHandDistance target.object.position
        mesh = target.object
        @scene.remove mesh
        {x, y, z} = mesh.position
        @intoGrid x, y, z, null
        return


    placeBlock: ->
        return unless @castRay?
        [x, y] = @castRay
        x = (x / @width()) * 2 - 1
        y = (-y / @height()) * 2 + 1
        vector = vec x, y, 1
        @projector.unprojectVector vector, @camera
        todir = vector.sub(@camera.position).normalize()
        @placeBlockInGrid new Raycaster @camera.position, todir
        @castRay = null
        return

    getAdjacentCubePosition: (target) ->
        normal = target.face.normal.clone()
        p = target.object.position.clone().add normal.multiplyScalar(CubeSize)
        return p

    addHalfCube: (p) ->
        p.y += CubeSize / 2
        p.z += CubeSize / 2
        p.x += CubeSize / 2
        return p

    getCubeOnFloorPosition: (raycast) ->
        ray = raycast.ray
        return null if ray.direction.y >= 0
        ret = vec()
        o = ray.origin
        v = ray.direction
        t = (-o.y) / v.y
        ret.y = 0
        ret.x = o.x + t * v.x
        ret.z = o.z + t * v.z
        return @addHalfCube ret

    selectCubeBlock: (name) ->
        @currentCube = @cubeBlocks[name]

    getNewCubePosition: (ray) ->
        target = @findBlock ray
        return @getCubeOnFloorPosition ray unless target?
        return @getAdjacentCubePosition target

    createCubeAt: (x, y, z) ->
        @cubeAt x, y, z, @currentCube, (cube) => not @collisionHelper.collideWithCube cube

    handLength: 7

    withinHandDistance: (pos) ->
        dist = pos.distanceTo @player.position()
        return dist <= CubeSize * @handLength

    placeBlockInGrid: (ray) ->
        p = @getNewCubePosition ray
        return unless p?
        gridPos = @gridCoords p.x, p.y, p.z
        [x, y, z] = gridPos
        return unless @withinHandDistance p
        return unless @grid.insideGrid x, y, z
        return if @grid.get(x, y, z)?
        @createCubeAt x, y, z
        return


    collides: -> @collisionHelper.collides()

    start: ->
        animate = =>
            @tick() unless @pause
            requestAnimationFrame animate, @renderer.domElement
        animate()
#        PointerLock.init onEnable: @enablePointLock, onDisable: @disablePointLock
#        PointerLock.fullScreenLock($("#app canvas").get(0))

    enablePointLock: =>
        $("#cursor").show()
#        @controls.enableMouseLocked()
        @fullscreen = on

    disablePointLock: =>
        $("#cursor").hide()
#        @controls.disableMouseLocked()
        @fullscreen = off


    axes: ['x', 'y', 'z']
    iterationCount: 10

    moveCube: (speedRatio) ->
        @defineMove()
        iterationCount = Math.round(@iterationCount * speedRatio)
        while iterationCount-- > 0
            @applyGravity()
            for axis in @axes when @move[axis] isnt 0
                originalpos = @player.position(axis)
                @player.incPosition axis, @move[axis]
                if @collides()
                    @player.setPosition axis, originalpos
                    @onGround = true if axis is 'y' and @move.y < 0
                else if axis is 'y' and @move.y <= 0
                    @onGround = false
        return


    playerKeys:
        w: 'z+'
        up: 'z+'
        s: 'z-'
        down: 'z-'
        a: 'x+'
        left: 'x+'
        d: 'x-'
        right: 'x-'

    shouldJump: -> @keysDown.space and @onGround

    defineMove: ->
        baseVel = .4
        jumpSpeed = .8
        @move.x = 0
        @move.z = 0
        for key, action of @playerKeys
            [axis, operation] = action
            vel = if operation is '-' then -baseVel else baseVel
            @move[axis] += vel if @keysDown[key]
        if @shouldJump()
            @onGround = false
            @move.y = jumpSpeed
        @garanteeXYNorm()
        @projectMoveOnCamera()
        return

    garanteeXYNorm: ->
        if @move.x != 0 and @move.z != 0
            ratio = Math.cos(Math.PI / 4)
            @move.x *= ratio
            @move.z *= ratio
        return

    projectMoveOnCamera: ->
        {x, z} = @controls.viewDirection()
        frontDir = new Vector2(x, z).normalize()
        rightDir = new Vector2(frontDir.y, -frontDir.x)
        frontDir.multiplyScalar @move.z
        rightDir.multiplyScalar @move.x
        @move.x = frontDir.x + rightDir.x
        @move.z = frontDir.y + rightDir.y


    applyGravity: -> @move.y -= .005 unless @move.y < -1

    setCameraEyes: ->
        pos = @player.eyesPosition()
        @controls.move pos
        eyesDelta = @controls.viewDirection().normalize().multiplyScalar(20)
        eyesDelta.y = 0
        pos.sub eyesDelta
        return

    idealSpeed: 1 / 60

    tick: ->
        speedRatio = @clock.getDelta() / @idealSpeed
        @placeBlock()
        @deleteBlock()
        @moveCube speedRatio
        @renderer.clear()
        @controls.update()
        @setCameraEyes()
        @renderer.render @scene, @camera
        return

@Minecraft =
    start: ->
        $("#blocks").hide()
        $('#instructions').hide()
        $(document).bind "contextmenu", -> false
        return Detector.addGetWebGLMessage() unless Detector.webgl
        startGame = ->
            game = new Game()
            new BlockSelection(game).insert()

            $("#minecraft-blocks").show()
            window.game = game
            game.start()
        new Instructions(startGame).insert()


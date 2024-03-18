
var glcanvas = document.getElementById("glcanvas")
glcanvas.style.position = "absolute"
glcanvas.style.left = "0px"
glcanvas.style.top = "0px"
var gl = glcanvas.getContext("webgl2", { reserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false })
gl.enable(gl.DEPTH_TEST)
gl.enable(gl.BLEND)
gl.enable(gl.CULL_FACE)
gl.cullFace(gl.BACK)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

var modelView = new Float32Array(16)

var vertexShaderSrc = `#version 300 es
    layout(location = 0) in vec3 aVertex;
    layout(location = 1) in vec2 aTexture;
    layout(location = 2) in float aShadow;
    out vec2 vTexture;
    out float vShadow;
    out float vFog;
    uniform mat4 uView;
    uniform float uDist;
    uniform vec3 uPos;

    void main() {
        vTexture = aTexture;
        vShadow = aShadow > 0.0 ? aShadow : 0.0;
        gl_Position = uView * vec4(aVertex, 1.0);

        float range = max(uDist / 5.0, 8.0);
        vFog = clamp((length(uPos.xz - aVertex.xz) - uDist + range) / range, 0.0, 1.0);
    }
`

var fragmentShaderSrc = `#version 300 es
    precision highp float;

    uniform sampler2D uSampler;
    in float vShadow;
    in vec2 vTexture;
    in float vFog;

    out vec4 fragColour;

    vec4 fog(vec4 colour) {
        colour.r += (0.33 - colour.r) * vFog;
        colour.g += (0.54 - colour.g) * vFog;
        colour.b += (0.72 - colour.b) * vFog;
        return colour;
    }

    void main() {
        vec4 colour = texture(uSampler, vTexture);
        fragColour = fog(vec4(colour.rgb * vShadow, colour.a));
        if (fragColour.a == 0.0) discard;
    }
`

var vertexShader = gl.createShader(gl.VERTEX_SHADER)
gl.shaderSource(vertexShader, vertexShaderSrc)
gl.compileShader(vertexShader)
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw gl.getShaderInfoLog(vertexShader)
}

var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
gl.shaderSource(fragmentShader, fragmentShaderSrc)
gl.compileShader(fragmentShader)
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw gl.getShaderInfoLog(fragmentShader)
}

var program = gl.createProgram()
gl.attachShader(program, vertexShader)
gl.attachShader(program, fragmentShader)
gl.linkProgram(program)
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw "Error linking shaders."
}

gl.useProgram(program)

var glCache = {
    uSampler: gl.getUniformLocation(program, "uSampler"),
    uPos: gl.getUniformLocation(program, "uPos"),
    uDist: gl.getUniformLocation(program, "uDist"),
    aShadow: gl.getAttribLocation(program, "aShadow"),
    aTexture: gl.getAttribLocation(program, "aTexture"),
    aVertex: gl.getAttribLocation(program, "aVertex")
}

gl.uniform1f(glCache.uDist, 1000)

var blocksImg = new Image()
blocksImg.src = "blocks.png"
blocksImg.onload = () => {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
	
    let texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 160, 112, 0, gl.RGBA, gl.UNSIGNED_BYTE, blocksImg)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.uniform1i(glCache.uSampler, 0)

    let texture2 = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + 0)
    gl.bindTexture(gl.TEXTURE_2D, texture2)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, blocksImg)

    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
}


utils.setup()
utils.setStyles()

var lastTime = 0
var delta = 0
var su = 0

var renderD = 4
var smoothness = 5
var hilliness = 5
var superflat = false
var caves = true

var blockData = [
    {
        name: "air",
        transparent: true,
        shadow: false,
        textures: [0, 0]
    },
    {
        name: "grass",
        textures: [[1, 0], [0, 1], [0, 0]]
    },
    {
        name: "dirt",
        textures: [1, 0]
    },
    {
        name: "stone",
        textures: [2, 2]
    },
]

var bid = {}

for (let i = 0; i < blockData.length; i++) {
    let data = blockData[i]
    data.id = i

    if (typeof data.textures == "string") {
        let texture = data.textures
        data.textures = [texture, texture, texture, texture, texture, textrue]
    } else if (data.textures.length == 3) {
        data.textures[3] = data.textures[2]
        data.textures[4] = data.textures[2]
        data.textures[5] = data.textures[2]
    } else if (data.textures.length == 2) {
        data.textures[2] = data.textures[1]
        data.textures[3] = data.textures[2]
        data.textures[4] = data.textures[2]
        data.textures[5] = data.textures[2]
        data.textures[1] = data.textures[0]
    }

    data.transparent = data.transparent ? data.transparent : false
    data.shadow = data.shadow !== undefined ? data.shadow : true

    bid[data.name] = data.id
}

class Player {
    constructor() {
        this.x = 8
        this.y = 6
        this.z = 8
        this.rx = 0
        this.ry = 0
        this.fov = 60
        this.projection = new Float32Array(5)
        this.transformation = new Matrix()
        this.direction = {x: 1, y: 0, z: 0}
        this.frustum = []
        for (let i = 0; i < 5; i++) {
            this.frustum.push(new Plane(1, 0, 0))
        }
    }
    FOV(fov) {
        const tang = Math.tan(fov * Math.PI / 360)
        const scale = 1 / tang
        const near = 1
        const far = 1000000
        this.currentFov = fov
        this.nearH = near * tang

        this.projection[0] = scale / width * height
        this.projection[1] = scale
        this.projection[2] = -far / (far - near)
        this.projection[3] = -1
        this.projection[4] = -far * near / (far - near)
    }
    transform() {
        this.transformation.copyMatrix(defaultTransformation)
        this.transformation.rotX(this.rx)
        this.transformation.rotY(this.ry)
        this.transformation.translate(-this.x, -this.y, -this.z)
    }
    getMatrix() {
        let proj = this.projection
        let view = this.transformation.elements
        matrix[0]  = proj[0] * view[0]
        matrix[1]  = proj[1] * view[4]
        matrix[2]  = proj[2] * view[8] + proj[3] * view[12]
        matrix[3]  = proj[4] * view[8]
        matrix[4]  = proj[0] * view[1]
        matrix[5]  = proj[1] * view[5]
        matrix[6]  = proj[2] * view[9] + proj[3] * view[13]
        matrix[7]  = proj[4] * view[9]
        matrix[8]  = proj[0] * view[2]
        matrix[9]  = proj[1] * view[6]
        matrix[10] = proj[2] * view[10] + proj[3] * view[14]
        matrix[11] = proj[4] * view[10]
        matrix[12] = proj[0] * view[3]
        matrix[13] = proj[1] * view[7]
        matrix[14] = proj[2] * view[11] + proj[3] * view[15]
        matrix[15] = proj[4] * view[11]
        return matrix
    }
    setDirection() {
        if (this.targetFov !== this.currentFov) {
            this.FOV()
        }
        this.direction.x = -Math.sin(this.ry) * Math.cos(this.rx)
        this.direction.y = Math.sin(this.rx)
        this.direction.z = Math.cos(this.ry) * Math.cos(this.rx)
        this.computeFrustum()
    }
    computeFrustum() {
        let X = vec1
        let dir = this.direction
        X.x = dir.z
        X.y = 0
        X.z = -dir.x
        X.normalize()

        let Y = vec2
        Y.set(dir)
        Y.mult(-1)
        cross(Y, X, Y)

        this.frustum[0].set(dir.x, dir.y, dir.z)

        let aux = vec3
        aux.set(Y)
        aux.mult(this.nearH)
        aux.add(dir)
        aux.normalize()
        cross(aux, X, aux)
        this.frustum[1].set(aux.x, aux.y, aux.z)

        aux.set(Y)
        aux.mult(-this.nearH)
        aux.add(dir)
        aux.normalize()
        cross(X, aux, aux)
        this.frustum[2].set(aux.x, aux.y, aux.z)

        aux.set(X)
        aux.mult(-this.nearH * width / height)
        aux.add(dir)
        aux.normalize()
        cross(aux, Y, aux)
        this.frustum[3].set(aux.x, aux.y, aux.z)

        aux.set(X)
        aux.mult(this.nearH * width / height)
        aux.add(dir)
        aux.normalize()
        cross(Y, aux, aux)
        this.frustum[4].set(aux.x, aux.y, aux.z)
    }
    canSee(x, y, z, maxY) {
        x -= 0.5
        y -= 0.5
        z -= 0.5
        maxY += 0.5
        let px = 0, py = 0, pz = 0, plane = null
        let cx = player.x, cy = player.y, cz = player.z
        for (let i = 0; i < 5; i++) {
            plane = this.frustum[i]
            px = x + plane.dx
            py = plane.dy ? maxY : y
            pz = z + plane.dz
            if ((px - cx) * plane.nx + (py - cy) * plane.ny + (pz - cz) * plane.nz < 0) {
                return false
            }
        }
        return true
    }
}


var player = new Player()

var camera = {x: 0, y: 0, z: 0}

var fogDist = 16
var generatedAmt = 0

function maxDist(x1, y1, z1, x2, y2, z2) {
    return Math.max(Math.abs(x2-x1), Math.abs(y2-y1), Math.abs(z2 - z1))
}

function sortChunks(a, b) {
    let dx1 = player.x - a.x - 8
    let dz1 = player.z - a.z - 8
    let dx2 = player.x - b.x - 8
    let dz2 = player.z - b.z - 8
    return (dx1 * dx1 + dz1 * dz1) - (dx2 * dx2 + dz2 * dz2)
}


class World {
    constructor() {
        generatedAmt = 0
        fogDist = 16

        this.chunks = []
        this.loaded = []
        this.sorted = []
        this.offX = 0
        this.offY = 0
        this.lwidth = 0
        this.genQueue = []
        this.populateQueue = []
        this.generateQueue = []
        this.meshQueue = []
        this.loadFrom = []
        this.lastChunk = ","
    }
    getWorldBlock(x, y, z) {
        if (!this.chunks[x >> 4] || !this.chunks[x >> 4][y >> 4] || !this.chunks[x >> 4][y >> 4][z >> 4]) {
            return bid.air
        }
        return this.chunks[x >> 4][y >> 4][z >> 4].getBlock(x & 15, y & 15, z & 15)
    }
    getBlock(x, y, z) {
        let X = (x >> 4) + this.offX
        let Y = (y >> 4) + this.offY
        let Z = (z >> 4) + this.offZ
        if (X < 0 || X > this.lwidth || Z < 0 || Z >= this.lwidth) {
            return this.getWorldBlock(x, y, z)
        }
        return this.loaded[X * this.lwidth * this.lwidth + Y * this.lwidth + Z].getBlock(x & 15, y & 15, z & 15)
    }
    setBlock(x, y, z, v, lazy) {
        if (!this.chunks[x >> 4] || !this.chunks[x >> 4][y >> 4] || !this.chunks[x >> 4][y >> 4][z >> 4]) {
            return
        }
        let chunk = this.chunks[x >> 4][y >> 4][z >> 4]

        let xm = x & 15
        let ym = y & 15
        let zm = z & 15
        if (v) {
            chunk.setBlock(xm, ym, zm, v, false, !lazy)
        } else {
            chunk.deleteBlock(xm, ym, zm, !lazy)
        }

        if (lazy) {
            return
        }

        if (xm && xm !== 15 && ym && ym !== 15 && zm && zm !== 15) {
            chunk.updateBlock(xm - 1, ym, zm, this, lazy)
            chunk.updateBlock(xm + 1, ym, zm, this, lazy)
            chunk.updateBlock(xm, ym - 1, zm, this, lazy)
            chunk.updateBlock(xm, ym + 1, zm, this, lazy)
            chunk.updateBlock(xm, ym, zm - 1, this, lazy)
            chunk.updateBlock(xm, ym, zm + 1, this, lazy)
        }
        else {
            this.updateBlock(x - 1, y, z, lazy)
            this.updateBlock(x + 1, y, z, lazy)
            this.updateBlock(x, y - 1, z, lazy)
            this.updateBlock(x, y + 1, z, lazy)
            this.updateBlock(x, y, z - 1, lazy)
            this.updateBlock(x, y, z + 1, lazy)
        }

        chunk.updateBlock(xm, ym, zm, this, lazy)

        if (xm | zm === 0) this.updateBlock(x - 1, y, z - 1, lazy)
        if (xm === 15 && zm === 0) this.updateBlock(x + 1, y, z - 1, lazy)
        if (xm === 0 && zm === 15) this.updateBlock(x - 1, y, z + 1, lazy)
        if (xm & zm === 15) this.updateBlock(x + 1, y, z + 1, lazy)
    }
    spawnBlock(x, y, z, v) {
        let cx = x >> 4
        let cy = y >> 4
        let cz = z >> 4
        if (!this.chunks[cx]) {
            this.chunks[cx] = []
        }
        if (!this.chunks[cx][cy]) {
            this.chunks[cx][cy] = []
        }
        let chunk = this.chunks[cx][cy][cz]
        if (!chunk) {
            chunk = new Chunk(cx * 16, cy * 16, cz * 16)
            this.chunks[cx][cy][cz] = chunk
        }
        if (chunk.buffer) {
            this.setBlock(x, y, z, v, true)
        } else {
            chunk.setBlock(x & 15, y & 15, z & 15, v, false)
        }
    }
    render() {
        initModelView(player)
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)

        p2.x = Math.round(player.x)
        p2.y = Math.round(player.y)
        p2.z = Math.round(player.z)

        // renderedChunks = 0

        let dist = renderD * 16
        if (this.genQueue.length) {
            this.genQueue.sort(sortChunks)
            let chunk = this.genQueue[0]
            dist = Math.min(dist, chunkDist(chunk))
        }
        if (dist != fogDist) {
            if (fogDist < dist - 0.1) fogDist += (dist - fogDist) / 120
            else if (fogDist > dist + 0.1) fogDist += (dist - fogDist) / 30
            else fogDist = dist
        }
        gl.uniform3f(glCache.uPos, player.x, player.y, player.z)
        gl.uniform1f(glCache.uDist, fogDist)

        let c = this.sorted
        for (let chunk of c) {
            chunk.render()
        }

        gl.uniform3f(glCache.uPos, 0, 0, 0)

    }
    getNearbyChunks(x, y, z) {
        let minCx = x - 16 >> 4
        let maxCx = x + 16 >> 4
        let minCy = y - 16 >> 4
        let maxCy = y + 16 >> 4
        let minCz = z - 16 >> 4
        let maxCz = z + 16 >> 4
        let chunk = null
        let ret = []
        for (x = minCx; x <= maxCx; x++) {
            for (let y = minCy; y <= maxCy; y++) {
                for (z = minCz; z <= maxCz; z++) {
                    if (this.chunks[x] && this.chunks[x][y] && this.chunks[x][y][z]) {
                        chunk = this.chunks[x][y][z] || emptyChunk
                        ret.push(chunk.blocks)
                    } else {
                        ret.push(emptyChunk.blocks)
                    }
                }
            }
        }
        return ret
    }
    genChunk(chunk) {
        let x = chunk.x >> 4
        let y = chunk.y >> 4
        let z = chunk.z >> 4

        if (chunk.generated) {
            return
        }
        let gen = 0
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 16; y++) {
                for (let z = 0; z < 16; z++) {
                    let height = Math.sin(x / smoothness)+5
                    if (y+chunk.y < height) {
                        chunk.setBlock(x, y, z, bid.stone)
                    } 
                }
            }
        }
        chunk.generated = true
    }
    tick() {
        let startTime = performance.now()
        let maxChunkX = (player.x >> 4) + renderD
        let maxChunkZ = (player.z >> 4) + renderD
        let chunk = maxChunkX + "," + maxChunkZ
        if (chunk != this.lastChunk) {
            this.lastChunk = chunk
            this.loadChunks()
            this.genQueue.sort(sortChunks)
        }

        for (let i = 0; i < this.sorted.length; i++) {
            this.sorted[i].tick()
        }
        
        do {
            if (this.meshQueue.length) {
                do {
                    this.meshQueue.pop().genMesh()
                } while (this.meshQueue.length)

            } else if (this.generateQueue.length) {
                let chunk = this.generateQueue.pop()
                this.genChunk(chunk)

            } else if (this.populateQueue.length) {
                let chunk = this.populateQueue[this.populateQueue.length - 1]
                if (!chunk.caves) {
                    chunk.carveCaves()
                } else if (!chunk.populated) {
                    chunk.populate()
                    this.populateQueue.pop()
                }

            } else if (this.genQueue.length) {
                let chunk = this.genQueue[0]
                if (!fillReqs(chunk.x >> 4, chunk.z >> 4)) {
                    
                } else if (!chunk.loaded) {
                    // console.log("loading chunk")
                    chunk.load()
                } else if (!chunk.optimized) {
                    
                    chunk.optimize(this)
                } else if (!chunk.buffer) {
                    chunk.genMesh()
                } else {
                    this.genQueue.shift()
                }
            } else {
                break
            }
        } while (performance.now() - startTime < 7)
    }
    loadChunks() {
        let rd = renderD + 2
        let cx = player.x >> 4
        let cy = player.y >> 4
        let cz = player.z >> 4
        player.cx = cx
        player.cy = cy
        player.cz = cz
        let minCx = cx - rd
        let maxCx = cx + rd
        let minCy = cy - rd
        let maxCy = cy + rd
        let minCz = cz - rd
        let maxCz = cz + rd

        this.offX = -minCx
        this.offY = -minCy
        this.offZ = -minCz
        this.lwidth = rd * 2 + 1
        this.genQueue.length = 0

        if (this.loaded.length > this.lwidth * this.lwidth) {
            this.loaded.length = this.lwidth * this.lwidth
        }

        let i = 0
        for (let x = minCx; x < maxCx; x++) {
            if (!this.chunks[x]) {
                this.chunks[x] = []
            }
            for (let y = minCy; y < maxCy; y++) {
                if (!this.chunks[x][y]) {
                    this.chunks[x][y] = []
                }
                for (let z = minCz; z < maxCz; z++) {
                    if (!this.chunks[x][y][z]) {
                        let chunk = new Chunk(x * 16, 0, z * 16)
                        if (maxDist(cx, cy, cz, x, y, z) <= rd - 2) {
                            this.genQueue.push(chunk)
                        }
                        this.chunks[x][y][z] = chunk
                    }
                    let chunk = this.chunks[x][y][z]
                    if (!chunk.buffer && !this.genQueue.includes(chunk) && maxDist(cx, cy, cz, x, y, z) <= rd - 2) {
                        this.genQueue.push(chunk)
                    }
                    this.loaded[i] = chunk
                    i++
                }
            }
        }
        this.sorted = this.loaded.filter((chunk) => {
            return maxDist(chunk.x >> 4, chunk.y >> 4, chunk.z >> 4, player.cx, player.cy, player.cz) <= rd - 2
        })
        this.sorted.sort(sortChunks)
    }
}

class Chunk {
    constructor(x, y, z) {
        this.x = x
        this.y = y
        this.z = z
        this.optimized = false
        this.generated = false
        this.populated = superflat
        this.lazy = false
        this.edited = false
        this.loaded = false
        this.caves = !caves
        this.pallete = [0]
        this.palleteMap = {"0": 0}
        this.palleteSize = 0

        this.size = 16
        this.arraySize = this.size * this.size * this.size
        this.blocks = new Int32Array(this.arraySize)
        this.compressed = new Uint8Array(this.arraySize)
    }
    tick() {
        for (let i = 0; i < 3; i++) {
            // let rnd = Math.random() * this.blocks.length | 0
        }
    }
    carveCaves() {
        this.caves = true
    }
    populate() {
        this.populated = true
    }
    load() {
        let cx = this.x >> 4
        let cy = this.y >> 4
        let cz = this.z >> 4
        let load

        // for (let i = 0; i < world.loadFrom.length; i++) {
        //     load = world.loadFrom[i]
        //     if (load.x == cx && load.y == cy && load.z == cz) {
        //         // let y = 
        //     }
        // }

        this.loaded = true
    }
    optimize() {
        let visible = false
        let pos = 0
        let xx = this.x
        let yy = this.y
        let zz = this.z
        let blockState = 0
        let palleteIndex = 0
        let index = 0
        let s = this.size
        let blocks = this.blocks
        this.hasVisibleBlocks = false
        this.renderLength = 0
        let localBlocks = world.getNearbyChunks(xx, yy, zz)

        for (let i = 0; i < s; i++) {
            for (let j = 0; j < s; j++) {
                for (let k = 0; k < s; k++, index++) {
                    blockState = blocks[index]

                    if (this.palleteMap[blockState] == undefined) {
                        this.palleteMap[blockState] = this.pallete.length
                        palleteIndex = this.pallete.length
                        this.pallete.push(blockState)
                    } else {
                        palleteIndex = this.palleteMap[blockState]
                    }

                    visible = blockState && (
                        hideFace(i-1, j, k, localBlocks, blockState, getBlock, "west", "east") |
                        hideFace(i+1, j, k, localBlocks, blockState, getBlock, "east", "west") << 1 |
                        hideFace(i, j-1, k, localBlocks, blockState, getBlock, "bottom", "top") << 2 |
                        hideFace(i, j+1, k, localBlocks, blockState, getBlock, "top", "bottom") << 3 |
                        hideFace(i, j, k-1, localBlocks, blockState, getBlock, "south", "north") << 4 |
                        hideFace(i, j, k+1, localBlocks, blockState, getBlock, "north", "south") << 5
                    )
                    if (visible) {
                        pos = (i | j << 4 | k << 8) << 19
                        this.renderData[this.renderLength++] = 1 << 31 | pos | visible << 13 | palleteIndex
                        this.hasVisibleBlocks = true
                    }
                }
            }
        }

        if (!world.meshQueue.includes(this)) {
            world.meshQueue.push(this)
        }
        this.optimized = true
    }
    genMesh() {
        let start = performance.now()
        let barray = bigArray
        let index = 0

        if (this.renderLength) {
            let length = this.renderLength
            let rData = this.renderData
            let x = 0, y = 0, z = 0, loc = 0, data = 0, sides = 0, tex = null, x2 = 0, y2 = 0, z2 = 0, verts = null, texVerts = null, texShapeVerts = null, tx = 0, ty = 0
            let wx = this.x, wy = this.y, wz = this.z
            let blocks = world.getNearbyChunks(wx, wy, wz)
            let block = null

            let shadows = null
            let blockSides = Object.keys(Block)
            let side = ""
            let shapeVerts = null
            let shapeTexVerts = null
            let palette = this.pallete
            let intShad = interpolateShadows

            for (let i = 0; i < length; i++) {
                data = rData[i]
                block = blockData[pallete[data & 0x1fff]]
                tex = block.textures
                sides = data >> 13 & 0x3f
                loc = data >> 19 & 0xfff
                x = loc & 15
                y = loc >> 4 & 15
                z = loc >> 8 & 15

                x2 = x + this.x
                y2 = y + this.y
                z2 = z + this.z

                shapeVerts = block.shape.verts
                shapeTexVerts = block.shape.texVerts

                let texNum = 0
                for (let n = 0; n < 6; n++) {
                    side = blockSides[n]
                    if (sides & Block[side]) {
                        shadows = getShadows[side](x, y, z, blocks)
                        let directionalFaces = shapeVerts[Sides[side]]

                        for (let facei = 0; facei < directionalFaces.length; facei++) {
                            verts = directionalFaces[facei]
                            texVerts = textureCoords[textureMap[tex[texNum]]]
                            tx = texVerts[0]
                            ty = texVerts[1]
                            texShapeVerts = shapeTexVerts[n][facei]

							barray[index] = verts[0] + x2
							barray[index+1] = verts[1] + y2
							barray[index+2] = verts[2] + z2
							barray[index+3] = tx + texShapeVerts[0]
							barray[index+4] = ty + texShapeVerts[1]
							barray[index+5] = shadows[0]

							barray[index+6] = verts[3] + x2
							barray[index+7] = verts[4] + y2
							barray[index+8] = verts[5] + z2
							barray[index+9] = tx + texShapeVerts[2]
							barray[index+10] = ty + texShapeVerts[3]
							barray[index+11] = shadows[1]

							barray[index+12] = verts[6] + x2
							barray[index+13] = verts[7] + y2
							barray[index+14] = verts[8] + z2
							barray[index+15] = tx + texShapeVerts[4]
							barray[index+16] = ty + texShapeVerts[5]
							barray[index+17] = shadows[2]

							barray[index+18] = verts[9] + x2
							barray[index+19] = verts[10] + y2
							barray[index+20] = verts[11] + z2
							barray[index+21] = tx + texShapeVerts[6]
							barray[index+22] = ty + texShapeVerts[7]
							barray[index+23] = shadows[3]
							index += 24
                        }
                    }
                    texNum++
                }
            }
        }

        let arrayDone = performance.now()

        if (!this.buffer) {
            this.buffer = gl.createBuffer()
        }
        let data = barray.slice(0, index)
        this.faces = data.length / 24
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
        this.lazy = false
    }
    getBlock(x, y, z) {
        let s = this.size
        return this.blocks[x * s * s + y * s + z]
    }
    setBlock(x, y, z, v) {
        let s = this.size
        this.blocks[x * s * s + y * s + z] = v
    }
    deleteBlock(x, y, z) {
        let s = this.size
        this.blocks[x * s * s + y * s + z] = 0
    }
    updateBlock(x, y, z, world) {
        if (this.buffer) {
            
        }
    }
    render() {
        if (!this.buffer) {
            return
        }
        if (player.canSee(this.x, this.y, this.z, this.y+this.size)) {
            // rendered += 1
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
            
            gl.vertexAttribPointer(glCache.aVertex, 3, gl.FLOAT, false, 24, 0)
            gl.vertexAttribPointer(glCache.aTexture, 2, gl.FLOAT, false, 24, 12)
            gl.vertexAttribPointer(glCache.aShadow, 1, gl.FLOAT, false, 24, 20)

            gl.enableVertexAttribArray(glCache.aVertex)
            gl.enableVertexAttribArray(glCache.aTexture)
            gl.enableVertexAttribArray(glCache.aShadow)
            gl.drawElements(gl.TRIANGLES, 6 * this.faces, gl.UNSIGNED_INT, 0)
        }
    }
}

var emptyChunk = new Chunk(0, 0, 0)
var world = new World()

indexBuffer = gl.createBuffer()
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexOrder, gl.STATIC_DRAW)

function update(timestamp) {
    requestAnimationFrame(update)

    utils.getDelta(timestamp)
    ui.resizeCanvas()
    ui.getSu()

    glcanvas.width = window.innerWidth
    glcanvas.height = window.innerHeight

    gl.clearColor(0, 0, 0, 1.0)
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)

    gl.viewport(0, 0, glcanvas.width, glcanvas.height)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    world.tick()
    world.render()

    input.updateInput()
}

requestAnimationFrame(update)

var bigArray = new Float32Array(600000)

let Block = {
    top: 0x4,
    bottom: 0x8,
    north: 0x20,
    south: 0x10,
    east: 0x2,
    west: 0x1,
}
let Sides = {
    top: 0,
    bottom: 1,
    north: 2,
    south: 3,
    east: 4,
    west: 5,
}

function objectify(x, y, z, width, height, textureX, textureY) {
    return {
        x: x,
        y: y,
        z: z,
        w: width,
        h: height,
        tx: textureX,
        ty: textureY
    }
}

let shapes = {
    cube: {
        verts: [
            [objectify( 0,  0,  0, 16, 16, 0, 0)], //bottom
            [objectify( 0, 16, 16, 16, 16, 0, 0)], //top
            [objectify(16, 16, 16, 16, 16, 0, 0)], //north
            [objectify( 0, 16,  0, 16, 16, 0, 0)], //south
            [objectify(16, 16,  0, 16, 16, 0, 0)], //east
            [objectify( 0, 16, 16, 16, 16, 0, 0)]  //west
        ],
        cull: {
            top: 3,
            bottom: 3,
            north: 3,
            south: 3,
            east: 3,
            west: 3
        },
        texVerts: [],
        varients: [],
        buffer: null,
        size: 6,
    },
    slab: {
        verts: [
            [objectify( 0, 0,  0, 16, 16, 0, 0)], //bottom
            [objectify( 0, 8, 16, 16, 16, 0, 0)], //top
            [objectify(16, 8, 16, 16, 8, 0, 0)], //north
            [objectify( 0, 8,  0, 16, 8, 0, 0)], //south
            [objectify(16, 8,  0, 16, 8, 0, 0)], //east
            [objectify( 0, 8, 16, 16, 8, 0, 0)]  //west
        ],
        cull: {
            top: 0,
            bottom: 3,
            north: 1,
            south: 1,
            east: 1,
            west: 1
        },
        texVerts: [],
        buffer: null,
        size: 6,
        varients: [],
        flip: true,
        rotate: false
    },
    stair: {
        verts: [
            [objectify( 0, 0,  0, 16, 16, 0, 0)], //bottom
            [objectify( 0, 8,  8, 16, 8, 0, 8), objectify( 0, 16,  16, 16, 8, 0, 0)], //top
            [objectify(16, 16, 16, 16, 16, 0, 0)], //north
            [objectify( 0, 8,  0, 16, 8, 0, 0), objectify( 0, 16,  8, 16, 8, 0, 0)], //south
            [objectify(16, 8, 0, 8, 8, 8, 0), objectify(16, 16, 8, 8, 16, 0, 0)], //east
            [objectify( 0, 8, 8, 8, 8, 0, 0), objectify( 0, 16, 16, 8, 16, 8, 0)]  //west
        ],
        cull: {
            top: 0,
            bottom: 3,
            north: 3,
            south: 0,
            east: 0,
            west: 0
        },
        texVerts: [],
        buffer: null,
        size: 10,
        varients: [],
        flip: true,
        rotate: true
    }
}

class Matrix {
    constructor(arr) {
        this.elements = new Float32Array(arr || 16)
    }
    translate(x, y, z) {
        let a = this.elements
        a[3] += a[0] * x + a[1] * y + a[2] * z
        a[7] += a[4] * x + a[5] * y + a[6] * z
        a[11] += a[8] * x + a[9] * y + a[10] * z
        a[15] += a[12] * x + a[13] * y + a[14] * z
    }
    rotX(angle) {
        let elems = this.elements
        let c = Math.cos(angle)
        let s = Math.sin(angle)
        let t = elems[1]
        elems[1] = t * c + elems[2] * s
        elems[2] = t * -s + elems[2] * c
        t = elems[5]
        elems[5] = t * c + elems[6] * s
        elems[6] = t * -s + elems[6] * c
        t = elems[9]
        elems[9] = t * c + elems[10] * s
        elems[10] = t * -s + elems[10] * c
        t = elems[13]
        elems[13] = t * c + elems[14] * s
        elems[14] = t * -s + elems[14] * c
    }
    rotY(angle) {
        let c = Math.cos(angle)
        let s = Math.sin(angle)
        let elems = this.elements
        let t = elems[0]
        elems[0] = t * c + elems[2] * -s
        elems[2] = t * s + elems[2] * c
        t = elems[4]
        elems[4] = t * c + elems[6] * -s
        elems[6] = t * s + elems[6] * c
        t = elems[8]
        elems[8] = t * c + elems[10] * -s
        elems[10] = t * s + elems[10] * c
        t = elems[12]
        elems[12] = t * c + elems[14] * -s
        elems[14] = t * s + elems[14] * c
    }
    transpose() {
        let matrix = this.elements
        let temp = matrix[4]
        matrix[4] = matrix[1]
        matrix[1] = temp

        temp = matrix[8]
        matrix[8] = matrix[2]
        matrix[2] = temp

        temp = matrix[6]
        matrix[6] = matrix[9]
        matrix[9] = temp

        temp = matrix[3]
        matrix[3] = matrix[12]
        matrix[12] = temp

        temp = matrix[7]
        matrix[7] = matrix[13]
        matrix[13] = temp

        temp = matrix[11]
        matrix[11] = matrix[14]
        matrix[14] = temp
    }
    copyArray(from) {
        let to = this.elements
        for (let i = 0; i < from.length; i++) {
            to[i] = from[i]
        }
    }
    copyMatrix(from) {
        let to = this.elements
        from = from.elements
        for (let i = 0; i < from.length; i++) {
            to[i] = from[i]
        }
    }
}

var defaultTransformation = new Matrix([ -10,0,0,0,0,10,0,0,0,0,-10,0,0,0,0,1 ])

class Plane {
    constructor(nx, ny, nz) {
        this.set(nx, ny, nz)
    }
    set(nx, ny, nz) {
        this.dx = nx > 0 ? 16 : 0
        this.dy = ny > 0
        this.dz = nz > 0 ? 16 : 0

        this.nx = nx
        this.ny = ny
        this.nz = nz
    }
}

function trans(matrix, x, y, z) {
    let a = matrix
    a[3] += a[0] * x + a[1] * y + a[2] * z
    a[7] += a[4] * x + a[5] * y + a[6] * z
    a[11] += a[8] * x + a[9] * y + a[10] * z
    a[15] += a[12] * x + a[13] * y + a[14] * z
}
function rotX(matrix, angle) {
    // This function is basically multiplying 2 4x4 matrices together,
    // but 1 of them has a bunch of 0's and 1's in it,
    // so I removed all terms that multiplied by 0, and just left off the 1's.
    // mat2 = [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]
    let elems = matrix
    let c = Math.cos(angle)
    let s = Math.sin(angle)
    let t = elems[1]
    elems[1] = t * c + elems[2] * s
    elems[2] = t * -s + elems[2] * c
    t = elems[5]
    elems[5] = t * c + elems[6] * s
    elems[6] = t * -s + elems[6] * c
    t = elems[9]
    elems[9] = t * c + elems[10] * s
    elems[10] = t * -s + elems[10] * c
    t = elems[13]
    elems[13] = t * c + elems[14] * s
    elems[14] = t * -s + elems[14] * c
}
function rotY(matrix, angle) {
//source = c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1
    let c = Math.cos(angle)
    let s = Math.sin(angle)
    let elems = matrix
    let t = elems[0]
    elems[0] = t * c + elems[2] * -s
    elems[2] = t * s + elems[2] * c
    t = elems[4]
    elems[4] = t * c + elems[6] * -s
    elems[6] = t * s + elems[6] * c
    t = elems[8]
    elems[8] = t * c + elems[10] * -s
    elems[10] = t * s + elems[10] * c
    t = elems[12]
    elems[12] = t * c + elems[14] * -s
    elems[14] = t * s + elems[14] * c
}
function transpose(matrix) {
    let temp = matrix[4]
    matrix[4] = matrix[1]
    matrix[1] = temp

    temp = matrix[8]
    matrix[8] = matrix[2]
    matrix[2] = temp

    temp = matrix[6]
    matrix[6] = matrix[9]
    matrix[9] = temp

    temp = matrix[3]
    matrix[3] = matrix[12]
    matrix[12] = temp

    temp = matrix[7]
    matrix[7] = matrix[13]
    matrix[13] = temp

    temp = matrix[11]
    matrix[11] = matrix[14]
    matrix[14] = temp
}

function matMult() {
//Multiply the projection matrix by the view matrix; this is optimized specifically for these matrices by removing terms that are always 0.
    let proj = projection
    let view = modelView
    matrix[0] = proj[0] * view[0]
    matrix[1] = proj[0] * view[1]
    matrix[2] = proj[0] * view[2]
    matrix[3] = proj[0] * view[3]
    matrix[4] = proj[5] * view[4]
    matrix[5] = proj[5] * view[5]
    matrix[6] = proj[5] * view[6]
    matrix[7] = proj[5] * view[7]
    matrix[8] = proj[10] * view[8] + proj[11] * view[12]
    matrix[9] = proj[10] * view[9] + proj[11] * view[13]
    matrix[10] = proj[10] * view[10] + proj[11] * view[14]
    matrix[11] = proj[10] * view[11] + proj[11] * view[15]
    matrix[12] = proj[14] * view[8]
    matrix[13] = proj[14] * view[9]
    matrix[14] = proj[14] * view[10]
    matrix[15] = proj[14] * view[11]
}
function copyArr(a, b) {
    for (let i = 0; i < a.length; i++) {
        b[i] = a[i]
    }
}
function FOV(fov) {
    let tang = Math.tan(fov * 0.5 * Math.PI / 180)
    let scale = 1 / tang
    let near = 1
    let far = 1000000
    currentFov = fov

    projection[0] = scale / width * height
    projection[5] = scale
    projection[10] = -far / (far - near)
    projection[11] = -1
    projection[14] = -far * near / (far - near)
}

function fillReqs(x, z) {
    var done = true
    for (let i = x - 2; i <= x + 2; i++) {
        for (let j = z - 2; j <= z + 2; j++) {
            let chunk = world.loaded[(i + world.offX) * world.lwidth + j + world.offZ]
            if (!chunk.generated) {
                world.generateQueue.push(chunk)
                done = false
            }
            if (!chunk.populated && i >= x - 1 && i <= x + 1 && j >= z - 1 && j <= z + 1) {
                world.populateQueue.push(chunk)
                done = false
            }
        }
    }
    return done
}
function checkFace(x, y, z, blocks, type, func, sourceDir, dir) {
    let block = func.call(world, x, y, z, blocks)
    if (!block) {
        return 1
    }

    let data = blockData[block]
    let sourceData = blockData[type]

    let sourceRange = 3
    let hiderRange = 3
    if (func != getBlock) {
        sourceRange = sourceData.shape.cull[sourceDir]
        hiderRange = data.shape.cull[dir]
    }

    if ((sourceRange & hiderRange) !== sourceRange || sourceRange === 0 || block !== type && data.transparent || data.transparent && data.shadow) {
        return 1
    }

    return 0
}

function getBlock(x, y, z, blocks) {
    return blocks[((x >> 4) + 1) * 9 + ((y >> 4) + 1) * 3 + (z >> 4) + 1][((x & 15) << 8) + ((y & 15) << 4) + (z & 15)]
}

let getShadows = {
    shade: [ 1, 0.85, 0.7, 0.6, 0.3 ],
    ret: [],
    blocks: [],
    top: function(x, y, z, block) { // Actually the bottom... How did these get flipped?
        let blocks = this.blocks
        let ret = this.ret
        blocks[0] = blockData[getBlock(x-1, y-1, z-1, block)].shadow
        blocks[1] = blockData[getBlock(x, y-1, z-1, block)].shadow
        blocks[2] = blockData[getBlock(x+1, y-1, z-1, block)].shadow
        blocks[3] = blockData[getBlock(x-1, y-1, z, block)].shadow
        blocks[4] = blockData[getBlock(x, y-1, z, block)].shadow
        blocks[5] = blockData[getBlock(x+1, y-1, z, block)].shadow
        blocks[6] = blockData[getBlock(x-1, y-1, z+1, block)].shadow
        blocks[7] = blockData[getBlock(x, y-1, z+1, block)].shadow
        blocks[8] = blockData[getBlock(x+1, y-1, z+1, block)].shadow

        ret[0] = this.shade[blocks[0] + blocks[1] + blocks[3] + blocks[4]]*0.75
        ret[1] = this.shade[blocks[1] + blocks[2] + blocks[4] + blocks[5]]*0.75
        ret[2] = this.shade[blocks[5] + blocks[4] + blocks[8] + blocks[7]]*0.75
        ret[3] = this.shade[blocks[4] + blocks[3] + blocks[7] + blocks[6]]*0.75
        return ret
    },
    bottom: function(x, y, z, block) { // Actually the top
        let blocks = this.blocks
        let ret = this.ret
        blocks[0] = blockData[getBlock(x-1, y+1, z-1, block)].shadow
        blocks[1] = blockData[getBlock(x, y+1, z-1, block)].shadow
        blocks[2] = blockData[getBlock(x+1, y+1, z-1, block)].shadow
        blocks[3] = blockData[getBlock(x-1, y+1, z, block)].shadow
        blocks[4] = blockData[getBlock(x, y+1, z, block)].shadow
        blocks[5] = blockData[getBlock(x+1, y+1, z, block)].shadow
        blocks[6] = blockData[getBlock(x-1, y+1, z+1, block)].shadow
        blocks[7] = blockData[getBlock(x, y+1, z+1, block)].shadow
        blocks[8] = blockData[getBlock(x+1, y+1, z+1, block)].shadow

        ret[0] = this.shade[blocks[4] + blocks[3] + blocks[7] + blocks[6]]
        ret[1] = this.shade[blocks[5] + blocks[4] + blocks[8] + blocks[7]]
        ret[2] = this.shade[blocks[1] + blocks[2] + blocks[4] + blocks[5]]
        ret[3] = this.shade[blocks[0] + blocks[1] + blocks[3] + blocks[4]]
        return ret
    },
    north: function(x, y, z, block) {
        let blocks = this.blocks
        let ret = this.ret
        blocks[0] = blockData[getBlock(x-1, y-1, z+1, block)].shadow
        blocks[1] = blockData[getBlock(x, y-1, z+1, block)].shadow
        blocks[2] = blockData[getBlock(x+1, y-1, z+1, block)].shadow
        blocks[3] = blockData[getBlock(x-1, y, z+1, block)].shadow
        blocks[4] = blockData[getBlock(x, y, z+1, block)].shadow
        blocks[5] = blockData[getBlock(x+1, y, z+1, block)].shadow
        blocks[6] = blockData[getBlock(x-1, y+1, z+1, block)].shadow
        blocks[7] = blockData[getBlock(x, y+1, z+1, block)].shadow
        blocks[8] = blockData[getBlock(x+1, y+1, z+1, block)].shadow

        ret[0] = this.shade[blocks[5] + blocks[4] + blocks[8] + blocks[7]]*0.95
        ret[1] = this.shade[blocks[4] + blocks[3] + blocks[7] + blocks[6]]*0.95
        ret[2] = this.shade[blocks[0] + blocks[1] + blocks[3] + blocks[4]]*0.95
        ret[3] = this.shade[blocks[1] + blocks[2] + blocks[4] + blocks[5]]*0.95
        return ret
    },
    south: function(x, y, z, block) {
        let blocks = this.blocks
        let ret = this.ret
        blocks[0] = blockData[getBlock(x-1, y-1, z-1, block)].shadow
        blocks[1] = blockData[getBlock(x-1, y, z-1, block)].shadow
        blocks[2] = blockData[getBlock(x-1, y+1, z-1, block)].shadow
        blocks[3] = blockData[getBlock(x, y-1, z-1, block)].shadow
        blocks[4] = blockData[getBlock(x, y, z-1, block)].shadow
        blocks[5] = blockData[getBlock(x, y+1, z-1, block)].shadow
        blocks[6] = blockData[getBlock(x+1, y-1, z-1, block)].shadow
        blocks[7] = blockData[getBlock(x+1, y, z-1, block)].shadow
        blocks[8] = blockData[getBlock(x+1, y+1, z-1, block)].shadow

        ret[0] = this.shade[blocks[1] + blocks[2] + blocks[4] + blocks[5]]*0.95
        ret[1] = this.shade[blocks[5] + blocks[4] + blocks[8] + blocks[7]]*0.95
        ret[2] = this.shade[blocks[4] + blocks[3] + blocks[7] + blocks[6]]*0.95
        ret[3] = this.shade[blocks[0] + blocks[1] + blocks[3] + blocks[4]]*0.95
        return ret
    },
    east: function(x, y, z, block) {
        let blocks = this.blocks
        let ret = this.ret
        blocks[0] = blockData[getBlock(x+1, y-1, z-1, block)].shadow
        blocks[1] = blockData[getBlock(x+1, y, z-1, block)].shadow
        blocks[2] = blockData[getBlock(x+1, y+1, z-1, block)].shadow
        blocks[3] = blockData[getBlock(x+1, y-1, z, block)].shadow
        blocks[4] = blockData[getBlock(x+1, y, z, block)].shadow
        blocks[5] = blockData[getBlock(x+1, y+1, z, block)].shadow
        blocks[6] = blockData[getBlock(x+1, y-1, z+1, block)].shadow
        blocks[7] = blockData[getBlock(x+1, y, z+1, block)].shadow
        blocks[8] = blockData[getBlock(x+1, y+1, z+1, block)].shadow

        ret[0] = this.shade[blocks[1] + blocks[2] + blocks[4] + blocks[5]]*0.8
        ret[1] = this.shade[blocks[5] + blocks[4] + blocks[8] + blocks[7]]*0.8
        ret[2] = this.shade[blocks[4] + blocks[3] + blocks[7] + blocks[6]]*0.8
        ret[3] = this.shade[blocks[0] + blocks[1] + blocks[3] + blocks[4]]*0.8
        return ret
    },
    west: function(x, y, z, block) {
        let blocks = this.blocks
        let ret = this.ret
        blocks[0] = blockData[getBlock(x-1, y-1, z-1, block)].shadow
        blocks[1] = blockData[getBlock(x-1, y, z-1, block)].shadow
        blocks[2] = blockData[getBlock(x-1, y+1, z-1, block)].shadow
        blocks[3] = blockData[getBlock(x-1, y-1, z, block)].shadow
        blocks[4] = blockData[getBlock(x-1, y, z, block)].shadow
        blocks[5] = blockData[getBlock(x-1, y+1, z, block)].shadow
        blocks[6] = blockData[getBlock(x-1, y-1, z+1, block)].shadow
        blocks[7] = blockData[getBlock(x-1, y, z+1, block)].shadow
        blocks[8] = blockData[getBlock(x-1, y+1, z+1, block)].shadow

        ret[0] = this.shade[blocks[7] + blocks[8] + blocks[4] + blocks[5]]*0.8
        ret[1] = this.shade[blocks[5] + blocks[4] + blocks[2] + blocks[1]]*0.8
        ret[2] = this.shade[blocks[4] + blocks[3] + blocks[1] + blocks[0]]*0.8
        ret[3] = this.shade[blocks[6] + blocks[7] + blocks[3] + blocks[4]]*0.8
        return ret
    },
}

function interpolateShadows(shadows, x, y) {
    let sx = (shadows[1] - shadows[0]) * x + shadows[0]
    let sx2 = (shadows[3] - shadows[2]) * x + shadows[2]
    return (sx2 - sx) * y + sx
}

function uniformMatrix(cacheId, programObj, vrName, transpose, matrix) {
    let vrLocation = glCache[cacheId]
    if(vrLocation === undefined) {
        vrLocation = gl.getUniformLocation(programObj, vrName)
        glCache[cacheId] = vrLocation
    }
    gl.uniformMatrix4fv(vrLocation, transpose, matrix)
}

var matrix = new Float32Array(16)

function initModelView(camera, x, y, z, rx, ry) {
    if (camera) {
        camera.transform()
        uniformMatrix("view3d", program, "uView", false, camera.getMatrix())
    } else {
        copyArr(defaultModelView, modelView)
        rotX(modelView, rx)
        rotY(modelView, ry)
        trans(modelView, -x, -y, -z)
        matMult()
        transpose(matrix)
        uniformMatrix("view3d", program, "uView", false, matrix)
    }
}

var p2 = {
    x: 0,
    y: 0,
    z: 0,
}

function chunkDist(c) {
    let dx = player.x - c.x
    let dy = player.y - c.y
    let dz = player.z - c.z
    if (dx > 16) {
        dx -= 16
    } else if (dx > 0) {
        dx = 0
    }
    if (dy > 16) {
        dy -= 16
    } else if (dy > 0) {
        dy = 0
    }
    if (dz > 16) {
        dz -= 16
    } else if (dz > 0) {
        dz = 0
    }
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

let arr = []
for (let i = 0; i < 100000; i++) {
    arr.push(0 + i * 4, 1 + i * 4, 2 + i * 4, 0 + i * 4, 2 + i * 4, 3 + i * 4)
}
var indexOrder = new Uint32Array(arr)
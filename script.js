
var glcanvas = document.getElementById("glcanvas")
var gl = glcanvas.getContext("webgl2", { reserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false })
gl.enable(gl.DEPTH_TEST)
gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

var vertexShaderSrc = `#version 300 es
    in vec3 aVertex;
    in vec2 aTexture;
    in float aShadow;
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
    gl.activeTexture(gl.TEXTURE0 + id)
    gl.bindTexture(gl.TEXTURE_2D, texture2)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)

    
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

function update(timestamp) {
    requestAnimationFrame(update)

    utils.getDelta(timestamp)
    ui.resizeCanvas()
    ui.getSu()

    glcanvas.width = window.innerWidth
    glcanvas.height = window.innerHeight

    input.updateInput()
}

requestAnimationFrame(update)
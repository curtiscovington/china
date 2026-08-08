const canvas = document.querySelector('#flag');
const gl = canvas.getContext('webgl', {
  alpha: false,
  antialias: true,
  powerPreference: 'high-performance',
});

if (!gl) {
  canvas.style.background = '#de2910';
  canvas.style.opacity = '1';
  throw new Error('WebGL is not available');
}

const vertexSource = `
  attribute vec2 a_position;
  attribute vec2 a_uv;

  uniform float u_time;
  uniform float u_motion;
  uniform float u_aspect;

  varying vec2 v_uv;
  varying float v_light;
  varying float v_fold;

  void main() {
    float reach = smoothstep(0.0, 0.32, a_uv.x);
    float t = u_time * 0.72;
    float broad = sin(a_uv.x * 8.4 - t * 2.0 + a_uv.y * 1.25);
    float cross = sin(a_uv.x * 15.0 - t * 2.75 - a_uv.y * 5.5);
    float soft = sin(a_uv.y * 9.0 + t * 1.15 + a_uv.x * 3.0);
    float wave = (broad * 0.065 + cross * 0.018 + soft * 0.010) * reach * u_motion;

    vec2 cover = u_aspect > 1.5
      ? vec2(1.0, u_aspect / 1.5)
      : vec2(1.5 / u_aspect, 1.0);

    vec2 p = (a_position * 2.0 - 1.0) * cover;
    p.x += wave * 0.20;
    p.y += wave * 0.54 + sin(a_uv.x * 5.2 - t) * 0.012 * reach * u_motion;

    float perspective = 1.0 + wave * 0.28;
    p *= perspective;

    v_uv = a_uv;
    v_fold = wave;
    v_light = 0.86 + broad * 0.12 + cross * 0.045 + wave * 0.9;
    gl_Position = vec4(p, wave * 0.15, 1.0);
  }
`;

const fragmentSource = `
  precision mediump float;

  uniform sampler2D u_flag;
  uniform float u_time;

  varying vec2 v_uv;
  varying float v_light;
  varying float v_fold;

  float grain(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec4 cloth = texture2D(u_flag, v_uv);
    float weave = sin(v_uv.x * 2100.0) * sin(v_uv.y * 1350.0) * 0.012;
    float noise = (grain(v_uv * 1800.0 + u_time * 0.015) - 0.5) * 0.018;
    float sheen = pow(max(0.0, 1.0 - abs(v_fold) * 12.0), 7.0) * 0.045;
    float light = clamp(v_light + weave + noise + sheen, 0.67, 1.16);
    gl_FragColor = vec4(cloth.rgb * light, 1.0);
  }
`;

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

function createMesh(columns = 120, rows = 80) {
  const vertices = [];
  const indices = [];

  for (let y = 0; y <= rows; y += 1) {
    for (let x = 0; x <= columns; x += 1) {
      const u = x / columns;
      const v = y / rows;
      vertices.push(u, v, u, v);
    }
  }

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const a = y * (columns + 1) + x;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}

const mesh = createMesh();
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
const positionLocation = gl.getAttribLocation(program, 'a_position');
const uvLocation = gl.getAttribLocation(program, 'a_uv');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
gl.enableVertexAttribArray(uvLocation);
gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

function drawStar(context, cx, cy, radius, rotation) {
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = rotation + (point * Math.PI) / 5;
    const length = point % 2 === 0 ? radius : radius * 0.382;
    const x = cx + Math.cos(angle) * length;
    const y = cy + Math.sin(angle) * length;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
}

function createFlagTexture() {
  const flag = document.createElement('canvas');
  flag.width = 1500;
  flag.height = 1000;
  const context = flag.getContext('2d');
  const scale = 50;

  context.fillStyle = '#de2910';
  context.fillRect(0, 0, flag.width, flag.height);
  context.fillStyle = '#ffde00';

  drawStar(context, 5 * scale, 5 * scale, 3 * scale, -Math.PI / 2);

  const large = { x: 5, y: 5 };
  const smallStars = [
    { x: 10, y: 2 },
    { x: 12, y: 4 },
    { x: 12, y: 7 },
    { x: 10, y: 9 },
  ];

  for (const star of smallStars) {
    const towardLarge = Math.atan2(large.y - star.y, large.x - star.x);
    drawStar(context, star.x * scale, star.y * scale, scale, towardLarge);
  }

  return flag;
}

const texture = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, createFlagTexture());
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.uniform1i(gl.getUniformLocation(program, 'u_flag'), 0);

const timeLocation = gl.getUniformLocation(program, 'u_time');
const motionLocation = gl.getUniformLocation(program, 'u_motion');
const aspectLocation = gl.getUniformLocation(program, 'u_aspect');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function resize() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
  const height = Math.max(1, Math.round(window.innerHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }
}

function render(milliseconds) {
  resize();
  gl.uniform1f(timeLocation, milliseconds / 1000);
  gl.uniform1f(motionLocation, reducedMotion.matches ? 0 : 1);
  gl.uniform1f(aspectLocation, canvas.width / canvas.height);
  gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
  requestAnimationFrame(render);
}

window.addEventListener('resize', resize, { passive: true });
requestAnimationFrame(render);

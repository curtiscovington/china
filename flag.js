const canvas = document.querySelector('#flag');
const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!context) {
  throw new Error('Canvas 2D is not available');
}

const texture = document.createElement('canvas');
texture.width = 1800;
texture.height = 1200;
const textureContext = texture.getContext('2d');

function drawStar(target, cx, cy, radius, rotation) {
  target.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = rotation + (point * Math.PI) / 5;
    const length = point % 2 === 0 ? radius : radius * 0.382;
    const x = cx + Math.cos(angle) * length;
    const y = cy + Math.sin(angle) * length;
    if (point === 0) target.moveTo(x, y);
    else target.lineTo(x, y);
  }
  target.closePath();
  target.fill();
}

function buildFlagTexture() {
  const unit = 60;
  const red = textureContext.createLinearGradient(0, 0, texture.width, texture.height);
  red.addColorStop(0, '#cf1d0d');
  red.addColorStop(0.48, '#e92712');
  red.addColorStop(1, '#c51609');
  textureContext.fillStyle = red;
  textureContext.fillRect(0, 0, texture.width, texture.height);

  const glow = textureContext.createRadialGradient(360, 290, 0, 360, 290, 640);
  glow.addColorStop(0, 'rgba(255, 107, 59, 0.19)');
  glow.addColorStop(1, 'rgba(255, 107, 59, 0)');
  textureContext.fillStyle = glow;
  textureContext.fillRect(0, 0, texture.width, texture.height);

  textureContext.save();
  textureContext.shadowColor = 'rgba(111, 28, 0, 0.28)';
  textureContext.shadowBlur = 16;
  textureContext.shadowOffsetY = 7;
  textureContext.fillStyle = '#ffdf16';

  drawStar(textureContext, 5 * unit, 5 * unit, 3 * unit, -Math.PI / 2);

  const large = { x: 5, y: 5 };
  for (const small of [
    { x: 10, y: 2 },
    { x: 12, y: 4 },
    { x: 12, y: 7 },
    { x: 10, y: 9 },
  ]) {
    drawStar(
      textureContext,
      small.x * unit,
      small.y * unit,
      unit,
      Math.atan2(large.y - small.y, large.x - small.x),
    );
  }
  textureContext.restore();

  textureContext.globalAlpha = 0.1;
  textureContext.fillStyle = '#fff';
  for (let y = 1; y < texture.height; y += 3) {
    textureContext.fillRect(0, y, texture.width, 0.45);
  }
  textureContext.globalAlpha = 1;
}

buildFlagTexture();

let width = 1;
let height = 1;
let pixelRatio = 1;
let lastFrame = 0;

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
  height = Math.max(1, Math.round(window.innerHeight * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function render(timestamp = 0) {
  resize();

  if (reducedMotion.matches && lastFrame > 0) return;
  lastFrame = timestamp;

  const time = reducedMotion.matches ? 0.6 : timestamp / 1000;
  // A slight viewport bleed keeps every edge covered while preserving the
  // complete constellation on wide and tall screens.
  const flagWidth = width * 1.06;
  const flagHeight = height * 1.08;
  const originX = (width - flagWidth) / 2;
  const originY = (height - flagHeight) / 2;
  const stripWidth = Math.max(3, Math.round(4 * pixelRatio));

  context.fillStyle = '#8f1008';
  context.fillRect(0, 0, width, height);

  for (let x = 0; x < flagWidth; x += stripWidth) {
    const u = x / flagWidth;
    const reach = 0.32 + smoothstep(Math.min(1, u * 1.18)) * 0.68;
    const broad = Math.sin(u * 12.2 - time * 1.45);
    const detail = Math.sin(u * 27.5 - time * 2.05 + 0.8);
    const drift = Math.sin(u * 6.1 - time * 0.78 - 0.5);
    const fold = broad * 0.72 + detail * 0.19 + drift * 0.09;
    const offsetY = fold * flagHeight * 0.033 * reach;
    const stretch = 1 + Math.cos(u * 12.2 - time * 1.45) * 0.018 * reach;

    const sourceX = (x / flagWidth) * texture.width;
    const sourceWidth = Math.min(texture.width - sourceX, (stripWidth / flagWidth) * texture.width + 2);
    const destinationX = originX + x;
    const destinationY = originY + offsetY - (flagHeight * (stretch - 1)) / 2;

    context.drawImage(
      texture,
      sourceX,
      0,
      sourceWidth,
      texture.height,
      destinationX,
      destinationY,
      stripWidth + 1,
      flagHeight * stretch,
    );

    const light = Math.cos(u * 12.2 - time * 1.45) * 0.12 + Math.cos(u * 27.5 - time * 2.05) * 0.035;
    if (light > 0) {
      context.globalCompositeOperation = 'screen';
      context.fillStyle = `rgba(255, 221, 186, ${light})`;
    } else {
      context.globalCompositeOperation = 'multiply';
      context.fillStyle = `rgba(72, 7, 3, ${-light * 1.35})`;
    }
    context.fillRect(destinationX, destinationY, stripWidth + 1, flagHeight * stretch);
    context.globalCompositeOperation = 'source-over';
  }

  const bloom = context.createRadialGradient(width * 0.28, height * 0.3, 0, width * 0.28, height * 0.3, Math.max(width, height) * 0.78);
  bloom.addColorStop(0, 'rgba(255, 167, 104, 0.085)');
  bloom.addColorStop(0.6, 'rgba(255, 93, 50, 0)');
  bloom.addColorStop(1, 'rgba(38, 0, 0, 0.15)');
  context.fillStyle = bloom;
  context.fillRect(0, 0, width, height);

  const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.25, width / 2, height / 2, Math.max(width, height) * 0.72);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(43, 0, 0, 0.22)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);

  if (!canvas.classList.contains('is-ready')) canvas.classList.add('is-ready');
  if (!reducedMotion.matches) requestAnimationFrame(render);
}

window.addEventListener('resize', resize, { passive: true });
reducedMotion.addEventListener?.('change', () => {
  lastFrame = 0;
  requestAnimationFrame(render);
});
requestAnimationFrame(render);

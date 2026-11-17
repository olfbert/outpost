// Minimap: zeigt die ganze Welt (oberste Stufe der Flächendarstellung),
// den aktuellen Bildausschnitt und die Siedlung. Tippen/Ziehen springt dorthin.

export class Minimap {
  constructor(canvas, camera, onJump) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = camera;
    this.onJump = onJump;
    this.far = null;
    let down = false;
    const jump = (e) => {
      const r = canvas.getBoundingClientRect();
      const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
      camera.stop();
      camera.target = null;
      camera.x = (u - 0.5) * camera.boundX * 2;
      camera.y = v * camera.boundY;
      camera.clamp();
      this.onJump();
    };
    canvas.addEventListener('pointerdown', (e) => { down = true; canvas.setPointerCapture?.(e.pointerId); jump(e); });
    canvas.addEventListener('pointermove', (e) => { if (down) jump(e); });
    canvas.addEventListener('pointerup', () => { down = false; });
    canvas.addEventListener('pointercancel', () => { down = false; });
  }

  setWorld(world, far) { this.world = world; this.far = far; }

  draw(settlement) {
    const { ctx, canvas, cam, far } = this;
    if (!far || canvas.hidden) return;
    const w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1c3f52';
    ctx.fillRect(0, 0, w, h);
    const k = w / (cam.boundX * 2);                 // Welt-Px -> Minimap-Px
    const tpp = far.tpp(far.J);
    ctx.imageSmoothingEnabled = true;
    ctx.setTransform(32 * tpp * k, 16 * tpp * k, -32 * tpp * k, 16 * tpp * k, w / 2, 0);
    ctx.drawImage(far.top.canvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (settlement) {
      const sx = w / 2 + (settlement.x - settlement.y) * 32 * k, sy = (settlement.x + settlement.y) * 16 * k;
      ctx.fillStyle = '#1b2327'; ctx.fillRect(sx - 4, sy - 4, 8, 8);
      ctx.fillStyle = '#f0d488'; ctx.fillRect(sx - 2.5, sy - 2.5, 5, 5);
    }
    const vw = (cam.vw / cam.scale) * k, vh = (cam.vh / cam.scale) * k;
    const cx = w / 2 + cam.x * k, cy = cam.y * k;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    if (vw < 9 || vh < 9) {
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.strokeRect(cx - vw / 2, cy - vh / 2, vw, vh);
    }
  }
}

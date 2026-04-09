/**
 * Canvas Renderer
 * Handles all visual rendering of the automaton graph on an HTML5 canvas.
 * Draws states as circles, transitions as arrows, and manages highlights/animations.
 */
export class Renderer {
  constructor(canvas, automaton) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.automaton = automaton;

    // Rendering config
    this.stateRadius = 30;
    this.arrowSize = 10;
    this.dpr = window.devicePixelRatio || 1;

    // Animation state
    this.activeStates = new Set();        // Currently highlighted state ids
    this.activeTransitions = new Set();    // Currently highlighted transition ids
    this.transitionSource = null;          // For drawing in-progress transition
    this.mousePos = { x: 0, y: 0 };
    this.animationPhase = 0;              // For pulse animations
    this.lastFrameTime = 0;

    // Colors
    this.colors = {
      bg: '#070b14',
      grid: 'rgba(74, 158, 255, 0.04)',
      state: {
        fill: '#141e33',
        stroke: '#3b6fac',
        text: '#e8ecf4',
        startFill: 'rgba(52, 211, 153, 0.08)',
        startStroke: '#34d399',
        acceptStroke: '#fbbf24',
        activeFill: 'rgba(34, 211, 238, 0.15)',
        activeStroke: '#22d3ee',
        activeGlow: 'rgba(34, 211, 238, 0.5)',
      },
      transition: {
        line: '#3b5580',
        text: '#8899b4',
        textBg: 'rgba(11, 16, 34, 0.85)',
        active: '#22d3ee',
        activeGlow: 'rgba(34, 211, 238, 0.4)',
      },
      startArrow: '#34d399',
    };

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  /**
   * Resize canvas to match its CSS dimensions at native resolution.
   */
  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /**
   * Main render loop — call this every frame.
   */
  render(timestamp = 0) {
    const dt = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    this.animationPhase += dt * 0.003;

    const ctx = this.ctx;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw grid dots
    this._drawGrid(w, h);

    // Draw transitions
    this._drawTransitions();

    // Draw in-progress transition line (when user is adding a transition)
    this._drawPendingTransition();

    // Draw states
    this._drawStates();
  }

  /* ---------- Grid ---------- */
  _drawGrid(w, h) {
    const ctx = this.ctx;
    const spacing = 30;
    ctx.fillStyle = this.colors.grid;
    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---------- States ---------- */
  _drawStates() {
    const ctx = this.ctx;
    for (const [, state] of this.automaton.states) {
      const isActive = this.activeStates.has(state.id);
      const r = this.stateRadius;

      ctx.save();

      // Active glow
      if (isActive) {
        const glowIntensity = 0.5 + Math.sin(this.animationPhase * 2) * 0.3;
        ctx.shadowColor = this.colors.state.activeGlow;
        ctx.shadowBlur = 20 + glowIntensity * 15;
      }

      // Fill
      ctx.beginPath();
      ctx.arc(state.x, state.y, r, 0, Math.PI * 2);
      if (isActive) {
        ctx.fillStyle = this.colors.state.activeFill;
      } else if (state.isStart) {
        ctx.fillStyle = this.colors.state.startFill;
      } else {
        ctx.fillStyle = this.colors.state.fill;
      }
      ctx.fill();

      // Stroke
      ctx.lineWidth = 2.5;
      if (isActive) {
        ctx.strokeStyle = this.colors.state.activeStroke;
      } else if (state.isStart) {
        ctx.strokeStyle = this.colors.state.startStroke;
      } else {
        ctx.strokeStyle = this.colors.state.stroke;
      }
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Accept state: double circle
      if (state.isAccept) {
        ctx.beginPath();
        ctx.arc(state.x, state.y, r - 5, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.colors.state.acceptStroke;
        ctx.stroke();
      }

      // Start state arrow
      if (state.isStart) {
        this._drawStartArrow(state);
      }

      // Label
      ctx.fillStyle = isActive ? this.colors.state.activeStroke : this.colors.state.text;
      ctx.font = `600 ${r > 25 ? 14 : 12}px 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.name, state.x, state.y);

      ctx.restore();
    }
  }

  /**
   * Draw the incoming arrow indicating a start state.
   */
  _drawStartArrow(state) {
    const ctx = this.ctx;
    const r = this.stateRadius;
    const startX = state.x - r - 40;
    const startY = state.y;
    const endX = state.x - r - 2;
    const endY = state.y;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = this.colors.startArrow;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Arrow head
    this._drawArrowHead(endX, endY, 0, this.colors.startArrow, 9);
  }

  /* ---------- Transitions ---------- */
  _drawTransitions() {
    const groups = this.automaton.getTransitionGroups();

    for (const [key, transitions] of groups) {
      const [from, to] = key.split('->');
      const isActive = transitions.some(t => this.activeTransitions.has(t.id));
      const label = transitions.map(t => t.symbol).join(', ');

      if (from === to) {
        this._drawSelfLoop(from, label, isActive);
      } else {
        const hasReverse = this.automaton.hasReverseTransition(from, to);
        this._drawTransitionArrow(from, to, label, isActive, hasReverse);
      }
    }
  }

  /**
   * Draw a curved arrow between two states.
   */
  _drawTransitionArrow(fromId, toId, label, isActive, curve = false) {
    const ctx = this.ctx;
    const from = this.automaton.states.get(fromId);
    const to = this.automaton.states.get(toId);
    if (!from || !to) return;

    const r = this.stateRadius;

    // Direction vector
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // Curvature offset for bidirectional transitions
    const curveOffset = curve ? 18 : 0;
    const perpX = -ny * curveOffset;
    const perpY = nx * curveOffset;

    // Control point for bezier
    const cpx = (from.x + to.x) / 2 + perpX;
    const cpy = (from.y + to.y) / 2 + perpY;

    // Calculate start and end points (on circle edge)
    // For curved paths, adjust the exit/entry angle
    const angleOut = Math.atan2(cpy - from.y, cpx - from.x);
    const angleIn = Math.atan2(cpy - to.y, cpx - to.x);

    const startX = from.x + Math.cos(angleOut) * (r + 1);
    const startY = from.y + Math.sin(angleOut) * (r + 1);
    const endX = to.x + Math.cos(angleIn) * (r + 1);
    const endY = to.y + Math.sin(angleIn) * (r + 1);

    ctx.save();

    // Glow for active
    if (isActive) {
      ctx.shadowColor = this.colors.transition.activeGlow;
      ctx.shadowBlur = 12;
    }

    // Draw curve
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpx, cpy, endX, endY);
    ctx.strokeStyle = isActive ? this.colors.transition.active : this.colors.transition.line;
    ctx.lineWidth = isActive ? 2.5 : 1.8;

    if (isActive) {
      // Animated dash
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -this.animationPhase * 15;
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Arrow head at end
    const arrowAngle = Math.atan2(endY - cpy, endX - cpx);
    this._drawArrowHead(
      endX, endY, arrowAngle,
      isActive ? this.colors.transition.active : this.colors.transition.line,
      this.arrowSize
    );

    // Label
    // Position label at midpoint of the quadratic curve
    const labelX = 0.25 * startX + 0.5 * cpx + 0.25 * endX;
    const labelY = 0.25 * startY + 0.5 * cpy + 0.25 * endY;
    this._drawTransitionLabel(labelX, labelY, label, isActive);

    ctx.restore();
  }

  /**
   * Draw a self-loop on a state.
   */
  _drawSelfLoop(stateId, label, isActive) {
    const ctx = this.ctx;
    const state = this.automaton.states.get(stateId);
    if (!state) return;

    const r = this.stateRadius;
    const loopRadius = 22;
    const loopY = state.y - r - loopRadius - 4;

    ctx.save();

    if (isActive) {
      ctx.shadowColor = this.colors.transition.activeGlow;
      ctx.shadowBlur = 12;
    }

    // Draw loop — counterclockwise from bottom-right to bottom-left (the long way around)
    ctx.beginPath();
    ctx.arc(state.x, loopY, loopRadius, 0.3 * Math.PI, 0.7 * Math.PI, true);
    ctx.strokeStyle = isActive ? this.colors.transition.active : this.colors.transition.line;
    ctx.lineWidth = isActive ? 2.5 : 1.8;

    if (isActive) {
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -this.animationPhase * 15;
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Arrow head at end of arc (bottom-left, 0.7π), tangent points down-right into state
    const arrowAngle = 0.2 * Math.PI;
    const ax = state.x + Math.cos(0.7 * Math.PI) * loopRadius;
    const ay = loopY + Math.sin(0.7 * Math.PI) * loopRadius;
    this._drawArrowHead(
      ax, ay, arrowAngle,
      isActive ? this.colors.transition.active : this.colors.transition.line,
      8
    );

    // Label above loop
    this._drawTransitionLabel(state.x, loopY - loopRadius - 8, label, isActive);

    ctx.restore();
  }

  /**
   * Draw an arrow head at a position with a given angle.
   */
  _drawArrowHead(x, y, angle, color, size) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.45);
    ctx.lineTo(-size, size * 0.45);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw a label for a transition with a background pill.
   */
  _drawTransitionLabel(x, y, text, isActive) {
    const ctx = this.ctx;
    ctx.font = `500 12px 'JetBrains Mono', monospace`;
    const metrics = ctx.measureText(text);
    const pw = metrics.width + 12;
    const ph = 20;

    // Background pill
    ctx.fillStyle = this.colors.transition.textBg;
    ctx.beginPath();
    ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 4);
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = this.colors.transition.active;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Text
    ctx.fillStyle = isActive ? this.colors.transition.active : this.colors.transition.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  /**
   * Draw the in-progress transition (line from source state to mouse).
   */
  _drawPendingTransition() {
    if (!this.transitionSource) return;
    const ctx = this.ctx;
    const from = this.automaton.states.get(this.transitionSource);
    if (!from) return;

    const r = this.stateRadius;
    const dx = this.mousePos.x - from.x;
    const dy = this.mousePos.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < r) return;

    const angle = Math.atan2(dy, dx);
    const startX = from.x + Math.cos(angle) * (r + 1);
    const startY = from.y + Math.sin(angle) * (r + 1);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(this.mousePos.x, this.mousePos.y);
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = -this.animationPhase * 10;
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head
    this._drawArrowHead(
      this.mousePos.x, this.mousePos.y, angle,
      'rgba(74, 158, 255, 0.5)', 9
    );

    ctx.restore();
  }

  /* ---------- Hit Testing ---------- */

  /**
   * Find which state (if any) is at canvas coordinates (x, y).
   */
  hitTestState(x, y) {
    for (const [, state] of this.automaton.states) {
      const dx = x - state.x;
      const dy = y - state.y;
      if (dx * dx + dy * dy <= this.stateRadius * this.stateRadius) {
        return state.id;
      }
    }
    return null;
  }

  /**
   * Find which transition (if any) is near canvas coordinates (x, y).
   * Returns the transition id or null.
   */
  hitTestTransition(x, y) {
    const threshold = 10;

    for (const t of this.automaton.transitions) {
      const from = this.automaton.states.get(t.from);
      const to = this.automaton.states.get(t.to);
      if (!from || !to) continue;

      if (t.from === t.to) {
        // Self-loop — check distance to loop arc center
        const loopY = from.y - this.stateRadius - 22 - 4;
        const dx = x - from.x;
        const dy = y - loopY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - 22) < threshold) return t.id;
      } else {
        // Line segment distance
        const dist = this._pointToSegmentDist(x, y, from.x, from.y, to.x, to.y);
        if (dist < threshold) return t.id;
      }
    }
    return null;
  }

  _pointToSegmentDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  /**
   * Convert mouse event coordinates to canvas coordinates.
   */
  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }
}

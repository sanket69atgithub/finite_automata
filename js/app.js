/**
 * Main Application Controller
 * Connects the Automaton model, Renderer, and Simulator.
 * Manages UI interactions, tool modes, and keyboard shortcuts.
 */
import { Automaton } from './automaton.js';
import { Renderer } from './renderer.js';
import { Simulator } from './simulator.js';
import { EXAMPLES } from './examples.js';

class App {
  constructor() {
    // Core modules
    this.automaton = new Automaton('DFA');
    this.canvas = document.getElementById('automaton-canvas');
    this.renderer = new Renderer(this.canvas, this.automaton);
    this.simulator = new Simulator(this.automaton);

    // UI state
    this.currentTool = 'select';     // 'select' | 'add-state' | 'add-transition' | 'delete'
    this.selectedStateId = null;
    this.transitionFromId = null;     // Source state when adding transition
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.simAutoPlayInterval = null;

    // DOM elements
    this.els = {
      canvasContainer: document.getElementById('canvas-container'),
      canvasHint: document.getElementById('canvas-hint'),
      modeToggle: document.getElementById('mode-toggle'),
      // Tools
      toolBtns: document.querySelectorAll('.tool-btn'),
      // State properties
      stateProps: document.getElementById('state-properties'),
      stateNameInput: document.getElementById('state-name-input'),
      stateStartCheck: document.getElementById('state-start-check'),
      stateAcceptCheck: document.getElementById('state-accept-check'),
      // Simulation
      inputString: document.getElementById('input-string'),
      btnSimulate: document.getElementById('btn-simulate'),
      btnStep: document.getElementById('btn-step'),
      btnReset: document.getElementById('btn-reset'),
      simStepDisplay: document.getElementById('sim-step-display'),
      simCurrentDisplay: document.getElementById('sim-current-display'),
      // Result
      resultOverlay: document.getElementById('result-overlay'),
      resultCard: document.getElementById('result-card'),
      resultIcon: document.getElementById('result-icon'),
      resultText: document.getElementById('result-text'),
      resultDetails: document.getElementById('result-details'),
      btnCloseResult: document.getElementById('btn-close-result'),
      // Examples
      exampleSelect: document.getElementById('example-select'),
      btnLoadExample: document.getElementById('btn-load-example'),
      // Actions
      btnClear: document.getElementById('btn-clear'),
      btnSave: document.getElementById('btn-save'),
      btnLoad: document.getElementById('btn-load'),
      fileInput: document.getElementById('file-input'),
      // Transition dialog
      transitionDialog: document.getElementById('transition-dialog'),
      transitionInfo: document.getElementById('transition-info'),
      transitionSymbolInput: document.getElementById('transition-symbol-input'),
      epsilonHint: document.getElementById('epsilon-hint'),
      btnConfirmTransition: document.getElementById('btn-confirm-transition'),
      btnCancelTransition: document.getElementById('btn-cancel-transition'),
      btnCloseTransition: document.getElementById('btn-close-transition'),
      // Help
      btnHelp: document.getElementById('btn-help'),
      helpModal: document.getElementById('help-modal'),
      btnCloseHelp: document.getElementById('btn-close-help'),
      // Toast
      toastContainer: document.getElementById('toast-container'),
    };

    this._bindEvents();
    this._startRenderLoop();
    this._updateCanvasHint();
  }

  /* ============================================================
     EVENT BINDING
     ============================================================ */
  _bindEvents() {
    // ---- Mode toggle (DFA/NFA) ----
    this.els.modeToggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this._setMode(mode);
      });
    });

    // ---- Tool buttons ----
    this.els.toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this._setTool(btn.dataset.tool);
      });
    });

    // ---- Canvas mouse events ----
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this._onMouseLeave());
    // Prevent right-click context menu on canvas
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // ---- State properties ----
    this.els.stateNameInput.addEventListener('input', () => {
      if (this.selectedStateId) {
        this.automaton.renameState(this.selectedStateId, this.els.stateNameInput.value);
      }
    });

    this.els.stateStartCheck.addEventListener('change', () => {
      if (this.selectedStateId && this.els.stateStartCheck.checked) {
        this.automaton.setStartState(this.selectedStateId);
      }
    });

    this.els.stateAcceptCheck.addEventListener('change', () => {
      if (this.selectedStateId) {
        this.automaton.toggleAcceptState(this.selectedStateId);
      }
    });

    // ---- Simulation buttons ----
    this.els.btnSimulate.addEventListener('click', () => this._runSimulation());
    this.els.btnStep.addEventListener('click', () => this._stepSimulation());
    this.els.btnReset.addEventListener('click', () => this._resetSimulation());
    this.els.btnCloseResult.addEventListener('click', () => {
      this.els.resultOverlay.style.display = 'none';
    });

    // ---- Examples ----
    this.els.btnLoadExample.addEventListener('click', () => this._loadExample());

    // ---- Actions ----
    this.els.btnClear.addEventListener('click', () => this._clearAll());
    this.els.btnSave.addEventListener('click', () => this._saveAutomaton());
    this.els.btnLoad.addEventListener('click', () => this.els.fileInput.click());
    this.els.fileInput.addEventListener('change', (e) => this._loadAutomaton(e));

    // ---- Transition dialog ----
    this.els.btnConfirmTransition.addEventListener('click', () => this._confirmTransition());
    this.els.btnCancelTransition.addEventListener('click', () => this._cancelTransition());
    this.els.btnCloseTransition.addEventListener('click', () => this._cancelTransition());
    this.els.transitionSymbolInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._confirmTransition();
      if (e.key === 'Escape') this._cancelTransition();
    });

    // ---- Help ----
    this.els.btnHelp.addEventListener('click', () => {
      this.els.helpModal.style.display = 'flex';
    });
    this.els.btnCloseHelp.addEventListener('click', () => {
      this.els.helpModal.style.display = 'none';
    });
    this.els.helpModal.addEventListener('click', (e) => {
      if (e.target === this.els.helpModal) this.els.helpModal.style.display = 'none';
    });

    // ---- Keyboard shortcuts ----
    document.addEventListener('keydown', (e) => this._onKeyDown(e));

    // Allow Enter key on input to start simulation
    this.els.inputString.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._runSimulation();
    });
  }

  /* ============================================================
     RENDER LOOP
     ============================================================ */
  _startRenderLoop() {
    const loop = (timestamp) => {
      this.renderer.render(timestamp);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ============================================================
     MODE (DFA / NFA)
     ============================================================ */
  _setMode(mode) {
    this.automaton.type = mode;
    this.els.modeToggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    // Show epsilon hint in NFA mode
    this.els.epsilonHint.style.display = mode === 'NFA' ? 'block' : 'none';
    this._resetSimulation();
  }

  /* ============================================================
     TOOL SELECTION
     ============================================================ */
  _setTool(tool) {
    this.currentTool = tool;
    this.els.toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    this.els.canvasContainer.setAttribute('data-tool', tool);

    // Cancel any pending transition
    this.transitionFromId = null;
    this.renderer.transitionSource = null;

    if (tool !== 'select') {
      this._deselectState();
    }
  }

  /* ============================================================
     CANVAS MOUSE EVENTS
     ============================================================ */
  _onMouseDown(e) {
    if (e.button !== 0) return; // Left click only
    const pos = this.renderer.getCanvasPos(e);
    const hitState = this.renderer.hitTestState(pos.x, pos.y);

    switch (this.currentTool) {
      case 'select':
        if (hitState) {
          this._selectState(hitState);
          // Start dragging
          const state = this.automaton.states.get(hitState);
          this.isDragging = true;
          this.dragOffset = { x: pos.x - state.x, y: pos.y - state.y };
          this.els.canvasContainer.classList.add('dragging');
        } else {
          this._deselectState();
        }
        break;

      case 'add-state':
        if (!hitState) {
          const id = this.automaton.addState(pos.x, pos.y);
          this._selectState(id);
          this._setTool('select');
          this._updateCanvasHint();
          this._toast('State added', 'success');
        }
        break;

      case 'add-transition':
        if (hitState) {
          if (!this.transitionFromId) {
            // First click — select source
            this.transitionFromId = hitState;
            this.renderer.transitionSource = hitState;
            this._toast(`Source: ${this.automaton.states.get(hitState).name} — now click target`, 'info');
          } else {
            // Second click — select target, show dialog
            this._showTransitionDialog(this.transitionFromId, hitState);
          }
        }
        break;

      case 'delete':
        if (hitState) {
          this.automaton.removeState(hitState);
          if (this.selectedStateId === hitState) this._deselectState();
          this._updateCanvasHint();
          this._toast('State deleted', 'success');
        } else {
          const hitTrans = this.renderer.hitTestTransition(pos.x, pos.y);
          if (hitTrans) {
            this.automaton.removeTransition(hitTrans);
            this._toast('Transition deleted', 'success');
          }
        }
        break;
    }
  }

  _onMouseMove(e) {
    const pos = this.renderer.getCanvasPos(e);
    this.renderer.mousePos = pos;

    if (this.isDragging && this.selectedStateId) {
      const state = this.automaton.states.get(this.selectedStateId);
      if (state) {
        state.x = pos.x - this.dragOffset.x;
        state.y = pos.y - this.dragOffset.y;
      }
    }
  }

  _onMouseUp(e) {
    this.isDragging = false;
    this.els.canvasContainer.classList.remove('dragging');
  }

  _onMouseLeave() {
    this.isDragging = false;
    this.els.canvasContainer.classList.remove('dragging');
  }

  /* ============================================================
     STATE SELECTION & PROPERTIES
     ============================================================ */
  _selectState(id) {
    this.selectedStateId = id;
    const state = this.automaton.states.get(id);
    if (!state) return;

    this.els.stateProps.style.display = 'block';
    this.els.stateNameInput.value = state.name;
    this.els.stateStartCheck.checked = state.isStart;
    this.els.stateAcceptCheck.checked = state.isAccept;
  }

  _deselectState() {
    this.selectedStateId = null;
    this.els.stateProps.style.display = 'none';
  }

  /* ============================================================
     TRANSITION DIALOG
     ============================================================ */
  _showTransitionDialog(fromId, toId) {
    const fromState = this.automaton.states.get(fromId);
    const toState = this.automaton.states.get(toId);
    this.els.transitionInfo.textContent = `${fromState.name} → ${toState.name}`;
    this.els.transitionSymbolInput.value = '';
    this.els.transitionDialog.style.display = 'flex';
    this.els.transitionSymbolInput.focus();

    // Store the pending transition target
    this._pendingTransitionTo = toId;
  }

  _confirmTransition() {
    let symbol = this.els.transitionSymbolInput.value.trim();
    if (!symbol) {
      this._toast('Please enter a symbol', 'error');
      return;
    }

    // Convert 'e', 'eps', 'epsilon' to ε in NFA mode
    if (this.automaton.type === 'NFA' &&
        (symbol === 'e' || symbol === 'eps' || symbol === 'epsilon')) {
      symbol = 'ε';
    }

    const fromId = this.transitionFromId;
    const toId = this._pendingTransitionTo;

    const success = this.automaton.addTransition(fromId, toId, symbol);
    if (success) {
      this._toast(`Transition added: ${symbol}`, 'success');
    } else {
      if (this.automaton.type === 'DFA') {
        this._toast('DFA: transition on this symbol already exists from this state', 'error');
      } else {
        this._toast('This exact transition already exists', 'error');
      }
    }

    this._cancelTransition();
  }

  _cancelTransition() {
    this.els.transitionDialog.style.display = 'none';
    this.transitionFromId = null;
    this._pendingTransitionTo = null;
    this.renderer.transitionSource = null;
  }

  /* ============================================================
     SIMULATION
     ============================================================ */
  _runSimulation() {
    const input = this.els.inputString.value;
    this._resetSimulation();

    if (!this.simulator.init(input)) {
      this._toast('Add states and set a start state first', 'error');
      return;
    }

    // Update renderer highlights for initial state
    this.renderer.activeStates = new Set(this.simulator.activeStateIds);
    this.renderer.activeTransitions = new Set();
    this._updateSimStatus();

    // If input is empty, show result immediately
    if (input.length === 0) {
      this._showResult();
      return;
    }

    // Auto-play with animation delay
    let stepIndex = 0;
    const totalSteps = input.length;
    const delay = Math.max(400, Math.min(1200, 3000 / totalSteps)); // Adaptive speed

    this.simAutoPlayInterval = setInterval(() => {
      const stepData = this.simulator.step();
      if (stepData) {
        this.renderer.activeStates = stepData.activeStates;
        this.renderer.activeTransitions = stepData.activeTransitions;
        this._updateSimStatus();

        // Clear transition highlights after a brief moment
        setTimeout(() => {
          this.renderer.activeTransitions = new Set();
        }, delay * 0.6);
      }

      if (this.simulator.isFinished) {
        clearInterval(this.simAutoPlayInterval);
        this.simAutoPlayInterval = null;
        setTimeout(() => this._showResult(), delay);
      }
    }, delay);
  }

  _stepSimulation() {
    // Initialize if not yet started
    if (!this.simulator.isRunning) {
      const input = this.els.inputString.value;
      if (!this.simulator.init(input)) {
        this._toast('Add states and set a start state first', 'error');
        return;
      }
      this.renderer.activeStates = new Set(this.simulator.activeStateIds);
      this.renderer.activeTransitions = new Set();
      this._updateSimStatus();

      if (input.length === 0) {
        this._showResult();
      }
      return;
    }

    if (this.simulator.isFinished) {
      this._showResult();
      return;
    }

    // Advance one step
    const stepData = this.simulator.step();
    if (stepData) {
      this.renderer.activeStates = stepData.activeStates;
      this.renderer.activeTransitions = stepData.activeTransitions;
      this._updateSimStatus();

      // Clear transition highlights after a moment
      setTimeout(() => {
        this.renderer.activeTransitions = new Set();
      }, 500);
    }

    if (this.simulator.isFinished) {
      setTimeout(() => this._showResult(), 600);
    }
  }

  _resetSimulation() {
    if (this.simAutoPlayInterval) {
      clearInterval(this.simAutoPlayInterval);
      this.simAutoPlayInterval = null;
    }
    this.simulator.reset();
    this.renderer.activeStates = new Set();
    this.renderer.activeTransitions = new Set();
    this.els.simStepDisplay.textContent = '';
    this.els.simCurrentDisplay.textContent = '';
    this.els.simCurrentDisplay.className = 'sim-current';
  }

  _updateSimStatus() {
    const status = this.simulator.getStatus();
    this.els.simStepDisplay.textContent = `Step ${status.step} / ${status.totalSteps}`;
    this.els.simCurrentDisplay.textContent = `States: { ${status.activeStates} }`;
  }

  _showResult() {
    const result = this.simulator.result;
    const isAccepted = result === 'ACCEPTED';

    // Show result inline in the sim bar (no blocking overlay)
    const statusEl = this.els.simCurrentDisplay;
    const icon = isAccepted ? '✓' : '✗';
    statusEl.textContent = `${icon} ${result}  —  Input: "${this.simulator.inputString}"`;
    statusEl.className = `sim-current sim-result-${isAccepted ? 'accepted' : 'rejected'}`;

    // Also show a toast
    this._toast(
      `${icon} String "${this.simulator.inputString}" is ${result}`,
      isAccepted ? 'success' : 'error'
    );
  }

  /* ============================================================
     EXAMPLES
     ============================================================ */
  _loadExample() {
    const key = this.els.exampleSelect.value;
    if (!key || !EXAMPLES[key]) {
      this._toast('Select an example first', 'error');
      return;
    }

    const example = EXAMPLES[key];
    this.automaton = Automaton.deserialize(example.automaton);
    this.renderer.automaton = this.automaton;
    this.simulator = new Simulator(this.automaton);

    // Set mode toggle
    this._setMode(this.automaton.type);

    // Set sample input
    if (example.sampleInputs && example.sampleInputs.length > 0) {
      this.els.inputString.value = example.sampleInputs[0];
    }

    this._resetSimulation();
    this._deselectState();
    this._updateCanvasHint();
    this._toast(`Loaded: ${example.name}`, 'success');
  }

  /* ============================================================
     SAVE / LOAD
     ============================================================ */
  _saveAutomaton() {
    const data = this.automaton.serialize();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automaton-${this.automaton.type.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this._toast('Automaton saved', 'success');
  }

  _loadAutomaton(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        this.automaton = Automaton.deserialize(data);
        this.renderer.automaton = this.automaton;
        this.simulator = new Simulator(this.automaton);
        this._setMode(this.automaton.type);
        this._resetSimulation();
        this._deselectState();
        this._updateCanvasHint();
        this._toast('Automaton loaded', 'success');
      } catch (err) {
        this._toast('Invalid automaton file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  }

  /* ============================================================
     CLEAR ALL
     ============================================================ */
  _clearAll() {
    this.automaton.clear();
    this._resetSimulation();
    this._deselectState();
    this._updateCanvasHint();
    this._toast('Canvas cleared', 'success');
  }

  /* ============================================================
     CANVAS HINT
     ============================================================ */
  _updateCanvasHint() {
    this.els.canvasHint.style.display = this.automaton.states.size === 0 ? 'flex' : 'none';
  }

  /* ============================================================
     KEYBOARD SHORTCUTS
     ============================================================ */
  _onKeyDown(e) {
    // Don't capture when focused on input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'v':
        this._setTool('select');
        break;
      case 's':
        this._setTool('add-state');
        break;
      case 't':
        this._setTool('add-transition');
        break;
      case 'd':
        this._setTool('delete');
        break;
      case 'delete':
      case 'backspace':
        if (this.selectedStateId) {
          this.automaton.removeState(this.selectedStateId);
          this._deselectState();
          this._updateCanvasHint();
          this._toast('State deleted', 'success');
        }
        break;
      case 'escape':
        this._deselectState();
        this.transitionFromId = null;
        this.renderer.transitionSource = null;
        this.els.transitionDialog.style.display = 'none';
        this.els.helpModal.style.display = 'none';
        this.els.resultOverlay.style.display = 'none';
        break;
    }
  }

  /* ============================================================
     TOAST NOTIFICATIONS
     ============================================================ */
  _toast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✓',
      error: '✗',
      info: 'ℹ',
    };

    toast.innerHTML = `<span style="font-weight:700">${icons[type] || ''}</span> ${message}`;
    this.els.toastContainer.appendChild(toast);

    // Remove after animation
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// ---- Initialize the app ----
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

/**
 * Simulator Engine
 * Handles step-by-step and full simulation for both DFA and NFA.
 * Tracks simulation state including current states, consumed input, and result.
 */
export class Simulator {
  constructor(automaton) {
    this.automaton = automaton;
    this.reset();
  }

  /**
   * Reset the simulator to its initial state.
   */
  reset() {
    this.inputString = '';
    this.currentStep = 0;
    this.isRunning = false;
    this.isFinished = false;
    this.result = null;        // 'ACCEPTED' | 'REJECTED' | null
    this.activeStateIds = new Set();
    this.activeTransitionIds = new Set();
    this.history = [];         // Array of step snapshots for review
  }

  /**
   * Initialize simulation with a given input string.
   * Returns false if automaton is not ready (no start state, etc.).
   */
  init(inputString) {
    this.reset();
    this.inputString = inputString;

    const startState = this.automaton.getStartState();
    if (!startState) return false;
    if (this.automaton.states.size === 0) return false;

    if (this.automaton.type === 'NFA') {
      // NFA: start with epsilon closure of start state
      this.activeStateIds = this.automaton.epsilonClosure([startState]);
    } else {
      // DFA: start with just the start state
      this.activeStateIds = new Set([startState]);
    }

    this.activeTransitionIds = new Set();
    this.isRunning = true;
    this.isFinished = false;

    // Save initial snapshot
    this.history.push({
      step: 0,
      activeStates: new Set(this.activeStateIds),
      activeTransitions: new Set(),
      consumed: '',
      remaining: this.inputString,
    });

    // Check if input is empty — finish immediately
    if (this.inputString.length === 0) {
      this._checkResult();
    }

    return true;
  }

  /**
   * Execute one step of the simulation (consume one input symbol).
   * Returns the step data or null if finished.
   */
  step() {
    if (!this.isRunning || this.isFinished) return null;
    if (this.currentStep >= this.inputString.length) {
      this._checkResult();
      return null;
    }

    const symbol = this.inputString[this.currentStep];
    const newStates = new Set();
    const usedTransitions = new Set();

    if (this.automaton.type === 'DFA') {
      // === DFA Simulation ===
      // There should be exactly one active state in DFA
      const currentState = [...this.activeStateIds][0];
      if (!currentState) {
        // Dead state — no active state means rejection
        this.isFinished = true;
        this.result = 'REJECTED';
        return this._makeStepData(symbol, newStates, usedTransitions);
      }

      const transitions = this.automaton.getTransitionsFrom(currentState, symbol);
      if (transitions.length === 0) {
        // No transition — string rejected (dead state)
        this.activeStateIds = new Set();
        this.currentStep++;
        this.isFinished = true;
        this.result = 'REJECTED';
        return this._makeStepData(symbol, newStates, usedTransitions);
      }

      // DFA: exactly one transition
      const t = transitions[0];
      newStates.add(t.to);
      usedTransitions.add(t.id);

    } else {
      // === NFA Simulation ===
      // For each active state, find all transitions on the current symbol
      for (const stateId of this.activeStateIds) {
        const transitions = this.automaton.getTransitionsFrom(stateId, symbol);
        for (const t of transitions) {
          newStates.add(t.to);
          usedTransitions.add(t.id);
        }
      }

      // Compute epsilon closure of all new states
      if (newStates.size > 0) {
        const closure = this.automaton.epsilonClosure([...newStates]);
        // Add epsilon transition ids
        for (const sid of newStates) {
          const epsTransitions = this.automaton.transitions.filter(
            t => t.from === sid && t.symbol === 'ε' && closure.has(t.to)
          );
          for (const t of epsTransitions) {
            usedTransitions.add(t.id);
          }
        }
        for (const s of closure) newStates.add(s);
      }
    }

    this.activeStateIds = newStates;
    this.activeTransitionIds = usedTransitions;
    this.currentStep++;

    // Save snapshot
    const stepData = this._makeStepData(symbol, newStates, usedTransitions);
    this.history.push(stepData);

    // Check if we've consumed all input
    if (this.currentStep >= this.inputString.length) {
      this._checkResult();
    }

    return stepData;
  }

  /**
   * Run full simulation automatically.
   * Returns an array of all step data.
   */
  runAll() {
    const steps = [];
    while (!this.isFinished && this.currentStep < this.inputString.length) {
      const stepData = this.step();
      if (stepData) steps.push(stepData);
    }
    return steps;
  }

  /**
   * Check whether the automaton accepts — any active state is an accept state.
   */
  _checkResult() {
    this.isFinished = true;

    for (const stateId of this.activeStateIds) {
      const state = this.automaton.states.get(stateId);
      if (state && state.isAccept) {
        this.result = 'ACCEPTED';
        return;
      }
    }

    this.result = 'REJECTED';
  }

  /**
   * Create step data object.
   */
  _makeStepData(symbol, activeStates, activeTransitions) {
    return {
      step: this.currentStep,
      symbol,
      activeStates: new Set(activeStates),
      activeTransitions: new Set(activeTransitions),
      consumed: this.inputString.substring(0, this.currentStep),
      remaining: this.inputString.substring(this.currentStep),
    };
  }

  /**
   * Get a summary of the current simulation state.
   */
  getStatus() {
    const stateNames = [...this.activeStateIds]
      .map(id => {
        const s = this.automaton.states.get(id);
        return s ? s.name : id;
      })
      .join(', ');

    return {
      step: this.currentStep,
      totalSteps: this.inputString.length,
      activeStates: stateNames || '∅',
      consumed: this.inputString.substring(0, this.currentStep),
      remaining: this.inputString.substring(this.currentStep),
      isFinished: this.isFinished,
      result: this.result,
    };
  }
}

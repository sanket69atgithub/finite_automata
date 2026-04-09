/**
 * Automaton Data Model
 * Manages states, transitions, and core automaton operations for DFA/NFA.
 */
export class Automaton {
  constructor(type = 'DFA') {
    this.type = type;           // 'DFA' or 'NFA'
    this.states = new Map();    // id -> { id, name, x, y, isStart, isAccept }
    this.transitions = [];      // [{ from, to, symbol, id }]
    this.nextStateId = 0;
    this.nextTransitionId = 0;
  }

  /**
   * Add a new state at canvas coordinates (x, y).
   * Returns the new state's id.
   */
  addState(x, y) {
    const id = `q${this.nextStateId}`;
    this.states.set(id, {
      id,
      name: `q${this.nextStateId}`,
      x, y,
      isStart: this.states.size === 0, // First state defaults to start
      isAccept: false,
    });
    this.nextStateId++;
    return id;
  }

  /**
   * Remove a state and all its connected transitions.
   */
  removeState(id) {
    if (!this.states.has(id)) return;
    const wasStart = this.states.get(id).isStart;
    this.states.delete(id);
    this.transitions = this.transitions.filter(t => t.from !== id && t.to !== id);
    // If deleted state was start and other states exist, make first state the start
    if (wasStart && this.states.size > 0) {
      const first = this.states.values().next().value;
      first.isStart = true;
    }
  }

  /**
   * Add a transition. Returns true on success, false if invalid (e.g., DFA duplicate).
   */
  addTransition(from, to, symbol) {
    if (!this.states.has(from) || !this.states.has(to)) return false;

    // For DFA, disallow epsilon and duplicate (from, symbol) transitions
    if (this.type === 'DFA') {
      if (symbol === 'ε') return false;
      const dup = this.transitions.find(t => t.from === from && t.symbol === symbol);
      if (dup) return false;
    }

    // Don't allow exact duplicate transitions
    const exactDup = this.transitions.find(
      t => t.from === from && t.to === to && t.symbol === symbol
    );
    if (exactDup) return false;

    this.transitions.push({
      id: `t${this.nextTransitionId++}`,
      from, to, symbol
    });
    return true;
  }

  /**
   * Remove a transition by its id.
   */
  removeTransition(transId) {
    this.transitions = this.transitions.filter(t => t.id !== transId);
  }

  /**
   * Set a single state as the start state (DFA & NFA both have one start).
   */
  setStartState(id) {
    for (const [, state] of this.states) {
      state.isStart = (state.id === id);
    }
  }

  /**
   * Toggle accept status of a state.
   */
  toggleAcceptState(id) {
    const state = this.states.get(id);
    if (state) state.isAccept = !state.isAccept;
  }

  /**
   * Get the start state id, or null if none.
   */
  getStartState() {
    for (const [, state] of this.states) {
      if (state.isStart) return state.id;
    }
    return null;
  }

  /**
   * Get all transitions from a state on a given symbol.
   */
  getTransitionsFrom(stateId, symbol) {
    return this.transitions.filter(t => t.from === stateId && t.symbol === symbol);
  }

  /**
   * Get the alphabet (all non-epsilon symbols used in transitions).
   */
  getAlphabet() {
    const symbols = new Set();
    for (const t of this.transitions) {
      if (t.symbol !== 'ε') symbols.add(t.symbol);
    }
    return [...symbols].sort();
  }

  /**
   * Compute epsilon closure for a set of state ids.
   * Returns a Set of all reachable state ids via epsilon transitions.
   */
  epsilonClosure(stateIds) {
    const closure = new Set(stateIds);
    const stack = [...stateIds];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const t of this.transitions) {
        if (t.from === current && t.symbol === 'ε' && !closure.has(t.to)) {
          closure.add(t.to);
          stack.push(t.to);
        }
      }
    }
    return closure;
  }

  /**
   * Get grouped transitions: Map<"from->to", [transition]>
   * Used by renderer to combine multiple transitions on one arrow.
   */
  getTransitionGroups() {
    const groups = new Map();
    for (const t of this.transitions) {
      const key = `${t.from}->${t.to}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    }
    return groups;
  }

  /**
   * Check if there's a reverse transition group (to->from).
   */
  hasReverseTransition(from, to) {
    return this.transitions.some(t => t.from === to && t.to === from);
  }

  /**
   * Rename a state.
   */
  renameState(id, newName) {
    const state = this.states.get(id);
    if (state) state.name = newName;
  }

  /**
   * Serialize to plain object for saving.
   */
  serialize() {
    return {
      type: this.type,
      states: [...this.states.entries()].map(([id, s]) => ({ ...s })),
      transitions: this.transitions.map(t => ({ ...t })),
      nextStateId: this.nextStateId,
      nextTransitionId: this.nextTransitionId,
    };
  }

  /**
   * Deserialize from saved data.
   */
  static deserialize(data) {
    const a = new Automaton(data.type);
    a.states = new Map();
    for (const s of data.states) {
      a.states.set(s.id, { ...s });
    }
    a.transitions = data.transitions.map(t => ({ ...t }));
    a.nextStateId = data.nextStateId || 0;
    a.nextTransitionId = data.nextTransitionId || 0;
    return a;
  }

  /**
   * Clear all states and transitions.
   */
  clear() {
    this.states.clear();
    this.transitions = [];
    this.nextStateId = 0;
    this.nextTransitionId = 0;
  }
}

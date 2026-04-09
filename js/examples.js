/**
 * Pre-built Example Automata
 * Each example provides a complete automaton configuration for demonstration.
 */
export const EXAMPLES = {

  /**
   * DFA that accepts binary strings ending in "01"
   * Alphabet: {0, 1}
   */
  'dfa-ends-01': {
    name: 'DFA: Strings ending in "01"',
    description: 'Accepts binary strings that end with "01". Try: 101, 001, 1101, 11 (reject)',
    sampleInputs: ['101', '001', '1101', '11'],
    automaton: {
      type: 'DFA',
      states: [
        { id: 'q0', name: 'q0', x: 180, y: 250, isStart: true, isAccept: false },
        { id: 'q1', name: 'q1', x: 400, y: 250, isStart: false, isAccept: false },
        { id: 'q2', name: 'q2', x: 620, y: 250, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q0', symbol: '1' },
        { id: 't1', from: 'q0', to: 'q1', symbol: '0' },
        { id: 't2', from: 'q1', to: 'q1', symbol: '0' },
        { id: 't3', from: 'q1', to: 'q2', symbol: '1' },
        { id: 't4', from: 'q2', to: 'q1', symbol: '0' },
        { id: 't5', from: 'q2', to: 'q0', symbol: '1' },
      ],
      nextStateId: 3,
      nextTransitionId: 6,
    }
  },

  /**
   * DFA that accepts strings with an even number of 0s
   * Alphabet: {0, 1}
   */
  'dfa-even-zeros': {
    name: 'DFA: Even number of 0s',
    description: 'Accepts binary strings containing an even number of 0s (including zero 0s). Try: 11, 010, 0110, 000 (reject)',
    sampleInputs: ['11', '010', '0110', '000'],
    automaton: {
      type: 'DFA',
      states: [
        { id: 'q0', name: 'Even', x: 280, y: 250, isStart: true, isAccept: true },
        { id: 'q1', name: 'Odd', x: 520, y: 250, isStart: false, isAccept: false },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q0', symbol: '1' },
        { id: 't1', from: 'q0', to: 'q1', symbol: '0' },
        { id: 't2', from: 'q1', to: 'q1', symbol: '1' },
        { id: 't3', from: 'q1', to: 'q0', symbol: '0' },
      ],
      nextStateId: 2,
      nextTransitionId: 4,
    }
  },

  /**
   * DFA that accepts binary numbers divisible by 3
   * Alphabet: {0, 1}
   */
  'dfa-divisible-3': {
    name: 'DFA: Binary divisible by 3',
    description: 'Accepts binary numbers whose decimal value is divisible by 3. Try: 110 (6), 1001 (9), 101 (5, reject)',
    sampleInputs: ['110', '1001', '0', '101'],
    automaton: {
      type: 'DFA',
      states: [
        { id: 'q0', name: 'r0', x: 400, y: 140, isStart: true, isAccept: true },
        { id: 'q1', name: 'r1', x: 580, y: 340, isStart: false, isAccept: false },
        { id: 'q2', name: 'r2', x: 220, y: 340, isStart: false, isAccept: false },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q0', symbol: '0' },
        { id: 't1', from: 'q0', to: 'q1', symbol: '1' },
        { id: 't2', from: 'q1', to: 'q2', symbol: '0' },
        { id: 't3', from: 'q1', to: 'q0', symbol: '1' },
        { id: 't4', from: 'q2', to: 'q1', symbol: '0' },
        { id: 't5', from: 'q2', to: 'q2', symbol: '1' },
      ],
      nextStateId: 3,
      nextTransitionId: 6,
    }
  },

  /**
   * NFA that accepts strings containing "11" as a substring
   * Alphabet: {0, 1}
   */
  'nfa-contains-11': {
    name: 'NFA: Contains "11"',
    description: 'Accepts binary strings that contain "11" as a substring. Try: 011, 110, 0100 (reject)',
    sampleInputs: ['011', '110', '1100', '0100'],
    automaton: {
      type: 'NFA',
      states: [
        { id: 'q0', name: 'q0', x: 180, y: 250, isStart: true, isAccept: false },
        { id: 'q1', name: 'q1', x: 400, y: 250, isStart: false, isAccept: false },
        { id: 'q2', name: 'q2', x: 620, y: 250, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q0', symbol: '0' },
        { id: 't1', from: 'q0', to: 'q0', symbol: '1' },
        { id: 't2', from: 'q0', to: 'q1', symbol: '1' },
        { id: 't3', from: 'q1', to: 'q2', symbol: '1' },
        { id: 't4', from: 'q2', to: 'q2', symbol: '0' },
        { id: 't5', from: 'q2', to: 'q2', symbol: '1' },
      ],
      nextStateId: 3,
      nextTransitionId: 6,
    }
  },

  /**
   * NFA that accepts strings ending with "ab"
   * Alphabet: {a, b}
   */
  'nfa-ends-ab': {
    name: 'NFA: Ends with "ab"',
    description: 'Accepts strings over {a,b} that end with "ab". Try: aab, bab, abab, ba (reject)',
    sampleInputs: ['aab', 'bab', 'abab', 'ba'],
    automaton: {
      type: 'NFA',
      states: [
        { id: 'q0', name: 'q0', x: 180, y: 250, isStart: true, isAccept: false },
        { id: 'q1', name: 'q1', x: 400, y: 250, isStart: false, isAccept: false },
        { id: 'q2', name: 'q2', x: 620, y: 250, isStart: false, isAccept: true },
      ],
      transitions: [
        { id: 't0', from: 'q0', to: 'q0', symbol: 'a' },
        { id: 't1', from: 'q0', to: 'q0', symbol: 'b' },
        { id: 't2', from: 'q0', to: 'q1', symbol: 'a' },
        { id: 't3', from: 'q1', to: 'q2', symbol: 'b' },
      ],
      nextStateId: 3,
      nextTransitionId: 4,
    }
  },
};

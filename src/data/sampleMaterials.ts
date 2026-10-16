import { SampleMaterial } from '../types';

export const SAMPLE_MATERIALS: SampleMaterial[] = [
  {
    id: 'youtube-neural-networks',
    title: '3Blue1Brown: But what is a neural network?',
    topic: 'YouTube Video Analysis',
    type: 'youtube_transcript',
    level: 'undergraduate',
    description: 'Direct YouTube video link! Watch Gemini analyze the video natively.',
    specificQuestions: 'How do weights and biases actually represent patterns in image recognition?',
    content: 'https://www.youtube.com/watch?v=aircAruvnKk',
  },
  {
    id: 'mysql-foreign-keys',
    title: 'MySQL Relational Databases & Foreign Keys',
    topic: 'Databases & Backend',
    type: 'youtube_transcript',
    level: 'undergraduate',
    description: 'YouTube link or transcript on relational foreign keys and cascading integrity.',
    specificQuestions: 'Why does MySQL reject an insert if the foreign key does not exist?',
    content: 'https://www.youtube.com/watch?v=kGq_0bkyq8M',
  },
  {
    id: 'dsa-dynamic-programming',
    title: 'Dynamic Programming: 0/1 Knapsack & Memoization',
    topic: 'DSA & Coding Interviews',
    type: 'assignment',
    level: 'undergraduate',
    description: 'Exam problem on formulating recurrence relations and memoization tables.',
    specificQuestions: 'Why is greedy choice wrong for 0/1 Knapsack while dynamic programming works?',
    content: `Problem: Given N items with values V = [60, 100, 120] and weights W = [10, 20, 30], and a knapsack capacity C = 50.
Find the maximum value subset of items such that total weight <= C.
Explain:
1. Why does greedy approach (taking highest value/weight ratio first) fail?
2. Derive the 2D DP recurrence relation dp[i][w].
3. Show step-by-step space optimization from O(N*C) to O(C).`,
  },
  {
    id: 'operating-systems-virtual-memory',
    title: 'Virtual Memory, Paging & TLB Hit/Miss',
    topic: 'Computer Systems & OS',
    type: 'lecture_notes',
    level: 'undergraduate',
    description: 'University OS lecture on page tables, page faults, and multi-level paging.',
    specificQuestions: 'Why do we need multi-level page tables instead of one big flat page table?',
    content: `Lecture 9: Virtual Memory, Paging, and Address Translation

Key Points:
- Logical Address vs Physical Address: The CPU generates virtual addresses; the MMU translates them to physical RAM addresses.
- Page Table Structure: Virtual address is divided into Virtual Page Number (VPN) and Offset.
- Translation Lookaside Buffer (TLB): A high-speed hardware cache of recent VPN -> PFN translations.
- Page Fault Mechanism: When a page table entry has Valid bit = 0, an OS trap is triggered to fetch the 4KB frame from disk swap space.
- Multi-Level Paging: Eliminates storing empty page table entries for sparsely populated virtual address spaces.`,
  },
  {
    id: 'quantum-superposition',
    title: 'Quantum Physics: Wavefunction & Double Slit',
    topic: 'Physics & STEM',
    type: 'textbook',
    level: 'undergraduate',
    description: 'Quantum superposition, Schrodinger equation, and measurement collapse.',
    specificQuestions: 'Why does observing the particle destroy the interference pattern?',
    content: `Chapter 4: Principles of Quantum Superposition and the Measurement Postulate

In classical physics, states have definite values independent of observation. In quantum mechanics, state vectors |psi> = alpha |0> + beta |1> exist in Hilbert space where |alpha|^2 + |beta|^2 = 1.
The wave-particle duality demonstrated in double-slit experiments shows particles interfere with themselves when unobserved.
Upon measurement, the state collapses probabilistically according to the Born Rule into one of the eigenstates.`,
  },
];

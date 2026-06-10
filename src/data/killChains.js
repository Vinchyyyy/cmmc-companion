/**
 * CMMC Kill Chain dataset — sourced directly from:
 * "CMMC Kill Chain" by ComplianceForge LLC
 * Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0)
 *
 * Pages 11–15 of the provided PDF extract cover kill chains 3–23.
 * Kill chains 1, 2, 5, and 7 are not present in the provided pages
 * and are intentionally omitted — no invented or inferred mappings.
 *
 * Control IDs use the app's convention (RA.L2-3.11.x, not RM.L2-3.11.x).
 */

export const KILL_CHAINS = [
  {
    id: 3,
    name: 'Documentation',
    controls: [
      'CA.L2-3.12.2',
      'CA.L2-3.12.4',
    ],
  },
  {
    id: 4,
    name: 'Secure Architecture',
    controls: [
      'SC.L1-3.13.1',
      'SC.L1-3.13.5',
      'SC.L2-3.13.2',
      'SC.L2-3.13.6',
    ],
  },
  {
    id: 6,
    name: 'Procedures / Rules of Behavior',
    controls: [
      'MP.L2-3.8.1',
      'MP.L2-3.8.2',
    ],
  },
  {
    id: 8,
    name: 'Change Management',
    controls: [
      'CM.L2-3.4.3',
      'CM.L2-3.4.4',
      'CM.L2-3.4.5',
    ],
  },
  {
    id: 9,
    name: 'Incident Response Operations',
    controls: [
      'IR.L2-3.6.1',
      'IR.L2-3.6.2',
      'IR.L2-3.6.3',
    ],
  },
  {
    id: 10,
    name: 'Situational Awareness',
    controls: [
      'AU.L2-3.3.1',
      'AU.L2-3.3.2',
      'AU.L2-3.3.3',
      'AU.L2-3.3.4',
      'AU.L2-3.3.5',
      'AU.L2-3.3.6',
      'AU.L2-3.3.8',
      'SI.L2-3.14.3',
      'SI.L2-3.14.6',
    ],
  },
  {
    id: 11,
    name: 'Baseline Security Configurations',
    controls: [
      'AC.L2-3.1.21',
      'AU.L2-3.3.9',
      'CM.L2-3.4.1',
      'CM.L2-3.4.2',
      'CM.L2-3.4.6',
      'CM.L2-3.4.7',
      'CM.L2-3.4.8',
      'IA.L2-3.5.4',
      'IA.L2-3.5.10',
      'IA.L2-3.5.11',
      'SC.L2-3.13.3',
      'SC.L2-3.13.4',
      'SC.L2-3.13.9',
      'SC.L2-3.13.12',
      'SC.L2-3.13.13',
      'SC.L2-3.13.14',
    ],
  },
  {
    id: 12,
    name: 'Centralized Controls Management',
    controls: [
      'AC.L2-3.1.5',
      'AC.L2-3.1.7',
      'AC.L2-3.1.8',
      'AC.L2-3.1.10',
      'AC.L2-3.1.11',
      'AU.L2-3.3.7',
      'IA.L2-3.5.5',
      'IA.L2-3.5.6',
      'IA.L2-3.5.7',
      'IA.L2-3.5.8',
      'IA.L2-3.5.9',
    ],
  },
  {
    id: 13,
    name: 'Identity & Access Management (IAM)',
    controls: [
      'AC.L1-3.1.1',
      'AC.L1-3.1.2',
      'AC.L2-3.1.3',
      'AC.L2-3.1.6',
      'CM.L2-3.4.9',
      'IA.L1-3.5.1',
      'IA.L1-3.5.2',
    ],
  },
  {
    id: 14,
    name: 'Maintenance',
    controls: [
      'MA.L2-3.7.1',
      'MA.L2-3.7.2',
      'MA.L2-3.7.3',
      'MA.L2-3.7.4',
      'MA.L2-3.7.6',
    ],
  },
  {
    id: 15,
    name: 'Vulnerability Management',
    controls: [
      // PDF uses RM.L2-3.11.x — converted to app-valid RA.L2-3.11.x
      'RA.L2-3.11.2',
      'RA.L2-3.11.3',
      'SI.L1-3.14.1',
      'SI.L1-3.14.2',
      'SI.L1-3.14.4',
      'SI.L1-3.14.5',
    ],
  },
  {
    id: 16,
    name: 'Asset Management',
    controls: [
      'AC.L1-3.1.20',
      'MP.L1-3.8.3',
      'MP.L2-3.8.4',
      'MP.L2-3.8.5',
    ],
  },
  {
    id: 17,
    name: 'Personnel Security',
    controls: [
      'AC.L1-3.1.22',
      'AC.L2-3.1.4',
      'AC.L2-3.1.9',
      'AC.L2-3.1.15',
      'MP.L2-3.8.7',
      'MP.L2-3.8.8',
      'PE.L2-3.10.6',
      'PS.L2-3.9.1',
      'PS.L2-3.9.2',
      'SI.L2-3.14.7',
    ],
  },
  {
    id: 18,
    name: 'Network Security',
    controls: [
      'AC.L2-3.1.12',
      'AC.L2-3.1.13',
      'AC.L2-3.1.14',
      'AC.L2-3.1.16',
      'AC.L2-3.1.17',
      'AC.L2-3.1.18',
      'AC.L2-3.1.19',
      'IA.L2-3.5.3',
      'MA.L2-3.7.5',
      'MP.L2-3.8.6',
      'SC.L2-3.13.7',
      'SC.L2-3.13.11',
      'SC.L2-3.13.15',
    ],
  },
  {
    id: 19,
    name: 'Business Continuity',
    controls: [
      'MP.L2-3.8.9',
    ],
  },
  {
    id: 20,
    name: 'Encryption',
    controls: [
      'SC.L2-3.13.8',
      'SC.L2-3.13.10',
      'SC.L2-3.13.16',
    ],
  },
  {
    id: 21,
    name: 'Physical Security',
    controls: [
      'PE.L1-3.10.1',
      'PE.L1-3.10.3',
      'PE.L1-3.10.4',
      'PE.L1-3.10.5',
      'PE.L2-3.10.2',
    ],
  },
  {
    id: 22,
    name: 'Security Awareness Training',
    controls: [
      'AT.L2-3.2.1',
      'AT.L2-3.2.2',
      'AT.L2-3.2.3',
    ],
  },
  {
    id: 23,
    name: 'Internal Audit',
    controls: [
      'CA.L2-3.12.1',
      'CA.L2-3.12.3',
      // PDF uses RM.L2-3.11.1 — converted to app-valid RA.L2-3.11.1
      'RA.L2-3.11.1',
    ],
  },
]

/**
 * Pre-built reverse lookup: controlId → { id, name }
 * Computed once at module load — O(1) per lookup.
 * Each control maps to exactly one kill chain.
 */
export const CONTROL_TO_KILL_CHAIN = Object.freeze(
  Object.fromEntries(
    KILL_CHAINS.flatMap((kc) =>
      kc.controls.map((controlId) => [controlId, { id: kc.id, name: kc.name }])
    )
  )
)

// NIST SP 800-171 Rev. 2 Appendix D reference mapping.
// This data is intentionally used as a candidate crosswalk, not as an
// equivalence or an automatic determination of inherited coverage.

const rows = []

const add = (requirements, nist53Controls) => {
  for (const requirement of requirements.split(' ')) rows.push({ requirement, nist53Controls })
}

add('3.1.1 3.1.2', ['AC-2', 'AC-3', 'AC-17'])
add('3.1.3', ['AC-4'])
add('3.1.4', ['AC-5'])
add('3.1.5', ['AC-6', 'AC-6(1)', 'AC-6(5)'])
add('3.1.6', ['AC-6(2)'])
add('3.1.7', ['AC-6(9)', 'AC-6(10)'])
add('3.1.8', ['AC-7'])
add('3.1.9', ['AC-8'])
add('3.1.10', ['AC-11', 'AC-11(1)'])
add('3.1.11', ['AC-12'])
add('3.1.12', ['AC-17(1)'])
add('3.1.13', ['AC-17(2)'])
add('3.1.14', ['AC-17(3)'])
add('3.1.15', ['AC-17(4)'])
add('3.1.16', ['AC-18'])
add('3.1.17', ['AC-18(1)'])
add('3.1.18', ['AC-19'])
add('3.1.19', ['AC-19(5)'])
add('3.1.20', ['AC-20', 'AC-20(1)'])
add('3.1.21', ['AC-20(2)'])
add('3.1.22', ['AC-22'])

add('3.2.1 3.2.2', ['AT-2', 'AT-3'])
add('3.2.3', ['AT-2(2)'])

add('3.3.1 3.3.2', ['AU-2', 'AU-3', 'AU-3(1)', 'AU-6', 'AU-11', 'AU-12'])
add('3.3.3', ['AU-2(3)'])
add('3.3.4', ['AU-5'])
add('3.3.5', ['AU-6(3)'])
add('3.3.6', ['AU-7'])
add('3.3.7', ['AU-8', 'AU-8(1)'])
add('3.3.8', ['AU-9'])
add('3.3.9', ['AU-9(4)'])

add('3.4.1 3.4.2', ['CM-2', 'CM-6', 'CM-8', 'CM-8(1)'])
add('3.4.3', ['CM-3'])
add('3.4.4', ['CM-4'])
add('3.4.5', ['CM-5'])
add('3.4.6', ['CM-7'])
add('3.4.7', ['CM-7(1)', 'CM-7(2)'])
add('3.4.8', ['CM-7(4)', 'CM-7(5)'])
add('3.4.9', ['CM-11'])

add('3.5.1 3.5.2', ['IA-2', 'IA-3', 'IA-5'])
add('3.5.3', ['IA-2(1)', 'IA-2(2)', 'IA-2(3)'])
add('3.5.4', ['IA-2(8)', 'IA-2(9)'])
add('3.5.5 3.5.6', ['IA-4'])
add('3.5.7 3.5.8 3.5.9 3.5.10', ['IA-5(1)'])
add('3.5.11', ['IA-6'])

add('3.6.1 3.6.2', ['IR-2', 'IR-4', 'IR-5', 'IR-6', 'IR-7'])
add('3.6.3', ['IR-3'])

add('3.7.1 3.7.2', ['MA-2', 'MA-3', 'MA-3(1)', 'MA-3(2)'])
add('3.7.3', ['MA-2'])
add('3.7.4', ['MA-3(2)'])
add('3.7.5', ['MA-4'])
add('3.7.6', ['MA-5'])

add('3.8.1 3.8.2 3.8.3', ['MP-2', 'MP-4', 'MP-6'])
add('3.8.4', ['MP-3'])
add('3.8.5', ['MP-5'])
add('3.8.6', ['MP-5(4)'])
add('3.8.7', ['MP-7'])
add('3.8.8', ['MP-7(1)'])
add('3.8.9', ['CP-9'])

add('3.9.1 3.9.2', ['PS-3', 'PS-4', 'PS-5'])

add('3.10.1 3.10.2', ['PE-2', 'PE-4', 'PE-5', 'PE-6'])
add('3.10.3 3.10.4 3.10.5', ['PE-3'])
add('3.10.6', ['PE-17'])

add('3.11.1', ['RA-3'])
add('3.11.2', ['RA-5', 'RA-5(5)'])
add('3.11.3', ['RA-5'])

add('3.12.1', ['CA-2'])
add('3.12.2', ['CA-5'])
add('3.12.3', ['CA-7'])
add('3.12.4', ['PL-2'])

add('3.13.1', ['SC-7'])
add('3.13.2', ['SA-8'])
add('3.13.3', ['SC-2'])
add('3.13.4', ['SC-4'])
add('3.13.5', ['SC-7'])
add('3.13.6', ['SC-7(5)'])
add('3.13.7', ['SC-7(7)'])
add('3.13.8', ['SC-8', 'SC-8(1)'])
add('3.13.9', ['SC-10'])
add('3.13.10', ['SC-12'])
add('3.13.11', ['SC-13'])
add('3.13.12', ['SC-15'])
add('3.13.13', ['SC-18'])
add('3.13.14', ['SC-19'])
add('3.13.15', ['SC-23'])
add('3.13.16', ['SC-28'])

add('3.14.1', ['SI-2'])
add('3.14.2', ['SI-3'])
add('3.14.3', ['SI-5'])
add('3.14.4 3.14.5', ['SI-3'])
add('3.14.6', ['SI-4', 'SI-4(4)'])
add('3.14.7', ['SI-4'])

export const NIST53_CROSSWALK_ROWS = rows

const BASE_TITLES = {
  AC: 'Access Control', AT: 'Awareness and Training', AU: 'Audit and Accountability',
  CA: 'Security Assessment and Authorization', CM: 'Configuration Management',
  CP: 'Contingency Planning', IA: 'Identification and Authentication',
  IR: 'Incident Response', MA: 'Maintenance', MP: 'Media Protection',
  PE: 'Physical and Environmental Protection', PL: 'Planning', PS: 'Personnel Security',
  RA: 'Risk Assessment', SA: 'System and Services Acquisition',
  SC: 'System and Communications Protection', SI: 'System and Information Integrity',
}

const CONTROL_TITLES = {
  'AC-2': 'Account Management', 'AC-3': 'Access Enforcement', 'AC-4': 'Information Flow Enforcement',
  'AC-5': 'Separation of Duties', 'AC-6': 'Least Privilege', 'AC-7': 'Unsuccessful Logon Attempts',
  'AC-8': 'System Use Notification', 'AC-11': 'Session Lock', 'AC-12': 'Session Termination',
  'AC-17': 'Remote Access', 'AC-18': 'Wireless Access', 'AC-19': 'Access Control for Mobile Devices',
  'AC-20': 'Use of External Systems', 'AC-22': 'Publicly Accessible Content',
  'AT-2': 'Security Awareness Training', 'AT-3': 'Role-Based Security Training',
  'AU-2': 'Audit Events', 'AU-3': 'Content of Audit Records', 'AU-5': 'Response to Audit Processing Failures',
  'AU-6': 'Audit Review, Analysis, and Reporting', 'AU-7': 'Audit Reduction and Report Generation',
  'AU-8': 'Time Stamps', 'AU-9': 'Protection of Audit Information', 'AU-11': 'Audit Record Retention',
  'AU-12': 'Audit Generation', 'CA-2': 'Security Assessments', 'CA-5': 'Plan of Action and Milestones',
  'CA-7': 'Continuous Monitoring', 'CM-2': 'Baseline Configuration', 'CM-3': 'Configuration Change Control',
  'CM-4': 'Security Impact Analysis', 'CM-5': 'Access Restrictions for Change',
  'CM-6': 'Configuration Settings', 'CM-7': 'Least Functionality', 'CM-8': 'System Component Inventory',
  'CM-11': 'User-Installed Software', 'CP-9': 'System Backup', 'IA-2': 'Identification and Authentication',
  'IA-3': 'Device Identification and Authentication', 'IA-4': 'Identifier Management',
  'IA-5': 'Authenticator Management', 'IA-6': 'Authenticator Feedback', 'IR-2': 'Incident Response Training',
  'IR-3': 'Incident Response Testing', 'IR-4': 'Incident Handling', 'IR-5': 'Incident Monitoring',
  'IR-6': 'Incident Reporting', 'IR-7': 'Incident Response Assistance', 'MA-2': 'Controlled Maintenance',
  'MA-3': 'Maintenance Tools', 'MA-4': 'Nonlocal Maintenance', 'MA-5': 'Maintenance Personnel',
  'MP-2': 'Media Access', 'MP-3': 'Media Marking', 'MP-4': 'Media Storage', 'MP-5': 'Media Transport',
  'MP-6': 'Media Sanitization', 'MP-7': 'Media Use', 'PE-2': 'Physical Access Authorizations',
  'PE-3': 'Physical Access Control', 'PE-4': 'Access Control for Transmission Medium',
  'PE-5': 'Access Control for Output Devices', 'PE-6': 'Monitoring Physical Access',
  'PE-17': 'Alternate Work Site', 'PL-2': 'System Security Plan', 'PS-3': 'Personnel Screening',
  'PS-4': 'Personnel Termination', 'PS-5': 'Personnel Transfer', 'RA-3': 'Risk Assessment',
  'RA-5': 'Vulnerability Scanning', 'SA-8': 'Security Engineering Principles',
  'SC-2': 'Application Partitioning', 'SC-4': 'Information in Shared Resources',
  'SC-7': 'Boundary Protection', 'SC-8': 'Transmission Confidentiality and Integrity',
  'SC-10': 'Network Disconnect', 'SC-12': 'Cryptographic Key Establishment and Management',
  'SC-13': 'Cryptographic Protection', 'SC-15': 'Collaborative Computing Devices',
  'SC-18': 'Mobile Code', 'SC-19': 'Voice over Internet Protocol', 'SC-23': 'Session Authenticity',
  'SC-28': 'Protection of Information at Rest', 'SI-2': 'Flaw Remediation',
  'SI-3': 'Malicious Code Protection', 'SI-4': 'System Monitoring', 'SI-5': 'Security Alerts and Advisories',
  'AC-2(1)': 'Automated System Account Management', 'AC-2(2)': 'Removal of Temporary / Emergency Accounts',
  'AC-2(3)': 'Disable Inactive Accounts', 'AC-2(4)': 'Automated Audit Actions',
  'AC-2(5)': 'Inactivity Logout', 'AC-2(7)': 'Role-Based Schemes',
  'AC-2(9)': 'Restrictions on Use of Shared / Group Accounts',
  'AC-2(10)': 'Shared / Group Account Credential Termination', 'AC-2(11)': 'Usage Conditions',
  'AC-2(12)': 'Account Monitoring for Atypical Usage', 'AC-2(13)': 'Disable Accounts for High-Risk Individuals',
  'AC-6(1)': 'Authorize Access to Security Functions',
  'AC-6(2)': 'Non-Privileged Access for Nonsecurity Functions', 'AC-6(5)': 'Privileged Accounts',
  'AC-6(9)': 'Log Use of Privileged Functions',
  'AC-6(10)': 'Prohibit Non-Privileged Users from Executing Privileged Functions',
  'AC-11(1)': 'Pattern-Hiding Displays', 'AC-17(1)': 'Automated Monitoring / Control',
  'AC-17(2)': 'Protection of Confidentiality / Integrity Using Encryption',
  'AC-17(3)': 'Managed Access Control Points', 'AC-17(4)': 'Privileged Commands / Access',
  'AC-18(1)': 'Authentication and Encryption', 'AC-19(5)': 'Full Device / Container-Based Encryption',
  'AC-20(1)': 'Limits on Authorized Use', 'AC-20(2)': 'Portable Storage Devices',
  'AT-2(2)': 'Insider Threat', 'AU-2(3)': 'Reviews and Updates',
  'AU-3(1)': 'Additional Audit Information', 'AU-6(3)': 'Correlate Audit Repositories',
  'AU-8(1)': 'Synchronization with Authoritative Time Source',
  'AU-9(4)': 'Access by Subset of Privileged Users', 'CM-7(1)': 'Periodic Review',
  'CM-7(2)': 'Prevent Program Execution', 'CM-7(4)': 'Unauthorized Software / Blacklisting',
  'CM-7(5)': 'Authorized Software / Whitelisting', 'CM-8(1)': 'Updates During Installations / Removals',
  'IA-2(1)': 'Network Access to Privileged Accounts',
  'IA-2(2)': 'Network Access to Non-Privileged Accounts', 'IA-2(3)': 'Local Access to Privileged Accounts',
  'IA-2(8)': 'Network Access to Privileged Accounts — Replay Resistant',
  'IA-2(9)': 'Network Access to Non-Privileged Accounts — Replay Resistant',
  'IA-5(1)': 'Password-Based Authentication', 'MA-3(1)': 'Inspect Tools',
  'MA-3(2)': 'Inspect Media', 'MP-5(4)': 'Cryptographic Protection',
  'MP-7(1)': 'Prohibit Use Without Owner', 'RA-5(5)': 'Privileged Access',
  'SC-7(5)': 'Deny by Default / Allow by Exception', 'SC-7(7)': 'Prevent Split Tunneling',
  'SC-8(1)': 'Cryptographic or Alternate Physical Protection',
  'SI-4(4)': 'Inbound and Outbound Communications Traffic',
}

export function normalizeNist53Id(value) {
  return String(value ?? '').toUpperCase().replace(/\s+/g, '').replace(/–|—/g, '-').trim()
}

export function parseNist53Controls(value) {
  const matches = String(value ?? '').toUpperCase().match(/[A-Z]{2}-\d+(?:\s*\(\d+\))?/g) ?? []
  return [...new Set(matches.map(normalizeNist53Id))]
}

export function nist53Title(controlId) {
  const normalized = normalizeNist53Id(controlId)
  const base = normalized.replace(/\(\d+\)$/, '')
  return CONTROL_TITLES[normalized] ?? CONTROL_TITLES[base] ?? BASE_TITLES[base.split('-')[0]] ?? 'NIST SP 800-53 control'
}

export const NIST53_CONTROL_OPTIONS = [...new Set(rows.flatMap((row) => row.nist53Controls))]
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

// Appendix D only lists controls relevant to 800-171, while provider CRMs may
// cite additional enhancements. Keep the common AC-2 CRM enhancements
// discoverable even when their crosswalk candidate comes from parent AC-2.
export const NIST53_PICKER_OPTIONS = [...new Set([
  ...NIST53_CONTROL_OPTIONS,
  'AC-2(1)', 'AC-2(2)', 'AC-2(3)', 'AC-2(4)', 'AC-2(5)', 'AC-2(7)',
  'AC-2(9)', 'AC-2(10)', 'AC-2(11)', 'AC-2(12)', 'AC-2(13)',
])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

export function findCrosswalkCandidates(nist53Controls) {
  const selected = [...new Set((nist53Controls ?? []).map(normalizeNist53Id))]
  const candidates = new Map()
  for (const selectedControl of selected) {
    const parent = selectedControl.replace(/\(\d+\)$/, '')
    for (const row of rows) {
      let basis = ''
      if (row.nist53Controls.includes(selectedControl)) basis = 'Exact Appendix D match'
      else if (selectedControl !== parent && row.nist53Controls.includes(parent)) basis = `Parent-control match via ${parent}`
      if (!basis) continue
      const existing = candidates.get(row.requirement)
      const evidence = { nist53Control: selectedControl, basis }
      if (existing) existing.evidence.push(evidence)
      else candidates.set(row.requirement, { requirement: row.requirement, evidence: [evidence] })
    }
  }
  return [...candidates.values()].sort((a, b) => a.requirement.localeCompare(b.requirement, undefined, { numeric: true }))
}

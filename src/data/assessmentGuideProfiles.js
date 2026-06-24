// =========================================================================
// Assessment Guide Evidence Profiles (supplemental scoring metadata)
// =========================================================================
//
// Per-control evidence-object context derived ONE TIME (offline) from the
// official "CMMC Assessment Guide – Level 2, Version 2.0" — specifically each
// practice's POTENTIAL ASSESSMENT METHODS AND OBJECTS → Examine [SELECT FROM: …]
// list. This is supplemental, static, deterministic metadata used only as a
// reuse-scoring SUPPORT signal. It does NOT replace control/objective source
// data, is never parsed at runtime, and adds no new evidence tags.
//
//   evidenceObjects  — the guide's examine objects (verbatim, for transparency)
//   evidenceTagHints — those objects normalised to EXISTING evidence tag ids,
//                       i.e. the kinds of evidence the guide says an assessor
//                       would examine for this control.
//
// Coverage: all 110 Level 2 practices.
// =========================================================================

export const assessmentGuideProfiles = {
  'RA.L2-3.11.1': {
    evidenceObjects: ["Risk assessment policy", "security planning policy and procedures", "procedures addressing organizational risk assessments", "system security plan", "risk assessment", "risk assessment results", "risk assessment reviews", "risk assessment updates", "other relevant documents or records"],
    evidenceTagHints: ['risk_assessment_report', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'RA.L2-3.11.2': {
    evidenceObjects: ["Risk assessment policy", "procedures addressing vulnerability scanning", "risk assessment", "system security plan", "security assessment report", "vulnerability scanning tools and associated configuration documentation", "vulnerability scanning results", "patch and vulnerability management records", "other relevant documents or records"],
    evidenceTagHints: ['vulnerability_scan_report', 'patch_management_record', 'risk_assessment_report', 'security_assessment_report', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'RA.L2-3.11.3': {
    evidenceObjects: ["Risk assessment policy", "procedures addressing vulnerability scanning", "risk assessment", "system security plan", "security assessment report", "vulnerability scanning tools and associated configuration documentation", "vulnerability scanning results", "patch and vulnerability management records", "other relevant documents or records"],
    evidenceTagHints: ['vulnerability_scan_report', 'patch_management_record', 'risk_assessment_report', 'security_assessment_report', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AT.L2-3.2.1': {
    evidenceObjects: ["Security awareness and training policy", "procedures addressing security awareness training implementation", "relevant codes of federal regulations", "security awareness training curriculum", "security awareness training materials", "system security plan", "training records", "other relevant documents or records"],
    evidenceTagHints: ['training_completion_record', 'training_content', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AT.L2-3.2.2': {
    evidenceObjects: ["Security awareness and training policy", "procedures addressing security training implementation", "codes of federal regulations", "security training curriculum", "security training materials", "system security plan", "training records", "other relevant documents or records"],
    evidenceTagHints: ['training_completion_record', 'training_content', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AT.L2-3.2.3': {
    evidenceObjects: ["Security awareness and training policy", "procedures addressing security awareness training implementation", "security awareness training curriculum", "security awareness training materials", "insider threat policy and procedures", "s ystem security plan", "other relevant documents or records"],
    evidenceTagHints: ['training_content', 'policy_document', 'procedure_document'],
  },
  'MA.L2-3.7.1': {
    evidenceObjects: ["System maintenance policy", "procedures addressing controlled system maintenance", "maintenance records", "manufacturer or vendor maintenance specifications", "equipment sanitization records", "media sanitization records", "system security plan", "other relevant documents or records"],
    evidenceTagHints: ['media_sanitization_record', 'maintenance_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MA.L2-3.7.2': {
    evidenceObjects: ["System maintenance policy", "procedures addre ssing system maintenance tools and media", "maintenance records", "system maintenance tools and associated documentation", "maintenance tool inspection records", "system security plan", "other relevant documents or records"],
    evidenceTagHints: ['maintenance_record', 'maintenance_tool_control_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MA.L2-3.7.3': {
    evidenceObjects: ["System maintenance policy", "procedure s addressing controlled system maintenance", "maintenance records", "manufacturer or vendor maintenance specifications", "equipment sanitization records", "media sanitization records", "system security plan", "other relevant documents or records"],
    evidenceTagHints: ['media_sanitization_record', 'maintenance_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MA.L2-3.7.4': {
    evidenceObjects: ["System maintenance policy", "procedures addressing system maintenance tools", "system maintenance tools and associated documentation", "maintenance records", "system security plan", "other relevant documents or records"],
    evidenceTagHints: ['maintenance_record', 'maintenance_tool_control_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MA.L2-3.7.5': {
    evidenceObjects: ["Access control policy", "procedures addressing remote access to the system", "system security plan", "system design documentation", "system configuration settings and associated docu mentation", "cryptographic mechanisms and associated configuration documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['remote_access_configuration', 'configuration_baseline_record', 'encryption_configuration', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MA.L2-3.7.6': {
    evidenceObjects: ["System maintenance policy", "procedures addressing maintenance personnel", "service provider contracts", "service -level agreements", "list of authorized personnel", "maintenance record s", "access control records", "system security plan", "other relevant documents or records"],
    evidenceTagHints: ['maintenance_record', 'system_security_plan', 'policy_document', 'procedure_document', 'signed_agreement'],
  },
  'CA.L2-3.12.1': {
    evidenceObjects: ["Security assessment and authorization policy", "procedu res addressing plan of action", "system security plan", "security assessment plan", "security assessment report", "security assessment evidence", "plan of action", "other relevant documents or records"],
    evidenceTagHints: ['security_assessment_report', 'plan_of_action', 'system_security_plan', 'policy_document'],
  },
  'CA.L2-3.12.2': {
    evidenceObjects: ["Risk assessment policy", "procedures addressing vulnerability scanning", "risk assessment", "system security plan", "security assessment report", "vulnerability scanning tools and associated configuration documentation", "vulnerability scanning results", "patch and vulnerability management records", "other relevant documents or records"],
    evidenceTagHints: ['vulnerability_scan_report', 'patch_management_record', 'risk_assessment_report', 'security_assessment_report', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'CA.L2-3.12.3': {
    evidenceObjects: ["Security assessment and authorization policy", "procedu res addressing plan of action", "system security plan", "security assessment plan", "security assessment report", "security assessment evidence", "plan of action", "other relevant documents or records"],
    evidenceTagHints: ['security_assessment_report', 'plan_of_action', 'system_security_plan', 'policy_document'],
  },
  'CA.L2-3.12.4': {
    evidenceObjects: ["Security planning policy", "procedures addressing system security plan development and implementation", "procedures addressing system security plan reviews and updates", "enterprise architecture do cumentation", "system security plan", "records of system security plan reviews and updates", "other relevant documents or records"],
    evidenceTagHints: ['system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IR.L2-3.6.1': {
    evidenceObjects: ["Incident response policy", "contingency planning policy", "procedures addressing incident handling", "procedures addressing incident response assistance", "incident response plan", "contingency p lan", "system security plan", "procedures addressing incident response training", "incident response training curriculum", "incident response training materials", "incident response training records", "other relevant documents or records"],
    evidenceTagHints: ['incident_response_plan', 'training_completion_record', 'training_content', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IR.L2-3.6.2': {
    evidenceObjects: ["Incident response policy", "procedures addressing incident monitoring", "incident response records and documentation", "procedures addressing incident reporting", "incident reporting records and documentation", "incident response plan", "system security plan", "other relevant documents or records"],
    evidenceTagHints: ['incident_response_plan', 'incident_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IR.L2-3.6.3': {
    evidenceObjects: ["Incident re sponse policy", "contingency planning policy", "procedures addressing incident response testing", "procedures addressing contingency plan testing", "incident response testing material", "incident response test results", "incident response test plan", "incident response plan", "contingency plan", "system security plan", "other relevant documents or records"],
    evidenceTagHints: ['incident_response_plan', 'incident_response_test_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SI.L1-3.14.1': {
    evidenceObjects: ["System and information integrity policy", "procedures addressing flaw remediation", "procedures addressing configuration management", "system security plan", "list of flaws and vulnerabilities potentially affecting the system", "list of recent security flaw remediation actions performed on the system (e.g., list of installed patches, service packs, hot fixes, and other software updates to correct system flaws)", "t est results from the installation of software and firmware updates to correct system flaws", "installation/change control records for security -relevant software and firmware updates", "other relevant documents or records"],
    evidenceTagHints: ['change_management_record', 'remediation_record', 'patch_management_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SI.L1-3.14.2': {
    evidenceObjects: ["System maintenance policy", "procedures addressing nonlocal system maintenance", "system security plan", "system design documentation", "system configuration settings and associated documentation", "maintenance records", "diagnostic records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'maintenance_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SI.L2-3.14.3': {
    evidenceObjects: ["System and information integrity policy", "procedures addressing security alerts, advisories, and directives", "system security plan", "records of security alerts and advisories", "other relevant documents or records"],
    evidenceTagHints: ['alert_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SI.L1-3.14.4': {
    evidenceObjects: ["System maintenance policy", "procedures addressing nonlocal system maintenance", "system security plan", "system design documentation", "system configuration settings and associated documentation", "maintenance records", "diagnostic records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'maintenance_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SI.L1-3.14.5': {
    evidenceObjects: ["System and information integrity policy", "configuration management policy and procedures", "procedures addressing malicious code protection", "malicious code protection mechanisms", "records of malicious code protection updates", "system security plan", "system design documentation", "system configuration settings and associated documentation", "scan results from malicious code protection mechanisms", "record of actions in itiated by malicious code protection mechanisms in response to malicious code detection", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'malware_protection_configuration', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SI.L2-3.14.6': {
    evidenceObjects: ["System and information integrity policy", "procedures addressing system monitoring tools and techniques", "continuous monitoring strategy", "system and information integrity policy", "procedures addressing system monitoring tools and techniques", "facility diagram or layout", "s ystem security plan", "system monitoring tools and techniques documentation", "system design documentation", "locations within system where monitoring devices are deployed", "system protocols", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'monitoring_tool_configuration', 'policy_document', 'procedure_document'],
  },
  'SI.L2-3.14.7': {
    evidenceObjects: ["Continuous monitoring strategy", "system and information integrity policy", "procedures addressing system monitoring tools and techniques", "facility diagram/layout", "system security plan", "system design documentation", "system monitoring tools and techniques documentation", "locations within system where monitoring devices are deployed", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'monitoring_tool_configuration', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'PS.L2-3.9.1': {
    evidenceObjects: ["Personnel security policy", "procedures addressing personnel screening", "records of screened personnel", "system security plan", "other relevant documents or records"],
    evidenceTagHints: ['personnel_screening_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'PS.L2-3.9.2': {
    evidenceObjects: ["Personnel security policy", "procedures addressing personnel transfer and termination", "records of personnel transfer and termination actions", "list of system accounts", "records of terminated or revoked authenticators and credentials", "records of exit interviews", "other relevant documents or records"],
    evidenceTagHints: ['identity_roster', 'personnel_action_record', 'policy_document', 'procedure_document'],
  },
  'AC.L1-3.1.1': {
    evidenceObjects: ["Access control policy", "procedures addressing account management", "system security plan", "system design documentation", "system configuration settings and associated documentation", "list of active system accounts and the name of the individual associated with each account", "notifications or records of recently transferred, separated, or terminated employees", "list of conditions for group and role membership", "list of recently disabled system accounts along with the name of the individual associated with each account", "access authorization records", "account management compliance reviews", "system monitoring records", "system audit logs and records", "list of devices and systems authorized to connect to organizational systems", "other relevant documents or records"],
    evidenceTagHints: ['identity_roster', 'account_lifecycle_record', 'access_review_record', 'access_authorization_record', 'role_permission_matrix', 'procedure_document', 'device_access_list', 'configuration_baseline_record', 'audit_log_sample', 'monitoring_tool_configuration', 'system_security_plan', 'policy_document'],
  },
  'AC.L1-3.1.2': {
    evidenceObjects: ["Access control policy", "procedures addressing access enforcement", "system security plan", "system design documentation", "list of approved authorizations including remote access authorizations", "system audit logs and records", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['remote_access_configuration', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.3': {
    evidenceObjects: ["Access control policy", "information flow control policies", "procedures addressing information flow enforcement", "system security plan", "system design documentation", "system configuration settings and associated documentation", "list of information flow authorizations", "system baseline configuration", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['data_flow_diagram', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.4': {
    evidenceObjects: ["Access control policy", "procedures addressing divisions of responsibility and separation of duties", "system security plan", "system configuration settings and associated documentation", "list of divisions of responsibility and separation of duties", "system access authorizations", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.5': {
    evidenceObjects: ["Access control policy", "procedures addressing account management", "system security plan", "system design documenta tion", "system configuration settings and associated documentation", "list of active system accounts and the name of the individual associated with each account", "list of conditions for group and role membership", "notifications or records of recently transferred, separated, or terminated employees", "list of recently disabled system accounts along with the name of the individual associated with each account", "access authorization records", "account management compliance reviews", "system monitoring/audit records", "proced ures addressing least privilege", "list of security functions (deployed in hardware, software, and firmware) and security-relevant information for which access is to be explicitly authorized", "list of system -generated privileged accounts", "list of system administration personnel", "other relevant documents or records"],
    evidenceTagHints: ['identity_roster', 'privileged_account_inventory', 'account_lifecycle_record', 'access_review_record', 'access_authorization_record', 'role_permission_matrix', 'procedure_document', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document'],
  },
  'AC.L2-3.1.6': {
    evidenceObjects: ["Access control policy", "procedures addressing least privilege", "system security plan", "list of system -generated security functions assigned to system accounts or roles", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.7': {
    evidenceObjects: ["Privacy and security policies, proce dures addressing system use notification", "documented approval of system use notification messages or banners", "system audit logs and records", "system design documentation", "user acknowledgements of notification message or banner", "system security plan", "system use notification messages", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'acknowledgment_record', 'system_security_plan'],
  },
  'AC.L2-3.1.8': {
    evidenceObjects: ["Access control policy", "procedures addressing unsuccessful logon attempts", "system security plan", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "other re levant documents or records"],
    evidenceTagHints: ['account_lockout_configuration', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.9': {
    evidenceObjects: ["Privacy and security policies, procedures addressing system use notification", "documented approval of system use notification messages or banners", "syst em audit logs and records", "system design documentation", "user acknowledgements of notification message or banner", "system security plan", "system use notification messages", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'acknowledgment_record', 'system_security_plan', 'procedure_document'],
  },
  'AC.L2-3.1.10': {
    evidenceObjects: ["Access control policy", "procedures addressing session lock", "procedures addressing identification and authentication", "system design documentation", "system configuration settings and associated documentation", "system security plan", "other relevant documents or records"],
    evidenceTagHints: ['session_control_configuration', 'configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.11': {
    evidenceObjects: ["Access control policy", "procedures addressing session termination", "system design documentation", "system security plan", "system configuration settings and associated documentation", "list of conditions or trigger events requiring session d isconnect", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['session_control_configuration', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.12': {
    evidenceObjects: ["Access control policy", "procedures addressing remote access implementation and usage (including restrictions)", "configuration management plan", "system security plan", "system design documentation", "system configuration settings and as sociated documentation", "remote access authorizations", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['remote_access_configuration', 'configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.13': {
    evidenceObjects: ["Access control policy", "procedures addressing remote access to the system", "system security plan", "system design documentation", "system configuration settings and associated docu mentation", "cryptographic mechanisms and associated configuration documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['remote_access_configuration', 'configuration_baseline_record', 'encryption_configuration', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.14': {
    evidenceObjects: ["Access control policy", "procedures addressing remote access to the system", "system security plan", "system design documentation", "system configuration settings and associated docu mentation", "cryptographic mechanisms and associated configuration documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['remote_access_configuration', 'configuration_baseline_record', 'encryption_configuration', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.15': {
    evidenceObjects: ["Access control policy", "procedures addressing remote access to the system", "system security plan", "system design documentation", "system configuration settings and associated docu mentation", "cryptographic mechanisms and associated configuration documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['remote_access_configuration', 'configuration_baseline_record', 'encryption_configuration', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.16': {
    evidenceObjects: ["Access control policy", "configuration management plan", "procedures addressing wireless access implementation and usage (including restrictions)", "system security plan", "system design documentation", "system configuration settings and associated documentation", "wireless access authorizations", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['wireless_configuration', 'configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.17': {
    evidenceObjects: ["Access control policy", "system design documentation", "procedures addressing wireless implementation and usage (including restrictions)", "system security plan", "system configuration settings and associated documentation", "syst em audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['wireless_configuration', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.18': {
    evidenceObjects: ["Ac cess control policy", "authorizations for mobile device connections to organizational systems", "procedures addressing access control for mobile device usage (including restrictions)", "system design documentation", "configuration management plan", "system security plan", "system audit logs and records", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['mdm_enrollment_list', 'configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L2-3.1.19': {
    evidenceObjects: ["Access control policy", "procedures addressing access control for mobile devices", "system design documentation", "system configuration settings and associated documentation", "encryption mechanisms and associated configuration documentation", "system security plan", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['mdm_enrollment_list', 'configuration_baseline_record', 'encryption_configuration', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AC.L1-3.1.20': {
    evidenceObjects: ["Access control policy", "procedures addressing the use of external systems", "terms and conditions for external systems", "syst em security plan", "list of applications accessible from external systems", "system configuration settings and associated documentation", "system connection or processing agreements", "account management documents", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'policy_document', 'procedure_document', 'signed_agreement'],
  },
  'AC.L2-3.1.21': {
    evidenceObjects: ["Access control policy", "procedures addressing the use of external systems", "system security plan", "system configuration settings and associated documentation", "system connection or processing agreements", "account management documents", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document', 'signed_agreement'],
  },
  'AC.L1-3.1.22': {
    evidenceObjects: ["Access control policy", "procedures addressing publicly accessible content", "system security plan", "list of users authorized to post publicly accessible content on organizational systems", "training materials and/or records", "records of publicly accessible information reviews", "records of response to nonpublic information on public websites", "system audit logs and records", "security awareness training records", "other relev ant documents or records"],
    evidenceTagHints: ['identity_roster', 'audit_log_sample', 'training_completion_record', 'training_content', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MP.L1-3.8.3': {
    evidenceObjects: ["System media protection policy", "procedures addre ssing media sanitization and disposal", "applicable standards and policies addressing media sanitization", "system security plan", "media sanitization records", "system audit logs and records", "system design documentation", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'media_sanitization_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MP.L2-3.8.1': {
    evidenceObjects: ["Access control policy", "procedures addressing the use of external systems", "system security plan", "system configuration settings and associated documentation", "system connection or processing agreements", "account management documents", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document', 'signed_agreement'],
  },
  'MP.L2-3.8.2': {
    evidenceObjects: ["Access control policy", "procedures addressing the use of external systems", "system security plan", "system configuration settings and associated documentation", "system connection or processing agreements", "account management documents", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document', 'signed_agreement'],
  },
  'MP.L2-3.8.4': {
    evidenceObjects: ["System media protection policy", "procedures addressing media marking", "physical and environmental protection policy and procedures", "system security plan", "list of system media marking se curity attributes", "designated controlled areas", "other relevant documents or records"],
    evidenceTagHints: ['media_marking_evidence', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MP.L2-3.8.5': {
    evidenceObjects: ["System media protection policy", "procedures addressing media storage", "physical and environmental protection policy and procedures", "access control policy and procedures", "system security plan", "system media", "designated controlled areas", "other relevant documents or records"],
    evidenceTagHints: ['system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MP.L2-3.8.6': {
    evidenceObjects: ["System media protection p olicy", "procedures addressing media transport", "system design documentation", "system security plan", "system configuration settings and associated documentation", "system media transport records", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'procedure_document'],
  },
  'MP.L2-3.8.7': {
    evidenceObjects: ["System media protection policy", "system use policy", "procedures a ddressing media usage restrictions", "system security plan", "rules of behavior", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document', 'signed_agreement'],
  },
  'MP.L2-3.8.8': {
    evidenceObjects: ["System media protection policy", "procedures addressing media storage", "physical and environmental protection policy and procedures", "access control policy and procedures", "system security plan", "system media", "designated controlled areas", "other relevant documents or records"],
    evidenceTagHints: ['system_security_plan', 'policy_document', 'procedure_document'],
  },
  'MP.L2-3.8.9': {
    evidenceObjects: ["Procedures addressing system backup", "system configuration settings and associated documentation", "security plan", "backup storage locations", "system backup logs or records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'procedure_document'],
  },
  'SC.L1-3.13.1': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing boundary protection", "system security plan", "list of key internal boundaries of the system", "system design documentation", "boundary protection hardware and software", "enterprise security architecture documentation", "system audit logs and records", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['firewall_ruleset', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L1-3.13.5': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing boundary protection", "system security plan", "list of key internal boundaries of the system", "system design doc umentation", "boundary protection hardware and software", "system configuration settings and associated documentation", "enterprise security architecture documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['firewall_ruleset', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.2': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing boundary protection", "system security plan", "list of key internal boundaries of the system", "system design documentation", "boundary protection hardware and software", "enterprise security architecture documentation", "system audit logs and records", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['firewall_ruleset', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.3': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing application partitioning", "system design documentation", "system configu ration settings and associated documentation", "system security plan", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.4': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing application partitioning", "system security plan", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.6': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing boundary protection", "system security plan", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['firewall_ruleset', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.7': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing boundary protection", "system security plan", "system design documentation", "system hardware and software", "system architecture", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['firewall_ruleset', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.8': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing transmission confidentiality and integrity", "system security plan", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.9': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing network disconnect", "system design documentation", "system security plan", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.10': {
    evidenceObjects: ["Access control policy", "procedures addressing the use of external systems", "system security plan", "system configuration settings and associated documentation", "system connection or processing agreements", "account management documents", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document', 'signed_agreement'],
  },
  'SC.L2-3.13.11': {
    evidenceObjects: ["Access control policy", "procedures addressing the use of external systems", "system security plan", "system configuration settings and associated documentation", "system connection or processing agreements", "account management documents", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document', 'signed_agreement'],
  },
  'SC.L2-3.13.12': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing collaborative computing", "access control policy and procedures", "system security plan", "system design documentation", "system audit logs and records", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.13': {
    evidenceObjects: ["System and communications protection policy", "procedures addressing mobile code", "mobile code usage restrictions, mobile code implementation policy and procedures", "system audit logs and records", "system security plan", "list of acceptable mobile code and mobile code technologies", "list of unacceptable mobile code and mobile technologies", "authorization records", "system monitoring records", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['access_authorization_record', 'audit_log_sample', 'monitoring_tool_configuration', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.14': {
    evidenceObjects: ["System and communications protec tion policy", "procedures addressing session authenticity", "system security plan", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.15': {
    evidenceObjects: ["System and communications protec tion policy", "procedures addressing session authenticity", "system security plan", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'SC.L2-3.13.16': {
    evidenceObjects: ["Access control policy", "procedures addressing the use of external systems", "system security plan", "system configuration settings and associated documentation", "system connection or processing agreements", "account management documents", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document', 'signed_agreement'],
  },
  'PE.L1-3.10.1': {
    evidenceObjects: ["System media protection policy", "procedures addre ssing media sanitization and disposal", "applicable standards and policies addressing media sanitization", "system security plan", "media sanitization records", "system audit logs and records", "system design documentation", "system configuration settings and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'media_sanitization_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'PE.L1-3.10.3': {
    evidenceObjects: ["Physical and environme ntal protection policy", "procedures addressing physical access control", "system security plan", "physical access control logs or records", "inventory records of physical access control devices", "system entry and exit points", "records of key and lock combination ch anges", "storage locations for physical access control devices", "physical access control devices", "list of security safeguards controlling access to designated publicly accessible areas within facility", "other relevant documents or records"],
    evidenceTagHints: ['system_security_plan', 'policy_document', 'procedure_document'],
  },
  'PE.L1-3.10.4': {
    evidenceObjects: ["Physical and environmental protection policy", "procedures addressing physical access control", "system security plan", "physical access control logs or records", "inventory records of physical access control devices", "system entry and exit points", "records of key and lock combination changes", "storage locations for physical access control devices", "physical access control devices", "list of security safeguards controlling access to designated publicly accessible areas within facility", "other relevant documents or records"],
    evidenceTagHints: ['system_security_plan', 'policy_document', 'procedure_document'],
  },
  'PE.L1-3.10.5': {
    evidenceObjects: ["Physical and environmental protection policy", "procedures addressing physical access control", "system security plan", "physical access control logs or records", "inventory records of physical access control devices", "system entry and exit points", "records of key and lock combination changes", "storage location s for physical access control devices", "physical access control devices", "list of security safeguards controlling access to designated publicly accessible areas within facility", "other relevant documents or records"],
    evidenceTagHints: ['system_security_plan', 'policy_document', 'procedure_document'],
  },
  'PE.L2-3.10.2': {
    evidenceObjects: ["Physical and environmental protection policy", "procedures addressing physical access monitoring", "system security plan", "physical access logs or records", "physical access monitoring records", "physical access log reviews", "other relevant doc uments or records"],
    evidenceTagHints: ['log_review_record', 'monitoring_tool_configuration', 'physical_access_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'PE.L2-3.10.6': {
    evidenceObjects: ["Physical and environmental protection policy", "procedures addressing alternate work sites for personnel", "system security plan", "list of safeguards required for alternate work sites", "asse ssments of safeguards at alternate work sites", "other relevant documents or records"],
    evidenceTagHints: ['system_security_plan', 'policy_document', 'procedure_document'],
  },
  'CM.L2-3.4.1': {
    evidenceObjects: ["Configuration management policy", "procedures addressing the baseline configuration of the system", "procedures addressing system inventory", "system security plan", "configuration management plan", "system inventory records", "inventory review and update records", "enterprise architecture documentation", "system design documentation", "system architecture and configuration documentation", "system configuration settings and associated documentation", "change control records", "system component installation records", "system component removal records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'change_management_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'CM.L2-3.4.2': {
    evidenceObjects: ["Configuration management policy", "baseline configuration", "procedures addressing configuration settings for the system", "configuration management plan", "system security plan", "system design documentation", "system configuration settings and associated documentation", "security configuration checklists", "evidence supporting approved deviations from establis hed configuration settings", "change control records", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'CM.L2-3.4.3': {
    evidenceObjects: ["Configuration management pol icy", "procedures addressing system configuration change control", "configuration management plan", "system architecture and configuration documentation", "system security plan", "change control records", "system audit logs and records", "change control audit and review reports", "agenda/minutes from configuration change control oversight meetings", "other relevant documents or records"],
    evidenceTagHints: ['change_management_record', 'audit_log_sample', 'system_security_plan', 'procedure_document'],
  },
  'CM.L2-3.4.4': {
    evidenceObjects: ["Configuration management policy", "procedures addressing security impact analysis for system changes", "configuration management plan", "security impact analysis documentation", "system security plan", "analysis tools and associated outputs", "change control records", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'CM.L2-3.4.5': {
    evidenceObjects: ["Configuration management policy", "procedures addr essing access restrictions for changes to the system", "system security plan", "configuration management plan", "system design documentation", "system architecture and configuration documentation", "system configuration settings and associated documentation", "logical access approvals", "physical access approvals", "access credentials", "change control records", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'CM.L2-3.4.6': {
    evidenceObjects: ["Configuration management policy", "configuration management plan", "procedures addressing least functionality in the system", "system security plan", "system design documentation", "system configuration settings and associated documentation", "security configuration checklists", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'change_management_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'CM.L2-3.4.7': {
    evidenceObjects: ["Configuration management policy", "procedures addressing least functionality in the system", "configuration management plan", "system security plan", "system design documentation", "security configuration checklists", "system configuration set tings and associated documentation", "specifications for preventing software program execution", "documented reviews of programs, functions, ports, protocols, and/or services", "change control records", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'CM.L2-3.4.8': {
    evidenceObjects: ["Configuration management policy", "procedures addressing least functionality in the system", "system security plan", "configuration management plan", "system design documentation", "system configuration settings and associated documentation", "list of software program s not authorized to execute on the system", "list of software programs authorized to execute on the system", "security configuration checklists", "review and update records associated with list of authorized or unauthorized software programs", "change control records", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['software_inventory', 'configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'CM.L2-3.4.9': {
    evidenceObjects: ["Configuration management policy", "procedures addressing user installed software", "configuration management plan", "system security plan", "system design documentation", "system configuration settings and associated documentation", "list of rules governing user -installed software", "system monitoring records", "system audit logs and records", "continuous monitoring strategy", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'monitoring_tool_configuration', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IA.L1-3.5.1': {
    evidenceObjects: ["Ident ification and authentication policy", "procedures addressing user identification and authentication", "system security plan, system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "list of system accounts", "other relevant documents or records"],
    evidenceTagHints: ['identity_roster', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IA.L1-3.5.2': {
    evidenceObjects: ["Identification and authentication policy", "syste m security plan", "procedures addressing authenticator management", "procedures addressing user identification and authentication", "system design documentation", "list of system authenticator types", "system configuration settings and associated documentation", "chan ge control records associated with managing system authenticators", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['authentication_configuration', 'configuration_baseline_record', 'audit_log_sample', 'policy_document', 'procedure_document'],
  },
  'IA.L2-3.5.3': {
    evidenceObjects: ["Access control policy", "procedures addressing remote access to the system", "system security plan", "system design documentation", "system configuration settings and associated docu mentation", "cryptographic mechanisms and associated configuration documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['remote_access_configuration', 'configuration_baseline_record', 'encryption_configuration', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IA.L2-3.5.4': {
    evidenceObjects: ["Identification and authentication policy", "pr ocedures addressing user identification and authentication", "system security plan", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "list of privileged system accounts", "other relevant documents or records"],
    evidenceTagHints: ['privileged_account_inventory', 'authentication_configuration', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document'],
  },
  'IA.L2-3.5.5': {
    evidenceObjects: ["Identification and authe ntication policy", "system security plan", "procedures addressing authenticator management", "procedures addressing user identification and authentication", "system design documentation", "list of system authenticator types", "system configuration settings and associa ted documentation", "change control records associated with managing system authenticators", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IA.L2-3.5.6': {
    evidenceObjects: ["Identification and authentication policy", "procedures addressing identifier management", "procedures addressing account management", "system security plan", "system design documentation", "system configuration settings and associated documentation", "list of system accounts", "list of identifiers generated from physical access control devices", "other relevant documents or records"],
    evidenceTagHints: ['identity_roster', 'procedure_document', 'authentication_configuration', 'configuration_baseline_record', 'system_security_plan', 'policy_document'],
  },
  'IA.L2-3.5.7': {
    evidenceObjects: ["Identification and authentication policy", "password policy", "procedures addressing authenticator management", "system security plan", "system configuration settings and associated documentation", "system design documentation", "password configurations and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['password_policy_configuration', 'authentication_configuration', 'configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IA.L2-3.5.8': {
    evidenceObjects: ["Identification and authentication policy", "password policy", "procedures addressing authenticator management", "system security plan", "system design documentation", "system configuration settings and associated documentation", "password configurations a nd associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['password_policy_configuration', 'authentication_configuration', 'configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IA.L2-3.5.9': {
    evidenceObjects: ["Identification and authentication policy", "password policy", "procedures addressing authenticator management", "system security plan", "system configuration settings and associated documentation", "system design documentation", "password configurations and associated documentation", "other relevant documents or records"],
    evidenceTagHints: ['password_policy_configuration', 'authentication_configuration', 'configuration_baseline_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IA.L2-3.5.10': {
    evidenceObjects: ["Identification and authentication policy", "system security plan", "procedures addressing authenticator management", "procedures addressing user identification and authentication", "system design documentation", "list of system authenticator types", "system configuration settings and associated documentation", "change control records associated with managing system authenticators", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['authentication_configuration', 'configuration_baseline_record', 'change_management_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'IA.L2-3.5.11': {
    evidenceObjects: ["Identification and authentication policy", "procedures addressing authenticator feedback", "system security plan", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['authentication_configuration', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AU.L2-3.3.1': {
    evidenceObjects: ["Audit and accountability policy", "procedures addressing auditable events", "system security plan", "system design documentation", "system configuration settings and associated documentation", "procedures addressing control of audit records", "procedures addressing audit record generation", "system audit logs and records", "system auditable events", "system incident reports", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'audit_log_configuration', 'incident_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AU.L2-3.3.2': {
    evidenceObjects: ["Access control policy", "procedures addressing unsuccessful logon attempts", "system security plan", "system design documentation", "system configuration settings and associated documentation", "system audit logs and records", "other re levant documents or records"],
    evidenceTagHints: ['account_lockout_configuration', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AU.L2-3.3.3': {
    evidenceObjects: ["Audit and accountability policy", "procedures addressing audit records and event types", "system security plan", "list of organization-defined event types to be logged", "reviewed and updated records of logged event types", "system audit logs and records", "system incident reports", "other relevant documents or records"],
    evidenceTagHints: ['audit_log_sample', 'incident_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AU.L2-3.3.4': {
    evidenceObjects: ["Audit and accountability policy", "procedures addressing response to audit logging processing failures", "system design documentation", "system security plan", "system configuration settings and associated documentation", "list of personnel to be notified in case of an audit logging processing failure", "system incident reports", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'incident_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AU.L2-3.3.5': {
    evidenceObjects: ["Audit and accountability policy", "procedures addressing response to audit logging processing failures", "system design documentation", "system security plan", "system configuration settings and associated documentation", "list of personnel to be notified in case of an audit logging processing failure", "system incident reports", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'incident_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AU.L2-3.3.6': {
    evidenceObjects: ["Audit and accountability policy", "procedures addressing response to audit logging processing failures", "system design documentation", "system security plan", "system configuration settings and associated documentation", "list of personnel to be notified in case of an audit logging processing failure", "system incident reports", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'incident_record', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AU.L2-3.3.7': {
    evidenceObjects: ["Audit and accountability policy", "procedures addressing time stamp generation", "system design documentation", "system security plan", "system configuration settings and associated documentation", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AU.L2-3.3.8': {
    evidenceObjects: ["Audit and accountability policy", "access control policy and procedures", "procedures addressing protection of audit information", "system security plan", "system design documentation", "system configuration settings and associated documentation, system audit logs and records", "audit logging tools", "other relevant documents or records"],
    evidenceTagHints: ['configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
  'AU.L2-3.3.9': {
    evidenceObjects: ["Audit and accountability policy", "access control policy and procedures", "procedures addressing protection of audit information", "system security plan", "system design documentation", "system configuration settings and associated documentation", "access authorizations", "system-generated list of privileged users with access to management of audit logging functionality", "access control list", "system audit logs and records", "other relevant documents or records"],
    evidenceTagHints: ['privileged_account_inventory', 'access_enforcement_configuration', 'configuration_baseline_record', 'audit_log_sample', 'system_security_plan', 'policy_document', 'procedure_document'],
  },
}

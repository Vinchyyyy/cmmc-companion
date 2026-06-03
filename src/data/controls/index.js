import accessControl from './access-control.json'
import awarenessTraining from './awareness-training.json'
import auditAccountability from './audit-accountability.json'
import configurationManagement from './configuration-management.json'
import identificationAuthentication from './identification-authentication.json'
import incidentResponse from './incident-response.json'
import maintenance from './maintenance.json'
import mediaProtection from './media-protection.json'
import personnelSecurity from './personnel-security.json'
import physicalProtection from './physical-protection.json'
import riskAssessment from './risk-assessment.json'
import securityAssessment from './security-assessment.json'
import systemCommunicationsProtection from './system-communications-protection.json'
import systemInformationIntegrity from './system-information-integrity.json'

const controls = [
  ...accessControl,           // AC
  ...awarenessTraining,       // AT
  ...auditAccountability,     // AU
  ...configurationManagement, // CM
  ...identificationAuthentication, // IA
  ...incidentResponse,        // IR
  ...maintenance,             // MA
  ...mediaProtection,         // MP
  ...personnelSecurity,       // PS
  ...physicalProtection,      // PE
  ...riskAssessment,          // RA
  ...securityAssessment,      // CA
  ...systemCommunicationsProtection, // SC
  ...systemInformationIntegrity,     // SI
]

export default controls

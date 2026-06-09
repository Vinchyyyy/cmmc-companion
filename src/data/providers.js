export const PROVIDERS = [
  // Identity & Access
  { id: 'entra-id',       name: 'Microsoft Entra ID',          category: 'Identity & Access' },
  { id: 'okta',           name: 'Okta',                         category: 'Identity & Access' },
  { id: 'ping-identity',  name: 'Ping Identity',                category: 'Identity & Access' },
  { id: 'duo-security',   name: 'Duo Security',                 category: 'Identity & Access' },

  // Endpoint Management
  { id: 'intune',         name: 'Microsoft Intune',             category: 'Endpoint Management' },
  { id: 'jamf-pro',       name: 'Jamf Pro',                     category: 'Endpoint Management' },
  { id: 'workspace-one',  name: 'VMware Workspace ONE',         category: 'Endpoint Management' },

  // Microsoft 365
  { id: 'm365-gcch',      name: 'Microsoft 365 GCC High',       category: 'Microsoft 365' },
  { id: 'm365-gcc',       name: 'Microsoft 365 GCC',            category: 'Microsoft 365' },
  { id: 'm365-commercial',name: 'Microsoft 365 Commercial',     category: 'Microsoft 365' },
  { id: 'defender-ep',    name: 'Microsoft Defender for Endpoint',     category: 'Microsoft 365' },
  { id: 'defender-o365',  name: 'Microsoft Defender for Office 365',   category: 'Microsoft 365' },
  { id: 'exchange-online',name: 'Microsoft Exchange Online',    category: 'Microsoft 365' },
  { id: 'teams',          name: 'Microsoft Teams',              category: 'Microsoft 365' },

  // Cloud
  { id: 'aws-govcloud',   name: 'AWS GovCloud',                 category: 'Cloud' },
  { id: 'aws-commercial', name: 'AWS Commercial',               category: 'Cloud' },
  { id: 'azure-gov',      name: 'Microsoft Azure Government',   category: 'Cloud' },
  { id: 'azure-commercial',name: 'Microsoft Azure Commercial',  category: 'Cloud' },
  { id: 'gcp',            name: 'Google Cloud Platform',        category: 'Cloud' },

  // Security Operations
  { id: 'crowdstrike',    name: 'CrowdStrike Falcon',           category: 'Security Operations' },
  { id: 'tenable-sc',     name: 'Tenable.sc',                   category: 'Security Operations' },
  { id: 'tenable-io',     name: 'Tenable.io',                   category: 'Security Operations' },
  { id: 'sentinel',       name: 'Microsoft Sentinel',           category: 'Security Operations' },
  { id: 'splunk',         name: 'Splunk Enterprise',            category: 'Security Operations' },
  { id: 'rapid7',         name: 'Rapid7 InsightVM',             category: 'Security Operations' },

  // Backup
  { id: 'veeam',          name: 'Veeam Backup & Replication',  category: 'Backup' },
  { id: 'rubrik',         name: 'Rubrik',                       category: 'Backup' },
  { id: 'cohesity',       name: 'Cohesity',                     category: 'Backup' },

  // Network / Infrastructure
  { id: 'cisco-ise',      name: 'Cisco ISE',                    category: 'Network / Infrastructure' },
  { id: 'palo-alto',      name: 'Palo Alto Networks',           category: 'Network / Infrastructure' },
  { id: 'fortinet',       name: 'Fortinet FortiGate',           category: 'Network / Infrastructure' },
]

export const INTERVIEW_ROLE_CATEGORIES = [
  {
    category: 'Executive / Leadership',
    roles: [
      { id: 'ceo',             label: 'Chief Executive Officer',            aliases: [] },
      { id: 'coo',             label: 'Chief Operating Officer',            aliases: [] },
      { id: 'cio',             label: 'Chief Information Officer',          aliases: ['cio'] },
      { id: 'ciso',            label: 'Chief Information Security Officer', aliases: ['ciso'] },
      { id: 'program-manager', label: 'Program Manager',                    aliases: [] },
      { id: 'fso',             label: 'Facility Security Officer',          aliases: ['fso'] },
    ],
  },
  {
    category: 'IT / Security Operations',
    roles: [
      { id: 'system-administrator',    label: 'System Administrator',    aliases: ['sysadmin', 'system admin'] },
      { id: 'network-administrator',   label: 'Network Administrator',   aliases: ['netadmin', 'network admin'] },
      { id: 'security-administrator',  label: 'Security Administrator',  aliases: ['sec admin'] },
      { id: 'security-engineer',       label: 'Security Engineer',       aliases: [] },
      { id: 'it-manager',              label: 'IT Manager',              aliases: [] },
      { id: 'help-desk-technician',    label: 'Help Desk Technician',    aliases: ['helpdesk', 'help desk'] },
      { id: 'endpoint-administrator',  label: 'Endpoint Administrator',  aliases: [] },
      { id: 'cloud-administrator',     label: 'Cloud Administrator',     aliases: [] },
      { id: 'identity-administrator',  label: 'Identity Administrator',  aliases: ['iam', 'entra'] },
      { id: 'soc-analyst',             label: 'SOC Analyst',             aliases: ['soc'] },
      { id: 'incident-response-lead',  label: 'Incident Response Lead',  aliases: ['ir'] },
    ],
  },
  {
    category: 'Governance / Compliance',
    roles: [
      { id: 'compliance-manager',     label: 'Compliance Manager',                     aliases: [] },
      { id: 'issm',                   label: 'Information System Security Manager',    aliases: ['issm'] },
      { id: 'isso',                   label: 'Information System Security Officer',    aliases: ['isso'] },
      { id: 'risk-manager',           label: 'Risk Manager',                           aliases: [] },
      { id: 'policy-owner',           label: 'Policy Owner',                           aliases: [] },
      { id: 'audit-log-reviewer',     label: 'Audit Log Reviewer',                     aliases: [] },
      { id: 'configuration-manager',  label: 'Configuration Manager',                  aliases: [] },
      { id: 'change-manager',         label: 'Change Manager',                         aliases: [] },
    ],
  },
  {
    category: 'Human Resources / Personnel Security',
    roles: [
      { id: 'hr-manager',                       label: 'HR Manager',                       aliases: ['hr'] },
      { id: 'hr-specialist',                    label: 'HR Specialist',                    aliases: ['hr'] },
      { id: 'personnel-security-representative', label: 'Personnel Security Representative', aliases: [] },
      { id: 'hiring-manager',                   label: 'Hiring Manager',                   aliases: [] },
      { id: 'training-coordinator',             label: 'Training Coordinator',             aliases: [] },
    ],
  },
  {
    category: 'Physical / Facilities',
    roles: [
      { id: 'facilities-manager',         label: 'Facilities Manager',         aliases: ['facilities'] },
      { id: 'physical-security-manager',  label: 'Physical Security Manager',  aliases: ['badge'] },
      { id: 'visitor-management',         label: 'Visitor Management Personnel', aliases: [] },
      { id: 'reception-personnel',        label: 'Reception Personnel',        aliases: [] },
      { id: 'badge-administrator',        label: 'Badge Administrator',        aliases: ['badge'] },
    ],
  },
  {
    category: 'Engineering / Development',
    roles: [
      { id: 'software-developer',        label: 'Software Developer',        aliases: [] },
      { id: 'devops-engineer',           label: 'DevOps Engineer',           aliases: [] },
      { id: 'system-owner',              label: 'System Owner',              aliases: [] },
      { id: 'product-owner',             label: 'Product Owner',             aliases: [] },
      { id: 'application-administrator', label: 'Application Administrator', aliases: [] },
    ],
  },
  {
    category: 'Business / Data Owners',
    roles: [
      { id: 'data-owner',            label: 'Data Owner',            aliases: [] },
      { id: 'business-process-owner', label: 'Business Process Owner', aliases: [] },
      { id: 'department-manager',    label: 'Department Manager',    aliases: [] },
      { id: 'cui-program-owner',     label: 'CUI Program Owner',     aliases: [] },
    ],
  },
]

export const ALL_INTERVIEW_ROLES = INTERVIEW_ROLE_CATEGORIES.flatMap((cat) =>
  cat.roles.map((r) => ({ ...r, category: cat.category }))
)

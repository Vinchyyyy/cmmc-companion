import instructions from '../data/dibcacImportInstructions.md?raw'
import { PLAN_KIND, PLAN_VERSION, objectiveCatalog } from './dibcacPlanImport.js'

export const exampleDibcacPlan = {
  kind: PLAN_KIND, version: PLAN_VERSION,
  folders: [{ id: 'access-review', name: 'Access Review' }],
  groups: [
    {
      id: 'identity-group', name: 'Identity and Access', folderId: 'access-review',
      objectives: ['AC.L1-3.1.1[a]'],
      checklist: [
        { id: 'identity-header', type: 'header', text: 'Authorized Users' },
        { id: 'identity-users', type: 'item', text: 'Authorized user roster shown', objKeys: ['AC.L1-3.1.1[a]'] },
      ],
      plannedAsk: '!USER / IDENTITY!\n- show the authorized user roster @G1-1.1\n  - if authentication comes up, pivot to @G2-1.1',
    },
    {
      id: 'authentication-group', name: 'Authentication', folderId: 'access-review',
      objectives: ['IA.L1-3.5.2[a]'],
      checklist: [
        { id: 'authentication-header', type: 'header', text: 'User Authentication' },
        { id: 'authentication-users', type: 'item', text: 'User authentication before access shown', objKeys: ['IA.L1-3.5.2[a]'] },
      ],
      plannedAskRichDocument: { version: 1, blocks: [
        { type: 'topic', indent: 0, topicAnchorId: 'authentication-topic', children: [{ type: 'text', text: 'AUTHENTICATION' }] },
        { type: 'bullet', indent: 0, children: [
          { type: 'text', text: 'Walk through user authentication ', bold: true, color: 'blue', size: 'large' },
          { type: 'checklistRef', groupId: 'authentication-group', itemId: 'authentication-users' },
        ] },
        { type: 'bullet', indent: 1, children: [
          { type: 'text', text: 'If user authorization is discussed, return to ', color: 'amber' },
          { type: 'checklistRef', groupId: 'identity-group', itemId: 'identity-users' },
        ] },
      ] },
    },
  ],
}

export function buildDibcacImportInstructions() {
  return `${instructions}\n\n## Complete importable example\n\n\`\`\`json\n${JSON.stringify(exampleDibcacPlan, null, 2)}\n\`\`\`\n\n## Valid objective catalog\n\nUse exact IDs. This catalog validates spelling; it does not define your assessment scope.\n\n${objectiveCatalog.map((obj) => `- **${obj.key}** — ${obj.objText}`).join('\n')}\n`
}

/**
 * Multisig Plugin
 * 
 * Council-only proposal creation and approval
 */

import { registerPlugin, type GovernancePlugin } from '../index';

// Plugin configuration
const multisigPlugin: GovernancePlugin = {
  id: 'multisig',
  name: 'Multisig Council',
  description: 'Council-only proposal creation and multi-signature approval',
  version: '1.0.0',
  enabled: true,
  routes: [
    {
      path: '/governance/multisig',
      component: () => import('./pages/MultisigPage'),
      title: 'Multisig Council',
    },
    {
      path: '/governance/multisig/:proposalId',
      component: () => import('./pages/MultisigProposalPage'),
      title: 'Multisig Proposal',
    },
  ],
  contractAddress: process.env.MULTISIG_CONTRACT_ADDRESS,
};

// Register plugin on import
registerPlugin(multisigPlugin);

export default multisigPlugin;


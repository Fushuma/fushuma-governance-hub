/**
 * Token Voting Plugin
 * 
 * Standard token-weighted voting mechanism
 */

import { registerPlugin, type GovernancePlugin } from '../index';

// Plugin configuration
const tokenVotingPlugin: GovernancePlugin = {
  id: 'token-voting',
  name: 'Token Voting',
  description: 'Standard token-weighted voting for governance proposals',
  version: '1.0.0',
  enabled: true,
  routes: [
    {
      path: '/governance/token-voting',
      component: () => import('./pages/TokenVotingPage'),
      title: 'Token Voting',
    },
    {
      path: '/governance/token-voting/:proposalId',
      component: () => import('./pages/ProposalDetailPage'),
      title: 'Proposal Details',
    },
  ],
  contractAddress: process.env.TOKEN_VOTING_CONTRACT_ADDRESS,
};

// Register plugin on import
registerPlugin(tokenVotingPlugin);

export default tokenVotingPlugin;


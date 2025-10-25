/**
 * Optimistic Voting Plugin
 * 
 * Proposals created by council, vetoed by token holders
 */

import { registerPlugin, type GovernancePlugin } from '../index';

// Plugin configuration
const optimisticVotingPlugin: GovernancePlugin = {
  id: 'optimistic-voting',
  name: 'Optimistic Governance',
  description: 'Council creates proposals, token holders can veto',
  version: '1.0.0',
  enabled: true,
  routes: [
    {
      path: '/governance/optimistic',
      component: () => import('./pages/OptimisticVotingPage'),
      title: 'Optimistic Governance',
    },
    {
      path: '/governance/optimistic/:proposalId',
      component: () => import('./pages/OptimisticProposalPage'),
      title: 'Optimistic Proposal',
    },
  ],
  contractAddress: process.env.OPTIMISTIC_VOTING_CONTRACT_ADDRESS,
};

// Register plugin on import
registerPlugin(optimisticVotingPlugin);

export default optimisticVotingPlugin;


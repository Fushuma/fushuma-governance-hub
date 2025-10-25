import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, polygon, arbitrum, optimism, base } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import type { Chain } from 'wagmi/chains'

// Fushuma Network configuration
export const fushuma = {
  id: 121224,
  name: 'Fushuma',
  nativeCurrency: {
    decimals: 18,
    name: 'FUMA',
    symbol: 'FUMA',
  },
  rpcUrls: {
    default: { http: ['https://rpc.fushuma.com'] },
    public: { http: ['https://rpc.fushuma.com'] },
  },
  blockExplorers: {
    default: { name: 'FumaScan', url: 'https://fumascan.com' },
  },
  testnet: false,
} as const satisfies Chain

// WalletConnect Cloud project ID - you can get one at https://cloud.walletconnect.com
const projectId = process.env.VITE_WALLETCONNECT_PROJECT_ID || 'fushuma-governance-hub'

export const config = createConfig({
  chains: [fushuma, mainnet, sepolia, polygon, arbitrum, optimism, base],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ 
      projectId,
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'Fushuma Governance Hub',
    }),
  ],
  transports: {
    [fushuma.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}


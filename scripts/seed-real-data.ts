import { db } from "../server/db";
import { newsFeed, developmentGrants } from "../drizzle/schema";

async function seedRealData() {
  console.log("🌱 Starting real data seeding from Telegram and GitHub...");

  // Clear existing data
  await db.delete(newsFeed);
  await db.delete(developmentGrants);

  // Real news from Telegram channel
  const newsData = [
    {
      title: "The New Layer: Weekly Crypto Deconstruction #9",
      content: "What do ZK-Proofs, an Irish legal bill, and a billionaire's investment portfolio have in common? They are the components of a new layer being built on top of and within the crypto ecosystem.\n\nThis week, we deconstruct:\n• ZK-Proofs: Now automating KYC/AML verification for the state.\n• Ireland: National law creating a de facto global standard for encryption access.\n• Stakeholder Capital: Embedding surveillance-state interests within decentralized protocols.\n\nThe 20th-century model of control is obsolete. This is the new one.",
      category: "analysis",
      author: "Fushuma Team",
      publishedAt: new Date("2025-10-25"),
      tags: ["crypto", "analysis", "zkproofs", "regulation"],
    },
    {
      title: "Fushuma Featured at Comic-Con 2025",
      content: "As part of the Fushuma Grant Program, Whaleden developed a brand new Fushuma comic pitch, and it's now one of five stories competing live at the Comic-Con.\n\nThe audience decides which pitch gets published!\n\nVladimir Vencalek, our co-founder is on site... and he's got a feeling about one pitch in particular 👀",
      category: "community",
      author: "Fushuma Team",
      publishedAt: new Date("2025-04-13"),
      tags: ["grants", "community", "comic-con"],
    },
    {
      title: 'New Community Article: "Growing Together"',
      content: "What if tokens could do more than sit in wallets? 🧐\n\nThe latest article written by a Fushuma community member, explores how each FUMA purchase helps fund new developments and returns value to holders through airdrops.\n\nHighlights:\n• Treasury-funded projects = Airdrops for token holders.\n• Liquidity is protected in user-accessible pools.\n• Governance is transparent and token-based.",
      category: "community",
      author: "Community Member",
      publishedAt: new Date("2025-04-16"),
      tags: ["community", "governance", "treasury"],
    },
    {
      title: "FIP-2 Complete: From $75k to a Live Ecosystem",
      content: "Hey everyone, we're excited to announce that FIP #2 is officially complete!\n\nWhen we launched our $75,000 pre-sale, we made a promise: build a working product, and today we can say: Promise Kept.\n\n📌 Here is a summary of what we delivered:\n• A Live PoW L2 Mainnet: The 'impossible' is now a reality.\n• Full Infrastructure: A cross-chain bridge, a multi-chain launchpad, and the first dApp (Wallet Roulette) are all live and operational.\n• A Community: We funded over 20 developer grants before our public sale.\n• Financial Transparency: We believe in accountability.",
      category: "announcement",
      author: "Fushuma Team",
      publishedAt: new Date("2025-06-20"),
      tags: ["milestone", "fip", "mainnet"],
    },
    {
      title: "Grant #33 Funded: Welcoming Don Pablo Coin to Fushuma",
      content: "A recent political scandal involving 468 BTC has made the headlines. For Fushuma, it also presents an opportunity to support an innovative use case on our platform.\n\nToday, we are pleased to announce our latest grant: $20,000 in FUMA has been allocated to support the launch of Don Pablo Coin ($DPC).\n\n$DPC is a satirical project based on the 'Bitcoingate' affair, introducing the concept of a 'Real-World Event' (RWE) coin.\n\nWhy is this a strategic grant for Fushuma?\n• Increased Visibility: The project's connection to a current news story is designed to attract public interest.\n• Direct Value for the Treasury: In return for the grant, the Fushuma Treasury will receive 7.5% of the total $DPC supply.\n• Fostering Innovation: Supporting special projects like $DPC is central to our mission.",
      category: "grants",
      author: "Fushuma Team",
      publishedAt: new Date("2025-07-09"),
      tags: ["grants", "don-pablo-coin", "innovation"],
    },
  ];

  console.log("📰 Seeding news from Telegram...");
  for (const item of newsData) {
    await db.insert(newsFeed).values(item);
    console.log(`✅ Added news: ${item.title}`);
  }

  // Real grants from GitHub issues
  const grantsData = [
    {
      title: "Fushuma Launchpad: UI Finalization and Fushuma ICO Integration",
      applicantName: "Development Team",
      contactInfo: "GitHub Issue #38",
      description: "We're seeking developers to finalize the EVM + MetaMask integration in the Fushuma Launchpad. This grant extends the work completed in Grant #22, which delivered upgraded EVM contracts, Solana contract deployment, and a redesigned, user-friendly interface.",
      valueProposition: "Complete the EVM integration to enable MetaMask support and full contract interaction for the Fushuma Launchpad, making it accessible to the broader Ethereum ecosystem.",
      deliverables: "1. Add MetaMask support to the UI\n2. Connect EVM contract\n3. Ensure full interaction with core functions\n4. Testing and documentation",
      roadmap: "Phase 1 (Week 1-2): MetaMask UI integration\nPhase 2 (Week 3-4): EVM contract connection\nPhase 3 (Week 5-6): Testing and deployment",
      fundingRequest: 15000,
      receivingWallet: null,
      status: "review",
      submittedBy: 1,
      githubIssueUrl: "https://github.com/Fushuma/Dev_grants/issues/38",
    },
    {
      title: "Fushuma Social Media Management",
      applicantName: "CaviarXYZ",
      contactInfo: "GitHub Issue #37",
      description: "Grant proposal for professional social media management to increase Fushuma's visibility and community engagement across Twitter, LinkedIn, Reddit, and other platforms.",
      valueProposition: "Increase Fushuma's visibility and community engagement through professional social media management, leading to increased adoption and community growth.",
      deliverables: "1. Daily content creation and posting\n2. Community engagement and moderation\n3. Analytics and reporting\n4. Campaign coordination",
      roadmap: "Month 1-2: Content strategy development\nMonth 3-6: Daily posting and engagement\nMonth 7-12: Analytics and optimization",
      fundingRequest: 8000,
      receivingWallet: null,
      status: "submitted",
      submittedBy: 1,
      githubIssueUrl: "https://github.com/Fushuma/Dev_grants/issues/37",
    },
    {
      title: "TimberChain Grant Proposal: Token & Audit",
      applicantName: "Timberchain Team",
      contactInfo: "GitHub Issue #36",
      description: "TimberChain is a blockchain-based platform for sustainable forestry management. This grant will fund the token development and security audit.",
      valueProposition: "Bring sustainable forestry management to the blockchain, demonstrating Fushuma's commitment to real-world use cases and environmental sustainability.",
      deliverables: "1. ERC-20 token development\n2. Smart contract security audit\n3. Integration with Fushuma ecosystem\n4. Documentation and testing",
      roadmap: "Phase 1 (Month 1): Token development\nPhase 2 (Month 2): Security audit\nPhase 3 (Month 3): Integration and launch",
      fundingRequest: 25000,
      receivingWallet: null,
      status: "submitted",
      submittedBy: 1,
      githubIssueUrl: "https://github.com/Fushuma/Dev_grants/issues/36",
    },
    {
      title: "Don Pablo Coin ($DPC) - Real-World Event Token",
      applicantName: "DonPabloCoin Team",
      contactInfo: "GitHub Issue #33",
      description: "A satirical project based on the 'Bitcoingate' affair, introducing the concept of a 'Real-World Event' (RWE) coin. The Fushuma Treasury will receive 7.5% of the total $DPC supply in return for the grant.",
      valueProposition: "Explore a new application for community tokens and bring a unique project to the Fushuma ecosystem. This grant provides direct value to the treasury through token allocation.",
      deliverables: "1. Token launch on Fushuma\n2. Marketing campaign\n3. 7.5% token allocation to Fushuma Treasury\n4. Community building",
      roadmap: "Phase 1: Token development and launch\nPhase 2: Marketing and awareness\nPhase 3: Community growth and engagement",
      fundingRequest: 20000,
      receivingWallet: null,
      status: "approved",
      submittedBy: 1,
      githubIssueUrl: "https://github.com/Fushuma/Dev_grants/issues/33",
    },
    {
      title: "Fushuma: The Comic Pitch Initiative",
      applicantName: "Whaleden / john-mjtd",
      contactInfo: "GitHub Issue #29",
      description: "Whaleden developed a brand new Fushuma comic pitch competing at Comic-Con 2025. This grant supports the development of Fushuma-themed creative content to increase brand awareness and community engagement.",
      valueProposition: "Increase brand awareness and community engagement through creative storytelling, reaching new audiences at Comic-Con and beyond.",
      deliverables: "1. Comic pitch development\n2. Artwork and storytelling\n3. Presentation at Comic-Con\n4. Community voting integration",
      roadmap: "Phase 1: Comic development\nPhase 2: Comic-Con presentation\nPhase 3: Community engagement and voting",
      fundingRequest: 12000,
      receivingWallet: null,
      status: "in_progress",
      submittedBy: 1,
      githubIssueUrl: "https://github.com/Fushuma/Dev_grants/issues/29",
    },
    {
      title: "Fushuma Bridge Grant Proposal",
      applicantName: "spatialiste",
      contactInfo: "GitHub Issue #28",
      description: "Development of a cross-chain bridge connecting Fushuma Network with Ethereum, Polygon, and other major chains. The bridge will support asset transfers with minimal fees and fast confirmation times.",
      valueProposition: "Enable seamless cross-chain asset transfers, expanding Fushuma's reach and interoperability with major blockchain networks.",
      deliverables: "1. Multi-chain support (Ethereum, Polygon, BSC)\n2. Security mechanisms and auditing\n3. User-friendly interface\n4. Transaction monitoring and analytics",
      roadmap: "Phase 1 (Month 1-2): Core bridge development\nPhase 2 (Month 3-4): Security audit\nPhase 3 (Month 5-6): UI and deployment",
      fundingRequest: 50000,
      receivingWallet: null,
      status: "review",
      submittedBy: 1,
      githubIssueUrl: "https://github.com/Fushuma/Dev_grants/issues/28",
    },
    {
      title: "Wallet Roulette Casino DApp",
      applicantName: "ERROR-SYS",
      contactInfo: "GitHub Issue #21",
      description: "A decentralized casino application built on Fushuma Network. The first dApp in the Fushuma ecosystem, demonstrating the platform's capabilities for gaming and entertainment.",
      valueProposition: "Demonstrate Fushuma's capabilities for gaming and entertainment, attracting new users and showcasing the platform's potential for dApp development.",
      deliverables: "1. Provably fair gaming\n2. Multiple casino games\n3. FUMA token integration\n4. Responsive UI/UX",
      roadmap: "Phase 1: Smart contract development\nPhase 2: Frontend development\nPhase 3: Testing and launch",
      fundingRequest: 18000,
      receivingWallet: null,
      status: "approved",
      submittedBy: 1,
      githubIssueUrl: "https://github.com/Fushuma/Dev_grants/issues/21",
    },
    {
      title: "DeFi Platform Based on UniSwap V3",
      applicantName: "spatialiste",
      contactInfo: "GitHub Issue #17",
      description: "Creating and launching a DeFi platform based on UniSwap V3 on Fushuma Network. This will provide liquidity pools, token swaps, and yield farming opportunities for the Fushuma ecosystem.",
      valueProposition: "Bring DeFi capabilities to Fushuma Network, enabling liquidity pools, token swaps, and yield farming for the ecosystem.",
      deliverables: "1. UniSwap V3 fork adaptation\n2. Liquidity pool creation\n3. Yield farming mechanisms\n4. Analytics dashboard",
      roadmap: "Phase 1 (Month 1-2): UniSwap V3 adaptation\nPhase 2 (Month 3-4): Liquidity pools and farming\nPhase 3 (Month 5-6): Analytics and optimization",
      fundingRequest: 35000,
      receivingWallet: null,
      status: "submitted",
      submittedBy: 1,
      githubIssueUrl: "https://github.com/Fushuma/Dev_grants/issues/17",
    },
  ];

  console.log("🚀 Seeding grants from GitHub...");
  for (const grant of grantsData) {
    await db.insert(developmentGrants).values(grant);
    console.log(`✅ Added grant: ${grant.title}`);
  }

  console.log("✨ Real data seeding completed successfully!");
  console.log(`Summary:`);
  console.log(`- ${newsData.length} news items from Telegram`);
  console.log(`- ${grantsData.length} grants from GitHub`);
  console.log("🎉 Seeding process finished!");
}

seedRealData()
  .then(() => {
    console.log("✅ Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });


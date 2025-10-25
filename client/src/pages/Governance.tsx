import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalCard } from "@/components/governance/ProposalCard";
import { ProposalForm } from "@/components/governance/ProposalForm";
import { Plus, Vote, TrendingUp, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { Proposal as ProposalType } from "@/components/governance/ProposalCard";

export default function Governance() {
  const { isAuthenticated } = useAuth();
  const { address, isConnected } = useAccount();
  const [proposalFormOpen, setProposalFormOpen] = useState(false);

  // Fetch proposals from API
  const { data: proposals = [], isLoading, refetch } = trpc.governance.list.useQuery();
  
  // Vote mutation
  const voteMutation = trpc.governance.vote.useMutation({
    onSuccess: () => {
      toast.success("Vote submitted successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to vote: ${error.message}`);
    },
  });

  const handleVote = async (proposalId: number, support: boolean) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet to vote");
      return;
    }

    try {
      await voteMutation.mutateAsync({
        proposalId,
        voteChoice: support ? "for" : "against",
        voterAddress: address,
        votingPower: 1, // TODO: Calculate actual voting power from token balance
      });
    } catch (error) {
      console.error("Vote error:", error);
    }
  };

  // Convert database proposals to component format
  const convertedProposals: ProposalType[] = proposals.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status as "active" | "passed" | "rejected" | "pending",
    votesFor: p.votesFor || 0,
    votesAgainst: p.votesAgainst || 0,
    totalVotes: p.totalVotes || 0,
    endDate: new Date(p.endDate),
    proposer: p.proposer,
  }));

  const activeProposals = convertedProposals.filter(p => p.status === "active");
  const closedProposals = convertedProposals.filter(p => p.status !== "active");

  // Calculate total votes across all proposals
  const totalVotesCast = convertedProposals.reduce((sum, p) => sum + p.totalVotes, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Governance</h1>
            <p className="text-muted-foreground">
              Participate in Fushuma's decentralized governance and shape the future of the ecosystem
            </p>
          </div>
          {isAuthenticated && isConnected && (
            <Button size="lg" onClick={() => setProposalFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Proposal
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
              <Vote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProposals.length}</div>
              <p className="text-xs text-muted-foreground">
                Currently open for voting
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Votes Cast</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalVotesCast.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all proposals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Voting Power</CardTitle>
              <Vote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isConnected ? "1" : "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                FUMA tokens (TODO: fetch actual balance)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Connection Notice */}
        {!isConnected && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardContent className="py-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet to Vote</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You need to connect your wallet to participate in governance
                </p>
                <p className="text-xs text-muted-foreground">
                  Use the "Connect Wallet" button in the navigation bar
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Proposals Tabs */}
        {!isLoading && (
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active">
                Active ({activeProposals.length})
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed ({closedProposals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeProposals.length > 0 ? (
                activeProposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onVote={handleVote}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No active proposals</p>
                    {isAuthenticated && isConnected && (
                      <Button 
                        className="mt-4" 
                        onClick={() => setProposalFormOpen(true)}
                      >
                        Create First Proposal
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="closed" className="space-y-4">
              {closedProposals.length > 0 ? (
                closedProposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No closed proposals</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Proposal Form Dialog */}
        <ProposalForm
          open={proposalFormOpen}
          onOpenChange={setProposalFormOpen}
          onSuccess={() => refetch()}
        />
      </main>
    </div>
  );
}


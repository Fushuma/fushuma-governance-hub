import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  TrendingUp, 
  Vote, 
  Clock, 
  Award, 
  Users, 
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

interface GovernanceDashboardProps {
  userAddress?: string;
}

export function GovernanceDashboard({ userAddress }: GovernanceDashboardProps) {
  // TODO: Replace with actual data from tRPC
  const mockData = {
    votingPower: 15420,
    totalVotingPower: 1000000,
    activeProposals: 3,
    votedProposals: 12,
    totalProposals: 25,
    veNFTs: [
      {
        id: 1,
        amount: 10000,
        startTime: new Date('2024-01-15'),
        votingPower: 12500,
        multiplier: 1.25,
      },
      {
        id: 2,
        amount: 5000,
        startTime: new Date('2024-06-01'),
        votingPower: 2920,
        multiplier: 1.58,
      },
    ],
    recentVotes: [
      {
        proposalId: 1,
        title: 'Increase Grant Budget for Q1 2025',
        vote: 'for',
        votingPower: 15420,
        timestamp: new Date('2024-10-20'),
      },
      {
        proposalId: 2,
        title: 'Update Governance Parameters',
        vote: 'against',
        votingPower: 15420,
        timestamp: new Date('2024-10-15'),
      },
    ],
    participationRate: 68,
  };

  const votingPowerPercentage = (mockData.votingPower / mockData.totalVotingPower) * 100;
  const participationPercentage = (mockData.votedProposals / mockData.totalProposals) * 100;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Voting Power</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.votingPower.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {votingPowerPercentage.toFixed(2)}% of total
            </p>
            <Progress value={votingPowerPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.activeProposals}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your vote
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participationPercentage.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {mockData.votedProposals} of {mockData.totalProposals} proposals
            </p>
            <Progress value={participationPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">veNFTs Held</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.veNFTs.length}</div>
            <p className="text-xs text-muted-foreground">
              Total locked: {mockData.veNFTs.reduce((sum, nft) => sum + nft.amount, 0).toLocaleString()} FUMA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="venft" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="venft">My veNFTs</TabsTrigger>
          <TabsTrigger value="votes">Voting History</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="venft" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your veNFT Holdings</CardTitle>
              <CardDescription>
                Locked tokens with increasing voting power over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockData.veNFTs.map((nft) => {
                const daysSinceLock = Math.floor(
                  (Date.now() - nft.startTime.getTime()) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <div key={nft.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">veNFT #{nft.id}</h4>
                        <Badge variant="secondary">{nft.multiplier.toFixed(2)}x multiplier</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Locked: {nft.amount.toLocaleString()} FUMA • {daysSinceLock} days ago
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{nft.votingPower.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Voting Power</p>
                    </div>
                  </div>
                );
              })}
              
              {mockData.veNFTs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You don't have any veNFTs yet.</p>
                  <p className="text-sm">Lock FUMA tokens to participate in governance.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="votes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Votes</CardTitle>
              <CardDescription>
                Your voting history on governance proposals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockData.recentVotes.map((vote) => (
                <div key={vote.proposalId} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {vote.vote === 'for' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : vote.vote === 'against' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <h4 className="font-semibold">{vote.title}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Proposal #{vote.proposalId}</span>
                      <span>•</span>
                      <span>{vote.timestamp.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={vote.vote === 'for' ? 'default' : vote.vote === 'against' ? 'destructive' : 'secondary'}>
                      {vote.vote.toUpperCase()}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {vote.votingPower.toLocaleString()} VP
                    </p>
                  </div>
                </div>
              ))}

              {mockData.recentVotes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You haven't voted on any proposals yet.</p>
                  <p className="text-sm">Start participating in governance!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Participation Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Proposals Voted</span>
                    <span className="font-medium">{mockData.votedProposals}/{mockData.totalProposals}</span>
                  </div>
                  <Progress value={participationPercentage} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Voting Power Share</span>
                    <span className="font-medium">{votingPowerPercentage.toFixed(3)}%</span>
                  </div>
                  <Progress value={votingPowerPercentage} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average Multiplier</span>
                    <span className="font-medium">
                      {(mockData.veNFTs.reduce((sum, nft) => sum + nft.multiplier, 0) / mockData.veNFTs.length).toFixed(2)}x
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Governance Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Votes Cast</span>
                  <span className="text-2xl font-bold">{mockData.votedProposals}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Since</span>
                  <span className="font-medium">
                    {mockData.veNFTs[0]?.startTime.toLocaleDateString() || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Participation Rank</span>
                  <Badge>Top 10%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


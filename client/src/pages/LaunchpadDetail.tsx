import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { ExternalLink, Rocket, ThumbsDown, ThumbsUp } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

export default function LaunchpadDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: project, isLoading } = trpc.launchpad.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const { data: userVote } = trpc.launchpad.getUserVote.useQuery(
    { projectId: Number(id) },
    { enabled: !!id && isAuthenticated }
  );

  const voteMutation = trpc.launchpad.vote.useMutation({
    onSuccess: () => {
      toast.success("Vote submitted successfully!");
      utils.launchpad.getById.invalidate({ id: Number(id) });
      utils.launchpad.getUserVote.invalidate({ projectId: Number(id) });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit vote");
    },
  });

  const handleVote = (support: boolean) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    voteMutation.mutate({ projectId: Number(id), support });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-12">
          <h1 className="text-2xl font-bold">Project not found</h1>
          <Button onClick={() => setLocation("/launchpad")} className="mt-4">
            Back to Launchpad
          </Button>
        </div>
      </div>
    );
  }

  const totalVotes = (project.votesFor || 0) + (project.votesAgainst || 0);
  const approvalRate = totalVotes > 0 ? ((project.votesFor || 0) / totalVotes) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "voting":
        return "text-green-400";
      case "review":
        return "text-yellow-400";
      case "approved":
        return "text-blue-400";
      case "rejected":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-12 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/launchpad")}
          className="mb-6"
        >
          ← Back to Launchpad
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">{project.title}</h1>
                <p className={`text-sm uppercase font-semibold ${getStatusColor(project.status)}`}>
                  {project.status}
                </p>
              </div>
              {project.websiteUrl && (
                <Button variant="outline" asChild>
                  <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Website
                  </a>
                </Button>
              )}
            </div>
            <p className="text-lg text-muted-foreground">{project.description}</p>
          </div>

          {/* Voting Card */}
          {project.status === "voting" && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Community Vote
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Approval Rate</span>
                    <span className="text-sm font-bold">{approvalRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={approvalRate} className="h-3" />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>For: {(project.votesFor || 0).toLocaleString()}</span>
                    <span>Against: {(project.votesAgainst || 0).toLocaleString()}</span>
                  </div>
                </div>

                {userVote ? (
                  <div className="text-center py-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      You voted: {userVote.voteChoice === 'for' ? "For ✓" : "Against ✗"}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <Button
                      className="flex-1"
                      onClick={() => handleVote(true)}
                      disabled={voteMutation.isPending}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Vote For
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleVote(false)}
                      disabled={voteMutation.isPending}
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Vote Against
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Funding Details */}
          <Card>
            <CardHeader>
              <CardTitle>Funding Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Funding Request</p>
                  <p className="text-2xl font-bold">{project.fundingAmount.toLocaleString()} FUMA</p>
                </div>
                {project.airdropAllocation && (
                  <div>
                    <p className="text-sm text-muted-foreground">Airdrop Allocation</p>
                    <p className="text-2xl font-bold">{project.airdropAllocation.toLocaleString()} {project.tokenSymbol || 'tokens'}</p>
                  </div>
                )}
              </div>
              {project.tokenSymbol && (
                <div>
                  <p className="text-sm text-muted-foreground">Token Symbol</p>
                  <p className="text-lg font-semibold">{project.tokenSymbol}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Information */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="tokenomics">Tokenomics</TabsTrigger>
              <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Background</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.teamBackground || "Team information not provided."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tokenomics" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tokenomics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.tokenomics || "Tokenomics information not provided."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roadmap" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Roadmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.roadmap || "Roadmap not provided."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}


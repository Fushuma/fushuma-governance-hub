
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { ExternalLink, MessageSquare, Calendar, DollarSign, GitBranch } from "lucide-react";
import { useParams, useLocation } from "wouter";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";

export default function GrantDetailEnhanced() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: grant, isLoading } = trpc.grants.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );
  const { data: milestones } = trpc.grants.getMilestones.useQuery(
    { grantId: Number(id) },
    { enabled: !!id }
  );
  const { data: comments } = trpc.grants.getComments.useQuery(
    { grantId: Number(id) },
    { enabled: !!id }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "in_progress": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "review": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "completed": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const parseReactions = (reactionsStr: string | null) => {
    if (!reactionsStr) return null;
    try {
      return JSON.parse(reactionsStr);
    } catch {
      return null;
    }
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

  if (!grant) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-12">
          <h1 className="text-2xl font-bold">Grant not found</h1>
          <Button onClick={() => setLocation("/grants")} className="mt-4">
            Back to Grants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-12 max-w-6xl">
        <Button variant="ghost" onClick={() => setLocation("/grants")} className="mb-6">
          ← Back to Grants
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {grant.githubIssueNumber && (
                  <Badge variant="outline" className="text-muted-foreground">
                    #{grant.githubIssueNumber}
                  </Badge>
                )}
                <Badge className={getStatusColor(grant.status)}>
                  {grant.status}
                </Badge>
                {grant.githubIssueState && (
                  <Badge variant={grant.githubIssueState === 'open' ? 'default' : 'secondary'}>
                    {grant.githubIssueState}
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-2">{grant.title}</h1>
              
              {/* Author info */}
              {grant.githubAuthor && grant.createdAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={grant.githubAuthorAvatar || undefined} />
                    <AvatarFallback>{grant.githubAuthor[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{grant.githubAuthor}</span>
                  <span className="text-sm">opened {formatDistanceToNow(new Date(grant.createdAt!))} ago</span>
                </div>
              )}
            </div>

            {grant.githubIssueUrl && (
              <Button variant="outline" asChild>
                <a href={grant.githubIssueUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on GitHub
                </a>
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Funding Request</p>
                    <p className="text-2xl font-bold">{grant.fundingRequest.toLocaleString()} FUMA</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Community Discussion</p>
                    <p className="text-2xl font-bold">{grant.githubCommentCount || 0} comments</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-lg font-semibold">
                      {grant.updatedAt ? formatDistanceToNow(new Date(grant.updatedAt)) : 'N/A'} ago
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Full Issue Body */}
          {grant.githubIssueBody && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Grant Proposal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{grant.githubIssueBody}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Milestones */}
          {milestones && milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="border-l-2 border-primary pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{milestone.title}</h3>
                        <Badge variant="outline">{milestone.status}</Badge>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      )}
                      <p className="text-sm font-semibold mt-2">{milestone.amount.toLocaleString()} FUMA</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Community Discussion */}
          {comments && comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Community Discussion ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {comments.map((comment, index) => {
                    const reactions = parseReactions(comment.reactions);
                    return (
                      <div key={comment.id}>
                        <div className="flex gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={comment.authorAvatar || undefined} />
                            <AvatarFallback>{comment.author[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-muted rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{comment.author}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt))} ago
                                  </span>
                                </div>
                              </div>
                              <div className="prose prose-sm prose-invert max-w-none">
                                <ReactMarkdown>{comment.body}</ReactMarkdown>
                              </div>
                              {reactions && (
                                <div className="flex gap-2 mt-3 flex-wrap">
                                  {reactions['+1'] > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      👍 {reactions['+1']}
                                    </Badge>
                                  )}
                                  {reactions.heart > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      ❤️ {reactions.heart}
                                    </Badge>
                                  )}
                                  {reactions.rocket > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      🚀 {reactions.rocket}
                                    </Badge>
                                  )}
                                  {reactions.eyes > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      👀 {reactions.eyes}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {index < comments.length - 1 && <Separator className="my-4" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ExternalLink } from "lucide-react";
import { useParams, useLocation } from "wouter";

export default function GrantDetail() {
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
      <div className="container py-12 max-w-5xl">
        <Button variant="ghost" onClick={() => setLocation("/grants")} className="mb-6">
          ← Back to Grants
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{grant.title}</h1>
            <p className="text-sm text-primary uppercase font-semibold">{grant.status}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Grant Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Applicant</p>
                <p className="text-lg font-semibold">{grant.applicantName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Funding Request</p>
                <p className="text-2xl font-bold">{grant.fundingRequest.toLocaleString()} FUMA</p>
              </div>
              {grant.githubIssueUrl && (
                <Button variant="outline" asChild>
                  <a href={grant.githubIssueUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on GitHub
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {grant.description}
              </p>
            </CardContent>
          </Card>

          {grant.valueProposition && (
            <Card>
              <CardHeader>
                <CardTitle>Value Proposition</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {grant.valueProposition}
                </p>
              </CardContent>
            </Card>
          )}

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
                        <span className="text-sm text-primary">{milestone.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      <p className="text-sm font-semibold mt-2">{milestone.amount.toLocaleString()} FUMA</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

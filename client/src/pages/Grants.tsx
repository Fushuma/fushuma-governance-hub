import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { DollarSign, Filter, ArrowUpDown } from "lucide-react";
import { Link } from "wouter";
import { GrantApplicationForm } from "@/components/GrantApplicationForm";

type SortOption = "newest" | "oldest" | "most_comments";
type StatusFilter = "all" | "approved" | "in_progress" | "review" | "completed" | "rejected";

export default function Grants() {
  const { isAuthenticated } = useAuth();
  const { data: grants, isLoading } = trpc.grants.list.useQuery();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showApplicationForm, setShowApplicationForm] = useState(false);

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

  const filteredAndSortedGrants = useMemo(() => {
    if (!grants) return [];

    // Filter by status
    let filtered = grants;
    if (statusFilter !== "all") {
      filtered = grants.filter(grant => grant.status === statusFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "oldest":
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "most_comments":
          return (b.githubCommentCount || 0) - (a.githubCommentCount || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [grants, statusFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Development Grants</h1>
            <p className="text-muted-foreground">
              Apply for funding to build tools and initiatives that benefit the Fushuma ecosystem
            </p>
          </div>
          {isAuthenticated && (
            <Button size="lg" onClick={() => setShowApplicationForm(true)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Apply for Grant
            </Button>
          )}
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="most_comments">Most Comments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground flex items-center">
            Showing {filteredAndSortedGrants.length} of {grants?.length || 0} grants
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedGrants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No grants found matching your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedGrants.map((grant) => (
              <Link key={grant.id} href={`/grants/${grant.id}`}>
                <Card className="hover:border-primary/50 transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {grant.githubIssueNumber && (
                            <span className="text-xs text-muted-foreground">#{grant.githubIssueNumber}</span>
                          )}
                          <CardTitle className="text-2xl">{grant.title}</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {grant.description}
                        </p>
                        {grant.githubCommentCount && grant.githubCommentCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            💬 {grant.githubCommentCount} comments
                          </p>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(grant.status)}`}>
                          {grant.status}
                        </span>
                        <p className="text-xl font-bold mt-2">{grant.fundingRequest.toLocaleString()} FUMA</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <GrantApplicationForm 
        open={showApplicationForm} 
        onOpenChange={setShowApplicationForm} 
      />
    </div>
  );
}


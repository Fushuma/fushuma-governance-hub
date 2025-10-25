import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ExternalLink, ThumbsUp } from "lucide-react";

export default function Community() {
  const { isAuthenticated } = useAuth();
  const { data: content, isLoading } = trpc.community.list.useQuery();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Community Showcase</h1>
            <p className="text-muted-foreground">Discover content created by the Fushuma community</p>
          </div>
          {isAuthenticated && (
            <Button size="lg">Submit Content</Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {content?.map((item) => (
              <Card key={item.id} className="hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{item.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{item.excerpt}</p>
                      <div className="flex items-center gap-4 mt-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {item.contentType}
                        </span>
                        <span className="text-xs text-muted-foreground">by {item.authorName}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-sm">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{item.upvotes}</span>
                      </div>
                      {item.contentUrl && (
                        <a
                          href={item.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

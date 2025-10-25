import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ExternalLink } from "lucide-react";

export default function News() {
  const { data: news, isLoading } = trpc.news.list.useQuery();

  const getSourceColor = (source: string) => {
    switch (source) {
      case "official": return "bg-blue-500/20 text-blue-400";
      case "github": return "bg-purple-500/20 text-purple-400";
      case "telegram": return "bg-cyan-500/20 text-cyan-400";
      case "partner": return "bg-green-500/20 text-green-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Fushuma Dojo</h1>
          <p className="text-muted-foreground">Stay updated with the latest news and developments</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {news?.map((item) => (
              <Card key={item.id} className="hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-2xl">{item.title}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full ${getSourceColor(item.source)}`}>
                      {item.source}
                    </span>
                  </div>
                  {item.excerpt && (
                    <p className="text-muted-foreground">{item.excerpt}</p>
                  )}
                </CardHeader>
                {item.sourceUrl && (
                  <CardContent>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Read more <ExternalLink className="w-3 h-3" />
                    </a>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

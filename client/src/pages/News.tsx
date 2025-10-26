import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Calendar, User } from "lucide-react";

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    {item.author && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{item.author}</span>
                      </div>
                    )}
                    {item.publishedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(item.publishedAt)}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Full Content - Display the complete message body */}
                  {item.content && (
                    <div className="prose prose-sm max-w-none mb-4">
                      <p className="whitespace-pre-wrap text-foreground">{item.content}</p>
                    </div>
                  )}
                  
                  {/* Fallback to excerpt if no content */}
                  {!item.content && item.excerpt && (
                    <p className="text-muted-foreground mb-4">{item.excerpt}</p>
                  )}
                  
                  {/* Source Link */}
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 mt-4"
                    >
                      View on {item.source === 'telegram' ? 'Telegram' : 'Source'} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {/* Empty State */}
            {news && news.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No news available yet. Check back soon!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


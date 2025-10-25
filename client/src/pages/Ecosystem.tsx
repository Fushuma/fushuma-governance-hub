import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ExternalLink } from "lucide-react";

export default function Ecosystem() {
  const { data: projects, isLoading } = trpc.ecosystem.list.useQuery();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Ecosystem Directory</h1>
          <p className="text-muted-foreground">Explore all projects built within the Fushuma ecosystem</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map((project) => (
              <Card key={project.id} className="hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle>{project.name}</CardTitle>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {project.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </CardHeader>
                {project.websiteUrl && (
                  <CardContent>
                    <a
                      href={project.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Visit website <ExternalLink className="w-3 h-3" />
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

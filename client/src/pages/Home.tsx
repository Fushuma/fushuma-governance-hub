import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="text-xl font-bold text-foreground">{APP_TITLE}</div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Button asChild>
                  <a href="/dashboard">Go to Dashboard</a>
                </Button>
              ) : (
                <Button asChild>
                  <a href={getLoginUrl()}>Sign In</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Fushuma Governance Hub
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              The nexus for community interaction, governance, and economic activity in the Fushuma ecosystem.
              Participate in decentralized decision-making, fund innovative projects, and shape the future of Web3.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="/launchpad">Explore Launchpad</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/grants">View Grants</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Three Pillars of Governance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-lg border border-border">
                <h3 className="text-2xl font-bold mb-4">🏛️ The Dojo</h3>
                <p className="text-muted-foreground mb-4">
                  Stay informed with aggregated news, community content, and ecosystem updates from all official channels.
                </p>
                <Button variant="link" asChild className="p-0">
                  <a href="/news">Visit Dojo →</a>
                </Button>
              </div>

              <div className="bg-background p-6 rounded-lg border border-border">
                <h3 className="text-2xl font-bold mb-4">🚀 Launchpad</h3>
                <p className="text-muted-foreground mb-4">
                  Discover new projects, participate in governance votes, and receive airdrops from Treasury-funded ventures.
                </p>
                <Button variant="link" asChild className="p-0">
                  <a href="/launchpad">Explore Projects →</a>
                </Button>
              </div>

              <div className="bg-background p-6 rounded-lg border border-border">
                <h3 className="text-2xl font-bold mb-4">💡 Grants</h3>
                <p className="text-muted-foreground mb-4">
                  Apply for funding to build tools and initiatives that benefit the entire Fushuma ecosystem.
                </p>
                <Button variant="link" asChild className="p-0">
                  <a href="/grants">View Grants →</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-6">Empowering Community-Driven Growth</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Fushuma is more than a blockchain—it's a decentralized venture club where token holders collectively
              discover, validate, and fund the next generation of high-potential projects. With 40% of the total
              token supply allocated to a community-controlled Treasury, your voice matters.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4">
                <div className="text-4xl font-bold text-primary mb-2">40%</div>
                <p className="text-sm text-muted-foreground">Treasury controlled by community</p>
              </div>
              <div className="p-4">
                <div className="text-4xl font-bold text-primary mb-2">100%</div>
                <p className="text-sm text-muted-foreground">Transparent governance</p>
              </div>
              <div className="p-4">
                <div className="text-4xl font-bold text-primary mb-2">∞</div>
                <p className="text-sm text-muted-foreground">Opportunities to participate</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto text-center max-w-3xl">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join the Fushuma community today and start participating in the future of decentralized governance.
            </p>
            {isAuthenticated ? (
              <Button size="lg" asChild>
                <a href="/dashboard">Go to Dashboard</a>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <a href={getLoginUrl()}>Sign In to Participate</a>
              </Button>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 Fushuma. A decentralized ecosystem for community-driven innovation.</p>
        </div>
      </footer>
    </div>
  );
}

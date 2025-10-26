import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_TITLE } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, Menu } from "lucide-react";
import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AuthModal } from "@/components/AuthModal";

export default function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/governance", label: "Governance" },
    { href: "/launchpad", label: "Launchpad" },
    { href: "/grants", label: "Grants" },
    { href: "/news", label: "Dojo News" },
    { href: "/ecosystem", label: "Ecosystem" },
    { href: "/community", label: "Community" },
  ];

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <a className="text-xl font-bold text-foreground hover:text-primary transition-colors">
                {APP_TITLE}
              </a>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  My Dashboard
                </Button>
              </Link>
            )}
            
            <div className="hidden md:block">
              <ConnectButton showBalance={false} chainStatus="icon" />
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Sign Out
              </Button>
            ) : (
              <Button size="sm" onClick={() => setAuthModalOpen(true)}>
                Sign In
              </Button>
            )}
            
            <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-border">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <a
                  className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}


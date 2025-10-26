import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Mail } from "lucide-react";
import { useAccount, useSignMessage, useConnect } from "wagmi";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { connect, connectors } = useConnect();

  const handleWalletAuth = async () => {
    try {
      setIsLoading(true);
      
      if (!isConnected) {
        // Connect wallet first
        const connector = connectors[0];
        if (connector) {
          connect({ connector });
        }
        return;
      }

      // Get nonce from server
      const nonceResponse = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = await nonceResponse.json();

      // Sign message
      const message = `Sign this message to authenticate with Fushuma Governance Hub.\n\nNonce: ${nonce}`;
      const signature = await signMessageAsync({ message });

      // Verify signature and login
      const loginResponse = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          message,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error('Authentication failed');
      }

      toast.success('Successfully authenticated!');
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error('Wallet auth error:', error);
      toast.error('Failed to authenticate with wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/email/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send magic link');
      }

      toast.success('Magic link sent! Check your email.');
      setEmail('');
    } catch (error) {
      console.error('Email auth error:', error);
      toast.error('Failed to send magic link');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign In to Fushuma</DialogTitle>
          <DialogDescription>
            Choose your preferred authentication method
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="wallet" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wallet">
              <Wallet className="w-4 h-4 mr-2" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect your Web3 wallet to sign in securely
              </p>
              {isConnected && address && (
                <p className="text-xs text-muted-foreground">
                  Connected: {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              )}
            </div>
            <Button
              onClick={handleWalletAuth}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing...' : isConnected ? 'Sign Message' : 'Connect Wallet'}
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We'll send you a magic link to sign in
                </p>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </form>
          </TabsContent>


        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAccount } from "wagmi";

interface ProposalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProposalForm({ open, onOpenChange, onSuccess }: ProposalFormProps) {
  const { address } = useAccount();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quorum, setQuorum] = useState("100000");
  const [votingDays, setVotingDays] = useState("7");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createProposal = trpc.governance.create.useMutation({
    onSuccess: () => {
      toast.success("Proposal created successfully!");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to create proposal: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setQuorum("100000");
    setVotingDays("7");
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (title.length < 10) {
      toast.error("Title must be at least 10 characters");
      return;
    }

    if (description.length < 50) {
      toast.error("Description must be at least 50 characters");
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Start in 24 hours
    const endDate = new Date(startDate.getTime() + parseInt(votingDays) * 24 * 60 * 60 * 1000);

    try {
      await createProposal.mutateAsync({
        title,
        description,
        proposer: address,
        quorum: parseInt(quorum),
        startDate,
        endDate,
      });
    } catch (error) {
      // Error handling is done in onError callback
      console.error("Failed to create proposal:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Proposal</DialogTitle>
          <DialogDescription>
            Submit a new governance proposal for the community to vote on.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter proposal title (min 10 characters)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={10}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide a detailed description of your proposal (min 50 characters)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={50}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {description.length} characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quorum">Quorum (FUMA tokens)</Label>
                <Input
                  id="quorum"
                  type="number"
                  placeholder="100000"
                  value={quorum}
                  onChange={(e) => setQuorum(e.target.value)}
                  required
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum votes required to pass
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="votingDays">Voting Period (days)</Label>
                <Input
                  id="votingDays"
                  type="number"
                  placeholder="7"
                  value={votingDays}
                  onChange={(e) => setVotingDays(e.target.value)}
                  required
                  min="1"
                  max="30"
                />
                <p className="text-xs text-muted-foreground">
                  Duration for voting (1-30 days)
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="text-sm font-semibold">Proposal Timeline</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Voting starts in 24 hours after submission</li>
                <li>• Voting period: {votingDays} days</li>
                <li>• Quorum required: {parseInt(quorum).toLocaleString()} FUMA</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Proposal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


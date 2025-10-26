import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface GrantApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrantApplicationForm({ open, onOpenChange }: GrantApplicationFormProps) {
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    title: "",
    applicantName: "",
    contactInfo: "",
    description: "",
    valueProposition: "",
    deliverables: "",
    roadmap: "",
    fundingRequest: "",
    receivingWallet: "",
  });

  const createGrantMutation = trpc.grants.create.useMutation({
    onSuccess: () => {
      toast.success("Grant application submitted successfully!");
      onOpenChange(false);
      utils.grants.list.invalidate();
      // Reset form
      setFormData({
        title: "",
        applicantName: "",
        contactInfo: "",
        description: "",
        valueProposition: "",
        deliverables: "",
        roadmap: "",
        fundingRequest: "",
        receivingWallet: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit grant application");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title || !formData.applicantName || !formData.description || 
        !formData.valueProposition || !formData.deliverables || !formData.roadmap || 
        !formData.fundingRequest) {
      toast.error("Please fill in all required fields");
      return;
    }

    const fundingAmount = parseFloat(formData.fundingRequest);
    if (isNaN(fundingAmount) || fundingAmount <= 0) {
      toast.error("Please enter a valid funding amount");
      return;
    }

    createGrantMutation.mutate({
      title: formData.title,
      applicantName: formData.applicantName,
      contactInfo: formData.contactInfo || undefined,
      description: formData.description,
      valueProposition: formData.valueProposition,
      deliverables: formData.deliverables,
      roadmap: formData.roadmap,
      fundingRequest: fundingAmount,
      receivingWallet: formData.receivingWallet || undefined,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for Development Grant</DialogTitle>
          <DialogDescription>
            Submit your proposal to receive funding for building on the Fushuma ecosystem.
            All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Enter your project title"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicantName">Applicant Name *</Label>
            <Input
              id="applicantName"
              value={formData.applicantName}
              onChange={(e) => handleChange("applicantName", e.target.value)}
              placeholder="Your name or team name"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactInfo">Contact Information</Label>
            <Input
              id="contactInfo"
              value={formData.contactInfo}
              onChange={(e) => handleChange("contactInfo", e.target.value)}
              placeholder="Email, Telegram, Discord, etc."
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Project Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Provide a clear and concise description of your project (min 100 characters)"
              rows={4}
              minLength={100}
              maxLength={5000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/5000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valueProposition">Value Proposition *</Label>
            <Textarea
              id="valueProposition"
              value={formData.valueProposition}
              onChange={(e) => handleChange("valueProposition", e.target.value)}
              placeholder="Explain how your project benefits the Fushuma ecosystem (min 50 characters)"
              rows={3}
              minLength={50}
              maxLength={5000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.valueProposition.length}/5000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliverables">Deliverables *</Label>
            <Textarea
              id="deliverables"
              value={formData.deliverables}
              onChange={(e) => handleChange("deliverables", e.target.value)}
              placeholder="List the specific deliverables and milestones (min 50 characters)"
              rows={3}
              minLength={50}
              maxLength={5000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.deliverables.length}/5000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadmap">Roadmap & Timeline *</Label>
            <Textarea
              id="roadmap"
              value={formData.roadmap}
              onChange={(e) => handleChange("roadmap", e.target.value)}
              placeholder="Provide a timeline for your project with key milestones (min 50 characters)"
              rows={3}
              minLength={50}
              maxLength={5000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.roadmap.length}/5000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fundingRequest">Funding Request (FUMA) *</Label>
            <Input
              id="fundingRequest"
              type="number"
              value={formData.fundingRequest}
              onChange={(e) => handleChange("fundingRequest", e.target.value)}
              placeholder="Enter amount in FUMA tokens"
              min="1"
              step="1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receivingWallet">Receiving Wallet Address</Label>
            <Input
              id="receivingWallet"
              value={formData.receivingWallet}
              onChange={(e) => handleChange("receivingWallet", e.target.value)}
              placeholder="0x... (Ethereum address)"
              maxLength={42}
            />
            <p className="text-xs text-muted-foreground">
              The wallet address where you'll receive the grant funds
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createGrantMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createGrantMutation.isPending}>
              {createGrantMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Submit Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export interface Proposal {
  id: number;
  title: string;
  description: string;
  status: "active" | "passed" | "rejected" | "pending";
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  endDate: Date;
  proposer: string;
}

interface ProposalCardProps {
  proposal: Proposal;
  onVote?: (proposalId: number, support: boolean) => void;
  userVote?: boolean | null;
}

export function ProposalCard({ proposal, onVote, userVote }: ProposalCardProps) {
  const percentFor = proposal.totalVotes > 0 
    ? (proposal.votesFor / proposal.totalVotes) * 100 
    : 0;
  
  const percentAgainst = proposal.totalVotes > 0 
    ? (proposal.votesAgainst / proposal.totalVotes) * 100 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "passed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const isActive = proposal.status === "active";
  const timeLeft = proposal.endDate.getTime() - Date.now();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  return (
    <Card className="hover:border-primary/50 transition-all">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl">{proposal.title}</CardTitle>
          <Badge className={`${getStatusColor(proposal.status)} border`}>
            {proposal.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {proposal.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voting Results */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>For: {proposal.votesFor.toLocaleString()}</span>
            </div>
            <span className="text-muted-foreground">{percentFor.toFixed(1)}%</span>
          </div>
          <Progress value={percentFor} className="h-2 bg-muted" />
          
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span>Against: {proposal.votesAgainst.toLocaleString()}</span>
            </div>
            <span className="text-muted-foreground">{percentAgainst.toFixed(1)}%</span>
          </div>
          <Progress value={percentAgainst} className="h-2 bg-muted" />
        </div>

        {/* Time Left */}
        {isActive && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{daysLeft} days left to vote</span>
          </div>
        )}

        {/* Voting Buttons */}
        {isActive && onVote && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onVote(proposal.id, true)}
              disabled={userVote !== null}
              variant={userVote === true ? "default" : "outline"}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {userVote === true ? "Voted For" : "Vote For"}
            </Button>
            <Button
              onClick={() => onVote(proposal.id, false)}
              disabled={userVote !== null}
              variant={userVote === false ? "destructive" : "outline"}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {userVote === false ? "Voted Against" : "Vote Against"}
            </Button>
          </div>
        )}

        {/* Proposer */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Proposed by: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
        </div>
      </CardContent>
    </Card>
  );
}


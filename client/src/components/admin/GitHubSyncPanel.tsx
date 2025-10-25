import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Github } from "lucide-react";
import { trpc } from "../../lib/trpc";

export function GitHubSyncPanel() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ synced: number; errors: number } | null>(null);

  const { data: syncStatus, isLoading } = trpc.github.getSyncStatus.useQuery();
  const syncMutation = trpc.github.syncGrants.useMutation({
    onSuccess: (data) => {
      setLastSync(data);
      setSyncing(false);
    },
    onError: (error) => {
      console.error('Sync failed:', error);
      setSyncing(false);
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Integration</CardTitle>
          <CardDescription>Loading sync status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub Grants Sync
            </CardTitle>
            <CardDescription>
              Synchronize grant data from {syncStatus?.repository}
            </CardDescription>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Auto-Sync Status</label>
            <div className="flex items-center gap-2">
              {syncStatus?.autoSyncEnabled ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="default">Enabled</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <Badge variant="secondary">Disabled</Badge>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sync Interval</label>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                {syncStatus?.syncInterval 
                  ? `${Math.floor(syncStatus.syncInterval / 60000)} minutes`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Last Sync Results */}
        {lastSync && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Last sync completed: {lastSync.synced} grants synced, {lastSync.errors} errors
            </AlertDescription>
          </Alert>
        )}

        {syncMutation.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Sync failed: {syncMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Info */}
        <div className="pt-4 border-t space-y-2">
          <h4 className="text-sm font-semibold">Configuration</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Repository: {syncStatus?.repository}</p>
            <p>• Auto-sync: {syncStatus?.autoSyncEnabled ? 'Enabled' : 'Disabled'}</p>
            <p>• Sync interval: {syncStatus?.syncInterval ? `${Math.floor(syncStatus.syncInterval / 60000)} minutes` : 'N/A'}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="pt-4 border-t space-y-2">
          <h4 className="text-sm font-semibold">How it works</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Fetches grant issues from GitHub repository</li>
            <li>Parses issue content for grant information</li>
            <li>Updates database with latest grant data</li>
            <li>Runs automatically based on configured interval</li>
          </ul>
        </div>

        {/* Environment Variables */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">Environment Variables</h4>
          <div className="bg-muted p-3 rounded-md text-xs font-mono space-y-1">
            <div>GITHUB_TOKEN=your_github_token</div>
            <div>ENABLE_GITHUB_AUTO_SYNC=true</div>
            <div>GITHUB_SYNC_INTERVAL=3600000</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


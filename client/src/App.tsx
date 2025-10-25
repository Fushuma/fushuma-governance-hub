import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Launchpad from "./pages/Launchpad";
import LaunchpadDetail from "./pages/LaunchpadDetail";
import Grants from "./pages/Grants";
import GrantDetail from "./pages/GrantDetail";
import News from "./pages/News";
import Ecosystem from "./pages/Ecosystem";
import Community from "./pages/Community";
import Dashboard from "./pages/Dashboard";
import Governance from "./pages/Governance";
import Epochs from "./pages/Epochs";
import Gauges from "./pages/Gauges";
import NewsV2 from "./pages/NewsV2";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/launchpad"} component={Launchpad} />
      <Route path={"/launchpad/:id"} component={LaunchpadDetail} />
      <Route path={"/grants"} component={Grants} />
      <Route path={"/grants/:id"} component={GrantDetail} />
      <Route path={"/news"} component={News} />
      <Route path={"/ecosystem"} component={Ecosystem} />
      <Route path={"/community"} component={Community} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/governance"} component={Governance} />
      <Route path={"/epochs"} component={Epochs} />
      <Route path={"/gauges"} component={Gauges} />
      <Route path={"/news-v2"} component={NewsV2} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

/** Signal Ledger design: the full page is intentionally a single editorial briefing rather than a fragmented app shell. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MarketingStudio from "./pages/MarketingStudio";
import AdminOperations from "./pages/AdminOperations";
import Home from "./pages/Home";
import Portal from "./pages/Portal";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/portal" component={Portal} />
      <Route path="/admin/operations" component={AdminOperations} />
      <Route path="/admin/marketing" component={MarketingStudio} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

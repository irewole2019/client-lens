import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import PublicProject from "@/pages/public-project";
import PublicFile from "@/pages/public-file";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Projects} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/p/:publicId" component={PublicProject} />
      <Route path="/f/:publicId" component={PublicFile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

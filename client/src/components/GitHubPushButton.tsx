import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Github, Loader2, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function GitHubPushButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handlePush = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/github/push");
      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        toast({
          title: "Success!",
          description: result.existing 
            ? `Code pushed to existing repository: ${result.repoUrl}`
            : `New repository created: ${result.repoUrl}`,
        });
        
        // Open the repository in a new tab
        window.open(result.repoUrl, '_blank');
        
        // Reset success state after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error: any) {
      console.error("Error pushing to GitHub:", error);
      toast({
        title: "Error",
        description: "Failed to push to GitHub. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePush}
      disabled={isLoading}
      className="flex items-center gap-2"
      data-testid="github-push-button"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : success ? (
        <Check className="h-4 w-4" />
      ) : (
        <Github className="h-4 w-4" />
      )}
      {isLoading ? "Pushing..." : success ? "Pushed!" : "Push to GitHub"}
    </Button>
  );
}
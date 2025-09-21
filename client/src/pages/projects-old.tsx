import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, FolderOpen, ArrowRight, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertProjectSchema } from "@shared/schema";
import { ProjectWithFiles, formatTimeAgo } from "@/lib/types";
import { z } from "zod";

const formSchema = insertProjectSchema.extend({
  title: z.string().min(1, "Project title is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Projects() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<ProjectWithFiles[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      form.reset();
      setIsCreateModalOpen(false);
      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createProjectMutation.mutate(data);
  };

  const copyShareLink = async (project: ProjectWithFiles, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const shareUrl = `${window.location.origin}/p/${project.publicId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedProjectId(project.id);
      setTimeout(() => setCopiedProjectId(null), 2000);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to your clipboard.",
      });
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Failed to copy",
        description: "Unable to copy the share link. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-slate-900">Client Lens</h1>
              <nav className="ml-8 hidden md:block">
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <span>Projects</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="text-slate-900">All Projects</span>
                </div>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">User #1</span>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">U</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Projects Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">My Projects</h2>
            <p className="text-slate-600 mt-1">Organize and manage your project files</p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-full">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter project title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createProjectMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3 mb-4"></div>
                <div className="flex space-x-2 mb-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                  <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                  <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{project.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">Created {formatTimeAgo(project.createdAt)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-slate-100"
                        onClick={(e) => copyShareLink(project, e)}
                        title="Copy share link"
                      >
                        {copiedProjectId === project.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Share2 className="w-4 h-4 text-slate-500" />
                        )}
                      </Button>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                        {project.fileCount} files
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mb-4">
                    {project.fileCount > 0 ? (
                      <>
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <FolderOpen className="w-5 h-5 text-slate-400" />
                        </div>
                        {project.fileCount > 1 && (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <span className="text-xs text-slate-500">+{project.fileCount - 1}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Updated {formatTimeAgo(project.updatedAt)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No projects yet</h3>
            <p className="text-slate-500 mb-6">Create your first project to get started</p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { Plus, ExternalLink, Copy, FileText, Image as ImageIcon, Film, Folder, MessageCircle, AlertCircle, Clock, FolderOpen, ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2, FolderPlus } from "lucide-react";
import { GitHubPushButton } from "@/components/GitHubPushButton";
import { formatDistanceToNow } from "date-fns";

interface Folder {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

interface ProjectWithCommentStats {
  id: string;
  publicId: string;
  title: string;
  userId: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  files?: any[];
  fileCount?: number;
  totalComments: number;
  unresolvedComments: number;
  lastCommentTime: Date | null;
  hasUnreadComments: boolean;
}

export default function Projects() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectWithCommentStats[]>({
    queryKey: ["/api/projects"],
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const isLoading = projectsLoading || foldersLoading;

  const markProjectViewed = useMutation({
    mutationFn: (projectId: string) =>
      fetch(`/api/projects/${projectId}/viewed`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((res) => res.json()),
    onSuccess: (folder) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setShowNewFolderInput(false);
      setNewFolderName("");
      setExpandedFolders((prev) => new Set([...Array.from(prev), folder.id]));
      toast({ title: "Folder created!" });
    },
  });

  const updateFolder = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fetch(`/api/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setEditingFolderId(null);
      setEditingFolderName("");
      toast({ title: "Folder renamed!" });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/folders/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Folder deleted. Projects moved to Unfiled." });
    },
  });

  const copyShareLink = (publicId: string) => {
    const shareUrl = `${window.location.origin}/p/${publicId}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Share link copied to clipboard!" });
  };

  const handleProjectClick = (projectId: string) => {
    markProjectViewed.mutate(projectId);
    setLocation(`/projects/${projectId}`);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder.mutate(newFolderName.trim());
    }
  };

  const handleRenameFolder = (folderId: string) => {
    if (editingFolderName.trim()) {
      updateFolder.mutate({ id: folderId, name: editingFolderName.trim() });
    }
  };

  // Group projects by folder
  const projectsByFolder = projects.reduce((acc, project) => {
    const key = project.folderId || "unfiled";
    if (!acc[key]) acc[key] = [];
    acc[key].push(project);
    return acc;
  }, {} as Record<string, ProjectWithCommentStats[]>);

  const unfiledProjects = projectsByFolder["unfiled"] || [];

  const getProjectThumbnail = (project: ProjectWithCommentStats) => {
    if (!project.files || project.files.length === 0) {
      return (
        <div className="w-full h-full bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
          <Folder className="h-8 w-8 text-slate-400" />
        </div>
      );
    }

    // Find first image
    const firstImage = project.files.find((f: any) => f.mimeType.startsWith("image/"));
    if (firstImage) {
      return (
        <img
          src={firstImage.objectPath}
          alt={project.title}
          className="w-full h-full object-cover"
        />
      );
    }

    // Find first video
    const firstVideo = project.files.find((f: any) => f.mimeType.startsWith("video/"));
    if (firstVideo) {
      return (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
          <video
            src={firstVideo.objectPath}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <Film className="h-8 w-8 text-white" />
          </div>
        </div>
      );
    }

    // Find first PDF
    const firstPDF = project.files.find((f: any) => f.mimeType === "application/pdf");
    if (firstPDF) {
      return (
        <div className="w-full h-full bg-red-50 dark:bg-red-950 flex items-center justify-center">
          <FileText className="h-8 w-8 text-red-500" />
        </div>
      );
    }

    // Default fallback
    return (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <FileText className="h-8 w-8 text-slate-400" />
      </div>
    );
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground">
            Manage your project files and share them publicly
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GitHubPushButton />
          <Button variant="outline" onClick={() => setShowNewFolderInput(true)} className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* New Folder Input */}
      {showNewFolderInput && (
        <Card className="mb-4">
          <CardContent className="py-3 flex items-center gap-3">
            <FolderPlus className="h-5 w-5 text-slate-400" />
            <Input
              placeholder="Folder name (e.g., Smith Wedding)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
              className="flex-1"
            />
            <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {projects.length === 0 && folders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Folder className="h-8 w-8 text-slate-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No projects yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  Create your first project and start uploading files to get started
                </p>
              </div>
              <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Project
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Folders */}
          {folders.map((folder) => {
            const folderProjects = projectsByFolder[folder.id] || [];
            const isExpanded = expandedFolders.has(folder.id);
            const isEditing = editingFolderId === folder.id;

            return (
              <Collapsible key={folder.id} open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
                <div className="flex items-center gap-2 mb-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <FolderOpen className="h-5 w-5 text-amber-500" />
                  
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRenameFolder(folder.id)}
                        autoFocus
                        className="h-8"
                      />
                      <Button size="sm" onClick={() => handleRenameFolder(folder.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingFolderId(null); setEditingFolderName(""); }}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-lg">{folder.name}</span>
                      <Badge variant="secondary" className="ml-2">{folderProjects.length} projects</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="ml-auto p-1">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}>
                            <Pencil className="h-4 w-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteFolder.mutate(folder.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>

                <CollapsibleContent>
                  {folderProjects.length === 0 ? (
                    <div className="text-sm text-slate-500 ml-10 mb-4">No projects in this folder yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ml-6">
                      {folderProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onProjectClick={handleProjectClick}
                          onCopyShareLink={copyShareLink}
                          getProjectThumbnail={getProjectThumbnail}
                        />
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Unfiled Projects */}
          {unfiledProjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Folder className="h-5 w-5 text-slate-400" />
                <span className="font-semibold text-lg text-slate-600 dark:text-slate-400">Unfiled</span>
                <Badge variant="secondary" className="ml-2">{unfiledProjects.length} projects</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {unfiledProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onProjectClick={handleProjectClick}
                    onCopyShareLink={copyShareLink}
                    getProjectThumbnail={getProjectThumbnail}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => setShowCreateModal(false)}
      />
      </div>
    </div>
  );
}

// Extracted ProjectCard component for reuse
function ProjectCard({
  project,
  onProjectClick,
  onCopyShareLink,
  getProjectThumbnail,
}: {
  project: ProjectWithCommentStats;
  onProjectClick: (id: string) => void;
  onCopyShareLink: (publicId: string) => void;
  getProjectThumbnail: (project: ProjectWithCommentStats) => React.ReactNode;
}) {
  return (
    <div
      className="relative bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 flex flex-col gap-3 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200"
      onClick={() => onProjectClick(project.id)}
    >
      {/* Thumbnail */}
      <div className="relative h-32 w-full rounded-lg overflow-hidden">
        {getProjectThumbnail(project)}

        {/* Unread Badge */}
        {project.hasUnreadComments && (
          <span className="absolute top-2 right-2 bg-red-600 text-xs text-white px-2 py-1 rounded-full shadow font-medium">
            New
          </span>
        )}
      </div>

      {/* Project Info */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">
              {project.title}
            </h3>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-3">
                <span>{project.fileCount || 0} files</span>
                <span>{project.totalComments} comments</span>
                {project.unresolvedComments > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {project.unresolvedComments} unresolved
                  </span>
                )}
              </div>
            </div>
          </div>

          {project.lastCommentTime && (
            <div className="text-xs text-slate-400 dark:text-slate-500 text-right">
              Last: {formatDistanceToNow(new Date(project.lastCommentTime), { addSuffix: true })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onCopyShareLink(project.publicId);
            }}
            className="flex-1 text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Share
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/p/${project.publicId}`, "_blank");
            }}
            className="flex-1 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Public
          </Button>
        </div>

        {/* Created Date */}
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

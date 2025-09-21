import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertComment, Comment } from "@shared/schema";

type CommentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  xPercent?: number;
  yPercent?: number;
  parentId?: string;
  replyToComment?: Comment;
  onSubmit?: (data: {
    name: string;
    email?: string;
    comment: string;
    xPercent?: number;
    yPercent?: number;
  }) => void;
};

export const CommentModal: React.FC<CommentModalProps> = ({
  open,
  onOpenChange,
  fileId,
  xPercent,
  yPercent,
  parentId,
  replyToComment,
  onSubmit,
}) => {
  const [form, setForm] = React.useState({ name: "", email: "", comment: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCommentMutation = useMutation({
    mutationFn: async (data: InsertComment) => {
      return apiRequest("POST", "/api/comments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", fileId] });
      toast({
        title: "Comment added!",
        description: "Your comment has been saved successfully.",
      });
      onOpenChange(false);
      setForm({ name: "", email: "", comment: "" });
    },
    onError: (error) => {
      console.error("Error creating comment:", error);
      toast({
        title: "Error",
        description: "Failed to save comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onSubmit) {
      onSubmit({ ...form, xPercent, yPercent });
      return;
    }

    if (!form.name.trim() || !form.comment.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const commentData: InsertComment = {
      fileId,
      parentId,
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      content: form.comment.trim(),
      tag: "To Do",
      positionX: xPercent ? Math.round(xPercent * 100) : undefined,
      positionY: yPercent ? Math.round(yPercent * 100) : undefined,
    };

    createCommentMutation.mutate(commentData);
  };

  console.log('💬 CommentModal render:', { open, xPercent, yPercent, fileId });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
        <Dialog.Content className="fixed z-50 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md w-full">
          <Dialog.Title className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
            {replyToComment ? 'Reply to Comment' : 'Add Comment'}
          </Dialog.Title>
          {replyToComment ? (
            <div className="mb-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Replying to <strong>{replyToComment.name}</strong>:
              </div>
              <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded text-xs">
                "{replyToComment.content}"
              </div>
            </div>
          ) : (
            <Dialog.Description className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {xPercent && yPercent 
                ? 'Add a comment at this position on the image.' 
                : 'Add a new comment to this file.'
              }
            </Dialog.Description>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name (Project Owner, Reviewer, etc.)"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your.email@example.com"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Comment</label>
              <textarea
                required
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your comment..."
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createCommentMutation.isPending}
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {createCommentMutation.isPending ? "Saving..." : "Add Comment"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
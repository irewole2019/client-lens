import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, Clock, Reply, CheckCircle2, Circle, Clock as ClockIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { buildCommentTree, type CommentWithReplies } from "@/lib/commentUtils";

import type { Comment } from "@shared/schema";

interface ThreadedCommentListProps {
  comments: Comment[];
  fileId: string;
  onCommentClick?: (commentId: string) => void;
  highlightedCommentId?: string;
  onReply?: (comment: Comment) => void;
}

export function ThreadedCommentList({ 
  comments, 
  fileId, 
  onCommentClick, 
  highlightedCommentId,
  onReply 
}: ThreadedCommentListProps) {
  
  const updateCommentTag = useMutation({
    mutationFn: async ({ commentId, tag }: { commentId: string; tag: string }) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });
      if (!response.ok) throw new Error("Failed to update comment tag");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", fileId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
  
  // Build the comment tree from flat array
  const commentTree = buildCommentTree(comments);
  
  // Filter to only positioned root comments (comments with coordinates)
  const positionedRoots = commentTree.filter(
    comment => comment.positionX !== null && comment.positionY !== null
  );

  const getStatusColor = (tag: string) => {
    switch (tag) {
      case "To Do": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "In Progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Resolved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusIcon = (tag: string) => {
    switch (tag) {
      case "To Do": return <Circle className="w-3 h-3" />;
      case "In Progress": return <ClockIcon className="w-3 h-3" />;
      case "Resolved": return <CheckCircle2 className="w-3 h-3" />;
      default: return <Circle className="w-3 h-3" />;
    }
  };

  // Recursive render function for threaded comments
  const renderComment = (comment: CommentWithReplies, level: number = 0, pinNumber?: number): React.ReactNode => {
    const isHighlighted = highlightedCommentId === comment.id;
    const maxLevel = 4; // Limit visual nesting to prevent too much indentation
    const displayLevel = Math.min(level, maxLevel);
    
    // Different styling for different nesting levels
    const nestingStyles = [
      "", // Level 0 (root)
      "ml-4 border-l-2 border-blue-200 dark:border-blue-800 pl-3", // Level 1
      "ml-4 border-l-2 border-green-200 dark:border-green-800 pl-3", // Level 2
      "ml-4 border-l-2 border-purple-200 dark:border-purple-800 pl-3", // Level 3
      "ml-4 border-l-2 border-orange-200 dark:border-orange-800 pl-3", // Level 4+
    ];

    return (
      <div key={comment.id} className={level > 0 ? nestingStyles[displayLevel] : ""}>
        <div
          className={`p-3 border rounded-lg cursor-pointer transition-all duration-500 mb-3 ${
            isHighlighted 
              ? "bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 border-2 border-orange-400 dark:border-orange-500 shadow-lg animate-pulse" 
              : "bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
          }`}
          onClick={() => onCommentClick?.(comment.id)}
        >
          {/* Header with pin number (only for root comments), status, and timestamp */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {level === 0 && pinNumber && (
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {pinNumber}
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className={`h-6 px-2 ${getStatusColor(comment.tag)}`}>
                    {getStatusIcon(comment.tag)}
                    <span className="ml-1 text-xs">{comment.tag}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCommentTag.mutate({ commentId: comment.id, tag: "To Do" });
                    }}
                  >
                    <Circle className="w-3 h-3 mr-2" />
                    To Do
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCommentTag.mutate({ commentId: comment.id, tag: "In Progress" });
                    }}
                  >
                    <ClockIcon className="w-3 h-3 mr-2" />
                    In Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCommentTag.mutate({ commentId: comment.id, tag: "Resolved" });
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-2" />
                    Resolved
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {level > 0 && (
                <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  Reply
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className={level === 0 ? "w-6 h-6" : "w-5 h-5"}>
              <AvatarFallback className="text-xs">
                {comment.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`font-medium ${level === 0 ? "text-sm" : "text-xs"}`}>
              {comment.name}
            </span>
          </div>

          {/* Comment content */}
          <p className={`text-gray-700 dark:text-gray-300 mb-3 ${level === 0 ? "text-sm" : "text-xs"}`}>
            {comment.content}
          </p>

          {/* Reply button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 h-auto"
            onClick={(e) => {
              e.stopPropagation();
              onReply?.(comment);
            }}
          >
            <Reply className="w-3 h-3 mr-1" />
            Reply
          </Button>
        </div>

        {/* Render replies recursively */}
        {comment.replies.length > 0 && (
          <div className="space-y-2">
            {comment.replies.map(reply => renderComment(reply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (positionedRoots.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No comments yet</p>
        <p className="text-xs text-gray-400 mt-1">Click on the image to add annotations</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {positionedRoots.map((comment, index) => 
          renderComment(comment, 0, index + 1)
        )}
      </div>

    </>
  );
}
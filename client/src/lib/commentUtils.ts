import type { Comment } from "@shared/schema";

export interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[];
}

/**
 * Transform flat array of comments into a threaded tree structure
 * Supports unlimited nesting depth for complex conversation threads
 */
export function buildCommentTree(comments: Comment[]): CommentWithReplies[] {
  const map = new Map<string, CommentWithReplies>();
  const roots: CommentWithReplies[] = [];
  
  // Initialize all comments with empty replies array
  for (const comment of comments) {
    const commentWithReplies: CommentWithReplies = {
      ...comment,
      replies: []
    };
    map.set(comment.id, commentWithReplies);
  }
  
  // Build parent-child relationships
  for (const comment of comments) {
    const commentWithReplies = map.get(comment.id)!;
    
    if (comment.parentId) {
      const parent = map.get(comment.parentId);
      if (parent) {
        parent.replies.push(commentWithReplies);
      }
    } else {
      roots.push(commentWithReplies);
    }
  }
  
  // Sort roots by creation time (for positioned comments, this maintains pin order)
  roots.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  // Sort replies within each thread by creation time
  const sortReplies = (comment: CommentWithReplies) => {
    comment.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    comment.replies.forEach(sortReplies);
  };
  
  roots.forEach(sortReplies);
  
  return roots;
}

/**
 * Get the depth of a comment thread (useful for styling)
 */
export function getCommentDepth(comment: CommentWithReplies): number {
  if (comment.replies.length === 0) return 0;
  return 1 + Math.max(...comment.replies.map(getCommentDepth));
}

/**
 * Count total replies in a thread (including nested replies)
 */
export function getTotalReplyCount(comment: CommentWithReplies): number {
  return comment.replies.reduce(
    (count, reply) => count + 1 + getTotalReplyCount(reply),
    0
  );
}

/**
 * Find a comment by ID in a threaded structure
 */
export function findCommentInTree(
  tree: CommentWithReplies[], 
  commentId: string
): CommentWithReplies | null {
  for (const comment of tree) {
    if (comment.id === commentId) return comment;
    
    const found = findCommentInTree(comment.replies, commentId);
    if (found) return found;
  }
  return null;
}
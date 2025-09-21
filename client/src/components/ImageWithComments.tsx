import React, { useRef } from "react";
import { CommentPin } from "./CommentPin";
import type { Comment } from "@shared/schema";

type ImageWithCommentsProps = {
  src: string;
  alt: string;
  comments?: Comment[];
  onImageClick: (coords: { xPercent: number; yPercent: number }) => void;
  onPinClick: (commentId: string) => void;
  highlightedCommentId?: string | null;
};

export const ImageWithComments: React.FC<ImageWithCommentsProps> = ({
  src,
  alt,
  comments,
  onImageClick,
  onPinClick,
  highlightedCommentId,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);

  // Filter root comments with positions and sort by creation date
  const rootComments = (comments || [])
    .filter(comment => !comment.parentId && comment.positionX !== null && comment.positionY !== null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Translate click position to % coordinates of image
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🖱️ Image click event fired!', e);
    
    if (!imgRef.current) {
      console.log('❌ No image ref found');
      return;
    }
    
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    console.log('📍 Click position calculated:', { x, y, rect });
    
    onImageClick({ xPercent: x, yPercent: y });
  };

  return (
    <div className="relative w-full" style={{ position: "relative" }}>
      <img
        src={src}
        alt={alt}
        ref={imgRef}
        className="w-full rounded-lg"
        onClick={handleClick}
        style={{ cursor: "crosshair" }}
        draggable={false}
      />
      
      {/* Render all pins */}
      {rootComments.map((comment, idx) => (
        <CommentPin
          key={comment.id}
          number={idx + 1}
          xPercent={(comment.positionX || 0) / 100}
          yPercent={(comment.positionY || 0) / 100}
          onClick={() => onPinClick(comment.id)}
          comment={{
            content: comment.content,
            name: comment.name,
            tag: comment.tag
          }}
          isHighlighted={highlightedCommentId === comment.id}
        />
      ))}


    </div>
  );
};
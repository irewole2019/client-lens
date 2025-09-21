import React, { useState } from "react";

type CommentPinProps = {
  number: number;
  xPercent: number;
  yPercent: number;
  onClick: () => void;
  comment: {
    content: string;
    name: string;
    tag?: string;
  };
  isHighlighted?: boolean;
};

export const CommentPin: React.FC<CommentPinProps> = ({
  number,
  xPercent,
  yPercent,
  onClick,
  comment,
  isHighlighted = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="absolute z-10"
      style={{
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        transform: "translate(-50%, -50%)",
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={onClick}
        className={`w-7 h-7 text-white rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md transition-all duration-200 hover:scale-110 ${
          isHighlighted 
            ? 'bg-orange-500 animate-pulse' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        tabIndex={0}
        data-testid={`comment-pin-${number}`}
      >
        {number}
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20">
          <div className="bg-black text-white text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{comment.name}</span>
              {comment.tag && (
                <span className="bg-blue-500 text-xs px-2 py-0.5 rounded-full">
                  {comment.tag}
                </span>
              )}
            </div>
            <p className="text-gray-200 line-clamp-3">{comment.content}</p>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
          </div>
        </div>
      )}
    </div>
  );
};
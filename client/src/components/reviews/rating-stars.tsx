import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  onChange?: (rating: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function RatingStars({ 
  rating, 
  onChange, 
  interactive = false, 
  size = "md",
  className 
}: RatingStarsProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6",
  };

  const handleClick = (starRating: number) => {
    if (interactive && onChange) {
      onChange(starRating);
    }
  };

  const handleMouseEnter = (starRating: number) => {
    if (interactive) {
      setHoveredRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoveredRating(0);
    }
  };

  const displayRating = interactive && hoveredRating > 0 ? hoveredRating : rating;

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        const isPartial = star - 0.5 <= displayRating && star > displayRating;
        
        return (
          <button
            key={star}
            type="button"
            className={cn(
              "relative transition-colors",
              interactive 
                ? "cursor-pointer hover:scale-110 transform transition-transform" 
                : "cursor-default",
              sizeClasses[size]
            )}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={!interactive}
          >
            <Star
              className={cn(
                "absolute inset-0 transition-colors",
                sizeClasses[size],
                isFilled || isPartial
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              )}
            />
            {isPartial && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                <Star className={cn("fill-yellow-400 text-yellow-400", sizeClasses[size])} />
              </div>
            )}
          </button>
        );
      })}
      {!interactive && (
        <span className={cn(
          "ml-2 text-gray-600",
          size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
        )}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

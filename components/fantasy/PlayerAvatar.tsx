'use client';

import { useState, useEffect, memo } from 'react';

interface PlayerAvatarProps {
  headshotUrl: string | null;
  playerName: string;
  team: string;
  teamColor: string;
  isVisible?: boolean;
  showAvatar?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12'
};

const PlayerAvatar = memo(({ 
  headshotUrl, 
  playerName, 
  team, 
  teamColor,
  isVisible = true,
  showAvatar = true,
  size = 'md',
  className = ''
}: PlayerAvatarProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const sizeClass = sizeMap[size];

  // Reset state when URL changes
  useEffect(() => {
    if (headshotUrl) {
      setImageLoaded(false);
      setImageFailed(false);
    }
  }, [headshotUrl]);

  // Don't render image if not visible in viewport or if showAvatar is false
  if (!showAvatar || !isVisible || !headshotUrl || imageFailed) {
    return showAvatar ? (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-background shadow-sm ${className}`}
        style={{ backgroundColor: teamColor || "#6B7280" }}
      >
        {team}
      </div>
    ) : null;
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className={`${sizeClass} rounded-full p-0.5 ring-2 ring-background shadow-sm`}
        style={{ backgroundColor: teamColor }}
      >
        {/* Fallback while loading */}
        {!imageLoaded && (
          <div 
            className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: teamColor || "#6B7280" }}
          >
            {team}
          </div>
        )}
        
        <img
          src={headshotUrl}
          alt={playerName}
          className={`w-full h-full rounded-full object-cover transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
          }`}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
          style={{ 
            contentVisibility: 'auto',
            containIntrinsicSize: '40px 40px'
          }}
        />
      </div>
    </div>
  );
});

PlayerAvatar.displayName = 'PlayerAvatar';

export default PlayerAvatar;

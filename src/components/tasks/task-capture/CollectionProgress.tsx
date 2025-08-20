import React, { useState, useEffect } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface CollectionProgressProps {
  collectionNumber: number;
  collectionTitle: string;
  totalCards: number;
  collectedCards: number;
  cardImages?: string[];
  className?: string;
  onOpenGallery?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function CollectionProgress({
  collectionNumber,
  collectionTitle,
  totalCards,
  collectedCards,
  cardImages = [],
  className = "",
  onOpenGallery,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false
}: CollectionProgressProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // Reset transition state when content changes
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setSlideDirection(null);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [collectionNumber, isTransitioning]);

  const handleNavigation = (direction: 'left' | 'right') => {
    setIsTransitioning(true);
    setSlideDirection(direction);
    
    setTimeout(() => {
      if (direction === 'left' && onPrevious) {
        onPrevious();
      } else if (direction === 'right' && onNext) {
        onNext();
      }
    }, 150); // Start content change mid-transition
  };

  return (
    <div 
      className={`relative flex items-center justify-between pl-14 pr-16 pt-12 pb-20 ${className}`}
      style={{
        background: 'var(--toggle-bg)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        border: '1px solid var(--toggle-border)'
      }}
    >
      {/* Navigation Chevrons */}
      {hasPrevious && onPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNavigation('left');
          }}
          className="absolute left-3 top-[45%] -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Previous collection"
        >
          <ChevronLeft className="w-5 h-5 text-white/60 hover:text-white/80" />
        </button>
      )}
      
      {hasNext && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNavigation('right');
          }}
          className="absolute right-3 top-[45%] -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Next collection"
        >
          <ChevronRight className="w-5 h-5 text-white/60 hover:text-white/80" />
        </button>
      )}

      {/* Content wrapper with transition */}
      <div 
        className={`flex items-center justify-between w-full transition-all duration-500 ease-out ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          transform: isTransitioning 
            ? slideDirection === 'left' 
              ? 'translateX(30px)' 
              : 'translateX(-30px)'
            : 'translateX(0)',
          filter: isTransitioning ? 'blur(4px)' : 'blur(0px)'
        }}
      >
        {/* Collection Info - Left Side */}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-white/60 mb-1">
            <span>Collection no.{collectionNumber}</span>
            {onOpenGallery && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenGallery();
                }}
                className="hover:text-white/80 transition-colors"
                aria-label="Open gallery"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
          <h3 className="text-4xl font-normal text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            {collectionTitle}
          </h3>
        </div>

        {/* Card Progress Display - Right Side */}
        <div className="flex items-center gap-2 relative">
        {/* Show all cards */}
        {Array.from({ length: totalCards }).map((_, index) => {
          const isCollected = index < collectedCards;
          const isNext = index === collectedCards;
          const cardImage = cardImages[index];

          return (
            <div
              key={index}
              className={`relative w-14 h-[4.5rem] rounded-md transition-all duration-300 ${isNext ? 'overflow-visible' : 'overflow-hidden'}`}
              style={{
                background: isNext ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                border: isNext ? 'none' : '2px solid rgba(255, 255, 255, 0.1)',
                zIndex: isNext ? 10 : 1
              }}
            >
              {/* Card Content */}
              {isCollected && cardImage && (
                <img 
                  src={cardImage} 
                  alt={`Card ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Next Card - Blurred */}
              {isNext && cardImage && (
                <>
                  {/* Outer glow/blur effect */}
                  <div className="absolute -inset-1 rounded-lg opacity-40">
                    <img 
                      src={cardImage} 
                      alt=""
                      className="w-full h-full object-cover filter blur-lg scale-110"
                    />
                  </div>
                  {/* Main blurred card */}
                  <div className="absolute inset-0 rounded-md overflow-hidden">
                    <img 
                      src={cardImage} 
                      alt={`Card ${index + 1}`}
                      className="w-full h-full object-cover filter blur-sm scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                  </div>
                </>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
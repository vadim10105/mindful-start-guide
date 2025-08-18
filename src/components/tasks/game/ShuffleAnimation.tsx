import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface EarnedCard {
  imageUrl: string;
  caption?: string;
  cardNumber: number;
}

interface ShuffleAnimationProps {
  isProcessing: boolean;
  onLoadingComplete?: () => void;
  isPiP?: boolean;
}

export const ShuffleAnimation = ({ isProcessing, onLoadingComplete, isPiP = false }: ShuffleAnimationProps) => {
  const [isSettling, setIsSettling] = useState(false);
  const [randomCards, setRandomCards] = useState<EarnedCard[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [shouldShowCards, setShouldShowCards] = useState(false);

  // Fetch random earned cards when animation starts
  useEffect(() => {
    if (isProcessing) {
      setShouldShowCards(false);
      setRandomCards([]);
      setImagesLoaded(false);
      setMinTimeElapsed(false);
      setIsSettling(false);
      fetchRandomEarnedCards();
    }
  }, [isProcessing]);

  // Preload images and enforce minimum loading time
  useEffect(() => {
    if (randomCards.length > 0 && isProcessing) {
      // Start minimum time timer (2.5 seconds)
      const minTimeTimer = setTimeout(() => {
        setMinTimeElapsed(true);
      }, 2500);

      // Preload all images
      const imagePromises = randomCards.map((card) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Still resolve on error to not block loading
          img.src = card.imageUrl;
        });
      });

      Promise.all(imagePromises).then(() => {
        setImagesLoaded(true);
        setShouldShowCards(true);
      });

      return () => {
        clearTimeout(minTimeTimer);
      };
    }
  }, [randomCards, isProcessing]);

  // Complete animation when images are ready AND minimum time elapsed
  useEffect(() => {
    if (isProcessing && !isSettling) {
      // For PiP windows, only wait for basic settling, don't enforce minimum load time
      if (isPiP || (imagesLoaded && minTimeElapsed)) {
        setIsSettling(true);
        // Give time for settle animation then complete
        setTimeout(() => {
          // Only call onLoadingComplete from main window, not PiP
          if (!isPiP) {
            onLoadingComplete?.();
          }
        }, 800);
      }
    }
  }, [isProcessing, isSettling, imagesLoaded, minTimeElapsed, onLoadingComplete, isPiP]);


  const fetchRandomEarnedCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all earned cards from completed tasks
      const { data: earnedCardsData, error } = await supabase
        .from('tasks')
        .select(`
          collection_cards!inner (
            image_url,
            caption,
            card_number
          )
        `)
        .eq('user_id', user.id)
        .eq('task_status', 'complete')
        .not('collection_card_id', 'is', null);

      if (error || !earnedCardsData) {
        console.error('Error fetching earned cards:', error);
        return;
      }

      // Extract cards and shuffle them
      const allCards: EarnedCard[] = earnedCardsData.map(task => ({
        imageUrl: task.collection_cards.image_url,
        caption: task.collection_cards.caption,
        cardNumber: task.collection_cards.card_number
      }));

      // Pick 3 random cards (or all if less than 3)
      const shuffled = allCards.sort(() => Math.random() - 0.5);
      const selectedCards = shuffled.slice(0, Math.min(3, allCards.length));
      
      setRandomCards(selectedCards);
    } catch (error) {
      console.error('Error fetching random cards:', error);
    }
  };

  return (
    <div className="mb-6 flex justify-center">
      <div className="w-[368px]" style={{ aspectRatio: '63/88' }}>
        <div className={`w-full h-full relative flex items-center justify-center transition-opacity duration-500 ${
          isSettling ? 'opacity-95' : 'opacity-100'
        }`}>
          
          {/* Bottom stack cards (stationary) */}
          <div 
            className={`absolute w-full h-full rounded-2xl border-2 shadow-lg overflow-hidden transition-opacity duration-700 ${
              imagesLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              transform: 'translateY(2px)',
              zIndex: 1
            }}
          >
            {randomCards[1] && shouldShowCards && (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${randomCards[1].imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-black/20" />
              </>
            )}
          </div>
          <div 
            className={`absolute w-full h-full rounded-2xl border-2 shadow-lg overflow-hidden transition-opacity duration-700 ${
              imagesLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              transform: 'translateY(1px)',
              zIndex: 2
            }}
          >
            {randomCards[2] && shouldShowCards && (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${randomCards[2].imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-black/20" />
              </>
            )}
          </div>
          
          {/* Shuffling cards - these move around */}
          <div 
            className={`absolute w-full h-full rounded-2xl border-2 shadow-xl transition-all duration-1200 overflow-hidden ${
              isSettling ? 'animate-none' : 'animate-shuffle-card-top'
            }`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              transform: isSettling ? 'translateX(0px) translateY(0px) rotate(0deg)' : undefined,
              zIndex: 6
            }}
          >
            {randomCards[0] && shouldShowCards && (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${randomCards[0].imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-black/20" />
                {/* Blur overlay */}
                <div className="absolute inset-0 backdrop-blur-sm" />
              </>
            )}
          </div>
          
          <div 
            className={`absolute w-full h-full rounded-2xl border-2 shadow-xl transition-all duration-1200 overflow-hidden ${
              isSettling ? 'animate-none' : 'animate-shuffle-card-middle'
            }`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              transform: isSettling ? 'translateX(0px) translateY(0px) rotate(0deg)' : undefined,
              zIndex: 5
            }}
          >
            {randomCards[1] && shouldShowCards && (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${randomCards[1].imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-black/20" />
                {/* Blur overlay */}
                <div className="absolute inset-0 backdrop-blur-sm" />
              </>
            )}
          </div>
          
          <div 
            className={`absolute w-full h-full rounded-2xl border-2 shadow-xl transition-all duration-1200 overflow-hidden ${
              isSettling ? 'animate-none' : 'animate-shuffle-card-bottom'
            }`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              transform: isSettling ? 'translateX(0px) translateY(0px) rotate(0deg)' : undefined,
              zIndex: 4
            }}
          >
            {randomCards[2] && shouldShowCards && (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${randomCards[2].imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-black/20" />
                {/* Blur overlay */}
                <div className="absolute inset-0 backdrop-blur-sm" />
              </>
            )}
          </div>

          {/* Main deck card */}
          <div 
            className="absolute w-full h-full rounded-2xl border-2 shadow-lg overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              zIndex: 3
            }}
          >
            {randomCards[0] && shouldShowCards && (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${randomCards[0].imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-black/30" />
              </>
            )}
          </div>

          
        </div>
      </div>
    </div>
  );
};
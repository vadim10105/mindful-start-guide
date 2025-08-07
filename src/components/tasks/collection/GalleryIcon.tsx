import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GalleryIconProps {
  onOpenGallery: (collectionId?: string) => void;
  refreshTrigger?: number;
}

export const GalleryIcon = ({ onOpenGallery, refreshTrigger }: GalleryIconProps) => {
  const [collections, setCollections] = useState<any[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [firstCardImage, setFirstCardImage] = useState<string | null>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [previousProgress, setPreviousProgress] = useState(0);
  const [isCollectionComplete, setIsCollectionComplete] = useState(false);
  const [completedCollection, setCompletedCollection] = useState<any>(null);
  const [completedCollectionImage, setCompletedCollectionImage] = useState<string | null>(null);
  const [previousCollectionId, setPreviousCollectionId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextCollection, setNextCollection] = useState<any>(null);
  const [nextCollectionImage, setNextCollectionImage] = useState<string | null>(null);

  // Load collection data
  useEffect(() => {
    const loadCollections = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get all collections from database
        const { data: dbCollections, error: collectionsError } = await supabase
          .from('card_collections')
          .select('*')
          .order('display_order');

        if (collectionsError || !dbCollections) return;

        // Get earned cards data
        const { data: earnedCardsData } = await supabase
          .from('tasks')
          .select(`
            collection_cards!inner (
              collection_id,
              card_number
            )
          `)
          .eq('user_id', user.id)
          .eq('task_status', 'complete')
          .not('collection_card_id', 'is', null);

        // Process earned cards by collection
        const earnedCardsByCollection: { [collectionId: string]: any[] } = {};
        earnedCardsData?.forEach(task => {
          const card = task.collection_cards;
          if (card) {
            if (!earnedCardsByCollection[card.collection_id]) {
              earnedCardsByCollection[card.collection_id] = [];
            }
            earnedCardsByCollection[card.collection_id].push(card);
          }
        });

        // Create UI collections
        const uiCollections = dbCollections.map((dbCollection, index) => {
          const earnedCards = earnedCardsByCollection[dbCollection.id] || [];
          
          // Sequential unlocking logic
          let isLocked = false;
          if (dbCollection.display_order > 1) {
            const previousCollection = dbCollections.find(c => c.display_order === dbCollection.display_order - 1);
            const previousCollectionCards = previousCollection ? earnedCardsByCollection[previousCollection.id] || [] : [];
            isLocked = previousCollectionCards.length < 6;
          }

          return {
            id: dbCollection.id,
            name: dbCollection.name,
            description: dbCollection.description,
            totalCards: dbCollection.total_cards,
            earnedCards: earnedCards,
            isLocked
          };
        });

        setCollections(uiCollections);

        // Get first card image from current collection for hover state
        if (uiCollections.length > 0) {
          const currentCollection = uiCollections.find(c => !c.isLocked && c.earnedCards.length < c.totalCards) || uiCollections.find(c => !c.isLocked) || uiCollections[0];
          
          if (currentCollection) {
            const { data: firstCardData } = await supabase
              .from('collection_cards')
              .select('image_url')
              .eq('collection_id', currentCollection.id)
              .eq('card_number', 1)
              .single();
            
            if (firstCardData?.image_url) {
              setFirstCardImage(firstCardData.image_url);
            }
          }
        }
      } catch (error) {
        console.error('Error loading collections for gallery icon:', error);
      }
    };

    loadCollections();
  }, [refreshTrigger]);

  // Get current collection to display (active/incomplete collection)
  const currentCollection = collections.find(c => !c.isLocked && c.earnedCards.length < c.totalCards) || collections.find(c => !c.isLocked) || collections[0];
  const progress = currentCollection ? currentCollection.earnedCards.length : 0;
  const total = currentCollection ? currentCollection.totalCards : 6;

  // Detect progress increase and trigger celebration
  useEffect(() => {
    if (progress > previousProgress && previousProgress >= 0) {
      // Regular card celebration
      setIsCelebrating(true);
      setTimeout(() => {
        setIsCelebrating(false);
      }, 2000);
    }
    setPreviousProgress(progress);
  }, [progress, previousProgress]);

  // Detect collection completion (when we move to next collection)
  useEffect(() => {
    if (previousCollectionId && currentCollection?.id !== previousCollectionId) {
      // Find the completed collection
      const completedColl = collections.find(c => c.id === previousCollectionId);
      if (completedColl && completedColl.earnedCards.length === 6) {
        // Get first card image for completed collection
        const getCompletedCollectionImage = async () => {
          try {
            const { data: firstCardData } = await supabase
              .from('collection_cards')
              .select('image_url')
              .eq('collection_id', completedColl.id)
              .eq('card_number', 1)
              .single();
            
            if (firstCardData?.image_url) {
              setCompletedCollectionImage(firstCardData.image_url);
            }
          } catch (error) {
            console.error('Error loading completed collection image:', error);
          }
        };

        getCompletedCollectionImage();
        
        // Delay the celebration by 2 seconds
        setTimeout(() => {
          setIsCollectionComplete(true);
          setCompletedCollection(completedColl);
          setIsHovered(true); // Auto-show hover state
        }, 2000);
        
        // Show completed collection for 3 seconds, then fade to next collection (accounting for 2s delay)
        setTimeout(() => {
          // Start transition to next collection
          const nextColl = collections.find(c => !c.isLocked && c.earnedCards.length < c.totalCards);
          if (nextColl) {
            setNextCollection(nextColl);
            setIsTransitioning(true);
            
            // Get next collection image
            const getNextCollectionImage = async () => {
              try {
                const { data: firstCardData } = await supabase
                  .from('collection_cards')
                  .select('image_url')
                  .eq('collection_id', nextColl.id)
                  .eq('card_number', 1)
                  .single();
                
                if (firstCardData?.image_url) {
                  setNextCollectionImage(firstCardData.image_url);
                }
              } catch (error) {
                console.error('Error loading next collection image:', error);
              }
            };
            getNextCollectionImage();
          }
        }, 5000);

        // Show next collection for 3 seconds, then fade out (accounting for 2s delay)
        setTimeout(() => {
          setIsCollectionComplete(false);
          setCompletedCollection(null);
          setCompletedCollectionImage(null);
          setIsTransitioning(false);
          setNextCollection(null);
          setNextCollectionImage(null);
          setIsHovered(false);
        }, 10000);
      }
    }
    setPreviousCollectionId(currentCollection?.id || null);
  }, [currentCollection?.id, collections, previousCollectionId]);


  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Shimmer animation styles */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
      {/* Background Overlay - dims and blurs everything when hovering */}
      {isHovered && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all duration-1000 ease-out"
          style={{ zIndex: -1, left: '-1000px', top: '-1000px' }}
        />
      )}
      <div
        onClick={() => onOpenGallery(currentCollection?.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`cursor-pointer transition-all duration-500 ease-out ${
          isHovered 
            ? 'transform scale-110' 
            : 'hover:scale-105'
        }`}
      >
        {/* Normal State - Simple Icon */}
        <div
          className={`transition-all duration-500 ease-out ${
            isHovered 
              ? 'opacity-0 scale-75 pointer-events-none' 
              : 'opacity-100 scale-100'
          } flex flex-col items-center`}
        >
          {/* Main Icon */}
          <div className="h-16 w-16 rounded-full flex flex-col items-center justify-center p-2 relative">
            <div className="relative">
              {/* Silvery glow behind cards when celebrating */}
              {isCelebrating && (
                <div className="absolute -inset-2 bg-gradient-radial from-gray-300/40 via-gray-400/20 to-transparent rounded-full animate-pulse blur-sm"></div>
              )}
              
              {/* Stack of cards effect - simulate new card being added */}
              <div className={`absolute -top-1 -left-1 w-6 h-8 bg-white/20 rounded border border-white/30 transform transition-all duration-500 ease-out ${
                isCelebrating 
                  ? 'rotate-[20deg] translate-x-1 translate-y-1 scale-105' 
                  : 'rotate-12'
              }`}></div>
              <div className={`absolute -top-0.5 -left-0.5 w-6 h-8 bg-white/30 rounded border border-white/40 transform transition-all duration-400 ease-out ${
                isCelebrating 
                  ? 'rotate-[15deg] translate-x-1 scale-105' 
                  : 'rotate-6'
              }`}></div>
              <div className={`w-6 h-8 bg-white/40 rounded border border-white/50 transform transition-all duration-300 ease-out ${
                isCelebrating 
                  ? 'rotate-[8deg] translate-y-0.5 scale-105 shadow-lg' 
                  : 'rotate-0'
              }`}></div>
              
              {/* New card appearing effect */}
              {isCelebrating && (
                <div className="absolute -top-1.5 -left-1.5 w-6 h-8 bg-white/50 rounded border border-white/60 transform rotate-[25deg] translate-x-2 translate-y-2 scale-110 animate-bounce shadow-xl"></div>
              )}
            </div>
          </div>

          {/* Progress Counter */}
          <div className="mt-0.5 text-xs text-white/70 font-medium">
            {progress}/{total}
          </div>
        </div>


        {/* Hover State - Collection Preview */}
        <div
          className={`absolute bottom-0 left-0 transition-all duration-1000 ease-out ${
            isHovered 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="w-72 h-96 rounded-2xl shadow-lg transition-all duration-300 relative overflow-hidden">
            

            {/* Background image (first card from collection, blurred) */}
            {((isTransitioning && nextCollectionImage) || (isCollectionComplete && completedCollectionImage) || firstCardImage) && (
              <div 
                className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
                style={{ 
                  backgroundImage: `url('${(isTransitioning && nextCollectionImage) || (isCollectionComplete && completedCollectionImage) || firstCardImage}')` 
                }}
              />
            )}
            
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/70" />
            
            {/* Fallback gradient if no image */}
            {!((isCollectionComplete && completedCollectionImage) || firstCardImage) && (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500" />
            )}

            {/* Completed collection content */}
            <div className={`absolute inset-0 flex flex-col justify-between text-white z-10 p-6 transition-opacity duration-1000 ${
              !isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="space-y-2">
                <div className="font-bold text-lg text-white" style={{ fontFamily: 'Calendas Plus' }}>
                  {(isCollectionComplete && completedCollection) ? completedCollection.name : (currentCollection?.name || 'Collection')}
                </div>
                {((isCollectionComplete && completedCollection) ? completedCollection.description : currentCollection?.description) && (
                  <div className="text-xs opacity-80 leading-relaxed">
                    {(isCollectionComplete && completedCollection) ? completedCollection.description : currentCollection?.description}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="text-sm opacity-90">
                  {isCollectionComplete ? '6 of 6 collected' : `${progress} of ${total} collected`}
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="rounded-full h-2 transition-all duration-500 relative overflow-hidden bg-white"
                    style={{ width: `${isCollectionComplete ? 100 : (progress / total) * 100}%` }}
                  >
                    {isCollectionComplete && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-400/80 to-transparent"
                        style={{
                          animation: 'shimmer 1.5s ease-in-out infinite',
                          transform: 'translateX(-100%)',
                          backgroundSize: '200% 100%'
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Next collection content */}
            <div className={`absolute inset-0 flex flex-col justify-between text-white z-10 p-6 transition-opacity duration-1000 ${
              isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="space-y-2">
                <div className="font-bold text-lg text-white" style={{ fontFamily: 'Calendas Plus' }}>
                  {nextCollection?.name || 'Next Collection'}
                </div>
                {nextCollection?.description && (
                  <div className="text-xs opacity-80 leading-relaxed">
                    {nextCollection.description}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="text-sm opacity-90">
                  {nextCollection ? `0 of ${nextCollection.totalCards} collected` : '0 of 6 collected'}
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="rounded-full h-2 bg-white" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
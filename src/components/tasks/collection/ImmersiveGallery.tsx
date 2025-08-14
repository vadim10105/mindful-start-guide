import { useState, useEffect, useMemo } from 'react';
import { Images, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCollectionsWithProgress } from '@/services/cardService';
import { supabase } from '@/integrations/supabase/client';

interface EarnedCard {
  id: string;
  taskTitle: string;
  taskId: string;
  completedAt: Date;
  timeSpent: number;
  cardNumber: number;
  imageUrl: string;
  caption: string;
  description: string;
  attribution: string;
  attributionUrl: string;
  notes: string | null;
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  totalCards: number;
  earnedCards: EarnedCard[];
  firstCardImage: string | null;
  color: string;
  isLocked: boolean;
}

interface ImmersiveGalleryProps {
  onClose: () => void;
  initialCollectionId?: string;
  initialCardId?: string;
}

export const ImmersiveGallery = ({ onClose, initialCollectionId, initialCardId }: ImmersiveGalleryProps) => {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [hasUserNavigated, setHasUserNavigated] = useState(false);
  const [cardToFlip, setCardToFlip] = useState<string | undefined>(initialCardId);

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

        if (collectionsError) {
          console.error('Error loading collections:', collectionsError);
          return;
        }

        if (!dbCollections || dbCollections.length === 0) {
          console.log('No collections found in database');
          return;
        }

        // Get earned cards by joining completed tasks with collection cards
        const { data: earnedCardsData, error: earnedCardsError } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            completed_at,
            time_spent_minutes,
            notes,
            collection_cards!inner (
              id,
              card_number,
              image_url,
              caption,
              description,
              attribution,
              attribution_url,
              collection_id
            )
          `)
          .eq('user_id', user.id)
          .in('task_status', ['complete', 'made_progress'])
          .not('collection_card_id', 'is', null)
          .order('completed_at');

        if (earnedCardsError) {
          console.error('Error loading earned cards:', earnedCardsError);
          return;
        }

        // Process earned cards and group by collection
        const earnedCardsByCollection: { [collectionId: string]: EarnedCard[] } = {};
        let totalEarnedCards = 0;

        earnedCardsData?.forEach(task => {
          const card = task.collection_cards;
          if (card) {
            const earnedCard: EarnedCard = {
              id: card.id,
              taskTitle: task.title,
              taskId: task.id,
              completedAt: new Date(task.completed_at),
              timeSpent: task.time_spent_minutes || 0,
              cardNumber: card.card_number,
              imageUrl: card.image_url,
              caption: card.caption || '',
              description: card.description || '',
              attribution: card.attribution || '',
              attributionUrl: card.attribution_url || '',
              notes: task.notes || null
            };

            if (!earnedCardsByCollection[card.collection_id]) {
              earnedCardsByCollection[card.collection_id] = [];
            }
            earnedCardsByCollection[card.collection_id].push(earnedCard);
            totalEarnedCards++;
          }
        });

        // Get first card from each collection for background images
        const { data: firstCardsData } = await supabase
          .from('collection_cards')
          .select('collection_id, image_url')
          .eq('card_number', 1);

        const firstCardsByCollection: { [collectionId: string]: string } = {};
        firstCardsData?.forEach(card => {
          firstCardsByCollection[card.collection_id] = card.image_url;
        });

        // Create UI collections with earned cards
        const uiCollections: Collection[] = dbCollections.map((dbCollection, index) => {
          const earnedCards = earnedCardsByCollection[dbCollection.id] || [];
          
          // Sort earned cards by card number
          earnedCards.sort((a, b) => a.cardNumber - b.cardNumber);
          
          // Get first card image for background (always use first card from collection)
          const firstCardImage = firstCardsByCollection[dbCollection.id] || null;
          
          // Sequential unlocking: each collection unlocks when previous collection has 6 cards
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
            earnedCards,
            firstCardImage,
            color: index === 0 ? 'from-purple-500 to-pink-500' : 'from-blue-500 to-teal-500',
            isLocked
          };
        });

        setCollections(uiCollections);
      } catch (error) {
        console.error('Error loading collections:', error);
      } finally {
        setCollectionsLoaded(true);
      }
    };

    loadCollections();
  }, []);

  // Auto-select initial collection if provided (only if user hasn't navigated)
  useEffect(() => {
    if (collections.length > 0 && !selectedCollection && !hasUserNavigated) {
      // If we have a card ID, find which collection it belongs to
      if (initialCardId) {
        const collectionWithCard = collections.find(c => 
          c.earnedCards.some(card => card.id === initialCardId)
        );
        if (collectionWithCard && !collectionWithCard.isLocked) {
          setSelectedCollection(collectionWithCard);
          setCardToFlip(initialCardId);
        }
      } 
      // Otherwise use the collection ID if provided
      else if (initialCollectionId) {
        const targetCollection = collections.find(c => c.id === initialCollectionId);
        if (targetCollection && !targetCollection.isLocked) {
          setSelectedCollection(targetCollection);
        }
      }
    }
  }, [initialCollectionId, initialCardId, collections, selectedCollection, hasUserNavigated]);

  // Don't render until collections are loaded
  if (!collectionsLoaded) {
    return null;
  }

  const CollectionFolder = ({ collection }: { collection: Collection }) => {
    const progress = collection.earnedCards.length;
    const total = collection.totalCards;
    const progressPercent = (progress / total) * 100;

    return (
      <div
        className={`transition-all duration-300 ${
          collection.isLocked 
            ? 'cursor-not-allowed opacity-60' 
            : 'cursor-pointer group hover:scale-105'
        }`}
        onClick={() => {
          if (!collection.isLocked) {
            setSelectedCollection(collection);
            setHasUserNavigated(true);
          }
        }}
      >
        <div className={`w-72 h-96 rounded-2xl p-6 shadow-lg ${
          !collection.isLocked ? 'hover:shadow-2xl' : ''
        } transition-all duration-300 relative overflow-hidden`}>
          
          {/* Background image (first card from collection, blurred) */}
          {collection.firstCardImage && (
            <div 
              className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
              style={{ 
                backgroundImage: `url('${collection.firstCardImage}')` 
              }}
            />
          )}
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/70" />
          
          {/* Fallback gradient for collections with no first card image */}
          {!collection.firstCardImage && (
            <div className={`absolute inset-0 bg-gradient-to-br ${collection.color}`} />
          )}
          
          {/* Lock overlay */}
          {collection.isLocked && (
            <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center z-10">
              <Lock className="h-12 w-12 text-white" />
            </div>
          )}

          {!collection.isLocked && (
            <div className="h-full flex flex-col justify-between text-white relative z-10">
              {/* Header and Description grouped together */}
              <div className="space-y-2">
                <div className="font-bold text-lg" style={{ fontFamily: 'Calendas Plus' }}>
                  {collection.name}
                </div>
                {collection.description && (
                  <div className="text-xs opacity-80 leading-relaxed">
                    {collection.description}
                  </div>
                )}
              </div>
              
              {/* Progress at bottom */}
              <div className="space-y-2">
                <div className="text-sm opacity-90">
                  {progress} of {total} collected
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    );
  };

  const DetailedCollectionView = ({ collection, cardToFlip }: { collection: Collection; cardToFlip?: string }) => {
    const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
    const [showAllTasks, setShowAllTasks] = useState(false);

    // Create array of slots based on collection total, filled with earned cards or empty
    const slots = Array.from({ length: collection.totalCards }, (_, index) => {
      const cardNumber = index + 1;
      return collection.earnedCards.find(card => card.cardNumber === cardNumber) || null;
    });

    // Auto-flip the specified card when component loads
    useEffect(() => {
      if (cardToFlip) {
        const cardIndex = slots.findIndex(card => card?.id === cardToFlip);
        if (cardIndex !== -1) {
          setFlippedCards(new Set([cardIndex]));
        }
      }
    }, [cardToFlip]);

    const toggleCard = (index: number) => {
      const newFlipped = new Set(flippedCards);
      if (newFlipped.has(index)) {
        newFlipped.delete(index);
      } else {
        newFlipped.add(index);
      }
      setFlippedCards(newFlipped);
    };

    const toggleAllCards = () => {
      if (showAllTasks) {
        setFlippedCards(new Set());
        setShowAllTasks(false);
      } else {
        const allEarnedIndices = slots.map((card, index) => card ? index : -1).filter(i => i >= 0);
        setFlippedCards(new Set(allEarnedIndices));
        setShowAllTasks(true);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10">
          {/* Navigation and actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCollection(null);
                setHasUserNavigated(true);
              }}
              className="text-white hover:bg-white/10 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllCards}
              className={`text-white border-white/20 hover:bg-white/10 transition-transform duration-1000 ${
                showAllTasks ? 'transform rotate-180' : ''
              }`}
            >
              Flip
            </Button>
          </div>
        </div>

        {/* Collection content - title, description, and cards bundled together */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-8">
          {/* Collection info */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Calendas Plus' }}>
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-white/70 text-base max-w-2xl mx-auto">
                {collection.description}
              </p>
            )}
          </div>

          {/* Horizontal scroll of cards */}
          <div className="w-full overflow-hidden">
            <div className="flex gap-8 overflow-x-auto pb-4 px-4 py-8 h-fit" style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }}>
            {slots.map((earnedCard, index) => (
              <div 
                key={index} 
                className="flex-shrink-0 w-80 aspect-[3/4] relative"
                style={{ scrollSnapAlign: 'center' }}
              >
                {earnedCard ? (
                  <div
                    className="w-full h-full rounded-2xl shadow-lg border-2 border-white/20 cursor-pointer transform transition-transform duration-300 hover:scale-105"
                    onClick={() => toggleCard(index)}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Card Front - Reward Details (matches game reward card) */}
                    <div 
                      className={`absolute inset-0 rounded-2xl bg-cover bg-center transition-transform duration-1000 ${
                        flippedCards.has(index) ? 'transform' : ''
                      }`}
                      style={{ 
                        backgroundImage: `url(${earnedCard.imageUrl})`,
                        backfaceVisibility: 'hidden',
                        transform: flippedCards.has(index) ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      <div className="absolute inset-0 bg-black/10 rounded-2xl" />
                      <div className="absolute inset-0 paper-texture rounded-2xl" />
                      {/* White border inside the card */}
                      <div className="absolute inset-0 border-2 border-white rounded-2xl opacity-80" />
                      
                      {/* Card number - top right, large */}
                      <div className="absolute top-2 right-4 text-gray-300 text-4xl font-bold z-30" style={{ fontFamily: 'Calendas Plus' }}>
                        {String(earnedCard.cardNumber).padStart(2, '0')}
                      </div>
                      
                      
                      {/* Attribution and description - bottom */}
                      <div className="relative h-full flex flex-col justify-end p-6 text-white z-10">
                        <div className="text-left flex flex-col gap-3">
                          {earnedCard.attribution && (
                            earnedCard.attributionUrl ? (
                              <a 
                                href={earnedCard.attributionUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-white hover:text-gray-200 underline transition-colors"
                              >
                                {earnedCard.attribution}
                              </a>
                            ) : (
                              <div className="text-sm text-white">
                                {earnedCard.attribution}
                              </div>
                            )
                          )}
                          <p className="text-xs text-white leading-relaxed italic mt-1">
                            {earnedCard.description || "strolling down the street of Paris, listening to the symphony called life."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Back - Task Details (matches game task card) */}
                    <div 
                      className="absolute inset-0 rounded-2xl border-2 border-transparent shadow-xl transition-transform duration-1000"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: flippedCards.has(index) ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                        backgroundColor: 'hsl(48 20% 97%)',
                        color: 'hsl(220 10% 20%)'
                      }}
                    >
                      <div className="h-full flex flex-col">
                        {/* Header section */}
                        <div className="text-center pb-4 flex-shrink-0 relative overflow-visible px-8 py-6">
                          {/* Date at top */}
                          <div className="text-sm mb-4" style={{ color: 'hsl(220 10% 50%)' }}>
                            {earnedCard.completedAt.toLocaleDateString()}
                          </div>
                          
                          {/* Task title */}
                          <div className="text-2xl leading-tight tracking-wide font-bold mb-2" style={{ color: 'hsl(220 10% 20%)' }}>
                            {earnedCard.taskTitle}
                          </div>
                          
                          {/* Time spent under title */}
                          <div className="flex items-center justify-center gap-1" style={{ color: 'hsl(220 10% 50%)' }}>
                            <span className="text-sm">
                              {earnedCard.timeSpent} minutes
                            </span>
                          </div>
                        </div>
                        
                        {/* Content area */}
                        <div className="flex-1 flex flex-col justify-between space-y-4 px-4 pb-4">
                          {/* Notes section */}
                          <div className="flex-1 flex flex-col">
                            <div className="relative flex-1">
                              <div
                                className="resize-none text-sm leading-relaxed border-none bg-transparent text-[hsl(220_10%_30%)] min-h-[80px] cursor-text overflow-y-auto whitespace-pre-line"
                                style={{ backgroundColor: 'transparent' }}
                              >
                                {/* Show notes if they exist, otherwise blank */}
                                {earnedCard.notes || ''}
                              </div>
                            </div>
                          </div>

                          {/* Start and finish times */}
                          <div className="text-center">
                            <div className="flex justify-between text-xs" style={{ color: 'hsl(220 10% 50%)' }}>
                              <span>
                                Start: {(() => {
                                  const finishTime = earnedCard.completedAt;
                                  const startTime = new Date(finishTime.getTime() - (earnedCard.timeSpent * 60 * 1000));
                                  return startTime.toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: true 
                                  });
                                })()}
                              </span>
                              <span>
                                Finish: {earnedCard.completedAt.toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full rounded-2xl bg-gray-800/50 flex items-center justify-center text-gray-400">
                    <Lock className="h-12 w-12" />
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (selectedCollection) {
    return <DetailedCollectionView collection={selectedCollection} cardToFlip={cardToFlip} />;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50">
      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Gallery space */}
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="flex gap-8 flex-wrap justify-center">
          {collections.map((collection) => (
            <CollectionFolder key={collection.id} collection={collection} />
          ))}
        </div>

        {/* Instructions */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-white/60">
          <p className="text-sm">Click on a collection to explore your collected cards</p>
        </div>
      </div>
    </div>
  );
};
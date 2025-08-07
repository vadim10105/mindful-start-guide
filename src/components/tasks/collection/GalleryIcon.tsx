import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GalleryIconProps {
  onOpenGallery: () => void;
  refreshTrigger?: number;
}

export const GalleryIcon = ({ onOpenGallery, refreshTrigger }: GalleryIconProps) => {
  const [collections, setCollections] = useState<any[]>([]);

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

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div
        onClick={onOpenGallery}
        className="cursor-pointer transition-all duration-300 hover:scale-105 flex flex-col items-center"
      >
        {/* Main Icon */}
        <div className="h-16 w-16 rounded-full flex flex-col items-center justify-center p-2 relative">
          <div className="relative">
            {/* Stack of cards effect - vertical */}
            <div className="absolute -top-1 -left-1 w-6 h-8 bg-white/20 rounded border border-white/30 transform rotate-12"></div>
            <div className="absolute -top-0.5 -left-0.5 w-6 h-8 bg-white/30 rounded border border-white/40 transform rotate-6"></div>
            <div className="w-6 h-8 bg-white/40 rounded border border-white/50 transform rotate-0"></div>
          </div>
        </div>

        {/* Progress Counter */}
        <div className="mt-0.5 text-xs text-white/70 font-medium">
          {progress}/{total}
        </div>
      </div>
    </div>
  );
};
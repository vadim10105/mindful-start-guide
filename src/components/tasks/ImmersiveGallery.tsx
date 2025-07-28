import { useState, useEffect, useMemo } from 'react';
import { Images, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCollectionMetadata } from '@/services/cardService';

interface CompletedTask {
  id: string;
  title: string;
  timeSpent: number;
  completedAt: Date;
  sunsetImageUrl: string;
}

interface Collection {
  id: string;
  name: string;
  totalCards: number;
  collectedCards: CompletedTask[];
  color: string;
  position: { x: number; y: number };
}

interface ImmersiveGalleryProps {
  completedTasks: CompletedTask[];
  onClose: () => void;
}

export const ImmersiveGallery = ({ completedTasks, onClose }: ImmersiveGalleryProps) => {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [totalCards, setTotalCards] = useState(8); // Default fallback
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  useEffect(() => {
    const loadCollectionMetadata = async () => {
      const collection = await getCollectionMetadata();
      if (collection?.total_cards) {
        setTotalCards(collection.total_cards);
      }
      setCollectionsLoaded(true);
    };
    loadCollectionMetadata();
  }, []);

  // Define collections - starting with Fleeting Moments
  const collections: Collection[] = useMemo(() => [
    {
      id: 'fleeting-moments',
      name: 'Fleeting Moments',
      totalCards: totalCards,
      collectedCards: completedTasks, // All completed tasks go to Fleeting Moments for now
      color: 'from-purple-500 to-pink-500',
      position: { x: 20, y: 30 }
    }
  ], [totalCards, completedTasks]);

  // Don't render until collections are loaded
  if (!collectionsLoaded) {
    return null;
  }

  const CollectionFolder = ({ collection }: { collection: Collection }) => {
    const progress = collection.collectedCards.length;
    const total = collection.totalCards;
    const progressPercent = (progress / total) * 100;

    return (
      <div
        className="absolute cursor-pointer group transition-all duration-300 hover:scale-105"
        style={{
          left: `${collection.position.x}%`,
          top: `${collection.position.y}%`,
        }}
        onClick={() => setSelectedCollection(collection)}
      >
        <div className={`w-64 h-40 bg-gradient-to-br ${collection.color} rounded-2xl p-4 shadow-lg hover:shadow-2xl transition-all duration-300`}>
          <div className="h-full flex flex-col justify-between text-white">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Images className="h-5 w-5" />
              <span className="font-bold text-lg" style={{ fontFamily: 'Calendas Plus' }}>
                {collection.name}
              </span>
            </div>
            
            {/* Progress */}
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

            {/* Preview thumbnails */}
            <div className="flex gap-1 overflow-hidden">
              {collection.collectedCards.slice(0, 3).map((task, index) => (
                <div
                  key={task.id}
                  className="w-8 h-8 rounded bg-cover bg-center border border-white/30"
                  style={{ backgroundImage: `url(${task.sunsetImageUrl})` }}
                />
              ))}
              {progress > 3 && (
                <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center text-xs">
                  +{progress - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DetailedCollectionView = ({ collection }: { collection: Collection }) => {
    // Create array of slots based on collection total, filled with collected cards or empty
    const slots = Array.from({ length: collection.totalCards }, (_, index) => {
      return collection.collectedCards[index] || null;
    });

    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCollection(null)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <Images className="h-6 w-6 text-white" />
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Calendas Plus' }}>
                {collection.name}
              </h1>
              <span className="text-white/70">
                {collection.collectedCards.length} of {collection.totalCards} collected
              </span>
            </div>
          </div>
        </div>

        {/* Grid of cards */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-4 gap-6 max-w-6xl mx-auto">
            {slots.map((task, index) => (
              <div key={index} className="aspect-[3/4] relative">
                {task ? (
                  <div
                    className="w-full h-full rounded-2xl bg-cover bg-center shadow-lg border-2 border-white/20"
                    style={{ backgroundImage: `url(${task.sunsetImageUrl})` }}
                  >
                    <div className="absolute inset-0 bg-black/40 rounded-2xl" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="text-xs opacity-70">{task.timeSpent}m</div>
                    </div>
                    <div className="absolute top-2 right-2 text-white/80 text-sm font-bold" style={{ fontFamily: 'Calendas Plus' }}>
                      {String(index + 1).padStart(2, '0')}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full rounded-2xl bg-gray-800/50 border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-400">
                    <Lock className="h-8 w-8 mb-2" />
                    <div className="text-sm">Not collected</div>
                    <div className="text-xs opacity-70" style={{ fontFamily: 'Calendas Plus' }}>
                      {String(index + 1).padStart(2, '0')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (selectedCollection) {
    return <DetailedCollectionView collection={selectedCollection} />;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50">
      {/* Close button */}
      <div className="absolute top-6 right-6 z-10">
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
      <div className="relative w-full h-full overflow-hidden">
        <div className="absolute inset-0">
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
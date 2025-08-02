import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Calendar, Trophy, X } from 'lucide-react';
import { ImmersiveGallery } from './ImmersiveGallery';
import { getRewardCardData, RewardCardData, getCollectionMetadata } from '@/services/cardService';

interface CompletedTask {
  id: string;
  title: string;
  timeSpent: number; // in minutes
  completedAt: Date;
  sunsetImageUrl: string;
}

interface TodaysCollectionProps {
  completedTasks: CompletedTask[];
  isVisible: boolean;
}

export const TodaysCollection = ({ completedTasks, isVisible }: TodaysCollectionProps) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showImmersiveGallery, setShowImmersiveGallery] = useState(false);
  const [rewardCardData, setRewardCardData] = useState<RewardCardData[]>([]);
  const [totalCards, setTotalCards] = useState(8); // Default fallback

  useEffect(() => {
    const loadRewardCardData = async () => {
      const cardData = await getRewardCardData();
      setRewardCardData(cardData);
      
      // Load collection metadata to get total cards count
      const collection = await getCollectionMetadata();
      if (collection?.total_cards) {
        setTotalCards(collection.total_cards);
      }
    };
    loadRewardCardData();
  }, []);

  const getCardAttribution = (imageUrl: string) => {
    const cardIndex = rewardCardData.findIndex(card => card.imageUrl === imageUrl);
    return cardIndex >= 0 ? rewardCardData[cardIndex] : null;
  };

  if (!isVisible || completedTasks.length === 0) return null;

  const totalTimeSpent = completedTasks.reduce((total, task) => total + task.timeSpent, 0);
  const averageTime = Math.round(totalTimeSpent / completedTasks.length);
  
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      {/* Floating Collection Icon */}
      <div className="fixed bottom-6 left-6 z-50">
        <div
          onClick={() => setShowImmersiveGallery(true)}
          className="h-16 w-16 rounded-full cursor-pointer hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center p-2 relative"
        >
          <div className="relative">
            {/* Stack of cards effect - vertical */}
            <div className="absolute -top-1 -left-1 w-6 h-8 bg-white/20 rounded border border-white/30 transform rotate-12"></div>
            <div className="absolute -top-0.5 -left-0.5 w-6 h-8 bg-white/30 rounded border border-white/40 transform rotate-6"></div>
            <div className="w-6 h-8 bg-white/40 rounded border border-white/50 transform rotate-0"></div>
          </div>
          <Badge className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground min-w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
            {completedTasks.length}
          </Badge>
        </div>
      </div>

      {/* Immersive Gallery */}
      {showImmersiveGallery && (
        <ImmersiveGallery
          onClose={() => setShowImmersiveGallery(false)}
        />
      )}

      {/* Today's Collection Overlay */}
      <Dialog open={showOverlay} onOpenChange={setShowOverlay}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-6 w-6 text-primary" />
              Today's Accomplishments
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Daily Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="text-center">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-primary">{completedTasks.length}</div>
                  <p className="text-sm text-muted-foreground">Tasks Completed</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-primary">{formatTime(totalTimeSpent)}</div>
                  <p className="text-sm text-muted-foreground">Total Focus Time</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-primary">{formatTime(averageTime)}</div>
                  <p className="text-sm text-muted-foreground">Avg. per Task</p>
                </CardContent>
              </Card>
            </div>

            {/* Completed Cards Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Completed Cards
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {completedTasks.map((task) => (
                  <Card key={task.id} className="aspect-[3/4] relative overflow-hidden group hover:scale-105 transition-transform duration-200">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ 
                        backgroundImage: `url('${task.sunsetImageUrl}')` 
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 paper-texture" />
                    <div className="absolute top-3 left-2 flex z-30">
                      {Array.from({length: totalCards}, (_, i) => {
                        const attribution = getCardAttribution(task.sunsetImageUrl);
                        const currentCard = task.cardNumber || attribution?.cardNumber || parseInt(task.sunsetImageUrl.match(/reward-(\d+)/)?.[1] || '1');
                        return (
                          <div 
                            key={i} 
                            className={`w-2 h-2 border border-white/20 ${
                              i < currentCard ? 'bg-white/40' : 'bg-transparent'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="absolute top-1 right-2 text-gray-300 text-2xl font-bold z-30" style={{ fontFamily: 'Calendas Plus' }}>
                      {(() => {
                        // Use actual cardNumber from task data, fallback to attribution data, then URL parsing
                        const cardNumber = task.cardNumber || getCardAttribution(task.sunsetImageUrl)?.cardNumber || parseInt(task.sunsetImageUrl.match(/reward-(\d+)/)?.[1] || '1');
                        return cardNumber.toString().padStart(2, '0');
                      })()}
                    </div>
                    
                    <CardContent className="relative h-full flex flex-col justify-end p-4 text-white">
                      <div className="text-center">
                      </div>
                      
                      <div className="space-y-1 text-left">
                        <h4 className="font-medium text-sm leading-tight">
                          {(() => {
                            const attribution = getCardAttribution(task.sunsetImageUrl);
                            const cardNumber = task.cardNumber || attribution?.cardNumber || parseInt(task.sunsetImageUrl.match(/reward-(\d+)/)?.[1] || '1');
                            return attribution?.caption ? `${attribution.caption} (${cardNumber} of ${totalCards})` : `Fleeting Moments (${cardNumber} of ${totalCards})`;
                          })()}
                        </h4>
                        {(() => {
                          const attribution = getCardAttribution(task.sunsetImageUrl);
                          return attribution ? (
                            <>
                              {attribution.attributionUrl ? (
                                <a 
                                  href={attribution.attributionUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs opacity-70 hover:opacity-90 underline transition-opacity block text-left"
                                >
                                  {attribution.attribution}
                                </a>
                              ) : (
                                <div className="text-xs opacity-70 block text-left">
                                  {attribution.attribution}
                                </div>
                              )}
                            </>
                          ) : (
                            <a 
                              href="https://www.instagram.com/p/C5oS4mbIA2F/?igsh=ZjdxbXFodzhoMTE5" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs opacity-70 hover:opacity-90 underline transition-opacity block text-left"
                            >
                              @hanontheroad
                            </a>
                          );
                        })()}
                        <p className="text-xs opacity-60 leading-relaxed italic">
                          {(() => {
                            const attribution = getCardAttribution(task.sunsetImageUrl);
                            return attribution?.description || "strolling down the street of Paris, listening to the symphony called life.";
                          })()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Motivational Message */}
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-4 text-center">
                <p className="text-lg font-medium mb-2">🎉 Fantastic work today!</p>
                <p className="text-muted-foreground">
                  You've completed {completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''} and spent {formatTime(totalTimeSpent)} in focused work. 
                  Keep up the momentum!
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
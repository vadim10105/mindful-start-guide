import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Search, Filter, Trophy, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRewardImageUrls } from '@/services/cardService';

interface CollectedCard {
  id: string;
  title: string;
  timeSpentMinutes: number;
  completedAt: string;
  collectionAddedAt: string;
  priorityScore?: number;
  isLiked?: boolean;
  isUrgent?: boolean;
  isQuick?: boolean;
  flippedImageUrl?: string;
}

interface CardLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CardLibrary = ({ isOpen, onClose }: CardLibraryProps) => {
  const [collectedCards, setCollectedCards] = useState<CollectedCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<CollectedCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'time' | 'title'>('date');
  const [loading, setLoading] = useState(true);
  const [libraryStats, setLibraryStats] = useState({
    totalCards: 0,
    totalDays: 0,
    totalTimeHours: 0,
    averageTimePerCard: 0,
    favoriteCategory: 'Mixed Tasks'
  });
  
  const { toast } = useToast();

  // Sunset images for card backs - loaded from Supabase
  const [sunsetImages, setSunsetImages] = useState<string[]>([]);

  useEffect(() => {
    const loadRewardImages = async () => {
      const imageUrls = await getRewardImageUrls();
      setSunsetImages(imageUrls);
    };
    loadRewardImages();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCollectedCards();
    }
  }, [isOpen]);

  useEffect(() => {
    filterAndSortCards();
  }, [collectedCards, searchTerm, sortBy]);

  const fetchCollectedCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .not('collection_added_at', 'is', null)
        .eq('status', 'completed')
        .order('collection_added_at', { ascending: false });

      if (error) throw error;

      const cards = data.map(task => ({
        id: task.id,
        title: task.title,
        timeSpentMinutes: task.time_spent_minutes || 0,
        completedAt: task.completed_at,
        collectionAddedAt: task.collection_added_at,
        priorityScore: task.ai_priority_score,
        isLiked: task.is_liked,
        isUrgent: task.is_urgent,
        isQuick: task.is_quick,
        flippedImageUrl: task.flipped_image_url
      }));

      setCollectedCards(cards);
      calculateLibraryStats(cards);
    } catch (error) {
      console.error('Error fetching collected cards:', error);
      toast({
        title: "Error",
        description: "Failed to load your card collection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateLibraryStats = (cards: CollectedCard[]) => {
    const totalCards = cards.length;
    const totalTimeMinutes = cards.reduce((sum, card) => sum + card.timeSpentMinutes, 0);
    const totalTimeHours = Math.round(totalTimeMinutes / 60 * 10) / 10;
    const averageTimePerCard = totalCards > 0 ? Math.round(totalTimeMinutes / totalCards) : 0;
    
    // Calculate unique days
    const uniqueDates = new Set(cards.map(card => 
      new Date(card.completedAt).toDateString()
    ));
    const totalDays = uniqueDates.size;

    // Determine favorite category based on tags
    let favoriteCategory = 'Mixed Tasks';
    const likedCount = cards.filter(c => c.isLiked).length;
    const urgentCount = cards.filter(c => c.isUrgent).length;
    const quickCount = cards.filter(c => c.isQuick).length;
    
    const maxCount = Math.max(likedCount, urgentCount, quickCount);
    if (maxCount > 0) {
      if (likedCount === maxCount) favoriteCategory = 'Loved Tasks';
      else if (urgentCount === maxCount) favoriteCategory = 'Urgent Tasks';
      else if (quickCount === maxCount) favoriteCategory = 'Quick Tasks';
    }

    setLibraryStats({
      totalCards,
      totalDays,
      totalTimeHours,
      averageTimePerCard,
      favoriteCategory
    });
  };

  const filterAndSortCards = () => {
    let filtered = [...collectedCards];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(card =>
        card.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort cards
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.collectionAddedAt).getTime() - new Date(a.collectionAddedAt).getTime();
        case 'time':
          return b.timeSpentMinutes - a.timeSpentMinutes;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredCards(filtered);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading your collection...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-7 w-7 text-primary" />
            Your Card Collection
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Library Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="text-center">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-primary">{libraryStats.totalCards}</div>
                <p className="text-sm text-muted-foreground">Total Cards</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-primary">{libraryStats.totalDays}</div>
                <p className="text-sm text-muted-foreground">Active Days</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-primary">{libraryStats.totalTimeHours}h</div>
                <p className="text-sm text-muted-foreground">Focus Time</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-primary">{formatTime(libraryStats.averageTimePerCard)}</div>
                <p className="text-sm text-muted-foreground">Avg. per Card</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-4">
                <div className="text-lg font-bold text-primary">{libraryStats.favoriteCategory}</div>
                <p className="text-sm text-muted-foreground">Top Category</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your collection..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sortBy} onValueChange={(value: 'date' | 'time' | 'title') => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="time">Sort by Time Spent</SelectItem>
                <SelectItem value="title">Sort by Title</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'No matching cards found' : 'No cards in your collection yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Complete tasks and add them to your collection to see them here!'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredCards.map((card, index) => (
                <Card key={card.id} className="aspect-[3/4] relative overflow-hidden group hover:scale-105 transition-transform duration-200">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ 
                      backgroundImage: `url('${card.flippedImageUrl || sunsetImages[index % sunsetImages.length]}')` 
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  
                  <CardContent className="relative h-full flex flex-col justify-between p-3 text-white">
                    <div className="text-center">
                      {card.priorityScore && (
                        <Badge className="bg-white/20 text-white text-xs mt-1">
                          Score: {Math.round(card.priorityScore)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm leading-tight line-clamp-2">
                        {card.title}
                      </h4>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 justify-center">
                        {card.isLiked && (
                          <Badge className="bg-rose-500/80 text-white text-xs px-1 py-0">Fun</Badge>
                        )}
                        {card.isUrgent && (
                          <Badge className="bg-orange-500/80 text-white text-xs px-1 py-0">Urgent</Badge>
                        )}
                        {card.isQuick && (
                          <Badge className="bg-green-500/80 text-white text-xs px-1 py-0">Quick</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-center gap-1 text-xs opacity-90">
                        <Clock className="h-3 w-3" />
                        {formatTime(card.timeSpentMinutes)}
                      </div>
                      
                      <div className="text-xs text-center opacity-75">
                        {formatDate(card.collectionAddedAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
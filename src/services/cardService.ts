import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type CardCollection = Tables<'card_collections'>;
export type CollectionCard = Tables<'collection_cards'>;
export type UserCardProgress = Tables<'user_card_progress'>;

export interface CardWithProgress extends CollectionCard {
  isUnlocked: boolean;
}

export interface CollectionWithProgress extends CardCollection {
  cards: CardWithProgress[];
  userProgress: UserCardProgress | null;
}

// Get user's next reward card based on their progress across collections  
export async function getNextRewardCard(userId: string): Promise<CollectionCard | null> {
  try {
    console.log('getNextRewardCard called with userId:', userId);
    
    // Get all collections ordered by display_order
    const { data: collections, error: collectionsError } = await supabase
      .from('card_collections')
      .select('id, name, display_order')
      .order('display_order');

    if (collectionsError || !collections) {
      console.error('Error fetching collections:', collectionsError);
      return null;
    }

    // Get user's progress for all collections
    const { data: allProgress, error: progressError } = await supabase
      .from('user_card_progress')
      .select('collection_id, cards_unlocked')
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
      return null;
    }

    // Find first incomplete collection (simple 6-card logic)
    for (const collection of collections) {
      const progress = allProgress?.find(p => p.collection_id === collection.id);
      const cardsUnlocked = progress?.cards_unlocked || 0;
      
      console.log(`Collection ${collection.name}: ${cardsUnlocked}/6 cards`);
      
      if (cardsUnlocked < 6) {  // Found incomplete collection
        const nextCardNumber = cardsUnlocked + 1;
        
        // Get the specific card
        const { data: nextCard, error: cardError } = await supabase
          .from('collection_cards')
          .select('*')
          .eq('collection_id', collection.id)
          .eq('card_number', nextCardNumber)
          .single();

        if (cardError) {
          console.error('Error fetching next card:', cardError);
          return null;
        }

        console.log(`Next card: ${collection.name} Card ${nextCardNumber}`);
        return nextCard;
      }
    }

    console.log('All collections complete');
    return null;
  } catch (error) {
    console.error('Error getting next reward card:', error);
    return null;
  }
}

// Unlock next card for user (call when they complete a task)
export async function unlockNextCard(userId: string): Promise<CollectionCard | null> {
  try {
    console.log('🎴 unlockNextCard called with userId:', userId);
    
    if (!userId) {
      console.error('❌ No userId provided to unlockNextCard');
      return null;
    }
    
    // Get the next card that should be unlocked
    const nextCard = await getNextRewardCard(userId);
    if (!nextCard) {
      console.error('No next card found');
      return null;
    }

    console.log('🎴 Next card to unlock:', nextCard);

    // Get current progress for the active collection
    const { data: progress, error: progressError } = await supabase
      .from('user_card_progress')
      .select('cards_unlocked')
      .eq('user_id', userId)
      .eq('collection_id', nextCard.collection_id)
      .maybeSingle();

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return null;
    }

    const currentUnlocked = progress?.cards_unlocked || 0;
    const newUnlocked = currentUnlocked + 1;

    console.log(`🎴 Updating collection progress: ${currentUnlocked} → ${newUnlocked}`);

    // Update or create progress for this collection
    if (progress) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_card_progress')
        .update({ 
          cards_unlocked: newUnlocked,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('collection_id', nextCard.collection_id);
      
      if (updateError) {
        console.error('Error updating progress:', updateError);
        return null;
      }
    } else {
      // Insert new record for this collection
      const { error: insertError } = await supabase
        .from('user_card_progress')
        .insert({
          user_id: userId,
          collection_id: nextCard.collection_id,
          cards_unlocked: newUnlocked
        });
      
      if (insertError) {
        console.error('Error inserting progress:', insertError);
        return null;
      }
    }

    console.log('🎴 Successfully unlocked card:', nextCard.card_number, 'from collection:', nextCard.collection_id);
    return nextCard;
  } catch (error) {
    console.error('Error unlocking next card:', error);
    return null;
  }
}

export interface RewardCardData {
  imageUrl: string;
  attribution: string;
  attributionUrl: string;
  description: string;
  caption: string;
  cardNumber: number;
  collectionName: string;
}

// Get the next sequential card for a user based on their progress
export async function getNextSequentialCard(userId: string, collectionId?: string): Promise<{
  card: RewardCardData;
  cardId: string;
  cardNumber: number;
  collectionId: string;
} | null> {
  try {
    // Get the first/main collection if no collectionId provided
    let targetCollectionId = collectionId;
    if (!targetCollectionId) {
      const { data: collections } = await supabase
        .from('card_collections')
        .select('id')
        .order('created_at')
        .limit(1);
      
      if (!collections?.length) {
        console.error('No collections found');
        return null;
      }
      targetCollectionId = collections[0].id;
    }

    // Get user's current progress
    const { data: progress } = await supabase
      .from('user_card_progress')
      .select('cards_unlocked')
      .eq('user_id', userId)
      .eq('collection_id', targetCollectionId)
      .maybeSingle();

    const currentUnlocked = progress?.cards_unlocked || 0;
    const nextCardNumber = currentUnlocked + 1;

    // Get the next card in sequence
    const { data: card, error } = await supabase
      .from('collection_cards')
      .select('id, image_url, attribution, attribution_url, description, caption, card_number')
      .eq('collection_id', targetCollectionId)
      .eq('card_number', nextCardNumber)
      .single();

    if (error || !card) {
      // If no card found in current collection, try the next collection
      const { data: collections } = await supabase
        .from('card_collections')
        .select('id')
        .order('created_at')
        .gt('created_at', (await supabase
          .from('card_collections')
          .select('created_at')
          .eq('id', targetCollectionId)
          .single()).data?.created_at || '')
        .limit(1);

      if (collections?.length) {
        // Recursively try the next collection
        return getNextSequentialCard(userId, collections[0].id);
      }
      
      console.error('No more cards available in any collection');
      return null;
    }

    return {
      card: {
        imageUrl: card.image_url,
        attribution: card.attribution,
        attributionUrl: card.attribution_url,
        description: card.description,
        caption: card.caption,
        cardNumber: card.card_number
      },
      cardId: card.id,
      cardNumber: card.card_number,
      collectionId: targetCollectionId
    };
  } catch (error) {
    console.error('Error getting next sequential card:', error);
    return null;
  }
}

// Get reward card data from collection_cards table
export async function getRewardCardData(): Promise<RewardCardData[]> {
  try {
    const { data: cards, error } = await supabase
      .from('collection_cards')
      .select(`
        image_url, 
        attribution, 
        attribution_url, 
        description, 
        caption, 
        card_number,
        card_collections!inner(name)
      `)
      .order('card_number');

    if (error) {
      console.error('Error fetching reward card data:', error);
      return [];
    }

    return cards?.map(card => ({
      imageUrl: card.image_url,
      attribution: card.attribution,
      attributionUrl: card.attribution_url,
      description: card.description,
      caption: card.caption,
      cardNumber: card.card_number,
      collectionName: card.card_collections.name
    })).filter(card => card.imageUrl) || [];
  } catch (error) {
    console.error('Error getting reward card data:', error);
    return [];
  }
}

// Get reward image URLs from collection_cards table (legacy function for backwards compatibility)
export async function getRewardImageUrls(): Promise<string[]> {
  const cardData = await getRewardCardData();
  return cardData.map(card => card.imageUrl);
}

// Get all collections with user progress
export async function getCollectionsWithProgress(userId: string): Promise<CollectionWithProgress[]> {
  try {
    // Get all collections
    const { data: collections } = await supabase
      .from('card_collections')
      .select('*')
      .order('display_order');

    if (!collections) return [];

    // Get user progress for all collections
    const { data: progressList } = await supabase
      .from('user_card_progress')
      .select('*')
      .eq('user_id', userId);

    // Get all cards for all collections
    const { data: allCards } = await supabase
      .from('collection_cards')
      .select('*')
      .order('card_number');

    if (!allCards) return [];

    // Combine data
    return collections.map(collection => {
      const userProgress = progressList?.find(p => p.collection_id === collection.id) || null;
      const cardsUnlocked = userProgress?.cards_unlocked || 0;
      
      const collectionCards = allCards
        .filter(card => card.collection_id === collection.id)
        .map(card => ({
          ...card,
          isUnlocked: card.card_number <= cardsUnlocked
        }));

      return {
        ...collection,
        cards: collectionCards,
        userProgress
      };
    });
  } catch (error) {
    console.error('Error getting collections with progress:', error);
    return [];
  }
}

// Get collection metadata (total cards, name, etc.)
export async function getCollectionMetadata() {
  try {
    // Use the same pattern as other working functions
    const { data: collection, error } = await supabase
      .from('card_collections')
      .select('id, total_cards')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching collection metadata:', error);
      return null;
    }

    return collection;
  } catch (error) {
    console.error('Error getting collection metadata:', error);
    return null;
  }
}
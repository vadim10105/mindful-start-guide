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

// Get user's next reward card based on their progress
export async function getNextRewardCard(userId: string): Promise<CollectionCard | null> {
  try {
    console.log('getNextRewardCard called with userId:', userId);
    
    // Get the first collection (for now we only have one)
    const { data: collection, error: collectionError } = await supabase
      .from('card_collections')
      .select('id, total_cards')
      .limit(1)
      .single();

    if (collectionError) {
      console.error('Error fetching collection in getNextRewardCard:', collectionError);
      return null;
    }

    if (!collection) {
      console.log('No collections found in getNextRewardCard');
      return null;
    }

    // Get user's progress for this collection
    const { data: progress, error: progressError } = await supabase
      .from('user_card_progress')
      .select('cards_unlocked')
      .eq('user_id', userId)
      .eq('collection_id', collection.id)
      .maybeSingle();

    if (progressError) {
      console.error('Error fetching progress in getNextRewardCard:', progressError);
      return null;
    }

    const cardsUnlocked = progress?.cards_unlocked || 0;
    console.log('Cards unlocked for user:', cardsUnlocked);
    
    // If they've unlocked all cards, cycle back to first card
    const nextCardNumber = (cardsUnlocked % collection.total_cards) + 1;

    // Get the next card to unlock
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

    console.log('Found next card:', nextCard);
    return nextCard;
  } catch (error) {
    console.error('Error getting next reward card:', error);
    return null;
  }
}

// Unlock next card for user (call when they complete a task)
export async function unlockNextCard(userId: string): Promise<CollectionCard | null> {
  try {
    console.log('🎴 unlockNextCard called with userId:', userId);
    console.log('🎴 userId type:', typeof userId, 'length:', userId.length);
    
    if (!userId) {
      console.error('❌ No userId provided to unlockNextCard');
      return null;
    }
    
    // Get the first collection
    const { data: collection, error: collectionError } = await supabase
      .from('card_collections')
      .select('id, total_cards')
      .limit(1)
      .single();

    if (collectionError) {
      console.error('Error fetching collection:', collectionError);
      return null;
    }
    if (!collection) {
      console.error('No collections found - you may need to run database migrations or seed initial data');
      return null;
    }

    console.log('🎴 Found collection:', collection);

    // Get or create user progress
    console.log('🎴 Querying user_card_progress with user_id:', userId, 'collection_id:', collection.id);
    const { data: progress, error: progressError } = await supabase
      .from('user_card_progress')
      .select('cards_unlocked')
      .eq('user_id', userId)
      .eq('collection_id', collection.id)
      .maybeSingle();

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      console.error('This might be an RLS policy issue. User might not have permission to access user_card_progress table');
      return null;
    }

    console.log('Current progress:', progress);

    const currentUnlocked = progress?.cards_unlocked || 0;
    const newUnlocked = currentUnlocked + 1;

    console.log('Updating cards unlocked from', currentUnlocked, 'to', newUnlocked);

    // Update progress
    if (progress) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_card_progress')
        .update({ cards_unlocked: newUnlocked })
        .eq('user_id', userId)
        .eq('collection_id', collection.id);
      
      if (updateError) {
        console.error('Error updating progress:', updateError);
        return null;
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_card_progress')
        .insert({
          user_id: userId,
          collection_id: collection.id,
          cards_unlocked: newUnlocked
        });
      
      if (insertError) {
        console.error('Error inserting progress:', insertError);
        return null;
      }
    }

    // Return the card they just unlocked
    const cardNumber = ((currentUnlocked) % collection.total_cards) + 1;
    
    const { data: unlockedCard } = await supabase
      .from('collection_cards')
      .select('*')
      .eq('collection_id', collection.id)
      .eq('card_number', cardNumber)
      .single();

    console.log('Unlocked card:', unlockedCard);
    return unlockedCard;
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
}

// Get reward card data from collection_cards table
export async function getRewardCardData(): Promise<RewardCardData[]> {
  try {
    const { data: cards, error } = await supabase
      .from('collection_cards')
      .select('image_url, attribution, attribution_url, description, caption, card_number')
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
      cardNumber: card.card_number
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
      .order('created_at');

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
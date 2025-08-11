// Script to add technical_work category to existing user profiles
import { createClient } from '@supabase/supabase-js'

// You'll need to replace these with your actual Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateProfiles() {
  try {
    // Get all profiles that have task_preferences
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, user_id, task_preferences')
      .not('task_preferences', 'is', null)

    if (fetchError) {
      console.error('Error fetching profiles:', fetchError)
      return
    }

    console.log(`Found ${profiles.length} profiles to update`)

    for (const profile of profiles) {
      const currentPreferences = profile.task_preferences || {}
      
      // Add technical_work with default 'neutral' if it doesn't exist
      if (!currentPreferences.technical_work) {
        const updatedPreferences = {
          ...currentPreferences,
          technical_work: 'neutral'
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ task_preferences: updatedPreferences })
          .eq('id', profile.id)

        if (updateError) {
          console.error(`Error updating profile ${profile.id}:`, updateError)
        } else {
          console.log(`✅ Updated profile ${profile.id} with technical_work: neutral`)
        }
      } else {
        console.log(`Profile ${profile.id} already has technical_work category`)
      }
    }

    console.log('Profile update complete!')
  } catch (error) {
    console.error('Script error:', error)
  }
}

updateProfiles()
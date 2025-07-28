import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCardData() {
  try {
    // Check what tables exist
    console.log('Checking available tables...')
    
    // Try to query for cards table
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .limit(5)
    
    if (!cardsError) {
      console.log('Cards table found:', cards)
    } else {
      console.log('Cards table error:', cardsError.message)
    }
    
    // Check tasks table for flipped_image_url and other card-related fields
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, flipped_image_url')
      .not('flipped_image_url', 'is', null)
      .limit(5)
    
    if (!tasksError) {
      console.log('Tasks with flipped images:', tasks)
    } else {
      console.log('Tasks query error:', tasksError.message)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkCardData()
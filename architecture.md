# Mindful Start Guide - Architecture Overview

## What This App Does
A productivity app that helps users manage tasks through gamification. Users can create tasks, work on them in focused sessions, and unlock collectible cards as rewards. The app uses AI to break down complex tasks and categorize them.

## Project Structure

### =� Root Files
- `package.json` - Dependencies and build scripts for the React/Vite app
- `vite.config.ts` - Build configuration (bundling, dev server, etc.)
- `tailwind.config.ts` - Styling configuration
- `components.json` - UI component library settings (shadcn/ui)

### =� src/ - Main Application Code

#### =� src/pages/ - Main App Screens
- `Index.tsx` - Landing page with task overview and quick actions
- `Tasks.tsx` - Main task management interface with card-based game UI
- `Auth.tsx` - Login/signup screen
- `Onboarding.tsx` - First-time user setup flow
- `Settings.tsx` - User preferences and account settings
- `NotFound.tsx` - 404 error page

#### =� src/components/ - Reusable UI Components

##### =� src/components/onboarding/ - First-Time User Setup
- `OnboardingFlow.tsx` - Guides new users through initial setup
- `NameStep.tsx` - Collects user's display name
- `EnergyTimeSteps.tsx` - Asks about peak/low energy times for task scheduling
- `TaskPreferenceStep.tsx` - Learns what types of tasks user prefers
- `TaskSwipeCards.tsx` - Interactive card interface for task preferences
- `ReviewStep.tsx` - Shows summary before completing onboarding

##### =� src/components/tasks/ - Task Management Features

###### =� src/components/tasks/game/ - Gamified Task Interface
- `TaskGameController.tsx` - Main game logic and state management
- `TaskCard.tsx` - Individual task display with swipe actions
- `TaskSwiper.tsx` - Handles swiping gestures for task interactions
- `TaskActions.tsx` - Action buttons (complete, skip, break down, etc.)
- `GameState.tsx` - Manages game progression and scoring
- `TaskProgressManager.tsx` - Tracks completion stats and streaks
- `TaskNavigationManager.tsx` - Handles moving between tasks
- `TaskTimeDisplay.tsx` - Shows timers and time estimates
- `NavigationDots.tsx` - Visual indicator of position in task queue
- `ShuffleAnimation.tsx` - Visual feedback when tasks are reordered

###### =� src/components/tasks/PictureInPicture/ - Multi-Task Management
- `PictureInPictureManager.tsx` - Displays Card as a floating window via PIP.
- `PiPController.tsx` - Controls for managing picture-in-picture mode
- `PiPCard.tsx` - Compact task card for PiP view
- `PiPContext.tsx` - State management for PiP functionality
- `index.ts` - Exports all PiP components
- **Dynamic Window Resizing**: PiP window intelligently resizes based on content
  - Measures actual notes section height using `getBoundingClientRect()`
  - Adapts to varying task title lengths automatically
  - Collapses/expands by precise amount rather than fixed pixels
  - Maintains minimum window size (320px) and smooth transitions

###### =� src/components/tasks/collection/ - Card Collection System
- `ImmersiveGallery.tsx` - Displays unlocked collectible cards as rewards, supports auto-navigation to specific cards
- `GalleryIcon.tsx` - Fixed bottom-left icon showing collection progress, counts both 'complete' and 'made_progress' tasks

###### =� src/components/tasks/task-capture/ - Task Input and Organization
- `TaskTimeline.tsx` - Visual timeline view of tasks 
- `TaskListItem.tsx` - Individual task in list format with time spent display
- `DroppableZone.tsx` - Drag-and-drop interface for task organization

##### =� src/components/settings/ - User Preferences
- `SettingsModal.tsx` - Popup settings interface
- `SettingsPage.tsx` - Full-page settings view

##### =� src/components/ui/ - Base UI Components
All the foundational UI elements (buttons, cards, dialogs, etc.) from shadcn/ui library plus custom components:
- `InlineTimeEditor.tsx` - Quick editing of task time estimates
- `TypewriterPlaceholder.tsx` - Animated placeholder text
- `glsl-background.tsx` - Animated shader background
- `progress-ring.tsx` - Circular progress indicators
- `theme-toggle.tsx` - Dark/light mode switcher

#### =� src/hooks/ - Reusable Logic
- `use-typewriter.tsx` - Animated typing effect
- `use-loading-typewriter.tsx` - Typewriter effect with loading states
- `use-mobile.tsx` - Detects if user is on mobile device
- `use-toast.ts` - Toast notification system

#### =� src/integrations/supabase/ - Database Connection
- `client.ts` - Supabase connection and configuration
- `types.ts` - TypeScript definitions for database tables
- `types-old.ts` - Legacy type definitions (kept for migration reference)

#### =� src/services/ - Business Logic
- `cardService.ts` - Handles card collection and unlocking logic

#### =� src/utils/ - Helper Functions
- `taskCategorization.ts` - Logic for automatically categorizing tasks
- `timeUtils.ts` - Time formatting and calculation helpers

#### =� src/lib/ - Third-Party Integrations
- `utils.ts` - Utility functions and class name helpers

### =� supabase/ - Backend Services

#### Database Schema (from current_schema.sql)
- **profiles** - User account info, preferences, onboarding status
- **tasks** - Individual tasks with status, timing, categorization
  - `parent_task_id` - Links child tasks to parent tasks for time aggregation
  - `time_spent_minutes` - Actual time spent working on the task (stored as string, converted to number in UI)
  - `collection_card_id` - Links completed/made_progress tasks to earned cards
  - `list_location` - active, later, collection (collection tasks must be loaded for parent task access)
  - `task_status` - task_list, complete, made_progress, etc. (both complete and made_progress count as earned cards)
- **card_collections** - Groups of collectible cards
- **collection_cards** - Individual cards with images and metadata
- **user_card_progress** - Which cards each user has unlocked
- **daily_stats** - User progress tracking (tasks completed, time spent)

#### =� supabase/functions/ - AI-Powered Edge Functions
- `process-brain-dump/` - Takes messy text input and extracts organized tasks
- `process-image-brain-dump/` - Same as above but for image input (OCR + AI)
- `breakdown-task/` - Breaks complex tasks into smaller, manageable subtasks
- `categorize-task/` - Automatically assigns categories to tasks
- `shuffle-tasks/` - Intelligently reorders tasks based on user preferences

### =� public/ - Static Assets
- `favicon.ico` - Browser tab icon
- `robots.txt` - Search engine instructions
- `Calendas_Plus (1).otf` - Custom font file

## Key Features Explained

### Task Management Flow
1. **Input**: Users add tasks via brain dump (text/image) or manual entry
2. **AI Processing**: Tasks get broken down and categorized automatically
3. **Game Interface**: Tasks appear as cards that can be swiped through
4. **Completion**: Users work on tasks and track time spent
5. **Rewards**: Completing tasks unlocks collectible cards

### Parent Task Time Aggregation
- When tasks are marked as "made progress" and new follow-up tasks are created, they link via `parent_task_id`
- TaskListItem displays "Time Spent: Xm" under task titles, showing accumulated time from the entire task chain
- Time calculation follows the parent chain recursively, summing all `time_spent_minutes` from child to original parent
- Includes clickable link icon (ExternalLink) next to time display that opens ImmersiveGallery and auto-flips to parent's earned card
- Implementation in `Tasks.tsx` inline TaskListItem component with recursive time calculation
- Collection tasks must be loaded (not just active/later) to ensure parent task data is available

### Data Flow
1. Frontend (React/TypeScript) handles UI and user interactions
2. Supabase Edge Functions process AI requests (OpenAI integration)
3. Supabase database stores all user data with row-level security
4. Real-time updates keep the UI synchronized across sessions

### Authentication & Security
- Supabase Auth handles user login/signup
- Row Level Security ensures users only see their own data
- All AI processing happens server-side for security

This architecture enables a smooth, gamified productivity experience while keeping user data secure and providing intelligent task management features.
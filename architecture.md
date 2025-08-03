# Mindful Start Guide - Architecture Overview

## 🗺️ User-Friendly Navigation Guide

*This section helps you understand where everything is in the codebase so you can point me to the right files.*

### Main App Structure

**📱 Pages (`src/pages/`)**
- `Tasks.tsx` - **The main app** - where users do everything (brain dump, task lists, card game)
- `Welcome.tsx` - Landing page for new users
- `Auth.tsx` - Login/signup page
- `Onboarding.tsx` - Multi-step setup for new users
- `Settings.tsx` - User preferences and account settings

### Key Feature Areas

**🎮 Task Game & Cards (`src/components/tasks/`)**
- `GameTaskCards.tsx` - The actual card game interface
- `TaskSwiper.tsx` - The swipeable card interface
- `TaskCard.tsx` - Individual task card design
- `TaskTimer/` - Timer functionality for focus sessions
- `PictureInPicture/` - The pop-out window feature for focus mode

**🎯 Task Management (`src/components/tasks/`)**
- `TaskActions.tsx` - What happens when you swipe/interact with cards
- `TaskProgressTracker.tsx` - Progress tracking and visual feedback
- `TaskTimeline.tsx` - The day planning timeline view
- `CardLibrary.tsx` - Collection of earned cards

**⚙️ Setup & Settings (`src/components/onboarding/` & `src/components/settings/`)**
- `OnboardingFlow.tsx` - Guides new users through setup
- `TaskPreferences.tsx` - Category preference settings
- `UserAccount.tsx` - Profile management

### Behind-the-Scenes Magic

**🤖 AI Functions (`supabase/functions/`)**
- `process-brain-dump` - Turns messy thoughts into organized tasks
- `categorize-task` - Figures out what type of task it is
- `shuffle-tasks` - Smart task reordering with user preferences (replaces old prioritize-tasks)
- `breakdown-task` - Breaks complex tasks into simple steps

**💾 Database Tables (Supabase)**
- `tasks` - All your tasks and their details
- `profiles` - User preferences and settings
- `card_collections` - Achievement cards you can earn
- `subtasks` - AI-generated step-by-step breakdowns

### Common Issues & Where To Look

**"Tasks aren't saving properly"** → Check `src/pages/Tasks.tsx` (database functions)
**"AI features not working"** → Check `supabase/functions/` edge functions
**"Cards/achievements broken"** → Check `src/components/tasks/CardLibrary.tsx`
**"Onboarding problems"** → Check `src/components/onboarding/` files
**"Picture-in-Picture issues"** → Check `src/components/tasks/PictureInPicture/` 
**"Timer problems"** → Check `src/components/tasks/TaskTimer/` files

---

## 🔧 Technical Reference

*Detailed technical information for development work.*

### Architecture Overview

**Framework**: React 18 + TypeScript + Vite
**Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
**UI**: shadcn/ui components + Tailwind CSS
**State**: TanStack Query + React hooks
**Special APIs**: Chrome Document Picture-in-Picture API

### Critical Files Requiring Attention

**⚠️ IMMEDIATE REFACTORING NEEDED**
- `src/pages/Tasks.tsx` (2000+ lines) - Needs to be broken into logical sections:
  - Brain dump processing logic
  - Task list management 
  - Drag & drop handlers
  - Database operations
  - State management

### Database Schema

**Core Tables:**
```sql
tasks: id, user_id, title, status, category, estimated_minutes, is_liked, is_urgent, is_quick, list_location, task_status, notes, score
profiles: user_id, task_preferences, peak_energy_time, lowest_energy_time, task_start_preference
subtasks: id, task_id, content, is_done
card_collections: id, name, description, is_active
collection_cards: id, collection_id, title, description, image_url, position_in_collection
user_card_progress: user_id, collection_id, cards_unlocked, is_completed
daily_stats: user_id, stat_date, tasks_completed, total_time_minutes, cards_collected
```

### AI Edge Functions

**Location**: `supabase/functions/`
- `process-brain-dump/index.ts` - GPT-4 powered task extraction
- `categorize-task/index.ts` - Task categorization (7 categories)
- `shuffle-tasks/index.ts` - Rule-based task reordering with user preference scoring (replaced prioritize-tasks)
- `breakdown-task/index.ts` - ADHD-friendly task decomposition

### Component Architecture

**State Management Patterns:**
- Server state: TanStack Query with Supabase
- Local state: React hooks (useState, useReducer)
- Cross-component state: Context providers (PiP)

**Key Custom Hooks:**
- `use-toast` - Notification system
- `use-typewriter` - Text animation effects
- Task-specific hooks in TaskTimer components

### Development Utilities

**Utils (`src/utils/`):**
- `timeUtils.ts` - Time parsing and formatting
- `taskCategorization.ts` - AI categorization logic

**Services (`src/services/`):**
- `cardService.ts` - Collection management

### Performance Notes

**Current Bottlenecks:**
- Tasks.tsx file size (2000+ lines)
- AI function call frequency (no caching)
- Large task list rendering (no virtualization)

**Optimization Opportunities:**
- Component decomposition (Tasks.tsx)
- AI response caching
- List virtualization for 100+ tasks
- Image optimization for card collections

### Recent Major Changes

- **Component Refactoring**: Broke down GameTaskCards.tsx monolith into specialized managers
- **Card Collection System**: Progressive achievement unlocking with database-driven rewards
- **Rule-Based Task Shuffling**: Advanced scoring algorithm with user preference integration (replaced AI prioritize-tasks)
- **Enhanced PiP Features**: Cross-window state synchronization for distraction-free focus
- **Task Editing**: Inline editing with delete-on-empty functionality

### Development Environment

**Required Environment Variables:**
```
OPENAI_API_KEY=xxx
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**Key Scripts:**
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - ESLint check

### Security Model

- Row Level Security (RLS) on all tables
- JWT authentication via Supabase
- User data isolation through RLS policies
- Input validation with Zod schemas

---

*Last updated: February 2025*
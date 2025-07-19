
# Project Architecture Documentation

## Non-Technical Overview

### Project Purpose
This is an AI-powered task management application that gamifies productivity through a card-based interface. Instead of overwhelming todo lists, users interact with beautifully designed task cards in a swipe-based game format, making productivity feel engaging and manageable.

### Core Concept
- **Smart Prioritization**: AI analyzes user preferences and task characteristics to intelligently order tasks
- **Card Game Interface**: Tasks are presented as cards in a deck, similar to a card game, with sunset-themed imagery
- **Focus Sessions**: Users commit to 5-minute focus sessions, with navigation locked to encourage deep work
- **Collection System**: Completed tasks become collectible sunset cards that users can save
- **Lazy Character**: "Mr. Intent" provides humorous, lazy commentary throughout the experience

### User Journey
1. **Onboarding**: New users complete preference setup (name, task type preferences, energy times)
2. **Task Input**: Users can add tasks manually or through AI-powered "brain dump" processing
3. **Prioritization**: AI automatically orders tasks based on user preferences and task characteristics
4. **Game Interface**: Users interact with task cards through swiping and commitment actions
5. **Focus Sessions**: 5-minute minimum commitment periods with locked navigation
6. **Completion & Collection**: Finished tasks become collectible cards with sunset imagery

### Key Features
- **7-Category Task System**: Creative, Analytical, Social, Physical, Routine, Learning, Planning
- **AI-Powered Brain Dump**: Natural language task processing with automatic categorization
- **Smart Prioritization**: Considers user preferences, energy levels, and task urgency
- **Gamified Interface**: Card-based interaction with progress tracking
- **Collection System**: Sunset-themed completion cards
- **Character Interaction**: Lazy mascot with contextual commentary
- **Settings Management**: User preference updates and account management

### Data Flow
1. User preferences collected during onboarding
2. Tasks created through manual input or AI brain dump processing
3. AI prioritization engine orders tasks based on multiple factors
4. Game interface presents tasks as interactive cards
5. User actions update task status and trigger character responses
6. Progress tracking and statistics stored for user insights

## Technical Reference

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom semantic tokens
- **UI Components**: shadcn/ui component library
- **State Management**: React hooks with local state
- **Data Fetching**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **AI Integration**: OpenAI API via Supabase Edge Functions
- **Card Interface**: Swiper.js for card interactions
- **Icons**: Lucide React
- **Animations**: Canvas Confetti for celebrations

### Database Schema

#### Core Tables
- **profiles**: User profile data and preferences
  - `user_id`, `display_name`, `onboarding_completed`
  - `task_preferences` (JSONB), `peak_energy_time`, `lowest_energy_time`
  
- **tasks**: Task management and metadata
  - `id`, `user_id`, `title`, `status`, `source`
  - `is_liked`, `is_urgent`, `is_quick`, `is_disliked`
  - `priority_score`, `dopamine_score`, `ai_priority_score`
  - `card_position`, `time_spent_minutes`, `completed_at`
  
- **subtasks**: Task breakdown and progress tracking
  - `id`, `task_id`, `content`, `is_done`
  
- **daily_stats**: User progress and analytics
  - `user_id`, `stat_date`, `tasks_completed`, `total_time_minutes`, `cards_collected`

#### Security Model
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Authentication required for all operations
- Foreign key relationships maintain data integrity

### API Architecture

#### Supabase Edge Functions
- **prioritize-tasks**: AI-powered task ordering using OpenAI
- **process-brain-dump**: Natural language task processing and categorization

#### Integration Points
- OpenAI API for task processing and prioritization
- Supabase real-time subscriptions for live updates
- File storage for user-generated content

### Component Architecture

#### Page Components (`src/pages/`)
- `Index.tsx`: Landing/dashboard page
- `Auth.tsx`: Authentication flow
- `Onboarding.tsx`: User setup process
- `Tasks.tsx`: Main game interface
- `Settings.tsx`: User preference management

#### Feature Components (`src/components/`)
- **onboarding/**: Multi-step user setup flow
- **tasks/**: Game interface and card management
- **settings/**: User preference controls
- **ui/**: Reusable shadcn/ui components

#### Key Game Components
- `GameTaskCards.tsx`: Main game interface controller (692 lines - needs refactoring)
- `TaskSwiper.tsx`: Card swiping interface using Swiper.js
- `TaskCard.tsx`: Individual task card presentation
- `MrIntentCharacter.tsx`: Lazy mascot with contextual messages
- `NavigationDots.tsx`: Progress indicators

### State Management Patterns

#### Local State
- React hooks for component-level state
- Custom hooks for reusable logic (`use-toast`, `use-typewriter`)
- Ref management for Swiper integration

#### Server State
- TanStack Query for API data fetching and caching
- Supabase client for real-time subscriptions
- Optimistic updates for better UX

### Authentication & Security
- Supabase Auth with email/password
- JWT tokens for API authentication
- RLS policies prevent unauthorized data access
- Edge functions use service role for AI API calls

### Styling System
- Tailwind CSS with custom configuration
- Semantic color tokens in `index.css`
- Dark/light theme support via `next-themes`
- Custom UI components from shadcn/ui
- Responsive design patterns

### Development Patterns

#### Code Organization
- Feature-based folder structure
- Shared utilities in `src/utils/`
- Type definitions co-located with features
- Reusable hooks in `src/hooks/`

#### TypeScript Usage
- Strict type checking enabled
- Interface definitions for all data structures
- Supabase-generated types for database schema
- Custom type definitions for business logic

#### Error Handling
- Toast notifications for user feedback
- Console logging for debugging
- Graceful fallbacks for API failures

## Recent Changes Log

### 2024-12-19: Task Category System Update
- Updated from 8 categories to 7-category system
- New categories: Creative, Analytical, Social, Physical, Routine, Learning, Planning
- Updated onboarding flow, settings page, and categorization utilities
- Enhanced keyword mapping for automatic task categorization

### Architecture Maintenance Notes
- `GameTaskCards.tsx` is 692 lines and should be refactored into smaller components
- Consider extracting timer logic, character message management, and navigation state
- Task categorization system ready for AI prioritization rule implementation

## Known Issues & TODOs
- Large component files need refactoring (GameTaskCards.tsx)
- AI prioritization rules need implementation
- Real-time updates could be added for multi-device sync
- Performance optimization for large task lists

## Deployment Information
- Hosted on Lovable platform
- Supabase backend with edge functions
- Environment variables managed through Supabase secrets
- Automatic deployment on code changes

## Environment Configuration
- `OPENAI_API_KEY`: Required for AI features
- `SUPABASE_URL`: Database connection
- `SUPABASE_ANON_KEY`: Public API access
- `SUPABASE_SERVICE_ROLE_KEY`: Edge function access

---

*This document should be updated after each major architectural change or feature addition.*

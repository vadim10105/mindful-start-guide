# Project Architecture Documentation

## Non-Technical Overview

### Project Purpose
This is an AI-powered task management application specifically designed for neurodivergent individuals (especially those with ADHD). The application gamifies productivity through a swipeable card-based interface, making task management feel engaging and manageable rather than overwhelming.

### Core Concept
- **Intelligent Prioritization**: AI analyzes user preferences, energy levels, and task characteristics to automatically order tasks
- **Swipeable Card Interface**: Tasks are presented as interactive cards that users can swipe through, skip, or commit to
- **ADHD-Friendly Features**: 5-minute minimum focus sessions, AI task breakdown, time estimation, and progress tracking
- **Picture-in-Picture Support**: Chrome Document PiP API integration for distraction-free task focus
- **Smart Timeline**: AI-powered day planning with cross-component hover synchronization

### User Journey
1. **Onboarding**: Multi-step preference setup (name, task categories, energy times, start preferences)
2. **Task Input**: Manual entry or AI-powered "brain dump" processing with automatic categorization
3. **AI Prioritization**: Automatic task ordering based on user preferences, energy levels, and task urgency
4. **Card Interface**: Swipeable task cards with time estimation and difficulty indicators
5. **Focus Sessions**: 5-minute minimum commitment periods with progress tracking
6. **Task Breakdown**: AI-generated subtasks for complex tasks (3-5 simple steps)
7. **Picture-in-Picture**: Optional distraction-free mode using Chrome's Document PiP API

### Key Features
- **7-Category Task System**: Creative, Analytical, Social, Physical, Routine, Learning, Planning
- **AI-Powered Brain Dump**: Natural language task processing with time estimation
- **Smart Prioritization**: Multi-factor AI ordering considering preferences, energy, and urgency
- **Task Breakdown**: AI-generated subtasks for ADHD-friendly task management
- **Time Estimation**: Inline editing with AI suggestions
- **Progress Tracking**: Auto-start timers with smart "Move On" behavior
- **Picture-in-Picture**: Chrome Document PiP API for focused work sessions
- **Day Timeline**: Visual planning with intelligent task scheduling
- **Archive System**: Completed task collection with position tracking

### Data Flow
1. User preferences collected during comprehensive onboarding
2. Tasks created through manual input or AI brain dump processing
3. AI categorization and time estimation applied automatically
4. Multi-factor prioritization engine orders tasks intelligently
5. Card interface presents tasks with swipe interactions
6. Progress tracking updates in real-time with auto-pause/resume
7. Completed tasks archived with collection system

## Technical Architecture

### Technology Stack

**Frontend Framework**
- React 18.3.1 with TypeScript and strict mode
- Vite 5.4.1 build system with SWC React plugin
- React Router DOM 6.26.2 for navigation

**UI & Styling**
- Complete shadcn/ui component library (50+ components)
- Tailwind CSS 3.4.11 with dark-mode-only theme
- Custom CSS animations (card shuffling, accordion, progress ring)
- Semantic design tokens with HSL color system

**State Management**
- TanStack Query 5.56.2 for server state and caching
- React hooks for local component state
- Custom hooks for reusable logic patterns

**Interactive Features**
- Swiper.js 11.2.10 for card interactions
- @dnd-kit suite for drag-and-drop functionality
- Canvas Confetti 1.9.3 for celebration animations
- Chrome Document Picture-in-Picture API integration

**Forms & Validation**
- React Hook Form 7.53.0 for form management
- Zod validation schemas for type-safe data handling

**Backend & Database**
- Supabase (PostgreSQL + Edge Functions + Auth)
- Row Level Security (RLS) policies on all tables
- Real-time subscriptions via @supabase/supabase-js 2.50.3

### Database Schema

#### Core Tables

**`profiles` - User Data & Preferences**
- `user_id` (UUID, primary key)
- `display_name` (text)
- `onboarding_completed` (boolean)
- `task_preferences` (JSONB) - Category preferences and weights
- `peak_energy_time`, `lowest_energy_time` (text)
- `task_start_preference` (text) - User's preferred task initiation method

**`tasks` - Enhanced Task Management**
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `title` (text)
- `status` (enum: active | completed | skipped | paused)
- `difficulty` (enum: easy | neutral | hard)
- `source` (enum: brain_dump | manual | ai)
- AI Scoring Fields:
  - `ai_priority_score` (numeric)
  - `dopamine_score` (numeric)
  - `card_position` (integer)
- Time Tracking:
  - `time_spent_minutes` (integer)
  - `estimated_time_minutes` (integer)
  - `paused_at` (timestamp)
  - `completed_at` (timestamp)
- User Interactions:
  - `is_liked`, `is_disliked`, `is_quick`, `is_urgent` (boolean)
- Archive System:
  - `archived_at` (timestamp)
  - `archive_position` (integer)

**`subtasks` - AI-Generated Task Breakdown**
- `id` (UUID, primary key)
- `task_id` (UUID, foreign key)
- `content` (text)
- `is_done` (boolean)
- `created_at` (timestamp)

**`daily_stats` - User Analytics**
- `user_id` (UUID, foreign key)
- `stat_date` (date)
- `tasks_completed` (integer)
- `total_time_minutes` (integer)
- `cards_collected` (integer)

#### Security Model
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data through policy enforcement
- JWT token authentication for all operations
- Foreign key constraints maintain data integrity

### AI Integration Architecture

#### Supabase Edge Functions (4 Specialized Functions)

**`categorize-task`**
- Input: Task title and description
- Output: Category assignment (Creative, Analytical, Social, Physical, Routine, Learning, Planning)
- Model: GPT-4o-mini for cost efficiency
- Features: Keyword mapping with AI fallback

**`prioritize-tasks`**
- Input: User tasks array with preferences and energy data
- Output: Prioritized task list with AI scores
- Model: GPT-4.1-2025-04-14 for complex reasoning
- Factors: User preferences, energy levels, urgency, difficulty

**`process-brain-dump`**
- Input: Natural language task description
- Output: Structured tasks with categories and time estimates
- Model: GPT-4.1-2025-04-14
- Features: Multi-task extraction, automatic categorization

**`breakdown-task`**
- Input: Complex task title and context
- Output: 3-5 simple, actionable subtasks
- Model: GPT-4o-mini
- Focus: ADHD-friendly task decomposition

#### API Integration Points
- OpenAI API calls managed through Supabase Edge Functions
- Service role authentication for secure AI operations
- Error handling with graceful fallbacks
- Rate limiting and cost optimization

### Component Architecture

#### Page Structure (`src/pages/`)
- `Tasks.tsx`: Main application interface (default route `/`)
- `Auth.tsx`: Authentication flow
- `Onboarding.tsx`: Multi-step user setup process
- `Settings.tsx`: User preference management
- `Welcome.tsx`: Landing page for new users

#### Feature Components

**Task Management (`src/components/tasks/` - 24 components)**
- `GameTaskCards.tsx`: Main game controller (692+ lines - needs refactoring)
- `TaskSwiper.tsx`: Card swiping interface using Swiper.js
- `TaskCard.tsx`: Individual task card presentation with time tracking
- `TaskActions.tsx`: Swipe actions and interaction handlers
- `TaskTimer/`: Timer components with auto-start and pause functionality
- `PictureInPicture/`: Chrome Document PiP API integration (3 components)
- `ProgressRing.tsx`: Visual progress indicators
- `MrIntentCharacter.tsx`: Mascot with contextual messaging

**Onboarding Flow (`src/components/onboarding/` - 6 components)**
- `OnboardingFlow.tsx`: Multi-step coordinator
- `WelcomeStep.tsx`: Initial user greeting
- `NameStep.tsx`: User name collection
- `TaskPreferencesStep.tsx`: Category preference setup
- `EnergyTimesStep.tsx`: Peak/low energy time selection
- `TaskStartPreferenceStep.tsx`: Interaction preference setup

**Settings Management (`src/components/settings/` - 2 components)**
- `TaskPreferences.tsx`: Category preference updates
- `UserAccount.tsx`: Profile and account management

**UI Foundation (`src/components/ui/` - 50+ components)**
- Complete shadcn/ui component library
- Custom animations and transitions
- Accessible form controls and feedback systems

### State Management Patterns

#### Server State (TanStack Query)
- Automatic caching and background updates
- Optimistic updates for immediate user feedback
- Real-time subscriptions via Supabase
- Error handling with retry mechanisms

#### Local State (React Hooks)
- Component-level state with useState
- Complex state logic with useReducer
- Side effects with useEffect
- Custom hooks for reusable patterns:
  - `use-toast`: Notification system
  - `use-typewriter`: Text animation effects
  - Task management hooks

#### Navigation State
- React Router for page-level navigation
- Local state for modal and overlay management
- Picture-in-Picture state synchronization

### Modern Web APIs

#### Chrome Document Picture-in-Picture
- Distraction-free task focus mode
- Scaled component rendering for PiP window
- Cross-window state synchronization
- Graceful fallback for unsupported browsers

#### Real-time Features
- Supabase real-time subscriptions
- Live progress updates
- Cross-component hover synchronization
- Auto-pause/resume functionality

### Authentication & Security

#### Supabase Auth
- Email/password authentication
- JWT token management
- Session persistence
- Password reset functionality

#### Security Measures
- Row Level Security (RLS) policies
- Input validation with Zod schemas
- XSS protection through React
- CSRF protection via Supabase

### Development Configuration

#### Build System
- Vite with SWC React plugin for fast compilation
- TypeScript strict mode enabled
- ESLint with React hooks and refresh plugins
- PostCSS with Autoprefixer

#### Development Tools
- Component tagger for development mode
- Path alias `@/` points to `src/`
- Hot module replacement
- Source maps for debugging

### Performance Considerations

#### Optimization Strategies
- Code splitting with React.lazy
- Image optimization and lazy loading
- Debounced user inputs
- Memoized components for expensive renders

#### Known Performance Issues
- Large component files need refactoring (GameTaskCards.tsx)
- AI API calls could benefit from caching
- Task list virtualization for large datasets
- Bundle size optimization opportunities

## Recent Architectural Changes

### 2025-01-27: Enhanced Task Management
- **AI Task Breakdown**: Added `breakdown-task` Edge Function for ADHD-friendly subtask generation
- **Time Estimation**: Inline editing with AI-powered suggestions
- **Progress Tracking**: Auto-start timers with smart pause/resume behavior
- **Start Time Display**: Replaced position-based ordering with temporal context

### 2025-01-26: Picture-in-Picture Integration
- **Chrome Document PiP API**: Full implementation for distraction-free focus
- **Scaled UI Components**: Optimized rendering for PiP window constraints
- **Cross-Window Sync**: State synchronization between main and PiP windows

### 2025-01-25: AI Timeline Features
- **Day Timeline**: Visual task planning with intelligent scheduling
- **Cross-Component Hover**: Synchronized interactions across timeline components
- **Enhanced Prioritization**: Multi-factor AI scoring with user preference integration

### Database Evolution
- **Archive System**: Enhanced task completion tracking with position metadata
- **Time Tracking**: Comprehensive timing data with pause/resume capabilities
- **Subtask Integration**: AI-generated task breakdown storage and management

## Architecture Maintenance Notes

### Immediate Refactoring Needs
- **`GameTaskCards.tsx`** (692+ lines): Extract timer logic, character management, and navigation state
- **State Consolidation**: Centralize task management state patterns
- **API Optimization**: Implement caching strategies for AI function calls

### Future Considerations
- **Test Framework**: No testing infrastructure currently implemented
- **Performance Monitoring**: Add metrics for AI API usage and response times
- **Accessibility**: Enhanced keyboard navigation and screen reader support
- **Multi-Device Sync**: Real-time synchronization across devices

### Technical Debt
- Large component files requiring decomposition
- Inconsistent error handling patterns
- Missing comprehensive documentation for Edge Functions
- Limited offline functionality

## Known Issues & Enhancement Opportunities

### Current Limitations
- No test suite implemented
- Picture-in-Picture limited to Chrome browsers
- AI functions depend on external API availability
- Limited offline capabilities

### Enhancement Roadmap
- Comprehensive testing framework implementation
- Performance optimization for large task datasets
- Enhanced accessibility features
- Progressive Web App capabilities
- Multi-language support

## Deployment & Environment

### Hosting & Infrastructure
- Frontend: Lovable platform with automatic deployment
- Backend: Supabase with global edge function distribution
- Database: PostgreSQL with automatic backups

### Environment Configuration
- `OPENAI_API_KEY`: Required for all AI features
- `SUPABASE_URL`: Database connection endpoint
- `SUPABASE_ANON_KEY`: Public API access key
- `SUPABASE_SERVICE_ROLE_KEY`: Edge function authentication

### Monitoring & Analytics
- Supabase built-in analytics
- Error tracking through console logging
- User interaction tracking via daily_stats table

---

*This document reflects the architecture state as of January 2025. Update after major feature additions or architectural changes.*
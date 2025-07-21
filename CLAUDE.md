# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Build for development (with dev mode)
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview

# Install dependencies
npm i
```

## Project Architecture

This is a React-based AI-powered task management application with a gamified card interface. The project uses:

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui components + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: OpenAI API via Supabase Edge Functions
- **State**: React Query for server state, local React state
- **Router**: React Router DOM

### Key Directories

- `src/pages/` - Main application routes (Index, Auth, Onboarding, Tasks, Settings)
- `src/components/onboarding/` - Multi-step user setup flow
- `src/components/tasks/` - Core game interface and task management
- `src/components/settings/` - User preference management
- `src/components/ui/` - Reusable shadcn/ui components
- `src/integrations/supabase/` - Database client and type definitions
- `src/utils/` - Shared utilities including task categorization
- `supabase/functions/` - Edge functions for AI processing

### Database Schema

Core tables with Row Level Security (RLS):
- `profiles` - User data and preferences (JSONB task preferences, energy times)
- `tasks` - Task management with AI scoring fields
- `subtasks` - Task breakdown and progress
- `daily_stats` - User analytics and progress tracking

### AI Integration

Three Supabase Edge Functions provide AI capabilities:
- `categorize-task` - Automatic task categorization into 7 categories
- `prioritize-tasks` - AI-powered task ordering based on user preferences
- `process-brain-dump` - Natural language task processing

Task categories: Creative, Analytical, Social, Physical, Routine, Learning, Planning

### Key Components

- `GameTaskCards.tsx` (692 lines) - Main game controller, needs refactoring
- `TaskSwiper.tsx` - Card swiping interface using Swiper.js
- `MrIntentCharacter.tsx` - Lazy mascot with contextual messages
- `OnboardingFlow.tsx` - Multi-step user setup with task preferences

### Authentication & Security

- Supabase Auth with email/password
- RLS policies ensure users only access their own data
- Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

### Styling System

- Tailwind CSS with semantic tokens in `src/index.css`
- Dark/light theme support via `next-themes`
- Path alias `@/` points to `src/`
- Custom UI components from shadcn/ui

### Development Notes

- Large components should be broken down (especially GameTaskCards.tsx)
- TypeScript strict mode enabled
- No test framework currently configured
- Toast notifications for user feedback via sonner
- Canvas confetti for celebration animations
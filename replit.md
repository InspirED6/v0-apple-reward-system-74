# Apple Reward System

## Overview
A barcode-based reward system for tracking student and assistant attendance. Built with Next.js 15, React 19, and Supabase.

## Recent Changes (December 2024)

### New Assistant Bonus System
- **Session Value Progression**: Every 4 sessions attended, the session value increases by 20 apples
  - Sessions 1-4: 150 apples per session
  - Sessions 5-8: 170 apples per session  
  - Sessions 9-12: 190 apples per session
  - And so on...
- Replaced the old fixed 50 apple bonus system

## Project Structure
- `app/` - Next.js App Router pages and API routes
  - `api/` - Backend API endpoints
  - `dashboard/` - User/Admin dashboard
  - `scanner/` - Barcode scanning page
  - `login/` - Authentication page
- `components/` - Reusable UI components (shadcn/ui)
- `lib/` - Utility functions and database client
- `hooks/` - Custom React hooks

## Configuration

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

### Database Schema
The `users` table requires a `sessions_attended` column (integer, default 0) to track the new session-based bonus system.

## Development
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

## Deployment
Configured for autoscale deployment with:
- Build: `npm run build`
- Run: `npm run start -- -p 5000 -H 0.0.0.0`

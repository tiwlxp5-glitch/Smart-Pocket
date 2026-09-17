# Smart Pocket (แอพรายรับรายจ่าย)

## Architecture Overview
- **Framework**: Next.js 16 (App Router) with React 19, Turbopack
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Deployment**: Vercel (recommended)

## Current State (Milestone 2 Completed)
- UI Prototyping completed (Landing Page, Login, Dashboard, Income/Expense forms, History).
- Configured Supabase Auth and Database with RLS.
- Soft-delete (Trash) system with 3-day lazy cleanup implemented.
- AI Slip Scanner implemented using Gemini 3.6 Flash (extracts Amount, Note, and Receiver).
- App metadata and PWA settings updated for mobile installation ("รายรับรายจ่าย").

## Next Steps (Milestone 3)
1. **Analytics & Charts**: Add a summary page to visualize income vs expenses using Recharts or similar.
2. **User Profile Settings**: Allow users to change their display name, currency preference, and manage connected accounts.
3. **Export Data**: Add feature to export transaction history to CSV/Excel.

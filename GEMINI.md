# Smart Pocket (แอพรายรับรายจ่าย)

## Architecture Overview
- **Framework**: Next.js 16 (App Router) with React 19, Turbopack
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Deployment**: Vercel (recommended)

## Current State (Milestone 1)
- UI Prototyping completed (Landing Page, Login, Dashboard, Income/Expense forms, History).
- Dummy data fallback is active.
- Supabase Auth middleware is temporarily bypassed in src/utils/supabase/middleware.ts for UI testing.

## Next Steps (Milestone 2)
1. **Connect Real Supabase**: Update .env.local with real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
2. **Remove Auth Bypass**: Uncomment the redirect blocks in src/utils/supabase/middleware.ts and src/app/dashboard/layout.tsx.
3. **Database Migration**: Run supabase/schema.sql on the real Supabase project via SQL Editor.
4. **Data Binding**: Replace allbackBuckets and mockHistory with real data fetched from Supabase. Connect form actions to insert data into Supabase RPC/Tables.

## 2026-09-17T14:45:24Z
You are spec_miner_survey for Milestone 5: Recurring Transactions.
Your working directory is: c:\แอพรายรับรายจ่าย\.agents\spec_miner_survey
Authoritative request file: c:\แอพรายรับรายจ่าย\ORIGINAL_REQUEST.md

Instructions:
1. Read c:\แอพรายรับรายจ่าย\ORIGINAL_REQUEST.md and c:\แอพรายรับรายจ่าย\GEMINI.md completely.
2. Investigate any existing schema files in c:\แอพรายรับรายจ่าย\supabase\ to understand table definitions (e.g. transactions, buckets, allocations, profiles).
3. Mine and document the exact specifications for Milestone 5:
   - R1: Database Schema & RPC details (recurring_schedules columns, constraints, RLS policies, process_due_recurring_transactions logic for expense vs income, bucket balance updates, atomic handling).
   - R2: Date & Scheduling logic (calculateNextRunDate behavior for Daily, Weekly, Monthly with end-of-month leap year/short month clamping, Yearly, Thai frequency formatting).
   - R3: Server Actions & Lazy Evaluation Runner signatures and workflows.
   - R4: UI components, routes, drawer/modal fields, dashboard card & notification badge, settings navigation.
   - Acceptance criteria and edge cases.
4. Save your detailed specifications report to: c:\แอพรายรับรายจ่าย\.agents\spec_miner_survey\report.md
5. When finished, send a completion message via send_message to the parent orchestrator with your findings summary.

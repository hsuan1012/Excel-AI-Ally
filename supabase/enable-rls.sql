-- ============================================================
-- Excel AI Ally — 啟用 Row-Level Security (RLS)
-- 使用方式：Supabase Dashboard → SQL Editor → 貼上全部 → Run
-- 這個版本會自動跳過不存在的資料表和 view，可以整份直接執行。
-- 原則：學生端（anon key）只保留網站實際需要的最小權限。
-- 注意：這份腳本只加門禁規則，不會修改或刪除任何資料。
-- ============================================================

create or replace function pg_temp.enable_rls_if_table(t text)
returns boolean language plpgsql as $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = t and c.relkind in ('r','p')
  ) then
    execute format('alter table public.%I enable row level security', t);
    return true;
  end if;
  return false;
end $$;

do $$
begin
  -- ---------- lessons：課程內容，學生端只需要讀取 ----------
  if pg_temp.enable_rls_if_table('lessons') then
    execute 'drop policy if exists "anon_read_lessons" on public.lessons';
    execute 'create policy "anon_read_lessons" on public.lessons for select using (true)';
  end if;

  -- ---------- lesson_order_mappings：課程順序，只需要讀取 ----------
  if pg_temp.enable_rls_if_table('lesson_order_mappings') then
    execute 'drop policy if exists "anon_read_lesson_order" on public.lesson_order_mappings';
    execute 'create policy "anon_read_lesson_order" on public.lesson_order_mappings for select using (true)';
  end if;

  -- ---------- leaderboard：排行榜，可讀取＋新增（不可修改/刪除） ----------
  if pg_temp.enable_rls_if_table('leaderboard') then
    execute 'drop policy if exists "anon_read_leaderboard" on public.leaderboard';
    execute 'create policy "anon_read_leaderboard" on public.leaderboard for select using (true)';
    execute 'drop policy if exists "anon_insert_leaderboard" on public.leaderboard';
    execute 'create policy "anon_insert_leaderboard" on public.leaderboard for insert with check (true)';
  end if;

  -- ---------- learning_records：學習紀錄，只能寫入、不能讀取 ----------
  if pg_temp.enable_rls_if_table('learning_records') then
    execute 'drop policy if exists "anon_insert_learning_records" on public.learning_records';
    execute 'create policy "anon_insert_learning_records" on public.learning_records for insert with check (true)';
  end if;

  -- ---------- learning_analytics：學習分析（含 AI 對話紀錄），只能寫入 ----------
  if pg_temp.enable_rls_if_table('learning_analytics') then
    execute 'drop policy if exists "anon_insert_learning_analytics" on public.learning_analytics';
    execute 'create policy "anon_insert_learning_analytics" on public.learning_analytics for insert with check (true)';
  end if;

  -- ---------- chat_messages：學生與 AI 的對話，只能寫入 ----------
  if pg_temp.enable_rls_if_table('chat_messages') then
    execute 'drop policy if exists "anon_insert_chat_messages" on public.chat_messages';
    execute 'create policy "anon_insert_chat_messages" on public.chat_messages for insert with check (true)';
  end if;

  -- ---------- students：學生註冊用 upsert，需要 select + insert + update ----------
  if pg_temp.enable_rls_if_table('students') then
    execute 'drop policy if exists "anon_read_students" on public.students';
    execute 'create policy "anon_read_students" on public.students for select using (true)';
    execute 'drop policy if exists "anon_insert_students" on public.students';
    execute 'create policy "anon_insert_students" on public.students for insert with check (true)';
    execute 'drop policy if exists "anon_update_students" on public.students';
    execute 'create policy "anon_update_students" on public.students for update using (true) with check (true)';
  end if;

  -- student_leaderboard 若是 view 會自動跳過（view 的權限跟著底層資料表走）；
  -- 若是實體資料表，開啟 RLS 並允許讀取（排行榜本來就要公開顯示）。
  if pg_temp.enable_rls_if_table('student_leaderboard') then
    execute 'drop policy if exists "anon_read_student_leaderboard" on public.student_leaderboard';
    execute 'create policy "anon_read_student_leaderboard" on public.student_leaderboard for select using (true)';
  end if;
end $$;

-- ============================================================
-- 【可選】暫時讓 /admin 頁面繼續運作的政策
-- 注意：開啟後「任何人」都能修改課程內容、讀取學習分析（含對話紀錄）。
-- 這只是過渡方案，正式做法是幫 admin 加上登入驗證。
-- 需要的話，把下面的註解拿掉再單獨執行。
-- ============================================================
-- create policy "anon_update_lessons_TEMP"
--   on public.lessons for update
--   using (true) with check (true);
-- create policy "anon_read_learning_analytics_TEMP"
--   on public.learning_analytics for select
--   using (true);

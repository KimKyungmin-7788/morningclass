create table public.mc_private_owners (user_id uuid primary key references auth.users(id));
alter table public.mc_private_owners enable row level security;
revoke all on public.mc_private_owners from anon, authenticated;
grant select on public.mc_private_owners to authenticated;
create policy mc_owner_self on public.mc_private_owners for select to authenticated using (user_id = (select auth.uid()));
-- 프로젝트 관리자가 Google 로그인 후 확인한 본인 Auth UUID를 mc_private_owners에 등록하세요.
-- 일반 사용자에게 이 테이블의 쓰기 권한을 주지 마세요.
create table public.mc_private_snapshots (
 user_id uuid primary key references public.mc_private_owners(user_id),
 payload text not null check (octet_length(payload) <= 10485760),
 revision integer not null default 1 check (revision > 0),
 saved_at timestamptz not null default now()
);
alter table public.mc_private_snapshots enable row level security;
revoke all on public.mc_private_snapshots from anon, authenticated;
grant select, insert, update, delete on public.mc_private_snapshots to authenticated;
create policy mc_snapshot_owner on public.mc_private_snapshots for all to authenticated
 using (user_id = (select auth.uid()) and exists(select 1 from public.mc_private_owners o where o.user_id = (select auth.uid())))
 with check (user_id = (select auth.uid()) and exists(select 1 from public.mc_private_owners o where o.user_id = (select auth.uid())));


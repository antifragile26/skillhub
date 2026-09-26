-- Vote identities and choices are private to each voter and operators.
-- Public totals remain available from posts.upvotes/downvotes and comments.upvotes/downvotes.
drop policy if exists "Anyone can read votes" on public.votes;
drop policy if exists "Anyone can read comment votes" on public.comment_votes;

drop policy if exists "votes_owner_operator_select" on public.votes;
drop policy if exists "votes_owner_operator_boundary" on public.votes;
create policy "votes_owner_operator_select"
  on public.votes for select to public
  using (
    user_id = (select auth.uid())
    or (select public.current_user_is_operator())
  );
create policy "votes_owner_operator_boundary"
  on public.votes as restrictive for select to public
  using (
    user_id = (select auth.uid())
    or (select public.current_user_is_operator())
  );

drop policy if exists "comment_votes_owner_operator_select" on public.comment_votes;
drop policy if exists "comment_votes_owner_operator_boundary" on public.comment_votes;
create policy "comment_votes_owner_operator_select"
  on public.comment_votes for select to public
  using (
    user_id = (select auth.uid())
    or (select public.current_user_is_operator())
  );
create policy "comment_votes_owner_operator_boundary"
  on public.comment_votes as restrictive for select to public
  using (
    user_id = (select auth.uid())
    or (select public.current_user_is_operator())
  );

-- A legacy INSERT policy had the same ownership check but omitted the muted-account
-- predicate, so permissive-policy OR semantics let muted users keep voting.
do $migration$
declare legacy_policy text;
begin
  for legacy_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'votes'
      and cmd = 'INSERT'
      and policyname like 'Authenticated users can insert their%'
  loop
    execute format('drop policy %I on public.votes', legacy_policy);
  end loop;
end;
$migration$;

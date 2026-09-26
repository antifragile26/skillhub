-- DROP OR REPLACE preserves explicit grants on the existing function; make its
-- intended authenticated-only access explicit for the new delete action.
revoke all on function public.moderate_skill(bigint, text, text) from public, anon;
grant execute on function public.moderate_skill(bigint, text, text) to authenticated;

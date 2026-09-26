-- 这些函数只应作为已登录 RPC 或数据库触发器使用，不能暴露给匿名调用者。
revoke execute on function public.create_forum_post_with_product(
  text, text, text, text, text, uuid, text, text, text, text, text, text, text, text, text, text
) from anon;
grant execute on function public.create_forum_post_with_product(
  text, text, text, text, text, uuid, text, text, text, text, text, text, text, text, text, text
) to authenticated;

revoke execute on function public.submit_post_for_review(bigint) from anon;
grant execute on function public.submit_post_for_review(bigint) to authenticated;

revoke execute on function public.notify_product_owner_for_post(bigint) from public, anon, authenticated;
revoke execute on function public.notify_product_owner_on_post_publish() from public, anon, authenticated;
revoke execute on function public.notify_product_owner_on_link_insert() from public, anon, authenticated;

# 第一批实现决策

- 内容长度使用 JavaScript/PostgreSQL 的 Unicode 字符长度；保存前后统一 `trim`，数据库用 `char_length(btrim(...))` 兜底。
- 草稿先存当前标签页的 guest key；认证状态确定后迁移到包含 user id 的 key 并删除 guest key，防止账号切换泄露。
- 列表页使用服务端查询和 URL 参数：`q`、`category`、`sort`、`page`；Skills/Agents 的原搜索不改成全站搜索。
- 删除采用 `deleted_at` 软删除；公开查询排除已删除记录，授权作者仍可在隔离管理入口恢复。旧帖子正文为空时保留旧数据，不用迁移伪造正文。
- 计数由数据库触发器从 `votes/comments` 重算；客户端操作成功后重新读取帖子统计，不把失败状态写成 0。
- 投票表以 `(user_id, post_id)` 唯一索引保证一人一票；upsert 实现切换，delete 实现取消。
- 发帖和回复携带 `request_id`，数据库唯一索引和限流函数共同处理网络重试/双击；限流默认帖子/回复 10 次/分钟、投票 60 次/分钟。
- Markdown 只渲染标题、列表、加粗、行内代码、代码块和 http(s) 链接；原始 HTML、javascript/data 等危险 URL 不生成可执行节点。
- 向量生成不属于论坛主流程；接口必须有作者会话、作者归属和服务端配置，缺少 service-role/OpenAI 配置时明确 503，不伪造成功。
- 迁移是向后兼容新增列/索引/策略；执行前仍需隔离备份和数据库管理员确认，仓库存在 SQL 不等于线上已执行。

# 数据库初稿（未执行迁移）

现状与选择理由见 [D-002](DECISIONS.md)。既有四表保留，不把公开 blog_posts 当私有 notes。以下为逻辑设计，具体 SQL、迁移工具及生产适配在 Phase 1 验证后确定；不对线上执行。

统一：新表 id INTEGER PRIMARY KEY；时间使用 UTC，created_at/updated_at NOT NULL；每个连接显式启用/验证外键。唯一约束对应索引，不重复创建。用户名和邮箱先规定规范化规则再存储，以规范值唯一，不能只靠前端；邮箱是否大小写规范化须在 Phase 2 任务明确。

| 表 | 字段与约束 | 索引 / 关系 |
| --- | --- | --- |
| users | id；username、email TEXT NOT NULL UNIQUE（规范化）；password_hash TEXT 可空（仅第三方用户）；is_active INTEGER NOT NULL DEFAULT 1 CHECK IN (0,1)；created_at、updated_at | username/email 唯一索引；禁止无密码账号走密码登录 |
| oauth_accounts | id；user_id NOT NULL；provider、provider_user_id TEXT NOT NULL；created_at | UNIQUE(provider,provider_user_id)，INDEX(user_id)，FK user_id → users.id ON DELETE CASCADE；不假定每个用户每 provider 只有一个身份，若需限制另立决策 |
| roles | id；name TEXT NOT NULL UNIQUE；description TEXT NOT NULL DEFAULT '' | user、note_reader、admin；guest 为匿名上下文，不建虚假用户 |
| permissions | id；code TEXT NOT NULL UNIQUE；description TEXT NOT NULL DEFAULT '' | 初始四权限见 PROJECT |
| user_roles | user_id、role_id NOT NULL，联合主键 | 两个 FK CASCADE；INDEX(role_id) |
| role_permissions | role_id、permission_id NOT NULL，联合主键 | 两个 FK CASCADE；INDEX(permission_id) |
| notes（Phase 6） | id；slug TEXT NOT NULL UNIQUE；title、content TEXT NOT NULL；author_id NOT NULL；status TEXT NOT NULL CHECK IN ('draft','published','archived')；created_at、updated_at | FK author_id → users.id ON DELETE RESTRICT；INDEX(author_id)，INDEX(status,updated_at)；published 仍须 note:read，不代表公开 |

权限初稿：user 无额外权限，note_reader 有 note:read，admin 有四权限；服务端合并角色权限且先检查 is_active。角色矩阵最终随 P3 任务验收，不允许客户端指定角色完成注册。
账号绑定必须证明当前账号与外部身份的控制权，不依相同邮箱合并。管理员初始化单独安全流程，不默认创建公开密码。
附件的存储与元数据表留 Phase 6 决策，不能把私有文件上传至现有 public Blob。新迁移需要版本、备份、失败恢复、唯一/FK/事务集成测试；旧库仅在明确授权后迁移。

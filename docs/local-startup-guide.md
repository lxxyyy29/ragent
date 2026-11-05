# Ragent 本地启动完整指南（Agent 可直接执行）

> 本文档供在新机器上从零配置并启动 Ragent 项目使用，包含所有关键参数。
> 项目结构：Maven 多模块（bootstrap / framework / infra-ai / mcp-server）+ 前端（frontend，Vite + React）。

---

## 一、环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Java (JDK) | 17+ | 后端运行必需，配置好 `JAVA_HOME` |
| Docker Desktop | 任意新版 | 中间件容器必需，**启动项目前必须先运行 Docker Desktop** |
| Node.js | 18+ | 前端构建运行 |
| Maven | 可选 | 项目自带 `mvnw` / `mvnw.cmd` 包装器 |

---

## 二、本地中间件（Docker）

在项目根目录执行：

```bash
docker compose -f docker-compose.local.yaml up -d
```

包含的服务及端口：

| 服务 | 容器名 | 端口 | 账号/密码 | 用途 |
|---|---|---|---|---|
| PostgreSQL 17 + pgvector | ragent-postgres | 5432 | postgres / postgres | 业务数据 + 向量存储（库名 `ragent`） |
| Redis 7 | ragent-redis | 6379 | 密码 `123456` | 缓存/限流/排队（注意：后端实际可能通过 VM 参数指向远程 Redis，见第五节） |
| RustFS (S3 兼容对象存储) | ragent-rustfs | 9000（API）/ 9001（控制台） | rustfsadmin / rustfsadmin | 文档与多模态资产存储 |
| RocketMQ 5.2.0 | ragent-rmqnamesrv / ragent-rmqbroker | 9876 等 | - | 消息队列 |

说明：
- `docker-compose.local.yaml` 已挂载 `resources/database/schema_pg.sql` 和 `init_data_pg.sql` 到初始化目录，**首次创建容器时数据库会自动建表并初始化数据，无需手动执行 SQL**。
- 若容器已存在但数据异常，可用 `docker compose -f docker-compose.local.yaml down -v` 清卷重建（会丢失数据）。
- 常见报错 `Connection refused: localhost:9000/5432` → Docker Desktop 没运行或容器没启动。

### 可选中间件（按需）

| 服务 | 地址 | 说明 |
|---|---|---|
| Ollama | http://localhost:11434 | 本地模型：`qwen3:8b`（对话）、`bge-large-zh`（embedding，默认）等 |
| LightRAG | http://localhost:9621 | 知识图谱后端（`rag.graph.type=lightrag`，compose 在 `resources/docker/graphrag`） |
| Milvus | http://localhost:19530 | 仅当 `rag.vector.type=milvus` 时需要（当前配置为 `pg`，不需要） |
| Elasticsearch | http://localhost:9200 | 仅当 `rag.keyword.type=es` 时需要（当前配置为 `none`，不需要） |

---

## 三、后端配置说明

配置文件：`bootstrap/src/main/resources/application.yaml`（默认值已齐全，一般无需改动）。

关键默认值：

```yaml
server.port: 9090
server.servlet.context-path: /api/ragent   # 后端基础路径

spring.datasource:   # PostgreSQL
  url: jdbc:postgresql://127.0.0.1:5432/ragent
  username/password: postgres/postgres

spring.data.redis: 127.0.0.1:6379, password 123456

rag.storage.type: s3         # 对象存储，endpoint http://localhost:9000
rag.vector.type: pg          # 向量存 PostgreSQL（pgvector）
rag.keyword.type: none       # 关键词检索关闭
rag.graph.type: lightrag     # 图谱后端 LightRAG（localhost:9621）
rag.mcp.servers[0].url: http://localhost:9099   # MCP 服务（mcp-server 模块，可选启动）

ai.providers:                # 模型供应商
  ollama: http://localhost:11434
  bailian: https://dashscope.aliyuncs.com  # API Key 已内置在 yaml 中
  aihubmix: https://aihubmix.com           # 需环境变量 AIHUBMIX_API_KEY
  siliconflow: https://api.siliconflow.cn  # 需环境变量 SILICONFLOW_API_KEY
```

### 环境变量清单（全部可选，缺失时对应功能降级/关闭）

| 变量名 | 用途 |
|---|---|
| `SILICONFLOW_API_KEY` | SiliconFlow（GLM-4.7 对话、Qwen3-Embedding-8B） |
| `AIHUBMIX_API_KEY` | AIHubMix（GPT、text-embedding-3-large） |
| `MINERU_API_KEY` | MinerU SaaS（PDF/Word/PPT 解析） |
| `OSS_ACCESS_KEY` / `OSS_SECRET_KEY` | 仅 `rag.storage.type=oss`（阿里云 OSS）时需要 |
| `YDC_API_KEY` | 联网搜索通道（默认关闭） |

---

## 四、VM 启动参数（关键！不在配置文件中）

后端启动必须附带以下 VM 参数，它们把 Redis / RocketMQ / Nacos 指向**远程开发环境**（本地只需 PostgreSQL + RustFS）：

```
-Dunique-name=-lxxyyy
-Dframework.cache.redis.prefix=lxxyyy:
-Dspring.data.redis.host=common-redis-dev.magestack.cn
-Dspring.data.redis.password=Sm9sVXBOYJjI030b5tz0trjpzvZzRhtZmEbv0uOImcD1wEDOPfeaqNU4PxHob/Wp
-Dspring.data.redis.port=19389
-Drocketmq.name-server=common-rocketmq-dev.magestack.cn:9876
-Dspring.cloud.nacos.discovery.server-addr=common-nacos-dev.magestack.cn:8848
```

（单行形式，供 launch.json 使用）：

```
-Dunique-name=-lxxyyy -Dframework.cache.redis.prefix=lxxyyy: -Dspring.data.redis.host=common-redis-dev.magestack.cn -Dspring.data.redis.password=Sm9sVXBOYJjI030b5tz0trjpzvZzRhtZmEbv0uOImcD1wEDOPfeaqNU4PxHob/Wp -Dspring.data.redis.port=19389 -Drocketmq.name-server=common-rocketmq-dev.magestack.cn:9876 -Dspring.cloud.nacos.discovery.server-addr=common-nacos-dev.magestack.cn:8848
```

> `-Dunique-name=-lxxyyy` 用于多实例隔离（服务名、MQ 消费组加后缀），可改成自己的标识，但 Redis 前缀等需保持一致。

---

## 五、IDE / 启动配置

### VS Code 系（Qoder / Cursor 等）

需要安装扩展：**Extension Pack for Java**（vscjava.vscode-java-pack，含 redhat.java）。

`.vscode/launch.json`：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "java",
            "name": "RagentApplication",
            "request": "launch",
            "mainClass": "com.nageoffer.ai.ragent.RagentApplication",
            "projectName": "bootstrap",
            "vmArgs": "-Dunique-name=-lxxyyy -Dframework.cache.redis.prefix=lxxyyy: -Dspring.data.redis.host=common-redis-dev.magestack.cn -Dspring.data.redis.password=Sm9sVXBOYJjI030b5tz0trjpzvZzRhtZmEbv0uOImcD1wEDOPfeaqNU4PxHob/Wp -Dspring.data.redis.port=19389 -Drocketmq.name-server=common-rocketmq-dev.magestack.cn:9876 -Dspring.cloud.nacos.discovery.server-addr=common-nacos-dev.magestack.cn:8848"
        }
    ]
}
```

`.vscode/settings.json`（让 main 方法上方的 Run 按钮也带 VM 参数）：

```json
{
    "java.debug.settings.vmArgs": "-Dunique-name=-lxxyyy -Dframework.cache.redis.prefix=lxxyyy: -Dspring.data.redis.host=common-redis-dev.magestack.cn -Dspring.data.redis.password=Sm9sVXBOYJjI030b5tz0trjpzvZzRhtZmEbv0uOImcD1wEDOPfeaqNU4PxHob/Wp -Dspring.data.redis.port=19389 -Drocketmq.name-server=common-rocketmq-dev.magestack.cn:9876 -Dspring.cloud.nacos.discovery.server-addr=common-nacos-dev.magestack.cn:8848"
}
```

### IntelliJ IDEA

Run Configuration（Spring Boot）：
- Main class：`com.nageoffer.ai.ragent.RagentApplication`
- Module：`bootstrap`
- VM options：填入第四节的 VM 参数

### 命令行方式

```bash
./mvnw spring-boot:run -pl bootstrap -Dspring-boot.run.jvmArguments="-Dunique-name=-lxxyyy -Dframework.cache.redis.prefix=lxxyyy: -Dspring.data.redis.host=common-redis-dev.magestack.cn -Dspring.data.redis.password=Sm9sVXBOYJjI030b5tz0trjpzvZzRhtZmEbv0uOImcD1wEDOPfeaqNU4PxHob/Wp -Dspring.data.redis.port=19389 -Drocketmq.name-server=common-rocketmq-dev.magestack.cn:9876 -Dspring.cloud.nacos.discovery.server-addr=common-nacos-dev.magestack.cn:8848"
```

启动成功标志：日志出现 Spring Boot banner 且无 `Application run failed`，服务监听 `http://localhost:9090/api/ragent`。

---

## 六、前端启动

```bash
cd frontend
npm install
npm run dev
```

> Windows 注意：若 PowerShell 报「禁止运行脚本」错误（npm.ps1 被执行策略阻止），改用 `npm.cmd install` / `npm.cmd run dev` 即可。

- 访问地址：**http://localhost:5199**（`package.json` 中 `dev` 脚本强制 `--port 5199 --strictPort`）
- `vite.config.ts` 中 `/api` 代理到 `http://localhost:9090`（后端），所以必须先启动后端
- `frontend/.env`：`VITE_API_BASE_URL=/api/ragent`（默认即可，无需修改）

---

## 七、可选服务：MCP Server

若需要 MCP 工具能力（后端配置 `rag.mcp.servers[0].url=http://localhost:9099`）：

- Main class：`com.nageoffer.ai.ragent.mcp.McpServerApplication`（模块 `mcp-server`）
- IDEA 中的 VM 参数同第四节

---

## 八、完整启动顺序（Agent 执行清单）

1. 确认 JDK 17+ 已安装且 `JAVA_HOME` 正确（`java -version` 验证）
2. 启动 Docker Desktop，等待守护进程就绪（`docker info` 成功）
3. `docker compose -f docker-compose.local.yaml up -d`，确认 5432/6379/9000/9876 端口监听
4. 等待 PostgreSQL 初始化完成（首次约 30 秒，`docker logs ragent-postgres` 确认无报错）
5. 用第四节 VM 参数启动后端 `RagentApplication`（端口 9090）
6. （可选）启动 `McpServerApplication`（端口 9099）
7. `cd frontend && npm install && npm run dev`（端口 5199）
8. 浏览器打开 http://localhost:5199 验证

---

## 九、常见报错排查

| 报错 | 原因 | 解决 |
|---|---|---|
| `Connect to localhost:9000 ... Connection refused` | RustFS/S3 未启动（Docker Desktop 没运行） | 执行第二节步骤 |
| 连 Redis/6379 或 RocketMQ 失败 | 缺少第四节 VM 参数 | 补上 VM 参数 |
| 数据库连接失败 | PostgreSQL 容器未启动或未完成初始化 | `docker logs ragent-postgres` 检查 |
| IDE 无 Run 按钮/不解析 Java | 未安装 Java 扩展或 JDK 未识别 | 安装 Extension Pack for Java，确认 `JAVA_HOME` 指向 JDK 17+ |
| 模型调用失败 | 对应 API Key 环境变量未配置 | 见第三节环境变量清单；本地 Ollama 模型需先 `ollama pull` |
| 文档分块失败（`文档内容提取或分块失败`） | 知识库的 embedding_model 指向未安装的 Ollama 模型（如 `qwen-emb-local` → `qwen3-embedding:8b-fp16`，返回 HTTP 404） | 改知识库 embedding_model 为已安装模型（如 `bge-large-local`），或先 `ollama pull` 对应模型 |
| 文档分块失败（`Pipeline执行失败：未找到 MIME ...`) | pipeline 模式下文件 MIME 检测失败 | 需用最新代码（runPipelineProcess 已改为 MimeTypeDetector 检测），重启后端后重试 |
| 知识图谱为空 / 图谱数据缺失 | 图谱是向量写入时同步建图；文档摄取时 LightRAG 未启动则静默失败，且无补偿重试 | 重新触发该文档分块（重新写入向量）即会触发建图；历史文档不会自动补建 |
| LightRAG 抽取超时（`Worker execution timeout after 1800s`） | 长文档分块多，qwen3:8b 单块抽取耗时超限 | 调大 `LLM_TIMEOUT`（resources/docker/graphrag/.env，实测 900 已够短文档）；长文档建议拆分后摄取 |

---

## 十、实战排障经验记录（2026-08-06）

### 1. 知识库 embedding 模型配置（易踩坑）

`application.yaml` 中 `rag.embedding.candidates` 定义了模型候选，知识库创建时选其一：

| id | provider | 实际模型 | 维度 | 本地可用？ |
|---|---|---|---|---|
| `bge-large-local` | ollama | `bge-large-zh` | 1024 | ✅（已安装） |
| `qwen-emb-8b` | siliconflow | `Qwen/Qwen3-Embedding-8B` | 1536 | 需 SILICONFLOW_API_KEY |
| `qwen-emb-local` | ollama | `qwen3-embedding:8b-fp16` | 1536 | ❌（本机未安装，选它必 404） |
| `text-embedding-3-large` | aihubmix | text-embedding-3-large | 1536 | 需 AIHUBMIX_API_KEY |

本地 Ollama 已装模型：`ollama list` 查看（当前：qwen3:4b、qwen3:8b、bge-large-zh、bge-m3）。

**排障要点**：文档分块失败时查 `t_knowledge_document_chunk_log.error_message`（分块日志表），其中含真实根因（如 `ollama embedding 请求失败: HTTP 404`）。修改知识库嵌入模型：`UPDATE t_knowledge_base SET embedding_model='bge-large-local' WHERE id='...';` 后重新触发分块。

### 2. 知识图谱（LightRAG）链路要点

- **建图机制**：向量写入时同步触发（`GraphSyncingVectorStoreService` 装饰器），失败 best-effort 仅记日志、不回滚、不重试。文档摄取时 LightRAG 不可用 → 该文档永远没有图谱，需重新摄取补建。
- **图谱栈启动**：`docker compose -f resources/docker/graphrag/lightrag-neo4j-stack.compose.yaml up -d`（lightrag:9621 + neo4j）。
- **关键配置**：`.env` 中 `LLM_BINDING_HOST=http://host.docker.internal:11434/v1`（容器访问宿主机 Ollama）、`LLM_TIMEOUT=900`（抽取超时，默认 240 太短）、`EMBEDDING_MODEL=bge-large-zh`、`NEO4J_*`。改配置后需重建容器（`docker compose ... up -d --force-recreate`）。
- **抽取表现**：短文档（几千字）约 30s 成功（14 实体 11 关系）；长文档（40KB 级）多 chunk 下 qwen3:8b 易出现 `Complete delimiter can not be found`（解析为 0 实体）或 1800s worker 超时，建议拆分文档后摄取。
- **验证**：`curl localhost:9621/documents` 看文档状态；图谱数据在 PG `lightrag_full_entities/lightrag_full_relations`；前端 `/admin/knowledge-graph` 可视化。

### 3. 已修复的代码问题（升级后需重启后端生效）

- `runPipelineProcess`：小写 fileType 直接当 mimeType → 改为 `MimeTypeDetector.detect` + 补全 DocumentSource（修复「未找到 MIME [markdown] 对应的解析器,fileName=null」）。
- `runChunkProcess` 异常包装：固定文案「文档内容提取或分块失败」丢失根因 → 现在 errorMessage 拼接 `e.getMessage()`（分块日志可直接看到真实原因）。

### 4. 其他经验

- **LightRAG 内容去重**：相同内容重复上传会返回 `[DUPLICATE:content_hash]`，文档状态 failed 但属预期，无需处理。
- **孤儿向量清理**：错误上传产生的 `rag_default_store` collection 可安全删除（`DELETE FROM t_knowledge_vector WHERE collection_name='rag_default_store';`）。
- **GraphSyncingVectorStoreService 图同步 file_source 编码**：`{collectionName}_{docId}`，按文档粒度同步。

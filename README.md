# Ragent

一个基于 **Java 17 / Spring Boot 4** 与 **React 18** 构建的 Agentic RAG 智能问答与知识管理平台，覆盖文档解析入库、多路混合检索、ReAct 智能体推理、MCP 工具调用及全链路可观测能力。

---

## 核心特性

- **双执行引擎**：支持 `workflow`（固定编排管线）与 `agent`（基于 AgentScope 2.0 的 ReAct 动态推理循环）两种模式，按场景灵活切换。
- **多路混合检索**：支持向量检索（pgvector / Milvus）、关键词检索（Elasticsearch）、知识图谱（LightRAG）与联网搜索并行召回，结合 RRF 融合、Rerank 精排与相关性阈值过滤。
- **问题理解与意图路由**：支持查询词映射、上下文问题重写与拆分、树形意图识别及多知识库路由。
- **多模型接入与容错**：统一适配百炼、DeepSeek、Ollama、Kimi、混元、AIHubMix、ZenMux 等多家供应商，支持模型档位路由、首包超时探测与熔断降级。
- **Agent 与 MCP 生态**：支持 MCP 工具发现与调用、按需加载 Skills 技能、写操作人工确认、上下文裁剪摘要以及跨会话长期记忆。
- **知识入库与运维闭环**：提供可编排文档入库 Pipeline、远程文档定时刷新、来源引用预览、分布式限流排队、Trace / Langfuse 链路追踪及前后端管理控制台。

---

## 模块结构

后端采用 Maven 多模块架构，前端为独立的 Vite + React 应用：

```text
.
├── bootstrap/       # 启动装配层（主启动类与核心配置）
├── agent/           # AgentScope ReAct 执行引擎、记忆、技能与 MCP 集成
├── rag/             # RAG 问答、知识库、入库 Pipeline、意图树与检索链路
├── infra-ai/        # Chat / Embedding / Rerank / VLM 客户端与模型路由降级
├── system/          # 用户认证、权限与业务审计日志
├── framework/       # 统一响应、异常处理、幂等、分布式锁、MQ 与 SSE 基础能力
├── mcp-server/      # 基于 MCP Java SDK 的独立示例工具服务
├── frontend/        # React + TypeScript 用户端与管理后台
├── resources/       # 数据库初始化脚本、Docker 编排与资源文件
└── docs/            # 本地部署与开发文档
```

---

## 技术栈

| 类别 | 技术选型 |
| :--- | :--- |
| 后端框架 | Java 17、Spring Boot 4.1、MyBatis-Plus、Sa-Token |
| Agent / MCP | AgentScope 2.0、MCP Java SDK |
| 数据与向量 | PostgreSQL 17 + pgvector（可选 Milvus）、Redis 7、Elasticsearch（可选） |
| 图谱与存储 | LightRAG、RustFS / S3 兼容对象存储（可选阿里云 OSS） |
| 消息与追踪 | RocketMQ 5、OpenTelemetry / Langfuse |
| 前端 | React 18、TypeScript、Vite、Tailwind CSS |

---

## 快速开始

### 1. 环境要求

- JDK 17+
- Node.js 18+
- Docker & Docker Compose
- Maven（可直接使用项目自带的 `./mvnw` / `mvnw.cmd`）

### 2. 启动基础中间件

```bash
docker compose -f docker-compose.local.yaml up -d
```

默认拉起 PostgreSQL（含 pgvector 与初始化建表脚本）、Redis、RustFS（S3 对象存储）与 RocketMQ。

### 3. 配置模型与环境变量

核心配置文件位于 `bootstrap/src/main/resources/application.yaml`。建议通过环境变量配置各模型供应商及外部服务密钥（如 `DEEPSEEK_API_KEY`、`AIHUBMIX_API_KEY`、`ZENMUX_API_KEY`、`MINERU_API_KEY` 等），避免将明文密钥提交到公开仓库。

### 4. 启动后端与前端

```bash
# 启动后端主服务（默认端口 9090，前缀 /api/ragent）
./mvnw -pl bootstrap spring-boot:run

# 可选：启动独立 MCP 示例服务（默认端口 9099）
./mvnw -pl mcp-server spring-boot:run

# 启动前端开发服务器
cd frontend
npm install
npm run dev
```

更完整的本地环境搭建、可选中间件（Ollama / LightRAG）及排障说明，请参考 [本地启动指南](docs/local-startup-guide.md)。

---

## 开源协议

本项目遵循 [Apache-2.0 License](./LICENSE) 开源协议，基于上游开源项目进行二次开发与本地化适配。

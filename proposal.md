# GenAI 期末项目方案：面向 Coding Agent 的本地优先持久记忆运行时

## 一、项目定位

本项目拟构建一套 **面向 coding agent 的本地优先持久记忆运行时（local-first persistent memory runtime）**，并以 **OpenCode** 作为主要集成与演示表面，验证代理在跨会话、跨任务、上下文压缩（compaction）之后，仍能保留和恢复关键项目记忆的能力。

项目的核心不是“做一个普通插件”或“把所有记忆系统强行拼接成通用 memory OS”，而是围绕真实开发工作流，建立一条可验证的闭环：

- 采集 coding workflow 中的高价值信号
- 将其转化为结构化、可追溯的长期记忆
- 在后续任务中按上下文相关性进行检索、排序与注入
- 让 agent 在新 session 中延续项目知识、架构决策与任务状态

对外表现上，这个系统第一阶段很可能以一个 **OpenCode 侧的集成层 / plugin adapter** 呈现；但从系统边界上，它的本体应是一个独立的 **memory runtime**，而不是把全部价值都压在某个宿主插件 API 上。

## 二、作业要求对齐

本项目明确选择并实现以下两个核心 GenAI 组件：

### 1. Prompt Engineering

本项目中的 Prompt Engineering 不是简单写提示词，而是围绕“记忆如何进入 agent 工作流”设计系统化策略：

- 面向不同任务阶段的上下文注入模板
- 结构化 session summary / handoff prompt
- 从工具执行、文件变更、任务状态中抽取高价值记忆的提示策略
- 在上下文预算有限时控制注入权重、去噪和恢复顺序
- 在 compaction 前后保持关键状态不丢失

### 2. Retrieval-Augmented Generation (RAG)

本项目中的 RAG 不是单一向量检索，而是一条适用于 coding workflow 的记忆检索与组装链路：

- 从本地持久化存储中召回相关记忆
- 结合任务、时间、作用域和结构化标签进行过滤与排序
- 将长期记忆、近期任务状态、项目事实和 session summary 进行拼装
- 生成受控、可解释、可复用的 context bundle，再注入给 agent

### 应用类型

本项目属于一个自定义的 generative AI application type：

**AI Developer Workflow Assistant / Coding Agent Memory Layer**

它兼具以下作业建议方向的特征：

- Technical Documentation Assistant
- Research Synthesis Tool
- AI Content Creation Assistant

但更具体地说，它服务于 **coding agent 的长期协作能力增强**。

## 三、为什么是这个选题

### 差异化来源

常见的 GenAI 期末作业往往聚焦于 PDF 问答、学习辅导、文本总结、内容生成等方向。这些方向成熟且容易落地，但相对同质化。本项目的差异化体现在：

1. **场景更具体也更前沿**：相比普通 chatbot 记住“用户喜欢什么”，coding agent 更需要记住“这个项目为什么选 Zustand 而不是 Redux”“上次测试失败是如何修复的”“某个目录为何不能动”。
2. **技术问题更有工程真实感**：长期记忆、上下文恢复、任务交接、状态延续，本质上都是当前 agent 系统在实际使用中的痛点。
3. **叙事张力更强**：以 OpenCode 为第一演示表面，项目既能展示真实工作流中的价值，也能保留 headless automation、自举开发等高阶亮点作为加分项。
4. **研究与工程可以自然结合**：项目可以同时讨论 memory architecture、retrieval design、prompt assembly、human-auditable local storage、multi-agent handoff 等问题。

### 现实问题陈述

当前 coding agent 虽然能完成单轮任务，但一旦任务跨越多个 session，往往会暴露出以下结构性问题：

- 忘记项目偏好与约定
- 忘记之前做过的架构取舍
- 在 transcript 被压缩或截断后丢失上下文
- 多 agent / 多阶段任务交接质量不稳定
- 需要用户重复解释“这个项目是什么、做到哪了、哪些地方不能动”

本项目的目标，就是把这些问题从“使用体验上的不顺手”提升为“可以被工程化解决的系统问题”。

### 什么不做

- **不做**一个试图统一所有 agent memory 范式的“通用 memory OS”
- **不做**对所有外部系统的深度代码级融合
- **不做**以 SaaS 依赖为核心的不可复现实验系统
- **不把** headless 自举开发作为项目成立的唯一前提
- **不追求**第一阶段就完成图谱推理、团队共享记忆、远程同步等重型能力

项目定位是：

**高维度设计叙事 + 现实可交付的 hybrid MVP**

## 四、融合策略：从各家提取什么

本项目会吸收多个来源的设计灵感，但不会声称对它们进行硬性“强融合集成”。这些来源的价值在于提供系统边界、能力拆分和设计启发。

| 来源 | 借鉴的高层思路 | 在本项目中的角色 |
|------|----------------|------------------|
| mem0 | 持久记忆产品化路径、memory API、结构化记忆后端思路 | 作为**可选底层 backend 参考/实现候选** |
| MemOS | 记忆分层、生命周期管理、memory 作为系统能力的视角 | 作为**概念框架与论文/related work 引用** |
| MemKraft | local-first、可审计存储、显式 retrieval/injection、可验证工具链 | 作为**工程设计灵感与运行时边界参考** |
| Knox | memory brain、working cache、retrieval split、长期状态系统叙事 | 作为**架构叙事与能力拆分灵感** |
| VCPToolBox | notebook artifact + retrieval substrate 分层、可见记忆工件 | 作为**memory artifact 设计灵感** |
| OMO-memory（先前原型） | runtime + adapter 分离、本地 SQLite、bounded context assembly、handoff / checkpoint 思路 | 作为**最直接的本地可行性先验与原型参考** |

因此，本项目的融合方式不是“把所有项目的代码接起来”，而是：

- 在 **高层系统边界** 上借鉴它们的长处
- 在 **课程项目可交付范围** 内选择可实现的最小闭环
- 将复杂能力区分为 **MVP 主线** 与 **stretch goals**

## 五、技术架构

### 总体架构判断

本项目推荐采用：

**Memory Runtime + OpenCode Adapter + Optional OmO/Automation Layer**

而不是仅仅定义为“一个 OpenCode 插件项目”。

```
┌──────────────────────────────────────────────────────────────┐
│                      OpenCode (TUI / CLI / Server)          │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │      OpenCode Integration Surface / Plugin Adapter   │   │
│   │  - host events capture                               │   │
│   │  - memory tools / inspection                         │   │
│   │  - context injection bridge                          │   │
│   └───────────────────────┬──────────────────────────────┘   │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            ▼
         ┌──────────────────────────────────────────────┐
         │     [本项目核心] Local-First Memory Runtime  │
         │                                              │
         │  - ingestion / extraction                    │
         │  - memory storage                            │
         │  - retrieval / ranking                       │
         │  - context assembly                          │
         │  - handoff / checkpoint / session summary    │
         └───────────────────────┬──────────────────────┘
                                 ▼
                ┌──────────────────────────────────┐
                │ SQLite + Visible Memory Artifacts│
                │ facts / handoff / snapshot files │
                └──────────────────────────────────┘
                                 ▲
                                 │
                ┌──────────────────────────────────┐
                │ Optional Stretch Layers          │
                │ headless automation / dashboard  │
                │ OmO orchestration sync           │
                └──────────────────────────────────┘
```

### 记忆分层模型

借鉴 MemOS、Knox、VCP 和 OMO-memory 的高层思路，第一阶段可以将记忆粗分为三类：

1. **项目事实层（Project Facts）**
   - 稳定、相对长期不变的信息
   - 例如：技术栈约定、目录规则、部署限制、命名约定

2. **任务与决策层（Task / Decision Memory）**
   - 与当前开发任务推进相关的结构化状态
   - 例如：为什么这样改、改到哪一步、有哪些未决问题、当前 blocker 是什么

3. **会话与情境层（Session / Context Memory）**
   - 用于跨 session 恢复上下文
   - 例如：最近工具操作摘要、session summary、handoff、局部 checkpoint

这个分层不是为了做理论炫技，而是为了回答一个现实问题：

**什么值得长期记住，什么只是短期工作状态，什么应该被优先召回。**

### 运行时职责

memory runtime 的职责包括：

- 接收和整理宿主事件与可用上下文信号
- 执行记忆抽取与归档
- 维护结构化记忆状态与本地持久化
- 进行 recall / ranking / assembly
- 输出一个 bounded context bundle 给宿主 agent
- 在必要时生成 handoff、checkpoint 或 session summary

### 为什么强调 local-first

本地优先的优势在于：

- **可控**：用户知道数据在哪
- **可审计**：记忆来源与工件更清晰
- **可复现**：适合作业演示和 GitHub 交付
- **可迁移**：未来可以替换底层实现而不破坏系统边界

## 六、自举开发与自动化能力（项目亮点，但非唯一主线）

### 核心想法

OpenCode 提供了真实的交互式开发环境、插件能力、rules / AGENTS 机制，以及 server / headless automation 的可能性。这给项目带来一个非常有吸引力的亮点：

> 记忆运行时不仅可以服务用户，还可以在项目开发过程中反过来帮助 agent 保留开发上下文。

这意味着项目具备一种很强的展示张力：

- agent 在开发过程中积累项目记忆
- 后续 session 能恢复前一轮状态
- headless automation 可以作为验证与 demo 加速器

### 为什么把它降为“亮点”而不是“成立前提”

这是本次方案收敛后的关键修正。

自举开发、全天候 agent 自动迭代、完全无人介入的闭环开发，确实非常有戏剧性，也适合做视频展示；但如果把它写成项目成立的唯一核心，一旦自动化链路不稳定，整个 proposal 就会显得脆弱。

因此，本项目对这部分的定位是：

- **主线 MVP**：证明记忆运行时本身成立
- **加分亮点**：展示该运行时如何支持 headless / automated agent workflow

### 可以展示的自动化方向

- 通过 OpenCode server/headless 模式触发非交互任务
- 让 agent 在多次运行中保留关键项目记忆
- 对比“有记忆”和“无记忆”时的任务恢复效果
- 将自举式开发闭环作为展示案例，而非主依赖

## 七、技术栈

- **核心语言**：TypeScript（runtime / adapter 主线）
- **辅助脚本与评估**：Python（evaluation、demo orchestration、数据分析）
- **记忆存储**：SQLite + visible markdown artifacts（主线）；必要时评估 `mem0` 作为 backend option
- **检索能力**：结构化过滤 + 本地检索 + 可选向量检索增强
- **API / 模型**：OpenAI / Anthropic / open-source model API（三选一或组合）
- **宿主环境**：OpenCode
- **网页展示**：React / Next.js / GitHub Pages（任选其一，以简单清晰为先）
- **CI / 验证**：GitHub Actions + local test scripts

## 八、时间与分工（2-3 人团队，约 8 周）

| 周次 | 里程碑 | 负责方向 |
|------|--------|----------|
| W1 | 明确 MVP 边界，整理架构草图，验证 OpenCode 集成路径 | 全体 |
| W2 | 定义 memory runtime schema、记忆分层、context assembly 基线 | 架构 |
| W3 - W4 | 实现本地持久化、记忆写入/检索、OpenCode adapter 原型 | 成员 A（后端/集成） |
| W3 - W4 | 设计 Prompt Engineering 模板、session summary / handoff 机制 | 成员 B（GenAI / evaluation） |
| W5 | 完成跨 session demo 路径，加入可解释的 recall / injection 展示 | 成员 A + B |
| W5 | 若时间允许，加入 dashboard / memory artifact viewer | 成员 C（前端，可选） |
| W6 | 完成评估脚本，对比“有记忆 / 无记忆”场景 | 成员 B |
| W7 | 整理文档、录制视频、部署网页 | 全体 |
| W8 | 缓冲周、bug 修复、答辩材料与演示打磨 | 全体 |

### 单人版收缩建议

如果是单人项目，则优先保留：

- memory runtime 主线
- OpenCode demo integration
- 基础评估
- 项目网页与视频

可以砍掉或弱化：

- dashboard
- 复杂 checkpoint 分支语义
- 自举自动化闭环
- 向量增强检索

## 九、交付物清单（对应作业要求）

### GitHub Repository

预期仓库结构可类似于：

- `packages/runtime/`：memory runtime 主体
- `packages/opencode-adapter/`：OpenCode 集成层 / plugin adapter
- `evaluation/`：评估脚本、scenario dataset、结果记录
- `docs/`：架构说明、ADR、设计笔记
- `examples/`：示例任务、示例记忆工件、sample outputs
- `web/`：项目展示页（可独立目录或使用 GitHub Pages）
- `README.md`：setup、运行方式、项目介绍

### PDF 文档

PDF 文档将覆盖作业要求的核心部分：

1. **System architecture diagram**
   - 使用 runtime + adapter 结构图
2. **Implementation details**
   - 记忆分层、Prompt Engineering、RAG pipeline、OpenCode integration
3. **Performance metrics**
   - 记忆命中率、上下文恢复效果、任务连续性、延迟与开销
4. **Challenges and solutions**
   - scope 收敛、检索噪音控制、宿主边界、local-first 与可解释性
5. **Future improvements**
   - 更强的语义检索、跨项目知识、团队共享、自动化增强
6. **Ethical considerations**
   - 敏感信息过滤、项目隐私、API key 保护、错误记忆与误召回风险

### 10 分钟视频演示

- 0:00 - 1:00 问题背景：为什么 coding agent 需要专门的 memory runtime
- 1:00 - 3:00 架构讲解：runtime、adapter、local-first 存储、Prompt + RAG 闭环
- 3:00 - 6:30 Live demo：
  - 在 OpenCode 中启动任务
  - 写入/积累项目事实或任务状态
  - 重新开启 session 后恢复关键上下文
  - 展示记忆如何帮助 agent 继续工作
- 6:30 - 8:00 展示 memory artifact / handoff / summary / recall 效果
- 8:00 - 9:00 指标、对比与限制
- 9:00 - 10:00 lessons learned 与 future work

### Web 页面

- 项目一句话主张
- 问题定义与使用场景
- 核心架构图
- Prompt Engineering + RAG 双核心说明
- OpenCode 演示场景
- 视频嵌入
- GitHub 仓库与文档链接
- MVP 与 stretch goals 对比

## 十、风险与应对

| 风险 | 概率 | 应对 |
|------|------|------|
| 范围膨胀，试图做成通用 memory OS | 中 | 明确锁定 hybrid MVP：local-first memory runtime + OpenCode integration |
| OpenCode 集成边界或文档与预期不完全一致 | 中 | 保持 adapter 边界清晰，避免将 undocumented 细节写成系统前提 |
| 检索噪音过大，记忆反而干扰 agent | 中 | 优先结构化检索、作用域过滤、时间衰减与摘要组装，而非盲目全量注入 |
| 向量检索或外部 backend 效果不稳定 | 低-中 | 保留 SQLite / FTS / keyword 路线作为 fallback，必要时再引入 `mem0` 或其他增强 |
| 自动化/自举链路不稳定，影响 demo | 中 | 将 headless 自举定义为 bonus showcase，而非项目成立前提 |
| API 费用或模型成本超支 | 低 | 控制调用量，优先用小模型做抽取/summary，仅在关键演示场景使用更强模型 |
| 记忆中包含敏感信息或产生错误记忆 | 中 | 增加可见 memory artifact、删除机制、敏感字段过滤与人工可审计性 |

## 十一、评分维度自查

| 评分项（权重） | 本项目对应 |
|---------------|-----------|
| Technical Implementation (40%) | Prompt Engineering + RAG 两个核心组件明确落地；runtime、retrieval、context assembly 和 OpenCode integration 形成完整系统 |
| Creativity and Application (20%) | 选题差异化明显；面向 coding agent 的长期记忆具有真实使用价值 |
| Documentation and Presentation (20%) | 可提供结构清晰的架构图、可解释的 memory artifacts、强展示性的 workflow demo |
| User Experience and Output Quality (20%) | 用户可直接观察记忆如何改善跨 session continuity、上下文恢复和任务延续 |

## 十二、下一步立即行动项

1. 以当前 proposal 为基础确定 **MVP 主线** 与 **stretch goals** 的边界
2. 从本地已有研究中抽取可直接复用的 runtime 设计思路，整理成新仓库结构草案
3. 先跑通一个最小 demo：在 OpenCode 中保存并恢复一段项目事实或任务状态
4. 再决定是否引入 `mem0`、vector retrieval、dashboard、自举自动化等增强能力
5. 建立 GitHub 仓库、README 骨架、评估脚本框架与网页草稿

---

*本文档基于课程要求、对多种 memory system 的调研，以及对 OpenCode / OMO-memory / MemKraft / mem0 / MemOS / Knox / VCPToolBox 等来源的综合分析形成。后续实施阶段将继续在不偏离主线的前提下，对具体实现进行收敛、验证与必要调整。*

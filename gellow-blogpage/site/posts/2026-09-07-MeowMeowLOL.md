---
pageKind: markdown-post
title: "LangChain 与 LangGraph 技术体系详解"
description: "RAG相关内容"
date: "2026-09-07"
updated: "2026-09-07 13:22:03"
slug: "MeowMeowLOL"
legacyId: 17
tags: []
outline: [2, 3]
---

## 1\. 大语言模型应用开发基础

随着大语言模型（Large Language Model，LLM）的快速发展，单纯调用模型 API 已经无法满足复杂应用需求。

传统的大模型调用流程通常如下：

```
用户输入
    ↓
Prompt
    ↓
LLM
    ↓
文本回复
```

这种方式适合简单问答，但在实际应用中存在明显限制：

-   无法访问外部知识
-   缺少长期记忆能力
-   无法执行复杂任务
-   无法调用外部工具
-   难以维护复杂业务流程

因此，现代 LLM 应用通常需要一个中间框架，用于连接模型、数据、工具以及业务逻辑。

LangChain 正是在这一背景下出现的。

* * *

## 2\. LangChain 简介

LangChain 是一个用于构建大语言模型应用的开发框架。

它并不是一个模型本身，而是提供了一套完整的应用开发抽象，将大模型与各种外部能力连接起来。

其核心目标是：

> 将大语言模型从单纯的文本生成工具，扩展为能够理解任务、调用工具、访问知识并完成复杂工作的智能应用。

LangChain 的主要组成部分包括：

```
LangChain

├── Model
├── Prompt
├── Runnable
├── Chain
├── Memory
├── Retrieval
├── Agent
├── Tool
└── Callback
```

* * *

## 3\. Model 模型层

Model 是 LangChain 与大语言模型之间的连接层。

目前主流模型通常分为两类：

### 3.1 LLM

传统文本补全模型。

输入：

```
请介绍一下 Transformer
```

输出：

```
Transformer 是一种基于注意力机制的神经网络架构...
```

* * *

### 3.2 Chat Model

目前更加常用的聊天模型。

相比传统 LLM，Chat Model 使用多角色消息结构：

```
[
 {
  "role":"system",
  "content":"你是一个AI助手"
 },
 {
  "role":"user",
  "content":"介绍一下RAG"
 }
]
```

这种方式能够支持：

-   系统提示
-   用户消息
-   历史上下文
-   多轮对话

也是当前 GPT、Claude、Qwen 等模型主要采用的交互方式。

* * *

## 4\. Prompt 工程

Prompt 是用户与模型之间的重要接口。

优秀的 Prompt 不只是简单描述需求，而是通过结构化设计，引导模型产生更加稳定的输出。

常见 Prompt 类型：

### 4.1 Role Prompt

定义模型身份：

```
你是一名资深Python工程师
```

* * *

### 4.2 Instruction Prompt

明确任务要求：

```
请分析以下代码，并指出其中的问题
```

* * *

### 4.3 Few-shot Prompt

通过示例帮助模型理解任务格式。

例如：

```
输入：
苹果

输出：
水果

输入：
汽车

输出：
？
```

* * *

### 4.4 Structured Output

要求模型按照固定格式输出。

例如：

```
{
 "title":"",
 "summary":"",
 "keywords":[]
}
```

这对于程序调用模型非常重要。

* * *

## 5\. Runnable：LangChain 的核心抽象

新版 LangChain 中，Runnable 是非常重要的概念。

它提供了一套统一接口，使不同组件能够进行组合。

所有组件都可以通过类似接口调用：

```
invoke()

batch()

stream()
```

例如：

```
Prompt

↓

LLM

↓

Output Parser
```

可以组合成为一个完整流程：

```
chain = prompt | model | parser
```

这种设计类似 Linux 中的管道：

```
程序A | 程序B | 程序C
```

每个模块负责自己的功能，并通过统一接口连接。

* * *

## 6\. Chain 流程编排

Chain 表示多个步骤组成的固定执行流程。

例如，一个文章生成流程：

```
主题输入

↓

生成文章大纲

↓

扩展内容

↓

润色文章

↓

最终输出
```

Chain 的特点：

优点：

-   结构清晰
-   易于维护
-   执行过程稳定

缺点：

-   流程固定
-   缺少自主决策能力

因此，在复杂任务中通常会使用 Agent。

* * *

## 7\. Memory 记忆系统

大语言模型本身并不存在真正的长期记忆。

每次调用模型时，它只能看到当前输入的信息。

Memory 用于保存历史信息，并在下一次请求时提供给模型。

常见 Memory 类型：

### Conversation Buffer Memory

保存完整历史消息：

```
用户：
介绍一下RAG

AI：
RAG是一种...
```

优点：

简单直接。

缺点：

随着对话增长，占用大量 Token。

* * *

### Summary Memory

将历史内容总结：

```
用户正在学习AI应用开发，
已经了解RAG和Agent基础。
```

减少上下文长度。

* * *

### Vector Memory

将历史信息转换为向量：

```
文本

↓

Embedding

↓

Vector Database
```

需要时通过相似度搜索召回。

这种方式更接近真正的长期记忆。

* * *

## 8\. RAG 检索增强生成

RAG（Retrieval Augmented Generation）是目前企业级 LLM 应用中最重要的技术之一。

它解决的问题：

> 如何让大模型使用自己的私有数据？

基本流程：

```
用户问题

↓

Embedding

↓

向量数据库搜索

↓

相关文档

↓

组合Prompt

↓

LLM生成答案
```

* * *

## 9\. RAG核心组件

### 9.1 Document Loader

负责加载数据：

-   PDF
-   Markdown
-   Word
-   网页
-   数据库

* * *

### 9.2 Text Splitter

由于模型上下文长度有限，需要将长文本切割。

例如：

```
100页文档

↓

500个文本块
```

常见方法：

-   Recursive Character Splitter
-   Token Splitter

* * *

### 9.3 Embedding

Embedding 用于将文本转换为向量。

例如：

```
人工智能

↓

[0.21,0.53,0.91...]
```

语义相近的文本，在向量空间中的距离也更接近。

* * *

### 9.4 Vector Database

用于存储向量数据。

常见数据库：

-   FAISS
-   Chroma
-   Milvus
-   Pinecone

* * *

## 10\. Agent 智能体系统

Chain 最大的问题是流程固定。

Agent 则允许模型根据目标自主决定下一步行动。

典型流程：

```
用户目标

↓

模型分析

↓

选择工具

↓

执行任务

↓

观察结果

↓

继续执行

↓

最终回答
```

* * *

## 11\. Tool 工具调用

Agent 的能力来源于工具。

例如：

```
Agent

├── 搜索工具
├── 计算工具
├── 数据库工具
├── Python工具
└── API工具
```

通过工具调用，大模型可以突破自身限制。

* * *

## 12\. Function Calling

现代 Agent 通常通过 Function Calling 实现工具调用。

模型输出：

```
{
"name":"search",
"arguments":{
 "query":"天气"
}
}
```

程序根据模型请求执行对应函数，并返回结果。

* * *

## 13\. LangGraph

随着 Agent 系统越来越复杂，传统 Agent Loop 开始暴露问题：

-   流程难控制
-   状态难管理
-   调试困难

LangGraph 是 LangChain 生态中用于构建复杂 Agent 工作流的框架。

核心思想：

> 使用图结构描述 AI 应用的执行流程。

* * *

## 14\. LangGraph核心概念

### State

状态，用于保存整个工作流中的数据。

例如：

```
{
 "question":"",
 "documents":[],
 "answer":""
}
```

* * *

### Node

节点，代表一个执行步骤。

例如：

```
检索节点

↓

生成节点

↓

审核节点
```

* * *

### Edge

边，表示节点之间的连接关系。

普通流程：

```
A

↓

B
```

条件流程：

```
        成功
A ----------------

        失败
B
```

* * *

## 15\. Multi-Agent 多智能体系统

复杂任务通常需要多个 Agent 协作。

例如：

```
Manager Agent

      |
-----------------
|       |        |
搜索Agent  编程Agent  写作Agent
```

不同 Agent 负责不同领域任务。

* * *

## 16\. LLM 应用开发技术路线

学习路线：

```
基础模型调用

↓

Prompt Engineering

↓

LangChain基础

↓

RAG知识库

↓

Agent工具调用

↓

LangGraph工作流

↓

Multi-Agent系统

↓

模型微调与优化
```

* * *

## 总结

LangChain 和 LangGraph 并不是用于训练大模型的框架，而是用于构建大模型应用的软件工程框架。

其中：

-   LangChain 负责连接模型、数据和工具
-   RAG 负责让模型访问外部知识
-   Agent 负责自主规划任务
-   LangGraph 负责管理复杂工作流

未来的大模型应用开发，本质上会越来越接近：

```
LLM
+
RAG
+
Agent
+
Workflow
+
Tools
```

而 LangChain 与 LangGraph 正是这一技术体系中的重要基础设施。

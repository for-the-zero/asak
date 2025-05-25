# asak

**A**PI **S**mart **A**ccess **K**it

API智能访问工具包

> (Other Thoughts By Gemini 2.5 Pro:)
> 
> - Adaptive Selection of API Kit
> - Adaptive Selection of API Keys
> - Adaptive Selection Automation Kit
> - Adaptive Selection of API Kind
> - Automatic Service for API Keys
> - Auto-Switching for API Kind
>
> ~~（其实最初想写Auto Select API Key的） / (Actually, I wanted to write Auto Select API Key at first.)~~

# 为什么会有asak / Why Asak?

众所周知，大模型api调用一般是由速率限制的，要是一不小心触及到了可不行

As we all know, the api from llm providers is generally rate-limited. If we don't pay attention, we might be blocked.

于是，为了能够利用多个提供商和多个模型甚至多个账号的速率限制，我只做了一个轻量化、无服务器的工具包

So, I made a lightweight, serverless tool kit to utilize multiple providers and models, and even multiple accounts' rate limits.

# 文档 / Documentation

[前往 -> 中文文档]( ./docs/zh.md)

[go to -> English Documentation](./docs/en.md)

# 功能和特性 / Features

- 同时支持Python和JavaScript，方便开发
- Support both Python and JavaScript, for development convenience
- 通过对象轻松集中配置和管理多个API提供商和模型
- Easily centralize and manage multiple API providers and models with objects
- 可导入导出以及合并调用记录
- Import, export, and merge call records
- 快速调用，已封装OpenAI的API
- Quickly call, with pre-built OpenAI API
- 支持过滤器函数，可以筛选模型
- Support filter functions, to filter models
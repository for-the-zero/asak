# asak 文档

该文档含有Python、JavaScript的库api

注：
- 含有` --> return`的注释代表该函数有返回值
- `{Object}`代表传入一个对象，`[Array]`和`[List]`分别代表在JavaScript中传入一个数组和在Python中传入一个列表

# 目录

- [初始化](#1-初始化)
- - [安装](#11-安装)
- - [定义](#12-定义)
- - [配置json](#13-配置json)
- [速率限制记录相关](#2-速率限制记录相关)
- [记录和请求相关](#3-记录和请求相关)
- - [获取模型](#31-获取模型)
- - [请求API](#32-请求api)

---

# 1. 初始化

初始化该工具

## 1.1. 安装

导入模块有多种方式

1. 使用node(JavaScript)

```sh
npm install asak
```

```javascript
const asak = require('asak'); // cjs
import asak from 'asak'; // esm
```

2. CDN(JavaScript)

```html
<script src="后面再补上"></script>
```

3. pip安装(Python)

后面再补上

## 1.2. 定义

JavaScript:

```javascript
var AI = new asak( {Object} );
```

Python:

```python
AI = asak( {Object} )
```

## 1.3. 配置json

需要将json转换成对应语言课直接读取的对象，配置对象结构相同，传入类`asak`即可

```json
{
    "providers": {
        "任意名字的id": {
            "base_url": "https://your-api.com/base_url",
            "key": "your-api-key"
        },
        ...
    },
    "models": [
        {
            "provider": "providers中的id",
            "model": "模型名称",
            "tags": ["标签1", "标签2"],
            "rate_limit": {
                "rpm": 114514,
                "rpd": 1919810
            }
        },
        ...
    ],
}
```

这里使用提供商与模型分开的策略，便于填写

以下几点需要注意：

1. providers中的id随便填写，但不能重复，models中的provider必须在providers中存在且对应
2. models中每个模型的模型名称，是调用llm的api时使用的
3. models中每个模型的tags是可选的，可以是`[]`
4. models中每个模型的rate_limit是可选的，rpm和rpd分别表示每分钟请求次数和每天请求次数，如果不填写，则表示在该方面没有速率限制，完全没有限制填`{}`

# 2. 速率限制记录相关

JavaScript:

```javascript
AI.record.get(); // 获取所有记录 --> return
AI.record.replace( [Array] ); // 替换所有记录
AI.record.add( [Array] );  // 追加到记录 --> return
AI.record.organize(); // 整理记录 --> return
```

Python:

```python
AI.record.get() # 获取所有记录 --> return
AI.record.replace( [List] ) # 替换所有记录
AI.record.add( [List] ) # 追加到记录 --> return
AI.record.organize() # 整理记录 --> return
```

- `.replace`的作用是完全替换掉原有的记录
- `.add`的作用是追加到原有的记录，将新旧记录进行合并
- `.organize`的作用是整理记录，根据请求速率留下还在限制当前速率的时间戳

以上返回均为一个数组/列表，结构如下（用JSON表示）：

```json
[
    [1736831640,1744675200,1919810000],
    ...
]
```

每个子数组/列表的索引与模型在配置中`models`的索引对应，每个数字代表分别在这三个时间戳请求了该模型

# 3. 请求

请求相关的api并记录请求时间戳，用于计算速率限制

## 3.1. 获取模型

```javascript
AI.get_model(...); // 获取指定模型 --> return
```

```python
AI.get_model(...) # 获取指定模型 --> return
```

这个的传入参数较为复杂，故拎出来单独介绍

1. `mode`（必填）：排序模式，只能填写字符串，可以填写`index`（筛选后根据索引取最高的一个模型）、`avaliable`（最可用的）、`random`（能用就行，不管了）
2. `filter`（可选）：一个函数一个函数，传入`your_func(index, model)`，是模型的索引和对象，你的函数需要返回布尔值，返回`true`/`True`则表示可以选择该模型，这个函数会被调用多次

返回值为一个对象，结构如下（用JSON表示）：

```json
{
    "provider": "providers中的id",
    "base_url": "https://your-api.com/base_url",
    "key": "your-api-key",
    "model": "模型名称",
}
```

## 3.2. 请求API

你可以自行请求api，也可以用这个直接请求api（`/chat/completion`），仅支持OpenAI格式的API

```javascript
AI.request( ... ); // 请求api --> return
```

```python
AI.request( ... ) # 请求api --> return
```

传入参数:

1. `mode`（必填）
2. `filter`（可选）
3. `messages`（必填）：消息数组，与OpenAI的api一致

返回值（用JSON表示）：

```json
{
    "provider": "providers中的id",
    "base_url": "https://your-api.com/base_url",
    "key": "your-api-key",
    "model": "模型名称",
    "delta": delta
}
```

其中`delta`是一个可迭代对象，迭代的结果为原OpenAI库中`stream[i].choices[0].delta.content`，也就是新增字符串

示例：

```javascript
const AI = new asak(...);
var callback = AI.request('index', null, [
    {"role": "user", "content": "你好"}
]);
consonle.log(callback.provider);
consonle.log(callback.model);
(async()=>{for await(let delta of callback.delta){ // 我觉得这样好看，你管我┐⁠(⁠￣⁠ヘ⁠￣⁠)⁠┌
    console.log(delta);
};})();
```
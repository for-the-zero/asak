# 文档

该文档含有Python、JavaScript的库api调用方式

注：

- 含有` --> return`的注释代表该函数有返回值
- `{Object}`和`{dict}`代表传入一个对象
- `[Array]`和`[list]`分别代表在JavaScript中传入一个数组和在Python中传入一个列表

---

# 1. 初始化

初始化该工具

## 1.1. 安装和导入

1. JavaScript

使用Node.js，通过npm安装

```sh
npm install asakjs
```

然后导入，支持cjs和esm

```javascript
const asak = require('asakjs'); // cjs
import asak from 'asakpy'; // esm
```

或者CDN(以unpkg为例)

```html
<script src="https://unpkg.com/asakjs/dist/asakjs.js"></script>
```

2. pip安装(Python)

通过pip安装

```sh
pip install asakpy
```

然后导入

```python
from asakpy import asak
```

## 1.2. 定义

JavaScript:

```javascript
var client = new asak( {Object} );
```

Python:

```python
client = asak( {dict} )
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
4. models中每个模型的rate_limit是必填的

# 2. 速率限制记录相关

JavaScript:

```javascript
client.recorder.get(); // 获取所有记录 --> return
client.recorder.replace( [Array] ); // 替换所有记录
client.recorder.add( [Array] );  // 追加到记录 --> return
client.recorder.use(index, filter);
```

Python:

```python
client.recorder.get() # 获取所有记录 --> return
client.recorder.replace( [list] ) # 替换所有记录
client.recorder.add( [list] ) # 追加到记录 --> return
client.recorder.use(index, filter)
```

- `.replace`的作用是完全替换掉原有的记录
- `.add`的作用是追加到原有的记录，将新旧记录进行合并
- `.use`的作用是寻找模型并给它记录，两个参数任选一个，如果都传入这`index`优先；`filter`是个函数，按索引顺序遍历模型的时候执行，当它返回`true`时代表模型被选中然后停止遍历并记录改模型，传入`your_func(index, model)`

`.get`会返回均为一个数组/列表，结构如下（用JSON表示）：

```json
[
    {
        "m": [1736831640,1744675200,1919810000],
        "d": [1736831640,1744675200,1919810000],
        "limit_m": 6,
        "limit_d": 9,
    },
    ...
]
```

索引与`models`中的索引对应，`m`和`d`分别一天和一分钟内请求时间戳，`limit_m`和`limit_d`分别表示每分钟和每天的限制数量

# 3. 请求

请求相关的api并记录请求时间戳，用于计算速率限制

## 3.1. 获取模型

```javascript
client.get_model(...); // 获取指定模型 --> return
```

```python
client.get_model(...) # 获取指定模型 --> return
```

这个的传入参数较为复杂，故拎出来单独介绍

1. `mode`（必填）：排序模式，只能填写字符串，可以填写`index`（筛选后根据索引取最高的一个模型）、`available`（最可用的）、`random`（能用就行，不管了）
2. `filter`（可选）：一个函数`your_func(index, model)`，参数为是模型的索引和对象，你的函数需要返回布尔值，返回`true`/`True`则表示可以选择该模型，这个函数会被调用多次

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
client.request( ... ); // 请求api --> return
```

```python
client.request( ... ) # 请求api --> return
```

传入参数:

1. `mode`（必填）
2. `filter`（可选）
3. `messages`（必填）：消息数组，与OpenAI的api一致
4. `is_stream`（可选）：布尔值，是否为流式请求，默认为`true`

当`is_stream`为`true`时，返回值（用JSON表示）：

```json
{
    "provider": "providers中的id",
    "base_url": "https://your-api.com/base_url",
    "key": "your-api-key",
    "model": "模型名称",
    "delta": delta,
    "original": original,
}
```

其中`delta`是一个可迭代对象，迭代的结果为原OpenAI库中`result[i].choices[0].delta.content`，也就是新增字符串

其中`original`是原本OpenAO库调用`.chat.completion`原始返回结果

当`is_stream`为`false`时，返回值（用JSON表示）：

```json
{
    "provider": "providers中的id",
    "base_url": "https://your-api.com/base_url",
    "key": "your-api-key",
    "model": "模型名称",
    "message": "result.choices[0].message中的结果",
    "original": original,
}
```

其中`original`是原本OpenAO库调用`.chat.completion`原始返回结果

# 4. 示例：

```javascript
var asak = require('asakjs');
// or
// import asak from 'asakjs';
// or in borwser
// const asak = asakjs;
var ai = new asak( ... );
(async () => {
    const cb = await ai.request(
        'random',
        (i, m) => {return m.provider === 'sf';},
        [{"role": "user", "content": "你好"}]
    );
    console.log(cb.model);
    for await (const delta of cb.delta) {
        console.log(delta);
    };
})();
```

```python
from asakpy import asak
client = asak(...)
callback = client.request('index', None, [
    {"role": "user", "content": "你好"}
])
print(callback.provider)
print(callback.model)
for delta in callback.delta:
    print(delta)
```
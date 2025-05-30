# Documentation

This document contains API call methods for Python and JavaScript libraries.

Note:
- Comments containing `--> return` indicate that the function has a return value.
- `{Object}` and `{dict}` represent passing an object.
- `[Array]` and `[list]` represent passing an array in JavaScript and a list in Python, respectively.

---

# 1. Initialization

Initialize this tool.

## 1.1. Installation and Import

1.  JavaScript

Using Node.js, install via npm:

```sh
npm install asakjs
```

Then import. Supports cjs and esm:

```javascript
const asak = require('asakjs'); // cjs
import asak from 'asakpy'; // esm
```

Or CDN (using unpkg as an example):

```html
<script src="https://unpkg.com/asakjs/dist/asakjs.js"></script>
```

2.  pip installation (Python)

Install via pip:

```sh
pip install asakpy
```

Then import:

```python
from asakpy import asak
```

## 1.2. Definition

JavaScript:

```javascript
var AI = new asak( {Object} );
```

Python:

```python
AI = asak( {dict} )
```

## 1.3. Configuration JSON

The JSON needs to be converted into an object that the respective language can directly read. The configuration object structure is the same; pass it to the `asak` class.

```json
{
    "providers": {
        "any_name_id": {
            "base_url": "https://your-api.com/base_url",
            "key": "your-api-key"
        },
        ...
    },
    "models": [
        {
            "provider": "id_from_providers",
            "model": "model_name",
            "tags": ["tag1", "tag2"],
            "rate_limit": {
                "rpm": 114514,
                "rpd": 1919810
            }
        },
        ...
    ],
}
```

Here, a strategy of separating providers and models is used for ease of configuration.

The following points require attention:

1.  The ID in `providers` can be any name, but it must not be repeated. The `provider` in `models` must exist in `providers` and correspond to it.
2.  The `model` name for each model in `models` is used when calling the LLM API.
3.  The `tags` for each model in `models` are optional and can be `[]`.
4.  The `rate_limit` for each model in `models` is required

# 2. Rate Limit Recording

JavaScript:

```javascript
AI.recorder.get(); // Get all records --> return
AI.recorder.replace( [Array] ); // Replace all records
AI.recorder.add( [Array] );  // Append to records --> return
```

Python:

```python
AI.recorder.get() # Get all records --> return
AI.recorder.replace( [list] ) # Replace all records
AI.recorder.add( [list] ) # Append to records --> return
```

-   `.replace`'s function is to completely replace the existing records.
-   `.add`'s function is to append to the existing records, merging the new and old records.

The above returns are all an array/list, with the structure as follows (represented in JSON):

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

The index corresponds to the index in `models`. `m` and `d` are arrays of request timestamps within a minute and a day, respectively. `limit_m` and `limit_d` represent the limit counts per minute and per day, respectively.

# 3. Requesting

APIs related to requests, and records request timestamps, used for calculating rate limits.

## 3.1. Get Model

```javascript
AI.get_model(...); // Get specified model --> return
```

```python
AI.get_model(...) # Get specified model --> return
```

The input parameters for this are quite complex, so they are described separately:

1.  `mode` (required): Sort mode, must be a string. Can be `index` (select the highest-indexed model after filtering), `available` (most available), `random` (any usable model).
2.  `filter` (optional): A function `your_func(index, model)`. Parameters are the model's index and object. Your function needs to return a boolean value. Returning `true`/`True` indicates that this model can be selected. This function will be called multiple times.

The return value is an object with the following structure (represented in JSON):

```json
{
    "provider": "id_from_providers",
    "base_url": "https://your-api.com/base_url",
    "key": "your-api-key",
    "model": "model_name",
}
```

## 3.2. Request API

You can request the API yourself, or use this to directly request the API (`/chat/completion`). Only supports OpenAI format APIs.

```javascript
AI.request( ... ); // Request API --> return
```

```python
AI.request( ... ) # Request API --> return
```

Input parameters:

1.  `mode` (required)
2.  `filter` (optional)
3.  `messages` (required): Message array, consistent with the OpenAI API.

Return value (represented in JSON):

```json
{
    "provider": "id_from_providers",
    "base_url": "https://your-api.com/base_url",
    "key": "your-api-key",
    "model": "model_name",
    "delta": delta
}
```

Where `delta` is an iterable object. The result of iteration is the original OpenAI library's `stream[i].choices[0].delta.content`, i.e., the new string.

# 4. Examples:

```javascript
var asak = require('asakjs');
// or
// import asak from 'asakjs';
// or in browser
// const asak = asakjs;
var ai = new asak( ... );
(async () => {
    const cb = await ai.request(
        'random',
        (i, m) => {return m.provider === 'sf';},
        [{"role": "user", "content": "Hello"}]
    );
    console.log(cb.model);
    for await (const delta of cb.delta) {
        console.log(delta);
    };
})();
```

```python
from asakpy import asak
AI = asak( ... )
callback = AI.request('index', None, [
    {"role": "user", "content": "Hello"} # "你好" translated
])
print(callback.provider)
print(callback.model)
for delta in callback.delta:
    print(delta)
```
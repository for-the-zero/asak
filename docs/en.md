# Documentation

This document contains the API call methods for the Python and JavaScript libraries.

Note:

  - Comments containing `--> return` indicate that the function has a return value.
  - `{Object}` and `{dict}` represent passing an object.
  - `[Array]` and `[list]` represent passing an array in JavaScript and a list in Python, respectively.

-----

# 1. Initialization

Initialize the tool.

## 1.1. Installation and Import

1.  JavaScript

    Using Node.js, install via npm:

    ```sh
    npm install asakjs
    ```

    Then import; CJS and ESM are supported:

    ```javascript
    const asak = require('asakjs'); // cjs
    import asak from 'asakpy'; // esm
    ```

    Or via CDN (using unpkg as an example):

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
var client = new asak( {Object} );
```

Python:

```python
client = asak( {dict} )
```

## 1.3. Configuration JSON

The JSON needs to be converted into an object that can be directly read by the respective language. The configuration object structure is the same; pass it to the `asak` class.

```json
{
    "providers": {
        "any_unique_id": {
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

The following points need attention:

1.  The `id` in `providers` can be anything, but it must not be repeated. The `provider` in `models` must exist and correspond to an `id` in `providers`.
2.  The `model` name for each model in `models` is used when calling the LLM API.
3.  The `tags` for each model in `models` are optional and can be `[]`.
4.  The `rate_limit` for each model in `models` is mandatory.

# 2. Rate Limit Recording

JavaScript:

```javascript
client.recorder.get(); // Get all records --> return
client.recorder.replace( [Array] ); // Replace all records
client.recorder.add( [Array] );  // Append to records --> return
client.recorder.use(index, filter);
```

Python:

```python
client.recorder.get() # Get all records --> return
client.recorder.replace( [list] ) # Replace all records
client.recorder.add( [list] ) # Append to records --> return
client.recorder.use(index, filter)
```

  - `.replace` completely replaces the existing records.
  - `.add` appends to the existing records, merging the new and old records.
  - `.use` finds a model and records its usage. You can use either parameter; if both are provided, `index` takes precedence. `filter` is a function that is executed while iterating through the models in order of their index. When it returns `true`, the model is selected, the iteration stops, and the usage is recorded for that model. Pass `your_func(index, model)`.

`.get` will return an array/list with the following structure (represented in JSON):

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

The index corresponds to the index in `models`. `m` and `d` are arrays of request timestamps within a minute and a day, respectively. `limit_m` and `limit_d` represent the per-minute and per-day rate limits, respectively.

# 3\. Requesting

Request the relevant API and record the request timestamp, used for calculating rate limits.

## 3.1. Get Model

```javascript
client.get_model(...); // Get a specified model --> return
```

```python
client.get_model(...) # Get a specified model --> return
```

The parameters for this are quite complex, so they are explained separately.

1.  `mode` (required): A string for the sorting mode. Options are `index` (after filtering, takes the first model by index), `available` (the most available one), or `random` (any usable model).
2.  `filter` (optional): A function `your_func(index, model)`, where the parameters are the model's index and object. Your function needs to return a boolean value. Returning `true`/`True` indicates that the model can be selected. This function will be called multiple times.

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

You can make API requests yourself, or use this to directly request the API (`/chat/completion`). Only supports OpenAI-formatted APIs.

```javascript
client.request( ... ); // Request API --> return
```

```python
client.request( ... ) # Request API --> return
```

Parameters:

1.  `mode` (required)
2.  `filter` (optional)
3.  `messages` (required): The message array, consistent with the OpenAI API.
4.  `is_stream` (optional): A boolean indicating if the request is streaming. Defaults to `true`.

When `is_stream` is `true`, the return value is (represented in JSON):

```json
{
    "provider": "id_from_providers",
    "base_url": "https://your-api.com/base_url",
    "key": "your-api-key",
    "model": "model_name",
    "delta": delta,
    "original": original,
}
```

Here, `delta` is an iterable object. The result of iteration is the original `result[i].choices[0].delta.content` from the OpenAI library, i.e., the new string chunk.

Here, `original` is the raw return result from the original OpenAI library call to `.chat.completion`.

When `is_stream` is `false`, the return value is (represented in JSON):

```json
{
    "provider": "id_from_providers",
    "base_url": "https://your-api.com/base_url",
    "key": "your-api-key",
    "model": "model_name",
    "message": "The result from result.choices[0].message",
    "original": original,
}
```

Here, `original` is the raw return result from the original OpenAI library call to `.chat.completion`.

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
client = asak(...)
callback = client.request('index', None, [
    {"role": "user", "content": "Hello"}
])
print(callback.provider)
print(callback.model)
for delta in callback.delta:
    print(delta)
```
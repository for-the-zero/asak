const { OpenAI } = require("openai");
const { use } = require("react");

/**
 * Asak AI model management class
 * 管理AI模型请求的类
 * 
 * @class
 * @example
 * // JavaScript usage
 * const asak = require('asakjs');
 * const client = new asak(config);
 * 
 * @example
 * // 使用示例
 * const asak = require('asakjs');
 * const client = new asak(config);
 */
class asak {
    #config = {providers: {}, models: []};
    #records = [];

    /**
     * Create an asak instance
     * 创建asak实例
     * 
     * @param {Object} config - Configuration object
     * @param {Object} config.providers - AI providers configuration
     * @param {Array} config.models - AI models configuration
     * @throws {Error} If configuration is invalid
     * 
     * @example
     * const config = {
     *   providers: {
     *     'provider1': { base_url: '...', key: '...' }
     *   },
     *   models: [
     *     { provider: 'provider1', model: 'gpt-4', rate_limit: { rpm: 3, rpd: 200 } }
     *   ]
     * };
     * 
     * @example
     * // 配置示例
     * const config = {
     *   providers: {
     *     'provider1': { base_url: '...', key: '...' }
     *   },
     *   models: [
     *     { provider: 'provider1', model: 'gpt-4', rate_limit: { rpm: 3, rpd: 200 } }
     *   ]
     * };
     */
    constructor(config){
        if(this.#is_config_valid(config)){
            this.#config = config;
        } else {
            throw new Error('Err when reading config');
        };
        this.#records = [];
        try{
            for(let i = 0; i < this.#config.models.length; i++){
                this.#records.push({
                    m: [], d: [],
                    "limit_m": this.#config.models[i].rate_limit.rpm,
                    "limit_d": this.#config.models[i].rate_limit.rpd,
                });
            };
        } catch(e) {
            throw new Error('Err when initializing models');
        };
    };

    /**
     * Validate configuration object
     * 验证配置对象是否有效
     * 
     * @private
     * @param {Object} config - Configuration object to validate
     * @returns {boolean} True if config is valid
     */
    #is_config_valid(config){
        // config
        if(!config || typeof config !== 'object'){return false;};
        // config.providers
        if(!config.providers || typeof config.providers !== 'object' ||
            Object.values(config.providers).some((provider) => {
                return typeof provider !== 'object' ||
                    typeof provider.base_url !=='string' ||
                    typeof provider.key !=='string';
            })
        ){return false;};
        // config.models
        if(!Array.isArray(config.models) || config.models.length === 0){return false;};
        if(config.models.some((model) => {
            return typeof model !== 'object' ||
                typeof model.provider !=='string' ||
                typeof model.model !=='string' ||
                typeof model.rate_limit !== 'object' ||
                typeof model.rate_limit.rpm !== 'number' ||
                typeof model.rate_limit.rpd !== 'number' ||
                model.rate_limit.rpm <= 0 || model.rate_limit.rpd <= 0 ||
                model.provider in config.providers === false;
        })){return false;};
        return true;
    };

    /**
     * Validate records object
     * 验证记录对象是否有效
     * 
     * @private
     * @param {Array} records - Records to validate
     * @returns {boolean} True if records are valid
     */
    #is_record_valid(records){
        if(!Array.isArray(records) || records.length !== this.#records.length){
            return false;
        };
        for(let i = 0; i < records.length; i++){
            const record = records[i];
            if(!record || 
                !Array.isArray(record.m) || 
                !Array.isArray(record.d) ||
                record.limit_m !== this.#records[i].limit_m ||
                record.limit_d !== this.#records[i].limit_d){
                return false;
            }
        };
        return true;
    };

    /**
     * Organize and clean up records
     * 整理和清理记录
     * 
     * @private
     */
    #recorder_ognz(){
        let now = Date.now();
        let new_records = [];
        for(let i = 0; i < this.#records.length; i++){
            new_records.push({
                "m": [],
                "d": [],
                "limit_m": this.#records[i].limit_m,
                "limit_d": this.#records[i].limit_d,
            });
            for(let j = 0; j < this.#records[i].m.length; j++){
                if(now - this.#records[i].m[j] < 60000){
                    new_records[i].m.push(this.#records[i].m[j]);
                };
            };
            for(let j = 0; j < this.#records[i].d.length; j++){
                if(now - this.#records[i].d[j] < 86400000){
                    new_records[i].d.push(this.#records[i].d[j]);
                };
            };
        };
        this.#records = new_records;
    };
    /**
     * Rate limit recorder
     * 速率限制记录器
     * @namespace
     */
    recorder = {
        /**
         * Get all records
         * 获取所有记录
         * @returns {Array} Current records
         */
        get: () => {
            this.#recorder_ognz();
            return this.#records;
        },
        /**
         * Replace all records
         * 替换所有记录
         * @param {Array} records - New records to replace with
         * @throws {Error} If records format is invalid
         */
        replace: (records) => {
            if(!this.#is_record_valid(records)){
                throw new Error('Invalid records format');
            }
            this.#records = records;
            this.#recorder_ognz();
        },
        /**
         * Add records
         * 追加记录
         * @param {Array} records - Records to append
         * @returns {Array} Merged records
         * @throws {Error} If records format is invalid
         */
        add: (records) => {
            if (!this.#is_record_valid(records)) {
                throw new Error('Invalid records format');
            };
            for (let i = 0; i < records.length; i++) {
                this.#records[i].m.push(...records[i].m);
                this.#records[i].d.push(...records[i].d);
            };
            this.#recorder_ognz();
        },
        /**
         * Record model usage
         * 记录模型使用情况
         * @param {number} [index] - Model index
         * @param {Function} [find] - Filter function (i, m) => boolean
         * @throws {Error} If neither index nor find is provided
         */
        use: (index=null, find=null) => {
            if(index === null && find === null){
                throw new Error('Either index or find param is required');
            };
            if(index === null && find !== null){
                if(typeof find === 'function'){
                    let i = 0;
                    while(true){
                        if(i >= this.#records.length){
                            return;
                        };
                        if(find(i, this.#config.models[i])){
                            index = i;
                            break;
                        };
                        i++;
                    };
                } else {
                    throw new Error('`find` param is not a function');
                };
            };
            this.#records[index].m.push(Date.now());
            this.#records[index].d.push(Date.now());
            this.#recorder_ognz();
        }
    };

    /**
     * Check if model is available
     * 检查模型是否可用
     * 
     * @private
     * @param {number} i - Model index
     * @returns {boolean} True if model is available
     */
    #is_model_available(i){
        return this.#records[i].m.length < this.#records[i].limit_m && this.#records[i].d.length < this.#records[i].limit_d;
    };
    /**
     * Calculate model availability
     * 计算模型可用性
     * 
     * @private
     * @param {number} i - Model index
     * @returns {number} Availability score (0-1)
     */
    #model_availability(i){
        let m_avblty = (this.#records[i].limit_m - this.#records[i].m.length) / this.#records[i].limit_m;
        let d_avblty = (this.#records[i].limit_d - this.#records[i].d.length) / this.#records[i].limit_d;
        return Math.min(m_avblty, d_avblty);
    };
    /**
     * Get an available model
     * 获取可用模型
     * 
     * @param {string} mode - Selection mode ('index', 'available', 'random')
     * @param {Function} [filter] - Optional filter function (i, m) => boolean
     * @returns {Object} Selected model info
     * @throws {Error} If no model is available
     * 
     * @example
     * const model = client.get_model('available', (i, m) => m.tags.includes('gpt'));
     * 
     * @example
     * // 获取模型示例
     * const model = client.get_model('available', (i, m) => m.tags.includes('gpt'));
     */
    get_model(mode, filter=(i,m)=>{return true;} ){
        this.#recorder_ognz();
        let preparing_models = [];
        if(typeof filter === 'function'){
            for(let i = 0; i < this.#config.models.length; i++){
                if(filter(i,this.#config.models[i]) && this.#is_model_available(i)){
                    preparing_models.push(i);
                };
            };
        } else {
            throw new Error('Filter param is not a function');
        };
        if(preparing_models.length === 0){
            throw new Error('No model is available');
        };
        let selected_model;
        switch(mode){
            case 'index':
                selected_model = Math.min(...preparing_models);
                break;
            case 'available':
                selected_model = preparing_models.sort((a,b)=>{return this.#model_availability(b) - this.#model_availability(a);})[0];
                break;
            case 'random':
                selected_model = preparing_models[Math.floor(Math.random() * preparing_models.length)];
                break;
            default:
                throw new Error('Mode param is not valid');
        };
        this.#records[selected_model].m.push(Date.now());
        this.#records[selected_model].d.push(Date.now());
        return {
            "provider": this.#config.models[selected_model].provider,
            "base_url": this.#config.providers[this.#config.models[selected_model].provider].base_url,
            "key": this.#config.providers[this.#config.models[selected_model].provider].key,
            "model": this.#config.models[selected_model].model,
        };
    };
    /**
     * Make an API request
     * 发起API请求
     * 
     * @param {string} mode - Selection mode ('index', 'available', 'random')
     * @param {Function} [filter] - Optional filter function (i, m) => boolean
     * @param {Array} messages - Chat messages array
     * @param {boolean} [is_stream=true] - Whether to use streaming
     * @returns {Promise<Object>} API response
     * 
     * @example
     * const response = await client.request('available', null, [
     *   { role: 'user', content: 'Hello' }
     * ]);
     * 
     * @example
     * // 请求示例
     * const response = await client.request('available', null, [
     *   { role: 'user', content: '你好' }
     * ]);
     */
    async request(mode, filter, messages, is_stream=true){
        let selected_model = this.get_model(mode, filter);
        let openai_cilent = new OpenAI({
            baseURL: selected_model.base_url,
            apiKey: selected_model.key,
            dangerouslyAllowBrowser: true
        });
        let result = await openai_cilent.chat.completions.create({
            model: selected_model.model,
            stream: is_stream,
            messages: messages,
        });
        if(is_stream){
            let deltaGenerator = async function*() {
                for await (const chunk of result) {
                    const content = chunk.choices?.[0]?.delta?.content;
                    if (content !== undefined) {
                        yield content;
                    };
                };
            };
            return {
                provider: selected_model.provider,
                base_url: selected_model.base_url,
                key: selected_model.key,
                model: selected_model.model,
                delta: {
                    [Symbol.asyncIterator]: deltaGenerator
                },
                original: result
            };
        } else {
            return {
                provider: selected_model.provider,
                base_url: selected_model.base_url,
                key: selected_model.key,
                model: selected_model.model,
                message: result.choices[0].message,
                original: result
            };
        };
    };
};

module.exports = asak;
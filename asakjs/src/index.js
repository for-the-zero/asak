const { OpenAI } = require("openai");
const { use } = require("react");

class asak {
    #config = {providers: {}, models: []};
    #records = [];

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
    recorder = {
        get: () => {
            this.#recorder_ognz();
            return this.#records;
        },
        replace: (records) => {
            if(!this.#is_record_valid(records)){
                throw new Error('Invalid records format');
            }
            this.#records = records;
            this.#recorder_ognz();
        },
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

    #is_model_available(i){
        return this.#records[i].m.length < this.#records[i].limit_m && this.#records[i].d.length < this.#records[i].limit_d;
    };
    #model_availability(i){
        let m_avblty = (this.#records[i].limit_m - this.#records[i].m.length) / this.#records[i].limit_m;
        let d_avblty = (this.#records[i].limit_d - this.#records[i].d.length) / this.#records[i].limit_d;
        return Math.min(m_avblty, d_avblty);
    };
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
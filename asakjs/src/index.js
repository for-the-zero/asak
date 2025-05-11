const { Configuration, OpenAIApi } = require("openai");

export class asak {
    #config = {providers: {}, models: []};
    #records = [];

    constructor(config){
        if(
            config &&
            config.providers &&
            typeof config.providers === 'object' &&
            Object.keys(config.providers).length > 0 &&
            config.models &&
            Array.isArray(config.models) &&
            config.models.length > 0
        ){
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
            if(Array.isArray(records) && records.length === this.#records.length){
                this.#records = records;
            } else {
                throw new Error('The length your records is not equal to the length of the models or it\'s not an array');
            };
            this.#recorder_ognz();
        },
        add: (records) => {
            if(Array.isArray(records) && records.length === this.#records.length){
                let new_records = JSON.parse(JSON.stringify(this.#records));
                for(let i = 0; i < records.length; i++){
                    if(
                        Array.isArray(records[i].m) &&
                        Array.isArray(records[i].d) &&
                        this.#records[i].limit_m === records[i].limit_m &&
                        this.#records[i].limit_d === records[i].limit_d
                    ){
                        new_records[i].m.push(...records[i].m);
                        new_records[i].d.push(...records[i].d);
                    } else {
                        throw new Error('The format of your records is not correct or rpm/rpd is not equal to the models');
                    };
                };
                this.#records = new_records;
                this.#recorder_ognz();
            } else {
                throw new Error('The length your records is not equal to the length of the models or it\'s not an array');
            };
        },
    };

    #is_model_avaliable(i){
        if(this.#records[i].m.length < this.#records[i].limit_m && this.#records[i].d.length < this.#records[i].limit_d){
            return true;
        } else {return false;};
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
                if(filter(i,this.#config.models[i]) && this.#is_model_avaliable(i)){
                    preparing_models.push(i);
                };
            };
        } else {
            throw new Error('Filter param is not a function');
        };
        if(preparing_models.length === 0){
            throw new Error('No model is avaliable');
        };
        let selected_model;
        switch(mode){
            case 'index':
                selected_model = Math.min(...preparing_models);
                break;
            case 'avaliable':
                selected_model = preparing_models.sort((a,b)=>{return this.#model_availability(b) - this.#model_availability(a);})[0];
                break;
            case 'random':
                selected_model = preparing_models[Math.floor(Math.random() * preparing_models.length)];
                break;
            default:
                throw new Error('Mode param is not valid');
        };
        return {
            "provider": this.#config.models[selected_model].provider,
            "base_url": this.#config.providers[this.#config.models[selected_model].provider].base_url,
            "key": this.#config.providers[this.#config.models[selected_model].provider].key,
            "model": this.#config.models[selected_model].model,
        };
    };
    async request(mode, filter, messages){
        let selected_model = this.get_model(mode, filter);
        let openai_api = new OpenAIApi(new Configuration({
            apiKey: selected_model.key,
            baseURL: selected_model.base_url,
        }));
        const stream = await openai_api.createChatCompletion({
            model: selected_model.model,
            messages: messages,
            stream: true
        });
        async function* deltaGenerator() {
            for await (const chunk of stream) {
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
                [Symbol.asyncIterator]: () => deltaGenerator()[Symbol.asyncIterator]()
            }
        };
    };
};
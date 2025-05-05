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
                        if(records[i].m.length > 0 && records[i].d.length > 0){
                            new_records[i].m.push(...records[i].m);
                            new_records[i].d.push(...records[i].d);
                        };
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
        this.#recorder_ognz();
        if(this.#records[i].m.length < this.#records[i].limit_m && this.#records[i].d.length < this.#records[i].limit_d){
            let spare_m = (this.#records[i].limit_m - this.#records[i].m.length) / this.#records[i].limit_m;
            let spare_d = (this.#records[i].limit_d - this.#records[i].d.length) / this.#records[i].limit_d;
            return {usable: true, spare: Math.min(spare_m, spare_d)};
        } else {
            return {usable: false, spare: null};
        };
    };
    get_model(mode, filter=(i,m)=>{return true;} ){
        let preparing_models = [];
        if(typeof filter === 'function'){
            for(let i = 0; i < this.#config.models.length; i++){
                if(filter(i,this.#config.models[i] && this.#is_model_avaliable(i).usable)){
                    preparing_models.push(i);
                };
            };
        } else {
            throw new Error('Filter param is not a function');
        };
        let selected_model;
        switch(mode){
            case 'index':
                selected_model = Math.min(...preparing_models);
                break;
            case 'avaliable':
                //TODO:
                break;
            case 'random':
                selected_model = preparing_models[Math.floor(Math.random() * preparing_models.length)];
                break;
            default:
                throw new Error('Mode param is not valid');
        };
    };
    request(mode, filter, messages){
        //TODO:
    };
};
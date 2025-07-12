import time
import random
import openai

class asak:
	def __init__(self, config):
		self.__config = {'providers': {}, 'models': []}
		self.__records = []
		if not self.__is_config_valid(config):
			raise ValueError("Err when reading config")
		self.__config = config
		
		try:
			for i in range(len(self.__config["models"])):
				self.__records.append({
					'm': [], 'd': [],
					'limit_m': self.__config["models"][i]["rate_limit"]["rpm"],
					'limit_d': self.__config["models"][i]["rate_limit"]["rpd"]
				})
		except Exception as e:
			raise ValueError(f"Err when initializing models: {e}")

		self.recorder = type('', (), {
			'get': lambda *_: self.__recorder_get(),
			'replace': lambda _, records: self.__recorder_replace(records),
			'add': lambda _, records: self.__recorder_add(records),
			'use': lambda _, index=None, find=None: self.__recorder_use(index, find)
		})()

	def __is_config_valid(self, config):
		if not config or not isinstance(config, dict):
			return False
		if not isinstance(config.get("providers"), dict):
			return False
		for provider in config["providers"].values():
			if (not isinstance(provider, dict) or
				not isinstance(provider.get("base_url"), str) or
				not isinstance(provider.get("key"), str)):
				return False
		if not isinstance(config.get("models"), list) or not config["models"]:
			return False
		for model in config["models"]:
			if (not isinstance(model, dict) or
				not isinstance(model.get("provider"), str) or
				not isinstance(model.get("model"), str) or
				not isinstance(model.get("rate_limit"), dict) or
				not isinstance(model["rate_limit"].get("rpm"), int) or
				not isinstance(model["rate_limit"].get("rpd"), int) or
				model["rate_limit"]["rpm"] <= 0 or
				model["rate_limit"]["rpd"] <= 0 or
				model["provider"] not in config["providers"]):
				return False
		return True

	def __recorder_ognz(self):
		now = int(time.time() * 1000)
		new_records = []
		for i in range(len(self.__records)):
			new_records.append({
				'm': [ts for ts in self.__records[i]["m"] if now - ts < 60000],
				'd': [ts for ts in self.__records[i]["d"] if now - ts < 86400000],
				'limit_m': self.__records[i]["limit_m"],
				'limit_d': self.__records[i]["limit_d"]
			})
		self.__records = new_records

	def __recorder_get(self):
		self.__recorder_ognz()
		return self.__records

	def __is_record_valid(self, records):
		if not isinstance(records, list) or len(records) != len(self.__records):
			return False
		for i in range(len(records)):
			record = records[i]
			if (not isinstance(record, dict) or
				not isinstance(record.get('m'), list) or
				not isinstance(record.get('d'), list) or
				record.get('limit_m') != self.__records[i]['limit_m'] or
				record.get('limit_d') != self.__records[i]['limit_d']):
				return False
		return True

	def __recorder_replace(self, records):
		if not self.__is_record_valid(records):
			raise ValueError('Invalid records format')
		self.__records = records
		self.__recorder_ognz()

	def __recorder_add(self, records):
		if not self.__is_record_valid(records):
			raise ValueError('Invalid records format')
		for i in range(len(records)):
			self.__records[i]['m'].extend(records[i]['m'])
			self.__records[i]['d'].extend(records[i]['d'])
		self.__recorder_ognz()

	def __recorder_use(self, index=None, find=None):
		if index is None and find is None:
			raise ValueError('Either index or find param is required')
		if index is None and find is not None:
			if callable(find):
				found_index = -1
				for i in range(len(self.__config["models"])):
					if find(i, self.__config["models"][i]):
						found_index = i
						break
				if found_index == -1:
					return
				index = found_index
			else:
				raise ValueError('`find` param is not a function')
		
		now = int(time.time() * 1000)
		self.__records[index]['m'].append(now)
		self.__records[index]['d'].append(now)
		self.__recorder_ognz()

	def __is_model_available(self, i):
		return (len(self.__records[i]['m']) < self.__records[i]['limit_m'] and
				len(self.__records[i]['d']) < self.__records[i]['limit_d'])

	def __model_availability(self, i):
		m_avblty = (self.__records[i]['limit_m'] - len(self.__records[i]['m'])) / self.__records[i]['limit_m']
		d_avblty = (self.__records[i]['limit_d'] - len(self.__records[i]['d'])) / self.__records[i]['limit_d']
		return min(m_avblty, d_avblty)

	def get_model(self, mode, filter=lambda i, m: True):
		self.__recorder_ognz()
		preparing_models = []
		if callable(filter):
			for i in range(len(self.__config["models"])):
				if filter(i, self.__config["models"][i]) and self.__is_model_available(i):
					preparing_models.append(i)
		else:
			raise ValueError('Filter param is not a function')
		if not preparing_models:
			raise ValueError('No model is available')

		selected_model_index = 0
		if mode == 'index':
			selected_model_index = min(preparing_models)
		elif mode == 'available':
			preparing_models.sort(key=lambda x: self.__model_availability(x), reverse=True)
			selected_model_index = preparing_models[0]
		elif mode == 'random':
			selected_model_index = random.choice(preparing_models)
		else:
			raise ValueError('Mode param is not valid')

		now = int(time.time() * 1000)
		self.__records[selected_model_index]['m'].append(now)
		self.__records[selected_model_index]['d'].append(now)
		
		model_config = self.__config["models"][selected_model_index]
		provider_config = self.__config["providers"][model_config["provider"]]
		
		return {
			"provider": model_config["provider"],
			"base_url": provider_config["base_url"],
			"key": provider_config["key"],
			"model": model_config["model"]
		}

	async def request(self, mode, filter, messages, is_stream=True):
		selected_model = self.get_model(mode, filter)
		client = openai.AsyncOpenAI(
			base_url=selected_model["base_url"],
			api_key=selected_model["key"]
		)
		
		result = await client.chat.completions.create(
			model=selected_model["model"],
			messages=messages,
			stream=is_stream
		)

		if is_stream:
			async def delta_generator():
				async for chunk in result:
					content = chunk.choices[0].delta.content
					if content is not None:
						yield content
			
			return {
				"provider": selected_model["provider"],
				"base_url": selected_model["base_url"],
				"key": selected_model["key"],
				"model": selected_model["model"],
				"delta": delta_generator(),
				"original": result
			}
		else:
			return {
				"provider": selected_model["provider"],
				"base_url": selected_model["base_url"],
				"key": selected_model["key"],
				"model": selected_model["model"],
				"message": result.choices[0].message,
				"original": result
			}

__all__ = ['asak']
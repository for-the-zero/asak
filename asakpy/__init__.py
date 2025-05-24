import time
import copy
import random
import openai

class asak:
	def __init__(self, config):
		self.__config = {'providers': {}, 'models': []}
		self.__records = []
		if(
			config and
			isinstance(config.get("providers"), dict) and
			len(config['providers']) > 0 and
			isinstance(config.get("models"), list) and
			len(config['models']) > 0
		):
			self.__config = config
		else:
			raise ValueError("Err when reading config")
		for i in range(len(self.__config["models"])):
			self.__records.append({
				'm': [], 'd': [],
				'limit_m': self.__config["models"][i]["rate_limit"]["rpm"],
				'limit_d': self.__config["models"][i]["rate_limit"]["rpd"]
			})
		
		self.recorder = type('', (), {
			'get': lambda *_: self.__recorder_get(),
			'replace': lambda _, records: self.__recorder_replace(records),
			'add': lambda _, records: self.__recorder_add(records)
		})()
		
	def __recorder_ognz(self):
		now = int(time.time() * 1000)
		new_records = []
		for i in range(len(self.__records)):
			new_records.append({
				'm': [], 'd': [],
				'limit_m': self.__records[i]["limit_m"],
				'limit_d': self.__records[i]["limit_d"]
			})
			for j in range(len(self.__records[i]["m"])):
				if now - self.__records[i]["m"][j] < 60000:
					new_records[i]["m"].append(self.__records[i]["m"][j])
			for j in range(len(self.__records[i]["d"])):
				if now - self.__records[i]["d"][j] < 86400000:
					new_records[i]["d"].append(self.__records[i]["d"][j])
		self.__records = new_records
	def __recorder_get(self):
		self.__recorder_ognz()
		return self.__records
	def __recorder_replace(self, records):
		if isinstance(records, list) and len(records) == len(self.__records):
			self.__records = records
		else:
			raise ValueError('The length your records is not equal to the length of the models or it\'s not an array')
		self.__recorder_ognz()
	def __recorder_add(self, records):
		if isinstance(records, list) and len(records) == len(self.__records):
			new_records = copy.deepcopy(self.__records)
			for i in range(len(records)):
				if (
					isinstance(records[i].get('m'), list) and
					isinstance(records[i].get('d'), list) and
					self.__records[i]['limit_m'] == records[i]['limit_m'] and
					self.__records[i]['limit_d'] == records[i]['limit_d']
				):
					new_records[i]['m'].extend(records[i]['m'])
					new_records[i]['d'].extend(records[i]['d'])
				else:
					raise ValueError('The format of your records is not correct or rpm/rpd is not equal to the models')
			self.__records = new_records
			self.__recorder_ognz()
		else:
			raise ValueError('The length your records is not equal to the length of the models or it\'s not an array')
	
	def __is_model_available(self, i):
		if (len(self.__records[i]['m']) < self.__records[i]['limit_m'] and 
			len(self.__records[i]['d']) < self.__records[i]['limit_d']):
			return True
		return False
	def __model_availability(self, i):
		m_avblty = (self.__records[i]['limit_m'] - len(self.__records[i]['m'])) / self.__records[i]['limit_m']
		d_avblty = (self.__records[i]['limit_d'] - len(self.__records[i]['d'])) / self.__records[i]['limit_d']
		return min(m_avblty, d_avblty)
	def get_model(self, mode, filter=lambda i,m: True):
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
		selected_model = 0
		if mode == 'index':
			selected_model = min(preparing_models)
		elif mode == 'available':
			preparing_models.sort(key=lambda x: self.__model_availability(x), reverse=True)
			selected_model = preparing_models[0]
		elif mode == 'random':
			selected_model = random.choice(preparing_models)
		else:
			raise ValueError('Mode param is not valid')
		now = int(time.time() * 1000)
		self.__records[selected_model]['m'].append(now)
		self.__records[selected_model]['d'].append(now)
		return {
			"provider": self.__config["models"][selected_model]["provider"],
			"base_url": self.__config["providers"][self.__config["models"][selected_model]["provider"]]["base_url"],
			"key": self.__config["providers"][self.__config["models"][selected_model]["provider"]]["key"],
			"model": self.__config["models"][selected_model]["model"]
		}
	
	async def request(self, mode, filter, messages):
		selected_model = self.get_model(mode, filter)
		client = openai.AsyncOpenAI(
			base_url=selected_model["base_url"],
			api_key=selected_model["key"]
		)
		async def delta_generator():
			stream = await client.chat.completions.create(
				model=selected_model["model"],
				messages=messages,
				stream=True
			)
			async for chunk in stream:
				content = chunk.choices[0].delta.content
				if content is not None:
					yield content
		
		return {
			"provider": selected_model["provider"],
			"base_url": selected_model["base_url"],
			"key": selected_model["key"],
			"model": selected_model["model"],
			"delta": delta_generator()
		}

__all__ = ['asak']

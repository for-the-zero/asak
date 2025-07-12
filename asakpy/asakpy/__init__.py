import time
import random
import openai

"""
Asak AI model management class
管理AI模型请求的类

Example:
    >>> from asakpy import asak
    >>> config = {
    ...     'providers': {'provider1': {'base_url': '...', 'key': '...'}},
    ...     'models': [{'provider': 'provider1', 'model': 'gpt-4', 'rate_limit': {'rpm': 3, 'rpd': 200}}]
    ... }
    >>> client = asak(config)

Example:
    >>> from asakpy import asak
    >>> config = {
    ...     'providers': {'provider1': {'base_url': '...', 'key': '...'}},
    ...     'models': [{'provider': 'provider1', 'model': 'gpt-4', 'rate_limit': {'rpm': 3, 'rpd': 200}}]
    ... }
    >>> client = asak(config)
"""

class asak:
	def __init__(self, config):
		"""
		Create an asak instance
		创建asak实例

		Args:
			config (dict): Configuration dictionary
			config.providers (dict): AI providers configuration
			config.models (list): AI models configuration

		Raises:
			ValueError: If configuration is invalid

		Example:
			>>> config = {
			...     'providers': {'provider1': {'base_url': '...', 'key': '...'}},
			...     'models': [{'provider': 'provider1', 'model': 'gpt-4', 'rate_limit': {'rpm': 3, 'rpd': 200}}]
			... }
			>>> client = asak(config)

		Example:
			>>> config = {
			...     'providers': {'provider1': {'base_url': '...', 'key': '...'}},
			...     'models': [{'provider': 'provider1', 'model': 'gpt-4', 'rate_limit': {'rpm': 3, 'rpd': 200}}]
			... }
			>>> client = asak(config)
		"""
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
		"""
		Validate configuration object
		验证配置对象是否有效

		Args:
			config (dict): Configuration dictionary to validate

		Returns:
			bool: True if config is valid
		"""
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
		"""
		Organize and clean up records
		整理和清理记录
		"""
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
		"""
		Get all records
		获取所有记录

		Returns:
			list: Current records
		"""
		self.__recorder_ognz()
		return self.__records

	def __is_record_valid(self, records):
		"""
		Validate records object
		验证记录对象是否有效

		Args:
			records (list): Records to validate

		Returns:
			bool: True if records are valid
		"""
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
		"""
		Replace all records
		替换所有记录

		Args:
			records (list): New records to replace with

		Raises:
			ValueError: If records format is invalid
		"""
		if not self.__is_record_valid(records):
			raise ValueError('Invalid records format')
		self.__records = records
		self.__recorder_ognz()

	def __recorder_add(self, records):
		"""
		Add records
		追加记录

		Args:
			records (list): Records to append

		Returns:
			list: Merged records

		Raises:
			ValueError: If records format is invalid
		"""
		if not self.__is_record_valid(records):
			raise ValueError('Invalid records format')
		for i in range(len(records)):
			self.__records[i]['m'].extend(records[i]['m'])
			self.__records[i]['d'].extend(records[i]['d'])
		self.__recorder_ognz()

	def __recorder_use(self, index=None, find=None):
		"""
		Record model usage
		记录模型使用情况

		Args:
			index (int, optional): Model index
			find (function, optional): Filter function (i, m) -> bool

		Raises:
			ValueError: If neither index nor find is provided
		"""
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
		"""
		Check if model is available
		检查模型是否可用

		Args:
			i (int): Model index

		Returns:
			bool: True if model is available
		"""
		return (len(self.__records[i]['m']) < self.__records[i]['limit_m'] and
				len(self.__records[i]['d']) < self.__records[i]['limit_d'])

	def __model_availability(self, i):
		"""
		Calculate model availability
		计算模型可用性

		Args:
			i (int): Model index

		Returns:
			float: Availability score (0-1)
		"""
		m_avblty = (self.__records[i]['limit_m'] - len(self.__records[i]['m'])) / self.__records[i]['limit_m']
		d_avblty = (self.__records[i]['limit_d'] - len(self.__records[i]['d'])) / self.__records[i]['limit_d']
		return min(m_avblty, d_avblty)

	def get_model(self, mode, filter=lambda i, m: True):
		"""
		Get an available model
		获取可用模型

		Args:
			mode (str): Selection mode ('index', 'available', 'random')
			filter (function, optional): Optional filter function (i, m) -> bool

		Returns:
			dict: Selected model info

		Raises:
			ValueError: If no model is available

		Example:
			>>> model = client.get_model('available', lambda i, m: 'gpt' in m.get('tags', []))

		Example:
			>>> model = client.get_model('available', lambda i, m: 'gpt' in m.get('tags', []))
		"""
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
		"""
		Make an API request
		发起API请求

		Args:
			mode (str): Selection mode ('index', 'available', 'random')
			filter (function): Optional filter function (i, m) -> bool
			messages (list): Chat messages list
			is_stream (bool, optional): Whether to use streaming. Defaults to True.

		Returns:
			dict: API response

		Example:
			>>> response = await client.request('available', None, [
			...     {'role': 'user', 'content': 'Hello'}
			... ])

		Example:
			>>> response = await client.request('available', None, [
			...     {'role': 'user', 'content': '你好'}
			... ])
		"""
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
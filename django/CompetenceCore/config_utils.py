# config_utils.py
from decouple import config

class ConfigCache:
    _cache = {}

    @staticmethod
    def get(key, default=None):
        if key not in ConfigCache._cache:
            ConfigCache._cache[key] = config(key, default=default)
        return ConfigCache._cache[key]

# Example usage
PROFID_DEFAULT = ConfigCache.get('PROFID_DEFAULT', 'default_id')
ANNEE_DEFAULT = ConfigCache.get('ANNEE_DEFAULT', '2024-2025')

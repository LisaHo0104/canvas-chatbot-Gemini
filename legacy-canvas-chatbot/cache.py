import os
import json
import time
from functools import wraps

CACHE_DIR = 'cache'
CACHE_DURATION = 3600  # 1 hour

if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

def get_cache_path(key):
    return os.path.join(CACHE_DIR, f'{key}.json')

def is_cache_valid(filepath):
    if not os.path.exists(filepath):
        return False
    
    mod_time = os.path.getmtime(filepath)
    return (time.time() - mod_time) < CACHE_DURATION

def get_cached_data(key):
    filepath = get_cache_path(key)
    if is_cache_valid(filepath):
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError):
            return None
    return None

def cache_data(key, data):
    filepath = get_cache_path(key)
    try:
        with open(filepath, 'w') as f:
            json.dump(data, f)
    except IOError:
        pass

def cached(key_prefix):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create a unique key for the function call
            # This is a simple example; more complex key generation might be needed
            # based on function arguments.
            user_id = kwargs.get('user_id', 'global')
            key = f"{key_prefix}_{user_id}"
            
            # For functions that take course_id
            if 'course_id' in kwargs:
                key += f"_course_{kwargs['course_id']}"

            cached_result = get_cached_data(key)
            if cached_result:
                print(f"CACHE HIT: for key {key}")
                return cached_result

            print(f"CACHE MISS: for key {key}")
            result = func(*args, **kwargs)
            
            if result:
                cache_data(key, result)
            
            return result
        return wrapper
    return decorator

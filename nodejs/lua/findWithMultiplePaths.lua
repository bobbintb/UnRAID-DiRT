local cursor = '0'
local pattern = ARGV[1]
local all_keys = {}

repeat
  local scan_results = redis.call('SCAN', cursor, 'MATCH', pattern)
  cursor = scan_results[1]
  local keys = scan_results[2]
  for i, key in ipairs(keys) do
    if redis.call('TYPE', key).ok == 'hash' then
      local path_str = redis.call('HGET', key, 'path')
      -- redis-om stores string arrays as a single string delimited by '|'
      if path_str and string.find(path_str, '|') then
        table.insert(all_keys, key)
      end
    end
  end
until cursor == '0'

return all_keys
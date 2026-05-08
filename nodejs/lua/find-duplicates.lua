-- find-duplicates.lua
--
-- Scans for file entities and groups them by hash to find duplicates.
-- Returns a table where each key is a hash and each value is a table of
-- Redis keys ('ino:...') belonging to that hash group.
-- Only includes groups with 2 or more members.

local keys = redis.call('KEYS', 'ino:*')
local hashes = {}

for _, key in ipairs(keys) do
  -- Ensure the key is a hash type and has a 'hash' field before processing
  if redis.call('TYPE', key).ok == 'hash' then
    local hash_val = redis.call('HGET', key, 'hash')
    if hash_val then
      if hashes[hash_val] == nil then
        hashes[hash_val] = {}
      end
      table.insert(hashes[hash_val], key)
    end
  end
end

local result = {}
for hash, members in pairs(hashes) do
  if #members > 1 then
    result[hash] = members
  end
end

-- cjson is not available in all Redis environments, so return a flat array
-- of [hash, key1, key2, ..., '---', hash2, keyA, keyB, ...]
-- The '---' is a separator to make parsing easier on the client side.
local flat_result = {}
for hash, members in pairs(result) do
  table.insert(flat_result, hash)
  for _, member_key in ipairs(members) do
    table.insert(flat_result, member_key)
  end
  table.insert(flat_result, '---') -- Separator
end

-- Remove the last separator if the table is not empty
if #flat_result > 0 then
  table.remove(flat_result)
end

return flat_result

// With this adapter, calling `db.write()` will do nothing.
// One use case for this adapter can be for tests.
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const adapter = new JSONFile('file.json')
const db = new Low(adapter)
await db.read()
console.log(db.data)
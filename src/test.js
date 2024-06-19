import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const db = await new Low(await new JSONFile('files.json'), {})
await db.read()
console.log(db.data);
import fs from 'fs';
import blake3 from 'blake3';
import {createClient, SchemaFieldTypes} from 'redis';

const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

const indexList = await redis.ft._list();
console.log(indexList)
if (!indexList.includes('idx:files')) {


    await redis.ft.create('idx:files', {
        size: {
            type: SchemaFieldTypes.NUMERIC,
            SORTABLE: true
        }
    }, {
        ON: 'HASH'
    });
}
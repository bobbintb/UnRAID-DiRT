import {AggregateGroupByReducers, AggregateSteps, createClient} from "redis";

const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();


const result = await redis.ft.aggregate('idx:files', '*', {
    LOAD: ['@hash'],
    STEPS: [
        {
            type: AggregateSteps.FILTER,
            expression: 'exists(@hash)'
        },
        {
            type: AggregateSteps.GROUPBY,
            properties: ['@hash'],
            REDUCE: [
                {
                    type: AggregateGroupByReducers.COUNT,
                    property: '@hash',
                    AS: 'nb_of_files'
                }
            ]
        },
        {
            type: AggregateSteps.SORTBY,
            BY: {
                BY: '@nb_of_files',
                DIRECTION: 'DESC'
            }
        },
        {
            type: AggregateSteps.FILTER,
            expression: '@nb_of_files > 1'
        },
        {
            type: AggregateSteps.LIMIT,
            from: 0,
            size: 10000
        }
    ]
});
//ft.aggregate idx:files '*' LOAD 1 @hash FILTER 'exists(@hash)' groupby 1 @hash reduce count 0 as nb_of_hashes FILTER '@nb_of_hashes > 1' limit 0 10000

const hashes = result.results.map(group => group.hash); // Collect all the 'size' values
console.log('hashes')
console.log(hashes)

const resultsArray = await Promise.all(
    hashes.map(hash =>
        redis.ft.search('idx:files', `@hash:${hash}`)
            .then(result => ({
                hash,
                documents: result.documents.map(doc => ({
                    id: doc.id,
                    ...doc.value // Spread the value object to include its properties directly
                }))
            }))
    )
);

console.log('resultsArray')
console.log(resultsArray)

const groupedResults = resultsArray.reduce((acc, {hash, documents}) => {
    acc[hash] = documents; // Group documents by hash
    return acc;
}, {});

console.log(groupedResults);




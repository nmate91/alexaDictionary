//this is for testing...

require('request');
const request = require('request-promise');

const app_key = 'f1127995c4059c40b1461b9a1919406b';
const app_id = 'f0a564c4';
const oxfordURL = 'https://od-api.oxforddictionaries.com:443/api/v1/';
const header = {
    Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    app_id: app_id,
    app_key: app_key,
};

const source_lang = 'en';
const word_id = 'test';

const docs = request({
    method: 'GET',
    uri: oxfordURL + `entries/${source_lang}/${word_id}:`,
    json: true,
    headers: header,
});

docs
    .then(async function(dictionary) {
        let definition = dictionary.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0]
            .filter(x => x.definition && x.lemma)
            .map(x => {
                return {
                    lemma: x.lemma,
                    definition: x.definition
                }
            });
        console.log(`Definition is: ${definition}`);
    })
    .catch(function(err) {
        console.error(
            'Unable to read item. Error JSON:',
            JSON.stringify(err, null, 2)
        );
        return console.log(JSON.stringify(err));
    });

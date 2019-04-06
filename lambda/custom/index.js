/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

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

const getDefinitionFromDb = word => {
    return new Promise((resolve, reject) => {
        console.log(`Searching in db for ${word}`);
        const params = {
            TableName: 'Dictionary',
            Key: {
                'lemma': word
            },
        };
        docClient.get(params, (err, result) => {
            if(err) reject(err);
            if(!result.hasOwnProperty('Item')) {
                console.log(`${word} not found in db.`);
                resolve(null);
            }
            else {
                console.log(`${word} found in db.`);
                console.log(result);
                resolve(result.Item.definition);
            }
        })
    })
};

//add one item to db, must have an id
const addOne = item => {
    return new Promise((resolve, reject) => {
        console.log(item);
        //params must have a TableName and an Item key
        const params = {
            TableName: 'Dictionary',
            Item: item,
        };
        docClient.put(params, (err, data) => {
            if (err) {
                console.log('Unable to insert =>', JSON.stringify(err));
                return reject('Unable to insert');
            }
            console.log('Saved Data, ', JSON.stringify(data));
            //in case of success, just resolve
            resolve(data);
        });
    });
};

const get = (word) => {
    return new Promise((resolve, reject) => {
        word = word.toLowerCase();
        const docs = request({
            method: 'GET',
            uri: oxfordURL + `entries/${source_lang}/${word}:`,
            json: true,
            headers: header,
        });

        docs
            .then(async function(dictionary) {
                let definition = dictionary.results[0].lexicalEntries[0].entries[0].senses[0].definitions[0];
                console.log(`Definition is: ${definition}`);
                resolve(definition);
            })
            .catch(function(err) {
                console.error(
                    'Unable to read item. Error JSON:',
                    JSON.stringify(err)
                );
                reject(err);
            });
    });
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        //say something after everything is succeeded
        const speechText =
            'Hello friend. I am Alexa, ask me an unknown word and I explain you the meaning of it. You can ask it by saying: What does something mean?';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    },
};

const WordFinderIntentHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name ===
                'WordFinderIntent'
        );
    },
    async handle(handlerInput) {
        const keyword = handlerInput.requestEnvelope.request.intent.slots.Word.value;
        let definition = await getDefinitionFromDb(keyword);
        console.log(definition);
        if(!definition) {
            definition = await get(keyword);
            console.log(definition);
            await addOne({
                lemma: keyword,
                definition: definition
            });
        }
        console.log(`Definition: ${definition}`);
        return (
            handlerInput.responseBuilder
                .speak(definition)
                .reprompt('Next?')
                .getResponse()
        );
    },
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name ===
                'AMAZON.HelpIntent'
        );
    },
    handle(handlerInput) {
        const speechText = 'You can say hello to me!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    },
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            (handlerInput.requestEnvelope.request.intent.name ===
                'AMAZON.CancelIntent' ||
                handlerInput.requestEnvelope.request.intent.name ===
                    'AMAZON.StopIntent')
        );
    },
    handle(handlerInput) {
        const speechText = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hello World', speechText)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'SessionEndedRequest'
        );
    },
    handle(handlerInput) {
        console.log(
            `Session ended with reason: ${
                handlerInput.requestEnvelope.request.reason
            }`
        );

        return handlerInput.responseBuilder.getResponse();
    },
};

const NotFoundWordHandler = {
    canHandle() {
        return true;
    },
    async handle(handlerInput, error) {
        const keyword = handlerInput.requestEnvelope.request.intent.slots.Word.value;
        let definition = await getDefinitionFromDb(keyword);
        console.log(definition);
        if(!definition) {
            definition = await get(keyword);
            console.log(definition);
            await addOne({
                lemma: keyword,
                definition: definition
            });
        }
        console.log(`Intent name: ${definition}`);
        return (
            handlerInput.responseBuilder
                .speak(definition || 'Cannot find result.')
                .reprompt('Next word')
                .getResponse()
        );
    },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        WordFinderIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(NotFoundWordHandler)
    .lambda();

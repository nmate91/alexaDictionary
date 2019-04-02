/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
const Dictionary = require('oxford-dictionary-api');

require('request');
const request = require('request-promise');

const app_key = 'e924ba24525f6c231fbfeba62ce965ca';
const app_id = 'b0691462';
const oxfordURL = 'https://oed-api.oxforddictionaries.com/oed/api/v0.1/words/';
const header = {
    Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    app_id: app_id,
    app_key: app_key,
};

const addAll = items => {
    return Promise.all(
        items
            //get the first 20, dynamodb has its limits
            .slice(0, 20)
            //filter data, to make sure it has id
            .filter(item => item.hasOwnProperty('i  '))
            //maps promises into one array, which going to be resolved in one time
            .map(item => {
                //add each item, and return a promise
                return addOne(item);
            })
    );
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

const get = () => {
    return new Promise((resolve, reject) => {
        // const params = {
        //     TableName: 'Dictionary',
        // };
        // docClient.query(params, (err, data) => {
        //     if (err) {
        //         console.error(
        //             'Unable to read item. Error JSON:',
        //             JSON.stringify(err, null, 2)
        //         );
        //         return reject(JSON.stringify(err, null, 2));
        //     }
        //     console.log('GetItem succeeded:', JSON.stringify(data, null, 2));
        //     resolve(data.Items);
        // });
        const dict = new Dictionary(app_id, app_key);
        dict.find('ace', function(err, data) {
            if (err) {
                console.error(
                    'Unable to read item. Error JSON:',
                    JSON.stringify(err, null, 2)
                );
                return reject(JSON.stringify(err, null, 2));
            }
            console.log('GetItem succeeded:', JSON.stringify(data, null, 2));
            resolve(data.results);
        });
    });
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        //get the oxford api data
        const docs = request({
            method: 'GET',
            uri: oxfordURL,
            port: 443,
            json: true,
            headers: header,
        });

        await docs
            .then(async function(dictionary) {
                console.log('adding one');
                //we only need the data array
                return await addAll(dictionary.data);
            })
            .catch(function(err) {
                console.log(err);
            });

        //say something after everything is succeeded
        const speechText =
            'Hello friend. I am Alexa, ask me an unknown word and I explain you the meaning of it.';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    },
};

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name ===
                'HelloWorldIntent'
        );
    },
    async handle(handlerInput) {
        const speechText = 'Not implemented yet'; //await get();
        //console.log('success');
        return (
            handlerInput.responseBuilder
                .speak(speechText)
                //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
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

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak("Sorry, I can't understand the command. Please say again.")
            .reprompt(
                "Sorry, I can't understand the command. Please say again."
            )
            .getResponse();
    },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();

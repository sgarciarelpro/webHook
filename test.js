'use strict';

var _ = require("underscore");
// USED FOR COMPANY SAVE TO LIST

//var mysql = require('mysql');
var config = require("config/env-config.js").config;

// Require Logic
var lib = require('lib');
var createErrorMsg = lib.createErrorMsg;
var PromiseRequest = lib.PromiseRequest;
var hgDataSourceId = lib.hgDataSourceId;
var buildTechSearchQuery = lib.buildTechSearchQuery;

console.log(JSON.stringify(buildTechSearchQuery));

module.exports.handler = function (event, context, cb) {
    console.log('EVENT = ', event);
    var stage = event.stageVariables.functionAlias;
    console.log('STAGE = ', stage);
    var host = config[stage].relProHost;
    console.log("NEW HOST = ", host);
    var basePath = config[stage].relProBasePath;
    if (basePath == '/') basePath = '';


    console.log('1');
    var userToken = event.headers.userToken;
    if (userToken != undefined && userToken != null && userToken != "") {
        console.log('2');
        var dataCategoryOptions = {
            host: host,
            port: 443,
            path: basePath + '/prospector/v1/contract/techSearch/data',
            method: 'GET',
            headers: {'userToken': event.headers.userToken},
            logResponse: false
        };
        var getRevealsRequest = PromiseRequest(dataCategoryOptions, null)
            .then(function (values) {
                console.log('3a');
                console.log(JSON.stringify(values));
                if (values.body.error == undefined) {
                    console.log('4a');
                    var eventBody = JSON.parse(event.body);
                    eventBody.pageSize = eventBody.maxResults;

                    var geoEndpoints = "";
                    var maxDistance = eventBody.maxDistance;

                    if(maxDistance > 0){
                        var geoPositionEndpoints = {
                            host: host,
                            port: 443,
                            path: basePath + '/prospector/v1/techSearch/location/search',
                            method: 'POST',
                            headers: {
                                'userToken': event.headers.userToken,
                                "content-type": "application/json"
                            }

                        };

                        var city = eventBody.city;
                        var state = eventBody.state;
                        var country = eventBody.country;

                        var body = {
                            "city": city,
                            "state": state,
                            "country": country,
                            "maxDistance": maxDistance
                        };

                        console.log("body for geo = ", body);

                        var geoEndpoints = PromiseRequest(geoPositionEndpoints, body)
                            .then(function(geo){
                                console.log("geoEndpoints = ", geo);

                                var searchParams = buildTechSearchQuery(event, values, geo.body);
                                console.log('cloudsearchParams=' + JSON.stringify(searchParams));

                                var techSearchOptions = {
                                    host: host,
                                    port: 443,
                                    path: basePath + '/prospector/v1/techSearch/results',
                                    method: 'POST',
                                    headers: {
                                        'userToken': event.headers.userToken,
                                        "content-type": "application/json"
                                    },
                                    logResponse: false
                                };

                                var body = {
                                    "query": searchParams.query,
                                    "sort": searchParams.sort,
                                    "start": searchParams.start,
                                    "contactType": eventBody.contactType,
                                    "size": eventBody.maxResults,
                                    "destListId": eventBody.destListId
                                };

                                console.log('techSearchOptions=' + JSON.stringify(techSearchOptions));
                                console.log('body=' + JSON.stringify(body));

                                var getRevealsRequest = PromiseRequest(techSearchOptions, body)
                                    .then(function (values) {
                                        console.log('5a');
                                        return cb(null, {"statusCode": 200, "body":JSON.stringify(values.body)});
                                    })
                                    .catch(function (error) {
                                        console.log("5b");
                                        console.error(error);
                                        return cb(null, {"statusCode": 400, "body": JSON.stringify(response)});
                                    });
                            });
                    } else{
                        var searchParams = buildTechSearchQuery(event, values, geoEndpoints);
                        console.log('cloudsearchParams=' + JSON.stringify(searchParams));

                        var techSearchOptions = {
                            host: host,
                            port: 443,
                            path: basePath + '/prospector/v1/techSearch/results',
                            method: 'POST',
                            headers: {
                                'userToken': event.headers.userToken,
                                "content-type": "application/json"
                            },
                            logResponse: false
                        };

                        var body = {
                            "query": searchParams.query,
                            "sort": searchParams.sort,
                            "start": searchParams.start,
                            "contactType": eventBody.contactType,
                            "size": eventBody.maxResults,
                            "destListId": eventBody.destListId
                        };

                        console.log('techSearchOptions=' + JSON.stringify(techSearchOptions));
                        console.log('body=' + JSON.stringify(body));

                        var getRevealsRequest = PromiseRequest(techSearchOptions, body)
                            .then(function (values) {
                                console.log('5a');
                                return cb(null, {"statusCode": 200, "body":JSON.stringify(values.body)});
                            })
                            .catch(function (error) {
                                console.log("5b");
                                console.error(error);
                                return cb(null, {"statusCode": 400, "body": JSON.stringify(response)});
                            });
                    }

                } else {
                    console.log('4b');
                    return cb(null, {"statusCode": 200, "body":JSON.stringify(values.body)});
                }
            })
            .catch(function (error) {
                console.log("3b");
                console.error(error);
                return cb(null, {"statusCode": 400, "body": JSON.stringify(error)});
            });
    } else {
        var errorResponse = createErrorMsg(-200, "CompanySearch");
        return cb(null, {"statusCode": 400, "body": JSON.stringify(errorResponse)});
    }
};


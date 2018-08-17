/* This file is a duplicate of /www/probe/analyze/js/services/formValidators.js
* TODO: figure out a way to share angular modules
*  between Kibana and NetMon
*/
define(function (require) {

  var app = require('modules').get('app/dashboard');

  app.factory('formValidators', function ($q, $timeout, $http, ejsResource, Restangular) {
     var timeouts = {};
     return {
        hasErrors: function(formCtrl) {
            return !formCtrl.$pristine && !formCtrl.$valid;
         },
         showError: function(formCtrl, field) {
            return !formCtrl.$pristine && !!formCtrl.$error[field];
         },
         required: function(value) {
            return value !== undefined && value !== null && value !== '';
         },
         basicCharacters: function(value) {
            return !this.required(value) || /^[\w\-\s]+$/.test(value);
         },
         uniqueRule: function(value, ruleId) {
            var deferred = $q.defer();

            if (!this.required(value) || value === ruleId) {
               return true;
            }

            if (timeouts['uniqueRule']) {
               $timeout.cancel(timeouts['uniqueRule']);
            }
            timeouts['uniqueRule'] = $timeout(function() {
               $http.get('/api/queryRules/' + value)
                  .then(function(rule) {
                     deferred.reject();
                  }, function(error){
                     deferred.resolve();
                  });
            }, 500);

            return deferred.promise;
         },
         notAllQuery: function(value) {
            if (!this.required(value)) {
               return true;
            }

            return value !== '*';
         },
         validQuery: function(value) {
            var ejs = ejsResource('https://' + window.location.hostname),
               deferred = $q.defer(),
               request;

            if (!this.required(value) || !this.notAllQuery(value)) {
               return true;
            }

            if (timeouts['validQuery']) {
               $timeout.cancel(timeouts['validQuery']);
            }

            timeouts['validQuery'] = $timeout(function() {
               request = ejs.Request()
                  .query(
                     ejs.QueryStringQuery(value)
                  )
                  .size(0);

               request.doSearch(
                  deferred.resolve,
                  deferred.reject
               );
            }, 500);
            return deferred.promise;
      }
     };
  });
 });

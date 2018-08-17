define(function (require) {
   var app = require('modules').get('app/dashboard');
   var _ = require('lodash');
   var moment = require('moment');
   var angular = require('angular');
   var timefilter = require('components/timefilter/timefilter');

   app.factory('searchAuditor', function (elasticSearchFields, Restangular, timefilter, $http) {
      const SEARCH_URI = '/api/audit/search';
      const FORMAT_STRING = 'YYYY/MM/DD HH:mm:ss';
      const INDEX_PATTERN = '[network_]YYYY_MM_DD';

      var previousQuery = {
         query    : '',
         fromDate : '',
         toDate   : ''
      };

      var formatQuery = function(query) {
         var _query = _.isArray(query) ? query : [query];
         if (_.isArray(_query)) {
            var count = 0;
            _.each(_query, function($q) {
               $q = elasticSearchFields.convertQuery($q);
               _query[count] = $q;
               ++count;
            });
         } else {
            _query = elasticSearchFields.convertQuery(_query);
         }
         return _query;
      };

      var logQuery = function(query) {
      // ignore these searches for search auditing
         var timeRange = timefilter.getBounds();
         var timeFrom = timeRange.min;
         var timeTo = timeRange.max;

         if (!timeFrom || !timeTo) {
            return;
         }

         timeFrom = moment(timeFrom).format(FORMAT_STRING);
         timeTo = moment(timeTo).format(FORMAT_STRING);

         if (query === previousQuery.query &&
            timeFrom === previousQuery.fromDate &&
            timeTo === previousQuery.toDate) {
            return;
         }
         previousQuery = {
            query    : query,
            fromDate : timeFrom,
            toDate   : timeTo
         };

         $http.put(SEARCH_URI, 
         { 
            query: query,
            from: timeFrom,
            to: timeTo
         })
         .then(
            function (data) { }, 
            function (error) {
               var error = response.message || 'An unknown error occured';
               console.log('Search Audit Error:', error);
            }
         );
      };

      return {
         logAndCapitalize : function(query) {
            return elasticSearchFields.fetchMapping().then( function(hasFieldMap) {
               var capitalizedQuery = formatQuery(query.query_string.query)[0];
               logQuery(capitalizedQuery);

                // we create a new object to force angular to reflect the
                // query change in the view
               var newQuery =
               {
                  query_string : {
                     query : capitalizedQuery,
                     analyze_wildcard : query.query_string.analyze_wildcard
                  }
               };
               return newQuery;
            });
         }
      };
   });
});

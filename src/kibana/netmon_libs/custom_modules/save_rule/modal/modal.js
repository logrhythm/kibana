define(function (require) {

    var app = require('modules').get('app/dashboard');
    require('netmon_libs/custom_modules/save_rule/services/validators');
    require('netmon_libs/custom_modules/save_rule/services/kbnIndexService');
    require('netmon_libs/custom_modules/save_rule/services/ElasticSearchFields');

    var moment = require('moment');
    var angular = require('angular');
    var _ = require('lodash');

    app.controller('SaveRuleController', function ($scope, $modalInstance, $http, query, formValidators, Restangular, ejsResource, kbnIndex, elasticSearchFields) {
        $scope.loadingIconPath = '/client/assets/img/load-white.gif';
        $scope.init = function(query){
           $scope.ejs = ejsResource('https://' + window.location.hostname);
           $scope.elasticSearchFields = elasticSearchFields;
           $scope.validators = formValidators;
           $scope.savableRule = {
             enabled: true
           };
           $scope.modalState = {
              state: 'unsaved'
           };

           if (query.query_string.query && query.query_string.query !== '*') {
              $scope.savableRule.query = query.query_string.query;
           }
        };

        $scope.init(query);

         $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
         };

         $scope.openConfirmSaveRuleModal = function(rule, form) {
            var from = moment().subtract(1, 'days').toDate(),
                to = moment().toDate();

            $scope.modalState.state = 'unconfirmed';
            $scope.modalState.loading = true;
            form.$setPristine();
            $scope.elasticSearchFields.fetchMapping().then( function(hasFieldMap) {
               if (hasFieldMap) {
                  rule.query = $scope.elasticSearchFields.convertQuery(rule.query);
                  kbnIndex.indices(from, to, '[network_]YYYY_MM_DD', 'day')
                     .then(
                        function(indices) {
                           $scope.ejs.Request()
                              .indices(indices)
                              .facet(
                                 $scope.ejs.QueryFacet('rules')
                                 .query(
                                    $scope.ejs.FilteredQuery(
                                       $scope.ejs.QueryStringQuery(rule.query),
                                       $scope.ejs.RangeFilter('TimeUpdated')
                                          .from(from)
                                          .to(to)
                                    )
                                 )
                              )
                              .doSearch()
                              .then(
                                 function(result) {
                                    $scope.modalState.loading = false;

                                    if (result && result.facets && result.facets.rules && result.facets.rules.count !== undefined) {
                                       $scope.modalState.numMatches = result.facets.rules.count;
                                    } else {
                                       $scope.modalState.state = 'error';
                                       $scope.modalState.error = 'There was a problem executing your search.';
                                    }
                                 },
                                 function() {
                                    $scope.modalState.loading = false;
                                    $scope.modalState.state = 'error';
                                    $scope.modalState.error = 'There was a problem executing your search.';
                                 }
                              );
                        },
                        function() {
                           $scope.modalState.loading = false;
                           $scope.modalState.state = 'error';
                           $scope.modalState.error = 'There was a problem executing your search.';
                        }
                     );
               } else {
                  $scope.modalState.loading = false;
                  $scope.modalState.state = 'error';
                  $scope.modalState.error = "Unable to retrieve metadata mappings.";
               }
            });
         };

        $scope.saveRule = function(rule) {
           $scope.modalState.loading = true;
           $http.put('/api/queryRules/' + rule.id, rule)
              .then(function(data) {
                  $scope.savableRule = angular.copy(data);
                  $scope.modalState.state = 'saved';
                  $scope.modalState.loading = false;
                },
                function(error) {
                   $scope.modalState = {
                      loading: false,
                      state: 'error',
                      error: 'There was a problem saving your rule.'
                   };
              });
           };
      });
  });

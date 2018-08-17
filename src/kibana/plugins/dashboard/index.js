define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var angular = require('angular');
  var ConfigTemplate = require('utils/config_template');
  var datemath = require('utils/datemath');

  require('directives/config');
  require('components/courier/courier');
  require('components/config/config');
  require('components/notify/notify');
  require('components/typeahead/typeahead');
  require('components/clipboard/clipboard');
  require('components/index_patterns/index_patterns');
  require('netmon_libs/custom_modules/save_rule/modal/modal');
  require('netmon_libs/custom_modules/save_rule/services/saveRuleManager');
  require('angular-bootstrap');

  // NetMon Non-Kibana Libraries
  require('ui-util');
  require('elasticjs');
  require('elasticjs-angular');
  require('ng-cookies');


  require('plugins/dashboard/directives/grid');
  require('plugins/dashboard/components/panel/panel');
  require('netmon_libs/custom_modules/save_rule/services/searchAuditor');
  require('plugins/dashboard/services/saved_dashboards');
  require('css!plugins/dashboard/styles/main.css');

  var app = require('modules').get('app/dashboard', [
    'elasticsearch',
    'ngRoute',
    'ipCookie',
    'kibana/courier',
    'kibana/config',
    'kibana/notify',
    'kibana/typeahead',
    'kibana/index_patterns',
    'ui.bootstrap',
    'ui.validate',
    'elasticjs.service'
  ]);

  require('routes')
  .when('/dashboard', {
    template: require('text!plugins/dashboard/index.html'),
    resolve: {
      dash: function (savedDashboards) {
        return savedDashboards.get();
      }
    }
  })
  .when('/dashboard/:id', {
    controller: 'DashboardSaveController',
    template: require('text!plugins/dashboard/index.html'),
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, courier) {
        return savedDashboards.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'dashboard' : '/dashboard'
        }));
      }
    }
  });
    app.controller('DashboardSaveController', function($scope, $routeParams,
        $location, ipCookie) {
        ipCookie('dashboard', $routeParams.id, {path: '/'});
    })
    .directive('dashboardApp', function (Notifier, courier, AppState,
                                            timefilter, kbnUrl, searchAuditor) {
        return {
          controller: function ($scope, $route, $routeParams, $location, $http,
             configFile, Private, getAppState, saveRuleManager, indexPatterns) {
            indexPatterns.refreshNetworkIndex();
            indexPatterns.refreshEventsIndex();
            $scope.saveRuleManager = saveRuleManager;
            var queryFilter = Private(require('components/filter_bar/query_filter'));

            var notify = new Notifier({
              location: 'Dashboard'
            });

            var dash = $scope.dash = $route.current.locals.dash;

            if (dash.timeRestore && dash.timeTo && dash.timeFrom && !getAppState.previouslyStored()) {
              timefilter.time.to = dash.timeTo;
              timefilter.time.from = dash.timeFrom;
            }

            $scope.$on('$destroy', dash.destroy);

            var matchQueryFilter = function (filter) {
                return (filter.query && filter.query.query_string && !filter.meta) ||
                    (filter.range && (filter.range.gte || filter.range.lte) && !filter.meta);
            };

            var extractQueryFromFilters = function (filters) {
              var filter = _.find(filters, matchQueryFilter);
              if (filter) return filter.query || filter.range;
            };

            var stateDefaults = {
              title: dash.title,
              panels: dash.panelsJSON ? JSON.parse(dash.panelsJSON) : [],
              query: extractQueryFromFilters(dash.searchSource.getOwn('filter')) || {query_string: {query: '*'}},
              filters: _.reject(dash.searchSource.getOwn('filter'), matchQueryFilter)
            };

            var $state = $scope.state = new AppState(stateDefaults);

            $scope.configTemplate = new ConfigTemplate({
              save: require('text!plugins/dashboard/partials/save_dashboard.html'),
              load: require('text!plugins/dashboard/partials/load_dashboard.html'),
              share: require('text!plugins/dashboard/partials/share.html'),
              pickVis: require('text!plugins/dashboard/partials/pick_visualization.html')
            });

            $scope.refresh = _.bindKey(courier, 'fetch');

            timefilter.enabled = true;
            $scope.timefilter = timefilter;
            $scope.$listen(timefilter, 'fetch', $scope.refresh);

            courier.setRootSearchSource(dash.searchSource);

            function init() {
              updateQueryOnRootSource();

              var docTitle = Private(require('components/doc_title/doc_title'));
              if (dash.id) {
                docTitle.change(dash.title);
              }
              var params = $location.search();
              if (params.query){
                  $state.query.query_string.query = params.query;
              }
              $scope.$emit('application.load');
            }

            function updateQueryOnRootSource() {
              var filters = queryFilter.getFilters();
              if ($state.query) {
                dash.searchSource.set('filter', _.union(filters, [{
                  query: $state.query
                }]));
              } else {
                dash.searchSource.set('filter', filters);
              }
            }

            // update root source when filters update
            $scope.$listen(queryFilter, 'update', function () {
              updateQueryOnRootSource();
              $state.save();
            });

            // update data when filters fire fetch event
            $scope.$listen(queryFilter, 'fetch', $scope.refresh);

            $scope.newDashboard = function () {
              kbnUrl.change('/dashboard', {});
            };

            $scope.filterResults = function () {

               searchAuditor.logAndCapitalize($scope.state.query).then(function(query) {
                  $scope.state.query = query;
                  updateQueryOnRootSource();
                  $state.save();
                  $scope.refresh();
               });
            };

            $scope.save = function () {
              $state.title = dash.id = dash.title;
              $state.save();
              dash.panelsJSON = angular.toJson($state.panels);
              dash.timeFrom = dash.timeRestore ? timefilter.time.from : undefined;
              dash.timeTo = dash.timeRestore ? timefilter.time.to : undefined;

              dash.save()
              .then(function (id) {
                $scope.configTemplate.close('save');
                if (id) {
                  notify.info('Saved Dashboard as "' + dash.title + '"');
                  if (dash.id !== $routeParams.id) {
                    kbnUrl.change('/dashboard/{{id}}', {id: dash.id});
                  }
                }
              })
              .catch(notify.fatal);
            };

            var pendingVis = _.size($state.panels);
            $scope.$on('ready:vis', function () {
              if (pendingVis) pendingVis--;
              if (pendingVis === 0) {
                $state.save();
                $scope.refresh();
              }
            });

            // listen for notifications from the grid component that changes have
            // been made, rather than watching the panels deeply
            $scope.$on('change:vis', function () {
              $state.save();
            });

            // called by the saved-object-finder when a user clicks a vis
            $scope.addVis = function (hit) {
              pendingVis++;
              $state.panels.push({ id: hit.id, type: 'visualization' });
            };

            $scope.addSearch = function (hit) {
              pendingVis++;
              $state.panels.push({ id: hit.id, type: 'search' });
            };

            // Setup configurable values for config directive, after objects are initialized
            $scope.opts = {
              dashboard: dash,
              save: $scope.save,
              addVis: $scope.addVis,
              addSearch: $scope.addSearch,
              shareData: function () {
                return {
                  link: $location.absUrl(),
                  // This sucks, but seems like the cleanest way. Uhg.
                  embed: '<iframe src="' + $location.absUrl().replace('?', '?embed&') +
                    '" height="600" width="800"></iframe>'
                };
              }
            };

            init();
          }
    };
  });

  var apps = require('registry/apps');
  apps.register(function DashboardAppModule() {
    return {
      id: 'dashboard',
      name: 'Dashboard',
      order: 2
    };
  });
});

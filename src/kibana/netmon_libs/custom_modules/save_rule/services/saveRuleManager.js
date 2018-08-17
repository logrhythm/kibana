define(function (require) {
   
   var app = require('modules').get('app/dashboard');
  
   app.factory('saveRuleManager', function ($modal) {
      var ruleManager = {};
      
      ruleManager.openSaveRuleModal = function(query) {
          var modalInstance = $modal.open({
             templateUrl: 'netmon_libs/custom_modules/save_rule/modal/save-rule.html',
             controller: 'SaveRuleController',
             resolve: {
                query: function () {
                   return query;
                }
             }
          });
      };
      
      return ruleManager;
   });
});
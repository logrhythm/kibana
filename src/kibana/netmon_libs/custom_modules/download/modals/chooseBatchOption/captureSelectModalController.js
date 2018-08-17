define(function (require) {
  require('angular-bootstrap');
  var _ = require('lodash');
  var app = require('modules').get('netmon/download');
  
  app.controller('CaptureSelectModalController', function($scope, $modalInstance) {
      $scope.formData = {};
      
      $scope.ok = function() {
          $modalInstance.dismiss($scope.formData.selected);
      };
      
      $scope.cancel = function() {
          $modalInstance.dismiss('cancel');
      };
  });

});
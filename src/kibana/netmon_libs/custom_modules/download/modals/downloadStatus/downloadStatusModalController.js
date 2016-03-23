define(function (require) {
  require('angular-bootstrap');
  require('netmon_libs/custom_modules/download/services/fileDownloader');

  var _ = require('lodash');
  var app = require('modules').get('netmon/download');
  
  app.controller('DownloadStatusModalController', function($scope, $modalInstance,
  fileDownloader, DownloadModalManager) {
      $scope.fileDownloader = fileDownloader;
      $scope.downloadModalManager = DownloadModalManager;
      $scope.formData = {};
      
      $scope.close = function() {
          $modalInstance.dismiss('close');
      };
      
      $scope.cancel = function() {
          console.log('canceled');
          DownloadModalManager.cancelDownload();
      };
  });

});
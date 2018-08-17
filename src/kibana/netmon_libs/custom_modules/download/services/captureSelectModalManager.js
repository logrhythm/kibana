define(function (require) {
  require('netmon_libs/custom_modules/download/services/downloadQueueManager');
  require('netmon_libs/custom_modules/download/modals/chooseBatchOption/captureSelectModalController.js');
  require('angular-bootstrap');
  var _ = require('lodash');
  var app = require('modules').get('netmon/download');
  
  app.factory('CaptureSelectModalManager', function ($modal, DownloadQueueManager) {
    var manager = {};
    manager.toggleMultiCaptureBox = function(tableID) {
        if (DownloadQueueManager.isBulkChecked(tableID)){
            DownloadQueueManager.unCheckBulk(tableID);
        } else {
            DownloadQueueManager.checkBulk(tableID);
            manager.openCaptureSelectModal(tableID);
        }
    };
    
    manager.openCaptureSelectModal = function(tableID) {
        var modalInstance = $modal.open({
           animation:true,
           templateUrl: 'netmon_libs/custom_modules/download/modals/chooseBatchOption/captureSelectModal.html',
           controller: 'CaptureSelectModalController'
        });
        modalInstance.result.then(function (selectedItem) {
        }, function (selectedItem) {

            switch (selectedItem) {
                case 'page':
                    DownloadQueueManager.selectAllFromCurrentPage(tableID);
                    break;
                case 'all':
                    DownloadQueueManager.selectAllCaptures(tableID);
                    break;
                
                case 'cancel':
                case 'backdrop click': // user clicked outside modal
                    DownloadQueueManager.unCheckBulk(tableID);
                    break;
            }
        });
    };
    
    return manager;
 });
});
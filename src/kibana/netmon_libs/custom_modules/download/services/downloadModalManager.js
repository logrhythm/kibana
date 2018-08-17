define(function (require) {
  require('netmon_libs/custom_modules/download/services/downloadQueueManager');
  require('netmon_libs/custom_modules/download/services/fileDownloader');
  require('netmon_libs/custom_modules/download/modals/downloadStatus/downloadStatusModalController');
  var _ = require('lodash');
  var app = require('modules').get('netmon/download');
  
  app.factory('DownloadModalManager', function ($modal, DownloadQueueManager, fileDownloader) {
    var manager = {};
    var reconModalContent = {};
    var filesToDownload = [];
    var downloadStatus = {};
    var downloadRequest;
    var loadingModalContent = {
        header: 'Downloading Selected Files',
        body: 'Depending on the size of the files, this may take a few minutes',
        closeButton: 'Cancel Download',
        isLoadingModal: true,
        headerClass: 'modal-header'
    };
    var downloadSuccessModalContent = {
        header: 'Success',
        body: 'File download complete.',
        closeButton: 'Close',
        isLoadingModal: false,
        headerClass: 'modal-header alert alert-success'
    };
    
    var downloadSettings = {
      prepareCallback: function (url) { 
          _.each(filesToDownload, function(session){
            downloadStatus[session] = {status: 'waiting'};
          });
         manager.setReconModalContent(loadingModalContent);
         manager.openDownloadStatusModal();
      },
      progressCallback: function (status) {
         downloadStatus = status;
      },
      successCallback: function (status) { 
         downloadStatus = status;
         manager.setReconModalContent(downloadSuccessModalContent);
      },
      failCallback: function (data, status) {
        if (status === 'Canceled'){
             _.each(downloadStatus, function(item, session){
                item.status = 'canceled';
             });
        } else {
            downloadStatus = status;
        }
         manager.setReconModalContent(
          {
            header: data.header,
            body: data.body,
            closeButton: 'Close',
            isLoadingModal: false,
            headerClass: data.class
          });
      },
      fileList: null
    };
    
    manager.getModalHeader = function() {
        return reconModalContent.header;
    };
    
    manager.getModalBody = function() {
        return reconModalContent.body;
    };
    
    manager.getModalCloseButton = function() {
        return reconModalContent.closeButton;
    };
    
    manager.getModalLoadingStatus = function() {
        return reconModalContent.isLoadingModal;
    };
    
    manager.getModalHeaderClass = function() {
        return reconModalContent.headerClass;
    };
     
    manager.getLoadingModalContent = function() {
        return loadingModalContent;
    };
    
    manager.getDownloadSuccessModalContent = function () {
        return downloadSuccessModalContent;
    };
    
    manager.setReconModalContent = function(modalContentObj){
        reconModalContent = modalContentObj;
    };
    
    manager.getDownloadStatus = function(fileName) {
        return downloadStatus[fileName].status;
    };
    
    manager.getDownloadMessage = function(fileName) {
        return downloadStatus[fileName].message;
    };
    
    manager.getFilesToDownload = function() {
        return filesToDownload;
    };
    
    manager.download = function(tableID, rowData) {
        var downloadQueue = DownloadQueueManager.getDownloadQueue(tableID);
        filesToDownload = [];
        downloadStatus = {};
        if (_.isEmpty(downloadQueue[tableID])) {
           filesToDownload.push(rowData._source.Session);
        } else {
            _.each(downloadQueue[tableID], function(id){
                if (!_.contains(filesToDownload, id)){
                    filesToDownload.push(id);
                }
          });
        }
        downloadSettings.fileList = filesToDownload;
        downloadRequest = fileDownloader.get(downloadSettings, 'pcap');
};
    
    manager.downloadReconstructedFile = function(rowData) {
        downloadStatus = {};
        filesToDownload = fileDownloader.deDupeFiles(rowData._source.Filename);
        downloadSettings.fileList = filesToDownload;
        downloadRequest = fileDownloader.get(downloadSettings, 'reconstruction', rowData._source.Session);
    };
    
    manager.openDownloadStatusModal = function() {
        var modalInstance = $modal.open({
           animation:true,
           templateUrl: 'netmon_libs/custom_modules/download/modals/downloadStatus/downloadStatus.html',
           controller: 'DownloadStatusModalController',
           backdrop  : 'static',
           keyboard  : false
        });
    };
    
    manager.cancelDownload = function() {
        downloadRequest.interrupt = true;
    };
  
    
    return manager;
 });
});
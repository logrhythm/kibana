define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  require('plugins/dashboard/components/modal/modal');
  require('angular-bootstrap');
  var app = require('modules').get('netmon/download', ['ui.bootstrap']);
  
  app.factory('DownloadQueueManager', function () {
     var downloadQueue = {};
     var bulkChecked = {};
     var manager = {};
     var pageDirectory = {};
     var currentPage = {};
     
     manager.addToDownloadQueue = function (tableID, row) {
         if (!downloadQueue[tableID]){
             downloadQueue[tableID] = {};
         }
         downloadQueue[tableID][row._id] = row._source.Session;
     };
     
     manager.getSelectedCount = function(tableID) {
         return _.keys(downloadQueue[tableID]).length;
     };
     
     manager.removeFromDownloadQueue = function(tableID, id) {
         delete downloadQueue[tableID][id];
     };
     
     manager.clearDownloadQueue = function(tableID) {
         downloadQueue[tableID] = {};
     };
     
     manager.getDownloadQueueByID = function (tableID) {
         return downloadQueue[tableID];
     };
     
     manager.getDownloadQueue = function () {
         return downloadQueue;
     };
    
     manager.setPageDirectory = function(tableID, pages) {
         pageDirectory[tableID] = pages;
     };
     
     manager.setCurrentPage = function(tableID, page) {
         currentPage[tableID] = page;
     };
     
     manager.toggleCaptureSelection = function(tableID, row) {
         if (!manager.isBoxChecked(tableID, row)) {
             manager.addToDownloadQueue(tableID, row);
         } else {
             manager.removeFromDownloadQueue(tableID, row._id);
         }
     };
     
     manager.isBoxChecked = function(tableID, row) {
         if (downloadQueue[tableID]) {
             if (downloadQueue[tableID][row._id]){
                 return true;
             }
         }
         return false;
     };

     manager.isBulkChecked = function(tableID) {
         if (bulkChecked[tableID]){
             return bulkChecked[tableID];
         }
         return false;
     };
     
     manager.checkBulk = function(tableID) {
         if (!bulkChecked[tableID]){
             bulkChecked[tableID] = {};
         }
         bulkChecked[tableID] = true;
     };
     
     manager.unCheckBulk = function(tableID) {
         if (!bulkChecked[tableID]){
             bulkChecked[tableID] = {};
         }
         manager.clearDownloadQueue(tableID);
         bulkChecked[tableID] = false;
     };
     
     manager.getPageID = function(tableID) {
         return currentPage[tableID].number;
     };
     
     manager.selectAllFromCurrentPage = function(tableID) {
         _.each(currentPage[tableID], function(row){
             if (!manager.isBoxChecked(tableID, row)){
                 manager.addToDownloadQueue(tableID, row);
             }
         });
     };
     
     manager.selectAllCaptures = function(tableID) {
         downloadQueue[tableID] = {};
         _.each(pageDirectory[tableID], function(page){
             _.each(page, function(row){
                manager.addToDownloadQueue(tableID, row);
             });
         });
     };
     
     return manager;
 });
});
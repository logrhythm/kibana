define(function (require) {
   
    var _ = require('lodash');
    var app = require('modules').get('netmon/download');
    app.factory('fileDownloader', function(Restangular, $timeout) {
        return {
             deDupeFiles : function(fileList) {
                 
                 var countOccurences = function(fileList) {
                    var dupes = false;
                    var itemFreq = {};
                    _.each(fileList, function(file){
                       if (!itemFreq[file]){
                          itemFreq[file] = 1;
                       } else {
                          dupes = true;
                          itemFreq[file]++;
                       }
                    });
                    if (dupes) return itemFreq;
                    return false;
                 };
                 
                 var generateNamesForDupes = function(fileList) {
                    var dupes = countOccurences(fileList);
                    if (dupes){
                       var newFileList = [];
                       _.each(dupes, function(count, fileName){
                          if (count > 1){
                            var counter = 0;
                            var i =1;
                            while (counter < count){
                               while(_.contains(fileList, i + '_' + fileName)){
                                 i++;
                               }
                               newFileList.push(i + '_' + fileName);
                               counter++;
                               i++;
                            }
                         } else {
                            newFileList.push(fileName);
                         }
                       });
                       return newFileList;
                    }
                    return fileList;
                 };
                 
                 return generateNamesForDupes(fileList);
             },
             
          
            formatFileNameForModal : function(fileName) {
               var lengthToTruncate = 35;
               if (fileName.length > lengthToTruncate){
                 return fileName.substring(0, lengthToTruncate) + '...' + fileName.substring(fileName.length-4);
              }
              return fileName;
            },
            get: function(settings, type, sessionID){
               
    			 
                var self = this;
                var iframe = null;
				var downloadID = null;
				self.route = type + '/';
				self.type = type;
				self.postData = {file  : settings.fileList};
				
				settings.checkInterval = 500;
				settings.fileUrl = '/data/api/' + self.route + '?action=download&downloadID=';

				// sessionID needed for File Recon only (NOT pcap recon)
				if (sessionID) {
					self.postData.sessionID = sessionID;
				}
    				
                var cancelDownload = function(downloadID) {
                    Restangular
                        .one(self.route)
                        .withHttpConfig({timeout: 1000})
                        .get({action: 'abort', downloadID: downloadID});

                    settings.failCallback(
                        {
                            header: 'Canceled', 
                            body: 'Download canceled.',
                            class: 'modal-header alert alert-warning'
                        }, 'Canceled');
                };
                

                var getiframeDocument = function(iframe) {
                    var iframeDoc = iframe.contentWindow || iframe.contentDocument;
                    iframeDoc = iframe.document ? iframeDoc.document : iframeDoc;
                    return iframeDoc;
                };

                var checkBulkDownloadCompleteStatus = function(statusList) {
                   var hasCompleted = true;
                   var completedSuccessfully = true;
                   var fileStatus = {};
                    _.each(statusList, function(status, session){
                        hasCompleted &= status.completed;
                        completedSuccessfully &= (status.status === 'success');
                    });
                    return {
                        'hasCompleted' : hasCompleted,
                        'completedSuccessfully' : completedSuccessfully,
                        'bulkStatus' : statusList
                    };
                };

                var checkFileDownloadProgress = function(downloadID) {
                    if(self.interrupt){
                        cancelDownload(downloadID);
                        return;
                    }
                    Restangular
                        .one(self.route)
                        .withHttpConfig({timeout: 15000})
                        .get({action: 'status', downloadID: downloadID})
                        .then(function(statusList){
                            if (statusList['interrupt']){ // the session was cleared during download
                                settings.failCallback(
                                     {
                                        header: 'Failure',
                                        body: 'Download interrupted.',
                                        class: 'modal-header alert alert-danger'
                                    },  'failure');  

                            }
                            statusList = JSON.parse(statusList);
                            var bulkStatus = checkBulkDownloadCompleteStatus(statusList);
                            if(bulkStatus.hasCompleted){
                                if(bulkStatus.completedSuccessfully) {
                                    settings.successCallback(bulkStatus.bulkStatus);
                                } else {
                                    settings.failCallback(
                                        {
                                            header: 'Failure',
                                            body: 'One or more of the downloads failed.',
                                            class: 'modal-header alert alert-danger'
                                        },  bulkStatus.bulkStatus);  
                                } 
                                iframe.contentWindow.stop();
                                iframe.parentNode.removeChild(iframe);
                            } else {
                                settings.progressCallback(bulkStatus.bulkStatus);
                                $timeout(function(){
                                    checkFileDownloadProgress(downloadID);
                                }, settings.checkInterval);
                            }
                        });
                };

                var main = function(){
                    self.interrupt = false;
                    Restangular
                        .all(self.route)
                        .withHttpConfig({timeout: 3000})
                        .post(self.postData)
                        .then(function(res){
                            if (res.status === 'failure'){
                                settings.failCallback(
                                        {
                                            header: 'Failure',
                                            body: res.data.message,
                                            class: 'alert alert-danger'
                                        },  'Error'); 
                            } else {
                                downloadID = res.downloadID;
                                settings.fileUrl += downloadID;
                                settings.prepareCallback(settings.fileUrl);
                                //create a temporary iframe that is used to request the fileUrl as a GET request
                                iframe = document.createElement('iframe');
    							iframe.style.display = 'none';

                                iframe.src = settings.fileUrl;
                                (document.getElementsByTagName('body')[0]).appendChild(iframe);

                               // check if the file download has completed every checkInterval ms
                                $timeout(function(){
                                    checkFileDownloadProgress(downloadID);
                                }, settings.checkInterval);
                            }
                        });
                };

                main();
                return this;
            }
        };
     });
});

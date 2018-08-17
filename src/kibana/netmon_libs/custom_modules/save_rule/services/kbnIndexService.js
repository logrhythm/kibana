/* This file is a duplicate of /www/probe/analyze/js/services.js
* TODO: remove all the horribleness from this file
* TODO: figure out a way to share angular modules
*  between Kibana and NetMon
*/
define(function (require) {
  var app = require('modules').get('app/dashboard');
  var moment = require('moment');
  var _ = require('lodash');
  app.service('kbnIndex',function($http) {
    // returns a promise containing an array of all indices matching the index
    // pattern that exist in a given range
    this.indices = function(from,to,pattern,interval) {
       var possible = [];
       _.each(expand_range(fake_utc(from),fake_utc(to),interval),function(d){
          possible.push(d.format(pattern));
       });

       return all_indices().then(function(p) {
       var indices = _.intersection(possible,p);
          indices.reverse();
          return indices;
       });
    };

    // returns a promise containing an array of all indices in an elasticsearch
    // cluster
    function all_indices() {
       var something = $http({
          url: 'https://' + window.location.hostname + '/_aliases',
          method: 'GET'
       }).error(function(data, status, headers, config) {
          // Handle error condition somehow?
       });

       return something.then(function(p) {
          var indices = [];
          _.each(p.data, function(v,k) {
             indices.push(k);
          });
          return indices;
       });
    }

    // this is stupid, but there is otherwise no good way to ensure that when
    // I extract the date from an object that I'm get the UTC date. Stupid js.
    // I die a little inside every time I call this function.
    // Update: I just read this again. I died a little more inside.
    // Update2: More death.
    function fake_utc(date) {
       var offset = 60000; // 1 minute
       date = moment(date).clone().toDate();
       return moment(new Date(date.getTime() + date.getTimezoneOffset() * offset));
    }

    // Create an array of date objects by a given interval
    function expand_range(start, end, interval) {
       if(_.contains(['hour','day','week','month','year'],interval)) {
          var range;
          start = moment(start).clone();
          range = [];
          while (start.isBefore(end)) {
             range.push(start.clone());
             switch (interval) {
                case 'hour':
                   start.add(1,'hours');
                   break;
                case 'day':
                   start.add(1,'days');
                   break;
                case 'week':
                   start.add(1,'weeks');
                   break;
                case 'month':
                   start.add(1,'months');
                   break;
                case 'year':
                   start.add(1,'years');
                   break;
                default:
                   break;
             }
          }
          range.push(moment(end).clone());
          return range;
       } else {
          return false;
       }
    }
});
});
/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import html from './doc_table.html';
import { dispatchRenderComplete } from '../../../../../kibana_utils/public';
import { SAMPLE_SIZE_SETTING } from '../../../../common';
// @ts-ignore
import { getLimitedSearchResultsMessage } from './doc_table_strings';
import { getServices } from '../../../kibana_services';
import './index.scss';

// Import the SelectedCaptureSessions service with fallback
let SelectedCaptureSessions: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require('@logrhythm/nm-web-shared/services/selected_capture_sessions');
  SelectedCaptureSessions = module.SelectedCaptureSessions || module.default || module;
} catch (e) {
  // Service loading failed, will try fallback methods
}

// Method 2: Global window access (fallback)
if (!SelectedCaptureSessions) {
  try {
    SelectedCaptureSessions = (window as any).SelectedCaptureSessions;
  } catch (e) {
    // Window access failed, will create mock service
  }
}

// Method 3: Enhanced mock service
if (!SelectedCaptureSessions) {
  const mockSelections = new Set();
  const subscribers: Array<(sessions: any[]) => void> = [];

  const notifySubscribers = () => {
    const sessions = Array.from(mockSelections);
    subscribers.forEach((callback) => {
      try {
        callback(sessions);
      } catch (e) {
        // Silently ignore subscriber errors
      }
    });
  };

  SelectedCaptureSessions = {
    add(session: any) {
      mockSelections.add(session);
      notifySubscribers();
    },
    remove(session: any) {
      mockSelections.delete(session);
      notifySubscribers();
    },
    has(session: any) {
      return mockSelections.has(session);
    },
    count() {
      return mockSelections.size;
    },
    getAll() {
      return Array.from(mockSelections);
    },
    reset() {
      mockSelections.clear();
      notifySubscribers();
    },
    subscribeAll(callback: (sessions: any[]) => void) {
      subscribers.push(callback);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },
  };
}

// Service initialization complete

export interface LazyScope extends ng.IScope {
  [key: string]: any;
}

export function createDocTableDirective(pagerFactory: any, $filter: any) {
  return {
    restrict: 'E',
    template: html,
    scope: {
      sorting: '=',
      columns: '=',
      hits: '=',
      totalHitCount: '=',
      indexPattern: '=',
      isLoading: '=?',
      infiniteScroll: '=?',
      filter: '=?',
      minimumVisibleRows: '=?',
      onAddColumn: '=?',
      onChangeSortOrder: '=?',
      onMoveColumn: '=?',
      onRemoveColumn: '=?',
      inspectorAdapters: '=?',
    },
    link: ($scope: LazyScope, $el: JQuery) => {
      $scope.persist = {
        sorting: $scope.sorting,
        columns: $scope.columns,
      };

      const limitTo = $filter('limitTo');
      const calculateItemsOnPage = () => {
        $scope.pager.setTotalItems($scope.hits.length);
        $scope.pageOfItems = limitTo($scope.hits, $scope.pager.pageSize, $scope.pager.startIndex);
      };

      $scope.limitedResultsWarning = getLimitedSearchResultsMessage(
        getServices().uiSettings.get(SAMPLE_SIZE_SETTING, 500)
      );

      $scope.addRows = function () {
        $scope.limit += 50;
      };

      // Implementation for onSelectAll - selects all sessions from all rows
      $scope.onSelectAll = function () {
        if (!$scope.hits || !SelectedCaptureSessions) {
          return;
        }

        // Clear existing selections first
        SelectedCaptureSessions.reset();

        // Get all sessions from all hits
        const allSessions: string[] = [];
        $scope.hits.forEach((hit: any) => {
          if (hit._source && hit._source.Session) {
            allSessions.push(hit._source.Session);
          }
        });

        // Add all sessions to the selection
        allSessions.forEach((sessionId: string) => {
          SelectedCaptureSessions.add(sessionId);
        });

        // Force Angular digest cycle to update UI (async to avoid conflicts)
        setTimeout(() => {
          try {
            $scope.$apply();
          } catch (e) {
            // $apply already in progress, ignore
          }
        }, 0);
      };

      // Implementation for onSelectCurrentPage - selects sessions from current page only
      $scope.onSelectCurrentPage = function () {
        if (!SelectedCaptureSessions) {
          return;
        }

        // Get sessions from current page (handles both pagination and infinite scroll modes)
        const currentPageSessions: string[] = [];
        let currentPageItems = [];

        // Determine which data source to use based on mode
        if ($scope.infiniteScroll) {
          // Infinite scroll mode: use limited hits
          currentPageItems = $scope.hits ? $scope.hits.slice(0, $scope.limit || 50) : [];
        } else {
          // Pagination mode: use pageOfItems if available, otherwise fall back to hits
          currentPageItems = $scope.pageOfItems || $scope.hits || [];
        }

        currentPageItems.forEach((hit: any) => {
          if (hit._source && hit._source.Session) {
            currentPageSessions.push(hit._source.Session);
          }
        });

        // Add current page sessions to the selection in batch to avoid multiple notifications
        if (SelectedCaptureSessions.addBatch) {
          // Use batch method if available
          SelectedCaptureSessions.addBatch(currentPageSessions);
        } else {
          // Fallback: temporarily disable notifications, then notify once
          const originalNotifySubscribers = SelectedCaptureSessions.notifySubscribers;
          SelectedCaptureSessions.notifySubscribers = () => {}; // Temporarily disable

          currentPageSessions.forEach((sessionId: string) => {
            SelectedCaptureSessions.add(sessionId);
          });

          // Restore notification function and notify once
          SelectedCaptureSessions.notifySubscribers = originalNotifySubscribers;
          if (originalNotifySubscribers) {
            originalNotifySubscribers.call(SelectedCaptureSessions);
          }
        }

        // Use $evalAsync for safe digest cycle update
        $scope.$evalAsync(() => {
          // This will update the UI in the next digest cycle without conflicts
        });
      };

      $scope.$watch('hits', (hits: any) => {
        if (!hits) return;

        // Reset infinite scroll limit
        $scope.limit = $scope.minimumVisibleRows || 50;

        if (hits.length === 0) {
          dispatchRenderComplete($el[0]);
        }

        if ($scope.infiniteScroll) return;
        $scope.pager = pagerFactory.create(hits.length, 50, 1);
        calculateItemsOnPage();
      });

      $scope.pageOfItems = [];
      $scope.onPageNext = () => {
        $scope.pager.nextPage();
        calculateItemsOnPage();
      };

      $scope.onPagePrevious = () => {
        $scope.pager.previousPage();
        calculateItemsOnPage();
      };

      $scope.shouldShowLimitedResultsWarning = () =>
        !$scope.pager.hasNextPage && $scope.pager.totalItems < $scope.totalHitCount;
    },
  };
}

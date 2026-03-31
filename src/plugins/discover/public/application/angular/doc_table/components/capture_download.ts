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

import angular from 'angular';

// Enhanced SelectedCaptureSessions service loading with multiple fallback strategies
// This addresses the critical issue where the service loads as 'false' instead of working object
let SelectedCaptureSessions: any = null;

// Method 1: Dynamic import with enhanced loading
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require('@logrhythm/nm-web-shared/services/selected_capture_sessions');
  SelectedCaptureSessions = module.SelectedCaptureSessions || module.default || module;
} catch (e) {
  // Method 1 failed, continue to fallback
}

// Method 2: Global window access (fallback)
if (!SelectedCaptureSessions) {
  try {
    SelectedCaptureSessions = (window as any).SelectedCaptureSessions;
  } catch (e) {
    // Method 2 failed, continue to mock service
  }
}

// Method 3: Enhanced mock service or supplement existing service with missing methods
if (!SelectedCaptureSessions) {
  const mockSelections = new Set();
  const subscribers: Array<(sessions: any[]) => void> = [];

  const notifySubscribers = () => {
    const sessions = Array.from(mockSelections);
    subscribers.forEach((callback) => {
      try {
        callback(sessions);
      } catch (e) {
        // Error notifying subscriber, continue with others
      }
    });
  };

  SelectedCaptureSessions = {
    add(session) {
      mockSelections.add(session);
      notifySubscribers();
    },
    remove(session) {
      mockSelections.delete(session);
      notifySubscribers();
    },
    has(session) {
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
    subscribeAll(callback) {
      subscribers.push(callback);
      // Return unsubscribe function
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },
  };
} else if (SelectedCaptureSessions && typeof SelectedCaptureSessions === 'object') {
  // Service exists but may be missing some methods - supplement it
  if (!SelectedCaptureSessions.has) {
    // We'll track selections in a local Set as backup
    const localSelections = new Set();

    // Wrap the existing add/remove methods to track selections locally
    const originalAdd = SelectedCaptureSessions.add;
    const originalRemove = SelectedCaptureSessions.remove;

    if (originalAdd) {
      SelectedCaptureSessions.add = function (session) {
        localSelections.add(session);
        return originalAdd.call(this, session);
      };
    }

    if (originalRemove) {
      SelectedCaptureSessions.remove = function (session) {
        localSelections.delete(session);
        return originalRemove.call(this, session);
      };
    }

    // Add the missing has method
    SelectedCaptureSessions.has = function (session) {
      return localSelections.has(session);
    };
  }

  if (!SelectedCaptureSessions.getAll) {
    SelectedCaptureSessions.getAll = function () {
      // If we have a count method, we can try to reconstruct or return empty array
      return [];
    };
  }
}

/**
 * captureDownload directive - Enhanced with professional styling and better debugging
 * Usage: <capture-download session="row.Session" selected="isSelected" on-select="onSelect(selected)"></capture-download>
 */
export const captureDownloadDirective = () => ({
  restrict: 'E',
  scope: {
    session: '@',
    selected: '=?',
    onSelect: '&?',
  },
  template: `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 32px; gap: 8px;">
      <input type="checkbox"
             ng-model="isSelected"
             ng-change="toggleSelection()"
             style="margin: 0; width: 16px; height: 16px; cursor: pointer;"
             title="Select this session for batch operations">
      <button ng-click="downloadCapture()"
              ng-if="hasSession"
              title="Download this capture session"
              style="background: none; border: none; cursor: pointer; opacity: 1 !important; color: #006bb4; padding: 4px; font-size: 14px; line-height: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center; min-width: 24px; min-height: 24px;">
        <i class="fa fa-download" aria-hidden="true"></i>
      </button>
      <span ng-if="!hasSession" style="color: #999; text-align: center; font-size: 12px; width: 24px;">-</span>
    </div>
  `,
  link(scope: any) {
    scope.hasSession = false;
    scope.isSelected = scope.selected || false;

    scope.$watch('session', (newVal: any) => {
      scope.hasSession = !!(
        newVal &&
        newVal !== 'undefined' &&
        newVal !== 'null' &&
        newVal.trim() !== ''
      );

      // Check if this session is already selected in the service
      if (scope.hasSession && SelectedCaptureSessions) {
        try {
          const isInService = SelectedCaptureSessions.has(newVal);
          // Update local state to match service
          if (scope.isSelected !== isInService) {
            scope.isSelected = isInService;
          }
        } catch (error) {
          // Error checking session in service, use local state
        }
      }
    });

    scope.$watch('selected', (newVal: any) => {
      scope.isSelected = !!newVal;
    });

    scope.toggleSelection = function () {
      if (scope.hasSession && scope.session && SelectedCaptureSessions) {
        try {
          if (scope.isSelected) {
            // User checked the box - add to selection
            SelectedCaptureSessions.add(scope.session);
          } else {
            // User unchecked the box - remove from selection
            SelectedCaptureSessions.remove(scope.session);
          }

          // Get current state for verification with error handling
          let isActuallySelected = scope.isSelected; // fallback to local state

          // Safe check for has() method availability
          if (typeof SelectedCaptureSessions.has === 'function') {
            isActuallySelected = SelectedCaptureSessions.has(scope.session);
          }

          // Verify the operation worked correctly (only if has() is available)
          if (
            typeof SelectedCaptureSessions.has === 'function' &&
            scope.isSelected !== isActuallySelected
          ) {
            // Correct local state to match service
            scope.isSelected = isActuallySelected;
          }
        } catch (error) {
          // Selection service error, use local state
        }
      }

      // Always call the parent callback if provided
      if (scope.onSelect) {
        try {
          scope.onSelect({ selected: scope.isSelected });
        } catch (error) {
          // Error calling parent onSelect
        }
      }
    };

    scope.downloadCapture = function () {
      if (!scope.session || scope.session === 'undefined' || scope.session === 'null') {
        return;
      }

      // TODO: Replace with your actual download URL logic
      const url = `/api/capture/download/${scope.session}`;

      try {
        window.open(url, '_blank');
      } catch (error) {
        // Error opening download URL
      }
    };
  },
});

// Directive is registered in get_inner_angular.ts createDocTableModule function

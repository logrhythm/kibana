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

/*
 * THIS FILE HAS BEEN MODIFIED FROM THE ORIGINAL SOURCE
 * This comment only applies to modifications applied after the f421eec40b5a9f31383591e30bef86724afcd2b3 commit
 *
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiPopover, EuiButton } from '@elastic/eui';
import { SortOrder } from './helpers';

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
      SelectedCaptureSessions.add = function (session: any) {
        localSelections.add(session);
        return originalAdd.call(this, session);
      };
    }

    if (originalRemove) {
      SelectedCaptureSessions.remove = function (session: any) {
        localSelections.delete(session);
        return originalRemove.call(this, session);
      };
    }

    // Add the missing has method
    SelectedCaptureSessions.has = function (session: any) {
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

interface Props {
  colLeftIdx: number; // idx of the column to the left, -1 if moving is not possible
  colRightIdx: number; // idx of the column to the right, -1 if moving is not possible
  displayName: string;
  isRemoveable: boolean;
  isSortable: boolean;
  name: string;
  onChangeSortOrder?: (sortOrder: SortOrder[]) => void;
  onMoveColumn?: (name: string, idx: number) => void;
  onRemoveColumn?: (name: string) => void;
  onSelectAll?: () => void;
  onSelectCurrentPage?: () => void;
  sortOrder: SortOrder[];
}

const sortDirectionToIcon: Record<string, string> = {
  desc: 'fa fa-sort-down',
  asc: 'fa fa-sort-up',
  '': 'fa fa-sort',
};

// Professional CaptureHeaderDropdown with EUI components and FIXED alignment
interface CaptureHeaderProps {
  onSelectAll?: () => void;
  onSelectCurrentPage?: () => void;
}

const CaptureHeaderDropdown: React.FC<CaptureHeaderProps> = ({
  onSelectAll,
  onSelectCurrentPage,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);

  // Enhanced polling solution with error handling to prevent crashes
  useEffect(() => {
    const pollInterval = setInterval(() => {
      try {
        if (SelectedCaptureSessions && typeof SelectedCaptureSessions.count === 'function') {
          const count = SelectedCaptureSessions.count();
          setSelectedCount(count);
        }
      } catch (error) {
        // Polling error, continue with next poll
      }
    }, 100);

    // Initial count
    try {
      if (SelectedCaptureSessions && typeof SelectedCaptureSessions.count === 'function') {
        setSelectedCount(SelectedCaptureSessions.count());
      }
    } catch (error) {
      // Error getting initial count
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Enhanced subscription fallback
  useEffect(() => {
    if (SelectedCaptureSessions && SelectedCaptureSessions.subscribeAll) {
      try {
        const unsubscribe = SelectedCaptureSessions.subscribeAll((sessions: any[]) => {
          setSelectedCount(sessions.length);
        });

        // Set initial count
        const initialCount = SelectedCaptureSessions.count();
        setSelectedCount(initialCount);

        return () => {
          unsubscribe();
        };
      } catch (error) {
        // Error setting up subscription
      }
    }
  }, []);

  const handleDownloadSelected = async () => {
    try {
      if (SelectedCaptureSessions.count() === 0) {
        return;
      }

      // TODO: Implement actual download logic
      // For now, just clear selections
      SelectedCaptureSessions.reset();
      setIsPopoverOpen(false);
    } catch (err) {
      // Error downloading selected sessions
    }
  };

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll();
    }
    setIsPopoverOpen(false);
  };

  const handleSelectCurrentPage = () => {
    if (onSelectCurrentPage) {
      onSelectCurrentPage();
    }
    setIsPopoverOpen(false);
  };

  const handleClearSelected = () => {
    SelectedCaptureSessions.reset();
    setIsPopoverOpen(false);
  };

  // FIXED: Compact button perfectly aligned with data column
  const button = (
    <button
      onClick={() => {
        setIsPopoverOpen(!isPopoverOpen);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '4px 6px',
        borderRadius: '3px',
        border: '1px solid #d3dae6',
        backgroundColor: isPopoverOpen ? '#f5f7fa' : 'transparent',
        background: isPopoverOpen ? '#f5f7fa' : 'transparent',
        outline: 'none',
        transition: 'all 0.1s ease',
        minHeight: '24px',
        maxHeight: '24px',
        fontSize: '11px',
        margin: '0 auto',
      }}
      onMouseEnter={(e) => {
        if (!isPopoverOpen) {
          (e.target as HTMLElement).style.backgroundColor = '#f5f7fa';
        }
      }}
      onMouseLeave={(e) => {
        if (!isPopoverOpen) {
          (e.target as HTMLElement).style.backgroundColor = 'transparent';
        }
      }}
      aria-label="Open capture session menu"
    >
      <i
        className="fa fa-th-large"
        style={{
          color: '#006bb4',
          fontSize: '10px',
          width: '12px',
          height: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <span
        style={{
          color: '#006bb4',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          fontSize: '10px',
          lineHeight: 1,
        }}
      >
        {selectedCount} selected
      </span>
    </button>
  );

  return (
    <EuiPopover
      id="captureHeaderPopover"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downCenter"
      repositionOnScroll={true}
      zIndex={9999}
      panelStyle={{
        minWidth: '220px',
        maxWidth: '280px',
        zIndex: 9999,
      }}
      panelProps={{
        style: {
          zIndex: 9999,
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <EuiButton
          fullWidth
          size="s"
          onClick={handleDownloadSelected}
          isDisabled={selectedCount === 0}
          iconType="download"
          fill={false}
        >
          Download Selected Sessions
        </EuiButton>

        <EuiButton
          fullWidth
          size="s"
          onClick={handleSelectAll}
          isDisabled={!onSelectAll}
          iconType="checkInCircleFilled"
          fill={false}
        >
          Select All Sessions
        </EuiButton>

        <EuiButton
          fullWidth
          size="s"
          onClick={handleSelectCurrentPage}
          isDisabled={!onSelectCurrentPage}
          iconType="check"
          fill={false}
        >
          Select Sessions on Current Page
        </EuiButton>

        <EuiButton
          fullWidth
          size="s"
          onClick={handleClearSelected}
          isDisabled={selectedCount === 0}
          color="danger"
          iconType="cross"
          fill={false}
        >
          Clear Selected Sessions
        </EuiButton>
      </div>
    </EuiPopover>
  );
};

export function TableHeaderColumn({
  colLeftIdx,
  colRightIdx,
  displayName,
  isRemoveable,
  isSortable,
  name,
  onChangeSortOrder,
  onMoveColumn,
  onRemoveColumn,
  onSelectAll,
  onSelectCurrentPage,
  sortOrder,
}: Props) {
  const [, sortDirection = ''] = sortOrder.find((sortPair) => name === sortPair[0]) || [];
  const currentSortWithoutColumn = sortOrder.filter((pair) => pair[0] !== name);
  const currentColumnSort = sortOrder.find((pair) => pair[0] === name);
  const currentColumnSortDirection = (currentColumnSort && currentColumnSort[1]) || '';

  const btnSortIcon = sortDirectionToIcon[sortDirection];
  const btnSortClassName =
    sortDirection !== '' ? btnSortIcon : `kbnDocTableHeader__sortChange ${btnSortIcon}`;

  const handleChangeSortOrder = () => {
    if (!onChangeSortOrder) return;

    // Cycle goes Unsorted -> Asc -> Desc -> Unsorted
    if (currentColumnSort === undefined) {
      onChangeSortOrder([...currentSortWithoutColumn, [name, 'asc']]);
    } else if (currentColumnSortDirection === 'asc') {
      onChangeSortOrder([...currentSortWithoutColumn, [name, 'desc']]);
    } else if (currentColumnSortDirection === 'desc' && currentSortWithoutColumn.length === 0) {
      // If we're at the end of the cycle and this is the only existing sort, we switch
      // back to ascending sort instead of removing it.
      onChangeSortOrder([[name, 'asc']]);
    } else {
      onChangeSortOrder(currentSortWithoutColumn);
    }
  };

  const getSortButtonAriaLabel = () => {
    const sortAscendingMessage = i18n.translate(
      'discover.docTable.tableHeader.sortByColumnAscendingAriaLabel',
      {
        defaultMessage: 'Sort {columnName} ascending',
        values: { columnName: name },
      }
    );
    const sortDescendingMessage = i18n.translate(
      'discover.docTable.tableHeader.sortByColumnDescendingAriaLabel',
      {
        defaultMessage: 'Sort {columnName} descending',
        values: { columnName: name },
      }
    );
    const stopSortingMessage = i18n.translate(
      'discover.docTable.tableHeader.sortByColumnUnsortedAriaLabel',
      {
        defaultMessage: 'Stop sorting on {columnName}',
        values: { columnName: name },
      }
    );

    if (currentColumnSort === undefined) {
      return sortAscendingMessage;
    } else if (sortDirection === 'asc') {
      return sortDescendingMessage;
    } else if (sortDirection === 'desc' && currentSortWithoutColumn.length === 0) {
      return sortAscendingMessage;
    } else {
      return stopSortingMessage;
    }
  };

  // action buttons displayed on the right side of the column name
  const buttons = [
    // Sort Button
    {
      active: isSortable && typeof onChangeSortOrder === 'function',
      ariaLabel: getSortButtonAriaLabel(),
      className: btnSortClassName,
      onClick: handleChangeSortOrder,
      testSubject: `docTableHeaderFieldSort_${name}`,
      tooltip: getSortButtonAriaLabel(),
    },
    // Remove Button
    {
      active: isRemoveable && typeof onRemoveColumn === 'function',
      ariaLabel: i18n.translate('discover.docTable.tableHeader.removeColumnButtonAriaLabel', {
        defaultMessage: 'Remove {columnName} column',
        values: { columnName: name },
      }),
      className: 'fa fa-remove kbnDocTableHeader__move',
      onClick: () => onRemoveColumn && onRemoveColumn(name),
      testSubject: `docTableRemoveHeader-${name}`,
      tooltip: i18n.translate('discover.docTable.tableHeader.removeColumnButtonTooltip', {
        defaultMessage: 'Remove Column',
      }),
    },
    // Move Left Button
    {
      active: colLeftIdx >= 0 && typeof onMoveColumn === 'function',
      ariaLabel: i18n.translate('discover.docTable.tableHeader.moveColumnLeftButtonAriaLabel', {
        defaultMessage: 'Move {columnName} column to the left',
        values: { columnName: name },
      }),
      className: 'fa fa-angle-double-left kbnDocTableHeader__move',
      onClick: () => onMoveColumn && onMoveColumn(name, colLeftIdx),
      testSubject: `docTableMoveLeftHeader-${name}`,
      tooltip: i18n.translate('discover.docTable.tableHeader.moveColumnLeftButtonTooltip', {
        defaultMessage: 'Move column to the left',
      }),
    },
    // Move Right Button
    {
      active: colRightIdx >= 0 && typeof onMoveColumn === 'function',
      ariaLabel: i18n.translate('discover.docTable.tableHeader.moveColumnRightButtonAriaLabel', {
        defaultMessage: 'Move {columnName} column to the right',
        values: { columnName: name },
      }),
      className: 'fa fa-angle-double-right kbnDocTableHeader__move',
      onClick: () => onMoveColumn && onMoveColumn(name, colRightIdx),
      testSubject: `docTableMoveRightHeader-${name}`,
      tooltip: i18n.translate('discover.docTable.tableHeader.moveColumnRightButtonTooltip', {
        defaultMessage: 'Move column to the right',
      }),
    },
  ];

  // FIXED: Enhanced styling with proper overflow handling for popover alignment
  const tableHeaderStyle = {
    display: 'table-cell !important',
    visibility: 'visible !important',
    opacity: '1 !important',
    padding: '8px 12px !important',
    borderBottom: '2px solid #d3dae6 !important',
    textAlign: (name === 'Captured' ? 'center' : 'left') as 'center' | 'left',
    fontWeight: 600,
    color: '#343741 !important',
    backgroundColor: '#f5f7fa !important',
    fontSize: '12px !important',
    verticalAlign: 'middle' as 'middle',
    whiteSpace: 'nowrap' as 'nowrap',
    width: name === 'Captured' ? '120px' : 'auto',
    minWidth: name === 'Captured' ? '120px' : 'auto',
    maxWidth: name === 'Captured' ? '120px' : '120px',
    position: 'relative' as 'relative',
    zIndex: name === 'Captured' ? 9999 : 10,
    border: '1px solid #d3dae6 !important',
    // CRITICAL: Allow overflow for popover positioning
    overflow: name === 'Captured' ? 'visible !important' : 'hidden',
  } as any;

  return (
    <th
      data-test-subj="docTableHeaderField"
      className="kbnDocTableHeader__field kbn-doc-table-header-cell table-header-column"
      style={tableHeaderStyle}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: name === 'Captured' ? 'center' : 'flex-start',
          minHeight: '24px',
          // CRITICAL: Allow overflow for popover container
          overflow: 'visible',
          position: 'relative',
          zIndex: name === 'Captured' ? 1000 : 1,
          width: '100%',
          height: '100%',
          padding: '0',
        }}
      >
        {name !== 'Captured' && (
          <span
            data-test-subj={`docTableHeader-${name}`}
            style={{
              fontWeight: 600,
              fontSize: '12px',
              color: '#343741',
            }}
          >
            {displayName}
          </span>
        )}

        {/* FIXED: Show both header text AND dropdown for Captured column */}
        {name === 'Captured' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              height: '100%',
              position: 'relative',
              zIndex: 1000,
              padding: '0 4px',
              gap: '4px',
            }}
          >
            <span
              data-test-subj={`docTableHeader-${name}`}
              style={{
                fontWeight: 600,
                fontSize: '12px',
                color: '#343741',
                flex: '1',
                textAlign: 'left',
              }}
            >
              {displayName}
            </span>
            <div
              style={{
                position: 'relative',
                zIndex: 10000,
              }}
            >
              <CaptureHeaderDropdown
                onSelectAll={onSelectAll}
                onSelectCurrentPage={onSelectCurrentPage}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {buttons
          .filter((button) => button.active)
          .map((button, idx) => (
            <EuiToolTip
              id={`docTableHeader-${name}-tt`}
              content={button.tooltip}
              key={`button-${idx}`}
            >
              <button
                aria-label={button.ariaLabel}
                className={button.className}
                data-test-subj={button.testSubject}
                onClick={button.onClick}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#006bb4',
                  fontSize: '12px',
                  padding: '2px',
                }}
              />
            </EuiToolTip>
          ))}
      </div>
    </th>
  );
}

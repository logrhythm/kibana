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
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React from 'react';
import { EuiHorizontalRule, EuiIcon, EuiProgress, EuiTextColor, EuiToolTip } from '@elastic/eui';
import { SingleFileStatus, DownloadStatus } from '@logrhythm/nm-web-shared/services/session_files';

const rowStyles: Record<
  | 'fileDownloadItem'
  | 'tooltip'
  | 'infoIcon'
  | 'fileDownloadText'
  | 'fileDownloadProgress'
  | 'progressOngoingText'
  | 'progressText'
  | 'statusIcon',
  React.CSSProperties
> = {
  fileDownloadItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
  },
  tooltip: {
    cursor: 'pointer',
  },
  infoIcon: {
    marginLeft: '2px',
  },
  fileDownloadText: {
    flex: '1 1 60%',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileDownloadProgress: {
    flex: '1 1 40%',
    minWidth: '180px',
  },
  progressOngoingText: {
    marginBottom: '1em',
  },
  progressText: {
    display: 'flex',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: '12px',
  },
};

export interface FileDownloadRowProps {
  overallStatus: DownloadStatus;
  fileName: string;
  fileStatus: SingleFileStatus;
}

const FileDownloadRow = (props: FileDownloadRowProps) => {
  const { overallStatus, fileName, fileStatus } = props;

  const renderFileName = () => (
    <EuiTextColor color={fileStatus.status === 'failure' ? 'danger' : 'default'}>
      {fileName.length < 42 && fileName}
      {fileName.length >= 42 && (
        <EuiToolTip content={fileName}>
          <div style={rowStyles.tooltip}>{`${fileName.substring(0, 38)}...`}</div>
        </EuiToolTip>
      )}
    </EuiTextColor>
  );

  const renderFileStatus = () => {
    switch (fileStatus.status) {
      case 'locating':
      case 'waiting':
      case 'downloading':
        return overallStatus !== 'loading' ? (
          <EuiProgress value={0} max={100} size="xs" color="primary" />
        ) : (
          <>
            <div style={rowStyles.progressOngoingText}>
              {fileStatus.status === 'locating' && 'Locating'}
              {fileStatus.status === 'waiting' && 'Waiting'}
              {fileStatus.status === 'downloading' &&
                typeof fileStatus.message === 'number' &&
                `${fileStatus.message} Bytes Downloaded`}
              {fileStatus.status === 'downloading' &&
                typeof fileStatus.message !== 'number' &&
                'Downloading'}
            </div>
            <EuiProgress size="xs" color="primary" />
          </>
        );
      case 'success':
      case 'failure':
        return (
          <EuiTextColor
            style={rowStyles.progressText}
            color={fileStatus.status === 'failure' ? 'danger' : 'default'}
          >
            <EuiIcon
              style={rowStyles.statusIcon}
              type={fileStatus.status === 'success' ? 'check' : 'cross'}
            />
            {fileStatus.status === 'success' && <div>Success</div>}
            {fileStatus.status === 'failure' && (
              <EuiToolTip content={fileStatus.message}>
                <div style={rowStyles.tooltip}>
                  Error
                  <EuiIcon style={rowStyles.infoIcon} type="iInCircle" />
                </div>
              </EuiToolTip>
            )}
          </EuiTextColor>
        );
    }
  };

  return (
    <React.Fragment>
      <div style={rowStyles.fileDownloadItem}>
        <span style={rowStyles.fileDownloadText} className="fileDownloadText">
          {renderFileName()}
        </span>
        <span style={rowStyles.fileDownloadProgress}>{renderFileStatus()}</span>
      </div>
      <EuiHorizontalRule />
    </React.Fragment>
  );
};

export default FileDownloadRow; // eslint-disable-line

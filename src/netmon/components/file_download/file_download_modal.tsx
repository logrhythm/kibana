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

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiHorizontalRule,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiProgress,
  EuiTextColor,
  EuiOverlayMask,
  EuiPortal,
} from '@elastic/eui';
import { saveAs } from '@elastic/filesaver';
import {
  FileDownloadStatus,
  FileType,
  DownloadStatus,
} from '@logrhythm/nm-web-shared/services/session_files';
import { SessionFileDownloader } from '@logrhythm/nm-web-shared/services/session_file_downloader';
import { toastNotifications } from '../../services/notifications';
import FileDownloadRow from './file_download_row';

const modalStyles: Record<
  'modal' | 'footer' | 'footerCallout' | 'footerButton',
  React.CSSProperties
> = {
  modal: {
    width: 'min(900px, 90vw)',
    minWidth: '320px',
  },
  footer: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16rem',
  },
  footerCallout: {
    flex: '1 1 420px',
  },
  footerButton: {
    flex: '0 0 auto',
  },
};

export interface FileDownloadModalProps {
  downloadId: string;
  fileType: FileType;
  onClose: () => void;
}

const FileDownloadModal = (props: FileDownloadModalProps) => {
  const { downloadId, fileType, onClose } = props;

  const [downloadStatus, setDownloadStatus] = useState<FileDownloadStatus>({
    overall: 'loading',
    fileStatuses: {},
  });
  const downloader = useRef<SessionFileDownloader | null>(null);

  useEffect(() => {
    if (downloader.current && !downloader.current.terminated) {
      downloader.current.abort();
    }

    if (!downloadId) {
      return;
    }

    downloader.current = new SessionFileDownloader(
      downloadId,
      fileType,
      setDownloadStatus,
      (fileInfo) => {
        saveAs(fileInfo.blob, fileInfo.name);
      },
      toastNotifications.addWarning,
      toastNotifications.addDanger
    );

    downloader.current.start();

    // Cleanup function to prevent memory leaks
    return () => {
      if (downloader.current && !downloader.current.terminated) {
        downloader.current.abort();
      }
    };
  }, [downloadId, fileType]);

  const handleClose = () => {
    if (downloader.current && !downloader.current.terminated) {
      toastNotifications.addWarning(
        'The modal cannot be closed until the file download is cancelled or completed.'
      );
      return;
    }

    onClose();
  };

  const fileNames = Object.keys(downloadStatus.fileStatuses);

  if (!downloadId) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiOverlayMask>
        <EuiModal style={modalStyles.modal} onClose={handleClose}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <EuiTextColor
                color={
                  downloadStatus.overall === 'error' || downloadStatus.overall === 'partial-success'
                    ? 'danger'
                    : 'default'
                }
              >
                {downloadStatus.overall === 'loading' && 'Downloading Files'}
                {downloadStatus.overall === 'partial-success' && 'Partial Success'}
                {downloadStatus.overall === 'success' && 'Success'}
                {downloadStatus.overall === 'error' && 'Error'}
                {downloadStatus.overall === 'aborted' && 'Cancelled'}
              </EuiTextColor>
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {downloadStatus.overall === 'aborted' && (
              <EuiTextColor color="warning">Lookup was cancelled.</EuiTextColor>
            )}
            {downloadStatus.overall !== 'aborted' && fileNames.length === 0 && (
              <EuiProgress size="xs" color="primary" />
            )}
            {downloadStatus.overall !== 'aborted' && fileNames.length > 0 && (
              <>
                <EuiHorizontalRule />
                {fileNames.sort().map((f) => (
                  <FileDownloadRow
                    key={`file_${f}`}
                    overallStatus={downloadStatus.overall as DownloadStatus}
                    fileName={fileType === 'pcap' ? `${f}.pcap` : f}
                    fileStatus={downloadStatus.fileStatuses[f]}
                  />
                ))}
              </>
            )}
          </EuiModalBody>
          <EuiModalFooter style={modalStyles.footer}>
            <EuiCallOut
              style={modalStyles.footerCallout}
              title="Files may be incomplete, corrupted, or contain malware."
              color="warning"
              size="s"
              iconType="alert"
            />
            {downloadStatus.overall === 'loading' && (
              <EuiButton
                style={modalStyles.footerButton}
                color="warning"
                onClick={() => downloader.current && downloader.current.abort()}
              >
                Cancel Download
              </EuiButton>
            )}
            {downloadStatus.overall !== 'loading' && (
              <EuiButton style={modalStyles.footerButton} onClick={handleClose}>
                Close
              </EuiButton>
            )}
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    </EuiPortal>
  );
};

export default FileDownloadModal; // eslint-disable-line

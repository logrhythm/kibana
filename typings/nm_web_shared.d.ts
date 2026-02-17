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

declare module '@logrhythm/nm-web-shared/hooks/notification_hooks' {
  export function useNotifications(): Array<{ text: string; type?: string }>;
}

declare module '@logrhythm/nm-web-shared/hooks/notistack_hooks' {
  export function useSnackbar(): {
    enqueueError: (message: React.ReactNode) => void;
    enqueueSuccess: (message: React.ReactNode) => void;
    enqueueWarning: (message: React.ReactNode) => void;
    enqueueInfo: (message: React.ReactNode) => void;
  };
}

declare module '@logrhythm/nm-web-shared/contexts/auth_context' {
  import React from 'react';

  export interface AuthContextValue {
    user?: any;
    isAuthenticated: boolean;
    login: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
  }

  export const AuthContext: React.Context<any>;
}

declare module '@logrhythm/nm-web-shared/contexts/blocking_process_context' {
  import React from 'react';

  export interface BlockingProcessContextValue {
    message: string;
    block: (message: string) => void;
    unblock: () => void;
  }

  export const BlockingProcessContext: React.Context<BlockingProcessContextValue>;
  export function useBlockingProcess(): BlockingProcessContextValue;
}

declare module '@logrhythm/nm-web-shared/components/blocking_process/blocking_process_modal' {
  import React from 'react';

  interface Props {
    isOpen: boolean;
    message?: string;
  }

  export const BlockingProcessModal: React.ComponentType<Props>;
}

declare module '@logrhythm/nm-web-shared/components/navigation/navbar/navbar' {
  import React from 'react';

  interface NavbarProps {
    title?: string;
    user?: any;
    onLogout?: () => void;
  }

  export const Navbar: React.ComponentType<NavbarProps>;
}

declare module '@logrhythm/nm-web-shared/services/auth' {
  interface AuthService {
    login(credentials: any): Promise<any>;
    logout(): Promise<void>;
    getCurrentUser(): any;
    isAuthenticated(): boolean;
    subscribe(callback: (state: any) => void): () => void;
  }

  export const Auth: AuthService;
}

declare module '@logrhythm/nm-web-shared/hooks/session_sync_hooks' {
  export function useSessionSync(key?: string): boolean;
}

declare module '@logrhythm/nm-web-shared/services/session_files' {
  export enum DownloadStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    LOCATING = 'locating',
    WAITING = 'waiting',
    DOWNLOADING = 'downloading',
    SUCCESS = 'success',
    FAILURE = 'failure',
    LOADING = 'loading',
    ERROR = 'error',
    PARTIAL_SUCCESS = 'partial-success',
    ABORTED = 'aborted',
  }

  export enum FileType {
    PCAP = 'pcap',
    ATTACHMENT = 'attachment',
    RECONSTRUCTION = 'reconstruction',
  }

  export interface SingleFileStatus {
    id: string;
    status: DownloadStatus;
    progress?: number;
    message?: string | number;
  }

  export interface FileDownloadStatus {
    files?: SingleFileStatus[];
    overallStatus?: DownloadStatus;
    overall: string;
    fileStatuses: Record<string, SingleFileStatus>;
  }

  export function startPcapDownload(sessionIds: string[]): Promise<any>;
  export function startAttachmentDownload(sessionId: string, fileNames?: string[]): Promise<any>;
}

declare module '@logrhythm/nm-web-shared/services/session_file_downloader' {
  export class SessionFileDownloader {
    constructor(
      downloadId: string,
      fileType: string,
      downloadList: any,
      statusUpdatedCb: (info: any) => void,
      toastWarning: (msg: string) => void,
      toastDanger: (msg: string) => void
    );
    startDownload(options?: any): Promise<any>;
    start(): void;
    abort(): void;
    getStatus(): any;
    terminated: boolean;
  }
}

declare module '@logrhythm/nm-web-shared/services/selected_capture_sessions' {
  interface SelectedCaptureSessions {
    subscribeAll(callback: (sessions: any[]) => void): () => void;
    subscribe(session: any, callback: (isSelected: boolean) => void): () => void;
    getSelected(): any[];
    getAll(): any[];
    clear(): void;
    reset(): void;
    count(): number;
    isEmpty(): boolean;
    add(session: any): void;
    remove(session: any): void;
  }

  export const SelectedCaptureSessions: SelectedCaptureSessions;
}

declare module '@logrhythm/nm-web-shared/services/query_rules' {
  export enum QueryRuleSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
  }

  export interface QueryRule {
    id?: string;
    name?: string;
    description?: string;
    query: string;
    severity: QueryRuleSeverity | string;
    enabled?: boolean;
  }

  export interface SaveRuleFormDataValidation {
    id: boolean;
    name?: boolean;
    severity: boolean;
    query: boolean;
    enabled: boolean;
  }

  export function saveQueryRule(id: string, rule: QueryRule): Promise<QueryRule>;
  export function getQueryRules(): Promise<QueryRule[]>;
  export function getTriggerCount(query: string): Promise<number>;
}

declare module '@logrhythm/nm-web-shared/services/query_mapping' {
  export function convertQuery(query: string): string;
}

declare module 'ui/notify' {
  export interface ToastNotifications {
    addSuccess(message: string): void;
    addError(error: Error | string): void;
    addWarning(message: string): void;
    addDanger(message: string): void;
    addInfo(message: string): void;
  }

  export const toastNotifications: ToastNotifications;
}

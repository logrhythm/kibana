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

// NetMon notification service - compatibility layer for legacy toastNotifications
export class NetMonNotifications {
  private notifications: any;

  constructor(notifications?: any) {
    this.notifications = notifications;
  }

  addSuccess(message: string | { title: string; text?: string }, options?: any) {
    if (!this.notifications) return;

    if (typeof message === 'string') {
      this.notifications.toasts.addSuccess(message, options);
    } else {
      this.notifications.toasts.addSuccess(message, options);
    }
  }

  addWarning(message: string | { title: string; text?: string }, options?: any) {
    if (!this.notifications) return;

    if (typeof message === 'string') {
      this.notifications.toasts.addWarning(message, options);
    } else {
      this.notifications.toasts.addWarning(message, options);
    }
  }

  addError(message: string | Error | { title: string; text?: string }, options?: any) {
    if (!this.notifications) return;

    if (typeof message === 'string' || message instanceof Error) {
      this.notifications.toasts.addError(message, options);
    } else {
      this.notifications.toasts.addError(message, options);
    }
  }

  addDanger(message: string | { title: string; text?: string }, options?: any) {
    if (!this.notifications) return;

    if (typeof message === 'string') {
      this.notifications.toasts.addDanger(message, options);
    } else {
      this.notifications.toasts.addDanger(message, options);
    }
  }
}

// Global instance - will be initialized by the application
let netmonNotifications: NetMonNotifications;

export const initializeNotifications = (notifications: any) => {
  netmonNotifications = new NetMonNotifications(notifications);
};

export const toastNotifications = {
  addSuccess: (message: string | { title: string; text?: string }, options?: any) => {
    if (netmonNotifications) {
      netmonNotifications.addSuccess(message, options);
    } else {
      // eslint-disable-next-line no-console
      console.log('Success:', message);
    }
  },
  addWarning: (message: string | { title: string; text?: string }, options?: any) => {
    if (netmonNotifications) {
      netmonNotifications.addWarning(message, options);
    } else {
      // eslint-disable-next-line no-console
      console.warn('Warning:', message);
    }
  },
  addError: (message: string | Error | { title: string; text?: string }, options?: any) => {
    if (netmonNotifications) {
      netmonNotifications.addError(message, options);
    } else {
      // eslint-disable-next-line no-console
      console.error('Error:', message);
    }
  },
  addDanger: (message: string | { title: string; text?: string }, options?: any) => {
    if (netmonNotifications) {
      netmonNotifications.addDanger(message, options);
    } else {
      // eslint-disable-next-line no-console
      console.error('Danger:', message);
    }
  },
};

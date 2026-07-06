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

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { SearchResponse } from 'elasticsearch';
import { ShardFailureOpenModalButton } from '../../ui/shard_failure_modal';
import { toMountPoint } from '../../../../kibana_react/public';
import { getNotifications } from '../../services';
import { SearchRequest } from '..';

// ES error types that indicate user query syntax problems rather than infrastructure issues
const QUERY_PARSING_TYPES = [
  'parsing_exception',
  'query_shard_exception',
  'query_parsing_exception',
  'search_phase_execution_exception',
];

function isShardFailureDueToQuery(response: SearchResponse<any>): boolean {
  const failures: any[] = response._shards?.failures ?? [];
  return failures.some(
    (f) =>
      QUERY_PARSING_TYPES.includes(f?.reason?.type) ||
      QUERY_PARSING_TYPES.includes(f?.reason?.caused_by?.type)
  );
}

// Module-level guard so a dashboard with N panels only shows this toast once per bad query.
// Resets automatically when the user dismisses the toast.
let _invalidQueryToastVisible = false;

export function showInvalidQueryToast() {
  if (_invalidQueryToastVisible) return;

  let notifications;
  try {
    notifications = getNotifications();
  } catch {
    // getNotifications() throws if the data plugin has not started yet; ignore silently
    return;
  }

  _invalidQueryToastVisible = true;

  try {
    const toast = notifications.toasts.addWarning({
      title: i18n.translate('data.search.searchSource.fetch.invalidQueryTitle', {
        defaultMessage: 'Invalid search query',
      }),
      text: toMountPoint(
        <span>
          {i18n.translate('data.search.searchSource.fetch.invalidQueryDescription', {
            defaultMessage:
              'Your search query contains unsupported syntax. Please check your search terms and try again.',
          })}
        </span>
      ),
    });

    // Reset the guard once the toast disappears so future bad queries show it again
    const sub = notifications.toasts.get$().subscribe((toasts) => {
      if (!toasts.find((t) => t.id === toast.id)) {
        _invalidQueryToastVisible = false;
        sub.unsubscribe();
      }
    });
  } catch (e) {
    // If the toast itself fails (e.g. i18n / toMountPoint not ready in ISO build),
    // reset the guard so the next invalid query can try again.
    _invalidQueryToastVisible = false;
  }
}

export function handleResponse(request: SearchRequest, response: SearchResponse<any>) {
  if (response.timed_out) {
    getNotifications().toasts.addWarning({
      title: i18n.translate('data.search.searchSource.fetch.requestTimedOutNotificationMessage', {
        defaultMessage: 'Data might be incomplete because your request timed out',
      }),
    });
  }

  if (response._shards && response._shards.failed) {
    if (isShardFailureDueToQuery(response)) {
      // Replace the raw "N of N shards failed" toast with one user-friendly message
      showInvalidQueryToast();
    } else {
      const title = i18n.translate(
        'data.search.searchSource.fetch.shardsFailedNotificationMessage',
        {
          defaultMessage: '{shardsFailed} of {shardsTotal} shards failed',
          values: {
            shardsFailed: response._shards.failed,
            shardsTotal: response._shards.total,
          },
        }
      );
      const description = i18n.translate(
        'data.search.searchSource.fetch.shardsFailedNotificationDescription',
        {
          defaultMessage: 'The data you are seeing might be incomplete or wrong.',
        }
      );

      const text = toMountPoint(
        <>
          {description}
          <EuiSpacer size="s" />
          <ShardFailureOpenModalButton request={request.body} response={response} title={title} />
        </>
      );

      getNotifications().toasts.addWarning({ title, text });
    }
  }

  return response;
}

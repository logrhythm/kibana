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

// Shard failure reason types that indicate a user query syntax problem
const QUERY_PARSING_ERROR_TYPES = [
  'parsing_exception',
  'query_shard_exception',
  'query_parsing_exception',
];

function isQueryParsingError(response: SearchResponse<any>): boolean {
  const failures: any[] = response._shards?.failures ?? [];
  return failures.some(
    (f) =>
      QUERY_PARSING_ERROR_TYPES.includes(f?.reason?.type) ||
      QUERY_PARSING_ERROR_TYPES.includes(f?.reason?.caused_by?.type)
  );
}

// Prevents the "Invalid search query" toast from appearing multiple times when
// a dashboard fires one search per panel and all panels receive the same error.
let queryParsingToastVisible = false;

export function handleResponse(request: SearchRequest, response: SearchResponse<any>) {
  if (response.timed_out) {
    getNotifications().toasts.addWarning({
      title: i18n.translate('data.search.searchSource.fetch.requestTimedOutNotificationMessage', {
        defaultMessage: 'Data might be incomplete because your request timed out',
      }),
    });
  }

  if (response._shards && response._shards.failed) {
    if (isQueryParsingError(response)) {
      // Show a user-friendly message when the failure is caused by invalid query syntax.
      // Guard with a flag so that a dashboard with many panels only shows this once.
      if (!queryParsingToastVisible) {
        queryParsingToastVisible = true;
        const toast = getNotifications().toasts.addWarning({
          title: i18n.translate('data.search.searchSource.fetch.queryParsingErrorTitle', {
            defaultMessage: 'Invalid search query',
          }),
          text: toMountPoint(
            <>
              {i18n.translate('data.search.searchSource.fetch.queryParsingErrorDescription', {
                defaultMessage:
                  'Your search query contains unsupported syntax. Please check your search terms and try again.',
              })}
            </>
          ),
        });
        // Reset the flag once the toast is dismissed (removed from the list) so that
        // a subsequent invalid search will show the toast again.
        const sub = getNotifications()
          .toasts.get$()
          .subscribe((toasts) => {
            if (!toasts.find((t) => t.id === toast.id)) {
              queryParsingToastVisible = false;
              sub.unsubscribe();
            }
          });
      }
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

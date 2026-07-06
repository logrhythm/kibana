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
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddableError } from '../embeddables/i_embeddable';

interface Props {
  error?: EmbeddableError;
}

function isQuerySyntaxError(error: EmbeddableError): boolean {
  if (error.name === 'QuerySyntaxError') return true;
  const msg = error.message ?? '';
  return (
    msg.includes('search_phase_execution_exception') ||
    msg.includes('all shards failed') ||
    msg.includes('parsing_exception') ||
    msg.includes('query_shard_exception')
  );
}

export function EmbeddableErrorLabel(props: Props) {
  if (!props.error) return null;

  // LOGRHYTHM FIX: Hide abort errors completely to prevent "Aborted" labels in dashboard tables
  if (props.error.name === 'AbortError') {
    return null;
  }

  // Also check error message for abort-related content
  if (
    props.error.message &&
    (props.error.message.includes('abort') ||
      props.error.message.includes('Request aborted') ||
      props.error.message.includes('The user aborted'))
  ) {
    return null;
  }

  // Hide the "Error" badge for query syntax errors — a single user-friendly toast is shown instead
  if (isQuerySyntaxError(props.error)) {
    return null;
  }

  const labelText = i18n.translate('embeddableApi.panel.labelError', {
    defaultMessage: 'Error',
  });

  return (
    <div className="embPanel__labelWrapper">
      <div className="embPanel__label">
        <EuiToolTip data-test-subj="embeddableErrorMessage" content={props.error.message}>
          <EuiBadge data-test-subj="embeddableErrorLabel" color="danger">
            {labelText}
          </EuiBadge>
        </EuiToolTip>
      </div>
    </div>
  );
}

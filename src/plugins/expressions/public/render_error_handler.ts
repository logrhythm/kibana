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

import { i18n } from '@kbn/i18n';
import { RenderErrorHandlerFnType, ExpressionRenderError } from './types';
import { getNotifications } from './services';
import { IInterpreterRenderHandlers } from '../common';

// Matches errors caused by invalid user query syntax. Checks both the tagged name (set in
// search_interceptor.ts) and message content because the expression pipeline's createError()
// prepends "[fnName] > " to the message but preserves the Error.name.
function isQuerySyntaxError(error: ExpressionRenderError): boolean {
  if (error.name === 'QuerySyntaxError') return true;
  const msg = error.message ?? '';
  return (
    msg.includes('search_phase_execution_exception') ||
    msg.includes('all shards failed') ||
    msg.includes('parsing_exception') ||
    msg.includes('query_shard_exception')
  );
}

export const renderErrorHandler: RenderErrorHandlerFnType = (
  element: HTMLElement,
  error: ExpressionRenderError,
  handlers: IInterpreterRenderHandlers
) => {
  if (error.name === 'AbortError') {
    handlers.done();
    return;
  }

  // Suppress "Error in visualisation" toast for query syntax errors.
  // The single user-friendly "Invalid search query" toast is shown by showInvalidQueryToast()
  // via handle_response.tsx (Path A) or search_interceptor.ts (Path B).
  if (isQuerySyntaxError(error)) {
    handlers.done();
    return;
  }

  getNotifications().toasts.addError(error, {
    title: i18n.translate('expressions.defaultErrorRenderer.errorTitle', {
      defaultMessage: 'Error in visualisation',
    }),
    toastMessage: error.message,
  });
  handlers.done();
};

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

import { get, trimEnd, debounce } from 'lodash';
import { BehaviorSubject, throwError, timer, defer, from, Observable, NEVER } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { CoreStart, CoreSetup, ToastsSetup } from 'kibana/public';
import {
  getCombinedSignal,
  AbortError,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
  ES_SEARCH_STRATEGY,
} from '../../common';
import { SearchUsageCollector } from './collectors';
import { SearchTimeoutError, PainlessError, isPainlessError, TimeoutErrorMode } from './errors';
import { toMountPoint } from '../../../kibana_react/public';
import { showInvalidQueryToast } from './fetch/handle_response';

// Detects whether an HTTP-level error from the search route is caused by invalid query syntax.
// The server route (search.ts) forwards err.body.error into attributes.error, so for a
// search_phase_execution_exception the shape is: e.body.attributes.error.type
function isQuerySyntaxError(e: any): boolean {
  const attrError = e?.body?.attributes?.error;
  if (!attrError) return false;
  const type =
    (typeof attrError === 'object' ? attrError.type : undefined) ||
    attrError?.caused_by?.type ||
    attrError?.root_cause?.[0]?.type;
  const QUERY_ERR_TYPES = [
    'search_phase_execution_exception',
    'parsing_exception',
    'query_shard_exception',
    'query_parsing_exception',
  ];
  return QUERY_ERR_TYPES.includes(type);
}

export interface SearchInterceptorDeps {
  http: CoreSetup['http'];
  uiSettings: CoreSetup['uiSettings'];
  startServices: Promise<[CoreStart, any, unknown]>;
  toasts: ToastsSetup;
  usageCollector?: SearchUsageCollector;
}

export class SearchInterceptor {
  /**
   * `abortController` used to signal all searches to abort.
   *  @internal
   */
  protected abortController = new AbortController();

  /**
   * Observable that emits when the number of pending requests changes.
   * @internal
   */
  protected pendingCount$ = new BehaviorSubject(0);

  /**
   * @internal
   */
  protected application!: CoreStart['application'];

  /*
   * @internal
   */
  constructor(protected readonly deps: SearchInterceptorDeps) {
    this.deps.http.addLoadingCountSource(this.pendingCount$);

    this.deps.startServices.then(([coreStart]) => {
      this.application = coreStart.application;
    });
  }

  /*
   * @returns `TimeoutErrorMode` indicating what action should be taken in case of a request timeout based on license and permissions.
   * @internal
   */
  protected getTimeoutMode() {
    return TimeoutErrorMode.UPGRADE;
  }

  /*
   * @returns `Error` a search service specific error or the original error, if a specific error can't be recognized.
   * @internal
   */
  protected handleSearchError(
    e: any,
    request: IKibanaSearchRequest,
    timeoutSignal: AbortSignal,
    appAbortSignal?: AbortSignal
  ): Error {
    if (timeoutSignal.aborted || get(e, 'body.message') === 'Request timed out') {
      // Handle a client or a server side timeout
      const err = new SearchTimeoutError(e, this.getTimeoutMode());

      // Show the timeout error here, so that it's shown regardless of how an application chooses to handle errors.
      this.showTimeoutError(err);
      return err;
    } else if (appAbortSignal?.aborted) {
      // LOGRHYTHM FIX: Enhance AbortError handling to prevent UI display
      // In the case an application initiated abort, create a proper AbortError that will be suppressed
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      return abortError;
    } else if (isPainlessError(e)) {
      return new PainlessError(e, request);
    } else if (isQuerySyntaxError(e)) {
      // Use the ES error body message (e.g. "[search_phase_execution_exception]: all shards failed")
      // rather than the HTTP status text ("Bad Request") so the message survives the expression
      // pipeline and the message-based checks in onContainerError can match it.
      const message = e?.body?.message || e?.message || 'Invalid search query';
      const tagged = new Error(message);
      tagged.name = 'QuerySyntaxError';
      return tagged;
    } else {
      return e;
    }
  }

  /**
   * @internal
   */
  protected runSearch(
    request: IKibanaSearchRequest,
    signal: AbortSignal,
    strategy?: string
  ): Observable<IKibanaSearchResponse> {
    const { id, ...searchRequest } = request;
    const path = trimEnd(`/internal/search/${strategy || ES_SEARCH_STRATEGY}/${id || ''}`, '/');
    const body = JSON.stringify(searchRequest);
    return from(
      this.deps.http.fetch({
        method: 'POST',
        path,
        body,
        signal,
      })
    );
  }

  /**
   * @internal
   */
  protected setupAbortSignal({
    abortSignal,
    timeout,
  }: {
    abortSignal?: AbortSignal;
    timeout?: number;
  }) {
    // Schedule this request to automatically timeout after some interval
    const timeoutController = new AbortController();
    const { signal: timeoutSignal } = timeoutController;
    const timeout$ = timeout ? timer(timeout) : NEVER;
    const subscription = timeout$.subscribe(() => {
      timeoutController.abort();
    });

    // Get a combined `AbortSignal` that will be aborted whenever the first of the following occurs:
    // 1. The user manually aborts (via `cancelPending`)
    // 2. The request times out
    // 3. The passed-in signal aborts (e.g. when re-fetching, or whenever the app determines)
    const signals = [
      this.abortController.signal,
      timeoutSignal,
      ...(abortSignal ? [abortSignal] : []),
    ];

    const combinedSignal = getCombinedSignal(signals);
    const cleanup = () => {
      subscription.unsubscribe();
    };

    combinedSignal.addEventListener('abort', cleanup);

    return {
      combinedSignal,
      timeoutSignal,
      cleanup,
    };
  }

  /**
   * Right now we are throttling but we will hook this up with background sessions to show only one
   * error notification per session.
   * @internal
   */
  private showTimeoutError = debounce(
    (e: SearchTimeoutError) => {
      this.deps.toasts.addDanger({
        title: 'Timed out',
        text: toMountPoint(e.getErrorMessage(this.application)),
      });
    },
    30000,
    { leading: true, trailing: false }
  );

  /**
   * Searches using the given `search` method. Overrides the `AbortSignal` with one that will abort
   * either when `cancelPending` is called, when the request times out, or when the original
   * `AbortSignal` is aborted. Updates `pendingCount$` when the request is started/finalized.
   *
   * @param request
   * @options
   * @returns `Observalbe` emitting the search response or an error.
   */
  public search(
    request: IKibanaSearchRequest,
    options?: ISearchOptions
  ): Observable<IKibanaSearchResponse> {
    // Defer the following logic until `subscribe` is actually called
    return defer(() => {
      if (options?.abortSignal?.aborted) {
        return throwError(new AbortError());
      }

      const { timeoutSignal, combinedSignal, cleanup } = this.setupAbortSignal({
        abortSignal: options?.abortSignal,
      });
      this.pendingCount$.next(this.pendingCount$.getValue() + 1);

      return this.runSearch(request, combinedSignal, options?.strategy).pipe(
        catchError((e: any) => {
          return throwError(
            this.handleSearchError(e, request, timeoutSignal, options?.abortSignal)
          );
        }),
        finalize(() => {
          this.pendingCount$.next(this.pendingCount$.getValue() - 1);
          cleanup();
        })
      );
    });
  }

  /*
   *
   */
  public showError(e: Error) {
    // LOGRHYTHM FIX: Enhanced abort error detection to prevent "aborted" messages during typing
    if (e instanceof AbortError) return;
    if (e.name === 'AbortError') return;
    if (e.message && (e.message.includes('aborted') || e.message.includes('Request aborted')))
      return;

    if (e instanceof SearchTimeoutError) {
      // The SearchTimeoutError is shown by the interceptor in getSearchError (regardless of how the app chooses to handle errors)
      return;
    }

    if (e instanceof PainlessError) {
      this.deps.toasts.addDanger({
        title: 'Search Error',
        text: toMountPoint(e.getErrorMessage(this.application)),
      });
      return;
    }

    // Show the single user-friendly toast for query syntax errors (HTTP 400 full-failure path)
    if (e.name === 'QuerySyntaxError') {
      showInvalidQueryToast();
      return;
    }

    // LOGRHYTHM FIX: Additional check to prevent any abort-related errors from showing as toasts
    if (
      e.name === 'AbortError' ||
      (e.message &&
        (e.message.includes('abort') ||
          e.message.includes('Request aborted') ||
          e.message.includes('The user aborted')))
    ) {
      return;
    }

    this.deps.toasts.addError(e, {
      title: 'Search Error',
    });
  }
}

export type ISearchInterceptor = PublicMethodsOf<SearchInterceptor>;

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

import {
  ICompileProvider,
  IHttpProvider,
  IHttpService,
  ILocationProvider,
  ILocationService,
  IModule,
  IRootScopeService,
} from 'angular';
import $ from 'jquery';
import { cloneDeep, forOwn, set } from 'lodash';
import React, { Fragment } from 'react';
import * as Rx from 'rxjs';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { format as formatUrl, parse as parseUrl } from 'url';
import type { CoreStart, LegacyCoreStart } from '../../../core/public';

// Legacy UI imports replaced with new platform equivalents
// @ts-ignore
import { UrlOverflowService } from '../error_url_overflow';
import { npStart } from '../new_platform';
import { toastNotifications } from '../notify';
// @ts-ignore
import { isSystemApiRequest } from '../system_api';

const URL_LIMIT_WARN_WITHIN = 1000;

// Enhanced capabilities with comprehensive fallbacks for all plugins
const createDefaultCapabilities = () => ({
  discover: {
    save: true,
    saveQuery: true,
    show: true,
    createShortUrl: true,
  },
  dashboard: {
    createNew: true,
    save: true,
    saveQuery: true,
    show: true,
    showWriteControls: true,
    storeSearchSession: true,
  },
  visualize: {
    createShortUrl: true,
    delete: true,
    save: true,
    saveQuery: true,
    show: true,
  },
  canvas: {
    save: true,
    show: true,
  },
  maps: {
    save: true,
    show: true,
  },
  ml: {
    canAccessML: false,
    canCreateJob: false,
    canDeleteJob: false,
  },
  management: {
    kibana: {
      settings: true,
      objects: true,
      indexPatterns: true,
      savedObjectsManagement: true,
      spaces: false,
      users: false,
      roles: false,
    },
  },
  navLinks: {
    discover: true,
    dashboard: true,
    visualize: true,
    canvas: false,
    maps: false,
    ml: false,
    management: true,
    dev_tools: false,
    monitoring: false,
  },
  catalogue: {
    discover: true,
    dashboard: true,
    visualize: true,
    console: false,
    advanced_settings: true,
    index_patterns: true,
  },
});

const capabilities = {
  get: () => {
    try {
      const platformCapabilities = npStart?.application?.capabilities;

      // Always start with default capabilities as base
      const defaultCaps = createDefaultCapabilities();

      if (
        platformCapabilities &&
        typeof platformCapabilities === 'object' &&
        Object.keys(platformCapabilities).length > 0
      ) {
        // Merge platform capabilities with defaults, ensuring no undefined values
        const mergedCaps = { ...defaultCaps };

        Object.keys(platformCapabilities).forEach((key) => {
          if (platformCapabilities[key] && typeof platformCapabilities[key] === 'object') {
            mergedCaps[key] = {
              ...defaultCaps[key],
              ...platformCapabilities[key],
            };
          }
        });

        return mergedCaps;
      }

      return defaultCaps;
    } catch (error) {
      return createDefaultCapabilities();
    }
  },
};

const fatalError = (error: Error) => {
  try {
    if (npStart?.fatalErrors?.add) {
      npStart.fatalErrors.add(error);
    } else {
      // console.error('Fatal error (npStart not available):', error);
    }
  } catch (e) {
    // console.error('Fatal error (error handler failed):', error);
  }
};

const modifyUrl = (url: string, modifier: (parts: any) => void) => {
  const parsed = parseUrl(url, true);
  modifier(parsed);
  return formatUrl(parsed);
};

export const configureAppAngularModule = (
  angularModule: IModule,
  coreStart?: any,
  ...otherArgs: any[]
) => {
  // Use provided coreStart parameter or fall back to npStart
  // Handle different calling conventions (sometimes coreStart.core, sometimes direct coreStart)
  const newPlatform = coreStart?.core || coreStart || npStart;

  if (!newPlatform) {
    return;
  }

  // Use fallback approach when injectedMetadata is not available
  const hasInjectedMetadata =
    newPlatform.injectedMetadata &&
    typeof newPlatform.injectedMetadata.getKibanaVersion === 'function';

  let legacyMetadata: any = {};

  if (hasInjectedMetadata) {
    try {
      // Try to get legacy metadata, fallback to using getInjectedVar for individual values
      legacyMetadata = newPlatform.injectedMetadata.getLegacyMetadata
        ? newPlatform.injectedMetadata.getLegacyMetadata()
        : {};
    } catch (error) {
      legacyMetadata = {};
    }

    // Safely get injected vars
    try {
      const injectedVars = newPlatform.injectedMetadata.getInjectedVars
        ? newPlatform.injectedMetadata.getInjectedVars()
        : {};

      forOwn(injectedVars, (val, name) => {
        if (name !== undefined) {
          // The legacy platform modifies some of these values, clone to an unfrozen object.
          angularModule.value(name, cloneDeep(val));
        }
      });
    } catch (error) {
      // console.warn('Could not set injected vars:', error);
    }
  }

  // Safely configure angular module with fallbacks
  try {
    const kbnVersion = hasInjectedMetadata
      ? newPlatform.injectedMetadata.getKibanaVersion?.() || '7.10.2'
      : '7.10.2';
    const buildNum = hasInjectedMetadata
      ? legacyMetadata.buildNum ||
        newPlatform.injectedMetadata.getInjectedVar?.('buildNum') ||
        'unknown'
      : 'unknown';
    const buildSha = hasInjectedMetadata
      ? legacyMetadata.buildSha ||
        newPlatform.injectedMetadata.getInjectedVar?.('buildSha') ||
        'unknown'
      : 'unknown';
    const serverName = hasInjectedMetadata
      ? legacyMetadata.serverName ||
        newPlatform.injectedMetadata.getInjectedVar?.('serverName') ||
        'kibana'
      : 'kibana';

    const uiCapabilities = capabilities.get();

    angularModule
      .value('kbnVersion', kbnVersion)
      .value('buildNum', buildNum)
      .value('buildSha', buildSha)
      .value('serverName', serverName)
      .value('sessionId', Date.now())
      .value('esUrl', getEsUrl(newPlatform))
      .value('uiCapabilities', uiCapabilities)
      // Additional safety injection for discover specifically
      .constant('discoverCapabilities', {
        save: true,
        saveQuery: true,
        show: true,
        createShortUrl: true,
      })
      // Global capability service for fallback
      .service('capabilityService', function () {
        this.get = function () {
          return uiCapabilities;
        };
        this.discover = uiCapabilities.discover || {
          save: true,
          saveQuery: true,
          show: true,
          createShortUrl: true,
        };
      });

    // Configure providers with error handling
    try {
      angularModule.config(setupCompileProvider(newPlatform));
    } catch (error) {
      // console.warn('Failed to setup compile provider:', error);
    }

    try {
      angularModule.config(setupLocationProvider(newPlatform));
    } catch (error) {
      // console.warn('Failed to setup location provider:', error);
    }

    try {
      angularModule.config($setupXsrfRequestInterceptor(newPlatform));
    } catch (error) {
      // console.warn('Failed to setup XSRF interceptor:', error);
    }

    // Run setup functions with error handling
    try {
      // HTTP loading count with explicit injection
      angularModule.run([
        '$rootScope',
        '$http',
        function ($rootScope: any, $http: any) {
          try {
            capture$httpLoadingCount(newPlatform)($rootScope, $http);
          } catch (error) {
            // console.warn('HTTP loading count setup failed:', error);
          }
        },
      ]);
    } catch (error) {
      // console.warn('Failed to setup HTTP loading count:', error);
    }

    try {
      // Breadcrumbs auto clear with explicit injection
      angularModule.run([
        '$rootScope',
        '$injector',
        function ($rootScope: any, $injector: any) {
          try {
            $setupBreadcrumbsAutoClear(newPlatform)($rootScope, $injector);
          } catch (error) {
            // console.warn('Breadcrumbs auto clear setup failed:', error);
          }
        },
      ]);
    } catch (error) {
      // console.warn('Failed to setup breadcrumbs auto clear:', error);
    }

    try {
      // Badge auto clear with explicit injection
      angularModule.run([
        '$rootScope',
        '$injector',
        function ($rootScope: any, $injector: any) {
          try {
            $setupBadgeAutoClear(newPlatform)($rootScope, $injector);
          } catch (error) {
            // console.warn('Badge auto clear setup failed:', error);
          }
        },
      ]);
    } catch (error) {
      // console.warn('Failed to setup badge auto clear:', error);
    }

    try {
      // Help extension auto clear with explicit injection
      angularModule.run([
        '$rootScope',
        '$injector',
        function ($rootScope: any, $injector: any) {
          try {
            $setupHelpExtensionAutoClear(newPlatform)($rootScope, $injector);
          } catch (error) {
            // console.warn('Help extension auto clear setup failed:', error);
          }
        },
      ]);
    } catch (error) {
      // console.warn('Failed to setup help extension auto clear:', error);
    }

    try {
      // URL overflow handling with explicit injection to avoid dependency issues
      angularModule.run([
        '$location',
        '$rootScope',
        '$injector',
        function ($location: any, $rootScope: any, $injector: any) {
          try {
            // Get config safely
            const config = $injector.has('config') ? $injector.get('config') : null;
            if (config) {
              $setupUrlOverflowHandling(newPlatform)($location, $rootScope, config);
            }
          } catch (error) {
            // console.warn('URL overflow handling setup failed:', error);
          }
        },
      ]);
    } catch (error) {
      // console.warn('Failed to setup URL overflow handling:', error);
    }
  } catch (configError) {
    // console.warn('Error configuring angular module:', configError);
  }
};

const getEsUrl = (newPlatform: any) => {
  try {
    const a = document.createElement('a');
    const basePath = newPlatform.http?.basePath?.prepend || ((path: string) => path);
    a.href = basePath('/elasticsearch');
    const protocolPort = /https/.test(a.protocol) ? 443 : 80;
    const port = a.port || protocolPort;
    return {
      host: a.hostname,
      port,
      protocol: a.protocol,
      pathname: a.pathname,
    };
  } catch (error) {
    // Fallback URL structure
    return {
      host: 'localhost',
      port: 80,
      protocol: 'http:',
      pathname: '/elasticsearch',
    };
  }
};

const setupCompileProvider = (newPlatform: any) => ($compileProvider: ICompileProvider) => {
  try {
    const hasMetadata =
      newPlatform.injectedMetadata &&
      typeof newPlatform.injectedMetadata.getLegacyMetadata === 'function';
    const legacyMetadata = hasMetadata ? newPlatform.injectedMetadata.getLegacyMetadata() : null;

    if (!legacyMetadata?.devMode) {
      $compileProvider.debugInfoEnabled(false);
    }
  } catch (error) {
    // Default to production mode if unable to get dev mode setting
    $compileProvider.debugInfoEnabled(false);
  }
};

const setupLocationProvider = (newPlatform: any) => ($locationProvider: ILocationProvider) => {
  try {
    $locationProvider.html5Mode({
      enabled: false,
      requireBase: false,
      rewriteLinks: false,
    });

    $locationProvider.hashPrefix('');
  } catch (error) {
    // console.warn('Could not setup location provider:', error);
  }
};

export const $setupXsrfRequestInterceptor = (newPlatform: any) => {
  let version = '7.10.2'; // fallback version
  try {
    const hasMetadata =
      newPlatform.injectedMetadata &&
      typeof newPlatform.injectedMetadata.getLegacyMetadata === 'function';
    if (hasMetadata) {
      const legacyMetadata = newPlatform.injectedMetadata.getLegacyMetadata();
      version =
        legacyMetadata?.version ||
        newPlatform.injectedMetadata?.getInjectedVar?.('version') ||
        '7.10.2';
    }
  } catch (error) {
    // Use fallback version if unable to get from metadata
  }

  // Configure jQuery prefilter
  $.ajaxPrefilter(({ kbnXsrfToken = true }: any, originalOptions, jqXHR) => {
    if (kbnXsrfToken) {
      jqXHR.setRequestHeader('kbn-version', version);
    }
  });

  return ($httpProvider: IHttpProvider) => {
    // Configure $httpProvider interceptor
    $httpProvider.interceptors.push(() => {
      return {
        request(opts) {
          const { kbnXsrfToken = true } = opts as any;
          if (kbnXsrfToken) {
            set(opts, ['headers', 'kbn-version'], version);
          }
          return opts;
        },
      };
    });
  };
};

/**
 * Injected into angular module by ui/chrome angular integration
 * and adds a root-level watcher that will capture the count of
 * active $http requests on each digest loop and expose the count to
 * the core.loadingCount api
 * @param  {Angular.Scope} $rootScope
 * @param  {HttpService} $http
 * @return {undefined}
 */
const capture$httpLoadingCount =
  (newPlatform: any) => ($rootScope: IRootScopeService, $http: IHttpService) => {
    try {
      // Check if addLoadingCount method exists
      if (newPlatform.http && typeof newPlatform.http.addLoadingCount === 'function') {
        newPlatform.http.addLoadingCount(
          new Rx.Observable((observer) => {
            const unwatch = $rootScope.$watch(() => {
              const reqs = $http.pendingRequests || [];
              observer.next(reqs.filter((req) => !isSystemApiRequest(req)).length);
            });

            return unwatch;
          })
        );
      }
    } catch (error) {
      // Silently handle if loading count setup fails
      // console.warn('Could not setup HTTP loading count tracking:', error);
    }
  };

/**
 * internal angular run function that will be called when angular bootstraps and
 * lets us integrate with the angular router so that we can automatically clear
 * the breadcrumbs if we switch to a Kibana app that does not use breadcrumbs correctly
 */
const $setupBreadcrumbsAutoClear =
  (newPlatform: any) => ($rootScope: IRootScopeService, $injector: any) => {
    try {
      // A flag used to determine if we should automatically
      // clear the breadcrumbs between angular route changes.
      let breadcrumbSetSinceRouteChange = false;
      const $route = $injector.has('$route') ? $injector.get('$route') : {};

      // Check if chrome services are available
      if (newPlatform.chrome && typeof newPlatform.chrome.getBreadcrumbs$ === 'function') {
        // reset breadcrumbSetSinceRouteChange any time the breadcrumbs change, even
        // if it was done directly through the new platform
        newPlatform.chrome.getBreadcrumbs$().subscribe({
          next() {
            breadcrumbSetSinceRouteChange = true;
          },
        });
      }

      $rootScope.$on('$routeChangeStart', () => {
        breadcrumbSetSinceRouteChange = false;
      });

      $rootScope.$on('$routeChangeSuccess', () => {
        const current = $route.current || {};

        if (breadcrumbSetSinceRouteChange || (current.$$route && current.$$route.redirectTo)) {
          return;
        }

        const k7BreadcrumbsProvider = current.k7Breadcrumbs;
        if (!k7BreadcrumbsProvider) {
          if (newPlatform.chrome && typeof newPlatform.chrome.setBreadcrumbs === 'function') {
            newPlatform.chrome.setBreadcrumbs([]);
          }
          return;
        }

        try {
          if (newPlatform.chrome && typeof newPlatform.chrome.setBreadcrumbs === 'function') {
            newPlatform.chrome.setBreadcrumbs($injector.invoke(k7BreadcrumbsProvider));
          }
        } catch (error) {
          fatalError(error);
        }
      });
    } catch (error) {
      // console.warn('Could not setup breadcrumbs auto clear:', error);
    }
  };

/**
 * internal angular run function that will be called when angular bootstraps and
 * lets us integrate with the angular router so that we can automatically clear
 * the badge if we switch to a Kibana app that does not use the badge correctly
 */
const $setupBadgeAutoClear =
  (newPlatform: any) => ($rootScope: IRootScopeService, $injector: any) => {
    try {
      // A flag used to determine if we should automatically
      // clear the badge between angular route changes.
      let badgeSetSinceRouteChange = false;
      const $route = $injector.has('$route') ? $injector.get('$route') : {};

      $rootScope.$on('$routeChangeStart', () => {
        badgeSetSinceRouteChange = false;
      });

      $rootScope.$on('$routeChangeSuccess', () => {
        const current = $route.current || {};

        if (badgeSetSinceRouteChange || (current.$$route && current.$$route.redirectTo)) {
          return;
        }

        const badgeProvider = current.badge;
        if (!badgeProvider) {
          if (newPlatform.chrome && typeof newPlatform.chrome.setBadge === 'function') {
            newPlatform.chrome.setBadge(undefined);
          }
          return;
        }

        try {
          if (newPlatform.chrome && typeof newPlatform.chrome.setBadge === 'function') {
            newPlatform.chrome.setBadge($injector.invoke(badgeProvider));
          }
        } catch (error) {
          fatalError(error);
        }
      });
    } catch (error) {
      // console.warn('Could not setup badge auto clear:', error);
    }
  };

/**
 * internal angular run function that will be called when angular bootstraps and
 * lets us integrate with the angular router so that we can automatically clear
 * the helpExtension if we switch to a Kibana app that does not set its own
 * helpExtension
 */
const $setupHelpExtensionAutoClear =
  (newPlatform: any) => ($rootScope: IRootScopeService, $injector: any) => {
    try {
      /**
       * reset helpExtensionSetSinceRouteChange any time the helpExtension changes, even
       * if it was done directly through the new platform
       */
      let helpExtensionSetSinceRouteChange = false;

      if (newPlatform.chrome && typeof newPlatform.chrome.getHelpExtension$ === 'function') {
        newPlatform.chrome.getHelpExtension$().subscribe({
          next() {
            helpExtensionSetSinceRouteChange = true;
          },
        });
      }

      const $route = $injector.has('$route') ? $injector.get('$route') : {};

      $rootScope.$on('$routeChangeStart', () => {
        helpExtensionSetSinceRouteChange = false;
      });

      $rootScope.$on('$routeChangeSuccess', () => {
        const current = $route.current || {};

        if (helpExtensionSetSinceRouteChange || (current.$$route && current.$$route.redirectTo)) {
          return;
        }

        if (newPlatform.chrome && typeof newPlatform.chrome.setHelpExtension === 'function') {
          newPlatform.chrome.setHelpExtension(current.helpExtension);
        }
      });
    } catch (error) {
      // console.warn('Could not setup help extension auto clear:', error);
    }
  };

const $setupUrlOverflowHandling =
  (newPlatform: any) =>
  ($location: ILocationService, $rootScope: IRootScopeService, config: any) => {
    try {
      const urlOverflow = new UrlOverflowService();
      const check = () => {
        try {
          // disable long url checks when storing state in session storage
          if (config.get('state:storeInSessionStorage')) {
            return;
          }

          if ($location.path() === '/error/url-overflow') {
            return;
          }

          if (urlOverflow.check($location.absUrl()) <= URL_LIMIT_WARN_WITHIN) {
            toastNotifications.addWarning({
              title: i18n.translate('common.ui.chrome.bigUrlWarningNotificationTitle', {
                defaultMessage: 'The URL is big and NetMon-UI might stop working',
              }),
              text: (
                <Fragment>
                  <FormattedMessage
                    id="common.ui.chrome.bigUrlWarningNotificationMessage"
                    defaultMessage="Either enable the {storeInSessionStorageParam} option
                    in {advancedSettingsLink} or simplify the onscreen visuals."
                    values={{
                      storeInSessionStorageParam: <code>state:storeInSessionStorage</code>,
                      advancedSettingsLink: (
                        <a href="#/management/kibana/settings">
                          <FormattedMessage
                            id="common.ui.chrome.bigUrlWarningNotificationMessage.advancedSettingsLinkText"
                            defaultMessage="advanced settings"
                          />
                        </a>
                      ),
                    }}
                  />
                </Fragment>
              ),
            });
          }
        } catch (e) {
          window.location.href = modifyUrl(window.location.href, (parts: any) => {
            parts.hash = '#/error/url-overflow';
          });
          // force the browser to reload to that Kibana's potentially unstable state is unloaded
          window.location.reload();
        }
      };

      $rootScope.$on('$routeUpdate', check);
      $rootScope.$on('$routeChangeStart', check);
    } catch (error) {
      // console.warn('Could not setup URL overflow handling:', error);
    }
  };

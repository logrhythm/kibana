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

import { PluginInitializerContext, CoreStart, CoreSetup } from '../../../core/public';
import { ConfigSchema } from '../config';
import { getDashboardConfig } from './dashboard_config';
import { injectHeaderStyle } from './utils/inject_header_style';
import { setNpStart } from './new_platform';

export class KibanaLegacyPlugin {
  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(core: CoreSetup<{}, KibanaLegacyStart>) {
    return {};
  }

  public start(core: CoreStart) {
    const { application, uiSettings } = core;

    // Initialize the new platform compatibility layer
    setNpStart(core);

    // Error handling setup for subscribe calls

    // Add safety wrapper for subscribe calls
    try {
      // Patch common observable subscribe methods to add safety
      if (typeof window !== 'undefined' && (window as any).Rx) {
        const rxObservable = (window as any).Rx.Observable;
        if (rxObservable && rxObservable.prototype && rxObservable.prototype.subscribe) {
          const originalSubscribe = rxObservable.prototype.subscribe;
          rxObservable.prototype.subscribe = function (...args: any[]) {
            if (this == null || this === undefined) {
              return { unsubscribe: () => {} };
            }
            return originalSubscribe.apply(this, args);
          };
        }
      }
    } catch (patchError) {
      // Silently handle patch errors
    }

    injectHeaderStyle(uiSettings);
    return {
      /**
       * Used to power dashboard mode. Should be removed when dashboard mode is removed eventually.
       * @deprecated
       */
      dashboardConfig: getDashboardConfig(!application.capabilities.dashboard.showWriteControls),
      /**
       * Loads the font-awesome icon font. Should be removed once the last consumer has migrated to EUI
       * @deprecated
       */
      loadFontAwesome: async () => {
        await import('./font_awesome');
      },
      /**
       * @deprecated
       * Just exported for wiring up with dashboard mode, should not be used.
       */
      config: this.initializerContext.config.get(),
    };
  }
}

export type KibanaLegacySetup = ReturnType<KibanaLegacyPlugin['setup']>;
export type KibanaLegacyStart = ReturnType<KibanaLegacyPlugin['start']>;

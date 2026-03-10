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
    const { application, chrome, uiSettings } = core;

    // Initialize the new platform compatibility layer
    setNpStart(core);

    // Comprehensive NetMon dashboard setup for LogRhythm navbar
    const setupNetMonDashboards = () => {
      const dashboards = [
        {
          id: 'Alarm-Trend-Dashboard',
          title: 'Alarm Trend Dashboard',
          url: '/analyze/app/dashboards#/view/Alarm-Trend-Dashboard',
        },
        {
          id: 'Alarms-Dashboard',
          title: 'Alarms Dashboard',
          url: '/analyze/app/dashboards#/view/Alarms-Dashboard',
        },
        {
          id: 'Application-Exploration-Dashboard',
          title: 'Application Exploration Dashboard',
          url: '/analyze/app/dashboards#/view/Application-Exploration-Dashboard',
        },
        {
          id: 'Capture-Dashboard',
          title: 'Capture Dashboard',
          url: '/analyze/app/dashboards#/view/Capture-Dashboard',
        },
        {
          id: 'Destination-Port-Dashboard',
          title: 'Destination Port Dashboard',
          url: '/analyze/app/dashboards#/view/Destination-Port-Dashboard',
        },
        {
          id: 'File-Reconstruction-Dashboard',
          title: 'File Reconstruction Dashboard',
          url: '/analyze/app/dashboards#/view/File-Reconstruction-Dashboard',
        },
        {
          id: 'Ingress-Egress-Traffic-Dashboard',
          title: 'Ingress/Egress Traffic Dashboard',
          url: '/analyze/app/dashboards#/view/Ingress-Egress-Traffic-Dashboard',
        },
        {
          id: 'Network-Analysis-Dashboard',
          title: 'Network Analysis Dashboard',
          url: '/analyze/app/dashboards#/view/Network-Analysis-Dashboard',
        },
        {
          id: 'Replayed-Traffic-Dashboard',
          title: 'Replayed Traffic Dashboard',
          url: '/analyze/app/dashboards#/view/Replayed-Traffic-Dashboard',
        },
        {
          id: 'SMB-Dashboard',
          title: 'SMB Dashboard',
          url: '/analyze/app/dashboards#/view/SMB-Dashboard',
        },
        {
          id: 'SMTP-Trends-Dashboard',
          title: 'SMTP Trends Dashboard',
          url: '/analyze/app/dashboards#/view/SMTP-Trends-Dashboard',
        },
        {
          id: 'Top-Level-Domain-Dashboard',
          title: 'Top Level Domain Dashboard',
          url: '/analyze/app/dashboards#/view/Top-Level-Domain-Dashboard',
        },
        {
          id: 'Traffic-Endpoints-Dashboard',
          title: 'Traffic Endpoints Dashboard',
          url: '/analyze/app/dashboards#/view/Traffic-Endpoints-Dashboard',
        },
        {
          id: 'Traffic-Profile-Dashboard',
          title: 'Traffic Profile Dashboard',
          url: '/analyze/app/dashboards#/view/Traffic-Profile-Dashboard',
        },
        {
          id: 'b595b4a0-d0c6-11e9-a8eb-5fa4111061ad',
          title: 'Analyze Dashboard',
          url: '/analyze/app/dashboards#/view/b595b4a0-d0c6-11e9-a8eb-5fa4111061ad',
        },
        {
          id: 'd399cd30-42d9-11ea-9440-bd6688166a53',
          title: 'Network Node Link Dashboard',
          url: '/analyze/app/dashboards#/view/d399cd30-42d9-11ea-9440-bd6688166a53',
        },
      ];

      // Set dashboards in multiple possible locations for LogRhythm navbar
      (window as any).netmonDashboards = dashboards;
      (window as any).NetMonDashboards = dashboards;
      (window as any).NETMON_DASHBOARDS = dashboards;

      // LogRhythm namespace variations
      (window as any).logrhythm = (window as any).logrhythm || {};
      (window as any).logrhythm.dashboards = dashboards;
      (window as any).logrhythm.netmon = (window as any).logrhythm.netmon || {};
      (window as any).logrhythm.netmon.dashboards = dashboards;

      // Kibana namespace
      (window as any).kibana = (window as any).kibana || {};
      (window as any).kibana.dashboards = dashboards;
      (window as any).kibana.netmon = dashboards;

      // Legacy namespace for 7.5.2 compatibility
      (window as any).nm = (window as any).nm || {};
      (window as any).nm.dashboards = dashboards;

      // Create API functions
      (window as any).getNetMonDashboards = () => dashboards;
      (window as any).getNmDashboards = () => dashboards; // Alternative name

      // console.log('NetMon dashboards configured from kibana_legacy plugin:', dashboards.length);
      return dashboards;
    };

    // Set up dashboards immediately and on DOM ready
    setupNetMonDashboards();

    // Also set up after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupNetMonDashboards);
    } else {
      setTimeout(setupNetMonDashboards, 100);
    }

    // Add application classes for proper dashboard styling (7.5.2 compatibility)
    application.currentAppId$.subscribe((appId) => {
      // Remove previous tab classes
      chrome.removeApplicationClass('tab-dashboard');
      chrome.removeApplicationClass('tab-visualize');
      chrome.removeApplicationClass('tab-discover');

      // Add current app tab class
      if (appId) {
        chrome.addApplicationClass(`tab-${appId}`);
      }
    });

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

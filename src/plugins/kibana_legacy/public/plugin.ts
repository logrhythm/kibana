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
// Import LogRhythm lr-style CSS
import 'lr-style/dist/lr-style.css';

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

    // Also force add dashboard class immediately for dashboard URLs
    if (
      window.location.pathname.includes('dashboard') ||
      window.location.hash.includes('dashboard')
    ) {
      chrome.addApplicationClass('tab-dashboard');
    }

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

    // Debug: Monitor and fix application classes in DOM
    setInterval(() => {
      const appContainer = document.querySelector('.application');
      if (appContainer) {
        const hasTabDashboard = appContainer.classList.contains('tab-dashboard');
        if (
          !hasTabDashboard &&
          (window.location.hash.includes('dashboard') ||
            window.location.pathname.includes('dashboard'))
        ) {
          appContainer.classList.add('tab-dashboard');
        }
      }
    }, 2000);

    injectHeaderStyle(uiSettings);

    // Inject additional CSS fixes for UI positioning and visibility
    const additionalCSS = `
      <style id="netmon-ui-fixes">
        /* Ensure proper body positioning with LogRhythm navbar */
        body.coreSystemRootDomElement {
          margin-top: 50px !important;
          padding-top: 0 !important;
        }

        /* Fix header menu visibility issues */
        .euiHeader .euiHeaderSection .euiHeaderSectionItem {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        /* Ensure proper z-index for dropdowns and menus */
        .euiPopover__panel, .euiContextMenu, .euiContextMenuPanel {
          z-index: 10000 !important;
        }

        /* Fix search and filter bar visibility */
        .kbnTopNavMenu__wrapper {
          display: flex !important;
        }

        .globalFilterBar {
          display: flex !important;
          visibility: visible !important;
        }

        /* Ensure dashboard viewport positioning */
        .dshAppContainer {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }

        /* Fix for dashboard margins functionality */
        .dshAppContainer--withMargins {
          padding: 16px !important;
        }

        /* Additional navbar and component fixes for nm-web-shared compatibility */
        .logrhythm-navbar, .navbar {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 9999 !important;
          height: 50px !important;
        }

        /* Fix for missing search input in kbn-top-nav */
        .kbnTopNavMenu .kbnTopNavMenu__wrapper {
          display: flex !important;
          align-items: center !important;
        }

        .kbnTopNavMenu__datePickerWrapper {
          display: flex !important;
        }

        .globalQueryBar {
          display: flex !important;
          flex-grow: 1 !important;
        }

        /* Ensure dashboard content is properly positioned */
        .application {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }

        .application.tab-dashboard {
          display: flex !important;
          flex-direction: column !important;
        }

      </style>
    `;

    // Inject the CSS into the document head
    if (typeof document !== 'undefined') {
      const head = document.querySelector('head');
      if (head && !head.querySelector('#netmon-ui-fixes')) {
        head.insertAdjacentHTML('beforeend', additionalCSS);
      }
    }

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

// Debug: Check CSS and layout after everything loads
setTimeout(() => {
  const appContainer = document.querySelector('.application');
  const body = document.body;
  const navbar = document.querySelector('nav, .navbar, .logrhythm-navbar, [class*="navbar"]');

  // Check if nm-web-shared styles are loaded
  const hasNmStyles = !!document.querySelector(
    '[href*="nm-web-shared"], style[data-nm], link[data-nm]'
  );
}, 5000);

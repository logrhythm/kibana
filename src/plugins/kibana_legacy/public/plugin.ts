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
      (window as any).getNmDashboards = () => dashboards;

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

    // Additional safety measure: ensure capabilities are available globally
    const ensureCapabilities = () => {
      if (!(window as any).kibanaCapabilities) {
        (window as any).kibanaCapabilities = {
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
          },
          visualize: {
            save: true,
            saveQuery: true,
            show: true,
            createShortUrl: true,
          },
        };
        // console.log('🔍 DEBUG: Set global kibanaCapabilities fallback');
      }
    };

    ensureCapabilities();

    // Add application classes for proper dashboard styling (7.5.2 compatibility)
    application.currentAppId$.subscribe((appId) => {
      // console.log('🔍 DEBUG: Application ID changed to:', appId);
      // Remove previous tab classes
      chrome.removeApplicationClass('tab-dashboard');
      chrome.removeApplicationClass('tab-visualize');
      chrome.removeApplicationClass('tab-discover');

      // Add current app tab class
      if (appId) {
        chrome.addApplicationClass(`tab-${appId}`);
        // console.log('🔍 DEBUG: Added application class:', `tab-${appId}`);
      }
    });

    // Also force add dashboard class immediately for dashboard URLs
    if (
      window.location.pathname.includes('dashboard') ||
      window.location.hash.includes('dashboard')
    ) {
      chrome.addApplicationClass('tab-dashboard');
      // console.log('🔍 DEBUG: Force added tab-dashboard class for dashboard URL');
    }

    // Removed heavy Observable patching to improve performance

    // Simplified application class monitoring - run once
    setTimeout(() => {
      const appContainer = document.querySelector('.application');
      if (
        appContainer &&
        (window.location.hash.includes('dashboard') ||
          window.location.pathname.includes('dashboard'))
      ) {
        appContainer.classList.add('tab-dashboard');
        // console.log('🔍 DEBUG: Added tab-dashboard class for dashboard URL');
      }
    }, 1000);

    injectHeaderStyle(uiSettings);

    // MINIMAL CSS: Support for LogRhythm navbar integration
    const minimalCSS = `
      <style id="netmon-ui-fixes">
        /* 1. Search filter visibility and positioning */
        .globalFilterBar, [data-test-subj="globalFilterBar"] {
          display: flex !important;
          visibility: visible !important;
          z-index: 1100 !important;
          position: relative !important;
          margin-top: 0 !important;
        }

        /* Dashboard content positioning */
        .dshAppContainer, .app-container {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }

        /* 2. LogRhythm navbar constraint and dropdown support */
        .logrhythm-navbar, .navbar, nav[class*="jss"] {
          max-height: 50px !important;
          overflow: visible !important; /* Allow dropdowns */
        }

        /* 3. Additional dropdown support for Material-UI components */
        .MuiPopover-root, .MuiMenu-root, .MuiPaper-root[role="menu"] {
          z-index: 20000 !important;
        }

        /* 4. Support nav drawer responsive behavior */
        .app-wrapper-panel {
          transition: margin-left 0.25s ease, width 0.25s ease !important;
        }

        /* Ensure main application content doesn't get pushed too far */
        .application {
          margin-left: 0 !important;
        }
      </style>
    `;

    // Inject the minimal CSS into the document head
    if (typeof document !== 'undefined') {
      const head = document.querySelector('head');
      if (head && !head.querySelector('#netmon-ui-fixes')) {
        head.insertAdjacentHTML('beforeend', minimalCSS);
      }
    }

    // NetMon integration complete - positioning handled by header.tsx CSS
    // console.log('✅ NetMon navbar integration initialized successfully');

    return {
      dashboardConfig: getDashboardConfig(!application.capabilities.dashboard.showWriteControls),
      loadFontAwesome: async () => {
        await import('./font_awesome');
      },
      config: this.initializerContext.config.get(),
    };
  }
}

export type KibanaLegacySetup = ReturnType<KibanaLegacyPlugin['setup']>;
export type KibanaLegacyStart = ReturnType<KibanaLegacyPlugin['start']>;

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

    // REMOVED DUPLICATE CSS - All styling now handled in header.tsx
    // This prevents conflicts and allows proper Bootstrap dropdown behavior

    // DEBUG: Multiple delayed checks to catch LogRhythm navbar when fully loaded
    const checkNavbar = (attempt: number, maxAttempts: number) => {
      if (attempt > maxAttempts) {
        // console.log('🔍 DEBUG: Max attempts reached, navbar may not be fully loaded');
        return;
      }

      setTimeout(() => {
        // console.log('🔍 DEBUG: Checking LogRhythm navbar menu items...');

        // ENHANCED: Check for DYNAMIC dashboard title visibility
        const kbnTopNav = document.querySelector('kbn-top-nav');
        const screenTitle = document.querySelector('[data-test-subj*="title"], .screen-title, h1');
        const topNavMenu = document.querySelector('.kbnTopNavMenu');
        const topNavWrapper = document.querySelector('.kbnTopNavMenu__wrapper');
        const breadcrumbs = document.querySelector('[data-test-subj="breadcrumbs"]');
        const kuiLocalBreadcrumb = document.querySelector('.kuiLocalBreadcrumb');

        // console.log('🔍 DEBUG: DYNAMIC Dashboard title elements:');
        // console.log('🔍 DEBUG: kbn-top-nav found:', !!kbnTopNav);
        // console.log('🔍 DEBUG: screen title element found:', !!screenTitle);
        // console.log('🔍 DEBUG: top nav menu found:', !!topNavMenu);
        // console.log('🔍 DEBUG: top nav wrapper found:', !!topNavWrapper);
        // console.log('🔍 DEBUG: breadcrumbs found:', !!breadcrumbs);
        // console.log('🔍 DEBUG: kuiLocalBreadcrumb found:', !!kuiLocalBreadcrumb);

        if (kbnTopNav) {
          const topNavStyles = window.getComputedStyle(kbnTopNav);
          /* console.log(
            '🔍 DEBUG: kbn-top-nav visibility - display:',
            topNavStyles.display,
            'visibility:',
            topNavStyles.visibility,
            'opacity:',
            topNavStyles.opacity
          );*/
        }

        if (screenTitle) {
          const titleStyles = window.getComputedStyle(screenTitle);
          const titleText = screenTitle.textContent?.trim() || '';
          // console.log('🔍 DEBUG: Screen title text:', titleText);
          /* console.log(
            '🔍 DEBUG: Screen title visibility - display:',
            titleStyles.display,
            'visibility:',
            titleStyles.visibility,
            'opacity:',
            titleStyles.opacity
          );*/
        }

        if (topNavMenu) {
          const menuStyles = window.getComputedStyle(topNavMenu);
          /* console.log(
            '🔍 DEBUG: Top nav menu visibility - display:',
            menuStyles.display,
            'visibility:',
            menuStyles.visibility,
            'opacity:',
            menuStyles.opacity
          );*/
        }

        if (topNavWrapper) {
          const wrapperStyles = window.getComputedStyle(topNavWrapper);
          /* console.log(
            '🔍 DEBUG: Top nav wrapper visibility - display:',
            wrapperStyles.display,
            'visibility:',
            wrapperStyles.visibility,
            'opacity:',
            wrapperStyles.opacity
          );*/

          // Check for h1 inside wrapper (dynamic title)
          const wrapperTitle = topNavWrapper.querySelector('h1');
          if (wrapperTitle) {
            const titleText = wrapperTitle.textContent?.trim() || '';
            const titleStyles = window.getComputedStyle(wrapperTitle);
            // console.log('🔍 DEBUG: ✨ DYNAMIC wrapper title text:', titleText);
            /* console.log(
              '🔍 DEBUG: ✨ DYNAMIC wrapper title visibility - display:',
              titleStyles.display,
              'visibility:',
              titleStyles.visibility,
              'opacity:',
              titleStyles.opacity
            );*/
          } else {
            // console.log('🔍 DEBUG: ⚠️ No h1 found in top nav wrapper');
          }
        }

        if (kuiLocalBreadcrumb) {
          const breadcrumbStyles = window.getComputedStyle(kuiLocalBreadcrumb);
          const breadcrumbText = kuiLocalBreadcrumb.textContent?.trim() || '';
          // console.log('🔍 DEBUG: ✨ DYNAMIC kuiLocalBreadcrumb text:', breadcrumbText);
          /* console.log(
            '🔍 DEBUG: ✨ DYNAMIC kuiLocalBreadcrumb visibility - display:',
            breadcrumbStyles.display,
            'visibility:',
            breadcrumbStyles.visibility,
            'opacity:',
            breadcrumbStyles.opacity
          );*/
        }

        // PRIORITY: Check for the FIXED h1.kuiLocalBreadcrumb (added by TopNavMenu fix)
        const fixedKuiLocalBreadcrumb = document.querySelector('h1.kuiLocalBreadcrumb');
        if (fixedKuiLocalBreadcrumb) {
          const fixedText = fixedKuiLocalBreadcrumb.textContent?.trim() || '';
          const fixedStyles = window.getComputedStyle(fixedKuiLocalBreadcrumb);
          // console.log('🎉 SUCCESS: FIXED h1.kuiLocalBreadcrumb found!');
          // console.log('🎉 SUCCESS: DYNAMIC title text:', fixedText);
          /* console.log(
            '🎉 SUCCESS: FIXED title visibility - display:',
            fixedStyles.display,
            'visibility:',
            fixedStyles.visibility,
            'opacity:',
            fixedStyles.opacity
          );*/
        } else {
          /* console.log(
            '⚠️ WARNING: FIXED h1.kuiLocalBreadcrumb NOT found - TopNavMenu fix may not be working'
          );*/
        }

        // Check for ALL h1 elements that might contain dashboard title
        const allH1s = document.querySelectorAll('h1');
        // console.log('🔍 DEBUG: Total h1 elements found:', allH1s.length);
        allH1s.forEach((h1, index) => {
          const text = h1.textContent?.trim() || '';
          const styles = window.getComputedStyle(h1);
          if (
            text.includes('Dashboard') ||
            text.includes('Network') ||
            text.includes('Analyze') ||
            text.length > 5
          ) {
            /* console.log(
              `🔍 DEBUG: ✨ H1 ${index} (potential title): "${text}" - display:${styles.display}, visibility:${styles.visibility}, opacity:${styles.opacity}`
            );*/
          }
        });

        // Target the Bootstrap LogRhythm navbar
        const bootstrapNavbar = document.querySelector(
          '.navbar.navbar-fixed-top[data-testid="navbar"]'
        );
        // console.log('🔍 DEBUG: Bootstrap LogRhythm navbar found:', !!bootstrapNavbar);

        if (bootstrapNavbar) {
          // console.log('🔍 DEBUG: Bootstrap navbar classes:', bootstrapNavbar.className);

          // Look for Bootstrap navbar buttons and links
          const allButtons = bootstrapNavbar.querySelectorAll('button, a, .btn, .navbar-nav li');
          // console.log('🔍 DEBUG: Total Bootstrap navbar buttons/links found:', allButtons.length);

          allButtons.forEach((btn, index) => {
            const text =
              btn.textContent?.trim() ||
              btn.getAttribute('title') ||
              btn.getAttribute('aria-label') ||
              btn.getAttribute('data-original-title') ||
              '';
            const styles = window.getComputedStyle(btn);
            /* console.log(
              `🔍 DEBUG: Bootstrap Button ${index}: "${text}" - display:${styles.display}, visibility:${styles.visibility}, opacity:${styles.opacity}`
            );*/
          });

          // Look for Bootstrap navbar-right (right side menu with icons)
          const navbarRight = bootstrapNavbar.querySelector('.navbar-right');
          // console.log('🔍 DEBUG: Bootstrap .navbar-right found:', !!navbarRight);

          // Also check main navbar-nav (left side menu)
          const navbarNav = bootstrapNavbar.querySelector('.navbar-nav');
          // console.log('🔍 DEBUG: Bootstrap .navbar-nav found:', !!navbarNav);
          if (navbarNav) {
            const navItems = navbarNav.children;
            // console.log('🔍 DEBUG: Navbar nav items count:', navItems.length);

            // Check each nav item (likely Administration, User Options, Help)
            for (let i = 0; i < navItems.length; i++) {
              const navItem = navItems[i];
              /* console.log(
                `🔍 DEBUG: Nav item ${i}:`,
                navItem.className,
                navItem.textContent?.substring(0, 50)
              );*/

              const navItemStyles = window.getComputedStyle(navItem);
              /* console.log(
                `🔍 DEBUG: Nav item ${i} visibility - display:${navItemStyles.display}, visibility:${navItemStyles.visibility}, opacity:${navItemStyles.opacity}`
              );*/

              // Check for dropdown menu in this nav item
              const dropdownMenu = navItem.querySelector('.dropdown-menu');
              if (dropdownMenu) {
                // console.log(`🔍 DEBUG: Nav item ${i} has dropdown menu`);
                const dropdownStyles = window.getComputedStyle(dropdownMenu);
                /* console.log(
                  `🔍 DEBUG: Dropdown ${i} - display:${dropdownStyles.display}, visibility:${dropdownStyles.visibility}`
                );*/
              }

              // Check buttons/links in nav item
              const navButtons = navItem.querySelectorAll('button, a, .btn');
              navButtons.forEach((btn, btnIndex) => {
                const btnStyles = window.getComputedStyle(btn);
                const text = btn.getAttribute('title') || btn.textContent?.trim() || 'no label';

                if (btnStyles.visibility === 'hidden' || btnStyles.opacity === '0') {
                  // console.log(`⚠️ WARNING: Nav ${i} Button ${btnIndex} ("${text}") appears hidden`);
                }
              });
            }
          }

          // Check for right-side navbar icons (Administration, User Options, Help)
          if (navbarRight) {
            // Check JSS class structure (7.5.2 vs 7.10.2)
            const jssClasses = ['jss2', 'jss4', 'jss6', 'jss7', 'jss8', 'jss9'];
            jssClasses.forEach((jssClass) => {
              const jssElement = navbarRight.querySelector(`.${jssClass}`);
              if (jssElement) {
                const jssStyles = window.getComputedStyle(jssElement);
              }
            });

            // Enhanced icon detection with multiple selectors
            const adminIcon = navbarRight.querySelector(
              '.icon-administration, [title="Administration"], [aria-label*="Administration"], button[title*="Administration"], a[title*="Administration"]'
            );
            const userIcon = navbarRight.querySelector(
              '.icon-user, [title="User Options"], [aria-label*="User"], button[title*="User"], a[title*="User"]'
            );
            const helpIcon = navbarRight.querySelector(
              '.icon-question, [title="Help"], [aria-label*="Help"], button[title*="Help"], a[title*="Help"]'
            );

            // COMPREHENSIVE: Check ALL icons in navbar-right
            const allIcons = navbarRight.querySelectorAll(
              'i, .icon, [class*="icon"], span[class*="fa"], .material-icons, button, a'
            );
            // console.log('🔍 DEBUG: Total navbar-right icons/buttons found:', allIcons.length);

            // Focus on the empty-text buttons (likely the icon buttons)
            const emptyButtons = Array.from(allIcons).filter((icon) => {
              const text = icon.textContent?.trim() || '';
              return text === '' && icon.tagName === 'BUTTON';
            });

            // console.log('🔍 DEBUG: Empty button count (likely icons):', emptyButtons.length);
            emptyButtons.forEach((icon, index) => {
              const iconStyles = window.getComputedStyle(icon);
              const classes = icon.className || 'no-classes';
              const title =
                icon.getAttribute('title') || icon.getAttribute('aria-label') || 'no-title';

              // Check if icon has problematic properties
              if (
                iconStyles.width === '0px' ||
                iconStyles.height === '0px' ||
                iconStyles.fontSize === '0px' ||
                iconStyles.textIndent.includes('-') ||
                iconStyles.color === 'rgba(0, 0, 0, 0)' ||
                iconStyles.color === 'transparent'
              ) {
                // console.log(`⚠️ HIDDEN PROPERTY: Empty Button ${index} has hiding CSS!`);
              }
            });

            allIcons.forEach((icon, index) => {
              const iconStyles = window.getComputedStyle(icon);
              const text =
                icon.textContent?.trim() ||
                icon.getAttribute('title') ||
                icon.getAttribute('aria-label') ||
                icon.className ||
                'no-label';
            });

            // console.log('🔍 DEBUG: Administration icon found:', !!adminIcon);
            // console.log('🔍 DEBUG: User Options icon found:', !!userIcon);
            // console.log('🔍 DEBUG: Help icon found:', !!helpIcon);

            if (adminIcon) {
              // console.log('🔍 DEBUG: ADMIN ICON ANALYSIS STARTING...');
              try {
                const adminStyles = window.getComputedStyle(adminIcon);

                // Check for common icon font hiding techniques
                if (adminStyles.fontSize === '0px' || adminStyles.fontSize === '0') {
                  // console.log('⚠️ ISSUE FOUND: Admin icon has fontSize 0!');
                }
                if (
                  adminStyles.color === 'rgba(0, 0, 0, 0)' ||
                  adminStyles.color === 'transparent'
                ) {
                  // console.log('⚠️ ISSUE FOUND: Admin icon has transparent color!');
                }
                if (adminStyles.width === '0px' || adminStyles.height === '0px') {
                  // console.log('⚠️ ISSUE FOUND: Admin icon has zero dimensions!');
                }

                // Check pseudo-elements (::before and ::after) for icon content
                const beforeStyles = window.getComputedStyle(adminIcon, '::before');
                const afterStyles = window.getComputedStyle(adminIcon, '::after');
              } catch (error) {
                // console.log('❌ ERROR in admin icon analysis:', error.message);
              }
            }

            if (userIcon) {
              // console.log('🔍 DEBUG: USER ICON ANALYSIS STARTING...');
              try {
                const userStyles = window.getComputedStyle(userIcon);

                // Check pseudo-elements
                const beforeStyles = window.getComputedStyle(userIcon, '::before');
              } catch (error) {
                // console.log('❌ ERROR in user icon analysis:', error.message);
              }
            }

            if (helpIcon) {
              // console.log('🔍 DEBUG: HELP ICON ANALYSIS STARTING...');
              try {
                const helpStyles = window.getComputedStyle(helpIcon);

                // Check pseudo-elements
                const beforeStyles = window.getComputedStyle(helpIcon, '::before');
              } catch (error) {
                // console.log('❌ ERROR in help icon analysis:', error.message);
              }
            }
          }

          // Check Bootstrap navbar structure

          // If no buttons found and it's an early attempt, try again
          if (allButtons.length === 0 && attempt < maxAttempts) {
            // console.log(`🔍 DEBUG: Attempt ${attempt}: No buttons found, retrying...`);
            checkNavbar(attempt + 1, maxAttempts);
          }
        } else {
          // Fallback: check all possible navbar elements
          // console.log('🔍 DEBUG: LogRhythm container not found, checking all navbars...');
          const allNavbars = document.querySelectorAll('nav, .navbar, [class*="navbar"]');
          allNavbars.forEach((nav, index) => {
            const styles = window.getComputedStyle(nav);
          });

          // Retry if container not found
          if (attempt < maxAttempts) {
            // console.log(`🔍 DEBUG: Attempt ${attempt}: Container not found, retrying...`);
            checkNavbar(attempt + 1, maxAttempts);
          }
        }
      }, 2000 + attempt * 1000); // Increasing delay: 3s, 4s, 5s, 6s, 7s
    };

    // Start checking with multiple attempts
    checkNavbar(1, 5);

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

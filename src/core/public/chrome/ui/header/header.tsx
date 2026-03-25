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

import Url from 'url';

import React, { Component, createRef } from 'react';
import * as Rx from 'rxjs';

import 'jquery';
import 'tether';
import 'bootstrap';
// Import LogRhythm lr-style CSS for proper UI alignment
import 'lr-style/dist/lr-style.css';
// Import LogRhythm icons CSS for proper icon rendering
import '@logrhythm/icons/icons.css';

import {
  // TODO: add type annotations
  // @ts-expect-error
  EuiHeader,
  EuiHeaderLogo,
  // @ts-expect-error
  EuiHeaderSection,
  // @ts-expect-error
  EuiHeaderSectionItem,
  // @ts-expect-error
  EuiHideFor,
  EuiHorizontalRule,
  EuiNavDrawer,
  EuiNavDrawerGroup,
  // @ts-expect-error
  EuiShowFor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import LogRhythmNavbar from '../../../../../netmon/components/navbar';

const ExabeamMark = () => (
  <svg viewBox="0 0 256 192" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polygon points="1,191 40,191 158,29" fill="#00B400" />
    <polygon points="82,166 121,166 195,61" fill="#00B400" />
    <polygon points="127,191 166,191 231,98" fill="#1A73E8" />
    <polygon points="210,166 249,166 256,148" fill="#1A73E8" />
  </svg>
);

import {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeNavLink,
  ChromeRecentlyAccessedHistoryItem,
  ChromeNavControl,
} from '../..';
import { HttpStart } from '../../../http';
import { ChromeHelpExtension } from '../../chrome_service';
import { ApplicationStart, InternalApplicationStart } from '../../../application/types';

// Providing a buffer between the limit and the cut off index
// protects from truncating just the last couple (6) characters
const TRUNCATE_LIMIT: number = 64;
const TRUNCATE_AT: number = 58;

/**
 *
 * @param {string} url - a relative or root relative url.  If a relative path is given then the
 * absolute url returned will depend on the current page where this function is called from. For example
 * if you are on page "http://www.mysite.com/shopping/kids" and you pass this function "adults", you would get
 * back "http://www.mysite.com/shopping/adults".  If you passed this function a root relative path, or one that
 * starts with a "/", for example "/account/cart", you would get back "http://www.mysite.com/account/cart".
 * @return {string} the relative url transformed into an absolute url
 */
function relativeToAbsolute(url: string) {
  // convert all link urls to absolute urls
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}

function extendRecentlyAccessedHistoryItem(
  navLinks: ChromeNavLink[],
  recentlyAccessed: ChromeRecentlyAccessedHistoryItem,
  basePath: HttpStart['basePath']
) {
  const href = relativeToAbsolute(basePath.prepend(recentlyAccessed.link));
  const navLink = navLinks.find((nl) => href.startsWith(nl.subUrlBase || nl.baseUrl));

  let titleAndAriaLabel = recentlyAccessed.label;
  if (navLink) {
    const objectTypeForAriaAppendix = navLink.title;
    titleAndAriaLabel = i18n.translate('core.ui.recentLinks.linkItem.screenReaderLabel', {
      defaultMessage: '{recentlyAccessedItemLinklabel}, type: {pageType}',
      values: {
        recentlyAccessedItemLinklabel: recentlyAccessed.label,
        pageType: objectTypeForAriaAppendix,
      },
    });
  }

  return {
    ...recentlyAccessed,
    href,
    euiIconType: navLink ? navLink.euiIconType : undefined,
    title: titleAndAriaLabel,
  };
}

function extendNavLink(navLink: ChromeNavLink, urlForApp: ApplicationStart['getUrlForApp']) {
  if (navLink.legacy) {
    return {
      ...navLink,
      href: navLink.url && !navLink.active ? navLink.url : navLink.baseUrl,
    };
  }

  return {
    ...navLink,
    href: urlForApp(navLink.id),
  };
}

function isModifiedEvent(event: React.MouseEvent<HTMLButtonElement, MouseEvent> | MouseEvent) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

function findClosestAnchor(element: HTMLElement): HTMLAnchorElement | void {
  let current = element;
  while (current) {
    if (current.tagName === 'A') {
      return current as HTMLAnchorElement;
    }

    if (!current.parentElement || current.parentElement === document.body) {
      return undefined;
    }

    current = current.parentElement;
  }
}

function truncateRecentItemLabel(label: string): string {
  if (label.length > TRUNCATE_LIMIT) {
    label = `${label.substring(0, TRUNCATE_AT)}…`;
  }

  return label;
}

export type HeaderProps = Pick<Props, Exclude<keyof Props, 'intl'>>;

interface Props {
  kibanaVersion: string;
  application: InternalApplicationStart;
  appTitle$: Rx.Observable<string>;
  badge$: Rx.Observable<ChromeBadge | undefined>;
  breadcrumbs$: Rx.Observable<ChromeBreadcrumb[]>;
  homeHref: string;
  isVisible$: Rx.Observable<boolean>;
  kibanaDocLink: string;
  navLinks$: Rx.Observable<ChromeNavLink[]>;
  recentlyAccessed$: Rx.Observable<ChromeRecentlyAccessedHistoryItem[]>;
  forceAppSwitcherNavigation$: Rx.Observable<boolean>;
  helpExtension$: Rx.Observable<ChromeHelpExtension>;
  legacyMode: boolean;
  navControlsLeft$: Rx.Observable<readonly ChromeNavControl[]>;
  navControlsRight$: Rx.Observable<readonly ChromeNavControl[]>;
  intl: InjectedIntl;
  basePath: HttpStart['basePath'];
  isLocked?: boolean;
  onIsLockedUpdate?: (isLocked: boolean) => void;
  isCloudEnabled: boolean;
}

interface State {
  appTitle: string;
  currentAppId?: string;
  isVisible: boolean;
  navLinks: ReadonlyArray<ReturnType<typeof extendNavLink>>;
  recentlyAccessed: ReadonlyArray<ReturnType<typeof extendRecentlyAccessedHistoryItem>>;
  forceNavigation: boolean;
  navControlsLeft: readonly ChromeNavControl[];
  navControlsRight: readonly ChromeNavControl[];
}

class HeaderUI extends Component<Props, State> {
  private subscription?: Rx.Subscription;
  private navDrawerRef = createRef<EuiNavDrawer>();

  constructor(props: Props) {
    super(props);

    this.state = {
      appTitle: 'Kibana',
      isVisible: true,
      navLinks: [],
      recentlyAccessed: [],
      forceNavigation: false,
      navControlsLeft: [],
      navControlsRight: [],
    };
  }

  public componentDidMount() {
    this.subscription = Rx.combineLatest(
      this.props.appTitle$,
      this.props.isVisible$,
      this.props.forceAppSwitcherNavigation$,
      this.props.navLinks$,
      this.props.recentlyAccessed$,
      // Types for combineLatest only handle up to 6 inferred types so we combine these two separately.
      Rx.combineLatest(
        this.props.navControlsLeft$,
        this.props.navControlsRight$,
        this.props.application.currentAppId$
      )
    ).subscribe({
      next: ([
        appTitle,
        isVisible,
        forceNavigation,
        navLinks,
        recentlyAccessed,
        [navControlsLeft, navControlsRight, currentAppId],
      ]) => {
        this.setState({
          appTitle,
          isVisible,
          forceNavigation,
          navLinks: navLinks.map((navLink) =>
            extendNavLink(navLink, this.props.application.getUrlForApp)
          ),
          recentlyAccessed: recentlyAccessed.map((ra) =>
            extendRecentlyAccessedHistoryItem(navLinks, ra, this.props.basePath)
          ),
          navControlsLeft,
          navControlsRight,
          currentAppId,
        });
      },
    });
  }

  public componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public renderLogo() {
    const { homeHref, intl } = this.props;
    return (
      <EuiHeaderLogo
        data-test-subj="logo"
        iconType={ExabeamMark}
        iconTitle="Netmon"
        onClick={this.onNavClick}
        href={homeHref}
        aria-label={intl.formatMessage({
          id: 'core.ui.chrome.headerGlobalNav.goHomePageIconAriaLabel',
          defaultMessage: 'Go to home page',
        })}
      >
        Exabeam
      </EuiHeaderLogo>
    );
  }

  public renderMenuTrigger() {
    return null;
  }

  public render() {
    const { application, basePath, intl, onIsLockedUpdate } = this.props;
    const { currentAppId, isVisible, recentlyAccessed } = this.state;
    if (!isVisible) {
      return null;
    }

    const createSideNavItem = (
      key: string,
      label: string,
      path: string,
      iconType: string,
      activeAppIds: string[]
    ) => {
      const href = relativeToAbsolute(basePath.prepend(path));

      return {
        key,
        label,
        href,
        iconType,
        isActive: activeAppIds.includes(currentAppId || ''),
        isDisabled: false,
        'data-test-subj': 'navDrawerAppsMenuLink',
        onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
          if (!event.defaultPrevented && event.button === 0 && !isModifiedEvent(event)) {
            event.preventDefault();
            application.navigateToUrl(href);
          }
        },
      };
    };

    const sideNavLinksArray = [
      createSideNavItem('discover', 'Discover', '/app/discover', 'discoverApp', ['discover']),
      createSideNavItem('visualize', 'Visualize', '/app/visualize', 'visualizeApp', ['visualize']),
      createSideNavItem('dashboard', 'Dashboard', '/app/dashboards#/list', 'dashboardApp', [
        'dashboard',
      ]),
      createSideNavItem('dev_tools', 'Dev Tools', '/app/dev_tools', 'devToolsApp', ['dev_tools']),
      createSideNavItem('management', 'Management', '/app/management', 'managementApp', [
        'management',
      ]),
    ];

    const recentLinksArray = [
      {
        label: intl.formatMessage({
          id: 'core.ui.chrome.sideGlobalNav.viewRecentItemsLabel',
          defaultMessage: 'Recently viewed',
        }),
        iconType: 'clock',
        isDisabled: recentlyAccessed.length === 0,
        flyoutMenu: {
          title: intl.formatMessage({
            id: 'core.ui.chrome.sideGlobalNav.viewRecentItemsFlyoutTitle',
            defaultMessage: 'Recent items',
          }),
          listItems: recentlyAccessed.map((item) => ({
            label: truncateRecentItemLabel(item.label),
            title: item.title,
            'aria-label': item.title,
            href: item.href,
            iconType: item.euiIconType,
          })),
        },
      },
    ];

    return (
      <div
        className="chrHeaderWrapper hide-for-sharing"
        data-test-subj="headerGlobalNav"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '50px',
          zIndex: 18500,
          pointerEvents: 'none',
          backgroundColor: 'transparent',
        }}
      >
        <header>
          {/* LogRhythm Navbar - positioned at absolute top */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 19999,
              height: '50px',
              backgroundColor: 'inherit',
              pointerEvents: 'auto',
            }}
          >
            <LogRhythmNavbar />
          </div>

          {/* CSS fixes for proper positioning and dropdown visibility */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
              /* Essential body positioning for LogRhythm navbar */
              body, body.coreSystemRootDomElement {
                margin-top: 50px !important;
                position: relative !important;
              }

              /* CORRECTED: LogRhythm uses Bootstrap navbar, not Material-UI! */
              .navbar.navbar-fixed-top {
                z-index: 19999 !important;
                overflow: visible !important;
                height: 50px !important;
                min-height: 50px !important;
              }

              /* Bootstrap navbar dropdown menus */
              .navbar .dropdown-menu {
                z-index: 20000 !important;
              }

              /* Essential navbar visibility only - let LogRhythm CSS handle the rest */

              /* Bootstrap navbar container - basic visibility */
              .navbar-nav {
                visibility: visible !important;
                opacity: 1 !important;
              }

              /* Let LogRhythm icons handle all specific element styling */

              /* FIXED: chrHeaderWrapper positioned at top navbar level */
              .chrHeaderWrapper {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                height: 50px !important;
                z-index: 18500 !important;
                pointer-events: none !important;
                background: transparent !important;
              }

              /* Global loading bar: thin pink/red strip at top like legacy UI */
              [data-test-subj="globalLoadingIndicator"],
              [data-test-subj="globalLoadingIndicator-hidden"] {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 21050 !important;
                pointer-events: none !important;
              }

              [data-test-subj="globalLoadingIndicator"].euiProgress,
              [data-test-subj="globalLoadingIndicator-hidden"].euiProgress {
                height: 2px !important;
                min-height: 2px !important;
                background-color: rgba(232, 76, 139, 0.18) !important;
              }

              [data-test-subj="globalLoadingIndicator"].euiProgress.euiProgress--indeterminate:before {
                background-color: #e84c8b !important;
                box-shadow: 0 0 8px rgba(232, 76, 139, 0.65) !important;
              }

              /* Fix app-wrapper-panel positioning - Account for nav drawer */
                /* Keep app content full-width below the top navbar */
              .app-wrapper-panel {
                position: relative !important;
                top: 0 !important;
                left: 0 !important;
                width: calc(100% - 48px) !important;
                height: auto !important;
                margin-top: 0 !important; /* FIXED: Don't push content down - body already has margin-top: 50px */
                margin-left: 48px !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                  transition: none !important;
              }

                /* Keep Kibana side drawer visible and positioned below top navbar */
              .euiNavDrawer {
                  top: 50px !important;
                  height: calc(100vh - 50px) !important;
                  z-index: 18000 !important;
                  pointer-events: auto !important;
              }

              /* Keep side-nav tooltips visible and correctly layered */
              .chrHeaderWrapper .euiNavDrawer .euiToolTip {
                margin-top: 0 !important;
                z-index: 21000 !important;
              }

              .chrHeaderWrapper .euiNavDrawer .euiToolTipPopover {
                margin-top: -50px !important;
                z-index: 21000 !important;
              }

              /* Ensure main content doesn't block navbar dropdowns */
              .application, .app-container, .dshAppContainer {
                position: relative !important;
                z-index: 1000 !important;
              }

              /* Make sure search/filter bars and dashboard title are positioned correctly */
              .globalFilterBar, [data-test-subj="globalFilterBar"],
              .kbnTopNavMenu {
                z-index: 1100 !important;
                margin-top: 0 !important;
              }

              /* Ensure dashboard title/breadcrumbs are visible and positioned correctly */
              kbn-top-nav,
              [data-test-subj="breadcrumbs"],
              .euiBreadcrumbs,
              .screen-title,
              .kuiLocalBreadcrumb {
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
                position: relative !important;
                z-index: 1100 !important;
              }

              /* Dashboard title text visibility - DYNAMIC dashboard title */
              .euiBreadcrumbs__list,
              .euiBreadcrumb,
              .euiTitle h1,
              .kuiLocalBreadcrumb,
              .kbnTopNavMenu__wrapper h1 {
                visibility: visible !important;
                opacity: 1 !important;
                color: #343741 !important;
                font-size: 18px !important;
                padding: 12px 0px 0px 8px !important;
                margin: 0 !important;
                line-height: 1.2 !important;
                display: block !important;
                position: relative !important;
                z-index: 1200 !important;
              }

              /* Ensure dynamic dashboard title is visible */
              .kbnTopNavMenu__wrapper h1,
              [data-test-subj*="title"] h1,
              .screen-title h1 {
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
                font-weight: 400 !important;
                text-overflow: ellipsis !important;
                overflow: hidden !important;
                white-space: nowrap !important;
                max-width: 400px !important;
              }

              /* Ensure kbn-top-nav wrapper is properly positioned */
              .kbnTopNavMenu__wrapper {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: relative !important;
                z-index: 1100 !important;
              }

              /* LogRhythm navbar: Ensure proper structure and icon visibility */
              .navbar-right {
                visibility: visible !important;
                opacity: 1 !important;
              }

              /* Ensure LogRhythm icons are properly displayed */
              .icon-administration,
              .icon-user,
              .icon-question {
                font-family: 'lr-web' !important;
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-size: 16px !important;
                line-height: 1 !important;
              }

              /* Ensure all navbar items are visible and properly positioned */
              .navbar-right .nav-item,
              .navbar-right .dropdown {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
              }

              /* Fix any display issues with nav links */
              .navbar-right .nav-link {
                display: inline-block !important;
                visibility: visible !important;
                opacity: 1 !important;
                min-width: 40px !important;
                text-align: center !important;
              }
            `,
            }}
          />

          {/* Left icon rail (side navigation) */}
          <div style={{ pointerEvents: 'auto' }}>
            <EuiNavDrawer
              ref={this.navDrawerRef}
              data-test-subj="navDrawer"
              isLocked={false}
              onIsLockedUpdate={onIsLockedUpdate}
            >
              <EuiNavDrawerGroup listItems={recentLinksArray} />
              <EuiHorizontalRule margin="none" />
              <EuiNavDrawerGroup data-test-subj="navDrawerAppsMenu" listItems={sideNavLinksArray} />
            </EuiNavDrawer>
          </div>
        </header>
      </div>
    );
  }

  private onNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const anchor = findClosestAnchor((event as any).nativeEvent.target);
    if (!anchor) {
      return;
    }

    const navLink = this.state.navLinks.find((item) => item.href === anchor.href);
    if (navLink && navLink.disabled) {
      event.preventDefault();
      return;
    }

    if (
      !this.state.forceNavigation ||
      event.isDefaultPrevented() ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey
    ) {
      return;
    }

    const toParsed = Url.parse(anchor.href);
    const fromParsed = Url.parse(document.location.href);
    const sameProto = toParsed.protocol === fromParsed.protocol;
    const sameHost = toParsed.host === fromParsed.host;
    const samePath = toParsed.path === fromParsed.path;

    if (sameProto && sameHost && samePath) {
      if (toParsed.hash) {
        document.location.reload();
      }

      // event.preventDefault() keeps the browser from seeing the new url as an update
      // and even setting window.location does not mimic that behavior, so instead
      // we use stopPropagation() to prevent angular from seeing the click and
      // starting a digest cycle/attempting to handle it in the router.
      event.stopPropagation();
    }
  };
}

export const Header = injectI18n(HeaderUI);

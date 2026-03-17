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
// Import FontAwesome for icon conversion fix
import 'font-awesome/css/font-awesome.min.css';

import {
  // TODO: add type annotations
  // @ts-expect-error
  EuiHeader,
  EuiHeaderLogo,
  // @ts-expect-error
  EuiHeaderSection,
  // @ts-expect-error
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  // @ts-expect-error
  EuiHideFor,
  EuiHorizontalRule,
  EuiIcon,
  EuiImage,
  EuiNavDrawer,
  EuiNavDrawerGroup,
  // @ts-expect-error
  EuiShowFor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import LogRhythmNavbar from '../../../../../netmon/components/navbar';
// Import LogRhythm lr-style CSS for dashboard compatibility
import 'lr-style/dist/lr-style.css';

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
        iconType="logoKibana"
        onClick={this.onNavClick}
        href={homeHref}
        aria-label={intl.formatMessage({
          id: 'core.ui.chrome.headerGlobalNav.goHomePageIconAriaLabel',
          defaultMessage: 'Go to home page',
        })}
      />
    );
  }

  public renderMenuTrigger() {
    return (
      <EuiHeaderSectionItemButton
        aria-label="Toggle side navigation"
        onClick={() => this.navDrawerRef.current?.toggleOpen()}
      >
        <EuiIcon type="apps" size="m" />
      </EuiHeaderSectionItemButton>
    );
  }

  public render() {
    const { application, basePath, intl, isLocked, onIsLockedUpdate, legacyMode } = this.props;
    const { currentAppId, isVisible, navLinks, recentlyAccessed } = this.state;

    if (!isVisible) {
      return null;
    }

    const navLinksArray = navLinks
      .filter((navLink) => !navLink.hidden)
      .map((navLink) => ({
        key: navLink.id,
        label: navLink.title,

        // Use href and onClick to support "open in new tab" and SPA navigation in the same link
        href: navLink.href,
        onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
          if (
            !legacyMode && // ignore when in legacy mode
            !navLink.legacy && // ignore links to legacy apps
            !event.defaultPrevented && // onClick prevented default
            event.button === 0 && // ignore everything but left clicks
            !isModifiedEvent(event) // ignore clicks with modifier keys
          ) {
            event.preventDefault();
            application.navigateToApp(navLink.id);
          }
        },

        // Legacy apps use `active` property, NP apps should match the current app
        isActive: navLink.active || currentAppId === navLink.id,
        isDisabled: navLink.disabled,

        iconType: navLink.euiIconType,
        icon:
          !navLink.euiIconType && navLink.icon ? (
            <EuiImage
              size="s"
              alt=""
              aria-hidden={true}
              url={basePath.prepend(`/${navLink.icon}`)}
            />
          ) : undefined,
        'data-test-subj': 'navDrawerAppsMenuLink',
      }));

    const recentLinksArray = [
      {
        label: intl.formatMessage({
          id: 'core.ui.chrome.sideGlobalNav.viewRecentItemsLabel',
          defaultMessage: 'Recently viewed',
        }),
        iconType: 'clock',
        isDisabled: recentlyAccessed.length > 0 ? false : true,
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

              /* CORRECTED: Only target top-level navbar elements, NOT dropdown contents */

              /* Bootstrap navbar brand and toggle button */
              .navbar-brand,
              .navbar .navbar-toggle {
                visibility: visible !important;
                opacity: 1 !important;
              }

              /* Bootstrap navbar-nav container (right side menu) */
              .navbar-nav {
                visibility: visible !important;
                opacity: 1 !important;
                display: flex !important;
              }

              /* Top-level nav items (li containers) - visible but don't force dropdown contents */
              .navbar-nav > li {
                visibility: visible !important;
                opacity: 1 !important;
                display: list-item !important;
              }

              /* CORRECTED: Only top-level buttons/links in nav items, NOT dropdown contents */
              .navbar-nav > li > a,
              .navbar-nav > li > button {
                visibility: visible !important;
                opacity: 1 !important;
                display: inline-block !important;
              }

              /* Bootstrap navbar icons in top-level buttons only */
              .navbar-nav > li > a .glyphicon,
              .navbar-nav > li > a .fa,
              .navbar-nav > li > a i,
              .navbar-nav > li > a svg,
              .navbar-nav > li > button .glyphicon,
              .navbar-nav > li > button .fa,
              .navbar-nav > li > button i,
              .navbar-nav > li > button svg {
                visibility: visible !important;
                opacity: 1 !important;
              }

              /* DO NOT force visibility on dropdown menu contents - let Bootstrap control them */
              /* .navbar .dropdown-menu * - REMOVED to allow proper Bootstrap dropdown behavior */

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

              /* Fix app-wrapper-panel positioning - Account for nav drawer */
              .app-wrapper-panel {
                position: relative !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: auto !important;
                margin-top: 0 !important; /* FIXED: Don't push content down - body already has margin-top: 50px */
                padding: 0 !important;
                box-sizing: border-box !important;
                transition: margin-left 0.25s ease !important;
              }

              /* When nav drawer is collapsed (default) - small margin */
              body:not(.euiNavDrawer--isOpen) .app-wrapper-panel {
                margin-left: 48px !important;
                width: calc(100% - 48px) !important;
              }

              /* When nav drawer is open - larger margin */
              body.euiNavDrawer--isOpen .app-wrapper-panel,
              .euiNavDrawer--isOpen ~ * .app-wrapper-panel {
                margin-left: 240px !important;
                width: calc(100% - 240px) !important;
              }

              /* Fix nav drawer positioning */
              .euiNavDrawer {
                top: 50px !important;
                height: calc(100vh - 50px) !important;
                z-index: 18000 !important;
                pointer-events: auto !important;
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

              /* Bootstrap navbar right-side: Support ICON-ONLY buttons (7.5.2 behavior) */
              .navbar-right,
              .navbar-nav .dropdown .nav-link {
                visibility: visible !important;
                opacity: 1 !important;
              }

              /* CORRECTED: Target both 7.5.2 and 7.10.2 JSS class names */
              /* 7.5.2 JSS classes: jss4, jss6, jss8, jss9 */
              /* 7.10.2 JSS classes: jss2, jss4, jss6, jss7 */
              .navbar-right .jss2,  /* 7.10.2 container */
              .navbar-right .jss4,  /* 7.5.2 container, 7.10.2 administration */
              .navbar-right .jss6,  /* 7.5.2 administration, 7.10.2 user */
              .navbar-right .jss7,  /* 7.10.2 help */
              .navbar-right .jss8,  /* 7.5.2 user */
              .navbar-right .jss9 { /* 7.5.2 help */
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
              }

              /* Target all JSS-generated divs in navbar-right */
              .navbar-right div[class*="jss"] {
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
              }

              /* Bootstrap navbar icons - make sure they display properly */
              .navbar-right .header-icon,
              .navbar-right .icon-administration,
              .navbar-right .icon-user,
              .navbar-right .icon-question,
              .icon-administration,
              .icon-user,
              .icon-question {
                visibility: visible !important;
                opacity: 1 !important;
                display: inline-block !important;
                font-size: 16px !important;
              }

              /* Icon dropdown arrows */
              .icon-down {
                visibility: visible !important;
                opacity: 1 !important;
                display: inline-block !important;
              }

              /* CRITICAL FIX: Convert text labels to FontAwesome icons for 7.5.2 compatibility */
              /* From debug: Icons show as text "Administration", "User Options", "Help" instead of FontAwesome */
              /* Solution: Hide text content and add FontAwesome icons via CSS pseudo-elements */

              /* FontAwesome font will be loaded via import at file level */

              /* Target JSS classes from debug logs: .jss4 (Administration), .jss6 (User), .jss7 (Help) */
              .navbar-right .jss4:not(.dropdown-menu):not(.dropdown-item),
              .navbar-right .jss6:not(.dropdown-menu):not(.dropdown-item),
              .navbar-right .jss7:not(.dropdown-menu):not(.dropdown-item) {
                font-size: 0 !important; /* Hide text */
                text-indent: -9999px !important;
                overflow: hidden !important;
                width: 48px !important;
                height: 32px !important;
                position: relative !important;
              }

              /* JSS class-based icon rendering */
              .navbar-right .jss4:not(.dropdown-menu):not(.dropdown-item):before {
                content: "\f013" !important; /* fa-cog for Administration */
                font-family: "FontAwesome" !important;
                font-weight: normal !important;
                font-size: 16px !important;
                color: #373a3c !important;
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                text-indent: 0 !important;
                display: inline-block !important;
                line-height: 1 !important;
              }

              .navbar-right .jss6:not(.dropdown-menu):not(.dropdown-item):before {
                content: "\f007" !important; /* fa-user for User Options */
                font-family: "FontAwesome" !important;
                font-weight: normal !important;
                font-size: 16px !important;
                color: #373a3c !important;
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                text-indent: 0 !important;
                display: inline-block !important;
                line-height: 1 !important;
              }

              .navbar-right .jss7:not(.dropdown-menu):not(.dropdown-item):before {
                content: "\f059" !important; /* fa-question-circle for Help */
                font-family: "FontAwesome" !important;
                font-weight: normal !important;
                font-size: 16px !important;
                color: #373a3c !important;
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                text-indent: 0 !important;
                display: inline-block !important;
                line-height: 1 !important;
              }

              /* Administration Button - Convert to cog icon */
              .navbar-right .nav-link[title="Administration"],
              .navbar-right a[href*="admin"]:not(.dropdown-item),
              .navbar-right .nav-item .nav-link:first-child:not(.dropdown-toggle) {
                font-size: 0 !important; /* Hide text content */
                text-indent: -9999px !important;
                overflow: hidden !important;
                width: 48px !important;
                height: 32px !important;
                position: relative !important;
              }

              .navbar-right .nav-link[title="Administration"]:before,
              .navbar-right a[href*="admin"]:not(.dropdown-item):before,
              .navbar-right .nav-item:nth-last-child(3) .nav-link:first-child:not(.dropdown-toggle):before {
                content: "\f013" !important; /* FontAwesome fa-cog */
                font-family: "FontAwesome", "Font Awesome 5 Free" !important;
                font-weight: 900 !important;
                font-size: 16px !important;
                color: #373a3c !important;
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                text-indent: 0 !important;
                display: inline-block !important;
                line-height: 1 !important;
              }

              /* User Options Button - Convert to user icon */
              .navbar-right .nav-link[title="User Options"],
              .navbar-right a[href*="user"]:not(.dropdown-item) {
                font-size: 0 !important;
                text-indent: -9999px !important;
                overflow: hidden !important;
                width: 48px !important;
                height: 32px !important;
                position: relative !important;
              }

              .navbar-right .nav-link[title="User Options"]:before,
              .navbar-right a[href*="user"]:not(.dropdown-item):before,
              .navbar-right .nav-item:nth-last-child(2) .nav-link:first-child:not(.dropdown-toggle):before {
                content: "\f007" !important; /* FontAwesome fa-user */
                font-family: "FontAwesome", "Font Awesome 5 Free" !important;
                font-weight: 900 !important;
                font-size: 16px !important;
                color: #373a3c !important;
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                text-indent: 0 !important;
                display: inline-block !important;
                line-height: 1 !important;
              }

              /* Help Button - Convert to question icon */
              .navbar-right .nav-link[title="Help"],
              .navbar-right a[href*="help"]:not(.dropdown-item) {
                font-size: 0 !important;
                text-indent: -9999px !important;
                overflow: hidden !important;
                width: 48px !important;
                height: 32px !important;
                position: relative !important;
              }

              .navbar-right .nav-link[title="Help"]:before,
              .navbar-right a[href*="help"]:not(.dropdown-item):before,
              .navbar-right .nav-item:last-child .nav-link:first-child:not(.dropdown-toggle):before {
                content: "\f059" !important; /* FontAwesome fa-question-circle */
                font-family: "FontAwesome", "Font Awesome 5 Free" !important;
                font-weight: 900 !important;
                font-size: 16px !important;
                color: #373a3c !important;
                position: absolute !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                text-indent: 0 !important;
                display: inline-block !important;
                line-height: 1 !important;
              }

              /* Ensure dropdown nav items are visible */
              .navbar-right .dropdown.nav-item {
                visibility: visible !important;
                opacity: 1 !important;
                display: list-item !important;
              }

              /* Make sure nav-link pointers are visible */
              .navbar-right .nav-link.pointer {
                visibility: visible !important;
                opacity: 1 !important;
                display: inline-block !important;
              }

              /* FIX: Force proper width for navbar-right icon elements (they were showing as 7px wide) */
              /* MINIMAL FIX: Only fix width constraint, let LogRhythm handle styling */
              .navbar-right .nav-link,
              .navbar-right .dropdown > .nav-link,
              .navbar-right .nav-item > .nav-link,
              .navbar-right [title="Administration"],
              .navbar-right [title="User Options"],
              .navbar-right [title="Help"] {
                min-width: 48px !important;
                width: auto !important;
                /* Removed text-align, padding, font-size - let LogRhythm handle styling */
              }

              /* Force proper dimensions for navbar-right containers */
              .navbar-right .dropdown.nav-item,
              .navbar-right .nav-item {
                min-width: 48px !important;
                width: auto !important;
              }
            `,
            }}
          />

          {/* Keep Kibana nav drawer for side navigation with pointer events */}
          <div style={{ pointerEvents: 'auto' }}>
            <EuiNavDrawer
              ref={this.navDrawerRef}
              data-test-subj="navDrawer"
              isLocked={isLocked}
              onIsLockedUpdate={onIsLockedUpdate}
            >
              <EuiNavDrawerGroup listItems={recentLinksArray} />
              <EuiHorizontalRule margin="none" />
              <EuiNavDrawerGroup data-test-subj="navDrawerAppsMenu" listItems={navLinksArray} />
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

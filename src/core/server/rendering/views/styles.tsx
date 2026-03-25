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

/* eslint-disable react/no-danger */

import React, { FunctionComponent } from 'react';

import { RenderingMetadata } from '../types';

interface Props {
  darkMode: RenderingMetadata['darkMode'];
}

export const Styles: FunctionComponent<Props> = ({ darkMode }) => {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `

          *, *:before, *:after {
            box-sizing: border-box;
          }

          html, body, div, span, svg {
            margin: 0;
            padding: 0;
            border: none;
            vertical-align: baseline;
          }

          body, html {
            width: 100%;
            height: 100%;
            margin: 0;
            display: block;
          }

          .kbnWelcomeView {
            line-height: 1.5;
            background-color: ${darkMode ? '#1D1E24' : '#FFF'};
            height: 100%;
            display: -webkit-box;
            display: -webkit-flex;
            display: -ms-flexbox;
            display: flex;
            -webkit-box-flex: 1;
            -webkit-flex: 1 0 auto;
                -ms-flex: 1 0 auto;
                    flex: 1 0 auto;
            -webkit-box-orient: vertical;
            -webkit-box-direction: normal;
            -webkit-flex-direction: column;
                -ms-flex-direction: column;
                    flex-direction: column;
            -webkit-box-align: center;
            -webkit-align-items: center;
                -ms-flex-align: center;
                    align-items: center;
            -webkit-box-pack: center;
            -webkit-justify-content: center;
                -ms-flex-pack: center;
                    justify-content: center;
          }

          .kbnWelcomeTitle {
            color: #000;
            font-size: 20px;
            font-family: sans-serif;
            margin: 16px 0;
            animation: fadeIn 1s ease-in-out;
            animation-fill-mode: forwards;
            opacity: 0;
            animation-delay: 1.0s;
          }

          .kbnWelcomeText {
            display: block;
            font-size: 14px;
            font-family: sans-serif;
            line-height: 20px !important;
            height: auto !important;
            margin-top: 8px;
            color: #98a2b3;
            color: ${darkMode ? '#98A2B3' : '#69707D'};
          }

          .kbnLoaderWrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            line-height: 1;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial !important;
            letter-spacing: -.005em;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            font-kerning: normal;
            font-weight: 400;
          }

          .kbnLoaderWrap svg {
            width: 64px;
            height: 64px;
            margin: auto;
            line-height: 1;
          }

          .kbnNetmonSpinnerWrapper {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 84px;
            height: 84px;
            margin: 0 auto 8px;
            background: #ffffff;
          }

          .kbnNetmonSpinner {
            position: relative;
            width: 56px;
            height: 56px;
            animation: kbnNetmonSpin 1.1s linear infinite;
          }

          .kbnNetmonSpinner span {
            position: absolute;
            left: 26px;
            top: 1px;
            width: 4px;
            height: 15px;
            border-radius: 2px;
            background: #20252b;
            transform-origin: 2px 27px;
          }

          .kbnNetmonSpinner span:nth-child(1) { transform: rotate(0deg); opacity: 1.00; }
          .kbnNetmonSpinner span:nth-child(2) { transform: rotate(30deg); opacity: 0.92; }
          .kbnNetmonSpinner span:nth-child(3) { transform: rotate(60deg); opacity: 0.84; }
          .kbnNetmonSpinner span:nth-child(4) { transform: rotate(90deg); opacity: 0.76; }
          .kbnNetmonSpinner span:nth-child(5) { transform: rotate(120deg); opacity: 0.68; }
          .kbnNetmonSpinner span:nth-child(6) { transform: rotate(150deg); opacity: 0.60; }
          .kbnNetmonSpinner span:nth-child(7) { transform: rotate(180deg); opacity: 0.52; }
          .kbnNetmonSpinner span:nth-child(8) { transform: rotate(210deg); opacity: 0.44; }
          .kbnNetmonSpinner span:nth-child(9) { transform: rotate(240deg); opacity: 0.36; }
          .kbnNetmonSpinner span:nth-child(10) { transform: rotate(270deg); opacity: 0.28; }
          .kbnNetmonSpinner span:nth-child(11) { transform: rotate(300deg); opacity: 0.20; }
          .kbnNetmonSpinner span:nth-child(12) { transform: rotate(330deg); opacity: 0.12; }

          .kbnLoader path {
            stroke: white;
          }

          .kbnProgress {
            display: inline-block;
            position: relative;
            width: 32px;
            height: 4px;
            overflow: hidden;
            background-color: ${darkMode ? '#25262E' : '#F5F7FA'};
            line-height: 1;
          }

          .kbnProgress:before {
            position: absolute;
            content: '';
            height: 4px;
            width: 100%;
            top: 0;
            bottom: 0;
            left: 0;
            transform: scaleX(0) translateX(0%);
            animation: kbnProgress 1s cubic-bezier(.694, .0482, .335, 1) infinite;
            background-color: ${darkMode ? '#1BA9F5' : '#006DE4'};
          }

          @keyframes kbnProgress {
            0% {
              transform: scaleX(1) translateX(-100%);
            }

            100% {
              transform: scaleX(1) translateX(100%);
            }
          }

          @keyframes kbnNetmonSpin {
            0% {
              transform: rotate(0deg);
            }

            100% {
              transform: rotate(360deg);
            }
          }
        `,
      }}
    />
  );
};

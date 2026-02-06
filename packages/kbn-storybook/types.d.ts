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

declare module '@storybook/core/types' {
  export interface StorybookConfig {
    stories: string[];
    addons: string[];
    webpackFinal?: (config: any) => any;
    typescript?: {
      reactDocgen?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  }
}

declare module 'loader-utils' {
  export function getOptions(loaderContext: any): any;
  export function interpolateName(loaderContext: any, name: string, options: any): string;
  export function stringifyRequest(loaderContext: any, request: string): string;
}

declare module 'webpack' {
  export interface Configuration {
    [key: string]: any;
  }
  export interface WebpackPluginInstance {
    [key: string]: any;
  }
  export class Stats {
    static presetToOptions(preset: string): any;
    [key: string]: any;
  }
  export const DefinePlugin: any;
  export const ProgressPlugin: any;
}

declare module 'webpack-merge' {
  export function merge(...configs: any[]): any;
  export default merge;
}
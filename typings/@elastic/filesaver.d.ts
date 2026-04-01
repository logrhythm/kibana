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
 * Type declarations for @elastic/filesaver module
 * This file provides TypeScript types for the FileSaver.js library
 */

declare module '@elastic/filesaver' {
  /**
   * Saves a blob as a file using the browser's download functionality
   * @param blob - The Blob object containing the file data
   * @param filename - The desired filename for the download
   * @param disableAutoBOM - Optional parameter to disable automatic BOM addition
   */
  export function saveAs(blob: Blob, filename?: string, disableAutoBOM?: boolean): void;
}

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

import _ from 'lodash';
import { asPrettyString } from '../../utils/as_pretty_string';
import { getHighlightHtml } from '../../../../../core_plugins/kibana/common/highlight/highlight_html';
import { formatNetmonBoolean } from '../../../../../../netmon/field_formats/boolean_formats';

export function createBoolFormat(FieldFormat) {
  class BoolFormat extends FieldFormat {
    static id = 'boolean';
    static title = 'Boolean';
    static fieldType = ['boolean', 'number', 'string'];
  }

  const getTruthy = (value) => {
    switch (value) {
      case false:
      case 0:
      case 'false':
      case 'no':
        return false;
      case true:
      case 1:
      case 'true':
      case 'yes':
        return true;
      default:
        return null;
    }
  };

  const formatText = (value) => {
    if (typeof value === 'string') {
      value = value.trim().toLowerCase();
    }

    const truthy = getTruthy(value);

    if(truthy) {
      return 'true';
    } else if (truthy === false) {
      return 'false';
    }

    return asPrettyString(value);
  };

  const defaultHtml = (value, field, hit) => {
    const formatted = _.escape(formatText(value));

    if(!hit || !hit.highlight || !hit.highlight[field.name]) {
      return formatted;
    } else {
      return getHighlightHtml(formatted, hit.highlight[field.name]);
    }
  };

  BoolFormat.prototype._convert = {
    text: function (value) {
      return formatText(value);
    },
    html: function (value, field, hit) {
      const truthy = getTruthy(value);

      if(!field || truthy === null) {
        return defaultHtml(value, field, hit);
      }

      return formatNetmonBoolean(value, field, hit) || defaultHtml(value, field, hit);
    }
  };

  return BoolFormat;
}

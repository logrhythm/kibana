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

import { BaseVisTypeOptions } from '../base_vis_type';
import { Vis } from '../../vis';
import { buildExpression, buildExpressionFunction } from '../../../../expressions/public';
import { EsaggsExpressionFunctionDefinition } from '../../../../data/common/search/expressions';

/**
 * Network graph visualization - renders force-directed node-link diagrams
 */
export const createNetworkVisTypeDefinition = (): BaseVisTypeOptions => {
  const toExpressionAst = (vis: Vis) => {
    const esaggs = buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
      index: vis.data.indexPattern!.id!,
      metricsAtAllLevels: vis.isHierarchical(),
      partialRows: vis.params.showPartialRows || false,
      aggConfigs: JSON.stringify(vis.data.aggs!.aggs),
      includeFormatHints: false,
    });

    const networkVis = buildExpressionFunction('network_vis', {
      params: JSON.stringify(vis.params || {}),
    });

    return buildExpression([esaggs, networkVis]).toAst();
  };

  return {
    name: 'network',
    title: 'Network',
    description: 'Network node-link visualization',
    icon: 'globe',
    toExpressionAst,
    visConfig: {
      defaults: {
        canvasBackgroundColor: '#FFFFFF',
        displayArrow: false,
        firstNodeColor: '#6F86D7',
        secondNodeColor: '#DAA05D',
        labelColor: '#000000',
        maxNodeSize: 80,
        minNodeSize: 8,
        maxEdgeSize: 20,
        minEdgeSize: 0.1,
        minCutMetricSizeNode: 0,
        nodePhysics: true,
        gravitationalConstant: -35000,
        springConstant: 0.001,
        showLabels: true,
        showColorLegend: true,
        showPopup: true,
        smoothType: 'continuous',
        shapeFirstNode: 'circle',
        shapeSecondNode: 'box',
        shapeArrow: 'arrow',
        posArrow: 'to',
        scaleArrow: 1,
        dimensions: {
          first: [],
          second: [],
          metric: [],
          colornode: [],
        },
      },
    },
    editorConfig: {
      collections: {},
    },
    schemas: {
      all: [
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metrics',
          min: 0,
          max: Infinity,
          aggFilter: ['!geo_centroid', '!geo_bounds', '!top_hits'],
        },
        {
          group: 'metrics',
          name: 'size_node',
          title: 'Size Node',
          min: 0,
          max: 1,
          aggFilter: ['!geo_centroid', '!geo_bounds', '!top_hits'],
        },
        {
          group: 'metrics',
          name: 'size_edge',
          title: 'Size Edge',
          min: 0,
          max: 1,
          aggFilter: ['!geo_centroid', '!geo_bounds', '!top_hits'],
        },
        {
          group: 'buckets',
          name: 'first',
          title: 'First Node (Source)',
          min: 1,
          max: 1,
        },
        {
          group: 'buckets',
          name: 'second',
          title: 'Second Node (Target)',
          min: 1,
          max: 1,
        },
        {
          group: 'buckets',
          name: 'colornode',
          title: 'Color Node',
          min: 0,
          max: 1,
        },
      ],
    },
  };
};

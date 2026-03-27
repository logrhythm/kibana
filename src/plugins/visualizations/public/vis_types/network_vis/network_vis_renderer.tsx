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

import { ExpressionRenderDefinition, KibanaDatatable } from '../../../../expressions/public';
import { NetworkVisRenderValue } from './network_vis_fn';

interface Node {
  id: string;
  type: 'source' | 'target';
  metrics: number;
  color?: string;
  x: number;
  y: number;
}

interface Link {
  source: number;
  target: number;
  value: number;
  color?: string;
  colorKey?: string;
}

interface ParsedNetworkData {
  nodes: Node[];
  links: Link[];
  legend: Record<string, string>;
}

const PALETTE = [
  '#8e44ad',
  '#16a085',
  '#3498db',
  '#f39c12',
  '#2ecc71',
  '#e67e22',
  '#1abc9c',
  '#9b59b6',
  '#27ae60',
  '#2980b9',
  '#d35400',
  '#c0392b',
  '#f1c40f',
  '#34495e',
];

const unwrapValue = (value: unknown): unknown => {
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>).value;
  }
  return value;
};

const getTable = (visData?: KibanaDatatable | any): KibanaDatatable | null => {
  if (!visData || typeof visData !== 'object') {
    return null;
  }

  if (visData.type === 'kibana_datatable' && Array.isArray(visData.rows)) {
    return visData as KibanaDatatable;
  }

  if (visData.type === 'datatable' && Array.isArray(visData.rows)) {
    return visData as KibanaDatatable;
  }

  if (
    Array.isArray(visData.tables) &&
    visData.tables.length > 0 &&
    Array.isArray(visData.tables[0].rows)
  ) {
    return visData.tables[0] as KibanaDatatable;
  }

  if (Array.isArray(visData.rows) && Array.isArray(visData.columns)) {
    return visData as KibanaDatatable;
  }

  return null;
};

const scaleMetric = (value: number, min: number, max: number, outMin: number, outMax: number) => {
  if (max <= min) return (outMin + outMax) / 2;
  const ratio = (value - min) / (max - min);
  return outMin + ratio * (outMax - outMin);
};

const scaleMetricSqrt = (
  value: number,
  min: number,
  max: number,
  outMin: number,
  outMax: number
) => {
  if (max <= min) return (outMin + outMax) / 2;
  const minRoot = Math.sqrt(Math.max(min, 0));
  const maxRoot = Math.sqrt(Math.max(max, 0));
  const valueRoot = Math.sqrt(Math.max(value, 0));
  const ratio = maxRoot === minRoot ? 0.5 : (valueRoot - minRoot) / (maxRoot - minRoot);
  return outMin + ratio * (outMax - outMin);
};

function resolveFieldIds(table: KibanaDatatable, params: any) {
  const columns = table.columns || [];
  const columnIds = columns.map((col) => col.id);

  const byAccessor = (accessor: unknown) => {
    if (typeof accessor === 'number' && accessor >= 0 && accessor < columns.length) {
      return columns[accessor].id;
    }
    return undefined;
  };

  const getDimensionAccessor = (name: string) => {
    const dim = params?.dimensions?.[name];
    return Array.isArray(dim) && dim.length > 0 ? dim[0]?.accessor : undefined;
  };

  const sourceAccessor = params?.sourceAccessor ?? getDimensionAccessor('first');
  const targetAccessor = params?.targetAccessor ?? getDimensionAccessor('second');
  const nodeMetricAccessor = params?.nodeMetricAccessor ?? getDimensionAccessor('size_node');
  const edgeMetricAccessor = params?.edgeMetricAccessor ?? getDimensionAccessor('size_edge');
  const fallbackMetricAccessor = params?.metricAccessor ?? getDimensionAccessor('metric');
  const colorAccessor = params?.colorAccessor ?? getDimensionAccessor('colornode');

  const sourceField = byAccessor(sourceAccessor) || params?.sourceField || columnIds[0];
  const targetField =
    byAccessor(targetAccessor) || params?.targetField || columnIds[1] || columnIds[0];

  const nodeMetricsField =
    byAccessor(nodeMetricAccessor) ||
    byAccessor(fallbackMetricAccessor) ||
    params?.nodeMetricsField;
  const edgeMetricsField =
    byAccessor(edgeMetricAccessor) || byAccessor(fallbackMetricAccessor) || params?.metricsField;
  const colorField = byAccessor(colorAccessor) || params?.colorField;

  return {
    sourceField,
    targetField,
    nodeMetricsField,
    edgeMetricsField,
    colorField,
  };
}

function parseNetworkData(visData: KibanaDatatable | any, params: any): ParsedNetworkData {
  const table = getTable(visData);

  if (
    !table ||
    !Array.isArray(table.rows) ||
    table.rows.length === 0 ||
    !Array.isArray(table.columns)
  ) {
    return { nodes: [], links: [], legend: {} };
  }

  const { sourceField, targetField, nodeMetricsField, edgeMetricsField, colorField } =
    resolveFieldIds(table, params);

  if (!sourceField || !targetField) {
    return { nodes: [], links: [], legend: {} };
  }

  const nodes: Node[] = [];
  const links: Link[] = [];
  const nodeIndexById = new Map<string, number>();
  const metricBySource = new Map<string, number>();
  const degreeByTarget = new Map<string, number>();

  const linkByKey = new Map<string, Link>();
  const legend: Record<string, string> = {};
  const sourceColorMap: Record<string, string> = {};
  let nextPalette = 0;

  const assignColor = (key: string) => {
    if (!legend[key]) {
      legend[key] = PALETTE[nextPalette % PALETTE.length];
      nextPalette += 1;
    }
    return legend[key];
  };

  table.rows.forEach((row) => {
    const sourceRaw = unwrapValue((row as Record<string, unknown>)[sourceField]);
    const targetRaw = unwrapValue((row as Record<string, unknown>)[targetField]);

    const sourceId = sourceRaw == null ? '' : String(sourceRaw);
    const targetId = targetRaw == null ? '' : String(targetRaw);

    if (!sourceId || !targetId) {
      return;
    }

    const nodeMetricRaw = nodeMetricsField
      ? unwrapValue((row as Record<string, unknown>)[nodeMetricsField])
      : 1;
    const edgeMetricRaw = edgeMetricsField
      ? unwrapValue((row as Record<string, unknown>)[edgeMetricsField])
      : nodeMetricRaw;

    const nodeMetric =
      typeof nodeMetricRaw === 'number' && !Number.isNaN(nodeMetricRaw) ? nodeMetricRaw : 1;
    const edgeMetric =
      typeof edgeMetricRaw === 'number' && !Number.isNaN(edgeMetricRaw) ? edgeMetricRaw : 1;

    const colorRaw = colorField
      ? unwrapValue((row as Record<string, unknown>)[colorField])
      : undefined;
    const colorKey = colorRaw == null ? undefined : String(colorRaw);

    let edgeColor: string;
    if (colorKey) {
      edgeColor = assignColor(colorKey);
    } else {
      if (!sourceColorMap[sourceId]) {
        sourceColorMap[sourceId] = PALETTE[nextPalette % PALETTE.length];
        nextPalette += 1;
      }
      edgeColor = sourceColorMap[sourceId];
    }

    if (!nodeIndexById.has(sourceId)) {
      nodeIndexById.set(sourceId, nodes.length);
      nodes.push({ id: sourceId, type: 'source', metrics: 0, color: edgeColor, x: 0, y: 0 });
    }

    if (!nodeIndexById.has(targetId)) {
      nodeIndexById.set(targetId, nodes.length);
      nodes.push({ id: targetId, type: 'target', metrics: 1, x: 0, y: 0 });
    }

    metricBySource.set(sourceId, (metricBySource.get(sourceId) || 0) + nodeMetric);
    degreeByTarget.set(targetId, (degreeByTarget.get(targetId) || 0) + 1);

    const linkKey = `${sourceId}@@${targetId}@@${colorKey || sourceId}`;
    const source = nodeIndexById.get(sourceId);
    const target = nodeIndexById.get(targetId);

    if (source === undefined || target === undefined) {
      return;
    }

    const existing = linkByKey.get(linkKey);
    if (existing) {
      existing.value += edgeMetric;
    } else {
      linkByKey.set(linkKey, {
        source,
        target,
        value: edgeMetric,
        color: edgeColor,
        colorKey,
      });
    }
  });

  nodes.forEach((node) => {
    if (node.type === 'source') {
      node.metrics = metricBySource.get(node.id) || 1;
    } else {
      const degree = degreeByTarget.get(node.id) || 1;
      node.metrics = Math.max(1, degree);
    }
  });

  linkByKey.forEach((link) => links.push(link));

  if (!colorField) {
    return { nodes, links, legend: {} };
  }

  return { nodes, links, legend };
}

function runForceLayout(nodes: Node[], links: Link[], width: number, height: number, params: any) {
  nodes.forEach((node) => {
    node.x = width * (0.12 + Math.random() * 0.76);
    node.y = height * (0.14 + Math.random() * 0.72);
  });

  if (params?.nodePhysics === false) {
    return;
  }

  const iterations = 220;
  const repulsion = Math.max(
    2,
    Math.min(16, Math.abs(params?.gravitationalConstant || 35000) / 6000)
  );
  const spring = Math.max(0.002, Math.min(0.04, (params?.springConstant || 0.001) * 14));
  const damping = 0.86;

  const vx = new Array(nodes.length).fill(0);
  const vy = new Array(nodes.length).fill(0);

  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = dx * dx + dy * dy + 0.1;
        const dist = Math.sqrt(distSq);
        const force = repulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        vx[i] -= fx;
        vy[i] -= fy;
        vx[j] += fx;
        vy[j] += fy;
      }
    }

    links.forEach((link) => {
      const a = nodes[link.source];
      const b = nodes[link.target];
      if (!a || !b) return;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ideal = 150;
      const stretch = dist - ideal;
      const force = stretch * spring;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      vx[link.source] += fx;
      vy[link.source] += fy;
      vx[link.target] -= fx;
      vy[link.target] -= fy;
    });

    for (let i = 0; i < nodes.length; i += 1) {
      vx[i] *= damping;
      vy[i] *= damping;
      nodes[i].x += vx[i] * 9;
      nodes[i].y += vy[i] * 9;

      nodes[i].x = Math.max(24, Math.min(width - 24, nodes[i].x));
      nodes[i].y = Math.max(24, Math.min(height - 24, nodes[i].y));
    }
  }
}

const renderNoData = (domNode: HTMLElement) => {
  const empty = document.createElement('div');
  empty.style.display = 'flex';
  empty.style.alignItems = 'center';
  empty.style.justifyContent = 'center';
  empty.style.width = '100%';
  empty.style.height = '100%';
  empty.style.color = '#666';
  empty.style.fontSize = '14px';
  empty.textContent = 'No network data available for current filters';
  domNode.appendChild(empty);
};

const networkVisRenderer: ExpressionRenderDefinition<NetworkVisRenderValue> = {
  name: 'network_vis',
  displayName: 'Network Graph',
  help: 'Renders network node-link diagrams from Elasticsearch data',
  validate: () => Promise.resolve(),
  reuseDomNode: true,
  render(domNode: HTMLElement, config: NetworkVisRenderValue, handlers: any) {
    if (!domNode) {
      handlers.done();
      return;
    }

    domNode.innerHTML = '';

    const params = config.visParams || {};
    const { nodes, links, legend } = parseNetworkData(config.visData, params);

    if (nodes.length === 0 || links.length === 0) {
      renderNoData(domNode);
      handlers.done();
      return;
    }

    const width = domNode.clientWidth || 800;
    const height = domNode.clientHeight || 600;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.style.backgroundColor = params.canvasBackgroundColor || '#FFFFFF';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3, 0 6');
    polygon.setAttribute('fill', '#777');
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    runForceLayout(nodes, links, width, height, params);

    const sourceNodes = nodes.filter((n) => n.type === 'source');
    const targetNodes = nodes.filter((n) => n.type === 'target');

    const minSourceMetric = Math.min(...sourceNodes.map((n) => n.metrics));
    const maxSourceMetric = Math.max(...sourceNodes.map((n) => n.metrics));
    const minTargetMetric = Math.min(...targetNodes.map((n) => n.metrics));
    const maxTargetMetric = Math.max(...targetNodes.map((n) => n.metrics));

    let minEdgeMetric = Infinity;
    let maxEdgeMetric = -Infinity;
    links.forEach((l) => {
      minEdgeMetric = Math.min(minEdgeMetric, l.value);
      maxEdgeMetric = Math.max(maxEdgeMetric, l.value);
    });

    links.forEach((link, idx) => {
      const sourceNode = nodes[link.source];
      const targetNode = nodes[link.target];
      if (!sourceNode || !targetNode) return;

      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const nx = -dy / dist;
      const ny = dx / dist;
      const curve = 8 + (idx % 3) * 5;
      const cx = (sourceNode.x + targetNode.x) / 2 + nx * curve;
      const cy = (sourceNode.y + targetNode.y) / 2 + ny * curve;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute(
        'd',
        `M ${sourceNode.x} ${sourceNode.y} Q ${cx} ${cy} ${targetNode.x} ${targetNode.y}`
      );

      const minEdgeWidth = Math.max(0.2, Math.min(1, params.minEdgeSize || 0.2));
      const maxEdgeWidth = Math.max(2.5, Math.min(5.5, params.maxEdgeSize || 5.5));
      const edgeWidth = scaleMetricSqrt(
        link.value,
        minEdgeMetric,
        maxEdgeMetric,
        minEdgeWidth,
        maxEdgeWidth
      );

      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', link.color || '#b0b0b0');
      path.setAttribute('stroke-opacity', '0.45');
      path.setAttribute('stroke-width', String(edgeWidth));

      if (params.displayArrow) {
        path.setAttribute('marker-end', 'url(#arrowhead)');
      }

      g.appendChild(path);
    });

    nodes.forEach((node) => {
      const nodeSize =
        node.type === 'source'
          ? scaleMetric(
              node.metrics,
              minSourceMetric,
              maxSourceMetric,
              Math.max(10, params.minNodeSize || 8),
              Math.min(34, params.maxNodeSize || 30)
            )
          : scaleMetric(node.metrics, minTargetMetric, maxTargetMetric, 8, 16);

      if (node.type === 'source') {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(node.x));
        circle.setAttribute('cy', String(node.y));
        circle.setAttribute('r', String(nodeSize / 2));
        circle.setAttribute('fill', node.color || params.firstNodeColor || '#6F86D7');
        circle.setAttribute('stroke', '#4a4a4a');
        circle.setAttribute('stroke-width', '1.3');
        g.appendChild(circle);
      } else {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(node.x - nodeSize / 2));
        rect.setAttribute('y', String(node.y - nodeSize / 2));
        rect.setAttribute('width', String(nodeSize));
        rect.setAttribute('height', String(nodeSize));
        rect.setAttribute('fill', params.secondNodeColor || '#DAA05D');
        rect.setAttribute('stroke', '#4a4a4a');
        rect.setAttribute('stroke-width', '1.2');
        g.appendChild(rect);
      }

      if (params.showLabels) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x));
        text.setAttribute('y', String(node.y + nodeSize / 2 + 12));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10');
        text.setAttribute('fill', params.labelColor || '#000000');
        text.setAttribute('pointer-events', 'none');
        text.textContent = node.id.length > 18 ? `${node.id.slice(0, 15)}...` : node.id;
        g.appendChild(text);
      }
    });

    if (params.showColorLegend && Object.keys(legend).length > 0) {
      const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const legendX = 22;
      const legendY = 26;
      const lineHeight = 14;
      const legendKeys = Object.keys(legend);

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', String(legendX - 8));
      bg.setAttribute('y', String(legendY - 14));
      bg.setAttribute('width', '170');
      bg.setAttribute('height', String(24 + legendKeys.length * lineHeight));
      bg.setAttribute('fill', '#efefef');
      bg.setAttribute('fill-opacity', '0.9');
      legendGroup.appendChild(bg);

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      title.setAttribute('x', String(legendX));
      title.setAttribute('y', String(legendY));
      title.setAttribute('font-size', '11');
      title.setAttribute('font-weight', 'bold');
      title.setAttribute('fill', '#555');
      title.textContent = 'COLOR LEGEND:';
      legendGroup.appendChild(title);

      legendKeys.forEach((key, i) => {
        const item = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        item.setAttribute('x', String(legendX));
        item.setAttribute('y', String(legendY + 14 + i * lineHeight));
        item.setAttribute('font-size', '10');
        item.setAttribute('font-weight', 'bold');
        item.setAttribute('fill', legend[key]);
        item.textContent = key;
        legendGroup.appendChild(item);
      });

      svg.appendChild(legendGroup);
    }

    domNode.appendChild(svg);

    svg.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 0.9 : 1.1;
      const transform = g.getAttribute('transform') || '';
      const currentScale = transform.includes('scale')
        ? parseFloat(transform.match(/scale\(([\d.]+)\)/)?.[1] || '1')
        : 1;
      const newScale = Math.max(0.15, Math.min(10, currentScale * scale));
      g.setAttribute('transform', `scale(${newScale})`);
    });

    handlers.done();
  },
};

export { networkVisRenderer };

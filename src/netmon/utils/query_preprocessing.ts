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
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

/**
 * Smart Lucene Query Preprocessing
 *
 * This utility ensures queries are valid Lucene syntax while preserving user intent:
 * - Simple terms like "http" become "*http*" (valid Lucene wildcard)
 * - Complex queries with wildcards, field queries, boolean operators are preserved exactly
 * - Prevents server 500 errors while maintaining search functionality
 */

/**
 * Checks if a query term is already a valid Lucene expression
 * @param term The query term to check
 * @returns true if the term is already valid Lucene syntax
 */
function isValidLuceneExpression(term: string): boolean {
  const trimmed = term.trim();

  // Empty or whitespace-only
  if (!trimmed) {
    return false;
  }

  // Contains wildcards (* or ?)
  if (trimmed.includes('*') || trimmed.includes('?')) {
    return true;
  }

  // Field queries (field:value)
  if (/\w+:/.test(trimmed)) {
    return true;
  }

  // Boolean operators
  if (/\b(AND|OR|NOT)\b/i.test(trimmed)) {
    return true;
  }

  // Quoted strings
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return true;
  }

  // Range queries
  if (/[\[\{].*TO.*[\]\}]/i.test(trimmed)) {
    return true;
  }

  // Regular expressions
  if (trimmed.startsWith('/') && trimmed.endsWith('/')) {
    return true;
  }

  // Proximity searches
  if (/".*"~\d+/.test(trimmed)) {
    return true;
  }

  // Boosting
  if (/\^[\d.]+/.test(trimmed)) {
    return true;
  }

  // Parentheses for grouping
  if (trimmed.includes('(') || trimmed.includes(')')) {
    return true;
  }

  return false;
}

/**
 * Preprocesses a query to ensure Lucene compatibility
 * @param query The original query string
 * @returns The preprocessed query string
 */
export function preprocessQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return query || '';
  }

  const trimmed = query.trim();

  // Empty query
  if (!trimmed) {
    return trimmed;
  }

  // If already a valid Lucene expression, preserve exactly
  if (isValidLuceneExpression(trimmed)) {
    return query; // Preserve original formatting
  }

  // Simple term - add trailing wildcard for postfix matching
  // This prevents server errors while maintaining search intent
  return `${trimmed}*`;
}

/**
 * Test cases for query preprocessing
 * Used for validation and debugging
 */
export const TEST_CASES = [
  // Simple terms (should have trailing wildcard only)
  { input: 'http', expected: 'http*', description: 'Simple term' },
  { input: 'ssd', expected: 'ssd*', description: 'Simple term' },
  { input: 'tcp', expected: 'tcp*', description: 'Simple term' },
  { input: '  error  ', expected: 'error*', description: 'Simple term with whitespace' },

  // Already valid Lucene (should be preserved exactly)
  { input: '*http*', expected: '*http*', description: 'Already wildcarded' },
  { input: 'http*', expected: 'http*', description: 'Trailing wildcard' },
  { input: '*http', expected: '*http', description: 'Leading wildcard' },
  { input: 'field:value', expected: 'field:value', description: 'Field query' },
  { input: 'src_ip:10.0.0.1', expected: 'src_ip:10.0.0.1', description: 'IP field query' },
  { input: 'http AND tcp', expected: 'http AND tcp', description: 'Boolean AND' },
  { input: 'http OR tcp', expected: 'http OR tcp', description: 'Boolean OR' },
  { input: 'NOT error', expected: 'NOT error', description: 'Boolean NOT' },
  { input: '"exact phrase"', expected: '"exact phrase"', description: 'Quoted phrase' },
  { input: '[100 TO 200]', expected: '[100 TO 200]', description: 'Range query' },
  { input: '/regex.*pattern/', expected: '/regex.*pattern/', description: 'Regular expression' },
  { input: '"phrase query"~2', expected: '"phrase query"~2', description: 'Proximity search' },
  { input: 'term^2.5', expected: 'term^2.5', description: 'Boosted term' },
  {
    input: '(http OR tcp) AND error',
    expected: '(http OR tcp) AND error',
    description: 'Grouped query',
  },

  // Edge cases
  { input: '', expected: '', description: 'Empty string' },
  { input: '   ', expected: '', description: 'Whitespace only' },
  { input: 'host?', expected: 'host?', description: 'Question mark wildcard' },
];

/**
 * Runs all test cases and returns results
 * @returns Array of test results with pass/fail status
 */
export function runTests(): Array<{
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  description: string;
}> {
  return TEST_CASES.map((testCase) => {
    const actual = preprocessQuery(testCase.input);
    const passed = actual === testCase.expected;

    return {
      ...testCase,
      actual,
      passed,
    };
  });
}

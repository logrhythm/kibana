#!/bin/bash
# Quick check of Elasticsearch and Kibana status

echo "=== Elasticsearch Indices ==="
curl -s "http://localhost:9200/_cat/indices?v" | grep -E "(network|events|netmon|logrhythm)" || echo "No matching indices found"

echo -e "\n=== Total Document Count ==="
curl -s "http://localhost:9200/_cat/indices?v&h=index,docs.count" | grep -E "(network|events|netmon|logrhythm)" || echo "No data indices found"

echo -e "\n=== Kibana Index Patterns ==="
curl -s "http://localhost:5601/analyze/api/saved_objects/_find?type=index-pattern&per_page=100" | jq -r '.saved_objects[]?.attributes.title' 2>/dev/null || echo "No index patterns found or Kibana not responding"

echo -e "\n=== Kibana Dashboards ==="
curl -s "http://localhost:5601/analyze/api/saved_objects/_find?type=dashboard&per_page=100" | jq -r '.saved_objects[]?.attributes.title' 2>/dev/null || echo "No dashboards found or Kibana not responding"

echo -e "\n=== Summary ==="
data_count=$(curl -s "http://localhost:9200/_cat/indices?h=docs.count" | awk '{sum += $1} END {print sum}')
echo "Total documents in ES: ${data_count:-0}"

pattern_count=$(curl -s "http://localhost:5601/analyze/api/saved_objects/_find?type=index-pattern&per_page=100" | jq '.saved_objects | length' 2>/dev/null)
echo "Index patterns in Kibana: ${pattern_count:-0}"

dashboard_count=$(curl -s "http://localhost:5601/analyze/api/saved_objects/_find?type=dashboard&per_page=100" | jq '.saved_objects | length' 2>/dev/null)
echo "Dashboards in Kibana: ${dashboard_count:-0}"

# Copyright 2020 LogRhythm, Inc
# Licensed under the LogRhythm Global End User License Agreement,
# which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/

# File: configureKibana.py - Updated for Kibana 7.10.2
#
# Author: Craig Cogdill
# Updated: LogRhythm Team - Added Kibana 7.10.2 saved objects API support

import sys
import json
import requests
import time
from os import listdir
from os.path import isfile, join, splitext
from util import Utility
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

UTIL = Utility()
logging, rotating_handler = UTIL.get_logging()
logger = logging.getLogger()

# Update paths for 7.10.2
resources = '/usr/local/kibana-7.10.2-linux-x64/resources'
kibana_base_url = 'http://localhost:5601/analyze'

def check_elasticsearch_health():
    try:
        url = 'http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=60s'
        session = requests.Session()
        response = session.get(url)
        if not response.ok:
            response.raise_for_status()

        logger.info('elasticsearch status:\n' + UTIL.pretty_format(response.json()))
        return True

    except Exception as err:
        logger.warning('[configureKibana.py] Caught HTTP exception: {0}'.format(err))
        return False

def check_kibana_health():
    """Check if Kibana API is ready"""
    try:
        url = f'{kibana_base_url}/api/status'
        session = requests.Session()
        retries = Retry(total=10, backoff_factor=0.5, status_forcelist=[500, 503, 502])
        session.mount('http://', HTTPAdapter(max_retries=retries))

        response = session.get(url, timeout=30)
        if not response.ok:
            logger.warning(f'Kibana not ready: {response.status_code}')
            return False

        status_data = response.json()
        overall_status = status_data.get('status', {}).get('overall', {}).get('state', 'unknown')
        logger.info(f'Kibana status: {overall_status}')
        return overall_status == 'green'

    except Exception as err:
        logger.warning(f'[configureKibana.py] Kibana health check failed: {err}')
        return False

def create_index_pattern(pattern_id, pattern_title, time_field='@timestamp'):
    """Create index pattern using Kibana saved objects API"""
    try:
        url = f'{kibana_base_url}/api/saved_objects/index-pattern/{pattern_id}?overwrite=true'

        data = {
            "attributes": {
                "title": pattern_title,
                "timeFieldName": time_field
            }
        }

        headers = {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true'
        }

        session = requests.Session()
        retries = Retry(total=5, backoff_factor=0.3, status_forcelist=[500, 503])
        session.mount('http://', HTTPAdapter(max_retries=retries))

        response = session.post(url, headers=headers, json=data, timeout=30)

        if not response.ok:
            logger.warning(f'Failed to create index pattern {pattern_id}: {response.status_code} - {response.text}')
            return False

        logger.info(f'Created index pattern: {pattern_title}')
        return True

    except Exception as err:
        logger.warning(f'[configureKibana.py] Failed to create index pattern {pattern_id}: {err}')
        return False

def put_saved_object_via_api(object_type, object_id, content):
    """Upload saved object using Kibana saved objects API"""
    try:
        url = f'{kibana_base_url}/api/saved_objects/{object_type}/{object_id}?overwrite=true'

        # Extract attributes from the content
        attributes = content
        if 'attributes' in content:
            attributes = content['attributes']
        elif object_type in content:
            attributes = content[object_type]

        data = {
            "attributes": attributes
        }

        # Add references if they exist
        if 'references' in content:
            data['references'] = content['references']

        headers = {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true'
        }

        session = requests.Session()
        retries = Retry(total=5, backoff_factor=0.3, status_forcelist=[500, 503])
        session.mount('http://', HTTPAdapter(max_retries=retries))

        response = session.post(url, headers=headers, json=data, timeout=30)

        if not response.ok:
            logger.warning(f'Failed to create {object_type} {object_id}: {response.status_code} - {response.text}')
            return False, response.text

        logger.info(f'Created {object_type}: {object_id}')
        return True, response.text

    except Exception as err:
        logger.warning(f'[configureKibana.py] Failed to create {object_type} {object_id}: {err}')
        return False, str(err)

def parse_resource_filename(filename):
    """Parse resource filename to get object type and ID"""
    # Format: dashboard:Alarm-Trend-Dashboard.json -> ('dashboard', 'Alarm-Trend-Dashboard')
    name_without_ext = splitext(filename)[0]
    if ':' in name_without_ext:
        object_type, object_id = name_without_ext.split(':', 1)
        return object_type, object_id
    else:
        # Fallback for files without type prefix
        return 'unknown', name_without_ext

def load_assets(path_to_files):
    """Load assets using Kibana saved objects API"""
    if not check_kibana_health():
        logger.error('Kibana is not ready for API calls')
        return False

    # Create required index patterns first
    logger.info('Creating index patterns...')
    create_index_pattern('361f5c00-b47c-11e9-86a0-cd3d7bf2f81b', 'network_*', '@timestamp')
    create_index_pattern('f655f660-db31-11e9-9a47-f1b6a93b3342', 'events_*', '@timestamp')

    # Load saved objects from files
    try:
        files = [filename for filename in listdir(path_to_files) if isfile(join(path_to_files, filename))]
        logger.info(f'Found {len(files)} resource files to load')

        success_count = 0
        for file in files:
            logger.info(f'--------- Processing {file} ---------')
            full_file_path = join(path_to_files, file)

            # Parse filename to determine object type and ID
            object_type, object_id = parse_resource_filename(file)

            if object_type == 'unknown':
                logger.warning(f'Could not determine object type for {file}, skipping')
                continue

            # Load JSON content
            try:
                content = UTIL.read_json_from_file(full_file_path)
                if not content:
                    logger.warning(f'Could not read content from {file}')
                    continue

                # Create the saved object
                created, result = put_saved_object_via_api(object_type, object_id, content)
                if created:
                    success_count += 1
                else:
                    logger.warning(f'Failed to load {object_type}: {object_id}')

            except Exception as err:
                logger.warning(f'Error processing {file}: {err}')
                continue

        logger.info(f'Successfully loaded {success_count}/{len(files)} objects')
        return success_count > 0

    except Exception as err:
        logger.error(f'Error loading assets: {err}')
        return False

def setup_config():
    """Set up Kibana configuration using saved objects API"""
    try:
        # Use Kibana settings API instead of direct ES access
        url = f'{kibana_base_url}/api/kibana/settings'

        headers = {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true'
        }

        # Set up default settings
        settings = {
            'search:queryLanguage': 'lucene',
            'defaultIndex': '361f5c00-b47c-11e9-86a0-cd3d7bf2f81b'
        }

        session = requests.Session()
        retries = Retry(total=5, backoff_factor=0.3, status_forcelist=[500, 503])
        session.mount('http://', HTTPAdapter(max_retries=retries))

        for key, value in settings.items():
            setting_data = {'value': value}
            response = session.post(f'{url}/{key}', headers=headers, json=setting_data, timeout=30)

            if response.ok:
                logger.info(f'Set {key} = {value}')
            else:
                logger.warning(f'Failed to set {key}: {response.status_code} - {response.text}')

    except Exception as err:
        logger.warning(f'[configureKibana.py] Setup config failed: {err}')

def verify_setup():
    """Verify that objects were created successfully"""
    try:
        # Check index patterns
        response = requests.get(f'{kibana_base_url}/api/saved_objects/_find?type=index-pattern&per_page=100', timeout=30)
        if response.ok:
            patterns = response.json().get('saved_objects', [])
            logger.info(f'Verification: Found {len(patterns)} index patterns')
        else:
            patterns = []

        # Check dashboards
        response = requests.get(f'{kibana_base_url}/api/saved_objects/_find?type=dashboard&per_page=100', timeout=30)
        if response.ok:
            dashboards = response.json().get('saved_objects', [])
            logger.info(f'Verification: Found {len(dashboards)} dashboards')
        else:
            dashboards = []

        return len(patterns) > 0 and len(dashboards) > 0

    except Exception as err:
        logger.warning(f'Verification failed: {err}')
        return False

# ----------------- MAIN -----------------
def main():
    logger.info('Starting LogRhythm Kibana configuration...')

    # Check Elasticsearch first
    es_ok = check_elasticsearch_health()
    if not es_ok:
        logger.error('Elasticsearch is not ready')
        sys.exit(1)

    # Wait for Kibana to be fully ready
    logger.info('Waiting for Kibana to be ready...')
    kibana_ready = False
    for attempt in range(30):  # Wait up to 5 minutes
        if check_kibana_health():
            kibana_ready = True
            break
        logger.info(f'Kibana not ready, attempt {attempt + 1}/30, waiting 10 seconds...')
        time.sleep(10)

    if not kibana_ready:
        logger.error('Kibana did not become ready in time')
        sys.exit(1)

    logger.info('Kibana is ready, proceeding with configuration...')

    # Set up configuration
    setup_config()

    # Load all assets using the new API method
    success = load_assets(resources)

    if success:
        # Verify setup
        if verify_setup():
            logger.info('✅ LogRhythm Kibana configuration completed successfully!')
        else:
            logger.warning('⚠️ Configuration completed but verification failed')
    else:
        logger.error('❌ Failed to load Kibana assets')
        sys.exit(1)

if __name__ == '__main__':
    main()

# File: loadAssets.py
#
# Author: Craig Cogdill

import json
import time
from elasticsearch import Elasticsearch
from scripts import util
logging, rotating_handler = util.configure_and_return_logging()
from os import listdir
from os.path import isfile, join, splitext
es = Elasticsearch(max_retries=5, retry_on_timeout=True)

resources = "/usr/local/kibana-" + util.KIBANA_VERSION + "-linux-x64/resources"
dashboards_path = resources + "/dashboards" 
visualizations_path = resources + "/visualizations" 
searches_path = resources + "/searches" 

dashboard_type = "dashboard"
visualization_type = "visualization"
search_type = "search"

def create_document_from_file(es_index, es_type, es_id, path_to_updated_json):
    content = util.read_json_from_file(path_to_updated_json)
    return util.function_with_timeout(util.STARTUP_TIMEOUT,
                                      util.create_document,
                                          es_index,
                                          es_type,
                                          es_id,
                                          content)

def get_es_id(filename):
    return splitext(filename)[0]

def get_version_of_file(file):
    file_json = util.read_json_from_file(file)
    version_from_file = util.safe_list_read(file_json, 'version')
    return version_from_file

def update_existing_document(es_index, es_type, es_id, path_to_updated_json):
    deleted, del_ret_val = util.function_with_timeout(util.ES_QUERY_TIMEOUT, 
                                                      util.delete_document,
                                                        es_index,
                                                        es_type,
                                                        es_id)
    logging.info("Delete returns: " + str(json.dumps(del_ret_val)))
    created, create_ret_val = create_document_from_file(es_index,
                                                      es_type,
                                                      es_id,
                                                      path_to_updated_json)
    logging.info("Create returns: " + str(create_ret_val))

def es_version_is_outdated(es_index, es_type, es_id, full_file_path):
    get_response_json = util.get_request_as_json(es_index, es_type, es_id)
    version_of_disk_file = get_version_of_file(full_file_path)
    es_file_source = util.safe_list_read(get_response_json, '_source')
    version_of_es_file = util.safe_list_read(es_file_source, 'version')
    return version_of_disk_file > version_of_es_file, version_of_disk_file, version_of_es_file

def load_assets(es_index, es_type, path_to_files, files):
    for file in files:
        logging.info("--------- " + file + " ---------")
        full_file_path = path_to_files + "/" + file
        es_id = get_es_id(file)
        ignored, asset_exists = util.function_with_timeout(util.ES_QUERY_TIMEOUT,
                                      util.document_exists,
                                          es_index,
                                          es_type,
                                          es_id)
        if asset_exists:
            es_outdated, version_of_disk_file, version_of_es_file = es_version_is_outdated(es_index,
                                                                                           es_type,
                                                                                           es_id,
                                                                                           full_file_path)
            if es_outdated:
                logging.info("File \"" + str(file) + "\" is outdated and requires update from version " + str(version_of_es_file) +
                             " to version " + str(version_of_disk_file) + ". Updating it now...")
                update_existing_document(es_index, es_type, es_id, full_file_path)
            else:
                logging.info("Current version of file \"" + str(file) + "\" in Elasticsearch is up-to-date. Version: " + str(version_of_es_file))
        else:
            logging.info("File \"" + str(file) + "\" doesn't exist in Elasticsearch. Creating it now...")
            created, created_ret = create_document_from_file(es_index, es_type, es_id, full_file_path)
            logging.info("Create returns: " + created_ret)


# ----------------- MAIN -----------------
def main():

    # Create arrays of the filenames in each of the resource dirs
    dashboards = [filename for filename in listdir(dashboards_path) if isfile(join(dashboards_path, filename))]
    visualizations = [filename for filename in listdir(visualizations_path) if isfile(join(visualizations_path, filename))]
    searches = [filename for filename in listdir(searches_path) if isfile(join(searches_path, filename))]

    # Load all the artifacts appropriately
    logging.info("================================== DASHBOARDS ==================================")
    load_assets(util.KIBANA_INDEX, dashboard_type, dashboards_path, dashboards)
    logging.info("================================== VISUALIZATIONS ==================================")
    load_assets(util.KIBANA_INDEX, visualization_type, visualizations_path, visualizations)
    logging.info("================================== SEARCHES ==================================")
    load_assets(util.KIBANA_INDEX, search_type, searches_path, searches)

if __name__ == '__main__':
    main()

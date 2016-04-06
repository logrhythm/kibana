# File: defaultIndex.py
#
# Author: Craig Cogdill

import logging
import json
import time
from elasticsearch import Elasticsearch
logging.basicConfig(filename="/var/log/probe/pythonKibanaStartup.log",
                    level=logging.DEBUG,
                    format='%(asctime)s %(levelname)s:  %(message)s',
                    datefmt='%Y/%m/%d %H:%M:%S')
es = Elasticsearch()
localhost="localhost:9200"
nm_index_pattern='[network_]YYYY_MM_DD'
default_index='"defaultIndex": \"%s\"' % nm_index_pattern
indent_level = 3
kibana_index = ".kibana"
index_pattern_type = "index-pattern"
config_type = "config"
kibana_version = "4.1.4"
created=True

index_pattern_content = {
    "title": "[network_]YYYY_MM_DD",
    "timeInverval": "days",
    "defaultTimeField": "TimeUpdated"
}

version_config_content = {
    "defaultIndex": "[network_]YYYY_MM_DD"
}

def format_for_update(content):
    return "{ \"doc\": " + str(json.dumps(content)) + " }"

def update_document(es_index, es_type, es_id, content):
    return json.dumps(es.update(index=es_index, doc_type=es_type, id=es_id, body=content))

def search_index_and_type(es_index, es_type, query):
    search_response_raw = json.dumps(es.search(index=es_index,
                                               doc_type=es_type,
                                               q=query),
                                     indent=indent_level)
    search_response_json = json.loads(search_response_raw)
    search_number_of_hits = search_response_json['hits']['total']
    return search_number_of_hits

def verify_document_for_content(es_index, es_type, content):
    missing_elements = {}
    content_json = json.loads(json.dumps(content))
    for key in content_json.keys():
        query = key + ':' + '"'+ content_json[key] + '"'
        hits = search_index_and_type(es_index, es_type, query)
        if (hits > 0):
            logging.debug(str(hits) + " hit(s) for " + str(query) + ".")
        else:
            logging.debug("No hits for " + str(query) + ". Attempting to update index...")
            missing_elements[key] = content_json[key]
    return missing_elements

def create_document(es_index, es_type, es_id, es_body):
    return json.dumps(es.create(index=es_index,
                                doc_type=es_type,
                                id=es_id,
                                body=es_body),
                      indent=indent_level)

def create_document_if_it_doesnt_exist(es_index, es_type, es_id, es_body):
    document_exists = es.exists(index=es_index, doc_type=es_type, id=es_id)
    if (not document_exists):
        logging.info('Document %s/%s/%s/%s does not exist. Creating it now...', localhost, es_index, es_type, es_id)
        create_document = create_document(es_index, es_type, es_id, es_body)
        logging.info("Create document returns: \n %s", create_document)
        return created
    else:
        logging.info("Document %s/%s/%s/%s already exists.", localhost, es_index, es_type, es_id)
        return not created


def sleep_if_necessary(need_to_sleep):
    if (need_to_sleep):
        time.sleep(1)

# ----------------- MAIN -----------------
logging.debug("================================== INDEX PATTERN ==================================")
index_pattern_doc_created = create_document_if_it_doesnt_exist(kibana_index,
                                                               index_pattern_type,
                                                               nm_index_pattern,
                                                               index_pattern_content)
sleep_if_necessary(index_pattern_doc_created) # ES doesn't show the index-pattern updates immediately after inserting them
index_pattern_missing_fields = verify_document_for_content(kibana_index,
                                                           index_pattern_type,
                                                           index_pattern_content)
if (len(index_pattern_missing_fields) > 0):
    logging.info("Updating Network Monitor index-pattern with missing fields: ")
    for key in index_pattern_missing_fields:
        logging.info("      " + key + ":    " + config_missing_fields[key])
    update_document(kibana_index,
                    index_pattern_type,
                    nm_index_pattern,
                    format_for_update(index_pattern_missing_fields))
else:
    logging.info("No missing index-pattern fields.")

logging.debug("================================== " + kibana_version + " CONFIG ==================================")
config_doc_created = create_document_if_it_doesnt_exist(kibana_index,
                                                        config_type,
                                                        kibana_version,
                                                        version_config_content)
sleep_if_necessary(config_doc_created) # ES doesn't show the updates immediately after inserting them
config_missing_fields = verify_document_for_content(kibana_index,
                                                    config_type,
                                                    version_config_content)
if (len(config_missing_fields) > 0):
    logging.info("Updating " + kibana_version + " config with missing fields:   ")
    for key in config_missing_fields:
        logging.info("      " + key + ":    " + config_missing_fields[key])
    update_document(kibana_index,
                    index_pattern_type,
                    nm_index_pattern,
                    format_for_update(config_missing_fields))
else:
    logging.info("No missing " + kibana_version + " config fields.")



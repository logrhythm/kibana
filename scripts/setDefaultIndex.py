# File: setDefaultIndex.py
#
# Author: Craig Cogdill

import time
import json
from scripts import util
logging, rotating_handler = util.configure_and_return_logging()


nm_index_pattern='[network_]YYYY_MM_DD'
default_index='"defaultIndex": \"%s\"' % nm_index_pattern
VERIFIED = 1

index_pattern_content = {
    "title": "[network_]YYYY_MM_DD",
    "timeInverval": "days",
    "defaultTimeField": "TimeUpdated"
}

version_config_content = {
    "defaultIndex": "[network_]YYYY_MM_DD"
}

def all_keys_verified(dict):
  all_verified = True
  for key in dict:
    all_verified = all_verified and dict[key]
  return all_verified


def add_missing_elements_to_dict(to_verify, original_content):
    missing_elements = {}
    for key in to_verify:
        if to_verify[key] != VERIFIED:
            logging.debug("No hits for \"" + 
                          key +
                          "\":\"" +
                          original_content[key] +
                          "\". Adding to list of missing fields...")
            missing_elements[key] = original_content[key]
    return missing_elements


def verify_document_for_content(es_index, es_type, content):
    logging.info("Verifying content exists in Elasticsearch correctly. This could take several Elasticsearch requests.")
    start_time = time.time()
    content_json = json.loads(json.dumps(content))
    to_verify = util.copy_dict_keys(content_json)
    # There is approximately a one second delay between
    #   when a document is inserted and when it can be
    #   retrieved. Rather than sleeping for a set amount
    #   of time and then checking for the document only
    #   once, we set a timeout period and query elasticsearch
    #   continuously until the document is retrieved.
    #
    #   If the timeout passes and no document has been
    #   retrieved, we will report that it is missing and
    #   try to reinsert it.
    while not all_keys_verified(to_verify) and not util.time_has_run_out(start_time, time.time(), util.ES_QUERY_TIMEOUT):
        for key in content_json.keys():
            if to_verify[key] != VERIFIED:
                query = key + ':' + '"'+ content_json[key] + '"'
                hits = util.search_index_and_type(es_index, es_type, query)
                if hits > 0:    
                    to_verify[key] = VERIFIED
                    logging.info(str(hits) + " hit(s) for " + str(query) + ".")
        time.sleep(0.2) # 200ms
    return add_missing_elements_to_dict(to_verify, content_json)


def create_document_if_it_doesnt_exist(es_index, es_type, es_id, es_body):
    document_created = False
    ignored, doc_existence = util.function_with_timeout(util.ES_QUERY_TIMEOUT,
                                                        util.document_exists,
                                                            es_index,
                                                            es_type,
                                                            es_id)
    if not doc_existence:
        logging.info('Document %s/%s/%s/%s does not exist. Creating it now...', util.LOCALHOST, es_index, es_type, es_id)
        document_created, created_ret = util.function_with_timeout(util.STARTUP_TIMEOUT,
                                                                   util.create_document,
                                                                       es_index,
                                                                       es_type,
                                                                       es_id,
                                                                       es_body)
        logging.info("Create document returns: \n %s", created_ret)
        return document_created
    else:
        logging.info("Document %s/%s/%s/%s already exists.", util.LOCALHOST, es_index, es_type, es_id)
        return document_created


# ----------------- MAIN -----------------
def main():
    logging.info("================================== INDEX PATTERN ==================================")
    index_pattern_doc_created = create_document_if_it_doesnt_exist(util.KIBANA_INDEX,
                                                                   util.INDEX_PATTERN_TYPE,
                                                                   nm_index_pattern,
                                                                   index_pattern_content)
    index_pattern_missing_fields = verify_document_for_content(util.KIBANA_INDEX,
                                                               util.INDEX_PATTERN_TYPE,
                                                               index_pattern_content)
    if len(index_pattern_missing_fields) > 0:
        logging.info("Updating Network Monitor index-pattern with missing fields: ")
        for key in index_pattern_missing_fields:
            logging.info("      " + key + ":    " + index_pattern_missing_fields[key])
        updated, update_ret = util.function_with_timeout(util.ES_QUERY_TIMEOUT,
                                                         util.update_document,
                                                            util.KIBANA_INDEX,
                                                            util.INDEX_PATTERN_TYPE,
                                                            nm_index_pattern,
                                                            util.format_for_update(index_pattern_missing_fields))
        if not updated:
            logging.error("Unable to add missing index-pattern fields:")
            logging.error(update_ret)
    else:
        logging.info("No missing index-pattern fields.")

    logging.info("================================== " + util.KIBANA_VERSION + " CONFIG ==================================")
    config_doc_created = create_document_if_it_doesnt_exist(util.KIBANA_INDEX,
                                                            util.CONFIG_TYPE,
                                                            util.KIBANA_VERSION,
                                                            version_config_content)
    config_missing_fields = verify_document_for_content(util.KIBANA_INDEX,
                                                        util.CONFIG_TYPE,
                                                        version_config_content)
    if len(config_missing_fields) > 0:
        logging.info("Updating " + util.KIBANA_VERSION + " config with missing fields:   ")
        for key in config_missing_fields:
            logging.info("      " + key + ":    " + config_missing_fields[key])
        updated, update_ret = util.function_with_timeout(util.ES_QUERY_TIMEOUT,
                                                         util.update_document,
                                                            util.KIBANA_INDEX,
                                                            util.INDEX_PATTERN_TYPE,
                                                            nm_index_pattern,
                                                            util.format_for_update(config_missing_fields))
        if not updated:
            logging.error("Unable to add missing index-pattern fields:")
            logging.error(update_ret)
    else:
        logging.info("No missing " + util.KIBANA_VERSION + " config fields.")


if __name__ == '__main__':
    main()
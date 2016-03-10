#! /bin/sh

KIBANA_PREFIX="localhost:9200/.kibana"
INDEX_PATTERN="/index-pattern/network_*"
INDEX_PATTERN_SPEC="{\"title\": \"network_*\", \"timeFieldName\": \"TimeUpdated\", \"customFormats\": {}}"
DEFAULT_INDEX="{\"defaultIndex\":\"network_*\"}"
VER="4.1.4"
CONFIG="/config/$VER"
PRETTY="?pretty"

NOT_FOUND="not found"
CREATE="/_create"
UPDATE="/_update"
JSON_FLAG="-d"
XHEAD_PARAMS="-i"

KIBANA_LOG_FILE="/var/log/probe/KibanaStartup.log"

if [ ! -e $KIBANA_LOG_FILE ]; then
   touch $KIBANA_LOG_FILE
fi


# Create the index pattern and specify TimeUpdated as the default time parameter
curl "$XHEAD_PARAMS" -XHEAD "$KIBANA_PREFIX""$INDEX_PATTERN" | grep -i "$NOT_FOUND"
index_pattern_exists=$?
if [ $index_pattern_exists == 0  ]; then
   echo `date +'%D %T'` "    Index pattern \"network_*\" DOES NOT exist. Creating it now..." >> $KIBANA_LOG_FILE
   echo `date +'%D %T'` "    POST returned:"                                                 >> $KIBANA_LOG_FILE
   curl -XPOST "$KIBANA_PREFIX""$INDEX_PATTERN""$CREATE""$PRETTY" -d "$INDEX_PATTERN_SPEC"   >> $KIBANA_LOG_FILE
   echo `date +'%D %T'` "    Result of -> curl -XGET $KIBANA_PREFIX$INDEX_PATTERN$PRETTY:"   >> $KIBANA_LOG_FILE
   curl -XGET "$KIBANA_PREFIX""$INDEX_PATTERN""$PRETTY"                                      >> $KIBANA_LOG_FILE
else
   echo `date +'%D %T'` "    Index pattern \"network_*\" ALREADY EXISTS."                    >> $KIBANA_LOG_FILE
fi

# Specify for our $VER config that the default index should be the newly created "network_*" index pattern
curl "$XHEAD_PARAMS" -XHEAD "$KIBANA_PREFIX""$CONFIG" | grep -i "$NOT_FOUND"
config_exists=$?
if [ $config_exists == 0  ]; then
   echo `date +'%D %T'` "    Config record for $VER DOES NOT exist. Creating it now..."      >> $KIBANA_LOG_FILE
   echo `date +'%D %T'` "    POST returned:"                                                 >> $KIBANA_LOG_FILE
   curl -XPOST "$KIBANA_PREFIX""$CONFIG""$CREATE""$PRETTY" "$JSON_FLAG" "$DEFAULT_INDEX"     >> $KIBANA_LOG_FILE
   echo `date +'%D %T'` "    Result of -> curl -XGET $KIBANA_PREFIX$CONFIG$PRETTY:"          >> $KIBANA_LOG_FILE
   curl -XGET "$KIBANA_PREFIX""$CONFIG""$PRETTY"                                             >> $KIBANA_LOG_FILE
else
   echo `date +'%D %T'` "    Config record for $VER ALREADY EXISTS."                         >> $KIBANA_LOG_FILE
fi

# If you stop XDELETE the kibana index while kibana is still running, it can rebuild the
#  config type with ID 4.1.4 on its own. We need to check for this and update the record
#  to include "defaultIndex": "network_*"

curl -XGET "$KIBANA_PREFIX""$CONFIG" | grep -i '\"defaultIndex\":\"network_\*\"'
config_has_default_index=$?
if [ $config_has_default_index != 0 ]; then
   echo `date +'%D %T'` "    Config for $VER exists, but no default index is specified"      >> $KIBANA_LOG_FILE
   echo `date +'%D %T'` "    Updating config/$VER record with default index \"network_*\""   >> $KIBANA_LOG_FILE
   curl -XPOST "$KIBANA_PREFIX""$CONFIG""$UPDATE" "$JSON_FLAG" \'{\"doc\": $DEFAULT_INDEX}\' >> $KIBANA_LOG_FILE
   echo `date +'%D %T'` "    Result of -> curl -XGET $KIBANA_PREFIX$CONFIG$PRETTY:"          >> $KIBANA_LOG_FILE
   curl -XGET "$KIBANA_PREFIX""$CONFIG""$PRETTY"                                             >> $KIBANA_LOG_FILE
else
   echo `date +'%D %T'` "    defaultIndex parameter for index pattern \"network_*\" is set"  >> $KIBANA_LOG_FILE
fi





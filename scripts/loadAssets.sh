#! /bin/sh

KIBANA_LOG_FILE="/var/log/probe/KibanaStartup.log"
KIBANA_PREFIX="localhost:9200/.kibana"
VER="4.1.4"

TOP_LEVEL_DIR="/usr/local/kibana-$VER-linux-x64"
DASHBOARDS="dashboards"
VISUALIZATIONS="visualizations"
SEARCHES="searches"
PRETTY="?pretty"

# Directories directly under the kibana folder include:
#   dashboards
#   visualizations
#   searches

cd "$TOP_LEVEL_DIR"

# DASHBOARDS
curl -i -XHEAD "$KIBANA_PREFIX"/dashboard | grep -i "not found"
dashboards_set=$?
if [ $dashboards_set == 0 ]; then
    echo `date +'%D %T'` "    INSERTING DASHBOARDS INTO ELASTICSEARCH"                                                >> $KIBANA_LOG_FILE
    for file in $TOP_LEVEL_DIR/$DASHBOARDS/*.json
    do
        FILENAME=${file##*/}
        KIBANA_ID=${FILENAME%.*}
        echo `date +'%D %T'` "    Creating $FILENAME dashboard record at $KIBANA_PREFIX/dashboard/$KIBANA_ID"         >> $KIBANA_LOG_FILE 
        curl -XPOST ${KIBANA_PREFIX}/dashboard/${KIBANA_ID} \
             -d @${file} || exit 1                                                                                    >> $KIBANA_LOG_FILE
    done
else
    echo `date +'%D %T'` "    Dashboards have already been inserted"                                                  >> $KIBANA_LOG_FILE
fi

# VISUALIZATIONS
curl -i -XHEAD "$KIBANA_PREFIX"/visualization | grep -i "not found"
visualizations_set=$?
if [ $visualizations_set == 0 ]; then
    echo `date +'%D %T'` "    INSERTING VISUALIZATIONS INTO ELASTICSEARCH"                                            >> $KIBANA_LOG_FILE
    for file in $TOP_LEVEL_DIR/$VISUALIZATIONS/*.json
    do
        FILENAME=${file##*/}
        KIBANA_ID=${FILENAME%.*}
        echo `date +'%D %T'` "    Creating $FILENAME visualization record at $KIBANA_PREFIX/visualization/$KIBANA_ID" >> $KIBANA_LOG_FILE
        curl -XPOST ${KIBANA_PREFIX}/visualization/${KIBANA_ID} \
             -d @${file} || exit 1                                                                                    >> $KIBANA_LOG_FILE
    done
else
    echo `date +'%D %T'` "    Visualizations have already been inserted"                                              >> $KIBANA_LOG_FILE
fi

# SEARCHES
curl -i -XHEAD "$KIBANA_PREFIX"/search | grep -i "not found"
searches_set=$?
if [ $searches_set == 0 ]; then
    echo `date +'%D %T'` "    INSERTING SEARCHES INTO ELASTICSEARCH"                                                  >> $KIBANA_LOG_FILE
    for file in $TOP_LEVEL_DIR/$SEARCHES/*.json
    do
        FILENAME=${file##*/}
        KIBANA_ID=${FILENAME%.*}
        echo `date +'%D %T'` "    Creating $FILENAME search record at $KIBANA_PREFIX/search/$KIBANA_ID"               >> $KIBANA_LOG_FILE
        curl -XPOST ${KIBANA_PREFIX}/${KIBANA_INDEX}/search/${KIBANA_ID} \
            -d @${file} || exit 1                                                                                     >> $KIBANA_LOG_FILE
    done
else
    echo `date +'%D %T'` "    Searches have already been inserted"                                                    >> $KIBANA_LOG_FILE
fi

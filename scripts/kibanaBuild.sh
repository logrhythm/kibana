#!/usr/bin/env bash

set -e
set -x

# This script will build kibana and update the .tar.gz file in the target directory
if [[ $# -gt 2 || $# -lt 1 ]] ; then
    echo 'Usage:  sh kibanaBuild.sh <PROTOBUFFER-BRANCH> <PROTOBUFFER-GIT-USER<optional>>'
    exit 0
fi


LOCATION=$PWD

BRANCH="$1"

if [ $# -eq 2 ]; then
   USER=$2
else
   USER="Logrhythm"
fi
echo "USER IS $USER";

echo "Building: $BRANCH for USER: $USER"

git clone git@lrgit:$USER/Protobuffers.git -b $BRANCH

kibanaBuildDir=$PWD

cd Protobuffers
sh scripts/buildUIFieldMap.sh
cp js/fieldMap.js $kibanaBuildDir/src/kibana/netmon_libs/
cd $kibanaBuildDir
rm -rf Protobuffers

# The steps below are commented out but kept to show
# what is needed to to when re-building 
# bower_components, node_modules etc. 
# -----------------------------------------------------
#sed -i s/\'shasum/\'sha1sum/g tasks/create_shasums.js
#sed -i s/0.10.x/0.10.42/g .node-version
#NVM_DIR="$PWD/nvm" bash scripts/kibanaSpecHelper_install_nvm.sh
#source $PWD/nvm/nvm.sh
#nvm install "$(cat .node-version)"
#npm install
#source nvm/nvm.sh

export NVM_DIR=$PWD/nvm
source nvm/nvm.sh
rm -f target/*
nvm/v0.10.42/bin/node node_modules/grunt-cli/bin/grunt build

echo "***** SUCCESS ****"
ls -alh target/


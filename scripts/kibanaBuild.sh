#!/usr/bin/env bash

set -e
set -x

# This script will build kibana and update the .tar.gz file in the target directory

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

# Extract node_modules
rm -rf node_modules
tar xvzf node_modules.tgz

# extracting kibana bower components
rm -rf src/kibana/bower_components
tar xvzf bower_components.tgz

# extracting the nvm needed for the final build step
rm -rf nvm
tar xvzf nvm.tgz
export NVM_DIR=$PWD/nvm
source nvm/nvm.sh
rm -f target/*
nvm/v0.10.42/bin/node node_modules/grunt-cli/bin/grunt build

echo "***** SUCCESS ****"
ls -alh target/

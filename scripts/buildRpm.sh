#!/bin/bash
set -e
set -x

if [[ $# -gt 3 || $# -lt 2 ]] ; then
    echo 'Usage:  sh buildRpm <KIBANA-OFFICIAL-BRANCH> <PROTOBUFFER-BRANCH> <PROTOBUFFER-GIT-USER<optional>>'
    exit 0
fi


PACKAGE=kibana
GIT_VERSION=`git rev-list --branches HEAD | wc -l`
GIT_BRANCH="$1"
VERSION="$GIT_BRANCH.$GIT_VERSION"
PWD=`pwd`


PROTO_BRANCH=$2
if [ $# -eq 3 ]; then
   PROTO_USER=$3
else
   PROTO_USER="Logrhythm"
fi


rm -rf ~/rpmbuild
rpmdev-setuptree
cp packaging/$PACKAGE.spec ~/rpmbuild/SPECS
rm -f $PACKAGE-$VERSION.tar.gz
tar cvzf ~/rpmbuild/SOURCES/$PACKAGE-$VERSION.tar.gz -C $PWD .
rpmbuild -v -bb --define="version ${VERSION}" --define="kibana_version ${GIT_BRANCH}" --define="protobuf_user $PROTO_USER" --define="proto_branch $PROTO_BRANCH" --target=x86_64 ~/rpmbuild/SPECS/$PACKAGE.spec

# Copyright 2020 LogRhythm, Inc
# Licensed under the LogRhythm Global End User License Agreement,
# which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/

Summary:       Custom LogRhythm kibana
Name:          kibana
Version:       %{version}
Release:       1%{?dist}
License:       https://github.com/elastic/kibana/blob/master/licenses/APACHE-LICENSE-2.0.txt
Group:         Development/Tools
URL:           https://github.com/elastic/kibana
Source:        https://github.com/elastic/kibana
Requires:      python >= 2.7.5, python-requests, python-chardet
Requires(post): systemd

%description
Kibana build for LogRhythm NetMon

%prep
#cleanup
cd %_builddir
rm -rf %{name}
mkdir %{name}
cd %{name}

%global __requires_exclude_from ^/usr/local/kibana.*/node_modules/.*$
%global __provides_exclude_from ^/usr/local/kibana.*/node_modules/.*$
%global __requires_exclude ^(/usr/bin/python2|/usr/bin/python22|/usr/bin/python23)$

#extract sources
tar xf %_sourcedir/%{name}-%{version}.tar
if [ $? -ne 0 ]; then
   exit $?
fi

#extract dlumbrer/kbn_network plugin, following the renaming and file modification steps from github repo
unzip resources/plugins/kbn_network*.zip -d plugins/
if [ $? -ne 0 ]; then
   echo "Exiting build. Could not unzip plugin."
   exit 1
fi
rm -rf plugins/network_vis/images/

getent group nginx > /dev/null || groupadd -f -g 904 -r nginx
if ! getent passwd nginx >/dev/null ; then
    if ! getent passwd 904 >/dev/null ; then
      useradd -r -u 904 -g nginx -s /sbin/nologin -c "LogRhythm nginx" nginx
    else
      useradd -r -g nginx -s /sbin/nologin -c "LogRhythm nginx" nginx
    fi
fi

%build
#must install kibana dependencies before running build due to a `yarn kbn bootstrap` bug that strips auth
cd %{name}
/usr/bin/yarn

#plugin has a package.json that must also be installed before running build
cd plugins/network_vis/
/usr/bin/yarn

#run the build
cd ../../
/usr/bin/yarn kbn bootstrap
NODE_OPTIONS="--max-old-space-size=8192" node scripts/build --rpm --oss --skip-archives --release --verbose --allow-root

%install
cd %{name}
mkdir -p %{buildroot}/lib/systemd/system
cp systemd/kibana.service %{buildroot}/lib/systemd/system

mkdir -p %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64
cp -a build/oss/%{name}-%{kibana_version}-linux-x86_64/* %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/
cp -a resources/ %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/

# FIX: Create the data directory explicitly so RPM sets permissions on it
mkdir -p %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/data

# Copy Tether to Kibana's assets directory
cp node_modules/tether/dist/js/tether.min.js %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/src/core/server/core_app/assets/

# Ensure all plugin target directories and bundles are properly copied
if [ -d "build/oss/%{name}-%{kibana_version}-linux-x86_64/src" ]; then
    cp -r build/oss/%{name}-%{kibana_version}-linux-x86_64/src/* %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/src/ 2>/dev/null || true
fi

# Ensure node_modules/@kbn/ui-shared-deps is copied with target directory
if [ -d "build/oss/%{name}-%{kibana_version}-linux-x86_64/node_modules/@kbn/ui-shared-deps" ]; then
    mkdir -p %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/node_modules/@kbn/
    cp -r build/oss/%{name}-%{kibana_version}-linux-x86_64/node_modules/@kbn/ui-shared-deps %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/node_modules/@kbn/
fi

mkdir -p %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/exportAssets.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/configureKibana.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/util.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/kibana-post-start.sh %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/removeOldKibanaIndices.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp -a plugins/ %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/

find %{buildroot} -type f -name "*.py" -exec sed -i '1s|#!.*python|#!/usr/bin/python2|' {} +
find %{buildroot} -type f \( -name "*.md" -o -name "*.json" -o -name "*.js" \) -exec chmod -x {} +
find %{buildroot} -path "*/node-gyp/gyp/*" -type f -exec sed -i '1s|#!.*python|#!/usr/bin/python2|' {} +

mkdir -p %{buildroot}/usr/local/www/probe/
# FIX: Adjusted symlink to point to the linux-x64 directory created above
ln -sf /usr/local/%{name}-%{kibana_version}-linux-x64 %{buildroot}/usr/local/www/probe/%{name}-%{kibana_version}-linux-x64

%post
# FIX: Set proper ownership after installation
chown -R nginx:nginx /usr/local/%{name}-%{kibana_version}-linux-x64
/usr/bin/systemctl daemon-reload
/usr/bin/systemctl disable kibana.service
/usr/bin/systemctl enable kibana.service

if [ -f "/usr/local/%{name}-%{kibana_version}-linux-x64/resources/visualization:Top-10-Dest-Ports-By-Flow-Count.json" ]
then
   rm -rf "/usr/local/%{name}-%{kibana_version}-linux-x64/resources/visualization:Top-10-Dest-Ports-By-Flow-Count.json"
fi

%files
%defattr(-,nginx,nginx,-)
/usr/local/www/probe/
/usr/local/%{name}-%{kibana_version}-linux-x64
%attr(0644,root,root) /lib/systemd/system/kibana.service

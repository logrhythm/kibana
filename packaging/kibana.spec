Summary:       custom logrhythm kibana
Name:          kibana
Version:       %{version}
Release:       1%{?dist}
License:       https://github.com/joyent/node/blob/master/LICENSE
Group:         Development/Tools
URL:           https://github.com/joyent/%{name}
Source:        http://nodejs.org/dist/v%{version}/%{name}-v{%version}.tar.gz
Requires:      python-elasticsearch >= 1.0.0
Requires(post): systemd

%description
kibana build for logrhythm

%prep
#cleanup
cd %_builddir
rm -rf %{name}
mkdir %{name}
cd %{name}
#extract sources
tar xzf %_sourcedir/%{name}-%{version}.tar.gz
if [ $? -ne 0 ]; then
   exit $?
fi

%build
cd %{name}
sh scripts/kibanaBuild.sh %{proto_branch} %{protobuf_user}
%install
cd %{name}
#extract the built tarball to the www location
mkdir -p %{buildroot}/usr/local/www/probe/
mkdir -p %{buildroot}/lib/systemd/system
tar xvf target/%{name}-%{kibana_version}-linux-x64.tar.gz -C %{buildroot}/usr/local/
cp systemd/kibana.service %{buildroot}/lib/systemd/system
cp -r resources/ %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/
mkdir -p %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/setDefaultIndex.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/loadAssets.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
cp scripts/util.py %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/scripts
ln -sf /usr/local/%{name}-%{kibana_version}-linux-x64 %{buildroot}/usr/local/www/probe/%{name}-%{kibana_version}-linux-x64

%post
/usr/bin/systemctl enable kibana.service

# Remove the bash scripts if they exists. These have been replaced with python scripts.
if [ -e /usr/local/%{name}-%{kibana_version}-linux-x64/setDefaultIndex.sh ]; then
   rm /usr/local/%{name}-%{kibana_version}-linux-x64/setDefaultIndex.sh
fi

if [ -e /usr/local/%{name}-%{kibana_version}-linux-x64/loadAssets.sh ]; then
   rm /usr/local/%{name}-%{kibana_version}-linux-x64/loadAssets.sh
fi

if [ -e /usr/local/%{name}-%{kibana_version}-linux-x64/refreshKibanaIndex.sh ]; then
   rm /usr/local/%{name}-%{kibana_version}-linux-x64/refreshKibanaIndex.sh
fi

%postun

%files
%defattr(-,nginx,nginx,-)
/usr/local/www/probe
/usr/local/%{name}-%{kibana_version}-linux-x64
%attr(0644,root,root) /lib/systemd/system/kibana.service

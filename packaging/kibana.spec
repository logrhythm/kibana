Summary:       custom logrhythm kibana
Name:          kibana
Version:       %{version}
Release:       1%{?dist}
License:       https://github.com/joyent/node/blob/master/LICENSE
Group:         Development/Tools
URL:           https://github.com/joyent/%{name}
Source:        http://nodejs.org/dist/v%{version}/%{name}-v{%version}.tar.gz

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
%install
cd %{name}
#extract the built tarball to the www location
mkdir -p %{buildroot}/usr/local/www/probe/
mkdir -p %{buildroot}/etc/init
tar xvf target/%{name}-%{kibana_version}-linux-x64.tar.gz -C %{buildroot}/usr/local/
cp init/kibana.conf %{buildroot}/etc/init
cp -r dashboards/ %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/
cp -r visualizations/ %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/
cp -r searches/ %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/
cp scripts/setDefaultIndex.sh %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/
cp scripts/loadAssets.sh %{buildroot}/usr/local/%{name}-%{kibana_version}-linux-x64/

%post
link=/usr/local/www/probe/%{name}-%{kibana_version}-linux-x64
if [ ! -L $link ]; then
   ln -s /usr/local/%{name}-%{kibana_version}-linux-x64 $link
   sudo chown -R  nginx:nginx $link
fi
%postun

%files
%defattr(-,nginx,nginx,-)
/usr/local/%{name}-%{kibana_version}-linux-x64
%attr(0644,root,root) /etc/init/kibana.conf

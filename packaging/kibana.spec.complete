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
#modify shasum to use sha1sum for centos
sed -i s/\'shasum/\'sha1sum/g tasks/create_shasums.js
sed -i s/0.10.x/0.10.42/g .node-version
#ensure nvm is installed
NVM_DIR="%_builddir/%{name}/nvm" bash scripts/kibanaSpecHelper_install_nvm.sh
source %_builddir/%{name}/nvm/nvm.sh
#install the correct node version locally
nvm install "$(cat .node-version)"
#install all of the dependencies
npm install
%build
#run the build
cd %{name}
source nvm/nvm.sh
nvm/v0.10.42/bin/node node_modules/grunt-cli/bin/grunt build
%install
cd %{name}
#extract the built tarball to the www location
mkdir -p %{buildroot}/usr/local/www/probe/
mkdir -p %{buildroot}/etc/init
tar xvf target/%{name}-%{kibana_version}-linux-x64.tar.gz -C %{buildroot}/usr/local/
cp init/kibana.conf %{buildroot}/etc/init

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

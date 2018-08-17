var child_process = require('child_process');
var Promise = require('bluebird');
var join = require('path').join;
var mkdirp = Promise.promisifyAll(require('mkdirp'));

var execFile = Promise.promisify(child_process.execFile);

var getBaseNames = function (grunt) {
  var packageName = grunt.config.get('pkg.name');
  var version = grunt.config.get('pkg.version');
  var platforms = grunt.config.get('platforms');
  return platforms.map(function (platform) {
    return packageName + '-' + version + '-' + platform;
  });
};

function createPackages(grunt) {
  grunt.registerTask('create_packages', function () {
    var done = this.async();
    var target = grunt.config.get('target');
    var distPath = join(grunt.config.get('build'), 'dist');
    var version = grunt.config.get('pkg.version');

    var createPackage = function (name) {
      var options = { cwd: distPath };
      var archiveName = join(target, name);
      var commands = [];
      var arch = /x64$/.test(name) ? 'x86_64' : 'i686';

      var fpm_options = [ 'fpm', '-f', '-p', target, '-s', 'dir', '-n', 'kibana', '-v', version,
                          '--after-install', join(distPath, 'user', 'installer.sh'),
                          '--after-remove', join(distPath, 'user', 'remover.sh'),
                          '--config-files', '/opt/kibana/config/kibana.yml' ];
      var fpm_files = join(distPath, name) + '/=/opt/kibana';

      // kibana.tar.gz
      commands.push([ 'tar', '-zcf', archiveName + '.tar.gz', name ]);

      return mkdirp.mkdirpAsync(target)
        .then(function (arg) {
          return Promise.map(commands, function (cmd) {
            return execFile(cmd.shift(), cmd, options);
          });
        }, function (err) { console.log('Failure on ' + name + ': ' + err); });
    };

    Promise.map(getBaseNames(grunt), createPackage).finally(done);
  });
}

module.exports = createPackages;
createPackages.getBaseNames = getBaseNames;

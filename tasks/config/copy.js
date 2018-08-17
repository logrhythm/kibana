module.exports = function (grunt) {
<<<<<<< HEAD
  var version = grunt.config.get('pkg.version');
  var platforms = grunt.config.get('platforms');

  var config = {

    kibana_src: {
      expand: true,
      cwd: '<%= app %>',
      src: '**',
      dest: '<%= build %>/src/'
    },

    server_src: {
      files: [
        {
          src: '<%= root %>/package.json',
          dest: '<%= build %>/kibana/package.json'
        },
        {
          src: '<%= server %>/app.js',
          dest: '<%= build %>/kibana/app.js'
        },
        {
          src: '<%= server %>/index.js',
          dest: '<%= build %>/kibana/index.js'
        },
        {
          expand: true,
          cwd: '<%= server %>/bin/',
          src: '**',
          dest: '<%= build %>/kibana/bin'
        },
        {
          expand: true,
          cwd: '<%= server %>/config/',
          src: '*.yml',
          dest: '<%= build %>/kibana/config'
        },
        {
          expand: true,
          cwd: '<%= server %>/lib/',
          src: '**',
          dest: '<%= build %>/kibana/lib'
        },
        {
          expand: true,
          cwd: '<%= server %>/routes/',
          src: '**',
          dest: '<%= build %>/kibana/routes'
        },
        {
          expand: true,
          cwd: '<%= server %>/views/',
          src: '**',
          dest: '<%= build %>/kibana/views'
        }
      ]
    },

    dist: {
      options: { mode: true },
      files: [
        {
          expand: true,
          cwd: '<%= build %>/kibana',
          src: '**',
          dest: '<%= build %>/dist/kibana/src'
        },
        {
          expand: true,
          cwd: '<%= server %>/config/',
          src: 'kibana.yml',
          dest: '<%= build %>/dist/kibana/config/'
        }
      ]
    },

    deps: {
      options: { mode: '0644' },
      files: [
        {
          expand: true,
          cwd: '<%= bowerComponentsDir %>/ace-builds/src-noconflict/',
          src: 'worker-json.js',
          dest: '<%= build %>/dist/kibana/src/public/'
        }
      ]
    },

    versioned_dist: {
=======
  return {
    devSource: {
>>>>>>> c7e08ea770e835975ecda41c96016daf798c7f6e
      options: { mode: true },
      src: [
        'src/**',
        'bin/**',
        'webpackShims/**',
        'config/kibana.yml',
        '!src/**/__tests__/**',
        '!src/testUtils/**',
        '!src/fixtures/**',
        '!src/plugins/devMode/**',
        '!src/plugins/testsBundle/**',
        '!src/cli/cluster/**',
      ],
      dest: 'build/kibana',
      expand: true
    },
<<<<<<< HEAD

    plugin_readme: {
      files: [
        {
          src: '<%= build %>/kibana/public/plugins/README.txt',
          dest: '<%= build %>/dist/kibana/plugins/README.txt'
        }
      ]
    },

    shrinkwrap: {
      src: '<%= root %>/npm-shrinkwrap.json',
      dest: '<%= build %>/dist/kibana/src/npm-shrinkwrap.json'
    }

=======
>>>>>>> c7e08ea770e835975ecda41c96016daf798c7f6e
  };
};

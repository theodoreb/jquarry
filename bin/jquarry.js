"use strict";

var fs = require('fs');
var program = require('commander');
var scanFile = require('../lib/target/scan-jquery-use');
var debug = require('debug')('main');
var _ = require('underscore');
var glob = require('glob');

program
  .command('*')
  .action(function(env, options) {

    function getModulesFromFile(file) {
      return _.keys(scanFile(String(fs.readFileSync(env + file))));
    }

    function processFiles(files) {
      var modules = [];
      modules = _.uniq(_.flatten(files.map(getModulesFromFile)));
      if (modules.length) {
        var keys = modules.map(function (k) { return '+' + k; });
        // Check whether Sizzle selectors are loaded.
        if (keys.indexOf('+sizzle') === -1) {
          if (!(/Selectors?/g).test(keys.join(','))) {
            keys.unshift('-sizzle');
            keys.unshift('+selector-native');
          }
          else {
            keys.unshift('+sizzle');
          }
        }
        // Core is always needed.
        if (keys.indexOf('+core') === -1) {
          keys.unshift('+core');
        }
        console.log('grunt build:*' + (keys.length ? ':' + keys.join(':') : '*') + ' && grunt uglify');
      }
      else {
        console.log('jQuery is not used.');
      }
    }

    if (env.indexOf('.js') === -1) {
      env = env[env.length - 1] === '/' ? env : env + '/';
      glob("**/*.js", {cwd: env}, function (er, files) {
        debug(files);
        processFiles(files);
      });
    }
    else {
      var files = [env];
      debug(files);
      processFiles(files);
    }

  });

program.parse(process.argv);


"use strict";

var program = require('commander');
var scanFile = require('../lib/target/scan-jquery-use');
var debug = require('debug')('main');
var _ = require('underscore');

program
  .version('0.0.1');

program
  .command('scan <file>')
  .alias('s')
  .description('execute the given remote cmd')
  .option("-f, --file <file>", "give specific file")
  .action(function(cmd, options) {
    console.log('exec "%s" using %s mode', cmd, options.file);
    console.log(arguments);
  }).on('--help', function() {
    console.log('  Examples:');
    console.log();
    console.log('    $ deploy exec sequential');
    console.log('    $ deploy exec async');
    console.log();
  });

program
  .command('*')
  .action(function(env, options) {
    var modules = _.keys(scanFile(env));
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
      keys.unshift('+core');
      console.log('grunt build:*' + (keys.length ? ':' + keys.join(':') : '*') + ' && grunt uglify');
    }
    else {
      console.log('jQuery is not used.');
    }
  });

program.parse(process.argv);


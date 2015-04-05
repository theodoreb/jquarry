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
    var keys = _.keys(scanFile(env)).map(function (k) { return '+' + k; });
    if (keys.indexOf('+sizzle') === -1 &&
      !(/Selectors?$/g).test(keys.join(','))) {
      keys.push('-sizzle');
    }
    else {
      keys.push('+sizzle');
    }
    console.log('grunt build:*' + (keys.length ? ':' + keys.join(':') : '*'));
  });

program.parse(process.argv);


/**
 * Really not there yet. Ignore file.
 */
"use strict";

var fs = require('fs');
var uglify = require("uglify-js");
var debug = require('debug')('uglify');
var _ = require('underscore');
var toposort = require('toposort');
var glob = require('glob');
var convert = require('../lib/utils').convert;

var moduleTree = require('../dist/jquery-modules-tree');

var source = './node_modules/jquery/src/';
var target = './dist/jquery/';

glob('**/*.js', {
  cwd: source,
  ignore: [
    'sizzle/**/*.js',
    'intro.js',
    'outro.js'
  ]
}, function (er, files) {

  var modules = files.map(function (file) { return file.replace('.js', ''); });

  files.forEach(function (file) {
    var content = String(fs.readFileSync(source + file));
    try {
      var ugly = uglify.minify(convert(file.replace('.js', ''), file, content), {fromString: true});
      var newfile = file.replace(/\//g, '-').replace('.js', '.min.js');
      fs.writeFile(target + newfile, ugly.code);
    }
    catch (e) {
      debug(file);
    }
  });
  debug(modules);


});

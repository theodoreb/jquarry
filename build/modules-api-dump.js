"use strict";

var fs = require('fs');
var debug = require('debug')('parse');
var esprima = require('esprima');
var glob = require('glob');
var MockBrowser = require('mock-browser').mocks.MockBrowser;
var vm = require('vm');
var _ = require('underscore');
var convert = require('../lib/utils').convert;

var jqueryDepsOrder = require('../lib/jquery/module-deps-order');

var jqueryModulesApiFile = './dist/jquery-modules-api.json';
var jqueryFolder = './node_modules/jquery/src/';
var globOpts = {
  cwd: jqueryFolder,
  ignore: [
    // Hard dependency, manually handled.
    'core.js',
    'selector*',
    'sizzle/**/*',
    // jQuery build related.
    'intro.js',
    'outro.js',
    'jquery.js',
    // make things crash.
    'var/class2type.js',
    'var/support.js'
  ]
};


var jQueryMethods = [];
var mockWindow = {
  window: MockBrowser.createWindow(),
  document: MockBrowser.createDocument()
};
// Mock up some jQuery stuff to be able to load individual modules.
_.extend(mockWindow, {
  // for core.js
  arr: [],
  class2type: {},
  hasOwn: {}.hasOwnProperty,
  pnum: (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source,
  push: [].push,
  rnotwhite: (/\S+/g),
  strundefined: typeof undefined,
  support: {},
  // for core/ready.js
  setTimeout: function () {}
});

function runFile(module, file) {
  var scriptString = convert(module, file, String(fs.readFileSync(jqueryFolder + file)));
  try {
    vm.createScript(scriptString, file).runInNewContext(mockWindow, file);
  }
  catch (e) {
    debug(module);
    debug(scriptString);
    throw e;
  }
}

function getMethods(file) {
  var module = file.replace('.js', '');
  var newMethods = [];

  var curjQuery = _.keys(mockWindow.jQuery);
  var curjQueryfn = _.keys(mockWindow.jQuery.fn);
  var curjQueryexpr = _.keys(mockWindow.jQuery.expr.filters);
  runFile(module, file);
  var newjQuery =  _.keys(mockWindow.jQuery);
  var newjQueryfn = _.keys(mockWindow.jQuery.fn);
  var newjQueryexpr = _.keys(mockWindow.jQuery.expr.filters);

  _.difference(newjQuery, curjQuery).forEach(function (method) {
    newMethods.push({module: module, object: 'jQuery', method: method});
  });
  _.difference(newjQueryfn, curjQueryfn).forEach(function (method) {
    newMethods.push({module: module, object: 'jQuery.fn', method: method});
  });
  _.difference(newjQueryexpr, curjQueryexpr).forEach(function (method) {
    newMethods.push({module: module, object: 'jQuery.expr.filters', method: ':' + method});
  });

  debug(module + ': ' + _.pluck(newMethods, 'method'));
  jQueryMethods = jQueryMethods.concat(newMethods);
}


// Fill jQuery object with bare minimum things. We won't check usage for those.
runFile('core', 'core.js');
runFile('sizzle', 'sizzle/dist/sizzle.js');
runFile('selector', 'selector-sizzle.js');
// Expose Sizzle selectors.
_.keys(mockWindow.jQuery.expr.filters).forEach(function (method) {
  jQueryMethods.push({module: 'sizzle', object: 'jQuery.expr.filters', method: ':' + method});
});

// Export api infos.
glob("**/*.js", globOpts, function (er, files) {
  // Check dependencies and load the files in an order that won't mess things up.
  jqueryDepsOrder(files, {folder: jqueryFolder}).forEach(getMethods);

  debug('Writting file with ' + jQueryMethods.length + ' methods.');
  fs.writeFile(jqueryModulesApiFile, JSON.stringify(jQueryMethods, null, 2));
});

// Export dependencies.
glob("**/*.js", {cwd: jqueryFolder, ignore: [
  'sizzle/**/*.js',
  'intro.js',
  'outro.js'
]}, function (er, files) {
  var tree = jqueryDepsOrder.tree(files, {folder: jqueryFolder});
  var treeAll = _.mapObject(tree, function (deps, module) {
    return {
      dependencies: deps,
      api: _.pluck(_.where(jQueryMethods, {module: module}), 'method')
    };
  });
  debug('Writting tree dependency file.');
  fs.writeFile(jqueryModulesApiFile.replace('api', 'tree'), JSON.stringify(treeAll, null, 2));
});

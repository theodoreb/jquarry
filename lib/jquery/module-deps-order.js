"use strict";

var fs = require('fs');
var debug = require('debug')('ast');
var amdParser = require('amd-parser');
var esprima = require('esprima');
var _ = require('underscore');
var toposort = require('toposort');



module.exports = function depsOrders(files, opts) {

  var sequence = [];
  var singles = [];

  function parseModule(file) {
    var content = String(fs.readFileSync(opts.folder + file));
    var ast = esprima.parse(content);
    var mod = amdParser.parse(ast)[0];

    function moduleName(name) {
      var modulePath = file.split('/');
      return (name + '.js')
        .replace('../../', '')
        // Takes care of data_priv and data_user dependency on data/Data.
        .replace('../', ((modulePath.length > 2 && mod.dependencies) ? modulePath[0] + '/' : ''))
        .replace('./', '');
    }

    singles.push(file);

    if (mod.dependencies) {
      _.keys(mod.dependencies).map(moduleName).forEach(function (dep) {
        sequence.push([dep, file]);
      });
    }
    else {
      sequence.push(['core.js', file]);
    }
  }

  files.forEach(parseModule);
  var sortedNodes = toposort.array(singles, sequence);
  debug(sortedNodes);

  // May be some extra script in the dependencies, keep files ignored during
  // glob() ignored now.
  return _.intersection(sortedNodes, files);
};

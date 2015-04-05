"use strict";

var fs = require('fs');
var debug = require('debug')('ast');
var parser = require('amd-parser');
var esprima = require('esprima');


module.exports = function depsOrders(files, config) {
  var order = [];

  var modules = parser.parse(ast);
  assert(modules.length == 1);
  var mod = modules[0];
  debug(module);

  mod.id; // module
  mod.node; // define function node
  mod.simpleObject; // true if AMD is a simpleObject/dependency free module
  mod.normalized; // true if AMD is just a commonjs wrapper module
  mod.returns; // return statements in a standard module
  mod.factoryNode; // ast node for factory function


  return order;
};

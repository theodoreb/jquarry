"use strict";

var fs = require('fs');
var esprima = require('esprima');
var debug = require('debug')('scan');
var jqueryAPI = require('../../dist/jquery-modules-api');
var _ = require('underscore');



module.exports = function (file) {
  var content = String(fs.readFileSync(file));
  var ast = esprima.parse(content, {tokens: true/*, loc: true, range: true*/});
  var jqueryModules = [];

  // Find any jQuery variable.
  var jqueryVars = _.where(ast.tokens, {type: 'Identifier', 'value': 'jQuery'});
  if (!jqueryVars.length) {
    console.log('jQuery is not used in this file.');
    return;
  }

  // Regular jQuery methods.
  var jQueryMethods = _.pluck(jqueryAPI, 'method');
  var identifiers = _.where(ast.tokens, {type: 'Identifier'});
  var overlap = _.intersection(jQueryMethods, _.pluck(identifiers, 'value'));

  // If we're not already using some sizzle specific methods.
  if (overlap.indexOf('sizzle') === -1) {
    // Sizzle need.
    var sizzleSelectors = _.pluck(_.where(jqueryAPI, {object: 'jQuery.expr.filters'}), 'method');
    var sizzleIdentifiers = _.pluck(_.where(ast.tokens, {type: 'String'}), 'value');

    var usedSizzle = sizzleIdentifiers.filter(function (string) {
      if (string.indexOf(':') === -1) {
        return false;
      }
      return sizzleSelectors.some(function (selector) {
        var found = string.indexOf(selector) !== -1;
        if (found) {
          overlap.push(selector);
        }
        return found;
      });
    });
    debug(usedSizzle);
  }

  debug(overlap);

  _.uniq(overlap).forEach(function (method) {
    var module = _.uniq(_.pluck(_.where(jqueryAPI, {method: method}), 'module'))[0];
    if (!(module in jqueryModules)) {
      jqueryModules[module] = [];
    }
    jqueryModules[module].push(method);
  });

  debug(jqueryModules);

  return jqueryModules;
};

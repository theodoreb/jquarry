"use strict";

var fs = require('fs');
var esprima = require('esprima');
var debug = require('debug')('scan');
var JQAPI = require('../../dist/jquery-modules-api');
var _ = require('underscore');

/**
 * QuickCheck jQuery use.
 */
function quickCheckjQuery(tokens) {
  var JQVars = _.where(tokens, {type: 'Identifier', 'value': 'jQuery'});
  return !!JQVars.length;
}

/**
 * This return false-positives.
 *
 * @param tokens
 * @param JQAPI
 * @returns {Array.length|*}
 */
function quickCheckMethods(tokens, JQAPI) {
  var JQMethods = _.pluck(JQAPI, 'method');
  var identifiers = _.where(tokens, {type: 'Identifier'});
  return !!_.intersection(JQMethods, _.pluck(identifiers, 'value')).length;
}

function getMethodUse(tokens, API) {
  var used = [];
  var JQVars = ['jQuery', '$'];
  var JQMethods = _.pluck(_.where(API, {object: 'jQuery'}), 'method');
  var JQFNMethods = _.pluck(_.where(API, {object: 'jQuery.fn'}), 'method');
  var sizzleSelectors = _.pluck(_.where(API, {object: 'jQuery.expr.filters'}), 'method');
  var isJQ = false;
  var isVar = false;

  tokens.forEach(function (token) {
    var isJQVar = JQVars.indexOf(token.value) !== -1;
    var isJQMethod = JQMethods.indexOf(token.value) !== -1;
    var isJQFNMethod = JQFNMethods.indexOf(token.value) !== -1;

    var semicol = token.type === 'Punctuator' && token.value === ';';
    var closeBracket = token.type === 'Punctuator' && token.value === '}';
    var jsword = token.type === 'Keyword';

    // Catch jQuery.xxx().
    if (token.type === 'Identifier' && isJQVar) {
      isJQ = true;
    }
    else if (isJQ && token.type === 'Identifier' && isJQMethod) {
      used.push(token.value);
    }
    else if (isJQ) {
      if (semicol || closeBracket || jsword) {
        isJQ = false;
      }
    }

    // Catch $('.element').xxx()
    if (isVar && token.type === 'Identifier') {
      if (isJQFNMethod) {
        used.push(token.value);
      }
    }
    else if (token.type === 'Identifier' && !isJQVar) {
      isVar = true;
    }
    else if (semicol || jsword) {
      isVar = false;
    }

    // Catch sizzle selectors in strings.
    if (token.type === 'String' && token.value.indexOf(':') !== -1) {
      sizzleSelectors.forEach(function (selector) {
        if (token.value.indexOf(selector) !== -1) {
          used.push(selector);
        }
      });
    }
  });

  debug(used);

  return used;
}

module.exports = function (file) {
  var content = String(fs.readFileSync(file));
  var ast = esprima.parse(content, {tokens: true/*, loc: true, range: true*/});
  var JQModules = [];
  fs.writeFile('/tmp/ast.json', JSON.stringify(ast.tokens, null, 2));

  // Find any jQuery variable.
  if (!quickCheckjQuery(ast.tokens)) {
    console.log('jQuery is not used in this file.');
    return;
  }

  // Regular jQuery methods.
  if (!quickCheckMethods(ast.tokens, JQAPI)) {
    console.log('No jQuery methods used in this file.');
    return;
  }

  var used = getMethodUse(ast.tokens, JQAPI);

  _.uniq(used).forEach(function (method) {
    var module = _.uniq(_.pluck(_.where(JQAPI, {method: method}), 'module'))[0];
    if (!(module in JQModules)) { JQModules[module] = []; }
    JQModules[module].push(method);
  });

  debug(JQModules);

  return JQModules;
};

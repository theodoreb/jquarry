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
  var justAddedVar = false;

  tokens.forEach(function (token) {
    var isJQVar = JQVars.indexOf(token.value) !== -1;
    var isJQMethod = JQMethods.indexOf(token.value) !== -1;
    var isJQFNMethod = JQFNMethods.indexOf(token.value) !== -1;

    var semicol = token.type === 'Punctuator' && token.value === ';';
    var closeBracket = token.type === 'Punctuator' && token.value === '}';
    var jsword = token.type === 'Keyword';


    // Make sure we're not mistaking jQuery stuff with other variable names.
    if (justAddedVar) {
      if (token.type === 'Punctuator' && token.value !== '(') {
        debug(used.pop());
      }
      justAddedVar = false;
    }

    // Catch $('.element').xxx()
    if (isVar && token.type === 'Identifier') {
      if (isJQFNMethod) {
        used.push({method: token.value, object: 'jQuery.fn'});
        justAddedVar = true;
      }
    }
    else if (token.type === 'Identifier' && !isJQVar) {
      isVar = true;
    }
    else if (semicol || jsword) {
      isVar = false;
    }

    // Catch jQuery.xxx().
    if (token.type === 'Identifier' && isJQVar) {
      isJQ = true;
    }
    else if (isJQ && token.type === 'Identifier' && isJQMethod) {
      used.push({method: token.value, object: 'jQuery'});
    }
    else if (isJQ) {
      if (semicol || closeBracket || jsword) {
        isJQ = false;
      }
    }

    // Catch sizzle selectors in strings.
    if (token.type === 'String' && token.value.indexOf(':') !== -1) {
      sizzleSelectors.forEach(function (selector) {
        if (token.value.indexOf(selector) !== -1) {
          used.push({method: selector, object: 'jQuery.expr.filters'});
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
    return JQModules;
  }

  // Regular jQuery methods.
  if (!quickCheckMethods(ast.tokens, JQAPI)) {
    return JQModules;
  }

  var used = getMethodUse(ast.tokens, JQAPI);

  _.uniq(used).forEach(function (info) {
    var module = _.uniq(_.pluck(_.where(JQAPI, info), 'module'))[0];
    if (!(module in JQModules)) { JQModules[module] = []; }
    JQModules[module].push(info.method);
  });

  debug(JQModules);

  return JQModules;
};

"use strict";

var fs = require('fs');
var esprima = require('esprima');
var debug = require('debug')('scan');
var JQAPI = require('../../dist/jquery-modules-api');
var _ = require('underscore');

/**
 * Check the variable jQuery appears in the code.
 *
 * @param tokens
 * @returns {boolean}
 */
function quickCheckjQuery(tokens) {
  var JQVars = _.where(tokens, {type: 'Identifier', 'value': 'jQuery'});
  return !!JQVars.length;
}

/**
 * Check any jQuery method appears in the code.
 *
 * @param tokens
 * @param JQAPI
 * @returns {boolean}
 */
function quickCheckMethods(tokens, JQAPI) {
  var JQMethods = _.pluck(JQAPI, 'method');
  var identifiers = _.where(tokens, {type: 'Identifier'});
  return !!_.intersection(JQMethods, _.pluck(identifiers, 'value')).length;
}

/**
 * Iterate over the list of tokens and figure out what is jQuery and what is not.
 *
 * @param {Array} tokens list of tokens from esprima.
 * @param {Array} API jQuery exported API.
 * @returns {Array} list of {member, object} used in the code.
 */
function getMethodUse(tokens, API) {
  var used = [];

  // Those variable names can't be jQuery things.
  var excludeListIdentifiers = ['behaviors'];

  var JQVars = ['jQuery', '$'];
  var JQMethods = _.pluck(_.where(API, {object: 'jQuery'}), 'method');
  var JQFNMethods = _.pluck(_.where(API, {object: 'jQuery.fn'}), 'method');
  var sizzleSelectors = _.pluck(_.where(API, {object: 'jQuery.expr.filters'}), 'method');

  var isJQ = false;
  var isVar = false;
  var isVarExcluded = false;
  var justAddedVar = false;

  tokens.forEach(function (token) {
    var isJQVar = JQVars.indexOf(token.value) !== -1;
    var isJQMethod = JQMethods.indexOf(token.value) !== -1;
    var isJQFNMethod = JQFNMethods.indexOf(token.value) !== -1;
    // Some things use jQuery method names while not being jQuery.
    var isExcluded = excludeListIdentifiers.indexOf(token.value) !== -1;

    var semicol = token.type === 'Punctuator' && token.value === ';';
    var closeCurly = token.type === 'Punctuator' && token.value === '}';
    var jsword = token.type === 'Keyword';
    var stop = semicol || closeCurly || jsword;

    // Make sure we're not mistaking jQuery stuff with other variable names.
    if (justAddedVar) {
      if (token.type === 'Punctuator' && token.value !== '(') {
        var poped = used.pop();
        debug(poped);
      }
      justAddedVar = false;
    }

    if (isExcluded && !isVarExcluded) {
      isVarExcluded = true;
    }

    if (!isVarExcluded) {
      // Catch $('.element').xxx()
      if (token.type === 'Identifier') {
        if (isJQFNMethod) {
          used.push({method: token.value, object: 'jQuery.fn'});
          justAddedVar = true;
        }
      }
      else if (token.type === 'Identifier' && !isJQVar) {
        isVar = true;
      }
      else if (stop) {
        isVar = false;
      }

      // Catch jQuery.xxx().
      if (token.type === 'Identifier' && isJQVar) {
        isJQ = true;
      }
      else if (isJQ && token.type === 'Identifier' && isJQMethod) {
        used.push({method: token.value, object: 'jQuery'});
      }
      else if (isJQ && stop) {
        isJQ = false;
      }
    }

    if (stop) {
      isVarExcluded = false;
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

/**
 * Takes a file path and analyse it for jQuery use.
 * @param file
 * @returns {Object}
 */
module.exports = function (file) {
  var content = String(fs.readFileSync(file));
  var ast = esprima.parse(content, {tokens: true});
  var JQModules = {};

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

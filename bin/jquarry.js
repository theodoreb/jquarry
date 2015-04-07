"use strict";

var fs = require('fs');
var program = require('commander');
var scanFile = require('../lib/target/scan-jquery-use');
var dependencies = require('../dist/jquery-modules-tree');
var debug = require('debug')('main');
var _ = require('underscore');
var glob = require('glob');

program
  .command('*')
  .action(function(env, options) {

    var jQueryOrder = "var/arr var/slice var/concat var/push var/indexOf var/class2type var/toString var/hasOwn var/support core sizzle selector-sizzle selector-native selector traversing/var/rneedsContext core/var/rsingleTag traversing/findFilter core/init traversing var/rnotwhite callbacks deferred core/ready core/access data/accepts data/Data data/var/data_priv data/var/data_user data queue var/pnum css/var/cssExpand css/var/isHidden manipulation/var/rcheckableType manipulation/support var/strundefined event/support event manipulation css/defaultDisplay css/var/rmargin css/var/rnumnonpx css/var/getStyles css/curCSS css/addGetHookIf css/support css/swap css effects/Tween effects queue/delay attributes/support attributes/attr attributes/prop attributes/classes attributes/val attributes event/alias ajax/var/nonce ajax/var/rquery ajax/parseJSON ajax/parseXML ajax manipulation/_evalUrl wrap css/hiddenVisibleSelectors serialize ajax/xhr ajax/script ajax/jsonp core/parseHTML ajax/load event/ajax effects/animatedSelector offset dimensions deprecated exports/amd exports/global jquery".split(' ');

    function getModulesFromFile(file) {
      return _.keys(scanFile(String(fs.readFileSync(file))));
    }

    function processFiles(files) {
      var modules = _.uniq(_.flatten(files.map(getModulesFromFile)));
      if (modules.length) {
        var keys = modules;

        // Add all implicit dependencies, helps with diffable jQuery build.
        var extraDependencies = [];
        var resolveDeps = function (mod, name) {
          if (keys.indexOf(name) !== -1 && mod.dependencies.length) {
            extraDependencies.push(mod.dependencies);
          }
        };

        // Resolve all dependencies.
        var prevKeysLength = 0;
        do {
          prevKeysLength = keys.length;
          _.each(dependencies, resolveDeps);
          keys = _.uniq(keys.concat(_.flatten(extraDependencies)));
        } while (prevKeysLength !== keys.length);

        // If we have both sizzle and native selectors, sizzle wins.
        var nativeSelector = keys.indexOf('selector-native');
        var sizzle = keys.indexOf('sizzle');
        if (nativeSelector !== -1 && sizzle !== -1) {
          keys.splice(nativeSelector, 1);
        }

        // Follow jQuery build order to make a diffable version.
        keys = _.intersection(jQueryOrder, keys).map(function (k) { return '+' + k; });
        // Need to explicitly exclude sizzle if we use native selectors.
        if (keys.indexOf('+selector-native') !== -1) {
          keys.unshift('-sizzle');
        }
        console.log('grunt build:*' + (keys.length ? ':' + keys.join(':') : '*') + ' && grunt uglify');
      }
      else {
        console.log('jQuery is not used.');
      }
    }

    if (env.indexOf('.js') === -1) {
      env = env[env.length - 1] === '/' ? env : env + '/';
      glob("**/*.js", {cwd: env}, function (er, fileList) {
        debug(fileList);
        processFiles(fileList.map(function (file) { return env + file; }));
      });
    }
    else {
      var singleFile = [env];
      debug(singleFile);
      processFiles(singleFile);
    }

  });

program.parse(process.argv);


'use strict';

var _package = require('../package.json');

var _package2 = _interopRequireDefault(_package);

require('colors');

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _streamSplitter = require('stream-splitter');

var _streamSplitter2 = _interopRequireDefault(_streamSplitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_commander2.default.version(_package2.default.version).usage('[options] <command> <matchexpr> <execute>').action(function (command, matchexpr, execute) {
  if (typeof command !== 'string' || typeof matchexpr !== 'string' || typeof execute !== 'string') {
    console.log('  Invalid syntax'.red);
    _commander2.default.outputHelp();
    process.exit(1);
  }
  _commander2.default.command = command;
  var parsedRegex = matchexpr.match(/\/(.*?)\/(.*?)?/);
  if (!parsedRegex) {
    _commander2.default.outputHelp();
    throw new Error('The matchexpr ' + matchexpr + ' could not be evaluated');
  }
  _commander2.default.matchexpr = new RegExp(parsedRegex[1], parsedRegex[2] || 'gi');
  _commander2.default.execute = execute;
}).option('-s, --stopOnMatch', 'Stop matching once a match has been found').option('-e, --exitOnMatch', 'Exit the process when a match is found').option('-n, --noColor', "Don't use ascii colors to make stderr red").on('--help', function () {
  console.log('  Command Reference: ');
  console.log('');
  console.log('  <command> is a shell command to run. It\'s output will be watched for matches.');
  console.log('  <matchexpr> is a JavaScript formatted regular expression that will match against each line of output from <command>.');
  console.log('  <execute> is a shell command to run once the <matchexpr> has found a match.');
  console.log('    You can use the variable $OUTWATCH_LINE in your <execute> command to get the content of the line that matched <matchexpr>. ');
  console.log('    Note that you will need to escape the $ in the <execute> command like this \\$ so that it doesn\'t get evaluated immediately');
  console.log('');
  console.log('  Examples: ');
  console.log('');
  console.log('    tail a file and append lines that contain "complete" to a file "completed.files"');
  console.log('    $ outwatch "tail -f /my/log/file.log" "/complete/gi" "echo \$OUTWATCH_LINE >> completed.files" ');
  console.log('');
}).parse(process.argv);

if (!process.argv.slice(3).length) {
  _commander2.default.outputHelp();
  process.exit(1);
}

var spawn = require('child_process').spawn;
var child = spawn(__dirname + '/../run.sh', [_commander2.default.command], { shell: true });
var stopped = false;
child.on('close', function (code) {
  return process.exit(code);
});
child.stdout.pipe((0, _streamSplitter2.default)('\n')).on('token', handleStd);
child.stderr.pipe((0, _streamSplitter2.default)('\n')).on('token', handleErr);

function handleStd(data) {
  var dataUtf8 = data.toString('utf8');
  doMatching(dataUtf8);
  logStd(dataUtf8);
}

function handleErr(data) {
  var dataUtf8 = data.toString('utf8');
  doMatching(dataUtf8);
  logErr(dataUtf8);
}

function doMatching(data) {
  if (!stopped && data.match(_commander2.default.matchexpr)) {
    if (_commander2.default.stopOnMatch) {
      stopped = true;
    }
    var spawned = spawn(__dirname + '/../run.sh', [_commander2.default.execute, data], { shell: true });
    spawned.stdout.pipe((0, _streamSplitter2.default)('\n')).on('token', logStd);
    spawned.stderr.pipe((0, _streamSplitter2.default)('\n')).on('token', logErr);
    spawned.on('close', function (code) {
      if (_commander2.default.exitOnMatch) {
        process.exit(code);
      }
    });
  }
}

function logErr(data) {
  console.log(_commander2.default.noColor);
  var dataUtf8 = data.toString('utf8');
  console.error(!_commander2.default.noColor ? dataUtf8.red : dataUtf8);
}

function logStd(data) {
  var dataUtf8 = data.toString('utf8');
  console.log(dataUtf8);
}
#!/usr/bin/env node
const packageJson = require('../package.json');
require('colors');
const program = require('commander');
const StreamSplitter = require('stream-splitter');

program
  .version(packageJson.version)
  .usage('[options] <command> <matchexpr> <execute>')
  .action((command, matchexpr, execute) => {
    if (typeof command !== 'string' ||
        typeof matchexpr !== 'string' ||
        typeof execute !== 'string') {
      console.log('  Invalid syntax'.red);
      program.outputHelp();
      process.exit(1);
    }
    program.command = command;
    const parsedRegex = matchexpr.match(/\/(.*?)\/(.*?)?/);
    if (!parsedRegex) {
      program.outputHelp();
      throw new Error(`The matchexpr ${matchexpr} could not be evaluated`);
    }
    program.matchexpr = new RegExp(parsedRegex[1], parsedRegex[2] || 'gi');
    program.execute = execute;
  })
  .option('-s, --stopOnMatch', 'Stop matching once a match has been found')
  .option('-e, --exitOnMatch', 'Exit the process when a match is found')
  .option('-n, --noColor', "Don't use ascii colors to make stderr red")
  .option('-sp, --shellPath', 'Path to the shell you want to use (defaults to /bin/bash)')
  .option('-v, --verbose', 'Log data about in progress matches and passed commands (helps debug shell escaping issues)')
  .on('--help', () => {
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
  })
  .parse(process.argv);

if (!process.argv.slice(3).length) {
  program.outputHelp();
  process.exit(1);
}

const spawn = require('child_process').spawn;
const shell = program.shellPath || '/bin/bash';
if (program.logParams || program.verbose) {
  console.log('Outwatch started...');
  console.log('Command:', program.command);
  console.log('Match Expression:', program.matchexpr);
  console.log('Execute command:', program.execute);
  console.log('Using shell:', shell);
}
const child = spawn(program.command, { shell });

let stopped = false;
let shouldExitAfterMatchExec = true;
let matchExecCount = 0;
let commandExitCode = 0;
child.on('close', code => {
  commandExitCode = code;
  shouldExitAfterMatchExec = true;
  if (matchExecCount === 0) {
    process.exit(commandExitCode);
  }
});
child.stdout.pipe(StreamSplitter('\n')).on('token', handleStd);
child.stderr.pipe(StreamSplitter('\n')).on('token', handleErr);

function handleStd(data) {
  const dataUtf8 = data.toString('utf8');
  doMatching(dataUtf8);
  logStd(dataUtf8);
}

function handleErr(data) {
  const dataUtf8 = data.toString('utf8');
  doMatching(dataUtf8);
  logErr(dataUtf8);
}

function doMatching(data) {
  if (!stopped && data.match(program.matchexpr)) {
    if (program.verbose) {
      console.log('Outwatch: found matching data for line:', data);
    }
    matchExecCount++;
    if (program.exitOnMatch || program.stopOnMatch) {
      stopped = true;
    }
    const escapedData = escapeStrongBashSingleQuotes(data);
    const exprToRun = `OUTWATCH_LINE='${escapedData}' ${program.execute}`;

    if (program.verbose) {
      console.log('Outwatch: about to run command', exprToRun);
    }

    const spawned = spawn(exprToRun, { shell });
    spawned.stdout.pipe(StreamSplitter('\n')).on('token', logStd);
    spawned.stderr.pipe(StreamSplitter('\n')).on('token', logErr);
    spawned.on('close', (code) => {
      matchExecCount--;
      if (program.exitOnMatch || shouldExitAfterMatchExec) {
        if (matchExecCount === 0) {
          child.kill();
          process.exit(commandExitCode || code);
        }
      }
    });
  }
}

function logErr(data) {
  const dataUtf8 = data.toString('utf8');
  console.error(!program.noColor ? dataUtf8.red : dataUtf8);
}

function logStd(data) {
  const dataUtf8 = data.toString('utf8');
  console.log(dataUtf8);
}

function escapeStrongBashSingleQuotes(str) {
  return str.replace(/'/g, "'\\''");
}

#!/usr/bin/env node
import packageJson from '../package.json';
import 'colors';
import program from 'commander';
import StreamSplitter from 'stream-splitter';

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
const child = spawn(`${__dirname}/../run.sh`, [program.command], { shell: true });
let stopped = false;
child.on('close', code => process.exit(code));
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
    if (program.stopOnMatch) {
      stopped = true;
    }
    const spawned = spawn(`${__dirname}/../run.sh`, [program.execute, data], { shell: true });
    spawned.stdout.pipe(StreamSplitter('\n')).on('token', logStd);
    spawned.stderr.pipe(StreamSplitter('\n')).on('token', logErr);
    spawned.on('close', (code) => {
      if (program.exitOnMatch) {
        process.exit(code);
      }
    });
  }
}

function logErr(data) {
  console.log(program.noColor);
  const dataUtf8 = data.toString('utf8');
  console.error(!program.noColor ? dataUtf8.red : dataUtf8);
}

function logStd(data) {
  const dataUtf8 = data.toString('utf8');
  console.log(dataUtf8);
}

const exec = require('child_process').exec;
const fs = require('fs');
const { appendFileSync, ftruncateSync, openSync, closeSync } = fs;
const expect = require('expect');

suite('Test outwatch CLI functions', () => {
  after(() => {
    emptyFile(`${__dirname}/test1.txt`);
    emptyFile(`${__dirname}/test2.txt`);
    emptyFile(`${__dirname}/test3.txt`);
  });

  test('Basic functionality, watching a file', (done) => {
    const child = exec(`node ${__dirname}/../src/index.js "tail -f '${__dirname}/test1.txt'" "/hit/" "echo 'Got a hit!!!'"`, (err, stdout, stderr) => {
      expect(stdout).toBe(`miss
miss
hit
Got a hit!!!
`);
      expect(stdout).toContain('Got a hit!!!');
      expect(stderr).toBe('');
      done();
    });
    appendFileSync(`${__dirname}/test1.txt`, 'miss\n');
    appendFileSync(`${__dirname}/test1.txt`, 'miss\n');
    appendFileSync(`${__dirname}/test1.txt`, 'hit\n');

    setTimeout(() => {
      child.kill();
    }, 250);
  });

  test('Using -s option to stop on first match', (done) => {
    const child = exec(`node ${__dirname}/../src/index.js -s "tail -f '${__dirname}/test2.txt'" "/hit/" "echo 'Got a hit!!!'"`, (err, stdout, stderr) => {
      expect(stdout).toContain('Got a hit!!!');
      expect(stdout.indexOf('Got a hit!!!')).toBe(stdout.lastIndexOf('Got a hit!!!'));
      expect(stderr).toBe('');
      done();
    });
    appendFileSync(`${__dirname}/test2.txt`, 'hit\n');
    appendFileSync(`${__dirname}/test2.txt`, 'hit\n');
    appendFileSync(`${__dirname}/test2.txt`, 'miss\n');
    appendFileSync(`${__dirname}/test2.txt`, 'miss\n');
    appendFileSync(`${__dirname}/test2.txt`, 'hit\n');
    appendFileSync(`${__dirname}/test2.txt`, 'hit\n');

    setTimeout(() => {
      child.kill();
    }, 250);
  });

  test('Using -e option to exit process on first match', (done) => {
    exec(`node ${__dirname}/../src/index.js -e "tail -f '${__dirname}/test3.txt'" "/hit/" "echo 'Got a hit!!!'"`,
      (err, stdout, stderr) => {
        expect(stdout).toBe(`miss
miss
miss
hit
Got a hit!!!
`);
        expect(stderr).toBe('');
        done();
      });
    appendFileSync(`${__dirname}/test3.txt`, 'miss\n');
    appendFileSync(`${__dirname}/test3.txt`, 'miss\n');
    appendFileSync(`${__dirname}/test3.txt`, 'miss\n');
    appendFileSync(`${__dirname}/test3.txt`, 'hit\n');
  });

  test('Works when command expression ends before execute expression, and processes all in-progress matches', (done) => {
    exec(`node ${__dirname}/../src/index.js 'echo "hit" && echo "miss" && echo "hit"' '/hit/' 'echo "one" && sleep 1s && echo "two"'`, (err, stdout, stderr) => {
      expect(stdout).toBe(`hit
miss
hit
one
one
two
two
`);
      expect(stderr).toBe('');
      done();
    });
  });

  test('Using -e command waits until execute command finishes to kill process, but only calls execute command once', (done) => {
    exec(`node ${__dirname}/../src/index.js -e 'echo "hit" && sleep 0.1s && echo "miss" && sleep 0.01s && echo "hit" && sleep 1 && echo "bad"' '/hit/' 'echo "one" && sleep 1s && echo "two"'`, (err, stdout, stderr) => {
      expect(stdout).toBe(`hit
one
miss
hit
two
`);
      expect(stderr).toBe('');
      done();
    });
  });

  test('Match with bash special characters in it gets encoded properly', (done) => {
    exec(`node ${__dirname}/../src/index.js 'cat ${__dirname}/bashCharsTest.txt' '/start.*?end/' '${__dirname}/bashCharsExec.sh && echo ok'`, (err, stdout, stderr) => {
      expect(stdout).toBe(`start ' " * /\\\\!@#$%^&*()[]\`~<>>?/;|\\=+: $FOO end
start ' " * /\\\\!@#$%^&*()[]\`~<>>?/;|\\=+: $FOO end
ok
`);
      expect(stderr).toBe('');
      done();
    });
  });
});

function emptyFile(fileName) {
  const fd = openSync(fileName, 'w');
  ftruncateSync(fd, 0);
  closeSync(fd);
}

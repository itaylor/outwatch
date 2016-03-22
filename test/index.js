import { exec } from 'child_process';
import { appendFileSync, ftruncateSync, openSync, closeSync } from 'fs';
import expect from 'expect';

suite('Test outwatch CLI functions', () => {
  after(() => {
    emptyFile(`${__dirname}/test1.txt`);
    emptyFile(`${__dirname}/test2.txt`);
    emptyFile(`${__dirname}/test3.txt`);
  });

  test('Basic functionality, watching a file', (done) => {
    const child = exec(`node ${__dirname}/../dist/index.js "tail -f '${__dirname}/test1.txt'" "/hit/" "echo 'Got a hit!!!'"`, (err, stdout, stderr) => {
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
    const child = exec(`node ${__dirname}/../dist/index.js -s "tail -f '${__dirname}/test2.txt'" "/hit/" "echo 'Got a hit!!!'"`, (err, stdout, stderr) => {
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
    exec(`node ${__dirname}/../dist/index.js -e "tail -f '${__dirname}/test3.txt'" "/hit/" "echo 'Got a hit!!!'"`,
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
});

function emptyFile(fileName) {
  const fd = openSync(fileName, 'w');
  ftruncateSync(fd, 0);
  closeSync(fd);
}

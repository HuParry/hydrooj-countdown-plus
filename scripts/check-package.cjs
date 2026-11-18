'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.name, 'hydrooj-countdown-plus');
assert.equal(pkg.publishConfig.registry, 'https://registry.npmjs.org/');
assert.equal(pkg.publishConfig.access, 'public');

const [pack] = JSON.parse(execFileSync('npm', [
    'pack', '--dry-run', '--json', '--ignore-scripts', '--workspaces=false',
], { cwd: root, encoding: 'utf8' }));
assert.equal(pack.name, pkg.name);
assert.equal(pack.version, pkg.version);

const files = new Map(pack.files.map((file) => [file.path, file]));
for (const file of [
    'package.json', 'index.ts', 'lib/countdown.ts', 'lib/import.ts',
    'prompt.txt', 'templates/countdown_manage.html',
    'templates/partials/homepage/countdown.html', 'README.md', 'LICENSE',
]) {
    assert.ok(files.get(file)?.size > 0, `Missing or empty in npm package: ${file}`);
}
for (const file of files.keys()) {
    assert.ok(!/^(?:node_modules|\.git|\.github)\//.test(file), `Unexpected file in npm package: ${file}`);
    assert.notEqual(file, '.npmrc', 'npm config must not be published');
}
console.log(`${pkg.name}@${pkg.version}: ${files.size} files, ${pack.unpackedSize} bytes; package contents verified.`);

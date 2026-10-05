// Uso: node plan.js "texto"  -> imprime as teclas (uma por linha) a partir do foco no A
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/test.js', 'utf8').split("const text = process.argv[2]")[0] + '\nmodule.exports = { plan };';
const m = { exports: {} };
new Function('require', 'module', 'exports', '__dirname', src)(require, m, m.exports, __dirname);
const text = process.argv[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
console.log(m.exports.plan(text, 0, true).map((k) => 'KEY_' + k).join('\n'));

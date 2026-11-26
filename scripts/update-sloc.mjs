import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const cutoff = '79b29ff04e6768e8aa2ef93fad122e393f32bd87';
const startMarker = '<!-- SLOC_TABLE:START -->';
const endMarker = '<!-- SLOC_TABLE:END -->';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

const cutoffCheck = spawnSync('git', ['merge-base', '--is-ancestor', cutoff, 'HEAD']);
if (cutoffCheck.status !== 0) {
  throw new Error(`O commit de corte ${cutoff} não é ancestral de HEAD.`);
}

const aiCommits = new Set(git(['rev-list', 'HEAD', `^${cutoff}`]).trim().split('\n'));
const sourceFiles = git([
  'ls-files',
  '-z',
  '--',
  '*.ts',
  '*.tsx',
  '*.js',
  '*.jsx',
  '*.mjs',
  '*.cjs',
  '*.css',
  '*.html',
]).split('\0').filter((file) => file && file !== 'scripts/update-sloc.mjs');

if (sourceFiles.length === 0) {
  throw new Error('Nenhum arquivo-fonte versionado foi encontrado.');
}

const counts = { human: 0, ai: 0 };
for (const file of sourceFiles) {
  const blame = git(['blame', '--line-porcelain', 'HEAD', '--', file]);
  let commit = '';
  for (const line of blame.split('\n')) {
    const header = line.match(/^\^?([0-9a-f]{40}) \d+ \d+ \d+$/);
    if (header) {
      commit = header[1];
    } else if (line.startsWith('\t') && line.slice(1).trim() !== '') {
      counts[aiCommits.has(commit) ? 'ai' : 'human'] += 1;
    }
  }
}

const total = counts.human + counts.ai;
const percentage = (count) => (total === 0 ? '0.00' : ((count / total) * 100).toFixed(2));
const table = [
  startMarker,
  '| Autor | SLOC | % dos SLOCs |',
  '| --- | ---: | ---: |',
  `| Humano | ${counts.human} | ${percentage(counts.human)}% |`,
  `| IA | ${counts.ai} | ${percentage(counts.ai)}% |`,
  `| **Total** | **${total}** | **${total === 0 ? '0.00' : '100.00'}%** |`,
  endMarker,
].join('\n');

const readme = readFileSync('README.md', 'utf8');
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker);
if (
  start === -1 ||
  end === -1 ||
  end < start ||
  readme.indexOf(startMarker, start + 1) !== -1 ||
  readme.indexOf(endMarker, end + 1) !== -1
) {
  throw new Error('Os marcadores da tabela SLOC estão ausentes ou duplicados no README.md.');
}

const updatedReadme = `${readme.slice(0, start)}${table}${readme.slice(end + endMarker.length)}`;
writeFileSync('README.md', updatedReadme.endsWith('\n') ? updatedReadme : `${updatedReadme}\n`);

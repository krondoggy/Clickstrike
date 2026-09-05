import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateMusicPlaylist, scanMusicFiles } from '../../../scripts/music-manifest.mjs';

async function musicFolder(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'castle-strike-music-'));
  t.after(async () => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await rmdir(entryPath);
      else await unlink(entryPath);
    }
    await rmdir(directory);
  });
  return directory;
}

test('music discovery includes all supported audio extensions and ignores directories and other files', async t => {
  const directory = await musicFolder(t);
  const tracks = ['song.MP3', 'song.ogg', 'song.wav', 'song.m4a', 'song.aac', 'song.flac', 'song.opus', 'song.webm'];
  await Promise.all([...tracks, '.gitkeep', '.DS_Store', 'playlist.js', 'notes.txt'].map(name => writeFile(path.join(directory, name), '')));
  await mkdir(path.join(directory, 'folder.mp3'));
  assert.deepEqual(await scanMusicFiles(directory), tracks.sort());
});

test('playlist generation reflects additions and removals and preserves filenames', async t => {
  const directory = await musicFolder(t);
  const initial = "01. Elven 'song' #1 (100%).MP3";
  await writeFile(path.join(directory, initial), '');
  assert.deepEqual(await generateMusicPlaylist(directory), [initial]);
  const module = await import(`data:text/javascript,${encodeURIComponent(await readFile(path.join(directory, 'playlist.js'), 'utf8'))}`);
  assert.deepEqual(module.default, [initial]);
  await unlink(path.join(directory, initial));
  await writeFile(path.join(directory, 'new song.ogg'), '');
  assert.deepEqual(await generateMusicPlaylist(directory), ['new song.ogg']);
  await unlink(path.join(directory, 'new song.ogg'));
  assert.deepEqual(await generateMusicPlaylist(directory), []);
  const empty = await import(`data:text/javascript,${encodeURIComponent(await readFile(path.join(directory, 'playlist.js'), 'utf8'))}`);
  assert.deepEqual(empty.default, []);
});

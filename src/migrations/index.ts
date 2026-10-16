import * as migration_20261016_001835_inicial from './20261016_001835_inicial';

export const migrations = [
  {
    up: migration_20261016_001835_inicial.up,
    down: migration_20261016_001835_inicial.down,
    name: '20261016_001835_inicial'
  },
];

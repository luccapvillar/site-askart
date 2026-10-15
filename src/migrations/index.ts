import * as migration_20261015_192339_inicial from './20261015_192339_inicial';

export const migrations = [
  {
    up: migration_20261015_192339_inicial.up,
    down: migration_20261015_192339_inicial.down,
    name: '20261015_192339_inicial'
  },
];

import * as migration_20261015_195910_inicial from './20261015_195910_inicial';

export const migrations = [
  {
    up: migration_20261015_195910_inicial.up,
    down: migration_20261015_195910_inicial.down,
    name: '20261015_195910_inicial'
  },
];

import * as migration_20261016_001835_inicial from './20261016_001835_inicial';
import * as migration_20261016_172759_novas_funcoes from './20261016_172759_novas_funcoes';
import * as migration_20261018_224830_bks_modalidades_warmup from './20261018_224830_bks_modalidades_warmup';

export const migrations = [
  {
    up: migration_20261016_001835_inicial.up,
    down: migration_20261016_001835_inicial.down,
    name: '20261016_001835_inicial',
  },
  {
    up: migration_20261016_172759_novas_funcoes.up,
    down: migration_20261016_172759_novas_funcoes.down,
    name: '20261016_172759_novas_funcoes',
  },
  {
    up: migration_20261018_224830_bks_modalidades_warmup.up,
    down: migration_20261018_224830_bks_modalidades_warmup.down,
    name: '20261018_224830_bks_modalidades_warmup'
  },
];

import { defineConfig } from '@playwright/test';
import base from './playwright.config';
const gamePort=process.env.DUEL_GAME_PORT||'5261', roomPort=process.env.DUEL_ROOM_PORT||'2661';
const game='http://127.0.0.1:'+gamePort, rooms='http://127.0.0.1:'+roomPort;
export default defineConfig({
  ...base,testDir:'./tests/duels',timeout:240000,
  use:{...base.use,baseURL:game,viewport:{width:960,height:640}},
  webServer:[
    {command:'node node_modules/vite/bin/vite.js build --config server/vite.config.ts && node dist-server/index.js',env:{PORT:roomPort,DUEL_EXTRA_VENUES:'san-diego-fleet,snowy-tahoe,capitan-yosemite,lax'},url:rooms+'/health',timeout:60000},
    {command:'node node_modules/vite/bin/vite.js build --config tests/duels/vite.config.ts && node node_modules/vite/bin/vite.js preview --config tests/duels/vite.config.ts --host 127.0.0.1 --port '+gamePort+' --strictPort',env:{VITE_DUEL_SERVER:rooms},url:game,timeout:120000},
  ],
});

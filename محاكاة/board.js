// ═══ يستخرج بنّاء اللوحة الحقيقي من ملف اللعبة (بلا آثار جانبية) ═══
const fs = require('fs'), path = require('path'), vm = require('vm');
const RAW = fs.readFileSync(path.join(__dirname, '..', 'كود نيمز.html'), 'utf8');
const CODE = RAW.match(/<script>\n([\s\S]*)<\/script>/)[1];

function makeAppBuilder() {
  const grab = ['massiveWordsPool', 'WORD_TOPIC_CUTS', 'WORD_SYNONYM_SETS',
                'MAX_PER_TOPIC', 'TEAM_BUNDLES', 'buildWordMaps',
                'buildLinkableBoard', 'pickBalancedWords', 'shuffleArr'];
  const start = CODE.indexOf('const massiveWordsPool');
  const end   = CODE.indexOf('function initDefaultRooms');
  const ctx = { console, Math, Date, Set, Object, Array, JSON, window: {} };
  vm.createContext(ctx);
  vm.runInContext(CODE.slice(start, end) + '\n;globalThis.__api={' +
    grab.map(g => `${g}: typeof ${g}!=='undefined'?${g}:undefined`).join(',') + '};', ctx);
  return ctx.__api;
}
const api = makeAppBuilder();
const POOL = api.massiveWordsPool;
api.buildWordMaps(POOL);
const buildBoard = () => api.buildLinkableBoard(POOL);
module.exports = { api, POOL, buildBoard, TEAM_BUNDLES: api.TEAM_BUNDLES };

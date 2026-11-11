// Données pixel art (originales). '.' = transparent. Chaque lettre = une couleur de la palette.
// Les « moitiés » sont reflétées en miroir pour obtenir un dessin symétrique.

/** Reflète une moitié gauche (largeur paire, sans colonne centrale). */
export function mirrorEven(half: string[]): string[] {
  return half.map((r) => r + r.split('').reverse().join(''))
}
/** Reflète une moitié gauche dont la dernière colonne est l'axe. */
export function mirrorOdd(half: string[]): string[] {
  return half.map((r) => r + r.slice(0, -1).split('').reverse().join(''))
}

// ---------------- Bouffon détaillé (24 × 27) ----------------
// o contour · A/a chapeau 1 (+ombre) · B/b chapeau 2 · y/Y grelot · C/c col · f/F visage · k œil · w blanc
// m bouche · M bouche foncée · r joue · n nez · h cheveux
export const HATS: string[][] = [
  // bouffon 3 pointes
  [
    '.oyo........',
    'oyYyo.....oy',
    '.oyAo....oyY',
    '..oAAo...oBB',
    '..oAaAo..oBB',
    '...oAaAooBbB',
    '...oAAaAoBbB',
    '....oAAAABBB',
    '..oCCCCCCCCC',
    '..oCcCcCcCcC',
  ],
  // bouffon 2 pointes
  [
    'oyo.........',
    'yYyo........',
    'oyAo........',
    '.oAAo.......',
    '..oAaAo.....',
    '..oAAaAooooo',
    '...oAAABBBBB',
    '...oAAABbBbB',
    '..oCCCCCCCCC',
    '..oCcCcCcCcC',
  ],
  // haut-de-forme
  [
    '....oooooooo',
    '....okkkkkkk',
    '....okkkkkkk',
    '....okkkkkkk',
    '....oBBBBBBB',
    '....oBbBbBbB',
    '.ooooooooooo',
    '.okkkkkkkkkk',
    '..oooooooooo',
    '..ohhhhhhhhh',
  ],
  // couronne
  [
    '............',
    '...o...o...o',
    '..oyo.oyo.oy',
    '..oyyoyyyoyy',
    '..oyYyyyyyYy',
    '..oyyByyyyyB',
    '..oyyyyyyyyy',
    '..oooooooooo',
    '..ohhhhhhhhh',
    '..ohhhhhhhhh',
  ],
  // capuchon
  [
    '......oooooo',
    '....ooAAAAAA',
    '...oAAAAAAAA',
    '..oAAaAAAAAA',
    '..oAaAAAAAAA',
    '.oAAaAAAAAAA',
    '.oAAAAAAAAAA',
    '.oAAAAAAAAAA',
    '.oAoCCCCCCCC',
    '.oAoCcCcCcCc',
  ],
]

export const FACE_TOP = ['...offfffff', '..offfffffff', '..offfffffff'].map((r) => r.padEnd(12, 'f'))

/** Expressions : lignes 13 à 19 du visage (7 lignes). */
export const EXPRESSIONS: string[][] = [
  // sourire
  ['..offkkfffff', '..offkwfffff', '..offfffffff', '..ofrrfffffn', '..offmffffff', '..offfmmmmmm', '..offffMMMMM'],
  // grand sourire avec dents
  ['..offkkfffff', '..offkkfffff', '..offfffffff', '..ofrrfffffn', '..ofmmmmmmmm', '..ofmwwwwwww', '..offmmmmmmm'],
  // yeux fermés, rieur
  ['..offfffffff', '..ofkkkfffff', '..offfffffff', '..ofrrfffffn', '..offfffffff', '..offmmmmmmm', '..offfMMMMMM'],
  // surpris
  ['..ofkkkfffff', '..ofkwkfffff', '..ofkkkfffff', '..ofrrfffffn', '..offfffffMM', '..offfffffMm', '..offfffffMM'],
  // rusé
  ['..offfffffff', '..ofkkkkffff', '..offfkkffff', '..ofrrfffffn', '..offfffffff', '..oMmmmmmmmm', '..offMMfffff'],
]

export const FACE_BOTTOM = ['...offfffff', '....offffff', '.....oooooo', '..oocCcCcCcC', '.ocCcCcCcCcC', 'ocCcCcCcCcCc', 'ooAAAAAoBBBo', '.oAAaAAoBBBy', '.oAAAAAoBbBo', 'ofoAaAAoBBBy', 'ofoAAAAoBbBo', '.oooAAAoBBBy', '...ooooooooo'].map(
  (r) => r.padEnd(12, 'f'),
)

// ---------------- Illustrations spéciales ----------------
export interface Sprite {
  rows: string[]
  pal: Record<string, string>
  bg?: string
}

const O = '#1d1d2b'

export const SPECIAL: Record<string, Sprite> = {
  grosMichel: {
    bg: '#f7d9a0',
    pal: { o: O, y: '#f7d13d', Y: '#fff3a6', d: '#d9a20f', n: '#5a3b1c' },
    rows: [
      '...................onn',
      '..................onno',
      '.................oyyo.',
      '................oyYyo.',
      '...............oyYyyo.',
      '..............oyYyydo.',
      '.............oyYyyydo.',
      '............oyYyyydo..',
      '..........ooyYyyyydo..',
      '........ooyyYyyyyydo..',
      '......ooyyyYyyyyydo...',
      '....ooyyyyyyyyyyddo...',
      '..ooyyyyyyyyyyyddo....',
      '.oyyyyyyyyyyyddoo.....',
      'onyyyyyyyyyddoo.......',
      'onndddddddoo..........',
      '.oooooooo.............',
    ],
  },
  cavendish: {
    bg: '#cfe8b8',
    pal: { o: O, y: '#f2dd52', Y: '#fffbc2', d: '#c8b21c', n: '#3d5a1c', g: '#7cc242' },
    rows: [
      '...................onn',
      '..................onno',
      '.................oggo.',
      '................oyYyo.',
      '...............oyYyyo.',
      '..............oyYyydo.',
      '.............oyYyyydo.',
      '............oyYyyydo..',
      '..........ooyYyyyydo..',
      '........ooyyYyyyyydo..',
      '......ooyyyYyyyyydo...',
      '....ooyyyyyyyyyyddo...',
      '..ooyyyyyyyyyyyddo....',
      '.oyyyyyyyyyyyddoo.....',
      'onyyyyyyyyyddoo.......',
      'onndddddddoo..........',
      '.oooooooo.............',
    ],
  },
  egg: {
    bg: '#cfe4f2',
    pal: { o: O, w: '#fbf6ec', W: '#ffffff', s: '#d9c6a8', F: '#d8cdbd' },
    rows: [
      '......oooo......',
      '....oowwwwoo....',
      '...owwwwwwwwo...',
      '..owWWwwwwwwwo..',
      '..owWwwwwwwwwo..',
      '.owWwwwwwwssswo.',
      '.owwwwwwwwsswwo.',
      '.owwwwwwwwwwwwo.',
      '.owwssswwwwwwwo.',
      '.owwwsswwwwwwwo.',
      '.owwwwwwwwwwwFo.',
      '..owwwwwwwwwFo..',
      '..owwwwwwwwFFo..',
      '...oowwwwFFoo...',
      '.....oooooo.....',
    ],
  },
  iceCream: {
    bg: '#ffd6e4',
    pal: { o: O, p: '#ff8fb8', P: '#ffc4da', w: '#fff4e0', W: '#ffffff', c: '#d99a4e', C: '#b8763a', r: '#e8384f' },
    rows: [
      '.......oo.......',
      '......orro......',
      '....oooroooo....',
      '...oPPpppppPo...',
      '..oPPpppppppPo..',
      '..oPpppppppppo..',
      '..oppppppppppo..',
      '..owwwwwwwwwwo..',
      '.owWWwwwwwwwwwo.',
      '.owWwwwwwwwwwwo.',
      '.owwwwwwwwwwwwo.',
      '..oooooooooooo..',
      '...occCccCccCo..',
      '...oCccCccCcco..',
      '....occCccCco...',
      '....oCccCccCo...',
      '.....occCcco....',
      '.....oCccCco....',
      '......occco.....',
      '.......oco......',
      '........o.......',
    ],
  },
  popcorn: {
    bg: '#fff0c2',
    pal: { o: O, y: '#fff6d6', Y: '#f7d76b', r: '#e8384f', w: '#ffffff' },
    rows: [
      '...oo..oo..oo...',
      '..oyyooyyooyyo..',
      '.oyYyyyyYyyyYyo.',
      'oyyyyYyyyyyyyyyo',
      'oyYyyyyyYyyyYyyo',
      '.oyyyyyyyyyyyyo.',
      'oooooooooooooooo',
      'owwrrwwrrwwrrwwo',
      '.owrrwwrrwwrrwo.',
      '.owrrwwrrwwrrwo.',
      '.owrrwwrrwwrrwo.',
      '..owrwwrrwwrwo..',
      '..owrwwrrwwrwo..',
      '..owrwwrrwwrwo..',
      '...oooooooooo...',
    ],
  },
  rocket: {
    bg: '#1d2b53',
    pal: { o: O, w: '#e8edf5', W: '#ffffff', r: '#e8384f', b: '#4cc9f0', y: '#f9c74f', Y: '#ff7f11', s: '#ffffff' },
    rows: [
      's.......o.......',
      '.......oro.....s',
      '......orrro.....',
      '.....oWwwwwo....',
      '.....oWwwwwo....',
      '.....oWobbow..s.',
      '.....oWobbowo...',
      '.....oWwwwwwo...',
      '.s...oWwwwwwo...',
      '....orWwwwwwro..',
      '...orrWwwwwwrro.',
      '...orroooooorro.',
      '...ooo.yYYy.ooo.',
      '.......yYYy.....',
      '........yy....s.',
      '........y.......',
    ],
  },
  campfire: {
    bg: '#2b2340',
    pal: { o: O, r: '#e8384f', y: '#f9c74f', Y: '#fff3a6', R: '#ff7f11', l: '#8b5a2b', L: '#5e3b1c' },
    rows: [
      '.......r........',
      '......rr...r....',
      '.....rRr..rr....',
      '....rRRrr.rRr...',
      '....rRyRrrRRr...',
      '...rRyyRRRyRr...',
      '...rRyYyRyyRr...',
      '...rRyYYyYyRr...',
      '....rRyYYyRr....',
      '.....rRyyRr.....',
      '.ooooooooooooo..',
      'olllLlllLlllLlo.',
      '.ooooLoooLooooo.',
      '..olllLlllLllo..',
      '...oooooooooo...',
    ],
  },
  luckyCat: {
    bg: '#ffe9a8',
    pal: { o: O, w: '#ffffff', W: '#f4ecdf', r: '#e8384f', k: '#2a2a3a', p: '#ff8fab', y: '#f2b632' },
    rows: [
      '..oo........oo..',
      '.owpo......opwo.',
      '.owwwoooooowwwo.',
      '.owwwwwwwwwwwwo.',
      '.owwkwwwwwwkwwo.',
      '.owwkwwwwwwkwwo.',
      '.opwwwwkkwwwwpo.',
      '..owwwwwwwwwwo..',
      '..orrrrryrrrrro.',
      '..owwwwyywwwwwo.',
      '.owwwwwwwwwwwwwo',
      '.owwWwwwwwwwWwwo',
      '.owwWwwwwwwwWwwo',
      '..oooooooooooooo',
    ],
  },
  obelisk: {
    bg: '#f2d8a7',
    pal: { o: O, s: '#c9b48a', S: '#a8916a', h: '#e8d7b2', y: '#f2b632' },
    rows: [
      '.......oo.......',
      '......oyyo......',
      '.....ohssSo.....',
      '.....ohssSo.....',
      '.....ohsSSo.....',
      '.....ohssSo.....',
      '....ohssssSo....',
      '....ohsSssSo....',
      '....ohssssSo....',
      '....ohssSsSo....',
      '....ohssssSo....',
      '...ohsssssSSo...',
      '...ohssSsssSo...',
      '..oooooooooooo..',
      '.ohhhhhhhhhhhho.',
      'oooooooooooooooo',
    ],
  },
  vampire: {
    bg: '#3d1424',
    pal: { o: O, k: '#2a1b3d', K: '#4a2f6b', f: '#e9e4f0', r: '#e8384f', w: '#ffffff' },
    rows: [
      '...oo......oo...',
      '..okko....okko..',
      '.okkkkooookkkko.',
      '.okkffffffffkko.',
      'okkffffffffffkko',
      'okffrrffffrrffko',
      'okfffffffffffffo',
      '.offffffffffffo.',
      '.offfwooooowffo.',
      '..offwffffwffo..',
      '...offffffffo...',
      '..oKKooooooKKo..',
      '.oKKKKKKKKKKKKo.',
      'oKKKKKKrrKKKKKKo',
    ],
  },
}

// ---------------- Figures (plus détaillées) ----------------
// o contour · y or · Y or clair · j joyau · h cheveux · s peau · k œil · w barbe/blanc · m bouche · n nez · r joue
// c couleur de la couleur (rouge/noir) · g dorure · e hermine (blanc tacheté) · x tache noire
export const FACES: Record<number, string[]> = {
  13: [
    '....o..o.o',
    '...oyo.oyo',
    '...oyYoyYy',
    '...oyyyyyy',
    '...oyjyyjy',
    '...oyyyyyy',
    '..ohhsssss',
    '..ohssssss',
    '..ohskksss',
    '..ohssssss',
    '..ohsssssn',
    '..owwsssss',
    '..owwwwmmm',
    '..owwwwwww',
    '...owwwwww',
    '....owwwww',
    '..oexeeeee',
    '.oeeeexeee',
    'occcccgccc',
    'occgcccgcc',
    'occcccgccc',
    'occcgccccc',
  ],
  12: [
    '......o..o',
    '.....oyooy',
    '....ohyjyy',
    '...ohhhhhh',
    '..ohhhhhhh',
    '..ohhsssss',
    '.ohhssssss',
    '.ohhskksss',
    '.ohhssssss',
    '.ohhsrssss',
    '.ohhssssmm',
    '.ohhosssss',
    '.ohhhossss',
    '.ohhhhosss',
    '..ohhhoccc',
    '..occcgccc',
    '.occcgcccc',
    '.occgcccgc',
    'occcccgccc',
    'occgcccccc',
    'occcccgccc',
    'occcgccccc',
  ],
  11: [
    '....oooooo',
    '...occcccc',
    '..occcccgc',
    'wocggggggg',
    'wwohssssss',
    '.w.ohsssss',
    '...ohskkss',
    '...ohsssss',
    '...ohssssn',
    '...ohsssss',
    '...ohssmmm',
    '....osssss',
    '.....ossss',
    '...occcgcc',
    '..occgcccg',
    '.occcccgcc',
    'occgcccccg',
    'occcccgccc',
    'occcgccccc',
    'occcccgccc',
  ],
}

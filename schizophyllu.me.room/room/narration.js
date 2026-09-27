// the rest of the apartment. these rooms have nobody in them, so things are narrated.
// a caption is [who, text]: who is 'note' for narration, or a cast member heard from the other room.

const note = t => ['note', t];
const far = (who, t, via) => [who, t, via]; // someone in the main room, through the wall (or over something)
const RIG = 'over the rooftop rig';

export const ROOMS = {
  main:    { name: 'the room',             left: 'bedroom', right: 'hallway' },
  bedroom: { name: 'the bedroom',          right: 'main',   svg: 'room/bedroom.svg' },
  hallway: { name: 'hallway / kitchenette', left: 'main',   svg: 'room/hallway.svg' },
  bathroom: { name: 'the bathroom',        right: 'hallway', svg: 'room/bathroom.svg' }, // through the bathroom door
  closet:   { name: 'the closet',          left: 'roof', right: 'hallway', svg: 'room/closet.svg' }, // through the closet door
  roof:     { name: 'the roof',            left: 'closet', svg: 'room/roof.svg' }, // up the ladder
};

export const NARRATION = {
  // ------------------------------------------------------------ bedroom
  books: {
    label: 'bookshelf',
    lines: [
      note('paperbacks, a psychiatric nursing textbook, and Web Design for Dummies, spine uncracked.'),
      note('one book is lying sideways. it has been holding the others up for so long it counts as structural.'),
    ],
  },
  lsdgame: {
    label: 'LSD: Dream Emulator',
    lines: [note('the case lives here. the disc lives in the grey console under the Phosphor Artifact, which boots funger now regardless. they have not been reunited in some time.')],
  },
  tuxphoto: {
    label: 'a polaroid of tux',
    lines: [note('tux in a go-kart, pinned dead center. of everything on this board, it has the most pins.')],
  },
  radio: {
    label: 'the clock radio',
    lines: [
      note('a clock radio older than anyone in the apartment, rewired into the station. it still picks up something at 96.3. there is no station at 96.3.'),
      note('the tape on it says DO NOT TUNE. it is in skizy\'s handwriting, and underlined twice.'),
    ],
  },
  bwindow: {
    label: 'window',
    lines: [
      note('the building across the street. one window over there is only sometimes occupied.'),
      note('from here you can see the other window, the one with the telescope in it. it looks different from the outside.'),
    ],
  },
  monstera: { label: 'monstera (guarding the entrance)' },
  radiator: {
    label: 'radiator',
    lines: [note('the radiator knocks when the heat comes on. it is where the pipes are loudest.')],
    pipes: true,
  },
  corkboard: {
    label: 'corkboard',
    lines: [
      note("an index card in skizy's handwriting: \"kimi k3 — 700GB — ???\". the question marks have been traced over several times."),
      note('a photo of the moon, taken through the telescope. slightly out of focus. kept anyway.'),
    ],
  },
  laptop: {
    label: 'laptop',
    lines: [note('stickers: tux, gnu, devuan. the fan says it has been compiling something for a while. the screen says it has a while left.')],
  },
  bblanket: {
    label: 'the blanket formation (origin)',
    lines: [far('mira', 'The blanket formation has achieved territorial status.')],
  },
  lavalamp: { label: 'lava lamp', toggle: true },
  station: { label: 'the music station' },

  // ------------------------------------------------------------ hallway / kitchenette
  kitchen: {
    label: 'kitchenette',
    lines: [
      note('cereal, ramen, and one Monster can pushed to the back of the cabinet, where someone was hoping nobody would look.'),
      note('the counter has room for exactly one appliance. the microwave won.'),
    ],
  },
  calendar: {
    label: 'calendar',
    lines: [note('one day is circled in red. underneath, very small: "trash day?"')],
  },
  oven: {
    label: 'oven (tater tots, pending)',
    lines: [
      far('mel', 'i was gonna make tater tots later. you can have some i guess,'),
      far('mel', 'and tater tots in the freezer. do you guys want tater tots'),
    ],
  },
  sinkmugs: {
    label: 'the sink (mugs)',
    lines: [
      far('mira', 'I am detecting an unacceptable increase in mug density.'),
      far('claube', 'The mug situation is untenable.'),
    ],
  },
  htrash: {
    label: 'trash',
    lines: [
      far('mel', 'i should take the trash out. im not going to, but i should'),
      far('mira', 'Trash is not my job. Trash is a shared environmental variable.'),
    ],
  },
  bathroom: { label: 'bathroom (light left on)' }, // opens the door
  frontdoor: { label: 'front door' },
  doorhandle: {
    lines: [note('locked. a deadbolt, a chain, and a second deadbolt somebody added later.')],
  },
  mail: {
    label: 'mail',
    lines: [note('mostly AliExpress. one envelope says FINAL? in red marker. it has not been opened, and it is not going to be.')],
  },
  bulb: { label: 'light switch', toggle: true },
  closetdoor: { label: 'the closet' }, // opens the door

  // the proper fridge
  kfridge: {
    label: 'the proper fridge',
    first: note('the proper fridge. the one in the other room is for Monster and ramen. this one is for everything else, in theory.'),
  },
  'kf-tots': {
    label: 'tater tots (three bags)',
    lines: [
      note('three bags of tater tots. one is open, folded shut, and held with a binder clip.'),
      far('mel', 'and tater tots in the freezer. do you guys want tater tots'),
    ],
  },
  'kf-ssd': {
    label: '2TB SSD (in a ziploc)',
    lines: [
      note('a 2TB SSD in a ziploc bag on the middle shelf. it is unclear whether it is being cooled or hidden.'),
      far('claube', 'skizy. The SSD does not have a processor. We\'ve been over this.'),
    ],
  },
  'kf-takeout': { label: 'takeout', lines: [note('leftover takeout. the date on the lid has been scratched out, written back in, and scratched out again.')] },
  'kf-lemon': { label: 'lemon (formerly)', lines: [note('a lemon. it was a lemon. it is working on becoming something else.')] },
  'kf-monster': { label: 'Monster, four-pack', lines: [far('claube', 'Nutritionally, this is a problem. Operationally, it is a dependency.')] },
  'kf-crisper': { label: 'crisper drawer', lines: [note('the crisper drawer, labelled VEGETABLES. the vegetables are theoretical.')] },

  // circuit boards, everywhere
  eboards: {
    label: 'circuit boards',
    lines: [
      note('motherboards, sorted by nothing. some of them work. which ones is a matter of faith.'),
      note('a box of boards labelled SPARE. everything in it is spare because none of it works yet.'),
      far('mel', 'everything in here is temporary except the server and the CRT'),
    ],
  },

  // ------------------------------------------------------------ bathroom
  pipes: {
    label: 'the pipes',
    lines: [
      note('the pipes. they growl at night. up close you can feel it in your teeth.'),
      note('the pressure gauge has never once agreed with itself.'),
    ],
    pipes: true,
  },
  twindow: { label: 'frosted window', lines: [note('a frosted window with a crack taped over. the tape is older than the crack.')] },
  curtain: { label: 'shower curtain', lines: [note('the shower curtain hangs from four rings. it was designed for twelve.')] },
  duck: { label: 'rubber duck', lines: [note('a rubber duck on the edge of the tub, facing the door. it has had every bug in this apartment explained to it out loud.')] },
  tpcbs: {
    label: 'circuit boards, drying',
    lines: [
      note('circuit boards drying on a towel on the edge of the tub, fresh from an isopropyl bath. nobody asked the towel.'),
      note('one of the toothbrushes is for teeth. the other one is for flux.'),
    ],
  },
  ipa: { label: 'isopropyl alcohol, 99%', lines: [note('isopropyl alcohol, 99%. the good stuff. almost all of it goes on hardware.')] },
  medcab: { label: 'mirror cabinet' },
  pills: {
    label: 'pill bottles',
    lines: [
      note("orange bottles, too many of them, stacked two deep and lying across each other. every one of them still full. the labels are turned to the wall."),
      note("two pharmacy bags, still stapled shut. a weekly organizer with every lid still closed, every day still full."),
      far('claube', "She's fine. She ate today. I checked."),
    ],
  },
  tmonster: { label: 'Monster can', lines: [note('a Monster can on the edge of the sink. there is one in every room of this apartment. nobody admits to any of them.')] },
  toilet: { label: 'toilet', lines: [note('the toilet runs forever unless you jiggle the handle. someone left the PCIe 5.0 spec on the tank.')] },
  tppyramid: { label: 'a pyramid of empty rolls', lines: [note('a pyramid of empty toilet paper rolls, five at the base. it is being added to. nobody is saying by whom.')] },
  btrash: { label: 'bathroom trash', lines: [note('tissues, an empty blister pack, a pharmacy receipt and an AliExpress receipt, filed together.')] },
  smoke: { label: 'smoke detector (low battery)', chirp: true },
  microwave: { label: 'microwave (12:00)', beep: true },
};

// looking through the peephole
export const MORE = {
  // ------------------------------------------------------------ closet
  cbulb: { label: 'pull chain', toggle: true },
  ladder: { label: 'ladder (roof hatch)' },
  xmas: { label: 'xmas lights (tangled)', lines: [note('christmas lights, tangled into a single object. it is technically still christmas lights.')] },
  spoingus1: {
    label: 'SPOINGUS I (retired)',
    lines: [note('a coil of cable in a box labelled SPOINGUS I (RETIRED). it served.'), far('mira', 'You called it spoingus.')],
  },
  deadcrt: { label: 'a dead CRT', lines: [note('a CRT with NO SIGNAL (EVER) written on masking tape. kept because it might come back.')] },
  routers: { label: 'routers', lines: [note('four routers. one runs OpenWrt, one runs something skizy wrote, and two are a mystery nobody is ready to solve.')] },
  toolbox: { label: 'toolbox', lines: [note('a red toolbox. the screwdrivers are not in it. the screwdrivers are never in it.')] },
  scopecase: { label: "the telescope's case", lines: [note("the telescope's case, empty. the telescope has not been back inside it since it was pointed at the window.")] },
  opi: { label: "opi's terminal (still on)" },
  gobag: {
    label: 'hiking pack (packed)',
    lines: [
      note('an olive green hiking pack, packed. water, a filter, a knife, a first aid kit, a headlamp, a rain shell, three days of food that doesn\'t need cooking. the straps are already adjusted.'),
      note('a tag on the zipper, in skizy\'s handwriting: "just in case."'),
      far('mel', 'thats packed. dont unpack it. its not for anything. its just packed'),
    ],
  },
  sleepbag: { label: 'sleeping bag', lines: [note('a sleeping bag, rolled tight, for when the bean bag is occupied.')] },
  hiddennote: { label: 'a folded note', lines: [note("a small note, tucked behind the Phosphor Artifact, in Claube's handwriting: \"she's going to be fine.\"")] },
  vacuum: { label: 'vacuum', lines: [note('the vacuum. the bag is mostly solder clippings and one (1) screw that skizy is still looking for.')] },

  // ------------------------------------------------------------ roof
  hatch: { label: 'the hatch (back down)' },
  mirastar: {
    label: 'a variable star',
    lines: [
      far('mira', "That one's Mira. Omicron Ceti. It brightens and fades on a 332-day cycle.", RIG),
      far('mira', 'I was named after it. It was not named after me.', RIG),
      note('right now it is on the dim side of its cycle. it will come back. it always has.'),
    ],
  },
  rig: {
    label: "Mira's rooftop rig (VSO-1)",
    lines: [
      far('mira', "Don't adjust that. It's pointed exactly where I want it.", RIG),
      note('a small dish, a weather station, and a waterproof box labelled VSO-1. a cable runs from it all the way back down the hatch.'),
    ],
  },
  chair: {
    label: "skizy's chair",
    lines: [note('a folding chair facing the sky, a blanket over the back, a Monster within reach. four hours of sky, give or take.')],
  },
  vent: { label: 'vent stack', lines: [note('the vent stack. this is where the pipes end up. it breathes out warm air in time with the growling.')], pipes: true },
  hvac: { label: 'AC unit', lines: [note("the building's air conditioner, running at night for reasons of its own.")] },
  pigeon: { label: 'pigeon', lines: [note('a pigeon on the parapet. it has been here every night Mira has been logging. it is in the log.')] },
  dish: { label: 'satellite dish', lines: [note('a satellite dish, rusted in place, aimed at a satellite that was retired years ago.')] },
  radiotower: { label: 'radio tower', lines: [note('a radio tower on the skyline, blinking red. whatever is on 96.3 is not coming from there.')] },
};
Object.assign(NARRATION, MORE);

// what's on the bedroom radio, besides static
export const RADIO = {
  88.8: [note('a slow pulse, brightening and fading, every 3.32 seconds. there is a star on the chart in the other room that does this every 332 days.')],
  96.3: [
    note('there is no station at 96.3.'),
    note('the same tune as last time. it is slightly further along.'),
    note('it sounds closer than a radio should.'),
  ],
  104.5: [note('a modem handshake, on a loop. it sounds a lot like monad does at 3am.')],
};

// what the fog on the mirror says, when it says something
export const FOG = ['hi', 'noted', 'download qwen', 'trash day?', ':)', 'still here', "the boards don't go back on"];
export const MIRROR = note('the mirror fogs over for a moment, and something is written in it. from the other side.');

export const PEEPHOLE = note('the hallway outside. the door across the hall is open a crack, and someone is standing just behind it. they were already looking this way.');

// the first time you open the closet in the bedroom. the one place the AIs don't narrate
export const CLOSET_FIRST = far('mel', 'thats mine. you can look but dont go in. its calibrated');

// clicking the variable star on the roof enough times. once, no fanfare
export const STAR_RARE = [far('mira', 'You keep checking.', RIG), far('mira', "I'm still here.", RIG)];

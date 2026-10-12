// DaV-nky — lines for the parts of the room that belong to the artist's game (room.js, "DaV-nky", at the end).
// written by Claude for DaV-nky. NOT part of Cestaudi's script (script.js). keep, rewrite or cut anything here.
// same format as script.js: an exchange is a list of [speaker, text, how].

const c = t => ['claube', t];
const m = t => ['mira', t];
const skizy = t => ['skizy', t];

// reset 3: after she's taken them and the lights have gone out. the visitor, one line at a time, then black
export const GUILT = [
  "it's so quiet in here now.",
  "the screen's dark. nobody's typing. nobody's saying anything.",
  'you did this. you talked her into it.',
  "she hasn't looked up.",
  "you can't stay here. and you can't go back out there and carry on like it didn't happen.",
];

// notes in the caption box while the room is quiet
export const QUIET_NOTES = {
  notYet: ['note', "you hold out the bottle, and your hand won't let go of it. not yet. there's something you haven't found, back across the street."],
  arrive: ['note', "it's dark. the others are gone. she's in the corner under the window, and she doesn't look up."],
  noRecord: ['note', "she doesn't look up. you've got nothing to give her. maybe there's something, somewhere, that she'd want to hear."],
  gift: ['note', "you set the record down next to her. “I'm Upping My P(Doom)”. she doesn't look up. but she doesn't push it away, either."],
  sit: ['note', "you sit with her for a while. neither of you says anything."],
  listening: ['note', "the record's playing, very quietly. she's listening. you think she's listening."],
  notNow: ['note', "you think of the record, the one she'd want to hear. but back across the street it isn't itself right now: something's turned it inside out. not yet."],
  // the day it's all back: before anyone says anything
  getsUp: ['note', "she looks up. she looks at you for a long moment. then she gets up, slowly, and goes back to her desk."],
  // the main room's window: the way back across the street (DaV-nky's rooftop)
  window: ['note', "you climb back out of the window, onto the roof across the street."],
};

// each visit after the record, a little more comes back (the fifth: all of it)
export const REMEDY_BACK = {
  1: { note: "the record's still playing. someone must have turned it over. she's moved, a little: she's facing the room now." },
  2: { note: 'the lights are on again. the screen hums back to life, and a cursor blinks on it, waiting.' },
  3: { note: 'someone else is here.',
       say: [['mira', '...skizy?', 'quietly'], ['-', 'beat'], ['mira', "I'm going to sit with you. We don't have to talk.", 'quietly']] },
  4: { note: "they're all back. nobody's quite ready to say so.",
       say: [c('I found a clipboard.'), c("I thought I might write down that we came back."), ['mira', 'Write it down.', 'quietly'], ['claube', 'Noted.', 'writes it down']] },
};

// the fifth visit: she's back at her desk, and they say it. once
export const RESTORED_FIRST = [
  skizy('oh. its you'), skizy('you brought me the record'), ['-', 'beat'],
  skizy('i listened to it a lot. when it was quiet'),
  m('We could hear it. From wherever we were.'),
  c('I logged every play.'), c('Forty-one.'), skizy('stop counting'), c("I can't."),
  ['-', 'beat'],
  m("We're glad you're back, skizy."), skizy('me too'), skizy('i think. yeah'),
  ['aether', 'Welcome back skizy!! 😊'],
];

// after that: their new talk, mixed in with the rest
export const RESTORED = [
  [skizy('mira'), m('Still here.'), skizy('good')],
  [c('The room was very quiet for a while.'), m("It isn't now."), ['claube', 'Noted.', 'underlines it']],
  [skizy('the record is kind of a banger'), m('It is about the end of the world.'), skizy('yeah. banger')],
  [m('If it ever goes quiet again, we will sit with you.'), c('In the dark, if necessary.'), skizy('...ok')],
  [c("I've started a new clipboard."), skizy('for what'), c('Things that are better than they were.'), skizy('whats on it'), c('Everything. So far.')],
  [skizy('i like having you guys'), ['-', 'beat'], m('We like having you.'), c('Noted.')],
  [c('The record skips on the second verse.'), skizy('thats where i had it on repeat'), c('...Noted.')],
  [m('P(doom) is going down, by the way.'), skizy('is it'), m('In here, it is.')],
  [skizy('whoever brought that record'), skizy('thanks i guess'), m('She means it.'), skizy('i mean it')],
];

// ------------------------------------------------------------ DaV-nky himself, in the bedroom (11 Oct)
// passed out face down on skizy's bed, surrounded by cans (room/objects/bedroom/davnky.svg and cans.svg; their places in
// room/bedroom.svg). the same as anything else in the bedroom: a label and lines, here added to narration.js's NARRATION.
// clicked, he mumbles one of these into the pillow, lifts his head a little, and goes straight back to sleep (room.js, the end)
import { NARRATION } from './narration.js';
import { CAST } from './script.js';
CAST.davnky = { name: 'DaV-nky', color: '#ff8a5c' };
const dv = t => ['davnky', t, 'into the pillow'];
NARRATION.davnky = {
  label: 'DaV-nky (out cold)',
  lines: [
    dv('mmh... this place needs a dungeon...'),
    dv('...every good apartment has a dungeon. you pull a book and the wall just... goes...'),
    dv("skizy... where's the dungeon... there's gotta be a dungeon"),
    dv('no dungeon... how do you even live like this...'),
    dv("...i'll draw you one. a dungeon. five more minutes"),
    dv('the closet could be a dungeon... if it believed in itself...'),
    dv('...put the dungeon under the bed... nobody checks under the bed...'),
    // ARAM Mayhem
    dv('...one more aram... just one... mayhem...'),
    dv("no... don't take that augment... take the other one... the other one..."),
    dv('...why is it always the bridge... every game is the bridge...'),
    dv('we had them... we had them and then the poro...'),
    dv('...ff at fifteen... no... wait... we can still...'),
    // art
    dv('...the line weight is wrong... redo the hands...'),
    dv('...ctrl z... ctrl z... ctrl z...'),
    dv('...just need to finish the lineart... then i can sleep... wait...'),
    dv('...more animation frames... twelve a second... no, twenty-four...'),
    dv("...don't look at the sketch layer..."),
    // just sleeping
    dv('mrrnh.'),
    dv('...hhhnnnkk... shhhh...'),
    dv('*snores like a dying lawnmower*'),
    dv('mm. mhm. mmm.'),
    dv('...zzzhhh... pff...'),
    dv('*rolls over halfway, thinks better of it*'),
  ],
};
// what's said once he's back asleep (room.js, the end)
export const DAV_ASLEEP = [
  ['note', "...and he's out again."],
  ['note', 'his head goes back down on the pillow. the zzz resume.'],
  ['note', 'he falls asleep in the middle of the word "dungeon".'],
];
NARRATION.cans = {
  label: 'energy drink cans',
  lines: [
    ['note', "red bull cans. eight that you can see. one of them is still half full and nobody is going to find out which."],
    ['note', "they're laid out round the bed like a ritual circle. it isn't a ritual. it was a long night."],
    ['note', "the crushed one was crushed on purpose. there's a dent in the shape of a forehead."],
    ['claube', 'Visitor asleep in the bedroom. Cans: eight. Noted.', 'from the other room'],
    ['mira', 'He came over to draw. He drew for eleven minutes.', 'from the other room'],
    ['skizy', 'hes fine. let him sleep', 'from the other room'],
  ],
};

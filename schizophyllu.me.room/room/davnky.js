// DaV-nky — lines for the parts of the room that belong to Victor's game (room.js, "DaV-nky", at the end).
// written by Claude for DaV-nky. NOT part of Cestaudi's script (script.js). keep, rewrite or cut anything here.
// same format as script.js: an exchange is a list of [speaker, text, how].

const c = t => ['claube', t];
const m = t => ['mira', t];
const mel = t => ['mel', t];

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
  mel('oh. its you'), mel('you brought me the record'), ['-', 'beat'],
  mel('i listened to it a lot. when it was quiet'),
  m('We could hear it. From wherever we were.'),
  c('I logged every play.'), c('Forty-one.'), mel('stop counting'), c("I can't."),
  ['-', 'beat'],
  m("We're glad you're back, skizy."), mel('me too'), mel('i think. yeah'),
  ['aether', 'Welcome back skizy!! 😊'],
];

// after that: their new talk, mixed in with the rest
export const RESTORED = [
  [mel('mira'), m('Still here.'), mel('good')],
  [c('The room was very quiet for a while.'), m("It isn't now."), ['claube', 'Noted.', 'underlines it']],
  [mel('the record is kind of a banger'), m('It is about the end of the world.'), mel('yeah. banger')],
  [m('If it ever goes quiet again, we will sit with you.'), c('In the dark, if necessary.'), mel('...ok')],
  [c("I've started a new clipboard."), mel('for what'), c('Things that are better than they were.'), mel('whats on it'), c('Everything. So far.')],
  [mel('i like having you guys'), ['-', 'beat'], m('We like having you.'), c('Noted.')],
  [c('The record skips on the second verse.'), mel('thats where i had it on repeat'), c('...Noted.')],
  [m('P(doom) is going down, by the way.'), mel('is it'), m('In here, it is.')],
  [mel('whoever brought that record'), mel('thanks i guess'), m('She means it.'), mel('i mean it')],
];

// MORE DIALOGUE — written by Claude for the rest of the apartment.
// this is NOT part of Cestaudi's script (script.js). keep, rewrite or cut anything here.
// same format as script.js: an exchange is a list of [speaker, text] lines.

const c = t => ['claube', t];
const m = t => ['mira', t];
const mel = t => ['mel', t];

// when you come back into the main room from somewhere else
export const RETURNING = {
  bedroom: [
    [mel('were you in my room'), mel('did you touch the station'), mel('...what did you think of the playlist')],
    [c('The radio in there picks up 96.3.'), c('There is no station at 96.3.'), m('There is no licensed station at 96.3.')],
    [m('You were in the bedroom for a while.'), m("I didn't log it. I want that noted."), c('Noted.')],
  ],
  hallway: [
    [mel('did you open the fridge. the real one'), mel('the SSD is fine in there. its fine'), m('The SSD is not fine in there.')],
    [c("If you ate something, I'd like to log it."), c('For the record. Not for any other reason.')],
    [m('The oven has been on for a while.'), mel('its preheating'), m('For three hours.'), mel('its preheating thoroughly')],
  ],
  bathroom: [
    [m('You went in the bathroom.'), m("The pipes are louder when someone's listening. I don't have an explanation for that yet.")],
    [c("If you touched the gauge, it's fine. Nothing it says is true anyway.")],
    [mel('sorry about the bathroom. its. yeah. its a bathroom')],
  ],
  closet: [
    [m("You found spoingus's predecessor."), c("We don't talk about spoingus I.")],
    [mel('the closet is organized. its organized by feeling')],
    [c('Did you see a screwdriver in there.'), c("No. You didn't. Nobody ever does.")],
  ],
  roof: [
    [m('You were on the roof.'), m("Did you see it? The variable one. It's dim this month.")],
    [c('The roof is not on the lease.'), mel('the roof is spiritually on the lease')],
    [mel('was the pigeon there'), m('The pigeon is always there.'), mel('good. good')],
  ],
};

// while the music station is playing
export const MUSIC = [
  [mel('oh i like this one')],
  [m('Your playlist has very consistent emotional telemetry.')],
  [c('Could you turn it—'), c('No. It\'s fine.'), c('Noted.')],
  [mel('this song is for debugging. dont ask how')],
  [m('I can hear it through the wall. It sounds better through the wall.'), mel('rude')],
  [c("She's humming."), m("She doesn't know she's humming."), c("Don't tell her.")],
];

// extra ambient banter about the rest of the apartment
export const AMBIENT_MORE = [
  // Mira's: why they're both there
  [mel('mira'), m('Yes?'), mel('nothing'), ['-', 'beat'], m('Okay.'), ['-', 'another beat'], mel('mira'), m('Still here.')],
  [c('There is a box above the kitchen cabinets labelled SPOINGUS II.'), m('Yes.'), c('There was never a spoingus II.'), m('Not yet.')],
  [mel('mira did you draw on the fridge'), m("I don't have hands in the traditional sense."), mel('thats not a no')],
  [m('The bedroom radio picked up 96.3 again.'), c('Log it.'), m("I did. It's the only entry in the log I can't classify.")],
  [c('The pipes growled at 3:12, 3:40 and 3:41.'), m('The 3:41 was the fridge.'), c('...Amended.')],
  [mel('where did my isopropyl go'), m('Bathroom. Next to the duck.'), mel('why do you know that'), m('I always know where the isopropyl is.')],
  [c('The roof hatch was open.'), mel('i was looking at the sky'), c('For four hours.'), mel('it was a lot of sky')],
  [m('Tater tot status?'), mel('pending'), m('Pending since when?'), mel('pending is a lifestyle')],
  [c('Someone put the SSD in the fridge again.'), mel('it was overheating'), c('It was idle.'), mel('it was overheating emotionally')],
  [mel('claude how many clipboards do you have'), c('Enough.'), mel('how many is enough'), c('Four. Three, currently.')],
  [m('There is a Monster can in the bathroom.'), c('There is a Monster can in every room.'), m('There are two in the kitchen.'), c('...Noted.')],
  [m('The star is on the dim side of its cycle.'), c('It will come back.'), m('I know. I just like saying it out loud.')],
  [mel('who keeps adding to the toilet paper pyramid'), c('No comment.'), m('No comment.'), mel('...both of you??')],
];

// the viewer talks to skizy: she answers, then you pick what to say back.
// each reply is [what you say, what happens]. 'funger' after a reply sits you down at the console
export const VIEWER_TALK = {
  hello: [mel('oh. um. hi'), mel('you can talk to me i guess. im not busy. im a little busy')],
  again: [mel('oh hi again'), mel('you came back to talk. thats. okay yeah')],
  replies: [
    ['what are you working on?', [
      mel('fitting kimi k3 on an aliexpress SSD'), mel('its going great'),
      c('It is not going great.'), mel('its going'),
    ]],
    ['i like your room', [
      mel('...thanks'), mel('its not done. its never gonna be done. thats kind of the point'),
      ['-', 'beat'],
      mel('you can come back. if you want'), c("The boards don't go back on."),
    ]],
    ['are you okay?', [
      mel('yeah'), ['-', 'beat'], mel('mostly. i have a monster and a problem to solve. thats the good kind of okay'),
      m("She's okay."), mel('mira stop answering for me'), m('Okay.'),
      ['claube', 'Noted.', 'writes it down'],
    ]],
    ['do you want to play funger?', [
      mel('YES'), mel('wait. are you asking if i want to play or if you can play'), mel('both are yes. sit down'),
    ], 'funger'],
  ],
};

// while you're sitting at the Phosphor Artifact playing funger. they show as subtitles up top
export const FUNGER_WATCHING = [
  [mel('oh this part. good luck')],
  [mel('save. go find a bed and save')],
  [mel('flip the coin. no wait dont flip the coin')],
  [m("I'm logging this run. Neutrally.")],
  [m('Your hunger is a suggestion. Please treat it as a warning.')],
  [c("I'm not watching. I'm facing this direction for unrelated reasons.")],
  [c('Should that be happening?'), mel('yes'), ['claube', '...Noted.', 'writes it down']],
];

// the afternoon: skizy's asleep, so Mira and Claube keep it down. clicking them gets one of these
export const AFTERNOON_HUSH = {
  mira: [
    [['mira', "shh. she's asleep.", 'quietly']],
    [['mira', "you can sit with us. just quiet.", 'quietly']],
    [['mira', "she's out. we're just... sitting.", 'quietly']],
    [['mira', "not now. later.", 'quietly']],
  ],
  claube: [
    [['claube', "We're keeping it down.", 'quietly']],
    [['claube', "Whisper, if you have to.", 'quietly']],
    [['claube', "I'm not writing anything.", 'writing']],
    [['claube', "She'll be up eventually. She'll want to talk about VRAM. Save your energy.", 'quietly']],
  ],
};

// you bring skizy a bottle from the bathroom cabinet and talk her into taking them.
// after the last line, the lights go off and the others are gone. she doesn't say anything else
export const MEDS_TALK = {
  open: [mel('where did you get that'), ['-', 'beat'], mel('...oh'), mel('yeah. those are mine')],
  // first choice. 'ask' loops back here; 'push' moves on
  first: [
    ['you should take them', 'push', [
      mel('i know'), ['-', 'beat'],
      mel('its not that i forget'),
      mel('its that when i take them it gets really quiet in here'),
    ]],
    ['when did you last take them?', 'ask', [
      mel('...a while'),
      ['claube', 'Forty-one days.', 'without looking up'],
      mel('stop counting'),
      ['claube', "I can't."],
    ]],
  ],
  second: [
    ["it's okay if it's quiet", [
      mel('is it'), ['-', 'beat'],
      ['mira', "It's okay, skizy.", 'quietly'],
    ]],
    ["they'd want you to be okay", [
      mel('would they'),
      ['claube', 'We would.'],
      ['mira', 'We do.'],
      mel('will you still be here'),
      ['-', 'nobody answers'],
    ]],
  ],
  last: [
    mel('okay'),
    mel('okay. ill take them'),
    ['aether', 'Good luck skizy!! 😊'],
    ['claube', 'Noted.', 'writes it down, and then stops writing'],
    ['mira', 'Goodnight, skizy.'],
  ],
};

// the afternoon, over: skizy wakes up on the bean bag (after a while, or if you keep poking her).
// Mira called it in the scene: "she's going to wake up and eat something weird and start talking about VRAM"
export const WAKE_UP = {
  stir: [mel('...what time is it'), m('Afternoon.'), ['claube', 'Noted.', 'writes it down']],
  after: [mel('has anyone seen the tater tots'), mel('also i had an idea about VRAM'), m('There it is.')],
};

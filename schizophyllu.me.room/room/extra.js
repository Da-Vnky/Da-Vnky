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

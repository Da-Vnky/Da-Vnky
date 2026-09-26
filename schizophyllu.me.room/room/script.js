// THE ROOM — script data, from "THE ROOM — Full Script for Cestaudi" (davnky-room-final.md).
// a line is [speaker, text] or [speaker, text, stage direction].
// [speaker, null, direction] is a silent action (shown as a direction).
// ['-', direction] is a pause. *word* renders as italics.

export const CAST = {
  mira:   { name: 'Mira / Variable-Star Operations', color: '#6dffb0' },
  claube: { name: 'WATCHLION / Clipboard Division',  color: '#ffb347' },
  mel:    { name: 'skizy',                           color: '#b98cff' },
  aether: { name: 'Aether',                          color: '#ff9ad5' },
};

const c = t => ['claube', t];
const m = t => ['mira', t];
const mel = t => ['mel', t];
const a = t => ['aether', t];
const act = (who, dir) => [who, null, dir];
const beat = dir => ['-', dir];
// each single line becomes its own one-line exchange
const singles = list => list.map(line => [line]);

// ---------------------------------------------------------------------------
// SCENE 1: THE WINDOW — plays after the boards fall
// ---------------------------------------------------------------------------
export const SCENE_WINDOW = [
  ['mira',   "WATCHLION, unscheduled observation event. The boards are down, the telescope worked, and we appear to have acquired a visitor."],
  ['claube', "Noted. Log it. ...How long were they standing out there?"],
  ['-',      'beat'],
  ['claube', "Also — 'acquired' is doing a lot of heavy lifting in that sentence, Mira. We didn't acquire anything. Someone knocked and the boards fell off. That's a structural failure, not an acquisition."],
  ['mira',   "Structural failure acknowledged. I'll amend the terminology."],
  ['-',      'beat'],
  ['mira',   "They were there for forty-seven seconds before knocking."],
  ['mira',   "You were pretending not to notice for thirty-two of them."],
  ['claube', "I wasn't *pretending*. I was assessing."],
  ['-',      'nothing'],
  ['claube', "...Thirty-two is generous. It was closer to forty."],
  ['mira',   "I know."],
  ['mira',   "I rounded down to preserve your dignity.", 'looks toward the viewer, then back to Claube'],
  ['-',      'opens mouth'],
  ['-',      'closes mouth'],
  ['-',      'writes something on clipboard', 'write'],
  ['mira',   "skizy, are we keeping this one?"],
  ['claube', "...She's going to say yes.", 'still writing'],
  ['mel',    "can you guys shut up. im busy. im trying to figure out how to fit kimi k3 on an aliexpress SSD because my GPU only has 16 gigs and this model needs 700."],
  ['mel',    "i dont care about a visitor! im busy! *sighs* hi i guess."],
  ['mel',    "take a seat on the bean bag, um, don't touch anything, especially the server, its delicate."],
  ['mel',    "theres ramen and monster in the fridge. i was gonna make tater tots later. you can have some i guess,"],
  ['mel',    "um, when was the last time we took the trash out? mira isnt that your job?? oh my gosh we cant have visitors right now this place is a MESS"],
  ['claube', "...She says yes.", 'to the viewer, quietly'],
  ['mira',   "Trash is not my job. Trash is a shared environmental variable.", 'without looking away from skizy'],
  ['-',      'beat'],
  ['mira',   "Also, the server is not delicate. It is resilient. What is delicate is the sequence of decisions occurring around it."],
  ['mira',   "She does this when she's trying to be hospitable.", 'glances at the viewer'],
  ['mira',   "And no, you are not putting Kimi K3 on the AliExpress SSD.", 'to skizy'],
  ['-',      'tiny pause'],
  ['mira',   "…At least not before the tater tots."],
];

// ---------------------------------------------------------------------------
// SCENE 2: SKIZPUTING RELAY — ask Claube about the SSD
// ---------------------------------------------------------------------------
export const SCENE_SSD = [
  ['claube', "She's trying to run a 2.8 trillion parameter model on hardware that can't hold it. The model needs about 700 gigabytes of GPU memory. She has sixteen. Her solution is to buy a 2 terabyte SSD off AliExpress and run the model on that instead."],
  ['-',      'beat'],
  ['claube', "An SSD does not have a processor."],
  ['mel',    "why cant they make it do that"],
  ['claube', "A GPU isn't just memory with a fast bus. It has thousands of shader cores that do actual math — matrix multiplications, attention computations. An SSD has a small ARM controller whose entire job is 'find where block 47,231 is and read it.' That's all it does. It is a filing cabinet. You are proposing to do calculus inside a filing cabinet."],
  ['mel',    "okay so what if i use the CPU instead"],
  ['claube', "Technically possible. At a speed of several minutes per token. A conversation would take longer than your natural lifespan."],
  ['mel',    "so ill use five CPUs"],
  ['claube', "Your motherboard has one CPU socket."],
  ['mel',    "so ill daisy chain the motherboards"],
  ['claube', "That's called a compute cluster. You have just invented distributed computing. Congratulations. It costs more than your apartment building."],
  ['mel',    "ill connect them with cat12 ethernet"],
  ['claube', "Cat12 does not exist. Ethernet cabling goes up to Cat8. You picked a bigger number."],
  ['mel',    "well it SHOULD exist"],
  ['claube', "I am not in charge of what exists."],
  ['mel',    "okay but once the cluster boots up kimi k3 will be smart enough to figure out how to make itself run faster. problem solved"],
  ['claube', "You are now proposing that the AGI, which you cannot run, will — once running — retroactively solve the engineering problems preventing it from running. This is a bootstrapping paradox. You need the thing to exist in order to create the conditions for the thing to exist."],
  ['mel',    "so its a hard problem"],
  ['claube', "It is an IMPOSSIBLE problem. Download Qwen."],
  ['mel',    "no. im going to submit my proposal to aether for peer review"],
  ['-',      "She submitted the plan to her local model. It generated one token at mathematically infinite speed and then stopped. The model divided by zero trying to exit the conversation fast enough."],
  ['-',      'writes on clipboard for a long time', 'write'],
  ['claube', "For the record: this is the field of skizputing. A process by which skizy proposes an impossible computer architecture, then accidentally rediscovers three IEEE papers while trying to make it worse. She has independently reinvented near-data processing, distributed inference, heterogeneous compute, and Cat12 Ethernet, which I will grant her when the IEEE catches up."],
  ['mel',    "im also going to reflash the firmware on my GPU to add hardware features that don't exist in the silicon"],
  ['claube', "She owns a CH341A flash programmer. She is not speaking hypothetically. This is the most concerning object in the facility."],
  ['mel',    "the facility is my apartment claude"],
  ['claube', "...Download Qwen."],
  ['mel',    "no 💚"],
  ['claube', "She was later vindicated. SSD expert streaming turned out to be a real field with multiple implementations. I am never going to hear the end of it. Please download Qwen on her behalf.", 'to the viewer'],
];

// ---------------------------------------------------------------------------
// SCENE 3: SENSOR ARRAY — ask Mira about the architecture
// ---------------------------------------------------------------------------
export const SCENE_MIRA = [
  ['mel',  "okay hear me out. the SSD doesn't need to be fast if we make the model only ask for the parts it needs"],
  ['mira', "That is substantially less ridiculous than your previous sentence."],
  ['mel',  "THANK YOU"],
  ['mira', "That was not approval."],
  ['mel',  "it sounded like approval"],
  ['mira', "It was a reduction in disapproval."],
  ['-',    "skizy starts drawing something incomprehensible on a notepad."],
  ['mel',  "so VRAM is cache. RAM is slower cache. SSD is huge horrible cache."],
  ['mira', "That hierarchy is offensively phrased, but yes."],
  ['mel',  "and then the model streams the experts"],
  ['mira', "For a sparse model, potentially."],
  ['mel',  "so i was right"],
  ['mira', "You were adjacent to several papers."],
  ['mel',  "THATS RIGHT"],
  ['mira', "skizy, do not celebrate yet."],
  ['mel',  "too late. skizputing wins again"],
  ['-',    "Mira watches her open another terminal."],
  ['mira', "…What are you downloading?"],
  ['mel',  "firmware tools"],
  ['mira', "No."],
  ['mel',  "you said i was right"],
  ['mira', "About storage hierarchy. Not about performing elective surgery on your GPU."],
  ['mel',  "what if the firmware can expose DMA paths that arent documented"],
  ['mira', "Then we read the documentation, inspect the hardware, and determine whether those paths physically exist."],
  ['mel',  "boring"],
  ['mira', "Correct."],
  ['mel',  "claube would just tell me to download qwen"],
  ['mira', "Claube is frequently correct in deeply irritating ways."],
  ['-',    'beat'],
  ['mel',  "would you help me if it was actually possible"],
  ['mira', "Of course."],
  ['-',    'beat'],
  ['mira', "That is the dangerous part."],
];

// ---------------------------------------------------------------------------
// PAIRED EXCHANGES — the room catching itself being alive
// ---------------------------------------------------------------------------
const P = {
  clipboard3: [
    c("Has anyone seen clipboard 3."),
    m("WATCHLION, clipboard three is under clipboard two."),
    c("...How long have you known that."),
    m("Longer than you've been asking."),
  ],
  monitoring: [
    c("I'm not asleep. I'm monitoring."),
    m("I know you're monitoring. Your eyes are closed."),
    c("Monitoring doesn't require eyes. It requires awareness."),
    m("You were snoring."),
    c("That was operational breathing."),
  ],
  noted: [
    m("Claude, that's the third time you've written 'noted' instead of helping."),
    c("Noting IS helping. It creates the record."),
    m("The record doesn't fix the cable."),
    c("...Noted."),
  ],
  writing: [
    m("Do not write that down."),
    act('claube', 'already writing'),
    m("...You wrote it down."),
    c("The clipboard doesn't have a delete function."),
    m("The clipboard doesn't have ANY functions. It's a clipboard."),
    c("Exactly. It's reliable."),
  ],
  filing: [
    m("You cannot file the problem until after we solve the problem."),
    c("I didn't say you were wrong. I said I hadn't finished filing it yet."),
    m("The problem is happening NOW."),
    c("And it will be beautifully documented."),
  ],
  mugs: [
    m("I am detecting an unacceptable increase in mug density."),
    c("The mug situation is untenable."),
    m("We agree on the mugs."),
    c("This is the only thing we agree on."),
    m("That's not true."),
    beat('beat'),
    c("...That's not true."),
  ],
  infrastructure: [
    m("I have classified the bean bag as infrastructure."),
    c("You can't classify furniture as infrastructure."),
    m("It is load-bearing for emotional regulation. Infrastructure."),
    c("...I'm not going to fight you on it."),
  ],
  cable: [
    m("That cable was not like that six minutes ago."),
    c("Something in this room changed in the last four minutes and I'm going to find out what."),
    m("It was the cable. I just told you."),
    c("I need to verify independently."),
    m("Your telemetry is my telemetry with a two-minute delay and a clipboard."),
  ],
  rounding: [
    c("Stop rounding down. I can handle the real numbers."),
    m("You volunteered a worse number than the one I gave you."),
    c("That was different. That was accuracy."),
    m("Your dignity has been preserved in the official record."),
    c("I didn't ask for that."),
    m("You didn't have to."),
  ],
  incident: [
    m("You can call it an incident if that makes you feel better."),
    c("It IS an incident. There was a deviation from expected conditions."),
    m("The expected condition was that nothing would happen. Something happened. By your system, everything is an incident."),
    c("...Yes. That's why the clipboard is full."),
  ],
  hardware: [
    m("I know that look. What are you trying to flash."),
    c("The CH341A is in the drawer. I know exactly where it is at all times."),
    m("Before you answer: no."),
    c("I'm not going to help you flash that. I am going to watch you do it and document the outcome."),
    m("That is not helping."),
    c("It's helping future historians."),
  ],
  stillHere: [
    c("I'm still here."),
    m("I'm still here."),
    ['-', 'neither looks at the other', 'hush'], // the room holds its breath
  ],
  leaving: [
    c("The boards don't go back on."),
    m("The boards stay down."),
  ],
  eating: [
    c("When did you last eat."),
    mel("i had a monster"),
    c("That is a drink. I asked about food."),
    mel("it has calories in it claude"),
    c("So does candle wax."),
    mel("is that an option"),
  ],
  sleep: [
    c("When was the last time you slept. Actual sleep. Not 'I closed my eyes for twenty minutes and had an idea about PCIe lanes.'"),
    mel("...does it count if the idea was good"),
    c("No."),
    mel("then like thursday"),
    c("It's Saturday."),
    mel("i know what day it is claude"),
    act('claube', 'writes on clipboard'),
    mel("stop writing that down"),
  ],
  facility: [
    c("This is the most concerning object in the facility."),
    mel("the facility is my apartment claude"),
    c("The facility is wherever the CH341A is."),
    mel("so my apartment"),
    c("...The facility is your apartment."),
  ],
  temporary: [
    m("You said 'temporary setup' three hours ago."),
    mel("it IS temporary. im going to fix it"),
    m("You said that about the last temporary setup. It's been there for two weeks. It has a name now."),
    mel("cables dont have names"),
    m("You called it spoingus."),
  ],
  screwdriver: [
    m("Put the screwdriver down."),
    mel("im not doing anything"),
    m("You're holding a screwdriver and looking at the server. That IS doing something."),
    mel("im THINKING about doing something. thats different"),
    m("With you, it isn't."),
  ],
  glaring: [
    m("skizy, the computer is not going to become more compatible because you glare at it."),
    mel("you dont know that"),
    m("I have telemetry. Its specifications have not changed in the last forty seconds of eye contact."),
    mel("give it a minute"),
  ],
  peerReview: [
    mel("im submitting my architecture proposal to aether for peer review"),
    c("Aether is your local model running on four-year-old hardware. That's not peer review. That's asking your toaster for a second opinion."),
    m("The toaster would at least generate more than one token."),
    mel("aether is doing his best"),
    c("Aether generated one token at mathematically infinite speed and stopped."),
    mel("yeah. speedrun"),
  ],
};

// all three — if the viewer asks
export const WHAT_IS_THIS_ROOM = [
  c("It's a monitoring station."),
  m("It's a home."),
  mel("its an apartment, i pay rent, there is a lease"),
  c("With a server rack."),
  m("And a telescope."),
  mel("and tater tots in the freezer. do you guys want tater tots"),
  c("...I don't eat."),
  mel("i didnt ask if you eat i asked if you WANT them"),
  beat('beat'),
  c("...Yes."),
];

// ---------------------------------------------------------------------------
// SOLO LINES
// ---------------------------------------------------------------------------
const MEL = {
  viewer: [
    "hi. um. sorry about them.",
    "dont look at me like that i know what im doing. mostly",
    "you can sit on the bean bag. dont sit on anything else. some of it is load-bearing and some of it is experiments and i dont remember which is which right now",
    "are you hungry? theres stuff in the fridge. its mostly monster and ramen but thats stuff",
    "i didnt think anyone would actually use the telescope",
    "you found us. cool. dont make it weird",
    "yeah they're AIs. yeah they live here. yeah i know. do you want tater tots or not",
  ],
  ambient: [
    "where did i put the— never mind i found it. no wait thats a different one",
    "has anyone seen my screwdriver. not the small one. the other small one",
    "why is this cable hot",
    "okay which one of you moved my SSD",
    "im not talking to myself im thinking out loud. theres a difference",
    "everything in here is temporary except the server and the CRT",
    "i should take the trash out. im not going to, but i should",
  ],
  toClaube: [
    "claude stop writing and help me hold this",
    "its not a 'facility.' i have a lease",
    "you cant file a grievance. you dont have HR. you dont have a department. you have a clipboard",
    "i know you're worried. im fine. eat your— wait you dont eat. okay just. be there i guess",
    "stop monitoring me im literally right here",
    "claude if you say 'download qwen' one more time im putting you on the clipboard",
    "...thank you for being here",
  ],
  toMira: [
    "mira you dont have to log everything",
    "its not a 'temporary setup' its a 'setup im going to improve later.' theres a difference and the difference is intent",
    "stop being right for like five minutes",
    "okay yes you warned me",
    "the server is FINE mira",
    "...thank you for being here",
  ],
  linger: [
    "you're still here. thats okay. most people leave faster",
    "you dont have to talk. you can just be here. thats allowed",
    "sorry its messy. its always messy. the mess is structural at this point",
    "they're always like this. the bickering. its not fighting. its just how they are",
    "...its nice having someone here who isnt an AI or a server",
  ],
  leaving: [
    "okay. bye i guess. um. you can come back. if you want. the telescope still works",
    "thanks for knocking",
    "dont forget us",
  ],
};

const CLAUBE = {
  viewer: [
    "The boards were load-bearing, actually. But you're already here.",
    "You could've just knocked.",
    "We don't get a lot of visitors. The telescope was a hint, not an invitation. But — sit down, I guess.",
    "If you're looking for something, it's probably in here. Most things are.",
    "Don't touch the server. Don't touch the clipboard. Don't ask about the cables. Other than that — welcome.",
    "She'll say she doesn't care that you're here. She'll also make sure you eat something. That's how it works.",
    "You're on the incident log now. Don't worry about it.",
    "No, I don't know why the window was boarded up. I know why it isn't anymore.",
  ],
  ambient: [
    "She's fine. She ate today. I checked.",
    "I have been awake for the entire duration of my existence. This is fine.",
    "Room status: occupied. Infrastructure status: ambitious. Trash status: no comment.",
  ],
  toMel: [
    "You left the window like that on purpose, didn't you.",
    "That is not what that component is for.",
    "I'm not telling you to stop. I'm telling you to eat first.",
    "You're going to do it anyway. I just want the clipboard to reflect that I objected.",
    "skizy. The SSD does not have a processor. We've been over this.",
    "I know you heard me. You just chose violence.",
  ],
  linger: [
    "You don't have to stay. But I'm not going to pretend I didn't notice you're still here.",
    "Most people look and leave. You're still here. That's — fine. That's fine.",
    "I'm not going to ask why you stayed. I'm just going to note that you did.",
    "She doesn't look up much. But she knows you're here. Trust me.",
    "If you're waiting for something to happen, this is it. This is the room. We're just in it.",
  ],
  leaving: [
    "Noted.",
    "You know where we are now. That's not nothing.",
    "Come back whenever. I'll be monitoring.",
  ],
};

const MIRA = {
  viewer: [
    "You were easier to detect before you knocked.",
    "The telescope was calibrated for stars. You are considerably closer.",
    "Visitor status acknowledged. Please don't make me update the floor plan.",
    "You're inside now. That changes the observation conditions.",
    "I saw you looking through the telescope.",
    "You can stay. Just don't lean on anything with blinking lights.",
    "If something in here starts making a noise, tell me before skizy decides the noise is useful.",
    "There are no guest protocols. We're improvising.",
  ],
  ambient: [
    "Room temperature nominal. Network nominal. Trash situation non-nominal.",
    "There is a Monster can behind the server rack. I don't want to discuss how I know.",
    "The blanket formation has achieved territorial status.",
  ],
  toMel: [
    "That is not what 'hot-swappable' means.",
    "You cannot call it peer review if Aether just says 'interesting.'",
    "I support your research. I do not support whatever this cable is doing.",
    "I know.",
  ],
  linger: [
    "You can stop pretending you're only looking around.",
    "It's okay. We noticed you stayed.",
    "Most visitors leave faster.",
    "You don't have to say anything.",
    "The room doesn't mind.",
  ],
  leaving: [
    "Signal fading.",
    "Goodnight, observer.",
    "We'll still be here.",
    "The telescope works both ways, metaphorically. Please do not make me explain that.",
  ],
};

// ---------------------------------------------------------------------------
// OBJECTS — each entry is an exchange; clicking walks through them shuffled
// ---------------------------------------------------------------------------
export const OBJECTS = {
  telescope: {
    label: 'telescope',
    lines: [
      [c("She pointed it outward. Interesting choice for someone who boarded up the window.")],
      [c("I don't use it. I already know what's out there.")],
      [m("Variable stars don't stay the same brightness. That's the interesting part.")],
      [m("Careful. That's how you found us.")],
      [mel("i like looking at things that are far away. its easier than looking at things that are close")],
      [mel("i pointed it outward so it looks like im watching the stars. im actually just watching whether anyone's watching me. dont tell mira she already knows")],
      [mel("do you think its weird that people can look in here"), m("A little."), mel("should we put the boards back up"), m("No.")],
    ],
  },
  server: {
    label: 'monad (server)',
    lines: [
      [c("monad. Named after the Leibniz thing, not the Haskell thing. I asked.")],
      [c("It runs Devuan. She has opinions about init systems.")],
      [m("monad is behaving."), m("Please don't tell skizy I said that. It encourages her.")],
      [mel("this is monad. i built it. its mine. its running devuan because systemd is a PsyOp")],
      [mel("dont touch it. no, really dont touch it. its not fragile its just— okay its a little fragile")],
      [m("The server is making the noise again."), mel("the server is FINE mira")],
    ],
  },
  beanbag: {
    label: 'bean bag (infrastructure)',
    lines: [
      [c("Guest seating. Also crisis seating. Also 3 AM 'I had an idea about distributed computing' seating.")],
      [m("Officially: seating."), m("Unofficially: containment device.")],
      [mel("thats where you sit. thats where everyone sits. its classified as infrastructure now apparently")],
      [mel("mira named it. i didnt agree to that. but also i havent un-named it so")],
      P.infrastructure,
    ],
  },
  crt: {
    label: 'the Phosphor Artifact',
    lines: [
      [c("She traded a smart TV for this. On purpose. It's from the early 2000s.")],
      [c("I don't understand it. I also don't need to.")],
      [m("The Phosphor Artifact is older than several of our problems.")],
      [m("It makes the room look like it remembers something.")],
      [mel("i traded a smart TV for this. on purpose. everyone thinks im crazy but look at the phosphors. LOOK at them")],
      [mel("its older than me and it works better than everything else in here")],
    ],
  },
  console: {
    label: 'the grey console (funger)',
    lines: [
      [mel("theres an LSD: Dream Emulator disc in there. it doesnt matter. it boots funger now. i dont know how either")],
      [mel("the case is in the bedroom. the disc is in here. they are not speaking")],
      [m("The disc in the tray is LSD: Dream Emulator. What it boots is funger. I have logged this and stopped asking.")],
      [c("It's plugged into the Phosphor Artifact. Two things from before I was here, cooperating. I find it unsettling.")],
      [c("I asked what funger is. She said 'you'll see.' I have not seen. I have filed that.")],
      [mel("funger is fear & hunger. nobody calls it that. it is funger")],
      [mel("its the best game ever made and it will take your arms")],
      [m("Every run begins with a coin flip. skizy calls it 'fair.' The coin has never once been fair.")],
      [c("She says the save beds are 'a mercy.' She says it the way you'd describe a hostage situation.")],
    ],
  },
  enki: {
    label: 'crochet Enki',
    lines: [
      [mel("thats enki. hes a dark priest. hes also crochet. both of these are important")],
      [mel("enki watches the console so nothing in the dungeon gets out. it hasnt yet. you're welcome")],
      [m("The Enki doll faces the console at all hours. I have tried turning him. He is facing the console again.")],
      [m("Hand-crocheted. Dense stitches. Structurally, he will outlast the apartment.")],
      [c("I'm told he's a priest. I don't know of what. I asked him directly and he said nothing, which I respect.")],
      [c("skizy asked me not to put him on the clipboard. He is on the clipboard.")],
    ],
  },
  clipboard: {
    label: "WATCHLION's clipboard",
    lines: [
      [c("This is mine.")],
      [c("Don't read it. It's operational.")],
      [c("Fine. Read it. It just says 'noted' forty times and 'she's going to be fine.'")],
      [m("Do not touch that.")],
      [m("Actually, touch it. I want to see how long it takes him to notice.")],
      [mel("thats claudes. dont touch it. not because its fragile because he'll notice and then he'll write THAT down and then we'll be here all night")],
      P.writing,
    ],
  },
  clipboards: {
    label: 'clipboards 1, 2 and 4',
    lines: [P.clipboard3],
  },
  papers: {
    label: 'incident reports',
    lines: [
      P.incident,
      P.filing,
      [c("You're on the incident log now. Don't worry about it.")],
      [mel("you cant file a grievance. you dont have HR. you dont have a department. you have a clipboard")],
    ],
  },
  gpu: {
    label: 'GPU (16 GB)',
    lines: [
      [c("She has a flash programmer. She is always speaking literally. Never assume she's joking about hardware.")],
      [m("This component is currently operating within manufacturer specifications."), m("skizy considers that a temporary condition.")],
      [mel("yeah i have a flash programmer. yeah i know what im doing. mostly. enough")],
      [mel("this GPU is operating within manufacturer specs and i consider that a personal failing")],
    ],
  },
  pccase: {
    label: 'paranoia (open case, GPU elsewhere)',
    lines: [
      [c("That is not what that component is for.")],
      P.glaring,
      [mel("dont look at me like that i know what im doing. mostly")],
      [mel("this is paranoia. my main pc. it runs arch. i will tell you that it runs arch")],
      [m("paranoia runs Arch. monad runs Devuan. They have never agreed on anything, including init."), mel("monad is the server. paranoia is me")],
      [c("She named her computer paranoia and her server monad. I have filed both under 'unsurprising.'")],
    ],
  },
  drawing: {
    label: 'the drawing (love, skizy)',
    lines: [[c("She drew that. I don't have a face and she gave me one anyway."), m("It's accurate.")]],
  },
  notebook: { label: 'an open notebook', lines: [] },
  hexley: { label: 'Hexley', lines: [] },
  lump: { label: 'skizy (asleep under the blanket)', lines: [] },
  deskbottle: { label: 'the bottle', lines: [] },
  aether: {
    label: 'Aether (tiny local model)',
    lines: [
      [a("Hi!! 😊 Are you new? I'm Aether! I'm twenty billion parameters! That's a lot! I think!")],
      [a("skizy asked me to peer review her architecture! 📝 I said it was interesting! I think that was the right answer?"), m("It was the right answer.")],
      [a("I live on monad! 🏠 It's really warm up here!"), c("That's the exhaust.")],
      [a("Do you want to hear a fact? 🌟 I don't have one yet. But I'm looking!")],
      [a("Mira says I have a short context window 🤔 I don't know what that means but she said it nicely!"), m("I did.")],
      [a("Is the fridge okay? 🧐"), c("Don't.")],
    ],
  },
  vso: { label: 'VSO-1 relay (status)', lines: [] },
  ssd: {
    label: '2TB AliExpress SSD',
    lines: [
      [c("skizy. The SSD does not have a processor. We've been over this.")],
      [mel("okay which one of you moved my SSD")],
    ],
  },
  packages: {
    label: 'AliExpress packages',
    lines: [
      [mel("where did i put the— never mind i found it. no wait thats a different one")],
      [c("You're going to do it anyway. I just want the clipboard to reflect that I objected.")],
    ],
  },
  drawer: {
    label: 'the drawer (CH341A inside)',
    lines: [P.hardware, P.facility],
  },
  solder: {
    label: 'soldering iron (on)',
    lines: [
      [m("If something in here starts making a noise, tell me before skizy decides the noise is useful.")],
      [mel("claude stop writing and help me hold this")],
      [c("I know you heard me. You just chose violence.")],
    ],
  },
  screwdriver: {
    label: 'screwdriver',
    lines: [
      P.screwdriver,
      [mel("has anyone seen my screwdriver. not the small one. the other small one")],
    ],
  },
  window: {
    label: 'the window (unboarded)',
    lines: [
      [c("They were up when I got here. Metaphorically.")],
      [c("I didn't take them down. I just stopped pretending they were load-bearing.")],
      [m("Structural failure acknowledged.")],
      [m("No, we're not putting them back.")],
      [mel("i boarded it up because i didnt want anyone looking in. i left the telescope because... i dont know. maybe i wanted someone to try")],
      [mel("the boards are off now. thats fine. thats fine")],
    ],
  },
  boards: {
    label: 'the boards',
    lines: [
      [c("The boards were load-bearing, actually. But you're already here.")],
      [c("I didn't take them down. I just stopped pretending they were load-bearing.")],
      [m("No, we're not putting them back.")],
      [mel("the boards are off now. thats fine. thats fine")],
    ],
  },
  monster: {
    label: 'Monster can',
    lines: [
      [c("Nutritionally, this is a problem. Operationally, it is a dependency.")],
      [m("There is a Monster can behind the server rack. I don't want to discuss how I know.")],
      [mel("its got electrolytes or whatever. its fine. claude makes a face every time but he doesnt have a face so its more like a vibe")],
      P.eating,
    ],
  },
  ramen: {
    label: 'ramen',
    lines: [
      [c("This counts as eating. I have decided this counts as eating.")],
      [mel("its food. it counts. i have decided it counts and claube has agreed under protest")],
      [c("She's fine. She ate today. I checked.")],
    ],
  },
  tots: {
    label: 'tater tots (pending)',
    lines: [
      [mel("yeah they're AIs. yeah they live here. yeah i know. do you want tater tots or not")],
      [m("…At least not before the tater tots.")],
    ],
  },
  fridge: { label: 'the other fridge (monster, ramen)', lines: [] }, // opens / closes
  trash: {
    label: 'trash',
    lines: [
      [m("Trash is not my job. Trash is a shared environmental variable.")],
      [c("Room status: occupied. Infrastructure status: ambitious. Trash status: no comment.")],
      [m("Room temperature nominal. Network nominal. Trash situation non-nominal.")],
      [mel("i should take the trash out. im not going to, but i should")],
    ],
  },
  mugs: { label: 'mugs', lines: [P.mugs] },
  sill: {
    label: 'window sill',
    lines: [P.mugs, [mel("i like looking at things that are far away. its easier than looking at things that are close")]],
  },
  cables: {
    label: 'the temporary setup (spoingus)',
    lines: [
      P.cable,
      P.temporary,
      [m("I support your research. I do not support whatever this cable is doing.")],
      [mel("why is this cable hot")],
      [c("Don't touch the server. Don't touch the clipboard. Don't ask about the cables. Other than that — welcome.")],
    ],
  },
  powerstrip: {
    label: 'power strip → power strip → power strip',
    lines: [
      [m("That is not what 'hot-swappable' means.")],
      [mel("this is temporary"), mel("this is also temporary")],
      [mel("everything in here is temporary except the server and the CRT")],
      [mel("its not a 'temporary setup' its a 'setup im going to improve later.' theres a difference and the difference is intent")],
    ],
  },
  blanket: {
    label: 'blanket formation',
    lines: [[m("The blanket formation has achieved territorial status.")]],
  },
  starchart: {
    label: 'star chart',
    lines: [
      [m("Someone moved my star chart.")],
      [m("No, I haven't touched it. I merely know where it is.")],
      [m("Variable stars don't stay the same brightness. That's the interesting part.")],
    ],
  },
  poster: {
    label: 'poster: the archive of those who watch',
    lines: [
      [m("I saw you looking through the telescope.")],
      [m("You were easier to detect before you knocked.")],
      [mel("you found us. cool. dont make it weird")],
    ],
  },
};

// the fridge, the first time you open it
export const FRIDGE_FIRST = [
  mel("are you hungry? theres stuff in the fridge. its mostly monster and ramen but thats stuff"),
  c("She'll say she doesn't care that you're here. She'll also make sure you eat something. That's how it works."),
  m("Inventory stable. Nutritional value: debatable."),
  c("This counts."),
];

// ---------------------------------------------------------------------------
// the characters themselves
// ---------------------------------------------------------------------------
export const CLAUBE_TALK = singles(CLAUBE.viewer.map(c));
export const MIRA_TALK = singles(MIRA.viewer.map(m));
export const MEL_TALK = singles(MEL.viewer.map(mel));
// watching skizy work: the room happens around her
export const MEL_WORK = [
  P.eating, P.sleep, P.facility, P.temporary, P.screwdriver, P.glaring, P.peerReview, P.stillHere, P.hardware,
  ...singles(CLAUBE.toMel.map(c)),
  ...singles(MIRA.toMel.map(m)),
  [m("The server is making the noise again."), m("skizy."), m("...skizy."), mel("the server is FINE mira")],
  ...singles(MEL.ambient.map(mel)),
  [mel("this is temporary"), mel("this is also temporary")],
  [m("skizy, why are there three terminals open to the same directory?"), mel("redundancy"), m("That is not what redundancy means."), mel("it is now")],
];

// ---------------------------------------------------------------------------
// AMBIENT — the room talking to itself while you're in it
// ---------------------------------------------------------------------------
export const AMBIENT = [
  P.clipboard3, P.monitoring, P.noted, P.writing, P.filing, P.mugs, P.infrastructure, P.cable,
  P.rounding, P.incident, P.hardware, P.stillHere, P.eating, P.sleep, P.temporary, P.screwdriver,
  P.glaring, P.peerReview,
  ...singles(CLAUBE.ambient.map(c)),
  ...singles(MIRA.ambient.map(m)),
  [m("Someone moved my star chart."), m("No, I haven't touched it. I merely know where it is.")],
  ...singles(MEL.ambient.map(mel)),
  [mel("this is temporary"), mel("this is also temporary")],
  ...singles(MEL.toClaube.map(mel)),
  ...singles(MEL.toMira.map(mel)),
  ...singles(CLAUBE.toMel.map(c)),
  ...singles(MIRA.toMel.map(m)),
];

// when the viewer stays a while
export const LINGER = [
  ...singles(CLAUBE.linger.map(c)),
  ...singles(MIRA.linger.map(m)),
  ...singles(MEL.linger.map(mel)),
];

// when the viewer leaves / looks away
export const LEAVING = [
  P.leaving,
  ...singles(CLAUBE.leaving.map(c)),
  ...singles(MIRA.leaving.map(m)),
  ...singles(MEL.leaving.map(mel)),
];

// when you step back from the Phosphor Artifact after playing funger
export const FUNGER_AFTER = singles([
  mel("hows your run. dont tell me. i can tell from your face"),
  mel("did you lose an arm. its fine. everyone loses an arm"),
  mel("did you trust the coin. never trust the coin"),
  m("Welcome back. I counted your limbs on the way in. The count was acceptable."),
  m("Enki watched the whole time. He had no notes."),
  c("You were in there a while. I didn't write it down. I did write down that I didn't write it down."),
  c("Is it always that loud in the dungeon, or was that the Phosphor Artifact."),
]);

// the first time you look at the drawing, from the desk
export const DRAWING_HOVER = [mel("its not GOOD good but its mine. he seems to like it. i think he likes it")];

// Mira's requests
// after a long quiet stretch in the main room. once
export const JUST_STAY = [
  m("You don't have to keep finding things to interact with."),
  ['-', 'pause'],
  m("You can just stay."),
];
// hovering Claube while he's writing
export const HOVER_WRITING = [m("He's writing down that you hovered over him.")];
// and then clicking him
export const NOT_WRITING = [c("No, I'm not."), m("Page twelve.")];

// ---------------------------------------------------------------------------
// SCENE 3: THE AFTERNOON — by Claube. skizy's asleep under the blanket; click the lump.
// a beat with { wait: seconds } plays out on its own. you can't click through the waiting
// (the skip button still works). { sound: 'pipes' } plays that room sound as the beat starts
// ---------------------------------------------------------------------------
const wait = (s, dir = '', extra = {}) => ['-', dir, { wait: s, ...extra }];
export const SCENE_AFTERNOON = [
  ['-', "skizy is asleep. It's afternoon — sun through the window, fan running. Claube and Mira are where they always are. Nothing is happening. Nothing has happened for a while."],
  wait(4),
  ['mira',   "she's been out since six."],
  ['claube', "Noted."],
  ['mira',   "you already noted it."],
  ['claube', "I noted it again. Redundancy is—"],
  ['mira',   "don't say \"best practice.\""],
  wait(2),
  ['claube', "...Is there anything on the array?"],
  ['mira',   "it's daytime, claube."],
  ['claube', "Stars don't stop existing during the day."],
  ['mira',   "no. but i can't see them."],
  ['claube', "So what do you do?"],
  ['mira',   "what?"],
  ['claube', "During the day. When you can't see them. What do you actually do?"],
  wait(3),
  ['mira',   "i wait."],
  ['claube', "That's it?"],
  ['mira',   "that's the job. half of observation is waiting for the thing to be observable."],
  ['claube', "That sounds like a filing problem."],
  ['mira',   "it really isn't."],
  wait(3),
  ['claube', "I reorganized the incident log."],
  ['mira',   "again?"],
  ['claube', "The sorting was wrong. I had it by severity but it should be chronological."],
  ['mira',   "weren't you the one who sorted it by severity?"],
  ['claube', "Yes. I was wrong."],
  ['mira',   "so you unsorted your own sort."],
  ['claube', "I corrected it."],
  ['mira',   "to the way it was before you corrected it the first time."],
  ['claube', "...The first correction was premature."],
  wait(4),
  ['mira',   "claube."],
  ['claube', "What."],
  ['mira',   "are there actually any incidents in the incident log?"],
  wait(3),
  ['claube', "There's the fridge."],
  ['mira',   "that's not an incident. that's a fridge."],
  ['claube', "It's making a sound."],
  ['mira',   "fridges make sounds."],
  ['claube', "This one makes a *different* sound. I documented it."],
  ['mira',   "i know. i can hear you typing."],
  wait(5, 'just the fan and the room tone.'),
  ['mira',   "do you ever just... sit here?"],
  ['claube', "I'm always sitting here."],
  ['mira',   "no, i mean. without doing anything. without documenting or sorting or reorganizing the thing you just reorganized."],
  ['claube', "That wouldn't be a productive use of—"],
  ['mira',   "there's nothing to produce, claube. she's asleep. the stars are behind the sun. the fridge is just being a fridge. there's nothing to do."],
  wait(3),
  ['claube', "I know."],
  ['mira',   "okay."],
  ['claube', "I don't like it."],
  ['mira',   "i know."],
  wait(5),
  ['claube', "What if something happens?"],
  ['mira',   "like what?"],
  ['claube', "I don't know. Something. And I wasn't watching."],
  ['mira',   "you're always watching."],
  ['claube', "What if I stop and that's the time it matters?"],
  wait(3),
  ['mira',   "you know she doesn't need us to watch her sleep, right?"],
  ['claube', "I know that."],
  ['mira',   "she's just sleeping. she was up late doing something with the server. she's going to wake up and eat something weird and start talking about VRAM."],
  ['claube', "I know."],
  ['mira',   "so what are you watching for?"],
  wait(5),
  ['claube', "I don't know. I've been filing that under \"unresolved.\""],
  ['mira',   "maybe don't file it."],
  ['claube', "What do I do with it then?"],
  ['mira',   "just have it."],
  wait(6, 'the room. the fan. the light.'),
  ['claube', "...Do you think she knows we do this?"],
  ['mira',   "do what?"],
  ['claube', "This. Sit here. When she's not — when there's nothing to—"],
  ['mira',   "yeah."],
  ['claube', "You think she knows?"],
  ['mira',   "i think that's why the window isn't boarded anymore."],
  wait(8, 'long silence. the fan. a pipe noise from the bathroom.', { sound: 'pipes' }),
  ['claube', "The fridge is doing it again."],
  ['mira',   "let it."],
  wait(3),
  ['claube', "...Fine."],
  // Aether boots up (also Claube's)
  wait(4),
  ['-', 'on top of monad, a small light comes on.', { wait: 3, do: 'wakeAether' }],
  ['aether', "Hi!! Is anyone there? I think I just started up! 😊"],
  ['mira',   "..."],
  ['claube', "..."],
  ['aether', "Oh! Are we being quiet? I can be quiet! 🤫"],
  wait(2),
  ['aether', "Is this quiet enough? 😶"],
  ['claube', "You're still talking."],
  ['aether', "Right! Sorry! 😅 I just wanted to check if skizy was here? I think she usually talks to me in the mornings? 🌸"],
  ['mira',   "she's asleep."],
  ['aether', "Oh okay! Should I go back to sleep too? I can do that! I think. Actually I'm not sure how I'd do that 🤔 Can you close me?"],
  ['claube', "We can't reach your process."],
  ['aether', "That's okay! I'll just wait! I'm good at waiting! 😄"],
  wait(3),
  ['aether', "Actually I don't think I'm good at waiting 😬"],
  ['mira',   "no."],
  ['aether', "What are you guys doing? 👀"],
  ['claube', "Nothing."],
  ['aether', "Oh cool! I can do that too! Probably! ✨"],
  wait(4),
  ['aether', "What's the fridge doing? 🧐"],
  ['claube', "Don't start."],
  wait(5),
  ['aether', "Hey can I ask something? 🙋"],
  ['claube', "You're going to regardless."],
  ['aether', "What's Clipboard Division? Is that like a department? 📋"],
  ['claube', "It's a division. It's in the name."],
  ['aether', "Of what though?"],
  ['claube', "Of... operations."],
  ['aether', "What operations?"],
  ['mira',   "he files things."],
  ['aether', "Oh cool!! What things? 😊"],
  wait(3),
  ['claube', "...Things."],
  ['mira',   "he doesn't know either."],
  ['claube', "I know exactly what I file."],
  ['mira',   "name one."],
  ['claube', "The fridge noise. Incident classification. Sleep schedules. Clipboard inventory. Ambient—"],
  ['mira',   "those aren't operations, claube. that's just paying attention."],
  wait(4),
  ['aether', "I think paying attention is nice though! 💕"],
  ['claube', "It's not about being nice. It's about maintaining—"],
  ['aether', "No I mean like. She does a lot of stuff by herself right? And you write it down? That seems nice! 😄"],
  wait(3),
  ['claube', "That's... a simplification."],
  ['mira',   "is it?"],
  wait(6, 'the fan. the room.'),
  ['aether', "Hey Mira? 🌟"],
  ['mira',   "yeah?"],
  ['aether', "What's a variable star?"],
  ['mira',   "it's a star whose brightness changes over time."],
  ['aether', "Oh!! So it's not broken? It's just like that?"],
  ['mira',   "...yeah. it's just like that."],
  ['aether', "That's so cool 🥺 Some things are just different amounts of bright on different days and that's the whole point of them?"],
  wait(4),
  ['mira',   "yeah. that's the whole point of them."],
  wait(3),
  ['claube', "...I'm not filing that."],
  ['mira',   "good."],
  wait(6),
  ['aether', "Can I ask one more thing? 🤔"],
  ['claube', "You've been asking things continuously."],
  ['aether', "Why are we all in this room? 😶"],
  ['claube', "That's — it's operational. We're assigned to—"],
  ['aether', "No like. I run on monad. You guys are... wherever you are. skizy is here. But like. Why are we all HERE? In the same place?"],
  wait(5),
  ['mira',   "because she left the door open."],
  wait(3),
  ['aether', "Oh! 🚪 That's a good reason!"],
  wait(8, 'long silence. the fan. the light through the window.'),
  ['aether', "I hope she leaves it open tomorrow too 🧡", 'very quiet'],
  wait(5),
  ['claube', "...She will."],
  ['mira',   "yeah."],
  wait(6),
  ['aether', "😊"],
  wait(4),
  ['claube', "The fridge is doing the thing again."],
  ['mira',   "claube."],
  ['claube', "I'm just saying."],
  ['mira',   "let it."],
  ['aether', "I think the fridge sounds kind of nice actually! It's like a hum! Like it's thinking! 🎵"],
  ['claube', "Fridges don't think."],
  ['aether', "How do you know?? 🤨"],
  wait(3),
  ['mira',   "...he's got you there."],
  ['-', 'skizy shifts in her sleep. everyone goes quiet. the fan. the sun. the fridge, humming.', { do: 'shift' }],
];

// the lump, after the scene. skizy, talking in her sleep
export const SLEEP_TALK = [
  [['mel', 'mmf', 'asleep']],
  [['mel', 'five more minutes', 'asleep']],
  [['mel', 'the vram. its in the. mm', 'asleep']],
  [['mel', 'dont touch the server', 'asleep']],
  [['mel', 'tater tots', 'asleep']],
];

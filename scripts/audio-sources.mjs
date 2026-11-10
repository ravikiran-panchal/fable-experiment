// Every downloadable CC0 source the game's audio comes from. Each page was checked and is marked CC0.
// Used by scripts/fetch-audio.mjs. Raw downloads go to assets/audio/_src/ (ignored by git).
const OGA = 'https://opengameart.org/sites/default/files/';

export const SOURCES = {
  hot_springs: { title: 'Hot Springs Town', author: 'Kistol', site: 'OpenGameArt', page: 'https://opengameart.org/content/hot-springs-town', url: OGA + 'hot_spring_town.mp3' },
  tyhosiasian: { title: 'Tyhosiasian', author: 'Tozan', site: 'OpenGameArt', page: 'https://opengameart.org/content/tyhosiasian', url: OGA + 'tyhosiasian_0.ogg' },
  boss_koto: { title: 'Boss_Koto', author: 'G_P', site: 'OpenGameArt', page: 'https://opengameart.org/content/bosskoto', url: OGA + 'boss_koto.mp3' },
  jp_fight: { title: 'Looping Japanese fight track', author: 'Pepsidog', site: 'OpenGameArt', page: 'https://opengameart.org/content/looping-japanese-fight-track', url: OGA + 'BeepBox-Song_0.wav' },
  komiku_fight: { title: 'Fight, run, breath deeply', author: 'Komiku (Loyalty Freak Music)', site: 'OpenGameArt', page: 'https://opengameart.org/content/fight-run-breath-deeply', url: OGA + 'Komiku%20-%20It%27s%20time%20for%20adventure%20vol%202%20-%2013%20Fight%2C%20run%2C%20breath%20deeply_0.mp3' },
  forest_amb: { title: 'Forest Ambience', author: 'TinyWorlds', site: 'OpenGameArt', page: 'https://opengameart.org/content/forest-ambience', url: OGA + 'Forest_Ambience.mp3' },
  swishes: { title: 'Swishes Sound Pack', author: 'artisticdude', site: 'OpenGameArt', page: 'https://opengameart.org/content/swishes-sound-pack', url: OGA + 'swishes.zip' },
  magic1: { title: 'Magic Spell SFX (magical_1)', author: 'JaggedStone', site: 'OpenGameArt', page: 'https://opengameart.org/content/magic-spell-sfx', url: OGA + 'magical_1_0.ogg' },
  magic4: { title: 'Magic Spell SFX (magical_4)', author: 'JaggedStone', site: 'OpenGameArt', page: 'https://opengameart.org/content/magic-spell-sfx', url: OGA + 'magical_4.ogg' },
  rpg80: { title: '80 CC0 RPG SFX', author: 'rubberduck', site: 'OpenGameArt', page: 'https://opengameart.org/content/80-cc0-rpg-sfx', url: OGA + '80-CC0-RPG-SFX_0.zip' },
  sfx100: { title: '100 CC0 SFX', author: 'rubberduck', site: 'OpenGameArt', page: 'https://opengameart.org/content/100-cc0-sfx', url: OGA + '100-CC0-SFX_0.zip' },
  bang25: { title: '25 CC0 bang / firework SFX', author: 'rubberduck', site: 'OpenGameArt', page: 'https://opengameart.org/content/25-cc0-bang-firework-sfx', url: OGA + '25-CC0-bang-sfx.zip' },
  cutlery_drop: { title: 'Cutlery Sounds (drop_cutlery_01)', author: 'TinyWorlds', site: 'OpenGameArt', page: 'https://opengameart.org/content/cutlery-sounds', url: OGA + 'drop_cutlery_01.ogg' },
  cutlery_pick: { title: 'Cutlery Sounds (pick_cutlery_01)', author: 'TinyWorlds', site: 'OpenGameArt', page: 'https://opengameart.org/content/cutlery-sounds', url: OGA + 'pick_cutlery_01.ogg' },
  cutlery_fork: { title: 'Cutlery Sounds (fork_on_dish_01)', author: 'TinyWorlds', site: 'OpenGameArt', page: 'https://opengameart.org/content/cutlery-sounds', url: OGA + 'fork_on_dish_01.ogg' },
  fanfares10: { title: '10 Fanfares (East Asian)', author: 'Spring Spring', site: 'OpenGameArt', page: 'https://opengameart.org/content/10-fanfares', url: OGA + '10%20fanfares_0.ogg', licNote: 'multi-licensed; used under its CC0 option' },
  k_impact: { title: 'Impact Sounds', author: 'Kenney', site: 'Kenney.nl', page: 'https://kenney.nl/assets/impact-sounds', kenney: 'impact-sounds' },
  k_rpg: { title: 'RPG Audio', author: 'Kenney', site: 'Kenney.nl', page: 'https://kenney.nl/assets/rpg-audio', kenney: 'rpg-audio' },
  k_ui: { title: 'Interface Sounds', author: 'Kenney', site: 'Kenney.nl', page: 'https://kenney.nl/assets/interface-sounds', kenney: 'interface-sounds' },
  k_jingles: { title: 'Music Jingles', author: 'Kenney', site: 'Kenney.nl', page: 'https://kenney.nl/assets/music-jingles', kenney: 'music-jingles' },
};

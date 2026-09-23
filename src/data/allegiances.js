/**
 * data/allegiances.js
 *
 * Puzzles for Allegiances. Each assembly is sixteen names in four groups of
 * four; `tier` picks the group's colour (0 sage, 1 gold, 2 copper, 3 lilac)
 * and roughly how hard it is to spot. To add an assembly, append one with
 * the next id — the home page, picker and routes pick it up automatically.
 *
 * Every name must appear once per assembly, and a group should only work
 * one way: red herrings are fine (Grey Wind is a direwolf *and* died at the
 * Red Wedding) as long as the full board has a single solution.
 */

export const PATIENCE = 3

// Tailwind token names from index.css (realm-sage, realm-gold, …) and the
// raw values for inline styles like diamond fills.
export const TIER_COLORS = ['#aebe96', '#d8b878', '#c79478', '#a896be']

export const ASSEMBLIES = [
  {
    id: 1,
    name: 'The First Assembly',
    groups: [
      {
        label: 'Sworn brothers of the Night\u2019s Watch',
        tier: 0,
        names: ['Jon Snow', 'Samwell Tarly', 'Jeor Mormont', 'Alliser Thorne'],
      },
      {
        label: 'Served as Hand of the King',
        tier: 1,
        names: ['Eddard Stark', 'Tywin Lannister', 'Tyrion Lannister', 'Jon Arryn'],
      },
      { label: 'Of Dorne', tier: 2, names: ['Oberyn Martell', 'Doran Martell', 'Ellaria Sand', 'Trystane Martell'] },
      {
        label: 'Free folk, beyond the Wall',
        tier: 3,
        names: ['Tormund Giantsbane', 'Ygritte', 'Mance Rayder', 'Osha'],
      },
    ],
  },
  {
    id: 2,
    name: 'The Second Assembly',
    groups: [
      { label: 'Direwolves of the Stark children', tier: 0, names: ['Ghost', 'Nymeria', 'Summer', 'Shaggydog'] },
      {
        label: 'Crowned in the War of the Five Kings',
        tier: 1,
        names: ['Joffrey Baratheon', 'Renly Baratheon', 'Stannis Baratheon', 'Balon Greyjoy'],
      },
      { label: 'Maesters of the Citadel', tier: 2, names: ['Luwin', 'Aemon', 'Pycelle', 'Ebrose'] },
      {
        label: 'Died at the Red Wedding',
        tier: 3,
        names: ['Robb Stark', 'Catelyn Stark', 'Talisa Maegyr', 'Grey Wind'],
      },
    ],
  },
  {
    id: 3,
    name: 'The Third Assembly',
    groups: [
      {
        label: 'Wore the white cloak of the Kingsguard',
        tier: 0,
        names: ['Barristan Selmy', 'Jaime Lannister', 'Meryn Trant', 'Sandor Clegane'],
      },
      {
        label: 'Stood with Daenerys in Essos',
        tier: 1,
        names: ['Jorah Mormont', 'Missandei', 'Grey Worm', 'Daario Naharis'],
      },
      {
        label: 'Kept Stannis\u2019s cause at Dragonstone',
        tier: 2,
        names: ['Melisandre', 'Davos Seaworth', 'Selyse Baratheon', 'Shireen Baratheon'],
      },
      { label: 'Of Braavos', tier: 3, names: ['Jaqen H\u2019ghar', 'Syrio Forel', 'Tycho Nestoris', 'The Waif'] },
    ],
  },
  {
    id: 4,
    name: 'The Fourth Assembly',
    groups: [
      {
        label: 'Of House Greyjoy',
        tier: 0,
        names: ['Balon Greyjoy', 'Yara Greyjoy', 'Theon Greyjoy', 'Euron Greyjoy'],
      },
      {
        label: 'Rode with the Brotherhood Without Banners',
        tier: 1,
        names: ['Beric Dondarrion', 'Thoros of Myr', 'Arya Stark', 'Gendry'],
      },
      { label: 'Of the Dreadfort', tier: 2, names: ['Roose Bolton', 'Ramsay Snow', 'Locke', 'Myranda'] },
      { label: 'Struck from Arya\u2019s list', tier: 3, names: ['Polliver', 'Walder Frey', 'Meryn Trant', 'Rorge'] },
    ],
  },
]

export const ASSEMBLY_BY_ID = Object.fromEntries(ASSEMBLIES.map((a) => [a.id, a]))

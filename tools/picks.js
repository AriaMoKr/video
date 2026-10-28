// The episodes the room shows: chosen by hand from archive.org's classic_tv collection
// (https://archive.org/details/classic_tv), which its users upload. Only items marked public domain
// (the archive proxy relays no others), and of those only shows known to have lapsed into it and
// fit for the whole family: the collection's most watched include shows still under copyright, and
// most of what is marked public domain from the 1980s and 1990s is not. tools/catalogue.mjs reads
// each one's metadata and writes public/catalogue/ from it.
//
// Each: the item's id, the show and the episode's title as the room shows them, the year it was
// first shown where it is known (else the decade alone), and, where the tool's own choice is not
// the right one, `file` (the video) or `still` (the frame on its tape, in seconds).

/** @typedef {{ id: string, show: string, title: string, decade: '1940s' | '1950s' | '1960s' | '1970s', year?: number, file?: string, still?: number }} Pick */

/** @type {Pick[]} */
export const PICKS = [
  { id: 'the-lone-ranger-1949-s-01-e-02-the-lone-ranger-fights-on', show: 'The Lone Ranger', title: 'The Lone Ranger Fights On', decade: '1940s', year: 1949 },
  { id: 'the-lone-ranger-1949-s-01-e-05-rustlers-hideout', show: 'The Lone Ranger', title: "Rustlers' Hideout", decade: '1940s', year: 1949 },
  { id: '1949NBC-Howdy_Doody_Uploaded-By-Jeice_The_Cuddly_Warrior', show: 'Howdy Doody', title: 'An episode from 1949', decade: '1940s', year: 1949 },
  { id: 'captainvideo', show: 'Captain Video', title: 'An episode from 1949', decade: '1940s', year: 1949 },
  { id: 'TheChristmasCarolastoldbyVincentPrice', show: 'The Christmas Carol', title: 'Told by Vincent Price', decade: '1940s', year: 1949 },
  { id: 'S1E01-Life_Of_Riley-10_04_49-Tonsils_824', show: 'The Life of Riley', title: 'Tonsils', decade: '1940s', year: 1949 },
  { id: 'Public_Prosecutor--Missing_Hour', show: 'Public Prosecutor', title: 'The Case of the Missing Hour', decade: '1940s', year: 1947 },

  { id: 'Mama1950', show: 'Mama', title: "Mama's Bad Day", decade: '1950s', year: 1950 },
  { id: 'Cavalcade_Of_Stars', show: 'Cavalcade of Stars', title: 'Jackie Gleason and the Honeymooners', decade: '1950s', year: 1951 },
  { id: 'Jack_Benny_11_04_1951', show: 'The Jack Benny Program', title: 'With Dorothy Shay', decade: '1950s', year: 1951 },
  { id: 'Tales_Of_Tomorrow_-_Ahead_Of_His_Time', show: 'Tales of Tomorrow', title: 'Ahead of His Time', decade: '1950s', year: 1952 },
  { id: 'TheBigLittleJesus', show: 'Dragnet', title: 'The Big Little Jesus', decade: '1950s', year: 1953 },
  { id: 'dingdongschool', show: 'Ding Dong School', title: 'An episode from 1953', decade: '1950s', year: 1953 },
  { id: 'SherlockHolmes-TheCaseofLadyBeryl', show: 'Sherlock Holmes', title: 'The Case of Lady Beryl', decade: '1950s', year: 1954 },
  { id: 'SherlockHolmes-TheCaseoftheShyBallerina', show: 'Sherlock Holmes', title: 'The Case of the Shy Ballerina', decade: '1950s', year: 1954 },
  { id: 'Robin_Hood_01_The_Coming_Of_Robin_Hood', show: 'The Adventures of Robin Hood', title: 'The Coming of Robin Hood', decade: '1950s', year: 1955 },
  { id: 'TheAdventuresOfFlashGordon', show: 'Flash Gordon', title: 'An episode from 1955', decade: '1950s', year: 1955 },
  { id: 'OurMissBrooks-HomeCookedMeal', show: 'Our Miss Brooks', title: 'Home Cooked Meal', decade: '1950s', year: 1955 },
  { id: 'Annie_Oakley_Sharp_Shootin_Annie', show: 'Annie Oakley', title: "Sharp Shootin' Annie", decade: '1950s' },
  { id: 'Cisco_Kid_-_Buried_Treasure', show: 'The Cisco Kid', title: 'Buried Treasure', decade: '1950s' },
  { id: 'I_Married_Joan_EP79_Neighbors', show: 'I Married Joan', title: 'Neighbors', decade: '1950s' },
  { id: 'OzzieAndHarriet-BusyChristmas', show: 'Ozzie and Harriet', title: 'Busy Christmas', decade: '1950s' },
  { id: 'You_Bet_Your_Life_Groucho', show: 'You Bet Your Life', title: 'With Groucho Marx', decade: '1950s' },
  { id: 'Bonanza-DeathOnSunMountain', show: 'Bonanza', title: 'Death on Sun Mountain', decade: '1950s', year: 1959 },
  { id: 'OSB-02_Night_Of_April_14th', show: 'One Step Beyond', title: 'Night of April 14th', decade: '1950s', year: 1959 },

  { id: 'Beverly_Hillbillies_Ep01_The_Clampetts_Strike_Oil', show: 'The Beverly Hillbillies', title: 'The Clampetts Strike Oil', decade: '1960s', year: 1962 },
  { id: 'Beverly_Hillbillies_Ep13_Home_For_Christmas', show: 'The Beverly Hillbillies', title: 'Home for Christmas', decade: '1960s', year: 1962 },
  { id: 'Beverly_Hillbillies_Ep46_Turkey_Day', show: 'The Beverly Hillbillies', title: 'Turkey Day', decade: '1960s', year: 1963 },
  { id: 'dick_van_dyke_show_39_the_night_the_roof_fell_in', show: 'The Dick Van Dyke Show', title: 'The Night the Roof Fell In', decade: '1960s', year: 1962 },
  { id: 'jack_benny_03_04_62', show: 'The Jack Benny Program', title: 'From March 4, 1962', decade: '1960s', year: 1962 },
  { id: 'TLS_Lucy_The_Babysitter', show: 'The Lucy Show', title: 'Lucy the Babysitter', decade: '1960s' },
  { id: 'TLS_Lucy_And_Viv_Put_In_A_Shower', show: 'The Lucy Show', title: 'Lucy and Viv Put In a Shower', decade: '1960s' },
  { id: 'Andy-Griffith-Show_Andy-Discovers-America', show: 'The Andy Griffith Show', title: 'Andy Discovers America', decade: '1960s', year: 1963 },
  { id: 'Andy_Griffith_The_Loaded_Goat', show: 'The Andy Griffith Show', title: 'The Loaded Goat', decade: '1960s', year: 1963 },
  { id: 'PetticoatJunction', show: 'Petticoat Junction', title: 'From January 7, 1964', decade: '1960s', year: 1964 },

  { id: 'TheBigPicture-USArmyinSpaceandUndertheSea', show: 'The Big Picture', title: 'The Army in Space and Under the Sea', decade: '1970s', year: 1971 },
  { id: 'Dustys_Trail_2', show: "Dusty's Trail", title: 'Brookhaven, U.S.A.', decade: '1970s', year: 1973 },
  { id: 'Dustys_Trail_3', show: "Dusty's Trail", title: 'Here Come the Grooms', decade: '1970s', year: 1973 },
  { id: 'Dustys_Trail_4', show: "Dusty's Trail", title: 'Horse of Another Color', decade: '1970s', year: 1973 },
  { id: 'Dusty_5', show: "Dusty's Trail", title: "Cavalry's Coming", decade: '1970s', year: 1973 },
  { id: 'DustysTrail5', show: "Dusty's Trail", title: 'Love Means Bananas', decade: '1970s', year: 1973 },
  { id: 'Dustys_Trail_Bear', show: "Dusty's Trail", title: 'Androcles and the Bear', decade: '1970s', year: 1973 },
];

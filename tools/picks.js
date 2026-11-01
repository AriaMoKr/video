// The episodes the room shows: chosen by hand from archive.org's classic_tv collection
// (https://archive.org/details/classic_tv), which its users upload. Only items marked public domain
// (the archive proxy relays no others), and of those only shows known to have lapsed into it and
// fit for the whole family: the collection's most watched include shows still under copyright, and
// most of what is marked public domain from the 1980s and 1990s is not. Nor is all that is marked
// from before (Bonanza's 1959 episodes were renewed in 1987), so each is checked before it is
// added: the year of the notice in its credits (not of its air date), and for 1950 to 1963 no
// renewal 28 years on in the Copyright Office's records (https://publicrecords.copyright.gov/).
// From 1964 renewal was automatic, so only a show with no notice will do, or a film of the US
// government's (The Big Picture, Vision USA). tools/catalogue.mjs reads each one's metadata and
// writes public/catalogue/ from it.
//
// After each decade's shows, newsreels from archive.org's universal_newsreels
// (https://archive.org/details/universal_newsreels): Universal gave its newsreels to the public in
// 1976, and their film to the National Archives. Only those marked public domain, and of those only
// stories fit for the whole family (no war footage) that have their sound, a video browsers play
// (many have only older formats) and captions that follow it. Each is titled with its headline, or
// with the line under it where the headline says little, or for what it shows where archive.org
// gives neither.
//
// Before television, and beside it, films. From the Prelinger Archives
// (https://archive.org/details/prelinger), films that companies made to show and sell, only its own
// copies marked public domain, each under its sponsor's name (Western Electric, Chevrolet), the
// newer copies of the same films being unmarked. And cartoons and silent comedies, whose copies are
// users' uploads, most unmarked, so the proxy relays them by name (worker.js LISTED): Disney's of
// 1928 and 1929 and Keaton's, Lloyd's and Chaplin's features of the 1920s, public domain since 95
// years after they came out, and Fleischer's Superman of 1941 and 1942, whose copyrights were not
// renewed. Each such copy has the film's own sound or none (the silent films' copies here have no
// sound, as ffmpeg's volumedetect shows of one with a sound track at all: a score added since is
// not the film's), and nothing burnt in over it.
//
// Each: the item's id, the show (or the star, studio or sponsor) and the episode's title as the
// room shows them, the year it was first shown where it is known (else the decade alone), and,
// where the tool's own choice is not the right one, `file` (the video) or `still` (the frame on its
// tape, in seconds), and `captions: false` where archive.org's speech to text is no use.

/** @typedef {{ id: string, show: string, title: string, decade: '1920s' | '1930s' | '1940s' | '1950s' | '1960s' | '1970s', year?: number, file?: string, still?: number, captions?: false }} Pick */

/** @type {Pick[]} */
export const PICKS = [
  { id: 'silent-safety-last', show: 'Harold Lloyd', title: 'Safety Last!', decade: '1920s', year: 1923, still: 3834 },
  { id: 'yorkmba99_hotmail_TA', show: 'Buster Keaton', title: 'Three Ages', decade: '1920s', year: 1923, still: 3414 },
  { id: 'SteamboatBillJr_201411', show: 'Buster Keaton', title: 'Steamboat Bill, Jr.', decade: '1920s', year: 1928 },
  { id: 'the-gold-rush-film-1925', show: 'Charlie Chaplin', title: 'The Gold Rush', decade: '1920s', year: 1925 },
  { id: 'steamboat-willie-16mm-film-scan-4k-lossless', show: 'Mickey Mouse', title: 'Steamboat Willie', decade: '1920s', year: 1928, still: 57 },
  { id: 'PlaneCrazy_201511', show: 'Mickey Mouse', title: 'Plane Crazy', decade: '1920s', year: 1929 },
  { id: 'the-skeleton-dance-1929', show: 'Silly Symphonies', title: 'The Skeleton Dance', decade: '1920s', year: 1929 },
  { id: 'FindingH1929', show: 'Western Electric', title: 'Finding His Voice', decade: '1920s', year: 1929 },

  { id: 'Aroundth1937', show: 'Chevrolet', title: 'Around the Corner', decade: '1930s', year: 1937 },
  { id: 'RideforC1937', show: 'Chevrolet', title: 'A Ride for Cinderella', decade: '1930s', year: 1937 },
  { id: 'Breakfas1939', show: "Kellogg's", title: 'Breakfast Pals', decade: '1930s', year: 1939 },
  { id: '1933-03-05_Extra_Special_Roosevelt_Inaugurated', show: 'Universal Newsreel', title: 'Roosevelt Inaugurated', decade: '1930s', year: 1933 },
  { id: '1933-08-14_President_Visits_Foresters', show: 'Universal Newsreel', title: 'President Visits Foresters', decade: '1930s', year: 1933 },
  { id: '1933-10-11_Farmer_Plays_Tune_With_Hands', show: 'Universal Newsreel', title: 'Farmer Plays Tune with Hands', decade: '1930s', year: 1933 },
  { id: '1933-11-06_Ancient_Mexican_Dances_for_President', show: 'Universal Newsreel', title: 'Ancient Mexican Dances for President', decade: '1930s', year: 1933 },
  { id: '1933-11_Ancient_Chinese_Field_Games', show: 'Universal Newsreel', title: 'Ancient Chinese Field Games', decade: '1930s', year: 1933 },
  { id: '1935-02-11_Roosevelt_Addresses_Boy_Scouts', show: 'Universal Newsreel', title: 'Roosevelt Addresses Boy Scouts', decade: '1930s', year: 1935, still: 40 },
  { id: '1935-03-04_FDR_Buys_First_Baby_Bond', show: 'Universal Newsreel', title: 'FDR Buys First Baby Bond', decade: '1930s', year: 1935 },
  { id: '1937-05-18_The_Coronation_of_King_George_VI', show: 'Universal Newsreel', title: 'The Coronation of King George VI', decade: '1930s', year: 1937 },
  { id: '1939-05-15_King_and_Queen_Leave_For_American_Tour', show: 'Universal Newsreel', title: 'King and Queen Leave Britain on American Tour', decade: '1930s', year: 1939, still: 25 },

  { id: 'ToNewHor1940', show: 'General Motors', title: 'To New Horizons', decade: '1940s', year: 1940 },
  { id: 'LeaveItt1940', show: 'Chevrolet', title: 'Leave It to Roll-Oh', decade: '1940s', year: 1940 },
  { id: 'superman_mechanical_monsters', show: 'Superman', title: 'The Mechanical Monsters', decade: '1940s', year: 1941 },
  { id: 'superman_arctic_giant', show: 'Superman', title: 'The Arctic Giant', decade: '1940s', year: 1942 },
  { id: 'superman_bulleteers', show: 'Superman', title: 'The Bulleteers', decade: '1940s', year: 1942, still: 177 },
  { id: 'the-lone-ranger-1949-s-01-e-02-the-lone-ranger-fights-on', show: 'The Lone Ranger', title: 'The Lone Ranger Fights On', decade: '1940s', year: 1949 },
  { id: 'the-lone-ranger-1949-s-01-e-04-legion-of-old-timers', show: 'The Lone Ranger', title: 'Legion of Old Timers', decade: '1940s', year: 1949 },
  { id: 'the-lone-ranger-1949-s-01-e-05-rustlers-hideout', show: 'The Lone Ranger', title: "Rustlers' Hideout", decade: '1940s', year: 1949 },
  { id: '1949NBC-Howdy_Doody_Uploaded-By-Jeice_The_Cuddly_Warrior', show: 'Howdy Doody', title: 'An episode from 1949', decade: '1940s', year: 1949 },
  { id: 'Howdy_Doody_4', show: 'Howdy Doody', title: 'From August 3, 1949', decade: '1940s', year: 1949, still: 120 },
  { id: 'captainvideo', show: 'Captain Video', title: 'An episode from 1949', decade: '1940s', year: 1949 },
  { id: 'TheChristmasCarolastoldbyVincentPrice', show: 'The Christmas Carol', title: 'Told by Vincent Price', decade: '1940s', year: 1949 },
  { id: 'S1E01-Life_Of_Riley-10_04_49-Tonsils_824', show: 'The Life of Riley', title: 'Tonsils', decade: '1940s', year: 1949 },
  { id: 'S1E03-Life_Of_Riley-10_18_1949_-_Egberts_Chemistry_Set', show: 'The Life of Riley', title: "Egbert's Chemistry Set", decade: '1940s', year: 1949 },
  { id: 'S1E12-Life_Of_Riley-12_20_1949_-_Juniors_Birthday_Party', show: 'The Life of Riley', title: "Junior's Birthday Party", decade: '1940s', year: 1949 },
  { id: 'Public_Prosecutor--Missing_Hour', show: 'Public Prosecutor', title: 'The Case of the Missing Hour', decade: '1940s', year: 1947 },
  { id: 'Public_Prosecutor--Dead_Mans_Voice', show: 'Public Prosecutor', title: "The Case of the Dead Man's Voice", decade: '1940s', year: 1948 },
  { id: '1945-06-28_San_Francisco_Parley_Ends', show: 'Universal Newsreel', title: 'San Francisco Parley Ends', decade: '1940s', year: 1945, still: 30 },
  { id: '1945-12-10_Christmas_Brings_Joy_To_Everyone', show: 'Universal Newsreel', title: 'Christmas Brings Joy to Everyone', decade: '1940s', year: 1945 },
  { id: '1946-01-31_Radar_makes_Round_Trip_To_Moon', show: 'Universal Newsreel', title: 'Radar Makes Round Trip to Moon', decade: '1940s', year: 1946 },
  { id: '1946-06-10_Allied_Victory_Parade', show: 'Universal Newsreel', title: 'Allied Victory Parade', decade: '1940s', year: 1946 },
  { id: '1946-08-19_President_on_Vacation', show: 'Universal Newsreel', title: 'President on Vacation', decade: '1940s', year: 1946, still: 90 },
  { id: '1946-08-30_UN_Starts_Session_At_New_Home', show: 'Universal Newsreel', title: 'UN Starts Session at New Home', decade: '1940s', year: 1946, still: 25 },
  { id: '1946-11-21_White_Sands_NM_V-2_rocket', show: 'Universal Newsreel', title: 'V-2 Rocket Films the Earth', decade: '1940s', year: 1946, still: 60 },

  { id: 'Mama1950', show: 'Mama', title: "Mama's Bad Day", decade: '1950s', year: 1950 },
  { id: 'DateWith1950', show: 'Simmel-Meservey', title: 'A Date with Your Family', decade: '1950s', year: 1950 },
  { id: 'Cavalcade_Of_Stars', show: 'Cavalcade of Stars', title: 'Jackie Gleason and the Honeymooners', decade: '1950s', year: 1951 },
  { id: 'Jack_Benny_11_04_1951', show: 'The Jack Benny Program', title: 'With Dorothy Shay', decade: '1950s', year: 1951 },
  { id: 'SpacePatrolS01e43TheSpacePatrolCodeBelt', show: 'Space Patrol', title: 'The Space Patrol Code Belt', decade: '1950s', year: 1951 },
  { id: 'RacketSquadTheSaltedMine1951', show: 'Racket Squad', title: 'The Salted Mine', decade: '1950s', year: 1951 },
  { id: 'Burns-Allen-Show_S2E7_Christmas', show: 'Burns and Allen', title: 'The Christmas Episode', decade: '1950s', year: 1951 },
  { id: 'Tales_Of_Tomorrow_-_The_Search_For_The_Flying_Saucer', show: 'Tales of Tomorrow', title: 'The Search for the Flying Saucer', decade: '1950s', year: 1951 },
  { id: 'Tales_Of_Tomorrow_-_Ahead_Of_His_Time', show: 'Tales of Tomorrow', title: 'Ahead of His Time', decade: '1950s', year: 1952 },
  { id: 'ColgateComedyHourWithAbbottAndCostelloAndErrolFlynn', show: 'The Colgate Comedy Hour', title: 'Abbott and Costello, with Errol Flynn', decade: '1950s', year: 1952, still: 294 },
  { id: 'My_Little_Margie--Friend_for_Roberta', show: 'My Little Margie', title: 'A Friend for Roberta', decade: '1950s', year: 1952 },
  { id: 'TheBigLittleJesus', show: 'Dragnet', title: 'The Big Little Jesus', decade: '1950s', year: 1953 },
  { id: 'dingdongschool', show: 'Ding Dong School', title: 'An episode from 1953', decade: '1950s', year: 1953 },
  { id: 'topper-s-01-e-01-topper-meets-the-ghosts-1953-10-09', show: 'Topper', title: 'Topper Meets the Ghosts', decade: '1950s', year: 1953 },
  { id: 'Life_with_Elizabeth', show: 'Life with Elizabeth', title: 'An episode from 1953', decade: '1950s', year: 1953 },
  { id: 'SherlockHolmes-TheCaseofLadyBeryl', show: 'Sherlock Holmes', title: 'The Case of Lady Beryl', decade: '1950s', year: 1954 },
  { id: 'SherlockHolmes-TheCaseoftheShyBallerina', show: 'Sherlock Holmes', title: 'The Case of the Shy Ballerina', decade: '1950s', year: 1954 },
  { id: 'AdventuresOfSupermanStampDayForSchoolChildren', show: 'Stamp Day for Superman', title: 'With George Reeves', decade: '1950s', year: 1954, still: 1050 },
  { id: 'Pinky_Lee_Show', show: 'The Pinky Lee Show', title: 'An episode from 1954', decade: '1950s', year: 1954 },
  { id: 'Robin_Hood_01_The_Coming_Of_Robin_Hood', show: 'The Adventures of Robin Hood', title: 'The Coming of Robin Hood', decade: '1950s', year: 1955 },
  { id: 'TheAdventuresOfFlashGordon', show: 'Flash Gordon', title: 'An episode from 1955', decade: '1950s', year: 1955 },
  { id: 'OurMissBrooks-HomeCookedMeal', show: 'Our Miss Brooks', title: 'Home Cooked Meal', decade: '1950s', year: 1955 },
  { id: 'Super-Circus_1956', show: 'Super Circus', title: 'An episode from 1956', decade: '1950s', year: 1956, still: 1380 },
  { id: 'Designfo1956', show: 'General Motors', title: 'Design for Dreaming', decade: '1950s', year: 1956 },
  { id: 'OnceUpon1956', show: 'Bell System', title: 'Once Upon a Honeymoon', decade: '1950s', year: 1956 },
  { id: 'Annie_Oakley_Sharp_Shootin_Annie', show: 'Annie Oakley', title: "Sharp Shootin' Annie", decade: '1950s' },
  { id: 'Cisco_Kid_-_Buried_Treasure', show: 'The Cisco Kid', title: 'Buried Treasure', decade: '1950s' },
  { id: 'I_Married_Joan_EP79_Neighbors', show: 'I Married Joan', title: 'Neighbors', decade: '1950s' },
  { id: 'OZZIE_AND_HARRIET_ep_Halloween_Party', show: 'Ozzie and Harriet', title: 'Halloween Party', decade: '1950s' },
  { id: 'OzzieAndHarriet-BusyChristmas', show: 'Ozzie and Harriet', title: 'Busy Christmas', decade: '1950s' },
  { id: 'You_Bet_Your_Life_Groucho', show: 'You Bet Your Life', title: 'With Groucho Marx', decade: '1950s' },
  { id: 'OSB-02_Night_Of_April_14th', show: 'One Step Beyond', title: 'Night of April 14th', decade: '1950s', year: 1959 },
  { id: '1957-10-07_New_Moon', show: 'Universal Newsreel', title: 'Reds Launch First Space Satellite', decade: '1950s', year: 1957, still: 40 },
  { id: '1958-02-03_First_US_Satellite_Launched', show: 'Universal Newsreel', title: 'First U.S. Satellite Launched!', decade: '1950s', year: 1958 },
  { id: '1958-03-17_Brussels_Worlds_Fair', show: 'Universal Newsreel', title: "Brussels World's Fair", decade: '1950s', year: 1958, still: 50 },
  { id: '1958-08-11_A-Sub_Epic', show: 'Universal Newsreel', title: 'Nautilus Pioneers North Pole Seaway', decade: '1950s', year: 1958 },
  { id: '1959-03-16_Aloha_Hawaii', show: 'Universal Newsreel', title: 'Aloha Hawaii', decade: '1950s', year: 1959 },
  { id: '1959-04-30_California', show: 'Universal Newsreel', title: 'Cubs and Kids Cutting Capers', decade: '1950s', year: 1959 },
  { id: '1959-11-02_Good-Will_Swap', show: 'Universal Newsreel', title: 'Good-Will Swap', decade: '1950s', year: 1959 },

  { id: 'Bonanza_pd', show: 'Bonanza', title: 'San Francisco', decade: '1960s', year: 1960, file: 'Bonanza s01e28.mp4' },
  { id: 'Bonanza-TheAbductionEp2x08', show: 'Bonanza', title: 'The Abduction', decade: '1960s', year: 1960 },
  { id: 'BarkingDog1961', show: 'Ozzie and Harriet', title: 'The Barking Dog', decade: '1960s', year: 1961, still: 120 },
  { id: 'TheBigPicture516', show: 'The Big Picture', title: 'The Army Nurse Story', decade: '1960s', year: 1961 },
  { id: 'Beverly_Hillbillies_Ep01_The_Clampetts_Strike_Oil', show: 'The Beverly Hillbillies', title: 'The Clampetts Strike Oil', decade: '1960s', year: 1962 },
  { id: 'Beverly_Hillbillies_Ep02_Getting_Settled', show: 'The Beverly Hillbillies', title: 'Getting Settled', decade: '1960s', year: 1962 },
  { id: 'Beverly_Hillbillies_Ep06_Trick_Or_Treat', show: 'The Beverly Hillbillies', title: 'Trick or Treat', decade: '1960s', year: 1962 },
  { id: 'Beverly_Hillbillies_Ep13_Home_For_Christmas', show: 'The Beverly Hillbillies', title: 'Home for Christmas', decade: '1960s', year: 1962 },
  { id: 'Beverly_Hillbillies_Ep46_Turkey_Day', show: 'The Beverly Hillbillies', title: 'Turkey Day', decade: '1960s', year: 1963 },
  { id: 'Beverly_Hillbillies_Ep52_The_Giant_JackRabbit', show: 'The Beverly Hillbillies', title: 'The Giant Jackrabbit', decade: '1960s', year: 1964 },
  { id: 'Beverly_Hillbillies_Ep53_The_Girl_From_Home', show: 'The Beverly Hillbillies', title: 'The Girl from Home', decade: '1960s', year: 1964 },
  { id: 'Beverly_Hillbillies_Ep55_The_Race_For_The_Queen', show: 'The Beverly Hillbillies', title: 'The Race for Queen', decade: '1960s', year: 1964 },
  { id: 'dick_van_dyke_show_39_the_night_the_roof_fell_in', show: 'The Dick Van Dyke Show', title: 'The Night the Roof Fell In', decade: '1960s', year: 1962 },
  { id: 'jack_benny_03_04_62', show: 'The Jack Benny Program', title: 'From March 4, 1962', decade: '1960s', year: 1962 },
  { id: 'TLS_Lucy_The_Babysitter', show: 'The Lucy Show', title: 'Lucy the Babysitter', decade: '1960s' },
  { id: 'TLS_Lucy_And_Viv_Put_In_A_Shower', show: 'The Lucy Show', title: 'Lucy and Viv Put In a Shower', decade: '1960s' },
  { id: 'TLS_Lucys_Barbershop_Quartet', show: 'The Lucy Show', title: "Lucy's Barbershop Quartet", decade: '1960s', year: 1963 },
  { id: 'Andy_Griffith_Opie_and_the_Spoiled_Kid', show: 'The Andy Griffith Show', title: 'Opie and the Spoiled Kid', decade: '1960s', year: 1963 },
  { id: 'Andy-Griffith-Show_Andy-Discovers-America', show: 'The Andy Griffith Show', title: 'Andy Discovers America', decade: '1960s', year: 1963 },
  { id: 'Andy_Griffith_The_Loaded_Goat', show: 'The Andy Griffith Show', title: 'The Loaded Goat', decade: '1960s', year: 1963 },
  { id: 'Andy_Griffith_A_Wife_For_Andy', show: 'The Andy Griffith Show', title: 'A Wife for Andy', decade: '1960s', year: 1963 },
  { id: 'Wacky_Wizardry', show: 'Mack and Myer for Hire', title: 'Wacky Wizardry', decade: '1960s', year: 1963 },
  { id: 'Mack_and_Myer_For_Hire_Dueling_Fools', show: 'Mack and Myer for Hire', title: 'Dueling Fools', decade: '1960s', year: 1963 },
  { id: 'PetticoatJunction', show: 'Petticoat Junction', title: 'Bobbie Jo and the Beatnik', decade: '1960s', year: 1964 },
  { id: 'PetticoatJunction_678', show: 'Petticoat Junction', title: 'Last Chance Farm', decade: '1960s', year: 1964 },
  { id: 'TheCobraStrikes', show: 'The Big Picture', title: 'The Cobra Strikes', decade: '1960s', year: 1965 },
  { id: 'OurHeritage_', show: 'The Big Picture', title: 'Our Great American Heritage', decade: '1960s', still: 300, captions: false },
  { id: 'TheBigPicture723', show: 'The Big Picture', title: 'When the Chips Are Down', decade: '1960s', year: 1968, still: 210 },
  { id: 'DDayAnniversary', show: 'The Big Picture', title: 'D-Day Anniversary', decade: '1960s', year: 1969, still: 1470 },
  { id: '1960-07-21_missile_milestone', show: 'Universal Newsreel', title: 'First Polaris Firing by Submerged U-Boat', decade: '1960s', year: 1960 },
  { id: '1960-10-31_Satchmo_Swings_In_Congo', show: 'Universal Newsreel', title: 'Satchmo Swings in Congo', decade: '1960s', year: 1960, still: 45 },
  { id: '1961-03-13_Peace_Corps', show: 'Universal Newsreel', title: 'Peace Corps', decade: '1960s', year: 1961 },
  { id: '1962-07-23_First_Lady_At_Play', show: 'Universal Newsreel', title: 'First Lady at Play', decade: '1960s', year: 1962, still: 30 },
  { id: '1962-09-13_Kennedy_Tour', show: 'Universal Newsreel', title: 'Kennedy Calls for U.S. Lead in Space', decade: '1960s', year: 1962, still: 30 },
  { id: '1963-03-18_Suspense_Story', show: 'Universal Newsreel', title: 'National Press Club Hears Hitchcock', decade: '1960s', year: 1963 },
  { id: '1963-11-14_Space_Movie', show: 'Universal Newsreel', title: 'Camera Records Missile in Flight', decade: '1960s', year: 1963, still: 40 },
  { id: '1964-03-02_New_York_Worlds_Fair', show: 'Universal Newsreel', title: "New York World's Fair", decade: '1960s', year: 1964 },
  { id: '1964-10-19_The_Olympics', show: 'Universal Newsreel', title: 'U.S. Widens Tokyo Lead', decade: '1960s', year: 1964 },
  { id: '1964-10-26_Olympics_End', show: 'Universal Newsreel', title: 'Olympics End', decade: '1960s', year: 1964 },
  { id: '1964-10-26_Fashions', show: 'Universal Newsreel', title: 'American Fashions in Rome', decade: '1960s', year: 1964 },

  { id: 'TheBigPicture-USArmyinSpaceandUndertheSea', show: 'The Big Picture', title: 'The Army in Space and Under the Sea', decade: '1970s', year: 1971 },
  { id: 'FortBliss', show: 'The Big Picture', title: 'Fort Bliss, Heart of Army Air Defense', decade: '1970s', year: 1972, still: 300 },
  { id: 'Dustys_Trail_2', show: "Dusty's Trail", title: 'Brookhaven, U.S.A.', decade: '1970s', year: 1973 },
  { id: 'Dustys_Trail_3', show: "Dusty's Trail", title: 'Here Come the Grooms', decade: '1970s', year: 1973 },
  { id: 'Dustys_Trail_4', show: "Dusty's Trail", title: 'Horse of Another Color', decade: '1970s', year: 1973 },
  { id: 'Dusty_5', show: "Dusty's Trail", title: "Cavalry's Coming", decade: '1970s', year: 1973 },
  { id: 'DustysTrail5', show: "Dusty's Trail", title: 'Love Means Bananas', decade: '1970s', year: 1973 },
  { id: 'Dustys_Trail_Bear', show: "Dusty's Trail", title: 'Androcles and the Bear', decade: '1970s', year: 1973 },
  { id: '306-v-20', show: 'Vision USA', title: 'No. 20', decade: '1970s', year: 1974, still: 295 },
];

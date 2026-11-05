// The episodes the room shows: chosen by hand from archive.org's classic_tv collection
// (https://archive.org/details/classic_tv), which its users upload. Only items marked public domain
// (the archive proxy relays these picks alone, and of them only those so marked, listed by name or
// under their owner's licence), and of those only shows known to have lapsed into it and fit for the
// whole family: the collection's most watched include shows still under copyright, and most of what
// is marked public domain from the 1980s and 1990s is not. Nor is all that is marked from before
// (NBC renewed Bonanza's 1959 episodes in 1987, Irving Brecher The Life of Riley's of 1949 in 1977,
// and Dusty's Trail has its notice of 1973), so each is checked before it is added. The year that
// counts is the one in the notice in its credits, not its air date. A show from before 1964 is free
// if it was published without one, or if nobody renewed it in its 28th year: from 1978 in the
// Copyright Office's records (https://publicrecords.copyright.gov/), searched by the show, the
// episode and its owner, whose renewals may not name the show; before that in its Catalog of
// Copyright Entries, whose volumes archive.org has. A show was published when it was sold to
// stations, in syndication, as the Copyright Office then counted it and the shows' owners registered
// them, not when it was broadcast, live or on the network's own film, nor by the kinescopes and
// prints a network sent its stations (NBC v. Sonneborn, 1985): so a network show with no notice
// was never published, and is still under copyright, 120 years from when it was made (Wade Williams
// registered his Space Patrol episodes as unpublished in 1988). From 1964 renewal was automatic,
// so only a show published with no notice will do, or a film of the US government's (The Big
// Picture, Vision USA). Nor a show made abroad, whose US copyright the URAA restored in 1996 unless
// it came out here within 30 days, which an episode can't show (The Adventures of Robin Hood,
// British). A copy whose credits stop before the notice will do where the records settle it (an
// episode that first aired early in 1963 has a notice of 1962 or 1963, and neither was renewed);
// one whose notice can't be read where they don't will not (Mack and Myer for Hire ran into 1964),
// and nor will one that shows a later episode than it says. Take out a pick that fails, whatever
// archive.org marks it. tools/catalogue.mjs reads each one's metadata and writes public/catalogue/
// from it.
//
// What each check found is written down with it, `check`, for anyone to check again: for a show,
// the notice as its credits have it (© MCMLXII Filmways TV Productions, Inc.), or that it has none
// (and whose credits they are) and how it was published, or that the copy's credits end before
// it; then for a show from before 1964 with a notice, the renewal search (that year's renewals of
// the show or its owner, and that this one is not among them). Else why else it is free: a film of
// the US government's, Universal's gift of 1976, a Prelinger Archives copy marked public domain,
// 95 years since it came out, or its owner's licence (worker.js OWNERS). The cartoons and silent
// comedies the proxy lists by name (worker.js LISTED) have none: the reason it lists each for is
// its check.
//
// After each decade's shows and films, newsreels from archive.org's universal_newsreels
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
// Films still under copyright may come from their owners' own collections, under the Creative
// Commons licence the owner gave them (worker.js OWNERS: the California Academy of Sciences'), which
// the room shows with whom to credit; never an upload's licence, which is only as good as the
// uploader's right to give it.
//
// Each: the item's id, the show (or the star, studio or sponsor) and the episode's title as the
// room shows them, its kind where it is not television (public/js/catalogue.js KINDS: 'silent' and
// 'cartoon' for the films the proxy lists, 'film' for the Prelinger Archives', 'newsreel'), the
// year it was first shown where it is known (else the decade alone), and, where the tool's own
// choice is not the right one, `file` (the video) or `still` (the frame on its tape, in seconds),
// `captions: false` where archive.org's speech to text is no use, and `credit` where a licensed
// film's is not its owner's (OWNERS); last, its `check`. Each decade's in the kinds'
// order, as its tapes stand on the shelves: its television, its silent films, cartoons and short
// films, then its newsreels.

/** @typedef {{ id: string, show: string, title: string, decade: '1920s' | '1930s' | '1940s' | '1950s' | '1960s' | '1970s', kind?: 'silent' | 'cartoon' | 'film' | 'newsreel', year?: number, file?: string, still?: number, captions?: false, credit?: string, check?: string }} Pick */

const PRELINGER = 'A Prelinger Archives copy, marked public domain.';
const UNIVERSAL = 'Universal\'s, which it gave to the public in 1976.';
const ARMY = 'The Army\'s (The Big Picture): a film of the US government\'s.';
const FILMWAYS_1962 = '© MCMLXII Filmways TV Productions, Inc., in its closing credits. Not renewed in 1990: Filmways\' renewals of the show start in 1992, with its episodes of 1964.';
const FILMWAYS_1963 = '© MCMLXIII Filmways TV Productions, Inc., in its closing credits. Not renewed in 1991: Filmways\' renewals of the show start in 1992, with its episodes of 1964.';
const DESILU_1962 = '© MCMLXII Desilu Productions, Inc., on its last card. Not renewed in 1990: Desilu\'s renewals of the show in 1990 and 1991 (Paramount\'s) are not of it.';
const MAYBERRY_1963 = '© 1963 Mayberry Enterprises on its last card. Not renewed in 1991: Mayberry Enterprises\' renewals of that year, 21 episodes, are not of it.';
const MAYBERRY_CUT = 'The copy\'s credits end before the notice; it first aired early in 1963, so its notice is of 1962 or 1963. Not renewed: Mayberry Enterprises\' renewals, 21 episodes in 1991, are not of it, nor any of 1990.';
const NO_OZZIE = 'Not renewed: none of the show\'s episodes ever was.';
const SHERLOCK = 'No notice on its titles or closing credits (Sheldon Reynolds\' Motion Pictures for Television, filmed in France for American television). Published in syndication, sold to stations from October 1954, which the Copyright Office then counted as publication. Nothing of it renewed.';

/** @type {Pick[]} */
export const PICKS = [
  { id: 'silent-safety-last', show: 'Harold Lloyd', title: 'Safety Last!', decade: '1920s', kind: 'silent', year: 1923, still: 3834 },
  { id: 'yorkmba99_hotmail_TA', show: 'Buster Keaton', title: 'Three Ages', decade: '1920s', kind: 'silent', year: 1923, still: 3414 },
  { id: 'SteamboatBillJr_201411', show: 'Buster Keaton', title: 'Steamboat Bill, Jr.', decade: '1920s', kind: 'silent', year: 1928 },
  { id: 'the-gold-rush-film-1925', show: 'Charlie Chaplin', title: 'The Gold Rush', decade: '1920s', kind: 'silent', year: 1925 },
  { id: 'steamboat-willie-16mm-film-scan-4k-lossless', show: 'Mickey Mouse', title: 'Steamboat Willie', decade: '1920s', kind: 'cartoon', year: 1928, still: 57 },
  { id: 'PlaneCrazy_201511', show: 'Mickey Mouse', title: 'Plane Crazy', decade: '1920s', kind: 'cartoon', year: 1929 },
  { id: 'the-skeleton-dance-1929', show: 'Silly Symphonies', title: 'The Skeleton Dance', decade: '1920s', kind: 'cartoon', year: 1929 },
  { id: 'FindingH1929', show: 'Western Electric', title: 'Finding His Voice', decade: '1920s', kind: 'film', year: 1929, check: 'A Prelinger Archives copy, marked public domain; and public domain from 2025, 95 years after it came out.' },

  { id: 'Aroundth1937', show: 'Chevrolet', title: 'Around the Corner', decade: '1930s', kind: 'film', year: 1937, check: PRELINGER },
  { id: 'RideforC1937', show: 'Chevrolet', title: 'A Ride for Cinderella', decade: '1930s', kind: 'film', year: 1937, check: PRELINGER },
  { id: 'Breakfas1939', show: "Kellogg's", title: 'Breakfast Pals', decade: '1930s', kind: 'film', year: 1939, check: PRELINGER },
  { id: '1933-03-05_Extra_Special_Roosevelt_Inaugurated', show: 'Universal Newsreel', title: 'Roosevelt Inaugurated', decade: '1930s', kind: 'newsreel', year: 1933, check: UNIVERSAL },
  { id: '1933-08-14_President_Visits_Foresters', show: 'Universal Newsreel', title: 'President Visits Foresters', decade: '1930s', kind: 'newsreel', year: 1933, check: UNIVERSAL },
  { id: '1933-10-11_Farmer_Plays_Tune_With_Hands', show: 'Universal Newsreel', title: 'Farmer Plays Tune with Hands', decade: '1930s', kind: 'newsreel', year: 1933, check: UNIVERSAL },
  { id: '1933-11-06_Ancient_Mexican_Dances_for_President', show: 'Universal Newsreel', title: 'Ancient Mexican Dances for President', decade: '1930s', kind: 'newsreel', year: 1933, check: UNIVERSAL },
  { id: '1933-11_Ancient_Chinese_Field_Games', show: 'Universal Newsreel', title: 'Ancient Chinese Field Games', decade: '1930s', kind: 'newsreel', year: 1933, check: UNIVERSAL },
  { id: '1935-02-11_Roosevelt_Addresses_Boy_Scouts', show: 'Universal Newsreel', title: 'Roosevelt Addresses Boy Scouts', decade: '1930s', kind: 'newsreel', year: 1935, still: 40, check: UNIVERSAL },
  { id: '1935-03-04_FDR_Buys_First_Baby_Bond', show: 'Universal Newsreel', title: 'FDR Buys First Baby Bond', decade: '1930s', kind: 'newsreel', year: 1935, check: UNIVERSAL },
  { id: '1937-05-18_The_Coronation_of_King_George_VI', show: 'Universal Newsreel', title: 'The Coronation of King George VI', decade: '1930s', kind: 'newsreel', year: 1937, check: UNIVERSAL },
  { id: '1939-05-15_King_and_Queen_Leave_For_American_Tour', show: 'Universal Newsreel', title: 'King and Queen Leave Britain on American Tour', decade: '1930s', kind: 'newsreel', year: 1939, still: 25, check: UNIVERSAL },

  { id: 'the-lone-ranger-1949-s-01-e-02-the-lone-ranger-fights-on', show: 'The Lone Ranger', title: 'The Lone Ranger Fights On', decade: '1940s', year: 1949, check: 'The copy ends before its notice. The Lone Ranger, Inc. registered it, © 22 September 1949 (Catalog of Copyright Entries, January–June 1950), and did not renew it: it is not in the Catalog\'s renewals of 1976 or 1977.' },
  { id: 'the-lone-ranger-1949-s-01-e-04-legion-of-old-timers', show: 'The Lone Ranger', title: 'Legion of Old Timers', decade: '1940s', year: 1949, check: 'The copy ends before its notice. The Lone Ranger, Inc. registered it, © 6 October 1949 (Catalog of Copyright Entries, January–June 1950), and did not renew it: it is not in the Catalog\'s renewals of 1976 or 1977.' },
  { id: 'the-lone-ranger-1949-s-01-e-05-rustlers-hideout', show: 'The Lone Ranger', title: "Rustlers' Hideout", decade: '1940s', year: 1949, check: '© MCMXLIX The Lone Ranger, Inc., in its closing credits (registered 13 October 1949). Not renewed: it is not in the Catalog of Copyright Entries\' renewals of 1976 or 1977.' },
  { id: 'TheChristmasCarolastoldbyVincentPrice', show: 'The Christmas Carol', title: 'Told by Vincent Price', decade: '1940s', year: 1949, check: 'No notice on its titles, its producer\'s card or its end ("Supervisor for J. F., Inc."). Published in syndication: Jerry Fairbanks sold it to 22 stations for Christmas Day 1949, and Consolidated Television Sales to more from 1952, which the Copyright Office then counted as publication. Nor renewed: it is not in the Catalog of Copyright Entries\' renewals of 1976 or 1977.' },
  { id: 'Public_Prosecutor--Missing_Hour', show: 'Public Prosecutor', title: 'The Case of the Missing Hour', decade: '1940s', year: 1947, check: '© MCMXLVIII National Broadcasting Company, Inc., on its title card (made by Jerry Fairbanks, Inc.). Not renewed: it is not in the Catalog of Copyright Entries\' renewals of 1975 or 1976.' },
  { id: 'Public_Prosecutor--Dead_Mans_Voice', show: 'Public Prosecutor', title: "The Case of the Dead Man's Voice", decade: '1940s', year: 1948, check: '© MCMXLVIII National Broadcasting Company, Inc., on its title card (made by Jerry Fairbanks, Inc.). Not renewed: it is not in the Catalog of Copyright Entries\' renewals of 1975 or 1976.' },
  { id: 'superman_mechanical_monsters', show: 'Superman', title: 'The Mechanical Monsters', decade: '1940s', kind: 'cartoon', year: 1941 },
  { id: 'superman_arctic_giant', show: 'Superman', title: 'The Arctic Giant', decade: '1940s', kind: 'cartoon', year: 1942 },
  { id: 'superman_bulleteers', show: 'Superman', title: 'The Bulleteers', decade: '1940s', kind: 'cartoon', year: 1942, still: 177 },
  { id: 'ToNewHor1940', show: 'General Motors', title: 'To New Horizons', decade: '1940s', kind: 'film', year: 1940, check: PRELINGER },
  { id: 'LeaveItt1940', show: 'Chevrolet', title: 'Leave It to Roll-Oh', decade: '1940s', kind: 'film', year: 1940, check: PRELINGER },
  { id: '1945-06-28_San_Francisco_Parley_Ends', show: 'Universal Newsreel', title: 'San Francisco Parley Ends', decade: '1940s', kind: 'newsreel', year: 1945, still: 30, check: UNIVERSAL },
  { id: '1945-12-10_Christmas_Brings_Joy_To_Everyone', show: 'Universal Newsreel', title: 'Christmas Brings Joy to Everyone', decade: '1940s', kind: 'newsreel', year: 1945, check: UNIVERSAL },
  { id: '1946-01-31_Radar_makes_Round_Trip_To_Moon', show: 'Universal Newsreel', title: 'Radar Makes Round Trip to Moon', decade: '1940s', kind: 'newsreel', year: 1946, check: UNIVERSAL },
  { id: '1946-06-10_Allied_Victory_Parade', show: 'Universal Newsreel', title: 'Allied Victory Parade', decade: '1940s', kind: 'newsreel', year: 1946, check: UNIVERSAL },
  { id: '1946-08-19_President_on_Vacation', show: 'Universal Newsreel', title: 'President on Vacation', decade: '1940s', kind: 'newsreel', year: 1946, still: 90, check: UNIVERSAL },
  { id: '1946-08-30_UN_Starts_Session_At_New_Home', show: 'Universal Newsreel', title: 'UN Starts Session at New Home', decade: '1940s', kind: 'newsreel', year: 1946, still: 25, check: UNIVERSAL },
  { id: '1946-11-21_White_Sands_NM_V-2_rocket', show: 'Universal Newsreel', title: 'V-2 Rocket Films the Earth', decade: '1940s', kind: 'newsreel', year: 1946, still: 60, check: UNIVERSAL },

  { id: 'RacketSquadTheSaltedMine1951', show: 'Racket Squad', title: 'The Salted Mine', decade: '1950s', year: 1951, check: 'No notice in its credits (a Showcase production, at Hal Roach Studios). First shown on CBS, on 15 November 1951; published when the show was sold to stations in reruns, as Captain Braddock (on WABD, New York, in 1957), which the Copyright Office then counted as publication. Nothing of the show renewed.' },
  { id: 'TheBigLittleJesus', show: 'Dragnet', title: 'The Big Little Jesus', decade: '1950s', year: 1953, check: '© MCMLIII Mark VII Ltd. in its closing credits. Not renewed in 1981: Mark VII\'s renewals are of its songs and its feature films, none of the show\'s episodes.' },
  { id: 'Life_with_Elizabeth', show: 'Life with Elizabeth', title: 'An episode from 1953', decade: '1950s', year: 1953, check: '© 1953 Bandy Productions in its closing credits (a Guild Films production, with Don Fedderson). Not renewed in 1981: nothing of it under the show, Bandy Productions or Guild Films.' },
  { id: 'SherlockHolmes-TheCaseofLadyBeryl', show: 'Sherlock Holmes', title: 'The Case of Lady Beryl', decade: '1950s', year: 1954, check: SHERLOCK },
  { id: 'SherlockHolmes-TheCaseoftheShyBallerina', show: 'Sherlock Holmes', title: 'The Case of the Shy Ballerina', decade: '1950s', year: 1954, check: SHERLOCK },
  { id: 'AdventuresOfSupermanStampDayForSchoolChildren', show: 'Stamp Day for Superman', title: 'With George Reeves', decade: '1950s', year: 1954, still: 1050, check: '© MCMLIV National Comics Publications, Inc., on its title card, a film Superman, Inc. gave the Treasury Department. Not renewed in 1982: none of the Superman renewals of 1981 or 1982 is of it.' },
  { id: 'TheAdventuresOfFlashGordon', show: 'Flash Gordon', title: 'An episode from 1955', decade: '1950s', year: 1955, check: 'No notice in its credits (an Interwest Film Luedecke production, made in West Berlin for American television under Inter-Continental Television Films, and shown here first). Published in syndication, sold to stations across most of the country from October 1954 (and shown on DuMont in the East), which the Copyright Office then counted as publication. Nothing of it renewed.' },
  { id: 'Annie_Oakley_Sharp_Shootin_Annie', show: 'Annie Oakley', title: "Sharp Shootin' Annie", decade: '1950s', year: 1954, check: 'No notice in its credits (Annie Oakley Productions, Inc.). Published in syndication, first shown on 12 June 1954, as Flying A registered the show\'s films, as published (Dynamite, LP0000005307, 1955). Not renewed: Flying A Productions\' renewals, 13 films of 1955 in 1983, are not of it.' },
  { id: 'Cisco_Kid_-_Buried_Treasure', show: 'The Cisco Kid', title: 'Buried Treasure', decade: '1950s', check: '© MCMLII Ziv Television Programs, Inc., in its closing credits. Not renewed in 1980: Rhodes Enterprises renewed 79 of Ziv\'s Cisco Kid episodes in 1980–83, not this one.' },
  { id: 'I_Married_Joan_EP79_Neighbors', show: 'I Married Joan', title: 'Neighbors', decade: '1950s', check: 'No notice in its credits (filmed by Volcano Pictures). Published in syndication, on 6 May 1956, as Joan Davis Enterprises registered 46 of the show\'s episodes (in 1981–82, with notices of 1953 to 1955); this one is not among them. Not renewed: Martin S. Colbert renewed 41 of those in 1982, not this one.' },
  { id: 'OZZIE_AND_HARRIET_ep_Halloween_Party', show: 'Ozzie and Harriet', title: 'Halloween Party', decade: '1950s', check: `© MCMLII Ozzie Nelson in its closing credits. ${NO_OZZIE}` },
  { id: 'OSB-02_Night_Of_April_14th', show: 'One Step Beyond', title: 'Night of April 14th', decade: '1950s', year: 1959, check: '© MCMLIX World Television Programming, Inc., in its closing credits. Not renewed in 1987: World Television\'s renewals, of 1989, are of 13 episodes of 1961.' },
  { id: 'DateWith1950', show: 'Simmel-Meservey', title: 'A Date with Your Family', decade: '1950s', kind: 'film', year: 1950, check: PRELINGER },
  { id: 'Designfo1956', show: 'General Motors', title: 'Design for Dreaming', decade: '1950s', kind: 'film', year: 1956, check: PRELINGER },
  { id: 'OnceUpon1956', show: 'Bell System', title: 'Once Upon a Honeymoon', decade: '1950s', kind: 'film', year: 1956, check: PRELINGER },
  { id: '1957-10-07_New_Moon', show: 'Universal Newsreel', title: 'Reds Launch First Space Satellite', decade: '1950s', kind: 'newsreel', year: 1957, still: 40, check: UNIVERSAL },
  { id: '1958-02-03_First_US_Satellite_Launched', show: 'Universal Newsreel', title: 'First U.S. Satellite Launched!', decade: '1950s', kind: 'newsreel', year: 1958, check: UNIVERSAL },
  { id: '1958-03-17_Brussels_Worlds_Fair', show: 'Universal Newsreel', title: "Brussels World's Fair", decade: '1950s', kind: 'newsreel', year: 1958, still: 50, check: UNIVERSAL },
  { id: '1958-08-11_A-Sub_Epic', show: 'Universal Newsreel', title: 'Nautilus Pioneers North Pole Seaway', decade: '1950s', kind: 'newsreel', year: 1958, check: UNIVERSAL },
  { id: '1959-03-16_Aloha_Hawaii', show: 'Universal Newsreel', title: 'Aloha Hawaii', decade: '1950s', kind: 'newsreel', year: 1959, check: UNIVERSAL },
  { id: '1959-04-30_California', show: 'Universal Newsreel', title: 'Cubs and Kids Cutting Capers', decade: '1950s', kind: 'newsreel', year: 1959, check: UNIVERSAL },
  { id: '1959-11-02_Good-Will_Swap', show: 'Universal Newsreel', title: 'Good-Will Swap', decade: '1950s', kind: 'newsreel', year: 1959, check: UNIVERSAL },

  { id: 'Bonanza_pd', show: 'Bonanza', title: 'San Francisco', decade: '1960s', year: 1960, file: 'Bonanza s01e28.mp4', check: 'The copy ends before its credits. It first aired in March 1960: NBC renewed the show\'s episodes registered in 1959 in December 1987 (Death on Sun Mountain, RE0000392714, among them), and none of 1960, nor this one.' },
  { id: 'Bonanza-TheAbductionEp2x08', show: 'Bonanza', title: 'The Abduction', decade: '1960s', year: 1960, check: '© MCMLX National Broadcasting Company, Inc., on its last card. Not renewed in 1988: NBC renewed the show\'s episodes of 1959 in 1987, and none of 1960.' },
  { id: 'BarkingDog1961', show: 'Ozzie and Harriet', title: 'The Barking Dog', decade: '1960s', year: 1961, still: 120, check: `A notice of Ozzie Nelson's in its closing credits. ${NO_OZZIE}` },
  { id: 'TheBigPicture516', show: 'The Big Picture', title: 'The Army Nurse Story', decade: '1960s', year: 1961, check: 'The Army\'s (The Big Picture): produced by the Army Pictorial Center and presented by the United States Army, a film of the US government\'s.' },
  { id: 'Beverly_Hillbillies_Ep01_The_Clampetts_Strike_Oil', show: 'The Beverly Hillbillies', title: 'The Clampetts Strike Oil', decade: '1960s', year: 1962, check: FILMWAYS_1962 },
  { id: 'Beverly_Hillbillies_Ep02_Getting_Settled', show: 'The Beverly Hillbillies', title: 'Getting Settled', decade: '1960s', year: 1962, check: FILMWAYS_1962 },
  { id: 'Beverly_Hillbillies_Ep06_Trick_Or_Treat', show: 'The Beverly Hillbillies', title: 'Trick or Treat', decade: '1960s', year: 1962, check: FILMWAYS_1962 },
  { id: 'Beverly_Hillbillies_Ep13_Home_For_Christmas', show: 'The Beverly Hillbillies', title: 'Home for Christmas', decade: '1960s', year: 1962, check: FILMWAYS_1962 },
  { id: 'Beverly_Hillbillies_Ep46_Turkey_Day', show: 'The Beverly Hillbillies', title: 'Turkey Day', decade: '1960s', year: 1963, check: FILMWAYS_1962 },
  { id: 'Beverly_Hillbillies_Ep52_The_Giant_JackRabbit', show: 'The Beverly Hillbillies', title: 'The Giant Jackrabbit', decade: '1960s', year: 1964, check: FILMWAYS_1963 },
  { id: 'Beverly_Hillbillies_Ep53_The_Girl_From_Home', show: 'The Beverly Hillbillies', title: 'The Girl from Home', decade: '1960s', year: 1964, check: FILMWAYS_1963 },
  { id: 'Beverly_Hillbillies_Ep55_The_Race_For_The_Queen', show: 'The Beverly Hillbillies', title: 'The Race for Queen', decade: '1960s', year: 1964, check: FILMWAYS_1963 },
  { id: 'dick_van_dyke_show_39_the_night_the_roof_fell_in', show: 'The Dick Van Dyke Show', title: 'The Night the Roof Fell In', decade: '1960s', year: 1962, check: '© 1962 Calvada Productions on its last card. Not renewed in 1990: Calvada\'s renewals of the show in 1989–91 are not of it.' },
  { id: 'TLS_Lucy_And_Viv_Put_In_A_Shower', show: 'The Lucy Show', title: 'Lucy and Viv Put In a Shower', decade: '1960s', check: DESILU_1962 },
  { id: 'TLS_Lucys_Barbershop_Quartet', show: 'The Lucy Show', title: "Lucy's Barbershop Quartet", decade: '1960s', year: 1963, check: DESILU_1962 },
  { id: 'Andy_Griffith_Opie_and_the_Spoiled_Kid', show: 'The Andy Griffith Show', title: 'Opie and the Spoiled Kid', decade: '1960s', year: 1963, check: MAYBERRY_CUT },
  { id: 'Andy-Griffith-Show_Andy-Discovers-America', show: 'The Andy Griffith Show', title: 'Andy Discovers America', decade: '1960s', year: 1963, check: MAYBERRY_1963 },
  { id: 'Andy_Griffith_The_Loaded_Goat', show: 'The Andy Griffith Show', title: 'The Loaded Goat', decade: '1960s', year: 1963, check: MAYBERRY_1963 },
  { id: 'Andy_Griffith_A_Wife_For_Andy', show: 'The Andy Griffith Show', title: 'A Wife for Andy', decade: '1960s', year: 1963, check: MAYBERRY_CUT },
  { id: 'PetticoatJunction', show: 'Petticoat Junction', title: 'Bobbie Jo and the Beatnik', decade: '1960s', year: 1964, check: '© MCMLXIII Wayfilms, under the chief electrician\'s credit. Not renewed in 1991: Wayfilms renewed only the show\'s theme that year (RE0000529223), and its episodes from 1992 on, those of 1964.' },
  { id: 'PetticoatJunction_678', show: 'Petticoat Junction', title: 'Last Chance Farm', decade: '1960s', year: 1964, check: '© MCMLXIII Wayfilms in its credits. Not renewed in 1991: Wayfilms\' renewals of the show\'s episodes start in 1992, with those of 1964.' },
  { id: 'TheCobraStrikes', show: 'The Big Picture', title: 'The Cobra Strikes', decade: '1960s', year: 1965, check: ARMY },
  { id: 'OurHeritage_', show: 'The Big Picture', title: 'Our Great American Heritage', decade: '1960s', still: 300, captions: false, check: ARMY },
  { id: 'TheBigPicture723', show: 'The Big Picture', title: 'When the Chips Are Down', decade: '1960s', year: 1968, still: 210, check: ARMY },
  { id: 'DDayAnniversary', show: 'The Big Picture', title: 'D-Day Anniversary', decade: '1960s', year: 1969, still: 1470, check: ARMY },
  { id: '1960-07-21_missile_milestone', show: 'Universal Newsreel', title: 'First Polaris Firing by Submerged U-Boat', decade: '1960s', kind: 'newsreel', year: 1960, check: UNIVERSAL },
  { id: '1960-10-31_Satchmo_Swings_In_Congo', show: 'Universal Newsreel', title: 'Satchmo Swings in Congo', decade: '1960s', kind: 'newsreel', year: 1960, still: 45, check: UNIVERSAL },
  { id: '1961-03-13_Peace_Corps', show: 'Universal Newsreel', title: 'Peace Corps', decade: '1960s', kind: 'newsreel', year: 1961, check: UNIVERSAL },
  { id: '1962-07-23_First_Lady_At_Play', show: 'Universal Newsreel', title: 'First Lady at Play', decade: '1960s', kind: 'newsreel', year: 1962, still: 30, check: UNIVERSAL },
  { id: '1962-09-13_Kennedy_Tour', show: 'Universal Newsreel', title: 'Kennedy Calls for U.S. Lead in Space', decade: '1960s', kind: 'newsreel', year: 1962, still: 30, check: UNIVERSAL },
  { id: '1963-03-18_Suspense_Story', show: 'Universal Newsreel', title: 'National Press Club Hears Hitchcock', decade: '1960s', kind: 'newsreel', year: 1963, check: UNIVERSAL },
  { id: '1963-11-14_Space_Movie', show: 'Universal Newsreel', title: 'Camera Records Missile in Flight', decade: '1960s', kind: 'newsreel', year: 1963, still: 40, check: UNIVERSAL },
  { id: '1964-03-02_New_York_Worlds_Fair', show: 'Universal Newsreel', title: "New York World's Fair", decade: '1960s', kind: 'newsreel', year: 1964, check: UNIVERSAL },
  { id: '1964-10-19_The_Olympics', show: 'Universal Newsreel', title: 'U.S. Widens Tokyo Lead', decade: '1960s', kind: 'newsreel', year: 1964, check: UNIVERSAL },
  { id: '1964-10-26_Olympics_End', show: 'Universal Newsreel', title: 'Olympics End', decade: '1960s', kind: 'newsreel', year: 1964, check: UNIVERSAL },
  { id: '1964-10-26_Fashions', show: 'Universal Newsreel', title: 'American Fashions in Rome', decade: '1960s', kind: 'newsreel', year: 1964, check: UNIVERSAL },

  { id: 'TheBigPicture-USArmyinSpaceandUndertheSea', show: 'The Big Picture', title: 'The Army in Space and Under the Sea', decade: '1970s', year: 1971, check: 'The Army\'s (The Big Picture): presented by its Office of the Chief of Information, a film of the US government\'s.' },
  { id: 'FortBliss', show: 'The Big Picture', title: 'Fort Bliss, Heart of Army Air Defense', decade: '1970s', year: 1972, still: 300, check: 'The Army\'s (The Big Picture): produced by the Army Pictorial Center with White Sands Missile Range and presented by its Office of the Chief of Information, a film of the US government\'s.' },
  { id: '306-v-20', show: 'Vision USA', title: 'No. 20', decade: '1970s', year: 1974, still: 295, check: 'The US Information Agency\'s (Vision USA): a film of the US government\'s.' },
];
